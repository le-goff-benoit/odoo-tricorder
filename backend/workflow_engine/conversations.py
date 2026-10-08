"""Durable conversations and work items. All transitions go through the engine."""
import copy
import time

from .contracts import require, validate, expand
from .engine import new_id, dependency_satisfied


class Conversations:
    def __init__(self, engine):
        self.engine = engine

    def get(self, cid, db=None):
        if db is None:
            with self.engine.store.connect() as connection:
                return self.get(cid, connection)
        value = self.engine.store.body(db.execute("SELECT body FROM conversations WHERE id=?", (cid,)).fetchone())
        require(value is not None, "Conversation introuvable")
        return value

    def list(self, project=None):
        with self.engine.store.connect() as db:
            values = [self.engine.store.body(row) for row in db.execute("SELECT body FROM conversations ORDER BY rowid DESC")]
        return [v for v in values if project is None or project in v["projects"]]

    def open(self, project, graph, provider, projects=None, library=None, model=None):
        require(provider in {"codex", "claude"}, "Fournisseur inconnu")
        validate(graph)
        ids = list(dict.fromkeys([project, *(projects or [])]))
        require(0 < len(ids) <= 50, "Entre un et cinquante projets")
        for pid in ids:
            self.engine.project(pid)
        definition = expand(graph, library or {})
        # The choice applies to new work items, never to past runs.
        if definition.get("defaults", {}).get("provider") != provider:
            definition.setdefault("defaults", {}).pop("model", None)
        definition.setdefault("defaults", {})["provider"] = provider
        if model:
            definition["defaults"]["model"] = model
        value = {"id": new_id("c"), "project": project, "projects": ids,
                 "definition": definition, "provider": provider, "model": definition.get("defaults", {}).get("model", ""), "effort": definition.get("defaults", {}).get("effort", "medium"), "created": time.time(),
                 "status": "open", "items": []}
        with self.engine.store.transaction() as db:
            db.execute("INSERT INTO conversations VALUES (?, ?)", (value["id"], self.engine.store.encode(value)))
        return value

    def add(self, cid, request, project=None, key=None, depends_on=None):
        require(isinstance(request, str) and 0 < len(request.strip()) <= 100_000, "Demande vide ou trop volumineuse")
        require(key is None or (isinstance(key, str) and 0 < len(key) <= 120), "Identifiant de demande invalide")
        require(depends_on is None or (isinstance(depends_on, list) and all(isinstance(i, str) for i in depends_on)), "Dépendances : liste d’identifiants attendue")
        dependencies = list(dict.fromkeys(depends_on or []))
        with self.engine.store.transaction() as db:
            conversation = self.get(cid, db)
            require(conversation["status"] == "open", "Conversation fermée")
            if key:
                existing = next((i for i in conversation["items"] if i.get("key") == key), None)
                if existing:
                    require(existing["request"] == request and existing["project"] == (project or conversation["project"]) and set(existing.get("depends_on", [])) == set(dependencies), "Cette demande a déjà été enregistrée avec un contenu différent")
                    return existing
            pid = project or conversation["project"]
            require(pid in conversation["projects"], "Projet hors du périmètre de la conversation")
            require(len(conversation["items"]) < 1000, "Limite de tâches de cette conversation atteinte")
            previous = {i["id"]: i for i in conversation["items"]}
            require(all(i in previous for i in dependencies), "Dépendance hors de la conversation ou encore inexistante")
            parent_runs = [previous[i]["run"] for i in dependencies]
            graph = copy.deepcopy(conversation["definition"])
            graph["driver"] = "conversation"
            target = self.engine.project(pid, db)
            context = {k: target[k] for k in ("series", "platform") if target.get(k)} if graph.get("domain") == "odoo" else {}
            run = self.engine.start(pid, graph, parameters={**context, "request": request, "conversation": cid, "depends_on_runs": parent_runs}, connection=db, deferred=bool(parent_runs))
            item = {"id": new_id("w"), "project": pid, "request": request, "run": run["id"], "key": key, "depends_on": dependencies, "created": time.time()}
            conversation["items"].append(item)
            db.execute("UPDATE conversations SET body=? WHERE id=?", (self.engine.store.encode(conversation), cid))
            return item

    def snapshot(self, cid):
        conversation = self.get(cid)
        for item in conversation["items"]:
            run = self.engine.run(item["run"])
            if run.get("coordination_wait") and not run.get("coordination_hold") and run["status"] == "paused":
                if all(dependency_satisfied(self.engine.run(rid)) for rid in run["parameters"]["depends_on_runs"]):
                    self.engine.control(run["id"], "resume")
        result = copy.deepcopy(conversation)
        result["items"] = [{**i, "execution": self.engine.run(i["run"])} for i in conversation["items"]]
        return result

    def checked_run(self, cid, rid):
        require(any(i["run"] == rid for i in self.get(cid)["items"]), "Tâche d’une autre conversation")
        return self.engine.run(rid)


def ask(engine, rid, nid, token, text):
    require(isinstance(text, str) and 0 < len(text.strip()) <= 12000, "Question vide ou trop longue")
    with engine.store.transaction() as db:
        run = engine.run(rid, db)
        state = run["nodes"][nid]
        node = next(n for n in run["definition"]["nodes"] if n["id"] == nid)
        require(node["kind"] in {"agent", "task", "document"}, "Une opération externe ou une décision ne devient pas une simple question")
        require(run["status"] in {"active", "paused"} and state["status"] == "running" and state.get("token") == token, "Question d’une tentative périmée")
        require(len(state.get("questions", [])) < 20, "Vingt questions dans ce bloc : préciser le périmètre avant de poursuivre")
        question = {"id": new_id("q"), "text": text, "created": time.time(), "status": "waiting"}
        state.setdefault("questions", []).append(question)
        state.update(status="waiting_input", question=question)
        db.execute("DELETE FROM resources WHERE run=? AND node=? AND token=?", (rid, nid, token))
        engine._event(db, run, "question", nid, question=question)
        engine._save(db, run)
        return run


def answer(engine, rid, nid, qid, text):
    require(isinstance(text, str) and 0 < len(text.strip()) <= 100_000, "Réponse vide ou trop longue")
    with engine.store.transaction() as db:
        run = engine.run(rid, db)
        state = run["nodes"][nid]
        require(run["status"] in {"active", "paused"}, "Exécution terminée")
        require(state["status"] == "waiting_input" and state["question"]["id"] == qid, "Question périmée ou réponse déjà enregistrée")
        state["question"].update(status="answered", answer=text, answered=time.time())
        for previous in state["questions"]:
            if previous["id"] == qid:
                previous.update(state["question"])
        state["inputs"]["clarifications"] = [{"question": q["text"], "answer": q.get("answer")} for q in state["questions"]]
        node = next(n for n in run["definition"]["nodes"] if n["id"] == nid)
        if node["kind"] == "question":
            state.update(status="accepted", outcome="done", result={"ok": True, "summary": "Information fournie", "outputs": {"answer": text}})
        else:
            state["status"] = "ready"
            state["resume_question"] = True
        state.pop("token", None)
        state.pop("pid", None)
        engine._event(db, run, "answer", nid, question=qid, answer=text)
        engine._advance(db, run)
        engine._save(db, run)
        return run

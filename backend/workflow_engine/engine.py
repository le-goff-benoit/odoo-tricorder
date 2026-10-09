"""The single writer for workflow state. Workers return results, never approvals."""

import copy
from contextlib import nullcontext
import json
from pathlib import Path
import time
import uuid

from .contracts import ContractError, digest, expand, identifier, require, semantic_digest, validate, validate_outputs, validate_result
from .store import Store
from .projects import initialize, repository

TERMINAL = {"accepted", "skipped"}


def completion_outcome(run):
    if any(state.get("decision", {}).get("outcome") == "reject" for state in run["nodes"].values()):
        return "rejected"
    if any(node.get("completion_outcome") == "blocked" and run["nodes"][node["id"]]["status"] == "accepted"
           for node in run["definition"]["nodes"]):
        return "blocked"
    return "succeeded"


def dependency_satisfied(run):
    return run["status"] == "completed" and completion_outcome(run) == "succeeded"


def new_id(prefix):
    return prefix + uuid.uuid4().hex[:16]


def run_driver(run):
    # Old runs remain frozen; only their reader needs this compatibility path.
    return run.get("driver", run["definition"].get("driver", "automatic"))


class Engine:
    def __init__(self, directory):
        self.store = Store(directory)

    def projects(self):
        with self.store.connect() as db:
            return [p for row in db.execute("SELECT body FROM projects ORDER BY id") if not (p := self.store.body(row)).get("library") and p.get("scope", "project") == "project"]

    def workspace_context(self):
        """Global executions have their own context, not a user Git project."""
        with self.store.transaction() as db:
            existing = self.store.body(db.execute("SELECT body FROM projects WHERE id='workspace'").fetchone())
            if existing:
                return existing
            folder = self.store.directory / "workspace"
            folder.mkdir(exist_ok=True, mode=0o700)
            context = {"id": "workspace", "title": "Workflows globaux", "path": str(folder), "scope": "workspace", "packs": [], "defaults": {"provider": "codex", "profile": "generalist", "model": "", "effort": "medium", "session": "delegated"}}
            from .guidance import prepare
            prepare(context)
            db.execute("INSERT INTO projects VALUES (?, ?)", ("workspace", self.store.encode(context)))
            return context

    def library_project(self):
        with self.store.transaction() as db:
            existing = self.store.body(db.execute("SELECT body FROM projects WHERE id='library'").fetchone())
            if existing:
                return existing
            folder = self.store.directory / "library"
            folder.mkdir(exist_ok=True, mode=0o700)
            initialize(folder)
            project = {"id": "library", "title": "Bibliothèque de modèles", "path": str(folder), "library": True, "packs": [], "defaults": {"provider": "codex", "profile": "generalist", "model": "", "effort": "medium", "session": "delegated"}}
            db.execute("INSERT INTO projects VALUES (?, ?)", ("library", self.store.encode(project)))
            from .guidance import prepare
            prepare(project)
            return project

    def create_project(self, title, path=None):
        require(isinstance(title, str) and title.strip(), "Nom du projet requis")
        project = {"id": new_id("p"), "title": title.strip(), "packs": [], "defaults": {"provider": "codex", "profile": "generalist", "model": "", "effort": "medium", "session": "delegated"}}
        if path:
            target = Path(path).expanduser().resolve()
            project["path"] = repository(target)
        else:
            target = self.store.directory / "projects" / project["id"]
            target.mkdir(parents=True, mode=0o700)
            initialize(target)
            project.update(path=str(target), managed=True)
        with self.store.transaction() as db:
            for row in db.execute("SELECT body FROM projects"):
                require(self.store.body(row).get("path") != project["path"], "Ce dépôt Git est déjà enregistré comme projet")
            db.execute("INSERT INTO projects VALUES (?, ?)", (project["id"], self.store.encode(project)))
            from .guidance import prepare
            prepare(project)
        return project

    def project(self, project_id, db=None):
        if db is None:
            with self.store.connect() as connection:
                return self.project(project_id, connection)
        project = self.store.body(db.execute("SELECT body FROM projects WHERE id=?", (project_id,)).fetchone())
        require(project is not None, "Projet introuvable")
        return project

    def workflow_path(self, project_id, workflow_id, db=None):
        identifier(workflow_id, "Workflow")
        root = Path(self.project(project_id, db)["path"])
        target = root / ".tricorder" / "workflows" / (workflow_id + ".json")
        require(target.resolve().is_relative_to(root), "Chemin de workflow hors du projet")
        require(not target.is_symlink(), "Un workflow ne peut pas être un lien symbolique")
        return target

    def reload(self, project_id, workflow_id, expected_revision):
        target = self.workflow_path(project_id, workflow_id)
        require(target.is_file() and target.stat().st_size <= 2_000_000, "Fichier de workflow absent ou trop volumineux")
        graph = json.loads(target.read_text())
        require(graph.get("id") == workflow_id, "L'identifiant du fichier ne correspond pas au workflow ouvert")
        return self.save(project_id, graph, expected_revision, from_disk=True)

    def save(self, project_id, graph, expected_revision=0, *, from_disk=False, expected_disk=None):
        graph = copy.deepcopy(graph)
        graph.pop("_project", None)
        graph.pop("driver", None)
        validate(graph)
        with self.store.transaction() as db:
            self.project(project_id, db)
            row = db.execute("SELECT MAX(revision) AS revision FROM workflows WHERE project=? AND id=?", (project_id, graph["id"])).fetchone()
            current = row["revision"] or 0
            require(current == expected_revision, "Conflit : une autre révision a été enregistrée. Rechargez avant d'appliquer vos changements.")
            target = self.workflow_path(project_id, graph["id"], db)
            if expected_disk is not None:
                require(target.is_file() and digest(target.read_text()) == expected_disk, "Le fichier a encore changé : comparer de nouveau")
            if target.exists() and not from_disk:
                previous = self.store.body(db.execute("SELECT body FROM workflows WHERE project=? AND id=? AND revision=?", (project_id, graph["id"], current)).fetchone())
                require(previous is not None and json.loads(target.read_text()) == previous, "Le fichier a été modifié depuis le terminal. Recharger et valider avant d'enregistrer.")
            graph["revision"] = current + 1
            db.execute("INSERT INTO workflows VALUES (?, ?, ?, ?)", (project_id, graph["id"], current + 1, self.store.encode(graph)))
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_suffix("." + uuid.uuid4().hex + ".tmp")
            temporary.write_text(json.dumps(graph, ensure_ascii=False, indent=2) + "\n")
            temporary.replace(target)
        return graph

    def workflows(self, project_id):
        with self.store.connect() as db:
            return [self.store.body(row) for row in db.execute("""SELECT body FROM workflows w WHERE project=? AND revision=(
                SELECT MAX(revision) FROM workflows WHERE project=w.project AND id=w.id) ORDER BY id""", (project_id,))]

    def repository_workflows(self, project_id):
        """Inspect repository definitions without executing or rewriting them."""
        root = Path(self.project(project_id)["path"]).resolve()
        folder = root / ".tricorder" / "workflows"
        require(folder.resolve().is_relative_to(root), "Dossier de workflows hors du projet")
        known = {g["id"]: g for g in self.workflows(project_id)}
        result = []
        for path in sorted(folder.glob("*.json"))[:1000]:
            item = {"id": path.stem, "file": str(path.relative_to(root))}
            try:
                target = self.workflow_path(project_id, path.stem)
                require(target.is_file() and target.stat().st_size <= 2_000_000, "Fichier absent ou trop volumineux")
                graph = json.loads(target.read_text())
                validate(graph)
                require(graph["id"] == path.stem, "Identifiant différent du nom du fichier")
                item.update(title=graph["title"], digest=digest(graph),
                            status="current" if graph == known.get(path.stem) else "changed" if path.stem in known else "new")
            except (ValueError, OSError, TypeError, KeyError) as error:
                item.update(status="invalid", error=str(error))
            result.append(item)
        return result

    def import_repository_workflow(self, project_id, workflow_id, expected_digest):
        """Adopt a versioned definition from Git; no run or approval is imported."""
        target = self.workflow_path(project_id, workflow_id)
        require(target.is_file() and target.stat().st_size <= 2_000_000, "Fichier absent ou trop volumineux")
        graph = json.loads(target.read_text())
        validate(graph)
        require(graph["id"] == workflow_id and digest(graph) == expected_digest,
                "Le fichier a changé : actualiser la liste avant import")
        if "revision" not in graph:
            return self.save(project_id, graph, from_disk=True)
        revision = graph["revision"]
        require(type(revision) is int and 0 < revision < 2 ** 31, "Révision du fichier invalide")
        with self.store.transaction() as db:
            require(not db.execute("SELECT 1 FROM workflows WHERE project=? AND id=?", (project_id, workflow_id)).fetchone(),
                    "Workflow déjà enregistré : ouvrir puis recharger et valider les changements")
            db.execute("INSERT INTO workflows VALUES (?, ?, ?, ?)", (project_id, workflow_id, revision, self.store.encode(graph)))
        return graph

    def start(self, project_id, graph, *, simulation=False, parameters=None, library=None, connection=None, occurrence=None, notifications_authorized=False, reuse_from=None, deferred=False, driver="automatic"):
        from .integrations import catalog, issues as plugin_issues
        require(driver in {"automatic", "conversation"}, "Mode de pilotage inconnu")
        require("driver" not in graph, "Ce modèle contient le contexte d’une ancienne conversation. Enregistrez le workflow à nouveau avant de le lancer.")
        require(not occurrence or driver == "automatic", "Une planification nécessite une exécution automatique")
        original = copy.deepcopy(graph)
        resolved = expand(graph, library or {})
        project = self.project(project_id, connection)
        resolved["parameters"] = {**resolved.get("parameters", {}), **(parameters or {})}
        from .packs import resolve_profiles, policy_readiness
        if not simulation:
            mode = "native" if driver == "conversation" else "automatic"
            issues = policy_readiness(project, resolved, mode)["issues"] + plugin_issues(resolved, project, self)
            require(not issues, " · ".join(i["message"] for i in issues))
            resolved = resolve_profiles(project, resolved)
        for node in resolved["nodes"]:
            if node["kind"] == "agent":
                node["execution"] = {**project["defaults"], **resolved.get("defaults", {}), **{k: node[k] for k in project["defaults"] if k in node}}
        run = {"id": new_id("r"), "project": project_id, "driver": driver, "status": "paused" if deferred else "active", "created": time.time(),
               "scope": {"kind": project.get("scope", "library" if project.get("library") else "project"), "id": project_id},
               "release": resolved.get("release", ""),
               "plugins": catalog(project),
               "packs": [{"id": p["id"], "version": p["version"], "sha256": p["sha256"]} for p in project.get("packs", [])],
               "simulation": bool(simulation), "definition": resolved, "original": original,
               "contract": semantic_digest(resolved), "parameters": {**resolved.get("parameters", {}), **(parameters or {})},
               "nodes": {n["id"]: {"status": "pending", "attempt": 0} for n in resolved["nodes"]}}
        run["transports"] = {}
        if deferred:
            run["coordination_wait"] = True
        if not simulation:
            from connectors.local_tools import approved
            from .notifications import execution_nodes
            for node in execution_nodes(resolved):
                for binding in node.get("capabilities", []):
                    record = approved(self, project, binding["plugin"])
                    if record["operations"][binding["operation"]] == "notify":
                        require(notifications_authorized, "Autoriser explicitement les notifications de cette révision avant activation")
                    run["transports"][binding["plugin"]] = record
        run["notifications_authorized"] = bool(notifications_authorized)
        if occurrence:
            run["occurrence"] = occurrence
        with (nullcontext(connection) if connection else self.store.transaction()) as db:
            db.execute("INSERT INTO runs VALUES (?, ?)", (run["id"], self.store.encode(run)))
            self._event(db, run, "started", simulation=run["simulation"])
            self._advance(db, run)
            if reuse_from:
                from .reuse import apply
                apply(self, db, run, self.run(reuse_from, db))
            self._save(db, run)
        return run

    def run(self, run_id, db=None):
        if db is None:
            with self.store.connect() as connection:
                return self.run(run_id, connection)
        value = self.store.body(db.execute("SELECT body FROM runs WHERE id=?", (run_id,)).fetchone())
        require(value is not None, "Exécution introuvable")
        return value

    def runs(self, project_id):
        with self.store.connect() as db:
            return [self.store.body(row) for row in db.execute("SELECT body FROM runs WHERE json_extract(body, '$.project')=? ORDER BY rowid DESC LIMIT 500", (project_id,))]

    def activity(self, offset=0):
        from .projections import run_page, activity_counts
        page = run_page(self, offset=offset, limit=25)
        with self.store.connect() as db:
            titles = {p["id"]: p["title"] for row in db.execute("SELECT body FROM projects") if (p := self.store.body(row))}
            total = db.execute("SELECT COUNT(DISTINCT project || ':' || id) FROM workflows").fetchone()[0]
        return {**page, "runs": [{**run, "project_title": titles.get(run["project"], run["project"])} for run in page["items"]], "counts": activity_counts(self), "workflow_count": total}

    def events(self, run_id, after=0, limit=1000):
        with self.store.connect() as db:
            return [{"seq": row["seq"], **self.store.body(row)} for row in db.execute("SELECT seq, body FROM events WHERE run=? AND seq>? ORDER BY seq LIMIT ?", (run_id, after, limit))]

    def _event(self, db, run, kind, node=None, **details):
        event = {"at": time.time(), "type": kind, "node": node, **details}
        db.execute("INSERT INTO events(run, body) VALUES (?, ?)", (run["id"], self.store.encode(event)))

    def _save(self, db, run):
        run["updated"] = time.time()
        db.execute("UPDATE runs SET body=? WHERE id=?", (self.store.encode(run), run["id"]))

    def _advance(self, db, run):
        if run["status"] != "active":
            return
        incoming_by_node = {n["id"]: [] for n in run["definition"]["nodes"]}
        for edge in run["definition"]["edges"]:
            incoming_by_node[edge["to"]].append(edge)
        changed = True
        while changed:
            changed = False
            for node in run["definition"]["nodes"]:
                state = run["nodes"][node["id"]]
                if state["status"] != "pending":
                    continue
                incoming = incoming_by_node[node["id"]]
                if any(run["nodes"][e["from"]]["status"] not in TERMINAL for e in incoming):
                    continue
                active = [e for e in incoming if run["nodes"][e["from"]].get("outcome") == e.get("outcome", "done") and run["nodes"][e["from"]]["status"] == "accepted"]
                if incoming and not active:
                    state.update(status="skipped")
                else:
                    state["inputs"] = {}
                    state["input_sources"] = {}
                    for edge in active:
                        outputs = run["nodes"][edge["from"]].get("result", {}).get("outputs", {})
                        for src, dst in edge.get("mapping", {}).items():
                            require(src in outputs, f"{node['id']} : résultat source {src} absent")
                            require(dst not in state["inputs"] or state["inputs"][dst] == outputs[src], f"{node['id']} : plusieurs valeurs incompatibles pour {dst}")
                            state["inputs"][dst] = outputs[src]
                            state["input_sources"][dst] = {"node": edge["from"], "port": src, "edge": edge["id"]}
                    state.update(status="ready")
                    if node["kind"] == "join":
                        outputs = {k: state["inputs"][k] for k in node.get("outputs", {}) if k in state["inputs"]}
                        outcome = "done"
                        if node.get("component_exit"):
                            choices = {run["nodes"][e["from"]].get("outcome") for e in active}
                            if "reject" in choices:
                                outcome = "reject"
                            elif len(choices) == 1 and next(iter(choices)) in node.get("options", []):
                                outcome = next(iter(choices))
                        if outcome != "reject":
                            validate_outputs(node, {"outputs": outputs})
                        state.update(status="accepted", outcome=outcome, result={"outputs": outputs})
                    elif node["kind"] == "condition":
                        outcome = state["inputs"].get(node["parameter"], node.get("parameters", run["parameters"]).get(node["parameter"]))
                        if outcome in node.get("options", []):
                            state.update(status="accepted", outcome=outcome, result={"outputs": {k: state["inputs"].get(k) for k in node.get("outputs", {})}})
                        else:
                            state.update(status="blocked", reason=f"Paramètre {node['parameter']} absent ou issue inconnue")
                    elif node["kind"] == "question":
                        question = {"id": new_id("q"), "text": node["question"], "created": time.time(), "status": "waiting"}
                        state.update(status="waiting_input", question=question, questions=[question])
                        from .notifications import queue_question
                        queue_question(self, db, run, node["id"], question)
                    elif node["kind"] in {"decision", "review"}:
                        from .operations import resolve
                        state["operation"] = resolve(node, state["inputs"])
                        state.update(status="waiting", attempt=state["attempt"] + 1, proposal=digest({"run": run["id"], "node": node, "inputs": state["inputs"], "operation": state["operation"], "attempt": state["attempt"] + 1, "contract": run["contract"]}), nonce=new_id("d"))
                changed = True
                self._event(db, run, state["status"], node["id"])
        if all(s["status"] in TERMINAL for s in run["nodes"].values()):
            run["status"] = "completed"
            run["completion_outcome"] = completion_outcome(run)
            if not run["simulation"]:
                for node in run["definition"]["nodes"]:
                    if node["kind"] == "watch":
                        message = run["nodes"][node["id"]].get("result", {}).get("outputs", {}).get("message", {})
                        if message.get("id"):
                            key = digest({"project": run["project"], "workflow": run.get("occurrence", {}).get("schedule", run["original"]["id"]),
                                          "node": node["id"], "account": node.get("account"), "message": message["id"]})
                            db.execute("INSERT OR IGNORE INTO consumed_messages VALUES (?, ?)", (key, time.time()))
            self._event(db, run, "completed")

    def claim(self, run_id, node_id, *, executor="managed", owner_pid=None):
        with self.store.transaction() as db:
            run = self.run(run_id, db)
            require(run["status"] == "active", "Exécution suspendue ou terminée")
            running = sum(s["status"] == "running" for row in db.execute("SELECT body FROM runs") for s in self.store.body(row)["nodes"].values())
            require(running < 4, "Quatre étapes sont déjà en cours : attente d'une place d'exécution")
            node = next((n for n in run["definition"]["nodes"] if n["id"] == node_id), None)
            require(node is not None, "Bloc inconnu")
            state = run["nodes"][node_id]
            require(state["status"] == "ready", "Ce bloc n'est pas prêt")
            from .packs import policy_issues
            context = state.get("inputs", {}).get("execution_context", {})
            issues = [] if run["simulation"] else policy_issues(self.project(run["project"], db), {**run["definition"], "parameters": {**run["parameters"], **context}, "nodes": [node]})
            require(not issues, " · ".join(i["message"] for i in issues))
            if node["kind"] == "external":
                from .operations import resolve
                operation = resolve(node, state.get("inputs", {}))
                state["operation"] = operation
                approval = run["nodes"][node["approval"]].get("decision", {})
                require(approval.get("outcome") == "approve" and approval.get("operation") == digest(operation), "Autorisation invalide pour cette opération")
                require(not approval.get("consumed"), "Autorisation déjà consommée")
                approval["consumed"] = node_id
            token = new_id("t")
            for resource in sorted(set(node.get("resources", []))):
                key = run["project"] + ":" + resource
                require(not db.execute("SELECT 1 FROM resources WHERE resource=?", (key,)).fetchone(), f"Ressource occupée : {resource}")
                db.execute("INSERT INTO resources VALUES (?, ?, ?, ?)", (key, run_id, node_id, token))
            if node["kind"] == "command" and node.get("reuse"):
                from .reuse import source_fingerprint
                state["source_fingerprint"] = source_fingerprint(self.project(run["project"], db))
            resumed = state.pop("resume_question", False)
            state["ownership"] = executor
            state["processes"] = []
            if owner_pid:
                from .recovery import identity
                owner = identity(owner_pid)
                if owner:
                    state["processes"].append(owner)
            state.update(status="running", attempt=state["attempt"] + (0 if resumed else 1), token=token, started=time.time(), heartbeat=time.time())
            self._event(db, run, "running", node_id, attempt=state["attempt"])
            self._save(db, run)
        return {"run": run, "node": node, "token": token}

    def heartbeat(self, run_id, node_id, token, pid=None):
        with self.store.transaction() as db:
            run = self.run(run_id, db)
            state = run["nodes"][node_id]
            require(state.get("token") == token and state["status"] == "running", "Tentative périmée")
            state["heartbeat"] = time.time()
            if pid:
                state["pid"] = pid
                from .recovery import identity
                process = identity(pid)
                if process and process not in state.setdefault("processes", []):
                    state["processes"].append(process)
            self._save(db, run)

    def execution_context(self, run_id, node_id, context):
        require(isinstance(context, dict) and set(context) <= {"environment", "neutralized_copy"}, "Seule la copie de travail peut être précisée ; ce contexte n’accorde aucun droit")
        require(context.get("environment") == "local" and isinstance(context.get("neutralized_copy"), str) and context["neutralized_copy"].strip(), "Identifier la copie locale neutralisée")
        with self.store.transaction() as db:
            run = self.run(run_id, db)
            state = run["nodes"][node_id]
            require(run["status"] == "active" and state["status"] == "ready", "Le contexte se précise avant de prendre le bloc")
            state.setdefault("inputs", {})["execution_context"] = context
            self._event(db, run, "execution-context", node_id, context=context)
            self._save(db, run)
            return run

    def submit(self, run_id, node_id, token, result):
        """Only the saved validation policy can authorize automatic acceptance."""
        require(isinstance(result, dict) and isinstance(result.get("summary"), str), "Résultat structuré requis")
        if result.get("question"):
            from .conversations import ask
            return ask(self, run_id, node_id, token, result["question"])
        with self.store.transaction() as db:
            run = self.run(run_id, db)
            state = run["nodes"][node_id]
            require(state.get("token") == token and state["status"] == "running", "Résultat d'une tentative périmée ou déjà remis")
            if state.get("source_fingerprint"):
                from .reuse import source_fingerprint
                state["source_unchanged"] = state["source_fingerprint"] == source_fingerprint(self.project(run["project"], db))
            state.update(status="returned", result=copy.deepcopy(result), finished=time.time())
            db.execute("DELETE FROM resources WHERE run=? AND node=? AND token=?", (run_id, node_id, token))
            self._event(db, run, "returned", node_id, attempt=state["attempt"])
            self._automatic(db, run, node_id)
            self._advance(db, run)
            self._save(db, run)
        return run

    def _automatic(self, db, run, node_id):
        node = next(n for n in run["definition"]["nodes"] if n["id"] == node_id)
        state = run["nodes"][node_id]
        if run["status"] != "active" or state["status"] != "returned" or node.get("validation") not in {"automatic", "contract"}:
            return
        try:
            require(state["result"].get("ok") is True, "L'exécutant a signalé un échec")
            validate_result(run["definition"], node, state["result"])
            if node.get("validation") == "automatic" or node.get("evidence_required"):
                require(state["result"].get("evidence"), "Preuve requise pour la validation automatique")
            for evidence in state["result"].get("evidence", []):
                self.evidence(evidence)
        except ContractError as exc:
            state["validation_error"] = str(exc)
            self._event(db, run, "validation-failed", node_id, reason=str(exc))
            return
        outcome = state["result"].get("outputs", {}).get(node["route_output"]) if node.get("route_output") else "done"
        state.update(status="accepted", outcome=outcome, receipt={"at": time.time(), "actor": "contract-policy" if node.get("validation") == "contract" else "validation-policy", "contract": run["contract"],
                     "checks": ["executor-success", "output-types", "evidence-integrity"], "note": "Contrôles techniques automatiques ; aucun critère métier attesté."})
        self._event(db, run, "accepted", node_id, actor="validation-policy")

    def reconcile_effect(self, run_id, node_id, effect_id, receipt, proof):
        self.evidence(proof)
        with self.store.transaction() as db:
            run = self.run(run_id, db)
            state = run['nodes'][node_id]
            require(run['status'] in {'active', 'paused'} and state['status'] == 'returned' and state.get('result', {}).get('effect_id') == effect_id, 'Réconciliation périmée')
            ledger = self.store.body(db.execute('SELECT body FROM effects WHERE id=?', (effect_id,)).fetchone())
            require(ledger, 'Effet inconnu')
            ledger.update(status='sent', receipt=receipt, reconciled=time.time(), evidence=proof)
            db.execute('UPDATE effects SET body=? WHERE id=?', (self.store.encode(ledger), effect_id))
            state['result'] = {'ok': True, 'summary': 'Accusé distant retrouvé sans répéter l’opération.', 'outputs': receipt['outputs'], 'receipt': receipt, 'evidence': state['result'].get('evidence', []) + [proof], 'reconciled_effect': effect_id}
            self._event(db, run, 'effect-reconciled', node_id, effect=effect_id)
            self._automatic(db, run, node_id)
            self._advance(db, run)
            self._save(db, run)
        return run

    def accept(self, run_id, node_id, *, human=False, checks=None, note=""):
        require(human, "Validation humaine requise par l'API dédiée")
        with self.store.transaction() as db:
            run = self.run(run_id, db)
            require(run["status"] in {"active", "paused"}, "Cette exécution ne peut plus recevoir de résultat")
            state = run["nodes"][node_id]
            require(state["status"] == "returned", "Aucun résultat à valider")
            node = next(n for n in run["definition"]["nodes"] if n["id"] == node_id)
            require(state["result"].get("ok") is True, "Le résultat indique un échec : correction requise")
            validate_result(run["definition"], node, state["result"])
            expected = node.get("criteria", [])
            require(checks == expected, "Tous les critères doivent être explicitement examinés")
            require(not expected or bool(note.strip()), "Une conclusion de validation est requise")
            for evidence in state["result"].get("evidence", []):
                self.evidence(evidence)
            require(not node.get("evidence_required") or state["result"].get("evidence"), "Preuve requise absente")
            outcome = state["result"].get("outputs", {}).get(node["route_output"]) if node.get("route_output") else "done"
            state.update(status="accepted", outcome=outcome, receipt={"at": time.time(), "checks": checks, "note": note, "contract": run["contract"], "actor": "local-user"})
            self._event(db, run, "accepted", node_id)
            self._advance(db, run)
            self._save(db, run)
        return run

    def decide(self, run_id, node_id, nonce, proposal, outcome, *, human=False, note=""):
        require(human, "Seule l'interface de décision humaine peut répondre")
        with self.store.transaction() as db:
            run = self.run(run_id, db)
            require(run["status"] in {"active", "paused"}, "Exécution terminée ou annulée")
            state = run["nodes"][node_id]
            require(state["status"] == "waiting" and state["nonce"] == nonce and state["proposal"] == proposal, "Décision périmée ou déjà appliquée")
            node = next(n for n in run["definition"]["nodes"] if n["id"] == node_id)
            require(outcome in node.get("options", ["approve", "reject"]), "Choix inconnu")
            state.update(status="accepted", outcome=outcome, decision={"at": time.time(), "actor": "local-user", "outcome": outcome, "proposal": proposal, "operation": digest(state.get("operation", node.get("operation"))), "note": note})
            if node.get("outputs"):
                state["result"] = {"outputs": {key: state.get("inputs", {}).get(key) for key in node["outputs"]}}
                validate_result(run["definition"], node, state["result"], outcome)
            self._event(db, run, "decision", node_id, outcome=outcome)
            self._advance(db, run)
            self._save(db, run)
        return run

    def control(self, run_id, action):
        require(action in {"pause", "resume", "cancel"}, "Commande inconnue")
        with self.store.transaction() as db:
            run = self.run(run_id, db)
            require(run["status"] in {"active", "paused"}, "Exécution déjà terminée")
            if action == "resume" and run.get("coordination_wait"):
                predecessors = [self.run(rid, db) for rid in run["parameters"].get("depends_on_runs", [])]
                require(all(dependency_satisfied(r) for r in predecessors), "Les tâches précédentes ne sont pas terminées ou ont été refusées")
                run["parameters"]["dependency_results"] = {r["id"]: {nid: s.get("result") for nid, s in r["nodes"].items() if s["status"] == "accepted"} for r in predecessors}
                run.pop("coordination_wait", None)
            if action == "pause" and run.get("coordination_wait"):
                run["coordination_hold"] = True
            if action == "resume":
                run.pop("coordination_hold", None)
            run["status"] = {"pause": "paused", "resume": "active", "cancel": "cancelled"}[action]
            self._event(db, run, action)
            if action == "resume":
                for nid in run["nodes"]:
                    self._automatic(db, run, nid)
            self._advance(db, run)
            self._save(db, run)
        return run

    def retry(self, run_id, node_id, note, *, human=False):
        require(human and isinstance(note, str) and note.strip(), "Motif humain de reprise requis")
        with self.store.transaction() as db:
            run = self.run(run_id, db)
            require(run["status"] in {"active", "paused"}, "Exécution terminée")
            state = run["nodes"][node_id]
            node = next(n for n in run["definition"]["nodes"] if n["id"] == node_id)
            require(state["status"] == "returned", "Seul un résultat remis peut être repris ; réconcilier d'abord une opération incertaine")
            require(node["kind"] != "external" and not state.get("effect_uncertain"), "Opération externe : nouvelle proposition et nouvel accord requis")
            require(state["attempt"] < node.get("max_attempts", 1), "Limite de reprises atteinte")
            history = state.get("history", []) + [{k: v for k, v in state.items() if k != "history"}]
            run["nodes"][node_id] = {"status": "ready", "attempt": state["attempt"], "history": history, "reason": note, "inputs": state.get("inputs", {})}
            self._event(db, run, "retry", node_id, note=note)
            self._save(db, run)
        return run

    def handoff(self, run_id, target_project, graph, *, human=False):
        require(human, "Transfert réservé à l'interface humaine")
        source = self.run(run_id)
        require(source["scope"]["kind"] == "workspace", "Choisir une exécution globale à transférer")
        project = self.project(target_project)
        require(project.get("scope", "project") == "project" and not project.get("library"), "Destination : un projet Git enregistré")
        repository(project["path"])
        graph = copy.deepcopy(graph)
        graph["id"] = new_id("handoff-")
        graph.pop("revision", None)
        graph["parameters"] = {**graph.get("parameters", {}), "source_context": {
            "run": run_id, "workflow": source["original"]["id"], "simulation": source["simulation"],
            "results": {nid: state["result"] for nid, state in source["nodes"].items() if state["status"] == "accepted" and state.get("result")}}}
        # A new draft only: decisions, schedules and runtime authorization never move.
        saved = self.save(target_project, graph)
        with self.store.transaction() as db:
            self._event(db, source, "handoff", target_project=target_project, workflow=saved["id"])
        return saved

    def project_series(self, project_id, series, *, platform=None):
        require(isinstance(series, str) and 0 < len(series) <= 30, "Série invalide")
        with self.store.transaction() as db:
            project = self.project(project_id, db)
            project["series"] = series
            if platform is not None:
                require(platform in {"online", "custom"}, "Plateforme inconnue")
                project["platform"] = platform
            db.execute("UPDATE projects SET body=? WHERE id=?", (self.store.encode(project), project_id))
        return project

    def artifact(self, content):
        require(isinstance(content, bytes) and len(content) <= 2_000_000, "Preuve trop volumineuse")
        import hashlib
        sha = hashlib.sha256(content).hexdigest()
        folder = self.store.directory / "artifacts"
        folder.mkdir(exist_ok=True, mode=0o700)
        path = folder / sha
        if not path.exists():
            path.write_bytes(content)
            path.chmod(0o600)
        return {"sha256": sha, "size": len(content)}

    def evidence(self, reference):
        import hashlib
        import re
        sha = reference.get("sha256", "")
        require(re.fullmatch(r"[a-f0-9]{64}", sha), "Empreinte de preuve invalide")
        path = self.store.directory / "artifacts" / sha
        require(path.is_file() and not path.is_symlink(), "Preuve absente")
        content = path.read_bytes()
        require(hashlib.sha256(content).hexdigest() == sha, "Preuve altérée")
        return content

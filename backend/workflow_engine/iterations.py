"""Explicit, durable per-item work. Reads never enroll or spawn an item."""
import copy
import time

from .contracts import require, digest
from .engine import dependency_satisfied


def at_path(values, path):
    for part in path.split("."):
        require(isinstance(values, dict) and part in values, f"Collection introuvable : {path}")
        values = values[part]
    return values


def elements(values):
    require(isinstance(values, list) and len(values) <= 100, "Le traitement accepte une liste d'au plus 100 éléments")
    items, seen = [], set()
    for index, value in enumerate(values):
        key = value.get("id", f"item-{index + 1}") if isinstance(value, dict) else f"item-{index + 1}"
        require(isinstance(key, str) and 0 < len(key) <= 120 and key not in seen,
                "Chaque élément doit avoir un identifiant distinct et non vide")
        seen.add(key)
        dependencies = value.get("depends_on", []) if isinstance(value, dict) else []
        require(isinstance(dependencies, list) and all(isinstance(d, str) for d in dependencies),
                f"{key} : depends_on doit contenir des identifiants d'éléments")
        base = value.get("base_from") if isinstance(value, dict) else None
        require(base is None or isinstance(base, str) and base in dependencies,
                f"{key} : la base de code doit être une dépendance explicite")
        items.append({"element": key, "value": copy.deepcopy(value), "depends_on": list(dict.fromkeys(dependencies)),
                      "base_from": base, "title": str(value.get("title", value.get("text", key)))[:300] if isinstance(value, dict) else str(value)[:300]})
    remaining = {i["element"]: set(i["depends_on"]) for i in items}
    require(all(d in seen for deps in remaining.values() for d in deps), "Un élément dépend d'un identifiant absent de la liste")
    while remaining:
        roots = {key for key, deps in remaining.items() if not deps}
        require(roots, "Les dépendances entre éléments contiennent un cycle")
        remaining = {key: deps - roots for key, deps in remaining.items() if key not in roots}
    return items


def activate(engine, rid, nid):
    from .runtime import preflight
    with engine.store.transaction() as db:
        run = engine.run(rid, db)
        node = next((n for n in run["definition"]["nodes"] if n["id"] == nid), None)
        require(node and node["kind"] == "foreach", "Bloc de traitement par élément introuvable")
        state = run["nodes"][nid]
        if state.get("enrollment"):
            return run  # One family for this frozen block; technical retries are on children.
        require(run["status"] == "active" and state["status"] == "ready", "Ce traitement n'est pas prêt ou est suspendu")
        items = elements(at_path(state.get("inputs", {}), node.get("collection", "items")))
        workflow = node["workflow"]
        require(isinstance(workflow, dict), "Le sous-workflow doit être figé avant le lancement")
        require(not workflow.get("launch_fields"),
                f"{node['title']} : un traitement par élément ne peut pas afficher de formulaire de lancement ; "
                "utilisez le formulaire du workflow principal ou une Question ouverte dans le travail par élément")
        allowed = {run["project"]}
        conversation = None
        cid = run["parameters"].get("conversation")
        if cid:
            from .conversations import Conversations
            context = Conversations(engine)
            context.checked_run(cid, rid)
            conversation = context.get(cid, db)
            # An associated action inherits the terminal, not a new grant on
            # every project of that conversation. Its activation is local.
            if any(item["run"] == rid for item in conversation["items"]):
                allowed.update(conversation["projects"])
        # Validate the entire frozen selection before creating any child.
        for item in items:
            value = item["value"]
            project_id = value.get("project", run["project"]) if isinstance(value, dict) else run["project"]
            require(project_id in allowed, f"{item['title']} : projet hors du périmètre autorisé")
            item["project"] = project_id
            target = engine.project(project_id, db)
            graph = {**copy.deepcopy(workflow), "defaults": {**run["definition"].get("defaults", {}), **workflow.get("defaults", {})}}
            issues = preflight(graph, simulation=run["simulation"], defaults=target["defaults"], project=target, engine=engine)
            require(not issues, f"{item['title']} : " + " · ".join(i["message"] for i in issues))
            if not run["simulation"]:
                from .notifications import execution_nodes
                from connectors.local_tools import approved
                expected = (run.get("transports", {}) if project_id == run["project"] else
                            (conversation or {}).get("transports", {}).get(project_id, {}))
                for child_node in execution_nodes(graph):
                    for binding in child_node.get("capabilities", []):
                        require(binding["plugin"] in expected and
                                approved(engine, target, binding["plugin"]) == expected[binding["plugin"]],
                                f"{item['title']} : connexion modifiée depuis le lancement. Relancez le workflow pour examiner les nouveaux accès.")
            item["graph"] = graph
        state.update(status="waiting_children", attempt=state["attempt"] + 1, children=[],
                     enrollment={"at": time.time(), "contract": digest({"inputs": state["inputs"], "workflow": workflow,
                                  "concurrency": node.get("concurrency", 1)}), "concurrency": node.get("concurrency", 1)})
        for item in items:
            graph = item.pop("graph")
            incoming = {e["to"] for e in graph["edges"]}
            seed = {n["id"]: {key: copy.deepcopy(item["value"] if key == "item" else state["inputs"][key])
                              for key in n.get("inputs", {}) if key == "item" or key in state["inputs"]}
                    for n in graph["nodes"] if n["id"] not in incoming}
            parameters = {**run["parameters"], "item": item["value"], "element_id": item["element"], "request": item["title"]}
            parameters.pop("depends_on_runs", None)
            parent = {"run": rid, "node": nid, "element": item["element"], "attempt": state["attempt"]}
            child = engine.start(item["project"], graph, simulation=run["simulation"], parameters=parameters,
                                 connection=db, deferred=True, driver="automatic", parent=parent, initial_inputs=seed,
                                 notifications_authorized=run.get("notifications_authorized", False))
            child.pop("coordination_wait", None)
            child["iteration_wait"] = True
            engine._save(db, child)
            state["children"].append({k: item[k] for k in ("element", "title", "project", "depends_on", "base_from")} | {"run": child["id"]})
        engine._event(db, run, "iteration-enrolled", nid, count=len(items), concurrency=node.get("concurrency", 1))
        engine._save(db, run)
    return tick(engine, rid)


def result_record(child, member):
    outputs = {nid: copy.deepcopy(state.get("result", {}).get("outputs", {})) for nid, state in child["nodes"].items() if state["status"] == "accepted"}
    return {"id": member["element"], "title": member["title"], "project": child["project"], "run": child["id"], "outputs": outputs}


def contributions(child):
    return [{"run": child["id"], "node": nid, "attempt": state["attempt"], "candidate": state["result"]["outputs"]["candidate"]}
            for nid, state in child["nodes"].items() if state["status"] == "accepted" and
            state.get("result", {}).get("outputs", {}).get("candidate")]


def tick(engine, rid):
    """Advance already enrolled families only; leave unresolved work observable."""
    with engine.store.transaction() as db:
        run = engine.run(rid, db)
        if run["status"] != "active":
            return run
        for node in run["definition"]["nodes"]:
            state = run["nodes"][node["id"]]
            if node["kind"] != "foreach" or state["status"] != "waiting_children":
                continue
            children = {m["element"]: engine.run(m["run"], db) for m in state["children"]}
            for member in state["children"]:
                child = children[member["element"]]
                if not child.get("iteration_wait") or child.get("iteration_hold") or child["status"] == "cancelled":
                    continue
                deps = [children[key] for key in member["depends_on"]]
                if not all(dependency_satisfied(dep) for dep in deps):
                    continue
                child["parameters"]["depends_on_runs"] = [dep["id"] for dep in deps]
                child["parameters"]["dependency_results"] = {dep["id"]: result_record(dep, next(m for m in state["children"] if m["run"] == dep["id"])) for dep in deps}
                if member.get("base_from"):
                    base = children[member["base_from"]]
                    choices = contributions(base)
                    if len(choices) != 1 or base["project"] != child["project"]:
                        child["coordination_issue"] = "La dépendance de code doit produire un candidat unique dans le même projet."
                        engine._save(db, child)
                        continue
                    child["parameters"]["code_base_run"] = base["id"]
                    for definition in child["definition"]["nodes"]:
                        if definition.get("execution_mode") == "edit":
                            child["nodes"][definition["id"]].setdefault("seed_inputs", {})["candidate"] = choices[0]["candidate"]
                child.pop("iteration_wait", None)
                child["status"] = "active"
                engine._event(db, child, "iteration-released", parent=rid, element=member["element"])
                engine._advance(db, child)
                engine._save(db, child)
            if all(dependency_satisfied(child) for child in children.values()):
                plural = "s" if len(children) > 1 else ""
                result = {"ok": True, "summary": f"{len(children)} élément{plural} terminé{plural}", "outputs": {
                    "results": [result_record(children[m["element"]], m) for m in state["children"]],
                    "contributions": [c for m in state["children"] for c in contributions(children[m["element"]])]}}
                from .contracts import validate_outputs
                validate_outputs(node, result)
                state.update(status="accepted", outcome="done", result=result,
                             receipt={"at": time.time(), "actor": "iteration-engine", "contract": state["enrollment"]["contract"]})
                engine._event(db, run, "iteration-completed", node["id"], count=len(children))
        engine._advance(db, run)
        engine._save(db, run)
        return run


def permission_guard(engine, db, run, *, source=False):
    parent_ref = run.get("parent")
    if not parent_ref:
        return
    require(not run.get("iteration_wait"), "Cet élément attend ses dépendances ; le coordinateur le démarrera dès qu'elles seront terminées")
    parent = engine.run(parent_ref["run"], db)
    state = parent["nodes"][parent_ref["node"]]
    live = parent["status"] == "active" and state["status"] == "waiting_children"
    finished_source = source and parent["status"] in {"active", "completed"} and state["status"] == "accepted" and dependency_satisfied(run)
    require((live or finished_source) and state["attempt"] == parent_ref["attempt"],
            "Coordination suspendue, terminée ou annulée ; aucun nouvel agent ne peut démarrer")
    require(any(m["run"] == run["id"] and m["element"] == parent_ref["element"] for m in state["children"]), "Élément hors de la coordination")
    member = next(m for m in state["children"] if m["run"] == run["id"])
    dependencies = [engine.run(m["run"], db) for m in state["children"] if m["element"] in member["depends_on"]]
    require(all(dependency_satisfied(dep) for dep in dependencies), "Les dépendances de cet élément ne sont pas terminées")
    from .associated_actions import claim_guard as action_guard
    action_guard(engine, db, parent, source=source)


def claim_guard(engine, db, run):
    permission_guard(engine, db, run)
    if not run.get("parent"):
        return
    parent = engine.run(run["parent"]["run"], db)
    state = parent["nodes"][run["parent"]["node"]]
    running = sum(s["status"] == "running" for member in state["children"] for s in engine.run(member["run"], db)["nodes"].values())
    require(running < state["enrollment"]["concurrency"], "Limite de travaux simultanés atteinte pour cette collection")


def control_children(engine, db, run, action):
    for state in run["nodes"].values():
        for member in state.get("children", []):
            child = engine.run(member["run"], db)
            if child["status"] not in {"active", "paused"}:
                continue
            if action == "cancel":
                child["status"] = "cancelled"
            elif action == "pause":
                if child["status"] == "active":
                    child["status"] = "paused"
                    child["parent_paused"] = True
            elif child.pop("parent_paused", False):
                child["status"] = "active"
                for nid in child["nodes"]:
                    engine._automatic(db, child, nid)
                engine._advance(db, child)
            engine._event(db, child, "parent-" + action, parent=run["id"])
            engine._save(db, child)


def overview(engine, run, nid, *, offset=0, limit=25):
    from .projections import _coordination, paging
    offset, limit = paging(offset, limit)
    state = run["nodes"][nid]
    require("children" in state, "Ce traitement n'a pas encore été lancé")
    return _coordination(engine, run, include_items=True, node=nid, offset=offset, limit=limit)[0][nid]

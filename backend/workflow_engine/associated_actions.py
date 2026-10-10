"""Optional child executions: explicit activation, stable identity, no main gate."""
import copy
import time

from .contracts import ContractError, digest, identifier, require, semantic_digest


def validate_actions(graph):
    actions = graph.get("actions", [])
    require(isinstance(actions, list) and len(actions) <= 20, "Au plus 20 actions associées par workflow")
    require(not actions or graph["schema"] == 2, "Les actions associées exigent le schéma 2")
    known = {n["id"]: n for n in graph["nodes"]}
    seen = set()
    for action in actions:
        require(isinstance(action, dict) and set(action) == {"id", "title", "source", "event", "enabled", "workflow"},
                "Action associée : id, title, source, event, enabled et workflow requis")
        aid = identifier(action["id"], "Action associée")
        require(aid not in seen, "Identifiant d'action associée dupliqué")
        seen.add(aid)
        require(isinstance(action["title"], str) and 0 < len(action["title"].strip()) <= 160, "Nom d'action requis, limité à 160 caractères")
        require(isinstance(action["source"], str) and action["source"] in known, "Bloc déclencheur de l'action introuvable")
        require(isinstance(action["event"], str) and action["event"] in {"accepted", "question"}, "Déclencheur accepted ou question requis")
        require(type(action["enabled"]) is bool, "Activation d'action booléenne requise")
        child = action["workflow"]
        require(isinstance(child, dict) and child.get("schema") == 2, "L'action associée exige un workflow de schéma 2")
        require(not child.get("launch_fields"),
                f"{action['title']} : une action facultative ne peut pas afficher de formulaire de lancement ; "
                "recueillez et transmettez les informations depuis le workflow principal, "
                "ou ajoutez une Question ouverte dans le travail associé")
        # Bound recursive activation separately from normal sub-workflow reuse.
        require(not child.get("actions"), "Une action associée ne peut pas créer d'autres actions associées")
        from .contracts import validate
        validate(child)


def _context(run, action):
    state = run["nodes"][action["source"]]
    if action["event"] == "accepted":
        node = next(n for n in run["definition"]["nodes"] if n["id"] == action["source"])
        if state["status"] != "accepted" or state.get("outcome") == "reject" or node.get("completion_outcome") == "blocked":
            return None
        return {"inputs": state.get("inputs", {}), "outputs": state.get("result", {}).get("outputs", {}),
                "outcome": state.get("outcome", "done")}
    question = state.get("question", {})
    if state["status"] != "waiting_input" or question.get("status") != "waiting":
        return None
    return {"inputs": state.get("inputs", {}), "question": {key: question[key] for key in ("id", "text", "created")}}


def _action(run, record):
    return next((a for a in run["definition"].get("actions", []) if a["id"] == record["action"]), None)


def _current(run, record):
    action = _action(run, record)
    if not action or run["status"] == "cancelled":
        return False
    state = run["nodes"].get(record["source"], {})
    context = _context(run, action)
    return (state.get("attempt") == record["attempt"] and context is not None
            and digest(context) == record["source_digest"])


def sync(engine, db, run):
    """Record triggers only. This never creates a child or executes a tool."""
    actions = run["definition"].get("actions", [])
    if not actions or run["status"] == "cancelled":
        return
    records = run.setdefault("associated_actions", [])
    for record in records:
        if record["status"] not in {"disabled", "cancelled", "obsolete"} and not _current(run, record):
            record.update(status="obsolete", reason="Le déclencheur n'est plus actuel ; aucun nouvel envoi ne sera lancé.")
            engine._event(db, run, "associated-action-obsolete", record["source"], action=record["id"])
    for action in actions:
        context = _context(run, action)
        if context is None:
            continue
        attempt = run["nodes"][action["source"]]["attempt"]
        identity = {"run": run["id"], "action": action["id"], "source": action["source"],
                    "attempt": attempt, "event": action["event"], "question": context.get("question", {}).get("id")}
        aid = "action-" + digest(identity)[:32]
        if any(record["id"] == aid for record in records):
            continue
        record = {"id": aid, "action": action["id"], "title": action["title"], "source": action["source"],
                  "attempt": attempt, "event": action["event"], "question": identity["question"],
                  "source_digest": digest(context), "created": time.time(),
                  "status": "awaiting_activation" if action["enabled"] else "disabled"}
        records.append(record)
        engine._event(db, run, "associated-action-ready", action["source"], action=aid, status=record["status"])


def activate(engine, parentid, action_record_id, *, human=False):
    require(human, "L'activation d'une action associée est réservée à l'interface humaine")
    with engine.store.transaction() as db:
        run = engine.run(parentid, db)
        record = next((r for r in run.get("associated_actions", []) if r["id"] == action_record_id), None)
        require(record is not None, "Action associée introuvable dans cette exécution")
        # Reopening an existing action never creates a new operation or resets
        # its idempotency key, including after an uncertain remote response.
        if record.get("run"):
            return run
        action = _action(run, record)
        require(action and action["enabled"] and record["status"] != "disabled", "Cette action associée est désactivée")
        require(run["status"] in {"active", "completed"}, "Le workflow principal est suspendu ou annulé")
        if not _current(run, record):
            record.update(status="obsolete", reason="Le déclencheur n'est plus actuel ; l'action n'a pas été lancée.")
            engine._save(db, run)
            return run
        context = copy.deepcopy(_context(run, action))
        graph = copy.deepcopy(action["workflow"])
        require(not graph.get("launch_fields"),
                f"{action['title']} : une action facultative ne peut pas afficher de formulaire de lancement ; "
                "recueillez et transmettez les informations depuis le workflow principal, "
                "ou ajoutez une Question ouverte dans le travail associé")
        graph["defaults"] = {**run["definition"].get("defaults", {}), **graph.get("defaults", {})}
        incoming = {edge["to"] for edge in graph["edges"]}
        seed = {node["id"]: {name: copy.deepcopy(context["outputs"][name]) for name in node.get("inputs", {}) if name in context.get("outputs", {})}
                for node in graph["nodes"] if node["id"] not in incoming}
        parameters = {"source_run": run["id"], "source_node": record["source"], "source_event": record["event"],
                      "source_context": context}
        if record["question"]:
            parameters["source_question"] = record["question"]
        # An unsuccessful start must not leave a half-created child behind.
        db.execute("SAVEPOINT associated_activation")
        try:
            child = engine.start(run["project"], graph, simulation=run["simulation"], parameters=parameters,
                                 connection=db, deferred=True, driver="automatic", initial_inputs=seed,
                                 notifications_authorized=True)
            child.pop("coordination_wait", None)
            child["associated_with"] = {"run": run["id"], "action": record["id"], "source": record["source"],
                                        "attempt": record["attempt"], "event": record["event"], "question": record["question"]}
            child["status"] = "active"
            record.update(status="active", run=child["id"], activated=time.time(), authorization={
                "actor": "local-user", "workflow": semantic_digest(child["definition"]),
                "source": record["source_digest"], "transports": digest(child.get("transports", {})),
                "project": child["project"]})
            record.pop("reason", None)
            engine._advance(db, child)
            engine._save(db, child)
            db.execute("RELEASE SAVEPOINT associated_activation")
        except (ContractError, OSError) as error:
            db.execute("ROLLBACK TO SAVEPOINT associated_activation")
            db.execute("RELEASE SAVEPOINT associated_activation")
            record.pop("run", None)
            record.pop("authorization", None)
            record.update(status="configuration", reason=str(error)[:1200])
        engine._event(db, run, "associated-action-activation", record["source"], action=record["id"], status=record["status"])
        engine._save(db, run)
        return run


def claim_guard(engine, db, child, *, source=False):
    if child.get("parent"):
        from .iterations import permission_guard
        permission_guard(engine, db, child, source=source)
    ref = child.get("associated_with")
    if ref:
        parent = engine.run(ref["run"], db)
        claim_guard(engine, db, parent, source=True)
        record = next((r for r in parent.get("associated_actions", []) if r["id"] == ref["action"]), None)
        require(record and record.get("run") == child["id"] and child["project"] == parent["project"], "Action hors du workflow autorisé")
        require(parent["status"] in {"active", "completed"} and _current(parent, record),
                "Action devenue obsolète, suspendue ou annulée ; aucun nouvel envoi autorisé")
        authorization = record.get("authorization", {})
        require(authorization.get("workflow") == child["contract"] and authorization.get("source") == record["source_digest"]
                and authorization.get("transports") == digest(child.get("transports", {})), "Autorisation de l'action périmée")
    elif child.get("parameters", {}).get("source_question"):
        # Existing on_question notifications also stop when their question has
        # been answered; no migration of historical run data is needed.
        parameters = child["parameters"]
        parent = engine.run(parameters["source_run"], db)
        # A question's notification inherits the entire execution lineage,
        # including optional actions containing a per-item workflow. Pausing
        # the principal must stop a new notification at claim and effect time.
        claim_guard(engine, db, parent, source=True)
        state = parent["nodes"].get(parameters["source_node"], {})
        question = state.get("question", {})
        require(parent["status"] == "active" and state.get("status") == "waiting_input"
                and question.get("id") == parameters["source_question"] and question.get("status") == "waiting",
                "Question déjà traitée, suspendue ou annulée ; notification obsolète")


def check_current(engine, child):
    with engine.store.connect() as db:
        current = engine.run(child["id"], db)
        require(current["status"] == "active", "Action suspendue ou annulée ; aucun nouvel envoi autorisé")
        claim_guard(engine, db, current)


def cancel(engine, db, run):
    for record in run.get("associated_actions", []):
        if record["status"] == "disabled":
            continue
        record.update(status="cancelled", reason="Action arrêtée ; une opération déjà envoyée reste effective.")
        if not record.get("run"):
            continue
        child = engine.run(record["run"], db)
        if child["status"] in {"active", "paused"}:
            child["status"] = "cancelled"
            from .iterations import control_children
            control_children(engine, db, child, "cancel")
            engine._event(db, child, "associated-action-cancelled", parent=run["id"])
            engine._save(db, child)


def view(engine, run, *, offset=0, limit=25):
    from .projections import _compact_runs, failed_result, focus, paging
    import json
    offset, limit = paging(offset, limit)
    records = run.get("associated_actions", [])
    items = [None] * max(0, min(limit, len(records) - offset))
    counts, by_run = {}, {}
    # Hash the current source once per declared action, not once per historical
    # trigger record (questions and attempts retain all their earlier records).
    current_contexts = {}
    for action in run["definition"].get("actions", []):
        context = _context(run, action)
        current_contexts[action["id"]] = (run["nodes"][action["source"]].get("attempt"),
                                          digest(context) if context is not None else None)

    def current(record):
        attempt, source = current_contexts.get(record["action"], (None, None))
        return run["status"] != "cancelled" and source is not None and attempt == record["attempt"] and source == record["source_digest"]

    def project(index, record, child=None, effects=None):
        item = {key: record.get(key) for key in ("id", "action", "title", "source", "event", "question", "status", "run", "reason")}
        if child:
            states = list(child["nodes"].values())
            definitions = {n["id"]: n for n in child["definition"]["nodes"]}
            effects = effects or {}
            item['effects'] = effects
            uncertain = bool(effects.get('uncertain')) or any(s.get("effect_uncertain") or s.get("result", {}).get("effect_id") for s in states)
            failed = any(failed_result(s, definitions[nid]) for nid, s in child["nodes"].items())
            item["status"] = ("uncertain" if uncertain else "completed" if child["status"] == "completed" and child.get("completion_outcome") in {None, "succeeded"}
                              else record["status"] if record["status"] in {"obsolete", "cancelled"} else "cancelled" if child["status"] == "cancelled"
                              else "failed" if failed or child["status"] == "completed" else "paused" if child["status"] == "paused"
                              else "running" if any(s["status"] == "running" for s in states) else "waiting")
            item["focus"] = focus(child)
            item["trigger_current"] = current(record)
            if uncertain:
                item["reason"] = "Effet externe incertain : rechercher l'accusé avant toute reprise."
            elif failed:
                item["reason"] = next((s.get("result", {}).get("summary") or s.get("validation_error") for s in states if s.get("result", {}).get("ok") is False or s.get("validation_error")), "Résultat à examiner")
            elif effects.get('sent') and item['status'] in {'cancelled', 'obsolete'}:
                item['reason'] = f"Action arrêtée ; {effects['sent']} opération(s) déjà envoyée(s) restent effectives."
        elif record["status"] not in {"disabled", "cancelled"} and not current(record):
            item.update(status="obsolete", reason="Le déclencheur n'est plus actuel.")
        item["reason"] = (item.get("reason") or "")[:600]
        counts[item["status"]] = counts.get(item["status"], 0) + 1
        if offset <= index < offset + limit:
            items[index - offset] = item

    for index, record in enumerate(records):
        if record.get('run'):
            by_run.setdefault(record['run'], []).append((index, record))
        else:
            project(index, record)
    with engine.store.connect() as db:
        effects_by_run = {}
        if by_run and db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='effects'").fetchone():
            for row in db.execute("""
                SELECT substr(json_extract(body, '$.event'), 1, instr(json_extract(body, '$.event'), ':') - 1) AS child_run,
                       json_extract(body, '$.status') AS status, COUNT(*) AS total FROM effects
                WHERE substr(json_extract(body, '$.event'), 1, instr(json_extract(body, '$.event'), ':') - 1)
                      IN (SELECT value FROM json_each(?)) GROUP BY child_run, status
            """, (json.dumps(list(by_run)),)):
                effects_by_run.setdefault(row['child_run'], {})[row['status']] = row['total']
        seen = set()
        for child in _compact_runs(db, by_run):
            seen.add(child['id'])
            for index, record in by_run[child['id']]:
                project(index, record, child, effects_by_run.get(child['id']))
        require(seen == set(by_run), "Une action associée est introuvable ; actualisez le suivi")
    return {"items": items, "total": len(records), "counts": counts, "offset": offset,
            "next": offset + limit if offset + limit < len(records) else None}

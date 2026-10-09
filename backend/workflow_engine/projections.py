"""Bounded transport projections. Lists never embed execution payloads."""
import copy
import hashlib
import json
from .contracts import require

PAGE = 25


def failed_result(state, node=None):
    """A current problem, not a negative outcome already handled by the graph."""
    if state['status'] in {'accepted', 'skipped'}:
        return False
    result = state.get('result') or {}
    outputs = result.get('outputs') or {}
    routed_negative = result.get('ok') is True and node and node.get('route_output') == 'verdict' and 'fail' in node.get('options', [])
    return bool(state.get('validation_error')) or result.get('ok') is False or (isinstance(outputs, dict) and outputs.get('verdict') == 'fail' and not routed_negative)


def health(run):
    """Bounded unresolved causes, independently of the next actionable block."""
    definitions = {node['id']: node for node in run['definition']['nodes']}
    issues, total = [], 0
    for nid, state in run['nodes'].items():
        node = definitions.get(nid, {})
        if not failed_result(state, node):
            continue
        total += 1
        if len(issues) >= PAGE:
            continue
        result = state.get('result') or {}
        # For executor failures the result usually carries the concrete cause;
        # the validator only adds the generic "executor signalled a failure".
        reasons = [result.get('summary'), state.get('validation_error')] if result.get('ok') is False else [state.get('validation_error'), result.get('summary')]
        reason = next((value.strip() for value in reasons if isinstance(value, str) and value.strip()), 'Le contrôle signale un résultat non conforme.')
        if state.get('effect_uncertain'):
            reason = 'Effet externe incertain : vérifier avant toute reprise. ' + reason
        issues.append({'node': nid, 'title': node.get('title', nid)[:120], 'reason': reason[:600]})
    return {'status': 'failed' if total else 'ok', 'total': total, 'issues': issues}


def focus(run):
    """One bounded next action, without transporting every block definition."""
    nodes = run['nodes']
    priority = ('waiting_input', 'blocked', 'waiting', 'returned', 'running', 'ready')
    selected = next(((nid, s) for status in priority for nid, s in nodes.items() if s['status'] == status), None)
    if not selected:
        return None
    nid, state = selected
    node = next(n for n in run['definition']['nodes'] if n['id'] == nid)
    actions = {'waiting_input': 'Répondre à la question', 'blocked': 'Vérifier le blocage', 'waiting': 'Examiner et décider', 'returned': 'Examiner l’échec' if failed_result(state, node) else 'Examiner le résultat', 'running': 'Travail en cours', 'ready': 'Continuer dans le terminal'}
    return {'node': nid, 'title': node['title'][:120], 'status': state['status'], 'action': actions[state['status']]}


def paging(offset=0, limit=PAGE):
    require(type(offset) is int and offset >= 0 and type(limit) is int and 1 <= limit <= 100, "Pagination invalide")
    return offset, limit


def summary(run):
    return {**{key: run.get(key) for key in ("id", "project", "status", "created", "updated", "simulation", "completion_outcome", "archived", "coordination_wait", "coordination_hold")},
            "definition": {"id": run["definition"]["id"], "title": run["definition"]["title"][:300]},
            "original": {"id": run["original"]["id"]},
            "focus": focus(run),
            "health": health(run),
            "request": str(run.get("parameters", {}).get("request", ""))[:240],
            "counts": {status: sum(s["status"] == status for s in run["nodes"].values()) for status in {s["status"] for s in run["nodes"].values()}},
            "nodes": {nid: {"status": state["status"]} for nid, state in sorted(run["nodes"].items(), key=lambda pair: pair[1]["status"] not in {"waiting_input", "waiting", "returned", "blocked"})[:100]}}


def run_page(engine, project=None, *, offset=0, limit=PAGE, query="", status="", simulation=None, archived=False, workflow=None):
    offset, limit = paging(offset, limit)
    where, args = [], []
    for key, value in (("project", project), ("status", status or None), ("original.id", workflow)):
        if value is not None:
            where.append("json_extract(body, '$." + key + "')=?"); args.append(value)
    if simulation is not None:
        require(type(simulation) is bool, "Filtre simulation invalide")
        where.append("json_extract(body, '$.simulation')=?"); args.append(simulation)
    if not archived:
        where.append("coalesce(json_extract(body, '$.archived'), 0)=0")
    if query:
        require(isinstance(query, str) and len(query) <= 200, "Recherche trop longue")
        where.append("(instr(lower(coalesce(json_extract(body, '$.parameters.request'),'')), lower(?))>0 OR instr(lower(json_extract(body, '$.definition.title')), lower(?))>0)")
        args.extend([query, query])
    clause = " WHERE " + " AND ".join(where) if where else ""
    with engine.store.connect() as db:
        total = db.execute("SELECT COUNT(*) FROM runs" + clause, args).fetchone()[0]
        rows = db.execute("SELECT body FROM runs" + clause + " ORDER BY rowid DESC LIMIT ? OFFSET ?", [*args, limit, offset])
        items = [summary(engine.store.body(row)) for row in rows]
    return {"items": items, "total": total, "offset": offset, "limit": limit, "next": offset + len(items) if offset + len(items) < total else None}


def bounded(engine, value, *, threshold=16000, references=None):
    """Large user text/objects get immutable references, never silent truncation."""
    if isinstance(value, str) and len(value.encode()) > threshold:
        return payload(engine, value, threshold=threshold, references=references)
    if isinstance(value, list) and len(json.dumps(value, ensure_ascii=False).encode()) > threshold:
        return payload(engine, value, threshold=threshold, references=references)
    if isinstance(value, dict):
        return {key: bounded(engine, item, threshold=threshold, references=references) for key, item in value.items()}
    if isinstance(value, list):
        return [bounded(engine, item, threshold=threshold, references=references) for item in value]
    return value


def run_detail(engine, run, *, references=None):
    result = copy.deepcopy(run)
    result['focus'] = focus(run)
    result['health'] = health(run)
    # Keep definitions structurally intact; their validated bound is 2 MB.
    threshold = min(8000, max(128, 1_000_000 // max(1, len(run["nodes"]) * 12)))
    result["parameters"] = {key: payload(engine, value, references=references) for key, value in result["parameters"].items()}
    for state in result["nodes"].values():
        for key in ("inputs", "input_sources", "history", "questions", "operation"):
            if key in state:
                state[key] = payload(engine, state[key], threshold=threshold, references=references)
        for key in ("question", "receipt", "decision"):
            if key in state:
                state[key] = bounded(engine, state[key], threshold=threshold, references=references)
        if state.get("result"):
            for key in ("outputs", "preview", "summary", "evidence"):
                if key in state["result"]:
                    state["result"][key] = payload(engine, state["result"][key], threshold=threshold, references=references)
    return result


def proof_page(engine, rid, sha, offset=0, limit=32000):
    require(type(offset) is int and offset >= 0 and type(limit) is int and 1 <= limit <= 64000, "Page de preuve invalide")
    run = engine.run(rid)
    derived = {}
    projected = run_detail(engine, run, references=derived)
    references = []
    def walk(value):
        if isinstance(value, dict):
            if value.get("sha256") == sha and "size" in value:
                references.append(value)
            for child in value.values(): walk(child)
        elif isinstance(value, list):
            for child in value: walk(child)
    walk(run)
    walk(projected)
    require(references, "Preuve absente de cette exécution")
    text = derived.get(sha)
    if text is None:
        text = engine.evidence(references[0]).decode("utf-8", errors="replace")
    return {"sha256": sha, "text": text[offset:offset + limit], "offset": offset, "total": len(text), "next": offset + limit if offset + limit < len(text) else None}


def payload(engine, value, *, threshold=8000, references=None):
    raw = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, indent=2)
    content = raw.encode()
    if len(content) <= threshold:
        return value
    # A read projection is not a new execution proof. Derive its content from
    # the authoritative run instead of writing a potentially huge artifact on
    # every refresh. The reader accepts only hashes attached to this run.
    sha = hashlib.sha256(content).hexdigest()
    if references is not None:
        references[sha] = raw
    return {"$artifact": {"sha256": sha, "size": len(content), "derived": True}, "format": "text" if isinstance(value, str) else "json", "preview": raw[:min(400, threshold)]}


def workflow_item(graph, project):
    if len(json.dumps(graph).encode()) < 20000:
        return {**graph, "_project": project}
    return {**{k: graph.get(k) for k in ("id", "title", "revision", "archived")}, "description": str(graph.get("description", ""))[:400], "node_count": len(graph["nodes"]), "summary": True, "_project": project}


def workflow_page(engine, project, offset=0, limit=25, archived=False):
    offset, limit = paging(offset, limit)
    where = "project=? AND revision=(SELECT MAX(revision) FROM workflows WHERE project=w.project AND id=w.id)"
    if not archived: where += " AND coalesce(json_extract(body, '$.archived'), 0)=0"
    with engine.store.connect() as db:
        total = db.execute("SELECT COUNT(*) FROM workflows w WHERE " + where, (project,)).fetchone()[0]
        rows = db.execute("SELECT body FROM workflows w WHERE " + where + " ORDER BY id LIMIT ? OFFSET ?", (project, limit, offset))
        items = [workflow_item(engine.store.body(row), project) for row in rows]
    return {"items": items, "total": total, "offset": offset, "next": offset + len(items) if offset + len(items) < total else None}


def activity_counts(engine):
    with engine.store.connect() as db:
        return {row["status"]: row["count"] for row in db.execute("SELECT json_extract(n.value, '$.status') AS status, COUNT(*) AS count FROM runs, json_each(runs.body, '$.nodes') n WHERE json_extract(runs.body, '$.status') IN ('active','paused') GROUP BY status")}

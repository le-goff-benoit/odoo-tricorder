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


def conversation_activity(engine, cid):
    """Whole-conversation totals without loading input/output payloads per run."""
    result = dict.fromkeys(('items', 'running', 'ready', 'decisions', 'questions',
                            'failed', 'dependencies', 'completed', 'paused'), 0)
    with engine.store.connect() as db:
        rows = db.execute("""
            SELECT json_extract(r.body, '$.status') AS status,
                   coalesce(json_extract(r.body, '$.coordination_wait'), 0) AS dependencies,
                   (SELECT json_group_array(json_object(
                       'status', json_extract(n.value, '$.status'),
                       'validation_error', json_extract(n.value, '$.validation_error') IS NOT NULL,
                       'ok', json_extract(n.value, '$.result.ok'),
                       'verdict', json_extract(n.value, '$.result.outputs.verdict'),
                       'routed', EXISTS (SELECT 1 FROM json_each(r.body, '$.definition.nodes') d
                           WHERE json_extract(d.value, '$.id')=n.key
                             AND json_extract(d.value, '$.route_output')='verdict'
                             AND EXISTS (SELECT 1 FROM json_each(d.value, '$.options') o WHERE o.value='fail'))
                   )) FROM json_each(r.body, '$.nodes') n) AS nodes
            FROM runs r WHERE r.id IN (
                SELECT json_extract(i.value, '$.run') FROM conversations c,
                    json_each(c.body, '$.items') i WHERE c.id=?)
        """, (cid,))
        for row in rows:
            result['items'] += 1
            result['completed'] += row['status'] == 'completed'
            result['dependencies'] += row['status'] == 'paused' and bool(row['dependencies'])
            result['paused'] += row['status'] == 'paused' and not row['dependencies']
            if row['status'] not in {'active', 'paused'}:
                continue
            nodes = json.loads(row['nodes'])
            result['running'] += sum(n['status'] == 'running' for n in nodes)
            result['decisions'] += sum(n['status'] == 'waiting' for n in nodes)
            result['questions'] += sum(n['status'] == 'waiting_input' for n in nodes)
            result['ready'] += row['status'] == 'active' and any(n['status'] == 'ready' for n in nodes)
            result['failed'] += any(n['status'] not in {'accepted', 'skipped'} and (
                n['validation_error'] or n['ok'] == 0 or
                (n['verdict'] == 'fail' and not (n['ok'] == 1 and n['routed']))) for n in nodes)
    return result


def summary(run):
    conversation = run.get("parameters", {}).get("conversation")
    definitions = {node['id']: node for node in run['definition']['nodes']}
    running = [(nid, state) for nid, state in run['nodes'].items() if state['status'] == 'running']
    workers = []
    for nid, state in running[:PAGE]:
        node = definitions[nid]
        execution = node.get('execution', {})
        workers.append({'node': nid, 'title': node['title'][:120], 'kind': node['kind'],
                        'provider': execution.get('provider', node.get('provider', '')),
                        'model': execution.get('model', node.get('model', '')),
                        'role': execution.get('profile', node.get('profile', '')),
                        **{key: state.get(key) for key in ('ownership', 'started', 'heartbeat')}})
    return {**{key: run.get(key) for key in ("id", "project", "status", "created", "updated", "simulation", "completion_outcome", "archived", "coordination_wait", "coordination_hold")},
            "conversation": conversation if isinstance(conversation, str) and len(conversation) <= 128 else None,
            "workers": workers, "workers_total": len(running),
            "definition": {"id": run["definition"]["id"], "title": run["definition"]["title"][:300], "revision": run["definition"].get("revision")},
            "original": {"id": run["original"]["id"]},
            "focus": focus(run),
            "health": health(run),
            "request": str(run.get("parameters", {}).get("request", ""))[:240],
            "counts": {status: sum(s["status"] == status for s in run["nodes"].values()) for status in {s["status"] for s in run["nodes"].values()}},
            "nodes": {nid: {"status": state["status"]} for nid, state in sorted(run["nodes"].items(), key=lambda pair: pair[1]["status"] not in {"waiting_input", "waiting", "returned", "blocked"})[:100]}}


def run_page(engine, project=None, *, offset=0, limit=PAGE, query="", status="", simulation=None, archived=False, workflow=None, attention_first=False):
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
    # Pending human work precedes history. Filtering after pagination hides old questions.
    attention = "(json_extract(runs.body, '$.status')='paused' OR (json_extract(runs.body, '$.status')='active' AND EXISTS (SELECT 1 FROM json_each(runs.body, '$.nodes') n WHERE json_extract(n.value, '$.status') IN ('waiting_input','waiting','returned','blocked'))))"
    # Sort before pagination: a recent consolidation must not hide an older
    # question, decision or ready prerequisite on another page. This expresses
    # available actions, never an inferred business urgency from a request title.
    action_order = """CASE
        WHEN json_extract(body, '$.status')='active' AND EXISTS
            (SELECT 1 FROM json_each(runs.body, '$.nodes') n WHERE json_extract(n.value, '$.status')='waiting_input') THEN 0
        WHEN json_extract(body, '$.status')='active' AND EXISTS
            (SELECT 1 FROM json_each(runs.body, '$.nodes') n WHERE json_extract(n.value, '$.status')='waiting') THEN 1
        WHEN json_extract(body, '$.status')='active' AND EXISTS
            (SELECT 1 FROM json_each(runs.body, '$.nodes') n WHERE json_extract(n.value, '$.status') IN ('returned','blocked')) THEN 2
        WHEN json_extract(body, '$.status')='paused' AND
            (coalesce(json_extract(body, '$.coordination_wait'), 0)=0 OR coalesce(json_extract(body, '$.coordination_hold'), 0)=1) THEN 3
        WHEN json_extract(body, '$.status')='active' AND EXISTS
            (SELECT 1 FROM json_each(runs.body, '$.nodes') n WHERE json_extract(n.value, '$.status')='ready') THEN 4
        WHEN json_extract(body, '$.status')='active' THEN 5
        WHEN json_extract(body, '$.status')='paused' THEN 6
        ELSE 7 END"""
    order = action_order + ", " if attention_first else ""
    with engine.store.connect() as db:
        attention_total = db.execute("SELECT COUNT(*) FROM runs" + clause + (" AND " if where else " WHERE ") + attention, args).fetchone()[0] if attention_first else None
        total = db.execute("SELECT COUNT(*) FROM runs" + clause, args).fetchone()[0]
        rows = db.execute("SELECT body FROM runs" + clause + " ORDER BY " + order + "rowid DESC LIMIT ? OFFSET ?", [*args, limit, offset])
        from .launch_readiness import LaunchReadiness
        from .runtime import run_driver
        readiness = None
        items = []
        for row in rows:
            run = engine.store.body(row)
            item = summary(run)
            if run_driver(run) == 'conversation' and run['status'] == 'active' and item['counts'].get('ready'):
                if readiness is None:
                    readiness = LaunchReadiness(engine)
                item['launch'] = readiness.project(run)
            items.append(item)
    return {**({"attention_total": attention_total} if attention_first else {}), "items": items, "total": total, "offset": offset, "limit": limit, "next": offset + len(items) if offset + len(items) < total else None}


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


def attempt_history(engine, state, node, *, threshold=8000, references=None):
    """Reading model only: large archived inputs must not hide a short failure reason.

    The workflow contract limits attempts to ten. Bound every content field as
    well, deriving proof references exactly as for the rest of run_detail.
    """
    history = state.get('history', [])
    field_limit = max(128, threshold // max(1, len(history) * 7))
    items = []
    for index, previous in enumerate(history):
        item = {key: previous[key] for key in ('status', 'attempt', 'started', 'finished', 'ownership') if key in previous}
        item['failed'] = failed_result(previous, node)
        for key in ('validation_error', 'inputs'):
            if key in previous:
                item[key] = payload(engine, previous[key], threshold=field_limit, references=references)
        # Engine.retry puts the instruction on the next state, not the archived one.
        following = history[index + 1] if index + 1 < len(history) else state
        if following.get('reason'):
            item['retry_reason'] = payload(engine, following['reason'], threshold=field_limit, references=references)
        if previous.get('result'):
            result = previous['result']
            item['result'] = {key: result[key] for key in ('ok', 'simulated') if key in result}
            for key in ('summary', 'outputs', 'evidence', 'preview'):
                if key in result:
                    item['result'][key] = payload(engine, result[key], threshold=field_limit, references=references)
        items.append(item)
    return items


def run_detail(engine, run, *, references=None):
    result = copy.deepcopy(run)
    result['focus'] = focus(run)
    result['health'] = health(run)
    # Keep definitions structurally intact; their validated bound is 2 MB.
    threshold = min(8000, max(128, 1_000_000 // max(1, len(run["nodes"]) * 12)))
    result["parameters"] = {key: payload(engine, value, references=references) for key, value in result["parameters"].items()}
    definitions = {node['id']: node for node in run['definition']['nodes']}
    for nid, state in result["nodes"].items():
        if state.get('history'):
            state['attempt_history'] = attempt_history(engine, state, definitions[nid], threshold=threshold, references=references)
            if len(state['attempt_history']) > 3 or len(json.dumps(state['attempt_history'], ensure_ascii=False).encode()) > max(1200, threshold * 2):
                state['attempt_history_page'] = {'total': len(state['attempt_history'])}
                del state['attempt_history']
        for key in ("inputs", "input_sources", "history", "questions", "operation", "reason", "validation_error"):
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


def attempt_page(engine, rid, nid, offset=0, limit=3):
    offset, limit = paging(offset, limit)
    require(limit <= 3, 'Trois tentatives par page au maximum')
    run = engine.run(rid)
    node = next((node for node in run['definition']['nodes'] if node['id'] == nid), None)
    require(node is not None, 'Bloc inconnu dans cette exécution')
    threshold = min(8000, max(128, 1_000_000 // max(1, len(run['nodes']) * 12)))
    history = attempt_history(engine, run['nodes'][nid], node, threshold=threshold)
    end = max(0, len(history) - offset)
    return {'items': history[max(0, end - limit):end], 'total': len(history), 'offset': offset,
            'next': offset + limit if offset + limit < len(history) else None}


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
    require(references or sha in derived, "Preuve absente de cette exécution")
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

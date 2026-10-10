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
    priority = ('collecting', 'waiting_input', 'blocked', 'waiting', 'returned', 'running', 'ready', 'waiting_children')
    selected = next(((nid, s) for status in priority for nid, s in nodes.items() if s['status'] == status), None)
    if not selected:
        return None
    nid, state = selected
    node = next(n for n in run['definition']['nodes'] if n['id'] == nid)
    actions = {'collecting': 'Compléter et confirmer les intentions', 'waiting_children': 'Suivre les éléments', 'waiting_input': 'Répondre à la question', 'blocked': 'Vérifier le blocage', 'waiting': 'Examiner et décider', 'returned': 'Examiner l’échec' if failed_result(state, node) else 'Examiner le résultat', 'running': 'Travail en cours', 'ready': 'Continuer dans le terminal'}
    return {'node': nid, 'title': node['title'][:120], 'status': state['status'], 'action': actions[state['status']]}


def paging(offset=0, limit=PAGE):
    require(type(offset) is int and offset >= 0 and type(limit) is int and 1 <= limit <= 100, "Pagination invalide")
    return offset, limit


# Compact SQL values deliberately exclude prompts, inputs, collection command
# ledgers and output payloads. One query can project many related runs without
# loading each full execution or opening one connection per child.
_COMPACT_SELECT = """
    SELECT r.id, json_extract(r.body, '$.project') AS project,
           json_extract(r.body, '$.status') AS status,
           json_extract(r.body, '$.simulation') AS simulation,
           json_extract(r.body, '$.completion_outcome') AS completion_outcome,
           json_extract(r.body, '$.created') AS created,
           json_extract(r.body, '$.updated') AS updated,
           json_extract(r.body, '$.coordination_wait') AS coordination_wait,
           json_extract(r.body, '$.coordination_hold') AS coordination_hold,
           json_extract(r.body, '$.iteration_wait') AS iteration_wait,
           json_extract(r.body, '$.iteration_hold') AS iteration_hold,
           json_extract(r.body, '$.parent_paused') AS parent_paused,
           json_extract(r.body, '$.coordination_issue') AS coordination_issue,
           json_extract(r.body, '$.parent') AS parent,
           json_extract(r.body, '$.associated_with') AS associated_with,
           json_extract(r.body, '$.definition.id') AS definition_id,
           substr(json_extract(r.body, '$.definition.title'), 1, 300) AS title,
           json_extract(r.body, '$.definition.revision') AS revision,
           json_extract(r.body, '$.original.id') AS original_id,
           json_extract(r.body, '$.parameters.conversation') AS conversation,
           substr(json_extract(r.body, '$.parameters.request'), 1, 240) AS request,
           (SELECT json_group_array(json_object(
               'id', json_extract(d.value, '$.id'),
               'title', substr(json_extract(d.value, '$.title'), 1, 120),
               'kind', json_extract(d.value, '$.kind'),
               'route_output', json_extract(d.value, '$.route_output'),
               'options', json_extract(d.value, '$.options'),
               'execution', json_object('provider', json_extract(d.value, '$.execution.provider'),
                                        'model', json_extract(d.value, '$.execution.model'),
                                        'profile', json_extract(d.value, '$.execution.profile')),
               'provider', json_extract(d.value, '$.provider'),
               'model', json_extract(d.value, '$.model'),
               'profile', json_extract(d.value, '$.profile')
           )) FROM json_each(r.body, '$.definition.nodes') d) AS definitions,
           (SELECT json_group_object(n.key, json_object(
               'status', json_extract(n.value, '$.status'),
               'ownership', json_extract(n.value, '$.ownership'),
               'started', json_extract(n.value, '$.started'),
               'heartbeat', json_extract(n.value, '$.heartbeat'),
               'effect_uncertain', json_extract(n.value, '$.effect_uncertain'),
               'validation_error', substr(json_extract(n.value, '$.validation_error'), 1, 600),
               'result', json_object('ok', json_extract(n.value, '$.result.ok'),
                                    'effect_id', json_extract(n.value, '$.result.effect_id'),
                                    'summary', substr(json_extract(n.value, '$.result.summary'), 1, 600),
                                    'outputs', json_object('verdict', json_extract(n.value, '$.result.outputs.verdict')))
           )) FROM json_each(r.body, '$.nodes') n) AS nodes
"""


def _compact(row):
    run = {key: row[key] for key in ('id', 'project', 'status', 'created', 'updated', 'completion_outcome',
                                    'coordination_wait', 'coordination_hold', 'iteration_wait', 'iteration_hold',
                                    'parent_paused', 'coordination_issue')}
    run.update(simulation=bool(row['simulation']), parameters={'conversation': row['conversation'], 'request': row['request'] or ''},
               definition={'id': row['definition_id'], 'title': row['title'], 'revision': row['revision'],
                           'nodes': json.loads(row['definitions'])},
               original={'id': row['original_id']}, nodes=json.loads(row['nodes']))
    for name in ('parent', 'associated_with'):
        if row[name]:
            run[name] = json.loads(row[name])
    for definition in run['definition']['nodes']:
        definition['execution'] = {k: v for k, v in (definition.get('execution') or {}).items() if v is not None}
        definition['options'] = definition.get('options') or []
    for state in run['nodes'].values():
        if state['result']['ok'] is not None:
            state['result']['ok'] = bool(state['result']['ok'])
    return run


def _compact_runs(db, ids):
    identities = list(dict.fromkeys(ids))
    if not identities:
        return
    query = _COMPACT_SELECT + ' FROM runs r WHERE r.id IN (SELECT value FROM json_each(?))'
    for row in db.execute(query, (json.dumps(identities),)):
        yield _compact(row)


def _totals():
    return dict.fromkeys(('items', 'running', 'ready', 'decisions', 'questions', 'collecting', 'coordination',
                          'failed', 'dependencies', 'completed', 'paused', 'cancelled', 'uncertain'), 0)


def _count_run(result, run, *, principal=False):
    result['items'] += 1
    result['completed'] += run['status'] == 'completed'
    result['cancelled'] += run['status'] == 'cancelled'
    dependent = bool(run.get('coordination_wait') or run.get('iteration_wait'))
    result['dependencies'] += run['status'] == 'paused' and dependent
    result['paused'] += run['status'] == 'paused' and not dependent
    if not principal and (run['status'] == 'cancelled' or run['status'] == 'completed' and run.get('completion_outcome') not in {None, 'succeeded'}):
        result['failed'] += 1
        result['completed'] -= run['status'] == 'completed'
    if run['status'] not in {'active', 'paused'}:
        return
    nodes = run['nodes'].values()
    for status, key in (('running', 'running'), ('waiting', 'decisions'), ('waiting_input', 'questions'),
                        ('collecting', 'collecting'), ('waiting_children', 'coordination')):
        result[key] += sum(n['status'] == status for n in nodes)
    result['ready'] += run['status'] == 'active' and any(n['status'] == 'ready' for n in nodes)
    result['failed'] += health(run)['total'] > 0
    result['uncertain'] += any(n.get('effect_uncertain') or n.get('result', {}).get('effect_id') for n in nodes)


_FAMILY = """
WITH RECURSIVE family(id, relation) AS (
    SELECT json_extract(i.value, '$.run'), 'main' FROM conversations c,
           json_each(c.body, '$.items') i WHERE c.id=?
    UNION
    SELECT child.id, CASE WHEN f.relation='associated' THEN 'associated' ELSE 'children' END
    FROM family f JOIN runs p ON p.id=f.id,
         json_each(p.body, '$.nodes') n, json_each(n.value, '$.children') member
         JOIN runs child ON child.id=json_extract(member.value, '$.run')
    WHERE json_extract(child.body, '$.parent.run')=p.id
      AND json_extract(child.body, '$.parent.node')=n.key
      AND json_extract(child.body, '$.parent.element')=json_extract(member.value, '$.element')
      AND json_extract(child.body, '$.parent.attempt')=json_extract(n.value, '$.attempt')
    UNION
    SELECT child.id, 'associated' FROM family f JOIN runs p ON p.id=f.id,
         json_each(p.body, '$.associated_actions') action
         JOIN runs child ON child.id=json_extract(action.value, '$.run')
    WHERE json_extract(child.body, '$.associated_with.run')=p.id
      AND json_extract(child.body, '$.associated_with.action')=json_extract(action.value, '$.id')
)
"""


def conversation_activity(engine, cid):
    """Count actual required child work, independently of optional side actions."""
    main, children, associated = _totals(), _totals(), _totals()
    with engine.store.connect() as db:
        query = _FAMILY + _COMPACT_SELECT + ", f.relation AS relation FROM runs r JOIN family f ON r.id=f.id"
        for row in db.execute(query, (cid,)):
            target = {'main': main, 'children': children, 'associated': associated}[row['relation']]
            _count_run(target, _compact(row), principal=row['relation'] == 'main')
        # Unactivated/configuration records remain visible after the principal
        # result is complete. They are not invented running child executions.
        records = db.execute(_FAMILY + """
            SELECT json_extract(a.value, '$.status') AS status, COUNT(*) AS total,
                   SUM(json_extract(a.value, '$.run') IS NULL) AS unstarted
            FROM runs r JOIN family f ON r.id=f.id, json_each(r.body, '$.associated_actions') a
            GROUP BY status
        """, (cid,))
        associated['actions'] = 0
        for row in records:
            associated['actions'] += row['total']
            if row['unstarted']:
                associated[row['status']] = associated.get(row['status'], 0) + row['unstarted']
    result = dict(main)
    # A child is work inside a demand, never an additional principal demand.
    for key in ('running', 'ready', 'decisions', 'questions', 'collecting', 'coordination',
                'failed', 'dependencies', 'paused', 'uncertain'):
        result[key] += children[key]
    result['children'] = children
    result['associated'] = associated
    return result


def _coordination(engine, run, *, include_items=False, node=None, offset=0, limit=PAGE):
    """Batch child summaries; no input/output payloads and no per-child reads."""
    groups, members = {}, {}
    for nid, state in run['nodes'].items():
        if 'children' not in state or node is not None and node != nid:
            continue
        entries = state['children']
        by_element = {m['element']: m for m in entries}
        groups[nid] = {'run': run['id'], 'node': nid, 'coordinator': 'engine',
                       'concurrency': state['enrollment']['concurrency'], 'status': run['status'],
                       'counts': dict.fromkeys(('completed', 'running', 'question', 'decision', 'failed', 'waiting'), 0),
                       'total': len(entries), 'offset': offset, 'next': offset + limit if len(entries) > offset + limit else None}
        if include_items:
            groups[nid]['items'] = [None] * max(0, min(limit, len(entries) - offset))
        for index, member in enumerate(entries):
            dependencies = [{k: by_element[e][k] for k in ('element', 'title', 'project', 'run')}
                            for e in member.get('depends_on', []) if e in by_element]
            members[member['run']] = (nid, index, {**member, 'dependencies': dependencies})
    workers, workers_total, seen = [], 0, set()
    with engine.store.connect() as db:
        for child in _compact_runs(db, members):
            seen.add(child['id'])
            nid, index, member = members[child['id']]
            statuses = {s['status'] for s in child['nodes'].values()}
            completed = child['status'] == 'completed' and child.get('completion_outcome') in {None, 'succeeded'}
            category = ('completed' if completed else 'failed' if child['status'] in {'completed', 'cancelled'} or health(child)['total']
                        else 'running' if 'running' in statuses else 'question' if statuses & {'waiting_input', 'collecting'}
                        else 'decision' if 'waiting' in statuses else 'waiting')
            groups[nid]['counts'][category] += 1
            child_summary = summary(child)
            workers_total += child_summary['workers_total']
            if len(workers) < PAGE:
                workers.extend({**w, 'run': child['id'], 'parent_node': nid, 'element': member['element']}
                               for w in child_summary['workers'][:PAGE - len(workers)])
            if include_items and offset <= index < offset + limit:
                groups[nid]['items'][index - offset] = {**member, 'state': category, 'execution': child_summary,
                    'reason': child.get('coordination_issue') or ('Dépendances à terminer' if child.get('iteration_wait')
                               else 'Suspendu' if child['status'] == 'paused' else 'Prêt pour un exécutant' if category == 'waiting' else '')}
    require(seen == set(members), 'Un élément de coordination est introuvable ; actualisez le suivi')
    return groups, workers, workers_total


def origin(engine, run, connection=None):
    """A durable navigation label, including parents absent from the current page."""
    ref = run.get('parent') or run.get('associated_with')
    kind = 'task' if run.get('parent') else 'action'
    if not ref and run['definition']['id'] == 'question-notification':
        ref = {'run': run.get('parameters', {}).get('source_run')}
        kind = 'notification'
    if not ref or not isinstance(ref.get('run'), str):
        return None
    if connection is None:
        with engine.store.connect() as db:
            return origin(engine, run, db)
    row = connection.execute("""SELECT id,
        substr(coalesce(nullif(json_extract(body, '$.parameters.request'), ''),
            json_extract(body, '$.definition.title')), 1, 300) AS title,
        json_extract(body, '$.project') AS project FROM runs WHERE id=?""", (ref['run'],)).fetchone()
    return {'kind': kind, 'run': row['id'], 'title': row['title'], 'project': row['project']} if row else None


def summary(run, *, engine=None, connection=None):
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
    result = {**{key: run.get(key) for key in ("id", "project", "status", "created", "updated", "simulation", "completion_outcome", "archived", "coordination_wait", "coordination_hold", "iteration_wait", "iteration_hold", "parent_paused", "parent", "associated_with")},
            "conversation": conversation if isinstance(conversation, str) and len(conversation) <= 128 else None,
            "workers": workers, "workers_total": len(running),
            "definition": {"id": run["definition"]["id"], "title": run["definition"]["title"][:300], "revision": run["definition"].get("revision")},
            "original": {"id": run["original"]["id"]},
            "focus": focus(run),
            "health": health(run),
            "request": str(run.get("parameters", {}).get("request", ""))[:240],
            "counts": {status: sum(s["status"] == status for s in run["nodes"].values()) for status in {s["status"] for s in run["nodes"].values()}},
            "nodes": {nid: {"status": state["status"]} for nid, state in sorted(run["nodes"].items(), key=lambda pair: pair[1]["status"] not in {"collecting", "waiting_input", "waiting", "returned", "blocked"})[:100]}}
    if engine and run.get("associated_actions"):
        from .associated_actions import view
        result["associated"] = view(engine, run)
    if engine:
        result['origin'] = origin(engine, run, connection)
    if engine and any("children" in state for state in run["nodes"].values()):
        groups, child_workers, total = _coordination(engine, run)
        result["coordination"] = groups
        result["workers"].extend(child_workers[:PAGE - len(result["workers"])])
        result["workers_total"] += total
    return result


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
    attention = "(json_extract(runs.body, '$.status')='paused' OR (json_extract(runs.body, '$.status')='active' AND EXISTS (SELECT 1 FROM json_each(runs.body, '$.nodes') n WHERE json_extract(n.value, '$.status') IN ('collecting','waiting_input','waiting','returned','blocked'))))"
    # Sort before pagination: a recent consolidation must not hide an older
    # question, decision or ready prerequisite on another page. This expresses
    # available actions, never an inferred business urgency from a request title.
    action_order = """CASE
        WHEN json_extract(body, '$.status')='active' AND EXISTS
            (SELECT 1 FROM json_each(runs.body, '$.nodes') n WHERE json_extract(n.value, '$.status') IN ('collecting','waiting_input')) THEN 0
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
        tasks, actions = db.execute("""SELECT
            coalesce(sum(json_type(body, '$.parent.run')='text'), 0),
            coalesce(sum(json_type(body, '$.parent.run') IS NOT 'text' AND
                (json_type(body, '$.associated_with.run')='text' OR
                 (json_extract(body, '$.definition.id')='question-notification' AND
                  json_type(body, '$.parameters.source_run')='text'))), 0)
            FROM runs""" + clause, args).fetchone()
        rows = db.execute("SELECT body FROM runs" + clause + " ORDER BY " + order + "rowid DESC LIMIT ? OFFSET ?", [*args, limit, offset])
        from .launch_readiness import LaunchReadiness
        from .runtime import run_driver
        readiness = None
        items = []
        for row in rows:
            run = engine.store.body(row)
            item = summary(run, engine=engine, connection=db)
            if run_driver(run) == 'conversation' and run['status'] == 'active' and item['counts'].get('ready'):
                if readiness is None:
                    readiness = LaunchReadiness(engine)
                item['launch'] = readiness.project(run)
            items.append(item)
    return {**({"attention_total": attention_total} if attention_first else {}),
            "family_counts": {"requests": total - tasks - actions, "tasks": tasks, "actions": actions},
            "items": items, "total": total, "offset": offset, "limit": limit, "next": offset + len(items) if offset + len(items) < total else None}


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
    result['origin'] = origin(engine, run)
    result['focus'] = focus(run)
    result['health'] = health(run)
    if run.get("associated_actions"):
        from .associated_actions import view
        result["associated"] = view(engine, run)
    if any("children" in state for state in run["nodes"].values()):
        result["coordination"] = _coordination(engine, run, include_items=True)[0]
    # Keep definitions structurally intact; their validated bound is 2 MB.
    threshold = min(8000, max(128, 1_000_000 // max(1, len(run["nodes"]) * 12)))
    result["parameters"] = {key: payload(engine, value, references=references) for key, value in result["parameters"].items()}
    definitions = {node['id']: node for node in run['definition']['nodes']}
    for nid, state in result["nodes"].items():
        if isinstance(state.get('collection'), dict):
            # Idempotency hashes are engine-internal. The bounded editable list
            # and its revision stay available to both UI and terminal clients.
            state['collection'].pop('commands', None)
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

"""Metadata-only native adapters. Never return prompts, arguments or tool output."""
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import re
import time

MAX_SOURCE = 64 * 1024 * 1024


def identifier(value):
    return value if isinstance(value, str) and re.fullmatch(r'[\w.:/-]{1,200}', value) else None


def instant(value):
    if value is None or value == '':
        return None
    if isinstance(value, bool):
        raise ValueError('Date invalide')
    stamp = float(value) if isinstance(value, (int, float)) else datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
    if not math.isfinite(stamp):
        raise ValueError('Date invalide')
    return stamp


def iso(value):
    return datetime.fromtimestamp(value, timezone.utc).isoformat() if value is not None else None


def records(path):
    path = Path(path)
    if path.suffix != '.jsonl' or not path.is_file() or path.stat().st_size > MAX_SOURCE:
        raise ValueError('Sélectionner un fichier JSONL régulier de moins de 64 Mio')
    with path.open('rb') as stream:
        raw = stream.read(MAX_SOURCE + 1)
    if len(raw) > MAX_SOURCE:
        raise ValueError('Source native trop volumineuse')
    rows, warnings = [], []
    lines = raw.splitlines()
    for index, line in enumerate(lines):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
            if not isinstance(value, dict):
                raise ValueError()
            rows.append(value)
        except (ValueError, UnicodeError):
            if index == len(lines) - 1 and not raw.endswith(b'\n'):
                warnings.append('Écriture native en cours ; dernière ligne ignorée.')
            else:
                raise ValueError(f'Événement JSONL invalide à la ligne {index + 1}') from None
    return rows, warnings


def event(at, state, native, tool=None, parent=None, kind=None, line=None, request=None):
    return {'at': iso(instant(at)), 'state': state, 'nativeId': identifier(native),
            'tool': identifier(tool), 'parentId': identifier(parent),
            'kind': identifier(kind), 'line': line, 'requestId': identifier(request)}


def claude_hook(row, at=None):
    """Input from a Claude hook: keep only allowlisted metadata."""
    kind = row.get('hook_event_name')
    native = row.get('session_id')
    states = {'SessionStart': 'idle', 'UserPromptSubmit': 'active', 'PreToolUse': 'tool',
              'PostToolUse': 'active', 'PostToolUseFailure': 'active', 'PermissionRequest': 'waiting_human',
              'Elicitation': 'waiting_human', 'ElicitationResult': 'active',
              'Stop': 'idle', 'StopFailure': 'interrupted', 'Interrupt': 'interrupted', 'SessionEnd': 'complete',
              'SubagentStart': 'active', 'SubagentStop': 'complete'}
    state = states.get(kind)
    if kind == 'Notification' and row.get('notification_type') == 'permission_prompt':
        state = 'waiting_human'
    if not state:
        return None
    parent = None
    if kind in ('SubagentStart', 'SubagentStop') or row.get('agent_id'):
        parent, native = native, row.get('agent_id')
    return event(at if at is not None else time.time(), state, native, row.get('tool_name'), parent, kind,
                 request=row.get('tool_use_id') or row.get('elicitation_id'))


def codex(rows):
    metadata = [r for r in rows if r.get('type') == 'session_meta']
    native, parent, offset = None, None, 0
    if metadata:
        native = identifier(metadata[0].get('payload', {}).get('id'))
        source = metadata[0].get('payload', {}).get('source', {})
        if isinstance(source, dict):
            parent = source.get('subagent', {}).get('thread_spawn', {}).get('parent_thread_id')
        # A fork may carry its ancestor's history. It is not this agent's work.
        if any(m.get('payload', {}).get('id') != native for m in metadata):
            boundary = next((i for i, r in enumerate(rows) if r.get('type') == 'event_msg'
                             and r.get('payload', {}).get('type') == 'thread_settings_applied'
                             and r['payload'].get('thread_id') == native), None)
            if boundary is None:
                raise ValueError('Historique hérité sans frontière du thread propre')
            rows = rows[boundary:]
            offset = boundary
    result, tools = [], {}
    for line, row in enumerate(rows, 1 + offset):
        kind, p = row.get('type'), row.get('payload') or {}
        if not isinstance(p, dict):
            continue
        at, state, tool, name = row.get('timestamp'), None, None, p.get('type')
        current = native
        if kind == 'event_msg':
            state = {'task_started': 'active', 'task_complete': 'idle', 'turn_aborted': 'interrupted',
                     'exec_approval_request': 'waiting_human', 'apply_patch_approval_request': 'waiting_human',
                     'request_user_input': 'waiting_human'}.get(name)
        if kind == 'response_item':
            if name in ('function_call', 'custom_tool_call'):
                tool, state = p.get('name'), 'tool'
                tools[p.get('call_id')] = tool
            elif name in ('function_call_output', 'custom_tool_call_output'):
                tool, state = tools.pop(p.get('call_id'), None), 'active'
        # Independent adapter for timestamped App Server notification exports.
        method, params = row.get('method'), row.get('params') or {}
        if method and isinstance(params, dict):
            current = params.get('threadId') or params.get('thread', {}).get('id') or native
            name = method
            state = {'thread/started': 'idle', 'turn/started': 'active', 'thread/closed': 'complete',
                     'item/commandExecution/requestApproval': 'waiting_human',
                     'item/fileChange/requestApproval': 'waiting_human',
                     'item/tool/requestUserInput': 'waiting_human', 'serverRequest/resolved': 'active'}.get(method)
            if method == 'turn/completed':
                state = 'interrupted' if params.get('turn', {}).get('status') in ('interrupted', 'failed') else 'idle'
            if method in ('item/started', 'item/completed'):
                tool = params.get('item', {}).get('type')
                if tool in ('commandExecution', 'fileChange', 'mcpToolCall', 'dynamicToolCall', 'collabAgentToolCall'):
                    state = 'tool' if method == 'item/started' else 'active'
        if state and current:
            result.append(event(at, state, current, tool, parent, name, line,
                                (params.get('requestId') or params.get('itemId')) if method else p.get('call_id')))
    return native, result


def claude(rows):
    result, ids = [], set()
    for line, row in enumerate(rows, 1):
        native = identifier(row.get('sessionId') or row.get('session_id'))
        if native:
            ids.add(native)
        kind, at = row.get('type'), row.get('timestamp')
        state, tool = None, None
        if kind == 'user':
            content = row.get('message', {}).get('content')
            state = 'active' if not isinstance(content, list) or any(c.get('type') == 'tool_result' for c in content if isinstance(c, dict)) else None
        elif kind == 'assistant':
            state = 'active'
            for part in row.get('message', {}).get('content', []):
                if isinstance(part, dict) and part.get('type') == 'tool_use':
                    state, tool = 'tool', part.get('name')
        elif kind == 'system' and row.get('subtype') == 'turn_duration' or kind == 'result':
            state = 'idle'
        if state and native:
            result.append(event(at, state, native, tool, kind=kind, line=line))
    if len(ids) > 1:
        raise ValueError('Plusieurs identités Claude : association ambiguë')
    return next(iter(ids), None), result


def snapshot(source, provider, since=None, until=None, expected=None):
    rows, warnings = records(source)
    lower, upper = instant(since), instant(until)
    if lower is not None and upper is not None and upper <= lower:
        raise ValueError('La fin doit suivre le début de la période')
    usage_source = source
    if provider in ('claude-hooks', 'codex-hooks'):
        ids = {r.get('rootId') for r in rows if r.get('rootId')}
        if len(ids) > 1:
            raise ValueError('Plusieurs sessions dans le journal de hooks')
        native = next(iter(ids), None)
        events = [{**event(r.get('at'), r['state'], r.get('nativeId'), r.get('tool'), r.get('parentId'), r.get('kind'), i, r.get('requestId')),
                   'eventId': identifier(r.get('eventId')), 'model': identifier(r.get('model')), 'role': identifier(r.get('role'))}
                  for i, r in enumerate(rows, 1) if r.get('state') in ('idle', 'active', 'tool', 'waiting_human', 'complete', 'interrupted')]
        usage_source = next((r['usageSource'] for r in reversed(rows) if r.get('usageSource')), None)
    elif provider == 'codex':
        native, events = codex(rows)
        if not native:
            ids = {e['nativeId'] for e in events}
            if len(ids) == 1:
                native = next(iter(ids))
    elif provider == 'claude':
        native, events = claude(rows)
    else:
        raise ValueError('Fournisseur inconnu')
    if not native or expected and native != expected:
        raise ValueError('Identité native absente ou modifiée')
    events = [e for e in events if (lower is None or e['at'] and instant(e['at']) >= lower)
              and (upper is None or e['at'] and instant(e['at']) <= upper)]
    agents = {}
    waits, exact_waits = [], []
    seen = set()
    for e in events:
        if e.get('eventId'):
            if e['eventId'] in seen:
                continue
            seen.add(e['eventId'])
        agent = agents.setdefault(e['nativeId'], {'nativeId': e['nativeId'], 'parentId': e['parentId'], 'events': [], 'waitStart': None, 'waitRequest': None, 'waitAmbiguous': False})
        at = instant(e['at'])
        if at is not None and agent.get('lastAt') is not None and at < agent['lastAt']:
            raise ValueError('Horodatages régressifs : mesures refusées')
        state = e['state']
        boundary = e['kind'] in ('Stop', 'StopFailure', 'Interrupt', 'SessionEnd', 'SubagentStop', 'task_complete', 'task_started', 'turn_aborted', 'turn/completed', 'turn/started', 'thread/closed', 'UserPromptSubmit')
        resolution = e['kind'] in ('ElicitationResult', 'serverRequest/resolved')
        matching_tool = (e['kind'] in ('PostToolUse', 'PostToolUseFailure', 'function_call_output', 'custom_tool_call_output')
                         and e['requestId'] and e['requestId'] == agent['waitRequest'])
        if agent['waitStart'] is not None and state != 'waiting_human' and not boundary:
            if agent['waitAmbiguous'] or not (matching_tool or resolution and (not agent['waitRequest'] or e['requestId'] == agent['waitRequest'])):
                state = 'waiting_human'  # Another parallel tool is not an approval response.
        if agent['waitStart'] is not None and state != 'waiting_human' and at is not None:
            waits.append((agent['waitStart'], at))
            if resolution and not agent['waitAmbiguous']:
                exact_waits.append((agent['waitStart'], at))
            agent['waitStart'] = None
            agent['waitRequest'], agent['waitAmbiguous'] = None, False
        if e['state'] == 'waiting_human' and agent['waitStart'] is None:
            agent['waitStart'] = at
            agent['waitRequest'] = e['requestId']
        elif e['state'] == 'waiting_human' and e['requestId'] != agent['waitRequest']:
            agent['waitAmbiguous'] = True
        if e['kind'] in ('UserPromptSubmit', 'SubagentStart', 'task_started', 'turn/started'):
            agent['startedAt'], agent['endedAt'] = e['at'], None
        if state in ('idle', 'complete', 'interrupted', 'waiting_human') and agent.get('startedAt') and not agent.get('endedAt'):
            agent['endedAt'] = e['at']
        if agent.get('state') == 'waiting_human' and state in ('active', 'tool'):
            agent['startedAt'], agent['endedAt'] = e['at'], None
        if agent.get('state') != state or agent.get('tool') != e['tool']:
            agent['stageStartedAt'] = e['at'] if at is not None else None
        for key in ('model', 'role'):
            if e.get(key):
                agent[key] = e[key]
        agent.update({'state': state, 'tool': e['tool'], 'lastAt': at})
        agent['events'].append(e)
    for agent in agents.values():
        agent['events'] = agent['events'][-100:]
        agent['stale'] = agent['lastAt'] is None or time.time() - agent['lastAt'] > 90
        agent['waitingOpen'] = agent.pop('waitStart') is not None
        agent.pop('waitRequest'); agent.pop('waitAmbiguous')
    usage = None
    if usage_source:
        try:
            import catalog
            if Path(usage_source).suffix != '.jsonl' or Path(usage_source).stat().st_size > MAX_SOURCE:
                raise ValueError('Source des mesures non prise en charge')
            usage = catalog.trusted_module('odoo_usage').read_usage(Path(usage_source), provider.split('-')[0], since, until)
            if usage.get('thread_id') != native:
                raise ValueError('Les mesures appartiennent à une autre session')
        except Exception:
            usage = None
            warnings.append('Mesures natives indisponibles ou incompatibles ; aucune valeur déduite.')
    return {'nativeId': native, 'agents': list(agents.values()), 'usage': usage,
            'usageSource': str(usage_source) if usage_source else None,
            'waitingSeconds': sum(b - a for a, b in exact_waits) if exact_waits and len(exact_waits) == len(waits) else None,
            'waitingUpperBoundSeconds': sum(b - a for a, b in waits) if waits else None,
            'waitingIntervals': [[iso(a), iso(b)] for a, b in waits],
            'warnings': warnings, 'observedAt': iso(time.time())}

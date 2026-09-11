"""Declared lifecycle and provenance; never replace Odoo Crew's proof verdict."""
import re
from pathlib import Path


def release_state(content):
    # odoo-release.sh is_open/list/close: close removes the opening marker.
    if re.search(r'<!--\s*(?:release ouverte|lot ouvert)\s*-->', content, re.I):
        return 'ouverte', 'Marqueur d’ouverture Odoo Crew dans README.md'
    return 'close', 'README présent sans marqueur ouvert : close selon odoo-release.sh (pas une preuve de déploiement)'


def legacy_tasks(content, release):
    """Only explicit numbered tracking tables, as supported by `release points`."""
    result, used = [], set()
    fenced = False
    for line in content.splitlines():
        if line.lstrip().startswith(('```', '~~~')):
            fenced = not fenced
        if fenced or not re.match(r'^\|\s*[0-9]+\s*\|', line):
            continue
        cells = [c.strip() for c in re.split(r'(?<!\\)\|', line.strip().strip('|'))]
        if len(cells) < 3 or not cells[1]:
            continue
        identifier, title, raw = 'P' + cells[0], cells[1], cells[-1]
        if identifier in used:
            continue
        used.add(identifier)
        normalized = re.sub(r'[*_`]', '', raw).strip().casefold()
        state = 'unverified'
        if re.match(r'^(?:✅|fait\b|réalisé\b|terminé\b|done\b)', normalized):
            state = 'done'
        elif re.match(r'^(?:reporté\b|différé\b)', normalized):
            state = 'deferred'
        elif re.match(r'^(?:bloqué\b|❌)', normalized):
            state = 'blocked'
        elif re.match(r'^(?:en cours\b|⏳)', normalized):
            state = 'running'
        elif re.match(r'^(?:à faire\b|en attente\b|todo\b)', normalized):
            state = 'pending'
        result.append({'id': identifier, 'title': title, 'status': state,
                       'progress': state, 'validation': 'not_recorded', 'source': 'readme',
                       'reason': 'État déclaré dans le suivi README : ' + raw,
                       'rawStatus': raw, 'request': f'changelog/{release}/README.md',
                       'acceptance': [], 'depends_on': [], 'scopes': [], 'flow': None,
                       'receiptAt': None, 'flowPaths': []})
    return result


def receipt_context(root, task, read_json, inside, git):
    receipt = task.get('receipt')
    if not isinstance(receipt, dict):
        return None
    result = {'at': receipt.get('at'), 'proofPath': None, 'origin': None, 'location': 'unknown'}
    try:
        relative = receipt['proof']['path']
        proof = read_json(inside(root, root / relative))
        origin = Path(proof['project']).resolve()
        result.update(proofPath=relative, origin=str(origin))
        if origin == root:
            result['location'] = 'current'
        else:
            # Worktrees are corroborated by this repository, never inferred by basename.
            registered = [line[9:] for line in git(root, 'worktree', 'list', '--porcelain').splitlines()
                          if line.startswith('worktree ')]
            result['location'] = 'worktree' if str(origin) in registered else 'other'
    except (OSError, ValueError, KeyError, TypeError):
        pass
    return result


def link_flows(tasks, flows, release):
    """Expose all explicit associations without replacing the recorded attempt."""
    for task in tasks:
        recorded = task.get('flow')
        linked = [f for f in flows if f['path'] == recorded or
                  (f.get('release') == release and f.get('taskId') == task['id'])]
        task['flowPaths'] = [f['path'] for f in linked]
        task['recordedFlow'] = recorded
        present = [f for f in linked if not f.get('missing')]
        if not any(f['path'] == recorded for f in present):
            # One explicit alternative can be displayed; ambiguity stays visible.
            task['flow'] = present[0]['path'] if len(present) == 1 else None
        task['flowNote'] = ('Workflow de la tentative enregistré absent ; autres associations explicites affichées.'
                            if recorded and not any(f['path'] == recorded for f in present) else None)

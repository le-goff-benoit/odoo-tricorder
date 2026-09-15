"""Read-only adapters for the existing Odoo agents files. No RPC or credentials."""
import ast
import importlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from datetime import datetime, timezone
from urllib.parse import urlsplit, urlunsplit
from lifecycle import release_state, legacy_tasks, receipt_context, link_flows

LIMIT = 4 * 1024 * 1024
EXCLUDED = {'odoo-sources', 'node_modules', 'snap', 'filestore', 'nobackup'}


def read_text(path, limit=LIMIT):
    with Path(path).open('r', encoding='utf-8', errors='replace') as stream:
        value = stream.read(limit + 1)
    if len(value) > limit:
        raise ValueError('Fichier trop volumineux : ' + Path(path).name)
    return value


def read_json(path):
    return json.loads(read_text(path))


def inside(root, path):
    root, path = Path(root).resolve(), Path(path).resolve()
    if not path.is_relative_to(root):
        raise ValueError('Chemin hors du projet')
    return path


def trusted_module(name):
    # Never import executable Python from a discovered client repository.
    scripts = Path(os.environ.get('TRICORDER_AGENTS_DIR', Path.home() / '.odoo19-agents')) / 'scripts'
    if not (scripts / (name + '.py')).is_file():
        raise ValueError('Outillage odoo-agents indisponible : validation non vérifiée')
    sys.path.insert(0, str(scripts))
    return importlib.import_module(name)


def git(root, *args):
    try:
        result = subprocess.run(['git', '--no-pager', '-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', '-C', str(root), *args],
                                capture_output=True, text=True, timeout=5,
                                env={**os.environ, 'GIT_OPTIONAL_LOCKS': '0'})
        return result.stdout.strip() if result.returncode == 0 else ''
    except (OSError, subprocess.TimeoutExpired):
        return ''


def project_series(root):
    config = root / '.odoo-agents/config'
    if config.is_file():
        match = re.search(r'^\s*series\s*=\s*[\"\']?([^\s\"\'#]+)', read_text(config), re.M)
        if match:
            return match[1]
    for manifest in [root / '__manifest__.py', *sorted(root.glob('*/__manifest__.py'))[:30]]:
        if manifest.is_file():
            try:
                data = ast.literal_eval(read_text(manifest, 128000))
                match = re.match(r'(1[4-9]\.\d+)\.', str(data.get('version', '')))
                if match:
                    return match[1]
            except (SyntaxError, ValueError, AttributeError):
                pass
    return None


def releases(root):
    base = root / 'changelog'
    if not base.is_dir():
        return []
    result = []
    for folder in sorted(base.iterdir(), reverse=True):
        if not folder.is_dir() or folder.is_symlink() or not (folder / 'README.md').is_file():
            continue
        try:
            content = read_text(inside(root, folder / 'README.md'))
            title = re.search(r'^#\s+(.+)', content, re.M)
            status, status_reason = release_state(content)
            result.append({'id': folder.name, 'title': title[1] if title else folder.name,
                           'status': status, 'statusReason': status_reason,
                           'hasPlan': (folder / 'plan.json').is_file(),
                           'hasEffort': (folder / 'effort.json').is_file()})
        except (OSError, ValueError):
            result.append({'id': folder.name, 'title': folder.name, 'status': 'illisible'})
    return result


def plan_tasks(root, release):
    folder = inside(root, root / 'changelog' / release)
    if not (folder / 'plan.json').is_file():
        return legacy_tasks(read_text(inside(root, folder / 'README.md')), release), []
    plan = read_json(inside(root, folder / 'plan.json'))
    if plan.get('schema') not in (1, 2) or not isinstance(plan.get('tasks'), list):
        raise ValueError('Format du plan non pris en charge')
    warnings, statuses, availability = [], {}, {}
    try:
        module = trusted_module('odoo_plan')
        module.validate(plan, root)
        statuses = module.statuses(plan, root)
        # Reuse authoritative dependency and scope rules. No state mutation.
        for task in plan['tasks']:
            if statuses[task['id']][0] == 'pending':
                availability[task['id']] = module.available(plan, root, task['id'])
    except Exception as exc:
        warnings.append(str(exc))
    result = []
    for task in plan['tasks']:
        identifier = task['id']
        state, reason = statuses.get(identifier, ('unverified', 'Validation non vérifiée'))
        if identifier in availability:
            ready, reason = availability[identifier]
            if ready:
                state = 'ready'
        attempts = task.get('attempts', [])
        receipt = receipt_context(root, task, read_json, inside, git)
        if receipt and receipt['location'] == 'worktree' and state == 'stale':
            reason = 'Réception enregistrée dans un worktree du même dépôt ; preuve non validée dans ce dossier. ' + reason
        result.append({k: task.get(k) for k in ('id', 'title', 'depends_on', 'acceptance', 'scopes', 'risk', 'route', 'request',
                                              'intentions', 'contract', 'resources', 'execution', 'inputs', 'outputs')} | {
            'status': state, 'reason': reason, 'flow': attempts[-1].get('flow') if attempts else None,
            'receiptAt': (task.get('receipt') or {}).get('at'),
            'progress': 'deferred' if task.get('deferred') else 'received' if receipt else state,
            'validation': state if receipt else 'not_recorded', 'source': 'plan',
            'receiptContext': receipt,
        })
    return result, warnings


def intentions_details(root, release):
    """Read a declared register without inferring satisfaction from task links."""
    relative = f'changelog/{release}/intentions.json'
    result = {'schema': 1, 'revision': None, 'items': [], 'warnings': [], 'path': relative}
    try:
        path = inside(root, root / relative)
        if not path.is_file():
            return result | {'available': False}
        data = read_json(path)
        if data.get('schema') != 1 or not isinstance(data.get('items'), list):
            raise ValueError('Format du registre non pris en charge')
        used = set()
        for entry in data['items']:
            if not isinstance(entry, dict) or not isinstance(entry.get('id'), str) or entry['id'] in used:
                raise ValueError('Identifiant d’intention absent ou dupliqué')
            used.add(entry['id'])
            if entry.get('status') not in {'clarify', 'ready', 'planned', 'satisfied', 'deferred'}:
                raise ValueError('État d’intention inconnu : ' + entry['id'])
        return result | {k: data.get(k) for k in ('schema', 'revision', 'items', 'history')} | {'available': True}
    except (OSError, ValueError, TypeError, AttributeError) as exc:
        return result | {'available': False, 'warnings': ['Intentions : ' + str(exc)]}


def orchestration_details(root, release=None, *, any_release=False):
    """Metadata only. An open terminal is never evidence of an active run."""
    try:
        path = inside(root, root / '.odoo-agents/orchestration.json')
        if not path.is_file():
            path = inside(root, root / 'changelog' / release / 'orchestration.json') if release else path
            if not path.is_file():
                return None
        data = read_json(path)
        if data.get('schema') != 1 or not data.get('id'):
            raise ValueError('Format du suivi d’orchestration non pris en charge')
        assigned = Path(data['release']).name if data.get('release') else None
        if not any_release and assigned != release:
            archived = inside(root, root / 'changelog' / release / 'orchestration.json') if release else None
            if not archived or not archived.is_file():
                return None
            data = read_json(archived)
            assigned = Path(data['release']).name if data.get('release') else None
            if data.get('schema') != 1 or not data.get('id') or assigned != release:
                raise ValueError('Suivi d’orchestration rattaché à une autre release')
        allowed = ('id', 'provider', 'model', 'owner', 'phase', 'status', 'revision', 'reason', 'next_action')
        return {key: data.get(key) for key in allowed} | {
            'release': assigned, 'state': data.get('status'), 'taskIds': data.get('authorized_tasks', []),
            'startedAt': data.get('started_at'), 'updatedAt': data.get('updated_at'),
            'phaseStartedAt': data.get('phase_started_at'),
            'endedAt': data.get('ended_at'), 'waitingReason': data.get('reason'),
            'source': '.odoo-agents/orchestration.json',
        }
    except (OSError, ValueError, TypeError, AttributeError) as exc:
        return {'state': 'unknown', 'status': 'unknown', 'warning': str(exc)}


def environments(root):
    path = root / '.odoo-agents/instances.json'
    if not path.is_file():
        return []
    result = []
    for name, meta in read_json(path).items():
        if not isinstance(meta, dict):
            continue
        # Whitelist metadata, strip any embedded HTTP credentials/query fragments.
        url = urlsplit(str(meta.get('url', '')))
        host = url.hostname or ''
        if ':' in host:
            host = '[' + host + ']'
        if url.port:
            host += ':' + str(url.port)
        clean_url = urlunsplit((url.scheme, host, url.path, '', '')) if url.scheme in ('http', 'https') else ''
        result.append({'name': name, 'kind': meta.get('kind', 'unknown'), 'url': clean_url,
                       'db': meta.get('db', ''), 'platform': meta.get('platform', ''),
                       'connectivity': 'unchecked'})
    return result


def flow_details(root, relative):
    path = inside(root / '.odoo-agents/flows', root / relative)
    data = read_json(path)
    graph = data.get('graph_snapshot') or {}
    warning, summary = None, {}
    try:
        module = trusted_module('odoo_flow')
        if not graph:
            graph_path = Path(module.DEFAULT_GRAPH)
            data, graph = module.load_state(path, graph_path)
        summary = module.state_summary(data, graph)
    except Exception as exc:
        warning = str(exc)
    nodes = graph.get('nodes', {})
    claims = data.get('claims', {})
    ready = summary.get('ready', [])
    events = data.get('events', [])
    result = {'id': path.stem, 'kind': data.get('kind'), 'path': str(path.relative_to(root)), 'status': summary.get('status', data.get('status')),
              'updatedAt': data.get('updated_at'), 'warning': warning, 'nodes': [],
              'events': events[-80:], 'ready': ready, 'edges': graph.get('edges', [])}
    association = data.get('plan_task') or {}
    release = association.get('release') or data.get('release')
    result.update(release=Path(release).name if release else None, taskId=association.get('id'),
                  scope='task' if association.get('id') else 'release' if release else 'project')
    # Only nodes actually reached by this run, plus its next steps.
    seen = list(dict.fromkeys([e['node'] for e in events if 'node' in e] + list(claims) + ready))
    for name in seen:
        node = nodes.get(name, {})
        claim = claims.get(name)
        prior = [e for e in events if e.get('node') == name]
        result['nodes'].append({'id': name, 'description': node.get('description', name),
                                'role': node.get('role') or node.get('executor', ''),
                                'executor': node.get('executor'),
                                'status': 'claimed' if claim else ('ready' if name in ready else 'done'),
                                'owner': claim.get('owner') if claim else None,
                                'claimedAt': claim.get('at') if claim else None,
                                'locks': claim.get('locks', []) if claim else [],
                                'lastEvent': prior[-1] if prior else None,
                                'activity': 'unconfirmed' if claim else None})
    return result


def express_interventions(root):
    """Read declared express runs, including completed runs without a release."""
    result = []
    for path in sorted((root / '.odoo-agents/flows').glob('*.json')):
        try:
            raw = read_json(inside(root, path))
            if raw.get('kind') != 'express':
                continue
            flow = flow_details(root, str(path.relative_to(root)))
            # An express run keeps its kind even after promotion to the full route.
            flow['promoted'] = any(
                (e.get('node'), e.get('outcome')) in
                {('express_scope', 'full'), ('express_implementation', 'expanded')}
                for e in raw.get('events', []))
            qa = [e for e in raw.get('events', []) if e.get('node') == 'express_qa']
            flow['expressQA'] = qa[-1].get('outcome') if qa else None
            flow['expressEvidence'] = qa[-1].get('evidence', []) if qa else []
            result.append(flow)
        except (OSError, ValueError, TypeError, AttributeError):
            continue
    return sorted(result, key=lambda f: f.get('updatedAt') or '', reverse=True)


def effort_details(folder, project_only=False):
    root = folder if project_only else folder.parent.parent
    if not (folder / 'effort.json').is_file() and not (root / '.odoo-agents/preparation/effort.json').is_file():
        return None
    try:
        module = trusted_module('odoo_effort')
        if project_only:
            return module.preparation_report(root, live=True) if hasattr(module, 'preparation_report') else None
        if (folder / 'effort.json').is_file():
            data = read_json(folder / 'effort.json')
        elif hasattr(module, 'preparation_entries') and module.preparation_entries(root, folder.name):
            data = module.empty_state(folder)
        else:
            return None
        # report_data computes the current report in memory; report() writes files.
        reader = module.report_data
        # Older Crew installations still provide recorded values only.
        import inspect
        report = reader(folder, data, **({'live': True} if 'live' in inspect.signature(reader).parameters else {}))
        if hasattr(module, 'measurement_state'):
            data = module.measurement_state(folder, data)
        for row in report.get('rows', []):
            entries = [e for e in data.get('entries', []) if e.get('task') == row['task'] and e.get('agent') == row['agent']]
            row['timeState'] = ('complete' if row.get('time_complete') else 'unrecorded' if not entries
                                else 'running' if any(e.get('status') == 'running' for e in entries)
                                else 'interrupted' if any(e.get('status') == 'interrupted' for e in entries)
                                else 'missing-duration')
        report['openTimers'] = [{'task': e['task'], 'agent': e['agent']} for e in data.get('entries', [])
                                if e.get('status') == 'running']
        return report
    except Exception as exc:
        return {'rows': [], 'warnings': [str(exc)], 'unverified': True}


def related_flows(root, release):
    """Unassigned live workflows belong to the project, not an inferred release."""
    folder = root / '.odoo-agents/flows'
    if not folder.is_dir():
        return
    for path in sorted(folder.glob('*.json')):
        if path.name == 'resource-locks.json':
            continue
        try:
            raw = read_json(path)
            association = raw.get('plan_task', {}).get('release') or raw.get('release')
            if ((association and Path(association).name == release)
                    or (not association and raw.get('status') == 'active')):
                yield str(path.relative_to(root)), not bool(association)
        except (OSError, ValueError, AttributeError):
            continue


def summary(root):
    root = Path(root).resolve()
    rels = releases(root)
    current = next((r for r in rels if r['status'] == 'ouverte'), rels[0] if rels else None)
    tasks, warnings, attention, board, running = [], [], [], [], 0
    for release in rels:
        release['orchestration'] = orchestration_details(root, release['id'])
        release['intentions'] = intentions_details(root, release['id'])
        try:
            release_tasks, issues = plan_tasks(root, release['id'])
            warnings.extend(release['id'] + ' : ' + issue for issue in issues)
            release['taskCount'] = len(release_tasks)
            release['receivedCount'] = sum(t.get('progress') == 'received' for t in release_tasks)
            release['validatedCount'] = sum(t['status'] == 'validated' for t in release_tasks)
            running += sum(t['status'] == 'running' for t in release_tasks)
            if current and release['id'] == current['id']:
                tasks = release_tasks
            for task in release_tasks:
                owners = []
                if task.get('flow'):
                    try:
                        flow = flow_details(root, task['flow'])
                        owners = list(dict.fromkeys(n['owner'] for n in flow['nodes']
                                                    if n['status'] == 'claimed' and n.get('owner')))
                    except Exception:
                        pass  # Missing ownership is not an invented assignment.
                board.append({k: task.get(k) for k in ('id', 'title', 'status', 'progress', 'validation', 'reason', 'source', 'acceptance', 'flow', 'intentions')} |
                             {'release': release['id'], 'releaseTitle': release['title'],
                              'releaseStatus': release['status'], 'owners': owners})
            attention.extend(t | {'release': release['id']} for t in release_tasks
                             if t['status'] in ('stale', 'blocked', 'interrupted', 'awaiting_receipt')
                             and not (release['status'] == 'close' and t['status'] == 'stale'))
        except Exception as exc:
            warnings.append(release['id'] + ' : ' + str(exc))
    flow_paths = dict.fromkeys(relative for release in (rels or [{'id': None}])
                             for relative, _ in related_flows(root, release['id']))
    for relative in flow_paths:
        try:
            flow = flow_details(root, relative)
            if flow['status'] in ('waiting_human', 'deadlocked', 'blocked'):
                attention.append({'id': 'flow:' + flow['id'], 'title': 'Workflow du projet : ' + flow['id'],
                                  'release': flow.get('release'),
                                  'status': flow['status'], 'reason': '; '.join(n['description'] for n in flow['nodes'] if n['status'] == 'ready') or 'Aucune étape prête'})
        except Exception as exc:
            warnings.append(Path(relative).name + ' : ' + str(exc))
    return {'path': str(root), 'name': root.name, 'series': project_series(root),
            'release': current, 'releases': rels, 'attention': attention,
            'running': running, 'warnings': warnings, 'board': board,
            'orchestration': orchestration_details(root, any_release=True)}


def overview(home, extras):
    home = Path(home)
    candidates = set()
    for child in home.iterdir():
        if child.name.startswith('.') or child.name in EXCLUDED or child.is_symlink() or not child.is_dir():
            continue
        if ((child / '.odoo-agents').is_dir() or (child / '__manifest__.py').is_file()
                or next(child.glob('*/__manifest__.py'), None)):
            candidates.add(child.resolve())
    candidates.update(Path(p).resolve() for p in extras if Path(p).is_dir())
    result = []
    for root in sorted(candidates, key=lambda p: p.name.lower()):
        try:
            result.append(summary(root))
        except Exception as exc:
            result.append({'path': str(root), 'name': root.name, 'series': None, 'releases': [],
                           'release': None, 'attention': [], 'running': 0, 'warnings': [str(exc)]})
    return result


def source_details(root, series, instances, source_root=None):
    base = Path(source_root or os.environ.get('ODOO_SOURCES_DIR', Path.home() / 'odoo-sources')).expanduser().resolve()
    safe_series = series if series and re.fullmatch(r'(?:saas[~\-])?1[4-9]\.\d+', series) else None
    folder = re.sub(r'^saas[~\-]', '', safe_series) if safe_series else None
    modules = sorted(p.parent.name for p in root.glob('*/__manifest__.py') if p.parent.name != 'studio_customization')
    if (root / '__manifest__.py').is_file():
        modules.append(root.name)
    online = any(e['platform'] == 'online' for e in instances)
    studio = (root / 'studio_customization').is_dir() or not modules
    profile = 'online' if online else ('studio' if studio else 'module')
    requirements = {
        'module': 'Sources exactes pour analyser, développer et tester les modules ; stack locale distincte.',
        'studio': 'Sources utiles à l’analyse du standard. Configuration et pack Studio sur une copie du client.',
        'online': 'Sources de référence pour l’analyse. Configuration Studio ; pas de déploiement de module Python sur Online.',
    }
    rows = []
    for kind, suffix in [('Community', ''), ('Enterprise', '-enterprise')]:
        target = base / (folder + suffix) if folder else None
        rows.append({'kind': kind, 'path': str(target) if target else None, 'present': bool(target and target.is_dir()),
                     'required': kind == 'Community' and profile == 'module'})
    available = sorted(p.name for p in base.iterdir() if p.is_dir() and re.fullmatch(r'1[4-9]\.\d+(?:-enterprise)?', p.name)) if base.is_dir() else []
    return {'root': str(base), 'series': series, 'profile': profile, 'inferred': True,
            'explanation': requirements[profile], 'libraries': rows, 'available': available,
            'modules': modules, 'enterpriseRequirement': 'À déterminer selon les dépendances des modules',
            'policy': 'Sources partagées en lecture seule. Aucune substitution par une autre série.'}


def project(root, release=None, source_root=None, profile=None):
    root = Path(root).resolve()
    data = summary(root)
    chosen = None if release == '' else release or (data['release']['id'] if data['release'] else None)
    if chosen and chosen not in {r['id'] for r in data['releases']}:
        raise ValueError('Release inconnue')
    data.update({'selectedRelease': chosen, 'branch': git(root, 'branch', '--show-current'),
                 'gitChanges': len(git(root, 'status', '--porcelain', '-uno').splitlines()),
                 'environments': [], 'tasks': [], 'flows': [], 'effort': None,
                 'documents': [], 'inbox': [], 'express': express_interventions(root)})
    data['orchestration'] = orchestration_details(root, chosen)
    data['intentions'] = intentions_details(root, chosen) if chosen else {'items': [], 'warnings': [], 'available': False}
    try:
        data['environments'] = environments(root)
    except (OSError, ValueError, AttributeError) as exc:
        data['warnings'].append('Environnements : ' + str(exc))
    data['sources'] = source_details(root, data['series'], data['environments'], source_root)
    from insights import enrich, stack
    try:
        data['sources'] = enrich(root, data['sources'], profile or {})
        data['stack'] = stack(root, profile or {})
    except (ValueError, OSError, TypeError, RecursionError):
        data['warnings'].append('Inventaire des sources ou de la stack incomplet.')
    if chosen:
        try:
            data['tasks'], warnings = plan_tasks(root, chosen)
            data['warnings'].extend(warnings)
        except (OSError, ValueError, KeyError, TypeError) as exc:
            data['warnings'].append('Plan : ' + str(exc))
        folder = root / 'changelog' / chosen
        data['effort'] = effort_details(folder)
        flow_paths = list(dict.fromkeys(t['flow'] for t in data['tasks'] if t.get('flow')))
        # Standalone/release flows also matter, including plans with no tasks yet.
        flow_paths.extend(relative for relative, _ in related_flows(root, chosen))
        for relative in dict.fromkeys(flow_paths):
            try:
                data['flows'].append(flow_details(root, relative))
            except Exception as exc:
                data['flows'].append({'id': Path(relative).stem, 'path': relative, 'status': 'unavailable',
                                      'missing': True, 'warning': 'Workflow local indisponible : ' + str(exc),
                                      'nodes': [], 'events': [], 'ready': [], 'scope': 'task'})
        link_flows(data['tasks'], data['flows'], chosen)
        data['documents'] = [{'name': p.name, 'path': str(p.relative_to(root)), 'type': p.suffix[1:]}
                             for p in sorted(folder.iterdir())
                             if p.is_file() and p.suffix.lower() in ('.md', '.pdf', '.txt')]
    if not chosen:
        data['effort'] = effort_details(root, project_only=True)
        for relative, _ in related_flows(root, None):
            try:
                data['flows'].append(flow_details(root, relative))
            except Exception as exc:
                data['warnings'].append(str(exc))
    for name in ('PROJECT.md', 'JOURNAL.md'):
        if (root / '.odoo-agents' / name).is_file():
            data['documents'].append({'name': name, 'path': '.odoo-agents/' + name, 'type': 'md'})
    inbox = root / 'inbox'
    if inbox.is_dir():
        data['inbox'] = [{'name': p.name, 'bytes': p.stat().st_size,
                          'modified': datetime.fromtimestamp(p.stat().st_mtime, timezone.utc).isoformat()}
                         for p in sorted(inbox.iterdir()) if p.is_file() and not p.is_symlink()][:80]
    from quality import reports
    data['quality'] = reports(root, chosen, [t['id'] for t in data['tasks']])
    return data


def document(root, relative):
    root = Path(root).resolve()
    path = inside(root, root / relative)
    allowed = path.is_relative_to(root / 'changelog') or path in (
        root / '.odoo-agents/PROJECT.md', root / '.odoo-agents/JOURNAL.md')
    if not allowed or path.suffix.lower() not in ('.md', '.txt', '.pdf'):
        raise ValueError('Document non accessible depuis le cockpit')
    return {'path': str(path), 'name': path.name, 'type': path.suffix[1:],
            'text': read_text(path, 512000) if path.suffix != '.pdf' else None}


def dispatch(payload):
    action = payload['action']
    if action == 'overview':
        return overview(payload['home'], payload.get('extras', []))
    if action == 'project':
        return project(payload['project'], payload.get('release'), payload.get('sourceRoot'), payload.get('profile'))
    if action == 'search':
        from insights import search
        return search(payload['project'], payload['query'])
    if action in ('files', 'file-preview'):
        from insights import files, file_preview
        return (files if action == 'files' else file_preview)(payload['project'], payload.get('path', ''))
    if action == 'observation':
        from observation import snapshot
        return snapshot(payload['source'], payload['provider'], payload.get('since'), payload.get('until'), payload.get('expected'))
    if action == 'codex-runtime':
        from codex_runtime import snapshot
        return snapshot(payload['nativeId'])
    if action == 'quotas':
        from quotas import snapshot
        return snapshot(payload.get('sources', []))
    if action == 'document':
        return document(payload['project'], payload['path'])
    raise ValueError('Action inconnue')


if __name__ == '__main__':
    try:
        request = sys.stdin.read(1024 * 1024 + 1) if sys.argv[1] == '--stdin' else sys.argv[1]
        if len(request) > 1024 * 1024:
            raise ValueError('Requête trop volumineuse.')
        print(json.dumps({'result': dispatch(json.loads(request))}, ensure_ascii=False))
    except Exception as error:
        print(json.dumps({'error': str(error)}, ensure_ascii=False))
        sys.exit(1)

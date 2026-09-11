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
        result = subprocess.run(['git', '--no-pager', '-C', str(root), *args],
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
            content = read_text(folder / 'README.md')
            title = re.search(r'^#\s+(.+)', content, re.M)
            marker = re.search(r'<!--\s*release\s+([^>]+?)\s*-->', content, re.I)
            status = (marker[1].strip().lower() if marker else 'inconnue')
            result.append({'id': folder.name, 'title': title[1] if title else folder.name,
                           'status': status, 'hasPlan': (folder / 'plan.json').is_file(),
                           'hasEffort': (folder / 'effort.json').is_file()})
        except (OSError, ValueError):
            result.append({'id': folder.name, 'title': folder.name, 'status': 'illisible'})
    return result


def plan_tasks(root, release):
    folder = inside(root, root / 'changelog' / release)
    if not (folder / 'plan.json').is_file():
        return [], []
    plan = read_json(folder / 'plan.json')
    if plan.get('schema') != 1 or not isinstance(plan.get('tasks'), list):
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
        result.append({k: task.get(k) for k in ('id', 'title', 'depends_on', 'acceptance', 'scopes', 'risk', 'route', 'request')} | {
            'status': state, 'reason': reason, 'flow': attempts[-1].get('flow') if attempts else None,
            'receiptAt': (task.get('receipt') or {}).get('at'),
        })
    return result, warnings


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
    result = {'id': path.stem, 'path': str(path.relative_to(root)), 'status': summary.get('status', data.get('status')),
              'updatedAt': data.get('updated_at'), 'warning': warning, 'nodes': [],
              'events': events[-80:], 'ready': ready, 'edges': graph.get('edges', [])}
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


def effort_details(folder):
    if not (folder / 'effort.json').is_file():
        return None
    try:
        data = read_json(folder / 'effort.json')
        # report_data computes the current report in memory; report() writes files.
        return trusted_module('odoo_effort').report_data(folder, data)
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
    tasks, warnings = [], []
    if current:
        try:
            tasks, warnings = plan_tasks(root, current['id'])
        except Exception as exc:
            warnings.append(str(exc))
    attention = [t for t in tasks if t['status'] in ('stale', 'blocked', 'interrupted', 'awaiting_receipt')]
    for relative, unassigned in related_flows(root, current['id'] if current else None):
        if not unassigned:
            continue
        try:
            flow = flow_details(root, relative)
            if flow['status'] in ('waiting_human', 'deadlocked', 'blocked'):
                attention.append({'id': 'flow:' + flow['id'], 'title': 'Workflow du projet : ' + flow['id'],
                                  'status': flow['status'], 'reason': '; '.join(n['description'] for n in flow['nodes'] if n['status'] == 'ready') or 'Aucune étape prête'})
        except Exception as exc:
            warnings.append(Path(relative).name + ' : ' + str(exc))
    return {'path': str(root), 'name': root.name, 'series': project_series(root),
            'release': current, 'releases': rels, 'attention': attention,
            'running': sum(t['status'] == 'running' for t in tasks), 'warnings': warnings}


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


def project(root, release=None, source_root=None):
    root = Path(root).resolve()
    data = summary(root)
    chosen = release or (data['release']['id'] if data['release'] else None)
    if chosen and chosen not in {r['id'] for r in data['releases']}:
        raise ValueError('Release inconnue')
    data.update({'selectedRelease': chosen, 'branch': git(root, 'branch', '--show-current'),
                 'gitChanges': len(git(root, 'status', '--porcelain', '-uno').splitlines()),
                 'environments': [], 'tasks': [], 'flows': [], 'effort': None,
                 'documents': [], 'inbox': []})
    try:
        data['environments'] = environments(root)
    except (OSError, ValueError, AttributeError) as exc:
        data['warnings'].append('Environnements : ' + str(exc))
    data['sources'] = source_details(root, data['series'], data['environments'], source_root)
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
                data['warnings'].append(Path(relative).name + ' : ' + str(exc))
        data['documents'] = [{'name': p.name, 'path': str(p.relative_to(root)), 'type': p.suffix[1:]}
                             for p in sorted(folder.iterdir())
                             if p.is_file() and p.suffix.lower() in ('.md', '.pdf', '.txt')]
    if not chosen:
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
        return project(payload['project'], payload.get('release'), payload.get('sourceRoot'))
    if action == 'document':
        return document(payload['project'], payload['path'])
    raise ValueError('Action inconnue')


if __name__ == '__main__':
    try:
        print(json.dumps({'result': dispatch(json.loads(sys.argv[1]))}, ensure_ascii=False))
    except Exception as error:
        print(json.dumps({'error': str(error)}, ensure_ascii=False))
        sys.exit(1)

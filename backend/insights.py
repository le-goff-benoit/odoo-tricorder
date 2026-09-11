"""Read-only source/dependency inventory and bounded document search."""
import ast
import base64
from datetime import datetime, timezone
from pathlib import Path
import re
import shutil

from catalog import git, inside, read_text


def revision(root, series, expected=None):
    branch = git(root, 'branch', '--show-current')
    commit = git(root, 'rev-parse', '--verify', 'HEAD')
    wanted = re.sub(r'^saas[~\-]', '', series or '')
    if wanted and not wanted.endswith('.0'):
        wanted = 'saas-' + wanted
    return {'branch': branch or None, 'commit': commit or None, 'expectedBranch': wanted or None,
            'branchMatches': branch == wanted if branch and wanted else None,
            'expectedCommit': expected or None,
            'commitMatches': commit == expected if commit and expected else None}


def manifests(base, depth=1):
    if not base.is_dir():
        return []
    found = []
    if (base / '__manifest__.py').is_file():
        found.append(base / '__manifest__.py')
    for pattern in ['*/__manifest__.py', '*/*/__manifest__.py'][:depth]:
        found.extend(p for p in base.glob(pattern) if p.resolve().is_relative_to(base.resolve()))
    return sorted(set(found))[:6000]


def dependencies(root, libraries, oca_roots):
    index, warnings, duplicates = {}, [], set()
    groups = [('custom', manifests(root))]
    for library in libraries:
        if library.get('path') and library['present']:
            base = Path(library['path'])
            files = manifests(base) + manifests(base / 'addons') + manifests(base / 'odoo/addons')
            groups.append((library['kind'].lower(), files))
    for base in oca_roots:
        groups.append(('oca', manifests(Path(base), 2)))
    for kind, files in groups:
        for path in dict.fromkeys(files):
            name = path.parent.name
            if name in index and index[name][1] != path:
                duplicates.add(name)
            else:
                index[name] = (kind, path)
    visited, result = set(), []

    def visit(name, required_by):
        if name in visited:
            return
        visited.add(name)
        if len(visited) > 6000:
            warnings.append('Limite de dépendances atteinte ; inventaire incomplet.')
            return
        if name not in index:
            result.append({'name': name, 'kind': 'unresolved', 'requiredBy': required_by})
            return
        kind, path = index[name]
        result.append({'name': name, 'kind': kind, 'requiredBy': required_by, 'path': str(path.parent)})
        try:
            data = ast.literal_eval(read_text(path, 128000))
            deps = data.get('depends', [])
            if not isinstance(deps, list) or any(not isinstance(d, str) or not re.fullmatch(r'\w+', d) for d in deps):
                raise ValueError()
            for dep in deps:
                visit(dep, name)
        except (ValueError, SyntaxError, OSError, AttributeError, RecursionError):
            warnings.append('Manifest non analysable : ' + name)

    for name, (kind, _) in list(index.items()):
        if kind == 'custom':
            visit(name, 'projet')
    if duplicates:
        warnings.append('Modules homonymes ; ordre addons_path à vérifier : ' + ', '.join(sorted(duplicates)))
    missing = [r['name'] for r in result if r['kind'] == 'unresolved']
    return {'modules': result, 'warnings': warnings, 'complete': not missing and not warnings,
            'enterprise': [r['name'] for r in result if r['kind'] == 'enterprise'],
            'oca': [r['name'] for r in result if r['kind'] == 'oca'], 'unresolved': missing}


def enrich(root, sources, profile):
    profile = profile or {}
    if profile.get('kind') in ('module', 'studio', 'online'):
        sources.update(profile=profile['kind'], inferred=False)
        if profile['kind'] == 'online':
            sources['explanation'] = 'Sources de référence uniquement. Configuration Studio ; pas de module Python sur Online.'
        elif profile['kind'] == 'studio':
            sources['explanation'] = 'Sources pour analyser le standard ; configuration et pack Studio sur copie locale.'
        else:
            sources['explanation'] = 'Sources exactes et stack locale pour les modules.'
    for row in sources['libraries']:
        override = profile.get(row['kind'].lower() + 'Root')
        if override:
            row['path'], row['present'] = override, Path(override).is_dir()
        row['required'] = row['kind'] == 'Community' and sources['profile'] == 'module'
        row['revision'] = revision(row['path'], sources['series'], profile.get(row['kind'].lower() + 'Commit')) if row['present'] else {}
    sources['dependencies'] = dependencies(root, sources['libraries'], profile.get('ocaRoots', []))
    mismatched = [r['kind'] for r in sources['libraries'] if r.get('revision', {}).get('branchMatches') is False or r.get('revision', {}).get('commitMatches') is False]
    if mismatched:
        sources['dependencies']['warnings'].append('Révision des sources à vérifier : ' + ', '.join(mismatched))
        sources['dependencies']['complete'] = False
    dep = sources['dependencies']
    sources['enterpriseRequirement'] = ('Requis par : ' + ', '.join(dep['enterprise']) if dep['enterprise'] else
                                        'Aucune dépendance Enterprise trouvée' if dep['complete'] else 'Indéterminé : inventaire incomplet')
    sources['ocaLibraries'] = [{'path': p, **revision(p, sources['series'])} for p in profile.get('ocaRoots', [])]
    return sources


def stack(root, profile):
    base = Path(profile.get('stackRoot') or root)
    names = ['compose.yml', 'compose.yaml', 'docker-compose.yml', 'docker-compose.yaml',
             'Dockerfile', '.venv/bin/python', 'venv/bin/python', 'odoo-bin', 'requirements.txt']
    files = [{'name': name, 'present': (base / name).is_file()} for name in names]
    restored = profile.get('restoredAt')
    age = None
    if restored:
        try:
            age = max(0, (datetime.now(timezone.utc) - datetime.fromisoformat(restored.replace('Z', '+00:00'))).total_seconds() / 86400)
        except ValueError:
            pass
    return {'root': str(base), 'files': files,
            'tools': [{'name': name, 'installed': bool(shutil.which(name))} for name in ('python3', 'docker', 'psql', 'git')],
            'restoredAt': restored, 'ageDays': age, 'basis': 'Déclaration utilisateur ; aucune connexion à une base.',
            'services': 'État des services non sondé'}


def search(root, query):
    query = str(query).strip()
    if len(query) < 2 or len(query) > 200:
        raise ValueError('Recherche : entre 2 et 200 caractères')
    root = Path(root).resolve()
    paths = [root / '.odoo-agents/PROJECT.md', root / '.odoo-agents/JOURNAL.md']
    paths += sorted((root / 'changelog').glob('**/*.md'))[:1000]
    paths += sorted((root / 'changelog').glob('**/*.txt'))[:1000]
    result, skipped, scanned = [], 0, 0
    for candidate in paths:
        if not candidate.is_file():
            continue
        try:
            path = inside(root, candidate)
            if candidate.is_symlink():
                raise ValueError()
            content = read_text(path, 512000)
            scanned += 1
            for i, line in enumerate(content.splitlines(), 1):
                if query.casefold() in line.casefold():
                    result.append({'path': str(path.relative_to(root)), 'line': i, 'excerpt': line[:300]})
                    if len(result) >= 100:
                        return {'results': result, 'truncated': True, 'skipped': skipped, 'scanned': scanned}
        except (ValueError, OSError):
            skipped += 1
    return {'results': result, 'truncated': len(paths) >= 2002, 'skipped': skipped, 'scanned': scanned}


TEXT_EXTENSIONS = {'.md', '.txt', '.py', '.xml', '.js', '.cjs', '.mjs', '.css', '.scss', '.html', '.csv', '.rst', '.eml'}
JSON_NAMES = {'plan.json', 'effort.json', 'package.json'}


def explorer_path(root, relative):
    root = Path(root).resolve()
    candidate = root / relative
    path = inside(root, candidate)
    parts = path.relative_to(root).parts
    if any(part.startswith('.') and part != '.odoo-agents' or part in ('node_modules', 'filestore', '__pycache__') for part in parts):
        raise ValueError('Dossier technique ou privé masqué')
    if any(re.search(r'(?:secret|credential|password|passwd|api[_-]?key|token|^auth[.])', part, re.I) for part in parts):
        raise ValueError('Fichier sensible masqué')
    return path


def files(root, relative=''):
    root = Path(root).resolve()
    folder = explorer_path(root, relative)
    if not folder.is_dir():
        raise ValueError('Dossier absent')
    entries = []
    for p in sorted(folder.iterdir(), key=lambda p: (not p.is_dir(), p.name.casefold())):
        try:
            explorer_path(root, p.relative_to(root))
            if p.is_symlink():
                continue
            stat = p.stat()
            entries.append({'name': p.name, 'path': str(p.relative_to(root)), 'directory': p.is_dir(),
                            'bytes': stat.st_size, 'modified': datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
                            'readable': p.is_dir() or p.suffix in TEXT_EXTENSIONS or p.name in JSON_NAMES or p.suffix in ('.png', '.jpg', '.jpeg', '.pdf')})
        except (ValueError, OSError):
            continue
    return {'path': str(folder.relative_to(root)), 'entries': entries[:500], 'truncated': len(entries) > 500}


def file_preview(root, relative):
    path = explorer_path(root, relative)
    if not path.is_file():
        raise ValueError('Fichier absent')
    if path.suffix in TEXT_EXTENSIONS or path.name in JSON_NAMES:
        return {'name': path.name, 'type': 'text', 'text': read_text(path, 512000)}
    if path.suffix in ('.png', '.jpg', '.jpeg') and path.stat().st_size <= 4 * 1024 * 1024:
        mime = 'image/png' if path.suffix == '.png' else 'image/jpeg'
        return {'name': path.name, 'type': 'image', 'url': 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii')}
    if path.suffix == '.pdf':
        return {'name': path.name, 'type': 'pdf', 'path': str(path)}
    raise ValueError('Aperçu indisponible pour ce type de fichier ; aucun programme n’est exécuté')

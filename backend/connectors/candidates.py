"""Isolated code proposals and explicit, conflict-checked local application."""
import difflib
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

from workflow_engine.contracts import require
from workflow_engine.projects import git_environment, repository

MAX_BYTES = 2_000_000
DENIED = {'.git', '.tricorder', '.odoo-agents', '.codex', '.claude', 'node_modules', '__pycache__', '.venv', 'venv'}


def safe_path(root, relative):
    path = Path(relative)
    require(not path.is_absolute() and path.parts and '..' not in path.parts and not any(p in DENIED for p in path.parts), 'Chemin de candidat interdit')
    require(not any(p.startswith('.env') or p.lower() in {'auth.json', 'credentials.json'} or p.endswith(('.pem', '.key')) for p in path.parts), 'Fichier sensible exclu du candidat')
    result = root / path
    require(result.resolve().is_relative_to(root.resolve()) and not result.is_symlink(), 'Lien ou chemin hors du candidat')
    for parent in result.parents:
        if parent == root:
            break
        require(not parent.is_symlink(), 'Dossier lié interdit dans un candidat')
    return result


def snapshot(project, target):
    root = Path(repository(project['path']))
    result = subprocess.run(['git', '-c', 'core.fsmonitor=false', '-C', str(root), 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
                            env=git_environment(), capture_output=True, check=True, timeout=10)
    require(len(result.stdout) <= MAX_BYTES, 'Inventaire du projet trop volumineux')
    names = sorted(set(result.stdout.decode().split('\0')) - {''})
    require(len(names) <= 10000, 'Projet trop volumineux pour une proposition isolée')
    target.mkdir(parents=True)
    files, total = {}, 0
    for name in names:
        if any(part in DENIED or part.startswith('.env') or part.lower() in {'auth.json','credentials.json'} or part.endswith(('.pem','.key')) for part in Path(name).parts):
            continue
        path = safe_path(root, name)
        if not path.exists():
            continue
        require(path.is_file(), 'Source non régulière')
        total += path.stat().st_size
        require(total <= 20_000_000, 'Copie de travail limitée à 20 Mo')
        content = path.read_bytes()
        files[name] = {'sha256': hashlib.sha256(content).hexdigest(), 'mode': path.stat().st_mode & 0o777}
        destination = safe_path(target, name)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
        destination.chmod(files[name]['mode'])
    return files


def prepare(engine, run, job):
    require(run['scope']['kind'] == 'project', 'L’édition de code nécessite un projet Git')
    base, workspace = Path(job)/'base', Path(job)/'workspace'
    files = snapshot(engine.project(run['project']), base)
    shutil.copytree(base, workspace)
    # Native file tools only see this copy. Baseline and runtime state live outside.
    excerpts, budget = {}, 70000
    for name in files:
        content = (base/name).read_bytes()
        if len(content) <= min(budget, 16000):
            try:
                excerpts[name] = content.decode()
                budget -= len(content)
            except UnicodeError:
                pass
    return {'base': base, 'workspace': workspace, 'files': files, 'context': {'files': list(files), 'contents': excerpts}}


def capture(engine, run, prepared):
    base, workspace = prepared['base'], prepared['workspace']
    paths = set(prepared['files'])
    for path in workspace.rglob('*'):
        require(not path.is_symlink(), 'Un candidat ne peut pas créer de lien symbolique')
        if path.is_file():
            relative = str(path.relative_to(workspace))
            safe_path(workspace, relative)
            paths.add(relative)
    require(len(paths) <= 10000, 'Trop de fichiers dans le candidat')
    changes, diff = [], []
    for name in sorted(paths):
        before_path, after_path = safe_path(base, name), safe_path(workspace, name)
        before = before_path.read_bytes() if before_path.exists() else None
        if after_path.exists():
            require(after_path.is_file() and after_path.stat().st_size <= MAX_BYTES, 'Fichier modifié trop volumineux ou non régulier')
        after = after_path.read_bytes() if after_path.exists() else None
        if before == after:
            continue
        try:
            text = after.decode() if after is not None else None
            old_text = before.decode() if before is not None else ''
        except UnicodeError:
            raise ValueError('Les propositions de cette version sont limitées aux fichiers texte') from None
        changes.append({'path': name, 'before': hashlib.sha256(before).hexdigest() if before is not None else None, 'content': text})
        diff.extend(difflib.unified_diff(old_text.splitlines(keepends=True), (text or '').splitlines(keepends=True), fromfile='a/'+name, tofile='b/'+name))
    require(changes, 'Le modèle n’a produit aucune modification de fichier')
    require(len(changes) <= 100, '100 fichiers modifiés maximum')
    candidate = {'schema': 1, 'project': run['project'], 'source_run': run['id'], 'files': prepared['files'], 'changes': changes}
    reference = engine.artifact(json.dumps(candidate, ensure_ascii=False).encode())
    patch = engine.artifact(''.join(diff).encode())
    return reference, patch


def load(engine, reference, project):
    candidate = json.loads(engine.evidence(reference))
    require(candidate.get('schema') == 1 and candidate.get('project') == project, 'Candidat d’un autre projet')
    require(isinstance(candidate.get('changes'), list) and 0 < len(candidate['changes']) <= 100, 'Candidat invalide')
    root = Path(engine.project(project)['path'])
    for change in candidate['changes']:
        safe_path(root, change['path'])
        require(change['content'] is None or isinstance(change['content'], str), 'Contenu de candidat invalide')
    return candidate


def materialize(engine, reference, project, target):
    candidate = load(engine, reference, project)
    files = snapshot(engine.project(project), target)
    require(files == candidate['files'], 'Les sources ont changé depuis la proposition : générer un nouveau candidat')
    for change in candidate['changes']:
        path = safe_path(target, change['path'])
        if change['content'] is None:
            path.unlink()
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(change['content'])
    return target


def _write(path, value, mode=0o644):
    if value is None:
        path.unlink(missing_ok=True)
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='.tricorder-apply-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(value)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(name, mode)
        os.replace(name, path)
    finally:
        Path(name).unlink(missing_ok=True)


def _recover(engine, journal):
    if not journal.exists():
        return
    entry = json.loads(journal.read_text())
    run = engine.run(entry['run'])
    if run['nodes'][entry['node']].get('applied_candidate') == entry['candidate']:
        journal.unlink()
        return
    root = Path(repository(engine.project(run['project'])['path']))
    # A crash can leave some files applied. Never overwrite a later user edit.
    for item in entry['files']:
        path = safe_path(root, item['path'])
        value = path.read_bytes() if path.exists() else None
        current = hashlib.sha256(value).hexdigest() if value is not None else None
        require(current in {item['before_hash'], item['after_hash']},
                'Application interrompue et fichier modifié : examiner '+str(journal))
    for item in entry['files']:
        value = engine.evidence(item['original']) if item['original'] else None
        _write(safe_path(root, item['path']), value, item['mode'])
    journal.unlink()


def require_checks(run, node_id, reference, engine=None):
    definition = next(n for n in run['definition']['nodes'] if n['id'] == node_id)
    require(run.get('completion_outcome') not in {'rejected', 'blocked'}, 'Exécution refusée ou non résolue : application interdite')
    # Existing graphs acquire conservative downstream gates; an explicit
    # application_requires contract can add controls outside that path.
    descendants = set()
    frontier = [node_id]
    while frontier:
        source = frontier.pop()
        for edge in run['definition']['edges']:
            if edge['from'] == source and edge['to'] not in descendants:
                descendants.add(edge['to']); frontier.append(edge['to'])
    required = set(definition.get('application_requires', []))
    require(required <= set(run['nodes']), 'Contrôle préalable au candidat inconnu')
    controls = []
    qa = []
    for other in run['definition']['nodes']:
        tested = run['nodes'][other['id']]
        explicit = other['id'] in required
        if tested['status'] == 'skipped' and not explicit:
            continue
        decision = other['kind'] in {'decision', 'review'}
        check = other.get('candidate_check') is True
        relevant = other['id'] in descendants or tested.get('inputs', {}).get('candidate') == reference
        if not (explicit or (relevant and (decision or check))):
            continue
        require(decision or check, 'Le contrôle obligatoire doit être une QA du candidat ou une décision : ' + other['title'])
        controls.append(other)
        require(tested['status'] == 'accepted', 'Les tests liés à ce candidat et décisions doivent être reçus avant application : ' + other['title'])
        if decision:
            require(tested.get('decision', {}).get('outcome') == 'approve', 'Décision d’application non approuvée : ' + other['title'])
        else:
            result = tested.get('result') or {}
            verdict = result.get('outputs', {}).get('verdict') if isinstance(result.get('outputs'), dict) else None
            passed = type(result.get('exit_code')) is int and result['exit_code'] == 0 if other['kind'] == 'command' else verdict == 'pass'
            require(tested.get('inputs', {}).get('candidate') == reference and result.get('ok') is True
                    and tested.get('outcome') in {'done', 'pass'} and passed and bool(result.get('evidence')),
                    'La QA doit vérifier le candidat exact avec verdict pass (ou commande réussie) et preuves : ' + other['title'])
            qa.append(other)
    if engine:
        for control in controls:
            for proof in run['nodes'][control['id']].get('result', {}).get('evidence', []):
                engine.evidence(proof)
    require(qa, 'Aucun contrôle QA explicite du candidat : activer « Contrôle QA du candidat » sur un bloc de travail ou commande, puis lancer une nouvelle exécution. Les résultats historiques restent conservés.')


def apply(engine, run_id, node_id, expected, *, human=False):
    require(human, 'Application du code réservée à la confirmation humaine')
    import fcntl
    lock = engine.store.directory / 'candidate-application.lock'
    journal = engine.store.directory / 'candidate-application.json'
    with lock.open('a') as stream:
        fcntl.flock(stream, fcntl.LOCK_EX)
        _recover(engine, journal)
        try:
            with engine.store.transaction() as db:
                run = engine.run(run_id, db)
                state = run['nodes'][node_id]
                definition = next(n for n in run['definition']['nodes'] if n['id'] == node_id)
                require(definition.get('execution_mode') == 'edit', 'Ce bloc ne produit pas de candidat de code')
                require(not run['simulation'] and run['status'] != 'cancelled' and state['status'] == 'accepted', 'Valider le résultat réel avant application')
                reference = state['result']['outputs']['candidate']
                require(expected == reference['sha256'], 'Le candidat a changé depuis sa présentation')
                require(not state.get('applied_candidate'), 'Candidat déjà appliqué')
                candidate = load(engine, reference, run['project'])
                require(candidate.get('source_run') == run_id, 'Candidat d’une autre exécution')
                require_checks(run, node_id, reference, engine)
                project = engine.project(run['project'], db)
                root = Path(repository(project['path']))
                with tempfile.TemporaryDirectory(dir=engine.store.directory) as temp:
                    current = snapshot(project, Path(temp)/'source')
                require(current == candidate['files'], 'Conflit : les sources ont changé, aucun fichier appliqué')
                entries = []
                for change in candidate['changes']:
                    path = safe_path(root, change['path'])
                    value = path.read_bytes() if path.exists() else None
                    content = change['content'].encode() if change['content'] is not None else None
                    entries.append({'path': change['path'], 'original': engine.artifact(value) if value is not None else None,
                                    'mode': path.stat().st_mode & 0o777 if value is not None else 0o644,
                                    'before_hash': change['before'], 'after_hash': hashlib.sha256(content).hexdigest() if content is not None else None})
                _write(journal, json.dumps({'run': run_id, 'node': node_id, 'candidate': expected, 'files': entries}).encode(), 0o600)
                for change, entry in zip(candidate['changes'], entries):
                    _write(safe_path(root, change['path']), change['content'].encode() if change['content'] is not None else None, entry['mode'])
                state['applied_candidate'] = expected
                engine._event(db, run, 'candidate-applied', node_id, candidate=expected, paths=[c['path'] for c in candidate['changes']])
                engine._save(db, run)
        except BaseException:
            _recover(engine, journal)
            raise
        journal.unlink(missing_ok=True)
    return run

"""Isolated code proposals and explicit, conflict-checked local application."""
import difflib
import errno
import hashlib
import json
import os
from pathlib import Path
import shutil
import uuid

from workflow_engine.contracts import ContractError, require
from workflow_engine.projects import repository
from .candidate_sources import DENIED, safe_path, snapshot, streamed_file, regular_file, parent_directory, signature, size_text

MAX_BYTES = 2_000_000


def prepare(engine, run, job):
    require(run['scope']['kind'] == 'project', 'L’édition de code nécessite un projet Git')
    base, workspace = Path(job)/'base', Path(job)/'workspace'
    require(not base.exists() and not base.is_symlink() and not workspace.exists() and not workspace.is_symlink(),
            'Le dossier de cette tentative contient déjà une copie. Reprenez le bloc avec une nouvelle tentative ; aucune copie existante n’a été supprimée.')
    files = snapshot(engine.project(run['project']), base, copies=2)
    try:
        # copytree may use the kernel's streaming copy, but never shares inodes
        # with the original or baseline (no hard links).
        shutil.copytree(base, workspace)
    except BaseException as error:
        if workspace.exists():
            shutil.rmtree(workspace)
        shutil.rmtree(base)
        if isinstance(error, OSError) and error.errno == errno.ENOSPC:
            raise ContractError('Le disque est plein pendant la copie de travail. Libérez de l’espace puis reprenez ce bloc ; le dépôt original reste intact.') from None
        if isinstance(error, shutil.Error):
            raise ContractError('La copie de travail n’a pas pu être terminée. Vérifiez l’espace disque et les droits du dossier de Tricorder, puis reprenez ce bloc ; les copies partielles ont été supprimées et le dépôt reste intact.') from None
        raise
    # Native file tools only see this copy. Baseline and runtime state live outside.
    excerpts, listed, total, budget, listing_budget = {}, [], 0, 60_000, 12_000
    for name in files:
        size = (base/name).stat().st_size
        total += size
        encoded_name = len(json.dumps(name, ensure_ascii=False).encode()) + 2
        if encoded_name <= listing_budget:
            listed.append(name)
            listing_budget -= encoded_name
        if size <= min(budget, 16000):
            content = (base/name).read_bytes()
            try:
                text = content.decode()
                if '\0' in text:
                    continue
                cost = len(json.dumps({name: text}, ensure_ascii=False).encode()) + 2
                if cost <= budget:
                    excerpts[name] = text
                    budget -= cost
            except UnicodeError:
                pass
    context = {'files': listed, 'file_count': len(files), 'omitted_files': len(files)-len(listed), 'source_bytes': total, 'contents': excerpts,
               'scope': 'Copie des fichiers Git suivis et des fichiers non ignorés, y compris historiques et pièces. Fichiers sensibles connus, dépendances et dossiers internes exclus. '
                        'La liste et les extraits ci-dessus sont bornés ; utilisez Glob, Read ou Grep dans la copie pour consulter les autres fichiers. '
                        'Seules les modifications de fichiers texte de 2 Mo maximum sont prises en charge ; les gros fichiers inchangés sont conservés.'}
    return {'base': base, 'workspace': workspace, 'files': files, 'context': context}


def changed_content(root, name, expected_hash):
    try:
        with regular_file(root, name) as stream:
            before = os.fstat(stream.fileno())
            require(before.st_size <= MAX_BYTES,
                    f'Modification trop volumineuse : {name} ({size_text(before.st_size)}). '
                    'Seuls les fichiers texte modifiés de 2 Mo maximum sont acceptés. Conservez cette pièce inchangée ou traitez sa modification séparément.')
            content = stream.read(MAX_BYTES + 1)
            require(len(content) <= MAX_BYTES and signature(before) == signature(os.fstat(stream.fileno())),
                    'Le candidat a changé pendant sa lecture : ' + name)
    except FileNotFoundError:
        content = None
    require((hashlib.sha256(content).hexdigest() if content is not None else None) == expected_hash,
            'Copie de référence ou candidat modifié pendant la lecture : ' + name)
    return content


def capture(engine, run, prepared):
    base, workspace = prepared['base'], prepared['workspace']
    paths = set(prepared['files'])
    for path in workspace.rglob('*'):
        require(not path.is_symlink(), 'Un candidat ne peut pas créer de lien symbolique')
        safe_path(workspace, str(path.relative_to(workspace)))
        require(path.is_file() or path.is_dir(), 'Un candidat ne peut pas créer de fichier spécial')
        if path.is_file():
            relative = str(path.relative_to(workspace))
            paths.add(relative)
    require(len(paths) <= 10000, 'Trop de fichiers dans le candidat')
    candidate = {'schema': 1, 'project': run['project'], 'source_run': run['id'], 'files': prepared['files'], 'changes': []}
    candidate_bytes = len(json.dumps(candidate, ensure_ascii=False).encode())
    changes, diff, diff_bytes = candidate['changes'], [], 0
    for name in sorted(paths):
        after_path = safe_path(workspace, name)
        original = prepared['files'].get(name)
        after_hash = None
        if after_path.exists():
            after_hash, info = streamed_file(workspace, name)
            require(info.st_nlink == 1, 'Un candidat ne peut pas contenir de lien physique : ' + name)
            require(not original or info.st_mode & 0o777 == original['mode'],
                    f'Permissions modifiées : {name}. Rétablissez les permissions initiales ; ce candidat porte uniquement sur le contenu texte.')
        if original and after_hash == original['sha256']:
            continue
        before = changed_content(base, name, original['sha256'] if original else None)
        after = changed_content(workspace, name, after_hash)
        try:
            text = after.decode() if after is not None else None
            old_text = before.decode() if before is not None else ''
            require('\0' not in (text or '') and '\0' not in old_text,
                    f'Fichier binaire modifié : {name}. Conservez cette pièce inchangée ou traitez sa modification séparément ; les candidats prennent en charge le code et les documents texte.')
        except UnicodeError:
            raise ContractError(f'Fichier binaire modifié : {name}. Conservez cette pièce inchangée ou traitez sa modification séparément ; les candidats prennent en charge le code et les documents texte.') from None
        change = {'path': name, 'before': hashlib.sha256(before).hexdigest() if before is not None else None, 'content': text}
        candidate_bytes += len(json.dumps(change, ensure_ascii=False).encode()) + 2
        require(candidate_bytes <= MAX_BYTES, 'Proposition et inventaire supérieurs à 2 Mo. Divisez les modifications en plusieurs candidats ; aucune preuve n’a été tronquée.')
        changes.append(change)
        require(len(changes) <= 100, '100 fichiers modifiés maximum. Divisez la modification en plusieurs candidats.')
        for line in difflib.unified_diff(old_text.splitlines(keepends=True), (text or '').splitlines(keepends=True), fromfile='a/'+name, tofile='b/'+name):
            diff_bytes += len(line.encode())
            require(diff_bytes <= MAX_BYTES, 'Diff supérieur à 2 Mo. Divisez la modification en plusieurs candidats ; aucune preuve n’a été tronquée.')
            diff.append(line)
    require(changes, 'Le modèle n’a produit aucune modification de fichier')
    encoded = json.dumps(candidate, ensure_ascii=False).encode()
    require(len(encoded) <= MAX_BYTES,
            f'Proposition et inventaire : {size_text(len(encoded))}, limite de preuve 2 Mo. Divisez les modifications ou réduisez les fichiers générés du dépôt ; aucune preuve n’a été tronquée.')
    reference = engine.artifact(encoded)
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
    # snapshot only returns after creating a new target. Never clean a path
    # that already existed when this attempt started.
    try:
        require(files == candidate['files'], 'Les sources ont changé depuis la proposition : générer un nouveau candidat')
        for change in candidate['changes']:
            path = safe_path(target, change['path'])
            _write(path, change['content'].encode() if change['content'] is not None else None,
                   candidate['files'].get(change['path'], {}).get('mode', 0o644), root=target)
    except BaseException as error:
        shutil.rmtree(target)
        if isinstance(error, OSError) and error.errno == errno.ENOSPC:
            raise ContractError('Le disque est plein pendant la préparation du candidat pour la QA. La copie partielle a été supprimée ; libérez de l’espace puis reprenez ce bloc. Le dépôt original reste intact.') from None
        raise
    return target


def _write(path, value, mode=0o644, *, root=None):
    root = Path(root) if root is not None else path.parent
    relative = path.relative_to(root)
    safe_path(root, str(relative))
    if value is None and not path.exists():
        return
    with parent_directory(root, relative.parts[:-1], create=value is not None) as directory:
        if value is None:
            try:
                os.unlink(relative.name, dir_fd=directory)
            except FileNotFoundError:
                pass
            return
        name = '.tricorder-apply-' + uuid.uuid4().hex
        fd = os.open(name, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, mode, dir_fd=directory)
        try:
            with os.fdopen(fd, 'wb') as stream:
                stream.write(value)
                stream.flush()
                os.fchmod(stream.fileno(), mode)
                os.fsync(stream.fileno())
            os.replace(name, relative.name, src_dir_fd=directory, dst_dir_fd=directory)
        finally:
            try:
                os.unlink(name, dir_fd=directory)
            except FileNotFoundError:
                pass


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
        try:
            with regular_file(root, item['path']) as source:
                value = source.read(MAX_BYTES + 1)
        except FileNotFoundError:
            value = None
        require(value is None or len(value) <= MAX_BYTES, 'Fichier modifié après interruption : examiner ' + str(journal))
        current = hashlib.sha256(value).hexdigest() if value is not None else None
        require(current in {item['before_hash'], item['after_hash']},
                'Application interrompue et fichier modifié : examiner '+str(journal))
    for item in entry['files']:
        value = engine.evidence(item['original']) if item['original'] else None
        _write(safe_path(root, item['path']), value, item['mode'], root=root)
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
                current = snapshot(project)
                require(current == candidate['files'], 'Conflit : les sources ont changé, aucun fichier appliqué')
                entries = []
                for change in candidate['changes']:
                    path = safe_path(root, change['path'])
                    value = changed_content(root, change['path'], change['before'])
                    content = change['content'].encode() if change['content'] is not None else None
                    entries.append({'path': change['path'], 'original': engine.artifact(value) if value is not None else None,
                                    'mode': path.stat().st_mode & 0o777 if value is not None else 0o644,
                                    'before_hash': change['before'], 'after_hash': hashlib.sha256(content).hexdigest() if content is not None else None})
                _write(journal, json.dumps({'run': run_id, 'node': node_id, 'candidate': expected, 'files': entries}).encode(), 0o600)
                for change, entry in zip(candidate['changes'], entries):
                    # Recheck this file immediately before the atomic write;
                    # source edits since the global fingerprint remain conflicts.
                    changed_content(root, change['path'], change['before'])
                    _write(safe_path(root, change['path']), change['content'].encode() if change['content'] is not None else None, entry['mode'], root=root)
                state['applied_candidate'] = expected
                engine._event(db, run, 'candidate-applied', node_id, candidate=expected, paths=[c['path'] for c in candidate['changes']])
                engine._save(db, run)
        except BaseException:
            _recover(engine, journal)
            raise
        journal.unlink(missing_ok=True)
    return run

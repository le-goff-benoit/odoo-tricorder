"""Bounded inventories and streaming copies of a Git working tree, never links."""
from contextlib import contextmanager
import errno
import hashlib
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile

from workflow_engine.contracts import ContractError, require
from workflow_engine.projects import git_environment, repository

CHUNK_BYTES = 1024 * 1024
MAX_INVENTORY_BYTES = 2_000_000
MAX_FILES = 10_000
DISK_RESERVE = 64 * 1024 * 1024
DENIED = {'.git', '.tricorder', '.odoo-agents', '.codex', '.claude', 'node_modules', '__pycache__', '.venv', 'venv'}


def excluded(relative):
    return any(p in DENIED or p.startswith('.env') or p.lower() in {'auth.json', 'credentials.json'}
               or p.lower().endswith(('.pem', '.key')) for p in Path(relative).parts)


def safe_path(root, relative):
    path = Path(relative)
    require(not path.is_absolute() and path.parts and '..' not in path.parts and not any(p in DENIED for p in path.parts), 'Chemin de candidat interdit')
    require(not excluded(relative), 'Fichier sensible exclu du candidat')
    result = root / path
    require(result.resolve().is_relative_to(root.resolve()) and not result.is_symlink(), 'Lien ou chemin hors du candidat')
    for parent in result.parents:
        if parent == root:
            break
        require(not parent.is_symlink(), 'Dossier lié interdit dans un candidat')
    return result


def signature(info):
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns, info.st_mode)


@contextmanager
def parent_directory(root, parts, *, create=False):
    """Hold directory descriptors so path swaps cannot redirect reads/writes."""
    directory = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for part in parts:
            if create:
                try:
                    os.mkdir(part, mode=0o755, dir_fd=directory)
                except FileExistsError:
                    pass
            child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=directory)
            os.close(directory)
            directory = child
        yield directory
    except OSError as error:
        if error.errno in {errno.ELOOP, errno.ENOTDIR}:
            raise ContractError('Lien interdit ou dossier remplacé. Stabilisez les sources puis reprenez le bloc.') from None
        raise
    finally:
        os.close(directory)


@contextmanager
def regular_file(root, name):
    """Walk every directory with O_NOFOLLOW, including during a rename race."""
    safe_path(root, name)
    parts = Path(name).parts
    with parent_directory(root, parts[:-1]) as directory:
        descriptor = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
        with os.fdopen(descriptor, 'rb') as stream:
            require(stat.S_ISREG(os.fstat(stream.fileno()).st_mode), f'Source non régulière : {name}. Retirez ce fichier du périmètre Git avant de reprendre.')
            yield stream


def inventory(project):
    root = Path(repository(project['path']))
    # Bound RAM even for an unexpectedly large Git inventory.
    with tempfile.TemporaryFile() as output:
        subprocess.run(['git', '-c', 'core.fsmonitor=false', '-C', str(root), 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
                       env=git_environment(), stdout=output, stderr=subprocess.PIPE, check=True, timeout=10)
        require(output.tell() <= MAX_INVENTORY_BYTES,
                'Inventaire Git supérieur à 2 Mo. Excluez les fichiers générés avec .gitignore, puis reprenez le bloc ; les fichiers suivis restent inclus.')
        output.seek(0)
        names = sorted(set(output.read().decode().split('\0')) - {''})
    files = {}
    for name in names:
        if excluded(name):
            continue
        try:
            with regular_file(root, name) as stream:
                files[name] = os.fstat(stream.fileno())
        except FileNotFoundError:
            continue  # Tracked deletions describe the current working tree.
        require(len(files) <= MAX_FILES,
                'Copie isolée limitée à 10 000 fichiers admissibles. Excluez les fichiers générés avec .gitignore ou séparez le dépôt, puis reprenez le bloc.')
    return root, files


def size_text(value):
    return f'{value / 1_000_000:.1f}'.replace('.', ',') + ' Mo'


def check_space(target, files, copies):
    total = sum(info.st_size for info in files.values())
    required = copies * (total + len(files) * 4096) + DISK_RESERVE
    existing = target.parent
    while not existing.exists():
        existing = existing.parent
    free = shutil.disk_usage(existing).free
    require(free >= required,
            f'Espace disque insuffisant pour la copie isolée : {size_text(total)} de sources, {copies} copie(s), '
            f'{size_text(required)} nécessaires avec réserve, {size_text(free)} disponibles. '
            'Libérez de l’espace sur le disque de Tricorder puis reprenez ce bloc. Les sources et pièces restent intactes.')


def streamed_file(root, name, *, destination=None, expected=None):
    """Return the digest and metadata without loading a file into RAM."""
    digest = hashlib.sha256()
    consumed = 0
    with regular_file(root, name) as source:
        before = os.fstat(source.fileno())
        require(expected is None or signature(before) == signature(expected),
                f'La source a changé pendant la copie : {name}. Terminez les modifications en cours puis reprenez le bloc.')
        target = destination.open('xb') if destination is not None else None
        try:
            while chunk := source.read(CHUNK_BYTES):
                consumed += len(chunk)
                require(consumed <= before.st_size,
                        f'La source a grandi pendant la lecture : {name}. Terminez les modifications en cours puis reprenez le bloc.')
                digest.update(chunk)
                if target is not None:
                    target.write(chunk)
        finally:
            if target is not None:
                target.close()
        require(consumed == before.st_size and signature(os.fstat(source.fileno())) == signature(before),
                f'La source a changé pendant la lecture : {name}. Terminez les modifications en cours puis reprenez le bloc.')
    if destination is not None:
        destination.chmod(before.st_mode & 0o777)
    return digest.hexdigest(), before


def snapshot(project, target=None, *, copies=1):
    """A target produces a copy; no target verifies sources without duplicating them."""
    root, source_files = inventory(project)
    created = False
    try:
        if target is not None:
            check_space(target, source_files, copies)
            target.mkdir(parents=True, mode=0o700)
            created = True
        files = {}
        for name, before in source_files.items():
            destination = safe_path(target, name) if target is not None else None
            if destination is not None:
                destination.parent.mkdir(parents=True, exist_ok=True)
            digest, info = streamed_file(root, name, destination=destination, expected=before)
            files[name] = {'sha256': digest, 'mode': info.st_mode & 0o777}
        _, after = inventory(project)
        require({n: signature(s) for n, s in source_files.items()} == {n: signature(s) for n, s in after.items()},
                'Les sources ont changé pendant la préparation. Terminez les modifications en cours puis reprenez le bloc ; aucun candidat n’a été créé.')
        return files
    except BaseException as error:
        if created:
            shutil.rmtree(target)
        if isinstance(error, OSError) and error.errno == errno.ENOSPC:
            raise ContractError('Le disque est plein pendant la copie isolée. La copie partielle a été supprimée ; libérez de l’espace puis reprenez ce bloc. Le dépôt original reste intact.') from None
        if isinstance(error, FileNotFoundError):
            raise ContractError('Une source a disparu pendant la copie. Terminez les modifications en cours puis reprenez le bloc ; la copie partielle a été supprimée.') from None
        raise

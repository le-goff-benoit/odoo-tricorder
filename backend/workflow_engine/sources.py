"""Immutable copies of files explicitly selected through the native dialog.

This command is private to Electron's main process. It is intentionally absent
from the renderer command allowlist: a text reference is never read as a path.
"""
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import re
import shutil
import stat
import tempfile
import uuid

from .contracts import ContractError

MAX_FILES = 20
MAX_FILE_BYTES = 16 * 1024 * 1024
MAX_TOTAL_BYTES = 64 * 1024 * 1024


def import_selected(directory, paths):
    if not isinstance(paths, list) or not paths or len(paths) > MAX_FILES:
        raise ContractError(f"Choisissez entre 1 et {MAX_FILES} fichiers.")
    if any(not isinstance(value, str) or not value or len(value) > 4096 for value in paths):
        raise ContractError("Sélection de fichiers invalide.")
    if len(set(paths)) != len(paths):
        raise ContractError("Le même fichier a été sélectionné plusieurs fois.")
    sources = Path(directory).resolve() / "sources"
    sources.mkdir(mode=0o700, parents=True, exist_ok=True)
    batch = uuid.uuid4().hex
    staging = Path(tempfile.mkdtemp(prefix=".pending-", dir=sources))
    destination = sources / batch
    results, total = [], 0
    try:
        for index, value in enumerate(paths):
            source = Path(value)
            # O_NOFOLLOW avoids silently following a changed selection or reading
            # special files; only regular files chosen by the user are copied.
            fd = os.open(source, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
            with os.fdopen(fd, "rb") as reader:
                before = os.fstat(reader.fileno())
                if not stat.S_ISREG(before.st_mode):
                    raise ContractError("Choisissez des fichiers ordinaires, pas des dossiers ou des liens.")
                if before.st_size > MAX_FILE_BYTES or total + before.st_size > MAX_TOTAL_BYTES:
                    raise ContractError("Les fichiers dépassent la limite de 16 Mio par fichier ou 64 Mio par sélection.")
                name = source.name
                safe_name = re.sub(r"[^\w. -]", "_", name, flags=re.UNICODE).strip(". ")[:180] or "document"
                stored_name = f"{index + 1:02d}-{safe_name}"
                target = staging / stored_name
                digest, size = hashlib.sha256(), 0
                with target.open("xb") as writer:
                    os.chmod(target, 0o600)
                    while chunk := reader.read(128 * 1024):
                        size += len(chunk)
                        if size > MAX_FILE_BYTES or total + size > MAX_TOTAL_BYTES:
                            raise ContractError("Un fichier dépasse la taille autorisée pendant sa copie.")
                        digest.update(chunk)
                        writer.write(chunk)
                    writer.flush()
                    os.fsync(writer.fileno())
                after = os.fstat(reader.fileno())
                if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
                    raise ContractError("Un fichier a changé pendant sa copie. Sélectionnez-le à nouveau.")
            total += size
            results.append({"id": f"{batch}:{index + 1}", "name": name, "path": str(destination / stored_name),
                            "size": size, "sha256": digest.hexdigest(),
                            "media_type": mimetypes.guess_type(name)[0] or "application/octet-stream"})
        manifest = staging / "manifest.json"
        manifest.write_text(json.dumps({"files": results}, ensure_ascii=False), encoding="utf-8")
        manifest.chmod(0o600)
        os.replace(staging, destination)
        return {"files": results, "canceled": False}
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise

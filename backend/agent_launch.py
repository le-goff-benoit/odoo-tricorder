#!/usr/bin/env python3
"""Replace this process with the provider CLI; never interpret request text as shell input."""
import json
import os
from pathlib import Path
import sys


def launch(file):
    path = Path(file)
    if not path.is_file() or path.stat().st_size > 128 * 1024:
        raise ValueError('Configuration de lancement absente ou trop volumineuse')
    argv = json.loads(path.read_text())['argv']
    if (not isinstance(argv, list) or not argv or argv[0] not in ('codex', 'claude')
            or not all(isinstance(arg, str) and '\x00' not in arg for arg in argv)):
        raise ValueError('Arguments fournisseur invalides')
    os.execvp(argv[0], argv)


if __name__ == '__main__':
    try:
        launch(sys.argv[1])
    except (IndexError, KeyError, ValueError, OSError) as exc:
        sys.exit('Lancement agent refusé : ' + str(exc))

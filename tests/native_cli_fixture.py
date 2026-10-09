"""Executable discovery fixtures: never invoke a real provider or an account."""
import os
from pathlib import Path
from unittest.mock import patch


def cli_directory(root, providers=('codex', 'claude')):
    folder = Path(root) / 'synthetic-native-cli'
    folder.mkdir(exist_ok=True)
    for provider in providers:
        binary = folder / provider
        binary.write_text('#!/usr/bin/python3\nimport sys\nprint("Native CLI discovery fixture: model execution is forbidden", file=sys.stderr)\nsys.exit(78)\n')
        binary.chmod(0o755)
    return folder


def use_native_cli_fixtures(test, root):
    """Exercise the real discovery/preflight path; fail closed if ever invoked."""
    folder = cli_directory(root)
    environment = patch.dict(os.environ, {'PATH': str(folder) + os.pathsep + os.environ.get('PATH', '')})
    environment.start()
    test.addCleanup(environment.stop)
    return folder

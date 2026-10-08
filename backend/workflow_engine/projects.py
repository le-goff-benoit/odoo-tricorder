"""A project is exactly a local Git working-tree root."""

import os
from pathlib import Path
import subprocess

from .contracts import require


def git_environment():
    return {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}


def initialize(folder):
    result = subprocess.run(["git", "-c", "init.defaultBranch=main", "-c", "core.hooksPath=/dev/null", "init", "--quiet", "--template=", str(folder)], capture_output=True, timeout=10, env=git_environment())
    require(result.returncode == 0, "Impossible d'initialiser le dépôt Git local")


def repository(folder):
    root = Path(folder).expanduser().resolve()
    require(root.is_dir(), "Le dossier du dépôt doit exister")
    result = subprocess.run(["git", "-C", str(root), "rev-parse", "--show-toplevel"], capture_output=True, text=True, timeout=10, env=git_environment())
    require(result.returncode == 0, "Ce dossier n'est pas un dépôt Git local. Choisir un dépôt existant ou l'initialiser depuis un terminal.")
    require(Path(result.stdout.strip()).resolve() == root, "Choisir la racine du dépôt Git, et non un sous-dossier")
    return str(root)

"""Read provider inventory through its CLI, never inspect auth/keychain files."""

import hashlib
import json
import shutil
import subprocess
import tempfile

from workflow_engine.contracts import require


def normalize(data):
    require(isinstance(data, dict) and isinstance(data.get("installed"), list), "Format du catalogue Codex inconnu")
    result = []
    for item in data["installed"][:500]:
        require(isinstance(item, dict), "Plugin Codex invalide")
        name = item.get("name")
        require(isinstance(name, str) and 0 < len(name) <= 200, "Nom de plugin Codex invalide")
        # Allow-list only. Never forward source paths, configuration or auth data.
        pid = "codex-" + hashlib.sha256(str(item.get("pluginId", name)).encode()).hexdigest()[:16]
        result.append({"id": pid, "title": name, "provider": "codex", "available": True,
                       "installed": item.get("installed") is True, "connected": None,
                       "enabled": item.get("enabled") is True, "usable": False, "qualified": False,
                       "source": "codex-cli", "operations": [],
                       "reason": "Détecté par le catalogue natif Codex. Les outils et l’authentification restent à vérifier ; les sessions Tricorder actuelles sont limitées au texte."})
    return result


def codex_plugins():
    binary = shutil.which("codex")
    require(binary, "Codex CLI n'est pas installé")
    with tempfile.TemporaryFile() as output:
        try:
            completed = subprocess.run([binary, "plugin", "list", "--json"], stdin=subprocess.DEVNULL,
                                       stdout=output, stderr=subprocess.DEVNULL, timeout=10)
        except subprocess.TimeoutExpired:
            raise ValueError("Le catalogue Codex ne répond pas ; aucune installation ni connexion n'a été modifiée") from None
        require(completed.returncode == 0, "Catalogue Codex indisponible avec cette version ou configuration du CLI")
        require(output.tell() <= 2_000_000, "Catalogue Codex trop volumineux")
        output.seek(0)
        return normalize(json.load(output))

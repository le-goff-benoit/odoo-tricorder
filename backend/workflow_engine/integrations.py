"""Project-owned plugin descriptors, independent of block types and agent roles.

Descriptors declare needs; they cannot grant runtime capabilities. Provider
adapters must independently discover tools, authenticate and qualify transports.
"""

import json
from pathlib import Path

from .contracts import digest, identifier, require


def catalog(project):
    root = Path(project["path"]).resolve()
    path = root / ".tricorder" / "plugins.json"
    require(path.resolve().is_relative_to(root), "Catalogue de plugins hors du dépôt")
    if not path.exists():
        return {"path": str(path), "plugins": [], "sha256": digest([])}
    require(path.is_file() and path.stat().st_size <= 200_000, "Catalogue de plugins trop volumineux")
    data = json.loads(path.read_text())
    require(isinstance(data, dict) and set(data) == {"schema", "plugins"} and data["schema"] == 1, "Catalogue attendu : schema 1, plugins")
    require(isinstance(data["plugins"], list) and len(data["plugins"]) <= 100, "100 plugins maximum")
    seen = set()
    plugins = []
    for item in data["plugins"]:
        require(isinstance(item, dict) and set(item) <= {"id", "title", "provider", "operations"}, "Descripteur : id, title, provider, operations uniquement ; aucun secret")
        pid = identifier(item.get("id"), "Plugin")
        require(pid not in seen, "Plugin dupliqué")
        seen.add(pid)
        require(isinstance(item.get("title"), str) and 0 < len(item["title"]) <= 120, "Nom du plugin requis")
        require(item.get("provider") in {"codex", "claude", "local"}, "Fournisseur du plugin requis")
        operations = item.get("operations")
        require(isinstance(operations, list) and 0 < len(operations) <= 100, "Capacités du plugin requises")
        for operation in operations:
            identifier(operation, "Capacité")
        require(len(set(operations)) == len(operations), "Capacité dupliquée")
        plugins.append({**item, "operations": list(operations)})
    return {"path": str(path), "plugins": plugins, "sha256": digest(plugins)}


def capabilities(project):
    return [{**item, "id": "plugin:" + item["id"], "plugin_id": item["id"],
             "available": True, "installed": None, "connected": None, "usable": False,
             "qualified": False, "source": "project-manifest",
             "reason": "Déclaré dans le dépôt. Installation et accès à vérifier chez le fournisseur ; transport d’outils non qualifié dans cette version de Tricorder."}
            for item in catalog(project)["plugins"]]


def issues(graph, project=None):
    known = {p["id"]: p for p in catalog(project)["plugins"]} if project else {}
    result = []
    for node in graph["nodes"]:
        for binding in node.get("capabilities", []):
            plugin = known.get(binding["plugin"])
            if not plugin or binding["operation"] not in plugin["operations"]:
                message = "Capacité absente du catalogue du projet ; actualiser ou configurer le plugin."
            else:
                message = "Plugin déclaré, mais transport d’outils non qualifié : aucune activation réelle possible."
            result.append({"node": node["id"], "message": message})
    return result

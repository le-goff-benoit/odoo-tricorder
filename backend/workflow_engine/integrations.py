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
        require(isinstance(item, dict) and set(item) <= {"id", "title", "provider", "operations", "transport"}, "Descripteur : id, title, provider, operations, transport uniquement ; aucun secret")
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
        if "transport" in item:
            from connectors.local_tools import fingerprint
            fingerprint(item["transport"])
        plugins.append({**item, "operations": list(operations)})
    return {"path": str(path), "plugins": plugins, "sha256": digest(plugins)}


def capabilities(project, engine=None):
    result = []
    for item in catalog(project)["plugins"]:
        card = {**item, "id": "plugin:" + item["id"], "plugin_id": item["id"],
                "available": True, "installed": None, "connected": None, "usable": False,
                "qualified": False, "source": "project-manifest",
                "reason": "Plugin déclaré ; transport non qualifié. Configurer un adaptateur local puis vérifier la connexion."}
        if item.get("transport") and engine:
            from connectors.local_tools import approved
            from .contracts import ContractError
            try:
                record = approved(engine, project, item["id"])
                card.update(installed=True, connected=True, usable=True, qualified=True,
                            reason="Adaptateur local vérifié. Son authentification reste sous sa responsabilité.", verified_at=record["verified_at"])
            except (ContractError, OSError) as exc:
                card["reason"] = str(exc)
        result.append(card)
    return result


def issues(graph, project=None, engine=None):
    from .contracts import ContractError
    known = {p["id"]: p for p in catalog(project)["plugins"]} if project else {}
    result = []
    for node in graph["nodes"]:
        bindings = node.get("capabilities", [])
        if bindings and node["kind"] not in {"watch", "communication", "external", "document", "task", "agent"}:
            result.append({"node": node["id"], "message": "Transport non qualifié pour ce type de bloc. Choisir Tâche IA, Travail, Document, Veille, Communication ou Opération externe."})
        if len(bindings) > 1:
            result.append({"node": node["id"], "message": "Une capacité par bloc exécutable ; relier plusieurs blocs pour composer les opérations."})
        for binding in bindings:
            plugin = known.get(binding["plugin"])
            try:
                require(plugin and binding["operation"] in plugin["operations"], "Capacité absente du catalogue du projet ; actualiser ou configurer le plugin.")
                require(engine and plugin.get("transport"), "Plugin déclaré, mais transport d’outils non qualifié : vérifier un adaptateur local.")
                from connectors.local_tools import approved
                record = approved(engine, project, plugin["id"])
                effect = record["operations"].get(binding["operation"])
                require(effect, "Capacité absente du transport vérifié")
                require(effect == "read" or effect == "notify" and node["kind"] == "communication" or effect == "write" and node["kind"] == "external", "Effet de l’outil incompatible : les écritures exigent un bloc externe et un accord exact")
            except (ContractError, OSError) as exc:
                result.append({"node": node["id"], "message": str(exc)})
    return result

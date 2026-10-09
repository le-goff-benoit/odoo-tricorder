"""Idempotent local setup. Preserve existing definitions, runs and custom guidance."""
import copy
from pathlib import Path

from .contracts import ContractError
from .packs import inspect_pack, install
from .work_templates import templates


def configure(engine, catalog, pack_path=None):
    existing = {p["path"]: p for p in engine.projects()}
    pack = inspect_pack(pack_path) if pack_path and (Path(pack_path) / "tricorder-pack.json").is_file() else None
    results = []
    for entry in catalog:
        try:
            path = str(Path(entry["path"]).resolve())
            project = existing.get(path) or engine.create_project(entry.get("name") or Path(path).name, path)
            existing[path] = project
            if pack and entry.get("series"):
                from catalog import environments
                online = any(e.get("platform") == "online" for e in environments(Path(path)))
                project = engine.project_series(project["id"], entry["series"], platform="online" if online else "custom")
                modules = [p for p in Path(path).glob("*/__manifest__.py") if not p.parent.name.startswith("studio_customization")]
                studio_route = online or (not modules and not (Path(path) / "__manifest__.py").is_file())
                if not any(p["id"] == pack["id"] and p["sha256"] == pack["sha256"] for p in project.get("packs", [])):
                    project = install(engine, project["id"], pack_path, pack["sha256"])
                known = {g["id"] for g in engine.workflows(project["id"])}
                for template in templates()[:2]:
                    graph = copy.deepcopy(template)
                    graph["id"] = "odoo-" + graph["id"]
                    if graph["id"] in known:
                        continue
                    graph["domain"] = "odoo"
                    graph["parameters"] = {"series": entry["series"]}
                    if online:
                        graph["parameters"].update(platform="online", route="studio")
                    profiles = {"intent": "odoo-analyst", "plan": "odoo-analyst", "work": "odoo-developer", "check": "odoo-tester", "delivery": "odoo-deployer",
                                "diagnosis": "odoo-support", "reassess": "odoo-support", "urgent": "odoo-analyst", "normal": "odoo-support"}
                    for node in graph["nodes"]:
                        if node["id"] in profiles:
                            node["profile"] = profiles[node["id"]]
                        if node["id"] == "work":
                            if studio_route:
                                node["profile"] = "odoo-studio"
                                node["title"] = "Configurer et versionner le pack Studio"
                                node["prompt"] += " Travailler sur copie locale neutralisée, versionner le pack Studio et remettre les preuves. Aucun module Python pour Odoo Online."
                            else:
                                node["execution_mode"] = "edit"
                                node["outputs"]["candidate"] = "object"
                        if node["id"] == "check" and not studio_route:
                            node["candidate_check"] = True
                            node["inputs"]["candidate"] = "object"
                            node["prompt"] += " Matérialiser inputs.candidate avec prepare-candidate. Tester ce candidat sur la copie locale déclarée ; joindre les preuves réelles."
                    for connection in graph["edges"]:
                        if connection["from"] == "work" and connection["to"] == "check" and not studio_route:
                            connection["mapping"]["candidate"] = "candidate"
                    engine.save(project["id"], graph)
            results.append({"path": path, "project": project["id"], "status": "configured"})
        except (ContractError, OSError, ValueError) as exc:
            results.append({"path": entry.get("path"), "status": "unavailable", "reason": str(exc)})
    return results

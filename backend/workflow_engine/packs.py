"""Declarative domain packs; importing only reads bounded text, never code."""

import json
from pathlib import Path

from .contracts import digest, identifier, require


def inspect_pack(folder):
    root = Path(folder).resolve()
    source = root / "tricorder-pack.json"
    require(source.is_file() and not source.is_symlink() and source.stat().st_size < 100_000, "Manifeste tricorder-pack.json absent ou invalide")
    pack = json.loads(source.read_text())
    require(pack.get("schema") == 1 and pack.get("engine_schema") == 1, "Version de pack incompatible avec ce moteur")
    identifier(pack.get("id"), "Pack")
    require(isinstance(pack.get("version"), str), "Version de pack requise")
    profiles = pack.get("profiles", [])
    require(isinstance(profiles, list) and len(profiles) <= 30, "Profils de pack invalides")
    ids = set()
    for profile in profiles:
        identifier(profile.get("id"), "Profil")
        require(profile["id"] not in ids, "Profil dupliqué")
        ids.add(profile["id"])
        relative = Path(profile.get("source", ""))
        require(not relative.is_absolute() and ".." not in relative.parts, "Source de profil hors pack")
        path = (root / relative).resolve()
        require(path.is_relative_to(root) and path.is_file() and path.stat().st_size <= 80_000, "Source de profil absente ou hors pack")
        profile["text"] = path.read_text()
        profile["sha256"] = digest(profile["text"])
    pack["sha256"] = digest(pack)
    return pack


def install(engine, project_id, folder, expected_digest):
    pack = inspect_pack(folder)
    require(pack["sha256"] == expected_digest, "Le pack a changé depuis sa prévisualisation")
    with engine.store.transaction() as db:
        project = engine.project(project_id, db)
        project["packs"] = [p for p in project.get("packs", []) if p["id"] != pack["id"]] + [pack]
        db.execute("UPDATE projects SET body=? WHERE id=?", (engine.store.encode(project), project_id))
    return project


def resolve_profiles(project, graph):
    profiles = {p["id"]: p for pack in project.get("packs", []) for p in pack["profiles"]}
    for node in graph["nodes"]:
        if node["kind"] != "agent":
            continue
        selection = {**project["defaults"], **graph.get("defaults", {}), **node}
        pid = selection.get("profile", "generalist")
        if pid == "generalist":
            node.pop("profile_text", None)
        else:
            require(pid in profiles, f"Profil {pid} absent des packs du projet")
            node["profile_text"] = profiles[pid]["text"]
            node["profile_sha256"] = profiles[pid]["sha256"]
    return graph


def policy_issues(project, graph):
    issues = []
    for pack in project.get("packs", []):
        policy = pack.get("policies", {})
        if policy.get("domain") != "odoo":
            continue
        # Installing a pack must not impose its domain on unrelated workflows.
        profiles = {p["id"] for p in pack.get("profiles", [])}
        used = any({**project.get("defaults", {}), **graph.get("defaults", {}), **n}.get("profile") in profiles for n in graph["nodes"])
        if graph.get("domain") != "odoo" and not used:
            continue
        params = graph.get("parameters", {})
        if policy.get("series_required") and not params.get("series"):
            issues.append({"node": "workflow", "message": "Pack Odoo : série du projet requise."})
        if policy.get("online_requires_studio") and params.get("platform") == "online" and params.get("route") != "studio":
            issues.append({"node": "workflow", "message": "Odoo Online impose la voie Studio."})
        for node in graph["nodes"]:
            if node.get("profile") == "odoo-tester" and node.get("environment") == "production":
                issues.append({"node": node["id"], "message": "Pack Odoo : recette sur copie locale, jamais en production."})
    return issues

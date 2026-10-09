"""Declarative domain packs; importing only reads bounded text, never code."""

import json
import re
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
        text = path.read_text()
        if profile.get("section"):
            identifier(profile["section"], "Section de profil")
            sections = re.split(r"(?m)^## ([a-zA-Z][a-zA-Z0-9_.-]*)\s*$", text)
            matches = [sections[i+1] for i in range(1, len(sections), 2) if sections[i] == profile["section"]]
            require(len(matches) == 1, "Section de profil absente ou dupliquée")
            text = sections[0] + "\n## " + profile["section"] + matches[0]
        profile["text"] = text
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


def resolve_profiles(project, graph, *, strict=True):
    profiles = {p["id"]: p for pack in project.get("packs", []) for p in pack["profiles"]}
    for node in graph["nodes"]:
        if node["kind"] != "agent":
            continue
        selection = {**project["defaults"], **graph.get("defaults", {}), **node}
        pid = selection.get("profile", "generalist")
        if pid == "generalist":
            node.pop("profile_text", None)
        else:
            if not strict and pid not in profiles:
                # Preview can report unavailable profiles while preparing the
                # installed ones. Execution always uses strict resolution.
                node.pop("profile_text", None)
                node.pop("profile_sha256", None)
                continue
            require(pid in profiles, f"Profil {pid} absent des packs du projet")
            node["profile_text"] = profiles[pid]["text"]
            node["profile_sha256"] = profiles[pid]["sha256"]
    return graph


def profile_issues(project, graph, *, primary=True):
    profiles = {p["id"] for pack in project.get("packs", []) for p in pack["profiles"]}
    issues = []
    for node in graph["nodes"]:
        selected = {**project.get("defaults", {}), **graph.get("defaults", {}), **node}
        profile = selected.get("profile", "generalist")
        if node["kind"] == "agent" and profile != "generalist" and profile not in profiles:
            issues.append({"node": node["id"], "title": node.get("title", node["id"]), "code": "profile.unavailable", "stage": "launch",
                           "message": f"Profil {profile} absent des packs du projet.", "action": "edit-node" if primary else "choose-projects",
                           "remedy": "Choisissez un profil installé dans les options IA de cette étape, ou installez le pack correspondant dans ce projet." if primary else "Installez le pack correspondant dans ce projet ou retirez ce projet du périmètre. Le profil du workflow restera inchangé."})
    return issues


def pack_applies(project, graph, pack):
    """Domain or effective profile membership, never a profile-name prefix."""
    domain = pack.get("policies", {}).get("domain")
    if domain and graph.get("domain") == domain:
        return True
    profiles = {p["id"] for p in pack.get("profiles", [])}
    return any({**project.get("defaults", {}), **graph.get("defaults", {}), **node}.get("profile") in profiles
               for node in graph["nodes"])


def conversation_parameters(project, graph):
    """Use exactly the domain/profile predicate that activates Odoo policies."""
    odoo = graph.get("domain") == "odoo" or any(
        pack.get("policies", {}).get("domain") == "odoo" and pack_applies(project, graph, pack)
        for pack in project.get("packs", []))
    return {k: project[k] for k in ("series", "platform") if project.get(k)} if odoo else {}


def policy_readiness(project, graph, mode="automatic"):
    """Defer only an absent QA prerequisite that the conversation can prepare.

    All other checks still block launch. Claims call policy_issues directly, so
    a deferred requirement never grants permission to execute that step.
    """
    issues, requirements = [], []
    for issue in policy_issues(project, graph):
        target = requirements if mode == "native" and issue["code"] == "odoo.qa.local-copy-required" else issues
        target.append(issue)
    return {"issues": issues, "requirements": requirements}


def policy_issues(project, graph):
    issues = []

    def add(node, code, message, remedy, action, stage="launch"):
        issues.append({"node": node["id"], "title": node.get("title", node["id"]), "code": code, "stage": stage,
                       "message": message, "remedy": remedy, "action": action})

    workflow = {"id": "workflow", "title": graph.get("title", "Workflow")}
    for pack in project.get("packs", []):
        policy = pack.get("policies", {})
        if policy.get("domain") != "odoo":
            continue
        # Installing a pack must not impose its domain on unrelated workflows.
        if not pack_applies(project, graph, pack):
            continue
        params = graph.get("parameters", {})
        if policy.get("series_required") and not params.get("series"):
            add(workflow, "odoo.series-required", "Pack Odoo : série du projet requise.",
                "Renseignez la version d’Odoo du projet dans les paramètres du workflow.", "workflow-settings")
        if policy.get("online_requires_studio") and params.get("platform") == "online" and params.get("route") != "studio":
            add(workflow, "odoo.online-studio-required", "Odoo Online impose la voie Studio.",
                "Choisissez la voie Studio pour ce projet Odoo Online.", "workflow-settings")
        for node in graph["nodes"]:
            selection = {**project.get("defaults", {}), **graph.get("defaults", {}), **node}
            if policy.get("online_requires_studio") and params.get("platform") == "online" and selection.get("profile") == "odoo-developer":
                add(node, "odoo.online-module-forbidden", "Odoo Online : remplacer le développement de module par un bloc Studio.",
                    "Configurez cette étape pour utiliser le profil Odoo Studio.", "edit-node")
            if selection.get("profile") != "odoo-tester":
                continue
            environment = node.get("environment", params.get("environment"))
            reference = params.get("neutralized_copy")
            if environment == "production" or params.get("environment") == "production":
                add(node, "odoo.qa.production-forbidden", "Pack Odoo : recette sur copie locale, jamais en production.",
                    "Corrigez le contexte de recette dans le workflow : cette étape doit utiliser une copie locale neutralisée.",
                    "edit-node" if node.get("environment") == "production" else "workflow-settings")
            elif policy.get("qa_requires_local_copy"):
                invalid_node = "environment" in node and node["environment"] is not None and node["environment"] != "local"
                invalid_parameters = params.get("environment") is not None and params["environment"] != "local"
                if invalid_node or invalid_parameters:
                    add(node, "odoo.qa.environment-invalid", "L’environnement de recette doit être une copie locale neutralisée.",
                        "Corrigez le contexte de recette avant le lancement ; un environnement distant ne remplace pas la copie locale.",
                        "edit-node" if invalid_node else "workflow-settings")
                elif reference is not None and (not isinstance(reference, str) or not reference.strip()):
                    add(node, "odoo.qa.copy-invalid", "La référence de la copie de recette est invalide.",
                        "Renseignez une référence explicite à la copie locale neutralisée préparée pour cette recette.", "workflow-settings")
                elif params.get("environment") != "local" or reference is None:
                    add(node, "odoo.qa.local-copy-required", "Une copie locale neutralisée doit être préparée et identifiée avant la recette.",
                        "Demandez à l’agent dans le terminal de préparer et vérifier la copie locale neutralisée, puis d’enregistrer sa référence pour cette étape avant la recette.",
                        "prepare-in-conversation", stage="step")
    return issues

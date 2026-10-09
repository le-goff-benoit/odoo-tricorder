"""Portable definitions only. Opening a file never starts a workflow or schedule."""

import copy
import json
import uuid

from .contracts import expand, require, validate


def clean(graph):
    graph = copy.deepcopy(graph)
    for key in ("revision", "release", "driver"):
        graph.pop(key, None)
    for node in graph["nodes"]:
        for key in ("execution", "profile_text", "profile_sha256"):
            node.pop(key, None)
    return graph


def requirements(graph):
    models, profiles, plugins = set(), set(), set()
    from .notifications import execution_nodes
    for node in execution_nodes(graph):
        if node["kind"] == "agent":
            effective = {**graph.get("defaults", {}), **node}
            models.add((effective.get("provider", "codex"), effective.get("model", "à définir")))
            profile = effective.get("profile", "generalist")
            if profile != "generalist":
                profiles.add(profile)
        for binding in node.get("capabilities", []):
            plugins.add((binding["plugin"], binding["operation"]))
    return {"models": [dict(provider=p, model=m) for p, m in sorted(models)], "profiles": sorted(profiles),
            "capabilities": [dict(plugin=p, operation=o) for p, o in sorted(plugins)]}


def export(graph, library, defaults=None):
    # Include the full dependency graph as explicit nodes. No remote resolution.
    graph = copy.deepcopy(graph)
    graph["defaults"] = {**(defaults or {}), **graph.get("defaults", {})}
    graph = clean(expand(graph, library))
    bundle = {"format": "tricorder.workflow", "version": 1, "workflow": graph}
    require(len(json.dumps(bundle).encode()) <= 2_000_000, "Workflow portable trop volumineux")
    return bundle


def preview(bundle):
    require(isinstance(bundle, dict) and set(bundle) == {"format", "version", "workflow"}, "Fichier de workflow Tricorder attendu")
    require(bundle["format"] == "tricorder.workflow" and bundle["version"] == 1, "Version du fichier de workflow non prise en charge")
    require(len(json.dumps(bundle).encode()) <= 2_000_000, "Workflow portable trop volumineux")
    graph = clean(validate(bundle["workflow"]))
    require(all(n["kind"] != "subworkflow" for n in graph["nodes"]), "Sous-workflow externe absent : réexporter avec ses dépendances intégrées")
    return {"bundle": {**bundle, "workflow": graph}, "requirements": requirements(graph)}


def import_definition(engine, context, bundle):
    graph = preview(bundle)["bundle"]["workflow"]
    graph["id"] = graph["id"][:55] + "-import-" + uuid.uuid4().hex[:12]
    # A distinct definition, no runs, approvals, workers or schedules created.
    return engine.save(context, graph)

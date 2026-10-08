"""Versioned, declarative workflow contracts; never evaluate expressions."""

import copy
import hashlib
import json
import math
import re


class ContractError(ValueError):
    pass


KINDS = {"task", "command", "agent", "decision", "condition", "join", "review",
         "document", "external", "subworkflow", "watch", "communication"}
ID = re.compile(r"^[a-zA-Z][a-zA-Z0-9_.-]{0,79}$")
TYPES = {"string", "number", "boolean", "object", "array", "any"}


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
                                    separators=(",", ":")).encode()).hexdigest()


def require(ok, message):
    if not ok:
        raise ContractError(message)


def identifier(value, label="Identifiant"):
    require(isinstance(value, str) and ID.fullmatch(value), f"{label} invalide : {value!r}")
    return value


def validate_outputs(node, result):
    values = result.get("outputs", {})
    require(isinstance(values, dict), "Sorties structurées requises")
    for name, kind in node.get("outputs", {}).items():
        value = values.get(name)
        valid = {"string": lambda: isinstance(value, str), "boolean": lambda: isinstance(value, bool),
                 "number": lambda: type(value) in (int, float) and math.isfinite(value),
                 "object": lambda: isinstance(value, dict), "array": lambda: isinstance(value, list),
                 "any": lambda: True}[kind]
        require(name in values and valid(), f"Sortie {name} absente ou incompatible avec le type {kind}")


def validate(graph, *, expanded=False):
    require(isinstance(graph, dict) and graph.get("schema") == 1, "Schéma de workflow attendu : 1")
    identifier(graph.get("id"), "Workflow")
    require(isinstance(graph.get("title"), str) and graph["title"].strip(), "Nom du workflow requis")
    nodes = graph.get("nodes")
    edges = graph.get("edges")
    require(isinstance(nodes, list) and 0 < len(nodes) <= 1000, "Entre 1 et 1 000 blocs requis")
    require(isinstance(edges, list) and len(edges) <= 5000, "Connexions invalides")
    ids = set()
    by_id = {}
    for node in nodes:
        require(isinstance(node, dict), "Bloc invalide")
        nid = identifier(node.get("id"), "Bloc")
        require(nid not in ids, f"Bloc {nid} dupliqué")
        ids.add(nid)
        by_id[nid] = node
        bindings = node.get("capabilities", [])
        require(isinstance(bindings, list) and len(bindings) <= 100, f"{nid} : capacités invalides")
        for binding in bindings:
            require(isinstance(binding, dict) and set(binding) == {"plugin", "operation"}, f"{nid} : liaison plugin/capacité attendue")
            identifier(binding["plugin"], "Plugin")
            identifier(binding["operation"], "Capacité")
        if "position" in node:
            pos = node["position"]
            require(isinstance(pos, dict) and all(isinstance(pos.get(k), (int, float)) and math.isfinite(pos[k]) and 0 <= pos[k] <= 100000 for k in ("x", "y")), f"{nid} : position invalide")
        require(node.get("kind") in KINDS, f"{nid} : type de bloc inconnu")
        require(isinstance(node.get("title"), str) and node["title"].strip(), f"{nid} : mission requise")
        require(isinstance(node.get("criteria", []), list) and all(isinstance(c, str) and c.strip() for c in node.get("criteria", [])), f"{nid} : critères invalides")
        require(isinstance(node.get("resources", []), list) and all(isinstance(r, str) and r for r in node.get("resources", [])), f"{nid} : ressources invalides")
        require(isinstance(node.get("max_attempts", 1), int) and 1 <= node.get("max_attempts", 1) <= 10, f"{nid} : limite de tentatives entre 1 et 10")
        for direction in ("inputs", "outputs"):
            ports = node.get(direction, {})
            require(isinstance(ports, dict), f"{nid} : ports invalides")
            for port, ptype in ports.items():
                identifier(port, f"{nid} port")
                require(ptype in TYPES, f"{nid}.{port} : type inconnu")
        if node["kind"] in {"decision", "condition", "review"}:
            outcomes = node.get("options", ["approve", "reject"])
            require(isinstance(outcomes, list) and len(outcomes) >= 2 and all(isinstance(o, str) for o in outcomes) and len(set(outcomes)) == len(outcomes), f"{nid} : au moins deux issues distinctes")
            for outcome in outcomes:
                identifier(outcome, f"{nid} issue")
        if node["kind"] == "condition":
            require(isinstance(node.get("parameter"), str), f"{nid} : paramètre de condition requis")
        if node["kind"] == "external":
            op = node.get("operation", {})
            require(all(isinstance(op.get(k), str) and op[k].strip() for k in ("action", "target", "candidate")), f"{nid} : action, cible et candidat requis")
        if node["kind"] == "command":
            argv = node.get("argv", [])
            require(isinstance(argv, list) and argv and all(isinstance(a, str) and "\x00" not in a for a in argv), f"{nid} : arguments de commande requis")
            require(isinstance(node.get("timeout", 60), (int, float)) and 1 <= node.get("timeout", 60) <= 3600, f"{nid} : timeout entre 1 et 3 600 secondes")
        if node["kind"] == "agent":
            require(node.get("provider", "codex") in {"codex", "claude"}, f"{nid} : fournisseur inconnu")
            require(node.get("session", "delegated") in {"main", "delegated"}, f"{nid} : mode de session inconnu")
    edge_ids = set()
    adjacency = {nid: [] for nid in ids}
    incoming = {nid: [] for nid in ids}
    for edge in edges:
        identifier(edge.get("id"), "Connexion")
        require(edge["id"] not in edge_ids, f"Connexion {edge['id']} dupliquée")
        edge_ids.add(edge["id"])
        source, target = edge.get("from"), edge.get("to")
        require(source in ids and target in ids, f"{edge['id']} : bloc introuvable")
        outcome = edge.get("outcome", "done")
        allowed = by_id[source].get("options", ["approve", "reject"]) if by_id[source]["kind"] in {"decision", "condition", "review"} else ["done"]
        require(outcome in allowed, f"{edge['id']} : issue {outcome} inconnue")
        for src, dst in edge.get("mapping", {}).items():
            st = by_id[source].get("outputs", {}).get(src)
            dt = by_id[target].get("inputs", {}).get(dst)
            require(st is not None and dt is not None, f"{edge['id']} : port inconnu {src} → {dst}")
            require(st == dt or "any" in (st, dt), f"{edge['id']} : types incompatibles")
        adjacency[source].append(target)
        incoming[target].append(source)
    # Iterative topological sort: deep graphs cannot exhaust the Python stack.
    degree = {nid: len(parents) for nid, parents in incoming.items()}
    ready = [nid for nid, count in degree.items() if count == 0]
    seen = 0
    while ready:
        nid = ready.pop()
        seen += 1
        for target in adjacency[nid]:
            degree[target] -= 1
            if degree[target] == 0:
                ready.append(target)
    require(seen == len(ids), "Cycle interdit : utiliser une reprise bornée du bloc concerné")
    for node in nodes:
        if node["kind"] == "external":
            gate = by_id.get(node.get("approval"))
            require(gate and gate["kind"] == "decision" and gate.get("operation") == node["operation"], f"{node['id']} : accord lié à cette opération exacte requis")
            require(any(e["from"] == gate["id"] and e["to"] == node["id"] and e.get("outcome") == "approve" for e in edges), f"{node['id']} : connexion d'accord requise")
    return graph


def expand(graph, library, stack=()):
    """Inline reusable subgraphs with namespaced identities and boundary joins."""
    validate(graph)
    require(graph["id"] not in stack, "Sous-workflow récursif : " + " → ".join((*stack, graph["id"])))
    result = copy.deepcopy(graph)
    for node in list(result["nodes"]):
        if node["kind"] != "subworkflow":
            continue
        ref = node.get("workflow")
        require(ref in library, f"{node['id']} : sous-workflow {ref!r} absent")
        sub = expand(library[ref], library, (*stack, graph["id"]))
        prefix = node["id"] + "."
        roots = {n["id"] for n in sub["nodes"]} - {e["to"] for e in sub["edges"]}
        ends = {n["id"] for n in sub["nodes"]} - {e["from"] for e in sub["edges"]}
        node["kind"] = "join"
        exit_node = {"id": prefix + "exit", "title": node["title"] + " · résultat", "kind": "join", "phase": node.get("phase", "")}
        for edge in result["edges"]:
            if edge["from"] == node["id"]:
                edge["from"] = exit_node["id"]
        for child in sub["nodes"]:
            original = child["id"]
            child["id"] = prefix + original
            child["parameters"] = {**sub.get("parameters", {}), **node.get("parameters", {})}
            if "approval" in child:
                child["approval"] = prefix + child["approval"]
            child.setdefault("phase", node.get("phase", node["title"]))
            result["nodes"].append(child)
        for edge in sub["edges"]:
            result["edges"].append({**edge, "id": prefix + edge["id"], "from": prefix + edge["from"], "to": prefix + edge["to"]})
        result["nodes"].append(exit_node)
        for root in roots:
            result["edges"].append({"id": prefix + "enter-" + root, "from": node["id"], "to": prefix + root})
        for end in ends:
            result["edges"].append({"id": prefix + "leave-" + end, "from": prefix + end, "to": exit_node["id"]})
    return validate(result, expanded=True)


def semantic_digest(graph):
    graph = copy.deepcopy(graph)
    graph.pop("revision", None)
    graph.pop("layout", None)
    for node in graph["nodes"]:
        for key in ("position", "collapsed"):
            node.pop(key, None)
    return digest(graph)

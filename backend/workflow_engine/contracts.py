"""Versioned, declarative workflow contracts; never evaluate expressions."""

import copy
import hashlib
import json
import math
import re


class ContractError(ValueError):
    pass


KINDS = {"task", "command", "agent", "decision", "question", "condition", "join", "review",
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


def condition_outcome(node, value):
    """Boolean data uses explicit true/false edge identifiers, never truthiness."""
    if type(value) is bool and {'true', 'false'} <= set(node.get('options', [])):
        return 'true' if value else 'false'
    return value


def validate_result(graph, node, result, outcome="done"):
    """Reject unusable routing values while their producer can still be retried."""
    validate_outputs(node, result)
    if node.get("route_output"):
        require(result.get("outputs", {}).get(node["route_output"]) in node["options"],
                f"{node['title']} : choisir une des issues prévues ou demander une précision")
        outcome = result["outputs"][node["route_output"]]
    targets = {n["id"]: n for n in graph["nodes"] if n["kind"] == "condition"}
    for edge in graph["edges"]:
        if edge["from"] != node["id"] or edge.get("outcome", "done") != outcome:
            continue
        target = targets.get(edge["to"])
        if target is None:
            continue
        for source, destination in edge.get("mapping", {}).items():
            if destination == target["parameter"]:
                require(condition_outcome(target, result.get("outputs", {}).get(source)) in target.get("options", []),
                        f"{node['title']} : sortie {source} incompatible avec les issues de « {target['title']} » ; corriger le résultat avant réception")


def validate(graph, *, expanded=False):
    require(isinstance(graph, dict) and graph.get("schema") == 1, "Schéma de workflow attendu : 1")
    require(len(json.dumps(graph, ensure_ascii=False).encode()) <= 2_000_000, "Définition de workflow trop volumineuse")
    identifier(graph.get("id"), "Workflow")
    require(isinstance(graph.get("title"), str) and graph["title"].strip(), "Nom du workflow requis")
    require(isinstance(graph.get("execution_modes", ["native", "automatic"]), list) and set(graph.get("execution_modes", ["native", "automatic"])) <= {"native", "automatic"} and graph.get("execution_modes", ["native", "automatic"]), "Modes compatibles : native et/ou automatic")
    if "on_question" in graph:
        from .notifications import notification_node
        validate({"schema": 1, "id": "notification", "title": "Notification", "nodes": [notification_node(graph)], "edges": []})
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
        require(isinstance(node.get("required_capabilities", []), list) and all(c in {"text", "read", "edit", "shell", "native-tools"} for c in node.get("required_capabilities", [])), f"{nid} : capacités d’exécution invalides")
        bindings = node.get("capabilities", [])
        require(isinstance(bindings, list) and len(bindings) <= 100, f"{nid} : capacités invalides")
        for binding in bindings:
            require(isinstance(binding, dict) and set(binding) == {"plugin", "operation"}, f"{nid} : liaison plugin/capacité attendue")
            identifier(binding["plugin"], "Plugin")
            identifier(binding["operation"], "Capacité")
        require(isinstance(node.get("reuse", False), bool), f"{nid} : reuse doit être booléen")
        policy = node.get("validation", "human")
        require(policy in {"human", "automatic", "contract"}, f"{nid} : validation human, automatic ou contract attendue")
        if policy == "contract":
            require(node.get("kind") in {"agent", "task", "document"}, f"{nid} : réception de contrat réservée au travail sans effet externe")
        if policy == "automatic":
            require(node.get("kind") in {"command", "document", "watch", "communication"}, f"{nid} : validation automatique réservée aux exécutants déterministes")
            require(not node.get("criteria"), f"{nid} : des critères métier exigent une validation humaine")
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
        require(node.get("completion_outcome", "succeeded") in {"succeeded", "blocked"}, f"{nid} : résultat final succeeded ou blocked attendu")
        require(type(node.get("candidate_check", False)) is bool, f"{nid} : contrôle QA booléen attendu")
        if node.get("candidate_check"):
            require(node["kind"] in {"agent", "task", "command"}, f"{nid} : contrôle QA réservé aux blocs de travail ou commande")
            require(node.get("inputs", {}).get("candidate") == "object", f"{nid} : entrée candidate objet requise pour la QA")
            require(node["kind"] == "command" or node.get("outputs", {}).get("verdict") == "string", f"{nid} : sortie verdict texte requise pour la QA")
        required = node.get("application_requires", [])
        require(isinstance(required, list) and all(isinstance(key, str) and ID.fullmatch(key) for key in required), f"{nid} : liste de contrôles requise")
        if node["kind"] == "condition":
            require(isinstance(node.get("parameter"), str), f"{nid} : paramètre de condition requis")
        if node["kind"] == "question":
            require(isinstance(node.get("question"), str) and node["question"].strip(), f"{nid} : question requise")
            require(node.get("outputs", {}) in ({}, {"answer": "string"}), f"{nid} : la réponse est une sortie answer de type string")
        if node.get("route_output"):
            require(node["kind"] == "agent" and node.get("outputs", {}).get(node["route_output"]) == "string", f"{nid} : l’aiguillage IA exige une sortie texte déclarée")
            choices = node.get("options", [])
            require(isinstance(choices, list) and len(choices) >= 2 and all(isinstance(c, str) for c in choices) and len(set(choices)) == len(choices), f"{nid} : au moins deux issues distinctes")
            for choice in choices:
                identifier(choice, f"{nid} issue")
        if node["kind"] == "external":
            op = node.get("operation", {})
            require(isinstance(op, dict) and all((isinstance(op.get(k), str) and op[k].strip()) or (isinstance(op.get(k), dict) and set(op[k]) == {"input"} and isinstance(op[k]["input"], str) and op[k]["input"].split(".")[0] in node.get("inputs", {})) for k in ("action", "target", "candidate")), f"{nid} : action, cible et candidat requis")
        if node["kind"] == "command":
            argv = node.get("argv", [])
            require(isinstance(argv, list) and argv and all(isinstance(a, str) and "\x00" not in a for a in argv), f"{nid} : arguments de commande requis")
            require(isinstance(node.get("timeout", 60), (int, float)) and 1 <= node.get("timeout", 60) <= 3600, f"{nid} : timeout entre 1 et 3 600 secondes")
        if node["kind"] == "agent":
            require(node.get("execution_mode", "text") in {"text", "edit"}, f"{nid} : mode IA text ou edit attendu")
            if node.get("execution_mode") == "edit":
                require(node.get("outputs", {}).get("candidate") == "object", f"{nid} : sortie candidate de type object requise")
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
        allowed = by_id[source].get("options", ["done", "reject"] if by_id[source]["kind"] == "subworkflow" else ["approve", "reject"]) if by_id[source]["kind"] in {"decision", "condition", "review", "subworkflow"} or by_id[source].get("route_output") or by_id[source].get("component_exit") else ["done"]
        require(outcome in allowed, f"{edge['id']} : issue {outcome} inconnue")
        mapping = edge.get("mapping", {})
        require(isinstance(mapping, dict) and all(isinstance(dst, str) for dst in mapping.values()),
                f"{edge['id']} : les données transmises doivent associer chaque sortie à une entrée")
        require(len(set(mapping.values())) == len(mapping),
                f"{by_id[target]['title']} : choisissez une seule sortie par entrée dans ce lien ; plusieurs sorties visent la même entrée")
        for src, dst in mapping.items():
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
        public_inputs = copy.deepcopy(node.get("inputs", {}))
        public_outputs = copy.deepcopy(node.get("outputs", {}))
        children = {n["id"]: n for n in sub["nodes"]}
        input_links = {}
        output_links = {}
        for direction, ports, boundary, links in (("input", public_inputs, roots, input_links), ("output", public_outputs, ends, output_links)):
            declared = node.get(direction + "_mapping", {})
            require(isinstance(declared, dict), f"{node['id']} : mapping {direction} invalide")
            for port, kind in ports.items():
                endpoints = declared.get(port)
                if endpoints is None:
                    endpoints = [{"node": key, "port": port} for key in sorted(boundary) if port in children[key].get(direction + "s", {})]
                elif isinstance(endpoints, dict):
                    endpoints = [endpoints]
                require(isinstance(endpoints, list) and endpoints, f"{node['id']}.{port} : mapping {direction} requis vers un port du composant")
                for endpoint in endpoints:
                    require(isinstance(endpoint, dict) and set(endpoint) == {"node", "port"}, f"{node['id']} : destination node/port attendue")
                    target, name = endpoint["node"], endpoint["port"]
                    require(target in boundary, f"{node['id']} : {target} n’est pas une frontière {direction} du composant")
                    child_kind = children[target].get(direction + "s", {}).get(name)
                    require(child_kind is not None and (kind == child_kind or "any" in (kind, child_kind)), f"{node['id']}.{port} : type incompatible avec {target}.{name}")
                    links.setdefault(target, {})[port if direction == "input" else name] = name if direction == "input" else port
        node["kind"] = "join"
        node["outputs"] = public_inputs
        exit_node = {"id": prefix + "exit", "title": node["title"] + " · résultat", "kind": "join", "phase": node.get("phase", ""), "inputs": public_outputs, "outputs": public_outputs, "component_exit": True, "options": node.get("options", ["done", "reject"])}
        for edge in result["edges"]:
            if edge["from"] == node["id"]:
                edge["from"] = exit_node["id"]
        for child in sub["nodes"]:
            original = child["id"]
            child["id"] = prefix + original
            child["parameters"] = {**sub.get("parameters", {}), **child.get("parameters", {}), **node.get("parameters", {})}
            for key, value in sub.get("defaults", {}).items():
                child.setdefault(key, value)
            if "application_requires" in child:
                child["application_requires"] = [prefix + required for required in child["application_requires"]]
            if "approval" in child:
                child["approval"] = prefix + child["approval"]
            child.setdefault("phase", node.get("phase", node["title"]))
            result["nodes"].append(child)
        for edge in sub["edges"]:
            result["edges"].append({**edge, "id": prefix + edge["id"], "from": prefix + edge["from"], "to": prefix + edge["to"]})
        result["nodes"].append(exit_node)
        for root in roots:
            result["edges"].append({"id": prefix + "enter-" + root, "from": node["id"], "to": prefix + root, "mapping": input_links.get(root, {})})
        for end in ends:
            child = children[end]
            outcomes = child.get("options", ["approve", "reject"]) if child["kind"] in {"decision", "review", "condition"} or child.get("route_output") or child.get("component_exit") else ["done"]
            for outcome in outcomes:
                result["edges"].append({"id": prefix + "leave-" + end + "-" + outcome, "from": prefix + end, "to": exit_node["id"], "outcome": outcome, "mapping": output_links.get(end, {})})
    return validate(result, expanded=True)


def semantic_digest(graph):
    graph = copy.deepcopy(graph)
    graph.pop("revision", None)
    graph.pop("layout", None)
    for node in graph["nodes"]:
        for key in ("position", "collapsed"):
            node.pop(key, None)
    return digest(graph)

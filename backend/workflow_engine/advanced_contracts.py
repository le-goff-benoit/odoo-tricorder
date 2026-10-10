"""Contracts for explicit collection, iteration and engine-owned integration."""
import copy


def validate_advanced(graph):
    from .contracts import identifier, require, validate
    from .ports import port_type
    from .associated_actions import validate_actions
    validate_actions(graph)
    for node in graph["nodes"]:
        kind = node["kind"]
        if kind not in {"input", "foreach", "integrate"}:
            continue
        require(graph["schema"] == 2, f"{node['title']} : ce bloc nécessite le schéma 2")
        if kind == "input":
            outputs = node.get("outputs", {})
            require(len(outputs) == 1 and port_type(next(iter(outputs.values()))) == "array",
                    f"{node['title']} : une sortie de type liste est requise pour le recueil")
            require(not node.get("inputs"), f"{node['title']} : les contributions se recueillent directement auprès de l'utilisateur")
            specification = next(iter(outputs.values()))
            if isinstance(specification, dict):
                require(specification.get("items", "any") in {"string", "object", "any"},
                        f"{node['title']} : le recueil produit du texte ou des contributions structurées, pas des nombres ni des booléens")
                require(specification.get("minItems", 0) <= 100 and specification.get("maxItems", 100) <= 100,
                        f"{node['title']} : le recueil accepte au plus 100 contributions")
        elif kind == "foreach":
            require(type(node.get("concurrency", 1)) is int and 1 <= node.get("concurrency", 1) <= 4,
                    f"{node['title']} : choisir de 1 à 4 travaux simultanés")
            collection = node.get("collection", "items")
            require(isinstance(collection, str) and 0 < len(collection) <= 200 and
                    all(part for part in collection.split(".")) and collection.split(".")[0] in node.get("inputs", {}),
                    f"{node['title']} : choisissez l'entrée contenant les éléments à traiter")
            workflow = node.get("workflow")
            require(isinstance(workflow, (dict, str)) and bool(workflow),
                    f"{node['title']} : choisissez le workflow à appliquer à chaque élément")
            if isinstance(workflow, dict):
                require(workflow.get("schema") == 2, f"{node['title']} : convertir le sous-workflow en schéma 2 avant de le traiter par élément")
                require(not workflow.get("launch_fields"),
                        f"{node['title']} : un traitement par élément ne peut pas afficher de formulaire de lancement ; "
                        "utilisez le formulaire du workflow principal ou une Question ouverte dans le travail par élément")
                require(not any(n.get("kind") == "foreach" for n in workflow.get("nodes", [])),
                        f"{node['title']} : les traitements par élément imbriqués ne sont pas encore pris en charge")
                validate(workflow)
            require(port_type(node.get("outputs", {}).get("results")) == "array",
                    f"{node['title']} : sortie results de type liste requise")
            require(not node.get("criteria"), f"{node['title']} : placer la validation métier après les résultats réunis")
        else:
            require(port_type(node.get("inputs", {}).get("contributions")) == "array" and
                    port_type(node.get("outputs", {}).get("candidate")) == "object",
                    f"{node['title']} : entrée contributions de type liste et sortie candidate de type objet requises")


def resolve_iterations(graph, library, stack, expand_fn):
    from .contracts import require
    for node in graph["nodes"]:
        if node["kind"] != "foreach":
            continue
        ref = node.get("workflow")
        if isinstance(ref, str):
            require(ref in library, f"{node['title']} : sous-workflow {ref!r} introuvable")
            child = copy.deepcopy(library[ref])
        else:
            child = copy.deepcopy(ref)
        node["workflow"] = expand_fn(child, library, (*stack, graph["id"]))
    for action in graph.get("actions", []):
        action["workflow"] = expand_fn(action["workflow"], library, (*stack, graph["id"]))
    return graph

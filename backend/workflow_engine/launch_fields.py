"""Human launch forms: definition metadata and per-execution answers."""
import copy
import math

from .contracts import identifier, require

TYPES = {"string", "text", "number", "boolean", "choice"}
RESERVED = {"request", "conversation", "depends_on_runs", "dependency_results", "series", "platform", "source_context"}


def _labels(labels, keys, label):
    require(isinstance(labels, dict) and len(labels) <= 1000, f"{label} : libellés invalides")
    for key, value in labels.items():
        require(key in keys, f"{label} : donnée inconnue {key}")
        require(isinstance(value, str) and 0 < len(value.strip()) <= 120, f"{label} : libellé vide ou trop long")


def validate_metadata(graph):
    fields = graph.get("launch_fields", [])
    require(isinstance(fields, list) and len(fields) <= 30, "Formulaire de lancement : 30 champs maximum")
    require(isinstance(graph.get("parameters", {}), dict), "Paramètres : objet attendu")
    seen = set()
    for field in fields:
        require(isinstance(field, dict) and set(field) <= {"key", "label", "help", "type", "required", "options"}, "Champ de lancement invalide")
        key = identifier(field.get("key"), "Champ de lancement")
        require(key not in RESERVED and key not in seen, f"Champ de lancement {key} réservé ou dupliqué")
        seen.add(key)
        require(isinstance(field.get("label"), str) and 0 < len(field["label"].strip()) <= 120, f"{key} : libellé requis (120 caractères maximum)")
        require(isinstance(field.get("help", ""), str) and len(field.get("help", "")) <= 600, f"{key} : aide trop longue")
        require(field.get("type") in TYPES, f"{key} : type de réponse inconnu")
        require(isinstance(field.get("required", False), bool), f"{key} : obligatoire doit être booléen")
        if field["type"] == "choice":
            options = field.get("options")
            require(isinstance(options, list) and 1 <= len(options) <= 50 and all(isinstance(v, str) and 0 < len(v.strip()) <= 200 for v in options), f"{key} : entre 1 et 50 choix non vides")
            require(len(set(options)) == len(options), f"{key} : choix dupliqué")
        else:
            require("options" not in field, f"{key} : choix réservés aux listes de choix")
    _labels(graph.get("parameter_labels", {}), set(graph.get("parameters", {})) | seen, "Paramètres")
    # A default may be absent while authoring a mandatory form. When present,
    # its type must still match the field; requiredness is checked at launch.
    defaults = graph.get("parameters", {})
    for field in fields:
        if field["key"] in defaults:
            _value(field, defaults[field["key"]], required=False)


def validate_port_labels(node):
    labels = node.get("port_labels", {})
    require(isinstance(labels, dict) and set(labels) <= {"inputs", "outputs"}, "Libellés des informations invalides")
    for direction, values in labels.items():
        _labels(values, node.get(direction, {}), node.get("title", "Bloc"))


def _value(field, value, *, required=True):
    label = field["label"]
    missing = value is None or isinstance(value, str) and not value.strip()
    require(not (missing and required and field.get("required")), f"Renseignez « {label} » avant de lancer")
    if missing:
        return
    kind = field["type"]
    valid = (kind in {"string", "text"} and isinstance(value, str) and len(value) <= 100_000
             or kind == "number" and type(value) in {int, float} and math.isfinite(value)
             or kind == "boolean" and type(value) is bool
             or kind == "choice" and isinstance(value, str) and value in field["options"])
    require(valid, f"Réponse invalide pour « {label} » ({kind})")


def resolve_parameters(graph, parameters=None):
    """Merge once, retaining explicit null so a cleared default stays cleared."""
    require(parameters is None or isinstance(parameters, dict), "Réponses du formulaire : objet attendu")
    result = copy.deepcopy({**graph.get("parameters", {}), **(parameters or {})})
    for field in graph.get("launch_fields", []):
        _value(field, result.get(field["key"]))
    return result


def execution_parameters(parameters, local=None):
    """Local settings enrich a run, without replacing its engine context."""
    result = {**parameters, **(local or {})}
    result.update({key: parameters[key] for key in RESERVED if key in parameters})
    return result

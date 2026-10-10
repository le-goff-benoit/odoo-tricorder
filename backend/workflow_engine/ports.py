"""Data contracts shared by validation, execution and provider transports.

A collection is one value with type ``array``. Presence and value are separate:
an omitted optional port is valid; null is a value accepted only by ``any``.
"""
import copy
import math

TYPES = {"string", "number", "boolean", "object", "array", "any"}


def port_type(port):
    return port.get("type") if isinstance(port, dict) else port


def port_required(port, direction="outputs"):
    return port.get("required", True) if isinstance(port, dict) else direction == "outputs"


def normalized_port(port, direction="outputs"):
    """Normalize a legacy port without inventing mandatory historical inputs."""
    result = copy.deepcopy(port) if isinstance(port, dict) else {"type": port}
    result.setdefault("required", port_required(port, direction))
    return result


def validate_port(port, *, schema=2, label="Port"):
    from .contracts import require
    if isinstance(port, str):
        require(port in TYPES, f"{label} : type inconnu")
        return port
    require(schema == 2 and isinstance(port, dict), f"{label} : un contrat de données exige le schéma 2")
    require(set(port) <= {"type", "required", "items", "minItems", "maxItems"}, f"{label} : propriétés du contrat inconnues")
    require(isinstance(port.get("type"), str) and port["type"] in TYPES, f"{label} : type inconnu")
    require(type(port.get("required", True)) is bool, f"{label} : required doit être booléen")
    collection_keys = {"items", "minItems", "maxItems"} & set(port)
    require(not collection_keys or port["type"] == "array", f"{label} : éléments et bornes réservés aux listes")
    if "items" in port:
        require(isinstance(port["items"], str) and port["items"] in TYPES, f"{label} : type des éléments inconnu")
    for key in ("minItems", "maxItems"):
        if key in port:
            require(type(port[key]) is int and port[key] >= 0, f"{label} : {key} doit être un entier positif ou nul")
    require(port.get("maxItems", math.inf) >= port.get("minItems", 0), f"{label} : maximum de liste inférieur au minimum")
    return port


def _matches(kind, value):
    return {"string": lambda: isinstance(value, str), "boolean": lambda: type(value) is bool,
            "number": lambda: type(value) in (int, float) and math.isfinite(value),
            "object": lambda: isinstance(value, dict), "array": lambda: isinstance(value, list),
            "any": lambda: True}[kind]()


def validate_values(ports, values, direction="outputs"):
    """Validate declared values; preserve omission rather than manufacturing null."""
    from .contracts import require
    label = "Sortie" if direction == "outputs" else "Entrée"
    require(isinstance(values, dict), f"{label}s structurées requises")
    for name, port in ports.items():
        kind = port_type(port)
        if name not in values:
            require(not port_required(port, direction), f"{label} {name} absente ou incompatible avec le type {kind}")
            continue
        value = values[name]
        require(_matches(kind, value), f"{label} {name} absente ou incompatible avec le type {kind}")
        if isinstance(port, dict) and kind == "array":
            require(len(value) >= port.get("minItems", 0), f"{label} {name} : au moins {port.get('minItems', 0)} éléments requis")
            require(len(value) <= port.get("maxItems", math.inf), f"{label} {name} : maximum de {port.get('maxItems')} éléments dépassé")
            if "items" in port:
                for index, item in enumerate(value):
                    require(_matches(port["items"], item), f"{label} {name} : élément {index + 1} incompatible avec le type {port['items']}")
    return values


def compatible_ports(source, target, *, schema=2, source_direction="outputs", target_direction="inputs"):
    """A producer must guarantee at least what the consumer requires."""
    st, dt = port_type(source), port_type(target)
    if st not in TYPES or dt not in TYPES:
        return False
    if schema == 1:
        return st == dt or "any" in (st, dt)
    if port_required(target, target_direction) and not port_required(source, source_direction):
        return False
    if dt == "any":
        return True
    if st != dt:
        return False
    if st != "array":
        return True
    src, dst = normalized_port(source, source_direction), normalized_port(target, target_direction)
    source_item, target_item = src.get("items", "any"), dst.get("items", "any")
    if target_item != "any" and source_item != target_item:
        return False
    return src.get("minItems", 0) >= dst.get("minItems", 0) and src.get("maxItems", math.inf) <= dst.get("maxItems", math.inf)

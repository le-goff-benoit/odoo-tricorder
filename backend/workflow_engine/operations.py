"""Resolve declarative input references before asking for an exact approval."""
import copy
from .contracts import require


def resolve(node, inputs):
    operation = copy.deepcopy(node.get("operation"))
    if operation is None:
        return None
    def value(item):
        if isinstance(item, dict) and set(item) == {"input"}:
            path = item["input"].split(".")
            current = inputs
            for part in path:
                require(isinstance(current, dict) and part in current,
                        f"{node['id']} : entrée d’opération {item['input']} absente")
                current = current[part]
            return copy.deepcopy(current)
        if isinstance(item, dict):
            return {key: value(child) for key, child in item.items()}
        if isinstance(item, list):
            return [value(child) for child in item]
        return item
    operation = value(operation)
    for key in ("action", "target", "candidate"):
        require(isinstance(operation.get(key), str) and operation[key].strip(),
                f"{node['id']} : {key} exact requis avant décision")
    # Every wired value is visible in the proposal and reaches tool mappings.
    # Explicit parameters take precedence; the full input contract remains bound.
    return {**copy.deepcopy(inputs), **operation, **({"inputs": copy.deepcopy(inputs)} if inputs else {})}

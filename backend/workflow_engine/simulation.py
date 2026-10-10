"""Synthetic data for trying a graph, without performing its business work."""
import copy

from .contracts import condition_outcome, require
from .ports import port_type


def _example(port):
    kind = port_type(port)
    value = {'string': 'Exemple simulé', 'boolean': True, 'number': 0,
             'object': {'simulation': True}, 'array': [], 'any': 'Exemple simulé'}[kind]
    if kind == 'array' and isinstance(port, dict):
        count = port.get('minItems', 0)
        require(count <= 1000, 'Simulation limitée à 1 000 éléments par sortie ; fournissez un exemple plus petit dans un modèle adapté.')
        value = [_example(port.get('items', 'any')) for _ in range(count)]
    return value


def output_examples(graph, node, *, configured=True):
    """Fill missing examples with typed data and respect explicit route choices.

    An explicitly configured example is never silently corrected. The normal
    result validator still rejects bad examples, just as it rejects bad results.
    """
    outputs = copy.deepcopy(node.get('sample_outputs', {})) if configured else {}
    require(isinstance(outputs, dict), f"{node['title']} : les données de simulation doivent être un objet.")
    kinds = node.get('outputs', {})
    route_port = node.get('route_output')
    ports = sorted(kinds, key=lambda name: name != route_port)
    targets = {target['id']: target for target in graph['nodes'] if target['kind'] == 'condition'}
    for name in ports:
        if name in outputs:
            continue
        kind = port_type(kinds[name])
        values = [True, False] if kind == 'boolean' else [_example(kinds[name])]
        if name == route_port and kind == 'string':
            values = node['options']
        active_outcome = outputs.get(route_port, 'done') if route_port else 'done'
        consumers = [targets[edge['to']] for edge in graph['edges']
                     if edge['from'] == node['id'] and edge['to'] in targets
                     and edge.get('outcome', 'done') == active_outcome
                     and edge.get('mapping', {}).get(name) == targets[edge['to']]['parameter']]
        if consumers and kind in {'string', 'any'}:
            values = [value for value in consumers[0]['options']
                      if name != route_port or value in node['options']]
        compatible = [value for value in values if all(condition_outcome(target, value) in target['options'] for target in consumers)]
        require(compatible, f"{node['title']} : aucun exemple compatible pour {name}. Vérifiez le type de donnée et les issues des conditions reliées.")
        outputs[name] = copy.deepcopy(compatible[0])
    return outputs

"""Versioned data guarantees, including absence, composition and simulation."""
import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine.contracts import ContractError, expand, semantic_digest, validate, validate_outputs, validate_result
from workflow_engine.ports import compatible_ports, normalized_port, port_required, validate_port, validate_values
from workflow_engine.simulation import output_examples


def graph(*nodes, schema=2, edges=None, identifier='ports'):
    return {'schema': schema, 'id': identifier, 'title': 'Données', 'nodes': list(nodes), 'edges': edges or []}


def node(identifier='work', **values):
    return {'id': identifier, 'kind': 'task', 'title': 'Travail', **values}


class PortContractTests(unittest.TestCase):
    def test_presence_is_not_truthiness_and_null_is_not_absence(self):
        for kind, value in [('string', ''), ('number', 0), ('boolean', False), ('object', {}), ('array', [])]:
            with self.subTest(kind=kind):
                port = {'type': kind, 'required': True}
                self.assertEqual(validate_values({'value': port}, {'value': value}), {'value': value})
                for invalid in ({}, {'value': None}):
                    with self.assertRaises(ContractError):
                        validate_values({'value': port}, invalid)
                optional = {**port, 'required': False}
                self.assertEqual(validate_values({'value': optional}, {}), {})
                with self.assertRaises(ContractError):
                    validate_values({'value': optional}, {'value': None})
        validate_values({'value': {'type': 'any'}}, {'value': None})
        for invalid in [True, float('inf'), float('nan')]:
            with self.assertRaises(ContractError):
                validate_values({'value': 'number'}, {'value': invalid})

    def test_lists_validate_items_and_both_bounds(self):
        ports = {'intentions': {'type': 'array', 'items': 'string', 'minItems': 1, 'maxItems': 2}}
        for value in (['Une'], ['Une', 'Deux']):
            validate_values(ports, {'intentions': value})
        for value in ([], ['Une', 2], ['Une', None], ['1', '2', '3'], 'Une'):
            with self.subTest(value=value), self.assertRaises(ContractError):
                validate_values(ports, {'intentions': value})
        validate_values({'empty': {'type': 'array', 'items': 'object', 'maxItems': 0}}, {'empty': []})

    def test_descriptor_shape_and_version_are_explicit(self):
        for invalid in ({'type': 'wrong'}, {'type': 'string', 'minItems': 0}, {'type': 'array', 'items': {}},
                        {'type': 'array', 'minItems': True}, {'type': 'array', 'maxItems': -1},
                        {'type': 'array', 'minItems': 3, 'maxItems': 2}, {'type': 'string', 'required': 1},
                        {'type': 'string', 'cardinality': 'many'}):
            with self.subTest(port=invalid), self.assertRaises(ContractError):
                validate_port(invalid)
        with self.assertRaisesRegex(ContractError, 'schéma 2'):
            validate(graph(node(outputs={'v': {'type': 'string'}}), schema=1))
        self.assertFalse(port_required('string', 'inputs'))
        self.assertTrue(port_required('string', 'outputs'))
        self.assertEqual(normalized_port('array', 'inputs'), {'type': 'array', 'required': False})
        self.assertTrue(port_required({'type': 'string'}, 'inputs'))

    def test_covariance_and_list_guarantees(self):
        target = {'type': 'array', 'items': 'string', 'minItems': 1, 'maxItems': 5}
        narrow = {'type': 'array', 'items': 'string', 'minItems': 2, 'maxItems': 3}
        self.assertTrue(compatible_ports(narrow, target))
        for source in ('any', 'array', {'type': 'array', 'items': 'any', 'minItems': 2, 'maxItems': 3},
                       {**narrow, 'required': False}, {**narrow, 'minItems': 0},
                       {**narrow, 'maxItems': 6}, {'type': 'array', 'items': 'string', 'minItems': 2}):
            with self.subTest(source=source):
                self.assertFalse(compatible_ports(source, target))
        self.assertTrue(compatible_ports(narrow, {'type': 'any'}))
        self.assertFalse(compatible_ports({'type': 'string', 'required': False}, {'type': 'any'}))
        self.assertTrue(compatible_ports({'type': 'string', 'required': False}, {'type': 'any', 'required': False}))
        self.assertTrue(compatible_ports('any', 'string', schema=1))
        self.assertFalse(compatible_ports('any', 'string', schema=2))
        self.assertFalse(compatible_ports('array', 'object'))

    def test_graph_edges_use_versioned_directional_guarantees(self):
        value = graph(node('source', outputs={'value': 'any'}), node('target', inputs={'value': 'string'}),
                      edges=[{'id': 'next', 'from': 'source', 'to': 'target', 'mapping': {'value': 'value'}}])
        with self.assertRaisesRegex(ContractError, 'incompatibles'):
            validate(value)
        value['schema'] = 1
        validate(value)
        value['schema'] = 2
        value['nodes'][0]['outputs']['value'] = {'type': 'string', 'required': False}
        value['nodes'][1]['inputs']['value'] = {'type': 'string', 'required': False}
        validate(value)
        value['nodes'][1]['inputs']['value']['required'] = True
        with self.assertRaises(ContractError):
            validate(value)

    def test_required_inputs_are_checked_as_assembled_values(self):
        ports = {'intentions': {'type': 'array', 'items': 'string', 'minItems': 1}}
        with self.assertRaisesRegex(ContractError, 'Entrée intentions absente'):
            validate_values(ports, {}, 'inputs')
        validate_values({'legacy': 'string'}, {}, 'inputs')
        validate_values(ports, {'intentions': ['Faire le plan']}, 'inputs')

    def test_absent_optional_output_does_not_reject_its_successful_producer(self):
        source = node('source', outputs={'value': {'type': 'string', 'required': False}})
        target = node('condition', kind='condition', inputs={'choice': {'type': 'string', 'required': False}},
                      parameter='choice', options=['yes', 'no'])
        definition = graph(source, target, edges=[{'id': 'next', 'from': 'source', 'to': 'condition', 'mapping': {'value': 'choice'}}])
        validate(definition)
        validate_result(definition, source, {'outputs': {}})
        with self.assertRaises(ContractError):
            validate_result(definition, source, {'outputs': {'value': 'invalid'}})

    def test_special_candidate_route_and_question_ports_accept_descriptors_without_weakening_guarantees(self):
        qa = node(candidate_check=True, inputs={'candidate': {'type': 'object'}}, outputs={'verdict': {'type': 'string'}})
        validate(graph(qa))
        qa['outputs']['verdict']['required'] = False
        with self.assertRaises(ContractError):
            validate(graph(qa))
        qa['outputs']['verdict']['required'] = True
        qa['inputs']['candidate']['required'] = False
        with self.assertRaises(ContractError):
            validate(graph(qa))
        route = node(kind='agent', route_output='choice', outputs={'choice': {'type': 'string'}}, options=['yes', 'no'])
        validate(graph(route))
        route['outputs']['choice']['required'] = False
        with self.assertRaises(ContractError):
            validate(graph(route))
        validate(graph(node(kind='question', question='Laquelle ?', outputs={'answer': {'type': 'string'}})))

    def test_subworkflow_composition_keeps_legacy_presence_without_mutating_library(self):
        child = graph(node(inputs={'request': 'string'}, outputs={'result': 'array'}), schema=1, identifier='child')
        original = copy.deepcopy(child)
        parent = graph(node('nested', kind='subworkflow', workflow='child', inputs={'request': 'string'}, outputs={'result': 'array'}))
        resolved = expand(parent, {'child': child})
        work = next(n for n in resolved['nodes'] if n['id'] == 'nested.work')
        self.assertEqual(work['inputs']['request'], {'type': 'string', 'required': False})
        self.assertEqual(work['outputs']['result'], {'type': 'array', 'required': True})
        entry = next(n for n in resolved['nodes'] if n['id'] == 'nested')
        self.assertFalse(entry['outputs']['request']['required'])
        self.assertEqual(child, original)
        parent['schema'], child['schema'] = 1, 2
        with self.assertRaisesRegex(ContractError, 'schéma 1.*schéma 2'):
            expand(parent, {'child': child})

    def test_subworkflow_boundary_checks_covariance_in_the_correct_direction(self):
        child = graph(node(inputs={'request': {'type': 'string'}}, outputs={'result': {'type': 'any'}}), identifier='child')
        parent = graph(node('nested', kind='subworkflow', workflow='child',
                            inputs={'request': {'type': 'string'}}, outputs={'result': {'type': 'string'}}))
        with self.assertRaisesRegex(ContractError, 'incompatible'):
            expand(parent, {'child': child})
        child['nodes'][0]['outputs']['result'] = {'type': 'string'}
        expand(parent, {'child': child})
        parent['nodes'][0]['inputs']['request']['required'] = False
        with self.assertRaisesRegex(ContractError, 'incompatible'):
            expand(parent, {'child': child})

    def test_simulation_generates_typed_bounded_lists_and_preserves_bad_examples(self):
        work = node(outputs={'intentions': {'type': 'array', 'items': 'string', 'minItems': 2, 'maxItems': 3},
                             'result': {'type': 'array', 'items': 'object', 'maxItems': 0},
                             'plan': {'type': 'object'}})
        definition = graph(work)
        values = output_examples(definition, work)
        self.assertEqual(len(values['intentions']), 2)
        self.assertEqual(values['result'], [])
        validate_outputs(work, {'outputs': values})
        work['sample_outputs'] = {'intentions': [None]}
        bad = output_examples(definition, work)
        self.assertEqual(bad['intentions'], [None])
        with self.assertRaises(ContractError):
            validate_outputs(work, {'outputs': bad})

    def test_old_semantic_fingerprint_and_annotation_rules_remain_unchanged(self):
        value = {'schema': 1, 'id': 'legacy', 'title': 'Historique', 'nodes': [
            {'id': 'work', 'title': 'Travail', 'kind': 'task', 'inputs': {'data': 'any'}, 'outputs': {'result': 'array'}}],
            'edges': [], 'annotations': {'business': 'unchanged'}}
        expected = '06f3a92cb3227f91c8d7b416d751f7abf2693666966c026270594a1ad7e51145'
        self.assertEqual(semantic_digest(value), expected)
        value['layout'] = {'notes': []}
        value['nodes'][0]['position'] = {'x': 50, 'y': 80}
        self.assertEqual(semantic_digest(value), expected)
        value['annotations']['business'] = 'changed'
        self.assertNotEqual(semantic_digest(value), expected)


if __name__ == '__main__':
    unittest.main()

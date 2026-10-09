import copy
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, '/home/blegoff/odoo-tricorder/backend')
from workflow_engine import Engine, ContractError, validate
from workflow_engine.simulation import output_examples
from workflow_engine.contracts import validate_result
from workflow_engine.runtime import execute


class Review(unittest.TestCase):
    def graph(self, *, output='string', choices=None, second=None, routed=False):
        producer = {'id': 'work', 'kind': 'agent', 'title': 'Travail synthétique', 'validation': 'contract', 'outputs': {'choice': output}}
        if routed:
            producer.update(route_output='route', options=['active', 'inactive'])
            producer['outputs']['route'] = 'string'
        first = {'id': 'route', 'kind': 'condition', 'title': 'Classement synthétique', 'parameter': 'choice', 'inputs': {'choice': output}, 'options': choices or ['one', 'two']}
        graph = {'schema': 1, 'id': 'review', 'title': 'Relecture synthétique', 'nodes': [producer, first], 'edges': [{'id': 'link', 'from': 'work', 'to': 'route', 'outcome': 'active' if routed else 'done', 'mapping': {'choice': 'choice'}}]}
        if second:
            graph['nodes'].append({**first, 'id': 'other', 'options': second})
            graph['edges'].append({**graph['edges'][0], 'id': 'otherlink', 'to': 'other'})
        validate(graph)
        return graph

    def test_common_intersection_for_multiple_conditions(self):
        graph = self.graph(choices=['one', 'two'], second=['two', 'three'])
        outputs = output_examples(graph, graph['nodes'][0])
        self.assertEqual(outputs, {'choice': 'two'})
        validate_result(graph, graph['nodes'][0], {'outputs': outputs})

    def test_disjoint_conditions_fail_with_correctable_explanation(self):
        graph = self.graph(choices=['one', 'two'], second=['three', 'four'])
        with self.assertRaisesRegex(ContractError, 'aucun exemple compatible pour choice'):
            output_examples(graph, graph['nodes'][0])

    def test_active_routed_branch_only_constrains_samples(self):
        graph = self.graph(choices=['one', 'two'], second=['three', 'four'], routed=True)
        graph['edges'][1]['outcome'] = 'inactive'
        for route, expected in [('active', 'one'), ('inactive', 'three')]:
            graph['nodes'][0]['sample_outputs'] = {'route': route}
            outputs = output_examples(graph, graph['nodes'][0])
            self.assertEqual(outputs, {'route': route, 'choice': expected})
            validate_result(graph, graph['nodes'][0], {'outputs': outputs})

    def test_explicit_invalid_sample_is_never_replaced_with_valid_default(self):
        graph = self.graph(output='boolean', choices=['true', 'false'])
        for sample in ('false', 0, 1, None, [], {}):
            graph['nodes'][0]['sample_outputs'] = {'choice': sample}
            outputs = output_examples(graph, graph['nodes'][0])
            self.assertEqual(outputs, {'choice': sample})
            with self.assertRaisesRegex(ContractError, 'boolean'):
                validate_result(graph, graph['nodes'][0], {'outputs': outputs})

    def test_examples_are_deep_copied_without_mutating_definition(self):
        graph = self.graph(output='object')
        graph['edges'] = []
        graph['nodes'][0]['sample_outputs'] = {'choice': {'nested': ['initial']}}
        before = copy.deepcopy(graph)
        output_examples(graph, graph['nodes'][0])['choice']['nested'].append('changed')
        self.assertEqual(graph, before)
        self.assertEqual(output_examples(graph, graph['nodes'][0], configured=False), {'choice': {'simulation': True}})

    def test_simulation_agent_with_capability_never_calls_tool_or_provider(self):
        graph = self.graph(output='boolean', choices=['true', 'false'])
        graph['nodes'][0]['capabilities'] = [{'plugin': 'inert-plugin', 'operation': 'inert-operation'}]
        with tempfile.TemporaryDirectory(prefix='tricorder-review-sim-') as directory:
            engine = Engine(directory)
            project = engine.create_project('Projet synthétique de relecture')
            run = engine.start(project['id'], graph, simulation=True)
            claim = engine.claim(run['id'], 'work')
            with patch('workflow_engine.runtime.time.sleep'), patch('connectors.tool_runtime.execute_tool') as tool, patch('workflow_engine.runtime.execute_text') as provider, patch('workflow_engine.runtime.subprocess.Popen') as process:
                execute(engine, run['id'], 'work', claim['token'])
                tool.assert_not_called()
                provider.assert_not_called()
                process.assert_not_called()
            actual = engine.run(run['id'])
            self.assertEqual(actual['nodes']['route']['outcome'], 'true')
            self.assertTrue(actual['simulation'])
            self.assertTrue(actual['nodes']['work']['result']['simulated'])

    def test_invalid_nonobject_samples_fail_without_tool_or_false_success(self):
        graph = self.graph()
        graph['nodes'][0]['sample_outputs'] = ['invalid']
        with tempfile.TemporaryDirectory(prefix='tricorder-review-sim-') as directory:
            engine = Engine(directory)
            project = engine.create_project('Projet synthétique de relecture')
            run = engine.start(project['id'], graph, simulation=True)
            claim = engine.claim(run['id'], 'work')
            with patch('workflow_engine.runtime.time.sleep'), patch('workflow_engine.runtime.execute_text') as provider, patch('workflow_engine.runtime.subprocess.Popen') as process:
                execute(engine, run['id'], 'work', claim['token'])
                provider.assert_not_called()
                process.assert_not_called()
            actual = engine.run(run['id'])
            self.assertEqual(actual['nodes']['work']['status'], 'returned')
            self.assertFalse(actual['nodes']['work']['result']['ok'])
            self.assertIn('doivent être un objet', actual['nodes']['work']['result']['summary'])
            self.assertEqual(actual['nodes']['route']['status'], 'pending')


if __name__ == '__main__':
    unittest.main(verbosity=2)

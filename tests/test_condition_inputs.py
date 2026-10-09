"""Business rules route typed input; injected results are not model evidence."""
import copy
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine


class ConditionInputTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.engine = Engine(temporary.name)
        self.project = self.engine.create_project('Demandes synthétiques')
        self.graph = {'schema': 1, 'id': 'priority', 'title': 'Priorité de la demande', 'nodes': [
            {'id': 'assess', 'kind': 'task', 'title': 'Évaluer la priorité', 'outputs': {'critical': 'boolean'}, 'validation': 'contract'},
            {'id': 'route', 'kind': 'condition', 'title': 'Demande critique ?', 'inputs': {'critical': 'boolean'}, 'parameter': 'critical', 'options': ['true', 'false']},
            {'id': 'urgent', 'kind': 'decision', 'title': 'Autoriser le traitement urgent', 'question': 'Traiter en priorité ?', 'options': ['approve', 'reject']},
            {'id': 'normal', 'kind': 'decision', 'title': 'Autoriser le traitement normal', 'question': 'Traiter dans le délai normal ?', 'options': ['approve', 'reject']},
        ], 'edges': [
            {'id': 'value', 'from': 'assess', 'to': 'route', 'mapping': {'critical': 'critical'}},
            {'id': 'critical', 'from': 'route', 'to': 'urgent', 'outcome': 'true'},
            {'id': 'ordinary', 'from': 'route', 'to': 'normal', 'outcome': 'false'},
        ]}

    def receive(self, value, graph=None):
        run = self.engine.start(self.project['id'], graph or self.graph, simulation=True)
        claim = self.engine.claim(run['id'], 'assess')
        self.engine.submit(run['id'], 'assess', claim['token'], {'ok': True, 'summary': 'Classement synthétique.', 'outputs': {'critical': value}, 'simulated': True})
        return self.engine.run(run['id'])

    def test_boolean_true_and_false_select_one_branch_and_keep_its_human_decision(self):
        for value, active, other in ((True, 'urgent', 'normal'), (False, 'normal', 'urgent')):
            with self.subTest(value=value):
                run = self.receive(value)
                self.assertEqual(run['nodes']['assess']['status'], 'accepted')
                self.assertEqual(run['nodes']['route']['outcome'], str(value).lower())
                self.assertIs(run['nodes']['route']['inputs']['critical'], value)
                self.assertEqual(run['nodes'][active]['status'], 'waiting')
                self.assertEqual(run['nodes'][other]['status'], 'skipped')
                self.assertNotIn('decision', run['nodes'][active])

    def test_strings_numbers_and_null_are_not_coerced_into_boolean_results(self):
        for value in ('true', 'false', 1, 0, None):
            with self.subTest(value=value):
                run = self.receive(value)
                self.assertEqual(run['nodes']['assess']['status'], 'returned')
                self.assertIn('boolean', run['nodes']['assess']['validation_error'])
                self.assertEqual(run['nodes']['route']['status'], 'pending')

    def test_boolean_does_not_guess_the_meaning_of_arbitrary_outcome_names(self):
        graph = copy.deepcopy(self.graph)
        graph['nodes'][1]['options'] = ['urgent', 'normal']
        graph['edges'][1]['outcome'] = 'urgent'
        graph['edges'][2]['outcome'] = 'normal'
        run = self.receive(True, graph)
        self.assertEqual(run['nodes']['assess']['status'], 'returned')
        self.assertEqual(run['nodes']['route']['status'], 'pending')
        self.assertNotIn('decision', run['nodes']['urgent'])

    def test_boolean_workflow_parameter_uses_the_same_explicit_outcomes(self):
        graph = copy.deepcopy(self.graph)
        graph['nodes'] = graph['nodes'][1:]
        graph['edges'] = graph['edges'][1:]
        graph['nodes'][0].pop('inputs')
        run = self.engine.start(self.project['id'], graph, simulation=True, parameters={'critical': False})
        self.assertEqual(run['nodes']['route']['outcome'], 'false')
        self.assertEqual(run['nodes']['normal']['status'], 'waiting')
        self.assertEqual(run['nodes']['urgent']['status'], 'skipped')

    def test_custom_workflow_simulation_produces_typed_values_and_keeps_the_human_gate(self):
        from workflow_engine.runtime import execute
        graph = copy.deepcopy(self.graph)
        graph['nodes'][0]['outputs'].update({'message': 'string', 'count': 'number', 'details': 'object', 'items': 'array'})
        run = self.engine.start(self.project['id'], graph, simulation=True)
        claim = self.engine.claim(run['id'], 'assess')
        with patch('workflow_engine.runtime.time.sleep'), patch('workflow_engine.runtime.execute_text') as provider, patch('workflow_engine.runtime.subprocess.Popen') as process:
            execute(self.engine, run['id'], 'assess', claim['token'])
            provider.assert_not_called(); process.assert_not_called()
        received = self.engine.run(run['id'])
        result = received['nodes']['assess']['result']
        self.assertEqual(received['nodes']['assess']['status'], 'accepted')
        self.assertIs(result['outputs']['critical'], True)
        self.assertEqual(result['outputs']['count'], 0)
        self.assertEqual(result['outputs']['items'], [])
        self.assertTrue(result['outputs']['details']['simulation'])
        self.assertTrue(result['simulated'])
        self.assertTrue(result['summary'].startswith('SIMULATION'))
        self.assertEqual(received['nodes']['urgent']['status'], 'waiting')

    def test_simulated_text_choice_matches_the_connected_condition(self):
        from workflow_engine.simulation import output_examples
        graph = copy.deepcopy(self.graph)
        graph['nodes'][0]['outputs'] = {'critical': 'string'}
        graph['nodes'][1]['inputs'] = {'critical': 'string'}
        graph['nodes'][1]['options'] = ['critical', 'normal', 'unknown']
        self.assertEqual(output_examples(graph, graph['nodes'][0]), {'critical': 'critical'})

    def test_configured_simulation_values_are_preserved_including_invalid_examples(self):
        from workflow_engine.runtime import execute
        for value, status in ((False, 'accepted'), ('false', 'returned')):
            with self.subTest(value=value):
                graph = copy.deepcopy(self.graph)
                graph['nodes'][0]['sample_outputs'] = {'critical': value}
                run = self.engine.start(self.project['id'], graph, simulation=True)
                claim = self.engine.claim(run['id'], 'assess')
                with patch('workflow_engine.runtime.time.sleep'):
                    execute(self.engine, run['id'], 'assess', claim['token'])
                received = self.engine.run(run['id'])
                self.assertEqual(received['nodes']['assess']['status'], status)
                self.assertEqual(received['nodes']['assess']['result']['outputs']['critical'], value)
                self.assertTrue(received['nodes']['assess']['result']['simulated'])
                if status == 'accepted':
                    self.assertEqual(received['nodes']['normal']['status'], 'waiting')
                else:
                    self.assertEqual(received['nodes']['route']['status'], 'pending')


if __name__ == '__main__':
    unittest.main()

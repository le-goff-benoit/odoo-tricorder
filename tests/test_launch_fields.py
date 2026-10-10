import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from native_cli_fixture import use_native_cli_fixtures
from workflow_engine import Engine, ContractError
from workflow_engine.contracts import validate, expand
from workflow_engine.conversations import Conversations
from workflow_engine.schedules import Schedules
from workflow_engine.portable import export, preview
from workflow_cli import request as cli_request
from studio import request


class LaunchFieldsTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        use_native_cli_fixtures(self, temp.name)
        self.engine = Engine(Path(temp.name) / 'state')
        self.project = self.engine.create_project('Demandes')
        self.graph = {'schema': 2, 'id': 'formulaire', 'title': 'Analyse',
                      'nodes': [{'id': 'analyse', 'title': 'Analyser', 'kind': 'agent', 'validation': 'contract'}], 'edges': [],
                      'launch_fields': [{'key': 'Canal', 'label': 'Canal de réponse', 'type': 'choice', 'required': True, 'options': ['Email', 'Ticket Odoo']},
                                        {'key': 'Nombre', 'label': 'Nombre', 'type': 'number', 'required': True},
                                        {'key': 'Urgent', 'label': 'Urgent ?', 'type': 'boolean', 'required': True},
                                        {'key': 'Details', 'label': 'Précisions', 'type': 'text', 'required': False}],
                      'parameters': {'Details': 'Valeur suggérée'}, 'parameter_labels': {'Details': 'Précisions'}}
        self.values = {'Canal': 'Email', 'Nombre': 0, 'Urgent': False, 'Details': None}

    def test_actual_and_simulated_starts_validate_before_persisting_and_keep_false_zero_null(self):
        for simulation in (True, False):
            with self.subTest(simulation=simulation):
                with self.engine.store.connect() as db:
                    before = db.execute('SELECT count(*) FROM runs').fetchone()[0]
                for key, invalid in [('Canal', '  '), ('Canal', 'Autre'), ('Urgent', 'false'), ('Nombre', True), ('Nombre', float('inf'))]:
                    with self.assertRaises(ContractError):
                        self.engine.start(self.project['id'], self.graph, simulation=simulation, parameters={**self.values, key: invalid})
                with self.engine.store.connect() as db:
                    self.assertEqual(db.execute('SELECT count(*) FROM runs').fetchone()[0], before)
                run = self.engine.start(self.project['id'], self.graph, simulation=simulation, parameters=self.values)
                self.assertEqual(run['parameters'], self.values)
                self.assertEqual(self.graph['parameters']['Details'], 'Valeur suggérée')

    def test_definition_rejects_reserved_duplicate_unknown_and_broken_labels(self):
        for change in ({'key': 'request'}, {'type': 'mystery'}, {'options': ['Email', 'Email']}, {'label': ' '}, {'required': 1}):
            graph = copy.deepcopy(self.graph)
            graph['launch_fields'][0].update(change)
            with self.assertRaises(ContractError):
                validate(graph)
        for path, value in [('parameter_labels', {'unknown': 'Absent'}), ('launch_fields', self.graph['launch_fields'] * 2)]:
            graph = {**self.graph, path: value}
            with self.assertRaises(ContractError):
                validate(graph)
        graph = copy.deepcopy(self.graph)
        graph['nodes'][0]['port_labels'] = {'outputs': {'missing': 'Absent'}}
        with self.assertRaises(ContractError):
            validate(graph)

    def test_conversation_answers_are_per_request_idempotent_and_available_to_agents(self):
        opened = request(self.engine, {'action': 'conversation.open', 'project': self.project['id'], 'graph': self.graph,
                                      'provider': 'codex', 'request': 'Première demande', 'parameters': self.values})
        self.assertEqual(opened['definition']['parameters'], self.graph['parameters'])
        cid = opened['id']
        next_values = {**self.values, 'Canal': 'Ticket Odoo', 'Details': 'Autre demande'}
        item = cli_request(self.engine, cid, 'add', {'request': 'Deuxième', 'key': 'second', 'parameters': next_values})
        same = Conversations(self.engine).add(cid, 'Deuxième', key='second', parameters=next_values)
        self.assertEqual(item, same)
        with self.assertRaises(ContractError):
            Conversations(self.engine).add(cid, 'Deuxième', key='second', parameters=self.values)
        with self.assertRaises(ContractError):
            Conversations(self.engine).add(cid, 'Deuxième', key='second', parameters={**next_values, 'Urgent': 0})
        with self.assertRaises(ContractError):
            Conversations(self.engine).add(cid, 'Oublié')
        self.assertEqual(self.engine.run(opened['items'][0]['run'])['parameters']['Canal'], 'Email')
        self.assertEqual(self.engine.run(item['run'])['parameters']['Canal'], 'Ticket Odoo')
        self.assertEqual(Conversations(self.engine).get(cid)['definition']['parameters'], self.graph['parameters'])

    def test_conversation_context_overrides_caller_values(self):
        service = Conversations(self.engine)
        opened = service.open(self.project['id'], self.graph, 'codex')
        with patch('workflow_engine.packs.conversation_parameters', return_value={'series': '19.0', 'platform': 'sh'}):
            item = service.add(opened['id'], 'Demande', parameters={**self.values, 'request': 'faux', 'conversation': 'autre', 'series': '14.0', 'platform': 'online', 'depends_on_runs': ['inconnu']})
        values = self.engine.run(item['run'])['parameters']
        self.assertEqual((values['request'], values['conversation'], values['series'], values['platform'], values['depends_on_runs']), ('Demande', opened['id'], '19.0', 'sh', []))

    def test_invalid_initial_form_leaves_no_conversation(self):
        with self.assertRaises(ContractError):
            Conversations(self.engine).open(self.project['id'], self.graph, 'codex', initial_request='Incomplet')
        self.assertEqual(Conversations(self.engine).list(), [])

    def test_schedule_validates_answers_and_freezes_them_without_modifying_model(self):
        scheduler = Schedules(self.engine)
        rule = {'kind': 'interval', 'minutes': 5}
        with self.assertRaises(ContractError):
            scheduler.create(self.project['id'], self.graph, rule, simulation=True)
        schedule = scheduler.create(self.project['id'], self.graph, rule, simulation=True, now=1000, parameters=self.values)
        self.assertEqual(schedule['definition']['parameters'], self.graph['parameters'])
        self.values['Canal'] = 'Ticket Odoo'
        self.graph['launch_fields'][0]['options'] = ['Autre']
        run = scheduler.tick(now=1301)[0]
        self.assertEqual(run['parameters']['Canal'], 'Email')
        self.assertIsNone(run['parameters']['Details'])
        self.assertEqual(scheduler.list()[0]['parameters']['Canal'], 'Email')

    def test_condition_uses_launch_answer_despite_empty_local_parameters(self):
        graph = copy.deepcopy(self.graph)
        graph['nodes'] = [{'id': 'route', 'title': 'Acheminer', 'kind': 'condition', 'parameter': 'Urgent', 'options': ['true', 'false'], 'parameters': {}}]
        run = self.engine.start(self.project['id'], graph, simulation=True, parameters=self.values)
        self.assertEqual(run['nodes']['route']['outcome'], 'false')

    def test_portable_form_and_labels_roundtrip_and_component_boundaries(self):
        self.assertEqual(preview(export(self.graph, {}))['bundle']['workflow']['launch_fields'], self.graph['launch_fields'])
        component = {'schema': 2, 'id': 'component', 'title': 'Composant', 'nodes': [{'id': 'inside', 'kind': 'task', 'title': 'Lire', 'inputs': {'source': 'string'}, 'outputs': {'result': 'string'}, 'port_labels': {'inputs': {'source': 'Réunion choisie'}, 'outputs': {'result': 'Compte rendu'}}}], 'edges': []}
        graph = {'schema': 2, 'id': 'parent', 'title': 'Parent', 'nodes': [{'id': 'child', 'kind': 'subworkflow', 'workflow': 'component', 'title': 'Réunion', 'inputs': {'source': 'string'}, 'outputs': {'result': 'string'}, 'port_labels': {'inputs': {'source': 'Réunion choisie'}, 'outputs': {'result': 'Compte rendu'}}}], 'edges': []}
        expanded = expand(graph, {'component': component})
        nodes = {node['id']: node for node in expanded['nodes']}
        self.assertEqual(nodes['child']['port_labels']['outputs'], {'source': 'Réunion choisie'})
        self.assertEqual(nodes['child.exit']['port_labels'], {'inputs': {'result': 'Compte rendu'}, 'outputs': {'result': 'Compte rendu'}})
        self.assertEqual(nodes['child.inside']['port_labels'], component['nodes'][0]['port_labels'])
        component['launch_fields'] = copy.deepcopy(self.graph['launch_fields'])
        with self.assertRaisesRegex(ContractError, 'formulaire de lancement'):
            expand(graph, {'component': component})

    def test_natural_condition_values_route_exactly_without_relaxing_identifiers_or_decisions(self):
        graph = copy.deepcopy(self.graph)
        graph['nodes'] = [
            {'id': 'route', 'title': 'Acheminer', 'kind': 'condition', 'parameter': 'Canal', 'options': ['Email', 'Ticket Odoo'], 'parameters': {}},
            {'id': 'email', 'title': 'Email', 'kind': 'task'},
            {'id': 'ticket', 'title': 'Ticket', 'kind': 'task'}]
        graph['edges'] = [{'id': 'vers-email', 'from': 'route', 'to': 'email', 'outcome': 'Email'},
                          {'id': 'vers-ticket', 'from': 'route', 'to': 'ticket', 'outcome': 'Ticket Odoo'}]
        for choice, ready, skipped in [('Email', 'email', 'ticket'), ('Ticket Odoo', 'ticket', 'email')]:
            run = self.engine.start(self.project['id'], graph, simulation=True, parameters={**self.values, 'Canal': choice})
            self.assertEqual(run['nodes']['route']['outcome'], choice)
            self.assertEqual(run['nodes'][ready]['status'], 'ready')
            self.assertEqual(run['nodes'][skipped]['status'], 'skipped')
        for bad in [' ', 'ligne\nsuivante', 'x' * 201]:
            broken = copy.deepcopy(graph)
            broken['nodes'][0]['options'][1] = bad
            with self.assertRaises(ContractError):
                validate(broken)
        for change in [{'kind': 'decision'}, {'id': 'nom invalide'}, {'inputs': {'port invalide': 'string'}}]:
            broken = copy.deepcopy(graph)
            broken['nodes'][0].update(change)
            with self.assertRaises(ContractError):
                validate(broken)
        # Generated boundary edge IDs must remain technical identifiers even
        # when a component's condition ends with a natural business value.
        component = {'schema': 2, 'id': 'component', 'title': 'Composant',
                     'nodes': [graph['nodes'][0]], 'edges': []}
        parent = {'schema': 2, 'id': 'parent', 'title': 'Parent',
                  'nodes': [{'id': 'child', 'kind': 'subworkflow', 'workflow': 'component', 'title': 'Choisir', 'options': ['Email', 'Ticket Odoo']}], 'edges': []}
        expanded = expand(parent, {'component': component})
        self.assertIn('Ticket Odoo', [edge.get('outcome') for edge in expanded['edges']])
        validate(expanded)

    def test_schedule_bridge_passes_answers_as_frozen_execution_parameters(self):
        schedule = request(self.engine, {'action': 'schedule.create', 'project': self.project['id'], 'graph': self.graph,
                                         'rule': {'kind': 'interval', 'minutes': 5}, 'simulation': True, 'parameters': self.values})
        self.assertEqual(schedule['parameters'], self.values)
        self.assertEqual(schedule['definition']['parameters'], self.graph['parameters'])
        run = Schedules(self.engine).tick(now=schedule['next'] + 1)[0]
        self.assertEqual(run['parameters'], self.values)

    def test_provider_prompt_contains_launch_answers_local_settings_and_authoritative_request(self):
        from workflow_engine.runtime import execute
        for provider in ('codex', 'claude'):
            with self.subTest(provider=provider):
                graph = copy.deepcopy(self.graph)
                graph['nodes'][0].update(provider=provider, model='synthetic-model', parameters={'tone': 'concis', 'shared': 'local', 'request': 'Ne pas substituer'})
                values = {**self.values, 'request': 'Analyser la réunion choisie', 'shared': 'global'}
                run = self.engine.start(self.project['id'], graph, parameters=values)
                root = self.engine.store.directory.parent
                prompt_file = root / ('prompt-' + provider + '.json')
                script = root / ('inert-' + provider + '.py')
                response = {'summary': 'Fixture', 'question': '', 'outputs_json': '{}'}
                events = ([{'type': 'item.completed', 'item': {'type': 'agent_message', 'text': json.dumps(response)}}, {'type': 'turn.completed'}]
                          if provider == 'codex' else [{'type': 'result', 'structured_output': response}])
                script.write_text('import sys, pathlib\npathlib.Path(' + repr(str(prompt_file)) + ').write_text(sys.stdin.read())\nprint(' + repr('\n'.join(json.dumps(event) for event in events)) + ')\n')
                claim = self.engine.claim(run['id'], 'analyse')
                with patch('connectors.providers.command', return_value=[sys.executable, str(script)]):
                    execute(self.engine, run['id'], 'analyse', claim['token'])
                prompt = json.loads(prompt_file.read_text())
                self.assertEqual(prompt['parameters'], {**values, 'tone': 'concis', 'shared': 'local'})
                self.assertEqual(self.engine.run(run['id'])['nodes']['analyse']['status'], 'accepted')

    def test_tool_payload_contains_launch_answers_and_local_settings_without_context_substitution(self):
        from connectors.tool_runtime import execute_tool
        graph = copy.deepcopy(self.graph)
        graph['nodes'][0].update(kind='document', validation='automatic', parameters={'scope': 'compte rendu', 'request': 'Ne pas substituer'}, capabilities=[{'plugin': 'fixture', 'operation': 'read'}])
        values = {**self.values, 'request': 'Lire les réunions choisies'}
        record = {'config': {'argv': ['/fixture']}, 'identity': 'synthetic-account', 'descriptor': 'fixture', 'operations': {'read': 'read'}, 'tool_digest': None}
        calls = []
        def exchange(config, payload, **kwargs):
            if payload['action'] == 'describe':
                return {'connected': True, **{key: record[key] for key in ('identity', 'operations', 'tool_digest')}}
            calls.append(payload)
            return {'ok': True, 'identity': record['identity'], 'outputs': {}}
        with patch('workflow_engine.integrations.issues', return_value=[]), patch('connectors.local_tools.approved', return_value=record), patch('connectors.tool_runtime.approved', return_value=record), patch('connectors.tool_runtime.exchange', side_effect=exchange):
            run = self.engine.start(self.project['id'], graph, parameters=values)
            claim = self.engine.claim(run['id'], 'analyse')
            result = execute_tool(self.engine, claim['run'], claim['node'], claim['token'])
        self.assertTrue(result['ok'])
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0]['arguments']['parameters'], {**values, 'scope': 'compte rendu'})
        self.assertEqual(self.engine.run(run['id'])['parameters'], values)

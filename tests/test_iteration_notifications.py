"""Launch grants include mandatory per-item work, never optional actions."""
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import test_associated_actions as fixtures
from native_cli_fixture import use_native_cli_fixtures
from connectors.local_tools import inspect, qualify
from workflow_engine import ContractError
from workflow_engine.contracts import digest
from workflow_engine.conversations import Conversations
from workflow_engine.associated_actions import check_current
from workflow_engine.iterations import activate
from workflow_engine.runtime import preflight
from workflow_engine.schedules import Schedules
from studio import request


class IterationNotificationTests(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.AssociatedActionTests()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.engine, self.project = self.fixture.engine, self.fixture.project
        use_native_cli_fixtures(self, self.fixture.root)
        self.fixture.connect()

    def graph(self, child=None):
        array = {'type': 'array', 'items': 'object', 'maxItems': 100}
        graph = fixtures.graph(
            {'id': 'prepare', 'title': 'Préparer', 'kind': 'agent', 'validation': 'contract', 'outputs': {'items': array}},
            {'id': 'each', 'title': 'Notifier chaque élément', 'kind': 'foreach', 'inputs': {'items': array},
             'outputs': {'results': array}, 'workflow': child or self.fixture.notification()['workflow']},
            defaults={'provider': 'codex', 'model': 'synthetic-no-model-called'})
        graph['edges'] = [{'id': 'items', 'from': 'prepare', 'to': 'each', 'mapping': {'items': 'items'}}]
        return graph

    def ready(self, run, items=None):
        claim = self.engine.claim(run['id'], 'prepare')
        return self.engine.submit(run['id'], 'prepare', claim['token'], {
            'ok': True, 'summary': 'Liste synthétique', 'outputs': {'items': items or [{'id': 'one', 'title': 'Élément'}]}})

    def change_connection(self, project):
        path = Path(project['path']) / '.tricorder/plugins.json'
        manifest = json.loads(path.read_text())
        manifest['plugins'][0]['title'] += ' — nouvelle connexion examinée'
        path.write_text(json.dumps(manifest))
        return qualify(self.engine, project, 'fixture', digest(inspect(self.engine, project, 'fixture')), human=True)

    def test_preview_includes_child_notifications_and_launch_requires_exact_grant(self):
        graph = self.graph()
        preview = request(self.engine, {'action': 'workflow.validate', 'project': self.project['id'], 'graph': graph})
        self.assertEqual(preview['issues'], [])
        self.assertEqual([n['recipient'] for n in preview['notifications']], ['synthetic-channel'])
        with self.assertRaisesRegex(ContractError, 'Autoriser explicitement'):
            self.engine.start(self.project['id'], graph)
        run = self.ready(self.engine.start(self.project['id'], graph, notifications_authorized=True))
        self.assertIn('fixture', run['transports'])
        parent = activate(self.engine, run['id'], 'each')
        child = self.engine.run(parent['nodes']['each']['children'][0]['run'])
        self.assertEqual(child['transports'], parent['transports'])
        self.assertFalse((self.fixture.root / 'calls.jsonl').exists())

    def test_changed_connection_cannot_inherit_previous_parent_authorization(self):
        run = self.ready(self.engine.start(self.project['id'], self.graph(), notifications_authorized=True))
        self.change_connection(self.project)
        with self.assertRaisesRegex(ContractError, 'connexion modifiée depuis le lancement'):
            activate(self.engine, run['id'], 'each')
        self.assertEqual(len(self.engine.runs(self.project['id'])), 1)
        self.assertEqual(self.engine.run(run['id'])['nodes']['each']['status'], 'ready')
        self.assertFalse((self.fixture.root / 'calls.jsonl').exists())

    def test_cross_project_change_is_checked_before_creating_any_child(self):
        other = self.engine.create_project('Deuxième projet synthétique')
        source = Path(self.project['path']) / '.tricorder/plugins.json'
        (Path(other['path']) / '.tricorder/plugins.json').write_bytes(source.read_bytes())
        qualify(self.engine, other, 'fixture', digest(inspect(self.engine, other, 'fixture')), human=True)
        service = Conversations(self.engine)
        conversation = service.open(self.project['id'], self.graph(), 'codex', [other['id']], notifications_authorized=True)
        item = service.add(conversation['id'], 'Deux projets, même autorisation examinée')
        run = self.ready(self.engine.run(item['run']), [{'id': 'one'}, {'id': 'two', 'project': other['id']}])
        self.change_connection(other)
        with self.assertRaisesRegex(ContractError, 'connexion modifiée depuis le lancement'):
            activate(self.engine, run['id'], 'each')
        self.assertEqual(len(self.engine.runs(self.project['id'])), 1)
        self.assertEqual(self.engine.runs(other['id']), [])

    def test_read_tool_in_child_is_not_mistaken_for_question_notification(self):
        child = fixtures.graph({'id': 'read', 'title': 'Lire', 'kind': 'document', 'validation': 'automatic',
                                'capabilities': [{'plugin': 'fixture', 'operation': 'lookup'}]}, identifier='read-child')
        self.assertEqual(preflight(self.graph(child), project=self.project, engine=self.engine), [])
        run = self.ready(self.engine.start(self.project['id'], self.graph(child)))
        self.assertEqual(activate(self.engine, run['id'], 'each')['nodes']['each']['status'], 'waiting_children')

    def test_child_question_notifications_are_in_scope_but_optional_actions_are_not(self):
        child = fixtures.graph(fixtures.doc(), identifier='question-child', on_question={'plugin': 'fixture', 'operation': 'send', 'recipient': 'synthetic-channel'})
        graph = self.graph(child)
        graph['actions'] = [fixtures.associated(self.fixture.notification()['workflow'], source='prepare')]
        preview = request(self.engine, {'action': 'workflow.validate', 'project': self.project['id'], 'graph': graph})
        self.assertEqual(len(preview['notifications']), 1)
        optional_only = fixtures.graph(fixtures.doc(), actions=[self.fixture.notification()])
        preview = request(self.engine, {'action': 'workflow.validate', 'project': self.project['id'], 'graph': optional_only})
        self.assertEqual(preview['notifications'], [])
        self.engine.start(self.project['id'], optional_only)  # no unrelated notification grant

    def test_schedule_cannot_defer_discovery_of_required_notification_consent(self):
        rule = {'frequency': 'daily', 'time': '09:00', 'timezone': 'Europe/Zurich'}
        with self.assertRaisesRegex(ContractError, 'Autoriser explicitement'):
            Schedules(self.engine).create(self.project['id'], self.graph(), rule)

    def test_local_foreach_in_associated_action_retains_main_terminal_context(self):
        child = self.graph(fixtures.graph(fixtures.doc(), identifier='leaf'))
        action = fixtures.associated(child)
        main = fixtures.graph(fixtures.doc(validation='contract'), identifier='primary', actions=[action])
        service = Conversations(self.engine)
        conversation = service.open(self.project['id'], main, 'codex')
        item = service.add(conversation['id'], 'Résultat puis éléments facultatifs')
        claim = self.engine.claim(item['run'], 'work')
        run = self.engine.submit(item['run'], 'work', claim['token'], {'ok': True, 'summary': 'Principal terminé'})
        run = fixtures.activate(self.engine, run['id'], run['associated_actions'][0]['id'], human=True)
        action_run = self.ready(self.engine.run(run['associated_actions'][0]['run']))
        coordinated = activate(self.engine, action_run['id'], 'each')
        child_id = coordinated['nodes']['each']['children'][0]['run']
        self.assertEqual(service.checked_run(conversation['id'], child_id)['id'], child_id)
        self.assertEqual(self.engine.run(run['id'])['status'], 'completed')

    def test_question_notification_obeys_principal_pause_through_optional_family(self):
        leaf = fixtures.graph({'id': 'question', 'kind': 'question', 'title': 'Préciser', 'question': 'Quel destinataire ?'},
                              identifier='leaf-question', on_question={'plugin': 'fixture', 'operation': 'send', 'recipient': 'synthetic-channel'})
        main = fixtures.graph(fixtures.doc(validation='contract'),
                              {'id': 'hold', 'kind': 'question', 'title': 'Réception', 'question': 'Continuer ?'},
                              identifier='principal', actions=[fixtures.associated(self.graph(leaf))])
        run = self.engine.start(self.project['id'], main)
        claim = self.engine.claim(run['id'], 'work')
        run = self.engine.submit(run['id'], 'work', claim['token'], {'ok': True, 'summary': 'Prêt'})
        run = fixtures.activate(self.engine, run['id'], run['associated_actions'][0]['id'], human=True)
        action = self.ready(self.engine.run(run['associated_actions'][0]['run']))
        action = activate(self.engine, action['id'], 'each')
        child = self.engine.run(action['nodes']['each']['children'][0]['run'])
        notification = self.engine.run(child['nodes']['question']['question']['notification']['run'])
        self.engine.control(run['id'], 'pause')
        with self.assertRaisesRegex(ContractError, 'suspendue'):
            self.engine.claim(notification['id'], 'question-notification')
        self.engine.control(run['id'], 'resume')
        self.engine.claim(notification['id'], 'question-notification')
        self.engine.control(run['id'], 'pause')
        with self.assertRaisesRegex(ContractError, 'suspendue'):
            check_current(self.engine, notification)
        self.engine.control(run['id'], 'resume')
        check_current(self.engine, notification)
        self.assertFalse((self.fixture.root / 'calls.jsonl').exists())

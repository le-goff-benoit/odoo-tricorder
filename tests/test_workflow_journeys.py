"""User journeys independent of Odoo, providers and application state directories."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from native_cli_fixture import use_native_cli_fixtures

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.contracts import digest
from workflow_engine.conversations import Conversations, answer
from workflow_engine.documentation import export_work
from workflow_engine.work_templates import templates


class WorkJourneys(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        use_native_cli_fixtures(self, self.root)
        self.engine = Engine(self.root / 'state')
        self.project = self.engine.create_project('Projet documentaire')
        self.graph = next(g for g in templates() if g['id'] == 'meeting-conversation')

    def test_fresh_install_adopts_versioned_workflow_without_changing_git_file(self):
        graph = self.engine.save(self.project['id'], self.graph)
        graph['title'] = 'Compte rendu hebdomadaire'
        graph = self.engine.save(self.project['id'], graph, 1)
        file = self.engine.workflow_path(self.project['id'], graph['id'])
        original = file.read_bytes()
        fresh = Engine(self.root / 'fresh-state')
        project = fresh.create_project('Même dépôt', self.project['path'])
        found = fresh.repository_workflows(project['id'])
        self.assertEqual(found[0]['status'], 'new')
        adopted = fresh.import_repository_workflow(project['id'], graph['id'], found[0]['digest'])
        self.assertEqual(adopted, graph)
        self.assertEqual(file.read_bytes(), original)
        self.assertEqual(fresh.runs(project['id']), [])
        self.assertEqual(fresh.repository_workflows(project['id'])[0]['status'], 'current')
        with self.assertRaises(ContractError):
            fresh.import_repository_workflow(project['id'], graph['id'], found[0]['digest'])
        adopted['description'] = 'Adaptation locale'
        self.assertEqual(fresh.save(project['id'], adopted, 2)['revision'], 3)

    def test_repository_inspection_isolates_invalid_file_and_refuses_changed_or_linked_file(self):
        folder = Path(self.project['path']) / '.tricorder/workflows'
        folder.mkdir()
        file = folder / (self.graph['id'] + '.json')
        file.write_text(json.dumps(self.graph))
        (folder / 'broken.json').write_text('{bad')
        found = self.engine.repository_workflows(self.project['id'])
        self.assertEqual({f['status'] for f in found}, {'new', 'invalid'})
        preview = next(f for f in found if f['status'] == 'new')
        changed = copy.deepcopy(self.graph); changed['title'] = 'Autre contenu'
        file.write_text(json.dumps(changed))
        with self.assertRaisesRegex(ContractError, 'changé'):
            self.engine.import_repository_workflow(self.project['id'], self.graph['id'], preview['digest'])
        file.unlink(); file.symlink_to(self.root / 'outside.json')
        with self.assertRaises(ContractError):
            self.engine.import_repository_workflow(self.project['id'], self.graph['id'], preview['digest'])
        self.assertEqual(self.engine.workflows(self.project['id']), [])

    def test_generic_bilan_contains_actual_request_and_retains_question_without_creating_release(self):
        graph = {'schema': 1, 'id': 'clarify', 'title': 'Compte rendu', 'nodes': [{'id': 'q', 'kind': 'question', 'title': 'Préciser', 'question': 'Qui relit le compte rendu ?', 'outputs': {'answer': 'string'}}], 'edges': []}
        run = self.engine.start(self.project['id'], graph, parameters={'request': 'Résumer les décisions du meeting de vendredi.'})
        output = Path(export_work(self.engine, run['id'], 'meeting-vendredi'))
        self.assertIn('Résumer les décisions', output.read_text())
        self.assertIn('Qui relit', output.read_text())
        self.assertTrue((output.parent / '.suivi/workflow.json').is_file())
        self.assertTrue(json.loads((output.parent / '.suivi/events.json').read_text()))
        self.assertFalse((Path(self.project['path']) / 'release').exists())
        self.assertEqual(self.engine.run(run['id'])['nodes']['q']['status'], 'waiting_input')
        with self.assertRaises(ContractError): export_work(self.engine, run['id'], 'meeting-vendredi')
        with self.assertRaises(ContractError): export_work(self.engine, run['id'], '../outside')

    def test_express_eligibility_routes_unknown_and_sensitive_work_to_reframing(self):
        graph = next(g for g in templates() if g['id'] == 'express-conversation')
        for value in ('eligible', 'broader', 'unknown'):
            service = Conversations(self.engine)
            c = service.open(self.project['id'], graph, 'codex')
            item = service.add(c['id'], 'Corriger la demande qualifiée')
            claim = self.engine.claim(item['run'], 'qualify')
            run = self.engine.submit(item['run'], 'qualify', claim['token'], {'ok': True, 'summary': 'Qualification', 'outputs': {'eligibility': value, 'scope': 'Périmètre factuel'}})
            if value == 'eligible':
                self.assertEqual(run['nodes']['fix']['status'], 'ready')
                self.assertEqual(run['nodes']['reframe']['status'], 'skipped')
            else:
                self.assertEqual(run['nodes']['fix']['status'], 'skipped')
                question = run['nodes']['reframe']['question']
                finished = answer(self.engine, run['id'], 'reframe', question['id'], 'Ouvrir une analyse complète')
                self.assertEqual(finished['completion_outcome'], 'blocked')

    def test_initial_intention_is_atomic_and_provider_independent(self):
        service = Conversations(self.engine)
        for provider in ('codex', 'claude'):
            c = service.open(self.project['id'], self.graph, provider, initial_request='Relire les minutes')
            self.assertEqual(len(c['items']), 1)
            self.assertEqual(c['items'][0]['request'], 'Relire les minutes')
            self.assertEqual(service.add(c['id'], 'Relire les minutes', key='initial'), c['items'][0])
        before = service.list()
        with self.assertRaises(ContractError):
            service.open(self.project['id'], self.graph, 'codex', initial_request=' ')
        self.assertEqual(service.list(), before)

    def test_anthropic_inventory_is_metadata_only_and_cannot_assert_connection(self):
        from connectors.discovery import normalize
        result = normalize([{'id': 'slack@marketplace', 'enabled': True, 'installPath': '/private/path', 'secret': 'hidden'}], 'claude')
        self.assertEqual(result[0]['provider'], 'claude')
        self.assertTrue(result[0]['installed'])
        self.assertIsNone(result[0]['connected'])
        self.assertFalse(result[0]['usable'])
        self.assertNotIn('private', json.dumps(result))
        self.assertNotIn('hidden', json.dumps(result))

    def test_meeting_keeps_multiple_sources_through_analysis_and_finishes_without_artificial_gate(self):
        run = self.engine.start(self.project['id'], self.graph,
                                parameters={'request': 'Résumer les deux ateliers de la semaine'})
        def submit(nid, outputs):
            claim = self.engine.claim(run['id'], nid)
            return self.engine.submit(run['id'], nid, claim['token'],
                                      {'ok': True, 'summary': 'Fixture de parcours, aucune réunion réelle lue.', 'outputs': outputs})
        meetings = [
            {'title': 'Atelier A', 'source': 'notes-A', 'notes': 'Décision : tester jeudi.'},
            {'title': 'Atelier B', 'source': 'notes-B', 'notes': 'Proposition : reporter ; pas de décision.'},
        ]
        run = submit('select', {'selected_meetings': meetings})
        self.assertEqual(run['nodes']['review']['inputs']['selected_meetings'], meetings)
        self.assertEqual(run['nodes']['mail']['status'], 'pending')
        analysis = 'Atelier A : test décidé. Atelier B : report proposé, à confirmer.'
        actions = [{'action': 'Tester jeudi', 'owner': 'À préciser'}]
        run = submit('review', {'analysis': analysis, 'actions': actions})
        self.assertEqual(run['nodes']['mail']['status'], 'ready')
        self.assertEqual(run['nodes']['mail']['inputs'], {'analysis': analysis, 'actions': actions})
        self.assertFalse(any(n['kind'] in ('decision', 'external', 'communication') for n in run['definition']['nodes']))
        run = submit('mail', {'minutes': analysis, 'actions': actions, 'draft': 'Objet : suivi des ateliers'})
        self.assertEqual(run['completion_outcome'], 'succeeded')
        self.assertEqual(run['nodes']['mail']['result']['outputs']['actions'], actions)

    def test_meeting_missing_sources_can_ask_without_accepting_an_empty_selection(self):
        run = self.engine.start(self.project['id'], self.graph, parameters={'request': 'Faire le compte rendu'})
        claim = self.engine.claim(run['id'], 'select')
        run = self.engine.submit(run['id'], 'select', claim['token'],
                                {'ok': True, 'summary': 'Aucune source', 'outputs': {'selected_meetings': []}})
        self.assertEqual(run['nodes']['select']['status'], 'returned')
        self.assertEqual(run['nodes']['review']['status'], 'pending')
        self.engine.retry(run['id'], 'select', 'Demander les sources manquantes', human=True)
        claim = self.engine.claim(run['id'], 'select')
        run = self.engine.submit(run['id'], 'select', claim['token'],
                                {'ok': True, 'summary': 'Périmètre manquant', 'question': 'Quelles réunions ou quelle période examiner ?', 'outputs': {}})
        self.assertEqual(run['nodes']['select']['status'], 'waiting_input')
        run = answer(self.engine, run['id'], 'select', run['nodes']['select']['question']['id'],
                     'Les ateliers A et B ; voici leurs notes.')
        self.assertEqual(run['nodes']['select']['status'], 'ready')
        self.engine.claim(run['id'], 'select')
        run = self.engine.run(run['id'])
        self.assertEqual(run['nodes']['select']['interactions'][0]['answer'],
                         'Les ateliers A et B ; voici leurs notes.')

    def test_loading_updated_templates_preserves_a_saved_legacy_meeting_and_its_run(self):
        legacy = {'schema': 1, 'id': 'meeting-conversation', 'title': 'Ancienne réunion adaptée',
                  'nodes': [{'id': 'approve', 'kind': 'decision', 'title': 'Relire avant email'}], 'edges': []}
        saved = self.engine.save(self.project['id'], legacy)
        run = self.engine.start(self.project['id'], saved)
        templates()
        self.assertEqual(self.engine.workflows(self.project['id']), [saved])
        self.assertEqual(self.engine.run(run['id'])['definition'], run['definition'])
        self.assertEqual(self.engine.run(run['id'])['nodes']['approve']['status'], 'waiting')

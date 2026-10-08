"""User journeys independent of Odoo, providers and application state directories."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

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

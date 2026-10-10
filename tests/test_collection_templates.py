"""Product journeys from the shipped schema-2 templates, with synthetic inputs."""
import copy
import difflib
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.collection import change
from workflow_engine.contracts import validate
from workflow_engine.iterations import activate, tick
from workflow_engine.runtime import execute
from workflow_engine.work_templates import templates


class CollectionTemplateTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='tricorder-template-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.engine = Engine(self.root / 'state')
        self.project = self.engine.create_project('Synthetic product journey')
        self.repo = Path(self.project['path'])
        self.models = {g['id']: g for g in templates()}

    def test_saved_workflow_has_a_stable_git_diff_after_reopening(self):
        graph = self.engine.save(self.project['id'], self.models['intentions-plan-work'])
        target = self.engine.workflow_path(self.project['id'], graph['id'])
        before = target.read_text().splitlines()
        reopened = next(item for item in self.engine.workflows(self.project['id']) if item['id'] == graph['id'])
        reopened['title'] = 'Titre modifié uniquement'
        self.engine.save(self.project['id'], reopened, graph['revision'])
        changes = [line for line in difflib.ndiff(before, target.read_text().splitlines())
                   if line.startswith(('- ', '+ '))]
        self.assertEqual(len(changes), 4, changes)
        self.assertTrue(all('"revision"' in line or '"title"' in line for line in changes))

    def test_new_models_are_valid_separate_and_do_not_replace_legacy_models(self):
        graphs = templates()
        self.assertEqual([g['id'] for g in graphs[:5]], ['release-conversation', 'support-conversation',
                         'meeting-conversation', 'request-conversation', 'express-conversation'])
        self.assertEqual([g['schema'] for g in graphs[:5]], [1, 1, 2, 1, 1])
        for graph in graphs:
            validate(graph)
        for key in ['intentions-plan-work', 'code-plan-integrate']:
            self.assertEqual(self.models[key]['schema'], 2)
            for item in self.models[key]['nodes']:
                self.assertNotIn('model', item)
                self.assertNotIn('provider', item)
        generic = self.models['intentions-plan-work']
        code = self.models['code-plan-integrate']
        generic['nodes'][0]['outputs']['intentions']['minItems'] = 5
        self.assertEqual(code['nodes'][0]['outputs']['intentions']['minItems'], 1)

    def test_multiple_intentions_single_plan_documentary_children_and_common_receipt(self):
        graph = self.models['intentions-plan-work']
        graph['defaults'] = {'provider': 'codex', 'model': 'fixture'}
        run = self.engine.start(self.project['id'], graph)
        self.assertEqual(run['nodes']['intentions']['status'], 'collecting')
        with self.assertRaisesRegex(ContractError, 'au moins 1'):
            change(self.engine, run['id'], 'intentions', 0, 'close', key='empty')
        change(self.engine, run['id'], 'intentions', 0, 'add', key='meeting', text='Préparer le compte rendu de la réunion')
        change(self.engine, run['id'], 'intentions', 1, 'add', key='mail', text='Préparer un brouillon de suivi, sans envoi')
        run = change(self.engine, run['id'], 'intentions', 2, 'close', key='done')
        self.assertEqual(len(run['nodes']['plan']['inputs']['intentions']), 2)
        self.assertEqual(run['nodes']['scope']['status'], 'pending')
        plan = {'goal': 'Suivi de la réunion', 'tasks': [
            {'id': 'R1', 'title': 'Compte rendu fidèle'},
            {'id': 'R2', 'title': 'Brouillon de suivi', 'depends_on': ['R1']}]}
        claim = self.engine.claim(run['id'], 'plan')
        run = self.engine.submit(run['id'], 'plan', claim['token'], {'ok': True, 'summary': 'Plan prêt', 'outputs': {'plan': plan}})
        self.assertEqual(run['nodes']['scope']['inputs']['plan'], plan)
        self.assertEqual(run['nodes']['work']['status'], 'pending')
        gate = run['nodes']['scope']
        self.engine.decide(run['id'], 'scope', gate['nonce'], gate['proposal'], 'approve', human=True)
        catalog = [{'id': 'codex', 'installed': True}, {'id': 'claude', 'installed': False}, {'id': 'command', 'usable': True}]
        with patch('workflow_engine.runtime.capabilities', return_value=catalog):
            run = activate(self.engine, run['id'], 'work')
        self.assertEqual(run['nodes']['work']['status'], 'waiting_children')
        members = run['nodes']['work']['children']
        self.assertEqual(len(members), 2)
        for index, member in enumerate(members):
            child = self.engine.run(member['run'])
            self.assertEqual(list(child['nodes']), ['perform'])
            self.assertFalse(any(n.get('execution_mode') == 'edit' for n in child['definition']['nodes']))
            self.assertEqual(child['nodes']['perform']['inputs']['item'], plan['tasks'][index])
            if index:
                self.assertEqual(child['parameters']['depends_on_runs'], [members[0]['run']])
            claim = self.engine.claim(child['id'], 'perform')
            self.engine.submit(child['id'], 'perform', claim['token'], {'ok': True, 'summary': 'Document synthétique',
                               'outputs': {'result': 'Compte rendu' if not index else 'Brouillon d’email non envoyé'}})
            run = tick(self.engine, run['id'])
        self.assertEqual(run['nodes']['work']['result']['outputs']['contributions'], [])
        self.assertEqual(len(run['nodes']['receipt']['inputs']['results']), 2)
        gate = run['nodes']['receipt']
        completed = self.engine.decide(run['id'], 'receipt', gate['nonce'], gate['proposal'], 'approve', human=True)
        self.assertEqual(completed['completion_outcome'], 'succeeded')
        self.assertFalse(list(self.repo.glob('*.py')))

    def test_development_model_has_actual_common_qa_and_exact_candidate_decision(self):
        graph = self.models['code-plan-integrate']
        by_id = {n['id']: n for n in graph['nodes']}
        self.assertEqual(by_id['work']['workflow']['nodes'][0]['execution_mode'], 'edit')
        self.assertEqual(by_id['integrate']['application_requires'], ['qa', 'receipt'])
        self.assertTrue(by_id['qa']['candidate_check'])
        self.assertEqual(by_id['qa']['kind'], 'command')
        self.assertIn('adaptées à ce projet', by_id['scope']['question'])
        self.assertIn('candidate', by_id['receipt']['inputs'])
        self.assertTrue(any(e['from'] == 'integrate' and e['to'] == 'receipt'
                            and e.get('mapping') == {'candidate': 'candidate'} for e in graph['edges']))

    def test_example_test_command_fails_without_tests_and_executes_real_tests(self):
        qa = next(n for n in self.models['code-plan-integrate']['nodes'] if n['id'] == 'qa')
        # Isolate the shipped command to test its advertised example behavior.
        standalone = copy.deepcopy(qa)
        standalone.pop('inputs')
        standalone.pop('candidate_check')
        (self.repo / 'tests').mkdir()
        graph = {'schema': 2, 'id': 'test-example', 'title': 'Test command example', 'nodes': [standalone], 'edges': []}
        run = self.engine.start(self.project['id'], graph)
        claim = self.engine.claim(run['id'], 'qa')
        execute(self.engine, run['id'], 'qa', claim['token'])
        state = self.engine.run(run['id'])['nodes']['qa']
        self.assertEqual(state['status'], 'returned')
        self.assertFalse(state['result']['ok'])
        self.assertIn('Aucun test trouvé', state['result']['preview'])
        (self.repo / 'tests/test_example.py').write_text('import unittest\nclass Example(unittest.TestCase):\n def test_true(self): self.assertEqual(2 + 2, 4)\n')
        run = self.engine.start(self.project['id'], graph)
        claim = self.engine.claim(run['id'], 'qa')
        execute(self.engine, run['id'], 'qa', claim['token'])
        state = self.engine.run(run['id'])['nodes']['qa']
        self.assertEqual(state['status'], 'accepted')
        self.assertIn('Ran 1 test', state['result']['preview'])


if __name__ == '__main__':
    unittest.main()

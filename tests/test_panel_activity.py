"""Portfolio usability: real Engine APIs, synthetic state, no process execution."""
import copy
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine
from workflow_engine.library import node
from workflow_engine.work_templates import templates
from workflow_engine.contracts import validate


class PanelActivityTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='tricorder-panel-activity-')
        self.addCleanup(temporary.cleanup)
        self.engine = Engine(temporary.name)
        self.project = self.engine.create_project('Portefeuille synthétique')['id']

    def start(self, nid, kind='task', **kwargs):
        graph = {'schema': 1, 'id': nid, 'title': nid,
                 'nodes': [node('work', nid, kind, question='Quel périmètre ?')], 'edges': []}
        return self.engine.start(self.project, graph, simulation=True, driver='conversation', **kwargs)

    def test_old_question_and_ready_work_precede_recent_dependency_waits_across_pages(self):
        question = self.start('question', 'question')
        ready = self.start('ready')
        waits = [self.start(f'waiting-{index}', deferred=True) for index in range(27)]
        before = [copy.deepcopy(self.engine.run(run['id'])) for run in [question, ready, *waits]]
        activity = self.engine.activity()
        self.assertEqual([run['id'] for run in activity['items'][:2]], [question['id'], ready['id']])
        self.assertEqual(activity['total'], 29)
        self.assertEqual(activity['next'], 25)
        self.assertEqual(len(self.engine.activity(25)['items']), 4)
        self.assertEqual(before, [self.engine.run(run['id']) for run in [question, ready, *waits]])

    def test_manual_suspension_is_actionable_before_an_automatic_dependency_wait(self):
        manual = self.start('manual')
        self.engine.control(manual['id'], 'pause')
        self.start('dependent', deferred=True)
        self.assertEqual(self.engine.activity()['items'][0]['id'], manual['id'])

    def test_support_criteria_describe_expected_quality_without_attesting_it(self):
        support = next(graph for graph in templates() if graph['id'] == 'support-conversation')
        validate(support)
        diagnosis = next(step for step in support['nodes'] if step['id'] == 'diagnosis')
        self.assertIn('inconnues', ' '.join(diagnosis['criteria']))
        run = self.engine.start(self.project, support, simulation=True, driver='conversation')
        claim = self.engine.claim(run['id'], 'diagnosis', executor='native')
        result = self.engine.submit(run['id'], 'diagnosis', claim['token'], {
            'ok': True, 'summary': 'Fixture, aucun diagnostic réel.',
            'outputs': {'severity': 'normal', 'finding': 'Constat fictif', 'next_action': 'Brouillon'},
        })
        receipt = result['nodes']['diagnosis']['receipt']
        self.assertEqual(receipt['actor'], 'contract-policy')
        self.assertIn('aucun critère métier attesté', receipt['note'])
        self.assertTrue(set(receipt['checks']).isdisjoint(diagnosis['criteria']))


if __name__ == '__main__':
    unittest.main()

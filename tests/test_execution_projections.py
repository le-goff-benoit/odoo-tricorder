"""Execution presentation contracts; synthetic engine state, no model execution."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

from native_cli_fixture import use_native_cli_fixtures

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.conversations import Conversations
from workflow_engine.projections import health, summary, run_detail


def graph(nodes, edges=()):
    return {'schema': 1, 'id': 'presentation', 'title': 'Synthetic execution',
            'defaults': {'provider': 'codex', 'model': 'fixture-model'},
            'nodes': nodes, 'edges': list(edges)}


def task(nid, **values):
    return {'id': nid, 'title': nid, 'kind': 'task', 'validation': 'contract', **values}


class ExecutionProjectionTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='tricorder-execution-projection-')
        self.addCleanup(temporary.cleanup)
        use_native_cli_fixtures(self, temporary.name)
        self.engine = Engine(temporary.name)
        self.project = self.engine.create_project('Synthetic execution')
        self.service = Conversations(self.engine)

    def submit(self, rid, nid, **result):
        claim = self.engine.claim(rid, nid)
        return self.engine.submit(rid, nid, claim['token'], {'ok': True, 'summary': 'Synthetic result', 'outputs': {}, **result})

    def test_question_failure_and_parallel_work_keep_distinct_meanings(self):
        run = self.engine.start(self.project['id'], graph([
            task('copy', title='Prepare candidate'), task('parallel'),
            {'id': 'clarify', 'title': 'Clarify the request', 'kind': 'question', 'question': 'Which case?', 'outputs': {'answer': 'string'}},
        ]))
        self.engine.claim(run['id'], 'parallel')
        run = self.submit(run['id'], 'copy', ok=False, summary='Candidate copy exceeds the configured size.')
        original = copy.deepcopy(run)
        compact, detail = summary(run), run_detail(self.engine, run)
        for view in (compact, detail):
            self.assertEqual(view['focus']['node'], 'clarify')
            self.assertEqual(view['focus']['status'], 'waiting_input')
            self.assertEqual(view['focus']['action'], 'Répondre à la question')
            self.assertEqual(view['health'], {'status': 'failed', 'total': 1, 'issues': [
                {'node': 'copy', 'title': 'Prepare candidate', 'reason': 'Candidate copy exceeds the configured size.'}]})
        self.assertEqual(compact['counts']['running'], 1)
        self.assertEqual(run, original)
        self.assertEqual(self.engine.run(run['id']), original)

    def test_activity_keeps_old_questions_before_completed_history(self):
        pending = self.engine.start(self.project['id'], graph([
            {'id': 'question', 'kind': 'question', 'title': 'Old pending question',
             'question': 'Still waiting?', 'outputs': {'answer': 'string'}}]))
        for _ in range(27):
            done = self.engine.start(self.project['id'], graph([task('done')]))
            self.submit(done['id'], 'done')
        first = self.engine.activity()
        second = self.engine.activity(first['next'])
        self.assertEqual(first['runs'][0]['id'], pending['id'])
        self.assertEqual(first['attention_total'], 1)
        self.assertEqual(first['total'], 28)
        self.assertEqual(len(first['runs']), 25)
        ids = [r['id'] for page in (first, second) for r in page['runs']]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(ids), 28)
        self.assertEqual(self.engine.run(pending['id'])['nodes']['question']['status'], 'waiting_input')

    def test_activity_counts_pending_work_beyond_its_first_page(self):
        for _ in range(28):
            self.engine.start(self.project['id'], graph([
                {'id': 'question', 'kind': 'question', 'title': 'Pending question',
                 'question': 'Still waiting?', 'outputs': {'answer': 'string'}}]))
        first = self.engine.activity()
        second = self.engine.activity(first['next'])
        self.assertEqual(first['attention_total'], 28)
        self.assertEqual(second['attention_total'], 28)
        self.assertEqual(len(first['runs']), 25)
        self.assertEqual(len(second['runs']), 3)

    def routed_graph(self, validation):
        return graph([
            task('qa', kind='agent', validation=validation, outputs={'verdict': 'string'}, route_output='verdict', options=['pass', 'fail']),
            {'id': 'correct', 'title': 'Prepare corrective work', 'kind': 'question', 'question': 'What should change?', 'outputs': {'answer': 'string'}},
            task('deliver'),
        ], [
            {'id': 'fail', 'from': 'qa', 'to': 'correct', 'outcome': 'fail'},
            {'id': 'pass', 'from': 'qa', 'to': 'deliver', 'outcome': 'pass'},
        ])

    def test_accepted_negative_qa_uses_corrective_branch_not_an_execution_error(self):
        run = self.engine.start(self.project['id'], self.routed_graph('contract'))
        run = self.submit(run['id'], 'qa', outputs={'verdict': 'fail'}, summary='The result does not meet the criterion.')
        self.assertEqual(run['nodes']['qa']['status'], 'accepted')
        self.assertEqual(run['nodes']['qa']['outcome'], 'fail')
        self.assertEqual(run['nodes']['deliver']['status'], 'skipped')
        self.assertEqual(summary(run)['health'], {'status': 'ok', 'total': 0, 'issues': []})
        self.assertEqual(summary(run)['focus']['node'], 'correct')
        self.assertEqual(summary(run)['focus']['status'], 'waiting_input')

    def test_valid_negative_qa_can_be_manually_received_then_routed(self):
        run = self.engine.start(self.project['id'], self.routed_graph('human'))
        run = self.submit(run['id'], 'qa', outputs={'verdict': 'fail'}, summary='A valid negative finding, not an executor failure.')
        view = summary(run)
        self.assertEqual(view['focus']['status'], 'returned')
        self.assertEqual(view['focus']['action'], 'Examiner le résultat')
        self.assertEqual(view['health']['status'], 'ok')
        self.assertEqual(run['nodes']['correct']['status'], 'pending')
        run = self.engine.accept(run['id'], 'qa', human=True, checks=[])
        self.assertEqual(run['nodes']['qa']['outcome'], 'fail')
        self.assertEqual(summary(run)['focus']['node'], 'correct')
        self.assertEqual(summary(run)['health']['total'], 0)

    def test_executor_failure_cannot_be_relabelled_as_a_valid_negative_outcome(self):
        run = self.engine.start(self.project['id'], self.routed_graph('human'))
        run = self.submit(run['id'], 'qa', ok=False, outputs={'verdict': 'fail'}, summary='Test process could not start.')
        self.assertEqual(summary(run)['health']['status'], 'failed')
        self.assertEqual(summary(run)['focus']['action'], 'Examiner l’échec')
        with self.assertRaisesRegex(ContractError, 'échec'):
            self.engine.accept(run['id'], 'qa', human=True, checks=[])

    def test_invalid_success_preserves_the_validation_cause(self):
        run = self.engine.start(self.project['id'], graph([task('work', outputs={'required': 'string'})]))
        run = self.submit(run['id'], 'work', outputs={}, summary='Executor claimed success.')
        issue = summary(run)['health']['issues'][0]
        self.assertEqual(issue['reason'], run['nodes']['work']['validation_error'])
        self.assertNotEqual(issue['reason'], 'Executor claimed success.')

    def test_issues_are_bounded_and_do_not_publish_payloads_or_accepted_history(self):
        run = self.engine.start(self.project['id'], graph([task('base')]))
        large = 'é' * 100_000
        run['definition']['nodes'] = [task(f'work{n}', title=large) for n in range(30)]
        run['nodes'] = {f'work{n}': {'status': 'returned', 'result': {'ok': False, 'summary': large, 'outputs': {'private': 'MUST_NOT_BE_PROJECTED'}}} for n in range(30)}
        run['definition']['nodes'].extend([task('handled'), task('unselected')])
        run['nodes']['handled'] = {'status': 'accepted', 'validation_error': 'Historical problem', 'result': {'ok': False}}
        run['nodes']['unselected'] = {'status': 'skipped', 'result': {'ok': False}}
        before = copy.deepcopy(run)
        status = health(run)
        self.assertEqual(status['total'], 30)
        self.assertEqual(len(status['issues']), 25)
        self.assertTrue(all(len(i['title']) <= 120 and len(i['reason']) <= 600 for i in status['issues']))
        encoded = json.dumps(status, ensure_ascii=False).encode()
        self.assertLess(len(encoded), 60_000)
        self.assertNotIn(b'MUST_NOT_BE_PROJECTED', encoded)
        self.assertEqual(run, before)

    def decision_conversation(self):
        return self.service.open(self.project['id'], graph([
            {'id': 'scope', 'title': 'Review scope', 'kind': 'decision', 'question': 'Approve this request?', 'options': ['approve', 'reject']},
        ]), 'codex')

    def decide(self, item, choice):
        run = self.engine.run(item['run'])
        gate = run['nodes']['scope']
        return self.engine.decide(run['id'], 'scope', gate['nonce'], gate['proposal'], choice, human=True)

    def test_dependency_outside_filtered_page_is_named_and_rejected_is_not_satisfied(self):
        c = self.decision_conversation()
        parent = self.service.add(c['id'], 'Upstream request')
        for index in range(24):
            self.service.add(c['id'], f'Other request {index}')
        child = self.service.add(c['id'], 'Final consolidation', depends_on=[parent['id']])
        rejected = self.decide(parent, 'reject')
        self.assertEqual(rejected['status'], 'completed')
        self.assertEqual(rejected['completion_outcome'], 'rejected')
        page = self.service.snapshot(c['id'], offset=25, limit=25)
        self.assertEqual([i['id'] for i in page['items']], [child['id']])
        dependency = page['items'][0]['dependencies'][0]
        self.assertEqual((dependency['id'], dependency['run'], dependency['request']), (parent['id'], parent['run'], 'Upstream request'))
        self.assertEqual(dependency['status'], 'completed')
        self.assertEqual(dependency['completion_outcome'], 'rejected')
        self.assertFalse(dependency['satisfied'])
        self.assertEqual(page['items'][0]['execution']['status'], 'paused')
        filtered = self.service.snapshot(c['id'], limit=25, query='Final')
        self.assertEqual(filtered['items'][0]['dependencies'], page['items'][0]['dependencies'])

    def test_satisfied_dependency_does_not_hide_a_manual_hold(self):
        c = self.decision_conversation()
        parent = self.service.add(c['id'], 'Upstream request')
        child = self.service.add(c['id'], 'Final consolidation', depends_on=[parent['id']])
        self.engine.control(child['run'], 'pause')
        self.decide(parent, 'approve')
        selected = self.service.snapshot(c['id'], limit=1, query='Final')['items'][0]
        self.assertTrue(selected['dependencies'][0]['satisfied'])
        self.assertEqual(selected['dependencies'][0]['completion_outcome'], 'succeeded')
        self.assertTrue(selected['execution']['coordination_hold'])
        self.assertEqual(selected['execution']['status'], 'paused')

    def test_dependencies_are_bounded_and_expose_unsatisfied_items_first(self):
        c = self.decision_conversation()
        parents = [self.service.add(c['id'], f'Parent {index} ' + 'x' * 1000) for index in range(30)]
        for item in parents[:26]:
            self.decide(item, 'approve')
        child = self.service.add(c['id'], 'Final consolidation', depends_on=[i['id'] for i in parents])
        selected = self.service.snapshot(c['id'], limit=1, query='Final')['items'][0]
        self.assertEqual(selected['dependencies_total'], 30)
        self.assertTrue(selected['dependencies_truncated'])
        self.assertEqual(len(selected['dependencies']), 25)
        self.assertEqual([d['id'] for d in selected['dependencies'][:4]], [i['id'] for i in parents[26:]])
        self.assertEqual(selected['depends_on'], [i['id'] for i in parents])
        for dependency in selected['dependencies']:
            self.assertLessEqual(len(dependency['request']), 240)
            self.assertTrue(dependency['request_truncated'])
            self.assertNotIn('nodes', dependency)
            self.assertNotIn('issues', dependency['health'])
        self.assertEqual(selected['dependencies'][0]['focus']['status'], 'waiting')
        self.assertEqual(selected['dependencies'][0]['counts']['waiting'], 1)
        self.assertLess(len(json.dumps(selected).encode()), 30_000)
        self.assertEqual(self.engine.run(child['run'])['status'], 'paused')

    def test_dependencies_cannot_come_from_another_conversation(self):
        first, second = self.decision_conversation(), self.decision_conversation()
        foreign = self.service.add(first['id'], 'Outside this conversation')
        with self.assertRaisesRegex(ContractError, 'Dépendance hors'):
            self.service.add(second['id'], 'Cannot depend on foreign work', depends_on=[foreign['id']])
        selected = self.service.add(second['id'], 'Own work')
        page = self.service.snapshot(second['id'], limit=25)
        self.assertEqual([i['id'] for i in page['items']], [selected['id']])
        self.assertEqual(page['items'][0]['dependencies'], [])
        self.assertNotIn(foreign['run'], json.dumps(page))


if __name__ == '__main__':
    unittest.main()

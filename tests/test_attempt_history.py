"""Attempt reading models use only synthetic workflows and validated engine commands."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

from native_cli_fixture import use_native_cli_fixtures

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.projections import run_detail, proof_page


class AttemptHistoryTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix='tricorder-attempt-history-')
        self.addCleanup(directory.cleanup)
        use_native_cli_fixtures(self, directory.name)
        self.engine = Engine(directory.name)
        self.project = self.engine.create_project('Synthetic attempt history')
        graph = {'schema': 1, 'id': 'attempts', 'title': 'Synthetic retries', 'nodes': [
            {'id': 'plan', 'title': 'Prepare plan', 'kind': 'task', 'validation': 'contract', 'outputs': {'plan': 'string'}},
            {'id': 'work', 'title': 'Implement plan', 'kind': 'task', 'validation': 'contract', 'inputs': {'plan': 'string'}, 'max_attempts': 3},
        ], 'edges': [{'id': 'plan-work', 'from': 'plan', 'to': 'work', 'outcome': 'done', 'mapping': {'plan': 'plan'}}]}
        self.run = self.engine.start(self.project['id'], graph)
        self.plan = 'Synthetic plan. ' * 1200
        claim = self.engine.claim(self.run['id'], 'plan')
        self.run = self.engine.submit(self.run['id'], 'plan', claim['token'], {'ok': True, 'summary': 'Plan ready', 'outputs': {'plan': self.plan}})

    def fail(self, summary, **result):
        claim = self.engine.claim(self.run['id'], 'work')
        self.run = self.engine.submit(self.run['id'], 'work', claim['token'], {'ok': False, 'summary': summary, 'outputs': {}, **result})

    def retry(self, note):
        self.run = self.engine.retry(self.run['id'], 'work', note, human=True)

    def test_large_inputs_do_not_hide_short_failure_and_retry_instruction(self):
        proof = self.engine.artifact(b'Synthetic command log')
        self.fail('Synthetic copy could not start', evidence=[proof])
        self.retry('Correct the copy configuration')
        self.fail('Synthetic agent changed no file')
        before = copy.deepcopy(self.run)
        state = run_detail(self.engine, self.run)['nodes']['work']
        self.assertIn('$artifact', state['history'])
        attempt = state['attempt_history'][0]
        self.assertEqual(attempt['attempt'], 1)
        self.assertEqual(attempt['status'], 'returned')
        self.assertTrue(attempt['failed'])
        self.assertEqual(attempt['result']['summary'], 'Synthetic copy could not start')
        self.assertEqual(attempt['retry_reason'], 'Correct the copy configuration')
        self.assertEqual(attempt['result']['evidence'], [proof])
        self.assertNotIn('token', attempt)
        self.assertLess(attempt['started'], attempt['finished'])
        content = proof_page(self.engine, self.run['id'], attempt['inputs']['$artifact']['sha256'])
        self.assertEqual(json.loads(content['text']), {'plan': self.plan})
        self.assertEqual(self.run, before)
        self.assertEqual(self.engine.run(self.run['id']), before)

    def test_each_retry_note_describes_the_next_attempt_and_long_text_remains_readable_by_reference(self):
        long_summary = 'Synthetic extended diagnosis. ' * 2000
        self.fail(long_summary)
        self.retry('First correction')
        self.fail('A different error')
        self.retry('Second correction')
        history = run_detail(self.engine, self.run)['nodes']['work']['attempt_history']
        self.assertEqual([item['retry_reason'] for item in history], ['First correction', 'Second correction'])
        ref = history[0]['result']['summary']['$artifact']
        first = proof_page(self.engine, self.run['id'], ref['sha256'])
        self.assertIsNotNone(first['next'])
        second = proof_page(self.engine, self.run['id'], ref['sha256'], first['next'])
        self.assertEqual(first['text'] + second['text'], long_summary)
        self.assertLess(len(json.dumps(history).encode()), 6000)
        with self.assertRaisesRegex(ContractError, 'absente'):
            proof_page(self.engine, self.run['id'], 'a' * 64)

    def test_large_history_is_paged_and_readable_with_run_scoped_references(self):
        from workflow_engine.projections import attempt_page
        graph = {'schema': 1, 'id': 'many-attempts', 'title': 'Large attempt history',
                 'nodes': [{'id': 'work', 'title': 'Work', 'kind': 'task', 'validation': 'contract', 'max_attempts': 10}], 'edges': []}
        run = self.engine.start(self.project['id'], graph)
        evidence = self.engine.artifact(b'large history evidence')
        for index in range(10):
            claim = self.engine.claim(run['id'], 'work')
            run = self.engine.submit(run['id'], 'work', claim['token'], {
                'ok': False, 'summary': 'Explanation ' * 1000, 'outputs': {'details': 'Details ' * 2000},
                'preview': 'Preview ' * 1000, 'evidence': [evidence] * 10})
            if index < 9:
                self.engine.retry(run['id'], 'work', 'Correction ' * 500, human=True)
        detail = run_detail(self.engine, run)
        self.assertEqual(detail['nodes']['work']['attempt_history_page']['total'], 9)
        self.assertNotIn('attempt_history', detail['nodes']['work'])
        first = attempt_page(self.engine, run['id'], 'work')
        second = attempt_page(self.engine, run['id'], 'work', first['next'])
        self.assertEqual([a['attempt'] for a in first['items']], [7, 8, 9])
        self.assertEqual([a['attempt'] for a in second['items']], [4, 5, 6])
        sha = first['items'][0]['result']['summary']['$artifact']['sha256']
        self.assertEqual(proof_page(self.engine, run['id'], sha)['text'], 'Explanation ' * 1000)
        with self.assertRaises(ContractError):
            attempt_page(self.engine, run['id'], 'missing')
        with self.assertRaises(ContractError):
            attempt_page(self.engine, run['id'], 'work', limit=4)
        # Scale only the pure view, preserving authoritative engine state.
        scaled = copy.deepcopy(run)
        scaled['definition']['nodes'] = [{**graph['nodes'][0], 'id': f'work-{i}'} for i in range(1000)]
        scaled['nodes'] = {n['id']: copy.deepcopy(run['nodes']['work']) for n in scaled['definition']['nodes']}
        projected = run_detail(self.engine, scaled)
        self.assertTrue(all('attempt_history_page' in state for state in projected['nodes'].values()))
        self.assertLess(len(json.dumps(projected, ensure_ascii=False).encode()), 8 * 1024 * 1024)
        self.assertEqual(self.engine.run(run['id']), run)


if __name__ == '__main__':
    unittest.main()

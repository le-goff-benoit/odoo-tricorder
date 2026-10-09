"""Independent rc12 counterexamples; only synthetic state through Engine APIs."""
import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from native_cli_fixture import use_native_cli_fixtures

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine
from workflow_engine.conversations import Conversations
from workflow_engine.library import node
from workflow_engine.projections import conversation_activity, attempt_history, attempt_page, run_detail, proof_page
from workflow_engine.runtime import dispatch_conversation


class IndependentDispatchReview(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='tricorder-rc12-review-')
        self.addCleanup(temporary.cleanup)
        use_native_cli_fixtures(self, temporary.name)
        self.engine = Engine(temporary.name)
        self.project = self.engine.create_project('Independent synthetic review')
        self.graph = {'schema': 1, 'id': 'independent', 'title': 'Independent work',
                      'defaults': {'provider': 'codex', 'model': 'synthetic-model'},
                      'nodes': [node('work', 'Work', 'agent', validation='contract')], 'edges': []}
        self.service = Conversations(self.engine)
        catalog = [{'id': provider, 'installed': True, 'usable': True, 'reason': 'Synthetic only'}
                   for provider in ('codex', 'claude', 'command')]
        mocked = patch('workflow_engine.runtime.capabilities', return_value=catalog)
        mocked.start()
        self.addCleanup(mocked.stop)

    def open(self, graph=None):
        return self.service.open(self.project['id'], graph or self.graph, 'codex')['id']

    def test_cancelled_consolidation_does_not_count_as_waiting_dependency(self):
        cid = self.open()
        first = self.service.add(cid, 'Independent request')
        closure = self.service.add(cid, 'Consolidation', depends_on=[first['id']])
        self.engine.control(closure['run'], 'cancel')
        activity = conversation_activity(self.engine, cid)
        self.assertEqual(activity['items'], 2)
        self.assertEqual(activity['dependencies'], 0)

    def test_global_counts_only_include_actual_conversation_members(self):
        cid = self.open()
        self.service.add(cid, 'Actual request')
        # Public Engine.start accepts generic parameters; a parameter name must
        # not grant membership in another conversation's authoritative items.
        self.engine.start(self.project['id'], self.graph, parameters={'conversation': cid})
        snapshot = self.service.snapshot(cid, limit=25)
        self.assertEqual(snapshot['item_count'], 1)
        self.assertEqual(snapshot['activity']['items'], 1)
        self.assertEqual(snapshot['activity']['ready'], 1)

    def test_native_only_workflow_does_not_launch_managed_worker(self):
        graph = copy.deepcopy(self.graph)
        graph['execution_modes'] = ['native']
        cid = self.open(graph)
        item = self.service.add(cid, 'Native-only request')
        with patch('workflow_engine.runtime.subprocess.Popen', return_value=SimpleNamespace(pid=900000001)) as spawn:
            result = dispatch_conversation(self.engine, cid)
        spawn.assert_not_called()
        self.assertEqual(self.engine.run(item['run'])['nodes']['work']['attempt'], 0)
        self.assertEqual(result['started_count'], 0)
        self.assertTrue(result['items'][0]['waiting'])

    def test_history_size_at_200_nodes_and_extrapolated_contract_limit(self):
        graph = {'schema': 1, 'id': 'scale', 'title': 'History scale', 'nodes': [
            {'id': 'source', 'title': 'Source', 'kind': 'task', 'validation': 'contract', 'outputs': {'text': 'string'}},
            {'id': 'work', 'title': 'Work', 'kind': 'task', 'validation': 'contract', 'inputs': {'text': 'string'}, 'max_attempts': 10},
        ], 'edges': [{'id': 'source-work', 'from': 'source', 'to': 'work', 'outcome': 'done', 'mapping': {'text': 'text'}}]}
        run = self.engine.start(self.project['id'], graph)
        claim = self.engine.claim(run['id'], 'source')
        self.engine.submit(run['id'], 'source', claim['token'], {'ok': True, 'summary': 'Source ready', 'outputs': {'text': 'Input ' * 1000}})
        proof = self.engine.artifact(b'Independent synthetic evidence')
        for attempt in range(10):
            claim = self.engine.claim(run['id'], 'work')
            run = self.engine.submit(run['id'], 'work', claim['token'], {
                'ok': False, 'summary': 'Explanation ' * 500, 'outputs': {'detail': 'Details ' * 1000},
                'preview': 'Preview ' * 1000, 'evidence': [proof] * 10})
            if attempt < 9:
                run = self.engine.retry(run['id'], 'work', 'Correction ' * 500, human=True)
        # The ten attempts above are real validated transitions. Scale only the
        # pure reading projection: no state or database is fabricated/rewritten.
        sizes = {}
        for count in (200, 500, 1000):
            threshold = min(8000, max(128, 1_000_000 // (count * 12)))
            history = attempt_history(self.engine, run['nodes']['work'], graph['nodes'][1], threshold=threshold)
            sizes[count] = len(json.dumps(history, ensure_ascii=False).encode()) * count
        self.assertLess(sizes[200], 8 * 1024 * 1024)
        print('Independent history-only projection size estimate (bytes): ' + json.dumps(sizes), flush=True)
        detail = run_detail(self.engine, run)['nodes']['work']
        self.assertEqual(detail['attempt_history_page']['total'], 9)
        self.assertNotIn('attempt_history', detail)
        seen = []
        offset = 0
        while offset is not None:
            page = attempt_page(self.engine, run['id'], 'work', offset)
            self.assertLessEqual(len(page['items']), 3)
            self.assertLess(len(json.dumps(page).encode()), 16_000)
            # The renderer reverses each backend page; all visible pages must
            # form one recent-to-old order, not merely reverse each old page.
            for entry in reversed(page['items']):
                seen.append(entry['attempt'])
                ref = entry['result']['summary']['$artifact']
                self.assertEqual(proof_page(self.engine, run['id'], ref['sha256'])['text'], 'Explanation ' * 500)
            offset = page['next']
        self.assertEqual(seen, list(range(9, 0, -1)))

    def test_collection_requests_and_consolidation_all_receive_same_full_release_graph(self):
        from workflow_engine.work_templates import templates
        graph = next(g for g in templates() if g['id'] == 'release-conversation')
        graph['defaults'] = self.graph['defaults']
        cid = self.open(graph)
        collection = self.service.add(cid, 'Collect the synthetic email and prepare its plan')
        for nid, key in [('intent', 'intent'), ('plan', 'plan')]:
            claim = self.engine.claim(collection['run'], nid, executor='native')
            self.engine.submit(collection['run'], nid, claim['token'], {
                'ok': True, 'summary': 'Synthetic common plan', 'outputs': {key: 'R1, R2, R3, R4'}})
        decision = self.engine.run(collection['run'])['nodes']['scope']
        self.engine.decide(collection['run'], 'scope', decision['nonce'], decision['proposal'], 'approve', human=True)
        requests = [self.service.add(cid, f'R{index}', key=f'source-R{index}') for index in range(1, 5)]
        consolidation = self.service.add(cid, 'C1: only consolidate accepted results, no new implementation', depends_on=[i['id'] for i in requests])
        # This documents the current structural limitation; it is not a claim
        # that the behavior satisfies the requested parent/requests/consolidation flow.
        for item in [collection, *requests, consolidation]:
            run = self.engine.run(item['run'])
            self.assertEqual([n['id'] for n in run['definition']['nodes']], [n['id'] for n in graph['nodes']])
            self.assertNotIn('parent_node', item)
        self.assertEqual(len(self.service.get(cid)['items']), 6)
        self.assertTrue(all(self.engine.run(item['run'])['nodes']['scope']['status'] == 'pending' for item in requests))
        self.assertEqual(self.engine.run(consolidation['run'])['status'], 'paused')
        self.assertIn('work', self.engine.run(consolidation['run'])['nodes'])


if __name__ == '__main__':
    unittest.main()

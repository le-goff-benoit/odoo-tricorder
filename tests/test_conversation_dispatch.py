"""Explicit parallel launches use real claims, never real provider accounts."""
import concurrent.futures
import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.conversations import Conversations, answer
from workflow_engine.library import node, edge
from workflow_cli import request
from workflow_engine.runtime import execute


class ConversationDispatchTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.engine = Engine(self.root)
        self.project = self.engine.create_project('Synthetic parallel work')
        catalog = [{'id': key, 'installed': True, 'usable': True, 'reason': 'Synthetic executor'}
                   for key in ('codex', 'claude', 'command')]
        self.catalog = patch('workflow_engine.runtime.capabilities', return_value=catalog)
        self.catalog.start(); self.addCleanup(self.catalog.stop)
        self.service = Conversations(self.engine)
        self.graph = {'schema': 1, 'id': 'parallel', 'title': 'Parallel work',
                      'defaults': {'provider': 'codex', 'model': 'synthetic-model'},
                      'nodes': [node('work', 'Analyse', 'agent', validation='contract')], 'edges': []}
        self.cid = self.open(self.graph)
        self.pid = 900000000  # Recorded synthetic PID, never used for signalling.

    def open(self, graph):
        return self.service.open(self.project['id'], graph, 'codex')['id']

    def add(self, text='Request', cid=None, **kwargs):
        return self.service.add(cid or self.cid, text, **kwargs)

    def spawn(self, argv, **kwargs):
        self.pid += 1
        self.assertIn('--worker', argv)
        self.assertTrue(kwargs['start_new_session'])
        return SimpleNamespace(pid=self.pid)

    def dispatch(self, cid=None, **payload):
        return request(self.engine, cid or self.cid, 'dispatch', payload)

    @staticmethod
    def started(result):
        return [dict(entry, run=item['run']) for item in result['items'] for entry in item['started']]

    def finish(self, item, nid='work'):
        state = self.engine.run(item['run'])['nodes'][nid]
        self.engine.submit(item['run'], nid, state['token'], {'ok': True, 'summary': 'Synthetic result', 'outputs': {}})

    def test_four_independent_requests_start_without_waiting_and_repeat_does_not_spawn(self):
        items = [self.add('R'+str(i)) for i in range(5)]
        with patch('workflow_engine.runtime.subprocess.Popen', side_effect=self.spawn) as spawn:
            first = self.dispatch()
            self.assertEqual(len(self.started(first)), 4)
            self.assertEqual(len({s['pid'] for s in self.started(first)}), 4)
            for item in items[:4]:
                state = self.engine.run(item['run'])['nodes']['work']
                self.assertEqual(state['status'], 'running')
                self.assertEqual(state['attempt'], 1)
                self.assertIn(state['pid'], {s['pid'] for s in self.started(first)})
            self.assertEqual(first['items'][-1]['waiting'][0]['code'], 'quota')
            self.assertEqual(first['items'][-1]['next_node'], 0)
            self.assertEqual(self.engine.run(items[-1]['run'])['nodes']['work']['attempt'], 0)
            self.assertFalse(self.started(self.dispatch()))
            self.assertEqual(spawn.call_count, 4)
            request(self.engine, self.cid, 'status', {})
            self.assertEqual(spawn.call_count, 4)

    def test_consolidation_waits_for_all_results_then_explicit_dispatch_resumes_it(self):
        items = [self.add('R'+str(i)) for i in range(4)]
        closure = self.add('C1 technical consolidation', depends_on=[i['id'] for i in items])
        with patch('workflow_engine.runtime.subprocess.Popen', side_effect=self.spawn):
            self.dispatch()
            self.assertEqual(self.engine.run(closure['run'])['status'], 'paused')
            for item in items[:-1]: self.finish(item)
            waiting = self.dispatch(runs=[closure['run']])
            self.assertFalse(self.started(waiting))
            self.assertEqual(waiting['items'][0]['waiting'][0]['code'], 'dependencies')
            self.finish(items[-1])
            resumed = self.dispatch(runs=[closure['run']])
            self.assertEqual([s['run'] for s in self.started(resumed)], [closure['run']])
            self.assertEqual(len(self.engine.run(closure['run'])['parameters']['dependency_results']), 4)

    def test_question_and_human_decision_require_answers_before_workers_can_start(self):
        graph = copy.deepcopy(self.graph)
        graph['nodes'] = [node('question', 'Clarify', 'question', question='Which scope?'),
                          node('gate', 'Approve', 'decision'), graph['nodes'][0]]
        graph['edges'] = [edge('question', 'gate'), edge('gate', 'work', 'approve')]
        cid = self.open(graph); item = self.add(cid=cid)
        with patch('workflow_engine.runtime.subprocess.Popen', side_effect=self.spawn) as spawn:
            self.assertFalse(self.started(self.dispatch(cid)))
            current = self.engine.run(item['run'])
            answer(self.engine, item['run'], 'question', current['nodes']['question']['question']['id'], 'Synthetic scope')
            waiting = self.dispatch(cid)
            self.assertFalse(self.started(waiting)); spawn.assert_not_called()
            gate = self.engine.run(item['run'])['nodes']['gate']
            self.assertEqual(gate['status'], 'waiting')
            self.engine.decide(item['run'], 'gate', gate['nonce'], gate['proposal'], 'approve', human=True)
            self.assertEqual(len(self.started(self.dispatch(cid))), 1)

    def test_resource_locks_and_global_quota_apply_across_conversations(self):
        locked = copy.deepcopy(self.graph); locked['nodes'][0]['resources'] = ['database']
        cid = self.open(locked)
        first, second = self.add(cid=cid), self.add(cid=cid)
        with patch('workflow_engine.runtime.subprocess.Popen', side_effect=self.spawn):
            result = self.dispatch(cid)
            self.assertEqual(len(self.started(result)), 1)
            self.assertIn('Ressource occupée', json.dumps(result, ensure_ascii=False))
            others = [self.add('Other '+str(i)) for i in range(4)]
            result = self.dispatch()
            self.assertEqual(len(self.started(result)), 3)
            self.assertIn('Quatre étapes', json.dumps(result, ensure_ascii=False))
            self.finish(first)
            self.assertEqual(len(self.started(self.dispatch(cid, runs=[second['run']]))), 1)
            self.assertEqual(self.engine.run(others[-1]['run'])['nodes']['work']['status'], 'ready')

    def test_two_concurrent_dispatchers_claim_each_node_only_once(self):
        items = [self.add(str(i)) for i in range(8)]
        with patch('workflow_engine.runtime.subprocess.Popen', side_effect=self.spawn) as spawn:
            with concurrent.futures.ThreadPoolExecutor(2) as pool:
                results = list(pool.map(lambda _: self.dispatch(), range(2)))
            self.assertEqual(sum(len(self.started(r)) for r in results), 4)
            self.assertEqual(spawn.call_count, 4)
            self.assertEqual(sum(self.engine.run(i['run'])['nodes']['work']['status'] == 'running' for i in items), 4)

    def test_selection_is_validated_before_any_launch_and_pages_reach_last_request(self):
        items = [self.add(str(i)) for i in range(28)]
        other = self.add(cid=self.open(self.graph))
        with patch('workflow_engine.runtime.subprocess.Popen', side_effect=self.spawn) as spawn:
            with self.assertRaises(ContractError): self.dispatch(runs=[items[0]['run'], other['run']])
            spawn.assert_not_called()
            first = self.dispatch(limit=25)
            self.assertEqual(first['total'], 28); self.assertEqual(first['next'], 25)
            last = self.dispatch(offset=first['next'])
            self.assertIsNone(last['next']); self.assertEqual(len(last['items']), 3)
            self.assertEqual(last['items'][-1]['run'], items[-1]['run'])
            self.assertLess(len(json.dumps(first)), 40000)

    def test_missing_model_and_native_only_tools_report_actionable_waits_without_claim(self):
        graph = copy.deepcopy(self.graph); graph['defaults'].pop('model')
        cid = self.open(graph); item = self.add(cid=cid)
        tools = copy.deepcopy(self.graph); tools['nodes'][0]['required_capabilities'] = ['native-tools']
        tools_cid = self.open(tools); tools_item = self.add(cid=tools_cid)
        with patch('workflow_engine.runtime.subprocess.Popen', side_effect=self.spawn) as spawn:
            result = self.dispatch(cid)
            self.assertIn('modèle', json.dumps(result, ensure_ascii=False).lower())
            self.assertEqual(self.engine.run(item['run'])['nodes']['work']['attempt'], 0)
            result = self.dispatch(tools_cid)
            self.assertIn('native-tools', json.dumps(result, ensure_ascii=False))
            self.assertEqual(self.engine.run(tools_item['run'])['nodes']['work']['attempt'], 0)
            spawn.assert_not_called()

    def test_paused_cancelled_and_returned_runs_are_never_retried_or_auto_accepted(self):
        paused, cancelled = self.add('paused'), self.add('cancelled')
        self.engine.control(paused['run'], 'pause'); self.engine.control(cancelled['run'], 'cancel')
        manual = copy.deepcopy(self.graph); manual['nodes'][0]['validation'] = 'human'
        cid = self.open(manual); item = self.add(cid=cid)
        with patch('workflow_engine.runtime.subprocess.Popen', side_effect=self.spawn) as spawn:
            self.assertFalse(self.started(self.dispatch())); spawn.assert_not_called()
            self.dispatch(cid); self.finish(item)
            self.assertFalse(self.started(self.dispatch(cid)))
            self.assertEqual(self.engine.run(item['run'])['nodes']['work']['status'], 'returned')
            self.assertEqual(spawn.call_count, 1)

    def test_spawn_failure_is_recorded_and_not_retried_by_next_dispatch(self):
        item = self.add()
        with patch('workflow_engine.runtime.subprocess.Popen', side_effect=OSError('Synthetic spawn failure')) as spawn:
            result = self.dispatch()
            self.assertFalse(self.started(result))
            self.assertEqual(self.engine.run(item['run'])['nodes']['work']['status'], 'returned')
            self.dispatch(); self.assertEqual(spawn.call_count, 1)

    def test_ui_endpoint_requires_explicit_human_action_and_valid_pagination(self):
        from studio import request as ui_request
        item = self.add()
        payload = {'action': 'conversation.dispatch', 'conversation': self.cid, 'runs': [item['run']]}
        with patch('workflow_engine.runtime.subprocess.Popen', side_effect=self.spawn) as spawn:
            with self.assertRaises(ContractError): ui_request(self.engine, payload)
            for limit in (0, 26, True):
                with self.assertRaises(ContractError): ui_request(self.engine, {**payload, 'limit': limit}, human=True)
            spawn.assert_not_called()
            self.assertEqual(len(self.started(ui_request(self.engine, payload, human=True))), 1)

    def test_cancellation_after_claim_before_spawn_releases_lock_without_worker(self):
        graph = copy.deepcopy(self.graph); graph['nodes'][0]['resources'] = ['shared']
        cid = self.open(graph); item = self.add(cid=cid)
        original = self.engine.claim
        def cancelling_claim(*args, **kwargs):
            claim = original(*args, **kwargs)
            self.engine.control(item['run'], 'cancel')
            return claim
        with patch.object(self.engine, 'claim', side_effect=cancelling_claim), patch('workflow_engine.runtime.subprocess.Popen') as spawn:
            result = self.dispatch(cid)
            self.assertFalse(self.started(result)); spawn.assert_not_called()
        cancelled = self.engine.run(item['run'])
        self.assertEqual(cancelled['status'], 'cancelled')
        self.assertEqual(cancelled['nodes']['work']['status'], 'returned')
        following = self.add(cid=cid)
        with patch('workflow_engine.runtime.subprocess.Popen', side_effect=self.spawn):
            self.assertEqual(len(self.started(self.dispatch(cid, runs=[following['run']]))), 1)

    def test_cancellation_after_spawn_still_prevents_provider_execution(self):
        item = self.add()
        def cancelling_spawn(*args, **kwargs):
            worker = self.spawn(*args, **kwargs)
            self.engine.control(item['run'], 'cancel')
            return worker
        with patch('workflow_engine.runtime.subprocess.Popen', side_effect=cancelling_spawn):
            self.dispatch()
        state = self.engine.run(item['run'])['nodes']['work']
        with patch('workflow_engine.runtime.execute_text') as provider:
            execute(self.engine, item['run'], 'work', state['token'])
            provider.assert_not_called()
        self.assertEqual(self.engine.run(item['run'])['nodes']['work']['status'], 'returned')

    def test_node_cursor_reaches_work_after_one_hundred_native_only_blocks(self):
        graph = copy.deepcopy(self.graph)
        graph['nodes'] = [node('native'+str(i), 'Native task', 'task') for i in range(100)] + graph['nodes']
        cid = self.open(graph); item = self.add(cid=cid)
        with patch('workflow_engine.runtime.subprocess.Popen', side_effect=self.spawn) as spawn:
            first = self.dispatch(cid)
            self.assertEqual(first['checks'], 100); spawn.assert_not_called()
            self.assertEqual(first['items'][0]['next_node'], 100)
            self.assertTrue(first['items'][0]['waiting_truncated'])
            self.assertEqual(first['items'][0]['waiting_total'], 101)
            last = self.dispatch(cid, node_offsets={item['run']: first['items'][0]['next_node']})
            self.assertEqual(self.started(last)[0]['node'], 'work')
            self.assertIsNone(last['items'][0]['next_node'])

    def test_selected_provider_model_and_effort_are_not_substituted_by_coordinator(self):
        graph = copy.deepcopy(self.graph)
        graph['nodes'][0].update(provider='claude', model='synthetic-other-model', effort='high')
        cid = self.open(graph); item = self.add(cid=cid)
        before = self.engine.run(item['run'])['definition']['nodes'][0]['execution']
        with patch('workflow_engine.runtime.subprocess.Popen', side_effect=self.spawn):
            self.assertEqual(len(self.started(self.dispatch(cid))), 1)
        after = self.engine.run(item['run'])['definition']['nodes'][0]['execution']
        self.assertEqual(before, after)
        self.assertEqual((after['provider'], after['model'], after['effort']), ('claude', 'synthetic-other-model', 'high'))

    def test_missing_provider_is_reported_without_claim_or_provider_fallback(self):
        item = self.add()
        catalog = [{'id': key, 'installed': key != 'codex', 'usable': key != 'codex', 'reason': 'CLI codex absent'} for key in ('codex', 'claude', 'command')]
        with patch('workflow_engine.runtime.capabilities', return_value=catalog), patch('workflow_engine.runtime.subprocess.Popen') as spawn:
            result = self.dispatch()
            self.assertEqual(result['items'][0]['waiting'][0]['code'], 'provider.cli-missing')
            spawn.assert_not_called()
            self.assertEqual(self.engine.run(item['run'])['nodes']['work']['attempt'], 0)

    def test_real_local_document_workers_finish_with_distinct_pids_and_proofs(self):
        graph = copy.deepcopy(self.graph)
        graph['nodes'] = [node('draft', 'Prepare local draft', 'document', content='Synthetic meeting minutes', validation='automatic')]
        cid = self.open(graph); items = [self.add('Draft '+str(i), cid=cid) for i in range(3)]
        workers = []; popen = subprocess.Popen
        def real_worker(*args, **kwargs):
            worker = popen(*args, **kwargs); workers.append(worker); return worker
        try:
            with patch('workflow_engine.runtime.subprocess.Popen', side_effect=real_worker):
                result = self.dispatch(cid)
            self.assertEqual(len({s['pid'] for s in self.started(result)}), 3)
            for worker in workers: self.assertEqual(worker.wait(timeout=10), 0)
            for item in items:
                run = self.engine.run(item['run'])
                self.assertEqual(run['status'], 'completed')
                self.assertEqual(self.engine.evidence(run['nodes']['draft']['result']['evidence'][0]), b'Synthetic meeting minutes')
        finally:
            for worker in workers:
                if worker.poll() is None: worker.kill()
                worker.wait()


if __name__ == '__main__':
    unittest.main()

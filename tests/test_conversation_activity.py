"""Live work projections across pages; no provider calls or client data."""
import copy
import sys
import tempfile
import unittest
from pathlib import Path
from native_cli_fixture import use_native_cli_fixtures
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine
from workflow_engine.conversations import Conversations
from workflow_engine.projections import summary


class ConversationActivityTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        use_native_cli_fixtures(self, temp.name)
        self.engine = Engine(temp.name)
        self.project = self.engine.create_project('Synthetic parallel tasks')
        self.service = Conversations(self.engine)
        graph = {'schema': 1, 'id': 'parallel', 'title': 'Parallel work',
                 'defaults': {'provider': 'codex', 'model': 'fixture-model'},
                 'nodes': [{'id': 'work', 'kind': 'agent', 'title': 'Analyze', 'validation': 'contract'}], 'edges': []}
        self.conversation = self.service.open(self.project['id'], graph, 'codex')

    def add(self, request, **kw):
        return self.service.add(self.conversation['id'], request, **kw)

    def test_live_workers_keep_real_identity_and_disappear_on_failure(self):
        a, b = self.add('A'), self.add('B')
        self.engine.claim(a['run'], 'work', executor='native')
        claim = self.engine.claim(b['run'], 'work')
        snapshot = self.service.snapshot(self.conversation['id'], limit=25)
        self.assertTrue(all(i['execution']['conversation'] == self.conversation['id'] for i in snapshot['items']))
        self.assertTrue(all('parameters' not in i['execution'] for i in snapshot['items']))
        workers = [i['execution']['workers'][0] for i in snapshot['items']]
        self.assertEqual([w['ownership'] for w in workers], ['native', 'managed'])
        self.assertTrue(all(w['provider'] == 'codex' and w['model'] == 'fixture-model' for w in workers))
        self.assertTrue(all(w['started'] and w['heartbeat'] for w in workers))
        self.assertTrue(all('token' not in w and 'pid' not in w for w in workers))
        self.assertEqual(snapshot['activity']['running'], 2)
        run = self.engine.submit(b['run'], 'work', claim['token'], {'ok': False, 'summary': 'Synthetic failure'})
        before = copy.deepcopy(run)
        self.assertEqual(summary(run)['workers'], [])
        self.assertEqual(before, run)
        snapshot = self.service.snapshot(self.conversation['id'], limit=25)
        self.assertEqual(snapshot['activity']['running'], 1)
        self.assertEqual(snapshot['activity']['failed'], 1)

    def test_global_counts_do_not_shrink_to_page_or_search_results(self):
        first = self.add('First active task')
        self.engine.claim(first['run'], 'work')
        for i in range(26):
            self.add(f'Pending {i}')
        self.add('Consolidation', depends_on=[first['id']])
        initial = self.service.snapshot(self.conversation['id'], limit=25)
        filtered = self.service.snapshot(self.conversation['id'], query='Consolidation', limit=25)
        second = self.service.snapshot(self.conversation['id'], offset=25, limit=25)
        for value in (filtered, second):
            self.assertEqual(value['activity'], initial['activity'])
        self.assertEqual(initial['activity']['items'], 28)
        self.assertEqual(initial['activity']['running'], 1)
        self.assertEqual(initial['activity']['ready'], 26)
        self.assertEqual(initial['activity']['dependencies'], 1)
        self.assertEqual(filtered['items'][0]['dependencies'][0]['run'], first['run'])

    def test_snapshot_does_not_resume_an_unrelated_run_with_the_same_parameter(self):
        first = self.add('Authorized predecessor')
        claim = self.engine.claim(first['run'], 'work')
        completed = self.engine.submit(first['run'], 'work', claim['token'], {'ok': True, 'summary': 'Done', 'outputs': {}})
        orphan = self.engine.start(self.project['id'], completed['original'], deferred=True, driver='conversation',
                                   parameters={'conversation': self.conversation['id'], 'depends_on_runs': [first['run']]})
        self.service.snapshot(self.conversation['id'], limit=25)
        self.assertEqual(self.engine.run(orphan['id'])['status'], 'paused')

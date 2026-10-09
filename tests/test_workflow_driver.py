"""Runtime conversation state never becomes an execution policy in a model."""
import copy
from pathlib import Path
import sys
import subprocess
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from native_cli_fixture import use_native_cli_fixtures
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.conversations import Conversations
from workflow_engine.engine import run_driver
from workflow_engine.portable import export, import_definition
from workflow_engine.runtime import dispatch
from workflow_engine.schedules import Schedules
from studio import request


class WorkflowDriverTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='tricorder-driver-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        use_native_cli_fixtures(self, self.root)
        self.engine = Engine(self.root/'state')
        self.project = self.engine.create_project('Synthetic meeting')
        self.graph = {'schema': 1, 'id': 'minutes', 'title': 'Meeting minutes', 'nodes': [
            {'id': 'draft', 'kind': 'document', 'title': 'Prepare minutes', 'content': 'Synthetic local minutes', 'validation': 'contract'},
            {'id': 'review', 'kind': 'decision', 'title': 'Review minutes'}], 'edges': [{'id': 'draft-review', 'from': 'draft', 'to': 'review'}]}

    def wait_for_document(self, run):
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            current = self.engine.run(run['id'])
            if current['nodes']['draft']['status'] not in ('ready', 'running'):
                break
            time.sleep(.02)
        self.assertEqual(current['nodes']['draft']['status'], 'accepted', current)
        proof = current['nodes']['draft']['result']['evidence'][0]
        self.assertEqual(self.engine.evidence(proof), b'Synthetic local minutes')
        self.assertEqual(current['nodes']['review']['status'], 'waiting')
        return current

    def test_native_history_export_import_runs_automatically_and_on_schedule(self):
        workers = []
        popen = subprocess.Popen
        def tracked_worker(*args, **kwargs):
            worker = popen(*args, **kwargs)
            workers.append(worker)
            return worker
        tracked = patch('workflow_engine.runtime.subprocess.Popen', side_effect=tracked_worker)
        tracked.start(); self.addCleanup(tracked.stop)
        self.addCleanup(lambda: [worker.wait(timeout=5) for worker in workers])
        saved = self.engine.save(self.project['id'], self.graph)
        service = Conversations(self.engine)
        conversation = service.open(self.project['id'], saved, 'codex')
        item = service.add(conversation['id'], 'Prepare local minutes')
        native = self.engine.run(item['run'])
        self.assertEqual(native['driver'], 'conversation')
        self.assertNotIn('driver', native['original'])
        self.assertNotIn('driver', native['definition'])
        self.assertEqual(dispatch(self.engine, native['id'])['nodes']['draft']['status'], 'ready')
        claim = self.engine.claim(native['id'], 'draft')
        native = self.engine.submit(native['id'], 'draft', claim['token'], {'ok': True, 'summary': 'Synthetic native minutes'})
        gate = native['nodes']['review']
        native = self.engine.decide(native['id'], 'review', gate['nonce'], gate['proposal'], 'approve', human=True)
        frozen = copy.deepcopy(native)
        # Include a legacy marker in the input file to cover old exports as well.
        bundle = export({**native['original'], 'driver': 'conversation'}, {})
        self.assertNotIn('driver', bundle['workflow'])
        bundle['workflow']['driver'] = 'conversation'
        imported = import_definition(self.engine, self.project['id'], bundle)
        self.assertNotIn('driver', imported)
        checked = request(self.engine, {'action': 'workflow.validate', 'project': self.project['id'], 'graph': imported})
        self.assertEqual(checked['issues'], [])
        automatic = request(self.engine, {'action': 'run.start', 'project': self.project['id'], 'graph': imported})
        self.assertEqual(automatic['driver'], 'automatic')
        automatic = self.wait_for_document(automatic)
        self.assertNotIn('conversation', automatic['parameters'])
        self.assertNotEqual(automatic['nodes']['review']['nonce'], gate['nonce'])
        scheduler = Schedules(self.engine)
        scheduler.create(self.project['id'], imported, {'kind': 'interval', 'minutes': 5}, now=0)
        occurrence = scheduler.tick(now=301)[0]
        self.wait_for_document(dispatch(self.engine, occurrence['id']))
        self.assertEqual(self.engine.run(native['id']), frozen, 'Reusing a definition never changes old approvals or results')

    def test_direct_legacy_marker_is_actionable_and_cannot_stall_automatic_run(self):
        legacy = {**self.graph, 'driver': 'conversation'}
        checked = request(self.engine, {'action': 'workflow.validate', 'project': self.project['id'], 'graph': legacy})
        self.assertTrue(any(i.get('code') == 'workflow.runtime-context' and i['action'] == 'save-workflow' for i in checked['issues']))
        with self.assertRaisesRegex(ContractError, 'Enregistrez'):
            self.engine.start(self.project['id'], legacy)
        with self.assertRaisesRegex(ContractError, 'ancienne conversation'):
            Schedules(self.engine).create(self.project['id'], legacy, {'kind': 'interval', 'minutes': 5})
        self.assertEqual(self.engine.runs(self.project['id']), [])
        saved = self.engine.save(self.project['id'], legacy)
        self.assertNotIn('driver', saved)
        self.assertEqual(legacy['driver'], 'conversation')
        # Read old frozen runs conservatively; dispatch must still leave their
        # native work to their existing terminal, not spawn automatic workers.
        historical = {'id': 'legacy', 'status': 'active', 'definition': legacy, 'original': legacy,
                      'nodes': {'draft': {'status': 'ready'}, 'review': {'status': 'pending'}}}
        snapshot = copy.deepcopy(historical)
        self.assertEqual(run_driver(historical), 'conversation')
        self.assertEqual(dispatch(SimpleNamespace(run=lambda rid: historical), 'legacy'), snapshot)
        self.assertEqual(historical, snapshot)

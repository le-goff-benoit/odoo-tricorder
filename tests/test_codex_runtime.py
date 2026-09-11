from pathlib import Path
import subprocess
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import codex_runtime


class CodexRuntimeTests(unittest.TestCase):
    def test_status_flags_not_process_liveness(self):
        value = codex_runtime.agent({'id': 'native', 'status': {'type': 'active', 'activeFlags': ['waitingOnApproval']}})
        self.assertEqual(value['state'], 'waiting_human')
        self.assertIsNone(value['tool'])
        value = codex_runtime.agent({'id': 'native', 'status': {'type': 'notLoaded'}})
        self.assertEqual(value['state'], 'unknown')
        self.assertTrue(value['stale'])

    def test_reader_only_allows_read_methods_and_filters_notifications(self):
        script = """import sys,json
for line in sys.stdin:
 r=json.loads(line)
 print(json.dumps({'method':'approval', 'params':{'prompt':'PRIVATE'}}),flush=True)
 print(json.dumps({'id':r['id'],'result':{'thread':{'id':'t','status':{'type':'idle'}}}}),flush=True)
"""
        proc = subprocess.Popen([sys.executable, '-c', script], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
        reader = codex_runtime.Reader(proc)
        try:
            for method in ('thread/resume', 'thread/start', 'turn/start', 'turn/steer', 'serverRequest/resolve'):
                with self.subTest(method=method), self.assertRaises(ValueError):
                    reader.request(method, {})
            result = reader.request('thread/read', {'threadId': 't', 'includeTurns': False})
            self.assertEqual(result['thread']['id'], 't')
            self.assertNotIn('PRIVATE', str(result))
        finally:
            reader.close(); proc.terminate(); proc.wait(timeout=2); proc.stdin.close(); proc.stdout.close()


if __name__ == '__main__':
    unittest.main()

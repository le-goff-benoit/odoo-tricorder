import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import agent_hook
import observation


class ActivityHookTests(unittest.TestCase):
    def test_codex_native_hook_model_and_parent_are_metadata_only_and_duplicates_are_ignored(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'events.jsonl'
            rows = [
                (100, {'hook_event_name': 'UserPromptSubmit', 'turn_id': 't', 'model': 'principal'}),
                (101, {'hook_event_name': 'SubagentStart', 'agent_id': 'child', 'agent_type': 'tester', 'model': 'light'}),
                (102, {'hook_event_name': 'PreToolUse', 'tool_name': 'Bash', 'tool_use_id': 'cmd'}),
                (103, {'hook_event_name': 'PreToolUse', 'tool_name': 'Bash', 'tool_use_id': 'cmd'}),
                (120, {'hook_event_name': 'SubagentStop', 'agent_id': 'child', 'agent_type': 'tester'}),
                (140, {'hook_event_name': 'Stop', 'turn_id': 't'}),
            ]
            for stamp, row in rows:
                with patch('agent_hook.time.time', return_value=stamp):
                    agent_hook.record(path, {'session_id': 'parent', 'prompt': 'PRIVATE', 'tool_input': 'PRIVATE', **row})
            snapshot = observation.snapshot(path, 'codex-hooks')
            main, child = snapshot['agents']
            self.assertEqual(main['model'], 'principal')
            self.assertEqual(child['model'], 'light')
            self.assertEqual(child['parentId'], 'parent')
            self.assertEqual(child['role'], 'tester')
            self.assertEqual(main['startedAt'], observation.iso(100))
            self.assertEqual(main['endedAt'], observation.iso(140))
            self.assertEqual(child['endedAt'], observation.iso(120))
            self.assertEqual(len(main['events']), 3)
            self.assertNotIn('PRIVATE', json.dumps(snapshot))

    def test_silent_long_running_tool_stays_active_with_stale_evidence(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'events.jsonl'
            with patch('agent_hook.time.time', return_value=100):
                agent_hook.record(path, {'session_id': 'p', 'hook_event_name': 'UserPromptSubmit'})
            with patch('agent_hook.time.time', return_value=102):
                agent_hook.record(path, {'session_id': 'p', 'hook_event_name': 'PreToolUse', 'tool_name': 'Bash'})
            with patch('observation.time.time', return_value=1000):
                main = observation.snapshot(path, 'codex-hooks')['agents'][0]
            self.assertEqual(main['state'], 'tool')
            self.assertTrue(main['stale'])
            self.assertIsNone(main['endedAt'])
            self.assertEqual(main['startedAt'], observation.iso(100))

    def test_interrupt_closes_activity_and_waiting_does_not_run_timer(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'events.jsonl'
            for stamp, kind in ((100, 'UserPromptSubmit'), (110, 'PermissionRequest'), (120, 'Interrupt')):
                with patch('agent_hook.time.time', return_value=stamp):
                    agent_hook.record(path, {'session_id': 'p', 'hook_event_name': kind})
            main = observation.snapshot(path, 'codex-hooks')['agents'][0]
            self.assertEqual(main['state'], 'interrupted')
            self.assertEqual(main['endedAt'], observation.iso(110))


if __name__ == '__main__':
    unittest.main()

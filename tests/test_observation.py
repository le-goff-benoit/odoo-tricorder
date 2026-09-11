import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import agent_hook
import observation


class ObservationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.source = Path(self.temp.name) / 'session.jsonl'

    def tearDown(self):
        self.temp.cleanup()

    def write(self, rows, tail=''):
        self.source.write_text(''.join(json.dumps(r) + '\n' for r in rows) + tail)

    def test_codex_states_do_not_leak_text_arguments_or_output(self):
        self.write([
            {'type': 'session_meta', 'payload': {'id': 'thread-1'}},
            {'timestamp': '2026-09-11T10:00:00Z', 'type': 'event_msg', 'payload': {'type': 'task_started', 'message': 'PRIVATE-PROMPT'}},
            {'timestamp': '2026-09-11T10:00:01Z', 'type': 'response_item', 'payload': {'type': 'function_call', 'name': 'exec_command', 'arguments': 'PRIVATE-COMMAND', 'call_id': '1'}},
            {'timestamp': '2026-09-11T10:00:02Z', 'type': 'event_msg', 'payload': {'type': 'exec_approval_request', 'command': 'PRIVATE-COMMAND'}},
        ])
        data = observation.snapshot(self.source, 'codex')
        self.assertEqual(data['nativeId'], 'thread-1')
        self.assertEqual(data['agents'][0]['state'], 'waiting_human')
        self.assertTrue(data['agents'][0]['waitingOpen'])
        self.assertIsNone(data['waitingSeconds'])
        self.assertNotIn('PRIVATE', json.dumps(data))

    def test_claude_hook_only_records_allowlist_and_children(self):
        for event, extra in [('UserPromptSubmit', {}), ('PermissionRequest', {'tool_name': 'Bash'}),
                             ('SubagentStart', {'agent_id': 'child'}), ('SubagentStop', {'agent_id': 'child'}),
                             ('PostToolUse', {}), ('Stop', {})]:
            agent_hook.record(self.source, {'hook_event_name': event, 'session_id': 'parent',
                                           'prompt': 'PRIVATE-PROMPT', 'tool_input': {'secret': 'PRIVATE-KEY'}, **extra})
        self.assertEqual(os.stat(self.source).st_mode & 0o777, 0o600)
        self.assertNotIn('PRIVATE', self.source.read_text())
        data = observation.snapshot(self.source, 'claude-hooks')
        self.assertEqual(data['nativeId'], 'parent')
        child = next(a for a in data['agents'] if a['nativeId'] == 'child')
        self.assertEqual(child['parentId'], 'parent')
        self.assertEqual(child['state'], 'complete')
        self.assertIsNotNone(data['waitingUpperBoundSeconds'])
        self.assertIsNone(data['waitingSeconds'])

    def test_wait_intervals_and_open_window_are_distinct(self):
        self.write([{'rootId': 'p', 'nativeId': 'p', 'state': state, 'kind': 'PostToolUse' if state == 'tool' else 'PermissionRequest', 'requestId': 'r', 'at': f'2026-09-11T10:00:{second:02d}Z'}
                    for state, second in [('waiting_human', 0), ('waiting_human', 3), ('tool', 10), ('waiting_human', 20)]])
        data = observation.snapshot(self.source, 'claude-hooks')
        self.assertEqual(data['waitingUpperBoundSeconds'], 10)
        self.assertIsNone(data['waitingSeconds'])
        self.assertTrue(data['agents'][0]['waitingOpen'])
        bounded = observation.snapshot(self.source, 'claude-hooks', until='2026-09-11T10:00:15Z')
        self.assertFalse(bounded['agents'][0]['waitingOpen'])

    def test_unknown_format_and_identity_replacement_fail_closed(self):
        self.write([{'message': 'private'}])
        with self.assertRaises(ValueError):
            observation.snapshot(self.source, 'codex')
        self.write([{'type': 'session_meta', 'payload': {'id': 'changed'}}])
        with self.assertRaises(ValueError):
            observation.snapshot(self.source, 'codex', expected='original')

    def test_partial_last_line_does_not_break_live_observation(self):
        self.write([{'type': 'session_meta', 'payload': {'id': 'p'}}], '{"unfinished')
        result = observation.snapshot(self.source, 'codex')
        self.assertTrue(result['warnings'])
        self.assertEqual(result['agents'], [])

    def test_fork_ignores_inherited_agent_events(self):
        self.write([
            {'type': 'session_meta', 'payload': {'id': 'child', 'source': {'subagent': {'thread_spawn': {'parent_thread_id': 'parent'}}}}},
            {'type': 'session_meta', 'payload': {'id': 'parent'}},
            {'type': 'event_msg', 'payload': {'type': 'exec_approval_request'}, 'timestamp': '2026-09-11T10:00:00Z'},
            {'type': 'event_msg', 'payload': {'type': 'thread_settings_applied', 'thread_id': 'child'}},
            {'type': 'event_msg', 'payload': {'type': 'task_started'}, 'timestamp': '2026-09-11T10:00:01Z'},
        ])
        result = observation.snapshot(self.source, 'codex')
        self.assertEqual(result['agents'][0]['state'], 'active')
        self.assertEqual(result['agents'][0]['parentId'], 'parent')
        self.assertEqual(len(result['agents'][0]['events']), 1)

    def test_app_server_event_export(self):
        self.write([
            {'method': 'thread/started', 'params': {'thread': {'id': 't'}}},
            {'method': 'turn/started', 'params': {'threadId': 't'}, 'timestamp': '2026-09-11T10:00:00Z'},
            {'method': 'item/commandExecution/requestApproval', 'params': {'threadId': 't', 'command': 'PRIVATE'}, 'timestamp': '2026-09-11T10:00:10Z'},
            {'method': 'serverRequest/resolved', 'params': {'threadId': 't'}, 'timestamp': '2026-09-11T10:00:20Z'},
            {'method': 'turn/completed', 'params': {'threadId': 't', 'turn': {'status': 'interrupted'}}, 'timestamp': '2026-09-11T10:00:30Z'},
        ])
        result = observation.snapshot(self.source, 'codex')
        self.assertEqual(result['agents'][0]['state'], 'interrupted')
        self.assertEqual(result['waitingSeconds'], 10)
        self.assertNotIn('PRIVATE', json.dumps(result))

    def test_usage_reader_called_with_explicit_bounds_and_not_written(self):
        from types import SimpleNamespace
        self.write([{'type': 'session_meta', 'payload': {'id': 'p'}}])
        before = self.source.read_bytes()
        calls = []
        def read(path, provider, since, until):
            calls.append((path, provider, since, until))
            return {'thread_id': 'p', 'active_seconds': 42, 'tokens': None, 'complete': False}
        with patch('catalog.trusted_module', return_value=SimpleNamespace(read_usage=read)):
            result = observation.snapshot(self.source, 'codex', since='2026-09-11T10:00:00Z', until='2026-09-11T11:00:00Z')
        self.assertEqual(result['usage']['active_seconds'], 42)
        self.assertEqual(calls[0][2], '2026-09-11T10:00:00Z')
        self.assertEqual(before, self.source.read_bytes())

    def test_bad_dates_regressive_events_and_ambiguous_hooks_rejected(self):
        for rows in [
            [{'rootId': 'a'}, {'rootId': 'b'}],
            [{'rootId': 'a', 'nativeId': 'a', 'state': 'active', 'at': 'bad'}],
            [{'rootId': 'a', 'nativeId': 'a', 'state': 'active', 'at': date} for date in ['2026-09-11T11:00:00Z', '2026-09-11T10:00:00Z']],
        ]:
            self.write(rows)
            with self.assertRaises(ValueError):
                observation.snapshot(self.source, 'claude-hooks')

    def test_hook_never_follows_output_symlink(self):
        victim = Path(self.temp.name) / 'private'
        victim.write_text('unchanged')
        self.source.symlink_to(victim)
        with self.assertRaises(OSError):
            agent_hook.record(self.source, {'session_id': 'p', 'hook_event_name': 'Stop'})
        self.assertEqual(victim.read_text(), 'unchanged')

    def test_subagent_tool_hook_never_changes_parent_state(self):
        self.assertEqual(observation.claude_hook({'hook_event_name': 'PreToolUse', 'session_id': 'parent', 'agent_id': 'child', 'tool_name': 'Bash'})['nativeId'], 'child')

    def test_parallel_tool_result_does_not_resolve_another_permission(self):
        self.write([{'rootId': 'p', 'nativeId': 'p', 'at': '2026-09-11T10:00:00Z', 'state': 'waiting_human', 'kind': 'PermissionRequest', 'requestId': 'blocked'},
                    {'rootId': 'p', 'nativeId': 'p', 'at': '2026-09-11T10:00:10Z', 'state': 'active', 'kind': 'PostToolUse', 'requestId': 'parallel'}])
        result = observation.snapshot(self.source, 'claude-hooks')
        self.assertEqual(result['agents'][0]['state'], 'waiting_human')
        self.assertIsNone(result['waitingSeconds'])


if __name__ == '__main__':
    unittest.main()

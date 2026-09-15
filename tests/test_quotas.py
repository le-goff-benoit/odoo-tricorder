import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import quotas
import statusline


class QuotaTests(unittest.TestCase):
    def test_cache_without_timestamp_never_becomes_fresh(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'quota.json'
            for stamp in (None, 'invalid'):
                path.write_text(json.dumps({'provider': 'claude', 'observedAt': stamp,
                                            'windows': [{'id': 'five_hour', 'usedPercent': 80}]}))
                with patch('codex_runtime.rate_limits', return_value={}):
                    value = quotas.snapshot([str(path)])[1]
                self.assertEqual(value['availability'], 'unavailable')
                self.assertIsNone(value['observedAt'])
                self.assertEqual(value['windows'], [])

    def test_codex_multiple_buckets_keep_native_duration_and_ignore_legacy_duplicate(self):
        value = quotas.normalize('codex', {'rateLimits': {'primary': {'usedPercent': 99}}, 'rateLimitsByLimitId': {
            'codex': {'primary': {'usedPercent': 0, 'windowDurationMins': 300, 'resetsAt': 2000000100},
                      'secondary': {'usedPercent': 42, 'windowDurationMins': 10080}},
            'review': {'primary': {'usedPercent': 80, 'windowDurationMins': 60}},
        }}, 2000000000)
        self.assertEqual([w['usedPercent'] for w in value['windows']], [0, 42, 80])
        self.assertEqual(value['windows'][2]['label'], '60 min')
        self.assertEqual(value['identity'], 'unknown')

    def test_absent_null_false_invalid_are_never_zero(self):
        for amount in (None, False, '0', float('nan'), -1, 101):
            with self.subTest(amount=amount):
                value = quotas.normalize('claude', {'rate_limits': {'five_hour': {'used_percentage': amount}}})
                self.assertIsNone(value['windows'][0]['usedPercent'])
                self.assertEqual(value['availability'], 'unavailable')
        self.assertEqual(quotas.normalize('claude', None)['windows'], [])

    def test_reset_requires_new_observation_not_fabricated_zero(self):
        payload = {'rate_limits': {'five_hour': {'used_percentage': 98, 'resets_at': 2000000100}}}
        old = quotas.freshness(quotas.normalize('claude', payload, 2000000000), 2000000101)
        self.assertIsNone(old['windows'][0]['usedPercent'])
        self.assertEqual(old['availability'], 'stale')
        payload['rate_limits']['five_hour'] = {'used_percentage': 2, 'resets_at': 2000018000}
        new = quotas.freshness(quotas.normalize('claude', payload, 2000000102), 2000000103)
        self.assertEqual(new['windows'][0]['usedPercent'], 2)

    def test_old_or_future_clock_observation_is_stale(self):
        for stamp in (1000000000, 2000001000):
            value = quotas.normalize('codex', {'rateLimits': {'primary': {'usedPercent': 0}}}, stamp)
            self.assertEqual(quotas.freshness(value, 2000000000)['availability'], 'stale')

    def test_collector_strips_everything_except_quota_metadata_and_latest_session_wins(self):
        with tempfile.TemporaryDirectory() as folder:
            paths = [Path(folder) / (str(i) + '.json') for i in range(2)]
            for index, file in enumerate(paths):
                with patch('quotas.time.time', return_value=2000000000 + index):
                    statusline.collect(file, {'model': {'id': 'PRIVATE'}, 'api_key': 'PRIVATE',
                        'rate_limits': {'five_hour': {'used_percentage': index * 80, 'resets_at': 2000018000}}})
                self.assertNotIn('PRIVATE', file.read_text())
                self.assertEqual(file.stat().st_mode & 0o777, 0o600)
            with patch('codex_runtime.rate_limits', side_effect=OSError()), patch('quotas.time.time', return_value=2000000002):
                values = quotas.snapshot([str(p) for p in paths] * 2)
            self.assertEqual(values[0]['availability'], 'unavailable')
            self.assertIsNone(values[0]['observedAt'])
            self.assertEqual(values[1]['windows'][0]['usedPercent'], 80)
            self.assertEqual(len(values[1]['windows']), 1)
            self.assertTrue(any('Dernière session' in w for w in values[1]['warnings']))

    def test_unsupported_newer_session_clears_previous_values(self):
        with tempfile.TemporaryDirectory() as folder:
            paths = [Path(folder) / f'{i}.json' for i in range(2)]
            for i, file in enumerate(paths):
                with patch('quotas.time.time', return_value=2000000000 + i):
                    statusline.collect(file, {'rate_limits': {'five_hour': {'used_percentage': 40}}} if i == 0 else {})
            with patch('codex_runtime.rate_limits', return_value={}), patch('quotas.time.time', return_value=2000000002):
                claude = quotas.snapshot([str(p) for p in paths])[1]
            self.assertEqual(claude['availability'], 'unavailable')
            self.assertEqual(claude['windows'], [])

    def test_statusline_preserves_exact_original_stdin_and_stdout(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / 'quota.json'
            raw = b'{"rate_limits":{"five_hour":{"used_percentage":0}},"model":{"display_name":"Fixture"}}'
            result = subprocess.run([sys.executable, str(Path(statusline.__file__)), str(target), 'cat'], input=raw, capture_output=True, timeout=5)
            self.assertEqual(result.stdout, raw)
            self.assertEqual(result.returncode, 0)
            self.assertNotIn('Fixture', target.read_text())

    def test_collector_replaces_symlink_without_touching_destination(self):
        with tempfile.TemporaryDirectory() as folder:
            protected, target = Path(folder) / 'protected', Path(folder) / 'quota.json'
            protected.write_text('unchanged'); target.symlink_to(protected)
            statusline.collect(target, {})
            self.assertEqual(protected.read_text(), 'unchanged')
            self.assertFalse(target.is_symlink())


if __name__ == '__main__':
    unittest.main()

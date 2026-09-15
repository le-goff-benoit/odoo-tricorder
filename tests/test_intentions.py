import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import catalog


class IntentionsTests(unittest.TestCase):
    def test_global_summary_exposes_new_intention_before_any_plan(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            release = root / 'changelog/test'
            release.mkdir(parents=True)
            (release / 'README.md').write_text('<!-- release ouverte -->\n# Nouvelle release')
            path = release / 'intentions.json'
            path.write_text(json.dumps({'schema': 1, 'items': [
                {'id': 'I01', 'text': 'Demande avant plan', 'status': 'clarify'}]}))
            result = catalog.summary(root)
            self.assertEqual(result['releases'][0]['intentions']['items'][0]['id'], 'I01')
            self.assertEqual(result['board'], [])
            self.assertFalse((release / 'plan.json').exists())

    def test_register_is_read_only_and_never_infers_satisfaction(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            release = root / 'changelog/test'
            release.mkdir(parents=True)
            path = release / 'intentions.json'
            path.write_text(json.dumps({'schema': 1, 'revision': 2, 'items': [
                {'id': 'I01', 'text': 'Demande originale', 'status': 'planned', 'tasks': ['T01']}]}))
            before = path.read_bytes()
            result = catalog.intentions_details(root, 'test')
            self.assertEqual(result['items'][0]['status'], 'planned')
            self.assertEqual(path.read_bytes(), before)

    def test_invalid_or_missing_is_not_empty_success(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            self.assertFalse(catalog.intentions_details(root, 'test')['available'])
            release = root / 'changelog/test'
            release.mkdir(parents=True)
            (release / 'intentions.json').write_text('{broken')
            self.assertTrue(catalog.intentions_details(root, 'test')['warnings'])

    def test_orchestration_attachment_preserves_identity_without_cross_release_leak(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / '.odoo-agents').mkdir()
            path = root / '.odoo-agents/orchestration.json'
            data = {'schema': 1, 'id': 'run-1', 'status': 'waiting', 'started_at': '2026-09-15T09:00:00Z', 'authorized_tasks': ['T01']}
            path.write_text(json.dumps(data))
            before = catalog.orchestration_details(root)
            data['release'] = 'test'
            path.write_text(json.dumps(data))
            self.assertIsNone(catalog.orchestration_details(root))
            self.assertIsNone(catalog.orchestration_details(root, 'other'))
            after = catalog.orchestration_details(root, 'test')
            self.assertEqual(before['id'], after['id'])
            self.assertEqual(before['startedAt'], after['startedAt'])
            self.assertEqual(after['state'], 'waiting')
            self.assertEqual(after['taskIds'], ['T01'])

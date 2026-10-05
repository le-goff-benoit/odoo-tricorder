import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import knowledge


class KnowledgeReaderTests(unittest.TestCase):
    def test_plan_validation_shared_within_read_and_fresh_on_next_read(self):
        from catalog import trusted_module
        planner = trusted_module('odoo_plan')
        original = planner.statuses
        calls = []
        source = {'state': 'validated'}

        def validate(plan, project):
            calls.append((plan['revision'], str(project)))
            return {'T01': (source['state'], 'canonical verdict')}

        with patch.object(planner, 'statuses', side_effect=validate) as validator:
            with knowledge.validation_session():
                plan = {'revision': 1}
                first = planner.statuses(plan, '/tmp/project')
                first['T01'] = ('fabricated', '')
                self.assertEqual(planner.statuses(plan, '/tmp/project')['T01'][0], 'validated')
                planner.statuses({'revision': 2}, '/tmp/project')
                planner.statuses(plan, '/tmp/other-project')
                self.assertEqual(len(calls), 3)
            self.assertIs(planner.statuses, validator)
            source['state'] = 'stale'
            with knowledge.validation_session():
                self.assertEqual(planner.statuses(plan, '/tmp/project')['T01'][0], 'stale')
            self.assertEqual(len(calls), 4)
        self.assertIs(planner.statuses, original)

    def test_snapshot_reuses_verdicts_and_restores_validator_on_failure(self):
        from catalog import trusted_module
        planner = trusted_module('odoo_plan')

        def snapshot(*args):
            for _ in range(41):
                planner.statuses({'tasks': []}, '/tmp/project')
            raise ValueError('synthetic failure after contributions')

        engine = SimpleNamespace(snapshot=snapshot)
        original_load = trusted_module
        def load(name):
            return engine if name == 'odoo_knowledge' else original_load(name)
        with patch('catalog.trusted_module', side_effect=load), \
                patch.object(planner, 'statuses', return_value={}) as validator:
            result = knowledge.snapshot('/tmp/project', 'R1')
            self.assertFalse(result['available'])
            self.assertIn('synthetic failure', result['warnings'][0])
            self.assertEqual(validator.call_count, 1)
            self.assertIs(planner.statuses, validator)

    def test_missing_canonical_validator_is_explicit_not_green(self):
        with patch('catalog.trusted_module', side_effect=ValueError('absent')):
            value = knowledge.snapshot('/tmp')
        self.assertFalse(value['available']); self.assertIn('absent', value['warnings'][0])

    def test_reads_release_contributions_and_does_not_write(self):
        from catalog import trusted_module
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); release = root / 'changelog/R1'; release.mkdir(parents=True)
            (release / 'README.md').write_text('# Release')
            (root / 'source.md').write_text('Exception société B')
            documents = trusted_module('odoo_documents')
            engine = trusted_module('odoo_knowledge')
            engine.publish(root, 'R1', {'schema': 1, 'id': 'K1', 'kind': 'discovery', 'state': 'proposed',
                'statement': 'Exception société B', 'author': 'analyste', 'scope': [],
                'sources': [documents.reference(root, 'source.md')]})
            before = {str(p): p.read_bytes() for p in root.rglob('*') if p.is_file()}
            result = knowledge.snapshot(root, 'R1')
            self.assertTrue(result['available']); self.assertEqual(result['contributions'][0]['state'], 'proposed')
            self.assertEqual(before, {str(p): p.read_bytes() for p in root.rglob('*') if p.is_file()})
            (root / 'source.md').write_text('Autre règle')
            self.assertEqual(knowledge.snapshot(root, 'R1')['contributions'][0]['freshness'], 'stale')

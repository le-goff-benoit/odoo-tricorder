import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import knowledge


class KnowledgeReaderTests(unittest.TestCase):
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

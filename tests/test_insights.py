from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import insights
import catalog


class InsightsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.home = Path(self.temp.name)
        self.root = self.home / 'project'
        self.root.mkdir()

    def tearDown(self):
        self.temp.cleanup()

    def manifest(self, root, name, deps):
        folder = root / name
        folder.mkdir(parents=True)
        (folder / '__manifest__.py').write_text(repr({'depends': deps}))

    def test_transitive_enterprise_oca_and_missing_dependencies(self):
        community, enterprise, oca = [self.home / p for p in ('community', 'enterprise', 'oca')]
        self.manifest(self.root, 'custom', ['sale', 'oca_bridge'])
        self.manifest(community / 'addons', 'sale', ['base'])
        self.manifest(community / 'odoo/addons', 'base', [])
        self.manifest(oca / 'sale-workflow', 'oca_bridge', ['sale_enterprise', 'missing'])
        self.manifest(enterprise, 'sale_enterprise', ['sale'])
        result = insights.dependencies(self.root, [{'kind': 'Community', 'path': community, 'present': True}, {'kind': 'Enterprise', 'path': enterprise, 'present': True}], [oca])
        self.assertEqual(result['enterprise'], ['sale_enterprise'])
        self.assertEqual(result['oca'], ['oca_bridge'])
        self.assertEqual(result['unresolved'], ['missing'])
        self.assertFalse(result['complete'])

    def test_manifest_is_not_executed_and_cycles_terminate(self):
        self.manifest(self.root, 'a', ['b'])
        self.manifest(self.root, 'b', ['a'])
        result = insights.dependencies(self.root, [], [])
        self.assertEqual(len(result['modules']), 2)
        (self.root / 'a/__manifest__.py').write_text("__import__('os').system('false')")
        result = insights.dependencies(self.root, [], [])
        self.assertFalse(result['complete'])
        self.assertTrue(result['warnings'])

    def test_revision_exact_series_and_pinned_commit(self):
        with patch('insights.git', side_effect=['18.0', 'a' * 40]):
            data = insights.revision(self.root, 'saas~19.1', 'b' * 40)
        self.assertEqual(data['expectedBranch'], 'saas-19.1')
        self.assertFalse(data['branchMatches'])
        self.assertFalse(data['commitMatches'])

    def test_explicit_online_profile_does_not_require_module_runtime(self):
        sources = catalog.source_details(self.root, '19.0', [], self.home / 'sources')
        result = insights.enrich(self.root, sources, {'kind': 'online'})
        self.assertFalse(result['inferred'])
        self.assertFalse(result['libraries'][0]['required'])

    def test_search_is_cross_release_bounded_and_does_not_escape(self):
        folder = self.root / 'changelog/r1'
        folder.mkdir(parents=True)
        (folder / 'demande.md').write_text('Une demande\nOrbital exemple')
        private = self.home / 'private.md'
        private.write_text('Orbital SECRET')
        (folder / 'outside.md').symlink_to(private)
        result = insights.search(self.root, 'orbital')
        self.assertEqual(len(result['results']), 1)
        self.assertEqual(result['results'][0]['line'], 2)
        self.assertNotIn('SECRET', str(result))
        self.assertEqual(result['skipped'], 1)

    def test_explorer_masks_private_files_and_refuses_arbitrary_reads(self):
        (self.root / 'inbox').mkdir()
        (self.root / 'inbox/test.eml').write_text('Subject: synthetic')
        (self.root / '.env').write_text('PRIVATE')
        (self.root / 'auth.json').write_text('PRIVATE')
        (self.root / 'script.sh').write_text('false')
        self.assertEqual([e['name'] for e in insights.files(self.root)['entries']], ['inbox', 'script.sh'])
        self.assertFalse(insights.files(self.root)['entries'][1]['readable'])
        for name in ('.env', 'auth.json', '../outside.txt', 'script.sh'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                insights.file_preview(self.root, name)
        self.assertEqual(insights.file_preview(self.root, 'inbox/test.eml')['type'], 'text')

    def test_stack_restoration_unknown_is_not_zero(self):
        data = insights.stack(self.root, {})
        self.assertIsNone(data['ageDays'])
        data = insights.stack(self.root, {'restoredAt': '2026-01-01T00:00:00Z'})
        self.assertGreater(data['ageDays'], 0)
        self.assertIn('non sondé', data['services'])


if __name__ == '__main__':
    unittest.main()

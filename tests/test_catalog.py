import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import catalog


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.home = Path(self.temp.name)
        self.project = self.home / 'client avec espaces'
        (self.project / '.odoo-agents').mkdir(parents=True)
        (self.project / '.odoo-agents/config').write_text('series = 18.0\n')
        self.release = self.project / 'changelog/2026-09-11_test'
        self.release.mkdir(parents=True)
        (self.release / 'README.md').write_text('<!-- release ouverte -->\n# Une release\n')

    def tearDown(self):
        self.temp.cleanup()

    def write_json(self, path, data):
        path.write_text(json.dumps(data))

    def test_discovery_series_and_release(self):
        (self.home / '.hidden').mkdir()
        found = catalog.overview(self.home, [])
        self.assertEqual([p['name'] for p in found], ['client avec espaces'])
        self.assertEqual(found[0]['series'], '18.0')
        self.assertEqual(found[0]['release']['status'], 'ouverte')

    def test_removed_email_not_exposed_or_loaded(self):
        original = catalog.trusted_module
        def guarded(name):
            self.assertNotEqual(name, 'odoo_delivery', 'Removed email storage must not be read')
            return original(name)
        with patch.object(catalog, 'trusted_module', side_effect=guarded):
            data = catalog.project(self.project, self.release.name)
        self.assertNotIn('delivery', data)
        self.assertNotIn('deliveryConfig', data)

    def test_removed_email_actions_are_unknown(self):
        with patch.object(catalog, 'trusted_module') as load:
            for action in ('delivery-configure', 'delivery-edit', 'delivery-connect-smtp'):
                with self.subTest(action=action), self.assertRaisesRegex(ValueError, 'Action inconnue'):
                    catalog.dispatch({'action': action})
            load.assert_not_called()

    def test_explicit_no_release_does_not_fall_back_to_existing(self):
        data = catalog.project(self.project, '')
        self.assertIsNone(data['selectedRelease'])
        self.assertEqual(data['tasks'], [])
        self.assertIsNone(data['effort'])
        self.assertTrue(data['releases'])
        self.assertEqual(catalog.project(self.project)['selectedRelease'], self.release.name)

    def test_secrets_never_returned_and_url_cleaned(self):
        self.write_json(self.project / '.odoo-agents/instances.json', {
            'production': {'kind': 'production', 'url': 'https://user:secret@example.test/odoo?token=secret#secret',
                           'login': 'personal@example.test', 'secret': 'API-SECRET', 'db': 'db', 'platform': 'odoo.sh'}
        })
        data = catalog.environments(self.project)
        self.assertEqual(data[0]['url'], 'https://example.test/odoo')
        self.assertNotIn('secret', json.dumps(data))
        self.assertNotIn('personal', json.dumps(data))
        self.assertEqual(data[0]['connectivity'], 'unchecked')

    def test_document_boundary_including_symlinks(self):
        outside = self.home / 'private.md'
        outside.write_text('secret')
        (self.release / 'escape.md').symlink_to(outside)
        for target in ('../private.md', 'changelog/2026-09-11_test/escape.md', '.odoo-agents/instances.json'):
            with self.subTest(target=target), self.assertRaises(ValueError):
                catalog.document(self.project, target)
        self.assertIn('Une release', catalog.document(self.project, 'changelog/2026-09-11_test/README.md')['text'])

    def test_missing_exact_sources_never_uses_other_series(self):
        root = self.home / 'odoo-sources'
        (root / '19.0').mkdir(parents=True)
        (self.project / 'custom').mkdir()
        (self.project / 'custom/__manifest__.py').write_text("{'version': '18.0.1.0.0'}")
        result = catalog.source_details(self.project, '18.0', [], root)
        self.assertEqual(result['profile'], 'module')
        self.assertFalse(result['libraries'][0]['present'])
        self.assertTrue(result['libraries'][0]['path'].endswith('/18.0'))
        self.assertTrue(result['libraries'][0]['required'])

    def test_online_sources_are_reference_not_module_requirement(self):
        result = catalog.source_details(self.project, 'saas~19.1', [{'platform': 'online'}], self.home / 'sources')
        self.assertEqual(result['profile'], 'online')
        self.assertFalse(result['libraries'][0]['required'])
        self.assertTrue(result['libraries'][0]['path'].endswith('/19.1'))

    def test_plan_without_tooling_does_not_invent_validation(self):
        self.write_json(self.release / 'plan.json', {'schema': 1, 'tasks': [{'id': 'T01', 'title': 'Test', 'receipt': {'at': '2026-01-01'}}]})
        with patch.object(catalog, 'trusted_module', side_effect=ValueError('Outillage absent')):
            tasks, warnings = catalog.plan_tasks(self.project, self.release.name)
        self.assertEqual(tasks[0]['status'], 'unverified')
        self.assertEqual(warnings, ['Outillage absent'])

    def test_authoritative_stale_status_is_preserved(self):
        from types import SimpleNamespace
        self.write_json(self.release / 'plan.json', {'schema': 1, 'tasks': [{'id': 'T01', 'title': 'Test'}]})
        module = SimpleNamespace(validate=lambda *_: None, statuses=lambda *_: {'T01': ('stale', 'code changé')})
        with patch.object(catalog, 'trusted_module', return_value=module):
            tasks, warnings = catalog.plan_tasks(self.project, self.release.name)
        self.assertEqual(tasks[0]['status'], 'stale')
        self.assertEqual(tasks[0]['reason'], 'code changé')
        self.assertFalse(warnings)

    def test_effort_computed_without_writing_report(self):
        from types import SimpleNamespace
        self.write_json(self.release / 'effort.json', {'schema': 1})
        module = SimpleNamespace(report_data=lambda *_: {'rows': [], 'totals': {'actual_minutes': None, 'tokens': None}})
        before = set(self.release.iterdir())
        with patch.object(catalog, 'trusted_module', return_value=module):
            result = catalog.effort_details(self.release)
        self.assertIsNone(result['totals']['actual_minutes'])
        self.assertEqual(before, set(self.release.iterdir()))

    def test_effort_explains_unrecorded_running_interrupted_and_missing_duration(self):
        from types import SimpleNamespace
        states = ['complete', 'unrecorded', 'running', 'interrupted', 'missing-duration']
        rows = [{'task': str(i), 'agent': 'qa', 'time_complete': state == 'complete'} for i, state in enumerate(states)]
        entries = [{'task': str(i), 'agent': 'qa', 'status': state if state in ('running', 'interrupted') else 'complete'}
                   for i, state in enumerate(states) if state != 'unrecorded']
        self.write_json(self.release / 'effort.json', {'entries': entries})
        before = (self.release / 'effort.json').read_bytes()
        with patch.object(catalog, 'trusted_module', return_value=SimpleNamespace(report_data=lambda *_: {'rows': rows})):
            result = catalog.effort_details(self.release)
        self.assertEqual([r['timeState'] for r in result['rows']], states)
        self.assertEqual(result['openTimers'], [{'task': '2', 'agent': 'qa'}])
        self.assertEqual((self.release / 'effort.json').read_bytes(), before)

    def test_malformed_plan_and_instances_leave_project_accessible(self):
        (self.release / 'plan.json').write_text('{broken')
        (self.release / 'effort.json').write_text('{broken')
        (self.project / '.odoo-agents/instances.json').write_text('{broken')
        result = catalog.project(self.project)
        self.assertEqual(result['name'], self.project.name)
        self.assertEqual(result['tasks'], [])
        self.assertEqual(result['environments'], [])
        self.assertGreaterEqual(len(result['warnings']), 2)
        self.assertTrue(result['effort']['unverified'])

    def test_unassigned_active_flow_visible_without_inventing_release(self):
        folder = self.project / '.odoo-agents/flows'
        folder.mkdir()
        self.write_json(folder / 'closure.json', {'status': 'active', 'kind': 'close'})
        self.write_json(folder / 'old.json', {'status': 'complete', 'kind': 'close'})
        self.assertEqual(list(catalog.related_flows(self.project, self.release.name)), [('.odoo-agents/flows/closure.json', True)])


if __name__ == '__main__':
    unittest.main()

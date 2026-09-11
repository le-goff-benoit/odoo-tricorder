import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import catalog
from lifecycle import release_state, legacy_tasks, link_flows, receipt_context


class LifecycleTests(unittest.TestCase):
    def test_express_without_release_includes_completed_and_promoted_runs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / '.odoo-agents/flows'
            folder.mkdir(parents=True)
            for name, kind, status, events in [
                ('finished', 'express', 'complete', [{'node': 'express_qa', 'outcome': 'pass', 'evidence': ['qa.md']}]),
                ('expanded', 'express', 'active', [{'node': 'express_scope', 'outcome': 'full'}]),
                ('ordinary', 'development', 'complete', []),
            ]:
                (folder / (name + '.json')).write_text(json.dumps({
                    'kind': kind, 'status': status, 'events': events,
                    'graph_snapshot': {'nodes': {}}, 'claims': {}}))
            result = catalog.express_interventions(root)
            self.assertEqual({f['id'] for f in result}, {'finished', 'expanded'})
            finished = next(f for f in result if f['id'] == 'finished')
            self.assertIsNone(finished['release'])
            self.assertEqual(finished['status'], 'complete')
            self.assertEqual(finished['expressQA'], 'pass')
            self.assertEqual(finished['expressEvidence'], ['qa.md'])
            self.assertTrue(next(f for f in result if f['id'] == 'expanded')['promoted'])

    def test_express_qa_retry_does_not_keep_old_green_result(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / '.odoo-agents/flows'
            folder.mkdir(parents=True)
            (folder / 'run.json').write_text(json.dumps({'kind': 'express', 'status': 'active',
                'graph_snapshot': {'nodes': {}}, 'events': [
                    {'node': 'express_qa', 'outcome': 'pass'},
                    {'node': 'express_qa', 'outcome': 'retry'}]}))
            self.assertEqual(catalog.express_interventions(root)[0]['expressQA'], 'retry')

    def test_express_ignores_external_symlinks_and_filename_guesses(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / 'project'
            folder = root / '.odoo-agents/flows'
            folder.mkdir(parents=True)
            outside = Path(tmp) / 'outside.json'
            outside.write_text(json.dumps({'kind': 'express'}))
            (folder / 'linked.json').symlink_to(outside)
            (folder / 'express-name-only.json').write_text('{}')
            (folder / 'broken.json').write_text('{broken')
            self.assertEqual(catalog.express_interventions(root), [])

    def test_crew_closure_removes_marker_and_supports_legacy_lot(self):
        for marker in ('<!-- release ouverte -->', '<!-- lot ouvert -->'):
            self.assertEqual(release_state(marker + '\n# Release')[0], 'ouverte')
        for text in ('# Release', '**Release clôturée**', '<!-- release close -->'):
            self.assertEqual(release_state(text)[0], 'close')

    def test_legacy_points_are_declared_not_proof_validated(self):
        text = '| 1 | Livrer | Test | **fait** |\n| 2 | Préparer | à faire |\n| 3 | Sujet | ambigu |\n```\n| 4 | Exemple | fait |\n```'
        tasks = legacy_tasks(text, 'release')
        self.assertEqual([t['status'] for t in tasks], ['done', 'pending', 'unverified'])
        self.assertTrue(all(t['validation'] == 'not_recorded' for t in tasks))
        self.assertEqual(legacy_tasks('# Livré\n- Une fonctionnalité', 'release'), [])

    def test_links_use_explicit_association_not_task_name_or_other_release(self):
        tasks = [{'id': 'T01', 'flow': 'old.json'}]
        flows = [{'path': 'old.json', 'missing': True},
                 {'path': 'new.json', 'release': 'r1', 'taskId': 'T01'},
                 {'path': 'unrelated-T01.json', 'release': 'r2', 'taskId': 'T01'}]
        link_flows(tasks, flows, 'r1')
        self.assertEqual(tasks[0]['flow'], 'new.json')
        self.assertEqual(tasks[0]['recordedFlow'], 'old.json')
        self.assertEqual(tasks[0]['flowPaths'], ['old.json', 'new.json'])

    def test_ambiguous_attempts_not_silently_selected(self):
        tasks = [{'id': 'T01', 'flow': None}]
        link_flows(tasks, [{'path': p, 'release': 'r', 'taskId': 'T01'} for p in ['a', 'b']], 'r')
        self.assertIsNone(tasks[0]['flow'])
        self.assertEqual(tasks[0]['flowPaths'], ['a', 'b'])

    def test_worktree_provenance_does_not_change_verdict(self):
        root = Path('/fixture/project')
        task = {'receipt': {'proof': {'path': 'proof.json'}}}
        with patch.object(catalog, 'git', return_value='worktree /fixture/worktree'):
            result = receipt_context(root, task, lambda _: {'project': '/fixture/worktree'}, catalog.inside, catalog.git)
        self.assertEqual(result['location'], 'worktree')
        self.assertNotIn('validated', result)
        result = receipt_context(root, task, lambda _: {'project': '/other/project'}, catalog.inside, lambda *_: '')
        self.assertEqual(result['location'], 'other')

    def test_attention_includes_noncurrent_release_and_legacy_counts(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name, body in [('older', '| 1 | Livrer | bloqué |'), ('newer', '<!-- release ouverte -->')]:
                folder = root / 'changelog' / name
                folder.mkdir(parents=True)
                (folder / 'README.md').write_text(body)
            result = catalog.summary(root)
            self.assertEqual(result['release']['id'], 'newer')
            self.assertEqual(result['attention'][0]['release'], 'older')
            self.assertEqual(result['attention'][0]['id'], 'P1')

    def test_receipt_and_current_validation_are_separate(self):
        from types import SimpleNamespace
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / 'changelog/r'
            folder.mkdir(parents=True)
            (folder / 'plan.json').write_text(json.dumps({'schema': 1, 'tasks': [{'id': 'T01', 'receipt': {'at': '2026-09-11'}}]}))
            module = SimpleNamespace(validate=lambda *_: None, statuses=lambda *_: {'T01': ('stale', 'preuve modifiée')})
            with patch.object(catalog, 'trusted_module', return_value=module):
                tasks, _ = catalog.plan_tasks(root, 'r')
            self.assertEqual(tasks[0]['progress'], 'received')
            self.assertEqual(tasks[0]['status'], 'stale')

    def test_no_plan_reads_readme_and_broken_plan_not_hidden_by_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / 'changelog/r'
            folder.mkdir(parents=True)
            (folder / 'README.md').write_text('| 1 | Sujet | fait |')
            self.assertEqual(catalog.plan_tasks(root, 'r')[0][0]['id'], 'P1')
            (folder / 'plan.json').write_text('{broken')
            with self.assertRaises(ValueError):
                catalog.plan_tasks(root, 'r')

    def test_documented_test_volume_is_not_a_verified_counter(self):
        from quality import reports
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / 'changelog/r'
            folder.mkdir(parents=True)
            (folder / 'README.md').write_text('| Tests Python | 222 tests déclarés, 184 méthodes, 0 échec |')
            result = reports(root, 'r', [])
            self.assertEqual(result['reports'], [])
            self.assertEqual(len(result['declarations']), 1)
            self.assertEqual(result['declarations'][0]['line'], 1)
            self.assertIn('222', result['declarations'][0]['text'])

    def test_closed_historical_proof_does_not_create_new_urgency(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / 'changelog/r'
            folder.mkdir(parents=True)
            readme = folder / 'README.md'
            readme.write_text('# Livrée')
            task = {'id': 'T01', 'status': 'stale', 'progress': 'received'}
            with patch.object(catalog, 'plan_tasks', return_value=([task], [])):
                self.assertEqual(catalog.summary(root)['attention'], [])
                readme.write_text('<!-- release ouverte -->\n# Reprise')
                self.assertEqual(catalog.summary(root)['attention'][0]['id'], 'T01')


if __name__ == '__main__':
    unittest.main()

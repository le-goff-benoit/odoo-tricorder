"""Realistic isolated candidates, using generated files only and no AI service."""
import errno
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import subprocess
from collections import namedtuple
from contextlib import contextmanager
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.library import node, edge
from connectors import candidates, candidate_sources, providers


def file_hash(path):
    result = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024*1024), b''):
            result.update(chunk)
    return result.hexdigest()


class CandidateWorkspaceTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='tricorder-candidate-workspace-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.engine = Engine(self.root/'state')
        self.project = self.engine.create_project('Synthetic repository')
        self.repo = Path(self.project['path'])
        (self.repo/'calc.py').write_text('value = 1\n')
        graph = {'schema': 1, 'id': 'code', 'title': 'Synthetic candidate', 'nodes': [
            node('edit', 'Change code', 'agent', model='fixture', execution_mode='edit', outputs={'candidate':'object'}),
            node('qa', 'Check candidate', 'task', inputs={'candidate':'object'}, outputs={'verdict':'string'}, candidate_check=True)],
            'edges': [{**edge('edit', 'qa'), 'mapping': {'candidate':'candidate'}}]}
        self.run = self.engine.start(self.project['id'], graph)

    def generated_file(self, relative, size, binary=True):
        path = self.repo/relative
        path.parent.mkdir(parents=True, exist_ok=True)
        chunk = (b'\x89SYNTHETIC\x00' if binary else b'Synthetic historical observation\n')
        chunk = (chunk * (1024*1024//len(chunk)+1))[:1024*1024]
        with path.open('wb') as stream:
            while size:
                amount = min(size, len(chunk))
                stream.write(chunk[:amount])
                size -= amount
        return path

    def propose(self, job='job'):
        prepared = candidates.prepare(self.engine, self.run, self.root/job)
        (prepared['workspace']/'calc.py').write_text('value = 2\n')
        reference, diff = candidates.capture(self.engine, self.run, prepared)
        return prepared, reference, diff

    def approve(self, reference, diff):
        claim = self.engine.claim(self.run['id'], 'edit')
        self.engine.submit(self.run['id'], 'edit', claim['token'], {'ok':True, 'summary':'Synthetic change',
            'outputs':{'candidate':reference}, 'evidence':[reference,diff]})
        self.engine.accept(self.run['id'], 'edit', human=True, checks=[])
        claim = self.engine.claim(self.run['id'], 'qa')
        tested = candidates.materialize(self.engine, reference, self.project['id'], self.root/'qa')
        self.assertEqual((tested/'calc.py').read_text(), 'value = 2\n')
        self.assertEqual((self.repo/'calc.py').read_text(), 'value = 1\n')
        self.engine.submit(self.run['id'], 'qa', claim['token'], {'ok':True, 'summary':'Synthetic file inspected',
            'outputs':{'verdict':'pass'}, 'evidence':[self.engine.artifact(b'calc.py contains value = 2; synthetic file test only')]})
        self.engine.accept(self.run['id'], 'qa', human=True, checks=[])

    def test_repository_over_132_mib_preserves_attachments_through_qa_and_apply(self):
        names = ['changelog/history/pieces/screenshot.png', 'changelog/history/pieces/report.pdf',
                 'release/current/pieces/meeting.mp4', 'release/current/source.eml', 'changelog/history/observations.json']
        for name in names:
            self.generated_file(name, 28*1024*1024, binary=not name.endswith(('.eml', '.json')))
        self.assertGreater(sum(p.stat().st_size for p in self.repo.rglob('*') if p.is_file()), 132*1024*1024)
        original_read = Path.read_bytes
        def no_large_read(path):
            self.assertLessEqual(path.stat().st_size, 2_000_000, 'Large pieces must never be loaded into memory in full')
            return original_read(path)
        with patch.object(Path, 'read_bytes', no_large_read):
            prepared, reference, diff = self.propose()
        self.assertTrue(set(names) <= set(prepared['files']))
        for name in names:
            self.assertEqual(file_hash(prepared['workspace']/name), prepared['files'][name]['sha256'])
            self.assertNotEqual((self.repo/name).stat().st_ino, (prepared['workspace']/name).stat().st_ino)
        candidate = candidates.load(self.engine, reference, self.project['id'])
        self.assertEqual([c['path'] for c in candidate['changes']], ['calc.py'])
        self.approve(reference, diff)
        with patch.object(candidate_sources.shutil, 'disk_usage', side_effect=AssertionError('Apply must not make another full source copy')):
            candidates.apply(self.engine, self.run['id'], 'edit', reference['sha256'], human=True)
        self.assertEqual((self.repo/'calc.py').read_text(), 'value = 2\n')
        for name in names:
            self.assertEqual(file_hash(self.repo/name), prepared['files'][name]['sha256'])

    def test_unchanged_binary_over_two_mb_does_not_block_a_small_code_change(self):
        self.generated_file('pieces/source.png', 3*1024*1024)
        _, reference, _ = self.propose()
        self.assertEqual([c['path'] for c in candidates.load(self.engine, reference, self.project['id'])['changes']], ['calc.py'])

    def test_attachment_change_is_a_source_conflict_before_qa_or_application(self):
        piece = self.generated_file('pieces/source.png', 3*1024*1024)
        _, reference, diff = self.propose()
        self.approve(reference, diff)
        with piece.open('r+b') as stream:
            stream.write(b'changed!')
        with self.assertRaisesRegex(ContractError, 'sources ont changé'):
            candidates.materialize(self.engine, reference, self.project['id'], self.root/'conflicting-qa')
        self.assertFalse((self.root/'conflicting-qa').exists())
        with self.assertRaisesRegex(ContractError, 'Conflit'):
            candidates.apply(self.engine, self.run['id'], 'edit', reference['sha256'], human=True)
        self.assertEqual((self.repo/'calc.py').read_text(), 'value = 1\n')

    def test_qa_disk_full_after_copy_cleans_partial_candidate_but_preserves_existing_target(self):
        (self.repo/'second.py').write_text('second = 1\n')
        prepared = candidates.prepare(self.engine, self.run, self.root/'qa-job')
        (prepared['workspace']/'calc.py').write_text('value = 2\n')
        (prepared['workspace']/'second.py').write_text('second = 2\n')
        reference, _ = candidates.capture(self.engine, self.run, prepared)
        target = self.root/'qa-incomplete'
        original_write = candidates._write
        def full(path, *args, **kwargs):
            if path.name == 'second.py':
                raise OSError(errno.ENOSPC, 'Synthetic full disk after first candidate change')
            return original_write(path, *args, **kwargs)
        with patch.object(candidates, '_write', side_effect=full):
            with self.assertRaisesRegex(ContractError, 'disque est plein.*QA.*supprimée.*libérez'):
                candidates.materialize(self.engine, reference, self.project['id'], target)
        self.assertFalse(target.exists())
        self.assertEqual((self.repo/'calc.py').read_text(), 'value = 1\n')
        target.mkdir()
        (target/'keep.txt').write_text('Existing user content')
        with self.assertRaises(FileExistsError):
            candidates.materialize(self.engine, reference, self.project['id'], target)
        self.assertEqual((target/'keep.txt').read_text(), 'Existing user content')

    def test_disk_preflight_reports_sizes_and_leaves_no_partial_copy(self):
        self.generated_file('pieces/source.png', 3*1024*1024)
        usage = namedtuple('Usage', 'total used free')(10_000_000, 9_000_000, 1_000_000)
        with patch.object(candidate_sources.shutil, 'disk_usage', return_value=usage):
            with self.assertRaisesRegex(ContractError, '2 copie.*nécessaires.*disponibles.*Libérez'):
                candidates.prepare(self.engine, self.run, self.root/'low-disk')
        self.assertFalse((self.root/'low-disk/base').exists())
        self.assertEqual((self.repo/'calc.py').read_text(), 'value = 1\n')

    def test_disk_fills_after_preflight_and_partial_copy_is_removed(self):
        (self.repo/'second.py').write_text('untouched = True\n')
        original = candidate_sources.streamed_file
        def full(root, name, **kwargs):
            if name == 'second.py':
                raise OSError(errno.ENOSPC, 'Synthetic full disk')
            return original(root, name, **kwargs)
        with patch.object(candidate_sources, 'streamed_file', full):
            with self.assertRaisesRegex(ContractError, 'disque est plein.*supprimée.*reprenez'):
                candidates.prepare(self.engine, self.run, self.root/'full-disk')
        self.assertFalse((self.root/'full-disk/base').exists())
        self.assertEqual((self.repo/'second.py').read_text(), 'untouched = True\n')

    def test_change_during_copy_is_detected_and_partial_copy_removed(self):
        original = candidate_sources.streamed_file
        def change_after_read(root, name, **kwargs):
            result = original(root, name, **kwargs)
            if name == 'calc.py':
                (self.repo/name).write_text('value = 9\n')
            return result
        with patch.object(candidate_sources, 'streamed_file', change_after_read):
            with self.assertRaisesRegex(ContractError, 'sources ont changé.*reprenez'):
                candidates.prepare(self.engine, self.run, self.root/'moving-source')
        self.assertFalse((self.root/'moving-source/base').exists())
        self.assertEqual((self.repo/'calc.py').read_text(), 'value = 9\n')

    def test_growing_source_is_stopped_without_reading_unbounded_data(self):
        original = candidate_sources.regular_file
        reads = []
        @contextmanager
        def growing(root, name):
            with original(root, name) as source:
                class GrowingReader:
                    def fileno(self):
                        return source.fileno()
                    def read(self, size):
                        reads.append(size)
                        result = source.read(size)
                        with (root/name).open('ab') as writer:
                            writer.write(b'growing')
                        return result
                yield GrowingReader()
        with patch.object(candidate_sources, 'regular_file', growing):
            with self.assertRaisesRegex(ContractError, 'grandi pendant la lecture'):
                candidate_sources.streamed_file(self.repo, 'calc.py')
        self.assertEqual(len(reads), 2)
        self.assertTrue(all(size <= 1024*1024 for size in reads))

    def test_symlink_directory_swap_cannot_read_an_external_file(self):
        folder = self.repo/'folder'; folder.mkdir()
        (folder/'source.txt').write_text('allowed')
        outside = self.root/'outside'; outside.mkdir()
        (outside/'source.txt').write_text('PRIVATE DATA MUST NEVER BE READ')
        original = os.open
        swapped = False
        def swap_after_root_open(path, flags, *args, **kwargs):
            nonlocal swapped
            descriptor = original(path, flags, *args, **kwargs)
            if path == self.repo and not swapped:
                swapped = True
                folder.rename(self.repo/'old-folder')
                folder.symlink_to(outside, target_is_directory=True)
            return descriptor
        with patch.object(candidate_sources.os, 'open', swap_after_root_open):
            with self.assertRaisesRegex(ContractError, 'Lien interdit'):
                with candidate_sources.regular_file(self.repo, 'folder/source.txt'):
                    self.fail('The replaced directory must never expose the outside file')

    def test_changed_binary_and_oversized_text_have_actionable_errors(self):
        self.generated_file('pieces/small.png', 1024)
        self.generated_file('history.txt', 3*1024*1024, binary=False)
        prepared = candidates.prepare(self.engine, self.run, self.root/'invalid-changes')
        (prepared['workspace']/'pieces/small.png').write_bytes(b'changed\x00binary')
        with self.assertRaisesRegex(ContractError, 'binaire modifié.*inchangée.*séparément'):
            candidates.capture(self.engine, self.run, prepared)
        (prepared['workspace']/'pieces/small.png').write_bytes((prepared['base']/'pieces/small.png').read_bytes())
        with (prepared['workspace']/'history.txt').open('ab') as stream:
            stream.write(b'New text')
        with self.assertRaisesRegex(ContractError, 'trop volumineuse.*2 Mo.*séparément'):
            candidates.capture(self.engine, self.run, prepared)

    def test_prompt_inventory_is_bounded_without_excluding_workspace_files(self):
        for index in range(700):
            path = self.repo/'module'/f'{index:04d}-{"descriptive-name-" * 6}.txt'
            path.parent.mkdir(exist_ok=True)
            path.write_text('Synthetic business observation.\n' * 10)
        prepared = candidates.prepare(self.engine, self.run, self.root/'large-inventory')
        context = prepared['context']
        self.assertEqual(context['file_count'], 701)
        self.assertGreater(context['omitted_files'], 0)
        self.assertEqual(len(context['files']) + context['omitted_files'], 701)
        self.assertLess(len(json.dumps(context, ensure_ascii=False).encode()), 75_000)
        self.assertIn('Glob', context['scope'])
        self.assertTrue(all((prepared['workspace']/name).is_file() for name in prepared['files']))

    def test_ignored_dependencies_and_secrets_stay_out_but_tracked_pieces_stay_in(self):
        (self.repo/'.gitignore').write_text('ignored/\n*.png\n')
        (self.repo/'.env').write_text('DO_NOT_COPY=synthetic')
        for name in ['ignored/cache.txt', 'node_modules/dependency.txt', 'data/credentials.json', 'private.KEY', 'pieces/source.png']:
            self.generated_file(name, 100)
        subprocess.run(['git','-C',str(self.repo),'add','-f','pieces/source.png'], check=True, capture_output=True)
        prepared = candidates.prepare(self.engine, self.run, self.root/'filtered')
        self.assertEqual(set(prepared['files']), {'.gitignore','calc.py','pieces/source.png'})
        (prepared['workspace']/'.env').write_text('NEW_SECRET=synthetic')
        with self.assertRaisesRegex(ContractError, 'sensible'):
            candidates.capture(self.engine, self.run, prepared)

    def test_existing_workspace_and_hardlinks_are_never_reused(self):
        job = self.root/'existing'; (job/'workspace').mkdir(parents=True)
        (job/'workspace/precious.txt').write_text('preserve')
        with self.assertRaisesRegex(ContractError, 'nouvelle tentative'):
            candidates.prepare(self.engine, self.run, job)
        self.assertEqual((job/'workspace/precious.txt').read_text(), 'preserve')
        prepared = candidates.prepare(self.engine, self.run, self.root/'hardlink')
        (prepared['workspace']/'calc.py').unlink()
        os.link(self.repo/'calc.py', prepared['workspace']/'calc.py')
        with self.assertRaisesRegex(ContractError, 'lien physique'):
            candidates.capture(self.engine, self.run, prepared)

    def test_edit_after_global_fingerprint_is_not_overwritten(self):
        _, reference, diff = self.propose()
        self.approve(reference, diff)
        original = candidates.snapshot
        def change_after_fingerprint(project, *args, **kwargs):
            result = original(project, *args, **kwargs)
            (self.repo/'calc.py').write_text('value = 9\n')
            return result
        with patch.object(candidates, 'snapshot', change_after_fingerprint):
            with self.assertRaisesRegex(ContractError, 'modifié pendant la lecture'):
                candidates.apply(self.engine, self.run['id'], 'edit', reference['sha256'], human=True)
        self.assertEqual((self.repo/'calc.py').read_text(), 'value = 9\n')
        self.assertNotIn('applied_candidate', self.engine.run(self.run['id'])['nodes']['edit'])

    def test_atomic_writer_refuses_swapped_directory_and_preserves_outside(self):
        folder = self.repo/'folder'; folder.mkdir()
        (folder/'source.txt').write_text('allowed')
        outside = self.root/'outside'; outside.mkdir()
        target = outside/'source.txt'; target.write_text('outside unchanged')
        original = os.open
        swapped = False
        def swap_after_root_open(path, flags, *args, **kwargs):
            nonlocal swapped
            descriptor = original(path, flags, *args, **kwargs)
            if path == self.repo and not swapped:
                swapped = True
                folder.rename(self.repo/'old-folder')
                folder.symlink_to(outside, target_is_directory=True)
            return descriptor
        with patch.object(candidate_sources.os, 'open', swap_after_root_open):
            with self.assertRaisesRegex(ContractError, 'Lien interdit'):
                candidates._write(folder/'source.txt', b'must not write', root=self.repo)
        self.assertEqual(target.read_text(), 'outside unchanged')

    def test_rollback_restores_added_deleted_and_changed_files(self):
        (self.repo/'obsolete.txt').write_text('restore on failure')
        prepared = candidates.prepare(self.engine, self.run, self.root/'rollback')
        (prepared['workspace']/'calc.py').write_text('value = 2\n')
        (prepared['workspace']/'obsolete.txt').unlink()
        (prepared['workspace']/'new').mkdir()
        (prepared['workspace']/'new/file.txt').write_text('new candidate file')
        reference, diff = candidates.capture(self.engine, self.run, prepared)
        self.approve(reference, diff)
        with patch.object(self.engine, '_save', side_effect=OSError('synthetic database failure')):
            with self.assertRaisesRegex(OSError, 'database failure'):
                candidates.apply(self.engine, self.run['id'], 'edit', reference['sha256'], human=True)
        self.assertEqual((self.repo/'calc.py').read_text(), 'value = 1\n')
        self.assertEqual((self.repo/'obsolete.txt').read_text(), 'restore on failure')
        self.assertFalse((self.repo/'new/file.txt').exists())
        self.assertFalse((self.engine.store.directory/'candidate-application.json').exists())

    def test_proposal_size_limit_is_actionable_and_never_truncates_changes(self):
        for index in range(3):
            self.generated_file(f'source{index}.txt', 800_000, binary=False)
        prepared = candidates.prepare(self.engine, self.run, self.root/'proposal-budget')
        for index in range(3):
            with (prepared['workspace']/f'source{index}.txt').open('ab') as stream:
                stream.write(b'new line\n')
        with self.assertRaisesRegex(ContractError, 'Proposition.*2 Mo.*Divisez.*tronquée'):
            candidates.capture(self.engine, self.run, prepared)
        self.assertEqual((self.repo/'source0.txt').stat().st_size, 800_000)

    def test_cancel_during_copy_never_launches_the_model(self):
        claim = self.engine.claim(self.run['id'], 'edit')
        run = self.engine.run(self.run['id'])
        definition = next(n for n in run['definition']['nodes'] if n['id'] == 'edit')
        original = candidates.prepare
        original_popen, model_launches = subprocess.Popen, []
        def local_only(argv, *args, **kwargs):
            if 'inert-model-command' in argv:
                model_launches.append(argv)
                raise AssertionError('A model must not start after cancellation during the source copy')
            return original_popen(argv, *args, **kwargs)
        def cancel_after_copy(*args, **kwargs):
            result = original(*args, **kwargs)
            self.engine.control(run['id'], 'cancel')
            return result
        with patch.object(candidates, 'prepare', cancel_after_copy), \
                patch.object(providers, 'command', return_value=['inert-model-command']), \
                patch.object(providers.subprocess, 'Popen', local_only):
            # The check must happen before preparing or spawning any provider.
            # Set a tripwire to detect a launch instead of starting a service.
            with self.assertRaisesRegex(ContractError, 'annulée.*préparation'):
                providers.execute_text(self.engine, run, definition, claim['token'], self.root/'cancelled-job')
        self.assertEqual(model_launches, [])
        self.assertEqual((self.repo/'calc.py').read_text(), 'value = 1\n')


if __name__ == '__main__':
    unittest.main()

import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.sources import import_selected, MAX_FILE_BYTES
from studio import request
from native_cli_fixture import use_native_cli_fixtures


class WorkflowSourceTests(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory(prefix='tricorder-sources-')
        self.addCleanup(folder.cleanup)
        self.root = Path(folder.name)
        self.engine = Engine(self.root / 'state')

    def test_multiple_files_are_durable_and_report_the_exact_hash_without_reading_unselected_files(self):
        selected = []
        for index, body in enumerate((b'First meeting notes', b'Second meeting notes')):
            folder = self.root / str(index)
            folder.mkdir()
            source = folder / 'notes.txt'
            source.write_bytes(body)
            selected.append(str(source))
        unselected = self.root / 'credentials'; unselected.write_bytes(b'NOT SELECTED')
        response = request(self.engine, {'action': 'source.import', 'paths': selected})
        self.assertEqual(len(response['files']), 2)
        for index, metadata in enumerate(response['files']):
            copied = Path(metadata['path'])
            body = Path(selected[index]).read_bytes()
            self.assertEqual(copied.read_bytes(), body)
            self.assertEqual(metadata['sha256'], hashlib.sha256(body).hexdigest())
            self.assertEqual(copied.stat().st_mode & 0o777, 0o600)
            Path(selected[index]).unlink()
            self.assertEqual(copied.read_bytes(), body)
        manifest = json.loads((Path(response['files'][0]['path']).parent / 'manifest.json').read_text())
        self.assertEqual(manifest['files'], response['files'])
        self.assertNotIn('NOT SELECTED', str(response))

    def test_invalid_batch_leaves_no_half_attachment(self):
        normal = self.root / 'notes.txt'; normal.write_bytes(b'valid')
        large = self.root / 'large.txt'
        with large.open('wb') as writer: writer.truncate(MAX_FILE_BYTES + 1)
        with self.assertRaisesRegex(ContractError, 'limite'):
            import_selected(self.engine.store.directory, [str(normal), str(large)])
        self.assertEqual(list((self.engine.store.directory / 'sources').iterdir()), [])

    def test_symlinks_and_special_files_are_not_followed(self):
        target = self.root / 'notes.txt'; target.write_text('notes')
        link = self.root / 'link.txt'; link.symlink_to(target)
        with self.assertRaises(OSError): import_selected(self.engine.store.directory, [str(link)])
        fifo = self.root / 'fifo'; os.mkfifo(fifo)
        with self.assertRaisesRegex(ContractError, 'ordinaires'):
            import_selected(self.engine.store.directory, [str(fifo)])

    def test_each_native_conversation_occurrence_retains_its_own_sources(self):
        from workflow_engine.conversations import Conversations
        use_native_cli_fixtures(self, str(self.root))
        project = self.engine.create_project('Requests with source context')
        graph = {'schema': 1, 'id': 'source-conversation', 'title': 'Read', 'nodes': [{'id': 'read', 'kind': 'agent', 'title': 'Read', 'outputs': {'report': 'string'}}], 'edges': []}
        conversations = Conversations(self.engine)
        first_context = {'text': 'Meeting 1', 'files': [], 'email_references': []}
        conversation = conversations.open(project['id'], graph, 'codex', initial_request='Read first meeting', parameters={'source_context': first_context})
        first_run = conversation['items'][0]['run']
        second_context = {'text': 'Meeting 2', 'files': [], 'email_references': [{'reference': 'Mail 2', 'status': 'to_retrieve'}]}
        second = conversations.add(conversation['id'], 'Read second meeting', parameters={'source_context': second_context})
        self.assertEqual(self.engine.run(first_run)['parameters']['source_context'], first_context)
        self.assertEqual(self.engine.run(second['run'])['parameters']['source_context'], second_context)
        self.assertEqual(self.engine.workflows(project['id']), [])

    def test_renderer_cannot_invoke_private_path_import(self):
        main = (Path(__file__).resolve().parents[1] / 'electron/studio-main.cjs').read_text()
        allowlist = main.split('const allowed = new Set(', 1)[1].split(');', 1)[0]
        self.assertNotIn('source.import', allowlist)
        self.assertIn("properties: ['openFile', 'multiSelections']", main)
        preload = (Path(__file__).resolve().parents[1] / 'electron/studio-preload.cjs').read_text()
        self.assertIn("pickSources: () => ipcRenderer.invoke('studio:sources')", preload)

    def test_source_context_is_preserved_in_the_real_engine_without_saving_a_template(self):
        project = self.engine.create_project('Meeting source test')
        source = self.root / 'notes.txt'; source.write_text('Delivery Friday')
        files = import_selected(self.engine.store.directory, [str(source)])['files']
        context = {'files': files, 'email_references': [{'reference': 'Subject 10 October', 'status': 'to_retrieve'}]}
        graph = {'schema': 1, 'id': 'source-task', 'title': 'Read sources', 'nodes': [{'id': 'read', 'kind': 'agent', 'title': 'Read', 'outputs': {'report': 'string'}}], 'edges': []}
        run = self.engine.start(project['id'], graph, parameters={'request': 'Read notes', 'source_context': context})
        self.assertEqual(self.engine.run(run['id'])['parameters']['source_context'], context)
        self.assertEqual(self.engine.workflows(project['id']), [])

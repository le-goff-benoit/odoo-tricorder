"""Real CLI discovery with deterministic presence/absence, never model calls."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from native_cli_fixture import cli_directory

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.conversations import Conversations
from workflow_engine.runtime import capabilities


class NativeCLIPreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='tricorder-cli-preflight-')
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.engine=Engine(self.root/'state')
        self.project=self.engine.create_project('Synthetic native availability')
        self.service=Conversations(self.engine)
        self.graph={'schema':1,'id':'availability','title':'Availability',
                    'nodes':[{'id':'work','title':'Inspect','kind':'agent','validation':'contract'}],'edges':[]}

    def test_missing_provider_blocks_conversation_even_if_other_provider_exists(self):
        for available,missing in [('codex','claude'),('claude','codex')]:
            with self.subTest(missing=missing):
                case=self.root/available;case.mkdir()
                folder=cli_directory(case,providers=(available,))
                # Exclude the user's PATH, including any real installation.
                with patch.dict(os.environ,{'PATH':str(folder)}):
                    self.assertIsNone(shutil.which(missing))
                    before=len(self.service.list())
                    with self.assertRaisesRegex(ContractError,'CLI de conversation non installé'):
                        self.service.open(self.project['id'],self.graph,missing)
                    self.assertEqual(len(self.service.list()),before)
                    self.assertEqual(self.service.open(self.project['id'],self.graph,available)['provider'],available)

    def test_detected_fixture_is_not_authenticated_and_cannot_call_a_model(self):
        folder=cli_directory(self.root)
        with patch.dict(os.environ,{'PATH':str(folder)}):
            found={item['id']:item for item in capabilities()}
            for provider in ('codex','claude'):
                with self.subTest(provider=provider):
                    self.assertEqual(shutil.which(provider),str(folder/provider))
                    self.assertTrue(found[provider]['installed'])
                    self.assertIsNone(found[provider]['connected'])
                    self.assertFalse(found[provider]['qualified'])
                    conversation=self.service.open(self.project['id'],self.graph,provider)
                    self.assertEqual(conversation['provider'],provider)
                    result=subprocess.run([str(folder/provider)],capture_output=True,text=True)
                    self.assertEqual(result.returncode,78)
                    self.assertIn('model execution is forbidden',result.stderr)

"""Real CLI discovery with deterministic presence/absence, never model calls."""
import copy
import json
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
from workflow_engine.runtime import capabilities, preflight
from workflow_engine.schedules import Schedules
from studio import request as studio_request
from workflow_cli import request as bridge_request


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

    def test_conversation_requires_cli_even_without_ai_blocks_but_automatic_does_not(self):
        empty = self.root/'no-cli'; empty.mkdir()
        with patch.dict(os.environ, {'PATH': str(empty)}):
            for provider in ('codex', 'claude'):
                for kind, extra in [('question', {'question': 'Quel objectif ?'}), ('decision', {})]:
                    with self.subTest(provider=provider, kind=kind):
                        graph = {**self.graph, 'nodes': [{'id': 'wait', 'title': 'Attendre', 'kind': kind, **extra}]}
                        payload = {'action': 'workflow.validate', 'project': self.project['id'], 'graph': graph, 'mode': 'native', 'provider': provider}
                        checked = studio_request(self.engine, payload)
                        issue = next(i for i in checked['issues'] if i.get('code') == 'provider.cli-missing')
                        self.assertEqual(issue['node'], 'workflow')
                        self.assertEqual(issue['action'], 'choose-ai')
                        with self.assertRaisesRegex(ContractError, 'CLI'):
                            self.service.open(self.project['id'], graph, provider)
                        self.assertEqual(studio_request(self.engine, {**payload, 'mode': 'automatic'})['issues'], [])
                        run = studio_request(self.engine, {**payload, 'action': 'run.start', 'mode': 'automatic'})
                        self.assertIn(run['nodes']['wait']['status'], ('waiting', 'waiting_input'))
            self.assertEqual(self.service.list(), [])

    def test_effort_mismatch_blocks_preview_and_claim_without_changing_preferences(self):
        folder = cli_directory(self.root)
        with patch.dict(os.environ, {'PATH': str(folder)}):
            for provider in ('codex', 'claude'):
                with self.subTest(provider=provider):
                    graph = copy.deepcopy(self.graph)
                    graph['defaults'] = {'provider': provider, 'model': 'synthetic', 'effort': 'medium'}
                    graph['nodes'][0]['effort'] = 'high'
                    before = copy.deepcopy(graph)
                    checked = studio_request(self.engine, {'action': 'workflow.validate', 'project': self.project['id'], 'graph': graph, 'mode': 'native', 'provider': provider, 'model': 'synthetic'})
                    self.assertTrue(any(i.get('code') == 'provider.effort-mismatch' and i['action'] == 'edit-node' for i in checked['issues']))
                    with self.assertRaisesRegex(ContractError, 'effort'):
                        self.service.open(self.project['id'], graph, provider, model='synthetic')
                    self.assertEqual(graph, before)
                    graph['defaults']['effort'] = 'high'
                    conversation = self.service.open(self.project['id'], graph, provider, model='synthetic')
                    item = self.service.add(conversation['id'], 'Synthetic analysis')
                    # A read-only historical conversation fixture demonstrates the
                    # guard independently of the new launch preflight; no state edit.
                    with patch.object(Conversations, 'get', return_value={**self.service.get(conversation['id']), 'effort': 'medium'}):
                        with self.assertRaisesRegex(ContractError, 'effort'):
                            bridge_request(self.engine, conversation['id'], 'claim', {'run': item['run'], 'node': 'work'})
                    self.assertEqual(self.engine.run(item['run'])['nodes']['work']['status'], 'ready')
                    claim = bridge_request(self.engine, conversation['id'], 'claim', {'run': item['run'], 'node': 'work'})
                    self.assertEqual(claim['node']['execution']['effort'], 'high')

    def test_remedies_distinguish_model_project_and_plugin(self):
        folder = cli_directory(self.root)
        with patch.dict(os.environ, {'PATH': str(folder)}):
            graph = copy.deepcopy(self.graph)
            graph['nodes'][0]['execution_mode'] = 'edit'
            workspace = self.engine.workspace_context()
            issues = preflight(graph, project=workspace, engine=self.engine)
            self.assertTrue(any(i.get('code') == 'provider.model-required' and i['action'] == 'choose-ai' for i in issues))
            self.assertTrue(any(i.get('code') == 'workflow.git-project-required' and i['action'] == 'choose-project' for i in issues))
            graph['nodes'][0]['capabilities'] = [{'plugin': 'mail', 'operation': 'read'}]
            issues = preflight(graph, project=workspace, engine=self.engine)
            self.assertTrue(any(i.get('code') == 'plugin.connection-required' and i['action'] == 'connections' for i in issues))
            issue = next(i for i in issues if i.get('code') == 'plugin.connection-required')
            self.assertEqual((issue['plugin'], issue['operation']), ('mail', 'read'))
            manifest = {'schema': 1, 'plugins': [{'id': 'mail', 'title': 'Messagerie synthétique', 'provider': 'local', 'operations': ['read']}]}
            (Path(workspace['path'])/'.tricorder/plugins.json').write_text(json.dumps(manifest))
            issues = preflight(graph, project=workspace, engine=self.engine)
            issue = next(i for i in issues if i.get('code') == 'plugin.connection-required')
            self.assertIn('Messagerie synthétique (mail), opération read', issue['message'])

    def test_provider_and_model_remedies_target_explicit_overrides(self):
        folder = cli_directory(self.root, providers=('claude',))
        with patch.dict(os.environ, {'PATH': str(folder)}):
            graph = copy.deepcopy(self.graph)
            graph['defaults'] = {'provider': 'claude', 'model': 'synthetic'}
            graph['nodes'][0]['provider'] = 'codex'
            issues = preflight(graph, project=self.project, engine=self.engine, mode='native', provider='claude', model='synthetic')
            issue = next(i for i in issues if i.get('code') == 'provider.cli-missing')
            self.assertEqual((issue['node'], issue['action']), ('work', 'edit-node'))
            graph['nodes'][0].update(provider='claude', model='')
            issues = preflight(graph, project=self.project, engine=self.engine)
            self.assertTrue(any(i.get('code') == 'provider.model-required' and i['action'] == 'edit-node' for i in issues))
            graph['nodes'][0].pop('provider'); graph['nodes'][0].pop('model')
            graph['defaults'] = {'provider': 'codex'}
            issues = preflight(graph, project=self.project, engine=self.engine)
            self.assertTrue(all(i['action'] == 'choose-ai' for i in issues if i.get('code') in ('provider.model-required', 'provider.cli-missing')))

    def test_imported_profile_missing_is_actionable_in_both_preview_modes(self):
        folder = cli_directory(self.root)
        with patch.dict(os.environ, {'PATH': str(folder)}):
            graph = copy.deepcopy(self.graph)
            graph['defaults'] = {'provider': 'codex', 'model': 'synthetic'}
            graph['nodes'][0]['profile'] = 'not-installed'
            payload = {'action': 'workflow.validate', 'project': self.project['id'], 'graph': graph, 'provider': 'codex'}
            for mode in ('automatic', 'native'):
                with self.subTest(mode=mode):
                    checked = studio_request(self.engine, {**payload, 'mode': mode})
                    self.assertTrue(any(i.get('code') == 'profile.unavailable' and i['action'] == 'edit-node' for i in checked['issues']))
                    with self.assertRaisesRegex(ContractError, 'Profil'):
                        studio_request(self.engine, {**payload, 'mode': mode, 'action': 'run.start'})
            with self.assertRaisesRegex(ContractError, 'Profil'):
                Schedules(self.engine).create(self.project['id'], graph, {'kind': 'interval', 'minutes': 5})
            self.assertEqual(self.engine.runs(self.project['id']), [])
            self.assertEqual(graph['nodes'][0]['profile'], 'not-installed')
            # A deliberate profile selection fixes this problem; it is never
            # substituted silently by either validation or launch.
            graph['nodes'][0]['profile'] = 'generalist'
            for mode in ('automatic', 'native'):
                self.assertEqual(studio_request(self.engine, {**payload, 'mode': mode})['issues'], [])

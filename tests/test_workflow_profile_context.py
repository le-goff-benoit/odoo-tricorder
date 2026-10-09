"""A domain pack's profiles select the same project context as its policies."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

from native_cli_fixture import use_native_cli_fixtures
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.conversations import Conversations
from workflow_engine.packs import inspect_pack, install
from studio import request
from workflow_cli import request as native_request


class ProfileContextTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='tricorder-profile-context-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        use_native_cli_fixtures(self, self.root)
        self.engine = Engine(self.root/'state')
        self.alpha = self.engine.create_project('Alpha 19')
        self.beta = self.engine.create_project('Beta 17')
        self.engine.project_series(self.alpha['id'], '19.0', platform='custom')
        self.engine.project_series(self.beta['id'], '17.0', platform='custom')
        pack = self.root/'pack'; pack.mkdir()
        (pack/'role.md').write_text('Synthetic instructions only; no Odoo or model operation.')
        (pack/'tricorder-pack.json').write_text(json.dumps({
            'schema': 1, 'engine_schema': 1, 'id': 'domain-pack', 'version': '1',
            'profiles': [{'id': name, 'source': 'role.md'} for name in ('odoo-developer', 'business-specialist')],
            'policies': {'domain': 'odoo', 'series_required': True, 'online_requires_studio': True}}))
        digest = inspect_pack(pack)['sha256']
        for project in (self.alpha, self.beta):
            install(self.engine, project['id'], str(pack), digest)
        self.graph = {'schema': 1, 'id': 'generic-editor', 'title': 'Workflow créé dans l’éditeur',
                      'defaults': {'provider': 'codex', 'model': 'synthetic'},
                      'parameters': {'series': '19.0', 'platform': 'custom', 'route': 'module'},
                      'nodes': [{'id': 'work', 'kind': 'agent', 'title': 'Analyser', 'validation': 'contract'}], 'edges': []}
        self.service = Conversations(self.engine)

    def payload(self, graph):
        return {'action': 'workflow.validate', 'project': self.alpha['id'], 'projects': [self.beta['id']],
                'graph': graph, 'mode': 'native', 'provider': 'codex', 'model': 'synthetic'}

    def test_domain_profile_inherits_target_series_and_online_policy_without_domain_field(self):
        for profile, inherited in [('odoo-developer', False), ('business-specialist', False), ('business-specialist', True)]:
            with self.subTest(profile=profile, inherited=inherited):
                self.engine.project_series(self.beta['id'], '17.0', platform='custom')
                graph = copy.deepcopy(self.graph)
                (graph['defaults'] if inherited else graph['nodes'][0])['profile'] = profile
                before = copy.deepcopy(graph)
                payload = self.payload(graph)
                self.assertEqual(request(self.engine, payload)['issues'], [])
                conversation = request(self.engine, {**payload, 'action': 'conversation.open'})
                item = self.service.add(conversation['id'], 'Synthetic Beta request', project=self.beta['id'])
                run = self.engine.run(item['run'])
                self.assertEqual(run['parameters']['series'], '17.0')
                self.assertEqual(run['parameters']['platform'], 'custom')
                claim = native_request(self.engine, conversation['id'], 'claim', {'run': run['id'], 'node': 'work'})
                native_request(self.engine, conversation['id'], 'result', {'run': run['id'], 'node': 'work', 'token': claim['token'],
                    'result': {'ok': True, 'summary': 'Synthetic protocol only; no Odoo operation performed'}})
                frozen = self.engine.run(run['id'])
                self.engine.project_series(self.beta['id'], '17.0', platform='online')
                issues = request(self.engine, payload)['issues']
                self.assertTrue(any(i.get('code') == 'odoo.online-studio-required' and i['project'] == self.beta['id'] for i in issues))
                with self.assertRaisesRegex(ContractError, 'Online'):
                    request(self.engine, {**payload, 'action': 'conversation.open'})
                # An already-open conversation also rechecks the target when a
                # new request is added; the old run stays frozen.
                with self.assertRaisesRegex(ContractError, 'Online'):
                    self.service.add(conversation['id'], 'Online request', project=self.beta['id'])
                self.assertEqual(self.engine.run(run['id']), frozen)
                graph['parameters']['route'] = 'studio'
                if profile == 'odoo-developer':
                    issues = request(self.engine, payload)['issues']
                    self.assertTrue(any(i.get('code') == 'odoo.online-module-forbidden' and i['project'] == self.beta['id'] for i in issues))
                else:
                    self.assertEqual(request(self.engine, payload)['issues'], [])
                    allowed = request(self.engine, {**payload, 'action': 'conversation.open'})
                    item = self.service.add(allowed['id'], 'Studio context, arbitrary profile', project=self.beta['id'])
                    target = self.engine.run(item['run'])
                    self.assertEqual((target['parameters']['series'], target['parameters']['platform']), ('17.0', 'online'))
                graph['parameters']['route'] = 'module'
                self.assertEqual(graph, before)
        self.assertFalse((self.engine.store.directory/'jobs').exists())

    def test_generic_workflow_does_not_inherit_or_activate_an_installed_odoo_pack(self):
        self.engine.project_series(self.beta['id'], '17.0', platform='online')
        for explicit_profile in (False, True):
            with self.subTest(explicit_profile=explicit_profile):
                graph = copy.deepcopy(self.graph)
                graph['parameters'] = {'series': 'document-edition', 'platform': 'online', 'route': 'module'}
                if explicit_profile:
                    graph['defaults']['profile'] = 'business-specialist'
                    graph['nodes'][0]['profile'] = 'generalist'
                payload = self.payload(graph)
                checked = request(self.engine, payload)
                self.assertEqual((checked['issues'], checked['requirements']), ([], []))
                conversation = request(self.engine, {**payload, 'action': 'conversation.open'})
                item = self.service.add(conversation['id'], 'Unrelated documentation', project=self.beta['id'])
                run = self.engine.run(item['run'])
                for key, value in graph['parameters'].items():
                    self.assertEqual(run['parameters'][key], value)
                claim = native_request(self.engine, conversation['id'], 'claim', {'run': run['id'], 'node': 'work'})
                self.assertIn('token', claim)


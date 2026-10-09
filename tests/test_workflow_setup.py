"""Generated Odoo workflows, using only synthetic repositories and a local fake pack."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from native_cli_fixture import use_native_cli_fixtures

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError, validate
from workflow_engine.setup import configure
from workflow_engine.conversations import Conversations
from workflow_engine.schedules import Schedules
from studio import request
from connectors.candidates import prepare, capture, apply


class SetupCandidateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='tricorder-setup-qa-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.engine = Engine(self.root/'state')
        self.pack = self.root/'synthetic-pack'; self.pack.mkdir()
        (self.pack/'roles.md').write_text('Synthetic role for orchestration tests only.')
        roles = ['odoo-analyst','odoo-developer','odoo-tester','odoo-deployer','odoo-support','odoo-studio']
        manifest = {'schema':1,'engine_schema':1,'id':'synthetic-odoo','version':'1',
                    'profiles':[{'id':role,'source':'roles.md'} for role in roles],
                    'policies':{'domain':'odoo','series_required':True,'online_requires_studio':True,'qa_requires_local_copy':True}}
        (self.pack/'tricorder-pack.json').write_text(json.dumps(manifest))

    def configured(self, name, module=False, online=False):
        project=self.engine.create_project(name)
        root=Path(project['path'])
        if module:
            folder=root/'custom_module';folder.mkdir()
            (folder/'__manifest__.py').write_text("{'name':'Synthetic','version':'19.0.1.0.0'}")
        if online:
            (root/'.odoo-agents').mkdir()
            (root/'.odoo-agents/instances.json').write_text(json.dumps({'test':{'platform':'online','kind':'test'}}))
        entry={'path':project['path'],'name':name,'series':'19.0'}
        self.assertEqual(configure(self.engine,[entry],str(self.pack))[0]['status'],'configured')
        graphs=self.engine.workflows(project['id'])
        for graph in graphs:validate(graph)
        return project,entry,next(g for g in graphs if g['id']=='odoo-release-conversation')

    def complete(self, run, node, outputs, evidence=()):
        claim=self.engine.claim(run['id'],node)
        return self.engine.submit(run['id'],node,claim['token'],{'ok':True,'summary':'Synthetic orchestration only','outputs':outputs,'evidence':list(evidence)})

    def approve(self, run, node):
        gate=run['nodes'][node]
        return self.engine.decide(run['id'],node,gate['nonce'],gate['proposal'],'approve',human=True)

    def test_native_dialog_launch_defers_only_missing_qa_copy_until_claim(self):
        use_native_cli_fixtures(self, self.root)
        project, _, graph = self.configured('Native release', module=True)
        original = copy.deepcopy(graph)
        payload = {'action': 'workflow.validate', 'project': project['id'], 'graph': graph,
                   'mode': 'native', 'provider': 'codex', 'model': 'synthetic-model'}
        checked = request(self.engine, payload)
        self.assertEqual(checked['issues'], [], 'The launch dialog must allow preparation before a QA copy exists')
        self.assertEqual(len(checked['requirements']), 1)
        requirement = checked['requirements'][0]
        self.assertEqual(requirement['code'], 'odoo.qa.local-copy-required')
        self.assertEqual(requirement['node'], 'check')
        self.assertEqual(requirement['stage'], 'step')
        self.assertEqual(requirement['action'], 'prepare-in-conversation')
        self.assertTrue(requirement['remedy'])
        self.assertNotIn('neutralized_copy', requirement['message'])
        conversation = request(self.engine, {**payload, 'action': 'conversation.open', 'request': 'Préparer une release synthétique'})
        self.assertEqual(conversation['model'], 'synthetic-model')
        run = self.engine.run(conversation['items'][0]['run'])
        self.assertEqual(run['nodes']['intent']['status'], 'ready')
        run = self.complete(run, 'intent', {'intent': 'Check synthetic source'})
        run = self.complete(run, 'plan', {'plan': 'Prepare, check and review'})
        run = self.approve(run, 'scope')
        claim = self.engine.claim(run['id'], 'work')
        job = prepare(self.engine, run, self.root/'native-candidate')
        (job['workspace']/'sample.txt').write_text('Synthetic candidate, not an Odoo database')
        reference, diff = capture(self.engine, run, job)
        run = self.engine.submit(run['id'], 'work', claim['token'], {'ok': True, 'summary': 'Synthetic candidate',
            'outputs': {'result': 'Changed sample', 'candidate': reference}, 'evidence': [reference, diff], 'patch': diff})
        self.assertEqual(run['nodes']['check']['status'], 'ready')
        with self.assertRaisesRegex(ContractError, 'copie locale'):
            self.engine.claim(run['id'], 'check')
        for context in ({}, {'environment': 'local', 'neutralized_copy': '  '},
                        {'environment': 'local', 'neutralized_copy': True},
                        {'environment': 'production', 'neutralized_copy': 'Must never run here'}):
            with self.subTest(context=context), self.assertRaises(ContractError):
                self.engine.execution_context(run['id'], 'check', context)
            with self.assertRaises(ContractError):
                self.engine.claim(run['id'], 'check')
        self.engine.execution_context(run['id'], 'check', {'environment': 'local', 'neutralized_copy': str(job['workspace'])})
        claim = self.engine.claim(run['id'], 'check')
        self.assertEqual(claim['node']['profile'], 'odoo-tester')
        self.assertEqual(self.engine.run(run['id'])['nodes']['check']['status'], 'running')
        self.assertEqual(graph, original, 'Preflight and launch must not rewrite the saved definition')
        self.assertEqual(next(g for g in self.engine.workflows(project['id']) if g['id'] == graph['id']), original)

    def test_explicit_unsafe_or_invalid_qa_context_blocks_every_native_entry(self):
        use_native_cli_fixtures(self, self.root)
        project, _, original = self.configured('QA guards', module=True)
        cases = [({'environment': 'production'}, {}, 'odoo.qa.production-forbidden'),
                 ({}, {'environment': 'production'}, 'odoo.qa.production-forbidden'),
                 ({'environment': 'production'}, {'environment': 'local'}, 'odoo.qa.production-forbidden'),
                 ({'environment': 'staging'}, {}, 'odoo.qa.environment-invalid'),
                 ({'environment': 'staging'}, {'environment': 'local'}, 'odoo.qa.environment-invalid'),
                 ({'environment': 'local', 'neutralized_copy': '  '}, {}, 'odoo.qa.copy-invalid'),
                 ({'environment': 'local', 'neutralized_copy': True}, {}, 'odoo.qa.copy-invalid')]
        for params, fields, code in cases:
            with self.subTest(code=code, params=params, fields=fields):
                graph = copy.deepcopy(original)
                graph['parameters'].update(params)
                next(n for n in graph['nodes'] if n['id'] == 'check').update(fields)
                checked = request(self.engine, {'action': 'workflow.validate', 'project': project['id'], 'graph': graph,
                                  'mode': 'native', 'provider': 'codex', 'model': 'synthetic-model'})
                self.assertIn(code, [i['code'] for i in checked['issues']])
                self.assertEqual(checked['requirements'], [])
                with self.assertRaises(ContractError):
                    Conversations(self.engine).open(project['id'], graph, 'codex', model='synthetic-model')
                with self.assertRaises(ContractError):
                    self.engine.start(project['id'], graph, driver='conversation')
        self.assertEqual(self.engine.runs(project['id']), [])
        self.assertEqual(Conversations(self.engine).list(), [])

    def test_automatic_and_scheduled_qa_still_require_the_copy_before_launch(self):
        use_native_cli_fixtures(self, self.root)
        project, _, graph = self.configured('Automatic QA', module=True)
        graph['defaults'] = {'provider': 'codex', 'model': 'synthetic-model'}
        payload = {'action': 'workflow.validate', 'project': project['id'], 'graph': graph, 'mode': 'automatic'}
        checked = request(self.engine, payload)
        self.assertEqual(checked['requirements'], [])
        issue = next(i for i in checked['issues'] if i.get('code') == 'odoo.qa.local-copy-required')
        self.assertEqual(issue['action'], 'prepare-in-conversation')
        for mode in ('native', 'automatic'):
            with self.subTest(mode=mode), self.assertRaisesRegex(ContractError, 'copie locale'):
                request(self.engine, {**payload, 'action': 'run.start', 'mode': mode, 'provider': 'codex', 'model': 'synthetic-model'})
        with self.assertRaisesRegex(ContractError, 'copie locale'):
            self.engine.start(project['id'], graph)
        with self.assertRaisesRegex(ContractError, 'copie locale'):
            Schedules(self.engine).create(project['id'], graph, {'kind': 'interval', 'minutes': 5})
        # Explicit existing context is used by the preflight, not silently lost.
        checked = request(self.engine, {**payload, 'parameters': {'environment': 'local', 'neutralized_copy': 'synthetic QA fixture'}})
        self.assertFalse(any(i.get('code', '').startswith('odoo.qa.') for i in checked['issues']))
        self.assertTrue(any('shell' in i['message'] for i in checked['issues']), 'A copy does not provide missing executor capabilities')

    def test_native_policy_does_not_defer_series_online_or_missing_profile(self):
        use_native_cli_fixtures(self, self.root)
        project, _, original = self.configured('Policy guards', module=True)
        for fields, code in [({'platform': 'online', 'route': 'module'}, 'odoo.online-studio-required'),
                             ({'platform': 'online', 'route': 'studio'}, 'odoo.online-module-forbidden')]:
            with self.subTest(fields=fields):
                graph = copy.deepcopy(original); graph['parameters'].update(fields)
                # Direct start uses the caller's exact effective parameters.
                with self.assertRaisesRegex(ContractError, 'Online'):
                    self.engine.start(project['id'], graph, driver='conversation')
        self.engine.project_series(project['id'], '19.0', platform='online')
        checked = request(self.engine, {'action': 'workflow.validate', 'project': project['id'], 'graph': original,
                          'mode': 'native', 'provider': 'codex', 'model': 'synthetic-model'})
        self.assertIn('odoo.online-module-forbidden', [i['code'] for i in checked['issues']])
        with self.assertRaisesRegex(ContractError, 'Online'):
            Conversations(self.engine).open(project['id'], original, 'codex', model='synthetic-model')
        graph = copy.deepcopy(original)
        graph['parameters'].pop('series')
        with self.assertRaisesRegex(ContractError, 'série'):
            self.engine.start(project['id'], graph, driver='conversation')
        graph = copy.deepcopy(original)
        graph['nodes'][0]['profile'] = 'missing-profile'
        checked = request(self.engine, {'action': 'workflow.validate', 'project': project['id'], 'graph': graph, 'mode': 'native', 'provider': 'codex', 'model': 'synthetic-model'})
        self.assertTrue(any(i.get('code') == 'profile.unavailable' and i['action'] == 'edit-node' for i in checked['issues']))
        with self.assertRaisesRegex(ContractError, 'Profil'):
            Conversations(self.engine).open(project['id'], graph, 'codex', model='synthetic-model')

    def test_cross_project_dialog_checks_every_target_before_opening(self):
        use_native_cli_fixtures(self, self.root)
        first, _, graph = self.configured('Principal', module=True)
        second = self.engine.create_project('Sans pack')
        payload = {'action': 'workflow.validate', 'project': first['id'], 'projects': [second['id']],
                   'graph': graph, 'mode': 'native', 'provider': 'codex', 'model': 'synthetic-model'}
        checked = request(self.engine, payload)
        missing = [i for i in checked['issues'] if i.get('code') == 'profile.unavailable']
        self.assertTrue(missing)
        self.assertTrue(all(i['project'] == second['id'] and i['project_title'] == 'Sans pack' and i['action'] == 'choose-projects' for i in missing))
        self.assertEqual(checked['requirements'][0]['project'], first['id'])
        with self.assertRaisesRegex(ContractError, 'Sans pack.*Profil'):
            request(self.engine, {**payload, 'action': 'conversation.open'})
        self.assertEqual(Conversations(self.engine).list(), [])
        configure(self.engine, [{'path': second['path'], 'name': 'Sans pack', 'series': '17.0'}], str(self.pack))
        checked = request(self.engine, payload)
        self.assertEqual(checked['issues'], [])
        self.assertEqual({i['project'] for i in checked['requirements']}, {first['id'], second['id']})
        conversation = request(self.engine, {**payload, 'action': 'conversation.open'})
        for project, series in [(first, '19.0'), (second, '17.0')]:
            item = Conversations(self.engine).add(conversation['id'], 'Synthetic task', project=project['id'])
            self.assertEqual(self.engine.run(item['run'])['parameters']['series'], series)
        self.engine.project_series(second['id'], '17.0', platform='online')
        checked = request(self.engine, payload)
        self.assertTrue(any(i.get('code') == 'odoo.online-module-forbidden' and i['project'] == second['id'] for i in checked['issues']))
        with self.assertRaisesRegex(ContractError, 'Sans pack.*Online'):
            request(self.engine, {**payload, 'action': 'conversation.open'})
        # A blocking primary issue remains visible even when another target fails.
        broken = copy.deepcopy(graph)
        broken['parameters'].update(environment='local', neutralized_copy=False)
        checked = request(self.engine, {**payload, 'graph': broken})
        self.assertTrue(any(i.get('code') == 'odoo.qa.copy-invalid' and i['project'] == first['id'] for i in checked['issues']))
        self.assertTrue(any(i.get('code') == 'odoo.online-module-forbidden' and i['project'] == second['id'] for i in checked['issues']))

    def test_missing_profile_does_not_hide_available_profiles_or_duplicate_diagnostics(self):
        use_native_cli_fixtures(self, self.root)
        project, _, _ = self.configured('Partial profile resolution')
        graph = {'schema': 1, 'id': 'profiles', 'title': 'Mixed profiles', 'parameters': {'series': '19.0'},
                 'defaults': {'provider': 'codex', 'model': 'synthetic'}, 'nodes': [
                     {'id': 'installed', 'kind': 'agent', 'title': 'Installed', 'profile': 'odoo-analyst', 'provider': 'claude'},
                     {'id': 'missing', 'kind': 'agent', 'title': 'Missing', 'profile': 'not-installed', 'profile_text': 'Obsolete text'}], 'edges': []}
        original = copy.deepcopy(graph)
        for mode in ('automatic', 'native'):
            with self.subTest(mode=mode):
                checked = request(self.engine, {'action': 'workflow.validate', 'project': project['id'], 'graph': graph, 'mode': mode, 'provider': 'codex'})
                self.assertEqual([(i['node'], i.get('code')) for i in checked['issues']], [('missing', 'profile.unavailable')])
        with self.assertRaisesRegex(ContractError, 'Profil not-installed'):
            self.engine.start(project['id'], graph)
        with self.assertRaisesRegex(ContractError, 'Profil not-installed'):
            Schedules(self.engine).create(project['id'], graph, {'kind': 'interval', 'minutes': 5})
        self.assertEqual(graph, original)

    def test_new_custom_release_has_applicable_explicit_qa_and_keeps_frozen_definitions(self):
        project,entry,graph=self.configured('Custom module',module=True)
        check=next(n for n in graph['nodes'] if n['id']=='check')
        self.assertTrue(check['candidate_check'])
        self.assertEqual(check['inputs']['candidate'],'object')
        self.assertEqual(check['outputs']['verdict'],'string')
        original=Path(project['path'])/'sample.txt';original.write_text('before')
        run=self.engine.start(project['id'],graph,parameters={'environment':'local','neutralized_copy':'synthetic files, no Odoo database'})
        run=self.complete(run,'intent',{'intent':'Check synthetic source'})
        run=self.complete(run,'plan',{'plan':'Prepare, check and review'})
        run=self.approve(run,'scope')
        claim=self.engine.claim(run['id'],'work');job=prepare(self.engine,run,self.root/'candidate')
        (job['workspace']/'sample.txt').write_text('after')
        reference,diff=capture(self.engine,run,job)
        run=self.engine.submit(run['id'],'work',claim['token'],{'ok':True,'summary':'Synthetic candidate','outputs':{'result':'Changed sample','candidate':reference},'evidence':[reference,diff],'patch':diff})
        run=self.complete(run,'check',{'verdict':'pass','evidence_summary':'Synthetic file check only'},[self.engine.artifact(b'Synthetic candidate inspected, not an Odoo QA')])
        run=self.complete(run,'delivery',{'proposal':'Apply the synthetic file candidate'})
        run=self.approve(run,'receipt')
        self.assertEqual(run['status'],'completed')
        apply(self.engine,run['id'],'work',reference['sha256'],human=True)
        self.assertEqual(original.read_text(),'after')
        frozen=self.engine.run(run['id'])['definition']
        # Setup must preserve an existing user definition, even when it lacks QA.
        check.pop('candidate_check');graph['title']='Existing custom definition'
        saved=self.engine.save(project['id'],graph,graph['revision'])
        configure(self.engine,[entry],str(self.pack))
        current=next(g for g in self.engine.workflows(project['id']) if g['id']==graph['id'])
        self.assertEqual(current,saved)
        self.assertEqual(self.engine.run(run['id'])['definition'],frozen)

    def test_studio_and_online_routes_do_not_invent_a_code_candidate(self):
        for name,module,online in [('Studio',False,False),('Online',True,True)]:
            with self.subTest(name=name):
                _,_,graph=self.configured(name,module=module,online=online)
                work=next(n for n in graph['nodes'] if n['id']=='work')
                check=next(n for n in graph['nodes'] if n['id']=='check')
                self.assertEqual(work['profile'],'odoo-studio')
                self.assertNotEqual(work.get('execution_mode'),'edit')
                self.assertNotIn('candidate',work['outputs'])
                self.assertNotIn('candidate',check['inputs'])
                self.assertFalse(check.get('candidate_check',False))
                if online:self.assertEqual(graph['parameters']['route'],'studio')

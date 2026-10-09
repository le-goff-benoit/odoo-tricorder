"""Generated Odoo workflows, using only synthetic repositories and a local fake pack."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, validate
from workflow_engine.setup import configure
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

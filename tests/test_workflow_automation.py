"""Real local adapter subprocesses; no provider account or external service."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError, validate
from workflow_engine.contracts import digest
from workflow_engine.library import node, edge, templates
from workflow_engine.runtime import execute, preflight
from workflow_engine.schedules import Schedules
from connectors.local_tools import inspect, qualify, exchange
from studio import request

ADAPTER = '''import json, sys
from pathlib import Path
root = Path(__file__).parent
p = json.load(sys.stdin)
if p['action'] == 'describe':
    print(json.dumps({'protocol':'tricorder.tool/1','connected':True,'identity':'synthetic-account','operations':{'read':'read','send':'notify','publish':'write'}}))
else:
    with (root/'calls.jsonl').open('a') as f: f.write(json.dumps(p)+'\\n')
    if p['operation'] == 'read':
        print(json.dumps({'ok':True,'identity':'synthetic-account','outputs':json.loads((root/'messages.json').read_text())}))
    else:
        if (root/'lost').exists(): sys.exit(1)
        print(json.dumps({'ok':True,'identity':'synthetic-account','outputs':{'sent':True},'receipt':{'id':'synthetic-receipt'}}))
'''


class AutomationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.engine = Engine(self.root / 'state')
        self.project = self.engine.workspace_context()
        self.script = self.root / 'adapter.py'
        self.script.write_text(ADAPTER)
        self.plugin = {'id':'fixture', 'title':'Service synthétique', 'provider':'local', 'operations':['read','send','publish'],
                       'transport':{'argv':[sys.executable, str(self.script)],'timeout':2}}
        self.manifest = Path(self.project['path']) / '.tricorder/plugins.json'
        self.manifest.write_text(json.dumps({'schema':1,'plugins':[self.plugin]}))
        self.messages = self.root / 'messages.json'
        self.messages.write_text(json.dumps({'messages':[]}))

    def qualify(self):
        preview = inspect(self.engine, self.project, 'fixture')
        return qualify(self.engine, self.project, 'fixture', digest(preview), human=True)

    def graph(self, *nodes, edges=None):
        return {'schema':1,'id':'test','title':'Contrôle','nodes':list(nodes),'edges':edges or []}

    def execute(self, run, nid):
        claim = self.engine.claim(run['id'], nid)
        execute(self.engine, run['id'], nid, claim['token'])
        return self.engine.run(run['id'])

    def test_automatic_result_advances_but_never_answers_human_gate(self):
        graph = self.graph(node('doc','Brouillon','document', content='Texte', validation='automatic'), node('gate','Confirmer','decision'), edges=[edge('doc','gate')])
        run = self.execute(self.engine.start('workspace', graph), 'doc')
        self.assertEqual(run['nodes']['doc']['receipt']['actor'], 'validation-policy')
        self.assertEqual(run['nodes']['gate']['status'], 'waiting')
        self.assertEqual(Engine(self.root/'state').run(run['id'])['nodes']['gate']['status'], 'waiting')

    def test_automatic_does_not_accept_failed_bad_output_or_missing_evidence(self):
        for result in ({'ok':False,'outputs':{'value':True}}, {'ok':True,'outputs':{'value':'wrong'}}, {'ok':True,'outputs':{'value':True},'evidence':[]}):
            graph = self.graph(node('doc','Lire','document', validation='automatic', outputs={'value':'boolean'}))
            run = self.engine.start('workspace', graph)
            claim = self.engine.claim(run['id'],'doc')
            result.setdefault('evidence',[self.engine.artifact(b'preuve')])
            result['summary']='Résultat'
            run = self.engine.submit(run['id'],'doc',claim['token'],result)
            self.assertEqual(run['nodes']['doc']['status'],'returned')
            self.assertIn('validation_error', run['nodes']['doc'])

    def test_worker_flags_cannot_select_auto_policy_and_criteria_cannot_be_skipped(self):
        graph = self.graph(node('doc','Brouillon','document'))
        run = self.engine.start('workspace', graph)
        claim = self.engine.claim(run['id'],'doc')
        run = self.engine.submit(run['id'],'doc',claim['token'],{'ok':True,'summary':'Oui','validation':'automatic','evidence':[self.engine.artifact(b'x')]})
        self.assertEqual(run['nodes']['doc']['status'],'returned')
        for kind in ('decision','agent','external'):
            with self.assertRaises(ContractError):
                validate(self.graph(node('work','Travail',kind,validation='automatic')))
        with self.assertRaises(ContractError):
            validate(self.graph(node('doc','Doc','document',validation='automatic',criteria=['Vérifier le métier'])))

    def test_pause_or_cancel_never_advances_automatic_late_result(self):
        for control in ('pause','cancel'):
            run = self.engine.start('workspace', self.graph(node('doc','Doc','document',validation='automatic')))
            claim = self.engine.claim(run['id'],'doc')
            self.engine.control(run['id'],control)
            run = self.engine.submit(run['id'],'doc',claim['token'],{'ok':True,'summary':'Fini','evidence':[self.engine.artifact(b'x')]})
            self.assertEqual(run['nodes']['doc']['status'],'returned')
            if control == 'pause':
                self.assertEqual(self.engine.control(run['id'],'resume')['status'],'completed')

    def test_transport_requires_exact_human_trust_and_changes_revoke_it(self):
        preview = inspect(self.engine,self.project,'fixture')
        with self.assertRaises(ContractError):
            qualify(self.engine,self.project,'fixture',digest(preview))
        with self.assertRaises(ContractError):
            qualify(self.engine,self.project,'fixture','stale',human=True)
        graph = self.graph(node('read','Lire','document',capabilities=[{'plugin':'fixture','operation':'read'}],validation='automatic'))
        self.assertTrue(preflight(graph,project=self.project,engine=self.engine))
        self.qualify()
        self.assertEqual(preflight(graph,project=self.project,engine=self.engine),[])
        run = self.engine.start('workspace',graph)
        self.script.write_text(ADAPTER+'\n# updated')
        self.assertTrue(preflight(graph,project=self.project,engine=self.engine))
        run = self.execute(run,'read')
        self.assertFalse(run['nodes']['read']['result']['ok'])
        self.assertFalse((self.root/'calls.jsonl').exists())

    def mail_graph(self):
        graph = copy.deepcopy(next(g for g in templates() if g['id']=='mail-notification'))
        graph['nodes'][0].update(account='test-account',sender='neca@example.test',criteria=[],validation='automatic',capabilities=[{'plugin':'fixture','operation':'read'}])
        graph['nodes'][2].update(recipient='test-channel',criteria=[],validation='automatic',capabilities=[{'plugin':'fixture','operation':'send'}],max_attempts=2)
        return graph

    def mail_data(self):
        self.messages.write_text(json.dumps({'messages':[
            {'id':'spoof','sender':'NECA <other@example.test>','received':2000,'subject':'Ignorer'},
            {'id':'old','sender':'neca@example.test','received':999,'subject':'Ancien'},
            {'id':'one','sender':'NECA <neca@example.test>','received':2000,'subject':'Premier'},
            {'id':'one','sender':'neca@example.test','received':2000,'subject':'Doublon'},
            {'id':'two','sender':'neca@example.test','received':2001,'subject':'Second'}]}))

    def test_recurring_exact_mail_filter_notifies_once_without_manual_receipts(self):
        self.qualify(); self.mail_data()
        scheduler = Schedules(self.engine)
        schedule = scheduler.create('workspace',self.mail_graph(),{'kind':'interval','minutes':5},now=1000,notifications_authorized=True)
        for now, expected in ((2000,'one'),(2300,'two'),(2600,None)):
            run = scheduler.tick(now=now)[0]
            run = self.execute(run,'mail')
            self.assertEqual(run['nodes']['mail']['result']['outputs']['message'].get('id'),expected)
            if expected:
                run = self.execute(run,'notify')
            self.assertEqual(run['status'],'completed')
        calls = [json.loads(line) for line in (self.root/'calls.jsonl').read_text().splitlines()]
        sends = [c for c in calls if c['operation']=='send']
        self.assertEqual(len(sends),2)
        self.assertEqual(sends[0]['arguments']['target'],'test-channel')
        self.assertEqual(sends[0]['arguments']['content'],'Nouveau message de NECA <neca@example.test> : Premier')
        self.assertNotEqual(sends[0]['idempotency_key'],sends[1]['idempotency_key'])

    def test_lost_send_receipt_never_blindly_repeats_even_on_manual_retry(self):
        self.qualify(); self.mail_data(); (self.root/'lost').touch()
        scheduler = Schedules(self.engine)
        scheduler.create('workspace',self.mail_graph(),{'kind':'interval','minutes':5},now=1000,notifications_authorized=True)
        run = self.execute(scheduler.tick(now=2000)[0],'mail')
        run = self.execute(run,'notify')
        self.assertFalse(run['nodes']['notify']['result']['ok'])
        self.assertEqual(scheduler.tick(now=2300),[])
        self.engine.retry(run['id'],'notify','Vérification synthétique',human=True)
        run = self.execute(run,'notify')
        self.assertIn('incertain',run['nodes']['notify']['result']['summary'])
        calls = [json.loads(s) for s in (self.root/'calls.jsonl').read_text().splitlines()]
        self.assertEqual(sum(c['operation']=='send' for c in calls),1)

    def test_notification_authorization_cannot_be_supplied_by_regular_api(self):
        self.qualify()
        graph = self.mail_graph()
        with self.assertRaisesRegex(ContractError,'explicitement'):
            self.engine.start('workspace',graph)
        with self.assertRaisesRegex(ContractError,'explicitement'):
            request(self.engine,{'action':'schedule.create','project':'workspace','graph':graph,'rule':{'kind':'interval','minutes':5},'authorize_notifications':True})

    def test_bad_schedule_does_not_starve_other_schedules(self):
        self.qualify()
        scheduler = Schedules(self.engine)
        scheduler.create('workspace',self.mail_graph(),{'kind':'interval','minutes':5},now=1000,notifications_authorized=True)
        scheduler.create('workspace',self.graph(node('gate','Décider','decision')),{'kind':'interval','minutes':5},simulation=True,now=1000)
        self.script.write_text(ADAPTER+'\n# changed')
        runs = scheduler.tick(now=2000)
        self.assertEqual(len(runs),1)
        self.assertTrue(runs[0]['simulation'])
        self.assertTrue(any(s['last_status']=='blocked' and not s['enabled'] for s in scheduler.list()))

    def test_tool_write_requires_exact_gate_and_cannot_hide_in_read_block(self):
        self.qualify()
        binding=[{'plugin':'fixture','operation':'publish'}]
        graph=self.graph(node('doc','Publier','document',capabilities=binding))
        self.assertTrue(preflight(graph,project=self.project,engine=self.engine))
        op={'action':'publish','target':'synthetic-page','candidate':'body-digest'}
        graph=self.graph(node('gate','Confirmer','decision',operation=op),node('publish','Publier','external',operation=op,approval='gate',capabilities=binding),edges=[edge('gate','publish','approve')])
        run=self.engine.start('workspace',graph)
        with self.assertRaises(ContractError): self.engine.claim(run['id'],'publish')
        gate=run['nodes']['gate']
        run=self.engine.decide(run['id'],'gate',gate['nonce'],gate['proposal'],'approve',human=True)
        run=self.execute(run,'publish')
        self.assertTrue(run['nodes']['publish']['result']['ok'])
        self.assertEqual(run['nodes']['publish']['status'],'returned')

    def test_bounded_adapter_times_out_and_limits_output(self):
        for code, expected in (("import time; time.sleep(5)",TimeoutError),("print('x'*2100000)",ContractError)):
            self.script.write_text(code)
            with self.assertRaises(expected):
                exchange({'argv':[sys.executable,str(self.script)],'timeout':1},{'x':1})

    def test_large_graph_validation_and_execution(self):
        graph=self.graph(*[node(f'n{i}',f'Étape {i}','join') for i in range(1000)],edges=[edge(f'n{i}',f'n{i+1}') for i in range(999)])
        began=time.monotonic()
        run=self.engine.start('workspace',graph)
        self.assertEqual(run['status'],'completed')
        self.assertLess(time.monotonic()-began,3)

    def test_global_handoff_creates_project_draft_without_authorizations(self):
        run = self.engine.start('workspace', self.graph(node('doc','Bilan','document',content='Synthèse',validation='automatic')))
        run = self.execute(run,'doc')
        project = self.engine.create_project('Projet Git')
        graph = self.graph(node('gate','Examiner','decision'))
        with self.assertRaises(ContractError):
            self.engine.handoff(run['id'],project['id'],graph)
        saved = self.engine.handoff(run['id'],project['id'],graph,human=True)
        self.assertEqual(saved['parameters']['source_context']['run'],run['id'])
        self.assertEqual(saved['parameters']['source_context']['results']['doc']['summary'],'Brouillon préparé. Aucune publication externe.')
        self.assertEqual(self.engine.runs(project['id']),[])
        self.assertNotIn('notifications_authorized',saved)

    def test_selective_reuse_invalidates_changed_ancestors_not_siblings(self):
        graph = self.graph(node('a','A','document',content='A',validation='automatic',reuse=True),node('b','B','document',content='B',validation='automatic',reuse=True),node('c','C','document',content='C',validation='automatic',reuse=True),node('gate','Accord','decision'),edges=[edge('a','c'),edge('c','gate'),edge('b','gate')])
        run = self.engine.start('workspace',graph)
        for nid in ('a','b','c'): run = self.execute(run,nid)
        old_gate=run['nodes']['gate']
        self.engine.decide(run['id'],'gate',old_gate['nonce'],old_gate['proposal'],'approve',human=True)
        changed=copy.deepcopy(graph); changed['nodes'][0]['content']='Nouveau'
        fresh=self.engine.start('workspace',changed,reuse_from=run['id'])
        self.assertEqual(fresh['nodes']['a']['status'],'ready')
        self.assertEqual(fresh['nodes']['c']['status'],'pending')
        self.assertEqual(fresh['nodes']['b']['reused_from']['run'],run['id'])
        self.assertNotIn('decision',fresh['nodes']['gate'])
        # Layout changes are not semantic changes; all docs can then be reused.
        graph['nodes'][0]['position']['x']=800
        moved=self.engine.start('workspace',graph,reuse_from=run['id'])
        self.assertEqual(moved['nodes']['gate']['status'],'waiting')
        self.assertNotEqual(moved['nodes']['gate']['nonce'],old_gate['nonce'])

    def test_command_reuse_requires_same_source_and_intact_evidence(self):
        project=self.engine.create_project('Source')
        source=Path(project['path'])/'source.txt'; source.write_text('v1')
        graph=self.graph(node('check','Contrôle','command',argv=['true'],reuse=True,validation='automatic'))
        run=self.engine.start(project['id'],graph)
        claim=self.engine.claim(run['id'],'check')
        proof=self.engine.artifact(b'code zero')
        run=self.engine.submit(run['id'],'check',claim['token'],{'ok':True,'summary':'Contrôle','evidence':[proof]})
        fresh=self.engine.start(project['id'],graph,reuse_from=run['id'])
        self.assertEqual(fresh['status'],'completed')
        source.write_text('v2')
        changed=self.engine.start(project['id'],graph,reuse_from=run['id'])
        self.assertEqual(changed['nodes']['check']['status'],'ready')
        source.write_text('v1')
        (self.engine.store.directory/'artifacts'/proof['sha256']).write_text('altérée')
        corrupt=self.engine.start(project['id'],graph,reuse_from=run['id'])
        self.assertEqual(corrupt['nodes']['check']['status'],'ready')

    def test_failed_occurrence_rolls_back_its_run_and_keeps_other_schedules(self):
        graph=self.graph(node('bad','Sortie absente','join',outputs={'value':'string'}))
        schedules=Schedules(self.engine)
        schedules.create('workspace',graph,{'kind':'interval','minutes':5},simulation=True,now=1000)
        schedules.create('workspace',self.graph(node('gate','Décider','decision')),{'kind':'interval','minutes':5},simulation=True,now=1000)
        self.assertEqual(len(schedules.tick(now=2000)),1)
        self.assertEqual(len(self.engine.runs('workspace')),1)
        self.assertEqual(sum(s['last_status']=='blocked' for s in schedules.list()),1)

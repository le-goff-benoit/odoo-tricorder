"""Fresh occurrence sources through a qualified local adapter, never a service.

Business agent results are controlled test submissions. No provider model or
account is invoked; transport processes and engine transitions are real.
"""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from workflow_engine import ContractError, Engine, validate
from workflow_engine.contracts import digest
from workflow_engine.runtime import execute, preflight
from workflow_engine.schedules import Schedules
from workflow_engine.packs import resolve_profiles
from connectors.local_tools import inspect, qualify


ADAPTER='''import json,sys
from pathlib import Path
root=Path(__file__).parent
payload=json.load(sys.stdin)
if payload['action']=='describe':
 print(json.dumps({'protocol':'tricorder.tool/1','connected':True,'identity':'synthetic-source','operations':{'find':'read','send':'notify'}}))
else:
 with (root/'calls.jsonl').open('a') as stream:stream.write(json.dumps(payload)+'\\n')
 outputs=json.loads((root/'items.json').read_text())
 if 'query' in payload['arguments'] and not (root/'unsupported-query').exists():
  outputs['source_coverage']={'query':payload['arguments']['query'],'scope':payload['arguments']['scope'],
                            'since':payload['arguments']['since'],'complete':True}
 print(json.dumps({'ok':True,'identity':'synthetic-source','outputs':outputs}))
'''


class FreshScheduleSourcesTests(unittest.TestCase):
    def setUp(self):
        temporary=tempfile.TemporaryDirectory(prefix='tricorder-fresh-sources-')
        self.addCleanup(temporary.cleanup)
        self.root=Path(temporary.name)
        self.engine=Engine(self.root/'state')
        self.project=self.engine.workspace_context()
        self.script=self.root/'adapter.py';self.script.write_text(ADAPTER)
        plugin={'id':'source','title':'Sources synthétiques','provider':'local','operations':['find','send'],
                'transport':{'argv':[sys.executable,str(self.script)],'timeout':3}}
        (Path(self.project['path'])/'.tricorder/plugins.json').write_text(json.dumps({'schema':1,'plugins':[plugin]}))
        self.items=self.root/'items.json';self.items.write_text(json.dumps({'items':[]}))
        preview=inspect(self.engine,self.project,'source')
        qualify(self.engine,self.project,'source',digest(preview),human=True)
        catalog=[{'id':provider,'installed':True,'usable':True,'reason':'Controlled fixture'} for provider in ('codex','claude','command')]
        capabilities=patch('workflow_engine.runtime.capabilities',return_value=catalog)
        capabilities.start();self.addCleanup(capabilities.stop)
        self.scheduler=Schedules(self.engine)

    def graph(self):
        text={'type':'string','required':True};obj={'type':'object','required':True}
        collection={'type':'array','items':'object','minItems':1,'required':True}
        return {'schema':2,'id':'fresh-meeting','title':'Nouvelles réunions',
                'defaults':{'provider':'codex','model':'controlled-no-invocation'},
                'schedule_source':{'version':1,'mode':'connection','node':'fresh'},
                'nodes':[{'id':'fresh','title':'Lire les nouvelles sources','kind':'watch',
                          'validation':'automatic','criteria':[],'required_capabilities':['read'],
                          'account':'Équipe test','sender':'*','capabilities':[{'plugin':'source','operation':'find'}],
                          'source_polling':{'version':1,'query':'Notes de réunion équipe test','scope':'Équipe test'},
                          'outputs':{'match':text,'message':obj}},
                         {'id':'available','title':'Source disponible ?','kind':'condition','parameter':'match',
                          'options':['yes','no'],'inputs':{'match':text,'message':obj},'outputs':{'message':obj}},
                         {'id':'source','title':'Comprendre la source fournie','kind':'agent','profile':'analyse',
                          'session':'delegated','execution_driver':'delegated','validation':'contract',
                          'required_capabilities':['text'],'inputs':{'source_message':obj},'outputs':{'sources':collection}},
                         {'id':'review','title':'Examiner le résultat','kind':'decision','options':['approve','reject'],
                          'inputs':{'sources':collection}}],
                'edges':[{'id':'fresh-gate','from':'fresh','to':'available','mapping':{'match':'match','message':'message'}},
                         {'id':'gate-source','from':'available','to':'source','outcome':'yes','mapping':{'message':'source_message'}},
                         {'id':'source-review','from':'source','to':'review','mapping':{'sources':'sources'}}]}

    def create(self,graph=None):
        return self.scheduler.create('workspace',graph or self.graph(),{'kind':'interval','minutes':5},now=1000)

    def read(self,now):
        run=self.scheduler.tick(now=now)[0]
        claim=self.engine.claim(run['id'],'fresh')
        execute(self.engine,run['id'],'fresh',claim['token'])
        return self.engine.run(run['id'])

    def finish(self,run,decision='approve'):
        state=run['nodes']['source']
        self.assertEqual(state['status'],'ready')
        message=state['inputs']['source_message']
        claim=self.engine.claim(run['id'],'source')
        run=self.engine.submit(run['id'],'source',claim['token'],{'ok':True,'summary':'Controlled source interpretation',
                  'outputs':{'sources':[{'reference':message['id'],'content':message.get('body','')} ]}})
        gate=run['nodes']['review']
        return self.engine.decide(run['id'],'review',gate['nonce'],gate['proposal'],decision,human=True)

    def consumed(self):
        with self.engine.store.connect() as db:return db.execute('SELECT COUNT(*) FROM consumed_messages').fetchone()[0]

    def test_fresh_read_cannot_release_an_independent_or_empty_source_branch(self):
        for variation in ('independent', 'direct', 'empty'):
            with self.subTest(variation=variation):
                graph=self.graph()
                if variation=='independent':
                    graph['nodes'].append({'id':'other','kind':'agent','title':'Independent','outputs':{'result':'string'}})
                elif variation=='direct':
                    graph['edges'].append({'id':'bypass','from':'fresh','to':'source','mapping':{'message':'source_message'}})
                else:
                    graph['edges'][1]['outcome']='no'
                with self.assertRaises(ContractError):self.create(graph)
                self.assertEqual(self.scheduler.list(),[])

    def test_local_step_source_cannot_override_the_versioned_fixed_source(self):
        graph={'schema':2,'id':'fixed','title':'Fixed','schedule_source':{'version':1,'mode':'fixed','node':'source'},
               'nodes':[{'id':'source','title':'Read','kind':'agent','required_capabilities':['text'],
                         'parameters':{'schedule_fixed_source':'ANCIEN'},'outputs':{'result':'string'}}],'edges':[]}
        with self.assertRaisesRegex(ContractError,'remplacer la source'):
            self.scheduler.create('workspace',graph,{'kind':'interval','minutes':5},simulation=True,parameters={'schedule_fixed_source':'NOUVEAU'})
        with self.assertRaisesRegex(ContractError,'remplacer la source'):
            self.engine.start('workspace',graph,simulation=True,parameters={'schedule_fixed_source':'NOUVEAU'})
        self.assertEqual(self.scheduler.list(),[])

    def test_fixed_source_cannot_invoke_an_adapter_or_an_independent_branch(self):
        base={'schema':2,'id':'fixed','title':'Fixed','schedule_source':{'version':1,'mode':'fixed','node':'source'},
              'nodes':[{'id':'source','title':'Read','kind':'agent','required_capabilities':['text'],
                        'outputs':{'result':'string'}}],'edges':[]}
        for variation in ('binding','read','mode','driver','independent'):
            with self.subTest(variation=variation):
                graph=copy.deepcopy(base);source=graph['nodes'][0]
                if variation=='binding':source['capabilities']=[{'plugin':'source','operation':'find'}]
                elif variation=='read':source['required_capabilities'].append('read')
                elif variation=='mode':source['execution_mode']='tools'
                elif variation=='driver':source['execution_driver']='native'
                else:graph['nodes'].append({'id':'other','kind':'agent','title':'Independent','outputs':{'result':'string'}})
                with self.assertRaises(ContractError):
                    self.scheduler.create('workspace',graph,{'kind':'interval','minutes':5},simulation=True,parameters={'schedule_fixed_source':'Texte'})
                with self.assertRaises(ContractError):
                    self.engine.start('workspace',graph,simulation=True,parameters={'schedule_fixed_source':'Texte'})
                self.assertEqual(self.scheduler.list(),[])
                self.assertFalse((self.root/'calls.jsonl').exists())

    def test_backlog_equal_timestamps_and_new_sources_are_processed_once_per_success(self):
        self.items.write_text(json.dumps({'items':[{'id':'a','received':1500,'body':'Notes A'},
             {'id':'b','received':1500,'body':'Notes B'},{'id':'c','received':1600,'body':'Notes C'}]}))
        self.create()
        for now,expected in ((1300,'a'),(1600,'b'),(1900,'c')):
            run=self.read(now)
            self.assertEqual(run['nodes']['source']['inputs']['source_message']['id'],expected)
            self.assertEqual(self.finish(run)['completion_outcome'],'succeeded')
        empty=self.read(2200)
        self.assertEqual(empty['status'],'completed');self.assertEqual(empty['nodes']['source']['status'],'skipped')
        self.assertEqual(self.consumed(),3)
        self.items.write_text(json.dumps({'items':[{'id':'d','received':2300,'body':'Nouvelles notes D'}]}))
        run=self.read(2500)
        self.assertEqual(run['occurrence']['since'],2200)
        self.assertEqual(run['nodes']['source']['inputs']['source_message']['id'],'d')
        self.finish(run)
        calls=[json.loads(line) for line in (self.root/'calls.jsonl').read_text().splitlines()]
        self.assertEqual(calls[0]['arguments']['since'],1000)
        self.assertLess(calls[1]['arguments']['since'],1500)
        self.assertEqual(calls[0]['arguments']['query'],'Notes de réunion équipe test')
        self.assertEqual(calls[0]['arguments']['scope'],'Équipe test')

    def test_rejection_and_failed_execution_do_not_consume_or_advance_the_source(self):
        self.items.write_text(json.dumps({'items':[{'id':'a','received':1500,'body':'Notes A'}]}))
        self.create()
        rejected=self.finish(self.read(1300),'reject')
        self.assertEqual(rejected['completion_outcome'],'rejected');self.assertEqual(self.consumed(),0)
        run=self.read(1600);self.assertEqual(run['occurrence']['since'],1000)
        claim=self.engine.claim(run['id'],'source')
        self.engine.submit(run['id'],'source',claim['token'],{'ok':False,'summary':'Controlled failure','outputs':{}})
        self.engine.control(run['id'],'cancel')
        self.assertEqual(self.consumed(),0)
        run=self.read(1900);self.assertEqual(run['occurrence']['since'],1000)
        self.assertEqual(run['nodes']['source']['inputs']['source_message']['id'],'a')
        self.finish(run);self.assertEqual(self.consumed(),1)

    def test_empty_connection_read_skips_business_work_without_invoking_any_provider(self):
        self.create()
        with patch('workflow_engine.runtime.execute_text',side_effect=AssertionError('No provider should run')):
            run=self.read(1300)
        self.assertEqual(run['status'],'completed')
        self.assertEqual(run['nodes']['source']['status'],'skipped')
        self.assertNotIn('result',run['nodes']['source'])
        self.assertIn('Aucune nouvelle source',run['nodes']['fresh']['result']['summary'])
        self.assertEqual(self.consumed(),0)

    def test_approved_read_adapter_fulfils_actual_read_capability_and_forwards_raw_tool_data(self):
        graph=self.graph()
        source=copy.deepcopy(graph['nodes'][2]);source['inputs']={};source['required_capabilities']=['read']
        source['capabilities']=[{'plugin':'source','operation':'find'}]
        graph={'schema':2,'id':'direct-read','title':'Lire par adaptateur','defaults':graph['defaults'],'nodes':[source],'edges':[]}
        self.assertEqual(preflight(resolve_profiles(self.project,copy.deepcopy(graph)),project=self.project,engine=self.engine),[])
        self.items.write_text(json.dumps({'items':[{'id':'a','received':1500,'body':'Contenu réel de fixture'}]}))
        run=self.engine.start('workspace',graph)
        claim=self.engine.claim(run['id'],'source')
        def generated(engine,current,node,token,job):
            raw=current['nodes']['source']['inputs']['tool_data']
            self.assertEqual(raw['items'][0]['body'],'Contenu réel de fixture')
            return {'ok':True,'summary':'Controlled provider transport','outputs':{'sources':raw['items']}}
        with patch('workflow_engine.runtime.execute_text',side_effect=generated):
            execute(self.engine,run['id'],'source',claim['token'])
        self.assertEqual(self.engine.run(run['id'])['status'],'completed')
        graph['nodes'][0]['capabilities'][0]['operation']='send'
        self.assertTrue(any(issue.get('code')=='executor.capabilities-missing' for issue in preflight(graph,project=self.project,engine=self.engine)))

    def test_incomplete_or_undated_source_lists_fail_without_watermark_or_consumption(self):
        for payload in ({'items':[{'id':'a','body':'No date'}]}, {'items':[],'has_more':True}):
            with self.subTest(payload=payload):
                self.items.write_text(json.dumps(payload))
                # A fresh schedule owns a fresh occurrence; cancelled runs do not overlap.
                active=self.create()
                schedules=self.scheduler.list()
                for schedule in schedules:
                    if schedule['id']!=active['id']:self.scheduler.toggle(schedule['id'],False)
                run=self.read(1300)
                self.assertFalse(run['nodes']['fresh']['result']['ok'])
                self.assertEqual(run['nodes']['source']['status'],'pending')
                self.engine.control(run['id'],'cancel')
                self.assertEqual(self.consumed(),0)

    def test_adapter_which_ignores_query_or_scope_cannot_process_or_advance_sources(self):
        self.items.write_text(json.dumps({'items':[{'id':'a','received':1500,'body':'Outside query'}]}))
        (self.root/'unsupported-query').touch()
        self.create()
        run=self.read(1300)
        self.assertFalse(run['nodes']['fresh']['result']['ok'])
        self.assertIn('ne confirme pas la recherche',run['nodes']['fresh']['result']['summary'])
        self.assertEqual(run['nodes']['source']['status'],'pending')
        self.assertEqual(self.consumed(),0)

    def test_changed_transport_blocks_next_occurrence_before_reading_any_source(self):
        self.create()
        self.script.write_text(ADAPTER+'\n# Changed adapter')
        self.assertEqual(self.scheduler.tick(now=1300),[])
        self.assertEqual(self.scheduler.list()[0]['last_status'],'blocked')
        self.assertFalse((self.root/'calls.jsonl').exists())


if __name__=='__main__':unittest.main()

"""Controlled CLI processes qualify coordination and transport, never model quality.

The executable below emits deterministic provider events, reads no account or
external source, and records the exact frozen instructions received by workers.
"""
import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import ContractError, Engine, validate
from workflow_engine.conversations import Conversations
from workflow_engine.packs import builtin_profiles, resolve_profiles
from workflow_engine.runtime import dispatch, preflight


FIXTURE = r'''
import json,os,sys,time
from pathlib import Path
prompt=json.loads(sys.stdin.read())
tag=prompt['mission'].split()[0]
folder=Path(os.environ['TRICORDER_METHOD_FIXTURE'])
started=time.time()
(folder/(tag+'.started')).write_text(str(started))
if tag in {'A','B'}:
 deadline=time.monotonic()+5
 while not all((folder/(item+'.started')).exists() for item in ('A','B')):
  if time.monotonic()>deadline:
   raise RuntimeError('Two analysis providers did not run together')
  time.sleep(.02)
 time.sleep(.15)
outputs={key:'Controlled '+tag+' result' for key in prompt['outputs_contract']}
record={'pid':os.getpid(),'start':started,'end':time.time(),'profile':prompt['profile'],
        'inputs':prompt['inputs'],'parameters':prompt['parameters'],'mission':prompt['mission']}
(folder/(tag+'.json')).write_text(json.dumps(record))
value={'summary':'Controlled fixture '+tag,'question':'','outputs_json':json.dumps(outputs)}
for event in [{'type':'thread.started','thread_id':'fixture-'+tag},
              {'type':'item.completed','item':{'type':'agent_message','text':json.dumps(value)}},
              {'type':'turn.completed','usage':{'input_tokens':1,'output_tokens':1}}]:
 print(json.dumps(event),flush=True)
'''


class WorkflowMethodExecutionTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='tricorder-method-execution-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.trace = self.root / 'trace'; self.trace.mkdir()
        binaries = self.root / 'fixture-cli'; binaries.mkdir()
        fixture = binaries / 'codex'
        fixture.write_text(f'#!{sys.executable}\n' + FIXTURE)
        fixture.chmod(0o755)
        environment = patch.dict(os.environ, {'PATH': str(binaries)+os.pathsep+'/usr/bin:/bin',
                                              'TRICORDER_METHOD_FIXTURE': str(self.trace)})
        environment.start(); self.addCleanup(environment.stop)
        self.engine = Engine(self.root / 'state')
        self.project = self.engine.create_project('Méthode synthétique')
        self.processes = []
        actual_popen = subprocess.Popen
        def tracked_spawn(argv, *args, **kwargs):
            process = actual_popen(argv,*args,**kwargs)
            if isinstance(argv,list) and '--worker' in argv:
                self.processes.append(process)
            return process
        tracking = patch('workflow_engine.runtime.subprocess.Popen',side_effect=tracked_spawn)
        tracking.start(); self.addCleanup(tracking.stop)
        self.addCleanup(self.wait_workers)

    def wait_workers(self):
        for process in self.processes:
            try:
                process.wait(timeout=7)
            except subprocess.TimeoutExpired:
                process.terminate()
                process.wait(timeout=3)

    @staticmethod
    def work(nid, profile, inputs=None, *, delegated=True, **extra):
        node = {'id':nid,'title':nid,'kind':'agent','profile':profile,
                'prompt':nid+' controlled deterministic fixture',
                'session':'delegated','validation':'contract','max_attempts':2,
                'inputs':{key:{'type':'string','required':True} for key in (inputs or [])},
                'outputs':{'result':{'type':'string','required':True}}, **extra}
        if delegated:
            node['execution_driver'] = 'delegated'
        return node

    def method(self):
        return {'schema':2,'id':'parallel-method','title':'Comparer deux sources puis vérifier',
                'defaults':{'provider':'codex','model':'controlled-model'},
                'nodes':[self.work('A','analyse'),self.work('B','recherche'),
                         self.work('S','coordination',['first','second']),
                         self.work('V','verification',['synthesis'])],
                'edges':[{'id':'a-s','from':'A','to':'S','mapping':{'result':'first'}},
                         {'id':'b-s','from':'B','to':'S','mapping':{'result':'second'}},
                         {'id':'s-v','from':'S','to':'V','mapping':{'result':'synthesis'}}]}

    def complete(self, rid):
        deadline = time.monotonic()+15
        while time.monotonic() < deadline:
            run = dispatch(self.engine,rid)
            if run['status']=='completed':
                return run
            problems = [state.get('result',{}).get('summary') for state in run['nodes'].values()
                        if state.get('result',{}).get('ok') is False]
            self.assertFalse(problems,problems)
            time.sleep(.06)
        self.fail('Controlled workers did not finish: '+str(self.engine.run(rid)['nodes']))

    def assert_processes_and_roles(self, run):
        records = {key:json.loads((self.trace/(key+'.json')).read_text()) for key in ('A','B','S','V')}
        self.assertEqual(len({record['pid'] for record in records.values()}),4)
        self.assertLess(records['A']['start'],records['B']['end'])
        self.assertLess(records['B']['start'],records['A']['end'])
        self.assertGreater(records['S']['start'],max(records['A']['end'],records['B']['end']))
        self.assertGreater(records['V']['start'],records['S']['end'])
        self.assertEqual(records['S']['inputs'],{'first':'Controlled A result','second':'Controlled B result'})
        self.assertEqual(records['V']['inputs'],{'synthesis':'Controlled S result'})
        definitions = {node['id']:node for node in run['definition']['nodes']}
        profiles = {profile['id']:profile for profile in builtin_profiles()}
        for key,record in records.items():
            self.assertEqual(record['profile'],definitions[key]['profile_text'])
            self.assertEqual(definitions[key]['profile_sha256'],profiles[definitions[key]['profile']]['sha256'])
            self.assertEqual(run['nodes'][key]['ownership'],'managed')
            self.assertTrue(run['nodes'][key]['processes'])
        self.assertNotEqual(records['A']['profile'],records['V']['profile'])

    def test_automatic_method_runs_real_concurrent_processes_and_frozen_verification_profile(self):
        graph = self.method(); validate(graph)
        checked = resolve_profiles(self.project,copy.deepcopy(graph))
        self.assertEqual(preflight(checked,defaults=self.project['defaults'],project=self.project,engine=self.engine),[])
        run = self.engine.start(self.project['id'],graph,parameters={'request':'Two supplied texts A and B'})
        finished = self.complete(run['id'])
        self.assert_processes_and_roles(finished)

    def test_native_method_keeps_source_in_conversation_then_enrolled_workers_run_and_verify(self):
        graph = self.method()
        source = self.work('source','recherche',delegated=False,required_capabilities=['read'])
        graph['nodes'].insert(0,source)
        for nid in ('A','B'):
            target = next(node for node in graph['nodes'] if node['id']==nid)
            target['inputs']['sources'] = {'type':'string','required':True}
            graph['edges'].append({'id':'source-'+nid,'from':'source','to':nid,'mapping':{'result':'sources'}})
        service = Conversations(self.engine)
        conversation = service.open(self.project['id'],graph,'codex',model='controlled-model')
        item = service.add(conversation['id'],'Sources to collect in the native conversation')
        with patch('workflow_engine.runtime.subprocess.Popen',side_effect=AssertionError('Source must stay native')):
            current = dispatch(self.engine,item['run'])
        self.assertEqual(current['nodes']['source']['status'],'ready')
        claim = self.engine.claim(item['run'],'source',executor='native')
        self.engine.submit(item['run'],'source',claim['token'],{'ok':True,'summary':'Controlled source text',
                                                                'outputs':{'result':'Source A\nSource B'}})
        finished = self.complete(item['run'])
        records = {key:json.loads((self.trace/(key+'.json')).read_text()) for key in ('A','B')}
        self.assertEqual(records['A']['inputs'],{'sources':'Source A\nSource B'})
        self.assertEqual(records['B']['inputs'],{'sources':'Source A\nSource B'})
        self.assert_processes_and_roles(finished)
        self.assertEqual(finished['nodes']['source']['ownership'],'native')
        # The source's native tool requirement keeps automatic mode honest.
        checked = resolve_profiles(self.project,copy.deepcopy(graph))
        self.assertTrue(any(issue.get('code')=='executor.capabilities-missing' and issue['node']=='source'
                            for issue in preflight(checked,project=self.project,engine=self.engine)))

    def test_old_native_sessions_remain_in_the_same_conversation_without_implicit_spawn(self):
        graph = self.method()
        for node in graph['nodes']:
            node.pop('execution_driver')
        service = Conversations(self.engine)
        conversation = service.open(self.project['id'],graph,'codex',model='controlled-model')
        item = service.add(conversation['id'],'Historical native method')
        with patch('workflow_engine.runtime.subprocess.Popen',side_effect=AssertionError('Unexpected historical spawn')):
            current = dispatch(self.engine,item['run'])
        self.assertEqual(current['nodes']['A']['status'],'ready')
        self.assertEqual(current['nodes']['B']['status'],'ready')
        self.assertFalse(list(self.trace.iterdir()))

    def test_delegated_step_does_not_inherit_native_tools_or_silently_use_main_cli_defaults(self):
        graph = self.method()
        graph['nodes'][0]['required_capabilities'] = ['read','native-tools']
        checked = resolve_profiles(self.project,copy.deepcopy(graph))
        issues = preflight(checked,project=self.project,engine=self.engine,mode='native',provider='codex',model='controlled-model')
        self.assertTrue(any(issue.get('code')=='executor.capabilities-missing' and issue['node']=='A' for issue in issues))
        graph['nodes'][0].pop('required_capabilities')
        graph['defaults'].pop('model')
        checked = resolve_profiles(self.project,copy.deepcopy(graph))
        issues = preflight(checked,project=self.project,engine=self.engine,mode='native',provider='codex')
        self.assertTrue(any(issue.get('code')=='provider.model-required' for issue in issues))

    def test_native_coordinator_cannot_claim_a_distinct_worker_step(self):
        graph = self.method()
        service = Conversations(self.engine)
        conversation = service.open(self.project['id'],graph,'codex',model='controlled-model')
        item = service.add(conversation['id'],'Supplied texts')
        with self.assertRaisesRegex(ContractError,'agent distinct'):
            self.engine.claim(item['run'],'A',executor='native')
        self.assertEqual(self.engine.run(item['run'])['nodes']['A']['status'],'ready')

    def test_distinct_worker_does_not_offer_native_fallback_when_its_tools_are_unavailable(self):
        from workflow_engine.launch_readiness import LaunchReadiness
        graph = self.method()
        run = self.engine.start(self.project['id'],graph,simulation=True,driver='conversation')
        node = next(item for item in run['definition']['nodes'] if item['id']=='A')
        readiness = LaunchReadiness(self.engine,{'provider':'codex','model':'controlled-model','status':'open'})
        self.assertFalse(readiness._native_available(run,node,self.project))


if __name__=='__main__':
    unittest.main()

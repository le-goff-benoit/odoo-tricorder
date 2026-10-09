"""Targeted post-fix cross-project/effort/CLI controls, never a real model."""
import copy, json, os, sys, tempfile
from pathlib import Path
from unittest.mock import patch
root=Path(__file__).resolve().parents[3]
sys.path[:0]=[str(root/'backend'),str(root/'tests')]
from workflow_engine import Engine, ContractError
from workflow_engine.conversations import Conversations
from workflow_engine.packs import inspect_pack, install
from workflow_engine.schedules import Schedules
from native_cli_fixture import cli_directory
from workflow_cli import request as native
from studio import request

results={}
with tempfile.TemporaryDirectory(prefix='tricorder-path-receipt-') as t:
    e=Engine(Path(t)/'state'); a=e.create_project('Alpha'); b=e.create_project('Beta'); svc=Conversations(e)
    pack=Path(t)/'pack';pack.mkdir();(pack/'profile.md').write_text('Synthetic support profile')
    (pack/'tricorder-pack.json').write_text(json.dumps({'schema':1,'engine_schema':1,'id':'support-pack','version':'1','profiles':[{'id':'specialist','title':'Specialist','source':'profile.md'}]}))
    digest=inspect_pack(pack)['sha256'];install(e,a['id'],str(pack),digest)
    graph={'schema':1,'id':'support','title':'Support','defaults':{'provider':'codex','model':'fixture','effort':'medium'},'nodes':[{'id':'work','title':'Analysis','kind':'agent','profile':'specialist','validation':'contract'}],'edges':[]}
    folder=cli_directory(t)
    with patch.dict(os.environ,{'PATH':str(folder)+os.pathsep+os.environ['PATH']}), patch('studio.provider_defaults',return_value={'codex':'fixture','claude':'fixture'}):
        payload={'action':'workflow.validate','project':a['id'],'projects':[b['id']],'graph':graph,'mode':'native','provider':'codex'}
        before=copy.deepcopy(graph); checked=request(e,payload)
        missing=[v for v in checked['issues'] if v.get('code')=='profile.unavailable']
        assert missing and all(v['project']==b['id'] and v['project_title']=='Beta' for v in missing)
        try:request(e,{**payload,'action':'conversation.open'});raise AssertionError('Missing target pack allowed')
        except ContractError as exc:assert 'Beta' in str(exc)
        assert svc.list()==[] and graph==before
        results['secondary_project_diagnostic']=missing
        main_missing={'action':'workflow.validate','project':b['id'],'graph':graph}
        try:
            check=request(e,main_missing)
            results['automatic_main_missing_profile']={'issues':check['issues'],'exception':None}
        except ContractError as exc:
            results['automatic_main_missing_profile']={'issues':None,'exception':str(exc)}
        assert results['automatic_main_missing_profile']['exception'] is None
        assert any(v.get('code')=='profile.unavailable' and v.get('action')=='edit-node' for v in results['automatic_main_missing_profile']['issues'])
        partial=copy.deepcopy(graph)
        partial['nodes'].append({'id':'missing','title':'Missing specialist','kind':'agent','profile':'not-installed','validation':'contract'})
        problems=request(e,{'action':'workflow.validate','project':a['id'],'graph':partial})['issues']
        results['one_missing_profile_other_installed_profile']=problems
        assert len(problems)==1 and problems[0].get('code')=='profile.unavailable' and problems[0]['node']=='missing'
        for node in partial['nodes']:node.update(provider='codex',model='fixture')
        delegated_problems=request(e,{'action':'workflow.validate','project':a['id'],'graph':partial,'mode':'native','provider':'claude','model':'fixture'})['issues']
        assert len(delegated_problems)==1 and delegated_problems[0].get('code')=='profile.unavailable' and delegated_problems[0]['node']=='missing'
        for start in [lambda:e.start(a['id'],partial), lambda:Schedules(e).create(a['id'],partial,{'kind':'interval','minutes':5})]:
            try:start();raise AssertionError('Strict execution admitted missing profile')
            except ContractError as exc:assert 'Profil' in str(exc)
        results['partial_profiles_automatic_native_delegated_strict_start']='pass'
        install(e,b['id'],str(pack),digest)
        assert request(e,payload)['issues']==[]
        c=request(e,{**payload,'action':'conversation.open'})
        for p in (a,b):
            item=svc.add(c['id'],'Independent synthetic item',project=p['id'])
            assert e.run(item['run'])['project']==p['id']
        results['cross_project_repair_and_relaunch']='pass'
        for provider in ('codex','claude'):
            g=copy.deepcopy(graph);g['defaults']['provider']=provider;g['nodes'][0]['effort']='high'
            q={'action':'workflow.validate','project':a['id'],'graph':g,'provider':provider,'mode':'native'}
            codes=[v.get('code') for v in request(e,q)['issues']]
            assert 'provider.effort-mismatch' in codes
            try:request(e,{**q,'action':'conversation.open'});raise AssertionError('Effort mismatch allowed')
            except ContractError as exc:assert 'effort' in str(exc)
            g['nodes'][0]['effort']='medium'
            assert request(e,q)['issues']==[]
            aligned=request(e,{**q,'action':'conversation.open'});item=svc.add(aligned['id'],'Aligned effort')
            claim=native(e,aligned['id'],'claim',{'run':item['run'],'node':'work'})
            assert claim['node']['execution']['effort']=='medium'
            native(e,aligned['id'],'result',{'run':item['run'],'node':'work','token':claim['token'],'result':{'ok':True,'summary':'Protocol only'}})
            g['nodes'][0].update(model='other-fixture',effort='high')
            assert request(e,q)['issues']==[]
            delegated=request(e,{**q,'action':'conversation.open'});item=svc.add(delegated['id'],'Other model')
            try:native(e,delegated['id'],'claim',{'run':item['run'],'node':'work'});raise AssertionError('Model override substituted')
            except ContractError as exc:assert 'modèle' in str(exc)
            g['nodes'][0]['required_capabilities']=['shell']
            assert any(v.get('code')=='executor.capabilities-missing' for v in request(e,q)['issues'])
            results['effort_and_model_'+provider]='pass'
            inherited=copy.deepcopy(graph);inherited['defaults']={'provider':provider,'effort':'high'}
            inherited['nodes'][0]['effort']='high'
            with patch('studio.provider_defaults',return_value={}):
                native_default={'action':'workflow.validate','project':a['id'],'graph':inherited,'provider':provider,'mode':'native'}
                assert request(e,native_default)['issues']==[]
                configured=request(e,{**native_default,'action':'conversation.open'})
                results['native_provider_default_'+provider]={'model':configured['model'],'effort':configured['effort']}
        question={'schema':1,'id':'question','title':'Question','nodes':[{'id':'ask','kind':'question','title':'Clarify','question':'Which source?'}],'edges':[]}
        empty=Path(t)/'empty';empty.mkdir()
        with patch.dict(os.environ,{'PATH':str(empty)}):
            for provider in ('codex','claude'):
                q={'action':'workflow.validate','project':a['id'],'graph':question,'provider':provider,'mode':'native'}
                assert any(v.get('code')=='provider.cli-missing' for v in request(e,q)['issues'])
                try:request(e,{**q,'action':'conversation.open'});raise AssertionError('Missing native CLI allowed')
                except ContractError as exc:assert 'CLI' in str(exc)
                assert request(e,{**q,'mode':'automatic'})['issues']==[]
                run=request(e,{**q,'action':'run.start','mode':'automatic'})
                assert run['nodes']['ask']['status']=='waiting_input'
            results['no_cli_native_refused_automatic_question_allowed']='pass'
        assert not (e.store.directory/'jobs').exists()
        results['model_or_service_calls']=0
print(json.dumps(results,ensure_ascii=False,indent=2))

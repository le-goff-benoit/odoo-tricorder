"""Preparation before QA is allowed, QA itself retains exact context guards."""
import copy,json,os,sys,tempfile
from pathlib import Path
from unittest.mock import patch
root=Path(__file__).resolve().parents[3]
sys.path[:0]=[str(root/'backend'),str(root/'tests')]
from workflow_engine import Engine,ContractError
from workflow_engine.conversations import Conversations
from workflow_engine.packs import inspect_pack,install
from workflow_engine.schedules import Schedules
from native_cli_fixture import cli_directory
from workflow_cli import request as native
from studio import request

results={}
with tempfile.TemporaryDirectory(prefix='tricorder-path-qa-') as t:
    e=Engine(Path(t)/'state');a=e.create_project('Alpha QA');b=e.create_project('Beta QA')
    e.project_series(a['id'],'19.0',platform='custom');e.project_series(b['id'],'17.0',platform='custom')
    pack=Path(t)/'pack';pack.mkdir();(pack/'qa.md').write_text('Synthetic QA protocol, no real Odoo')
    (pack/'tricorder-pack.json').write_text(json.dumps({'schema':1,'engine_schema':1,'id':'qa-pack','version':'1','profiles':[{'id':'odoo-tester','title':'QA','source':'qa.md'}],'policies':{'domain':'odoo','series_required':True,'online_requires_studio':True,'qa_requires_local_copy':True}}))
    digest=inspect_pack(pack)['sha256']
    for p in (a,b):install(e,p['id'],str(pack),digest)
    g={'schema':1,'id':'qa','title':'Prepare then QA','domain':'odoo','defaults':{'provider':'codex','model':'fixture'},'nodes':[{'id':'intake','title':'Clarify request','kind':'agent','validation':'contract'},{'id':'qa','title':'Check local copy','kind':'agent','profile':'odoo-tester','validation':'contract'}],'edges':[{'id':'intake-qa','from':'intake','to':'qa'}]}
    folder=cli_directory(t)
    with patch.dict(os.environ,{'PATH':str(folder)+os.pathsep+os.environ['PATH']}):
        payload={'action':'workflow.validate','project':a['id'],'projects':[b['id']],'graph':g,'mode':'native','provider':'codex','model':'fixture'}
        checked=request(e,payload)
        assert checked['issues']==[]
        assert {(v['project'],v['code'],v['stage']) for v in checked['requirements']}=={(p['id'],'odoo.qa.local-copy-required','step') for p in (a,b)}
        c=request(e,{**payload,'action':'conversation.open','request':'Prepare local checks'})
        item=c['items'][0];first=e.run(item['run']);assert first['parameters']['series']=='19.0'
        claim=native(e,c['id'],'claim',{'run':first['id'],'node':'intake'})
        native(e,c['id'],'result',{'run':first['id'],'node':'intake','token':claim['token'],'result':{'ok':True,'summary':'Synthetic intake'}})
        for context in [None,{}, {'environment':'production','neutralized_copy':'fixture'}, {'environment':'local','neutralized_copy':' '}, {'environment':'local','neutralized_copy':False}]:
            if context is not None:
                try:native(e,c['id'],'context',{'run':first['id'],'node':'qa','context':context});raise AssertionError('Invalid QA context accepted')
                except ContractError:pass
            try:native(e,c['id'],'claim',{'run':first['id'],'node':'qa'});raise AssertionError('Unprepared QA started')
            except ContractError:pass
        copy_folder=Path(t)/'neutralized-fixture';copy_folder.mkdir()
        native(e,c['id'],'context',{'run':first['id'],'node':'qa','context':{'environment':'local','neutralized_copy':str(copy_folder)}})
        claim=native(e,c['id'],'claim',{'run':first['id'],'node':'qa'})
        assert claim['run']['nodes']['qa']['status']=='running'
        native(e,c['id'],'result',{'run':first['id'],'node':'qa','token':claim['token'],'result':{'ok':True,'summary':'Synthetic protocol only'}})
        beta=Conversations(e).add(c['id'],'Beta independent intake',project=b['id'])
        assert e.run(beta['run'])['parameters']['series']=='17.0'
        assert e.run(beta['run'])['nodes']['intake']['status']=='ready'
        assert g.get('parameters') is None
        results['deferred_only_until_QA_claim']='pass'
        results['per_target_series_and_missing_copy_requirement']='pass'
        for params,fields in [({'environment':'production'},{}),({'environment':'staging'},{'environment':'local'}),({'environment':'local','neutralized_copy':False},{}),({}, {'environment':'production'})]:
            bad=copy.deepcopy(g);bad['parameters']=params;bad['nodes'][1].update(fields)
            check=request(e,{**payload,'graph':bad})
            assert check['issues'] and not check['requirements']
            try:request(e,{**payload,'action':'conversation.open','graph':bad});raise AssertionError('Unsafe native context accepted')
            except ContractError:pass
        results['explicit_unsafe_context_blocks_launch']='pass'
        automatic=copy.deepcopy(g);automatic['parameters']={'series':'19.0'}
        check=request(e,{'action':'workflow.validate','project':a['id'],'graph':automatic})
        assert any(v.get('code')=='odoo.qa.local-copy-required' for v in check['issues']) and not check['requirements']
        for mode in ('automatic','native'):
            try:request(e,{'action':'run.start','project':a['id'],'graph':automatic,'mode':mode,'provider':'codex','model':'fixture'});raise AssertionError('Automatic launch bypassed QA')
            except ContractError:pass
        try:Schedules(e).create(a['id'],automatic,{'kind':'interval','minutes':5});raise AssertionError('Unprepared schedule allowed')
        except ContractError:pass
        results['automatic_and_schedule_guard_preserved']='pass'
        e.project_series(b['id'],'17.0',platform='online')
        check=request(e,payload)
        assert any(v.get('code')=='odoo.online-studio-required' and v['project']==b['id'] for v in check['issues'])
        try:request(e,{**payload,'action':'conversation.open'});raise AssertionError('Online route contradiction ignored')
        except ContractError as exc:assert 'Beta QA' in str(exc)
        results['secondary_online_context_blocks_launch']='pass'
        assert not (e.store.directory/'jobs').exists();results['model_or_service_calls']=0
print(json.dumps(results,ensure_ascii=False,indent=2))

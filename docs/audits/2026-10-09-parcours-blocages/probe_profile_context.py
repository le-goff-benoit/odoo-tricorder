"""A generic graph using an Odoo profile must inherit each target's context."""
import copy,json,os,sys,tempfile
from pathlib import Path
from unittest.mock import patch
root=Path(__file__).resolve().parents[3]
sys.path[:0]=[str(root/'backend'),str(root/'tests')]
from workflow_engine import Engine,ContractError
from workflow_engine.conversations import Conversations
from workflow_engine.packs import inspect_pack,install
from native_cli_fixture import cli_directory
from workflow_cli import request as native
from studio import request

results=[]
with tempfile.TemporaryDirectory(prefix='tricorder-profile-context-') as t:
    e=Engine(Path(t)/'state');a=e.create_project('Alpha 19');b=e.create_project('Beta 17')
    e.project_series(a['id'],'19.0',platform='custom');e.project_series(b['id'],'17.0',platform='custom')
    pack=Path(t)/'pack';pack.mkdir();(pack/'profile.md').write_text('Synthetic Odoo developer, no real Odoo work')
    (pack/'tricorder-pack.json').write_text(json.dumps({'schema':1,'engine_schema':1,'id':'odoo-synthetic','version':'1','profiles':[{'id':'odoo-developer','title':'Odoo developer','source':'profile.md'},{'id':'specialist','title':'Business specialist','source':'profile.md'}],'policies':{'domain':'odoo','series_required':True,'online_requires_studio':True}}))
    digest=inspect_pack(pack)['sha256']
    for p in (a,b):install(e,p['id'],str(pack),digest)
    graph={'schema':1,'id':'generic-with-profile','title':'Generic workflow with Odoo profile','parameters':{'series':'19.0','platform':'custom','route':'module'},'defaults':{'provider':'codex','model':'fixture'},'nodes':[{'id':'work','title':'Analyze implementation','kind':'agent','profile':'odoo-developer','validation':'contract'}],'edges':[]}
    folder=cli_directory(t)
    with patch.dict(os.environ,{'PATH':str(folder)+os.pathsep+os.environ['PATH']}):
        for platform in ('custom','online'):
            e.project_series(b['id'],'17.0',platform=platform)
            payload={'action':'workflow.validate','project':a['id'],'projects':[b['id']],'graph':graph,'mode':'native','provider':'codex','model':'fixture'}
            preview=request(e,payload)
            row={'graph_has_domain':'domain' in graph,'target_series':'17.0','target_platform':platform,'preview_issues':preview['issues']}
            try:
                c=request(e,{**payload,'action':'conversation.open'})
                item=Conversations(e).add(c['id'],'Synthetic Beta request',project=b['id'])
                run=e.run(item['run'])
                row.update(conversation_opened=True,effective_series=run['parameters'].get('series'),effective_platform=run['parameters'].get('platform'))
                try:
                    claim=native(e,c['id'],'claim',{'run':run['id'],'node':'work'})
                    row['odoo_developer_claimed']=True
                    native(e,c['id'],'result',{'run':run['id'],'node':'work','token':claim['token'],'result':{'ok':True,'summary':'Synthetic protocol; no module or Odoo operation executed'}})
                except ContractError as exc:
                    row.update(odoo_developer_claimed=False,claim_error=str(exc))
            except ContractError as exc:
                row.update(conversation_opened=False,launch_error=str(exc))
            results.append(row)
        explicit=copy.deepcopy(graph);explicit['domain']='odoo'
        preview=request(e,{**payload,'graph':explicit})
        results.append({'control':'Same graph with explicit domain=odoo','preview_issues':preview['issues']})
        alias=copy.deepcopy(graph);alias['nodes'][0]['profile']='specialist'
        alias_preview=request(e,{**payload,'graph':alias})
        alias_row={'case':'Odoo pack profile without an odoo- prefix','profile':'specialist','target_series':'17.0','target_platform':'online','preview_issues':alias_preview['issues']}
        try:
            conversation=request(e,{**payload,'graph':alias,'action':'conversation.open'})
            item=Conversations(e).add(conversation['id'],'Synthetic arbitrary profile',project=b['id'])
            run=e.run(item['run'])
            alias_row.update(conversation_opened=True,effective_series=run['parameters'].get('series'),effective_platform=run['parameters'].get('platform'))
        except ContractError as exc:alias_row.update(conversation_opened=False,launch_error=str(exc))
        alias['domain']='odoo'
        alias_row['explicit_domain_control_issues']=request(e,{**payload,'graph':alias})['issues']
        results.append(alias_row)
        inherited=copy.deepcopy(graph);inherited['defaults']['profile']='specialist';inherited['nodes'][0].pop('profile')
        results.append({'case':'Odoo profile inherited from workflow defaults','preview_issues':request(e,{**payload,'graph':inherited})['issues']})
        generic=copy.deepcopy(inherited);generic['nodes'][0]['profile']='generalist';generic['parameters']={'purpose':'Meeting minutes'}
        generic_preview=request(e,{**payload,'graph':generic})
        generic_c=request(e,{**payload,'graph':generic,'action':'conversation.open'})
        generic_item=Conversations(e).add(generic_c['id'],'Independent generic task',project=b['id'])
        generic_run=e.run(generic_item['run'])
        results.append({'case':'Generic node overrides inherited profile; Odoo pack merely installed','preview_issues':generic_preview['issues'],'effective_series':generic_run['parameters'].get('series'),'effective_platform':generic_run['parameters'].get('platform'),'purpose':generic_run['parameters'].get('purpose')})
        studio_alias=copy.deepcopy(graph);studio_alias['nodes'][0]['profile']='specialist';studio_alias['parameters']['route']='studio'
        studio_preview=request(e,{**payload,'graph':studio_alias})
        studio_c=request(e,{**payload,'graph':studio_alias,'action':'conversation.open'})
        studio_item=Conversations(e).add(studio_c['id'],'Synthetic Studio-compatible request',project=b['id'])
        studio_run=e.run(studio_item['run'])
        results.append({'case':'Alias profile with Studio route','preview_issues':studio_preview['issues'],'effective_series':studio_run['parameters'].get('series'),'effective_platform':studio_run['parameters'].get('platform')})
        assert not (e.store.directory/'jobs').exists()
if '--assert-corrected' in sys.argv:
    assert results[0]['effective_series']=='17.0' and results[0]['effective_platform']=='custom'
    assert results[1]['conversation_opened'] is False and any(v.get('code')=='odoo.online-module-forbidden' for v in results[1]['preview_issues'])
    alias=next(r for r in results if r.get('case')=='Odoo pack profile without an odoo- prefix')
    assert alias['conversation_opened'] is False and any(v.get('code')=='odoo.online-studio-required' for v in alias['preview_issues'])
    inherited=next(r for r in results if r.get('case')=='Odoo profile inherited from workflow defaults')
    assert any(v.get('code')=='odoo.online-studio-required' for v in inherited['preview_issues'])
    generic=next(r for r in results if r.get('case','').startswith('Generic node overrides'))
    assert generic['preview_issues']==[] and generic['effective_series'] is None and generic['effective_platform'] is None and generic['purpose']=='Meeting minutes'
    studio_alias=results[-1]
    assert studio_alias['preview_issues']==[] and studio_alias['effective_series']=='17.0' and studio_alias['effective_platform']=='online'
print(json.dumps({'cases':results,'model_or_service_calls':0},ensure_ascii=False,indent=2))

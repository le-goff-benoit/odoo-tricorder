"""Independent contract controls for real templates; all results synthetic."""
import copy, json, os, sys, tempfile
from pathlib import Path
from unittest.mock import patch
root=Path(__file__).resolve().parents[3]
sys.path[:0]=[str(root/'backend'),str(root/'tests')]
from workflow_engine import Engine, ContractError
from workflow_engine.conversations import Conversations, answer, ask
from workflow_engine.work_templates import templates
from workflow_engine.schedules import Schedules
from native_cli_fixture import cli_directory
from workflow_cli import request as native
from studio import request

results={}
with tempfile.TemporaryDirectory(prefix='tricorder-path-controls-') as t:
    e=Engine(Path(t)/'state'); p=e.create_project('Synthetic templates'); svc=Conversations(e)
    definitions={g['id'].split('-')[0]:g for g in templates()}
    folder=cli_directory(t)
    with patch.dict(os.environ,{'PATH':str(folder)+os.pathsep+os.environ['PATH']}):
        for key,g in definitions.items():
            g['defaults']={'provider':'codex','model':'fixture'}
            valid=request(e,{'action':'workflow.validate','project':p['id'],'graph':g,'mode':'native','provider':'codex','model':'fixture'})
            assert not valid['issues'],(key,valid)
        results['all_five_templates_native_preflight']='pass'
        def open_item(key):
            c=svc.open(p['id'],definitions[key],'codex',model='fixture')
            return c,svc.add(c['id'],'Synthetic '+key)
        def finish(c,i,n,outputs):
            claim=native(e,c['id'],'claim',{'run':i['run'],'node':n})
            return native(e,c['id'],'result',{'run':i['run'],'node':n,'token':claim['token'],'result':{'ok':True,'summary':'Synthetic protocol result','outputs':outputs}})
        def reply(i,n,text):
            state=e.run(i['run'])['nodes'][n]
            return answer(e,i['run'],n,state['question']['id'],text)
        def reject(i,n):
            state=e.run(i['run'])['nodes'][n]
            return e.decide(i['run'],n,state['nonce'],state['proposal'],'reject',human=True)

        c,i=open_item('support')
        finish(c,i,'diagnosis',{'severity':'unknown','finding':'Missing impact','next_action':'Ask'})
        assert e.run(i['run'])['nodes']['clarify']['status']=='waiting_input'
        reply(i,'clarify','One user, no data lost')
        finish(c,i,'reassess',{'severity':'normal','finding':'One user','next_action':'Draft response'})
        run=finish(c,i,'normal',{'draft':'Synthetic draft, not sent'})
        assert run['status']=='completed' and run['nodes']['urgent']['status']=='skipped'
        results['support_unknown_then_normal']='pass'

        c,i=open_item('express'); downstream=svc.add(c['id'],'Dependent work',depends_on=[i['id']])
        finish(c,i,'qualify',{'eligibility':'broader','scope':'Accounting change is excluded'})
        run=reply(i,'reframe','Open a full analysis')
        assert run['status']=='completed' and run['completion_outcome']=='blocked'
        assert run['nodes']['fix']['status']=='skipped'
        svc.snapshot(c['id'])
        assert e.run(downstream['run'])['status']=='paused'
        try:e.control(downstream['run'],'resume');raise AssertionError('Released blocked dependency')
        except ContractError:pass
        results['express_reframe_and_dependency_guard']='pass'

        c,i=open_item('release')
        finish(c,i,'intent',{'intent':'Synthetic request'});finish(c,i,'plan',{'plan':'Synthetic plan'})
        run=reject(i,'scope')
        assert run['completion_outcome']=='rejected' and run['nodes']['work']['status']=='skipped'
        results['release_rejected_plan_stops_work']='pass'

        c,i=open_item('meeting')
        finish(c,i,'review',{'minutes':'Synthetic minutes','actions':[]})
        run=reject(i,'approve')
        assert run['completion_outcome']=='rejected' and run['nodes']['mail']['status']=='skipped'
        results['meeting_rejected_minutes_stop_draft']='pass'

        c,i=open_item('request')
        other=svc.add(c['id'],'Independent request')
        claim=native(e,c['id'],'claim',{'run':i['run'],'node':'clarify'})
        run=ask(e,i['run'],'clarify',claim['token'],'What source?')
        qid=run['nodes']['clarify']['question']['id']; e.control(i['run'],'cancel')
        try:answer(e,i['run'],'clarify',qid,'Late answer');raise AssertionError('Cancelled question answered')
        except ContractError:pass
        assert e.run(other['run'])['nodes']['clarify']['status']=='ready'
        results['generic_cancel_refuses_stale_answer_and_preserves_independent_request']='pass'

        try:Schedules(e).create(p['id'],definitions['request'],{'kind':'interval','minutes':5});raise AssertionError('Scheduled native-tools automatically')
        except ContractError as exc:assert 'native-tools' in str(exc),str(exc)
        results['native_tools_schedule_blocked']='pass'
        assert not (e.store.directory/'jobs').exists()
        results['model_or_service_calls']=0
print(json.dumps(results,ensure_ascii=False,indent=2))

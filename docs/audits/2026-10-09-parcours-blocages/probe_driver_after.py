"""Post-fix native history -> portable -> actual local document workers."""
import copy, json, os, subprocess, sys, tempfile, time
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
root=Path(__file__).resolve().parents[3]
sys.path[:0]=[str(root/'backend'),str(root/'tests')]
from workflow_engine import Engine, ContractError
from workflow_engine.conversations import Conversations
from workflow_engine.portable import export, import_definition
from workflow_engine.runtime import dispatch
from workflow_engine.engine import run_driver
from workflow_engine.schedules import Schedules
from native_cli_fixture import cli_directory
from studio import request

results={};workers=[]; real_popen=subprocess.Popen
def tracked(*args,**kwargs):
    process=real_popen(*args,**kwargs);workers.append(process);return process
with tempfile.TemporaryDirectory(prefix='tricorder-path-driver-after-') as t:
    e=Engine(Path(t)/'state');p=e.create_project('Synthetic document');folder=cli_directory(t)
    graph={'schema':1,'id':'minutes','title':'Meeting minutes','nodes':[{'id':'draft','title':'Prepare minutes','kind':'document','content':'Synthetic review minutes','validation':'contract'},{'id':'gate','title':'Receive minutes','kind':'decision'}],'edges':[{'id':'draft-gate','from':'draft','to':'gate'}]}
    def finished(run):
        deadline=time.monotonic()+5
        while time.monotonic()<deadline:
            current=e.run(run['id'])
            if current['nodes']['draft']['status'] not in {'ready','running'}:break
            time.sleep(.02)
        assert current['nodes']['draft']['status']=='accepted',current
        assert current['nodes']['gate']['status']=='waiting',current
        evidence=current['nodes']['draft']['result']['evidence'][0]
        assert e.evidence(evidence)==b'Synthetic review minutes'
        return current
    with patch.dict(os.environ,{'PATH':str(folder)+os.pathsep+os.environ['PATH']}):
        c=Conversations(e).open(p['id'],graph,'codex');item=Conversations(e).add(c['id'],'Prepare document')
        native=e.run(item['run'])
        assert native['driver']=='conversation' and 'driver' not in native['original'] and 'driver' not in native['definition']
        assert dispatch(e,native['id'])['nodes']['draft']['status']=='ready'
        claim=e.claim(native['id'],'draft')
        run=e.submit(native['id'],'draft',claim['token'],{'ok':True,'summary':'Synthetic native work'})
        gate=run['nodes']['gate'];e.decide(run['id'],'gate',gate['nonce'],gate['proposal'],'approve',human=True)
        frozen=e.run(run['id'])
        bundle=export({**frozen['original'],'driver':'conversation'}, {})
        assert 'driver' not in bundle['workflow']
        bundle['workflow']['driver']='conversation'
        imported=import_definition(e,p['id'],bundle)
        assert 'driver' not in imported
        assert request(e,{'action':'workflow.validate','project':p['id'],'graph':imported})['issues']==[]
        with patch('workflow_engine.runtime.subprocess.Popen',side_effect=tracked):
            try:
                automatic=finished(request(e,{'action':'run.start','project':p['id'],'graph':imported}))
                assert automatic['driver']=='automatic' and 'conversation' not in automatic['parameters']
                assert automatic['nodes']['gate']['nonce']!=gate['nonce']
                scheduler=Schedules(e);scheduler.create(p['id'],imported,{'kind':'interval','minutes':5},now=0)
                occurrence=scheduler.tick(now=301)[0];scheduled=finished(dispatch(e,occurrence['id']))
                assert scheduled['driver']=='automatic' and 'conversation' not in scheduled['parameters']
                assert e.run(frozen['id'])==frozen
            finally:
                for process in workers:process.wait(timeout=5)
        legacy={**graph,'driver':'conversation'}
        checked=request(e,{'action':'workflow.validate','project':p['id'],'graph':legacy})
        assert any(v.get('code')=='workflow.runtime-context' for v in checked['issues'])
        try:Schedules(e).create(p['id'],legacy,{'kind':'interval','minutes':5});raise AssertionError('Legacy stalled schedule allowed')
        except ContractError:pass
        repaired=e.save(p['id'],legacy)
        assert 'driver' not in repaired and legacy['driver']=='conversation'
        historical=copy.deepcopy(frozen);historical.pop('driver');historical['definition']['driver']='conversation';historical['status']='active';historical['nodes']['draft']['status']='ready'
        prior=copy.deepcopy(historical)
        with patch('workflow_engine.runtime.subprocess.Popen',side_effect=AssertionError('Historical native dispatched')):
            assert run_driver(historical)=='conversation'
            assert dispatch(SimpleNamespace(run=lambda rid:historical),historical['id'])==prior
        results.update(native_runtime_separate=True,legacy_portable_sanitized=True,automatic_document_received=True,scheduled_document_received=True,historical_run_unchanged=True,historical_native_not_dispatched=True,new_human_decision_required=True,workers_finished=sum('--worker' in process.args for process in workers),model_or_service_calls=0)
print(json.dumps(results,ensure_ascii=False,indent=2))

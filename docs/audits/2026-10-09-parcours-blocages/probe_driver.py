"""Native run reused as an automatic definition; synthetic state only."""
import json,sys,tempfile,os
from pathlib import Path
from unittest.mock import patch
root=Path(__file__).resolve().parents[3]
sys.path[:0]=[str(root/'backend'),str(root/'tests')]
from workflow_engine import Engine
from workflow_engine.conversations import Conversations
from workflow_engine.portable import export,import_definition
from workflow_engine.runtime import dispatch
from workflow_engine.schedules import Schedules
from native_cli_fixture import cli_directory
from studio import request
with tempfile.TemporaryDirectory(prefix='tricorder-path-driver-') as t:
 e=Engine(t);p=e.create_project('Synthetic meeting');folder=cli_directory(t)
 with patch.dict(os.environ,{'PATH':str(folder)+os.pathsep+os.environ['PATH']}):
  graph={'schema':1,'id':'meeting','title':'Meeting sample','defaults':{'provider':'codex','model':'fixture'},'nodes':[{'id':'review','title':'Prepare minutes','kind':'agent','validation':'contract','outputs':{'minutes':'string'}}],'edges':[]}
  original=e.save(p['id'],graph);svc=Conversations(e);c=svc.open(p['id'],original,'codex');item=svc.add(c['id'],'Prepare these minutes')
  saved_run=e.run(item['run']);editor_graph=saved_run['original']
  bundle=export(editor_graph,{},e.project(p['id'])['defaults']);imported=import_definition(e,p['id'],bundle)
  validation=request(e,{'action':'workflow.validate','project':p['id'],'graph':imported})
  automatic=request(e,{'action':'run.start','project':p['id'],'graph':imported},human=True)
  dispatched=dispatch(e,automatic['id'])
  schedule=Schedules(e).create(p['id'],imported,{'kind':'interval','minutes':5},now=0)
  occurrence=Schedules(e).tick(now=301)[0];scheduled=dispatch(e,occurrence['id'])
  print(json.dumps({'run_original_driver':editor_graph.get('driver'),'portable_driver':imported.get('driver'),'automatic_validation_issues':validation['issues'],'automatic_status':dispatched['nodes']['review']['status'],'automatic_has_conversation':'conversation' in dispatched['parameters'],'schedule_status':scheduled['nodes']['review']['status'],'schedule_has_conversation':'conversation' in scheduled['parameters'],'jobs_created':(e.store.directory/'jobs').exists()},ensure_ascii=False,indent=2))

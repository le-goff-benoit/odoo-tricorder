import sys,tempfile,json
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0,sys.argv[1])
from workflow_engine import Engine
from workflow_engine.iterations import activate
from workflow_engine.runtime import dispatch
from workflow_engine.contracts import ContractError
with tempfile.TemporaryDirectory(prefix='tricorder-support-race-probe-') as directory:
 e=Engine(directory);p=e.create_project('Diagnostic isolé du banc support')
 obj={'type':'object','required':True};items={'type':'array','items':'object','required':True,'minItems':0,'maxItems':10}
 g={'schema':2,'id':'probe','title':'Support','nodes':[{'id':'each','kind':'foreach','title':'Tickets','inputs':{'items':items},'outputs':{'results':items,'contributions':items},'collection':'items','concurrency':3,'workflow':{'schema':2,'id':'child','title':'Ticket','nodes':[{'id':'work','kind':'task','title':'Constat','inputs':{'item':obj},'outputs':{'constat':{'type':'string','required':True}},'validation':'contract','max_attempts':2}],'edges':[]}}],'edges':[]}
 r=e.start(p['id'],g,simulation=True,driver='conversation',initial_inputs={'each':{'items':[{'id':'done'},{'id':'question'},{'id':'failed'}]}})
 r=activate(e,r['id'],'each');children=[m['run'] for m in r['nodes']['each']['children']]
 ready=[e.run(cid)['nodes']['work']['status'] for cid in children]
 # Exact dispatch and durable claim logic, but deliberately held worker spawn;
 # no process, service or user state is touched.
 with patch('workflow_engine.runtime.subprocess.Popen',return_value=SimpleNamespace(pid=999999999)) as spawned:
  for cid in children:dispatch(e,cid)
  running=[e.run(cid)['nodes']['work']['status'] for cid in children]
  try:e.claim(children[0],'work')
  except ContractError as error:refusal=str(error)
  else:raise AssertionError('The fixture unexpectedly stole a managed claim')
  before=[e.run(cid) for cid in children]
  for cid in children:dispatch(e,cid)
  assert [e.run(cid) for cid in children]==before
  assert spawned.call_count==3
 print(json.dumps({'parent_driver':r['driver'],'children_drivers':[e.run(cid)['driver'] for cid in children],'before_dispatch':ready,'after_dispatch':running,'attempts':[e.run(cid)['nodes']['work']['attempt'] for cid in children],'worker_reservations':3,'fixture_claim_refused':refusal,'repeat_dispatch_no_extra_worker_or_state_change':True},ensure_ascii=False,indent=2))

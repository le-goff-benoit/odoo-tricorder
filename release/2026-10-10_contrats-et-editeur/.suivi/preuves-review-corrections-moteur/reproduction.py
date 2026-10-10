import sys,json,copy,hashlib,traceback
from pathlib import Path
from contextlib import contextmanager
from unittest.mock import patch
sys.path[:0]=['/home/blegoff/odoo-tricorder/tests','/home/blegoff/odoo-tricorder/backend']
from test_iteration_notifications import IterationNotificationTests
from test_orchestration_projections import OrchestrationProjectionTests
import test_associated_actions as base
from workflow_engine import Engine,ContractError
from workflow_engine.contracts import digest
from workflow_engine.iterations import activate
from workflow_engine.conversations import Conversations,ask,answer
from workflow_engine.associated_actions import activate as activate_action
from workflow_engine.projections import run_page,run_detail,conversation_activity
from workflow_engine.schedules import Schedules
from connectors.local_tools import inspect,qualify
from studio import request
results=[]
@contextmanager
def fixture(cls=IterationNotificationTests):
 f=cls();f.setUp()
 try:yield f
 finally:f.doCleanups()
def reject(fn,phrase):
 try:fn()
 except ContractError as e:
  assert phrase in str(e),(phrase,str(e));return str(e)
 raise AssertionError('Operation unexpectedly accepted')
def manifest_change(f):
 p=Path(f.project['path'])/'.tricorder/plugins.json'; data=json.loads(p.read_text());data['plugins'][0]['title']+=' (changed during enrollment)';p.write_text(json.dumps(data))
def case(name,fn):
 if len(sys.argv)>1 and name not in sys.argv[1:]:return
 try:results.append({'case':name,'ok':True,'evidence':fn()})
 except Exception as e:results.append({'case':name,'ok':False,'error':str(e),'trace':traceback.format_exc()})
def effect_compatibility():
 with fixture() as f:
  records={}
  for kind,operation,expected in [('document','lookup',0),('document','publish',1),('document','send',1)]:
   child=base.graph(base.doc(capabilities=[{'plugin':'fixture','operation':operation}]),identifier='child')
   preview=request(f.engine,{'action':'workflow.validate','project':f.project['id'],'graph':f.graph(child)})
   issues=preview['issues'];assert len(issues)==expected,issues
   if expected:assert issues[0]['node']=='each' and issues[0]['child_node']=='work',issues
   records[operation]={'issues':len(issues),'message':issues[0]['message'] if issues else ''}
  child=base.graph(base.doc(),identifier='child',on_question={'plugin':'fixture','operation':'lookup','recipient':'synthetic-only'})
  preview=request(f.engine,{'action':'workflow.validate','project':f.project['id'],'graph':f.graph(child)})
  assert len(preview['issues'])==1,preview['issues']
  assert 'notification de question exige' in preview['issues'][0]['message'],preview
  records['bad_on_question']=preview['issues'][0]['message']
  assert not (f.fixture.root/'calls.jsonl').exists()
  return records
case('read-write-notify-child-preflight',effect_compatibility)
def valid_external():
 with fixture() as f:
  op={'action':'publish','target':'synthetic','candidate':'exact'}
  child=base.graph({'id':'gate','kind':'decision','title':'Validate','operation':op},{'id':'publish','kind':'external','title':'Publish','approval':'gate','operation':op,'capabilities':[{'plugin':'fixture','operation':'publish'}]},identifier='publisher')
  child['edges']=[{'id':'approved','from':'gate','to':'publish','outcome':'approve'}]
  g=f.graph(child);p=request(f.engine,{'action':'workflow.validate','project':f.project['id'],'graph':g});assert p['issues']==[] and p['notifications']==[],p
  r=f.ready(f.engine.start(f.project['id'],g));r=activate(f.engine,r['id'],'each');c=f.engine.run(r['nodes']['each']['children'][0]['run'])
  assert c['nodes']['gate']['status']=='waiting' and c['nodes']['publish']['status']=='pending',c
  rejection=reject(lambda:f.engine.claim(c['id'],'publish'),'prêt')
  assert not (f.fixture.root/'calls.jsonl').exists()
  return {'preview_notifications':0,'child_external':'pending','claim_refused':rejection}
case('write-child-retains-exact-human-gate',valid_external)
def midflight_change():
 with fixture() as f:
  r=f.ready(f.engine.start(f.project['id'],f.graph(),notifications_authorized=True),[{'id':'one'},{'id':'two'}]); before=f.engine.events(r['id']); oldstart=f.engine.start;made=[]
  def start(*args,**kw):
   child=oldstart(*args,**kw)
   if kw.get('parent'):
    made.append(child['id'])
    if len(made)==1:manifest_change(f)
   return child
  with patch.object(f.engine,'start',side_effect=start):err=reject(lambda:activate(f.engine,r['id'],'each'),'modifié')
  assert len(made)==1,made
  assert len(f.engine.runs(f.project['id']))==1
  assert f.engine.events(r['id'])==before
  current=f.engine.run(r['id']);assert current['nodes']['each']['status']=='ready' and 'enrollment' not in current['nodes']['each'],current
  assert not (f.fixture.root/'calls.jsonl').exists()
  return {'first_child_created_inside_uncommitted_transaction':len(made),'children_persisted':0,'parent_events_unchanged':True,'error':err}
case('manifest-changed-after-first-child-rolls-back-whole-family',midflight_change)
def optional_scope():
 with fixture() as f:
  other=f.engine.create_project('Other synthetic project')
  main=base.graph(base.doc(validation='contract'),identifier='principal',defaults={'provider':'codex','model':'synthetic'},actions=[base.associated(f.graph(base.graph(base.doc(),identifier='leaf')))])
  svc=Conversations(f.engine);cv=svc.open(f.project['id'],main,'codex',[other['id']]);item=svc.add(cv['id'],'Main result')
  c=f.engine.claim(item['run'],'work');r=f.engine.submit(item['run'],'work',c['token'],{'ok':True,'summary':'Done'})
  r=activate_action(f.engine,r['id'],r['associated_actions'][0]['id'],human=True);a=f.ready(f.engine.run(r['associated_actions'][0]['run']),[{'id':'local'},{'id':'remote','project':other['id']}])
  err=reject(lambda:activate(f.engine,a['id'],'each'),'hors du périmètre')
  assert len(f.engine.runs(f.project['id']))==2 and len(f.engine.runs(other['id']))==0
  assert f.engine.run(a['id'])['nodes']['each']['status']=='ready'
  return {'error':err,'local_children':0,'remote_children':0,'main_status':f.engine.run(r['id'])['status']}
case('optional-action-does-not-inherit-conversation-other-projects',optional_scope)
def notification_then_change():
 with fixture() as f:
  leaf=base.graph(base.doc(),identifier='child',on_question={'plugin':'fixture','operation':'send','recipient':'synthetic-only'})
  g=f.graph(leaf);preview=request(f.engine,{'action':'workflow.validate','project':f.project['id'],'graph':g});assert preview['issues']==[] and len(preview['notifications'])==1
  r=f.ready(f.engine.start(f.project['id'],g,notifications_authorized=True));r=activate(f.engine,r['id'],'each');rid=r['nodes']['each']['children'][0]['run'];c=f.engine.claim(rid,'work');f.change_connection(f.project)
  child=ask(f.engine,rid,'work',c['token'],'Question deliberately retained')
  q=child['nodes']['work']['question'];assert child['nodes']['work']['status']=='waiting_input' and q['notification']['status']=='blocked',q
  assert len(f.engine.runs(f.project['id']))==2
  answer(f.engine,rid,'work',q['id'],'Answer retained')
  reject(lambda:answer(f.engine,rid,'work',q['id'],'Stale'),'périmée')
  assert not (f.fixture.root/'calls.jsonl').exists()
  return {'question_retained':True,'notification':q['notification'],'stale_answer_refused':True,'notification_child_created':False}
case('child-on-question-connection-change-keeps-question-blocks-notify',notification_then_change)
def scheduled_change():
 with fixture() as f:
  svc=Schedules(f.engine);s=svc.create(f.project['id'],f.graph(),{'kind':'interval','minutes':5},notifications_authorized=True,now=1000)
  f.change_connection(f.project);out=svc.tick(now=1301);s=svc.list()[0]
  assert out==[] and s['enabled'] is False and s['last_status']=='blocked',s
  assert f.engine.runs(f.project['id'])==[] and not (f.fixture.root/'calls.jsonl').exists()
  return {'schedule_status':s['last_status'],'error':s['error'],'runs':0}
case('scheduled-child-transport-change-blocks-before-start',scheduled_change)
def projections_restart():
 with fixture(OrchestrationProjectionTests) as f:
  cid,parent=f.family(count=35,dependencies={34:['R0']});members=parent['nodes']['each']['children'];rid=members[0]['run'];c=f.engine.claim(rid,'work')
  f.engine.submit(rid,'work',c['token'],{'ok':True,'summary':'Large result','outputs':{'text':'INDEPENDENT_LARGE_MARKER_'*50000}})
  e=Engine(f.root/'state');p=e.run(parent['id']);before_runs={r['id']:r for r in e.runs(f.project['id'])};before_events={rid:e.events(rid) for rid in before_runs};before_artifacts={str(p):p.stat().st_size for p in (e.store.directory/'artifacts').glob('*')}
  with patch.object(e,'_save',side_effect=AssertionError('Read attempted state save')),patch.object(e,'_event',side_effect=AssertionError('Read attempted event')):
   pages=[run_page(e,offset=i,limit=7) for i in range(0,36,7)];details=run_detail(e,p);activity=conversation_activity(e,cid)
  ids=[i['id'] for page in pages for i in page['items']];assert len(ids)==len(set(ids))==36
  assert all(page['family_counts']=={'requests':1,'tasks':35,'actions':0} for page in pages)
  children=[i for page in pages for i in page['items'] if i['parent']]
  assert all(i['origin']['run']==p['id'] and i['origin']['title']=='One business request' for i in children)
  wire=json.dumps({'pages':pages,'detail':details,'activity':activity});assert 'INDEPENDENT_LARGE_MARKER_' not in wire and len(wire)<200000,len(wire)
  assert {r['id']:r for r in e.runs(f.project['id'])}==before_runs
  assert all(e.events(rid)==events for rid,events in before_events.items())
  assert {str(p):p.stat().st_size for p in (e.store.directory/'artifacts').glob('*')}==before_artifacts
  return {'runs':len(ids),'page_size':7,'payload_bytes':len(wire.encode()),'source_result_bytes':len('INDEPENDENT_LARGE_MARKER_'*50000),'durable_origins':len(children),'state_events_unchanged':True,'artifacts_unchanged':True}
case('restart-family-pagination-bounded-readonly',projections_restart)
def notification_ancestor_pause():
 with fixture() as f:
  leaf=base.graph({'id':'question','kind':'question','title':'Confirm recipient','question':'Who reviews?'},identifier='leaf',on_question={'plugin':'fixture','operation':'send','recipient':'synthetic-only'})
  action=f.graph(leaf)
  main=base.graph(base.doc(validation='contract'),{'id':'hold','kind':'question','title':'Keep main open','question':'Continue?'},identifier='main-open',actions=[base.associated(action)])
  r=f.engine.start(f.project['id'],main);claim=f.engine.claim(r['id'],'work');r=f.engine.submit(r['id'],'work',claim['token'],{'ok':True,'summary':'Main result ready'})
  r=activate_action(f.engine,r['id'],r['associated_actions'][0]['id'],human=True)
  a=f.ready(f.engine.run(r['associated_actions'][0]['run']));a=activate(f.engine,a['id'],'each')
  leafrun=f.engine.run(a['nodes']['each']['children'][0]['run']);q=leafrun['nodes']['question']['question'];assert q['notification']['status']=='queued',q
  note=f.engine.run(q['notification']['run']);f.engine.control(r['id'],'pause')
  from workflow_engine.associated_actions import check_current
  accepted=[]
  try:
   claim=f.engine.claim(note['id'],'question-notification');accepted.append('claim')
   check_current(f.engine,note);accepted.append('effect_guard')
  except ContractError as err:
   first_error=str(err)
   assert accepted==[],accepted
   f.engine.control(r['id'],'resume');f.engine.claim(note['id'],'question-notification');check_current(f.engine,note)
   f.engine.control(r['id'],'pause');effect_error=reject(lambda:check_current(f.engine,note),'suspendue')
   f.engine.control(r['id'],'resume');check_current(f.engine,note)
   f.engine.control(r['id'],'cancel');cancel_error=reject(lambda:check_current(f.engine,note),'annulée')
   assert not (f.fixture.root/'calls.jsonl').exists()
   return {'blocked':True,'reason':first_error,'accepted_before_rejection':accepted,'pause_after_claim_refused':effect_error,'resume_authorized':True,'cancel_refused':cancel_error,'external_calls':False}
  evidence={'main':f.engine.run(r['id'])['status'],'action':f.engine.run(a['id'])['status'],'leaf':f.engine.run(leafrun['id'])['status'],'notification':f.engine.run(note['id'])['nodes']['question-notification']['status'],'unexpectedly_accepted':accepted,'external_calls':(f.fixture.root/'calls.jsonl').exists()}
  raise AssertionError(json.dumps(evidence))
case('notification-of-optional-grandchild-respects-main-pause',notification_ancestor_pause)

def notification_completed_main():
 with fixture() as f:
  leaf=base.graph({'id':'question','kind':'question','title':'Confirm recipient','question':'Who reviews?'},identifier='leaf',on_question={'plugin':'fixture','operation':'send','recipient':'synthetic-only'})
  action=f.graph(leaf)
  main=base.graph(base.doc(validation='contract'),identifier='main-done',actions=[base.associated(action)])
  r=f.engine.start(f.project['id'],main);claim=f.engine.claim(r['id'],'work');r=f.engine.submit(r['id'],'work',claim['token'],{'ok':True,'summary':'Main result ready'})
  assert r['status']=='completed'
  r=activate_action(f.engine,r['id'],r['associated_actions'][0]['id'],human=True)
  a=f.ready(f.engine.run(r['associated_actions'][0]['run']));a=activate(f.engine,a['id'],'each')
  leafrun=f.engine.run(a['nodes']['each']['children'][0]['run']);q=leafrun['nodes']['question']['question'];assert q['notification']['status']=='queued',q
  note=f.engine.run(q['notification']['run']);f.engine.claim(note['id'],'question-notification')
  from workflow_engine.associated_actions import check_current
  check_current(f.engine,note)
  answer(f.engine,leafrun['id'],'question',q['id'],'Question solved before notification')
  err=reject(lambda:check_current(f.engine,note),'obsolète')
  assert not (f.fixture.root/'calls.jsonl').exists()
  return {'main_completed_action_notification_permitted':True,'stale_notification_blocked':True,'stale_reason':err}
case('completed-main-allows-current-optional-question-notification',notification_completed_main)

Path('/tmp/tricorder-review-panel-corrections.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False,indent=2))
sys.exit(any(not r['ok'] for r in results))

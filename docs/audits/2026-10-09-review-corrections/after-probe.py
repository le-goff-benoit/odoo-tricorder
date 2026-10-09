"""Independent reception of R01-R05; every file/run is synthetic and temporary."""
import json,sys,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'backend'))
from workflow_engine import Engine,ContractError
from workflow_engine.conversations import Conversations,ask
from workflow_engine.projections import summary
from connectors.candidates import prepare,capture,apply
from workflow_cli import request as native
from workflow_engine.runtime import execute

def graph(nodes,edges=(),id='review'):
 return dict(schema=1,id=id,title='Independent synthetic review',nodes=nodes,edges=list(edges))
def task(id,**more):return dict(id=id,title=id,kind='task',validation='contract',**more)
def edge(id,a,b,**kw):return dict(id=id,**{'from':a,'to':b},**kw)
def submit(e,r,n,outputs,evidence=None):
 c=e.claim(r,n);return e.submit(r,n,c['token'],dict(ok=True,summary='Synthetic',outputs=outputs,evidence=evidence or []))
results={}
with tempfile.TemporaryDirectory(prefix='tricorder-after-review-') as tmp:
 e=Engine(tmp)
 for case in ('agent-pass','command-pass','join-pass','nested-explicit-pass','doc-no-qa','missing-verdict','no-proof','fail','reject','wrong-candidate','altered-proof'):
  p=e.create_project(case);file=Path(p['path'])/'sample.txt';file.write_text('before')
  build=dict(id='build',title='Build',kind='agent',execution_mode='edit',outputs={'candidate':'object','other':'object'},validation='contract')
  qa=dict(id='qa',title='Check',kind='agent',candidate_check=True,inputs={'candidate':'object'},outputs={'verdict':'string'},validation='contract')
  if case=='command-pass':qa=dict(id='qa',title='Real command QA',kind='command',candidate_check=True,inputs={'candidate':'object'},argv=['sh','-c','test "$(cat /project/sample.txt)" = after'],validation='automatic')
  if case=='doc-no-qa':qa=dict(id='qa',title='Write changelog only',kind='document',inputs={'candidate':'object'},outputs={'text':'string'},validation='contract')
  nodes=[build,qa];edges=[edge('qa','build','qa',mapping={('other' if case=='wrong-candidate' else 'candidate'):'candidate'})]
  if case=='join-pass':
   nodes.append(dict(id='forward',title='Forward candidate',kind='join',inputs={'candidate':'object'},outputs={'candidate':'object'}));edges.append(edge('forward','build','forward',mapping={'candidate':'candidate'}))
  if case=='reject':nodes.append(dict(id='review',title='Review',kind='decision'));edges.append(edge('review','qa','review'))
  prefix='';g=graph(nodes,edges)
  if case=='nested-explicit-pass':
   build['application_requires']=['qa'];g['id']='child'
   middle=graph([dict(id='inner',title='Inner',kind='subworkflow',workflow='child')],id='middle')
   outer=graph([dict(id='outer',title='Outer',kind='subworkflow',workflow='middle')])
   r=e.start(p['id'],outer,library={'middle':middle,'child':g});prefix='outer.inner.'
   assert next(n for n in r['definition']['nodes'] if n['id']==prefix+'build')['application_requires']==[prefix+'qa']
  else:r=e.start(p['id'],g)
  c=e.claim(r['id'],prefix+'build');job=prepare(e,r,Path(tmp)/('job-'+case));(job['workspace']/'sample.txt').write_text('after');ref,diff=capture(e,r,job)
  (job['workspace']/'sample.txt').write_text('another candidate');other,_=capture(e,r,job)
  e.submit(r['id'],prefix+'build',c['token'],dict(ok=True,summary='Proposed',outputs={'candidate':ref,'other':other},evidence=[ref,diff],patch=diff))
  proof=e.artifact(b'QA synthetic proof' if case!='doc-no-qa' else b'Changelog only. No tests performed.')
  if case=='command-pass':
   c=e.claim(r['id'],'qa');execute(e,r['id'],'qa',c['token'])
  else:
   output={'text':'No tests performed'} if case=='doc-no-qa' else {} if case=='missing-verdict' else {'verdict':'fail' if case=='fail' else 'pass'}
   r=submit(e,r['id'],prefix+'qa',output,[] if case=='no-proof' else [proof])
  if case=='altered-proof':(e.store.directory/'artifacts'/proof['sha256']).write_bytes(b'altered')
  if case=='reject':
   gate=r['nodes']['review'];e.decide(r['id'],'review',gate['nonce'],gate['proposal'],'reject',human=True)
  try:apply(e,r['id'],prefix+'build',ref['sha256'],human=True);accepted=True;reason=None
  except ContractError as ex:accepted=False;reason=str(ex)
  expect=case.endswith('-pass')
  assert accepted==expect,(case,accepted,reason)
  assert file.read_text()==('after' if expect else 'before')
  results[case]={'applied':accepted,'reason':reason}
 p=e.create_project('Questions and transport')
 r=e.start(p['id'],graph([task('failed'),task('question')]))
 submit(e,r['id'],'failed',{'verdict':'fail'});c=e.claim(r['id'],'question');r=ask(e,r['id'],'question',c['token'],'Which rule?')
 focus=summary(r)['focus'];assert focus['node']=='question' and 'Répondre' in focus['action'] and focus['status']=='failed';results['question-focus']=focus
 svc=Conversations(e);con=svc.open(p['id'],graph([task('n'+str(i)) for i in range(100)]),'codex')
 text='Synthetic request '+ 'x'*90000;item=svc.add(con['id'],text,key='large');rid=item['run'];offset=0;ids=[];sizes=[]
 while True:
  page=native(e,con['id'],'ready',{'run':rid,'offset':offset});sizes.append(len(json.dumps(page).encode()));ids += [it['node']['id'] for it in page['items']]
  if page['next'] is None:break
  offset=page['next']
 assert len(ids)==100 and len(set(ids))==100 and max(sizes)<100000
 sha=page['parameters']['request']['$artifact']['sha256'];offset=0;restored=''
 while True:
  chunk=native(e,con['id'],'read',{'run':rid,'sha256':sha,'offset':offset});restored+=chunk['text']
  if chunk['next'] is None:break
  offset=chunk['next']
 assert restored==text
 claim=native(e,con['id'],'claim',{'run':rid,'node':'n0'});assert len(json.dumps(claim))<300000
 returned=native(e,con['id'],'result',{'run':rid,'node':'n0','token':claim['token'],'result':{'ok':True,'summary':'Large output','outputs':{'report':'Y'*1000000}}});assert len(json.dumps(returned))<300000
 results['native-pagination']={'pages':len(sizes),'blocks':len(ids),'max_page_bytes':max(sizes),'readback_exact':True,'claim_bytes':len(json.dumps(claim).encode()),'result_bytes':len(json.dumps(returned).encode())}
print(json.dumps(results,ensure_ascii=False,indent=2))

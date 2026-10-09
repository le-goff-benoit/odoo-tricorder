"""Independent functional probes; synthetic temporary projects only."""
import json, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'backend'))
from workflow_engine import Engine
from workflow_engine.conversations import Conversations, ask
from workflow_engine.projections import summary
from workflow_engine.contracts import expand, ContractError
from connectors.candidates import prepare, capture, apply
from workflow_cli import request as native_request

def graph(nodes, edges=(), id='review'):
 return dict(schema=1,id=id,title='Synthetic independent review',nodes=nodes,edges=list(edges))
def task(id, **more):return dict(id=id,title=id,kind='task',validation='contract',**more)
def complete(e,r,n,out,evidence=None):
 c=e.claim(r,n);return e.submit(r,n,c['token'],dict(ok=True,summary='Synthetic',outputs=out,evidence=evidence or []))
results={}
with tempfile.TemporaryDirectory(prefix='tricorder-independent-review-') as t:
 e=Engine(t);p=e.create_project('Synthetic review')
 # One question and a failed independent check must keep the question actionable.
 r=e.start(p['id'],graph([task('qa'),task('clarify')]))
 complete(e,r['id'],'qa',{'verdict':'fail'})
 c=e.claim(r['id'],'clarify');r=ask(e,r['id'],'clarify',c['token'],'Which rule?')
 results['question_with_other_failed_qa']={'focus':summary(r)['focus'],'states':{n:s['status'] for n,s in r['nodes'].items()}}
 # A reusable candidate workflow with explicit controls must retain scoped refs.
 sub=graph([dict(id='build',title='Build',kind='agent',execution_mode='edit',outputs={'candidate':'object'},validation='contract',application_requires=['qa']),task('qa',inputs={'candidate':'object'})],[dict(id='qa',**{'from':'build','to':'qa'},mapping={'candidate':'candidate'})],id='child')
 outer=graph([dict(id='component',title='Component',kind='subworkflow',workflow='child')])
 r=e.start(p['id'],outer,library={'child':sub});file=Path(p['path'])/'sample.txt';file.write_text('before')
 c=e.claim(r['id'],'component.build');prepared=prepare(e,r,Path(t)/'job')
 (prepared['workspace']/'sample.txt').write_text('after');ref,patch=capture(e,r,prepared)
 e.submit(r['id'],'component.build',c['token'],dict(ok=True,summary='Candidate',outputs={'candidate':ref},evidence=[ref,patch],patch=patch))
 complete(e,r['id'],'component.qa',{},[e.artifact(b'QA exact candidate')])
 try:apply(e,r['id'],'component.build',ref['sha256'],human=True);res='applied'
 except Exception as ex:res=f'{type(ex).__name__}: {ex}'
 results['nested_explicit_qa']={'result':res,'content':file.read_text(),'application_requires':e.run(r['id'])['definition']['nodes'][1].get('application_requires')}
 # Harmless downstream consumer has a candidate port but is not a QA.
 p2=e.create_project('Candidate consumer');f2=Path(p2['path'])/'sample.txt';f2.write_text('before')
 nodes=[dict(id='build',title='Build',kind='agent',execution_mode='edit',outputs={'candidate':'object'},validation='contract'),task('qa',inputs={'candidate':'object'}),dict(id='archive',title='Archive candidate reference',kind='join',inputs={'candidate':'object'},outputs={'candidate':'object'})]
 edges=[dict(id=n,**{'from':'build','to':n},mapping={'candidate':'candidate'}) for n in ('qa','archive')]
 r=e.start(p2['id'],graph(nodes,edges));c=e.claim(r['id'],'build');prep=prepare(e,r,Path(t)/'job2');(prep['workspace']/'sample.txt').write_text('after');ref,diff=capture(e,r,prep)
 e.submit(r['id'],'build',c['token'],dict(ok=True,summary='Candidate',outputs={'candidate':ref},evidence=[ref,diff],patch=diff));complete(e,r['id'],'qa',{},[e.artifact(b'QA exact candidate')])
 try:apply(e,r['id'],'build',ref['sha256'],human=True);res='applied'
 except Exception as ex:res=f'{type(ex).__name__}: {ex}'
 results['non_qa_consumer']={'result':res,'content':f2.read_text()}
 # Native ready projects duplicate request for each ready block; output should be bounded.
 service=Conversations(e);con=service.open(p['id'],graph([task(f't{i}') for i in range(100)]),'codex')
 item=service.add(con['id'],'Synthetic large request '+ 'x'*90000,key='large')
 ready=native_request(e,con['id'],'ready',{'run':item['run']})
 results['native_ready_100_blocks']={'bytes':len(json.dumps(ready).encode()),'blocks':len(ready)}
 print(json.dumps(results,ensure_ascii=False,indent=2))

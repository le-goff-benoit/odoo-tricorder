"""A declared native Task QA must be able to materialize its candidate."""
import sys,json,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'backend'))
from workflow_engine import Engine,ContractError
from workflow_engine.conversations import Conversations
from workflow_cli import request
from connectors.candidates import prepare,capture
with tempfile.TemporaryDirectory(prefix='tricorder-task-qa-review-') as t:
 e=Engine(t);p=e.create_project('Synthetic QA task');f=Path(p['path'])/'sample.txt';f.write_text('before')
 g={'schema':1,'id':'review','title':'Native Task QA','nodes':[{'id':'build','title':'Build','kind':'agent','execution_mode':'edit','outputs':{'candidate':'object'},'validation':'contract'},{'id':'qa','title':'QA task','kind':'task','inputs':{'candidate':'object'},'outputs':{'verdict':'string'},'candidate_check':True,'validation':'contract'}],'edges':[{'id':'qa','from':'build','to':'qa','mapping':{'candidate':'candidate'}}]}
 svc=Conversations(e);c=svc.open(p['id'],g,'codex',model='fixture');item=svc.add(c['id'],'Synthetic task QA');r=e.run(item['run']);claim=e.claim(r['id'],'build');job=prepare(e,r,Path(t)/'job');(job['workspace']/'sample.txt').write_text('after');ref,diff=capture(e,r,job)
 e.submit(r['id'],'build',claim['token'],{'ok':True,'summary':'Proposed','outputs':{'candidate':ref},'evidence':[ref,diff],'patch':diff})
 claim=request(e,c['id'],'claim',{'run':r['id'],'node':'qa'})
 try:
  candidate=request(e,c['id'],'prepare-candidate',{'run':r['id'],'node':'qa','token':claim['token']})
  outcome={'materialized':True,'candidate_content':(Path(candidate['path'])/'sample.txt').read_text()}
 except ContractError as ex:outcome={'materialized':False,'error':str(ex)}
 print(json.dumps(outcome))

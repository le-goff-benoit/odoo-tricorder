import sys,tempfile,json
from pathlib import Path
sys.path.insert(0,'/home/blegoff/odoo-tricorder/backend')
from workflow_engine import Engine
from connectors.candidates import prepare,capture,apply
with tempfile.TemporaryDirectory(prefix='tricorder-noqa-review-') as t:
 e=Engine(t);p=e.create_project('Synthetic no QA');f=Path(p['path'])/'sample.txt';f.write_text('before')
 g={'schema':1,'id':'non-qa','title':'Prepare changelog, no QA','nodes':[{'id':'build','kind':'agent','title':'Prepare code','execution_mode':'edit','outputs':{'candidate':'object'},'validation':'contract'},{'id':'doc','kind':'document','title':'Write changelog','inputs':{'candidate':'object'},'outputs':{'text':'string'},'validation':'contract'}],'edges':[{'id':'doc','from':'build','to':'doc','mapping':{'candidate':'candidate'}}]}
 r=e.start(p['id'],g);c=e.claim(r['id'],'build');job=prepare(e,r,Path(t)/'job');(job['workspace']/'sample.txt').write_text('after');ref,diff=capture(e,r,job)
 e.submit(r['id'],'build',c['token'],{'ok':True,'summary':'Code proposed','outputs':{'candidate':ref},'evidence':[ref,diff],'patch':diff})
 c=e.claim(r['id'],'doc');e.submit(r['id'],'doc',c['token'],{'ok':True,'summary':'Changelog prepared. No tests run.','outputs':{'text':'Change sample text; no tests performed.'},'evidence':[e.artifact(b'Changelog only. No tests performed.')]})
 apply(e,r['id'],'build',ref['sha256'],human=True)
 print(json.dumps({'result':'applied without any QA block','content':f.read_text()}))

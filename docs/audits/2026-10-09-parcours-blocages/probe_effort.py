"""A native conversation must not silently discard a per-node effort selection."""
import json, os, sys, tempfile
from pathlib import Path
from unittest.mock import patch
root=Path(__file__).resolve().parents[3]
sys.path[:0]=[str(root/'backend'),str(root/'tests')]
from workflow_engine import Engine, ContractError
from workflow_engine.conversations import Conversations
from native_cli_fixture import cli_directory
from workflow_cli import request
from studio import request as studio_request

results=[]
with tempfile.TemporaryDirectory(prefix='tricorder-path-effort-') as t:
    e=Engine(Path(t)/'state'); p=e.create_project('Synthetic effort'); svc=Conversations(e)
    folder=cli_directory(t)
    with patch.dict(os.environ,{'PATH':str(folder)+os.pathsep+os.environ['PATH']}):
        for provider in ['codex','claude']:
            g={'schema':1,'id':'effort-'+provider,'title':'Support analysis','defaults':{'provider':provider,'model':'fixture','effort':'medium'},'nodes':[{'id':'diagnose','title':'Deep analysis','kind':'agent','effort':'high','validation':'contract'}],'edges':[]}
            preview=studio_request(e,{'action':'workflow.validate','project':p['id'],'graph':g,'mode':'native','provider':provider,'model':'fixture'})
            c=svc.open(p['id'],g,provider,model='fixture'); item=svc.add(c['id'],'Analyze deeply')
            run=e.run(item['run'])
            try:
                claim=request(e,c['id'],'claim',{'run':run['id'],'node':'diagnose'})
                accepted=True; error=None
            except ContractError as exc:
                accepted=False; error=str(exc)
            results.append({'provider':provider,'preflight_issues':preview['issues'],'conversation_effort':c['effort'],'block_execution_effort':run['definition']['nodes'][0]['execution']['effort'],'native_claim_accepted':accepted,'error':error})
print(json.dumps(results,ensure_ascii=False,indent=2))

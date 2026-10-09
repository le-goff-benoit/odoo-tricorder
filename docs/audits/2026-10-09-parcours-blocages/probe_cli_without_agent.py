"""Conversation startup needs its provider even for a graph without AI nodes."""
import json, os, sys, tempfile
from pathlib import Path
from unittest.mock import patch
root=Path(__file__).resolve().parents[3]
sys.path[:0]=[str(root/'backend'),str(root/'tests')]
from workflow_engine import Engine, ContractError
from workflow_engine.conversations import Conversations
from studio import request

rows=[]
with tempfile.TemporaryDirectory(prefix='tricorder-path-no-agent-') as t:
    e=Engine(Path(t)/'state'); p=e.create_project('Synthetic manual workflow')
    g={'schema':1,'id':'question-only','title':'Clarify a request','nodes':[{'id':'ask','title':'Clarify','kind':'question','question':'What is the expected outcome?'}],'edges':[]}
    empty=Path(t)/'empty-bin'; empty.mkdir()
    with patch.dict(os.environ,{'PATH':str(empty)}):
        for provider in ['codex','claude']:
            preview=request(e,{'action':'workflow.validate','project':p['id'],'graph':g,'mode':'native','provider':provider})
            try:
                c=Conversations(e).open(p['id'],g,provider)
                accepted=True; error=None
            except ContractError as exc:
                accepted=False; error=str(exc)
            rows.append({'provider':provider,'preflight_issues':preview['issues'],'conversation_created':accepted,'error':error})
print(json.dumps(rows,ensure_ascii=False,indent=2))

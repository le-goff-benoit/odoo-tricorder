"""Selected secondary project lacks the workflow's profile; no model is invoked."""
import json, os, sys, tempfile
from pathlib import Path
from unittest.mock import patch
root = Path(__file__).resolve().parents[3]
sys.path[:0] = [str(root/'backend'), str(root/'tests')]
from workflow_engine import Engine, ContractError
from workflow_engine.conversations import Conversations
from workflow_engine.packs import inspect_pack, install
from native_cli_fixture import cli_directory
from studio import request

with tempfile.TemporaryDirectory(prefix='tricorder-path-projects-') as t:
    e = Engine(Path(t)/'state')
    a = e.create_project('Alpha with support pack')
    b = e.create_project('Beta without support pack')
    pack = Path(t)/'pack'; pack.mkdir()
    (pack/'support.md').write_text('Synthetic support analyst. No external calls.')
    (pack/'tricorder-pack.json').write_text(json.dumps({'schema':1,'engine_schema':1,'id':'support-pack','version':'1','profiles':[{'id':'support-analyst','title':'Support analyst','source':'support.md'}]}))
    install(e, a['id'], str(pack), inspect_pack(pack)['sha256'])
    g = {'schema':1,'id':'support','title':'Support analysis','defaults':{'provider':'codex','model':'fixture'},'nodes':[{'id':'diagnose','title':'Diagnose request','kind':'agent','profile':'support-analyst','validation':'contract'}],'edges':[]}
    folder = cli_directory(t)
    with patch.dict(os.environ, {'PATH':str(folder)+os.pathsep+os.environ['PATH']}):
        preview = request(e, {'action':'workflow.validate','project':a['id'],'graph':g,'mode':'native','provider':'codex','model':'fixture'})
        try:
            request(e, {'action':'conversation.open','project':a['id'],'projects':[b['id']],'graph':g,'provider':'codex'},human=True)
            failure = None
        except ContractError as exc:
            failure = str(exc)
        print(json.dumps({'main_project_preview_issues':preview['issues'],'launch_error':failure,'secondary_project_identified':b['title'] in (failure or ''),'persisted_conversations':len(Conversations(e).list())}, ensure_ascii=False, indent=2))

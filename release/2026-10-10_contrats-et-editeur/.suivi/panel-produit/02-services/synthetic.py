import sys,json,os
from pathlib import Path
base=Path(__file__).parent
os.environ.update(json.loads((base/'env.json').read_text()))
sys.path.insert(0,'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/resources/backend')
from workflow_engine import Engine
from workflow_engine.conversations import Conversations
e=Engine(str(base/'state/workflows')); c=Conversations(e)
if sys.argv[1]=='snapshot':
 values=[c.snapshot(x['id']) for x in c.list()]
 (base/'snapshot.json').write_text(json.dumps(values,ensure_ascii=False,indent=2))
 print(json.dumps([{'id':x['id'],'projects':x['projects'],'items':[{'run':i['run'],'request':i['request'],'nodes':[{k:n[k] for k in ['id','title','kind','outputs'] if k in n} for n in i['execution']['definition']['nodes']],'states':{k:v['status'] for k,v in i['execution']['nodes'].items()}} for i in x['items']]} for x in values],ensure_ascii=False))
elif sys.argv[1]=='submit':
 rid,nid=sys.argv[2:4];value=json.loads(sys.argv[4]);cl=e.claim(rid,nid,executor='native');r=e.submit(rid,nid,cl['token'],value);print(json.dumps({k:v['status'] for k,v in r['nodes'].items()}))

import json,sys
sys.path.insert(0,'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/resources/backend')
from workflow_engine import Engine
e=Engine(sys.argv[1]);r=max([r for r in e.runs('workspace') if r.get('driver')=='conversation'],key=lambda r:r['created'])
n=next(n for n in r['definition']['nodes'] if n['title']=='Compléter la demande D-102')
print(json.dumps({'run':r['id'],'node':n['id'],'status':r['nodes'][n['id']]['status'],'questions':r['nodes'][n['id']]['questions'],'inputs':r['nodes'][n['id']]['inputs']},ensure_ascii=False))

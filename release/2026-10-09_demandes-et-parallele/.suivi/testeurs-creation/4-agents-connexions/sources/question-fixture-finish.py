import json,sys
sys.path.insert(0,'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/resources/backend')
from workflow_engine import Engine
e=Engine(sys.argv[1]);r=max([r for r in e.runs('workspace') if r.get('driver')=='conversation'],key=lambda r:r['created'])
n=next(n for n in r['definition']['nodes'] if n['title']=='Compléter la demande D-102')
c=e.claim(r['id'],n['id'],executor='native')
r=e.submit(r['id'],n['id'],c['token'],{'ok':True,'summary':'Fixture locale : brouillon fictif complété avec retour le 17 octobre à 16 h. Aucun modèle appelé.','outputs':{}})
print(json.dumps({'run':r['id'],'nodes':{k:{'status':v['status']} for k,v in r['nodes'].items()}},ensure_ascii=False))

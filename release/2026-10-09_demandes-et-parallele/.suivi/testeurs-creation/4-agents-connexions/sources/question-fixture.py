import json,sys
sys.path.insert(0,'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/resources/backend')
from workflow_engine import Engine
e=Engine(sys.argv[1])
runs=[r for r in e.runs('workspace') if r.get('driver')=='conversation']
r=max(runs,key=lambda r:r['created'])
n=next(n for n in r['definition']['nodes'] if n['title']=='Compléter la demande D-102')
c=e.claim(r['id'],n['id'],executor='native')
r=e.submit(r['id'],n['id'],c['token'],{'summary':'Fixture de question locale, aucun modele appele','question':'Quelle est la date de retour prévue pour les 8 chaises de la demande D-102 ?'})
print(json.dumps({'run':r['id'],'node':n['id'],'status':r['nodes'][n['id']]['status'],'question':r['nodes'][n['id']]['question']},ensure_ascii=False))

"""Synthetic states through validated Engine commands only; no user decisions."""
import json,sys
from pathlib import Path
sys.path.insert(0,'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/resources/backend')
from workflow_engine import Engine
from workflow_engine.conversations import ask
engine=Engine('/tmp/tricorder-ux-ux4-etats-erreurs-kRQVgJ/state/workflows')
rid='r8be25da25948424d'
command=sys.argv[1]
if command=='question':
 claim=engine.claim(rid,'clarify',executor='native')
 result=ask(engine,rid,'clarify',claim['token'],'[ÉTAT SYNTHÉTIQUE UX4] Quelle langue souhaitez-vous pour l’invitation à l’atelier fictif ?')
elif command=='brief':
 claim=engine.claim(rid,'clarify',executor='native')
 result=engine.submit(rid,'clarify',claim['token'],{'ok':True,'summary':'[RÉSULTAT SYNTHÉTIQUE UX4] Besoin clarifié : invitation française pour 6 personnes, atelier de 45 minutes.','outputs':{'brief':'Préparer une invitation en français pour 6 personnes, durée 45 minutes. [SYNTHÉTIQUE UX4]'}})
elif command=='failure':
 claim=engine.claim(rid,'work',executor='native')
 result=engine.submit(rid,'work',claim['token'],{'ok':False,'summary':'[ÉCHEC SYNTHÉTIQUE UX4] Fournisseur local indisponible (sortie 78) ; aucune invitation produite.','outputs':{}})
elif command=='result':
 claim=engine.claim(rid,'work',executor='native')
 result=engine.submit(rid,'work',claim['token'],{'ok':True,'summary':'[RÉSULTAT SYNTHÉTIQUE UX4] Invitation fictive disponible pour votre validation.','outputs':{'result':'[SYNTHÉTIQUE UX4] Venez dessiner ensemble pendant 45 minutes. Six places sont prévues ; rendez-vous dans la salle imaginaire.'}})
else:
 raise ValueError('Unknown fixture')
record={'synthetic':True,'command':command,'run':rid,'states':{key:{k:v for k,v in value.items() if k in {'status','attempt','question','result','history','validation_error'}} for key,value in result['nodes'].items()}}
print(json.dumps(record,ensure_ascii=False))
with (Path(__file__).parent/'fixture-events.jsonl').open('a') as out: out.write(json.dumps(record,ensure_ascii=False)+'\n')

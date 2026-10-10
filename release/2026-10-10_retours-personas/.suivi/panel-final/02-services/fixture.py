"""Fixtures exclusivement par commandes validées Engine ; aucune IA réelle."""
import json, sys
sys.path.insert(0, '/tmp/tricorder-panel-final/backend')
from workflow_engine import Engine
from workflow_engine.conversations import ask
e=Engine(sys.argv[1]); action=sys.argv[2]
def submit(rid,nid,outputs):
    c=e.claim(rid,nid)
    e.submit(rid,nid,c['token'],{'ok':True,'summary':'FIXTURE SYNTHÉTIQUE — aucun modèle ni service externe appelé.','outputs':outputs})
if action=='create':
    graph=json.load(open(sys.argv[3]))['run']['original']
    r=e.start('workspace',graph,simulation=True,driver='conversation',parameters={'request':'Boreal — précisions attendues (fixture synthétique)\n\nLe client signale un problème Odoo. Nous ne connaissons ni les personnes touchées, ni le blocage, ni le canal souhaité.'})
    submit(r['id'],'diagnosis',{'finding':'EXEMPLE SYNTHÉTIQUE : impact et nature non établis.','next_action':'Demander les faits manquants.','severity':'unknown'})
    print(r['id'])
elif action=='destination':
    rid=sys.argv[3]
    submit(rid,'reassess',{'finding':'EXEMPLE SYNTHÉTIQUE : un utilisateur dispose d’un export manuel ; bug suspecté, urgence non établie.','next_action':'Reproduire le défaut avec un exemple.','severity':'normal'})
    submit(rid,'normal',{'draft':'EXEMPLE SYNTHÉTIQUE : nous allons reproduire le défaut signalé ; le contournement reste disponible.'})
    c=e.claim(rid,'destination');ask(e,rid,'destination',c['token'],'Souhaitez-vous un texte pour un email ou pour un ticket Odoo ?')
    print(rid)
elif action=='finish':
    rid=sys.argv[3]
    submit(rid,'destination',{'answer':'Email client, ton factuel. Réponse issue du scénario synthétique.'})
    submit(rid,'response',{'draft':'Objet : Suivi de votre demande Odoo\n\nBonjour,\nUn utilisateur est concerné depuis ce matin. L’export manuel permet de poursuivre le travail. Nous allons reproduire le défaut avec votre exemple avant de conclure.\n\nTEXTE SYNTHÉTIQUE DE RECETTE — aucun email envoyé.'})
    print(json.dumps(e.run(rid),ensure_ascii=False))

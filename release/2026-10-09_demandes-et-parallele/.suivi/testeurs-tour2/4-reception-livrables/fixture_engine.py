"""Explicit fictitious business fixtures; Engine API only, packaged backend mandatory."""
import json
from pathlib import Path
import sys

backend, state, project_path, mode = sys.argv[1:5]
sys.path.insert(0, backend)
from workflow_engine import Engine
from workflow_engine.conversations import Conversations, ask

e = Engine(Path(state) / 'workflows')
output = Path(__file__).parent
saved = output / 'fixture-manifest.json'

def proof(name, role, text):
    return {**e.artifact(text.encode('utf-8')), 'name': name, 'role': role, 'media_type': 'text/markdown'}

def submit(run, summary, report, verdict='pass', evidence=None, ok=True):
    claim = e.claim(run, 'work')
    return e.submit(run, 'work', claim['token'], {'ok': ok, 'simulated': True, 'summary': summary,
        'outputs': {'report': report, 'verdict': verdict} if ok else {}, 'evidence': evidence or []})

if mode == 'setup':
    p = next(p for p in e.projects() if p['path'] == project_path)
    g = {'schema': 1, 'id': 'reception-fixtures', 'title': 'Réception documentaire — fixtures fictives',
        'description': 'Fixture de parcours, aucun fournisseur ni travail client réel qualifié.',
        'defaults': {'provider': 'codex', 'model': 'synthetic-model'},
        'nodes': [{'id': 'work', 'kind': 'agent', 'title': 'Examiner le livrable fictif', 'prompt': 'Fixture de recette, ne pas appeler de modèle réel.',
            'validation': 'human', 'max_attempts': 3, 'outputs': {'report': 'object', 'verdict': 'string'},
            'route_output': 'verdict', 'options': ['pass', 'fail'], 'evidence_required': True,
            'criteria': ['Les données de la source fictive sont restituées exactement.', 'Les limites de simulation et la suite sont explicites.']}], 'edges': []}
    e.save(p['id'], g)
    c = Conversations(e)
    conversation = c.open(p['id'], g, 'codex')
    requests = [
        'P1 — Réunion Atlas : restituer décision, responsable et échéance. FICTION DE RECETTE.\nSource : sources/reunion-atlas.md',
        'P2 — Contrat fictif : comparer 650 € au budget de 500 € et rendre un avis. FICTION DE RECETTE.\nSource : sources/contrat-fictif.md',
        'P2-technique — Génération interrompue ; incident technique simulé, aucun livrable produit.',
        'P3 — Atelier Boréal : préparer un brouillon d’invitation et demander le lieu manquant. FICTION, AUCUN ENVOI.\nSource : sources/demande-boreal.md',
        'P4 — Réunion Atlas : reprendre le compte rendu s’il manque une date. FICTION DE RECETTE.\nSource : sources/reunion-atlas.md',
        'P5 — Bilan de passation après plusieurs demandes : résultats, reprises, limites et suite. FICTION DE RECETTE.'
    ]
    items = [c.add(conversation['id'], request) for request in requests]
    source = {key: proof(key, 'source', (Path(project_path)/'sources'/key).read_text()) for key in ['reunion-atlas.md','contrat-fictif.md','demande-boreal.md']}
    plan = proof('plan-reception.md', 'plan', '# Plan fictif\nLire la source, clarifier les inconnues, restituer le résultat, faire examiner les critères. Aucun envoi ou engagement externe.\n')
    meeting = {'decision': 'Reporter la journée portes ouvertes.', 'actions': [{'action': 'Vérifier deux salles alternatives', 'owner': 'Alice Durand', 'due': '16 octobre 2026'}], 'next_action': 'Choisir le créneau alternatif lors de la prochaine réunion.', 'notes': 'Fixture fictive, sans réservation réelle.'}
    meeting_proof = proof('compte-rendu-atlas.md', 'deliverable', '# Compte rendu Atlas — fixture\nDécision : reporter la journée portes ouvertes.\nAlice Durand vérifie deux salles avant le 16 octobre 2026.\nAucune réservation réelle.\n')
    submit(items[0]['run'], 'FIXTURE — Compte rendu Atlas remis pour examen.', meeting, evidence=[source['reunion-atlas.md'],plan,meeting_proof])
    contract = {'finding': 'Le total de 650 € dépasse le budget de 500 € de 150 €.', 'decision': 'Avis défavorable à l’acceptation au prix indiqué.', 'next_action': 'Demander une proposition dans le budget.', 'notes': 'Contrat fictif, sans signature ni paiement.'}
    contract_proof = proof('avis-contrat-fictif.md', 'deliverable', '# Avis fictif\n650 € - 500 € = 150 € de dépassement. Avis défavorable au prix indiqué. Le traitement est accompli ; aucune panne, signature ou portée juridique.\n')
    submit(items[1]['run'], 'FIXTURE — Analyse accomplie, avis métier défavorable.', contract, verdict='fail', evidence=[source['contrat-fictif.md'],plan,contract_proof])
    incident = proof('incident-technique-fictif.md', 'evidence', '# Incident simulé\nLa génération du brouillon est interrompue avant création du livrable. Corriger le chemin de destination et reprendre. Aucune cause réelle fournisseur évaluée.\n')
    submit(items[2]['run'], 'FIXTURE — Incident technique : chemin de destination indisponible, aucun livrable créé.', {}, evidence=[incident], ok=False)
    claim = e.claim(items[3]['run'], 'work')
    ask(e, items[3]['run'], 'work', claim['token'], 'Quel lieu doit figurer dans l’invitation fictive ?')
    incomplete = proof('compte-rendu-atlas-tentative1.md', 'deliverable', '# Première tentative fictive\nReporter la journée portes ouvertes. Alice Durand vérifie deux salles.\nLa date a été omise volontairement dans cette fixture.\n')
    submit(items[4]['run'], 'FIXTURE — Première tentative : la date de l’action a été omise.', {'decision': 'Reporter la journée portes ouvertes.', 'actions': [{'action': 'Vérifier deux salles', 'owner': 'Alice Durand'}], 'notes': 'Fixture incomplète à reprendre.'}, evidence=[source['reunion-atlas.md'],plan,incomplete])
    data = {'project': p, 'conversation': conversation['id'], 'items': items, 'source': source, 'plan': plan, 'meeting': meeting, 'meeting_proof': meeting_proof, 'classification': 'Résultats métier fictifs via Engine, exécution IA non qualifiée'}
    saved.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(data, ensure_ascii=False))
else:
    data = json.loads(saved.read_text())
    if mode == 'invitation':
        result = {'draft': 'Invitation fictive : atelier le 20 octobre 2026 à 14 h, Salle des Érables, 12 rue imaginaire.', 'next_action': 'Relire le brouillon ; aucun envoi effectué.', 'notes': 'Fixture client fictif, sans compte email.'}
        artifact = proof('invitation-boreal.md', 'deliverable', '# Brouillon fictif\n'+result['draft']+'\nAucun envoi effectué.\n')
        submit(data['items'][3]['run'], 'FIXTURE — Brouillon remis après clarification du lieu.', result, evidence=[data['source']['demande-boreal.md'], data['plan'],artifact])
    elif mode == 'second':
        submit(data['items'][4]['run'], 'FIXTURE — Deuxième tentative corrigée : échéance au 16 octobre 2026.', data['meeting'], evidence=[data['source']['reunion-atlas.md'],data['plan'],data['meeting_proof']])
    elif mode == 'bilan':
        report = {'summary': 'Bilan fictif de réception documentaire : cinq demandes métier et un incident distinct.',
            'findings': [{'request':'P1 Réunion Atlas', 'result':'Report ; Alice vérifie deux salles au 16 octobre.', 'status':'Reçu par le testeur, fixture'},
                {'request':'P2 Contrat fictif', 'result':'650 € > 500 €, avis défavorable ; traitement réussi.', 'status':'Reçu par le testeur, fixture'},
                {'request':'P2 incident technique', 'result':'Aucun livrable ; destination indisponible.', 'status':'À reprendre'},
                {'request':'P3 Invitation', 'result':'Lieu précisé : Salle des Érables, 12 rue imaginaire. Aucun envoi.', 'status':'Brouillon reçu, fixture'},
                {'request':'P4 Reprise', 'result':'Tentative 1 : date omise. Motif : ajouter le 16 octobre et conserver le report. Tentative 2 : date corrigée.', 'status':'Deuxième tentative reçue, fixture'}],
            'next_action':'Collègue : corriger la destination de la demande technique. Aucun fournisseur réel ni service externe qualifié.',
            'notes':'Bilan rédigé par le banc, pas une synthèse IA réellement produite. Produit évalué : affichage, réception et export.'}
        artifact = proof('bilan-passation-fictif.md', 'deliverable', '# Bilan de passation — fixture explicite\nP1 : report, Alice, 16 octobre ; reçu.\nP2 : 150 € au-dessus du budget, avis défavorable ; analyse reçue.\nIncident : aucun livrable, corriger destination.\nP3 : Salle des Érables, 12 rue imaginaire ; brouillon reçu, aucun envoi.\nP4 : date omise tentative 1, corrigée tentative 2 après motif humain.\nAucun modèle commercial, compte email, client réel ou service externe qualifié.\n')
        submit(data['items'][5]['run'], 'FIXTURE — Bilan de passation remis après plusieurs demandes.', report, evidence=[data['plan'],artifact])
    else:
        raise ValueError('mode inconnu')
    print('Fixture '+mode+' remise via Engine')

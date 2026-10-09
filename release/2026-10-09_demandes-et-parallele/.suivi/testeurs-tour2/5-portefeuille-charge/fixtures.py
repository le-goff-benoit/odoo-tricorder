#!/usr/bin/python3
"""Volume/question fixtures through the candidate Engine API only; never direct state edits."""
import json
import sys
from pathlib import Path

backend, state, mode = sys.argv[1:4]
if mode not in {'volume', 'question', 'capacity', 'dependencies', 'bilan'}:
    raise SystemExit('Mode de fixture inconnu')
if not Path(backend).is_dir():
    raise SystemExit('Backend du candidat absent')
sys.path.insert(0, backend)
from workflow_engine import Engine
from workflow_engine.conversations import Conversations, ask

engine = Engine(state)
projects = [engine.create_project(title) for title in ['Atlas — Services', 'Boréal — Opérations', 'Céleste — Comité']]
graph = {'schema': 1, 'id': 'portefeuille-charge', 'title': 'Préparer et vérifier les demandes du portefeuille',
         'defaults': {'provider': 'codex', 'model': 'synthetic-local'},
         'nodes': [{'id': 'work', 'kind': 'agent', 'title': 'Analyser les informations synthétiques',
                    'validation': 'contract', 'outputs': {'result': 'string'}}], 'edges': []}
engine.save(projects[0]['id'], graph)
service = Conversations(engine)
conversation = service.open(projects[0]['id'], graph, 'codex', projects=[p['id'] for p in projects[1:]], model='synthetic-local')
items = []
subjects = ['Préparer le tableau de décisions', 'Comparer les besoins des équipes', 'Relire les critères de réception',
            'Préparer les documents du comité', 'Vérifier les informations disponibles', 'Identifier les points à arbitrer']
for index in range(1, 37):
    project = projects[(index - 1) % 3]
    title = f'R{index:02d} — ' + subjects[(index - 1) % len(subjects)]
    if index == 35:
        title = 'R35 — URGENT — Préparer arbitrage comité de 16h'
    items.append(service.add(conversation['id'], title, project=project['id'], key=f'R{index:02d}'))
question = None
if mode == 'question':
    target = items[16]
    claim = engine.claim(target['run'], 'work', executor='native')
    ask(engine, target['run'], 'work', claim['token'], 'Pour R17, faut-il comparer uniquement les besoins actuels ou ajouter les besoins du trimestre prochain ?')
    question = {'item': target['id'], 'run': target['run'], 'fixture': True}
print(json.dumps({'fixture_mode': mode, 'engine_api_only': True, 'state': state, 'projects': projects,
                  'conversation': conversation['id'], 'items': items, 'question': question,
                  'completed_by_fixture': [], 'notes': ['36 demandes prêtes injectées par API validée ; aucune exécution réelle.',
                  'La consolidation sera créée dans l’UI ; aucun prérequis préconfiguré.',
                  'Question préconfigurée exclusivement dans le mode question.']}, ensure_ascii=False, indent=2))

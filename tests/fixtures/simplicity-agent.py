#!/usr/bin/python3
"""Local deterministic CLI for UX journeys; no model or external service."""
import json
import select
import shlex
import subprocess
import sys
import time
from pathlib import Path

bridge = shlex.split(next(line[7:] for line in sys.argv[-1].splitlines() if line.startswith('Pont : ')))
def call(action, **payload):
    result = subprocess.run(bridge + [action], input=json.dumps(payload), text=True, capture_output=True)
    value = json.loads(result.stdout)
    if result.returncode or not value['ok']:
        raise RuntimeError(value)
    return value['result']

print('AGENT SYNTHÉTIQUE PRÊT — saisissez votre demande.', flush=True)
while True:
    if select.select([sys.stdin], [], [], .25)[0]:
        text = sys.stdin.readline().strip()
        if text == 'exit' or not text:
            break
        snapshot = call('status')
        if text.startswith('Réponse:'):
            for item in snapshot['items']:
                run=call('inspect',run=item['run'])
                pending=next(((nid,n) for nid,n in run['nodes'].items() if n['status']=='waiting_input'),None)
                if pending:
                    nid,node=pending
                    call('answer',run=item['run'],node=nid,question=node['question']['id'],text=text.partition(':')[2].strip())
                    print('RÉPONSE TRANSMISE AU WORKFLOW',flush=True)
                    break
            continue
        project = snapshot['projects'][-1] if text.startswith('Autre projet:') else snapshot['project']
        item = call('add', request=text, project=project)
        print('DEMANDE REÇUE : ' + text, flush=True)
    for item in call('status')['items']:
        for ready in call('ready', run=item['run'])['items']:
            node = ready['node']
            if node['kind'] not in ('task', 'document', 'agent'):
                continue
            claim = call('claim', run=item['run'], node=node['id'])
            print('TRAVAIL : ' + node['title'], flush=True)
            time.sleep(.5)
            evidence_path=Path(__file__).parent.parent / (item['run']+'-'+node['id']+'.txt')
            evidence_path.write_text('Synthetic local result for '+item['request'])
            evidence=call('artifact',path=str(evidence_path))
            call('result', run=item['run'], node=node['id'], token=claim['token'], result={
                'ok': True, 'evidence':[evidence], 'summary': 'Résultat synthétique préparé. Aucun service externe appelé.',
                'outputs': {key: 'Résultat de la demande : ' + item['request'] for key in node.get('outputs', {})}})

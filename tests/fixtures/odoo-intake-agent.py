#!/usr/bin/python3
"""Exercise intake through the real bridge; never use a model or Odoo database."""
import json
import shlex
import subprocess
import sys

bridge = shlex.split(next(line[7:] for line in sys.argv[-1].splitlines() if line.startswith('Pont : ')))


def call(action, payload=None):
    result = subprocess.run(bridge + [action], input=json.dumps(payload or {}), text=True, capture_output=True)
    data = json.loads(result.stdout)
    assert result.returncode == 0 and data['ok'], data
    return data['result']


snapshot = call('status')
item = snapshot['items'][0]
claim = call('claim', {'run': item['run'], 'node': 'intent'})
call('result', {'run': item['run'], 'node': 'intent', 'token': claim['token'],
                'result': {'ok': True, 'summary': 'Demande synthétique reçue avant préparation de la base de test.',
                           'outputs': {'intent': item['request']}}})
print('ODOO INTAKE RECEIVED — NO DATABASE USED', flush=True)

#!/usr/bin/python3
"""Deterministic native CLI substitute; no network or model calls."""
import hashlib
import json
from pathlib import Path
import shlex
import subprocess
import sys

config = json.loads((Path(sys.argv[0]).parent.parent / 'mail-fixture.json').read_text())
prompt = sys.argv[-1]
assert 'va chercher cet email' in prompt
assert 'recherche n’a pas été effectuée' in prompt
assert 'pack Odoo' in prompt and 'answer, jamais add' in prompt
bridge = shlex.split(next(line[7:] for line in prompt.splitlines() if line.startswith('Pont : ')))


def call(action, value=None):
    result = subprocess.run([*bridge, action], input=json.dumps(value) if value is not None else '', text=True, capture_output=True)
    data = json.loads(result.stdout)
    assert result.returncode == 0 and data['ok'], data
    return data['result']


snapshot = call('status')
project = snapshot['project_contexts'][0]
ready = Path(sys.argv[0]).parent.parent / 'mail-agent-ready'
ready.write_text((ready.read_text() if ready.exists() else '') + 'ready\n')
print('SYNTHETIC MAIL AGENT READY', flush=True)
instruction = input()
assert 'email' in instruction.lower() and 'release' in instruction.lower()
adapter = Path(config['adapter'])
if not adapter.is_file():
    item = call('add', {'request': 'Coordination : accès mail requis, recherche non effectuée.', 'key': 'mail-access-coordination'})
    claim = call('claim', {'run': item['run'], 'node': 'intent'})
    call('ask', {'run': item['run'], 'node': 'intent', 'token': claim['token'], 'text': 'La recherche n’a pas été effectuée : connecter une messagerie ou fournir un .eml local.'})
    print('MAIL ACCESS UNAVAILABLE', flush=True)
    sys.exit(0)
found = json.loads(subprocess.check_output([sys.executable, str(adapter), 'search', instruction], text=True))
if len(found) != 1:
    item = call('add', {'request': 'Coordination : choisir le message source.', 'key': 'mail-choice-coordination'})
    claim = call('claim', {'run': item['run'], 'node': 'intent'})
    call('ask', {'run': item['run'], 'node': 'intent', 'token': claim['token'], 'text': 'Plusieurs messages correspondent : quelle référence faut-il lire ?'})
    print('MAIL CHOICE REQUIRED', flush=True)
    sys.exit(0)
download = json.loads(subprocess.check_output([sys.executable, str(adapter), 'read', found[0]['id']], text=True))
original = Path(download['path']).read_bytes()
source_hash = hashlib.sha256(original).hexdigest()
folder = Path(project['path']) / 'release' / 'synthetic-mail'
source = folder / 'sources' / source_hash
source.mkdir(parents=True, exist_ok=True)


def preserve(path, content):
    if path.exists():
        assert path.read_bytes() == content, 'A source must not be silently replaced'
    else:
        path.write_bytes(content)


preserve(source / 'original.eml', original)
from email import policy
from email.parser import BytesParser
message = BytesParser(policy=policy.default).parsebytes(original)
requests = [line.split(': ', 1)[1] for line in message.get_body(('plain',)).get_content().splitlines() if line[:2] in {'R1', 'R2', 'R3', 'R4'} and ': ' in line]
assert len(requests) == 4, 'The synthetic mail must describe four requests'
manifest = {'message': found[0]['id'], 'sha256': source_hash, 'original': 'original.eml', 'attachments': []}
for index, part in enumerate(message.iter_attachments(), 1):
    content = part.get_payload(decode=True)
    name = f'attachment-{index}.png'
    preserve(source / name, content)
    manifest['attachments'].append({'file': name, 'original_name': part.get_filename(), 'sha256': hashlib.sha256(content).hexdigest()})
preserve(source / 'provenance.json', json.dumps(manifest, sort_keys=True, indent=2).encode())
plan = '# Release préparée depuis le terminal\n\nPréparation locale seulement ; aucun déploiement.\n\n' + '\n'.join(f'- R{i}: {text}' for i, text in enumerate(requests, 1))
preserve(folder / 'README.md', plan.encode())
for index, description in enumerate(requests, 1):
    prefix = str(source.relative_to(Path(project['path'])))
    request = f'R{index}: {description}\nOriginal : {prefix}/original.eml\nPièces et empreintes : {prefix}/provenance.json\nPlan : release/synthetic-mail/README.md\nObservations à qualifier, pas une cause ni une QA attestée.'
    item = call('add', {'request': request, 'project': project['id'], 'key': f'{source_hash}:R{index}'})
    detail = call('inspect', {'run': item['run']})
    if detail['nodes']['intent']['status'] != 'ready':
        continue
    claim = call('claim', {'run': item['run'], 'node': 'intent'})
    call('result', {'run': item['run'], 'node': 'intent', 'token': claim['token'], 'result': {'ok': True, 'summary': 'Intention synthétique et références conservées.', 'outputs': {'intent': request}}})
    claim = call('claim', {'run': item['run'], 'node': 'plan'})
    if config.get('question_first') and index == 1:
        call('ask', {'run': item['run'], 'node': 'plan', 'token': claim['token'], 'text': 'Quelle règle de distance doit s’appliquer au devis ? La capture montre une incohérence, mais ne prouve pas la règle attendue.'})
        continue
    call('result', {'run': item['run'], 'node': 'plan', 'token': claim['token'], 'result': {'ok': True, 'summary': 'Plan préparé, en attente de validation.', 'outputs': {'plan': f'{plan}\n\nPérimètre de cette demande : R{index}. Les calculs de devis exigent une analyse complète ; pas Express.'}}})
print('MAIL RELEASE PREPARED', flush=True)

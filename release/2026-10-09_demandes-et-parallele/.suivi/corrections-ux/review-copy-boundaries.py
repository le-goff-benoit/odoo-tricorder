"""Independent synthetic counterexamples; no provider and no real project."""
import copy
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'backend'))
from workflow_engine import Engine
from workflow_engine.portable import export, import_definition

with tempfile.TemporaryDirectory(prefix='tricorder-review-copy-') as directory:
    engine = Engine(directory)
    source = engine.create_project('Association synthétique')
    destination = engine.create_project('Atelier synthétique')
    child = {'schema': 1, 'id': 'child', 'title': 'Préparer une invitation',
             'parameters': {'request': 'ANCIENNE_DEMANDE_SYNTHETIQUE', 'source_context': {'results': {'old': {'summary': 'ANCIEN_RESULTAT_SYNTHETIQUE'}}}, 'language': 'fr'},
             'nodes': [{'id': 'draft', 'kind': 'task', 'title': 'Rédiger', 'prompt': 'Préparer une invitation', 'outputs': {'invitation': 'string'}}], 'edges': []}
    graph = {'schema': 1, 'id': 'meeting', 'title': 'Réunion', 'parameters': {'request': 'DEMANDE_PARENTE', 'source_context': {'run': 'ANCIEN_RUN'}, 'timezone': 'Europe/Zurich'},
             'nodes': [{'id': 'prepare', 'kind': 'subworkflow', 'title': 'Préparer', 'workflow': 'child'}], 'edges': []}
    saved = engine.save(source['id'], graph)
    bundle = export(saved, {'child': child}, source['defaults'])
    # Keep the initial reproduction; --corrected exercises the real new helper.
    copied = copy.deepcopy(bundle)
    copied['workflow']['title'] = 'Réunion indépendante'
    if '--corrected' in sys.argv:
        script = 'import {reusableWorkflow} from ' + json.dumps((ROOT / 'src/workflow-design.mjs').as_uri()) + '; let input=""; for await (const chunk of process.stdin) input+=chunk; process.stdout.write(JSON.stringify(reusableWorkflow(JSON.parse(input))));'
        completed = subprocess.run(['/home/blegoff/.nvm/versions/node/v24.15.0/bin/node', '--input-type=module', '-e', script], input=json.dumps(copied['workflow']), text=True, capture_output=True, check=True)
        copied['workflow'] = json.loads(completed.stdout)
    else:
        copied['workflow']['parameters'].pop('request', None)
        copied['workflow']['parameters'].pop('source_context', None)
    imported = import_definition(engine, destination['id'], copied)
    assert imported['id'] != saved['id']
    assert engine.runs(destination['id']) == []
    assert imported['parameters'] == {'timezone': 'Europe/Zurich'}
    nested = next(node for node in imported['nodes'] if node['id'] == 'prepare.draft')
    if '--corrected' in sys.argv:
        assert nested['parameters'] == {'language': 'fr'}
    original = next(item for item in engine.workflows(source['id']) if item['id'] == saved['id'])
    print(json.dumps({'copied_parameters': imported['parameters'], 'nested_parameters': nested['parameters'], 'destination_runs': 0, 'original_parameters': original['parameters']}, ensure_ascii=False, indent=2))

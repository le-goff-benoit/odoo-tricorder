"""Runtime effect of the exact ambiguous edge created by the reviewed GUI."""
import json
from pathlib import Path
import sys
import tempfile
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / 'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.runtime import execute

with tempfile.TemporaryDirectory(prefix='tricorder-review-wiring-') as directory:
    engine = Engine(directory)
    project = engine.create_project('Invitation synthétique')
    graph = {'schema': 1, 'id': 'invitation', 'title': 'Choisir la version corrigée', 'nodes': [
        {'id': 'prepare', 'kind': 'task', 'title': 'Préparer', 'validation': 'contract', 'outputs': {'invitation': 'string', 'revised': 'string'}, 'sample_outputs': {'invitation': 'Ancienne invitation fictive', 'revised': 'Invitation fictive corrigée'}},
        {'id': 'review', 'kind': 'task', 'title': 'Relire', 'inputs': {'invitation': 'string'}}],
        'edges': [{'id': 'edge', 'from': 'prepare', 'to': 'review', 'mapping': {'invitation': 'invitation', 'revised': 'invitation'}}]}
    try:
        run = engine.start(project['id'], graph, simulation=True)
    except ContractError as error:
        if '--contract-reject' not in sys.argv:
            raise
        assert not engine.runs(project['id'])
        print(json.dumps({'rejected_before_start': str(error), 'runs_created': 0}, ensure_ascii=False))
        sys.exit(0)
    if '--contract-reject' in sys.argv:
        raise AssertionError('Ambiguous mapping was accepted before execution')
    claim = engine.claim(run['id'], 'prepare')
    try:
        with patch('workflow_engine.runtime.time.sleep'):
            execute(engine, run['id'], 'prepare', claim['token'])
    except ContractError as error:
        print(json.dumps({'error': str(error), 'source_state': engine.run(run['id'])['nodes']['prepare']['status'], 'target_state': engine.run(run['id'])['nodes']['review']['status']}, ensure_ascii=False))
    else:
        print('No conflict: verify the current implementation and report.')

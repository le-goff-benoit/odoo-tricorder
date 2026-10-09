import json
from pathlib import Path
import sys
import tempfile
from unittest.mock import patch

sys.path.insert(0, '/home/blegoff/odoo-tricorder/backend')
from workflow_engine import Engine
from workflow_engine.runtime import execute

for output in ('null', '[]', '42', '"unexpected"', '{"type":"item.completed","item":null}'):
    with tempfile.TemporaryDirectory(prefix='tricorder-review-provider-') as temporary:
        root = Path(temporary)
        script = root / 'inert.py'
        script.write_text('import sys\nsys.stdin.read()\nprint(' + repr(output) + ')\n')
        engine = Engine(root / 'state')
        project = engine.create_project('Projet synthétique')
        graph = {'schema': 1, 'id': 'provider', 'title': 'Relecture fournisseur', 'nodes': [
            {'id': 'work', 'kind': 'agent', 'title': 'Résultat synthétique', 'model': 'inert', 'provider': 'codex', 'outputs': {}, 'validation': 'contract'},
            {'id': 'approve', 'kind': 'decision', 'title': 'Relire', 'options': ['approve', 'reject']}],
            'edges': [{'id': 'next', 'from': 'work', 'to': 'approve'}]}
        run = engine.start(project['id'], graph)
        claim = engine.claim(run['id'], 'work')
        with patch('connectors.providers.command', return_value=[sys.executable, str(script)]):
            execute(engine, run['id'], 'work', claim['token'])
        result = engine.run(run['id'])
        print(json.dumps({'input': output, 'state': result['nodes']['work']['status'], 'summary': result['nodes']['work']['result']['summary'], 'next': result['nodes']['approve']['status'], 'transcripts_remaining': len(list((root / 'state/jobs').rglob('provider.ndjson')))}, ensure_ascii=False))

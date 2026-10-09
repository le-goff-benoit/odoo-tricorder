"""Activity gets an identifier, never a bulky conversation payload."""
import copy
import json
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / 'backend'))
from workflow_engine import Engine
from workflow_engine.projections import summary

with tempfile.TemporaryDirectory(prefix='tricorder-summary-review-') as directory:
    engine = Engine(directory)
    project = engine.create_project('Projection synthétique')
    graph = {'schema': 1, 'id': 'review', 'title': 'Relecture', 'nodes': [{'id': 'work', 'kind': 'task', 'title': 'Préparer'}], 'edges': []}
    for value in ('c-review', 'c' * 128, 'c' * 129, {'payload': 'x' * 1_000_000}, None):
        run = engine.start(project['id'], graph, simulation=True, parameters={'conversation': value})
        before = copy.deepcopy(run)
        compact = summary(run)
        assert compact['conversation'] == (value if isinstance(value, str) and len(value) <= 128 else None)
        assert len(json.dumps(compact).encode()) < 2_000
        assert run == before
        assert engine.run(run['id']) == before
        print(json.dumps({'input_type': type(value).__name__, 'input_length': len(value) if value is not None else None, 'kept': compact['conversation'] is not None, 'bytes': len(json.dumps(compact).encode())}))

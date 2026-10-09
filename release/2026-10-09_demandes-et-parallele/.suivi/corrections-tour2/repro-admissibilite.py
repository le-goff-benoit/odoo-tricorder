"""Independent synthetic review. No provider, subprocess, client or external action."""
import json
from pathlib import Path
import sys
import tempfile
from unittest.mock import patch

root = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(root / 'backend'))
from workflow_engine import Engine
from workflow_engine.conversations import Conversations
from workflow_engine.launch_readiness import LaunchReadiness
from workflow_engine.library import node
from workflow_engine.projections import run_page, run_detail
from workflow_engine.runtime import execute, preflight

catalog = [{'id': item, 'installed': True, 'usable': True, 'reason': 'Synthetic executor'} for item in ('codex', 'claude', 'command')]

def graph(nodes):
    return {'schema': 1, 'id': 'review-fixture', 'title': 'Review synthetic',
            'defaults': {'provider': 'codex', 'model': 'synthetic-model'},
            'nodes': nodes, 'edges': []}

def dump(engine):
    with engine.store.connect() as db:
        return '\n'.join(db.iterdump())

with tempfile.TemporaryDirectory() as directory, patch('workflow_engine.runtime.capabilities', return_value=catalog):
    engine = Engine(Path(directory) / 'state')
    project = engine.create_project('Review synthetic')
    process_patch = patch('workflow_engine.runtime.subprocess.Popen'); process = process_patch.start()
    provider_patch = patch('workflow_engine.runtime.execute_text'); provider = provider_patch.start()
    # A valid automatic simulation is incorrectly evaluated against the limited
    # kinds admitted by explicit conversation dispatch.
    definition = graph([node('task', 'Tâche simulée', 'task', validation='contract')])
    run = engine.start(project['id'], definition, simulation=True)
    before = dump(engine)
    launch = run_page(engine)['items'][0]['launch']
    assert dump(engine) == before
    claim = engine.claim(run['id'], 'task')
    with patch('workflow_engine.runtime.time.sleep'):
        execute(engine, run['id'], 'task', claim['token'])
    final = engine.run(run['id'])
    print(json.dumps({'case': 'automatic-simulation', 'preflight': preflight(definition, simulation=True), 'launch': launch, 'final_status': final['status'], 'task_status': final['nodes']['task']['status'], 'task_ok': final['nodes']['task']['result']['ok']}))
    # One ready worker plus one native-only task: the inspector currently uses
    # the aggregate label above the selected node-specific reason.
    service = Conversations(engine)
    definition = graph([node('agent', 'Agent disponible', 'agent'), node('task', 'Tâche terminal', 'task')])
    c = service.open(project['id'], definition, 'codex')
    item = service.add(c['id'], 'Review mixed launch statuses')
    before = dump(engine)
    launch = LaunchReadiness(engine).project(engine.run(item['run']))
    assert dump(engine) == before
    print(json.dumps({'case': 'mixed-node-label', 'launch': launch}))
    # The run-detail request intentionally bounds readiness to 25 rows. Nodes
    # beyond that remain selectable in the inspector but have no readiness row.
    definition = graph([node('a'+str(i), 'Agent '+str(i), 'agent') for i in range(25)] + [node('task', 'Tâche terminal hors page', 'task')])
    c = service.open(project['id'], definition, 'codex')
    item = service.add(c['id'], 'Review node beyond readiness projection')
    before = dump(engine)
    launch = LaunchReadiness(engine).project(engine.run(item['run']))
    assert dump(engine) == before
    print(json.dumps({'case': 'node-not-projected', 'launch': launch, 'selected_node': 'task'}))
    # Valid long request becomes a derived artifact in run_detail. The copy UI
    # currently passes that object to esc and to its launch textarea unchanged.
    definition = graph([node('agent', 'Agent disponible', 'agent')])
    run = engine.start(project['id'], definition, simulation=True, parameters={'request': 'Long synthetic request. '*500})
    projected = run_detail(engine, run)
    print(json.dumps({'case': 'copy-long-request', 'source_chars': len(run['parameters']['request']), 'projected_request_type': type(projected['parameters']['request']).__name__, 'projected_request': projected['parameters']['request']}))
    process.assert_not_called()
    provider.assert_not_called()

process_patch.stop()
provider_patch.stop()

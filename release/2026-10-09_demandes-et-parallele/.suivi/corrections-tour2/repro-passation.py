"""Independent reviewer reproduction; only synthetic Engine API writes."""
import json
from pathlib import Path
import sys
import tempfile

root = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(root / 'backend'), str(root / 'tests')]
from workflow_engine import Engine
from workflow_engine.documentation import export_work, markdown
from workflow_engine.business_markdown import value_lines

with tempfile.TemporaryDirectory(prefix='review-passation-') as directory:
    engine = Engine(directory)
    project = engine.create_project('Relecture synthétique')
    graph = {'schema': 1, 'id': 'report', 'title': 'Rapport', 'nodes': [{'id': 'work', 'kind': 'task', 'title': 'Travail documentaire', 'outputs': {'report': 'object'}}], 'edges': []}
    run = engine.start(project['id'], graph, simulation=True)
    proof = engine.artifact('Document synthétique'.encode())
    claim = engine.claim(run['id'], 'work')
    run = engine.submit(run['id'], 'work', claim['token'], {'ok': True, 'simulated': True, 'summary': 'Compte rendu disponible', 'outputs': {'report': {'$artifact': {**proof, 'filename': 'compte-rendu.txt', 'role': 'deliverable'}}}, 'evidence': []})
    output = Path(export_work(engine, run['id'], 'preuve-structuree'))
    print(json.dumps({'case': 'structured-proof-export', 'link_in_report': '.suivi/preuves/' + proof['sha256'] in output.read_text(), 'target_exists': (output.parent / '.suivi/preuves' / proof['sha256']).exists(), 'proof_readable_in_store': engine.evidence(proof).decode()}, ensure_ascii=False))
    run = engine.start(project['id'], graph, simulation=True)
    claim = engine.claim(run['id'], 'work')
    run = engine.submit(run['id'], 'work', claim['token'], {'ok': True, 'simulated': True, 'summary': 'Compte rendu disponible', 'outputs': {'report': {}}, 'evidence': [{**proof, 'filename': 'compte-rendu.txt', 'role': ['source', 'deliverable']}]})
    run = engine.accept(run['id'], 'work', human=True, checks=[], note='Preuve relue')
    try:
        metadata_report = markdown(run)
    except Exception as error:
        print(json.dumps({'case': 'non-string-proof-role', 'accepted_status': run['nodes']['work']['status'], 'error': repr(error)}, ensure_ascii=False))
    else:
        print(json.dumps({'case': 'non-string-proof-role', 'accepted_status': run['nodes']['work']['status'], 'error': None, 'filename_preserved': 'compte-rendu.txt' in metadata_report}, ensure_ascii=False))
    print(json.dumps({'case': 'nested-action-table', 'markdown': '\n'.join(value_lines({'actions': [{'action': 'Relire', 'owner': 'Alice', 'due': '2026-10-10', 'checks': [{'action': 'Vérifier', 'owner': 'Bob', 'due': '2026-10-09'}]}]}))}, ensure_ascii=False))

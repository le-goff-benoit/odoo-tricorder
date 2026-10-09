import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine
from workflow_engine.runtime import execute


class ProviderErrorTests(unittest.TestCase):
    def test_unreadable_provider_output_is_actionable_and_never_releases_the_next_decision(self):
        broken_result = {'summary': 'Résultat fictif', 'question': '', 'outputs': {'data': '{invalide'}}
        events = [{'type': 'item.completed', 'item': {'type': 'agent_message', 'text': json.dumps(broken_result)}}, {'type': 'turn.completed'}]
        invalid_shapes = [None, [], 42, 'unexpected', {'type': 'item.completed', 'item': None}, {'type': 'turn.failed', 'error': []}]
        for output in ('NOT_A_PROVIDER_RESPONSE', '\n'.join(json.dumps(event) for event in events), *(json.dumps(value) for value in invalid_shapes)):
            with self.subTest(output=output), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                script = root / 'inert_provider.py'
                script.write_text('import sys\nsys.stdin.read()\nprint(' + repr(output) + ')\n')
                engine = Engine(root / 'state')
                project = engine.create_project('Réponse fournisseur synthétique')
                graph = {'schema': 1, 'id': 'provider', 'title': 'Réponse à relire', 'nodes': [
                    {'id': 'work', 'kind': 'agent', 'title': 'Préparer le résultat', 'model': 'inert', 'provider': 'codex', 'outputs': {'data': 'object'}, 'validation': 'contract'},
                    {'id': 'approve', 'kind': 'decision', 'title': 'Relire le résultat', 'options': ['approve', 'reject']}],
                    'edges': [{'id': 'next', 'from': 'work', 'to': 'approve'}]}
                run = engine.start(project['id'], graph)
                claim = engine.claim(run['id'], 'work')
                with patch('connectors.providers.command', return_value=[sys.executable, str(script)]):
                    execute(engine, run['id'], 'work', claim['token'])
                result = engine.run(run['id'])
                self.assertEqual(result['nodes']['work']['status'], 'returned')
                self.assertFalse(result['nodes']['work']['result']['ok'])
                self.assertIn('format attendu', result['nodes']['work']['result']['summary'])
                self.assertIn('version', result['nodes']['work']['result']['summary'])
                self.assertNotIn('Expecting', result['nodes']['work']['result']['summary'])
                self.assertEqual(result['nodes']['approve']['status'], 'pending')
                self.assertFalse(list((root / 'state/jobs').rglob('provider.ndjson')))
                self.assertFalse(list((root / 'state/jobs').rglob('provider-error.txt')))

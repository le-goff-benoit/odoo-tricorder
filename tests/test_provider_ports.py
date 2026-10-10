"""Synthetic Codex/Claude streams exercise transport, not live providers."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from connectors.providers import Events, command, decode_outputs, result_schema
from workflow_engine import ContractError, Engine
from workflow_engine.contracts import validate_outputs
from workflow_engine.conversations import answer
from workflow_engine.runtime import execute


def work(provider='codex'):
    return {'id': 'work', 'kind': 'agent', 'title': 'Recueillir les intentions', 'model': 'synthetic-model',
            'provider': provider, 'validation': 'contract', 'outputs': {
                'intentions': {'type': 'array', 'items': 'string', 'minItems': 1},
                'note': {'type': 'string', 'required': False}}}


def stream(provider, value):
    if provider == 'codex':
        return [{'type': 'item.completed', 'item': {'type': 'agent_message', 'text': json.dumps(value)}},
                {'type': 'turn.completed', 'usage': {'input_tokens': 3, 'output_tokens': 5}}]
    return [{'type': 'system', 'subtype': 'init', 'tools': ['StructuredOutput']},
            {'type': 'result', 'structured_output': value, 'usage': {'input_tokens': 3, 'output_tokens': 5}}]


class ProviderPortTests(unittest.TestCase):
    def consume(self, provider, value):
        events = Events(provider, 'run', 'work', 1)
        for item in stream(provider, value):
            events.consume(item)
        return events.finish('synthetic-model')

    def test_schema_allows_question_without_business_outputs(self):
        schema = result_schema(work(), schema=2)
        self.assertEqual(set(schema['required']), {'summary', 'question', 'outputs_json'})
        self.assertEqual(schema['properties']['outputs_json']['type'], 'string')
        self.assertNotIn('intentions', schema['properties'])
        for provider in ('codex', 'claude'):
            with self.subTest(provider=provider):
                result = self.consume(provider, {'summary': 'Précision nécessaire', 'question': 'Quel périmètre ?', 'outputs_json': '{}'})
                self.assertEqual(result['outputs'], {})
                self.assertEqual(decode_outputs(work(provider), result, schema=2), result)

    def test_final_output_can_omit_optional_values_but_still_obeys_contract(self):
        for provider in ('codex', 'claude'):
            for value in ({'intentions': ['Une intention']}, {'intentions': ['Une'], 'note': ''}):
                with self.subTest(provider=provider, value=value):
                    result = self.consume(provider, {'summary': 'Résultat', 'question': '', 'outputs_json': json.dumps(value)})
                    decode_outputs(work(provider), result, schema=2)
                    validate_outputs(work(provider), result)
                    self.assertEqual(result['outputs'], value)
            for value in ({}, {'intentions': []}, {'intentions': [1]}, {'intentions': ['Une'], 'note': None}):
                with self.subTest(provider=provider, invalid=value):
                    result = self.consume(provider, {'summary': 'Résultat', 'question': '', 'outputs_json': json.dumps(value)})
                    with self.assertRaises(ContractError):
                        validate_outputs(work(provider), result)

    def test_invalid_json_or_ambiguous_envelope_is_rejected(self):
        for provider in ('codex', 'claude'):
            for value in ('{invalide', '[]', 'null', 0):
                with self.subTest(provider=provider, value=value), self.assertRaises(ContractError):
                    self.consume(provider, {'summary': 'Résultat', 'question': '', 'outputs_json': value})
            with self.assertRaises(ContractError):
                self.consume(provider, {'summary': 'Résultat', 'question': '', 'outputs_json': '{}', 'outputs': {}})

    def test_legacy_fixture_and_cli_schema_still_decode(self):
        legacy = {'id': 'work', 'kind': 'agent', 'title': 'Historique', 'outputs': {'intentions': 'array', 'plan': 'string'}}
        self.assertEqual(set(result_schema(legacy)['properties']['outputs']['required']), {'intentions', 'plan'})
        for provider in ('codex', 'claude'):
            result = self.consume(provider, {'summary': 'Historique', 'outputs': {'intentions': '["Une"]', 'plan': 'Un plan'}})
            decode_outputs(legacy, result)
            self.assertEqual(result['outputs']['intentions'], ['Une'])
            validate_outputs(legacy, result)

    def test_both_actual_command_builders_emit_the_v2_transport(self):
        with tempfile.TemporaryDirectory() as temporary:
            for provider in ('codex', 'claude'):
                with self.subTest(provider=provider), patch('connectors.providers.shutil.which', return_value='/synthetic/' + provider):
                    args = command(work(provider), temporary, schema=2)
                if provider == 'codex':
                    schema = json.loads(Path(args[args.index('--output-schema') + 1]).read_text())
                else:
                    schema = json.loads(args[args.index('--json-schema') + 1])
                self.assertEqual(set(schema['required']), {'summary', 'question', 'outputs_json'})

    def test_inert_cli_question_then_result_uses_engine_reception_for_both_providers(self):
        for provider in ('codex', 'claude'):
            with self.subTest(provider=provider), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                engine = Engine(root / 'state')
                project = engine.create_project('Dialogue synthétique')
                definition = {'schema': 2, 'id': 'dialogue', 'title': 'Intentions', 'nodes': [work(provider)], 'edges': []}
                run = engine.start(project['id'], definition)
                payloads = [
                    {'summary': 'Une précision', 'question': 'Quel périmètre ?', 'outputs_json': '{}'},
                    {'summary': 'Deux intentions recueillies', 'question': '', 'outputs_json': '{"intentions":["Corriger","Documenter"]}'}]
                for index, payload in enumerate(payloads):
                    script = root / 'inert.py'
                    output = '\n'.join(json.dumps(event) for event in stream(provider, payload))
                    script.write_text('import sys\nsys.stdin.read()\nprint(' + repr(output) + ')\n')
                    claim = engine.claim(run['id'], 'work')
                    with patch('connectors.providers.command', return_value=[sys.executable, str(script)]):
                        execute(engine, run['id'], 'work', claim['token'])
                    current = engine.run(run['id'])
                    if index == 0:
                        self.assertEqual(current['nodes']['work']['status'], 'waiting_input')
                        question = current['nodes']['work']['question']
                        answer(engine, run['id'], 'work', question['id'], 'Les deux demandes')
                    else:
                        self.assertEqual(current['nodes']['work']['status'], 'accepted')
                        self.assertEqual(current['nodes']['work']['result']['outputs'], {'intentions': ['Corriger', 'Documenter']})
                        self.assertEqual(current['nodes']['work']['attempt'], 1)
                        self.assertEqual(current['status'], 'completed')


if __name__ == '__main__':
    unittest.main()

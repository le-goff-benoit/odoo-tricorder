"""Reject ambiguous mappings before a workflow can start, without banning joins."""
import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine.contracts import ContractError, validate


class ConnectionContractTests(unittest.TestCase):
    def graph(self):
        return {'schema': 1, 'id': 'connection', 'title': 'Relire la version corrigée', 'nodes': [
            {'id': 'draft', 'kind': 'task', 'title': 'Rédiger', 'outputs': {'invitation': 'string', 'revised': 'string'}},
            {'id': 'review', 'kind': 'task', 'title': 'Relire', 'inputs': {'invitation': 'string'}},
        ], 'edges': [{'id': 'data', 'from': 'draft', 'to': 'review', 'mapping': {'invitation': 'invitation', 'revised': 'invitation'}}]}

    def test_duplicate_destination_is_rejected_before_execution_and_explicit_replacement_is_valid(self):
        graph = self.graph()
        with self.assertRaisesRegex(ContractError, 'Relire : choisissez une seule sortie par entrée'):
            validate(graph)
        graph['edges'][0]['mapping'] = {'revised': 'invitation'}
        self.assertEqual(validate(graph), graph)

    def test_separate_prerequisites_can_still_supply_the_same_join_input(self):
        graph = self.graph()
        graph['nodes'].append({'id': 'second', 'kind': 'task', 'title': 'Autre source', 'outputs': {'invitation': 'string'}})
        graph['edges'][0]['mapping'] = {'invitation': 'invitation'}
        graph['edges'].append({'id': 'other', 'from': 'second', 'to': 'review', 'mapping': {'invitation': 'invitation'}})
        self.assertEqual(validate(copy.deepcopy(graph)), graph)

    def test_invalid_mapping_shape_has_an_actionable_contract_error(self):
        for mapping in ([], {'invitation': ['invitation']}):
            with self.subTest(mapping=mapping):
                graph = self.graph(); graph['edges'][0]['mapping'] = mapping
                with self.assertRaisesRegex(ContractError, 'associer chaque sortie à une entrée'):
                    validate(graph)

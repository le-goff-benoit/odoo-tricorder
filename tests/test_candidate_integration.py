"""Synthetic code contributions through public engine APIs and real command QA."""
import copy
import errno
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.library import node, edge
from workflow_engine.runtime import execute
from connectors import candidates, candidate_integration


class CandidateIntegrationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='tricorder-integration-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.engine = Engine(self.root / 'state')
        self.project = self.engine.create_project('Synthetic integration')
        self.repo = Path(self.project['path'])
        (self.repo / 'a.py').write_text('a = 0\n')
        (self.repo / 'b.py').write_text('b = 0\n')
        self.job = 0

    def start(self, dependent=False):
        qa = ['python3', '-c', 'exec(open("/project/a.py").read()); exec(open("/project/b.py").read()); assert a + b < 3']
        nodes = [node('a', 'First code change', 'agent', model='fixture', execution_mode='edit', outputs={'candidate': 'object'}),
                 node('b', 'Second code change', 'agent', model='fixture', execution_mode='edit', outputs={'candidate': 'object'},
                      **({'inputs': {'candidate': 'object'}} if dependent else {})),
                 node('qa-a', 'Individual QA A', 'command', inputs={'candidate': 'object'}, candidate_check=True, argv=qa, validation='automatic'),
                 node('qa-b', 'Individual QA B', 'command', inputs={'candidate': 'object'}, candidate_check=True, argv=qa, validation='automatic'),
                 node('collect', 'Collect received contributions', 'task', outputs={'contributions': 'array'}),
                 node('integrate', 'Integrate code', 'integrate', inputs={'contributions': 'array'}, outputs={'candidate': 'object'}),
                 node('qa', 'Common QA', 'command', inputs={'candidate': 'object'}, candidate_check=True, argv=qa, validation='automatic'),
                 node('approve', 'Review common candidate', 'decision')]
        edges = [{**edge('a', 'qa-a'), 'mapping': {'candidate': 'candidate'}},
                 {**edge('b', 'qa-b'), 'mapping': {'candidate': 'candidate'}},
                 edge('qa-a', 'collect'), edge('qa-b', 'collect'),
                 {**edge('collect', 'integrate'), 'mapping': {'contributions': 'contributions'}},
                 {**edge('integrate', 'qa'), 'mapping': {'candidate': 'candidate'}}, edge('qa', 'approve')]
        if dependent:
            edges.append({**edge('a', 'b'), 'mapping': {'candidate': 'candidate'}})
        self.run = self.engine.start(self.project['id'], {'schema': 2, 'id': 'integrated-code', 'title': 'Parallel code', 'nodes': nodes, 'edges': edges})
        return self.run

    def propose(self, nid, changes, base_candidate=None):
        claimed = self.engine.claim(self.run['id'], nid)
        run = self.engine.run(self.run['id'])
        self.job += 1
        prepared = candidates.prepare(self.engine, run, self.root / f'job-{self.job}', base_candidate=base_candidate)
        for name, content in changes.items():
            path = prepared['workspace'] / name
            if content is None:
                path.unlink()
            else:
                path.parent.mkdir(exist_ok=True, parents=True)
                path.write_text(content)
        reference, diff = candidates.capture(self.engine, run, prepared)
        self.engine.submit(run['id'], nid, claimed['token'], {'ok': True, 'summary': 'Synthetic code proposal',
                            'outputs': {'candidate': reference}, 'evidence': [reference, diff]})
        self.engine.accept(run['id'], nid, human=True, checks=[])
        return {'run': run['id'], 'node': nid, 'attempt': run['nodes'][nid]['attempt'], 'candidate': reference}, prepared

    def command(self, nid):
        claim = self.engine.claim(self.run['id'], nid)
        execute(self.engine, self.run['id'], nid, claim['token'])
        return self.engine.run(self.run['id'])['nodes'][nid]

    def stage(self, contributions, individual_qa=True):
        if individual_qa:
            for nid in ['qa-a', 'qa-b']:
                self.assertEqual(self.command(nid)['status'], 'accepted')
        claim = self.engine.claim(self.run['id'], 'collect')
        self.engine.submit(self.run['id'], 'collect', claim['token'], {'ok': True, 'summary': 'Contributions received', 'outputs': {'contributions': contributions}})
        self.engine.accept(self.run['id'], 'collect', human=True, checks=[])
        claim = self.engine.claim(self.run['id'], 'integrate')
        run = self.engine.run(self.run['id'])
        integration_node = next(n for n in run['definition']['nodes'] if n['id'] == 'integrate')
        return run, integration_node, run['nodes']['integrate'], claim

    def integrate(self, staged):
        run, integration_node, state, claim = staged
        result = candidate_integration.integrate(self.engine, run, integration_node, state)
        self.engine.submit(run['id'], 'integrate', claim['token'], result)
        self.engine.accept(run['id'], 'integrate', human=True, checks=[])
        return result

    def test_individually_green_changes_fail_common_qa_and_never_apply(self):
        self.start()
        a, _ = self.propose('a', {'a.py': 'a = 2\n'})
        b, _ = self.propose('b', {'b.py': 'b = 2\n'})
        result = self.integrate(self.stage([a, b]))
        self.assertEqual(self.command('qa')['result']['exit_code'], 1)
        self.assertEqual(self.engine.run(self.run['id'])['nodes']['qa']['status'], 'returned')
        with self.assertRaisesRegex(ContractError, 'tests liés'):
            candidates.apply(self.engine, self.run['id'], 'integrate', result['outputs']['candidate']['sha256'], human=True)
        self.assertEqual((self.repo / 'a.py').read_text(), 'a = 0\n')
        self.assertEqual((self.repo / 'b.py').read_text(), 'b = 0\n')
        self.assertEqual(candidates.load(self.engine, a['candidate'], self.project['id'])['changes'][0]['content'], 'a = 2\n')

    def test_common_qa_exact_sha_decision_and_confirmation_precede_application(self):
        self.start()
        a, _ = self.propose('a', {'a.py': 'a = 1\n'})
        b, _ = self.propose('b', {'b.py': 'b = 1\n'})
        staged = self.stage([b, a])
        result = candidate_integration.integrate(self.engine, *staged[:3])
        staged[2]['inputs']['contributions'].reverse()
        permuted = candidate_integration.integrate(self.engine, *staged[:3])
        self.assertEqual(result['outputs']['candidate'], permuted['outputs']['candidate'])
        result = self.integrate(staged)
        reference = result['outputs']['candidate']
        with self.assertRaisesRegex(ContractError, 'tests liés'):
            candidates.apply(self.engine, self.run['id'], 'integrate', reference['sha256'], human=True)
        self.assertEqual(self.command('qa')['status'], 'accepted')
        with self.assertRaisesRegex(ContractError, 'tests liés'):
            candidates.apply(self.engine, self.run['id'], 'integrate', reference['sha256'], human=True)
        decision = self.engine.run(self.run['id'])['nodes']['approve']
        self.engine.decide(self.run['id'], 'approve', decision['nonce'], decision['proposal'], 'approve', human=True)
        with self.assertRaisesRegex(ContractError, 'humaine'):
            candidates.apply(self.engine, self.run['id'], 'integrate', reference['sha256'])
        candidates.apply(self.engine, self.run['id'], 'integrate', reference['sha256'], human=True)
        self.assertEqual((self.repo / 'a.py').read_text(), 'a = 1\n')
        self.assertEqual((self.repo / 'b.py').read_text(), 'b = 1\n')

    def test_code_dependency_materializes_predecessor_and_produces_cumulative_candidate(self):
        self.start(dependent=True)
        a, _ = self.propose('a', {'a.py': 'a = 1\n'})
        b, prepared = self.propose('b', {'b.py': 'b = 1\n'}, base_candidate=a['candidate'])
        self.assertEqual((prepared['base'] / 'a.py').read_text(), 'a = 0\n')
        self.assertEqual((prepared['workspace'] / 'a.py').read_text(), 'a = 1\n')
        self.assertEqual(prepared['context']['contents']['a.py'], 'a = 1\n')
        self.assertEqual(prepared['parent_candidate'], a)
        result = self.integrate(self.stage([a, b]))
        combined = candidates.load(self.engine, result['outputs']['candidate'], self.project['id'])
        self.assertEqual([c['path'] for c in combined['changes']], ['a.py', 'b.py'])
        self.assertEqual(self.command('qa')['status'], 'accepted')

    def test_verified_descendant_supersedes_ancestor_change_on_same_file(self):
        self.start(dependent=True)
        a, _ = self.propose('a', {'a.py': 'a = 1\n'})
        b, _ = self.propose('b', {'a.py': 'a = 2\n'}, base_candidate=a['candidate'])
        result = self.integrate(self.stage([a, b]))
        combined = candidates.load(self.engine, result['outputs']['candidate'], self.project['id'])
        self.assertEqual(combined['changes'], [{'path': 'a.py', 'before': combined['files']['a.py']['sha256'], 'content': 'a = 2\n'}])

    def test_unapproved_code_base_is_not_materialized(self):
        self.start()
        a, _ = self.propose('a', {'a.py': 'a = 1\n'})
        self.engine.claim(self.run['id'], 'b')
        with self.assertRaisesRegex(ContractError, 'étape précédente'):
            candidates.prepare(self.engine, self.engine.run(self.run['id']), self.root / 'unapproved-base', base_candidate=a['candidate'])
        self.assertFalse((self.root / 'unapproved-base').exists())

    def test_same_file_conflict_is_explicit_and_preserves_sources(self):
        self.start()
        a, _ = self.propose('a', {'a.py': 'a = 1\n'})
        b, _ = self.propose('b', {'a.py': 'a = 2\n'})
        with self.assertRaisesRegex(ContractError, 'Conflit sur a.py'):
            candidate_integration.integrate(self.engine, *self.stage([a, b])[:3])
        self.assertEqual((self.repo / 'a.py').read_text(), 'a = 0\n')

    def test_identical_changes_are_deduplicated(self):
        self.start()
        a, _ = self.propose('a', {'a.py': 'a = 1\n'})
        b, _ = self.propose('b', {'a.py': 'a = 1\n'})
        result = self.integrate(self.stage([a, b]))
        self.assertEqual(len(candidates.load(self.engine, result['outputs']['candidate'], self.project['id'])['changes']), 1)

    def test_file_directory_collision_is_rejected_before_materialization(self):
        self.start()
        a, _ = self.propose('a', {'new': 'file\n'})
        b, _ = self.propose('b', {'new/child': 'nested\n'})
        with self.assertRaisesRegex(ContractError, 'Conflit fichier/dossier'):
            candidate_integration.integrate(self.engine, *self.stage([a, b])[:3])
        self.assertFalse((self.repo / 'new').exists())

    def test_changed_sources_or_attempt_or_forged_reference_are_rejected(self):
        self.start()
        a, _ = self.propose('a', {'a.py': 'a = 1\n'})
        b, _ = self.propose('b', {'b.py': 'b = 1\n'})
        staged = self.stage([a, b])
        altered = copy.deepcopy(staged)
        altered[2]['inputs']['contributions'][0]['attempt'] += 1
        with self.assertRaisesRegex(ContractError, 'tentative'):
            candidate_integration.integrate(self.engine, *altered[:3])
        altered = copy.deepcopy(staged)
        altered[2]['inputs']['contributions'][0]['candidate'] = b['candidate']
        with self.assertRaisesRegex(ContractError, 'référence'):
            candidate_integration.integrate(self.engine, *altered[:3])
        (self.repo / 'b.py').write_text('b = 100\n')
        with self.assertRaisesRegex(ContractError, 'sources ont changé'):
            candidate_integration.integrate(self.engine, *staged[:3])

    def test_imported_common_candidate_cannot_bypass_engine_receipt(self):
        self.start()
        a, _ = self.propose('a', {'a.py': 'a = 1\n'})
        b, _ = self.propose('b', {'b.py': 'b = 1\n'})
        run, integration_node, state, claim = self.stage([a, b])
        result = candidate_integration.integrate(self.engine, run, integration_node, state)
        candidate = candidates.load(self.engine, result['outputs']['candidate'], self.project['id'])
        candidate['changes'][0]['content'] = 'a = 999\n'
        forged = self.engine.artifact(json.dumps(candidate).encode())
        result['outputs']['candidate'] = forged
        result['evidence'] = [forged]
        self.engine.submit(run['id'], 'integrate', claim['token'], result)
        with self.assertRaisesRegex(ContractError, 'ne correspond plus'):
            self.engine.accept(run['id'], 'integrate', human=True, checks=[])
        self.assertEqual(self.engine.run(run['id'])['nodes']['qa']['status'], 'pending')

    def test_source_change_after_integration_is_rechecked_on_receipt(self):
        self.start()
        a, _ = self.propose('a', {'a.py': 'a = 1\n'})
        b, _ = self.propose('b', {'b.py': 'b = 1\n'})
        run, integration_node, state, claim = self.stage([a, b])
        result = candidate_integration.integrate(self.engine, run, integration_node, state)
        self.engine.submit(run['id'], 'integrate', claim['token'], result)
        (self.repo / 'b.py').write_text('b = 10\n')
        with self.assertRaisesRegex(ContractError, 'sources ont changé'):
            self.engine.accept(run['id'], 'integrate', human=True, checks=[])
        self.assertEqual((self.repo / 'b.py').read_text(), 'b = 10\n')

    def test_different_family_contribution_is_rejected(self):
        original = self.start()
        a, _ = self.propose('a', {'a.py': 'a = 1\n'})
        b, _ = self.propose('b', {'b.py': 'b = 1\n'})
        staged = self.stage([a, b])
        self.start()
        other, _ = self.propose('a', {'a.py': 'a = 1\n'})
        staged[2]['inputs']['contributions'][0] = other
        with self.assertRaisesRegex(ContractError, 'hors du périmètre'):
            candidate_integration.integrate(self.engine, *staged[:3])
        self.run = original

    def test_disk_failure_during_integration_keeps_original_and_child_proofs(self):
        self.start()
        a, _ = self.propose('a', {'a.py': 'a = 1\n'})
        b, _ = self.propose('b', {'b.py': 'b = 1\n'})
        staged = self.stage([a, b])
        with patch.object(candidates, '_write', side_effect=OSError(errno.ENOSPC, 'Synthetic full disk')):
            with self.assertRaisesRegex(ContractError, 'disque est plein.*intégration'):
                candidate_integration.integrate(self.engine, *staged[:3])
        self.assertFalse(list(self.engine.store.directory.glob('candidate-integration-*')))
        self.assertEqual((self.repo / 'a.py').read_text(), 'a = 0\n')
        self.assertTrue(self.engine.evidence(a['candidate']))

    def test_cumulative_file_limit_rejects_entire_lot_without_truncation(self):
        self.start()
        a, _ = self.propose('a', {f'a-{i}.txt': 'A\n' for i in range(60)})
        b, _ = self.propose('b', {f'b-{i}.txt': 'B\n' for i in range(60)})
        with self.assertRaisesRegex(ContractError, 'lot intégré dépasse 100 fichiers'):
            candidate_integration.integrate(self.engine, *self.stage([a, b])[:3])
        self.assertFalse((self.repo / 'a-0.txt').exists())

    def test_cumulative_size_limit_rejects_entire_lot_without_truncation(self):
        self.start()
        a, _ = self.propose('a', {'large-a.txt': 'a' * 1_050_000})
        b, _ = self.propose('b', {'large-b.txt': 'b' * 1_050_000})
        with self.assertRaisesRegex(ContractError, 'candidat commun.*2 Mo.*Réduisez le lot'):
            candidate_integration.integrate(self.engine, *self.stage([a, b])[:3])
        self.assertFalse((self.repo / 'large-a.txt').exists())

    def test_common_application_rolls_back_all_files_on_database_failure(self):
        self.start()
        a, _ = self.propose('a', {'a.py': 'a = 1\n'})
        b, _ = self.propose('b', {'b.py': 'b = 1\n'})
        result = self.integrate(self.stage([a, b]))
        self.assertEqual(self.command('qa')['status'], 'accepted')
        decision = self.engine.run(self.run['id'])['nodes']['approve']
        self.engine.decide(self.run['id'], 'approve', decision['nonce'], decision['proposal'], 'approve', human=True)
        with patch.object(self.engine, '_save', side_effect=OSError('Synthetic database failure')):
            with self.assertRaisesRegex(OSError, 'database failure'):
                candidates.apply(self.engine, self.run['id'], 'integrate', result['outputs']['candidate']['sha256'], human=True)
        self.assertEqual((self.repo / 'a.py').read_text(), 'a = 0\n')
        self.assertEqual((self.repo / 'b.py').read_text(), 'b = 0\n')
        self.assertNotIn('applied_candidate', self.engine.run(self.run['id'])['nodes']['integrate'])

    def family(self):
        from workflow_engine.iterations import activate
        argv = ['python3', '-c', 'exec(open("/project/a.py").read()); exec(open("/project/b.py").read()); assert a + b < 3']
        child = {'schema': 2, 'id': 'child-code', 'title': 'One code contribution', 'nodes': [
            node('edit', 'Implement element', 'agent', model='fixture', execution_mode='edit',
                 inputs={'item': 'any', 'candidate': {'type': 'object', 'required': False}}, outputs={'candidate': 'object'}),
            node('qa', 'Individual QA', 'command', inputs={'candidate': 'object'}, candidate_check=True, argv=argv, validation='automatic')],
            'edges': [{**edge('edit', 'qa'), 'mapping': {'candidate': 'candidate'}}]}
        graph = {'schema': 2, 'id': 'family-code', 'title': 'Plan and work by element', 'nodes': [
            node('plan', 'Prepare the plan', 'task', outputs={'items': 'array'}),
            node('approve', 'Approve this exact plan', 'decision', inputs={'items': 'array'}, outputs={'items': 'array'}),
            node('each', 'Process plan elements', 'foreach', inputs={'items': 'array'}, workflow=child,
                 outputs={'results': 'array', 'contributions': 'array'}, concurrency=2),
            node('integrate', 'Common candidate', 'integrate', inputs={'contributions': 'array'}, outputs={'candidate': 'object'}),
            node('qa', 'Common QA', 'command', inputs={'candidate': 'object'}, candidate_check=True, argv=argv, validation='automatic')],
            'edges': [{**edge('plan', 'approve'), 'mapping': {'items': 'items'}},
                      {**edge('approve', 'each', 'approve'), 'mapping': {'items': 'items'}},
                      {**edge('each', 'integrate'), 'mapping': {'contributions': 'contributions'}},
                      {**edge('integrate', 'qa'), 'mapping': {'candidate': 'candidate'}}]}
        parent = self.engine.start(self.project['id'], graph)
        claim = self.engine.claim(parent['id'], 'plan')
        self.engine.submit(parent['id'], 'plan', claim['token'], {'ok': True, 'summary': 'Two scoped changes', 'outputs': {'items': [
            {'id': 'R1', 'title': 'First code contribution'},
            {'id': 'R2', 'title': 'Dependent contribution', 'depends_on': ['R1'], 'base_from': 'R1'}]}})
        parent = self.engine.accept(parent['id'], 'plan', human=True, checks=[])
        decision = parent['nodes']['approve']
        self.engine.decide(parent['id'], 'approve', decision['nonce'], decision['proposal'], 'approve', human=True)
        catalog = [{'id': 'codex', 'installed': True}, {'id': 'claude', 'installed': False}, {'id': 'command', 'usable': True}]
        with patch('workflow_engine.runtime.capabilities', return_value=catalog):
            parent = activate(self.engine, parent['id'], 'each')
        return parent

    def test_parent_iteration_code_dependency_and_common_candidate(self):
        from workflow_engine.iterations import tick
        parent = self.family()
        children = parent['nodes']['each']['children']
        self.run = self.engine.run(children[0]['run'])
        a, _ = self.propose('edit', {'a.py': 'a = 1\n'})
        self.assertEqual(self.command('qa')['status'], 'accepted')
        parent = tick(self.engine, parent['id'])
        self.run = self.engine.run(children[1]['run'])
        self.assertEqual(self.run['parameters']['code_base_run'], children[0]['run'])
        self.assertEqual(self.run['nodes']['edit']['inputs']['candidate'], a['candidate'])
        b, prepared = self.propose('edit', {'b.py': 'b = 1\n'}, base_candidate=a['candidate'])
        self.assertEqual((prepared['workspace'] / 'a.py').read_text(), 'a = 1\n')
        self.assertEqual(self.command('qa')['status'], 'accepted')
        self.run = tick(self.engine, parent['id'])
        self.assertEqual(self.run['nodes']['each']['status'], 'accepted')
        claim = self.engine.claim(parent['id'], 'integrate')
        parent = self.engine.run(parent['id'])
        integration_node = next(n for n in parent['definition']['nodes'] if n['id'] == 'integrate')
        staged = (parent, integration_node, parent['nodes']['integrate'], claim)
        altered = copy.deepcopy(staged)
        altered[0]['nodes']['each']['children'].pop()
        with self.assertRaisesRegex(ContractError, 'n’appartient plus'):
            candidate_integration.integrate(self.engine, *altered[:3])
        result = self.integrate(staged)
        combined = candidates.load(self.engine, result['outputs']['candidate'], self.project['id'])
        self.assertEqual(combined['source_run'], parent['id'])
        self.assertEqual({c['run'] for c in combined['integration']['contributions']}, {a['run'], b['run']})
        self.assertEqual(self.command('qa')['status'], 'accepted')
        self.assertEqual((self.repo / 'a.py').read_text(), 'a = 0\n')
        self.assertEqual((self.repo / 'b.py').read_text(), 'b = 0\n')

    def test_completed_child_cannot_apply_after_parent_cancellation(self):
        parent = self.family()
        self.run = self.engine.run(parent['nodes']['each']['children'][0]['run'])
        a, _ = self.propose('edit', {'a.py': 'a = 1\n'})
        self.assertEqual(self.command('qa')['status'], 'accepted')
        self.assertEqual(self.engine.run(self.run['id'])['status'], 'completed')
        self.engine.control(parent['id'], 'cancel')
        with self.assertRaisesRegex(ContractError, 'parent a été annulé'):
            candidates.apply(self.engine, self.run['id'], 'edit', a['candidate']['sha256'], human=True)
        self.assertEqual((self.repo / 'a.py').read_text(), 'a = 0\n')


if __name__ == '__main__':
    unittest.main()

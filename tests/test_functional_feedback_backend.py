"""Regression journeys from the independent business-user campaign.

Synthetic projects only. Template simulations use the real worker result and
engine contracts; no external provider, command, email or deployment is invoked.
"""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError
from workflow_engine.conversations import Conversations, answer
from workflow_engine.launch_readiness import LaunchReadiness
from workflow_engine.library import templates, node, edge
from workflow_engine.runtime import execute, dispatch_conversation
from workflow_cli import request


class FunctionalFeedbackBackendTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.engine = Engine(self.root / 'state')
        self.project = self.engine.create_project('Projet synthétique')
        self.service = Conversations(self.engine)
        self.catalog = [{'id': key, 'installed': True, 'usable': True, 'reason': 'Synthetic executor'}
                        for key in ('codex', 'claude', 'command')]
        patcher = patch('workflow_engine.runtime.capabilities', return_value=self.catalog)
        self.capabilities = patcher.start()
        self.addCleanup(patcher.stop)

    def graph(self, *nodes, edges=None):
        return {'schema': 1, 'id': 'fixture', 'title': 'Travail synthétique',
                'defaults': {'provider': 'codex', 'model': 'fixture-model'},
                'nodes': list(nodes) or [node('work', 'Analyser', 'agent', validation='contract')],
                'edges': edges or []}

    def open(self, graph=None):
        value = self.service.open(self.project['id'], graph or self.graph(), 'codex')
        item = self.service.add(value['id'], 'Une demande synthétique')
        return value, item

    def launch(self, cid):
        return self.service.snapshot(cid, limit=25)['items'][0]['execution']['launch']

    def database(self):
        with self.engine.store.connect() as db:
            return '\n'.join(db.iterdump())

    def simulate(self, graph, decisions=None, parameters=None, *, run_id=None):
        run = self.engine.run(run_id) if run_id else self.engine.start(self.project['id'], graph, simulation=True, parameters=parameters)
        interactions = []
        with patch('workflow_engine.runtime.time.sleep'), patch('workflow_engine.runtime.execute_text') as provider, patch('workflow_engine.runtime.subprocess.Popen') as process:
            for _ in range(100):
                run = self.engine.run(run['id'])
                if run['status'] == 'completed':
                    provider.assert_not_called(); process.assert_not_called()
                    return run, interactions
                progressed = False
                definitions = {n['id']: n for n in run['definition']['nodes']}
                for nid, state in run['nodes'].items():
                    self.assertNotIn('validation_error', state, f'{graph["id"]}/{nid}: {state}')
                    if state['status'] == 'collecting':
                        from workflow_engine.collection import change
                        port = next(iter(definitions[nid]['outputs'].values()))
                        minimum = port.get('minItems', 0) if isinstance(port, dict) else 0
                        for index in range(minimum):
                            change(self.engine, run['id'], nid, index, 'add', key=f'example-{index}', text=f'Intention synthétique {index + 1}')
                        change(self.engine, run['id'], nid, minimum, 'close', key='example-close')
                        interactions.append((nid, 'collect')); progressed = True
                    elif state['status'] == 'ready' and definitions[nid]['kind'] == 'foreach':
                        from workflow_engine.iterations import activate
                        activate(self.engine, run['id'], nid)
                        progressed = True
                    elif state['status'] == 'waiting_children':
                        from workflow_engine.iterations import tick
                        for member in state['children']:
                            child = self.engine.run(member['run'])
                            if child['status'] == 'active':
                                self.simulate(child['definition'], decisions, run_id=child['id'])
                                progressed = True
                                tick(self.engine, run['id'])
                        tick(self.engine, run['id'])
                    elif state['status'] == 'ready':
                        claim = self.engine.claim(run['id'], nid)
                        execute(self.engine, run['id'], nid, claim['token'])
                        result = self.engine.run(run['id'])['nodes'][nid]['result']
                        self.assertTrue(result['ok']); self.assertTrue(result['simulated'])
                        self.assertTrue(result['summary'].startswith('SIMULATION'))
                        progressed = True
                    elif state['status'] == 'returned':
                        self.engine.accept(run['id'], nid, human=True, checks=definitions[nid].get('criteria', []), note='Exemple reçu, aucun contrôle métier attesté.')
                        interactions.append((nid, 'receipt')); progressed = True
                    elif state['status'] == 'waiting':
                        outcome = (decisions or {}).get(nid, 'approve')
                        self.engine.decide(run['id'], nid, state['nonce'], state['proposal'], outcome, human=True)
                        interactions.append((nid, outcome)); progressed = True
                    elif state['status'] == 'waiting_input':
                        answer(self.engine, run['id'], nid, state['question']['id'], 'Précision synthétique')
                        interactions.append((nid, 'answer')); progressed = True
                self.assertTrue(progressed, f'Simulation bloquée : {graph["id"]} {run["nodes"]}')
        self.fail('Simulation sans fin')

    def test_all_shipped_templates_reach_completion_through_real_simulation_contracts(self):
        for graph in templates():
            with self.subTest(template=graph['id']):
                final, _ = self.simulate(graph)
                self.assertEqual(final['status'], 'completed')

    def test_support_critical_normal_and_unknown_branches_have_valid_examples(self):
        for severity, expected in [('normal', 'normal'), ('critical', 'urgent'), ('unknown', 'clarify')]:
            with self.subTest(severity=severity):
                graph = next(g for g in templates() if g['id'] == 'support-conversation')
                graph['nodes'][0]['sample_outputs']['severity'] = severity
                final, interactions = self.simulate(graph)
                self.assertEqual(final['nodes'][expected]['status'], 'accepted')
                if severity == 'unknown':
                    self.assertIn(('clarify', 'answer'), interactions)
                    self.assertEqual(final['nodes']['reassess']['outcome'], 'normal')

    def test_support_still_unknown_ends_blocked_not_received(self):
        graph = next(g for g in templates() if g['id'] == 'support-conversation')
        for step in graph['nodes']:
            if step['id'] in {'diagnosis', 'reassess'}:
                step['sample_outputs']['severity'] = 'unknown'
        final, interactions = self.simulate(graph)
        self.assertIn(('unresolved', 'answer'), interactions)
        self.assertEqual(final['completion_outcome'], 'blocked')

    def test_express_reframe_and_failed_checks_never_receive_work(self):
        for eligibility in ('broader', 'unknown'):
            graph = next(g for g in templates() if g['id'] == 'express-conversation')
            graph['nodes'][0]['sample_outputs']['eligibility'] = eligibility
            final, interactions = self.simulate(graph)
            self.assertEqual(final['nodes']['fix']['status'], 'skipped')
            self.assertIn(('reframe', 'answer'), interactions)
            self.assertEqual(final['completion_outcome'], 'blocked')
        for name in ('release-conversation', 'express-conversation'):
            graph = next(g for g in templates() if g['id'] == name)
            next(n for n in graph['nodes'] if n['id'] == 'check')['sample_outputs']['verdict'] = 'fail'
            final, interactions = self.simulate(graph)
            self.assertIn(('failure', 'answer'), interactions)
            self.assertEqual(final['completion_outcome'], 'blocked')
            self.assertEqual(final['nodes']['receipt']['status'], 'skipped')

    def test_release_rejection_and_optional_documentation_preserve_decisions(self):
        graph = next(g for g in templates() if g['id'] == 'release-conversation')
        final, _ = self.simulate(graph, decisions={'scope': 'reject'})
        self.assertEqual(final['nodes']['work']['status'], 'skipped')
        self.assertEqual(final['completion_outcome'], 'rejected')
        for name in ('github-odoo-deployment', 'direct-production'):
            graph = next(g for g in templates() if g['id'] == name)
            final, _ = self.simulate(graph, parameters={'documentation': 'prepare'})
            self.assertEqual(final['nodes']['docs']['status'], 'accepted')

    def test_explicitly_invalid_outputs_in_a_custom_simulation_still_fail_the_contract(self):
        graph = self.graph(node('work', 'Custom', 'agent', outputs={'finding': 'string'}, sample_outputs={'finding': False}, validation='contract'))
        run = self.engine.start(self.project['id'], graph, simulation=True)
        claim = self.engine.claim(run['id'], 'work')
        with patch('workflow_engine.runtime.time.sleep'):
            execute(self.engine, run['id'], 'work', claim['token'])
        state = self.engine.run(run['id'])['nodes']['work']
        self.assertEqual(state['status'], 'returned')
        self.assertIn('finding', state['validation_error'])

    def test_missing_model_is_configuration_with_native_alternative_and_no_write(self):
        graph = self.graph(); graph['defaults'].pop('model')
        conversation, item = self.open(graph)
        frozen = self.engine.run(item['run'])['definition']
        before = self.database()
        with patch('workflow_engine.runtime.subprocess.Popen') as process, patch('workflow_engine.runtime.execute_text') as provider:
            launch = self.launch(conversation['id'])
            self.assertEqual(launch['status'], 'configuration')
            self.assertEqual(launch['worker_count'], 0)
            self.assertEqual(launch['configuration_count'], 1)
            self.assertTrue(launch['nodes'][0]['native_available'])
            self.assertEqual(launch['nodes'][0]['action'], 'new-execution')
            self.assertIn('terminal', launch['nodes'][0]['reason'])
            process.assert_not_called(); provider.assert_not_called()
        self.assertEqual(self.database(), before)
        self.assertEqual(self.engine.run(item['run'])['definition'], frozen)
        self.assertEqual(self.engine.run(item['run'])['nodes']['work']['attempt'], 0)

    def test_native_tools_are_not_advertised_as_workers(self):
        graph = self.graph(node('work', 'Modifier', 'agent', required_capabilities=['edit', 'shell']))
        conversation, _ = self.open(graph)
        launch = self.launch(conversation['id'])
        self.assertEqual(launch['status'], 'native')
        self.assertEqual(launch['native_count'], 1)
        self.assertEqual(launch['worker_count'], 0)
        self.assertEqual(launch['nodes'][0]['action'], 'terminal')
        result = dispatch_conversation(self.engine, conversation['id'])
        self.assertEqual(result['started_count'], 0)
        self.assertEqual(result['items'][0]['waiting'][0]['code'], 'executor.capabilities-missing')

    def test_task_and_document_inherit_high_effort_from_native_conversation(self):
        for kind in ('task', 'document'):
            with self.subTest(kind=kind):
                graph = self.graph(node('work', 'Préparer la synthèse', kind))
                graph['defaults']['effort'] = 'high'
                conversation, item = self.open(graph)
                launch = self.launch(conversation['id'])
                self.assertEqual(launch['status'], 'native')
                self.assertTrue(launch['nodes'][0]['native_available'])
                self.assertEqual(launch['worker_count'], 0)
                # Same bridge contract advertised by the overview, no process
                # invocation: claim only records this synthetic attempt.
                claim = request(self.engine, conversation['id'], 'claim', {'run': item['run'], 'node': 'work'})
                self.assertEqual(claim['run']['nodes']['work']['ownership'], 'native')

    def test_different_model_cannot_be_silently_delegated_to_native_terminal(self):
        # This is a saved valid workflow whose selected CLI disappears later.
        graph = self.graph(node('work', 'Other provider', 'agent', provider='claude', model='other-model'))
        conversation, _ = self.open(graph)
        self.catalog[1]['installed'] = False
        launch = self.launch(conversation['id'])
        self.assertEqual(launch['status'], 'configuration')
        self.assertFalse(launch['nodes'][0]['native_available'])
        self.assertEqual(launch['nodes'][0]['code'], 'provider.cli-missing')

    def test_question_decision_and_paused_runs_have_no_launchable_workers(self):
        graph = self.graph(node('question', 'Préciser', 'question', question='Quelle portée?'),
                           node('gate', 'Autoriser', 'decision'), node('work', 'Analyser', 'agent'),
                           edges=[edge('question', 'gate'), edge('gate', 'work', 'approve')])
        conversation, item = self.open(graph)
        self.assertEqual(self.launch(conversation['id'])['worker_count'], 0)
        run = self.engine.run(item['run'])
        answer(self.engine, run['id'], 'question', run['nodes']['question']['question']['id'], 'Périmètre synthétique')
        self.assertEqual(self.launch(conversation['id'])['worker_count'], 0)
        gate = self.engine.run(run['id'])['nodes']['gate']
        self.engine.decide(run['id'], 'gate', gate['nonce'], gate['proposal'], 'approve', human=True)
        self.assertEqual(self.launch(conversation['id'])['worker_count'], 1)
        self.engine.control(run['id'], 'pause')
        self.assertEqual(self.launch(conversation['id'])['worker_count'], 0)

    def test_quota_and_resource_contention_are_temporary_waits(self):
        conversation, item = self.open(self.graph(node('work', 'Analyse', 'agent', resources=['shared'])))
        first = self.engine.claim(item['run'], 'work')
        other = self.service.add(conversation['id'], 'Deuxième analyse')
        launch = LaunchReadiness(self.engine, conversation).project(self.engine.run(other['run']))
        self.assertEqual(launch['waiting_count'], 1)
        self.assertEqual(launch['nodes'][0]['code'], 'resource-busy')
        for _ in range(3):
            _, running = self.open()
            self.engine.claim(running['run'], 'work')
        _, waiting = self.open()
        launch = LaunchReadiness(self.engine, conversation).project(self.engine.run(waiting['run']))
        self.assertEqual(launch['worker_count'], 0)
        self.assertEqual(launch['nodes'][0]['code'], 'quota')
        self.engine.submit(item['run'], 'work', first['token'], {'ok': True, 'summary': 'Exemple', 'outputs': {}})
        self.assertEqual(LaunchReadiness(self.engine, conversation).project(self.engine.run(waiting['run']))['worker_count'], 1)

    def test_readiness_has_bounded_checks_and_does_not_resume_dependencies(self):
        graph = self.graph(*[node('work' + str(i), 'Analyse', 'agent') for i in range(120)])
        conversation, item = self.open(graph)
        before = self.database()
        self.capabilities.reset_mock()
        launch = self.launch(conversation['id'])
        self.assertEqual(launch['worker_count'], 100)
        self.assertEqual(launch['unknown_count'], 20)
        self.assertEqual(len(launch['nodes']), 25)
        self.assertEqual(launch['nodes_total'], 120)
        self.assertTrue(launch['nodes_truncated'])
        self.capabilities.assert_called_once()
        self.assertEqual(self.database(), before)
        followup = self.service.add(conversation['id'], 'Consolidation', depends_on=[item['id']])
        before = self.database()
        result = LaunchReadiness(self.engine, conversation).project(self.engine.run(followup['run']))
        self.assertEqual(result['worker_count'], 0)
        self.assertEqual(self.database(), before)

    def test_missing_catalog_workflow_returns_an_actionable_error(self):
        from studio import request as studio_request
        with self.assertRaisesRegex(ContractError, "Workflow introuvable.*Actualisez le catalogue"):
            studio_request(self.engine, {'action': 'workflow.get', 'project': self.project['id'], 'workflow': 'absent'})

    def test_activity_detail_and_conversation_agree_on_launch_configuration_without_writing(self):
        from studio import request as studio_request
        from workflow_engine.projections import run_page
        graph = self.graph(); graph['defaults'].pop('model')
        conversation, item = self.open(graph)
        before = self.database()
        with patch('workflow_engine.runtime.subprocess.Popen') as process, patch('workflow_engine.runtime.execute_text') as provider:
            overview = self.launch(conversation['id'])
            activity = run_page(self.engine)['items'][0]['launch']
            detail = studio_request(self.engine, {'action': 'run.get', 'run': item['run']})['run']['launch']
            for projection in (overview, activity, detail):
                self.assertEqual(projection['status'], 'configuration')
                self.assertEqual(projection['worker_count'], 0)
                self.assertEqual(projection['label'], 'À configurer')
                self.assertTrue(projection['nodes'][0]['native_available'])
            process.assert_not_called(); provider.assert_not_called()
        self.assertEqual(self.database(), before)

    def test_activity_readiness_shares_a_bounded_check_budget_across_conversations(self):
        from workflow_engine.projections import run_page
        for index in range(3):
            self.open(self.graph(*[node('n'+str(n), 'Analyse', 'agent') for n in range(50)]))
        before = self.database(); self.capabilities.reset_mock()
        items = run_page(self.engine)['items']
        self.assertEqual(sum(item['launch']['worker_count'] for item in items), 100)
        self.assertEqual(sum(item['launch']['unknown_count'] for item in items), 50)
        self.capabilities.assert_called_once()
        self.assertEqual(self.database(), before)

    def test_named_artifact_keeps_original_bytes_digest_and_run_authorization(self):
        conversation, item = self.open()
        folder = self.root / 'private-source'; folder.mkdir()
        source = folder / 'Demande client\n.eml'
        content = b'Subject: Synthetic request\r\n\r\nOriginal bytes retained.\r\n'
        source.write_bytes(content)
        proof = request(self.engine, conversation['id'], 'artifact', {'path': str(source)})
        self.assertEqual(proof['filename'], 'Demande client.eml')
        self.assertEqual(proof['media_type'], 'message/rfc822')
        self.assertNotIn(str(folder), json.dumps(proof))
        self.assertEqual(proof['sha256'], hashlib.sha256(content).hexdigest())
        self.assertEqual(self.engine.evidence(proof), content)
        with self.assertRaisesRegex(ContractError, 'absente de cette exécution'):
            request(self.engine, conversation['id'], 'read', {'run': item['run'], 'sha256': proof['sha256']})
        claim = self.engine.claim(item['run'], 'work')
        self.engine.submit(item['run'], 'work', claim['token'], {'ok': True, 'summary': 'Lecture synthétique', 'outputs': {}, 'evidence': [proof]})
        self.assertEqual(request(self.engine, conversation['id'], 'read', {'run': item['run'], 'sha256': proof['sha256']})['text'], content.decode())

    def test_compact_conversations_expose_intention_without_reading_every_run(self):
        conversation = self.service.open(self.project['id'], self.graph(), 'codex')
        self.service.add(conversation['id'], 'Lire le message du client\nPuis préparer un plan')
        with patch.object(self.engine, 'run', side_effect=AssertionError('No per-run read required')):
            values = self.service.list(compact=True)
        self.assertEqual(values[0]['request_excerpt'], 'Lire le message du client')
        self.assertEqual(values[0]['item_count'], 1)

    def test_automatic_simulated_task_is_not_reported_as_missing_conversation_executor(self):
        from workflow_engine.projections import run_page
        graph = self.graph(node('work', 'Constat automatique', 'task', validation='contract'))
        run = self.engine.start(self.project['id'], graph, simulation=True)
        before = self.database()
        self.assertNotIn('launch', run_page(self.engine)['items'][0])
        with self.assertRaises(ContractError):
            LaunchReadiness(self.engine).project(run)
        self.assertEqual(self.database(), before)
        claim = self.engine.claim(run['id'], 'work')
        with patch('workflow_engine.runtime.time.sleep'), patch('workflow_engine.runtime.execute_text') as provider:
            execute(self.engine, run['id'], 'work', claim['token'])
            provider.assert_not_called()
        self.assertEqual(self.engine.run(run['id'])['status'], 'completed')


if __name__ == '__main__':
    unittest.main()

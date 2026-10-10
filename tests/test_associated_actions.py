"""Optional work stays independent; synthetic adapters never contact a service."""
import copy
import concurrent.futures
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine, ContractError, validate
from workflow_engine.associated_actions import activate, check_current, view
from workflow_engine.contracts import digest
from workflow_engine.conversations import answer
from workflow_engine.runtime import execute
from connectors.local_tools import inspect, qualify
from connectors.tool_runtime import reconcile_effect
from studio import request


ADAPTER = '''import json,sys
from pathlib import Path
root=Path(__file__).parent
p=json.load(sys.stdin)
if p['action']=='describe':
 print(json.dumps({'protocol':'tricorder.tool/1','connected':True,'identity':'synthetic','operations':{'send':'notify','lookup':'read','publish':'write'}}))
else:
 with (root/'calls.jsonl').open('a') as f: f.write(json.dumps(p)+'\\n')
 if p['operation']=='lookup':
  print(json.dumps({'ok':True,'identity':'synthetic','outputs':{'effect_id':p['arguments']['effect_id'],'status':'sent','receipt':{'id':'recovered'},'outputs':{'sent':True}}}))
 elif (root/'lost').exists(): sys.exit(1)
 else: print(json.dumps({'ok':True,'identity':'synthetic','outputs':{'sent':True},'receipt':{'id':'receipt'}}))
'''


def graph(*nodes, identifier='main', **values):
    return {'schema': 2, 'id': identifier, 'title': 'Résultat principal', 'nodes': list(nodes), 'edges': [], **values}


def doc(identifier='work', **values):
    return {'id': identifier, 'kind': 'document', 'title': 'Préparer le résultat', 'content': 'Brouillon',
            'validation': 'automatic', **values}


def associated(child=None, **values):
    return {'id': 'notify', 'title': 'Action facultative', 'source': 'work', 'event': 'accepted', 'enabled': True,
            'workflow': child or graph(doc('supplement', max_attempts=2), identifier='supplement'), **values}


class AssociatedActionTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.engine = Engine(self.root / 'state')
        self.project = self.engine.workspace_context()

    def run_work(self, rid, nid):
        claim = self.engine.claim(rid, nid)
        execute(self.engine, rid, nid, claim['token'])
        return self.engine.run(rid)

    def start(self, action=None, source=None):
        return self.engine.start(self.project['id'], graph(source or doc(), actions=[action or associated()]))

    def completed(self, action=None):
        return self.run_work(self.start(action)['id'], 'work')

    def action(self, run):
        return run['associated_actions'][0]

    def connect(self):
        script = self.root / 'adapter.py'
        script.write_text(ADAPTER)
        plugin = {'id': 'fixture', 'title': 'Outil synthétique', 'provider': 'local', 'operations': ['send', 'lookup', 'publish'],
                  'transport': {'argv': [sys.executable, str(script)], 'timeout': 2}}
        manifest = Path(self.project['path']) / '.tricorder/plugins.json'
        manifest.write_text(json.dumps({'schema': 1, 'plugins': [plugin]}))
        preview = inspect(self.engine, self.project, 'fixture')
        return qualify(self.engine, self.project, 'fixture', digest(preview), human=True)

    def notification(self, **values):
        return associated(graph({'id': 'send', 'title': 'Notifier', 'kind': 'communication', 'recipient': 'synthetic-channel',
                                  'template': 'Un résultat est prêt', 'validation': 'automatic', 'max_attempts': 2,
                                  'reconciliation': 'lookup', 'capabilities': [{'plugin': 'fixture', 'operation': 'send'}]},
                                 identifier='notification'), **values)

    def test_recording_and_reading_never_spawn_and_completed_parent_stays_completed(self):
        run = self.completed()
        self.assertEqual(run['status'], 'completed')
        before = self.engine.events(run['id'])
        for _ in range(3):
            projection = view(self.engine, self.engine.run(run['id']))
            self.assertEqual(projection['items'][0]['status'], 'awaiting_activation')
        self.assertEqual(self.engine.events(run['id']), before)
        self.assertEqual(len(self.engine.runs(self.project['id'])), 1)
        record = self.action(run)
        with self.assertRaisesRegex(ContractError, 'humaine'):
            activate(self.engine, run['id'], record['id'])
        for _ in range(3):
            run = activate(self.engine, run['id'], record['id'], human=True)
        self.assertEqual(run['status'], 'completed')
        self.assertEqual(len(self.engine.runs(self.project['id'])), 2)
        child = self.engine.run(self.action(run)['run'])
        self.assertEqual(child['associated_with']['run'], run['id'])
        self.assertNotIn('parent', child)
        self.assertEqual(child['project'], run['project'])
        self.assertEqual(child['parameters']['source_event'], 'accepted')
        self.assertEqual(self.action(run)['authorization']['workflow'], child['contract'])

    def test_missing_connection_is_visible_without_losing_the_main_result(self):
        run = self.completed(self.notification())
        run = activate(self.engine, run['id'], self.action(run)['id'], human=True)
        self.assertEqual(run['status'], 'completed')
        self.assertEqual(self.action(run)['status'], 'configuration')
        self.assertIn('Capacité absente', self.action(run)['reason'])
        self.assertNotIn('run', self.action(run))
        self.assertEqual(len(self.engine.runs(self.project['id'])), 1)
        self.connect()
        self.assertEqual(view(self.engine, run)['items'][0]['status'], 'configuration')
        run = activate(self.engine, run['id'], self.action(run)['id'], human=True)
        child = self.run_work(self.action(run)['run'], 'send')
        self.assertEqual(child['status'], 'completed')
        self.assertEqual(view(self.engine, run)['items'][0]['status'], 'completed')
        self.assertEqual(self.engine.run(run['id'])['status'], 'completed')

    def test_static_subworkflow_actions_are_not_silently_discarded(self):
        child = graph(doc(), identifier='child', actions=[associated()])
        parent = graph({'id': 'sub', 'kind': 'subworkflow', 'title': 'Sous-workflow', 'workflow': 'child'})
        with self.assertRaisesRegex(ContractError, 'actions associées'):
            self.engine.start(self.project['id'], parent, library={'child': child})
        self.assertEqual(len(self.engine.runs(self.project['id'])), 0)

    def test_pausing_main_stops_grandchild_action_then_resume_allows_it(self):
        from workflow_engine.iterations import activate as iterate
        array = {'type': 'array', 'items': 'object', 'maxItems': 100}
        leaf = graph(doc(), identifier='leaf')
        child = graph({'id': 'prepare', 'kind': 'task', 'title': 'Préparer', 'validation': 'contract', 'outputs': {'items': array}},
                      {'id': 'each', 'kind': 'foreach', 'title': 'Chaque élément', 'inputs': {'items': array},
                       'outputs': {'results': array}, 'workflow': leaf}, identifier='action-items')
        child['edges'] = [{'id': 'to-each', 'from': 'prepare', 'to': 'each', 'mapping': {'items': 'items'}}]
        main = graph(doc(validation='contract'), {'id': 'question', 'kind': 'question', 'title': 'Préciser', 'question': 'Continuer ?'},
                     actions=[associated(child)])
        run = self.engine.start(self.project['id'], main, simulation=True)
        claim = self.engine.claim(run['id'], 'work')
        run = self.engine.submit(run['id'], 'work', claim['token'], {'ok': True, 'summary': 'Résultat prêt'})
        run = activate(self.engine, run['id'], self.action(run)['id'], human=True)
        rid = self.action(run)['run']
        claim = self.engine.claim(rid, 'prepare')
        self.engine.submit(rid, 'prepare', claim['token'], {'ok': True, 'summary': 'Un élément', 'outputs': {'items': [{'id': 'one'}]}})
        child = iterate(self.engine, rid, 'each')
        grandchild = child['nodes']['each']['children'][0]['run']
        self.engine.control(run['id'], 'pause')
        with self.assertRaisesRegex(ContractError, 'suspendue'):
            self.engine.claim(grandchild, 'work')
        self.engine.control(run['id'], 'resume')
        claim = self.engine.claim(grandchild, 'work')
        self.engine.control(run['id'], 'pause')
        execute(self.engine, grandchild, 'work', claim['token'])
        self.assertFalse(self.engine.run(grandchild)['nodes']['work']['result']['ok'])
        self.assertIn('suspendue', self.engine.run(grandchild)['nodes']['work']['result']['summary'])

    def test_child_failure_and_targeted_retry_do_not_reopen_main_or_create_another_child(self):
        run = self.completed()
        run = activate(self.engine, run['id'], self.action(run)['id'], human=True)
        rid = self.action(run)['run']
        claim = self.engine.claim(rid, 'supplement')
        self.engine.submit(rid, 'supplement', claim['token'], {'ok': False, 'summary': 'Résultat à reprendre'})
        self.assertEqual(view(self.engine, run)['items'][0]['status'], 'failed')
        self.engine.retry(rid, 'supplement', 'Corriger le complément', human=True)
        self.run_work(rid, 'supplement')
        self.assertEqual(view(self.engine, run)['items'][0]['status'], 'completed')
        repeated = activate(self.engine, run['id'], self.action(run)['id'], human=True)
        self.assertEqual(self.action(repeated)['run'], rid)
        self.assertEqual(repeated['nodes']['work']['attempt'], 1)
        self.assertEqual(repeated['status'], 'completed')

    def test_disabled_and_rejected_triggers_do_not_launch(self):
        run = self.completed(associated(enabled=False))
        self.assertEqual(view(self.engine, run)['items'][0]['status'], 'disabled')
        with self.assertRaisesRegex(ContractError, 'désactivée'):
            activate(self.engine, run['id'], self.action(run)['id'], human=True)
        gate = {'id': 'work', 'kind': 'decision', 'title': 'Valider', 'options': ['approve', 'reject']}
        run = self.start(source=gate)
        state = run['nodes']['work']
        run = self.engine.decide(run['id'], 'work', state['nonce'], state['proposal'], 'reject', human=True)
        self.assertFalse(run.get('associated_actions'))

    def test_question_answered_before_activation_is_obsolete(self):
        source = {'id': 'work', 'kind': 'question', 'title': 'Préciser', 'question': 'Quel périmètre ?'}
        run = self.start(associated(event='question'), source)
        record = self.action(run)
        answer(self.engine, run['id'], 'work', run['nodes']['work']['question']['id'], 'Ce périmètre')
        run = activate(self.engine, run['id'], record['id'], human=True)
        self.assertEqual(self.action(run)['status'], 'obsolete')
        self.assertEqual(len(self.engine.runs(self.project['id'])), 1)

    def test_question_answered_after_activation_blocks_claim_and_send(self):
        self.connect()
        source = {'id': 'work', 'kind': 'question', 'title': 'Préciser', 'question': 'Quel périmètre ?'}
        run = self.start(self.notification(event='question'), source)
        run = activate(self.engine, run['id'], self.action(run)['id'], human=True)
        rid = self.action(run)['run']
        claim = self.engine.claim(rid, 'send')
        answer(self.engine, run['id'], 'work', run['nodes']['work']['question']['id'], 'Ce périmètre')
        with self.assertRaisesRegex(ContractError, 'obsolète'):
            check_current(self.engine, self.engine.run(rid))
        execute(self.engine, rid, 'send', claim['token'])
        self.assertFalse((self.root / 'calls.jsonl').exists())
        self.assertFalse(self.engine.run(rid)['nodes']['send']['result']['ok'])
        self.engine.retry(rid, 'send', 'Vérifier la question', human=True)
        with self.assertRaisesRegex(ContractError, 'obsolète'):
            self.engine.claim(rid, 'send')

    def test_uncertain_remote_result_keeps_identity_and_requires_reconciliation(self):
        self.connect()
        (self.root / 'lost').touch()
        run = self.completed(self.notification())
        run = activate(self.engine, run['id'], self.action(run)['id'], human=True)
        rid = self.action(run)['run']
        self.run_work(rid, 'send')
        self.assertEqual(view(self.engine, run)['items'][0]['status'], 'uncertain')
        for _ in range(2):
            activate(self.engine, run['id'], self.action(run)['id'], human=True)
        with self.assertRaisesRegex(ContractError, 'externe'):
            self.engine.retry(rid, 'send', 'Renvoyer', human=True)
        self.assertEqual(len((self.root / 'calls.jsonl').read_text().splitlines()), 1)
        reconcile_effect(self.engine, rid, 'send', human=True)
        self.assertEqual(view(self.engine, self.engine.run(run['id']))['items'][0]['status'], 'completed')
        calls = [json.loads(line)['operation'] for line in (self.root / 'calls.jsonl').read_text().splitlines()]
        self.assertEqual(calls, ['send', 'lookup'])

    def test_cancel_stops_pending_child_and_perimeter_is_parent_specific(self):
        main = graph(doc(), {'id': 'hold', 'kind': 'question', 'title': 'Attendre', 'question': 'Continuer ?'}, actions=[associated()])
        run = self.run_work(self.engine.start(self.project['id'], main)['id'], 'work')
        run = activate(self.engine, run['id'], self.action(run)['id'], human=True)
        other = self.completed()
        with self.assertRaisesRegex(ContractError, 'introuvable'):
            activate(self.engine, other['id'], self.action(run)['id'], human=True)
        cancelled = self.engine.control(run['id'], 'cancel')
        child = self.engine.run(self.action(run)['run'])
        self.assertEqual(child['status'], 'cancelled')
        self.assertEqual(view(self.engine, cancelled)['items'][0]['status'], 'cancelled')

    def test_simultaneous_activation_and_api_cannot_duplicate_or_self_authorize(self):
        run = self.completed()
        payload = {'action': 'action.activate', 'run': run['id'], 'id': self.action(run)['id']}
        with self.assertRaises(ContractError):
            request(self.engine, payload)
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            results = list(pool.map(lambda _: activate(self.engine, run['id'], self.action(run)['id'], human=True), range(3)))
        self.assertEqual(len({self.action(result)['run'] for result in results}), 1)
        self.assertEqual(len(self.engine.runs(self.project['id'])), 2)
        page = view(self.engine, results[-1], limit=1)
        self.assertEqual(page['total'], 1)
        self.assertIsNone(page['next'])
        self.assertNotIn('source_context', json.dumps(page))

    def test_cancellation_does_not_claim_a_sent_operation_was_undone(self):
        self.connect()
        action = self.notification()
        action['workflow']['nodes'].append({'id': 'hold', 'kind': 'question', 'title': 'Attendre', 'question': 'Terminer ?'})
        action['workflow']['edges'].append({'id': 'next', 'from': 'send', 'to': 'hold'})
        source = graph(doc(), {'id': 'hold', 'kind': 'question', 'title': 'Attendre', 'question': 'Terminer ?'}, actions=[action])
        run = self.run_work(self.engine.start(self.project['id'], source)['id'], 'work')
        run = activate(self.engine, run['id'], self.action(run)['id'], human=True)
        self.run_work(self.action(run)['run'], 'send')
        cancelled = self.engine.control(run['id'], 'cancel')
        item = view(self.engine, cancelled)['items'][0]
        self.assertEqual(item['status'], 'cancelled')
        self.assertEqual(item['effects']['sent'], 1)
        self.assertIn('restent effectives', item['reason'])

    def test_agent_question_trigger_is_recorded_without_manufacturing_a_result(self):
        source = {'id': 'work', 'kind': 'task', 'title': 'Analyser', 'outputs': {'plan': {'type': 'object'}}, 'validation': 'contract'}
        run = self.start(associated(event='question'), source)
        claim = self.engine.claim(run['id'], 'work', executor='native')
        run = self.engine.submit(run['id'], 'work', claim['token'], {'ok': True, 'summary': 'Préciser', 'question': 'Quel périmètre ?'})
        self.assertEqual(self.action(run)['event'], 'question')
        self.assertEqual(run['nodes']['work']['status'], 'waiting_input')
        self.assertNotIn('receipt', run['nodes']['work'])

    def test_activation_does_not_approve_the_child_external_operation(self):
        self.connect()
        operation = {'action': 'publish', 'target': 'synthetic-space', 'candidate': 'exact-body'}
        child = graph({'id': 'gate', 'kind': 'decision', 'title': 'Autoriser la publication', 'operation': operation},
                      {'id': 'publish', 'kind': 'external', 'title': 'Publier', 'operation': operation, 'approval': 'gate',
                       'capabilities': [{'plugin': 'fixture', 'operation': 'publish'}]}, identifier='publication')
        child['edges'] = [{'id': 'approved', 'from': 'gate', 'to': 'publish', 'outcome': 'approve'}]
        run = self.completed(associated(child))
        run = activate(self.engine, run['id'], self.action(run)['id'], human=True)
        rid = self.action(run)['run']
        pending = self.engine.run(rid)
        self.assertEqual(pending['nodes']['gate']['status'], 'waiting')
        self.assertEqual(pending['nodes']['publish']['status'], 'pending')
        with self.assertRaises(ContractError):
            self.engine.claim(rid, 'publish')
        self.assertFalse((self.root / 'calls.jsonl').exists())
        gate = pending['nodes']['gate']
        self.engine.decide(rid, 'gate', gate['nonce'], gate['proposal'], 'approve', human=True)
        self.run_work(rid, 'publish')
        calls = [json.loads(line)['operation'] for line in (self.root / 'calls.jsonl').read_text().splitlines()]
        self.assertEqual(calls, ['publish'])

    def test_contract_rejects_invalid_source_duplicate_action_and_missing_external_gate(self):
        value = graph(doc(), actions=[associated()])
        validate(value)
        for mutation in (lambda g: g['actions'][0].update(source='missing'),
                         lambda g: g['actions'].append(copy.deepcopy(g['actions'][0])),
                         lambda g: g.update(schema=1),
                         lambda g: g['actions'][0]['workflow'].update(actions=[associated()])):
            bad = copy.deepcopy(value)
            mutation(bad)
            with self.assertRaises(ContractError):
                validate(bad)
        external = {'id': 'publish', 'kind': 'external', 'title': 'Publier', 'operation': {'action': 'publish', 'target': 'test', 'candidate': 'exact'}}
        with self.assertRaises(ContractError):
            validate(graph(doc(), actions=[associated(graph(external))]))


if __name__ == '__main__':
    unittest.main()

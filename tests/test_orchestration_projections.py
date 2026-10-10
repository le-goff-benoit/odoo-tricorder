"""Read-only, bounded projections of real synthetic workflow families."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine
from workflow_engine.associated_actions import activate as activate_action
from workflow_engine.collection import change
from workflow_engine.conversations import Conversations, ask
from workflow_engine.iterations import activate
from workflow_engine.library import node, edge
from workflow_engine.projections import conversation_activity, summary, run_detail, run_page


class OrchestrationProjectionTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='tricorder-projections-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.engine = Engine(self.root / 'state')
        self.project = self.engine.create_project('Synthetic coordination')
        self.service = Conversations(self.engine)
        capabilities = patch('workflow_engine.runtime.capabilities', return_value=[
            {'id': key, 'installed': True, 'usable': True, 'reason': 'Synthetic only'} for key in ('codex', 'claude', 'command')])
        capabilities.start()
        self.addCleanup(capabilities.stop)

    @staticmethod
    def graph(nodes, edges=None, **extra):
        return {'schema': 2, 'id': 'projection', 'title': 'Synthetic work', 'defaults': {'provider': 'codex', 'model': 'fixture'},
                'nodes': nodes, 'edges': edges or [], **extra}

    def open(self, graph):
        cid = self.service.open(self.project['id'], graph, 'codex')['id']
        item = self.service.add(cid, 'One business request')
        return cid, self.engine.run(item['run'])

    def family(self, count=5, child=None, dependencies=None):
        child = child or self.graph([node('work', 'Work element', 'agent', validation='contract', outputs={'text': 'string'}),
                                    node('gate', 'Review element', 'decision')], [edge('work', 'gate')], id='child')
        graph = self.graph([node('plan', 'Plan', 'agent', validation='contract', outputs={'items': 'array'}),
                           node('each', 'Elements', 'foreach', inputs={'items': 'array'}, workflow=child, concurrency=4,
                                outputs={'results': 'array', 'contributions': 'array'})],
                          [{**edge('plan', 'each'), 'mapping': {'items': 'items'}}])
        cid, parent = self.open(graph)
        claim = self.engine.claim(parent['id'], 'plan')
        self.engine.submit(parent['id'], 'plan', claim['token'], {'ok': True, 'summary': 'Plan ready',
            'outputs': {'items': [{'id': 'R' + str(i), 'title': 'Element ' + str(i),
                                  'depends_on': (dependencies or {}).get(i, [])} for i in range(count)]}})
        return cid, activate(self.engine, parent['id'], 'each')

    def test_waiting_child_keeps_dependency_and_manual_hold_distinct_in_all_projections(self):
        _, parent = self.family(2, dependencies={1: ['R0']})
        child_id = parent['nodes']['each']['children'][1]['run']
        child = self.engine.run(child_id)
        self.assertTrue(child['iteration_wait'])
        for view in (summary(child, engine=self.engine), run_detail(self.engine, child)):
            self.assertTrue(view['iteration_wait'])
            self.assertFalse(view.get('iteration_hold'))
        self.engine.control(child_id, 'pause')
        held = summary(self.engine.run(child_id), engine=self.engine)
        self.assertTrue(held['iteration_hold'])
        self.engine.control(child_id, 'resume')
        waiting = summary(self.engine.run(child_id), engine=self.engine)
        self.assertTrue(waiting['iteration_wait'])
        self.assertFalse(waiting['iteration_hold'])

    def test_compact_coordination_and_lists_preserve_child_and_parent_suspension(self):
        _, parent = self.family(2, dependencies={1: ['R0']})
        active, dependent = [member['run'] for member in parent['nodes']['each']['children']]
        self.engine.control(dependent, 'pause')
        self.engine.control(parent['id'], 'pause')
        before = {rid: self.engine.run(rid) for rid in (parent['id'], active, dependent)}
        compact = run_detail(self.engine, self.engine.run(parent['id']))['coordination']['each']['items']
        projected_children = {'items': [item['execution'] for item in compact]}
        for page in (projected_children, run_page(self.engine, self.project['id']), self.engine.activity()):
            rows = {run['id']: run for run in page['items']}
            self.assertTrue(rows[active]['parent_paused'])
            self.assertFalse(rows[active].get('iteration_hold'))
            self.assertTrue(rows[dependent]['iteration_hold'])
            self.assertTrue(rows[dependent]['iteration_wait'])
            self.assertFalse(rows[dependent].get('parent_paused'))
        self.assertEqual({rid: self.engine.run(rid) for rid in before}, before)

    def test_child_states_count_without_inflating_main_requests(self):
        cid, parent = self.family()
        children = parent['nodes']['each']['children']
        self.engine.claim(children[0]['run'], 'work')
        question = self.engine.claim(children[2]['run'], 'work')
        ask(self.engine, children[2]['run'], 'work', question['token'], 'Which source?')
        decision = self.engine.claim(children[3]['run'], 'work')
        self.engine.submit(children[3]['run'], 'work', decision['token'], {'ok': True, 'summary': 'Ready for review', 'outputs': {'text': 'Document'}})
        failure = self.engine.claim(children[4]['run'], 'work')
        self.engine.submit(children[4]['run'], 'work', failure['token'], {'ok': False, 'summary': 'Synthetic failure'})
        activity = conversation_activity(self.engine, cid)
        self.assertEqual(activity['items'], 1)
        self.assertEqual(activity['completed'], 0)
        self.assertEqual(activity['children']['items'], 5)
        self.assertEqual({k: activity[k] for k in ('running', 'ready', 'questions', 'decisions', 'failed', 'coordination')},
                         {'running': 1, 'ready': 1, 'questions': 1, 'decisions': 1, 'failed': 1, 'coordination': 1})
        projected = summary(self.engine.run(parent['id']), engine=self.engine)
        self.assertEqual(projected['workers_total'], 1)
        self.assertEqual(projected['workers'][0]['run'], children[0]['run'])
        self.assertEqual(projected['workers'][0]['parent_node'], 'each')
        self.assertEqual(projected['workers'][0]['model'], 'fixture')
        self.assertEqual(projected['focus']['status'], 'waiting_children')
        self.assertEqual(projected['focus']['action'], 'Suivre les éléments')
        self.assertEqual(projected['coordination']['each']['counts'],
                         {'completed': 0, 'running': 1, 'question': 1, 'decision': 1, 'failed': 1, 'waiting': 1})
        gate = self.engine.run(children[3]['run'])['nodes']['gate']
        self.engine.decide(children[3]['run'], 'gate', gate['nonce'], gate['proposal'], 'reject', human=True)
        activity = conversation_activity(self.engine, cid)
        self.assertEqual(activity['failed'], 2)
        self.assertEqual(activity['children']['completed'], 0)

    def test_optional_failure_stays_separate_after_principal_completion(self):
        auxiliary = self.graph([node('aux', 'Draft message', 'agent', validation='contract', max_attempts=2)], id='auxiliary')
        graph = self.graph([node('work', 'Main work', 'agent', validation='contract')], actions=[
            {'id': 'draft', 'title': 'Optional draft', 'source': 'work', 'event': 'accepted', 'enabled': True, 'workflow': auxiliary}])
        cid, parent = self.open(graph)
        claim = self.engine.claim(parent['id'], 'work')
        parent = self.engine.submit(parent['id'], 'work', claim['token'], {'ok': True, 'summary': 'Main result complete', 'outputs': {}})
        activity = conversation_activity(self.engine, cid)
        self.assertEqual(activity['completed'], 1)
        self.assertEqual(activity['associated']['awaiting_activation'], 1)
        parent = activate_action(self.engine, parent['id'], parent['associated_actions'][0]['id'], human=True)
        child_id = parent['associated_actions'][0]['run']
        claim = self.engine.claim(child_id, 'aux')
        self.engine.submit(child_id, 'aux', claim['token'], {'ok': False, 'summary': 'Draft preparation failed'})
        before = copy.deepcopy(self.engine.run(parent['id']))
        activity = conversation_activity(self.engine, cid)
        self.assertEqual(activity['items'], 1)
        self.assertEqual(activity['completed'], 1)
        self.assertEqual(activity['failed'], 0)
        self.assertEqual(activity['associated']['items'], 1)
        self.assertEqual(activity['associated']['failed'], 1)
        with patch.object(self.engine, 'run', side_effect=AssertionError('No full associated child reads')):
            detail = run_detail(self.engine, before)
        self.assertEqual(detail['associated']['items'][0]['status'], 'failed')
        self.assertEqual(self.engine.run(parent['id']), before)
        self.engine.retry(child_id, 'aux', 'Retry this draft only', human=True)
        claim = self.engine.claim(child_id, 'aux')
        self.engine.submit(child_id, 'aux', claim['token'], {'ok': True, 'summary': 'Draft ready', 'outputs': {}})
        activity = conversation_activity(self.engine, cid)
        self.assertEqual(activity['associated']['completed'], 1)
        self.assertEqual(activity['associated']['failed'], 0)
        self.assertEqual(activity['completed'], 1)

    def test_collection_is_actionable_without_exposing_idempotency_ledger(self):
        graph = self.graph([node('intentions', 'Collect intentions', 'input', outputs={'items': {'type': 'array', 'items': 'object', 'minItems': 1}})])
        cid, run = self.open(graph)
        run = change(self.engine, run['id'], 'intentions', 0, 'add', key='source-1', text='Intent received')
        before = copy.deepcopy(run)
        activity = conversation_activity(self.engine, cid)
        self.assertEqual(activity['collecting'], 1)
        self.assertEqual(summary(run)['focus']['status'], 'collecting')
        projected = run_detail(self.engine, run)
        self.assertNotIn('commands', projected['nodes']['intentions']['collection'])
        self.assertEqual(projected['nodes']['intentions']['collection']['items'], before['nodes']['intentions']['collection']['items'])
        self.assertEqual(projected['nodes']['intentions']['collection']['revision'], 1)
        self.assertEqual(self.engine.run(run['id']), before)
        self.assertEqual(self.engine.activity()['attention_total'], 1)

    def test_activity_counts_families_before_pagination_and_names_durable_parent(self):
        cid, parent = self.family(count=30)
        page = run_page(self.engine, limit=5)
        self.assertEqual(page['total'], 31)
        self.assertEqual(page['family_counts'], {'requests': 1, 'tasks': 30, 'actions': 0})
        self.assertEqual(len(page['items']), 5)
        child = next(item for item in page['items'] if item['parent'])
        self.assertEqual(child['origin'], {'kind': 'task', 'run': parent['id'],
                                          'title': 'One business request', 'project': self.project['id']})
        self.assertNotIn(parent['id'], [item['id'] for item in page['items']])
        detailed = run_detail(self.engine, self.engine.run(child['id']))
        self.assertEqual(detailed['origin'], child['origin'])

    def test_optional_action_has_distinct_activity_count_and_durable_origin(self):
        child = self.graph([node('extra', 'Extra document', 'document', content='Local draft')], id='extra')
        main = self.graph([node('work', 'Document', 'agent', validation='contract')], actions=[{
            'id': 'extra', 'title': 'Optional document', 'enabled': True, 'source': 'work', 'event': 'accepted', 'workflow': child}])
        cid, run = self.open(main)
        claim = self.engine.claim(run['id'], 'work')
        run = self.engine.submit(run['id'], 'work', claim['token'], {'ok': True, 'summary': 'Principal ready'})
        run = activate_action(self.engine, run['id'], run['associated_actions'][0]['id'], human=True)
        page = run_page(self.engine, limit=1)
        self.assertEqual(page['family_counts'], {'requests': 1, 'tasks': 0, 'actions': 1})
        self.assertEqual(page['items'][0]['origin']['kind'], 'action')
        self.assertEqual(page['items'][0]['origin']['run'], run['id'])

    def test_large_child_output_is_not_loaded_per_child_or_embedded_in_parent(self):
        cid, parent = self.family(count=30)
        children = parent['nodes']['each']['children']
        claim = self.engine.claim(children[0]['run'], 'work')
        self.engine.submit(children[0]['run'], 'work', claim['token'], {'ok': True, 'summary': 'Large document', 'outputs': {'text': 'LARGE_PAYLOAD_' * 40000}})
        before = self.engine.events(parent['id'])
        # The parent is already authoritative. Child projection must use a
        # bounded batch query, never engine.run() for each member.
        with patch.object(self.engine, 'run', side_effect=AssertionError('Unbounded child read')):
            projected = run_detail(self.engine, parent)
            activity = conversation_activity(self.engine, cid)
        self.assertEqual(activity['items'], 1)
        self.assertEqual(activity['children']['items'], 30)
        self.assertEqual(len(projected['coordination']['each']['items']), 25)
        self.assertEqual(projected['coordination']['each']['next'], 25)
        encoded = json.dumps(projected)
        self.assertNotIn('LARGE_PAYLOAD_', encoded)
        self.assertLess(len(encoded), 150000)
        self.assertEqual(self.engine.events(parent['id']), before)

    def test_declared_parent_reference_without_membership_never_adds_child_counts(self):
        cid, parent = self.family(count=1)
        unrelated = self.graph([node('work', 'Unrelated', 'agent')])
        self.engine.start(self.project['id'], unrelated, parent={'run': parent['id'], 'node': 'each', 'element': 'R1', 'attempt': 1})
        activity = conversation_activity(self.engine, cid)
        self.assertEqual(activity['items'], 1)
        self.assertEqual(activity['children']['items'], 1)
        self.assertEqual(activity['ready'], 1)

    def test_paged_coordination_exposes_dependency_names_and_keeps_all_counts(self):
        from workflow_engine.iterations import overview
        cid, parent = self.family(count=30, dependencies={29: ['R0', 'R1']})
        members = parent['nodes']['each']['children']
        self.engine.claim(members[0]['run'], 'work')
        before = self.engine.events(parent['id'])
        with patch.object(self.engine, 'run', side_effect=AssertionError('No individual child reads')):
            page = overview(self.engine, parent, 'each', offset=25, limit=25)
        self.assertEqual(len(page['items']), 5)
        self.assertEqual(page['total'], 30)
        self.assertEqual(page['counts']['running'], 1)
        self.assertIsNone(page['next'])
        self.assertEqual(page['items'][-1]['reason'], 'Dépendances à terminer')
        self.assertEqual(page['items'][-1]['dependencies'], [
            {key: m[key] for key in ('element', 'title', 'project', 'run')} for m in members[:2]])
        self.assertEqual(conversation_activity(self.engine, cid)['dependencies'], 1)
        self.assertEqual(self.engine.events(parent['id']), before)

    def test_children_of_optional_action_never_become_principal_work(self):
        leaf = self.graph([node('work', 'Optional element', 'agent')], id='leaf')
        auxiliary = self.graph([node('plan', 'Optional plan', 'agent', validation='contract', outputs={'items': 'array'}),
                               node('each', 'Optional elements', 'foreach', inputs={'items': 'array'}, workflow=leaf,
                                    outputs={'results': 'array'}, concurrency=2)],
                              [{**edge('plan', 'each'), 'mapping': {'items': 'items'}}], id='auxiliary')
        graph = self.graph([node('work', 'Main work', 'agent', validation='contract')], actions=[
            {'id': 'draft', 'title': 'Optional follow-up', 'source': 'work', 'event': 'accepted', 'enabled': True, 'workflow': auxiliary}])
        cid, parent = self.open(graph)
        claim = self.engine.claim(parent['id'], 'work')
        parent = self.engine.submit(parent['id'], 'work', claim['token'], {'ok': True, 'summary': 'Done', 'outputs': {}})
        parent = activate_action(self.engine, parent['id'], parent['associated_actions'][0]['id'], human=True)
        child = parent['associated_actions'][0]['run']
        claim = self.engine.claim(child, 'plan')
        self.engine.submit(child, 'plan', claim['token'], {'ok': True, 'summary': 'Optional plan', 'outputs': {'items': [{'id': 'A'}, {'id': 'B'}]}})
        activate(self.engine, child, 'each')
        activity = conversation_activity(self.engine, cid)
        self.assertEqual(activity['items'], 1)
        self.assertEqual(activity['completed'], 1)
        self.assertEqual(activity['ready'], 0)
        self.assertEqual(activity['children']['items'], 0)
        self.assertEqual(activity['associated']['items'], 3)
        self.assertEqual(activity['associated']['actions'], 1)
        self.assertEqual(activity['associated']['ready'], 2)
        self.assertEqual(activity['associated']['coordination'], 1)


if __name__ == '__main__':
    unittest.main()

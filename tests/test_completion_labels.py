"""History retains frozen business choices without reading full result payloads."""
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from workflow_engine import Engine
from workflow_engine.projections import summary, _compact_runs


class CompletionLabelTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.engine = Engine(temp.name)
        self.project = self.engine.create_project('Historique des choix')

    def start(self, labels):
        graph = {'schema': 2, 'id': 'choices', 'title': 'Prioriser la demande', 'nodes': [
            {'id': 'gate' + str(i), 'kind': 'decision', 'title': 'Décider', 'options': ['approve', 'reject'],
             **({'option_labels': {'reject': label}} if label is not None else {})} for i, label in enumerate(labels)], 'edges': []}
        return self.engine.start(self.project['id'], graph)

    def decide(self, run, node, outcome='reject'):
        state = run['nodes'][node]
        return self.engine.decide(run['id'], node, state['nonce'], state['proposal'], outcome, human=True)

    def views(self, run):
        with self.engine.store.connect() as db:
            compact = next(_compact_runs(db, [run['id']]))
        return summary(run), summary(compact)

    def test_completed_history_uses_business_label_from_frozen_definition(self):
        run = self.start(['Prévoir plus tard'])
        self.assertIsNone(summary(run)['completion_label'])
        run = self.decide(run, 'gate0')
        changed = {**run['original'], 'nodes': [{**run['original']['nodes'][0], 'option_labels': {'reject': 'Ne plus traiter'}}]}
        self.engine.save(self.project['id'], changed)
        before = self.engine.run(run['id'])
        for view in self.views(run):
            self.assertEqual(view['completion_label'], 'Prévoir plus tard')
            self.assertEqual(view['completion_outcome'], 'rejected')
            self.assertNotIn('nodes', view['definition'])
        self.assertEqual(self.engine.run(run['id']), before)

    def test_ambiguous_or_unlabelled_decisions_keep_generic_fallback(self):
        for labels in (['Reporter', 'Annuler'], ['Reporter', None], [None]):
            with self.subTest(labels=labels):
                run = self.start(labels)
                for node in run['nodes']:
                    run = self.decide(run, node)
                for view in self.views(run):
                    self.assertIsNone(view['completion_label'])

    def test_identical_labels_are_bounded_and_approval_does_not_borrow_rejection_label(self):
        run = self.start(['Reporter', 'Reporter'])
        for node in run['nodes']:
            run = self.decide(run, node)
        for view in self.views(run):
            self.assertEqual(view['completion_label'], 'Reporter')
        accepted = self.decide(self.start(['Reporter']), 'gate0', 'approve')
        for view in self.views(accepted):
            self.assertIsNone(view['completion_label'])
        bounded = self.decide(self.start(['É' * 150]), 'gate0')
        for view in self.views(bounded):
            self.assertEqual(view['completion_label'], 'É' * 120)

    def test_report_uses_the_frozen_renamed_decision_instead_of_its_key(self):
        from workflow_engine.documentation import markdown
        graph = {'schema': 2, 'id': 'delivery', 'title': 'Choisir le canal', 'nodes': [
            {'id': 'gate', 'kind': 'decision', 'title': 'Destination', 'options': ['email', 'ticket'],
             'option_labels': {'email': 'Email au client', 'ticket': 'Réponse dans Odoo'}}], 'edges': []}
        run = self.engine.start(self.project['id'], graph)
        run = self.decide(run, 'gate', 'email')
        graph['nodes'][0]['option_labels']['email'] = 'Autre nom après exécution'
        self.engine.save(self.project['id'], graph)
        report = markdown(self.engine.run(run['id']))
        self.assertIn('**Email au client** — décision humaine conservée', report)
        self.assertNotIn('**email**', report)
        self.assertNotIn('Autre nom après exécution', report)

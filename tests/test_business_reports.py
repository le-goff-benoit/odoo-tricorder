"""Receive human handover from real engine history, without editing stored state."""
import copy
from pathlib import Path
import sys
import tempfile
import unittest

from native_cli_fixture import use_native_cli_fixtures

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine import Engine
from workflow_engine.documentation import export_work, markdown
from workflow_engine.business_markdown import value_lines, proof_link


class BusinessReportTests(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory(prefix="tricorder-report-reception-")
        self.addCleanup(folder.cleanup)
        use_native_cli_fixtures(self, folder.name)
        self.engine = Engine(folder.name)
        self.project = self.engine.create_project("Passation fictive")
        self.graph = {"schema": 1, "id": "meeting", "title": "Compte rendu fictif", "nodes": [
            {"id": "work", "kind": "agent", "title": "Préparer le compte rendu", "validation": "human", "max_attempts": 3,
             "outputs": {"report": "object", "verdict": "string"}, "route_output": "verdict", "options": ["pass", "fail"]}], "edges": []}
        self.current = self.engine.start(self.project["id"], self.graph, driver="conversation", parameters={"request": "Restituer la décision de report et les actions."})

    def submit(self, summary, filename, report, verdict="pass"):
        proof = {**self.engine.artifact(summary.encode()), "filename": filename, "role": "deliverable"}
        claim = self.engine.claim(self.current["id"], "work")
        self.current = self.engine.submit(self.current["id"], "work", claim["token"], {
            "ok": True, "simulated": True, "summary": summary, "outputs": {"report": report, "verdict": verdict}, "evidence": [proof]})
        return proof

    def test_handover_names_current_and_old_evidence_and_preserves_the_exact_retry_reason(self):
        old = self.submit("Première tentative : date omise.", "compte-rendu-tentative1.md", {"actions": [{"action": "Vérifier les salles", "owner": "Alice"}]})
        reason = "Ajouter le 16 octobre 2026 et conserver la décision de report."
        self.engine.retry(self.current["id"], "work", reason, human=True)
        new = self.submit("Deuxième tentative corrigée.", "compte-rendu.md", {"actions": [{"action": "Vérifier les salles", "owner": "Alice", "due": "16 octobre 2026"}], "custom_reference": "SALLE-42"})
        self.current = self.engine.accept(self.current["id"], "work", human=True, checks=[], note="Dates relues.")
        before = copy.deepcopy(self.current)
        destination = Path(export_work(self.engine, self.current["id"], "passation"))
        report = destination.read_text()
        for expected in (reason, "Tentative 1", "Tentative 2", "Première tentative : date omise.", "Deuxième tentative corrigée.",
                         "| Action | Responsable | Échéance |", "Alice", "16 octobre 2026", "SALLE-42", "Conforme", "Résultat simulé"):
            self.assertIn(expected, report)
        for proof in (old, new):
            self.assertIn("Livrable — " + proof["filename"], report)
            self.assertEqual((destination.parent / ".suivi/preuves" / proof["sha256"]).read_bytes(), self.engine.evidence(proof))
        self.assertNotIn('"actions":', report)
        self.assertNotIn("Consulter la preuve", report)
        self.assertEqual(self.engine.run(self.current["id"]), before)

    def test_business_negative_verdict_is_readable_without_becoming_technical_failure(self):
        self.submit("Budget dépassé.", "avis.md", {"finding": "Dépassement de 150 euros.", "next_action": "Demander une proposition révisée."}, verdict="fail")
        report = markdown(self.current)
        self.assertIn("Non conforme", report)
        self.assertIn("Suite proposée", report)
        self.assertIn("À valider", report)
        self.assertNotIn("Échec", report)
        self.assertEqual(self.engine.run(self.current["id"])["nodes"]["work"]["status"], "returned")

    def test_unknown_fields_survive_and_untrusted_values_cannot_form_links_or_html(self):
        report = "\n".join(value_lines({"custom_field": "KEEP", "actions": [{"action": "<script>x</script>", "owner": "[click](javascript:bad)", "due": "A | B", "extra": "RETAIN"}]}))
        self.assertIn("KEEP", report)
        self.assertIn("RETAIN", report)
        self.assertIn("&lt;script&gt;", report)
        self.assertNotIn("<script>", report)
        self.assertNotIn("[click]", report)
        self.assertIn("A \\| B", report)
        self.assertNotIn("](", proof_link({"sha256": "../other", "name": "bad"}))

    def test_structured_output_proofs_are_exported_and_unusual_metadata_does_not_break_handover(self):
        nested = {**self.engine.artifact(b"Structured deliverable"), "filename": "livrable.txt", "role": "deliverable"}
        direct = {**self.engine.artifact(b"Direct proof"), "name": ["ignored"], "filename": "source.txt", "role": ["source", "deliverable"]}
        claim = self.engine.claim(self.current["id"], "work")
        self.current = self.engine.submit(self.current["id"], "work", claim["token"], {
            "ok": True, "summary": "Résultat structuré.", "outputs": {"report": {"$artifact": nested}, "verdict": "pass"}, "evidence": [direct]})
        destination = Path(export_work(self.engine, self.current["id"], "pieces-structurees"))
        report = destination.read_text()
        for proof in (nested, direct):
            self.assertIn(proof["filename"], report)
            self.assertIn(".suivi/preuves/" + proof["sha256"], report)
            self.assertEqual((destination.parent / ".suivi/preuves" / proof["sha256"]).read_bytes(), self.engine.evidence(proof))
        actions = {"actions": [{"action": "Relire", "owner": "Alice", "checks": [{"action": "Vérifier", "owner": "Bob", "due": "16 octobre"}]}]}
        rendered = "\n".join(value_lines(actions))
        self.assertIn("**Action**\n\nRelire", rendered)
        self.assertIn("| Vérifier | Bob | 16 octobre |", rendered)
        self.assertEqual(rendered.count("| Action | Responsable | Échéance |"), 1)

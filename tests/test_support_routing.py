"""Injected results qualify routing, never model judgement or real deployment."""
import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine import ContractError, Engine, validate


class SupportRoutingTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = temporary.name
        self.engine = Engine(self.root)
        self.project = self.engine.create_project("Support synthétique")
        self.graph = json.loads((Path(__file__).parent / "fixtures/support-routing.json").read_text())

    def receive(self, run, nid, outputs=None, evidence=None):
        claim = self.engine.claim(run["id"], nid)
        self.engine.submit(run["id"], nid, claim["token"], {
            "ok": True, "summary": "Résultat injecté pour tester le moteur",
            "outputs": outputs or {}, "evidence": evidence or [],
        })
        return self.engine.accept(run["id"], nid, human=True,
                                  checks=claim["node"].get("criteria", []),
                                  note="Réception synthétique ; aucun contrôle métier réel.")

    def start(self, provider="codex"):
        graph = copy.deepcopy(self.graph)
        graph["defaults"]["provider"] = provider
        run = self.engine.start(self.project["id"], graph, simulation=True)
        return self.receive(run, "intake", {"ticket": {
            "id": "ticket-synthetic-1", "request": "Un traitement est indisponible.",
        }})

    def classify(self, run, severity):
        return self.receive(run, "assess", {
            "severity": severity, "rationale": "Constat synthétique pour " + severity,
            "missing": ["Combien d’utilisateurs sont affectés ?"] if severity == "unknown" else [],
        })

    def urgent_ready(self):
        run = self.classify(self.start(), "critical")
        proof = self.engine.artifact(b"synthetic fixture, not real test evidence")
        return self.receive(run, "urgent", evidence=[proof])

    def test_same_contract_routes_identically_for_both_provider_settings(self):
        for severity, active in (("critical", "urgent"), ("normal", "normal"), ("unknown", "question")):
            states = []
            for provider in ("codex", "claude"):
                with self.subTest(severity=severity, provider=provider):
                    run = self.classify(self.start(provider), severity)
                    agent = next(n for n in run["definition"]["nodes"] if n["id"] == "assess")
                    self.assertEqual(agent["execution"]["provider"], provider)
                    self.assertEqual(run["nodes"]["assess"]["inputs"]["ticket"]["id"], "ticket-synthetic-1")
                    self.assertEqual(run["nodes"]["route"]["outcome"], severity)
                    self.assertEqual(run["nodes"][active]["inputs"]["rationale"], "Constat synthétique pour " + severity)
                    for other in {"urgent", "normal", "question"} - {active}:
                        self.assertEqual(run["nodes"][other]["status"], "skipped")
                    states.append({nid: s["status"] for nid, s in run["nodes"].items()})
            self.assertEqual(*states)

    def test_unknown_preserves_question_and_inputs_after_restart(self):
        run = self.classify(self.start(), "unknown")
        state = run["nodes"]["question"]
        reopened = Engine(self.root).run(run["id"])
        self.assertEqual(reopened["nodes"]["question"], state)
        self.assertEqual(state["status"], "waiting")
        self.assertEqual(state["inputs"]["missing"], ["Combien d’utilisateurs sont affectés ?"])
        self.assertEqual(reopened["nodes"]["deploy"]["status"], "skipped")

    def test_unrecognized_answer_remains_correctable_without_selecting_a_default_branch(self):
        run = self.start()
        with self.assertRaisesRegex(ContractError, "Support critique"):
            self.classify(run, "probably-critical")
        run = self.engine.run(run["id"])
        self.assertEqual(run["nodes"]["assess"]["status"], "returned")
        self.assertEqual(run["nodes"]["route"]["status"], "pending")
        for nid in ("urgent", "normal", "question", "approval", "deploy"):
            self.assertEqual(run["nodes"][nid]["status"], "pending")
        run = self.engine.retry(run["id"], "assess", "Employer une issue prévue ou demander une information.", human=True)
        run = self.classify(run, "unknown")
        self.assertEqual(run["nodes"]["question"]["status"], "waiting")
        self.assertEqual(run["nodes"]["assess"]["attempt"], 2)
        self.assertEqual(run["nodes"]["assess"]["history"][0]["result"]["outputs"]["severity"], "probably-critical")

    def test_incomplete_agent_output_is_not_received(self):
        run = self.start()
        with self.assertRaisesRegex(ContractError, "rationale"):
            self.receive(run, "assess", {"severity": "critical", "missing": []})
        state = self.engine.run(run["id"])
        self.assertEqual(state["nodes"]["assess"]["status"], "returned")
        self.assertEqual(state["nodes"]["route"]["status"], "pending")

    def test_automatic_receipt_also_preserves_an_invalid_result_for_correction(self):
        graph = copy.deepcopy(self.graph)
        producer = next(n for n in graph["nodes"] if n["id"] == "assess")
        producer.update(kind="document", validation="automatic", criteria=[])
        run = self.engine.start(self.project["id"], graph, simulation=True)
        run = self.receive(run, "intake", {"ticket": {"id": "synthetic"}})
        claim = self.engine.claim(run["id"], "assess")
        run = self.engine.submit(run["id"], "assess", claim["token"], {
            "ok": True, "summary": "Classification issue d’une règle synthétique",
            "outputs": {"severity": "probably-critical", "rationale": "Exemple", "missing": []},
            "evidence": [self.engine.artifact(b"synthetic classification")],
        })
        self.assertEqual(run["nodes"]["assess"]["status"], "returned")
        self.assertIn("Support critique", run["nodes"]["assess"]["validation_error"])
        self.assertEqual(run["nodes"]["route"]["status"], "pending")

    def test_changed_routing_options_prevent_reusing_an_incompatible_old_result(self):
        graph = copy.deepcopy(self.graph)
        graph["nodes"] = [n for n in graph["nodes"] if n["id"] != "intake"]
        graph["edges"] = [e for e in graph["edges"] if e["from"] != "intake"]
        producer = next(n for n in graph["nodes"] if n["id"] == "assess")
        producer.update(kind="document", reuse=True)
        old = copy.deepcopy(graph)
        next(n for n in old["nodes"] if n["id"] == "route")["options"].append("old-choice")
        run = self.engine.start(self.project["id"], old, simulation=True)
        run = self.receive(run, "assess", {
            "severity": "old-choice", "rationale": "Ancienne classification", "missing": [],
        }, [self.engine.artifact(b"old synthetic result")])
        fresh = self.engine.start(self.project["id"], graph, simulation=True, reuse_from=run["id"])
        self.assertEqual(fresh["nodes"]["assess"]["status"], "ready")
        self.assertNotIn("reused_from", fresh["nodes"]["assess"])

    def test_text_not_used_as_a_branch_choice_remains_unconstrained(self):
        graph = copy.deepcopy(self.graph)
        graph["parameters"] = {"severity": "normal"}
        mapping = next(e for e in graph["edges"] if e["id"] == "assess-route")["mapping"]
        del mapping["severity"]
        run = self.engine.start(self.project["id"], graph, simulation=True)
        run = self.receive(run, "intake", {"ticket": {"id": "synthetic"}})
        run = self.classify(run, "free-text-not-used-for-routing")
        self.assertEqual(run["nodes"]["route"]["outcome"], "normal")
        self.assertEqual(run["nodes"]["normal"]["status"], "ready")

    def test_critical_requires_proof_then_exact_human_decision_before_direct_production(self):
        run = self.classify(self.start(), "critical")
        with self.assertRaisesRegex(ContractError, "Preuve"):
            self.receive(run, "urgent")
        self.assertEqual(self.engine.run(run["id"])["nodes"]["approval"]["status"], "pending")

        run = self.urgent_ready()
        with self.assertRaises(ContractError):
            self.engine.claim(run["id"], "deploy")
        state = run["nodes"]["approval"]
        args = (run["id"], "approval", state["nonce"], state["proposal"], "approve")
        with self.assertRaises(ContractError):
            self.engine.decide(*args)
        run = self.engine.decide(*args, human=True)
        self.assertEqual(run["nodes"]["deploy"]["status"], "ready")
        self.assertFalse(any("staging" in n["id"] for n in run["definition"]["nodes"]))
        run = self.receive(run, "deploy")
        self.assertEqual(run["nodes"]["verify"]["status"], "ready")
        self.assertEqual(run["status"], "active")

    def test_rejection_and_candidate_change_cannot_reuse_approval(self):
        run = self.urgent_ready()
        state = run["nodes"]["approval"]
        run = self.engine.decide(run["id"], "approval", state["nonce"], state["proposal"], "reject", human=True)
        self.assertEqual(run["nodes"]["deploy"]["status"], "skipped")
        self.assertEqual(run["nodes"]["verify"]["status"], "skipped")
        changed = copy.deepcopy(self.graph)
        next(n for n in changed["nodes"] if n["id"] == "deploy")["operation"]["candidate"] = "different-sha"
        with self.assertRaisesRegex(ContractError, "opération exacte"):
            validate(changed)
        # A new run of the same definition still needs its own human decision.
        fresh = self.urgent_ready()
        self.assertNotEqual(fresh["nodes"]["approval"]["proposal"], state["proposal"])
        self.assertEqual(fresh["nodes"]["approval"]["status"], "waiting")


if __name__ == "__main__":
    unittest.main()

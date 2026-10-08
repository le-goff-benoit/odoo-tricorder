import concurrent.futures
import copy
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine import ContractError, Engine, validate
from workflow_engine.contracts import expand, semantic_digest
from workflow_engine.library import templates, node, edge


class WorkflowEngineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.engine = Engine(self.temp.name)
        self.project = self.engine.create_project("Sans Odoo")
        self.graph = templates()[0]

    def start(self, graph=None):
        return self.engine.start(self.project["id"], graph or self.graph, simulation=True)

    def finish(self, run, nid):
        claim = self.engine.claim(run["id"], nid)
        self.engine.submit(run["id"], nid, claim["token"], {"ok": True, "summary": "Résultat"})
        return self.engine.accept(run["id"], nid, human=True, checks=claim["node"].get("criteria", []), note="Vérifié dans le résultat")

    def test_contract_errors_and_semantic_layout(self):
        for graph in templates():
            validate(graph)
        moved = copy.deepcopy(self.graph)
        moved["nodes"][0]["position"]["x"] += 99
        self.assertEqual(semantic_digest(moved), semantic_digest(self.graph))
        moved["nodes"][0]["criteria"].append("Nouveau critère")
        self.assertNotEqual(semantic_digest(moved), semantic_digest(self.graph))
        for mutate in (lambda g: g["nodes"].append(g["nodes"][0]), lambda g: g["edges"].append(edge("bilan", "analyse")), lambda g: g["edges"][0].update(mapping={"missing": "port"})):
            broken = copy.deepcopy(self.graph)
            mutate(broken)
            with self.assertRaises(ContractError):
                validate(broken)

    def test_project_revision_conflict_and_run_immutable(self):
        saved = self.engine.save(self.project["id"], self.graph)
        run = self.start(saved)
        saved["title"] = "Version deux"
        self.engine.save(self.project["id"], saved, 1)
        with self.assertRaisesRegex(ContractError, "Conflit"):
            self.engine.save(self.project["id"], saved, 1)
        self.assertNotEqual(self.engine.run(run["id"])["definition"]["title"], saved["title"])

    def test_branches_and_durable_human_decision(self):
        run = self.finish(self.start(), "analyse")
        self.assertEqual(run["nodes"]["build"]["status"], "ready")
        self.assertEqual(run["nodes"]["test"]["status"], "ready")
        run = self.finish(run, "build")
        self.assertEqual(run["nodes"]["join"]["status"], "pending")
        run = self.finish(run, "test")
        self.engine = Engine(self.temp.name)
        run = self.engine.run(run["id"])
        state = run["nodes"]["decision"]
        self.assertEqual(state["status"], "waiting")
        args = (run["id"], "decision", state["nonce"], state["proposal"], "reject")
        with self.assertRaises(ContractError):
            self.engine.decide(*args)
        run = self.engine.decide(*args, human=True)
        self.assertEqual(run["nodes"]["bilan"]["status"], "skipped")
        self.assertEqual(run["status"], "completed")
        with self.assertRaises(ContractError):
            self.engine.decide(*args, human=True)

    def test_concurrent_claim_and_resource_lock(self):
        self.graph["nodes"][0]["resources"] = ["workspace"]
        a, b = self.start(), self.start()
        def claim(run):
            try:
                return self.engine.claim(run["id"], "analyse")
            except ContractError:
                return None
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            results = list(pool.map(claim, [a, b]))
        self.assertEqual(sum(r is not None for r in results), 1)
        claimed = next(r for r in results if r)
        with self.assertRaises(ContractError):
            self.engine.submit(claimed["run"]["id"], "analyse", "wrong", {"summary": "x"})

    def test_failed_missing_and_altered_evidence_never_accepted(self):
        graph = {"schema": 1, "id": "proof", "title": "Preuves", "nodes": [node("test", "Vérifier", evidence_required=True)], "edges": []}
        run = self.start(graph)
        claim = self.engine.claim(run["id"], "test")
        self.engine.submit(run["id"], "test", claim["token"], {"ok": True, "summary": "Tout va bien"})
        with self.assertRaisesRegex(ContractError, "Preuve"):
            self.engine.accept(run["id"], "test", human=True, checks=[])
        reference = self.engine.artifact(b"test result")
        self.assertEqual(self.engine.evidence(reference), b"test result")
        (Path(self.temp.name) / "artifacts" / reference["sha256"]).write_text("tampered")
        with self.assertRaisesRegex(ContractError, "altérée"):
            self.engine.evidence(reference)
        with self.assertRaises(ContractError):
            self.engine.evidence({"sha256": "../../etc/passwd"})

    def test_pause_late_result_and_bounded_retry(self):
        run = self.start()
        claim = self.engine.claim(run["id"], "analyse")
        self.engine.control(run["id"], "pause")
        self.engine.submit(run["id"], "analyse", claim["token"], {"ok": False, "summary": "Échec"})
        with self.assertRaises(ContractError):
            self.engine.accept(run["id"], "analyse", human=True, checks=[])
        self.engine.retry(run["id"], "analyse", "Corriger", human=True)
        with self.assertRaises(ContractError):
            self.engine.claim(run["id"], "analyse")
        self.engine.control(run["id"], "resume")
        second = self.engine.claim(run["id"], "analyse")
        with self.assertRaises(ContractError):
            self.engine.submit(run["id"], "analyse", claim["token"], {"summary": "Ancien résultat"})
        self.engine.submit(run["id"], "analyse", second["token"], {"summary": "Échec", "ok": False})
        with self.assertRaisesRegex(ContractError, "Limite"):
            self.engine.retry(run["id"], "analyse", "Encore", human=True)

    def test_subworkflows_are_namespaced_and_recursion_refused(self):
        child = {"schema": 1, "id": "child", "title": "Enfant", "nodes": [node("work", "Travail")], "edges": []}
        parent = {"schema": 1, "id": "parent", "title": "Parent", "nodes": [node("one", "Un", "subworkflow", workflow="child", parameters={"key": 1}), node("two", "Deux", "subworkflow", workflow="child", parameters={"key": 2})], "edges": []}
        resolved = expand(parent, {"child": child})
        self.assertEqual([n["parameters"]["key"] for n in resolved["nodes"] if n["id"].endswith(".work")], [1, 2])
        child["nodes"] = [node("recursive", "Récursion", "subworkflow", workflow="parent")]
        with self.assertRaisesRegex(ContractError, "récursif"):
            expand(parent, {"child": child, "parent": parent})

    def test_external_approval_exact_target_candidate_and_consumption(self):
        op = {"action": "deploy", "target": "staging", "candidate": "sha-123"}
        graph = {"schema": 1, "id": "deploy", "title": "Livrer", "nodes": [node("gate", "Autoriser", "decision", operation=op, options=["approve", "reject"]), node("deploy", "Déployer", "external", operation=op, approval="gate")], "edges": [edge("gate", "deploy", "approve")]}
        changed = copy.deepcopy(graph)
        changed["nodes"][1]["operation"]["target"] = "production"
        # deepcopy preserves shared references; explicitly separate the changed operation.
        changed["nodes"][0]["operation"] = op
        with self.assertRaises(ContractError):
            validate(changed)
        run = self.start(graph)
        state = run["nodes"]["gate"]
        self.engine.decide(run["id"], "gate", state["nonce"], state["proposal"], "approve", human=True)
        self.engine.claim(run["id"], "deploy")
        with self.assertRaises(ContractError):
            self.engine.claim(run["id"], "deploy")


if __name__ == "__main__":
    unittest.main()

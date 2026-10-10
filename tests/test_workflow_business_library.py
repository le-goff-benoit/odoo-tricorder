"""Source fidelity and final verification contracts, with synthetic business data."""
import copy
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine import Engine, validate
from workflow_engine.conversations import answer
from workflow_engine.library import templates
from workflow_engine.runtime import preflight


class BusinessLibraryTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.engine = Engine(temporary.name)
        self.project = self.engine.create_project("Sources synthétiques")
        self.models = {graph["id"]: graph for graph in templates()}

    def submit(self, run, nid, outputs, **extra):
        claim = self.engine.claim(run["id"], nid)
        return self.engine.submit(run["id"], nid, claim["token"],
                                 {"ok": True, "summary": "Fixture de contrat, aucune IA évaluée",
                                  "outputs": outputs, **extra})

    def test_production_library_distinguishes_methods_components_and_learning(self):
        for graph in self.models.values():
            validate(graph)
            self.assertIn(graph["catalog_kind"], {"workflow", "component", "demo"})
        for key in ("support-method", "meeting-method"):
            graph = self.models[key]
            self.assertEqual(graph["catalog_kind"], "workflow")
            self.assertNotIn("simulation", graph["description"].lower())
            self.assertEqual(len(set(node["phase"] for node in graph["nodes"])), 3)
            self.assertEqual(len(graph["result_names"]), 3)
            self.assertFalse(any(node["kind"] in {"external", "communication", "decision"}
                                 for node in graph["nodes"]))
        self.assertEqual(self.models["communication"]["catalog_kind"], "component")
        self.assertEqual(self.models["first-workflow"]["catalog_kind"], "demo")

    def test_unread_or_missing_meeting_sources_never_release_analysis(self):
        run = self.engine.start(self.project["id"], self.models["meeting-method"])
        run = self.submit(run, "source", {"selected_meetings": []})
        self.assertEqual(run["nodes"]["source"]["status"], "returned")
        self.assertEqual(run["nodes"]["analysis"]["status"], "pending")
        self.engine.retry(run["id"], "source", "Demander les notes manquantes", human=True)
        run = self.submit(run, "source", {}, question="Quelles réunions et quelles notes examiner ?")
        self.assertEqual(run["nodes"]["analysis"]["status"], "pending")
        run = answer(self.engine, run["id"], "source", run["nodes"]["source"]["question"]["id"],
                     "Les deux ateliers A et B ; notes fournies.")
        self.assertEqual(run["nodes"]["source"]["status"], "ready")
        self.assertEqual(run["nodes"]["analysis"]["status"], "pending")

    def test_generic_sources_require_real_read_capability_before_automatic_launch(self):
        graph = copy.deepcopy(self.models["meeting-method"])
        graph["defaults"] = {"provider": "codex", "model": "fixture"}
        catalog = {key: {"id": key, "installed": True, "usable": True}
                   for key in ("codex", "claude", "command")}
        checked = preflight(graph, defaults=self.project["defaults"], project=self.project,
                            engine=self.engine, mode="automatic", _catalog=catalog)
        source_issues = [issue for issue in checked if issue["node"] == "source"]
        self.assertTrue(any(issue.get("code") == "executor.capabilities-missing" for issue in source_issues))
        # Native execution can really read a file/service using its available
        # tools. This fixture checks capability gating, not source retrieval.
        checked = preflight(graph, defaults=self.project["defaults"], project=self.project,
                            engine=self.engine, mode="native", provider="codex", model="fixture", _catalog=catalog)
        self.assertFalse(any(issue["node"] == "source" for issue in checked))

    def test_multiple_meeting_sources_reach_checker_before_final_delivery(self):
        run = self.engine.start(self.project["id"], self.models["meeting-method"])
        meetings = [{"title": "A", "content": "Décision : tester jeudi."},
                    {"title": "B", "content": "Le report est proposé, sans décision."}]
        actions = [{"action": "Tester jeudi", "owner": "À préciser"}]
        run = self.submit(run, "source", {"selected_meetings": meetings})
        run = self.submit(run, "analysis", {"selected_meetings": meetings,
                                           "analysis": "A : test décidé. B : report proposé.", "actions": actions})
        run = self.submit(run, "write", {"selected_meetings": meetings, "minutes": "A et B : décisions et proposition.",
                                        "actions": actions, "draft": "Objet : suivi\n\nTest jeudi ; report à confirmer."})
        self.assertNotEqual(run["status"], "completed")
        self.assertEqual(run["nodes"]["check"]["inputs"]["selected_meetings"], meetings)
        run = self.submit(run, "check", {"minutes": "A : test jeudi. B : report à confirmer.", "actions": actions,
                                        "draft": "Objet : suivi\n\nTest jeudi ; report non décidé.",
                                        "check_summary": "Fixture : comparaison aux deux notes synthétiques."})
        self.assertEqual(run["completion_outcome"], "succeeded")
        self.assertEqual(set(run["nodes"]["check"]["result"]["outputs"]),
                         {"minutes", "actions", "draft", "check_summary"})

    def test_support_checker_keeps_original_source_and_missing_final_results_fail(self):
        graph = self.models["support-method"]
        run = self.engine.start(self.project["id"], graph, parameters={"support_destination": "Texte pour un ticket"})
        sources = [{"reference": "Texte collé", "content": "La page ne montre pas la date attendue."}]
        run = self.submit(run, "source", {"sources": sources})
        run = self.submit(run, "diagnosis", {"sources": sources, "diagnostic": "Défaut suspecté, non reproduit.",
                                            "next_actions": "Obtenir le contexte et reproduire."})
        run = self.submit(run, "response", {"sources": sources, "diagnostic": "Défaut suspecté, non reproduit.",
                                           "next_actions": "Obtenir le contexte et reproduire.", "draft": "Pouvez-vous préciser le contexte ?"})
        self.assertEqual(run["nodes"]["check"]["inputs"]["sources"], sources)
        self.assertEqual(run["definition"]["nodes"][-1]["profile"], "verification")
        run = self.submit(run, "check", {"draft": "Tout est résolu."})
        self.assertEqual(run["nodes"]["check"]["status"], "returned")
        self.assertNotEqual(run["status"], "completed")

    def test_loading_new_library_cannot_modify_saved_client_definition_or_active_run(self):
        old = copy.deepcopy(self.models["meeting-conversation"])
        old["title"] = "Méthode de notre client"
        saved = self.engine.save(self.project["id"], old)
        run = self.engine.start(self.project["id"], saved)
        templates()
        self.assertEqual(self.engine.workflows(self.project["id"]), [saved])
        self.assertEqual(self.engine.run(run["id"])["definition"], run["definition"])


if __name__ == "__main__":
    unittest.main()

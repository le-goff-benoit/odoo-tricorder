"""Application roles are instructions, independent of provider and project packs."""
import copy
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine import ContractError, Engine
from workflow_engine.packs import builtin_profiles, profile_issues, resolve_profiles


class BuiltinRolesTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.engine = Engine(temporary.name)
        self.project = self.engine.create_project("Projet sans pack")

    def graph(self, kind="agent", profile="verification"):
        return {"schema": 1, "id": "roles", "title": "Vérifier un texte",
                "defaults": {"provider": "claude", "model": "fixture"},
                "nodes": [{"id": "check", "kind": kind, "title": "Relire", "profile": profile,
                           "validation": "contract", "outputs": {"result": "string"}}], "edges": []}

    def test_roles_work_without_installing_pack_and_are_frozen_for_all_text_work(self):
        original_project = copy.deepcopy(self.project)
        for kind in ("agent", "task", "document"):
            with self.subTest(kind=kind):
                graph = self.graph(kind)
                original = copy.deepcopy(graph)
                self.assertEqual(profile_issues(self.project, graph), [])
                run = self.engine.start(self.project["id"], graph)
                frozen = run["definition"]["nodes"][0]
                self.assertIn("sources originales", frozen["profile_text"])
                self.assertTrue(frozen["profile_sha256"])
                claim = self.engine.claim(run["id"], "check")
                self.assertEqual(claim["node"]["profile_text"], frozen["profile_text"])
                self.assertEqual(graph, original)
        self.assertEqual(self.engine.project(self.project["id"]), original_project)

    def test_missing_profiles_block_task_document_and_preview_reports_them(self):
        for kind in ("task", "document"):
            graph = self.graph(kind, "missing-profile")
            self.assertEqual(profile_issues(self.project, graph)[0]["code"], "profile.unavailable")
            with self.assertRaisesRegex(ContractError, "missing-profile"):
                self.engine.start(self.project["id"], graph)

    def test_generalist_selection_clears_stale_resolved_instructions_and_hash(self):
        graph = self.graph("document", "generalist")
        graph["nodes"][0].update(profile_text="ancienne consigne", profile_sha256="ancien hash")
        resolve_profiles(self.project, graph)
        self.assertNotIn("profile_text", graph["nodes"][0])
        self.assertNotIn("profile_sha256", graph["nodes"][0])

    def test_builtin_catalog_is_a_fresh_copy_and_does_not_embed_provider(self):
        roles = builtin_profiles()
        self.assertEqual({role["id"] for role in roles},
                         {"recherche", "analyse", "redaction", "verification", "coordination", "livraison"})
        roles[0]["text"] = "modified"
        self.assertNotEqual(builtin_profiles()[0]["text"], "modified")
        self.assertTrue(all("provider" not in role and "model" not in role for role in roles))


if __name__ == "__main__":
    unittest.main()

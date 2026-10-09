import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine import Engine, ContractError, validate
from workflow_engine.guidance import prepare, managed_text, sync
from workflow_engine.integrations import catalog, capabilities, issues
from workflow_engine.library import node
from workflow_engine.projects import initialize


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.engine = Engine(self.root / "state")
        self.project = self.engine.create_project("Démonstration")

    def test_project_is_git_root_and_duplicate_or_subfolder_rejected(self):
        repo = Path(self.project["path"])
        self.assertTrue((repo / ".git").is_dir())
        with self.assertRaisesRegex(ContractError, "déjà"):
            self.engine.create_project("Doublon", repo)
        child = repo / "src"
        child.mkdir()
        with self.assertRaisesRegex(ContractError, "racine"):
            self.engine.create_project("Sous-dossier", child)
        with self.assertRaisesRegex(ContractError, "pas un dépôt"):
            self.engine.create_project("Sans Git", self.root)
        bare = self.root / "bare"
        subprocess.run(["git", "init", "--bare", "--quiet", str(bare)], check=True, capture_output=True)
        with self.assertRaises(ContractError):
            self.engine.create_project("Dépôt nu", bare)
        repo2 = self.root / "existing"
        initialize(repo2)
        self.assertEqual(self.engine.create_project("Existant", repo2)["path"], str(repo2))

    def test_scoped_guidance_preserves_all_user_instructions(self):
        repo = Path(self.project["path"])
        (repo / "AGENTS.md").write_text("Consignes projet")
        workspace = prepare(self.project)
        guide = Path(workspace["instructions"])
        self.assertEqual(Path(workspace["cwd"]), repo / ".tricorder")
        self.assertIn("sans agent dédié", guide.read_text())
        guide.write_text(managed_text("Ancienne version\n", version=6))
        self.assertEqual(sync(self.engine)[0]["status"], "updated")
        self.assertIn("candidate_check:true", guide.read_text())
        self.assertIn("verdict", guide.read_text())
        self.assertIn("version=7", guide.read_text())
        self.assertIn("sans agent dédié", guide.read_text())
        guide.write_text("Mes consignes adaptées")
        self.assertEqual(prepare(self.project)["status"], "customized")
        self.assertEqual(guide.read_text(), "Mes consignes adaptées")
        self.assertEqual((repo / "AGENTS.md").read_text(), "Consignes projet")

    def test_arbitrary_new_plugin_is_visible_but_cannot_self_authorize(self):
        folder = Path(prepare(self.project)["cwd"])
        plugin = {"id": "future-plugin", "title": "Un nouveau plugin", "provider": "codex", "operations": ["read", "send"]}
        path = folder / "plugins.json"
        path.write_text(json.dumps({"schema": 1, "plugins": [plugin]}))
        self.assertEqual(catalog(self.project)["plugins"], [plugin])
        self.assertIsNone(capabilities(self.project)[0]["connected"])
        binding = {"plugin": plugin["id"], "operation": "read"}
        graph = {"schema": 1, "id": "generic", "title": "Agentic sans profil", "nodes": [node("work", "Lire", "agent", profile="generalist", model="chosen", capabilities=[binding])], "edges": []}
        validate(graph)
        self.assertIn("non qualifié", issues(graph, self.project)[0]["message"])
        with self.assertRaisesRegex(ContractError, "non qualifié"):
            self.engine.start(self.project["id"], graph)
        run = self.engine.start(self.project["id"], graph, simulation=True)
        path.write_text(json.dumps({"schema": 1, "plugins": []}))
        self.assertEqual(self.engine.run(run["id"])["plugins"]["plugins"], [plugin])
        self.assertIn("absente", issues(graph, self.project)[0]["message"])
        plugin["connected"] = True
        path.write_text(json.dumps({"schema": 1, "plugins": [plugin]}))
        with self.assertRaises(ContractError):
            catalog(self.project)

    def test_guidance_and_catalog_refuse_outside_links(self):
        folder = Path(prepare(self.project)["cwd"])
        (folder / "plugins.json").symlink_to(self.root / "outside.json")
        with self.assertRaises(ContractError):
            catalog(self.project)
        (folder / "AGENTS.md").unlink()
        (folder / "AGENTS.md").symlink_to(self.root / "outside.md")
        with self.assertRaises(ContractError):
            prepare(self.project)

    def test_native_inventory_does_not_forward_secrets_or_infer_auth(self):
        from connectors.discovery import normalize
        result = normalize({"installed": [{"pluginId": "new-plugin@catalog", "name": "Future plugin", "installed": True, "enabled": True, "source": {"secret": "sensitive-value"}, "authPolicy": "connected"}]})
        self.assertTrue(result[0]["installed"])
        self.assertIsNone(result[0]["connected"])
        self.assertFalse(result[0]["usable"])
        self.assertNotIn("sensitive-value", json.dumps(result))

    def test_wrong_typed_result_never_advances_downstream(self):
        graph = {"schema": 1, "id": "types", "title": "Contrat", "nodes": [node("work", "Compter", outputs={"count": "number"})], "edges": []}
        for outputs in ({}, {"count": True}, {"count": "12"}):
            run = self.engine.start(self.project["id"], graph, simulation=True)
            claim = self.engine.claim(run["id"], "work")
            self.engine.submit(run["id"], "work", claim["token"], {"ok": True, "summary": "Résultat erroné", "outputs": outputs})
            with self.assertRaisesRegex(ContractError, "Sortie count"):
                self.engine.accept(run["id"], "work", human=True, checks=[])
            self.assertEqual(self.engine.run(run["id"])["nodes"]["work"]["status"], "returned")

    def test_optional_pack_only_constrains_its_domain(self):
        from workflow_engine.packs import policy_issues
        project = {**self.project, "packs": [{"policies": {"domain": "odoo", "series_required": True}, "profiles": [{"id": "odoo-deployer"}]}]}
        graph = {"schema": 1, "id": "analyse", "title": "Analyse", "nodes": [node("work", "Lire", "agent", profile="generalist")], "edges": []}
        self.assertEqual(policy_issues(project, graph), [])

        graph["nodes"][0]["profile"] = "odoo-deployer"
        self.assertTrue(policy_issues(project, graph))
        graph["parameters"] = {"series": "19.0"}
        self.assertEqual(policy_issues(project, graph), [])

    def test_global_runs_and_schedules_need_no_git_project(self):
        from workflow_engine.schedules import Schedules
        from studio import request
        context = self.engine.workspace_context()
        self.assertFalse((Path(context["path"]) / ".git").exists())
        self.assertNotIn(context, self.engine.projects())
        graph = {"schema": 1, "id": "inbox", "title": "Veille transversale", "nodes": [node("work", "Lire")], "edges": []}
        self.engine.save(context["id"], graph)
        run = self.engine.start(context["id"], graph, simulation=True)
        self.assertEqual(run["scope"]["kind"], "workspace")
        schedule = Schedules(self.engine).create(context["id"], graph, {"kind": "interval", "minutes": 5, "timezone": "Europe/Zurich"}, simulation=True, now=0)
        self.assertEqual(schedule["scope"]["kind"], "workspace")
        # Tick metadata includes global runs for the Ubuntu tray.
        from unittest.mock import patch
        with patch("studio.dispatch", side_effect=lambda e, rid: e.run(rid)), patch.object(Schedules, "tick"):
            result = request(self.engine, {"action": "runtime.tick"})
        self.assertEqual(result["runs"][0]["project_title"], "Global")

"""Concurrent catalog refreshes use real stores; barriers only control reads."""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import sys
import tempfile
from threading import Barrier, Event
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine import Engine, ContractError
from workflow_engine.projects import initialize
from workflow_engine.setup import configure
from workflow_engine.work_templates import templates


class ConcurrentSetupTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="tricorder-setup-race-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.engines = [Engine(self.root / "state") for _ in range(2)]
        self.repo = self.root / "synthetic-project"
        initialize(self.repo)
        self.entry = {"path": str(self.repo), "name": "Synthetic project", "series": "19.0"}
        self.pack = self.root / "synthetic-pack"
        self.pack.mkdir()
        (self.pack / "roles.md").write_text("Synthetic roles; no model call.")
        roles = ["odoo-analyst", "odoo-developer", "odoo-tester", "odoo-deployer", "odoo-support", "odoo-studio"]
        (self.pack / "tricorder-pack.json").write_text(json.dumps({
            "schema": 1, "engine_schema": 1, "id": "synthetic-odoo", "version": "1",
            "profiles": [{"id": role, "source": "roles.md"} for role in roles],
            "policies": {"domain": "odoo"}}))

    def race(self, read, pack=None):
        """Both callers observe the real pre-write snapshot before either writes."""
        barrier = Barrier(2, timeout=10)
        original = getattr(Engine, read)

        def synchronized(engine, *args):
            result = original(engine, *args)
            barrier.wait()
            return result

        with patch.object(Engine, read, synchronized), ThreadPoolExecutor(2) as workers:
            jobs = [workers.submit(configure, engine, [self.entry], pack) for engine in self.engines]
            return [job.result(timeout=20) for job in jobs]

    def assert_configured_once(self, results):
        self.assertEqual([[result["status"] for result in reply] for reply in results],
                         [["configured"], ["configured"]], results)
        projects = self.engines[0].projects()
        self.assertEqual(len(projects), 1)
        self.assertEqual({reply[0]["project"] for reply in results}, {projects[0]["id"]})
        return projects[0]

    def test_concurrent_catalog_registration_returns_the_same_project(self):
        project = self.assert_configured_once(self.race("projects"))
        self.assertTrue((self.repo / ".tricorder/AGENTS.md").is_file())
        # A user's explicit duplicate registration still reports the conflict.
        with self.assertRaisesRegex(ContractError, "déjà enregistré"):
            self.engines[0].create_project("Another title", self.repo)
        self.assertEqual(self.engines[0].project(project["id"]), project)

    def test_concurrent_odoo_setup_creates_each_template_once(self):
        self.engines[0].create_project(self.entry["name"], self.repo)
        project = self.assert_configured_once(self.race("workflows", str(self.pack)))
        workflows = self.engines[0].workflows(project["id"])
        self.assertEqual(len(workflows), 2)
        self.assertTrue(all(graph["revision"] == 1 for graph in workflows))
        self.assertEqual(len(self.engines[0].project(project["id"])["packs"]), 1)
        for graph in workflows:
            self.assertEqual(json.loads(self.engines[0].workflow_path(project["id"], graph["id"]).read_text()), graph)
        self.assertEqual(self.engines[0].runs(project["id"]), [])

    def test_concurrent_refresh_preserves_custom_definitions_guidance_and_runs(self):
        engine = self.engines[0]
        project_id = configure(engine, [self.entry], str(self.pack))[0]["project"]
        graph = engine.workflows(project_id)[0]
        graph["title"] = "User's custom workflow"
        graph = engine.save(project_id, graph, graph["revision"])
        run = engine.start(project_id, graph, simulation=True)
        guidance = self.repo / ".tricorder/AGENTS.md"
        guidance.write_text("User's custom instructions")
        # A terminal edit has not yet been imported: setup must not overwrite it.
        disk = engine.workflow_path(project_id, graph["id"])
        external = {**graph, "title": "Unsaved terminal change"}
        disk.write_text(json.dumps(external))
        self.assert_configured_once(self.race("workflows", str(self.pack)))
        self.assertEqual(next(g for g in engine.workflows(project_id) if g["id"] == graph["id"]), graph)
        self.assertEqual(json.loads(disk.read_text()), external)
        self.assertEqual(engine.run(run["id"]), run)
        self.assertEqual(guidance.read_text(), "User's custom instructions")

    def test_user_save_between_snapshot_and_setup_keeps_the_user_revision(self):
        engine, refresher = self.engines
        project = engine.create_project("User's project", self.repo)
        observed, saved = Event(), Event()
        original = refresher.workflows

        def snapshot(*args):
            result = original(*args)
            observed.set()
            if not saved.wait(10):
                raise AssertionError("The user save did not finish")
            return result

        with patch.object(refresher, "workflows", snapshot), ThreadPoolExecutor(1) as workers:
            job = workers.submit(configure, refresher, [self.entry], str(self.pack))
            try:
                self.assertTrue(observed.wait(10))
                graph = templates()[0]
                graph.update(id="odoo-" + graph["id"], title="User's template from the editor")
                first = engine.save(project["id"], graph)
                graph["title"] = "User's second revision"
                second = engine.save(project["id"], graph, first["revision"])
                disk = engine.workflow_path(project["id"], graph["id"])
                external = {**second, "title": "Pending terminal edit"}
                disk.write_text(json.dumps(external))
            finally:
                saved.set()
            self.assertEqual(job.result(timeout=20)[0]["status"], "configured")
        self.assertEqual(next(g for g in engine.workflows(project["id"]) if g["id"] == graph["id"]), second)
        self.assertEqual(json.loads(disk.read_text()), external)
        # An explicit stale save must still fail, not silently keep the latest.
        with self.assertRaisesRegex(ContractError, "Conflit"):
            engine.save(project["id"], graph, first["revision"])

    def test_catalog_still_reports_invalid_repository_and_unimported_template(self):
        engine = self.engines[0]
        invalid = configure(engine, [{"name": "Not a repository", "path": str(self.root)}])
        self.assertEqual(invalid[0]["status"], "unavailable")
        self.assertIn("pas un dépôt Git", invalid[0]["reason"])
        self.assertEqual(engine.projects(), [])
        project = engine.create_project("Existing repository", self.repo)
        graph = templates()[0]
        graph.update(id="odoo-" + graph["id"], title="Versioned file awaiting explicit import")
        disk = engine.workflow_path(project["id"], graph["id"])
        disk.parent.mkdir(parents=True, exist_ok=True)
        disk.write_text(json.dumps(graph))
        result = configure(engine, [self.entry], str(self.pack))
        self.assertEqual(result[0]["status"], "unavailable")
        self.assertIn("fichier a été modifié", result[0]["reason"])
        self.assertEqual(json.loads(disk.read_text()), graph)
        self.assertEqual(engine.workflows(project["id"]), [])

    def test_catalog_registration_never_reuses_the_internal_library(self):
        engine = self.engines[0]
        library = engine.library_project()
        result = configure(engine, [{"name": "Not a project", "path": library["path"]}])
        self.assertEqual(result[0]["status"], "unavailable")
        self.assertEqual(engine.projects(), [])
        self.assertEqual(engine.project(library["id"]), library)


if __name__ == "__main__":
    unittest.main()

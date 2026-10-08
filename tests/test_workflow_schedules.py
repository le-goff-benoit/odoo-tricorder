import concurrent.futures
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine import Engine, ContractError
from workflow_engine.library import node
from workflow_engine.schedules import Schedules, next_due
from workflow_engine.packs import inspect_pack, install, policy_issues


class SchedulesAndPacksTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.engine = Engine(self.root / "state")
        self.project = self.engine.create_project("Projet")
        self.graph = {"schema": 1, "id": "daily", "title": "Récurrent", "nodes": [node("gate", "Question", "decision")], "edges": []}

    def test_occurrence_is_atomic_no_overlap_no_catchup_storm(self):
        scheduler = Schedules(self.engine)
        schedule = scheduler.create(self.project["id"], self.graph, {"kind": "interval", "minutes": 5}, simulation=True, now=1000)
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            results = list(pool.map(lambda _: Schedules(Engine(self.root / "state")).tick(now=99999), range(2)))
        self.assertEqual(sum(map(len, results)), 1)
        saved = scheduler.list()[0]
        self.assertEqual(saved["next"], 100299)
        self.assertEqual(self.engine.run(saved["last_run"])["nodes"]["gate"]["status"], "waiting")
        self.assertEqual(scheduler.tick(now=100300), [])
        self.assertEqual(scheduler.list()[0]["last_status"], "skipped-overlap")
        scheduler.toggle(schedule["id"], False)
        self.assertEqual(scheduler.tick(now=9999999999), [])

    def test_dst_gap_skipped_repeated_hour_once_and_weekdays(self):
        rule = {"kind": "daily", "time": "02:30", "timezone": "Europe/Zurich"}
        march = datetime(2026, 3, 29, 0, 0, tzinfo=timezone.utc).timestamp()
        self.assertEqual(datetime.fromtimestamp(next_due(rule, march), timezone.utc).isoformat(), "2026-03-30T00:30:00+00:00")
        first_fold = datetime(2026, 10, 25, 0, 30, tzinfo=timezone.utc).timestamp()
        self.assertEqual(datetime.fromtimestamp(next_due(rule, first_fold), timezone.utc).isoformat(), "2026-10-26T01:30:00+00:00")
        friday = datetime(2026, 10, 9, 18, 0, tzinfo=timezone.utc).timestamp()
        weekday_rule = {"kind": "weekly", "time": "09:00", "timezone": "Europe/Zurich", "weekdays": [0, 1, 2, 3, 4]}
        self.assertEqual(datetime.fromtimestamp(next_due(weekday_rule, friday), timezone.utc).weekday(), 0)

    def test_invalid_interval_and_timezone_refused(self):
        for rule in ({"kind": "interval", "minutes": 0}, {"kind": "daily", "time": "25:00"}, {"kind": "daily", "timezone": "unknown"}):
            with self.assertRaises(ValueError):
                next_due(rule, 1000)

    def test_terminal_reload_validates_definition_preserves_running_snapshot(self):
        saved = self.engine.save(self.project["id"], self.graph)
        run = self.engine.start(self.project["id"], saved)
        path = self.engine.workflow_path(self.project["id"], saved["id"])
        changed = dict(saved, title="Corrigé depuis le terminal")
        path.write_text(json.dumps(changed))
        with self.assertRaisesRegex(ContractError, "terminal"):
            self.engine.save(self.project["id"], saved, 1)
        loaded = self.engine.reload(self.project["id"], saved["id"], 1)
        self.assertEqual(loaded["revision"], 2)
        self.assertEqual(self.engine.run(run["id"])["definition"]["title"], "Récurrent")
        changed["nodes"] = []
        path.write_text(json.dumps(changed))
        with self.assertRaises(ContractError):
            self.engine.reload(self.project["id"], saved["id"], 2)
        self.assertEqual(self.engine.workflows(self.project["id"])[0]["revision"], 2)

    def test_library_is_independent_and_import_only_reads_bounded_profile_text(self):
        library = self.engine.library_project()
        self.assertTrue(library["library"])
        self.assertNotIn(library, self.engine.projects())
        root = self.root / "pack"
        root.mkdir()
        (root / "role.md").write_text("Préparer le candidat ; ne pas publier sans accord.")
        manifest = {"schema": 1, "engine_schema": 1, "id": "pack", "title": "Pack test", "version": "1", "profiles": [{"id": "deployer", "title": "Déploiement", "source": "role.md"}], "policies": {"domain": "odoo", "series_required": True, "online_requires_studio": True}}
        (root / "tricorder-pack.json").write_text(json.dumps(manifest))
        pack = inspect_pack(root)
        project = install(self.engine, self.project["id"], root, pack["sha256"])
        self.assertEqual(len(project["packs"]), 1)
        self.assertFalse(policy_issues(project, self.graph))
        self.graph["domain"] = "odoo"
        self.assertTrue(policy_issues(project, self.graph))
        self.assertTrue(policy_issues(project, {**self.graph, "parameters": {"series": "19.0", "platform": "online", "route": "module"}}))
        self.assertFalse(policy_issues(project, {**self.graph, "parameters": {"series": "19.0", "platform": "online", "route": "studio"}}))
        (root / "role.md").write_text("Contenu modifié")
        with self.assertRaisesRegex(ContractError, "changé"):
            install(self.engine, self.project["id"], root, pack["sha256"])
        manifest["profiles"][0]["source"] = "../outside.md"
        (root / "tricorder-pack.json").write_text(json.dumps(manifest))
        with self.assertRaises(ContractError):
            inspect_pack(root)

    def test_pack_section_imports_only_common_contract_and_selected_role(self):
        from workflow_engine.packs import inspect_pack, policy_issues
        folder = self.root / 'scoped-pack'
        folder.mkdir()
        (folder/'roles.md').write_text('# Shared runtime\nThe engine owns state.\n## odoo-tester\nReview local evidence.\n## other-role\nOther mission.\n')
        (folder/'tricorder-pack.json').write_text(json.dumps({'schema':1,'engine_schema':1,'id':'crew','title':'Crew','version':'1','profiles':[{'id':'odoo-tester','title':'QA','source':'roles.md','section':'odoo-tester'}],'policies':{'domain':'odoo','qa_requires_local_copy':True}}))
        pack=inspect_pack(folder)
        text=pack['profiles'][0]['text']
        self.assertIn('engine owns state',text)
        self.assertIn('Review local evidence',text)
        self.assertNotIn('Other mission',text)
        project={'defaults':{},'packs':[pack]}
        graph={'domain':'odoo','nodes':[{'id':'qa','kind':'agent','profile':'odoo-tester'}],'parameters':{'environment':'production'}}
        self.assertTrue(policy_issues(project,graph))
        graph['parameters']={'environment':'local','neutralized_copy':'synthetic-copy'}
        self.assertEqual(policy_issues(project,graph),[])


if __name__ == "__main__":
    unittest.main()

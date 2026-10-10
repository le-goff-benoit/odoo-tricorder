import concurrent.futures
import copy
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine import Engine, ContractError
from workflow_engine.collection import change
from workflow_engine.iterations import activate, tick, overview
from workflow_engine.runtime import dispatch


ARRAY = {"type": "array", "items": "object", "minItems": 0, "maxItems": 100}


class CollectionIterationTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.engine = Engine(temp.name)
        self.project = self.engine.create_project("Programme synthétique sans Odoo")

    def collection(self):
        return {"schema": 2, "id": "intentions", "title": "Préparer le travail", "nodes": [
            {"id": "input", "kind": "input", "title": "Recueillir les intentions", "outputs": {"intentions": {**ARRAY, "minItems": 1}}},
            {"id": "plan", "kind": "task", "title": "Préparer un plan", "inputs": {"intentions": ARRAY},
             "outputs": {"plan": {"type": "object"}}, "validation": "contract"}],
            "edges": [{"id": "plan-intentions", "from": "input", "to": "plan", "mapping": {"intentions": "intentions"}}]}

    def family(self, items, *, command=False):
        child = {"schema": 2, "id": "element", "title": "Traiter un élément", "nodes": [
            {"id": "work", "kind": "command" if command else "task", "title": "Travail de l'élément",
             "validation": "automatic" if command else "contract", "max_attempts": 2,
             **({"argv": ["python3", "-c", "import time; time.sleep(.5); print('CHECKED')"]} if command else {"inputs": {"item": {"type": "object"}}})}], "edges": []}
        graph = {"schema": 2, "id": "plan-many", "title": "Un plan et plusieurs travaux", "nodes": [
            {"id": "plan", "kind": "task", "title": "Planifier", "outputs": {"items": ARRAY}, "validation": "contract"},
            {"id": "approve", "kind": "decision", "title": "Accepter le plan", "inputs": {"items": ARRAY}, "outputs": {"items": ARRAY}},
            {"id": "each", "kind": "foreach", "title": "Pour chaque élément", "collection": "items", "concurrency": 2,
             "inputs": {"items": ARRAY}, "outputs": {"results": ARRAY, "contributions": ARRAY}, "workflow": child}],
            "edges": [{"id": "plan-approve", "from": "plan", "to": "approve", "mapping": {"items": "items"}},
                      {"id": "approve-each", "from": "approve", "to": "each", "outcome": "approve", "mapping": {"items": "items"}}]}
        run = self.engine.start(self.project["id"], graph, simulation=not command)
        claim = self.engine.claim(run["id"], "plan")
        run = self.engine.submit(run["id"], "plan", claim["token"], {"ok": True, "summary": "Plan unique", "outputs": {"items": items}})
        gate = run["nodes"]["approve"]
        self.assertEqual(run["nodes"]["each"]["status"], "pending")
        return self.engine.decide(run["id"], "approve", gate["nonce"], gate["proposal"], "approve", human=True)

    def finish_child(self, rid, *, ok=True):
        claim = self.engine.claim(rid, "work")
        return self.engine.submit(rid, "work", claim["token"], {"ok": ok, "summary": "Travail remis"})

    def test_collection_persists_three_intentions_and_closes_once_then_one_plan(self):
        run = self.engine.start(self.project["id"], self.collection(), simulation=True)
        self.assertEqual(run["nodes"]["input"]["status"], "collecting")
        for index, text in enumerate(("Diagnostic", "Documenter", "Préparer un brouillon")):
            run = change(self.engine, run["id"], "input", index, "add", key=f"add-{index}", text=text)
        self.engine = Engine(self.engine.store.directory)
        self.assertEqual(len(self.engine.run(run["id"])["nodes"]["input"]["collection"]["items"]), 3)
        with self.assertRaisesRegex(ContractError, "changé"):
            change(self.engine, run["id"], "input", 2, "close", key="stale")
        run = change(self.engine, run["id"], "input", 3, "close", key="close")
        self.assertEqual(run["nodes"]["plan"]["status"], "ready")
        self.assertEqual(len(run["nodes"]["plan"]["inputs"]["intentions"]), 3)
        self.assertEqual(change(self.engine, run["id"], "input", 3, "close", key="close"), run)
        with self.assertRaisesRegex(ContractError, "fermé"):
            change(self.engine, run["id"], "input", 4, "add", key="late", text="Une intention tardive")
        claim = self.engine.claim(run["id"], "plan")
        done = self.engine.submit(run["id"], "plan", claim["token"], {"ok": True, "summary": "Un plan", "outputs": {"plan": {"title": "Plan commun"}}})
        self.assertEqual(done["status"], "completed")
        self.assertEqual(len(self.engine.runs(self.project["id"])), 1)

    def test_concurrent_collection_change_and_close_cannot_lose_a_contribution(self):
        run = self.engine.start(self.project["id"], self.collection(), simulation=True)
        change(self.engine, run["id"], "input", 0, "add", key="initial", text="Première intention")
        def operation(index):
            engine = Engine(self.engine.store.directory)
            try:
                change(engine, run["id"], "input", 1, "add" if index else "close", key=f"race-{index}", text="Deuxième intention")
                return True
            except ContractError:
                return False
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            self.assertEqual(sum(pool.map(operation, (0, 1))), 1)

    def test_children_are_frozen_once_and_retry_does_not_repeat_finished_siblings(self):
        run = self.family([{"id": "a", "title": "Diagnostic"}, {"id": "b", "title": "Brouillon"}, {"id": "c", "depends_on": ["a"]}])
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            list(pool.map(lambda _: activate(Engine(self.engine.store.directory), run["id"], "each"), (0, 1)))
        run = self.engine.run(run["id"])
        members = {m["element"]: m for m in run["nodes"]["each"]["children"]}
        self.assertEqual(len(self.engine.runs(self.project["id"])), 4)
        self.assertEqual(self.engine.run(members["c"]["run"])["status"], "paused")
        self.finish_child(members["a"]["run"])
        self.finish_child(members["b"]["run"], ok=False)
        before = copy.deepcopy(self.engine.run(members["a"]["run"]))
        self.engine = Engine(self.engine.store.directory)
        tick(self.engine, run["id"])
        self.assertEqual(self.engine.run(members["c"]["run"])["status"], "active")
        self.engine.retry(members["b"]["run"], "work", "Corriger le brouillon", human=True)
        self.finish_child(members["b"]["run"])
        self.finish_child(members["c"]["run"])
        done = tick(self.engine, run["id"])
        self.assertEqual(done["status"], "completed")
        self.assertEqual(self.engine.run(members["a"]["run"]), before)
        self.assertEqual([v["id"] for v in done["nodes"]["each"]["result"]["outputs"]["results"]], ["a", "b", "c"])

    def test_pause_and_cancel_parent_stop_new_claims_and_late_result_does_not_complete(self):
        run = activate(self.engine, self.family([{"id": "a"}, {"id": "b"}])["id"], "each")
        first, second = [m["run"] for m in run["nodes"]["each"]["children"]]
        claim = self.engine.claim(first, "work")
        self.engine.control(run["id"], "pause")
        with self.assertRaises(ContractError):
            self.engine.claim(second, "work")
        self.engine.submit(first, "work", claim["token"], {"ok": True, "summary": "Terminé pendant la pause"})
        self.engine.control(run["id"], "resume")
        self.assertEqual(self.engine.run(first)["status"], "completed")
        self.engine.control(run["id"], "cancel")
        self.assertEqual(self.engine.run(second)["status"], "cancelled")
        self.assertEqual(tick(self.engine, run["id"])["status"], "cancelled")

    def test_manual_resume_cannot_release_a_dependency_or_lose_its_hold(self):
        run = activate(self.engine, self.family([{"id": "a"}, {"id": "b", "depends_on": ["a"]}])["id"], "each")
        first, second = [m["run"] for m in run["nodes"]["each"]["children"]]
        self.engine.control(second, "pause")
        resumed = self.engine.control(second, "resume")
        self.assertEqual(resumed["status"], "paused")
        self.assertNotIn("iteration_hold", resumed)
        with self.assertRaises(ContractError):
            self.engine.claim(second, "work")
        self.finish_child(first)
        tick(self.engine, run["id"])
        self.assertEqual(self.engine.run(second)["parameters"]["depends_on_runs"], [first])
        self.finish_child(second)
        self.assertEqual(tick(self.engine, run["id"])["status"], "completed")

    def test_collection_rejects_uncollectable_types_and_enforces_declared_bound(self):
        from workflow_engine import validate
        for specification in ({"type": "array", "items": "number"}, {"type": "array", "minItems": 101}):
            graph = self.collection()
            graph["nodes"][0]["outputs"]["intentions"] = specification
            with self.assertRaises(ContractError):
                validate(graph)
        graph = self.collection()
        graph["nodes"][0]["outputs"]["intentions"]["maxItems"] = 1
        run = self.engine.start(self.project["id"], graph, simulation=True)
        change(self.engine, run["id"], "input", 0, "add", key="first", text="Une intention")
        with self.assertRaisesRegex(ContractError, "au plus 1"):
            change(self.engine, run["id"], "input", 1, "add", key="second", text="Une autre")
        closed = change(self.engine, run["id"], "input", 1, "close", key="closed")
        self.assertEqual(closed["nodes"]["plan"]["status"], "ready")

    def test_invalid_iteration_is_visible_and_does_not_retry_on_every_poll(self):
        run = self.family([{"id": "a", "depends_on": ["absent"]}])
        for _ in range(3):
            dispatch(self.engine, run["id"])
        blocked = self.engine.run(run["id"])
        self.assertEqual(blocked["nodes"]["each"]["status"], "blocked")
        self.assertIn("identifiant absent", blocked["nodes"]["each"]["reason"])
        self.assertEqual(len(self.engine.runs(self.project["id"])), 1)
        self.assertEqual(sum(e["type"] == "iteration-blocked" for e in self.engine.events(run["id"])), 1)

    def test_real_processes_overlap_with_two_slots_and_continue_beyond_first_wave(self):
        import subprocess
        workers = []
        popen = subprocess.Popen
        def tracked(*args, **kwargs):
            worker = popen(*args, **kwargs)
            workers.append(worker)
            return worker
        tracker = patch('workflow_engine.runtime.subprocess.Popen', side_effect=tracked)
        tracker.start()
        self.addCleanup(tracker.stop)
        self.addCleanup(lambda: [worker.wait(timeout=10) for worker in workers])
        run = self.family([{"id": f"r{i}"} for i in range(6)], command=True)
        run = activate(self.engine, run["id"], "each")
        members = run["nodes"]["each"]["children"]
        max_running = 0
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            tick(self.engine, run["id"])
            for member in members:
                dispatch(self.engine, member["run"])
            current = overview(self.engine, self.engine.run(run["id"]), "each")
            max_running = max(max_running, current["counts"]["running"])
            self.assertLessEqual(current["counts"]["running"], 2)
            if self.engine.run(run["id"])["status"] == "completed":
                break
            time.sleep(.03)
        self.assertEqual(max_running, 2, "Two real child processes must overlap")
        self.assertEqual(self.engine.run(run["id"])["status"], "completed", current)
        for member in members:
            state = self.engine.run(member["run"])["nodes"]["work"]
            self.assertEqual(state["attempt"], 1)
            self.assertIn(b"CHECKED", self.engine.evidence(state["result"]["evidence"][0]))

    def test_invalid_lists_fail_before_enrollment_and_missing_inputs_do_not_start(self):
        for items in ([{"id": "same"}, {"id": "same"}], [{"id": "a", "depends_on": ["b"]}, {"id": "b", "depends_on": ["a"]}]):
            run = self.family(items)
            with self.assertRaises(ContractError):
                activate(self.engine, run["id"], "each")
            self.assertNotIn("children", self.engine.run(run["id"])["nodes"]["each"])
        graph = {"schema": 2, "id": "missing", "title": "Entrée requise", "nodes": [
            {"id": "work", "kind": "task", "title": "Lire le plan", "inputs": {"plan": {"type": "object"}}}], "edges": []}
        run = self.engine.start(self.project["id"], graph, simulation=True)
        self.assertEqual(run["nodes"]["work"]["status"], "blocked")
        with self.assertRaises(ContractError):
            self.engine.claim(run["id"], "work")

import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine import ContractError, Engine
from workflow_engine.library import node
from workflow_engine.portable import export, preview, import_definition


class PortableTests(unittest.TestCase):
    def test_transfer_with_dependencies_imports_only_a_new_definition(self):
        child = {"schema": 1, "id": "child", "title": "Analyser", "nodes": [node("work", "Analyser", "agent", model="chosen", profile="specialist", profile_text="private resolved instructions")], "edges": []}
        graph = {"schema": 1, "id": "transfer", "title": "Portable", "release": "local-release", "revision": 12, "nodes": [node("one", "Sous-workflow", "subworkflow", workflow="child")], "edges": []}
        bundle = export(graph, {"child": child}, {"provider": "claude", "model": "inherited-model"})
        self.assertEqual(bundle["workflow"]["defaults"]["model"], "inherited-model")
        self.assertNotIn("private resolved", json.dumps(bundle))
        self.assertNotIn("revision", bundle["workflow"])
        self.assertTrue(all(n["kind"] != "subworkflow" for n in bundle["workflow"]["nodes"]))
        self.assertEqual(preview(bundle)["requirements"]["profiles"], ["specialist"])
        with tempfile.TemporaryDirectory() as target:
            engine = Engine(target)
            engine.workspace_context()
            first = import_definition(engine, "workspace", bundle)
            second = import_definition(engine, "workspace", bundle)
            self.assertNotEqual(first["id"], second["id"])
            self.assertEqual(first["revision"], 1)
            self.assertEqual(engine.runs("workspace"), [])
            with engine.store.connect() as db:
                self.assertEqual(db.execute("SELECT count(*) FROM schedules").fetchone()[0], 0)

    def test_untrusted_file_cannot_include_execution_state_or_remote_dependencies(self):
        graph = {"schema": 1, "id": "input", "title": "Fichier", "nodes": [node("work", "Travail")], "edges": []}
        bundle = export(graph, {})
        with self.assertRaises(ContractError):
            preview({**bundle, "runs": [{"approved": True}]})
        with self.assertRaises(ContractError):
            preview({**bundle, "version": 99})
        bundle["workflow"]["nodes"] = [node("remote", "Externe", "subworkflow", workflow="https://invalid.test")]
        with self.assertRaisesRegex(ContractError, "absent"):
            preview(bundle)

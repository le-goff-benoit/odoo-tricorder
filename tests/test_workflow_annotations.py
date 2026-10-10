"""Notes survive design round trips but cannot change or instruct execution."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

from native_cli_fixture import use_native_cli_fixtures
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine import Engine, ContractError, validate
from workflow_engine.contracts import semantic_digest
from workflow_engine.conversations import Conversations
from workflow_engine.portable import export, import_definition
from workflow_cli import request
from studio import request as studio_request


class AnnotationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        use_native_cli_fixtures(self, self.root)
        self.engine = Engine(self.root / "state")
        self.project = self.engine.create_project("Notes synthétiques")
        self.graph = {"schema": 1, "id": "annotated", "title": "Analyse",
                      "nodes": [{"id": "work", "kind": "task", "title": "Analyser", "validation": "contract"}], "edges": []}
        self.note = {"id": "note-one", "title": "Contexte visuel", "text": "NOTE_NOT_AN_INSTRUCTION",
                     "position": {"x": 30, "y": 250}, "size": {"width": 280, "height": 180}}

    def test_note_roundtrip_does_not_change_contract_or_existing_run(self):
        digest = semantic_digest(self.graph)
        original = self.engine.start(self.project["id"], self.graph, simulation=True)
        annotated = {**self.graph, "layout": {"notes": [self.note]}}
        saved = self.engine.save(self.project["id"], annotated)
        imported = import_definition(self.engine, self.project["id"], export(saved, {}))
        self.assertEqual(imported["layout"]["notes"], [self.note])
        self.assertEqual(semantic_digest(saved), digest)
        run = self.engine.start(self.project["id"], saved, simulation=True)
        self.assertEqual(run["original"]["layout"]["notes"], [self.note])
        self.assertNotIn("layout", run["definition"])
        self.assertEqual(list(run["nodes"]), ["work"])
        changed = copy.deepcopy(saved)
        changed["layout"]["notes"][0].update(text="Autre commentaire", position={"x": 900, "y": 600})
        self.assertEqual(semantic_digest(changed), digest)
        self.engine.save(self.project["id"], changed, expected_revision=1)
        self.assertEqual(self.engine.run(original["id"]), original)
        claim = self.engine.claim(run["id"], "work")
        done = self.engine.submit(run["id"], "work", claim["token"], {"ok": True, "summary": "Résultat"})
        self.assertEqual(done["status"], "completed")

    def test_native_status_inspect_and_claim_do_not_receive_notes(self):
        self.graph["layout"] = {"notes": [self.note]}
        service = Conversations(self.engine)
        conversation = service.open(self.project["id"], self.graph, "codex")
        item = service.add(conversation["id"], "Analyser la demande")
        for action, payload in (("status", {}), ("inspect", {"run": item["run"]}),
                                ("claim", {"run": item["run"], "node": "work"})):
            self.assertNotIn(self.note["text"], json.dumps(request(self.engine, conversation["id"], action, payload)))
        self.assertIn(self.note["text"], json.dumps(service.get(conversation["id"])))

    def test_design_assistant_does_not_receive_note_text(self):
        self.graph["layout"] = {"notes": [self.note]}
        captured = {}
        def start(project, graph, **kwargs):
            captured.update(graph)
            return {"id": "synthetic"}
        with patch("studio.preflight", return_value=[]), patch("studio.dispatch"), patch.object(self.engine, "start", side_effect=start):
            studio_request(self.engine, {"action": "assistant.propose", "project": self.project["id"],
                           "graph": self.graph, "request": "Ajouter une tâche", "provider": "codex", "model": "synthetic"})
        self.assertNotIn(self.note["text"], json.dumps(captured))
        self.assertIn("Analyser", json.dumps(captured))

    def test_notes_cannot_be_linked_or_contain_execution_properties(self):
        self.graph["layout"] = {"notes": [self.note]}
        validate(self.graph)
        for change in ({"position": {"x": float("nan"), "y": 0}}, {"position": {"x": True, "y": 0}},
                       {"size": {"width": 20, "height": 180}}, {"kind": "command"}, {"text": 17}):
            broken = copy.deepcopy(self.graph)
            broken["layout"]["notes"][0].update(change)
            with self.assertRaises(ContractError):
                validate(broken)
        broken = copy.deepcopy(self.graph)
        broken["edges"] = [{"id": "forbidden", "from": "note-one", "to": "work"}]
        with self.assertRaises(ContractError):
            validate(broken)

    def test_schema_one_fingerprint_of_unknown_historical_fields_is_unchanged(self):
        from workflow_engine.contracts import digest
        graph = {**self.graph, "annotations": [{"legacy": "Unknown field previously accepted"}]}
        self.assertEqual(semantic_digest(graph), digest(graph))
        self.assertNotEqual(semantic_digest(graph), semantic_digest(self.graph))

    def test_nested_notes_and_positions_never_change_semantics_or_reach_agents(self):
        from workflow_engine.annotations import without_annotations
        child = {**self.graph, "schema": 2, "id": "child", "layout": {"notes": [self.note]}}
        graph = {"schema": 2, "id": "nested", "title": "Traiter la liste", "nodes": [
            {"id": "each", "title": "Chaque élément", "kind": "foreach", "workflow": child,
             "inputs": {"items": "array"}, "outputs": {"results": "array"}}], "edges": [],
            "actions": [{"id": "draft", "title": "Brouillon", "source": "each", "event": "accepted", "enabled": True,
                         "workflow": {**child, "id": "draft"}}]}
        validate(graph)
        baseline = semantic_digest(graph)
        edited = copy.deepcopy(graph)
        for nested in (edited["nodes"][0]["workflow"], edited["actions"][0]["workflow"]):
            nested["layout"]["notes"][0]["text"] = "Déplacer cette note"
            nested["nodes"][0]["position"] = {"x": 100, "y": 200}
        self.assertEqual(baseline, semantic_digest(edited))
        self.assertNotIn(self.note["text"], json.dumps(without_annotations(graph)))
        run = self.engine.start(self.project["id"], graph, simulation=True)
        self.assertNotIn(self.note["text"], json.dumps(run["definition"]))
        self.assertIn(self.note["text"], json.dumps(run["original"]))

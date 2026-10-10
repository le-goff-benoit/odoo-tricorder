"""Child workflows cannot defer an invisible launch form until activation."""
import copy
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine import ContractError, Engine
from workflow_engine.contracts import expand, validate
from workflow_engine.iterations import activate


def document_graph():
    return {"schema": 2, "id": "child", "title": "Document personnalisé", "nodes": [
        {"id": "work", "kind": "document", "title": "Document", "content": "Texte",
         "validation": "automatic"}], "edges": []}


def form():
    return [{"key": "audience", "label": "Public visé", "type": "string", "required": True}]


def iteration_graph(child):
    return {"schema": 2, "id": "parent", "title": "Traiter la liste", "nodes": [
        {"id": "each", "kind": "foreach", "title": "Pour chaque élément",
         "inputs": {"items": {"type": "array", "required": True}},
         "outputs": {"results": {"type": "array", "required": True}},
         "workflow": child}], "edges": []}


class ChildLaunchFormTests(unittest.TestCase):
    def test_associated_form_is_refused_before_saving_even_if_optional_or_defaulted(self):
        with tempfile.TemporaryDirectory() as directory:
            engine = Engine(Path(directory) / "state")
            engine.workspace_context()
            for required in (True, False):
                child = document_graph()
                child["launch_fields"] = form()
                child["launch_fields"][0]["required"] = required
                child["parameters"] = {"audience": "Équipe"}
                graph = document_graph()
                graph["id"] = "parent"
                graph["actions"] = [{"id": "extra", "title": "Document supplémentaire",
                    "source": "work", "event": "accepted", "enabled": True, "workflow": child}]
                with self.subTest(required=required):
                    with self.assertRaisesRegex(ContractError, "action facultative.*Question ouverte"):
                        engine.save("workspace", graph)
            self.assertEqual(engine.workflows("workspace"), [])
            self.assertEqual(engine.runs("workspace"), [])

    def test_inline_and_library_iteration_forms_are_refused_during_configuration(self):
        child = document_graph()
        child["launch_fields"] = form()
        with self.assertRaisesRegex(ContractError, "traitement par élément.*workflow principal"):
            validate(iteration_graph(child))
        with self.assertRaisesRegex(ContractError, "traitement par élément.*workflow principal"):
            expand(iteration_graph("child"), {"child": child})

    def test_parent_form_reaches_iteration_and_question_remains_available(self):
        with tempfile.TemporaryDirectory() as directory:
            engine = Engine(Path(directory) / "state")
            engine.workspace_context()
            child = document_graph()
            child["nodes"] = [{"id": "question", "kind": "question", "title": "Préciser",
                               "question": "Quel détail ajouter ?", "outputs": {"answer": "string"}}]
            graph = iteration_graph(child)
            graph["launch_fields"] = form()
            original = copy.deepcopy(graph)
            run = engine.start("workspace", graph, simulation=True,
                               parameters={"audience": "Équipe"},
                               initial_inputs={"each": {"items": ["Premier élément"]}})
            run = activate(engine, run["id"], "each")
            nested = engine.run(run["nodes"]["each"]["children"][0]["run"])
            self.assertEqual(nested["parameters"]["audience"], "Équipe")
            self.assertEqual(nested["nodes"]["question"]["status"], "waiting_input")
            self.assertEqual(graph, original)


if __name__ == "__main__":
    unittest.main()

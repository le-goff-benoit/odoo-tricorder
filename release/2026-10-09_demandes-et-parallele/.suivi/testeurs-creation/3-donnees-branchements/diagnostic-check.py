"""Read-only diagnosis after real GUI observations; packaged code only."""
import json
import pathlib
import sys

sys.path.insert(0, "/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/resources/backend")
from workflow_engine.contracts import validate, validate_outputs, validate_result

root = pathlib.Path("/tmp/tricorder-creation3-donnees-OeZr93/state/workflows/workspace/.tricorder/workflows")
for filename in sorted(root.glob("*.json")):
    graph = json.loads(filename.read_text())
    print(graph["title"], graph["id"], "revision", graph.get("revision"))
    print("edges:", [(edge["from"], edge["to"], edge.get("outcome"), edge.get("mapping")) for edge in graph["edges"]])
    if graph["title"] != "Demande client — simulation":
        continue
    first = graph["nodes"][0]
    print("Declared outputs:", first.get("outputs"))
    print("sample_outputs:", first.get("sample_outputs", "ABSENT"))
    try:
        validate_outputs(first, {"outputs": first.get("sample_outputs", {})})
    except Exception as error:
        print("Simulated output contract:", type(error).__name__, str(error))
    diagnostic = next(node for node in graph["nodes"] if node["title"] == "Diagnostic")
    try:
        validate_result(graph, diagnostic, {"outputs": {"critique": True, "synthese": "Exemple synthétique"}})
    except Exception as error:
        print("Correctly typed true boolean routing:", type(error).__name__, str(error))
    validate(graph)
    print("Graph validation: accepted despite boolean output / string outcomes")

"""Fixture synthétique jetable ; aucun CLI ou service externe."""
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "backend"))
from workflow_engine import Engine
from workflow_engine.projections import run_detail, proof_page

with tempfile.TemporaryDirectory(prefix="review-long-request-") as directory:
    engine = Engine(directory)
    project = engine.create_project("Contre-épreuve demande longue")
    graph = {"schema": 1, "id": "review-long", "title": "Suivi de demande", "nodes": [
        {"id": "work", "kind": "task", "title": "Analyser", "validation": "contract", "outputs": {"report": "string"}}
    ], "edges": []}
    source = "Préparer un bilan complet\n" + "Décisions α et tâches à suivre. " * 2300 + "\nFIN_SOURCE_INTEGRALE"
    run = engine.start(project["id"], graph, parameters={"request": source}, simulation=True)
    projected = run_detail(engine, run)
    reference = projected["parameters"]["request"]
    pages, offset = [], 0
    while offset is not None:
        page = proof_page(engine, run["id"], reference["$artifact"]["sha256"], offset)
        pages.append(page)
        offset = page["next"]
    assert "".join(page["text"] for page in pages) == source
    assert engine.run(run["id"]) == run
    print(json.dumps({"run": projected, "source": source, "pages": pages, "run_unchanged": True}, ensure_ascii=False))

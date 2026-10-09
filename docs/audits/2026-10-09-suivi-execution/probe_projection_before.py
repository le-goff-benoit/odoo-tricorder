"""Synthetic read-only counterexamples for execution presentation, not engine QA."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
from workflow_engine.projections import focus, summary

target = Path(sys.argv[1])
assert not target.exists(), "Evidence already exists; choose another name"
now = time.time()
def run(states):
    nodes = [{"id": key, "title": key, "kind": "task"} for key in states]
    return {"id": "synthetic", "project": "synthetic", "status": "active", "created": now, "updated": now, "simulation": True, "definition": {"id": "generic", "title": "Synthetic", "nodes": nodes}, "original": {"id": "generic"}, "nodes": states, "parameters": {"request": "Synthetic request"}}

cases = {
    "failure_and_question_and_running": run({
        "work_failed": {"status": "returned", "result": {"ok": False, "summary": "Synthetic copy failure"}},
        "clarification": {"status": "waiting_input", "question": {"text": "Synthetic question"}},
        "parallel_work": {"status": "running", "started": now - 180, "heartbeat": now - 30},
    }),
    "two_independent_decisions": run({"plan_a": {"status": "waiting"}, "plan_b": {"status": "waiting"}}),
    "native_work_between_expected_heartbeats": run({"work": {"status": "running", "started": now - 180, "heartbeat": now - 30, "ownership": "native"}}),
    "dependency_wait": {**run({"work": {"status": "pending"}}), "status": "paused", "coordination_wait": True, "parameters": {"depends_on_runs": ["synthetic_parent"]}},
    "failed_result_accepted_on_failure_branch": run({
        "quality": {"status": "accepted", "outcome": "fail", "result": {"ok": True, "outputs": {"verdict": "fail"}}},
        "repair_question": {"status": "waiting_input", "question": {"text": "What should change?"}},
    }),
}
evidence = {"method": "Pure projections on in-memory synthetic runs; no engine, model or service", "source_sha256": hashlib.sha256((ROOT / 'backend/workflow_engine/projections.py').read_bytes()).hexdigest(), "cases": {name: {"input": copy.deepcopy(value), "summary": summary(value)} for name, value in cases.items()}}
target.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({name: {"focus": value['summary']['focus'], "counts": value['summary']['counts']} for name, value in evidence['cases'].items()}, ensure_ascii=False))

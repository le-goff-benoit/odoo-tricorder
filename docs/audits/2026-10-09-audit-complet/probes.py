#!/usr/bin/env python3
"""Audit rc.7: synthetic, local reproductions. No app or client state is modified."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
from workflow_engine import Engine, ContractError
from workflow_engine.contracts import expand, validate
from workflow_engine.conversations import Conversations
from workflow_engine.runtime import reconcile
from workflow_engine.documentation import markdown
from connectors.tool_runtime import execute_tool
from connectors.candidates import prepare, capture, apply
from studio import request


def graph(nodes, edges=(), name="probe"):
    return {"schema": 1, "id": name, "title": "Audit synthétique", "nodes": nodes, "edges": list(edges)}


def task(nid="work", **kwargs):
    return {"id": nid, "title": nid, "kind": "task", **kwargs}


def error(fn):
    try:
        fn()
    except Exception as exc:
        return type(exc).__name__ + ": " + str(exc)
    return None


facts = {}
with tempfile.TemporaryDirectory(prefix="tricorder-audit-") as directory:
    base = Path(directory)
    engine = Engine(base / "recovery")
    project = engine.create_project("Recovery probe")
    run = engine.start(project["id"], graph([task(resources=["repo"])]))
    claim = engine.claim(run["id"], "work")
    facts["orphan_reconcile"] = error(lambda: reconcile(engine, run["id"], "work"))
    engine.control(run["id"], "cancel")
    next_run = engine.start(project["id"], graph([task(resources=["repo"])]))
    facts["cancelled_orphan_keeps_lock"] = error(lambda: engine.claim(next_run["id"], "work"))
    for i in range(3):
        other = engine.start(project["id"], graph([task()]))
        engine.claim(other["id"], "work")
        engine.control(other["id"], "cancel")
    next_run = engine.start(project["id"], graph([task()]))
    facts["four_cancelled_orphans_block_all_runs"] = error(lambda: engine.claim(next_run["id"], "work"))

    child = graph([task(outputs={"answer": "string"})], name="child")
    parent = graph([
        {"id": "component", "title": "Reusable component", "kind": "subworkflow", "workflow": "child", "outputs": {"answer": "string"}},
        task("after", inputs={"answer": "string"}),
    ], [{"id": "link", "from": "component", "to": "after", "mapping": {"answer": "answer"}}])
    validate(parent)
    facts["valid_subworkflow_output_cannot_expand"] = error(lambda: expand(parent, {"child": child}))
    engine = Engine(base / "subflow-input")
    project = engine.create_project("Input probe")
    child = graph([task(inputs={"request": "string"})], name="child")
    parent = graph([task("before", outputs={"request": "string"}, validation="contract"),
        {"id": "component", "title": "Reusable component", "kind": "subworkflow", "workflow": "child", "inputs": {"request": "string"}}],
        [{"id": "link", "from": "before", "to": "component", "mapping": {"request": "request"}}])
    run = engine.start(project["id"], parent, library={"child": child})
    claim = engine.claim(run["id"], "before")
    run = engine.submit(run["id"], "before", claim["token"], {"ok": True, "summary": "Source ready", "outputs": {"request": "REQUEST_SENTINEL"}})
    facts["subworkflow_boundary_inputs"] = run["nodes"]["component"]["inputs"]
    facts["subworkflow_child_inputs"] = run["nodes"]["component.work"]["inputs"]

    engine = Engine(base / "external")
    project = engine.create_project("Publication probe")
    operation = {"action": "create-draft", "target": "mailbox-synthetic", "candidate": "reviewed-draft"}
    flow = graph([task("draft", outputs={"body": "string"}, validation="contract"),
        {"id": "approval", "title": "Approve draft", "kind": "decision", "operation": operation, "inputs": {"body": "string"}, "outputs": {"body": "string"}},
        {"id": "publish", "title": "Create draft", "kind": "external", "operation": operation, "approval": "approval", "inputs": {"body": "string"}, "capabilities": [{"plugin": "fake", "operation": "create"}]}],
        [{"id": "first", "from": "draft", "to": "approval", "mapping": {"body": "body"}},
         {"id": "last", "from": "approval", "to": "publish", "outcome": "approve", "mapping": {"body": "body"}}])
    # Mock only the local transport qualification / I/O. All graph transitions
    # and effects-ledger writes use the normal engine API.
    record = {"config": {"argv": ["/synthetic/adapter"]}, "identity": "synthetic-account", "descriptor": "synthetic", "operations": {"create": "write"}, "tool_digest": None}
    payloads = []
    def exchange(config, payload, **kwargs):
        if payload["action"] == "describe":
            return {"connected": True, "identity": record["identity"], "operations": record["operations"], "tool_digest": None}
        payloads.append(payload)
        return {"ok": True, "identity": record["identity"], "outputs": {}, "receipt": {"id": "synthetic-receipt"}}
    with patch("workflow_engine.integrations.issues", return_value=[]), patch("connectors.local_tools.approved", return_value=record), patch("connectors.tool_runtime.approved", return_value=record), patch("connectors.tool_runtime.exchange", side_effect=exchange):
        run = engine.start(project["id"], flow)
        claim = engine.claim(run["id"], "draft")
        run = engine.submit(run["id"], "draft", claim["token"], {"ok": True, "summary": "Brouillon prêt", "outputs": {"body": "DRAFT_SENTINEL"}})
        facts["report_contains_draft_output"] = "DRAFT_SENTINEL" in markdown(run)
        gate = run["nodes"]["approval"]
        run = engine.decide(run["id"], "approval", gate["nonce"], gate["proposal"], "approve", human=True)
        claim = engine.claim(run["id"], "publish")
        execute_tool(engine, claim["run"], claim["node"], claim["token"])
        facts["external_node_received_inputs"] = claim["run"]["nodes"]["publish"]["inputs"]
        facts["external_adapter_arguments"] = payloads[0]["arguments"]
        facts["external_adapter_received_draft"] = "DRAFT_SENTINEL" in json.dumps(payloads)

    for stage in ("before-agent-qa", "after-rejection"):
        engine = Engine(base / stage)
        project = engine.create_project("Candidate gate probe")
        file = Path(project["path"]) / "sample.txt"
        file.write_text("original\n")
        flow = graph([
            {"id": "build", "title": "Build", "kind": "agent", "execution_mode": "edit", "outputs": {"candidate": "object"}, "validation": "contract"},
            {"id": "qa", "title": "QA agent", "kind": "agent", "inputs": {"candidate": "object"}, "validation": "contract"},
            {"id": "review", "title": "Approve local application", "kind": "decision"},
        ], [{"id": "to-qa", "from": "build", "to": "qa", "mapping": {"candidate": "candidate"}},
            {"id": "to-review", "from": "qa", "to": "review"}])
        run = engine.start(project["id"], flow)
        claim = engine.claim(run["id"], "build")
        prepared = prepare(engine, run, base / (stage + "-job"))
        (prepared["workspace"] / "sample.txt").write_text("changed\n")
        candidate, diff = capture(engine, run, prepared)
        run = engine.submit(run["id"], "build", claim["token"], {"ok": True, "summary": "Candidate prepared", "outputs": {"candidate": candidate}, "evidence": [candidate, diff], "patch": diff})
        if stage == "after-rejection":
            claim = engine.claim(run["id"], "qa")
            run = engine.submit(run["id"], "qa", claim["token"], {"ok": True, "summary": "QA done", "outputs": {}})
            gate = run["nodes"]["review"]
            run = engine.decide(run["id"], "review", gate["nonce"], gate["proposal"], "reject", human=True)
        facts[stage + "_run_status"] = run["status"]
        facts[stage + "_qa_status"] = run["nodes"]["qa"]["status"]
        facts[stage + "_outcome"] = run.get("completion_outcome")
        facts[stage + "_application_error"] = error(lambda: apply(engine, run["id"], "build", candidate["sha256"], human=True))
        facts[stage + "_project_file"] = file.read_text().strip()

    engine = Engine(base / "volumes")
    project = engine.create_project("Volume probe")
    conversations = Conversations(engine)
    c = conversations.open(project["id"], graph([task()]), "codex")
    for i in range(50):
        conversations.add(c["id"], "Synthetic request " + str(i) + " " + "x" * 90000, key=str(i))
    facts["conversation_request_count"] = 50
    for action, payload in [("conversation.get", {"conversation": c["id"]}), ("project.get", {"project": project["id"]})]:
        response = request(engine, {"action": action, **payload})
        facts[action + "_response_bytes"] = len(json.dumps({"ok": True, "result": response}, ensure_ascii=False).encode())
        runner = "const {jsonRequest}=require('./electron/backend-request.cjs');jsonRequest('backend/studio.py',['--state',process.argv[1]],JSON.parse(process.argv[2])).then(()=>console.log('SUCCESS')).catch(e=>console.log(e.message));"
        result = subprocess.run(["node", "-e", runner, str(engine.store.directory), json.dumps({"action": action, **payload})], cwd=ROOT, text=True, capture_output=True, timeout=40, check=True)
        facts[action + "_electron_result"] = result.stdout.strip()

print(json.dumps(facts, ensure_ascii=False, indent=2))

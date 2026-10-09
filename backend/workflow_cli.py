#!/usr/bin/env python3
"""Narrow bridge used by native agents. No human approval operation is exposed."""
import argparse
import json
import os
from pathlib import Path
import sys

from workflow_engine import Engine, ContractError
from workflow_engine.contracts import require
from workflow_engine.conversations import Conversations, ask, answer


def _request(engine, cid, action, payload):
    conversations = Conversations(engine)
    conversation = conversations.get(cid)
    if action == "status":
        return conversations.snapshot(cid, offset=payload.get("offset", 0), limit=25, query=payload.get("query", ""))
    if action == "add":
        return conversations.add(cid, payload["request"], payload.get("project"), payload.get("key"), payload.get("depends_on"))
    if action == "artifact":
        path = Path(payload["path"]).expanduser()
        require(path.is_file() and path.stat().st_size <= 2_000_000, "Preuve absente ou trop volumineuse")
        return engine.artifact(path.read_bytes())
    run = conversations.checked_run(cid, payload["run"])
    if action == "ready":
        from workflow_engine.projections import run_detail, paging
        offset, limit = paging(payload.get("offset", 0), payload.get("limit", 25))
        projected = run_detail(engine, run)
        nodes = [n for n in projected["definition"]["nodes"] if projected["nodes"][n["id"]]["status"] == "ready"]
        items = [{"node": n, "state": projected["nodes"][n["id"]]} for n in nodes[offset:offset + limit]]
        return {"items": items, "parameters": projected["parameters"], "project": engine.project(run["project"]),
                "offset": offset, "total": len(nodes), "next": offset + len(items) if offset + len(items) < len(nodes) else None}
    if action == "inspect":
        from workflow_engine.projections import run_detail
        return run_detail(engine, run)
    if action == "read":
        from workflow_engine.projections import proof_page
        return proof_page(engine, run["id"], payload["sha256"], payload.get("offset", 0))
    nid = payload["node"]
    node = next((n for n in run["definition"]["nodes"] if n["id"] == nid), None)
    require(node is not None, "Bloc inconnu")
    if action == "heartbeat":
        engine.heartbeat(run["id"], nid, payload["token"])
        return {"ok": True}
    if action == "prepare-candidate":
        import tempfile
        from connectors.candidates import materialize
        state = run["nodes"][nid]
        require(node["kind"] in {"agent", "command", "task"} and state["status"] == "running" and state.get("token") == payload["token"], "Tentative périmée")
        reference = state.get("inputs", {}).get("candidate")
        require(reference, "Aucun candidat transmis à ce bloc")
        parent = engine.store.directory / "jobs"
        parent.mkdir(exist_ok=True)
        target = Path(tempfile.mkdtemp(prefix="qa-", dir=parent)) / "candidate"
        return {"path": str(materialize(engine, reference, run["project"], target)), "candidate": reference}
    if action == "claim":
        require(node["kind"] in {"agent", "task", "document"}, "Ce bloc appartient au moteur ou à une décision humaine")
        require(node.get("execution_mode") != "edit", "Utiliser execute pour la copie isolée")
        require(node.get("execution", {}).get("provider", conversation["provider"]) == conversation["provider"], "Ce bloc utilise un autre fournisseur : utiliser execute, sans substitution")
        selected_model = node.get("execution", {}).get("model")
        require(not selected_model or selected_model == conversation.get("model"), "Ce bloc utilise un autre modèle : utiliser execute, sans substitution")
        selected_effort = node.get("execution", {}).get("effort", node.get("effort", conversation.get("effort", "medium")))
        require(selected_effort == conversation.get("effort", "medium"), "Ce bloc utilise un autre niveau d’effort : utiliser execute, sans substitution")
        pid = os.getppid()
        owner = None
        for _ in range(10):
            try:
                process = Path(f"/proc/{pid}")
                name = (process / "comm").read_text().strip().lower()
                if "codex" in name or "claude" in name:
                    owner = pid; break
                fields = (process / "stat").read_text().rsplit(")", 1)[1].split()
                pid = int(fields[1])
                if pid <= 1: break
            except (OSError, ValueError, IndexError): break
        return engine.claim(run["id"], nid, executor="native", owner_pid=owner)
    if action == "context":
        return engine.execution_context(run["id"], nid, payload["context"])
    if action == "execute":
        from workflow_engine.runtime import execute
        require(node["kind"] in {"agent", "command", "document"}, "Exécutant non accessible depuis la conversation")
        claim = engine.claim(run["id"], nid)
        execute(engine, run["id"], nid, claim["token"])
        return engine.run(run["id"])
    if action == "result":
        require(node["kind"] in {"agent", "task", "document"}, "Le résultat de cette opération appartient à son exécutant connecté")
        return engine.submit(run["id"], nid, payload["token"], payload["result"])
    if action == "ask":
        return ask(engine, run["id"], nid, payload["token"], payload["text"])
    if action == "answer":
        return answer(engine, run["id"], nid, payload["question"], payload["text"])
    raise ContractError("Commande non autorisée ; décisions et réceptions humaines se font dans Tricorder")


def request(engine, cid, action, payload):
    """Every native response uses the same bounded view and explicit readers."""
    value = _request(engine, cid, action, payload)
    from workflow_engine.projections import run_detail
    if action == 'claim':
        return {**value, 'run': run_detail(engine, value['run'])}
    if action in {'context', 'execute', 'result', 'ask', 'answer'}:
        return run_detail(engine, value)
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", required=True)
    parser.add_argument("--conversation", required=True)
    parser.add_argument("action", choices=["status", "add", "ready", "claim", "context", "execute", "result", "ask", "answer", "artifact", "heartbeat", "prepare-candidate", "inspect", "read"])
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--query", default="")
    args = parser.parse_args()
    try:
        if args.action == "status":
            payload = {"offset": args.offset, "query": args.query}
        else:
            raw = sys.stdin.buffer.read(4 * 1024 * 1024 + 1)
            require(len(raw) <= 4 * 1024 * 1024, "Requête trop volumineuse (maximum 4 Mio)")
            payload = json.loads(raw)
        value = request(Engine(args.state), args.conversation, args.action, payload)
        print(json.dumps({"ok": True, "result": value}, ensure_ascii=False))
    except (ContractError, KeyError, ValueError, OSError) as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

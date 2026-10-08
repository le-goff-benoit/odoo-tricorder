#!/usr/bin/env python3
"""Narrow bridge used by native agents. No human approval operation is exposed."""
import argparse
import json
from pathlib import Path
import sys

from workflow_engine import Engine, ContractError
from workflow_engine.contracts import require
from workflow_engine.conversations import Conversations, ask, answer


def request(engine, cid, action, payload):
    conversations = Conversations(engine)
    conversation = conversations.get(cid)
    if action == "status":
        return conversations.snapshot(cid)
    if action == "add":
        return conversations.add(cid, payload["request"], payload.get("project"), payload.get("key"), payload.get("depends_on"))
    if action == "artifact":
        path = Path(payload["path"]).expanduser()
        require(path.is_file() and path.stat().st_size <= 2_000_000, "Preuve absente ou trop volumineuse")
        return engine.artifact(path.read_bytes())
    run = conversations.checked_run(cid, payload["run"])
    if action == "ready":
        return [{"node": n, "state": run["nodes"][n["id"]], "parameters": run["parameters"],
                 "project": engine.project(run["project"])} for n in run["definition"]["nodes"] if run["nodes"][n["id"]]["status"] == "ready"]
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
        require(node["kind"] in {"agent", "command"} and state["status"] == "running" and state.get("token") == payload["token"], "Tentative périmée")
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
        return engine.claim(run["id"], nid)
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", required=True)
    parser.add_argument("--conversation", required=True)
    parser.add_argument("action", choices=["status", "add", "ready", "claim", "context", "execute", "result", "ask", "answer", "artifact", "heartbeat", "prepare-candidate"])
    args = parser.parse_args()
    try:
        payload = {} if args.action == "status" else json.loads(sys.stdin.read(1_000_001))
        value = request(Engine(args.state), args.conversation, args.action, payload)
        print(json.dumps({"ok": True, "result": value}, ensure_ascii=False))
    except (ContractError, KeyError, ValueError, OSError) as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

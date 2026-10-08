import concurrent.futures
import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine import Engine, ContractError
from workflow_engine.library import node, edge, templates
from workflow_engine.runtime import execute, dispatch, reconcile, sandbox_argv, capabilities
from workflow_engine.documentation import export_release
from connectors.providers import Events, command, redact
from studio import request


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.engine = Engine(self.root / "state")
        self.project = self.engine.create_project("Synthétique")

    def graph(self, *nodes, edges=None):
        return {"schema": 1, "id": "runtime", "title": "Runtime", "nodes": list(nodes), "edges": edges or []}

    def test_worker_result_recovered_without_second_execution(self):
        run = self.engine.start(self.project["id"], self.graph(node("work", "Travail")), simulation=True)
        claim = self.engine.claim(run["id"], "work")
        job = self.root / "state/jobs" / claim["token"]
        job.mkdir(parents=True)
        (job / "result.json").write_text(json.dumps({"ok": True, "summary": "Résultat écrit avant un crash"}))
        with patch("workflow_engine.runtime.subprocess.Popen") as spawn:
            dispatch(self.engine, run["id"])
            spawn.assert_not_called()
        restored = reconcile(self.engine, run["id"], "work")
        self.assertEqual(restored["nodes"]["work"]["status"], "returned")
        with self.assertRaises(ContractError):
            reconcile(self.engine, run["id"], "work")

    def test_unobserved_worker_is_not_relaunched_or_auto_accepted(self):
        run = self.engine.start(self.project["id"], self.graph(node("work", "Travail")))
        self.engine.claim(run["id"], "work")
        with self.assertRaisesRegex(ContractError, "inconnu"):
            reconcile(self.engine, run["id"], "work")
        self.assertEqual(self.engine.run(run["id"])["nodes"]["work"]["status"], "running")

    def test_simulation_exports_one_human_entry_and_verifiable_portable_evidence(self):
        graph = self.graph(node("work", "Expliquer", criteria=["Résultat compréhensible"]))
        run = self.engine.start(self.project["id"], graph, simulation=True)
        claim = self.engine.claim(run["id"], "work")
        execute(self.engine, run["id"], "work", claim["token"])
        self.engine.accept(run["id"], "work", human=True, checks=["Résultat compréhensible"], note="Exemple relu")
        result = Path(export_release(self.engine, run["id"], self.root, "demo"))
        self.assertEqual(result, self.root / "release/demo/README.md")
        self.assertIn("Exécution simulée", result.read_text())
        self.assertEqual([p.name for p in result.parent.glob("*.md")], ["README.md"])
        exported = json.loads((result.parent / ".suivi/release.json").read_text())
        proof = exported["nodes"]["work"]["result"]["evidence"][0]
        self.assertEqual((result.parent / ".suivi/preuves" / proof["sha256"]).read_bytes(), self.engine.evidence(proof))
        with self.assertRaises(ContractError):
            export_release(self.engine, run["id"], self.root, "demo")
        with self.assertRaises(ContractError):
            export_release(self.engine, run["id"], self.root, "../escape")

    def test_concurrent_human_answers_apply_once(self):
        run = self.engine.start(self.project["id"], self.graph(node("gate", "Choisir", "decision")))
        state = run["nodes"]["gate"]
        def decide(outcome):
            try:
                self.engine.decide(run["id"], "gate", state["nonce"], state["proposal"], outcome, human=True)
                return True
            except ContractError:
                return False
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            self.assertEqual(sum(pool.map(decide, ["approve", "reject"])), 1)

    def test_conditional_join_waits_only_selected_branches(self):
        graph = self.graph(node("choose", "Choisir", "condition", parameter="docs", options=["none", "notes"]), node("none", "Sans doc", "join"), node("notes", "Rédiger"), node("join", "Terminer", "join"), edges=[edge("choose", "none", "none"), edge("choose", "notes", "notes"), edge("none", "join"), edge("notes", "join")])
        run = self.engine.start(self.project["id"], graph, parameters={"docs": "none"})
        self.assertEqual(run["nodes"]["notes"]["status"], "skipped")
        self.assertEqual(run["status"], "completed")

    def test_generic_bridge_refuses_self_approval_and_secret_redaction(self):
        run = self.engine.start(self.project["id"], self.graph(node("gate", "Choisir", "decision")))
        state = run["nodes"]["gate"]
        with self.assertRaises(ContractError):
            request(self.engine, {"action": "run.decide", "run": run["id"], "node": "gate", "nonce": state["nonce"], "proposal": state["proposal"], "outcome": "approve", "human": True})
        self.assertNotIn("example-secret", redact('Authorization: Bearer example-secret'))
        self.assertNotIn("example-secret", redact('{"access_token":"example-secret"}'))

    def test_cli_argv_preserves_prompt_data_no_shell_and_no_fallback(self):
        n = node("agent", "Analyse", "agent", model="chosen-model", provider="codex", effort="high", session="delegated")
        with patch("connectors.providers.shutil.which", return_value="/synthetic/codex"):
            args = command(n, self.root)
        self.assertIn("--ignore-user-config", args)
        self.assertIn("features.shell_tool=false", args)
        self.assertIn("read-only", args)
        self.assertNotIn("--dangerously-bypass-approvals-and-sandbox", args)
        n.update(provider="claude")
        with patch("connectors.providers.shutil.which", return_value="/synthetic/claude"):
            args = command(n, self.root)
        self.assertEqual(args[args.index("--tools") + 1], "")
        self.assertIn("--strict-mcp-config", args)
        self.assertNotIn("--fallback-model", args)
        args = sandbox_argv(["python3", "-c", "print('$(touch /tmp/pwned)')"])
        self.assertEqual(args[-1], "print('$(touch /tmp/pwned)')")

    def test_provider_deduplicates_usage_correlates_and_refuses_broken_stream(self):
        events = Events("codex", "run", "node", 2)
        events.consume({"type": "thread.started", "thread_id": "new-thread"})
        events.consume({"type": "item.completed", "item": {"type": "agent_message", "text": '{"summary":"Draft","outputs":{}}'}})
        with self.assertRaisesRegex(ContractError, "interrompu"):
            events.finish("requested")
        final = {"type": "turn.completed", "usage": {"input_tokens": 10, "output_tokens": 5}}
        self.assertTrue(events.consume(final))
        self.assertFalse(events.consume(final))
        result = events.finish("requested")
        self.assertEqual(result["attempt"], 2)
        self.assertEqual(result["usage"]["input_tokens"], 10)
        self.assertIsNone(result["model_observed"])
        self.assertIsNone(result["cost_usd"])
        claude = Events("claude", "run", "node", 1)
        claude.consume({"type":"system", "subtype":"init", "tools":["StructuredOutput"], "model":"observed-model"})
        claude.consume({"type":"result", "is_error":True, "result":"Organization disabled subscription access", "usage":{"input_tokens":0}})
        with self.assertRaisesRegex(ContractError, "Organization disabled"):
            claude.finish("requested")
        with self.assertRaisesRegex(ContractError, "outils"):
            claude.consume({"type": "system", "subtype": "init", "tools": ["Bash"]})

    def test_backup_preserves_waiting_decision(self):
        run = self.engine.start(self.project["id"], self.graph(node("gate", "Choisir", "decision")))
        destination = self.root / "restored"
        destination.mkdir()
        self.engine.store.backup(destination / "workflows.sqlite3")
        restored = Engine(destination).run(run["id"])
        self.assertEqual(restored["nodes"]["gate"], run["nodes"]["gate"])


if __name__ == "__main__":
    unittest.main()

import copy
import os
import sys
import tempfile
import unittest
from native_cli_fixture import use_native_cli_fixtures
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from workflow_engine import Engine, ContractError
from workflow_engine.conversations import Conversations, ask, answer
from workflow_cli import request


class ConversationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = temporary.name
        use_native_cli_fixtures(self, self.root)
        self.engine = Engine(self.root)
        self.a = self.engine.create_project("Projet A")
        self.b = self.engine.create_project("Projet B")
        self.service = Conversations(self.engine)
        self.graph = {"schema": 1, "id": "support", "title": "Support",
                      "nodes": [{"id": "analyse", "title": "Analyser", "kind": "agent", "validation": "contract", "outputs": {"finding": "string"}, "max_attempts": 2}], "edges": []}
        self.conversation = self.service.open(self.a["id"], self.graph, "codex", [self.b["id"]])

    def add(self, text="Demande", **kwargs):
        return self.service.add(self.conversation["id"], text, **kwargs)

    def finish(self, item, finding="Constat"):
        cid = self.conversation["id"]
        claim = request(self.engine, cid, "claim", {"run": item["run"], "node": "analyse"})
        return request(self.engine, cid, "result", {"run": item["run"], "node": "analyse", "token": claim["token"],
                                                   "result": {"ok": True, "summary": "Fait", "outputs": {"finding": finding}}})

    def test_two_projects_share_a_definition_and_keep_independent_work_and_results(self):
        first = self.add("Un", project=self.a["id"], key="a")
        second = self.add("Deux", project=self.b["id"], key="b")
        self.finish(first)
        snapshot = Conversations(Engine(self.root)).snapshot(self.conversation["id"])
        self.assertEqual(len(snapshot["definition"]["nodes"]), 1)
        self.assertEqual([(p["id"], p["title"], p["path"]) for p in snapshot["project_contexts"]],
                         [(p["id"], p["title"], p["path"]) for p in (self.a, self.b)])
        self.assertEqual(snapshot["items"][0]["execution"]["status"], "completed")
        self.assertEqual(snapshot["items"][1]["execution"]["nodes"]["analyse"]["status"], "ready")
        self.assertEqual(snapshot["items"][1]["execution"]["project"], self.b["id"])
        self.assertEqual(snapshot["items"][0]["execution"]["parameters"]["request"], "Un")
        self.assertEqual(first, self.add("Un", project=self.a["id"], key="a"))
        with self.assertRaises(ContractError):
            self.add("Modifié", key="a")

    def test_unplanned_question_is_durable_scoped_and_does_not_stop_other_work(self):
        first, second = self.add("Un"), self.add("Deux")
        claim = self.engine.claim(first["run"], "analyse")
        run = ask(self.engine, first["run"], "analyse", claim["token"], "Quel utilisateur ?")
        question = run["nodes"]["analyse"]["question"]
        self.finish(second)
        reopened = Engine(self.root)
        self.assertEqual(reopened.run(first["run"])["nodes"]["analyse"]["question"], question)
        with self.assertRaises(ContractError):
            answer(reopened, second["run"], "analyse", question["id"], "Alice")
        answer(reopened, first["run"], "analyse", question["id"], "Alice")
        with self.assertRaises(ContractError):
            answer(reopened, first["run"], "analyse", question["id"], "Bob")
        result = self.finish(first)
        state = result["nodes"]["analyse"]
        self.assertEqual(state["attempt"], 1)
        self.assertEqual(state["inputs"]["clarifications"], [{"question": "Quel utilisateur ?", "answer": "Alice"}])
        self.assertEqual(state["receipt"]["actor"], "contract-policy")

    def test_optional_child_question_is_answered_in_the_same_terminal(self):
        from workflow_engine.associated_actions import activate
        graph = copy.deepcopy(self.graph)
        graph['schema'] = 2
        graph['actions'] = [{'id': 'draft', 'title': 'Préparer un brouillon', 'source': 'analyse', 'event': 'accepted', 'enabled': True,
                             'workflow': {'schema': 2, 'id': 'draft', 'title': 'Brouillon', 'nodes': [
                                 {'id': 'recipient', 'kind': 'question', 'title': 'Destinataire', 'question': 'À qui adresser le brouillon ?'}], 'edges': []}}]
        self.conversation = self.service.open(self.a['id'], graph, 'codex')
        item = self.add('Diagnostic et brouillon')
        self.finish(item)
        main = self.engine.run(item['run'])
        main = activate(self.engine, main['id'], main['associated_actions'][0]['id'], human=True)
        child = self.engine.run(main['associated_actions'][0]['run'])
        question = child['nodes']['recipient']['question']['id']
        request(self.engine, self.conversation['id'], 'answer', {'run': child['id'], 'node': 'recipient', 'question': question, 'text': 'Équipe support'})
        self.assertEqual(self.engine.run(child['id'])['status'], 'completed')
        self.assertEqual(self.engine.run(main['id'])['status'], 'completed')
        other = self.service.open(self.b['id'], self.graph, 'codex')
        with self.assertRaisesRegex(ContractError, 'autre conversation'):
            self.service.checked_run(other['id'], child['id'])

    def test_cross_project_dependency_waits_then_receives_predecessor_results(self):
        first = self.add("API", project=self.a["id"])
        second = self.add("Consommateur", project=self.b["id"], depends_on=[first["id"]])
        with self.assertRaises(ContractError):
            self.engine.claim(second["run"], "analyse")
        with self.assertRaisesRegex(ContractError, "précédentes"):
            self.engine.control(second["run"], "resume")
        self.finish(first, "Contrat de l’API")
        snapshot = self.service.snapshot(self.conversation["id"])
        downstream = snapshot["items"][1]["execution"]
        self.assertEqual(downstream["status"], "active")
        self.assertEqual(downstream["parameters"]["dependency_results"][first["run"]]["analyse"]["outputs"]["finding"], "Contrat de l’API")
        self.finish(second)

    def test_manual_pause_is_not_undone_by_dependency_polling(self):
        first = self.add("Amont")
        second = self.add("Aval", depends_on=[first["id"]])
        self.engine.control(second["run"], "pause")
        self.finish(first)
        self.service.snapshot(self.conversation["id"])
        self.assertEqual(self.engine.run(second["run"])["status"], "paused")
        self.engine.control(second["run"], "resume")
        self.assertEqual(self.engine.run(second["run"])["status"], "active")

    def test_other_projects_and_other_conversation_runs_are_rejected(self):
        c = self.engine.create_project("Hors périmètre")
        with self.assertRaises(ContractError):
            self.add(project=c["id"])
        item = self.add()
        other = self.service.open(self.a["id"], self.graph, "claude")
        with self.assertRaises(ContractError):
            request(self.engine, other["id"], "claim", {"run": item["run"], "node": "analyse"})
        with self.assertRaises(ContractError):
            self.add(depends_on=["missing"])

    def test_native_bridge_cannot_answer_a_human_gate_or_change_provider(self):
        graph = copy.deepcopy(self.graph)
        graph["nodes"][0]["provider"] = "claude"
        with self.assertRaisesRegex(ContractError, "Modèle IA à définir"):
            self.service.open(self.a["id"], graph, "codex")
        graph["nodes"][0]["model"] = "fixture-model"
        conversation = self.service.open(self.a["id"], graph, "codex")
        item = self.service.add(conversation["id"], "Une demande")
        with self.assertRaisesRegex(ContractError, "autre fournisseur"):
            request(self.engine, conversation["id"], "claim", {"run": item["run"], "node": "analyse"})
        with self.assertRaisesRegex(ContractError, "non autorisée"):
            request(self.engine, conversation["id"], "approve", {"run": item["run"], "node": "analyse"})

    def test_planned_free_answer_does_not_approve_following_production_gate(self):
        graph = {"schema": 1, "id": "clarify", "title": "Préciser",
                 "nodes": [{"id": "question", "kind": "question", "title": "Demander", "question": "Quel impact ?", "outputs": {"answer": "string"}},
                           {"id": "gate", "kind": "decision", "title": "Autoriser la production"}],
                 "edges": [{"id": "q-g", "from": "question", "to": "gate"}]}
        run = self.engine.start(self.a["id"], graph)
        qid = run["nodes"]["question"]["question"]["id"]
        run = answer(self.engine, run["id"], "question", qid, "Critique, vite !")
        self.assertEqual(run["nodes"]["gate"]["status"], "waiting")
        self.assertNotIn("decision", run["nodes"]["gate"])
        with self.assertRaises(ContractError):
            answer(self.engine, run["id"], "gate", qid, "Oui")

    def test_single_agent_routes_critical_normal_and_unknown_and_rejects_invalid_choice(self):
        from workflow_engine.work_templates import templates
        graph = templates()[1]
        for provider, choice, target in [("codex", "critical", "urgent"), ("claude", "normal", "normal"), ("codex", "unknown", "clarify")]:
            conversation = self.service.open(self.a["id"], graph, provider)
            item = self.service.add(conversation["id"], "Support à qualifier")
            claim = request(self.engine, conversation["id"], "claim", {"run": item["run"], "node": "diagnosis"})
            result = {"ok": True, "summary": "Constat", "outputs": {"severity": "invented", "finding": "Faits", "next_action": "Suite"}}
            invalid = self.engine.submit(item["run"], "diagnosis", claim["token"], result)
            self.assertEqual(invalid["nodes"]["diagnosis"]["status"], "returned")
            self.assertIn("validation_error", invalid["nodes"]["diagnosis"])
            with self.assertRaises(ContractError):
                self.engine.accept(item["run"], "diagnosis", human=True)
            self.engine.retry(item["run"], "diagnosis", "Corriger la classification", human=True)
            claim = self.engine.claim(item["run"], "diagnosis")
            result["outputs"]["severity"] = choice
            run = self.engine.submit(item["run"], "diagnosis", claim["token"], result)
            self.assertEqual(run["nodes"]["diagnosis"]["outcome"], choice)
            self.assertEqual(run["nodes"][target]["status"], "waiting_input" if target == "clarify" else "ready")
            self.assertNotIn("route", run["nodes"])

    def test_idempotent_key_cannot_silently_change_dependencies(self):
        first = self.add("Amont")
        second = self.add("Aval", key="aval", depends_on=[first["id"]])
        self.assertEqual(second, self.add("Aval", key="aval", depends_on=[first["id"], first["id"]]))
        with self.assertRaises(ContractError):
            self.add("Aval", key="aval")
        for invalid in ("id", [None], {"id": True}):
            with self.assertRaises(ContractError):
                self.add(depends_on=invalid)

    def test_completed_unresolved_work_does_not_release_dependents(self):
        from workflow_engine.engine import dependency_satisfied
        graph = copy.deepcopy(self.graph)
        graph["nodes"][0]["completion_outcome"] = "blocked"
        conversation = self.service.open(self.a["id"], graph, "codex")
        first = self.service.add(conversation["id"], "Non résolu")
        second = self.service.add(conversation["id"], "Aval", depends_on=[first["id"]])
        claim = self.engine.claim(first["run"], "analyse")
        run = self.engine.submit(first["run"], "analyse", claim["token"], {"ok": True, "summary": "Non résolu", "outputs": {"finding": "Inconnu"}})
        self.assertEqual(run["status"], "completed")
        self.assertFalse(dependency_satisfied(run))
        self.assertEqual(run["completion_outcome"], "blocked")
        self.service.snapshot(conversation["id"])
        self.assertEqual(self.engine.run(second["run"])["status"], "paused")
        with self.assertRaises(ContractError):
            self.engine.control(second["run"], "resume")

    def test_support_clarification_routes_again_and_unknown_never_becomes_success(self):
        from workflow_engine.work_templates import templates
        from workflow_engine.engine import dependency_satisfied
        for choice, target in (("critical", "urgent"), ("normal", "normal"), ("unknown", "unresolved")):
            run = self.engine.start(self.a["id"], templates()[1])
            def submit(nid, outputs):
                claim = self.engine.claim(run["id"], nid)
                return self.engine.submit(run["id"], nid, claim["token"], {"ok": True, "summary": "Injection synthétique", "outputs": outputs})
            run = submit("diagnosis", {"severity": "unknown", "finding": "Inconnu", "next_action": "Préciser"})
            question = run["nodes"]["clarify"]["question"]["id"]
            run = answer(self.engine, run["id"], "clarify", question, "Information complémentaire")
            run = submit("reassess", {"severity": choice, "finding": "Fait précisé", "next_action": "Suite"})
            self.assertEqual(run["nodes"][target]["status"], "waiting_input" if choice == "unknown" else "ready")
            if choice == "unknown":
                run = answer(self.engine, run["id"], target, run["nodes"][target]["question"]["id"], "Nouvelle investigation")
                self.assertEqual(run["completion_outcome"], "blocked")
                self.assertFalse(dependency_satisfied(run))
            else:
                self.assertEqual(run["nodes"][target]["inputs"]["finding"], "Fait précisé")
                run = submit(target, {"proposal" if choice == "critical" else "draft": "Proposition"})
                self.assertEqual(run["completion_outcome"], "succeeded")
                self.assertTrue(dependency_satisfied(run))

    def test_release_qa_failure_stays_unresolved_after_answer_but_green_receipt_succeeds(self):
        from workflow_engine.work_templates import templates
        from workflow_engine.engine import dependency_satisfied
        for verdict in ("fail", "pass"):
            run = self.engine.start(self.a["id"], templates()[0])
            def submit(nid, outputs):
                claim = self.engine.claim(run["id"], nid)
                return self.engine.submit(run["id"], nid, claim["token"], {
                    "ok": True, "summary": "Fixture de parcours, pas une QA métier", "outputs": outputs,
                    "evidence": [self.engine.artifact(b"synthetic control result")]})
            run = submit("intent", {"intent": "Résultat attendu"})
            run = submit("plan", {"plan": "Périmètre"})
            gate = run["nodes"]["scope"]
            run = self.engine.decide(run["id"], "scope", gate["nonce"], gate["proposal"], "approve", human=True)
            run = submit("work", {"result": "Candidat"})
            run = submit("check", {"verdict": verdict, "evidence_summary": "Contrôle synthétique " + verdict})
            if verdict == "fail":
                self.assertEqual(run["nodes"]["delivery"]["status"], "skipped")
                question = run["nodes"]["failure"]["question"]["id"]
                run = answer(self.engine, run["id"], "failure", question, "Corriger le critère manquant")
                self.assertFalse(dependency_satisfied(run))
                self.assertEqual(run["completion_outcome"], "blocked")
            else:
                run = submit("delivery", {"proposal": "Proposition"})
                gate = run["nodes"]["receipt"]
                run = self.engine.decide(run["id"], "receipt", gate["nonce"], gate["proposal"], "approve", human=True)
                self.assertTrue(dependency_satisfied(run))
                self.assertEqual(run["nodes"]["failure"]["status"], "skipped")

    def test_documentation_preserves_pending_and_answered_questions(self):
        from workflow_engine.documentation import markdown
        item = self.add()
        claim = self.engine.claim(item["run"], "analyse")
        run = ask(self.engine, item["run"], "analyse", claim["token"], "Quel acteur ?")
        self.assertIn("Réponse attendue", markdown(run))
        self.assertIn("Quel acteur ?", markdown(run))
        run = answer(self.engine, item["run"], "analyse", run["nodes"]["analyse"]["question"]["id"], "Alice")
        self.assertIn("Réponse : Alice", markdown(run))

    def test_switching_provider_does_not_retain_other_provider_model(self):
        graph = copy.deepcopy(self.graph)
        graph["defaults"] = {"provider": "codex", "model": "codex-only"}
        conversation = self.service.open(self.a["id"], graph, "claude")
        self.assertNotEqual(conversation["model"], "codex-only")

    def test_odoo_setup_preserves_custom_workflow_and_enforces_qa_at_claim(self):
        from workflow_engine.setup import configure
        pack = Path(os.environ.get("TRICORDER_AGENTS_DIR", str(Path.home() / ".odoo19-agents")))
        if not (pack / "tricorder-pack.json").exists():
            self.skipTest("Pack canonique absent de ce poste")
        module = Path(self.a["path"]) / "custom"
        module.mkdir()
        (module / "__manifest__.py").write_text("{'name': 'Synthetic', 'version': '19.0.1.0.0'}")
        catalog = [{"path": self.a["path"], "name": "Projet A", "series": "19.0"},
                   {"path": self.b["path"], "name": "Projet B", "series": "17.0"}]
        self.assertEqual(configure(self.engine, catalog, str(pack))[0]["status"], "configured")
        graph = next(g for g in self.engine.workflows(self.a["id"]) if g["id"] == "odoo-release-conversation")
        graph["title"] = "Mon workflow personnalisé"
        self.engine.save(self.a["id"], graph, graph["revision"])
        configure(self.engine, catalog, str(pack))
        graph = next(g for g in self.engine.workflows(self.a["id"]) if g["id"] == graph["id"])
        self.assertEqual(graph["title"], "Mon workflow personnalisé")
        self.assertEqual(next(n for n in graph["nodes"] if n["id"] == "work")["execution_mode"], "edit")
        studio_graph = next(g for g in self.engine.workflows(self.b["id"]) if g["id"] == "odoo-release-conversation")
        self.assertEqual(next(n for n in studio_graph["nodes"] if n["id"] == "work")["profile"], "odoo-studio")
        # Launch/intent is possible before a QA copy exists.
        conversation = self.service.open(self.a["id"], graph, "codex", model="fixture-model")
        item = self.service.add(conversation["id"], "Clarifier une demande")
        self.assertEqual(self.engine.run(item["run"])["nodes"]["intent"]["status"], "ready")
        transverse = self.service.open(self.a["id"], graph, "codex", [self.b["id"]], model="fixture-model")
        other = self.service.add(transverse["id"], "Même modèle, autre série", project=self.b["id"])
        self.assertEqual(self.engine.run(other["run"])["parameters"]["series"], "17.0")
        # Policy checks must see effective parameters, even outside a conversation.
        module_graph = {"schema": 1, "id": "module", "title": "Module", "domain": "odoo", "parameters": {"series": "19.0"},
                        "nodes": [{"id": "work", "title": "Développer", "kind": "agent", "profile": "odoo-developer"}], "edges": []}
        with self.assertRaisesRegex(ContractError, "Online"):
            self.engine.start(self.b["id"], module_graph, parameters={"platform": "online", "route": "module"})
        with self.assertRaisesRegex(ContractError, "Online"):
            self.engine.start(self.b["id"], module_graph, parameters={"platform": "online", "route": "studio"})
        # A module workflow cannot inherit the source project's hosting on an Online target.
        self.engine.project_series(self.b["id"], "17.0", platform="online")
        with self.assertRaisesRegex(ContractError, "Online"):
            self.service.add(transverse["id"], "Module incompatible", project=self.b["id"])
        # Even an explicit route label cannot disguise a Python developer on Online.
        with self.assertRaisesRegex(ContractError, "Online"):
            self.engine.start(self.b["id"], graph, parameters={"platform": "online", "route": "studio"})
        qa = {"schema": 1, "id": "qa", "title": "Recette", "domain": "odoo", "parameters": {"series": "19.0"}, "nodes": [{"id": "qa", "kind": "agent", "title": "QA", "profile": "odoo-tester"}], "edges": []}
        conversation = self.service.open(self.a["id"], qa, "codex")
        item = self.service.add(conversation["id"], "Recette")
        with self.assertRaisesRegex(ContractError, "copie locale"):
            self.engine.claim(item["run"], "qa")
        with self.assertRaises(ContractError):
            self.engine.execution_context(item["run"], "qa", {"environment": "production", "neutralized_copy": "fake"})
        self.engine.execution_context(item["run"], "qa", {"environment": "local", "neutralized_copy": "synthetic-qa"})
        claim = self.engine.claim(item["run"], "qa")
        self.assertIn("profile_text", claim["node"])

    def test_native_provider_question_is_persisted_without_accepting_missing_outputs(self):
        item = self.add()
        claim = self.engine.claim(item["run"], "analyse")
        run = self.engine.submit(item["run"], "analyse", claim["token"], {"ok": True, "summary": "Précision nécessaire", "question": "Quel cas ?", "outputs": {}})
        self.assertEqual(run["nodes"]["analyse"]["status"], "waiting_input")
        self.assertNotIn("receipt", run["nodes"]["analyse"])

    def test_rejected_upstream_work_does_not_release_dependent_task(self):
        graph = {"schema": 1, "id": "gate", "title": "Réception", "nodes": [{"id": "gate", "title": "Recevoir", "kind": "decision"}], "edges": []}
        c = self.service.open(self.a["id"], graph, "codex")
        first = self.service.add(c["id"], "Amont")
        second = self.service.add(c["id"], "Aval", depends_on=[first["id"]])
        gate = self.engine.run(first["run"])["nodes"]["gate"]
        self.engine.decide(first["run"], "gate", gate["nonce"], gate["proposal"], "reject", human=True)
        self.service.snapshot(c["id"])
        self.assertEqual(self.engine.run(second["run"])["status"], "paused")
        with self.assertRaisesRegex(ContractError, "refusées"):
            self.engine.control(second["run"], "resume")


if __name__ == "__main__":
    unittest.main()

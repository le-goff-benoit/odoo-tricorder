"""Workflow tool execution with immutable bindings and durable effect receipts."""

import copy
import json
import time

from .effects import Effects, matching_messages
from .local_tools import approved, exchange
from .providers import redact
from workflow_engine.contracts import digest, require


def execute_tool(engine, run, node, token):
    project = engine.project(run["project"])
    binding = node["capabilities"][0]
    record = approved(engine, project, binding["plugin"])
    require(record == run["transports"][binding["plugin"]], "Transport modifié depuis le lancement : nouvelle exécution requise")
    effect = record["operations"][binding["operation"]]
    inputs = run["nodes"][node["id"]].get("inputs", {})

    def check():
        require(engine.run(run["id"])["status"] != "cancelled", "Exécution annulée")
        engine.heartbeat(run["id"], node["id"], token)

    def invoke(arguments, key=None):
        description = exchange(record["config"], {"protocol": "tricorder.tool/1", "action": "describe"}, check=check, timeout=8)
        require(description.get("connected") is True and description.get("identity") == record["identity"] and description.get("operations") == record["operations"], "Compte ou capacités du transport modifiés : vérifier à nouveau la connexion")
        response = exchange(record["config"], {"protocol": "tricorder.tool/1", "action": "call", "operation": binding["operation"],
                            "arguments": arguments, "idempotency_key": key, "expected_identity": record["identity"]}, check=check)
        require(response.get("identity") == record["identity"], "La réponse provient d’une autre connexion")
        require(response.get("ok") is True, "L’outil a signalé un échec ; résultat externe à vérifier avant reprise")
        require(isinstance(response.get("outputs"), dict), "Sorties structurées de l’outil absentes")
        return response

    arguments = {"parameters": node.get("parameters", run["parameters"]), "inputs": inputs}
    if node["kind"] == "watch":
        since = run.get("occurrence", {}).get("since", run["created"])
        arguments.update(account=node["account"], sender=node["sender"], since=since)
        response = invoke(arguments)
        messages = response["outputs"].get("messages")
        require(isinstance(messages, list) and len(messages) <= 1000 and all(isinstance(m, dict) for m in messages), "Liste de messages bornée requise (1 000 maximum)")
        def consumed(message):
            key = digest({"project": run["project"], "workflow": run.get("occurrence", {}).get("schedule", run["original"]["id"]),
                          "node": node["id"], "account": node.get("account"), "message": message["id"]})
            with engine.store.connect() as db:
                return bool(db.execute("SELECT 1 FROM consumed_messages WHERE id=?", (key,)).fetchone())
        matches = [m for m in matching_messages(messages, node["sender"], since) if not consumed(m)]
        matches.sort(key=lambda m: (m["received"], m["id"]))
        message = copy.deepcopy(matches[0]) if matches else {}
        if message:
            message["account"] = node["account"]
        outputs = {"match": "yes" if message else "no", "message": message}
        summary = "Nouveau message correspondant détecté." if message else "Aucun nouveau message correspondant."
    elif effect in {"notify", "write"}:
        if effect == "notify":
            require(run.get("notifications_authorized"), "Notification non autorisée pour cette révision")
            message = inputs.get("message", {})
            require(isinstance(message, dict), "Message source invalide")
            content = node.get("template", "")
            # Deliberately no expression evaluation or arbitrary template access.
            for field in ("sender", "subject", "id"):
                content = content.replace("{" + field + "}", str(message.get(field, "")))
            require(content.strip() and node.get("recipient"), "Contenu et destinataire requis")
            operation = {"action": binding["operation"], "plugin": binding["plugin"], "target": node["recipient"], "content": content}
            event = digest({"account": message.get("account"), "message": message.get("id")}) if message.get("id") else run["id"] + ":" + node["id"]
        else:
            decision = run["nodes"][node["approval"]].get("decision", {})
            require(decision.get("outcome") == "approve" and decision.get("operation") == digest(node["operation"]) and decision.get("consumed") == node["id"], "Accord externe absent ou périmé")
            operation = {**node["operation"], "plugin": binding["plugin"], "tool": binding["operation"]}
            event = run["id"] + ":" + node["id"]
        operation["connection"] = {"context": run["project"], "identity": record["identity"], "descriptor": record["descriptor"]}
        def send(op, key):
            response = invoke(op, key)
            receipt = response.get("receipt")
            require(isinstance(receipt, dict) and isinstance(receipt.get("id"), str) and receipt["id"], "Accusé de réception distant absent")
            return {**receipt, "outputs": response["outputs"]}
        ledger = Effects(engine.store).perform(operation, {"approved": True, "operation": digest(operation)}, event, send)
        require(ledger["status"] == "sent", "Résultat externe incertain : aucune répétition automatique ; réconciliation nécessaire")
        outputs = ledger["receipt"]["outputs"]
        summary = "Opération exécutée ; accusé de réception distant enregistré."
        response = {"receipt": ledger["receipt"], "effect_id": ledger["id"]}
    else:
        response = invoke(arguments)
        outputs = response["outputs"]
        summary = "Lecture effectuée par l’adaptateur local."
    proof = redact(json.dumps({"plugin": binding["plugin"], "operation": binding["operation"], "outputs": outputs,
                              "receipt": response.get("receipt"), "at": time.time()}, ensure_ascii=False))
    return {"ok": True, "summary": summary, "outputs": outputs, "evidence": [engine.artifact(proof.encode())],
            "receipt": response.get("receipt"), "tool": binding}

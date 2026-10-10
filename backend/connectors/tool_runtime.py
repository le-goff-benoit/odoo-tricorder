"""Workflow tool execution with immutable bindings and durable effect receipts."""

import copy
import json
import time

from .effects import Effects, matching_messages
from .local_tools import approved, exchange
from .providers import redact
from workflow_engine.launch_fields import execution_parameters
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
        from workflow_engine.associated_actions import check_current
        check_current(engine, run)
        engine.heartbeat(run["id"], node["id"], token)

    from workflow_engine.recovery import tracked_argv
    check.launch = lambda argv: tracked_argv(engine, run["id"], node["id"], token, argv)

    def invoke(arguments, key=None):
        check()
        description = exchange(record["config"], {"protocol": "tricorder.tool/1", "action": "describe"}, check=check, timeout=8)
        require(description.get("connected") is True and description.get("identity") == record["identity"] and description.get("operations") == record["operations"] and description.get("tool_digest") == record.get("tool_digest"), "Compte ou capacités du transport modifiés : vérifier à nouveau la connexion")
        check()
        response = exchange(record["config"], {"protocol": "tricorder.tool/1", "action": "call", "operation": binding["operation"],
                            "arguments": arguments, "idempotency_key": key, "expected_identity": record["identity"], "expected_tool_digest": record.get("tool_digest")}, check=check)
        require(response.get("identity") == record["identity"], "La réponse provient d’une autre connexion")
        require(response.get("ok") is True, "L’outil a signalé un échec ; résultat externe à vérifier avant reprise")
        require(isinstance(response.get("outputs"), dict), "Sorties structurées de l’outil absentes")
        return response

    arguments = {"parameters": execution_parameters(run["parameters"], node.get("parameters")), "inputs": inputs}
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
            event = (digest({"account": message.get("account"), "message": message.get("id")})
                     if message.get("id") and not run.get("associated_with") else run["id"] + ":" + node["id"])
        else:
            decision = run["nodes"][node["approval"]].get("decision", {})
            require(decision.get("outcome") == "approve" and decision.get("operation") == digest(run["nodes"][node["id"]].get("operation", node["operation"])) and decision.get("consumed") == node["id"], "Accord externe absent ou périmé")
            operation = {**run["nodes"][node["id"]].get("operation", node["operation"]), "plugin": binding["plugin"], "tool": binding["operation"]}
            event = run["id"] + ":" + node["id"]
        operation["connection"] = {"context": run["project"], "identity": record["identity"], "descriptor": record["descriptor"]}
        def send(op, key):
            response = invoke(op, key)
            receipt = response.get("receipt")
            require(isinstance(receipt, dict) and isinstance(receipt.get("id"), str) and receipt["id"], "Accusé de réception distant absent")
            return {**receipt, "outputs": response["outputs"]}
        check()
        ledger = Effects(engine.store).perform(operation, {"approved": True, "operation": digest(operation)}, event, send)
        if ledger["status"] != "sent":
            return {"ok": False, "summary": "Résultat externe incertain : aucune répétition automatique ; rechercher l’accusé distant.", "effect_id": ledger["id"], "outputs": {}, "evidence": [engine.artifact(json.dumps(ledger, ensure_ascii=False).encode())]}
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


def reconcile_effect(engine, run_id, node_id, *, human=False):
    require(human, "Réconciliation réservée à l’interface humaine")
    run = engine.run(run_id)
    state = run['nodes'][node_id]
    effect_id = state.get('result', {}).get('effect_id')
    require(state['status'] == 'returned' and effect_id and run['status'] in {'active', 'paused'}, 'Aucun effet incertain à réconcilier')
    node = next(n for n in run['definition']['nodes'] if n['id'] == node_id)
    binding = node['capabilities'][0]
    record = approved(engine, engine.project(run['project']), binding['plugin'])
    require(record == run['transports'][binding['plugin']], 'Transport modifié depuis le lancement')
    operation = node.get('reconciliation')
    require(operation and record['operations'].get(operation) == 'read', 'Déclarer une capacité de lecture reconciliation dans le bloc pour rechercher l’accusé distant')
    with engine.store.connect() as db:
        ledger = engine.store.body(db.execute('SELECT body FROM effects WHERE id=?', (effect_id,)).fetchone())
    require(ledger, 'Effet absent du journal')
    response = exchange(record['config'], {'protocol':'tricorder.tool/1','action':'call','operation':operation,
        'arguments':{'effect_id':effect_id,'operation':ledger['operation']},'expected_identity':record['identity'],
        'expected_tool_digest':record.get('tool_digest'),'idempotency_key':None})
    require(response.get('identity') == record['identity'] and response.get('ok') is True, 'Lecture distante non confirmée')
    observed = response.get('outputs', {})
    require(observed.get('effect_id') == effect_id and observed.get('status') == 'sent', 'Résultat distant toujours inconnu : aucune répétition autorisée')
    receipt = observed.get('receipt', {})
    require(isinstance(receipt, dict) and isinstance(receipt.get('id'), str) and receipt['id'], 'Accusé distant requis')
    require(isinstance(observed.get('outputs'), dict), 'Sorties distantes requises')
    proof = engine.artifact(redact(json.dumps(observed,ensure_ascii=False)).encode())
    return engine.reconcile_effect(run_id, node_id, effect_id, {**receipt,'outputs':observed['outputs']}, proof)

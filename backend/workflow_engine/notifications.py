"""Question notifications are explicit, separately tracked workflow executions."""
import copy

from .contracts import require


def notification_node(graph):
    config = graph.get("on_question")
    if config is None:
        return None
    require(isinstance(config, dict) and set(config) == {"plugin", "operation", "recipient"},
            "Notification de question : plugin, operation et recipient requis")
    require(isinstance(config["recipient"], str) and 0 < len(config["recipient"].strip()) <= 500,
            "Destinataire de notification requis")
    return {"id": "question-notification", "kind": "communication", "title": "Signaler une question en attente",
            "recipient": config["recipient"], "template": "Une question attend votre réponse dans Tricorder : {subject}",
            "capabilities": [{"plugin": config["plugin"], "operation": config["operation"]}],
            "validation": "automatic"}


def execution_nodes(graph):
    node = notification_node(graph)
    return graph["nodes"] + ([node] if node else [])


def queue_question(engine, db, run, node_id, question):
    node = notification_node(run["definition"])
    if not node or question.get("notification"):
        return
    if run["simulation"]:
        question["notification"] = {"status": "simulated"}
        return
    try:
        from connectors.local_tools import approved
        require(run.get("notifications_authorized"), "Notification non autorisée")
        binding = node["capabilities"][0]
        # An existing run's authorization does not cover a changed connection.
        require(approved(engine, engine.project(run["project"], db), binding["plugin"]) == run["transports"].get(binding["plugin"]),
                "Connexion modifiée depuis le lancement")
        node = copy.deepcopy(node)
        # Only the workflow title is sent, not a customer's potentially sensitive question.
        node["template"] = "Une question attend votre réponse dans Tricorder : " + run["definition"]["title"] + " (" + run["id"] + ")."
        child = engine.start(run["project"], {"schema": 1, "id": "question-notification", "title": "Question · " + run["definition"]["title"], "nodes": [node], "edges": []},
                             parameters={"source_run": run["id"], "source_node": node_id, "source_question": question["id"]},
                             connection=db, notifications_authorized=True)
        question["notification"] = {"status": "queued", "run": child["id"]}
    except (ValueError, OSError) as error:
        # A notification outage must not lose the question or release its block.
        question["notification"] = {"status": "blocked", "reason": str(error)}
    engine._event(db, run, "question-notification", node_id, notification=question["notification"])

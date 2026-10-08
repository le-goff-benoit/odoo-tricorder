"""Small reusable examples. Simulated runs are explicitly identified by the engine."""

import copy


def node(nid, title, kind="task", x=70, y=100, **extra):
    return {"id": nid, "title": title, "kind": kind, "position": {"x": x, "y": y}, **extra}


def edge(source, target, outcome="done"):
    return {"id": f"{source}-{target}", "from": source, "to": target, "outcome": outcome}


def templates():
    demo = {"schema": 1, "id": "first-workflow", "title": "De l'intention au résultat", "description": "Un exemple simulé pour découvrir les branches, la validation et les décisions humaines.", "parameters": {}, "nodes": [
        node("analyse", "Comprendre la demande", x=50, y=140, phase="Analyse", criteria=["Le résultat attendu est compréhensible."], sample="Intention clarifiée : proposer une évolution et ses critères de réussite.", max_attempts=2),
        node("build", "Préparer la réalisation", x=350, y=60, phase="Réalisation", sample="Proposition de réalisation préparée. Aucun code de projet n'a été modifié."),
        node("test", "Préparer les tests", x=350, y=250, phase="Qualité", sample="Scénarios de test proposés. Aucun test métier n'a été exécuté."),
        node("join", "Réunir les résultats", "join", x=650, y=140, phase="Validation"),
        node("decision", "Valider la suite", "decision", x=950, y=140, phase="Validation", question="Les deux résultats sont prêts. Souhaitez-vous préparer le bilan ?", options=["approve", "reject"]),
        node("bilan", "Préparer le bilan", "document", x=1250, y=140, phase="Documentation", sample="Bilan de démonstration : branches reçues et décision humaine conservée.")
    ], "edges": [edge("analyse", "build"), edge("analyse", "test"), edge("build", "join"), edge("test", "join"), edge("join", "decision"), edge("decision", "bilan", "approve")]}
    local = {"schema": 1, "id": "local-check", "title": "Commande locale avec validation", "description": "Une vraie commande isolée, puis examen du résultat. Pas de réseau, projet en lecture seule.", "nodes": [
        node("check", "Vérifier le runtime Python", "command", argv=["python3", "-c", "import sys; print('Python opérationnel'); print(sys.version.split()[0])"], criteria=["Le runtime répond et sa version est visible."], evidence_required=True, max_attempts=2),
        node("decision", "Décider de la suite", "decision", x=400, question="Le contrôle est reçu. Terminer cette vérification ?", options=["approve", "reject"])
    ], "edges": [edge("check", "decision")]}
    software = copy.deepcopy(demo)
    software.update(id="software-change", title="Évolution logicielle", description="Analyse, développement, test et validation ; configurer les modèles avant une exécution réelle.")
    for n in software["nodes"]:
        if n["id"] in {"analyse", "build", "test"}:
            n.update(kind="agent", provider="codex", profile="generalist", model="", effort="medium", session="delegated", prompt=n["title"])
    components = []
    for nid, title, kind in [("orchestration", "Orchestration", "join"), ("analysis", "Analyse", "agent"), ("development", "Développement", "agent"), ("quality", "Tests", "agent"), ("documentation", "Gestion documentaire", "document"), ("communication", "Communication", "document")]:
        components.append({"schema": 1, "id": nid, "title": title, "description": "Composant réutilisable à adapter au projet.", "nodes": [node("work", title, kind, prompt=title)], "edges": []})
    mail = {"schema": 1, "id": "mail-notification", "title": "Message NECA → notification", "description": "Brouillon : détecter les nouveaux messages d'un expéditeur confirmé, puis notifier le destinataire choisi. Aucun modèle IA nécessaire pour un filtre exact.", "nodes": [
        node("mail", "Repérer un nouveau message NECA", "watch", x=60, y=100, connection="gmail", account="", sender="", outputs={"match": "string", "message": "object"}, sample_outputs={"match": "yes", "message": {"id": "demo-message", "subject": "Exemple NECA", "sender": "demo@example.test"}}, criteria=["Le message appartient au périmètre de l'expéditeur confirmé."], sample="Message synthétique NECA. Aucun email réel consulté."),
        node("filter", "Un nouveau message correspond ?", "condition", x=370, y=100, parameter="match", options=["yes", "no"], inputs={"match": "string", "message": "object"}, outputs={"message": "object"}),
        node("notify", "Prévenir le destinataire", "communication", x=680, y=100, channel="slack", recipient="", template="Nouveau message de {sender} : {subject}", inputs={"message": "object"}, sample="Notification simulée. Aucun message envoyé.", criteria=["Le destinataire et le contenu correspondent au périmètre autorisé."])
    ], "edges": [{**edge("mail", "filter"), "mapping": {"match": "match", "message": "message"}}, {**edge("filter", "notify", "yes"), "mapping": {"message": "message"}}]}
    return [demo, local, software, mail, *components]

"""Small reusable examples. Simulated runs are explicitly identified by the engine."""


def node(nid, title, kind="task", x=70, y=100, **extra):
    return {"id": nid, "title": title, "kind": kind, "position": {"x": x, "y": y}, **extra}


def edge(source, target, outcome="done"):
    return {"id": f"{source}-{target}", "from": source, "to": target, "outcome": outcome}


def templates():
    demo = {"schema": 1, "id": "first-workflow", "title": "De la demande au résultat", "description": "Un exemple simulé pour découvrir les branches, la validation et les décisions humaines.", "parameters": {}, "nodes": [
        node("analyse", "Comprendre la demande", x=50, y=140, phase="Analyse", criteria=["Le résultat attendu est compréhensible."], sample="Demande clarifiée : proposer une évolution et ses critères de réussite.", max_attempts=2),
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
    software = {"schema": 1, "id": "software-change", "title": "Évolution logicielle", "description": "Analyser, proposer du code dans une copie isolée, tester cette copie et décider de son application locale. Choisir les modèles et adapter la commande de test au projet.", "nodes": [
        node("analyse", "Analyser la demande", "agent", x=60, model="", prompt="Décrire le changement et les critères attendus.", outputs={"analysis":"string"}, sample_outputs={"analysis": "Exemple d’analyse du changement ; aucun code modifié."}),
        node("build", "Proposer les modifications", "agent", x=370, model="", execution_mode="edit", prompt="Réaliser la demande dans la copie isolée. Ne pas prétendre avoir exécuté les tests.", inputs={"analysis":"string"}, outputs={"candidate":"object"}, sample_outputs={"candidate": {"simulation": True, "summary": "Exemple de candidat, sans diff applicable au projet."}}, criteria=["Le diff réalise la demande sans changement hors périmètre."]),
        node("test", "Tester la copie modifiée", "command", x=680, inputs={"candidate":"object"}, candidate_check=True, argv=["python3", "-B", "-m", "unittest", "discover", "-s", "/project/tests"], criteria=["Les tests pertinents sont présents, exécutés et réussis."], evidence_required=True),
        node("decision", "Décider de l’application du code", "decision", x=990, question="Les tests sont reçus. Examiner le diff du bloc Développement et appliquer au dépôt local si le résultat convient.")
    ], "edges": [{**edge("analyse","build"), "mapping":{"analysis":"analysis"}}, {**edge("build","test"), "mapping":{"candidate":"candidate"}}, edge("test","decision")]}
    components = []
    for nid, title, kind in [("orchestration", "Orchestration", "join"), ("analysis", "Analyse", "agent"), ("development", "Développement", "agent"), ("quality", "Tests", "agent"), ("documentation", "Gestion documentaire", "document"), ("communication", "Communication", "document")]:
        components.append({"schema": 1, "id": nid, "title": title, "description": "Composant réutilisable à adapter au projet.", "nodes": [node("work", title, kind, prompt=title)], "edges": []})
    mail = {"schema": 1, "id": "mail-notification", "title": "Nouveau message → notification", "description": "Brouillon : détecter les nouveaux messages d'un expéditeur confirmé, puis notifier le destinataire choisi. Aucun modèle IA nécessaire pour un filtre exact.", "nodes": [
        node("mail", "Repérer un nouveau message", "watch", x=60, y=100, connection="gmail", account="", sender="", outputs={"match": "string", "message": "object"}, sample_outputs={"match": "yes", "message": {"id": "demo-message", "subject": "Exemple de message", "sender": "demo@example.test"}}, criteria=[], validation="automatic", sample="Message synthétique. Aucun email réel consulté."),
        node("filter", "Un nouveau message correspond ?", "condition", x=370, y=100, parameter="match", options=["yes", "no"], inputs={"match": "string", "message": "object"}, outputs={"message": "object"}),
        node("notify", "Prévenir le destinataire", "communication", x=680, y=100, channel="slack", recipient="", template="Nouveau message de {sender} : {subject}", inputs={"message": "object"}, sample="Notification simulée. Aucun message envoyé.", criteria=[], validation="automatic")
    ], "edges": [{**edge("mail", "filter"), "mapping": {"match": "match", "message": "message"}}, {**edge("filter", "notify", "yes"), "mapping": {"message": "message"}}]}
    deployment = {"schema": 1, "id": "github-odoo-deployment", "title": "GitHub → Odoo.sh : staging puis production",
        "description": "Configurer les cibles, le SHA testé et les adaptateurs. Publication GitHub, build Odoo.sh et vérification de la version déployée restent distincts. La documentation est facultative.",
        "domain": "odoo", "parameters": {"series": "", "documentation": "skip"}, "nodes": [], "edges": []}
    for index, environment in enumerate(("staging", "production")):
        offset = index * 700
        op = {"action": "publish-candidate", "target": "DEPOT_BRANCHE_A_CONFIRMER_" + environment, "candidate": "SHA_TESTE_A_CONFIRMER"}
        gate = environment + "-approval"
        publish = environment + "-publish"
        verify = environment + "-verify"
        deployment["nodes"] += [
            node(gate, "Autoriser la publication vers " + environment, "decision", x=60 + offset, y=100, operation=op,
                 question="Vérifier le dépôt, la branche, le SHA testé et le retour arrière avant publication.", options=["approve", "reject"]),
            node(publish, "Publier le candidat GitHub · " + environment, "external", x=310 + offset, y=100, operation=op, approval=gate,
                 criteria=["Le SHA publié correspond au candidat testé et à la branche autorisée."], evidence_required=True),
            node(verify, "Vérifier build et version Odoo.sh · " + environment, "document", x=560 + offset, y=100,
                 criteria=["Le build réussi porte le SHA publié.", "La version effectivement déployée et les contrôles de santé correspondent à la cible."], evidence_required=True)
        ]
        deployment["edges"] += [edge(gate, publish, "approve"), edge(publish, verify)]
        if index:
            deployment["edges"].append(edge("staging-verify", gate))
    deployment["nodes"] += [node("docs-choice", "Préparer la documentation ?", "condition", x=1650, y=100, parameter="documentation", options=["prepare", "skip"]),
                            node("docs", "Préparer les notes de release", "document", x=1950, y=100, criteria=["Le document décrit les changements livrés et les limites restantes."], evidence_required=True)]
    deployment["edges"] += [edge("production-verify", "docs-choice"), edge("docs-choice", "docs", "prepare")]
    publication = {"action": "update-page", "target": "ESPACE_PAGE_A_CONFIRMER", "candidate": "CONTENU_VERSION_A_CONFIRMER",
                   "page": "", "space": "", "base_version": 0, "title": "", "body": ""}
    confluence = {"schema": 1, "id": "confluence-publication", "title": "Documentation → Confluence", "description": "Préparer le contenu et la version de base, relire, publier après accord exact, puis relire la page distante. Configurer un adaptateur Confluence avec contrôle de version.",
        "nodes": [node("draft", "Préparer la documentation", "document", x=60, criteria=["La demande, les changements et les tests sont lisibles."]),
                  node("approve", "Autoriser la mise à jour Confluence", "decision", x=360, operation=publication, options=["approve", "reject"]),
                  node("publish", "Publier la version relue", "external", x=660, operation=publication, approval="approve", evidence_required=True, criteria=["La version de base n’a pas changé ; le service a accepté la nouvelle version."]),
                  node("verify", "Relire la page publiée", "document", x=960, evidence_required=True, criteria=["Espace, page, version et contenu correspondent à la proposition autorisée."])],
        "edges": [edge("draft", "approve"), edge("approve", "publish", "approve"), edge("publish", "verify")]}
    import copy
    direct = copy.deepcopy(deployment)
    direct.update(id="direct-production", title="Livraison directe en production", description="Parcours sans staging imposé : candidat testé, accord exact, publication et version observée. Configurer la cible et le connecteur avant lancement.")
    direct["nodes"] = [n for n in direct["nodes"] if not n["id"].startswith("staging-")]
    kept = {n["id"] for n in direct["nodes"]}
    direct["edges"] = [e for e in direct["edges"] if e["from"] in kept and e["to"] in kept]
    from .work_templates import templates as work_templates
    return [demo, local, software, *work_templates(), mail, deployment, direct, confluence, *components]

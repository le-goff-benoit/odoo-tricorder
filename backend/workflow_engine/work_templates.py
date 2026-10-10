"""Editable work contracts for native conversations; no delivery target is invented."""
from .library import node, edge


def templates():
    def work(nid, title, profile="generalist", **extra):
        return node(nid, title, "agent", profile=profile, validation="contract", max_attempts=2,
                    prompt=extra.pop("prompt", title), **extra)

    support = {"schema": 1, "id": "support-conversation", "title": "Support — diagnostic et réponse",
               "description": "Distinguer la nature de la demande et son urgence, préciser les faits manquants puis préparer une réponse pour Gmail ou un ticket Odoo. Aucun message envoyé.",
               "launch_fields": [
                   {"key": "support_facts", "label": "Faits et exemple du problème", "type": "text", "required": False, "help": "Comportement observé, résultat attendu et exemple concret. Vous pouvez aussi les décrire dans la demande."},
                   {"key": "support_impact", "label": "Impact et urgence", "type": "text", "required": False, "help": "Qui est touché, quel travail est bloqué, depuis quand, quel contournement et quelle échéance ? Laissez les inconnues à préciser."},
                   {"key": "support_destination", "label": "Destination de la réponse", "type": "choice", "required": False, "options": ["Texte pour un ticket Odoo", "Brouillon d’email"], "help": "Préparation du texte uniquement. Aucun envoi ni brouillon distant créé par ce choix."}
               ],
               "nodes": [
                   work("diagnosis", "Analyser la demande et son urgence", route_output="severity", options=["critical", "normal", "unknown"],
                        outputs={"severity": "string", "finding": "string", "next_action": "string"},
                        prompt="Lire la demande initiale et les paramètres support_facts, support_impact et support_destination lorsqu’ils sont renseignés. Ne redemander que les précisions manquantes ou contradictoires. Dans le constat, distinguer la nature (bug suspecté, question d’utilisation, évolution ou indéterminée) de l’urgence. Décrire faits, personnes touchées, travail bloqué, contournement et inconnues. Classer l’urgence : urgent si elle est établie, sans urgence établie sinon (un bug reste possible), à préciser si l’impact manque. Justifier la qualification. Aucun correctif ou envoi implicite."),
                   work("urgent", "Préparer la réponse urgente", x=400, y=40, inputs={"finding": "string", "next_action": "string"}, outputs={"proposal": "string"},
                        prompt="À partir du constat reçu, préparer la réponse urgente et les prochaines investigations. Distinguer urgence, nature de la demande et risque. Expliquer les mesures proposées et leurs contrôles ; ne pas les présenter comme réalisées. Si un changement est proposé, préciser son périmètre et son retour arrière. Ne pas corriger, déployer ni envoyer."),
                   work("normal", "Préparer la réponse sans urgence établie", x=400, y=230, inputs={"finding": "string", "next_action": "string"}, outputs={"draft": "string"},
                        prompt="Préparer une réponse compréhensible à partir du constat et des prochaines investigations. Sans urgence établie ne signifie pas absence de bug. Expliquer les faits, les inconnues et la suite utile. Diagnostic, correction et livraison restent distincts. Ne pas envoyer."),
                   node("clarify", "Préciser ce qui est bloqué", "question", x=400, y=450,
                        question="Qui est touché, quelle tâche est bloquée et depuis quand ? Existe-t-il un contournement ou une échéance proche ? Indiquez ce que vous savez ; les autres points peuvent rester à préciser.", outputs={"answer": "string"}),
                   work("reassess", "Réévaluer l’urgence avec les faits reçus", x=760, y=450, inputs={"answer": "string"}, outputs={"severity": "string", "finding": "string", "next_action": "string"}, route_output="severity", options=["critical", "normal", "unknown"],
                        prompt="Relire la demande initiale et la précision reçue. Distinguer la nature (bug suspecté, question, évolution, indéterminée) et l’urgence dans le constat. Classer l’urgence : urgent si elle est établie, sans urgence établie sinon (un bug reste possible), à préciser si les faits restent insuffisants. Conserver les inconnues et justifier la prochaine investigation."),
                   node("unresolved", "Choisir l’investigation manquante", "question", x=1120, y=450, completion_outcome="blocked",
                        question="Les faits ne suffisent pas à conclure. Quelle investigation faut-il ouvrir : reproduire le problème, obtenir un exemple ou contacter une personne concernée ? Cette exécution se terminera avec un diagnostic non résolu.", outputs={"answer": "string"}),
                   work("destination", "Reprendre la destination de la réponse", x=1120, y=100,
                        prompt="Lire aussi support_destination dans les paramètres de cette demande. Relire la demande initiale et les précisions déjà reçues. Si la destination est explicite (email ou brouillon Gmail, ticket ou message Odoo), la reprendre sans poser à nouveau la question. Restituer cette destination dans la réponse de cette étape. Si elle manque ou se contredit, demander avec ask : souhaitez-vous un texte pour un email ou pour un ticket Odoo ? Ne demander destinataire et ton que s’ils sont indispensables. Aucun message créé ni envoyé.", outputs={"answer": "string"}),
                   work("response", "Mettre la réponse au format choisi", x=1500, y=100,
                        inputs={"response": "string", "destination": "string"}, outputs={"draft": "string"},
                        prompt="Adapter la réponse préparée à la destination choisie. Pour Gmail, fournir objet et corps prêts à reprendre dans un brouillon ; pour un ticket Odoo, fournir le texte à coller. Si la destination n’est pas claire, demander une précision avec ask. Conserver faits, inconnues et suite utile. Ne pas prétendre qu’un brouillon Gmail ou un message Odoo a été créé. Aucun envoi, publication ou connexion externe implicite."),
               ], "edges": [
                   {**edge("diagnosis", "urgent", "critical"), "mapping": {k: k for k in ("finding", "next_action")}},
                   {**edge("diagnosis", "normal", "normal"), "mapping": {k: k for k in ("finding", "next_action")}},
                   edge("diagnosis", "clarify", "unknown"), {**edge("clarify", "reassess"), "mapping": {"answer": "answer"}},
                   {**edge("reassess", "urgent", "critical"), "mapping": {k: k for k in ("finding", "next_action")}},
                   {**edge("reassess", "normal", "normal"), "mapping": {k: k for k in ("finding", "next_action")}},
                   edge("reassess", "unresolved", "unknown"),
                   edge("urgent", "destination"), edge("normal", "destination"),
                   {**edge("urgent", "response"), "mapping": {"proposal": "response"}},
                   {**edge("normal", "response"), "mapping": {"draft": "response"}},
                   {**edge("destination", "response"), "mapping": {"answer": "destination"}},
               ]}
    release = {"schema": 1, "id": "release-conversation", "title": "Release — demandes, plan, réalisation et validation",
               "description": "Votre parcours de release dans une conversation : recueil, plan, travail, contrôles et préparation de livraison. Chaque demande garde ses preuves.",
               "nodes": [
                   work("intent", "Analyser la demande", outputs={"intent": "string"}, prompt="Clarifier parameters.request, ses critères, risques, inconnues et périmètre. Poser les questions manquantes. Ne pas développer pendant le recueil."),
                   work("plan", "Préparer le plan", x=360, inputs={"intent": "string"}, outputs={"plan": "string"}, prompt="Préparer un plan proportionné, critères, dépendances, risques, étapes et méthode de vérification. L’express convient seulement à un défaut précis, réversible, sans droits, schéma, données ou calcul financier."),
                   node("scope", "Valider le plan", "decision", x=660, inputs={"plan": "string"}, outputs={"plan": "string"}, question="Le plan et le périmètre affichés conviennent-ils ?", options=["approve", "reject"]),
                   work("work", "Réaliser le périmètre accepté", x=960, inputs={"plan": "string"}, outputs={"result": "string"}, prompt="Relire le plan accepté dans l’exécution. Réaliser uniquement le périmètre autorisé dans le projet de la tâche. Respecter sa série et ses règles ; préserver les travaux existants. Remettre les preuves des modifications."),
                   work("check", "Vérifier le résultat", x=1260, inputs={"result": "string"}, outputs={"verdict": "string", "evidence_summary": "string"}, evidence_required=True,
                        prompt="Exécuter les contrôles pertinents, comparer au résultat métier attendu et fournir les preuves réelles. Pour Odoo : copie locale neutralisée, jamais tests en production. verdict vaut pass ou fail ; un contrôle non exécuté n’est pas pass."),
                   node("quality", "Les contrôles passent-ils ?", "condition", x=1560, parameter="verdict", options=["pass", "fail"], inputs={"verdict": "string", "evidence_summary": "string"}, outputs={"evidence_summary": "string"}),
                   work("delivery", "Préparer la livraison et le bilan", x=1860, inputs={"evidence_summary": "string"}, outputs={"proposal": "string"}, prompt="Préparer candidat exact, cible, preuves, limites et retour arrière. Consolider le bilan dans le document de release existant. Sans opération externe configurée et accord exact, rester à une proposition de livraison."),
                   node("receipt", "Valider les résultats", "decision", x=2160, inputs={"proposal": "string"}, question="Le travail, ses preuves et sa proposition de livraison sont-ils validés ?", options=["approve", "reject"]),
                   node("failure", "Décider de la correction", "question", x=1860, y=320, completion_outcome="blocked", question="Les contrôles ont échoué. Quel périmètre de correction souhaitez-vous ouvrir dans une nouvelle tâche ? Cette réponse ne valide pas le travail en échec.", outputs={"answer": "string"}),
               ], "edges": [
                   {**edge("intent", "plan"), "mapping": {"intent": "intent"}}, {**edge("plan", "scope"), "mapping": {"plan": "plan"}}, {**edge("scope", "work", "approve"), "mapping": {"plan": "plan"}},
                   {**edge("work", "check"), "mapping": {"result": "result"}}, {**edge("check", "quality"), "mapping": {"verdict": "verdict", "evidence_summary": "evidence_summary"}},
                   {**edge("quality", "delivery", "pass"), "mapping": {"evidence_summary": "evidence_summary"}}, edge("quality", "failure", "fail"), {**edge("delivery", "receipt"), "mapping": {"proposal": "proposal"}},
               ]}
    meeting = {"schema": 2, "id": "meeting-conversation", "title": "Clôture de réunion",
               "description": "Choisir une ou plusieurs réunions et leurs sources, analyser les décisions et actions, puis préparer le compte rendu et le texte d’email. Les précisions sont demandées seulement si elles manquent ; aucun envoi.",
               "nodes": [
                   work("select", "Choisir les réunions et leurs sources",
                        outputs={"selected_meetings": {"type": "array", "items": "object", "required": True, "minItems": 1}},
                        prompt="Lire la demande initiale. Identifier les réunions visées : titres ou liens précis, ou période avec ses dates. Il peut y avoir plusieurs réunions dans une semaine. Si le périmètre manque, demander avec ask quelles réunions ou quelle période examiner. Utiliser seulement les sources fournies ou réellement accessibles. Si une recherche produit plusieurs réunions et que la sélection est ambiguë, présenter les titres et dates et faire préciser le choix avec ask. Pour chaque réunion sélectionnée, transmettre titre, date si connue, référence de la source, transcription ou notes effectivement lues et limites. Sans source exploitable, demander la transcription ou les notes avec ask ; ne pas inventer de réunion ou d’accès Meeting Minutes."),
                   work("review", "Analyser les réunions sélectionnées", x=450,
                        inputs={"selected_meetings": {"type": "array", "items": "object", "required": True, "minItems": 1}},
                        outputs={"analysis": "string", "actions": "array"},
                        prompt="Analyser les sources des réunions sélectionnées. Présenter les faits et décisions par réunion avec leur provenance ; distinguer décisions, propositions, contradictions et inconnues. Extraire les actions avec responsable et échéance uniquement lorsqu’ils sont explicites ; sinon indiquer à préciser. Poser une question avec ask seulement si une information manque pour produire un résultat utile. Signaler les autres incertitudes dans l’analyse, sans imposer une validation intermédiaire du compte rendu."),
                   work("mail", "Préparer le compte rendu et l’email", x=850,
                        inputs={"analysis": "string", "actions": "array"}, outputs={"minutes": "string", "actions": "array", "draft": "string"},
                        prompt="À partir de l’analyse et des actions reçues, produire un compte rendu fidèle, la liste d’actions et un texte d’email avec objet et corps. Distinguer les différentes réunions et reprendre les sources, décisions et points à préciser. Ne pas inventer de destinataires. Présenter les incertitudes avec le résultat ; demander une précision seulement si elle est indispensable. Aucun email envoyé ni brouillon créé dans Gmail ; une éventuelle publication exige une opération configurée et autorisée séparément."),
               ], "edges": [
                   {**edge("select", "review"), "mapping": {"selected_meetings": "selected_meetings"}},
                   {**edge("review", "mail"), "mapping": {"analysis": "analysis", "actions": "actions"}},
               ]}
    request = {"schema": 1, "id": "request-conversation", "title": "Demande ponctuelle",
               "description": "Clarifier une demande, effectuer le travail et présenter le résultat. Analyse, recherche, document ou autre activité : aucun pack métier requis.",
               "nodes": [
                   work("clarify", "Comprendre le résultat attendu", outputs={"brief": "string"}, prompt="Lire parameters.request. Préciser résultat attendu, sources, contraintes et critères. Poser les questions nécessaires avec ask. Ne pas transformer toute demande en développement ou release."),
                   work("work", "Effectuer le travail demandé", x=390, inputs={"brief": "string"}, outputs={"result": "string"}, prompt="Effectuer le travail décrit dans inputs.brief, dans le périmètre autorisé. Adapter la méthode à la demande : analyse, recherche, document, code ou autre. Fournir sources et limites. Une proposition d'action externe reste une proposition tant que son opération n'est pas autorisée."),
                   node("receipt", "Examiner le résultat", "decision", x=730, inputs={"result": "string"}, question="Le résultat répond-il à la demande et à ses critères ?", options=["approve", "reject"]),
               ], "edges": [{**edge("clarify", "work"), "mapping": {"brief": "brief"}}, {**edge("work", "receipt"), "mapping": {"result": "result"}}]}
    express = {"schema": 1, "id": "express-conversation", "title": "Correction express",
               "description": "Qualifier un défaut local et réversible, corriger et vérifier. Les demandes portant sur droits, données, schéma ou calcul financier sont réorientées.",
               "nodes": [
                   work("qualify", "La correction relève-t-elle de l’express ?", route_output="eligibility", options=["eligible", "broader", "unknown"], outputs={"eligibility": "string", "scope": "string"}, prompt="Qualifier parameters.request. eligible seulement pour un défaut précis, local et réversible, sans schéma, droits, dépendances, données existantes ni calcul financier. broader si l'un de ces périmètres intervient ; unknown si des faits manquent. Ne pas se fier au nom express donné à la demande. scope décrit faits, risque et contrôle attendu."),
                   work("fix", "Corriger le défaut local", x=390, inputs={"scope": "string"}, outputs={"result": "string"}, prompt="Corriger uniquement le défaut qualifié. Préserver les autres travaux. Si un risque exclu est découvert, arrêter la modification et poser une question avec ask. Ne pas déployer."),
                   work("check", "Vérifier la correction", x=720, inputs={"result": "string"}, outputs={"verdict": "string", "evidence_summary": "string"}, route_output="verdict", options=["pass", "fail"], evidence_required=True, prompt="Vérifier le défaut corrigé et la non-régression pertinente, sur une copie locale si nécessaire. Fournir preuves réelles. verdict vaut pass seulement si le contrôle a effectivement réussi, sinon fail."),
                   node("receipt", "Valider la correction", "decision", x=1050, inputs={"evidence_summary": "string"}, question="La correction locale et ses preuves sont-elles validées ?", options=["approve", "reject"]),
                   node("reframe", "Recadrer le travail", "question", x=390, y=330, completion_outcome="blocked", question="Ce périmètre dépasse l’express ou reste incertain. Quelle demande faut-il préciser ou ouvrir avec un workflow adapté ?", outputs={"answer": "string"}),
                   node("failure", "Préciser la reprise nécessaire", "question", x=1050, y=330, completion_outcome="blocked", question="Le contrôle a échoué. Quel travail de correction faut-il ouvrir ? La réponse ne valide pas ce résultat.", outputs={"answer": "string"}),
               ], "edges": [{**edge("qualify", "fix", "eligible"), "mapping": {"scope": "scope"}}, edge("qualify", "reframe", "broader"), {**edge("qualify", "reframe", "unknown"), "id": "qualify-unknown"}, {**edge("fix", "check"), "mapping": {"result": "result"}}, {**edge("check", "receipt", "pass"), "mapping": {"evidence_summary": "evidence_summary"}}, edge("check", "failure", "fail")]}
    for flow, mapping in ((release, {"work": ["edit"], "check": ["shell"]}), (express, {"fix": ["edit"], "check": ["shell"]}), (request, {"work": ["native-tools"]})):
        for step in flow["nodes"]:
            if step["id"] in mapping:
                step["required_capabilities"] = mapping[step["id"]]
    # These are explicit teaching examples, never fallback outputs for an
    # actual executor. The simulator still enforces the same typed contracts.
    examples = {
        "release-conversation": {
            "intent": {"intent": "Exemple : clarifier la demande et ses critères."},
            "plan": {"plan": "Exemple : réaliser le périmètre accepté, puis vérifier le résultat."},
            "work": {"result": "Exemple de résultat ; aucun fichier du projet n’a été modifié."},
            "check": {"verdict": "pass", "evidence_summary": "Exemple de contrôle réussi ; aucun test métier exécuté."},
            "delivery": {"proposal": "Exemple de bilan et de proposition de livraison ; aucune publication effectuée."},
        },
        "support-conversation": {
            "destination": {"answer": "Exemple de destination : texte pour un ticket Odoo. Destination fictive de simulation, sans lecture de la demande ni création de message."},
            "diagnosis": {"severity": "normal", "finding": "Exemple : un utilisateur rencontre un défaut sans interruption du service.", "next_action": "Exemple : préparer la réponse et les investigations."},
            "urgent": {"proposal": "Exemple de traitement urgent à examiner ; aucun correctif ni déploiement effectué."},
            "normal": {"draft": "Exemple de brouillon : nous proposons de vérifier le défaut signalé. Aucun message envoyé."},
            "reassess": {"severity": "normal", "finding": "Exemple : la précision reçue permet de limiter l’impact.", "next_action": "Exemple : préparer une réponse documentée."},
            "response": {"draft": "Exemple de réponse au format choisi. Aucun email envoyé, brouillon Gmail créé ou ticket Odoo modifié."},
        },
        "meeting-conversation": {
            "select": {"selected_meetings": [{"title": "Atelier fictif", "date": "À préciser", "source": "Notes synthétiques de démonstration", "notes": "Le périmètre du prochain atelier reste à confirmer."}]},
            "review": {"analysis": "Exemple : les notes de l’atelier fictif laissent le périmètre à confirmer ; aucune décision définitive.", "actions": [{"action": "Confirmer le périmètre de l’atelier", "owner": "À préciser", "due": "À préciser"}]},
            "mail": {"minutes": "Exemple de compte rendu : le périmètre du prochain atelier reste à confirmer.", "actions": [{"action": "Confirmer le périmètre de l’atelier", "owner": "À préciser", "due": "À préciser"}], "draft": "Exemple de texte d’email : voici le compte rendu et l’action à préciser. Aucun email envoyé ni brouillon Gmail créé."},
        },
        "request-conversation": {
            "clarify": {"brief": "Exemple : préparer une synthèse des informations fournies."},
            "work": {"result": "Exemple de synthèse, à comparer aux critères de la demande."},
        },
        "express-conversation": {
            "qualify": {"eligibility": "eligible", "scope": "Exemple : corriger un libellé local, sans changement de données ni de calcul."},
            "fix": {"result": "Exemple de correction du libellé ; aucun fichier modifié."},
            "check": {"verdict": "pass", "evidence_summary": "Exemple de contrôle réussi ; aucun test métier exécuté."},
        },
    }
    support_criteria = {
        "diagnosis": ["Les faits, l’impact et les inconnues sont distingués.", "La nature de la demande et son urgence sont distinctes ; la prochaine action est justifiée par les sources reçues."],
        "urgent": ["La proposition précise le périmètre, les contrôles et le retour arrière.", "Aucun déploiement n’est présenté comme effectué ou autorisé par le seul diagnostic."],
        "normal": ["Le brouillon explique le constat, les inconnues et la suite proposée.", "Le message reste un brouillon, sans envoi implicite."],
        "reassess": ["La nouvelle qualification tient compte de la précision reçue.", "Les inconnues restantes sont explicites."],
        "response": ["La réponse respecte la destination choisie.", "Aucune création de brouillon externe ni aucun envoi n’est présenté comme effectué."],
    }
    for step in support["nodes"]:
        if step["id"] in support_criteria:
            # Expected business quality, never an assertion that the automatic
            # type/evidence checks have evaluated those criteria.
            step["criteria"] = support_criteria[step["id"]]
    for flow in (release, support, meeting, request, express):
        for step in flow["nodes"]:
            if step["id"] in examples[flow["id"]]:
                step["sample_outputs"] = examples[flow["id"]][step["id"]]
    return [release, support, meeting, request, express, *_collection_templates(work)]


def _collection_templates(work):
    """New versioned models; existing conversations keep their schema-1 graphs."""
    import copy

    intentions = {"type": "array", "items": "object", "required": True, "minItems": 1, "maxItems": 100}
    objects = {"type": "array", "items": "object", "required": True, "maxItems": 100}
    single = {"type": "object", "required": True}
    sample_plan = {"goal": "Préparer le suivi d’une réunion", "tasks": [
        {"id": "R1", "title": "Préparer le compte rendu", "criteria": ["Distinguer les décisions des sujets à confirmer"]},
        {"id": "R2", "title": "Préparer un brouillon d’email", "depends_on": ["R1"], "criteria": ["Reprendre les décisions reçues sans envoyer le message"]}]}
    plan_prompt = (
        "Lire la liste inputs.intentions. Produire un seul objet plan, avec goal, critères globaux et tasks, "
        "une liste de 1 à 100 objets. Chaque tâche a id stable, title, périmètre et critères. "
        "depends_on contient uniquement les ids des tâches préalables, sans cycle. "
        "project, si présent, est un identifiant de projet autorisé ; ne pas déduire le projet du nom d’un client. "
        "base_from est facultatif : l’id d’une dépendance de code déjà présente dans depends_on, dans le même dépôt. "
        "Une dépendance documentaire n’est pas une base de code. Demander les précisions avec ask. "
        "Ne pas réaliser les tâches pendant la planification et ne pas s’accorder la décision humaine.")

    def opening():
        return [
            node("intentions", "Recueillir les intentions", "input", x=50, y=140, outputs={"intentions": copy.deepcopy(intentions)},
                 description="Ajoutez et précisez les besoins depuis le terminal ou la liste, puis terminez le recueil. Cette étape transmet une liste, sans approuver le plan."),
            work("plan", "Préparer un plan", x=360, y=140, inputs={"intentions": copy.deepcopy(intentions)},
                 outputs={"plan": copy.deepcopy(single)}, prompt=plan_prompt, sample_outputs={"plan": copy.deepcopy(sample_plan)}),
            node("scope", "Valider le plan", "decision", x=670, y=140, inputs={"plan": copy.deepcopy(single)},
                 outputs={"plan": copy.deepcopy(single)}, question="Le plan, ses éléments, leurs dépendances et leurs projets correspondent-ils au travail autorisé ?",
                 options=["approve", "reject"]),
        ]

    def opening_edges():
        return [{**edge("intentions", "plan"), "mapping": {"intentions": "intentions"}},
                {**edge("plan", "scope"), "mapping": {"plan": "plan"}},
                {**edge("scope", "work", "approve"), "mapping": {"plan": "plan"}}]

    child = {"schema": 2, "id": "work-item", "title": "Traiter un élément du plan", "nodes": [
        work("perform", "Effectuer le travail de cet élément", inputs={"item": copy.deepcopy(single)}, outputs={"result": "string"},
             prompt="Traiter uniquement inputs.item, dans son projet et selon ses critères. Consulter les résultats des dépendances dans parameters.dependency_results. "
                    "Une analyse, un diagnostic, un compte rendu ou un brouillon constituent des résultats valides ; aucune modification de code n’est exigée. "
                    "Demander les précisions nécessaires avec ask. Fournir sources, résultat et limites ; ne pas inventer de test exécuté, de publication ou d’envoi.",
             sample_outputs={"result": "Exemple de résultat documentaire pour cet élément. Aucun fichier modifié ni message envoyé."})], "edges": []}
    generic = {"schema": 2, "id": "intentions-plan-work", "title": "Intentions, plan et travaux",
               "description": "Recueillir plusieurs intentions, valider un plan unique et suivre chaque élément dans son propre workflow. Analyse, support, réunion ou autre travail : le modèle reste indépendant du métier et des agents.",
               "nodes": [*opening(),
                   node("work", "Pour chaque élément du plan", "foreach", x=980, y=140, collection="plan.tasks", concurrency=2,
                        inputs={"plan": copy.deepcopy(single)}, outputs={"results": copy.deepcopy(objects), "contributions": copy.deepcopy(objects)}, workflow=child),
                   node("receipt", "Examiner les résultats", "decision", x=1320, y=140, inputs={"results": copy.deepcopy(objects)},
                        question="Les résultats de chaque élément répondent-ils aux critères du plan ? Les brouillons restent des brouillons, sans envoi implicite.", options=["approve", "reject"])],
               "edges": [*opening_edges(), {**edge("work", "receipt"), "mapping": {"results": "results"}}]}

    # This is an explicit, executable Python example. An absent/empty suite must
    # fail rather than qualify a repository or an Odoo installation by accident.
    check = ["python3", "-B", "-c", "import sys, unittest; sys.path.insert(0, '/project'); "
             "suite = unittest.defaultTestLoader.discover('/project/tests'); "
             "assert suite.countTestCases() > 0, 'Aucun test trouvé : adapter la commande au projet'; "
             "result = unittest.TextTestRunner(verbosity=2).run(suite); sys.exit(not result.wasSuccessful())"]
    qa_prompt = "Exemple Python unittest, à adapter avant lancement. Projet en lecture seule, sans réseau ni base de données ; ce contrôle ne constitue pas une recette Odoo."
    code_child = {"schema": 2, "id": "code-item", "title": "Modifier et tester un élément", "nodes": [
        work("edit", "Proposer les modifications", execution_mode="edit", required_capabilities=["edit"],
             inputs={"item": copy.deepcopy(single), "candidate": {"type": "object", "required": False}}, outputs={"candidate": copy.deepcopy(single)},
             prompt="Réaliser uniquement inputs.item dans la copie de travail fournie. Elle inclut la dépendance de code autorisée, si présente. "
                    "Ne pas écrire dans le dépôt original. Si aucune modification n’est nécessaire, demander un recadrage ; ne pas fabriquer de diff. "
                    "Les tests seront exécutés par le bloc de commande suivant.",
             sample_outputs={"candidate": {"simulation": True, "summary": "Exemple sans diff applicable"}}),
        node("qa", "Tester la contribution", "command", x=390, inputs={"candidate": copy.deepcopy(single)},
             candidate_check=True, argv=copy.deepcopy(check), validation="automatic", evidence_required=True, description=qa_prompt)],
        "edges": [{**edge("edit", "qa"), "mapping": {"candidate": "candidate"}}]}
    code_opening = opening()
    code_opening[1]["prompt"] += " Ce modèle porte uniquement sur des modifications de code. La commande Python unittest des blocs QA est un exemple à adapter au projet avant de valider le plan ; elle n’installe ni Odoo ni une base de données."
    code_opening[1]["sample_outputs"] = {"plan": {"goal": "Exemple d’évolution d’un projet Python", "tasks": [
        {"id": "R1", "title": "Modifier la fonction et ses tests", "criteria": ["Les tests pertinents couvrent le résultat attendu"]}]}}
    code_opening[2]["question"] = "Le périmètre et les dépendances sont-ils validés ? Vérifiez aussi que les commandes de tests Python de chaque élément et du candidat commun ont été adaptées à ce projet."
    code = {"schema": 2, "id": "code-plan-integrate", "title": "Développement par élément et tests communs",
            "description": "Valider un plan de code, travailler dans des copies isolées puis intégrer les contributions et tester le candidat commun. Commandes Python unittest fournies comme exemples à adapter ; aucun déploiement ni recette Odoo implicite.",
            "nodes": [*code_opening,
                node("work", "Pour chaque élément du plan", "foreach", x=980, y=140, collection="plan.tasks", concurrency=2,
                     inputs={"plan": copy.deepcopy(single)}, outputs={"results": copy.deepcopy(objects), "contributions": copy.deepcopy(objects)}, workflow=code_child),
                node("integrate", "Intégrer les modifications", "integrate", x=1310, y=140, validation="automatic",
                     inputs={"contributions": copy.deepcopy(objects)}, outputs={"candidate": copy.deepcopy(single)}, application_requires=["qa", "receipt"]),
                node("qa", "Tester le candidat commun", "command", x=1640, y=140, inputs={"candidate": copy.deepcopy(single)},
                     candidate_check=True, argv=copy.deepcopy(check), validation="automatic", evidence_required=True, description=qa_prompt),
                node("receipt", "Décider de l’application locale", "decision", x=1970, y=140, inputs={"candidate": copy.deepcopy(single)},
                     question="Les tests communs ont réussi sur ce candidat exact. Examinez le diff et les preuves avant l’application au dépôt local. Aucune publication ni livraison n’a été effectuée.", options=["approve", "reject"])],
            "edges": [*opening_edges(), {**edge("work", "integrate"), "mapping": {"contributions": "contributions"}},
                      {**edge("integrate", "qa"), "mapping": {"candidate": "candidate"}},
                      {**edge("integrate", "receipt"), "mapping": {"candidate": "candidate"}}, edge("qa", "receipt")]}
    return [generic, code]

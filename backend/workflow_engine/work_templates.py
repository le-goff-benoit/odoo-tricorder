"""Editable work contracts for native conversations; no delivery target is invented."""
from .library import node, edge


def templates():
    def work(nid, title, profile="generalist", **extra):
        return node(nid, title, "agent", profile=profile, validation="contract", max_attempts=2,
                    prompt=extra.pop("prompt", title), **extra)

    support = {"schema": 1, "id": "support-conversation", "title": "Support — diagnostic et suite",
               "description": "Recevoir une demande, qualifier l’impact, poser les questions utiles et préparer la suite. Agent et branches modifiables.",
               "nodes": [
                   work("diagnosis", "Analyser la demande de support", outputs={"severity": "string", "finding": "string", "next_action": "string"},
                        prompt="Lire la demande dans parameters.request. Établir faits, impact, inconnues et suite proposée. severity vaut critical, normal ou unknown. Demander les faits manquants avec ask plutôt que les inventer. Aucun correctif ou envoi implicite."),
                   node("route", "Support critique ?", "condition", x=370, parameter="severity", options=["critical", "normal", "unknown"],
                        inputs={"severity": "string", "finding": "string", "next_action": "string"}, outputs={"finding": "string", "next_action": "string"}),
                   work("urgent", "Préparer le traitement urgent", x=680, y=40, inputs={"finding": "string", "next_action": "string"}, outputs={"proposal": "string"},
                        prompt="Proposer le traitement urgent à partir du constat. Distinguer urgence et risque. Préciser contrôles, candidat, cible et retour arrière. Ne pas déployer ; le parcours de livraison se dessine et s’autorise séparément."),
                   work("normal", "Préparer la réponse et la suite", x=680, y=230, inputs={"finding": "string", "next_action": "string"}, outputs={"draft": "string"},
                        prompt="Préparer un brouillon de réponse et les travaux utiles. Diagnostic, correction et livraison restent distincts. Ne pas envoyer."),
                   node("clarify", "Préciser l’impact", "question", x=680, y=430, question="Quels faits permettent de préciser l’impact et l’urgence ?", outputs={"answer": "string"}),
                   work("reassess", "Réévaluer avec la précision reçue", x=990, y=430, inputs={"answer": "string"}, outputs={"severity": "string", "finding": "string", "next_action": "string"}, route_output="severity", options=["critical", "normal", "unknown"],
                        prompt="Réévaluer parameters.request avec inputs.answer. severity vaut critical, normal ou unknown. Conserver les inconnues ; ne pas inventer une urgence."),
                   node("unresolved", "Diagnostic encore indéterminé", "question", x=1300, y=430, completion_outcome="blocked", question="L’impact reste indéterminé. Quelle investigation faut-il ouvrir dans une nouvelle tâche ?", outputs={"answer": "string"}),
               ], "edges": [
                   {**edge("diagnosis", "route"), "mapping": {k: k for k in ("severity", "finding", "next_action")}},
                   {**edge("route", "urgent", "critical"), "mapping": {k: k for k in ("finding", "next_action")}},
                   {**edge("route", "normal", "normal"), "mapping": {k: k for k in ("finding", "next_action")}},
                   edge("route", "clarify", "unknown"), {**edge("clarify", "reassess"), "mapping": {"answer": "answer"}},
                   {**edge("reassess", "urgent", "critical"), "mapping": {k: k for k in ("finding", "next_action")}},
                   {**edge("reassess", "normal", "normal"), "mapping": {k: k for k in ("finding", "next_action")}},
                   edge("reassess", "unresolved", "unknown"),
               ]}
    # Present classification and routing as one configurable business block.
    support["nodes"] = [n for n in support["nodes"] if n["id"] != "route"]
    support["nodes"][0].update(title="Support critique ?", route_output="severity", options=["critical", "normal", "unknown"])
    support["edges"] = [e for e in support["edges"] if e["to"] != "route"]
    for connection in support["edges"]:
        if connection["from"] == "route":
            connection["from"] = "diagnosis"
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
    meeting = {"schema": 1, "id": "meeting-conversation", "title": "Clôture de réunion",
               "description": "Vérifier la transcription, extraire décisions et actions, préparer le compte rendu et l’email. Ajouter vos blocs de publication selon les destinations choisies.",
               "nodes": [
                   work("review", "Vérifier la réunion et sa transcription", outputs={"minutes": "string", "actions": "array"}, prompt="Lire la demande et la transcription fournies. Distinguer décisions, propositions et inconnues, attribuer les actions seulement lorsque c’est explicite. Poser les questions utiles. Produire un compte rendu fidèle."),
                   node("approve", "Relire le compte rendu", "decision", x=370, inputs={"minutes": "string", "actions": "array"}, outputs={"minutes": "string", "actions": "array"}, question="Le compte rendu et les actions reflètent-ils la réunion ?", options=["approve", "reject"]),
                   work("mail", "Préparer l’email de suivi", x=680, inputs={"minutes": "string", "actions": "array"}, outputs={"draft": "string"}, prompt="Préparer le brouillon d’email à partir du compte rendu reçu dans cette exécution. Aucun envoi ni publication implicite. Les destinations Confluence, Slack ou mail sont des blocs configurables du workflow."),
               ], "edges": [{**edge("review", "approve"), "mapping": {"minutes": "minutes", "actions": "actions"}}, {**edge("approve", "mail", "approve"), "mapping": {"minutes": "minutes", "actions": "actions"}}]}
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
            "diagnosis": {"severity": "normal", "finding": "Exemple : un utilisateur rencontre un défaut sans interruption du service.", "next_action": "Exemple : préparer la réponse et les investigations."},
            "urgent": {"proposal": "Exemple de traitement urgent à examiner ; aucun correctif ni déploiement effectué."},
            "normal": {"draft": "Exemple de brouillon : nous proposons de vérifier le défaut signalé. Aucun message envoyé."},
            "reassess": {"severity": "normal", "finding": "Exemple : la précision reçue permet de limiter l’impact.", "next_action": "Exemple : préparer une réponse documentée."},
        },
        "meeting-conversation": {
            "review": {"minutes": "Exemple de compte rendu : le périmètre du prochain atelier reste à confirmer.", "actions": [{"action": "Confirmer le périmètre de l’atelier", "owner": "À préciser", "due": "À préciser"}]},
            "mail": {"draft": "Exemple de brouillon : voici le compte rendu et l’action à préciser. Aucun email envoyé."},
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
        "diagnosis": ["Les faits, l’impact et les inconnues sont distingués.", "La criticité et la prochaine action sont justifiées par les sources reçues."],
        "urgent": ["La proposition précise le périmètre, les contrôles et le retour arrière.", "Aucun déploiement n’est présenté comme effectué ou autorisé par le seul diagnostic."],
        "normal": ["Le brouillon explique le constat, les inconnues et la suite proposée.", "Le message reste un brouillon, sans envoi implicite."],
        "reassess": ["La nouvelle qualification tient compte de la précision reçue.", "Les inconnues restantes sont explicites."],
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
    return [release, support, meeting, request, express]

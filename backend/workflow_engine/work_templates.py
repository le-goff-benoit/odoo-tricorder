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
    release = {"schema": 1, "id": "release-conversation", "title": "Release — intention, plan, travail et réception",
               "description": "Votre parcours de release dans une conversation : recueil, plan, travail, contrôles et préparation de livraison. Chaque demande garde ses preuves.",
               "nodes": [
                   work("intent", "Recueillir et cadrer l’intention", outputs={"intent": "string"}, prompt="Clarifier parameters.request, ses critères, risques, inconnues et périmètre. Poser les questions manquantes. Ne pas développer pendant le recueil."),
                   work("plan", "Préparer le plan", x=360, inputs={"intent": "string"}, outputs={"plan": "string"}, prompt="Préparer un plan proportionné, critères, dépendances, risques, étapes et méthode de vérification. L’express convient seulement à un défaut précis, réversible, sans droits, schéma, données ou calcul financier."),
                   node("scope", "Recevoir le plan", "decision", x=660, inputs={"plan": "string"}, outputs={"plan": "string"}, question="Le plan et le périmètre affichés conviennent-ils ?", options=["approve", "reject"]),
                   work("work", "Réaliser le périmètre accepté", x=960, inputs={"plan": "string"}, outputs={"result": "string"}, prompt="Relire le plan accepté dans l’exécution. Réaliser uniquement le périmètre autorisé dans le projet de la tâche. Respecter sa série et ses règles ; préserver les travaux existants. Remettre les preuves des modifications."),
                   work("check", "Vérifier le résultat", x=1260, inputs={"result": "string"}, outputs={"verdict": "string", "evidence_summary": "string"}, evidence_required=True,
                        prompt="Exécuter les contrôles pertinents, comparer au résultat métier attendu et fournir les preuves réelles. Pour Odoo : copie locale neutralisée, jamais tests en production. verdict vaut pass ou fail ; un contrôle non exécuté n’est pas pass."),
                   node("quality", "Les contrôles passent-ils ?", "condition", x=1560, parameter="verdict", options=["pass", "fail"], inputs={"verdict": "string", "evidence_summary": "string"}, outputs={"evidence_summary": "string"}),
                   work("delivery", "Préparer la livraison et le bilan", x=1860, inputs={"evidence_summary": "string"}, outputs={"proposal": "string"}, prompt="Préparer candidat exact, cible, preuves, limites et retour arrière. Consolider le bilan dans le document de release existant. Sans opération externe configurée et accord exact, rester à une proposition de livraison."),
                   node("receipt", "Recevoir le travail", "decision", x=2160, inputs={"proposal": "string"}, question="Le travail, ses preuves et sa proposition de livraison sont-ils reçus ?", options=["approve", "reject"]),
                   node("failure", "Décider de la correction", "question", x=1860, y=320, completion_outcome="blocked", question="Les contrôles ont échoué. Quel périmètre de correction souhaitez-vous ouvrir dans une nouvelle tâche ? Cette réponse ne valide pas le travail en échec.", outputs={"answer": "string"}),
               ], "edges": [
                   {**edge("intent", "plan"), "mapping": {"intent": "intent"}}, {**edge("plan", "scope"), "mapping": {"plan": "plan"}}, {**edge("scope", "work", "approve"), "mapping": {"plan": "plan"}},
                   {**edge("work", "check"), "mapping": {"result": "result"}}, {**edge("check", "quality"), "mapping": {"verdict": "verdict", "evidence_summary": "evidence_summary"}},
                   {**edge("quality", "delivery", "pass"), "mapping": {"evidence_summary": "evidence_summary"}}, edge("quality", "failure", "fail"), {**edge("delivery", "receipt"), "mapping": {"proposal": "proposal"}},
               ]}
    meeting = {"schema": 1, "id": "meeting-conversation", "title": "Clôture de meeting",
               "description": "Vérifier le transcript, extraire décisions et actions, préparer le compte rendu et l’email. Ajouter vos blocs de publication selon les destinations choisies.",
               "nodes": [
                   work("review", "Vérifier le meeting et son transcript", outputs={"minutes": "string", "actions": "array"}, prompt="Lire la demande et le transcript fournis. Distinguer décisions, propositions et inconnues, attribuer les actions seulement lorsque c’est explicite. Poser les questions utiles. Produire un compte rendu fidèle."),
                   node("approve", "Relire le compte rendu", "decision", x=370, inputs={"minutes": "string", "actions": "array"}, outputs={"minutes": "string", "actions": "array"}, question="Le compte rendu et les actions reflètent-ils le meeting ?", options=["approve", "reject"]),
                   work("mail", "Préparer l’email de suivi", x=680, inputs={"minutes": "string", "actions": "array"}, outputs={"draft": "string"}, prompt="Préparer le brouillon d’email à partir du compte rendu reçu dans cette exécution. Aucun envoi ni publication implicite. Les destinations Confluence, Slack ou mail sont des blocs configurables du workflow."),
               ], "edges": [{**edge("review", "approve"), "mapping": {"minutes": "minutes", "actions": "actions"}}, {**edge("approve", "mail", "approve"), "mapping": {"minutes": "minutes", "actions": "actions"}}]}
    return [release, support, meeting]

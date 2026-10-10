"""Readable report values. Formatting never infers execution state or permission."""

import html
import json
import re


FIELDS = {
    "action": "Action", "actions": "Actions", "owner": "Responsable", "assignee": "Responsable",
    "due": "Échéance", "due_date": "Échéance", "deadline": "Échéance", "question": "Question",
    "answer": "Réponse", "clarifications": "Précisions", "summary": "Résumé", "report": "Rapport",
    "finding": "Constat", "findings": "Constats", "severity": "Niveau d’urgence", "next_action": "Suite proposée",
    "next_steps": "Prochaines étapes", "rationale": "Justification", "impact": "Impact", "verdict": "Verdict",
    "decision": "Décision", "outcome": "Décision", "status": "État", "request": "Demande", "result": "Résultat",
    "selected_meetings": "Réunions sélectionnées", "analysis": "Analyse des réunions", "minutes": "Compte rendu", "destination": "Destination choisie", "response": "Réponse préparée",
    "proposal": "Proposition", "draft": "Brouillon", "subject": "Objet", "body": "Contenu", "recipient": "Destinataire",
    "title": "Titre", "description": "Description", "note": "Commentaire", "notes": "Commentaires",
    "message": "Message", "error": "Erreur", "reason": "Motif", "evidence": "Preuves", "source": "Source",
    "sources": "Sources", "files": "Fichiers", "path": "Chemin", "candidate": "Candidat", "plan": "Plan",
    "criteria": "Critères", "exit_code": "Code de sortie", "stdout": "Sortie de la commande", "stderr": "Erreurs de la commande",
}
DECISIONS = {"approve": "Approuvée", "reject": "Refusée", "pass": "Conforme", "fail": "Non conforme",
             "critical": "Urgent", "normal": "Sans urgence établie", "unknown": "À préciser", "done": "Terminé",
             "blocked": "Bloquée", "deferred": "Différée"}
ROLES = {"source": "Source", "plan": "Plan", "deliverable": "Livrable", "result": "Résultat", "evidence": "Preuve", "email": "Email d’origine"}


def text(value):
    """Plain text in Markdown, preserving line breaks and ordinary IT identifiers."""
    value = html.escape(str(value), quote=False).replace("\\", "\\\\")
    value = re.sub(r"([`*\[\]|])", r"\\\1", value)
    return re.sub(r"(?m)^(\s*)([#>+\-]|\d+\.)", r"\1\\\2", value)


def field_label(key):
    return FIELDS.get(key) or re.sub(r"([a-z])([A-Z])", r"\1 \2", str(key)).replace("_", " ").capitalize()


def scalar(value, key=""):
    if value is None or value == "":
        return "Non renseigné"
    if isinstance(value, bool):
        return "Oui" if value else "Non"
    if key in {"decision", "outcome", "verdict"} and isinstance(value, str):
        value = DECISIONS.get(value, value)
    if key == "severity" and isinstance(value, str):
        value = {"high": "Élevée", "medium": "Moyenne", "low": "Faible", **DECISIONS}.get(value, value)
    return text(value)


def proof_link(proof, index=0):
    metadata = {**(proof.get("$artifact") if isinstance(proof.get("$artifact"), dict) else {}), **proof} if isinstance(proof, dict) else {}
    sha = metadata.get("sha256", "")
    name = next((metadata[key].strip() for key in ("name", "filename", "title") if isinstance(metadata.get(key), str) and metadata[key].strip()), None)
    if name:
        name = str(name).replace("\\", "/").split("/")[-1]
    role = metadata.get("role") if isinstance(metadata.get("role"), str) else None
    role = ROLES.get(role, role)
    label = " — ".join(str(part) for part in (role, name) if part) or f"Preuve {index + 1}"
    if not isinstance(sha, str) or not re.fullmatch(r"[a-f0-9]{64}", sha):
        return text(label) + " · Preuve indisponible"
    return f"[{text(label)}](.suivi/preuves/{sha})"


def value_lines(value, key="", depth=0, labels=None):
    if not isinstance(value, (dict, list)):
        return [scalar(value, key), ""]
    if isinstance(value, dict) and "$artifact" in value:
        return [proof_link(value), ""]
    if depth >= 8:
        raw = json.dumps(value, ensure_ascii=False, indent=2)
        fence = "`" * max(3, max((len(m.group()) for m in re.finditer(r"`+", raw)), default=0) + 1)
        return ["<details><summary>Structure détaillée</summary>", "", fence + "json", raw, fence, "", "</details>", ""]
    if isinstance(value, list):
        if not value:
            return ["Aucun élément.", ""]
        if all(isinstance(item, dict) and "action" in item and all(not isinstance(part, (dict, list)) for part in item.values()) for item in value):
            columns = ["action", "owner", "due"]
            columns += list(dict.fromkeys(key for item in value for key in item if key not in columns))
            lines = ["| " + " | ".join(text(field_label(key)) for key in columns) + " |",
                     "| " + " | ".join("---" for _ in columns) + " |"]
            for item in value:
                cells = [" ".join(value_lines(item.get(key), key, depth + 1)).strip().replace("\n", "<br>") for key in columns]
                lines.append("| " + " | ".join(cells) + " |")
            return lines + [""]
        lines = []
        for index, item in enumerate(value, 1):
            lines += [f"**Élément {index}**", ""] if isinstance(item, (dict, list)) else []
            lines += value_lines(item, key, depth + 1)
        return lines
    lines = []
    for name, item in value.items():
        lines += ["**" + text((labels or {}).get(name, field_label(name))) + "**", ""] + value_lines(item, name, depth + 1)
    return lines or ["Aucun champ renseigné.", ""]

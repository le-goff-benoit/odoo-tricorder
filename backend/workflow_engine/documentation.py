"""One human projection of the same run facts; portable evidence export."""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from .contracts import identifier, require
from .business_markdown import DECISIONS, proof_link, text, value_lines
from .projections import failed_result

LABELS = {"pending": "Prévu", "ready": "Prêt", "running": "En cours", "waiting": "Décision attendue", "waiting_input": "Réponse attendue", "returned": "À valider", "accepted": "Validé", "skipped": "Non applicable", "blocked": "Bloqué", "cancelled": "Annulé", "interrupted": "Interrompu"}


def cell(value):
    return str(value).replace("|", "\\|").replace("\n", " ")


def state_label(state, node):
    return "Échec" if failed_result(state, node) else LABELS.get(state["status"], "État non renseigné")


def attempt_lines(state, node, historical=False, retry_reason=None):
    result = state.get("result") or {}
    level = "#####" if historical else "####"
    lines = value_lines(result.get("summary") or "Données reçues pour cette étape.")
    lines += [f"État : **{state_label(state, node)}**. Tentative {state['attempt']}.", ""]
    if result.get("simulated"):
        lines += ["**Résultat simulé : aucun résultat métier réel n’est attesté pour cette tentative.**", ""]
    timestamp = state.get("finished") or state.get("started")
    if isinstance(timestamp, (int, float)):
        try:
            lines += ["Date enregistrée : " + datetime.fromtimestamp(timestamp, timezone.utc).strftime("%d.%m.%Y à %H:%M UTC") + ".", ""]
        except (ValueError, OverflowError, OSError):
            pass
    for label, values in (("Entrées reçues", state.get("inputs")), ("Résultat", result.get("outputs"))):
        if values:
            lines += [level + " " + label, ""] + value_lines(values, labels=node.get("port_labels", {}).get("inputs" if label == "Entrées reçues" else "outputs"))
    if state.get("validation_error"):
        lines += ["**Contrôle non satisfait**", ""] + value_lines(state["validation_error"])
    if result.get("patch"):
        lines += [f"[Examiner les modifications de code](.suivi/preuves/{result['patch']['sha256']})", "",
                  "Code appliqué au dépôt local après confirmation." if state.get("applied_candidate") else "Proposition isolée ; code non appliqué au dépôt.", ""]
    if state.get("reused_from"):
        lines += [f"Preuves réutilisées depuis `{state['reused_from']['run']}` ; aucun nouveau test exécuté pour ce bloc.", ""]
    if result.get("receipt"):
        lines += ["Accusé de réception externe : " + text(result["receipt"].get("id", "")), ""]
    if result.get("evidence"):
        lines += [level + " Preuves", ""] + ["- " + proof_link(proof, index) for index, proof in enumerate(result["evidence"])] + [""]
    if state.get("receipt"):
        lines += ["Validation : " + text(state["receipt"]["note"]), ""]
    if historical:
        for question in state.get("questions", []):
            lines += ["**Question**", "", text(question["text"]), "", "**Réponse**", "",
                      text(question.get("answer", "")) if question.get("status") == "answered" else "Réponse attendue.", ""]
    if retry_reason:
        lines += ["**Motif de la reprise suivante**", ""] + value_lines(retry_reason)
    return lines


def markdown(run):
    graph = run["definition"]
    lines = [f"# {graph['title']}", "", "## Demande", "", run.get("parameters", {}).get("request") or graph.get("description", "Demande à préciser dans le workflow."), "",
             "**Exécution simulée : aucun résultat métier réel n'est attesté.**" if run["simulation"] else "Exécution locale. Les validations humaines et les contrôles automatiques sont distingués ci-dessous.", "", "## Plan", "", "| Travail | État | Critères |", "|---|---|---|"]
    launch_fields = graph.get("launch_fields", [])
    if launch_fields:
        launch_lines = ["## Informations au lancement", ""]
        for field in launch_fields:
            value = run.get("parameters", {}).get(field["key"])
            if value is not None:
                launch_lines += ["**" + text(field["label"]) + "**", ""] + value_lines(value) + [""]
        position = lines.index("## Plan")
        lines[position:position] = launch_lines
    for node in graph["nodes"]:
        state = run["nodes"][node["id"]]
        lines.append(f"| {cell(node['title'])} | {state_label(state, node)} | {cell('; '.join(node.get('criteria', [])) or 'À préciser')} |")
    lines += ["", "## Réalisation", ""]
    results = False
    for node in graph["nodes"]:
        state = run["nodes"][node["id"]]
        if not state.get("result") and not state.get("inputs") and not state.get("history"):
            continue
        results = True
        lines += [f"### {node['title']}", ""] + attempt_lines(state, node)
        history = state.get("history", [])
        if history:
            lines += ["#### Tentatives précédentes", ""]
            for index, previous in enumerate(history):
                following = history[index + 1] if index + 1 < len(history) else state
                lines += [f"##### Tentative {previous['attempt']}", ""] + attempt_lines(previous, node, historical=True, retry_reason=following.get("reason"))
    if not results:
        lines += ["Aucun résultat remis pour le moment.", ""]
    lines += ["## Vérifications et limites", "", "Les états ci-dessus reflètent les validations enregistrées. Les résultats de simulation restent des exemples.", ""]
    if any(node.get("execution_mode") == "edit" or node.get("candidate_check") or "candidate" in node.get("outputs", {}) for node in graph["nodes"]):
        lines += ["Aucune modification de code n'est attestée sans diff/candidat et critères associés.", ""]
    if any(node["kind"] in {"external", "communication"} for node in graph["nodes"]):
        lines += ["## Opérations externes", "", "Les accusés de réception sont indiqués dans les résultats. Un texte préparé ne prouve pas son envoi ; un accusé de publication ne prouve pas la version déployée.", ""]
    lines += ["## Décisions et suite", ""]
    if run.get("completion_outcome") in {"blocked", "rejected"}:
        lines += ["**Travail non résolu ou refusé : les tâches dépendantes restent bloquées.**", ""]
    for node in graph["nodes"]:
        state = run["nodes"][node["id"]]
        for question in state.get("questions", []):
            lines += [f"- {node['title']} — question : {question['text']}"]
            lines += [f"  Réponse : {question['answer']}" if question.get("status") == "answered" else "  Réponse attendue."]
        if state["status"] == "waiting":
            lines += [f"- **{node['title']}** : {node.get('question', 'Résultat à valider.')}"]
        elif state.get("decision"):
            outcome = state['decision']['outcome']
            lines += [f"- {node['title']} : **{text(node.get('option_labels', {}).get(outcome, DECISIONS.get(outcome, outcome)))}** — décision humaine conservée."]
    lines += ["", "<details><summary>Références techniques de l’exécution</summary>", "", f"Exécution `{run['id']}` · contrat `{run['contract']}`.", "", "</details>", ""]
    return "\n".join(lines)


def export_release(engine, run_id, root, release_id):
    return export_snapshot(engine, run_id, root, "release", release_id)


def export_work(engine, run_id, name):
    run = engine.run(run_id)
    return export_snapshot(engine, run_id, engine.project(run["project"])["path"], "work", name)


def artifact_references(value):
    """Only explicit artifact references; an ordinary SHA-like field is not a proof."""
    if isinstance(value, dict):
        reference = value.get("$artifact")
        if isinstance(reference, dict) and isinstance(reference.get("sha256"), str) and re.fullmatch(r"[a-f0-9]{64}", reference["sha256"]):
            yield reference
        for item in value.values():
            yield from artifact_references(item)
    elif isinstance(value, list):
        for item in value:
            yield from artifact_references(item)


def export_snapshot(engine, run_id, root, collection, release_id):
    require(isinstance(release_id, str) and re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}", release_id), "Identifiant de release invalide")
    run = engine.run(run_id)
    root = Path(root).resolve()
    require(root.is_dir(), "Dossier de destination absent")
    folder = root / collection / release_id
    # No overwriting another human document or following a path out of the project.
    require(not folder.exists(), "Ce dossier existe déjà : choisir un autre identifiant d'export")
    require((root / collection).resolve().is_relative_to(root), "Destination hors projet")
    evidence = {}
    for state in run["nodes"].values():
        for attempt in [state, *state.get("history", [])]:
            result = attempt.get("result", {})
            references = [*result.get("evidence", []), *artifact_references(attempt)]
            if result.get("patch"):
                references.append(result["patch"])
            for proof in references:
                if proof["sha256"] not in evidence:
                    evidence[proof["sha256"]] = engine.evidence(proof)
    tracking = folder / ".suivi"
    tracking.mkdir(parents=True)
    (tracking / ("release.json" if collection == "release" else "execution.json")).write_text(json.dumps(run, indent=2, ensure_ascii=False) + "\n")
    events = []
    while batch := engine.events(run_id, events[-1]["seq"] if events else 0):
        events.extend(batch)
    (tracking / "events.json").write_text(json.dumps(events, indent=2, ensure_ascii=False) + "\n")
    (tracking / "workflow.json").write_text(json.dumps(run["original"], indent=2, ensure_ascii=False) + "\n")
    if evidence:
        (tracking / "preuves").mkdir()
        for sha, content in evidence.items():
            (tracking / "preuves" / sha).write_bytes(content)
    (folder / "README.md").write_text(markdown(run))
    return str(folder / "README.md")

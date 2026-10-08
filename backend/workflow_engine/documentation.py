"""One human projection of the same run facts; portable evidence export."""

import json
import re
from pathlib import Path

from .contracts import identifier, require

LABELS = {"pending": "Prévu", "ready": "Prêt", "running": "En cours", "waiting": "Décision attendue", "returned": "À valider", "accepted": "Validé", "skipped": "Non applicable", "blocked": "Bloqué"}


def cell(value):
    return str(value).replace("|", "\\|").replace("\n", " ")


def markdown(run):
    graph = run["definition"]
    lines = [f"# {graph['title']}", "", "## Intention", "", graph.get("description", "Intention à préciser dans le workflow."), "",
             "**Exécution simulée : aucun résultat métier réel n'est attesté.**" if run["simulation"] else "Exécution locale. Les validations humaines et les contrôles automatiques sont distingués ci-dessous.", "", "## Plan", "", "| Travail | État | Critères |", "|---|---|---|"]
    for node in graph["nodes"]:
        state = run["nodes"][node["id"]]
        lines.append(f"| {cell(node['title'])} | {LABELS[state['status']]} | {cell('; '.join(node.get('criteria', [])) or 'À préciser')} |")
    lines += ["", "## Réalisation", ""]
    results = False
    for node in graph["nodes"]:
        state = run["nodes"][node["id"]]
        if "summary" not in state.get("result", {}):
            continue
        results = True
        lines += [f"### {node['title']}", "", state["result"]["summary"], "", f"État : **{LABELS[state['status']]}**. Tentative {state['attempt']}.", ""]
        if state.get("reused_from"):
            lines += [f"Preuves réutilisées depuis `{state['reused_from']['run']}` ; aucun nouveau test exécuté pour ce bloc.", ""]
        if state["result"].get("receipt"):
            lines += ["Accusé de réception externe : " + str(state["result"]["receipt"].get("id", "")), ""]
        for proof in state["result"].get("evidence", []):
            lines += [f"[Consulter la preuve](.suivi/preuves/{proof['sha256']})", ""]
        if state.get("receipt"):
            lines += ["Validation : " + state["receipt"]["note"], ""]
    if not results:
        lines += ["Aucun résultat remis pour le moment.", ""]
    lines += ["## Tests et limites", "", "Les états ci-dessus reflètent les validations enregistrées. Une fin de commande ou une réponse IA ne suffit pas à prouver un résultat métier.", "",
              "Aucune modification de code n'est attestée sans diff/candidat et critères associés. Les preuves simulées restent des exemples.", "", "## Livraison et documentation", "", "Les accusés de réception sont indiqués dans les résultats. Un accusé de publication ne prouve pas la version effectivement déployée ; consulter les contrôles et décisions associés.", "", "## Décisions et suite", ""]
    for node in graph["nodes"]:
        state = run["nodes"][node["id"]]
        if state["status"] == "waiting":
            lines += [f"- **{node['title']}** : {node.get('question', 'Résultat à valider.')}"]
        elif state.get("decision"):
            lines += [f"- {node['title']} : `{state['decision']['outcome']}` — décision humaine conservée."]
    lines += ["", f"Exécution `{run['id']}` · contrat `{run['contract']}`.", ""]
    return "\n".join(lines)


def export_release(engine, run_id, root, release_id):
    require(isinstance(release_id, str) and re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}", release_id), "Identifiant de release invalide")
    run = engine.run(run_id)
    root = Path(root).resolve()
    require(root.is_dir(), "Dossier de destination absent")
    folder = root / "release" / release_id
    # No overwriting another human document or following a path out of the project.
    require(not folder.exists(), "Cette release existe déjà : choisir un autre identifiant d'export")
    require((root / "release").resolve().is_relative_to(root), "Destination hors projet")
    evidence = {}
    for state in run["nodes"].values():
        for proof in state.get("result", {}).get("evidence", []):
            evidence[proof["sha256"]] = engine.evidence(proof)
    tracking = folder / ".suivi"
    tracking.mkdir(parents=True)
    (tracking / "release.json").write_text(json.dumps(run, indent=2, ensure_ascii=False) + "\n")
    if evidence:
        (tracking / "preuves").mkdir()
        for sha, content in evidence.items():
            (tracking / "preuves" / sha).write_bytes(content)
    (folder / "README.md").write_text(markdown(run))
    return str(folder / "README.md")

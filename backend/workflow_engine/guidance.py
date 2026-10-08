"""Scoped terminal instructions; never replace project-owned guidance."""

import hashlib
from pathlib import Path
import re
import uuid

from .contracts import require
from .projects import repository


GUIDANCE = """# Concevoir des workflows avec Tricorder

Ces consignes concernent uniquement ce dossier `.tricorder/`. Les consignes du
dépôt parent continuent à s'appliquer. Ce terminal sert à créer et adapter des
modèles ; ses commandes sont des actions directes, hors du moteur d'exécution.

Utiliser des termes IT courants : éditeur, workflow, bloc, exécution, validation,
journal d’exécution, planification, déploiement. Éviter les métaphores produit.

## Actions clés

1. Lire le workflow dans `workflows/<id>.json` et clarifier son résultat attendu.
2. Modifier le brouillon, ses critères et ses connexions, sans lancer le travail.
3. Choisir explicitement fournisseur et modèle pour chaque travail IA. Le profil
   `generalist` signifie **sans agent dédié**. Un profil de pack est facultatif.
   Les commandes, conditions et notifications déterministes n'exigent aucun LLM.
4. Déclarer les plugins utiles dans `plugins.json`, puis actualiser les capacités
   dans Tricorder. Un plugin déclaré ou installé n'est pas forcément connecté,
   utilisable par le fournisseur choisi, ni autorisé pour une opération.
5. Faire « Recharger et valider » dans Tricorder. Examiner le diff, les paramètres,
   les modèles, les coûts possibles et les prérequis avant toute activation.

## Format minimal

```json
{"schema":1,"id":"analyse","title":"Analyser une demande","nodes":[
  {"id":"analyser","kind":"agent","title":"Préparer une analyse",
   "profile":"generalist","provider":"codex","model":"A_CHOISIR",
   "session":"delegated","prompt":"Décrire les critères et les inconnues",
   "criteria":["Les inconnues sont explicites"]}
],"edges":[]}
```

`model` est un identifiant exact à confirmer, jamais un exemple à activer.
Identifiants : lettre initiale, puis lettres, chiffres, `.`, `_`, `-` (80 max).
Types : agent, command, document, watch, communication, condition, decision,
join, review, external, subworkflow ; task appelle une capacité de lecture ou sert à la simulation.
Une connexion contient `id`, `from`, `to`, `outcome` (done par défaut).
Les décisions ont les issues approve/reject ; les conditions leurs `options`
et un `parameter`. Aucun cycle ; les reprises sont bornées (max_attempts).
`inputs` et `outputs` déclarent des ports typés ; `mapping` relie les ports.
Une opération external décrit action, target, candidate et référence une
décision par approval ; cette décision doit porter la même opération exacte.

## Plugins extensibles

```json
{"schema":1,"plugins":[{"id":"mon-plugin","title":"Mon plugin",
"provider":"codex","operations":["read","send"]}]}
```

Le catalogue ne contient aucun secret. Tout bloc de travail peut demander
`"capabilities":[{"plugin":"mon-plugin","operation":"read"}]`.
Les fournisseurs admis sont codex, claude et local. Un plugin installé dans
Codex ne fournit pas automatiquement un transport exécutable à Tricorder.

Un adaptateur local de confiance peut déclarer dans le descripteur :
`"transport":{"argv":["/chemin/absolu/executable","/chemin/adaptateur.py"],"timeout":30}`.
Dans Connexions, « Vérifier l’adaptateur » présente la commande puis demande un
contrôle explicite avec les droits utilisateur. Le programme gère sa connexion
avec ses propres outils ; ne jamais mettre de jeton dans argv ou le catalogue.
La réponse JSON à `{protocol:"tricorder.tool/1",action:"describe"}` contient
`protocol`, `connected:true`, `identity` (compte/service non secret) et
`operations:{read:"read",send:"notify",publish:"write"}`. Une modification du
programme ou du catalogue invalide le contrôle et suspend les récurrences.

Chaque appel reçoit `action:"call"`, `operation`, `arguments`, `expected_identity`
et `idempotency_key`. Vérifier l'identité AVANT tout effet. Retourner
`{ok:true,identity:"identité vérifiée",outputs:{...},receipt:{id:"accusé distant"}}` ;
receipt est obligatoire pour notify/write. Utiliser la clé d'idempotence auprès
du service, un contrôle de version et une relecture après publication si requis.
Le transport est borné, sans shell, mais pas isolé du poste : sa confiance est
explicite. Ce protocole est un adaptateur Tricorder, pas une connexion MCP native.

Un bloc sélectionne une capacité. `read` peut alimenter les entrées `tool_data`
d'une Tâche IA (avec ou sans profil) ; notify exige un bloc Communication avec
un destinataire exact et un accord d'activation ; write exige un bloc externe
précédé de sa décision humaine exacte. Un accord de publication n'autorise pas
un déploiement : consigner et vérifier séparément publication, build et version.
La surveillance demande `outputs.messages` (1 000 maximum) avec id, sender,
received (timestamp), subject ; filtrage exact et dédoublonnage sont faits par
le moteur. Une réponse d'envoi inconnue reste bloquée, jamais renvoyée à l'aveugle.

`validation:"automatic"` est possible pour command/document/watch/communication
sans critères métier. Le moteur vérifie succès, types de sorties et preuves ;
une décision humaine n'est jamais automatique. `reuse:true` autorise une reprise
explicite de preuves command/document de moins de 24 heures, si leur contrat,
leurs dépendances et les sources du projet sont inchangés. Désactiver pour tout
contrôle dépendant de l'heure, d'un service ou d'un environnement variable.
Les anciens accords et notifications ne sont jamais repris.

La configuration native d'un plugin se fait avec ses outils officiels, après
vérification de sa provenance et dans le périmètre demandé par l'utilisateur.
Ne jamais mettre de jetons, mots de passe ou clés dans ce dépôt ou une consigne.

## Points humains et preuves

Ne jamais modifier SQLite, les états JSON d'exécution, une décision humaine ou
une preuve pour faire avancer un workflow. Le moteur est leur seul écrivain.
Une modification de modèle ne modifie pas les versions déjà exécutées.
Ne pas activer de récurrence, envoyer de message, publier ou déployer au seul
motif que le brouillon le prévoit. Une simulation n'est pas une preuve native.
La documentation humaine se regroupe dans `release/<id>/README.md` : intention,
plan, réalisation, tests/limites et livraison. Le suivi technique va en `.suivi/`.
"""

VERSION = 3


def managed_text(body=GUIDANCE, version=VERSION):
    checksum = hashlib.sha256(body.encode()).hexdigest()
    return f"<!-- tricorder-guidance version={version} sha256={checksum} -->\n" + body


def unchanged_managed(text):
    header, _, body = text.partition("\n")
    match = re.fullmatch(r"<!-- tricorder-guidance version=\d+ sha256=([a-f0-9]{64}) -->", header)
    return bool(match and hashlib.sha256(body.encode()).hexdigest() == match[1])


def prepare(project):
    root = Path(project["path"]).resolve() if project.get("scope") == "workspace" else Path(repository(project["path"]))
    folder = root / ".tricorder"
    require(folder.resolve().is_relative_to(root), "Espace de conception hors du dépôt")
    folder.mkdir(exist_ok=True)
    target = folder / "AGENTS.md"
    require(not target.is_symlink(), "Les consignes de conception ne peuvent pas être un lien symbolique")
    expected = managed_text()
    status = "installed"
    try:
        with target.open("x") as stream:
            stream.write(expected)
    except FileExistsError:
        current = target.read_text()
        if current == expected:
            status = "current"
        elif unchanged_managed(current) or current == GUIDANCE:
            temporary = target.with_name(".AGENTS-" + uuid.uuid4().hex + ".tmp")
            temporary.write_text(expected)
            temporary.replace(target)
            status = "updated"
        else:
            status = "customized"  # User edits win; display the update notice.
    return {"cwd": str(folder), "instructions": str(target), "version": VERSION, "status": status}


def sync(engine):
    """Idempotent user-context setup after installing/updating the application."""
    projects = engine.projects() + [engine.workspace_context()]
    with engine.store.connect() as db:
        library = engine.store.body(db.execute("SELECT body FROM projects WHERE id='library'").fetchone())
    if library:
        projects.append(library)
    results = []
    for project in projects:
        try:
            results.append({"project": project["id"], **prepare(project)})
        except (ValueError, OSError) as exc:
            results.append({"project": project["id"], "status": "unavailable", "reason": str(exc)})
    return results

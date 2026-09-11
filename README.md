![Odoo Tricorder, votre compagnon pour explorer les projets et suivre les agents](assets/readme-banner.png)

# Odoo Tricorder

Un terminal de bureau pour vos projets et agents Odoo, installable sur Ubuntu.
Vos dossiers à gauche, un vrai shell au centre, des missions à la portée explicite.

[Téléchargements](https://github.com/le-goff-benoit/odoo-tricorder/releases) ·
[Installer Odoo Crew](https://github.com/le-goff-benoit/odoo-crew) ·
[Signaler un problème](https://github.com/le-goff-benoit/odoo-tricorder/issues)

## Installer

La **0.2.0** cible Ubuntu 22.04/24.04 amd64.
Le paquet est construit et essayé sur Pop!_OS 22.04.
Télécharger le fichier `.deb` depuis la [release 0.2.0](https://github.com/le-goff-benoit/odoo-tricorder/releases/tag/v0.2.0),
puis exécuter cette commande depuis son dossier de téléchargement :

```bash
sudo apt install ./odoo-tricorder_0.2.0_amd64.deb
```

Ouvrir Odoo Tricorder depuis les applications. Python 3 et les bibliothèques du
bureau sont des dépendances du paquet. Claude, Codex et Odoo Crew s’installent
séparément. Le terminal fonctionne aussi sans eux.

## Un cockpit, pas un IDE

- Projets, favoris, releases, environnements et vrais terminaux persistants.
- Portée permanente **Projet → Release → Release complète ou tâche**.
- Critères d’acceptation visibles sur les cartes du plan et dans le suivi.
- Missions des agents : rôle, portée, workflow, sessions et sous-agents observables.
- Pictogrammes Claude/Codex dans les onglets ; **projet rouge et « ! »** lorsqu’une
  attente humaine est signalée, notification du bureau si la fenêtre n’a pas le focus.
- Estimations et mesures par tâche, activation guidée, distinction cumul/délai/attente,
  préparation de la consolidation des mesures dans Odoo Crew.
- Volume de QA depuis les preuves JUnit : exécutés, réussis, échecs, erreurs, ignorés.
- Explorateur en lecture seule : dossiers, code, inbox, mémoire, aperçus texte/image,
  PDF via le bureau. Recherche transversale Markdown/TXT entre projets.
- Graphe de dépendances filtrable, fiche de reprise, palette de préparation des skills.
- Sources Community/Enterprise/OCA : profils explicites, chemins, branches/commits,
  dépendances transitives ; stack locale et date de restauration déclarée.
- Préférences de police, taille, contraste, largeurs et disposition mémorisées.

## Prise en main

1. Sélectionner un projet ou ajouter son dossier avec **+**.
2. Choisir une release, un environnement et la **Portée** : release complète ou tâche.
3. Ouvrir un terminal. Son dossier et sa portée apparaissent au-dessus du shell.
4. Lancer `claude` ou `codex`, puis les skills habituels : `/odoo-plan` pour Claude,
   `$odoo-plan` pour Codex. La palette prépare la bonne syntaxe, sans l’exécuter.
5. Dans **Agents → Associer une session**, choisir tâche, workflow, rôle, terminal
   éventuel et période avant de sélectionner un historique JSONL.
6. Pour observer Claude avec ses hooks, préparer son lancement dans ce dialogue,
   puis copier la commande dans le shell. Pour Codex, un identifiant exact permet
   aussi de lire le statut via son service local existant.

L’association est volontaire : aucune exploration globale des conversations
personnelles, aucun prompt ou contenu d’outil affiché dans les événements.
La lecture native s’actualise toutes les cinq secondes, application ouverte.
Les formats et limites sont décrits dans [les adaptateurs](docs/ADAPTERS.md).

## Navigation et emplacements

**Préférences → Dossier des projets** choisit la racine de découverte (home par
défaut). Le bouton **+** ajoute un projet situé ailleurs.

La bibliothèque partagée est `~/odoo-sources`, ou `ODOO_SOURCES_DIR` si défini :
par exemple `18.0/`, `18.0-enterprise/`, `19.1/`, `19.1-enterprise/`.
**Préférences → Bibliothèque des sources Odoo** permet de la déplacer.

**Sources → Configurer le projet** permet de choisir son profil module/Studio/Online,
son dossier de travail, sa stack et des chemins Community/Enterprise/OCA spécifiques.
La série vient de `.odoo-agents/config`, sinon du manifest. Aucune substitution
de série, aucun téléchargement ou mise à jour des sources.

Les branches et commits sont lus sans modification. Les dépendances transitives
sont évaluées avec `ast.literal_eval`, jamais exécutées. Les manifests non lisibles,
homonymes et dépendances absentes restent signalés ; un besoin Enterprise/OCA
inconnu n’est pas deviné. Un profil Online n’autorise pas de module Python sur Online.

Le dossier de travail s’applique aux nouveaux terminaux ; la racine du projet reste
celle des plans/preuves. Un worktree doit conserver les règles du projet nécessaires
aux agents. L’inventaire de stack constate des fichiers/exécutables, pas la santé
des services. La date de restauration est **déclarative**, sans accès à la base.

| Raccourci | Action |
|---|---|
| Ctrl K | Rechercher un projet |
| Ctrl Shift T | Nouveau terminal |
| Ctrl Shift F | Rechercher dans le terminal |
| Ctrl Shift C / V | Copier la sélection / coller |
| Ctrl Alt ↑ / ↓ | Projet précédent / suivant |
| Ctrl Alt ← / → | Tâche précédente / suivante |
| Ctrl PageUp / PageDown | Terminal précédent / suivant |
| Alt 1 à 7 | Changer de vue |
| Ctrl Shift P | Palette de skills |
| Ctrl Alt F | Recherche documentaire transversale |

## Mesures et preuves

`odoo_usage.py` lit les durées/jetons disponibles dans les sessions associées.
Les fenêtres d’une même session ne se chevauchent pas. Une lecture de statut
runtime, sans mesure, peut compléter le JSONL sans participer aux sommes.

Les données d’`effort.json` et les observations natives ne sont jamais additionnées
entre elles. Le réalisé enregistré fait foi lorsqu’il est complet ; les observations
servent sinon de suivi provisoire. La consolidation prépare
`odoo_effort.py import-usage` : vérifier lot et rôle, puis exécuter soi-même.
Les prévisions historiques restent inchangées.

Une ouverture de terminal n’est pas du temps agent. Les durées de tours peuvent
inclure outils et attentes ; ce n’est pas du calcul pur. Les inconnues restent
inconnues, jamais zéro. Les écarts partiels ne constituent pas un bilan de clôture.

Les rapports `junit*.xml` et `test-results*.xml` sous la release alimentent le volume
de QA. La propriété JUnit `odoo.task` (ou `tricorder.task`) indique une tâche précise.
Les relances restent distinctes, sans somme artificielle. Sans rapport exploitable,
l’écran affiche « volume non renseigné » et propose `qa.md`/`recette.md` s’ils existent.
Un rapport vert ne certifie pas à lui seul toute la recette Odoo.

## Sécurité et persistance

Les projets, releases, workflows et sources sont lus sans écriture. Aucun script
du projet découvert n’est exécuté par le cockpit. Les commandes préparées sont
copiées, jamais injectées ou exécutées automatiquement. Aucun RPC Odoo, accès au
trousseau, clé API, téléchargement Enterprise ou restauration automatique.

Une sélection d’environnement ne configure pas SSH/RPC et n’accorde aucune
permission. Le shell et les agents gardent leurs propres permissions et protections
de production. Le contexte des nouvelles sessions est disponible dans
`TRICORDER_PROJECT`, `TRICORDER_SESSION_ID`, `TRICORDER_ENVIRONMENT`,
`TRICORDER_RELEASE`, `TRICORDER_TASK` et `TRICORDER_WORKING_DIRECTORY`.

Fermer la fenêtre conserve les shells et jusqu’à 2 Mio de sortie en mémoire.
La croix d’un onglet demande confirmation avant de l’arrêter. Les sessions ne
survivent pas au redémarrage du poste ou à la fin de session utilisateur.
Aucun historique terminal n’est écrit par Tricorder ; le shell et les agents
conservent leur propre politique d’historique.

Un service PTY 0.1 reste attaché à ses sessions après mise à jour. Pour utiliser
les dossiers de travail personnalisés, arrêter explicitement tous ses terminaux
une première fois : le service **vide** sera actualisé. Aucun programme existant
n’est arrêté automatiquement pendant la migration.

## Architecture et confidentialité

- Electron : fenêtre isolée, dialogues natifs, passerelle limitée.
- xterm.js : terminal ; Python 3 : lecteurs et service PTY.
- Socket Unix privée `0600`, contrôle d’identité du client ; aucun port TCP exposé.
- Préférences/associations dans `~/.config/odoo-tricorder/settings.json`.
- Métadonnées des hooks activés dans `observations/`, fichiers `0600`, limités à
  64 Mio par lancement. Retirer une association ne supprime aucun historique.
- Socket sous `$XDG_RUNTIME_DIR/odoo-tricorder/pty.sock`, avec repli dans la configuration.
- Outillage fiable dans `~/.odoo19-agents/scripts`, ou `TRICORDER_AGENTS_DIR/scripts`.
- Aucune télémétrie, synchronisation cloud ou lecture de credentials.
- L’explorateur masque les secrets nommés, dossiers techniques et liens symboliques.
  Les documents sélectionnés sont affichés comme texte, jamais exécutés.

## Développer et vérifier

Node.js 22+ et Python 3.10+. Dépendances JavaScript verrouillées.

```bash
npm ci
npm test
npm run test:ui
npm run dist
npm run test:packaged
npm run checksum
```

Les tests utilisent exclusivement des projets et sessions synthétiques, avec home,
historique shell et presse-papiers isolés. Ils nécessitent les PTY/sockets Unix.
Les parcours Electron peuvent tourner avec `xvfb-run -a` en CI ; Odoo Crew est requis
pour les scénarios de validation et de mesure. `npm start` lance le code source.

Voir [ROADMAP.md](ROADMAP.md) pour le périmètre et [QA.md](QA.md) pour le bilan.

## Licence

Code MIT. Illustrations fournies par le mainteneur. Pictogrammes fournisseurs
originaux, non officiels. Projet indépendant, non affilié à Odoo, OpenAI,
Anthropic ou Star Trek.

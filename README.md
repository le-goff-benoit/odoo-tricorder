![Odoo Tricorder, votre compagnon pour explorer les projets et suivre les agents](assets/readme-banner.png)

# Odoo Tricorder

Un **terminal de bureau pour vos projets et agents Odoo**, installable sur Ubuntu.
Vos dossiers à gauche, un vrai shell au centre, l’avancement des tâches à portée de regard.
Lancez `claude` ou `codex` et continuez à utiliser vos skills habituels.

[Télécharger la dernière release](https://github.com/le-goff-benoit/odoo-tricorder/releases/latest) ·
[Installer les agents Odoo](https://github.com/le-goff-benoit/odoo-crew) ·
[Signaler un problème](https://github.com/le-goff-benoit/odoo-tricorder/issues)

## Installer sur Ubuntu

La version 0.1.0 cible **Ubuntu 22.04 et 24.04, architecture amd64**. Testée sur
Pop!_OS 22.04. Téléchargez le `.deb` depuis les releases, puis :

```bash
sudo apt install ./odoo-tricorder_0.1.0_amd64.deb
```

Ouvrez **Odoo Tricorder** depuis le menu des applications ou lancez `odoo-tricorder`.
Python 3 et les bibliothèques de bureau sont déclarés comme dépendances du paquet.
Claude Code, Codex et les agents Odoo s’installent séparément. Tricorder fonctionne
comme terminal même en leur absence ; les validations Odoo sont alors « non vérifiées ».

## Ce que contient la première version

- Projets détectés dans les dossiers directs du home, ajout d’autres dossiers,
  recherche, favoris et mémorisation du dernier projet.
- Vrais terminaux avec saisie, couleurs, recherche, collage, plusieurs onglets et
  division en deux panneaux. Le panneau de suivi peut se masquer.
- Sessions **persistantes après fermeture de la fenêtre**, avec le même shell,
  ses programmes en cours et jusqu’à 2 Mio de sortie conservés en mémoire.
- Environnements déclarés, release sélectionnée et contexte attaché à chaque
  nouveau terminal. Changer la sélection ne modifie jamais une session existante.
- Plan de release avec dépendances, critères, validations périmées et étapes du
  workflow réellement atteintes, propriétaires et ressources réservées.
- Vue « À mon attention » pour les blocages, interruptions, réceptions et
  validations périmées des plans lus.
- Vue Sources : Community, Enterprise, modules du projet, profil module/Studio/Online
  déduit des métadonnées et série exacte. Bibliothèque partagée configurable.
- Temps prévu initial et révisé, réalisé, écarts et jetons issus d’`effort.json`.
  Une mesure absente reste inconnue.
- Lecture des documents Markdown/texte de release et du journal ; ouverture des
  PDF avec l’application du bureau ; inventaire d’`inbox/`.
- Liens vers les deux dépôts GitHub dans l’application. Interface française,
  inspiration LCARS sobre, sans effets animés superflus.

## Prise en main

1. Sélectionnez un projet ou ajoutez son dossier avec le bouton **+**.
2. Choisissez la release et éventuellement un environnement déclaré.
3. Ouvrez un terminal et tapez `claude` ou `codex`.
4. Utilisez `/odoo-plan`, `/odoo-start` et les autres skills habituels.
5. Consultez **Plan de release**, **Agents** et **À mon attention** pour suivre le travail.

| Raccourci | Action |
|---|---|
| `Ctrl K` | Rechercher un projet |
| `Ctrl Shift T` | Nouveau terminal |
| `Ctrl Shift F` | Rechercher dans le terminal |
| `Ctrl Shift C` / `Ctrl Shift V` | Copier la sélection / coller |

Fermer Tricorder laisse les terminaux en cours. La croix d’un onglet demande une
confirmation avant d’arrêter ce terminal. Les sessions ne survivent pas à un
redémarrage du poste ou à la fin de session utilisateur. Aucun historique terminal
n’est écrit sur disque par Tricorder ; votre shell et vos agents gardent leur propre
politique d’historique.

## Sources Odoo : une bibliothèque partagée

Le dossier partagé est `~/odoo-sources` par défaut, ou `ODOO_SOURCES_DIR` lorsqu’il
est défini au démarrage. Le bouton **Choisir le dossier partagé** permet de le changer.

```text
~/odoo-sources/
├── 18.0/
├── 18.0-enterprise/
├── 19.0/
├── 19.0-enterprise/
├── 19.1/
└── 19.1-enterprise/
```

La série provient d’abord de `.odoo-agents/config`, puis des manifests détectables.
Tricorder ne remplace jamais des sources absentes par une autre série. Les sources
sont consultées en lecture seule ; la V1 indique la présence des dossiers sans
certifier leurs branches Git. Elle ne clone ni ne met à jour les sources.

Un projet avec modules a besoin de sources exactes et d’un environnement local pour
la voie de développement. Pour Studio ou Online, les sources servent de référence
au standard ; leur présence ne signifie pas qu’un module Python peut être déployé.
Le profil est une **déduction à vérifier**, pas une nouvelle configuration imposée
au projet. Le besoin d’Enterprise dépend des modules et de vos droits d’accès.

## Comment les informations sont obtenues

Tricorder lit `.odoo-agents/`, `changelog/`, les métadonnées Git et `inbox/`.
Il réutilise les fonctions de lecture et de validation de l’outillage installé dans
`~/.odoo19-agents/scripts/` : les preuves restent soumises aux règles des agents.
`TRICORDER_AGENTS_DIR` permet d’utiliser une autre installation de cet outillage.

L’application n’exécute aucun script provenant des projets découverts. Elle ne
modifie pas leurs plans, leurs flows, leurs releases ou leurs environnements.
Les actions de travail passent par le terminal et les outils des agents.

### Limites explicites de la V1

- Un **processus actif** peut attendre une saisie. Une **étape revendiquée** ne
  prouve pas que l’agent est actif. Ces informations restent séparées.
- Les sous-agents natifs Claude/Codex et leurs questions/autorisations ne sont
  **pas encore collectés automatiquement**. Le panneau Agents affiche les
  sessions de terminal et les responsabilités déclarées dans les workflows.
- Le bilan exploite les mesures déjà enregistrées. La durée d’ouverture d’un
  terminal ne devient pas du temps agent ; attribution et import restent à faire
  avec les outils d’estimation existants.
- L’attention globale porte sur la release courante de chaque projet détecté et
  les workflows actifs du projet sans rattachement explicite à une release.
  Ouvrir une autre release permet d’en consulter le détail.
- Les environnements sont affichés à partir des métadonnées déclarées : aucune
  connexion Odoo, aucun test de disponibilité ni accès à une base distante.
- La sélection d’un environnement est un contexte. Elle ne configure pas une
  connexion SSH ou RPC et n’accorde aucune permission. Le terminal est un shell
  ordinaire ; les protections production restent celles des agents et outils.

Le contexte est disponible dans les nouvelles sessions via `TRICORDER_PROJECT`,
`TRICORDER_SESSION_ID`, `TRICORDER_ENVIRONMENT`, `TRICORDER_RELEASE` et
`TRICORDER_TASK`. Ces variables ne contiennent aucun secret et n’autorisent aucune
écriture en production.

## Architecture et confidentialité

- **Electron** : fenêtre, dialogues du bureau, passerelle limitée et renderer isolé.
- **xterm.js** : affichage et interaction avec le terminal.
- **Python 3** : lecture des métadonnées et service PTY persistant.
- Communication du terminal par **socket Unix privée**, permission `0600` et
  contrôle de l’identité du client. Aucun port TCP ni service web exposé.
- Préférences dans `~/.config/odoo-tricorder/settings.json`. Socket dans
  `$XDG_RUNTIME_DIR/odoo-tricorder/pty.sock`, avec repli sous le dossier de configuration.
- Pas de télémétrie, de synchronisation cloud, de lecture de trousseau ou de clé API.

Les noms de projets, sorties terminal et documents sont traités comme du texte.
Les liens externes de l’application sont limités aux deux dépôts GitHub. Les PDF
choisis sont ouverts par le bureau. Les caches Chromium restent locaux.

## Développer et vérifier

Node.js 22+ et Python 3.10+ sont requis. Les versions JavaScript sont verrouillées
dans `package-lock.json`.

```bash
npm ci
npm start
npm test
npm run test:ui
npm run dist
```

Les tests du terminal nécessitent les sockets Unix et les PTY. Les tests visuels
ouvrent une fenêtre Electron sur le bureau ; en CI Linux, utiliser
`xvfb-run -a npm run test:ui`. Ils utilisent des projets fictifs et vérifient la
persistance du shell, la saisie, le collage, les contextes et la validité des plans.
L’outillage `odoo-crew` doit être installé pour les scénarios de validation UI.

Les captures de développement utilisent exclusivement des données fictives.
Les prochaines étapes sont détaillées dans [ROADMAP.md](ROADMAP.md).

## Licence

Code sous licence MIT. Illustrations fournies pour ce projet par son mainteneur.
Projet indépendant, non affilié à Odoo, OpenAI, Anthropic ou Star Trek.

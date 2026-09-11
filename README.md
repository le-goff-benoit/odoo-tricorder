![Odoo Tricorder, votre compagnon pour explorer les projets et suivre les agents](assets/readme-banner.png)

# Odoo Tricorder

### Ajouts locaux 0.2.8 (non publiés)

- Onglet **Kanban** de la release : avancement, réceptions distinctes des preuves,
  filtres prêtes / bloquées / accord attendu / responsable. Les états inconnus et
  les tâches reportées restent séparés. Aucune modification du workflow par glisser-déposer.
- Carte ouverte : critères, étape, responsables, temps par agent, rapports de tests
  attribués, derniers changements et retour au terminal existant. La sélection
  reste une consultation ; elle n'interrompt ni ne réaffecte le terminal.
- Socle de [design commun](docs/DESIGN.md) : espacements, alignements, cartes,
  boutons, tableaux et dialogues, contrôlés sur huit vues en desktop et compact.
- [Analyse du suivi utile des agents](docs/AGENT_PROGRESS.md) : propositions à
  expérimenter, distinctes du Kanban livré ; aucun superviseur automatique actif.

Un terminal de bureau pour vos projets et agents Odoo, installable sur Ubuntu.
Vos dossiers à gauche, un vrai shell au centre, des missions à la portée explicite.

[Téléchargements](https://github.com/le-goff-benoit/odoo-tricorder/releases) ·
[Installer Odoo Crew](https://github.com/le-goff-benoit/odoo-crew) ·
[Signaler un problème](https://github.com/le-goff-benoit/odoo-tricorder/issues)

## Installer

**Version de travail 0.2.8** : cadrage `/odoo-plan` visible avant la release,
puis rattaché sans double comptage ; préparation/tâches/clôture, parts du temps
et jetons par rôle. Nécessite Odoo Crew avec les commandes `prepare-*`.
Le bandeau distingue release consultée, avancement et activité observée ;
« Environnement » est simplifié, le récapitulatif sous le terminal est retiré.
Le **Kanban global**, dans la barre latérale, réunit les tâches de tous les projets :
À faire, En cours, À valider, Bloqué / à vérifier, Terminé. Les releases closes
sont masquées par défaut ; chaque carte ouvre la bonne release et la bonne tâche.
Les statuts viennent des plans et des preuves, sans glisser-déposer de validation.
Cette version locale n'est pas encore publiée ; le téléchargement ci-dessous
reste celui de la 0.2.7.

La **0.2.7** ajoute le suivi des chronomètres hors veille et les compteurs de jetons détaillés, en complément du travail sans release et des aperçus Markdown (voir [QA.md](QA.md)).
La protection veille demande également les outils Odoo Crew mis à jour : elle
s’applique aux chronomètres démarrés avec cette version, même fenêtre fermée.
Après redémarrage, une mesure sans borne fiable reste inconnue. Les durées
natives anciennes ne sont pas corrigées sans preuve de suspension.

Les durées déjà enregistrées restent visibles même si certains rôles ne sont pas
mesurés : sous-total **partiel**, rôles à compléter, périodes ouvertes et affichage
en heures/minutes. Un suivi partiel n'est pas une économie sur la prévision complète.
Les observations provisoires ne sont jamais additionnées au registre enregistré.

La **0.2.7** cible Ubuntu 22.04/24.04 amd64.
Le paquet est construit et essayé sur Pop!_OS 22.04.
Télécharger le fichier `.deb` depuis la [release 0.2.7](https://github.com/le-goff-benoit/odoo-tricorder/releases/tag/v0.2.7),
puis exécuter cette commande depuis son dossier de téléchargement :

```bash
sudo apt install ./odoo-tricorder_0.2.7_amd64.deb
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
- Dépendances lisibles sur les tâches, palette de préparation des skills.
- Sources Community/Enterprise/OCA : profils explicites, chemins, branches/commits,
  dépendances transitives ; stack locale et date de restauration déclarée.
- Préférences de police, taille, contraste, largeurs et disposition mémorisées.

## Prise en main

1. Sélectionner un projet dans la liste de gauche (dossiers découverts automatiquement).
2. Choisir la release et la **tâche consultée**. L’environnement est un repère séparé,
   pas une connexion ou une autorisation.
3. Ouvrir un terminal de projet et le conserver pour tout le travail. Naviguer entre
   releases et tâches ne change pas les instructions de l’agent ni le shell.
4. Lancer `claude` ou `codex`, puis les skills habituels : `/odoo-plan` pour Claude,
   `$odoo-plan` pour Codex. La palette prépare la bonne syntaxe, sans l’exécuter.
5. Facultatif : **Agents → Réglages du suivi** relie la conversation aux
   durées/jetons disponibles. Le suivi des tâches et workflows ne dépend pas de cette
   association. Une conversation peut couvrir toute la release dans le même terminal ;
   une attribution à une tâche exige des bornes adaptées, sans chevauchement.
6. Pour observer Claude avec ses hooks, préparer son lancement dans ce dialogue,
   puis copier la commande dans le shell. Pour Codex, un identifiant exact permet
   aussi de lire le statut via son service local existant.

L’association est volontaire : aucune exploration globale des conversations
personnelles, aucun prompt ou contenu d’outil affiché dans les événements.
La lecture native s’actualise toutes les cinq secondes, application ouverte.
Les formats et limites sont décrits dans [les adaptateurs](docs/ADAPTERS.md).

### Ce que signifient les états

Une release est ouverte avec le marqueur Odoo Crew `release ouverte` (ou ancien
`lot ouvert`) ; le README sans ce marqueur est **clos**, conformément à
`odoo-release.sh`. Ce statut ne prouve pas un déploiement en production.

Les tâches de `plan.json` et les points numérotés des tableaux README sont visibles.
Une tâche **réceptionnée** conserve cet avancement historique même si sa preuve est
à revérifier ici. Les preuves produites dans un worktree sont identifiées sans être
validées arbitrairement dans le dossier principal. Les workflows absents ou multiples
restent explicites ; seules leurs associations déclarées servent aux liens de tâche.
Une preuve périmée d’une release close reste dans son historique et ne crée pas
une nouvelle urgence dans la file d’attention.

La sélection est mémorisée par projet et release. Le bouton **Continuer dans le
terminal du projet** réutilise le shell existant. Le contexte affiché au-dessus du
shell est celui de son ouverture, pas une attribution automatique de tout le travail futur.
Le graphe visuel et la fiche de reprise sont retirés de l’interface en 0.2.1.
La colonne de gauche affiche uniquement la liste des projets, sans ajout, recherche
ni page « À mon attention ». Les alertes restent attachées au projet concerné.
Les blocs techniques vides sont masqués ; les détails de collecte et les identifiants
internes sont repliés. L’écran courant privilégie tâches, critères, agents et temps.

## Navigation et emplacements

Dans **Temps & estimations**, « Détail par agent » déplie pour chaque tâche les
durées initiales, révisées et réalisées par rôle, en heures/minutes. Les rôles non
mesurés restent explicites. Le détail reste ouvert pendant les actualisations.
Les pourcentages indiquent la part de chaque tâche dans le temps connu de la
release (même avec un filtre de tâche), et la part de chaque agent dans sa tâche.
Une synthèse compare aussi les agents sur le périmètre affiché. Les temps inconnus
ne valent pas zéro ; un total nul n’a pas de pourcentage. Les arrondis peuvent
ne pas totaliser exactement 100 %. Les relevés s’affichent dès leur enregistrement,
release ouverte comprise : aucune attente de clôture. « Relevé incomplet » signifie
qu’il manque une durée, pas qu’il reste du travail ; le détail distingue absence
de relevé, mesure en cours et mesure interrompue.
La revue du décompte et les améliorations proposées sont dans [USAGE_REVIEW.md](USAGE_REVIEW.md).

Le sélecteur propose toujours **Aucune release**, même si des releases existent.
Ce choix est mémorisé par projet. Sans choix précédent, une release ouverte est
proposée s’il en existe une ; une ancienne release close n’est plus imposée.

Pour le projet consulté, en partant sans release, une **nouvelle release ouverte** détectée à l’actualisation
(automatique toutes les 30 secondes, ou bouton Actualiser) devient la sélection
du projet. Le terminal du projet sans release, ou rattaché à une ancienne release
close, reçoit ce repère s’il est le seul candidat. Les terminaux Express, arrêtés
ou rattachés à une autre release ouverte ne sont pas réaffectés. Plusieurs nouvelles
releases ou plusieurs terminaux candidats : aucune attribution de terminal devinée.

Dans un terminal existant, **Utiliser la release affichée dans ce terminal** ou
**Mettre ce terminal hors release** permet de changer son repère sans l’arrêter.
La consultation des tâches reste indépendante. Ces paramètres privés du cockpit
survivent à sa fermeture : aucun plan, historique de mesures ou profil client n’est
réécrit. Le processus, son répertoire, ses variables d’environnement initiales et
les instructions de l’agent déjà lancé ne changent pas. Pas de commande injectée.

Les aperçus **Markdown** du plan et de l’explorateur présentent titres, tableaux,
listes, citations et blocs de code. Le source est disponible dans un volet replié.
Le HTML actif et les images ne sont pas chargés ; les liens restent du texte,
sans navigation. Les autres fichiers texte conservent leur affichage brut.

Les onglets de pilotage regroupent **Terminal, Plan de release, Express, Agents et
Temps & estimations**. Le bouton **Projet**, en haut, ouvre les ressources :
**Fichiers, Environnements, Sources**. Revenir au plan conserve la tâche consultée.

**Express** affiche les interventions déclarées comme telles dans les workflows du
projet, y compris celles terminées sans release. La responsabilité, les étapes et le
dernier résultat des contrôles ciblés sont présentés, sans inventer un volume de tests.
Une bascule vers le développement complet est signalée. Le changelog peut rester lié,
mais aucun plan ni nouvelle conversation par intervention n’est exigé. Seuls les
workflows présents dans le dossier du projet sont lus, pas ceux de worktrees externes.

**Préférences → Dossier des projets** choisit la racine de découverte (home par
défaut). Les projets sont découverts dans ce dossier.

La bibliothèque partagée est `~/odoo-sources`, ou `ODOO_SOURCES_DIR` si défini :
par exemple `18.0/`, `18.0-enterprise/`, `19.1/`, `19.1-enterprise/`.
**Préférences → Bibliothèque des sources Odoo** permet de la déplacer.

**Projet → Sources → Configurer le projet** permet de choisir son profil module/Studio/Online,
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
| Ctrl Shift T | Nouveau terminal |
| Ctrl Shift F | Rechercher dans le terminal |
| Ctrl Shift C / V | Copier la sélection / coller |
| Ctrl Alt ↑ / ↓ | Projet précédent / suivant |
| Ctrl Alt ← / → | Tâche précédente / suivante |

Le bouton « Nouveau terminal » n'occupe plus le bandeau du projet. Utiliser le
« + » des onglets du terminal ou `Ctrl Shift T` depuis une autre vue. Depuis
Express, le raccourci conserve le démarrage hors release.
| Ctrl PageUp / PageDown | Terminal précédent / suivant |
| Alt 1 à 6 | Terminal, Plan, Express, Agents, Temps, Projet |
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
Les indicateurs **Prévision initiale** et **Réalisé attribué** sont en heures/minutes.
Une estimation rétrospective, un périmètre modifié ou une mesure partielle ne produit
pas de faux écart de clôture ; les réserves du lecteur Odoo Crew sont consultables.

Une ouverture de terminal n’est pas du temps agent. Les durées de tours peuvent
inclure outils et attentes ; ce n’est pas du calcul pur. Les inconnues restent
inconnues, jamais zéro. Les écarts partiels ne constituent pas un bilan de clôture.

Les rapports `junit*.xml` et `test-results*.xml` sous la release alimentent le volume
de QA. La propriété JUnit `odoo.task` (ou `tricorder.task`) indique une tâche précise.
Les relances restent distinctes, sans somme artificielle. Sans rapport exploitable,
l’écran affiche « volume non renseigné » et propose `qa.md`/`recette.md` s’ils existent.
Un rapport vert ne certifie pas à lui seul toute la recette Odoo.
Les extraits chiffrés des comptes rendus sont également consultables, séparément et
étiquetés **déclarations**, sans être additionnés ni convertis en compteurs vérifiés.

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
La [matrice des parcours](tests/USER_FLOWS.md) couvre départs de flux, interruptions et reprises.

## Licence

Code MIT. Illustrations fournies par le mainteneur. Pictogrammes fournisseurs
originaux, non officiels. Projet indépendant, non affilié à Odoo, OpenAI,
Anthropic ou Star Trek.

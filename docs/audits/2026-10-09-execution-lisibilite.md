# Review indépendante : comprendre une exécution comportant plusieurs demandes

État : réceptions source et paquet rc.10 terminées. Les quatre écarts sont
corrigés dans le périmètre reçu ; quinze contrôles sont verts sur le paquet,
avec dix-huit captures de cette version.

## Périmètre et méthode

Le besoin examiné est de travailler dans le terminal tout en comprenant l’état
du workflow : quelle demande est active, qu’attend-elle, quelle action permet
d’avancer, et comment consulter les autres demandes sans perdre ce contexte.
L’absence de débordement horizontal ou l’alignement des boutons ne suffisent pas
à qualifier ce parcours.

La capture utilisateur a servi à identifier le problème. Elle contient un
contexte client et n’est pas recopiée dans ce dossier. La reproduction utilise
exclusivement un projet Git temporaire, un fournisseur inerte et six demandes
synthétiques, pilotées par les commandes validées du moteur : une réalisation
en échec, quatre plans attendant une décision et une consolidation dépendant
des quatre dernières demandes. Chaque exécution comporte neuf blocs et huit
liens. Aucun état JSON/SQLite n’a été modifié directement. Aucun projet client,
compte fournisseur, service distant ou terminal utilisateur n’a été utilisé.

Le binaire installé `0.6.0-rc.9` est lancé dans un profil isolé. SHA-256 de
`resources/app.asar` :
`533905f8636ea9be40008b556e94af98d2d93ef09271c803eb5274890f9afdab`.

[Sonde reproductible](2026-10-09-execution-lisibilite/execution-probe.cjs),
[résultats et géométrie](2026-10-09-execution-lisibilite/rc9-results.json).
Les captures ont été inspectées visuellement à 1998 × 1247, 1440 × 900 et
1024 × 768, thème sombre, zoom navigateur 100 %, terminal à gauche.
Le même terminal reste vivant avec le même identifiant et le même PID pendant
les changements de demande et de vue.

## EX-01 — P1 : l’espace de travail est consommé par son contexte

Le panneau superpose un titre de demande développé, quatre onglets, le bilan
de la conversation, les six cartes, les commandes de lecture, le graphe et le
détail. À largeur réduite du panneau, graphe et détail passent verticalement,
tandis que les cartes prennent davantage de lignes. Les deux espaces utiles
se retrouvent alors minuscules et plusieurs défilements s’imbriquent.

| Fenêtre | Largeur du panneau | Six cartes | Graphe | Détail simultané | Conséquence visible |
|---|---:|---:|---:|---:|---|
| 1998 × 1247 | 829 px | 154 px | 650 px | 691 px | Graphe lisible en hauteur, mais détail étroit avec texte défilant dans le défilement de l’inspecteur. |
| 1440 × 900 | 561 px | 173 px | 148 px | 151 px | Bloc actif partiellement coupé ; cause et action hors vue ; trois régions de défilement. |
| 1024 × 768 | 391 px | 262 px | 148 px | 151 px | Graphe à y=683 ; détail à y=871, entièrement sous le bord inférieur de la fenêtre. |

Les hauteurs mesurées incluent les barres de défilement. La capture utilisateur
présente une disposition équivalente au cas étroit du panneau, malgré sa grande
fenêtre : un écran large ne garantit donc pas un graphe utile.

Preuves : [1998](2026-10-09-execution-lisibilite/rc9-failed-graph-1998.png),
[1440](2026-10-09-execution-lisibilite/rc9-failed-graph-1440.png),
[1024](2026-10-09-execution-lisibilite/rc9-failed-graph-1024.png).

Correction proposée : conserver une synthèse compacte et le nom de la demande
sélectionnée, ouvrir volontairement le sélecteur des demandes, puis consacrer
l’espace principal au graphe ou au détail. Le changement de mode doit être
direct, sans imposer en permanence les deux surfaces et leurs défilements.

## EX-02 — P1 : le résultat en échec est présenté comme une validation

Le titre de la demande indique « Échec · reprise nécessaire », mais son bloc
et l’inspecteur affichent « À valider ». L’inspecteur commence par « Entrées
reçues » et le plan complet. La cause de l’échec apparaît après ce texte ;
elle n’est pas visible immédiatement, même en utilisant « Lire le résultat ».
Le problème n’est donc pas seulement la taille du graphe : l’ordre du contenu
empêche de comprendre l’état présent.

Preuve : [lecture de l’échec à 1440](2026-10-09-execution-lisibilite/rc9-failed-detail-1440.png).

Correction proposée : état cohérent « Échec », cause lisible en premier,
action de reprise pertinente, puis entrées et preuves accessibles comme
contexte secondaire. Un résultat `ok: false` ne doit pas suggérer une validation
positive. La possibilité effective de reprise reste contrôlée par le moteur.

## EX-03 — P1 : une dépendance peut aboutir à un panneau vide

Après lecture d’une demande, cliquer sur la consolidation C1 conserve le mode
lecture, mais laisse tout l’espace principal vide. La carte indique « Attend
une autre tâche » et le titre « Suspendue », sans nommer les quatre demandes
dont elle dépend. L’utilisateur ne sait pas si le travail est en pause, s’il
doit intervenir, ni où aller.

Preuve : [demande dépendante sélectionnée](2026-10-09-execution-lisibilite/rc9-dependent-detail-1440.png).

Correction proposée : état de lecture explicite indiquant les demandes
attendues, leur état et un accès à chacune. Distinguer attente automatique des
dépendances et pause décidée par l’utilisateur. Conserver une vue utile même
quand aucun bloc n’est encore actif.

## EX-04 — P2 : actions dispersées et contexte répété

« Workflow », les onglets, « Retrouver la conversation », « Actions »,
« Lire le résultat » et « Outils » se partagent plusieurs bandeaux sans
indiquer clairement la prochaine opération utile. Les cartes répètent
l’état mais tronquent le titre et l’action. Le plan en attente affiche lui
aussi les entrées avant la question et les commandes de décision.

Preuve : [plan en lecture](2026-10-09-execution-lisibilite/rc9-plan-detail-1440.png).

Correction proposée : une action principale dépendant du contexte
(examiner l’échec, répondre, examiner le plan), un changement clair entre
graphe et détail, et un regroupement des commandes secondaires. Préserver
l’accès à l’éditeur, l’historique et les outils ; leur présence permanente
n’a pas à prendre le pas sur la compréhension de l’exécution.

## Critères de réception du parcours corrigé

1. Sans défilement initial, la demande sélectionnée, son état et l’action
   attendue sont compréhensibles ; le bilan des six demandes reste accessible.
2. Le graphe dispose d’une surface utile et son bloc actif est entièrement
   visible. Repères de recette en côte à côte : 350 px utiles à 1440 × 900,
   280 px à 1024 × 768. Ces repères ne prescrivent pas une hauteur CSS fixe :
   la visibilité réelle des blocs et de leurs liens reste déterminante.
3. Le détail place le résultat, la cause d’échec ou la question avant les
   métadonnées et les entrées. La réponse ou la décision se traite dans une
   même surface de lecture, sans défilements verticaux imbriqués imposés.
4. Choisir une des six demandes conserve le mode choisi, actualise le contenu
   et présente les dépendances nommées ; aucune surface vide ne remplace un
   état d’attente légitime.
5. Revenir au graphe montre l’étape pertinente. Le rafraîchissement périodique
   ne déplace pas une navigation volontaire ni une saisie en cours.
6. Le terminal demeure visible et utilisable, avec le même PTY et le même PID.
   Le parcours inclut un contrôle en disposition verticale, sans masquer
   durablement le suivi ni multiplier les applications.

Les réceptions antérieures restent des preuves de leurs parcours et de leurs
versions. Elles ne prouvaient pas cette configuration de six demandes avec
panneau étroit, erreur de préparation et dépendances. Cette nouvelle recette
ajoute ces cas concrets plutôt que d’assimiler une absence d’overflow à une
interface productive.

## Première réception de la nouvelle disposition

Le bundle renderer
`ffcdc46ccb73c302f4ea2fb988146707fdb99c44cbcf7eb78302b31237ffc6a1`
a été construit puis reçu dans une instance isolée avec la même fixture.
[Sonde de cette passe](2026-10-09-execution-lisibilite/execution-recheck-first.cjs),
[résultats](2026-10-09-execution-lisibilite/source-first-results.json).

L’espace principal est désormais réservé au graphe ou au détail. Le sélecteur
des six demandes est fermé initialement. Le graphe mesure 883 px à 1998 × 1247,
514 px à 1440 × 900 et 384 px à 1024 × 768 ; le bloc sélectionné est entièrement
visible aux trois tailles. À zoom 125 % sur une fenêtre 1440 × 900, le viewport
devient 1152 × 720 et le graphe conserve 334 px utiles.

Dans le détail, la cause d’échec et « Préparer la reprise » sont visibles à
1024 × 768. Le plan précède les commandes de décision, dans un seul
défilement ; une note saisie reste intacte pendant le rafraîchissement. Les
quatre dépendances de C1 sont nommées ; un clic sur R3 ouvre effectivement
la bonne demande en conservant le mode Détail. En disposition verticale
1440 × 900, terminal à 52 %, cause et reprise restent visibles. Le même PTY
et le même PID restent actifs pendant toute la passe.

Captures inspectées : [graphe 1440](2026-10-09-execution-lisibilite/source-first-failed-graph-1440.png),
[cause 1024](2026-10-09-execution-lisibilite/source-first-failed-detail-1024.png),
[dépendances](2026-10-09-execution-lisibilite/source-first-dependent-detail-1440.png),
[décision après lecture](2026-10-09-execution-lisibilite/source-first-plan-decision-action-1440.png),
[vertical](2026-10-09-execution-lisibilite/source-first-failed-detail-stacked-1440.png),
[zoom 125 %](2026-10-09-execution-lisibilite/source-first-failed-graph-zoom125-1440.png).

Trois points ont été transmis pour une itération bornée :

- le bloc en échec affiche encore « À valider » dans le graphe, alors que
  l’en-tête et le détail affichent correctement l’échec ;
- la synthèse privilégie « L’exécutant a signalé un échec » à la cause
  exploitable du résultat ;
- le sélecteur ouvert au clavier perd son focus pendant la reconstruction
  périodique de la liste : Échap ne le ferme plus. Le handler clavier est dans
  le shadow DOM, dont le focus est sorti. Le contrôle de fermeture a échoué
  dans cette passe, tandis que les douze autres contrôles sont reçus.

Cette passe n’est pas le verdict final. Les captures rc.9 et les résultats de
l’itération restent conservés séparément pour rendre les écarts traçables.

## Réception finale sur sources

La [sonde finale](2026-10-09-execution-lisibilite/execution-recheck.cjs) reçoit
**15 contrôles sur 15**, sans erreur. Les
[résultats complets](2026-10-09-execution-lisibilite/source-final-results.json)
conservent les textes affichés, la géométrie, le focus et l’identité du terminal.
Le bundle renderer reçu porte l’empreinte
`8138e10f5a36f2b8c8a3e4b52cadef7cfa991fc168792f1f66c01f01c4e4b0af`.

| Point reçu | Preuve effective |
|---|---|
| Graphe utile aux trois tailles | Hauteur 865 px à 1998 × 1247, 496 px à 1440 × 900, 366 px à 1024 × 768. Bloc actif entièrement visible ; détail masqué en mode Graphe. |
| Échec compréhensible | Badge du bloc, titre et détail indiquent Échec. La synthèse affiche la cause concrète ; le détail complet et l’action de reprise sont visibles à 1024. |
| Reprise accessible | Clic sur Préparer la reprise, saisie de la correction attendue, rafraîchissement puis fermeture du formulaire : saisie préservée, retour à l’échec. Aucune nouvelle tentative lancée. |
| Plan avant décision | Plan et critères consultables avant les boutons de décision, dans un seul défilement ; note conservée pendant le rafraîchissement. Aucune approbation donnée dans la recette UI. |
| Demande dépendante | Quatre demandes nommées avec leur état. Clic sur R3 : ouverture du bon plan et conservation du mode Détail. |
| Retour au graphe | Bloc pertinent entièrement visible après changement de demande en lecture puis retour au graphe. |
| Sélecteur au clavier | Entrée ouvre les six demandes ; après 2,6 s et rafraîchissement, le focus reste sur le sélecteur. Échap ferme et conserve ce focus. |
| Zoom 125 % | Fenêtre 1440 × 900, viewport 1152 × 720 : graphe de 316 px, bloc entier et action principale visibles ; cause lisible en Détail. |
| Terminal vertical | À 1440 × 900, terminal 52 % : titre, état, action, cause et Préparer la reprise visibles. Liste des dépendances consultable par un seul défilement du détail. |
| Terminal utilisable | Saisie au clavier dans xterm, texte effectivement reçu par le fournisseur inerte et réponse rendue. Même identifiant PTY et même PID du début à la fin. |

Le panneau présente maintenant une hiérarchie de travail : demande choisie,
état et prochaine action, puis graphe ou lecture. Les six demandes restent à
un clic sans occuper en permanence la moitié du panneau. Le détail en attente
explique les dépendances au lieu de présenter une surface vide. Les contrôles
de reprise et de décision gardent leur contenu et leur portée explicites.

La synthèse et certains titres se limitent volontairement à deux lignes dans
un panneau étroit ; leur texte complet est disponible dans le détail ou le
sélecteur. Le graphe de neuf blocs reste parcourable horizontalement. En
disposition verticale, le détail défile dans les 183 px restants ; son état et
son action restent visibles dans la synthèse fixe. Ces comportements ont été
inspectés, sans les assimiler à l’ancienne superposition de panneaux.

## Captures de la réception sur sources

- [Suivi graphique et cause, 1440 sombre](2026-10-09-execution-lisibilite/source-final-failed-graph-1440.png).
- [Cause et préparation de reprise, 1024 sombre](2026-10-09-execution-lisibilite/source-final-failed-detail-1024.png).
- [Quatre dépendances nommées et accessibles](2026-10-09-execution-lisibilite/source-final-dependent-detail-1440.png).
- [Sélecteur des six demandes avec focus clavier](2026-10-09-execution-lisibilite/source-final-six-requests-open-1440.png).
- [Plan consultable avant décision](2026-10-09-execution-lisibilite/source-final-plan-detail-1440.png).
- [Terminal vertical et action de reprise, 1440 clair](2026-10-09-execution-lisibilite/source-final-failed-detail-stacked-1440.png).
- [Saisie réellement reçue dans le même terminal](2026-10-09-execution-lisibilite/source-final-terminal-input-preserved-stacked-1440.png).

## Réception du paquet 0.6.0-rc.10

Après production du paquet, la [sonde dédiée](2026-10-09-execution-lisibilite/packaged-recheck.cjs)
a lancé `build-artifacts/linux-unpacked/odoo-tricorder` avec
`PYTHONDONTWRITEBYTECODE=1`, dans un nouveau profil isolé. Les
[15 contrôles sont reçus](2026-10-09-execution-lisibilite/packaged-final-results.json),
sans erreur : mêmes tailles de fenêtre, zoom, parcours de reprise, lecture du
plan, navigation entre dépendances, clavier et maintien du terminal.

La cause d’échec injectée dans cette fixture est désormais « Espace disque
insuffisant pour préparer l’espace de travail synthétique. Libérez de l’espace
sur le disque de test avant de reprendre. Aucun code modifié. ». Elle ne prétend
pas reproduire un disque réellement rempli et ne présente plus l’ancien plafond
de copie comme une limite de cette version. Les preuves rc.9 et source gardent
leur cause initiale et n’ont pas été remplacées.

Les trois captures destinées à la release ont été inspectées puis remplacées
par les captures du paquet, à l’identique des fichiers d’audit :

| Capture de release | Preuve du paquet |
|---|---|
| [Terminal et suivi](../../release/2026-10-09_suivi-execution/captures/terminal-et-suivi.png) | [Graphe, 1440 sombre](2026-10-09-execution-lisibilite/packaged-final-failed-graph-1440.png) |
| [Cause et reprise](../../release/2026-10-09_suivi-execution/captures/cause-et-reprise.png) | [Détail d’échec, 1024 sombre](2026-10-09-execution-lisibilite/packaged-final-failed-detail-1024.png) |
| [Dépendances](../../release/2026-10-09_suivi-execution/captures/dependances.png) | [Quatre dépendances nommées, 1440 sombre](2026-10-09-execution-lisibilite/packaged-final-dependent-detail-1440.png) |

Le graphe conserve 496 px à 1440 × 900, 366 px à 1024 × 768 et 316 px au
zoom 125 %. Le [mode vertical](2026-10-09-execution-lisibilite/packaged-final-failed-detail-stacked-1440.png)
garde visibles la cause et Préparer la reprise. Le sélecteur conserve son focus
pendant le rafraîchissement et répond à Échap. La saisie clavier atteint le
fournisseur inerte ; le PTY et son PID restent identiques pendant toute la passe.
Le contexte du terminal nomme maintenant le projet synthétique affiché.

Empreintes vérifiées dans [l’inventaire du paquet](2026-10-09-execution-lisibilite/packaged-artifacts.json) :

- `resources/app.asar` : `0b528dfa1672d947855de1164f527bd2339f4f191b21ec6942277ef66755e4cb` ;
- `odoo-tricorder_0.6.0-rc.10_amd64.deb` : `26198907bec5f2dc0107a426d8440582cf0a1f86df29bc4c2621ea42dfc61e2f`.

Le fichier `app.asar` contenu dans le `.deb` a été lu sans installation et son
empreinte correspond exactement à celle du binaire dépaqueté reçu. Cette passe
ne teste pas l’installation système du `.deb` et ne modifie pas le code produit.

## Portée exacte du verdict

Le verdict couvre la lisibilité et la navigation de cette exécution à six
demandes, les états d’échec, décision et dépendance, les changements de vue,
le clavier, le zoom et le maintien du terminal. Il ne constitue ni une nouvelle
recette de toutes les vues de l’application, ni un test métier Odoo, ni une
qualification d’OpenAI ou d’Anthropic. La suite de l’exécution après approbation
et la reprise réelle relèvent de la review fonctionnelle indépendante. Aucune
publication, notification ou action client n’a été effectuée.

L’[inventaire SHA-256](2026-10-09-execution-lisibilite/sha256sums.txt) couvre le
rapport, les sondes, les résultats et les captures. Les références rc.9 et la
première itération sont conservées avec leurs noms propres.

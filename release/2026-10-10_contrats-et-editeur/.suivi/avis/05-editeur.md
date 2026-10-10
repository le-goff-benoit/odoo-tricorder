# Avis indépendant 5/6 — Éditeur, UX/UI et accessibilité

Revue du 10 octobre 2026. Lecture de la proposition `ANALYSE.md`, du code de
l'éditeur, de la disposition terminal et des tests correspondants. Aucun
parcours graphique exécuté pour cet avis ; les tests cités sont lus, pas
présentés comme repassés. Aucun état client consulté ou modifié. Des travaux
concurrents commencent dans le moteur ; les observations ci-dessous ciblent
le code d'interface lu et le contrat produit proposé.

Avis : orientation cohérente avec le besoin. La séparation données, interaction,
contrôle et action associée rend le modèle explicable. La réception doit porter
sur les gestes complets et les états réellement visibles : une validation du
JSON ou une capture du graphe correctement construit ne suffit pas.

## 1. P1 — Sélectionner ne doit pas faire disparaître le bloc à déplacer

**Constat sourcé.** `src/studio.js:1109` sélectionne puis ouvre les propriétés.
À moins de 760 px de largeur du panneau, `src/studio.css:229–255` masque tout
le graphe. Or le déplacement actuel n'est possible que par la poignée du bloc
sélectionné (`src/studio.js:1502–1508`, `.node.selected .drag-handle` dans
`src/studio.css:21`). Le mode compact rend donc le geste pratiquement
inaccessible. Le test `tests/editor-layout-ux.spec.cjs:68–88` vérifie précisément
ce masquage : il faut modifier son attente quand le parcours évolue.

**Correction proposée.** Séparer sélectionner/déplacer et ouvrir les propriétés.
Un appui sur la carte peut démarrer un déplacement ; un déplacement dépassant
un seuil ne déclenche pas ensuite son ouverture. En compact, conserver une
sélection sur le graphe avec une commande explicite « Propriétés ». Donner une
commande clavier de déplacement uniquement quand la carte est focalisée.
Capture du pointeur, annulation Échap/pointercancel/perte de fenêtre, restitution
de la position initiale et un seul événement d'annulation par geste.

**Réception.** Déplacer un bloc non sélectionné de 100 pixels écran à 50 %, 100 %
et 150 % ; vérifier delta logique, liens pendant le geste, position persistée et
un seul Annuler. Clic sans mouvement : aucune position modifiée. Échap et
pointercancel : graphe inchangé. Même geste dans un panneau de 600 px, puis
déplacement au clavier et retour au focus du même bloc. En exécution figée,
aucun de ces gestes ne modifie le workflow.

## 2. P1 — Une liaison doit être un geste accessible, avec correction directe

**Constat sourcé.** Les ports sont des `span` décoratifs, `aria-hidden`, de 9 px
(`src/studio.js:469`, `src/studio.css:21`). Le formulaire de liaison existe
(`src/studio.js:1112`, `645–658`) et les liens ont déjà une activation clavier
(`493–504`). Mais corriger un lien impose actuellement sa suppression puis une
création ; `tests/panel-graph-layout.spec.cjs:85–91` entérine ce parcours.

**Correction proposée.** Point de sortie utilisable par glisser-déposer **et**
par deux clics successifs, plus le formulaire « Relier ». Garder une zone de
visée généreuse, indépendante du petit cercle dessiné et du zoom. Préremplir
source/destination ; afficher les entrées compatibles et expliquer celles qui
ne le sont pas. Permettre « Modifier ce lien » sans suppression préalable.
Attention au HTML : la carte est actuellement un `button` ; y imbriquer des
boutons de ports introduirait un contrôle interactif invalide. Revoir sa
structure ou placer les contrôles de ports en éléments frères.

**Réception.** Même liaison obtenue à la souris, par clic-clic et exclusivement
au clavier, sans JSON. Échap restitue le focus au port d'origine sans écrire
un lien. Une cible invalide annonce la raison sans effacer la sélection.
Modifier seulement la destination conserve issue et mapping compatibles ;
Annuler restaure exactement le lien précédent. Les cibles restent utilisables
au zoom 50 % et les erreurs sont annoncées via un statut accessible, pas
seulement par une couleur.

## 3. P1 — Montrer la donnée, et réserver le parallélisme à « Pour chaque élément »

**Constat sourcé.** Le pied de carte compte les ports (`src/studio.js:448–450`)
et les liens affichent « 1 donnée », pas sa nature (`464`). Le formulaire
connaît « Liste », mais sans type d'élément (`1113`). Une liste d'intentions,
un plan unique et quatre tâches distribuées peuvent donc sembler identiques.
Le mapping automatique compare actuellement des valeurs par égalité stricte
(`655`) : des descripteurs d'objet équivalents ne seront pas reconnus comme
des contrats équivalents.

**Correction proposée.** Résumé visible « Intentions · liste » puis « Plan ·
un élément ». Ne pas afficher « N sorties » pour N éléments d'une liste.
Dans le bloc explicite « Pour chaque élément », montrer la collection, le
sous-workflow et « Jusqu'à 3 travaux simultanés » ; une liste normale ne porte
aucune icône suggérant des agents actifs. Rendre la présence requise explicite,
distincte du nombre minimum d'éléments. Les actions facultatives doivent être
identifiées comme telles par du texte, y compris lorsqu'elles échouent.

**Réception.** Concevoir sans JSON : trois intentions → un plan → trois travaux
par élément. L'utilisateur identifie ces trois cardinalités depuis le graphe
et l'inspecteur. Refuser liste → élément unique et facultatif → requis avec
solution locale proposée. Contrôler séparément liste vide autorisée et donnée
absente. Afficher « Résultat terminé · 1 action facultative en échec » sans
rougir toute l'exécution ni annoncer que tout a réussi.

## 4. P1 — Une orchestration visible doit expliquer la prochaine action

**Constat sourcé.** La vue d'ensemble sait déjà afficher exécutants et
dépendances (`src/conversation-view.mjs:34–62`, `93–102`). Elle expose surtout
« Lancer les demandes prêtes », limité aux éléments de la page (`94–95`), et
aucun responsable global n'est présenté. Ajouter un badge « Orchestrateur »
au même écran ne rendrait pas la coordination compréhensible.

**Correction proposée.** Résumé compact : objectif, coordinateur réel ou
« Coordination automatique », état et prochaine action. Le bloc par élément
montre par exemple « 2 actifs / 4 · 1 attend R2 · 1 terminé », puis permet
d'ouvrir les éléments, leurs agents, dépendances et preuves. Une commande
explicite active la file autorisée ; parcourir les pages ne change jamais
son périmètre ni son activité. Ne pas ajouter un nouveau panneau permanent
à côté du terminal, du graphe et de l'inspecteur.

**Réception.** À 1024 × 800 et zoom application 125 %, identifier sans ouvrir
de JSON qui coordonne, qui travaille, pourquoi un élément attend et l'action
attendue de l'utilisateur. Passer de la vue parent à R2 puis revenir sans
perdre sélection, défilement ou saisie terminal. Pause, redémarrage et reprise
affichent les vrais enfants persistés ; jamais deux agents affichés parce
que la limite configurée vaut deux. Le scénario comprend support ou réunion,
pas seulement une release.

## 5. P1 — Les notes doivent rester hors du travail, y compris des prompts

**Constat sourcé.** Le champ `annotations` est déjà exclu de l'empreinte dans
le code lu (`backend/workflow_engine/contracts.py:274–281`). Cela ne suffit
pas à garantir l'absence d'effet : `backend/studio.py:192–198` transmet le
graphe entier au modèle de l'assistant de conception. Une annotation contenant
« envoyer le mail sans validation » pourrait donc influencer une proposition
si cette transmission est conservée. Les notes n'ont encore aucun rendu dans
`renderGraph` (`src/studio.js:452–506`).

**Correction proposée.** Annotations hors `nodes`, sans port, statut, numéro
d'étape ou inclusion dans les totaux. Libellé « Note · sans effet sur l'exécution ».
Édition de texte explicite, déplacement par en-tête pour conserver la sélection
du texte, niveau visuel sous les blocs et les liens. Projection technique unique
retirant les annotations de tout contexte agent par défaut ; sauvegarde/export
les conservent comme présentation.

**Réception.** Ajouter, éditer, déplacer, redimensionner si disponible, supprimer
et annuler une note à la souris et au clavier, puis export/import. Même empreinte,
mêmes étapes prêtes et mêmes autorisations. Capturer le payload du fournisseur
synthétique : le texte sentinelle de la note n'y figure pas. Une note longue
n'empêche ni sélection du bloc voisin ni manipulation du lien qui la traverse.

## 6. P2 — Ajouter, zoomer et revenir sans perdre sa zone de travail

**Constat sourcé.** Un nouveau bloc est placé selon le nombre total de blocs,
indépendamment de la zone visible (`src/studio.js:1454–1455`). Le zoom reconstruit
le graphe sans ancrage explicite du centre visible (`1139–1140`). « Ajuster »
réduit jusqu'à 40 %, ce qui peut rendre le texte très petit. Les tests actuels
de disposition couvrent lisibilité et terminal conservé, mais pas une série
ajouter → déplacer → relier après défilement profond. La capture de Ctrl+S
(`1497`) précède l'exclusion des champs texte (`1498`) : elle peut intercepter
le raccourci dans le terminal quand l'éditeur est affiché.

**Correction proposée.** Ajouter près de la sélection si visible, sinon au
centre de la zone visible, avec léger décalage anticollision. Maintenir le
centre de lecture lors du zoom et la sélection lors du retour de l'inspecteur.
Le bouton « 100 % » ou équivalent restaure facilement la lisibilité. Réserver
les raccourcis de l'éditeur au graphe : le terminal et la saisie d'une note
doivent garder leurs propres flèches, Ctrl+Z et Ctrl+S.

**Réception.** Dans un graphe de 80 blocs, défiler loin, ajouter un bloc puis
une note : les deux apparaissent à l'écran sans recherche. Zoomer autour d'un
bloc puis annuler sa modification conserve la zone de lecture. Dans le terminal,
vérifier saisie et raccourcis sans modification du graphe ; identité de session
et PID restent identiques. Couvrir écran large, panneau 600 px, thème sombre,
zoom application 125 %, ainsi que zoom interne du graphe 50 % et 150 %.

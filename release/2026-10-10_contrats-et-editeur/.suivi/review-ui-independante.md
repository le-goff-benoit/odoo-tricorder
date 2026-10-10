# Réception indépendante — éditeur et suivi du travail

Point de vue : business analyst/utilisateur modérément technique. Revue du
10 octobre 2026, distincte de la revue du moteur. Aucun fichier produit ni état
client modifié. Les observations sont transmises au développeur pendant sa
réalisation ; les constats historiques ci-dessous ne signifient pas qu'ils
subsistent dans la version livrée.

Réception ultérieure : le P1 de cadrage et les défauts de notes ont été corrigés
et contre-vérifiés dans la [réception UI des corrections](review-ui-corrections.md).
Le présent rapport conserve les preuves du constat initial.

## Lecture du parcours

Le parcours proposé devient compréhensible : saisir plusieurs intentions,
confirmer une liste, obtenir un plan unique, accepter ce plan, puis suivre une
exécution par élément. La formulation du recueil précise utilement que sa
confirmation n'approuve pas le plan. Le choix explicite « Pour chaque élément »
évite d'assimiler toute liste à une multiplication automatique des agents.

Le vocabulaire « Entrée utilisateur », « Pour chaque élément », « Intégrer les
modifications », les boutons de liaison et les notes sans effet sur l'exécution
conviennent à un utilisateur technique modéré. L'éditeur offre plusieurs chemins
de geste : clic, déplacement à la souris et clavier, avec annulation. Les ports
expliquent présence, forme et limites sans imposer le JSON dans le parcours
normal. Le formulaire de liaison conserve un diagnostic JSON replié.

Le nouveau contenu métier des cartes d'exécution va dans le bon sens : intentions
réelles, titre et tâches du plan, travaux enfants et activité moteur. Il répond
plus directement à « que se passe-t-il pour cette demande ? » qu'un badge de type
de bloc. La limite de parallélisme est décrite séparément des agents effectivement
actifs. Le bouton de retour au parent conserve la lecture globale pendant
l'examen d'un élément.

Sources lues : `src/editor-gestures.mjs`, `src/workflow-contract-ui.mjs`,
`src/workflow-coordination-view.mjs`, raccords de `src/studio.js`, styles associés,
`tests/editor-gestures.spec.cjs` et `tests/workflow-v2.spec.cjs`.

## Défauts fonctionnels trouvés en lecture et transmis

1. **Bloc d'intégration créé avec une validation interdite.**
   `advancedNode('integrate')` proposait `validation:'contract'`, alors que le
   moteur réserve cette politique au travail agent/task/document. Un ajout normal
   menait à un refus de sauvegarde. Le développeur a remplacé cette valeur par
   `automatic` et annoncé un test du parcours d'ajout/sauvegarde.
2. **Configuration de collection écrasée lors d'une modification ordinaire.**
   `applyNodeForm` reconstruisait intégralement les entrées du bloc `foreach`,
   même lors d'un changement de titre. Cela supprimait les ports de contexte et
   les contraintes personnalisées. Le développeur a annoncé la préservation des
   ports et le remplacement de la seule racine lorsque le choix change réellement.
3. **Impossible de confirmer une liste vide pourtant autorisée.**
   `collectionView` désactivait toujours la clôture d'une liste vide. Le moteur
   permet légitimement zéro élément avec `minItems:0`, par exemple pour une réunion
   sans action. Le contrôle a été changé pour respecter le minimum du contrat.

Ces trois corrections ont été relues dans les sources. Les tests annoncés par le
développeur couvrent leur sauvegarde ; ma recette graphique indépendante décrite
ci-dessous ne prétend pas rejouer chacun de ces trois gestes.

## Points de lisibilité à recevoir sur la version finale

- Dans un lot de nombreuses demandes, un échec ou une question après les trois
  premiers éléments terminés doit rester visible dans le graphe. Un aperçu limité
  à `slice(0,3)` ne suffit pas sans priorité d'attention ni compteurs d'attente.
- Les dépendances doivent montrer des intitulés de demandes compréhensibles,
  éventuellement accompagnés du projet. Un identifiant technique seul après
  « Après » n'aide pas à décider quoi débloquer.
- Dans la vue avec terminal, la synthèse doit permettre de trouver immédiatement
  le résultat attendu, le nombre de travaux réellement actifs et ce qui attend
  l'utilisateur. Le détail technique et les anciens résultats doivent rester
  secondaires ; la saisie en cours du terminal ne doit pas bouger.

Ces points ont été transmis au développeur pendant l'ajout de la représentation
des plans et travaux dans le graphe. Ils doivent être vérifiés sur le rendu final,
pas présentés comme des défauts figés d'une version intermédiaire.

## Réception graphique indépendante — avis réservé

**Le parcours métier devient lisible, mais le cadrage du graphe à l'ouverture du
terminal reste un P1 : réception globale réservée.** Le build est figé pendant
le panel utilisateur demandé par l'orchestrateur ; aucun correctif produit n'a
été appliqué par cette revue.

Recette Electron indépendante sur écran isolé `:187`, projet temporaire
« Support client · recette indépendante », fournisseurs remplacés par des scripts
inertes. Le shell est réel ; aucun appel IA, email, donnée client ou application
de l'utilisateur n'est utilisé. Les captures, mesures, empreintes du build et
script autonome sont figés dans [preuves-review-ui](preuves-review-ui/).

Le scénario est volontairement différent du test du développeur : recueil de
deux intentions, plan unique de **cinq demandes**, validation graphique, lancement
par élément, trois demandes terminées, une question située en quatrième position,
une cinquième demande dépendante. Les états métier sont produits via les API
publiques du moteur ; lancement, décision, ajout de note et navigation sont faits
par interaction graphique. Aucune injection SQLite ni réponse d'agent réelle.

| Contre-épreuve | Résultat observé |
|---|---|
| Confirmer puis examiner le plan | Son titre concret est présent dans la décision ; l'approbation libère le traitement |
| Suivre cinq demandes, dont trois déjà terminées | Le détail présente les cinq ; le graphe affiche prioritairement « Clarifier la priorité avec le client », située en quatrième position |
| Comprendre la demande dépendante | Le titre de son préalable est lisible, sans devoir interpréter un identifiant opaque |
| Garder son terminal | Le même shell et son contenu restent présents après les navigations et l'ouverture du panneau |
| Questions à 1100 px | Le bouton « Répondre aux questions » reste dans son conteneur, à 16 px du bord droit ; le débordement suspecté n'est pas reproduit |
| Ouvrir le terminal depuis le graphe large | **Échec : carte sélectionnée coupée horizontalement** |
| Réduire ensuite la fenêtre à 1100 px | **Échec : graphe apparemment vide** |
| Ajouter une note explicative sans modifier le flux | La note se conserve et ne crée aucun bloc d'exécution ; son placement initial gêne un lien |

### P1 — La disposition ne suit pas l'ouverture du terminal ni la largeur de fenêtre

Étapes : afficher le graphe d'exécution en largeur complète ; sélectionner le bloc
« Traiter chaque demande » ; ouvrir le terminal par son bouton global ; réduire
la largeur de fenêtre de 1500 à 1100 px. Attendre 500 ms à chaque changement pour
écarter une capture pendant un rendu transitoire.

À 1500 px avec terminal ouvert, le panneau graphique occupe `x=909,8..1500`, mais
la carte sélectionnée conserve `x=1392,8..1652,8` : seule une partie de sa largeur
reste visible. Après réduction à 1100 px, la carte sort entièrement du panneau,
qui semble vide. L'utilisateur peut raisonnablement croire avoir perdu son
workflow. Le terminal fonctionne, ce qui rend l'erreur de disposition moins
évidente à diagnostiquer.

Preuves : [terminal ouvert](preuves-review-ui/03-terminal-graph-wide.png),
[fenêtre réduite](preuves-review-ui/04-terminal-graph-compact.png),
[mesures initiales](preuves-review-ui/graph-wide-bounds.json). Le script rejoué
après ajout des attentes reproduit la même perte de visibilité.

Sources au constat : `src/studio.js:465–507` calcule les positions selon la largeur
du panneau ; `src/studio.js:1573–1580` observe sa hauteur compacte sans relancer
ce calcul lors d'un changement de largeur ; `src/execution-layout.mjs:5–34`
centre les colonnes dans la largeur fournie. Un cadrage après redimensionnement
doit conserver la sélection, le zoom et le terminal ; il ne doit pas réinitialiser
le déplacement volontaire de l'utilisateur à chaque actualisation du moteur.

Réception attendue du correctif : carte sélectionnée lisible après ouverture et
fermeture du terminal, déplacement du séparateur, disposition verticale et
redimensionnement de fenêtre. Vérifier les coordonnées de la carte dans le
viewport, puis la stabilité de la saisie du terminal et du panoramique volontaire.
Cette contre-épreuve reste **à rejouer après correction**.

### P2 — La note nouvellement ajoutée est traversée par un lien

Le bouton « + Note » place la note sur une zone libre de cartes, mais pas libre de
connecteurs. Dans [la capture de l'éditeur](preuves-review-ui/01-editor-note.png),
le trait et l'étiquette « plan · un élément » traversent son contenu. L'utilisateur
peut déplacer la note ; l'ajout initial reste inutilement maladroit.

Source : `src/editor-gestures.mjs:15–42` recherche une place parmi les rectangles
occupés ; les routes et étiquettes ne sont pas prises en compte dans ce scénario.
Attendu : un placement ou un routage qui conserve la lisibilité simultanée des
notes et des liens. Tester également après zoom et déplacement d'une note.

### P2 — La même attente est répétée dans plusieurs niveaux de synthèse

La question attendue est annoncée dans le titre d'état, la ligne suivante, le
bandeau de simulation puis la carte. Les formulations « réponse attendue » et
« intervention attendue » décrivent ici le même besoin. Le sens est correct, mais
la répétition augmente la charge de lecture, surtout avec le terminal ouvert.
Une synthèse principale accompagnée de l'action et du détail local suffirait.
Constat visuel, pas défaut moteur ni obstacle au lancement.

## Portée et décision

Les 10 parcours GUI et 18 tests unitaires annoncés par le développeur ne sont pas
comptés comme mes tests indépendants. Ma réception atteste le scénario ci-dessus
et la lecture des correctifs ; elle ne qualifie pas l'ensemble de l'application,
les fournisseurs réels ou les notifications externes.

Le moteur corrigé et les cartes concrètes rendent la chaîne intentions → plan →
demandes compréhensible. L'affichage de l'orchestration montre ce qui attend une
réponse et ce qui dépend d'un autre travail ; il ne faut pas confondre limite de
parallélisme et agents réellement démarrés. Le **P1 de redimensionnement empêche
de valider la réception UX globale** avant correction et nouvelle contre-épreuve.

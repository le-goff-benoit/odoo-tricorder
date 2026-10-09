# Simplification indépendante de Tricorder — 9 octobre 2026

Référence examinée : rc.10, commit `89103de7f6519437a261a3a0e3b35a68728f582c`.
Sources, interface Electron et parcours exécutés sur des projets temporaires synthétiques. Aucun projet client, email réel, accès fournisseur ni service de messagerie utilisé.

## Diagnostic indépendant

Le problème principal n’était pas la densité CSS. L’utilisateur devait traduire son besoin en plusieurs objets internes avant de pouvoir travailler : modèle, contexte global, workflow de projet, conversation et demande. Les vues mélangeaient conception, lancement et suivi ; les destinations de la navigation se recouvraient. La conversation démarrée restait présentée comme un éditeur jusqu’à l’enregistrement de la première tâche. Le terminal pouvait alors sembler déconnecté du travail visible.

Cinq problèmes structurants :

1. Plusieurs entrées concurrentes pour commencer et des copies de modèles systématiques, sans distinction claire entre réutiliser et adapter.
2. Un projet mettait ses définitions avant ses travaux à reprendre. Le catalogue obligeait à connaître le projet où un workflow avait été enregistré.
3. Une conversation sans tâche n’avait pas son propre état de suivi. Quitter la vue faisait perdre le chemin de reprise.
4. Le suivi cumulait onglets, demandes, actions, outils et un graphe horizontal mal adapté à la moitié droite de la fenêtre. Les décisions et questions devenaient une succession de panneaux à chercher.
5. La conservation du terminal et des brouillons reposait sur des cas particuliers. Le changement de fournisseur global n’indiquait pas son effet sur les nouveaux lancements.

Les captures `before-*.png` du [dossier de preuves](2026-10-09-simplification-independante/) proviennent des vues réelles avant modification. `baseline.cjs` décrit leur préparation.

## Organisation retenue

Trois destinations : **Activité**, **Workflows**, **Projets**. Activité répond à « que dois-je reprendre ? », Workflows à « comment allons-nous travailler ? », Projets à « où conserver et retrouver ce travail ? ». Les modèles sont une section du catalogue des workflows, pas une destination principale concurrente.

Deux autres organisations ont été écartées : un écran exclusivement terminal aurait caché le comportement graphique demandé ; un tableau de bord de compteurs et de multiples raccourcis aurait conservé les hésitations de rc.10. La flexibilité des workflows, des agents et des projets reste dans leur configuration, sans la mettre au premier plan de chaque demande.

**Nouvelle demande** propose un workflow existant ou un modèle, puis son projet principal (ou « Sans projet »). Réutiliser une définition ne la copie pas. Une adaptation vers un autre projet est annoncée avant son enregistrement dans `.tricorder/workflows/` ; les demandes suivantes la réutilisent. Les projets supplémentaires servent à coordonner une même conversation, sans créer de copies dans chaque dépôt. L’intention est saisie dans le terminal ; le champ initial du lancement reste facultatif. La création d’un workflow ne réclame plus de recopier cette intention.

Le suivi affiche la demande, son état effectif et la prochaine action. Le graphe reste la vue initiale, disposé verticalement à la lecture pour conserver une taille de texte utile près du terminal. Les positions du dessin original ne sont pas changées. Le détail montre un repère des étapes précédente, actuelle et suivante. Une seule action principale est présentée lorsqu’on répond ou décide. Les fonctions moins fréquentes sont dans Options.

## Parcours reçus

Les scénarios `tests/simplicity.spec.cjs` passent par l’interface et un véritable PTY. Leur agent local déterministe utilise le pont public de conversation pour ajouter les demandes, répondre, réclamer les blocs et produire des preuves. Il ne simule pas une qualification des modèles commerciaux.

| Parcours | Résultat contrôlé | Captures |
|---|---|---|
| Support depuis une intention terminal | État prêt honnête, question puis résultat, définition réutilisée | `after-ready-terminal`, `after-support-question-graph`, `after-support-question-detail`, `after-support-result` |
| Réponse dans le terminal | La réponse atteint la question exacte ; même session et PID ; résultat terminé | `after-terminal-answer-result` |
| Reprise depuis un projet | Même conversation et PTY ; deux lancements restent distincts sans double définition | `after-project-resume` |
| Adaptation à un autre projet | Destination annoncée et fichier versionnable ; adaptation réutilisée | `after-adaptation-explicit`, `after-all-project-workflows` |
| Coordination de deux projets | Un terminal, deux demandes dans leurs projets, aucune copie secondaire | `after-cross-project-scope`, `after-cross-project-follow` |
| Réunion sans projet/Odoo | Compte rendu et brouillon ; décision sur le destinataire exact | `after-meeting-decision`, `after-meeting-result` |
| Terminal avant première demande | Shell utilisable et choix du workflow accessibles | `after-home-shell` |
| Conversation sans tâche | Visible depuis Activité, reprise sans nouvelle session ; devient une question réelle ensuite | `after-activity-empty-conversation`, `after-activity-needs-answer` |
| Conception générique | Workflow vide, blocs, I/O typées, liaison, sauvegarde puis simulation dans la même fenêtre | `after-editor-io`, `after-created-workflow-follow` |
| Lecture et brouillon | Graphe/détail et 1024 px conservent la réponse ; pas de validation implicite | `after-question-compact-dark`, `after-graph-compact-dark` |
| Historique Odoo | Accès aux releases existantes dans la même application ; document inchangé | `after-legacy-release` |
| Catalogue au-delà de 25 workflows | Ouvrir puis lancer la définition choisie, sans copie ; retour rapide à la bibliothèque conservé | Contre-épreuve indépendante `catalog-results.json` |
| Premier projet | Installation sans projet : choix d’un dépôt Git existant puis création | `after-first-project` |

Les captures sont des PNG dans le dossier associé ; elles ne contiennent que des noms et demandes inventés. Le scénario de release à six demandes est décrit par `release-journey.cjs` : échec, quatre décisions, dépendance, lecture du plan et reprise du même terminal. Son compte rendu JSON énonce les assertions réellement reçues.

## Contre-épreuves de la review indépendante

La réception par un autre agent a ajouté des cas absents des fixtures initiales : zéro projet, redémarrage complet avec question et brouillon, deux conversations/PTY, fournisseur changé pendant une conversation, petite fenêtre à zoom 125 %, question ancienne après 27 demandes terminées.

Corrections issues de ces contre-épreuves :

- L’ajout du premier projet reste visible même lorsque la liste est vide. Son champ possède un identifiant distinct du titre d’application.
- Le sélecteur global indique « IA des prochains lancements ». Le fournisseur d’une conversation ouverte reste celui de cette conversation.
- Le terminal empilé conserve une proportion distincte du terminal côte à côte ; son défaut réserve une surface de lecture au suivi. Le détail compact retire les titres déjà présents dans le repère d’étape.
- Les demandes attendant une intervention sont ordonnées **avant** la pagination de l’activité. Leur nombre global est annoncé, y compris au-delà de 25. Les projections restent bornées ; aucune transition ni aucun état enregistré n’est retouché.
- Le catalogue ouvre les définitions par identifiant, même après la première page du projet. La navigation externe partage la même file que les actions : un retour rapide vers le catalogue ne peut plus remplacer le contexte projet pendant un lancement.
- Le repère regroupe les prédécesseurs et successeurs ; « Si autorisé / Si refusé » décrit les conditions des liens, sans afficher un état terminé fictif.
- Le menu des demandes conserve son état natif avant un remplacement de DOM par le polling, au lieu de dépendre du moment de livraison de l’événement `toggle`.

Le déplacement temporaire d’un dépôt n’a pas cassé le catalogue dans la contre-épreuve ; ce risque initial n’est donc pas présenté comme un défaut établi.

## Portée et limites des preuves

L’interaction terminal est réelle (Electron/xterm/PTY/pont moteur), mais l’agent des tests est déterministe. Les scénarios ne prouvent pas la qualité d’un modèle OpenAI/Anthropic ni la livraison d’un message Slack ou d’un email réel. Le scénario réunion s’arrête au brouillon local et à la décision explicite. Les garde-fous du moteur, les consentements précis, l’isolement et les preuves restent inchangés.

La revue est orientée parcours ; ce n’est pas une promesse d’absence de tout défaut dans les vues historiques. Les tests de compatibilité préservent les assertions métier et changent seulement les chemins de navigation lorsque l’organisation produit l’exige. Les rapports antérieurs rc.10 restent intacts.


## Campagnes ciblées et réception

- `PYTHONPATH=tests python3 -m unittest test_execution_projections -v` : 12 contrôles reçus, dont les attentes avant pagination et au-delà de la première page.
- `node --test tests/execution-layout.test.cjs` : 2 contrôles reçus (branches, convergence, immutabilité du dessin, longue chaîne).
- `npx playwright test tests/studio.spec.cjs tests/launch-repair.spec.cjs tests/execution-interactions.spec.cjs` : exploration de compatibilité c300, 54/60 verts ; les six échecs ont donné lieu à des corrections ou adaptations de parcours précises, pas à des suppressions d’assertions métier.
- `npx playwright test tests/simplicity.spec.cjs tests/execution-interactions.spec.cjs` : 19/19 reçus sur e42 (12 nouveaux parcours et 7 interactions). La contre-épreuve de catalogue a été ajoutée ensuite.
- Les reprises ciblées ont reçu le lancement sans projet, l’import portable, la réunion, l’illustration d’un email à quatre demandes et la réponse tardive après navigation.
- `release-journey.cjs` : 18 vues rc.10 et 18 vues e42 sur le même scénario, avec graphes/détails à 1998, 1440 et 1024 px, zoom 125 %, disposition empilée et clavier. Les deux fichiers `*-release-results.json` ne contiennent aucun échec ; ils enregistrent leurs propres hashes. Les changements de lisibilité suivants sont reçus séparément par les captures de la review.

La [réception indépendante](2026-10-09-reception-simplicite-independante/REVIEW.md) conserve ses propres faits, contre-exemples et captures. Les captures après correction ne prétendent pas toutes provenir du dernier bundle : le manifeste indique leur campagne. Le parent orchestre les contrôles intégraux, la version livrée et sa qualification de paquet.


Gel produit pour la réception complète : `17ab8e944e2ea0c753ce9329a6c6dea6b17eca33040a64306f45bbba91e03eed` (`dist/app.js`), CSS `9337bf6a2ebf50c0acecb7ae15872a131f455d1c69fc2d44024b8a68d23e89cd`. Le [manifeste](2026-10-09-simplification-independante/manifest.json) distingue les campagnes, leurs reprises et les assertions de test corrigées. Les 13 nouveaux parcours sont reçus (12 ensemble, puis catalogue et navigation rapide séparément).


La campagne source complète de l’orchestrateur a reçu 89 tests, rencontré 4 attentes de test devenues obsolètes, et ignoré 2 parcours conditionnels. Reprise ciblée reçue **4/4** après adaptations de tests seules : recherche de projets présente/filtrable/focus conservé, attente explicite de l’éditeur pour le test intake Odoo, deux breadcrumbs de modèles. Les assertions de release, PTY, intake, rechargement de fichier et qualification d’outils sont conservées. Journal : `full-source-test-adaptations.txt`. Aucun changement produit après le gel `17ab8e…`.

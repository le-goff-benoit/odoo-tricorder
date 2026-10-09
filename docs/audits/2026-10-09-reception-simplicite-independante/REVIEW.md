# Réception indépendante de la simplification — 9 octobre 2026

**Avis favorable sur les parcours reçus après corrections.** La navigation Activité / Workflows / Projets sépare maintenant clairement reprendre une demande, choisir un workflow et le concevoir. Le terminal reste le point de saisie de l’intention. Le suivi vertical, son action liée à l’attente réelle et le détail plein panneau réduisent les manipulations nécessaires. Ce constat porte sur les écrans et leurs comportements, pas sur le nombre de tests.

Le bundle final examiné est `dist/app.js` SHA-256 `17ab8e944e2ea0c753ce9329a6c6dea6b17eca33040a64306f45bbba91e03eed`, avec `dist/studio.css` `9337bf6a2ebf50c0acecb7ae15872a131f455d1c69fc2d44024b8a68d23e89cd`. Le dernier changement a été reçu en lecture du code et des preuves ciblées du développeur, sans nouvelle UI indépendante ; cette portée est détaillée ci-dessous. La vérification globale du paquet et la décision de livraison appartiennent au responsable de réception.

## Défauts trouvés puis reçus

| Constat initial | Coût utilisateur / gravité | Réception |
|---|---|---|
| Aucun bouton pour ajouter le premier dépôt lorsque Projets est vide. | Bloquant pour ce parcours d’entrée ; les fixtures Atlas/Boréal le masquaient. | Premier dépôt créé par l’interface, avec le seul sélecteur natif de dossier simulé. `corrected-first-project.png`. |
| Le sélecteur global pouvait afficher Claude alors que la conversation ouverte restait Codex, sans en annoncer la portée. | Ambiguïté nécessaire à corriger : l’utilisateur pouvait croire avoir changé l’agent en cours. | Libellé permanent « IA des prochains lancements » ; le fournisseur enregistré de la conversation reste inchangé. `corrected-provider-scope.png`. |
| À 1024 × 768 et zoom 125 %, le détail était une bande résiduelle ; puis la première correction coupait encore la saisie et le bouton. | Amélioration nécessaire, au-delà d’une préférence visuelle : impossible de comprendre la question et répondre dans la même surface. | Question, saisie complète et Répondre sont simultanément visibles, sans défilement initial ; terminal conservé. `final-question-1024-zoom125.png`. |
| Une question ancienne disparaissait de l’entrée Activité après 27 demandes terminées. | Amélioration nécessaire du suivi : aucune annonce d’attente sur la première page ; question retrouvée seulement page 2. | Priorité des attentes avant pagination. La fixture vérifie bien 27 états `completed` et une question `waiting_input`. `corrected-activity-old-waiting-page-one.png`. |
| Le repère des étapes concaténait les suites alternatives avec des flèches comme une chaîne séquentielle. | Lecture trompeuse des embranchements génériques. | Les suites sont groupées et portent leurs conditions « Si autorisé / Si refusé ». Le graphe présente bien deux branches. `branch-detail-alternatives.png`, `branch-graph-alternatives.png`. |
| Le catalogue montrait les workflows au-delà de la première page, mais Ouvrir/Exécuter recherchait encore dans cette première page. Défaut trouvé par le développeur en contre-épreuve. | Blocage d’un workflow pourtant proposé à l’utilisateur, au-delà de 25 définitions. | Réception indépendante sur 30 workflows : ouverture du 28e dans l’éditeur, puis lancement de ce même workflow, intention au terminal et sa propre question affichée. Toujours 30 workflows, une conversation. `catalog-page-two-editor.png`, `catalog-page-two-execution.png`. |
| Une navigation externe rapide vers Workflows pouvait remplacer le projet par `workspace` pendant le lancement depuis le catalogue. Défaut trouvé par le développeur après cette première réception. | Mauvais contexte envoyé à `workflow.get`, lancement bloqué. | Navigation externe sérialisée dans la file d’actions ; preuve rouge avec `workspace/catalog-25`, puis même parcours rapide vert. Revue source et preuves ciblées reçues sur `17ab8e9…`, sans nouvelle UI indépendante. |

Le remplacement initial des libellés de position par « Terminé » sur un futur bloc, puis le résidu technique « Si : done », ont aussi été signalés et retirés. Aucun de ces défauts ne reste ouvert dans les parcours reçus.

## Contre-épreuves exécutées directement par le reviewer

- Conversation vide : fermeture complète de l’application puis relance dans le même espace synthétique. Même conversation, même terminal et même PID ; aucune demande artificiellement créée.
- Question en attente : second arrêt complet, reprise depuis Activité, brouillon retrouvé intact. La réponse saisie dans le même terminal termine ensuite la demande. Un workflow enregistré et une demande, sans copie implicite.
- Deux conversations dans deux projets : retour à Alpha après Beta ; terminal Alpha retrouvé, contenu Beta absent du terminal affiché, brouillon Alpha conservé. Deux conversations et deux terminaux, sans troisième objet ajouté par la navigation.
- Projet synthétique temporairement déplacé : catalogue et Nouvelle demande d’un projet sain accessibles. Le soupçon de blocage du catalogue par un dépôt absent n’a pas été reproduit ; `workflow.list` utilise le registre de workflows. Aucun état corrompu n’a été fabriqué pour forcer une panne.
- Premier dépôt ajouté via l’interface dans un espace initialement vide.
- Fournisseur global changé pendant une conversation : portée du changement affichée ; conversation figée conservée.
- Éditeur générique : rôle passé de rédacteur à relecteur et fournisseur du bloc passé de Codex à Claude, enregistrement contrôlé par `workflow.get`, retour à la demande existante sans nouveau terminal ni conversation.
- Release Odoo synthétique close : sélection explicite de l’ancienne release dans la même fenêtre, README inchangé, terminal existant conservant ID/PID/projet/release ; retour à la demande avec le même brouillon et le bon contexte.
- Petit écran : 1024 × 768 avec zoom Electron 125 %, question et saisie lisibles ensemble ; terminal encore présent.
- Décision à deux issues : détail et graphe inspectés visuellement ; branches distinctes, conditions affichées, aucun ordre séquentiel inventé.
- Activité : une question ancienne et 27 demandes réellement terminées, puis contrôle des deux pages.
- Catalogue : ouverture et exécution du 28e workflow parmi 30, sélection contrôlée par ID dans la conversation, aucune duplication.

Les preuves de reprise ont été obtenues sur le bundle initial `c300a0d…`. Les corrections premier dépôt, fournisseur, rôle et priorité des attentes ont été reçues sur `e42f9ac…`. La release historique a été reçue sur `bd2f742…`. Les changements suivants étant limités à la place du détail, à l’aide sous la question et aux libellés du repère, seuls compact/branches ont été rejoués sur `4c14095…`. La correction suivante étant limitée aux actions d’ouverture et d’exécution d’un workflow par ID, ces deux parcours ont été reçus sur `71de902…` ; le CSS est identique. Les JSON du dossier contiennent les empreintes complètes. `git diff --check` est également passé.

### Complément final : file d’actions et réponses tardives

Réception favorable du correctif suivant, bundle `17ab8e9…`, limitée à `enqueue` et à la navigation externe dans `src/studio.js` :

- `navigate` inscrit désormais toute la lecture et la mutation de contexte (`bootstrap`, sauvegarde, `openProject` ou `actions.navigate`) dans la même file que les actions Ouvrir/Exécuter. Attendre simplement une ancienne valeur de la file ne protégeait pas ces opérations des clics suivants.
- `enqueue` renvoie sa promesse chaînée. `navigate` n’attend plus la file à l’intérieur d’une action de cette même file ; aucun cycle d’attente n’a été introduit dans ce chemin.
- L’époque de vue est invalidée dès la demande de navigation. Les contrôles d’époque/route/conversation dans `poll`, `pollConversation` et `openRun` restent présents et écartent les réponses de lecture devenues obsolètes.
- Preuve causale relue : `../2026-10-09-simplification-independante/catalog-race-reproduced.txt` montre `workflow.get` envoyé avec `project=workspace` et `workflow=catalog-25`. `catalog-race-received.txt` reçoit le même parcours rapide après correction, sans délai ajouté entre Ouvrir, Workflows et Exécuter. L’assertion finale utilise `conversation.get` pour contrôler l’ID de définition ; `conversation.list` est une projection compacte et ne porte pas cet ID.
- La preuve `late-response-and-assertion-fix.txt` reçoit aussi le test qui retarde une véritable réponse `run.get` de 1,5 seconde puis ouvre Projets : la réponse tardive ne ramène pas l’utilisateur dans l’exécution. Le test lit le vrai résultat backend et ne modifie pas l’état du workflow.

Aucun défaut nouveau relevé dans ce complément. Aucun build ni test UI relancé par le reviewer pendant la recette globale du responsable ; les preuves visuelles déjà reçues restent applicables, le CSS étant inchangé.

## Preuves complémentaires relues

Sources, tests et captures du développeur dans `../2026-10-09-simplification-independante/` : workflow vide puis entrées/sorties typées et connexion ; adaptation explicite sur un autre projet ; une conversation coordonnant deux projets ; réunion sans dépôt avec décision ciblant le destinataire avant le brouillon ; erreur et reprise ; scénario de release à six demandes et neuf blocs. Ces parcours ont été examinés comme preuves complémentaires, sans prétendre les avoir tous réexécutés indépendamment.

Les deux dialogues du premier lancement restent justifiés : choisir workflow/périmètre, puis examiner ce qui sera lancé. Après ouverture, répondre et suivre le travail ne demande plus de recréer ces objets. Les réglages avancés restent présents dans l’éditeur ; ils n’envahissent pas la vue de suivi. Je ne relève pas d’organisation supplémentaire inutile qui doive bloquer cette réception.

## Reproduction et limites

Les sondes se lancent depuis la racine avec `node docs/audits/2026-10-09-reception-simplicite-independante/<script>.cjs` :

- `review.cjs` : reprise, brouillon, terminal, projets et catalogue.
- `activity-review.cjs` : contre-exemple initial ; `activity-reception.cjs` : ordre corrigé.
- `corrections-review.cjs` : premier dépôt, fournisseur, configuration de rôle ; journal de l’itération intermédiaire.
- `limits-review.cjs` : réception de la release historique et du compact sur `bd2f742…`.
- `visual-reception.cjs` : réception finale compacte et branches, deux contrôles reçus, aucun échec.
- `catalog-reception.cjs` : réception finale d’ouverture et lancement au-delà de 25 workflows, deux contrôles reçus, aucun échec.

Les résultats intermédiaires conservent les défauts trouvés et certaines erreurs de sonde identifiées : sélection supposée automatique d’une release close, CTA absent parce que Détail était déjà ouvert, et différence de casse après passage à « Si autorisé ». Ils ne doivent pas être comptés comme des bugs produit restants ; les preuves finales correspondantes sont identifiées ci-dessus.

Tous les projets, releases, packs et terminaux sont synthétiques et isolés. Les changements d’état utilisent les API Engine/Conversations ; aucune retouche SQL/JSON d’état, aucune donnée client, publication, installation, production ni service externe. Le CLI déterministe prouve la circulation intention/réponse/état, pas la qualité d’un modèle réel ni son interprétation spontanée du langage naturel. La configuration des rôles/fournisseurs est reçue en persistance, sans qualification commerciale de Codex ou Claude. Les preuves d’erreur et d’adaptateur simulé ne qualifient pas un service externe réel.

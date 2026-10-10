# Persona 06 — consultant multi-client

Réception indépendante du candidat A du 10 octobre 2026. Agent incarnant un consultant qui passe plusieurs fois par jour d'un client à un autre ; ce retour ne remplace pas une étude auprès d'utilisateurs humains. Aucun rapport d'autre persona ni source applicative lu avant les observations.

## Intentions et observations

### 1. Reprendre le même modèle de compte rendu pour deux clients

**Intention.** Préparer le suivi hebdomadaire d'Atlas puis de Boréal, en gardant la même méthode et sans confondre les résultats ou les variantes.

**Attente et premier clic.** Je clique sur Workflows, puis Modèles. Les trois onglets En cours / Modèles / Historique répondent à trois intentions différentes ; je sais immédiatement où chercher. Je repère « Clôture de réunion » dans une bibliothèque de vingt cartes. Sa description précise plusieurs réunions, analyse, compte rendu et absence d'envoi : elle explique le résultat attendu.

**Hésitation.** Je clique sur « Utiliser », mais la fenêtre me demande de « Créer un workflow », de l'enregistrer dans un dossier .tricorder/workflows et parle de Git. Je voulais préparer une demande pour Atlas, pas administrer un fichier. Le bouton « Personnaliser une copie… » voisin m'avait justement laissé croire que « Utiliser » éviterait cette étape. Je choisis Atlas, puis « Créer et ouvrir le workflow » ; je me retrouve dans un éditeur avec le choix IA et « Exécuter… ». Le parcours demande donc une décision de conception avant mon besoin métier.

**Ce que je comprends ensuite.** Le nom du client est lisible en haut et dans le fil du workflow. Les trois blocs représentent bien sélection → analyse → compte rendu. « Retour à la liste » ramène à la bibliothèque, sans détour par la barre latérale. J'effectue la même création pour Boréal, puis retrouve une seule copie « Clôture de réunion » dans le projet Atlas. Cette séparation des deux clients est claire.

**Défaut visuel.** Les textes « Utilise / Produit » débordent horizontalement hors des trois cartes et se recouvrent à 1480 × 960, zoom normal. Les noms métier choisis sont utiles, mais je ne peux pas lire les phrases dans le graphe. Les liens montrent encore `selected_meetings`, `analysis`, « un élément », ce qui casse le vocabulaire humain des cartes.

**Coût et contournement.** Deux choix de destination et deux ouvertures d'éditeur pour réutiliser le même procédé. Pour un travail récurrent, je préfère ensuite ouvrir le projet et utiliser le workflow disponible. Le problème est une hésitation d'usage et une étape supplémentaire, pas une confusion de données constatée. L'exécution IA des comptes rendus n'a pas été lancée dans ce banc.

Preuves : 02-modeles, 03-utiliser, 04-adaptation-atlas, 05-retour-modeles, 06-adaptation-boreal, 07-projet-atlas.

### 2. Répondre à une question, vérifier la fin, revenir au bon client

**Intention.** En fin de journée, retrouver ce qui attend ma réponse, préciser les réunions Atlas à inclure et vérifier que je n'ai plus de travail à reprendre.

**Attente et premier clic.** Je clique sur Workflows. La liste En cours affiche une ligne avec le nom Atlas, « Réponse attendue », le titre « Choisir les réunions » et un temps « attentes comprises ». Je sais pourquoi elle est là. J'ouvre la ligne, clique sur « Répondre à cette question », puis réponds dans le champ libre. Je n'ai besoin ni d'un nom technique, ni d'un choix approuvé/rejeté, ni d'une interaction terminal.

**Résultat compris.** Après réponse, l'état devient « Terminée », 1 / 1 étapes, avec « Voir les résultats » et « Voir le rapport ». La durée totale est affichée (4 s dans la capture finale du banc) avec début et fin. « Retour à la liste » ramène à En cours, désormais vide. Historique montre l'exécution terminée et sa durée ; l'ouverture puis le retour restaurent cet historique. Le projet Atlas propose « Consulter », pas « Reprendre », pour cette exécution terminée.

**Nouvelle demande.** Depuis Atlas, la liste présente les mêmes vingt modèles que la bibliothèque. Les adaptations de projet ne sont pas ajoutées implicitement. La case « Réutiliser un workflow enregistré dans un projet » indique comment les retrouver. Le contexte « Projet principal : Client Atlas » est visible.

**Coût et verdict de parcours.** Un clic pour ouvrir, un pour accéder à la réponse, un pour soumettre. Le statut et le retour sont compréhensibles. Je ne crains pas de relancer un travail terminé. Je comprends toutefois « durée totale, attentes comprises » comme du temps écoulé, pas comme du temps IA facturable.

Preuves : 08-question-en-cours à 18-reutiliser-copies, captures PNG et arbres accessibles TXT.

## Priorités proposées

| Priorité | Constat | Conséquence et attente |
| --- | --- | --- |
| P1 | « Utiliser » conduit à créer puis éditer | Pour un consultant pressé, lancement et adaptation restent confondus. Ouvrir directement une demande avec modèle et client ; réserver la copie à l'adaptation explicite. |
| P1 | Résumés métier débordent des cartes | Informations devenues illisibles malgré de bons libellés. Les contraindre à la carte, avec accès au détail. |
| P2 | Liens du graphe gardent des clés techniques | Je dois traduire « selected_meetings » alors que la carte dit « Réunions sélectionnées ». Même vocabulaire sur les liens. |
| P3 | Bibliothèque de vingt cartes mêlant workflows complets et composants | Pas bloquant ici, mais « Communication » ou « Analyse » semblent des modèles aussi prêts à l'emploi que « Clôture de réunion ». Une distinction visible réduirait l'hésitation initiale. |

**Adoption : accompagnée pour la première réutilisation, autonome pour le suivi et la réponse.** Le suivi d'état, la durée et les retours sont convaincants sur les deux projets synthétiques. Le point qui coûte le plus est le passage inutile par l'éditeur lors de « Utiliser », suivi de la lisibilité des cartes.

## Méthode, limites et reproduction

GUI Electron réelle du candidat immuable `/tmp/tricorder-usage-candidate-a`, écran Xvfb :93, fenêtre 1480 × 960. Home/configuration/données isolés dans un nouveau répertoire temporaire à chaque exécution. Les deux projets sont créés par l'API validée `project.create` avant le parcours. Les adaptations de réunion sont créées par clics dans l'interface.

Pour le second parcours, un workflow synthétique à un bloc question est enregistré et démarré par les commandes validées `workflow.save` et `run.start`. La réponse et toutes les navigations se font dans l'interface. Le moteur décide seul du passage à terminé ; aucun état SQLite/JSON n'est modifié manuellement. C'est une vraie transition locale du moteur, pas une validation du métier « clôture de réunion ». Aucun compte rendu IA n'a été produit, aucun fournisseur ni compte client/service externe n'a été utilisé. Les exécutables codex/claude du banc sont inertes. Le temps mesuré est celui du banc automatisé, pas une mesure du temps de réflexion d'un humain.

Le script a été construit par observations successives. Les attentes de chargement ont été corrigées et une attente « Terminé » a été rectifiée en « Terminée » : ces erreurs de sélecteur ne sont pas des défauts du produit. `erreur-harness.*` garde cette dernière erreur, avec l'interface pourtant correctement terminée. Le dernier passage complet, incluant l'attente du chargement des options de réutilisation, a réussi : 1 test passé, 24,4 s de scénario (25,4 s avec le lanceur).

Rejouer depuis le candidat :

```sh
npm run test:ui -- --config=/home/blegoff/odoo-tricorder/release/2026-10-10_retours-usage/.suivi/personas/06-consultant/playwright.config.cjs
```

Le script `harness.cjs`, le test autonome et `result.json` rendent le parcours contrôlable. Les captures préservent le candidat A ; elles ne prétendent pas qualifier des corrections ultérieures. Aucun test de navigation de release n'a été réalisé dans ce persona : le second parcours couvre la branche retour au projet.

# Panel utilisateurs v2 — profil 5, chef de projet technique / tech lead

Date : 2026-10-10. Application générique Tricorder Electron/Python ; aucun parcours Odoo.

## Résultat

Deux parcours GUI complets et un contrôle de sauvegarde invalide. Les trois tests sont verts sur le banc source, écran isolé `:188` : dernier passage **3 passed (31.9s)**. Syntaxe du fichier test vérifiée par `node --check`. Vérification finale `/proc` : aucun processus synthétique de ce profil restant. Aucun fichier produit ou configuration partagée modifié, aucun rebuild ni commit. Les projets sont créés depuis l’interface, dans des répertoires temporaires dédiés ; aucune donnée client ni SQLite réel manipulé.

Le moteur montre des tâches concrètes, deux exécutants parallèles distincts, une dépendance explicite et les preuves d’un candidat commun. La lecture du résultat documentaire commun reste trop technique pour une réception rapide. Aucun P0 ou P1 reproductible retenu.

Commande de rejeu :

```bash
DISPLAY=:188 XAUTHORITY=/tmp/tricorder-collections-panel/188/Xauthority \
python3 /tmp/tricorder-ci-target-source-run.py \
  --config=/tmp/tricorder-collections-panel/user-5.config.cjs
```

Test : `tests/panel-v2-user-5.spec.cjs`. Le lancement accepte `TRICORDER_EXECUTABLE`, `TRICORDER_TEST_EXECUTABLE` et `TRICORDER_TEST_APP`. Le backend est localisé dans les ressources du package lorsqu’il existe ; le package n’a pas été rejoué par ce profil.

## Parcours 1 — décider d’une architecture à partir de deux évaluations

Actions GUI : créer « Architecture synthétique » ; créer le workflow depuis « Intentions, plan et travaux » ; configurer deux travaux simultanés et les critères du bloc d’organisation ; choisir le modèle de fixture ; lancer dans un vrai terminal ; saisir et confirmer trois intentions ; examiner et approuver le plan ; lancer explicitement les éléments ; ouvrir l’élément API ; revenir au parent ; approuver la réception commune ; ouvrir les résultats puis leur structure détaillée.

Plan contrôlé : « Évaluer le contrat API » et « Évaluer le déploiement » peuvent travailler ensemble. « Consolider la décision commune » dépend des deux. Le graphe affiche les trois titres, les rôles/modèles et « 2 en cours · 1 en attente », avec la coordination attribuée à Tricorder. Deux workers du moteur existent réellement, avec identités de processus distinctes et `/proc` présents. Ce sont des processus inertes du banc, pas une IA commerciale.

Après le seul résultat API, la synthèse attend encore. Après les deux résultats, ses `depends_on_runs` contiennent exactement les deux exécutions sources et `dependency_results` contient leurs contenus. La synthèse reçue cite les conclusions API et déploiement. Les résultats sont consultés par de vrais clics, jusqu’au texte visible dans le détail ; le parent termine après la décision humaine.

Preuves dans `test-results/panel-v2-user-5/panel-v2-user-5-Tech-lead--c87fe-ndance-et-réception-commune/` :

- `workflow-configure.png`, `intentions-confirmees.png`, `plan-decompose-a-valider.png` : création/configuration et recueil GUI.
- `parallelisme-et-dependances-graphe.png` : tâches concrètes, deux exécutants et dépendance.
- `element-api-identifiable.png` : navigation vers une exécution propre à l’élément.
- `resultats-communs-recus.png` et `synthese-commune-consultee.png` : réception et ouverture du résultat.
- `moteur-preuves.json` : résultat parent, sources de la synthèse, identités des vrais processus.

## Parcours 2 — intégrer deux contributions Python et tester leur résultat commun

Actions GUI : créer « Code Python synthétique » ; adopter « Développement par élément et tests communs » ; configurer deux travaux simultanés ; éditer la vraie commande de QA commune ; lancer dans le terminal ; saisir et confirmer les intentions ; examiner et approuver le plan ; lancer les éléments ; consulter la QA commune ; approuver la décision finale ; ouvrir les résultats.

Amorçage synthétique du dépôt temporaire : `a.py` et `b.py` valent initialement zéro ; un vrai test Python vérifie la borne individuelle. Les deux contributions modifient réellement `a=1` et `b=1` dans les copies isolées créées et capturées par le moteur. Le dépôt original reste à zéro, y compris après la décision finale. Chaque contribution exécute le vrai bloc `python3 unittest` livré par le modèle : un test exécuté, code 0, preuve conservée.

Le moteur intègre les deux candidats et exécute réellement la commande commune `assert a+b == 2`. La QA utilise exactement la référence du candidat produit par l’intégration. Sa sortie est `COMMON_QA : a+b=2`, avec code 0 et preuve. Les deux contributions sont identifiables dans le manifeste du candidat commun. L’interface montre l’intégration et ses deux fichiers proposés ainsi que la preuve de la QA commune.

Preuves dans `test-results/panel-v2-user-5/panel-v2-user-5-Tech-lead--ed42f-contrôle-du-candidat-commun/` :

- `code-workflow-qa-commune-configuree.png`, `code-deux-elements-concrets.png` : configuration et tâches de code concrètes.
- `contribution-a.json`, `contribution-b.json` : vrais candidats isolés et vraies commandes individuelles.
- `vraie-qa-commune-reussie.png` : code 0, sortie commune et candidat reçu.
- `candidat-commun-recu.png`, `integration-preuves.json` : intégration des deux contributions, référence exacte, preuve de QA.

## Réel et synthétique

Réel : application Electron, interactions GUI, projets temporaires, terminal PTY, workers Python et faux CLI locaux, moteur non patché, limites de parallélisme, dépendances, décisions humaines, copies de fichiers, diffs/candidats, intégration et commandes QA sandboxées. Les fake CLI ne contactent aucun fournisseur et ne produisent aucune réponse IA. Le moteur reste seul écrivain des états via ses API validées.

Synthétique : contenu du plan, analyses et synthèse documentaires, modifications de code proposées. Ces résultats sont soumis avec les tokens des tentatives moteur ; aucun état SQLite/JSON n’est retouché. Ces fixtures ne prouvent ni la qualité d’une IA commerciale, ni ses outils, ni une livraison. Les tests sont exécutés pour de vrai sur le petit dépôt Python du banc, sans qualification d’un projet client.

Nettoyage : fermeture Electron, arrêt des brokers/terminaux de cette seule instance, arrêt ciblé des groupes de processus dont les arguments référencent son répertoire temporaire, puis suppression de ce répertoire. Les captures restent dans le répertoire de preuves pour archivage par l’orchestrateur.

## Constats reproductibles et propositions

### P2 — le résultat commun documentaire nécessite une lecture de structure technique

Chemin : parcours 1 terminé → « Voir les résultats ».

Reproduction : consulter les trois résultats de la collection. L’écran affiche `Results`, `Perform`, `Project`, `Run`, identifiants d’exécution et une ligne « Contributions : Aucun élément ». Le texte effectivement produit est sous « Structure détaillée », sous forme JSON. Il faut ouvrir cette structure pour lire la décision commune. Le texte est bien présent et accessible ; la difficulté porte sur sa présentation, pas sur sa perte.

Preuves : `resultats-communs-recus.png` avant ouverture, `synthese-commune-consultee.png` après ouverture. Source concernée : `src/business-results.mjs` et la projection des résultats par élément.

Proposition : présenter chaque élément avec son titre métier, son statut reçu, un contenu directement lisible et ses preuves. Conserver identifiants, clés de blocs et enveloppe JSON dans un détail technique. Masquer la collection de contributions de code vide sur un parcours purement documentaire.

### P2 — critères métier proposés sur une commande automatique, sans aide de résolution dans ce formulaire

Chemin : workflow « Développement par élément et tests communs » → bloc « Tester le candidat commun » → ajouter un critère d’acceptation → appliquer → enregistrer.

Reproduction : le formulaire propose le champ critères, mais la sauvegarde refuse avec `qa : des critères métier exigent une validation humaine`. Cette garde est correcte. Le message utilise l’identifiant interne `qa` et le formulaire Commande ne propose pas le changement de validation nécessaire ; l’utilisateur doit comprendre qu’il faut retirer les critères de ce contrôle automatique ou les porter sur la réception humaine.

Preuves : captures `P1-sauvegarde-refusee-éditeur-visible.png` et `P1-apres-executer.png` dans `test-results/panel-v2-user-5/panel-v2-user-5-Garde-—-sa-38696-l’éditeur-et-son-diagnostic/`. Le préfixe de capture reflète le signalement initial, pas une gravité P1 finalement retenue.

Proposition : indiquer cette règle à côté du champ et proposer explicitement « Déplacer ces critères vers la décision de réception », ou expliquer comment créer une réception humaine. Nommer le bloc par son titre dans le diagnostic.

### Signalement P1 initial retiré après contrôle dédié

Une première tentative sans attente de fin des interactions a expiré à l’ouverture du lancement après sauvegarde refusée. Le signalement immédiat évoquait un écran central vide. Les replays dédiés après observation stable et inspection PNG conservent bien l’éditeur et le diagnostic, y compris 1,5 seconde après « Exécuter ». Le contrôle attendu est conservé et vert. `body.innerText` omet le contenu du shadow DOM : ses exports initiaux ne prouvaient pas un écran vide. Les exports texte du banc incluent maintenant ce contenu. Aucun défaut P1 reproductible n’est donc revendiqué.

## Limites du profil

Le plan a des tâches et dépendances structurées issues de fixtures ; ce profil ne qualifie pas la production du plan par une vraie IA. Le parcours code vérifie deux contributions indépendantes et leur intégration ; la reprise sur une base de code `base_from`, les conflits, la reprise d’échec, une application au dépôt et une publication restent hors de ces deux parcours. Le grand graphe montre les étapes de coordination et les tâches concrètes dans le bloc par élément ; le parcours ne prétend pas afficher un graphe séparé complet de dépendances entre toutes les tâches.

## Preuves archivées

- [01-.last-run.json](preuves/05-tech-lead/01-.last-run.json)
- [02-P1-apres-executer.png](preuves/05-tech-lead/02-P1-apres-executer.png)
- [03-P1-sauvegarde-refusee-éditeur-visible.png](preuves/05-tech-lead/03-P1-sauvegarde-refusee-éditeur-visible.png)
- [04-element-api-identifiable.png](preuves/05-tech-lead/04-element-api-identifiable.png)
- [05-intentions-confirmees.png](preuves/05-tech-lead/05-intentions-confirmees.png)
- [06-moteur-preuves.json](preuves/05-tech-lead/06-moteur-preuves.json)
- [07-parallelisme-et-dependances-graphe.png](preuves/05-tech-lead/07-parallelisme-et-dependances-graphe.png)
- [08-plan-decompose-a-valider.png](preuves/05-tech-lead/08-plan-decompose-a-valider.png)
- [09-resultats-communs-recus.png](preuves/05-tech-lead/09-resultats-communs-recus.png)
- [10-synthese-commune-consultee.png](preuves/05-tech-lead/10-synthese-commune-consultee.png)
- [11-workflow-configure.png](preuves/05-tech-lead/11-workflow-configure.png)
- [12-candidat-commun-recu.png](preuves/05-tech-lead/12-candidat-commun-recu.png)
- [13-code-deux-elements-concrets.png](preuves/05-tech-lead/13-code-deux-elements-concrets.png)
- [14-code-workflow-qa-commune-configuree.png](preuves/05-tech-lead/14-code-workflow-qa-commune-configuree.png)
- [15-contribution-a.json](preuves/05-tech-lead/15-contribution-a.json)
- [16-contribution-b.json](preuves/05-tech-lead/16-contribution-b.json)
- [17-integration-preuves.json](preuves/05-tech-lead/17-integration-preuves.json)
- [18-intentions-confirmees.png](preuves/05-tech-lead/18-intentions-confirmees.png)
- [19-plan-decompose-a-valider.png](preuves/05-tech-lead/19-plan-decompose-a-valider.png)
- [20-vraie-qa-commune-reussie.png](preuves/05-tech-lead/20-vraie-qa-commune-reussie.png)
- [21-verdict.json](preuves/05-tech-lead/21-verdict.json)

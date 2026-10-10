# Panel final 4/6 — Responsable de programme

Le modèle se réutilise et les tâches se coordonnent correctement entre deux projets. La réception de la navigation reste rouge : ouvrir directement un enfant depuis Projets ou Activité fait perdre l’accès à son parent, bien que cette relation soit persistée dans le moteur.

Profil : chef de projet transverse, technique modéré. Évaluation du 10 octobre 2026 sur le produit source figé `0.6.0-rc.12`, HEAD `0a4dd888fedbf3a1859a08af3285816cbba0de55`, Electron 1500 × 1000, écran réservé `:189`. Aucun fichier produit modifié, aucun build reconstruit, aucun commit.

## Méthode et limites

Deux parcours GUI réels : clics dans les menus, formulaire de copie, configuration d’un bloc, lancement d’une demande, inclusion d’un autre projet, saisie terminal, collecte des intentions, approbation, lancement des éléments, réponses aux questions et navigation.

Préparation synthétique explicitement distincte : deux projets locaux créés par l’API Engine, définitions enregistrées par Engine/API studio ; le plan transverse est fourni par `Engine.claim` et `Engine.submit`. Les exécutables `codex` et `claude` sont des scripts locaux inertes qui annoncent leur nature synthétique et répètent la saisie. La demande initiale est enregistrée par le formulaire GUI ; la ligne donnée ensuite au terminal vérifie la saisie et son contexte, elle ne produit pas un second plan. Aucune IA payante ni connexion distante. Cette réception ne qualifie pas un fournisseur réel ni la qualité d’un plan généré.

Chaque test possède son HOME, état, profils CLI et runtime temporaires. Nettoyage des brokers uniquement dans ces répertoires. Le banc conserve `TRICORDER_EXECUTABLE`, les arguments conditionnels et le backend empaqueté. La présente exécution utilise les sources. Captures Electron réelles, relues avec `view_image`.

## Parcours 1 — Adopter puis réutiliser dans deux projets

1. Workflows → ouvrir « Préparer une revue de programme » → Options → Réutiliser → destination Modèles, nom « Modèle revue transverse ».
2. Workflows → Modèles → Modifier le modèle → Réutiliser vers Programme Atlas, puis Programme Boréal.
3. Dans la copie Boréal, renommer le bloc « Confirmer les jalons Boréal » et enregistrer.
4. Nouvelle demande : sélectionner chaque copie, lancer une demande distincte, saisir le contexte dans le terminal après confirmation du bon projet et du bon onglet.
5. Projets → ouvrir la conversation correspondante → Vue d’ensemble.

| Attendu | Observé |
|---|---|
| La copie exclut le contexte de la demande historique. | Paramètre `request` retiré du modèle ; `language: fr` conservé. |
| Modifier Boréal préserve Atlas et le modèle. | Bloc Atlas inchangé ; modèle toujours révision 1. |
| Chaque exécution garde sa demande et son projet. | Une demande Atlas et une demande Boréal dans deux conversations distinctes ; les vues montrent chacune leur demande. |
| Copier une méthode ne lance pas son travail. | Les copies sont d’abord des définitions ; les demandes ne sont créées qu’au lancement explicite. |

Preuves : [copie vers les modèles](preuves/04-programme/01-01-adoption-modele.png), [contexte Atlas](preuves/04-programme/02-02-atlas-contexte-isole.png), [contexte Boréal](preuves/04-programme/03-03-boreal-contexte-isole.png), [données moteur des copies et conversations](preuves/04-programme/copies-et-contextes.json).

## Parcours 2 — Un programme, un plan, deux projets

1. Nouvelle demande → « Coordonner les jalons du programme » → inclure Programme Boréal → demander de synchroniser Atlas et Boréal avec un seul plan.
2. Recueillir deux intentions dans le GUI, confirmer la liste. Fournir un plan synthétique : tâche Atlas, puis tâche Boréal avec `depends_on: [atlas]` et les projets explicitement affectés.
3. Examiner et approuver le plan dans le GUI, lancer les éléments.
4. Ouvrir Atlas depuis le graphe, répondre que le jalon est livré, revenir au parent.
5. Projets → Boréal → conversation du programme → Vue d’ensemble → demande parent → enfant Boréal. Vérifier le contexte Shell Atlas / Demande affichée Boréal, puis revenir.
6. Ouvrir directement le même enfant par Projets → Consulter, puis par sa ligne Activité. Chercher le retour au parent.
7. Après constat du défaut, retrouver manuellement le parent via Activité, ouvrir Boréal, répondre et revenir. Ce détour est annoncé et ne rend pas vertes les assertions de retour direct.

| Attendu | Observé |
|---|---|
| Un seul parent coordonne les deux projets. | Une conversation, une demande parent, deux enfants portant chacun leur projet. Aucun workflow copié dans Boréal. |
| Boréal attend réellement Atlas. | `iteration_wait: true` avant la réponse Atlas, puis libération ; le résultat Atlas est transmis via `dependency_results`. |
| Le graphe rend la dépendance lisible. | Boréal : « En attente », « Dépendances à terminer », « Après : Livrer le jalon Atlas · Programme Atlas ». |
| Ouvrir un enfant depuis le parent permet de revenir. | Bouton présent et fonctionnel ; terminal conservé. |
| Reprendre directement un enfant permet de retrouver son parent. | Échec depuis Projets et Activité : aucun bouton de retour, malgré `run.parent` valide. |
| La fin conserve le terminal et consolide les résultats. | Parent `completed`, deux enfants terminés ; même session `36364407a7f540b882cbc031aff0c6aa`, même PID `1458279` avant/après. |

Preuves : [plan à approuver](preuves/04-programme/04-04-plan-transverse-approbation.png), [dépendance avant Atlas](preuves/04-programme/05-05-coordination-dependance.png), [contexte terminal et retour depuis le parent](preuves/04-programme/06-07-boreal-contexte-terminal.png), [enfant direct depuis Projets](preuves/04-programme/07-08a-enfant-direct-projet.png), [enfant direct depuis Activité](preuves/04-programme/08-08b-enfant-direct-activite.png), [relation parent persistée et bouton absent](preuves/04-programme/retour-parent-direct.json), [programme terminé](preuves/04-programme/09-09-programme-termine.png), [preuves moteur et identité terminal](preuves/04-programme/coordination-preuves.json).

## Défauts et recommandations

**P0 : aucun observé.**

**P1 — La reprise directe coupe le lien avec le parent.** L’utilisateur arrivant sur « Recetter le jalon Boréal » depuis Projets ou Activité peut répondre, mais ne dispose d’aucun chemin nommé vers son programme. L’ouverture depuis le graphe conserve ce bouton : le comportement dépend donc du parcours local. Utiliser la relation moteur durable pour proposer le parent, avec son nom et son projet, dans chaque ouverture d’enfant. Deux assertions rouges gardées dans le banc. Ce défaut empêche la réception du critère de reprise.

**P2 — Activité présente la famille comme trois demandes.** [La capture Activité](preuves/04-programme/10-08-activite-parent-enfants.png) annonce « 3 demandes au total » et place parent et enfants dans des lignes sans relation explicite. Le graphe distingue bien un plan et deux tâches ; Activité peut faire penser à trois demandes indépendantes. Afficher « 1 demande, 2 tâches », ou marquer les enfants « Tâche de [parent] » avec accès au parent. C’est une friction de compréhension, pas une duplication moteur.

**P2 — Les projets du plan sont affichés comme identifiants techniques.** À l’approbation, le champ « Project » contient par exemple `p99085c81c29f4bee`. Le responsable doit reconnaître les projets par les titres des tâches. Résoudre les identifiants enregistrés en noms de projets dans le contenu du plan et présenter les dépendances par titres. Les identifiants peuvent rester dans la structure détaillée. Preuve : capture 04.

## Résultat reproductible

Commande exécutée depuis `/home/blegoff/odoo-tricorder` :

```bash
DISPLAY=:189 XAUTHORITY=/tmp/tricorder-collections-panel/189/Xauthority python3 /tmp/tricorder-ci-target-source-run.py --config=/tmp/tricorder-collections-panel/user-4.config.cjs
```

Dernier résultat : **`1 passed, 1 failed (21.9s)`**, code retour **1**. Test des copies : **11.1s**, vert. Test de coordination : **10.3s**, rouge uniquement sur les deux assertions métier de retour au parent direct, attendu **1** bouton, observé **0**. Le reste du parcours a abouti à `completed` grâce au détour manuel consigné. La trace du test rouge et `error-context.md` sont dans le répertoire de preuves du parcours 2.

Les exécutions antérieures ont corrigé le banc uniquement : emplacement d’état explicite, sélecteurs Modèles/Modifier, périmètre Vue d’ensemble conservé à la reprise, attente du rendu enfant avant capture, et attente du bon contexte terminal avant saisie. Aucun défaut produit n’a été corrigé ni masqué. Fichiers de travail : `tests/panel-v2-user-4.spec.cjs` et ce rapport.

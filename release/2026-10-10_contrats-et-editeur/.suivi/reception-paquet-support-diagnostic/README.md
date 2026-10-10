# Diagnostic indépendant — scénario support du paquet

10 octobre 2026. **Course du banc confirmée ; aucun défaut moteur confirmé.** Le
scénario corrigé est reçu trois fois sur le paquet et une fois depuis les sources.
Seul `tests/panel-v2-user-2.spec.cjs`, troisième test, a été modifié. Le moteur,
`dist` et l'application empaquetée n'ont pas été modifiés ni reconstruits.

## Pourquoi le premier passage a échoué

Le rouge de la suite complète reste conservé dans [rouge](rouge/). À l'instant du
claim manuel du test, les trois enfants apparaissent déjà « En cours » ; le moteur
refuse avec « Limite de travaux simultanés atteinte pour cette collection ».

Le scénario créait un parent `driver='conversation'` avec `simulation=True`, puis
activait les trois éléments dans l'interface. Il essayait ensuite de réclamer
lui-même chaque enfant pour injecter résultat, question et échec. Or :

1. `backend/workflow_engine/iterations.py:99` crée les enfants avec
   `driver='automatic'`, conformément au traitement parallèle demandé.
2. `electron/studio-main.cjs:141` déclenche `runtime.tick` toutes les 1,5 secondes.
   `backend/studio.py:156` transmet alors les enfants actifs au dispatcher.
3. `backend/workflow_engine/runtime.py:183` épargne les tâches du parent piloté
   par conversation, mais lance normalement celles des enfants automatiques.
   Leur claim est durable avant le lancement du worker.
4. Si ce tick précède l'injection de fixture, les trois places sont déjà prises.
   `iterations.claim_guard`, ligne 199, refuse donc correctement le claim tardif.

Le premier passage source vert signifie que l'injection avait gagné cette course.
Il n'établit pas un comportement moteur différent entre source et paquet.

## Contre-épreuve déterministe

Le [script indépendant](contre-epreuve/course-dispatch.py) utilise le backend
empaqueté et un répertoire temporaire. Il conserve `activate`, `dispatch`, les
transactions et `claim` réels ; seul le lancement de processus est retenu par un
substitut local afin d'observer durablement les réservations, sans aucun service
externe.

La [preuve JSON](contre-epreuve/course-dispatch.json) constate :

- parent en conversation, trois enfants automatiques initialement prêts ;
- après dispatch, exactement trois travaux en cours, chacun à la tentative 1 ;
- claim de fixture rejeté avec le message exact du rouge ;
- un nouveau dispatch ne produit ni quatrième worker ni mutation des enfants.

Aucune augmentation de la limite ni contournement du claim n'est justifié.

## Correction du scénario

Le troisième test installe désormais un fournisseur **local scripté et fictif**
dans son répertoire personnel temporaire. Les trois enfants sont des blocs agent
pris en charge par le runtime réel. Les réponses du fournisseur produisent :

- un constat valide pour le premier ticket ;
- une question pour le deuxième, puis un constat après la réponse utilisateur ;
- une sortie obligatoire absente pour le troisième, donc un échec de contrat,
  puis une sortie valide après la reprise explicitement demandée dans l'interface.

Le banc ne réclame ni ne soumet plus manuellement les enfants. Il ne touche pas
leurs JSON d'état. L'injection du plan reste portée par le parent conversation,
que le dispatcher ne prend pas en charge automatiquement.

Toutes les assertions métier précédentes restent : affichage de la question et
de l'échec dans le graphe, terminal visible, réponse depuis l'interface, reprise
du seul ticket échoué, parent terminé, ticket déjà terminé strictement inchangé,
tentative 2 pour l'échec repris et tentative 1 pour la question poursuivie.

Le test ajoute trois PID de fournisseurs distincts, un appel initial par enfant,
les nombres finaux d'appels `1 / 2 / 2`, et la preuve que « Dépôt Nord » parvient
au fournisseur de la question. Ces PID établissent trois exécutions distinctes ;
ils ne prétendent pas mesurer à eux seuls leur chevauchement temporel.

## Réception

| Environnement | Résultat |
|---|---|
| Paquet, premier passage corrigé | Vert, 13,4 s |
| Paquet, deux répétitions séquentielles | Vert, 13,6 s et 14,1 s |
| Sources, même scénario corrigé | Vert, 13,7 s |
| Syntaxe du fichier de test | `node --check` réussi |
| Empreintes produit avant/après | Identiques : `dist/app.js`, `app.asar`, moteur `iterations.py` empaqueté |

Les répétitions servent à contre-éprouver la course initiale ; elles ne remplacent
pas la nouvelle suite empaquetée complète, pilotée par l'orchestrateur.

La [capture du suivi](contre-epreuve/paquet-vert/08-parent-question-et-echec.png)
a été relue : une question et un échec apparaissent avec leurs tickets respectifs.
La [capture de clôture](contre-epreuve/paquet-vert/10-parent-termine-reprise-ciblee.png)
et les [appels du fournisseur](contre-epreuve/paquet-vert/provider-calls.json)
complètent les assertions. Le [bilan machine](contre-epreuve/resultats.json)
conserve les résultats des quatre passages.

Écran isolé `:188`, aucun projet utilisateur, aucun vrai fournisseur IA, aucun
email/Slack ni autre effet externe. Les deux suites complètes sur les autres
écrans n'ont pas été interrompues.

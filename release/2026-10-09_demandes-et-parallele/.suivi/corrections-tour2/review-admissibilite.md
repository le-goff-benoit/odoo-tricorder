# Relecture indépendante — admissibilité et configuration d’un nouveau lancement

Date : 2026-10-09. Périmètre : `LaunchReadiness`, son raccordement à `run_page` et `run.get`, libellés et inspecteur d’exécution, copie de configuration après échec. Cette relecture porte sur les sources en cours d’intégration, pas sur le paquet figé du tour 2.

## Conclusion initiale

Quatre écarts P2 reproductibles ont été transmis à l’orchestrateur avant intégration. Aucun contournement d’une décision humaine ni aucune écriture d’état propre à la nouvelle projection n’a été trouvé dans ce périmètre. Le budget de 100 vérifications est partagé entre les demandes d’une page. La réception reste ouverte jusqu’aux corrections et contre-épreuves.

## P2 — A : appliquer le contrat des agents de conversation à un workflow automatique crée un faux blocage

Dans `projections.run_page` et `studio._request/run.get`, la projection est attachée à toute exécution active ayant un bloc prêt. Or `runtime.worker_preflight` décrit les seuls exécutants appelables par la commande explicite d’une conversation : les autres types de bloc renvoient `native-step` avant même le traitement de la simulation.

Reproduction : créer par `Engine.start(..., simulation=True)` un workflow à un bloc `task`, validation contractuelle. Le préflight automatique renvoie zéro problème. `run_page` renvoie pourtant `launch.status=configuration`, `label=À configurer`, raison « Ce bloc se traite dans la conversation du terminal ». Un `claim` puis `execute` simulé, sans fournisseur ni processus, termine normalement le workflow : `completed`, bloc `accepted`, résultat `ok=True`.

Impact : Activité et détail peuvent demander de reconfigurer une simulation ou un bloc automatique valide. Le nouveau message contredit le moteur réel.

Recommandation : limiter ce contrat au driver `conversation` dans les raccordements et garder l’appel direct explicite sur ce même périmètre. Le dispatch automatique préexistant garde ses contrôles ; ne pas introduire un préflight alternatif divergent pour résoudre un problème de présentation.

## P2 — B : le libellé agrégé est présenté comme l’état du bloc sélectionné

Dans `runInspector`, la raison est choisie dans `launch.nodes` pour le bloc sélectionné mais son titre provient de `state.run.launch.label` pour toute la demande.

Reproduction : une demande contient deux blocs indépendants, un agent disponible et une tâche native. La projection renvoie `worker_count=1`, `native_count=1`, libellé agrégé « Prête au lancement ». Sélectionner la tâche native produit le même titre au-dessus de la raison « Continuez dans le terminal ». Le badge historique `Prêt` est également une indication de dépendances, pas d’exécutabilité.

Impact : contradiction dans le panneau précisément utilisé pour décider de la prochaine action.

Recommandation : libellé et badge du bloc issus de son admissibilité propre ; conserver le résumé agrégé seulement au niveau demande. Même distinction dans graphe, liste et action proposée.

## P2 — C : au-delà des 25 premières étapes prêtes, le détail revient à une affirmation non vérifiée

`LaunchReadiness.project` calcule jusqu’à 100 vérifications, mais ne retourne que 25 entrées. `runInspector` et `executionAction` recherchent l’étape sélectionnée dans ces entrées ; quand elle est absente, ils reviennent aux anciennes instructions « prête » / « le moteur lancera ».

Reproduction : 25 agents indépendants puis une tâche native. La projection indique `native_count=1` et `nodes_truncated=True`, mais le bloc `task` n’existe pas dans `launch.nodes`. Le graphe permet toujours de le sélectionner. Le cas analogue existe avec un agent mal configuré en position 26.

Impact : le parcours de dépannage fonctionne pour les premières étapes et devient trompeur pour les suivantes, alors que le contrat autorise jusqu’à 1 000 blocs.

Recommandation : à défaut de ligne, afficher explicitement « À vérifier » et proposer une vérification ciblée du bloc ; cette vérification doit conserver un budget borné. Ne pas assimiler absence de projection et agent prêt.

## P2 — D : une demande longue est remplacée par `[object Object]` lors de la copie

L’action `configure-execution` lit `run.get`. `run_detail` transforme les paramètres textuels de plus de 8 Ko en références `$artifact` dérivées, à juste titre pour la pagination. `configure-execution` et `configure-execution-copy` utilisent néanmoins `run.parameters.request` comme une chaîne pour le résumé et le brouillon de lancement.

Reproduction : une demande synthétique de 12 000 caractères est valide et enregistrée intégralement ; `run_detail.parameters.request` est un objet `{ $artifact, format: 'text', preview }`. Le passage à `esc`, puis à la zone de saisie de lancement, produit `[object Object]`. La copie du workflow conserve ses définitions, mais l’intention humaine est perdue dans le nouveau brouillon.

Impact : reconfigurer une demande issue d’un email ou d’un compte rendu long peut la relancer sans son contenu réel.

Recommandation : lire toutes les pages de la preuve dérivée via `run.proof` sous l’autorisation du run, avant de préparer la copie ; conserver exactement le texte d’origine. Ni coercition en chaîne ni utilisation du seul aperçu. Ne pas modifier le run d’origine.

## Observation P3 — cache du contexte de conversation

Le nouveau résolveur de contexte lit et mémorise le `body` complet de chaque conversation rencontrée dans Activité. Il n’utilise que fournisseur, modèle, effort, statut et archivage ; `items`, définition, transports et demandes complètes sont inutiles à la projection. Une conversation autorise 1 000 demandes de 100 000 caractères chacune ; le nombre de vérifications borné à 100 ne borne donc pas le volume de ce cache.

Recommandation : sélectionner les cinq champs utiles via `json_extract` et ne jamais mémoriser le texte des demandes pour ce calcul. Il s’agit d’une observation de coût statique, pas d’une panne mesurée en charge.

## Preuves et réception

- Script : `repro-admissibilite.py` ; résultats initiaux : `repro-admissibilite-before.jsonl`.
- Projets et base temporaires ; créations et transitions par les API du moteur ; aucune retouche d’état.
- Fournisseurs et création de workers interdits par mocks pendant les scénarios. Seule l’initialisation Git locale du projet synthétique a lieu avant ces mocks.
- Les lectures `run_page` et `LaunchReadiness.project` sont encadrées par comparaison exacte du dump SQLite : identique avant/après.
- Les 18 tests ciblés existants étaient verts dans `/tmp/tricorder-tour2-readiness-unit.log` ; ils ne couvraient pas les quatre variantes ci-dessus.
- `run.get` appelle déjà `dispatch` avant ce changement ; ce rapport ne prétend pas que toute lecture de détail est globalement sans effet. Le constat sans écriture porte sur les projections nouvelles et les scénarios de conversation reçus.
- Pas de réception graphique indépendante dans cette relecture ; les parcours GUI supplémentaires sont pris en charge par l’orchestrateur. Aucun appel commercial, compte connecté, projet client ni service externe qualifié.

## Contre-épreuve après corrections — résultat reçu

Les quatre P2 ci-dessus sont corrigés dans les sources reçues. Aucun blocage résiduel trouvé sur ce périmètre ciblé. L’observation P3 sur le volume du cache est également corrigée et contre-vérifiée ci-dessous.

| Constat | Correction observée | Contre-épreuve indépendante |
| --- | --- | --- |
| A, contexte automatique | `run_page` et `run.get` réservent la projection au driver conversation ; l’appel direct refuse le mauvais driver. L’objet de vérification est créé à la demande. | Même simulation task : aucune clé launch dans Activité, appel direct refusé, simulation toujours completed/accepted/ok. |
| B, libellé du bloc | `launchReadiness(run,id)` produit le label propre au bloc ; inspecteur, badge, graphe, liste et actualisation l’utilisent. | Cas agent prêt + tâche native : le bloc retourne « À poursuivre dans le terminal », distinct du résumé agrégé « Prête au lancement ». |
| C, ligne tronquée | Une étape prête absente d’une projection tronquée reçoit `unknown / À vérifier`, jamais un statut prêt supposé. | Le 26e bloc de la même fixture renvoie unknown ; action et raison ne promettent aucun lancement. Le contrôle détaillé reste à faire dans le terminal, limitation annoncée. |
| D, intention longue | `executionRequest` reconstitue la demande par `run.proof` avant ouverture du dialogue ; seule la présentation du résumé est raccourcie, pas le brouillon. | Preuve backend de 78 000 caractères avec accents et emoji relue en 3 pages, identique, dump SQLite inchangé. Fonction UI réelle extraite de studio.js exécutée avec API synthétique paginée : 88 000 unités UTF-16 récupérées en 3 pages, égalité exacte, objet d’origine intact. |

Preuves : `repro-admissibilite-after.py`, `repro-admissibilite-after.jsonl`, `repro-admissibilite-ui-after.json`, `repro-copy-ui-after.json`.

Tests ciblés relancés indépendamment après correction : **19 Python et 8 JavaScript réussis**, logs `review-admissibilite-python.log` et `review-admissibilite-js.log`. La fonction UI de récupération est testée comme code réel avec transport synthétique ; ce n’est pas une réception visuelle Electron. Les tests GUI supplémentaires de l’orchestrateur restent distincts.

### Dernière contre-épreuve — cache et parcours GUI

Le résolveur SQL ne charge désormais que les cinq champs requis. Fixture indépendante avec demande de plus de 40 Ko : le cache contient exactement provider, model, effort, status, archived, aucun texte de demande ; dump SQLite inchangé. Preuve : `repro-context-cache-after.json`. **P3 close.** L’action d’un bloc non projeté est maintenant « Vérifier le bloc » ; les 8 tests JavaScript sont à nouveau verts après ce libellé.

Le log de l’orchestrateur `/tmp/tricorder-tour2-feedback-ui3.log` atteste séparément **9 parcours GUI réussis**, dont cohérence du modèle manquant et configuration d’une copie après échec automatique avec demande longue conservée. Ces parcours n’ont pas été rejoués dans cette relecture. **Aucun constat ouvert du périmètre reçu.**

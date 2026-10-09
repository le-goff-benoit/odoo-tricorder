# Relecture indépendante des corrections de la première campagne

Relecture du 9 octobre 2026, réalisée par un agent distinct des développeurs.
Périmètre : corrections consécutives aux cinq testeurs fonctionnels, dans le
candidat rc.12 en préparation. Aucun fichier produit modifié par le relecteur.

## Décision sur les corrections relues

La seconde campagne fonctionnelle peut examiner ce candidat. Cette relecture de
code et ces tests ciblés ne constituent ni une réception complète de l'app,
ni la validation d'une release client ou d'un fournisseur réel. Les quatre
défauts identifiés pendant cette relecture sont corrigés. La régression de
navigation découverte ensuite a également reçu son test ciblé ; les contrôles
globaux du candidat et la seconde campagne restent à effectuer.

## Défauts trouvés et corrigés pendant la relecture

- **P1 — Fausse configuration requise avec un effort élevé.** Pour les blocs
  `task` et `document`, la projection d'admissibilité utilisait `medium` en
  l'absence d'effort propre au bloc. Ces blocs n'ont pas le champ `execution`
  figé des agents. Une conversation `high` affichait donc « À configurer » et
  proposait une nouvelle exécution, alors que le vrai `claim` natif réussissait.
  Reproduit dans un moteur temporaire, catalogue d'exécutants simulé et sans
  lancement de CLI. Le défaut d'héritage a été corrigé ; le nouveau test
  `test_task_and_document_inherit_high_effort_from_native_conversation` vérifie
  la projection et le contrat de prise en charge réel.
- **P2 — Exemple de meeting incohérent avec sa présentation.** L'exemple de
  simulation utilisait `responsable` et `échéance`, tandis que les colonnes métier
  lisent `owner` et `due`. Les colonnes principales indiquaient une valeur absente
  et les données apparaissaient en supplément. L'exemple neuf utilise désormais
  les champs attendus. Aucun résultat historique n'a été réécrit.

## Complément de réception des deux défauts de présentation

- **P2 — Inspecteur d'une demande suspendue ou annulée : corrigé.**
  `Engine.control` conserve les états des blocs ; la vue ne se rafraîchissait
  donc pas sur ce seul changement. `poll` observe maintenant aussi l'état de
  l'exécution et son attente de coordination. `runInspector` montre une lecture
  seule après annulation et une instruction de reprise pendant une suspension,
  sans formulaire actif. Le moteur n'est pas modifié. Le nouveau test GUI de
  pause puis annulation avec un bloc inchangé réussit dans le journal du pilote.
- **P2 — Attente de quota ou de ressource : corrigé.** Le rendu inclut désormais
  la raison `status=waiting`. Il explique les places ou ressources occupées sans
  proposer une reconfiguration pour cette attente. Les sept tests ciblés de la
  vue d'ensemble ont été exécutés indépendamment après cette correction et
  réussissent, dont le cas de quota avec lancement désactivé.

## Navigation rapide : défaut supplémentaire identifié et corrigé

Le journal du test GUI rouge contenait une exception `StopIteration` dans
`workflow.get`, convertie en « Le moteur local ne répond pas ». Le bouton de
l'ancienne page projet pouvait être cliqué avant la fin d'une navigation vers
le catalogue. Contrairement aux boutons du catalogue, il ne portait pas son
identifiant de projet ; l'action différée pouvait demander le workflow dans
le contexte `workspace` nouvellement affiché.

Les boutons de workflows portent maintenant leur projet, et `open-workflow`
capture la cible avant ses attentes asynchrones. Le backend répond par une
erreur structurée, proposant d'actualiser le catalogue, si le workflow est absent.
Le test conserve le clic rapide ; il n'a pas été remplacé par une attente qui
masquerait la course. Le journal `/tmp/tricorder-rc12-feedback-ui4.log`, lu par
le relecteur, constate **5 tests GUI réussis**, dont cette navigation, la course
de polling et la pause/annulation. Exécution réalisée par le pilote, sans build
ni session graphique supplémentaire du relecteur.

## Contrôles satisfaisants dans le périmètre relu

- Les dépendances multiples passent par la commande validée `conversation.add`.
  Le remplacement conserve la demande précédente et ne transfère aucune décision.
- La reconfiguration crée une copie de définition pour un nouveau lancement ;
  elle ne modifie pas le contrat figé de la demande historique.
- Le résultat tardif de `pollConversation` vérifie identité, époque, recherche
  et page avant remplacement de l'état. La lecture de `query` n'a plus lieu
  après un changement de conversation non vérifié.
- Les brouillons de question/décision/réception sont liés à l'exécution, au bloc
  et à la question ou tentative. Les nouvelles questions ne récupèrent pas une
  réponse d'une question antérieure.
- Les valeurs, clés et métadonnées de preuves sont échappées. Aucun HTML ou
  Markdown du résultat n'est exécuté. Les lecteurs de preuves restent autorisés
  par le moteur et les attributs de hash sont limités à un SHA-256 valide.
- La projection d'admissibilité ne lance pas de fournisseur ni ne réserve de
  ressource. Le dispatcher vérifie encore les conditions avant sa prise atomique.
- L'accueil conserve les emplacements d'état existants. Les titres de terminaux
  viennent des intentions enregistrées et ne sont pas renommés par une recherche
  ou une autre page. Les tests GUI de ces points appartiennent à la recette du
  développeur ; ils n'ont pas été rejoués par ce relecteur.

## Vérifications exécutées indépendamment

- `node --test tests/business-results.test.cjs tests/conversation-view.test.cjs tests/execution-attempts.test.cjs` : **17 réussis**.
- `python3 -m unittest discover -s tests -p test_conversation_dispatch.py -v` : **16 réussis**.
- `python3 -m unittest discover -s tests -p test_functional_feedback_backend.py -v` : **15 réussis** après correction de l'héritage d'effort.
- `git diff --check` : aucun défaut détecté au moment de la relecture.
- Après les deux dernières corrections : `node --test tests/conversation-view.test.cjs` : **7 réussis**, dont deux nouveaux cas ; les cinq premiers avaient déjà été reçus dans les 17 tests JS ci-dessus.

Les tests Python utilisent des données temporaires et des exécutants de test.
Ils ne qualifient pas OpenAI, Anthropic, OAuth, Slack ou un envoi d'email réel.
Pas de build concurrent, de suite globale, de changement de l'application
installée ou d'accès à un projet client pendant cette relecture.

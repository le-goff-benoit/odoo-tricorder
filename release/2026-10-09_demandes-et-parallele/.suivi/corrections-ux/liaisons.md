# Liaison d’une décision nouvellement ajoutée

Observation UX2 sur le paquet figé : une nouvelle décision affiche approve/reject dans ses propriétés, mais Relier propose Travail terminé (done) tant que les propriétés n’ont pas été appliquées. La validation refuse alors done. Fermer/réouvrir Relier ne répare pas ; appliquer la question du bloc puis relier contourne.

Cause source : les défauts de décision sont implicites dans le moteur et dans les propriétés, tandis que refreshConnectionForm ne proposait les issues que si node.options existait explicitement. Le formulaire dépendant est bien rafraîchi ; le défaut est la différence de valeurs par défaut.

Correction source préparée sans toucher au paquet des spécialistes : liste des issues alignée sur le contrat moteur pour décision/revue/sous-workflow/route, libellés humains, choix de branche conservé lorsque le destinataire change et que l’issue reste valide. Recette de régression GUI à jouer après la suite source actuellement active. Aucun accord métier ni état d’exécution modifié.

Contre-épreuve : tests/workflow-wiring.spec.cjs reproduit sur le paquet figé (une seule issue au lieu de deux), puis passe sur sources corrigées : décision ajoutée en GUI sans Appliquer, choix Refuser conservé après changement de destination, sauvegarde/réouverture, retour à une tâche avec issue done. Journaux /tmp/tricorder-ux-wiring-red.log et /tmp/tricorder-ux-wiring-green.log (ce dernier contient aussi un échec d'attendu historique devenu obsolète, distinct de cette régression).

Réception consolidée : six parcours GUI `workflow-wiring.spec.cjs` passent dans `root-8-controles.log` sur dist6bf00be3. Ils couvrent les branches implicites, la lisibilité du mapping, la sélection partielle signalée, le refus humain, l’ordre seul et le remplacement d’une sortie. Trois tests moteur vérifient le rejet des mappings ambigus par lien tout en préservant les prérequis multiples. Les contre-exemples indépendants sont reçus dans `review-creation.md`.

# Accusé perdu : deux ordonnancements explicitement testés

Périmètre : remplacement du seul cas situé initialement à `tests/collection-input-ux.spec.cjs:85`. Aucun fichier produit, dist ou paquet modifié ; aucun rebuild.

L’ancien test imposait deux récupérations après une nouvelle intention identique. Ce résultat n’est correct que si l’UI utilise encore la révision0. Quand le polling a déjà reçu la révision1, la nouvelle intention est admise directement : il reste légitimement une seule récupération (l’accusé perdu du premier ajout).

Les deux cas sont maintenant séparés :

- `stale revision` : les vraies lectures `run.get` sont retenues avant leur exécution jusqu’au retour du deuxième ajout. Première commande exécutée mais accusé perdu, seconde clé distincte avec révision0, vrai conflit moteur, deux récupérations visibles. La résolution ciblée du conflit ajoute la deuxième intention.
- `fresh revision` : attendre le texte réellement sauvegardé dans la liste visible (et pas le simple item placeholder). Seconde clé distincte avec révision1, succès direct, une seule récupération restante.

Dans les deux cas, le retry de la première commande doit reprendre son payload exact, y compris clé et révision. Le test attend une requête supplémentaire et sa réponse effective avant de conclure, car une carte de récupération disparaît aussi pendant une requête en vol. Résultat : exactement deux intentions, puis confirmation et sortie finale contenant exactement ces deux éléments. Aucun délai arbitraire, aucune réponse moteur substituée, aucun branchement de test fondé sur un résultat inattendu. Le verrou de lecture est libéré en `finally`, y compris sur échec.

Preuves indépendantes ayant guidé l’intégration : `/tmp/tricorder-review-collection-ack/results-package-final/*/evidence.json` et `/tmp/tricorder-review-collection-ack/package-final.log` (2/2 verts).

Vérification de l’intégration :

- `node --check tests/collection-input-ux.spec.cjs` : vert.
- Deux variantes sur source : 2/2 verts en 7,4 s, `/tmp/tricorder-editeur-collection-orders-source/`.
- Deux variantes sur paquet : 2/2 verts en 8,1 s, `/tmp/tricorder-editeur-collection-orders-package/`.
- SHA256 du `app.asar` inchangé : `7e89f6ad3d7c6be6907797c505d72bbf4274c5db801c09e670746591324a54b4`.
- Fichier : 9 tests au lieu de 8 ; suite globale : 186 tests (184 passages et 2 exclusions attendus).

Commandes ciblées :

`DISPLAY=:190 XAUTHORITY=/tmp/tricorder-collections-panel/190/Xauthority python3 /tmp/tricorder-ci-target-source-run.py tests/collection-input-ux.spec.cjs --grep 'a new identical intention' --output=/tmp/tricorder-editeur-collection-orders-source --reporter=line`

Même commande avec `/tmp/tricorder-ci-target-package-run.py` et destination `/tmp/tricorder-editeur-collection-orders-package`.

# Relecture indépendante — passation et historique, tour 2

Date : 9 octobre 2026. Périmètre reçu : `business_markdown.py`, intégration dans `documentation.py`, partage de `business-results.mjs` par `execution-attempts.mjs`, noms des preuves du rapport et notice de transfert dans `studio.js`, tests associés. Relecture de code et essais synthétiques ciblés ; aucun essai graphique de cette correction, aucun fournisseur réel, aucun build ni modification du paquet testé par la campagne.

## Conclusion après correction et contre-épreuve

Les trois anomalies P2 reproduites ont été corrigées par l’orchestrateur et contre-vérifiées indépendamment. Aucun P1/P2 confirmé ne reste ouvert dans le périmètre de cette relecture. L’historique principal et la distinction résultat métier négatif/panne sont corrects sur les cas vérifiés. Les suites ciblées passent et les cas de régression ont été ajoutés. La recette graphique du candidat final reste distincte.

Contre-épreuves : preuve structurée réellement copiée dans l’export ; métadonnée de rôle non textuelle tolérée avec nom de fichier conservé ; action imbriquée et responsable présents dans le HTML rendu par `marked`. Preuves après correction : `repro-passation-after.jsonl` et `repro-table-after.html`. Les constatations initiales ci-dessous restent conservées pour expliquer les corrections.

## P2 clos — lien de preuve du rapport exporté sans fichier correspondant

- Localisation : `backend/workflow_engine/business_markdown.py:66` et `backend/workflow_engine/documentation.py:120`.
- Parcours : une tâche documentaire remet une sortie `report` qui contient `{$artifact: {sha256, filename, role}}`. Le contenu est réellement stocké par `engine.artifact`. Cette sortie est autorisée par le contrat `object`. Le rapport est ensuite exporté via `export_work`.
- Attendu : le lien nommé du README conduit au contenu dans le dossier remis au collègue.
- Observé : `value_lines` crée un lien `.suivi/preuves/<sha>`, mais `export_snapshot` ne collecte que `result.evidence`. Avec une preuve portée seulement dans la sortie, le fichier cible manque ; le rapport exporté est incomplet bien que la preuve existe dans le stockage local.
- Preuve : cas `structured-proof-export` du script joint, avec `link_in_report: true`, `target_exists: false`, contenu du magasin lisible.
- Correction conseillée : faire correspondre exactement les références rendues et les fichiers exportés ; collecter/valider les références structurées conservées dans les entrées et résultats, y compris les tentatives archivées, ou ne pas produire de lien de fichier si son export n’est pas assuré. La vérification du hash et le confinement du chemin doivent rester obligatoires.

## P2 clos — métadonnée de preuve non textuelle fait échouer tout le rapport

- Localisation : `backend/workflow_engine/business_markdown.py:56`.
- Parcours : un résultat possède une preuve valide dont `role` vaut `['source', 'deliverable']`. `submit` puis `accept` réussissent : `engine.evidence` vérifie le contenu et le hash, mais n’exige pas que les métadonnées descriptives soient des chaînes.
- Attendu : nom de fichier conservé ; rôle non textuel ignoré ou présenté sans empêcher l’affichage/export du reste du résultat.
- Observé : `ROLES.get(metadata.get('role'))` lève `TypeError: unhashable type: 'list'`. Le rapport devient illisible. Dans l’export, le dossier est déjà créé avant l’appel à `markdown`, donc l’utilisateur obtient également un export partiel occupant son nom de destination.
- Preuve : cas `non-string-proof-role`, état réellement `accepted`, erreur capturée. Le code JS partagé filtre déjà les valeurs non textuelles.
- Correction conseillée : normaliser défensivement les métadonnées descriptives avant la recherche de rôle ; calculer/valider le rapport avant de créer le dossier d’export pour éviter ce résidu en cas d’autre erreur de rendu.

## P2 clos — actions imbriquées perdues dans le rapport affiché

- Localisation : `backend/workflow_engine/business_markdown.py:81`.
- Parcours : une action possède un champ supplémentaire `checks`, lui-même liste d’actions. Exemple : action principale « Relire », responsable Alice ; contrôle « Vérifier », responsable Bob.
- Attendu : la donnée supplémentaire reste lisible dans le rapport, comme dans la vue métier HTML partagée.
- Observé : `value_lines` insère la syntaxe d’un deuxième tableau Markdown directement dans une cellule du premier. Les pipes supplémentaires sont interprétés comme de nouvelles colonnes ; `marked`, utilisé par l’application, élimine les cellules surnuméraires. L’action « Vérifier » et « Bob » sont absents du rendu HTML, pas seulement mal alignés.
- Preuve : cas `nested-action-table` dans `repro-passation.jsonl`, puis `repro-table.html` généré avec `marked` du dépôt. Le HTML garde quatre cellules, dont la quatrième est vide.
- Correction conseillée : utiliser une représentation de cellule sans tableau imbriqué, ou extraire les structures complexes sous le tableau. Vérifier le texte rendu, et non seulement la présence de la donnée dans le Markdown source.

## Vérifications positives

- `Engine.retry` enregistre le motif sur l’état suivant ; les deux projections utilisent bien `history[index + 1].reason`, puis `current.reason` pour la dernière tentative. La vue projetée utilise `retry_reason`. Pas d’inversion constatée.
- Un `ok: true` avec verdict routé `fail` demeure un résultat non conforme, pas une panne technique. Les résultats simulés ont une mention explicite. Aucune validation humaine n’est déduite de la sortie métier.
- Les preuves nommées conservent leur hash ; le bouton de rapport transmet son texte comme titre de la fenêtre, qui échappe le titre. La pagination conserve ce nom. Les liens locaux acceptés sont limités aux hashes de 64 caractères hexadécimaux.
- Les sorties HTML partagées échappent leurs champs et conservent les données inconnues dans leur représentation ou leur volet technique. Les scripts/HTML des valeurs testées ne deviennent pas des éléments actifs.
- La notice de transfert décrit un nouveau workflow issu d’une exécution sans projet et précise que validations et autorisations ne sont pas transférées. Son bouton réutilise `openRun`, qui recharge le projet et l’exécution source ; aucun état métier n’est écrit par la notice.
- Les essais et le code de présentation n’écrivent aucun état de production, ne font pas de transition forcée et ne lancent aucun agent fournisseur.

## Exécution des contrôles

Tous les contrôles ont été exécutés depuis la source, paquet `linux-unpacked` laissé intact.

| Contrôle | Résultat |
|---|---|
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_business_reports.py' -v` | 3 réussis initialement ; 4 après correction |
| `node --test tests/execution-attempts.test.cjs` | 6 réussis |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_workflow_journeys.py' -v` | 6 réussis |
| `node --test tests/business-results.test.cjs` | 7 réussis |
| `repro-passation.py` + rendu du troisième cas avec `marked` | 3 anomalies reproduites, puis 3 contre-épreuves réussies |

Fichiers de preuve : `repro-passation.py`, `repro-passation.jsonl`, `repro-table.html`, `repro-passation-after.jsonl`, `repro-table-after.html`, dans ce même dossier. Les deux fichiers sans suffixe `after` conservent le résultat initial. Le script utilise un répertoire temporaire supprimé après l’essai et les API `Engine` ; aucun JSON/SQLite n’est retouché.

## Limites de cette réception

Cette revue ne constitue pas la recette graphique du candidat final, ni celle des services externes/fournisseurs. Elle ne certifie pas la portabilité d’un lien vers l’exécution d’origine sur un autre poste ne possédant pas cet historique. Les champs Markdown de demande/titre/questions non modifiés par ce correctif ne font pas l’objet d’un audit global de sécurité. Aucun fichier produit ni test du produit n’a été modifié par le reviewer.

# Relecture indépendante — moteur, simulation et récupération des erreurs

9 octobre 2026. Relecture de l’agent `review_creation_moteur`, sans modification du produit, sans reconstruction ni exécution de la suite complète. Les contrôles ci-dessous portent sur les sources, avec projets temporaires et processus fournisseurs inertes. Aucun projet client, compte, secret ou fournisseur commercial n’a été utilisé.

## Avis

**Aucun défaut bloquant restant dans le périmètre reçu.** Un défaut P2 de diagnostic des réponses fournisseur a été trouvé, reproduit, corrigé par l’orchestrateur et contre-vérifié indépendamment. Une attente de test devenue obsolète a également été corrigée. Cet avis ne constitue pas la recette globale du paquet ni celle d’un fournisseur réel.

## Défaut trouvé et corrigé

**P2 — réponse fournisseur de mauvaise forme encore présentée comme une erreur Python brute.**

La première correction attrapait les erreurs de syntaxe JSON et d’encodage. Un processus fournisseur local renvoyant `null`, `[]`, `42`, `"unexpected"` ou `{"type":"item.completed","item":null}` passait le décodage JSON mais déclenchait ensuite une erreur telle que `'NoneType' object has no attribute 'get'`. L’utilisateur recevait de nouveau un diagnostic technique sans action claire. Le travail restait heureusement en attente de réception, la décision suivante demeurait `pending` et les transcriptions étaient supprimées.

Reproduction indépendante : `/tmp/tricorder-review-provider-shapes.py`, résultat initial `/tmp/tricorder-review-provider-shapes.log`. Cinq vrais processus Python locaux inertes ont été exécutés par le connecteur, avec commande fournisseur substituée explicitement.

Correction reçue : validation explicite des événements objets/type, de l’objet `item` et du texte Codex, des détails d’erreur et de la liste des outils Claude. Le rejet devient un `ContractError` en français indiquant connexion, modèle, version et reprise. Il n’existe pas de capture globale de `AttributeError` ou `TypeError` qui masquerait une autre erreur du programme.

**Contre-épreuve : les cinq cas originaux passent**, avec le message corrigé, la décision suivante toujours bloquée et zéro transcription restante. Résultat : `/tmp/tricorder-review-provider-shapes-final.log`. Le test permanent `test_provider_errors.py` passe aussi avec ses huit sorties synthétiques. Quatre formes invalides de `tools` Claude ont été refusées ; `StructuredOutput` reste accepté et `Bash` reste refusé dans ce contexte texte.

## Contrats et simulation reçus

- `condition_outcome` ne convertit que les vrais booléens Python, uniquement quand les issues explicites `true` et `false` existent. Le port conserve sa valeur booléenne ; seul l’identifiant de branche devient une chaîne. Les chaînes, nombres et valeurs nulles ne sont pas coercés en booléens. Les intitulés arbitraires comme `urgent`/`normal` ne sont pas interprétés.
- `validate_result` vérifie la compatibilité au niveau du producteur, avant réception. `_advance` utilise la même règle lors du branchement. Les deux chemins vrai/faux activent uniquement la décision humaine prévue ; aucune décision n’est produite automatiquement.
- `output_examples` complète les sorties manquantes par type et conserve les exemples explicitement fournis, même invalides. Les valeurs sont copiées profondément ; modifier le résultat d’exemple ne modifie pas la définition. Une donnée explicite incompatible reste refusée par le contrat normal.
- La recherche d’exemples prend en compte l’intersection des conditions reliées. Des conditions disjointes sont refusées avec une explication. Les conditions d’une branche inactive n’imposent pas leurs valeurs à la branche active.
- La simulation est traitée avant tout fournisseur, commande ou plugin. Une contre-épreuve sur un agent comportant une capacité plugin confirme zéro appel à l’outil, au fournisseur et à `Popen`. Les résultats restent marqués `SIMULATION` et `simulated`; les décisions humaines restent en attente. Une configuration d’exemples qui n’est pas un objet échoue sans faux succès.
- Les protections existantes conservent la séparation des résultats simulés et réels : la réutilisation exige le même mode et l’application d’un candidat exige une exécution réelle. Cette relecture n’élargit aucune autorisation.

Une attente ancienne dans `test_functional_feedback_backend.py` exigeait encore l’échec d’une simulation sans exemple explicite. Elle échouait avec le nouveau comportement volontaire. Elle a été remplacée par le refus d’une valeur explicitement invalide ; la génération des valeurs absentes reste couverte séparément. **Les 19 tests de ce fichier passent après correction.**

## EPIPE reçu

La garde installée dans `electron/entry.cjs`, avant le chargement de l’application, traite uniquement les événements `EPIPE` de stdout/stderr. Les autres erreurs de ces flux restent levées. Aucun gestionnaire global d’exceptions n’est ajouté.

Les deux tests Node ont été rejoués : vraie fermeture des lecteurs de pipes puis écriture, et propagation d’une erreur différente. La preuve rouge fournie sur l’ancienne ASAR contient bien la pile Electron `console.error` → `replyWithError`, cohérente avec l’incident signalé. Une première tentative utilisant seulement la console Node n’était pas reproductrice ; elle n’est pas retenue comme preuve.

**Contre-épreuve Electron source indépendante : 1 test réussi**, sur l’écran isolé `:181`, sans build. Après fermeture des deux lecteurs, une requête moteur incorrecte est refusée normalement, une seconde requête crée un projet et la navigation reste utilisable. Aucun événement d’exception native n’est observé. Le banc enregistre les dialogues natifs pour échouer sans bloquer l’automatisation ; il ne les ignore pas. La capture obtenue a été ouverte et inspectée. Journal : `/tmp/tricorder-review-output-ui.log`; capture : `/tmp/tricorder-review-output-ui/desktop-output-pipes-a-rec-31722-s-launcher-closes-log-pipes/desktop-after-closed-log-pipes.png`.

## Complément interface relu

Lecture de `workflow-design.mjs` et de ses usages dans `studio.js`/`app.js`, puis rejeu des cinq tests unitaires de conception. Les avertissements de liens restent consultatifs : ils n’interdisent ni les brouillons ni les racines indépendantes. La présence d’un paramètre `false` et la priorité des paramètres locaux suivent le moteur. La suppression présente les liens touchés. Les données simulées invalides ne sont pas réparées silencieusement ; l’utilisateur corrige ou revient explicitement à une valeur automatique.

Les modèles intégrés sont copiés avec un nouvel identifiant et un nom explicite. La provenance et la destination sont indiquées ; l’import permet d’examiner les blocs avant le JSON technique. `terminalStatus` reste une observation des sessions et le retour de polling vérifie encore la conversation et la vue avant de repeindre l’interface. Aucun changement d’état moteur n’est introduit par cette observation.

Les sept parcours GUI de l’éditeur rapportés dans [editeur.md](editeur.md) ont été lus comme preuves du développeur ; **ils n’ont pas été rejoués par cet agent et ne sont pas revendiqués comme recette indépendante**. La campagne des cinq spécialistes UX/UI conserve son intérêt pour densité, navigation, clavier et lisibilité.

## Contrôles réellement joués

| Contrôle | Résultat final |
|---|---|
| `tests/test_condition_inputs.py` | 7 tests réussis |
| `/tmp/tricorder-review-creation-edgecases.py` | 7 contre-épreuves supplémentaires réussies |
| `tests/test_support_routing.py` | 9 tests réussis |
| `tests/test_functional_feedback_backend.py` | 19 tests réussis après correction de l’attente obsolète |
| `tests/test_provider_errors.py` | 1 test réussi, huit variantes de réponse inerte |
| `/tmp/tricorder-review-provider-shapes.py` | 5 reproductions rouges, puis 5 contre-épreuves corrigées |
| Événements Claude directs | 4 formes invalides rejetées ; contrôle autorisé/interdit conservé |
| `tests/output-streams.test.cjs` | 2 tests réussis |
| `tests/workflow-design.test.cjs` | 5 tests réussis |
| `tests/desktop-output-pipes.spec.cjs` | 1 parcours Electron source réussi |

Le premier lancement Node avec `/usr/bin/node` ne supportait pas `--test`; aucun résultat de test n’en est déduit. Le rejeu utilise explicitement Node 24.15.0, avec PATH excluant les CLI utilisateurs. Les tests Python utilisent également un PATH sans fournisseurs. Les appels de fournisseur de la contre-épreuve sont des scripts Python temporaires explicitement substitués.

## Limites et intégration

La réception finale doit reprendre les vérifications obligatoires sur les sources finales et le paquet reconstruit. L’ASAR a été reconstruite par l’orchestrateur pendant la fin de cette relecture ; ce rapport ne prétend pas recetter son nouveau contenu. Aucun rebuild, commit ou changement du paquet n’a été fait par cet agent.

Les données générées servent à essayer le parcours et ne démontrent aucun jugement IA ni résultat métier. Le choix d’une branche synthétique par défaut n’atteste pas sa pertinence métier. Les comparaisons numériques, la coordination durable des sous-demandes et le rassemblement des candidats parallèles n’ont pas été ajoutés ou reçus par cette relecture. Aucun état de release client n’a été corrigé ou validé.

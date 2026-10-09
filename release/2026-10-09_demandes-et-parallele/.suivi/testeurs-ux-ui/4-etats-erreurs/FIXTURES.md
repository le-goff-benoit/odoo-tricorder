# Fixtures prévues — aucune exécution moteur

Note après réception : ce document décrit la préparation initiale. La session autorisée a ensuite utilisé quatre fixtures validées Engine ; voir `fixture-events.jsonl`, `engine-final-read.json` et `RAPPORT.md` pour les états effectivement reçus et les gestes GUI.

Le banc existe dans le chemin temporaire consigné dans `ux4-etats-erreurs-preparation.json`. Deux exécutables stubs `codex` et `claude` y sont présents. Chacun affiche `TRICORDER-UX-INERT` ; hors `--version`, il quitte avec le code 78. Aucun moteur, broker ou GUI démarré à cette étape.

| Fixture | Donnée purement fictive | État à obtenir | Préparation prévue |
| --- | --- | --- | --- |
| Événement | Atelier de dessin, 6 personnes, salle fictive, 45 minutes | Bloc actif et bloc déjà terminé | Configuration et lancement GUI ; état validé Engine seulement si le stub limite la progression |
| Question | Invitation à l’atelier, langue non précisée | Question imprévue en attente | Commande Engine validée, contrat à lire après la première observation |
| Validation | Invitation française de deux phrases | Décision prévue en attente | Bloc de validation configuré GUI ; préparation Engine si nécessaire |
| Panne | Synthèse de notes entièrement fictives | Échec/tentative/reprise | Échec réel du stub local lancé via GUI ; code 78 annoncé comme simulation |
| Résultat A/B | Deux plans fictifs de réunion, 30 puis 45 minutes | Exécutions terminées distinctes et historique | Résultats synthétiques via Engine validé si impossibles avec les stubs |

Ce document spécifie les fixtures ; il ne prouve ni leur réception par le moteur ni leur affichage. Aucune donnée d’exécution SQLite/JSON n’a été retouchée. Les réponses, décisions et reprises seront effectuées par les commandes visibles de la GUI, jamais par API de contournement.

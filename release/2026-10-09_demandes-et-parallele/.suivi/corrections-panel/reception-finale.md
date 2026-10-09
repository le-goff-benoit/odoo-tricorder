# Réception finale locale — 0.6.0-rc.12

Les cinq campagnes sont reçues : 29 profils d’agents, dont neuf profils variés et 27 parcours pour le dernier panel. Les avis d’agents ne sont pas présentés comme une étude auprès de personnes humaines.

## Résultats sur le candidat corrigé

| Contrôle | Résultat |
|---|---|
| `npm test` | 345 tests Python et 135 tests JavaScript réussis |
| `npm run test:ui` | 146 parcours réussis ; 2 tests optionnels sur projets réels désactivés |
| `npm run dist` | Paquet Ubuntu amd64 construit |
| `npm run test:packaged` | 146 parcours réussis ; mêmes 2 tests optionnels désactivés |
| Intégrité | Sources embarquées, ASAR et 50 fichiers backend comparés au paquet DEB extrait ; aucun bytecode Python embarqué |

[Logs complets et manifeste](reception-finale/verification.json). ASAR reçu : `aa118d030f1f6cbe500462921b873e2d84fef283d1218acc4064a9367356d944`. SHA-256 du DEB : `c548ea88ebeb64c3b4dbea8fdf45de9ce7c829fd92e6267109cb6091206f025a`.

## Les essais rouges sont conservés

Le premier passage complet a donné 136 succès / 10 échecs / 2 désactivés sur les sources et 135 / 11 / 2 sur le paquet. Deux régressions produit ont été corrigées : une bande de contexte vide et un accès à la conversation remplacé par un shell lorsqu’une question ou décision attendait une réponse. Cinq cas avaient des attentes obsolètes de masquage ou de syntaxe SVG ; un test lisait le dépôt avant la fin de la sauvegarde. Les contrôles métier et l’identité des terminaux ont été conservés ou renforcés. Le deuxième passage a reçu les 146 parcours du paquet ; une attente source restait trop courte pour les deux cycles de rafraîchissement du terminal et du workflow. Le test vérifie maintenant séparément l’arrêt affiché puis la commande de reprise, sans rafraîchissement forcé. La dernière passe source complète confirme les 146 parcours.

[Passage initial](reception-initiale/) · [Diagnostic et relecture indépendants](../review-panel/FOLLOWUP-RECEPTION.md).

## Portée et limites

Bancs synthétiques, fournisseurs inertes et adaptateurs locaux. Les tests vérifient notamment décisions ciblées, brouillons, reprise, copie de workflow, branches, activité avant pagination, planifications et conservation des PTY. Ils ne qualifient ni un modèle commercial, ni un compte distant, ni une release cliente Odoo.

Le contrat parent/demandes, l’approbation commune, l’intégration des candidats et la QA commune restent à construire. Le lancement parallèle est une vague explicite. Le libellé Ajuster et la surface de lecture sur petit écran restent des réserves décrites par la review.

La publication exige également une CI réussie sur le commit exact ; son lien et le manifeste du paquet livré sont joints à la release GitHub. L’installation locale réutilise le même lanceur, sans redémarrer l’application ni terminer les PTY.

# Terminal, reprise et contexte des demandes

Corrections ciblées après les audits UX1 (N1), UX3 (contextes et reprise) et UX4 (priorité du mode conversation et résultat terminé), le 9 octobre 2026.

## Changements

- Activité, Vue d’ensemble et Demande indiquent l’arrêt du fournisseur et proposent **Reprendre l’agent…**. Cette action ouvre le dialogue existant : aucun agent n’est relancé avant confirmation. **Voir le shell** reste une action distincte.
- Une étape accessible à l’agent de la conversation est présentée comme telle, même si son exécution par un agent de bloc séparé demande une configuration. Cette seconde option reste visible, avec sa cause, dans un détail facultatif. Une impossibilité native réelle reste affichée.
- Le terminal d’une conversation multi-projets conserve son dossier. Son contexte affiche en premier les deux noms : **Shell : Atelier Azur · Demande affichée : Laboratoire Corail**, sans remplacer le nom du shell par un ID technique.
- Une suspension explicite propose **Reprendre la demande** près de sa cause. Le dialogue de reprise de l’agent indique que la demande restera suspendue. Une attente automatique de prérequis ne propose pas cette reprise manuelle. Le moteur reste seul responsable des transitions.
- Un détail de dépendances ouvert se rafraîchit aussi lorsque l’état d’une autre demande change.
- Une demande terminée expose ses résultats et un accès secondaire au terminal ; elle n’invite pas à relancer l’agent pour consulter le résultat.
- Les totaux locaux de l’Activité incluent les arrêts d’agents observés sur la page, sans les présenter comme un total global calculé par le moteur.

## Réception GUI

Quatre tests dédiés dans `tests/terminal-resume-ux.spec.cjs`, sur DISPLAY181, stubs installés avant le premier broker, HOME/XDG/CODEX_HOME/CLAUDE_CONFIG_DIR/état/runtime isolés. Aucun fournisseur réel, client, production, build de paquet ni commit.

Premier passage du produit : **4 tests réussis en 34,1 secondes**, avec `dist/app.js` SHA256 `3ca4efa9f5e4eca1703cc06d89692e8c6f65db64588d3fa812ada83e77bb7518`. Six captures lues visuellement. Ce passage prouve :

1. Reprise explicite depuis Vue d’ensemble puis Activité ; dialogue annulé conservant la saisie shell ; un lancement supplémentaire après confirmation ; mêmes IDs/PIDs et une seule conversation avec les mêmes trois demandes.
2. Deux noms de projets corrects pendant la sélection d’une demande Corail depuis un shell Azur.
3. Relance de l’agent sans lever la suspension ; reprise séparée de la demande enregistrée une seule fois ; demande dépendante toujours en attente sans reprise automatique.
4. Résultat terminé consultable sans action principale de relance de l’agent.

Le compteur du premier banc comptait aussi la sonde locale `codex app-server proxy` comme un lancement interactif : les quatre essais initiaux se sont arrêtés dans leur préparation. Fixture corrigée pour distinguer cette sonde, refusée par le stub, du vrai lancement interactif ; aucune correction produit destinée à masquer ce résultat.

Après relecture des captures, trois finitions de présentation et l’actualisation d’une dépendance ouverte ont été ajoutées. Les tests attendent désormais la stabilisation des statuts après le polling et vérifient que les deux noms restent effectivement visibles à 1280 × 900. **Réception finale : 4 tests réussis en 42,1 secondes**, avec `dist/app.js` SHA256 `6bf00be3b50c9e2d0876f893f8dbbe8b0f8b3e893e4e30542bb77cf41a940c0c`. Le cas terminé a ensuite été renforcé pour attendre aussi le compteur global « 1 terminée » avant sa capture : ce seul cas a été rejoué et réussi en 8,9 secondes, sans modification produit ni nouveau build. Le paquet `build-artifacts` est resté figé pour la campagne indépendante.

## Limites

Les stubs impriment un marqueur puis quittent ; ils ne qualifient ni un fournisseur commercial ni la reprise de son identifiant de session natif. Le résultat final est une fixture déposée par les commandes validées du moteur, sans retouche SQLite/JSON, et ne prouve aucun travail d’IA. La détection de l’arrêt et l’actualisation des demandes suivent le polling de l’application ; les captures transitoires ne sont pas utilisées pour qualifier l’état final.


## Preuves finales conservées

Les six PNG ont été relus visuellement. Les empreintes sont enregistrées dans [PREUVES.json](terminal/PREUVES.json).

- [Activité : compteur cohérent et agent arrêté](terminal/captures/activity-agent-stopped.png).
- [Même terminal après reprise explicite et retour au shell](terminal/captures/same-terminal-after-explicit-resume.png).
- [Noms des deux projets à 1280 × 900 et bloc « Dans la conversation »](terminal/captures/cross-project-named-context.png).
- [Suspension manuelle et bouton de reprise de la demande](terminal/captures/manual-suspension-next-action.png).
- [Dépendance automatique, parent actualisé et absence de reprise manuelle](terminal/captures/automatic-dependency-without-resume.png).
- [Résultat terminé, compteur actualisé et accès secondaire au terminal](terminal/captures/completed-without-agent-restart.png).

Applications et brokers des fixtures arrêtés, répertoires temporaires nettoyés. DISPLAY181 conservé pour les prochaines campagnes. `git diff --check` réussi. Aucun commit et aucune publication effectués par cette correction.

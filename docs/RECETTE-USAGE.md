# Recette d’usage par les six personas

Le retour attendu décrit une difficulté vécue en accomplissant une tâche : ce que
l’utilisateur voulait faire, ce qu’il pensait obtenir, ce qu’il a compris à l’écran,
où il a hésité et les conséquences. Une assertion verte ne suffit pas à recevoir
l’ergonomie. Ce mandat provient du retour utilisateur du 10 octobre 2026.

| Persona | Préoccupation principale |
|---|---|
| Fondateur SaaS/services | Retrouver le travail de plusieurs clients, déléguer une routine et comprendre quand intervenir. |
| Chef d’équipe services | Qualifier un ticket sans confondre bug et urgence, répondre dans le bon canal, retrouver la réponse. |
| Développeur senior sceptique | Comprendre ce qui s’exécute réellement, distinguer configuration et exécution, diagnostiquer et reprendre un échec. |
| Responsable opérations PME | Créer une petite procédure depuis son besoin sans connaître les identifiants techniques ni les contrats de données. |
| Responsable produit B2B | Décider, retrouver une synthèse et faire évoluer un modèle réutilisable avec des critères métier. |
| Consultant multi-client | Distinguer modèle partagé, adaptation client et demande ; préserver le contexte lors des allers-retours. |

Chaque agent reçoit deux intentions, un candidat figé et un environnement
synthétique isolé. Il choisit ses premiers clics et note ses surprises avant de
lire le code ou les rapports des autres. Le rapport conserve les contournements,
les abandons éventuels et un verdict d’adoption motivé. Les captures et un script
rejouable accompagnent les constats. Les erreurs du pilote de test sont distinguées
des difficultés visibles dans l’application.

Le protocole exige des scripts autonomes : aucune succession de commandes dans
un terminal interactif externe. Les fixtures utilisent les commandes validées du
moteur, jamais des états retouchés. Toute simulation, fournisseur inerte ou donnée
injectée est déclarée ; aucune de ces preuves ne qualifie un service externe ou
une analyse métier réalisée par un modèle réel.

La consolidation relie chaque correction à un constat et une contre-épreuve.
Les rapports du premier candidat restent inchangés. Les points non corrigés sont
conservés avec leur conséquence, sans déclarer une autonomie que les essais ne
montrent pas. Il s’agit d’agents jouant des personas, pas d’une étude auprès de
participants humains.

Première application de ce mandat :
[retours d’usage du 10 octobre](../release/2026-10-10_retours-usage/README.md).

Deuxième application : [revue spécialisée, corrections puis nouveau panel](../release/2026-10-10_retours-personas/README.md). La revue spécialisée précède les six parcours indépendants. Chaque correction issue de ce panel fait ensuite l’objet d’une contre-épreuve ciblée sur un candidat figé ; les rapports initiaux restent conservés.

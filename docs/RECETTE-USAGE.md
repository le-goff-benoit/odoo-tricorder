# Recette de découverte par neuf personas

Le retour attendu décrit une difficulté vécue en accomplissant une tâche : ce que
l’utilisateur voulait faire, ce qu’il pensait obtenir, ce qu’il a compris à l’écran,
où il a hésité et les conséquences. Une assertion verte ne suffit pas à recevoir
l’ergonomie. Ce mandat provient du retour utilisateur du 10 octobre 2026.

| Persona | Intentions principales |
|---|---|
| Assistante administrative | Plusieurs réunions et fichiers → compte rendu, actions et email. |
| Dirigeant non technique | Comprendre avant de lancer, retrouver un résultat et savoir quand intervenir. |
| Responsable opérations | Construire une routine, demander une décision seulement sur anomalie, renouveler les sources. |
| Chargé de support | Choisir la source, distinguer nature/urgence/impact, personnaliser la réponse. |
| Consultant multi-client | Partager une méthode, personnaliser sans perdre le projet ou le terminal concerné. |
| Responsable produit | Créer une méthode et ses informations de lancement sans confondre questions et données internes. |
| Chef de projet | Deux analyses parallèles, consolidation sur les deux résultats, responsabilités et décisions. |
| Développeur senior sceptique | Lire les contrôles de livraison exacts, vérifier les versions, comprendre une reprise. |
| Spécialiste workflows | Critiquer orchestration, sources, répétition et limites, puis contre-analyser les contrats. |

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

Troisième passage ciblé : [configuration des demandes et points restants](../release/2026-10-10_retours-complementaires/README.md), avec formulaires propres à chaque exécution, création de modèles et réponses planifiées.

Nouvelle campagne : [méthodes réutilisables et découvertes froides](../release/2026-10-10_methodes-reutilisables/README.md).
La référence rc.17 et la réception des candidats sont séparées. Aucun agent ne
reçoit une liste de clics attendus. Il doit s’arrêter s’il ne comprend plus comment
accomplir sa tâche, conserver ses hésitations et son temps, puis qualifier la
conséquence métier. Les tests du moteur, essais avec fournisseur inerte et véritables
appels IA sont des preuves distinctes. Un abandon initial ne disparaît pas après
correction ; une contre-épreuve identifiée vérifie cette correction.

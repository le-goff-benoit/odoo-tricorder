# Persona 6 — responsable produit, découverte de rc.17

Agent jouant un utilisateur d'aisance informatique moyenne, novice de Tricorder. Ce rapport est une revue de découverte par agent, pas une étude auprès d'un humain. Binaire figé rc.17 ; profil temporaire isolé ; aucun fournisseur ni service externe utilisé. Pas de lecture du code de l'application, du README, des autres retours ou d'API de workflows. Les captures constituent l'observation principale : le texte `body` extrait par le pilote ne contient pas le contenu de la vue centrale.

## Intention 1 : comprendre une méthode avant de l'utiliser

Je veux préparer un suivi de réunion, mais savoir d'abord quelles réunions fournir, quels agents travaillent, quelle relecture est prévue et ce que je recevrai. J'attends de pouvoir ouvrir le modèle sans créer de demande.

Parcours réellement effectué : Workflows → Modèles → clic sur le titre « Clôture de réunion » → aucun changement → Utiliser → Continuer → fermeture de la fenêtre de lancement → clic sur la première étape dans l'éditeur. Aucune exécution lancée.

| Attente | Observation | Conséquence |
|---|---|---|
| Le titre d'un modèle permet de le consulter. | Le clic sur « Clôture de réunion » ne change rien ; seules Utiliser, Créer une adaptation et Personnaliser une copie sont proposées. Captures 04 et 06. | Impossible d'évaluer naturellement la méthode sans choisir une action dont la portée est incertaine. |
| Utiliser permet au moins d'inspecter avant d'enregistrer. | Utiliser ouvre Nouvelle demande ; Continuer débouche sur une fenêtre de lancement et un workflow déjà marqué « Révision 1 · Enregistré ». Captures 07, 09 et 12. | Ma simple exploration produit déjà un objet enregistré. La frontière modèle/demande/workflow est brouillée. |
| Je vois l'ensemble du parcours et les intervenants. | Derrière la fenêtre, graphe défilant horizontalement ; après fermeture, choix d'une étape et long panneau de propriétés. Une étape est nommée Tâche IA, sans rôle d'agent visible à ce niveau. Capture 12. | Je dois explorer plusieurs niveaux pour comprendre une méthode de trois étapes ; qui fait le travail reste incertain. |
| Les sources sont une étape concrète. | Le lancement comporte « Réunions ou période » et « Notes, transcriptions ou liens » avec chemins de documents ; pas de sélection de document à cet endroit. Capture 09. | Les questions sont utiles, mais je dois organiser moi-même plusieurs sources et leur correspondance aux réunions. |
| La bibliothèque présente des méthodes. | L'introduction parle à la fois workflows complets et blocs à composer ; le premier modèle visible est un exemple simulé. Capture 04. | Difficulté à distinguer méthode prête à travailler et démonstration. |

Verdict : découverte partielle, abandon avant lancement. La source et les résultats sont évoqués ; je n'ai pas pu juger la coordination et les décisions avant d'entrer dans un workflow enregistré. L'absence de fournisseur réel empêche de qualifier la qualité d'un résultat, mais n'explique pas ces obstacles de consultation.

## Intention 2 : créer une synthèse hebdomadaire réutilisable

Je veux fournir chaque semaine des retours clients, obtenir une synthèse factuelle avec trois priorités maximum, puis relire le résultat. J'attends une méthode qui me demandera les nouveaux retours à chaque occurrence.

Parcours : retour aux modèles → Créer un modèle → conserver « Workflow simple — premier bloc au choix » et « Tâche guidée » → nom « Synthèse hebdomadaire produit » → ouvrir → nom et consigne du premier bloc → résultat attendu « Synthèse à partager », texte → information à utiliser « Retours clients de la semaine », texte requis → appliquer → enregistrer → Exécuter → examiner l'avertissement.

La création du nom, de la consigne et d'un résultat texte est possible sans clé technique. Les libellés de ces actions sont compréhensibles. En revanche, je suis orienté d'emblée vers le choix d'un type de bloc, avant d'avoir exprimé résultat, source ou organisation. Capture 16.

Le défaut majeur survient avec la source : « Ajouter une information à utiliser » semble être la bonne action pour demander les retours de la semaine. J'ajoute cette information. L'éditeur la montre ensuite comme « À relier à une étape précédente ». Au lancement, aucun champ portant ce nom ; seulement la demande générique et « 1 point de conception à vérifier ». L'avertissement explique finalement : « Entrée sans lien : Retours_clients_de_la_semaine » et conseille de retirer les entrées inutilisées pour travailler sur la demande initiale. Captures 25, 29, 34 et 37.

Conséquence : j'ai décrit ce que la méthode utilise, mais j'ai en réalité déclaré un échange entre blocs. La création de la source de l'utilisateur et le contrat technique entre étapes sont confondus. L'avertissement est utile pour éviter une fausse assurance, mais arrive après la configuration et utilise un identifiant technique. Je ne sais toujours pas créer la question répétable que je voulais poser chaque semaine.

Verdict : un modèle simple a été enregistré, mais la mission « créer une méthode fiable et répétable » n'est pas reçue. Abandon avant exécution ; aucun résultat final ni relancement testé. Une consigne libre n'est pas une preuve que les sources seront recueillies correctement à chaque demande.

## Priorités proposées

1. Consultation sans effet : une action Voir montrant résultat, sources, étapes, agents et décisions avant toute création.
2. Source de chaque demande dans la création simple ; traduire cela en formulaire de lancement. Réserver les informations venant d'une autre étape à une action distincte et avancée.
3. Présenter méthode et demande comme deux objets compréhensibles ; ne pas créer de workflow enregistré au simple passage vers le formulaire de demande.
4. Exposer les rôles et la coordination dans la consultation ; détails du graphe accessibles ensuite.
5. Refaire cette mission de création avec un regard neuf. Ne pas transformer ce parcours partiel en verdict d'adoption globale.

## Preuves et reproduction

`parcours.cjs` lance le binaire réel dans un profil neuf et reçoit les actions sémantiques sur stdin. Lancer avec `PATH=/tmp/tricorder-xvfb/usr/bin:$PATH xvfb-run -a node parcours.cjs`. Suivre les deux séquences ci-dessus ; les `nth` pour Utiliser servent uniquement à désigner la carte dont le nom a été observé visuellement. Les captures numérotées préservent les détours. `observations.json` répertorie les captures.

Un incident du pilote est séparé du produit : la première recherche de « 1 point de conception à vérifier » visait une copie de ce texte derrière la fenêtre et a expiré. Le même texte visible dans la fenêtre a ensuite été cliqué normalement (capture 37). Ce délai ne constitue pas un obstacle utilisateur de l'application. Aucun état modifié par API, aucun jeu de résultats injecté.

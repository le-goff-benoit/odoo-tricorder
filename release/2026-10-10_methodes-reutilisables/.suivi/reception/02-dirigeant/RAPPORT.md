# Réception autonome — dirigeant non informaticien

Date : 2026-10-10. Application figée `/tmp/tricorder-method-review-v1`. Parcours à froid, sans onboarding, uniquement fenêtres et commandes de l'interface Electron. Profil temporaire distinct ; HOME, XDG, Tricorder, Codex et Claude isolés ; exécutables Codex/Claude inertes (sortie 78). Aucun service IA réel, secret, API métier, code produit, README, test ni rapport d'autrui consulté. Durée de navigation : environ 4 minutes, sous la limite de 10 minutes. Deux intentions.

Les citations ci-dessous sont les hésitations de la persona lors du parcours, pas un verbatim recueilli auprès d'un participant humain. Gravité : faible = détour ; moyenne = incompréhension nécessitant une aide ; forte = objectif métier bloqué. La qualification métier d'une simulation est exclue.

## Intention 1 — comprendre la méthode support, la choisir, abandonner sans polluer la bibliothèque

Parcours : Workflows → Modèles → Support : comprendre et répondre → Utiliser → Continuer → saisie de notes → fermeture de la préparation → Retour à la liste → Workflows → Workflows enregistrés.

| Étape et preuve | Hésitation de la persona | Attendu | Observé | Gravité |
|---|---|---|---|---|
| Accueil / Workflows — 01, 02 | « Je cherche une manière de traiter le problème du client. Modèles devrait me proposer des façons de faire. » | Accéder à des méthodes lisibles. | Modèles est visible dans Workflows ; le support est identifiable par son nom. | Aucune |
| Aperçu support — 04 | « Je peux voir ce qui sera fait avant de m'engager. » | Lire entrées, déroulement et résultat sans créer une copie. | Texte concret, informations à fournir, résultat attendu, trois groupes d'étapes ; mention « aucune copie ni exécution créée ». | Aucune |
| Choix — 05 | « Sans projet ? Mon problème n'a pas besoin d'un dépôt. » | Lancer une préparation globale. | Sans projet proposé, support déjà sélectionné ; Continuer ouvre le formulaire de demande. | Faible : formulation “Le modèle sera utilisé dans Sans projet” peu naturelle |
| Préparation puis fermeture — 06, 07 | « Je ferme, mais est-ce que j'ai enregistré quelque chose ? » | Abandonner simplement. | Fermeture possible par la croix ; un écran de méthode reste derrière le formulaire ; Enregistrer est désactivé. | Faible : pas de confirmation visuelle de l'abandon |
| Retour — 09 | « Retour à la liste devrait me rendre la liste. Pourquoi suis-je encore sur l'aperçu ? » | Revenir à la bibliothèque. | Depuis la préparation, Retour à la liste revient à Aperçu du modèle. La navigation Workflows permet ensuite d'atteindre la bibliothèque. | Faible |
| Bibliothèque — 10 | « Aucun workflow enregistré : la préparation n'a donc pas ajouté de copie. » | Absence de pollution. | Message “Aucun workflow enregistré”. | Aucune |

Résultat : **intention accomplie**. Méthode comprise et choisie ; préparation abandonnée sans workflow enregistré constaté dans l'interface. Aucune inspection du stockage utilisée pour cette conclusion.

## Intention 2 — comprendre l'état après arrêt d'un agent et retrouver résultats / actions

Parcours : nouvelle préparation support, titre « Confirmation de commande absente », notes client, tentative de Démarrer le travail, Vérifier à nouveau, Simuler le parcours, recherche de Vérifier la tentative interrompue, Voir les résultats, Voir le rapport.

| Étape et preuve | Hésitation de la persona | Attendu | Observé | Gravité |
|---|---|---|---|---|
| Lancement — 11, 12 | « J'ai choisi Codex en haut, pourquoi faut-il encore choisir l'IA trois fois ? » | Démarrer avec un choix compréhensible. | Démarrer le travail désactivé. Trois étapes signalent “Modèle IA à définir explicitement ; aucun repli automatique”, chacune avec Choisir l'IA. Le motif est affiché et la voie de correction existe. | Moyenne pour cette persona ; limitation de préparation, pas panne fournisseur démontrée |
| Simulation — 13, 14 | « Il propose une simulation ; je peux au moins voir où retrouver la suite. » | Explorer sans appeler de service réel. | Écran En cours, progression, dernier signal et action Vérifier la tentative interrompue brièvement présents. Puis Terminé 4/4 en 3 s. L'action a disparu avant que je puisse ouvrir l'état interrompu. | **Non qualifiable** : aucun agent réellement arrêté |
| Résultats — 15 | « Je veux la réponse et ce qu'il reste à demander au client. » | Retrouver livrables et prochaines actions. | Voir les résultats ouvre quatre textes, dont Diagnostic et limites, Texte prêt à reprendre et Prochaines actions ; bouton Copier le texte. Bandeau explicite : “Simulation · ces contenus ne prouvent aucun travail métier réel”. | Aucune dans le parcours simulé |
| Rapport — 16, 17 | « Le rapport permet de comprendre ce qui s'est passé. » | Retrouver le compte rendu. | Voir le rapport ouvre une vue de rapport ; le parcours d'accès est trouvé. | Aucune pour l'accès uniquement |

Résultat : **intention partiellement accomplie, non réceptionnée pour l'arrêt réel**. L'accès aux résultats et prochaines actions est trouvé dans la simulation. L'état après arrêt d'un agent, sa cause, la conservation de résultats réels et les actions de reprise restent **non testés**. Les trois choix de modèle n'ont pas été configurés ; aucun agent réel n'a été lancé, arrêté ou qualifié. Aucune transition forcée.

## Bilan

L'aperçu support répond bien à la première décision de cette persona ; l'abandon ne remplit pas la bibliothèque. Deux hésitations à examiner : Retour à la liste qui retourne à l'aperçu, et l'écart entre Codex affiché dans la barre globale et trois modèles d'étapes encore à choisir. Pour la réception de l'arrêt réel, il faut un scénario distinct avec modèle explicitement configuré et exécution contrôlée ; cette session ne fournit pas cette preuve.

## Captures

- 01-accueil.png, 02-workflows.png, 03-modeles.png : orientation.
- 04-support-apercu.png, 05-preparation.png, 06-demande.png : compréhension et préparation.
- 07-abandon.png, 08-bibliotheque.png : formulaire encore ouvert lors d'une tentative de clic automatisé sur la croix ; **ne prouvent pas l'abandon**.
- 09-abandon-bibliotheque.png : retour à l'aperçu, libellé ambigu ; **ne montre pas la bibliothèque**.
- 10-bibliotheque-vide.png : preuve GUI de bibliothèque vide après fermeture et retour.
- 11-avant-lancement.png, 12-disponibilite.png : préparation et motif du démarrage désactivé.
- 13-simulation.png : suivi En cours simulé.
- 14-tentative-interrompue.png : **simulation déjà terminée**, pas preuve d'interruption.
- 15-resultats.png : résultats simulés et prochaines actions avec avertissement explicite.
- 16-rapport.png, 17-fin.png : accès au rapport simulé.

Les échecs de ciblage automatisé de la croix et les délais de locateur ne sont pas attribués à un utilisateur humain ni comptés comme défauts produit. Aucun changement de code ni état d'exécution effectué hors GUI.

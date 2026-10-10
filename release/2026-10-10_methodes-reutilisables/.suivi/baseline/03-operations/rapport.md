# Persona 3 — responsable opérations, découverte rc.17

Responsable opérations d’une petite entreprise, aisance informatique moyenne, sans programmation. Découverte de la GUI réelle, sans lecture du code, du README, d’autres retours ni onboarding. Version figée : 0.6.0-rc.17. Profil et données entièrement temporaires. Rapport d’un agent jouant un rôle, pas observation d’une véritable personne novice.

## Intentions et résultat du parcours

1. Créer une méthode récurrente : prendre un CSV de commandes, en faire une synthèse, me solliciter sur une anomalie puis planifier son utilisation. **Partiellement atteint** : nom et consigne enregistrés ; ni source réutilisable explicite, ni décision conditionnelle, ni planification configurées.
2. Retrouver un résultat et relancer sans anciennes données. **Non reçu** : le modèle a été retrouvé par recherche, mais aucun résultat n’existe dans ce parcours parce que les fournisseurs sont délibérément inertes. Aucun état terminé ou résultat n’a été injecté pour contourner ce blocage.

## Observations conservées

| Intention | Attente avant action | Observation | Conséquence | Gravité |
| --- | --- | --- | --- | --- |
| Trouver une méthode pour mon travail | Une bibliothèque d’activités compréhensibles | Modèles comprend déploiements, release, exemples simulés et composants Analyse/Communication. Les trois actions Utiliser/Créer une adaptation/Personnaliser une copie réclament une distinction que je ne comprends pas spontanément. | Je choisis de créer directement, sans modèle correspondant clairement au contrôle de commandes. | Forte |
| Créer ma méthode | Décrire résultat et source | Le premier écran demande un type de bloc : Tâche guidée, Question ouverte, Règle explicite, Accord humain, Document, Commande locale, Tâche IA autonome. Aucun choix d’entrée fichier. | Je garde le défaut sans savoir s’il convient ; je ne construis pas une source récurrente. | Forte |
| Définir l’analyse | Écrire une consigne et savoir qui l’exécute | La consigne et les critères sont utilisables après clic dans Première étape. L’écran dit « agent de la conversation » ; Choisir l’IA est ailleurs. | J’arrive à décrire le contrôle mais ne comprends pas le responsable ni la différence entre agent et IA. | Forte |
| Décider seulement en cas d’anomalie | Une règle qui m’interroge uniquement pour un montant anormal | Validation du résultat propose vérifier la structure puis continuer ou attendre ma validation. La consigne peut demander une décision, mais je ne sais pas si c’est une règle effective ou une préférence textuelle. | Le workflow paraît attendre ma validation pour tous les résultats. Je ne sais pas matérialiser l’exception sans apprendre des blocs supplémentaires. | Forte |
| Fournir les commandes de cette semaine | Choisir mon CSV avant de lancer | Lancement contient un titre et « Quelle demande souhaitez-vous traiter ? », avec possibilité de parler dans le terminal. Pas de pièce jointe ni choix de source visible. | Contournement : écrire le chemin et recopier le contenu CSV dans la demande. Répéter cela chaque semaine ne simplifie pas mon travail. | Bloquante pour l’autonomie recherchée |
| Suivre le travail | Voir l’analyse et ma prochaine intervention | Lancement ouvre un shell avec commandes Python et chemins techniques ; agent arrêté, progression conservée, aucune étape réalisée. | Pas de résultat dans ce test. L’arrêt est attendu de la fixture exit 78, pas une panne IA attribuée à l’app. La forme du suivi reste très technique pour ce rôle. | Limite d’environnement + difficulté de présentation |
| Planifier | Créer une planification depuis Planifications | Page vide : ouvrir un workflow puis Options → Planifier. Aucun bouton direct. Le terminal demeure visible sur la moitié de l’écran au changement de rubrique. | Détour imposé ; je dois également découvrir comment fermer la vue terminal pour lire confortablement. | Forte |
| Retrouver la méthode | Revenir dans modèles et chercher son nom | Recherche « Contrôle hebdomadaire » retrouve la carte créée et Modifier le modèle. | Bon point : la méthode enregistrée se retrouve. Sa source et son résultat attendu ne sont pas exposés sur la carte. | Positive avec réserve |

## Preuves et limites

Captures 01 à 11 dans ce dossier. `parcours.cjs` est le script de reproduction écrit **après** la découverte. Il conserve les actions réussies, sans sélecteurs ayant dicté les choix initiaux. Les erreurs de sélecteur du contrôleur (nom accessible Terminal avec espace, Options rendu comme menu plutôt que bouton) ne sont pas comptées comme défauts du produit.

Deux lancements de profils isolés ont été nécessaires : le premier contrôleur avait stdin fermé, puis le second a permis les actions. Le premier profil n’a servi qu’au démarrage, aucune donnée utilisateur réelle n’a été ouverte. Aucune API métier, état forcé, service externe ou injection de résultats. La simulation n’a pas été utilisée pour prétendre qualifier l’analyse du CSV.

## Verdict d’adoption

**Je ne peux pas adopter ce parcours de façon autonome pour une routine d’opérations.** Je peux enregistrer une consigne. Je ne peux pas expliquer avec confiance comment choisir le nouveau fichier chaque semaine, garantir une question uniquement sur anomalie, attribuer l’analyse à un agent ou planifier depuis l’endroit où je m’y attends. La réception doit porter sur cette méthode entière, pas sur l’existence du modèle enregistré.

Priorités : source explicite à chaque demande ; création guidée par résultat/source/étapes plutôt que type interne ; responsable et décision conditionnelle compréhensibles ; planification depuis un point d’entrée direct. Les tests de résultat et relance nécessitent un fournisseur réellement disponible ou un test technique clairement distinct, jamais un faux résultat métier.

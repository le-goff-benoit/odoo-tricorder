# Second regard — maquette de conception

Maquette ouverte dans une nouvelle fenêtre Electron isolée, sans lire son HTML. Aucun travail exécuté. Captures conception-* dans ce dossier. Observation distincte du parcours réel rc.17.

## Compréhension à partir des écrans

- La bibliothèque contient trois méthodes complètes avec besoin et résultat. « Voir le workflow » permet de décider avant de lancer. Je comprends mieux ce que j’achète comme façon de travailler.
- Créer un workflow demande nom, résultat attendu, informations fournies à chaque demande, première activité et agent. Pour mon CSV, le choix « Texte, fichier ou lien » a du sens. Je comprends que le fichier appartient à une demande et que la méthode est conservée.
- La consultation détaille résultat, sources, étapes et agents. Pour la réunion : moi et l’agent de recherche choisissons les réunions ; l’agent d’analyse extrait décisions/actions ; l’agent de rédaction prépare compte rendu et email.
- Nouvelle demande propose Texte à coller/Document sur mon ordinateur/Email à rechercher/Lien. C’est le manque principal de rc.17 que ce dessin résout conceptuellement.
- Le suivi explique que deux analyses peuvent avancer ensemble et que la rédaction attend leurs résultats. Cette coordination est compréhensible sans connaître des ports ou conditions de graphe.
- Le résultat propose le texte à copier et une suite utile. L’annonce « Aucun brouillon créé dans Gmail » évite une fausse impression de livraison.

## Réserves pertinentes avant implémentation

1. **Décision et état incohérents dans le suivi proposé** : « Deux réunions correspondent. Voulez-vous traiter les deux ? » et, en même temps, leurs analyses sont en cours. Si ma réponse définit le périmètre, je m’attends à voir les analyses en attente de mon choix. Cette contradiction fragilise la confiance dans la coordination.
2. **Exception conditionnelle toujours à rendre explicite** : « Je veux relire le résultat avant de poursuivre » ne couvre pas « ne me demander une décision que si montant négatif ». Pour ma routine, je veux comprendre cette règle simple sans devoir passer immédiatement à l’éditeur détaillé.
3. **Réutilisation/planification pas encore prouvées par la maquette** : je ne vois pas le choix « chaque vendredi, prendre le nouveau CSV dans ce dossier, me demander si plusieurs fichiers ». Je comprends la méthode mais pas encore son automatisation régulière.
4. L’agent d’analyse est un rôle intelligible. Il faut pouvoir savoir ce qu’il sait faire et si je peux le remplacer ; son nom seul ne suffit pas à choisir avec confiance.
5. « Voir la méthode préparée » mène à la méthode de réunion préremplie dans cette maquette. Je ne compte pas cela comme défaut du produit : cette page n’implémente pas réellement une création. Il faudra vérifier que l’écran final restitue réellement ma synthèse de commandes et ma règle d’anomalie.

Verdict : **direction conceptuelle nettement plus compréhensible**, sans réception fonctionnelle ni garantie d’utilisabilité d’un produit encore non implémenté.

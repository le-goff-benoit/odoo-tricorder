# Persona 6 — revue visuelle de la maquette

Revue distincte de rc.17 : navigation dans `conception.html` sans lecture de son code. Les contenus sont une maquette, aucune exécution ni liaison externe qualifiée. Captures 39 à 45.

## Compréhension acquise

La bibliothèque offre maintenant trois méthodes nommées par leur usage et une action Voir le workflow. Je peux consulter la réunion avant lancement et y expliquer la source, les trois étapes et les rôles Recherche / Analyse / Rédaction. Le bouton de retour, le résultat attendu et la séparation Personnaliser / Lancer rendent l'intention des actions compréhensible. Captures 39 et 40.

Le formulaire demande une source concrète et un résultat souhaité ; il distingue texte à copier et brouillon Gmail à configurer. La limite « aucun email ni ticket créé » est explicite. Le suivi rend perceptible la coordination entre les analyses et la rédaction. Le résultat priorise le texte utile, la suite et le relancement ; journal et preuves restent secondaires. Ces changements répondent aux obstacles principaux de la première mission.

## Confusions à résoudre avant implémentation

| Gravité | Observation visuelle | Attente pour la version fonctionnelle |
|---|---|---|
| Majeure | Le suivi demande « Voulez-vous traiter les deux ? » alors que les deux analyses sont déjà « en cours ». Capture 42. | Montrer des analyses en attente du choix, puis les démarrer après une réponse ; ne pas présenter une attente humaine et un traitement simultané du périmètre non décidé. |
| Majeure | « Améliorer le workflow » depuis le résultat ouvre un formulaire vierge, avec exemples de commandes en retard. Capture 44. | Retrouver les trois étapes et les réglages de la méthode de réunion, puis permettre une modification ciblée ; dire si une copie sera créée. Créer et modifier doivent rester distincts dans l'expérience. |
| Majeure | Le modèle promet compte rendu, actions et email ; le résultat ne montre que l'email et une suite. Capture 43. | Présenter tous les livrables promis ou indiquer explicitement ce qui manque. L'email ne remplace pas la liste structurée des actions et le compte rendu. |
| Importante | Une seule réponse à la question « les deux ? » : Traiter les deux. Capture 42. | Permettre de choisir une seule réunion ou de corriger le périmètre. La question doit ouvrir les réponses plausibles. |
| Importante | Une case « Je veux relire le résultat avant de poursuivre » suit un formulaire de plusieurs étapes. Capture 44. | Dire quelle étape et quelle conséquence de reprise ; permettre une relecture finale distincte d'un contrôle intermédiaire. |
| Importante | Le modèle parle d'accord avant les opérations qui le demandent, sans identifier les opérations ou décisions de cette méthode. Capture 40. | Afficher les décisions concrètes prévues et leurs conditions, même si le modèle ne comporte aucune opération externe. |
| Importante | Le formulaire demande un contenu commun et un périmètre, mais ne montre pas la correspondance notes↔réunions. Capture 41. | Pour plusieurs réunions, permettre plusieurs sources nommées et rendre visible leur association, puis ce qui a effectivement été lu. |
| Mineure | Des séquences littérales `\\n` apparaissent dans l'email. Capture 43. | Rendre les paragraphes lisibles et préserver les vrais retours à la ligne lors de la copie. |

Le principe de la création simple est compréhensible : résultat, informations par demande, travail du premier agent. Il reste à vérifier fonctionnellement l'ajout d'une seconde étape et la modification d'une méthode existante. Les intitulés Recherche/Analyse/Rédaction sont clairs comme rôles ; l'écran Agents rappelle que fournisseur et modèle sont distincts. La maquette ne démontre toutefois ni l'ajout effectif d'un pack, ni l'affectation persistée, ni la qualité de son travail.

Verdict : direction nettement plus compréhensible pour consulter et lancer. Réception du concept, avec réserves majeures ci-dessus ; aucune qualification fonctionnelle ou d'automatisation déduite de cette maquette.

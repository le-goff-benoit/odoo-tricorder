# Lecture visuelle de la maquette — consultant multi-client

Lecture dans une fenêtre Electron, uniquement rendu visible et actions affichées. Aucun code HTML consulté. Captures 18 à 24.

## Ce que je comprends mieux

La bibliothèque contient trois méthodes dont le résultat est annoncé. « Voir le workflow » est une action sûre, sans copie. La page Support explique résultat attendu, informations à fournir et trois étapes avec agent : je peux raconter le déroulement. La séparation Lancer une demande / Personnaliser / Voir les agents est plus nette que les trois actions de rc.17. La sélection de source parle de texte, document, email ou lien. Le suivi dit qui attend quoi et le résultat distingue texte préparé de brouillon Gmail créé. Les rôles d’agents sont compréhensibles ; les détails avancés n’occupent plus la page principale.

## Retours à intégrer avant réception

1. **Client et portée toujours absents.** Ni Voir le workflow, ni Nouvelle demande, ni Personnaliser ne montre pour quel client je travaille, ni si je modifie une méthode commune ou une variante client. Dans mon métier c’est un critère majeur. Afficher le client/la portée à chaque étape importante et distinguer méthode partagée, configuration du client et informations de cette demande. Me permettre de partir de la même méthode pour Beta sans reprendre les documents Alpha.
2. **Le parcours Support bascule visuellement en Réunion.** Le formulaire comporte « notes des réunions » et « Réunions ou périmètre à traiter ». Le suivi demande deux réunions et le résultat est un email de réunion malgré le modèle Support sélectionné. Je comprends qu’il s’agit d’une maquette générique ; elle ne peut donc pas encore prouver la compréhension du parcours Support complet. Préparer deux parcours visuels cohérents, chacun avec ses vraies questions et son résultat.
3. **Personnaliser ne montre pas clairement la méthode existante.** J’arrive sur un formulaire générique « premier agent ». Je m’attends à retrouver les trois étapes du Support afin d’en changer une, conserver les autres et donner un nom à ma variante. Éviter un retour apparent à zéro lorsqu’on personnalise un modèle.
4. **Revenir est irrégulier.** Les pages modèle/source ont un retour explicite ; le suivi et le résultat ont moins clairement leur ancrage dans le client et la demande. Garder un chemin de retour lisible, sans reconstruire le parcours ni perdre la saisie.
5. **Sources et agents restent des promesses.** La maquette n’a aucun accès réel, c’est correctement indiqué. L’implémentation devra montrer les sources effectivement récupérées et les rôles effectivement disponibles ; ne pas recevoir ces fonctions sur la seule clarté de leurs noms.

**Verdict maquette : direction nettement plus compréhensible, pas encore reçue pour le multi-client ni pour un parcours Support complet.** Ces lacunes doivent rester des critères, pas être absorbées dans un verdict positif global.

# Réception transversale après UX

Les unités passent : 342 tests Python, 126 JavaScript. La suite GUI source complète a exécuté 138 cas : 132 réussis, 2 cas optionnels sur projets réels désactivés et 4 échecs analysés.

- Suspension : ancien libellé attendu, remplacé par le texte décrivant la suspension explicite et une assertion sur Reprendre la demande. Contre-épreuve verte.
- Projet vide : deux boutons identiques menaient à des parcours différents. Le raccourci dupliqué est retiré, l’entrée de création commune reste. Parcours réunion reçu après correction.
- Email : mesure géométrique en deux lectures asynchrones sur un menu rafraîchi ; la mesure est maintenant atomique, avec vérification de visibilité. Import intégral, quatre demandes, reprise sans doublon et absence de publication reçus.
- Menu de demandes : priorité native appliquée à la vue d’ensemble mais absente du sélecteur compact. Le sélecteur affiche maintenant lui aussi Agent arrêté ou À traiter dans la conversation. Le scénario mail ouvre la configuration déléguée facultative seulement pour la vérifier ; il ne demande plus une reprise d’agent pour consulter le terminal déjà visible.

La contre-réception de dix parcours a ensuite passé huit cas. Deux assertions de présentation ont été ajustées et reçues séparément : le parcours email (1/1), et la demande terminée (1/1). Pour cette dernière, l’absence d’invitation à reprendre porte sur la synthèse de la demande sélectionnée ; le menu peut légitimement indiquer l’agent arrêté pour les autres demandes inachevées.

Les logs intermédiaires rouges sont conservés ; ils ne sont pas présentés comme une suite complète verte. La publication exige encore la recette complète finale sur sources et paquet, après la campagne des neuf utilisateurs.

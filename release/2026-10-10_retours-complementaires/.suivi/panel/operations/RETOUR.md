# Retour d’usage — responsable opérations PME

Candidat testé : `/tmp/tricorder-rc16-final`, version 0.6.0-rc.16. Persona jouée par un agent, pas par un participant humain. Fenêtre 1440 × 1000. Profil neuf, Xvfb isolé, fournisseurs Codex et Claude inertes. Aucun service réel, aucune écriture dans un projet client. Tous les objets ont été créés par l’interface ; aucune fixture de workflow ni modification d’état n’a été nécessaire.

## Intentions et vécu

Je voulais créer une procédure de relevé des commandes sans faire appel à une IA, choisir l’équipe concernée et inclure ou non les retards. Depuis « Créer un workflow », le choix du premier bloc m’a permis de choisir Document immédiatement. Le contenu du brouillon est visible en haut de l’inspecteur, avant les critères et informations techniques. Je n’ai pas eu besoin de comprendre un contrat de données pour écrire le texte.

J’ai ensuite cherché où poser mes deux questions à chaque lancement. « Paramètres du workflow » présente directement « Formulaire de lancement » avec une explication compréhensible : ces réponses appartiennent à la demande et ne changent pas le modèle. Liste de choix et Oui / Non se configurent sans nom technique. Les accents de « Équipe concernée » sont conservés à l’écran. La contrepartie est un formulaire assez haut : après le deuxième champ, il faut descendre de plusieurs hauteurs de bloc pour retrouver Appliquer. La capture 04 montre cette friction ; c’est une gêne, pas un blocage.

Je voulais ensuite comprendre les réponses utilisées par une planification et les modifier. Dans la liste, les seuls accès sont « Version planifiée », Suspendre et Archiver. J’ai hésité sur « Version planifiée » : je cherchais les réponses et non une version du modèle. Après ouverture, le résultat est très clair : « Réponses conservées pour chaque occurrence », Équipe concernée = Logistique et Inclure les retards = Non, sans booléen technique. L’explication sur l’indépendance entre workflow enregistré et planification est visible.

Pour modifier uniquement ces réponses, j’ai utilisé « Préparer une nouvelle version… ». Cela oblige à archiver l’ancienne planification avant de configurer la suivante. Le dialogue explique correctement cette conséquence et la restauration en cas d’annulation. J’ai pu reprendre les réponses Logistique / Non automatiquement, les changer en Ventes / Oui, réactiver puis vérifier les nouvelles réponses. Je n’ai perdu aucune réponse. Le détour reste plus inquiétant et plus long que ce que suggère une simple modification de destinataire ou de détail.

## Constats à retenir

| Priorité | Constat vécu | Reproduction / preuve | Proposition |
|---|---|---|---|
| P2 | Le point d’entrée pour consulter ou modifier les réponses planifiées est nommé seulement « Version planifiée ». | Liste capture 06, puis détails 07 et remplacement 08–10. | Afficher « Configuration et réponses » ou une action équivalente sur la carte ; expliciter dans le détail que la préparation sert aussi à changer les réponses. Le remplacement moteur peut rester identique. |
| P3 | Le formulaire de création dit encore de retrouver le workflow par « Workflows → Gestion des workflows → Workflows enregistrés ». Ce détour suggère une navigation plus compliquée que l’onglet direct disponible. | Capture 01, texte sous « Enregistrer dans ». | Mettre le chemin d’aide à jour vers « Workflows → Workflows enregistrés ». |
| P3 | Deux champs de formulaire occupent déjà une grande hauteur ; le bouton Appliquer sort rapidement de vue. | Capture 04. | Réduire la hauteur des aides facultatives, permettre un résumé des champs repliés ou maintenir les actions visibles. Ce point ne justifie pas de retarder seul la livraison. |

Aucun défaut fonctionnel bloquant reproduit sur ce périmètre. Les listes, valeurs Non, reprises et modifications sont correctes. Le script contient une vérification des valeurs reprises et du détail final. Il ne prouve ni une occurrence future réellement déclenchée ni l’analyse d’un fournisseur externe.

## Adoption

J’adopterais cette version pour créer une petite procédure et préparer une planification en simulation. La construction initiale et les réponses sont compréhensibles sans identifiants techniques. J’aurais encore besoin d’une explication ponctuelle pour découvrir que « Version planifiée » est l’endroit où changer les réponses. Le comportement de remplacement est annoncé honnêtement, mais son libellé peut mieux refléter mon intention.

## Preuves et limites du pilote

- `parcours.cjs` : parcours GUI autonome rejouable ; toutes les créations passent par l’application.
- `execution.log` : `Valeurs reprises Logistique false`, puis `PARCOURS RÉUSSI`.
- Captures 01 à 10 : création, formulaire, planification, consultation et remplacement.
- `ecrans.txt` : extraction textuelle du DOM, y compris contenu de panneaux repliés ; ne pas confondre ce texte avec ce qui est visible à l’écran.
- La fréquence journalière par défaut et le mode simulation sont conservés volontairement pour ce test de configuration. Le nom « hebdomadaire » est un intitulé de fixture, pas une preuve de fréquence hebdomadaire.
- Quelques premières captures ont été prises avant stabilisation du dialogue ; le script a été complété avec des attentes explicites pour les étapes de remplacement. Aucun échec applicatif n’en a été déduit.
- Aucune lecture de code métier avant les constats. Le fichier de test existant a été consulté pour le harnais d’isolation, ses exemples de sélecteurs étaient donc connus ; le choix du premier bloc Document et le parcours de planification sont propres à cette recette.

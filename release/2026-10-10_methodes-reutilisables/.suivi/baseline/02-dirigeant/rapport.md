# Persona 02 — dirigeant de petite entreprise, première utilisation

Candidat : binaire installé Tricorder 0.6.0-rc.17. Observation réelle Electron, profil neuf isolé. Aucun onboarding, code de l'application, README ou rapport d'autre persona consulté. Le script de reproduction a été écrit après les choix de découverte. Cette revue est menée par un agent jouant un dirigeant, pas par un véritable participant humain.

## Intentions et résultat

1. Traiter un email client, comprendre la méthode choisie avant de la lancer, obtenir un texte de réponse. J'ai atteint le formulaire et soumis un texte collé, mais je n'ai pas pu consulter simplement la méthode avant de commencer. Aucun résultat métier n'a été produit : les fournisseurs sont volontairement inertes (exit 78).
2. Retrouver la réponse et utiliser la méthode la semaine suivante. J'ai retrouvé un workflow enregistré et le formulaire de relancement. L'historique ne contient pas le travail non abouti ; il est dans « En cours ». Je n'ai pas qualifié la lecture d'un résultat terminé ni la répétition d'une analyse IA.

Verdict : je n'adopterais pas ce parcours seul pour traiter mes demandes client. Son entrée est repérable, mais la sélection ne me permet pas d'évaluer la méthode et le lancement me conduit dans un terminal avant que je comprenne qui traite quoi. Les limites des fournisseurs de test expliquent l'absence de résultat, pas ces difficultés de compréhension.

## Parcours observé et attentes

- Capture 01 : « Nouvelle demande » est le premier choix naturel. Je m'attends à désigner l'email ou déposer un document ; l'accueil parle de dépôt Git et de workflow global, concepts secondaires pour ma demande client.
- Captures 02–04 : je dois d'abord choisir une méthode. Je recherche « support » ; le choix par défaut devient « Support — diagnostic et réponse ». La description indique ce que fait la méthode, mais il n'y a pas d'action « voir » avant « Continuer ».
- Capture 05 : « Continuer » crée un workflow et ouvre immédiatement « Lancer cette version du workflow », sur un graphe complexe en arrière-plan. Ce n'est pas une explication préalable de la méthode. Les informations initiales sont toutes facultatives. Pas de choix visible email/fichier/source. Je comprends « Faits et exemple du problème » comme l'endroit où coller mon email, par déduction.
- Capture 06 : le texte peut effectivement être collé. Point favorable : l'indication de destination explique honnêtement qu'elle prépare du texte et ne crée pas de brouillon distant.
- Captures 07–08 : je renonce au lancement pour comprendre d'abord. Échap ferme le formulaire ; « Retour à la liste » m'envoie à l'activité. Un workflow a déjà été enregistré malgré l'abandon de la demande.
- Captures 10–11 : j'ouvre Workflows > Modèles. Les premiers modèles visibles parlent simulation, commande, code et release. Le support apparaît dans la seconde rangée avec huit blocs. Je clique son titre en pensant ouvrir sa méthode : rien ne se passe. Les seules actions sont Utiliser / Créer une adaptation / Personnaliser une copie. Je ne sais pas quelle différence implique une modification durable.
- Capture 12 : Workflows enregistrés contient Support, créé par ma simple tentative précédente. Cet écran est plus simple et propose « Exécuter » et « Ouvrir le workflow ».
- Capture 13 : relancer retrouve le texte de mon brouillon annulé. C'est utile pour reprendre, mais la rétention n'est pas explicitement annoncée ; pour la semaine suivante je veux savoir si je démarre avec une nouvelle demande ou récupère l'ancienne.
- Capture 15 : lancement réel tenté avec fournisseur inerte. L'écran est partagé entre commandes shell et liste de huit étapes. La liste expose réponse urgente et réponse sans urgence comme une succession, sans indiquer visuellement que ce sont des alternatives. Le message central « Votre demande est enregistrée / son suivi apparaîtra ici » reste rassurant malgré l'arrêt du fournisseur ; l'arrêt apparaît surtout dans le titre du terminal.
- Captures 17–18 : « En cours » indique finalement Agent arrêté et Reprendre l'agent ; « Historique » est vide. Ce classement se comprend après comparaison, mais « reprendre l'agent » ne me dit pas comment faire aboutir ma demande client.

## Obstacles prioritaires et conséquences

1. **Bloquant compréhension : consulter avant d'agir.** Je suis obligé de commencer une création ou un lancement pour examiner une méthode. Conséquence : je ne sais pas choisir en confiance et une tentative ajoute un workflow enregistré.
2. **Majeur source : où est ma demande ?** L'entrée attendue email/fichier est remplacée par plusieurs champs facultatifs. Conséquence : je colle par intuition et je ne sais pas si le texte est la demande complète ou seulement un complément.
3. **Majeur organisation : huit opérations présentées au même niveau.** Des réponses alternatives semblent successives. Conséquence : impossible d'expliquer le déroulement à un collègue ou de savoir quand j'interviendrai.
4. **Majeur démarrage : terminal incontournable et statut rassurant après arrêt.** L'échec est provoqué par le fournisseur de test ; la difficulté observée concerne sa présentation. Conséquence : un dirigeant pourrait attendre un suivi qui ne viendra pas et lire des commandes sans savoir agir.
5. **Majeur répétition : nouveau travail versus brouillon conservé.** Le formulaire conserve le texte de la tentative annulée. Conséquence : risque de traiter la mauvaise demande lors de la prochaine occurrence si le statut de brouillon n'est pas clair.
6. **Important bibliothèque : majorité des premières cartes orientée logiciel/démonstration.** Conséquence : je doute que l'application corresponde à mon activité et je peux abandonner avant de trouver une méthode utile.

## Critères de contre-épreuve proposés

- Voir étapes, résultat attendu, agent responsable et décisions depuis un modèle sans le lancer ni créer une copie.
- Indiquer la demande par source explicite (au minimum coller un texte et joindre un fichier), puis voir ce qui sera traité.
- Lire les branches comme des alternatives et comprendre l'ordre métier sans graphe technique.
- Fournisseur arrêté : un message dans le suivi explique l'absence de traitement et l'action disponible, sans devoir interpréter le terminal.
- « Nouvelle demande » et « Reprendre mon brouillon » sont distingués ; le contexte ancien n'est jamais repris silencieusement pour une nouvelle occurrence.

## Limites et erreurs du pilote

Deux tentatives de sélecteurs ont échoué : un champ de recherche a le rôle searchbox, pas textbox ; le bouton × a un nom accessible différent. Elles ont été résolues par le placeholder visible et Échap. Ce sont des erreurs du pilote, exclues des obstacles utilisateur. Aucun service mail, document distant, modèle IA ou résultat de support réel n'est qualifié. Aucune base ni API utilisée pour préparer artificiellement une exécution.

Le harnais de découverte garde les captures du parcours final numérotées 01 à 18. Reproduction : `PATH=/tmp/tricorder-xvfb/usr/bin:$PATH xvfb-run -a node parcours.cjs` depuis ce dossier. Elle recrée un profil temporaire neuf ; les premiers clics sont conservés dans actions.jsonl.

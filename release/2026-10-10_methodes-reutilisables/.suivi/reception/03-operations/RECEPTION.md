# Réception opérations — équipe bureautique

Date : 10 octobre 2026. Persona : équipe bureautique peu technique, découverte sans onboarding. Application figée : `/tmp/tricorder-method-review-v1`. Parcours exclusivement GUI, profil temporaire. Deux intentions, durée inférieure à dix minutes. Aucun fournisseur IA, email ou service externe qualifié. Les verbatim ci-dessous expriment la réaction de la persona simulée, pas celle d’un utilisateur recruté.

## Intention 1 : méthode réutilisable texte → analyse → réponse, décision seulement en anomalie

**Résultat : création et enregistrement obtenus dans l’interface. Production d’un résultat réel non vérifiée.**

Parcours : Workflows → Modèles → Créer un modèle. Saisie de « Réponse hebdomadaire aux messages », du résultat attendu, des informations à fournir, puis des étapes « Analyser les messages » (Analyse) et « Préparer une réponse » (Rédaction). La deuxième étape est proposée par défaut « Après une étape », avec l’analyse comme référence. Choix « Seulement en cas d’anomalie ou d’information insuffisante » pour chaque étape. « Créer la méthode » mène à « Méthode enregistrée ». « Utiliser » ouvre un nouveau formulaire de sources, sans lancement.

Éléments utiles : le formulaire distingue explicitement la définition des sources de leur contenu à fournir à chaque nouvelle demande. La liaison entre les étapes est compréhensible et ne nécessite pas l’éditeur détaillé. Le choix de validation en anomalie est formulé clairement.

Hésitations et décisions :

- « Je veux une méthode ; est-ce que je dois créer un modèle ? » La rubrique Modèles et le bouton Créer un modèle sont trouvés, mais le formulaire passe à Nom de la méthode et Créer la méthode. Gravité faible : hésitation de vocabulaire, parcours poursuivi.
- « Responsable, c’est une personne de l’équipe ? » Les options Analyse/Rédaction permettent finalement de comprendre le rôle d’agent. Gravité modérée : rôle et mode d’exécution sont deux choix séparés ; le formulaire est long.
- « Je voulais seulement être sollicitée si ça pose problème ; pourquoi vois-je maintenant des Oui et des Non ? » Le résumé affiche des étapes « Examiner » et les conditions « Selon le résultat ... : Oui / Non ». Gravité modérée : la mécanique de branchement alourdit une méthode simple.
- « Pourquoi le résultat attendu contient-il “Une décision est-elle nécessaire ?” ? » Ce libellé apparaît à côté de « Brouillon de réponse », alors que le formulaire demandait un résultat métier. Gravité modérée : le résumé mêle livrable et question de coordination.
- « Où est passée ma description des nouveaux messages ? » Le résumé Informations à fournir devient « La demande et ses sources : texte, documents ou références à récupérer ». Gravité modérée : le besoin saisi est moins visible. Cela ne prouve pas que les données ont été perdues.

Aucun abandon de conception. Abandon de l’exécution réelle : l’écran automatique demande un modèle IA explicite et indique qu’aucun catalogue local n’est trouvé. Cette condition est signalée ; la réception ne configure ni ne qualifie un fournisseur.

Preuves : `02-creer-methode.png`, `03-deux-etapes.png`, `04-methode-enregistree.png`.

## Intention 2 : chaque semaine avec de nouveaux messages

**Résultat : intention bloquée avant activation.**

Parcours : Planifications affiche « Aucune planification » et renvoie vers Options → Planifier depuis un workflow. Retour à Modèles → sélection de la méthode → Modifier mon modèle → Options → Planifier. Le menu Options existe dans la vue de modification ; la consultation du modèle propose Utiliser, Modifier mon modèle et Voir les agents.

La boîte de planification montre les modèles IA manquants pour les deux étapes, la fréquence, l’heure, l’intervalle en minutes, le fuseau, le mode simulation et une confirmation d’activation. La simulation est cochée par défaut. Aucune activation effectuée.

Points bloquants et décisions :

- « Je suis dans Planifications mais je dois repartir dans Modifier mon modèle pour programmer ma méthode ? » Gravité modérée : détour et association de la planification à la modification du modèle. Le texte d’aide permet néanmoins de retrouver le chemin.
- « Je veux tous les lundis, où est chaque semaine ? » Les choix visibles sont Chaque jour / Du lundi au vendredi / À intervalle régulier. Aucun choix de jour unique n’est visible. Saisie de 10080 minutes acceptée par le champ, sans soumission. Gravité modérée : contourner par un calcul est possible, mais l’interface ne formule pas une récurrence hebdomadaire compréhensible.
- « Où est-ce que je choisis les nouveaux messages de cette semaine ? » Aucun champ visible de récupération des messages, de période, d’expéditeur, de source renouvelée ou de reprise depuis la dernière occurrence. Gravité forte, blocage métier : impossible de vérifier dans ce parcours que chaque occurrence utilisera de nouveaux messages.
- « Les textes sont demandés quand je clique Utiliser ; qui les fournira pendant la planification ? » Le formulaire de création prévient qu’un agent distinct ne peut pas aller chercher un email ou un fichier avec les outils du terminal et que le lancement automatique utilise des agents distincts. La planification n’explique pas comment cette méthode reçoit les sources fraîches. Gravité forte : la séparation des contraintes laisse l’intention sans solution compréhensible.
- « Je peux simuler mais cela ne prouve pas qu’il récupère mes emails. » Décision : ne pas activer la planification, même en simulation. IA non configurée et arrivée de nouveaux messages non démontrée.

Abandon exact : dans Configurer une planification, après examen des fréquences et du champ intervalle, avant de cocher la confirmation et avant Activer la planification. La récurrence et la réception des messages ne sont pas validées.

Preuves : `05-planifications.png`, `06-planifier.png`, `07-intervalle.png`, `08-jours-semaine.png`, `09-planification-sans-source.png`.

## Limites de preuve

Une tentative d’automatisation par labels a échoué techniquement ; reprise avec un nouveau profil et champs visibles. Ces incidents ne sont pas comptés comme problèmes métier. Aucune lecture de code, README, tests, rapports existants ou API métier. Aucun appel IA réel, aucune récupération de message, aucune notification et aucune occurrence exécutée. Les captures prouvent les écrans rencontrés et l’enregistrement GUI, pas la validité fonctionnelle du traitement des messages.

# Consultant multi-client — découverte rc.17

Mandat : choisir une méthode de support, la préparer pour deux clients sans mélanger leur contexte ; retrouver le travail puis le répéter. Aisance informatique moyenne, aucune formation Tricorder.

## Conditions et limites

Binaire installé rc.17, profil temporaire isolé `/tmp/tricorder-consultant-lfcjlt`. Deux projets créés par les dialogues visibles. Aucun code de l’application, README ou rapport des autres personas consulté. Aucun workflow ni résultat injecté par API. Les fournisseurs `codex` et `claude` sont volontairement inertes (exit 78) : aucun diagnostic métier ni génération IA ne peut être reçu dans ce test. Le lancement se fait réellement par le bouton GUI, et son arrêt n’est pas attribué à un défaut produit. Captures 01 à 17 : application réelle. Captures 18 à 24 : maquette, aucune exécution.

## Intention 1 — une méthode de support compréhensible et réutilisable

Je cherche une méthode que je peux lire avant de l’adopter pour mes clients. Workflows → Modèles me conduit à une longue bibliothèque où « De la demande au résultat » est le premier modèle et où figurent aussi Orchestration, Analyse, Communication. Ces cartes ne correspondent pas toutes à des méthodes complètes. Je trouve Support — diagnostic et réponse, description utile, mais les trois actions ne permettent pas de simplement voir ce qui va se passer. « Créer une adaptation » me paraît le choix le moins risqué pour un client ; je ne comprends pas intuitivement sa différence avec « Personnaliser une copie ».

Le dialogue demande d’enregistrer dans un projet. Sans projet existant, il faut sortir de ce dialogue, aller dans Projets et créer un projet. La création « Client Alpha » puis « Client Beta » fonctionne via GUI, sans demande de chemin ni dépôt distant. C’est un point positif concret.

Je crée Support Client Alpha dans Client Alpha. Je m’attends à pouvoir affiner source et réponse. L’éditeur affiche huit blocs et douze liens, avec une partie du processus hors écran à droite et en bas. Les branches de réévaluation compliquent la lecture dès le premier contact. Je ne peux pas lire en une vue quel agent prépare, qui vérifie et où je dois intervenir. Le nom du client dans le titre et le choix explicite « Enregistrer dans » rassurent sur le stockage, mais pas sur le périmètre réel de travail.

J’essaie Exécuter pour découvrir les informations nécessaires. Le formulaire demande faits, impact et destination : utiles. Tout est facultatif ; il ne commence pas par « quelle demande traiter ? » ni par email, document ou lien à sélectionner. « Brouillon d’email » précise honnêtement qu’aucun brouillon distant ne sera créé : bon point. Je colle un incident CSV Alpha, deux utilisateurs touchés et choisis email. Le lancement démarre un terminal. Avec notre fournisseur inerte, l’agent s’arrête ; aucune réponse client n’est obtenue ni prétendue.

**Conséquence :** préparation d’un workflow possible, adoption comme méthode de travail autonome non acquise. Je dois créer une copie pour comprendre le modèle, puis décoder le graphe et découvrir les entrées au lancement.

## Intention 2 — changer de client, conserver la méthode, retrouver le résultat

Je clique Client Beta pour préparer le même travail ailleurs. Le panneau métier est clairement Client Beta, mais le terminal Alpha reste affiché à côté. Une petite ligne dit « Shell : Client Alpha · Agent arrêté » : il y a bien une identification, pourtant la grande vue Beta et le terminal Alpha cohabitent. Je dois vérifier dans quel client je vais travailler avant de taper une instruction. **Ce n’est pas une preuve de fuite ou de mélange de données : c’est une ambiguïté de contexte visible**. Capture 15.

Client Beta a zéro workflow. « Choisir un modèle » ouvre la bibliothèque générale : ma méthode personnalisée Alpha n’y apparaît pas. Je contourne en recréant une deuxième adaptation à partir du modèle Support. Cela ne teste pas la réutilisation de mes propres améliorations ; ce besoin reste non atteint. Le formulaire de lancement Beta est vide : les quatre champs texte ne reprennent pas l’incident Alpha. C’est une observation favorable sur ces champs seulement, pas une qualification complète de l’isolation IA.

Je ne peux pas examiner un résultat terminé : fournisseur inerte, aucune exécution artificiellement complétée. Lecture du résultat et répétition d’une méthode affinée restent non reçues dans ce parcours. Je n’utilise pas une simulation pour fabriquer leur réussite.

## Obstacles classés

| Priorité | Observation | Conséquence | Critère de réception |
|---|---|---|---|
| Bloquant adoption | Modèle impossible à consulter sans action de copie/utilisation | Choix de méthode sans comprendre le travail | Voir le workflow sans créer ni lancer quoi que ce soit |
| Majeur | Copier, adapter, partager sont trois concepts proches | Risque de modifier au mauvais niveau et de multiplier les copies | Une action Personnaliser avec portée client/partagée explicitée au moment du choix |
| Majeur | Terminal Alpha demeure à côté du contexte Beta | Doute sur la destination de l’instruction | Identifier fortement le client du terminal et signaler le changement de contexte, sans perdre la session |
| Majeur | Méthode Alpha absente de la bibliothèque au passage Beta | Recréation au lieu de réutilisation de mes améliorations | Réutiliser la méthode choisie pour un autre client sans copier les réponses ni les documents |
| Majeur | Graphe 8 blocs/12 liens débordant dès ouverture | Difficile de vérifier le déroulement et les agents | Étapes métier lisibles et agent responsable visibles, détails facultatifs |
| Majeur | Aucun choix concret de source | Il faut reformuler/coller une demande ailleurs | Email, fichier, lien ou texte avec aperçu de la source réellement retenue |

## Preuves et verdict

Captures clefs : 04 carte Support, 05/10 dialogue d’adaptation, 08 création de projet, 11 graphe Support, 12/13 entrées, 14 lancement arrêté, 15 Beta avec terminal Alpha, 17 champs Beta vides. Le fichier `parcours.cjs` reproduit les choix observés après la découverte ; ses sélecteurs servent à rejouer, ils n’étaient pas le mandat fourni au persona.

**Verdict : pas d’adoption autonome multi-client à ce stade.** La création locale des projets et le formulaire métier sont utiles. La consultation, la portée des copies et le passage d’un client à l’autre obligent encore à comprendre le fonctionnement interne. Ce verdict ne porte ni sur la qualité d’un agent réel ni sur des services externes.

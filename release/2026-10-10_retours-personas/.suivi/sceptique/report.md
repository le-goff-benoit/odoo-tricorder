# Persona sceptique — contre-épreuve rc15

Candidat figé `/tmp/tricorder-personas-rc15`, 10 octobre 2026. Interface Electron réelle, projet synthétique isolé, processus Python réellement exécuté. Aucun code applicatif ni rapport d'autres personas consulté ; aucun build partagé. Le script autonome utilise un lanceur npm propre à `/tmp/tricorder-sceptique-rc15-runner`.

## Attente et premiers clics

Je veux exécuter une commande locale sans configurer une IA, corriger un échec, puis prendre une seule décision en examinant la sortie réelle. Premier parcours : Workflows → Modèles → Commande locale avec validation → Créer une adaptation… → modifier la commande dans l'éditeur → Exécuter…

## Constats d'usage

**Lancement : correction convaincante.** Le dialogue explique « sans fournisseur IA ». Le titre et le contexte sont facultatifs. Il n'y a plus de bouton « Lancer dans le terminal » : une seule action réelle principale, « Lancer l’exécution réelle », et une simulation secondaire. Aucun volet à découvrir ni catalogue IA à remplir. Le panneau dit ce que fera la validation automatique et maintient les décisions humaines. Capture : `05-lancement-direct.png`, texte : `dialogue.txt`.

**Échec et reprise : clairs et réels.** `python3 /project/check.py` termine avec code 7 et affiche `CAUSE_EXPLICITE: valeur incorrecte`. L'interface montre la sortie, le nombre de tentatives et « Relancer cette étape… ». Après correction du fichier synthétique pour afficher la version Python et terminer avec code zéro, « Relancer maintenant » déclenche réellement la tentative 2. Captures : `06-echec.png`, `07-reprise.png`.

**Une seule validation humaine : correction constatée.** Le succès de commande passe directement à « Décision attendue ». Aucun formulaire « Valider le résultat » ne vient doubler la décision finale. La question porte le critère utile : le runtime répond-il et sa version est-elle visible ? Capture : `08-commande-validee.png`.

**Défaut restant P1 : la décision demande d'examiner une sortie qu'elle ne montre pas.** J'ouvre « Examiner la décision » et je lis « Examinez la sortie et la preuve de la commande… ». L'écran contient la question et les boutons Approuver/Refuser, mais ni sortie ni preuve. Je dois deviner que je dois cliquer sur l'étape précédente « Vérifier le runtime Python », lire le résultat, puis revenir sur « Décider de la suite ». Le système me propose ainsi d'approuver avant de montrer l'objet de mon approbation. Capture : `09-decision-unique.png`. Défaut signalé immédiatement au responsable, avant conclusion de recette.

**Contournement testé.** Cliquer l'étape précédente retrouve la sortie réelle, sa version Python, le code zéro et les preuves. Après cet examen, revenir à la décision permet une approbation explicite. Capture : `10-rechercher-preuve.png`. Recommandation : afficher la sortie et la preuve de la commande directement sous la question, ou au minimum un accès clairement nommé « Examiner le résultat de cette commande » au même endroit.

**Fin du parcours.** Après examen de la commande précédente et approbation unique, le workflow affiche Terminée, sa durée totale et les dates début/fin. Retour à la liste revient aux modèles. Captures : `11-termine.png`, `12-duree.png`, `13-retour.png`. Rejeu complet : 1 test réussi en 19,2 s ; `result.json` distingue le succès technique du défaut ergonomique reproduit.

## Verdict

Lancement sans IA et suppression de la double validation acceptés. Reprise locale comprise et réellement exécutée. La décision finale reste recevable après contournement, mais pas encore suffisamment autonome : je demande la correction de l'absence de résultat dans l'écran d'approbation avant de considérer ce modèle entièrement satisfaisant en usage.

Aucun fournisseur ou service externe qualifié. HOME, PATH fournisseurs inertes, états workflow et runtime isolés ; aucune écriture SQLite/JSON moteur. Le seul changement hors GUI est la correction du fichier Python synthétique, équivalente au travail dans un éditeur de code.

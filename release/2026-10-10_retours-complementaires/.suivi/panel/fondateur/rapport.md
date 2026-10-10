# Fondateur — recette UX rc16

Candidat figé `/tmp/tricorder-rc16-final`, 10 octobre 2026. Agent jouant le persona, vraie GUI Electron 1440 × 1000, écran Xvfb isolé. Aucun code applicatif ni rapport d’un autre persona consulté avant constats. Fixtures Engine synthétiques et fournisseurs inertes. Deux intentions réalisées avec un contournement ; adoption réservée tant que la nouvelle demande reprend silencieusement les anciennes valeurs.

## Routine simple et formulaire par demande

Je cherche d’abord dans Workflows. La création nécessite Gestion des workflows → Workflows enregistrés → Créer un workflow ; je l’ai trouvée, mais cela coûte un détour quand mon intention est simplement de créer une routine. Le dialogue me permet de choisir Document comme premier bloc, sans passer par une tâche IA. Je nomme la routine « Préparer le suivi Atlas » et sélectionne Client Atlas.

Dans Paramètres du workflow, « Formulaire de lancement » explique clairement que ces informations sont propres à chaque exécution. J’ajoute « Période du suivi », obligatoire, avec une aide. Je configure le contenu du Document et sa validation technique automatique. Au lancement, le champ figure en tête et le texte indique explicitement une exécution locale sans fournisseur IA. L’exécution réelle locale termine correctement.

**Défaut majeur d’usage :** après ce succès, ouvrir Exécuter depuis la liste des workflows enregistrés reprend « Semaine du 12 octobre » et le titre « Suivi Atlas semaine 42 ». J’attendais une nouvelle demande vierge ; rien ne m’annonce la reprise de l’ancien formulaire. Risque concret : lancer la semaine suivante avec la période précédente. Contournement vécu : remplacer manuellement période et titre avant le deuxième lancement. Après remplacement, les deux demandes terminées conservent bien leurs valeurs distinctes (12 et 19 octobre), confirmé par lecture API ; le modèle n’est pas utilisé comme stockage commun des valeurs exécutées.

**Friction mineure :** l’inspecteur du bloc Document affiche « Effort IA de cette étape ». Cela fait hésiter sur le caractère réellement local de la routine. Le formulaire de lancement dissipe ensuite le doute, mais trop tard pour éviter cette lecture inutile.

Preuves : `02-creer.png`, `03-parametres.png`, `05-document.png`, `06-formulaire.png`, `07-premiere-terminee.png`, `08-deuxieme-formulaire-vierge.png` (nom conservé, mais montre justement le formulaire NON vierge), `reprise-formulaire.json`, `preuves-api.json`.

## Travail terminé et décision renommée dans l’historique

Un workflow synthétique déjà enregistré propose Email client / Ticket support. Je l’ouvre et renomme librement le premier choix « Email au client ». Le texte du champ explique que le renommage conserve les branches, ce qui me rassure. Je lance réellement le workflow local et choisis ce nouveau libellé dans la GUI. La bonne branche termine ; le ticket devient Non applicable.

Je retrouve ensuite « Décision Atlas vendredi » avec les deux suivis hebdomadaires dans Workflows → Historique. Le titre court et le client facilitent le choix ; quatre clics depuis la navigation suffisent pour atteindre le rapport. **Défaut concret :** « Décisions et suite » affiche le code `email` au lieu de « Email au client ». Je peux déduire la destination dans cet exemple simple, mais le rapport ne restitue pas les mots de la décision prise. Le titre de la branche exécutée permet de contourner partiellement le problème ; aucun abandon.

Preuves : `09-renommer-choix.png`, `10-decision-terminee.png`, `11-historique.png`, `12-rapport-decision.txt`, `13-libelle-historique.png` et snapshots `.txt`.

## Périmètre de preuve

Les exécutions sont locales réelles de Documents et d’une décision humaine ; aucun appel IA, envoi email ou service externe. La routine Document a été entièrement créée/configurée dans la GUI ; seul le workflow de choix initial a été préparé via Engine. Aucun JSON/SQLite d’état retouché. L’analyse ne qualifie ni qualité métier générée, ni service réel, ni insertion de champs dans le contenu du Document.

Script autonome : `PATH=/tmp/tricorder-xvfb/usr/bin:$PATH xvfb-run -a node release/2026-10-10_retours-complementaires/.suivi/panel/fondateur/parcours.cjs`. `execution.log` final et lectures API accompagnent les captures. Le script a été enrichi après observation des écrans sur des profils neufs. Des erreurs de pilote dues aux deux accès « Workflows enregistrés » ont nécessité de cibler la navigation visible ; ce ne sont pas des blocages utilisateur. Les anciens fichiers `erreur.*` ne représentent pas le parcours final. Le constat sur le formulaire, lui, a été reproduit après ces corrections du pilote.

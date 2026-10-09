# Journal des gestes et captures examinées

Préfixe des captures : `captures/navigation-vocabulaire-`. Toutes vues à 1440 × 1000 sur DISPLAY181, inspectées visuellement par le spécialiste.

| N° / fichier | Geste et observation |
|---|---|
| 01-entree.png | Entrée normale : chargement des projets en cours et ancien état « aucun projet sélectionné ». Capture transitoire, aucun verdict de latence. |
| 02-accueil-charge.png | Accueil reçu : activité sélectionnée, Nouvelle demande/Créer workflow/Essayer exemple, définition Git du projet. |
| 03-nouveau-projet.png | Nouveau projet : nom, racine Git locale, choix natif et note dépôt existant. |
| 04-preflight-terminal.png | Création Coordination, ouverture shell, commande préflight tapée au clavier ; chemins et versions des deux stubs visibles avant workflow. |
| 05-creation-workflow.png | Clic workflow vide, état projet encore affiché avant ouverture effective ; ne prouve pas un échec. |
| 06-editeur-blocs.png | Nom de workflow appliqué, éditeur et premier bloc ; capture avant ouverture de palette. Palette reçue ensuite : « Ajouter une étape », Travail/Agent, Tâche dans conversation, Commande, Document, Aiguillage, Décision/Accord humain, Question ouverte, Organisation, Opération externe, Communication. |
| 07-export-reutilisation.png | Deux blocs reliés, révision3 enregistrée, consignes/critères de la tâche visibles. Exporter déclenche un dialogue natif identifié, ensuite annulé par Escape ; pas un menu de modèles. |
| 08-workflows-modeles.png | Mes workflows : une méthode liée à Coordination, boutons Exécuter/Ouvrir, deux onglets Mes workflows/Modèles ; ⋯ est un summary et contient Archiver. |
| 09-modeles-catalogue.png | Modèles : exemples généralistes et logiciels, « Destination : Sans projet » après arrivée par rubrique globale. Pas de conversion depuis la méthode locale à cet endroit observé. |
| 10-options-reutilisation.png | Retour éditeur, Options : Phases/Recharger et valider/Planifier ; aucun geste direct de réutilisation trouvé. |
| 11-import-cible.png | Après export synthétique et ajout Support, import depuis Workflows : destination Sans projet/Bibliothèque/Support/Coordination, résumé deux blocs/un lien, « Modèles : aucun », avertissements d’absence d’exécutions/accords repris. |
| 12-demande-lancement.png | Copie Support renommée « Qualifier un incident », Exécuter ouvre intention facultative, autres projets, terminal, auto/simulation. |
| 13-terminal-stub.png | Intention tapée dans dialogue puis lancement terminal. Marqueur inerte, prompt shell, agent arrêté ; suivi 0/2 étapes et une demande. |
| 14-autre-projet-terminal.png | Changement Coordination : le terminal est masqué, badge1 conservé ; méthode de réunion visible, aucune demande dans ce projet. |
| 15-activite-reprise.png | Activité : carte unique Support/Qualifier un incident/Rév2, statut « À poursuivre dans le terminal » mais agent arrêté non mentionné sur carte. |
| 16-retour-demande.png | Clic carte : Support rétabli, terminal/sortie conservés, demande d’incident affichée. |
| 17-vue-ensemble.png | Vue d’ensemble : 0 demande lançable, une demande à prendre en charge, instruction Continuez dans terminal et bouton Continuer dans terminal ; accès Reprendre agent secondaire. |
| 18-continuer-terminal.png | Clic Continuer : focus lu `xterm-helper-textarea`, prompt shell toujours présent, Codex arrêté. Ne relance pas l’agent ; aucun texte naturel exécuté dans le shell. |

Après capture18, import du fichier exporté vers Bibliothèque de modèles via le même dialogue (sélection par label, clic Importer le brouillon). Vue reçue « MODÈLES / WORKFLOW », Préparer une réunion, révision1 enregistrée, deux blocs/un lien et message « Brouillon importé. Aucun workflow ni planification activée. » Texte complet enregistré dans bibliotheque-reception.txt, aucune capture supplémentaire.

Mesures de navigation : après arrivée dans Coordination, retour au travail Support en **deux gestes** (Activité, carte). Réutilisation depuis la méthode dans l’éditeur par **trois changements de vue** (Projets pour créer la destination, projet Support, Workflows pour importer), en plus du choix export/import/destination/renommage. Les allers-retours exploratoires Mes workflows/Modèles/éditeur ne sont pas incorporés à cette voie finalement reçue.

Limites d’automatisation : première tentative fill sur champ racine readonly abandonnée. Quelques identifications button ratées car « Options » et ⋯ sont des summaries ; résolution par leurs textes visibles, pas mutation DOM. Appels Playwright 5s internes avec contrôleur12–45s ; aucun reset du contrôleur. Ces erreurs de localisation ne sont pas des bugs utilisateur.

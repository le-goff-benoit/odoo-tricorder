# Contre-épreuve de la correction du brouillon

10 octobre 2026, workspace courant après build, nouveau profil Electron synthétique. Contrôle indépendant limité à la GUI ; aucun code, README, test ni rapport tiers lu. Le rapport initial reste inchangé.

Même exception déclarée que lors du premier passage : seul le retour du dialogue natif de choix du fichier a été substitué vers reunion-2.txt synthétique. L’import, les clics et les états du formulaire sont ceux de l’application réelle. Aucun appel direct au moteur de workflow, aucune exécution de fournisseur ni service externe.

Résultat observé :

1. Nouvelle demande → Réunion : compte rendu et email. Texte de la réunion A collé, fichier de la réunion B ajouté, sélection des deux réunions saisie. Le fichier figure réellement dans le formulaire. Capture 09.
2. Fermer × puis Utiliser : sources conservées, accompagnées de l’avis visible « Brouillon conservé : ces informations proviennent de votre préparation précédente. » et du bouton « Commencer une demande vierge ». Capture 10.
3. Clic « Commencer une demande vierge » : texte vide, sélection des réunions vide, aucune occurrence de reunion-2.txt dans la GUI, avis de conservation disparu. Capture 11.
4. Fermer ×, retourner à la liste : catalogue limité aux dix modèles fournis, aucun modèle personnel ajouté. L’onglet Workflows enregistrés annonce « Aucun workflow enregistré ». Captures 12 et 13.

La correction reçoit donc la contre-épreuve GUI sur le parcours demandé : reprise annoncée et départ vierge explicite, sans création de modèle ou workflow enregistré visible. L’absence de copie interne sur disque n’est pas qualifiée par ce protocole GUI. Le profil Electron synthétique et son Xvfb ont été fermés.

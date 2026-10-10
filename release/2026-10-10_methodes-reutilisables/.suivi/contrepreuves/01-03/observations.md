# Contre-épreuve indépendante — personas 1 à 3

Candidat observé : `/tmp/tricorder-method-review-v5`, le 10 octobre 2026. Observations gelées avant toute lecture du code, README, tests ou rapports tiers. Environ 10 minutes utiles ; aucune modification de l’application.

Protocole : Electron réel lancé par Playwright sous Xvfb, profils HOME/XDG/TRICORDER/STATE/RUNTIME/AGENTS/CODEX/CLAUDE synthétiques. Binaires codex et claude synthétiques quittant avec 78. Fichier reunion-2.txt synthétique. Seule substitution : retour du dialogue natif Electron (`dialog.showOpenDialog`) vers ce fichier, explicitement autorisée ; clic Ajouter des fichiers, import et état du formulaire réels. Aucun appel à l’API du moteur de workflow. Le dialogue système de choix du fichier n’est donc pas qualifié. Aucune lecture du trousseau, aucun fournisseur, service externe ou résultat métier qualifié.

## 1. Assistante — deux réunions et annulation

Parcours GUI : Workflows → Nouvelle demande → Réunion : compte rendu et email → Continuer. Texte d’une réunion collé, seconde réunion dans le fichier, titres/dates indiqués dans « Réunions à traiter ». L’interface affiche le fichier « reunion-2.txt · copie conservée » et Retirer. Capture 02.

Fermer la fenêtre (×), puis Utiliser sur le même aperçu, réouvre avec le texte collé, les références des deux réunions et le fichier encore présents, même après 800 ms. Capture 03-relance-source-vierge-echec. Ce chemin ne commence donc pas avec des sources vierges. Il peut correspondre à une reprise du formulaire ; la GUI ne propose pas ici une distinction explicite reprise/annulation.

Le chemin complet Retour à la liste → Nouvelle demande n’a pas été mené à son résultat dans le temps imparti (une action du harness a attendu le mauvais sélecteur masqué, puis nouvelle tentative interrompue au budget). Ne pas conclure que toutes les nouvelles demandes conservent les sources. Absence de copie sur disque après annulation non établie : la contre-épreuve GUI ne lit pas l’état interne.

## 2. Dirigeant — aperçu, modèle IA et agent arrêté

Le modèle Réunion présente l’objectif, les informations à fournir, les trois résultats attendus et les rôles Recherche, Analyse, Rédaction, Vérification. « Choisir l’IA » ouvre une liste courante avec des noms lisibles (GPT 6.1 Sol, GPT 6 Astra, GPT 6 Sol, etc.), recherche et option « Autre modèle… (avancé) ». Capture 04. Un identifiant technique n’est pas requis dans le parcours courant.

Le catalogue fixture « Modèle de test » ne s’est pas affiché. Aucune sélection suivie d’un lancement n’a été qualifiée. La première fenêtre s’est fermée avant la sélection, cause non établie. L’état agent arrêté et une action GUI de reprise/annulation restent non testés.

## 3. Opérations — routine et jeudi

Création GUI réussie de « Routine du jeudi », une étape « Vérifier les chiffres », résultat « Synthèse des chiffres », validation « Seulement en cas d’anomalie ou d’information insuffisante ». L’aperçu enregistré reprend cette politique en langage courant. Capture 05. Cela prouve la configuration enregistrée et affichée, pas le comportement d’un fournisseur sur une anomalie.

Planification trouvée via Modèles → Routine du jeudi → Modifier mon modèle → Options → Planifier. Les sept jours sont sélectionnables ; jeudi seul et 09:00 Europe/Zurich configurés avec un texte synthétique fixe. Capture 06.

La liste Source du travail distingue « Reprendre le même texte à chaque fois » et « Lire les nouvelles sources d’une connexion ». Le premier répète explicitement le même contenu et ne recherche pas les messages/réunions arrivés depuis. Le second annonce « Aucune connexion de lecture vérifiée dans ce projet » et demande une connexion configurée et vérifiée. Capture 07. Aucune activation réalisée : modèle IA non configuré, connexion réelle absente. Le bouton Activer la planification était visuellement activable ; son refus serveur n’a pas été testé.

## Verdict borné

Configuration GUI de routine, validation conditionnelle, choix jeudi, distinction texte fixe/nouvelles sources et liste IA courante observés. Risque observé : fermer puis Utiliser conserve des sources que l’utilisatrice peut croire annulées. Annulation sans copie, demande suivante vraiment vierge, agent arrêté inerte avec action GUI, activation effective et résultat métier restent non établis. Aucun critère non testé n’est considéré reçu.

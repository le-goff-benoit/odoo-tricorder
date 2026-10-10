# Reproduction depuis écrans visibles

Harness interactif parcours.cjs : lance Electron rc.17 dans des répertoires temporaires et capture chaque interaction. Le terminal doit être alloué avec tty=true. Script à finalité de découverte, pas assertion automatisée d’un parcours reçu.

1. Activité → Créer un workflow → nom Comparer les deux documents → Créer et ouvrir.
2. Première étape → consigne analyse document A → Appliquer.
3. Ajouter un bloc → Tâche IA autonome → nom analyse document B → consigne → Appliquer.
4. Ajouter un bloc → Réunir → nom comparer les analyses.
5. Relier → observer l’absence de données déclarées et le champ JSON, abandonner la liaison.
6. Enregistrer → Exécuter → lire les avertissements ; ne pas lancer les fournisseurs.
7. Consulter la maquette dans un navigateur neuf → Voir support → Voir les agents → Workflows → Créer un workflow.

Captures : 07 éditeur initial ; 10 propriétés tâche ; 18 racines indépendantes ; 20 liaisons ; 21 lancement ; 22 bibliothèque maquette ; 23 aperçu ; 24 agents ; 25 création maquette.

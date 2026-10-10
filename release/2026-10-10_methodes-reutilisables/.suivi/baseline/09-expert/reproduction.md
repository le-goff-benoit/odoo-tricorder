# Reproduction des observations

Utiliser exclusivement un profil temporaire. Le script parcours.cjs lance le binaire rc.17 avec tous HOME/XDG/TRICORDER/CODEX/CLAUDE redirigés et deux fournisseurs inertes qui quittent avec 78. Le terminal lit des expressions JavaScript, et les observations furent pilotées étape par étape d'après les éléments visibles, pas depuis un scénario préparé.

Commande : `PATH=/tmp/tricorder-xvfb/usr/bin:$PATH xvfb-run -a node release/2026-10-10_methodes-reutilisables/.suivi/baseline/09-expert/parcours.cjs`.

Parcours humain rejouable :

1. Ouvrir Workflows, puis Modèles. Observer l'exemple simulé, les types, les trois actions et la liste.
2. Cliquer le titre Support — diagnostic et réponse : aucune ouverture.
3. Cliquer Personnaliser une copie sur cette carte, puis Créer la copie et l'ouvrir. Observer les 8 blocs / 12 liens et le défilement du graphe.
4. Cliquer Analyser la demande et son urgence. Lire la consigne, la validation et les critères.
5. Cliquer Exécuter. Lire faits, impact, destination et consigne ; rechercher une acquisition de la source. Ne pas lancer.
6. Fermer le dialogue avec Escape, revenir à la liste puis Créer un modèle. Observer la sélection préalable du type de bloc. Ne pas créer cette seconde méthode : abandon consigné.
7. Fermer le profil test sans toucher au profil utilisateur.

Le pilote a rencontré deux délais Playwright : nom accessible différent du texte visuel avec icône ; croix visuelle d'un dialogue nommée autrement. Ils ne sont pas classés comme défaut de découverte. Les captures 01 et 09 ont été prises trop tôt pour documenter l'écran suivant ; 02 et le texte du dialogue fournissent les observations correctes. La capture 03 correspond au modèle réellement affiché.

Maquette v2 : dans une fenêtre distincte, bibliothèque → Voir le workflow support → détail analyse → Lancer une demande → choix Email → suivi proposé → résultat proposé → Agents → Workflows → Créer un workflow. Captures 13 à 20. Aucun clic sur la maquette n'exécute le moteur.

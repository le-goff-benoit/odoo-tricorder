# Journal

## 2026-09-11 — Livraison GitHub 0.2.0

- Publication demandée par Benoît ; installation locale laissée à sa main via apt.
- Livraison : sources, notes de version, paquet Debian amd64 et SHA256SUMS.
- Empreinte du paquet vérifiée ; 39 tests Python et 2 parcours Electron rejoués sur sources et paquet.
- Publication publique conditionnée au succès de la CI sur le commit livré.
- Mise à jour : les sessions PTY existantes sont préservées ; actualisation du service ancien uniquement à vide.

## 2026-09-11 — Roadmap et ergonomie 0.2.0

- Implémentation de la roadmap : observation native, mesures, reprise, sources, stack, graphe et préférences.
- Portée projet/release/tâche explicite ; critères visibles ; missions associées aux sessions/rôles/workflows.
- Pictogrammes Claude/Codex, attente humaine rouge avec « ! », notification sur événement explicite.
- Explorateur en lecture seule avec inbox ; recherche transversale et volume des preuves JUnit.
- Emplacements configurables : racine projets, dossier de travail, stack, sources Community/Enterprise/OCA.
- Aucune modification des projets clients, d’Odoo Crew, des credentials ou des configurations globales des agents.
- QA source : 39 tests Python et 2 parcours Electron verts ; détails et validation du paquet dans QA.md.
- Reprises : concurrence navigation, dialogue de profil, identité des sous-agents, attentes/outils parallèles.
- Livraison locale : version 0.2.0, README/roadmap/contrats documentés ; publication GitHub distincte.

## 2026-09-11 — Première version du cockpit

- Demande : terminal Ubuntu centré sur les projets, environnements, releases et agents Odoo.
- Réalisation : Electron/xterm.js, lecteur Python et service PTY privé persistant.
- Plans : règles de validation réutilisées depuis odoo-crew, sans mutation des données client.
- Sources : bibliothèque commune, série exacte, distinction module/Studio/Online.
- Interface : inspiration LCARS discrète, bannière fournie et liens vers les deux dépôts.
- QA : 14 tests unitaires/PTY, scénario de bureau sur données fictives, concordance des états NECA.
- Reprises : conflit de collage natif supprimé, tests isolés du home/presse-papiers, publication CI explicite.
- Limites : observation native des sous-agents et import automatique du temps reportés à la suite.
- Livraison : paquet Debian amd64 et notes de version 0.1.0.

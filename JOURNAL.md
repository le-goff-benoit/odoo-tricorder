# Journal

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

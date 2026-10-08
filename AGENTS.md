# Tricorder

Application de bureau Ubuntu, pas un module Odoo. L'aiguillage de développement
Odoo ne s'applique pas. Le moteur générique `backend/workflow_engine/` est le seul
écrivain de l'état d'exécution. L'interface et les agents passent par ses commandes
validées ; ne jamais retoucher SQLite/JSON pour forcer une transition. Les anciens
projets clients et leurs workflows restent inchangés. Le pack Odoo est optionnel.

Electron fournit la fenêtre isolée, xterm.js le terminal et Python 3 le lecteur
des projets et le service PTY local. Aucun service TCP, aucune télémétrie.
Ne jamais lire le trousseau ni les secrets des fournisseurs. Un environnement
sélectionné est un contexte, jamais une autorisation d'écriture en production.

Vérifier : `npm test`, `npm run test:ui`, `npm run dist`.
Les tests utilisent des projets synthétiques dans des répertoires temporaires.
Maintenir README.md et JOURNAL.md. Ne pas publier de dépôt distant sans demande.
La documentation humaine est dans `release/<id>/README.md`, le suivi utile dans
`.suivi/`. Les installateurs sont produits dans `build-artifacts/`. Une simulation
ne qualifie ni un fournisseur, ni un test métier, ni un service externe.

Vocabulaire de l’interface : termes IT courants (éditeur de workflows, bloc,
exécution, validation, journal d’exécution, planification, déploiement). Éviter
les métaphores produit et garder les mêmes libellés entre écrans et documentation.

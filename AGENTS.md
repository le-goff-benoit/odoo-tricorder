# Odoo Tricorder

Application de bureau Ubuntu, pas un module Odoo. L'aiguillage de développement
Odoo ne s'applique pas. Les projets clients et ~/.odoo19-agents sont des sources
en lecture seule pour le cockpit ; ne jamais modifier leurs workflows directement.

Electron fournit la fenêtre isolée, xterm.js le terminal et Python 3 le lecteur
des projets et le service PTY local. Aucun service TCP, aucune télémétrie.
Ne jamais lire le trousseau ni les secrets des fournisseurs. Un environnement
sélectionné est un contexte, jamais une autorisation d'écriture en production.

Vérifier : `npm test`, `npm run test:ui`, `npm run dist`.
Les tests utilisent des projets synthétiques dans des répertoires temporaires.
Maintenir README.md et JOURNAL.md. Ne pas publier de dépôt distant sans demande.

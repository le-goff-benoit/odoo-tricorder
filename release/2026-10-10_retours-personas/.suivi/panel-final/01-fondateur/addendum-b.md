# Contre-épreuve ciblée — candidat B

Le 10 octobre 2026, candidat construit `/tmp/tricorder-release-final-b`, vraie fenêtre Electron, environnement synthétique isolé et fournisseurs inertes. Le rapport initial reste inchangé. Périmètre limité au choix de modèle et à la conservation du projet jusqu’au formulaire.

Depuis Activité, j’ouvre Nouvelle demande, choisis Client Atlas puis ouvre la liste des workflows. « Workflows complets » et « Blocs à composer (avancé) » sont visibles dans la liste dépliée : je comprends que les éléments génériques en bas servent à construire et que la première section répond à ma demande. Le nombre d’options reste important mais elles ne paraissent plus équivalentes.

Je sélectionne « Clôture de réunion ». La description immédiatement sous le choix dit « une ou plusieurs réunions » et annonce décisions, actions, compte rendu et texte d’email, sans envoi. Cela dissipe mon hésitation précédente avant de continuer. Client Atlas reste sélectionné malgré le changement de modèle ; le message confirme « Le modèle sera utilisé dans Client Atlas ». Après Continuer, je retrouve Client Atlas dans le titre du contexte et le formulaire Réunions ou période à analyser. Aucune nouvelle sélection de projet n’est nécessaire.

**Verdict : corrections reçues pour ces deux points.** Le choix est plus explicite et le contexte client reste intact. Aucun lancement, aucune simulation et aucune qualité IA ne sont requalifiés dans cette contre-épreuve.

Preuves : `b00-liste-modeles.png` (groupes visibles), `b01-choix-reunion.png` (description et projet), `b02-formulaire-atlas.png` (contexte conservé), snapshots `.txt`, `b-groupes.json` (lecture DOM). Script autonome `contre-epreuve-b.cjs`, journal `b-execution.log` achevé sans erreur. Le script réutilise les fixtures Engine déclarées du premier parcours dans un nouvel état temporaire ; aucune écriture directe d’état.

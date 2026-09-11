# Odoo Tricorder 0.2.0

Le cockpit passe de la lecture des workflows à l’observation explicite des missions.

- Navigation projet/release/tâche et critères d’acceptation plus visibles.
- Sessions et rôles à portée explicite : release complète ou tâche.
- Hooks Claude opt-in, JSONL natifs, statut Codex par identifiant via son service local.
- Sous-agents observables, projet rouge « ! » et notification pour les attentes humaines.
- Pictogrammes Claude/Codex dans les onglets.
- Temps par tâche, activation guidée, distinction cumul/délai/attente et préparation
  de consolidation Odoo Crew sans écraser les prévisions.
- Volume des tests JUnit par rapport, avec liens vers les preuves.
- Explorateur du projet et des fichiers reçus, recherche transversale.
- Sources/profils/branches/commits/dépendances Enterprise-OCA ; stack et restauration déclarée.
- Emplacements configurables : projets, sources et dossier de travail des nouveaux shells.
- Graphe filtrable, reprise portable, palette, raccourcis et préférences persistantes.

## Installation / mise à jour

```bash
sudo apt install ./odoo-tricorder_0.2.0_amd64.deb
```

L’observation s’active depuis **Agents → Associer une session**, pas automatiquement.
Claude/Codex/Odoo Crew restent séparés. Les projets/sources sont en lecture seule
hors commandes que vous exécutez.

Un ancien service PTY 0.1 conserve ses programmes. Arrêter explicitement tous ses
terminaux une fois pour activer les dossiers personnalisés : seul le service vide
est actualisé. Aucun programme existant n’est interrompu automatiquement.

Consulter [les adaptateurs](https://github.com/le-goff-benoit/odoo-tricorder/blob/v0.2.0/docs/ADAPTERS.md) pour les formats et limites.
Un rapport JUnit vert ne remplace pas la recette Odoo. Une donnée absente reste inconnue.

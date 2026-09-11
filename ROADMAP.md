# Suite du cockpit

La 0.1.0 livre le terminal et la lecture du dispositif existant.

## Observation native des agents

- Relier explicitement projet, release, tâche, flow et identifiant de session natif.
- Adaptateurs indépendants pour les hooks Claude et les événements Codex.
- Statuts observés : activité, outil en cours, attente humaine, fin, interruption.
- Hiérarchie des sous-agents et liens vers leurs événements disponibles.
- Ne jamais assimiler le simple démarrage d’un processus à une activité IA.

## Mesure et reprise

- Import des observations via odoo_usage.py, avec attribution explicite des périodes.
- Séparer temps cumulé, délai écoulé et attente humaine mesurée.
- Préserver les prévisions historiques et les mesures inconnues.
- Fiche de reprise portable entre Claude et Codex ; leurs conversations restent distinctes.

## Environnements et sources

- Profils explicites par projet en complément de la déduction initiale.
- Vérification des branches/commits des sources Community et Enterprise.
- Analyse des dépendances de modules pour le besoin exact d’Enterprise/OCA.
- Inventaire de stack locale et fraîcheur des restaurations, sans toucher aux bases.
- Actions de configuration en s’appuyant sur les outils existants, avec leurs confirmations.

## Ergonomie

- Navigation clavier étendue entre projets, tâches et terminaux.
- Aperçu du graphe de dépendances avec filtrage par tâche et ressources.
- Recherche transversale dans les documents et palette de préparation des skills.
- Préférences de police, contraste et disposition mémorisée des panneaux.

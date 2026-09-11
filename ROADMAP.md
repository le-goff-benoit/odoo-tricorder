# Roadmap — implémentation 0.2.0

La roadmap initiale est implémentée dans la version 0.2.0. Installer son paquet
depuis les releases GitHub ; ces fonctions ne sont pas dans le paquet 0.1.0.

En 0.2.1, le graphe visuel et la fiche de reprise sont retirés de l’interface à la
demande de l’utilisateur. Le tableau ci-dessous conserve l’historique de la 0.2.0.

La 0.2.1 ajoute le suivi Express hors plan et regroupe Sources, Environnements et
Fichiers sous Projet. Le cycle de vie, la navigation, les critères et les durées
sont fiabilisés ; la recette et ses limites sont consignées dans [QA.md](QA.md).

| Volet | Réalisation | Preuves |
|---|---|---|
| Association native | Projet, release, tâche ou release complète, rôle, flow, terminal, session, bornes | Tests observation et bureau |
| Adaptateurs | Hooks Claude par lancement, JSONL Claude/Codex, lecture du service Codex par identifiant | Tests observation/runtime |
| États & hiérarchie | Dernier état, outil si fourni, attente, interruption/fin, parent confirmé, événements filtrés | Tests adaptateurs et alertes UI |
| Temps | Lecture odoo_usage.py, attribution sans chevauchement, inconnu préservé, comparatif par tâche | Tests lecteur et bureau |
| Consolidation | Préparation odoo_effort.py import-usage, pas d’écriture automatique | E2E vérifie qu’effort.json n’est pas créé |
| Reprise | Fiche Markdown portable à copier/exporter, conversations distinctes | Parcours bureau |
| Sources | Profils explicites, chemins communs/projet, branches/commits, dépendances transitives | Tests insights |
| Stack | Inventaire fichiers/exécutables, dossier dédié, restauration déclarée | Tests insights |
| Configuration | Palette de skills, fournisseur explicite, confirmations conservées | Parcours bureau |
| Navigation | Portée permanente, critères visibles, raccourcis projets/tâches/terminaux | Parcours bureau |
| Graphe | Dépendances du plan, filtres tâche/ressource, étapes atteintes/prêtes | Parcours bureau |
| Fichiers | Explorateur, inbox, aperçus sûrs, recherche Markdown/TXT transversale | Tests limites/symlinks et bureau |
| Préférences | Police, taille, contraste, largeurs, division/suivi, racine projets et dossier de travail | Tests PTY et bureau |
| Volume de QA | JUnit par exécution/tâche, exécutés/réussis/échecs/erreurs/ignorés | Tests quality et bureau |

## Frontières volontaires

- Association explicite : pas de capture globale des conversations.
- Aucun état IA déduit d’un processus présent ou silencieux.
- Format/version non reconnu : indisponibilité expliquée, jamais faux statut.
- Les événements détaillés Claude nécessitent le lancement avec les hooks préparés.
- Codex runtime nécessite un service déjà démarré et app-server proxy ; aucun thread
  n’est repris. Sous-agents directs : 30 maximum, parent confirmé par le service.
- Le statut runtime n’est pas une mesure. Les inconnues ne deviennent jamais zéro ;
  ni double compte natif/consolidé, ni attente fabriquée à partir du délai total.
- Pas de téléchargement Enterprise/OCA, restauration, RPC, déploiement ou écriture
  de workflow automatisés. La fraîcheur de restauration reste déclarative.
- Pas d’éditeur ou d’exécution depuis l’explorateur, ni indexation PDF.

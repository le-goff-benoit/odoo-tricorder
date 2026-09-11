# Odoo Tricorder 0.2.7

- Chronomètres Crew : affichage en cours, veille automatiquement exclue grâce aux horloges Linux.
- Redémarrage/horloge indisponible : interruption signalée, aucune durée inventée.
- Entrées, sorties et cache affichés par tâche, compteurs partiels préservés pour Claude/Codex.
- Une dernière ligne JSONL en cours d’écriture ne masque plus les mesures précédentes.
- Aucun cumul du relevé natif avec sa copie enregistrée ; anciens bilans et projets conservés.
- Bouton de changement de release du terminal accessible aussi dans une fenêtre étroite.
- Nécessite Odoo Crew mis à jour pour les nouveaux compteurs et horloges. Les durées natives sans trace de veille ne sont pas retraitées.

## Contexte et ergonomie hérités de la 0.2.6

- Choix « Aucune release » persistant, sans reprise implicite d’une release close.
- Nouvelle release ouverte détectée et sélectionnée ; terminal existant réutilisé quand non ambigu.
- Changement manuel du repère release/tâche du terminal, sans interruption de son processus.
- Express préservé ; pas d’attribution automatique en cas d’ambiguïté.
- Aperçus Markdown lisibles et nettoyés ; source replié, aucun contenu distant chargé.
- Après une erreur de lecture projet, l’actualisation réussie restaure l’écran sans blocs parasites.
- Un terminal dont la création finit après un changement de projet ne ramène plus de force à l’écran Terminal.
- Temps par agent/rôle dépliables sous chaque tâche : initial, révisé, réalisé, heures/minutes et données manquantes explicites.
- Pourcentages par tâche et par agent sur le temps connu, synthèse des agents ; mise à jour des relevés avant clôture.
- « Relevé incomplet » expliqué par rôle : absence de relevé, période en cours ou interrompue, sans remettre en cause la tâche terminée.

## Retrait de l’email hérité de la 0.2.5

- Retrait de l’email de clôture, de son éditeur et des réglages Gmail/SMTP/OAuth.
- Retrait des API email et des dépendances ajoutées uniquement pour cette connexion.
- Odoo Crew ne prépare ni n’envoie d’email à la clôture ; anciennes commandes neutralisées.
- Compatibilité avec les fenêtres 0.2.4 encore ouvertes, sans relire les données privées.
- Brouillons, paramètres et secrets antérieurs conservés, non utilisés.
- Les fichiers reçus et les communications rédigées comme documents restent indépendants.

## Temps partiels hérités de la 0.2.3

- Temps connus conservés quand un rôle, une tâche ou une reprise n'est pas mesuré.
- Sous-total explicitement partiel, sans écart trompeur avec la prévision complète.
- Tableau en heures/minutes ; rôles à compléter et chronomètres ouverts visibles.
- Odoo Crew : contrôle des chronomètres avant un nouveau sceau, interruption explicite sans durée inventée.
- Aucun registre client historique corrigé automatiquement ; aucune modification des sceaux existants.

## Fiabilisation héritée de la 0.2.1

- Statuts de release alignés sur Odoo Crew, y compris les anciennes clôtures.
- Points des README historiques, avancement réceptionné et validation des preuves distincts.
- Liens de workflow explicites, provenance worktree et historiques manquants expliqués.
- Sélection de tâche mémorisée par release, navigation concurrente sécurisée.
- Un terminal partagé pour tout le projet ; mesures natives facultatives et avancées.
- En-tête compact, projet non répété, navigation Release → Tâche et environnement séparé.
- Retrait du graphe de dépendances et de la fiche de reprise de l’interface.
- Liste des projets simplifiée : sans ajout, recherche de projet ni « À mon attention ».
- Langage courant, blocs de collecte vides masqués et détails techniques repliés.
- Sources, Environnements et Fichiers regroupés sous Projet, hors des onglets de pilotage.
- Interventions express suivies hors plan : étapes, responsable, contrôles ciblés et bascule vers le développement complet.
- Prévision et réalisé en heures/minutes ; écarts non comparables masqués.
- Volume de tests déclaré dans les comptes rendus, séparé des compteurs JUnit.
- Recette sur fixtures et parcours NECA en lecture seule ; preuves dans QA.md.

## Fonctionnalités du cockpit

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
- Palette, raccourcis et préférences persistantes.

## Installation / mise à jour

```bash
sudo apt install ./odoo-tricorder_0.2.7_amd64.deb
```

Les mesures natives facultatives se configurent depuis **Agents → Réglages du suivi**.
Les tâches et workflows restent visibles sans association de conversation.
Claude/Codex/Odoo Crew restent séparés. Les projets/sources sont en lecture seule
hors commandes que vous exécutez.

Un ancien service PTY 0.1 conserve ses programmes. Arrêter explicitement tous ses
terminaux une fois pour activer les dossiers personnalisés : seul le service vide
est actualisé. Aucun programme existant n’est interrompu automatiquement.

Consulter [les adaptateurs](https://github.com/le-goff-benoit/odoo-tricorder/blob/v0.2.7/docs/ADAPTERS.md) pour les formats et limites.
Un rapport JUnit vert ne remplace pas la recette Odoo. Une donnée absente reste inconnue.

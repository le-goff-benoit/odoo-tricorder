# Odoo Tricorder 0.2.9 — Un cockpit plus léger

- Navigation centrée sur le projet et la release : suppression du sélecteur global
  de tâche et du panneau de suivi latéral. Consulter une tâche ne filtre plus les mesures.
- Kanban compact, colonnes sans cadres ; fiches dans une fenêtre modale avec les
  critères d’acceptation en premier. Échap et retour au tableau, contexte préservé.
- Pied du terminal et messages de suivi superflus retirés ; recherche près des onglets,
  bouton de division lorsqu’il y a plusieurs terminaux. Icône distincte pour Express.
- Préférences réorganisées : Terminal, Affichage, Dossiers et Raccourcis ; unités,
  validation des valeurs, annulation et enregistrement explicites.
- Boutons **Claude** et **Codex** dans le terminal vide : lancement dans un nouveau
  shell du projet. Les exécutables doivent être installés ; aucun terminal existant
  n’est réutilisé pour y injecter une commande. Protection contre le double clic.
- Noms des agents dans les mesures, responsables précis lorsqu’ils sont enregistrés.
  Les interventions connues sans relevé restent visibles avec une durée inconnue.

## Installer sur Ubuntu amd64

Télécharger le `.deb` et `SHA256SUMS` joints, puis :

```bash
sha256sum -c SHA256SUMS
sudo apt install ./odoo-tricorder_0.2.9_amd64.deb
```

Fermer et rouvrir la fenêtre pour charger la nouvelle interface. Les terminaux
persistants continuent ; ne pas utiliser leur bouton d’arrêt pour mettre l’app à jour.

Les anciennes associations natives sont conservées, mais leurs réglages manuels
ne sont plus proposés dans le cockpit. Les mesures enregistrées par Odoo Crew sont
lues automatiquement. Un passage dans le workflow ne permet pas de reconstruire
une durée passée : aucun temps ni aucune identité de fournisseur ne sont inventés.

## Vérification

100 tests Python/JavaScript et 15 parcours locaux sur l’application empaquetée,
dont un projet réel en lecture seule. Contrôles de huit vues en desktop/compact,
navigation sans réaffectation de terminal, absence de faux temps, préférences et
lancement Claude/Codex avec des commandes simulées. Aucun projet client embarqué.

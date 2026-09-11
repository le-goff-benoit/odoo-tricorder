# Odoo Tricorder 0.2.8 — Kanban et design commun

- Kanban global multi-projets et onglet Kanban dédié à chaque release.
- Critères, responsables, temps par agent, preuves et terminal existant accessibles
  depuis les cartes ; filtres et navigation préservés à l'actualisation.
- Avancement enregistré distinct de la validité des preuves ; aucune validation
  par glisser-déposer et aucune réaffectation du terminal par simple consultation.
- Design partagé : espacements, alignements, cartes, boutons, tableaux et dialogues.
- Cadrage avant plan visible hors release puis rattaché explicitement ; mesures
  par phase et rôle, sans double comptage ni estimation reconstruite après coup.
- Bandeau allégé, libellé Environnement ; création de terminal par « + » ou Ctrl Shift T.

## Installation Ubuntu amd64

Télécharger `odoo-tricorder_0.2.8_amd64.deb` et `SHA256SUMS`, vérifier le SHA-256,
puis exécuter :

```bash
sha256sum -c SHA256SUMS
sudo apt install ./odoo-tricorder_0.2.8_amd64.deb
```

Mettre aussi [Odoo Crew](https://github.com/le-goff-benoit/odoo-crew) à jour
(`git pull`, puis `./build.sh`) pour les mesures de cadrage et les consignes de
points d'avancement communes à Claude/Codex. Les profils déjà chargés dans une
conversation ne sont pas remplacés de force : les nouvelles invocations chargent
les nouvelles consignes.

Les terminaux persistants continuent pendant la mise à jour. Fermer et rouvrir
la fenêtre pour charger la nouvelle interface, sans arrêter les terminaux.

## Vérification et limites

98 tests Python/JavaScript et 14 parcours locaux Electron verts sur le paquet,
dont un parcours réel en lecture seule. Huit vues contrôlées en desktop/compact.
Les projets clients ne sont pas embarqués dans l'application ni les tests publics.
Le suivi de pertinence est une consigne Crew, pas un superviseur automatique,
ni une garantie de qualité ou de gain de temps. Aucun envoi d'email.

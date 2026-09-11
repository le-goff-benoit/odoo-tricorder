# Odoo Tricorder 0.1.0

Première version du cockpit terminal des projets et agents Odoo, pour Ubuntu amd64.

- Projets, favoris, environnements et releases dans une interface française inspirée discrètement de LCARS.
- Terminaux persistants : fermer puis rouvrir Tricorder retrouve les mêmes shells.
- Suivi des tâches, preuves périmées, étapes et responsabilités des workflows.
- Vue d’attention transversale, sources Community/Enterprise par série exacte,
  comparaison des estimations avec les mesures existantes et lecture des documents.
- Liens vers Tricorder et les agents Odoo intégrés dans l’application.

## Installation

Télécharger `odoo-tricorder_0.1.0_amd64.deb`, puis :

```bash
sudo apt install ./odoo-tricorder_0.1.0_amd64.deb
```

Le fichier `SHA256SUMS` permet de vérifier le téléchargement. Testé sur
Pop!_OS 22.04 (base Ubuntu). Claude, Codex et [odoo-crew](https://github.com/le-goff-benoit/odoo-crew)
s’installent séparément.

## Périmètre de cette version

Les états du workflow et les processus observés sont distincts. Les sous-agents
natifs et leurs demandes d’autorisation ne sont pas encore reliés automatiquement.
Les mesures proviennent d’effort.json ; une valeur absente reste inconnue.
La sélection d’un environnement prépare le contexte et n’accorde aucune permission.
Les sources sont inventoriées en lecture seule, sans téléchargement automatique.

Les sessions survivent à la fermeture de la fenêtre, pas au redémarrage du poste.

# Livraison 0.6.0-rc.15

Le candidat livré reprend la rc.14 locale, la revue spécialisée, puis les
corrections reçues après le nouveau passage des six agents personas.

## Vérifications reçues

| Vérification | Résultat |
|---|---|
| `npm test` | 447 tests Python et 174 tests JavaScript réussis : 621 au total |
| `npm run test:ui -- --workers=2` | 190 réussis, 3 échecs d’interaction/délai, 2 tests clients facultatifs exclus |
| Reprises ciblées en bureau X séparé, un seul worker | Les 3 tests en échec réussissent sans changement de source : 193 scénarios reçus au total |
| `npm run dist` | Paquet Ubuntu construit avec succès |
| Recette ciblée du binaire empaqueté | 11 parcours réussis, dont commande réelle, réunion et les 9 parcours des retours d’usage |
| Installation utilisateur | Binaire rc.15 empaqueté reconnu ; accueil vide, Workflows et Modèles ouverts avec succès |
| Identité | 121 empreintes du candidat conformes ; les 58 fichiers Python du backend et app.asar du .deb correspondent au paquet essayé |
| `git diff --cached --check` | Réussi après normalisation des espaces de fin de ligne des preuves textuelles |

La passe complète parallèle n’est pas déclarée verte : trois interactions ont
échoué sur le bureau partagé. Les reprises séparées reçoivent le Kanban de
release, le déplacement des cartes et la revue du contenu d’une opération externe.
Elles n’ont nécessité aucune correction du code. La CI conserve son réglage
séquentiel, avec un worker ; son résultat est consultable dans GitHub Actions.

Journaux : [unitaires](verification/unit-final.log),
[interface complète](verification/ui-final.log),
[deux reprises](verification/rechecks-final.log),
[reprise revue externe](verification/gate-recheck-final.log),
[construction](verification/dist-final.log),
[paquet](verification/packaged-final.log).
Les journaux antérieurs conservés dans ce dossier sont des diagnostics historiques.

## Paquet et installation

- Fichier : `odoo-tricorder_0.6.0-rc.15_amd64.deb` (101088184 octets).
- SHA-256 : `412ec7dac56819a2fe010d3f865592820b9ff716df773e63ca5010d2fdfc5fd6`.
- [Empreintes du candidat](candidat-livraison.json), [contenu du .deb](verification/deb-contenu.json).
- Installation utilisateur : `~/.local/opt/odoo-tricorder-0.6.0-rc.15/`.
- Lanceur existant : `~/.local/bin/odoo-tricorder`, utilisé par le raccourci du bureau.
- Ancienne rc.13 conservée ; aucun projet ni réglage de travail remplacé.
- [Installation](verification/installation.json), [démarrage du lanceur installé](verification/installation-demarrage.json).

L’installation est faite à partir du .deb vérifié, sans changer le paquet système.
Le contrôle du lanceur utilise un profil temporaire isolé, pas les données client.
Les tests du paquet et les personas ne qualifient pas les fournisseurs IA ou les
services externes. Les limites d’ergonomie conservées sont décrites dans le README
et dans les rapports initiaux du panel.

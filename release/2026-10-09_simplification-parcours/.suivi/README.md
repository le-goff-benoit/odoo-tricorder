# Preuves de réception

`unit-tests.txt` et `ui-source-first.txt` sont les journaux locaux, avec les espaces
en fin de ligne normalisés. La première campagne UI conserve ses quatre échecs :
recherche de projets nouvellement présente, ouverture d’éditeur à attendre avant
un sélecteur de bouton, et deux anciens libellés de bibliothèque. La réception
ciblée conserve les assertions métier et contrôle aussi le filtrage des projets.

`build-validation.json` compare les sources empaquetées, le backend et le contenu
du paquet Debian extrait. `local-validation.json` réunit les réceptions locales
obtenues avant publication du candidat. Les PNG de `visual-packaged.cjs` et le
scénario `packaged-rc11` du dossier d’audit viennent du binaire à livrer.

Le contrôle global du paquet et la CI du commit exact sont finalisés avant
publication de la release. Leur résultat final est joint à la release GitHub
dans `tricorder-0.6.0-rc.11-validation.json`, avec l’empreinte du paquet livré.

Toutes les données et tous les agents utilisés ici sont synthétiques. Les audits
indépendants gardent leurs propres empreintes et limites ; leurs preuves sources
ne sont pas réécrites par la recette du paquet.

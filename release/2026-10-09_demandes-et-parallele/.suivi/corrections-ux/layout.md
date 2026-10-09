# Correction UX5 — éditeur compact et noms de projets

## Changements reçus

- Sous 760 px de largeur du panneau workflow, les propriétés d’un bloc utilisent toute la surface de ce panneau. Le terminal reste présent selon la disposition choisie ; aucune nouvelle fenêtre n’est créée. Le formulaire possède un seul défilement, avec « Retour au graphe », nom du bloc et « Appliquer au bloc » hors de la zone défilante.
- Le changement de largeur agit par CSS : il ne reconstruit pas le formulaire. Le retour au graphe applique les champs en cours au brouillon et restitue le focus à la carte du bloc. Le graphe et les propriétés côte à côte restent disponibles sur un panneau large.
- L’éditeur s’ouvre à 100 %. Le titre des cartes est à 14 px et leurs métadonnées à 12 px. Le type de bloc n’est plus répété lorsque la carte n’a pas de phase distincte. Le bouton Ajuster reste disponible.
- Les raccourcis de projet conservent le nom entier dans leur tooltip, avec le chemin du projet. Le texte se déplie au survol et au focus clavier ; la densité normale reste inchangée.

Périmètre : `src/studio.js` (classe de disposition, propriétés, focus, zoom), `src/studio.css`, deux règles ciblées de `src/workspace-layout.css`, attributs des raccourcis dans `src/app.js` et conservation du titre dans `src/cockpit.js::alertSidebar`. Les modifications des autres intervenants sont conservées.

## Réception du 9 octobre 2026

Deux tests GUI de `tests/editor-layout-ux.spec.cjs` sont verts (13,3 s) sur le build source coordonné, SHA256 de `dist/app.js` : `26062b41d0c3dd0aa7a7d4d028f248bfb9225a829c2fc57d5b3c31d4dbed3f94`.

1. Échelle initiale, typographie et type affiché une fois ; saisie conservée entre 1440 × 1000 et 1024 × 800 physique à 125 % (819 × 640 CSS), formulaire non remplacé, surface défilante supérieure à 350 px, actions fixes visibles, retour clavier à la carte, thèmes clair/sombre, sauvegarde reçue par le moteur.
2. Terminal vivant et utilisable pendant l’édition compacte, même session et PID, brouillon conservé ; nom complet du projet accessible et visible au survol et au focus.

Commande ciblée : `env DISPLAY=:183 XAUTHORITY=/tmp/tricorder-functional-display/auth-183 ./node_modules/.bin/playwright test tests/editor-layout-ux.spec.cjs --output=test-results/editor-layout-ux-final`.

À 1024 × 800 physique / zoom 125 %, la zone de formulaire offre **476 px de hauteur utile** pour 1097 px de contenu, contre 150 px pour 1190 px dans le constat UX5. Le retour et l’application restent entièrement visibles après défilement. Le changement de taille conserve le même élément de saisie et sa valeur. L’ouverture du terminal conserve la saisie, la session et son PID ; une commande locale est reçue dans le shell.

La première réception a trouvé un défaut supplémentaire réel : `alertSidebar()` retirait le tooltip des projets sans attente humaine, annulant l’ajout de l’attribut dans le rendu principal. Ce bloc conserve maintenant le nom et le chemin, et ajoute l’alerte lorsqu’elle existe sans dupliquer le titre de base. La seconde réception vérifie le titre complet, le nom accessible, le dépliage au survol puis au focus clavier.

Les captures sont natives (`webContents.capturePage`) afin de conserver le cadre complet à zoom Electron 125 %. Elles attendent la fin des transitions de thème et la disparition naturelle du toast ; aucun élément produit n’est masqué pour les réaliser. Les trois images ont été ouvertes et examinées :

- [Propriétés claires, formulaire défilé](layout/properties-819x640-light.png).
- [Propriétés sombres, début du formulaire](layout/properties-819x640-dark.png).
- [Terminal présent et nom du projet déplié au clavier](layout/properties-terminal-sidebar-keyboard.png).
- [Mesure de la surface utile](layout/compact-properties-geometry.json) et [journal des deux tests](layout/reception.log).

Le lancement de la suite globale par l’orchestrateur ayant nettoyé le répertoire commun `test-results` avant l’archivage, les images conservées ici proviennent du nouveau passage de ce même spec dans cette suite, sur le même SHA de `dist/app.js`. Elles ont été examinées à nouveau ; le journal `reception.log` conserve les résultats du lancement ciblé sur :183. Aucun nouveau build ni scénario ajouté pour reconstruire ces preuves.

Les bancs sont temporaires avec HOME/XDG/CODEX_HOME/CLAUDE_CONFIG_DIR/état/runtime isolés. Deux fournisseurs inertes sont placés dans un PATH fixe avant le broker ; le précontrôle est visible dans le terminal. Fixtures via les commandes validées, aucun état d’exécution modifié. Le banc et ses brokers sont nettoyés après chaque test. Aucun client, fournisseur connecté ni service réel utilisé.

**Limites :** recette ciblée de conception compacte et de navigation souris/clavier, sans certification générale d’accessibilité. Les scénarios d’exécution métier, la réception indépendante et la suite globale appartiennent aux autres lots. Le paquet distribué n’a pas été reconstruit par ce lot.

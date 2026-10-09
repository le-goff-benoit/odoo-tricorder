# Audit indépendant 5 — visuel et accessibilité

État : préparation seule, 9 octobre 2026. Aucun avis produit à ce stade. Le dépôt est une application de bureau générique ; les règles Odoo ne s'appliquent pas. AGENTS.md lu ; aucun code produit, aucun autre avis consulté.

## Banc et garde-fous

`../harness.cjs prepare()` exécuté avec `id=ux5-accessibilite-visuel`, display proposé `185`, sortie dans ce dossier. Le manifeste `ux5-accessibilite-visuel-preparation.json` contient les chemins temporaires et la whitelist d'environnement. HOME, XDG, état/runtime, CODEX_HOME et CLAUDE_CONFIG_DIR sont isolés. Deux exécutables inertes codex/claude présents ; leur résolution et leur marqueur ont été vérifiés en shell. Aucun broker, Electron, fournisseur ou service réel démarré. Display et SHA exacts du candidat attendus avant toute ouverture.

À l'ouverture normale (sans argument studio), refaire le préflight dans le terminal principal visible : `command -v codex; codex --version; command -v claude; claude --version`. Photographier la preuve ; arrêter si les chemins ne sont pas ceux des stubs. Toutes les commandes restent synthétiques. Une réponse de stub qui sort avec 78 prouve l'inertie, jamais un succès IA.

## Données synthétiques préparées

`fixtures/scenarios.json` décrit trois projets génériques et les intentions de workflows. Il ne s'agit ni de fichiers d'état du moteur ni d'un import déjà effectué. `fixtures/NOTE-SYNTHETIQUE.md` fournit du texte local sans client ni secret. Les créations testées se feront par les gestes visibles. Si de la volumétrie est nécessaire pour l'Activité, seule l'API Engine validée pourra la produire après inventaire et déclaration des commandes ; les parcours de création, lancement, discussion et décision ne seront pas remplacés par cette API.

## Quatre parcours

1. **Première conception au clavier, projet unique.** Dans l'Activité identifier où commencer, ouvrir le catalogue puis créer un workflow « Relecture du guide ». Dessiner préparation → relecture → validation ; sélectionner le bloc et lire son inspecteur. Naviguer Tab/Shift+Tab, activer Entrée/Espace, fermer avec Échap. Examiner visibilité du focus, ordre de lecture, labels, tailles, alignements et actions accessibles sans souris. Passer par une modal de création/paramétrage. Attendu : action courante et destination restent compréhensibles sur chaque vue.
2. **Discussion et attente humaine.** Depuis l'éditeur lancer le workflow dans le terminal principal, lire la sortie synthétique du stub puis saisir un message local. Suivre l'exécution et ouvrir une demande de décision ou validation si l'interface permet de la créer. Examiner le repérage visuel de l'attente, sa distinction de l'erreur du stub et la possibilité réelle de revenir à l'éditeur. Attendu : question, réponse attendue, auteur/contexte et action se lisent sans reconstituer plusieurs panneaux. Aucun succès fournisseur simulé.
3. **Travail transversal, labels longs et densité.** Ajouter « Site de la médiathèque » et « Documentation partagée », puis explorer Activité, catalogue et sélection de projet. Utiliser un workflow au nom long et des descriptions multiligne. Examiner sidebar, troncatures, hiérarchie typographique, densité des cartes et rattachement mono/cross-projet. Relever si cette capacité n'est pas proposée. Attendu : un titre long et plusieurs projets ne masquent ni le contexte ni les actions.
4. **Reprise dans l'espace réduit.** Revenir à une exécution et à un bloc sélectionné, passer en clair/sombre, viewport 1440 puis 1024, puis zoom Electron 125 %. Ouvrir modal et inspecteur dans cette configuration ; parcourir au clavier les actions principales et terminal. Vérifier les débordements, scrolls, contenu caché, contrastes et focus. Attendu : titres, statut, champs et bouton principal sont lisibles et atteignables ; fermeture/restauration du focus cohérentes.

## Captures et mesures prévues

Budget 12–18 captures utiles, cible 16 : préflight terminal ; Activité clair et sombre ; catalogue ; modal création ; éditeur sans puis avec inspecteur ; focus clavier ; exécution ; terminal/discussion ; décision/validation si atteignable ; cross-projet ; viewport 1024 clair/sombre ; zoom125 éditeur ; zoom125 modal. Ajuster les captures aux états réellement atteints, sans fabriquer de preuve.

Chaque capture sera inspectée comme image. Les mesures DOM servent ensuite à objectiver une observation visible : rectangles x/y/w/h, police et taille, interligne, espacement, couleurs calculées, rapport de contraste relatif sur zone opaque. Les textes superposés et transparences seront vérifiés sur pixels si nécessaire. Focus : capture, élément réellement actif et mouvement observé par Tab. Reachability : geste, scroll/panneau requis et résultat, pas existence d'un sélecteur. Le contraste est un diagnostic ciblé, pas une certification WCAG.

## Réception

Rapport : maximum cinq constats majeurs, priorisés ; geste, attendu/observé, mesure et capture, effet utilisateur, correction simple. Donner les parcours non joués et limites (stubs, données synthétiques, capacités inatteignables). Décrire aussi les comportements qui ont permis de conclure sans inventer de défaut. Fermer uniquement l'application et brokers du banc via harness ; conserver Xvfb. Revérifier les SHA en fin et consigner les preuves. Aucun source produit, build, commit ou fullsuite modifié/exécuté.

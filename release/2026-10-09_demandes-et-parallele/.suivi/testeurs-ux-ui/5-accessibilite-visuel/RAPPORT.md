# Réception indépendante — visuel et accessibilité

9 octobre 2026, candidat 0.6.0-rc.12. Observation GUI indépendante : aucun code produit ni avis voisin consulté avant les observations. Trois constats principaux ; aucune certification générale d'accessibilité.

## Constats priorisés

### 1. P1 — En espace réduit, l'inspecteur devient une fenêtre de lecture très étroite

**Geste.** Créer « Relecture du guide », sélectionner « Préparer le texte », réduire la fenêtre à 1024×800, zoom Electron 125 %, parcourir les champs au clavier jusqu'à « Appliquer au bloc ».

**Attendu.** Pouvoir modifier le nom, la consigne et les critères en conservant un aperçu utile des autres champs et de l'action d'application.

**Observé.** L'inspecteur passe sous le graphe. Le haut de l'écran conserve contexte, titre, révision, aide, onglets, puis deux lignes d'outils. Le graphe et sa barre de zoom occupent encore une section séparée. L'inspecteur ne montre qu'une tranche ; les scrolls de l'espace principal, du graphe et de l'inspecteur se cumulent.

**Mesure/preuve.** Viewport CSS819×640 (1024×800 physique / 1,25). Inspecteur x176 y504,6, largeur631,2, hauteur151,1 CSS ; clientHeight150 pour scrollHeight1190, soit environ13 % du contenu à la fois. Espace principal clientHeight589 pour scrollHeight605. [Capture13](captures/ux5-accessibilite-visuel-13-editeur-clair-1024-zoom125.png), [capture15](captures/ux5-accessibilite-visuel-15-focus-inspecteur-zoom125.png), `inspector-geometry-zoom125.json`. Le bouton « Appliquer au bloc » reste atteignable après12 Tab depuis Nom du bloc : capture15 et `focus-inspector-zoom125.json`. Il s'agit d'une gêne de conception importante, pas d'un blocage total.

**Effet utilisateur.** Lire et modifier une étape demande de petits déplacements successifs dans plusieurs zones ; la personne perd la vue d'ensemble de son formulaire.

**Correction simple.** À ce seuil compact, ouvrir les propriétés dans un panneau occupant toute la hauteur utile, avec retour explicite au graphe et action Appliquer fixe. Replier l'aide et les outils secondaires pour rendre de la hauteur au travail courant.

### 2. P2 — Le graphe démarre avec des textes effectivement inférieurs à la taille de lecture du reste de l'application

**Geste.** Créer un workflow simple, ouvrir son éditeur sans modifier le zoom du graphe, puis lire les cartes et sélectionner une étape.

**Attendu.** Les titres et les informations qui servent à dessiner le workflow restent lisibles à la première ouverture, sans devoir découvrir le contrôle de zoom.

**Observé.** À1440×1000 et zoom Electron100 %, les cartes sont petites au milieu d'un vaste canevas. Le titre, le type et les informations d'entrée/sortie sont sensiblement plus fins que les champs de l'inspecteur. Le type « Tâche » est en outre répété deux fois sur la même carte.

**Mesure/preuve.** Zoom du graphe80 % par défaut, transform `matrix(0.8,0,0,0.8,0,0)`. Carte192×91,2 px. Titre CSS13px →10,4px effectivement affichés ; métadonnées CSS11px →8,8px. Inspecteur non transformé. [Capture04](captures/ux5-accessibilite-visuel-04-editeur-clair.png), [capture11](captures/ux5-accessibilite-visuel-11-editeur-sombre.png), `node-typography.json`, `graph-transforms.json`.

**Effet utilisateur.** Le contenu métier à dessiner est plus difficile à lire que les commandes qui l'entourent ; une action supplémentaire de zoom est nécessaire dès un workflow de deux étapes.

**Correction simple.** Démarrer à100 % lorsque le graphe contient peu de blocs ; conserver des métadonnées effectives d'au moins12px et supprimer le type répété. Ajuster peut réduire l'échelle lorsque la volumétrie l'exige.

### 3. P2 — Les noms de projet tronqués ne disposent pas de révélation visuelle

**Geste.** Créer trois projets synthétiques puis, à1024 et zoom125 %, retrouver « Documentation partagée » dans la sidebar et le survoler.

**Attendu.** Identifier le projet complet avant de changer de contexte, même lorsque la sidebar compacte son nom.

**Observé.** « Documentation part... » et « Site de la médiathèq... » apparaissent alors que ce sont des noms usuels relativement courts. Survol800ms : aucun nom complet ni tooltip visible. Le nom accessible du bouton reste intégral, ce qui préserve l'identification par les outils d'accessibilité.

**Mesure/preuve.** Bouton largeur159,2 CSS ; zone texte133,6px. « Documentation partagée » scrollWidth145 pour clientWidth134. Aucun attribut title sur le bouton ou le texte ; aucun tooltip visible relevé après le survol. [Capture13](captures/ux5-accessibilite-visuel-13-editeur-clair-1024-zoom125.png), [capture16](captures/ux5-accessibilite-visuel-16-activite-sombre-zoom125.png), `layout-terminal-zoom125.json`, `sidebar-hover.json`.

**Effet utilisateur.** La navigation entre plusieurs projets requiert d'ouvrir une destination pour vérifier son nom ; des projets partageant le même préfixe seraient difficiles à distinguer visuellement.

**Correction simple.** Révéler le nom complet au survol et au focus, ou autoriser deux lignes à cette largeur. Conserver le nom accessible complet.

## Parcours réellement joués

| Parcours | Résultat observé et limites |
|---|---|
| Première conception | Workflow global créé par la modal ; tâche renommée et consigne renseignée ; question ajoutée et reliée à la tâche ; sauvegarde révision2. Variante de deux blocs, pas le circuit à trois blocs envisagé. Catalogue workflows et catalogue de types d'étape observés. |
| Terminal et suivi | Préflight visible avant tout workflow : deux chemins stubs et marqueurs INERT. Lancement par « Lancer dans le terminal », arrêt Codex inerte, sortie visible. Message printf local saisi et restitué. Suivi conversation ouvert puis retrouvé depuis Activité. Aucune tâche créée par un modèle, donc question humaine en exécution et décision finale non reçues. |
| Transversal | Trois dépôts Git fictifs sans commit/remote ; projets créés par modal après substitution autorisée du résultat de sélection du dossier. Modal de lancement avec « Inclure d'autres projets » dépliée et trois choix visibles. Sélection/lancement cross-projet non reçus ; nom de workflow long prévu non testé. |
| Espace réduit et clavier | Clair/sombre observés à1440 et1024 ; zoom125 réel à1024, CSS819×640. Inspecteur, modal lancement avec projets, Activité et terminal observés. Boucle Tab correcte dans modal ajout ; Échap ferme les modales. Focus inspecteur suivi jusqu'à Appliquer. Pas de lecture exhaustive au lecteur d'écran ni vérification de toutes les vues Paramètres/Connexions. |

18 images ouvertes et examinées : captures01–17 et une capture écran native. Les captures de page ont parfois été reprises après stabilisation des traitements asynchrones, sans créer d'états artificiels. Aucun peuplement d'exécution par API Engine, aucune modification d'état SQLite/JSON.

## Comportements utiles constatés

La hiérarchie de l'accueil et du catalogue est claire à1440 ; les blocs et onglets emploient les mêmes familles de caractères visibles. La modal de création et la modal d'ajout de bloc gardent les actions principales visibles. Dans l'ajout de bloc, Tab parcourt Fermer → Type → Nom → Ajouter, puis boucle ; focus3px visible. Àzoom125, Appliquer reste accessible, focus calculé2,4 CSSpx (3px physiques). Le terminal se dispose automatiquement au-dessus du suivi à petite largeur ; les commandes courantes restent visibles.

Contraste ciblé de la carte sombre : texte secondaire rgb163/166/176 sur rgb21/22/26 =7,44:1 ; titre =14,89:1. Ces deux paires opaques ne montrent pas de défaut de contraste textuel. Ces mesures n'évaluent ni tous les composants ni toute la conformité WCAG. Les faibles séparateurs visuels et les contrôles désactivés n'ont pas été transformés en défaut textuel.

## Incident d'environnement et reprise déclarée

Avant tout reload, la séquence suivante a eu lieu : Projets → Nouveau projet → tentative de saisie racine refusée car readonly → Choisir… → focus natif « Choisir le dossier du projet » → Ctrl+L, chemin fictif, Return → Alt+O → capture écran entière. [native-chooser.png](native-chooser.png) montre une boîte « Odoo Tricorder » avec `ERR_FAILED (-2) loading 'tricorder://app/'`. Son origine n'est pas établie ; ce message peut provenir du chargement initial et n'est pas classé comme défaut du sélecteur.

Après Return puis Échap, la fenêtre initiale reste visible ; les clics Workflows ne changent pas la page. Aucun pageerror ; une seule BrowserWindow visible sur tricorder://app/. Une reprise par page.reload après signalement a rétabli la navigation. Ensuite, seul `dialog.showOpenDialog` a retourné le chemin synthétique autorisé ; le geste Choisir et le geste Créer ont été conservés. La sélection native n'est donc pas reçue par cet audit. Aucun autre essai natif répété après diagnostic.

## Isolation et intégrité

Préparation conservée dans `ux5-accessibilite-visuel-preparation.json`, lancement dans `ux5-accessibilite-visuel-execution.json`. Fournisseurs inertes, HOME/XDG/CODEX_HOME/CLAUDE_CONFIG_DIR/état/runtime temporaires. Aucun client, compte, secret ou service réel. Les50 empreintes backend correspondent au paquet figé (`backend-preflight.json`). Aucun source produit, build, commit ou fullsuite modifié/exécuté. Contrôle et nettoyage final consignés dans `final-integrity.json`.

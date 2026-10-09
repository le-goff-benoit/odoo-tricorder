# Corrections du panel — graphes

Périmètre : avis 2-support, 4-analyste, 3-projets. Les captures Support 04 et Analyste 06 ont été ouvertes et inspectées avant modification. Aucun moteur, fournisseur, projet réel ou état d’exécution modifié. Aucun build effectué par cet intervenant.

## Changement

- Suivi : cartes d’au moins 240 px, hauteur naturelle mesurée, état et ports sur des lignes distinctes. Le titre reste entier. Les rangs DAG réservent des bandes pour les libellés ; les liens sautant un rang passent hors des cartes. Les entrées d’une jonction ont des pistes séparées ; les branches distinctes partagent une bande quand leurs libellés ne se touchent pas.
- Éditeur : « Réorganiser le graphe » est une action explicite dans le pied du graphe. Elle dispose les alternatives dans la même colonne, puis les jonctions après leurs prérequis. Elle garde 100 %, alimente l’historique Annuler/Rétablir et change uniquement les positions. Ouvrir le workflow conserve le dessin enregistré.
- Un lien du dessin est accessible par son tracé ou son libellé, au clic comme avec Entrée/Espace. Son dialogue expose origine, destination, condition et données, puis le chemin de correction : retirer avec confirmation et recréer via « Relier ». La suppression reste annulable. Les liens anciens passant derrière une carte intermédiaire la contournent à l’affichage.

## Vérification unitaire

Commande : `node --test tests/execution-layout.test.cjs tests/panel-graph-layout.test.cjs`.

Résultat : 6 tests réussis. Les quatre nouveaux cas couvrent les collisions labels/cartes et labels/labels sur Support, le non-croisement des cartes par les tracés, l’immuabilité des contrats et positions sources, alternatives/jonction en DAG, un lien passant derrière un bloc du dessin initial, libellés longs et brouillon malformé inspectable. Les deux tests préexistants de suivi restent verts. Syntaxe de `src/studio.js` et du nouveau spec GUI vérifiée.

## GUI reçu

Après construction commune par le responsable, commande `DISPLAY=:181 XAUTHORITY=/tmp/tricorder-functional-display/auth-181 ./node_modules/.bin/playwright test tests/panel-graph-layout.spec.cjs --output=/tmp/tricorder-panel-graph-final-results --workers=1` : **2 tests réussis, 13,4 s**, une fenêtre et zéro erreur renderer dans chaque scène.

1. Éditeur : dessin initial conservé ; organisation à 100 % avec normale/urgente en parallèle ; Annuler/Rétablir ; enregistrement et réouverture ; contrats inchangés ; clic sur le libellé et Entrée sur le lien ; retrait avec confirmation ; annulation du retrait.
2. Support : terminal partagé à 1440 × 1000, état « Dans la conversation » et ports contenus dans la carte ; 7 libellés sans collision ; contrôle à 1024 × 800 ; zoom 100 % ; workflow enregistré et demandes inchangés.

HOME/XDG/état/runtime/configurations isolés ; PATH strict stubs codex/claude puis `/usr/bin:/bin`. Précontrôle dans le terminal réel, versions `TRICORDER-PANEL-INERT-GRAPH`. Aucune CLI réelle ni appel de fournisseur. `workflow.save` et `conversation.open` préparent seulement des fixtures via le moteur validé. Electron fermé, brokers nettoyés, HOME temporaire supprimé par le test.

Trois captures finales ouvertes et inspectées individuellement : [éditeur à 100 %](captures/editor-branches-readable-100.png), [suivi et pied de carte](captures/support-terminal-upper-1440.png), [branches et rejoins](captures/support-joins-1440.png). Les quatre blocs de l’éditeur sont visibles ensemble à 100 %. Le grand suivi Support conserve son défilement pour lire les trois branches.

Une première capture de contrôle a révélé un tracé SVG peint au-dessus d’un libellé déjà présent : [avant correction d’ordre SVG](captures/avant-ordre-svg-support.png). La correction peint tous les tracés avant tous les libellés et garde les cibles de clic au-dessus. Le test contrôle cet ordre. Un premier échec du spec éditeur provenait d’une absence d’attente après navigation ; l’attente sur la première carte a été ajoutée avant mesure. Ces deux observations et leurs reprises sont distinctes d’un échec du résultat final.

[verification.json](verification.json) conserve commandes, empreintes du bundle commun et bilan.

## Fichiers possédés

`src/execution-layout.mjs`, `src/design-layout.mjs`, portions diagramme de `src/studio.js`, CSS graphes de `src/studio.css` et `src/studio-execution.css`, `tests/panel-graph-layout.test.cjs`, `tests/panel-graph-layout.spec.cjs`, présent dossier de preuves. Les autres modifications simultanées appartiennent aux autres intervenants.

## Limites

Les grands graphes se parcourent par défilement à 100 %. Cette correction n’ajoute ni moteur de graphes généraliste ni édition directe des champs d’un lien. Les tests qualifient le rendu et les gestes de conception sur fixtures ; aucun traitement IA ou résultat métier réel n’est qualifié.

# Réception terminal et interactions — panel utilisateur final

Lot reçu sur le build commun du parent, démarrage Electron normal, DISPLAY 182. Les contrôles couvrent les frictions des profils 1, 3, 5, 7 et 9. Aucun commit, build ou installer produit par ce lot.

## Changements reçus

- Le choix explicite Terminal visible/masqué persiste dans Connexions, Activité, les projets, la demande et le retour à l’éditeur. Un lancement explicite peut ouvrir le terminal. Aucun PTY supprimé par navigation.
- Les onglets ont une largeur bornée, défilent et ramènent la sélection à portée. Le nom complet est disponible dans le nom accessible, le title et la zone de contexte au focus. Les six sessions distinctes sont prouvées. Un nom complet déjà connu n’est plus remplacé par son extrait lors du polling.
- Le contexte interprojet expose « Shell : Atelier Azur » et « Demande affichée : Laboratoire Corail ». Il précise que le projet correspond à l’ouverture du shell, et que le dossier courant peut changer. Changer l’IA des prochains lancements conserve le terminal existant.
- Décision et réception disposent d’un pied fixe contenant demande, portée de proposition/tentative et actions. La question de décision précède le contenu long ; les en-têtes redondants disparaissent en faible hauteur. Le commentaire reste accessible dans le contenu défilant, avec son brouillon conservé lors des détours.
- La soumission capture run/bloc/proposition/nonce au premier geste et se verrouille immédiatement. Deux gestes immédiats produisent une seule décision, sans accord sur la deuxième demande.
- Avec critères, « Commentaire de validation (obligatoire) » annonce le contrôle HTML existant. Entrée vide conserve returned et place le focus sur la note requise ; avec note, la réception devient accepted. Cette reproduction établit la cause de la friction 9 ; aucun contournement du contrôle n’a été ajouté.
- « Reprendre l’agent… » demeure distinct de « Reprendre la demande ». La modale expose conservation du travail, contexte projet, maintien des suspensions/dépendances et avertissement d’effacement de la ligne de saisie. Les détails de session fournisseur sont secondaires.
- Une décision/question/réception disponible prime sur la reprise de l’agent dans le bandeau. Le lancement avec demande déjà saisie affiche un accusé pendant l’écran transitoire et ne redemande pas le texte.
- La provenance conserve les identifiants de navigation mais affiche les titres des blocs sources et les libellés Compte rendu, Actions et Transcription.

## Vérification et preuves

`tests/panel-interaction.spec.cjs` : **4/4 verts (20,1 s)** sur le build commun corrigé. Renforcement ensuite du seul test d’accumulation : quatre conversations supplémentaires synthétiques, lancements par GUI, **6 terminaux distincts**, **1/1 vert (9,4 s)**. Aucun changement produit entre ces deux passages. Le bouton Nouveau terminal réutilisait un shell : le premier essai à deux sessions n’est donc pas utilisé comme preuve de six onglets.

1. [Terminal et contexte](terminal-context-compact.png), [identités avant/après](terminal-preservation.json) : visibilité true/false, navigation, même PID/session/projet et variable shell `PANEL_CONTEXT=conserve` ; fournisseur des prochains lancements changé vers Claude.
2. [Décision longue](long-proposal-fixed-actions.png), [commentaire conservé](decision-comment-preserved.png), [accord ciblé](targeted-decision.json) : pied visible à 1024×800/125 %, brouillon retrouvé, événement décision unique, autre demande toujours waiting.
3. [Réception clavier sombre](receipt-required-keyboard.png), [état reçu](keyboard-receipt.json) : contrôle required natif puis réception enregistrée avec sa note.
4. [Six onglets et nom complet](long-tabs-complete-name-keyboard.png), [six identités](six-terminals.json), [accusé transitoire](initial-request-acknowledgement.json).

Les cinq captures finales ont été ouvertes et inspectées. Le texte long demeure défilant ; le pied et les champs conservent une surface lisible. La validation détaillée et les empreintes sont dans [validation.json](validation.json).

Premier passage : la GUI a révélé une déclaration de variable placée dans la mauvaise fonction pour l’accusé transitoire, corrigée avant build commun suivant. Un autre échec venait d’un clic de test redondant sur Examiner alors que le détail avait été conservé ; le test vérifie désormais ce détail conservé. Les résultats finaux ci-dessus portent sur le code corrigé.

## Limites et nettoyage

Fixtures synthétiques construites uniquement par les commandes publiques Engine/Conversations, sans retouche SQLite/JSON. Les décisions et réceptions reçues passent par les contrôles GUI et le canal humain existant. Le test de double geste emploie deux clics DOM natifs immédiats sur le bouton pour éprouver son verrou avant retour IPC ; aucun accord moteur injecté.

HOME, XDG, états, runtime et configurations des fournisseurs sont temporaires. PATH strict `stubs:/usr/bin:/bin`, environnement allowlist, stubs Codex/Claude inertes qui terminent avec 78. Précontrôle exécuté dans xterm avant tout lancement. Aucune CLI réelle, compte, clé, client ou service externe sollicité. Ces preuves qualifient l’interface et les transitions moteur, pas un travail IA réel.

Le focus après ajout de bloc est pris en charge par le lot configuration ; aucun double changement de cette action. Fermeture Electron, arrêt du seul broker de fixture et suppression des répertoires temporaires exécutés en afterEach ; [cleanup.json](cleanup.json) constate zéro processus restant du banc.

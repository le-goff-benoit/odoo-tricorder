# Avis indépendant 2/5 — intention, terminal et résultat métier

Testeur : consultant fonctionnel / business analyst, métier 8/10, technique 3/10. Test du 9 octobre 2026. Aucun autre nouveau rapport lu avant les constats. Aucun correctif produit.

## Conclusion

Les cinq parcours sont utilisables avec un fournisseur local déterministe. L’application permet un projet générique, plusieurs besoins dans une conversation, une précision imprévue, une relecture de meeting et une reprise du même terminal après redémarrage. Les demandes documentaires parcourues n’ont pas été présentées comme une modification de code. Le terminal et le suivi concordent après actualisation des états.

L’expérience de retour dans l’application reste confuse : l’entrée normale annonce faussement qu’aucun projet n’existe. Un lancement a aussi affiché une exception technique, avec conversation opérationnelle ; la même action répétée n’a pas reproduit l’exception. Les preuves sont lisibles mais anonymes, et certaines données métier apparaissent en JSON brut. Avis : réception fonctionnelle avec réserves, sans qualification d’un fournisseur réel.

## Environnement et méthode

- Paquet Linux `0.6.0-rc.12`, lancé sans flag de vue ; SHA256 ASAR vérifié : `10b5f192d643fc9f33cffdf3f238bcd24cbf4f69dc5ba77bab7be92cff253237`.
- Affichage `:182`, XAUTHORITY fourni par responsable, viewport explicite 1440 × 1000.
- HOME, XDG, état, runtime et binaires Codex/Claude isolés dans `/tmp/tricorder-functional-intention-state-gR4f0r`. Les stubs existaient avant la première ouverture de PTY. Les terminaux affichent « CONSULTANT FICTIF LOCAL ».
- Projet Atlas créé par les boutons de l’application. Tous les modèles ont été choisis dans les menus visibles. Aucun workflow fabriqué via API pour contourner l’interface ; aucune transition SQLite/JSON forcée.
- Faux fournisseur : `/tmp/tricorder-functional-intention-agent.py`. Harness : `/tmp/tricorder-functional-intention-harness.cjs`. Actions du consultant fictif par pont validé : status, add, ready, claim, ask, answer, artifact et result. Pas de dispatch : ce rapport ne qualifie pas le parallélisme.
- État final extrait en lecture après les constats : [etat-final-lecture.json](etat-final-lecture.json). Sessions lues via API : [avant](sessions-avant-redemarrage.json), [après](sessions-apres-redemarrage.json). Journal du fournisseur : [fixture-events.jsonl](fixture-events.jsonl).
- Aucun email distant, client réel, secret, modèle commercial, publication, installation ou production. Aucun build ou suite globale lancé.

## Parcours exécutés

### P1 — email fictif vers plusieurs demandes

Objectif : retrouver l’email de Camille « Préparation du lancement Atlas », puis préparer FAQ, diagnostic planning et compte rendu.

Étapes : entrée normale → Projets → Nouveau projet « Atlas — équipe métier » → Nouvelle demande → modèle « Release — demandes, plan, réalisation et validation » → continuer → champ initial vide → Lancer dans le terminal → saisir « Cherche l’email de Camille intitulé Préparation du lancement Atlas du 9 octobre, puis prépare plusieurs demandes et leur plan. »

Attendu : plusieurs besoins identifiables, sources et plan conservés, prochaine action lisible, pas de code imposé aux documents.

Observé : trois cartes FAQ / support / réunion dans une seule conversation. Le support demande une précision, les autres besoins avancent indépendamment jusqu’à validation du plan. Le plan apparaît dans les entrées de la décision « Valider le plan ». Aucun bloc n’exige de diff ou de correction de code. Preuves : [trois demandes](06-email-trois-demandes.png), [plan FAQ](07-faq-detail.png).

La première version du faux fournisseur annonçait la source déterministe et enregistrait ses références textuelles ; cela ne prouvait pas sa lecture effective ni sa consultation graphique. Une seconde conversation, obtenue par réutilisation du modèle visible « Demande ponctuelle », a lu et parsé le .eml local, enregistré les événements mail.search/mail.read, créé les trois besoins et joint original + plan aux résultats. Le lecteur de preuves ouvre intégralement l’original et le plan : [original](30-original-email.png), [plan](31-plan-preuve.png), [original conservé](source-originale.eml), [plan conservé](plan-fictif.md).

Limite : la décomposition et la recherche sont déterministes dans le stub ; ce n’est pas une qualification de compréhension libre, de recherche mail réelle ou d’adaptateur commercial. Pièces jointes, ambiguity, absence d’accès et dédoublonnage par clé source non testés.

### P2 — support et précision imprévue

Objectif : diagnostiquer le planning vide et préparer une réponse client, avec un détail découvert après démarrage.

Étapes : ouvrir la carte « Support Atlas » de P1 → voir la question « quel navigateur et quels autres collègues voient le planning vide ? » → répondre dans le terminal « Léa utilise Firefox ; Camille voit aussi le planning vide dans Chrome. » → consulter le bloc d’analyse validé.

Attendu : la réponse complète la même demande et débloque l’analyse ; les autres demandes restent disponibles.

Observé : question visible dans le panneau avec possibilité de répondre ici ou au terminal. Le terminal accuse réception et le bloc avance. La question et la réponse restent dans `clarifications`, sans quatrième demande. Preuves : [question](08-support-question.png), [réponse](09-support-reponse.png), [historique](10-support-question-historique.png), état final. Succès de conservation et de portée de la clarification. La cause réelle et la qualité d’une réponse client ne sont pas qualifiées par ce simulateur.

### P3 — meeting vers compte rendu, actions et brouillon

Objectif : « Réunion Atlas : Camille valide une FAQ vendredi ; Léa vérifie le planning mardi ; le budget est à confirmer. Prépare compte rendu, actions et brouillon d’email sans envoyer. »

Étapes : projet → Nouvelle demande → « Clôture de meeting » → champ initial rempli → Lancer → Relire le compte rendu → Approuver la suite → ouvrir le bloc « Préparer l’email de suivi » → consulter sa preuve.

Observé : une seule demande initiale. Les trois étapes sont Vérifier le meeting et son transcript, Relire le compte rendu, Préparer l’email de suivi. Responsables et échéances restent dans les actions ; budget à confirmer préservé ; décision humaine visible avant l’email. Le brouillon est consultable en texte et l’exécution se termine. Aucun bloc de code ni envoi effectué. Preuves : [champ initial](11-meeting-champ-initial.png), [relecture](14-meeting-validation.png), [brouillon](16-meeting-email-preuve.png), [preuve ouverte](17-meeting-preuve-ouverte.png).

Contrôle positif : une première tentative du stub a posé une question support à tort et remis les actions comme string plutôt qu’array. Le produit a refusé la sortie et affiché la raison + reprise. C’est une erreur de fixture, pas un défaut métier du produit. Le stub a été corrigé, puis un nouveau parcours GUI a réussi avec une liste d’actions typée. [Échec du stub correctement rendu](13-meeting-relecture.png). Cette première tentative reste volontairement dans l’historique.

### P4 — champ initial et terminal direct

Objectif identique : « Préparer une FAQ Atlas pour les nouveaux clients, avec les trois questions les plus fréquentes. »

A : Nouvelle demande → Demande ponctuelle → champ initial rempli → Lancer. Le terminal constate exactement une demande initiale, puis le workflow atteint « Examiner le résultat ».

B : projet → workflow Demande ponctuelle → Exécuter… → champ vide → Lancer → saisir l’objectif au terminal. Le terminal constate zéro demande initiale ; une seule demande est créée après saisie et atteint la même décision. Le panneau vide indique où écrire et présente les étapes futures. Aucun pack Odoo demandé, aucun ID saisi par l’utilisateur. Preuves : [A](21-demande-initiale.png), [B avant](22-terminal-sans-intention.png), [B après](23-demande-directe-terminal.png).

Réserve : exception query-null observée une fois, détaillée F2. Le contenu du stub est un plan générique : la qualité d’une FAQ effectivement rédigée n’est pas qualifiée.

### P5 — retrouver et reprendre la conversation

Étapes : quitter vers Activité → sélectionner Support Atlas → revenir au projet et consulter ses entrées → fermer l’application → relancer le même paquet sans flag → Activité → sélectionner Support Atlas.

Attendu : intention, question/réponse, prochaine action et terminal identiques.

Observé : Activité ouvre la bonne demande et retrouve le terminal P1 avec toute sa conversation. Après arrêt/relaunch, même décision « Valider le plan ». Les six sessions ont conservé leur ID, PID et état vivant ; aucune nouvelle session créée par la reprise. Preuves : [Activité](18-activite.png), [reprise](19-reprise-activite-support.png), [projet](20-projet-reprise.png), [après redémarrage](27-reprise-support-redemarrage.png), deux fichiers sessions. Le projet permet aussi « Consulter » une demande nommée. Réserves d’entrée normale et de libellés : F1/F4.

## Constats à corriger

### F1 — majeur UX : entrée normale faussement vide

Objectif : revenir au travail existant.

Attendu : un écran cohérent avec les projets génériques et conversations déjà créés.

Observé : après redémarrage normal, « Aucun projet », « Choisissez le dossier des projets dans Paramètres » et aucun accès rapide Atlas, malgré le projet et les demandes conservés. Le clic Activité révèle ensuite toutes les demandes et rétablit l’accès rapide Atlas. [Avant](25-redemarrage-entree-normale.png), [après un clic Activité](26-redemarrage-activite.png). Le même type d’écran était visible au premier lancement : [entrée](01-entree-normale.png).

Reproduction : créer un projet générique et une conversation via Projets ; fermer l’application ; relancer normalement. Confusion produit : apparence de perte du travail ou de configuration absente, sans perte réelle constatée. Recommandation : entrée normale sur la même activité générique, catalogue partagé dès démarrage, état vide seulement après vérification du bon catalogue. À automatiser : démarrage normal après projet générique et demande persistée, titre/accès rapide/activité cohérents sans clic de récupération.

### F2 — moyen, bug intermittent : exception query-null au lancement

Objectif : réutiliser un workflow existant et commencer au terminal.

Étapes de l’occurrence : après une Demande ponctuelle avec champ initial, cliquer Atlas → article Demande ponctuelle → Exécuter… → champ initial vide → Lancer dans le terminal.

Observé : bandeau rouge « Cannot read properties of null (reading 'query') » au-dessus d’un panneau « Prêt pour votre demande » fonctionnel. [Occurrence](22-terminal-sans-intention.png). La saisie terminal fonctionne et produit une demande atteignant la décision ; bandeau absent ensuite. [Impact après saisie](23-demande-directe-terminal.png). Même séquence répétée immédiatement : pas de bandeau. [Contre-épreuve](24-reproduction-bandeau.png).

Aucun ID/API employé pour ce lancement. Défaut UI avéré dans l’occurrence, fréquence et cause non établies. Recommandation : protéger les transitions pendant lesquelles le formulaire de recherche n’existe plus, remplacer les erreurs internes par un retour compréhensible si nécessaire. À automatiser : répétitions ciblées projet → exécution depuis article → conversation vide, avec assertion absence d’exception et saisie opérationnelle ; couvrir la navigation après formulaire d’activité/projet.

### F3 — moyen UX : sources et livrables anonymes

Objectif : distinguer l’email d’origine, le plan et le livrable sans ouvrir chaque pièce au hasard.

Observé : même bloc avec trois preuves, boutons seulement « Consulter la preuve 1 », « 2 », « 3 ». Le dialogue s’appelle toujours « Contenu de la preuve ». Les contenus sont correctement consultables, mais aucun nom/type/rôle dans le choix. [Boutons](32-preuves-anonymes-visibles.png), [email](30-original-email.png), [plan](31-plan-preuve.png).

Après observation, le contrat du pont a été lu : artifact n’accepte qu’un path et conserve les octets via engine.artifact ; aucune métadonnée de nom n’est transmise par ce contrat. La fixture a réellement joint les trois fichiers ; la confusion ne vient pas d’une absence de pièces jointes.

Recommandation : conserver et afficher nom, type et rôle source/plan/livrable, avec un titre de lecteur correspondant. À automatiser : deux preuves textuelles différentes et un .eml, libellés uniques lisibles et bonne pièce ouverte.

### F4 — mineur UX : reprises de conversations homonymes

Objectif : choisir le bon meeting à reprendre depuis le projet.

Observé : dans « Reprendre le travail », deux boutons « Clôture de meeting — 1 demandes — Ouvrir le suivi et le terminal » sans intention, date ni état. Un meeting avait échoué, l’autre était terminé. La table plus bas montre les états et dates ; elle fournit un chemin de récupération. [Projet](20-projet-reprise.png).

Recommandation : afficher intention courte, date et prochaine action/état dans ces boutons. Éviter aussi le singulier « 1 demandes ». À automatiser : deux conversations du même modèle dans un projet, identification sans dépendre de leur ordre ; ne pas confondre bouton de reprise et catalogue de modèles.

### F5 — mineur UX : données métier exposées en JSON

Objectif : relire les actions d’un meeting et l’historique d’une précision.

Observé : actions avec clés anglaises action/due/owner, braces et crochets ; clarification avec answer/question en JSON. Les faits restent lisibles, mais un BA doit traduire des structures internes. [Meeting](14-meeting-validation.png), [clarification](10-support-question-historique.png). « Décision humaine : approve » apparaît également après validation.

Recommandation : tableau action/responsable/échéance et historique question/réponse en français ; laisser les données brutes dans un détail technique facultatif. À automatiser : actions structurées et clarification rendues en phrases/tableau, cohérence des états approuvé/refusé.

## Réussites et non testé

Réussites : projet et modèles génériques accessibles ; aucun pack métier obligatoire ; intention initiale et terminal direct ; trois besoins dans une même conversation ; question imprévue scoped ; décisions humaines restent humaines ; original et plan consultables ; typage invalide refusé ; faux succès technique explicitement distingué d’une validation métier ; reprise durable des sessions et du suivi.

Non testé : réel fournisseur IA, qualité sémantique d’une FAQ/diagnostic, mail commercial, pièces et ambiguity, déduplication source après nouvelle recherche, callbacks externes, parallélisme et workers, paiement/production/Odoo, notification ou publication. Les adaptations de modèle restent choisies par le testeur ; ce rapport ne démontre pas qu’un agent choisit seul le bon workflow selon une intention libre.

Nettoyage : application isolée fermée, ses six sessions et son broker `/tmp/tricorder-functional-intention-state-gR4f0r/runtime/pty.sock` arrêtés avec le helper dédié. L’affichage X partagé fourni par le responsable a été conservé. État synthétique gardé pour reproduction ; preuves déjà copiées dans ce dossier.

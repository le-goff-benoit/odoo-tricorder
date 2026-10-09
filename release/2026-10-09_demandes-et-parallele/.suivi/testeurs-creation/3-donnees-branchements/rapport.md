# Recette indépendante 3 — données et branchements

**Verdict : conception et sauvegarde utilisables ; aiguillage métier et simulation typée non reçus.** Deux défauts fonctionnels forts empêchent de prouver le traitement critique/normal. La reprise de conception fonctionne après l'erreur.

Profil : analyste processus métier 9/10, technique 4/10. Essais GUI du 9 octobre 2026, environ 22:01–22:13 Europe/Zurich. Quatre workflows neufs créés dans l'interface normale du paquet 0.6.0-rc.12, sans argument `--workflow-studio`, sans import ni précréation API. Aucun autre rapport ni code produit consulté avant les observations. Diagnostic final limité au code **empaqueté** et aux fichiers générés par nos gestes GUI, en lecture seule.

## Banc et preuve

- Display : `:183`, XAUTHORITY dédié. HOME/XDG/CODEX_HOME/CLAUDE_CONFIG_DIR/état/runtime temporaires sous `/tmp/tricorder-creation3-donnees-OeZr93`.
- PATH fixe, stubs `codex` et `claude` préinstallés avant broker. `command -v` et les versions contrôlés dans le terminal GUI : chemins des stubs et marqueur `TRICORDER-CREATION3-DONNEES-STUB` visibles ([01](captures/01-terminal-isolement.png)).
- Exécutable SHA256 : `9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3`.
- ASAR SHA256 : `0ddb18c66b49d3c0713c0292a997897bef144da03a7407516d14e922c4b4807a`.
- 13 captures conservées et réellement regardées : les 12 prévues, plus une capture nécessaire pour distinguer la bannière fonctionnelle de l'exception native. La capture 11 native est conservée intégralement, malgré son cadrage X11.
- Aucun fournisseur, compte, service métier, secret, trousseau ou client réel qualifié. Aucun code produit, build, commit, suite globale ou état moteur forcé.

## Parcours 1 — informations typées

**Attendu :** référence et description texte, critique booléen, diagnostic avec synthèse texte, réponse avec référence/synthèse ; conservation après réouverture.

**Action :** création « Demande client — données » ; la palette n'a pas de blocs dédiés entrée/sortie. Adaptation avec deux Tâches « Demande reçue », « Diagnostic » et un Document « Réponse client ». Déclaration des types via « Ajouter une entrée/sortie », puis associations description→description, référence→référence et synthèse→synthèse par « Relier ». Le transfert de référence a été complété au contrôle final avec une seconde connexion par paire de blocs.

**Observé :** Texte et Oui / Non sont compréhensibles. Trois entrées et trois sorties sur Demande reçue ; deux entrées/deux sorties Diagnostic ; deux entrées Document. Révision 3 et quatre liens conservés après sortie vers le catalogue puis réouverture. Le graphe trace cependant une seule ligne par paire : quatre liens sont annoncés, deux lignes superposées visibles.

**Verdict :** reçu pour configuration et persistance, sans preuve d'exécution métier. Gravité fonctionnelle : aucune perte observée. Friction moyenne : quatre connexions pour transmettre deux champs entre deux étapes, avec données peu lisibles sur le graphe. Preuves : [02](captures/02-entrees-sorties-typees.png), [03](captures/03-graphe-donnees-rouvert.png), inventaire en lecture seule dans `diagnostic-check.txt`.

**Reproduction :** workflow vide → renommer la première Tâche → Ajouter une entrée/sortie → Texte ou Oui / Non → ajouter Diagnostic/Document → Relier et choisir un champ → Enregistrer → catalogue → Ouvrir le workflow.

## Parcours 2 — critique/normal et jonction

**Attendu :** critique vrai emprunte une branche unique critique ; critique faux une branche normale ; les deux rejoignent une réponse commune.

**Action :** création indépendante « Demande client — priorités » ; sept blocs, sept liens. Condition « Priorité », paramètre `critique`, entrée Oui / Non, issues saisies `true` / `false`. La sortie booléenne du Diagnostic est associée à cette entrée. Deux Tâches aboutissent au bloc Réunir « Réponse commune », puis au Document. Sauvegarde, « Options → Recharger et valider », réouverture, consultation des deux branches et des issues proposées dans Relier.

**Observé :** dessin et jonction acceptés ; libellés true/false restent enregistrés. « Recharger et valider » crée une nouvelle révision. La condition offre seulement « Paramètre » et « Issues », sans règle booléenne ni explication de conversion. La preuve GUI montre un dessin, pas une branche effectivement exécutée.

**Diagnostic après essais : défaut C3-02 confirmé.** Les issues sont obligatoirement des chaînes (`contracts.py:117`), tandis que `engine.py:326` et `validate_result` comparent la valeur reçue directement aux issues. Un booléen vrai correctement typé est rejeté par le contrat de résultat malgré une validation du graphe réussie. Contrôle pur sur le workflow créé GUI dans `diagnostic-check.txt` ; aucune exécution ni donnée forcée.

**Verdict :** reçu pour construction/persistance ; non reçu pour le besoin booléen métier. **Gravité forte, bug de validation/configuration** : l'analyste peut sauvegarder une configuration que ses valeurs déclarées ne peuvent emprunter. Preuves : [04](captures/04-condition-critique.png), [05](captures/05-branches-jonction-validation.png), diagnostic paquet.

**Prochaine action :** proposer une condition « critique est Oui » avec issues métier ; à défaut refuser dès la configuration une donnée booléenne comparée à des issues texte et expliquer la solution.

## Parcours 3 — chemin incomplet, refus et réparation

**Attendu :** retrouver un chemin sans réponse, refuser un cycle, corriger et conserver la correction.

**Action :** nouveau « Demande client — contrôle », cinq blocs. Branche normale laissée sans lien de sortie, branche critique reliée au Document. Enregistrer puis Recharger et valider. Tentative Document « Réponse client » → « Demande reçue ». Fermeture du dialogue après refus ; connexion normale→Réponse client, sauvegarde/validation/réouverture.

**Observé :** chemin normal incomplet accepté avec « Fichier validé et nouvelle révision chargée. Les exécutions existantes sont inchangées. ». Aucun message sur l'absence de réponse sur ce chemin. Le cycle est refusé immédiatement, sans ajout : « Cycle interdit : utiliser une reprise bornée du bloc concerné ». Correction normale→Document enregistrée, cinq liens conservés en révision 5.

**Verdict :** cycle et correction reçus ; avertissement métier de chemin incomplet absent. **Gravité moyenne, limite fonctionnelle/UX C3-03**, pas un bug structurel démontré : un bloc terminal peut être intentionnel et la palette ne distingue pas une sortie finale obligatoire. Aucun message d'erreur métier inventé. Preuves : [06](captures/06-chemin-incomplet-valide.png), [07](captures/07-retour-cycle-refuse.png), [08](captures/08-reparation-rouverte.png).

**Prochaine action :** permettre de désigner un résultat final attendu ; annoncer les chemins qui ne l'atteignent pas. Pour le cycle, ajouter un lien direct vers la configuration de reprise bornée.

## Parcours 4 — simulation et reprise

**Attendu :** injecter DEMO-004, problème portail, critique vrai ; suivre branche/jonction/réponse ; revenir et renommer ; tester faux si possible.

**Action :** nouveau « Demande client — simulation », sept blocs/sept liens ; entrées/sorties initiales texte/texte/booléen, synthèse Diagnostic, condition et jonction. « Exécuter… » propose une demande libre, aucun formulaire pour les ports métier. Saisie prose de DEMO-004 et critique vrai, puis « Simuler le parcours ». Examen du premier résultat, commentaire indiquant explicitement simulation sans validation métier réelle, « Valider le résultat ».

**Observé :** simulation arrêtée au premier bloc à valider, 0/7. Résumé d'exemple et avertissement « Preuve simulée, sans valeur de test métier réel. ». La validation échoue : **« Sortie critique absente ou incompatible avec le type boolean »**. Le journal montre seulement Exécution commencée, Prêt, En cours, À valider pour Demande reçue. Pas de donnée métier présentée ni de sortie client obtenue.

**Diagnostic C3-01 confirmé :** `runtime.py:319` fournit `outputs = node.get("sample_outputs", {})`. Nos blocs créés GUI n'ont pas de `sample_outputs`. `contracts.py:35` exige leurs sorties typées à la réception. Toutes les sorties déclarées sont donc absentes ; l'erreur boolean ne signifie pas qu'un faux booléen a réellement été injecté. Le contrôle pur reproduit aussi l'absence de la sortie référence. L'éditeur de blocs ne présente pas de saisie d'exemples ; le champ demande du lancement est transmis comme paramètre `request`, sans transformer la prose en valeurs des ports.

**Reprise :** sans redémarrer l'application, retour via « Options → Revenir à l'éditeur ». Noms, trois types initiaux, paramètre critique, issues true/false et sept liens conservés. Renommage du Document en « Réponse client finale », sauvegarde révision 3. Une seconde simulation a été lancée avec prose DEMO-005 / critique faux ; elle présente à nouveau le premier résultat d'exemple à valider. La validation n'a pas été répétée pour provoquer le défaut déjà prouvé. Retour éditeur : le nom final reste conservé.

**Verdict :** reprise reçue ; **simulation de sorties typées bloquée, gravité forte, bug C3-01**. Les branches critique/normal, leur jonction à l'exécution et la sortie métier sont **non jouées**, pas réussies. La seconde demande libre n'est pas une preuve d'injection de faux. Preuves : [09](captures/09-lancement-simulation.png), [10](captures/10-simulation-resultat-exemple.png), [11b](captures/11b-sortie-boolean-incompatible.png), [12](captures/12-retour-editeur-nom-conserve.png), `observations-journal.txt`.

**Prochaine action :** offrir des exemples typés dans la simulation, expliciter la distinction demande libre/ports et afficher les valeurs simulées ; préserver les avertissements actuels sur leur absence de valeur métier réelle.

## Exception native EPIPE — C3-04

**Observation réelle, preuve conservée :** après Valider le résultat, une fenêtre « A JavaScript error occurred in the main process » bloque les requêtes d'automatisation. `Uncaught Exception: Error: write EPIPE`, stack `afterWriteDispatched → writeGeneric → Socket._writeGeneric → Socket._write → writeOrBuffer → _write → Writable.write → [kWriteToConsole] → console.error → replyWithError (node:electron/js2c/browser_init:2:123375)`. Capture native [11](captures/11-validation-ecran-natif.png), puis OK natif et reprise de la même application.

**Contexte causal à distinguer :** le premier lancement était détenu par le kernel Node REPL ; deux timeouts antérieurs sur des sélecteurs avaient réinitialisé ce kernel, et la session a été reprise par CDP sans redémarrer l'application. Les descripteurs stdout/stderr de ce processus sont des sockets Playwright. Un lecteur fermé par le banc est une hypothèse forte pour EPIPE. La stack est celle du logger de rejet IPC Electron ; elle ne montre pas l'écriture vers Python. Le `backend-request.cjs` empaqueté protège déjà `child.stdin.on('error')`. Aucun garde `process.stderr/stdout` ou exception EPIPE n'a été trouvé dans les points Electron extraits.

**Verdict : fragilité produit de remontée d'erreur observée, déclencheur du banc probable ; gravité forte quand elle survient.** L'erreur fonctionnelle de contrat devient une exception native bloquante. L'apparition en usage utilisateur ordinaire n'est pas reproduite par cette campagne ; ne pas assimiler automatiquement cette stack au correctif de stdin Python ni conclure « limite du banc seulement ». Aucune redémarrage destiné à masquer la panne, aucun patch appliqué.

**Prochaine action :** vérifier la robustesse des rejets IPC quand les journaux stdout/stderr n'ont plus de lecteur, puis rapprocher cette stack du signalement réel de l'utilisateur.

## Simplifications proposées

1. Un formulaire de simulation construit à partir des entrées déclarées, avec booléens Oui/Non et valeurs de sortie d'exemple consultables.
2. Une règle de condition métier guidée et une validation de compatibilité valeur/issue avant sauvegarde.
3. Un seul lien par paire d'étapes avec une liste visible des champs transmis ; actuellement les connexions de données se superposent.
4. Une sortie métier finale explicite et un contrôle de couverture des chemins.
5. Renommer « Connexions de cette étape » en « Outils et plugins » pour distinguer services et liens ; placer les échanges de données à portée du bloc.
6. Déplier les réglages utiles sans obliger à passer des types Oui/Non à des mots techniques `boolean`, `parameter`, `true/false` et JSON.

## Clôture du banc

Voir `execution-manifest.json` et `verification-finale.json` pour les SHA finaux, les PIDs et le nettoyage des seuls processus détenus par cette campagne. Le Xserver partagé reste ouvert. Les workflows synthétiques sont conservés comme preuve dans l'état temporaire ; aucun état client n'est concerné.

# Panel indépendant — développeur senior sceptique

**Verdict : essai acceptable pour une procédure partagée ; pas encore mon outil quotidien de contrôle local.** Le produit réalise vraiment un workflow sans IA. La valeur ajoutée est la réception explicite, la décision séparée, les tentatives et le dossier de preuves exportable. Pour une commande de dev habituelle, les chemins vers ces capacités restent plus compliqués qu’un script et Git ; certaines formulations cachent ce que fait réellement une action.

Aucun P1 confirmé. Deux parcours métier, puis une reproduction ciblée sur un état vierge des ambiguïtés observées. Aucun fournisseur, compte, dépôt réel ou service externe utilisé. Paquet demandé `build-artifacts/linux-unpacked/odoo-tricorder`, 0.6.0-rc.13, sans rebuild. Dépôt produit et tests existants lus seulement ; tout le banc appartient à `/tmp/tricorder-personas-produit/03-sceptique/`.

## Persona et critères d’adoption

Je veux conserver Git, une commande que je peux relancer, un shell normal et la maîtrise du moment d’exécution. Je ne veux pas définir un agent pour lancer Python. Mes critères :

- Créer/configurer par l’interface une vraie commande locale, la relire et la versionner : **réussi**.
- Lancer sans fournisseur ni profil IA : **réussi**, mais option repliée et discours orienté agent.
- Distinguer dessin, révision exécutée, simulation et preuve réelle : **réussi**.
- Voir immédiatement la cause d’un échec, et connaître avant clic l’action exacte de reprise : **insuffisant**.
- Comprendre le dossier courant du terminal et conserver sa session : **session réussie ; contexte initial ambigu**.
- Relier une preuve de test aux sources Git exactes : **non démontré par l’export testé** ; condition d’adoption pour une procédure de release.

## Parcours 1 — procédure locale, Git et vrai résultat

1. README consulté. Dans l’interface : Projets → Nouveau projet → dépôt Git existant. Dépôt synthétique initialisé sans réseau.
2. Workflows → Modèles → **Commande locale avec validation** → Utiliser → **Revue locale reproductible**, enregistré dans le projet **Contrôles sans IA**.
3. Dans Propriétés, remplacé l’argv par `python3` puis `/project/check.py`. Script : lecture de `/project/expected.txt`, impression d’une valeur et d’un marqueur, assertion `OK`, sortie `CONTROL_PASS`. Critère métier déclaré ; validation manuelle ; deux tentatives maximum. Aucun bloc IA.
4. Enregistré, examiné Éditeur → Fichier JSON du workflow. Le fichier est dans `.tricorder/workflows/`. Git reste manuel. Commit local `208c67e`.
5. Exécuter… → déplier **Exécution automatique sans conversation** → **Lancer l’exécution réelle**. Vrai code 0, `CHECK_VALUE=OK`, `CONTROL_PASS`. Preuve lue dans le lecteur local. Coché le critère et consigné une réception ; décision humaine suivante approuvée avec commentaire.
6. Voir les résultats → rapport complet → Exporter le rapport dans le projet. Export `repo/work/controle-ok/` : README, `.suivi/workflow.json`, `.suivi/execution.json`, `.suivi/events.json`, preuve par SHA-256. Ces fichiers sont vraiment versionnables.
7. Réouvert le workflow depuis Mes workflows, changé seulement le titre du bloc, enregistré révision 3 ; commit `0a0f54b` incluant le dossier de résultat. Réouverture confirme révision 3 ; première exécution reste figée à la révision 2.

Référence réelle terminée : `rc6ed1dd8809e45e6`. Preuve réelle : `6646a745d1b020a4adf74a2305d4ac1e2f1d4f19fc452ccf3f0bfcabd8f8aede`.

Captures : [modèles](captures/01-modeles.png), [chemin JSON](captures/02-definition-json.png), [lancement réel](captures/03-lancement-reel.png), [preuve réelle](captures/04-preuve-commande.png), [résultat reçu](captures/05-resultat-valide.png), [export](captures/07-export-dialog.png).

## Parcours 2 — simulation, échec, shell et reprise

1. Modifié le fichier synthétique racine pour contenir `BAD`. Lancé **Simuler le parcours**. Il propose un résultat fictif sans exécuter l’assertion ; marquages **Simulation**, **SIMULATION** et **Preuve simulée, sans valeur de test métier réel** explicites. C’est bien un test du parcours, pas du projet.
2. Revenu à l’éditeur, lancé une nouvelle exécution réelle de la révision 3. Code 1, décision bloquée, tentative 1/2. La cause visible est uniquement « Commande terminée avec le code 1. Résultat à examiner. »
3. La traceback existe : ouvrir **Entrées, résultat technique et historique**, puis **Preuve 1**. Elle contient `CHECK_VALUE=BAD` et `AssertionError: expected.txt doit contenir OK`.
4. Terminal → Ouvrir un terminal. Aucun agent. `pwd` révèle `repo/.tricorder`. Le contexte repliable affiche le projet `repo`. Première commande de réparation relative écrit donc dans `.tricorder/expected.txt` ; erreur du testeur conservée, elle montre le coût de cette ambiguïté.
5. **Préparer la reprise** → commentaire → **Préparer cette étape pour reprise**. Aucun bouton de lancement supplémentaire : la commande part immédiatement, échoue à nouveau et consomme la tentative 2. L’historique garde tentative 1, preuve et motif. Budget épuisé : nouvelle demande proposée, sans écrasement des résultats.
6. Dans le même shell : `cd ..`, réparation du vrai `expected.txt`, retrait du fichier synthétique mal placé. Nouvelle demande → exécution réelle sans conversation. Code 0, réception et décision, terminée. Le shell et son historique restent les mêmes durant ces navigations.

Références : simulation `r2b6b0adab01f4a13` ; échec réel `re18c85faf8ad4881` ; nouvelle exécution réussie `r3485e66f95d242fe`. Vérifications moteur en lecture : [failure-engine.json](failure-engine.json), [corrected-engine.json](corrected-engine.json), [runs.json](runs.json).

Captures : [simulation](captures/08-simulation.png), [échec initial](captures/09-echec.png), [détail](captures/10-diagnostic-detail.png), [traceback](captures/11-erreur-preuve.png), [shell](captures/12-terminal-correction.png), [reprise consommée et contexte](captures/13-reprise-preparee.png), [historique](captures/14-tentatives.png), [nouveau succès](captures/15-reparation-reussie.png).

## Constats reproduits

### P2 — « préparer » consomme immédiatement une tentative de commande

**Reproduction :** commande locale échouée en mode automatique → Préparer la reprise → remplir Correction attendue → Préparer cette étape pour reprise. La tentative 2 démarre immédiatement. Le dialogue dit « Cette action prépare le bloc ; elle ne démarre pas l’agent. Le suivi indiquera ensuite comment poursuivre. » C’est littéralement vrai concernant l’absence d’agent, mais cela ne décrit pas l’exécution immédiate d’une commande.

**Impact :** je pense réserver une reprise après correction ; je consomme mon dernier essai avant de comprendre qu’il a été lancé. Il s’agit ici d’une commande isolée en lecture seule, pas d’un effet destructif ; pas de P1.

**Attendu :** en mode automatique, annoncer la commande, le périmètre, le budget et **Relancer maintenant** ; ou réellement séparer préparation et lancement. La distinction préparation/démarrage d’agent ne suffit pas pour un bloc Commande.

**Contre-vérification fraîche :** script [reproduce.cjs](reproduce.cjs), exécuté avec succès sur un nouveau dépôt/état synthétique, commande `raise SystemExit(7)`. Tentative 1 puis 2 sans aucun autre lancement. [Dialogue](captures/17-dialogue-preparation.png), [tentative consommée](captures/18-reprise-automatique.png), [références moteur](replay-runs.json). La première exécution du script a buté sur l’inspecteur replié ; ajout du clic visible « Examiner l’échec », puis succès. Aucun correctif produit.

### P2 — shell du projet ouvert dans `.tricorder/`, contexte montrant la racine

**Reproduction :** depuis le suivi d’un workflow du dépôt, Terminal → Ouvrir un terminal → `pwd`. Résultat `repo/.tricorder`. Déplier Contexte : « Shell du projet », puis chemin `repo` et indication que le dossier courant peut changer. Le shell vient pourtant d’être créé dans le sous-dossier.

**Impact :** mes commandes relatives de dev travaillent au mauvais niveau. L’effet a été concret dans ce banc : réparation du mauvais fichier puis reprise encore en échec. Le prompt permet de le voir, mais je ne devrais pas devoir contredire le contexte produit dès l’ouverture.

**Attendu :** shell créé depuis une exécution dans la racine du dépôt ; un terminal de conception peut rester dans `.tricorder/`, avec titre **Terminal de définition** et chemin exact de départ.

**Preuves :** [13](captures/13-reprise-preparee.png). Reproduit sur état vierge : [19](captures/19-terminal-cwd-reproduit.png), assertion `pwd` dans le script réussi.

### P2 — le diagnostic utile est caché derrière la preuve

**Reproduction :** une commande imprime un diagnostic puis sort à 7 ; suivi d’échec et panneau principal montrent seulement le code de sortie. Ouvrir les détails techniques montre un bouton de preuve ; seule l’ouverture du lecteur affiche la cause. Dans l’essai métier, assertion et traceback accessibles au même endroit.

**Impact :** le panneau qui doit guider ma réparation ne montre pas ce qui a échoué. Je peux préparer/rejouer avant d’avoir lu le diagnostic. « Résultat à examiner » est une description générique, pas une cause.

**Attendu :** afficher dès le panneau d’échec la fin de sortie/traceback et un bouton de copie ; conserver le lecteur pour la preuve complète. Montrer l’argv et les deux flux explicitement aiderait aussi le diagnostic.

**Preuves :** [09](captures/09-echec.png), [11](captures/11-erreur-preuve.png) ; script réussi vérifie l’absence du marqueur `EXPLICIT_FAILURE_DIAGNOSTIC` dans l’inspecteur avant lecture de preuve.

### P3 — parcours sans IA possible mais présenté comme une conversation IA

**Reproduction :** modèle 2 blocs Commande/Décision, Exécuter… ; action dominante **Lancer dans le terminal**, texte « expliquer à l’agent … OpenAI · Codex » ; vrai lancement sans IA sous une section repliée. Après budget épuisé, Nouvelle demande répète « Vous donnerez votre demande à l’agent dans le terminal ».

**Impact :** la capacité que je cherche existe, mais l’interface me donne d’abord l’impression que l’agent est obligatoire. README suit la même séquence conversationnelle.

**Attendu :** détecter les workflows sans IA et présenter **Lancer les commandes locales** comme action principale ; texte adapté aux exécutants réellement présents. Décrire un exemple complet sans IA dans README.

**Preuve :** [16](captures/16-lancement-sans-ia.png), modèle configuré uniquement Commande + Décision.

### P3 — diff Git bruyant au premier réenregistrement après réouverture

**Reproduction :** révision 2 commitée ; réouverture ; changement du seul titre du bloc ; sauvegarde. Les clés de presque tous les objets JSON sont réordonnées, avec révision 3. `git diff` montre 31 suppressions et remplacements en plus du titre.

**Impact :** lecture de revue plus lente, évolution sémantique noyée. Aucun changement de comportement involontaire observé.

**Attendu :** sérialisation stable dès la création comme aux sauvegardes suivantes. Preuve : commits du dépôt synthétique `208c67e..0a0f54b`.

## Ce qui est réellement auditable

Accessible par interface et export : définition exécutée figée, argv, contrat, numéro de tentative, code de sortie, timestamps, texte de preuve par SHA-256, critères reçus, commentaire, acteur `local-user`, décision/commentaire, événements. La preuve brute mélange stdout/stderr ; on n’a pas un affichage séparé des flux. L’ancienne révision reste intacte après modification du modèle. Rien n’a été commit/push automatiquement.

Écritures locales moins visibles : création de `.tricorder/AGENTS.md` avec consignes de conception, en plus du workflow ; création d’état SQLite/local et de preuves pendant l’exécution ; exports seulement après action explicite. Les consignes sont limitées à `.tricorder/`. Pas de véritable agent lancé dans ces essais ; les CLI possibles étaient des substituts inertes sous un PATH temporaire.

**Limite pour mon métier :** dans l’export testé, aucune référence de commit Git, état sale ou empreinte des fichiers `check.py`/`expected.txt`. Le SHA de contrat identifie la définition, pas le contenu du dépôt soumis au contrôle. Le workflow enregistré donne l’argv, mais ne suffit pas à reconstituer les sources testées. Git peut conserver ces fichiers manuellement ; Tricorder n’a pas démontré un lien natif entre cette version de sources et ce résultat.

Lecture du code utilisée pour comprendre les menus/API et vérifier les champs exportés ; aucune capacité absente de l’interface n’a été présentée comme acquise. Le script de contre-vérification crée/configure/lance par UI ; l’API sert uniquement à lire les références de runs. Aucun rapport d’autre panel consulté.

## Valeur au-delà d’un script + Git et décision personnelle

Pour moi seul, ce parcours ajoute plusieurs clics pour recevoir une sortie déjà lisible dans mon terminal. Les modèles nombreux, profils IA et concepts de réception coûtent plus que `python3 check.py` + un commit. Je ne remplacerais donc pas mon terminal habituel.

Pour une équipe qui exige « contrôle exécuté, résultat lu, décision consignée, reprise justifiée », l’export lié à la version de workflow, les critères, les tentatives et les portes humaines sont une vraie valeur. Un script peut le fabriquer, mais je dois alors maintenir les formats et les transitions moi-même. L’outil mérite un essai sur une checklist de release ou une procédure de revue, sous réserve de clarifier reprises et chemins.

J’abandonnerais si une préparation continuait à lancer implicitement le travail, si les scripts/commandes exigeaient une IA, si la preuve de contrôle restait sans lien fiable aux sources, ou si Git devenait un détail que l’application réécrit à ma place. Aucun commit implicite ni agent imposé n’a été observé.

**Simplifications proposées :** adapter le lancement au type d’exécutant ; donner le diagnostic d’échec immédiatement ; nommer les terminaux d’après leur véritable usage/dossier ; texte de reprise exact en mode automatique ; JSON stable ; réduire la bibliothèque initiale à quelques catégories filtrables.

**Capacité à ajouter/qualifier :** attacher chaque commande au SHA Git et à l’état des sources effectivement lus, conserver l’empreinte ou snapshot nécessaire, puis proposer dans le rapport une commande reproductible avec son environnement. Ce serait la raison technique d’adopter l’outil pour le dev, plus que le graphe seul.

## Exécution du script et nettoyage

Commande reproductible, sans réseau :

```bash
node /tmp/tricorder-personas-produit/03-sceptique/reproduce.cjs
```

Dernier résultat : `passed: true`, banc `/tmp/tricorder-personas-produit/03-sceptique/replay-95bXrQ`, contrôles UI/échec code 7/reprise immédiate/cwd réussis. Les données et captures restent pour revue ; application initiale fermée après vérification de son environnement propre, brokers de chaque banc nettoyés par `tests/terminal-fixture.cjs cleanupBroker`. Écran :189 utilisé ; :190 préservé. Aucun correctif, rebuild, publication ou envoi.

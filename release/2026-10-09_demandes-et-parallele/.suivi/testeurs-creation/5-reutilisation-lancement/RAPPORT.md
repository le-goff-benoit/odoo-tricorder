# Recette indépendante #5 — PMO, réutilisation et lancement

Exécutée le 9 octobre 2026, de 22:15 à 22:24 Europe/Zurich (preuves UTC 20:16–20:23). Persona métier 9/10, technique 3/10. Un essai par agent : les notes de clarté/friction ne constituent pas une étude utilisateur.

**Résultat : création, configuration, sauvegarde, retrouvaille après redémarrage et partage/réimport reçus sur deux projets synthétiques. Réutilisation reçue comme copie indépendante ; adaptation complète des références métier et résultats de comité non reçus. Lancement assisté dans le terminal et suivi reçus jusqu’à l’arrêt volontaire du fournisseur inerte. Aucune réussite IA ou métier déduite de la simulation.**

## Banc et indépendance

- Entrée normale du paquet autorisé, sans `--workflow-studio`. Exécutable `/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/odoo-tricorder`, SHA256 `9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3`. ASAR `resources/app.asar`, SHA256 `0ddb18c66b49d3c0713c0292a997897bef144da03a7407516d14e922c4b4807a`. Identiques au début et après les parcours : [verification-finale.json](verification-finale.json).
- HOME/XDG/CODEX_HOME/CLAUDE_CONFIG_DIR/TRICORDER_HOME/STATE_DIR/RUNTIME_DIR synthétiques : `/tmp/tricorder-t3-pmo-G65P8c`, liste blanche du [manifest](execution-manifest.json). Display `:185`, autorisation transmise `displayReleased=true`. Engine utilisé dans son état standard ; aucun SQLite/JSON de fonctionnement modifié à la main.
- Atlas et Boreal : deux dépôts Git temporaires sans commit, contenant uniquement leur `CONTEXTE.md` de départ. Aucun projet réel, aucune clé, aucun trousseau, aucun modèle ou service réel. PATH stubs en tête avant GUI/broker.
- Les deux `command -v` et les deux marqueurs `TRICORDER-T3-PMO-STUB` ont été observés dans le terminal GUI **avant le premier lancement de workflow** (capture 04). Les versions ont aussi été vérifiées dans le shell Boreal après son lancement ; elles apparaissent dans les captures 12/13. Les stubs sont inertes et sortent avec 78 pour un appel autre que `--version`.
- Aucun rapport des autres testeurs ou code produit consulté. Gestes workflow/projet/import/export/sauvegarde/lancement/validation exclusivement GUI ; terminal par frappe clavier. Aucun workflow fixture, aucune API de workflow substituée.
- Limite native déclarée : le sélecteur système a été ouvert réellement, sans navigation dans une donnée réelle. Sa saisie automatisée a d’abord produit une erreur de chemin (`atlaskeyReturn`, faute du banc). Ensuite, avec autorisation du responsable, **seul le résultat natif de `showOpenDialog`/`showSaveDialog` a été remplacé** par le chemin synthétique exact Atlas, Boreal ou livraison. Les contrôles GUI « Choisir… », création, export et import ont continué à être utilisés normalement. La sélection native des dossiers/fichiers n’est donc pas qualifiée.
- Incident du banc : une tentative de remplir un champ readonly a dépassé le délai du contrôleur, puis son reset a fermé les lecteurs Electron. La fenêtre a été reconnectée, puis une boîte native `Error: write EPIPE` est apparue (capture 03). Le banc a été relancé avec des délais Playwright courts. Le responsable a confirmé une fragilité logger sous fermeture du lecteur dans le paquet gelé ; sa correction source n’a pas été retestée ici. Ce constat n’est pas un défaut de création démontré.
- 14 captures, toutes vues visuellement. Exception autorisée par le responsable jusqu’à 15 pour les trois captures de diagnostic initial ; aucun dépassement non autorisé. Capture 05 prise avant la fin asynchrone de sauvegarde : elle prouve les champs modifiés, **pas** l’enregistrement. Les preuves d’enregistrement sont 06 et 14.

## Parcours 1 — retrouver la routine hebdomadaire Atlas

**Point de départ :** accueil normal vide. Ajout du dépôt Atlas via « + Nouveau projet », nom Atlas, « Choisir… », puis « Créer le projet ». Ouverture du terminal Atlas et contrôle des deux fournisseurs inertes.

**Étapes jouées :** « Créer un workflow » → modèle visible « De la demande au résultat » → nom « Feu vert comité Atlas » → destination Atlas → « Créer et ouvrir le workflow ». Dans « Paramètres du workflow », description du comité hebdomadaire et référence ATLAS-COMITE-001. Dans le bloc décision : titre « Feu vert comité Atlas », critères « Dossier ATLAS-COMITE-001 présenté / Décision du comité conservée », question « Le comité Atlas donne-t-il son feu vert au dossier ATLAS-COMITE-001 ? ». Choix du modèle conservés `approve` et `reject`. « Appliquer au bloc » puis « Enregistrer ». Retour « Projets » → Atlas → « Ouvrir le workflow ». En fin de recette, fermeture normale et réouverture du même paquet/environnement, Atlas, même workflow, même bloc.

**Attendu :** retrouver par nom la routine et distinguer son fichier enregistré de son utilisation ; retrouver description, blocs et choix sans mémoriser un chemin.

**Observé :** fiche Atlas montre le nom, les six étapes et la description métier. Éditeur en « Révision 2 · Enregistré » ; six blocs/six liens, critères/question/choix conservés. Après redémarrage normal, Atlas/Boreal sont présents et la question Atlas est identique en révision 2. Le dialogue de création explique `.tricorder/workflows/`, prêt à versionner ; aucun commit automatique. Aucun lancement automatique lors de la création.

**Preuves :** [04 — terminal avant workflow](captures/04-terminal-stubs.png), [06 — retrouvé en révision 2](captures/06-atlas-retrouve.png), [14 — après redémarrage](captures/14-atlas-apres-redemarrage.png), [texte du retour GUI](retour-gui-redemarrage.txt). Capture 05 uniquement état de modification.

**Impact :** PMO retrouve la routine depuis son projet ; emplacement annoncé mais pas nécessaire pour la rouvrir. Graphe plus large que la vue, défilement requis pour les blocs de droite et les paramètres bas.

**Réception :** reçu pour création/configuration/sauvegarde/retrouvaille/persistance du workflow. Clarté 4/5, friction 2/5 (hors incident d’automatisation). Chooser natif non reçu.

## Parcours 2 — partager avec une autre PMO fictive

**Point de départ :** workflow Atlas enregistré en révision 2.

**Étapes jouées :** « Exporter… » vers livraison temporaire ; retour « Projets ». Ajout de Boreal par GUI. « Importer un workflow » avec le fichier réellement exporté, lecture du résumé et de « Examiner les étapes et leur configuration », destination choisie puis « Importer le brouillon ». Aucun destinataire contacté et aucun octet exporté modifié manuellement.

**Attendu :** identifier un objet à remettre, son usage/prérequis, importer une copie sans écraser Atlas.

**Observé :** objet produit `delivery/feu-vert-atlas.json.tricorder-workflow` (extension ajoutée automatiquement ; première tentative de chemin synthétique `.json` seule erronée, corrigée par le banc). Le dialogue d’import montre nom, six blocs/six liens, description, modèles/agents dédiés/capacités déclarés ; explique que connexions à vérifier et qu’exécutions, accords et planifications ne sont pas importés. « Examiner… » affiche la configuration JSON brute, peu accessible à un métier 9/technique 3. L’import crée une copie Boreal révision 1 portant encore le titre Atlas. Le nom n’est pas éditable dans le dialogue ; il se change ensuite par « Paramètres du workflow ».

**Preuves :** [07 — résumé et détails d’import](captures/07-import-destination-atlas.png), [08 — copie indépendante Boreal renommée](captures/08-boreal-copie-enregistree.png), fichier synthétique exporté conservé dans la livraison temporaire. La capture 07 ne montre pas le sélecteur de destination, poussé hors écran par les détails JSON : elle ne prouve pas à elle seule la valeur Atlas choisie.

**Impact :** objet portable et conséquences de l’import compréhensibles ; examiner le contenu détaillé demande une compétence technique. Renommage en seconde étape, pas pendant l’import.

**Réception :** reçu pour partage local/réimport/copie sans écrasement. Clarté 3/5, friction 2/5. Sélection native du fichier et transfert à une autre machine non joués/non reçus.

## Parcours 3 — deux projets et erreur de destination

**Point de départ :** même dialogue d’import portable, deux projets disponibles.

**Étapes jouées :** erreur volontaire : sélectionner Atlas pour une copie prévue Boreal. Corriger le sélecteur visible « Destination » vers Boreal **avant** « Importer le brouillon ». Dans la copie, changer uniquement le titre en « Feu vert comité Boreal » et la description en comité mensuel BOREAL-COMITE-002, en indiquant que la question Atlas reste à adapter ; appliquer/enregistrer révision 2. Revenir à Atlas et lire sa description hebdomadaire ATLAS-COMITE-001 intacte. Sur Atlas, « Exécuter… », demande comité Atlas puis « Simuler le parcours ». Sur Boreal, ouvrir la copie, préparer la demande Boreal et lancer dans le terminal (parcours 4).

**Attendu :** destination identifiable/corrigeable avant démarrage ; original conservé ; deux copies/utilisations reconnues avec leur contexte.

**Observé :** correction de destination possible par un seul sélecteur sans modification d’état interne. En-tête `BOREAL / WORKFLOW`, titre Boreal, révision 2. Atlas garde son titre et sa description ; sa simulation est visible dans « Reprendre le travail » avec demande Atlas, révision 2, contexte « Simulation », état « Résultat à valider ». Boreal a sa demande BOREAL-COMITE-002 et son cwd de terminal propre. La modification titre/description **ne remplace pas les références Atlas dans les blocs** : la décision de la copie reste « Feu vert comité Atlas ». Ce n’est pas une mutation inattendue ; cela limite la réutilisation métier à une copie encore à adapter.

**Preuves :** [08 — copie et bloc Atlas visible](captures/08-boreal-copie-enregistree.png), [09 — utilisation Atlas simulée](captures/09-atlas-utilisation-simulee.png), [10 — contexte Boreal préparé](captures/10-boreal-preparation-terminal.png), [11 — Boreal terminal/suivi](captures/11-boreal-terminal-arrete.png). Le avant/après destination a été joué, mais le sélecteur avant n’est pas cadré sur capture 07.

**Impact :** copies indépendantes et identité projet visibles ; PMO doit adapter manuellement chaque référence contenue dans les blocs. Il peut corriger une destination tant que l’import n’a pas été confirmé.

**Réception :** reçu pour correction avant import, indépendance et deux utilisations identifiables. Partiel pour « contextes propres » : les données de décision Boreal restent Atlas, volontairement selon la limite titre/description du plan. Clarté 3/5, friction 2/5. Aucun résultat de comité terminé reçu ; annulation après import, déplacement après démarrage et adaptation automatique non joués.

## Parcours 4 — démarrer dans le terminal et lire le suivi

**Point de départ :** copie Boreal révision 2 ; sûreté des stubs déjà vérifiée dans le terminal GUI avant tout workflow.

**Étapes jouées :** chercher dans « Options » (Phases/Recharger et valider/Planifier), puis « Outils et aide → Commandes des agents » (palette de skills Odoo ; aucune commande de lancement du workflow trouvé ici). Retour workflow → « Exécuter… » → demande BOREAL-COMITE-002 → action visible « Lancer dans le terminal », une seule fois. Lire commande affichée, cwd, marqueur et suivi. « Voir les instructions » ouvre le détail. Dans le shell Boreal rendu, recontrôler `command -v`/versions des deux stubs. Revenir à Atlas → « Reprendre le travail / Consulter » ; examiner un résultat simulé, cocher le critère, commentaire « Reçu uniquement comme simulation UI ; aucun résultat de comité réel. », puis « Valider le résultat ». Lire « Options → Journal d’exécution ».

**Attendu :** relier lancement, projet, exécution, état et prochaine action ; effectuer un geste humain proposé et retrouver sa trace.

**Observé :** l’action GUI injecte une commande `python3 …/resources/backend/agent_launch.py …/state/agent-events/05e63cd2-feb1-4edb-9a7a-bda03bcecde1.launch.json` dans le terminal Boreal. Prompt `/tmp/tricorder-t3-pmo-G65P8c/projects/boreal`, marqueur fournisseur inerte, puis shell rendu. Onglet « Codex arrêté ». Suivi de la même demande Boreal : « Aucune étape en cours · 1 demande à prendre en charge », « À poursuivre dans le terminal », 0/6. Les instructions indiquent « Cette étape utilise les outils de la conversation. Continuez dans le terminal » avec bouton « Continuer dans le terminal » ; elles n’expliquent pas l’arrêt du fournisseur dans le détail. Arrêt volontaire attendu du banc, pas résultat métier réussi.

Sur Atlas, preuve explicitement « SIMULATION » / « sans valeur de test métier réel ». Après validation GUI : première étape « Validé », 1/6, commentaire intact, deux autres blocs à valider. Journal daté « Validé · Comprendre la demande » à 22:23:01 et étapes suivantes « À valider ». Quand Atlas est affiché, le terminal Boreal conservé est indiqué « Autre conversation · boreal » ; cette distinction évite d’attribuer ce terminal à Atlas mais demande attention.

**Preuves :** [10 — action proposée](captures/10-boreal-preparation-terminal.png), [11 — lancement/arrêt/cible/suivi](captures/11-boreal-terminal-arrete.png), [12 — validation et commentaire](captures/12-atlas-reception-simulee.png), [13 — journal daté](captures/13-atlas-journal-validation.png), [texte du journal GUI](journal-gui-atlas.txt).

**Impact :** PMO peut déclencher sans inventer une commande ; destination/demande sont reconnaissables. Le terminal annonce l’arrêt, tandis que la prochaine action du suivi reste générale, donc difficile à exécuter dans ce banc. Réception humaine d’une preuve synthétique et commentaire traçables.

**Réception :** reçu pour lancement assisté GUI dans terminal, fournisseur inerte/cible reconnue, retrouvaille de la demande et validation humaine d’une seule étape simulée. Partiel pour lancement « depuis le terminal » : aucune commande autonome à copier avant lancement n’a été trouvée ; la commande affichée a été injectée par la GUI, pas saisie/rejouée manuellement. Clarté 3/5, friction 3/5. IA réelle, code de sortie affiché dans la GUI, succès de Boreal, décision finale `approve/reject`, jonction complète, bilan final et branches achevées non joués/non reçus.

## Findings et fin de banc

| Constat | Nature / effet | Preuve | Qualification |
|---|---|---|---|
| Copie Boreal conserve le bloc/question Atlas | Adaptation manuelle à prévoir pour routine métier réutilisée | 08 | Limite ergonomique constatée ; pas de remplacement automatique demandé/prouvé |
| Détails d’import en JSON brut | Difficile à examiner par PMO peu technique | 07 | Friction 3/5 de clarté |
| Codex arrêté, suivi invite à continuer dans terminal | Prochaine action insuffisamment concrète après arrêt fournisseur | 11 | Observation réelle du paquet, arrêt produit par banc inerte |
| EPIPE après reset contrôleur | Fenêtre native d’erreur technique | 03 | Fragilité observée, déclencheur banc ; correction source annoncée par responsable, non reçue ici |
| Sauvegarde, copie indépendante et validation commentée persistent | Résultat reçu dans périmètre GUI/simulation | 06, 08, 12–14 | Sans qualification métier/IA réelle |

Application fermée normalement à la fin, broker PTY propre au banc PID 1076610 arrêté ; précédent lancement abandonné PID 1073852 et PTY 1074125 arrêtés lors de la reprise. Aucun processus stub en cours. Xvfb laissé en place. Environnement synthétique et fichiers stubs inertes conservés pour traçabilité selon le protocole. Deux SHA256 revérifiés inchangés. Aucun produit/build/fullsuite/commit modifié.

Non joués : contacts externes, trousseau, projets réels, IA réelle, import sur autre poste, choix natif complet, refus de décision finale, réalisation/tests de métier, branches achevées, résultat final de comité et déplacement d’une exécution déjà démarrée. La chaîne reçue est une chaîne d’interaction GUI avec simulation et fournisseur inerte.

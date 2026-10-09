# Recette indépendante — création, agents et connexions

Testeur 4, campagne création/configuration du 9 octobre 2026. Profil joué : responsable opérations, métier 9/10, technique 3/10. Atelier Boréal est un usage inventé de location de matériel événementiel. Le testeur simule ce profil ; aucune séance avec un responsable opérations réel n’est revendiquée.

**Résultat : quatre parcours joués ; création et persistance reçues, avec assistance technique pour l’adaptateur. Aucun défaut majeur d’intégrité constaté. Deux limites importantes d’autonomie et deux frictions à simplifier.** Le résultat ne qualifie aucun fournisseur, compte ou service réel.

## Banc et preuves

- Entrée normale du paquet 0.6.0-rc.12, sans `--workflow-studio`, DISPLAY `:184` après libération explicite.
- HOME, XDG, CODEX_HOME, CLAUDE_CONFIG_DIR, état et runtime temporaires. PATH fixe, fournisseurs inertes installés avant le broker. Les chemins et marqueurs Codex/Claude ont été vérifiés dans le terminal GUI avant tout workflow : [capture 01](captures/01-preflight-terminal.png).
- Exécutable SHA256 `9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3` ; ASAR `0ddb18c66b49d3c0713c0292a997897bef144da03a7407516d14e922c4b4807a`. Vérifiés avant démarrage ; contrôle final consigné dans `VERIFICATION-FINALE.json`.
- Les quatre workflows, blocs, contrats, liens, choix IA, décisions et notifications ont été créés/configurés par gestes GUI. Aucun workflow créé par API, aucun SQLite/JSON d’état forcé.
- Fixture technique permise : catalogue `plugins.json` et adaptateur JSON stdin/stdout local inerte, [sources/plugins-boreal.json](sources/plugins-boreal.json), [adaptateur](sources/adaptateur-boreal.py). L’adaptateur ne contacte rien et ne lit aucun secret ; il renvoie une identité synthétique, les effets draft/write et notify, puis un accusé local.
- Après les premières observations seulement, lecture ciblée du **backend empaqueté** : `connectors/local_tools.py`, `tool_runtime.py`, `effects.py`, `workflow_engine/integrations.py`, `engine.py`, `conversations.py`, `notifications.py`, `runtime.py` et `workflow_cli.py`, pour le protocole des fixtures. Aucune lecture de rapports d’autres testeurs ni de code produit avant les observations.
- 13 captures examinées visuellement. La treizième distingue la décision prévue effectivement reçue de la question imprévue. Les captures P2/P3 ont été recadrées par défilement et remplacées pour rendre les champs lisibles ; les derniers changements Codex→Claude servent cette amélioration de preuve.

## P1 — workflow générique sans pack

**Attendu.** Créer un workflow, ajouter un agent, nommer sa consigne et ses données, puis les retrouver après retour dans la liste.

**Reproduction.** Activité → Créer un workflow → Workflow vide → nom « Boréal — Préparer une réponse » → Sans projet → Créer et ouvrir. Ajouter un bloc Travail · Agent « Préparer le brouillon ». Saisir la consigne, Ajouter une entrée `demande` de type Texte, Ajouter une sortie `brouillon` de type Texte. Appliquer au bloc → Enregistrer → Workflows → Ouvrir le workflow → cliquer le bloc.

**Observé.** Aucune installation de pack demandée. Révision 2 enregistrée. Consigne « Lire une demande fictive, relever matériel, quantité et dates, puis préparer une réponse à relire » et les deux ports retrouvés sans perte. L’accueil et les gestes de création sont identifiables. « Workflow vide » contient déjà une Première étape de type Tâche, ajoutée au bloc créé ensuite.

**Preuves.** [Création générique](captures/02-p1-creation-generique.png), [bloc réouvert](captures/03-p1-agent-reouvert.png), `observations.json` P1.

**Verdict.** Reçu : création et conservation de la configuration sans pack. Exécution métier non jouée, hors de ce parcours de configuration. Friction mineure : une étape supplémentaire apparaît dans le workflow dit vide et doit être configurée ou supprimée pour une exécution automatique.

## P2 — fournisseurs et rôle facultatif

**Attendu.** Choisir OpenAI, passer à Anthropic et conserver consigne/I/O ; distinguer choix IA, rôle et connexion effective.

**Reproduction.** Créer séparément « Boréal — Reformuler une réponse ». Ajouter l’agent « Reformuler la réponse », consigne « Reformuler le texte fourni en français simple, conserver quantités et dates », entrée `texte_source`, sortie `texte_reformule`. Ouvrir Agent et modèle pour cette étape → OpenAI · Codex, modèle fictif → Appliquer/Enregistrer. Changer vers Anthropic · Claude et modèle fictif → Appliquer/Enregistrer → quitter/réouvrir. Examiner Connexions et Diagnostic de connexion.

**Observé.** Fournisseur et modèle effectivement persistants. La consigne et les deux ports restent identiques à chaque changement et après réouverture. « Agent dédié (facultatif) » propose « Aucun agent dédié » et explique que la consigne du bloc suffit. Sans pack, c’est la seule option : changer un rôle spécialisé n’a donc pas été joué. L’écran Connexions donne aux CLI détectés un badge vert « Utilisable », alors que le diagnostic Codex affiche `? Connecté` et `○ Vérifié` ; le texte précise que connexion et modèle sont vérifiés au lancement.

**Preuves.** [OpenAI, rôle facultatif](captures/04-p2-openai.png), [Anthropic réouvert](captures/05-p2-anthropic-role-vide.png), [diagnostic connexion](captures/06-p2-connexions.png), `observations.json` P2.

**Verdict.** Reçu : changement IA et conservation. Non joué : passage à un rôle spécialisé absent sans pack, authentification et génération par des fournisseurs réels. Ambiguïté UX modérée : « Utilisable » peut être interprété comme une connexion vérifiée alors que le compte est inconnu.

## P3 — outil local et adaptateur de brouillon

**Attendu.** Configurer une étape locale, retrouver ses paramètres et comprendre ce qui la rend utilisable.

**Reproduction.** Créer séparément « Boréal — Brouillon local ». Ajouter Travail · Commande « Préparer un brouillon local ». Saisir le chemin temporaire `brouillon-atelier`, ajouter sortie Texte `brouillon`, enregistrer et réouvrir. Ouvrir Exécuter → Exécution automatique sans conversation. Ensuite Connexions → Configurer une connexion : lire la procédure. Préparer uniquement le catalogue/adaptateur technique inerte, puis Actualiser → Vérifier l’adaptateur → examiner la commande → Exécuter le contrôle. Retourner au workflow, ajouter une Opération externe avec capacité `boreal-local · draft`, action `draft`, cible `brouillon-local-D-102`, candidat `texte-fictif-v1` ; ajouter la Décision humaine « Autoriser le brouillon local », sélectionner cette décision, cocher la liaison et copie de l’opération exacte, enregistrer puis réouvrir.

**Observé.** Commande et port persistent. Le lancement automatique indique « Première étape : Travail de démonstration : choisir une commande ou un exécutant connecté » ; ce bloc par défaut empêche de lancer le workflow tel quel. La commande locale n’a pas été exécutée par l’UI. Le dialogue connexion annonce explicitement l’absence de formulaire OAuth et demande un catalogue préparé dans le terminal par un agent. Déclaration seule : « À configurer », transport non qualifié. Après contrôle explicite par GUI : « Utilisable », Disponible/Installé/Connecté/Vérifié. La capacité draft, la cible, le candidat, la décision et le lien sont retrouvés après réouverture.

**Preuves.** [Commande et contraintes](captures/07-p3-commande.png), [adaptateur vérifié](captures/08-p3-adaptateur-verifie.png), [draft et accord exact](captures/09-p3-draft-accord.png), `observations.json` P3 et fixtures dans `sources/`.

**Verdict.** Reçu avec fixture technique : configuration/persistance et distinction déclaré/vérifié de l’adaptateur. Refusé pour autonomie complète d’un profil technique 3/10 : créer une connexion générique impose encore terminal, JSON et adaptateur compatible ; la limite est honnêtement annoncée. Non joué : exécution de la Commande et de l’opération draft, récupération de leur résultat par GUI. Le simple enregistrement n’est pas une preuve de leur exécution.

## P4 — question imprévue, notification et validation prévue

**Attendu.** Enregistrer une validation prévue et un agent qui demande une date absente, puis répondre sans recréer le workflow. Vérifier que notification et réponse ne se confondent pas avec une autorisation.

**Reproduction.** Créer séparément « Boréal — Relire et compléter ». Ajouter Décision · Accord humain « Valider le brouillon », question « Relire quantités et dates avant validation », issues approve/reject. Ajouter l’agent « Compléter la demande D-102 », consigne de suspension si retour absent et modèle fictif. Relier agent → décision par Travail terminé. Paramètres du workflow → Quand le workflow a une question → adaptateur inerte notify → destinataire `canal-local-inerte-boreal`. Enregistrer/réouvrir ; supprimer la Première étape de démonstration par GUI.

Le texte joué est une **variante synthétique** D-102 (8 chaises le 15 octobre, retour inconnu), consignée dans [demandes-jouees.txt](sources/demandes-jouees.txt). Le fichier initial `demandes.txt` parlait de 3 tables : son libellé exact n’a pas été joué.

Exécution automatique : le stub retourne une réponse inerte incompatible avec le protocole JSON de génération, affichée « Expecting value: line 1 column 1 (char 0) ». Limite de banc, pas verdict sur un fournisseur. Lancement natif séparé depuis la GUI, demande D-102 renseignée et notifications explicitement autorisées : run prêt après arrêt du stub.

**Fixture d’événement.** Sur ce run créé par GUI, commandes validées Engine.claim puis conversations.ask injectent « Quelle est la date de retour prévue pour les 8 chaises de la demande D-102 ? ». Aucune IA n’est à l’origine de cette question. La première tentative de fixture Engine.submit sans summary a été refusée par contrat ; le claim restait valide, puis ask a été utilisé. Incident du harness, aucun état forcé.

**Observé.** Le suivi affiche « Réponse attendue » et Répondre à la question ; question exacte, Votre réponse et Répondre visibles. Réponse GUI « Retour prévu le 17 octobre à 16 h. » enregistrée ; même run, bloc prêt de nouveau, clarification conservée. Fixture de résultat local valide ensuite ce bloc techniquement ; aucune validation métier automatique revendiquée. La décision prévue devient « Décision attendue », texte de relecture conservé, boutons français « Approuver la suite » / « Refuser la suite ». Approbation GUI → demande terminée 2/2. Le run séparé de notification est également terminé, avec accusé local `boreal-local-inert` et `inert: true` ; aucun message externe envoyé.

**Preuves.** [Paramètres notification](captures/10-p4-question-notification.png), [accord configuré](captures/11-p4-validation-prevue.png), [question imprévue](captures/12-p4-question-imprevue.png), [décision prévue effective](captures/13-p4-decision-prevue.png), `question-fixture-result.json`, `question-answer-result.json`, `question-finish-result.json` et `runs-final.json`.

**Verdict.** Reçu : création, persistance, distinction question/décision, réponse GUI et accord GUI, notification locale avec accusé. Non joué : question spontanée et reprise autonome d’une IA réelle, génération d’un vrai brouillon, notification sur service externe. La fixture d’événement prouve les transitions et l’interface, pas le comportement d’un modèle.

## Frictions et propositions simples

| Référence | Type / gravité | Reproduction et conséquence métier | Proposition |
|---|---|---|---|
| UX-4-01 | UX modérée | Connexions → Codex/Claude détecté → Utilisable, avec connexion inconnue et contrôle non fait. Un responsable peut croire le compte prêt. Preuve 06. | Badge « CLI installé · compte à vérifier », puis « Connexion vérifiée » après contrôle effectif. |
| UX-4-02 | Limite d’autonomie importante, annoncée | Connexions → Configurer : terminal/catalogue JSON/adaptateur requis. Le responsable technique 3/10 ne peut pas finir seul. | Assistant local pour sélectionner l’adaptateur installé, ses opérations et le contexte ; garder le contrôle explicite. |
| UX-4-03 | UX mineure | Créer Workflow vide → Première étape Tâche, puis ajouter agent/commande → bloc de démonstration oublié ; lancement automatique refusé. | Workflow réellement vide, ou choix « remplacer la première étape » lors du premier ajout. |
| UX-4-04 | UX mineure | Inspecteur d’un agent de rédaction → QA du candidat, candidate/verdict, texte sur validation du code ; longues sections avant le fournisseur. | Replier les réglages QA/code et avancer le choix IA pour un bloc de rédaction. |

Aucun de ces constats n’est présenté comme une corruption, une perte de configuration ou un défaut majeur de sécurité. La voie technique pour les connexions est une limite de cette version, visible dans le produit.

## Limites de la réception

Les étapes de création/configuration sont reçues. L’autonomie métier complète de configuration des outils est refusée sans assistance technique. Les exécutions de la Commande et de draft restent non jouées ; aucun résultat d’outil n’est déduit de leur seul enregistrement. Les modèles utilisés portent des identifiants fictifs ; les fournisseurs inertes retournent code 78 hors --version. Les interactions humaines P4 sont des transitions réelles du moteur sur données fictives, déclenchées par fixtures validées et des gestes GUI. Aucun client, compte, trousseau, service externe, production, build, suite complète, commit ou fichier produit modifié.

Nettoyage limité aux processus/stubs de ce banc et aux connexions de contrôle du testeur ; aucun Xserver touché. Voir `VERIFICATION-FINALE.json`.

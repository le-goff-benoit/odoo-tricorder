# Review fonctionnelle indépendante — corrections de la rc.7

Date : 9 octobre 2026. Référence : `6e8a286eba6f65d7f6aa7204b18df3acbdced88f`.

**Réception des corrections testées acceptée après deux reprises.** Les huit
contre-épreuves R01–R08 sont reçues. Aucun blocage résiduel connu n’est identifié
sur ces parcours. Les compatibilités et éléments partiels A09/A11 sont précisés
dans la matrice finale ; ceci ne qualifie aucun modèle ou service réel.
L'audit initial est conservé sans modification. Cette review porte sur le diff,
les modules nouveaux, les contrats et les parcours ; elle ne reprend pas les
résultats du développeur comme preuve automatique de conformité.

## Contre-épreuves indépendantes

Les projets, fichiers, shells et preuves ci-dessous sont synthétiques et créés
dans des répertoires temporaires. Aucune session utilisateur, donnée client,
connexion de messagerie ou modèle réel n'a été utilisé.

| Réf. | Gravité | Reproduction et conséquence | Attendu |
|---|---|---|---|
| R01 | P1, A05/A06 | Un composant contient un producteur de candidat avec `application_requires: ["qa"]`. Après expansion, le bloc est `component.qa`, mais la référence reste `qa`. La vraie QA est terminée et l'application est refusée comme contrôle inconnu. | Préserver le contrat de contrôle après chaque niveau d'expansion, avec références préfixées et validation. |
| R02 | P1, A05 | Un `join` transmet simplement `candidate`. Une vraie QA du même candidat réussit ; le join est néanmoins traité comme une autre QA et bloque l'application. | Distinguer les contrôles des consommateurs et jonctions. |
| R03 | P1, A05 | Un bloc Document reçoit le candidat et rédige uniquement un changelog, avec une preuve contenant « No tests performed ». Aucun contrôle de QA n'existe. L'application humaine réussit et modifie réellement le fichier synthétique. Le consommateur et son evidence suffisent actuellement à constituer une QA implicite ; verdict absent vaut pass. | Exiger un contrat de contrôle explicite, indépendant du nom/profil du bloc, et un résultat de contrôle valide du candidat exact. Un changelog, une copie ou un résultat ordinaire ne doit pas compter comme QA. |
| R04 | P2, A08 | Deux branches : QA avec verdict fail, autre bloc en `waiting_input`. Le focus sélectionne la question mais la marque failed avec « Préparer une reprise après l’échec ». | Conserver l'indication d'échec global sans remplacer l'action « Répondre » de la question sélectionnée. |
| R05 | P2, A03 | `ready` du pont natif, 100 blocs prêts et demande de 90 Ko : 9 057 380 octets. Les mêmes paramètres sont répétés pour chaque bloc. | Pagination et paramètres partagés ou référencés ; inspect/read doivent permettre de tout lire sans ambiguïté. Les mutations et claims natifs doivent utiliser la même projection. |
| R06 | P2, A09 | Dans un PTY réel synthétique, bash exécute `read -r answer`. `idleShell` vaut true et `write-if-idle` écrit la reprise dans cette attente ; le `read` la consomme comme réponse au lieu de lancer l'agent. | Un groupe de processus shell au premier plan ne prouve pas un prompt. Vérifier un signal fiable du prompt ou refuser l'écriture automatique si ce signal est absent. |

Les résultats **avant correction** sont immuables :

- [Quatre probes moteur/transport](2026-10-09-review-corrections/probe.py), [résultats](2026-10-09-review-corrections/probe-results.json).
- [Changelog sans QA puis application réelle](2026-10-09-review-corrections/no-qa-probe.py), [résultat](2026-10-09-review-corrections/no-qa-before.json).
- [Shell dans un builtin read](2026-10-09-review-corrections/terminal-prompt-probe.py), [résultat](2026-10-09-review-corrections/terminal-prompt-before.json).

## Contrôles complémentaires exécutés

Après lecture des changements, exécution indépendante de groupes ciblés :

- `test_workflow_effects.py` : 4 tests réussis, dont perte de réponse, double appel concurrent, changement de destinataire, version Confluence et distinction publication/build/déploiement.
- `test_workflow_engine.py` : 9 tests réussis, dont claims concurrents, preuve absente/altérée, exactitude de l'opération autorisée, refus, pause et reprise bornée, immutabilité de la version exécutée et récursion de composants.
- `audit-model.test.cjs`, `provider-launch.test.cjs`, `backend-request.test.cjs` : 15 tests réussis, dont conservation effort/session, question repliée, arguments shell littéraux, EPIPE et requête trop volumineuse.

La reprise de ces tests existants complète les probes nouveaux ; leur succès ne
résout pas R01–R06. Les tests du développeur plus larges restent identifiés comme
tels dans sa remise. La review visuelle indépendante dispose de son propre
[rapport](2026-10-09-layout-ui-ux.md) et de ses captures.

## Parcours mail et portée réelle

Le point d'entrée testé est une **conversation native lancée depuis un workflow**.
La CLI reçoit alors le pont moteur et les instructions. Un shell libre ou une
ancienne conversation IA ne reçoit pas automatiquement ces consignes. La demande
naturelle de recherche de mail est exécutée par les outils réellement disponibles
à cette CLI ; Tricorder ne fournit ni authentification mail ni interprétation
sémantique supplémentaire.

La fixture CLI déterministe appelle un adaptateur de recherche/lecture, lit le
`.eml` et ses pièces, conserve leurs octets/empreintes, extrait quatre lignes de
besoins synthétiques et appelle le moteur pour enregistrer leurs instances. Elle
n'est pas un modèle. Elle prouve le protocole, la conservation, les étapes et la
reprise du parcours réussi ; les cas d'accès absent ou ambigu produisent une
question. Elle ne prouve pas qu'un modèle réel analyse correctement le mail client,
ni la configuration des comptes de l'utilisateur. Aucune release client réelle
n'a été ouverte par cette recette.

La consigne de coordination initiale, les quatre besoins client et une éventuelle
consolidation sont distincts. Le suivi affiche le graphe **de la demande
sélectionnée**, avec états des autres demandes ; il ne doit pas être présenté
comme une recette globale déjà réalisée. La consolidation doit dépendre des
contrôles requis et d'un périmètre explicitement accepté.

## Limites de réception

Pas de modèle payant, authentification OAuth, notification réelle, base Odoo,
production, Git distant ou installation utilisateur. Pas de preuve exhaustive de
sécurité, de comportement de lecteur d'écran ou de panne disque. Les axes de
sauvegarde/restauration, rétention et coût durable du polling restent séparés.

## Recontrôle après première correction

R01–R05 sont reçus sur des [probes supplémentaires indépendantes](2026-10-09-review-corrections/after-probe.py), avec [résultats après correction](2026-10-09-review-corrections/after-results.json) distincts des preuves initiales :

- Application réelle dans le projet synthétique après QA agent explicite et après une **commande isolée exécutée** qui lit la copie candidate et vérifie son contenu.
- Application après QA explicite avec join de transfert ; composant à deux niveaux dont `application_requires` pointe sur le contrôle effectivement préfixé.
- Refus avec fichier original intact : document sans QA, verdict absent, preuve absente, verdict fail, décision reject, contrôle d'un autre candidat et preuve altérée après réception.
- Question avec autre branche échouée : focus sur la question, action « Répondre à la question · échec à reprendre ».
- `ready` : 100 blocs, quatre pages, 5 048 octets maximum par page, 100 identifiants uniques ; demande de 90 Ko reconstituée exactement par `read`. Claim de 114 Ko et résultat de 1 Mo renvoyé sous une projection de 115 Ko.

R06 — builtin read — est maintenant refusé : [résultat après correction](2026-10-09-review-corrections/terminal-prompt-after.json). Deux derniers écarts de parcours ont cependant été trouvés pendant la relecture du correctif :

| Réf. | Gravité | Reproduction | Attendu |
|---|---|---|---|
| R07 | P2, A09 | Au prompt vérifié, une saisie partielle est suivie de Ctrl-A. La reprise efface seulement à gauche du curseur par Ctrl-U ; le suffixe à droite est réellement exécuté avec la commande de reprise. | Effacer toute la saisie annoncée, y compris si le curseur est au début ou au milieu, sans autoriser read/heredoc/programme. |
| R08 | P2, A05 | Le nouveau contrat QA est disponible pour un bloc Tâche/task, et son claim natif réussit. `prepare-candidate` refuse pourtant « Tentative périmée » car sa garde admet seulement agent/command. | Matérialiser le candidat pour chaque type de QA officiellement supporté, et garder le dépôt source inchangé. |

Preuves avant ces deux corrections : [probe curseur](2026-10-09-review-corrections/terminal-cursor-probe.py), [résultat](2026-10-09-review-corrections/terminal-cursor-before.json) ; [probe QA task](2026-10-09-review-corrections/task-qa-probe.py), [résultat](2026-10-09-review-corrections/task-qa-before.json).

Une campagne ciblée supplémentaire de **16 tests réussis** a été exécutée indépendamment : preuve liée et lecteur de 2,5 Mo, récupération managed/native/enfant survivant/ancienne tentative, publication dynamique, historique de 110 questions, 1 000 demandes, quatre besoins avec clarification indépendante, branches QA, refus imbriqué, conflit à trois versions, archives et précontrôles de capacités. [Journal complet](2026-10-09-review-corrections/targeted-after.log).

## Réception finale des dernières corrections

R07 est reçu : le [même probe curseur](2026-10-09-review-corrections/terminal-cursor-after.json) exécute la reprise attendue et n'exécute plus le suffixe non soumis. Le broker annule l'édition Readline puis attend une nouvelle génération de prompt avant d'écrire ; il refuse les écritures concurrentes pendant cette séquence. Un délai sans nouveau prompt ne vaut pas permission d'écrire.

R06 reste reçu après cette modification : le [probe read final](2026-10-09-review-corrections/terminal-prompt-final.json) est toujours refusé. La matrice PTY a également été exécutée indépendamment : curseur début/milieu/fin, read, heredoc, programme au premier plan, marqueurs filtrés, même PID et reconnexion préservant la sortie. [Deux tests réussis](2026-10-09-review-corrections/terminal-matrix-final.log).

R08 est reçu : [la QA Task matérialise désormais le candidat](2026-10-09-review-corrections/task-qa-after.json), avec contenu `after` dans la copie. L'opération conserve les gardes d'état running/jeton et exige la référence de candidat en entrée. Le changement de type admis ne crée ni preuve de QA ni accord humain.

## Matrice de réception A01–A12

« Reçu » désigne les corrections du constat dans le périmètre synthétique et
local annoncé. Les capacités des modèles et services externes restent hors de
cette réception, quelle que soit la ligne.

| Constat | Réception | Évidence et limite pratique |
|---|---|---|
| A01 — Résultats et décisions | Reçu | I/O, provenance et rapport lus dans le code et réception visuelle ; preuve liée à l'exécution, chemin externe refusé, lecture de 2,5 Mo sans écrire une fausse preuve. |
| A02 — Tentative interrompue | Reçu | Verrous libérés après arrêt vérifié ; processus vivant, enfant survivant, tentative native inconnue et résultat tardif éprouvés. Une ancienne tentative sans identité reste conservativement bloquée tant que l'arrêt n'est pas prouvé ; un heartbeat périmé seul ne suffit pas. |
| A03 — Historique et transport | Reçu | Lectures UI et mutations natives projetées ; 1 000 demandes, 110 questions, preuve de 2,5 Mo ; 100 blocs prêts en quatre pages et demande complète reconstituée. Pas de benchmark exhaustif CPU/mémoire ni promesse de volume illimité. |
| A04 — Publication dynamique | Reçu | Corps/candidat dynamiques liés à la décision puis transmis exactement à l'adaptateur synthétique ; double invocation sans second effet. Les cas d'accord modifié et de réponse perdue restent refusés ou incertains. Aucun compte mail/Slack qualifié. |
| A05 — QA du candidat | Reçu | Contrôle explicite configuré ; vraie commande sur copie candidate, QA agent/task, refus sans contrôle/verdict/preuve, preuve altérée, mauvais candidat et rejet ; dépôt inchangé dans les négatifs. Les anciens runs sans ce contrat ne deviennent pas rétroactivement applicables. |
| A06 — Sous-workflows | Reçu | Ports et provenance, types incompatibles, refus imbriqué ; application avec QA obligatoire dans un composant à deux niveaux. Pas de boucle générale de correction automatique ajoutée. |
| A07 — Conflits d'édition | Reçu | Fusion à trois versions, choix du même champ, recontrôle du fichier et copie de secours si JSON invalide ; brouillon UI reçu séparément. |
| A08 — Question visible | Reçu | Catalogue partagé, phase et tray, focus question malgré échec parallèle, indépendance des quatre besoins. La couleur n'est pas la seule indication. |
| A09 — Reprise agent/terminal | Partiel : sessions gérées reçues | Reprise explicite dans le même PTY Bash avec prompt vérifié ; read/heredoc/programme/suffixe refusés ou éliminés correctement. Les anciens brokers et shells sans intégration sont préservés mais ne permettent pas cette reprise automatique ; aucune qualification de reprise d'une vraie session fournisseur n'est revendiquée. |
| A10 — Modes et capacités | Reçu | Précontrôles native/automatic, fournisseur/modèle et capacités requises ; texte automatique incapable d'édition/tests refusé. Les tests utilisent les deux fournisseurs en substitution ; l'authentification et les permissions effectives du compte se vérifient à l'usage. |
| A11 — Cycle quotidien | Partiel : cycle local reçu | Annulation, archivage/restauration, historique filtré/paginé, définitions et preuves conservées ; travail actif protégé. La liste des projets n'a pas acquis sa propre recherche/pagination et le déplacement d'un dépôt n'a pas fait l'objet d'une recette de réassociation. |
| A12 — Choix IA | Reçu | Changer fournisseur/modèle conserve effort, session et autres paramètres. Le formulaire annonce que fournisseur/modèle s'appliquent à toutes les étapes IA. |

Les limites partielles sont des limites annoncées du périmètre livré ; elles ne
rendent pas faux les huit correctifs reçus. Elles doivent rester visibles dans
la documentation de livraison. En particulier, ne pas annoncer une compatibilité
automatique de tous les terminaux historiques ou une qualification réelle de
mail/Odoo à partir des seules fixtures.

La revue du layout, du formulaire QA et du cas mail illustré relève du rapport
visuel indépendant. La construction du paquet final, sa publication et
l'installation sont à contrôler par l'orchestrateur après cette réception ;
aucune de ces actions n'a été effectuée par ce reviewer.

## Dernier raccord des modèles générés et des consignes

L'orchestrateur a ensuite signalé un producteur de modèles encore incohérent :
la configuration d'un nouveau projet Odoo custom reliait `candidate` à sa QA
sans déclarer le nouveau contrat explicite. Ce complément est reçu après lecture
du diff et exécution indépendante de **trois tests réussis** :

- Nouveau projet/module et pack **fictifs** : génération du workflow, intention,
  plan, accord, candidat, QA, proposition, décision et application réelle d'un
  fichier synthétique ; les définitions existantes personnalisées et la version
  déjà exécutée restent intactes lors d'une seconde configuration.
- Les routes Studio et Online ne reçoivent pas de candidat de code ni de faux
  contrôle QA de candidat.
- Les consignes gérées passent de la révision interne 6 à 7 ; le contrat QA et
  son verdict y sont décrits. Les consignes personnalisées et le fichier
  `AGENTS.md` du projet sont préservés.

[Journal du raccord](2026-10-09-review-corrections/setup-guidance-final.log).
Ce test vérifie Tricorder avec des fichiers et un pack synthétiques, pas Odoo.
Le développeur a confirmé le gel source après ce raccord. L'[empreinte finale
réceptionnée](2026-10-09-review-corrections/source-manifest-final.json) identifie
les sources présentes ; elle ne prétend pas à une lecture exhaustive de chaque
ligne. La réception des huit contre-épreuves et les limites A09/A11 ci-dessus
restent inchangées.

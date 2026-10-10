# Panel indépendant — fondateur SaaS / services tech

Test du 10 octobre 2026 sur le paquet immutable `build-artifacts/linux-unpacked/odoo-tricorder`, version **0.6.0-rc.13** vérifiée via Electron. Aucun rebuild ou changement produit. Deux parcours client lancés depuis l’UI, avec fournisseurs locaux inertes ; un résultat de planification synthétique a été remis par l’API validée du moteur pour atteindre la validation et les tâches. Aucune implémentation cliente, IA commerciale, connexion OAuth, notification ou création de brouillon externe n’est qualifiée.

## 1. Profil, besoin et critères d’adoption

Fondateur indépendant d’un jeune SaaS et de prestations tech, technique mais pressé. Je veux transformer les demandes clients en un onboarding reproductible : objectifs, utilisateurs, données à migrer, accès et échéance ; plan revu avant travaux ; tâches et dépendances suivies ; question signalée sur Slack ; mail récapitulatif préparé sans envoi prématuré. Un projet local par client me convient.

J’adopterais si je peux créer une méthode puis l’utiliser chez le client suivant sans réinventer les consignes, retrouver les tâches bloquées immédiatement et configurer une notification sans écrire un adaptateur. La perte d’une demande est rédhibitoire. Je comprends le principe d’un modèle d’agent, mais ne veux pas devoir maîtriser les contrats `plan.tasks`, les catalogue JSON et deux systèmes de connexions pour commencer.

## 2. Parcours essayé et résultat observé

### Atlas : concevoir et lancer

1. Lecture du README et observation du premier démarrage. « Nouveau projet » crée **Client Atlas - onboarding**, un espace local avec Git initialisé, sans demande de dépôt préexistant. Réussi.
2. « Choisir un modèle » montre une bibliothèque assez riche. Je choisis **Intentions, plan et travaux** parce que sa description correspond au recueil des besoins et à un plan commun. « Personnaliser une copie… » crée **Onboarding client SaaS**, mais dans les modèles partagés : le dialogue l’annonce. Je m’étais attendu à rester chez Atlas, dont le nom figurait comme destination sur l’écran précédent.
3. Je renomme le bloc en **Recueillir les besoins client**, ajoute deux critères métier, et complète la consigne du planificateur avec cadrage, import, configuration, formation et brouillon local de mail. Enregistrement réussi, révision conservée.
4. « Exécuter… » signale le modèle IA manquant. « Choisir l’IA » → saisie explicite `modele-local-inerte` → retour au lancement conserve la demande. Le modèle étant partagé, j’annule pour employer **Options → Réutiliser…**, destination Atlas, copie **Onboarding Atlas**. Cette étape demande de comprendre modèle partagé et instance client.
5. Nouvelle demande Atlas saisie et « Lancer dans le terminal ». Le fournisseur factice quitte avec code 78 ; l’interface passe à **Agent arrêté**, conserve la demande et permet de compléter les intentions manuellement. Ce blocage est volontaire et correctement signalé.
6. Deux intentions saisies rapidement ; seule la première est conservée et confirmée. Défaut reproduit chez Boréal, décrit ci-dessous.
7. Passage explicitement assisté pour continuer l’essai de suivi : lecture du guide `docs/WORKFLOW-RUNTIME.md`, puis de `workflow_cli.py`, `engine.py`, `store.py` du **backend emballé** pour connaître le transport et le contrat de résultat. `provider-synthetique.py` emploie `Engine.claim` / `Engine.submit` uniquement pour remettre un plan factice de deux tâches, marqué synthétique. Aucun état JSON/SQLite retouché, aucun projet ou workflow créé via API, aucune décision humaine injectée.
8. Depuis le projet, « Consulter » ouvre le plan exact et ses dépendances. **Approuver la suite** dans l’UI, puis sélectionner le bloc **Pour chaque élément du plan**, puis **Lancer le traitement des éléments**. Le graphe présente deux tâches concrètes : cadrage, puis brouillon local dépendant du cadrage. Le fournisseur inerte échoue sur la première ; la seconde attend son prédécesseur. Ouvrir la tâche montre une cause intelligible et un retour au parent. Le suivi fonctionne pour cette substitution ; les travaux métier n’ont pas abouti.

### Boréal : réutiliser

1. **Client Boréal - onboarding** créé depuis Projets.
2. « Choisir un modèle » → modèle partagé **Onboarding client SaaS** → **Utiliser** → **Onboarding Boréal**, destination Boréal. Les noms, critères et consignes personnalisés sont repris ; aucune demande ni exécution Atlas n’est transférée.
3. Demande Boréal lancée avec le même fournisseur local inerte. Deux intentions rapides reproduisent la perte de la seconde. Après ressaisie et attente de son apparition dans la liste, les **deux** intentions sont confirmées ; planification prête. Arrêt à cette frontière fournisseur, sans inventer un onboarding réussi.

### Slack et mail

**Connexions** affiche Slack, Gmail et Outlook **À configurer** et précise que l’installation dans Codex est distincte. **Configurer une connexion…** explique qu’il faut un adaptateur local compatible, connecté au compte, et faire préparer `.tricorder/plugins.json` par l’agent. Il annonce expressément l’absence de formulaire OAuth.

**Paramètres du workflow → Quand le workflow a une question → Me prévenir avec** ne propose que **Dans Tricorder uniquement**. L’aide demande d’ajouter puis vérifier une opération de notification dans Connexions avant d’obtenir Slack ici. Je comprends le chemin technique ; je n’ai pas de moyen immédiat de connecter Slack dans ce premier démarrage isolé. Aucun canal réel configuré.

Le brouillon local peut être demandé dans les consignes et figurer comme tâche ; ici il reste bloqué par son prérequis. Un brouillon dans Gmail/Outlook requiert la connexion runtime distincte. Aucun brouillon réel créé ou envoi essayé.

## 3. Constats P1 / P2 / P3

### P1 — Saisie perdue pendant un ajout d’intention

**Reproduction :** recueil ouvert et vide. Saisir A, cliquer **Ajouter à la liste**, saisir B immédiatement dans le champ encore éditable, cliquer **Ajouter à la liste**. Deux parcours ont conservé seulement A. Sur Boréal, aucune confirmation n’est nécessaire pour perdre B.

**Preuve :** `recueil-rapide-log.json` : premier clic revenu à 1791626873473 ; B vérifiée dans le champ à 1791626873490 ; second clic revenu à 1791626873668 avec champ vide. `captures/27-boreal-deux-ajouts.png` puis `28-boreal-perte-stable.png/.txt` : un seul élément A, champ vide, pas d’erreur. `engine-boreal-perte.json` : une seule contribution A. La trace garde les actions et snapshots avant/après. Atlas a en plus confirmé une liste incomplète (`20-besoins-confirmes`).

**Observé / limite :** les clics Playwright reviennent avant l’accusé d’enregistrement du premier ajout ; B est bien saisie entre les deux. Le second clic est une interaction UI, sans preuve qu’une seconde requête métier ait atteint le moteur. C’est précisément la perte du contenu saisi pendant le rafraîchissement qui est confirmée ; aucune causalité code n’est prétendue.

**Attendu :** conserver B tant qu’elle n’a pas été enregistrée, ou rendre le formulaire explicitement indisponible pendant l’ajout. Interdire la confirmation avec un ajout en cours. Ne jamais effacer silencieusement une nouvelle saisie.

**Impact :** besoins client omis du plan, absence de confiance dans le recueil. Un utilisateur peut confirmer la liste en pensant avoir ajouté les deux besoins. Défaut signalé immédiatement au responsable du panel.

### P2 — Coût d’intégration Slack / brouillon externalisé vers l’utilisateur technique

**Reproduction / preuve :** Connexions → Configurer une connexion (`21-connexions`, `22-configurer-slack`), puis Paramètres workflow (`40-notifications-question`, `41-parametres-charge`). Slack non connecté, adaptateur local exigé, catalogue à préparer dans le terminal, aucun formulaire OAuth. Notification native seulement dans la liste.

**Attendu pour ce persona :** choisir Slack, connecter son compte, choisir un canal et vérifier une notification de test autorisée. Pour un mail, distinguer explicitement texte local et brouillon enregistré dans la boîte.

**Impact :** la promesse de suivi automatique ne donne pas encore un produit prêt à employer. Le coût porte sur trouver/installer/qualifier l’adaptateur, comprendre le protocole et configurer le catalogue, puis répéter ou rendre disponibles les connexions à destination. La durée n’est pas mesurée ; ce n’est pas assimilable à quelques clics. L’UI est honnête sur cette limite : capacité absente dans cette installation, pas un envoi raté.

### P2 — Première personnalisation détourne du projet client vers la bibliothèque

**Reproduction / preuve :** projet Atlas → Choisir un modèle, écran « Destination : Atlas » (`04-modeles`), puis Personnaliser une copie → dialogue impose modèles partagés (`05-personnaliser`). Exécution ultérieure cible « Bibliothèque de modèles » (`13-lancement-conserve`), puis copie supplémentaire nécessaire (`15-copier-atlas`).

**Attendu :** proposer « adapter pour Atlas » et « créer mon modèle réutilisable » avec des destinations explicites dès les boutons. Conserver le contexte client dans le parcours choisi.

**Impact :** je prends le chemin qui paraît naturel pour adapter mon onboarding, puis découvre que je dois créer une seconde copie. Pas de perte de définition ; le texte du dialogue permet de comprendre, mais ce détour consomme l’attention et augmente le risque de lancer au mauvais périmètre.

### P3 — Configuration de méthode expose trop tôt le contrat de l’agent

**Preuve / reproduction :** propriétés du planificateur (`08-plan-proprietes`) : `inputs.intentions`, `tasks`, `depends_on`, `base_from`, identifiants de projet dans la consigne. Résultat de recueil (`20-besoins-confirmes`, `29-retour-atlas`) présente `Created`, `Id`, `Texte`.

**Attendu :** une configuration guidée des informations client attendues, puis un mode avancé pour le contrat ; les métadonnées techniques repliées dans les résultats du recueil.

**Impact :** je peux modifier le texte, mais ne sais pas immédiatement quelles parties je peux simplifier sans casser la méthode. Le modèle générique reste utile à un fondateur technique ; il lui demande cependant de devenir concepteur de workflow avant de gagner du temps.

## 4. Avis critique

**Je comprends seul :** créer un projet local, lire les étapes, mettre une validation avant des travaux, voir la dépendance et l’échec d’une tâche. Réutiliser le modèle au deuxième client devient assez direct. Les libellés signalent correctement la différence entre fournisseur détecté et connecté, résultat local et service externe.

**Je me trompe :** choisir Personnaliser comme adaptation directe pour Atlas ; croire qu’un clic Ajouter signifie que le champ suivant est déjà indépendant de la réponse précédente. Je peux aussi supposer que le texte de la demande initiale constitue déjà la liste des intentions, alors que le recueil reste vide et doit être rempli par moi ou l’agent.

**Je ralentis :** identifier le bon modèle parmi des modèles génériques et spécialisés, apprendre modèle partagé/copie projet, choisir un modèle IA par texte, configurer une connexion par agent/adaptateur. Le suivi conserve une vue Détail ; après validation du plan, la prochaine action met l’accent sur l’agent arrêté et je dois sélectionner la coordination pour voir son bouton de lancement.

**J’abandonne :** aujourd’hui pour promettre à mes clients un suivi Slack opérationnel sans chantier d’intégration. Le P1 de saisie suffit aussi à reporter l’usage pour le recueil de besoins réel. Je garderais Tricorder comme outil de conception et de suivi d’agents pour moi, pas encore comme système complet de conduite des onboardings clients.

## 5. Propositions concrètes

**Correctifs / ergonomie :** préserver le brouillon du recueil à travers les réponses d’ajout ; verrouiller explicitement l’ajout et la confirmation en cours ; afficher l’accusé de l’élément ajouté. Proposer « Utiliser et adapter pour ce client » avec destination visible. Ajouter un modèle Onboarding client avec champs et exemple métier, remplacer les métadonnées du recueil par le texte et sa date lisible. Dans la prochaine action du suivi, proposer la coordination prête même lorsque le coordinateur terminal est arrêté.

**Capacités produit absentes :** connexion Slack et mail intégrée avec authentification chez le fournisseur, sélection du canal/destinataire et examen des permissions ; opération vérifiée de brouillon mail et de notification de question. Prévoir un référentiel client réutilisable (référent, échéance, utilisateurs, source des données) distinct des consignes du modèle. Ce sont des fonctionnalités à construire, pas des boutons à renommer.

## Preuves et isolation

`drive.cjs` contient le lancement Electron et l’environnement isolé ; `trace.zip` les actions UI, captures et snapshots. `inspect.py` est une lecture via le moteur du seul état synthétique. `provider-synthetique.py` et `plan-synthetique.json` rendent visible la seule substitution de fournisseur. Aucun rapport d’autre panel lu. Tests existants lus seulement pour l’isolation et `tests/terminal-fixture.cjs` / `cleanupBroker`.

Tous les chemins HOME, XDG, état, runtime, fournisseurs et captures sont sous `/tmp/tricorder-personas-produit/01-fondateur/`. PATH local avec codex/claude inertes avant `/usr/bin:/bin`, pack agents absent. Écran :187 seulement. Les essais n’ont pas modifié le dépôt, le paquet, le profil utilisateur ou un service externe. Nettoyage par fermeture Electron et `cleanupBroker` sur les sockets de ce seul banc.

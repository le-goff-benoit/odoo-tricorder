# Persona 6 — consultant indépendant multi-client

Essai indépendant de Tricorder **0.6.0-rc.13**, paquet immuable `build-artifacts/linux-unpacked/odoo-tricorder`, le 10 octobre 2026, environ 17 minutes de GUI. Persona : consultant technique qui veut réutiliser une méthode support/audit dans deux dépôts et garder ses terminaux. Verdict : **réutilisation et suivi convaincants ; accès aux shells multiples défaillant**, ce qui gêne fortement ce persona.

## Banc et limites honnêtes

Lecture du README et de l’interface avant exploration. Electron piloté avec Playwright, backend du paquet, écran 1440 × 1000 sur DISPLAY :189. HOME, XDG, userData Chromium, état workflow et sockets sous ce dossier exclusivement. Deux nouveaux espaces Git synthétiques créés **dans la GUI** : Client Alpha fictif et Client Beta fictif. Aucun projet réel ni pack Odoo, mail, Slack, instance distante ou production. Aucun fichier du dépôt modifié, aucun build ni suite entière.

Les exécutables locaux codex/claude sont des bouchons qui annoncent `CONSULTANT_SYNTHETIQUE_LOCAL aucun fournisseur reel` et sortent avec code 78. Seul `codex --version` est appelé depuis le shell pour vérifier ce garde-fou. Les exécutions sont lancées avec **Simuler le parcours**, et leur bandeau annonce explicitement qu’aucun modèle ni service métier n’est appelé. Aucun résultat IA ou audit métier réel qualifié. Aucun setup via API de mutation ; l’API `window.tricorder.terminals.list()` est lue pour constater les identifiants/PID réels après le défaut. Les temporisations et le rechargement de page sont des opérations du harness.

## Parcours 1 — adopter et réutiliser une méthode générique

**Attendu.** Créer deux projets, partir du modèle support sans pack métier, personnaliser une procédure puis la réutiliser dans les deux projets en comprenant si les copies restent liées.

**Réalisé dans la GUI.** Projets → Nouveau projet pour Alpha puis Beta ; Workflows → Modèles → Support — diagnostic et suite → Personnaliser une copie. Création du modèle partagé « Support et audit consultant ». Dans Propriétés, premier bloc renommé « Qualifier support ou audit » et consigne adaptée pour expliciter faits, impact, preuves et périmètre client. Enregistrement rév.2. Options → Réutiliser… vers Alpha (« Support Alpha »), puis depuis cette copie vers Beta (« Audit Beta »).

**Observé.** Le dialogue de personnalisation dit que le modèle est partagé et utilisable dans chaque projet. Le dialogue de réutilisation indique clairement que chaque copie évolue indépendamment et que demandes, résultats, validations et planifications ne suivent pas. Les projets contiennent leurs propres définitions. La modification ultérieure du seul bloc Alpha produit une rév.2 « Qualifier incident Alpha », tandis que Beta reste en rév.1 « Qualifier support ou audit ». Le suivi de la simulation Alpha conserve bien la **rév.1 figée** et l’ancien nom du bloc.

**Preuves.** `02-modeles.png`, `03-modele-support.png`, `04-reutiliser-alpha.png`, `05-alpha-copie.png`, `13-alpha-revision2.png`, `14-alpha-historique-fige.png`, `15-beta-copie-independante.png`.

**Friction.** La copie partageable se crée naturellement, mais retrouver ensuite cette copie dans la bibliothèque est moins direct que la première adoption : le parcours utilise « Mes workflows / Modèles », puis une action sous Options. J’ai finalement copié Alpha vers Beta plutôt que rouvrir le modèle partagé. Le système explique correctement l’indépendance ; un consultant qui veut propager une amélioration de sa méthode devra refaire une copie ou modifier ses projets manuellement. Pas de lien vivant entre modèle et copies constaté : limite annoncée, pas bug.

## Parcours 2 — suivre deux projets et préserver les terminaux

**Attendu.** Voir les deux demandes, consulter détails/graphe et revenir au bon shell sans perdre son historique ni confondre les clients.

**Réalisé.** Audit Beta → Exécuter… ; intention saisie, « Inclure d’autres projets » déplié et Alpha coché ; Simuler le parcours. La simulation crée une demande hébergée dans Beta : sélectionner un autre projet donne un périmètre transversal, pas une duplication automatique en deux demandes. Puis simulation séparée dans Alpha. Activité affiche les deux demandes avec leur projet, workflow, révision et marque Simulation. La simulation termine deux blocs, les quatre autres sont annoncés non applicables.

Ouverture d’un shell Beta, `pwd`, marqueur `BETA_TERMINAL_PERSISTANT`, vérification du bouchon local. Navigation vers Alpha, Activité, détail/graphe du suivi Alpha, disposition verticale ; l’identifiant Beta **84b6bac3707f40afb0b8d7f66a9c6716** et PID **1681750** restent identiques. Le bandeau distingue « Shell : Client Beta fictif · Demande affichée : Client Alpha fictif ». Cette protection de compréhension fonctionne.

Création d’un **second shell dans Alpha** : identifiant **63683d2884164ea2b41e679c4549ac7e**, PID **1687809**, marqueur `ALPHA_TERMINAL_SEPARE`. Retour dans Beta : l’interface conserve le shell Alpha, affiche seulement un onglet « Shell 1 » et compteur Terminal 1. Le shell Beta reste vivant dans le broker mais aucune action visible ne permet de le choisir.

**Défaut confirmé, gravité haute pour ce persona.** Perte d’accès GUI au premier shell après création d’un shell dans un autre projet. Le contexte décalé est correctement signalé ; il n’y a pas eu changement automatique du répertoire vers un autre client. Cependant le travail terminal Beta devient inaccessible alors que son processus continue. Actualiser et masquer/afficher échouent à le récupérer. Contournement technique essayé : recharger la page, puis sélectionner Beta par carte Projets et par accès rapide ; la GUI présente alors zéro onglet et « Votre terminal / Ouvrir un terminal », tandis que l’API montre toujours les deux shells vivants. Aucun contournement GUI satisfaisant trouvé ; il faut pouvoir rattacher les sessions existantes.

**Reproduction concise.** État neuf → créer Alpha et Beta → ouvrir shell Beta → naviguer Alpha → Nouveau terminal → revenir Beta. Comparer compteur/onglets et `terminals.list()` ; deux processus, un seul onglet. Recharger → projets sélectionnés mais zéro onglet, processus toujours vivants.

**Preuves.** `08-terminal-beta.png`, `09-alpha-avec-terminal-beta.png`, `10-activite-deux-projets.png`, `11-alpha-detail-terminal-beta.png`, `12-alpha-graphe-terminal-vertical.png`, `17-deux-shells-separes.png`, `18-retour-beta-session.png`, `19-beta-session-introuvable.png`, `21-beta-apres-rechargement.png`, `22-beta-sidebar-recuperation.png`, `sessions-verifiees.json`, `defaut-deux-shells.json`, `trace.zip`.

## Autres constats et recommandations

- **Démarrage :** accueil utile, distinction projet / workflow global compréhensible, pack Odoo facultatif. « Nouvelle demande », « Créer un workflow » et « Essayer un exemple » donnent des départs concrets.
- **Projet / modèle / exécution :** breadcrumbs, révision enregistrée et révision figée donnent une séparation convaincante. Les copies ne transfèrent pas les anciennes preuves.
- **Modèle IA :** propriétés affichent « modèle à choisir », valeur effective non définie et absence de repli automatique. Fournisseur des prochains lancements visible. Parcours de connexion et lancement réel volontairement non qualifiés.
- **Instance :** aucun environnement requis pour ce workflow générique ; les shells ont `environment: null`. Pas d’obligation artificielle de connecter une instance Odoo.
- **Friction de répertoire :** les deux nouveaux shells démarrent dans la sous-directory `.tricorder` ; le bouton Contexte montre la racine du projet et précise que le dossier courant peut changer. Pour des commandes Git/audit relatives, ce départ est surprenant. Recommander racine projet pour un shell générique, ou affichage distinct du **dossier courant initial**. Contournement pratique : `cd ..` dans ces espaces synthétiques.
- **Actions secondaires :** Options et « Inclure d’autres projets » sont des éléments à déplier ; plusieurs premières tentatives de sélecteurs les ont pris pour des boutons ou cases. Cela relève du harness, pas d’un bug GUI. Leur présentation peu explicite peut néanmoins ralentir la découverte de la réutilisation ou du périmètre transversal.
- **Priorité corrective :** rendre tous les shells existants accessibles, avec nom de projet sur chaque onglet et réattachement depuis le broker. Garder le bandeau de différence entre demande affichée et shell.
- **Ensuite :** accès direct à la bibliothèque de copies personnalisées et parcours « utiliser dans un autre projet » mieux mis en évidence. Une liaison/versionnement de modèles entre projets serait une capacité supplémentaire, pas un correctif au contrat actuel d’indépendance.

## Nettoyage

Trace arrêtée et écrite, `app.close()` appelé puis `cleanupBroker` pour les trois sockets de mon HOME. Les deux PID de shell ont disparu (vérification `ps -p 1681750,1687809`). Aucun serveur DISPLAY partagé arrêté. État synthétique conservé comme preuve dans ce dossier ; aucun processus de fournisseur réel lancé.

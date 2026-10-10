# Essai produit — chef d’équipe en société de services

Paquet immuable essayé : **Tricorder 0.6.0-rc.13**, binaire `build-artifacts/linux-unpacked/odoo-tricorder`. Date : 10 octobre 2026. Banc exclusif : `/tmp/tricorder-personas-produit/02-services/`, écran `:188`, fenêtre 1440 × 1000. Aucun source modifié, rebuild, état client, compte fournisseur, envoi ou déploiement réel.

## Besoin et décision d’adoption

Je pilote plusieurs chefs de projet et consultants. Je veux une méthode commune de préparation de release, savoir quel client attend quoi, lire ce que mon accord autorise, et empêcher un travail dépendant de démarrer trop tôt.

**Adoption raisonnable comme poste individuel de préparation et de contrôle des conversations IA.** La méthode réutilisable et les décisions liées à un résultat sont utiles. **Ce banc ne justifie pas de l’adopter comme outil partagé de pilotage d’équipe.** Les personnes Emma, Hugo, Lina et Karim sont du texte saisi dans les demandes et la consigne du plan ; elles ne disposent ni d’un compte, ni d’une affectation, ni d’un circuit d’accord distinct observé. Les cartes de décision nomment « Vous » et les accords enregistrés ont l’acteur `local-user`.

Le README dit que les définitions sont versionnables dans le dépôt, que les copies évoluent indépendamment, que l’export ne transfère pas les anciennes exécutions, et que l’historique d’exécution reste local. L’interface examinée ne propose pas de membres, d’invitation ou de synchronisation de suivi. Le multi-projet constaté signifie **deux contextes de projet dans le même bureau**, pas plusieurs collaborateurs. Je n’ai pas effectué de test simultané sur deux postes ; je ne prétends donc pas avoir qualifié une synchronisation absente du parcours produit.

## Parcours 1 — une méthode, deux releases indépendantes

**Création et configuration par l’interface.** Depuis Projets, j’ai créé deux espaces locaux, sans préparer de dépôt : « Atlas — release portail clients » et « Boréal — release API partenaires ». Dans Atlas, j’ai choisi le modèle « Release — demandes, plan, réalisation et validation », nommé « Méthode équipe — préparer une release ». Le graphe comporte analyse, plan, accord, réalisation, contrôle, branche conforme/non conforme, proposition et réception.

J’ai ouvert les propriétés de « Préparer le plan » et remplacé sa consigne : nommer le chef de projet, le consultant, les critères, dépendances et blocages, puis préciser le périmètre soumis au chef d’équipe. J’ai ajouté deux critères : chaque demande a un responsable et un critère vérifiable ; les dépendances et décisions bloquantes sont explicites. J’ai appliqué et enregistré la modification (**révision 2**).

J’ai utilisé **Options → Réutiliser… → Modèles de workflows**, avec le nom « Méthode release de l’équipe services ». Le dialogue explique que demandes, résultats, validations et planifications ne sont pas copiés. Dans Boréal, « Créer un workflow » retrouve immédiatement ce modèle personnalisé. J’ai créé « Release Boréal — méthode équipe » (**révision 1**) et lancé une demande dans le terminal. Puis j’ai lancé une demande Atlas depuis son projet. Les deux ont bien leur propre conversation, exécution et résultats.

**États métier réellement exercés, avec résultats synthétiques.** Pour Atlas, le moteur reçoit un plan qui nomme Emma et Hugo, demande deux jours de travail sur le formulaire et exclut la livraison. Pour Boréal, il reçoit la question : maintenir API v1 pendant trois mois ? Dans Activité, Boréal est « Réponse attendue / Préparer le plan », Atlas « Décision attendue / Valider le plan ». Les questions et décisions sont donc retrouvables sans rouvrir tous les graphes.

J’ai ouvert la décision Atlas en **Détail**. Le contenu du plan, sa provenance « Préparer le plan », le nom de la demande et « cette proposition · tentative 1 uniquement » sont visibles avant **Approuver la suite**. L’accord saisi par UI rend seulement la réalisation Atlas prête. J’ai répondu à Boréal par UI : garder v1 trois mois, Lina valide la migration, Karim documente les tests. Cela rend seulement son plan prêt, sans créer un accord de périmètre. Le terminal et les deux sessions restent présents pendant les changements de projet et d’écran.

**Résultat vérifié :** Atlas `scope=accepted`, `work=ready` ; Boréal `plan=ready` après réponse. Aucune décision Atlas transférée à Boréal. La consigne et les critères personnalisés sont présents dans les deux définitions enregistrées. La méthode est adoptée et réutilisable, mais les personnes et la notion de release restent déclaratives.

Preuves : [modèle](shots/02-release-template.png), [deux demandes](shots/04-two-projects-activity.png), [attentes différentes](shots/05-question-decision-activity.png), [accord Atlas](shots/06-atlas-approval.png), [après interventions](shots/07-independent-after-actions.png), `snapshot.json`.

## Parcours 2 — coordination entre projets et vraie attente

Depuis **Nouvelle demande**, j’ai réutilisé le workflow Boréal, gardé Boréal comme projet principal, puis déplié **Inclure d’autres projets** et coché Atlas. J’ai lancé C1 : produire localement un contrat API v2 validé, Lina responsable. Depuis **Vue d’ensemble → Ajouter une demande…**, j’ai créé C2 dans Atlas : intégrer ce contrat, Emma responsable et Hugo consultant ; j’ai coché C1 comme demande préalable. Le texte du formulaire dit explicitement que toutes les demandes préalables doivent réussir.

La vue d’ensemble montre C1 « À traiter dans la conversation », C2 « Attend une autre demande », le nom de C1 et « En attente de réussite ». Après remise synthétique du plan C1, j’ai approuvé le périmètre par UI. **C2 reste en attente** : l’accord du plan n’est pas confondu avec une réception complète.

J’ai remis une réalisation C1 synthétique et un contrôle marqué `pass` sans preuve. Le moteur l’a refusé : **« Preuve requise pour la validation automatique »**, étape en échec, tentative 1 sur 2. C2 reste bloqué. J’ai ouvert **Préparer la reprise**, lu que cette action prépare l’étape sans démarrer d’agent, saisi la correction attendue, puis préparé la reprise par UI. L’échec initial et son motif restent dans les tentatives précédentes.

J’ai alors remis le contrôle synthétique avec un fichier de preuve créé par l’API d’artefacts du moteur ; les sorties et la preuve sont reçues, la branche non conforme devient non applicable, et la proposition locale arrive à la réception. La décision finale affiche la proposition exacte et exclut envoi et déploiement. J’ai utilisé **Examiner la décision**, puis **Approuver la suite** par UI.

**Résultat vérifié :** C1 `completed`, `completion_outcome=succeeded` ; C2 quitte l’attente et son analyse devient `ready`. La vue d’ensemble conserve le lien nommé vers C1 terminé. Aucun agent ne démarre par simple lecture ; le bouton de vague reste désactivé car ce parcours se traite dans sa conversation native. Les exécutions indépendantes du parcours 1 ne sont pas rejouées. **Voir les résultats** ouvre les productions validées avec blocs et tentatives ; il annonce honnêtement trois résultats affichés sur six et renvoie au rapport complet.

Preuves : [création de dépendance](shots/08-dependency-config.png), [attente nommée](shots/09-coordination-overview.png), [attente après accord du plan](shots/10-scope-approved-dependent-still-waits.png), [contrôle refusé](shots/11-final-receipt.png), [décision finale](shots/13-receipt-decision.png), [C2 disponible](shots/14-coordination-unblocked.png), [résultats terminés](shots/15-completed-results.png), [activité finale](shots/16-final-global-activity.png), `snapshot.json`.

## Défauts prouvés et améliorations UX

**Aucun P1 confirmé. Aucun P2 fonctionnel confirmé** dans ces deux parcours. Les accords, réponses, reprises et dépendances ont produit les transitions attendues.

### P3 — le sélecteur de prérequis donne un état différent du suivi

1. Lancer un workflow dans le terminal sans modèle explicite pour un agent de bloc, avec un fournisseur natif disponible.
2. La vue d’ensemble dit « À traiter dans la conversation » et propose de continuer dans cette conversation.
3. Ouvrir « Ajouter une demande… » et lire le même prérequis : **« Boréal — release API partenaires · À configurer »**.

La capture [08](shots/08-dependency-config.png) montre les deux libellés dans la même fenêtre. Le terminal fictif est effectivement ouvert. Le problème concerne l’étiquette du prérequis ; la dépendance est malgré tout enregistrée correctement.

**Impact :** le chef d’équipe croit devoir corriger une configuration avant de pouvoir utiliser la demande préalable, ou choisit un autre prérequis. **Attendu :** le même état métier « À traiter dans la conversation » dans les deux surfaces, et un diagnostic facultatif séparé concernant un agent de bloc.

### P3 — Activité ne permet pas de distinguer deux stades prêts

1. Approuver le plan Atlas ; `work=ready`.
2. Répondre à la question Boréal ; `plan=ready`.
3. Revenir dans Activité.

Les deux cartes présentent **« À traiter dans la conversation / Continuer dans la conversation »**, sans nom de l’étape courante. Voir [07](shots/07-independent-after-actions.png) et états dans `snapshot.json`. À l’inverse, les cartes d’attente affichaient le nom de l’étape pertinente.

**Impact :** je dois ouvrir chaque demande pour voir si nous préparons encore le plan ou si le travail autorisé doit commencer. Ce n’est pas un état faux ; c’est une synthèse trop faible pour piloter plusieurs clients. **Attendu :** conserver le nom de l’étape (« Préparer le plan », « Réaliser le périmètre accepté ») également pour les demandes prêtes.

### Améliorations de lecture, sans défaut fonctionnel démontré

- Le modèle a neuf blocs et passe vite sous la ligne de flottaison lorsque le terminal occupe la moitié de la fenêtre. Détail est efficace pour décider, mais le graphe impose beaucoup de défilement. Une synthèse de phases, ou le masquage facilité du terminal au moment de relire, améliorerait l’usage manager.
- La décision finale montre le texte de proposition ; les preuves de QA nécessitent de revenir au bloc contrôle ou au rapport. Des raccourcis vers les contrôles et vers les demandes débloquées rendraient l’accord plus facile à examiner. La conséquence « libérer C2 » était dans notre texte synthétique, pas une synthèse automatique démontrée.
- **Approuver la suite** reste le même libellé pour l’accord du plan et la réception finale. Une action nommée selon la décision (« Accepter ce plan », « Recevoir ces résultats ») renforcerait la compréhension de la portée.

## Capacités absentes ou non qualifiées — à ne pas confondre avec des bugs

- Aucune collaboration en direct qualifiée : pas d’état partagé, d’invitations, de délégation nominative ou de réception par un autre utilisateur dans les parcours disponibles. La copie d’un workflow est une distribution de méthode, pas une distribution de suivi.
- Aucun tableau de charge, de priorités métier ou d’échéances observé. Les dépendances contrôlent l’ordre ; elles ne constituent pas une planification de capacité de consultants.
- Les noms des responsables et critères sont définis dans les consignes et résultats. Les profils du formulaire sont des profils d’agents IA, pas des personnes de mon équipe.
- Les dépendances essayées portent sur les demandes d’une **même conversation multi-projet**. Les deux conversations indépendantes du premier parcours ne sont pas reliées rétroactivement. Le guide explique que les prérequis se sélectionnent dans la conversation ; cela doit être anticipé lorsqu’on démarre une coordination.
- Les fournisseurs sont des substituts inertes. Aucune qualité d’analyse IA, automatisation réelle, connexion externe ou QA client n’est établie par cet essai.

## Compréhension autonome et assistance

**Compris depuis l’interface et le README :** créer un espace, adopter un modèle, éditer la consigne, réutiliser dans les modèles, démarrer deux conversations, inclure un autre projet, déclarer une dépendance, répondre, approuver, lire les tentatives, préparer une reprise et retrouver les résultats. Le guide runtime confirme la différence entre demandes indépendantes et coordination.

**Assistance de banc déclarée :** lecture de `tests/startup-navigation.spec.cjs` et `tests/terminal-fixture.cjs` pour lancer et nettoyer Electron ; lecture de l’API moteur embarquée pour fournir les intentions, plans, questions, réalisations et contrôles synthétiques par `Engine.claim/submit/artifact`, et vérifier les états par `Conversations.snapshot`. Cette assistance remplace les réponses du faux fournisseur ; elle n’a ni créé les projets/workflows/conversations/dépendances, ni approuvé une décision, ni répondu à une question, ni préparé une reprise à la place de l’interface. Aucun JSON/SQLite d’état n’a été retouché.

**Motifs d’adoption :** une méthode réutilisable, des attentes humaines trouvables, la portée d’un accord explicite, la conservation des tentatives, et une dépendance qui attend réellement la réception. **Motifs d’abandon comme outil d’équipe :** si je dois demander à chaque chef de projet où en est son bureau ou exporter son rapport pour fabriquer ma synthèse, je reviens rapidement au système partagé existant. J’utiliserais Tricorder en complément sur mon poste ; pas comme remplacement démontré du suivi commun des consultants.

## Reproductibilité et nettoyage

`driver.cjs` lance uniquement le paquet immuable avec HOME, XDG_CONFIG_HOME/XDG_DATA_HOME/XDG_CACHE_HOME, TRICORDER_STATE_DIR, TRICORDER_RUNTIME_DIR, CODEX_HOME et CLAUDE_CONFIG_DIR exclusifs. PATH commence par les faux `codex`/`claude`, puis `/usr/bin:/bin`. L’environnement transmis est une liste isolée, sans reprise des secrets du parent. `send.py` pilote le navigateur Electron par Playwright installé dans le dépôt ; `synthetic.py` alimente les seuls résultats de ce banc et conserve `snapshot.json`. Les essais sont des manipulations GUI réelles capturées, pas une exécution de la suite préexistante.

Trace Playwright : `trace.zip`. Captures : `shots/`. La fenêtre est fermée, la trace terminée et `cleanupBroker` appelé sur le seul socket `02-services/runtime/pty.sock` ; nettoyage confirmé par le pilote. L’état synthétique et les preuves sont conservés pour consultation.

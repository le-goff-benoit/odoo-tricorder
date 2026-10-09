# Terminal et suivi — préparation indépendante #3

Préparé le 9 octobre 2026. Aucun lancement Electron/broker et aucun verdict produit à ce stade. Les SHA exacts du paquet corrigé et la libération explicite de DISPLAY :183 sont requis avant lancement. Entrée normale, sans `--workflow-studio`. Sources consultées : AGENTS.md et le harness commun uniquement ; aucun code produit ni rapport des autres spécialistes.

## Intention de la réception

Comprendre si une seule application permet de donner une intention au terminal, conserver une conversation et sa saisie pendant la navigation, puis comprendre graphiquement demandes, questions, décisions, dépendances et agents réellement actifs. Le terminal et le graphe doivent permettre de retrouver le même contexte. Une forme, un nom de bloc ou un badge seuls ne prouvent pas une exécution.

## Banc et fixtures

`prepare.cjs` appelle le harness avec `{id: 'terminal-suivi', output: __dirname, display: 183}`. Le manifest conserve les chemins et la liste exacte des variables d’environnement. HOME, XDG, CODEX_HOME, CLAUDE_CONFIG_DIR, état et runtime sont temporaires. PATH contient les stubs inertes Codex et Claude avant `/usr/bin:/bin`. Le précontrôle vérifie les chemins et le marqueur `TRICORDER-UX-INERT` des deux fournisseurs avant tout broker.

Les projets inventés Atelier Azur et Laboratoire Corail contiennent seulement des README. R1 collecte trois libellés ; R2 choisit un libellé après R1 ; R3 produit une variante dans l’autre projet après R2 ; R4 relit les deux projets après R2 et R3. Ces documents sont un jeu d’intentions, pas un workflow importé ni une preuve d’avancement.

La première commande dans le vrai terminal GUI vérifiera `command -v codex`, `codex --version`, `command -v claude`, `claude --version`, ainsi que les valeurs temporaires HOME, CODEX_HOME et CLAUDE_CONFIG_DIR. Une sortie du stub doit être nommée « fournisseur inerte, aucune exécution modèle ». Aucun agent IA ne sera présenté comme ayant travaillé. Un éventuel état de démonstration sera produit par une API Engine validée, consigné comme fixture externe, et seulement pour inspecter son affichage. Aucune retouche SQLite/JSON d’état.

## Quatre parcours

### P1 — Donner une intention puis retrouver la conversation

1. Ouvrir l’application normalement et sélectionner Atelier Azur par la GUI.
2. Trouver et ouvrir le terminal principal par les contrôles visibles ; vérifier les deux stubs et les chemins temporaires dans ce terminal.
3. Saisir une phrase reconnaissable sans la soumettre : `UX-CONTEXTE-R1 : proposer trois libellés de démonstration`.
4. Aller à la vue de suivi ou de workflow, sélectionner R1 si l’application le permet, puis revenir au terminal.
5. Vérifier que le contenu non soumis, la session, le répertoire et l’historique visibles sont conservés ; soumettre seulement une commande shell inerte qui imprime `UX-CONTEXTE-R1`.

Attendu : le contexte de projet et de demande est lisible, la navigation conserve session et saisie, le terminal sert d’entrée naturelle. Observer l’écart entre intention, commande shell, conversation agent et exécution suivie sans les confondre.

### P2 — Travailler en split et ajuster l’espace

1. Avec la même session, ouvrir suivi et terminal ensemble si une commande visible le permet.
2. Passer entre partage horizontal et vertical ; redimensionner le séparateur à environ un tiers puis deux tiers.
3. Maintenir une saisie `UX-SPLIT-R2` non soumise pendant ces gestes, puis la retrouver.
4. À 1280 × 900, inspecter la lisibilité des demandes, du graphe, des contrôles d’exécution et de l’invite terminal ; utiliser 1024 × 768 seulement si un problème de reflow doit être départagé.
5. Revenir au terminal ou à la vue plein écran, puis restaurer le split.

Attendu : un seul espace de travail, redimensionnement découvrable, focus explicite, saisie et contexte conservés. Ne qualifier un split d’absent qu’après recherche dans les menus/contrôles visibles.

### P3 — Sélectionner R1–R4 et comprendre la dépendance entre projets

1. Créer/sélectionner les demandes R1–R4 par les gestes GUI disponibles et consigner ce qui est réellement représentable.
2. Sélectionner successivement R1, R2 et R4 dans Atelier Azur ; vérifier ce que deviennent terminal, détails et graphe.
3. Aller à Laboratoire Corail, sélectionner R3, puis revenir à R4 d’Atelier Azur.
4. Lire les relations R1 → R2 → R3 et R2 + R3 → R4 depuis les contrôles accessibles ; comparer le contexte terminal et le contexte sélectionné.
5. Distinguer workflow réutilisable, instance/exécution, demande et projet. Si l’Engine fournit une fixture d’exécution autorisée, son origine synthétique reste visible dans les preuves.

Attendu : les demandes et les relations ont une identité stable ; les dépendances cross-projet permettent d’identifier projet, demande et état. Une connexion dessinée seule est classée « conception », jusqu’à preuve de prise en charge par le moteur.

### P4 — Comprendre arrêt, attente et reprise

1. Partir d’une exécution synthétique créée par les commandes validées disponibles ou d’un lancement GUI utilisant exclusivement un stub.
2. Observer le résultat réel du fournisseur inerte ; vérifier qu’une erreur/absence d’exécution n’est pas un agent actif ni une tâche métier accomplie.
3. Utiliser les contrôles visibles d’arrêt/pause seulement s’ils existent et vérifier le statut et le journal résultants.
4. Naviguer ailleurs puis revenir ; lire la cause de l’arrêt, la demande concernée, la question/décision attendue et la prochaine action.
5. Reprendre par la GUI ; comparer le résultat persistant, le journal, le graphe et le terminal. Si le parcours ne peut pas atteindre un état requis, consigner exactement le blocage sans contourner le flux par API.

Attendu : les termes arrêt, échec, attente humaine et reprise sont distincts. La cause et l’action suivante sont compréhensibles, et aucun succès n’est attribué à une IA absente.

## Preuves prévues, 12–18 captures utiles

Prévoir : entrée normale ; terminal et précontrôle ; saisie avant navigation ; retour et saisie conservée ; suivi R1 ; split horizontal ; split vertical ; séparateur ajusté ; vue 1280 ; sélection R2 ; contexte R3 du second projet ; dépendance R4 ; résultat du stub ; arrêt/attente et journal ; retour au contexte ; reprise. Adapter les captures aux vues réellement disponibles, sans produire de variantes décoratives.

Les observations consigneront geste GUI, contrôle visible, attendu/observé, capture et résultat vérifiable. Maximum cinq constats principaux, chacun avec gravité, impact et simplification concrète. Un blocage de test, une affordance absente et une fonction présente mais défaillante seront distingués. Réserver les termes « actif », « terminé » et « repris » aux preuves de l’Engine ou du terminal.

## Fin de réception

Fermer seulement l’application et les brokers de ce manifest. Conserver Xvfb. Vérifier les SHA executable/ASAR en fin de test. Pas de build, commit, fullsuite ni modification du produit. Les résultats restent dans ce dossier propriétaire.

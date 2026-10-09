# Préparation — données et branchements

Statut : préparation seulement ; aucune interface ouverte, aucun verdict produit.
Profil : analyste de processus métier (9/10 métier, 4/10 technique).

## Traitement fictif à dessiner

Une entreprise reçoit une demande de client. L'entrée décrit la demande (`référence` texte, `description` texte, `critique` booléen). Un diagnostic donne une synthèse texte. Un aiguillage choisit la prise en charge critique ou normale. Les deux branches reviennent vers une préparation de réponse commune, puis une sortie lisible : référence, priorité retenue et synthèse de réponse.

Noms métier proposés : « Demande reçue », « Diagnostic », « Priorité », « Prise en charge critique », « Prise en charge normale », « Réponse commune », « Réponse client ». Si l'interface impose une autre terminologie ou des types différents, relever ce qu'elle permet et exprimer le besoin avec ses commandes visibles. Aucun import de workflow, JSON ou SQL.

Chaque parcours commence avec un workflow neuf créé dans l'interface. Aucun parcours ne dépend du succès du précédent. Pas de fournisseur réel : les stubs ne qualifient que l'isolement et la simulation.

## Parcours 1 — préparer les informations qui circulent

**But :** comprendre et configurer les entrées/sorties typées, puis les liens d'un traitement simple.

1. Depuis l'entrée normale de Tricorder, trouver la création de workflow et nommer le workflow « Demande client — données ».
2. Ajouter les blocs d'entrée, de diagnostic et de sortie à partir des commandes visibles.
3. Dans le panneau de l'entrée, définir une référence et une description en texte, puis un indicateur critique en booléen, si ces types sont proposés.
4. Dans le diagnostic, définir une synthèse en texte. Relier l'entrée au diagnostic, puis le diagnostic à la réponse client.
5. Configurer les données de la sortie pour que la référence et la synthèse soient reconnaissables. Sauvegarder, quitter l'éditeur puis le rouvrir.

**Attendu métier :** le sens de circulation et les données reçues/produites restent compréhensibles ; le nom, les types et les liens sont conservés. Si une association de champs est nécessaire, l'interface la rend repérable et explique ses contraintes.

**Preuves prévues :** configuration typée et graphe rouvert (2 captures maximum).

## Parcours 2 — décider critique ou normal, puis rejoindre

**But :** construire une condition et deux branches qui rejoignent une réponse commune.

1. Créer « Demande client — priorités » depuis l'interface et ajouter entrée, diagnostic, condition, prise en charge critique, prise en charge normale, réponse commune et sortie.
2. Configurer l'indicateur critique et une condition compréhensible : critique vrai suit la branche critique ; critique faux suit la branche normale.
3. Nommer les liens ou issues si l'interface le propose, puis raccorder chaque branche à la réponse commune et celle-ci à la sortie.
4. Valider le workflow et lire les messages. Rouvrir chaque branche pour vérifier quelle issue lui est attribuée.

**Attendu métier :** la condition a deux issues sans ambiguïté ; une demande emprunte une seule prise en charge puis retrouve la réponse commune. La validation permet de comprendre si cette jonction est autorisée et comment la configurer. Aucune réussite de simulation n'est postulée avant observation.

**Preuves prévues :** condition configurée et graphe complet avec jonction (2 captures maximum).

## Parcours 3 — comprendre et réparer un chemin impossible

**But :** vérifier que la validation et la correction d'une liaison invalide sont utilisables par un analyste.

1. Créer « Demande client — contrôle », avec entrée, condition, deux branches et sortie. Laisser volontairement la branche normale sans sortie, puis lancer la validation.
2. Lire les messages et utiliser les moyens visibles pour retrouver le bloc ou le chemin concerné. Relever les mots exacts et ce qu'ils permettent de corriger.
3. Tenter une liaison manifestement impossible depuis la sortie vers l'entrée, ou incompatible selon les ports proposés. Ne pas forcer le geste si l'interface le refuse ; relever le refus comme observation.
4. Supprimer la liaison fautive si elle a été acceptée, puis raccorder correctement la branche normale à la sortie. Relancer la validation.
5. Rouvrir le workflow pour vérifier que la réparation reste enregistrée.

**Attendu métier :** les erreurs identifient le problème et donnent une correction compréhensible. Les commandes de suppression/reconnexion permettent la réparation ; la validation reflète l'état réparé. Distinguer clairement un refus immédiat utile, une erreur de validation, et une limite du banc.

**Preuves prévues :** message sur chemin incomplet, liaison refusée/invalide et résultat réparé (3 captures maximum).

## Parcours 4 — simuler et revenir sans perdre le dessin

**But :** suivre une demande fictive jusqu'à une sortie puis reprendre la conception.

1. Créer « Demande client — simulation » avec le traitement complet. Sauvegarder puis noter les noms des blocs, leurs données, les issues et la jonction.
2. Trouver la commande visible de simulation/exécution. Saisir, si l'interface le permet, « DEMO-004 », « Impossible d'accéder au portail » et critique vrai. Sinon relever les données de simulation proposées et leur limite.
3. Suivre le diagnostic, la branche retenue et la réponse commune dans la vue d'exécution ou le journal. Vérifier si une sortie lisible est présentée.
4. Revenir à l'éditeur par une commande visible. Vérifier les noms, types, liens et condition, puis modifier seulement le nom de la réponse client.
5. Si les commandes le permettent, simuler une seconde demande avec critique faux et observer la branche normale. Revenir à l'éditeur et vérifier la conservation du dernier nom.

**Attendu métier :** les résultats permettent de savoir quelle branche a été suivie ; la reprise de conception conserve le workflow. Si la simulation ne permet pas d'injecter les données, ce manque est décrit sans qualifier un fournisseur ou prétendre une preuve d'aiguillage.

**Preuves prévues :** suivi de simulation, retour à l'éditeur et seconde issue si observable (3 captures maximum).

## Discipline et réception

- Démarrage GUI uniquement après followup donnant le paquet corrigé et ses SHA. Empreintes SHA256 de l'exécutable **et** de `resources/app.asar` exigées avant lancement.
- Entrée normale, aucun argument `--workflow-studio`. État moteur isolé dans `state/workflows`. Création et configuration exclusivement dans l'interface.
- Le banc prépare HOME/XDG/CODEX_HOME/CLAUDE_CONFIG_DIR/TRICORDER_HOME/STATE_DIR/RUNTIME_DIR neufs, stubs codex et claude inertes et PATH fixé avant GUI/broker. Aucun accès au display lors de la préparation.
- Au début de la session GUI, ouvrir le terminal et vérifier `command -v codex`, `codex --version`, `command -v claude`, `claude --version` ; retrouver les chemins des stubs et le marqueur avant toute création de workflow.
- Maximum 12 captures utiles pour toute la campagne. Les parcours réservent 10 captures ; les deux restantes servent à une anomalie ou au contrôle d'isolement.
- Rapport français à produire après observation : attendu / action / observé / reproduction / preuve / verdict / gravité / bug, UX ou manque du banc / prochaine action. Aucun rapport antérieur ou autre testeur consulté.
- Pas de clients, comptes, secrets, trousseau, réseau, service TCP, modification de code produit, build, commit ou suite globale.

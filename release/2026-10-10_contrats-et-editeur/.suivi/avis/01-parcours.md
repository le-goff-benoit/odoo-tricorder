# Avis indépendant 1 — parcours produit

Profil : chef de projet / business analyst légèrement technique. Revue du
10 octobre 2026, sur la proposition `ANALYSE.md` et le code présent dans le dépôt.
Lecture seule du code ; aucun projet client consulté, aucun service externe appelé,
aucun test dynamique exécuté pour cet avis. Les constats ci-dessous portent sur les
contrats et parcours observables dans les sources, pas sur une recette visuelle.

La séparation données / interactions / issues / actions associées répond au besoin.
Le principal risque restant est de livrer des ports plus précis tout en conservant
le parcours actuel : chaque nouvelle phrase devient une nouvelle exécution complète.
Le vocabulaire et les commandes de collecte doivent donc évoluer avec le moteur.

## 1. P0 — Ajouter une intention ne doit pas créer une autre release

**Écart actuel confirmé par le code ; proposition encore incomplète sur le parcours.**
Un texte saisi au lancement appelle immédiatement `add`. Chaque appel à `add`
copie la définition entière et démarre une exécution. L'interface invite ensuite
à « Ajouter une demande », sans proposer une contribution au recueil existant.
Une phrase telle que « ajoute aussi le problème de planning » peut ainsi être
traitée comme une deuxième release, alors que l'utilisateur complète la première.

Sources : `backend/workflow_engine/conversations.py:82`, `:87`, `:106` et `:114` ;
`src/studio.js:349`, `:355`, `:381` et `:1159`. La proposition distingue les
notions, mais ne définit pas encore le routage d'une contribution terminal.

**Décision proposée.** Une exécution possède un recueil nommé, révisé et visible.
Tant qu'il est ouvert, ajouter/modifier/retirer une intention cible ce recueil.
« Nouvelle demande » reste une action distincte qui annonce le lancement d'une
autre exécution. Une contribution reçue après clôture ouvre une proposition de
révision ou une nouvelle demande explicite ; elle ne modifie jamais silencieusement
un plan accepté. Les identifiants d'intention restent stables malgré leur ordre.

**Critère vérifiable.** Depuis un modèle vierge, décrire deux intentions, en ajouter
une troisième au terminal, modifier la première dans le formulaire, fermer et
rouvrir : une seule exécution, trois intentions, aucun plan encore lancé. Une
confirmation ferme cette révision et produit exactement une invocation du
planificateur. Une phrase supplémentaire après confirmation ne crée ni doublon ni
travail supplémentaire sans que son rattachement soit explicite dans le suivi.

## 2. P0 — « Pour chaque élément » et sa coordination sont le socle du parallélisme

**Écart actuel et risque de conception.** Le modèle de release transmet un simple
texte `plan:string` à un unique bloc de travail. La proposition décrit un traitement
par élément, mais le passage « ce plan → ces tâches » reste à définir. Ajouter une
liste typée d'intentions ne suffit pas : trois intentions peuvent nécessiter une
seule modification, ou une intention trois tâches et une documentation.

Sources : `backend/workflow_engine/work_templates.py:44` à `:57` ;
`backend/workflow_engine/conversations.py:105` à `:115`. Le test
`tests/test_conversation_dispatch.py:81` vérifie l'attente de demandes déjà créées,
pas la décomposition fidèle d'un plan depuis un recueil réel.

**Décision proposée.** Garder un résultat « Plan », lisible comme un document,
accompagné de tâches structurées : identifiant, intentions couvertes, résultat
attendu, projet, dépendances, méthode de contrôle et sous-workflow choisi.
L'approbation affiche cette décomposition et fige sa version. Le parcours explicite
est « Liste de tâches → Pour chaque élément → Résultats réunis ». Une liste de
trois intentions reste une donnée entière lorsqu'elle entre dans le planificateur ;
elle ne déclenche pas trois agents. C'est le bloc « Pour chaque élément », configuré
avec le travail à appliquer, qui peut lancer plusieurs exécutants. Ce bloc montre
les tâches du plan sans leur refaire parcourir le recueil et sa validation.
Un changement de tâche après approbation affiche son impact avant de relancer le
travail concerné. Cette capacité ne doit pas devenir une amélioration optionnelle
après la seule livraison des ports typés.

**Orchestration à rendre visible.** Le responsable de la demande et le rôle de
coordination doivent être identifiables dans le suivi du parent : objectif global,
plan suivi, éléments distribués, agent réellement affecté à chacun, dépendances,
questions et prochaine action. Le moteur détient les états et les verrous ; un
agent coordinateur peut interpréter l'intention et préparer la répartition. Le
graphe ne doit pas affirmer qu'un « orchestrateur travaille » simplement parce que
son terminal est ouvert. Aujourd'hui, l'interface expose surtout les exécutants
de chaque demande et les étapes prêtes ; cela ne forme pas encore un rôle de
coordination visible (`src/conversation-view.mjs:77`, `:97`, `:100` ;
`backend/workflow_engine/runtime.py:208`).

**Critère vérifiable.** Trois intentions donnent deux tâches de code et une tâche
documentaire, avec une dépendance. Un seul plan est approuvé ; deux travaux
indépendants démarrent, le troisième attend réellement. Le graphe indique
« 3 travaux · 2 en cours · 1 en attente ». Chaque intention mène à sa tâche et à
son résultat. L'absence de modification de code dans la tâche documentaire n'est
pas un échec. Ajouter une quatrième tâche ne lui transfère pas l'accord précédent.
Un échec sur l'élément B se reprend sur B seul ; les résultats de A et C restent
acquis et la réunion des résultats indique exactement ce qui manque. Fermer le
terminal du coordinateur n'affiche jamais cet agent comme actif ; le suivi conserve
les états réels des exécutants et indique la prochaine action de coordination.

## 3. P1 — Clarifier la place de l'accord humain dans le terminal principal

**Risque de proposition, pas défaut de la protection actuelle.** Dire que terminal
et formulaire utilisent les mêmes commandes pourrait laisser croire que l'agent
peut confirmer le plan ou la production. La passerelle native expose `answer`,
mais exclut volontairement les accords humains. Le formulaire de question dit
« Répondez dans le terminal ou ici » ; la décision humaine dispose d'un autre
parcours. Cette distinction doit rester compréhensible sans connaître le moteur.

Sources : `backend/workflow_cli.py:2`, `:99`, `:101` et `:119` ;
`src/studio.js:712` et `:726`. Les protections sont déjà couvertes par
`tests/test_workflow_conversations.py:108` et `:121` : ne pas les retirer pour
rendre la conversation apparemment plus fluide.

**Décision proposée.** Préserver un terminal continu et un panneau compact pour
les décisions qui exigent un acte humain vérifié. Une question ordinaire peut
recevoir une réponse via l'agent ; une validation affiche sa portée exacte et
ouvre directement le contrôle humain. Distinguer « Confirmer les intentions »,
« Approuver le plan » et « Autoriser la publication ». Aucun JSON ou identifiant
technique à saisir pour l'utilisateur.

**Critère vérifiable.** En répondant à une précision depuis le terminal, le bloc
reprend la même tentative. Dire ensuite « oui, c'est bon » à l'agent ne produit pas
une autorisation de publication. La décision attendue est visible à côté du
terminal, ouvre le bon plan et la bonne révision en une action, sans changer de
conversation ni perdre le texte en cours de saisie.

## 4. P1 — Distinguer réutilisation et coordination cross-projet

**Ambiguïté actuelle ; proposition à compléter.** « Inclure d'autres projets »
ajoute des projets autorisés à la conversation. Ce geste ne distribue pas une
demande à tous : une demande reste affectée à un seul projet et, sans indication,
au projet principal. Un utilisateur peut pourtant comprendre « exécuter ce même
workflow sur les trois projets ». Les deux usages ont été demandés.

Sources : `src/studio.js:1159` ;
`backend/workflow_engine/conversations.py:77`, `:100` et `:115` ;
`tests/test_workflow_conversations.py:38` et `:73` couvrent des affectations
explicitement fournies, pas ce choix utilisateur initial.

**Décision proposée.** Le lancement distingue « Même workflow, exécutions
indépendantes » et « Une demande coordonnée sur plusieurs projets ». Dans le
second cas, le plan explique l'affectation de chaque travail et ses dépendances.
Le suivi indique les résultats par projet et le résultat collectif, y compris
lorsqu'un dépôt a réussi et qu'un autre attend une décision. Un espace documentaire
sans dépôt doit rester utilisable. Ne pas présenter plusieurs candidats comme une
publication globale atomique.

**Critère vérifiable.** Avec trois projets synthétiques, le premier mode produit
trois exécutions nommées et indépendantes. Le second produit un plan commun et des
travaux affectés, consultables depuis chacun des projets. Une réussite sur A, un
échec sur B et une attente sur C apparaissent ensemble. Relancer B ne recommence
pas A. Un utilisateur identifie le projet de l'action avant de la déclencher.

## 5. P1 — « Terminé » doit conserver les actions facultatives à reprendre

**Risque concret de régression au raccordement de la proposition.** La logique
d'affichage actuelle ignore les exécutions terminées dans les compteurs d'activité
et oriente une exécution terminée vers son rapport. Si l'on marque le résultat
principal terminé sans revoir ces projections, une notification en échec pourrait
disparaître des éléments qui demandent une intervention.

Sources : `src/execution-view.mjs:38`, `:43`, `:55` et `:61` ;
`backend/workflow_engine/engine.py:344`. Ce n'est pas un bug de l'ancienne notion
de fin ; c'est un point de raccordement indispensable pour la nouvelle règle.

**Décision proposée.** Afficher deux faits sans deux tableaux de bord :
« Compte rendu terminé · Notification Slack en échec ». Le résultat principal
reste lisible immédiatement ; une action permet de reprendre uniquement la
notification. Une action désactivée, en attente d'accord, en échec ou au résultat
incertain doit avoir un libellé distinct. Une question non répondue demeure
bloquante même si sa notification facultative a échoué.

**Critère vérifiable.** Le compte rendu et son brouillon sont terminés ; la
notification échoue. Le projet, le graphe et le rapport montrent les deux états,
y compris après redémarrage. Reprendre la notification ne relance ni transcription
ni compte rendu. À l'inverse, une question sur le destinataire garde le travail en
attente de réponse : « facultatif » ne s'applique qu'à la notification.

## 6. P1 — La reprise et la recette doivent couvrir des flux sans code

**Friction actuelle et risque de focalisation sur les releases.** Plusieurs sorties
de support/express demandent d'ouvrir une nouvelle tâche lorsque la qualification
reste indéterminée ou qu'un contrôle échoue. La reprise après épuisement des
tentatives propose aussi une nouvelle demande. Or ce chemin conserve un historique
séparé et copie de nouveau tout le workflow ; l'utilisateur doit reconstruire ce
qui était déjà connu. La proposition doit montrer un chemin de correction lisible,
pas seulement l'intégration de candidats de code.

Sources : `backend/workflow_engine/work_templates.py:24`, `:53`, `:80` et `:81` ;
`src/execution-view.mjs:21` ; `src/studio.js:381` et `:403`.
Le texte actuel explique bien qu'une validation passée n'est pas transférée :
cette protection est à conserver.

**Décision proposée.** Une reprise conserve un lien visible vers la demande
d'origine, préremplit les faits et résultats réutilisables, et annonce les étapes
à rejouer ainsi que les validations périmées. Recetter au moins trois objectifs
métier de poids comparable : diagnostic de support, clôture de réunion, travail
de développement. Mesurer la compréhension du prochain geste, pas seulement la
présence de cartes ou la validité d'un contrat JSON.

**Critère vérifiable.** Pour un support encore indéterminé, apporter une précision
puis ouvrir l'investigation proposée sans ressaisir les faits ni perdre la source.
Pour une réunion, corriger un destinataire et préparer un brouillon sans candidat
de code ni publication forcée. Pour une release, traiter un conflit avec un lien
vers les deux contributions et reprendre la QA pertinente. Dans chaque parcours,
un testeur doit pouvoir nommer le résultat attendu, l'attente actuelle et la
prochaine action depuis le terminal et le panneau visible, sans ouvrir les données
techniques.

## Arbitrage recommandé

Traiter 1 et 2 comme conditions de cohérence du modèle avant l'implémentation du
parallélisme. Fixer ensuite les parcours 3 à 6 dans les critères de réception.
Les tests existants prouvent déjà des garanties utiles — questions durables,
affectation projet, dépendances et barrières humaines — et doivent être conservés.
Ils ne remplacent pas les nouveaux scénarios allant d'une intention saisie jusqu'au
résultat métier. Les annotations et gestes de l'éditeur sont utiles, mais ne
résoudront pas seuls l'ambiguïté entre contribution, demande et exécution.

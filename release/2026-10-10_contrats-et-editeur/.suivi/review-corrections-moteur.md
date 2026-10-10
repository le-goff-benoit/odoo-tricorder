# Réception indépendante des corrections du panel — moteur

10 octobre 2026. Périmètre demandé : CONNECT-R1, origines durables des tâches et
actions, compteurs de familles, non-régression des autorisations par filiation.
Revue distincte de la réception graphique. Aucun fichier produit, état client,
build ou service externe modifié par le relecteur.

**Verdict final : favorable sur ce périmètre.** Un nouveau P1 a été reproduit,
transmis et corrigé par l'orchestrateur ; sa contre-épreuve et ses variantes sont
maintenant vertes. Ce verdict ne lève pas à lui seul les réserves de réception UI.

## P1 trouvé pendant la réception — notification sous un principal suspendu

La chaîne testée est : résultat principal → action facultative autorisée →
traitement par élément → question → notification `on_question`. Une autre
question garde le principal ouvert pour permettre sa suspension.

Avant correction, suspendre le principal laisse l'action facultative et son
enfant question actifs. `engine.claim(notification, "question-notification")`
**et** `associated_actions.check_current(notification)` réussissent : la
notification passe à `running`, alors que l'ancêtre principal est `paused`.
Aucun envoi n'a été effectué ; le contrôle appelé juste avant l'effet a été testé
directement.

La cause se trouve dans `backend/workflow_engine/associated_actions.py:159` : la
branche `source_question` contrôlait uniquement le porteur immédiat de la question,
sans vérifier sa propre filiation. La branche `associated_with` remontait déjà
cette chaîne. Le défaut réintroduisait donc la permission perdue via un chemin
de notification, sans contredire les tests verts du traitement par élément.

Preuve conservée :
[contre-épreuve rouge](preuves-review-corrections-moteur/contre-epreuve-notification-rouge.json)
et [garde au constat](preuves-review-corrections-moteur/garde-notification-au-constat.txt).

L'orchestrateur a ajouté `claim_guard(engine, db, parent, source=True)` dans cette
branche, avant le contrôle de la question (`associated_actions.py:164–172`).
Réception indépendante après correction :

- suspension avant réservation : refus avant toute réservation ;
- reprise : réservation et contrôle avant effet autorisés ;
- suspension après réservation : contrôle avant effet refusé ;
- seconde reprise : contrôle à nouveau autorisé ;
- annulation du principal : contrôle refusé ;
- principal déjà terminé avec résultat accepté : notification facultative
  autorisée tant que sa question est courante ;
- réponse à cette question : notification immédiatement obsolète et refusée.

[Preuve verte détaillée](preuves-review-corrections-moteur/filiation-pause-reprise-annulation-verte.json).
Le P1 reproduit est levé pour cette chaîne et ces transitions.

## Contre-épreuves de CONNECT-R1

| Scénario | Observation indépendante |
|---|---|
| Communication obligatoire dans `foreach.workflow` | Précontrôle avec destinataire ; lancement sans autorisation refusé ; autorisation explicite capturée et transmise à l'enfant |
| Actions facultatives | Leurs communications restent hors de l'autorisation de lancement du principal ; leur activation est distincte |
| Lecture `lookup` dans un enfant document | Aucun faux diagnostic de notification, traitement autorisé |
| Écriture `publish` ou notification `send` sur un enfant document | Un seul diagnostic d'effet incompatible, rattaché au bloc `each` et au `child_node` concret |
| `on_question` configuré sur une opération de lecture | Un seul diagnostic : une notification de question exige une capacité de notification |
| Enfant externe correctement configuré avec décision | Précontrôle vert ; aucune autorisation de notification superflue ; écriture `pending`, réservation refusée avant sa décision humaine exacte |
| Connexion modifiée puis requalifiée avant enrôlement | Refus de réutiliser l'autorisation précédente ; aucun enfant créé |
| Deux projets, second transport modifié | Refus avant création du premier enfant, aucun enfant dans les deux projets |
| Changement du manifeste après création du premier enfant | Second enfant refusé ; transaction entière annulée, aucun enfant persistant ni événement ajouté au parent |
| Action facultative locale dans une conversation multiprojet | Le terminal reste accessible ; un élément visant l'autre projet est refusé avant création de tout enfant |
| Connexion changée avant une question enfant | La question reste `waiting_input`, notification marquée `blocked`, aucune notification enfant créée ; réponse possible, seconde réponse périmée refusée |
| Planification autorisée puis connexion modifiée | Occurrence bloquée, planification désactivée, aucun run créé |

Les premières lignes et le scénario multiprojet requalifié sont reçus via les
tests ciblés existants ; les variantes d'effets, de création partielle, de portée
facultative, de question et de planification ont également leur propre scénario
dans le script indépendant.

Sources examinées : `notifications.py:22–36`, `integrations.py:76–117`,
`runtime.py:62–93`, `iterations.py:54–107`, `engine.py:239–246`,
`schedules.py:68–84` et `conversations.py:65–79`.

### Pourquoi le changement pendant l'enrôlement ne laisse pas une famille partielle

La contre-épreuve modifie réellement le fichier `.tricorder/plugins.json` après
le retour du premier `Engine.start` enfant, au moyen d'un crochet de test. Elle ne
falsifie ni `approved()`, ni la base, ni les états moteur. Le second démarrage
constate le manifeste non qualifié et échoue. Les appels précédents appartiennent
à la transaction de `iterations.activate` ; l'exception annule l'enfant créé,
ses événements et l'enrôlement du parent, qui reste `ready`.

`Store.transaction` utilise `BEGIN IMMEDIATE` (`store.py:43–55`). Une
requalification concurrente par `qualify()` ne peut donc pas remplacer le record
de confiance dans cette base avant la fin de l'enrôlement. Ce dernier point est
une conclusion de lecture du verrou transactionnel ; le scénario réellement
exécuté est le changement de manifeste après le premier enfant. Aucune course
avec transport requalifié en pleine transaction n'a été confirmée. Il n'y a pas
lieu de présenter un mock contournant ce verrou comme une reproduction réelle.

## Origines durables, pagination et lecture seule

Scénario indépendant : une demande de conversation, 35 tâches, une dépendance,
un résultat de 1 250 000 octets dans un enfant, puis recréation du service `Engine`
sur la même base. Lecture de toutes les pages de sept exécutions, du détail parent
et de l'activité de conversation.

- Les six pages présentent les 36 exécutions sans doublon ni omission.
- Chaque page garde les compteurs globaux `requests=1`, `tasks=35`, `actions=0`.
- Les 35 enfants retrouvent leur origine et le titre de la demande, même lorsque
  le parent n'est pas sur leur page.
- Le transport cumulé des pages, détail et activité représente environ 77 Ko ;
  le marqueur du gros résultat enfant n'y apparaît pas.
- Les corps persistants des runs, leurs événements et les fichiers d'artefacts
  sont identiques avant et après lecture. Les appels `_save` et `_event` étaient
  aussi instrumentés pour faire échouer toute écriture par ces chemins.

Les tests ciblés de projections complètent cette preuve : la famille facultative
reste distincte du travail principal, ses échecs ne rouvrent pas le résultat
terminé, et une simple référence parent sans appartenance réelle n'ajoute pas
d'enfant à la famille de conversation. `origin()` produit un libellé de navigation,
pas une autorisation ; l'accès depuis une conversation reste soumis à
`Conversations.checked_run()`.

Sources : `projections.py:158–210` pour la famille validée par appartenance,
`:260–278` pour l'origine bornée et `:354–380` pour les comptes avant pagination.
Pas de régression confirmée d'ascendance ou de mutation à la lecture dans ces
contre-épreuves.

## Exécutions et preuves

Commandes ciblées, sans suite globale ni reconstruction :

```sh
python3 -m unittest discover -s tests -p test_iteration_notifications.py -v
python3 -m unittest discover -s tests -p test_orchestration_projections.py -v
python3 release/2026-10-10_contrats-et-editeur/.suivi/preuves-review-corrections-moteur/reproduction.py
```

La première suite comptait 7 tests au début de la réception ; l'orchestrateur a
ajouté la non-régression du P1 découvert. Sa nouvelle exécution termine à **8/8
réussis**. Les **9/9 tests de projections** ont également été exécutés avec succès.
Les **9 scénarios indépendants** passent après correction ; la
contre-épreuve de filiation a ensuite été étendue aux transitions pause après
réservation, reprise et annulation, également vertes.

[Script rejouable](preuves-review-corrections-moteur/reproduction.py),
[neuf scénarios verts](preuves-review-corrections-moteur/neuf-contre-epreuves-vertes.json),
[empreintes à réception](preuves-review-corrections-moteur/sources-sha256-reception.json).
Le script utilise les fixtures locales du dépôt, crée des répertoires temporaires,
remplace les CLI IA par des exécutables inertes et ne fait aucun appel d'envoi.
Il accepte des noms de scénarios en arguments pour une reprise ciblée.

Une première tentative du scénario de planification utilisait à tort `frequency`
au lieu de `kind` : cette erreur du banc a été corrigée avant la réception du
scénario, et n'est pas comptée comme un défaut produit.

La portée de ce verdict reste celle des autorisations, de l'enrôlement et des
projections testées. La qualité des interfaces corrigées, les services de plugins
réels et l'ensemble des autres fonctionnalités restent des réceptions distinctes.

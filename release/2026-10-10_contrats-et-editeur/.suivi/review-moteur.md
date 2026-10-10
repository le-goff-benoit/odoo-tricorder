# Revue indépendante du moteur implémenté

10 octobre 2026. Lecture et contre-épreuves du travail en cours, avant corrections
de réception. Périmètre : recueil, traitement par élément, contrats, actions
associées, raccords moteur/runtime et commandes terminal. Interface exclue car
encore en cours de réalisation. Aucun fichier produit ni état client modifié.

**Conclusion initiale : cinq défauts P1 reproduits.** Les parcours directs sont
déjà couverts correctement ; les défauts se concentrent sur les compositions et
les autres chemins de commande. Les corrections annoncées par l'orchestrateur
ne sont pas attestées par ce rapport initial : chaque reproduction doit devenir
rouge→verte avant réception.

## P1 — Reprendre manuellement un enfant contourne ses dépendances

**Sources au moment du constat :** `iterations.py:87–89`, `:119–137`, `:157–167` ;
`engine.py:565–583`.

L'enrôlement retire `coordination_wait` et pose `iteration_wait`. `control(resume)`
ne vérifie les dépendances que pour `coordination_wait`, puis rend l'enfant actif.
Le garde de réservation ne vérifie pas `iteration_wait`. Un élément dépendant
peut ainsi commencer avant son prédécesseur, sans sa base de code autorisée.

Reproduction synthétique, commandes publiques uniquement : plan accepté avec
`A` et `C`, `C.depends_on=[A]`, `C.base_from=A` ; enrôler ; appeler
`engine.control(C, "resume")`, puis `engine.claim(C, "work")`.

```json
{"a_status":"active","c_before":"paused","c_iteration_wait":true,"c_after":"running","code_base_run":null}
```

Script exécuté : `/tmp/tricorder-review-deps.py`.

**Correction attendue :** une reprise manuelle lève seulement une suspension
humaine ; elle ne libère pas la dépendance. Le garde de réservation doit refuser
un enfant non libéré, même si un autre chemin l'a rendu actif. Tester aussi la
reprise concurrente avec la fin du prédécesseur et conserver les données et la
base figées par le moteur.

## P1 — La suspension du principal n'arrête pas les nouveaux départs dans une action composée

**Sources :** `iterations.py:157–188` ; `associated_actions.py:144–164` ;
`engine.py:584–588`.

Une action associée peut contenir un `foreach`. Ses enfants possèdent `parent`
mais pas `associated_with`. Le garde d'itération s'arrête au parent immédiat ;
celui des actions associées ne retrouve pas l'autorisation de l'ancêtre. La pause
du principal laisse l'action active et un nouvel exécutant du petit-enfant démarre.

Reproduction : résultat principal accepté, autre question principale encore
ouverte ; activation humaine de l'action ; enrôlement de son `foreach` ; pause
du principal ; réservation du travail du petit-enfant.

```json
{"main_status":"paused","action_record":"active","actionrun":"active","grandchild":"running"}
```

Script : `/tmp/tricorder-review-action-lineage.py`.

**Correction attendue :** vérifier la filiation et les autorisations applicables
sur toute la chaîne, avant la réservation et avant l'effet distant. Préserver
l'indépendance d'une action après achèvement réussi du principal, mais respecter
sa suspension/annulation. Contre-test utile : le cas d'une ancienne question déjà
répondue est, lui, actuellement bloqué grâce à `source_question` hérité ; ne pas
perdre cette protection en remaniant les gardes.

## P1 — Les actions associées d'un sous-workflow sont perdues sans avertissement

**Source :** `contracts.py:268–292` et `advanced_contracts.py:44–58`.

L'expansion copie les blocs et liens du composant, mais pas ses `actions`. Un
sous-workflow schéma 2 valide, avec une action activée sur son document, termine
normalement ; aucune action n'existe dans la définition résolue ni dans le suivi.
C'est une perte de fonctionnalité silencieuse à la réutilisation d'un workflow.

Reproduction : composant `child` avec un document automatique `doc` et une action
`accepted` sur ce document ; parent contenant uniquement le bloc sous-workflow
référant `child` ; lancer et exécuter `sub.doc`.

```json
{"status":"completed","resolved_actions":null,"associated_actions":null}
```

Script : `/tmp/tricorder-review-contracts.py`, seconde partie.

**Correction attendue :** soit transporter les actions avec une identité et des
sources correctement préfixées, soit refuser cette composition avant lancement
avec une explication. L'orchestrateur a retenu le refus explicite pour cette
version ; le test doit vérifier ce refus aussi à travers deux niveaux de
composants, sans modifier les anciennes définitions.

## P1 — Un contrat de recueil valide peut être impossible à satisfaire avec sa saisie

**Sources :** `advanced_contracts.py:15–19` ; `collection.py:35–50`.

Le validateur exige seulement une sortie liste. Un contrat `items:"number"`
est accepté, mais le recueil ne peut produire que des chaînes ou des objets
contribution. Saisir « 42 » puis confirmer échoue sur le type du premier élément ;
aucune modification du texte ne permettra de produire le nombre 42. Le même
problème existe pour `boolean` et `array`. Un `minItems` supérieur à 100 est aussi
incompatible avec la limite fixe d'ajout.

```json
{"error":"Sortie items : élément 1 incompatible avec le type number","state":"collecting"}
```

Script : `/tmp/tricorder-review-contracts.py`, première partie. L'acceptation du
contrat et l'erreur de clôture ont été reproduites. La variante `minItems>100`
est un constat de lecture, pas un test exécuté.

**Correction attendue :** restreindre les contrats du bloc de recueil à ses sorties
effectivement produites et à ses bornes réalisables, ou ajouter une vraie saisie
typée. Expliquer l'incompatibilité dans l'éditeur/validation, avant que l'utilisateur
remplisse le recueil. Une limite technique d'historique ne doit pas non plus
interdire l'opération de clôture qu'elle recommande (`collection.py:56`).

## P1 — Le terminal refuse les réponses aux questions d'une action associée autorisée

**Sources :** `conversations.py:185–192` ; `workflow_cli.py:33–49`.

Le contrôle d'appartenance accepte une demande de conversation et ses enfants
`foreach`, mais ignore `associated_with`. Après activation humaine d'une action
facultative sur un résultat, si cette action demande une précision, la commande
`answer` depuis la conversation principale est refusée comme hors périmètre.
Le terminal principal ne peut donc plus conduire ce parcours pourtant légitime.

Reproduction : conversation de diagnostic ; résultat reçu ; activation humaine
d'une action contenant une question « Quel destinataire pour le brouillon ? » ;
réponse par `workflow_cli.request(..., "answer", ...)` avec l'enfant et son vrai
identifiant de question.

```json
{"error":"Tâche d’une autre conversation","child_status":"waiting_input"}
```

Script : `/tmp/tricorder-review-terminal-action.py`. Fournisseur remplacé par les
fixtures CLI du dépôt ; aucun appel à un fournisseur réel.

**Correction attendue :** résoudre la filiation autorisée vers la demande de
conversation racine, en vérifiant chaque relation moteur et la correspondance
du record d'action, puis autoriser lecture/question/réponse prévues. Cela ne donne
pas à l'agent le droit d'activer l'action ni d'approuver ses effets. Rejeter une
action d'une autre conversation, une filiation fabriquée et une réponse périmée.

## Contrôles effectués et portée

Les scripts ont créé des projets et états temporaires, exclusivement via les
commandes du moteur. Aucun état SQLite n'a été injecté pour fabriquer le défaut.
Les cinq observations ont été envoyées immédiatement à l'orchestrateur.

Suites ciblées exécutées en parallèle :

- `python3 -m unittest discover -s tests -p test_collection_iterations.py -v` :
  **6/6 réussis**, dont deux processus réels simultanés et six éléments.
- `python3 -m unittest discover -s tests -p test_associated_actions.py -v` :
  **13/13 réussis**, dont activation concurrente et effet distant incertain.

Ces tests verts n'invalident pas les reproductions : ils n'empruntent pas les cinq
chemins problématiques ci-dessus. La réception doit ajouter ces contre-épreuves,
puis vérifier la reprise après recréation du service et les courses entre
suspension, libération et réservation. Les raccords UI, les corrections de notes,
les projections familiales, la lisibilité des erreurs d'enrôlement et la lecture
seule de `run.get` schéma 2 restent traités par l'orchestrateur/les autres agents ;
ils n'ont pas été modifiés ni déclarés validés ici.

## Réception indépendante des corrections

Après annonce de disponibilité du moteur par l'orchestrateur, les cinq
contre-épreuves ont été rejouées sur le code corrigé, sans modification produit.

| Défaut initial | Observation après correction | Réception ciblée |
|---|---|---|
| Reprise prématurée de C | La réservation refuse « Exécution suspendue ou terminée » ; la reprise ne libère plus la dépendance | Conforme |
| Petit-enfant d'action sous principal suspendu | Le garde de la filiation refuse « Action devenue obsolète, suspendue ou annulée » | Conforme |
| Actions de sous-workflow perdues | `expand` refuse explicitement la composition et demande de configurer les actions dans le principal | Conforme au périmètre retenu |
| Recueil numérique impossible | `validate` refuse avant saisie, en expliquant que ce recueil produit du texte ou des contributions structurées | Conforme |
| Réponse terminal à une action liée | La réponse « Équipe support » est enregistrée ; l'enfant passe à `completed` | Conforme |

Pour les trois premiers scripts qui tentaient auparavant une opération interdite,
le rejet attendu interrompt désormais la reproduction avec `ContractError`.
Le script de terminal a été complété d'une lecture de l'enfant pour attester la
réponse reçue, et le sous-workflow a été testé séparément du recueil désormais
refusé dès la validation. Ces résultats lèvent les cinq P1 reproduits, pour ces
scénarios exacts. Ils ne remplacent pas les nouveaux tests permanents annoncés
par l'orchestrateur, ni la réception ergonomique séparée encore en cours.

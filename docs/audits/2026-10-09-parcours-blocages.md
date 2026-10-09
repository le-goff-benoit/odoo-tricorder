# Analyse indépendante des blocages entre éditeur, terminal et moteur

Date : 9 octobre 2026. Référence de départ : rc.8, commit
`2e5ea6933326dc6f8ac4ddd1a632a240724d1354`.

**Réception backend acceptée dans le périmètre décrit.** Les cinq contradictions
reproduites et les deux compléments trouvés pendant la réception sont corrigés.
L’une empêchait l’exécution automatique d’un workflow réutilisé. Les preuves
`*-before.json` décrivent l’état initial ; la réception finale et ses sorties
distinctes figurent plus bas. La recette du parcours UI reste séparée.

## Périmètre et méthode

La question est celle de l’utilisateur : dessiner et configurer un workflow,
le lancer dans le terminal, suivre les étapes et résoudre les blocages depuis
l’application. La revue compare les appels de l’interface avec le précontrôle,
la conversation, le moteur et la planification. Elle couvre les modèles release,
support, express, meeting et demande générique, ainsi que leur réutilisation et
le périmètre multi-projets.

Les sondes créent uniquement des dépôts et bases temporaires, avec des profils,
demandes et résultats synthétiques. Les CLI de découverte retournent le code 78
si quelqu’un tente de les exécuter : aucun modèle ni compte réel n’est utilisé.
Les assertions passent par les API du moteur ; aucun état SQLite/JSON n’est
modifié pour forcer une transition. Cette passe ne reconduit pas la revue de
sécurité précédente ni le défaut de copie QA déjà confié au développeur.

La lecture du chemin UI n’est pas une preuve de clics effectués. La recette
visuelle indépendante est décrite dans
[le rapport de dépannage UI](2026-10-09-depannage-ui.md), notamment DEP-04 qui
rejoint B02 ci-dessous. Aucun build ni test UI n’a été lancé dans cette passe.

## B01 — P1 — Le mode d’une conversation contamine un modèle réutilisé

Parcours : ouvrir une ancienne exécution native depuis l’historique, revenir
dans l’éditeur, exporter/réutiliser le workflow puis choisir l’exécution
automatique ou une planification.

`Conversations.add` plaçait `driver: conversation` dans la définition avant
`Engine.start`. Cette valeur se retrouvait dans `run.original`, que `openRun`
peut charger comme définition éditable. L’export portable conservait ce champ.
Le précontrôle automatique ne signalait aucun problème ; `dispatch` ignorait
ensuite les blocs de travail puisque le champ demandait une conversation. Aucune
conversation ne possédait pourtant ces nouvelles exécutions : elles restaient
`ready`, sans worker. L’occurrence planifiée avait le même comportement.

Preuve : [sortie avant correction](2026-10-09-parcours-blocages/driver-before.json),
[sonde](2026-10-09-parcours-blocages/probe_driver.py).

Fichiers concernés : `conversations.py`, `engine.py`, `runtime.py`, `portable.py`,
`src/studio.js` (`openRun`, retour éditeur, export).

Réception attendue : le mode appartient à l’exécution, pas au modèle réutilisable.
Un ancien contexte importé doit être nettoyé ou accompagné d’une correction
accessible. Une exécution automatique ne doit jamais être abandonnée silencieusement
au profit d’une conversation inexistante. Conserver la lecture des anciens runs.

## B02 — P2 — Le périmètre multi-projets n’est pas celui qui a été contrôlé

Parcours : le projet Alpha possède un profil support ; le workflow l’utilise.
Dans Exécuter, ajouter Bêta qui ne possède pas ce pack, puis lancer.

L’interface ne contrôlait qu’Alpha avant de présenter les cases des autres projets.
Le contrôle était vert. `Conversations.open` refusait correctement Bêta, mais
`resolve_profiles` levait « Profil support-analyst absent des packs du projet »
avant la construction du message contextualisé. Le message ne nommait pas Bêta
et ne fournissait pas de diagnostic exploitable pour revenir à son réglage.
Aucune conversation partielle n’était enregistrée : cette atomicité doit rester.

Preuve : [sortie avant correction](2026-10-09-parcours-blocages/cross-project-before.json),
[sonde](2026-10-09-parcours-blocages/probe_cross_project.py).

Fichiers concernés : `src/studio.js` (`start-preview`, `launchConversation`),
`backend/studio.py`, `conversations.py`, `packs.py`.

Réception attendue : contrôler le périmètre actuellement sélectionné, afficher
le projet et le bloc concernés, proposer le réglage utile ou le retrait de cette
cible. Conserver la demande saisie pendant la correction. Ce finding complète
DEP-04 avec le cas d’un profil absent, indépendant des connecteurs externes.

## B03 — P2 — L’effort d’un bloc est affiché mais contourné par le natif

Parcours : conversation et workflow réglés sur `medium`, bloc d’analyse réglé
explicitement sur `high`, fournisseur et modèle identiques.

Sur Codex comme sur Claude, le précontrôle était vert. La définition figée
annonçait `execution.effort: high`, mais la conversation restait `medium` et
`workflow_cli.claim` autorisait la prise en charge native. Le garde comparait
fournisseur et modèle, sans comparer l’effort. L’invocation native reçoit quant
à elle l’effort de la conversation : la valeur du bloc ne modifie pas ce processus.

Preuve : [sortie avant correction](2026-10-09-parcours-blocages/effort-before.json),
[sonde](2026-10-09-parcours-blocages/probe_effort.py).

Fichiers concernés : `workflow_cli.py`, `runtime.py`, `conversations.py`,
`electron/provider-launch.cjs`.

Réception attendue : déléguer avec l’effort exact lorsque le natif ne correspond
pas, ou expliquer le conflit avant de commencer. Le précontrôle doit examiner
les capacités réelles de ce mode délégué : une étape exigeant un shell ne devient
pas exécutable dans une simple session de rédaction par cette substitution.
La sonde prouve une contradiction du protocole, pas le comportement cognitif
d’un modèle réel.

## B04 — P2 — Un workflow sans bloc IA oublie le fournisseur du terminal

Parcours : créer un workflow composé d’un bloc Question, choisir un fournisseur
dont le CLI est absent et demander le lancement dans le terminal.

Avec un PATH temporaire vide, `workflow.validate(mode=native)` ne signalait
aucun problème et `Conversations.open` créait la conversation, pour Codex comme
pour Claude. Le contrôle du CLI était placé dans la boucle des blocs de travail
natifs. Le graphe Question/Décision n’y passait pas, alors que le terminal doit
quand même démarrer le fournisseur choisi pour recevoir les demandes.

Preuve : [sortie avant correction](2026-10-09-parcours-blocages/cli-without-agent-before.json),
[sonde](2026-10-09-parcours-blocages/probe_cli_without_agent.py).

Fichiers concernés : `runtime.py::preflight`, `conversations.py::open` et entrée
de lancement natif dans `backend/studio.py`.

Réception attendue : contrôler le fournisseur au niveau de la conversation,
indépendamment des types de blocs. Préserver l’exécution automatique sans IA
d’un workflow déterministe : elle n’a pas besoin de ce CLI.

## B05 — P1 — Le profil Odoo d’un workflow générique garde le mauvais contexte projet

Contre-épreuve supplémentaire après la première réception : dessiner un workflow
générique, choisir un profil d’un pack Odoo dans un bloc, puis l’utiliser sur
plusieurs projets. Le champ interne `domain` n’est pas nécessairement présent
dans cette définition.

Avec des paramètres initiaux `19.0/custom` et une cible Bêta en `17.0`, le run
natif conservait `19.0/custom`. Passer Bêta en Online ne changeait pas ce résultat :
aperçu vert, conversation ouverte, bloc `odoo-developer` pris en charge. Le même
graphe avec `domain: odoo` était correctement refusé. La même perte de contexte
concernait un profil nommé `specialist`, déclaré dans un pack dont la politique
porte le domaine Odoo, sans aucun préfixe dans son nom.

Cause : `policy_issues` activait les règles pour le domaine explicite **ou**
l’emploi d’un profil du pack ; `conversation_parameters` n’injectait le contexte
du projet que pour le domaine explicite. Le contexte et ses gardes ne partageaient
donc pas le même critère d’application.

Preuves initiales : [profil Odoo](2026-10-09-parcours-blocages/profile-context-before.json)
et [profil sans préfixe](2026-10-09-parcours-blocages/profile-context-alias-before.json).
Ces appels n’ont exécuté aucune modification Odoo : la prise en charge et le
résultat sont synthétiques. Ils établissent néanmoins que le mauvais contexte
était accepté par le moteur.

**Correction reçue indépendamment.** `packs.py::pack_applies` applique le domaine
explicite ou l’appartenance du profil effectif au pack, avec l’ordre projet →
workflow → bloc. Les politiques et le contexte natif utilisent ce critère commun.
La [sonde ciblée](2026-10-09-parcours-blocages/probe_profile_context.py), relancée
avec `--assert-corrected`, donne les
[résultats après correction](2026-10-09-parcours-blocages/profile-context-after.json) :

- Bêta custom reçoit bien `17.0/custom`, même sans domaine explicite.
- Bêta Online refuse le workflow de module dès l’aperçu et à l’ouverture.
- Le profil `specialist`, explicite ou hérité du workflow, active les règles de
  son pack ; le nom du profil ne sert pas de détecteur de domaine.
- Passer sa voie à Studio permet le lancement avec `17.0/online`.
- Un bloc explicitement généraliste, même devant un profil spécialisé hérité,
  reste générique : aucun contexte Odoo injecté et aucune règle imposée par la
  seule installation du pack. Son paramètre métier est conservé.

Seule cette sonde ciblée a été rejouée pour le complément B05. La réception UI
des champs Odoo, également alignés par le parent, appartient au reviewer visuel.

## Contrôles indépendants sans nouveau défaut

[La sonde de contrôle](2026-10-09-parcours-blocages/probe_controls.py) et
[ses résultats](2026-10-09-parcours-blocages/controls.json) vérifient les points
suivants avec les vrais modèles livrés et des réponses de protocole synthétiques.

| Parcours | Résultat constaté |
|---|---|
| Cinq modèles métier, fournisseur/modèle présents | Précontrôle natif recevable pour release, support, express, meeting et demande générique. |
| Support, impact inconnu puis normal | Question visible dans l’état moteur ; réponse transmise à la réévaluation ; branche normale terminée, urgence ignorée. |
| Express, périmètre trop large | Recadrage demandé, correction ignorée ; réponse ne transforme pas le résultat en succès. |
| Dépendance d’une demande bloquée | L’aval reste suspendu ; la reprise est refusée. Aucun démarrage abusif. |
| Release, plan refusé | Résultat final refusé ; bloc de réalisation ignoré. |
| Meeting, compte rendu refusé | Brouillon de mail ignoré ; aucun envoi. |
| Demande générique annulée pendant une question | Réponse tardive refusée ; autre demande indépendante toujours prête. |
| Planification d’un modèle exigeant les outils natifs | Activation automatique refusée avec la capacité manquante. |

Les dépendances refusées ou bloquées restent aujourd’hui présentées comme une
attente dans certaines vues compactes. Une amélioration utile consiste à nommer
la demande amont et son refus/annulation, puis expliquer comment ouvrir le travail
de remplacement. Ce point de lisibilité n’est pas un défaut de la garde : aucune
reprise ou modification de dépendance ne doit être forcée automatiquement.

## Limites et suite

Cette analyse établit des défauts reproductibles dans les chemins applicatifs,
pas une qualification d’accès aux comptes, de plugin tiers ou de modèle. Elle ne
prouve ni récupération d’un email réel, ni release client, ni déploiement.
Les réponses synthétiques ne démontrent pas qu’un agent comprendra spontanément
toute demande en langage naturel.

Les preuves avant correction des cinq constats restent conservées. La réception backend
utilise des sorties distinctes après gel du correctif. La recette UI des
destinations de dépannage et de la conservation du brouillon appartient au
reviewer visuel. Aucun fichier applicatif, ancien rapport ou test partagé n’a
été modifié par cette revue.

## Réception backend après correction

La seconde passe utilise les API corrigées, avec des sorties séparées des preuves
initiales. Elle ne reconduit aucun clic ou build UI : le parent et le reviewer
visuel reçoivent ce périmètre séparément.

| Contrôle | Réception finale | Preuve indépendante |
|---|---|---|
| B01, conversation → historique → export/import → automatique et planification | Reçu. Deux workers documentaires locaux ont remis le contenu attendu. Les nouvelles décisions ont un nouveau nonce ; l’ancienne exécution reste identique. Un ancien marqueur direct est refusé avec une correction, l’export/import le nettoie. | [driver-after-final.json](2026-10-09-parcours-blocages/driver-after-final.json), [sonde](2026-10-09-parcours-blocages/probe_driver_after.py) |
| B02, profils et périmètre sélectionné | Reçu. Le précontrôle et l’ouverture partagent désormais le même contrôle. Bêta est nommé, le refus reste atomique, installer son pack permet le lancement sur les deux cibles. Le cas principal/importé ne lève plus avant le dialogue. Seul le profil absent est signalé ; les profils présents restent résolus. | [receipt-final.json](2026-10-09-parcours-blocages/receipt-final.json), [sonde](2026-10-09-parcours-blocages/probe_receipt.py) |
| B03, effort du bloc différent de la conversation | Reçu. Le lancement est refusé explicitement sur Codex et Claude. Aligner les efforts permet le claim ; un autre modèle ne peut être pris en charge par substitution native. Les capacités manquantes du délégué restent bloquantes. L’invocation transmet aussi l’effort sans modèle explicite. | Même sonde, plus [invocation-effort-after.json](2026-10-09-parcours-blocages/invocation-effort-after.json) |
| B04, Question seule sans CLI | Reçu sur les deux fournisseurs : diagnostic à l’échelle du workflow, ouverture native refusée. La même Question démarre bien automatiquement sans CLI. | [cli-without-agent-after.json](2026-10-09-parcours-blocages/cli-without-agent-after.json), sonde de réception |
| B05, profil Odoo sans domaine explicite | Reçu. Contexte de chaque cible appliqué, Online refusé pour la voie module ; alias sans préfixe et profil hérité reconnus. Le workflow redevenu généraliste n’hérite pas du contexte Odoo. | [profile-context-after.json](2026-10-09-parcours-blocages/profile-context-after.json) |
| Garde QA différée | Reçu sur le protocole : seule l’absence de contexte QA est différée. La préparation commence ; le claim QA reste refusé jusqu’à déclaration locale recevable. Contexte explicite production, distant ou malformé toujours bloquant ; automatique/planification toujours refusés sans copie. | [qa-readiness-final.json](2026-10-09-parcours-blocages/qa-readiness-final.json), [sonde](2026-10-09-parcours-blocages/probe_qa_readiness.py) |

Les contrôles des cinq modèles, refus, questions, dépendances et annulation ont
été rejoués après la dernière correction de résolution des profils :
[controls-final.json](2026-10-09-parcours-blocages/controls-final.json).

### Complément B02 : un profil présent ne doit pas recevoir un faux diagnostic

La première correction du chemin automatique convertit bien le profil absent
en diagnostic structuré. Elle saute cependant la résolution de **tous** les
profils lorsqu’un seul manque. Un workflow contenant `work/specialist` (installé)
et `missing/not-installed` (absent) signale alors « Profil spécialisé à charger
depuis un pack vérifié » sur `work` aussi. L’utilisateur est renvoyé vers un
réglage déjà correct. La même famille concerne un bloc natif délégué.

Ce cas est conservé dans `one_missing_profile_other_installed_profile` de
`receipt-with-default-model.json`. Résolution attendue : résoudre les profils
présents pour le diagnostic et ne signaler que les absents, tout en conservant
le refus strict avant exécution. Éviter également le doublon générique sur le
profil effectivement absent.

**Complément reçu.** La résolution partielle est maintenant réservée au
précontrôle. La sonde finale obtient exactement une issue sur `missing`, aucune
sur `work`, en automatique et en natif délégué. Les appels directs à
`Engine.start` et `Schedules.create` refusent toujours le profil absent. Le
contrôle n’a donc pas été supprimé pour simplifier le diagnostic.

### Complément B03 : l’invocation doit transmettre l’effort sans modèle explicite

Le natif autorise l’emploi du modèle par défaut du fournisseur, notamment quand
la politique optionnelle du pack Odoo est absente. Avec un workflow réglé sur
`high` et sans modèle explicite, le backend accepte la conversation et mémorise
`effort: high`. Pourtant `prepareLaunch` ne transmet ni le réglage Codex ni
`--effort` Claude, car son code conditionne l’effort à la présence de `model`.

[La sonde d’invocation](2026-10-09-parcours-blocages/probe_invocation_effort.cjs)
lit uniquement les arguments générés dans un dossier temporaire. Elle n’exécute
aucun CLI. La preuve montre l’omission sur les deux fournisseurs, tandis qu’un
modèle explicite transmet correctement l’effort. La correction doit conserver
le modèle par défaut autorisé et transmettre le réglage demandé, ou expliquer
une incompatibilité avant le lancement.

**Complément reçu après correction de `electron/provider-launch.cjs`.** Les
quatre cas Codex/Claude × modèle explicite/par défaut transmettent désormais
`high`. La [sortie après correction](2026-10-09-parcours-blocages/invocation-effort-after.json)
provient de la même sonde relancée, sans appel fournisseur.

La déclaration de contexte local de la sonde QA désigne un dossier synthétique.
Elle prouve le moment où le moteur autorise une étape ; elle ne qualifie pas une
base Odoo neutralisée, des tests métier ni un candidat de code. Aucun modèle,
service externe ou projet client n’a été exécuté pendant cette réception.

### Périmètre final de réception

Les [empreintes des dix sources reçues](2026-10-09-parcours-blocages/source-receipt-final.json)
couvrent les neuf fichiers backend modifiés et la génération des arguments
fournisseur dans Electron. Les sondes de cette revue ont été exécutées par le
reviewer ; les tests verts annoncés par le développeur ne sont pas utilisés comme
substitut à ces contre-épreuves. `git diff --check` est également vert.

Le natif exige aujourd’hui un effort cohérent entre la conversation et ses blocs
pris en charge directement. Un effort différent est refusé explicitement ; ce
correctif n’ajoute pas de délégation automatique pour ce seul écart. Les modèles
explicites différents conservent leur garde de substitution et les capacités
exigées par le bloc.

Aucun défaut bloquant restant n’a été trouvé dans ce périmètre backend. Cette
réception ne vaut pas recette visuelle complète, qualification d’un modèle réel,
preuve d’authentification ni livraison installée sur le PC.

Dernier complément reçu par relecture : `integrations.py` nomme maintenant le
plugin (titre et identifiant) et son opération dans le diagnostic, et expose les
champs `plugin`/`operation`. Les conditions de contrôle et les actions de dépannage
restent identiques. Le test ciblé du développeur
`test_remedies_distinguish_model_project_and_plugin` et son journal vert ont été
relus. Ce changement de présentation ne justifie pas de répéter les sondes métier.
L’empreinte de ce fichier est actualisée ; les neuf autres sources reçues sont
inchangées. La réception backend reste acceptée.

Complément B05 : après gel du prédicat partagé et contre-épreuve indépendante,
l’empreinte de `packs.py` a été actualisée. Les neuf autres sources du manifeste
sont inchangées ; la trace du complément précédent est conservée. Aucun autre
scénario reçu n’a été répété pour ce changement ciblé.

# Avis indépendant 4 — Actions facultatives, autorisations et reprise

Revue du 10 octobre 2026. Lecture de la proposition et du code courant ; aucun
autre avis consulté, aucun état client modifié, aucun service externe appelé.

## Conclusion

La séparation proposée entre résultat principal et actions associées convient au
besoin utilisateur. Le socle possède déjà un journal d'effets durable et une
notification de question séparée de son travail parent. Il faut les conserver,
mais une simple propriété `optional` sur un bloc ne suffira pas : fin du travail,
reprise, autorisation, agrégats d'activité et traitement par élément doivent tous
appliquer le même contrat. Les six risques ci-dessous sont des conditions de
réception, pas six raisons de différer la fonctionnalité.

## 1. Un résultat terminé pourrait rendre son action impossible à reprendre

**Actuel.** `Engine._advance` termine seulement quand tous les blocs sont acceptés
ou ignorés. `retry`, `accept`, `decide` et `reconcile_effect` exigent ensuite une
exécution active ou suspendue (`engine.py`). La notification de question contourne
ce couplage par une exécution enfant distincte (`notifications.py:queue_question`).

**Risque P0.** Exclure simplement les blocs facultatifs du calcul de fin produirait
une exécution terminée dont la reprise et la réconciliation sont interdites. À
l'inverse, maintenir le parent actif pour un Slack indisponible contredirait la
décision utilisateur et pourrait empêcher les dépendances suivantes de démarrer.

**Contrat proposé.** Conserver deux faits durables : résultat principal terminé
avec son empreinte et sa date ; actions associées avec leur propre cycle de vie.
Privilégier des exécutions d'action enfants reliées au parent, ou un agrégat ayant
des transitions équivalentes. Reprendre l'action seule ne rouvre ni le résultat,
ni ses validations, ni les enfants déjà reçus. Une dépendance métier consomme la
réussite principale, jamais la couleur globale de la carte.

**Critère.** Réunion terminée, brouillon distant en échec ; fermer et rouvrir
Tricorder, reprendre le brouillon, puis retrouver la même empreinte et la même
date de validation du compte rendu. Le travail dépendant a déjà pu commencer.

## 2. Une option pourrait empêcher tout lancement avant même son déclenchement

**Actuel.** `Engine.start` et `Conversations.open` vérifient toutes les capacités,
y compris `on_question`. Une connexion absente ou une notification non autorisée
refuse le lancement entier (`integrations.py:issues`, `engine.py:start`). Le code
distingue déjà une connexion connue d'une connexion vérifiée : cette protection
doit rester en place.

**Risque P0.** Un utilisateur qui veut produire un plan ne pourrait pas travailler
parce qu'une notification facultative nécessite une connexion Slack. Transformer
ce refus en activation implicite serait tout aussi incorrect.

**Contrat proposé.** Séparer validité du modèle, disponibilité de l'action et
autorisation. Une action facultative désactivée est hors exécution, sans échec.
Une action activée mais non configurée ou non autorisée indique précisément
« À configurer » ou « Autorisation attendue », sans bloquer le travail principal.
Elle ne s'exécute qu'après validation de son contexte et de son déclencheur encore
pertinent. Une action obligatoire conserve un prérequis bloquant. Ne pas promettre
qu'une action facultative est active simplement parce que son dessin existe.

**Critère.** Sans plugin Slack, lancer un workflow générique puis achever son
résultat ; l'état de la notification reste visible. Ajouter une connexion ne
déclenche aucun envoi ancien automatiquement et ne vaut pas autorisation.

## 3. « Réessayer » pourrait dupliquer un effet ou ne jamais pouvoir réparer

**Actuel.** `Effects.perform` enregistre l'intention avant l'appel distant et
réutilise une clé basée sur opération + événement. Une réponse perdue reste
`uncertain`. C'est une protection solide. `tool_runtime.reconcile_effect` ne peut
réconcilier que la preuve d'un envoi retrouvé. Une communication peut actuellement
proposer une reprise sans `effect_uncertain` lorsque seul `result.effect_id`
signale l'incertitude ; le journal empêche le renvoi, mais cette reprise ne résout
rien et peut consommer les tentatives (`engine.py:retry`).

**Risque P0.** La reprise d'un enfant de `foreach` avec un nouvel identifiant
d'exécution pourrait changer la clé et renvoyer l'action. Une erreur certaine
avant envoi ne doit pas non plus rester bloquée comme une réponse distante perdue.

**Contrat proposé.** Identifier l'action logique par origine stable : parent,
bloc, élément figé, événement déclencheur et opération exacte. Les tentatives
techniques gardent cette identité. Distinguer échec avant effet, effet confirmé,
résultat incertain. Pour ce dernier, bouton « Vérifier l'envoi », jamais un simple
« Réessayer ». Une preuve de non-exécution peut permettre une reprise contrôlée
de la même intention ; sans preuve, aucune répétition automatique. Une véritable
nouvelle demande d'envoi est un nouvel événement explicitement autorisé.

**Critère.** Transport synthétique qui accepte le message puis perd sa réponse ;
redémarrage, reprise ciblée de l'élément et rafraîchissements multiples produisent
exactement un appel d'envoi. Réconciliation rétablit l'état sans rejouer le travail.

## 4. Une question déjà résolue pourrait envoyer une alerte devenue inutile

**Actuel.** `runtime.dispatch` annule la notification d'une question déjà répondue
avant son départ. Le test `test_answer_before_notification_dispatch_cancels_the_obsolete_notification`
couvre ce cas. Une fois l'action réclamée, `execute_tool.check` observe son annulation
et son bail, mais ne revérifie pas la question source juste avant l'envoi.

**Risque P1.** Entre réclamation et appel distant, la question peut être résolue,
le parent annulé ou l'élément remplacé. Avec plusieurs agents, ces courses deviennent
fréquentes. Une notification retrouvée après plusieurs jours ne doit pas réveiller
une question périmée.

**Contrat proposé.** Chaque action porte un déclencheur versionné et sa règle de
validité. Revalider avant le point d'envoi ; si la question est close, marquer
« Sans objet — question résolue », sans échec. L'annulation du parent empêche de
nouveaux départs, sans prétendre annuler un message déjà transmis. Une opération
déjà en vol reste observée et réconciliable. Documenter la différence entre pause,
annulation du travail et annulation d'une action associée.

**Critère.** Répondre à la question après la réclamation mais avant l'appel simulé
de l'adaptateur : aucun message. Répondre après transmission : accusé conservé,
aucune affirmation trompeuse d'annulation distante.

## 5. Le traitement par élément pourrait étendre silencieusement une autorisation

**Actuel.** Écriture externe : décision exacte, nonce, opération et consommation
de l'accord. Notifications : activation pour la révision et identité/empreinte du
transport figées. Le catalogue de plugins ne donne aucun droit. Ces protections
sont réelles (`tool_runtime.py`, `engine.py:claim`, `integrations.py`).

**Risque P0.** Un `foreach` autorisé pour trois éléments peut devenir quatre,
changer de destinataire selon le projet ou enregistrer un brouillon distant sous
couvert de « préparer un email ». Un accord général de plan ne doit pas autoriser
implicitement tous ces effets. Un agent coordinateur ne peut accorder son propre
envoi.

**Contrat proposé.** Afficher et figer portée par élément ou par collection,
projets/comptes/destinataires et opération réellement autorisée. Texte d'email,
création de brouillon distant et envoi sont trois contrats distincts. Les actions
de fin de collection se déclenchent une fois pour cette collection figée ; une
action par élément se déclenche une fois pour chacun de ses identifiants. Toute
extension du périmètre requiert sa propre décision, sans invalider les résultats
principaux déjà reçus. Appliquer la même règle dans terminal et interface.

**Critère.** Collection de trois demandes sur deux projets : un seul récapitulatif
si portée collection, trois actions si portée élément ; ajout d'un quatrième ou
changement de compte ne réutilise pas l'autorisation antérieure. Aucun rôle agent
ne peut fournir le marqueur humain requis par l'API.

## 6. L'orchestrateur pourrait afficher une réussite trompeuse ou une panne globale

**Actuel.** `projections.health` considère tous les blocs pareil ; `focus` choisit
une prochaine action parmi les états locaux ; `conversation_activity` ignore les
exécutions terminées et ne suit que les demandes de conversation. Les notifications
enfants ne font donc pas partie de l'agrégat métier parent. Les modifier dans un
seul écran laisserait les compteurs, l'historique et le terminal contradictoires.

**Risque P1.** Le travail apparaît rouge à cause d'une option, ou vert sans révéler
un email incertain. Une centaine d'éléments peut créer une centaine d'alertes sans
montrer la cause commune. L'orchestration reste invisible malgré un nouvel intitulé.

**Contrat proposé.** Projection moteur commune : « Résultat terminé · 1 action à
reprendre », puis détail des actions avec état, déclencheur, élément/projet,
destinataire, responsable de la prochaine action, cause et commande disponible.
Séparer compteurs principaux/actions ; regrouper les causes communes tout en
gardant les actions unitaires accessibles. Un enfant d'action n'est pas un agent
de production de plus. Les lectures de suivi ne créent ni enfant ni envoi.

**Critère.** Même exécution lue dans activité, suivi parent, élément et terminal :
mêmes totaux et même prochaine action ; 100 notifications indisponibles restent
paginées, le résultat principal reste lisible et chaque action est récupérable.

## Arbitrages recommandés

- Réutiliser le journal `Effects` et le principe des exécutions de notification
  enfants ; généraliser leur provenance et leur projection avant d'ajouter des
  boutons de reprise.
- Adopter des actions associées séparées du graphe de dépendances obligatoires
  pour cette première version. Refuser qu'un résultat facultatif alimente une
  entrée obligatoire sans traitement explicite de son absence.
- Rendre la portée « par élément / après la collection » visible dans l'éditeur
  avant activation ; valeur proposée après la collection pour un récapitulatif.
- Garantir les parcours avec adaptateurs synthétiques. Les tests existants
  `test_workflow_effects.py`, `test_workflow_automation.py` et
  `test_workflow_mcp.py` fournissent des bases ; ils ne prouvent pas les nouveaux
  cycles de vie, ni un service Slack ou messagerie réel.

Avis : favorable à la proposition sous ces contrats. Aucune fonctionnalité de ce
document n'est présentée comme déjà implémentée. Cette revue n'a pas exécuté de
tests : elle identifie les exigences à prouver dans l'implémentation.

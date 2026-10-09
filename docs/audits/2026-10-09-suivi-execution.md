# Suivi d’exécution : comprendre l’activité, les attentes et les actions

Date : 2026-10-09. Relecture fonctionnelle indépendante après rc.9, avant réception de la correction de présentation. Périmètre : conversation, demandes, exécutions, sélection graphique et terminal. Ce rapport ne qualifie ni un modèle IA réel, ni une livraison client.

## Conclusion de l’analyse

L’écran ne donne pas encore une réponse fiable et immédiate à trois questions différentes : **« Un travail est-il en cours ? », « Pourquoi cela attend-il ? », « Que dois-je faire ? »**. Un unique `focus` mélange actuellement ces dimensions. Le graphe et l’inspecteur peuvent continuer à montrer un ancien plan validé tandis qu’un autre bloc a échoué. Un processus terminal vivant ne prouve pas que l’agent travaille.

La répétition des validations est aussi un problème de modèle : chaque ajout à la conversation instancie le workflow entier. Le recueil initial, les demandes issues de sa décomposition et leur consolidation prennent donc les mêmes étapes. La validation du premier plan concerne sa proposition ; elle n’a jamais autorisé automatiquement celles des autres exécutions. Il faut rendre cette portée explicite avant de changer le modèle de coordination.

Priorité immédiate : une synthèse persistante, des causes et actions distinctes, des dépendances nommées et un accès direct au bloc à traiter. La prochaine version du modèle devra distinguer coordination et demandes, sans déduire un accord à partir d’un texte ou d’un nom.

## Méthode et preuves

- Capture fournie examinée localement, non recopiée dans ce dossier : elle contient du contexte client.
- Lecture ciblée de `projections.py`, `conversations.py`, `engine.py`, `recovery.py`, `work_templates.py`, `src/studio.js`, `electron/main.cjs`, `work-request.cjs`, `terminal-context.cjs` et `workflow-states.json`.
- [Contre-épreuves de projection](2026-10-09-suivi-execution/projection-before.json), obtenues avec [cette sonde synthétique](2026-10-09-suivi-execution/probe_projection_before.py). Aucun moteur ni fournisseur exécuté. L’empreinte du code de projection est jointe au résultat.
- [Observation structurelle anonymisée](2026-10-09-suivi-execution/metadata-anonymized-observed.json), obtenue par [une sonde SQLite en lecture seule](2026-10-09-suivi-execution/probe_metadata_readonly.py). Connexion `mode=ro`, `PRAGMA query_only=ON`, transaction de lecture. Aucun titre, identifiant client, demande, email, pièce jointe, résultat textuel ou horodatage n’est exporté. Aucune transition n’a été déclenchée.
- Aucun build, test UI, appel payant, email, écriture sur projet client ou interaction avec son terminal. Les observations de présentation restent des constats de code et de capture, pas une mesure d’usage par un panel.

Attention méthodologique : `Conversations.snapshot()` reprend les exécutions suspendues dont les dépendances sont satisfaites. Cette API ne convient donc pas à une inspection de données réelles qui doit rester strictement sans effet. La sonde l’évite.

## Constats prioritaires

| ID | Constat vérifié | Conséquence utilisateur | Correction attendue |
|---|---|---|---|
| S01 | `focus()` choisit une question ou décision, puis lui attribue `status=failed` dès qu’un autre bloc a un résultat négatif. | Le titre et la couleur désignent le mauvais bloc comme source de l’échec. | Conserver l’état réel du bloc ciblé ; exposer séparément les échecs, avec leur source et cause. |
| S02 | La projection choisit une seule attente ; un travail parallèle `running` et d’autres décisions restent hors du résumé. | « Échec » ou « À répondre » peut cacher un travail encore déclaré actif ailleurs. | Compteurs d’activité et d’attention indépendants, liste des actions et accès à chacune. |
| S03 | Le rafraîchissement ne suit pas le nouveau `run.focus`. L’inspecteur conserve le bloc sélectionné après son acceptation. | L’utilisateur voit le plan validé et cherche la cause d’un échec hors champ. | Garder la sélection manuelle, afficher en permanence la prochaine action et un bouton « Voir le bloc à traiter ». |
| S04 | L’inspecteur juge un signal ancien après 10 s ; le protocole natif demande un heartbeat toutes les 60 s. | Pendant un travail normal, l’écran suggère régulièrement que l’activité est inconnue. | Afficher la date du dernier signal ; utiliser une tolérance cohérente avec le producteur, sans conclure à un arrêt. |
| S05 | `coordination_wait` donne « Attend une autre tâche », sans nom ni état de la dépendance dans la carte. | Impossible de distinguer un prérequis encore actif, une décision attendue, un refus ou une pause manuelle. | Dépendances identifiées et navigables, avec état et résultat de fin ; pause manuelle distincte. |
| S06 | Les totaux de la conversation sont calculés sur sa page courante, tandis que le total de demandes peut être global. Les filtres `active/paused` suivent le stockage, pas les libellés d’attention. | Un résumé ou filtre « En cours » peut compter une décision ou un échec comme activité ; une attente de la page suivante reste invisible. | Afficher clairement page/résultat/global ; compteurs globaux et filtres cohérents si proposés. Ne pas mélanger ces unités. |
| S07 | `agentState` est mémorisé après l’ouverture du terminal et n’est pas une observation continue de l’agent ; `active` signifie essentiellement processus fournisseur présent. | « Agent actif » ou un voyant peut être pris pour « travaille actuellement ». | Dire « Terminal connecté »/« Conversation disponible » pour la présence ; réserver le suivi du travail aux états et signaux des blocs. |
| S08 | Chaque `Conversations.add()` copie la définition entière, même pour un recueil et une consolidation. | Une demande décomposée réintroduit les portes de plan déjà rencontrées, sans expliquer leur portée. | Expliquer les accords par demande et préparer un vrai modèle de coordination, décrit plus bas. |
| S09 | Un verdict `fail` déjà accepté et aiguillé conserve le même effet global `failed` qu’un résultat rejeté non traité. | Une branche corrective normale peut rester présentée comme un échec à reprendre au mauvais endroit. | Distinguer résultat négatif pris en charge par le graphe et échec encore à examiner. La branche et son action priment pour la suite. |

### Structure observée des six exécutions

La lecture anonymisée confirme les états au moment de l’inspection :

| Élément | État utile | Dépendances |
|---|---|---|
| 1 | Décision acceptée, puis résultat d’agent `ok=false` et erreur de validation | Aucune |
| 2 à 5 | Chacun attend sa propre décision | Aucune |
| 6 | Suspendu automatiquement pour coordination | Éléments 2, 3, 4 et 5 |

Les six définitions originales sont identiques. Aucun bloc n’est `running`. C’est une observation des états persistés, pas une preuve d’absence d’activité dans un terminal externe. Les états seuls ne portent pas de rôle « recueil », « besoin client » ou « consolidation » : la présentation ne doit pas inventer ces catégories à partir des titres ou de la position.

## Contrat de projection minimal proposé

Il s’agit d’une proposition à implémenter et réceptionner ; ce schéma n’est pas une API déjà disponible.

1. **État de l’exécution** : conserver `run.status` pour le cycle de vie (`active`, `paused`, `completed`, `cancelled`) et `completion_outcome` pour son résultat. Ne pas utiliser `active` comme synonyme de travail observé.
2. **Prochaine action** : `focus` garde `node`, `title`, `status` réel du bloc et `action`. Il peut cibler une question même si un autre bloc échoue. Son statut ne devient jamais celui d’un autre nœud. Les libellés d’action tiennent compte du statut de l’exécution : une exécution suspendue avec un bloc prêt ne promet pas une poursuite immédiate.
3. **Problèmes distincts** : ajouter une liste bornée `issues`/`failures`, avec identifiant du bloc, titre, nature et résumé de cause. Le résultat complet reste derrière le détail existant. Un problème accepté et déjà aiguillé est historique, pas une invitation à rejouer ce bloc. Une incertitude d’effet externe reste explicite.
4. **Attentes** : ajouter `attention` borné et `attention_total`, ou utiliser une projection équivalente déjà paginée. Chaque entrée cible un bloc et une action : répondre, examiner une décision, examiner un résultat, comprendre un blocage. Ne pas fusionner deux propositions humaines. Limiter longueur et quantité, sans annoncer qu’une liste tronquée est complète.
5. **Activité déclarée** : conserver `counts.running`, fournir les blocs concernés et `last_signal`/source si utile. Afficher « 1 bloc en cours — dernier signal à … ». Le signal constate une déclaration récente ; il ne prouve ni progression métier ni réussite. Un signal ancien donne « activité à vérifier », pas « agent arrêté ». Pour une commande locale, une identité de processus peut compléter l’observation sans remplacer le résultat.
6. **Dépendances** : dans la conversation, fournir pour chaque prérequis son élément/run, libellé borné, projet si différent, état/résultat, et surtout le même prédicat `dependency_satisfied` que le moteur. Un run `completed` mais refusé n’est pas une dépendance réussie. Une dépendance hors de la page courante doit rester identifiable. Distinguer `coordination_hold` d’un simple prérequis non terminé.
7. **Agrégats** : compter sur toute la conversation avant pagination, et séparer ces nombres des résultats filtrés et de la page. Les catégories d’attention peuvent se recouper : une demande peut comporter une question et un échec. Ne pas présenter leur somme comme le nombre de demandes distinctes.

Exemple attendu pour une demande avec échec, question et travail parallèle :

> **Action requise : répondre dans « Préciser la demande ».** Un échec est à examiner dans « Préparer le candidat » : copie impossible. Un autre bloc est déclaré en cours ; dernier signal à 14:32. [Répondre] [Voir l’échec] [Voir le travail en cours]

Ce résumé reste exact même si le graphe est positionné sur un plan déjà accepté. Il n’exécute aucune reprise, n’accorde aucune autorisation et ne change aucune transition.

### Priorités de sélection

La question utilisateur et le blocage actionnable sont prioritaires pour l’action principale, puis la décision, le résultat à examiner et le travail prêt. Le travail en cours est une observation secondaire quand une action humaine existe. Un résultat accepté ne reprend pas la priorité au seul motif qu’il contient `verdict=fail`.

L’ordre doit être stable et partagé entre carte, bandeau, groupes du graphe et tableau de bord. Le tri actuel de `workflow-states.json` et celui de `projections.focus()` diffèrent. Une différence intentionnelle doit être décrite ; sinon les mêmes données donnent deux « priorités » concurrentes.

## Contrat de présentation

Le terminal reste le lieu de conversation. Le panneau de suivi répond à une question différente : **où en est le travail enregistré ?** Changer de demande sélectionnée n’envoie pas une nouvelle instruction à l’agent et ne change pas le périmètre du terminal. Le contexte du terminal et celui de la demande sélectionnée doivent être nommés sans imposer une nouvelle fenêtre.

Dans la zone de suivi :

- Une synthèse compacte toujours visible : activité déclarée, actions humaines, blocages et état du suivi (à jour ou dernière observation conservée).
- Une liste de demandes/exécutions lisible, avec état, cause courte et action. Le projet n’est répété que si plusieurs projets sont concernés. La sélection ne dépend pas uniquement de la couleur.
- Pour la sélection : titre, prochaine action et cause restent visibles avant le graphe. Les détails complets sont ouverts à la demande.
- Le graphe conserve la position choisie. Un bouton amène au bloc à traiter ; un signal indique qu’une nouvelle attente est apparue. Ne pas recentrer à chaque polling ni faire disparaître une réponse en cours de saisie.
- Une attente humaine affiche demande, bloc et proposition. « Approuver le plan de cette demande » est plus précis que « Recevoir le plan » quand l’action est réellement une décision. Les mots du modèle et ceux des boutons doivent décrire la même opération.
- Une déconnexion ou erreur de lecture ne transforme pas les derniers états en activité actuelle. Afficher l’horodatage de la dernière synchronisation et conserver les données consultables.

Sur la structure à six éléments, la synthèse doit permettre de comprendre immédiatement : aucun bloc déclaré en cours, un échec à examiner, quatre décisions distinctes à traiter et une consolidation attendant ces quatre éléments. Elle ne doit pas faire croire qu’il suffit d’approuver une nouvelle fois le premier plan.

## Plan commun et plans par demande : correction de modèle

`Conversations.open(initial_request=...)` crée une première exécution. `add()` en crée ensuite une par besoin, avec le même graphe. Le prompt natif appelle pourtant le recueil initial de la coordination et demande de ne pas le compter comme un besoin client. Cette distinction textuelle n’existe pas dans les données.

Pour les exécutions déjà créées : conserver leurs accords exacts et expliquer la portée de chaque attente. Le fait qu’un plan commun mentionne plusieurs tâches ne constitue pas une décision machine vérifiable sur leurs propositions ultérieures. Ni le statut, ni le nonce, ni le résultat d’une porte humaine ne doivent être copiés entre runs.

Pour de nouveaux modèles, définir explicitement :

| Rôle | Contenu | Porte humaine |
|---|---|---|
| Coordination initiale | Source et pièces, besoins identifiés, périmètres projets, dépendances, plan commun versionné | Accord sur ce plan précis et son périmètre |
| Demande exécutable | Critères et travail d’un besoin, référence au plan accepté et à sa version | Validation supplémentaire uniquement si le modèle la prévoit pour ce travail ou si sa proposition change le périmètre autorisé |
| Consolidation | Dépendances, contrôle transversal, préparation de livraison ou synthèse | Décision liée au candidat/livraison, si cette étape est prévue |

Ce modèle nécessite un contrat de rôles et de références ; il ne se résume pas à masquer une décision. Une compatibilité doit laisser les anciens modèles intacts, et l’utilisateur doit pouvoir créer des workflows sans coordination commune. Une demande support, un compte rendu ou une tâche générique ne doivent pas hériter automatiquement des étapes d’une release Odoo.

## Contre-épreuves de compréhension et de réception

Chaque scénario doit être vérifié depuis la synthèse puis jusqu’à l’action ou au détail, sans modifier JSON/SQLite ni deviner l’état depuis le terminal.

| Scénario | Réponse attendue en lisant l’écran | Critère de contrôle |
|---|---|---|
| Six éléments observés | « Rien n’est déclaré en cours ; un échec, quatre décisions, un élément attend les quatre autres. » | Causes/actions visibles, dépendances nommées, sélection du vrai bloc en un clic ; pas d’accord collectif implicite. |
| Échec A + question B + travail C | « Je peux répondre à B, examiner A, et C reste en cours. » | `focus.status=waiting_input`, source d’échec A distincte, compteur d’activité C conservé. |
| Deux décisions parallèles | « Deux propositions distinctes attendent mon accord. » | Deux accès ; approuver la première ne ferme pas la seconde. |
| QA négative déjà aiguillée | « Le contrôle a conclu non conforme ; je suis la branche corrective. » | Résultat négatif conservé comme constat ; aucune fausse reprise du contrôle accepté. |
| Branche non choisie | « Ce bloc ne s’applique pas. » | `skipped` n’est ni blocage, ni attente humaine, ni travail restant obligatoire. |
| Signal natif âgé de 30 s | « Dernier signal il y a 30 s », compatible avec le rythme de 60 s. | Pas de message d’arrêt ni de reprise automatique. |
| Signal vraiment ancien / suivi indisponible | « L’activité actuelle n’est pas confirmée. » | État observé daté, aucune promesse de travail actif ni relance aveugle. |
| Terminal vivant, aucun bloc running | « La conversation est disponible ; aucun travail de bloc n’est déclaré. » | Le voyant du terminal ne devient pas un indicateur d’exécution. |
| Plan accepté puis résultat en échec | « Une nouvelle action concerne le bloc de travail. » | La sélection manuelle du plan peut rester ; le bandeau signale la nouvelle action et permet d’y aller. |
| Dépendance terminée avec refus | « La consolidation attend une issue recevable, pas simplement une fin. » | Même prédicat de satisfaction que le moteur ; refus et succès distincts. |
| Dépendances satisfaites, pause manuelle | « L’exécution reste suspendue à ma demande. » | Aucun message affirmant qu’elle attend encore ses prérequis. |
| 26 demandes, attente dans la 26e | « Il existe une action hors de la première page. » | Agrégat global exact ou portée de page explicitement annoncée ; accès sans perdre sélection/réponse. |
| Deux projets, même titre de demande | « Je sais sur quel projet porte cette action. » | Projet visible, navigation cohérente ; le terminal ne change pas silencieusement de consignes. |
| Support critique/normal/inconnu | « Je comprends la branche choisie et la question éventuelle. » | La décision de criticité n’est pas présentée comme une validation de plan de release. |
| Compte rendu de réunion | « J’approuve ce compte rendu ; l’email préparé reste un brouillon. » | Proposition exacte lisible, préparation distincte de l’envoi. |
| Express hors périmètre / QA échouée | « Il faut recadrer / traiter le résultat négatif. » | Ne pas annoncer succès ni déploiement ; la sortie bloquante reste nommée. |
| Annulation avec tentative en cours | « L’annulation a été demandée ; un effet en cours peut rester à vérifier. » | Ne pas déduire l’arrêt physique d’un worker du seul statut de run. |
| Question saisie pendant actualisation | « Mon texte et mon choix restent conservés. » | Pas de recentrage intempestif, remplacement d’inspecteur ou perte de brouillon. |

## État de réception

Analyse et contre-épreuves initiales terminées. Les corrections applicatives de présentation et de copie candidat sont réalisées par les autres responsables ; elles ne sont pas réceptionnées par ce rapport à ce stade. Une réception ciblée devra rejouer S01–S09 et les scénarios affectés, sur des données synthétiques. La modification future du modèle de coordination reste un travail distinct de la correction d’affichage.

## Complément : implémentation du contrat de projection

Après l’analyse indépendante, l’orchestrateur a confié à son auteur l’implémentation ciblée de `projections.py`, `conversations.py` et des tests associés. **La réception indépendante de ces changements appartient donc à l’orchestrateur**, et non à l’auteur de ce complément.

Changements réalisés, sans modifier les transitions, autorisations, validations ni données existantes :

- `focus.status` décrit toujours son propre bloc ; une question indépendante reste `waiting_input`. La source d’échec est disponible dans `health={status,total,issues}` pour les projections de liste comme de détail.
- Les problèmes `accepted`/`skipped` ne constituent plus des erreurs actives. Un résultat valide `ok=true`, `verdict=fail`, explicitement prévu par l’aiguillage `route_output=verdict` avec issue `fail`, reste recevable manuellement avant de suivre sa branche corrective. `ok=false` et les erreurs de validation restent des échecs.
- Une cause concrète provenant du résultat d’un exécutant en échec est prioritaire ; une erreur de contrat reste prioritaire quand l’exécutant prétend avoir réussi. Les problèmes sont bornés à 25 entrées, titres de 120 caractères et causes de 600 caractères ; `total` conserve le compte réel. Les résultats et preuves ne sont pas recopiés dans cette synthèse.
- Les pages de conversation exposent `dependencies` avec identifiant d’élément/run/projet, demande bornée, statut, résultat de fin, `focus`, `counts`, santé synthétique et satisfaction calculée par le prédicat du moteur. La résolution part de la conversation entière autorisée, même quand le prédécesseur est hors de la page ou du filtre.
- Une liste de dépendances contient au plus 25 entrées, prérequis non satisfaits d’abord. `dependencies_total` et `dependencies_truncated` indiquent explicitement la portée ; `depends_on` conserve tous les identifiants. L’UI doit annoncer la liste partielle et ne pas en déduire une satisfaction globale.
- `coordination_hold` est également exposé pour distinguer une suspension manuelle de la simple attente d’un prérequis. Le comportement existant de reprise dans `snapshot()` est conservé.

Validation réellement exécutée :

| Contrôle | Résultat | Preuve |
|---|---|---|
| 10 nouveaux tests de projection et dépendances | Tous réussis | [Journal ciblé](2026-10-09-suivi-execution/projection-tests.log) |
| Régression conversations et audit, 41 tests | 40 réussis ; une ancienne assertion du contrat `focus=failed` à adapter | [Premier journal de régression](2026-10-09-suivi-execution/projection-regression-initial.log) |
| Ancien test adapté : véritable échec `ok=false`, question indépendante et santé séparée | Réexécuté seul, réussi | [Recontrôle ciblé](2026-10-09-suivi-execution/projection-regression-recheck.log) |
| Rejeu des cinq contre-épreuves pures initiales | Statuts de focus propres et santé séparée | [Projection après correction](2026-10-09-suivi-execution/projection-after.json) |
| Contrôle des espaces du diff ciblé | Réussi | `git diff --check` |

Les 51 cas distincts sont donc vérifiés avec leurs preuves les plus récentes. La suite globale, l’UI et le paquet ne sont pas réexécutés dans ce lot. Le manifeste [projection-source-freeze.json](2026-10-09-suivi-execution/projection-source-freeze.json) identifie les deux fichiers applicatifs et les deux fichiers de tests remis à la review. Ce complément ne prétend pas résoudre à lui seul l’ensemble de S01–S09 : les modifications UI, heartbeat et modèle de coordination ont des responsabilités distinctes.

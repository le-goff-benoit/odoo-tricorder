# Avis indépendant 3 — parallélisme, intégration et QA

Revue du 10 octobre 2026, proposition `ANALYSE.md` et code de base rc.12. Lecture
seule du produit ; aucun projet client ni autre avis consulté. Cet avis est une
analyse statique, pas une preuve d'exécution des fonctionnalités proposées.

La direction est correcte : un traitement par élément distinct d'une simple
liste, des candidats immuables et une QA du résultat commun. Le traitement par
élément doit appartenir au socle livré, conformément à la précision utilisateur.
Les six points ci-dessous complètent les invariants avant implémentation.

## 1. P0 — L'autorisation du parent doit couvrir les enfants exacts

Aujourd'hui `Conversations.add` recopie toute la définition puis crée une exécution
indépendante ; aucun lien parent/bloc/enfant n'est enregistré. La décision humaine
est liée aux entrées et au contrat de sa propre exécution. Une liste d'identifiants
de candidats provenant de la même conversation ne prouve donc pas que ces travaux
appartiennent au plan accepté.

**Contrat proposé :** figer au lancement du traitement la révision du plan, les
identifiants et contenus des éléments, leurs projets, dépendances, contrats de
sous-workflows et choix d'exécution. L'accord porte sur cette empreinte. Chaque
enfant reçoit une référence moteur au parent, au bloc, à la tentative et à l'élément.
L'intégration vérifie cette filiation, le producteur autorisé, sa tentative acceptée
et l'égalité entre sa sortie enregistrée et la référence candidate. `load` seul ne
suffit pas : il valide surtout le projet et les chemins. Les résultats documentaires
restent des résultats valides, sans candidat artificiel ni obligation de modifier.

**Critères :** ajouter un élément, modifier son périmètre ou changer le sous-workflow
après accord ne le lance pas avec l'ancien accord ; une référence importée par
`artifact`, issue d'une autre famille ou présentée comme candidate par un simple
bloc texte est refusée. L'accord d'exécution ne vaut pas accord d'application.

Sources : `backend/workflow_engine/conversations.py:87`, `:106` ;
`backend/workflow_engine/engine.py:338`, `:508` ;
`backend/workflow_cli.py:27` ; `backend/connectors/candidates.py:134`, `:279`.

## 2. P0 — Le traitement par élément exige un coordinateur durable

`dispatch_conversation` lance au plus quatre travaux dans une vague explicite ; il
annonce expressément ne pas créer de file future. `control` agit sur une seule
exécution. Réutiliser ces méthodes sans nouveau contrat laisserait les derniers
éléments prêts mais non démarrés, ou des enfants actifs après l'annulation du parent.

**Contrat proposé :** enregistrer atomiquement une famille bornée et son autorisation
de progression, avec une clé unique `(parent, bloc, tentative, élément, projet)`.
Le coordinateur persiste les enfants et leurs états, reprend après redémarrage,
alimente les places libres et réconcilie les résultats sans refaire un lancement
incertain. Le parent en attente des enfants ne consomme pas une place d'agent.
Définir pause/annulation, résultat tardif, échec d'un enfant et reprise ciblée : une
pause interdit les nouveaux départs ; une annulation interdit toute intégration
ultérieure ; les sorties tardives restent traçables. Le suivi distingue « prêts »,
« en cours », « attend une dépendance », « question » et « reprise nécessaire ».

**Orchestrateur visible et réel :** distinguer le moteur, propriétaire des états,
de l'agent coordinateur qui interprète l'objectif, propose la décomposition et
demande les délégations autorisées. Une commande moteur de délégation lie chaque
demande au plan accepté ; le moteur réserve et lance effectivement les enfants.
Le coordinateur ne crée pas des réussites par déclaration. Sa fiche affiche
objectif, fournisseur/modèle réellement sélectionnés, activité observée, éléments
confiés et raison de la prochaine action. Un journal structuré relie « R3 attend
le résultat de R1 » à cette dépendance, puis au départ réel de R3. Si aucun agent
coordinateur n'est actif et que seule la progression déterministe fonctionne,
l'affichage le dit. Un badge « orchestrateur » posé sur le parent serait insuffisant.
Une modification proposée par le coordinateur reste une nouvelle révision à
valider lorsqu'elle dépasse le périmètre accepté.

**Critères :** six éléments sous quota quatre finissent sans demander un nouveau
clic après chaque vague ; deux coordinateurs concurrents ne doublonnent rien ;
redémarrage entre réservation et création d'enfant sans orphelin ; reprise d'un
échec sans rejouer ses frères validés. Les lectures de statut seules n'autorisent
jamais une nouvelle famille de travail payant. Le suivi permet de retrouver pour
chaque enfant qui l'a demandé, pourquoi il est prêt ou bloqué, et quel processus
travaille réellement ; aucune activité IA fictive pendant une attente moteur.

Sources : `backend/workflow_engine/runtime.py:208`, `:241`, `:299` ;
`backend/workflow_engine/engine.py:357`, `:526`, `:549` ;
`tests/test_conversation_dispatch.py:129`, `:165`, `:196`.

## 3. P0 — Une dépendance d'ordre ne fournit pas la base de code attendue

La reprise actuelle copie les résultats antérieurs dans `dependency_results`,
mais `candidates.prepare` repart toujours du dépôt original. Ainsi R2 peut attendre
R1 et démarrer sans voir l'API que R1 vient de proposer. Le refus des bases différentes
à l'intégration ne corrige pas cette lacune en amont.

**Contrat proposé :** distinguer dépendance de résultat et dépendance de code.
Les branches indépendantes partent d'une même base figée. Un enfant dépendant de
code reçoit un candidat de base explicite et travaille dans sa matérialisation.
Sa contribution garde une filiation permettant de produire le delta cumulatif
par rapport à la base commune, sans réappliquer deux fois le prédécesseur. Une
dépendance de code multi-prédécesseurs requiert d'abord leur intégration. Si cette
combinaison n'est pas prise en charge, la configuration doit le signaler avant
lancement, sans assimiler l'attente à une intégration.

**Critères :** R1 ajoute une fonction, R2 dépend de cette fonction et l'utilise : la
copie réelle de R2 contient R1 ; le candidat commun contient une seule fois R1 et
R2 ; une nouvelle tentative de R1 invalide la base attendue par R2. Une dépendance
documentaire ne force aucune matérialisation de candidat.

Sources : `backend/workflow_engine/engine.py:531` ;
`backend/connectors/candidates.py:18`, `:145` ;
`backend/connectors/providers.py:133` ;
`tests/test_conversation_dispatch.py:81` vérifie l'attente, pas cette visibilité.

## 4. P1 — L'union doit valider le résultat entier, pas seulement chaque enfant

La règle « chemins distincts » manque le conflit `a` contre `a/b` : chaque enfant
peut être valide seul, leur union ne peut pas devenir un arbre de fichiers valide.
Les limites actuelles portent aussi sur l'enveloppe complète : 100 modifications,
2 Mo pour candidat/inventaire et diff. Plusieurs contributions admissibles peuvent
produire un ensemble inadmissible.

**Contrat proposé :** contrôler chemins normalisés, relations fichier/dossier,
création/suppression, contenus et permissions, puis matérialiser entièrement dans
un dossier neuf avant de publier la preuve du candidat commun. Trier contributions
et changements pour une empreinte stable ; ne dédupliquer que des changements
réellement identiques. Revalider filiation et base au moment d'accepter le résultat,
puis avant application. Les conflits et dépassements ont un diagnostic avec
éléments concernés ; aucune contribution n'est tronquée ou omise.

**Critères :** `a`/`a/b`, suppression/modification et dépassement cumulé échouent
proprement ; permutation des mêmes contributions produit le même candidat ; panne
disque/interruption conserve dépôt original et preuves enfants. Ne pas proposer
« diviser en candidats » comme résolution d'une intégration qui exige justement
un candidat commun : réduire le lot ou adapter explicitement la capacité.

Sources : `backend/connectors/candidates.py:82`, `:118`, `:145`, `:266` ;
`backend/connectors/candidate_sources.py:27`, `:44`, `:107`.

## 5. P0 — QA commune : preuve du candidat exact et capacité réellement exécutable

L'analyse exige correctement une nouvelle QA. Il faut aussi imposer un exécutant
capable de la réaliser : un agent texte géré n'a aucun outil et ne peut pas exécuter
des tests. Le bloc Commande matérialise le candidat exact, mais son projet est en
lecture seule et son environnement sans réseau. Cela couvre des tests autonomes,
pas automatiquement une installation Odoo avec base de données.

**Contrat proposé :** le bloc d'intégration est un producteur moteur reconnu par
`apply`, sans contourner les autres protections. Ses contrôles obligatoires portent
sur son propre SHA et un exécutant adapté. Une QA native conserve la préparation
explicite du candidat, le contexte d'environnement et les preuves associées. Le
suivi distingue candidat produit, tests communs réussis, application locale et
publication/déploiement ; aucun verdict texte ne remplace une action externe.

**Critères :** preuves QA des enfants, preuve d'un SHA précédent, simulation ou
compte rendu sans tests réels ne débloquent pas l'application. Deux candidats verts
séparément mais incompatibles ensemble produisent un échec commun visible. La
confirmation humaine reste liée au SHA commun ; le dépôt reste intact avant elle.

Sources : `backend/connectors/candidates.py:220`, `:266` ;
`backend/workflow_engine/runtime.py:19`, `:329` ;
`backend/connectors/providers.py:143` ; `backend/workflow_cli.py:54` ;
`backend/workflow_engine/runtime.py:52` pour le transport de déploiement non connecté.

## 6. P1 — Une preuve fonctionnelle complète doit dépasser le dispatch simulé

Les tests de dispatch existants sont utiles pour quotas, verrous et idempotence,
mais remplacent la création des processus. Le test nommé consolidation vérifie
seulement que les résultats sont transmis après l'attente. Le test candidat réel
couvre un unique travail. Aucun de ces succès ne prouve à lui seul le parcours
promis « un plan → N agents → candidat commun → QA ».

**Recette minimale livrable :** partir d'une liste saisie et d'un plan accepté par
les API normales ; créer réellement les enfants d'un sous-workflow distinct du
workflow parent ; lancer deux processus synthétiques dont les périodes d'activité
se chevauchent ; observer la troisième demande en attente de dépendance ; reprendre
un enfant après interruption ; intégrer puis exécuter une commande QA sur le
candidat commun. Faire une variante verte et une variante individuellement verte
mais collectivement rouge. Vérifier les mêmes états dans terminal et suivi graphique,
avec un résultat documentaire sans fichier, et un second projet isolé.

**Critères :** aucune écriture directe d'état pour préparer le résultat attendu,
aucun lancement payant réel nécessaire à la recette, absence de mutation du dépôt
avant confirmation, états et contributions retrouvés après fermeture/réouverture.
Le rapport de livraison sépare cette preuve moteur/processus de la qualification
réelle des fournisseurs et d'une éventuelle recette métier Odoo.

Sources : `tests/test_conversation_dispatch.py:81`, `:129` ;
`tests/test_workflow_candidates.py:18`, `:30` ;
`backend/workflow_engine/runtime.py:167`, `:307`.

Périmètre recommandé : livrer le traitement par élément durable avec suivi réel,
les bases de travail explicites, l'intégration conservatrice et sa QA commune.
La fusion intelligente de modifications du même fichier et l'application atomique
cross-dépôts restent hors de ce contrat ; leur absence doit être explicite.

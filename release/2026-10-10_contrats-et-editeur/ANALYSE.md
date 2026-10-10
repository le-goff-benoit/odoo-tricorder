# Des workflows lisibles, composables et pilotables depuis le terminal

État : analyse initiale relue par six agents indépendants, puis implémentation
et réception en cours. Décisions et écarts : [ARBITRAGES.md](ARBITRAGES.md).
Base examinée :
`0a4dd888fedbf3a1859a08af3285816cbba0de55` (0.6.0-rc.12).

## Besoin et décisions acquises

Tricorder permet de dessiner un workflow, comprendre les données et le travail de
chaque bloc, le lancer puis dialoguer depuis le terminal en suivant son exécution.
Les projets, agents et fournisseurs sont des paramètres du travail. Le workflow
reste utilisable hors Odoo. Une seule application accueille ces usages.

Un résultat peut être une liste sans lancer plusieurs agents. Plusieurs intentions
alimentent un planificateur qui produit un plan unique. Les demandes de précision
sont des échanges pendant le travail, pas des résultats finaux inventés.

Décision utilisateur : une action facultative en échec ne bloque pas le résultat
principal. Son état et sa reprise restent accessibles. Une annotation ne joue
aucun rôle dans l'exécution, les autorisations ou la validation des résultats.

## Constat sur la version de départ (rc.12)

- Les ports sont des couples nom/type primitif. `array` transporte une liste
  entière, sans contrainte sur ses éléments. Toutes les sorties sont obligatoires.
- Les questions d'un agent sont déjà persistées et reprennent la même tentative.
  Le bloc Question explicite ne recueille qu'une réponse texte. Les cycles du
  graphe sont interdits ; une boucle locale d'interaction suffit pour clarifier.
- Un lien mélange actuellement ordre de passage et transfert de données ; le
  formulaire permet de les distinguer, mais les points du graphe sont décoratifs.
- Une conversation décline tout son modèle pour chaque demande. Une dépendance
  entre demandes ne fusionne ni les fichiers produits ni leurs résultats de QA.
- Les candidats de code sont immuables, liés à un projet et à un inventaire exact
  des sources. Appliquer R1 invalide R2 créé sur la même base. Aucune consolidation
  automatique n'existe. Les preuves QA doivent porter sur le candidat exact.
- Déplacer un bloc nécessite de sélectionner une petite poignée. Le déplacement
  ne traite pas complètement l'annulation du pointeur. Les notes n'existent pas.

Sources : `contracts.py`, `engine.py`, `conversations.py`, `runtime.py`,
`connectors/candidates.py`, `src/studio.js`, `src/workflow-design.mjs`.

## Contrat proposé : quatre notions distinctes

| Notion | Exemple | Règle |
|---|---|---|
| Donnée | Liste d'intentions, plan, candidat | Nom, type, élément unique/liste, présence requise |
| Interaction | Ajouter une intention, répondre à une question | Attente durable, contribution révisable, clôture explicite |
| Issue de contrôle | Terminé, accepté/refusé, critique/normal | Choisit la suite sans modifier implicitement la forme des données |
| Action associée | Notification, brouillon distant | Déclencheur, configuration, autorisation, état et reprise propres |

Une sortie requise peut être une liste vide si son minimum est zéro. Une sortie
facultative peut être absente. Ces deux cas ne sont pas interchangeables. Un lien
liste → élément unique est refusé sans transformation explicite. Une donnée
facultative ne peut alimenter une entrée obligatoire sans traitement de l'absence.

Le contrat enrichi requiert un schéma de workflow 2. Le lecteur conserve le
schéma 1 ; les définitions figées et empreintes historiques restent inchangées.
Conversion explicite des brouillons ; aucune migration silencieuse des clients.

### Recueillir, clarifier, planifier

```text
Entrée utilisateur : recueillir les intentions
  ajouter / modifier une contribution → demander ou fournir une précision
  confirmer la liste → intentions [1…N]
                          ↓
Planifier : intentions [1…N] → plan [1]
                          ↓
Décision humaine : accepter le périmètre exact
```

Le terminal et le formulaire utilisent les mêmes commandes moteur. La collecte
conserve les contributions en cas de fermeture ; chaque modification porte une
révision pour refuser une confirmation périmée. Les précisions peuvent être
demandées dans les blocs de travail suivants, sans redémarrer tout le workflow.
La confirmation d'un recueil n'est pas l'autorisation du plan ou d'un déploiement.

### Exécution parallèle et intégration

Priorité confirmée par l'utilisateur pendant la revue : le **traitement par
élément est une capacité du socle à réaliser**, car il permet la parallélisation
et la création d'agents. Le bloc « Pour chaque élément » indique explicitement
la collection, le sous-workflow et la limite de travaux simultanés (1 = séquentiel).
Son suivi expose chaque élément et permet une reprise ciblée, conservée après
redémarrage. Une liste transmise à un planificateur reste une entrée unique.

Un traitement par élément doit être explicite. Il fige les éléments, leur
identifiant, leur projet, la version du sous-workflow et leur lien au bloc parent.
Une liste seule ne provoque pas de fan-out. Le suivi du parent montre les travaux,
leurs dépendances, le parallélisme réellement actif et leurs résultats individuels.
Les résultats documentaires ne sont pas soumis à une obligation de modifier du code.

L'intégration est un bloc moteur, pas une affirmation d'un agent : contributions
acceptées et versionnées → vérification de la même base → union des modifications
sur chemins distincts → nouveau candidat immuable → tests communs → décision.
Des changements identiques se dédupliquent ; des changements différents du même
fichier deviennent un conflit explicite. Aucun rebase automatique dans cette
première règle. Les anciennes preuves QA ne qualifient pas le résultat commun.

La sélection fige projet, exécution, bloc, tentative et SHA de chaque contribution.
Une reprise ou modification de la base impose une nouvelle sélection/qualification.
Cross-projet : un candidat et une QA par dépôt ; pas de transaction globale fictive.
L'application conserve les protections existantes et l'accord sur le SHA exact.

### Orchestration explicite et observable

Nouveau retour utilisateur : l'orchestrateur est absent ou invisible dans le
produit. La coordination devient un objet du parcours, pas un simple badge.
Le moteur applique les dépendances, réservations, limites et décisions persistées.
Un agent coordinateur peut analyser et décomposer le besoin, poser des questions
et proposer un plan ; il ne peut réécrire les états ni s'accorder une autorisation.
Un workflow déterministe n'a pas besoin d'un agent coordinateur artificiel.

Le suivi présente objectif, périmètre accepté, responsable de la coordination,
travaux confiés, agents réellement actifs, dépendances, décisions attendues et
prochaine action. Chaque attente indique qui doit intervenir et pourquoi.
La file autorisée est durable et bornée ; une consultation ne crée pas de travail
payant supplémentaire. La suspension empêche de nouveaux départs, l'annulation
se propage selon une règle affichée et les reprises ne doublonnent aucun enfant.
Le terminal pilote ces commandes ; le graphique expose la même réalité moteur.

Précision utilisateur pendant l'implémentation : dans un projet, le graphe du
workflow en cours doit montrer la demande, son plan et ses tâches comme une vue
kanban montre le travail. Le dessin de structure appartient à l'éditeur ; le suivi
expose les données réelles, les éléments en cours, les attentes et les résultats.
Les tâches doivent être visibles sur le graphe, sans ouvrir préalablement les
propriétés de chaque bloc. Leur détail reste accessible à un clic.

### Actions facultatives

Une action associée dispose d'un déclencheur explicite (question ouverte ou résultat
accepté). Son activation ne découle pas de son simple dessin dans l'éditeur.
Le résultat principal peut être terminé avec une action associée en attente ou
en échec : le suivi l'annonce et propose la reprise de cette action uniquement.
Un effet distant incertain ne doit jamais être envoyé à nouveau automatiquement.
Une action désactivée n'est pas une panne. Aucune dépendance obligatoire ne doit
consommer le résultat absent d'une action facultative.

Un texte d'email est une donnée ; enregistrer un brouillon dans une messagerie
est une écriture distante ; envoyer l'email est encore une autre action. Les
autorisations et preuves doivent porter sur l'opération réellement effectuée.

## Ergonomie de l'éditeur

L'éditeur privilégie le graphe ; le terminal garde son rôle principal pendant
l'exécution. La disposition et le contexte restent stables quand on sélectionne
un bloc. Le panneau latéral expose le besoin et les données avant les paramètres
techniques. Le JSON reste un outil de diagnostic, pas une étape du parcours normal.

- Déplacer un bloc depuis sa carte, avec seuil distinguant clic et déplacement,
  positions correctes au zoom, liens mis à jour et annulation possible. Aucun
  déplacement en lecture seule. Clavier : déplacement et annuler/rétablir.
- Ajouter à proximité de la sélection ou de la zone visible, puis sélectionner
  le nouveau bloc. Éviter l'ajout invisible à l'extrémité du graphe. Garder un
  bouton accessible ; les gestes ne deviennent jamais l'unique chemin.
- Relier depuis un point de sortie vers un point d'entrée ; choisir clairement
  issue et données dans le même formulaire que le bouton Relier. Échap annule,
  les cycles et incompatibilités sont expliqués, aucune liaison silencieuse.
- Notes déplaçables contenant du texte, visuellement distinctes, sans port ni
  statut d'exécution. Sauvegarde, export et annuler/rétablir inclus. Leur contenu
  et leur position ne changent pas l'empreinte du contrat métier. Les annotations
  ne sont ni instructions pour l'agent ni critères de réception implicites.
- Afficher « Liste d'intentions » et « Plan » sur les données ; la forme/couleur
  peut renforcer la lecture mais n'est jamais le seul indicateur.

## Recette : parcours et contre-exemples

1. Nouveau workflow : ajouter trois blocs, les déplacer à deux zooms, les relier,
   annuler une liaison et un déplacement, sauvegarder, fermer et rouvrir.
2. Ajouter/modifier/déplacer/supprimer une note ; annuler ; exporter/importer.
   Aucun bloc exécutable ajouté, aucune différence de contrat, aucun texte transmis
   comme instruction de travail. Les exécutions figées restent consultables.
3. Recueillir trois intentions sur deux échanges ; rouvrir ; refuser une clôture
   périmée ; transmettre la liste entière ; produire un seul plan.
4. Refuser liste → scalaire et sortie facultative → entrée obligatoire ; expliquer
   la correction près de la liaison. Ancien port array toujours accepté sans
   prétendre connaître la structure de ses éléments.
5. Deux travaux indépendants deviennent réellement actifs en parallèle ; un
   troisième attend sa dépendance. L'affichage correspond aux états moteur.
6. Deux candidats individuellement verts deviennent rouges aux tests communs :
   application bloquée, preuves accessibles, dépôt original inchangé. Couvrir
   conflit de fichiers, base périmée, autre projet et contribution reprise.
7. Notification facultative indisponible : résultat principal terminé, action
   visible en échec ; reprise de l'action seule sans recommencer le travail.
8. Effet distant au statut incertain : inspection et reprise contrôlée, aucun
   envoi doublonné. Workflow support et réunion couverts en plus d'une release.
9. Exécution ancienne et import schéma 1 : même sens, mêmes protections ; version
   ancienne de l'application refuse explicitement le nouveau schéma.

## Ordre de réalisation et réception

Revue indépendante de cette proposition avant arbitrage. Six angles : parcours
produit, contrats/compatibilité, intégration parallèle, effets facultatifs,
ergonomie/accessibilité de l'éditeur, recette transversale critique.

Les observations seront classées par impact, transformées en critères ou rejetées
avec justification. La livraison distinguera ce qui est implémenté et vérifié de
ce qui reste une proposition. Tests synthétiques uniquement ; aucun workflow
client modifié pour fabriquer une preuve.

Réception supplémentaire demandée : après l'implémentation et la revue, six
profils d'utilisateurs créeront, configureront et utiliseront leurs workflows sur
des projets synthétiques. Leurs retours seront consolidés, corrigés et revérifiés
avant la livraison.

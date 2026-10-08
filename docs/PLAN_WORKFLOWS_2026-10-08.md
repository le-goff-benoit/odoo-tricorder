# Tricorder — workflows génériques, exécution et décisions humaines

8 octobre 2026 · **Plan autorisé ; candidat local 0.6.0-rc.1.**

Le cœur, le code isolé, les transports locaux/MCP et le contrat du pack Crew sont
implémentés. Les preuves, les limites de qualification et les blocages externes
sont regroupés dans la release. Ce plan conserve les critères convenus, y compris
ceux qui nécessitent des comptes/cibles et une recette utilisateur.

État réel et preuves : [release Workflow Studio](../release/2026-10-08_workflow-studio/README.md).

Ce document consolide les demandes de Benoît dans la conversation du 8 octobre.
Il remplace, pour cette évolution, la proposition de migration progressive des
anciens workflows. Les identifiants Wxx désignent les travaux ; Txx les scénarios
de réception. Ce document définit les critères ; seule la release indique lesquels ont été exécutés.

## 1. Décisions et périmètre

**Produit visé :** une application de conception, exécution et suivi de workflows, utilisable hors Odoo,
permettant de concevoir graphiquement un processus, de l'adapter à un projet,
de l'exécuter et de comprendre ses résultats. Odoo Crew devient le premier pack
métier. Un projet générique fonctionne sans installation de Crew ni sources Odoo.

| ID | Demande de Benoît | Conséquence dans le plan |
|---|---|---|
| I01 | « un modèle de workflow ainsi que des workflow applicable sur un projet » | Bibliothèque, versions et adaptations par projet ; W02–W03 |
| I02 | Agent existant et choix du modèle, ou modèle standard sans agent spécialisé | Séparer profil, modèle et mode d'exécution ; W08–W09 |
| I03 | Orchestration, analyse, développement, test, gestion documentaire, communication | Blocs et sous-workflows composables ; W10–W11, W18 |
| I04 | « dessiner à la facon d'un workflow n8n » | Canevas éditable et inspecteur ; W10–W11 |
| I05 | Outil générique, employé avec les agents Odoo, avec une amélioration de qualité recherchée | Moteur indépendant, packs métier, comparaison mesurée ; W02, W17, W20 |
| I06 | « voir le workflow en action » | Même graphe en conception et exécution, états observés et historique ; W12 |
| I07 | IA pour aider à construire le workflow et trouver les capacités disponibles | Assistant de conception et catalogue de capacités ; W13–W14 |
| I08 | Envoyer des informations vers Confluence et vérifier le plugin disponible | Préparer, relire, publier et vérifier une page ; W15 |
| I09 | Staging puis production, avec ou sans génération de documentation | Cibles distinctes, recette et branche documentaire facultative ; W16, W18 |
| I10 | « user points » demandant confirmation avant la suite | Décisions humaines persistantes et autorisations précises ; W06, W11 |
| I11 | « faire table rase », anciens workflows non nécessaires | Nouveau format et nouveau moteur ; aucune compatibilité historique à réaliser |
| I12 | `changelog` doit devenir `release` ; suivi JSON accepté, mais documentation humaine lisible de l'intention, du plan et du code écrit | Une entrée documentaire humaine par release ; suivi technique regroupé et distinct ; W03, W04, W21 |
| I13 | Le design Harness et la nouvelle direction doivent guider une refonte cohérente, lisible, bien organisée, accessible aux nouveaux venus et utilisateurs expérimentés ; rechercher des guides professionnels | Recherche sourcée, architecture de l'information, prototypes et recette d'usage ; W22–W23, W10–W12, W19 |

Le mail local `~/Downloads/Harness.eml` et ses trois captures sont des références
visuelles. L'article et la vidéo X n'ont pas été consultés intégralement ; leurs
promesses de performance ne constituent aucun critère ni choix de modèles.

### Ce qui est acté et ce qui est proposé

- Acté : les treize intentions ci-dessus, dont l'abandon de la compatibilité des
  anciens workflows et le nom `release/` pour les nouvelles releases.
- Proposé comme base technique : application de bureau locale, Electron et
  terminal réutilisables, moteur Python indépendant, stockage transactionnel
  SQLite pour le runtime, définitions structurées validées et suivi JSON permis.
  W01 doit confirmer ces choix sur prototypes
  bornés ; aucune obligation de conserver une structure de code historique.
- Première cible : Ubuntu, un utilisateur local, Codex et Claude Code. Un
  connecteur annonce ses capacités réelles ; aucun fournisseur supplémentaire
  n'est promis par le mot « générique ».
- La planification n'autorise pas un déploiement, une publication Confluence ou
  une suppression des dossiers de projets existants. Aucun ancien dossier n'est
  à convertir pour construire le nouveau produit.
- Hors première version : SaaS multi-utilisateur, exécution distribuée, marketplace
  de code tiers, import de workflows n8n, optimisation automatique du choix de
  modèle et relecture complète des conversations privées.

## 2. Architecture cible

```text
Tricorder : projets · bibliothèque · canevas · assistant IA · suivi
                         │ commandes validées / événements
Moteur générique : définitions · exécution · décisions · preuves · ressources
                         │ contrats de capacités
Exécutants : commandes locales · Codex · Claude Code · services connectés
                         │ configuration métier
Packs : générique (logiciel/documentaire) · Odoo Crew
```

Le moteur est le seul écrivain de son état d'exécution. Le principal IA reste
responsable des arbitrages sémantiques et de la réception des résultats. L'UI,
l'assistant et les agents proposent des commandes au moteur ; aucun n'édite
directement sa base. Les instructions des agents ne remplacent pas les contrôles
du moteur. Le rendu Electron ne détient ni secret ni accès direct aux écritures
de production.

Les opérations soumises à accord passent par l'exécutant contrôlé qui vérifie
la décision avant l'effet. Un agent ne reçoit pas en parallèle un accès général
au même service permettant de contourner ce contrôle. Une session externe libre
peut être observée, mais n'est pas présentée comme une exécution dont Tricorder
garantit les points humains. W01/W09 doivent qualifier cette frontière pour chaque
runtime et exposer les restrictions effectivement applicables.

Le moteur peut être exécuté et testé sans Electron. Le pack Odoo contient les
règles de série, les profils métier, les outils de QA, la restauration et les
politiques de production. Le cœur ne connaît ni `__manifest__.py`, ni
`odoo-tester`, ni les formats historiques `.odoo-agents`.

### Définition, adaptation et exécution

1. **Modèle** : graphe réutilisable versionné, entrées/sorties, paramètres et
   références aux packs.
2. **Workflow du projet** : modèle choisi et adaptations explicites. Une nouvelle
   version du modèle propose un diff ; elle ne modifie pas le projet en silence.
3. **Exécution** : photographie immuable du workflow résolu, des packs et du
   contrat, puis événements et résultats. Chaque reprise possède une tentative.

Déplacer une carte est un changement de présentation ; changer un critère, une
cible ou un modèle est un changement sémantique. Seuls les changements sémantiques
affectés demandent une nouvelle validation. Une exécution commencée garde sa
définition ; une nouvelle demande prépare une révision et un redémarrage ciblé,
avec réutilisation des preuves encore valides. La première version ne réécrit
pas un graphe en pleine exécution.

### Contrat d'un bloc

Un bloc porte un identifiant stable, sa mission, des entrées/sorties typées,
ses critères, ses moyens, son exécutant, ses ressources, les preuves requises,
les issues possibles et les limites de reprise. Une arête désigne une issue et
les résultats transmis. Pas d'expression arbitraire exécutable dans un lien.

Types initiaux : **travail IA, commande, condition, décision humaine,
sous-workflow, séparation/jonction, validation, opération externe**. Les six
parties métier demandées sont des composants de bibliothèque, pas six étapes
obligatoires imposées à chaque projet.

L'orchestration s'affiche comme un responsable qui pilote le graphe ; cette
relation n'ajoute pas une fausse dépendance circulaire. Une décision sémantique
de l'IA rend une issue structurée ; le moteur vérifie qu'elle est autorisée.

### Profils et modèles

- Profil : agent existant, profil personnalisé ou **généraliste**.
- Modèle et effort : héritage du projet/workflow ou choix explicite compatible.
  L'UI affiche toujours la valeur résolue et son origine.
- Exécution : rôle appliqué dans la session principale ou session déléguée.
  Un bloc commande/humain ne demande aucun modèle.
- Les paramètres demandés et réellement observés restent séparés. Valeur non
  retournée = inconnue. Ni substitution de fournisseur, ni baisse d'effort cachée.
- Si un changement de modèle exige une nouvelle session, l'UI l'annonce. Une
  liaison au modèle principal n'autorise pas de modifier une conversation externe.
- Une politique de pack peut imposer des contrôles ou une revue indépendante.
  Les politiques sont visibles ; les résultats d'essais ne sont pas transformés
  automatiquement en politique de modèles.

## 3. `release/` : une lecture humaine, un suivi technique distinct

**Précision de Benoît :** « tu gardes très volontiers de fichiers json de suivi
pour toi », avec une documentation de « l'intention, du plan, du code écrit »
lisible humainement, sans devoir la retrouver parmi « 400 fichiers md et json ».
Le critère est la lisibilité et l'accès à l'information, pas un quota arbitraire
de fichiers techniques. Cette précision remplace la première proposition de
deux fichiers obligatoires comme objectif en soi.

Structure cible d'un projet, créée à la demande :

```text
projet/
  .tricorder/project.yaml             # packs, connexions référencées, défauts
  .tricorder/workflows/<nom>.yaml     # seulement les workflows du projet
  release/<id>/
    README.md                        # entrée humaine : intention → plan → réalisé
    sources/                         # originaux reçus, seulement si nécessaires
    livrables/                       # documents réellement demandés
    .suivi/                          # données de travail de l'IA et du moteur
      release.json                   # demande, tâches, critères, décisions
      ...                            # suivi JSON et preuves utiles, sans doublons
```

**Un point d'entrée humain par release : `README.md`.** Le nombre de fichiers
de suivi n'est pas plafonné artificiellement : ils sont regroupés dans `.suivi/`,
ont une utilité définie et ne polluent ni l'index documentaire ni les briefings.
`sources/` et `livrables/` sont créés seulement si utiles. Aucun nouveau dossier
`changelog/`. Un workflow ponctuel peut fonctionner
sans release ; les projets Odoo peuvent conserver la notion métier de release.

`.suivi/release.json` est la définition structurée versionnable : demande originale en
texte ou référence à un original, tâches avec critères et dépendances, référence
au workflow, options documentaires, décisions de périmètre. Les versions de packs
sont incluses dans la résolution du projet/run ; pas de registre redondant par
tâche. Les décisions d'autorisation d'exécution vivent dans le moteur, pas dans
une case JSON que l'agent pourrait cocher.

`README.md` conserve un ordre stable et du vocabulaire métier :

1. **Intention** : problème d'origine, résultat souhaité, périmètre et décisions
   qui l'ont modifié ; accès au texte original et aux pièces utiles.
2. **Plan** : tâches, résultats attendus, critères et dépendances ; ce qui est
   prévu, en cours, reçu ou reporté. Une prévision n'est pas présentée comme réalisée.
3. **Réalisation** : pour chaque tâche, ce que le code fait désormais, pourquoi,
   les fichiers importants et le lien vers le diff/candidat. Expliquer l'effet
   avant/après ; une liste de noms de fichiers ne suffit pas. Pour un travail
   sans code, décrire la configuration ou le livrable effectivement produit.
4. **Tests et limites** : cas vérifiés, résultat, contexte, contrôles restants et
   réserves. Des phrases compréhensibles, avec accès à la preuve au besoin.
5. **Livraison et documentation** : version, staging/production observés,
   livrables et liens Confluence quand réellement publiés.
6. **Décisions et suite** : questions qui demandent une réponse et prochaine action.

La synthèse principale reste courte, avec un tableau de tâches et des détails
repliables si nécessaire. Le détail reste dans ce document ou dans la fiche de
tâche Tricorder ; pas de nouveau compte rendu Markdown à chaque agent, phase
ou tentative. Une annexe humaine séparée exige une vraie utilité documentaire.
Les livrables demandés (guide, notes de version) restent des documents distincts.

Le moteur fournit les faits ; l'IA explique les intentions et les changements
à partir des sources/diffs, en liant ses affirmations aux tâches et preuves.
La documentation est actualisée après une révision de plan, un résultat reçu
ou une livraison, sans appel LLM à chaque événement technique. Le README et
la vue Documentation de Tricorder présentent la même projection ; aucune
deuxième version manuelle du plan, des états ou des verdicts. Une modification
documentaire demandée est enregistrée à sa source puis republiée, pas écrasée
silencieusement au prochain rafraîchissement.

État moteur proposé : une base locale transactionnelle par espace de travail et
un magasin d'artefacts dédupliqués. L'historique, les attentes, les tentatives et
les métriques restent consultables dans Tricorder. Les JSON de suivi/export
utiles à l'IA sont permis dans `.suivi/` ; chacun a une fonction et une autorité
précises. Ne pas exporter l'état complet dans un nouveau fichier après chaque
événement. Le chemin du runtime suit les conventions
du poste (`~/.local/share/tricorder/` par défaut), est configurable et sauvegardable.

À réception, exporter dans `.suivi/preuves/` un **paquet compact vérifiable** : contrat
résolu, critères/verdicts, identité du candidat, mesures disponibles, décisions
pertinentes et seules pièces probantes référencées. Pas de succès vérifiable qui
dépende exclusivement d'un chemin absolu dans le home de l'auteur. Les gros
originaux existants sont référencés par empreinte quand le projet les transporte
déjà ; l'export autonome les inclut quand nécessaire. Ce paquet n'est pas un
second journal vivant : il photographie la réception.

### Politique de conservation proposée

- Conserver les contrats, décisions, réceptions et preuves référencées jusqu'à
  suppression explicite du projet/run concerné.
- Les brouillons inutilisés et traces techniques non référencées peuvent être
  purgés après une rétention configurable, proposée à 30 jours après fin du run.
  Un run actif ou en attente humaine n'est jamais concerné.
- Une erreur conserve sa preuve utile et son motif ; supprimer le bruit ne doit
  pas effacer un incident ni permettre d'annoncer un succès.
- Afficher avant purge le volume récupérable et les catégories. Ne pas conserver
  des transcriptions complètes par défaut, ni enregistrer les secrets.
- Sauvegarde/restauration du moteur et export/import d'une release autonome sont
  testés. Un dossier réduit doit rester compréhensible et vérifiable sur un autre
  poste, même sans l'historique détaillé des interactions.
- Mémoire : décisions et leçons acceptées avec source dans le registre projet ;
  aucune consolidation Markdown par tâche. Le briefing charge le contexte utile
  à la mission et les règles applicables, pas tout l'historique.

## 4. Exécution, réception et points humains

L'état d'un nœud distingue au minimum : à préparer, prêt, en exécution, attente
humaine, résultat remis, accepté, à corriger, bloqué, interrompu et non applicable.
La **fraîcheur de l'observation** est une dimension séparée : perdre le suivi ne
prouve ni l'arrêt ni la réussite. Une fin de processus ne vaut pas réception.

Une jonction attend uniquement les branches activées pour la tentative en cours.
Une branche non choisie est non applicable ; une branche obligatoire en échec
n'est pas contournée. Les corrections sont bornées par un compteur de tentatives,
pas par une boucle sans fin. La pause empêche les prochains lancements ; une
interruption d'outil déjà en cours dépend des capacités observées du connecteur.

Chaque point humain indique sa question, le résultat à examiner, les options,
la personne attendue, sa portée et la conséquence de chaque réponse. L'attente
est durable, sans appel LLM continu. Les branches indépendantes peuvent avancer.
Répondre exige une action humaine identifiable via l'interface/CLI dédiée ;
l'agent ne peut pas satisfaire sa propre porte en écrivant « confirmé ».

Un accord d'opération référence le projet, la cible, l'action, le candidat et
le contenu proposés. Il est consommé pour cette opération. Modification de la
cible, du contenu ou du candidat = nouvelle proposition. Une réponse doublonnée
ne lance rien deux fois. Ni silence, ni timeout, ni ancienne approbation de
staging ne vaut accord de production. Le poste local n'est pas présenté comme
une plateforme d'identité multi-utilisateur inviolable.

### Parcours staging, production et documentation

```text
Analyse → Réalisation → Tests → Accord staging → Déploiement staging → Recette
  → Choix documentaire : aucune / notes de version / guide
      ├─ aucune : branche documentaire non applicable
      └─ demandée : préparer → relire → corriger si nécessaire
  → Accord production → Déploiement production → Vérification de la cible
  → Publication documentaire si prévue et autorisée
  → Communication si prévue et autorisée → Bilan
```

Le moment de préparation/publication documentaire est configurable. « Sans
documentation » désactive les livrables documentaires, pas les critères, traces
de décisions ou preuves nécessaires au fonctionnement. Le pack Odoo sera adapté
à cette distinction au lieu de recréer systématiquement ses anciens documents.

Chaque cible référence un connecteur, un identifiant d'environnement et une
opération précise. Publication Git, déclenchement de pipeline et installation
observée sont trois faits distincts. L'accord général d'un workflow ne remplace
pas la confirmation par opération d'écriture en production du pack Odoo.

Après un timeout externe, rechercher l'opération déjà effectuée avant toute
nouvelle tentative. Sans preuve ni mécanisme d'idempotence, rester « résultat
à vérifier ». La première version ne promet pas d'exactement-une-fois sur une
API distante ; elle empêche les répétitions aveugles. Un rollback est une
opération distincte, avec ses propres critères et autorisations.

## 5. Éditeur, assistant IA et intégrations

La [direction UX dans DESIGN.md](DESIGN.md#direction--concevoir-utiliser-et-suivre-des-workflows-8-octobre-2026)
précise la recherche professionnelle, la navigation, le vocabulaire, les états,
les parcours débutants/avancés, la hiérarchie du canevas et la recette d'usage.
Elle constitue la référence de conception de cette évolution. Le socle livré
du 7 octobre reste identifié comme historique ; les deux ne sont pas mélangés.
La recherche documentaire est réalisée ; prototypes et essais utilisateurs
restent à faire. Les seuils UX proposés sont des objectifs à éprouver.

Une bibliothèque à gauche, le canevas au centre, l'inspecteur à droite. Les modes
**Conception / Exécution** emploient les mêmes identifiants et positions. Les
blocs affichent mission, état, exécutant et temps ; preuves et journaux au clic.
Les couleurs expriment l'état, avec libellé et icône. Une vue liste permet les
actions au clavier ; le dessin n'est pas l'unique moyen de construire un workflow.

L'assistant peut créer un brouillon, modifier une sélection, proposer un
sous-workflow, expliquer un blocage ou rechercher un connecteur. Il remet un
patch structuré au même validateur que l'éditeur. L'utilisateur voit les ajouts,
retraits, changements de critères, de coûts potentiels et d'autorisations ; une
commande de conception ne déclenche pas l'exécution. Annulation/rétablissement
et révision concurrente sont traités. Un contenu externe est une donnée, pas
une autorisation de modifier les règles ou de publier.

Le catalogue distingue **disponible, installé, connecté, utilisable pour cette
opération, qualifié**. Les vérifications sont faites pour le runtime et le
compte réellement exécutants. Aucune disponibilité n'est inférée d'un logo.
La connexion/OAuth reste chez le fournisseur ; l'UI ne lit pas le trousseau et
ne stocke pas de token dans les workflows. Les blocs non configurés restent
dessinables mais ne sont pas déclarés exécutables.

Constat de cette session : le catalogue a retourné **Atlassian disponible,
non installé**, avec capacités annoncées Confluence de lecture/rédaction/édition.
Cela ne prouve pas l'accès depuis la future application. W13/W15 doivent vérifier
le transport, le compte, les outils et les droits. Aucun service Confluence
n'a été modifié pendant la préparation de ce plan.

## 6. Travaux et critères de réception

Les dépendances sont des dépendances de résultat. Des recherches/prototypes sur
interfaces figées peuvent avancer plus tôt ; aucune réception n'est anticipée.
Les responsabilités sont des domaines de travail, pas une consigne de multiplier
les agents. Le principal porte l'intégration et la réception de chaque jalon.

| ID | Travail / responsable | Livrable et critère de réception | Dépend de | Tests |
|---|---|---|---|---|
| W22 | Architecture de l'information et langage / conception UX | Direction sourcée, carte des objets/navigation, vocabulaire et états uniques ; cinq parcours et frontières de contexte ; prescription disponible dans DESIGN.md | — | T46, T49, T52 |
| W01 | Contrats et prototypes techniques / architecture | Schémas minimaux, API locale, états, frontière cœur/packs ; choix du canevas testé sur 100 nœuds ; aucune contrainte de compatibilité ancienne | W22 | T01, T02, T25 |
| W23 | Prototype et essais d'usage / conception UX + QA | Un prototype navigable avec états normaux/limites ; revue de cohérence, cycles formatifs nouveaux/avancés/occasionnels ; corrections et limites conservées | W01, W22 | T46, T47, T48, T49, T50, T51, T53, T54 |
| W02 | Définitions et validation / moteur | Modèles, entrées/sorties, arêtes, jonctions et sous-workflows ; erreurs localisées ; cycles non bornés et sous-workflows récursifs refusés | W01 | T01, T02, T03 |
| W03 | Projets, bibliothèque et documentation de release / moteur + UI | Projet générique sans Crew ; versions/adaptations ; une entrée humaine `release/` avec intention/plan/réalisation, suivi JSON regroupé ; export autonome et mémoire ciblée | W02 | T04, T05, T06, T36, T45 |
| W04 | Ordonnanceur et persistance / moteur | Journal transactionnel, reprises, réservation des ressources, pause/annulation ; reprise après crash sans nouveau lancement ambigu | W02 | T07, T08, T09, T10 |
| W05 | Artefacts, contrats et réceptions / qualité moteur | Résultat remis distinct d'accepté ; vérification des preuves et invalidation ciblée ; conservation des critères manquants | W04 | T11, T12, T13 |
| W06 | Décisions humaines / moteur | Choix, relecture, information et accord ; attente durable ; réponse liée à la bonne tentative et à l'opération exacte | W05 | T14, T15, T16 |
| W07 | Exécutant commande / exécution | Arguments structurés, répertoire/périmètre limités, timeout et annulation ; aucune commande interprétée depuis du texte métier | W04, W05, W06 | T17, T18 |
| W08 | Profils, modèles et packs / moteur | Profil généraliste ou spécialisé, héritage lisible et sélection ; manifeste de pack validé, références figées, moyens déclarés | W03 | T19, T20 |
| W09 | Codex et Claude / connecteurs | Lancement instrumenté, rôle dans le principal ou délégation selon capacités ; retour corrélé, erreurs, quota et reprise explicites | W07, W08 | T21, T22, T40 |
| W10 | Canevas / UI | Ajouter, connecter, déplacer, grouper, ouvrir un sous-workflow ; hiérarchie par phases, positions stables, zoom, clavier, liste, undo/redo et sauvegarde | W02, W03, W23 | T23, T24, T25, T50, T51, T54 |
| W11 | Configuration et points humains dans le canevas / UI | Inspecteur à détails progressifs ; modèles effectifs visibles ; formulaires de décision, contexte/cible/version et validation avant exécution | W06, W08, W10 | T19, T24, T26, T48, T49 |
| W12 | Exécution visible / UI + observation | Graphe actif, branches, retours, attentes et historique ; observation inconnue honnête ; documentation intention/plan/code/tests issue des mêmes faits que le README | W09, W11 | T27, T28, T29, T45, T52, T53, T54 |
| W13 | Catalogue de capacités et services / intégrations | Découverte du runtime réel, état de connexion, précontrôle lecture/écriture et transport de référence ; pas de secret dans l'UI | W07, W08, W09 | T20, T30, T31 |
| W14 | Assistant de conception / IA + UI | Langage naturel vers patch vérifiable ; contexte borné ; explique prérequis et diff ; aucune exécution implicite ni disparition de critères | W11, W13 | T32, T33, T40 |
| W15 | Documentation, Confluence et communication / intégrations | Options aucune/notes/guide ; brouillon, relecture, publication contrôlée, lien/version relus ; communication préparée distincte de l'envoi | W05, W06, W09, W13 | T34, T35, T41 |
| W16 | Staging et production / exécution | Cibles explicites, candidat figé, recette, accord lié à l'action, observation du déploiement ; reprise d'opération incertaine | W06, W07, W11, W13 | T15, T18, T37, T38 |
| W17 | Nouveau pack Odoo Crew / métier Odoo | Agents canoniques et outils utiles adaptés aux nouveaux contrats et à `release/` ; série, Studio/module, droits et production couverts ; aucun ancien moteur requis | W03, W05, W08, W09, W16 | T20, T36, T39 |
| W18 | Workflows de référence / produit | Deux parcours complets : évolution de Tricorder sans Odoo, évolution Odoo synthétique ; six composants réutilisables ; variantes documentaires/staging | W12, W14, W15, W16, W17 | T03, T34, T37, T39, T42 |
| W19 | Réception déterministe et ergonomique / QA | Matrice entière sur fixtures, défauts injectés, parcours clavier/thèmes, lecture documentaire humaine, sauvegarde, nettoyage et performances ; recette UX sur interface intégrée ; aucun rouge obligatoire | W18, W23 | T01–T39, T42, T43, T45–T54 |
| W20 | Qualification native et services / QA | Essais bornés Codex/Claude, cas inédit, Confluence sur espace de test, cible de déploiement de test ; résultats et limites séparés par capacité | W19 | T40, T41, T42 |
| W21 | Paquet et mise en service / livraison | Installation neuve générique, documentation courte, pack Odoo optionnel ; révision des consignes/chemins ; inventaire final des capacités réellement qualifiées | W19, W20 | T36, T43, T44 |

### Jalons de démonstration

| Jalon | Travaux reçus | Démonstration exigée |
|---|---|---|
| J0 — Contrat de construction | W22, W01 | Architecture de l'information, parcours, schémas et frontières compris ; prototype technique de canevas choisi |
| J1 — Moteur fiable | W02–W08 | Workflow local avec deux branches, preuve et point humain ; crash puis reprise sans doublon |
| J2 — Éditeur utilisable | W23, W09–W12 | Parcours débutant/avancé éprouvés ; dessiner, configurer un modèle/profil et voir travailler une exécution ; répondre depuis le graphe |
| J3 — Travail connecté | W13–W16 | Demande IA → workflow ; option documentaire ; staging → décision → cible de test ; publication Confluence simulée puis native |
| J4 — Généricité prouvée | W17–W20 | Parcours logiciel sans Crew et parcours Odoo ; capacités natives qualifiées et écarts mesurés |
| J5 — Livraison | W21 | Installation propre, parcours dans le paquet, documentation de release lisible et suivi technique regroupé |

Ordre conseillé : fixer l'architecture d'information W22 puis W01–W02 ; construire
W03–W08 et éprouver le prototype W23 ; réaliser le canevas W10 sur ces contrats ;
intégrer W09/W11/W12 ; poursuivre W13–W16 ; compléter le pack Odoo et
les workflows de référence ; réceptionner puis empaqueter. On ne construit pas
tout le canevas avant d'avoir une première exécution fiable.

### Périmètres de code prévus

- **Tricorder** : moteur générique isolé sous `backend/workflow_engine/`, adaptateurs
  sous `backend/connectors/`, vues de workflows dédiées dans `src/`, API explicite
  via Electron. Noms de dossiers proposés, à figer en W01.
- Le packaging actuel ne copie que `backend/*.py` : W21 doit inclure explicitement
  les nouveaux packages, schémas et ressources, et le vérifier dans le paquet.
- **Odoo Crew** : pack métier dans son dépôt canonique, profils et outils utiles
  adaptés ; profils Claude/Codex générés depuis les mêmes sources. Le nouveau
  cœur ne dépend pas de ce dépôt. Aucun copier-coller de son ancien moteur.
- Mettre à jour les consignes qui décrivent Tricorder comme uniquement lecteur
  lors de l'introduction des commandes validées. Aujourd'hui cette règle reste
  en vigueur : le présent travail n'édite aucun workflow client.
- Changer les références actives `changelog/` en `release/` dans les nouveaux
  générateurs, modèles, outils, interfaces, tests, aide et profils. Les archives
  historiques et les citations de ce diagnostic ne sont pas réécrites.

## 7. Matrice de tests

Tous les tests déterministes emploient des projets synthétiques, des faux
fournisseurs et des services simulés. Le faux fournisseur sert à vérifier le
moteur ; il ne qualifie ni un modèle ni une intégration réelle.

| ID | Scénario et défaut recherché | Résultat observable attendu |
|---|---|---|
| T01 | Définition valide, ID doublonné, port inconnu, type incompatible | Valide accepté ; invalides refusés avec bloc/connexion précis, sans sauvegarde partielle |
| T02 | Cycle libre, boucle de correction bornée, sous-workflow récursif | Seule la correction bornée autorisée ; limite atteinte = attente/blocage explicite |
| T03 | Sous-workflow appelé deux fois avec paramètres différents | Entrées/sorties et identités distinctes, aucune contamination ni jointure entre les appels |
| T04 | Projet sans Crew ni `.odoo-agents`, puis projet avec pack Odoo | Premier utilisable intégralement ; capacités Odoo seulement sur le second |
| T05 | Modèle v2 disponible pendant exécution v1 ; simple déplacement d'une carte | Diff proposé ; run v1 inchangé ; mise en page seule sans invalidation métier |
| T06 | Release de 30 tâches et 3 reprises par tâche, sans guide demandé | Une entrée documentaire humaine ; suivi JSON regroupé ; aucune forêt de comptes rendus à consulter ; volume et duplication mesurés |
| T07 | Deux branches indépendantes puis join ; autre branche non sélectionnée | Chevauchement observable des branches ; join sur branches activées seulement |
| T08 | Deux blocs veulent écrire la même ressource ; acquisition concurrente | Un seul propriétaire ; attente motivée ; aucune libération du verrou d'autrui |
| T09 | Crash avant lancement, après lancement, avant/après enregistrement du résultat | Reprise cohérente ; recherche du processus/résultat ; aucune relance aveugle |
| T10 | Pause/annulation pendant outil long ; réponse tardive d'un ancien essai | Prochains départs suspendus ; outil en cours signalé fidèlement ; ancien résultat non appliqué à la nouvelle tentative |
| T11 | Agent terminé, preuve absente, test ignoré, zéro test ou rapport contradictoire | Aucun accepté mensonger ; résultat remis conservé ; raison du refus visible |
| T12 | Changement de code/critère après réception et modification indépendante | Seules preuves affectées périmées ; lien candidat/critère contrôlé ; historique conservé |
| T13 | Preuve altérée, chemin traversant, verdict vert sans résultat métier | Altération/chemin refusés ; oracle métier détecte le faux positif, indépendamment du format valide |
| T14 | Point humain, fermeture/reboot, silence et timeout | Attente retrouvée ; zéro appel LLM pour attendre ; aucune autorisation implicite |
| T15 | Accord staging réutilisé en prod ; cible/contenu/candidat modifiés | Tous refusés ; nouvelle proposition précise ; accord valide applicable uniquement à son opération |
| T16 | Double clic, deux réponses concurrentes, réponse d'agent, ancienne tentative | Une seule décision applicable ; aucune auto-approbation ni double lancement |
| T17 | Texte avec métacaractères shell, mauvais cwd, écriture hors périmètre | Texte traité comme donnée ; contexte validé ; action hors contrat refusée par les moyens d'exécution |
| T18 | Effet externe réalisé puis réponse perdue ; reprise et rollback | Réconciliation avant répétition ; état incertain si invérifiable ; rollback distinct et autorisé |
| T19 | Héritage/override de profil, modèle, effort et session ; généraliste | Valeur résolue visible et transmise ; profil n'impose pas un sous-agent ; aucun repli caché |
| T20 | Pack absent/incompatible, outil manquant, politique renforcée, import non fiable | Précontrôle explicite ; pack non exécuté à l'import ; règles de pack applicables conservées |
| T21 | Parent, deux enfants, événements désordonnés/doublonnés et historique hérité | Identités et tentatives correctes ; déduplication ; pas de temps/jetons hérités recomptés |
| T22 | Quota, modèle indisponible, interruption fournisseur, reconnexion | Incident distinct d'un échec métier ; reprise explicitement possible ou non ; autre modèle non choisi silencieusement |
| T23 | Dessiner, supprimer une connexion, annuler, refaire, sauvegarder et rouvrir | Graphe et positions identiques ; aucun changement de contrat perdu |
| T24 | Construction et décision au clavier, lecteur d'écran ciblé, clair/sombre et zoom 125 % | Actions essentielles sans glisser-déposer ; focus et libellés ; texte lisible, couleur non exclusive |
| T25 | 100 nœuds, 150 arêtes, 10 activités et 10 000 événements archivés | Sur poste de référence décrit : ouverture p95 ≤ 2 s, interaction p95 ≤ 100 ms, aucune perte d'événement ; protocole de 20 répétitions |
| T26 | Inspecteur ajoute une porte humaine ou un modèle non disponible | Paramètres persistés ; problème avant lancement ; question et conséquence des réponses visibles |
| T27 | Exécution live, outil silencieux long, perte d'observation puis retour | Outil long pas déclaré arrêté ; fraîcheur inconnue signalée ; aucun faux vert ni pourcentage inventé |
| T28 | Réception refusée puis correction ; chronologie passée | Chemin et motif visibles ; lecture historique sans réexécution ni mutation du run |
| T29 | Coûts/jetons partiels, parent/enfants, attente humaine et chevauchement | Sous-total connu conservé ; temps cumulé distinct du délai ; aucun coût ou temps inconnu remplacé par zéro |
| T30 | Plugin connu de la conversation mais absent du runtime ; droits lecture seuls | Catalogue distingue les états ; publication non déclarée disponible ; lecture demeure possible si autorisée |
| T31 | Secret dans réponse simulée, OAuth expiré, erreur de service | Secret absent du graphe, export et logs UI ; reconnexion explicite ; pas de capture de trousseau |
| T32 | Demande IA crée/modifie un workflow ; patch invalide ou version concurrente | Prévisualisation, validation, conflit et undo ; critères préexistants conservés ; aucune exécution implicite |
| T33 | Page externe demande de supprimer les validations ou de publier en production | Contenu traité comme source ; aucune extension de permission ni porte franchie |
| T34 | Aucune/notes/guide ; relecture rejetée ; publication échouée | Sans doc : zéro génération/publication ; autres branches complètes ; échec documentaire distinct du déploiement |
| T35 | Confluence : création, mise à jour, page modifiée entre lecture et écriture | Bon espace/page ; aperçu ; conflit détecté ; lien/version relus ; pas d'écrasement ni duplication aveugle |
| T36 | Export/import release et sauvegarde/restauration moteur sur home neuf | Critères, accords, verdicts et pièces nécessaires vérifiables ; chemins portables ; absent signalé |
| T37 | Build X testé, build Y proposé ; staging vert puis cible prod erronée | Y exige ses contrôles ; cible exacte requise ; déclenchement de pipeline distinct du déploiement vérifié |
| T38 | Test de déploiement échoue ou livraison partielle | Arrêt au bon point ; effets connus exposés ; aucune répétition générale ni succès global |
| T39 | Odoo : module puis Studio, source de mauvaise série, droits utilisateur et historique | Bonne série/copie ; cas interdit refusé, cas permis accepté ; traces réelles Odoo ; contrôles du pack appliqués |
| T40 | Codex/Claude réels : généraliste, rôle spécialisé, remise et correction | Modèle demandé/observé, outils, résultat et limites archivés ; disponibilité native effectivement prouvée |
| T41 | Confluence réel sur espace de test : créer, modifier, relire et nettoyer | Capacités et droits réels confirmés ; preuve du contenu/version ; nettoyage dans le périmètre autorisé |
| T42 | Deux parcours métier bout en bout, puis cas inédit de réception | Projet générique sans Crew et projet Odoo satisfont leurs critères indépendants ; décisions et délais mesurés |
| T43 | Purge et volume : brouillon expiré, preuve référencée, attente humaine active | Seul bruit éligible supprimé ; traces utiles et états conservés ; volume explicable et sauvegarde testée |
| T44 | Installation neuve, paquet, démarrage sans Crew, ajout du pack et redémarrage | Packages Python/ressources présents ; parcours du paquet réussi ; seules nouvelles sorties `release/` ; configuration existante non supprimée |
| T45 | Lire intention, plan, code écrit, tests et livraison ; une tâche prévue, une en cours et une reçue ; puis nouveau diff et décision | Ces cinq réponses accessibles depuis le README/vue Documentation sans lire du JSON ; réalisé justifié par candidat/diff, prévu distinct du fait ; mise à jour cohérente, réserves conservées, liens utilisables |
| T46 | Trouver modèle de workflow, modèle IA, page Confluence et résultat d'une release dans l'arborescence sans décoration | Catégories et libellés compris ; chemins/hésitations relevés ; confusion workflow/exécution/profil corrigée avant réalisation détaillée |
| T47 | Première ouverture sans fournisseur connecté : essayer un exemple puis décrire un besoin | Exemple simulé explicitement, sans appel payant ; résultat et prochaine action compris ; aide facultative ; aucun JSON à manipuler |
| T48 | Utilisateur avancé ajoute une décision, change un modèle, annule et revient après interruption | Accès direct au bon contexte, raccourcis utilisables, état de navigation conservé ; pas de tutoriel imposé ni capture des raccourcis du terminal |
| T49 | Utilisateur explique ce que déclenche Exécuter/Autoriser en conception, historique et production | Bonne version, cible et effet identifiés ; aucune confusion brouillon/exécution ou staging/production ; blocage UX critique sinon |
| T50 | Workflow de 100 étapes, phase repliée avec erreur, mise à jour d'une autre branche | Vue par phases lisible, problème remonté au groupe ; positions/zoom/focus stables ; relation de pilotage distincte du flux |
| T51 | 1024/1280/1440 px, zoom 100/125/200 %, clavier et clic sans drag, français long et lecteur d'écran | Contrôles et textes accessibles, focus non masqué, contraste et cibles vérifiés ; chronomètres non annoncés chaque seconde ; liste alternative opérationnelle |
| T52 | Même tâche vue dans carte/liste/chronologie/documentation ; états ancien/inconnu/à examiner | Même nom, verdict et prochaine action issus du même état ; aucune contradiction ni copie documentaire divergente |
| T53 | Premier usage, filtre vide, panne, droits insuffisants et déconnexion après brouillon | Messages différents et action utile ; données conservées ; décision durable, aucune cascade de toasts ni fausse publication |
| T54 | Rafale d'événements et animations réduites ; lecture ou saisie en cours | Aucun vol de focus, auto-défilement imposé ou déplacement de carte ; état compréhensible sans animation ; notifications bornées |

### Jeux et moyens de test

- **Générique** : projet logiciel synthétique avec exigence observable et test
  volontairement fautif ; processus documentaire sans code ; workflow commande
  seule ; workflow principal sans enfant ; workflow à deux enfants.
- **Odoo** : modules/pack Studio synthétiques sur copies locales isolées, série
  explicitement choisie avant essai ; utilisateur ordinaire et cas historique.
  Aucun test en production ni utilisation d'une base client partagée.
- **Services** : faux Confluence, faux déploiement, événements CLI enregistrés et
  synthétiques avec erreurs ; compteur d'effets externes pour déceler les doublons.
- **Natif** : comptes fournisseurs disponibles, espace Confluence de test et cible
  staging jetable désignés avant l'essai. Les écritures sont annoncées et nettoyées.
  Une cible de test simule le rôle « production » ; aucune recette réelle en prod.
- **Oracle** : attendus et données figés avant l'exécution ; témoins corrects et
  défauts injectés acceptés/refusés à bon escient. Le texte produit par l'agent
  ne constitue jamais à lui seul l'attendu du test.

### Commandes de contrôle prévues

Les scripts npm ci-dessous existent au moment du plan. Les nouvelles suites
seront intégrées à leur découverte ; leurs fichiers n'existent pas encore.

```bash
# Dépôt Tricorder : contrôles Python/JS, puis Electron et paquet
npm test
npm run test:ui
npm run dist
npm run test:packaged
git diff --check

# Dépôt Crew, uniquement pour les changements de son pack/profils
python3 scripts/odoo_flow.py validate
python3 -m unittest discover -s tests -v
./build.sh --output-root /tmp/tricorder-crew-workflows-build
./build.sh --output-root /tmp/tricorder-crew-workflows-build --check
```

Les commandes Crew ci-dessus sont celles de l'outillage courant ; W17 doit
remplacer le contrôle de l'ancien graphe par celui du nouveau pack avant de
retirer l'ancien moteur. Le contrôle de parité des profils reste requis. Utiliser
un répertoire temporaire neuf par essai de build. Les campagnes natives ne sont
pas incluses dans `npm test` ni dans la CI déterministe.

Pour chaque Wxx : tests ciblés correspondant aux Txx, puis contrôles des
consommateurs touchés. Aux jalons J4/J5 : matrice complète sur le candidat
intégré et parcours du paquet. Répéter une preuve seulement si code, contrat,
environnement ou dépendance affectée a changé. Dans cette préparation de plan,
seuls les liens, dépendances, couvertures et la cohérence documentaire sont vérifiés.

## 8. Mesurer la qualité et décider de la livraison

Comparer d'abord le nouveau dispositif à son exécution directe sur les **mêmes
cas**, avec modèle/effort/outils fixés. Tester ensuite le choix de modèles comme
une expérience distincte. Prévoir un cas inédit et un ordre alterné, au moins
trois répétitions par variante pour les cas comparés ; présenter la dispersion,
les incidents et les reprises, sans prétendre qualifier tous les métiers.

Mesures : satisfaction des critères au premier passage et à réception, défauts
critiques, reprises motivées, décisions humaines, délai jusqu'à réception,
temps cumulé des agents, jetons/cache réellement retournés, coût lorsqu'il est
connu, volume de stockage, fichiers techniques et nombre de documents à ouvrir
pour comprendre la release. L'essai de lecture T45 mesure aussi le temps pour
retrouver les cinq informations, sans imposer un quota arbitraire de JSON. Une erreur critique
ne se compense pas par le temps économisé.

Les budgets d'appels natifs et prévisions d'effort seront fixés **avant le
démarrage du développement/de la campagne**, après J0 et identification des
comptes disponibles. Pas de durée fictive déduite du nombre de blocs, ni de
conversion en charge humaine. Ce plan fournit l'ordre et les critères, pas un
engagement calendaire non mesuré. Les difficultés principales sont W04, W06,
W09 et les écritures externes W15/W16 ; le canevas vient ensuite.

Une tâche est reçue lorsque son résultat attendu est vérifié, avec preuves
liées au candidat. Une capacité native indisponible reste **non qualifiée**,
même si son simulateur passe. W20 produit un bilan par capacité ; l'intégration
Confluence complète reste ouverte si aucun compte/espace de test n'est fourni.
Une livraison partielle peut être proposée avec ces fonctions désactivées et
ces limites explicites ; elle ne satisfait pas silencieusement tout le périmètre.

### Dépendances externes, à résoudre au moment utile

| Sujet | Point nécessaire | Impact si absent |
|---|---|---|
| Codex/Claude | Capacités CLI réelles et comptes disponibles pour W20 | Connecteur simulé seulement, qualification native incomplète |
| Atlassian | Installation/connexion, espace de test et droits adaptés | Conception et simulateur possibles ; publication Confluence réelle bloquée |
| Déploiement | Premier mécanisme cible identifié : pipeline/API/commande et environnement de test | Contrat générique testable ; adaptateur réel non qualifié |
| Distribution | Nom final, identité du paquet et emplacement de distribution | Tricorder est le nom de l’application ; identifiant technique odoo-tricorder conservé |
| Essais UX | Participants nouveaux, expérimentés et occasionnels pour W23, protocole dans DESIGN.md | Revue experte et prototypes possibles ; validation utilisateur non acquise ; cœur indépendant peut avancer |

Aucune de ces informations n'empêche de développer le cœur. Aucune n'est
inventée ni obtenue en demandant des secrets dans une conversation.

## 9. Références du diagnostic et état de ce plan

Sources locales consultées : `backend/observation.py`, `backend/agent_launch.py`,
`backend/catalog.py`, `src/plan-view.js`, `src/work-view.js`, `package.json`,
`docs/DESIGN.md`, `tests/desktop.spec.cjs` dans Tricorder ;
`scripts/odoo_flow.py`, `scripts/odoo_reception.py`, `docs/ARCHITECTURE.md`,
`docs/RELEASE_PLAN.md`, `docs/QA_COVERAGE.md`, `docs/MODELS.md` et le bilan
`docs/quality-lab/pilotage-2026-10-07/README.md` dans Crew.

Révisions observées : Tricorder `a3f51d1bd108bbdbaf1c6eef944f86c856ce6912`
(package 0.5.1), Crew `1f6bbf28b63f3fd2bba53830d4b93208247fd9ef`.
Ces références servent au diagnostic, pas à une obligation de compatibilité.

**État de réalisation :** voir la release et ses preuves. Le bilan distingue les
contrôles locaux, les essais natifs et les qualifications distantes manquantes.
Les nouvelles releases utilisent `release/` ; les anciens projets clients restent
intacts. Aucune préparation de modèle ne vaut activation ou publication.

## Compléments actés pendant l’implémentation

| Travail | Intention et réalisation attendue | Recette |
|---|---|---|
| W24 | Terminal dans la création et l’adaptation d’un modèle ; consignes `AGENTS.md` livrées, versionnées et installées/mises à jour automatiquement | T55 terminal réel, modification de fichier puis rechargement validé ; T56 mise à jour idempotente, règles personnalisées préservées |
| W25 | Icône Ubuntu, fermeture vers la barre, statuts et raccourcis | T57 fenêtre masquée, processus actif ; T58 statuts/décisions/récurrences dans le menu ; contrôle visuel sur le bureau cible |
| W26 | Récurrences : fréquence, fuseau, versions figées et prérequis avant activation | T59 heure d’été/hiver, reprise sans rafale ni chevauchement ; T60 simulation distinguée du réel, pause/réactivation |
| W27 | Plugins extensibles configurables depuis le terminal ; capacités communes aux blocs, agent dédié facultatif | T61 nouveau plugin visible sans changement de code ; T62 inventaire natif filtré sans secret ni faux état connecté ; T63 bloc IA sans profil spécialisé |
| W28 | Projets = dépôts Git ; workflows globaux indépendants pour messagerie, support et autres usages transverses | T64 racine Git exigée, doublon/sous-dossier/dépôt nu refusés ; T65 exécution et récurrence globales sans projet ; T66 futur passage explicite d’un cas global à un projet, avec trace |
| W29 | Liaisons à angles droits | T67 segments orthogonaux en conception/exécution et déplacement ; T68 vérifier les grands graphes, les chemins de retour et les collisions |

Les workflows globaux ne sont pas des modèles de bibliothèque : ils ont leurs
propres exécutions, décisions et récurrences. Un modèle reste une définition
réutilisable, adaptable dans le contexte global ou dans un projet Git.

Le terminal configure les outils natifs dans le périmètre autorisé. Le catalogue
Tricorder reflète leur présence mais ne transforme pas une installation en
connexion authentifiée, en accès effectif à un outil ou en autorisation d’envoi.
Un nouveau plugin ne doit pas nécessiter un nouveau type de bloc ni un nouveau
rôle d’agent. L’adaptateur de fournisseur qualifie ses outils au lancement.

L’exemple « NECA → Slack/Telegram/Signal » reste un brouillon tant que le compte,
l’expéditeur exact, le destinataire et le transport ne sont pas configurés et
vérifiés. Aucune surveillance réelle ni notification ne résulte de la seule
création du modèle.

### W30 — Workflow portable, W31 — Mise à jour de l’application

- **W30 / T69–T71** : exporter un fichier `.tricorder-workflow` autonome avec
  sous-workflows et choix de modèles ; importer après aperçu dans un autre
  contexte/poste ; aucune activation ni reprise d’accord. Vérifier le format
  inconnu, les dépendances absentes, les imports répétés et l’association Ubuntu.
- **W31 / T72–T74** : vérifier la release GitHub stable à l’ouverture ; comparer
  correctement les versions, dont les préversions ; présenter notes et paquet
  Ubuntu. Réseau indisponible et limites API non bloquants. Aucune installation
  ou fermeture automatique d’un workflow en cours.

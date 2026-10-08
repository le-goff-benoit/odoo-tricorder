# Socle visuel Tricorder

## Direction — concevoir, utiliser et suivre des workflows (8 octobre 2026)

La [release](../release/2026-10-08_workflow-studio/README.md) distingue les fonctions
livrées des prescriptions encore à qualifier. Le
[plan de développement et de tests](PLAN_WORKFLOWS_2026-10-08.md) porte les critères.

**Tricorder est l’application ; l’éditeur est une fonctionnalité.** À la demande
de Benoît, aucun titre « Éditeur de workflows » ne coiffe la navigation globale.
L’accueil présente l’activité. Les workflows globaux, projets Git, modèles,
récurrences et connexions sont des destinations stables. L’éditeur, l’exécution,
l’historique et la documentation sont les vues d’un workflow ouvert.

La barre latérale aligne des icônes SVG de 19 px et des lignes de 38 px, avec
quelques séparateurs, sans slogan ni titre de fonctionnalité. Marque et barre
supérieure ont la même hauteur. Mises à jour et thème sont regroupés en pied.
Sous 850 px, les icônes restent visibles avec noms accessibles et infobulles ;
les libellés masqués ne suppriment aucune action. Ces dimensions sont des choix
locaux, vérifiés à 1 280, 1 024 et 800 px, pas une norme universelle.

### Références et choix du projet

Recherche web effectuée le 8 octobre 2026 dans les publications de leurs auteurs
et les documentations officielles. Les principes sourcés ci-dessous sont des
repères professionnels ; les parcours, libellés, dimensions et seuils proposés
ensuite sont des choix Tricorder à éprouver, pas des résultats d'étude acquis.

| Référence consultée | Enseignement retenu | Application proposée dans Tricorder |
|---|---|---|
| [NN/g — utilisateurs des applications complexes](https://www.nngroup.com/articles/complex-apps-users/) | Expertise métier, ancienneté et maîtrise de l'interface sont différentes | Tester nouveaux utilisateurs, habitués occasionnels et utilisateurs avancés ; aucune étiquette permanente « débutant » |
| [NN/g — divulgation progressive](https://www.nngroup.com/articles/progressive-disclosure/) | Présenter d'abord les options fréquentes, rendre accessibles les options spécialisées | Mission et résultat avant fournisseur, paramètres de modèle et traces ; options avancées accessibles directement |
| [NN/g — heuristiques d'utilisabilité](https://www.nngroup.com/articles/ten-usability-heuristics/) | Visibilité de l'état, cohérence, reconnaissance, contrôle et récupération | Même vocabulaire partout, effets des actions prévisibles, undo, raisons d'échec compréhensibles |
| [NN/g — tester l'arborescence](https://www.nngroup.com/articles/tree-testing/) | Vérifier libellés et catégories avant de travailler le rendu | Retrouver un résultat, une connexion ou un modèle de workflow dans une arborescence sans décoration |
| [n8n — groupes de canevas](https://docs.n8n.io/build/understand-workflows/workflow-components/canvas-groups) | Regrouper et replier des nœuds pour lire les grands workflows | Vue par phases et ouverture progressive ; un groupe visuel reste distinct d'un sous-workflow exécutable |
| [n8n — sous-workflows](https://docs.n8n.io/flow-logic/subworkflows/) | Composer des processus avec des entrées explicites | Six composants métier réutilisables avec contrats, lisibles à plusieurs niveaux |
| [Carbon — états vides](https://www.carbondesignsystem.com/building-blocks/core/patterns/empty-states) | Un état sans contenu explique la situation et la prochaine action | Exemple utilisable à la première ouverture ; distinguer projet vide, filtre vide, connexion absente et panne |
| [Carbon — notifications](https://www.carbondesignsystem.com/building-blocks/core/patterns/notifications) | Adapter le message et son niveau d'interruption à sa pertinence | Décision durable liée à un bloc ; pas de notification pour chaque appel d'outil ni modal qui vole le focus |
| [Microsoft HAX — interactions humain/IA](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/) et [explication d'une action](https://www.microsoft.com/en-us/haxtoolkit/guideline/make-clear-why-the-system-did-what-it-did/) | Prévoir capacités, limites, correction et explication dans l'expérience IA | Montrer le périmètre de la proposition, son diff, ses prérequis et les faits qui motivent un blocage |
| [W3C — alternative au glisser-déposer](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), [cibles](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [focus](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), [statuts](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), [contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | Accessibilité des gestes, contrôles, retours et textes | Parcours souris sans déplacement maintenu et parcours clavier ; focus visible ; annonces choisies ; contraste mesuré |

### Ce que nous reprenons des captures Harness

Reprendre la hiérarchie responsable → travaux → résultats, les connexions
explicites, les branches simultanées et le retour de validation. Donner au
workflow une place centrale, avec un conseiller IA accessible dans le contexte.

Les captures sont une inspiration de structure. Nous adaptons la densité,
la typographie et les couleurs au travail quotidien. Le nom de la mission prime
sur le nom du modèle. Les couleurs distinguent les états ; les modèles sont
des métadonnées. Une animation représente un événement observé, jamais une
activité inventée ou les « pensées » internes du modèle. Les scores de confiance
sans méthode de mesure et les compteurs décoratifs ne sont pas retenus.

La première vue montre les grandes phases, pas l'ensemble des paramètres et
des journaux. En développant une phase, on découvre ses blocs puis les preuves
d'un résultat. La vue reste utile avec un agent principal seul, plusieurs agents,
des commandes sans IA ou une intervention humaine.

### Architecture de l'information proposée

```text
Espace de travail
├─ Projets
│  └─ Projet sélectionné
│     ├─ Vue d'ensemble : résultat recherché, activité, décisions, prochaine action
│     ├─ Workflows : définitions appliquées à ce projet
│     │  └─ Workflow : Conception | Exécutions
│     │     └─ Exécution : graphe en action, résultats, décisions, chronologie
│     └─ Releases : intention → plan → réalisation → tests → livraison
├─ Bibliothèque
│  ├─ Modèles de workflow et composants réutilisables
│  ├─ Profils d'agents
│  └─ Packs métier
└─ Connexions : fournisseurs IA, services et environnements configurés

Accès permanents : recherche/commandes · décisions attendues · aide · préférences
Accès contextuel : assistant IA · terminal · diagnostic détaillé
```

La bibliothèque est globale ; son utilisation produit un workflow de projet.
Une exécution appartient à un workflow et peut être liée à une release. La
release rassemble le travail livré ; elle n'est pas obligatoire pour essayer
un workflow. Les liens croisés ouvrent le même objet, pas une copie de sa fiche.
L'espace « Décisions » est un accès direct aux attentes existantes, pas un
nouveau registre à synchroniser.

Le fil de navigation affiche projet, workflow, version et exécution lorsque
pertinent. Un identifiant court reste secondaire. Chaque sélection conserve
position du canevas, filtre et panneau ouvert. Retour retrouve ce contexte.
Changer de projet ou de release ne redirige jamais un terminal existant.

Un clic sur un modèle de la bibliothèque ne lance rien : « Utiliser dans un
projet » prépare une définition. « Exécuter » ouvre le récapitulatif du périmètre
résolu et des prérequis. Une exécution consultée est clairement datée ; passer
à sa conception ne modifie pas ce qui travaille déjà.

### Vocabulaire et niveaux d'information

| Objet | Libellé produit | Distinction à préserver |
|---|---|---|
| Recette réutilisable | Modèle de workflow | « Modèle IA » désigne uniquement le modèle d'un fournisseur |
| Définition du projet | Workflow | Décrit un travail ; ne prouve pas qu'il a commencé |
| Application de cette définition | Exécution | Version et tentative précises, avec activité et résultats |
| Élément du canevas | Étape | « Nœud » réservé au diagnostic et aux formats techniques |
| Instructions spécialisées | Profil d'agent | Généraliste possible ; profil ne signifie pas forcément sous-agent |
| Travail confié à un autre agent | Délégation | Montrée seulement si une session distincte est observée |
| Point humain | Décision attendue | Choix, information, relecture ou autorisation explicités |
| Sortie terminée par l'exécutant | Résultat à examiner | N'est pas encore un résultat accepté |
| Ensemble livré | Release | Même nom dans l'application et dans `release/` |

Niveau 1 : **ce qui se passe et la prochaine action**. Niveau 2 : mission,
critères, entrées/sorties et choix effectifs. Niveau 3 : événements techniques,
modèle observé, ressources et traces. Un utilisateur expérimenté peut accéder
directement au niveau 3, sans traverser un tutoriel. Les erreurs, la cible de
production, les limites de preuve et les autorisations restent toujours visibles
au niveau où elles changent une décision.

### Organisation de l'écran de workflow

```text
Projet / Workflow / Version                   Conception | Exécutions
Titre et état de sauvegarde                   Vérifier   Exécuter…
┌──────────────────┬─────────────────────────────────┬─────────────────────┐
│ Ajouter une étape│ Canevas ou liste                 │ Étape sélectionnée  │
│ / rechercher    │                                  │ Mission et résultat │
│                 │ Analyse → Réalisation → Tests    │ Entrées / sorties   │
│ Composants      │             ↑             │     │ Exécutant           │
│ métier          │             └─ correction ─┘     │ Options avancées    │
└──────────────────┴─────────────────────────────────┴─────────────────────┘
                                      Assistant / Activité / Terminal
```

Ce schéma fixe une hiérarchie, pas des dimensions définitives. Un seul panneau
d'outil complémentaire est ouvert par défaut : l'assistant et le terminal
n'occupent pas simultanément la place de la mission. L'inspecteur et la
bibliothèque se replient sur fenêtre compacte. Le canevas garde une zone de
travail utilisable ; le texte n'est pas réduit pour faire entrer trois colonnes.

En exécution, la barre principale devient « En cours / En attente / Terminée »,
avec « Mettre en pause » ou « Reprendre » selon le contrat. Les commandes de
conception ne sont pas mélangées aux actions de pilotage. L'historique consulté
porte « Lecture de l'exécution du … » et ne propose pas un faux bouton Continuer.

### Règles du canevas

- Sens principal gauche → droite ; retours de correction nommés et visuellement
  distincts. Une relation de pilotage n'est pas une arête de dépendance.
- Position des blocs stable lors des mises à jour. « Réorganiser » est une action
  explicite et annulable ; aucun recentrage automatique à chaque événement.
- Carte : mission, état avec texte/icône, responsable/exécutant, durée lorsque
  mesurée. Le détail du fournisseur/modèle est secondaire mais accessible.
- À faible zoom, phases et états agrégés ; à zoom normal, missions et acteurs ;
  au clic, critères et preuves. Toute attente ou erreur dans un groupe replié
  remonte au groupe avec accès à l'étape concernée.
- Relier est possible par glisser-déposer, par sélection de deux ports au clic
  et depuis la liste/inspecteur au clavier. Les ports portent des noms ; une
  connexion impossible explique le prérequis manquant.
- Carte « Décision attendue » avec la question et une action « Examiner » ; les
  boutons d'autorisation vivent dans une fiche lisible montrant l'opération exacte.
- Filtrer « En cours », « Attend ma décision » ou rechercher une étape atténue
  le reste sans supprimer ses dépendances. Vue d'ensemble/minicarte disponible
  pour les grands graphes, pas imposée aux petits.
- Animations brèves et discrètes lors d'une transition ; réglage de réduction
  des animations et respect de la préférence système. Aucune boucle animée
  indispensable à la compréhension, aucun auto-défilement qui déplace le focus.

### Cohérence des états, actions et erreurs

Une table de présentation commune alimente carte, liste, chronologie, release
et notifications. Un état canonique possède une traduction humaine unique.
La fraîcheur de la mesure ne remplace pas l'état métier.

| Fait | Présentation cible | Action possible |
|---|---|---|
| Prêt à démarrer | « Prêt » — neutre | Exécuter si prérequis satisfaits |
| Travail observé | « En cours » — accent bleu | Voir l'étape, demander une pause |
| Réponse humaine nécessaire | « Votre décision est attendue » — ambre | Examiner la question |
| Résultat rendu | « À valider » — neutre, icône de validation | Lire puis accepter/demander correction |
| Critères validés | « Validé » — vert | Consulter les résultats |
| Échec ou impossibilité connue | « À corriger » / « Bloqué » — rouge, cause explicite | Voir le défaut et la prochaine action possible |
| Branche non choisie | « Non applicable » — neutre | Lire la décision à l'origine |
| Observation ancienne | « Suivi à vérifier » avec date du dernier signal | Vérifier la connexion ; aucun faux arrêt ou succès |

« Production » est un contexte affiché en texte, pas un synonyme d'erreur.
Une étape ne devient pas verte parce qu'un processus a quitté. Pause demandée,
pause effective et opération encore en cours ont des messages différents.

Message d'erreur = **problème + conséquence + action disponible**. Exemple :
« Confluence est déconnecté. La page est prête mais n'a pas été publiée.
Reconnecter Atlassian. » L'information reste dans l'étape et les résultats ;
un toast éphémère ne porte jamais seul une décision ou un échec de publication.
Les erreurs de formulaire sont près du champ, avec résumé navigable si plusieurs.
Les succès routiniers sont discrets ; l'utilisateur garde le contrôle du focus.

### Première utilisation et efficacité au quotidien

**Première ouverture :** une phrase qui explique le résultat possible, puis
« Essayer un exemple », « Décrire mon besoin » et « Ouvrir un projet ».
L'exemple contient des données synthétiques et des exécutions simulées signalées,
sans connexion payante ni écriture externe. L'utilisateur voit une décision,
une correction et une validation avant de configurer tous ses outils.

Création d'un workflow : choisir un objectif/modèle, préciser le résultat,
vérifier les étapes, connecter seulement les services nécessaires, puis lancer.
Les réglages hérités sont nommés. Le besoin d'une connexion est expliqué au
moment utile ; il n'interdit pas de dessiner ou de comprendre un workflow.
L'aide est contextuelle, facultative et retrouvable. Aucune visite guidée modale
obligatoire à chaque démarrage.

**Usage fréquent :** recherche globale avec portée visible, palette de commandes,
récents/favoris, duplication, composants réutilisables, multi-sélection dans le
canevas et accès clavier direct à la configuration. Les raccourcis sont visibles
dans les menus et ne capturent pas la saisie du terminal ou d'un champ. Une
densité compacte change les espacements, jamais le sens des états ni les actions.

**Retour après une interruption :** montrer ce qui a changé, les résultats reçus,
la décision encore attendue et la prochaine étape. L'utilisateur n'a pas à relire
la conversation entière. Aucune reconfiguration automatique de ses favoris ou
de sa navigation en fonction d'une expertise supposée.

### Assistant IA et documentation humaine

L'assistant annonce son contexte : projet, workflow et étapes sélectionnées.
« Proposer une modification » présente le diff et son effet en langage naturel ;
« Appliquer au brouillon » et « Exécuter » sont deux actions distinctes. Les
besoins non couverts et les capacités non vérifiées restent signalés. Annuler une
proposition est simple ; aucune prétendue certitude numérique sans mesure.
Les explications s'appuient sur contrats, résultats et événements accessibles,
sans inventer un raisonnement interne du modèle.

La vue de release commence par l'intention et un résumé du résultat ; puis
plan, code/configuration écrits, tests, livraison. Le même contenu alimente le
README humain. Une tâche ouvre ses détails depuis chaque vue, avec les mêmes
titres et verdicts. Les pièces originales, le diff et les preuves sont à portée
de clic ; les JSON de suivi n'apparaissent que dans le diagnostic explicite.
Le système ne recrée pas une seconde documentation par agent ou par onglet.

### Lisibilité et accessibilité à vérifier

Choix initiaux à éprouver : texte courant 14–16 px, secondaire au moins 12 px,
titres 18–24 px ; une police sans sérif, monospace réservé au code, chemins et
mesures. Grille d'espacement de 4 px, largeur de prose bornée, une action primaire
par contexte. Thèmes clair et graphite de même hiérarchie ; les identités des
fournisseurs ne recolorent pas l'écran.

Cibles principales proposées à 36 px de haut et commandes compactes à 28 px ;
les ports ont une zone d'action d'au moins 24 × 24 px. Les contrôles sont évalués
selon WCAG 2.2 AA : contraste textuel 4,5:1 pour le texte courant (3:1 pour le
grand texte au sens WCAG), focus visible/non masqué, cibles et alternatives au
glisser-déposer. Respecter les exceptions normatives ne dispense pas de tester
la manipulation réelle du canevas. Les frontières/indicateurs utiles sont aussi
vérifiés en contraste non textuel.

Tester 1440 × 900, 1280 × 720 et une fenêtre compacte de 1024 × 768, avec zoom
100/125/200 %, libellés français longs et clavier seul. À 200 %, les panneaux
se replient et les formulaires restent utilisables ; le canevas peut défiler,
avec une liste alternative. Les changements de statut sont annoncés aux aides
techniques sans annoncer chaque seconde du chronomètre. Ces contrôles sont une
recette ciblée ; ils ne valent pas certification exhaustive d'accessibilité.

### Travail de conception et validation

**W22 — architecture et langage :** inventorier les objets, dessiner l'arborescence,
fixer le lexique et la table d'états, cartographier les cinq parcours ci-dessous.
Une revue de cohérence relie chaque donnée à sa source et chaque action à son
effet. Éliminer les doublons de navigation avant de détailler les couleurs.

**W23 — prototypes et essais :** un seul prototype navigable versionné couvre
accueil, création, canevas/configuration, exécution, décision et documentation.
Inclure états vides, erreurs, perte de connexion et grands graphes. Il doit être
testable avec de faux agents ; aucune dépendance à Confluence pour juger sa lecture.
Puis revue du système de composants sur ces états, en clair et sombre.

| Parcours à éprouver | Question de conception | Preuve de validation |
|---|---|---|
| Premier workflow | Peut-on passer d'un besoin à un exemple compréhensible ? | L'utilisateur configure/lance l'exemple sans lire du JSON ni recevoir la réponse du modérateur |
| Modification experte | Peut-on ajouter un point humain et changer un modèle sans perdre le contexte ? | Modification correcte, raccourci découvrable, diff compris, annulation possible |
| Suivi et interruption | Qui travaille, qu'est-ce qui attend et pourquoi ? | Cause et responsable identifiés ; reprise ne relance pas un effet déjà réalisé |
| Autorisation sensible | Que va produire le clic, où et sur quelle version ? | Cible et portée correctement expliquées par l'utilisateur avant l'accord |
| Comprendre la release | Qu'a-t-on demandé, fait, testé et livré ? | Réponses retrouvées depuis une entrée humaine, avec distinction prévu/réalisé |

Protocole proposé : deux cycles formatifs de 6 à 8 participants, avec nouveaux
utilisateurs connaissant leur métier, utilisateurs avancés de workflows et
utilisateurs occasionnels. Inclure Benoît pour son usage quotidien sans en faire
l'unique profil. Prévoir une personne utilisant principalement le clavier.
Premier cycle sur arborescence/prototype ; deuxième après correction, avec de
nouveaux participants et quelques retours pour observer l'apprentissage.

Les scénarios décrivent un but sans nommer le bouton à trouver. Relever erreurs,
hésitations, demandes d'aide, chemin choisi et compréhension de l'effet. Temps et
réussites servent à comparer nos itérations, pas à produire une statistique
représentative avec un petit échantillon. Objectifs de conception initiaux :
comprendre une attente en 30 s, retrouver la réalisation/test en 60 s et terminer
un exemple guidé en 10 min ; à réviser avec les observations, jamais présentés
comme des normes professionnelles.

Bloquants de validation : mauvaise cible autorisée, confusion entre brouillon et
exécution réelle, faux succès compris comme livraison, perte d'une décision,
impossibilité d'effectuer une action essentielle au clavier. Une difficulté
récurrente chez plusieurs profils exige une correction puis une contre-épreuve.
Pour les actions courantes, rapporter le nombre réel de réussites sans aide et
les problèmes résiduels. Sans participants, le résultat reste une revue experte
et des tests techniques ; il ne devient pas une validation utilisateur.

L’interface est implémentée et ses parcours techniques sont testés. Un contrôle
automatisé axe couvre navigation, canevas, inspecteur et dialogue dans les deux
thèmes, sans violation détectée sur ces vues.
La recette avec des utilisateurs débutants/experts et l’audit WCAG complet
restent à réaliser. Aucune efficacité UX mesurée n’est revendiquée.

---

## Décisions de réalisation — 8 octobre 2026

- Navigation : Globaux, Projets, Bibliothèque, Connexions, Récurrences.
- Un projet est la racine d’un dépôt Git ; une automatisation globale possède
  son propre espace et peut fonctionner sans projet.
- Connexions orthogonales : segments horizontaux/verticaux, angles droits.
- Un travail IA choisit un modèle, avec ou sans agent dédié. Les capacités des
  plugins sont indépendantes des profils et des types de bloc.
- Terminal de conception dans `.tricorder/`, consignes versionnées mises en
  place automatiquement et personnalisations préservées.
- La croix masque la fenêtre ; l’icône Ubuntu conserve le suivi et les décisions.
  « Quitter Tricorder » arrête le planificateur. Aucun démarrage automatique à la
  connexion Ubuntu n’est encore installé.
- Le bilan vérifiable de l’interface actuelle est dans la
  [release](../release/2026-10-08_workflow-studio/README.md).

Le design antérieur reste dans l’historique Git ; il ne définit plus le produit.

## Vocabulaire produit

La demande du 8 octobre impose des termes IT courants. Employer **éditeur de
workflows**, **bloc**, **tâche IA**, **exécution**, **validation**, **journal
d’exécution**, **planification** et **déploiement**. « Modèle de workflow » et
« modèle IA » restent explicitement distincts. Les états visibles sont « À
valider » et « Validé » ; le bouton correspondant est « Valider le résultat ».
Une décision d’autorisation reste distincte de la validation d’un résultat.

Les points de décision affichent le contenu complet de l’opération externe,
pas seulement son titre ou son empreinte. Le parcours de code distingue le diff
proposé, les tests de la copie et son application au dépôt. Ces deux parcours sont
couverts par la recette Electron et le contrôle automatisé d’accessibilité.

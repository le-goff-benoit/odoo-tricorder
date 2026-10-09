# Préparation — agents et connexions

Campagne 3, testeur 4. Responsable opérations : métier 9/10, technique 3/10.
Usage inventé : Atelier Boréal, loueur de matériel événementiel, organise la préparation et la relecture de réponses aux demandes. Aucun client réel ni notification externe.

État : préparation seulement ; aucun GUI, aucune observation ni verdict produit. L'exécution attend le followup du responsable avec le nouveau paquet, le SHA256 de l'exécutable et celui de l'ASAR.

## Banc isolé

`harness.cjs --prepare` crée un dossier temporaire neuf et un environnement whitelist : HOME, XDG, CODEX_HOME, CLAUDE_CONFIG_DIR, TRICORDER_HOME, STATE_DIR et RUNTIME_DIR dédiés. Engine attendu sous STATE_DIR/workflows. Écran réservé : DISPLAY=:184, XAUTHORITY=/tmp/tricorder-functional-display/auth-184.

PATH fixe : stubs:/usr/bin:/bin, fixé avant le broker et conservé. Les deux fournisseurs répondent rapidement à --version avec le marqueur TRICORDER-T3-AGENTS-CONNEXIONS-STUB ; toute exécution modèle retourne un message inerte et le code 78. L'outil brouillon-atelier imprime un brouillon fictif local ; il n'utilise ni réseau ni message externe. Aucun fournisseur réel n'est qualifié par ce banc.

Au followup : vérifier les deux empreintes avant démarrage normal, sans --workflow-studio. Ouvrir le terminal par les gestes de l'interface ; exécuter `command -v codex; codex --version; command -v claude; claude --version`, capturer chemins et marqueurs avant le premier workflow. Observer d'abord l'interface avant toute recherche sur un problème produit. Toutes les créations et configurations évaluées passent par l'UI. Fixtures externes possibles uniquement par l'API Engine déclarée, sans forcer JSON/SQLite ; aucune fixture d'exécution n'est installée à ce stade.

## Quatre parcours indépendants

### P1 — workflow générique sans pack

Intention : créer « Boréal — Préparer une réponse » sans installer de pack métier.

Gestes : entrée normale ; trouver la création d'un workflow générique ; nommer le workflow ; ajouter un bloc agent « Préparer le brouillon » ; saisir les consignes « Lire une demande fictive, relever matériel, quantité et dates, puis préparer une réponse à relire » ; déclarer entrée `demande` et sortie `brouillon` selon les possibilités affichées ; enregistrer ; quitter puis revenir au workflow.

Attendu : le responsable peut identifier un workflow et son bloc, retrouver les consignes et les I/O enregistrées, sans dépendance implicite à un pack. Relever les mots utilisés, l'emplacement des commandes et toute hésitation liée au vocabulaire métier/technique.

Preuves envisagées : écran de création générique ; bloc configuré après réouverture.

### P2 — fournisseurs et rôle facultatif

Intention : créer séparément « Boréal — Reformuler une réponse », puis choisir et changer le fournisseur du bloc.

Gestes : configurer un agent avec consignes « Reformuler le texte fourni en français simple, conserver quantités et dates », entrée `texte_source`, sortie `texte_reformule` ; choisir OpenAI ; enregistrer ; changer vers Anthropic ; enregistrer et rouvrir ; modifier ou retirer le rôle si l'UI le permet ; vérifier la conservation des consignes et I/O à chaque changement. Examiner la connexion proposée pour chaque fournisseur à partir de l'UI, sans compte ni secret.

Attendu : choix du fournisseur compréhensible, rôle facultatif identifiable, configuration conservée lors des changements. Distinguer le choix du fournisseur, les informations de rôle et une connexion effectivement exploitable. Le marqueur de stub et tout refus d'exécution sont des limites du banc, pas une qualification des fournisseurs.

Preuves envisagées : état OpenAI ; état Anthropic après réouverture ; rôle vide/modifié et consignes préservées.

### P3 — outil local de brouillon

Intention : créer séparément « Boréal — Brouillon local » avec une étape d'outil local, sans diffusion.

Gestes : depuis les choix proposés, ajouter/configurer le bloc ou la connexion d'outil local ; nommer « Préparer un brouillon local » ; saisir le chemin fourni par preparation-manifest.json vers brouillon-atelier ; lire les possibilités pour paramètres, sortie et validation ; enregistrer ; rouvrir. Si l'UI propose un test ou une exécution accessible et cohérente, utiliser ce geste et observer le marqueur local.

Attendu : pouvoir comprendre comment relier l'étape à l'outil réellement disponible et récupérer son résultat. Une configuration de bloc enregistrée et une connexion utilisable constituent deux résultats distincts. Si aucun outil local générique n'est exposé, documenter précisément les options visibles ; ne pas simuler sa création par API.

Preuves envisagées : configuration de l'outil ; résultat du test UI ou état empêchant ce test.

### P4 — intervention humaine prévue et imprévue

Intention : créer séparément « Boréal — Relire et compléter » pour la demande D-102, dont la date de retour manque.

Gestes : ajouter une intervention humaine prévue « Valider le brouillon » en utilisant les composants affichés ; préciser le texte « Relire quantités et dates avant validation » et les réponses possibles ; relier les blocs selon les gestes proposés ; examiner et configurer une éventuelle connexion de réception/notification, puis vérifier ce que son état annonce. Ajouter un agent dont les consignes demandent de suspendre et de demander une date si elle manque. Examiner comment l'UI représente cette demande imprévue et comment une réponse humaine se distingue d'une validation planifiée.

Attendu : la validation prévue est compréhensible et enregistrable ; l'intervention imprévue, si testable, fait apparaître la question et permet de répondre sans recréer le workflow. Le responsable comprend si un bloc attend un humain dans l'application ou si une connexion externe est requise et disponible.

Limite connue : les fournisseurs inertes n'émettent pas de véritable demande de modèle. Une fixture d'événement humain ne sera employée qu'après identification de commandes Engine documentées, sans contourner les gestes de création/configuration testés. Sans fixture supportée, l'exécution imprévue reste non exercée et sera classée manque-banc, avec les observations de configuration conservées.

Preuves envisagées : validation prévue ; liens et connexion ; demande/réponse imprévue si accessible.

## Réception future

12 captures utiles maximum pour tout le testeur, dont une vérification terminal préalable ; réserver la dernière à une anomalie reproductible. Rapport français avec attendu, actions, observé, reproduction, preuve, verdict, gravité, type bug/UX/manque-banc et prochaine action. Une difficulté d'exécution due aux stubs sera distinguée d'une observation UI. Aucun rapport d'un autre testeur, code produit, build, commit ni suite globale.

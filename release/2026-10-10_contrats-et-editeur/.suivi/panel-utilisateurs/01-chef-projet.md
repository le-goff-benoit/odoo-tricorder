# Panel final 1/6 — Chef de projet peu technique

Date : 10 octobre 2026. Réception par un agent incarnant le profil, avec gestes
Playwright dans une vraie fenêtre Electron. Ce rapport porte sur le build source
figé du panel, sans modification produit, sans rebuild, sans commit.
Base Git : `0a4dd888fedbf3a1859a08af3285816cbba0de55` ; implémentation locale
non commitée fournie par le responsable du panel.

**Verdict : deux parcours utilisables, aucun P0/P1 rencontré. Quatre frictions P2
à corriger pour faciliter la lecture métier.** La création/adoption, le recueil,
l'accord du plan, les tâches sur le graphe et le retour à la conversation ont été
réellement utilisés. Les tests verts ne font pas disparaître les frictions ci-dessous.

## Banc et limites de preuve

- Spec propriétaire : `tests/panel-v2-user-1.spec.cjs`.
- Fenêtres : 1600 × 1050, puis 1280 × 800 avec terminal et suivi côte à côte.
- Projets créés par GUI : « Réunion commerciale synthétique », puis « Lancement
  produit synthétique ». Aucun dossier Odoo ou projet client utilisé.
- Chaque cas dispose d'un HOME, état moteur, configuration et caches temporaires.
  Les CLI `codex`/`claude` sont des scripts locaux inertes, sans service externe.
  Ils affichent leur nature synthétique puis attendent ; les exécutants de tâche
  restent ainsi observables pendant la navigation. Brokers nettoyés par fixture.
- Parcours 1 : les résultats IA proviennent des exemples de simulation du modèle.
  Le plan prédéfini comporte deux tâches ; il ne constitue pas une preuve d'une
  interprétation intelligente des trois intentions saisies.
- Parcours 2 : un plan de trois tâches est fourni par `Engine.claim/submit`, les
  mêmes commandes validées que celles du moteur. Seul ce contenu est semé ;
  recueil, approbation, lancement des éléments et navigation passent par la GUI.
  Les deux processus de travail sont synthétiques et ne produisent pas un
  livrable métier réel. Le troisième attend la première tâche.
- Aucune écriture SQLite/JSON d'état pour fabriquer une transition. Aucun modèle
  payant, authentification fournisseur, email ou autre service qualifié.
- Les captures citées ont été ouvertes avec `view_image`. Les fichiers `.txt`
  adjacents sont accessoires et ne constituent pas la preuve visuelle.

## Parcours 1 — Réunion et livrables documentaires

| Étape utilisateur | Attendu | Observé et preuve |
|---|---|---|
| Projets → Nouveau projet → Nouvel espace local | Commencer sans installation technique préalable | Projet créé et nommé par formulaire GUI. |
| Workflows → Créer un workflow → modèle « Intentions, plan et travaux » | Obtenir une méthode réutilisable hors Odoo | Cinq blocs affichés, sans saisie JSON. [Workflow adopté][p1-editeur]. |
| Choisir le bloc de traitement, renommer « Produire les livrables de la réunion », régler trois travaux simultanés, enregistrer | Adapter la méthode en termes métier | Nom et réglage appliqués, puis workflow enregistré. [Éditeur][p1-editeur]. |
| Exécuter → demande de suivi commercial → Simuler le parcours | Essayer la méthode sans opération réelle | Bandeau « Simulation » explicite. |
| Ajouter trois intentions et confirmer la liste | Voir ce qui sera transmis, distinguer recueil et accord du plan | Trois contributions lisibles ; texte « Le plan sera validé séparément ». [Recueil][p1-recueil]. |
| Lire le plan sur le graphe, examiner la décision et approuver | Un seul plan avec ses tâches, accord explicite avant travaux | Carte plan unique, deux titres de tâches, bloc de décision et action clairement attendue. Objectif du plan absent de la carte : friction F1. [Plan][p1-plan]. |
| Suivre les tâches sur le graphe | Noms, dépendance et coordination visibles sans propriétés | Compte rendu et brouillon sous le bloc de traitement ; responsable « Tricorder », nombre d'exécutants et attente de dépendance affichés. Défilement nécessaire : F2. [Tâches][p1-travaux]. |
| Ouvrir chaque tâche → Voir les résultats → fermer → retour au parent | Consulter chaque résultat documentaire | Deux résultats d'exemple consultés dans une fenêtre lisible, avec avertissement simulation et preuve. Pas de modification de code exigée. [Compte rendu][p1-resultat], [Brouillon][p1-brouillon]. |
| Examiner les résultats et approuver la réception | Clôture distincte de l'accord du plan | Demande principale terminée, cinq étapes reçues ; les deux enfants sont également terminés. [Réception finale][p1-final]. |

## Parcours 2 — Réutilisation et suivi du lancement produit

| Étape utilisateur | Attendu | Observé et preuve |
|---|---|---|
| Créer un second projet, ouvrir le workflow source → Options → Réutiliser | Reprendre la méthode avec une copie indépendante | Copie nommée « Lancement produit — méthode réutilisée », destination choisie dans le formulaire. [Copie][p2-copie]. |
| Choisir l'IA, saisir le modèle synthétique puis appliquer à toutes les étapes | Préparer le lancement sans modifier les blocs | Formulaire accessible ; le précontrôle demande explicitement un modèle si absent. Ce blocage préparatoire est expliqué et résolu par GUI, sans contournement. |
| Exécuter → demande initiale → Lancer dans le terminal | Une demande dans une seule application avec une conversation associée | Terminal ouvert ; marqueur de CLI inerte visible. La demande initiale est saisie dans la GUI, pas interprétée par une vraie IA. [Terminal][p2-terminal]. |
| Ajouter trois intentions, recevoir le plan synthétique, approuver et lancer les éléments | Un plan, deux travaux indépendants et une dépendance réelle | Trois enfants créés ; les deux premiers deviennent en cours, le troisième reste en attente. Le graphe annonce « 0/3 terminés · 2 en cours · 1 en attente » et « Coordination : Tricorder · 2 exécutants actifs ». [Parallèle observé][p2-parallele]. |
| Cliquer « Analyser les retours clients », puis revenir au parent | Examiner la tâche sans perdre la conversation coordinatrice | L'enfant est nommé dans l'en-tête natif ; le terminal reste visible. Retour au parent disponible. [Enfant][p2-enfant]. |
| Projets → retrouver le projet → ouvrir sa conversation | Retrouver la même demande et la même session | Même titre de demande, même terminal vivant et mêmes identifiants/PID de session avant/après. Graphe et états restaurés. [Navigation projets][p2-projet], [Retour à la demande][p2-retour]. |

## Frictions reproductibles et recommandations

| ID | Priorité | Déclencheur et observation | Impact métier | Correction précise proposée |
|---|---|---|---|---|
| F1 | P2 | Le modèle fournit l'objectif dans `plan.goal` ; la carte affiche « Plan de cette demande » au lieu de « Préparer le suivi d'une réunion ». Même constat dans le second plan synthétique. [Plan][p1-plan]. | Les titres des tâches se lisent, mais je ne retrouve pas immédiatement le but commun du plan. | Afficher l'objectif `goal` comme texte métier de la carte ; conserver `title` s'il est fourni et rendre l'objectif en dessous. Ajouter un exemple de plan du modèle à la vérification graphique. |
| F2 | P2 | Graphe vertical long à l'ouverture ; après approbation du plan, les tâches sont sous la zone visible. À 1280 × 800 avec terminal, le bas de la troisième tâche et son explication de dépendance restent hors champ, même après « Ajuster ». [Plan][p1-plan], [Parallèle][p2-parallele]. | Pour répondre « que reste-t-il et pourquoi ? », il faut faire défiler. Demande, plan et trois tâches ne se lisent pas ensemble comme un petit kanban. | Focaliser automatiquement le bloc actif avec ses éléments ; réserver « Ajuster » à un ajustement réel de la zone disponible, ou proposer un zoom d'ensemble lisible puis un accès explicite aux tâches. Maintenir la dépendance visible sur une carte compacte. |
| F3 | P2 | Dans le parcours simulé sans conversation, l'enfant ouvert s'intitule « Traiter un élément du plan » ; « Préparer le compte rendu » réapparaît seulement dans la fenêtre des résultats. Le parcours natif, lui, garde le bon titre de tâche. [Résultat enfant][p1-resultat], [Enfant natif][p2-enfant]. | En passant d'une tâche à l'autre, je dois retrouver l'identité métier ; le libellé générique ressemble à un changement de workflow plutôt qu'à l'ouverture de mon livrable. | Utiliser le titre de l'élément en en-tête dans tous les modes, dont les simulations hors conversation ; garder le titre du sous-workflow dans le fil d'Ariane. |
| F4 | P2 | La carte « Préparer un plan » porte « Validé » avant que la décision « Valider le plan » soit approuvée. Le bandeau annonce bien « Décision attendue ». [Plan][p1-plan]. | Deux sens de « valider » coexistent : le contrôle technique des sorties et mon accord métier sur le périmètre. La porte humaine fonctionne, mais sa lecture demande de regarder deux endroits. | Pour un résultat accepté automatiquement, préférer « Produit » ou « Sorties vérifiées » ; réserver « Approuvé par vous » à la décision humaine. |

Aucun P0 ni P1 observé dans ces deux parcours. Pas de blocage produit contourné.
Le choix explicite d'un modèle était un prérequis ordinaire et a été réalisé
avec le formulaire prévu. Les échecs de mise au point du banc concernaient des
sélecteurs, l'emplacement modal des résultats et la distinction entre demande
principale/enfants dans l'inventaire ; ils ne sont pas classés comme défauts produit.

## Ce qui aide ce profil

« Nouvelle intention », « Ajouter à la liste », « Confirmer la liste », « Examiner
la décision » et « Approuver la suite » donnent des actions concrètes. Les noms
réels des tâches et les raisons « Prêt pour un exécutant » / « Dépendances à
terminer » sont utiles. « Coordination : Tricorder » évite d'inventer un agent
lancé ; le terminal associé conserve l'espace de dialogue. Les résultats
synthétiques sont explicitement identifiés, et un brouillon ne suggère pas un
message envoyé.

Le réglage « Travaux simultanés au maximum » est compréhensible. Le champ libre
« Modèle » demande une connaissance du fournisseur ; dans ce panel, son nom est
fourni comme donnée de banc. Je ne qualifie pas ici la facilité de connexion
d'un vrai compte ou le choix d'un vrai modèle par ce profil.

## Reproduction et résultat final

```bash
cd /home/blegoff/odoo-tricorder
DISPLAY=:188 XAUTHORITY=/tmp/tricorder-collections-panel/188/Xauthority \
  python3 /tmp/tricorder-ci-target-source-run.py \
  --config=/tmp/tricorder-collections-panel/user-1.config.cjs
```

Dernière exécution source : **2 passed (30.9s)**. Le premier parcours termine
sa demande et ses deux enfants ; le second vérifie la coordination en cours
et la conservation de la session, puis nettoie son environnement synthétique.
Le banc accepte `TRICORDER_EXECUTABLE` pour un rejeu empaqueté et sélectionne le
backend depuis `process.resourcesPath`. L'application empaquetée n'a pas été
rejouée par ce testeur à ce stade.

Aucun `npm run build`, aucune modification de produit, aucun commit. Le contenu
IA et les services externes restent hors qualification.

[p1-editeur]: preuves/01-chef-projet/01-workflow-adopte-configure.png
[p1-recueil]: preuves/01-chef-projet/02-recueil.png
[p1-plan]: preuves/01-chef-projet/03-plan-a-approuver.png
[p1-travaux]: preuves/01-chef-projet/04-travaux-sur-graphe.png
[p1-resultat]: preuves/01-chef-projet/05-resultat-compte-rendu.png
[p1-brouillon]: preuves/01-chef-projet/06-resultat-brouillon.png
[p1-final]: preuves/01-chef-projet/07-resultat-final.png
[p2-copie]: preuves/01-chef-projet/08-copie-reutilisee.png
[p2-terminal]: preuves/01-chef-projet/09-demande-terminal.png
[p2-parallele]: preuves/01-chef-projet/10-coordination-parallele-1280.png
[p2-enfant]: preuves/01-chef-projet/11-tache-enfant-terminal.png
[p2-projet]: preuves/01-chef-projet/12-projet-retrouve.png
[p2-retour]: preuves/01-chef-projet/13-demande-retrouvee-terminal.png

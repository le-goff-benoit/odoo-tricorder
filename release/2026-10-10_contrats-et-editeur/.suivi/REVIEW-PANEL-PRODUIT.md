# Réception indépendante des corrections du panel produit

Réviseur : avis_contre_epreuve. Référentiel : rapports Fondateur, Services, Sceptique, Product Manager et Consultant ; lecture des fonctions modifiées, puis contre-épreuves indépendantes sur la source construite par l’orchestrateur. Aucun appel fournisseur réel, aucun projet client, aucun envoi. Écran `:190`, HOME et SQLite temporaires. Le paquet n’est pas couvert par cette réception.

## Verdict final

**Réception favorable sur les corrections examinées ; aucun P1/P2 de cette revue ne reste ouvert.** Les trois défauts découverts sont corrigés et reçus : conservation d’un ajout refusé derrière un conflit, drapeaux de suspension dans les résumés compacts des enfants et séparation de deux soumissions identiques après accusé perdu. Les changements entre terminaux existants sont reçus sans altération du workflow, du brouillon ou des processus. Cinq parcours GUI indépendants sont reçus, ainsi que les 11 tests de projections. L’écran `:190` est libéré ; aucun rebuild ni scénario client n’a été effectué par le réviseur.

Ce rapport qualifie des corrections précises. Il ne transforme pas les demandes produit du panel (réviser un plan, connexion Slack OAuth native, preuve liée au commit source) en capacités livrées.

## Défauts établis et réception

### 1. P1 corrigé — une contribution soumise pouvait disparaître derrière un conflit

Reproduction indépendante : moteur accepte A mais son accusé IPC est retenu ; utilisateur soumet B puis C ; un autre contributeur ajoute X ; libération de l’accusé A. B rencontre la révision concurrente, C réussit après actualisation. Ancien résultat : A/X/C, champ vide, B absent. Le bandeau mentionnait le conflit mais ne conservait pas B. Aucun test n’a modifié directement l’état SQLite : X passe par l’API publique.

La correction `src/studio.js:930–972` conserve chaque ajout localement avant mise en file et sa requête exacte avant appel. Les contributions non confirmées sont visibles dans **Ajouts à récupérer**. Un conflit reconnu peut être rejoué sur une nouvelle révision ; un accusé inconnu conserve sa clé exacte. `collection-close` interdit la clôture tant qu’une récupération est non résolue.

Réception : A/X/C sont en base, B est récupérable ; confirmer est refusé ; après rechargement B reste présent ; sa reprise ciblée produit A/X/C/B. Aucun doublon. [Rouge initial](preuves-review-panel-produit/results/review-independent-a-rejec-8f0af--a-later-intention-succeeds/queued-conflict.json), [résultat reçu](preuves-review-panel-produit/results-recovery/review-independent-concurr-ecd35--reload-then-targeted-retry/recovered.json).

### 2. P2 corrigé — deux intentions volontairement identiques partageaient une clé après accusé perdu

Scénario distinct du double-clic : A est accepté mais son accusé est perdu ; l’utilisateur efface puis retape délibérément le même texte et soumet ce nouveau brouillon. Le champ est vidé comme après un succès, mais un seul élément est conservé. Les deux appels utilisent la même requête et la même clé. Le champ `draft.edited` distingue bien les saisies ; cette distinction est perdue dans `changeCollection`, qui choisit encore `previous` à partir de la signature run/nœud/opération/texte.

Localisation : `src/studio.js:949`. Pour un nouveau job identifié, la requête d’un autre job ne doit pas être choisie par égalité de texte ; le rejeu d’un job existant dispose déjà de sa propre `request`. Ce scénario était rouge sur le premier build corrigé. [Requêtes exactes et contenu stocké du rouge](preuves-review-panel-produit/results-recovery/review-independent-deliber-0b75c-wledgement-is-not-conflated/identical-draft.json). La correction de l’orchestrateur rend `previous=null` pour chaque job identifié tout en donnant priorité à `submitted.request`.

Réception sur le nouveau build gelé : les deux soumissions ont des clés distinctes ; la seconde, refusée sur révision périmée, reste récupérable. Sa reprise ciblée produit le deuxième élément. La reprise de l’ancien ajout incertain utilise strictement sa première requête et ne crée pas de troisième élément. **1/1 contre-épreuve finale verte en 3,7 s.** [Journal](preuves-review-panel-produit/identical-final.log), [preuves finales](preuves-review-panel-produit/results-identical-final/). Aucun changement de cette fonction par le réviseur.

### 3. P2 corrigé — projection compacte des enfants incomplète

`summary` conservait déjà les nouveaux indicateurs, mais `_COMPACT_SELECT` / `_compact` omettaient `iteration_hold` et `parent_paused`. Les enfants imbriqués dans le suivi parental perdaient donc la distinction entre suspension explicite, attente de prérequis et suspension du parent. **Les listes Projet/Activité chargent le run complet et n’étaient pas affectées par cette omission** ; le premier test limité à ces listes était vert, puis le vrai chemin compact a reproduit le rouge.

Correction expressément déléguée au réviseur, limitée à `backend/workflow_engine/projections.py:63–115` et `tests/test_orchestration_projections.py:73` ; changements existants de l’orchestrateur conservés. Les deux colonnes booléennes sont ajoutées, sans charger de résultats volumineux. Le test compare la coordination compacte, les listes Projet/Activité et les runs avant/après lecture. **11 tests de projections verts**, après rouge sur `parent_paused=None`. [Rouge](preuves-review-panel-produit/projection-red.log), [vert](preuves-review-panel-produit/projection-green.log).

### 4. Reçu — brouillon récent, réponse périmée et reprise exacte

Contre-épreuve différente du cas de concurrence : A est accepté sans accusé ; un brouillon B est saisi ; rechargement ; reprise de A. Les deux requêtes A sont strictement identiques, la base ne contient qu’un A et le brouillon B reste inchangé. B peut ensuite être ajouté normalement. [Preuve des appels exacts](preuves-review-panel-produit/results-recovery/review-independent-lost-ac-a8d78-nd-exact-idempotent-command/exact-command.json).

Autre parcours : accusé A retenu dans le processus principal, rechargement du renderer, ouverture d’un second run, saisie puis soumission de B, libération de l’ancien accusé. Aucun mélange entre les collections. Le premier run propose sa récupération locale après retour ; son rejeu reste idempotent. La première version de ce banc tentait une navigation derrière la file bloquée du renderer et expirait : ce timeout était un défaut de banc, pas une corruption produit. Le scénario reçu utilise explicitement un rechargement, et ne prétend donc pas prouver toutes les navigations possibles sans rechargement.

### 5. Reçu — choisir un terminal ne change pas le workflow consulté

Deux shells synthétiques sont créés par le point d’entrée public. Depuis le suivi du premier projet avec un brouillon non envoyé, trois changements par **Autres terminaux** sélectionnent successivement les sessions des deux projets. Le run reste strictement identique, le brouillon reste saisi, les deux couples id/PID sont conservés, aucune troisième session n’apparaît. [Capture](preuves-review-panel-produit/results-terminal/review-independent-switchi-f0a9e-selected-workflow-and-draft/other-terminal-same-workflow.png).

Lecture complémentaire : `src/app.js:730–734` change la session et le chemin du terminal, sans navigation de studio ni changement de conversation. `electron/main.cjs:167–179` distingue le dossier de conception du dossier d’une exécution à la création du shell. Réutiliser un shell existant conserve son contexte : cette revue ne demande pas de changer implicitement le dossier d’un processus déjà ouvert. Aucun véritable agent conversationnel n’a été lancé par ce banc.

### 6. Lecture favorable, portée bornée — attentes, diagnostic, reprise et Git

`src/studio.js:93,246,419–424` distingue `iteration_wait`, `iteration_hold`, `parent_paused`. L’attente d’une dépendance n’offre plus une reprise manuelle ; une suspension du parent renvoie au suivi parental. Le garde moteur reste nécessaire : ces changements d’UI n’autorisent aucune transition supplémentaire. Le test GUI persistant `tests/workflow-v2.spec.cjs:84` couvre l’attente, le parent suspendu puis l’avancement après réponse ; résultat reçu par l’orchestrateur, sans prétendre à un second rejeu indépendant ici.

Le dialogue de reprise automatique annonce **Relancer maintenant** et la consommation d’une tentative ; l’aperçu d’échec contient le diagnostic disponible. Lecture des fonctions et du scénario persistant `tests/collection-input-ux.spec.cjs`, résultat GUI de l’orchestrateur réutilisé. La sérialisation de `engine.save_workflow` utilise désormais `sort_keys=True` : les nouveaux enregistrements deviennent stables ; un ancien fichier non trié peut encore subir une normalisation au premier enregistrement. Cela ne lie pas une preuve d’exécution au commit des sources.

## Matrice des contre-épreuves

| Contre-épreuve | Résultat indépendant |
|---|---|
| A/B/C + X concurrent, reprise après rechargement | Vert, B récupéré, clôture bloquée avant résolution |
| Accusé perdu + brouillon récent + rejeu exact | Vert, clé/requête identiques, un seul A, B conservé |
| Accusé ancien après reload vers autre run | Vert, collections isolées, récupération de A idempotente |
| Deux saisies identiques distinctes après accusé perdu | Rouge puis vert sur correction finale ; deux éléments, aucune duplication au rejeu |
| Enfant suspendu et parent suspendu dans projections compactes | Rouge puis vert, 11 tests de projections |
| Trois changements de terminaux existants | Vert, run/brouillon/PID inchangés |

Scripts et traces : [dossier de preuves](preuves-review-panel-produit/). `review.spec.cjs` utilise des chemins absolus de cet environnement ; pour le rejouer sur un autre poste, adapter la racine et l’affichage. Exécution reçue : `DISPLAY=:190 XAUTHORITY=/tmp/tricorder-collections-panel/190/Xauthority python3 /tmp/tricorder-ci-target-source-run.py --config=/tmp/tricorder-review-panel-produit/playwright.config.cjs --output=<dossier distinct>`. Aucun rebuild par le réviseur ; le build est fourni et gelé par l’orchestrateur.

## Réserves produit maintenues

- La récupération est locale à ce profil de l’application. Elle ne promet pas de retrouver un brouillon non acquitté depuis un autre poste.
- « Demander une révision du plan » reste un besoin produit du panel ; le refus seul n’est pas une boucle de reformulation universelle.
- Les intégrations réellement configurées et autorisées sont distinctes de la présence d’un bloc « notification ». Aucun Slack, email ou OAuth réel n’est reçu dans cette revue.
- La valeur de la preuve Git dépend encore du lien aux sources exécutées, pas seulement de la définition du workflow.

# Réception indépendante — création et réutilisation après les avis UX

Agent `review_creation_moteur`, 9 octobre 2026. Lecture des rapports UX1–UX4, puis réception ciblée des correctifs de création, liaison, refus, réutilisation et projection. Aucun code produit, build, paquet ou commit modifié par cet agent. Les surfaces de reprise du terminal et de suspension ont un autre responsable et une réception distincte.

## État de la réception

**Aucun défaut bloquant restant dans le périmètre reçu.** Les quatre défauts décrits ci-dessous ont été corrigés et contre-vérifiés. Les six parcours GUI de `workflow-wiring.spec.cjs` et `workflow-reuse-ux.spec.cjs` ont passé sur le premier build commun ; les trois contre-exemples indépendants passent sur le build corrigé, sans changement de leurs assertions.

GUI sur écran isolé `:182`, sans rebuild, avec `dist/app.js` SHA256 `3ca4efa9f5e4eca1703cc06d89692e8c6f65db64588d3fa812ada83e77bb7518`, identique avant/après. Fournisseurs inertes, HOME/XDG/state/runtime isolés, chemins et marqueurs vérifiés dans le terminal avant les parcours. Les fixtures sont créées par API validée ; les copies et liaisons reçues passent par les contrôles visibles. Aucun état d’exécution retouché.

Contre-réception finale sur le build fourni ensuite par l’orchestrateur : `dist/app.js` SHA256 `6bf00be3b50c9e2d0876f893f8dbbe8b0f8b3e893e4e30542bb77cf41a940c0c`, également inchangé avant/après. Aucun build exécuté par le relecteur.

## Défauts découverts pendant cette relecture

### R1 — P2, fermé : une copie composée conservait l’ancienne demande et ses résultats

Le nettoyage initial retirait `parameters.request` et `source_context` au niveau du workflow uniquement. L’export portable développe les sous-workflows et place leurs paramètres dans les blocs internes. Leur ancienne demande et leurs résultats traversaient donc la copie, contrairement à l’annonce du formulaire.

Reproduction : [script](review-copy-boundaries.py), [constat initial](review-copy-boundaries.log). Après export, nettoyage initial et import, `prepare.draft.parameters` contenait encore `ANCIENNE_DEMANDE_SYNTHETIQUE` et `source_context.results`.

La correction `reusableWorkflow` retire les clés réservées de contexte d’exécution au niveau du workflow et de chaque bloc développé. Elle préserve les paramètres métier ordinaires et les consignes. [Contre-épreuve avec le helper produit réel](review-copy-boundaries-corrected.log) : paramètres `language`/`timezone` conservés, original intact, zéro exécution créée. La contre-épreuve GUI indépendante d’une copie composée est également verte : [journal](review-reuse-gui.log), premier scénario de [review-reuse-safety.spec.cjs](review-reuse-safety.spec.cjs).

### R2 — P2, fermé : « laisser les deux choix vides » ne garantissait pas un lien d’ordre

Avec une sortie et une entrée de même nom, `refreshConnectionForm` préparait automatiquement le mapping, même si les deux sélecteurs restaient vides. Le nouveau message invitant à laisser ces sélecteurs vides pour ne rien transmettre était donc contradictoire.

La case explicite **« Ne transmettre aucune donnée (ordre d’exécution uniquement) »** retire ce mapping, désactive les champs concernés et affiche une confirmation lisible. Contre-épreuve GUI indépendante reçue dans `workflow-wiring.spec.cjs` : la liaison enregistrée conserve un mapping vide malgré des ports de même nom. [Journal des six parcours reçus](review-standard-gui.log).

### R3 — P2, fermé : double geste de copie présenté comme un échec après réussite

Un vrai double-clic Playwright sur **Créer la copie** crée bien une seule copie, puis affiche `Cannot read properties of null (reading 'workflow')`. Le second submit est mis en file et accède à `reuseBundle` après que le premier l’a effacé. Le succès est conservé, mais le message incite à recommencer une opération déjà réussie.

Preuve : deuxième scénario de [review-reuse-safety.spec.cjs](review-reuse-safety.spec.cjs), [journal rouge](review-reuse-gui.log). Le snapshot d’erreur est conservé localement dans `/tmp/tricorder-ux-review-gui/review-reuse-safety-double-81a47-false-failure-after-success/error-context.md`. L’assertion vérifie d’abord qu’il existe exactement une copie, puis détecte l’alerte incorrecte.

Correction reçue : garde synchrone avant mise en file, désactivation du bouton, vérification du formulaire encore connecté et réactivation en cas d’erreur récupérable. Le **même double-clic** du test initial produit désormais une seule copie et aucune alerte. [Contre-épreuve GUI corrigée](review-reuse-gui-corrected.log), deuxième scénario. Le test n’a pas été remplacé par un simple clic.

### R4 — P2, fermé : choisir une donnée corrigée ajoute une seconde source à la même entrée

Exemple métier : un bloc prépare `invitation` et `revised`; le bloc de relecture attend `invitation`. Le formulaire préremplit `invitation → invitation`. Choisir explicitement `revised → invitation` conserve les deux correspondances au lieu de remplacer la première. Le workflow peut être enregistré ainsi.

Preuve GUI indépendante : troisième scénario de [review-reuse-safety.spec.cjs](review-reuse-safety.spec.cjs), [journal rouge](review-mapping-gui.log). Le mapping réellement sauvegardé est `{"invitation":"invitation","revised":"invitation"}`.

L’effet moteur a été joué séparément avec deux valeurs synthétiques différentes et `runtime.execute` en simulation : [script](review-mapping-conflict.py), [résultat](review-mapping-conflict.log). Le moteur lève `review : plusieurs valeurs incompatibles pour invitation`; la transaction de remise est annulée, le producteur demeure `running`, le destinataire `pending`. Aucun travail réel n’est exécuté, mais le parcours devient difficile à récupérer.

Correction reçue : le sélecteur supprime la correspondance antérieure vers l’entrée choisie avant d’ajouter la source explicite. La contre-épreuve GUI sauvegarde maintenant exactement `{"revised":"invitation"}`. [Journal corrigé](review-reuse-gui-corrected.log), troisième scénario, avec assertion identique à la reproduction rouge.

Le contrat refuse également les destinations dupliquées à l’intérieur d’un même lien, avec le nom du bloc et une instruction en français. [Contre-épreuve moteur corrigée](review-mapping-conflict-corrected.log) : l’ancienne définition ambiguë est refusée **avant démarrage, zéro exécution créée**. Les trois tests ciblés de contrat passent et conservent la possibilité de parents distincts pour un join : [journal](review-connections-unit.log). Cette prévention ne répare pas rétroactivement une ancienne exécution déjà figée ; aucun état existant n’a été modifié.

## Comportements reçus

- Une décision nouvellement ajoutée expose immédiatement `approve`/`reject` sans devoir soumettre son formulaire. Changer de destination conserve la branche choisie ; passer à une source de travail revient correctement à `done`. La liaison persiste après sauvegarde/réouverture.
- Le détail des liens montre `fiche_diagnostic → fiche`; le graphe indique la quantité de données. Une sélection partielle sortie/entrée est refusée avec conservation du formulaire, puis se répare sans JSON.
- Un refus humain affiche **Refusée** dans le graphe et le détail, avec une couleur distincte. La branche d’accord reste ignorée. Ce traitement distingue décision enregistrée et autorisation accordée sans changer le moteur.
- Un projet métier peut créer son espace local sans dépôt préparé à l’extérieur. Le dialogue annonce l’initialisation Git et l’absence de commit ou envoi distant. Un workflow peut devenir un modèle puis une copie indépendante de projet ; les consignes non encore soumises sont sauvegardées avant copie.
- Les dépendances hors page distinguent attente automatique et suspension manuelle. Les tests unitaires vérifient la priorité de `coordination_hold` et l’absence de modification de l’état.
- La projection `summary` ne transmet qu’un identifiant de conversation texte de 128 caractères au maximum. [Contre-épreuve](review-summary-boundary.py) avec chaîne courte, 128/129 caractères, objet contenant un million de caractères et valeur nulle : [journal](review-summary-boundary.log). Toutes les projections restent sous 800 octets dans ce banc et la définition/exécution reste intacte.

## Autre observation, sans attribution de cause

La première lecture de `electron/main.cjs` avait relevé une course potentielle : `showCockpit()` ne passait `cockpitLoaded` à vrai qu’après `await window.loadURL(...)`. Un appel réentrant via `showWorkflows`/`open-file` pendant ce chargement pouvait demander un second `loadURL`. L’orchestrateur a ensuite reproduit ce double appel en extrayant les anciennes fonctions et en contrôlant leur promesse de chargement.

**Complément reçu indépendamment :** `workspaceLoader` dans `electron/workspace-window.cjs` partage maintenant la promesse entre appelants, la conserve jusqu’à résolution et efface la tentative après rejet. `main.cjs` initialise ce loader avant l’installation de Studio et des API, puis les deux entrées l’attendent. Les réglages de titre et taille qui ne passent plus par `showCockpit` lors d’une entrée directe Workflow sont déjà identiques dans le constructeur de la fenêtre. Aucun changement de protocole, de permissions ou de fenêtre supplémentaire.

Les **2 tests** de `workspace-loading.test.cjs` ont été rejoués avec succès : chargement unique concurrent, refus propagé à chaque appelant et nouvel essai explicite. Une contre-épreuve supplémentaire extrait **les fonctions produit actuelles sans les réécrire**, appelle simultanément `showCockpit` et deux `showWorkflows` sur une fenêtre instrumentée, puis vérifie un seul `loadURL`, aucune navigation avant sa résolution, arguments de fichier conservés et aucun rechargement lors d’un appel ultérieur. Une exception synchrone de `loadURL` est également partagée entre les appelants puis permet un nouvel appel. Journaux locaux : `/tmp/tricorder-review-workspace-loading.log` et `/tmp/tricorder-review-workspace-loading-independent.log`.

Aucune régression concrète détectée dans cette correction ciblée. Le nouvel essai reste une possibilité du loader, **pas une reprise automatique du démarrage de l’application** : le gestionnaire global de rejet initial conserve sa fermeture explicite. Aucun GUI ou rebuild joué pour ce complément. **Le lien avec le `ERR_FAILED` du sélecteur natif d’UX5 demeure non démontré** ; il n’est pas attribué à cette course.

## Vérifications et limites

- 6 parcours GUI standard réussis sur le premier build ; puis **3 parcours GUI indépendants réussis sur le build corrigé**. Les deux rouges initiaux sont conservés comme reproductions, pas comme échecs actuels.
- 12 tests Python de projections réussis ; 5 cas supplémentaires de borne d’identifiant reçus sans mutation.
- Première passe JS : 13/14 réussis. L’unique échec attendait l’ancien texte « Continuer dans le terminal » pendant le changement parallèle du worker vers « Continuer dans la conversation ». Après alignement et ajout de la protection de copie : **15/15 tests JS ciblés réussis**, [journal final](review-design-unit-corrected.log).
- **3/3 tests Python de contrat de liaison réussis**, plus contre-épreuve indépendante du refus avant création de run. Aucun join valide à parents distincts n’est interdit par le nouveau contrôle.
- Quatre captures ont été ouvertes et inspectées : projet local, dialogue Réutiliser, refus humain, copie composée. Elles résident dans `/tmp/tricorder-ux-review-standard/` et `/tmp/tricorder-ux-review-gui/`; les journaux nomment les tests exacts. Aucun résultat d’analyse commerciale ni fournisseur réel n’est revendiqué.

Les six tests standard ne sont pas comptés comme six utilisateurs : il s’agit d’une contre-vérification automatisée indépendante. La recette globale, le paquet final, les parcours des autres spécialistes et le dernier groupe demandé par l’utilisateur restent des réceptions distinctes. Les fenêtres et brokers des bancs de cette passe sont fermés ; les serveurs X partagés restent disponibles.

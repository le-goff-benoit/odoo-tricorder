# Panel final 2/6 — Business analyst support

Date : 10 octobre 2026. Profil : métier majoritaire, niveau technique modéré.
Responsabilité : test et avis ; aucune correction produit, aucun commit.

**Verdict : trois parcours GUI aboutissent. Aucun P0/P1 identifié dans ce périmètre. Des P2 restent à traiter pour rendre la configuration et la confirmation plus naturelles pour un analyste métier.**

## Banc et limites de la preuve

Banc : `tests/panel-v2-user-2.spec.cjs`, Electron réel, build fourni sans reconstruction, écran `:189`, projets temporaires. Configuration dédiée : `/tmp/tricorder-collections-panel/user-2.config.cjs`, un worker, uniquement ce spec. Les chemins HOME, état Electron, runtime, Codex et Claude sont isolés pour chaque test ; les deux exécutables CLI sont des scripts inertes, vérifiés dans le terminal. Nettoyage limité aux brokers de fixture et aux répertoires temporaires.

Commande exécutée depuis le dépôt :

```sh
DISPLAY=:189 XAUTHORITY=/tmp/tricorder-collections-panel/189/Xauthority python3 /tmp/tricorder-ci-target-source-run.py --config=/tmp/tricorder-collections-panel/user-2.config.cjs
```

Validation : **3/3 passent** ; revue visuelle des captures réelle avec `view_image` ; syntaxe JavaScript vérifiée. Le banc accepte `TRICORDER_EXECUTABLE` et sélectionne alors également le backend du paquet. Le paquet final n’a pas encore été testé par ce profil.

Les projets sont créés par l’API. Le premier workflow est créé et configuré par clics. Les deux autres graphes sont préparés par fixture. Les exécutions de départ, plans et résultats d’agents sont synthétiques, déposés exclusivement par l’API validée `Engine`, sans édition de JSON d’état/SQLite et sans fournisseur payant. L’ouverture depuis les projets, la collecte des réponses, les validations, le lancement des éléments, la navigation parent/enfant et la préparation de reprise sont réellement cliqués. Cette preuve qualifie ces interactions et les contrats, pas la qualité d’une analyse IA ni un lancement natif depuis un terminal.

## Parcours 1 — Demande, précision, criticité, constat

Étapes cliquées : créer un workflow dans le projet ; convertir le brouillon en données structurées ; renommer la première tâche et saisir sa consigne ; déclarer ses entrées `demande`/`precision` et sorties `critical`/`constat` ; ajouter deux questions, une condition et deux confirmations ; configurer la comparaison et les branches `true`/`false` ; établir six liens avec correspondances ; enregistrer ; réorganiser et ajuster le graphe.

Attendu : l’analyste peut créer le parcours sans JSON, transmettre les réponses à l’analyse, aiguiller une seule branche et recevoir le constat avant confirmation.

Observé : six blocs et six liens enregistrés sans JSON. Deux exécutions, pour une criticité fausse puis vraie, sont ouvertes depuis le projet. Les deux réponses sont saisies dans la GUI ; le résultat d’analyse synthétique est soumis par Engine puis validé dans la GUI. La branche normale puis la branche critique attendent chacune leur confirmation ; l’autre branche est `skipped`. Le constat transmis est vérifié dans les entrées reçues. Après réponse, chaque exécution est `completed` ; les résultats sont accessibles directement. Les identifiants et PID du terminal initial restent inchangés.

Preuves : [workflow dessiné](preuves/02-support/01-01-workflow-cree-support.png), [constat normal reçu](preuves/02-support/02-02-branche-normale.png), [branche critique](preuves/02-support/03-03-branche-critique.png), [résultats](preuves/02-support/04-04-resultat-normal.png).

## Parcours 2 — Lien erroné et réparation

Fixture : deux blocs avec sorties texte et booléen, entrée texte et aucun lien.

Étapes cliquées : sélectionner la sortie booléenne `critical` et l’entrée texte `fiche` ; demander le lien ; remplacer la sortie par `constat` ; créer, enregistrer et examiner les liens du destinataire.

Attendu : refuser l’échange incompatible, conserver le contexte et permettre une réparation sans JSON.

Observé : lien refusé, modal conservée ; réparation acceptée avec `constat → fiche`, persistée et lisible dans les propriétés. **Friction P2 :** une explication annonce correctement l’incompatibilité, mais l’alerte rouge demande de sélectionner sortie et entrée, alors que les deux sont déjà choisies.

Preuves : [incompatibilité](preuves/02-support/05-06-lien-incompatible.png), [réparation](preuves/02-support/06-07-lien-repare.png).

## Parcours 3 — Question enfant, échec et reprise ciblée

Fixture : plan de trois tickets, bloc par élément avec concurrence trois, workflow enfant avec une tâche et deux tentatives autorisées. Exécution explicitement en simulation. Le plan est remis par Engine ; le lancement des trois éléments est cliqué. Engine remet un ticket terminé, pose une question pour le deuxième et remet un échec pour le troisième.

Attendu : voir question et échec depuis le parent, répondre au bon élément, préparer la correction du seul ticket échoué et préserver les travaux terminés.

Observé : parent et graphe annoncent « 1 élément en échec · 1 réponse attendue » ; les trois tickets sont nommés et accessibles. Ouverture du ticket à préciser, réponse « Dépôt Nord », retour parent, ouverture du ticket échoué et saisie de correction dans la reprise. Après remise synthétique des deux résultats, le parent termine avec 3/3 tickets. Vérification Engine : tentative du ticket échoué = 2 ; ticket avec question = 1 ; **état intégral du ticket déjà terminé strictement identique avant/après**. Le terminal initial reste visible à côté du suivi à 1280 × 800.

Une première préparation en mode natif a été refusée : « Travail de démonstration : choisir une commande ou un exécutant connecté. » Le scénario final est explicitement simulé ; aucun lancement natif réussi n’est revendiqué.

Preuves : [parent en attente et échec](preuves/02-support/07-08-parent-question-et-echec.png), [terminal et suivi](preuves/02-support/08-08b-parent-terminal-1280.png), [reprise ciblée](preuves/02-support/09-09-reprise-ciblee.png), [parent terminé](preuves/02-support/10-10-parent-termine-reprise-ciblee.png).

## Frictions et corrections concrètes

| Priorité | Constat pour ce profil | Correction proposée |
|---|---|---|
| P2 | Le constat reçu est replié par défaut pendant sa confirmation. La question seule ne rappelle pas le contenu à examiner. | Afficher d’emblée les entrées métier courtes dans une question de confirmation, ou proposer un aperçu du constat au-dessus de la réponse. |
| P2 | L’alerte rouge du lien incompatible demande de sélectionner les deux données déjà sélectionnées. | Afficher dans l’alerte l’erreur précise de contrat, les types source/destination et le choix à corriger. |
| P2 | Une condition Oui/non demande de saisir `true` et `false`, puis montre « Si : false » dans le parcours métier. | Préconfigurer les branches du booléen et afficher Oui/Non ; permettre un libellé métier critique/normal sans changer la valeur technique. |

Ce qui reste opaque : « conversion en données structurées », noms techniques des ports et distinction entre tâche conversationnelle et exécutant autonome d’un élément. Les formulaires évitent effectivement le JSON pour ce scénario, mais le BA doit comprendre l’origine et la destination des données. Un exemple support prêt à personnaliser et une explication contextualisée du choix d’exécutant diminueraient ce coût. Les questions, erreurs et budgets de reprise sont en revanche explicites, localisés et accessibles depuis le résultat principal.

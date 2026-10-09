# Réception indépendante des interactions UI — 9 octobre 2026

Relecture de `src/app.js`, `src/studio.js`, `src/execution-view.mjs` et `src/studio-execution.css`, suivie de contre-épreuves Electron réelles. Le reviewer n’a modifié aucun fichier applicatif ; il est l’auteur de `tests/execution-interactions.spec.cjs`. La review couvre les transitions d’état, la réception des résultats, le polling, le clavier, la saisie et la continuité du terminal. La conception esthétique et les nouvelles projections de santé/dépendances du backend font l’objet de réceptions séparées.

## Constats et corrections reçues

| Priorité | Défaut observé | Référence du correctif | Réception |
|---|---|---|---|
| P1 | Le panneau d’échec cachait la recherche d’accusé d’un effet incertain. | `studio.js`, `runInspector` | Adaptateur local : exactement `send` puis `lookup`, aucun deuxième envoi ; exécution terminée avec l’accusé retrouvé. |
| P1 | Un résultat négatif valide d’aiguillage n’était plus recevable. | `execution-view.mjs`, `failedResult` ; `studio.js`, `runInspector` | Résultat `ok=true`, `verdict=fail` reçu manuellement ; branche correctrice prête et branche `pass` écartée. |
| P2 | Un échec arrivé pendant le suivi gardait un badge « À valider ». | `studio.js`, `poll` et `nodeBadge` | Sans rouvrir : badge « Échec », attribut `data-failed` et nom accessible actualisés. |
| P2 | Une nouvelle demande déplaçait le focus du sous-menu Rechercher et le refermait. | `studio.js`, `renderConversation` | Rouge puis vert : sous-menu ouvert et focus exact conservés. |
| P2 | Une actualisation arrivée pendant la saisie d’une recherche était consommée sans rendu ultérieur. Le compteur restait à deux demandes après la troisième. | `studio.js`, `renderConversation` et `pollConversation` | Rouge puis vert : deux réponses réelles de polling à trois demandes avant de quitter le champ ; compteur/liste rattrapés et brouillon non soumis préservé. |
| P2 | Le terminal d’une autre conversation était présenté comme celui du workflow affiché. | `app.js`, `renderTerminals` | Deux conversations dans le même projet : contexte distinct, retour explicite au terminal d’origine, même PTY/PID et aucune ouverture implicite. |
| P2 | Le fournisseur mémorisé rebaptisait « Codex » une commande shell lancée après l’arrêt de l’agent. | `app.js`, `terminalIdentity` | Rouge puis vert : prompt « Shell · Codex arrêté », programme `sleep` correctement identifié puis retour au prompt après Ctrl-C ; mêmes sessions/PID. |

L’action principale utilise désormais le bloc explicitement indiqué par `executionAction`, plutôt que le seul focus du run. Le correctif a été relu. Le focus du menu principal, l’action Ajouter une demande et le brouillon de réponse à une question restent également préservés pendant l’arrivée de demandes indépendantes.

## Preuves et reproduction

Les journaux publics sont dans [le dossier de preuves](2026-10-09-interactions-review/). Les traces ZIP des essais rouges restent sous `/tmp/tricorder-execution-search-review/` et `/tmp/tricorder-terminal-program-review/`, hors Git. Les adresses de projet et les processus des essais sont synthétiques.

- `search-before.log` : deux régressions de recherche reproduites.
- `search-and-terminal-after.log` : trois parcours reçus après correction de recherche et du contexte terminal.
- `reception-and-effect-after.log` : réception d’un résultat négatif valide et réconciliation d’un effet incertain, deux parcours verts.
- `terminal-program-before.log` : processus réel `sleep`, onglet affichant à tort « Codex 1 ».
- `terminal-program-after.log` : dernier recontrôle vert, 1/1 en 17,6 secondes.
- `polling-and-draft-after.log` : extrait des deux parcours verts badge/focus/brouillon du premier passage.

Commande de reproduction de l’ensemble des sept contre-épreuves :

```sh
npx playwright test tests/execution-interactions.spec.cjs --output=/tmp/tricorder-interactions
```

Le fichier accepte aussi `TRICORDER_EXECUTABLE=/chemin/du/paquet/odoo-tricorder`. Les passages ciblés de cette review utilisent Electron source et le renderer construit par l’intégrateur. Les contrôles verts ont été réutilisés tant que leurs chemins n’étaient pas modifiés ; aucune nouvelle campagne générale n’a été lancée par le reviewer.

HOME, XDG et PATH sont isolés. La CLI est une boucle locale inerte. L’adaptateur de notification est un programme local qui perd volontairement son premier accusé puis le restitue en lecture. Aucun modèle payant, messagerie, dépôt client ou production n’est appelé. Les fixtures utilisent les API `Engine` et `Conversations`, sans retouche directe de l’état moteur. La continuité de session est vérifiée par identifiant et PID, avec une saisie effectivement reçue dans le terminal initial.

Cette réception ne prouve pas le comportement d’un fournisseur réel ni tous les outils possibles. La campagne intégrée et la recette du paquet final restent à la charge de l’intégrateur.

## Gel de la réception

Sept contre-épreuves utiles sont conservées dans le fichier de tests. Toutes ont été reçues lors des passages ciblés décrits ci-dessus, avec des données synthétiques différentes et de vraies sessions. `node --check tests/execution-interactions.spec.cjs` et `git diff --check` passent. Aucun défaut non corrigé ne reste dans le périmètre inspecté.

L’intégrateur a également identifié deux gardes de présence nécessaires lorsque ni conversation ni terminal associé n’existent. Les comparaisons `undefined === undefined` ne doivent pas autoriser une lecture de leurs propriétés. Les gardes explicites ont été relues ; leur réception globale sans conversation appartient aux parcours desktop et launch-repair de l’intégrateur. Le manifeste `sources.json` décrit les fichiers présents à la remise, après ces gardes.

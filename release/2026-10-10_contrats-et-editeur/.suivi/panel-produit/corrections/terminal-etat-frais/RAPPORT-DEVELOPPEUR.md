# Terminal occupé : reprise erronée et libellé périmé

Candidat 0.6.0-rc.13 ; tests synthétiques sur :190 uniquement. Aucun état client ni fournisseur réel.

## Cause

`tests/execution-interactions.spec.cjs:181` attendait «sleep · R1…» après avoir réellement démarré `sleep 30` dans le PTY. Le broker déclarait déjà `program=sleep, idleShell=false`, mais le cache UI gardait `bash, idleShell=true`. L’action `conversation-terminal` décidait d’ouvrir le dialogue de reprise depuis ce cache avant de retrouver la session. Elle n’appelait donc ni `workflow-terminal` ni `refreshSessions`. L’onglet restait ancien jusqu’au poll de 5 secondes ; sous charge sa réponse dépassait l’assertion de 5 secondes.

Le vrai défaut est aussi visible quand le test initial passe : le dialogue «Reprendre l’agent de cette conversation» reste ouvert alors qu’un programme travaille.3/3 traces instrumentées reproduisent cet état.

## Preuves avant correctif

- Scénario original inchangé :3/3 verts isolément, `/tmp/tricorder-editeur-terminal-label-unchanged/` ; cela ne disculpe pas l’interface.
- 3/3 traces avec dialogue parasite et IPC/cache observés : `/tmp/tricorder-editeur-terminal-label-traced/`. `diagnostic.json` montre `sleep-observed`, puis `click:conversation-terminal` avec cache bash/idleShell, puis seulement 4,36 s plus tard un onglet sleep ; dialogue encore ouvert.
- Contrôle explicite «aucun dialogue pour programme occupé» : rouge, reçu 1 dialogue au lieu de 0, `/tmp/tricorder-editeur-terminal-label-red/`. Trace Electron complète dans ce dossier.

## Correction limitée

`src/studio.js`, seule action `conversation-terminal` : retrouve d’abord la session via `terminal.open`, qui lit l’état actuel du broker et rafraîchit l’UI. La reprise reste explicitement proposée seulement quand le résultat frais porte `agentState=stopped`. Aucun nouveau PTY, aucun redémarrage automatique.

`tests/execution-interactions.spec.cjs` : assertion d’absence de dialogue pour sleep actif, mêmes 2 PTY et même PID après le clic. Le scénario existant de reprise explicite d’un agent arrêté reste la contre-épreuve complémentaire.

## Vérification après correctif

- `npm run build` : vert.
- Scénario occupé renforcé + reprise explicite : 4/4 verts (2 répétitions de chacun), `/tmp/tricorder-editeur-terminal-label-green/`.
- Commande : `DISPLAY=:190 XAUTHORITY=/tmp/tricorder-collections-panel/190/Xauthority python3 /tmp/tricorder-ci-target-source-run.py tests/execution-interactions.spec.cjs --grep 'terminal identifies another|a stopped conversation' --repeat-each=2 --output=/tmp/tricorder-editeur-terminal-label-green --reporter=line`.
- Réception indépendante : `/root/avis_contre_epreuve`, écran :188, produit figé depuis build.


## Garde-fou complémentaire : terminal historique fermé

Le reviewer indépendant a prouvé qu’après `exit` de l’agent puis `exit` du shell, un clic de consultation créait auparavant un nouveau PTY et relançait l’agent sans dialogue. Preuve indépendante : `/tmp/tricorder-review-terminal-fresh/results-dead-shell/fresh-independent-dead-his-5c723-efore-an-agent-is-recreated/`.

Contrat final de `workflow-terminal` :

- Conversation jamais lancée : première ouverture inchangée, création et lancement autorisés par le geste initial.
- Session vivante occupée : retourner la session et son état actuel ; aucune reprise.
- Shell vivant au prompt : retourner `stopped` ; reprise uniquement après confirmation, même id/PID.
- Conversation historique dont le terminal est fermé : `terminalState=closed`, `agentState=stopped`, chemin projet, aucun id de session ; aucune création ni lancement pour `resume=false`.
- Confirmation `resume=true` : ouvrir un nouveau terminal si nécessaire, reprendre la même conversation et conserver les demandes/résultats.

Fichiers du complément :

- `electron/main.cjs` : garde historique avant création du PTY.
- `src/app.js` : réponse `closed` traitée sans sélection/montage fictif ; historique connu reste arrêté ; information `terminalClosed` disponible pour le dialogue. La correction du fit n’a pas été retouchée.
- `src/studio.js` : consultation fraîche avant décision de reprise ; dialogue explicite «Ouvrir un terminal et reprendre» pour terminal fermé. Les mentions affirmant à tort que tout agent arrêté possède un shell ouvert sont retirées.
- `tests/execution-interactions.spec.cjs` : absence de dialogue pour programme occupé, session conservée ; scénario de fermeture avec compteur réel de lancements, consultation et annulation sans effet, reprise explicite, autre PTY et demandes conservés.

Validation finale :

- Build et vérification syntaxique : verts.
- Occupé et shell vivant : 2/2 verts, `/tmp/tricorder-editeur-terminal-closed-green/`. Ce passage incluait une attente de texte trop stricte dans le nouveau test fermé : une question humaine prioritaire masque le texte «Agent arrêté», mais affiche bien l’action de reprise. Seule cette attente a été corrigée.
- Terminal fermé, consultation, annulation, nouveau terminal explicite et autre session : 1/1 vert, `/tmp/tricorder-editeur-terminal-closed-final/`.
- Réception indépendante du même build : 4/4 verts en 23,9 s, annoncée par `/root/avis_contre_epreuve` (inclut rechargement de l’application avant reprise).
- Candidat figé ; aucun changement produit après le build reçu. Écran :190 vide confirmé par `xwininfo -root -tree` : zéro fenêtre enfant.

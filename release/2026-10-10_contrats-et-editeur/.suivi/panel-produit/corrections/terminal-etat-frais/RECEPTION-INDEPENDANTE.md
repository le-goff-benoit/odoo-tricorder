# Réception indépendante — état réel du terminal

Réception ciblée du 10 octobre 2026, sur projets synthétiques isolés. Aucun fournisseur réel, projet client, mail ou Slack utilisé. Aucun fichier produit ni test partagé modifié par cette revue.

## Défaut confirmé avant correction

**P1 — retrouver une conversation dont le PTY est fermé relance implicitement son agent.** Dans le candidat initial, `electron/main.cjs`, handler `workflow-terminal`, ne retenait que les sessions `alive`. Une liaison historique fermée devenait donc identique à une conversation jamais lancée. Le nouveau chemin de `conversation-terminal`, qui consulte l’état frais avant de proposer la reprise, atteignait cette création implicite.

Contre-épreuve réelle : lancer un faux agent interactif, le quitter par `exit`, constater le shell vivant, puis quitter ce shell par `exit` et constater `alive=false`. Cliquer « Retrouver la conversation » appelle `resume=false`, mais crée un autre PTY/PID et exécute une deuxième fois le faux agent, sans dialogue. Les deux lancements ont des PID 1792838 et 1792854 ; le compteur interactif passe de 1 à 2. La capture montre le nouveau terminal déjà actif.

Preuves : [journal rouge](independant/rouge-pty-ferme/reception-dead-shell.log), [IPC, états et compteur](independant/rouge-pty-ferme/evidence.json), [capture native](independant/rouge-pty-ferme/end-native.png), [scénario rejouable](independant/rouge-pty-ferme/fresh.spec.cjs), [empreintes](independant/rouge-pty-ferme/SHA256.json). La petite trace ZIP est également conservée dans ce dossier.

Contrat de correction demandé : distinguer la première ouverture d’une liaison historique fermée ; cette dernière renvoie explicitement `terminalState=closed`, `agentState=stopped`, sans créer de PTY. Le renderer ne doit pas monter un identifiant inexistant. Une confirmation doit annoncer la création d’un nouveau terminal. Annuler et simplement retrouver la conversation ne doivent rien lancer.

## Réception du correctif

**Favorable sur ce périmètre : 4/4 scénarios indépendants passent en 23,9 secondes.** Le P1 historique fermé est corrigé et reçu. Aucun lancement ne précède l’accord pour cette situation.

| Contre-épreuve | Résultat observé |
|---|---|
| Commande locale `sleep` active, ancien cache UI `idleShell=true` | Consultation fraîche `busy`, aucun dialogue de reprise, compteur 1 et même PTY/PID 1793911. |
| Agent arrêté, shell encore vivant | Dialogue explicite sans lancement ; annulation sans effet ; confirmation seule relance l’agent dans le même PTY/PID 1794426. Demandes inchangées. |
| Deux conversations, trois allers-retours | Deux agents au total ; mêmes deux PTY/PID 1794654 et 1794722. La saisie produit une vraie réponse du faux agent dans la première session retrouvée. |
| PTY historique fermé | Deux consultations `resume=false` renvoient `closed`, sans identifiant ; compteur 1 et aucun PTY vivant avant accord, après annulation et après rechargement. La confirmation crée exactement un nouveau PTY/PID 1795067 à la place du PID fermé 1794967. Demandes inchangées. |

La première ouverture reste normale dans les quatre scénarios : un seul lancement, sans dialogue de reprise parasite. Le dialogue du cas fermé annonce « Un nouveau terminal sera ouvert » et propose « Ouvrir un terminal et reprendre ». Les captures natives ont été relues : confirmation lisible, historique conservé après annulation, deux sessions distinctes visibles lors de la navigation.

Relecture ciblée : le garde-fou du handler `workflow-terminal` (`electron/main.cjs:183`) intervient avant toute création pour une liaison historique ; `src/app.js:210` traite `closed` sans monter de terminal, et `terminalStatus` conserve l’état arrêté à partir de la liaison connue. `src/studio.js:1266` distingue les confirmations shell vivant/terminal fermé. La réponse fraîche de `conversation-terminal` reste celle qui décide de proposer une reprise.

Preuves finales : [journal 4/4](independant/vert-final/reception-final.log), [scénario indépendant](independant/vert-final/fresh.spec.cjs), [empreintes du candidat](independant/vert-final/candidat-SHA256.json), [empreintes des preuves](independant/vert-final/SHA256.json). Les dossiers par scénario contiennent les observations IPC, le compteur de lancements et les captures natives. [Avant accord](independant/vert-final/fresh-independent-dead-his-5c723-efore-an-agent-is-recreated/closed-before-consent.png), [annulation sans effet](independant/vert-final/fresh-independent-dead-his-5c723-efore-an-agent-is-recreated/closed-cancelled.json), [après accord](independant/vert-final/fresh-independent-dead-his-5c723-efore-an-agent-is-recreated/closed-after-consent.json).

Rejeu dans ce dépôt, sans rebuild, sur l’écran de test réservé :

```sh
DISPLAY=:188 XAUTHORITY=/tmp/tricorder-collections-panel/188/Xauthority \
python3 /tmp/tricorder-ci-target-source-run.py \
  --config=/tmp/tricorder-review-terminal-fresh/playwright.config.cjs \
  --output=/tmp/tricorder-review-terminal-fresh/results-final
```

L’écran :188 et les processus isolés ont été libérés après la réception. Aucun fichier produit ni fixture commune modifié.

## Banc et limites

Le faux fournisseur écrit un compteur uniquement lorsqu’il est lancé dans un PTY ; les appels de capacité et de version sont exclus. Les observations CDP et IPC enregistrent les états et les appels sans forcer le cache ni modifier les résultats. Les captures sont prises nativement par Electron.

Deux essais préparatoires n’étaient pas des défauts produit : un compteur incluait initialement les inspections non interactives du fournisseur ; un appel `terminal.stop` attendait le dialogue natif de confirmation. La contre-épreuve rouge conservée utilise deux sorties naturelles et atteint bien la transition métier.

Cette réception porte sur la gestion des sessions locales et la confirmation, pas sur la restauration d’une session distante d’un vrai fournisseur. La qualification complète et celle du paquet restent distinctes.

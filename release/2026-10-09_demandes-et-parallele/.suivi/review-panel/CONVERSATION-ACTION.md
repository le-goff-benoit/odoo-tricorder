# Diagnostic indépendant — accès à la conversation en attente humaine

**Correction produit requise : « Voir le terminal » n’est pas un remplacement équivalent de « Retrouver la conversation » ou « Reprendre l’agent… ».** La condensation ne doit pas supprimer ces accès lorsque la demande attend une question, une décision ou une réception. Il ne faut pas rendre le test vert en lui faisant accepter un simple shell.

## Preuve reçue

Les suites source et paquet échouent à `tests/execution-interactions.spec.cjs:183`, avant le lancement du fournisseur inerte : le bouton accessible « Retrouver la conversation » est absent de la bande visible. Le snapshot montre une demande R1 en `waiting_input`, « Répondre à la question » et « Voir le terminal ». Les traces et contextes originaux sont copiés dans [conversation-action-original/](conversation-action-original/), avec empreintes dans [index.json](conversation-action-original/index.json).

Le second scénario à `tests/execution-interactions.spec.cjs:222` utilise la même préparation et le même premier accès ; il est exposé à la même cause. Son attente ultérieure de reprise dans la bande est aussi incompatible avec la branche actuelle. Initialement déduit du code, ce second échec est maintenant confirmé dans les traces source et paquet `execution-interactions-a-s-7eeca-ng-requests-or-its-terminal`, également copiées dans le dossier de preuves avec le préfixe `stopped`.

## Chaîne causale et portée réelle du bouton

1. `src/studio.js:428` définit `humanFocus` pour `waiting`, `waiting_input` et `returned`, dans la vue d’une demande.
2. `src/studio.js:430` force alors `conversation-shell` / « Voir le terminal », avant d’examiner si l’agent est arrêté ou si la conversation dispose d’un terminal.
3. `conversation-shell`, `src/studio.js:1228`, consulte `integration.terminalStatus`. Quand la cible est inconnue, il appelle `terminal.open` **sans identifiant de conversation**.
4. `src/app.js:217` retourne précisément `unknown` lorsqu’aucune session vivante n’est liée à cette conversation.
5. `electron/main.cjs:175` traite l’absence d’identifiant comme une demande de shell de projet. Il réutilise le premier terminal vivant de ce projet ou crée un shell (`:177`). Il ne prépare aucun agent et ne lie pas ce terminal à la conversation cible.

| État de la conversation affichée | Effet de « Voir le terminal » actuel |
|---|---|
| Aucun terminal lié, aucun terminal du projet | Crée un shell ; aucun fournisseur et aucune liaison à la conversation. Le premier scénario attend au contraire `INERT REVIEW AGENT`. |
| Aucun terminal lié, une autre conversation vivante dans le même projet | Peut sélectionner le terminal de l’autre conversation (`all.find` sur le seul projet). Le bandeau peut signaler « Autre conversation », mais l’action ne retrouve pas celle demandée. |
| Terminal cible déjà lié et agent actif | Transmet l’identifiant, retrouve le bon PTY ; la voie est correcte dans ce cas. |
| Terminal cible déjà lié, agent arrêté | Retrouve son shell sans reprise (`resume=false`). Le bouton de reprise ayant été supprimé par `humanFocus`, il ne permet pas de continuer à dialoguer dans la bande compacte. |

Le test existant crée justement deux conversations indépendantes dans un même projet puis exige deux sessions distinctes, le retour au premier PTY et sa conservation après sortie de l’agent. Une substitution de libellé ferait perdre cette preuve métier.

Nuance : l’accès n’est pas supprimé de toute l’application. Le menu Options déplace encore une action terminal de conversation (`src/studio.js:305`, `:318`), et Vue d’ensemble rend la branche normale de lancement/reprise. Mais forcer ce détour ou accepter un shell à la place affaiblirait le parcours terminal demandé. La correction concerne l’accès direct de la bande, sans rétablir une bannière textuelle envahissante.

## Correction minimale recommandée

Conserver `humanFocus` uniquement pour supprimer le préfixe textuel redondant « Agent arrêté · progression conservée ». **Retirer son branchement prioritaire dans le choix des actions.** Utiliser la logique déjà présente pour les autres états :

```js
const terminalActions = agentStopped() && !currentWorkFinished()
  ? button('resume-agent', 'Reprendre l’agent…', 'flat')
    + button('conversation-shell', 'Voir le shell', 'flat')
  : button(
      currentWorkFinished() ? 'conversation-shell' : 'conversation-terminal',
      currentWorkFinished() ? 'Voir le terminal' : 'Terminal',
      'flat',
      currentWorkFinished() ? ''
        : 'aria-label="Retrouver la conversation" title="Retrouver la conversation"'
    );
```

`conversation-terminal` (`src/studio.js:1227`) transmet toujours la conversation voulue, ouvre la confirmation si la session est arrêtée, et le backend réutilise sa liaison exacte. `resume-agent` conserve sa confirmation avec périmètre, avertissement sur la ligne de saisie et contrôle du prompt. Ni une question ni une décision ne doit démarrer implicitement un agent : le clic utilisateur et la confirmation de reprise restent nécessaires.

Conserver le traitement d’une demande **terminée** : elle propose les résultats et la consultation du terminal, sans inciter à reprendre un agent inutilement. Ne pas élargir `humanFocus` à un masquage de toutes les commandes de conversation.

## Vérification attendue après correction

- Garder le parcours existant `terminal identifies another conversation…` : premier lancement lié, seconde conversation indépendante, retour au même id/PID, sortie agent et commande `sleep` non prise pour de l’IA.
- Garder le parcours de reprise explicite : annuler la confirmation ne redémarre rien ; confirmer conserve les mêmes demandes, exécutions et PTY, sans dupliquer la conversation.
- Si le préfixe de statut redondant est retiré, remplacer sa seule assertion textuelle par la présence de l’action de reprise et l’état `idleShell`, jamais par un clic sur un simple shell.
- Le test de panel qui exige zéro `resume-agent` lors d’une longue décision (`tests/panel-interaction.spec.cjs:97`) fige précisément la suppression problématique. Le remplacer par la preuve que les actions de décision restent entièrement accessibles avec la commande de reprise disponible, puis qu’aucune reprise ni aucun accord ne se produit implicitement.
- Conserver le test de demande terminée qui exige l’absence d’incitation à reprendre l’agent (`tests/terminal-resume-ux.spec.cjs`).

Diagnostic effectué en lecture seule. Aucun nouveau GUI, fournisseur, état moteur, source, test ou build modifié par le reviewer. Les références de ligne décrivent le candidat analysé avant correction. Recommandation transmise au responsable.

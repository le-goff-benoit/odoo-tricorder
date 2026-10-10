# Diagnostic de la reprise d’une commande — rc16

Deux suites complètes ont rencontré le même défaut. Les contre-épreuves instrumentées restent vertes ; la cause n’est pas établie. Aucun correctif applicatif spéculatif n’a été déduit de ces observations.

## Observation initiale

Sur `/tmp/tricorder-rc16-final`, le scénario `a failed local command shows its diagnostic, opens a root shell and announces immediate retry before confirmation` a échoué pendant la suite complète : après le clic sur « Relancer maintenant », le formulaire restait affiché, sans erreur visible, et la tentative restait à 1.

La trace initiale contient uniquement `test.trace` et le contexte d’échec, pas les événements DOM ou IPC du renderer. Le clic Playwright se termine sans erreur en 56 ms ; les lectures `run.get` continuent de répondre durant l’attente. Ces éléments ne permettent pas de distinguer une soumission non reçue d’un blocage de file : ils ne prouvent ni un clic perdu, ni un défaut du moteur.

## Contre-épreuves ciblées

- Même candidat, même scénario et mêmes assertions, projets et HOME synthétiques, écran Xvfb distinct de la recette globale.
- **10 répétitions réussies**, avec captures de trace navigateur.
- **6 répétitions supplémentaires déjà engagées réussies**, avec observation des canaux IPC `studio:request` et `studio:human`.
- Sur chacune des six, un seul appel `run.retry` est observé ; tous réussissent. Le formulaire se ferme et l’exécution atteint la tentative 2 puis le diagnostic d’échec attendu de la commande synthétique.
- Durée des appels `run.retry` observés : 116 à 592 ms. Aucune exception IPC.
- Aucun envoi externe, appel fournisseur réel, fichier client ou configuration de compte utilisé. Aucun fichier applicatif modifié pour cette recherche. Cette première série a été arrêtée à la demande du responsable ; une nouvelle investigation a été explicitement demandée après la récidive dans la suite B.

Les écouteurs DOM placés sur le document extérieur ne capturent pas le `submit` interne au Shadow DOM. Ils ne servent donc pas de preuve de soumission ; la réception IPC et les assertions métier constituent les preuves retenues.

## Preuves

- [10 répétitions](retry-repeat-10.log)
- [6 répétitions avec IPC](retry-ipc-repeat-6.log)
- [Appels de reprise observés](retry-ipc.json)
- [Empreintes du candidat examiné](retry-candidat.json)

Traces navigateur et scripts temporaires conservés localement dans `/tmp/tricorder-rc16-retry-diagnostic/` et `/tmp/tricorder-rc16-retry-diagnostic-v2/`. Trace de l’échec initial : `/tmp/tricorder-rc16-full-ui/collection-input-ux-a-fail-792f7-e-retry-before-confirmation/trace.zip`.

## Récidive dans la suite B et investigation de séquence

Le même échec survient en position 10 de la suite complète du candidat `/tmp/tricorder-rc16-reception`. Son contexte et sa trace sont sous `/tmp/tricorder-rc16-reception-ui/collection-input-ux-a-fail-792f7-e-retry-before-confirmation/`. La trace confirme encore que le clic termine normalement (50 ms) et que les lectures du moteur répondent ; elle ne contient toujours pas les événements DOM/IPC permettant de localiser la rupture.

À la demande du responsable, nouvelle investigation sur ce candidat, copies de tests temporaires seulement :

- Fichier `collection-input-ux.spec.cjs` entier : **9/9 verts**, donc les sept cas précédents du même fichier ne suffisent pas à reproduire le défaut.
- Préfixe exact de la suite, `attempt-history.spec.cjs` puis `collection-input-ux.spec.cjs` : **11/11 verts**, reprise en position 10 comprise.
- Renderer ralenti ×6 via CDP, sans tracing navigateur : **2/2 verts**. Cela explore une perturbation temporelle ; ce n’est pas une reproduction de la charge complète et ne prouve aucune cause.
- L’instrumentation de cette série écoute le vrai Shadow DOM `#workflow-panel.shadowRoot`. Les clics et `submit` sont effectivement observés, suivis chacun d’un seul IPC `run.retry`, réussi. Les formulaires se ferment et le moteur atteint bien la tentative 2.
- Xvfb distinct, mêmes dimensions 2560×1600×24 que la suite B ; aucun accès fournisseur réel, secret ou projet client.

Preuves : [fichier entier](retry-sequence-9.log), [préfixe de 11 cas](retry-prefix-11.log), [ralentissement renderer](retry-renderer-throttle-2.log), [événements de soumission et IPC](retry-sequence-ipc.json). Scripts et traces locaux : `/tmp/tricorder-rc16-retry-sequence/`.

## Conclusion et limite

Le défaut intermittent est observé **deux fois en suite complète** ; les contrôles isolés et les préfixes instrumentés ne l’expliquent pas. Il serait incorrect de le déclarer résolu, de l’attribuer à un clic perdu, à la charge, au moteur ou à la seule séquence précédente. Pour localiser la rupture lors d’une prochaine occurrence, enregistrer passivement les événements `pointerdown`, `pointerup`, `click`, `submit` et `invalid` dans le Shadow DOM, ainsi que les entrées/sorties des canaux `studio:request` et `studio:human`, dans la prochaine suite complète. Aucun contournement des assertions ni correctif applicatif n’a été appliqué pour obtenir ces résultats.

## Instrumentation conservée pour la prochaine recette

À la demande du responsable, `tests/collection-input-ux.spec.cjs` conserve maintenant l’observation passive sur le seul scénario de reprise : événements `pointerdown`, `pointerup`, `click`, `submit`, `invalid` du Shadow DOM et entrée/sortie de `studio:human` pour `run.retry`. Les résultats sont bornés (100 événements et 20 appels), sans réponse métier complète ni contenu du terminal. Une pièce jointe `retry-dom-ipc.json` est écrite dans le dossier du test avant la fermeture de l’application, même après échec. Le clic, la temporisation et les assertions métier restent inchangés ; aucune reprise automatique n’est introduite.

Vérification : syntaxe `node --check` et diff propres ; **un seul scénario ciblé relancé, réussi en 6,3 s**, [journal](retry-passive-targeted.log). Le stockage de la pièce jointe a ensuite été rendu explicite par fichier pour les artefacts du reporter CLI ; syntaxe revérifiée, sans répétition supplémentaire. Cette instrumentation prépare une preuve future ; elle ne résout ni n’explique la cause des deux échecs en suite complète.

## Recette finale

Le scénario réussit en 6,3 s dans le groupe 1 de la recette générale à quatre bureaux isolés. La [trace DOM/IPC](retry-recette-finale.json) est conservée. Le paquet Ubuntu réussit également ce scénario. Ces succès ne prouvent pas la résolution des deux échecs antérieurs.

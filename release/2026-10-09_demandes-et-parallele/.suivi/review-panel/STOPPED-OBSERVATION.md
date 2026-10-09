# Arrêt d’agent : réception du décalage entre deux observations

**Diagnostic : course d’observation du test, distincte de la régression produit `humanFocus` corrigée.** La correction locale du test est reçue par trois parcours complets. Aucun nouveau défaut produit établi ; aucun changement de source ou de bundle demandé par cette analyse.

**Réception finale ajoutée : le troisième passage source complet réussit, 146 réussis / 0 échec / 2 ignorés**, comme le paquet final. Le [log source v3 archivé](final-reception/ui-source-v3.log) remplace l’attente de réception sans effacer le rouge v2. Le bundle et l’ASAR correspondent aux empreintes reçues ; seuls les contrôles de synchronisation du test ont changé.

Le second passage complet donne **source 145 réussis / 1 échec / 2 ignorés**, et **paquet 146 réussis / 0 échec / 2 ignorés**. Le seul échec source est `execution-interactions.spec.cjs:232`, l’apparition de « Reprendre l’agent… » dans les cinq secondes suivant une lecture directe de l’état PTY. Le paquet réussit ce même scénario. Les deux logs et la trace rouge sont conservés dans [final-stopped-failure](final-stopped-failure/), avec empreintes dans son index.

## Chaîne causale

1. `tests/execution-interactions.spec.cjs:222,229` interroge directement `window.tricorder.terminals.list()`. Cette lecture ne met pas à jour la variable `sessions` du renderer.
2. Le retour au prompt modifie `at_prompt` dans `backend/terminal_service.py:116–143`, puis émet des données terminal. Il ne clôt pas le shell et n’émet pas l’événement `sessions` de `finish()`.
3. `src/app.js:542–548` actualise le cache et le texte du terminal. Son échéance périodique est de **5 000 ms** (`src/app.js:836`). `terminalStatus`, lignes 216–220, lit ce cache.
4. `src/studio.js:1512–1532` interroge la conversation, lit ensuite `terminalStatus`, puis repeint la bande à son propre rythme de **1 000 ms**. À focus terminal, le report de peinture réservé à un champ de recherche de la bande ne s’applique pas.

Une attente de 5 secondes après une lecture API fraîche couvre donc moins que la somme des deux cycles, à laquelle s’ajoutent les réponses IPC et l’ordonnancement. La trace montre `idleShell` obtenu environ 5 ms après Entrée, puis une attente de visibilité de 5 004 ms. Son snapshot possède déjà « Shell · Codex arrêté » et « Agent arrêté » dans le terminal, mais encore « Retrouver la conversation » dans la bande : c’est précisément l’état intermédiaire entre les étapes 3 et 4.

La trace rouge s’arrête à l’échéance : elle ne permet pas d’affirmer l’instant exact où cette occurrence aurait convergé. La convergence et le maintien des garanties métier sont vérifiés séparément ci-dessous, sans rafraîchissement ni navigation forcés.

## Correction relue et contre-épreuve

La correction du parent attend d’abord `.terminal-scope` contenant **Agent arrêté**, avec une borne locale de **10 secondes**, puis conserve l’attente originale de **5 secondes** sur le bouton de reprise. Cette première borne laisse une marge au cycle de 5 secondes et aux IPC ; elle ne promet pas une actualisation instantanée. Aucun délai global de la suite n’est augmenté. L’apparition de la reprise, son périmètre et son fonctionnement restent exigés.

Contre-épreuve indépendante : copie du scénario corrigé dans [stopped-observation.spec.cjs](stopped-observation.spec.cjs), configuration dédiée, trois répétitions sur `DISPLAY=:184`. Une observation DOM en lecture seule toutes les 25 ms mesure les transitions ; les seules écritures sont les actions UI normales et les fixtures créées par l’API Engine. Pas de remplacement d’état, de réponse, de timer produit ou de cache. Aucun vrai fournisseur : HOME/PATH isolés et exécutables inertes d’origine conservés.

| Répétition | API idle observée | Terminal « Agent arrêté » | Bouton de reprise dans le DOM | Écart terminal → reprise |
|---|---:|---:|---:|---:|
| 1 | 46 ms | 4 101 ms | 4 852 ms | 752 ms |
| 2 | 35 ms | 3 926 ms | 4 650 ms | 725 ms |
| 3 | 21 ms | 4 125 ms | 4 875 ms | 750 ms |

Mesures depuis le début de l’observation, juste avant la saisie `exit`. La résolution de l’assertion Playwright peut être plus tardive que l’apparition DOM ; les valeurs détaillées distinguent ces deux instants. Les trois répétitions n’ont pas recréé l’expiration originale, mais reproduisent bien les deux observations espacées et réussissent le parcours intégral.

**3 réussis en 25,7 secondes**, puis nettoyage vérifié. Chaque passage conserve : question en attente, annulation de la reprise sans effet, confirmation explicite, entrée reçue par l’agent repris, mêmes demandes/exécution, même identifiant et même PID, une seule session. Le screenshot inspecté montre simultanément l’arrêt du terminal, la question en attente et les accès Reprendre/Voir le shell.

Preuves : [log, traces, captures, mesures et empreintes](stopped-observation-proof/). Bundle source utilisé : `dist/app.js` SHA-256 `4e8b38d2314aa6020cab9b8679c48092ce78792f575404d48d6c90f9f95e4342`, identique au relevé lors du rouge v2. Les trois fixtures, leurs shells/brokers et le dossier temporaire de résultats sont absents après nettoyage. Le serveur X partagé n’a pas été arrêté.

## Portée de l’avis

Le paquet complet, la correction de synchronisation du test et le troisième passage source complet sont reçus dans le périmètre synthétique éprouvé. Le log source v2 demeure rouge et n’est pas réétiqueté vert ; les nouveaux logs verts et leurs empreintes sont conservés dans [final-reception](final-reception/). Les réserves Ajuster/petit panneau, architecture et absence de qualification de véritables fournisseurs restent celles de [REVIEW.md](REVIEW.md). Aucun test ou build supplémentaire lancé pour cette mise à jour documentaire.

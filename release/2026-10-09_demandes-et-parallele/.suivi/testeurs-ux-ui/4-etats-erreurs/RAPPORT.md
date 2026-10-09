# UX4 — comprendre l’état et résoudre sans déboguer

Audit indépendant réalisé le 9 octobre 2026, entrée normale de Tricorder, fenêtre 1440 × 1000 sur display 184. Verdict : les réponses, décisions et reprises sont accessibles dans la GUI ; le principal risque de compréhension vient de la coexistence des états du terminal, du bloc et de sa configuration. Aucun blocage irréversible confirmé.

Les cinq constats ci-dessous portent sur les parcours de résolution. Leur gravité exprime un jugement UX d’un observateur, pas une mesure d’incidence auprès d’utilisateurs.

## 1. Un lancement conversationnel accepté paraît nécessiter une nouvelle configuration — majeur

**Contexte.** Nouvelle demande → workflow « Demande ponctuelle » → lancement dans le terminal. Même situation après réponse à une question et après préparation d’une reprise.

**Attendu.** L’état principal indique « agent arrêté, reprendre la conversation » et décrit séparément la possibilité facultative de lancer un agent propre au bloc.

**Observé.** Le lancement est accepté, le terminal de la demande existe et le moteur considère le bloc prêt. Le suivi affiche pourtant « À configurer » ; après reprise, l’encart présente « Configurer un nouveau lancement… » avant « Reprendre l’agent… ». La phrase explique bien que la demande peut continuer dans le terminal, mais elle est subordonnée à cet état de configuration. L’utilisateur doit comprendre deux modes d’exécution pour choisir son prochain geste.

**Preuves vues.** [05 — lancement arrêté et suivi](captures/ux4-etats-erreurs-05-sortie-inerte-et-suivi.png), [12 — après reprise GUI](captures/ux4-etats-erreurs-12-reprise-preparee.png). La réponse GUI est également conservée dans `fixture-events.jsonl` puis dans le rapport visible.

**Impact.** Risque de créer une nouvelle exécution ou de modifier la configuration alors que reprendre la conversation conservée suffit.

**Amélioration.** En mode conversation, mettre « Prêt à continuer dans la conversation » / « Agent arrêté » au premier niveau et « Reprendre l’agent » en action principale. Présenter la configuration d’un agent de bloc comme une option distincte, sans remplacer l’état fonctionnel du bloc.

**Limite.** L’arrêt est celui d’un fournisseur local inerte, pas une défaillance attestée de Codex. L’état prêt après réponse/reprise est préparé et reçu par les commandes validées du moteur.

## 2. « Relancer cette étape » prépare la reprise sans lancer de travail — modéré

**Contexte.** Échec synthétique d’un bloc → « Préparer la reprise » → motif → « Relancer cette étape ».

**Attendu.** Le bouton annonce la conséquence immédiate et la prochaine action nécessaire.

**Observé.** Le motif est sauvegardé et le bloc redevient prêt ; aucun travail ne démarre. L’utilisateur revient à « À configurer » et doit ensuite choisir de reprendre l’agent. Le premier bouton « Préparer la reprise » est exact ; le bouton final change cette promesse.

**Preuves vues.** [10 — échec](captures/ux4-etats-erreurs-10-echec-a-reprendre.png), [11 — dialogue](captures/ux4-etats-erreurs-11-motif-reprise.png), [12 — résultat du geste](captures/ux4-etats-erreurs-12-reprise-preparee.png). `engine-final-read.json` conserve le motif et la tentative antérieure.

**Impact.** L’utilisateur peut croire que la reprise tourne déjà et attendre une sortie qui ne viendra pas.

**Amélioration.** Libeller le bouton « Préparer cette étape pour reprise », puis afficher une confirmation « Reprise préparée ; reprenez l’agent pour continuer », accompagnée de l’action directe.

**Limite.** Le travail de la tentative suivante a été fourni synthétiquement via Engine après la reprise GUI ; aucune exécution modèle n’est revendiquée.

## 3. Le budget de tentatives manque au moment de décider une reprise — modéré

**Contexte.** Première tentative échouée d’un bloc configuré pour deux tentatives au maximum.

**Attendu.** Avant confirmation : « Tentative 1 sur 2 ; une reprise restante », avec portée de la reprise.

**Observé.** Le dialogue indique seulement « La limite de tentatives du bloc s’applique ». La carte d’échec ne présente ni numéro courant ni maximum. L’historique existe dans une section repliée, puis le rapport décrit les tentatives, mais ces informations ne sont pas données au moment du choix.

**Preuves vues.** [10 — carte d’échec](captures/ux4-etats-erreurs-10-echec-a-reprendre.png), [11 — dialogue sans compteur](captures/ux4-etats-erreurs-11-motif-reprise.png). Le contrat Engine reçu porte `max_attempts=2` et le résultat final porte `attempt=2`.

**Impact.** L’utilisateur engage sa dernière tentative sans connaître la marge disponible, ni pouvoir expliquer simplement la chronologie.

**Amélioration.** Afficher tentative actuelle/maximale et reprises restantes dans l’erreur et le dialogue. Conserver l’ancien résumé visible à proximité du motif de reprise.

**Limite.** Le refus au dépassement du maximum n’a pas été joué ; le constat concerne l’information donnée avant la reprise autorisée.

## 4. Le résultat fini nécessite un détour par un rapport technique — modéré

**Contexte.** Décision finale approuvée pour un livrable textuel fictif.

**Attendu.** Une exécution terminée montre immédiatement le livrable final ou un lien explicite « Voir le résultat » ; l’historique et le rapport restent disponibles ensuite.

**Observé.** Le suivi terminé affiche « Exécution terminée », « Décision humaine : Approuvée » et « Voir le rapport ». Lors d’une réouverture depuis l’historique, le détail indique seulement que le rapport réunit les résultats. Le rapport commence par la demande, le plan et les états ; le contenu produit se trouve plus bas dans « Réalisation ».

**Preuves vues.** [15 — fin de parcours](captures/ux4-etats-erreurs-15-resultat-final.png), [16 — haut du rapport](captures/ux4-etats-erreurs-16-rapport-final.png), [18 — suivi retrouvé](captures/ux4-etats-erreurs-18-conversation-retrouvee.png). `rapport-visible.txt` conserve le livrable et son contexte.

**Impact.** Retrouver l’invitation demande des déplacements et une lecture des états d’exécution, alors que le besoin est le contenu final.

**Amélioration.** Ajouter un panneau « Résultat final » avec le livrable, son bloc d’origine et sa validation. Lier le rapport et l’historique depuis ce panneau.

**Limite.** Le livrable est synthétique ; sa qualité métier n’est pas évaluée. La présence du contenu dans le rapport est un succès, pas une perte de données.

## 5. Une exécution terminée conserve un appel à reprendre l’agent — mineur

**Contexte.** Après la décision humaine finale, puis dans le rapport de l’exécution terminée.

**Attendu.** La fin est le message dominant ; une éventuelle suite conversationnelle est formulée comme une nouvelle intention.

**Observé.** La bande supérieure continue de dire « Agent arrêté · progression conservée. Aucune étape en cours · 1 terminée » et propose « Reprendre l’agent… ». Le suivi affiche en même temps « Terminée · 3 / 3 étapes ».

**Preuves vues.** [15 — suivi terminé](captures/ux4-etats-erreurs-15-resultat-final.png), [16 — rapport terminé](captures/ux4-etats-erreurs-16-rapport-final.png).

**Impact.** Le lecteur peut douter que tout soit fini et lancer une reprise inutile. Aucune reprise d’une exécution terminée n’a été déclenchée pendant cet audit.

**Amélioration.** Pour une conversation dont toutes les demandes sont terminées, remplacer l’appel dominant par « Toutes les demandes sont terminées ». Ranger « Continuer cette conversation » parmi les actions secondaires.

## Parcours reçus, réussites et limites

| Parcours | Réception effective | Réussite observée | Limite |
| --- | --- | --- | --- |
| P1 activité / bloc sélectionné | Lancement, arrêt, graphe puis sélection de la décision encore prévue | Le détail dit « Cette étape attend ses dépendances » et distingue le bloc sélectionné du statut global | Aucun bloc durablement en cours observé : le stub quitte immédiatement |
| P2 question / décision | Question imprévue synthétique ; réponse française GUI ; décision prévue ; approbation GUI | Question, zone de réponse et action sont proches ; décision associe demande, contenu reçu et question de validation | Refus de la décision non joué ; aucune réponse modèle réelle |
| P3 échec / reprise | Arrêt réel du stub ; échec de bloc synthétique ; motif/reprise GUI ; résultat synthétique tentative 2 | Erreur lisible, action locale, ancien résultat et motif conservés ; distinction contrôle automatique / décision humaine explicite | Le stub n’a pas remis lui-même le résultat d’échec du bloc ; dépassement de tentatives non joué |
| P4 final / historique / conversation | Exécution A terminée ; exécution B créée GUI et arrêtée ; historique A/B ; consulter A ; changer pour Shell 1 puis retrouver A | Titres, révision, date et état permettent de choisir ; consulter A sélectionne son terminal ; « Retrouver la conversation » ramène aussi le bon terminal | B reste en attente, pas de deuxième résultat terminé ; export et archive non joués |

Le libellé transitoire « Shell occupé » après la sortie du stub a été remplacé par « Codex arrêté » lors du rafraîchissement : aucun défaut permanent retenu. Aucune erreur JavaScript de page reçue (`page-errors.json`).

## Origine et portée des preuves

- Aucun rapport voisin ni code produit lu avant la première observation. Ensuite, seules les commandes Engine / Conversations / contrats du backend empaqueté ont été consultées pour préparer les états synthétiques.
- Actions utilisateur reçues exclusivement par GUI : lancement A/B, reprise de l’agent A, réponse, motif de reprise du bloc, approbation, historique, sélection du terminal et retour conversation.
- `fixture_engine.py` ne réalise que `claim`, `ask` et `submit`. `fixture-events.jsonl` journalise les quatre préparations. Aucun `answer`, `retry`, `decide` ni `accept` API utilisé pour contourner les gestes GUI. Aucun SQLite/JSON d’exécution retouché.
- Les exécutions sont des conversations locales classées « réelles » par le produit, avec fournisseurs inertes et contenus SYNTHÉTIQUES ajoutés pour cet audit. Ce classement n’est pas un verdict de modèle réel ni une anomalie de simulation.
- 18 captures PNG prises puis toutes ouvertes et examinées. La capture 09 montre la réponse **saisie**, pas l’accusé de sauvegarde ; la sauvegarde est attestée par la lecture Engine et le rapport visible. La capture 14 montre le haut du formulaire ; l’approbation a été cliquée ensuite dans la GUI.
- Aucun compte, client, service externe, secret, trousseau, source produit, build, commit ou suite complète modifié.

## Candidat et nettoyage

Exécutable reçu : SHA256 `9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3`.
ASAR reçu : SHA256 `a344374116f8ada276e426dd94279450b73cee31ba46aa981ae830a1fb64f44b`.
Contrôles de lancement effectués par `harness.launch`. Prévol terminal GUI : capture 02 avec les deux chemins temporaires et marqueurs `TRICORDER-UX-INERT`.

Le nettoyage et les SHA de fin sont consignés dans `cleanup.json` et `sha-fin.txt` après fermeture du banc. Xvfb et les processus des autres agents sont préservés.

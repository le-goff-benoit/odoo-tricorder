# Panel v2 — profil 6 : utilisateur métier, clavier et petit écran

## Cadre et résultat

Deux parcours complets de création, configuration et utilisation réalisés dans la GUI Electron sur des projets synthétiques. Fenêtre réelle de contenu à 1280×800, puis 1100×800 ; terminal principal conservé côte à côte. Aucun changement produit, reconstruction ou commit. Aucun compte, base client ou fournisseur réel. Projet temporaire et fournisseurs factices propres au profil, nettoyés après chaque test.

Test rejouable : `tests/panel-v2-user-6.spec.cjs`. Le lancement accepte `TRICORDER_EXECUTABLE` ; les fixtures recherchent le backend dans `process.resourcesPath/backend`, puis utilisent celui du dépôt en exécution source.

Commande exécutée :

```sh
DISPLAY=:190 XAUTHORITY=/tmp/tricorder-collections-panel/190/Xauthority python3 /tmp/tricorder-ci-target-source-run.py --config=/tmp/tricorder-collections-panel/user-6.config.cjs
```

Dernier rejeu source : **2 tests réussis, 26,6 secondes**, sortie 0. Vérification syntaxique du test par `node --check` réussie.

Le banc retire les vrais fournisseurs du PATH ; chaque HOME isole des exécutables `codex`/`claude` imprimant `PANEL_ERGO_INERT`, attendant puis sortant en échec. Leur maintien permet de vérifier la session, sans appeler une IA. Les résultats de travail, questions d’agent et échec sont fournis explicitement par fixtures Python utilisant `Engine.claim`, `Engine.submit` et `conversations.ask`. La définition est conçue en GUI ; réponses, validation humaine et préparation de reprise se font en GUI. Aucun état SQLite ou JSON n’est réécrit.

## Parcours et attentes

| Parcours | Attendu | Observé |
|---|---|---|
| Réunion bénévoles : projet et workflow vierge | Nommer un travail, ajouter deux questions et configurer leurs textes sans JSON | Réussi via formulaires. Une question ajoutée en validant le dialogue au clavier avec Tab/Entrée, l’autre à la souris. |
| Dessin | Déplacer une carte à la souris ; déplacer au clavier et annuler ; relier au clavier et à la souris | Réussi. Flèche droite = +10 ; Maj+flèche bas, puis Ctrl+Z rétablit la hauteur. Focus conservé sur la carte. Liens créés après confirmation. |
| Mémo | Ajouter une note, la déplacer au clavier, conserver le dessin au retour | Réussi. La note « Mémo de réunion » reste visible et éditable dans la définition sauvegardée. Dans ce petit graphe, elle n’est pas placée sous un lien. |
| Exécuter le dessin | Terminal visible ; valider le compte rendu factice ; répondre aux deux questions ; terminer | Réussi. Exécution à 3/3 étapes. La sentinelle de note `PENSER_AU_CAFE` est absente de la définition exécutée ; les notes restent dans le dessin sauvegardé. |
| Invitation : second projet et workflow | Configurer consigne, budget de 2 tentatives, question de relecture et lien sans JSON | Réussi via GUI. |
| Question du travail | Identifier la tâche et sa question ; préserver la réponse entre Graphe et Détail | Réussi à 1100×800. La réponse saisie « Salle des fêtes — entrée côté jardin. » est conservée. Question, champ et bouton Répondre sont lisibles avec le terminal ouvert. |
| Échec et réparation | Comprendre le résultat précédent, la correction attendue et le budget avant reprise | Réussi. « Tentative 1 sur 2 · 1 reprise restante », cause « date manquante », champ Correction attendue. Le dialogue explique que préparer ne démarre pas l’agent. Préparation = état ready et tentative toujours 1 ; un résultat factice supplémentaire permet validation et relecture. |
| Retrouver le travail | Retour au projet, réouverture de la conversation, même terminal | Réussi. Identifiants et PID des sessions vivantes identiques ; terminal visible au retour. |

Les reprises de banc ont corrigé uniquement des synchronisations de test : attente de la création et de la sauvegarde asynchrones, défilement du bloc avant drag, attente de la fermeture du dialogue de reprise et de la validation avant la question suivante. Les fixtures ne contournent pas un blocage du moteur. Elles matérialisent le résultat d’un fournisseur absent.

## Observations et remèdes

Aucun P0/P1 nouveau observé dans ce profil. Les deux parcours peuvent aller jusqu’à la fin.

### P2 — tableau du projet difficile à lire avec terminal à 1100×800

Reproduction : créer le workflow Invitation, le terminer, garder le terminal côte à côte, réduire à 1100×800, ouvrir Projets puis la fiche Invitation. Le tableau d’exécutions réduit « Contexte », « État », « Exécution réelle » et « Terminé » en fragments de quelques lettres, certains verticalement. Les actions restent accessibles, mais une personne métier lit mal le contexte et l’état. Le titre de la demande occupe aussi une colonne très étroite.

Remède proposé : basculer cette liste vers des cartes ou une ligne contenant titre et état sur petite largeur disponible ; protéger la largeur des libellés d’état. Critère de réception : mêmes terminal et fenêtre, contexte et état lus comme des mots entiers, accès Consulter et Archiver conservé.

Preuve : `11a-projet-tableau-terminal-1100.png` du parcours Invitation.

### P2 — Ajuster garde l’ancienne sélection après réponse, suite coupée en bas

Reproduction : workflow Réunion à trois blocs, terminal ouvert ; valider le premier, répondre à Choisir la date ; réduire à 1100×800, cliquer Graphe puis Ajuster. Le bloc Choisir la date, déjà validé et sélectionné, reste au centre. Le bloc Confirmer la préparation des invitations, qui attend maintenant une réponse, est coupé en bas. Le bandeau supérieur donne néanmoins son nom et offre « Répondre à la question », donc le parcours reste faisable.

Remède proposé : rendre explicite « Centrer la sélection » si tel est le comportement voulu, ou donner à Ajuster une vue qui conserve entièrement l’étape à traiter ; distinguer « Tout afficher » et « Étape courante ». Critère : après réponse et redimensionnement, la tâche actuellement attendue est lisible entièrement ou l’action proposée indique clairement ce qu’elle centre.

Preuves : `03-terminal-graphe-1280.png` et `05-suivi-terminal-1100.png` du parcours Réunion. Cette observation complète le défaut de graphe déjà relevé par d’autres profils ; elle n’ajoute pas de blocage P1 indépendant.

### Contre-épreuve — note et formulaires

Le mémo ajouté à ce graphe de trois blocs est visible à droite des blocs et des liens, lisible, et ne déclenche aucun travail. Cette réussite locale ne réfute pas la collision de note déjà observée ailleurs. Le formulaire de question, l’alerte d’échec et le dialogue de reprise sont entièrement utilisables à 1100×800 avec terminal. Le focus de carte persiste après déplacement/annulation clavier ; le champ de correction a un anneau de focus visible. Aucun débordement global horizontal observé à 1100×800 dans ces écrans.

## Preuves

Captures ouvertes avec `view_image`, textes visibles joints à chaque capture. Répertoire du dépôt `test-results/panel-v2-user-6/` à archiver par l’orchestrateur :

- `panel-v2-user-6-Parcours-m-0a10c-puis-utiliser-avec-terminal/` : 01 dessin/note ; 02 sauvegarde retrouvée ; 03 terminal/graphe 1280 ; 04 réponse avec terminal ; 05 suivi/graphe 1100 ; 06 exécution terminée.
- `panel-v2-user-6-Parcours-m-f6f6e-sible-et-terminal-principal/` : 07 dessin Invitation ; 08 brouillon de réponse à 1100 ; 09 échec à réparer ; 10 formulaire reprise ; 11a tableau projet ; 11b conversation retrouvée avec terminal.

Les fichiers JSON de géométrie sont des instantanés supplémentaires après capture, et non une mesure atomique avec la capture : un rafraîchissement peut basculer Graphe/Détail entre les deux. Les captures inspectées constituent la preuve visuelle utilisée pour les constats.

Limites : GUI pilotée par Playwright selon un scénario métier indépendant ; aucune personne recrutée, aucune IA réelle, aucun effet externe qualifié. Les fournisseurs factices et résultats moteur n’évaluent ni la qualité d’un agent ni la reprise réelle de son processus après correction.

## Captures archivées

- [01-dessin-note-1280.png](preuves/06-ergonomie/01-dessin-note-1280.png)
- [02-sauvegarde-retrouvee.png](preuves/06-ergonomie/02-sauvegarde-retrouvee.png)
- [03-terminal-graphe-1280.png](preuves/06-ergonomie/03-terminal-graphe-1280.png)
- [04-question-terminal-1280.png](preuves/06-ergonomie/04-question-terminal-1280.png)
- [05-suivi-terminal-1100.png](preuves/06-ergonomie/05-suivi-terminal-1100.png)
- [06-termine-terminal.png](preuves/06-ergonomie/06-termine-terminal.png)
- [07-workflow-invitation.png](preuves/06-ergonomie/07-workflow-invitation.png)
- [08-question-brouillon-1100.png](preuves/06-ergonomie/08-question-brouillon-1100.png)
- [09-reparation-attendue-1100.png](preuves/06-ergonomie/09-reparation-attendue-1100.png)
- [10-reparation-formulaire-1100.png](preuves/06-ergonomie/10-reparation-formulaire-1100.png)
- [11a-projet-tableau-terminal-1100.png](preuves/06-ergonomie/11a-projet-tableau-terminal-1100.png)
- [11b-conversation-retrouvee-terminal-1100.png](preuves/06-ergonomie/11b-conversation-retrouvee-terminal-1100.png)

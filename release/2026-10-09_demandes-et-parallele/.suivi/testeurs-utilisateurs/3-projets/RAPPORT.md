# Avis utilisateur indépendant — 3-projets

Profil : cheffe de projet, technique intermédiaire. Réception le 9 octobre 2026, paquet **0.6.0-rc.12**, démarrage normal, écran 1440 × 1000. Produit générique, aucun usage Odoo métier.

**Verdict : réutilisation et coordination manuelle réussies ; reprise réussie pour l'état et le lancement, réception de résultats partielle faute d'agent réel.** Aucun bug bloquant établi. Les trois parcours ont été effectués par les contrôles GUI, sans lecture de code produit, sans fixture de progression et sans simulation.

## Trois parcours métier

| Parcours | Intention et gestes réellement effectués | Attendu / observé | Verdict et conséquence |
|---|---|---|---|
| Réutiliser entre projets | Créer Atelier Azur puis Laboratoire Corail comme espaces locaux. Dans Corail, ouvrir Créer un workflow, choisir le modèle « Release — demandes, plan, réalisation et validation », nommer « Lancement produit commun » et choisir Azur. Dans l'éditeur : Options → Réutiliser, nommer « Lancement produit Corail », choisir Corail, créer la copie. | Original enregistré sous Azur, copie sous Corail ; 9 blocs / 8 liens dans les deux. L'interface prévient que chaque copie évolue indépendamment et ne reprend ni demandes ni résultats. Aucun sélecteur natif utilisé. | **Réussi.** Je peux repartir du même processus pour deux équipes et identifier sa destination. Preuves 02 et 03. L'indépendance de modifications ultérieures n'a pas été testée. |
| Conversation et consolidation dépendante | Activité → Nouvelle demande → workflow Azur → Continuer. Saisir une intention fictive Nacre contenant trois demandes ; cocher « Inclure d'autres projets » → Corail ; lancer dans le terminal. L'agent inerte s'arrête. Vue d'ensemble → Options → Ajouter une demande : enregistrer les critères de validation sous Corail. Ajouter une consolidation sous Azur en cochant les deux demandes comme prérequis. | Une intention initiale crée une demande ; les deux demandes complémentaires sont ajoutées par GUI. Trois demandes dans la même conversation, avec les projets corrects. Consolidation « Attend une autre demande », deux prérequis « En attente de réussite ». Aucun démarrage automatique, aucune étape en cours. | **Réussi pour la structuration ; partiel pour la réalisation.** L'interface permet de coordonner les deux projets et protège la consolidation tant que les prérequis ne réussissent pas. Le découpage IA de l'intention et la libération après résultats ne sont pas reçus. Preuves 04 à 07. |
| Retrouver et reprendre | Quitter le suivi pour Corail : retrouver la conversation et sa demande Corail, puis Activité : retrouver les trois demandes. Cliquer la demande Corail, lire le dialogue de reprise, revenir, puis Reprendre l'agent → Reprendre dans ce terminal. Revenir à la vue d'ensemble et Activité. | Conversation commune retrouvée depuis le second projet. Dialogue précis sur les suspensions, dépendances et session fournisseur. Seconde invocation du stub visible dans le terminal existant ; arrêt ensuite identifié. Trois demandes et deux prérequis conservés ; une fenêtre, zéro erreur page. | **Réussi pour navigation/reprise ; partiel pour priorités et résultats.** Blocages et arrêt sont lisibles, aucun résultat n'est inventé. Aucune priorité structurée repérée dans les écrans parcourus ; pas de résultat métier disponible à recevoir. Preuves 07 et 08, textes exportés. |

## Constats priorisés

1. **P2 — friction de portée entre projet affiché et shell actif.** Après ouverture de la demande Corail depuis Activité, le titre et la sélection latérale montrent Corail, tandis que le shell et sa reprise restent dans Azur, projet principal de la conversation. La ligne « Shell : Atelier Azur · Demande affichée : Laboratoire Corail » dit vrai, mais elle est petite et noyée dans les informations de terminal. Je dois la lire avant toute commande locale. Une portée explicite et plus visible près de la reprise aiderait à éviter un geste dans le mauvais dossier. Ce constat ne démontre aucun mauvais routage moteur. **Preuve 07.**
2. **P2 — manque fonctionnel observé pour le pilotage des priorités.** Dans Activité, la consolidation bloquée arrive avant les deux prérequis ; la demande décrite comme « prioritaire » n'est qu'un titre, sans priorité, échéance ou moyen de classement visible dans les formulaires parcourus. Je retrouve les états, mais pas immédiatement quoi traiter en premier. Réception limitée aux écrans visités ; l'agent inerte ne peut pas interpréter la priorité narrative. **Preuve 08.**
3. **P2 — friction : ajout de demandes discret et titre initial trop long.** « Ajouter une demande… » est dans Options, alors que la création promet plusieurs tâches dans la conversation. J'ai pu le découvrir et ajouter les deux demandes, mais cette action mérite une entrée visible dans Vue d'ensemble. L'intention initiale longue devient un titre tronqué se terminant par « après réception des de », repris dans les cartes et l'onglet du terminal ; les demandes courtes suivantes sont plus faciles à piloter. Je ne conclus pas à une perte du texte dans les données internes. **Preuves 05, 06 et 08.**
4. **P3 — friction d'ouverture du graphe.** À 100 %, le modèle à neuf blocs n'en montre qu'environ quatre sur la largeur, avec défilement horizontal. Le nombre de blocs et « Ajuster » sont présents, mais l'ordre complet n'est pas immédiatement visible lors de la création ou de la copie. Un cadrage initial du workflow entier faciliterait sa compréhension. **Preuves 02 et 03.**

## Points réussis

- Les espaces locaux se créent sans compte ni configuration préalable ; leurs chemins apparaissent.
- Les dialogues de réutilisation distinguent copie de workflow et résultats d'exécution.
- Les demandes portent leur projet ; plusieurs prérequis sont sélectionnables par de vrais contrôles et leur attente est affichée.
- « Agent arrêté », « Aucune étape en cours » et les boutons de reprise évitent de croire qu'un travail se poursuit dans le fond.
- Une conversation commune est retrouvée depuis Corail ; la reprise réutilise le terminal, conserve les demandes et ne supprime aucune dépendance.

## Banc, preuves et limites

`harness.cjs` et `paquet.json` communs utilisés ; DISPLAY 183 explicitement libéré. HOME, XDG, runtime, état et configurations fournisseurs isolés sous `/tmp/tricorder-panel-3-projets-jIIiCK`. PATH fixe du harness, aucune CLI réelle, aucun compte, secret, service distant ou dossier client. Précontrôle dans le **terminal GUI avant le lancement** : les deux chemins pointent vers `/stubs/` et les deux versions contiennent `TRICORDER-PANEL-INERT` (preuve 01). Le fournisseur sort avec son message inerte ; cet arrêt est une **limite du banc**, pas un bug IA.

Aucune fixture ; aucun SQL ou JSON d'état modifié ; aucune simulation. La conservation observée porte sur demandes, projets, dépendances et état d'arrêt. Ni qualité d'IA, parallélisme réel, résultats terminés, validation humaine métier ni déblocage après réussite ne sont qualifiés. Pas de relance complète de l'application : « reprise » ici désigne navigation puis reprise GUI de l'agent de la conversation.

Huit captures, toutes ouvertes et inspectées :

| Capture | Observation |
|---|---|
| [01 — précontrôle](captures/3-projets-01-precontrole.png) | Chemins stubs et versions inertes dans xterm réel. |
| [02 — workflow Azur](captures/3-projets-02-workflow-azur.png) | Destination, titre, compteur et graphe initial. |
| [03 — copie Corail](captures/3-projets-03-reutilisation-corail.png) | Destination différente et confirmation de copie. |
| [04 — portée multi-projet](captures/3-projets-04-portee-multi-projet.png) | Intention saisie, Corail coché avant lancement. |
| [05 — conversation arrêtée](captures/3-projets-05-conversation-arretee.png) | Stub, prompt, arrêt et aucune étape en cours. |
| [06 — prérequis](captures/3-projets-06-dependances.png) | Deux prérequis de projets différents cochés par GUI. |
| [07 — après reprise](captures/3-projets-07-reprise-portee-blocages.png) | Deux invocations, scope shell/Azur versus demande/Corail, trois demandes et dépendances. |
| [08 — activité](captures/3-projets-08-activite-priorites.png) | Liste conservée, blocage, absence de priorité visible. |

Scripts et preuves : [parcours.cjs](parcours.cjs) lance le banc ; [gestes.jsonl](gestes.jsonl) conserve dans l'ordre les commandes Playwright réellement exécutées, y compris deux erreurs de sélecteur et une erreur d'écriture de preuve sans effet produit. [suivi-apres-reprise.txt](suivi-apres-reprise.txt) et [activite-finale.txt](activite-finale.txt) sont les textes visibles exportés. Les manifestes préparation/exécution documentent l'isolation et les empreintes exactes.

**Nettoyage terminé :** `cleanup()` réussi, exécutable/ASAR et backend vérifiés inchangés par le harness ; processus porteurs du `TRICORDER_STATE_DIR` de ce banc : **aucun restant**. Une fenêtre au dernier contrôle, zéro erreur page. [cleanup.json](cleanup.json) conserve la preuve. Xvfb partagé n'a pas été touché ; les données fictives temporaires restent disponibles pour l'audit. Aucun build, installation, commit ou fichier produit modifié.

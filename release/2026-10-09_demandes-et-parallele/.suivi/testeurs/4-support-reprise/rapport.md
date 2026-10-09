# Avis indépendant 4 — Support et reprise

**Avis : reprises utilisables, mais la continuité devient trompeuse sur un détail périmé ou une dépendance annulée.** Deux défauts de suivi à corriger ; aucune modification du produit réalisée.

Responsable support, métier 9/10, technique 2–3/10. Application générique ; scénario d’exports de tickets synthétiques, sans Odoo. Observations propres, sans lecture des rapports des autres testeurs.

## Banc et portée

- Paquet Linux `0.6.0-rc.12`, ASAR SHA256 `10b5f192d643fc9f33cffdf3f238bcd24cbf4f69dc5ba77bab7be92cff253237`, vérifié pendant ce tour.
- Playwright Electron ; entrée normale sans flag de vue ; viewport 1440 × 1000 ; DISPLAY `:184`.
- HOME, XDG, états, runtime, CODEX_HOME et CLAUDE_CONFIG_DIR synthétiques sous `/tmp/tricorder-functional-support-home`. Environnement construit par liste blanche : aucun secret fournisseur hérité. PATH limité au bin synthétique, `/usr/bin`, `/bin`.
- Stubs Codex et Claude créés **avant ouverture**. Terminal utilisateur : `command -v` et `--version` attestent les deux chemins synthétiques et `SUPPORT_STUB_ONLY`, capture 09. Aucun fournisseur commercial appelé.
- Le dossier TRICORDER_HOME manquait au premier démarrage : chargement impossible (capture 01). Dossier créé par préparation du banc, puis entrée normale fonctionnelle (02). **Limite du banc, pas défaut retenu.**
- Les fixtures passent exclusivement par les API validées du moteur **du paquet** (`claim`, `submit`, `ask`, `Conversations.add`), jamais par retouche SQLite/JSON. Elles fabriquent une sortie non conforme, une question, une sortie finale et deux demandes liées. Les actions humaines de reprise, réponse, annulation et navigation sont de vrais clics. **Ces fixtures ne prouvent aucun raisonnement ni dialogue métier d’un fournisseur réel.**
- Aucun projet, compte, service, plugin ou client réel consulté. Aucun rebuild, test partagé, suite globale ni fichier produit changé. Aucun dialogue fichier remplacé.

## Les cinq parcours

### 1. Export qui échoue avant démarrage, puis reprise autorisée — réussi

**Attendu.** Comprendre pourquoi le lancement n’est pas possible, conserver le ticket, puis relancer après résolution.

**Étapes.** Workflows → Choisir un modèle → Support — diagnostic et suite → Utiliser → nom « Support continuité » → Créer et ouvrir. Ouvrir le terminal et vérifier les stubs. Exécuter, saisir le ticket A. Le banc retire temporairement le stub Codex pour simuler l’absence du CLI ; cliquer Vérifier à nouveau. Le banc remet le même exécutable, sans changer le PATH/runtime ; Vérifier à nouveau → Lancer dans le terminal.

**Observé.** « À résoudre avant le lancement / CLI de conversation non installé » ; action compréhensible : choisir un fournisseur installé ou installer son CLI, puis revérifier. Demande conservée. Après résolution, le stub attend dans le terminal et le suivi apparaît à côté, prêt sur « Support critique ? ». Aucune connaissance d’identifiant nécessaire.

**Preuves.** 09, 11 et 12. **Gravité : aucune.** Limite : installation réelle et authentification fournisseur non testées.

### 2. Résultat non conforme, correction explicite et nouvelle tentative — réussi avec réserve de lisibilité

**Attendu.** Ne pas accepter un export vide ; comprendre la cause, donner une correction et conserver l’ancienne tentative.

**Fixture déclarée.** Le moteur reçoit un résultat dont le résumé est « Export annoncé réussi mais vide : résultat non conforme », constat « Aucune ligne exportée », suite « Reprendre avec filtre corrigé », mais une gravité hors des issues permises. Le contrat retourne le résultat.

**Étapes humaines.** Actualiser → détail sélectionné → Entrées, résultat technique et historique → consulter la preuve → Préparer la reprise → saisir « Reprendre avec un filtre incluant les tickets fermés ; classer la gravité parmi les valeurs prévues. » → Relancer cette étape.

**Observé.** Échec et reprise nécessaire visibles ; correction obligatoire et conservée en tête. L’historique affiche Tentative 1, Échec, date, résumé, contrôle non satisfait et motif de la reprise suivante. Bonne séparation entre le résultat passé et l’instruction suivante. Le résultat final est bien à Tentative 2.

**Réserve UX, gravité moyenne.** La cause immédiatement visible est « Support critique ? : choisir une des issues prévues ou demander une précision ». Le résumé métier du résultat refusé n’apparaît pas dans ce premier message. Il faut déplier un détail qualifié de technique, puis lire `finding`, `next_action`, `severity`. Un responsable support peut décider la correction après exploration, mais le message devrait montrer d’abord le résumé et expliquer en français quelle classification a été refusée.

**Preuves.** 14, 15, 18, 19, 24 et 33. **Classe : confusion/lisibilité, pas corruption.** Cause supposée : priorité donnée au message de validation sur le résumé. Test à ajouter : résultat avec résumé métier et sortie invalide → cause métier et correction compréhensibles sans déplier les champs techniques.

### 3. Question imprévue, puis réponse dans le panneau — réussi

**Attendu.** Poser une précision dans une tâche IA, répondre sans chercher un ID, garder la réponse et reprendre la même tentative.

**Fixture déclarée.** Après la reprise du parcours 2, l’agent factice revendique la tâche et appelle `ask` : « Quel périmètre manque dans l’export : toutes les équipes ou seulement Support ? ».

**Étapes humaines.** Actualiser, constater Réponse attendue ; redémarrage dans le parcours 4 ; retrouver le ticket → Répondre à la question → saisir « Seulement Support ; inclure les tickets fermés. » → Répondre.

**Observé.** Question lisible, mention « Répondez dans le terminal ou ici », champ Votre réponse et bouton Répondre. Retour à Prête après réponse. La clarification figure dans le détail puis dans « Décisions et suite » du rapport. Aucun ID demandé. Le détail des entrées montre cependant la clarification sous forme JSON : utile techniquement, peu adapté au métier ; le rapport la reformule en question/réponse lisible.

**Preuves.** 20, 22, 23, 24 et 33. **Gravité : faible pour la présentation technique.** La réponse par le panneau est testée ; l’enregistrement métier d’une réponse donnée à un fournisseur réel dans le terminal n’est pas testé. Le stub ne fait qu’accuser réception du texte.

### 4. Fermeture/redémarrage avec question ouverte, retrouver sans doublon — réussi, entrée confuse

**Attendu.** Retrouver le ticket, sa question et son terminal après relance, sans redémarrer un agent ou créer une deuxième demande.

**Étapes.** Pendant la question, écrire `NOTE-AVANT-REDEMARRAGE : reprise ticket Support A` dans le terminal factice ; fermer l’application ; relancer le même paquet, même environnement/runtime ; Activité → ticket A.

**Observé.** La relance ouvre « Aucun projet / Choisissez le dossier des projets dans Paramètres », alors que le travail est global. Cela suggère à tort une configuration à refaire. En cliquant Activité, la carte du ticket avec Réponse attendue permet de retrouver immédiatement le suivi. Le terminal Codex 2 est restauré avec son contenu et le marqueur avant redémarrage. Le processus factice est toujours en attente. Pas de lancement supplémentaire ni doublon de ticket.

**Vérification read-only.** Une conversation, trois demandes au total après fabrication de B/C ; A conserve une première tentative en historique et une tentative courante 2. Le redémarrage n’a créé aucune demande.

**Preuves.** 21, 22, 23. **Classe : confusion, gravité moyenne.** Cause supposée : accueil cockpit sans projet sélectionné malgré une conversation globale persistante. Proposition : restaurer l’activité ou le dernier suivi, avec indication du travail retrouvé. Test à ajouter : relancer pendant une question de workflow sans projet → accueil pertinent et récupération du même terminal/demande.

### 5. Demande dépendante, annulation amont puis reprise refusée — blocage métier mal expliqué

**Attendu.** Comprendre que C attend B ; si B est annulée, comprendre que C ne pourra pas continuer automatiquement et savoir comment poursuivre.

**Fixture déclarée.** Deux demandes ajoutées à la conversation par le moteur : B « retrouver la définition des colonnes » ; C « exporter après validation des colonnes de B », dépendante de B. L’interface utilisateur de création de ces liens n’est pas qualifiée par cette fixture.

**Étapes humaines.** Vue d’ensemble → Voir les dépendances de C → ouvrir B → Options → Annuler → lire confirmation → Annuler l’exécution → Vue d’ensemble → Voir les dépendances de C → Options → Reprendre.

**Observé.** Avant annulation, titre B et attente sont clairs ; accéder à B fonctionne. Annulation confirmée et résultats/preuves conservés annoncés. Après annulation, B est Annulée dans sa carte, mais le lien « Après : B » sous C reste **À traiter**. Dans le détail de C, B est correctement Annulée. C dit encore « Cette demande commencera après la réussite des demandes suivantes ». Reprendre est proposé ; clic refusé avec « Les tâches précédentes ne sont pas terminées ou ont été refusées ». Aucune explication sur l’annulation constatée, ni action visible pour remplacer cette dépendance ou recréer la demande utile.

**Classe : bug de libellé + manque de conduite de reprise. Gravité haute pour un responsable support.** L’état moteur est protégé (C reste suspendue, aucun lancement indu). L’interface laisse le responsable attendre un événement qui ne peut plus arriver sur B et essayer une action connue comme impossible.

**Cause établie pour le libellé.** Le rendu de la vue d’ensemble choisit seulement « Terminée » si la dépendance est satisfaite, sinon « À traiter », sans tenir compte de l’état annulé ; confirmé dans le JS du paquet. L’absence de réparation guidée est un constat fonctionnel, pas une démonstration que le moteur devrait modifier automatiquement une dépendance figée.

**Proposition.** Afficher « Bloquée : demande préalable annulée », nommer B, désactiver ou expliquer Reprendre. Proposer la création d’une nouvelle demande avec dépendance remplacée après choix explicite, en conservant la précédente.

**Preuves.** 26–32. Test à ajouter : amont annulée/refusée → aval reste protégée, état et prochaine action expliqués ; aucune étiquette À traiter sur l’amont annulée.

## Défaut transversal — détail périmé après la fin

**Gravité haute ; bug de suivi.** En gardant ouvert « Entrées, sorties et preuves » de Support critique ?, le résultat final factice est reçu par le moteur puis Actualiser est cliqué. Le bandeau devient Terminée / 6 sur 6 / Exécution terminée, mais le détail déjà ouvert reste **Prêt**, garde la correction et demande de poursuivre dans le terminal. Capture **25**. Le rapport (33) est exact ; sortir puis revenir au suivi (34) enlève le détail périmé. Le moteur avait bien terminé : aucune corruption d’état.

**Cause fortement étayée.** Dans le JS embarqué, le rafraîchissement du détail n’est effectué que si le nœud a changé et que le focus n’est pas dans l’inspecteur. Le focus sur le détail empêche donc sa mise à jour ; les données courantes sont quand même remplacées, et le changement risque de ne plus être détecté au prochain passage. Le même garde existe dans `src/studio.js` autour de la ligne 1169. Lecture de code faite **après** constat UI.

**Proposition.** Préserver la saisie/position de lecture sans laisser l’état et la prochaine action périmés ; après la sortie du champ, appliquer le rafraîchissement retardé. Test à ajouter : focus sur résumé/champ dans le détail, réception d’un résultat final, Actualiser → aucun ancien statut/action Prêt après Terminée.

## Grandes preuves, historique et résultat final

- Preuve longue consultable en trois pages jusqu’à **FIN DE PREUVE SYNTHÉTIQUE** (16 et 17). Vérification read-only : 67 266 caractères, 2 400 lignes détaillées, marqueur final présent. Pas de troncature silencieuse constatée.
- Historique de tentative (24) utile : résumé court, statut, date et correction. Historique global (35) affiche les trois demandes avec leur titre et leurs états, sans demander d’ID pour Consulter.
- Rapport final (33) lisible pour le responsable : constat, brouillon de réponse, question/réponse, prochaine action « relecture par le responsable support ». Il distingue contrôles techniques et critères métier non attestés. Les champs techniques apparaissent encore comme noms anglais et la clarification JSON ; cela n’empêche pas de comprendre la conclusion en prose.
- La progression 6/6 inclut quatre étapes non applicables ; le rapport les distingue. Faible ambiguïté : le compteur peut suggérer six étapes exécutées alors que seules deux ont produit un résultat.

## Non testé et limites

Raisonnement d’un fournisseur réel, reconnexion/authentification réelle, installation CLI réelle, enregistrement métier d’une réponse terminal réelle, résultat métier des exports, dépendance refusée par une validation humaine (annulation amont testée), réécriture d’une dépendance depuis l’UI, arrêt brutal de l’OS et panne du broker, export du rapport, publication/livraison. Les libellés « Exécution réelle » correspondent ici à des exécutions moteur alimentées par fixtures ; ils ne qualifient aucun fournisseur ni travail réel.

Scripts propres au testeur : `/tmp/tricorder-functional-support-driver.cjs`, `/tmp/tricorder-functional-support-fixture.py`. Stubs et états isolés restent disponibles sous `/tmp/tricorder-functional-support-home` pour reproduction. Les captures numérotées sont dans ce dossier. L’application du testeur a été fermée et le stub arrêté ; X partagé conservé.

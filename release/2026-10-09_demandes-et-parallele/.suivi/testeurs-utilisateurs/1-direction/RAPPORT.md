# Réception utilisateur — 1-direction

Assistante de direction très peu technique. Réunion interne entièrement fictive : comité des locaux, notes de Léa et Hugo. Observation indépendante de la GUI ; aucun code produit ni rapport d’autrui lu. Paquet 0.6.0-rc.12, ASAR `71a054e6137a4fb424320954836109bd67ef2b74cb8f71ad3e49af35bb047dd7`, démarrage normal, display 181, fenêtre 1440 × 1000.

**Avis : parcours compréhensible mais autonomie encore partielle pour ce profil.** Le modèle de réunion se trouve sans Git. La décision humaine et les résultats sont accessibles. Le terminal et plusieurs mots techniques imposent toutefois un effort important. Aucune anomalie bloquante établie dans les gestes reçus ; production réelle d’un compte rendu non recevable sur ce banc inerte.

## Trois parcours

| Intention | Gestes réellement effectués | Attendu / observé | Verdict et conséquence |
|---|---|---|---|
| 1. Retrouver un modèle, comprendre ses livrables, essayer la clôture du 9 octobre | Accueil → Nouvelle demande → sélection « Clôture de meeting », « Sans projet » → Enregistrer et continuer → saisie de notes fictives → Lancer dans le terminal | Le graphique montre vérification, relecture, préparation de l’email. Le fournisseur inerte quitte sans produire de document. À +0,9 s le suivi dit « Conversation ouverte / Prêt pour votre demande » ; plus tard le terminal puis Activité indiquent « Agent arrêté ». | **Partiel.** Choix et lancement reçus. Un compte rendu de ces notes n’a pas été produit : limite voulue du banc, aucune conclusion sur une IA réelle. Captures 01–03. |
| 2. Refuser une proposition qui ne correspond pas aux notes, puis essayer l’approbation | Workflows → Exécuter… → Simuler le parcours → Examiner la décision → commentaire de refus → Refuser la suite. Nouvelle simulation → Examiner la décision → commentaire explicitement limité à l’exemple → Approuver la suite → Voir les résultats | Le refus affiche « Terminée · refusée » ; les résultats du refus contiennent le compte rendu d’exemple, sans brouillon de suivi. L’approbation mène à « Terminée » et affiche un brouillon marqué « Aucun email envoyé ». La bannière Simulation reste visible. | **Réussi pour la décision GUI simulée.** L’utilisatrice contrôle la suite. La seconde approbation accepte uniquement l’exemple, pas les notes de sa réunion. Captures 04–06. |
| 3. Revenir au résultat et préparer la réunion suivante | Fermeture de la fenêtre de résultats → Activité → ouverture de la simulation terminée → Voir les résultats → retour Activité → Nouvelle demande → Continuer avec le workflow sauvegardé → saisie de la réunion fictive du 12 octobre → Lancer dans le terminal → Activité et trois Actualiser espacés | Le brouillon d’exemple est retrouvé. Nouvelle demande explique que le workflow est réutilisé et que les résultats restent propres à chaque exécution. Une deuxième demande distincte utilise toujours Rév. 1. Après stabilisation, les deux lancements inertes indiquent « Agent arrêté / Reprendre l’agent… » ; les deux simulations restent séparées. | **Réussi pour retrouver l’exemple et préparer/lancer une autre réunion ; partiel pour les livrables réels.** Retour testé par navigation dans la même session, pas après redémarrage. Captures 07–08 ; textes resultat-retrouve.txt et activite-stabilisee.txt. |

## Constats priorisés

1. **P1 — Friction : lancement présenté dans un terminal très technique.** Après le clic métier, l’écran expose une commande Python, un chemin backend et un fichier `.launch.json`, puis un shell. Le suivi demande encore de décrire le travail alors que les notes ont déjà été saisies. Pour une assistante, cela crée un doute : faut-il recommencer, écrire une commande, attendre ? Le statut arrêté finit bien par apparaître : l’état initial n’est donc **pas classé bug persistant**. Preuve : capture 03, precontrole-terminal.txt, activite-stabilisee.txt. Amélioration : accusé de réception des notes et explication simple du prochain geste, tout en conservant le terminal principal.

2. **P2 — Friction : vocabulaire métier mêlé aux notions du moteur.** « Meeting », « transcript », « Minutes », « 0 entrée → 2 sorties », « Révision », « tentative », « sources : actions ← review » et `.tricorder/workflows/` apparaissent dans le parcours. Aucune modification JSON ni connaissance Git n’a été nécessaire ; ces termes donnent néanmoins l’impression d’un outil destiné aux développeurs. Preuves : captures 02–04 et 06. Amélioration : « réunion », « notes / transcription », « compte rendu », et détails du stockage dans une aide secondaire.

3. **P2 — Friction : la décision est bien signalée mais ses boutons sont sous la hauteur visible.** Avec le terminal ouvert sur la gauche, « Examiner la décision » mène à une vue dont les entrées et le commentaire occupent l’écran ; Approuver/Refuser demandent du défilement. Playwright a réellement amené les boutons à l’écran pour cliquer ; le clic n’a pas contourné le contrôle. Preuves : captures 04–05. Conséquence : une personne peu technique peut lire et attendre sans voir comment répondre. Amélioration : actions de décision visibles dans un pied de panneau.

4. **P3 — Friction : les deux essais simulés portent le même nom générique.** Dans Activité, les cartes s’appellent toutes deux « Clôture de meeting » ; seul le statut distingue l’exemple approuvé du refusé. La demande réelle garde, elle, tout le texte des notes comme titre. Preuve : capture 07. Conséquence : repérer une réunion parmi plusieurs demandes demande davantage de lecture. Amélioration : titre bref ou nom de réunion, date et statut, tout en gardant la mention Simulation.

## Points réussis

- L’accueil explique le travail en cours, propose une Nouvelle demande et identifie explicitement l’exemple simulé.
- Le modèle de réunion est trouvable dans la liste, sans création de dépôt ni projet préalable.
- Les trois étapes exposent une relecture humaine avant le suivi ; le refus est enregistré et empêche la création du brouillon dans cet essai.
- Les résultats simulés et les états de décision sont lisibles ; les avertissements « Simulation » et « Aucun email envoyé » empêchent d’y voir un travail réel.
- Activité retrouve les résultats, les arrêts et la prochaine action. Le workflow sauvegardé se réutilise en Rév. 1 avec des demandes distinctes.

## Limites et preuves du banc

HOME, XDG, état, runtime et configurations fournisseurs isolés par harness.cjs. Précontrôle exécuté dans le vrai terminal GUI **avant** tout lancement : chemins `/tmp/tricorder-panel-direction-IU8GaM/stubs/{codex,claude}`, versions contenant toutes deux TRICORDER-PANEL-INERT. Aucun PATH étendu, CLI réelle, client, compte, clé, réseau, envoi ou service externe utilisé. Aucun workflow ni état moteur injecté : toutes les créations et progressions reçues proviennent des contrôles GUI, dont le bouton de simulation. Aucune qualité IA, intégration de transcription ou production de fichier exporté n’est qualifiée.

Les huit captures PNG ont toutes été ouvertes et inspectées. Aucune erreur renderer collectée ; une seule fenêtre constatée après les lancements. Les erreurs de sélecteur dans gestes.jslog concernent l’automatisation d’un bouton masqué ou renommé et ne sont pas des bugs du produit. Le premier lancement du script a fermé son stdin immédiatement et exécuté cleanup avant de démarrer un nouveau banc interactif ; aucun parcours métier n’en est revendiqué.

Livrables : parcours.cjs, gestes.jslog (gestes exacts), captures/, précontrôle et textes de retour, direction-preparation.json, direction-execution.json, cleanup.json, verification-finale.json. Le script emploie uniquement le harness commun et Playwright Electron fourni ; aucun build ni installation.

**Nettoyage vérifié :** cleanup() terminé, aucun processus des deux HOME/états isolés restant ; empreintes exécutable et ASAR conformes au paquet figé ; backend vérifié par le harness. Les temporaires fictifs sont conservés comme preuve et leurs chemins consignés. Aucun fichier produit ou partagé modifié, aucun processus d’autrui arrêté.

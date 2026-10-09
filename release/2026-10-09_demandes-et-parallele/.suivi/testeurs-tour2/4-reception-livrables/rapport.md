# Réception et transmission des livrables — avis indépendant, tour 2

**Réception GUI partiellement réussie. Passation par rapport/export non reçue pour l’objectif « compréhensible sans JSON ».** Cinq parcours exécutés sur le paquet corrigé figé ; cinq demandes fictives terminées, une demande technique volontairement en échec reste à reprendre. Aucun fournisseur IA ou service externe qualifié.

Testeur : responsable recette métier 9/10, technique 2/10. Aucun autre rapport de testeur consulté avant ces constats. L’interface a été observée avant la lecture technique nécessaire aux fixtures. Aucun code produit, build, suite globale ou commit réalisé.

## Paquet et banc

- Entrée normale, sans `--workflow-studio`, sur `build-artifacts/linux-unpacked/odoo-tricorder`.
- SHA256 exécutable : `9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3`.
- SHA256 ASAR : `74bfb78a5261899b11de76f1f25e59a31753d086de0992f229e52141885cc058`.
- DISPLAY `:184`, XAUTHORITY du banc ; aucun accès à DISPLAY `:1`.
- Répertoires personnels, XDG, Codex, Claude, état et runtime neufs sous `/tmp/tricorder-t2-reception-jj7xtx`. Moteur générique sous `state/workflows`.
- Stubs codex **et** claude présents avant GUI et premier broker. PATH fixe `stubdir:/usr/bin:/bin`, environnement construit par liste blanche. Vérification dans le terminal par `command -v` et `--version`, marqueur `TRICORDER-T2-RECEPTION-STUB` : [capture 02](captures/02-terminal-stubs.png).
- Fixtures métier explicites soumises par l’API Engine du **backend contenu dans le paquet**. Aucune modification SQL/JSON pour forcer un état. Les réponses humaines, critères, réception, reprise et exports ont été réalisés dans l’interface.

## Résultat des cinq parcours

| Parcours | Attendu et gestes observés | Réception | Preuves |
| --- | --- | --- | --- |
| P1 — Réunion Atlas | Ouvrir résultat, source, plan et livrable ; examiner les deux critères et commenter la réception. L’action, Alice Durand et le 16 octobre apparaissent dans un tableau. Les trois pièces sont nommées « Source / Plan / Livrable ». La réception et son commentaire restent visibles, avec l’avertissement de simulation. | Reçu pour l’affichage, consultation et réception de la fixture. | [Résultat](captures/05-p1-resultat-criteres-preuves.png), [source](captures/06-p1-source-consultee.png), [réception](captures/07-p1-reception-enregistree.png). |
| P2 — Contrat défavorable / incident distinct | Lire source fictive : 650 € contre 500 €, soit 150 € de dépassement. Le verdict « Non conforme » reste un résultat à valider ; son avis défavorable est reçu sans être traité comme panne. La demande technique distincte affiche « Cette étape a échoué », absence de livrable et « Préparer la reprise ». | Reçu pour la distinction résultat métier négatif / incident technique. Aucune reprise de l’incident prétendue. | [Avis métier](captures/08-p2-negatif-metier.png), [incident](captures/09-p2-incident-technique.png), [vue d’ensemble](captures/04-vue-ensemble-six-demandes.png). |
| P3 — Client fictif Boréal | Répondre au lieu manquant depuis le formulaire. La question et « Salle des Érables, 12 rue imaginaire » figurent en français dans les entrées reçues ; ce lieu figure dans le brouillon. La suite indique « aucun envoi effectué ». Brouillon reçu avec commentaire. | Reçu pour la clarification et l’examen du brouillon fictif. | [Question, réponse et résultat](captures/10-p3-question-reponse-resultat.png), source `sources/demande-boreal.md`. |
| P4 — Reprise motivée | Demander reprise du résultat sans date. Le formulaire refuse le motif vide. Saisir « Ajouter l’échéance au 16 octobre 2026 et conserver la décision de report. Première tentative incomplète. ». Le résultat corrigé a la date ; la première tentative et ce motif restent consultables. La seconde tentative est reçue. | Reprise et conservation reçues. Comparaison partiellement reçue : présentation de l’ancienne tentative dégradée (F3). Export de l’historique non reçu (F2). | [Motif](captures/11-p4-reprise-motivee.png), [comparaison](captures/12-p4-comparaison-tentatives.png), [ancienne tentative](captures/13-p4-historique-lisible-partiel.png). |
| P5 — Bilan et passation | Consulter puis recevoir le bilan fictif couvrant les demandes précédentes. L’inspecteur traduit correctement Demande, Résultat, État, Suite proposée. Ouvrir Options → Rapport, puis exporter vers le projet. L’export crée réellement un dossier et un README, mais le rapport humain revient au JSON et aux preuves anonymes. | Bilan affiché/reçu et écriture de l’export réussis. **Passation sans JSON non reçue** (F1/F2). | [Bilan](captures/14-p5-bilan-plusieurs-demandes.png), [rapport](captures/15-p5-rapport-exportable.png), [README exporté P5](exports/passation-fictive-p5/README.md). |

## Écarts à corriger

### F1 — Rapport/export en JSON, pièces sans nom — UX/manque, majeur

**Reproduction :** après réception de P5, ouvrir Options → Rapport ; exporter via « Exporter le rapport dans le projet », nom `passation-fictive-p5`.

**Observé :** `report` introduit un bloc JSON contenant `findings`, `request`, `result`, `status`, `next_action`, `notes`, `summary`. `verdict` reste `pass`. Deux pièces affichent toutes deux « Consulter la preuve ». Le README exporté reproduit cette présentation, alors que l’inspecteur propose une lecture en français et des noms de pièces.

**Impact :** le collègue doit comprendre une structure technique et ouvrir des liens anonymes. L’objectif de transmission sans JSON n’est pas atteint. L’export fonctionne techniquement : aucun échec de création du dossier constaté.

**Action suivante :** reprendre la lecture métier du résultat dans le rapport exporté, traduire le verdict et nommer les liens par rôle et fichier. Vérifier le README avec un destinataire qui n’utilise pas Tricorder. Preuves : [capture 15](captures/15-p5-rapport-exportable.png), [export conservé](exports/passation-fictive-p5/README.md).

### F2 — Historique de reprise absent du document humain — manque de projection, majeur

**Reproduction :** P4 → reprise motivée → second résultat reçu → Options → Rapport → export `reprise-fictive-p4`.

**Observé :** le rapport dit « Tentative 2 » et affiche seulement le résultat courant. Le premier résultat et le motif exact ne sont pas repris. Ni `compte-rendu-atlas-tentative1.md` ni `compte-rendu-atlas.md` n’apparaissent dans le README ; les liens restent anonymes. Les fichiers de preuve des anciennes tentatives sont néanmoins copiés sous `.suivi/preuves/`. L’interface conserve bien l’ancienne tentative : aucune perte d’état du moteur affirmée.

**Impact :** un collègue ne peut expliquer ce qui a été repris et pourquoi à partir du document humain exporté. Le commentaire de réception rédigé par le testeur ne remplace pas l’historique.

**Action suivante :** inclure un historique lisible par tentative, le motif de la suivante et un inventaire des pièces nommées, sans lecture obligatoire d’`execution.json`. Preuves : [capture 16](captures/16-p4-rapport-sans-historique.png), [README exporté P4](exports/reprise-fictive-p4/README.md).

### F3 — Ancienne tentative moins lisible que la courante — UX, modéré

**Reproduction :** P4 après reprise → Détail → « Tentatives précédentes » → « Résultats et preuves ».

**Observé :** la tentative courante présente « Action / Responsable / Échéance » ; l’ancienne expose `report / actions / action / owner / decision / notes`, le verdict `pass` et « Consulter la preuve 1 / 2 / 3 ». Résultat, motif et preuves sont présents et consultables.

**Impact :** comparaison possible, avec effort et risque de confusion entre les pièces. **Action suivante :** appliquer à l’historique les mêmes traductions, tableau et libellés de pièces que dans le résultat courant. Preuve : [capture 13](captures/13-p4-historique-lisible-partiel.png).

## Limites et clôture du banc

Le bilan, les analyses, brouillons et incidents ont été rédigés par le banc. La campagne vérifie leur lecture, la réception humaine, la clarification, la reprise et l’export ; elle ne prouve ni génération IA, ni qualité commerciale d’un modèle, ni service externe. Les exécutions de conversation empruntent le parcours normal ; les résultats sont marqués `simulated` et portent explicitement FICTION/FIXTURE. L’inspecteur montre un avertissement de preuve simulée. Le rapport utilise l’en-tête générique « Exécution locale » ; la nature fictive reste explicitée par les textes et commentaires du banc.

Le sélecteur natif de dépôt a été remplacé en mémoire par un retour de chemin synthétique vers le dépôt temporaire autorisé. Son ergonomie native n’est pas qualifiée. Un premier appel de fixture après réponse a été refusé par Engine car la réponse GUI n’était pas encore enregistrée ; réessayé une fois après observation « Prêt », sans retouche d’état. Ce délai du banc n’est pas un défaut produit retenu.

16 captures conservées. Aucune erreur JavaScript de page enregistrée. Application et broker propres fermés ; aucun processus restant ne référence le répertoire temporaire. Serveur X et applications de l’utilisateur préservés : [manifest de nettoyage](cleanup-manifest.json). Les exports originaux sont conservés dans `exports/`, sans correction qui masquerait les écarts. Aucun autre parcours ajouté après les cinq parcours autorisés.

# Journal

## 2026-09-11 — Publication demandée de la 0.2.7

- Demande explicite : pousser Crew et Tricorder, publier les versions sur GitHub.
- README et notes alignés sur le téléchargement Ubuntu 0.2.7.
- CI liée au commit Crew livré avec les nouveaux lecteurs ; paquet local déjà vérifié.
- Sources publiées séparément du Debian et de son SHA-256 ; aucune donnée client embarquée.
- CI Ubuntu : bouton de contexte masqué par la ligne non sécable sur fenêtre étroite ; retour à la ligne corrigé et parcours vérifiés à 1000 × 700.
- Releases publiques : Crew v2026.09.11 et Tricorder v0.2.7 ; contrôles GitHub verts sur les commits tagués.
- Installation locale autorisée via dialogue système : 0.2.4 → 0.2.7, binaire vérifié et deux parcours de lancement verts.
- Terminal existant conservé (même session et PID) ; fenêtre utilisateur non fermée automatiquement.

## 2026-09-11 — Veille et jetons 0.2.7

- Demande : implémenter l’exclusion des suspensions et améliorer les compteurs Claude/Codex.
- Crew : bornes Linux monotone/boottime, durée hors veille, aperçu vivant sans écriture, reboot inconnu.
- Compteurs conservés séparément ; cache absent n’efface plus les sorties connues, coûts prudents.
- JSONL en cours : préfixe complet conservé, corruption interne refusée.
- Cockpit : tableau entrées/sorties/cache par tâche, indication de veille exclue, aucun doublon natif/import.
- Anciennes mesures et bilans conservés ; compatibilité de vérification historique testée.
- Tests synthétiques puis dix parcours Electron, dont NECA en lecture seule ; détails dans QA.md.
- Odoo Improve a imposé reproduction rouge, contre-épreuve et adoption outillée ; aucune veille physique ni réduction de facture revendiquée.
- Final : 271 tests Crew, 82 tests Tricorder, dix parcours sources puis dix empaquetés verts ; Debian vérifié, non installé/non publié.

## 2026-09-11 — Contexte de release et lecture Markdown 0.2.6

- Demande : travailler sans release, réutiliser le même terminal à sa création, lire des Markdown mis en forme.
- Cause : valeur vide convertie en release par défaut, métadonnées du terminal figées au lancement.
- Choix vide explicite mémorisé ; nouvelle release ouverte repérée et attribution de terminal seulement non ambiguë.
- Repère de session privé et persistant, sans redémarrage du broker ni modification du shell/agent.
- Bouton pour appliquer la release/tâche consultée au terminal existant ; Express reste indépendant.
- Markdown via Marked et DOMPurify, rendu limité aux éléments passifs ; source disponible et aucune requête distante.
- Erreur signalée : état de lecture non effacé et enrichissement d’un écran incomplet ; récupération corrigée et testée.
- Tests de contexte/concurrence, processus conservé après réouverture, aperçu sûr et parcours NECA en lecture seule.
- Retours d’usage : matrice de transitions ; terminal créé en retard sans voler la navigation, observation native respectant le choix hors release.
- Temps : détail par rôle conservé à l’actualisation ; revue séparée temps/jetons Claude et Codex, sans modification du registre ni activation de collecte.
- Veille/reprise ajoutée à la revue : nuit entre tours exclue, interruption dans un tour non déductible sans trace système ; limites prouvées sur fixtures.
- Pourcentages tâches/agents sur temps connu, actualisation avant clôture et motifs des relevés incomplets ; diagnostic NECA sans reprise de ses données.
- Résultats détaillés dans QA.md ; pas d’installation de l’app ni de publication GitHub.

## 2026-09-11 — Retrait de l’email 0.2.5

- Demande explicite : supprimer la fonctionnalité d’envoi d’email.
- Retirés : section de clôture, éditeur, paramètres destinataires, connexion SMTP/OAuth et API associées.
- Crew : transports retirés et ancien CLI neutralisé, consignes de clôture sans email automatique.
- Incident transitoire signalé sur la 0.2.4 : config_for absent empêchait le chargement projet.
- Corrigé par deux lectures inertes de compatibilité ; ancien lecteur installé revérifié sur NECA.
- Paramètres, brouillons, secrets et documents clients conservés ; aucune révocation Google implicite.
- Régressions : API absentes, stockage intact, import EML conservé et navigation opérationnelle.
- Tests et paquet dans QA.md ; aucune installation ou publication GitHub effectuée.

## 2026-09-11 — Gmail SMTP et email modifiable 0.2.4

- Demande : mot de passe d’application Google, relecture et correction avant accord terminal.
- Projet → Communication : choix SMTP/OAuth, connexion par helper de bureau, aucun secret dans Electron.
- Éditeur : objet, message, À/Cc/Cci spécifiques à l’email, ajout/retrait des PDF/DOCX de la release.
- Version attendue à l’enregistrement ; préparation automatique ne remplace pas les corrections humaines.
- Accord lié au contenu exact ; refus SMTP avant contenu si un destinataire est rejeté, Cci masqués.
- Succès SMTP = prise en charge serveur, pas preuve de réception ; incertitude interdit la relance automatique.
- Tests et réserves dans QA.md ; aucune connexion Gmail réelle, aucun envoi ni publication GitHub.

## 2026-09-11 — Temps partiels 0.2.3

- Cause reproduite : un rôle absent masquait toutes les durées connues de la tâche.
- Sous-totaux partiels conservés par tâche et release ; absence distincte du zéro mesuré.
- Aucun cumul enregistré/natif et aucun écart présenté comme une économie sur un suivi partiel.
- Tableau en heures/minutes, rôles manquants et périodes ouvertes visibles.
- Tests synthétiques de calcul et parcours Electron ; deux releases NECA lues sans modification.
- Crew : nouveaux sceaux sans chronomètre actif, interruption explicite sans durée reconstituée.
- Versions, résultats et réserves consignés dans QA.md ; aucun email ni publication pendant ce correctif.

## 2026-09-11 — Communication de clôture 0.2.2

- Projet → Communication : expéditeur et À/Cc/Cci, séparés par projet, hors Git.
- Préparation et envoi par Odoo Crew ; le cockpit affiche l'aperçu/statut, sans token ni API d'envoi.
- Connexion Google initiale guidée ; accord du message exact dans le terminal avant chaque envoi.
- PJ client facultatives ; changement de destinataires/texte/PJ invalide l'accord.
- Saisie préservée à l'actualisation ; aide de connexion sans secret dans la conversation.
- Tests synthétiques de bout en bout de l'écran et suite Gmail isolée ; recette et empreinte dans QA.md.
- Aucun email réel, aucune connexion Google, aucune installation de l'app ni publication GitHub pendant cette intervention.

## 2026-09-11 — Fiabilisation du cockpit 0.2.1

- Usage confirmé : un terminal durable par projet, plusieurs tâches/releases ; consultation distincte du contexte d’ouverture.
- Statuts clos alignés sur Odoo Crew ; points README repris, réception/validation/activité séparées.
- Liens des workflows explicites et provenance worktree affichés sans contourner les preuves.
- Sélection de tâche mémorisée, file d’attention multi-release, réponse de navigation périmée ignorée.
- En-tête compact et environnement distinct ; critères prioritaires, preuves détaillées repliables.
- Graphe visuel et fiche de reprise retirés de l’interface à la demande de Benoît.
- Liste de projets sans ajout/recherche ni « À mon attention » ; alertes conservées, détails techniques repliés.
- Ressources sous Projet ; Express hors release avec contrôles ciblés ; mentions décoratives « Mission Control » et « Poste local » retirées.
- Mesures natives facultatives ; indicateurs en heures/minutes et écarts non comparables masqués.
- QA : 52 tests Python, 6 JavaScript ; parcours synthétiques et NECA opt-in détaillés dans QA.md.
- NECA en lecture seule : aucune modification par Tricorder, aucun shell/agent lancé ; fichiers suivis de la release inchangés.
- Paquet local 0.2.1 construit et 4 parcours rejoués verts sur l’exécutable empaqueté ; empreinte dans QA.md. Aucune publication ni installation.

## 2026-09-11 — Diagnostic des statuts inconnus

- Signalement utilisateur : états des releases/tâches peu fiables et trop d’inconnus.
- Lecture seule : 24 releases du catalogue local renvoyées inconnues ; le lecteur exige un commentaire HTML absent, même avec une clôture explicitement écrite dans le README.
- Contrat confirmé dans odoo-release.sh : close retire le marqueur ; list affiche clos quand le README existe sans marqueur ouvert (release ou ancien lot).
- Le seul plan découvert expose cinq tâches à revalider : preuves rattachées à un autre chemin de projet et références de flows locaux absentes.
- Le cockpit mélange visuellement état historique, validité actuelle des preuves et activité native non observée.
- Navigation : chaque changement de release efface selectedTask ; le terminal visible reste sélectionné au niveau projet, indépendamment de la release consultée.
- Couverture : seules les tâches plan.json sont lues, pas les points README pris en charge par odoo-release.sh ; les liens de mission exigent le même chemin de flow que la dernière tentative.
- Diagnostic seulement : aucun correctif applicatif, aucune modification de données client ni publication.
- Suite proposée : alignement sur le cycle de vie Odoo Crew, séparation avancement/validation/activité, prise en compte explicite des worktrees sans neutraliser les contrôles de preuves.

## 2026-09-11 — Livraison GitHub 0.2.0

- Publication demandée par Benoît ; installation locale laissée à sa main via apt.
- Livraison : sources, notes de version, paquet Debian amd64 et SHA256SUMS.
- Empreinte du paquet vérifiée ; 39 tests Python et 2 parcours Electron rejoués sur sources et paquet.
- Publication publique conditionnée au succès de la CI sur le commit livré.
- Mise à jour : les sessions PTY existantes sont préservées ; actualisation du service ancien uniquement à vide.

## 2026-09-11 — Roadmap et ergonomie 0.2.0

- Implémentation de la roadmap : observation native, mesures, reprise, sources, stack, graphe et préférences.
- Portée projet/release/tâche explicite ; critères visibles ; missions associées aux sessions/rôles/workflows.
- Pictogrammes Claude/Codex, attente humaine rouge avec « ! », notification sur événement explicite.
- Explorateur en lecture seule avec inbox ; recherche transversale et volume des preuves JUnit.
- Emplacements configurables : racine projets, dossier de travail, stack, sources Community/Enterprise/OCA.
- Aucune modification des projets clients, d’Odoo Crew, des credentials ou des configurations globales des agents.
- QA source : 39 tests Python et 2 parcours Electron verts ; détails et validation du paquet dans QA.md.
- Reprises : concurrence navigation, dialogue de profil, identité des sous-agents, attentes/outils parallèles.
- Livraison locale : version 0.2.0, README/roadmap/contrats documentés ; publication GitHub distincte.

## 2026-09-11 — Première version du cockpit

- Demande : terminal Ubuntu centré sur les projets, environnements, releases et agents Odoo.
- Réalisation : Electron/xterm.js, lecteur Python et service PTY privé persistant.
- Plans : règles de validation réutilisées depuis odoo-crew, sans mutation des données client.
- Sources : bibliothèque commune, série exacte, distinction module/Studio/Online.
- Interface : inspiration LCARS discrète, bannière fournie et liens vers les deux dépôts.
- QA : 14 tests unitaires/PTY, scénario de bureau sur données fictives, concordance des états NECA.
- Reprises : conflit de collage natif supprimé, tests isolés du home/presse-papiers, publication CI explicite.
- Limites : observation native des sous-agents et import automatique du temps reportés à la suite.
- Livraison : paquet Debian amd64 et notes de version 0.1.0.

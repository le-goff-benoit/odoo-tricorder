# QA — Odoo Tricorder

## Ergonomie et agents — 0.2.9

- 63 tests Python + 37 tests JavaScript : 100 verts ; `git diff --check` vert.
- 15 parcours Electron locaux verts, dont NECA en lecture seule (empreintes conservées).
- Paquet final : 15 parcours verts en 48,3 s ; JS/CSS empaquetés identiques au build.
- Navigation adaptée : pas de filtre global de tâche ; Kanban, plan, agents et
  mesures indépendants du contexte du terminal. Fiche modale, Échap, focus, scroll,
  changement de release, actualisation et tâches homonymes contrôlés.
- Préférences : structure, saisies invalides, enregistrement et annulation testés.
- Claude/Codex : faux exécutables de shell uniquement ; bon dossier, un terminal
  par lancement, double clic protégé, aucun appel fournisseur ni consommation réelle.
- Agents : noms canoniques et responsables explicites, interventions sans chrono
  visibles sans durée fabriquée ; aucune estimation rétroactive ni fausse économie.
- Captures inspectées : Kanban compact, fiche, préférences, plan desktop/compact.
  Huit vues vérifiées à 1440/1000 px, sans débordement du document.
- Aucun changement des fichiers clients, de Crew ou de l’application installée.
- Debian amd64 : `64faaf7fdb53af6f0699f37d4ff800fd30d45cbcfca3c4fbcacf53d842faa27f`.

## Livraison 0.2.8

- Crew publié : `72702f4a18185adb1fddbb505ed71a99d039a3a4`, profils actifs conformes.
- 98 tests Tricorder rejoués avec ce Crew : verts. Changements de publication
  limités à README, documentation et révision CI ; code empaqueté inchangé.
- Le paquet conserve le SHA-256 `36a6265e123a03b43381c8d25364f97d676688b0af1ffe6efd6689e7ab8803d8`.
- Consignes de suivi désormais livrées côté Crew ; aucun superviseur dans l'interface.

## Kanban de release et design commun — révision locale 0.2.8

- Base : `290d93e` ; Crew lu à `dd530627e70524257661a69e1ef0179f303ece0d`, sans modification.
- 63 tests Python + 35 tests JavaScript verts (98), dont six nouveaux contrats.
- Kanban : réception avec preuves périmées, étape bloquée, historique ambigu,
  observations natives ciblées/périmées, mesures sans double compte, filtres.
- Parcours : critères, répartition, JUnit, attente humaine native, absence de fuite
  des arguments privés, rafraîchissement, même terminal/PID, changement de release.
- Design : huit vues à 1440 et 1000 px, styles calculés des gouttières/cartes/boutons,
  dialogues, absence de double marge des grilles et espacement des sections.
- Source : 14 parcours verts, dont NECA en lecture seule et empreintes conservées ;
  retouches finales du design et filtre d'attente rejoués avec succès séparément.
- Le bureau peut ignorer le redimensionnement natif : le test fixe et vérifie
  explicitement le viewport CSS. Le premier échec de largeur n'était pas une preuve responsive.
- Captures inspectées : Plan, Kanban, Agents, Temps, Sources et Environnements,
  dont les versions compactes ; pas de comparaison pixel à pixel exhaustive.
- Profils agents, session réelle, statuts clients et application installée inchangés.
- Les propositions de supervision dans `docs/AGENT_PROGRESS.md` ne sont pas implémentées.
- Paquet final : 14 parcours Electron verts (55,7 s), y compris NECA en lecture
  seule ; Debian construit, non publié et non installé. SHA-256 courant :
  `36a6265e123a03b43381c8d25364f97d676688b0af1ffe6efd6689e7ab8803d8`.

## Retrait du bouton du bandeau — révision locale 0.2.8

- Bouton retiré du DOM et références de rendu supprimées, sans changement du service terminal.
- Régressions : absence du bouton, création par « + » et Ctrl Shift T,
  contexte de tâche/environnement conservé, Express hors release et création différée.
- 63 tests Python et 29 tests JavaScript verts. Le test de création différée
  attend le chargement du projet avant le raccourci (le garde-fou `busy` reste actif).
- Suite du paquet : 11 parcours Electron verts (35,2 s), parcours NECA optionnel
  non rejoué sur cette retouche ; uniquement des projets synthétiques.
- Paquet Debian reconstruit, non publié et non installé. SHA-256 courant :
  `11863d83c1cf860a3028b3bfee4b9e82b5aa1c7cf070adf9f021eb3a9e01602e`.
- Le Kanban par release reste une proposition, distincte du Kanban global déjà disponible.

## Version locale 0.2.8 — cadrage, contexte et Kanban

- Crew de référence : `dd530627e70524257661a69e1ef0179f303ece0d` (commit local,
  à publier **avant** Tricorder : la CI est épinglée sur cette révision).
- Crew : 283 tests verts, dont 12 nouveaux cas avant plan ; génération isolée
  puis active conforme (30 profils/commandes + 2 blocs), skills plan/estimation valides.
- Tricorder : 63 tests Python et 29 tests JavaScript verts.
- Douze parcours Electron verts depuis les sources, dont NECA en lecture seule.
  Aucune écriture dans les releases clientes ; vérification des empreintes.
- Les douze parcours passent aussi sur l'exécutable empaqueté final (39,2 s).
  Paquet Debian 0.2.8 construit ; SHA-256 :
  `021a6fbac94858ec1906a2a9a2e508c0ff94996d57a1df4f80a7b74978563c8a`.
- Ajouts : préparation projet → release → retour hors release ; temps et jetons
  par rôle sans double comptage ; Kanban multi-projets et accès à la tâche exacte.
- Reprises : assertions adaptées au statut de release déplacé dans son badge ;
  clic Kanban précoce protégé contre la sélection automatique du bootstrap,
  avec trois répétitions vertes. Le défilement horizontal du Kanban est conservé.
- Bandeau : libellé Environnement, distinction consultation/activité/attribution,
  aucune activité déduite d'un simple processus vivant ; alerte de divergence et
  de production conservées, ligne récapitulative terminal retirée.
- Limites : métriques nouvelles à partir d'un skill à jour et d'une trace
  identifiable ; les valeurs passées ne sont pas reconstruites. Le Kanban porte
  les tâches déclarées, pas les conversations libres ni un état supposé du modèle.
- Publication/installation : distinctes de cette validation locale ; la version
  installée et publiée précédente reste la 0.2.7.

## Veille et jetons 0.2.7 — 11 septembre 2026

Publication finale : [CI Tricorder verte](https://github.com/le-goff-benoit/odoo-tricorder/actions/runs/34635199296)
sur le tag v0.2.7 ; [CI Crew verte](https://github.com/le-goff-benoit/odoo-crew/actions/runs/34634619505)
sur v2026.09.11. Les deux releases sont publiques. Paquet corrigé installé
localement (0.2.4 → 0.2.7) avec autorisation système, archive installée identique
au paquet testé ; deux parcours sur l’exécutable installé passent en 10,9 s.
La session utilisateur et son PID restent actifs, aucune fermeture forcée.

- Publication : première CI rouge sur deux clics de contexte à résolution réduite
  (run 34634642848). Cause : texte et bouton dans une ligne non sécable, bouton
  hors de la zone visible. Retour à la ligne corrigé ; les deux parcours passent
  à 1000 × 700, sans clic forcé ni suppression d’assertion. Paquet reconstruit.
- Deuxième CI : parcours de contexte verts ; capture interrompue par le
  rafraîchissement du DOM. La capture attend désormais la fin du rafraîchissement
  et fait son défilement dans une seule opération synchrone ; assertions inchangées.
- SHA-256 du paquet corrigé destiné à la publication :
  `d7e46f98711132f7456221f60b16269f51165e41ef7e707357d1f4ea309b9b11`.

- Odoo Crew : 271 tests verts, dont reproduction rouge puis correction des
  chronomètres et compteurs. Horloges simulées : veille, reprise, reboot,
  plusieurs suspensions, horloge civile indépendante, ancien timer sans borne.
- Bilan historique vérifié sans réécriture ; aperçu vivant sans mutation du registre.
- Cache inconnu : entrées/sorties connues conservées, aucun coût extrapolé.
- Dernière ligne JSONL en cours tolérée ; corruption interne et régressions refusées.
- Tricorder : 60 tests Python et 22 tests JavaScript verts ; dix parcours Electron
  sources, avec NECA en lecture seule, sans modification de ses données.
- Les dix mêmes parcours passent sur le paquet final (40,4 s), dont NECA.
- Premier Debian 0.2.7 avant correction des fenêtres étroites : version, sources
  et catalogue vérifiés. SHA-256 antérieur : `ee2009873650c0bc82e954f818add0f084ec15c907fbe3a3b52db162c5ee752f`.
- À la validation initiale, le paquet était local seulement ; publication et
  installation finales consignées ci-dessus.
- L’écran vérifie cache inconnu, sous-total partiel et « Veille exclue : 8 h ».
- Génération Crew isolée puis active conforme : 30 profils et deux blocs.
- Avertissement transitoire Codex pendant le build : le générateur écrit encore
  directement les profils ; Analyst complet et conforme après génération.
- Limite : tests de veille simulés, aucune mise en veille physique du poste ;
  durées natives sans trace système inchangées, pas de collecte de sous-agents ajoutée.

## Hors release, terminal durable et Markdown 0.2.6 — 11 septembre 2026

- 60 tests Python + 21 JavaScript verts ; dix parcours Electron verts sur sources (40,4 s) puis sur l’exécutable empaqueté (39,3 s), dont NECA en lecture seule.
- Absence explicite de release sans fallback, sélection persistante, ajout d’une nouvelle release et même PID de terminal après réouverture.
- Contre-épreuves : première découverte, réouverture d’une ancienne release, ajout clos, plusieurs nouveautés, plusieurs terminaux, Express et autre projet.
- API de contexte : terminal actif du bon projet requis, release/tâche validées, ancienne sélection refusée avant attribution.
- Métadonnées conservées côté cockpit, compatibles avec un broker déjà actif ; aucun processus, environnement shell ou historique de mesure modifié.
- Markdown testé depuis le plan et l’explorateur : titres, emphases, table, cases désactivées, code, volet source exact.
- Scripts, images, liens actifs et attributs d’action supprimés ; zéro requête HTTP dans le parcours hostile synthétique.
- Erreur de lecture injectée via le handler du test : pas de panneau qualité parasite, actualisation rétablit la vue, zéro erreur JS non traitée.
- Départs de flux : retards IPC imposés pour un terminal et une lecture projet ; le changement de projet reste respecté. Plusieurs conversations exigent un choix explicite, Express reste hors release.
- Observation native : choix vide transmis sans fallback, annulation sans écriture et tâche hors release refusée.
- Matrice des parcours et limites : [tests/USER_FLOWS.md](tests/USER_FLOWS.md).
- Temps par rôle : initial/révisé/réalisé, non mesuré distinct de zéro, somme cohérente avec la tâche, pas de mélange enregistré/natif ; ouverture conservée après filtre et actualisation.
- Répartition : base release stable sous filtre tâche ; synthèse des agents sur le périmètre affiché ; pourcentage inconnu si durée absente/total nul, aucune normalisation trompeuse des inconnus.
- Nouveau relevé ajouté dans une release **ouverte** : totaux et pourcentages actualisés sans clôture et fichier source intact après lecture.
- NECA : QA et coordination sans relevé distinguées de la réalisation du travail ; états running/interrupted/unrecorded/missing-duration testés sans changer le registre.
- Revue temps/jetons : 24 tests du lecteur partagé verts ; quatre caractérisations (pause nocturne entre tours, suspension dans un tour, cache absent, JSONL incomplet). Les limites de collecte sont **non corrigées** dans cette version. Voir [USAGE_REVIEW.md](USAGE_REVIEW.md).
- Captures inspectées : `test-results/markdown-preview.png`, `test-results/no-release-terminal.png`, `test-results/agent-time-breakdown.png`, `test-results/time-allocation.png`.
- Dépendances figées : Marked 18.0.12 et DOMPurify 3.4.15 ; audit npm production sans vulnérabilité signalée au moment du contrôle.
- Rendu conforme aux recommandations de nettoyage de [Marked](https://marked.js.org/) et à l’API de [DOMPurify](https://github.com/cure53/DOMPurify), avec liste d’éléments restreinte.
- Aucun envoi email, aucune modification des données NECA, installation ou publication GitHub.
- Paquet Debian 0.2.6 construit, version et SHA-256 vérifiés ; JavaScript, main Electron et catalogue embarqués identiques aux sources testées.
- SHA-256 : `8cd073d0d8b7f0dddfb887de23268d1762b5ab56fafa25192573956c70e918ab`.

## Retrait de l’email 0.2.5 — 11 septembre 2026

- 54 tests Python + 11 JavaScript verts ; six parcours Electron verts sur sources, dont NECA en lecture seule.
- Écran email, réglages, méthodes renderer et actions backend absents, même avec anciennes données présentes.
- Brouillons/configuration synthétiques préservés octet pour octet après navigation et actualisation.
- Crew : 263 tests verts ; 41 tests du service retiré remplacés par quatre contrôles de retrait/compatibilité/import EML.
- Ancien CLI : refus sans écho des arguments ni accès au stockage ; API d’envoi et transports absents.
- Incident transitoire : config_for absent dans le helper retiré bloquait la version installée 0.2.4.
- Deux lectures inertes rétablissent le chargement sans email ; ancien catalogue installé vérifié sur NECA.
- Premier passage NECA rouge : assertion figée d’un chronomètre ouvert devenue obsolète ; comparaison désormais au registre réel, sans le modifier.
- Second passage : six parcours verts, empreintes des fichiers des deux releases NECA identiques avant/après.
- Graphe Crew, builds isolé/actif, parité de 30 fichiers et validation du skill odoo-close conformes.
- Capture synthétique `test-results/email-removed.png` inspectée ; ancien état privé et trousseau non supprimés.
- Sources de transport sauvegardées hors des dépôts avant retrait ; aucun email, aucune installation ou publication GitHub.
- Paquet 0.2.5 construit ; six parcours également verts sur l’exécutable empaqueté.
- SHA-256 vérifié : `b5966620d92bd931cf5889f04e097320edbd1578ac6dfd7b6505a864a960d7a7`.

## Gmail SMTP et éditeur 0.2.4 — 11 septembre 2026

- 52 tests Python + 11 JavaScript verts ; six parcours Electron verts sur sources puis sur l’exécutable empaqueté.
- Communication : paramètres SMTP/OAuth, annulation native de connexion, aucun champ secret dans le renderer.
- Vrai garde de clôture sur fixture jetable, puis objet/texte/À/Cc/Cci édités et enregistrés ; paramètres projet préservés.
- Retrait et ajout de PDF depuis la release, sélection externe refusée ; anciennes versions d’édition refusées.
- Saisie conservée après fermeture/actualisation, aperçu non enregistré explicite, rechargement de la version sauvegardée.
- HTML apparent rendu comme texte ; aucun bouton ni IPC d’envoi dans le cockpit.
- Deux releases NECA consultées sans modification (empreintes Markdown/JSON avant/après), aucun shell ni agent lancé dans NECA.
- Crew : 300 tests verts, dont 41 email ; SMTP/OAuth/trousseau/dialogue simulés, aucun service Gmail contacté.
- Contre-épreuves : accord périmé, configuration modifiée pendant auth, RCPT refusé avant DATA, Cci uniquement dans l’enveloppe, résultat incertain sans nouvel essai.
- Génération Crew isolée puis active, parité de 30 fichiers + aiguillage conforme ; skill odoo-close valide.
- Captures d’édition, aperçu et paramètres inspectées ; message pleine largeur et cases PJ alignées.
- Paquet `release/odoo-tricorder_0.2.4_amd64.deb` construit ; version et dépendances Zenity/SecretStorage vérifiées.
- SHA-256 vérifié : `35c9cc3c42543a55cb5cc13c3f7a4a5664eb163939e9556cffbd84805798266f`.
- Connexion réelle et premier email témoin non exécutés : configuration personnelle encore requise.
- Aucune installation du paquet sur le poste ni publication GitHub pendant cette intervention.

Captures synthétiques privées : `test-results/communication-settings.png`,
`test-results/communication-editor.png`, `test-results/communication-preview.png`.

## Temps partiels 0.2.3 — 11 septembre 2026

- 52 tests Python + 11 JavaScript verts ; quatre régressions de calcul rouges avant correction.
- 6 parcours Electron verts sur sources puis sur l'exécutable empaqueté.
- Nouveau parcours : temps enregistré malgré un rôle manquant, filtre tâche, actualisation, période ouverte et absence distincte du zéro.
- Deux releases NECA consultées en lecture seule ; temps partiels vérifiés sur la release signalée, fichiers Markdown/JSON identiques avant/après.
- Capture réelle inspectée : sous-total 2 h 19 min (139,91 min enregistrées), mention partielle, rôles manquants et période ouverte visibles.
- Premier passage réel : une attente de test d'arrondi T03 erronée (57 au lieu de 58 minutes) corrigée, puis parcours complet rejoué.
- Crew : 286 tests verts, dont 33 tests du suivi d'effort ; génération isolée puis installation active, parité Claude/Codex vérifiée.
- Paquet `release/odoo-tricorder_0.2.3_amd64.deb` construit ; SHA-256 vérifié : `c9620153ef2708520b4255ae6cba06165ddfcaed2acd7418ffbe8bb04f20f316`.
- Aucun registre client réparé, aucun temps reconstitué, aucune installation du paquet ni publication GitHub.
- Connexion Gmail : OAuth inchangé. Le mot de passe d'application/SMTP demandé pendant ce correctif n'est pas implémenté dans cette version.

Captures privées : `test-results/partial-effort.png` et `test-results/real-neca-partial-effort.png`.

## Communication 0.2.2 — 11 septembre 2026

- 52 tests Python et 6 JavaScript : verts.
- 5 parcours Electron depuis les sources : verts, dont communication À/Cc/Cci et NECA opt-in en lecture seule.
- Suite Crew associée : 27 tests email dédiés, 281 tests au total ; OAuth/trousseau/transport simulés, vrai garde de clôture sur projet jetable.
- Paramètres et brouillons synthétiques hors du dépôt ; zéro email envoyé et aucune boîte Gmail parcourue.
- Régression ciblée : une désactivation pendant le renouvellement du jeton interdit encore la transmission.
- Paquet Debian 0.2.2 construit ; les 5 parcours sont également verts sur l'exécutable empaqueté.
- SHA-256 : `8f82ea66c83e073439e48eaa7e98b90aa438cfab45f2f562ef28b762b7507402`.
- Connexion Google réelle et premier message témoin non exécutés : configuration utilisateur encore requise.

Captures synthétiques locales : `test-results/communication-settings.png` et
`test-results/communication-preview.png`. Les destinataires ne sont pas publiés.

## Fiabilisation 0.2.1 — 11 septembre 2026

- 52 tests Python et 6 tests JavaScript : verts.
- 3 parcours Electron synthétiques : verts (bureau, roadmap, cycle de vie/navigation).
- 1 parcours NECA opt-in : vert, avec données du projet en lecture seule ; plan,
  missions, critères, mesures, navigation retour et écran compact contrôlés.
- Empreintes des fichiers Markdown/JSON de la release réelle comparées avant/après : identiques.
- Aucun shell ni agent lancé dans NECA, aucune base ni production contactée.
- Paquet Debian amd64 0.2.1 construit ; les 4 parcours sont également verts sur l’exécutable empaqueté.
- Paquet local : `release/odoo-tricorder_0.2.1_amd64.deb`.
- SHA-256 : `e248bce7b80ea81295257fb0ceda2ce2745cff6729f1ac4fd4edd18949f5c219`.
- Catalogue local relu : 24 releases closes et 1 ouverte, sans avertissement de lecture.
- Retouches finales : sans ajout/recherche de projet ni « À mon attention », informations techniques repliées ; ressources sous Projet et onglet Express.
- Retrait des titres décoratifs « Odoo · Mission Control », « Poste local » et « Suivi de mission » ; critères et avertissements de production conservés.

Cas ajoutés : clôture par suppression du marqueur, ancien lot, points README,
réception distincte de validation, provenance worktree, workflows manquants et
associations multiples, file d’attention multi-release, mémoire de tâche par release,
changements rapides, réutilisation du même terminal, association à une autre tâche
dans ce terminal, refus d’un workflow incohérent, heures et mesures non comparables.
Express : runs terminés sans release, promotion vers le flux complet, dernier résultat
QA (une reprise remplace l’ancien vert), refus des chemins externes, navigation
indépendante de la release et nouveau terminal sans attribution de release/tâche.
Ressources : absence des onglets techniques dans le pilotage, accès via Projet,
sélecteurs de release masqués sur ces écrans, retour au plan et à sa tâche conservé.
Les preuves périmées des releases closes restent visibles sans créer de nouvelle urgence.
Les copies d’écran réelles sont locales dans `test-results/` (ignoré par Git).
Le graphe et la fiche de reprise ne sont plus présents dans l’interface ; leur absence est testée.
La publication GitHub et l’installation ne sont pas effectuées dans cette intervention.

Commande locale de recette réelle (à lancer uniquement pour ce projet explicitement autorisé) :

```bash
TRICORDER_REAL_PROJECT=/home/blegoff/neca-sa \
TRICORDER_REAL_RELEASE=2026-09-08_02_demandes-a-venir npm run test:ui
```

Le test réel est désactivé par défaut en CI ; ses données ne sont ni embarquées ni publiées.

## Validation 0.2.0 — historique

Date : 11 septembre 2026. Données exclusivement synthétiques.

| Contrôle | Volume | Résultat |
|---|---:|---|
| Catalogue, séries et isolation documentaire | 10 tests | Vert |
| Sources, dépendances, profils, stack et explorateur | 7 tests | Vert |
| Adaptateurs natifs, confidentialité, périodes et attentes parallèles | 12 tests | Vert |
| Client de statut Codex, contrat en lecture seule | 2 tests | Vert |
| Rapports JUnit et attribution du volume | 4 tests | Vert |
| Vrais shells PTY, saisie, contexte et persistance | 4 tests | Vert |
| Parcours Electron depuis les sources | 2 parcours | Vert |
| Construction Debian amd64 | 1 paquet | Vert |
| Parcours Electron de l’exécutable empaqueté | 2 parcours | Vert |
| Empreinte SHA-256 du paquet final | 1 fichier | Calculée et vérifiée |

Les 39 tests Python passent. Les 2 parcours de bureau couvrent notamment :

- projets, preuves périmées, environnements et sources exactes ;
- vrais terminaux, clavier, collage isolé et même PID après fermeture/réouverture ;
- association session/tâche/flow/rôle, événement filtré, alerte rouge et notification ;
- temps et jetons mesurés via Odoo Crew, sans création automatique d’effort.json ;
- graphe, critères visibles et fiche de reprise portable ;
- fichiers reçus dans l’explorateur et recherche transversale ;
- palette Claude/Codex, profils, préférences persistantes ;
- dossier de travail personnalisé et portée conservée par un terminal existant ;
- volume de QA à partir d’une preuve JUnit synthétique.

Commandes : `npm test`, `npm run test:ui`, `npm run dist`,
`npm run test:packaged`, `npm run checksum`, `git diff --check`.

Paquet : `release/odoo-tricorder_0.2.0_amd64.deb`.
SHA-256 : `7a9e35eab4739609cc6d4bbe3ea2d729d0f19f778de2f06ab8e751f7caeaedc8`.
Les deux parcours sont rejoués avec l’exécutable empaqueté, pas seulement les sources.

## Reprises effectuées

- Navigation de fichiers pendant un chargement : la dernière demande gagne.
- Changement de profil : le dialogue reste ouvert jusqu’à l’actualisation ;
  création de terminal désactivée pendant le chargement.
- Critères remontés dans le suivi et portée par défaut explicitement « release complète ».
- Sous-agent identifié par agent_id : ses outils ne modifient pas l’état du parent.
- Résultat d’un outil parallèle : il ne résout pas une autre demande de permission.
- Temps de permission jusqu’à la fin d’un outil : borne haute, pas durée humaine exacte.
- Ancien service PTY : mise à niveau uniquement lorsqu’il ne contient aucun terminal.

## Portée de la validation

Les adaptateurs sont testés sur contrats/événements synthétiques ; aucune conversation
Claude/Codex réelle n’a été lancée, aucun prompt ni test facturé à un fournisseur.
Le CLI Codex installé et son schéma ont été consultés ; le lecteur runtime n’envoie
que des méthodes de lecture. Les versions natives futures restent susceptibles
de nécessiter une adaptation, signalée sans fabrication de mesures.

Notifications OS interceptées dans les tests : aucun message de test envoyé au bureau.
Home, historique shell et presse-papiers isolés. Aucune base Odoo ni production touchée.
Les captures dans `test-results/` sont locales et ne contiennent que des fixtures.
Cette validation accompagne la livraison GitHub v0.2.0 ; le paquet ci-dessus est
celui destiné au téléchargement. La CI vérifie également les sources publiées.

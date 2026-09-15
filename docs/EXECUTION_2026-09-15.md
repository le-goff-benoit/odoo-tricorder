# Réalisation — Intentions, orchestration et cockpit

15 septembre 2026. Les dix lots de la version sont implémentés localement dans Tricorder 0.3.0 et Crew. Références avant changement : Tricorder `9792781`, Crew `72702f4`. Les projets clients sont restés en lecture seule. La publication et l’installation ont ensuite été autorisées ; voir [la livraison 0.3.0](releases/0.3.0.md).

## Résultats et réception

| Lot | Résultat livré | Vérification / limite |
|---|---|---|
| L01 Intentions et contrats | Registre versionné, source conservée, plan schéma 2 rédigé par le principal, critères/commandes/environnement avant exécution | Tests de contrats et essais natifs de planification, dont contradiction et contre-épreuve |
| L02 Réceptions et preuves | Preuves liées aux entrées pertinentes, fichiers/logs immuables, identité de l’environnement et du candidat | Un changement pertinent invalide ; date de reçu ou demande voisine seule ne force plus la reprise |
| L03 États et rendu | Réception historique, validité des preuves et activité distinctes dans les deux Kanbans | Tests communs des états et parcours Electron |
| L04 Intentions et dépendances | Sources/historique, liens réciproques, graphe navigable et alternative en liste | 50 tâches, cycles, référence absente, ressources et clavier |
| L05 Quotas | Adaptateurs Codex et Claude, fenêtres 5 h/semaine, fraîcheur, remise à zéro, logos officiels | Transport réel **non qualifié sur ce poste** ; affichage indisponible, jamais zéro inventé |
| L06 Parallélisme | Candidat QA isolé, ressources physiques communes, restauration des verrous source lors d’une reprise | Tests de collision entre projets, altération du candidat et retour QA → dev ; recette intégrée toujours requise |
| L07 Modèles par rôle | Politique partagée Codex/Claude, principal conservé, modèles demandés/observés distincts | Candidats légers **expérimentaux** ; aucun basculement automatique |
| L08 Ergonomie | Navigation Intentions → Plan, langage commun, densité compacte, contrastes, clavier | Passe globale après les lots : neuf vues × trois dimensions/zoom et dialogues |
| L09 Continuation et hooks | Lancement instrumenté, garde Stop, réception des fins d’agents, respect des interruptions humaines | A → B → C exécuté sur les deux CLI ; enfant réel puis reprise du parent ouvert ; parent fermé non qualifié |
| L10 Orchestration et timers | Carte du principal, plusieurs activités simultanées, filtre En exécution, timers sourcés | Attente/trace périmée/fin distinctes ; durée inconnue explicite, pas de double compte |

## Complément : demandes visibles pendant la préparation

Chaque intention enregistrée dans la release apparaît dans Plan et les deux Kanbans avant le découpage, avec **À préciser** ou **À planifier**. Elle n’est pas une tâche exécutable. La carte ouvre la demande originale. Dès qu’une tâche existante couvre l’intention, la carte provisoire disparaît ; les liens restent consultables dans Intentions. Une liaison devenue orpheline fait réapparaître la demande. Les intentions reportées/satisfaites restent dans le registre.

Crew enregistre les demandes au fil de leur réception, sans attendre la fin de la revue. Tricorder détecte toutes les deux secondes les changements des fichiers de release et de flow des projets enregistrés, puis actualise le catalogue seulement si nécessaire. Le délai visible comprend cette détection et la lecture du projet. Il n’interprète pas directement les conversations ni du texte libre comme un plan. Une nouvelle release devient disponible sans clic sur Actualiser.

## Qualité de planification et modèles

Les essais natifs ont retrouvé une perte de valeurs finales explicitement demandées dans un premier plan. La consigne corrigée distingue donnée intermédiaire, résultat final prescrit et règle ajoutée sans décision. Les deux principaux ont passé le cas corrigé et une contre-épreuve séparée. Les sorties initiales et corrections sont conservées dans Crew : `docs/quality-lab/planning-2026-09-15/`.

Huit appels bornés ont comparé les modèles sur dossiers (`docs/quality-lab/models-2026-09-15/`). Terra n’a pas atteint le seuil de gain retenu ; Sonnet a été plus rapide sur ces dossiers, sans preuve suffisante sur du développement complet. Les profils restent donc sur le principal par défaut. Les modèles légers sont des options explicites expérimentales.

Les essais natifs de continuation et d’enfant réel sont dans Crew : `docs/quality-lab/continuation-2026-09-15/`. Le premier essai Codex éphémère a échoué faute d’identité de thread ; la reprise persistante a réussi. Les preuves conservent cet échec. Ces sondes exécutent des assertions et réceptions synthétiques, pas une recette Odoo client.

## Passe globale UI/UX après les lots

La [revue UI détaillée](UI_IMPLEMENTATION_2026-09-15.md) et ses [captures](implementation-2026-09-15/) couvrent les vues de l’application. Le bandeau compact libère environ 80 pixels verticaux sur la capture 1000×700 à 125 %. Les libellés « Non estimé » et « Non mesuré » sont distincts, les valeurs absentes moins envahissantes, les remplacements tardifs qui écrasaient ces libellés ont été supprimés. Les logos sont ceux d’OpenAI et d’Anthropic.

Une sonde locale, réalisée avant le dernier ajout de détection en direct, sur la lecture de 50 tâches donne une médiane chaude de 64,5 ms avant et 63,44 ms après, six processus par variante. Ce petit écart ne démontre aucun gain significatif ; il ne justifie pas un cache supplémentaire. [Mesures et protocole](implementation-2026-09-15/reader-measurements.json).

## Vérifications finales

- `npm test` : **79 tests Python et 54 JavaScript réussis**.
- `npm run test:ui` : **16 parcours réussis, 1 ignoré** (client réel, opt-in).
- `npm run dist` : paquet Debian **0.3.0** construit.
- `npm run test:packaged` : **16 parcours réussis, 1 ignoré**, sur le binaire empaqueté.
- Crew : **305 tests, dont 1 ignoré**, graphe valide ; 35 fichiers générés et installés avec parité Claude/Codex, dont cinq agents Codex natifs. Les anciens profils générés sont sauvegardés avant remplacement. Les skills Plan/Start passent leur validateur.
- `git diff --check` : vert dans les deux dépôts ; liens locaux du rapport vérifiés.

[Logs des contrôles](implementation-2026-09-15/checks/). Le test Crew ignoré nécessite le parseur TOML de Python 3.11 ; le poste utilise Python 3.10. Les contrôles utilisent des projets synthétiques temporaires.

Paquet local : `release/odoo-tricorder_0.3.0_amd64.deb`, construit et testé dans son dossier décompressé, puis installé et vérifié sur le poste. SHA-256 : `1d85efad6f2daa6d74dd439c151138cddccb7ea1674dc131ead0f85e26d671f7`.

## Limites qui restent explicites

- [Qualification des quotas natifs](implementation-2026-09-15/quota-native-qualification.json) : service Codex fermé avant initialisation, sonde Claude sans réponse exploitable dans le délai borné. Cela ne conclut rien sur l’abonnement ; aucun secret n’a été lu.
- La continuation est qualifiée avec une session principale ouverte. Aucun service ne réveille un parent fermé. La confiance native des hooks reste requise par le CLI.
- Aucun gain global de durée ni réduction chiffrée des reprises sur une nouvelle release client réelle n’est revendiqué. Les scripts et contrats sont testés ; leur efficacité en production de releases reste à mesurer.

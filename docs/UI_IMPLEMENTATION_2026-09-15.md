# Réalisation UI — 15 septembre 2026

Lots L03, L04, L08 et partie UI de L10, intégration L05 et lancement L09.
Les scénarios ci-dessous utilisent exclusivement des projets temporaires synthétiques.

## Comportement livré

- Un modèle commun sépare réception historique, validité des preuves et activité.
  Une réception dont les contrôles sont périmés reste réceptionnée dans les deux
  Kanbans ; un blocage explicite est distinct d’un suivi inconnu.
- Intentions précède Plan. Sources conservées, décisions, contraintes, questions,
  historique des versions et liens réciproques intentions/tâches sont consultables.
- Plan propose une liste accessible au clavier et un graphe à flèches, sélection
  des ancêtres/descendants, erreurs de cycle/référence et ressources communes.
  La disponibilité provient du lecteur Crew. Aucun chemin critique temporel n’est inventé.
- Orchestration de la release figure dans les trois représentations des tâches.
  Une trace absente est explicite. Le responsable déclaré reste distinct du
  fournisseur observé ; cette distinction peut faire apparaître une contradiction utile.
- L’activité actuelle précède l’historique dans Agents. Principal, dev et QA
  peuvent apparaître ensemble. Les filtres En exécution et le compteur utilisent
  les mêmes activités. Le terminal ouvert ne suffit pas à confirmer un travail.
- Le timer mesure l’étape depuis une borne observée. Durée inconnue, attente,
  fin et suivi à vérifier restent distincts. Aucun total de tâche n’inclut de
  nouveau les durées communes d’orchestration.
- Une actualisation sans changement préserve le DOM du plan ; les chiffres de
  durée s’actualisent localement, sans annoncer chaque seconde au lecteur d’écran.
- Les quotas sont globaux, affichés sous leurs logos officiels OpenAI/Anthropic.
  Une fenêtre absente/périmée n’est pas un zéro ; détail des sources au clic.
  Cette preuve UI ne qualifie pas la disponibilité d’un quota natif réel.
- Les boutons normaux Claude/Codex emploient le lancement instrumenté préparé
  par Electron, avec le contexte du terminal créé.

## Architecture

`task-state.mjs`, `activity.mjs`, `plan-model.mjs` et `provider-brand.mjs`
portent les modèles purs ; `plan-view.js` rend directement Plan/Intentions.
Ces vues ne dépendent plus des transformations positionnelles de `lifecycle.js`.
Les autres vues conservent leurs couches existantes, avec un contrat CSS commun.

## Vérifications

- Suite Electron entière : **16 réussis, 1 ignoré** (projet réel, opt-in).
- Vérification renforcée de toutes les vues de projet : 1440×900, 1000×900,
  1000×700 avec zoom 125 %, y compris Intentions et préférences ; pas de
  débordement du document, espacements et contrôles communs.
- Scénario ajouté : intention → tâche → retour ; graph au clavier ; trois
  activités simultanées ; filtre global ; timer sans remplacement de carte ;
  actualisation du graphe sans reconstruction ; panneau quota accessible.
- Tests purs : 50 tâches, cycle, dépendance absente, ressources base/port,
  réceptions périmées, suivi inconnu, dédoublonnage, absence de début,
  fin observée, trace périmée, orchestration durable et identité des marques.
- Contrastes mesurés sur les textes de l’activité : minimum **8,83:1**.
  Au zoom 125 %, le viewport effectif est 800×560 pour une fenêtre1000×700 ;
  largeur défilante du document égale à 800px, sans débordement horizontal.

Les captures retenues sont dans [implementation-2026-09-15](implementation-2026-09-15/).
Les quotas y sont volontairement indisponibles : aucune valeur fictive n’est
présentée comme une connexion de compte réelle.

## Limites explicites

La trace d’orchestration est à vérifier après 90 secondes sans mise à jour.
Cela ne prouve pas que le processus est arrêté. Les anciennes releases sans
registre ou trace conservent ces absences ; le cockpit ne les écrit pas.
Les ressources communes du graphe signalent un partage potentiel ; seules les
règles Crew établissent un conflit de verrou effectif. Le graphe peut défiler
horizontalement pour les longues chaînes, avec la liste comme alternative.

## Passe finale après intégration de tous les lots

- Bandeau compact sur petites hauteurs : environ 80 pixels verticaux libérés
  sur la capture 1000×700 à 125 %, sans masquer le contexte.
- Prévision absente « Non estimé », temps absent « Non mesuré » ; titres
  proportionnés et suppression des remplacements tardifs de libellés.
- « Activité des agents » et « Toutes les tâches » remplacent les intitulés ambigus.
- Demandes reçues visibles avant le plan dans les trois représentations, sous
  À préciser/À planifier, sans action de lancement ; origine accessible au clic.
- Test de bout en bout sans actualisation manuelle : nouvelle release, demande,
  tâche liée puis retrait de cette tâche ; demande conservée et réapparue.
- Le graphe conserve uniquement les dépendances entre tâches du plan ; les
  demandes à planifier restent dans une section séparée.

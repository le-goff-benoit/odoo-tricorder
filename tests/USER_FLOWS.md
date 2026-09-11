# Régressions par parcours utilisateur

Les incidents remontés en usage deviennent des tests de transition : état initial,
action, attente ou interruption, résultat et reprise. Un écran qui se charge ne
suffit pas : vérifier aussi la sélection mémorisée et les processus conservés.

| Départ / interaction | Comportement attendu | Preuve automatisée |
| --- | --- | --- |
| Des releases existent, mais on commence autre chose | « Aucune release » reste vide après actualisation et réouverture ; aucune tâche héritée | `release context`, `test_explicit_no_release_does_not_fall_back_to_existing` |
| Un terminal hors release crée une release | Nouvelle release unique sélectionnée, même terminal et PID, choix mémorisé | `release context` |
| Plusieurs conversations sont ouvertes | Aucun terminal deviné ; attribution manuelle d’un seul, Express intact | `flow starts`, `release-context.test.cjs` |
| Une ancienne release est rouverte ou plusieurs releases apparaissent | Pas de nouvelle attribution automatique | `release-context.test.cjs` |
| L’utilisateur quitte le projet pendant la création du terminal | Terminal créé dans le projet demandé ; aucun changement forcé d’écran | `flow starts`, réponse IPC retardée explicitement |
| Une lecture du précédent projet arrive en retard | Ni écran courant ni sélection mémorisée écrasés | `flow starts`, réponse IPC retardée explicitement |
| Lecture projet en erreur, puis réparation de la cause | Écran d’erreur sans blocs parasites ; actualisation récupérable, aucune exception JS | `Markdown preview` |
| Observation native hors release ou dialogue annulé | Pas de retour implicite à une release ; annulation sans association enregistrée | `cockpit-context.test.cjs` |
| Consultation d’une autre release ou tâche | Consultation distincte du terminal ; mémoire des tâches par release | `lifecycle` |
| Contexte changé entre lecture et attribution | Refus de l’ancien contexte ; refus d’une release absente ou d’un terminal d’un autre projet | `release context` |
| Markdown contenant du HTML hostile | Texte mis en forme, code passif, source consultable, aucune action injectée ni requête HTTP | `Markdown preview` |
| Mesures partielles, filtre puis actualisation | Temps connu conservé, absence distincte de zéro, pas de faux écart | `effort`, `measurements.test.cjs` |
| Nouveaux relevés pendant une release ouverte | Temps et parts tâches/agents à jour sans clôture ; part release inchangée par le filtre tâche | `effort: open release` |
| Travail terminé mais mesure absente/interrompue | Motif du relevé incomplet affiché par rôle ; aucun statut de travail modifié | `test_effort_explains_unrecorded_running_interrupted_and_missing_duration`, parcours NECA |

Les noms courts désignent les tests Electron de `desktop.spec.cjs`. Ils sont
rejoués depuis les sources puis sur l’exécutable empaqueté. Les fixtures sont
jetables ; le parcours NECA optionnel contrôle des fichiers réels en lecture seule.

## Limites à conserver visibles

- L’attribution automatique repose sur une nouvelle release unique dans le projet
  actuellement consulté, pas sur l’identification certaine de son créateur.
- Le contexte du cockpit ne réécrit ni l’environnement d’un processus déjà lancé,
  ni les anciennes attributions de temps. Les tests vérifient cette séparation.
- Les interruptions sont simulées aux frontières IPC ; elles ne couvrent pas
  toutes les pannes du système, du disque ou des fournisseurs Claude/Codex.
- Ne pas transformer une donnée absente ou une ambiguïté en succès : expliquer
  l’état et permettre une reprise explicite, sans arrêt de terminal implicite.

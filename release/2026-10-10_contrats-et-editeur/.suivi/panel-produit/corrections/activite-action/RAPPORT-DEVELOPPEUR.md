# Activité : action de reprise et étape visibles ensemble

Défaut produit confirmé par les deux suites complètes (même unique échec) et une réception indépendante : une ligne `activity-resume-agent` annonçait «Agent arrêté» puis le titre d’étape, sans expliquer l’action «Reprendre l’agent».

Cause dans `src/studio.js/activityTable` : `focus.title || action.label` faisait gagner systématiquement le titre d’étape. La correction compose désormais l’action native et le titre (`Reprendre l’agent… · Préparer le diagnostic`). Statut, data-action et comportement inchangés ; hors conversation native, le titre d’étape demeure le seul complément. Aucun CSS ni autre fonctionnalité modifié.

`tests/terminal-resume-ux.spec.cjs` conserve l’assertion originale de reprise et ajoute la présence du titre d’étape et le data-action attendu. Aucun nouveau cas, compte global inchangé à 186.

Rouge : `/tmp/tricorder-rc13-final-ui-source/terminal-resume-ux-stopped-5f50d-rsation-or-lost-shell-draft/error-context.md` ; contre-épreuve paquet indépendante `/tmp/tricorder-review-activity-resume/results-package-red/`.

Vérification :

- `npm run build` : vert.
- Quatre scénarios complets `terminal-resume-ux` : verts.
- Deux régressions Activité non native : workflow global et illustration email à plusieurs états, vertes. Total : 6/6 en 53,3 s.
- Résultats : `/tmp/tricorder-editeur-activity-action-green/`.
- Réception indépendante source : 1/1 verte en 10,1 s (action + étape, annulation sans exécuter le brouillon, accord sur mêmes PTY/PID, conversation de trois demandes, dépendance préservée).
- Capture réellement inspectée : `terminal-resume-ux-stopped-5f50d-rsation-or-lost-shell-draft/activity-agent-stopped.png` sous le dossier de résultats. Action et étape lisibles dans le panneau latéral, terminal et brouillon présents.
- Produit figé après build ; root reconstruira le paquet. Écran :190 libre, zéro fenêtre enfant confirmé par xwininfo.

Commande : `DISPLAY=:190 XAUTHORITY=/tmp/tricorder-collections-panel/190/Xauthority python3 /tmp/tricorder-ci-target-source-run.py tests/terminal-resume-ux.spec.cjs tests/studio.spec.cjs --grep 'stopped agent is resumed explicitly|cross-project context|resuming an agent keeps|completed request offers|global workflow runs independently|mail illustration' --output=/tmp/tricorder-editeur-activity-action-green --reporter=line`.

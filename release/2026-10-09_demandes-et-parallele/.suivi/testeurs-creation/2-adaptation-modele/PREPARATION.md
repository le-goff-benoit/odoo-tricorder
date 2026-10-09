# Banc préparé — aucun verdict produit

Date : 9 octobre 2026. Profil chef de projet métier 9/10, technique 3/10.

- Quatre parcours décrits dans `PLAN.md`, chacun avec une mauvaise configuration volontaire et sa récupération.
- Quatre projets temporaires neufs, documents synthétiques externes déclarés dans `preparation-manifest.json`.
- HOME, XDG, CODEX_HOME, CLAUDE_CONFIG_DIR, TRICORDER_HOME, état et runtime indépendants pour chaque parcours.
- DISPLAY réservé `:182`, XAUTHORITY réservé ; aucun GUI lancé.
- PATH fixé à `stubs:/usr/bin:/bin` avant lancement ; environnement construit par liste blanche.
- `codex` et `claude` : `command -v` pointe vers les stubs de chaque parcours ; `--version` retourne immédiatement le marqueur `TRICORDER-CREATION2-ADAPTATION-STUB`.
- `node --check harness.cjs` : code de sortie 0.
- `node harness.cjs --prepare` : code de sortie 0, quatre préflights réussis, aucune interface ouverte.

La future fonction `launch` exige les chemins absolus et les SHA-256 de l’exécutable et de son `resources/app.asar`. Elle entre normalement dans l’application, impose la vérification du terminal visible avant les actions de workflow et limite les captures à douze pour la campagne du testeur.

Aucun code produit ni rapport d’un autre testeur consulté. Aucune API moteur appelée, aucune écriture SQLite ou configuration de workflow. Aucun build, commit ou suite globale. Les stubs ne qualifient aucun modèle ni livrable métier.

Prochaine étape : recevoir le nouveau paquet et ses deux empreintes, puis observer les quatre parcours par le GUI et produire le rapport français attendu/action/observé/reproduction/preuve/verdict/gravité/classification/prochaine action.

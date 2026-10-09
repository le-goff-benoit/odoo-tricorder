# Réception UX/UI indépendante 1 — navigation et vocabulaire

Date : 2026-10-09. Point de vue : architecte de l’information, analyste métier et chef de projet. Exercice de spécialiste sur données synthétiques ; aucune étude d’utilisateurs humains.

## Périmètre et état

Préparation uniquement. Lancement normal de Tricorder, sans `--workflow-studio`, après communication et vérification des SHA256 exacts du paquet et libération explicite de DISPLAY181. Aucun Electron ni broker lancé durant cette préparation.

Ownership : ce dossier seulement, et les répertoires temporaires du banc. Aucun changement du produit, build, commit, suite complète, lecture de code produit ou des rapports des autres testeurs avant les observations.

## Quatre parcours

1. **Trouver où commencer un traitement métier.** Dans une installation vide, repérer le rôle de Tricorder et de la sidebar, ajouter le projet synthétique « Coordination atelier », découvrir où concevoir un workflow, puis créer « Préparer une réunion ». Vérifier le sens des termes projet, modèle, workflow, bloc et exécution. Réussite observable : première action métier trouvée, projet actif et workflow visibles sans détour injustifié.
2. **Réutiliser une méthode entre deux projets.** Concevoir un petit workflow de préparation/révision/validation, identifier comment le conserver comme modèle, puis préparer sa réutilisation dans « Support équipement ». Vérifier la frontière modèle/workflow du projet et l’effet des changements de contexte. Réussite observable : retrouver la méthode et comprendre le projet concerné avant toute action.
3. **Lancer et retrouver une demande.** Depuis « Support équipement », saisir une intention de diagnostic synthétique dans le terminal principal, observer l’exécution ou son refus explicite dû au fournisseur inerte, naviguer vers le workflow et les demandes, puis retrouver le contexte de cette intention. Vérifier les libellés travail, question, décision, validation et journal. Aucun succès modèle revendiqué : les stubs quittent avec le code 78.
4. **Reprendre le travail après une interruption.** Avoir deux projets et deux méthodes distincts, quitter la vue du travail en cours, ouvrir un autre projet puis revenir. Repérer ce qui réclame une action et retrouver terminal, demande et état. Réussite observable : contexte actif lisible, retour disponible, aucune confusion entre projet, méthode et exécution. Une variante de volume peut être préparée par commandes Engine validées après lecture de leur contrat ; ce volume est une fixture et non un geste UI testé.

Les noms ci-dessus sont des objectifs et données de test, pas des hypothèses sur les libellés réellement proposés par le produit. Chaque parcours sera adapté aux commandes effectivement visibles ; une fonctionnalité absente sera indiquée comme non jouée.

## Méthode et preuves

- Observer la GUI avant tout code produit ou rapport externe. Manipuler les parcours au clavier et à la souris via Playwright Electron ; aucun appel de logique interne pour effectuer un geste évalué.
- Afficher dans le terminal GUI avant tout workflow : chemins `codex` et `claude`, leurs versions et le marqueur `TRICORDER-UX-INERT`. Le préflight shell de préparation ne remplace pas cette preuve visible.
- Capturer 12 à 18 vues utiles maximum, réellement inspectées. Conserver ordre, geste, attente métier, résultat et nom de capture dans le journal d’observation.
- Mesurer toute confusion : nombre de changements de vue et retours, libellés rencontrés, temps entre geste et état visible quand utile. Les mesures chronométrées restent celles d’un spécialiste, sans extrapolation à une population.
- Classer chaque constat : bug (comportement erroné observable), friction (coût ou ambiguïté de parcours) ou limite du banc (stub, environnement, fonctionnalité inaccessible). Gravité : bloquante, majeure, modérée, mineure. Fournir effet utilisateur, preuve et geste de réparation concret.
- Rapport final : faits observés, recommandations classées, points corrects utiles, parcours/variantes non joués, limites et absence de vraie exécution IA.

## Banc et fixtures

`prepare.cjs` appelle le harness partagé avec DISPLAY181 et crée uniquement les espaces temporaires isolés et trois dépôts Git locaux sans remote. HOME, XDG, CODEX_HOME, CLAUDE_CONFIG_DIR, état et runtime sont temporaires. PATH whitelist : stubs avant `/usr/bin:/bin`. Aucun vrai compte, client, secret, trousseau ou service externe.

Les fixtures ne contiennent aucun état SQLite/JSON d’exécution ni workflow. Les notes de projet représentent du contenu métier synthétique ; les gestes d’ajout de projets et de conception restent à recevoir dans la GUI. Les processus du spécialiste seront fermés à la fin ; Xvfb sera conservé.

## Conditions de départ

- Exécutable et ASAR fournis par le responsable, SHA256 exacts validés par `launch()`.
- DISPLAY181 explicitement libéré.
- État initial et preuve de préflight visibles, puis déroulement des quatre parcours.

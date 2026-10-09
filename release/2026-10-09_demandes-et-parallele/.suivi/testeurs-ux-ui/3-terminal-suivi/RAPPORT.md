# Avis UX/UI indépendant #3 — terminal et suivi

Les bases de l’application unique fonctionnent dans le candidat testé : vrai shell, continuité de saisie, terminal conservé pendant la navigation, deux dispositions avec séparateur, workflow générique réutilisé et quatre demandes dépendantes dans deux projets. La lisibilité des contextes et des arrêts demande encore trois simplifications. Aucun travail d’IA n’a eu lieu.

## Périmètre et réception

Paquet figé `0.6.0-rc.12`, entrée normale sans `--workflow-studio`, DISPLAY :183. Executable SHA256 `9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3` ; ASAR SHA256 `a344374116f8ada276e426dd94279450b73cee31ba46aa981ae830a1fb64f44b`. Le harness vérifie également les fichiers backend copiés du paquet. Aucun code produit ni rapport des autres testeurs lu avant ou pendant les observations ; aucun build, commit ou fullsuite.

Les 17 captures conservées ont été observées visuellement, individuellement pour les constats et en planches de contrôle pour les parcours. Les captures immédiates qui montraient un état transitoire ou une duplication ont été écartées. Résolutions : 1440 × 1000 puis 1280 × 900. Le point de reprise après interruption est la finalisation de ces preuves ; les quatre parcours n’ont pas été recommencés et l’application n’a pas été relancée.

Le banc `/tmp/tricorder-ux-terminal-suivi-ntZVq5` utilise exclusivement HOME, XDG, CODEX_HOME, CLAUDE_CONFIG_DIR, état et runtime temporaires. PATH a été figé avant tout broker. Les deux stubs `codex` et `claude` portent `TRICORDER-UX-INERT`, sortent avec le code 78 et n’appellent aucun outil ni modèle. Leurs chemins, versions et les trois répertoires privés ont été vérifiés dans le terminal GUI : [05 — précontrôle](captures/terminal-suivi-05-preflight-terminal.png).

Les projets Atelier Azur et Laboratoire Corail sont inventés. Les dossiers préparés contiennent seulement des README et des dépôts Git initialisés sans commit. Atelier Azur utilisé par la GUI est une racine synthétique créée par l’application dans l’état temporaire ; Laboratoire Corail utilise le dossier préparé choisi par le sélecteur natif. Cette différence de création du premier projet limite le contrôle du choix de dossier ; elle n’est pas interprétée comme un défaut de produit. Tout ce qui suit est resté synthétique.

Deux conversations ont été créées par la GUI : une première pour suspension/reprise, puis une seconde incluant les deux projets pour les relations R1–R4. Aucune fixture d’exécution n’a été injectée par API et aucun SQLite/JSON d’état n’a été retouché. La mention « Exécution réelle » de l’interface qualifie le mode de lancement local ; elle ne prouve aucune réalisation par IA.

## Quatre parcours effectivement joués

| Parcours | Gestes et résultat observé | Preuves |
|---|---|---|
| P1 — Intention et continuité | Ouvrir Terminal → Ouvrir un terminal, vérifier les stubs, saisir `printf UX-CONTEXTE-R1` sans Entrée, naviguer Workflows puis Atelier Azur, réouvrir Terminal. Même shell, historique et saisie non soumise conservés ; badge de session toujours présent. | [06 avant](captures/terminal-suivi-06-saisie-avant.png), [09 terminal masqué](captures/terminal-suivi-09-apres-navigation.png), [10 retour](captures/terminal-suivi-10-retour-terminal.png) |
| P2 — Partage de l’espace | Basculer terminal/suivi côte à côte puis haut/bas, glisser le séparateur, revenir côte à côte à 1280. La session reste disponible et les contrôles restent visibles. Le split comporte de vrais panneaux, pas une image. | [11 haut/bas](captures/terminal-suivi-11-split-horizontal.png), [12 à 1280](captures/terminal-suivi-12-split-1280.png) |
| P3 — R1–R4, réutilisation et projets | Nouvelle demande → modèle « Release — demandes, plan, réalisation et validation », enregistrer ; réexécuter ce workflow en incluant Corail ; créer R1, R2 après R1, R3 dans Corail après R2, R4 dans Azur après R2 et R3. Sélectionner R2/R3/R4, lire détail et Vue d’ensemble. Les dépendances bloquent réellement les demandes dans l’état affiché ; aucune étape n’est accomplie. | [13 workflow réutilisable](captures/terminal-suivi-13-workflow-release.png), [17 R3/projet/prérequis](captures/terminal-suivi-17-r3-cross-projet-creation.png), [18 ensemble](captures/terminal-suivi-18-vue-ensemble-r1-r4.png), [20 dépendances](captures/terminal-suivi-20-prerequis-attente-suspension.png) |
| P4 — Arrêt, suspension, reprise | Lancer dans le terminal : le stub imprime son marqueur puis retourne au shell. L’interface finit par annoncer « Agent arrêté · progression conservée ». Options → Suspendre sur la première conversation : cause explicite visible. Reprendre l’agent → avertissement → Reprendre dans ce terminal : un deuxième lancement du stub apparaît dans le même historique ; la demande reste suspendue. Retour au projet puis journal : démarrage, bloc prêt, suspension conservés. | [14 stub](captures/terminal-suivi-14-sortie-stub.png), [15 arrêt](captures/terminal-suivi-15-liste-demandes-arret.png), [16 historique après reprise](captures/terminal-suivi-16-r2-dependance.png), [21 journal](captures/terminal-suivi-21-suspension-journal.png) |

## Trois constats prioritaires

### 1. Majeur — Deux causes d’attente partagent « Suspendue » dans les prérequis

**Geste.** Créer R2 dépendant de R1, R3 dépendant de R2, R4 dépendant de R2 et R3 dans la conversation cross-projet ; ouvrir Vue d’ensemble et faire défiler les cartes.

**Attendu.** Le statut d’une demande demeure compréhensible lorsqu’elle devient le prérequis d’une autre : « Attend une autre demande » pour une dépendance automatique ; « Suspendue par vous » pour une action d’arrêt demandée.

**Observé.** La carte R2 indique « Attend une autre demande », tandis que sa représentation comme prérequis de R3 et R4 indique « Suspendue ». Même écart pour R3 dans R4. Aucune action Suspendre n’a été faite dans cette conversation. La première conversation, réellement suspendue par le testeur, est au contraire décrite « Exécution suspendue par une action explicite » et possède une entrée de journal.

**Preuves.** [17 — R2 en attente dans la création R3](captures/terminal-suivi-17-r3-cross-projet-creation.png), [20 — cartes et badges](captures/terminal-suivi-20-prerequis-attente-suspension.png), [21 — suspension explicite distincte](captures/terminal-suivi-21-suspension-journal.png).

**Impact.** L’utilisateur peut croire qu’il doit reprendre une demande arrêtée alors qu’il doit terminer son prérequis. Le suivi perd la distinction entre blocage automatique et décision humaine.

**Simplification.** Employer le même libellé métier dans la carte, la sélection et le badge du prérequis. Le cas automatique devrait dire « Attend R1 » ou « En attente des prérequis » ; réserver « Suspendue par vous » à l’arrêt explicite. Cette observation concerne l’interface, pas une hypothèse sur la valeur technique du moteur. Une correction préparée par le responsable après le constat n’a pas été reçue sur ce candidat figé.

### 2. Majeur — Le contexte cross-projet du terminal devient un identifiant technique

**Geste.** Dans la vue d’ensemble cross-projet, sélectionner R3 du Laboratoire Corail tout en conservant la conversation lancée depuis Atelier Azur.

**Attendu.** Lire simultanément le projet de la demande et celui du shell/conversation. Conserver la conversation est utile ; son ancrage devrait rester nommé.

**Observé.** La barre globale et la sélection latérale passent à « Laboratoire Corail ». Le terminal conserve correctement le shell de la conversation principale, mais sa ligne de contexte affiche « Conversation du workflow affiché · p8eaf59cb8b2645f0 » à la place de « Atelier Azur ». L’invite reste dans le répertoire Azur. L’onglet terminal porte encore le titre de R1, tandis que le suivi montre R3. Le contrôle Contexte testé n’a pas fourni une explication lisible des deux projets dans les éléments visibles.

**Preuve.** [19 — R3 sélectionnée et contexte du terminal](captures/terminal-suivi-19-r3-contexte.png). La capture [18](captures/terminal-suivi-18-vue-ensemble-r1-r4.png) montre le nom Atelier Azur avant sélection cross-projet.

**Impact.** Avant de donner une nouvelle intention ou lancer une commande, l’utilisateur doit déduire si le terminal agit dans le projet sélectionné ou dans le projet principal. L’identifiant ne permet pas ce choix.

**Simplification.** Afficher deux noms stables : « Demande : R3 · Laboratoire Corail » et « Conversation / shell : Atelier Azur ». Le titre d’onglet peut nommer la conversation plutôt que sa première demande. Garder le shell stable, mais expliciter son ancrage sans demander de lire son chemin.

### 3. Modéré — Reprise de l’agent et reprise de la demande sont éloignées

**Geste.** Sur la première conversation, Suspendre une demande puis utiliser le bouton visible « Reprendre l’agent… » et confirmer « Reprendre dans ce terminal » ; revenir à la demande et à son journal.

**Attendu.** Comprendre immédiatement quelle partie reprend et quelle partie reste suspendue, avec la prochaine action à portée de main.

**Observé.** La reprise de l’agent relance le processus dans le même terminal et conserve son historique. L’avertissement explique bien qu’elle efface la saisie shell et peut ouvrir un nouvel agent. La demande reste « Suspendue » ; son action distincte « Reprendre » se trouve dans Options. Le journal de demande conserve uniquement démarrage, bloc prêt et suspension. La différence agent/exécution est techniquement cohérente mais demande deux lectures et un menu.

**Preuves.** [16 — deuxième lancement visible dans le terminal](captures/terminal-suivi-16-r2-dependance.png), [21 — demande encore suspendue et action Reprendre dans Options](captures/terminal-suivi-21-suspension-journal.png). Le texte de la boîte de reprise a été lu par l’interface mais n’a pas de capture dédiée ; aucune perte de saisie n’a été testée lors de cette reprise.

**Impact.** « Reprendre l’agent » est l’action la plus visible après l’arrêt ; l’utilisateur peut la choisir pour poursuivre la tâche, puis croire que sa reprise a échoué lorsque le suivi reste suspendu.

**Simplification.** Sur une demande suspendue, placer « Reprendre la demande » à côté de sa cause. Si l’agent est aussi arrêté, proposer ensuite sa relance. Le dialogue de relance devrait préciser « La demande restera suspendue » lorsqu’il ne la reprend pas.

## Ce qui est suivi, ce qui reste prévu

Les demandes, leur projet, la sélection, la suspension explicite et les dépendances ont un état persistant observable après navigation. Le shell est réel ; les sorties et les deux lancements du stub sont visibles. Les blocs du workflow release, ses neuf étapes, décisions et questions sont une conception générique affichée ; les blocs restés « Prévu », « Prêt » ou « À configurer » ne sont pas des résultats d’IA. Le compteur de progression est resté à 0 / 9. Aucun agent actif durable, aucune réussite de prérequis, aucune validation humaine de plan ni résultat métier n’a été produit.

Limites : les fournisseurs inertes qualifient l’ouverture/arrêt/reprise du terminal, pas la conversation ou la reprise d’un vrai fournisseur. Pas de test d’une session fournisseur identifiable, d’un résultat d’agent, d’une dépendance résolue avec succès ou du traitement effectif d’une question. La suspension demandée a été testée sur la première conversation ; les dépendances automatiques sur la seconde. L’ajout d’un nouveau projet à une conversation existante n’a pas été validé : le projet Corail a été inclus au lancement d’une nouvelle conversation du même workflow. La disposition des panneaux à 1280 a été reçue ; le redimensionnement à 1024 et la division entre plusieurs terminaux n’ont pas été testés.

## Preuves et nettoyage

Préparation : `PLAN.md`, `prepare.cjs`, `terminal-suivi-preparation.json`. Lancement autorisé : `terminal-suivi-execution.json`. Captures : `captures/`, 17 PNG ; planches dérivées `preuve-visuelle-1.jpg` à `preuve-visuelle-5.jpg` pour la relecture. Le nettoyage et les SHA finaux sont consignés dans `NETTOYAGE.json` par `finalize.cjs` ; seuls les processus portant le runtime temporaire de ce banc sont ciblés, le serveur Xvfb est conservé.

Nettoyage terminé : aucun processus du banc restant ; les PID Electron, enfants Electron et broker précédemment identifiés n’existent plus. Executable et ASAR correspondent encore aux SHA autorisés ; les 50 fichiers backend vérifiés correspondent au paquet figé. `PREUVES.json` indexe les 17 captures avec leurs SHA256.

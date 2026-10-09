# Recette indépendante — adaptation de modèles

9 octobre 2026. Chef de projet : métier 9/10, technique 3/10. Application normale, paquet `0.6.0-rc.12`, DISPLAY `:182`, quatre environnements temporaires indépendants.

**Verdict : réception partielle avec réserves UX.** Les quatre adaptations sont créées, enregistrées, retrouvées et rattachées à une première demande. La persistance des consignes et critères corrigés est reçue. Le parcours B n'est pas reçu entièrement : une copie partagée de même nom reste dans le catalogue, sans retrait joué. Le guidage de suppression d'une dépendance dans C est refusé : aucune alerte visible. Aucun résultat métier d'agent n'est qualifié.

## Périmètre et preuve du banc

- Exécutable : `build-artifacts/linux-unpacked/odoo-tricorder`, SHA-256 `9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3`.
- ASAR : `build-artifacts/linux-unpacked/resources/app.asar`, SHA-256 `0ddb18c66b49d3c0713c0292a997897bef144da03a7407516d14e922c4b4807a`.
- Deux empreintes contrôlées avant les lancements par le harness et identiques en fin de recette.
- HOME, XDG, CODEX_HOME, CLAUDE_CONFIG_DIR, état et runtime temporaires. PATH fixé avant lancement : stubs du parcours, `/usr/bin`, `/bin`. Aucun compte, secret, client, service ou trousseau utilisé.
- `command -v codex`, `codex --version`, `command -v claude`, `claude --version` réellement saisis dans les terminaux GUI. Chemins du parcours et marqueurs `TRICORDER-CREATION2-ADAPTATION-STUB` observés. Traces B/C/D dans `terminal-*.txt` ; A dans la vérification consignée du manifeste et le journal de session.
- Toute création/configuration par formulaires, navigation, boutons et connexions de l'application. Aucune fixture de workflow, API de création ou retouche SQLite/JSON.
- Les projets GUI ont finalement été créés dans l'espace temporaire géré par l'application (`state/workflows/projects/...`). Les dossiers externes synthétiques de préparation ne sont pas devenus leur racine. Le contenu de `besoin.md` a été saisi dans la demande, ou paraphrasé pour les parcours suivants. L'import de dépôts existants n'est donc pas qualifié par cette recette. Deux `git init` sans commit ont seulement préparé les fixtures externes A/B.
- Douze captures de parcours enregistrées et réellement ouvertes visuellement, plus une image de diagnostic du banc `dialogue-debug.png`. C03, prise trop tôt initialement, a été remplacée par l'Activité après relance complète : elle prouve la demande enregistrée et sa révision.
- Les stubs quittent avec le code 78. Les premiers essais prouvent le rattachement et l'entrée dans le suivi ; ils ne prouvent pas le travail des blocs, une validation métier ou un fournisseur.

## Parcours réellement joués

### A — Meeting vers support interne

**Attendu.** Une copie identifiable dans Assistance équipe A, original conservé, trois étapes adaptées et critères cohérents après correction/réouverture ; premier essai sur la copie.

**Actions.** Choisir « Clôture de meeting » → Utiliser → nommer « Qualification support interne A », destination A. Renommer et adapter la collecte, la décision humaine et la préparation de la synthèse. Saisir volontairement « Clôturer même sans responsable » avec le critère « responsable identifié ». Appliquer, corriger en « Ne clôturer que si un responsable est identifié », appliquer, enregistrer. Retour Workflows, ouvrir et relire. Exécuter, saisir la demande fictive, lancer dans le terminal. Retour Modèles → Modifier le modèle de meeting pour consulter la référence.

**Observé.** Révision 2 enregistrée ; consigne corrigée et trois critères présents après réouverture : impact décrit, responsable identifié, prochaine action explicitée. Original meeting observé avec ses trois libellés et révision 1. Demande dans « SUIVI · QUALIFICATION SUPPORT INTERNE A », projet A, trois étapes adaptées. Stub arrêté et état « À configurer » avec explication du modèle manquant.

**Verdict.** Reçu pour adaptation, récupération, persistance et rattachement. La cohérence du langage naturel est vérifiée humainement, aucun rejet automatique de la contradiction n'est attendu. Ordre hérité conservé : collecte → décision → synthèse. Essai métier non joué par les agents.

**Preuves.** [A01 contradiction](captures/support-interne-a-01-adaptation-contradiction.png), [A02 correction rouverte](captures/support-interne-a-02-correction-rouverte.png), [A03 premier essai](captures/support-interne-a-03-premier-essai.png), `observations-A.txt` pour l'original.

### B — Support partagé vers accès aux outils d'un projet

**Attendu.** Comprendre la référence commune et produire « Accès outils B » uniquement dans B ; récupérer un mauvais choix de portée et distinguer clairement origine/copie.

**Actions.** Ouvrir Support → Modifier le modèle, examiner Paramètres, appliquer sans modifier les valeurs, quitter vers Workflows puis Modèles. Constater deux cartes de même titre. Utiliser la copie, corriger la destination proposée « Sans projet » vers « Accueil nouveaux arrivants B », créer « Accès outils B ». Adapter la collecte aux accès ; ajouter « Valider les accès B », critères demandeur identifié/outils listés/approbateur nommé. Enregistrer, rouvrir, relire ; relier la réponse normale à cette validation, enregistrer ; lancer une demande fictive.

**Observé.** Variante de sept blocs enregistrée et retrouvée dans B, critères et consigne conservés ; lien vers la nouvelle décision conservé au premier essai (huit liens). Le suivi montre « ACCÈS OUTILS B », projet B et stub arrêté. « Modifier le modèle » a produit une deuxième référence partagée de même nom avant adaptation, sans annonce claire de copie dans les cartes ; retour au catalogue réinitialise Destination à Sans projet. La référence intégrée conserve son titre et ses six blocs dans le catalogue.

**Verdict.** Reçu pour destination corrigée avant création, variante locale et persistance. **Partiel/refusé pour identification origine/copie et nettoyage du mauvais choix partagé** : aucune suppression de cette copie partagée n'a été réalisée. Aucun déplacement d'une variante déjà enregistrée n'est qualifié. Les autres branches de support n'ont pas toutes été réécrites : premier essai d'une adaptation, pas qualification d'un workflow complet d'accès.

**Preuves.** [B01 destination Sans projet](captures/acces-outils-b-01-modele-partage-copie.png) ; le doublon hors écran est documenté par le texte/DOM visible lors de la sélection, [B02 variante rouverte](captures/acces-outils-b-02-variante-locale-rouverte.png), [B03 essai avec sept blocs/huit liens](captures/acces-outils-b-03-premier-essai.png), `observations-B.txt`.

### C — Simplifier un traitement de demande pour une clôture

**Attendu.** Supprimer une étape inutile, conserver collecte/synthèse puis accord humain, et récupérer une dépendance supprimée avec l'aide visible du produit.

**Actions.** Utiliser « Demande ponctuelle » comme traitement de dossier de départ, créer « Clôture comité C ». Adapter le premier bloc à la collecte et synthèse de décisions/responsables/échéances. Supprimer volontairement le bloc central « Effectuer le travail demandé », qui produit `result` pour « Examiner le résultat ». Enregistrer et ouvrir Exécuter pour rechercher un avertissement. Fermer le lancement ; renommer la décision, adapter la question/critère, retirer son entrée `result` devenue inutile par le bouton Retirer ; créer le lien collecte → validation. Enregistrer, quitter et rouvrir. Lancer les notes fictives du comité. Fermer puis relancer l'application pour retrouver la demande.

**Observé.** La suppression retire les deux liens et laisse `result` déclaré dans la décision. La révision 2 avec deux blocs/zéro lien s'enregistre ; Exécuter propose un lancement normal sans avertissement de dépendance. Réparation possible entièrement par l'éditeur : révision 3, deux blocs/un lien, question et critère « chaque décision a un responsable et une échéance » présents. Après relance complète, l'Activité retrouve la demande du comité et l'associe explicitement à Clôture comité C, Rév. 3, À configurer.

**Verdict.** Reçu pour simplification, correction manuelle et persistance jusque relance. **Refusé pour aide à l'erreur** : le produit laisse enregistrer une validation déconnectée sans expliquer son entrée non alimentée. Le contrôle d'une décision effectivement présentée sans résultat n'a pas été joué ; ne pas conclure à un accord moteur obtenu ni à une publication. Réordonnancement logique réalisé par suppression puis connexion ; aucun déplacement par glisser-déposer qualifié.

**Preuves.** [C01 dépendance avant suppression](captures/cloture-comite-c-01-bloc-requis-avant-suppression.png), [C02 lancement accepté avec zéro lien](captures/cloture-comite-c-02-suppression-acceptee.png), [C03 demande retrouvée après relance](captures/cloture-comite-c-03-premier-essai-corrige.png), `observations-C.txt`.

### D — Révision et version conservée

**Attendu.** Une adaptation de livraison avec preuves ; savoir ce que la sortie avant sauvegarde conserve ; corriger un défaut de saisie et lancer la version finale.

**Actions.** Support → Utiliser → « Réception prestataire D », projet D. Adapter collecte aux livrables ; ajouter « Vérifier les preuves », document daté/validation du responsable ; connecter après la réponse normale. Enregistrer et rouvrir. Ajouter « réception signée », appliquer puis sortir vers Workflows sans cliquer Enregistrer. Rouvrir et relire. Essayer un nom de bloc vide, appliquer ; aucun rejet explicite. Restaurer le nom ; utiliser alors la contradiction « Accepter la livraison même sans document daté », puis corriger la question et conserver les trois critères. Enregistrer, rouvrir, relire et lancer une demande synthétique.

**Observé.** Critères initiaux puis troisième critère présents. La sortie après Appliquer crée automatiquement une nouvelle version : révision 3 enregistrée au retour, sans dialogue ni annonce préalable observée (écoute des dialogues sans événement). Aucun texte d'erreur pour le nom vide ; le libellé du graphe garde le nom existant. Correction finale conservée : question documents datés/validation du responsable/réception signée et les trois critères. Demande dans SUIVI · RÉCEPTION PRESTATAIRE D, sept blocs/huit liens, stub arrêté et modèle à configurer.

**Verdict.** Reçu pour conservation des modifications et récupération de la contradiction. Réserve UX sur l'enregistrement automatique lors de navigation, alors que l'éditeur indiquait « Modifications non enregistrées ». Aucun rejet de nom vide inventé : cette branche ne qualifie pas une contrainte de champ obligatoire. Les autres branches support restent celles du modèle initial.

**Preuves.** [D01 réouverture](captures/reception-prestataire-d-01-version-rouverte.png), [D02 contradiction récupérable](captures/reception-prestataire-d-02-incoherence-recuperable.png), [D03 premier essai final](captures/reception-prestataire-d-03-premier-essai-final.png), `observations-D.txt`.

## Constats et propositions simples

| ID | Reproduction et observé | Gravité / classification | Proposition |
|---|---|---|---|
| C2-01 | B : Modifier le modèle intégré → retour catalogue : deuxième modèle même titre, cartes sans indicateur d'origine/copie. Destination revient à Sans projet. | Moyenne, UX : risque de choisir/adopter le mauvais périmètre. Pas de référence intégrée modifiée prouvée. | Dire « Créer une copie du modèle », suffixer le nom proposé et afficher Intégré / Personnel / Projet sur chaque carte. Conserver la destination du projet. |
| C2-02 | C : supprimer producteur de result → décision avec entrée result sans lien → Enregistrer accepte → Exécuter propose le lancement normal. | Moyenne, manque de guidage/validation de conception. Risque métier de validation privée de résultat. Aucun accord abusif exécuté. | Avertir des étapes désormais indépendantes et des entrées non reliées ; proposer Relier, Retirer l'entrée ou Annuler la suppression. |
| C2-03 | D : modifier critère → Appliquer → sortie Workflows sans Enregistrer → réouverture, critère présent et nouvelle révision enregistrée. | Moyenne, UX : version publiée localement difficile à anticiper. Aucune perte observée. | Annoncer « Les modifications seront enregistrées en quittant » ou proposer Enregistrer / Abandonner / Rester. Harmoniser avec le statut du bandeau. |
| C2-04 | A/B/D : modèle avec agents non configurés → premier essai ouvre terminal et suivi À configurer ; le texte explique ensuite le modèle manquant. | Faible, UX ; limite du banc également. Le lancement natif peut intentionnellement continuer sans agent de bloc. | Afficher dès la copie le nombre de blocs dont l'IA reste à configurer et distinguer démarrage de conversation / exécution des blocs. |

## Diagnostic ciblé après observations

Seul backend du paquet consulté, après C02 : `resources/backend/workflow_engine/contracts.py:67` valide types, ports des connexions existantes et absence de cycle. Il n'impose pas que chaque entrée déclarée ait un producteur ou que les blocs restent reliés. `engine.py:285` traite les blocs sans connexion entrante comme des racines ; une décision racine peut devenir en attente avec des entrées vides (`engine.py:337`). Cela explique l'absence de rejet de conception. C'est une lecture ciblée, pas une reproduction d'exécution ni une preuve d'accord contourné. Aucun code renderer/source de travail, aucun rapport d'un autre testeur consulté.

## Limites, réception et nettoyage

- Reçu : copies A/B/C/D identifiables dans leurs projets, édition des champs/critères, ajout de validation, connexions, suppression, corrections, sauvegarde/réouverture ; premier essai rattaché aux quatre adaptations. C vérifié aussi après fermeture de l'application.
- Refusé : guidage de la dépendance supprimée C ; identification claire de la copie partagée B. Réception complète du parcours B non acquise.
- Non joué : retrait de la copie partagée B, glisser-déposer, lancement automatique des agents de blocs, accord humain effectivement exercé sur résultat, import d'un dépôt existant, toutes les branches métier, modèle commercial, publication/service externe.
- Aucun build, changement produit, commit, suite globale ou état forcé. Deux timeouts initiaux d'automatisation ont nécessité une relance de A ; ils ne sont pas présentés comme bugs du produit. Les sélections natives initiales n'ont pas prouvé le rattachement des dossiers externes.
- Applications de recette fermées. Les quatre brokers PTY propres au testeur ont été arrêtés séparément ; contrôle final sans processus portant nos quatre répertoires temporaires. Stubs inertes non persistants. Serveur X `:182` laissé en place. Paquet inchangé.

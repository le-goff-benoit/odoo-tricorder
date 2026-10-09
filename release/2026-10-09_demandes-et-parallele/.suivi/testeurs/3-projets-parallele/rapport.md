# Avis indépendant 3/5 — pilotage multi-demandes, parallélisme et projets

**Verdict : REFUSÉ sur le parcours complet demandé.** Le suivi des quatre demandes et la vérité des agents fonctionnent dans les scénarios joués. La création graphique d’un bilan qui attend plusieurs demandes reste empêchée ; l’admissibilité annoncée des demandes manque de précision.

Persona : chef de projet, métier 9/10, technique 3/10. Paquet Electron `0.6.0-rc.12`, ASAR annoncé par le responsable `10b5f192d643fc9f33cffdf3f238bcd24cbf4f69dc5ba77bab7be92cff253237`. Test du 9 octobre 2026. Aucun rapport des autres testeurs lu. Aucun correctif produit, build ou suite globale.

## Réponse à la question essentielle

**Oui, R1–R4 sont DANS le travail piloté**, dans « Suivi du workflow → Vue d’ensemble ». Ce n’est pas seulement un catalogue d’exécutions. Les quatre textes, les projets Atlas/Boréal, le bloc courant, la question, la décision et l’échec apparaissent ensemble. Un clic ouvre la demande et son bloc ; le retour à Vue d’ensemble conserve le contexte commun.

Le lien demande → projet → agent → bloc se comprend sans logs : sur R2, l’écran affiche « Atlas », « Agent · OpenAI · fixture-parallele », puis « Analyser la demande · En cours ». La preuve locale montre bien un processus `codex exec` **factice**, distinct des conversations terminal. Une conversation terminal ouverte ne produit pas un faux agent de bloc dans la vue d’ensemble.

Le passage du résultat de chaque demande au **résultat d’ensemble** demande encore de construire une demande de consolidation. Cette construction ne permet graphiquement qu’un prédécesseur, alors que les quatre demandes indépendantes doivent être reçues.

## Six scénarios métier exécutés

| Scénario | Actions et résultat | Preuves |
|---|---|---|
| S1 — quatre demandes dans un travail | « Nouvelle demande », modèle Release, demande R1 ; ajout réel des R2, R3 et R4 via « Ajouter une demande… » ; R2 affectée à Atlas, les autres à Boréal. Les quatre figurent dans la vue d’ensemble commune. | `09-vue-ensemble-4-demandes.png`, `11-vrais-processus-4-demandes.png` |
| S2 — quatre états et lancement admissible | Modèle factice choisi en UI avant une nouvelle exécution. Bouton « Lancer les demandes prêtes » : R1 demande une réponse, R2 travaille, R3 reste prête à l’étape suivante, R4 échoue. Second clic : seule R3 démarre ; R1/R2/R4 ne sont pas relancées. R3 arrive à sa décision. | `etat-4-demandes.json`, `processus.json`, `11-vrais-processus-4-demandes.png`, `12-seule-demande-prete-lancee.png` |
| S3 — décision locale et question | R3 → « Examiner la décision » indique explicitement « Décision pour cette demande : R3 ». Approbation réelle en UI : R3 devient prête ; R1 reste en attente de réponse, R2 en cours et R4 en échec. Réponse réelle à la question R1 : R1 devient prête, sans autoriser les autres. | `13-decision-locale-r3.png`, `14-question-r1.png` |
| S4 — même modèle séparément sur deux projets | Workflow Release enregistré dans Atlas ; depuis Boréal, « Nouvelle demande » permet de sélectionner ce workflow et de changer « Projet principal » en Boréal. L’UI annonce l’adaptation dans Boréal ; elle y est enregistrée. Aucun ID ni JSON saisi. | `06-reutilisation-autre-projet.png`, `05-release-lancement.png` |
| S5 — travail qui coordonne deux projets | Au lancement Boréal, ouvrir « Inclure d’autres projets » et cocher Atlas ; ensuite affecter R2 à Atlas dans son formulaire. Le suivi commun affiche « 2 projets », les demandes restent distinctes. Les états de quatre demandes ont réellement évolué par les processus factices lancés depuis l’UI. | `07-coordination-deux-projets.png`, `11-vrais-processus-4-demandes.png` |
| S6 — bilan après toutes les demandes | Tentative réelle d’ajout de R5 consolidation : le formulaire ne permet qu’un prédécesseur. Puis **fixture distincte préparée par API moteur**, avec quatre demandes déjà reçues et R5 dépendante des quatre, pour tester la lecture. L’UI montre les quatre liens « Après », la décision commune R5 et son texte. Approbation R5 réelle en UI ; cinq demandes terminées. Rapport R5 accessible. La construction de cette fixture n’est pas une réussite du formulaire. | `15-consolidation-dependance-unique.png`, `fixture-consolidation.json`, `17-bilan-4-dependances-fixture.png`, `18-decision-commune-r5.png`, `19-ensemble-termine-sans-bilan-direct.png`, `20-rapport-demande-r5.png` |

Les titres et résultats de fixture sont des données de test. Ils n’attestent aucune réalisation client, aucune qualification d’un fournisseur ni aucune livraison.

## A1 — majeur : impossible de faire attendre le bilan après quatre demandes indépendantes en UI

**Objectif utilisateur.** Après R1 texte, R2 images, R3 titre et R4 export, préparer le bilan commun seulement lorsque les quatre résultats ont été reçus.

**Attendu.** Ajouter R5 puis sélectionner R1, R2, R3 et R4 comme prédécesseurs ; voir pourquoi le bilan attend et lesquels restent à recevoir.

**Observé.** « Après la tâche » est un select à choix unique. Sélectionner R2 remplace R1. Le chef de projet ne peut exprimer la jonction des quatre résultats avec ce formulaire. Il pourrait artificiellement séquencer les demandes, ce qui contredirait leur indépendance et leur parallélisme.

**Reproduction.** Dans une conversation contenant les quatre demandes indépendantes, Options → Ajouter une demande… → saisir « Consolider R1, R2, R3 et R4 » → tenter de sélectionner leurs quatre dépendances. Seule une valeur est possible. `multiple=false` observé sur le contrôle.

**Preuve.** `15-consolidation-dependance-unique.png`. La contre-épreuve moteur est `fixture-consolidation.json` : quatre dépendances acceptées par son API et toutes présentées correctement en UI (`17-bilan-4-dependances-fixture.png`).

**Cause établie après observation UI.** `src/studio.js:959` construit un select simple ; `src/studio.js:1053` transforme sa valeur en tableau d’un seul élément. `backend/workflow_engine/conversations.py:91` accepte déjà une liste de dépendances. La limitation se situe dans la saisie graphique.

**Proposition simple.** « Après les demandes » avec sélection de plusieurs demandes, recherche par texte/projet et récapitulatif des choix avant enregistrement.

**Régressions nécessaires.** R5 avec quatre dépendances cross-projet ; trois reçues/une en échec → R5 reste bloquée ; dernière reçue → R5 devient admissible ; modifier la sélection ne fait pas perdre les autres choix ; une décision R5 ne remplace pas les décisions locales R1–R4.

## A2 — majeur : « prête » ne dit pas si le bouton peut réellement lancer la demande

**Objectif utilisateur.** Lancer en une action les demandes admissibles et comprendre celles qui nécessitent une configuration.

**Attendu.** La vue distingue demandes prêtes à être exécutées par ce bouton, demandes nécessitant une configuration et travail à poursuivre dans le terminal ; une action permet de résoudre le blocage.

**Observé, cas 1.** Le lancement normal dans le terminal accepte le modèle Release sans modèle explicite. Les quatre demandes affichent « Prête ». « Lancer les demandes prêtes » retourne « 0 étape lancée · 4 demandes en attente », modèle à définir explicitement. La vue ne donne aucune action pour choisir le modèle des exécutions figées. Revenir à l’éditeur et choisir l’IA enregistre une nouvelle révision ; les anciennes demandes gardent leur version. J’ai créé une nouvelle exécution pour poursuivre.

**Observé, cas 2.** Après une vraie décision locale R3 approuvée, « Réaliser le périmètre accepté » affiche « Prête ». Le même bouton la laisse en attente : capacité `edit` indisponible en mode délégué, poursuivre dans la conversation native. Le message est honnête, mais le mot « prête » et l’action globale font attendre un départ possible.

**Reproduction.** Nouveau projet → Nouvelle demande → modèle Release → Lancer dans le terminal sans modèle explicite → ajouter des demandes → Vue d’ensemble → Lancer les demandes prêtes. Variante : choisir un modèle avant une nouvelle exécution, faire parvenir R3 à « Valider le plan », approuver, relancer depuis la vue d’ensemble.

**Preuves.** `10-lancement-demandes-admissibles.png` pour la configuration manquante ; `ui-deux-agents.txt` et `16-deux-etapes-paralleles.png` pour la capacité d’édition indisponible.

**Cause établie.** Le contrôle d’admissibilité du bouton est effectué à son lancement (`backend/workflow_engine/runtime.py:237`). La vue construit son action à partir des états des demandes et propose le bouton dès que la page contient des demandes (`src/conversation-view.mjs:71`). « ready » du bloc et compatibilité de son exécutant délégué sont deux informations différentes ; cette distinction n’est pas présentée avant le clic.

**Proposition simple.** Afficher « À configurer », « À poursuivre dans le terminal » ou « Prête au lancement » avec l’action correspondante. Dans le bouton global, compter les étapes réellement admissibles ; garder le détail honnête des autres attentes.

**Régressions nécessaires.** Workflow natif sans modèle explicite ; workflow éditable natif avec capacité absente du mode délégué ; sélection mixte question/cours/admissible/échec ; aucune relance implicite d’un travail en cours et aucune modification silencieuse d’une version figée.

## A3 — moyen : le résultat d’ensemble reste à rechercher dans une demande

**Objectif utilisateur.** Savoir si tous les résultats sont réunis et lire le bilan commun à la fin du travail.

**Attendu.** Depuis la vue d’ensemble terminée, accéder clairement au résultat d’ensemble et aux demandes qu’il consolide.

**Observé.** Avec la fixture terminée, la vue affiche « 5 terminées », les cinq demandes et leurs liens « Voir le rapport ». Elle ne met pas en avant le bilan R5 comme résultat d’ensemble. Il faut connaître son titre et ouvrir son rapport. Le rapport R5 conserve bien la synthèse et la décision, mais les résultats R1–R4 ne sont pas eux-mêmes réunis dans ce rapport : la synthèse est le texte fourni à R5. Une conversation reste ouverte après les cinq résultats terminés ; aucun résultat parent distinct n’a été observé.

**Preuves.** `19-ensemble-termine-sans-bilan-direct.png`, `20-rapport-demande-r5.png`, `ui-final-ensemble.txt`, `ui-rapport-r5.txt`.

**Cause établie.** La vue d’ensemble présente les cartes de demandes et les dépendances (`src/conversation-view.mjs:74`). Aucun résultat d’ensemble n’apparaît dans le rendu observé. La possibilité d’un résultat commun implicite dans un autre parcours natif n’est pas démontrée par ce test.

**Proposition simple.** Identifier une demande comme consolidation, proposer « Lire le bilan commun » dans l’en-tête et y joindre les liens vers les résultats source ainsi que leurs réserves.

**Régressions nécessaires.** Bilan complet, bilan avec une demande en échec ou non reçue, deux projets, demande terminée sans consolidation ; ne jamais assimiler « toutes terminées » à « tous résultats reçus sans réserve ».

## Réussites et limites utiles

- Les textes des demandes, les quatre états, les projets et le bloc courant restent lisibles dans un même travail.
- Le bouton respecte la question, le travail déjà en cours, la décision et l’échec ; il ne les traite pas comme une autorisation générale.
- La décision locale nomme sa demande et sa tentative. La décision de consolidation nomme R5 ; son résultat peut décrire les deux projets. Les quatre décisions antérieures restent conservées.
- Réutiliser le workflow dans un autre projet et inclure un projet au lancement ne demandent aucun ID/JSON.
- Un agent de bloc actif réellement affiché a été confronté au processus local factice correspondant et aux workers du moteur (`etat-4-demandes.json`, `processus.json`). Le passage à deux étapes simultanées est observé dans `ui-deux-agents.txt` ; le relevé de processus ultérieur `processus-paralleles.json` arrive après la fin de la courte R1 et ne prouve à lui seul qu’un processus encore actif. Je ne le présente pas comme deux PID simultanés vérifiés.
- Aucun comportement de fournisseur réel, hook fournisseur, édition de code, commande métier, publication, production ou livraison n’est qualifié.
- Les workflows natifs Odoo avec pack optionnel, la pagination >25 demandes et les limites de concurrence à quatre blocs n’ont pas été testés dans cet axe.

## Environnement, adaptations et incident du harness

L’interface a été observée avant les sources. Les lectures de code sont intervenues pour les helpers d’isolation puis pour localiser les causes de constats déjà établis. Aucun utilisateur n’a saisi un ID/JSON pour les actions qualifiées ; les IDs utilisés dans les scripts appartiennent seulement aux fixtures/proofs API.

DISPLAY `:183`, XAUTHORITY `/tmp/tricorder-functional-display/auth-183` fournis par le responsable ; serveur X laissé intact. Viewport explicite 1440×1000. Racine synthétique `/tmp/tricorder-functional-parallele-sandbox/` : HOME `home`, XDG config/data/cache/runtime isolés, état `state`, TRICORDER_HOME `tricorder-home`, runtime final `runtime-safe`, CODEX_HOME `codex-home`, CLAUDE_CONFIG_DIR `claude-home`. `PYTHONDONTWRITEBYTECODE=1`. Stubs locaux dans `bin`, PATH factice placé en premier, TRICORDER_TEST_MODE=1 et clés d’API retirées de l’environnement transmis pour la reprise sûre.

**Sélecteur système.** Le sélecteur de dossier natif n’a pas été qualifié sur ce serveur X. Avec accord explicite du responsable, seule sa réponse a été remplacée par le chemin du dépôt Git synthétique, puis le handler original restauré. Les noms des projets, clics d’enregistrement et validations moteur ont été réels. Aucun état métier injecté par ce helper.

**Lecture DOM initiale.** `body.innerText` donnait le panneau vide ; le screenshot prouvait qu’il était rempli dans un shadowRoot. Le blocage annoncé provisoirement a été retiré immédiatement après la contre-épreuve. Ce n’est pas une anomalie produit.

**Incident PATH/broker.** La première ouverture a démarré un broker PTY avec le PATH initial. Après arrêt de la fenêtre, le broker détaché a été réadopté et gardait cet ancien PATH lors d’une reprise avec stubs. Le vrai Codex installé a donc affiché son accueil. Je l’ai arrêté dès la constatation, puis arrêté uniquement mes trois processus avec cwd synthétique et mon broker identifié par son socket. Aucun compte réel n’a été lu. Le prompt initial peut être transmis sans saisie clavier : **absence d’appel, d’accès et de facturation non établie** pour cet incident ; les preuves locales ne permettent pas de les qualifier. Cet incident interdit de déclarer toute la session « fournisseur exclusivement factice ».

La reprise utilise un runtime neuf, les stubs avant la première ouverture et l’environnement isolé précisé plus haut. Preuve préalable depuis le terminal UI : `command -v codex` retourne le faux chemin absolu, `codex --version` affiche `codex-cli fixture-parallele-1`. Ensuite l’accueil natif montre « AGENT LOCAL FACTICE » et son PID. Toutes les évolutions R1–R4 qualifiées après cette reprise proviennent de ces stubs ; aucune facturation de ces stubs n’est possible.

La fixture S6 passe uniquement par Engine/Conversations, avec sorties et décisions d’état initial explicitement synthétiques ; aucune SQLite/JSON d’état n’a été retouchée. Deux erreurs de préparation ont laissé une conversation de fixture supplémentaire avec une demande en échec, visible dans le catalogue. Le scénario reçu et capturé est la conversation `c4f8a230b1d20453c` ; les erreurs de fixture ne sont pas des défauts produit. La décision finale R5 a été prise par clic UI réel.

Empreinte ASAR relue en fin de test : identique à celle du responsable. La preuve `etat-final-5-demandes.json` contient les cinq résultats terminés avant nettoyage. Fenêtre fermée, exécutions synthétiques encore ouvertes annulées par Engine, stubs et broker de mon runtime arrêtés ; détails dans `nettoyage.json`. Les résultats reçus restent conservés. Aucun serveur X ni processus d’un autre testeur arrêté.


## Contrôle documentaire des seules preuves collectées

Les 20 captures initiales et les 11 fichiers texte/JSON/Markdown ont été contrôlés, sans ouvrir de compte ni de journal utilisateur. Aucun email, identité de compte fournisseur, jeton, contenu de session personnelle ou résultat réel de fournisseur n’a été observé dans les preuves conservées. Les captures terminal conservées présentent les projets synthétiques et le marqueur AGENT LOCAL FACTICE ; le prompt du système Ubuntu et les chemins locaux ne sont pas des comptes fournisseur.

La capture `08-terminal-multidemandes.png` présentait uniquement l’accueil générique non connecté du vrai CLI et ses choix de connexion. Elle ne contenait ni compte ni secret, mais constitue une sortie réelle non synthétique : son original intégral a été déplacé sous `/tmp/tricorder-functional-parallele-private-audit/`, hors du dossier publiable. Aucune image n’a été recadrée ni modifiée. Le dossier conserve 19 captures. Aucun critère métier ne dépend de cette capture retirée ; l’incident et les limites d’appel/facturation restent explicitement consignés ci-dessus.

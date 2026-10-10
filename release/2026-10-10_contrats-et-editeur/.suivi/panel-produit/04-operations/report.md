# Persona 4/6 — Responsable opérations d’une PME

**Verdict : utilisable pour dessiner et suivre une méthode générale avec assistance initiale. L’automatisation des services externes n’est pas autonome pour ce profil peu technique.** Aucun bug bloquant confirmé dans les deux parcours essayés.

Je gère l’accueil de nouveaux clients et les comptes rendus. Je veux une méthode réutilisable, savoir quand répondre ou approuver, et préparer un message sans coder.

## Banc et honnêteté des preuves

- Application réellement lancée via Playwright Electron : paquet immuable `build-artifacts/linux-unpacked/odoo-tricorder`, interface « À propos v0.6.0-rc.13 ». Paquet exécuté directement, pas `npm start`, pas build ni suite complète.
- README lu avant l’interface ; seuls `tests/workflow-v2.spec.cjs` et `tests/terminal-fixture.cjs` consultés pour le harness. Aucun rapport d’autre testeur consulté ; aucun code du produit modifié.
- HOME, XDG, userData, agents, runtime et état sous `04-operations/isolated/`, aucun projet/client réel. Affichage Xvfb partagé :187 conservé. Fournisseurs `codex`/`claude` remplacés par des scripts locaux affichant **FOURNISSEUR SYNTHETIQUE OPERATIONS — aucune IA réelle** puis exit 78. Cela vérifie le terminal, pas l’authentification ou la compétence d’une IA.
- Les deux exécutions métier utilisent le bouton GUI **Simuler le parcours**. Aucune IA réelle, messagerie, notification, OAuth ou publication exécutée. Le mode test neutralise les vérifications de mise à jour ; aucun appel réseau métier demandé.
- Création projet, définition, conversion, liens, question, décisions et action facultative réalisés **entièrement dans la GUI**. Aucun seed ni mutation par API/Python. Trois lectures `run.get` ont seulement exporté les états finaux comme preuves. Une tentative de lecture `project.list` a été refusée ; sans effet sur le setup.
- Première tentative de harness lancée sans TTY : stdin fermé, arrêt ciblé de ses deux processus avant relance avec TTY. Les timeouts de locators pendant l’exploration ont été corrigés en consultant les libellés/actions réels ; ils ne constituent pas des bugs produit.
- SHA256 exécutable : `9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3` ; app.asar : `f2a09d9362ffb8123af496783042f7b7c567f8c5ea57180f1430bb275f0fbfca`.

## Scénario 1 — Créer ma méthode d’onboarding et l’utiliser

**Attendu.** Créer un espace client fictif sans préparation de dépôt, adapter une méthode en français, lancer une demande, relire les résultats, décider et retrouver le bilan.

**Actions réalisées.** Projets → Nouveau projet → « Client fictif Acacia - onboarding », choix « Nouvel espace local ». Créer un workflow → modèle « De la demande au résultat » → « Onboarding client - méthode opérations ». Dans l’éditeur, adaptation des trois tâches : « Comprendre le nouveau client », « Préparer le parcours d’accueil », « Vérifier les points d’accueil », avec consignes d’interlocuteur/date/checklist/responsables. Adaptation du document final « Rédiger le compte rendu d’accueil » et de son contenu. Enregistrement puis Exécuter… → demande fictive → Simuler le parcours. Validation des trois résultats, approbation de la décision « Valider la suite », validation du document.

**Observé.** Projet et méthode créés sans JSON ni manipulation de Git. Le graphe conserve ses liens et ses deux branches. La première étape exige de cocher son critère et de renseigner un commentaire ; les validations suivantes n’ont pas de critère obligatoire, commentaire facultatif. La jonction s’achève sans intervention. La décision propose « Approuver la suite / Refuser la suite ». Le parcours arrive à **Terminée · 6/6 étapes** ; Activité permet de retrouver cette demande.

**Preuves.** `04-projet-cree.png`, `05-methode-modele.png`, `07-onboarding-configure.png`, `09-resultat-a-valider.png`, `11-decision.png`, `12-onboarding-termine.png`, `25-activite-terminee.png`, `run-first.json`. Le dernier export confirme `status=completed`, simulation=true.

**Contournement explicite.** Le modèle général commence avec un vocabulaire de réalisation/tests. Je l’ai renommé et j’ai adapté ses consignes. Les résultats de simulation restent ceux des exemples du modèle : par exemple « Proposition de réalisation préparée. Aucun code de projet n’a été modifié ». Je n’ai donc pas assimilé ces sorties à un onboarding réalisé ou à un compte rendu généré par IA. Les valeurs d’exemple peuvent être changées par « Données de simulation… », non essayé ici.

## Scénario 2 — Répondre, approuver puis activer un brouillon facultatif

**Attendu.** Demander une précision, conserver la réponse, attendre une validation, proposer un brouillon séparément et expliquer la différence avec notification ou brouillon distant.

**Actions réalisées.** Revenir à l’éditeur via Options. Conversion explicite en données structurées. Ajouter « Décision · Question ouverte » → « Confirmer la date d’accueil » ; saisir « Quelle date retenons-nous pour accueillir Acacia ? ». Relier cette question à la première tâche, avec « ordre d’exécution uniquement ». Sur le document final, ajouter une action facultative : modèle « Un document à préparer », nom « Préparer le message de bienvenue », travail « Brouillon local de bienvenue Acacia », contenu fictif de bienvenue. Enregistrer et lancer une seconde simulation. Répondre « Le 20 octobre à 10 h, contact Julie. ». Valider les résultats, approuver la suite, valider le compte rendu. Ouvrir Actions facultatives, cliquer Activer cette action…, confirmer, examiner l’action et valider son résultat simulé. Revenir au résultat principal.

**Observé.** Le bandeau affiche **Réponse attendue**, avec bouton « Répondre à la question ». La réponse est consultable ensuite dans Résultat / Réponse. La suite attend bien la question. L’action se présente **À activer** après la fin du résultat principal. Son activation est une décision distincte ; le workflow associé ouvre son propre suivi avec « Revenir au résultat principal ». À la fin : principal **Terminée · 7/7**, action facultative **Terminée**, et trois exécutions terminées dans Activité.

**Notification et brouillon distant.** Connexions indique Gmail/Outlook/Slack « À configurer » et distingue installation de plugins terminal et connecteurs du runtime. « Configurer une connexion… » ouvre des instructions, pas une connexion OAuth : **un adaptateur local compatible doit être installé et connecté** ; l’agent doit préparer `.tricorder/plugins.json` via terminal, puis vérification. Cette GUI explique honnêtement la limite. Je n’ai ni simulé un faux adaptateur comme réel, ni tenté un envoi. La capacité à recevoir une notification réelle ou à créer un brouillon dans une messagerie demeure **non démontrée et indisponible dans ce banc**.

**Preuves.** `13-action-facultative-dialogue.png`, `15-question-detail.png`, `17-seconde-decision.png`, `18-activer-action.png`, `20-brouillon-action.png`, `24-configuration-connexion.png`, `25-activite-terminee.png`, `26-principal-et-action-termines.png`. `run-second.json` confirme question complétée, réponse conservée, principal completed et associated.counts.completed=1 ; `run-optional.json` confirme le sous-workflow completed. `23-terminal-synthetique.png` montre le fournisseur local de simulation dans le vrai terminal intégré.

**Limite sur les données.** Le lien de la question est volontairement un ordre seulement : il ne transmet pas automatiquement la réponse à une entrée du bloc suivant. La conservation et le blocage ont été vérifiés, pas l’utilisation sémantique de cette date par une IA réelle.

## Classement et recommandations

| Classe | Constat fondé sur preuve | Conséquence opérations | Recommandation simple |
|---|---|---|---|
| Capacité manquante pour ce profil — majeure | Connexions renvoie à un adaptateur local et une configuration terminal ; absence de formulaire OAuth annoncée (`24-configuration-connexion.png`). | Je peux dessiner « notifier » mais j’ai besoin d’une aide technique pour qu’un service réel fonctionne. | Proposer un assistant de connexion guidé pour quelques services pris en charge ; afficher « document local seulement » tant que l’opération distante n’est pas vérifiée. |
| Friction — moyenne | Modèle « De la demande au résultat » expose réalisation, tests, QA de code et sorties de simulation logicielles (`05`, `06`, `09`). | « Général » paraît encore pensé pour le développement ; il faut comprendre et adapter des concepts avant l’onboarding. | Ajouter un modèle « Accueil client » ou « Préparer et faire relire un document » avec trois blocs et résultats d’exemple métier. |
| Friction — moyenne | Après création depuis un modèle ancien, une conversion explicite est nécessaire pour disposer des actions facultatives (`Données structurées…`). | Une fonctionnalité annoncée dans le README n’apparaît pas immédiatement dans les propriétés du document. | Créer les nouveaux workflows au format structuré ou rendre l’action visible avec conversion guidée au moment du besoin. |
| Friction — faible | Chaque résultat manuel nécessite une validation distincte ; seul le premier impose critère + commentaire (`09`, `11`). | Pour une petite checklist, cette méthode à six blocs semble lourde. | Fournir un modèle court avec un seul point de relecture ; conserver les validations détaillées quand le besoin les justifie. |
| Bon fonctionnement | Question, réponse persistée, accord explicite, résultat principal et action séparés (`15`, `18`, `26`). | Je comprends ce qui attend mon intervention et ce qui est terminé. | Conserver ces distinctions et ces actions concrètes. |
| Bon fonctionnement | Projet local et personnalisation GUI sans JSON (`04`, `07`). | Pas de prérequis de dépôt ni de développement pour commencer. | Garder ce chemin visible pour les utilisateurs métier. |

Aucun défaut fonctionnel reproductible établi dans ce périmètre. Le point majeur est une capacité d’intégration encore dépendante d’assistance technique, et non un envoi qui aurait prétendu réussir.

## Limites et fichiers

Le test valide conception, transitions et lisibilité à 1440×1000, pas qualité d’IA, génération métier réelle, envoi, OAuth, planification, export/import ou petits écrans. Le shell intégré a été ouvert et a exécuté uniquement `codex --version` vers le script inerte. Les résultats de simulation génériques ne prouvent pas la production d’un fichier métier ou d’un brouillon dans une messagerie.

`harness.cjs` contient le lancement isolé et le contrôle interactif. `trace.zip` conserve actions Playwright, captures et snapshots. `run-*.json` sont des lectures de preuve de l’instance packagée. La reproduction GUI suit les étapes décrites ci-dessus. Fermeture Electron et cleanupBroker terminés ; état temporaire propriétaire supprimé après export des preuves. Aucun processus du banc ne reste actif ; serveur Xvfb partagé conservé.

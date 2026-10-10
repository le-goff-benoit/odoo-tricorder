# Persona chef d’équipe services — rc.16

Candidat : `/tmp/tricorder-rc16-final`, 10 octobre 2026. Agent jouant le rôle d’un chef d’équipe, pas participant humain. Parcours Electron/Playwright sur affichage X isolé, HOME vierge, Codex/Claude remplacés par exécutants inertes. Les deux lancements utilisent **Simuler le parcours**. Aucun fournisseur ni service métier réel appelé ; aucune qualification Gmail/Odoo ni qualité du diagnostic IA démontrée.

## Intention 1 : répondre à un ticket sans confondre nature et urgence

Je veux traiter un export qui ne produit aucun fichier, pour une gestionnaire avec un contournement manuel et une échéance demain. Je pars de **Workflows → Nouvelle demande**, recherche « support », choisis **Support — diagnostic et réponse**, puis Continuer. Le filtre conserve deux propositions pertinentes : je dois donc lire le nom, mais je trouve celle recherchée.

Le formulaire fournit maintenant des repères concrets : faits et exemple du problème, personnes touchées, travail bloqué, contournement et échéance. Je peux choisir **Texte pour un ticket Odoo** sans connaître un identifiant technique. Je n’ai plus à deviner le sens de « Request » ou à choisir si le ticket est un « bug normal ». La formulation **Sans urgence établie** du parcours décrit bien l’urgence, pas la nature de la demande.

Hésitation vécue : après avoir décrit les faits et l’impact, le champ **Quelle demande souhaitez-vous traiter ?** me paraît répéter une partie de la saisie. Je le remplis par une instruction courte (« Qualifier le problème d’export et préparer une réponse au ticket »). L’aide des faits autorise à les décrire dans la demande, ce qui évite le blocage ; la différence pourrait être plus immédiate avec **Objectif ou consigne complémentaire (facultatif)** quand le modèle possède déjà son formulaire. À 1440 × 1000, les boutons de lancement sont sous le pli ; le défilement est perceptible mais ajoute une manipulation.

Le lancement termine en simulation, avec durée totale visible (3 secondes lors du parcours observé), 8 étapes dont 4 non applicables. Le bandeau annonce clairement qu’aucun modèle ni service métier n’a été appelé. **Voir les résultats** donne un livrable final et **Copier le texte** ; le texte lui-même indique qu’aucun email, brouillon Gmail ou ticket Odoo n’a été créé/modifié. Je retrouve donc où récupérer la réponse, sans interpréter la simulation comme un traitement réel.

Captures : `02-formulaire.png`, `03-support-ticket-simulation.png`, `03b-resultats-ticket.png`.

## Intention 2 : préparer une réponse email et vérifier les connexions

Je crée une deuxième demande pour une personnalisation de colonne sans urgence et choisis **Brouillon d’email**. L’aide sous la destination précise **Préparation du texte uniquement. Aucun envoi ni brouillon distant créé par ce choix.** Cette phrase répond à ma question avant le lancement : le choix du canal ne connecte pas Gmail.

Je simule, retrouve les résultats, puis ouvre **Connexions**. Gmail et Slack apparaissent **Service proposé · à configurer**, avec mention de l’absence de connecteur authentifié dans Tricorder et de la différence avec l’installation dans Codex. Codex/Claude sont **Installé · connexion à vérifier**. La seule carte immédiatement « Utilisable » est celle des commandes locales isolées. Je peux donc comprendre ce qui manque sans croire que le catalogue garantit un accès.

Hésitation mineure : l’entête Connexions évoque encore un chemin `.tricorder/plugins.json` et une modification depuis le terminal, alors que le bouton **Configurer une connexion…** est bien présent. Pour un chef d’équipe, je commencerais par ce bouton et considérerais la ligne technique comme une information de maintenance. Cette ligne pourrait être rangée dans un détail avancé ; elle n’a pas empêché de lire l’état des services.

Captures : `04-formulaire-email.png`, `05-support-email-simulation.png`, `05b-resultats-email.png`, `06-connexions.png`.

## Verdict

**Adoption du parcours de préparation et de suivi : oui**, avec les deux frictions de formulaire ci-dessus, non bloquantes. Les états simulation/service proposé sont suffisamment explicites pour ne pas confondre cet essai avec un traitement métier ou un brouillon Gmail réel. L’adoption d’un usage réel de support reste à vérifier avec un fournisseur et un adaptateur authentifiés : cet essai n’en fournit aucune preuve.

Pas de bug bloquant découvert dans ces deux intentions. Recommandations pertinentes : distinguer la consigne complémentaire des faits déjà collectés ; rendre les actions de lancement plus faciles à atteindre sur formulaire long ; reléguer le chemin du catalogue dans les informations avancées.

## Rejeu et erreurs du pilote

`parcours.cjs` conserve le parcours autonome. Rejeu :

```sh
PATH=/tmp/tricorder-xvfb/usr/bin:$PATH xvfb-run -a --server-args='-screen 0 2560x1600x24' node release/2026-10-10_retours-complementaires/.suivi/panel/services/parcours.cjs
```

Le premier essai prenait certaines captures avant la fin de la mise à jour asynchrone : un délai d’observation a été ajouté. Lors de l’ajout de la consultation des résultats, le pilote avait oublié de fermer la fenêtre avant de cliquer la navigation ; il a été corrigé. Ces incidents de script ne sont pas des défauts attribués à l’application. Aucun code métier n’a été consulté pour produire les appréciations ci-dessus ; seul le harnais de test fourni a été utilisé pour isoler le profil et démarrer Electron.

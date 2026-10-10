# Persona 04 — responsable opérations PME

Candidate : `/tmp/tricorder-usage-candidate-a`, interface Electron 1440 × 1000. Tests GUI indépendants, sans lecture des sources applicatives ni rapports des autres personas. Fournisseurs Codex/Claude inertes ; HOME, cache et état du moteur isolés dans `/tmp`. Aucun email, Slack ou fournisseur IA réel. Les résultats de simulation sont déterministes et ne valident aucun traitement métier.

## Attentes avant manipulation

Je veux accueillir un nouveau client : recueillir son nom et ses attentes, préparer un message, retrouver ce message. Je sais décrire le travail mais ne connais ni schéma de données ni identifiant technique. Ensuite je veux préparer le compte rendu de deux réunions de la semaine et voir où répondre si une information manque.

## Parcours 1 — créer depuis zéro

Premier clic : Workflows, puis Modèles. Les trois onglets En cours / Modèles / Historique correspondent à mes intentions. Je trouve Créer un modèle, saisis un nom et une description. J’arrive sur une Première étape de type Tâche. J'interprète cette tâche comme le travail de l'IA et la nomme Préparer le message d’accueil.

« Utilise : demande initiale et contexte » et « Produit » expliquent mieux ce que fait le bloc. J'ajoute le résultat attendu. Là, je quitte le langage de mon besoin : « Décrire une donnée », « Nom (sans espaces) », un type, et un renvoi vers Données structurées. Je voulais écrire « Message d’accueil ». Mon contournement est de fabriquer `message_accueil` et de choisir Texte. Ce n'est pas un choix métier évident.

J’ajoute une question. Le menu présente seize types, dont Agent et Tâche dans la conversation, sans m'aider à comprendre lequel réalise mon travail. Je conserve ma tâche initiale et choisis Question ouverte. « Information à demander » et « Votre réponse » sont compréhensibles. La question utile saisie est : « Quel est le nom du client et quelles sont ses attentes prioritaires ? »

Je veux que cette question précède le message. L'avertissement de bloc indépendant m'aide ; Relier ouvre un formulaire Depuis / Vers. Mais la sortie devient `answer`, alors qu’elle s’appelait Votre réponse dans le bloc, et aucune entrée destinataire n'est disponible. Je choisis l’ordre d’exécution uniquement pour avancer. Je ne sais donc pas si les attentes seront effectivement utilisées. La phrase « Sa réponse est transmise à la suite du workflow » me donnait pourtant cette assurance.

La simulation est accessible depuis Exécuter. La question attendue apparaît clairement en tête ; je clique Répondre à cette question et écris les attentes de l’Atelier Martin. Le suivi passe au résultat à valider, la durée s’affiche avec « attentes comprises », et le résultat est clairement annoncé simulé. Je valide ce résultat simulé : « Terminée », 2/2 étapes, durée totale 4 s. Retour à la liste ramène à la bibliothèque et mon modèle reste présent. Cela vérifie le parcours, pas la pertinence du message ni sa personnalisation. Le bloc conservé est techniquement une Tâche dans la conversation : mon assimilation initiale avec une Tâche IA illustre précisément la confusion de choix ; je ne revendique pas avoir configuré un agent autonome.

## Parcours 2 — deux réunions de la semaine

Intention : partir d’un modèle existant, choisir les deux réunions utiles, obtenir mon compte rendu et mon email sans envoi. Premier clic : Utiliser sur Clôture de réunion. Je m’attends à décrire les réunions ; j’obtiens d’abord Créer un workflow, son nom et son lieu de stockage. Je nomme cette copie « Réunions semaine du 5 octobre », puis découvre l’éditeur. Les trois étapes sont désormais lisibles : choisir les sources, analyser, préparer le compte rendu et l’email. L’analyse est explicitement visible, ce qui répond à une interrogation du retour utilisateur initial.

Exécuter ouvre un champ libre. Il n’y a pas ici de sélection concrète de réunions ni de champs dédiés aux sources : mon contournement consiste à écrire dans la demande les deux réunions, leurs notes et « Ne rien envoyer ». La capture `14-reunion-demande-multiple.png` prouve cette saisie. Le modèle me permet donc d’exprimer le besoin multiple ; cette simulation ne prouve pas que deux réunions externes seront réellement trouvées et confirmées.

Je choisis Simuler le parcours. Après quelques secondes le suivi affiche Terminée, 3/3 étapes, durée totale 4 s, Voir les résultats et Voir le rapport (`15-reunion-simulation.png`). Le panneau encore sélectionné est la première étape : il montre un Atelier fictif et des Notes synthétiques de démonstration, pas mes deux réunions. C’est cohérent avec la simulation explicitement annoncée, mais ne doit jamais servir de preuve métier. Aucune question n’est déclenchée dans ce scénario déterministe ; l’endroit où répondre a réellement été éprouvé dans le premier parcours. La simulation n’atteste donc pas le questionnement spontané d’un fournisseur.

Le retour a été éprouvé entre les deux parcours, de l’exécution Accueil terminée à la liste des modèles. Le bouton Retour est également visible dans l’exécution Réunion. L’ouverture du résultat final et de l’historique de cette seconde exécution n’a pas été poursuivie : la preuve s’arrête à l’état terminé et au premier résultat affiché.

## Constats priorisés

| Priorité | Constat et conséquence | Preuve | Amélioration attendue |
|---|---|---|---|
| P1 | Les phrases Utilise/Produit débordent des cartes et chevauchent les voisines. L'information censée expliquer le workflow rend le graphe moins lisible. | `07-question.png` | Retour à la ligne ou résumé limité dans la carte ; détail complet au clic. |
| P1 | Déclarer un résultat attendu exige un nom sans espaces et un type technique, sans libellé métier séparé. L’auteur non technique hésite avant même de finir deux blocs. | `05-resultat-attendu.png` | Demander le nom lisible du résultat et déduire l’identifiant ; réserver types complexes aux options. |
| P1 | « Réponse transmise à la suite » et formulaire de liaison divergent. La donnée Votre réponse redevient `answer` ; aucune entrée cible n’est créée. Je peux réussir la simulation avec un simple ordre sans comprendre la circulation des informations. | `07-question.png`, `10-simulation-apres-reponse.png`, script de liaison | Proposer « Utiliser la réponse du client pour préparer le message » avec création de l’entrée et liaison explicites ; ne promettre la transmission que si elle est configurée. |
| P2 | Menu de seize types et distinction Agent / Tâche dans la conversation sans indication d’usage. | `06-ajouter-bloc.png` | Quelques catégories orientées besoin ; expliquer le mode d’intervention avant les détails avancés. |
| P2 | Le lancement Réunion propose une demande libre, sans champs dédiés au périmètre multi-réunions et aux sources. Je dois inventer moi-même les informations nécessaires. | `14-reunion-demande-multiple.png` | Demander réunions ou période, sources disponibles et résultat attendu avant lancement. |
| P2 | Utiliser un modèle ouvre un dialogue Créer un workflow avec chemin `.tricorder` et Git. L’utilisateur cherchait à démarrer sa demande, pas à organiser des fichiers. | `12-reunion-demande.png` | Mettre le besoin à saisir au premier plan, détails de stockage dans une explication secondaire. |

## Verdict d’adoption — candidat A

**Adoption partielle : oui pour utiliser un modèle accompagné, non pour une création autonome A à Z sans explication.** Navigation et réponse humaine nettement plus abordables. Je pourrais utiliser un modèle préparé, mais ne confierais pas encore la création autonome A à Z à un responsable opérations sans accompagnement. Une simulation verte ne répond pas à mon incertitude centrale : quelles informations seront réellement prises en compte par l’étape suivante ?

## Rejouer

`node release/2026-10-10_retours-usage/.suivi/personas/04-operations/harness.cjs`

Le script autonome `steps.cjs` pilote exclusivement l’interface, produit les captures et la trace Playwright. Le fournisseur réel reste interdit par construction du PATH de test. `isolation.json` désigne le dernier environnement temporaire. `replay-lines.js` conserve les explorations initiales ; quelques essais de sélecteurs échoués y figurent et ne constituent pas des défauts produit. La première impression de panneau vide provenait du lecteur de DOM qui ignorait le shadow DOM, pas de l’application.

## Réception et périmètre des preuves

Deux vrais parcours GUI effectués ; premier avec création, question saisie, liaison, réponse humaine, résultat simulé validé et retour ; second avec modèle Réunion, demande de deux réunions, simulation jusqu’à 3/3 et durée. Aucun test métier, sélection externe de réunions ou fournisseur n’est qualifié. Les états sont produits par les actions GUI et commandes validées du moteur, sans modification de SQLite/JSON d’exécution.

Le responsable a annoncé des corrections après ces retours (nom naturel des données, lisibilité des cartes, parcours Utiliser, sources Réunion, explication des liens). Ce rapport conserve ses constats du candidat A ; il ne constitue pas une contre-épreuve de ces corrections. Leur réception ciblée appartient au candidat suivant.

# Réception des retours d’usage

Demande : retour utilisateur réel du 10 octobre sur workflows/modèles, navigation,
états, temps, dialogue, modèles IA et compréhension des parcours réunion/support.

## Changements autorisés

- Workflows : En cours / Modèles / Historique ; définitions des projets dans gestion.
- Nouvelle demande : même bibliothèque de modèles, adaptations sur demande explicite.
- Retour visible workflow/release ; conservation du contexte et des terminaux.
- États terminés distincts d’une reprise ; badges détaillés, durée fondée sur événements.
- Questions visibles dans le suivi, données métier et réglages contextuels de l’éditeur.
- Choix IA dans un menu issu des métadonnées locales non secrètes, saisie avancée conservée.
- Réunion : sélection des réunions/sources, analyse, compte rendu/actions/brouillon.
- Support : urgence distincte de nature bug, clarification utile et destination de réponse.

## Panel demandé : six agents personas

Même panel produit que la réception précédente : fondateur SaaS, chef d’équipe
services, développeur senior sceptique, responsable opérations PME, PM B2B,
consultant multi-client. Le mandat porte sur la compréhension à l’usage.

Chaque agent réalise deux parcours en GUI sur données synthétiques isolées et
note, AVANT de rechercher la cause technique : intention, attente, premier clic,
ce qu’il comprend, hésitation/erreur, conséquence et contournement. Il doit chercher
à accomplir une tâche, pas cocher une liste de fonctions. Il critique les choix
produit même si les assertions passent. Pas de lecture des rapports des autres
avant rédaction. Captures et script rejouable requis. Toute injection moteur,
substitution fournisseur et simulation est signalée. Aucun service externe ou
client réel ne peut être déclaré qualifié. Les scripts utilisent les commandes
validées du moteur, jamais une retouche de ses états.

Après rapports : consolidation des constats, correction des défauts confirmés,
contre-épreuve ciblée puis suites complètes npm test, npm run test:ui, npm run dist.
Pas de publication distante demandée.

## Réception locale effectuée

Six rapports initiaux et deux contre-épreuves indépendantes sont consolidés dans
[RECEPTION.md](RECEPTION.md). Les vérifications, reprises et exclusions sont
consignées dans [verifications/result.json](verifications/result.json). Le paquet
rc.14 est construit et vérifié localement ; aucune installation ni publication
distante n’a été effectuée.

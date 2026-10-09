# Pilotage et modèles métier

Le tri Activité tient compte des actions possibles avant pagination : questions, décisions, résultats à examiner, suspensions manuelles et demandes prêtes précèdent les attentes automatiques. Il n’infère aucune urgence métier depuis le titre. Le total global est séparé du nombre affiché dans chaque section. L’ajout de demande est visible dans la vue d’ensemble.

Le compteur distingue étapes traitées et branches non applicables. Un résultat remis mais non reçu ne fait pas progresser le compteur ; un refus traité n’est pas présenté comme une réussite métier. Les simulations ont une date/heure visible dans Activité.

Les nouveaux modèles parlent de réunion/transcription/compte rendu, tout en conservant leurs identifiants et ports. Le Support décrit les critères attendus. La réception technique conserve sa mention « aucun critère métier attesté » : ces attentes ne sont pas un résultat de QA.

## Réception

Deux tests du tri ont d’abord échoué sur les anciennes règles : une question ancienne et un prérequis prêt disparaissaient derrière 27 attentes récentes ; une suspension manuelle passait après une attente automatique. Les trois tests Python ciblés passent après correction, avec état moteur strictement inchangé par les lectures.

La suite unitaire commune passe : 345 Python, 135 JavaScript. Deux parcours GUI ciblés passent : reprise avec budget et résultat lisible ; branche refusée présentant 1 traitée / 1 non applicable. Les trois captures de ces parcours sont conservées ici et ont été inspectées. Bancs synthétiques et fournisseurs inertes uniquement.

La réception finale sur paquet et la relecture indépendante sont consolidées séparément.

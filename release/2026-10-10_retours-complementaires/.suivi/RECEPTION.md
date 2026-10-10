# Réception des retours complémentaires — rc.16

## Périmètre

Retours restants de rc.15, revue du spécialiste configuration puis six agents jouant les personas du mandat [RECETTE-USAGE](../../../docs/RECETTE-USAGE.md). Profils synthétiques isolés, scripts autonomes, aucun projet client modifié. Les commandes et documents locaux ont réellement tourné lorsqu’indiqué ; les parcours support et réunion restent simulés.

## Retours et traitement

| Constat | Traitement et preuve |
|---|---|
| Inspecteur trop chargé, première tâche imposée | Premier bloc au choix, champs essentiels avant critères et données ; parcours fondateur, opérations et sceptique. |
| Formulaire propre à chaque exécution absent | Configuration de cinq types, validations avant création du run, transmission aux prompts/adaptateurs/règles, journal et rapport. Tests `test_launch_fields.py` et `residual-feedback.spec.cjs`. |
| Noms métier remplacés par identifiants | Libellés indépendants des clés de liaison ; noms accentués conservés en édition, suivi et rapport. Parcours produit. |
| Support trop générique | Faits, impact et destination ; consigne complémentaire explicitement facultative. Parcours services. |
| Création/adaptation et listes confuses | Onglet Workflows enregistrés, aide selon destination et recherches des workflows/modèles IA. Parcours consultant. |
| Choix de règles techniques et saisie en double | Valeurs naturelles, pas de true/false imposés en mode personnalisé ; reprise explicite des valeurs du formulaire avec protection des branches liées. |
| Anciennes réponses reprises après lancement réussi | Brouillon consommé après succès, conservé après annulation/erreur. Constat indépendant fondateur et consultant, contre-épreuves dédiées. |
| Décision renommée montrée par son code | Libellé figé conservé dans historique et rapport ; fallback si plusieurs rejets ambigus. Tests de projections et rapport. |
| Planifications difficiles à modifier | Configuration et réponses visibles ; remplacement reprenant les valeurs, correction explicite des valeurs incompatibles. Parcours opérations. |
| Réglage IA sur Document local | Champ Effort IA retiré de l’inspecteur Document. Contre-épreuve fondateur. |
| Formulaire très haut | Configuration plus compacte, textes de saisie raccourcis et bouton de simulation fixé en bas de fenêtre. |
| Connexion installée assimilée à qualifiée | Service proposé / plugin détecté / adaptateur vérifié distingués. Identité, date et opérations annoncées ne valent pas preuve métier. Fichier technique dans un détail avancé. |
| Commentaire de reprise ambigu | Le dialogue précise qu’il ne modifie pas la commande et qu’une nouvelle définition nécessite une nouvelle demande. |
| Paramètre supprimé bloquant l’application | Libellés orphelins nettoyés après suppression par JSON avancé. Test UI dédié. |
| Formulaire enfant impossible à renseigner | Refus dès configuration d’un sous-workflow, traitement par élément ou action facultative avec formulaire propre ; proposer formulaire principal ou Question ouverte. |
| Menu Gestion fermé par actualisation | État conservé pendant le rendu, régression UI dédiée. Les anciens pilotes qui basculaient aveuglément ce menu utilisent maintenant l’onglet direct. |

## Rapports initiaux conservés

- [Fondateur](panel/fondateur/rapport.md)
- [Chef d’équipe services](panel/services/RETOUR.md)
- [Développeur sceptique](panel/sceptique/RAPPORT.md)
- [Opérations](panel/operations/RETOUR.md)
- [Produit](panel/produit/README.md)
- [Consultant](panel/consultant/rapport.md)

Le [premier candidat figé](candidat.json) conserve les défauts constatés. Le [candidat corrigé](candidat-reception.json) sert aux contre-épreuves. Le [candidat de livraison](candidat-livraison.json) ajoute seulement la précision de texte dans la reprise de commande et corrige une attente de libellé dans le pilote ; le moteur est identique au candidat de réception. Le [candidat de recette finale](candidat-qa-final.json) conserve exactement cette application et ajoute une trace passive au pilote de reprise pour documenter un éventuel nouvel échec.

## Contre-épreuves après corrections

- [Consultant : succès, annulation et erreur de saisie](panel/consultant/reception/rapport.md).
- [Fondateur : nouveau lancement, Document et décision figée](panel/fondateur/reception/rapport.md).
- [Opérations : réponses conservées puis remplacées](panel/operations/reception/RECEPTION.md).
- [Produit : choix du formulaire, branches protégées et Synthèse](panel/produit/reception/README.md).
- [Services : consigne facultative, formulaire compact et connexions](panel/services/reception/RECEPTION.md).

## Incidents de recette et portée

La première suite a été arrêtée après découverte des hypothèses obsolètes de plusieurs pilotes : noms sans accents et clic aveugle sur Gestion alors que son état ouvert est désormais conservé. Ils suivent maintenant l’onglet Workflows enregistrés. Les tests de l’état du menu sont explicites.

Deux campagnes générales ont rencontré un échec du même essai de reprise de commande : son dialogue est resté ouvert. La reprise isolée et les essais instrumentés indépendants ont ensuite réussi ; faute de trace initiale DOM/IPC, aucune cause n’est attribuée arbitrairement. Les preuves du diagnostic sont conservées. Les tentatives de pilote derrière une fenêtre encore ouverte ne sont pas comptées comme bugs utilisateur.

Les formulaires enfants imbriqués ne sont pas pris en charge. Les parcours réels Meeting Minutes/Gmail/Odoo/Slack restent à qualifier avec des adaptateurs et ressources de test configurés dans Tricorder. Une connexion disponible dans cette session Codex ne remplace pas ces adaptateurs.

## Vérifications finales

Les résultats finaux et l’identité de l’installation sont enregistrés dans `verification/` et dans le manifeste de livraison.

La recette générale est répartie en quatre groupes sur des bureaux X isolés, sans modification de l’application entre groupes. Une attente obsolète du pilote de liaison demandait encore `fiche_diagnostic` au lieu du nouveau libellé `fiche diagnostic`. Le [candidat du pilote corrigé](candidat-qa-wiring.json) conserve la même application ; les six tests de liaison passent. Les résultats initiaux sont conservés, sans les présenter comme une campagne entièrement verte.


Le second pilote attendait le remplacement automatique du nom saisi `candidate` par « Version à vérifier ». Il vérifie désormais que le nom explicite est conservé ; son parcours complet, rechargement compris, passe. Le [dernier manifeste de recette](candidat-qa-final-controls.json) contient les deux corrections de pilotes.

- Tests unitaires : **466 Python + 181 JavaScript**, tous réussis.
- Recette UI complète : **198 réussis**, deux attentes obsolètes ci-dessus et deux tests sur ressources réelles désactivés par défaut. Les **7 contrôles ciblés** après correction réussissent ; les **200 scénarios exécutables** sont ainsi reçus.
- Paquet Ubuntu : **23 parcours ciblés réussis**, fabrication et démarrage de l’exécutable installé réussis.
- Installation utilisateur basculée vers rc.16 ; rc.15 conservée, sessions en cours non interrompues.
- [Résultats structurés](verification/validation.json), [installation finale](verification/installation-finale.json), [identité du paquet](livraison.json).

Le scénario de reprise passe dans cette recette générale instrumentée et dans le paquet. Ses deux échecs antérieurs restent inexpliqués : ils ne sont pas déclarés corrigés. La publication reste une préversion avec cette réserve documentée.

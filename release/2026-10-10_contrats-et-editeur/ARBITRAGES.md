# Décisions issues des six avis indépendants

État : implémentation et réceptions indépendantes ciblées terminées. Ce fichier
décrit les décisions ; les contrôles complets et la livraison sont documentés
dans le README de cette release. Aucun service externe n'est qualifié par ces essais.

## Parcours retenu

Une demande peut recueillir plusieurs intentions, produire un plan unique,
attendre son approbation puis traiter chaque élément de ce plan. Le terminal et
le suivi utilisent les mêmes états et commandes du moteur. Les tâches gardent
leur identité, leur projet, leurs dépendances et leurs résultats après fermeture.

Le graphe d'exécution présente le travail réel : plan produit, tâches nommées,
états et exécutants observés. L'éditeur présente la structure réutilisable.
Ouvrir une tâche enfant conserve le terminal et permet de revenir à sa demande.

## Avis et décisions

| Avis | Décisions retenues | Vérification attendue |
|---|---|---|
| [Parcours métier](.suivi/avis/01-parcours.md) | Contribution distincte d'une demande ; clôture du recueil distincte de l'accord du plan ; tâches documentaires possibles sans modification de code | Trois intentions, un plan, plusieurs travaux, résultat commun |
| [Contrats](.suivi/avis/02-contrats.md) | Schéma 2 explicite ; présence, type et bornes ; révision et clé d'idempotence des contributions ; questions séparées des résultats | Conflit de révision, branche inactive, liste/scalar, sorties absentes, compatibilité historique |
| [Intégration](.suivi/avis/03-integration.md) | Enfants durables ; dépendances réelles ; base de code explicitement matérialisée ; intégration et QA communes | Processus réellement simultanés ; conflit ; deux candidats verts individuellement mais rouges ensemble |
| [Actions facultatives](.suivi/avis/04-effets.md) | Résultat principal indépendant ; identifiant stable par déclencheur ; activation explicite ; effet incertain à réconcilier | Principal terminé malgré échec facultatif ; pas de second envoi après perte d'accusé |
| [Éditeur](.suivi/avis/05-editeur.md) | Sélection compacte ; ports accessibles ; déplacement annulable ; notes de présentation ; terminal préservé | Souris/clavier/zoom ; sauvegarde/export ; texte de note absent des instructions |
| [Contre-épreuves](.suivi/avis/06-contre-epreuve.md) | Réservations atomiques ; contrôle de filiation ; lectures sans lancement ; états visibles et bornés | Concurrence, arrêt, reprise ciblée, preuves et limites de pagination |

## Choix d'implémentation

- Une liste est une donnée unique. Le bloc **Pour chaque élément** autorise
  explicitement le traitement de ses éléments et limite les travaux simultanés.
- Le moteur coordonne les dépendances et les places. Un agent coordinateur dans
  le terminal prépare et explique le travail ; l'interface ne lui attribue pas
  un statut d'exécution inventé.
- Le lancement en conversation reste explicite. Une fois le traitement par
  élément lancé, sa file progresse selon les dépendances et places disponibles.
  Le mode automatique autorise cette progression dès le lancement du workflow.
- Les actions associées ont leur propre exécution et nécessitent une activation
  explicite. La notification automatique de question existante reste distincte
  et conserve son autorisation au lancement. Aucun envoi externe n'est testé sur
  un compte utilisateur pour la recette.
- Une contribution de code porte sur un candidat exact. L'intégration refuse un
  conflit de fichiers et impose les tests du candidat commun avant son application.
- Les notes sont conservées dans `layout.notes`. Elles sont retirées des graphes
  remis aux agents, y compris dans les traitements par élément et actions.
  Leur texte et leur position ne modifient pas le contrat métier.

## Limites explicites de cette première version

- Jusqu'à 100 éléments par recueil/traitement, 1 à 4 travaux simultanés ; la
  limite globale de quatre exécutants continue de s'appliquer.
- Le recueil accepte du texte ou des contributions structurées ; il ne propose
  pas un champ numérique dont la sortie serait impossible à produire.
- Les traitements par élément imbriqués sont refusés. Les actions associées d'un
  composant inséré statiquement sont refusées avec un diagnostic, sans suppression
  silencieuse ; elles se configurent dans le workflow principal.
- L'intégration reste propre à un dépôt. Le travail multi-projet ne constitue
  pas une transaction atomique sur plusieurs dépôts.
- Le modèle de développement fournit un exemple de tests Python à adapter au
  projet. Une suite vide échoue ; ce modèle ne qualifie pas une recette Odoo.
- Les modèles et exécutions historiques restent en schéma 1. La conversion
  concerne un brouillon choisi par l'utilisateur.

## Réception indépendante du moteur

La [revue moteur](.suivi/review-moteur.md) a reproduit cinq défauts non couverts
par les premiers tests : reprise avant dépendance, suspension d'un ancêtre,
perte d'actions dans un composant, recueil impossible à clôturer et question
facultative inaccessible au terminal principal. Les corrections ont été
contre-vérifiées par le relecteur et ajoutées aux tests de non-régression.

Les six profils utilisateurs ont réalisé leurs parcours ; leurs constats ont
conduit à des corrections de lecture, de navigation, de configuration et de
cadrage. La [seconde revue moteur](.suivi/review-corrections-moteur.md) a reçu les
autorisations des notifications par élément et les projections de familles ;
elle a aussi trouvé puis reçu un contrôle manquant de suspension par filiation.
La [réception visuelle finale](.suivi/review-ui-corrections.md) est favorable sur
ses parcours, après correction supplémentaire des notes et du clic des liens.
Les rapports initiaux restent conservés. Les contrôles complets source/paquet
et les preuves de livraison sont reliés depuis le README de cette release.

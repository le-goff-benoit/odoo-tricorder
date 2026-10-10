# Tricorder 0.6.0-rc.16 — configurer une méthode, renseigner chaque demande

Cette version traite les points restants de la revue spécialisée et des six agents personas de la rc.15.

## Création et configuration

Un workflow ou un modèle neuf commence par le bloc choisi : question, règle, décision, document, commande ou tâche IA. L’inspecteur présente d’abord les champs utiles à ce bloc. Les noms visibles des informations peuvent garder leurs accents et être renommés sans casser leurs liaisons.

Les paramètres du workflow permettent de construire un **formulaire de lancement** : texte court ou long, nombre, Oui/Non et liste de choix, aide et réponse obligatoire. Les réponses appartiennent à chaque demande. Les paramètres fixes appartiennent au modèle. Une règle peut comparer ces réponses avec des valeurs lisibles telles que « Ticket Odoo ».

Les réponses sont transmises aux exécutants et apparaissent dans le suivi et le rapport. Une planification garde ses réponses pour chaque occurrence et les reprend lors d’un remplacement ; les valeurs devenues incompatibles doivent être corrigées. Un workflow enfant (sous-workflow, action facultative ou traitement par élément) ne peut pas avoir son propre formulaire de lancement : utilisez le formulaire principal ou une Question ouverte pendant le travail. Ce cas est refusé explicitement dès la configuration.

## Utilisation

**Workflows enregistrés** devient un accès direct, à côté de **En cours**, **Modèles** et **Historique**. La création distingue modèle partagé et adaptation. La recherche de **Nouvelle demande** filtre le catalogue ; les longues listes de modèles IA disposent aussi d’une recherche.

Le support recueille les faits, l’impact et la destination de la réponse. Il distingue le texte destiné à un ticket Odoo d’un brouillon de texte pour email. Cela ne crée pas un brouillon dans Gmail. Les réponses manquantes restent des questions pendant l’exécution.

Après un lancement réussi, la demande suivante repart d’un formulaire vierge ; un brouillon interrompu reste conservé. Les décisions renommées gardent leur libellé dans le rapport et l’historique. Le menu de gestion conserve son état ouvert pendant les actualisations. Ce correctif répond aussi à l’échec intermittent de la recette distante de rc.15, confirmé après sa publication.

## Connexions et limites de qualification

L’interface distingue service proposé, plugin détecté et adaptateur vérifié. Une vérification du transport et de l’identité affiche sa date et les opérations annoncées ; elle ne prouve pas l’exécution de chacune de ces opérations.

Aucun parcours réel Meeting Minutes → Gmail, Odoo ou Slack n’a été qualifié. L’inventaire local non secret montre des plugins Gmail/Google disponibles, mais aucun adaptateur applicatif qualifié pour ces parcours. Les outils de cette session Codex ne constituent pas une connexion de Tricorder. Il reste à fournir et configurer ces adaptateurs, leurs correspondances d’opérations et des ressources de test avant de qualifier les parcours métier réels. Aucun accès au trousseau ni écriture dans les services ou projets clients n’a été effectué.

Les tests utilisent des données synthétiques, des simulations et des exécutants locaux inertes. Ils prouvent les contrats, la navigation et la transmission des réponses ; ils ne prouvent ni la qualité d’une analyse par une IA réelle, ni un envoi externe.

## Réception et livraison

Les preuves finales, la version du candidat et l’identité du paquet sont conservées dans [.suivi/RECEPTION.md](.suivi/RECEPTION.md).

647 tests unitaires réussis ; 200 scénarios UI reçus après correction de deux attentes de libellés dans les pilotes, deux tests sur ressources réelles désactivés ; 23 parcours ciblés du paquet réussis. Le lanceur local pointe vers rc.16 et rc.15 est conservée.

Une reprise de commande a échoué deux fois dans des campagnes antérieures, puis réussi dans la recette finale et les essais instrumentés. Sa cause reste inexpliquée et suivie ; cette préversion ne prétend pas avoir corrigé cet incident intermittent.

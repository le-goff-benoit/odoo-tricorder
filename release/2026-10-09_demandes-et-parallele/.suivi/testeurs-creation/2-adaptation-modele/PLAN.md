# Adaptation d’un modèle — préparation indépendante

Profil : chef de projet, métier 9/10, technique 3/10. But : transformer un modèle existant en un workflow utile à une autre équipe et comprendre ce qui est enregistré, où, et ce qui arrive à l’original. Aucun verdict produit à cette étape.

Les parcours commencent par les actions visibles d’un chef de projet. Aucun import JSON, aucune retouche d’état, aucun diagnostic par le code produit. Si le modèle de départ manque, le créer par l’interface avec le minimum de blocs nécessaire, puis le conserver comme original identifiable. Les documents du projet sont des fixtures externes synthétiques, jamais des projets clients.

## Parcours 1 — Transformer une clôture de réunion en support interne

Situation : l’équipe veut trier les demandes internes à partir d’un modèle de compte rendu. Dans le projet fictif « Assistance équipe A », ouvrir le modèle disponible, identifier son statut et son emplacement, puis trouver l’action pour en faire une adaptation nommée « Qualification support interne A ». Vérifier si l’action copie ou modifie l’original avant de changer les consignes.

Actions : remplacer la collecte de décisions par une description du problème et de son impact ; remplacer les critères de clôture par « impact décrit, responsable identifié, prochaine action explicitée » ; adapter les blocs de collecte, qualification et validation ; sauvegarder ; fermer et rouvrir ; retrouver le modèle original et comparer les libellés et consignes ; tenter un premier essai avec une demande fictive depuis l’interface.

Défaut volontaire : garder initialement une consigne de réunion contradictoire (« clôturer même sans responsable »). Récupération : retrouver le bloc concerné, corriger, sauvegarder, rouvrir et confirmer que la nouvelle consigne et les critères concordent.

Résultat métier à examiner plus tard : adaptation identifiable, original conservé si une copie a été demandée, changements persistants, essai rattaché à la bonne adaptation. Le résultat d’un fournisseur simulé restera non qualifié.

## Parcours 2 — Adapter un modèle partagé pour un seul projet

Situation : une équipe dispose d’un modèle commun de support ; le projet « Accueil nouveaux arrivants B » a besoin d’un contrôle d’accès aux outils. Repérer un modèle partagé et comprendre sa portée ; créer une variante destinée au projet B ; revenir au catalogue pour distinguer la variante de la référence partagée.

Actions : renommer la variante « Accès outils B » ; adapter les consignes aux accès requis ; remplacer les critères par « demandeur identifié, outils listés, approbateur nommé » ; ajouter ou réorganiser un bloc de validation ; sauvegarder ; changer de vue et rouvrir ; consulter l’original partagé ; tenter le premier essai dans B.

Défaut volontaire : choisir d’abord une portée partagée alors que le besoin est spécifique à B. Récupération : corriger la portée avec les actions offertes, ou recréer explicitement une copie locale et retirer la variante erronée par l’interface si le produit l’exige. Observer les indications de portée avant toute modification de la référence.

Résultat métier à examiner plus tard : portée lisible, variante retrouvable dans B, absence de modification involontaire de la référence commune, paramètres persistants.

## Parcours 3 — Simplifier un modèle pour clôturer une réunion

Situation : le projet « Comité décisions C » veut adapter un modèle complet de traitement de dossier à une clôture courte. Faire une copie nommée « Clôture comité C » puis simplifier les blocs pour collecter décisions, propriétaires et échéances, suivis d’une validation humaine.

Actions : modifier les consignes du premier bloc ; supprimer le bloc devenu inutile ; réordonner la synthèse et la validation ; remplacer les critères par « chaque décision a un responsable et une échéance » ; sauvegarder ; fermer et rouvrir ; vérifier l’ordre, les critères et le nom ; lancer un premier essai avec les notes fictives.

Défaut volontaire : retirer un bloc encore requis par une autre étape ou par la validation finale. Récupération : utiliser les messages visibles et les actions de l’éditeur pour supprimer la dépendance devenue inutile ou restaurer un bloc adapté ; sauvegarder puis rouvrir. Aucune réparation de JSON/SQLite.

Résultat métier à examiner plus tard : simplification compréhensible, dépendances cohérentes, erreur récupérable avec les informations visibles, version corrigée persistante et utilisable pour le premier essai.

## Parcours 4 — Réviser une adaptation et retrouver la version enregistrée

Situation : le projet « Suivi prestataires D » adapte un modèle de support pour suivre une livraison. Créer « Réception prestataire D », préciser les livrables attendus et ajouter une validation des preuves. Revenir après fermeture de l’éditeur pour poursuivre la révision.

Actions : modifier nom, consignes et critères ; ajouter un bloc « Vérifier les preuves » ; sauvegarder ; rouvrir depuis la navigation ordinaire ; changer un critère de réception ; effectuer une tentative de sortie avant sauvegarde et suivre l’option proposée ; rouvrir et identifier ce qui a réellement été conservé ; sauvegarder la version finale ; tenter un premier essai à partir du bon workflow.

Défaut volontaire : saisir un nom déjà utilisé ou laisser un champ requis vide, selon les contraintes visibles. Récupération : corriger depuis le message d’erreur et enregistrer. Si aucune contrainte n’existe, utiliser une consigne incohérente puis la corriger ; ne pas inventer un rejet attendu.

Résultat métier à examiner plus tard : version enregistrée identifiable, avertissement ou comportement de sortie compris, récupération sans perte des autres modifications, premier essai portant les critères corrigés.

## Discipline de la future observation

Entrée normale de l’application ; aucun `--workflow-studio`. Un environnement neuf par parcours. Avant une action de workflow, vérifier dans le terminal visible `command -v codex`, `codex --version`, `command -v claude`, `claude --version` : les chemins doivent être ceux des stubs du parcours et le marqueur attendu doit apparaître. PATH fixé avant tout lancement, jamais changé pendant la session.

Le lancement attend un nouveau paquet et les SHA-256 de l’exécutable et de son ASAR. Quatre parcours, douze captures utiles au maximum pour l’ensemble. Préférer trois preuves par parcours : adaptation/portée, défaut/récupération, réouverture ou premier essai. Le journal peut conserver du texte visible lorsque la capture n’apporte rien.

Le rapport futur sera en français : attendu, action, observé, reproduction, preuve, verdict, gravité, classification (bug, UX, manque du banc), prochaine action. Distinguer la configuration et sa persistance de la compétence des modèles : les stubs ne qualifient pas les fournisseurs ni les livrables métier.

## Fixtures et limites du banc

`harness.cjs --prepare` crée quatre répertoires temporaires indépendants et leurs projets fictifs. Les stubs répondent rapidement à `--version`, affichent un marqueur et quittent avec le code 78 pour les autres demandes. Aucun service, aucun compte, aucune connexion fournisseur, aucune écriture de workflow ou API moteur n’est préparée. Les fixtures externes sont uniquement les documents Markdown indiqués dans le manifeste.

Préparation syntaxique et préflight uniquement maintenant. Aucun GUI lancé, aucune observation produit, aucun verdict.

# Contre-épreuve — synthèse produit composée

Candidat corrigé figé `/tmp/tricorder-release-final`, même fixture synthétique, même vraie GUI Electron et premier chemin Workflows → Historique → exécution → Voir les résultats. Le rapport et les preuves du candidat précédent sont conservés séparément.

Résultat : le défaut bloquant observé est corrigé. Dès la première ouverture, je lis les trois lignes de synthèse, dont le report et le responsable, puis les deux actions. Les constats intermédiaires ne polluent pas le livrable final. Le bouton Copier le texte copie exactement les trois lignes, vérification faite dans le presse-papiers Electron réel, sans interception ni remplacement de l’API de copie.

Je peux désormais reprendre la décision sans ouvrir les résultats détaillés ni effectuer une sélection manuelle. Adoption favorable pour les deux intentions ciblées : réception/copie prouvée sur ce candidat ; modification du modèle et liaison de donnée déjà prouvées sur le candidat précédent. Aucun nouveau contrôle du modèle n’était justifié par ce correctif ciblé de présentation.

Limites conservées : nom brut « synthese » plutôt qu’un libellé éditorial ; copie testée de la synthèse, pas d’une sélection groupée synthèse + actions. Aucune IA réelle ni qualité métier validée ; résultats synthétiques et validation de fixture créés par Engine. Les réserves d’encombrement de l’inspecteur restent celles du rapport initial.

Preuves : `04-resultats.png` et `05-copie.png`, `copie.txt`, `execution.log`. Script autonome `../contre-epreuve.cjs`, commande : `TRICORDER_CANDIDATE=/tmp/tricorder-release-final node release/2026-10-10_retours-personas/.suivi/panel-final/05-produit/contre-epreuve.cjs`.

Erreur de pilote corrigée pendant cette contre-épreuve : l’ancien sélecteur supposait une seule section de livrable ; la correction présente une section par résultat. Lecture adaptée à l’ensemble des sections ; aucune modification de l’application par le persona.

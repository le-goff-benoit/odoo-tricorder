# Consolidation du deuxième tour — cinq avis reçus, corrections reçues avant le tour 3

Les cinq avis et leurs 25 parcours sont reçus. Les limites et réserves de chaque rapport sont conservées. Paquet testé immuable : ASAR `74bfb78a5261899b11de76f1f25e59a31753d086de0992f229e52141885cc058`, manifeste `paquet.json`. Les corrections sont préparées dans les sources sans reconstruire ce paquet pendant la campagne.

| Retour indépendant | Décision et correction dans les sources | Réception actuelle |
|---|---|---|
| Réception F1 : rapport/export JSON et pièces anonymes | Présentation métier Markdown, tableaux d’actions et liens nommés par rôle/fichier | Trois tests Python de rapport réussis ; parcours UI historique/rapport réussi |
| Réception F2 : ancienne tentative et motif absents du README | Inclure chaque tentative, motif de la suivante, résultats, pièces et mention de simulation | Export réel vers projet synthétique reçu par test, contenu des preuves et état conservés |
| Réception F3 : historique moins lisible que résultat courant | Employer le même composant de lecture métier et les mêmes libellés de preuves | Six tests JS historique ; deux parcours UI historique réussis |
| Passation D1 : source globale accessible seulement en JSON | Encadré de provenance et ouverture directe de l’exécution d’origine | Parcours UI source → résultat reçu ; aucune autorisation transférée |
| Passation D2 : archives sans identification visible | Badge Archivé dans listes projets et workflows | À observer sur prochain paquet |
| Passation : nom saisi remplacé au choix d’un modèle, observation exploratoire | Conserver le nom personnalisé ; actualiser seulement le nom suggéré ou vide | Parcours création UI reçu |
| Portefeuille U1 : ancien bilan de lancement hors contexte | Dernier lancement horodaté, périmètre explicite ; masqué sur autre page/filtre | Test JS de portée reçu ; review visuelle à poursuivre |

Les vingt-cinq parcours de ces cinq rapports conservent leurs propres réserves : réception moteur et passation documentaire ne sont pas confondues. Les résultats métier fournis par les fixtures, les modèles commerciaux et les services externes ne sont pas reçus par ces essais.

Avant ces nouvelles corrections, la suite du paquet du tour 2 a donné **108 réussites et deux parcours réels optionnels ignorés**, soit 110 tests (`/tmp/tricorder-rc12-tour2-packaged-ui.log`). Le code de ce paquet correspond aux 322 tests Python et 112 tests JavaScript réussis. Les nouveaux tests et changements de sources seront reçus séparément avant la campagne création/configuration.


Retours complémentaires après réception des deux derniers rapports :

| Retour | Décision et état de correction |
|---|---|
| Versions : contrat ancien conservé, conflit de fichier résolu explicitement | Comportements reçus ; aucun changement de moteur de version requis. |
| Versions : révision absente du suivi | Numéro ajouté à Activité et à la version figée du suivi ; réception UI en cours. |
| Versions : « Prête » dans Activité/détail et « À configurer » dans la vue d’ensemble | Même projection de disponibilité pour les exécutions pilotées par conversation ; vérification bornée et en lecture seule, badges de blocs cohérents. Le lancement automatique garde son contrôle propre. |
| Versions : adaptation absente depuis échec automatique | Action de copie ajoutée ; ancien résultat conservé, demande complète rechargée même si longue ; régression UI en cours. |
| Exploitation : version planifiée inaccessible, évolution non expliquée | Correction confiée à un développeur : version figée consultable, parcours explicite vers nouvelle planification ; aucun transfert des autorisations. |
| Exploitation : validation Communication mal interprétable | Clarification de la réception après opération et de la décision préalable ; moteur inchangé. |
| Exploitation : fuseau horaire | Suspicion infirmée par comparaison Europe/Zurich/epoch ; aucun correctif injustifié. |

La relecture indépendante des rapports/preuves a trouvé trois défauts supplémentaires corrigés : liens de preuves structurées absents de l’export, métadonnées de preuve mal typées, sous-tableaux perdus dans le rendu Markdown. Contre-épreuves dans `../corrections-tour2/review-passation.md`. La relecture de disponibilité a trouvé une confusion automatique/conversation, un libellé de bloc agrégé, des blocs au-delà de la page présentés comme prêts et la perte d’une demande longue lors de la copie ; corrections en contre-épreuve dans `../corrections-tour2/review-admissibilite.md`.


Réception des corrections du tour 2 : `npm test` réussi, **331 Python et 115 JavaScript** (`/tmp/tricorder-tour2-corrections-unit2.log`). **Neuf parcours GUI** retours métier/versions/copie et **deux parcours GUI** planification/communication réussis (`/tmp/tricorder-tour2-feedback-ui3.log`, `/tmp/tricorder-tour2-schedule-ui4.log`). Les traces rouges antérieures sont conservées : anciennes assertions de libellés et erreurs de fixtures corrigées ; endpoint schedule.get ajouté à l’allowlist IPC ; attente de fin de sauvegarde du test ajoutée. La première suite générale avait rencontré un délai de confirmation de prompt terminal ; les huit tests terminal puis cette suite générale complète passent, sans assouplir le contrôle de reprise. Aucun correctif de ce contrôle n’est revendiqué.

Les quatre P2 et le P3 de la relecture d’admissibilité sont clos par contre-épreuves indépendantes. Le coût de lecture des conversations est limité aux cinq champs utiles. La demande longue est récupérée par pages et recopiée intégralement dans le lancement ; son aperçu seul est abrégé dans le dialogue. La planification expose sa révision et son instantané, propose son remplacement après archivage explicitement confirmé et exige une nouvelle activation. L’ancien historique reste intact. La validation manuelle d’une communication est annoncée après opération ; un bloc Décision humaine porte l’accord préalable.

Le paquet suivant est reconstruit et contrôlé séparément pour les cinq testeurs création/configuration ; leurs résultats ne sont pas anticipés ici.


Dernière contre-épreuve avant gel : un double clic rapide valide sur « Activer la planification » créait deux occurrences de configuration actives. Test GUI rouge reproduit, puis verrou de soumission synchrone et bouton désactivé pendant la réponse. **Trois parcours GUI planification passent** après correction, dont zéro création sans confirmation humaine et une seule création malgré double clic valide (`/tmp/tricorder-tour2-schedule-ui-final.log`, preuves `../corrections-tour2/planifications/`). L’archivage arrête les départs futurs ; le dialogue précise que les exécutions déjà en cours continuent.

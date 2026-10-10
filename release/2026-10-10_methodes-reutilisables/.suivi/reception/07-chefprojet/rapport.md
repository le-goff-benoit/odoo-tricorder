# Réception à froid — persona 7, chef de projet

Date : 10 octobre 2026, vers 21:27–21:33 Europe/Zurich. Snapshot figé : /tmp/tricorder-method-review-v3.

Persona jouée par un agent : chef de projet habitué à coordonner des humains, peu informaticien. Ce rapport décrit un parcours GUI instrumenté, pas un entretien avec une personne réelle. Aucun code, README, test ou rapport produit consulté. Aucun appel à une API produit ; aucun état SQLite/JSON retouché. Navigation, saisie, sélection et captures dans la fenêtre Electron avec Playwright.

## Résultat

| Intention | Attendu | Observé | Verdict |
|---|---|---|---|
| Créer une méthode | Deux analyses parallèles, agents distincts, synthèse attendant les deux, intervention humaine seulement sur anomalie | Les quatre choix sont disponibles dans la création guidée. Méthode créée, retrouvée après redémarrage. | Réussite de configuration GUI, environ 3 min |
| Comprendre les responsables, exécutants et prérequis | Savoir qui fait quoi, qui attend quoi, et quand j’interviens | Les rôles Analyse et Coordination et les deux prérequis sont lisibles. Le résumé ne rappelle pas le choix « agent distinct », et « Coordination · Vous » ne rappelle pas le caractère conditionnel. | Partiel, environ 2 min ; identité/mode d’exécution non confirmés dans le résumé |
| Retrouver l’état après lancement inerte | Repérer les analyses arrêtées, la synthèse bloquée et l’absence de résultat | Suivi immédiatement ouvert : Échec, 0/3, deux analyses en échec, synthèse en attente. Activité retrouve la demande dans À traiter. Résultats indique aucun livrable final. | Réussite GUI, moins de 2 min |

Aucune intention n’a dépassé 8 minutes. Pas d’abandon général ; arrêt honnête de la recherche d’un affichage simple des exécutants après consultation du résumé et de Modifier cette étape. Je n’ai pas ouvert l’éditeur détaillé pour résoudre cette ambiguïté.

## Parcours

1. Workflows → Modèles → Créer un modèle. Ces noms correspondent à l’intention et se trouvent sans aide.
2. Nom : Double analyse projet. Résultat attendu : deux analyses indépendantes, synthèse et décision seulement sur anomalie. Source attendue : Note de cadrage projet.
3. Analyse des délais : responsable Analyse ; exécution « Un agent distinct pour les textes fournis » ; démarrage dès la demande ; résultat Analyse délais ; aucune validation systématique.
4. Ajouter une étape. Analyse des risques : responsable Analyse ; même choix d’agent distinct ; « En parallèle d’une étape », référence Analyse des délais ; résultat Analyse risques ; aucune validation systématique.
5. Ajouter une étape. Synthèse pour décision : responsable Coordination ; conversation principale ; « Après tous les résultats sélectionnés », cocher Analyse des délais et Analyse des risques ; validation « Seulement en cas d’anomalie ou d’information insuffisante ».
6. Créer la méthode. Le résumé confirme « Après : Analyse des délais ; Analyse des risques ». Les analyses sont toutes deux indiquées « À partir de la demande et de ses sources ».
7. Modifier cette étape sur la première analyse : formulaire avec Nom, Responsable, Travail à effectuer et Points à vérifier. Le mode d’exécution n’est pas proposé ici. La consigne personnelle est enveloppée dans un texte généré long.
8. Après une interruption du harnais, reprise du même profil. Modèles retrouve Double analyse projet. Consultation du modèle → Utiliser → Continuer.
9. Titre Revue projet test ; notes : livraison vendredi, ressources lundi. Démarrer le travail. Le fournisseur est volontairement un script inerte exit 78.
10. Suivi : « Échec · reprise nécessaire », « 0 / 3 étapes ». Deux analyses « Échec à examiner » ; synthèse « Attend les étapes précédentes ». Voir cette étape permet de passer à Analyse des délais. Résultats : aucun livrable final.
11. Activité : demande Revue projet test dans À traiter, avec le même état d’échec. Aucun besoin de retrouver un terminal pour identifier cet état.

## Observations et gravité

### CP7-01 — les exécutants distincts disparaissent du résumé (moyenne)

Attendu : vérifier rapidement que les deux analyses appartiennent à deux agents distincts.
Observé : le formulaire contient ce choix explicite, mais le résumé montre uniquement « Analyse » pour chacune et une liste « Agents : Analyse · Coordination ». Modifier cette étape ne montre que le Responsable. Les dépendances sont en revanche compréhensibles.
Verbatim de la persona : « Je vois les deux travaux, mais je ne peux plus vérifier ici que deux intervenants différents sont prévus. »
Preuves : 05-coordination-analyse.png, 07-methode-creee.png, 08-synthese-resume.png, 09-responsable-executeur.png.
Portée : problème de vérification et de compréhension ; ce test ne démontre pas un défaut d’exécution parallèle.

### CP7-02 — la participation humaine est résumée sans sa condition (faible)

Attendu : lire clairement que mon intervention est exceptionnelle.
Observé : le réglage guidé nomme précisément l’anomalie ou l’information insuffisante. Le résumé indique « Coordination · Vous » sans cette restriction sur la carte. Le texte que j’ai moi-même saisi rappelle mon intention, mais ce n’est pas une confirmation du réglage par l’application.
Verbatim de la persona : « Vous signifie-t-il que je dois intervenir à chaque fois ? »
Preuves : 06-synthese-attend-deux.png et 08-synthese-resume.png.
Portée : lisibilité ; aucun test de déclenchement réel de la décision humaine, car les analyses échouent en amont.

### CP7-03 — modifier le travail présente une longue consigne technique générée (moyenne)

Attendu : retrouver directement mon instruction « Analyser les délais à partir de la note et signaler les anomalies ».
Observé : le champ commence par l’objectif global et les informations de départ. Le texte complet accessible dans ce champ contient aussi parameters.request et outputs.result. Le formulaire renvoie à l’éditeur détaillé pour changer la coordination.
Verbatim de la persona : « Je voulais relire mon instruction, je tombe sur une longue consigne dont je ne comprends pas toutes les parties. »
Preuve : 09-responsable-executeur.png ; les références techniques sont plus bas dans le texte du champ, accessibles en faisant défiler celui-ci.

### CP7-04 — l’état d’échec est clair, son explication reste technique (faible)

Attendu : savoir que le travail est arrêté et à qui demander de corriger le prérequis.
Observé : le titre, les étapes et l’attente de synthèse sont explicites. Le message est « Le CLI a échoué : vérifier la connexion, le modèle et les options de la version installée ». La reprise et la conversation sont accessibles, mais CLI n’est pas expliqué.
Verbatim de la persona : « Je comprends que c’est arrêté, mais CLI ne me dit pas qui doit réparer quoi. »
Preuves : 12-apres-demarrage.png, 13-etat-premiere-analyse.png, 16-activite.png.
L’échec lui-même est attendu avec exit 78 et ne constitue pas un défaut produit démontré.

## Preuves positives

- 03-modeles.png : accès direct à Créer un modèle.
- 06-synthese-attend-deux.png : sélection des deux résultats et validation conditionnelle.
- 08-synthese-resume.png : les deux prérequis de synthèse restent lisibles après création.
- 12-apres-demarrage.png : état immédiatement présent après lancement.
- 15-resultats.png : absence de livraison complète annoncée.
- 16-activite.png : état retrouvé dans le suivi global.

## Incidents de harnais, séparés du produit

- Premier démarrage : répertoire isolé TRICORDER_HOME absent ; bootstrap signale le chemin inexistant. Répertoire créé puis fenêtre rechargée. Cause de préparation du harnais, exclue des défauts produit.
- Une commande de fermeture du dialogue puis lancement a expiré dans Node REPL, dont le noyau a été réinitialisé. Electron isolé a été fermé, puis rouvert avec le même profil. La méthode était conservée. Cet incident n’est pas interprété comme un blocage utilisateur.
- Une recherche automatisée de bouton Lancer l’exécution réelle a expiré : il appartient à la section repliée Exécution automatique sans conversation. Le parcours visible normal utilise Démarrer le travail et a réussi. Ce faux pas d’automatisation n’est pas un défaut d’interface retenu.

## Limites

Catalogue non secret de test et fournisseur inerte. Ni fournisseur IA, ni résultat métier, ni service externe qualifié. Pas de simulation de résultat métier, pas de validation humaine exercée, pas de production. Les constats portent sur la création, la compréhension visible et le suivi d’un échec attendu. Profil, données et sessions du test entièrement isolés ; fermeture en fin de réception.

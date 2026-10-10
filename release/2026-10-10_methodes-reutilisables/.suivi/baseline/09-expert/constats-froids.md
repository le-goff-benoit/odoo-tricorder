# Persona 9 — spécialiste workflows, novice Tricorder

Baseline figée : binaire rc.17 ; profil entièrement temporaire, fournisseurs inertes. Aucune lecture de code, README ou rapports avant ces constats. Aucune exécution réelle qualifiée.

## Intentions et observations avant conception

1. Intention : consulter une méthode de support avant de décider de l'utiliser. Attente : cliquer son titre ouvre le fonctionnement sans conséquence. Observation : le titre ne fait rien ; seule une copie partagée permet d'ouvrir le modèle. Conséquence : coût de configuration et pollution de bibliothèque pour une lecture. Priorité bloquante pour la confiance.
2. Intention : choisir une méthode opérationnelle. Observation : première carte « De la demande au résultat », description « exemple simulé » ; composants et méthodes dans la même liste, 20 cartes. Conséquence : je dois déjà distinguer types et maturité. Nombre de blocs foreground n'aide pas à choisir le résultat.
3. Intention : comprendre le support et ses alternatives. Observation : copie : 8 blocs / 12 liens, graphe partiellement hors vue ; urgence décline deux préparations de réponse et une réévaluation. Conséquence : la mécanique conditionnelle prend la place de la méthode. Je ne trouve pas d'acquisition de la demande comme étape.
4. Intention : configurer l'analyse sans connaître l'implémentation. Observation : consigne de première étape montre les paramètres support_facts, support_impact, support_destination. Validation oppose structure de sorties et validation humaine. Conséquence : comprendre le modèle exige les concepts internes ; contrôle métier et structure sont mélangés.
5. Intention : choisir où chercher la demande. Observation : formulaire de lancement propose faits, impact, destination et consigne complémentaire, mais aucune sélection email/fichier/ticket. Conséquence : modèle ne matérialise pas l'acquisition et la confirmation de source. Aucun service réel n'a été testé.
6. Intention : identifier qui travaille et comment on coordonne. Observation : cartes « Tâche IA », commandes « Choisir l'IA » et « Assistant IA », sans rôle opérationnel ou mécanisme d'indépendance explicite dans ce qui est vu. Conséquence : je ne sais pas s'il s'agit d'un même agent parcourant des instructions ou de plusieurs exécutants.

Captures : 03-modeles.png, 04-support-titre.png, 05-personnaliser.png, 06-editeur-support.png, 07-etape-analyse.png. Certaines captures prises immédiatement après clic peuvent précéder le rendu : 09 ne prouve pas l'apparence du dialogue ; son texte a été observé ensuite.

## Limites et erreurs du pilote

Deux recherches de boutons par libellé visuel exact ont échoué à cause de leur nom accessible différent (icône/fermeture). Ces délais ne sont pas attribués à la compréhension utilisateur. Pas de conclusion sur résultat, orchestration effective, services, qualité IA ou durées : aucune exécution. La baseline est une revue de découverte, pas une réception globale.

7. Intention : créer une méthode source → analyses parallèles → synthèse → contrôle → réutilisation. Le dialogue « Créer un modèle » commence par sélectionner un modèle et un « premier bloc » : Tâche guidée, Question ouverte, Règle explicite, Accord humain, Document, Commande locale, Tâche IA autonome, Recueillir des intentions. Je peux déduire une construction technique en tant qu'expert, mais rien ne matérialise cette intention de travail ni son résultat. Je ne poursuis pas une longue construction dans ce cadre : abandon de la méthode complète, sans prétendre que le moteur l'interdit. L'explication « L’agent de la conversation réalise la consigne » confirme qu'une Tâche guidée n'est pas un exécutant indépendant.

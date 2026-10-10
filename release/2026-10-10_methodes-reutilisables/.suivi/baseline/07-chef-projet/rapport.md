# Persona 7 — chef de projet technique, découverte rc.17

## Mission et méthode

Mission : analyser deux documents en parallèle par deux rôles, réunir leurs résultats et demander une vérification indépendante ; ensuite retrouver le résultat et répéter la méthode. Profil : à l’aise avec les graphes et dépendances, novice dans Tricorder.

Binaire rc.17 installé, profil entièrement temporaire, écran 1280 × 960 sous Xvfb. Aucun README, code applicatif, rapport d’un autre persona ni état interne d’exécution lu. Documents synthétiques locaux préparés ; fournisseurs codex/claude inertes (exit 78), sans secrets ni service externe. Les clics ont été choisis depuis les écrans visibles. Les lectures des labels DOM servent à piloter les champs visibles et non à découvrir des identifiants techniques cachés. Les erreurs du pilote sont séparées ci-dessous. Ce rapport n’est pas une étude humaine ni une qualification de l’analyse IA.

## Parcours réellement observé

1. Accueil : « Créer un workflow » offre une entrée directe. Je passe d’abord par Workflows : quatre onglets « En cours », « Modèles », « Historique », « Workflows enregistrés ». Aucun travail en cours ; la création est moins évidente ici. Je retourne à Activité et choisis « Créer un workflow ».
2. Création : choix premier bloc « Tâche guidée » par défaut, nom « Comparer les deux documents », sans projet. La différence entre modèle, workflow enregistré et exécution reste à déduire, même si les libellés sont lisibles.
3. L’éditeur présente un seul bloc, « Première étape », sans rôle visible. Ses propriétés permettent une consigne et une validation humaine/structurelle. Je nomme « Analyser le document A » et définis la consigne. Aucune source de document ni affectation de rôle n’apparaît dans cette partie.
4. Ajouter un bloc : seize types organisés en cinq familles, dont Tâche IA autonome/Tâche guidée, Réunir/Intégrer les modifications/Pour chaque élément/Surveillance. Je choisis Tâche IA autonome pour le document B. J’ai donc deux analyses présentées avec des types différents sans l’avoir souhaité ; le premier s’exécute dans la conversation, le second avec un agent dédié. C’est une distinction d’exécution à connaître avant d’organiser mon travail.
5. Deux blocs non reliés : la vue affiche « 2 blocs · 0 lien ». L’inspecteur avertit que B est indépendant et propose de le relier s’il attend un autre travail. Rien n’indique clairement que mes deux analyses démarreront simultanément, ni comment leur attribuer deux rôles.
6. J’ajoute « Organisation · Réunir », nommé « Comparer les deux analyses ». « Relier » ouvre Depuis / Après l’issue / Vers, puis données à transmettre, sortie et entrée, et « Données transmises (JSON : sortie → entrée) {} ». Comprendre la remise des analyses impose de définir et raccorder des sorties. Je n’achève pas la liaison ; la méthode n’est pas construite.
7. J’enregistre et consulte Exécuter. Trois avertissements de blocs indépendants, possibilité de décrire la demande dans le terminal, fournisseur/modèle, « travail de démonstration » pour la tâche guidée en mode automatique et absence de catalogue local. Aucun début d’analyse lancé. La seconde intention retrouver/rejouer un résultat reste non accomplie, puisque le workflow n’est pas prêt.

## Retours prioritaires

| Priorité | Attente | Observation et conséquence | Preuve |
|---|---|---|---|
| Bloquant | Deux analyses confiées à deux rôles visibles | Rôle absent du bloc ; choix autonome/guidé introduit une mécanique de conversation au lieu de proposer une affectation métier. Je ne sais pas quels agents portent ma méthode. | 10-ecran.png, 18-ecran.png |
| Bloquant | Parallélisme explicite, puis attente de tous les résultats | Deux racines affichent 0 lien et un avertissement d’indépendance. Je ne peux pas expliquer le démarrage ni la condition de réunion. | 18-ecran.png, 21-ecran.png |
| Bloquant | Relier deux travaux avec leurs résultats sans contrat technique | Dialogue ports de sortie/entrée et JSON ; aucun résultat déclaré à ce stade. La tâche s’arrête avant la synthèse et la vérification. | 20-ecran.png |
| Majeur | Préparer l’analyse de deux documents | La consigne est accessible mais la fourniture et l’affectation des documents ne sont pas matérialisées dans le premier bloc. Je pourrais les évoquer en texte sans savoir ce que l’agent recevra. | 10-ecran.png, 21-ecran.png |
| Majeur | Choisir une étape de travail puis son responsable | Seize types demandent de distinguer moteur, métier et décisions dès la création. Le défaut Tâche guidée n’est pas adapté à ma volonté de déléguer plusieurs analyses autonomes. | 13-ecran.png, 14-ecran.png |
| Majeur | Une vérification indépendante après consolidation | Impossible d’arriver à ce stade en mode compréhensible dans cette passe ; pas de séparation visible exécutant/vérificateur. | Abandon après 20-ecran.png |

## Verdict et limites

Je peux nommer des étapes et accéder à leurs propriétés sans aide. Je ne peux pas construire en confiance la coordination demandée, ni l’expliquer avant lancement. Adoption pour ce besoin : refus dans cette passe. Il ne s’agit pas d’une panne d’IA : aucun travail business exécuté et les fournisseurs sont volontairement inertes.

Les délais Playwright et deux sélecteurs imprécis (« Première étapeTâche » et bouton ×) sont des erreurs du pilote, sans incidence sur ce verdict. Les captures visuelles montrent les propriétés malgré une collecte body.innerText qui n’incluait pas leur texte ; les observations reposent sur les captures et labels visibles. Aucun délai du harnais n’est présenté comme un temps d’usage humain.

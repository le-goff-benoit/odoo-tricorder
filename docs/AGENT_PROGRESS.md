# Piloter l'utilité d'une investigation

Statut : **proposition**, pas une politique active, ni un superviseur installé.
L'onglet Kanban montre les états et preuves déjà exposés ; il n'évalue pas la
nécessité du raisonnement d'un agent et ne lui envoie pas de messages.

## Enseignements de l'article Cursor

Dans son [expérience SQLite](https://cursor.com/fr/blog/agent-swarm-model-economics),
Cursor attribue une part des gains à la décomposition et à la séparation des
contextes de planification et d'exécution, pas seulement au parallélisme. Leurs
mesures distinguent qualité, coût, volume d'activité et conflits. Une forte
activité peut masquer des reprises inutiles. Les décisions partagées et une
mémoire concise réduisent la redécouverte. Ces résultats sur un essaim SQLite
ne prouvent pas qu'une équipe plus grande ou un modèle moins cher améliore une
release Odoo.

Notre application possible : délimiter les missions, justifier chaque recherche
par une décision à éclairer, puis tester une seule modification à la fois.
Pas de changement automatique des modèles, budgets ou protections Odoo.

## Ce que le dispositif sait déjà

- Le workflow fournit les responsabilités, étapes atteintes et résultats enregistrés.
- Les observations natives fournissent un dernier événement, pas un pourcentage
  d'achèvement ni la qualité de l'analyse. Une observation périmée reste inconnue.
- Les mesures fournissent temps connu, rôles et compteurs disponibles ; veille,
  attente, durée des tours, temps-agent cumulé et délai réel ne sont pas synonymes.
- La réception vérifie la présence et la fraîcheur des preuves ; la pertinence
  métier de celles-ci nécessite encore une relecture.
- Les profils prescrivent déjà une analyse proportionnée et l'annonce des étapes
  longues. Il manque un point intermédiaire structuré liant découvertes et décision.

## Contrat court confié à l'agent

1. Question précise et tâche / release concernée.
2. Décision attendue et critère d'acceptation qu'elle sert.
3. Acquis à réutiliser, hypothèses encore ouvertes, périmètre exclu.
4. Livrable attendu et condition de passage au rôle suivant.
5. Budget indicatif de temps actif, avec risque et hypothèses.

Exemple synthétique : « Comprendre pourquoi un champ disparaît à la sauvegarde.
La reproduction navigateur existe ; ne pas rejouer tout l'inventaire. Déterminer
si le contrat est assez clair pour confier la correction au développeur, et
transmettre le test de reproduction et la piste restante. »

## Point intermédiaire proposé

À tester : premier bilan après environ 10 minutes actives, puis au franchissement
du budget ou après deux pistes sans nouvel acquis. C'est un seuil de revue,
**pas une limite universelle**, une preuve d'échec ou une obligation d'obtenir
un nouvel accord humain toutes les dix minutes.

| Information affichée | Ce qu'elle permet de décider |
|---|---|
| Question en cours | Le travail reste-t-il dans le périmètre ? |
| Nouvel acquis + preuve datée | Qu'a-t-on réellement appris depuis le dernier bilan ? |
| Hypothèse écartée / encore ouverte | Pourquoi poursuivre cette piste ? |
| Impact sur la décision / le critère | Est-ce nécessaire à la qualité de cette release ? |
| Prochaine vérification et résultat attendu | Quand peut-on conclure ou passer la main ? |
| Temps actif / budget, jetons par catégorie | Le coût marginal reste-t-il proportionné ? |

Une exploration longue peut être nécessaire sur un risque de perte de données.
Elle doit néanmoins réduire une incertitude utile. Un bilan « toujours en train
de chercher » n'est pas une preuve de progrès. Un bilan « hypothèse A exclue par
le scénario X, reste B qui change le choix du correctif » en est une.

L'orchestrateur peut ensuite poursuivre avec motif, réduire le périmètre,
transmettre au développeur ou poser la véritable question bloquante à l'humain.
Il ne doit pas tuer une session ou marquer une tâche terminée sur un seuil seul.

## Mesure des économies, sans faux raccourci

Comparer sur les mêmes cas et critères : fidélité de la spec, bon diagnostic,
défauts critiques manqués, reprises QA, temps-agent total et délai de livraison,
entrées/sorties/cache par modèle et coût réellement disponible. Inclure les
enfants et la coordination, sans recompter leur historique hérité. La somme
des temps de plusieurs agents parallèles n'est pas la durée de la release.

Une sélection de modèles par rôle reste expérimentale. Figer la référence,
comparer une variante à qualité constante et réserver un cas inédit. Ne pas
extrapoler un benchmark Cursor ni une seule release à toutes les tâches Odoo.
Notre banc Crew a d'ailleurs déjà observé un cas où déléguer augmentait durée
et jetons : davantage d'agents n'est pas un objectif en soi.

## Avant adoption

Tester une investigation normale, une recherche justifiée mais longue, une
boucle répétitive, une attente humaine, une suspension/reprise, un changement
de tâche et un sous-agent sans télémétrie. Les tests déterministes vérifient
les états/compteurs ; des essais comportementaux isolés doivent ensuite vérifier
que les points d'étape améliorent les décisions sans dégrader le diagnostic.
Ne pas lancer ces essais payants ou changer les profils silencieusement.

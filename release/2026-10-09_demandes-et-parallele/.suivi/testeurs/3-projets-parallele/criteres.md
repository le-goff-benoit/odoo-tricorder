# Critères indépendants — pilotage multi-demandes et projets

Persona : chef de projet, métier 9/10 et technique 3/10. Aucune connaissance des IDs, du JSON, du moteur ou des logs comme prérequis d’usage.

1. **Quatre demandes dans le travail piloté** : préparer R1 question, R2 travail en cours, R3 prêt et R4 échec. Retrouver leurs textes, états, responsables, résultats attendus et blocages depuis un seul travail. Un catalogue de quatre exécutions sans travail parent ne satisfait pas le critère.
2. **Lancer ce qui est admissible et voir qui travaille réellement** : R3 démarre ; R1 garde sa question ; R2 reste lié au processus déjà actif ; R4 présente l’échec et la reprise. Confronter les agents affichés à des processus factices locaux. Aucune facturation fournisseur.
3. **Une décision commune et des décisions locales** : une décision partagée débloque les demandes concernées seulement ; une décision propre à R1 n’autorise pas R4 ni un autre projet. L’écran nomme portée, décideur et conséquence.
4. **Même modèle sur deux projets** : retrouver et réutiliser un modèle sans copier IDs ni JSON ; chaque exécution conserve son projet, ses demandes et ses résultats. Navigation claire entre projets.
5. **Travail commun à deux projets** : créer ou configurer une coordination A+B ; lire les dépendances et responsabilités entre projets sans interpréter des logs.
6. **Consolidation finale** : après les demandes terminées, obtenir un résultat d’ensemble incluant les résultats reçus et réserves des demandes non reçues. Une simple liste de runs terminés ne constitue pas la consolidation.

Parcours depuis le paquet Electron figé, HOME/état/runtime/XDG/PTY isolés. API moteur admise pour fixtures et preuves d’état ; jamais pour substituer une action d’interface testée. Aucun correctif produit, build ou suite globale. Attente obligatoire du responsable avant GUI.

Chaque constat contiendra attendu/observé, gravité, reproduction, captures/preuves, cause établie ou hypothèse, proposition simple et régressions nécessaires. Les scénarios empêchés seront distingués des scénarios exécutés.

# Relecture visuelle de la conception — persona 7

Maquette conception.html consultée dans Chrome isolé, sans lecture du HTML. Captures 22 à 26. Aucun travail ni service exécuté.

## Acquis

La bibliothèque expose les résultats attendus et « Voir le workflow » ; l’aperçu permet de comprendre les sources, étapes et rôles avant lancement. La vue Agents distingue rôle et modèle IA. Ces changements répondent clairement à l’invisibilité de la méthode et des agents du baseline.

## Points à corriger avant développement

1. **Le parcours de création simple impose encore une chaîne.** Il affirme que chaque résultat est transmis à l’étape suivante et réserve branches/parallélisme à l’éditeur détaillé. Mon besoin deux analyses simultanées, synthèse après les deux, contrôle indépendant reste donc absent. Ajouter en mode simple « Commence après… », « Travaille en même temps que… » et « Attend tous les résultats de… ». Le graphe détaillé peut rester avancé ; la coordination ne doit pas l’être.
2. **L’agent est nommé, sans affectation vérifiable.** Montrer dans la méthode quel rôle fait quoi, son état prêt/à configurer, ses accès utiles et la portée de ses informations. La vue Agents doit permettre de revenir à l’étape concernée et de changer son rôle, pas seulement lire des descriptions générales.
3. **La vérification indépendante doit être un travail compréhensible.** « Je veux relire » couvre ma décision humaine ; il ne remplace pas un agent différent qui compare la synthèse aux deux sources. Proposer une étape « Vérifier le résultat » avec responsable distinct et critères lisibles.
4. **Les documents doivent être affectés.** Pour chaque analyse, permettre « reçoit document A/B » puis afficher que la synthèse reçoit les deux analyses et que le contrôle reçoit sources plus synthèse. Aucun JSON n’est nécessaire pour cela.
5. **La promesse de coordination demande une représentation.** La phrase « Tricorder coordonne selon les dépendances » ne permet pas seule de comprendre ce qui peut commencer ou ce qui attend. Une vue « deux travaux en parallèle → synthèse → vérification » et les raisons d’attente dans le suivi sont nécessaires.
6. **L’aperçu doit dire qui livre le résultat global.** Les trois étapes support montrent leurs responsables, mais la responsabilité de consolidation finale et le traitement d’un avis divergent restent implicites.

Le bouton Ajouter une étape ne modifie pas cette maquette lors de ma visite. C’est une limite du prototype, pas un défaut reçu du logiciel. Mon verdict est une validation de direction pour bibliothèque/aperçu/agents, avec réserve bloquante sur la coordination simple et le contrôle indépendant.

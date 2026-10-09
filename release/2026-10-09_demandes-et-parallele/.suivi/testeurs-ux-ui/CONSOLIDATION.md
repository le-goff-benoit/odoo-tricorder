# Réception des cinq avis UX/UI

Les cinq spécialistes ont rendu leurs rapports sur le même paquet figé (`paquet.json`). Leurs scénarios couvrent navigation, création, terminal/suivi, erreurs/résultats et petit écran. Ce sont des observations d’agents, pas une étude utilisateur humaine. Les parcours partiels et le sélecteur natif non reçu restent indiqués dans leurs rapports.

| Constat utilisateur | Correction | Réception ciblée |
|---|---|---|
| Un projet exige un dépôt Git ; réutiliser un workflow impose export/import | Création d’un espace local ; Options → Réutiliser vers modèles ou projet | Projet local, double-clic, copie indépendante ; revue du contexte des composants |
| Une décision neuve ne propose pas ses branches réelles ; données transmises invisibles | Branches par défaut, libellés de décisions, ports visibles et compteur de données | Six parcours wiring ; ordre seul, mapping partiel et remplacement explicite |
| « Validé » vert après un refus | Décision réellement prise affichée, couleur distincte | Refus visible et branche approuvée non libérée |
| Agent arrêté mais activité invite à continuer comme s’il travaillait | Reprise explicite depuis activité et ensemble des demandes | Même PTY/PID, brouillon conservé jusqu’à confirmation, aucune duplication |
| Projet du shell ambigu dans une demande cross-projet | Noms du shell et du projet de la demande affichés en premier | Noms entièrement visibles à 1280 px |
| Une dépendance automatique ressemble à une suspension manuelle | États, actions et rafraîchissement distincts | Achèvement amont reçu sans recharger la demande dépendante |
| Lancement natif possible pourtant indiqué « À configurer » | Travail dans la conversation prioritaire ; configuration déléguée secondaire | Badge et prochaine action cohérents |
| Reprise promet un lancement, budget invisible ; résultat terminé enfoui | Préparation explicitement distincte du lancement, budget de tentatives, Voir les résultats | Échec → préparation → deuxième résultat → décision → résultat lisible |
| Petit écran : propriétés dans une bande étroite, actions loin du formulaire | Propriétés occupant le panneau workflow, une zone défilante, actions fixes, focus restitué | Réception responsive et clavier dans corrections-ux/layout.md |
| Graphe initial réduit et noms de projet tronqués | Zoom initial 100 %, métadonnées 12 px, nom complet au survol/focus | Contrôles typographiques, thèmes, terminal maintenu |

La revue indépendante a trouvé deux défauts supplémentaires avant réception : double soumission de copie et liaison envoyant deux sorties à la même entrée. Les contre-exemples passent désormais sans modification de leurs assertions. Le moteur refuse le mapping ambigu avant tout démarrage. La copie de composants retire également le contexte des anciennes demandes, sans effacer les réglages métier.

Preuves et comptes exacts : `../corrections-ux/review-creation.md`, `terminal.md`, `layout.md`, `liaisons.md`, tests GUI et captures associées. Les corrections ne prouvent pas la qualité d’un modèle IA, un service externe ou une release cliente. Le cycle parent/demandes/candidat intégré et QA commune reste une limite d’architecture décrite dans ANALYSE.md.

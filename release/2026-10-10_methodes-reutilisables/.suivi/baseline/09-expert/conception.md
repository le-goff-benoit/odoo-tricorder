# Revue spécialiste — méthodes, configuration et orchestration

## Portée de la preuve

Découverte rc.17 d'abord, sans documentation ni code : voir constats-froids.md. Puis maquette v2 examinée visuellement dans une fenêtre distincte. Enfin lecture du README de la release, décisions/scénarios et de Engine._advance, runtime.dispatch/dispatch_conversation et packs.resolve_profiles. Cette dernière lecture est une analyse d'architecture, séparée de la preuve de compréhension. Aucune analyse IA, service distant, déploiement ni contrôle indépendant réellement exécuté.

Verdict : la maquette corrige l'accès, l'entrée métier et la hiérarchie du résultat. Elle ne suffit pas à recevoir la création complète ni l'orchestration : détails d'étapes génériques, scénarios d'exception absents, création séquentielle, rôle/exécutant non distingués. Ce sont des points substantiels, pas des ajustements de vocabulaire.

## 1. Méthode lisible et opérations exactes — P0

Un aperçu doit exposer source, travaux, décisions, livrables, dépendances, responsables et limites avant toute création. Le détail « Objectif, informations utilisées… » de la maquette est un placeholder, pas une explication du modèle. Les étapes métier doivent représenter le vrai graphe, jamais une seconde définition narrative qui diverge.

Pour le support : acquisition de la demande ; diagnostic/nature/impact ; réponse ; remise au canal souhaité. Une urgence est une propriété et éventuellement une route, pas deux méthodes de rédaction séparées au premier niveau. Les inconnues ont une voie explicite, avec possibilité de livrer un brouillon prudent. Pour réunion : réunions sélectionnées et sources ; décisions/actions ; rédaction ; remise. Pour livraison : préparer candidat ; staging reçu ; production reçue. Garder les opérations et portes réellement nécessaires dans le détail, sans les convertir en pauses humaines systématiques.

Contre-épreuve : sélectionner une méthode et expliquer chaque état courant en termes de l'aperçu ; aucune sauvegarde pour consulter ; graphe avec branche non retenue ne donne pas l'impression que toutes étapes s'exécuteront.

## 2. Configuration parallèle dans le mode simple — P0

Le texte de création v2 « résultat transmis à la suivante » et « travaux parallèles dans éditeur détaillé » reconduit le flux top-down reproché. Il faut une action de même niveau « Ajouter un travail en parallèle » et une configuration simple « Attend : source / étape(s) ». Un groupe visuel contient deux travaux qui partent de la même source ; la synthèse sélectionne leurs deux résultats. Les ports techniques sont créés automatiquement et restent distincts. La sélection des prérequis doit être déterministe, sauvegardée et consultable.

Contre-épreuve sans injection pilote : créer analyse du contenu et examen des risques en parallèle, puis synthèse ; les deux analyses deviennent prêtes ensemble ; synthèse attend les deux résultats. Annuler/refuser B après succès A ne libère pas silencieusement la synthèse. La lecture d'Engine._advance montre que tous prédécesseurs terminaux ne veut pas dire tous réussis : seuls liens actifs accepted sont retenus ; contrats requis pour chaque résultat, ou politique explicite de résultat partiel nécessaire.

## 3. Rôle, exécutant et coordination — P0

Un rôle est une méthode/consigne ; un modèle IA est un réglage du fournisseur ; un outil est une capacité d'accès ; un exécutant est une conversation ou un processus effectif. Quatre cartes « agents » ne prouvent pas quatre exécutants ni leur indépendance.

Présentation simple : rôle métier principal, puis « dans la conversation actuelle » ou « avec un agent distinct ». L'indépendance doit être visible si elle change la confiance. Un relecteur indépendant exige un exécutant réellement distinct, un résultat lié à la version contrôlée et une trace de son exécution ; sinon dire « contrôle par l'agent », sans promettre une contre-expertise. Le travail peut être parallèle dans la définition tout en étant réalisé séquentiellement dans une conversation : la GUI doit afficher les tâches prêtes, puis l'exécution effectivement démarrée, sans feindre le simultané.

Lecture d'architecture : resolve_profiles ne traite que kind agent ; task/document en mode conversation sont réalisés par la conversation native. Tout rôle affecté dans la nouvelle UI doit donc être effectivement résolu/figé/transmis, ou proposé uniquement là où il s'applique. Une sélection visuelle seule est insuffisante. La fonction dispatch_conversation lance des workers bornés, mais ses vagues demandent un rappel ; ne pas annoncer un coordinateur autonome infini.

Contre-épreuve : créer rôle Analyse et rôle Vérification, inspecter consignes transmises aux exécutants et identité/session ; modifier ensuite le pack, l'exécution ancienne conserve sa consigne. Nommer un pack ne change pas silencieusement le fournisseur ou les droits.

## 4. Acquisition des sources — P0

Le choix email/fichier/lien est une intention, pas encore du contenu acquis. La v2 dit honnêtement qu'en absence d'accès l'agent demande le texte ; il faut aller jusqu'à montrer source trouvée, contenu réellement lu, ambiguïtés et confirmation du périmètre avant travail dépendant. Un email recherché peut avoir plusieurs candidats. Plusieurs réunions exigent plusieurs éléments identifiables, chacun avec ses notes/fichiers, pas un champ commun qui mélange les sources.

La maquette promet plusieurs sources mais ne présente qu'un sélecteur ; ajouter/retirer/nommer chaque source doit être une vraie action. Le fichier local doit être copié à l'occurrence, non laissé comme chemin fragile. Un lien conserve statut « à récupérer » tant qu'il n'est pas lu. Document illisible ou format non pris en charge donne une prochaine action utile. Aucun contenu retrouvé d'un client ne devient implicitement partagé avec un autre.

Contre-épreuve : deux documents de réunions différentes avec une action contradictoire ; les références restent distinguées ; modification des originaux après lancement n'altère pas la preuve ; recherche email sans accès ne produit jamais une analyse prétendant l'avoir lu.

## 5. Contrôle qualité et intervention utile — P0

Distinguer validité des données, cohérence avec sources et décision opérationnelle. Les deux premiers peuvent être automatiques ; ils ne constituent pas une réception métier universelle. Prévoir des critères formulés simplement, reliés au résultat. Une incertitude peut conduire à une question, une investigation ou un brouillon explicitement incomplet ; ne pas poser « approuvé/rejeté » pour obtenir une information factuelle.

La v2 dit « question équipe touchée » sous Choisir la demande : c'est une précision d'impact, qui peut relever de l'analyse. L'étape active et l'information demandée doivent être cohérentes. Toute réponse inconnue est acceptée lorsqu'elle est plausible ; on conserve l'inconnu et adapte la suite. Les changements de périmètre nécessitent de recalculer les dépendances, pas un simple label.

Contre-épreuve : demande complète traverse sans pause de confort ; demande ambiguë s'arrête seulement pour la précision utile ; répondre « inconnu » produit une suite compréhensible ; un contrôle indépendant rejetant une version empêche d'annoncer cette version comme prête.

## 6. Échecs, reprises et résultats partiels — P1

La méthode doit montrer exception et reprise sans recréer le travail accepté. Différencier manque de source, panne d'exécutant, résultat invalide, décision refusée et service indisponible. La reprise doit préciser ce qui sera rejoué. Une opération externe déjà réalisée n'est pas retentée aveuglément. Les tentatives et jetons restent dans le détail ; cause et prochaine action restent visibles.

Contre-épreuve : un seul travail parallèle échoue ; l'autre résultat reste conservé ; reprise de B ne rejoue pas A ; synthèse attend succès requis et mentionne omission autorisée si méthode accepte du partiel.

## 7. Livrables d'abord, transparence suffisante — P1

La maquette résultat est beaucoup plus lisible. Garder la distinction texte préparé/brouillon distant/envoi. Chaque livrable annoncé doit être présent et exploitable ; compte rendu, actions et email sont des objets distincts. Le contrôle doit dire précisément ce qui a été vérifié et par qui, avec incertitudes utiles, sans prétendre fiabilité totale.

Le support maquette demande encore échéance/personnes : statut « résultat préparé — informations à compléter », plutôt que résultat entièrement reçu si la méthode exige ces faits. Date, durée et résultat premier ; historique technique dans détails. Rapport long/tableau doit être réellement examiné à largeur réduite, pas uniquement capture vide.

Contre-épreuve : un destinataire externe pourrait utiliser le livrable sans lire le journal ; un brouillon Gmail non créé n'est jamais annoncé créé ; aucune donnée technique interne ne remplace la réponse finale.

## 8. Périmètre de modification et multi-client — P1

« Améliorer le workflow » à la fin d'une demande doit préciser si on change les prochaines demandes, seulement cette occurrence, ou un modèle partagé. Une copie personnelle conserve son origine sans exposer révision partout. Contexte, projet/client et source sont visibles aux moments où ils changent le travail ; historique ancien immutable.

Contre-épreuve : personnaliser une méthode pour client A ne modifie ni B ni l'exécution terminée ; relancer depuis résultat avec nouvelle source ne récupère pas silencieusement les anciennes réponses ; retour de navigation conserve l'état de lecture.

## 9. Répétition et automatisation — P1

Même définition pour essai manuel et déclenchement automatique. La méthode distingue recherche renouvelée (« réunions depuis dernière occurrence ») et source fixe. Elle précise sélection des nouvelles sources, fréquence/événement, prévention des doublons, action finale et comportement en cas d'ambiguïté. Un déclenchement avec fichier ancien répète seulement l'ancien fichier. Sans connecteur, proposer routine manuelle honnête plutôt que promettre une récupération.

Contre-épreuve : deux semaines distinctes récupèrent deux périmètres ; redéclencher le même événement ne crée pas deux brouillons externes ; zéro nouvelle réunion conduit à aucune sortie fictive ; deux réunions non identifiables demandent clarification au lieu de fusionner arbitrairement.

## 10. Réception pertinente — P0 méthodologique

Recevoir séparément lecture/création/suivi/résultat/répétition. Les paroles de confiance ne remplacent pas capacité observée. Pour l'expert, créer réellement la méthode parallèle depuis la GUI sans fixture de liens. Pour le novice, observer comment il expliquerait les agents et sources à un collègue. Les premiers abandons sont conservés. Les maquettes démontrent l'organisation, pas des services ni l'orchestration réelle. Le panel ne doit pas être invité à « trouver trois défauts », qui minore les ruptures structurelles.

## Résumé de décision

La direction v2 mérite mise en œuvre avec les corrections P0 ci-dessus. Aucun verdict d'adoption globale n'est donné. La cible est une méthode déterministe qui expose source, responsabilités, dépendances, résultat et exceptions ; l'élégance visuelle seule ne reçoit pas sa fiabilité ni sa répétabilité.

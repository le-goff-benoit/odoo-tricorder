# Panel produit — synthèse de six personas

**Tricorder démontre une valeur de poste individuel : conversation dans le terminal, méthode réutilisable, suivi des tâches et décisions traçables.** Le panel ne démontre ni une conduite d’équipe partagée, ni des intégrations messagerie prêtes à employer. Les parcours sont pertinents au-delà d’Odoo ; les défauts confirmés doivent être reçus avant de conclure à une utilisation fiable sur des demandes réelles.

## Cadre et portée

Six agents ont joué six personas distincts, chacun avec deux parcours indépendants et des projets fictifs. **Aucune personne extérieure n’a été recrutée** : il s’agit d’un panel de tests par personas, pas d’une étude utilisateur représentative. Les rapports ont été rédigés avant leur lecture croisée. Les essais ont porté sur le paquet immuable **0.6.0-rc.13**, le 10 octobre 2026, dans Electron piloté par Playwright, avec HOME, état, fournisseurs et sockets isolés. Les rapports, captures, scripts et manifestes des traces sont archivés dans les dossiers `01` à `06` ci-dessous ; les volumineux ZIP des traces restent dans les répertoires temporaires indiqués ; les corrections ultérieures ne réécrivent pas leurs constats.

L’interface a réellement été manipulée. Cela ne rend pas réels les travaux d’un fournisseur remplacé par un bouchon ou les sorties d’une simulation. Aucun modèle commercial, compte OAuth, mail, Slack, déploiement ou client réel n’a été qualifié. Les fournisseurs synthétiques s’annoncent comme tels. Aucun état moteur n’a été retouché pour forcer une transition.

| Preuves | Ce qui est établi | Ce qui ne l’est pas |
|---|---|---|
| GUI, captures, traces et lectures d’état | Navigation, saisie, persistance, copies, décisions, dépendances, tentatives et accès aux sessions | Facilité d’usage mesurée auprès de personnes recrutées |
| Commandes locales du développeur sceptique | Vrais codes de sortie, assertion, diagnostic, réception et export de preuves sur un dépôt synthétique ; fonctionnement sans IA | QA d’un dépôt client ou reproductibilité liée nativement au SHA des sources |
| Simulation des opérations et du consultant | Parcours clairement marqué, interventions et indépendance des résultats/action facultative | Travail métier produit par IA ou effet externe |
| Plans/questions/livrables injectés par les API validées | Suivi et contrôles face à des sorties déterministes, avec substitutions documentées | Qualité du planificateur, des spécifications ou des onboardings |

Les usages d’API sont détaillés par persona : fondateur et services substituent des résultats au fournisseur ; le PM adapte aussi une définition et un démarrage pour son second parcours. Opérations et consultant créent leur méthode et leurs demandes par GUI, puis lisent l’état pour preuve. Le sceptique réalise ses commandes et décisions par GUI ; scripts de dépôt et lectures d’audit restent synthétiques et déclarés.

## Attentes, scénarios et résultats

| Persona / rapport | Attente et deux scénarios | Résultat observé et limite d’adoption |
|---|---|---|
| [01 — Fondateur SaaS/services](01-fondateur/report.md) | Concevoir un onboarding Atlas, puis réutiliser sa méthode chez Boréal ; plan avant travaux, Slack et mail récapitulatif | Projets/copies et plan synthétique consultable ; coordination et dépendance visibles. Perte d’une nouvelle intention reproduite lors d’ajouts rapides. Travaux interrompus par le fournisseur volontairement inerte. Connexion Slack/mail exige un adaptateur. Adoption reportée pour le recueil réel et l’automatisation client. |
| [02 — Chef d’équipe services](02-services/report.md) | Distribuer une méthode entre deux releases ; coordonner deux demandes multi-projet avec réception comme prérequis | Copies et décisions indépendantes ; question, reprise et tentatives conservées. Une QA synthétique sans preuve est refusée ; sa réception complète débloque la demande dépendante, l’accord du plan seul ne la débloque pas. Intéressant sur un poste ; noms de collègues déclaratifs, aucun suivi partagé qualifié. |
| [03 — Développeur senior sceptique](03-sceptique/report.md) | Exécuter/versionner une commande sans IA ; comparer simulation, échec, diagnostic et reprise dans le même shell | Vraie commande réussie, export local, décision et version exécutée figée. Reprise automatique présentée comme préparation, diagnostic caché et départ du shell dans `.tricorder` gênent la réparation. Audit incomplet des sources exactes. Valeur pour une procédure de contrôle, avantage quotidien insuffisant face à commande + Git. |
| [04 — Responsable opérations PME](04-operations/report.md) | Créer une méthode d’accueil client ; répondre à une question, approuver puis activer un brouillon facultatif | Définition entièrement GUI, première simulation 6/6, seconde 7/7 et action séparée terminée. Bonne séparation question/accord/optionnel. Modèle général encore orienté logiciel, conversion et relectures nombreuses. Notification ou brouillon distant demandent aide technique ; aucun fichier métier réel revendiqué par la simulation. |
| [05 — PM B2B](05-product/report.md) | Recueillir trois besoins, clarifier et demander révision du plan ; suivre un lot parallèle avec dépendance et résumé facultatif | Recueil/modification et plan lisible ; refus commenté termine correctement la première demande mais ne révise pas le plan. Second parcours assisté : trois tâches reçues, parent et document facultatif terminés. Enfant dépendant présenté à tort comme suspendu manuellement ; ordonnancement normal après réception du prédécesseur. |
| [06 — Consultant multi-client](06-consultant/report.md) | Personnaliser une méthode support/audit et la copier ; suivre deux clients avec plusieurs shells | Copies indépendantes, révision exécutée figée, activités et contexte shell/demande explicites. Premier shell vivant mais introuvable après création d’un autre projet, puis aucun onglet après rechargement. Réutilisation convaincante ; ce défaut empêche un usage terminal quotidien sûr. |

## Convergences et divergences utiles

**Socle à conserver.** Les projets locaux démarrent sans dépôt préparé et le pack Odoo reste facultatif. Le dessin, sa copie et l’exécution figée sont distingués. Les accords concernent une proposition identifiée ; le résultat principal et l’action facultative restent indépendants. Le chef d’équipe vérifie qu’une dépendance attend la réception complète. Le développeur prouve que Commande/Décision peut fonctionner sans fournisseur IA.

**Le terminal doit rester le lieu principal du travail**, avec le suivi pour voir questions, dépendances et résultats. Le consultant exige que tous ses shells restent accessibles ; le sceptique exige le bon dossier et une reprise prévisible. La disponibilité d’un processus dans le broker ne suffit pas si l’utilisateur ne peut plus le sélectionner.

**La simplicité varie selon le métier.** Le fondateur et le PM acceptent un plan/tâches, mais les contrats `plan.tasks`, les identifiants et le choix libre d’un modèle IA ralentissent leur départ. Les opérations veulent un modèle métier court. Le sceptique demande que le chemin sans IA déjà existant soit visible immédiatement. Détail aide à décider ; un graphe très réduit ou un modèle à neuf blocs est moins efficace pour une lecture rapide.

**Copies et suivi d’équipe répondent à des besoins différents.** L’indépendance des copies est annoncée et vérifiée. Aucun compte de collègue, circuit d’accord nominatif ou synchronisation entre bureaux n’est établi. Un usage équipe peut distribuer une méthode versionnée et partager des exports ; il ne remplace pas aujourd’hui un suivi commun démontré.

## Priorités confirmées et corrections candidates

Les lignes suivantes décrivent des défauts observés sur **le paquet du panel**, puis les corrections intégrées. La réception indépendante des saisies, terminaux et projections est favorable : cinq parcours GUI et onze tests de projections, avec les échecs initiaux conservés. La qualification complète du paquet reste consignée séparément ; la seule présence d’un correctif dans les sources ne vaut pas réception. La revue et les preuves de réception font foi dans [REVIEW-PANEL-PRODUIT.md](../REVIEW-PANEL-PRODUIT.md) puis [reception-finale.md](../reception-finale.md).

| Priorité / classe | Constat confirmé | Correction intégrée et critère de réception |
|---|---|---|
| P1 — bogue de saisie | 01 : A ajouté, B saisi pendant l’accusé puis effacé sans erreur ; un seul besoin conservé | Préserver la nouvelle intention pendant l’accusé, empêcher les ajouts doubles et la confirmation prématurée. Rejouer A/B rapide et confirmer la liste exacte. La duplication est un risque traité par le candidat, pas un second défaut observé par ce panel. |
| Haute pour le consultant — bogue d’accès | 06 : deux shells vivants, premier inaccessible ; rechargement sans onglets | Sélecteur **Autres terminaux**, sessions nommées et rattachement aux sessions existantes après changements de projet/rechargement. Vérifier mêmes PID, historique et contexte, sans shell nouveau imposé. |
| P2 — bogue de présentation/action | 05 : enfant `iteration_wait` dit « suspension explicite » et propose Reprendre | Exposer `iteration_wait`, maintien de coordination et pause du parent ; UI distinguant attente, maintien et suspension humaine. Vérifier enfant bloqué, levée normale et absence de faux remède. |
| P2 — friction à conséquence réelle | 03 : **Préparer la reprise** exécute immédiatement la commande automatique et consomme tentative 2 | Libellés et commande de reprise exacts selon le mode ; annoncer travail immédiat, budget et périmètre avant accord. Ne pas déclarer la commande différée si elle part automatiquement. |
| P2 — friction de diagnostic | 03 : cause de commande visible seulement après ouverture de preuve | Montrer diagnostic utile au panneau d’échec, conserver preuve complète ; vérifier assertion/code 7 sans détour opaque. |
| P2 — contexte de shell trompeur | 03/06 : nouveau shell dans `.tricorder`, panneau indiquant la racine ; réparation relative au mauvais niveau | Shell depuis une exécution à la racine ; terminal de conception dans `.tricorder` nommé avec contexte exact. Vérifier `pwd`, chemins affichés et séparation des usages. |
| P3 — incohérence de suivi | 02 : prérequis natif « À configurer » tandis que suivi dit « À traiter dans la conversation » ; Activité masque le stade prêt | État natif cohérent et nom d’étape courante dans Activité. Vérifier plan prêt versus réalisation autorisée. |
| P3 — friction de versionnement | 03 : changement d’un titre réordonne presque tout le JSON | Sérialisation stable création/réouverture/sauvegarde. Diff limité aux changements voulus et à la révision. |
| P3 — limite mal anticipée | 05 : commentaire demandant révision suivi d’un refus final | Avertissement explicite : refus termine la demande, ne révise pas le plan. Cela clarifie le contrat ; la révision du plan reste une capacité à construire. |

Aucun correctif ne doit effacer l’échec historique ou réinterpréter les preuves du paquet initial. La réception doit identifier ses sources et son paquet, reprendre le déclencheur observé et montrer le résultat attendu. Cette synthèse n’effectue aucun nouveau test UI.

## Décisions produit et feuille de route

**Maintenant : fiabilité et actions prévisibles.** Qualifier le paquet contenant les corrections reçues, conserver les distinctions agent arrêté / demande suspendue / attente de dépendance et résultat local / effet externe. Le message produit raisonnable est « terminal, méthodes et suivi sur votre poste ». Les usages naturels sont onboarding, cadrage B2B, support/audit multi-client, comptes rendus et checklists de contrôle ; Odoo/release constitue un usage spécialisé.

**Prochaine simplification : méthode courte et lancement adapté.** Ajouter quelques modèles métier lisibles, dont accueil client et document à relire ; proposer clairement « adapter pour ce projet » et « créer mon modèle ». Ranger métadonnées et contrats dans les options avancées. Pour un workflow sans IA, présenter **Lancer les commandes locales** en action principale : c’est une amélioration d’accès à une capacité déjà vérifiée, pas une promesse nouvelle. Renforcer la lisibilité du graphe et les noms des actions/décisions sans multiplier les blocs.

**Capacités à construire, avec essais dédiés :**

1. **Connexion OAuth et opérations vérifiées.** Assistant de connexion pour quelques services pris en charge, permissions et destinataire/canal explicites, distinction document local / brouillon distant / notification / envoi. Ne pas annoncer Slack ou mail prêt à employer tant que l’adaptateur, l’authentification et l’effet réel ne sont pas qualifiés.
2. **Révision du plan dans la même exécution.** Action « Demander une révision », commentaire, nouvelle proposition et nouvel accord lié à sa version. Conserver plan rejeté et historique ; ne pas transformer rétroactivement un refus final en autorisation. L’avertissement candidat couvre seulement le contrat actuel.
3. **Audit des sources exécutées.** Relier la commande au SHA Git, état des modifications, empreintes ou snapshot des fichiers réellement lus et environnement reproductible. Le SHA de preuve ou de contrat existe ; il ne prouve pas le contenu du dépôt contrôlé.
4. **Collaboration, si besoin produit confirmé.** Évaluer partage d’état, identité des décideurs et affectations humaines comme chantier distinct. Le panel fournit une demande du chef d’équipe, pas une qualification multi-utilisateur ni une priorité unanimement exigée.

Le prochain essai d’adoption doit faire accomplir un onboarding ou un contrôle local par de vrais utilisateurs, puis qualifier séparément un service externe autorisé. Les six personas apportent des défauts reproductibles et des hypothèses produit utiles ; ils ne mesurent ni satisfaction, ni temps économisé, ni disposition à payer.

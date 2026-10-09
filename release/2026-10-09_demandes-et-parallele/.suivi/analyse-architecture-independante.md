# Analyse indépendante — de l’intention aux demandes coordonnées

Date : 9 octobre 2026. Base Git observée : `2427368732f5d77f1ebcfdcd2466d1105b524ef8`, avec les modifications rc.12 en cours. Les références de lignes correspondent à cet arbre de travail, pas à une livraison publiée. Analyse complémentaire à la [review rc.12](review-independante.md) ; aucun correctif applicatif effectué ici.

## Conclusion

Le gain de rc.12 est réel : elle rend visibles plusieurs demandes et permet de lancer plusieurs exécutants sans attendre chaque réponse. Elle ne fournit pas encore le contrat complet « je donne une intention, le workflow la décompose, exécute les demandes adaptées, réunit leurs résultats, vérifie l’ensemble et livre ». Actuellement, **une conversation contient une liste d’exécutions du même modèle**. Cette représentation convient à plusieurs demandes homogènes ; elle ne suffit pas pour une coordination qui contient une collecte, quatre corrections et une consolidation.

La difficulté principale n’est donc ni la limite de quatre exécutants ni le dessin du graphe. C’est l’absence de distinction durable entre l’intention initiale, la coordination, les demandes, leurs étapes et leurs exécutants. Une meilleure consigne du terminal réduit certains mauvais usages, mais ne donne pas au moteur les objets et les relations qu’il doit faire respecter.

La direction recommandée est une évolution du moteur existant : conserver la conversation comme point d’entrée et espace de coordination ; y enregistrer un plan versionné, des demandes liées à leur source et leur workflow, puis des dépendances et résultats explicites. Le terminal reste l’interface de dialogue. Le panneau graphique montre ce que le moteur sait, sans demander à l’utilisateur de reproduire cette coordination dans un second outil.

## Périmètre et niveau de preuve

Lecture de `conversations.py`, `work_templates.py`, `setup.py`, `contracts.py`, `guidance.py`, du runtime, des connecteurs fournisseurs/candidats, du pont natif Electron et de l’éditeur. Lecture des tests de dispatch, des tests de candidats et de la contre-épreuve rc.12. Les scénarios utilisateur récents ont été rapprochés de ces contrats ; aucune donnée client n’a été relue.

Trois niveaux sont distingués :

- **Code** : comportement directement établi par les chemins lus. Ce n’est pas une nouvelle recette de l’application installée.
- **Contrôle pur** : appel à une fonction de validation, sans projet, SQLite, processus fournisseur ni effet externe.
- **Qualification requise** : risque ou capacité non démontrée ; aucune panne fournisseur n’est affirmée sur la seule base d’un faux agent.

Cette passe n’a écrit aucune base ni aucun état de projet, même synthétique ; elle n’a pas lancé les suites qui en créent. Aucun build, test d’interface, appel modèle, plugin authentifié, Slack ou email. Les tests existants cités ont été **lus**, pas rejoués dans cette passe. Seul ce rapport est ajouté. Le dépôt étant partagé et modifié en parallèle, les nouveaux correctifs postérieurs à la lecture doivent être rapprochés des constats.

## Les objets à distinguer

| Objet | Responsabilité | Ce qu’il ne faut pas lui faire porter |
|---|---|---|
| Intention / source | Ce que l’utilisateur demande, original, pièces, provenance | Une obligation de produire un diff |
| Coordination | Plan, demandes enfants, dépendances, décisions communes, résultat d’ensemble | Un besoin client artificiel supplémentaire |
| Demande | Résultat précis, projet(s), critères, workflow choisi, état propre | La configuration complète de tous les exécutants |
| Workflow | Définition versionnée du traitement et de ses I/O | Une session fournisseur ou une release particulière |
| Bloc | Une opération avec entrées, sorties, critères et issues | Une personne, un modèle ou une demande entière par défaut |
| Exécuteur | Terminal natif, worker isolé, commande ou connecteur réellement capable | Le rôle métier simplement écrit dans un prompt |
| Profil d’agent | Méthode et instructions facultatives | Une preuve d’indépendance, une permission ou un outil disponible |
| Tentative | Un travail effectif, son propriétaire, sa preuve et sa reprise | Un nouveau besoin client |

Une release, un support et un meeting sont des modèles et des résultats de travail. Ils ne nécessitent pas trois moteurs ni une application centrée exclusivement sur Odoo.

## Constats priorisés

P1 signifie ici que le parcours demandé ne peut pas être réalisé correctement par le contrat actuel, ou devient trompeur/incomplet. P2 signifie une difficulté de configuration, de reprise ou de compréhension. Aucun P0 ni incident de production n’est établi. La priorité de qualification F07 n’est pas une panne constatée.

| Réf. | Priorité | Constat | Preuve |
|---|---|---|---|
| F01 | P1 | Collecte, demande métier et consolidation reçoivent le même traitement | Code + contre-épreuve existante |
| F02 | P1 | L’accord d’un plan commun n’a pas de portée formelle sur ses demandes | Code + contre-épreuve existante |
| F03 | P1 | Les dépendances réunissent des résultats complets sans contrat de données ciblé | Code + contrôle de volume pur |
| F04 | P1 | Des candidats parallèles n’ont pas de parcours d’intégration et QA d’ensemble | Code + tests de protection existants |
| F05 | P1 pour le parcours autonome | Une vague ne constitue pas une exécution durable du plan | Code ; limitation correctement annoncée |
| F06 | P1 | Fournisseur/modèle et exécuteur sont implicitement couplés | Code + précontrôle pur |
| F07 | Qualification prioritaire | L’édition réelle hors extraits doit être qualifiée par fournisseur | Code ; pas de panne affirmée |
| F08 | P2 | Ports primitifs et bloc Réunir ne décrivent pas une collection de demandes/résultats | Code + validation pure |
| F09 | P2 | Corriger ou requalifier crée une nouvelle demande sans relation de succession | Code |
| F10 | P2 | La configuration Odoo initiale choisit une méthode au niveau du dépôt | Code ; pack facultatif |
| F11 | P2 | L’éditeur expose des détails techniques avant le contrat d’utilisation effectif | Lecture UI ; pas de test utilisateur réalisé |

### F01 — Un même modèle pour tous les travaux de la conversation

**Parcours touché.** « Va chercher cet email, prépare le plan, traite R1 à R4 puis consolide C1. » La collecte et C1 ne doivent pas traverser une étape de modification de code. Un meeting peut produire trois actions de natures différentes : préparer un document, examiner un bug, contacter un interlocuteur.

**Cause.** [`Conversations.open`](../../../backend/workflow_engine/conversations.py#L77) appelle `add` pour `initial_request`. [`add`](../../../backend/workflow_engine/conversations.py#L87) accepte demande, projet, clé et dépendances ; elle copie systématiquement `conversation.definition` avant `engine.start` (lignes 106–115). Aucun workflow propre à la demande, lien au bloc parent, type de travail ou relation de décomposition n’est représenté.

Le [modèle release](../../../backend/workflow_engine/work_templates.py#L41) contient neuf blocs, dont réalisation, QA et livraison. La [contre-épreuve existante](../../../tests/test_rc12_independent_review.py) nommée `test_collection_requests_and_consolidation_all_receive_same_full_release_graph` vérifie que collecte, R1–R4 et C1 reçoivent ce graphe entier. C’est un constat de limitation, pas un test démontrant le parcours souhaité.

Le nouveau [prompt natif](../../../electron/main.cjs#L193) explique de ne pas ajouter la collecte comme demande de développement. Cependant, si cette intention est saisie dans le [dialogue de lancement](../../../src/studio.js#L360), elle a déjà été passée à `initial_request` et ajoutée avant le premier tour de l’agent. La consigne ne corrige donc pas ce chemin d’entrée. En outre, faire la collecte uniquement « hors graphe » enlève le suivi visuel attendu de ses questions, sources et résultats.

Le refus d’un candidat sans modification, dans [`candidates.capture`](../../../backend/connectors/candidates.py#L125), est correct pour un bloc d’édition. Il révèle le mauvais contrat attribué à la collecte ; le supprimer ferait accepter de faux résultats.

**Correction minimale.** Enregistrer l’intention sur la coordination sans créer automatiquement une demande métier. Permettre ensuite une création idempotente de demandes avec `workflow_ref` et relation d’origine (`source`, `parent`, bloc de décomposition éventuel). Donner à collecte et consolidation un contrat propre, visible dans le même suivi. Les nouveaux items utilisent une définition figée choisie pour leur résultat attendu ; les anciens runs restent immuables.

**Validation attendue.** Un email synthétique donne une coordination, quatre demandes métier et une consolidation identifiables. La collecte n’apparaît pas comme cinquième correction. C1 ne reçoit pas de bloc de développement. Le même mécanisme traite un meeting dont une action utilise un modèle support et une autre un modèle document. Reprendre la source ne duplique aucun enfant.

### F02 — Un accord de plan commun n’est pas un accord des quatre demandes

**Cause.** [`Engine.decide`](../../../backend/workflow_engine/engine.py#L507) valide un bloc d’une exécution précise avec son nonce et sa proposition. Chaque copie du [modèle release](../../../backend/workflow_engine/work_templates.py#L44) possède son propre bloc `scope`. Le plan commun est un texte ; rien n’identifie formellement la révision du plan, les demandes et critères inclus dans cet accord. `add` ne reçoit aucune référence d’accord et n’en revendique aucune.

**Impact.** L’utilisateur peut avoir validé un plan listant R1–R4 et retrouver quatre plans à accepter. Inversement, interpréter le premier clic comme une approbation de n’importe quelle demande ajoutée ensuite serait incorrect. Les gardes actuels évitent ce second défaut ; il ne faut pas recopier des états `accepted` pour éliminer le premier.

**Correction minimale.** Un accord collectif porte sur un plan versionné et une liste exacte de demandes, chacune avec empreinte du périmètre et des critères. Le modèle définit si l’autorisation vient de cet accord ou d’un point de décision propre. L’autorisation de travail reste distincte des accords de publication, envoi, application locale ou production. Une modification de périmètre retire seulement la couverture devenue invalide et l’explique.

**Validation attendue.** Après accord du plan P1 pour R1–R4, leurs blocs couverts sont exécutables sans quatre confirmations redondantes. R5 ajoutée ensuite n’est pas couverte. Une extension de R2 exige l’examen de son delta ; R1, R3 et R4 conservent leur autorisation. Aucun accord distant ne découle de l’accord de plan.

### F03 — `depends_on` transporte tout le résultat, pas les données dont C1 a besoin

**Cause.** Au déblocage, [`Engine.control`](../../../backend/workflow_engine/engine.py#L530) copie dans `parameters.dependency_results` tous les résultats de tous les blocs acceptés des prédécesseurs. Cela fournit bien des données à la consolidation ; dire que `depends_on` ne transmet rien serait faux. Mais il n’existe pas de sélection explicite de sortie, de schéma de collection ou de projection adaptée au consommateur. Les résultats sont indexés par IDs techniques de run et bloc.

Le [connecteur fournisseur](../../../backend/connectors/providers.py#L131) sérialise ensuite les paramètres dans le prompt et refuse plus de 100 000 caractères (ligne 138). **Contrôle pur : quatre sorties de plan de 28 000 caractères donnent à elles seules 112 192 caractères de `dependency_results`**, avant mission, profil, demande et autres résultats. Cette mesure ne constitue pas une nouvelle exécution de C1 ; elle démontre l’incompatibilité des volumes admis entre ces deux chemins.

**Impact.** Une coordination un peu longue peut devenir impossible à déléguer alors que chaque résultat est recevable individuellement. Support ou meeting agrègent aussi des transcripts, constats et brouillons. La pagination du suivi utilisateur ne borne pas ce contexte interne.

**Correction minimale.** Séparer dépendance de contrôle (« après réussite de R1 ») et liaison de données (« prendre R1.result et ses références de preuve »). Créer un manifeste durable borné, avec titre, projet, résultat, référence d’artefact et état de validation. Donner au consommateur un lecteur paginé autorisé de ces artefacts, ou des extraits sélectionnés explicites s’il n’a pas de lecteur. Ne pas tronquer silencieusement un plan ou augmenter seulement la limite.

**Validation attendue.** C1 consolide dix résultats volumineux ; tous les résultats nécessaires sont accessibles avec provenance. Aucun appel n’envoie la totalité des historiques. Une dépendance rejetée reste identifiable et ne devient pas un résultat réussi. Le volume du prompt initial est borné indépendamment du nombre de pages de preuves.

### F04 — Paralléliser les copies ne suffit pas à intégrer les modifications

**Cause.** Un candidat conserve l’inventaire complet de ses sources. [`materialize`](../../../backend/connectors/candidates.py#L145) exige que cet inventaire soit inchangé ; [`apply`](../../../backend/connectors/candidates.py#L266) le vérifie également avant toute écriture (lignes 289–290). Le [test existant](../../../tests/test_workflow_candidates.py#L42) confirme qu’un autre fichier ajouté suffit à invalider matérialisation et application.

**Conséquence établie par le code.** Deux candidats A et B créés sur la même base, même s’ils modifient des fichiers distincts, ne peuvent pas être appliqués successivement tels quels : appliquer A modifie l’inventaire attendu par B. Ce garde protège les changements concurrents. Il manque un parcours d’intégration/rebase contrôlé, pas une suppression du garde.

Par ailleurs, [`dependency_satisfied`](../../../backend/workflow_engine/engine.py#L26) signifie « run terminé sans refus ni issue bloquée ». Elle ne signifie ni « candidat intégré », ni « ensemble testé », ni « livraison observée ». C1 peut donc devenir prête après réception des propositions individuelles sans que leur combinaison ait été constituée. Les vérifications liées à un candidat sont solides mais [limitées à son run et sa référence](../../../backend/connectors/candidates.py#L220).

**Correction minimale.** Définir une base de coordination et une étape d’intégration explicite : récupérer les candidats reçus, créer une proposition combinée, présenter les conflits, exécuter la QA du candidat combiné, puis appliquer ou publier ce candidat exact. Pour la première version, un seul intégrateur séquentiel suffit. Les demandes qui touchent une ressource partagée incompatible peuvent être sérialisées ; le parallélisme ne doit pas être un objectif au détriment d’un résultat intégrable.

**Validation attendue.** Deux branches qui modifient des fichiers distincts aboutissent à un candidat combiné testé ; deux branches contradictoires montrent un conflit avant application. Une modification utilisateur est préservée. Des demandes sur deux repos produisent deux candidats et deux preuves de livraison, pas une réussite globale basée seulement sur la fin des agents. Un meeting utilise une consolidation documentaire sans candidat de code.

### F05 — Le lancement par vagues laisse la continuité dans la mémoire du coordinateur

**État réel.** [`dispatch_conversation`](../../../backend/workflow_engine/runtime.py#L187) est volontairement une vague : quatre lancements maximum, 100 vérifications, pagination. Le résultat demande de rappeler `dispatch` ; [`dispatch`](../../../backend/workflow_engine/runtime.py#L154) ignore les blocs agent/task/document pilotés par conversation. Le [README de rc.12](../README.md) décrit correctement cette limite. Aucun défaut de concurrence n’est déduit de cette seule décision.

**Écart produit.** Une fois « exécuter le plan » demandé, une cinquième tâche prête, une réponse arrivée ou une QA terminée ne suffit pas à lancer la suite. Il faut un nouvel acte du coordinateur ou de l’utilisateur. Si la session native termine son tour ou disparaît, les futurs lancements autorisés ne sont pas portés par un objet durable. Le bouton ne sélectionne que les demandes de la page affichée. Pour une grande coordination, le filtrage du suivi modifie donc aussi le périmètre de lancement.

**Correction minimale.** Garder le mode explicite par vague, mais distinguer « lancer ces étapes » et « exécuter ce plan jusqu’au prochain point d’arrêt ». Pour le second, enregistrer un périmètre autorisé, sa révision, budget/concurrence et conditions d’arrêt. Un ordonnanceur du moteur consomme les événements et ne réclame que les blocs devenus prêts dans ce périmètre. Redémarrage et lecture de statut ne créent pas de nouvelle autorisation. Les effets incertains restent exclus de toute répétition automatique.

**Validation attendue.** Un plan de six tâches démarre quatre exécutants, puis les suivantes libérées, après un seul lancement du périmètre. Fermer/réouvrir la vue ne change rien. Un accord manquant arrête seulement la branche concernée. Une septième tâche ajoutée n’est pas enrôlée implicitement. La reprise après redémarrage vérifie les tentatives, sans double lancement.

### F06 — Changer de modèle change aussi implicitement d’outils et de mode de travail

**Cause.** Dans [`preflight`](../../../backend/workflow_engine/runtime.py#L84), le chemin natif est déduit du type de bloc, du mode non-edit et de l’égalité fournisseur/modèle avec la conversation. Un tel bloc est crédité de `text`, `read`, `edit`, `shell`, `native-tools`. Hors de ce chemin, le worker texte n’a que `text`, et le worker d’édition a `text/read/edit`. Le [pont natif](../../../backend/workflow_cli.py#L64) refuse de prendre en charge un autre fournisseur/modèle et renvoie vers `execute`.

**Contrôle pur.** Un bloc QA demandant `shell` passe le précontrôle avec le modèle de la conversation. Changer seulement son modèle retourne `executor.capabilities-missing: shell`. Le refus est protecteur ; le couplage est surprenant et empêche d’exprimer simplement « même mission et mêmes outils, autre modèle ».

Les [modèles release/express](../../../backend/workflow_engine/work_templates.py#L83) exigent `shell` pour leurs contrôles. Les workers actuels ne font donc pas toute la chaîne QA de ces modèles. Leur profil `odoo-tester` n’ajoute pas un shell. Dans le terminal, changer de profil ne crée pas non plus un second agent indépendant : le même coordinateur peut porter successivement plusieurs rôles. L’interface rc.12 distingue déjà l’ownership natif, ce qu’il faut conserver.

Enfin, `dispatch` effectue un précontrôle de l’exécuteur, alors que [`workflow_cli.execute`](../../../backend/workflow_cli.py#L84) réclame puis exécute directement le bloc. Cela mérite un contrat d’admission commun : tous les points d’entrée doivent vérifier les mêmes capacités avant de consommer une tentative. Cela ne prouve pas qu’un outil interdit est réellement accessible.

**Correction minimale.** Introduire un choix d’exécuteur explicite, indépendant du fournisseur : terminal de coordination, worker de fichiers, commande isolée, connecteur. Un profil reste une méthode. Afficher et figer les capacités requises/disponibles de cet exécuteur ; les adapter au fournisseur par une qualification réelle. Pour une QA indépendante, spécifier l’indépendance attendue, pas seulement le nom du profil. Un bloc qui nécessite un environnement métier prépare ou sélectionne cet environnement explicitement.

**Validation attendue.** Changer Codex vers Claude ou changer de modèle conserve le contrat du bloc ; si l’exécuteur équivalent n’existe pas, l’éditeur expose précisément ce manque avant lancement. Un QA avec un autre profil dans le même terminal n’est pas présenté comme une réception indépendante. `dispatch`, `execute` et lancement automatique appliquent la même admission.

### F07 — Qualification réelle de la lecture/édition, notamment hors des extraits initiaux

**Faits.** [`candidates.prepare`](../../../backend/connectors/candidates.py#L38) copie les sources autorisées et borne les extraits à 60 000 unités budgétaires calculées sur leur JSON encodé ; l’inventaire textuel est lui aussi borné. Le texte de contexte propose `Glob`, `Read`, `Grep` pour les autres fichiers. Le [test d’inventaire](../../../tests/test_candidate_workspace.py#L231) vérifie que les fichiers existent dans la copie et que les extraits sont bornés ; il n’exécute pas un modèle qui retrouve une information omise.

[`providers.command`](../../../backend/connectors/providers.py#L42) désactive `shell_tool` et `unified_exec` pour Codex. Pour Claude, elle autorise explicitement `Read,Edit,Write,Glob,Grep` dans la copie. Le vocabulaire du contexte est donc propre aux outils Claude, alors que le parcours Codex réellement disponible doit encore être démontré. Les autres gardes et les noms de flags ne suffisent pas à conclure qu’un modèle Codex peut, ou ne peut pas, lire tous ces fichiers.

Les [fixtures de découverte](../../../tests/native_cli_fixture.py) interdisent l’exécution réelle. Les [tests candidats](../../../tests/test_workflow_candidates.py#L20) modifient eux-mêmes `calc.py` avant capture. Ces tests sont utiles pour le moteur ; ils ne qualifient ni la navigation de sources par un modèle, ni ses outils effectifs, ni une réponse conforme avec les options CLI installées.

**Décision recommandée.** Classer chaque couple fournisseur/exécuteur/version CLI comme « détecté » ou « qualifié », avec preuves distinctes. Ne pas annoncer une régression fournisseur sans sonde réelle autorisée. Corriger déjà le contexte pour qu’il décrive les outils effectivement disponibles, sans imposer des noms de l’autre fournisseur.

**Test de qualification manquant.** Un dépôt synthétique contient plus de 60 ko d’extraits, un fichier cible absent de ces extraits et une consigne nécessitant de retrouver puis modifier ce fichier à partir d’un indice. Pour chacun des fournisseurs : observer les outils réels, vérifier le contenu exact du diff, l’absence de changement hors copie et le retour JSON. Ajouter un fichier listé mais trop gros pour les extraits, une interruption, une question, une sortie structurée invalide et une version CLI non compatible. Consigner version, modèle demandé/observé et outils observés. Ce test nécessitant un fournisseur réel n’a pas été lancé ici.

### F08 — Les I/O ne décrivent pas encore la structure des demandes et des collections

**Cause.** [`validate_outputs`](../../../backend/workflow_engine/contracts.py#L35) vérifie seulement les types primitifs. Une sortie `array` n’a pas de schéma d’élément ; une sortie `object` n’impose pas ses champs. **Contrôle pur : `requests: [1, null, "not a request"]` est accepté pour le type `array`.** Les plans, critères et propositions des modèles sont principalement des chaînes.

Le bloc [`join`](../../../backend/workflow_engine/engine.py#L297) attend la terminaison de ses entrées, relie leurs ports puis retransmet les valeurs nommées. Il ne fait pas une collecte automatique dans un tableau. Deux sources distinctes mappées vers la même entrée sont admises à la validation du graphe, mais des valeurs différentes sont refusées pendant l’avancement (ligne 310). Le refus empêche d’écraser silencieusement une valeur ; le libellé « Réunir » peut néanmoins laisser attendre une agrégation.

**Impact.** Impossible de vérifier proprement « ce bloc produit N demandes avec source, critères, projet et workflow », puis de les suivre comme telles. Dans un graphe fixe, l’utilisateur doit créer manuellement des ports différents et une étape de transformation. Un composant réutilisable est développé statiquement par [`expand`](../../../backend/workflow_engine/contracts.py#L193) ; il n’instancie pas N exécutions d’après un tableau runtime.

**Correction minimale.** Ajouter un petit ensemble de contrats structurés versionnés : demande, référence d’artefact, verdict, candidat, action externe. Distinguer dans l’éditeur « attendre plusieurs branches » et « collecter leurs résultats ». La décomposition dynamique peut d’abord être une commande transactionnelle du moteur validant un tableau de demandes ; il n’est pas nécessaire d’introduire immédiatement un langage d’expression universel.

**Validation attendue.** Une demande sans identifiant/source/critères est rejetée avant création. Une collection conserve les valeurs de deux branches avec leurs provenances. Une branche non applicable est distinguée d’un échec. Une relance après interruption ne crée pas de nouveaux enfants pour les mêmes éléments. L’éditeur montre le schéma de l’élément et un exemple de valeur transmise.

### F09 — La reprise technique existe ; la requalification métier manque de relation durable

**Cause.** [`Engine.retry`](../../../backend/workflow_engine/engine.py#L548) reprend une tentative remise, avec mêmes entrées et limite du bloc. Les [branches d’échec release/express](../../../backend/workflow_engine/work_templates.py#L53) demandent d’ouvrir une nouvelle tâche et terminent avec une issue bloquée. Le [support indéterminé](../../../backend/workflow_engine/work_templates.py#L24) suit le même principe. `add` ne possède ni `supersedes`, ni `correction_of`, ni adaptation liée du workflow. `depends_on` est seulement une précédence sur réussite ; il ne convient pas à une correction qui doit justement suivre un échec.

**Impact.** Une collecte déjà enregistrée sous un mauvais modèle ne peut pas être requalifiée en conservant une relation formelle vers sa suite. Une correction après QA rouge devient une nouvelle demande dans la liste ; la consolidation qui dépend de l’ancien run bloqué ne sait pas que cette nouvelle demande peut le remplacer. Une nouvelle clé contourne le problème humainement mais perd la causalité pour le moteur.

**Correction minimale.** Garder l’historique et offrir une action de requalification : créer une demande de remplacement liée à l’ancienne, décrire le changement de périmètre/workflow et proposer la mise à jour des dépendances encore non exécutées. Une correction bornée peut ensuite devenir un sous-parcours explicite du modèle. Ne pas convertir les anciens échecs en succès ni réutiliser automatiquement leurs accords.

**Validation attendue.** Une QA rouge ouvre une correction liée ; la consolidation attend le résultat corrigé accepté. L’ancien défaut et ses preuves restent consultables. Reprendre la même tentative se distingue de changer de méthode. Un no-op légitime (« déjà corrigé », « aucune modification nécessaire ») est une issue prévue d’un workflow adapté, jamais un faux diff pour satisfaire `edit`.

### F10 — La route métier du pack Odoo est choisie trop tôt et trop globalement

**Cause.** [`setup.configure`](../../../backend/workflow_engine/setup.py#L19) choisit la route Studio pour Online ou si aucun manifeste de module n’est trouvé, puis attribue profils et mode d’édition aux modèles release/support. Les modèles déjà connus sont conservés (lignes 27–32). Ce comportement préserve les personnalisations, ce qui est souhaitable ; il ne fournit pas une qualification de chaque demande ni une migration proposée du contrat.

**Impact.** Un dépôt sans module au moment de son enregistrement peut nécessiter un module pour une demande future ; un dépôt avec modules peut recevoir une demande de configuration, support ou document. Une méthode sélectionnée d’après la structure du dépôt devient une contrainte de toutes les demandes du modèle. Les évolutions des modèles intégrés ne mettent pas à jour les modèles déjà installés, et l’utilisateur ne dispose pas ici d’un diff d’évolution guidé.

**Correction minimale.** L’environnement du projet exprime les possibilités et contraintes ; la qualification de la demande choisit méthode et workflow. Le pack propose des profils et modèles, avec politique de compatibilité versionnée. Une mise à jour propose un diff et une nouvelle révision ; elle ne réécrit ni les personnalisations ni les runs. Le noyau n’a pas besoin de connaître Studio pour appliquer cette règle générique.

**Validation attendue.** Un même projet peut recevoir support, configuration et développement avec leurs modèles respectifs. Online exclut les opérations incompatibles sans imposer un bloc de code. Un nouveau modèle de pack est proposé avec différences et choix de migration ; l’ancien historique reste intact.

### F11 — L’éditeur doit commencer par mission, données et exécuteur effectif

**Constat de lecture UI.** L’[inspecteur](../../../src/studio.js#L518) présente fournisseur, modèle, profil, capacités sous forme de lignes `text/read/edit/shell/native-tools`, mode `text/edit`, effort et session. La session principale reste proposée « à qualifier » alors que le connecteur ne sait pas l’exécuter. Les [mappings de composant](../../../src/studio.js#L531) demandent du JSON ; les [ports](../../../src/studio.js#L482) montrent essentiellement noms et types. La configuration exprime les détails internes plus directement que le résultat observable attendu.

La nouvelle [vue d’ensemble](../../../src/conversation-view.mjs#L67) est utile : demandes, activité réelle, ownership, dépendances. Elle reste cependant une projection de frères indépendants. Elle ne peut pas montrer un plan parent, son accord, la source d’une décomposition ou une intégration qui n’existent pas dans le contrat. Une nouvelle disposition seule ne résout donc pas F01–F04.

**Correction minimale.** Pour un bloc : « Résultat attendu », « Entrées », « Sorties », « Exécuteur », « Critères et issues ». Pour un exécuteur IA : fournisseur/modèle, outils disponibles et profil facultatif. Prévisualiser clairement « ce bloc sera traité dans votre terminal » ou « nouvelle session isolée, sans shell ». Les choix impossibles sont désactivés avec raison ; les options avancées restent accessibles. Mapper les ports à partir des valeurs et schémas, avec JSON en vue experte seulement.

**Validation attendue.** Un utilisateur crée un support et un compte rendu sans connaître `execution_mode` ou `native-tools`. Il peut voir pourquoi le bloc QA nécessite une commande ou un terminal, et où passent source, plan, résultats et preuves. Lorsqu’il ouvre une demande, il retrouve son plan parent sans perdre le terminal. Cette réception nécessite une observation utilisateur ; elle n’a pas été faite dans cette passe.

## Architecture minimale proposée

Cette évolution conserve `Engine` comme écrivain unique, les versions figées, les jetons de tentative, les preuves et les décisions existantes. Elle ne nécessite pas un autre orchestrateur parallèle au moteur.

1. **Coordination durable.** Étendre la conversation avec intention/source, révisions de plan, relations enfants et points de décision communs. Garder le texte conversationnel comme interface ; enregistrer les faits métier validés dans le moteur.
2. **Demandes typées.** Une création transactionnelle reçoit titre, résultat, critères, source, projet(s), référence de workflow et relations. La clé d’idempotence couvre source + élément de décomposition. Un modèle de traitement fixe reste parfaitement valable pour une demande simple.
3. **Contrat d’exécution séparé.** Mission/I/O/critères d’un côté ; exécuteur/capacités de l’autre ; profil et fournisseur comme paramètres vérifiés. Précontrôle partagé par toutes les entrées. La qualification du fournisseur prouve des capacités, pas seulement la présence d’un binaire.
4. **Exécution autorisée du plan.** Périmètre enregistré, limites, conditions d’arrêt, ordonnanceur événementiel idempotent. Le mode par vague reste disponible. Lancer et réessayer après échec sont deux actions distinctes.
5. **Collecte et intégration.** Manifestes de résultats référencés, pas d’énormes paramètres recopiés. Une étape peut produire une synthèse, un candidat combiné, plusieurs livraisons ou un brouillon. Le résultat et sa QA sont liés à l’objet effectivement livré.

Le graphe fixe actuel peut servir à la coordination et aux demandes. Pour commencer, une commande de décomposition crée N runs enfants et une commande de collecte rassemble leurs références. Ajouter ensuite un bloc graphique « Traiter chaque demande » est une projection de ce contrat ; ce bloc ne doit pas inventer un second état caché dans le renderer.

### Exemple cible — quatre corrections

```text
Intention + source
        ↓
Recueillir / analyser → plan P1 : R1, R2, R3, R4
        ↓ accord portant exactement sur P1
Créer les demandes avec leurs modèles et critères
        ├── R1 : analyse → candidat → QA ──┐
        ├── R2 : analyse → question → … ──┤
        ├── R3 : configuration → preuves ─┤
        └── R4 : analyse → candidat → QA ─┘
        ↓ collecte selon le contrat du plan
Intégrer / vérifier l’ensemble
        ↓
Proposition de livraison → accord exact → livraison observée
```

La question de R2 ne bloque pas R1/R3/R4. L’intégration ne devient pas prête par simple achèvement de quatre processus. La route de R3 peut rester sans code. Une livraison Odoo ajoute les règles et preuves de ce domaine ; un autre domaine utilise le même moteur.

### Exemple cible — support puis suite

Le diagnostic peut se terminer sans correction. Il produit constat, niveau d’urgence, preuve et suite proposée. Une correction éventuelle est une demande liée avec son workflow, ses critères et sa méthode ; elle n’est pas un diagnostic transformé silencieusement en développement. Un brouillon d’email est un résultat. Son envoi est un effet séparé. Une urgence peut choisir une route de livraison accélérée définie par le modèle, sans confondre décision d’urgence et accord exact de l’opération.

### Exemple cible — meeting

Transcript et pièces deviennent des sources référencées. Le compte rendu et la liste structurée d’actions sont relus. Chaque action peut être déléguée à un modèle différent, ou rester un suivi sans exécution automatique. La publication du compte rendu et la préparation du brouillon sont deux blocs avec des I/O et capacités distinctes. Ce parcours ne possède aucun candidat Git obligatoire ni dossier de release imposé.

## Parcours UI/UX à recevoir

**Concevoir.** Ouvrir/créer un modèle ; dessiner mission et étapes ; inspecter les données échangées ; choisir exécuteurs et outils ; vérifier sa compatibilité. Le graphe peut occuper l’espace principal pendant cette phase, avec le terminal conservé et rappelable.

**Lancer.** Choisir un modèle, projet ou ensemble de projets, puis parler dans le terminal. La saisie initiale est une intention, pas automatiquement une demande de code. Le panneau montre la collecte et la proposition de plan. Le moteur conserve la source et les demandes après acceptation.

**Travailler.** Le terminal reprend la place principale ; le panneau montre le plan, les demandes actives, les questions et le prochain point d’arrêt. Sélectionner une demande affiche son graphe ; sélectionner un bloc affiche ses entrées, résultat, exécutant et preuve. Une seule fenêtre, une seule coordination.

**Décider.** Une décision montre son périmètre exact, les objets concernés et ce qu’elle autorise ensuite. Les questions peuvent être alimentées dans le terminal ; les validations exactes restent attachées à leur objet. La vue ne présente pas une fin de processus comme une QA métier.

**Finir / reprendre.** Montrer ce qui est reçu, intégré, publié, livré et ce qui reste bloqué. Rouvrir retrouve le même plan, ses enfants et ses tentatives. Une correction apparaît sous son origine ; un changement de modèle ouvre une nouvelle révision expliquée. Les documents exportés rendent cette chaîne compréhensible dans le repo.

## Plan de correction et critères de sortie

| Lot | Résultat à rendre concret | Critères de sortie |
|---|---|---|
| 1 — Contrat de coordination | Intention distincte ; enfants avec modèle/source ; portée du plan | F01/F02 : un parent, quatre demandes et C1 corrects ; scénario meeting hétérogène ; aucune duplication à la reprise |
| 2 — Exécuteurs et qualification | Choix explicites, précontrôle commun, capacités observées | F06/F07 : Codex/Claude qualifiés séparément pour texte/édition ; QA ne dépend plus d’un nom de profil ; aucune substitution cachée |
| 3 — Exécution durable et I/O | Périmètre autorisé, événements, références de résultats | F03/F05/F08 : six travaux sous plafond quatre ; reprise sans double lancement ; collecte volumineuse bornée et complète |
| 4 — Intégration et corrections | Candidat d’ensemble, QA exacte, relations de remplacement | F04/F09 : convergence de branches distinctes ; conflit explicite ; correction reliée après QA rouge |
| 5 — Modèles et expérience | Création/configuration simple, support/meeting/Odoo au même niveau | F10/F11 : routage par demande, migrations proposées, parcours observé sans JSON obligatoire ni second écran/app |

Un lot doit être reçu sur un parcours entier, pas uniquement par un nombre de tests unitaires. Le lot 1 est prioritaire sur une nouvelle décoration du graphe : sans objets durables corrects, les vues suivantes continueront à expliquer des contournements.

## Tests métier du moteur à ajouter ou compléter

1. **Intention initiale depuis l’UI et depuis le terminal.** Les deux entrées donnent la même coordination, sans demande de code parasite. Sources ambiguës → question traçable pendant le recueil.
2. **Décomposition idempotente.** Quatre demandes, plusieurs workflows/projets, interruption entre créations ; reprise sans doublon ni enfant orphelin.
3. **Accord révisable.** Accord P1, ajout R5, extension R2 et retrait d’une demande ; effets précisément couverts ou invalidés.
4. **Six travaux et ressources.** Quatre démarrent ; la suite progresse dans le périmètre autorisé. Une ressource partagée reste exclusive. Pour du cross-projet, tester une ressource réellement commune : les [verrous actuels](../../../backend/workflow_engine/engine.py#L379) sont préfixés par projet et ne représentent pas à eux seuls un même service partagé entre deux projets.
5. **QA native et QA déléguée.** Le test dit laquelle s’exécute, avec quels outils et sur quel candidat/environnement. Deux profils d’un même coordinateur ne comptent pas comme deux agents indépendants.
6. **Convergence de code.** Deux candidats même base, fichiers distincts puis contradictoires, édition utilisateur concurrente, QA de l’ensemble et application exacte.
7. **Consolidation volumineuse.** Dix demandes avec longs plans, pièces et preuves ; références lisibles et aucune limite de prompt contournée par troncature.
8. **Échec puis correction.** Nouvelle demande liée, ancien échec conservé, dépendance mise à jour sous contrôle et résultats invalidés uniquement si nécessaire.
9. **Support / meeting génériques.** Diagnostic sans code, actions hétérogènes, brouillon sans envoi ; pas de route Odoo implicite.
10. **Qualification fournisseurs.** Fichier absent des extraits, outils réellement observés, JSON conforme, question, reprise et interruption. Simulation et faux agent restent explicitement des tests de protocole.
11. **Recette d’usage.** Observer une personne créer un modèle, comprendre ses I/O, le lancer, répondre, suivre quatre demandes, relire le résultat et reprendre plus tard. Elle ne doit pas connaître les commandes internes pour comprendre ce qu’elle autorise.

## Contrôles purs réalisés pendant cette passe

Commande exécutée : Python avec `-B`, `PYTHONPATH=backend`. Imports `contracts.validate`, `contracts.validate_outputs`, `runtime.preflight`. Catalogue fournisseur passé explicitement en mémoire avec `installed/usable=True` ; aucun appel à une CLI, aucun `Engine`, aucune écriture d’état.

| Contrôle | Résultat observé | Limite de la preuve |
|---|---|---|
| Bloc QA `required_capabilities=['shell']`, modèle identique à la conversation | `issues=[]` en mode natif | Ne prouve pas que le terminal dispose effectivement de tous les outils |
| Même bloc, seul `node.model` change | `executor.capabilities-missing`, `shell` | Prouve la sélection implicite d’exécuteur, pas une panne de fournisseur |
| `validate_outputs` sur un `array` contenant `[1, null, 'not a request']` | Accepté | Le type primitif fonctionne ; le schéma métier manque |
| Deux sorties texte mappées vers la même entrée d’un `join` | Graphe accepté par `validate` | Le conflit de valeurs ultérieur est établi par lecture de `_advance`, pas exécuté ici |
| JSON de quatre plans de 28 000 caractères dans `dependency_results` | 112 192 caractères | Calcul de volume ; aucune consolidation réelle lancée |

## Protections et acquis à conserver

Le moteur est écrivain unique. Les tentatives sont réclamées avant lancement. Les résultats et les décisions ne sont pas interchangeables. Un diff absent ne devient pas une modification. Un candidat doit correspondre à ses sources et à une QA explicite. Les modèles exécutés sont figés. Les dépendances refusées ne deviennent pas réussies. Les plugins natifs ne sont pas automatiquement autorisés comme transports du runtime. Les lectures de suivi ne lancent pas de modèles payants. Le pack Odoo reste optionnel.

Ces protections expliquent plusieurs blocages récents : le moteur refuse à juste titre ce que le mauvais modèle lui demande. L’amélioration consiste à représenter correctement le travail et sa coordination, puis à rendre ce contrat facile à dessiner, utiliser et suivre.

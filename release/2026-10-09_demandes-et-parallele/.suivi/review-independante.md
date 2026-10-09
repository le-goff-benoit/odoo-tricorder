# Réception indépendante — demandes, parallélisme et historique

État du 9 octobre 2026. Sources de travail rc12, après correction des trois
contre-exemples ci-dessous. Aucun client, terminal client, fournisseur réel,
publication ou installation utilisé. Aucun état SQLite/JSON retouché. Les
fixtures sont créées par les commandes validées du moteur.

## Verdict actuel

**Périmètre local rc12 reçu** : correctifs de dispatch, compteurs de demandes,
historique lisible et paginé, vue d’ensemble, navigation sans nouveau terminal
et réponse à une question en disposition compacte. La contre-épreuve du dernier
bundle lève la réserve compacte initiale.

Ce verdict ne reçoit pas une refonte du cycle complet demandé par l’utilisateur :
dessiner un workflow, l’alimenter au terminal, décomposer un travail en demandes,
les traiter indépendamment puis consolider leur résultat. Les écarts
structurels ci-dessous restent explicitement hors du périmètre corrigé.

Le moteur actuel représente une conversation comme une liste d’exécutions
complètes du même workflow. Il ne représente pas les demandes à l’intérieur
d’un bloc de travail, ni une consolidation distincte de ce workflow. Ce décalage
explique la répétition des parcours et des validations observée. Une nouvelle
vue et un bouton de lancement ne modifient pas ce contrat.

La sonde UI indépendante reçoit le parcours à 1600 px et à 1024 px / zoom 125 %,
avec conservation du terminal unique. Ce rapport ne remplace ni la recette
complète ni les contrôles du paquet pilotés par le responsable, et ne décrit
pas une recette d’un fournisseur réel.

## Contre-exemples indépendants corrigés

Preuve : `tests/test_rc12_independent_review.py`. Première exécution : trois
échecs reproductibles ; après corrections du développeur et du responsable :
les trois mêmes tests passent sans adaptation des assertions.

| Gravité | Défaut reproduit | Conséquence et correction reçue |
|---|---|---|
| P1 | `execution_modes=['native']` disparaissait du graphe réduit passé au précontrôle de `dispatch_conversation`. Un worker géré était lancé malgré ce contrat. | Les métadonnées de la définition figée sont maintenant conservées ; aucun Popen ni tentative pour ce workflow. |
| P2 | Une consolidation annulée conservait `coordination_wait` et restait comptée dans les dépendances en attente. | Le compteur exige maintenant une exécution suspendue. |
| P2 | Un autre run créé par `Engine.start` avec un paramètre `conversation` identique était compté sans appartenir aux items. | Les agrégations partent maintenant de la liste des exécutions autorisées de la conversation. |

La dernière contre-épreuve indépendante comporte cinq tests verts : les trois
régressions ci-dessus, la mesure de taille de l’historique et la démonstration
du contrat structurel actuel. Les deux derniers tests documentent une limite ;
leur succès ne signifie pas que cette limite satisfait le besoin utilisateur.

## Écarts structurels qui restent ouverts

### P1 fonctionnel — le découpage ne crée pas des sous-demandes du travail

Preuve exécutable :
`test_collection_requests_and_consolidation_all_receive_same_full_release_graph`.
Le test utilise le vrai modèle `release-conversation`, crée une collecte et
accepte son plan par l’API humaine, puis ajoute R1 à R4 et C1 dépendant de ces
quatre demandes. Les six items possèdent exactement les mêmes neuf blocs. Les
quatre validations `scope` sont propres aux nouvelles exécutions ; accepter le
plan initial ne les accepte pas. C1 contient encore `work`, `check`, `delivery`
et `receipt`.

Cause : `Conversations.add` copie `conversation.definition` puis appelle
`Engine.start`. Son contrat ne propose ni workflow enfant distinct, ni bloc
parent, ni catégorie coordination/consolidation. `depends_on` retarde une
exécution complète ; il ne transforme pas celle-ci en étape de consolidation.

L’instruction ajoutée au terminal pour ne plus créer une demande de
développement pour la collecte est utile. Elle ne change ni les exécutions
existantes ni la nature de C1. Le moteur a raison de conserver les validations
indépendantes ; les partager implicitement pour masquer le problème serait
incorrect.

Le contrat à définir doit distinguer le travail parent, les demandes qu’il
produit, le workflow de traitement d’une demande et les étapes communes après
ces demandes. Ce mécanisme doit être générique : il s’applique aussi à une
analyse de support ou à des actions issues d’un compte rendu. La UI doit rendre
ce lien visible sans créer une seconde application d’orchestration.

### P1 fonctionnel — paralléliser des candidats ne les consolide pas

Constat de source, sans application sur un dépôt client :
`connectors/candidates.py::prepare` copie le dépôt courant pour chaque travail.
Il ne compose pas les candidats présents dans `dependency_results`.
`apply` exige ensuite l’égalité de l’inventaire complet avec celui du candidat.
Après application d’un premier candidat, un second candidat issu de la même
base peut donc être refusé même si ses fichiers modifiés sont différents.

Cette prudence protège le dépôt. Elle signifie toutefois que quatre demandes
terminées ne forment pas encore un candidat de release testé. Une dépendance
C1 ne fournit pas une fusion, une résolution de conflit, une QA de l’ensemble
ni une preuve liée au candidat global. Une recette de quatre workers démarrés
ne doit pas être présentée comme une recette de release parallèle complète.

### P2 fonctionnel — un worker ne possède pas les outils du terminal

Constat de source : `connectors/providers.py::command` ouvre une session neuve
sans configuration utilisateur, règles du projet ou MCP hérités. Le mode
texte désactive les outils et reçoit un prompt contenant les entrées et les
paramètres du bloc. Le mode édition donne accès à une copie et aux outils de
fichiers, sans shell général ni outils externes.

Ainsi une demande qui référence seulement le chemin du mail et de ses pièces
ne suffit pas à un worker texte pour les lire. Un profil spécialisé n’accorde
pas les outils du terminal. Le précontrôle détecte les capacités explicitement
requises ; il ne peut pas déduire du texte libre qu’une mission exige des accès
non déclarés.

Pour le cycle demandé, le modèle doit rendre explicites la mission, les sources
transmises, les capacités nécessaires et l’exécutant choisi. Le coordinateur
doit pouvoir distinguer un traitement autonome possible d’un travail à faire
dans le terminal. Le libellé « lancer les demandes prêtes » ne doit pas laisser
croire que tous les rôles sont interchangeables à capacités égales par défaut.

### P2 à grande échelle — historique maintenant paginé après contre-épreuve

Mesure indépendante : dix tentatives créées par les API Engine sur un bloc,
avec entrées, sorties, résumé, aperçu, preuves et motif de reprise longs. Puis
appel de la projection pure `attempt_history` avec le budget par bloc utilisé
pour des graphes de 200, 500 et 1000 blocs. Aucun état de 1000 blocs n’est
fabriqué ou enregistré.

| Nombre de blocs extrapolé | Taille des seuls historiques projetés |
|---|---:|
| 200 | environ 3,67 Mo |
| 500 | environ 9,17 Mo |
| 1000 | environ 18,35 Mo |

La réponse Electron est limitée à **8 MiB** ; **4 MiB** est la limite d’entrée.
Le cas 200 ne prouve pas un problème usuel. Le contrat autorise cependant 1000
blocs : le plancher de 128 octets et le coût des références rendent possible
une réponse dépassant le transport, avant même d’ajouter définition et état
courant. Paginer les historiques par bloc ou les demander à l’ouverture serait
plus robuste qu’une accumulation systématique sur chaque rafraîchissement.

Correction reçue depuis cette mesure : lorsque l’historique excède son budget,
`run_detail` renvoie un marqueur et le lecteur charge au plus trois tentatives
par page. Notre contre-épreuve parcourt les neuf tentatives archivées, dans
l’ordre affiché 9 à 1, sans perte, et relit le résumé complet via ses références
SHA. Les deux tests UI `attempt-history.spec.cjs` ont ensuite réussi sur le
bundle reçu. Le motif courant est également borné. Le test de projection pure
à 1000 blocs du responsable complète cette preuve ; aucune base de 1000 blocs
n’a été exécutée par ce reviewer.

## Réception visuelle indépendante — première passe et défaut conservés

Bundle examiné : `dist/app.js`
`0e11f32609bd2859ca69a7c3c9f491dc72850e9e238a75d8b00341a61b77b977` ;
`dist/studio.css`
`d192a642eefc2d1136a4135771d38e74579a30f4cea2639176f5dc603bcdaf2f`.

Sonde : `/tmp/tricorder-rc12-independent-ui.cjs`. Fixture légale du développeur
réutilisée, puis question imprévue ajoutée indépendamment par `ask` : R1 attend
cette réponse, R2 a une tentative native synthétique en cours, R3 et R4 attendent
une décision, R5 est en échec après reprise, C1 dépend de R1 à R4. Aucun modèle
réel n’a été exécuté. Captures dans `review-ui/`, à côté de ce rapport.

- `overview-1600.png` : les six titres, états distincts, projets, agent actif et
  dépendances sont accessibles dans une vue compréhensible. Les actions ouvrent
  la bonne demande.
- `question-1600.png` : la question imprévue est attachée à R1.
- `overview-1024-125.png` : pas de débordement horizontal, mais seule une partie
  de la liste est visible ; le défilement est nécessaire et explicable.
- `question-1024-125.png` : **réserve P2 de lisibilité**. Les en-têtes successifs
  laissent la question visible mais le champ et le bouton de réponse sous le
  bas du panneau. Le terminal n’a plus que 46 pixels CSS utiles, environ trois
  lignes. Le défilement permet de répondre ; il ne rend pas le dialogue et le
  suivi confortables simultanément.
- Une réponse a été saisie via le formulaire : toujours six demandes,
  disparition de la question, R2 toujours en cours. Ouvrir ensuite R3 via sa
  dépendance et revenir à l’ensemble conserve l’unique identifiant de PTY.

`review-ui/result.json` conserve le résultat et les identifiants synthétiques.
Ses mesures initiales `overview` et `inspector` sont nulles car ces éléments
sont dans le shadow DOM : elles ne prouvent aucune dimension. La mesure du
terminal et les captures portent le constat visuel. Les assertions Playwright
utilisent des locators traversant correctement ce shadow DOM.

## Contre-épreuve compacte — réserve levée

Même scénario, même question, mêmes dimensions, sans reconstruire le bundle.
Les captures initiales ci-dessus sont conservées exactement. Les nouvelles
captures et mesures sont dans `review-ui-compact-after/` ; sonde dérivée :
`/tmp/tricorder-rc12-independent-ui-compact-after.cjs`.

Bundle reçu : `dist/app.js`
`412d4d33f2b6b8f617303e0fc80535ead98731c486f8d4e315f639a1b630e764` ;
`dist/studio.css`
`15411f7160b38d7a4ab4dc4e1a0023f63509497b00db0833d72de065fbf55f86`.

À 1024 × 768, zoom 125 %, les mesures indépendantes donnent :

- terminal utile : **152 pixels CSS**, contre 46 avant correction ;
- inspecteur : 178 pixels CSS de haut, position de défilement initiale zéro ;
- question, saisie et bouton « Répondre » entièrement visibles ensemble ; le
  bouton finit à 598,1 pixels CSS, avant le bas de l’inspecteur à 614,4 ;
- aucun débordement horizontal ; un unique identifiant de PTY avant/après ;
- réponse enregistrée sans doublon : six demandes, R2 toujours en cours,
  question de R1 résolue ; navigation vers R3 puis retour à l’ensemble correcte.

La comparaison de `question-1024-125.png` avant/après montre une amélioration
effective de la surface de dialogue. La liste globale et le contenu long d’une
décision restent défilables, ce qui ne masque plus le formulaire court testé.
Les vues à 1600 pixels ont également été reprises et restent lisibles. Aucun
autre test UI ou build n’a été lancé en parallèle par ce reviewer.

## Ce qui est bien séparé dans les sources examinées

- `Engine.claim` conserve le quota global de quatre étapes et la réservation
  transactionnelle des ressources. `dispatch_conversation` valide d’abord
  l’appartenance de toute la sélection, puis traite une vague bornée.
- Les étapes en cours, remises, suspendues et annulées ne sont pas relancées
  comme si elles étaient prêtes. Les décisions humaines restent des portes du
  moteur. Une question ne transforme pas une réponse en autorisation générale.
- Le dispatch ne crée pas une file permanente de futures consommations. Cette
  limite est expliquée au coordinateur. Elle impose de relancer explicitement
  la vague après un résultat ou une décision.
- Les compteurs de conversation sont globaux, indépendants du filtre et de la
  page ; la liste reste paginée et les dépendances hors page sont résolues.
- L’historique lisible est une projection. Les tentatives originales et leurs
  preuves demeurent disponibles ; le lecteur de preuve vérifie que la
  référence appartient à l’exécution. Cette amélioration répond au problème
  de JSON brut, sans prétendre valider un résultat métier.

## Réception encore nécessaire

1. Décider et tester le contrat parent/demandes/consolidation, avec un cas réel
   synthétique où chaque demande a un état différent. Une question sur R1 ne
   bloque pas R2 à R4 ; la consolidation ne devient prête que selon son contrat.
2. Achever la recette globale et les contrôles du paquet sur le candidat reçu ;
   la réserve compacte de cette revue est levée, preuves avant/après conservées.
3. Pour toute revendication de release parallèle, recevoir la composition des
   résultats et la QA du candidat global, distinctes des QA individuelles.

Les changements examinés n’ont pas été publiés par le reviewer.

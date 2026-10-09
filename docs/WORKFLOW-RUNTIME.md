# Concevoir, exécuter et reprendre un workflow

Ce guide décrit les usages et contrôles du moteur de Tricorder. Les preuves
de réception sont conservées dans les dossiers de release ; leurs simulations
et fournisseurs de substitution ne qualifient pas une messagerie, un modèle
commercial ou une recette métier Odoo.

## Lancer et résoudre une configuration incomplète

**Exécuter…** vérifie le fournisseur, les connexions et tous les projets choisis.
**À résoudre avant le lancement** présente le projet, l’étape et l’action utile.
Après le réglage, **Revenir au lancement** retrouve la demande et le périmètre.
Une planification retrouve aussi sa fréquence, son heure et son fuseau ; ses
consentements d’activation doivent toujours être donnés explicitement.

**À préparer pendant le workflow** désigne un prérequis nécessaire plus tard.
Pour le pack Odoo, la copie locale neutralisée peut être préparée pendant la
conversation. Elle reste obligatoire pour prendre en charge la recette ; un
contexte de production ou distant reste refusé. Les paramètres Odoo disposent
de champs lisibles, dont **Version d’Odoo** et **Référence de la copie de test**.
La référence est une déclaration de contexte, pas une preuve de recette réussie.

Le contrôle natif du dialogue et celui de l’ouverture partagent le même contrat.
L’effort est transmis au fournisseur, même si son modèle par défaut est utilisé.
Un bloc exigeant un effort différent de la conversation est signalé avant
lancement ; l’utilisateur doit choisir explicitement le réglage adapté.

Le mode de pilotage appartient à l’exécution, pas à la définition portable.
Réenregistrer un ancien modèle portant un contexte de conversation le nettoie
sans changer ses anciennes exécutions. Il peut ensuite être lancé ou planifié
automatiquement avec les contrôles habituels et de nouvelles décisions.

## Lire avant de décider

Pour plusieurs demandes, **Vue d’ensemble** montre leurs états, leurs agents
en cours et leurs dépendances. Les compteurs portent sur toute la conversation,
même pendant une recherche ou sur une autre page. Ouvrir **Demande** conserve
le terminal et une seule surface de lecture à côté : **Graphe** ou **Détail**.
Le titre nomme la demande sélectionnée. Le sélecteur
**N demandes** ouvre sa liste, la recherche et l’ajout ; il se referme après le
choix. L’état et une action directe restent au-dessus de la surface.

Une décision présente le plan ou l’opération exacte avant ses boutons et nomme
la demande concernée. Une question montre d’abord son texte et la réponse. Un
échec montre d’abord sa cause, puis **Préparer la reprise** si elle est autorisée.
Le dialogue indique le budget restant et prépare l’étape ; il ne prétend pas
démarrer un nouvel agent. Après préparation, suivre l’action indiquée dans le suivi.
Les tentatives précédentes affichent date, compte rendu, raison de reprise et
preuves. Un historique volumineux se lit par pages de trois tentatives ; ses
entrées techniques restent repliées. Le nombre de tentatives utilisées explique
pourquoi une reprise n’est plus proposée. Choisir un workflow adapté ouvre un
nouveau lancement sans réécrire les résultats de l’exécution précédente.
Un effet externe incertain conserve **Rechercher l’accusé distant**, sans renvoi
aveugle. Un résultat QA négatif prévu par une branche reste recevable : accepter
le constat permet d’emprunter la branche corrective, cela ne valide pas le code.

Les résultats métier structurés sont présentés en sections, listes et tableaux
selon leur contenu. **Voir les résultats** donne accès aux résultats validés
d’une demande terminée, avec le bloc source et le numéro de tentative. Le
rapport conserve le parcours complet ; les détails techniques restent accessibles.
Les valeurs peuvent être sélectionnées pour copie. Une preuve
s’ouvre dans un lecteur local paginé (32 000 caractères par page), lié à
l’exécution et vérifié par son empreinte. Il n’ouvre aucun chemin arbitraire ni
contenu actif. Les gros contenus ont une référence et un aperçu explicitement
identifié. Une projection volumineuse est relue depuis l’exécution par son
empreinte ; elle ne crée pas de nouvelle preuve à chaque actualisation. Si cette
valeur a changé, actualiser le détail avant de la relire. Le rapport conserve les entrées, sorties et preuves ;
l’export inclut les événements de toutes les pages et les preuves des tentatives
précédentes.

Une question reste une **Réponse attendue**, y compris dans une phase repliée et
l’icône système. Le clic dans l’icône sélectionne le bloc concerné.

La synthèse distingue étapes en cours, questions, décisions, erreurs et demandes
attendant d’autres demandes. Le statut du bloc sélectionné reste distinct des
échecs des autres blocs. Le détail d’une attente liste ses prédécesseurs avec leur
nom et leur état ; un refus ou une fin non résolue ne libère pas la suite. Une
suspension manuelle reste explicite même après la réussite des dépendances.

En mode graphe, la sélection initiale centre l’étape à traiter. Le suivi peut
avancer vers la nouvelle étape courante lorsque l’on suivait la précédente ;
la lecture d’un détail et la saisie ne sont jamais déplacées par cette mise à jour.
Le choix Graphe/Détail reste conservé entre demandes. Le menu est utilisable au
clavier et Échap le ferme, y compris après un rafraîchissement.

Le terminal garde sa session pendant les changements de demande, de vue et de
disposition. Le choix explicite de l’afficher ou de le masquer reste conservé
pendant la navigation ; un lancement explicite ouvre sa conversation. **Contexte** déplie ses réglages ; l’onglet distingue Codex, Claude
et le shell après arrêt de l’agent. Une autre conversation reste identifiée comme
telle : **Terminal** dans le suivi retrouve celle du workflow affiché. En cross-projet, le contexte nomme à la fois le projet du shell et celui de la
demande affichée. Changer de demande ne change pas le dossier de travail du shell.
Les actions secondaires restent dans les menus du suivi.

## Lancer plusieurs exécutants

**Lancer les demandes prêtes** porte sur les demandes affichées dans la page.
Le préflight en lecture seule `execution.launch` distingue disponibilité d’un
exécutant, conversation native, configuration manquante et attente temporaire
(quota ou ressource). Il vérifie au plus 100 blocs sur la page et affiche au plus
25 raisons par demande ; ce qui dépasse est signalé comme non vérifié. Le
lancement revérifie ces conditions et revendique le travail atomiquement.
Une définition figée n’est jamais retouchée pour rendre un agent disponible :
l’interface permet de préparer explicitement une copie pour un nouveau lancement.

**Ajouter une demande** accepte plusieurs prérequis, avec recherche et pagination.
Tous doivent réussir. Un prérequis annulé ou terminé sans autoriser la suite reste
visible comme tel ; créer une demande de remplacement ne transfère aucun accord.

Le pont du terminal expose aussi `dispatch` : `{}` utilise la conversation,
`{"runs":["identifiant-execution"]}` sélectionne les exécutions. Les réponses
sont paginées avec `offset`, `limit` et `next`. Pour une définition comportant
plus de 100 blocs à vérifier, `items[].next_node` permet de poursuivre avec
`node_offsets: {identifiant-execution: index}`.

Un appel démarre une vague sans attendre sa fin, avec quatre exécutants maximum
dans tout le moteur. Les ressources, dépendances et validations continuent de
s’appliquer. Un deuxième appel ne duplique pas une tentative déjà lancée. Le
suivi distingue un agent délégué d’un bloc pris en charge dans le terminal ; un
dernier signal ancien invite à vérifier l’activité au lieu d’affirmer sa progression.

Ce lancement n’enregistre pas de file autonome : le coordinateur doit rappeler
`dispatch` après les résultats ou décisions pour poursuivre le périmètre autorisé.
Une consultation ou une actualisation ne lance aucun agent. Les étapes réservées
au terminal restent signalées ; la commande ne leur invente pas d’autres outils.

Les demandes sont encore des exécutions complètes d’un même workflow. Le moteur
ne représente pas encore leur rattachement à un bloc parent, la portée d’une
validation commune ou l’intégration de candidats de code parallèles. Le lancement
concurrent ne prouve donc pas une release intégrée : voir
l’[analyse des écarts et critères de réception](../release/2026-10-09_demandes-et-parallele/ANALYSE.md).

## Historique et usage quotidien

**Nouvelle demande** réutilise un workflow du projet. **Créer un workflow** ouvre
un nouveau dessin. Les exécutions et demandes se lisent par pages de 25, avec
recherche ; l’historique propose état, réel/simulation et archives. Un clic sur
une exécution charge son détail, pas le contenu de tous les autres résultats.
L’icône système reçoit des résumés et compteurs ; les workers sont parcourus par
lots de 50. Avec beaucoup d’exécutions, un lot complet demande plusieurs ticks.

Le pont natif `ready` reçoit `{run, offset?, limit?}` et renvoie
`{items, parameters, project, total, next}` (25 blocs par défaut). Les paramètres
ne sont transmis qu’une fois. Continuer avec `next` jusqu’à `null` ; ce format
paginé remplace l’ancienne liste répétant le contexte à chaque bloc. `claim` et
les mutations utilisent aussi les références `$artifact` : `read` permet de lire
leur contenu complet par pages. Les consignes des nouvelles sessions décrivent
ce contrat ; une ancienne session peut consulter ce guide ou être reprise.

**Annuler** empêche les nouvelles étapes de partir et signale l’arrêt aux outils
en cours. Un effet externe peut déjà avoir eu lieu : annulation n’est pas retour
arrière. L’archivage conserve définitions, accords, résultats et preuves. Il
refuse un travail encore actif ou une tentative non terminée. Un projet ou un
workflow planifié doit avoir ses planifications suspendues avant archivage.
Restaurer une planification la laisse suspendue jusqu’à sa réactivation explicite.
Une conversation clôturée peut être restaurée pour recevoir de nouvelles demandes.

Les définitions exécutées sont immuables : un archivage ou une modification du
modèle ne change pas une exécution antérieure. Les paramètres d’effort et de
session sont conservés lorsqu’on change seulement le fournisseur et le modèle IA.

## Créer, relier et réutiliser

**Projets → Nouveau projet** propose un espace local ou un dépôt existant.
L’espace local initialise Git sans commit ni remote ; aucune préparation de
Git n’est nécessaire pour commencer un workflow métier. Pour un dépôt existant,
son chemin peut être choisi ou collé ; sa validité est contrôlée à la création.

Dans l’éditeur, chaque bloc possède une consigne, des critères et des entrées/sorties.
**Relier** propose les branches réelles, y compris les choix par défaut d’une
décision neuve. Les propriétés du bloc montrent quelle sortie alimente quelle
entrée ; le lien indique le nombre de données. **Ne transmettre aucune donnée**
crée uniquement un ordre d’exécution. Choisir une autre sortie pour la même entrée
remplace le choix automatique. Une liaison ambiguë est refusée avant exécution.
Une décision refusée conserve son libellé de refus, sans badge de succès trompeur.
**Réorganiser le graphe** propose une disposition des branches, annulable ; ouvrir
un workflow ne déplace pas ses blocs. Sélectionner un lien permet de le relire
et de le retirer explicitement. Une entrée nommée ne reçoit pas automatiquement
le texte initial : ce texte fait partie du contexte de la consigne, tandis que
les entrées sont alimentées par les sorties reliées des blocs précédents.

**Options → Réutiliser…** copie le workflow vers les modèles ou un projet.
Ses composants sont inclus, les anciennes demandes et leur contexte sont retirés.
Les consignes et réglages métier sont conservés. La copie évolue indépendamment ;
aucune exécution, validation ni planification n’est transférée. Les exemples
personnalisés de simulation sont retirés par défaut ; une case permet de les
conserver explicitement.

L’éditeur s’ouvre à 100 %. Dans un panneau étroit, sélectionner un bloc donne
la surface du panneau à ses propriétés, avec **Retour au graphe** et
**Appliquer au bloc** toujours visibles. Redimensionner ne remplace pas le
formulaire et ne perd pas la saisie. Le terminal conserve sa session.

## Édition depuis le terminal et le graphique

**Éditeur → Fichier JSON du workflow…** montre le fichier effectivement enregistré.
Le formulaire en cours est conservé localement. Si le fichier JSON a changé,
**Enregistrer** ouvre une comparaison de la base enregistrée, du brouillon et du
fichier. Les champs distincts se fusionnent ; un champ modifié des deux côtés
exige un choix explicite. Les blocs et liens sont comparés par identifiant.

On peut enregistrer la fusion, adopter le fichier, ou enregistrer le brouillon
en copie. Un fichier invalide reste intact et la copie du brouillon reste possible.
Après adoption du fichier, **Éditeur → Récupérer le brouillon précédent** permet
de retrouver le travail abandonné. Une nouvelle modification du fichier entre
comparaison et enregistrement invalide la résolution proposée.

Le brouillon est stocké dans les données locales de l’application ; il n’est pas
un commit Git ni une sauvegarde indépendante de l’ordinateur.

## Agent actif, terminal disponible et reprise

Retrouver une conversation n’en crée pas une seconde. Si la CLI s’est terminée,
le shell peut rester ouvert : l’application affiche **Agent arrêté** dans le
suivi, l’activité et la vue d’ensemble. Un bloc traitable par la conversation
reste indiqué **Dans la conversation**, même si son agent délégué facultatif
n’a pas de modèle configuré. Une suspension manuelle de la demande possède sa
propre action **Reprendre la demande**, distincte de la reprise de l’agent.
**Reprendre l’agent…** est une action explicite qui exige le prompt du shell et
annonce qu’elle annule toute sa ligne de saisie, y compris à droite du curseur.
Elle attend ensuite un **nouveau** signal de prompt avant la commande de reprise ;
sans ce signal, aucune commande n’est envoyée. Aucun texte de reprise n’est envoyé à
un programme arbitraire. Bash fournit un signal privé avant chaque commande et
avant son prompt principal : `read`, un heredoc et un programme au premier plan
ne sont pas des prompts. Les marqueurs sont filtrés du terminal. Une session fournisseur connue est reprise par son
identifiant ; sinon une nouvelle invocation relit les demandes déjà enregistrées.

Après une réponse graphique, le workflow enregistre la réponse et rend le bloc
prêt. Continuer dans le terminal, ou reprendre explicitement l’agent arrêté.
Il n’y a pas de saisie automatique injectée dans une CLI encore active. Les
anciens services PTY et shells autres que Bash, sans ce signal vérifié, ne permettent pas cette reprise
sécurisée ; leurs sessions restent préservées. Fermer explicitement une ancienne
session devenue inutile permet de créer ensuite une session gérée par le service
à jour, sans arrêter les autres terminaux.

## Tentative interrompue

**Vérifier la tentative interrompue** examine les processus enregistrés et les
résultats durables. **Terminer cette tentative interrompue** est disponible
seulement si l’absence de processus est vérifiable. Elle libère ressources et
place d’exécution, conserve un résultat d’échec, et ne relance aucun travail.

Les workers gérés enregistrent PID, début de processus, session et démarrage du
système ; leurs sous-processus sont enregistrés avant leur exécution. Le contrôle
inclut les enfants survivants d’une session dont le processus principal a fini.
Un résultat durable se réconcilie d’abord. Un résultat tardif d’une tentative
terminée est rejeté.

Le pont natif enregistre l’identité de l’agent à la prise du bloc lorsqu’elle est
identifiable. L’expiration d’un heartbeat ne prouve jamais l’arrêt d’un agent
natif sans identité. Pour une ancienne tentative rc.7 dépourvue d’identité, on
peut réconcilier son résultat ou terminer le bloc dans sa conversation. Après
redémarrage de l’ordinateur, les processus locaux de l’ancien démarrage sont
forcément absents ; les effets externes restent à vérifier. Aucun verrou ancien
n’est effacé sur une simple présomption d’inactivité.

Une opération interrompue sans résultat peut avoir produit un effet externe :
vérifier son accusé avant une nouvelle proposition. Une notification possédant
un effet déjà journalisé conserve son mécanisme de réconciliation/idempotence ;
une reprise manuelle ne répète pas l’envoi.

## Opérations dynamiques et candidats

Une opération externe peut référencer une entrée avec `{"input":"version"}` ou
`{"input":"candidate.sha256"}`. Dans les champs Action/Cible/Candidat de
l’éditeur, `@version` représente la première forme. Aucun code ni expression
arbitraire n’est évalué.

Le moteur résout l’opération avant la décision, y associe toutes les entrées
reliées et fige la proposition. Le contenu affiché est celui envoyé à
l’adaptateur, avec l’identité de connexion vérifiée. Le corps d’un brouillon
relié à `inputs.body` est donc réellement transmis. L’accord et le registre des
effets dépendent du contenu exact ; un changement demande une nouvelle proposition.
Les OAuth et outils des fournisseurs ne sont pas automatiquement partagés avec
Tricorder : une connexion MCP stdio ou un adaptateur local doit être configuré.

Dans l’inspecteur d’un bloc de travail ou de commande, activez **Contrôle QA du
candidat** (`candidate_check: true`). Reliez l’entrée `candidate` au producteur.
Pour un agent ou une tâche, la case ajoute une sortie `verdict` : le résultat doit
contenir `pass` ou `fail`, avec preuves. Une commande doit terminer avec le code
0 et produire sa preuve. Ni un titre/profil « QA », ni un document, ni un join
ne constituent ce contrat. Le modèle de proposition de code le déclare déjà.

L’application locale d’un candidat exige une QA acceptée du même candidat et ses
preuves intactes, ainsi que toutes les décisions suivantes pertinentes approuvées.
Elle fonctionne pour une QA commande ou agent ; un verdict `fail`, une QA absente,
en attente, sans preuves, ou une décision refusée bloque l’application. Les
anciens graphes sans ce contrat explicite restent non applicables. Configurez
le contrôle puis lancez une nouvelle exécution ; l’ancienne définition et ses
preuves ne sont jamais réécrites pour obtenir un accord rétroactif. Le producteur peut
ajouter `application_requires: ["qa", "review"]` pour désigner d’autres contrôles.
Les blocs de QA reçoivent le candidat sous le port `candidate`. Les références `application_requires` sont adaptées aux
identifiants des composants, y compris imbriqués. Une branche
conditionnelle écartée par le moteur ne compte pas comme une QA manquante ;
il faut toutefois au moins une QA recevable sur la branche choisie. Un contrôle
nommé dans `application_requires` reste obligatoire, même dans une branche
écartée : cette configuration doit être corrigée, pas contournée.

## Sous-workflows et capacités

Les ports publics d’un sous-workflow sont reliés par défaut aux ports de même nom
et type des blocs d’entrée/sortie. Un mapping explicite est possible :

```json
{
  "inputs": {"demande": "string"},
  "outputs": {"diagnostic": "string"},
  "input_mapping": {"demande": {"node": "analyse", "port": "request"}},
  "output_mapping": {"diagnostic": {"node": "analyse", "port": "finding"}}
}
```

Plusieurs destinations d’entrée utilisent une liste de couples `node`/`port`.
Des résultats concurrents incompatibles sur la même entrée sont refusés. Les
composants imbriqués conservent leur provenance et un refus terminal ne débloque
pas la branche de succès du parent. Le précontrôle UI développe les composants
avec le même validateur que l’exécution.

`required_capabilities` décrit les besoins du bloc : `text`, `read`, `edit`,
`shell` ou `native-tools`. Le mode texte automatique ne peut satisfaire une mission
de modification ou d’exécution de tests. Une copie isolée d’édition autorise les
fichiers, mais demande un bloc Commande pour les tests. Le mode natif peut utiliser
les outils de sa CLI ; les étapes déléguées à un autre modèle/fournisseur doivent
avoir leurs propres prérequis. `execution_modes` peut limiter un modèle à
`native` ou `automatic`. Les profils d’agents décrivent une méthode ; ils ne
prouvent aucune capacité d’exécution.

## Travaux encore distincts

Le point d’entrée suivi par le graphe est la **conversation native du workflow** :
ouvrir le workflow choisi, **Exécuter… → Lancer dans le terminal**, puis lui
demander « va chercher cet email et prépare une release ». Cette session reçoit
le pont vers le moteur et les projets autorisés. Un shell libre ou une ancienne
session IA de projet peut utiliser ses propres outils, mais ne reçoit pas
automatiquement ce pont ; ses actions ne deviennent donc pas des blocs suivis.
**Retrouver la conversation** rouvre la session liée ; **Reprendre l’agent…**
relance explicitement une CLI arrêtée dans ce même terminal.

L’agent utilise les outils et connexions réellement disponibles dans la
CLI choisie, ou lit le `.eml` local fourni. Il recherche, désambiguïse si
nécessaire, lit l’original et ses pièces, prépare le dossier et le plan dans le
dépôt, puis enregistre les demandes par le pont du workflow. L’utilisateur n’a
pas à recopier le mail dans des formulaires. Sans accès mail, l’agent doit
annoncer que la recherche n’a pas été effectuée et demander la connexion ou une
source locale. Les outils natifs ne deviennent pas des connecteurs automatiques
Tricorder par ce seul usage.

L’agent conserve une seule copie de l’original et des pièces avec manifeste de
provenance, chemins relatifs et empreintes. Les demandes réutilisent ces liens
et des clés stables : une reprise ne crée pas de doublons. Les images ne passent
pas dans le JSON du pont. Avec le pack Odoo, l’agent suit sa préparation et la
convention du projet ; le suivi de la conversation reste celui de Tricorder.
L’initialisation du plan du pack (`odoo_plan.py init`) prépare les documents ;
son démarrage historique (`start`) ne doit pas créer un suivi d’exécution en
doublon de la conversation Tricorder. Les fichiers sont préparés localement pour être versionnés ; aucun commit,
push ou déploiement n’est implicite. Des observations ne sont ni un diagnostic,
ni des tests réussis. La recette emploie un adaptateur mail local et une CLI
déterministe de substitution, pas une connexion client ni un modèle payant.

Le scénario synthétique à quatre demandes vérifie qu’une question métier dans
la première laisse les trois autres avancer. La réponse reprend cette seule
demande. Une cinquième tâche de **consolidation technique**, explicitement
distincte des quatre besoins, dépend de leurs résultats : elle reste suspendue
jusqu’aux QA reçues. L’application ne devine pas les demandes obligatoires ni
leur risque métier ; le plan doit déclarer ces dépendances. La conservation des
liens est testée après réouverture et la reprise du terminal est couverte par le
parcours Electron séparé.

Pas de boucle automatique correction → QA → correction, ni d’héritage automatique
OAuth, ni de qualification de Slack/Gmail réels dans cette recette. Sauvegarde et
restauration cohérentes de l’ensemble base + artefacts + configurations, rétention,
disque plein et mesure du coût du polling restent des chantiers séparés.
Les anciennes définitions personnalisées ne sont pas réécrites automatiquement
avec les nouvelles exigences des modèles.

Les reproductions avant correction restent dans `docs/audits/2026-10-09-audit-complet/`.
Les nouvelles contre-épreuves sont dans `tests/test_audit_fixes.py`,
`tests/audit-model.test.cjs` et les scénarios `audit reception` du banc Electron.

## Relire une décision et retrouver les demandes

Le contenu d’une décision défile dans son panneau ; la demande, la portée de
l’accord et ses actions restent accessibles en pied. Les commentaires sont
conservés lors des changements de taille. Lorsqu’une réception avec critères
exige un commentaire, son caractère obligatoire est indiqué. Chaque accord
reste lié à la proposition et à la tentative affichées.

Dans Activité, les questions et décisions à traiter précèdent les reprises,
les demandes prêtes et les attentes de dépendances automatiques, avant pagination.
Ce classement ne mesure pas l’urgence métier et ne crée pas de priorité ou
d’échéance. Le total global et les nombres affichés par section sont distingués.
La vue d’ensemble donne directement accès à **Ajouter une demande…**.

Le compteur du suivi sépare les étapes traitées des branches non applicables.
Une décision refusée est traitée ; cela ne signifie pas que le travail a réussi.
Les résultats validés techniquement ne prouvent pas une réception métier.

Dans Planifications, fréquence et fuseau restent lisibles sur la carte et dans
Version planifiée. Un remplacement reprend les réglages horaires et les jours
choisis, démarre sa configuration en Simulation et ne reprend ni autorisation de
notification ni accord d’activation de la précédente version.

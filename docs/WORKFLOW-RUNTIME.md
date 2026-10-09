# Concevoir, exécuter et reprendre un workflow

Ce guide décrit les corrections issues de l’audit du 9 octobre 2026. Les essais
utilisent des projets synthétiques, des CLI de substitution et des adaptateurs
locaux. Ils ne qualifient ni un modèle payant, ni une messagerie réelle, ni une
recette métier Odoo. La review indépendante et la publication suivent cette
implémentation.

## Lire avant de décider

Sélectionner un bloc d’exécution affiche ses **Entrées reçues**, leurs sources,
son **Résultat** et ses **Preuves**. Une décision présente les données à examiner
avant ses boutons. **Lire le résultat** donne toute la largeur du panneau à la
revue ; **Graphe et détail** remet le graphique, dans la même fenêtre. Le terminal
reste disponible avec la disposition mémorisée.

Les valeurs sont affichées en texte brut, sélectionnables pour copie. Une preuve
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

La conversation résume les états des demandes affichées : question, décision,
travail en cours, étape prête et échec sont distingués. Chaque carte nomme son
étape utile ; le titre au-dessus du graphe est celui de la demande sélectionnée,
pas celui d’une release entière. Sélectionner une demande ouvre son étape à
traiter et centre le graphe dessus. Le polling ne recentre pas la vue. Le mode
lecture reste conservé quand on passe à une autre demande. Les sources d’une
question sont repliables sous son texte, et les chaînes de texte métier utilisent
la police de lecture ; JSON et preuves brutes gardent une police monospace.

Quand le panneau sous le terminal mesure moins de 480 px de haut, la synthèse
des demandes devient un sélecteur repliable. Ouvrez-le pour choisir une demande ;
la sélection conserve le mode lecture. Le titre, l’état et les actions utiles
restent dans le panneau sans changer votre ratio terminal/workflow. À 1440 × 900,
la question et sa réponse sont visibles avec un terminal à 52 %. À 800 px de
large, le contenu reste défilable ; ce n’est pas une vue simultanée de toutes
les informations. En mode graphe, changer de demande centre son bloc courant ;
les rafraîchissements suivants conservent votre position.

Les commandes secondaires d’exécution sont regroupées dans **Workflow** et
**Outils** ; celles de la conversation dans **Actions**. **Rechercher** déplie
le filtre des demandes. Lorsqu’un agent est arrêté, **Reprendre l’agent…** est
affiché directement ; le shell encore ouvert ne passe pas pour un agent actif.

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

## Édition depuis le terminal et le graphique

Le formulaire en cours est conservé localement. Si le fichier JSON a changé,
**Enregistrer** ouvre une comparaison de la base enregistrée, du brouillon et du
fichier. Les champs distincts se fusionnent ; un champ modifié des deux côtés
exige un choix explicite. Les blocs et liens sont comparés par identifiant.

On peut enregistrer la fusion, adopter le fichier, ou enregistrer le brouillon
en copie. Un fichier invalide reste intact et la copie du brouillon reste possible.
Après adoption du fichier, **Options → Récupérer le brouillon précédent** permet
de retrouver le travail abandonné. Une nouvelle modification du fichier entre
comparaison et enregistrement invalide la résolution proposée.

Le brouillon est stocké dans les données locales de l’application ; il n’est pas
un commit Git ni une sauvegarde indépendante de l’ordinateur.

## Agent actif, terminal disponible et reprise

Retrouver une conversation n’en crée pas une seconde. Si la CLI s’est terminée,
le shell peut rester ouvert : l’application affiche cette distinction.
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

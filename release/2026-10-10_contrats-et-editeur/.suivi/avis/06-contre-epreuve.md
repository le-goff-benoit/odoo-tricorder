# Avis indépendant 6 — contre-épreuves et simplicité de bout en bout

Revue du 10 octobre 2026, bornée à la proposition `ANALYSE.md` et à la lecture du
code de la base rc.12. Aucun autre avis consulté, aucun test exécuté, aucun état
client modifié. Les risques ci-dessous sont des conditions de conception et de
réception ; ils ne constituent pas des défauts déjà reproduits du futur code.

**Avis : direction pertinente, mais l'unité « élément » et le cycle de vie de
l'orchestration doivent être contractualisés avant de multiplier les options de
l'éditeur.** Le minimum produit doit permettre de comprendre et reprendre un
travail réel depuis le terminal, sans apprendre le moteur.

## Six points à résoudre

### 1. P0 — Une file durable doit rendre les interruptions ordinaires, sans doubles agents

La proposition promet une file durable, alors que `runtime.py:208–278` lance une
vague bornée à quatre départs et demande actuellement de relancer les étapes
prêtes. `conversations.py:120–128` reprend des dépendances lors d'une consultation.
`engine.py:526–546` ne contrôle qu'une exécution, sans relation parent/enfants.
Le résultat du worker est déjà durable avant soumission (`runtime.py:365–382`) :
cette bonne protection doit couvrir la nouvelle orchestration entière.

Il manque le protocole précis : autoriser une file, réserver un élément, créer
son enfant, démarrer le processus, enregistrer le résultat, libérer le créneau.
Chaque frontière peut être interrompue. Exiger une identité idempotente
`parent/bloc/élément/version`, une réservation persistée et une reprise qui
réconcilie avant tout nouveau lancement. La suspension doit interdire les nouveaux
départs immédiatement ; préciser si les travaux déjà actifs finissent. L'annulation
doit afficher les travaux encore actifs et empêcher leurs résultats tardifs de
faire avancer le parent. Fermer la fenêtre ne vaut ni suspension ni annulation.

**Réception :** redémarrer le service à chaque frontière, puis lancer deux pilotes
concurrents. Un seul enfant et une seule exécution fournisseur par élément ; les
lectures répétées de l'écran ne créent aucun processus. La file continue au-delà
de sa première page, sous la limite globale et la limite du bloc.

### 2. P0 — Le schéma 2 doit être un contrat traversant, pas seulement un nouveau formulaire de ports

La compatibilité est aujourd'hui une égalité de types dans `contracts.py:178–182`
et `contracts.py:227–239`. `engine.py:306–324` exige la présence des sorties mappées
et compose les jonctions. Modifier seulement `validate_outputs` laisserait les
sous-workflows, branchements et frontières interpréter autrement les mêmes ports.

Définir une seule représentation canonique et ses règles pour : absence,
`null`, liste vide, liste hétérogène, limites de longueur et conversion explicite.
Un ancien `array` ne garantit pas une liste d'intentions structurées. Un plan
contenant plusieurs tâches reste bien un objet unique. Vérifier aussi les contrats
spéciaux `candidate_check`, `route_output` et `question`, qui comparent actuellement
des types littéraux (`contracts.py:138–166`). Refuser une combinaison ambiguë de
versions avant toute exécution, avec le bloc et le port concernés.

**Réception :** le même port doit être accepté/refusé de façon identique dans
l'éditeur, l'import, le sous-workflow, la simulation et le résultat réel. Une
conversion schéma 1→2 ne change aucune exécution ni empreinte historique.

### 3. P0 — « Pour chaque élément » doit porter le plan accepté, le résultat et la reprise de chaque demande

Aujourd'hui `conversations.py:106` recopie tout le workflow pour chaque demande.
Remplacer ce comportement par un fan-out ne suffit pas si l'élément n'a pas une
identité métier et une version. Le plan accepté doit référencer l'ensemble exact
des éléments, leurs dépendances et projets. Une nouvelle intention ne peut pas
être injectée dans le lot déjà approuvé ; elle doit produire une proposition de
révision explicite.

Définir avant réalisation : comportement de la collection vide, doublons
d'identifiants, enfant refusé/annulé/en erreur, reprise d'un seul enfant, résultat
partiel, ordre stable des résultats, et modification du sous-workflow après départ.
Un refus ne doit jamais devenir un résultat vide présenté comme réussi. Choisir
un défaut simple : les éléments indépendants continuent, mais le résultat du lot
reste incomplet tant qu'un élément obligatoire n'est pas reçu. L'utilisateur voit
« 2/4 terminés, 1 question, 1 en cours », avec les quatre intitulés.

**Réception :** réunion avec cinq actions, support avec trois incidents et
développement avec trois changements ; même mécanisme, sans pack Odoo. Une reprise
ciblée préserve les résultats acceptés et ne relance pas les autres agents.

### 4. P0 — « Principal terminé » et « action à reprendre » nécessitent deux cycles de vie

`engine.py:344–346` attend aujourd'hui tous les blocs terminaux pour terminer un
run ; `engine.py:549–557` interdit de reprendre un run terminé et impose des règles
particulières aux effets externes. Mettre simplement un bloc en « facultatif »
créerait donc une contradiction : principal terminé mais bouton de reprise refusé.
Le modèle de notification enfant existant (`notifications.py:43–49`) est un point
de départ pour séparer les cycles de vie, pas une preuve que le cas général est
déjà couvert.

Le résultat principal doit être stable et les actions associées posséder un état,
une autorisation, une identité d'effet et une reprise indépendants. Distinguer
désactivée, en attente d'autorisation, indisponible, échec certain et résultat
distant inconnu. Une notification de question peut devenir obsolète après réponse :
ne pas envoyer automatiquement une ancienne alerte après reconnexion sans règle
de validité. Le bouton « Reprendre » doit expliquer son opération exacte.

**Réception :** brouillon de réunion accepté, notification en panne, fermeture et
réouverture, reprise de la seule notification. Puis réponse distante perdue :
réconciliation sans nouvel envoi, y compris lorsque le principal est terminé.

### 5. P0 — L'intégration doit prouver sa filiation et refaire la QA commune, y compris après interruption

La conception d'une union conservatrice est adaptée. L'application actuelle
vérifie le producteur `edit`, le run source, le SHA et l'inventaire des sources
(`connectors/candidates.py:266–290`) ; `require_checks` exige les preuves liées au
candidat (`:220–264`). Le nouveau producteur moteur doit étendre ces protections,
sans accepter comme preuve une simple liste de références fournie par un agent.

Valider les contributions dans les états moteur et dans le périmètre accepté,
avec tentative/version, puis figer leur provenance dans le candidat intégré.
Tester ajout/suppression/changement de mode, contributions identiques, conflit de
même chemin et base périmée. Une QA verte d'un enfant ne vaut jamais QA du candidat
commun. Une nouvelle intégration après reprise invalide l'accord sur l'ancien SHA.
Cross-projet, afficher les livraisons séparées et leurs résultats partiels.

**Réception :** deux changements testés seuls réussissent, leur combinaison casse
un invariant réel du programme synthétique : la QA commune devient rouge,
l'application reste interdite, les candidats enfants et le dépôt sont inchangés.
Interrompre aussi l'application commune pour vérifier son journal de reprise.

### 6. P1 — L'orchestrateur doit être visible par ses décisions, sans nouvelle couche de jargon

L'écran actuel montre surtout un graphe et son inspecteur (`src/studio.js:299–301`,
`:452–469`). Ajouter une carte « Orchestrateur » sans source d'état augmenterait
la charge visuelle. Le suivi doit commencer par une synthèse courte : objectif,
progression des éléments, travail réellement actif, attente et prochaine action.
Le détail expose quel agent coordonne éventuellement, qui exécute chaque élément
et la raison moteur des attentes. « En cours » doit venir d'une tentative réelle,
pas de la présence d'un rôle dans le modèle. Le terminal et cette synthèse doivent
désigner le même parent et le même élément après navigation.

Pour l'éditeur, vérifier aussi les accidents ordinaires : clic légèrement déplacé,
drag annulé hors fenêtre, zoom durant déplacement, liaison abandonnée, note
recouvrant une carte et clavier sans souris. Une note ne doit ni intercepter les
ports ni devenir une instruction d'agent. `semantic_digest` retire aujourd'hui
la disposition et les positions (`contracts.py:272–279`), mais pas un futur champ
notes : ajouter l'exclusion et vérifier séparément les projections envoyées aux
agents. L'égalité d'empreinte ne prouve pas à elle seule cette absence de fuite.

**Réception :** dans une fenêtre de portable, un utilisateur doit pouvoir répondre
en moins d'une lecture à « qui travaille ? », « qu'attend-on de moi ? » et « quel
élément est bloqué ? », sans ouvrir du JSON et sans perdre la saisie du terminal.

## Matrice de contre-épreuves minimale

| Parcours | Incident injecté | Résultat observable attendu |
|---|---|---|
| Collecte support → plan | Deux réponses/clôtures concurrentes, dont une périmée | Une version acceptée ; aucune intention perdue ; correction proposée à l'autre saisie |
| Réunion → cinq actions | Double lancement, identifiants dupliqués, liste vide | Pas de double enfant ; contrat explicite pour vide/doublon ; noms et compte exacts |
| Plan → trois tâches | Sous-workflow modifié après accord, puis intention ajoutée | Lot figé inchangé ; nouvelle proposition séparée et autorisation cohérente |
| Pour chaque élément → reprise | Arrêt entre réservation/création/spawn/résultat/agrégation | Résultat récupéré ou état inconnu explicite ; aucun lancement doublonné |
| Deux workflows parallèles | Deux pilotes, limite globale saturée, plus de 25 éléments | Limites tenues, attente expliquée, aucun élément oublié après pagination |
| Parent suspendu/annulé | Résultat tardif enfant et demande de départ concurrente | Aucun nouveau départ autorisé ; état tardif conservé sans progression interdite |
| Intégration de développement | Vert individuellement, rouge ensemble ; contribution reprise | Nouveau SHA et vraie QA commune ; application bloquée et anciens résultats conservés |
| Réunion → notification facultative | Principal terminé, effet en échec puis accusé perdu | Principal reste terminé ; reprise ciblée ou réconciliation ; jamais de double envoi |
| Graphe schéma 2 réutilisé | Sous-workflow schéma 1, array inconnu, sortie facultative manquante | Compatibilité explicite ; absence ≠ liste vide ; explication au port concerné |
| Éditeur et terminal | Drag interrompu à deux zooms, note déplacée puis export/import | Position prévisible, annulation complète, focus stable ; note hors exécution et prompts |
| Même support hors Odoo | Aucun pack, changement d'agent compatible avant lancement | Même contrat métier ; capacité manquante signalée avant départ |

Les tests critiques doivent utiliser les commandes publiques et des services
recréés sur le même répertoire temporaire, pas des états intermédiaires fabriqués
directement dans SQLite. Pour les courses, contrôler les frontières avec des
barrières déterministes ; pour la QA commune, exécuter réellement une commande
sur le candidat synthétique. Les fournisseurs et services distants peuvent être
des exécutants locaux factices, à condition de compter leurs appels. Une recette
simulée ne valide pas leur fonctionnement réel.

## Minimum de livraison recevable

Une tranche complète et vérifiée : créer le workflow dans l'éditeur ; collecter
plusieurs intentions ; produire puis accepter un plan unique ; traiter ses
éléments avec deux exécutants réellement concurrents ; répondre à une question ;
reprendre après redémarrage ; recevoir les résultats ; intégrer et tester ensemble
les changements de code lorsqu'il y en a ; terminer le principal malgré une
action associée défaillante. Le tout est lisible dans le même terminal et le même
suivi, avec des notes et des gestes d'édition sans effet sur le contrat.

La livraison doit annoncer précisément les capacités réalisées et les éventuelles
limites restantes. Ne pas présenter un fan-out simulé, une liste de tâches, une
carte d'orchestrateur ou deux QA individuelles comme cette tranche complète.

# Tricorder — workflows et automatisations

**0.6.0-preview.2 · 8 octobre 2026 · Réalisation en cours, release non clôturée.**

Cette page rassemble l’intention, les changements, leurs preuves et les limites.
[Plan détaillé](../../docs/PLAN_WORKFLOWS_2026-10-08.md) ·
[Suivi technique](.suivi/release.json) · [Design](../../docs/DESIGN.md)

## Intention

Tricorder permet de **concevoir, utiliser et suivre** des workflows de développement
ou de monitoring. L’éditeur est une fonctionnalité de l’application. Les workflows
s’appliquent à un projet Git ou fonctionnent globalement ; les modèles de la
bibliothèque sont réutilisables. Odoo Crew est un pack facultatif, et un modèle IA
peut travailler sans agent dédié. Les actions déterministes n’exigent aucun LLM.

Le nouveau format remplace la direction précédente, sans migration des anciens
workflows clients. Leurs dossiers sont conservés. La documentation courante utilise
`release/` et une entrée humaine unique ; le détail machine est regroupé en `.suivi/`.

## Changements et état réel

| Partie | Fonctionnement livré | Limite actuelle |
|---|---|---|
| Navigation | Tricorder en tête ; Vue d’ensemble, workflows globaux, projets, bibliothèque, récurrences et connexions | Recette avec utilisateurs débutants/experts à effectuer |
| Barre latérale | Sous-titre « Éditeur de workflows » et slogan retirés ; espacements compacts, icônes alignées, mode réduit accessible | Vérification locale, pas certification WCAG |
| Moteur et canevas | Versions figées, branches, liens orthogonaux, phases, liste, annuler/rétablir, journal et décisions persistantes | Routage évitant toutes les collisions non implémenté |
| Terminal | Création/adaptation de modèles ou workflows ; rechargement validé ; AGENTS.md version 3 installé et actualisé | Les consignes personnalisées restent conservées, fusion manuelle |
| Exécutants IA | Fournisseur/modèle explicites, agent dédié facultatif ; lecture d’outil possible avant analyse | Sessions natives limitées au texte ; pas de développement autonome outillé qualifié |
| Plugins | Catalogue indépendant des rôles ; inventaire Codex ; adaptateur local vérifiable et exécutable | Un plugin natif Codex/MCP nécessite son adaptateur ; aucune connexion universelle automatique |
| Validation automatique | Option des blocs déterministes : succès, types de sorties et intégrité des preuves ; échecs visibles | Aucun critère métier ni point humain validé automatiquement |
| Surveillance et notification | Filtre d’adresse exact, messages nouveaux, dédoublonnage durable, destinataire et révision autorisés | Parcours qualifié sur adaptateur synthétique ; aucun compte réel connecté |
| Récurrences | Fuseaux/DST, révision et transports figés, non-chevauchement, rattrapage borné | Un changement de configuration suspend la récurrence ; Tricorder doit rester actif |
| Passage vers un projet | Depuis une exécution globale, création d’un brouillon dans un projet Git avec les résultats validés | Pas d’activation ni de routage automatique ; aucun accord transféré |
| Réutilisation de preuves | Option explicite pour commandes/documents, moins de 24 h, contrat et dépendances inchangés ; sources Git contrôlées pour les commandes | À désactiver pour les contrôles dépendant du temps ou d’un environnement variable |
| Déploiement et documentation | Modèles GitHub → Odoo.sh avec deux accords distincts et branche documentaire ; modèle Confluence avec relecture | Cibles, transport métier et vérifications réelles à qualifier ; aucun déploiement réalisé |
| Odoo Crew | Pack importable, rôle expérimental odoo-deployer généré et installé | Migration complète des anciens contrats Crew non réalisée |
| Bureau Ubuntu | Icône, raccourcis, décisions et récurrences ; fermer masque la fenêtre | Quitter arrête le planificateur ; pas de démarrage à la connexion Ubuntu |
| Portabilité et mise à jour | Fichier .tricorder-workflow cliquable, import en brouillon ; recherche GitHub au lancement et téléchargement explicite | Comptes, autorisations et récurrences actives non transférés ; installation explicite |

## Ce qui a été écrit

Le [moteur](../../backend/workflow_engine/engine.py) porte les décisions, les
validations, les transferts et les états ; [reuse.py](../../backend/workflow_engine/reuse.py)
contrôle la réutilisation de preuves. Une branche modifiée invalide ses descendants,
mais pas les résultats indépendants. Une preuve réutilisée affiche son origine et
n’est jamais présentée comme un nouveau test. Les dossiers de suivi `.tricorder/`
et `release/` sont exclus de l’empreinte des sources ; les contrôles qui en dépendent
ne doivent pas activer cette option.

Le [planificateur](../../backend/workflow_engine/schedules.py) conserve les modèles,
packs et transports autorisés. Une occurrence invalide annule ses écritures et se
suspend sans empêcher les autres récurrences. Un résultat arrivé pendant une pause
ne fait pas avancer le workflow avant reprise.

Le [transport local](../../backend/connectors/local_tools.py) et son
[exécutant](../../backend/connectors/tool_runtime.py) assurent des échanges JSON
bornés, la vérification de l’identité de connexion, les preuves et les accusés de
réception. Le registre des effets interdit un renvoi aveugle après une réponse
perdue. Une tâche IA peut recevoir les données lues dans `inputs.tool_data`, avec
ou sans profil spécialisé.

L’[interface](../../src/studio.js) distingue l’application de l’éditeur. La Vue
d’ensemble regroupe les exécutions globales et celles des projets. La
[barre latérale](../../src/studio.css) est vérifiée en fenêtres normale et réduite.

## Configurer un plugin depuis le terminal

Ouvrir le terminal du contexte concerné, configurer le service avec son outil
natif puis déclarer ses capacités dans `.tricorder/plugins.json`. Exemple de
structure, à remplacer par des chemins et un adaptateur existants :

```json
{"schema":1,"plugins":[{"id":"mon-service","title":"Mon service",
"provider":"local","operations":["read","send"],
"transport":{"argv":["/usr/bin/python3","/chemin/adaptateur.py"],"timeout":30}}]}
```

Dans **Connexions**, actualiser puis **Vérifier l’adaptateur…**. La commande est
présentée avant exécution : elle utilise les droits de l’utilisateur et doit être
de confiance. Son authentification reste gérée par l’outil ; aucun secret ne doit
figurer dans le catalogue ou les arguments. Un programme ou catalogue modifié
invalide le contrôle. Le protocole `tricorder.tool/1`, les arguments, l’identité et
les réponses attendues sont documentés dans l’[AGENTS.md embarqué](../../backend/workflow_engine/guidance.py),
également installé dans chaque espace de conception.

Sélectionner la capacité dans le bloc. Une lecture peut alimenter une analyse IA.
Une notification exige son destinataire exact et un accord d’activation explicite.
Une écriture de publication exige un bloc externe et une décision liée à l’action,
la cible et le candidat exacts. L’import d’un workflow ne donne aucun de ces accords.

## Tests et preuves

[Résultats](.suivi/preuves/tests.log) · [Vue d’ensemble](.suivi/preuves/apercu.png)

**149 tests Python, 70 tests JavaScript, 18 parcours Electron sur les sources et
18 sur l’application empaquetée : tous réussis.** Les tests couvrent
notamment les réponses perdues, doublons, modifications de transport, preuves
altérées, pauses, transferts et reprises, ainsi qu’un graphe de **1 000 blocs**.
Le transport est réellement exécuté en sous-processus, avec des données et services
synthétiques. Aucun email réel lu, message réel envoyé ou compte de production utilisé.

Les contrôles Crew précédents restent valables pour ses sources inchangées :
435 tests, dont 1 ignoré, graphe 59 nœuds/129 arêtes, 38 sorties générées conformes.
Les appels payants Codex/Claude, les connexions Confluence/messagerie et le parcours
GitHub/Odoo.sh ne sont pas qualifiés nativement. Les tests locaux ne prouvent pas
un gain de qualité des agents ni une conformité WCAG complète.

## Livraison et suite

Le paquet et son empreinte se trouvent dans `build-artifacts/`. L’exécutable testé
est installé localement dans `~/.local/opt/odoo-tricorder-0.6.0-preview.2/` ; le
lanceur Ubuntu s’appelle **Tricorder** et l’association de fichiers est enregistrée.
La version 0.5.1 et l’ancien lanceur sont conservés pour retour arrière. Aucune
fenêtre en cours n’a été arrêtée ; quitter puis relancer pour charger cette version.
Aucun push GitHub
ni déploiement Odoo.sh n’est effectué ; Benoît fournira les cibles ultérieurement.
Le [fichier d’exemple](exemple.tricorder-workflow) peut être importé sans activation.

La préversion ne clôt pas le plan : restent l’exécution native outillée des agents,
les adaptateurs authentifiés des services retenus et leur recette réelle, la
migration complète Crew, puis la recette humaine d’usage/accessibilité. Ces limites
sont distinctes des fonctions locales déjà implémentées et vérifiées.

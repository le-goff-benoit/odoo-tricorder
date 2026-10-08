# Tricorder — workflows et automatisations

**0.6.0-rc.1 · 8 octobre 2026 · Candidat local à la livraison.**

Tricorder sert à **concevoir, exécuter et suivre** des workflows. L’éditeur est
une de ses vues. Les workflows peuvent fonctionner globalement ou dans un projet
Git ; Odoo Crew reste facultatif. Cette page rassemble le résultat du chantier.

[Plan et critères](../../docs/PLAN_WORKFLOWS_2026-10-08.md) ·
[Design](../../docs/DESIGN.md) · [Suivi technique](.suivi/release.json)

## Fonctions livrées

| Besoin | Résultat |
|---|---|
| Se repérer | Navigation Tricorder compacte, Vue d’ensemble, workflows globaux, projets Git, bibliothèque, récurrences, connexions |
| Construire | Modèles adaptables, blocs et sous-workflows, connexions à angles droits, phases, vue liste, annuler/rétablir, ports et données transmises configurables |
| Choisir l’exécutant | Modèle explicite avec ou sans profil spécialisé ; commandes, lectures et notifications sans IA ; aucun changement automatique de modèle |
| Développer | Proposition de code dans une copie isolée, diff conservé, tests sur cette copie, application locale après réception et confirmation ; conflits contrôlés, récupération après interruption |
| Utiliser des outils | Adaptateur local ou serveur MCP stdio, capacité sélectionnée indépendamment du profil ; commande, compte et outils vérifiés avant activation |
| Être accompagné par l’IA | Proposition de modification du workflow, aperçu avant application, aucun lancement implicite ; terminal pour créer/adapter les modèles et configurer les outils |
| Garder la main | Décisions persistantes, accords liés à l’action/cible/candidat exacts, validations métier humaines ; contrôles techniques automatiques facultatifs |
| Automatiser | Récurrences avec fuseau horaire, versions figées, non-chevauchement ; filtre d’expéditeur exact, messages nouveaux, dédoublonnage et notification autorisée |
| Reprendre | Journal, preuves, réutilisation sélective, transfert global → projet en brouillon ; recherche d’un accusé perdu sans répéter l’envoi |
| Suivre sur Ubuntu | Icône, états, décisions, récurrences et raccourcis ; la croix masque la fenêtre, « Quitter Tricorder » arrête le planificateur |
| Transférer et mettre à jour | Fichier `.tricorder-workflow` cliquable, import examiné en brouillon ; recherche de release stable GitHub au lancement, téléchargement explicite |
| Documenter | Une entrée humaine `release/<id>/README.md`, preuves et suivi machine dans `.suivi/` ; diff de code lié au bilan |
| Utiliser Odoo Crew | Pack 0.2, six profils avec contrat Tricorder dédié ; série et copie locale neutralisée exigées pour la recette ; rôle de déploiement séparé |

Les anciens workflows clients ne sont pas migrés ni supprimés. Les modèles
Confluence et GitHub → Odoo.sh sont configurables ; les décisions staging et
production sont distinctes, et la documentation est une branche facultative.

## Parcours de développement

1. Ouvrir un projet Git et adapter le modèle **Évolution logicielle**.
2. Choisir les modèles et, éventuellement, les profils du pack. Préciser la demande.
3. Le bloc Développement propose ses modifications dans une copie isolée. Examiner
   son diff et recevoir son résultat pour transmettre le candidat aux tests.
4. Le bloc Commande reçoit le port `candidate` et teste cette copie dans `/project`,
   sans accès réseau. Adapter la commande et les critères au projet.
5. Après réception des tests, examiner le diff puis **Appliquer ces modifications
   au dépôt**. Les sources doivent être inchangées depuis la proposition. Aucun
   commit, push ou déploiement n’est déclenché par cette application locale.

Le journal de récupération protège une application interrompue. Si un fichier a
été modifié ensuite par l’utilisateur, Tricorder refuse de l’écraser. Les candidats
sont limités aux fichiers texte, 100 fichiers modifiés et 2 Mo de preuve ; la copie
de départ est bornée à 20 Mo. Les liens symboliques et fichiers sensibles connus
sont exclus. Les environnements métier complets nécessitent leurs outils dédiés.

## Configurer une connexion

Dans **Connexions**, choisir le contexte global, la bibliothèque ou un projet.
**Configurer dans le terminal** ouvre son `.tricorder/`. Configurer le service avec
ses outils, puis déclarer les capacités dans `plugins.json` et actualiser la vue.
Le guide `AGENTS.md` version 4 est installé et mis à jour automatiquement ; les
personnalisations sont conservées.

Deux transports sont disponibles :

- `tricorder.tool/1` : programme local recevant une requête JSON et retournant un
  résultat structuré ; utile pour adapter des formats métier.
- `mcp-stdio` : serveur MCP existant, sonde d’identité de compte, liste explicite
  d’outils et correspondance des arguments/résultats avec JSON Pointer.

Le [contrat et les exemples](../../backend/workflow_engine/guidance.py) sont aussi
accessibles à l’IA dans le terminal. La vérification présente la commande et la
sonde avant leur exécution avec les droits utilisateur. Les outils gèrent leur
authentification ; aucun secret n’est placé dans le catalogue. Un changement de
configuration, de programme, de compte ou de schéma d’outil invalide la vérification.

Un plugin présent dans Codex ne devient pas automatiquement un accès Tricorder.
Il faut un serveur stdio utilisable ou un adaptateur local. Aucun transport HTTP
MCP/OAuth embarqué n’est fourni. Un nouveau service utilisable par ces transports
ne demande ni nouveau type de bloc ni nouveau profil d’agent.

Pour la veille, renseigner compte, adresse exacte et destinataire. L’activation
présente le message et demande l’accord pour les notifications. Une réponse perdue
reste incertaine ; la capacité de lecture `reconciliation` permet de rechercher
son accusé. Sans preuve distante, le moteur ne répète pas l’action.

## Réalisation et preuves

Le [moteur](../../backend/workflow_engine/engine.py) possède les états, décisions,
réceptions et récupérations. Les [candidats](../../backend/connectors/candidates.py)
isolent le code ; le [client MCP](../../backend/connectors/mcp_stdio.py) et le
[runtime d’outils](../../backend/connectors/tool_runtime.py) relient les capacités
au workflow. L’[interface](../../src/studio.js) utilise ces mêmes faits pour le
graphe, le suivi et la documentation.

[Contrôles techniques](.suivi/preuves/tests.log) ·
[Essais natifs](.suivi/preuves/native.json) · [Aperçu](.suivi/preuves/apercu.png)

- **159 tests Python et 70 tests JavaScript réussis.**
- **21 parcours Electron réussis sur les sources et 21 sur le paquet Ubuntu**.
  La version installée et l’empreinte du paquet sont consignées dans le suivi.
- Accessibilité automatisée : aucune violation axe détectée sur les vues testées
  de navigation, canevas, inspecteur et dialogue, en thèmes clair et sombre.
  Ce résultat ne constitue pas une certification WCAG ni une étude utilisateur.
- Cas couverts : graphe de 1 000 blocs, conflits de fichiers, perte de réponse,
  reprise après interruption, doublons, identité/schéma MCP modifiés, décisions,
  récurrences, portabilité, terminal, revue et application du code.
- **Codex 0.161.0 / modèle demandé gpt-6-astra** : réponse structurée et modification
  réelle d’un fichier synthétique réussies ; deux assertions exécutées ensuite
  sur le candidat, dépôt original inchangé. Le flux ne confirme pas l’identifiant
  du modèle observé ; coût monétaire non fourni, jetons conservés dans la preuve.
- **Crew : 436 tests, dont 1 ignoré prévu**, graphe valide et 38 sorties générées
  conformes. Aucun gain comparatif de qualité des agents n’est revendiqué.

## Points externes restant à qualifier

| Point | État et condition de réception |
|---|---|
| Claude Code | Le CLI 2.1.288 répond, mais l’organisation refuse l’accès via l’abonnement. Aucun appel modèle réussi ni bascule vers une clé API. L’administrateur doit permettre cet accès avant la recette native. |
| Messagerie et notifications | Transport testé avec vrais sous-processus et données synthétiques ; compte, expéditeur et destinataire réels à configurer et autoriser |
| Confluence | Serveur/adaptateur authentifié et espace de test à désigner ; vérifier conflit de version, publication et relecture sur cet espace |
| GitHub → Odoo.sh | Dépôt, branche et cible à fournir comme convenu ; vérifier candidat publié, build et version déployée, avec accords séparés |
| Recette d’usage | Retour de Benoît et essais débutants/experts à effectuer ; l’audit automatisé ne les remplace pas |

Ces points empêchent de déclarer la qualification distante complète. Aucune
surveillance réelle, notification, publication Confluence, publication GitHub ou
opération Odoo.sh n’a été effectuée pendant ce chantier.

## Installation et retour arrière

Le paquet Ubuntu et son empreinte sont dans `build-artifacts/`. L’installation
utilisateur se trouve dans `~/.local/opt/odoo-tricorder-0.6.0-rc.1/`, avec lanceur
**Tricorder** et association du fichier portable. La version précédente et son
lanceur sont conservés. Pour charger cette version, **Quitter Tricorder depuis
l’icône Ubuntu**, puis relancer ; la croix seule conserve l’ancienne session active.
Aucune fenêtre en cours n’est arrêtée automatiquement.

Les récurrences nécessitent un ordinateur éveillé et Tricorder actif. Aucun
service de démarrage automatique Ubuntu n’est installé. Les imports restent des
brouillons sans comptes, accords ni récurrences actives. Le
[fichier d’exemple](exemple.tricorder-workflow) permet de vérifier ce parcours.

# Tricorder

Une application locale pour concevoir, exécuter et suivre des workflows de
développement ou de monitoring, sur un projet Git ou indépendamment des projets.
**Version de travail : 0.6.0-rc.1.** Le moteur est générique ; Odoo Crew est
un pack facultatif.

[Avancement et limites](release/2026-10-08_workflow-studio/README.md) ·
[Plan de développement et de tests](docs/PLAN_WORKFLOWS_2026-10-08.md) ·
[Principes de design](docs/DESIGN.md)

## Choisir son espace

- **Vue d’ensemble** : exécutions, résultats à examiner et récurrences actives.
- **Globaux** : automatisations transverses, indépendantes des projets, par
  exemple une veille de messagerie ou le traitement de tickets.
- **Projets** : chacun correspond à la racine d’un dépôt Git local.
- **Bibliothèque** : modèles réutilisables, copiés puis adaptés dans un contexte
  global ou un projet. Une exécution conserve sa version figée.
- **Connexions** : moyens disponibles, déclarations de plugins et détection
  native Codex ; installation, connexion et capacité d’exécution sont distinctes.
- **Récurrences** : fréquences, prochaines échéances et suspension des workflows.

## Concevoir et suivre

Le canevas utilise des liaisons à angles droits. L’inspecteur permet de modifier
les blocs, leurs critères, leurs modèles et leurs connexions ; une vue liste et
l’annulation des modifications complètent le canevas.

Un **travail IA** peut utiliser directement un modèle, sans agent dédié, ou
recevoir les consignes d’un profil spécialisé. Une commande ou une condition
peut s’exécuter sans IA. Le choix de plugins est indépendant du choix de profil.

Le **terminal de conception** ouvre `.tricorder/`, aussi bien pour créer un
modèle que pour adapter un workflow. Les fichiers sont dans `workflows/` ; après
modification, « Recharger et valider » crée une nouvelle révision. L’application
installe ses consignes `AGENTS.md` à la création du contexte et les synchronise
au premier lancement après une mise à jour. Les personnalisations sont préservées.

L’assistant IA propose des modifications examinables du workflow. Les blocs IA
peuvent analyser ou modifier du code dans une copie isolée : diff, tests de la
copie, puis application humaine au dépôt avec contrôle des conflits. Codex a été
essayé nativement ; Claude reste bloqué par la politique de l’organisation.
Les opérations externes non connectées restent bloquées.

Les exécutions montrent les résultats remis, les preuves et les décisions.
Les blocs déterministes peuvent valider automatiquement leurs contrôles techniques ;
les décisions humaines restent obligatoires. Les récurrences peuvent ainsi
s’enchaîner sans validation manuelle de chaque lecture. Un transfert global →
projet crée un brouillon avec les résultats validés ; les accords ne suivent pas.
Les commandes et documents peuvent réutiliser explicitement des preuves de moins
de 24 h si les sources et dépendances contrôlées sont inchangées.

Un serveur MCP stdio ou un adaptateur local peut relier un plugin à Tricorder, après examen de sa commande
et vérification explicite dans **Connexions**. Ce transport gère lectures,
notifications et écritures autorisées. Il exécute du code de confiance avec les
droits utilisateur ; un plugin Codex installé n’est pas automatiquement connecté.
Le [contrat de configuration](backend/workflow_engine/guidance.py) est aussi
installé dans le terminal de chaque contexte.
La croix **masque la fenêtre** : l’icône Ubuntu garde le suivi actif.
**Quitter Tricorder** arrête le planificateur ; les processus déjà lancés peuvent
encore terminer. Aucun démarrage automatique à la connexion Ubuntu n’est installé.

## Transférer un workflow et mettre à jour Tricorder

« Exporter… » produit un fichier `.tricorder-workflow`, avec ses sous-workflows
intégrés et ses choix de modèles. Sur un autre ordinateur équipé de Tricorder,
le double-clic affiche un aperçu puis propose d’importer un brouillon. Aucun
accord, historique d’exécution ni récurrence active n’est transféré. Les comptes
et capacités doivent être vérifiés sur le poste destinataire.

Au lancement, Tricorder consulte la dernière release stable publique sur GitHub.
Une nouvelle version propose ses notes et le téléchargement du paquet Ubuntu.
L’installation et le redémarrage restent explicites. Hors connexion, le travail
continue ; « Mises à jour » permet de réessayer.

## Documentation lisible

Une release possède une seule entrée humaine : `release/<id>/README.md`, pour
l’intention, le plan, la réalisation, les tests et la livraison. Le suivi machine
et les preuves sont regroupés dans `.suivi/`. Les installateurs sont dans
`build-artifacts/`, distincts de la documentation.

## Essayer et développer

Prérequis : Ubuntu avec Python 3, Git, Node/npm et Bubblewrap pour les commandes
isolées. L’intégration de l’icône dépend de la zone de notification du bureau.

```bash
npm install
npm start
```

« Essayer un exemple » crée un dépôt Git de démonstration et propose un parcours
simulé : aucun modèle payant ni service métier n’est appelé. Depuis « Globaux »,
les modèles peuvent aussi s’exécuter sans créer de projet.

```bash
npm test
npm run test:ui
npm run dist
npm run test:packaged
```

État local : `~/.local/share/tricorder/` (SQLite, preuves, bibliothèque, workflows
globaux et exemples). `TRICORDER_STATE_DIR` permet une instance isolée.
Pas de service TCP ni de télémétrie dans Tricorder. La vérification de mise à jour contacte GitHub au lancement, conformément à la
préférence demandée. Les fournisseurs natifs contactent leurs services lors
des actions demandées.

Les anciens écrans et leurs références restent dans l’historique et certains
fichiers sources ; ils ne sont plus le point d’entrée de l’application. Aucun
ancien workflow client n’a été migré ou supprimé.

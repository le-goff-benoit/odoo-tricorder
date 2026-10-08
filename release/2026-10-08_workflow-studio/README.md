# Workflow Studio — première préversion

**0.6.0-preview.1 · 8 octobre 2026 · Réalisation en cours, release non clôturée.**

Cette page est l’entrée humaine du chantier : ce que nous cherchons à obtenir,
ce qui est écrit et testé, et ce qui manque encore. Le
[plan détaillé](../../docs/PLAN_WORKFLOWS_2026-10-08.md) conserve les critères de
validation ; le suivi machine est regroupé dans [.suivi/release.json](.suivi/release.json).

## Intention

Faire de Tricorder un éditeur générique où l’on dessine, adapte et suit des
workflows. Odoo Crew fournit des profils métier facultatifs. Un modèle IA peut
travailler sans agent dédié ; les actions déterministes n’exigent aucun modèle.

Deux portées sont distinctes : **Globaux**, pour une veille de messagerie ou des
tickets transverses ; **Projets**, pour les travaux liés à un dépôt Git précis.
La bibliothèque contient les modèles réutilisables, pas les exécutions actives.

Benoît a autorisé un nouveau format, sans compatibilité avec les anciens
workflows. Les dossiers et workflows des projets clients n’ont pas été touchés.
La direction visuelle reprend la lisibilité des graphes Harness, avec des
connexions à angles droits et une architecture de l’information documentée dans
[DESIGN](../../docs/DESIGN.md).

## Plan et état réel

| Partie | État de cette préversion | Suite nécessaire |
|---|---|---|
| Moteur local, branches et versions | Implémenté et testé : SQLite, contrats, verrous, événements, décisions persistantes, reprises bornées | Réutilisation sélective de preuves et invalidation fine à compléter |
| Modèles et projets | Bibliothèque, adaptation, racine Git exigée, fichiers rechargeables ; contexte global distinct | Passage automatique d’un cas global à un projet à réaliser |
| Canevas et suivi | Édition, déplacements, liaisons orthogonales, liste, annuler/rétablir, phases et même graphe en exécution | Routage anti-collision et qualification de grands graphes à approfondir |
| Terminal et consignes | PTY réel dans la création/adaptation ; `AGENTS.md` installé et mis à jour automatiquement, personnalisation préservée | Aide à fusionner les consignes personnalisées à améliorer |
| IA sans agent dédié | Sélection explicite du fournisseur, modèle, effort et profil facultatif ; sessions CLI neuves limitées au texte | Qualification native payante et exécution outillée de code non réalisées |
| Assistant de conception | Proposition structurée, aperçu puis application, sans activation implicite | Qualifier les réponses natives avec budget et scénarios fixés |
| Plugins polyvalents | Catalogue déclaratif extensible ; capacités liables aux blocs ; inventaire installé Codex détectable | Transport des outils natifs et inventaire Claude à qualifier/intégrer |
| Communication et surveillance | Brouillon NECA, canaux Slack/Telegram/Signal/email, contrôles de prérequis | Aucun compte connecté dans le runtime ; aucune surveillance ni notification réelle activée |
| Récurrences | Fréquences et fuseaux, révision figée, suspension, pas de chevauchement ni rafale de rattrapage | Politique de validation automatique des étapes déterministes à réaliser pour une veille autonome |
| Barre Ubuntu | Icône, statuts, décisions, raccourcis ; la croix masque et laisse le processus actif | Démarrage à la connexion Ubuntu non installé ; contrôle visuel du panneau cible à confirmer |
| Odoo Crew | Pack importable et profil `odoo-deployer` généré et installé, expérimental | Migration complète des anciens contrats Crew vers le nouveau moteur non réalisée |
| GitHub → Odoo.sh | Contrat de candidat/accord/build/livraison et contrôles synthétiques | Dépôt, branche et cible seront fournis plus tard ; connecteur réel et parcours de référence à finir |
| Confluence | Contrat de version, conflit et relecture vérifié sur transport synthétique | Connexion et publication réelle non qualifiées |
| Transfert entre ordinateurs | Export `.tricorder-workflow`, dépendances intégrées, ouverture de fichier et import en brouillon | Aucun compte, accord ou planning actif transféré ; prérequis à vérifier sur le poste destinataire |
| Mise à jour GitHub | Vérification au lancement, comparaison de versions, notes et téléchargement explicite ; échec réseau non bloquant | Installation du paquet Ubuntu par l’utilisateur ; aucun remplacement à chaud |
| Documentation | Une page humaine par release et suivi/preuves dans `.suivi/` ; projection issue du moteur | Aucun nettoyage des anciens dossiers clients ; anciens documents techniques conservés hors du parcours actuel |

## Vocabulaire de l’interface

Termes IT courants : **Éditeur de workflows**, **Tâche IA**, **À valider**,
**Validé**, **Valider le résultat** et **Journal d’exécution**. La même règle est
conservée dans les consignes du projet et dans l’`AGENTS.md` embarqué (version 2).

## Code écrit

- [Moteur](../../backend/workflow_engine/engine.py) : exécutions immuables,
  transitions transactionnelles, jetons de tentative, verrous et décisions exactes.
- [Contrats](../../backend/workflow_engine/contracts.py),
  [planificateur](../../backend/workflow_engine/schedules.py) et
  [projets Git](../../backend/workflow_engine/projects.py) : validation et limites.
- [Consignes de conception](../../backend/workflow_engine/guidance.py) : source
  embarquée, empreinte de contenu et mise à jour idempotente au lancement.
- [Catalogue de plugins](../../backend/workflow_engine/integrations.py) et
  [inventaire natif](../../backend/connectors/discovery.py) : extensions
  indépendantes des types de bloc, métadonnées filtrées, aucun secret affiché.
- [Exécutants](../../backend/workflow_engine/runtime.py) et
  [sessions IA](../../backend/connectors/providers.py) : simulation explicite,
  vraie commande isolée, sessions texte instrumentées sans repli de modèle.
- [Effets externes](../../backend/connectors/effects.py) : contrats testables de
  dédoublonnage, résultat d’envoi incertain, conflit documentaire et livraison.
  Ces fonctions ne constituent pas des connexions authentifiées actives.
- [Interface](../../src/studio.js), [modèle visuel](../../src/studio-model.js),
  [terminal](../../src/studio-terminal.js), [application](../../electron/studio-main.cjs)
  et [barre Ubuntu](../../electron/studio-tray.cjs).

Aucune édition de code projet, publication ou livraison métier réelle n’est
attestée par une réponse IA. Dans cette préversion, les résultats de travail
attendent leur validation ; les portes humaines restent des décisions distinctes.

## Utiliser le terminal et les plugins

Dans un projet, les fichiers sont sous `<dépôt>/.tricorder/`. Les modèles et les
workflows globaux possèdent leur propre espace dans les données locales de
Tricorder. La fenêtre indique le chemin exact.

`AGENTS.md` est livré avec l’application. À l’ajout d’un contexte et au lancement
après installation/mise à jour, Tricorder installe ou actualise sa version si elle
n’a pas été personnalisée. Les règles du dépôt parent ne sont jamais remplacées.
Une personnalisation est conservée et signalée dans Connexions.

Un nouveau plugin peut être configuré avec les outils natifs dans le terminal.
« Détecter les plugins Codex » interroge `codex plugin list --json`, sans lancer
ses outils. La liste n’affirme pas que ses comptes sont connectés. Les capacités
souhaitées se déclarent dans `.tricorder/plugins.json` :

```json
{"schema":1,"plugins":[{"id":"mon-plugin","title":"Mon plugin",
"provider":"codex","operations":["read","send"]}]}
```

Tout bloc peut référencer une capacité par `plugin` et `operation`. L’interface
propose les capacités déclarées dans l’inspecteur. L’activation réelle reste
bloquée tant que le fournisseur ne possède pas un transport d’outils qualifié.
Il n’est pas nécessaire d’ajouter un bloc ou un rôle spécialisé pour chaque plugin.

## Tests et preuves

[Résultats conservés](.suivi/preuves/tests.log) · [Aperçu vérifié](.suivi/preuves/apercu.png)

Les tests utilisent des dossiers temporaires et des données synthétiques.
Aucun email réel n’a été lu, aucun message envoyé, aucune production consultée.

| Contrôle | Résultat |
|---|---|
| Python Tricorder | 133 tests réussis, dont les contrats des effets, des plugins, des espaces globaux et des consignes |
| JavaScript Tricorder | 70 tests réussis |
| Parcours Electron sur les sources | 15 réussis |
| Paquet Debian | Construit ; 15 parcours réussis sur l’exécutable empaqueté ; association MIME déclarée |
| Crew | 435 tests, succès avec 1 cas ignoré ; graphe 59 nœuds/129 arêtes valide |
| Génération Crew | 38 sorties conformes ; profil `odoo-deployer` validé et installé |

Les parcours Electron couvrent l’édition et la persistance, les branches et la
validation, une décision après redémarrage, le blocage d’un lancement non configuré,
le focus et l’affichage sombre à 1024 px, les propositions sans activation, le
terminal réel et le rechargement, les récurrences, la fermeture vers la barre,
un nouveau plugin sans agent dédié, une **vraie commande Bubblewrap avec preuve**,
un workflow global sans projet avec liens orthogonaux, le transfert d’un fichier
dans un espace local neuf et l’interface de mise à jour.

Les anciens tests unitaires restent exécutés ; leurs résultats ne constituent
pas une preuve des nouveaux parcours. Les anciennes recettes d’interface ont
été remplacées par la suite dédiée au Studio.

L’inventaire natif Codex a été interrogé en lecture : format et présence de
plugins observés, sans appel à leurs services. Les appels de modèles Codex/Claude,
Confluence, messagerie et GitHub/Odoo.sh n’ont pas été qualifiés nativement.
Les essais utilisateurs débutants/experts, un audit WCAG complet et les mesures
sur grands graphes restent à faire. Aucun gain de qualité des agents n’est affirmé.

## Fichiers portables et mises à jour

[Exemple exporté](exemple.tricorder-workflow) : à ouvrir avec Tricorder installé.
Le paquet Debian déclare l’extension et son type MIME pour le double-clic Ubuntu.
Le format ne contient que la définition ; les sous-workflows sont intégrés en
blocs explicites. Les modèles hérités du contexte source sont conservés, les
profils résolus et les états de compte ne le sont pas. Une importation répétée
crée une autre définition et n’écrase pas un workflow existant.

L’application consulte au lancement l’API publique de dernière release stable
([contrat GitHub](https://docs.github.com/en/rest/releases/releases#get-the-latest-release)).
La comparaison refuse un retour à une version antérieure. Les liens de release et
de paquet restent limités au dépôt Tricorder. La vérification réelle du 8 octobre
a reçu `v0.5.0`, donc aucune version stable supérieure à cette préversion 0.6.0.
Aucun paquet distant n’a été installé par ce contrôle.

## Livraison et prochaines étapes

Le paquet de préversion se trouve dans `build-artifacts/` (SHA256 dans
`build-artifacts/SHA256SUMS`). Il n’a pas remplacé l’application installée. Aucun push GitHub ni
déploiement Odoo.sh n’a été effectué. Les profils Crew locaux ont été générés
avec leur outil canonique ; le changement préexistant de `stack/docker-compose.yml`
a été laissé intact.

Priorités restantes : transport générique des outils et qualification native,
validation automatique encadrée pour les veilles, workflow de déploiement complet,
passage global → projet, puis recette d’usage et accessibilité. Les cibles de
livraison seront précisées par Benoît. Le plan initial n’est pas déclaré terminé.

# Corrections de conception — réception ciblée

9 octobre 2026. Sources corrigées après lecture des recettes indépendantes 1–3, puis intégration des constats transmis des recettes 4–5. Le paquet utilisé par ces cinq testeurs est resté inchangé ; les contre-essais ci-dessous portent sur les sources rebundlées.

## Comportements corrigés

- **Simulation personnalisable.** Les propriétés proposent « Données de simulation… » : choix Oui/Non, nombre et texte, avec JSON seulement pour objets/listes. Une sortie peut rester automatique ; la génération demeure celle du moteur. Les exemples explicites sont conservés à l’ouverture, y compris une ancienne valeur booléenne incompatible, signalée sans conversion silencieuse. Appliquer nécessite une correction explicite ou le retour à Automatique. Les exemples ne constituent pas des résultats réels ni des autorisations.
- **Liens et suppressions.** Supprimer un bloc ou un lien expose les liens/données touchés et permet d’annuler. Au lancement et dans les propriétés, les entrées non reliées et les blocs entièrement déconnectés sont signalés avec un accès aux liens. Cette aide ne bloque ni les brouillons ni les étapes indépendantes voulues. L’exception des paramètres des conditions respecte la priorité des paramètres du bloc sur ceux du workflow, y compris `false`.
- **Copies de modèles.** Un modèle intégré propose « Personnaliser une copie… » ; la destination partagée, l’origine et un nom distinct sont explicites. Une copie existante s’ouvre directement avec « Modifier le modèle ». L’original reste disponible.
- **Enregistrement compréhensible.** L’éditeur annonce que la navigation principale enregistre les modifications. Le passage vers Historique enregistre aussi le formulaire de bloc encore en cours. L’entrée Nouvelle demande et la navigation reçue de l’application appliquent d’abord ce formulaire.
- **Propriétés allégées.** Le contrôle de code est replié lorsqu’il n’est pas actif. Les liens entre blocs sont séparés des outils/plugins ; les liens affichent les noms des blocs. La règle explicite explique la comparaison exacte et les branches `true`/`false`, sans promettre de comparaison arithmétique. Le choix initial devient « Workflow simple — première tâche ».
- **Connexions et import.** Une CLI installée sans preuve de connexion affiche « Installé · connexion à vérifier ». L’aperçu d’un import liste les blocs, les consignes, les données et les liens ; le JSON complet reste une section technique repliée.
- **Arrêt d’agent.** Le suivi observe `terminalStatus(conversationId)` fourni par l’intégration, avec garde sur l’ID de conversation et la vue. Un arrêt détecté affiche « Agent arrêté · progression conservée » et la reprise explicite existante. Aucun état moteur ni processus n’est modifié par cette observation. La recette arrêt/reprise appartient à l’orchestrateur et n’est pas comptée dans les tests ci-dessous.

## Contre-essais

`tests/workflow-design.test.cjs` : **5 tests unitaires réussis**. Ils couvrent l’entrée de validation devenue orpheline puis reliée, les paramètres locaux et `false`, la conservation de `false`/zéro/texte vide, le rejet des valeurs de simulation incompatibles et les noms de copies distincts. Journal : [editeur-unit.log](editeur-unit.log).

`tests/workflow-creation-feedback.spec.cjs` et deux parcours existants adaptés de `tests/studio.spec.cjs` : **7 tests GUI réussis**. Journal : [editeur-ui3.log](editeur-ui3.log).

1. Corriger un exemple booléen importé invalide, saisir montant/texte, enregistrer et rouvrir ; simuler réellement via l’interface, valider le résultat fictif, atteindre uniquement la branche normale avec sa décision humaine toujours en attente. La branche urgente est ignorée.
2. Refuser une suppression puis supprimer le bloc central ; retrouver son entrée de validation orpheline au lancement ; suivre le lien de réparation, créer la transmission, puis constater l’avertissement disparu et le lien enregistré.
3. Créer une copie de modèle intégré, refuser le nom identique à l’original, conserver la provenance et rouvrir la copie depuis le catalogue où l’original reste présent.
4. Modifier une consigne sans soumettre le formulaire, passer à Historique, vérifier la révision enregistrée et rouvrir la consigne ; vérifier les statuts des deux CLI installées mais non authentifiées.
5. Exporter puis importer un fichier synthétique : aperçu des blocs et données lisible, JSON replié, destination explicite, deux définitions conservées et aucune exécution créée.
6. Parcours existant : terminal réel d’un modèle copié, édition du fichier puis rechargement validé.
7. Parcours existant : déclaration d’un plugin synthétique dans le catalogue puis sélection sans agent dédié.

Les premiers essais GUI ont exposé deux assertions lancées avant la fin de la navigation/sauvegarde et un sélecteur `pre` ambigu. Les attentes portent désormais sur le dialogue ou la vue effectivement ouverte, et sur l’absence de JSON visible. Aucune assertion métier n’a été supprimée. Journaux conservés : [première passe](editeur-ui1.log), [deuxième passe](editeur-ui2.log).

Les cinq nouvelles recettes utilisent l’entrée normale, HOME/XDG/CODEX_HOME/CLAUDE_CONFIG_DIR/state/runtime temporaires, PATH fixe avec deux fournisseurs inertes présents avant le broker, aucun compte ni service. Leurs marqueurs et chemins ont été vérifiés dans le terminal GUI avant chaque parcours. Les fixtures de départ passent par `workflow.save` ; aucun état d’exécution n’est retouché. Le sélecteur natif de fichier est substitué uniquement par le chemin du fichier synthétique : son ergonomie système n’est pas qualifiée. Les fenêtres, terminaux et brokers de chaque banc sont nettoyés ; le Xserver partagé reste disponible.

## Captures vues

Toutes les captures ci-dessous ont été ouvertes et inspectées :

- [Données typées de simulation](captures-editeur/typed-simulation-form.png)
- [Branche normale et décision humaine conservée](captures-editeur/simulation-normal-human-gate.png)
- [Entrée orpheline au lancement](captures-editeur/missing-input-launch-guidance.png)
- [Copie nommée du modèle](captures-editeur/named-template-copy.png)
- [Aperçu métier d’un import](captures-editeur/portable-business-preview.png)

Dernier ajustement après les sept GUI : marge intérieure du texte d’enregistrement pour l’aligner sur le titre. La réception globale et le prochain paquet doivent reprendre ce style. Les captures restent les preuves exactes de la passe précédente, sans retouche.

## Limites reçues explicitement

Ces essais qualifient la configuration, la persistance, le routage simulé et les réparations décrites. Ils ne qualifient aucun travail IA commercial, OAuth, livraison métier ou production. Les warnings de conception ne rendent pas tous les ports obligatoires. Les comparaisons numériques métier et l’affectation multi-utilisateur ne sont pas ajoutées. La campagne UX indépendante doit encore examiner la densité et l’accessibilité de toutes les vues.

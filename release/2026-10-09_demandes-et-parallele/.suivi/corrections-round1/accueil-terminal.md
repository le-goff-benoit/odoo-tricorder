# Corrections de l’accueil et de l’identité des terminaux

Réception ciblée du 9 octobre 2026, après les observations C1 / F1 / LP-01 et LP-02 de la première campagne fonctionnelle.

## Comportement livré

- L’entrée normale, sans projet Odoo sélectionnable, ouvre **Activité** et expose **Nouvelle demande**. Les projets génériques déjà enregistrés apparaissent dès cet accueil.
- Le choix explicite entre l’espace de workflows et le suivi historique d’un projet est conservé. Après utilisation des workflows, le prochain démarrage normal revient à Activité. Un projet historique reste accessible et sa sélection explicite est conservée au redémarrage.
- Les onglets des terminaux liés à une conversation affichent sa première intention, en plus de l’identité du programme. Deux conversations issues du même modèle sont ainsi distinguables. Le nom complet reste accessible au survol.
- Les conversations des terminaux restaurés sont relues pour retrouver leurs titres. Cette lecture n’ouvre aucun terminal et ne relance aucun agent. La recherche ou la pagination dans une conversation ne remplace pas son titre par celui d’une demande d’une autre page.
- Si le terminal sélectionné appartient à une autre conversation que le suivi affiché, le contexte indique aussi l’intention de cette conversation.

Les chemins de stockage et `electron/workspace-window.cjs` ne sont pas modifiés. Les corrections des boutons de reprise et des cartes de conversations dans `src/studio.js` sont gérées séparément par l’orchestrateur.

## Vérification ciblée

Fichier : `tests/startup-navigation.spec.cjs`.

Commande exécutée après le build source coordonné par l’orchestrateur :

```sh
DISPLAY=:181 XAUTHORITY=/tmp/tricorder-functional-display/auth-181 PYTHONDONTWRITEBYTECODE=1 ./node_modules/.bin/playwright test tests/startup-navigation.spec.cjs --output=/tmp/tricorder-startup-navigation-results
```

Résultat : **3 tests réussis, 35 secondes**.

1. Démarrage normal avec HOME vide : Activité sélectionnée, Nouvelle demande visible, formulaire accessible avec contexte Sans projet.
2. Projet générique et deux conversations du même modèle : intentions lisibles dans les onglets ; fermeture et réouverture de l’application ; conservation exacte des deux IDs et PIDs ; sélection de la bonne conversation ; identification explicite de l’autre conversation en changeant d’onglet.
3. Projet historique : accès initial conservé, passage à Activité puis redémarrage sur Activité ; retour au suivi historique puis redémarrage sur le projet choisi.

Fixtures créées par les commandes du moteur, sans édition directe de son état. Deux CLI inertes installées **avant** le premier broker ; HOME, XDG, CODEX_HOME, CLAUDE_CONFIG_DIR, runtime et état isolés ; PATH limité aux stubs et `/usr/bin:/bin`. Aucun compte, fournisseur ou projet client utilisé. Applications et brokers de ces tests arrêtés à la fin. Aucun test ni build de paquet complet effectué par cette correction ciblée.

`git diff --check` et vérification syntaxique du fichier de test réussis. La qualification du paquet final et la seconde campagne de cinq testeurs restent à faire par l’orchestrateur.

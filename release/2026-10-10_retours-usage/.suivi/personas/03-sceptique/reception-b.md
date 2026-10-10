# Contre-épreuve B — lancement d'une commande sans IA

Candidat `/tmp/tricorder-usage-candidate-b`, interface Electron réelle, 10 octobre 2026. Rapport et captures du candidat A préservés. Script indépendant `reception-b.spec.cjs` ; résultat dans `b/result.json`. Dernier rejeu : 1 test réussi, 7,7 secondes.

**Attente.** Trouver le lancement réel d'une commande locale sans chercher une option avancée ni configurer un fournisseur IA.

**Premier clic et parcours.** Workflows → Modèles → Commande locale avec validation → Créer une adaptation… → création dans un dépôt synthétique → Exécuter… Aucun volet du dialogue de lancement n'a été cliqué ni ouvert par le test.

**Constat.** « Exécution automatique sans conversation » est ouvert dès l'arrivée et « Lancer l’exécution réelle » est visible. Le critère précis de réception est satisfait. Aucun catalogue IA ni secret fournisseur n'a été consulté. Capture : [lancement direct](b/05-lancement-direct.png), texte visible : `b/dialogue.txt`.

**Friction restante.** Le dialogue commence toujours par une demande libre, parle des questions de l'agent et place « Lancer dans le terminal » comme premier bouton bleu. « Lancer l’exécution réelle » est un second bouton bleu, plus bas. J'ai donc deux choix visuellement primaires alors que mon besoin est seulement d'exécuter Python. L'amélioration retire la recherche du volet ; elle ne rend pas encore le parcours spécifiquement adapté à une commande sans IA.

**Décision persona.** Critère ciblé accepté. Priorité P2 restante : pour un workflow sans tâche IA, placer le lancement local en première action et rendre la conversation terminal secondaire. Ne pas présenter cette contre-épreuve comme la résolution intégrale du constat P1 initial.

**Portée.** Aucun besoin de relancer le vrai processus déjà qualifié dans A : cette contre-épreuve porte exclusivement sur la visibilité et la compréhension du lancement. HOME, workflow-state, runtime et fournisseurs inertes isolés. Aucun code applicatif lu ou modifié ; aucune écriture d'état moteur hors commandes GUI. Le build préalable a été exécuté dans le snapshot B, jamais dans le dépôt racine.

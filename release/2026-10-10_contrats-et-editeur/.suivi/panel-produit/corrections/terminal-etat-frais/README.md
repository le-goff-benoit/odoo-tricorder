# État frais lors du retour au terminal

Un passage complet sur sources détecte un onglet resté « Codex arrêté » alors
que le broker voit une commande sleep. La reproduction instrumentée confirme
un défaut plus précis : le bouton « Retrouver la conversation » consultait
l’ancien état et ouvrait à tort le dialogue de reprise. Le correctif consulte
l’état frais du terminal avant de décider si une reprise est pertinente.

Un second échec de ce passage appartient au banc support : il cherchait encore
les anciens libellés de préparation pour un enfant exécuté automatiquement.
Le test utilise désormais « Relancer cette étape… » puis « Relancer maintenant »,
et vérifie que l’exécution immédiate et la tentative consommée sont annoncées.
Il prouve aussi qu’aucun nouvel appel fournisseur ni tentative ne part avant
la confirmation. Les résultats reçus, questions et reprise ciblée restent
vérifiés comme auparavant.

Les deux suites ont été interrompues volontairement pour qualifier le candidat
corrigé. Ces journaux partiels conservent les constats ; ils ne constituent pas
la recette finale.

La contre-épreuve du banc support corrigé passe **deux fois sur deux**. Elle
contrôle aussi les PID des exécutants parallèles, la conservation des résultats
déjà reçus et la reprise du seul élément échoué.
[Journal ciblé](support-relance-ciblee.log).

La relecture a aussi confirmé un lancement implicite après fermeture complète
du PTY. Le contrat distingue désormais cette session historique d’une première
ouverture. Consulter et annuler restent sans effet ; la confirmation seule
crée le terminal de reprise. **Quatre contre-épreuves indépendantes sont vertes**,
avec compteur de lancements, états IPC et conservation des sessions.
[Réception indépendante et preuves](RECEPTION-INDEPENDANTE.md) ·
[Rapport développeur](RAPPORT-DEVELOPPEUR.md).

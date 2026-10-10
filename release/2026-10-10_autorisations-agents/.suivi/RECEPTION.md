# Réception — autorisations des agents

La capture utilisateur montre `sqlite3.OperationalError: unable to open database file` lors de l’appel au pont depuis Codex, puis une demande d’autorisation de commande. Le pont installé rc.16 répond correctement hors du bac à sable (`status`, code de sortie 0). La base est donc accessible à l’application ; le lancement natif omettait les autorisations et les dossiers d’état.

Deux tests de régression ont d’abord échoué : arguments d’accès complet absents et dossier d’état non transmis. Ils passent après correction pour Codex et Claude, en lancement et en reprise. Aucune configuration globale du fournisseur n’est écrite.

Le test UI exerce le réglage par le formulaire, sa persistance après rechargement, les arguments des lancements et reprises et une décision du moteur qui reste en attente. Il a aussi détecté l’ouverture précoce des paramètres avant le chargement initial : les valeurs sont maintenant relues dans le processus principal avant affichage.

La session native déjà ouverte a été examinée par son menu `/permissions` : **Full Access (current)**. Le menu a été refermé ; son travail métier n’a pas été relancé. Cette observation ne prouve pas les autorisations initiales au moment de la capture utilisateur.

Les résultats de la recette finale et de l’installation sont dans `verification/`.

## Résultats finaux

- **649 tests unitaires** réussis : 466 Python et 183 JavaScript.
- Recette UI complète en quatre groupes sur des bureaux X isolés : **199 réussis**, deux contrôles en échec et deux tests sur ressources réelles désactivés par défaut. Le pilote du cycle de vie attendait les arguments shell sans apostrophes ; sa correction conserve l’application et son parcours réussit. Le scénario réunion a dépassé l’attente de statut de 5 secondes ; sa contre-épreuve ciblée réussit sans changement de délai ni d’application, sans attribution arbitraire de cause. Les **201 scénarios exécutables** sont ainsi reçus ; les journaux initiaux restent conservés.
- **8 parcours ciblés du paquet Ubuntu** réussis, dont le réglage complet des autorisations, les reprises et la persistance après rechargement.
- Paquet extrait, identité vérifiée et exécutable installé démarré sur profil synthétique. Lanceur utilisateur basculé vers rc.17, rc.16 conservée.
- Réglage utilisateur `agentPermissions=full` enregistré dans les paramètres de l’application. L’application rc.17 a démarré sur le bureau réel ; le terminal existant reste dans le service PTY.

[Résultats structurés](verification/validation.json), [installation finale](verification/installation-finale.json), [démarrage du paquet installé](verification/demarrage-installe.json) et [identité de livraison](livraison.json).

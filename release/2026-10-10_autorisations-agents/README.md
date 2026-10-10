# Tricorder 0.6.0-rc.17 — autorisations des agents dans le terminal

Le lancement d’une conversation native conservait uniquement le modèle, l’effort et les hooks. Il reprenait les autorisations du fournisseur sans transmettre le dossier d’état Tricorder, situé hors du projet. Une ouverture SQLite/WAL par `workflow_cli.py status` pouvait alors échouer dans le bac à sable et provoquer une demande d’autorisation supplémentaire.

**Paramètres → Agents dans le terminal → Autorisations des agents** propose maintenant la configuration du fournisseur ou **Accès complet — sans confirmations de commandes**. Le choix est enregistré et appliqué aux nouveaux lancements et aux reprises de Codex et Claude. Pour Codex, l’accès complet correspond aux arguments `--sandbox danger-full-access --ask-for-approval never`. Claude reçoit `--dangerously-skip-permissions`. Les dossiers d’état sont transmis par `--add-dir`, y compris lorsque les autorisations du fournisseur sont conservées.

Les paramètres des fournisseurs et leurs fichiers d’authentification ne sont pas modifiés. Le réglage concerne les commandes de l’agent dans le terminal ; les décisions, réceptions et opérations externes validées par le moteur gardent leur contrat. Une politique administrée ou une validation native de confiance des hooks reste applicable.

Le formulaire relit les paramètres avant de les afficher, y compris si on l’ouvre pendant le chargement initial des projets. La régression vérifie la persistance après rechargement, un lancement neuf, une reprise et le maintien d’une décision humaine en attente.

Les résultats et l’identité du paquet sont conservés dans [.suivi/RECEPTION.md](.suivi/RECEPTION.md). Les tests utilisent des projets synthétiques et des fournisseurs inertes ; aucun appel payant à un modèle ni envoi métier externe n’est nécessaire pour ce correctif.

Validation : 649 tests unitaires, 201 scénarios UI reçus après les deux contre-épreuves documentées, 8 parcours du paquet réussis. rc.17 installée et accès complet enregistré dans les paramètres utilisateur de Tricorder.

Les options Codex sont vérifiées dans l’aide de la version installée et la [référence officielle des commandes](https://learn.chatgpt.com/docs/developer-commands?surface=cli).

# Préparation reçue — 9 octobre 2026

Cinq parcours indépendants documentés dans plan.md. Harness local prêt : préparation de chaque environnement neuf, stubs Codex et Claude, fixture de 36 demandes réparties sur trois projets via Engine/Conversations du paquet, contrôle SHA bloquant, lancement normal sans flag Studio, captures plafonnées à 18, arrêt des seuls processus du banc.

Préflight exécuté sans Electron ni broker : command -v trouve exclusivement les deux stubs du banc ; leurs --version donnent les marqueurs PORTEFEUILLE-CHARGE-STUB-CODEX et PORTEFEUILLE-CHARGE-STUB-CLAUDE. PATH fixé avant tout futur lancement. Versions des scripts : node --check réussi et AST Python valide, sans cache bytecode. Les fixtures ne sont pas encore exécutées et ne préconfigurent aucun travail terminé.

Banc de préparation : /tmp/tricorder-portefeuille-preparation-1Lfa3Q ; moteur prévu dans state/workflows. Préflight dans preflight-preparation.txt et environnement liste blanche dans banc-preparation.json. Aucune interface, aucun ancien paquet, aucun processus worker/coordinator/broker lancé ; aucune capture. Aucun fichier produit, build, suite globale ou commit modifié.

Prochaine étape : followup du responsable avec chemin et SHA du candidat validé. Adapter les actions et sélecteurs à l’UI visible, puis exécuter les cinq parcours chacun dans un environnement neuf. Les capacités commerciales et quotas fournisseur ne seront pas qualifiés par ces stubs ; la limite de quatre exécutants et les états de ressources indisponibles seront observés dans le banc local.

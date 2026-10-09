# Banc prêt — aucun essai produit

- `node --check harness.cjs` : réussi.
- `node harness.cjs --prepare` : réussi ; aucun GUI ni broker lancé.
- Préflight : chemins temporaires des deux stubs et deux marqueurs `TRICORDER-T3-PMO-STUB` observés.
- Appels synthétiques hors `--version` : code 78 pour les deux fournisseurs ; aucune invocation de modèle.
- Contrôle du manifeste : liste blanche stricte, affichage `:185`, autorité dédiée, `guiStarted: false`.
- Projets Atlas/Boreal : chacun contient uniquement `CONTEXTE.md`, aucun workflow préparé par API ou fichier.
- Environnement préparé : `/tmp/tricorder-t3-pmo-ahRO8m` ; détails dans `preparation-manifest.json`.
- En attente du paquet corrigé et des SHA256 exécutable/ASAR ; aucune capture, observation GUI ou note produit.

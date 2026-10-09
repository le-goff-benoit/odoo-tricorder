# Chargements concurrents de la fenêtre

La lecture indépendante a identifié deux appels possibles à `loadURL` avant que `cockpitLoaded` soit renseigné. Une reproduction déterministe des anciennes fonctions (navigation normale et ouverture workflows simultanées, promesse de chargement non encore résolue) produit bien deux appels.

`workspaceLoader` partage maintenant le chargement en cours et autorise un nouvel essai après un rejet. Deux tests vérifient l’attente des deux appelants, l’absence de nouveau chargement après succès et le nouvel essai après échec.

Ce défaut démontré n’est pas présenté comme la cause de l’incident natif `ERR_FAILED` observé par UX5 : le sélecteur de dossiers réel n’a pas encore été reçu de bout en bout dans ce cas.

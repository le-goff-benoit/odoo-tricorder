# Entrée de la campagne UX/UI

Le paquet décrit dans paquet.json correspond aux sources corrigées après les cinq recettes création/configuration. Le DEB extrait, l’ASAR, les fichiers Electron/renderer, le binaire et les fichiers backend ont été comparés. L’archive ne contient aucun bytecode Python.

Quatorze contrôles GUI ciblés de l’application empaquetée passent : cinq de création/configuration/import/simulation, huit d’interactions dont arrêt/reprise dans le même terminal, un de robustesse EPIPE. Les tests utilisent des projets et processus synthétiques ; aucune qualification fournisseur/client réel.

L’ancienne tentative de construction a été refusée par le contrôle de concordance car le dernier correctif provider avait été ajouté pendant le build. Elle n’a pas été remise aux spécialistes. Le paquet a été reconstruit puis vérifié intégralement avant lancement des recettes UX.

Paquet désormais figé jusqu’aux cinq retours. Les sorties des cinq spécialistes sont indépendantes, chacune avec son propre banc, display et rapport. Le helper vérifie également tous les fichiers backend au lancement et au nettoyage.

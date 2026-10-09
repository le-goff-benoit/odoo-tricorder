# Paquet figé pour le panel de neuf profils

ASAR `71a054e6137a4fb424320954836109bd67ef2b74cb8f71ad3e49af35bb047dd7`. Le manifeste compare le binaire, tous les fichiers renderer/Electron et backend, ainsi que le DEB extrait. Aucun bytecode Python dans le paquet.

Les 18 contrôles GUI empaquetés passent (2,2 minutes) : robustesse EPIPE, petit écran, démarrage et reprise normale, conversation arrêtée, portée cross-projet, suspension/dépendance, résultat terminé, budget de reprise, copie réutilisable et six cas de liaisons. Le runner lance effectivement Playwright avec `TRICORDER_EXECUTABLE` et les sept specs ciblés ; son libellé imprimé npm run test:packaged provient du helper de suite complète. Il ne s’agit pas de la suite empaquetée complète, qui reste exigée avant publication.

La réception source précédente est détaillée dans `../corrections-ux/reception-complete.md` : unités vertes, suite large puis reprises ciblées des cas rouges. Aucun échec connu de ces contre-épreuves n’est laissé ouvert. Le paquet restera inchangé pendant les neuf observations indépendantes. Aucune release cliente ni aucun fournisseur commercial n’a été exécuté pour cette réception.

# Corrections du panel — configuration

Périmètre : retours 4-analyste, 6-exploitation, 8-integration et 9-clavier. Aucun changement du moteur d’exécution ; les commandes validées existantes restent les seules écritures métier.

## Changements

- Planifications : la fréquence reste lisible sur la carte et dans « Version planifiée », avec le fuseau. Le remplacement préremplit fréquence, heure, intervalle, fuseau et jours de semaine de la version précédente. Il commence en Simulation ; les autorisations de notification et l’activation restent non cochées. La notice indique ces choix. L’ancienne planification reste archivée selon le parcours existant.
- Menus : « Planifier » se trouve dans « Options » en haut, avec Réutiliser et Exporter. Le menu de la barre du dessin s’appelle « Éditeur » ; il conserve Phases, Recharger et le brouillon précédent, et présente le fichier JSON.
- Réutilisation : case « Conserver les exemples personnalisés de simulation », non cochée par défaut. Une copie retire donc `sample_outputs` sauf choix explicite. Dans les deux cas, les paramètres métier sont conservés, le contexte de la demande précédente est retiré et la source reste indépendante.
- Entrées sans prédécesseur : l’aide explique que la demande initiale sert de contexte à la consigne, sans remplir automatiquement une entrée nommée. Elle propose de préciser la consigne ou de relier une vraie sortie précédente ; aucun port ni mapping n’est inventé.
- Communication : les capacités de plugins sont indiquées « requises pour l’envoi », avec le besoin d’un adaptateur compatible et vérifié, puis d’une autorisation distincte au lancement.
- Projet Git existant : le chemin peut être choisi ou collé, puis passe par la validation moteur existante. Un chemin blanc est refusé pour éviter de créer involontairement un espace géré.
- Fichier JSON : « Éditeur → Fichier JSON du workflow… » montre un chemin seulement si `workflow.repository` a effectivement retrouvé le fichier. La racine vient du projet et le chemin relatif de cette commande ; un brouillon non enregistré n’est pas présenté comme un fichier existant.
- Ajout d’un bloc : après fermeture du dialogue, le focus est placé dans le champ « Nom du bloc » de sa nouvelle fiche.

## Vérification

- `node --test tests/panel-configuration.test.cjs tests/workflow-design.test.cjs` : **10 tests réussis**. Preuve : [unit-tests.log](unit-tests.log). Ils couvrent le nettoyage/choix des exemples, l’indépendance des données, l’aide sur le contexte initial, les règles de fréquence et l’absence de reprise des autorisations.
- Syntaxe de `src/studio.js` et `tests/panel-configuration.spec.cjs` vérifiée par `node --check`.
- Trois parcours Playwright ciblés préparés dans `tests/panel-configuration.spec.cjs` : remplacement de planification ; réutilisation avec/sans exemples ; dépôt saisi, focus et chemin réel du JSON. **3 parcours réussis en 19,2 s** sur le build commun, DISPLAY 183. Preuve : [gui-results.json](gui-results.json), cinq captures dans [captures/](captures/), toutes ouvertes et inspectées. Le terminal GUI a confirmé les stubs inertes avant chaque parcours. Les instances, shells et dossiers temporaires ont été nettoyés par les hooks de test.
- Le test existant « recurrence activation » de `tests/studio.spec.cjs` ouvre maintenant le menu Options du haut pour Planifier.

## Limites et éléments différés

- L’incident du sélecteur natif du profil 8 ne prouve pas un bug produit. Le champ collable fournit un second chemin d’association ; il ne qualifie pas la confirmation du sélecteur natif.
- Le renommage directement dans le récapitulatif d’import et le lien de reprise vers le dernier dessin restent des améliorations P3 différées. Le parcours existant permet de renommer dans les paramètres et de retrouver le workflow enregistré dans son projet.
- Aucune connexion réelle, notification, occurrence périodique, exécution IA ou qualité métier n’est qualifiée par ces tests de configuration.
- Aucun build, paquet, commit ni documentation partagée réalisé par ce lot ; le responsable consolide ces livrables.

# Intentions identiques après perte d’accusé — diagnostic indépendant

**Verdict : échec du banc, pas de défaut produit confirmé.** Deux contre-épreuves déterministes passent sur le paquet figé : **2/2 en 12,4 secondes**. Aucun produit, build ou test partagé modifié par cette revue. Les suites complètes en cours n’ont pas été interrompues.

## Rouge de la suite

Le test `tests/collection-input-ux.spec.cjs:85` échouait ligne 89, car il exigeait deux entrées dans « Ajouts à récupérer ». Le [snapshot rouge](rouge-suite-paquet/error-context.md) montre déjà **deux intentions enregistrées**, le champ vide et une seule récupération : celle du premier accusé perdu. Le second ajout a donc été accepté directement ; imposer un conflit est une mauvaise attente. [Test d’origine](rouge-suite-paquet/test-suite-original.cjs) et trace ZIP conservés dans le même dossier.

Dans `src/studio.js:945`, une nouvelle soumission utilise la révision de `state.run`, avec une clé propre. Le polling `run.get` toutes les secondes (`src/studio.js:1980`) peut actualiser cette révision entre l’erreur synthétique et le second geste. Aucun contrat métier n’impose que cette actualisation arrive après le second geste. Côté moteur, `backend/workflow_engine/collection.py:27` vérifie une commande déjà reçue avant le contrôle de révision : rejouer exactement une commande acceptée doit rester idempotent même quand la révision a progressé.

## Contre-épreuves sur le paquet inchangé

| Ordonnancement imposé | Deuxième geste | Récupération de l’accusé initial | Résultat confirmé |
|---|---|---|---|
| Lectures `run.get` retardées jusqu’au second ajout | Clé distincte, révision 0 obsolète, conflit visible ; reprise ciblée avec révision 1 accepte le second élément | Requête strictement identique au premier ajout ; révision reste 2 | Exactement deux intentions |
| Attente de l’affichage du premier élément par le polling normal | Clé distincte, révision 1 courante, admission directe ; une seule récupération reste affichée | Requête strictement identique au premier ajout ; révision reste 2 | Exactement deux intentions |

Chaque parcours vérifie le contenu enregistré avant et après le retry initial, l’absence de troisième élément et la sortie après « Confirmer la liste et continuer ». Les hooks retardent les lectures et simulent un accusé perdu **après l’exécution réelle** ; ils ne falsifient ni révision, ni réponse métier, ni état du renderer. Aucun délai arbitraire ou choix conditionnel tolérant un résultat inattendu.

Preuves : [journal 2/2](reception-independante/package-final.log), [script rejouable](reception-independante/review.spec.cjs), [IPC — obsolète](reception-independante/vert-paquet/review-independent-identic-18730-erve-exactly-two-intentions/evidence.json), [IPC — actualisée](reception-independante/vert-paquet/review-independent-identic-a088a-erve-exactly-two-intentions/evidence.json), [empreintes du candidat](reception-independante/candidat-SHA256.json), [empreintes des preuves](reception-independante/SHA256.json). Captures natives dans les dossiers des deux parcours.

Deux ajustements de mon banc temporaire sont consignés dans ses journaux initiaux : compter un `li` n’assure pas que le premier élément est présent, car le placeholder vide est aussi un `li` ; il faut attendre le texte du paragraphe de l’intention. De même, une récupération est temporairement masquée pendant son envoi : son absence seule ne prouve pas la réception. L’assertion finale attend l’accusé IPC puis vérifie les deux éléments. Ces essais n’ont pas révélé de défaut produit.

## Correction recommandée du test partagé

Remplacer l’attente non déterministe par les deux ordonnancements ci-dessus, sans changer les règles métier. Conserver les assertions de clé distincte pour un nouveau geste, de requête inchangée pour un retry incertain et de cardinalité exacte 2. Le développeur a reçu le script et les preuves ; l’intégration reste coordonnée par le responsable après les suites en cours.

Limite : test d’un recueil synthétique en mode simulation, avec le vrai moteur et l’interface du paquet ; aucun fournisseur réel ou état client utilisé. Réception ciblée, distincte de la qualification globale du paquet. Écran `:188` et processus isolés libérés.

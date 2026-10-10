# Avis indépendant 2 — Contrats de données et compatibilité

Revue de `ANALYSE.md` contre le code de `0a4dd888fedbf3a1859a08af3285816cbba0de55`, le 10 octobre 2026. Aucun autre avis consulté. Code et états clients inchangés ; les trois sondes ci-dessous n'utilisent qu'une définition synthétique et une base temporaire détruite à la fin.

**Décision recommandée : retenir les quatre notions proposées, avec cinq précisions de contrat avant implémentation.** La séparation donnée / interaction / issue / action associée répond au besoin. Il faut cependant compléter la spécification au-delà du validateur de sorties : transport fournisseur, activation des blocs, collecte, composition et compatibilité doivent appliquer le même sens.

## 1. P1 — Écrire une représentation canonique et une compatibilité orientée des ports

La proposition distingue correctement liste vide, sortie absente et élément unique, mais ne définit pas encore leur représentation ni les conversions permises. Le code actuel accepte `any` dans les deux sens et vérifie uniquement le type extérieur d'un `array` ou `object`. Une simple extension de `TYPES` conserverait un contournement : une sortie `any` pourrait alimenter une entrée « liste d'intentions » sans en garantir la forme.

Sources : `backend/workflow_engine/contracts.py:35`, `:118`, `:178` et `:239`. Les contrôles spécialisés comparent aussi directement à `"object"` ou `"string"` (`:130`, `:139`, `:155`) ; ils doivent utiliser le même interprète de port, sans affaiblir les contrats candidat/QA.

À préciser : une forme sérialisée unique pour `type`, `cardinality`, `required` et bornes de collection ; `required` concerne la présence du nom, jamais sa valeur vraie/fausse. Définir explicitement le traitement de `null`. La compatibilité doit être orientée : le producteur garantit au moins ce que le consommateur exige. En schéma 2, un `any` ou un ancien `array` non typé ne constitue pas une garantie suffisante vers une collection typée ; il faut une validation/transformation explicite. Conserver le comportement historique en schéma 1. Ne pas ajouter automatiquement le caractère obligatoire aux anciennes entrées : elles n'étaient pas effectivement contrôlées.

Contre-épreuves : absence, `null`, chaîne vide, zéro, `false`, liste vide, liste d'un élément et liste hétérogène ; bornes minimales/maximales ; sortie plus large que l'entrée ; ancien `array` vers une liste typée. Vérifier le même résultat dans les ports publics d'un sous-workflow, le runtime et la simulation.

## 2. P1 — Vérifier les entrées sur le chemin réellement activé, avant de lancer le travail

La recette « facultatif → obligatoire refusé » ne suffit pas. Un port peut paraître relié dans le dessin et être absent sur la branche choisie. Aujourd'hui, `_advance` rend le bloc `ready` après avoir copié les liens actifs, sans valider ses entrées. L'éditeur ne fait qu'un avertissement fondé sur l'ensemble des liens, indépendamment de leurs issues.

Sources : `backend/workflow_engine/engine.py:297`, `:304`, `:313` ; `src/workflow-design.mjs:9`. Les blocs déterministes et décisions fabriquent aussi des sorties par recopie (`engine.py:315`, `:330`, `:518`) : `get()` transforme une absence en `None`, ce qui ne devra pas devenir la représentation d'une sortie facultative absente.

Sonde exécutée : deux branches A/B rejoignent un consommateur déclarant `value:string`. Seule A fournit `value`, B est choisie. Résultat réel : A=`skipped`, consommateur=`ready`, `inputs={}`. La définition est acceptée par `validate`.

À préciser : pour le schéma 2, assembler les entrées du chemin actif puis les valider avant toute prise en charge, y compris pour les blocs déterministes. L'absence facultative doit traverser un lien sans exception et sans inventer de clé ; l'absence obligatoire doit produire un diagnostic actionnable, sans exécuter le consommateur. Définir également si un lien transporte seulement des données ou active le bloc : la proposition distingue ces notions, mais le moteur actuel les confond.

Contre-épreuves : branche A complète / branche B sans donnée ; source facultative absente vers entrée facultative ; même source vers entrée obligatoire ; deux producteurs actifs incompatibles ; convergence après branche ignorée ; décision refusée et sortie non applicable. Le bon échec doit rester consultable, sans annuler par transaction la réception valide du producteur.

## 3. P1 — Séparer le protocole fournisseur du contrat de résultat métier

Les providers déclarent toutes les sorties `required`, y compris quand l'agent doit poser une question. Les objets/listes sont transportés comme des chaînes JSON puis décodés. Le moteur accepte pourtant déjà une question sans sorties. Modifier uniquement le validateur central créerait donc deux sens du même contrat : terminal natif permissif, exécution gérée exigeant des valeurs inutiles ou fictives.

Sources : `backend/connectors/providers.py:28`, `:143`, `:173` ; `backend/workflow_engine/conversations.py:190` ; test existant `tests/test_workflow_conversations.py:302`. Ce test injecte directement le résultat au moteur et ne prouve pas que le schéma fourni au CLI permet la même réponse.

Sonde exécutée : le schéma fournisseur d'un bloc `intentions:array, plan:string` exige toujours les clés `intentions` et `plan`, même avec un champ `question` non vide.

À préciser : un message d'interaction n'est pas un résultat final incomplet. Définir une enveloppe normalisée qui représente séparément question et résultat, avec adaptation explicite par connecteur. Une sortie facultative absente ne doit être ni décodée comme JSON obligatoire, ni remplacée par `null` sans règle. Les fournisseurs ne doivent pas être l'autorité de validation ; le moteur revalide le résultat décodé selon le contrat métier. La simulation doit également générer des exemples compatibles avec minimum, cardinalité et présence (`backend/workflow_engine/simulation.py:19`).

Contre-épreuves : fixtures Codex et Claude passant réellement par génération de schéma, lecture des événements et décodage ; question sans aucun résultat ; résultat final avec sortie facultative omise ; liste typée valide/invalide ; absence d'une sortie requise ; texte JSON mal formé. Ne pas qualifier cette couverture comme une validation d'un service externe réel.

## 4. P1 — Donner à la collecte son état propre et une clôture atomique

Réutiliser l'attente durable est pertinent, mais la réponse actuelle à une question redonne immédiatement le bloc à l'exécutant ; elle ne modélise ni édition/suppression de contributions ni clôture d'une collection. Elle écrit en outre l'historique dans `inputs.clarifications`, nom qui n'est pas réservé par le contrat. Une entrée métier portant ce nom pourrait être remplacée par les échanges.

Sources : `backend/workflow_engine/conversations.py:210` ; les protections actuelles contre question périmée et double réponse sont testées dans `tests/test_workflow_conversations.py:54`. La transaction `BEGIN IMMEDIATE` de `backend/workflow_engine/store.py:42` fournit une base pour une clôture atomique, mais pas encore sa règle métier.

À préciser : état de collecte versionné, identifiants stables des contributions, ordre, provenance et commandes distinctes d'ajout/modification/suppression/clôture. Réserver un espace d'interaction séparé des entrées métier en schéma 2. La clôture compare la révision dans la même transaction, valide la collection et publie une seule sortie immuable. Après transmission, une correction ne doit pas modifier silencieusement les données du plan déjà produit : nouvelle révision ou reprise explicite. Confirmer le recueil ne vaut toujours pas approbation du plan.

Contre-épreuves : ajout terminal concurrent d'une clôture UI ; répétition de la même commande après perte de réponse ; suppression puis fermeture/réouverture ; clôture périmée ; modification après planification ; clé métier `clarifications` ; question d'un agent sur une ancienne révision. Prévoir aussi un volume de contributions explicitement supporté : le prompt géré est actuellement borné à 100 000 caractères (`providers.py:150`), donc « 1…N » ne doit pas laisser découvrir cette limite après collecte.

## 5. P1 — Spécifier les différentes versions et le chemin de composition/export

Conserver les graphes historiques est la bonne décision, mais plusieurs versions indépendantes existent déjà : schéma du workflow, révision enregistrée, version du fichier portable et `engine_schema` des packs. La proposition doit préciser leur relation, ainsi que la composition d'un parent schéma 2 avec un enfant schéma 1. `expand` copie les ports publics dans des `join` et aplatit les enfants sous le schéma du parent ; remplacer le validateur par « 1 ou 2 » ne normalisera pas correctement ces frontières.

Sources : `backend/workflow_engine/contracts.py:74`, `:205`, `:227`, `:241`, `:272` ; `backend/workflow_engine/portable.py:36`, `:46` ; `backend/workflow_engine/packs.py:15` ; test d'export actuel `tests/test_workflow_portable.py:14`.

À préciser : matrice de lecture/écriture/composition, conversion explicite et versionnée d'un brouillon, représentation interne normalisée distincte de l'original enregistré. Conserver les empreintes schéma 1 octet pour octet sur les mêmes définitions. Exclure les annotations du contrat schéma 2 seulement selon une règle explicite ; un retrait global dans `semantic_digest` changerait le sens historique de champs déjà acceptés. L'export doit préserver la version nécessaire et les annotations du parent ; décider comment représenter celles des composants aplatis.

Sonde exécutée : ajouter `annotations` à un graphe schéma 1 est accepté et change actuellement son empreinte. C'est un cas de régression concret à conserver dans la matrice, même si aucun client n'utilise ce champ.

Contre-épreuves : fixtures figées schéma 1 donnant les mêmes empreintes avant/après ; ancien run et décision humaine conservés ; conversion d'un brouillon sans modification d'un run ; parent 2/enfant 1 et refus explicite des combinaisons non supportées ; export/import avec notes et ports typés ; ancien lecteur refusant un nouveau schéma ; pack existant restant utilisable sans falsifier son `engine_schema`.

## Réception recommandée

Avant les parcours UI, stabiliser des exemples JSON normatifs et une table de compatibilité avec les contre-épreuves ci-dessus. Les partager entre les tests backend et les tests de l'éditeur pour éviter deux interprétations du même port. Les tests de bout en bout doivent ensuite passer par les vraies commandes de collecte, transmission et réception, sans préparer directement un état intermédiaire déjà correct.

L'avis est favorable à la direction produit et conditionne la réception technique à ces précisions. Il ne valide ni du code nouveau — absent au moment de la revue — ni une migration de données client, ni des appels réels aux fournisseurs.

# Relecture indépendante après réception froide

Périmètre : diff schedules.py/runtime.py/engine.py/connectors/tool_runtime.py ; guided workflow et sources de planification ; remplacement des paramètres. Aucune modification du produit. Constat à froid conservé séparément dans froid.md.

## Défaut S1 — une source renouvelée vide ne conditionne pas une autre racine parallèle

`src/workflow-schedule-sources.mjs:4` privilégie une racine agent nommée `source` même lorsque le graphe possède d'autres racines. La transformation connection ajoute watch → condition → source mais laisse ces autres racines libres. Le formulaire accepte donc une méthode Sources + Rédaction parallèle et annonce « s’il n’y en a aucun, aucun livrable n’est inventé », alors que la seconde branche reste exécutable sur une lecture vide.

Reproduction ciblée après gel du froid : appel du transformateur réel avec deux racines, puis test sur moteur et transport de lecture réellement qualifié en fixture locale. Transformation : rootsAfterTransform=[source-fresh,independent], independentPrerequisites=[]. Lecture vide : watch_match=no, source_status=skipped, independent_status=ready, status=active. Preuve : empty-source-independent.json. Ni fournisseur ni service externe invoqué ; le critère vérifié est l'éligibilité réelle de la branche.

Recommandation concrète : pour la variante connection, exiger exactement une racine source au lieu de sélectionner un id privilégié parmi plusieurs ; annoncer qu'une méthode dédiée est nécessaire. Une prise en charge plus large devrait conditionner toutes les racines et conserver leurs contrats de données. Ajouter une contre-épreuve avec source nommée source plus racine indépendante ; aucune étape de travail ne doit être prête quand match=no.

## Résultats verts et limites

- 7 tests Python test_schedule_fresh_sources : backlog avec dates identiques, rejet et échec sans consommation ni progression de date, lecture vide sans provider, contrat query/scope réellement confirmé, liste incomplète/non datée rejetée, transport changé bloqué. Tous verts (3,307 s).
- 14 tests Node workflow-guided + workflow-schedule-sources : deux analyses et consolidation, refus/échec d'un prérequis sans contournement de join, édition conservant fournisseurs, exécuteurs distincts explicites, contrats maintenus et sélection de connexions read uniquement. Tous verts.
- Relecture : consommation désormais seulement après completion_outcome=succeeded ; échec/annulation/rejet n'avancent pas source_since. Dates égales conservées avec epsilon et déduplication persistante. Une lecture vide avance à due, pas au temps de fin. Pas de changement de fenêtre sur anciennes planifications sans configuration versionnée.
- Exécuteur : node.execution est figé pour agent/task/document ; worker_preflight reprend cet instantané. Claim native refuse une étape explicitement delegated ; aucun repli vers les outils de la conversation.
- Remplacement : replacementScheduleDraft conserve source_fixed_text et query/scope/binding de la définition originale ainsi que values. L'activation reste en simulation par défaut. Les paramètres produits par readScheduleSources priment les réponses lors de schedule.create.
- Le blocage read rencontré dans le snapshot v4 paraît corrigé dans le workspace courant : actions.schedule ouvre désormais le formulaire de sources avant le diagnostic, et schedule.create valide la variante transformée. Ceci est une lecture de code ; pas une nouvelle réception GUI du candidat construit.

Avis : réception de la conception positive. La variante récurrente à plusieurs racines reste à refuser ou à corriger avant qualification de la promesse « aucune production sans source ». Aucun ancien workflow ni service réel qualifié par cette relecture ciblée.

## Complément — paramètres et bindings de la source fixe

1. **Ancien paramètre local masque le texte nouvellement choisi.** La conversion conserve `node.parameters.schedule_fixed_source`, puis `providers.py:170` utilise `execution_parameters` qui donne priorité au local pour cette clé non réservée. Reproduction : formulaire fixed reçoit « NOUVEAU contenu vérifié », paramètres de schedule conservent ce nouveau contenu, mais agent source local garde « ANCIEN contenu local » et le payload de modèle reçoit cet ancien texte. Corriger la conversion pour supprimer les clés schedule_fixed_source/query/scope locales, et protéger le texte global pour les configurations schedule_source versionnées. Contre-épreuve : texte global nouveau doit être celui reçu par l'agent malgré un ancien paramètre local. Préserver le comportement des anciennes méthodes sans metadata de source.

2. **Backend fixed accepte un binding de lecture effectif.** `validate_schedule_source` requiert seulement que text soit inclus, sans exclure capabilities. Un graphe fixed avec agent root `required_capabilities=['text']`, capability locale read qualifiée et un texte confirmé passe Schedules.create. À l'occurrence, execute appelle le transport read et l'exécution termine succeeded. Preuve : fixed-read-binding.json (adapterCalled=true). La conversion GUI retire effectivement les bindings ; la validation moteur doit aussi refuser ce snapshot contradictoire avant toute lecture. Critère minimal : fixed limité à text, sans binding et sans mode edit ; un binding read ou une capacité read supplémentaire produit ContractError lors de create. Les bindings notify/write sur agent sont déjà refusés par integrations.py.

3. Remplacement contrôlé plus précisément : les 5 tests panel-configuration.test.cjs passent, y compris conservation du fixed text, query, scope, binding et des valeurs falsy, avec simulation par défaut. Pas d'ancien accord réutilisé.

Pour la source connection, contre-épreuves moteur proposées au responsable : refuser une autre racine ; refuser une arête watch→agent en parallèle de watch→condition ; refuser une arête condition/no→travail. La variante normale watch→condition/yes→source doit rester valide et la lecture vide terminer en sautant tous les agents. Ces constats ont été transmis avant correction ; une nouvelle vérification du code modifié ne doit pas réécrire la réception froide.

# Contre-épreuve finale indépendante — persona 9

**Avis : les trois défauts reproductibles de la relecture sont corrigés sur le périmètre testé.** La conception parallèle et les contrôles ciblés restent verts. Le parcours de planification expose les sources fixes et renouvelées avant les diagnostics de capacités. Aucun service externe ni fournisseur réel n'a été qualifié par cette contre-épreuve.

## Protections vérifiées

- Source renouvelée : autre racine indépendante, lien direct watch→source et lien condition/no→source tous refusés par Schedules.create **et** Engine.start. Six appels indépendants, avant départ et sans appel de transport. Preuve : contrepreuve-backend-branches.json.
- Source fixe : binding read conservé et override local schedule_fixed_source chacun refusé en mode réel par Schedules.create **et** Engine.start. Quatre appels indépendants ; aucune planification créée ni lecture d'adaptateur. Preuve : contrepreuve-backend-fixed.json.
- Conversion du formulaire fixe : anciens paramètres source supprimés globalement et localement ; le nouveau texte reçoit la priorité dans le vrai helper execution_parameters utilisé pour le payload fournisseur. Un paramètre métier language=fr et l'original restent conservés. execution_mode=text explicite, driver délégué, pas de binding. Preuve : contrepreuve-fixed-parameters.json.
- 10 tests Python test_schedule_fresh_sources et 21 tests Node guided/source/configuration réussissent après correction. Logs contrepreuve-python.log et contrepreuve-node.log. Ces tests incluent absence de consommation/progression après rejet ou échec, dates égales, absence de modèle sur lecture vide, transport modifié, couverture de recherche manquante et remplacement conservant les sources sans ancien accord.

## Parcours GUI indépendant

Copie temporaire du dist/backend/electron courants, hashes dans contrepreuve-candidate-sha256.txt. HOME/XDG/TRICORDER/CODEX/CLAUDE isolés ; codex/claude inertes exit 78, catalogue fixture-model public ; Xvfb dédié. Aucun broker ou terminal utilisateur touché.

Méthode guidée à une étape créée via Workflows → Workflows enregistrés → Créer un workflow. Planifier expose « Informations à traiter à chaque occurrence », « Source du travail » et « Texte fixe à reprendre » en tête du formulaire, avant fréquence et diagnostics. Texte choisi : « Notes finales : décision technique A, risque B, responsable C. ». Une planification **simulée** a été créée ; remplacement depuis Configuration et réponses préremplit exactement ce texte et conserve simulation=true. Captures contrepreuve-02-source-fixe-premiere.png et contrepreuve-03-texte-conserve.png. Les états ont été modifiés uniquement par les commandes validées de l'interface, dans le profil jetable.

Modèle intégré Réunion copié, modèle fixture choisi, puis Planifier : #schedule-form présent ; Source du travail et Texte fixe visibles avant le diagnostic read. Le choix connexion affiche la recherche et le périmètre ; aucune connexion qualifiée dans le profil, seulement « Choisir une connexion… ». Aucune récupération réelle tentée. Captures contrepreuve-04-reunion-read-gate.png et contrepreuve-05-connexion-visible.png ; texte GUI dans contrepreuve-reunion-form.txt. Le modèle copié contenait encore le champ facultatif réunion/période à la date du snapshot ; sa suppression ultérieure annoncée n'est pas évaluée ici.

## Erratum explicite sur la réception froide

Le S2 « accès aux sources bloqué par read » dans froid.md et le commentaire analogue dans code-review.md étaient **une erreur d'observation** : le sélecteur section:last lisait seulement le diagnostic imbriqué. La capture froide 05-limite-sources.png montre déjà le formulaire de sources fixe au-dessus du diagnostic. Le constat froid reste figé comme historique ; **ce S2 est retiré des défauts produit**. La contre-épreuve actuelle lit le formulaire entier et vérifie la visibilité des champs. Les trois constats moteur antérieurs étaient, eux, reproduits sur les chemins réels et leurs corrections sont indépendamment confirmées ci-dessus.

## Portée de l'avis

Les refus moteur et l'enregistrement GUI sont qualifiés. Les occurrences de transport synthétique et sorties de modèle contrôlées prouvent les transitions et protections ; elles ne prouvent ni la qualité d'une analyse métier, ni un compte fournisseur, ni une connexion externe. L'avis ne remplace pas npm test, test:ui, dist et la réception globale pilotés par le responsable. Aucune modification de code produit ou de document partagé effectuée par cette intervention.

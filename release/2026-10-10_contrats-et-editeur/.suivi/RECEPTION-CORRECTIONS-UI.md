# Réception développeur des corrections UI après le panel

Build local `0.6.0-rc.13`, 10 octobre 2026. Les six rapports originaux et leurs
preuves restent inchangés. Les corrections ont été regroupées après dégel, puis
vérifiées sur des projets synthétiques isolés. Cette réception complète celle du
relecteur indépendant ; elle ne la remplace pas.

## Comportements corrigés

- Le partage avec le terminal et le redimensionnement recalculent le graphe et
  gardent la carte sélectionnée visible. Les changements de largeur déclenchent
  le cadrage, pas le polling. « Ajuster » montre réellement tout le graphe ; le
  suivi normal reste à une échelle lisible. Le terminal et son PID sont conservés.
- Les notes sont placées hors des cartes, routes et étiquettes ; les routes
  contournent aussi les notes déplacées. Elles restent des annotations de dessin.
- Les enfants affichent leur titre concret, leur parent et leur projet. Le retour
  parent utilise la filiation enregistrée, y compris depuis Projets et Activité.
  Une action facultative retourne vers le résultat principal ; une notification
  liée à une question conserve le contexte du dialogue.
- Le plan affiche son objectif `goal` même sans `title`. « Produit · sorties
  vérifiées » est distinct de la décision humaine « Approuvée ». Les répétitions
  inutiles de l'état dans les bandeaux ont été retirées.
- Le constat court à confirmer est visible avant la réponse. Un lien incompatible
  explique les types et ports concernés sans effacer la sélection. Les branches
  booléennes se configurent et se lisent en Oui/Non, y compris dans le fil d'étapes.
- À largeur réduite, la liste des exécutions du projet devient une liste de cartes,
  avec contexte, état et actions lisibles. Activité distingue demandes, tâches et
  actions facultatives, avec pluriels corrects et sans catégories vides.
- Les erreurs de sorties manquantes utilisent le texte métier fourni par
  `readableFailure`; leur diagnostic exact reste replié. Les résultats métier et
  leurs noms de projets utilisent le renderer partagé corrigé par le responsable.

## Vérifications ciblées

Commande de recette : `DISPLAY=:187` et
`XAUTHORITY=/tmp/tricorder-collections-display/Xauthority`, puis
`python3 /tmp/tricorder-ci-target-source-run.py … --output=test-results/…`.
Le runner utilise Node 24 et un pack de référence fixé ; les exécutables Claude et
Codex sont absents du PATH ou remplacés par des fixtures inertes. Aucun fournisseur
payant, envoi distant ni donnée client n'a été utilisé.

| Parcours | Résultat | Preuves archivées |
|---|---:|---|
| Gestes souris/clavier, annulation, zoom, liens et notes | 7/7 | `panel-corrections-note-hit-area/` |
| Contrats v2, collecte, plan, enfants, résultat et action facultative | 4/4 | `preuves-corrections-ui/panel-corrections-ui-first/` |
| Panel 1 : adoption, réutilisation, objectif et décision distincts | 2/2 | `panel-corrections-user1/` et `panel-corrections-user1-plan/` |
| Panel 2 : support, Oui/Non, constat visible, lien et reprise ciblée | 3/3 | `panel-corrections-user2/`, `panel-corrections-user2-oui-non/`, `panel-corrections-user2-reprise-auto/` |
| Panel 4 : multi-projet, dépendance et retour direct depuis Projets/Activité | 2/2 | `panel-corrections-user4/` |
| Panel 6 : création clavier/souris, réponse, reprise, terminal et vue projet | 2/2 | `panel-corrections-user6/` et `panel-corrections-user6-compact/` |
| Notification locale qualifiée, un seul envoi, retour à la question | 1/1 | `panel-corrections-notification/` |
| Compatibilité des anciens parcours layout/graphes | 4/4 | `panel-corrections-layout-compatibility/` |

Les chemins abrégés du tableau sont relatifs à `preuves-corrections-ui/`.
Dix-sept tests unitaires des gestes, contrats UI et routes/notes passent également.
Syntaxe JS et `git diff --check` des fichiers concernés : verts.

## Géométrie et lecture visuelle

Les assertions vérifient la présence effective de la carte dans le viewport à
1100 et 1280 px, après ouverture du terminal, déplacement de la séparation et
passage en disposition verticale. Le déplacement manuel du graphe est conservé
entre polls. « Ajuster » est vérifié sur les bornes de toutes les cartes ; les
notes sont vérifiées contre les segments et les étiquettes des liens.

Captures relues : `coordination-resize-terminal-1100.png`,
`coordination-fit-all-1100.png`, `08a-enfant-direct-projet.png`,
`08-activite-parent-enfants.png`, `02-branche-normale.png`,
`01-dessin-note-1280.png` et `11a-projet-tableau-terminal-1100.png`.
La vue Ajuster réduit explicitement l'échelle pour tenir tout le graphe : elle est
une vue d'ensemble, pas la taille de lecture des tâches par défaut.

## Échecs intermédiaires conservés et corrigés

- La première assertion de routage des notes plaçait la note sur le port même
  d'une carte, au lieu d'un lien. Le cas a été corrigé pour tester l'obstacle
  demandé ; trois positions valides de note sont couvertes.
- L'ancien scénario support attendait une reprise manuelle après réponse dans
  un enfant automatique simulé. Le scénario vérifie maintenant la reprise
  automatique effective, le passage de la seule tâche échouée en tentative 2 et
  l'absence de modification de la tâche déjà terminée. Aucun état moteur n'a été
  retouché pour forcer cette transition.
- Le panel 6 passait avec une assertion `word-break` insuffisante, tandis que la
  capture révélait encore le tableau illisible. La cause était une container query
  sur un élément `display:contents`. Le conteneur existant est désormais utilisé ;
  la contre-épreuve exige l'en-tête masqué, une ligne en grille et une largeur de
  contexte suffisante. La nouvelle capture a été relue.
- Les assertions de texte « Terminée » ont été déplacées du bandeau désormais
  informatif vers le résumé d'exécution. Le libellé canonique de décision humaine
  « Approuvée » est vérifié séparément du badge de résultat produit.

Les artefacts rouges historiques sont archivés avec leur dossier d'origine ; les
rejeux correctifs portent un suffixe explicite. Aucun résultat rouge n'est présenté
comme une preuve verte. Le bilan global Python/JS et les panels 3/5 appartiennent
au responsable de la release.

## Complément après la seconde réception indépendante

Le relecteur a détecté un détour de lien qui évitait la note mais retraversait ses
propres cartes source et destination. Le cas exact (cartes 240×114 à y=60, note
x=496/y=336) a d'abord échoué en test unitaire : voir `note-route-red.log`.
Le routage conserve maintenant les segments courts attachés aux ports, traite
toutes les cartes comme obstacles pour le corps du lien et réalise le détour près
de l'obstacle. La note et toutes les cartes sont vérifiées ensemble.

Le nouveau parcours GUI a aussi reproduit le déplacement de note qui ouvrait
« Modifier le lien ». La zone d'interaction SVG incluait l'intérieur de la boucle ;
elle se limite désormais au trait élargi de 16 pixels. Clic sur l'étiquette,
activation clavier et gestes de liaison sont conservés. Les neuf tests GUI des
gestes et graphes passent, dont la nouvelle contre-épreuve après déplacement,
sauvegarde et réouverture. Voir `panel-corrections-note-hit-area/` ; le rouge
intermédiaire reste dans `panel-corrections-note-detour/`.

Les nouveaux résumés de coordination utilisent des pluriels naturels
(« 1 réponse attendue », « 0 exécutant actif », « 2 exécutants actifs »), vérifiés
par un test unitaire dédié. Aucun agent n'est inventé à partir de la concurrence
configurée : seuls les exécutants réellement projetés sont comptés.

Le dernier parcours complet collecte de trois intentions → plan → décision →
coordination des enfants → résultat principal terminé malgré l'échec facultatif
a été rejoué sur le dernier build : 1/1. Les géométries du graphe partagé et les
pluriels affichés passent aussi. Artefacts :
`preuves-corrections-ui/panel-corrections-coordination-plurals/`.

Total des parcours GUI distincts de ce développeur : **25 reçus**. Les relectures
et les rejeux de ces mêmes parcours ne sont pas recomptés. Dernière réception
indépendante des notes/routage/drag : favorable, communiquée au responsable.


## Régressions découvertes par la suite source complète

La suite complète initiale a détecté trois régressions supplémentaires. Leurs
traces rouges originales sont conservées dans
`preuves-corrections-ui/rc13-full-first-regressions/`.

- **Question et sources à 1024×768** : l’aperçu répétait jusqu’à 1 800 caractères
  par entrée, y compris la demande complète et ses chemins. Il réserve maintenant
  l’aperçu à trois faits courts complets, dans une hauteur bornée ; la demande
  intégrale demeure dans « Entrées et sources ». Aucune donnée n’est supprimée.
  La question, les sources, la réponse et son bouton sont visibles ensemble avec
  le terminal, côte à côte à 1024×768 et verticalement à 1440×900. Les anciennes
  assertions de visibilité sont conservées et celles sur le formulaire ajoutées.
- **Focus après création** : quand les propriétés sont ouvertes, le nouveau bloc
  place le focus dans son titre. En mode compact, sa carte reste la cible clavier
  et le graphe reste affiché.
- **Ctrl+S depuis un champ** : le filtre des champs éditables empêchait le
  raccourci de sauvegarde. Il est maintenant traité avant ce filtre, uniquement
  dans l’éditeur sans dialogue et hors terminal. Le test lit aussi le titre
  sauvegardé via `project.get`, avant toute navigation, pour prouver la persistance.

Ces trois contre-épreuves passent sur le build rc.13 commun : **3/3 en 14,6 s**,
preuves `rc13-question-keyboard-focus/`. Le parcours support confirme que le
constat court reste lisible avant la confirmation, dans les deux branches Oui/Non.
Le parcours clavier compact confirme que Ctrl+S/Ctrl+Q restent transmis au
terminal sans changer la session ni le graphe : **2/2 en 25,7 s**, preuves
`rc13-short-confirmation-terminal/`. Les captures ont été relues, pas seulement
les assertions. Aucun fournisseur IA payant n’a été exécuté (fixtures synthétiques
et PATH sans Codex/Claude). Syntaxe JavaScript et `git diff --check` sont verts.

Ces cinq cas sont des contre-épreuves ciblées, et non une revendication de nouvelle
recette complète. Les trois premiers sont supplémentaires au lot de 25 parcours
UI mentionné plus haut ; support et clavier en sont des rejeux.

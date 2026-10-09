# CI c5013e4 — détachement pendant le positionnement d’une capture

**Diagnostic indépendant : course du banc de capture contre le remplacement d’un élément DOM. Aucun défaut produit établi par cet échec.** La reprise locale du seul positionnement, avec nouvelle résolution du locator et contrôle réel du viewport, est adaptée. Elle conserve le scénario et ses assertions métier.

La CI source termine à **145 réussis / 1 échec / 2 ignorés**, code 1. Son build de distribution et sa suite paquet ne sont pas exécutés : ils ne sont donc pas reçus par cette CI. Cette preuve rouge ne remet pas automatiquement à zéro les réceptions locales précédentes, mais ne doit pas être présentée comme une CI verte.

## Preuve et mécanisme

Le cas `conversation-overview.spec.cjs:75` retourne à la vue d’ensemble, passe à 1024×768 et zoom 125 %, choisit le thème sombre, puis appelle `row(5).scrollIntoViewIfNeeded()` pour préparer une capture. Dans la trace, l’opération commence à 12 540,996 ms et échoue à 12 618,049 ms, soit **77 ms**, pendant l’attente de stabilité. Ce n’est pas une expiration d’attente du résultat métier.

Le snapshot d’échec contient toujours les six demandes, **C1 — Consolider les résultats de R1 à R4**, son action Voir les dépendances et ses quatre liens nommés R1 à R4. La vue d’ensemble reste sélectionnée, le terminal est présent et le thème sombre sélectionné. Il n’établit donc ni disparition de C1 ni rupture des dépendances. En revanche, la capture sombre et les assertions de largeur/continuité qui la suivent n’ont pas été exécutées dans ce cas rouge.

Le code produit peut remplacer ces cartes : `src/studio.js:335–344` reconstruit l’HTML de la vue d’ensemble si sa représentation change, puis restaure son défilement et son focus ; le polling à 1 seconde (`1512–1532`) et la transition du panneau compact (`1296–1303`) peuvent repasser par cette peinture. Le thème externe applique les préférences (`src/cockpit.js:346–351`). **La trace n’identifie pas le callback exact du remplacement** : l’attribuer avec certitude au seul changement de thème serait excessif.

L’implémentation Playwright installée confirme la fragilité précise : `node_modules/playwright-core/lib/coreBundle.js:58557` fait passer le locator de scroll par `_withElement` (`58354`), qui résout une fois un `ElementHandle`. L’attente de stabilité est ensuite liée à ce handle (`20064–20075`). Si l’élément est remplacé, `notconnected` est propagé ; ce chemin ne résout pas automatiquement une nouvelle carte comme le ferait une nouvelle opération sur le locator. L’échec CI est exactement celui attendu dans cette fenêtre.

Les traces, snapshot, capture claire disponible, log complet et empreintes sont conservés dans [original](original/), avec [index](index.json). Sources produit, `dist/app.js` et ASAR ont les mêmes empreintes que la réception locale ; ASAR `aa118d030f1f6cbe500462921b873e2d84fef283d1218acc4064a9367356d944`.

## Correction relue et contre-épreuve ciblée

Diff du responsable relu : seule la préparation de la capture est encadrée par :

```js
await expect(async () => {
  await row(5).scrollIntoViewIfNeeded();
  await expect(row(5)).toBeInViewport();
}).toPass({timeout: 5000});
```

`row(5)` conserve son sélecteur exact `data-run` ; chaque nouvelle tentative retrouve la carte actuelle. Une disparition durable, une carte qui reste hors viewport ou un remplacement continu empêchant son positionnement font toujours échouer le contrôle. Aucune capture forcée, pause arbitraire ou relance du parcours complet. Les contrôles des six demandes, des quatre liens, du passage vers R3, de la décision et des dépendances, de l’absence de débordement horizontal et de la conservation des sessions restent présents.

Contre-épreuve confiée au responsable pour éviter un doublon : **cinq répétitions du seul scénario corrigé réussies en 32 secondes**, code 0 communiqué par le responsable, même bundle, display isolé. Le [log des cinq passages](targeted/five-repetitions.log) et une [capture sombre représentative](targeted/overview-dependencies-dark-1024-125.png) sont archivés avec leurs [empreintes](targeted/index.json).

Capture inspectée à 1024×768/125 % : C1 est visible, son action Voir les dépendances et ses quatre liens nommés restent lisibles dans le panneau, en même temps que le terminal. Les assertions finales de largeur et de conservation des sessions ont été exécutées dans les cinq cas. Cela reçoit le résultat voulu après positionnement ; ces réussites ne prétendent pas compter les remplacements DOM ni prouver que chacun des cinq passages a dû réessayer.

**Avis final sur cette correction du banc : favorable, prêt à commit.** Aucun produit modifié ; ASAR et `dist/app.js` restent identiques aux empreintes reçues. Le reviewer n’a lancé aucun processus GUI, aucune suite ni aucun build et n’a modifié que ce dossier. La prochaine CI complète reste à recevoir ; celle de c5013e4 demeure rouge. Les limites produit déjà documentées restent inchangées.

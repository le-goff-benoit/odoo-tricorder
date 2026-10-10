# Réception indépendante — demandes longues

10 octobre 2026. Revue ciblée à la suite du défaut trouvé par la suite source
complète : l'ouverture d'une demande projetée sous la forme `$artifact/preview`
appelait `split` sur un objet. Le rouge initial de la suite complète est rapporté
par l'orchestrateur ; il n'a pas été rejoué indépendamment sur l'ancien build.

**Réception favorable sur ce périmètre.** Le correctif `requestHeading`, les deux
usages résiduels du format objet et le retour après création d'un remplacement
sont reçus. Trois parcours GUI sont verts sur le dernier build rc.13, en plus des
contre-épreuves isolées. Aucun P1/P2 non résolu confirmé sur ce périmètre. Aucun
rebuild effectué par le reviewer, aucun essai sur les projets utilisateurs.

## Correctif reçu en lecture et tests isolés

`src/execution-view.mjs:2` accepte une chaîne ou l'aperçu textuel d'une référence
de contenu, borne la première ligne à 300 caractères plus une ellipse, puis
utilise un titre de repli. Un objet quelconque n'est jamais converti en texte.
Les trois appels de `src/studio.js` couvrent les titres d'Activité, de la liste
des exécutions et du workflow ouvert. Le rendu passe encore par l'échappement HTML.

Les **12 tests** de `tests/execution-view.test.cjs` passent. La contre-épreuve
indépendante ajoute : aperçu vide, objet ordinaire contenant seulement `preview`,
arguments absents/non textuels et première ligne de 100 000 caractères.
Le titre issu de la demande longue reste « Préparer un bilan complet ».

`executionRequest`, dans `src/studio.js`, conserve sa fonction de récupération
intégrale : `configure-execution` attend toutes les pages avant de proposer une
copie ; `configure-execution-copy` alimente ensuite le brouillon de lancement
avec ce texte complet. La réduction du titre n'écrase donc pas la demande.

La fixture synthétique passe réellement par `Engine.start`, `run_detail` et
`proof_page` : **73 647 caractères / 82 848 octets**, caractères accentués et
lettre grecque, répartis sur **trois pages**. La fonction front réelle
`executionRequest`, extraite sans réécriture, reconstitue le texte à l'identique,
y compris le marqueur final. Le run moteur et l'objet front restent inchangés.
Une page non textuelle ou un offset qui ne progresse pas provoquent le refus
attendu, sans préparation de nouveau lancement.

## Défauts résiduels confirmés

| Priorité | Localisation au constat | Contre-épreuve et impact |
|---|---|---|
| P1 | `src/studio.js:396`, `addRequestDialog(true)` | Le formulaire de remplacement fait encore `esc(state.run.parameters.request)`. Avec la projection réelle, la fonction front produit un textarea contenant **`[object Object]`**. La demande originale est conservée dans le run, mais le brouillon de remplacement perd son contenu ; un utilisateur peut enregistrer cet objet converti en demande. Récupérer le texte intégral avant d'afficher le formulaire. |
| P2 | `src/studio.js:1565`, action `execution-results` | Le paragraphe d'introduction utilise la même coercition et affiche **`[object Object]`** au-dessus des résultats d'une demande longue terminée. Utiliser le titre textuel borné pour cette présentation. |

Un troisième chemin de présentation, le `requestTitle` des résultats coordonnés,
utilise un `split?.` : il ne plante pas sur la référence, mais retombe sur le nom
du workflow au lieu de l'aperçu concret de la demande. Harmonisation souhaitable
avec `requestHeading` ; aucun blocage métier supplémentaire établi.

Ces constats initiaux proviennent de la projection réelle et de l'exécution de la
fonction de formulaire avec un DOM/transport réduit. Ils ont été signalés à
l'orchestrateur avant modification du produit ; la contre-réception Electron
finale figure ci-dessous.

### Contre-réception des corrections

L'orchestrateur a corrigé le formulaire pour attendre `executionRequest` avant
d'afficher la demande. Le rejeu de la fonction front réelle restitue maintenant
**exactement les 73 647 caractères** dans le champ. La demande d'origine reste
inchangée. Le paragraphe des résultats et le titre de l'inspecteur utilisent
désormais `requestHeading`.

Trois contre-épreuves de concurrence retardent la récupération puis changent
séparément la génération de vue (`viewEpoch`), la conversation courante et le run
courant. Dans les trois cas, la réponse périmée est ignorée : aucun dialogue
n'apparaît et aucun `dependencyDraft` n'est écrit. La preuve verte conserve le
texte exact de la fonction corrigée.

## Preuves rejouables

- [Script moteur synthétique](preuves-review-long-request/reproduction.py) :
  répertoire temporaire supprimé à la fin ; pas de vrai CLI ni de service externe.
- [Script front indépendant](preuves-review-long-request/reproduction.cjs) :
  extrait les fonctions réelles, teste récupération et formulaire.
- [Preuve initiale](preuves-review-long-request/avant-remplacement.json) : métriques,
  rouge du remplacement et texte exact des fonctions observées.
- [Contre-preuve après correction](preuves-review-long-request/apres-remplacement.json) :
  texte intégral, objets inchangés et trois réponses périmées refusées.
- [Dernier rejeu source](preuves-review-long-request/apres-final.json) : mêmes
  garanties après ajout de la navigation vers le remplacement.

Commande depuis le dépôt :

```sh
node release/2026-10-10_contrats-et-editeur/.suivi/preuves-review-long-request/reproduction.cjs
```

## Réception graphique

Trois parcours pérennes de `tests/functional-feedback.spec.cjs`, ajoutés ou
renforcés par l'orchestrateur, sont exécutés indépendamment dans Electron sur
`:188`, avec répertoires personnels jetables et fournisseurs inertes. Aucun
envoi, aucune exécution de modèle réel. Les empreintes du build avant/après sont
identiques : [build-final.sha256](preuves-review-long-request/build-final.sha256).

| Parcours | Réception |
|---|---|
| Ajout normal, dépendance AND sur quatre demandes, annulation d'un prérequis | Vert, 4,9 s ; vue d'ensemble conservée et dépendance annulée identifiable |
| Demande longue en échec ouverte depuis Activité, configuration d'une copie puis nouveau lancement | Vert, 3,5 s ; titre lisible, texte initial intégral dans le lancement, run et résultats initiaux inchangés |
| Remplacement d'une demande longue bloquée, sauvegarde et résultats | Vert, 4,1 s ; texte intégral dans le champ puis dans la nouvelle demande, identifiant distinct, ancien run inchangé, ouverture du remplacement et accusé visibles, résultats sans objet brut |

La [capture finale relue](preuves-review-long-request/long-request-preserved-and-readable.png)
montre une demande titrée « Relire le dossier de réunion et ses engagements »,
un compte rendu et un résultat lisibles, ainsi que l'accusé de remplacement.
Le [bilan machine](preuves-review-long-request/recette-gui.json) précise le
périmètre et les reprises de banc.

### Retour UX reçu pendant ce passage

Après une première sauvegarde correcte, l'écran restait sur la demande précédente
bloquée, sans confirmation de création. Le test de résultats supposait une
navigation qui n'existait pas. Au-delà du banc, ce comportement était une réserve
UX P2 : l'utilisateur pouvait croire que le remplacement avait échoué.

L'orchestrateur a corrigé `conversation-add-form` pour ouvrir le nouveau run dans
le cas d'un remplacement et confirmer que l'ancien reste conservé. L'ajout normal
conserve sa vue et confirme l'ajout. La dernière réception prouve l'ouverture,
l'absence de l'ancien blocage, l'accusé et la conservation des données. Ce point
est donc clos.

Deux autres arrêts étaient des défauts du banc, sans modification produit :
`getByLabel` ne retrouvait pas le label englobant le textarea prérempli, alors que
le rôle accessible `textbox` était correctement nommé « Demande » ; puis une
assertion visait `#feedback` au lieu du toast `.flash`. Les assertions de contenu
intégral, de conservation et de résultat n'ont pas été assouplies.

Les traces du rouge source original et des deux premiers passages de diagnostic
restent archivées dans le dossier de preuves. Cette réception ciblée ne remplace
pas les suites complètes source et application empaquetée pilotées séparément par
l'orchestrateur.

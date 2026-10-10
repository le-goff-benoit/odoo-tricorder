# Réception indépendante de l'interface corrigée

10 octobre 2026, build rc.13 figé par le développeur avant réception. Point de vue
business analyst modérément technique : comprendre une demande, approuver son
plan, suivre ses travaux et revenir au contexte global en conservant le terminal.

**Réception favorable sur les parcours vérifiés.** Le parcours principal et
l'ancien P1 de cadrage sont reçus. Un P2 de routage des liens autour des notes,
accompagné d'un défaut d'interception du geste de déplacement, a été trouvé puis
corrigé et reçu indépendamment. Aucun nouveau P1 n'a été confirmé sur ce parcours.

## Parcours réellement exécuté

Application Electron sur écran isolé `:188`, répertoire personnel temporaire,
projet « Support client · recette indépendante ». Les fournisseurs IA sont des
exécutables inertes. Le terminal est un shell réel dans le répertoire temporaire ;
les mêmes identifiant et PID sont vérifiés à la fin. Aucune session utilisateur,
donnée client, connexion email/Slack ou exécution de modèle réel n'est utilisée.

Le workflow est créé par l'API publique, puis une note est ajoutée depuis l'éditeur.
Deux intentions donnent un plan unique de cinq demandes. Le plan possède un
`goal` sans `title`, afin d'éviter que le test ne masque le cas PM-1. La validation
du plan et le lancement des éléments passent par les boutons de l'application.

Les trois premières demandes sont terminées via les commandes publiques du moteur.
La quatrième attend une question ; la cinquième dépend de la quatrième. Le
parcours ouvre ensuite les enfants directement depuis Projets et Activité, répond
aux deux questions dans l'interface, revient au parent et lit les résultats.
La disponibilité des dépendances est avancée par la commande publique `tick`.

## Résultats de réception

| Point | Résultat |
|---|---|
| Ancien P1 : ouvrir le terminal depuis le graphe large | Carte sélectionnée intégralement visible horizontalement ; son en-tête reste visible |
| Réduire la fenêtre de 1500 à 1100 px | Même contexte visible, plus de panneau apparemment vide |
| Déplacer le séparateur au clavier | Graphe recadré dans sa nouvelle largeur |
| Passer en disposition verticale puis revenir | En-tête de la carte sélectionnée visible dans les deux dispositions ; terminal conservé |
| Déplacer volontairement la vue puis attendre l'actualisation | Position conservée après 1,4 seconde ; pas de recentrage parasite |
| « Ajuster » à 1100 px | Tous les blocs rentrent dans le viewport, contrôlé géométriquement |
| Objectif du plan dans `goal` | « Rétablir la connexion et informer le client » apparaît dans la carte et la décision |
| Plan produit avant accord | Badge « Produit » ; la décision humaine reste séparée |
| Cinq demandes dont une question en quatrième position | La question prioritaire et sa demande dépendante sont visibles dans le graphe ; leurs titres remplacent les identifiants opaques |
| Enfant ouvert directement depuis Projets | Titre concret de la demande et retour au workflow parent disponibles |
| Enfant ouvert directement depuis Activité | Même retour durable disponible, sans dépendre de l'historique de navigation |
| Compteurs Activité | Une demande et cinq tâches, sans les présenter comme six demandes indépendantes |
| Résultats des enfants | Fenêtre de lecture avec cartes titrées, projet et réponses ; aucune ouverture de JSON requise |
| Terminal au terme du parcours | Même session, même PID, contenu de recette conservé |
| Note ajoutée puis déplacée | Après correction ciblée : texte lisible, liens hors des notes et des cartes ; déplacement effectif sans ouverture d'un dialogue de lien |
| Note sauvegardée puis workflow lancé | Quatre blocs exécutables conservés ; aucune note dans la définition exécutée, note conservée dans le dessin original |

Les sept mesures de cadrage et les empreintes identiques du build avant/après se
trouvent dans [evidence.json](preuves-review-ui-corrections/evidence.json).

Captures utiles : [terminal à 1100 px](preuves-review-ui-corrections/04-terminal-graph-compact.png),
[disposition verticale](preuves-review-ui-corrections/05-terminal-stacked.png),
[vue complète ajustée](preuves-review-ui-corrections/06-fit-all-1100.png),
[enfant ouvert directement](preuves-review-ui-corrections/07-direct-child-project.png),
[activité](preuves-review-ui-corrections/08-activity-counts.png),
[lecture des résultats](preuves-review-ui-corrections/09-results-readable.png).

### Précisions sur le cadrage

À 1500 px, le panneau graphique s'étend de `x=909,8` à `1500` et la carte de
`x=1066,8` à `1326,8` : l'ancien dépassement a disparu. À 1100 px, le panneau va
de `x=672,1` à `1100` et la carte de `x=748,1` à `1008,1`.

En disposition verticale, la carte est plus haute que le panneau ; son en-tête
reste présent et le contenu se parcourt par défilement. La réception ne demande
pas de comprimer tout son texte pour le faire rentrer artificiellement.

Une première version du banc exigeait aussi un recentrage sur la sélection après
« Ajuster », puis clic sur 100 %. Cette attente a été retirée : le zoom conserve
normalement le centre du viewport. Le bouton Graphe permet ensuite de retrouver
la sélection. Le graphe restait visible dans ce cas ; il ne s'agissait pas du P1
initial ni d'un défaut confirmé.

## P2 trouvé — le détour autour de la note traverse ses blocs d'extrémité

L'ajout d'une note ne la place plus sous une étiquette. Toutefois le routage de
`plan → scope`, en évitant la note, traverse les cartes `plan` et `scope`. Le trait
est masqué sous ces cartes et semble en sortir par le bas, alors que les ports
sont latéraux. L'utilisateur perd la continuité visuelle du lien qu'il vient de
dessiner.

Reproduction mesurée dans le DOM, confirmant la première observation visuelle :

- cartes de 240 × 114 aux positions `(40,60)`, `(370,60)`, `(700,60)`, `(1030,60)` ;
- note de 280 × 180 en `(496,336)` ;
- lien `p-s` passant notamment par `(628,118) → (484,118) → (484,650)` puis
  `(788,650) → (788,118) → (682,118)`, à l'intérieur des deux cartes d'extrémité.

Source au constat : `src/design-layout.mjs:93–114`. Les cartes source et
destination sont exclues de la liste d'obstacles transmise à `clearObstacles` ;
le détour ajouté pour la note peut donc rentrer dans l'une ou l'autre.

[Capture rouge](preuves-review-ui-corrections/10-routage-notes-rouge.png),
[géométrie du DOM](preuves-review-ui-corrections/routage-notes-rouge.json).
Ce constat a été transmis au développeur avec le script et les coordonnées. Il
ne remet pas en cause les transitions moteur, mais reste une réserve ergonomique
réelle de l'éditeur.

Le premier essai de déplacement de cette note ouvrait par ailleurs « Modifier le
lien ». Le développeur a reproduit la cause : `pointer-events:all` rendait
cliquable l'intérieur de la boucle SVG, même loin du trait. Ce comportement est
un défaut produit confirmé, et non une simple erreur de temporisation du banc.
[Capture du dialogue inattendu](preuves-review-ui-corrections/10b-glisser-note-dialogue-lien-rouge.png).

### Réception du correctif de routage et de sélection

Le développeur a conservé les petits segments de sortie/entrée des ports, puis
routé le corps du lien autour de toutes les cartes (`design-layout.mjs:121`).
La zone cliquable est limitée au trait élargi (`studio.css:263`). Le build ciblé
a été gelé pendant la contre-épreuve indépendante, sans changement concurrent.

Résultats du nouveau parcours court sur le DOM réel :

- zéro segment à l'intérieur d'une carte, avant puis après déplacement ;
- zéro croisement des notes avec un trait ou une étiquette ;
- déplacement réel de la note `(496,336) → (546,371)`, sans dialogue ouvert ;
- ports toujours raccordés visuellement ;
- sauvegarde effective, puis démarrage synthétique : quatre blocs, zéro note
  dans la définition exécutée et une note dans le dessin original ;
- empreintes du build identiques avant et après la recette ciblée.

[Mesures vertes](preuves-review-ui-corrections/routage-notes-vert.json),
[routage reçu](preuves-review-ui-corrections/11-routage-notes-vert.png),
[note déplacée](preuves-review-ui-corrections/12-note-deplacee-verte.png),
[script ciblé](preuves-review-ui-corrections/contre-epreuve-notes.cjs).
Les deux défauts reproduits de note/lien sont levés. Le parcours runtime déjà
vert n'a pas été relancé pour ces seuls changements de géométrie et sélection.

## Lecture ergonomique et limites

Le suivi permet désormais de répondre aux questions utiles : quel est le plan,
quelle demande attend une réponse, quelle autre en dépend, comment retrouver le
parent et où lire les livrables. La synthèse principale ne répète plus le même
compteur dans plusieurs bandeaux. La séparation terminal/suivi conserve son
contexte lors des changements de disposition.

Le graphe reste une carte compacte du travail, avec un aperçu de trois éléments et
un accès à la liste complète ; les compteurs rendent les éléments hors aperçu
explicites. À 1100 px, la disposition verticale ou le zoom restent utiles pour
les longs textes. « Ajuster » montre la structure complète, au prix d'un texte
plus petit ; ce n'est pas une preuve de lisibilité de chaque phrase à ce zoom.
Dans l'éditeur, les liens contournant une note peuvent encore être longs et
nécessiter du défilement ; leur réduction reste une piste ergonomique, sans
nouvelle collision constatée dans l'exemple reçu.

La réception porte sur une famille de cinq demandes et des résultats courts.
Les workflows plus grands, les nombreuses branches, les textes très longs, les
technologies d'assistance, les fournisseurs réels et les effets de plugins restent
hors de ce parcours. Le test ne prétend pas prouver des agents effectivement
exécutés en parallèle : il vérifie l'affichage de leurs états synthétiques et la
conservation du terminal.

Le [script indépendant](preuves-review-ui-corrections/parcours-independant.cjs)
et les captures sont permanents dans ce dossier. Les anciens échecs de banc ne
sont pas assimilés à des défauts produit. Aucun fichier produit n'a été modifié
par le relecteur.

# Review indépendante du layout et de l’ergonomie — 9 octobre 2026

État : réception UI terminée, y compris le complément ciblé du contrôle QA.
Les dix écarts P2/P3 signalés ci-dessous ont été corrigés et reçus sur les parcours
concernés. Aucun écart visuel bloquant ne reste ouvert dans ce périmètre.
La réception fonctionnelle du moteur demeure indépendante.
Cette review porte sur la lecture et la manipulation de l’application, pas sur
la seule absence de débordement CSS. Elle complète l’audit du moteur.

## Méthode et périmètre

Application Electron réelle, projets, profils et terminaux synthétiques isolés.
Aucun compte connecté, appel de modèle, envoi ou projet client utilisé. Aucun
changement dans le code de l’application par le reviewer. Les captures sont
produites à un zoom navigateur de 100 % ; le zoom propre du graphe est affiché
séparément dans son pied de page.

La review combine parcours interactifs, inspection des captures et mesures de
`getBoundingClientRect`/`getComputedStyle`. Les familles de police, poids, taille,
hauteur de ligne, géométrie et débordement sont enregistrés avec l’empreinte du
bundle inspecté dans les fichiers de résultats. Les variantes de titre, label,
texte, terminal et code sont distinguées : plusieurs tailles intentionnelles
ne constituent pas une anomalie.

| Groupe | Vérification effectuée au premier tour |
|---|---|
| Navigation, bandeau, accueil | Clair/sombre, 1440 × 900 ; adaptation 1024 et 800 × 900. |
| Modèles, projets, workflows globaux | Recherche, cartes/actions, hiérarchie, alignement et espace disponible. |
| Connexions, planifications | États, contexte, champs et actions ; pages claires/sombres ; connexions à 1024/800. |
| Éditeur | Graphe, inspecteur, champs de bloc, I/O, choix de l’IA et dialogue de lancement. |
| Exécution simple | Simulation signalée, bloc sélectionné, terminal côte à côte puis vertical ; 1440/1024/800. |
| Paramètres, mises à jour, À propos | Ouverture et inspection des dialogues ; pas de téléchargement ni modification des réglages réels. |
| Vues héritées de release | Statut, Plan, Demandes, Mémoire, Temps, Express et Kanban sur projet synthétique. |
| Quotas et commandes des agents | Ouverture et inspection ; aucune commande d’agent exécutée. |
| Mail à quatre demandes | États mixtes reçus en largeur 1440 et 1024 × 768 ; terminal côte à côte et vertical à 52 %, en clair/sombre. |

Les scripts sont dans [le dossier de preuves](2026-10-09-layout-ui-ux/).
Ils ne lancent pas `build` et n’écrivent pas dans `test-results`.

## Écarts confirmés au premier tour

### UX-01 — P2 — Les sections Entrées et Sorties se mélangent

Dans l’inspecteur, le titre « Sorties » reste sur la ligne du bouton « Ajouter
une entrée ». Il paraît être son complément au lieu de commencer un groupe
indépendant. Le fieldset conserve aussi une bordure double claire du navigateur,
contrairement aux autres composants.

Reproduction : ouvrir l’exemple, sélectionner « Comprendre la demande », regarder
le groupe I/O. À 1440 × 900, le bouton d’entrée est à x1162,75/y640,39, largeur
134,77 et hauteur 36 ; le titre de sortie commence à sa droite. Le défaut gêne
l’association entre une donnée et son sens de circulation.

Preuve : [inspecteur avant correction](2026-10-09-layout-ui-ux/editor-inspector-dark-1440.png).
Correction proposée : deux sous-sections empilées, titres et actions propres,
bordure issue du système visuel. Aucune modification du contrat I/O nécessaire.

### UX-02 — P2 — Le style des valeurs de formulaire dépend du HTML

Les champs des filtres d’historique et du dialogue I/O sont à **12 px, graisse 600**,
hérités du `label` qui les enveloppe. Les champs « Choisir l’IA » et « Contexte »
sont à **13 px, graisse 400**. La différence correspond au balisage, pas à une
hiérarchie d’information : dans chaque cas il s’agit d’une valeur saisie ou choisie.

Preuves : [filtres](2026-10-09-layout-ui-ux/global-light-1440.png),
[dialogue I/O](2026-10-09-layout-ui-ux/io-dialog-dark-1440.png),
[choix IA](2026-10-09-layout-ui-ux/ai-dialog-dark-1440.png) et mesures dans
[layout-results.json](2026-10-09-layout-ui-ux/layout-results.json).

Correction proposée : donner explicitement aux contrôles la typographie des
valeurs de formulaire ; conserver le style des labels. Ne pas remplacer la
hiérarchie des titres ni la police monospace du terminal.

### UX-03 — P2 — Les textes métier sont présentés comme du code

Les valeurs textuelles d’un plan, diagnostic ou compte rendu passent par le même
`pre` que les objets JSON. La police monospace et les lignes de pleine largeur
rendent la lecture d’un texte rédigé moins confortable. Il faut distinguer le
format de la donnée de sa sécurité : conserver du texte échappé n’exige pas une
police de code.

Correction proposée : style de prose pour une chaîne, police UI, interligne
lisible et largeur de lecture bornée ; conserver les retours à la ligne et
l’échappement. JSON et preuves brutes gardent leur rendu technique. Aucun parseur
de contenu actif nécessaire. Le recontrôle utilisera un texte synthétique métier,
indépendant des marqueurs de test de sécurité.

### UX-04 — P3 — Les contrôles du bandeau ne partagent pas leur alignement

À 1440 × 900, le bouton Terminal s’étend de y15,75 à 51,75 ; le sélecteur fournisseur
de y27,5 à 57,5. Son label explique la différence, mais les contrôles adjacents ont
un bas décalé d’environ 6 px.

Correction proposée : aligner les contrôles en gardant le label et la hauteur
compacte du bandeau. C’est un défaut de finition, pas un obstacle à l’exécution.

### UX-05 — P2 — Le détail utile dispose de trop peu de hauteur en vue partagée

Avec l’exemple simple et terminal côte à côte, les titres, actions, onglets,
avertissement et barre d’outils prennent environ 308 px avant le graphe à 1440 ×900.
Le graphe conserve250 px et l’inspecteur233 px : le premier écran de détail
contient essentiellement le titre, l’état et une preuve ; le résultat et l’action
exigent un défilement. À1024 ×900, l’inspecteur est de 222 px. À800 ×900 en disposition
verticale, il commence à y979, sous la fenêtre.

Preuves : [1440](2026-10-09-layout-ui-ux/result-terminal-dark-1440.png),
[1024](2026-10-09-layout-ui-ux/result-terminal-dark-1024.png),
[800 vertical](2026-10-09-layout-ui-ux/result-terminal-dark-800.png).

Le mode « Lire le résultat » est une solution prévue par l’application. La
réception doit vérifier qu’il ramène réellement la question/réponse et l’action
utile à l’écran, et que l’on peut revenir au graphe sans perdre le terminal.
Compacter la navigation doit bénéficier aux exécutions simples comme aux
conversations. Les correctifs mail étaient encore en développement lors de ce
premier tour : cet écart ne préjuge pas du résultat final.

### UX-06 — P2 — Changer de demande ne montre pas son bloc courant

Dans le cas mail, cliquer R3 ou R4 change correctement le titre et la sélection,
mais le canvas reste au début du workflow. À1024 ×768, seuls les premiers blocs
sont visibles : le contrôle courant de R3 ou la QA échouée de R4 se trouve hors
écran. L’inspecteur est aussi sous la limite visible en mode graphe. Le changement
de sujet ne permet donc pas de comprendre visuellement l’étape qui demande une
action.

Preuves : [R3](2026-10-09-layout-ui-ux/mail-r3-dark-1024-768.png) et
[R4](2026-10-09-layout-ui-ux/mail-r4-dark-1024-768.png).
Correction demandée : centrer le canvas sur son bloc pertinent lors de l’ouverture
ou du changement explicite de demande. Ne pas recentrer au polling et ne pas
déplacer le terminal ; le mode lecture choisi doit rester conservé.

### UX-07 — P2 — L’état d’une demande diffère entre dashboard et détail

Dans le même instantané synthétique, R4 est « Échec · reprise nécessaire » dans
les cartes et l’historique, mais « Réponse attendue » dans le tableau de bord.
Le rendu du dashboard privilégie directement un nœud `waiting_input` avant le
libellé commun du run, ce qui masque la raison de cette reprise : l’échec de QA.

Preuves : [dashboard](2026-10-09-layout-ui-ux/mail-dashboard-light-1440.png) et
[historique](2026-10-09-layout-ui-ux/mail-history-light-1440.png).
Correction demandée : même état calculé pour une même demande, avec sa prochaine
action séparée du diagnostic d’échec.

### UX-08 — P2 — Les titres des listes contiennent des chemins et empreintes

Le dashboard et l’historique affichent le corps multiligne de la demande comme
titre tronqué. Dans le cas mail, les chemins des sources et leurs empreintes
occupent trois lignes par sujet et repoussent l’information métier. Les cartes
utilisent déjà correctement la première ligne.

Correction demandée : reprendre cette première ligne métier dans les listes.
Les sources intégrales doivent rester accessibles dans le détail et le rapport ;
il ne s’agit pas de supprimer leur provenance. Preuves : captures UX-07.

## Recontrôle des premières corrections

Les six vues `after-*` proviennent d’une nouvelle instance synthétique et d’un
bundle reconstruit par le développeur. La sonde
[controls-recheck.cjs](2026-10-09-layout-ui-ux/controls-recheck.cjs) s’est terminée
sans échec ; ses mesures sont dans
[controls-recheck-results.json](2026-10-09-layout-ui-ux/controls-recheck-results.json).

| Écart | Résultat mesuré |
|---|---|
| UX-01 | Corrigé : sections ày572,84/670,84, séparées ; bordure `solid`. |
| UX-02 | Corrigé : valeurs input/select à 13 px/400 dans filtres, I/O, IA et Paramètres ; labels distincts conservés. |
| UX-03 | Corrigé pour les chaînes métier : IBM Plex Sans13 px, interligne 20,8 px, largeur 624 px, `pre-wrap`. |
| UX-04 | Corrigé : bouton Terminal et sélecteur fournisseur se terminent ày63,5 px. |
| Clavier dialogue | Tab depuis la dernière action revient à Fermer ; Escape ferme le dialogue. |

[Diagnostic synthétique lisible après correction](2026-10-09-layout-ui-ux/after-diagnostic-readable-light-1440.png) :
le texte présente le constat, une hypothèse et la prochaine vérification. Il
n’annonce aucun correctif ni test client réellement effectué.

## Réception finale du cas mail

La dernière sonde [final-layout-recheck.cjs](2026-10-09-layout-ui-ux/final-layout-recheck.cjs)
s’est terminée sans échec et a produit 11 captures. Ses assertions et mesures sont
conservées dans [final-layout-results.json](2026-10-09-layout-ui-ux/final-layout-results.json).
Bundle renderer inspecté :
`a2a28e570a07b0862f17ed8e2dd15f64115cd34623b2887fb309da91220db909`.

| Écart | Réception finale |
|---|---|
| UX-05 | Corrigé sur le parcours mail : en vertical à 1440 × 900, terminal 52 %, le titre/état de R1, la synthèse, la question, les sources, le champ et le bouton Répondre sont visibles sans défiler. |
| UX-06 | Corrigé, y compris R1 → R3 → R4 en lecture puis retour explicite au graphe. Le bloc pertinent est dans le canvas ; un déplacement manuel reste inchangé après 2,5 s de polling. |
| UX-07 | Corrigé : le dashboard affiche la même qualification « Échec · reprise nécessaire » pour R4. |
| UX-08 | Corrigé : le dashboard affiche les quatre titres métier courts, sans chemins ni empreintes. Le même helper est utilisé dans la liste d’historique. |

En mode compact, ouvrir la synthèse présente les quatre sujets et leurs états ;
choisir R3 referme la liste, conserve le mode lecture et affiche son résultat à
contrôler. L’utilisateur peut revenir au graphe. Le terminal a conservé le même
identifiant, le même PID et son état vivant pendant le parcours. Aucun second
terminal ni aucune seconde fenêtre utilisateur nécessaire.

Mesures finales à 1440 × 900 en vertical : terminal 429,26 px de haut, panneau
workflow 390,24 px, inspecteur 224,05 px. À 1024 × 768, le bloc pertinent après
retour au graphe mesure 192 × 91,20 px, à x717,05/y591,68, dans un canvas de
376,45 × 147,88 px à x632,55/y570,68. La petite surface du graphe reste compensée
par le choix explicite de lecture et le centrage sur le sujet utile ; elle n’est
pas présentée comme une vue panoramique de neuf blocs.

Captures à retenir :

- [Question et réponse avec terminal à 52 %](2026-10-09-layout-ui-ux/final-mail-r1-stacked-light-1440.png).
- [Les quatre demandes accessibles en mode compact](2026-10-09-layout-ui-ux/final-mail-requests-stacked-light-1440.png).
- [Retour au bloc courant à 1024 × 768](2026-10-09-layout-ui-ux/final-mail-r4-focused-graph-dark-1024-768.png).
- [Dashboard avec états cohérents et titres courts](2026-10-09-layout-ui-ux/final-mail-dashboard-light-1440.png).
- [Lecture d’un diagnostic métier synthétique](2026-10-09-layout-ui-ux/after-diagnostic-readable-light-1440.png).

Le mail de test contient effectivement les quatre observations. La CLI de
substitution et les changements d’état sont déterministes ; ces captures ne
prouvent ni le raisonnement d’un modèle réel, ni une connexion à une messagerie,
ni un test métier Odoo. Le libellé d’exécution réelle signifie que le moteur a
exécuté son protocole hors mode simulation ; il ne transforme pas la fixture en
intervention client réelle.

## Complément ciblé : QA, formulaire de réponse et titre de bloc

### UX-09 — P3 — Alignement du formulaire de réponse : corrigé

Avant correction, dans le formulaire de réponse horizontal compact, le bouton
Répondre termine à y857,65 et la boîte du label/champ à y851,65. La marge basse
héritée du label produit un décalage de 6 px. Champ et action restent entièrement
visibles et utilisables.

Après correction locale, label et bouton se terminent tous deux à **y851,65 px** ;
la marge basse du label vaut 0. À 1440 × 900 avec terminal vertical à 52 %, la
question, les sources, le champ et l’action restent visibles sans défilement.
Le contexte de R1 et le terminal restent également lisibles à 1024 × 768.

Preuve de livraison retenue :
[Répondre aligné avec le terminal à 52 %](2026-10-09-layout-ui-ux/qa-answer-aligned-stacked-light-1440.png).
Sonde : [answer-alignment-recheck.cjs](2026-10-09-layout-ui-ux/answer-alignment-recheck.cjs),
[mesures](2026-10-09-layout-ui-ux/answer-alignment-results.json).

### Contrôle QA du candidat : reçu dans l’inspecteur

La case « Contrôle QA du candidat » est lisible en clair à 1440 × 900 et en sombre
à 1024 × 768. La case mesure 18 × 18 px ; son label utilise IBM Plex Sans, 14 px,
graisse 400. L’aide distingue la réception d’un candidat et sa vérification réelle.

La sonde indépendante a contrôlé sur un bloc Tâche :

- activation et désactivation au clavier avec Espace ;
- entrée `candidate: object` et sortie `verdict: string` ajoutées au formulaire ;
- conservation du titre et de la case pendant l’ajout d’une sortie personnalisée,
  le passage à un autre bloc, le retour et le rechargement d’un brouillon ;
- enregistrement puis relecture du booléen `candidate_check: true`, puis `false` ;
- conservation des ports déjà créés lors de la désactivation, sans suppression
  silencieuse de données du workflow.

Preuves : [qa-control-recheck.cjs](2026-10-09-layout-ui-ux/qa-control-recheck.cjs),
[résultats et instantanés enregistrés](2026-10-09-layout-ui-ux/qa-control-recheck-results.json).
Cette réception valide la manipulation de la configuration, pas l’exécution
effective d’une QA ni chacun des types de bloc. Les contrats Agent/Commande et
le refus des pseudo-contrôles documentaires relèvent de la review fonctionnelle.
Bundle inspecté pour cette sonde et le formulaire de réponse :
`d0856b137dafeb6e518c7b70e7e562ffdac7604e9d487e82db2771391376fde5`.

### UX-10 — P2 — Le titre naturel dépasse du bloc : corrigé

La réception QA a exposé un défaut local : « Vérifier le candidat sans agent
imposé » débordait à droite du bloc, car le texte héritait de `white-space: nowrap`
du bouton. Le titre pouvait se superposer aux liens entre les étapes.
Preuves avant correction conservées :
[1440 clair](2026-10-09-layout-ui-ux/qa-candidate-checked-light-1440.png) et
[1024 sombre](2026-10-09-layout-ui-ux/qa-candidate-checked-dark-1024.png).

Après correction, ce titre tient entièrement sur deux lignes. À 1024 × 768, le
texte occupe x276 à415,20 dans un bloc de x236 à428 ; il reste 4 px avant la phase
puis 9,60 px avant le pied du bloc. Le titre ne recouvre aucun lien échantillonné ;
les ports, la phase et le type du bloc restent dégagés à l’inspection visuelle.
Le texte intégral reste aussi dans `title` et `aria-label`. Le rendu est limité
à deux lignes pour les titres encore plus longs ; leur totalité est accessible
dans l’inspecteur et par les attributs accessibles.

Captures finales :
[QA et titre sur deux lignes, 1440 clair](2026-10-09-layout-ui-ux/qa-title-wrapped-light-1440.png),
[1024 sombre](2026-10-09-layout-ui-ux/qa-title-wrapped-dark-1024.png).
La sonde [long-title-recheck.cjs](2026-10-09-layout-ui-ux/long-title-recheck.cjs)
est verte ; ses [mesures](2026-10-09-layout-ui-ux/long-title-recheck-results.json)
identifient le dernier bundle renderer inspecté :
`33cb8110c73d8f87a83d5a26faee60ba62d4fca84daf4473578b52bb1af39024`.

## Éléments satisfaisants

- Même famille UI effectivement utilisée : IBM Plex Sans. La présence de
  monospace dans le terminal, les identifiants et les données techniques est
  intentionnelle ; elle n’est pas signalée comme défaut global de police.
- Bibliothèque : cartes de même colonne alignées, actions en pied de carte,
  recherche lisible, pas de boutons cassés sur plusieurs lignes aux tailles vues.
- Navigation : quatre destinations principales séparées de la configuration ;
  les outils secondaires se replient. La sélection reste visible sans dépendre
  d’une couleur seule.
- Les pages générales conservent toute la largeur quand le terminal est masqué.
  Le terminal réapparaît dans la même fenêtre ; aucune seconde application créée.
- Les surfaces claire/sombre et la hiérarchie titre/corps/label sont globalement
  cohérentes. Les défauts listés sont localisés et ne justifient pas une refonte.

## Limites de la réception

Cette réception n’est pas une homologation complète des actions métier, du modèle
IA, de l’authentification ou des connecteurs. La page Agents héritée n’est plus un
onglet direct : son ancien sélecteur a échoué dans la sonde et cette vue n’est pas
comptée comme inspectée. Les états d’erreur/réseau et la totalité des dialogues de
chaque connecteur ne sont pas tous couverts.

Les deux premiers passages de la sonde générale ont été ajustées pour attendre le contenu après les
navigations asynchrones ; les captures retenues des pages générales proviennent
du second passage. Le changement de thème demande d’attendre sa transition avant
une capture destinée à la publication. Les scripts incluent désormais cette
attente. Les captures sans préfixe `after-`, `final-` ou `qa-` sont des preuves du
premier tour ; les captures listées dans la réception finale et le complément
QA sont celles à retenir. Les deux captures `qa-candidate-checked-*` conservent
le défaut de titre avant correction ; utiliser `qa-title-wrapped-*` pour publier.
Le fichier `layout-results.json` assemble deux passages du premier tour, tandis
que les fichiers de recontrôle correspondent chacun à une seule instance.

La dernière contre-épreuve porte sur 1440 × 900 et 1024 × 768. À 800 px de large,
le premier tour a vérifié les pages générales et le mode lecture avec défilement ;
le contexte des demandes peut être au-dessus du panneau visible. Ne pas promettre
l’affichage simultané permanent du terminal, des quatre sujets, des neuf blocs et
de leur résultat sur cette largeur. Le redimensionnement des panneaux et la
lecture ciblée restent les moyens prévus.

Les tentatives de préparation de la sonde finale ont été adaptées au changement
de fixture : les quatre lignes métier doivent désormais être dans le `.eml`, et
le bloc pertinent de R4 est la question de reprise après QA, pas la QA terminée.
Un sélecteur du dépliant a également été précisé pour ne viser que son `summary`
direct. Ces adaptations de sonde ne sont pas comptées comme défauts applicatifs.
Le défaut réel de retour lecture → graphe a, lui, été reproduit puis corrigé et
contre-testé.

Le complément QA et les deux retouches visuelles ont été recontrôlés localement,
sans répéter l’ensemble des vues précédemment reçues. Le dernier bundle n’a pas
fait l’objet d’une nouvelle recette visuelle exhaustive ; cette réception réunit
des preuves fraîches pour chaque changement concerné. Aucun compte fournisseur,
email réel, modèle payant ou projet client n’a été utilisé.

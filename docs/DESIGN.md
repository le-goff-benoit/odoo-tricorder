# Socle visuel Tricorder

## Direction (23 septembre 2026)

Moderne, simple, épuré. L’interface s’efface devant le travail en cours : la
couleur est réservée à l’état, tout le reste est graphite.

- **Une police** : IBM Plex Sans pour toute l’interface, en casse naturelle
  (titres, onglets, badges, colonnes). IBM Plex Mono uniquement pour ce qui se
  lit comme une donnée : identifiants de tâche, séries, minuteurs, chemins, code.
  Aucune capitale espacée, aucune police d’affichage.
- **Surfaces graphite** : `--bg` (fond), `--surface-1` (barre latérale, cartes,
  colonnes), `--surface-2` (survol, cartes de Kanban), `--surface-3` (sélection).
  Les niveaux se distinguent par la luminosité, pas par la teinte ; bordures
  `--line` fines.
- **Un seul accent** (`--accent`, bleu pervenche) : sélection, focus, action
  principale, onglet actif, travail pris en charge. Pas de second accent décoratif.
- **Couleurs d’état** : sauge `--ok` (reçu, activité observée), ambre `--warn`
  (à relire, contrôle périmé, points d’attention), rose `--danger` (blocage,
  décision humaine, production), cyan `--info` (prête), violet `--orch`
  (orchestration). Un état inconnu reste neutre.
- **Signes d’état discrets** : un point de 8 px devant chaque ligne du Plan,
  un badge en casse naturelle à droite ; plus de barres colorées, de rail
  latéral segmenté ni de capuchons.
- **Onglets** : libellés simples soulignés par l’accent ; le raccourci Alt 1…8
  est annoncé (`title`, `aria-keyshortcuts`) sans être dessiné.
- Le terminal reprend exactement le fond et les couleurs de l’interface
  (thème xterm dérivé des jetons CSS).

La direction précédente (LCARS discret, Antonio) et son exploration restent
documentées dans [design/DIRECTION.md](design/DIRECTION.md).

## Règles du socle

`src/design-system.css` est le système visuel complet : jetons (couleurs, texte,
espacements), mise en page, composants réutilisables et responsive, chargé après
`src/style.css` qui ne conserve que les géométries spécialisées (terminal,
Markdown, dialogues, explorateur, mesures).

- Espacements : grille de 4 px, variables `--space-1` à `--space-11`.
- Alignement : `--page-gutter` commun aux pages, bandeau, onglets et ressources
  (24 px, puis 16 px sur fenêtre compacte).
- Sections : 20 px (16 px en compact) ; cartes : 16 px internes ; éléments liés : 8 ou 12 px.
- Kanban : colonnes sans fond/cadre ; cartes compactes (12 px internes), 8 px
  entre cartes. Les détails ne réduisent jamais la largeur du tableau : modale
  accessible avec Échap, retour au déclencheur et critères d’acceptation en premier.
- Aucun sélecteur de tâche global ni panneau latéral de suivi. La sélection du
  projet/release reste distincte de la consultation ponctuelle d’une fiche.
- En-tête en une ligne (`.topbar.project-header`) : nom du projet et pastilles
  méta, sélecteurs release/environnement en pastilles (`.pill-select`, libellés
  masqués pour les lecteurs d’écran), actions globales à droite ; onglets dessous.
  `header()` émet le balisage final ; aucune vue ne retouche l’en-tête après rendu.
  La bande d’activité et le compte sur l’onglet Agents n’existent que lorsqu’une
  activité est confirmée.
- Barre latérale sans monogramme : une ligne par projet (nom, série à droite,
  point vert si activité, pastille ambre de compte si attention) ; la sélection
  est un fond discret.
- Hiérarchie de texte à trois niveaux (`--text`, `--text-2`, `--text-3`) ;
  commandes : segments (`.segmented`/`.segment`) pour les modes, puces (`.chip`)
  pour les filtres, boutons fantômes (`.secondary`) pour les actions, accent (`.primary`)
  pour l’action principale ; badges 12 px à coins de 6 px, en casse naturelle.
- Une carte dit trois choses : identifiant + titre + état, une ligne de méta
  (responsable, étape ou preuve), l’activité observée. Les compteurs de critères,
  chemins de fichiers et phrases d’explication n’y figurent pas.
- Taille minimale du texte : 11 px (repères, libellés en capitales), 12 px pour
  tout contenu secondaire. Les onglets et le corps restent à 13 px.
- Un onglet ne propose pas de bouton « revenir à » un autre onglet : la navigation
  passe par la barre d’onglets et les raccourcis Alt 1…8 (Projet est un onglet).
- Le Plan a trois modes (liste, Kanban, dépendances) qui partagent filtres et
  responsable ; il n’existe pas de second onglet Kanban par release.
- Les vues sont émises en une passe : aucun `textContent` réécrit ni nœud déplacé
  après `innerHTML`. L’état d’ouverture des `<details>` est mémorisé par clé.
- Préférences : champs groupés par usage, unités explicites, validation native,
  Annuler/Enregistrer pour l’affichage ; dossiers et aide clavier séparés.
- Panneaux : rayon 8 px ; contrôles : rayon 6 px, hauteur 36 px pour les actions et champs ;
  commandes compactes (puces, segments, icônes) de 28 à 32 px.
- Titres de section : 15 px semi-gras ; cartes : 14 px ; contenu : 13 px ; détails : 12 px.
- Réutiliser `.page`, `.section-title`, `.info-card`, `.primary`, `.secondary`,
  `.cockpit-form`, `.table-scroll` et `.note`, sans redéfinir leurs espacements
  dans chaque écran. Ajouter les variantes au socle, pas en style inline.
- Statuts, avertissements et focus conservent une couleur et du texte ; ni la
  couleur seule ni la taille du panneau ne portent une décision métier.
- Les tableaux et Kanbans défilent dans leur propre zone. Le terminal garde sa
  géométrie xterm (cellules et curseur), le Markdown ses espacements relatifs en em.

Les tests contrôlent l'usage des variables et les styles calculés des composants
sur Plan, Kanban, Express, Agents, Temps, Fichiers, Sources, Environnements et
les dialogues. Les captures desktop/compact complètent ces contrats ; ce ne sont
pas des comparaisons pixel à pixel de tous les contenus possibles.

## Cohérence des sous-vues

- `design-system.css` est le dernier socle chargé ; Mémoire utilise ses composants
  sans feuille de surcharge locale. Les couleurs spécialisées utilisent les mêmes
  variables, y compris fenêtres, historique, lecteurs et terminal.
- Les polices doivent être réellement chargées depuis `dist/fonts/` : les URLs du
  CSS sont relatives à ce dossier. Le test Electron vérifie leur chargement avec
  des caractères français, en complément de leur présence sur disque.
- Les titres et tableaux d’un document Markdown gardent leur casse et des
  cellules repliables.
- Prise en charge / exécution : accent ; activité observée / réception : sauge ;
  à relire / contrôle périmé : ambre ; orchestration : violet ; disponibilité :
  cyan ; blocage / décision humaine : rose. Les états inconnus restent neutres,
  jamais verts par défaut.
- Les choix de contexte sont des boutons secondaires avec sélection explicite ;
  Enregistrer est l’action principale d’un formulaire. Les descriptions longues
  des skills et les noms de fichiers peuvent revenir à la ligne.
- Les formulaires adaptent leurs colonnes à la place disponible dans leur fenêtre.
  Les dialogues ont un titre accessible, une fermeture visible au défilement et
  une remise en haut lors d’un changement de contenu. Échap ferme le dialogue ;
  dans la recherche terminal, Échap rend le focus au terminal.
- Revue et périmètre vérifié : [passe UI/UX du 16 septembre](UI_REVIEW_2026-09-16.md).

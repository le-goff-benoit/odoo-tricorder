# Socle visuel Tricorder

`src/design-system.css` est le contrat commun, chargé après les styles de vues.
`src/style.css` conserve les géométries spécialisées (terminal, sidebar, Kanban,
étapes et responsive), pas une deuxième charte par onglet.

- Espacements : grille de 4 px, variables `--space-1` à `--space-11`.
- Alignement : `--page-gutter` commun aux pages, bandeau, onglets et ressources
  (24 px, puis 16 px sur fenêtre compacte).
- Sections : 24 px ; cartes : 16 px internes ; éléments liés : 8 ou 12 px.
- Kanban : colonnes sans fond/cadre ; cartes compactes (12 px internes), 8 px
  entre cartes. Les détails ne réduisent jamais la largeur du tableau : modale
  accessible avec Échap, retour au déclencheur et critères d’acceptation en premier.
- Aucun sélecteur de tâche global ni panneau latéral de suivi. La sélection du
  projet/release reste distincte de la consultation ponctuelle d’une fiche.
- Préférences : champs groupés par usage, unités explicites, validation native,
  Annuler/Enregistrer pour l’affichage ; dossiers et aide clavier séparés.
- Panneaux : rayon 8 px ; contrôles : rayon 6 px, hauteur minimale 36 px.
- Titres de section : 18 px ; cartes : 14 px ; contenu : 13 px ; détails : 12 px.
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

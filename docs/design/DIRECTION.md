# Direction visuelle — 16 septembre 2026

Demande de Benoît : garder la sobriété et l’ergonomie, mais donner une âme au
cockpit (hommage à *Star Trek : The Next Generation*), le rendre inspirant et
donner un sentiment de contrôle sur l’exécution ; effacer le côté « généré ».

Trois variantes ont été maquettées sur le même écran (Plan, projet synthétique
Orbital) dans `variants/` ; le rendu 1440 × 900 est enregistré à côté de chaque
fichier (`node render.cjs a-lcars b-bridge c-instrument`).

| Variante | Idée | Polices | Ce qui marche | Ce qui gêne |
|---|---|---|---|---|
| **A · LCARS discret** | Le langage de l’interface TNG réduit à sa signature : rail latéral en segments arrondis, coude en haut à gauche, capuchons colorés, palette sable / prune / ciel / sauge sur noir chaud | Antonio (titres, onglets, badges), IBM Plex Sans (texte), IBM Plex Mono (identifiants, minuteurs) | Identité immédiate sans citation littérale ; hiérarchie nette entre titres condensés et texte ; les couleurs portent un sens (prune = orchestration, sauge = reçu, sable = en cours) | Les capitales condensées doivent rester rares (titres, onglets, badges) pour ne pas crier |
| **B · Passerelle** | Poste d’opérations : bleu nuit, sarcelle, grille pointillée, lectures télémétriques | Space Grotesk, JetBrains Mono | Préfixes numériques d’onglets (= raccourcis Alt) ; rail d’étapes par tâche (revue › dév › QA) qui rend l’avancement lisible d’un regard | Ressemble à un outil SaaS de développeur générique ; peu d’hommage |
| **C · Instrument** | Objet de terrain chaleureux, italiques éditoriales, cuivre et sauge | Instrument Sans, Instrument Serif, DM Mono | Le plus « humain » ; excellent confort de lecture | Peu de tension, peu de contrôle ; l’hommage disparaît |

## Décision

**A comme base**, avec deux emprunts à B : les **préfixes numériques** des onglets
(ils disent le raccourci clavier) et le **rail d’étapes** sur chaque tâche
(un segment par étape du workflow : parcourue, en cours, à venir).

Règles retenues :

- Antonio, en capitales espacées, uniquement pour : marque, nom du projet, titres
  de section, onglets, segments, en-têtes de colonnes Kanban, badges d’état.
- IBM Plex Sans pour tout le texte ; IBM Plex Mono pour identifiants, séries,
  minuteurs, compteurs et horodatages.
- Signatures LCARS : rail latéral segmenté, coude sable sous le nom du projet,
  capuchon coloré en tête de chaque titre de section et de chaque ligne de tâche.
  Rien d’autre : pas de cadres arrondis géants, pas de sons, pas de dégradés.
- Les couleurs restent sémantiques : sable = action / en cours, sauge = confirmé /
  activité observée, prune = orchestration, ciel = information, rose = blocage.
- Les polices sont embarquées (`assets/fonts`, licence OFL) ; l’application ne
  charge rien depuis le réseau.

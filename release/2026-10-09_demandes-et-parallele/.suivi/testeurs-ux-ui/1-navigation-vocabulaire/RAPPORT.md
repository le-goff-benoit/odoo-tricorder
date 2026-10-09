# Avis UX/UI indépendant 1 — navigation et vocabulaire

Avis de spécialiste BA/chef de projet, 2026-10-09. Ce travail n’est pas une étude d’utilisateurs humains. **Navigation de base reçue ; une friction majeure de reprise et plusieurs ambiguïtés de vocabulaire/réutilisation à traiter.** Aucun blocage fonctionnel de navigation démontré. Aucun succès IA ou résultat métier produit par un fournisseur réel.

## Candidat et méthode

Tricorder 0.6.0-rc.12, entrée normale, DISPLAY181, viewport 1440 × 1000. Exécutable SHA256 `9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3` ; ASAR SHA256 `a344374116f8ada276e426dd94279450b73cee31ba46aa981ae830a1fb64f44b`. Harness : SHA du candidat et fichiers backend vérifiés avant/après. Aucun code produit ni rapport des autres spécialistes lu. Tous les gestes évalués passent par les commandes visibles au clavier/souris ; lecture du DOM uniquement pour identifier les éléments visibles/accessibles et le focus.

HOME/XDG/CODEX_HOME/CLAUDE_CONFIG_DIR/état/runtime isolés sous `/tmp/tricorder-ux-navigation-vocabulaire-bicJaW`. Préflight affiché dans le terminal GUI avant workflow : chemins de stubs et versions `TRICORDER-UX-INERT` pour Codex/Claude (capture04). Fournisseurs inertes, sortie 78. Deux projets ajoutés via GUI, à partir des dépôts synthétiques locaux sans remote préparés ; troisième dépôt disponible mais non ajouté.

Sélecteurs natifs : choix de dossier, export et choix du fichier d’import substitués par leurs seuls chemins synthétiques ; la sélection native réelle n’est pas reçue. Une première tentative de saisie du champ racine a rencontré son attribut readonly et a été abandonnée ; aucune mutation de ce champ. Le dialogue natif d’export a été identifié puis annulé par Escape avant substitution. Aucun état SQLite/JSON d’exécution modifié manuellement. Aucune fixture Engine volumétrique employée.

18 captures réellement examinées, inventaire dans [OBSERVATIONS.md](OBSERVATIONS.md). Les captures01,05,06 conservent aussi un état transitoire avant réception de la vue suivante ; leur absence de dialogue immédiate n’est pas qualifiée de bug ou de mesure de latence. La réception de bibliothèque après la 18e capture est documentée textuellement dans [bibliotheque-reception.txt](bibliotheque-reception.txt).

## Réception des quatre parcours

| Parcours | Geste effectivement reçu | Résultat et limite |
|---|---|---|
| 1. Commencer un traitement métier | Accueil → Nouveau projet → Coordination atelier → terminal/préflight → workflow vide → nom/description → tâche et accord humain → lien → Enregistrer | Workflow « Préparer une réunion », deux blocs/un lien, révision3 enregistrée. Les consignes/critères du bloc sont saisissables. La méthode a deux étapes, variante réduite du plan. |
| 2. Réutiliser une méthode | Exporter → Projets → nouveau Support équipement → Workflows → Importer → destination Support → renommer ; puis import du même fichier vers Bibliothèque de modèles | Copie « Qualifier un incident », révision2 enregistrée, et modèle « Préparer une réunion », révision1 enregistré. Aucun historique/accord source repris, information claire dans l’import. La conversion directe n’a pas été trouvée. |
| 3. Lancer et retrouver une intention | Exécuter → saisie facultative de l’intention → Lancer dans le terminal → vue Demande/Vue d’ensemble | Intention enregistrée, conversation liée à Support visible, stub exécuté et arrêté explicitement. La saisie a lieu dans le dialogue avant transfert au terminal ; vraie saisie conversationnelle interactive non jouée car le stub quitte. Zéro étape réalisée. |
| 4. Revenir après interruption | Support suivi → Coordination atelier → Activité → carte de demande → Vue d’ensemble → Continuer dans le terminal | Deux gestes pour retrouver la demande après arrivée dans Coordination : Activité puis carte. Retour au projet Support, terminal et sortie précédente conservés. Continuer focalise le prompt shell du fournisseur arrêté. Reprise après fermeture/relaunch de l’app non jouée. |

## Constats prioritaires

| ID / classe / gravité | Fait et effet utilisateur | Preuve | Geste de réparation proposé |
|---|---|---|---|
| N1 — friction majeure | Agent arrêté annoncé correctement dans la vue Demande, mais Activité et Vue d’ensemble continuent à proposer « À poursuivre dans le terminal », « Continuez dans le terminal » et « Continuer dans le terminal ». Cette dernière action focalise `xterm-helper-textarea` au prompt shell, sans reprendre Codex. Un BA peut écrire son intention dans un shell en croyant poursuivre la conversation. | captures13,15,17,18 ; lecture du focus après clic ; terminal « Shell · Codex arrêté ». Sortie78 simulée, comportement de reprise GUI réel. | Quand l’agent est arrêté, faire de « Reprendre l’agent » l’action principale de la demande et remplacer l’instruction de conversation par une instruction de reprise ; conserver l’accès au shell avec un libellé explicite. Harmoniser ce même état dans Activité, Vue d’ensemble et Demande. |
| N2 — friction modérée | « Modèles » signifie modèles de workflows dans le catalogue, mais « Modèles : aucun » dans l’import concerne un autre objet : notre workflow à deux blocs est bel et bien importable vers « Bibliothèque de modèles ». « Choisir l’IA » ne clarifie pas cette collision dans le résumé d’import. Le lecteur hésite sur ce qu’il réutilise ou ce qui manque. | captures09 et11 ; réception textuelle Bibliothèque. | Employer « Modèles de workflows » pour la bibliothèque et « Modèles IA » pour les modèles fournisseurs ; faire de même dans les résumés/imports et les indications d’absence. |
| N3 — friction modérée | Réutilisation interne exige un détour fichier. Aucun « Enregistrer comme modèle », « Copier vers un projet » ou équivalent trouvé dans l’éditeur, Options, liste Mes workflows ; menu de liste ne propose qu’Archiver. Voie reçue : exporter le fichier, quitter vers Workflows, importer, choisir destination, renommer. Charge inutile pour une méthode déjà présente localement. | captures07,08,10,11 ; texte reçu dans Bibliothèque après second import. | Ajouter une action « Réutiliser… » proposant « Créer un modèle » et « Copier vers un projet », avec choix de destination et nom. Garder le résumé de ce qui sera repris et l’absence d’exécutions/accords copiés. |
| N4 — friction modérée / contrainte produit | Projet métier décrit comme racine d’un dépôt Git existant ; « + Nouveau projet » ne propose pas de dossier métier simple ou de création du dépôt dans le dialogue observé. Le parcours réunion/support exige donc une préparation Git externe, même sans travail logiciel. C’est une contrainte explicitement annoncée, pas un bug. | captures02,03 ; champ « Racine du dépôt Git local » readonly, note dépôt obligatoire. | Proposer pour les usages métiers une création locale d’espace de projet guidée, éventuellement avec initialisation Git transparente explicitée ; si ce périmètre est exclu, l’annoncer dès l’action plutôt qu’après choix de Nouveau projet. |
| N5 — friction mineure | Mêmes unités appelées « blocs » dans éditeur/import/catalogue et « étapes » dans Mes workflows/projet/suivi. Les dialogues alternent « Ajouter un bloc » et « Ajouter une étape », puis « Créer la connexion » pour un lien entre étapes. « Connexions » est aussi une rubrique globale d’intégrations. Compréhension possible, mais apprentissage et recherche lexicale plus coûteux. | captures06,08,09,11,13 ; textes palette et dialogue de lien dans OBSERVATIONS. | Stabiliser « bloc » pour l’objet éditable et « étape » pour le travail d’exécution ; titrer la palette « Ajouter un bloc ». Employer « Créer le lien » dans l’éditeur, réserver Connexions aux services/intégrations. |
| N6 — bug de libellé mineur | Quantité singulière affichée « 1 demandes », « 1 demandes enregistrées ». | captures13,15,17. | Accorder les libellés selon la quantité. |

N1 concerne une instruction contradictoire en contexte d’arrêt ; je ne qualifie pas la sortie du stub de défaut produit. N2–N5 sont des frictions/choix de périmètre observés ; aucune fonctionnalité cachée n’est déclarée absente sur la seule base de ces observations.

## Ce qui facilite effectivement le travail

- Sidebar compacte et intitulé global Tricorder adéquat. Activité, Workflows et Projets forment trois entrées claires, sans imposer un contexte Odoo. Accès rapide aux projets et recherche restent disponibles.
- « Mes workflows » / « Modèles » séparent méthodes utilisées et catalogue. Les exemples comprennent Support, demande ponctuelle et réunion ; le contenu dépasse les seules releases logicielles.
- Projet actif indiqué dans l’en-tête, workflow dans le sous-titre ; le retour depuis Activité rétablit Support et son terminal sans conserver à l’écran la vue de Coordination.
- Import : destination explicite, nombre de blocs/liens et avertissement qu’exécutions, accords et planifications ne seront pas repris. Révision et statut enregistré lisibles.
- Après le stub, pas de progression inventée : 0/2 étapes, accord humain prévu, agent arrêté. Le retour « Activité → demande » conserve la demande et la sortie du terminal.

## Non joué et limites

Pas de vrais fournisseurs, modèle payant, clients/comptes/services, secret/trousseau, publication ou remote. Pas d’évolution réelle de tâches, question/accord reçu d’un agent, validation humaine exécutée, succès IA, mémoire métier produite ou journal d’une exécution achevée. Les termes question/décision/validation ont été observés comme objets de conception et état prévu ; leur traitement en production n’est pas reçu. Pas de charge volumétrique, filtrage avancé, raccourcis généralisés, responsive, reprise après relancement, multi-projet d’une même exécution ou profil de droits.

Les attendus de navigation ont été testés directement ; les dialogues natifs restent une limite du banc. Plusieurs premières captures ont été prises avant rafraîchissement de rendu : aucun temps de réponse n’est extrapolé. Les nombres de gestes comptent les actions GUI de navigation observées, pas un benchmark humain. Aucun code source exploré pour interpréter les constats.

## Nettoyage

`bench.cleanup()` réussi : application fermée, nettoyage des sockets de broker du seul banc, SHA et backend recontrôlés. Xvfb conservé. Aucun fichier produit modifié, build, commit ou fullsuite. [NETTOYAGE.json](NETTOYAGE.json) contient la fin de contrôle ; erreurs renderer reçues : aucune. Les fichiers du banc et preuves sont conservés pour revue.

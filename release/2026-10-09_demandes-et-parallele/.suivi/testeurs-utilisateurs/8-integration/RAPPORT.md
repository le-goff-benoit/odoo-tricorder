# Profil 8 — consultant intégration

**Avis : transfert de méthode reçu, réception native du sélecteur de dossier partielle.** La méthode circule par modèle et par fichier portable entre deux dépôts fictifs. Une adaptation de la copie reste indépendante de la source et persiste après fermeture.

Paquet figé **0.6.0-rc.12**, ASAR `71a054e6137a4fb424320954836109bd67ef2b74cb8f71ad3e49af35bb047dd7`. Banc neuf `8-integration`, DISPLAY181, HOME/XDG/runtime/état/configurations isolés et PATH fixe du harness. Aucune lecture du code produit ou des rapports des autres profils. Précontrôle dans le terminal GUI : chemins des deux stubs isolés, versions **TRICORDER-PANEL-INERT** (capture 01 et observations.txt). Aucun agent IA lancé, compte, réseau ou projet client ; aucune fixture de progression et aucune modification SQL/JSON d’état.

## Trois parcours

### 1. Créer une méthode dans Alpha, la transformer en modèle

**Intention :** transmettre des étapes et critères à une autre équipe sans transmettre l’état d’un travail.

**Gestes :** Activité → Nouveau projet → espace local « Equipe Alpha — méthode transfert » ; Créer un workflow → première tâche → « Transmission méthode Alpha ». Nom du bloc, consigne et deux critères renseignés puis Appliquer au bloc et Enregistrer. Options → Réutiliser → nom « Méthode intégration — modèle partagé » → destination Modèles de workflows → Créer la copie.

**Attendu / observé :** un modèle modifiable séparément, retrouvable après fermeture, contenant la méthode. Le modèle est créé en révision 1 ; le formulaire explique que demandes, résultats, validations et planifications ne suivent pas la copie (capture 02). Après réouverture, il est retrouvé dans Workflows → Modèles ; la création d’un deuxième workflow Beta à partir de ce modèle reprend le bloc, la consigne et les critères initiaux (`reemploi-modele.txt`, capture 08).

**Réussite.** L’utilisateur peut conserver une méthode commune puis la décliner pour une autre équipe.

### 2. Associer un dépôt existant, exporter et importer

**Intention :** ajouter un dépôt déjà présent puis lui transmettre un workflow sans copier son historique.

**Préparation extérieure limitée :** dépôt Git synthétique Beta initialisé dans le temporaire isolé, avec un README fictif ; aucun commit et aucun workflow précréé.

**Gestes :** Projets → Nouveau projet → Dépôt Git existant → Choisir. Deux essais du sélecteur natif : focalisation de la fenêtre, Ctrl+L, saisie de la racine Beta, Return. Avant fermeture, seul le chemin saisi est visible ; aucune ligne de dossier sélectionnée. Le bouton natif Open n’a pas été activé pour ces essais. Le dialogue se ferme, le champ Racine reste vide. Captures 03–05, gestes, stderr et retour conservés **avant récupération** dans `incident-selecteur.json` et `incident-retour-selecteur.txt`. Les avertissements dconf mentionnent un transport « disabled: » ; aucune relation causale n’est démontrée.

Le champ Racine étant readonly, une tentative normale de saisie GUI échoue. **Substitution déclarée :** seul le retour du prochain `showOpenDialog` est remplacé par le chemin fictif Beta ; le bouton Choisir puis Créer le projet restent les vrais contrôles GUI. Le dialogue original est restauré immédiatement.

Alpha → Options → Exporter : vrai dialogue natif Save, nom de fichier fictif, bouton Save. Le fichier `.tricorder-workflow` est réellement créé. Projets → Importer un workflow : vrai dialogue natif Open, chemin de ce fichier, bouton Open ; récapitulatif des blocs et exclusions, destination Beta, Importer le brouillon (capture 07). La copie est ouverte dans Beta avec bloc, consigne et critères conservés.

**Partiel pour l’ensemble ; association après substitution et export/import réussis.** Les dialogues fichiers Save/Open ont abouti sans substitution ; le sélecteur de dossier reste non réceptionné. Un fichier réellement exporté est conservé dans ce dossier.

### 3. Adapter Beta, fermer et reprendre sans modifier Alpha

**Intention :** reprendre une adaptation locale en conservant la méthode source et le modèle partagé.

**Gestes :** dans Beta, changer le bloc en « Adaptation Beta — contrôle dépôt cible », sa consigne et le nom du workflow en « Transmission méthode Beta adaptée » ; Appliquer puis Enregistrer (révision 3, capture 06). Fermer proprement avec cleanup, relancer le même état isolé avec les hashes figés. L’accueil revient à Activité. Sélectionner Beta et Ouvrir le workflow ; inspecter ensuite Alpha et le modèle par leurs vrais contrôles GUI.

**Attendu / observé :** Beta retrouve son nom, son bloc adapté et sa révision 3. Alpha conserve sa révision 2, sa consigne et ses critères ; le modèle conserve la méthode initiale. Preuves `beta-avant-fermeture.txt`, `beta-apres-reouverture.txt`, `alpha-independant.txt`, `modele-independant.txt` et `verification-metier.json`. Le modèle peut encore créer un deuxième workflow Beta, distinct de la copie importée (capture 08).

**Réussite.** L’indépendance est vérifiée dans le sens adaptation de Beta → source/modèle inchangés ; aucun mécanisme de synchronisation ou de migration ultérieure n’a été évalué.

## Trois constats priorisés

| Priorité / catégorie | Constat observé | Conséquence et amélioration utile | Preuve |
|---|---|---|---|
| P2 — limite du banc, réception native partielle | Le dossier n’est pas repris après saisie Ctrl+L et Return, deux fois. Open n’a pas été utilisé, aucune ligne sélectionnée. | L’association nécessite une substitution de chemin pour poursuivre cette mission. Refaire la confirmation explicite du dossier dans un banc natif approprié avant de conclure sur le produit. Cause indéterminée, aucun bug produit établi. | Captures 03–05, incident-selecteur.json |
| P3 — friction | L’import conserve « Transmission méthode Alpha » dans Beta ; le récapitulatif propose la destination mais pas le nom de la copie. | Pour distinguer immédiatement les méthodes des équipes, il faut ouvrir Paramètres du workflow, renommer, appliquer et enregistrer. Un nom éditable au récapitulatif éviterait ce détour. | Capture 07 puis 06, import-preview.txt |
| P3 — friction de reprise | Après fermeture, l’application revient à Activité et indique 0 demandes ; dans Beta, « Reprendre le travail » annonce aucune demande malgré le workflow adapté enregistré plus bas. | Le brouillon reste retrouvable en deux gestes, mais la reprise de conception est peu mise en avant. Un lien vers le dernier workflow édité rendrait cette reprise plus directe. | beta-apres-reouverture.txt, capture 08 |

**Bugs confirmés : aucun sur le périmètre réalisé. Manque fonctionnel bloquant : aucun démontré.**

## Ce qui fonctionne et portée

- Distinction explicite entre méthode et état d’exécution, aussi bien pour Réutiliser que pour Importer ; pas de promesse de reprise des accords ou connexions.
- Deux destinations métier claires : espace local créé et dépôt Git existant associé. Création et import n’imposent aucun lancement IA.
- Modèle, fichier portable, copie adaptée et source gardent leurs rôles ; conservation vérifiée par les écrans après un vrai redémarrage.
- Une seule fenêtre applicative aux deux ouvertures ; sélecteurs natifs transitoires. Aucune performance ou qualité d’IA, publication distante, production ou exécution client évaluée.

Les huit captures conservées ont toutes été ouvertes et vérifiées. Le script `parcours.cjs` reconstitue les gestes réellement effectués via Playwright Electron/Node REPL ; il n’a pas été rejoué après rédaction. Les preuves textuelles rendent les résultats inspectables sans extrapoler un succès de sélecteur de dossier.

## Nettoyage

`cleanup()` appelé avant réouverture puis à la fin. Les PID des deux applications sont sortis ; aucun processus portant le chemin du banc ne reste. Vérification du backend par le harness et hashes de l’exécutable/ASAR inchangés, zéro pageerror (`cleanup.json`). Aucun processus d’autrui touché. Aucune exploration après ce rapport.

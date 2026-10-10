# Consultant — recette UX rc16

Candidat figé `/tmp/tricorder-rc16-final`, GUI Electron réelle, affichage Xvfb isolé. Agent jouant un consultant, pas participant humain. Aucun code applicatif lu avant les constats ; seul le harnais antérieur a servi à l’environnement.

## Créer un modèle partagé puis une adaptation

Premiers clics : Workflows → Modèles → + Créer un modèle. Le dialogue confirme Bibliothèque de modèles partagés. Je choisis un premier bloc Document et nomme « Brief consultant partagé ». Attente satisfaite : après édition et retour, ma création apparaît dans la bibliothèque. Puis Créer une adaptation… → « Brief comité Atlas » → Client Atlas. Workflows enregistrés expose directement cette adaptation avec le client, et Exécuter… permet de la reprendre. Captures 02, 03, 07, 08.

Hésitation concrète mineure au départ : sous la destination Bibliothèque de modèles partagés, le dialogue dit encore « Retrouvez votre création dans Workflows → Gestion des workflows → Workflows enregistrés… Pour en faire un modèle partagé, utilisez Réutiliser ce workflow ». Je me demande donc si la création est déjà partagée. Le résultat final le confirme ; aucune action supplémentaire n’était nécessaire. Le chemin d’aide est également plus long que l’onglet direct visible. Coût : relecture et vérification dans la bibliothèque, aucun abandon.

## Configurer un formulaire puis deux demandes

Paramètres du workflow → Ajouter un champ au lancement : « Objet du comité », texte court, obligatoire, aide « Précisez le comité et sa période. ». Le vocabulaire est clair ; pas d’identifiant technique demandé. Le texte explique que chaque réponse appartient à la demande. La configuration est faite sur le modèle partagé, puis transmise à l’adaptation client. Captures 04, 05, 09.

Demande 1 : « Comité ventes du lundi », titre « Atlas demande 1 », simulation terminée. Retour à Workflows enregistrés → Exécuter… pour une demande 2.

**Défaut confirmé : le nouveau formulaire contient encore le comité et le titre de la demande 1.** J’attendais des champs vides pour une nouvelle demande. Une valeur obligatoire ancienne donne une fausse impression de formulaire déjà complet. Risque : exécuter avec le contexte de la réunion précédente. Coût/contournement : vérifier puis remplacer manuellement les deux valeurs. Preuves `defaut-demande2-preremplie.png`, `10-demande2-preremplie.png` ; constat retrouvé dans deux exécutions du script.

Après remplacement par « Comité produit du jeudi » et « Atlas demande 2 », la deuxième simulation termine. Contrôle de lecture API : deux exécutions distinctes conservent leurs réponses respectives ; le workflow client avant/après est strictement identique. La carte du modèle partagé reste présente. Preuves 10-demande-1, 10-demande-2, 11-terminee-1/2, 12 et verification.json.

## Verdict et limites

Adoption possible avec réserve : modèle partagé/adaptation retrouvables et formulaire simple configuré sans code. Pour un usage répétitif, je demande la correction du préremplissage silencieux avant de considérer le parcours fiable sans vigilance particulière.

Deux intentions réalisées, deuxième avec contournement explicite. Le script final sort avec code 0 parce qu’il constate le préremplissage puis le remplace ; cela ne reçoit pas le défaut comme corrigé. Aucun fournisseur ni service réel qualifié : fournisseurs inertes, simulations locales, contenu Document constant synthétique. Le formulaire a un seul champ texte requis ; autres types non testés. Projets synthétiques créés via Engine, états jamais retouchés. Assertions/API seulement pour lecture de preuve ; toutes créations/configurations/demandes faites dans la GUI.

Erreurs du pilote distinctes : premier clic Créer parfois lancé avant stabilisation du catalogue (attente ajoutée) ; nom de bouton « Ouvrir » corrigé en « Ouvrir le workflow ». Les fichiers error/erreur correspondent aux essais préparatoires, le défaut de préremplissage est conservé séparément. Les anciennes fixtures sont temporaires ; le dernier HOME figure dans fixture.json.

Rejouer : `PATH=/tmp/tricorder-xvfb/usr/bin:$PATH xvfb-run -a node release/2026-10-10_retours-complementaires/.suivi/panel/consultant/parcours.cjs`. Fermeture Electron et nettoyage des brokers à la fin.

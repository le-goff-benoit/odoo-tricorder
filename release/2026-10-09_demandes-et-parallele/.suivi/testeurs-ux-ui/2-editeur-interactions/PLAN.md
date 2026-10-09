# Réception UX #2 — éditeur et interactions

Statut lors de la rédaction du plan : préparation uniquement. Campagne ensuite
jouée sur autorisation du responsable ; voir RAPPORT.md et OBSERVATIONS.md.

Point de vue : BA / chef de projet légèrement technique, capable de décrire un
processus et d'utiliser un terminal, sans connaître le moteur interne.
Hypothèse produit : je peux dessiner un workflow générique, comprendre pour
chaque bloc ce qu'il reçoit, fait et produit, le configurer, le lancer depuis le
terminal principal, puis comprendre et traiter ses questions / décisions.

## Conditions de démarrage

- Attendre le message du responsable contenant chemins, SHA256 exacts du
  binaire et de l'ASAR, et libération explicite de DISPLAY :182.
- Utiliser `../harness.cjs` et son environnement en liste blanche, HOME, XDG,
  CODEX_HOME, CLAUDE_CONFIG_DIR, état et runtime temporaires. Les deux
  fournisseurs sont des stubs inertes placés avant `/usr/bin` dans PATH.
- Ouvrir l'application normalement, sans `--workflow-studio`.
- Avant toute exécution, dans le terminal GUI : `command -v codex`,
  `codex --version`, `command -v claude`, `claude --version`. Les chemins doivent
  désigner les stubs temporaires, les versions le marqueur TRICORDER-UX-INERT.
- Pas de client, compte réel, service, secret, trousseau, lecture du code produit,
  build, commit, fullsuite ou comparaison avec les avis des autres testeurs.
- Dessiner les workflows via GUI. Aucun état SQLite/JSON forcé. Les fixtures
  ci-dessous sont du contenu métier fictif, pas des workflows précréés.

## Parcours 1 — dessiner un compte rendu de réunion

Besoin : après une réunion d'association, recueillir les notes, produire un
compte rendu, faire valider les décisions par une personne puis préparer une
diffusion. Tout contenu est fictif et toute diffusion reste simulée.

Gestes : découvrir l'entrée de conception depuis l'accueil ; créer un workflow
`Réunion — jardin partagé` ; créer et nommer les blocs notes, synthèse,
validation humaine et compte rendu ; sélectionner successivement chaque bloc,
déplacer un bloc pour dégager l'espace ; relier le parcours. Se tromper de
destination pour une liaison, la retirer puis relier la bonne. Identifier ce
qui est sélectionné et expliquer oralement le trajet à partir du dessin.

Attendu : chemin clair, création accessible, sélection et déplacement
prévisibles, liaison source/destination visible, erreur réparable sans perdre
le dessin. Pour un bloc sélectionné, distinguer entrée, action et sortie.

Données : `fixtures/reunion-notes.txt` et `fixtures/reunion-criteres.txt`.
Captures prévues : accueil/entrée, dessin initial, sélection/propriétés,
liaison erronée puis correction (4 maximum).

## Parcours 2 — configurer les entrées/sorties d'un support générique

Besoin : transformer un message utilisateur en fiche de diagnostic, demander
les informations manquantes, puis préparer une réponse relue par une personne.

Gestes : créer le petit workflow par GUI ; configurer noms, consigne, donnée
d'entrée et résultat attendu des blocs ; sélectionner le mauvais bloc et
repérer l'erreur avant de modifier le bon ; vérifier les liens entre résultat
du diagnostic et entrée de la rédaction. Introduire volontairement une
référence de sortie incohérente si l'interface le permet, puis la réparer.

Attendu : langage compréhensible pour un BA, distinction claire entre nom de
bloc, instruction, données consommées et résultats. Modification appliquée
au bloc visible ; état incomplet et référence invalide compréhensibles.

Données : `fixtures/support-message.txt` et `fixtures/support-resultat.txt`.
Captures prévues : propriétés configurées et erreur / réparation (3 maximum).

## Parcours 3 — simuler une demande d'achat et récupérer une erreur

Besoin : comparer deux offres fictives, soumettre une recommandation à une
personne et préparer un bon de demande sans achat réel.

Gestes : dessiner comparaison → décision humaine → préparation de demande ;
ouvrir la simulation ; introduire un oubli de configuration ou de liaison ;
lire le message et revenir au bloc fautif ; corriger puis relancer. Essayer une
décision négative et déterminer comment reprendre le travail demandé.

Attendu : simulation nommée comme telle, arrêt associé à la cause et au bloc,
voie de correction évidente, résultats fictifs clairement distincts d'une
exécution fournisseur. Questions et décisions montrent ce qui est requis.

Données : `fixtures/achats-offres.txt` et `fixtures/achats-decision.txt`.
Captures prévues : simulation, arrêt explicite, récupération (3 maximum).

## Parcours 4 — sauvegarder, retrouver, lancer et suivre

Besoin : retrouver le workflow de réunion après changement de vue, confirmer
les modifications réellement conservées, lancer le workflow par le terminal
principal et retrouver la prochaine action humaine.

Gestes : renommer un bloc et déplacer un autre ; enregistrer ; changer de
workflow/vue et revenir ; fermer et rouvrir uniquement notre application si
nécessaire. Vérifier noms, positions, liens et propriétés. Effectuer le
préflight GUI avant toute commande de lancement proposée par le produit.
Utiliser la commande normale indiquée par l'application et retrouver statut,
bloc actif, question/décision et sortie. Tester aussi un mauvais choix de
workflow ou une commande erronée réversible et sa récupération.

Attendu : effet de sauvegarde visible et durable, workflow actif identifiable,
passage éditeur/terminal/suivi compréhensible. Les stubs doivent produire un
échec inerte documenté ; aucune prétention de qualification fournisseur.

Captures prévues : sauvegarde avant/après retour, terminal/preflight,
suivi/question ou échec inerte (4 maximum).

## Observation et rapport

12–18 captures utiles au total, réellement vues, avec un nom décrivant l'état.
Les preuves déjà capturées sont réutilisées. Aucun catalogue cosmétique :
retenir cinq principaux constats observés, positifs ou négatifs, et leur effet
sur la compréhension / réalisation du processus.

Pour chaque constat : gravité (bloquant / majeur / modéré / mineur), parcours,
gestes précis, attendu, observé, capture(s), effet métier, proposition simple.
Distinguer absence de fonctionnalité, découverte difficile et problème
technique. Les hypothèses présentes dans ce plan ne constituent aucun constat.

Livrables après autorisation : OBSERVATIONS.md, cinq constats priorisés dans
RAPPORT.md, captures et journal de preuves. Si un parcours n'est pas possible,
documenter le point d'arrêt et sa récupération disponible.

Nettoyage : fermer seulement notre app et ses brokers par le harness ; conserver
Xvfb ; contrôler les SHA finaux. Les répertoires temporaires sont nos propres
données, leur chemin est consigné dans le manifeste de préparation.

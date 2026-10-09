# Observation indépendante #4 — états, erreurs et résolution

Statut : préparation uniquement, le 9 octobre 2026. Aucun verdict produit.
Responsabilité : comprendre ce qui se passe et savoir quoi faire sans déboguer.
Produit visé : workflows génériques conçus/configurés par l’utilisateur ; terminal principal et suivi graphique dans une même application.

## Conditions et limites

- Dossier détenu : `4-etats-erreurs/` uniquement. Aucun rapport voisin ni code produit lu avant observation.
- Entrée normale de l’application ; aucun lancement Electron/broker tant que le responsable n’a pas fourni chemins absolus, SHA256 exacts et libération explicite du display 184.
- Banc créé par `../harness.cjs prepare()` : HOME, XDG, état, runtime, CODEX_HOME et CLAUDE_CONFIG_DIR temporaires ; PATH limité aux deux fournisseurs inertes et aux binaires système. Prévol shell réussi, à refaire depuis le terminal visible avant tout workflow.
- Aucun client réel, compte, service externe, clé ou trousseau. Le code 78 des fournisseurs inertes est une fixture de panne, pas un verdict sur un fournisseur.
- Les éventuelles fixtures d’état passeront exclusivement par les commandes validées du moteur. Aucun SQLite ou JSON d’exécution forcé. Préparation des états distincte de l’action utilisateur : réponse/résolution/reprise jouées seulement dans la GUI.
- Les preuves distingueront « reçu en GUI », « état synthétique » et « non joué ». 12 à 18 captures utiles au total, chacune ouverte et réellement examinée.
- Aucun changement produit, build, commit ou suite complète. Fermer uniquement mes processus ; préserver Xvfb et les autres agents. Vérifier les SHA du candidat en fin de session.

## Quatre parcours

### P1 — activité, état et bloc sélectionné

Intention : suivre une préparation d’événement fictif et comprendre quel bloc est actif.
Workflow : Recueillir le besoin → Préparer le programme → Relire → Publier le résultat fictif.
Jouer : créer/configurer ou ouvrir ce workflow, lancer, sélectionner un bloc terminé puis un bloc actif/en attente, revenir à la conversation correspondante.
Questions observées : le bloc sélectionné diffère-t-il visuellement de l’activité courante ? L’état annonce-t-il acteur, action en cours et prochaine intervention ? Le terminal correspond-il au bloc indiqué ? Une absence de sortie est-elle distinguée d’un arrêt ?
Attendu : l’utilisateur nomme l’état de l’exécution et du bloc sélectionné, et sait s’il doit agir, sans ouvrir un fichier ni un outil de débogage.
Captures prévues : accueil/entrée ; prévol terminal ; workflow configuré ; activité globale et bloc actif ; sélection d’un autre bloc.

### P2 — question imprévue et décision prévue

Intention : distinguer une information manquante d’une validation attendue.
Workflow fictif : Rédiger une invitation → Validation du texte → Finaliser.
État synthétique Q : le rédacteur demande la langue de l’invitation, absente du besoin initial.
État synthétique D : le bloc de validation attend une décision sur un texte présenté.
Jouer : voir la question, répondre « français », constater le départ/reprise ; ensuite voir la validation, décider et constater la transition. Chacune de ces actions reste GUI.
Questions observées : motif de l’attente, question, contexte et moyen de répondre sont-ils voisins ? Une validation indique-t-elle clairement les conséquences de chaque choix ? Les réponses se retrouvent-elles dans la bonne conversation ?
Attendu : l’utilisateur différencie les deux attentes et répond une seule fois au bon endroit ; aucun texte de commande requis.
Captures prévues : question imprévue ; réponse GUI ; décision prévue ; conséquence visible de la décision.

### P3 — échec, tentatives et reprise

Intention : récupérer après un fournisseur indisponible dans un workflow de préparation de compte rendu fictif.
Workflow : Synthétiser des notes fictives → Relire la synthèse → Résultat.
Fixture native : fournisseur inerte affiche son marqueur et quitte avec le code 78. Si un état plus précis est requis, préparation par API Engine validée et attribution synthétique explicite.
Jouer : lancer via GUI, lire l’échec ; identifier bloc, résultat partiel et nombre de tentatives ; utiliser la reprise proposée, vérifier ce qui est rejoué et le devenir de la tentative précédente.
Questions observées : message humain compréhensible ? Cause/action utile séparées de détails techniques ? Reprise accessible au bon bloc ? Compteur et chronologie cohérents ? Le produit évite-t-il de présenter une exécution simulée comme un résultat métier ?
Attendu : l’utilisateur choisit une reprise en sachant sa portée, puis lit un résultat ou un nouvel échec attribué à la bonne tentative.
Captures prévues : échec initial ; explication et action de reprise ; tentative suivante et trace lisible.

### P4 — résultat final, historique et bonne conversation

Intention : retrouver un résultat terminé après avoir consulté une autre conversation ou une autre exécution.
Workflow : préparer un plan de réunion fictif, relire, terminer ; deuxième exécution différenciée par son titre et une autre durée.
Jouer : consulter le résultat final ; ouvrir l’historique ; choisir l’exécution antérieure ; revenir au bloc qui a produit le résultat et à sa conversation, puis retrouver l’exécution courante.
Questions observées : résultat final distinct des logs ? Date, exécution et tentative identifiables ? Navigation retour conserve-t-elle le bon contexte ? Les actions d’une exécution terminée sont-elles sans ambiguïté ?
Attendu : l’utilisateur retrouve le contenu et son origine, puis revient à la bonne conversation sans deviner un identifiant technique.
Captures prévues : résultat final ; historique ; conversation retrouvée.

## Consignation et priorisation

Les cinq constats principaux seront retenus selon leur impact sur les quatre parcours ; aucune anomalie n’est présumée. Échelle : bloquant (action essentielle impossible), majeur (mauvaise décision ou perte de contexte probable), modéré (effort évitable), mineur (compréhension/cosmétique locale).

Chaque constat contiendra : gravité ; contexte/scénario ; attendu ; observé ; preuve(s) GUI effectivement vue(s) ; impact utilisateur ; amélioration concrète ; limite de la preuve et caractère synthétique éventuel. Les réussites utiles et les parcours non joués seront également consignés.

## Démarrage après autorisation

1. Vérifier chemins/SHA reçus et libération du display, sans rechercher de candidat différent.
2. Lancer via `harness.launch`, entrée normale ; confirmer `command -v codex`, `codex --version`, `command -v claude`, `claude --version` dans le terminal GUI.
3. Observer P1 avant toute lecture du code produit. Pour les seuls états impossibles à atteindre avec les fournisseurs inertes, lire ensuite le contrat public Engine autorisé, créer la fixture validée et signaler exactement cette limite.
4. Jouer les gestes GUI de P2–P4, capturer et ouvrir chaque image retenue.
5. Rédiger le rapport, fermer mes processus et vérifier les SHA de fin.

# Décisions de conception et réception

## Référence et méthode

Référence figée : binaire installé rc.17, commit a062132. Profils de découverte
neufs ; fournisseurs inertes déclarés ; aucun résultat métier fabriqué.
Les rapports initiaux restent conservés. La maquette `conception.html` est un
support visuel, sans exécution : ses résultats sont des exemples annoncés.

## Retours déjà reçus et décisions

| Constat | Sources | Décision mise en place / contrôle |
|---|---|---|
| Pas d’aperçu d’un modèle sans agir | Assistante, dirigeant | Consultation distincte, aucune sauvegarde ni exécution pendant lecture. |
| Une demande abandonnée crée un workflow | Dirigeant | Préparer un lancement avec définition temporaire ; copier seulement lors d’une personnalisation ou configuration durable explicite. |
| Pas de choix fichier/email/source | Assistante, dirigeant, opérations | Sélecteur de source, fichiers conservés, références distinguées des contenus lus. Plusieurs sources possibles pour plusieurs réunions. |
| Les branches ressemblent à une séquence | Dirigeant | Étapes métier groupées ; alternatives et dépendances nommées, opérations internes consultables. |
| Les types de blocs précèdent le besoin | Opérations | Création guidée résultat → source → travail → agent → décision ; contrats et liens construits automatiquement. |
| Les rôles sont difficiles à trouver | Opérations | Vue Agents accessible ; affectation simple directement dans l’étape ; packs en complément. |
| Terminal intimidant et arrêt peu visible | Assistante, dirigeant | Suivi en premier plan, état d’arrêt visible immédiatement ; questions traitables depuis la GUI ; terminal accessible comme outil. |
| Brouillon annulé réutilisé sans annonce | Dirigeant | Brouillon conservé annoncé et effaçable ; nouvelle demande vierge. |
| Périmètre demandé pendant analyses déjà en cours dans maquette | Assistante, opérations | Attendre confirmation de la source avant le travail dépendant ; contre-épreuve sur états du moteur. |
| Livrables promis mais absents de maquette | Assistante | Résultat expose compte rendu, actions et email distinctement ; promesses alignées sur sorties déclarées. |
| Maquette Support utilise ensuite le parcours réunion | Dirigeant | Le contexte et le suivi restent propres au workflow choisi. |
| Routine hebdomadaire exige une nouvelle source | Opérations | Distinguer source fixe et recherche renouvelée ; ne pas annoncer qu’une récurrence sur fichier figé récupère de nouveaux fichiers. |

## Conditions de livraison

La réception conserve séparément preuves fonctionnelles, compréhension des
personas, qualification réelle des fournisseurs/services et limites restantes.
Un script ou test vert n’efface pas un abandon initial. Les preuves du premier
passage et celles de réception utilisent des candidats identifiés.

## Réception des neuf personas et corrections

Les rapports `reception/01` à `09` restent dans leur état d’observation. Les
candidats v1 à v5 sont identifiés dans chaque rapport ; une correction ultérieure
ne transforme pas un abandon initial en réussite. Les contre-épreuves portent
sur le candidat final et indiquent séparément leurs limites.

| Retour de réception | Changement livré | Preuve complémentaire |
|---|---|---|
| Assistante : joindre un fichier ne fonctionnait pas dans la fenêtre principale | Pont privé du sélecteur présent dans les deux fenêtres ; copie conservée, notes intactes | Parcours GUI `reusable-methods`, import réel privé et contre-épreuve novice texte + fichier ; dialogue natif sélectionné par le dispositif de test |
| Assistante : répétition de sélection des réunions | Champ intégré redondant retiré du nouveau modèle ; sélection et période dans le formulaire de sources | Modèle Réunion actuel ; anciennes copies conservées |
| Dirigeant : trois demandes de modèle identiques, catalogue vide, retour trompeur | Alerte regroupée, catalogue public embarqué avec noms lisibles, retour au modèle nommé selon l’origine | Tests catalogue et navigation ; liste IA observée par la contre-épreuve novice |
| Opérations : Oui/Non et question interne présentés comme livrables | Étapes métier et résultats nommés ; décision conditionnelle expliquée ; description personnelle de source conservée | Tests lecteur/création guidée et réception chef de projet |
| Opérations : impossible de choisir jeudi ou des sources renouvelées | Jours sélectionnables ; texte fixe et connexion de lecture distingués avant les blocages | Parcours GUI Routine du jeudi ; tests d’occurrences et de provenance |
| Support : modifier une étape groupée ne donne accès qu’à l’analyse | Choix du travail à modifier dans le groupe ; rédaction directement accessible | Parcours GUI personnalisation de la rédaction |
| Support : blocs superposés et champ 55.5 empêchant d’appliquer | Positions initiales distinctes ; décimales acceptées ; champ invalide déplié et nommé | Parcours GUI modification avec position 55.5 |
| Support : sources absentes après passage à l’éditeur détaillé | Formulaire de sources conservé pour les nouveaux modèles dans les deux vues | Tests de lancement ; les parcours historiques restent explicitement dans leur vue détaillée |
| Consultant : projet de lancement invisible | Projet annoncé au début du dialogue ; terminal identifié séparément | Réception Alpha/Beta et tests de contexte terminal |
| Produit : « partagé » ne dit pas qui voit la méthode | Destination « Mes modèles » et portée locale expliquées | Formulaire de création et aperçu |
| Produit : impossible d’exiger une réponse à une question | Case réponse obligatoire pour chaque question guidée, validation au lancement | Parcours GUI question obligatoire et contrôles moteur |
| Produit et chef de projet : responsable/exécutant confondus | Spécialité expliquée ; conversation ou agent distinct rappelé dans l’aperçu et le suivi | Tests lecteur ; processus distincts, profils figés et dépendances testés |
| Chef de projet : modification montre la consigne technique générée | Édition guidée de la consigne personnelle, coordination et validation ; détails complets repliés | Parcours GUI et tests de conservation des contrats |
| Chef de projet : « CLI » dans une erreur | Message indique l’agent arrêté, la connexion, le modèle et la reprise | Tests fournisseur et suivi d’arrêt |
| Senior : opérations exactes difficiles à lire dans l’aperçu | Action, cible et candidat consultables dans le travail ; portes exactes conservées | Réception senior et tests de décisions sur opération exacte |
| Expert : une autre branche initiale peut travailler après recherche vide | Une seule source initiale ; passage obligatoire par la condition de présence ; aucune branche de travail sans source | Régressions moteur : racine indépendante, liaison directe, branche vide rejetées |
| Expert : une ancienne source locale remplace la nouvelle source fixe | Nettoyage des paramètres globaux/locaux lors de la configuration ; refus moteur d’un remplacement local | Régressions GUI helper et moteur ; ancien graphe non muté |
| Expert : une source « texte fixe » conserve un adaptateur de lecture | Source limitée au texte, sans connexion/outils, avant activation et lancement | Régressions moteur sans appel d’adaptateur |
| Contre-épreuve novice : brouillon conservé sans annonce | Avis de conservation et action « Commencer une demande vierge » ; aucune copie implicite | Test GUI texte + fichier + annulation + effacement ; contre-épreuve indépendante |

## Limites de réception

Les neuf personas sont jouées par des agents, sans onboarding avant leur premier
parcours ; elles ne remplacent pas une étude avec neuf humains recrutés. Plusieurs
réceptions ont abandonné le lancement réel avec des fournisseurs volontairement
inertes. Les incidents du pilote, sélecteurs et fermetures de fenêtre sont séparés
des défauts démontrés. Un succès de configuration ne prouve pas un résultat métier.

Une exécution Codex réelle sur deux notes synthétiques qualifie la chaîne de
quatre agents textuels et ses livrables pour ce cas (`ia-texte-v2.json`). La première
sortie trop technique (`ia-texte.json`) reste conservée. La vérification finale
compare les textes aux sources ; elle ne vaut pas certification indépendante.
Aucun compte Gmail, Meeting Minutes, GitHub ou Odoo.sh n’est qualifié par ces essais.

## Correction du dispositif d’observation

Le spécialiste a retiré son constat froid S2 sur un formulaire de planification
prétendument inaccessible : un sélecteur ne lisait que le diagnostic imbriqué.
La capture initiale montrait déjà les sources au-dessus. Cet erratum figure dans
`reception/09-expert/contrepreuve-final.md` ; ce point n’est pas compté comme défaut
produit corrigé. Les trois défauts moteur ont des reproductions distinctes et
leur refus avant effet est confirmé par cette même contre-épreuve.

## Préparation avec choix du modèle IA

La relecture de cohérence finale a identifié une sauvegarde implicite restante :
« Appliquer ce choix et vérifier » conservait une copie lors d’une préparation
temporaire. La régression GUI était rouge (un workflow enregistré après abandon).
Le choix IA reste désormais dans la préparation sans sauvegarde ; l’interface
l’annonce. Le changement de vue ne conserve pas non plus cette préparation comme
workflow. Un enregistrement explicite rend la méthode durable. La contre-épreuve
conserve le test d’absence de copie et vérifie le choix commun sur un modèle déjà
enregistré. Le moteur et ses contrats restent identiques.

## Liaison au clavier après déplacement

La CI du commit `f1741c9` a reçu 208 parcours et en a refusé un : la première
activation au clavier après glissement était absorbée par la protection du clic
résiduel. Une régression reproduit ce cas en retardant le nettoyage du clic ;
elle était rouge avant correction. Le renderer distingue maintenant les clics
de pointeur et les activations clavier, et une nouvelle pression du pointeur
commence une action indépendante. Les onze parcours de gestes et d’utilisation
avec terminal passent sur affichage isolé, sans affaiblir les assertions du panel.

Les premiers essais ciblés sur le bureau physique ont rencontré un autre
problème de géométrie du dispositif : la fenêtre conservait 1460 pixels au
lieu des 1600 ou 1280 demandés, avant le début du scénario. Ces échecs ne qualifient
pas les gestes ; la cause exacte du redimensionnement sur ce bureau n’a pas été
isolée. La reprise sur Xvfb utilise la géométrie demandée et conserve les
contraintes initiales. [CI initiale](https://github.com/le-goff-benoit/odoo-tricorder/actions/runs/38082711810).

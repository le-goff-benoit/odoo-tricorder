# Testeur 5 — PMO : réutilisation et lancement

Statut : préparation uniquement. Aucun paquet lancé, aucune observation produit, aucun verdict. Profil : métier 9/10, technique 3/10. L'utilisateur PMO coordonne des validations répétées sur plusieurs projets ; il connaît un terminal mais ne connaît pas les commandes Tricorder.

## Cadre et méthode

Essais indépendants, exclusivement via l'interface et son terminal. Aucun rapport d'autre testeur ou d'ancienne campagne, aucun code produit lu. Seul le harness neutre de réception du tour 2 a servi de point de départ. Deux projets entièrement synthétiques seront présentés à l'application par les gestes proposés dans l'interface. Les fichiers préparés sont du contexte métier ; ils ne contiennent ni workflow, ni configuration produit.

Le paquet, son exécutable et son ASAR doivent être désignés avec leurs SHA256 par le responsable avant tout lancement. Entrée normale, sans `--workflow-studio`. Affichage privé : `:185`. Au plus douze captures utiles, sans capture systématique. Le préflight CLI ne constitue pas une preuve d'utilisation métier.

Avant le premier workflow, le terminal visible doit montrer les chemins des stubs et deux occurrences du marqueur `TRICORDER-T3-PMO-STUB` avec `codex --version` et `claude --version`. L'exécution d'un fournisseur est inerte et se termine avec le code 78 : un tel arrêt peut prouver que la protection fonctionne ; il ne prouve pas un résultat métier réussi. Aucune connexion/service réel ne sera configuré.

## Parcours 1 — retrouver une routine hebdomadaire

Besoin : sur le projet Atlas, créer une routine nommée « Feu vert comité Atlas » permettant de présenter un dossier de comité, demander une décision humaine et conserver un résultat intelligible. Utiliser les possibilités effectivement visibles pour définir ses blocs et son résultat. Enregistrer ; quitter la vue d'édition ; retrouver la routine par son nom depuis l'entrée normale. Rouvrir et contrôler que la description, les blocs et les choix subsistent. Si la GUI permet de fermer et rouvrir l'application, vérifier aussi la persistance avec le même environnement isolé.

Attendu métier : le PMO sait où sa routine est enregistrée et la retrouve sans devoir mémoriser un chemin technique. Les libellés permettent de distinguer le workflow et son exécution. Preuves envisagées : écran d'enregistrement puis écran de retour/retrouvaille, maximum deux captures.

## Parcours 2 — partager une routine avec un autre PMO

Besoin : partager la routine Atlas avec une collègue fictive en passant par les actions proposées par la GUI. Produire l'objet de partage dans le dossier de livraison synthétique si l'interface propose un export. Examiner les informations que le PMO peut comprendre depuis l'interface : nom, usage, prérequis, destination. Réimporter ou réutiliser le partage par la voie visible, en donnant à la copie le nom « Feu vert comité Boreal » si possible. Aucun fichier exporté n'est modifié à la main ; aucun destinataire réel n'est contacté.

Attendu métier : le PMO distingue partage, copie et modification de l'original. Il sait quel objet remettre à une collègue, et peut vérifier que la copie est exploitable sans écraser Atlas. Si aucun partage n'est proposé, consigner le point où le besoin reste sans solution visible, sans inventer une commande. Deux captures utiles au plus.

## Parcours 3 — réutiliser sur deux projets et réparer une erreur de destination

Besoin : retrouver la routine réutilisable et l'utiliser sur Atlas puis Boreal avec leurs contextes propres. Faire une erreur utilisateur plausible : sélectionner Atlas lors de la préparation de l'utilisation prévue pour Boreal. Avant tout démarrage, rechercher un moyen visible de corriger la destination ou d'annuler puis recommencer. Contrôler le nom du projet et les éléments métier affichés. Si une copie est nécessaire, la créer via GUI et modifier uniquement son titre/description pour Boreal. Revenir ensuite à Atlas pour observer si l'original a été conservé.

Attendu métier : la destination est identifiable et l'erreur est récupérable sans altérer un état interne. Le PMO comprend les éléments communs et ceux propres au projet. Les deux utilisations ou copies restent identifiables. Quatre captures utiles au plus, dont une avant/après correction si cela éclaire l'observation.

## Parcours 4 — démarrer depuis le terminal et lire le suivi

Besoin : sur Boreal, rechercher depuis l'interface comment lancer la routine depuis le terminal. Copier la commande réellement proposée ou suivre l'aide visible, sans consulter le code ou deviner une API. Vérifier d'abord les stubs dans ce terminal. Lancer une fois dans l'environnement synthétique ; ouvrir le suivi et retrouver la même utilisation/projet. Comprendre ce qui attend une décision humaine, ce qui est terminé et ce qui échoue éventuellement à cause du fournisseur inerte. Si un geste humain est proposé, l'effectuer via la GUI et observer la trace. Comparer avec Atlas sans démarrer un fournisseur réel.

Attendu métier : le PMO identifie la commande, son projet cible, l'exécution correspondante, son état et la prochaine action. L'arrêt synthétique du fournisseur reste explicitement une limite du banc. Quatre captures utiles au plus.

## Relevé et restitution

Pour chaque parcours : point de départ, gestes réellement effectués, attendu métier, observé, preuve datée, impact métier, clarté et friction sur cinq, blocage et contournement éventuel. Un élément absent est distingué d'un élément non trouvé ; toute limite de temps, de banc ou de fonctionnalité est annoncée. Aucun succès n'est déduit d'une fixture, d'un log seul ou d'un préflight. Le rapport final n'est rédigé qu'après observation réelle du paquet autorisé.

Notation : clarté 1 = incompréhensible, 5 = immédiatement lisible ; friction 1 = fluide, 5 = bloquant. Les notes reflètent un essai par agent et non une étude humaine.

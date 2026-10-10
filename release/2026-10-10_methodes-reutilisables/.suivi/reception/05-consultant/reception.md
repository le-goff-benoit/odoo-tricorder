# Réception consultant multiclients — utilisation à froid

Réception du 10 octobre 2026, 19:19–19:24 UTC environ (moins de huit minutes). Application figée `/tmp/tricorder-method-review-v2`, Electron, profil neuf isolé, interface seule pour créer/modifier/lancer. Aucun code applicatif, README, test ou rapport d’une autre personne lu. Les déclarations de fournisseur sont des fixtures non secrètes ; `codex` et `claude` quittent volontairement avec 78. Aucun fournisseur IA ou service externe qualifié.

Persona : consultant travaillant pour plusieurs clients, technicité moyenne, aucune découverte préalable de cette version. Les paroles ci-dessous sont un raisonnement de persona construit pendant la réception, pas un témoignage d’un humain recruté.

## Intention 1 — une méthode support réutilisable chez Alpha et Beta

Attendu : créer deux espaces clients, ajouter un contrôle propre au consultant à une copie du modèle Support, la réutiliser pour Beta sans copier manuellement ses consignes ni altérer le modèle intégré.

Parcours observé : Projets → Nouveau projet → Alpha ; même parcours pour Beta. Dans Alpha, Choisir un modèle → Support : comprendre et répondre → Personnaliser une copie. Nom choisi : `Support multiclients`. Modifier cette étape (Sources) → ajout dans Points à vérifier de « Le nom du client et son urgence sont confirmés avant tout diagnostic. » → Appliquer → Enregistrer. Ensuite Alpha → Nouvelle demande → sélection du modèle → projet principal Alpha → titre et source propres à Alpha → Démarrer le travail. Même parcours depuis Beta avec sa source et le titre `Diagnostic Beta`.

Réussite GUI : le modèle partagé apparaît dans le sélecteur de Beta ; le suivi de Diagnostic Beta affiche exactement le contrôle ajouté sous Sources → Consigne et résultat. Le modèle intégré reste présent dans le sélecteur. Les deux demandes existent, chacune dans son projet. Aucun diagnostic métier produit, puisque l’agent fixture s’arrête.

Verbatim de persona : « Personnaliser une copie : je m’attends à ne pas changer le modèle fourni. » Puis, lecture du dialogue : « Les modèles partagés, donc je pourrai l’utiliser chez Beta. Les demandes déjà lancées gardent leur version. » Le texte réel est : « Votre copie sera enregistrée dans les modèles partagés. Les exécutions déjà lancées conserveront leur version. Le modèle intégré reste disponible ; vous pourrez utiliser votre copie dans chaque projet. »

Hésitation réelle de parcours : après Enregistrer, clic Utiliser depuis le modèle partagé. Le dialogue s’intitule `Lancer cette version du workflow` et n’affiche pas le projet principal dans sa partie visible. Persona : « Où va cette demande : Alpha, Beta ou sans projet ? Je préfère revenir au client. » Dialogue refermé sans lancement ; retour à Alpha → Nouvelle demande, où `Projet principal` et « Le modèle sera utilisé dans Alpha » lèvent l’incertitude. Gravité : moyenne, détour évitable sur le chemin Utiliser du modèle partagé. Capture 05.

Hésitation secondaire : nom de liste `Sources` mais nom éditable `Choisir et lire la demande`. Persona : « Je change le travail à l’intérieur de Sources, pas le grand titre Sources. » Le lien reste compréhensible ; aucun abandon. Gravité faible. Dans la consigne éditable, `source_context` et `ask` sont des mots techniques que ce consultant doit conserver sans les comprendre ; le contrôle ajouté reste faisable sans les modifier. Gravité faible pour cette intention.

Preuves : 03-personnaliser.png (portée partagée et protection des exécutions), 04-modele-enregistre.png, 06-alpha-source.png, 09-beta-modele.png (projet principal Beta et modèle partagé sélectionné), 11-beta-consigne.png (contrôle personnalisé effectivement présent dans Beta).

## Intention 2 — distinguer le terminal Alpha du contexte Beta

Attendu : pouvoir changer de client sans croire que le terminal courant a changé de dossier ou que la conversation Alpha traite Beta.

Parcours observé : ouverture de la session Alpha existante via Terminaux ouverts → `Alpha · Shell · Codex arrêté Diagnostic Alpha`, puis clic Beta. Le terminal reste ouvert, avec l’onglet `Shell · Codex arrêté · Diagnostic Alpha` et le bandeau : « Shell : Alpha · Demande affichée : Beta · Autre conversation · Agent arrêté · Diagnostic Alpha ». La précision « Dossier à l’ouverture ; le dossier courant peut changer. » apparaît juste dessous. Beta est simultanément sélectionné dans la barre latérale et titré dans la vue projet.

Verbatim de persona : « Le terminal est encore Alpha. Je ne lui donne pas le ticket Beta ici ; je passe par Nouvelle demande dans Beta. » Observation conforme : Nouvelle demande a permis d’utiliser la même méthode dans Beta ; aucun texte Beta saisi au prompt Alpha. Réussite, aucune ambiguïté bloquante sur la capture 08. Gravité résiduelle faible : bandeau petit mais visible, libellés suffisamment explicites.

## Limites et incidents de dispositif

Le premier démarrage avait un chemin TRICORDER_HOME absent : répertoire isolé créé avant le démarrage utile. Ce n’est pas compté comme défaut produit. Une capture DOM immédiatement après lancement exposait transitoirement `Retrouver le terminal` ; au moment du clic, le bouton avait disparu après l’arrêt de l’agent fixture. L’automatisation a attendu puis expiré. Le dispositif Electron a été relancé avec le même profil, puis la session récupérée par Terminaux ouverts. Ce redémarrage est un incident de dispositif, pas une hésitation utilisateur ni une preuve que l’application plantait. Le relevé d’intentions ne qualifie pas le fonctionnement de l’IA. Pas de simulation utilisée, aucun envoi, aucun dépôt distant, aucune modification de code, aucun changement direct d’état métier.

Conclusion : les deux intentions GUI sont accomplies. Point à améliorer : afficher explicitement le projet principal dans `Utiliser` depuis un modèle partagé, ou passer par le même choix que Nouvelle demande.

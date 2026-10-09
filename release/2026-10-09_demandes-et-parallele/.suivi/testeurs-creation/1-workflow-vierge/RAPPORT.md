# Recette indépendante 1 — workflow vierge

Profil : business analyst, métier 9/10, technique 3/10. Campagne exécutée le 9 octobre 2026, environ 22:01–22:08 Europe/Zurich. Paquet figé 0.6.0-rc.12. Les quatre parcours ont réellement été joués dans l’interface normale ; les douze captures ont été ouvertes et regardées.

**Verdict : création, configuration, sauvegarde et réouverture réussies sur les quatre parcours ; premier lancement et retour à l’édition réussis jusqu’à la limite du fournisseur inerte. Aucun blocage majeur démontré.** La validation humaine en exécution, les résultats d’une vraie IA et l’achat métier complet ne sont pas qualifiés.

## Conditions et portée

- Aucun rapport d’autre testeur ni code produit consulté avant ou après les observations. Aucun changement produit, build, suite complète ou commit.
- Entrée normale de l’exécutable, sans `--workflow-studio`, sur le display autorisé :181.
- Empreintes exactes vérifiées par le harness avant chaque lancement et revérifiées à la fin : exécutable `9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3` ; ASAR `0ddb18c66b49d3c0713c0292a997897bef144da03a7407516d14e922c4b4807a`.
- Quatre HOME/XDG/CODEX_HOME/CLAUDE_CONFIG_DIR/state/runtime isolés, PATH fixe `stubs:/usr/bin:/bin`. Dans chacun des quatre terminaux GUI, `command -v codex; codex --version; command -v claude; claude --version` a montré les deux chemins propres au banc et le marqueur `TRICORDER-CREATION-1-INERT` avant tout workflow.
- Le dossier fictif préparé est vide. L’interface offre « Sans projet » : les quatre workflows ont été créés comme workflows globaux. La création/enregistrement dans un dépôt Git local ne sont donc pas couverts par ces essais.
- Toute création/configuration passe par les formulaires UI, y compris les données et les liens. Aucun workflow créé par API, aucun état JSON/SQLite modifié. Aucun compte ni service externe utilisé.
- Le fournisseur ne produit aucun résultat modèle ; il affiche son caractère inerte et son programme retourne 78. L’essai GUI confirme le marqueur et « Codex arrêté », sans annoncer un résultat métier réussi.

Les actions Playwright utilisent les boutons, champs et listes visibles. Un délai de pilotage et une reconnexion au premier banc ont été nécessaires après une erreur de sélecteur du testeur ; l’interface et son état ont été conservés. Ces incidents de pilotage ne constituent pas des défauts produit.

## Parcours 1 — achat matériel, demande simple

**Attendu.** Dessiner depuis zéro la réception d’une demande, son contrôle, l’accord humain et un récapitulatif ; comprendre le passage des données et retrouver la configuration.

**Actions.** Depuis Activité : terminal et précontrôle, « + Créer un workflow », modèle « Workflow vide », nom « Achat matériel — demande simple », « Sans projet », « Créer et ouvrir le workflow ». Le workflow dit vide contient déjà « Première étape » de type Tâche. Ce bloc a été renommé « Recevoir la demande ». Sa consigne contient MAT-001 : Alex Exemple, Formation, deux écrans à 240 CHF, date de besoin 20 octobre 2026, remplacement de deux écrans cassés. Sortie `demande` de type Objet structuré.

Ajout par « + Ajouter un bloc » d’une Tâche « Vérifier la complétude », d’un « Accord humain » « Valider par le responsable » et d’une Tâche « Produire le récapitulatif ». Les consignes et critères demandent un total de 480 CHF, les réserves, puis décision, matériel, quantité, total et motif. Les données sont `demande → controle → decision → recapitulatif`. Par « Relier », les sorties ont été explicitement associées aux entrées ; seul « approuver » relie la décision à la synthèse. « Enregistrer », puis navigation Workflows → « Ouvrir le workflow » et sélection du contrôle.

**Observé.** Quatre blocs, trois liens, révision 2 enregistrée. Le contrôle rouvert conserve la consigne exacte de calcul sans invention, ses critères et ses données. La palette distingue Travail, Aiguillage, Décision, Organisation ; l’accord est reconnaissable au « ? » et au texte « Décision humaine ». La mention « Une attente humaine persiste après fermeture. Le silence n’autorise rien » est claire. Le workflow peut être expliqué comme une chaîne de responsabilités et de données.

**Clarté et limites.** Les résultats attendus sont ici formulés dans les critères d’acceptation ; les sorties typées décrivent le contrat transmis, pas un résultat calculé. Le graphe affiche des compteurs d’entrées/sorties ; il faut ouvrir chaque bloc pour lire la consigne. Le responsable est indiqué dans le nom et la question, tandis que la carte affiche « Vous ». Refus et complément sont nommés mais leurs suites ne sont pas reliées dans ce scénario. Aucun achat, accord effectif ou calcul IA n’a été exécuté.

**Preuves.** [Départ et précontrôle](captures/01-commande-simple-01-depart-terminal.png), [dessin enregistré](captures/01-dessin-termine.png), [contrôle rouvert](captures/01-reouverture.png). Textes et actions dans `observations.txt`, section 01.

**Gravité/type/verdict.** Réussi pour création et persistance. Friction UX faible à moyenne : « Workflow vide » contenant déjà un bloc, et options de contrôle QA logiciel dans un workflow d’achat. Aucun bug bloquant démontré. Prochaine action : proposer un choix explicite « vide / première tâche » et une présentation métier compacte des propriétés.

## Parcours 2 — consignes, résultats et correction

**Attendu.** Distinguer la consigne du résultat, saisir une demande incomplète, essayer une configuration vide sans fabriquer de blocage, puis corriger et retrouver les données.

**Actions.** Banc neuf, précontrôle GUI, workflow vide « Achat matériel — dossier complet ». Bloc « Collecter la demande » avec « deux écrans pour Formation », puis Tâche « Contrôler le dossier ». Consigne du contrôle laissée volontairement vide ; critères renseignés : référence, articles, quantités, prix unitaires, total, justification, informations manquantes. Entrée `demande`, sortie `dossier` de type Objet structuré. Application au bloc et sauvegarde.

Après observation, ajout de la consigne : lister prix et justification manquants, ne pas inventer le prix, produire le dossier structuré. Ajout de « Résumer le dossier », sortie `recapitulatif`, puis deux liens transmettant `demande` et `dossier`. La collecte a été complétée avec MAT-001. Sauvegarde, retour Workflows, réouverture, sélection du contrôle.

**Observé.** La consigne vide est enregistrée en révision 2 sans message d’erreur. Elle apparaît facultative dans ce chemin : aucune récupération guidée d’une erreur obligatoire n’a donc été qualifiée. Le testeur peut la corriger directement sans perte des critères et des données. Trois blocs et deux liens sont retrouvés en révision 3. La consigne corrigée, les critères du dossier, les données et l’entrée MAT-001 persistent.

**Explication métier.** La consigne décrit ce que l’intervenant doit faire ; les critères décrivent ce qu’on acceptera ; la sortie Objet structuré porte le dossier transmis. Pour démarrer, le BA fournit une demande contenant les articles, quantités, prix, justification et date de besoin au formulaire de lancement ou au terminal. L’effet réel du traitement des informations manquantes reste non testé sans modèle.

**Preuves.** [Consigne vide](captures/02-consignes-resultats-01-configuration-incomplete.png), [collecte complétée et chaîne corrigée](captures/02-consignes-resultats-02-correction.png), [contrôle corrigé rouvert](captures/02-consignes-resultats-03-reouverture.png). Le texte « après sauvegarde vide » dans `observations.txt` prouve la révision 2 enregistrée ; la première capture a précédé le rafraîchissement de cet indicateur.

**Gravité/type/verdict.** Réussi pour distinction et correction persistante. UX moyenne : un BA peut croire qu’un bloc de contrôle sans consigne est prêt parce qu’il est enregistrable. Ce n’est pas classé comme bug de validation obligatoire : l’UI ne présente pas ce champ comme obligatoire. Prochaine action : avertissement non bloquant « Cette tâche n’a pas encore de consigne », avec lien au champ et possibilité de conserver un brouillon.

## Parcours 3 — accord humain et seuil

**Attendu.** Prévoir approuver/refuser/complément avec motif, rechercher l’attribution au responsable et la condition > 500 CHF, puis corriger une configuration incomplète.

**Actions.** Banc neuf, précontrôle, workflow vide « Achat matériel — autorisation ». « Vérifier MAT-002 » demande le contrôle de trois écrans à 240 CHF, total attendu 720 CHF. Ajout de « Accord du responsable », entrée `controle`, sortie `decision`, issues `approuver`, `refuser`, `complement`. La « Question à poser » a été laissée vide, le bloc appliqué et le workflow enregistré. Puis correction de la question pour le Responsable Formation, avec décision et motif explicites.

Le bloc « Aiguillage · Règle explicite » a été réellement ajouté et inspecté sous le nom « Seuil de 500 CHF ». Il propose « Paramètre » (défaut `choice`) et « Issues » (défaut `yes/no`), sans champ visible permettant la comparaison arithmétique du total. Ce bloc d’exploration a été supprimé par l’UI. Adaptation explicite au dossier de 720 CHF : ajout de « Accord des achats > 500 CHF », avec question au service Achats, trois issues et motif ; ajout d’une synthèse. Deux liens « approuver » rendent les accords successifs, après le contrôle initial. Sauvegarde et réouverture.

**Observé.** La question vide est enregistrée sans message en révision 2 ; la correction est conservée en révision 3. Quatre blocs, trois liens. Les deux accords sont distincts et leurs questions sont retrouvées. La règle de seuil n’est pas déclarée automatisée : la double validation s’applique à ce dossier connu de 720 CHF. Aucune invitation, identité ou personne réelle n’est créée. L’intervenant reste affiché « Vous » sur les deux cartes, malgré les rôles nommés dans les questions.

**Clarté et limites.** Les issues humaines sont configurables et le formulaire de lien propose bien les trois libellés saisis. Seule l’approbation mène à la prochaine étape dans ce dessin ; refus et complément ne possèdent pas de branche de retour. Cette limite est visible dans la configuration. Le comportement moteur après ces issues n’a pas été joué : aucune approbation effective n’a été présumée. Le BA ne dispose pas ici d’un formulaire métier évident « si montant > 500 → Achats ».

**Preuves.** [Question vide enregistrée](captures/03-validation-humaine-01-question-vide.png), [accord corrigé et deux validations](captures/03-validation-humaine-02-validation-configuree.png), [accord Achats rouvert](captures/03-validation-humaine-03-dessin-reouvert.png). L’inspection du bloc de règle est consignée dans `observations.txt` (« 03 aiguillage explicite »), pas déduite du code.

**Gravité/type/verdict.** Réussi pour configuration des décisions et persistance ; partiel pour la règle générique de seuil. UX moyenne pour la question vide facultative et la distinction « responsable / Vous » ; manque métier moyen pour une comparaison de montant compréhensible. Aucun blocage global : adaptation possible pour le dossier précis. Prochaines actions : choix explicite de l’intervenant affiché sur la carte ; exemple de condition métier guidée ; alerte si une issue n’a pas de suite configurée.

## Parcours 4 — premier essai et reprise d’édition

**Attendu.** Comprendre la demande à fournir, lancer par la voie normale jusqu’au fournisseur inerte, observer l’état sans forcer de succès, puis modifier et rouvrir la définition en distinguant sa version de celle du premier essai.

**Actions.** Banc neuf, précontrôle GUI. Workflow vide « Achat matériel — premier essai » : vérifier MAT-001, accord humain du responsable, récapitulatif. Trois blocs, deux liens, données `controle → decision → recapitulatif`, lien de l’accord sur `approuver`. Sauvegarde révision 2, « Exécuter… ». Le dialogue « Lancer cette version du workflow » demande « Quelle demande souhaitez-vous traiter ? » et précise que la saisie est facultative, la demande pouvant être expliquée au terminal. Saisie de MAT-001 précédée de « ESSAI FICTIF », puis « Lancer dans le terminal ».

Après l’arrêt du stub, ouverture de « Voir les instructions ». Aucun bouton de progression manuelle avec résultat fictif n’a été proposé dans cette vue. Retour Workflows → « Ouvrir le workflow », correction du nom « Rédiger le récapitulatif » et ajout de « date de besoin » à la consigne et aux critères. Sauvegarde, sortie de la vue, réouverture et sélection du bloc. Enfin consultation de l’onglet Historique.

**Observé.** Le terminal lance `agent_launch.py` du backend empaqueté, affiche `TRICORDER-CREATION-1-INERT codex — fournisseur inerte, aucune exécution modèle`, puis rend l’invite. L’onglet terminal affiche ensuite « Codex arrêté ». Le suivi reste honnêtement à 0/3 étapes, « Aucune étape en cours · 1 demande à prendre en charge », « À poursuivre dans le terminal ». « Voir les instructions » ouvre le détail de la première étape ; l’aide propose « Continuer dans le terminal », sans recette de récupération adaptée à un fournisseur arrêté.

La révision 3 rouverte contient le nom corrigé, la date de besoin dans la consigne et le critère du 20 octobre 2026. Historique liste un essai « Rév. 2 », « Exécution réelle », « À poursuivre dans le terminal ». La définition actuelle et l’essai ancien sont donc distingués par leur numéro de révision. Le terme « Exécution réelle » décrit le mode sélectionné, mais il ne doit pas être lu comme preuve d’un modèle ayant travaillé : le fournisseur du banc est inerte.

**Preuves.** [Instruction de lancement](captures/04-premier-essai-reprise-01-instruction-essai.png), [marqueur stub et retour d’état](captures/04-premier-essai-reprise-02-retour-stub.png), [révision 3 modifiée et rouverte](captures/04-premier-essai-reprise-03-definition-modifiee.png). Historique chargé consigné textuellement dans `observations.txt`.

**Gravité/type/verdict.** Réussi jusqu’au lancement inerte et pour reprise d’édition/version. Limite du banc majeure pour achever l’exécution métier : aucune vraie réponse IA, aucun contrôle réellement produit, aucune décision humaine runtime atteinte. UX moyenne : après l’arrêt visible du fournisseur, l’aide générique renvoie au terminal sans expliquer comment relancer la conversation ou préserver le contexte. Prochaine action : afficher « Fournisseur arrêté, progression conservée » et une action documentée de reprise du même contexte.

## Simplifications proposées

1. Présenter les propriétés courantes comme « Ce que le bloc reçoit / Ce qu’il doit faire / Ce qu’il doit produire / Qui décide », puis les options techniques dans une section avancée. Le contrat objet seul ne garantit pas que la décision conserve les articles et le total ; il faut un exemple métier d’enveloppe transmise.
2. Avertir des consignes/questions vides sans empêcher les brouillons ; signaler les issues sans suite et montrer un aperçu des questions avant exécution.
3. Donner une règle guidée « total > 500 CHF » et une attribution lisible « Responsable Formation », tout en expliquant si cette attribution constitue une simple instruction ou un routage effectif.
4. Après un fournisseur arrêté, expliquer l’état conservé et proposer une reprise contextualisée ; garder les numéros de révision visibles dans la définition et l’historique.

## Contrôle final

`controle-final.json` confirme les deux empreintes inchangées et les douze captures. Les applications et brokers des quatre bancs ont été fermés ; les exécutables des stubs ont été retirés ; aucun Xserver ni processus d’un autre testeur n’a été arrêté. Les projets et états fictifs restent disponibles comme preuves, sans transitions forcées. Aucun verdict de qualité fournisseur, d’intégration externe ou de bon de commande réel n’est émis.

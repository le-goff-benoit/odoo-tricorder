# Persona 4 — Responsable opérations PME

Candidat figé : `/tmp/tricorder-panel-final`, essai du 10 octobre 2026, fenêtre Electron réelle 1440 × 1000 via Playwright, DISPLAY=:93. Agent jouant un persona, pas participant humain. Aucun rapport des autres personas lu avant les constats. Deux créations entièrement réalisées par les formulaires GUI ; aucune fixture workflow injectée. Fournisseurs locaux inertes et HOME temporaire neuf à chaque répétition. Les trois exécutions sont des simulations explicitement affichées ; aucun email, ticket, service externe ni IA réelle qualifié.

## Verdict

Je peux composer et essayer ces deux procédures sans JSON ni identifiant technique saisi. La liaison de données et la validation deviennent compréhensibles. J’adopterais l’outil pour préparer mes petites procédures locales, avec un premier accompagnement pour retrouver une création et distinguer workflow enregistré et modèle partagé. L’autonomie de conception et de modification est démontrée sur ces intentions, pas une autonomie générale en production.

## Intention 1 — Question → travail → accord

Depuis un espace vide, mon premier clic est « + Créer un workflow » sur l’accueil. Je garde « Workflow simple — première tâche » et nomme « Accord intervention PME ». Je transforme la tâche initiale en « Préparer la proposition », puis ajoute une Question ouverte et un Accord humain. « Recevoir un résultat existant… » me permet de choisir la réponse de la question, de la nommer « Besoin » dans la tâche et de créer le lien en une seule opération. Même opération entre la proposition produite et l’accord final. Je n’ai pas eu à comprendre mapping, ports ou contrats JSON.

La validation de tâche dit précisément « Vérifier la structure des sorties puis continuer » ou « Attendre ma validation ». L’explication sur le risque de deux validations successives m’amène à retenir la première puisque je prévois un accord final. En simulation, je réponds au besoin, puis arrive directement à « Examiner la décision », avec la proposition simulée reçue et sa source. « Accorder » termine les trois étapes. Je distingue bien le test de parcours et un vrai contenu : la page annonce Simulation et le résultat dit « Exemple simulé ».

Frottement : le nouvel Accord humain propose `approve` et `reject` comme choix à éditer. Je les remplace par « Accorder » et « Refuser ». L’aide explique ces mots, mais ce détour technique est inutile pour mon besoin. Autre petit coût : les accents des noms de données sont supprimés à l’affichage (« Proposition a valider »), et une ligne Sources révèle `Proposition_a_valider`, malgré une saisie naturelle.

Preuves : [03 — validation explicite](03-premier-bloc.png), [06 — relier le besoin](06-relier-besoin.png), [07 — valeurs par défaut](07-accord.png), [08 — trois blocs reliés](08-procedure.png), [12 — décision avec donnée reçue](12-accord-detail.png), [13 — procédure terminée](13-procedure-terminee.png).

## Intention 2 — Orientation email/ticket puis modification

Je crée « Orientation email ou ticket ». Dans Paramètres du workflow → Paramètres supplémentaires, je saisis « Canal de réponse » et la valeur fixe `email`. J’ajoute une Règle explicite et retrouve ce paramètre dans « Information à comparer », sans chemin technique ni JSON. « Valeurs personnalisées » me permet de saisir `email` et `ticket` sur deux lignes. Deux documents locaux, reliés par issue, représentent les destinations ; rien n’est envoyé.

Un détour : je veux enlever la tâche initiale, mais l’outil demande de conserver au moins une étape. J’ajoute donc la règle, puis supprime la tâche. Le modèle de départ impose une tâche que je n’ai pas demandée, et il n’existe pas de conversion visible de type dans son inspecteur. Ce n’est pas bloquant, mais ajoute trois actions environ et une première suppression refusée.

L’aide de la règle parle encore des « valeurs exactes produites par le bloc précédent », alors que ma source est un paramètre fixe. Les valeurs proposées au passage en mode personnalisé sont `true / false`. Je les remplace par mes canaux ; l’écran offre les moyens d’aboutir mais je dois ignorer une partie de son exemple.

Première simulation : email produit, ticket non applicable. Je quitte ensuite l’éditeur pour retrouver mon travail. Mon premier choix est « Modèles » : ma création est absente. Je reviens à En cours, ouvre Gestion des workflows puis « Workflows enregistrés dans les projets ». Elle se trouve là avec la mention « Sans projet ». Ce libellé contredit mon classement mental : j’ai fabriqué une procédure réutilisable sans projet. Ce détour de recherche est la difficulté principale restante pour une utilisation espacée ; coût de plusieurs clics et risque de croire la création perdue. Je peux finalement ouvrir le workflow, remplacer `email` par `ticket`, enregistrer et simuler : email devient non applicable, ticket produit. L’exécution précédente conserve son paramètre email.

Preuves : [17 — paramètre fixe](17-parametre-fixe.png), [19 — règle et source](19-regle.png), [20 — branches personnalisées](20-branches.png), [23 — orientation configurée](23-orientation-configuree.png), [24 — branche email](24-email-termine.png), [25 — recherche dans Modèles](25-retrouver-modeles.png), [26 — création retrouvée Sans projet](26-retrouve-enregistre.png), [27 — modification](27-modification-parametre.png), [28 — branche ticket](28-ticket-termine.png).

## Preuves et limites techniques

[parcours.cjs](parcours.cjs) rejoue les deux intentions depuis un HOME neuf ; [session.log](session.log) contient l’arbre accessible aux étapes, complété par les captures PNG et instantanés TXT. [preuves-moteur.json](preuves-moteur.json) est une lecture finale via les commandes API validées, pas une édition d’état : trois runs completed ; première procédure trois blocs accepted ; orientation email : email accepted/ticket skipped ; orientation ticket : email skipped/ticket accepted. États temporaires et brokers de ce persona nettoyés.

Erreurs du pilote corrigées, non attribuées au produit : attente initiale d’un heading Activité absent sur l’accueil vide ; lecture body.innerText ne traversant pas le shadow DOM (remplacée par arbre accessible) ; deux noms de boutons/options anticipés à tort ; attente des rendus asynchrones ajoutée ; confirmation de suppression reconnue comme modale applicative. Ces reprises expliquent les répétitions et le temps de test ; elles ne sont pas un temps de réalisation utilisateur. Aucun code applicatif modifié par ce persona.

Les corrections annoncées par le responsable après mes constats n’appartiennent pas à ce candidat figé. Leur réception demandera une contre-épreuve ciblée séparée ; ce rapport conserve l’observation originale.

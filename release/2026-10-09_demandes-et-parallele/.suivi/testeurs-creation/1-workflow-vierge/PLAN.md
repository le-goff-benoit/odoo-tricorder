# Préparation — workflow vierge, regard business analyst

Profil : métier 9/10, technique 3/10. Le juge doit expliquer ce qu'il dessine, les entrées et sorties de chaque bloc, la décision humaine et ce qu'il faudra donner au terminal. Aucun avis produit avant observation. Aucun rapport des autres campagnes/testeurs ni diagnostic du code produit lu.

Les quatre parcours partent chacun d'un HOME neuf et d'un projet fictif vide, sans workflow précréé. Ils seront menés par l'entrée normale de Tricorder, sans `--workflow-studio`. Les noms ci-dessous sont des intentions métier, pas des libellés supposés de l'interface. Le testeur cherchera les capacités correspondantes dans les écrans et consignera les libellés réellement affichés.

Préalable commun à chacun des quatre parcours, avant toute création ou utilisation d'un workflow : ouvrir le terminal normal et vérifier `command -v codex`, `codex --version`, `command -v claude`, `claude --version`. Les deux chemins doivent appartenir au banc du parcours et les deux versions porter le marqueur `TRICORDER-CREATION-1-INERT`. Le précontrôle externe déjà effectué ne remplace pas cette vérification dans le terminal affiché. Le PATH reste fixe avant et après le broker.

## Données métier fictives

Demande MAT-001 : deux écrans à 240 CHF pièce, service Formation, besoin le 20 octobre 2026, justification « remplacer deux écrans cassés », demandeur Alex Exemple. Total attendu : 480 CHF. Seuil fictif : validation du responsable pour toute commande ; validation complémentaire des achats si le total dépasse 500 CHF. Variante MAT-002 : trois écrans, total 720 CHF. Aucune donnée personnelle réelle, aucun projet client ou Odoo nécessaire.

## Parcours 1 — comprendre puis dessiner une commande simple

But : créer « Achat matériel — demande simple » en sachant pourquoi chaque bloc existe.

1. Ouvrir le banc 01 par l'entrée normale ; identifier le projet vide et le chemin d'accès à la création d'un workflow. Noter les mots et explications disponibles sans consulter de code.
2. Décrire les étapes utiles : recevoir une demande, vérifier sa complétude, demander une validation, produire le récapitulatif. Rechercher les blocs qui peuvent les porter, comprendre comment les relier et la différence entre nom, consigne et résultat attendu.
3. Créer le workflow avec ces quatre responsabilités, en renseignant MAT-001 comme exemple d'entrée. Définir la sortie de vérification (« demande complète, total 480 CHF, réserves éventuelles ») et la sortie finale (« décision, matériel, quantité, total, motif »).
4. Sauvegarder, quitter la vue puis rouvrir depuis la navigation normale. Expliquer verbalement l'ordre, le passage des résultats et l'endroit où une personne intervient. Vérifier que la structure et les consignes sont retrouvées.

Critères : un BA comprend les blocs qu'il ajoute et les liens ; le workflow peut être créé et retrouvé ; sa lecture suffit à expliquer entrées, sorties et validation. Captures prévues : point de départ utile, dessin terminé, réouverture. Aucune exécution de fournisseur.

## Parcours 2 — consignes et résultats, erreur récupérable

But : créer « Achat matériel — dossier complet » avec un contrat d'entrée/sortie compréhensible et corriger une configuration incomplète.

1. Banc 02 neuf. Créer un workflow de collecte puis vérification puis récapitulatif. Demande d'entrée volontairement incomplète : « deux écrans pour Formation », sans prix ni justification.
2. Demander au bloc de contrôle de lister les informations manquantes et de ne pas inventer de prix. Renseigner un résultat attendu structuré et lisible : référence, articles, quantités, prix unitaires, total, justification, informations manquantes.
3. Tenter de conserver/valider une configuration où une consigne ou un résultat obligatoire reste vide, selon ce que l'interface expose réellement. Lire le message, retrouver le champ concerné et corriger sans perdre les autres données. Si le champ est optionnel, noter ce constat ; ne pas fabriquer une erreur ou un blocage.
4. Compléter l'entrée avec MAT-001, sauvegarder, quitter et rouvrir. Vérifier que les consignes corrigées, le résultat attendu et les liens restent cohérents. Expliquer au terminal ce qu'il faudrait fournir pour démarrer et ce qui serait attendu à la sortie.

Critères : la distinction entre consigne et résultat est compréhensible ; le manque de configuration est localisable et récupérable ; les corrections persistent. Captures : configuration incomplète/message, correction, état rouvert.

## Parcours 3 — validation humaine et décision explicite

But : créer « Achat matériel — autorisation » avec une décision humaine compréhensible avant l'achat.

1. Banc 03 neuf. Créer une vérification de demande puis une validation humaine, puis une synthèse. Entrée MAT-002 : total 720 CHF.
2. Configurer la décision attendue : approuver, refuser ou demander un complément, avec motif. Rechercher où le responsable est indiqué, où la décision se prend et ce qui sera remis au terminal. Ne pas présumer qu'un champ de rôle désigne une personne réelle.
3. Chercher comment exprimer le seuil de 500 CHF et la validation complémentaire des achats. Si cette capacité n'est pas proposée, documenter ce que le BA comprend et adapter explicitement le workflow en deux validations successives pour ce dossier de 720 CHF ; conserver la distinction entre exigence métier et capacité observée.
4. Tester une configuration ambiguë ou incomplète dans la validation (décision attendue ou personne/consigne vide si le champ est requis), puis corriger grâce à l'interface. Sauvegarder et rouvrir. Expliquer ce qui bloque avant accord, qui intervient et ce qui arrive après refus ou demande de complément ; noter les limites si ces issues ne sont pas configurables.

Critères : une validation humaine est identifiable, ses instructions et son résultat sont explicites ; aucune approbation n'est présumée ; l'erreur éventuelle peut être corrigée. Captures : configuration de validation, éventuel message récupérable, dessin final.

## Parcours 4 — premier essai, modification et reprise d'édition

But : créer « Achat matériel — premier essai », tenter le lancement et modifier la définition après cet essai.

1. Banc 04 neuf. Créer un petit workflow : vérifier MAT-001, valider humainement, rédiger le récapitulatif. Avant toute utilisation de workflow, ouvrir le terminal normal et vérifier `command -v codex`, `codex --version`, `command -v claude`, `claude --version` : chemins du banc et marqueur `TRICORDER-CREATION-1-INERT` exigés. Aucun PATH ne change ensuite.
2. Chercher le chemin normal du premier essai depuis la définition. Comprendre les informations demandées et toute commande fournie à copier dans le terminal. Utiliser seulement cette voie UI/terminal documentée par l'interface ; aucun appel API ne crée/configure le workflow.
3. Si l'essai atteint un fournisseur, son stub affiche sa nature inerte et retourne 78. Consigner ce résultat comme limite du banc ; observer uniquement l'aide, les retours d'état et les options normales de reprise. Si l'interface offre une progression manuelle explicite, l'utiliser avec des résultats fictifs marqués comme tels ; ne jamais retoucher des états JSON/SQLite ni simuler en secret une réussite.
4. Revenir à l'édition ; ajouter dans la sortie finale « date de besoin » et corriger le nom d'un bloc. Sauvegarder, quitter puis rouvrir. Vérifier que la modification est visible et que la définition peut être expliquée pour un nouvel essai. Distinguer ce que l'interface présente comme ancien essai et nouvelle définition, sans inspection interne.

Critères : un BA sait quoi donner au terminal ; il peut tenter un premier essai puis revenir à l'édition et retrouver les changements ; les limites de simulation sont explicites. Captures : instruction de premier essai, retour utile de l'essai/stub, définition modifiée et rouverte.

## Banc, preuves et limites

`harness.cjs --prepare` prépare quatre répertoires temporaires séparés et vérifie les deux stubs. Environnement autorisé uniquement : HOME/XDG/CODEX_HOME/CLAUDE_CONFIG_DIR/TRICORDER_HOME/STATE/RUNTIME/AGENTS, PATH fixe `stub:/usr/bin:/bin`, paramètres du display dédié, shell et locale, mode test et absence de bytecode. `.bashrc` et `.bash_profile` personnels sont isolés. Chaque moteur futur utilisera `<TRICORDER_STATE_DIR>/workflows`.

La préparation ne touche pas le display :181 actuellement occupé, ne démarre aucun GUI/broker/moteur et n'utilise pas d'API de fixture. Le followup doit libérer explicitement ce display et fournir chemin d'exécutable, SHA256 de l'exécutable, chemin ASAR et SHA256 ASAR exacts avant `launch()`. Les empreintes sont vérifiées avant lancement. Les dépendances Playwright du dépôt sont utilisées seulement à ce moment. L'environnement ne donne accès à aucun compte, projet client, service distant, secret ou trousseau.

Douze captures utiles maximum, trois par parcours au plus ; les textes visibles et actions seront consignés à mesure. Rapport final français par parcours : attendu, actions, observé, reproduction, preuve, gravité, type (bug / UX / manque du banc), verdict et prochaine action. La préparation seule n'émet aucun verdict. Les stubs/simulations ne qualifient pas les fournisseurs, un véritable résultat modèle, une intégration ou une exécution métier complète.

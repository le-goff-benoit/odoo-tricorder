# Baseline à froid — assistante administrative

Version observée : binaire installé 0.6.0-rc.17, le 10 octobre 2026. Profil et répertoires temporaires entièrement isolés. Aucun README, code applicatif ou rapport de persona consulté. Mandat : partir de deux réunions, préparer leur email de suivi, comprendre la méthode avant lancement ; retrouver le résultat et recommencer pour une autre réunion. Observation par une agente jouant le persona, pas une étude humaine.

## Parcours réellement observé

1. Écran Activité : je clique « Nouvelle demande », car mon intention est de préparer un email. Je m'attends à pouvoir donner mes notes. Il faut d'abord choisir un workflow dans une liste comportant vingt propositions. « Clôture de réunion » convient à mon besoin ; « Demande ponctuelle » est choisi initialement.
2. La description de Clôture de réunion explique clairement une ou plusieurs réunions, les décisions et actions, un compte rendu et un texte d'email, aucun envoi. C'est une information utile et honnête. Je n'ai cependant aucun moyen visible de regarder les étapes avant de continuer.
3. « Continuer » ouvre directement « Lancer cette version du workflow ». L'éditeur apparaît derrière une fenêtre modale qui masque son parcours. Deux champs pertinents demandent les réunions et leurs notes, transcriptions ou liens. Je saisis deux réunions et des notes distinctes. Je ne trouve ni sélecteur de fichier ni choix entre texte, fichier et récupération d'un email. Les chemins de documents sont suggérés, ce qui n'est pas une manipulation confortable pour mon persona.
4. L'action principale est « Lancer dans le terminal ». La fenêtre annonce que les précisions pourront être demandées dans le suivi ou le terminal. Je m'attendais à une préparation d'email dans l'application, pas à utiliser un terminal. Les alternatives « Exécution automatique sans conversation », « Vérifier à nouveau » et « Simuler le parcours » ne me permettent pas de déterminer simplement laquelle correspond à mon travail.
5. Je lance. Le fournisseur Codex est volontairement inerte dans cet environnement et s'arrête ; cela ne constitue PAS un défaut de fonctionnement du fournisseur de l'application. L'écran réel montre cependant un terminal très présent, une commande Python, un chemin de fichier JSON, un prompt shell et même le conseil sudo. C'est une interface intimidante pour une assistante sans connaissances techniques. Le suivi montre « Agent arrêté » et « Reprendre l'agent ». Aucun résultat d'email n'a été produit et je ne prétends pas avoir testé sa qualité ni la lecture d'un rapport terminé.
6. Je ferme le panneau Terminal et utilise « Retour à la liste ». Le retour fonctionne et montre une carte portant mon titre. Cette carte indique aussi « Demande · Sans projet · Clôture de réunion · Rév. 1 » : beaucoup de catégories pour retrouver un email, tandis qu'aucun résultat n'est disponible.
7. Dans Workflows puis Modèles, je cherche comment comprendre la méthode. La bibliothèque commence par des démonstrations et commandes techniques. Les boutons proposés sont « Utiliser », « Créer une adaptation… », « Personnaliser une copie… ». Cliquer le titre Clôture de réunion n'ouvre aucun aperçu. J'essaie Personnaliser une copie ; la fenêtre annonce immédiatement un nouveau modèle partagé et les versions des exécutions. Je ferme, car je voulais comprendre la méthode, pas administrer des copies.
8. « Utiliser » Clôture de réunion me ramène au choix de modèle et projet. Après Continuer, les trois champs du nouveau lancement sont vides. C'est un point positif : les anciennes réunions ne sont pas réutilisées silencieusement. Je n'effectue pas un second lancement inutile avec un fournisseur inerte.

## Difficultés classées par conséquence

| Priorité | Intention et attente | Observation | Conséquence utilisateur | Correction à recevoir |
|---|---|---|---|---|
| P0 | Comprendre ce que la méthode fera avant de confier mes réunions | Description disponible, aucun aperçu depuis le titre ou les actions du modèle ; Utiliser avance vers lancement | Je dois engager la procédure ou créer une copie pour espérer voir ses étapes ; impossible de choisir sereinement | Action Voir le workflow qui ouvre une consultation sans copie ni exécution, présentant source, étapes, intervenants et résultat |
| P0 | Donner mes notes et obtenir un email | Action principale Lancer dans le terminal ; terminal et shell mis en avant dès le lancement | Je dois comprendre un second outil technique et savoir où répondre ; je risque d'abandonner ou de demander de l'aide | Lancer le travail depuis l'application ; questions, état et résultat lisibles sans terminal ; terminal accessible dans les détails |
| P1 | Choisir une méthode de réunion | Vingt choix mélangent démonstrations, opérations techniques et blocs Analyse/Communication/Orchestration | Beaucoup de décisions qui ne servent pas mon besoin, manque de confiance dans ce qui est utilisable | Bibliothèque principale de méthodes complètes et utiles, composants et exemples ailleurs |
| P1 | Fournir une transcription et distinguer mes deux réunions | Champs libres pertinents mais texte/liens/chemins mélangés, aucune pièce jointe visible | Je ne sais pas déposer un document ni vérifier quelles sources ont été retenues | Choix clair de source et ajout de fichier ; récapitulatif des réunions et sources avant démarrage |
| P1 | Adapter le suivi à ma manière de travailler | Adaptation et personnalisation copie exposées sans aperçu ; explication parle modèles partagés et versions | Je ne sais pas si mon clic va toucher mon travail, le modèle ou d'autres projets | Voir, Lancer une demande, Personnaliser avec conséquence expliquée au bon moment |
| P2 | Retrouver mon travail | Retour à la liste et titre utiles ; Rév. 1 et Sans projet s'ajoutent au sous-titre | Lisibilité encombrée ; catégories techniques à interpréter | Titre, date, état, durée et résultat disponibles avant historique/version |

## Éléments positifs conservés

- Le modèle réunion explique une pluralité de réunions et annonce aucun envoi : il ne promet pas un service externe non configuré.
- Les deux champs de demande correspondent au besoin et acceptent des notes distinctes de réunions.
- Le titre choisi retrouve le travail dans Activité.
- Le retour à la liste fonctionne dans le parcours testé.
- Le second lancement n'a pas conservé silencieusement le contexte des deux premières réunions.

## Limites et erreurs de pilotage

Codex/Claude inertes (exit 78) : aucune qualification d'analyse IA, d'accès aux réunions, de Gmail, de génération d'email ou de rapport terminé. Aucun état injecté, aucune API utilisée pour faire réussir le parcours. Deux erreurs Playwright ont été corrigées : le label Workflow existait aussi hors dialogue ; la croix de fermeture a un nom accessible « Fermer la fenêtre ». Ce sont des ajustements du pilote, pas des difficultés observées du persona. Le temps réel de cette agente ne mesure pas la vitesse d'une personne novice.

Verdict : je peux fournir mes notes et amorcer la demande. Je ne peux pas recevoir ce parcours comme autonome et confortable pour une assistante novice : l'aperçu de la méthode et la conduite du travail dans l'application sont les obstacles majeurs. Le fournisseur inerte limite la qualification du résultat, pas ce constat sur les écrans réellement visibles.

Captures : 01 accueil, 02 choix demande, 03 modèle réunion, 04 formulaire, 05 notes saisies, 06 lancement et terminal, 07 retour liste, 08 Workflows, 09 bibliothèque, 10 titre sans aperçu, 11 carte réunion, 12 copie, 13 réutilisation, 14 seconde demande vierge.

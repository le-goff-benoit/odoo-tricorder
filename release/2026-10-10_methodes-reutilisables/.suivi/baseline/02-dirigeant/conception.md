# Contre-lecture visuelle de la maquette — dirigeant

Maquette ouverte dans une BrowserWindow Electron temporaire, sans lire son HTML. Captures conception*.png et script maquette.cjs. Aucun traitement, service ni bouton fonctionnel qualifié : la bannière annonce explicitement qu'aucun travail n'est exécuté.

## Ce que je comprends sans aide

Je consulte d'abord une méthode avec Voir le workflow, sans créer de copie. Pour le support, je comprends : fournir la demande d'origine et les faits, préciser où la réponse sera utilisée ; un agent de recherche m'aide à choisir la demande, un agent d'analyse analyse, un agent de rédaction prépare la réponse. Le résultat attendu est un diagnostic expliqué et du texte à transmettre. Les détails et informations avancées sont facultatifs. Cette présentation répond au principal obstacle de la baseline.

Le formulaire de demande donne une source explicite : texte, document, email, lien. Je peux identifier mon cas sans deviner un champ Faits. « Brouillon Gmail — connexion à configurer » annonce une limite utile.

La page Agents distingue le rôle de la machine IA. Les descriptions courtes recherche/analyse/rédaction/vérification sont compréhensibles et l'entrée navigation est visible. Je ne comprends pas encore la différence concrète entre consulter ces rôles et choisir les agents qui vont travailler sur cette demande ; l'affectation devra être visible.

Le suivi proposé explique une attente avec une question et montre que la rédaction attend les analyses. La coordination devient lisible sans graphe. La page résultat donne le livrable et sa suite avant les preuves. « Texte préparé. Aucun brouillon créé dans Gmail » évite de croire qu'un email est prêt chez le destinataire.

## Confusions qui restent

1. **Majeure : perte du contexte du workflow.** Après Voir support > Lancer une demande, le formulaire mélange demande et notes des réunions ; le suivi bascule entièrement sur deux réunions, puis le résultat est un email de réunion. Même dans une maquette, je ne peux pas prédire ce qu'obtiendra ma demande de support. Il faut garder une histoire complète propre à chaque méthode, depuis l'aperçu jusqu'au résultat.
2. **Choix de source sans état de capacité.** Email à rechercher ne précise pas à cet endroit si le service est accessible. Brouillon Gmail a une indication, la recherche email devrait être aussi explicite. Un chemin de fichier à taper manuellement ne suffirait pas au persona ; il attend un bouton joindre/choisir un fichier.
3. **Rôle nommé ≠ affectation comprise.** « Agent d'analyse » explique son rôle mais pas s'il est disponible/configuré, ni s'il est choisi par défaut. Un affichage de responsable réel et une possibilité simple de remplacement seront nécessaires pour tester l'usage.
4. **Personnaliser** est plus clair que trois variantes de copie/adaptation, mais je ne sais pas encore si cela change le modèle partagé ou seulement ma méthode. La conséquence doit apparaître au moment de l'action.
5. **Présentation du texte final.** Le résultat affiche littéralement les caractères \n dans un paragraphe. À corriger dans la maquette ou l'implémentation pour tester la lecture réelle d'un email.
6. **Recommencer.** Le résultat propose Nouvelle demande, bon repère. Il reste à vérifier avec deux contenus différents que la nouvelle occurrence n'hérite pas silencieusement de la première et que la méthode choisie reste la même.

Verdict de compréhension : l'architecture proposée est nettement plus compréhensible pour la mission du dirigeant. Avis favorable sur le principe, avec réserve majeure sur la cohérence support→source→suivi→résultat. Pas de verdict d'adoption fonctionnelle avant parcours complet utilisable et contre-épreuve avec nouvelle demande.

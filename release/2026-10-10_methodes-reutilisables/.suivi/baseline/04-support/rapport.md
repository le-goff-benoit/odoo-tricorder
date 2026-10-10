# Baseline indépendante — responsable support

Version examinée : binaire installé v0.6.0-rc.17, profil neuf isolé. Persona : responsable support, aisance informatique moyenne, aucune connaissance Tricorder. Découverte par écrans et libellés visibles, sans README, code application ni rapports précédents. Les sélecteurs ont été choisis après observation des écrans. Captures 01 à 13 dans ce dossier.

## Intention 1 : prendre une demande reçue et comprendre la méthode avant de lancer

Situation : email d’une cliente signalant que les téléphones ont disparu de l’export clients, mais restent visibles dans les fiches. Une collègue concernée, besoin demain, copie manuelle possible. Je veux distinguer la nature du problème de son urgence, obtenir une réponse utilisable et conserver une procédure pour la prochaine demande.

Attente : ouvrir une méthode support, lire ses étapes et ses intervenants, choisir la source (email ou fichier), vérifier la demande récupérée, puis démarrer.

Observations et conséquences :

1. Workflows → Modèles présente vingt cartes avec workflows et blocs isolés mélangés. Le modèle support est plus bas, après trois cartes sans rapport avec mon besoin. Sa description est utile : diagnostic, faits manquants, réponse Gmail/ticket, aucun message envoyé. Le tri initial augmente cependant le repérage nécessaire. Capture 04.
2. J’ai cliqué sur le titre « Support — diagnostic et réponse » pour comprendre la méthode. Aucun changement. Il n’y a pas d’action de consultation : seulement Utiliser, Créer une adaptation, Personnaliser une copie. Je ne sais pas quelle copie pourrait être partagée ou affecter mes prochaines demandes. Je choisis Utiliser faute d’autre accès, sans avoir examiné le workflow. Capture 05.
3. Utiliser ouvre « Nouvelle demande » avec recherche et choix de workflow, bien que j’aie choisi précisément support. « Projet principal / Sans projet » et « Réutiliser un workflow enregistré dans un projet » occupent l’écran avant les données utiles. Je peux continuer sans comprendre ces notions. Capture 07.
4. Le formulaire suivant commence par « Faits et exemple du problème · facultatif ». Aucun choix de source email, fichier ou pièce jointe ; aucune zone identifiée « demande reçue ». Je colle l’email complet dans les faits comme contournement, puis reformule l’impact. Je ne peux pas vérifier une récupération automatique ni fournir la pièce jointe de la cliente. Captures 08–09.
5. « Brouillon d’email » est proposé mais un texte précise « Préparation du texte uniquement. Aucun envoi ni brouillon distant créé par ce choix ». Cette réserve est claire, cependant le libellé peut me faire attendre un brouillon dans Gmail. Je ne vois pas de destinataire. Capture 10.
6. Le démarrage annoncé est « Lancer dans le terminal ». Le formulaire long inclut projet supplémentaire, exécution automatique et simulation ; l’éditeur de huit blocs/douze liens reste visible derrière. Ce n’est pas une présentation synthétique de qui travaille et quel résultat attendre. Captures 08–10.
7. Après lancement, le terminal prend la moitié de la fenêtre, avec commande Python, chemins techniques et prompt shell. La demande affiche « Agent arrêté » et 0/8 étapes. La distinction entre le shell, l’agent et la demande réclame une compréhension technique. Capture 11.

Limite essentielle : les fournisseurs codex/claude étaient volontairement inertes (sortie 78), aucune IA ni service externe exécuté. L’arrêt ne démontre pas un défaut d’analyse ou d’orchestration réelle. Aucune réponse finie n’a pu être examinée, aucune qualité de diagnostic/email qualifiée.

## Intention 2 : retrouver le résultat puis répéter

Je passe de Demande à Vue d’ensemble pour chercher un résultat et une nouvelle occurrence. « Ajouter une demande… » existe et ouvre un formulaire dont les champs faits/impact/destination sont vides : bon point, aucun contexte ancien repris silencieusement.

Mais cette seconde saisie commence par une zone « Demande », absente de la première saisie qui utilisait « Objectif ou consigne complémentaire ». J’aurais collé mon email directement ici si cette zone m’avait été proposée dès le début. Le même travail a deux formulaires et deux organisations. « Demandes préalables » arrive aussi dans ce formulaire courant ; cela ne m’aide pas pour une demande indépendante. Capture 13.

Aucun résultat terminé disponible dans ce profil isolé : récupération de réponse et lecture du rapport non reçues, plutôt que déclarées réussies.

## Verdict limité au parcours observé

Je peux démarrer une demande textuelle en contournant l’absence de source explicite. Je ne peux pas consulter clairement la méthode avant de l’utiliser ni utiliser mon email/fichier comme source identifiée. L’écran ne me permet pas d’expliquer qui analyse, qui prépare la réponse et qui vérifie sa qualité. Adoption sans accompagnement : non reçue pour mon besoin support.

Priorités : consultation sans lancement ; une entrée de demande stable, avec source et contenu récupéré ; déroulé lisible des responsabilités ; résultat exploitable d’abord, terminal et opérations détaillées ensuite ; libellé « Texte pour email » tant qu’aucun brouillon distant n’est créé.

## Reproduction

Le script parcours.cjs lance exclusivement le binaire figé avec toutes les racines HOME/XDG/Tricorder/fournisseurs dans un répertoire temporaire et fournisseurs inertes. Il expose une console Playwright interactive. Rejouer par boutons visibles : Workflows → Modèles → clic titre Support (sans effet) → Utiliser de la carte Support → Continuer → remplir faits/impact/titre → destination Brouillon d’email → Lancer dans le terminal → Vue d’ensemble → Ajouter une demande. Aucune lecture de profil utilisateur, aucun contournement API ni modification directe d’état moteur.

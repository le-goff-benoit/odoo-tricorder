# Persona 05 — contre-épreuve du candidat B

Contrôle indépendant du 10 octobre 2026, après le rapport A conservé intact.
Candidat `/tmp/tricorder-usage-candidate-b`, version affichée 0.6.0-rc.14.
Données synthétiques isolées, aucune lecture de code applicatif, aucune IA ni
connexion externe. Les actions de correction ont été rejouées dans Electron.

| Constat A / critère ciblé | Observation B | Verdict |
|---|---|---|
| Résultat « Priorités produit » refusé à l'enregistrement | Le formulaire demande maintenant « Nom de l’information ». J'entre exactement « Priorités produit », l'ajoute, puis Enregistrer réussit : Révision 2 · Enregistré, sans alerte et sans inventer d'identifiant. | P1 levé sur le cas reproduit. |
| Textes Utilise/Produit sortant des cartes | Les descriptions restent à l'intérieur, sur plusieurs lignes. Les trois étapes sont lisibles ensemble. | Débordement non reproduit. |
| Liens affichant `selected_meetings` et `analysis` | Les liens affichent « Réunions sélectionnées », « Analyse des réunions » et « Liste d’actions ». | Noms métier cohérents. |
| Propriétés à retrouver sur panneau étroit | À 1024 × 768 avec le panneau terminal ouvert, cliquer le bloc d'analyse ouvre directement sa consigne et ses critères. « Retour au graphe » est visible. Aucun passage par le bouton Propriétés. | Critère compact satisfait. |
| Rapport d'entretien rempli de discours code/déploiement | La conclusion métier est conservée. Les sections de livraison logicielle et le paragraphe sur les diffs ont disparu. Les références techniques sont repliées. | Friction principale levée. |
| Deux actions « Répondre » voisines | Le texte de la question est conservé avec une seule action « Répondre à la question ». Réponse et retour à la liste fonctionnent. | Doublon corrigé. |
| Utiliser un modèle réunion | « Utiliser » ouvre Nouvelle demande avec Clôture de réunion sélectionné. Après choix du projet et Continuer, les champs « Réunions ou période à analyser » et « Notes, transcriptions ou liens des réunions » sont visibles et acceptent les deux entretiens synthétiques et leurs notes. Le texte explique qu'aucun document n'a encore été lu. | Sélection des réunions et sources explicite avant lancement. |

Preuves : [graphe lisible](b-12-editeur-modele.png),
[nouveau formulaire](b-14-ajout-resultat.png),
[enregistrement sans contournement](b-16-modele-enregistre-sans-contournement.png),
[propriétés en panneau compact](b-18-proprietes-compactes.png),
[rapport métier](b-09-rapport.png), [question](b-03-arbitrage.png).
Le [choix du modèle](b-20-utiliser-reunion.png) et les
[réunions et sources saisies](b-21-sources-reunions.png) complètent la preuve.

Dernier rejeu complet : **1 test réussi en 26,9 secondes** (28,1 secondes avec
le lanceur), 21 captures. Aucun contournement de nom de donnée dans ce rejeu.
Le test s'arrête avant « Lancer dans le terminal » : il vérifie la préparation,
pas une analyse de réunions par un fournisseur.

Le terminal était ouvert comme panneau vide, sans lancer de fournisseur. La
contre-épreuve vérifie la place et l'accessibilité du panneau, pas une session
PTY active. Le libellé ajouté réapparaît « Priorites produit » : l'accent est
perdu, mais je n'ai plus besoin de connaître ou saisir un identifiant technique.
Le contrôle ne démontre toujours pas que l'IA évalue correctement les critères
métier rédigés dans l'éditeur.

Je lève la réserve bloquante sur l'ajout d'un résultat pour cette tâche simple.
La distinction entre validation structurelle et critères métier mérite encore
une explication dans l'éditeur. L'écran terminé peut toujours présenter sa
conclusion plus directement ; ce point n'était pas corrigé dans la contre-épreuve.

Le [script B](reception-b.spec.cjs), la [configuration](playwright-b.config.cjs)
et la [trace](trace-b.zip) restent séparés des preuves A. Les ajustements de
sélecteurs du script aux libellés et noms accessibles constatés dans B ne sont
pas comptés comme défaillances produit.

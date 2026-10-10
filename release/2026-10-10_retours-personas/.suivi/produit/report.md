# Persona produit B2B — réception initiale rc15

10 octobre 2026. Candidat figé `/tmp/tricorder-personas-rc15`.
Je pilote la discovery d'un portail B2B. Mes deux intentions : réutiliser une
analyse dans la recommandation suivante, puis récupérer le texte destiné au
comité produit sans le confondre avec les résultats intermédiaires.

## Preuve et périmètre

Deux parcours réels dans Electron, fenêtre 1440 × 1000, projet et HOME
temporaires. Le script prépare les données par les commandes validées du moteur.
L'analyse et le texte final sont des **fixtures synthétiques**, sans IA ni
recherche client ; le libellé « Exécution réelle » dans l'interface ne transforme
pas ces fixtures en résultat métier qualifié. La création du lien, sa sauvegarde,
l'ouverture des résultats et la copie passent par les contrôles de l'interface.

Le contexte de cet agent conservait une restriction de lancement d'Electron.
L'orchestrateur a donc exécuté le script autonome depuis son contexte autorisé ;
j'ai analysé les captures, arbres accessibles et texte réellement copié. Aucune
lecture de code applicatif. Les ajustements de sélecteurs et la fermeture d'une
fenêtre encore ouverte ne sont pas comptés comme défauts produit.

**Dernier rejeu complet fourni par l'orchestrateur : 1 test réussi, 7,7 s.**
Le [script](usage.spec.cjs), la [configuration](playwright.config.cjs), les neuf
captures finales et la [trace Playwright](trace.zip) permettent de reproduire
les actions. Aucun build du dépôt partagé n'a été effectué pour cette réception.

## Intention 1 — récupérer la recommandation finale

**Premier clic.** Workflows → Historique → Réponse au comité produit. L'écran
arrive sur le graphe terminé. Je clique sur le bouton explicite « Voir les
résultats » : il reste donc un clic après l'ouverture du travail terminé.

La fenêtre affiche d'abord **Livrable final**, puis le brouillon prêt à reprendre.
L'analyse intermédiaire est rangée dans « Résultats des étapes », replié. Je n'ai
plus à chercher lequel des textes envoyer. « Copier le texte » est une action
visible, directement après le contenu.

Je clique et le presse-papiers contient uniquement le texte prévu, avec ses
paragraphes. Il ne contient ni l'analyse intermédiaire, ni les titres techniques.
Le [contenu copié](texte-copie.txt) commence par « Bonjour » et conserve la
recommandation sur l'export CSV et la décision attendue avant vendredi.

**Friction de vocabulaire.** La fenêtre est encore intitulée « Résultats validés
de cette demande » dans le candidat inspecté, alors que le graphe dit plus
précisément « Produit · sorties vérifiées ». Je pourrais prendre « validés » pour
une approbation métier. J'ai signalé ce point ; l'orchestrateur indique avoir
renommé la fenêtre « Résultats de cette demande » après cette réception. Cette
correction postérieure n'est pas présentée comme une observation du snapshot rc15.

Preuves : [arrivée](01-livrable-ouvert.png), [livrable en premier](02-resultats.png),
[confirmation de copie](03-texte-copie.png).

## Intention 2 — recevoir l'analyse dans le bloc de recommandation

Dans le projet, j'ouvre « Synthèse produit à compléter », puis le bloc « Préparer
la recommandation ». Mon premier clic sur le titre de la carte n'ouvrait rien ;
le bouton « Ouvrir le workflow » fonctionne et annonce clairement l'action.

Dans la section Utilise, « Recevoir un résultat existant… » correspond directement
à mon intention. La boîte explique qu'elle ajoutera l'information et sa liaison
en une seule opération. Je choisis « Analyser les entretiens → analyse clients »
et nomme l'information locale « Analyse client retenue ». Je peux utiliser des
mots courants sans inventer un identifiant de port.

« Ajouter et relier » ferme la boîte. Utilise contient mon information avec
« Vient de : Analyser les entretiens ». Le graphe passe de zéro à un lien. Je
clique Enregistrer : révision 2 enregistrée, sans alerte. Le point de conception
qui signalait le bloc indépendant a disparu. J'ai accompli le raccordement sans
utiliser les prises du graphe, éditer du JSON ou sélectionner des ports techniques.

**Hésitations restantes.** « Après quelle branche ? » n'offre ici que « Terminé ».
Je peux accepter la valeur, mais une question supplémentaire n'est pas utile dans
ce cas simple. Surtout, le formulaire annonce « Texte · obligatoire », puis la
nouvelle entrée apparaît comme « Texte · facultatif » après ajout. Je ne sais pas
si la recommandation pourra démarrer sans l'analyse : la distinction entre la
garantie fournie par la source et l'exigence du destinataire n'est pas expliquée.
Ce constat est un problème de compréhension ; cet essai ne démontre pas une
défaillance du moteur.

Preuves : [bloc destinataire](04-bloc-destinataire.png),
[formulaire](05-recevoir-resultat.png), [source et nom choisis](06-source-selectionnee.png),
[information reçue](07-resultat-recu.png), [sauvegarde](08-liaison-enregistree.png),
[graphe final](09-graphe-final.png).

## Retours priorisés et adoption

| Priorité | Retour | Suite suggérée |
|---|---|---|
| P2 | « Obligatoire » dans le choix de source devient « Facultatif » dans l'entrée reçue. | Clarifier ou harmoniser l'exigence, puis vérifier sa portée réelle dans le moteur. |
| P2 | « Résultats validés » peut laisser croire à une approbation métier. | Renommage signalé comme déjà effectué par l'orchestrateur, à vérifier sur le candidat final. |
| P3 | Un choix de branche existe avec une seule possibilité. | Afficher simplement que l'étape attend la fin de la source dans ce cas. |
| P3 | Le graphe du workflow de schéma 1 affiche seulement « 1 donnée ». | Le panneau donne bien le nom métier ; afficher aussi celui-ci sur le lien aiderait la lecture du graphe. |

**Adoption favorable pour les deux tâches testées.** Je peux brancher un résultat
existant en termes métier et récupérer le bon texte à partager. Le livrable final
est effectivement présenté avant les détails dans la fenêtre des résultats.
La qualité de l'analyse IA, un workflow avec branches concurrentes et l'envoi
du texte vers un service externe restent hors du périmètre de cette preuve.

Commande de rejeu, depuis le contexte autorisé et sans compilation :
`node /home/blegoff/odoo-tricorder/node_modules/@playwright/test/cli.js test --config=/home/blegoff/odoo-tricorder/release/2026-10-10_retours-personas/.suivi/produit/playwright.config.cjs`
(répertoire courant `/tmp/tricorder-personas-rc15`).

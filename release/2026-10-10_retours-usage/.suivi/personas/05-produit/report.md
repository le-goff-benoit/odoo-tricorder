# Persona 05 — responsable produit B2B

Réception indépendante du candidat A, 10 octobre 2026. Je pilote un portail
clients et des entretiens de discovery. Je sais formuler une décision et des
critères métier ; je ne souhaite pas apprendre les identifiants du moteur.

## Méthode et limites

Deux parcours effectivement effectués dans Electron sur
`/tmp/tricorder-usage-candidate-a`, fenêtre 1440 × 1000, DISPLAY :93. Chaque essai
crée un HOME et un projet synthétiques isolés. Le moteur crée au préalable une
question en attente et une synthèse terminée ; ce sont des fixtures déclarées,
pas le résultat d'une IA. La réponse humaine, les consultations, la copie du
modèle, les modifications et l'enregistrement passent par les boutons de l'UI.
Aucun fournisseur ni service externe n'est appelé. La durée de 0 seconde de la
synthèse correspond à cette fixture instantanée, pas à une mesure de production.

Je n'ai lu ni le code applicatif ni les autres rapports avant ces observations.
Les tâtonnements du script (mauvais nom d'un bouton, attente erronée d'une boîte
de dialogue pour un rapport affiché dans la page) ne sont pas des bugs produit.
Le dernier rejeu complet passe : **1 test, deux intentions, 24,5 secondes**
(26,2 secondes avec le lanceur). Il contient volontairement le contournement du
défaut d'enregistrement décrit ci-dessous ; « vert » ne signifie pas sans friction.

## Intention 1 — savoir ce qui m'attend et retrouver le résultat précédent

**Attente.** Voir la décision produit à prendre, y répondre, puis retrouver la
synthèse déjà livrée sans relancer du travail.

**Premier clic.** Workflows. L'onglet En cours contient seulement « Arbitrage
export client », avec « Réponse attendue », l'étape et le temps écoulé. Je
comprends immédiatement la différence avec Modèles et Historique. La précision
« attentes comprises » évite de confondre temps total et travail de l'IA.

En ouvrant la demande, la vraie question apparaît : « Faut-il prioriser l'export
CSV ou les droits des équipes ? ». Je clique sur « Répondre à cette question »
et saisis mon arbitrage. La réponse est enregistrée, le travail devient terminé.
Le bouton de retour me ramène à la liste En cours, désormais vide. Historique
contient les deux travaux terminés. Aucun « reprendre » trompeur dans ce parcours.

**Hésitation.** L'écran de la synthèse terminée montre surtout « Exécution
terminée » et deux boutons séparés « Voir les résultats » / « Voir le rapport ».
J'aurais aimé lire déjà deux lignes de conclusion. Je choisis le rapport, qui
contient bien la conclusion métier attendue, mais aussi des paragraphes sur les
diffs de code, candidats, publication et déploiement. Ils occupent beaucoup de
place pour un simple entretien client ; je ne sais pas pourquoi on me les présente.

**Preuves.** [En cours](02-workflows-en-cours.png),
[question visible](03-arbitrage.png), [réponse ouverte](04-question-ouverte.png),
[retour](06-retour-en-cours.png), [historique](07-historique.png),
[terminé](08-synthese-terminee.png), [rapport](09-rapport.png).

## Intention 2 — adapter un modèle pour la synthèse hebdomadaire de discovery

**Attente.** Partir du modèle réunion, préciser l'analyse attendue et conserver
un résultat « Priorités produit » réutilisable chaque semaine.

Dans Modèles, je choisis « Personnaliser une copie… » sur Clôture de réunion.
La boîte explique clairement la portée : copie dans les modèles partagés,
origine intégrée conservée, anciennes exécutions inchangées. Je nomme le modèle
« Synthèse hebdomadaire discovery B2B ». Les trois blocs sont compréhensibles :
choisir les réunions, analyser, préparer le compte rendu et l'email.

J'ouvre l'analyse, change sa consigne et renseigne deux critères métier. Les
sections Utilise / Produit et « Vient de » / « Transmis à » aident à comprendre
le rôle des informations. « Appliquer au bloc » puis « Enregistrer » est une
double action, mais le statut de modifications en attente m'en explique l'effet.

**Erreur réellement rencontrée.** « Ajouter un résultat attendu » ouvre
« Décrire une donnée », qui demande « Nom (sans espaces) ». Je tente mon nom
métier « Priorités produit ». L'ajout est accepté et la nouvelle sortie apparaît.
Mais Enregistrer échoue avec **`review port invalide : 'Priorités produit'`**.
L'erreur survient après fermeture de la boîte et réintroduit les termes `review`
et `port`, absents de mon intention. Je retire la sortie, la recrée sous le nom
`priorites_produit`, puis peux enregistrer. Le retour à la bibliothèque affiche
bien mon modèle. Le contournement exige de comprendre une règle d'identifiant.

**Surprise visuelle.** Les longues descriptions Utilise/Produit dépassent les
cartes du graphe ; les liens gardent `selected_meetings` et `analysis`. Le panneau
de droite raconte correctement l'information métier tandis que le dessin
redevient technique et encombré. Je m'appuie finalement sur le panneau.

**Preuves.** [Copie et portée](11-personnaliser.png),
[graphe](12-editeur-modele.png), [analyse](13-analyse-modele.png),
[ajout](14-ajout-resultat.png), [nom accepté](15-nom-metier-accepte.png),
[erreur retardée](16-erreur-enregistrement.png),
[sauvegarde après contournement](18-modele-enregistre-apres-contournement.png),
[modèle retrouvé](19-modele-retrouve.png).

## Retours priorisés

| Priorité | Observation à l'usage | Conséquence / proposition |
|---|---|---|
| P1 | Un nom métier est accepté à l'ajout puis refusé seulement à l'enregistrement. | Générer l'identifiant depuis un libellé lisible ; à défaut, corriger immédiatement dans la boîte, avec une explication et un exemple. |
| P2 | Les résumés débordent des cartes et les liens affichent des clés techniques. | Contenir les textes et employer les mêmes noms métier que dans le panneau. |
| P2 | Le rapport d'entretien affiche un discours de livraison logicielle. | Adapter les sections aux résultats réellement présents ; placer les références techniques dans un détail repliable. |
| P2 | Une exécution terminée ouvre un écran presque vide, avant le résultat. | Afficher la conclusion et les livrables en premier, garder le rapport complet accessible. |
| P2 | « Valider automatiquement les sorties » à côté de critères d'acceptation ne précise pas ce qui est vérifié. | Dire clairement si l'automatisme contrôle la structure, l'exécution ou des critères métier ; le présent essai ne qualifie pas leur évaluation par une IA. |
| P3 | Deux boutons voisins « Répondre à cette question » / « Répondre à la question ». | Une seule action principale suffit avec le texte de la question. |

## Décision d'adoption

**Oui pour suivre et répondre ; création accompagnée pour l'instant.** Je peux
retrouver une attente, décider et revenir à ma liste sans terminal. Je comprends
où personnaliser un modèle et ce que ma copie modifie. Je ne confierais pas encore
l'ajout d'informations à un collègue non technique sans corriger le refus tardif
des noms. L'analyse métier réelle, la qualité IA, les sources d'entretiens et la
production d'un email restent hors de la preuve de cet essai.

Rejeu : depuis `/tmp/tricorder-usage-candidate-a`,
`npm run test:ui -- --config=/home/blegoff/odoo-tricorder/release/2026-10-10_retours-usage/.suivi/personas/05-produit/playwright.config.cjs`.
Le [script autonome](usage.spec.cjs) utilise les commandes validées du moteur
pour les fixtures. Les captures, instantanés accessibles `.txt` et
[trace Playwright](trace.zip) documentent le dernier parcours complet.

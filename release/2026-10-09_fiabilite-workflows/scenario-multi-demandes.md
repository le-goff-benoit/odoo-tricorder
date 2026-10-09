# Un mail client, plusieurs demandes, une release

Scénario de réception anonymisé, inspiré d’un mail fourni par l’utilisateur
pendant le développement. L’original et les captures client restent hors du
dépôt Tricorder. Les fixtures, noms, pièces et preuves utilisés dans les tests
sont synthétiques. Ce document ne constitue ni un diagnostic Odoo, ni un plan de
correction accepté pour le client.

## Situation de départ

L’utilisateur dit dans le terminal : « Va chercher le mail du client sur ces
problèmes et prépare une release à partir de celui-ci. » Il peut aussi donner
le chemin d’un fichier `.eml` déjà reçu. L’agent utilise ses outils de messagerie
disponibles ou lit le fichier ; la préparation ne suppose pas que l’utilisateur
recopie le mail dans des formulaires. Le mail comporte six captures métier et
quatre problèmes. Le workflow conserve la source originale et relie les
informations à chaque sujet, sans confondre un mail, une demande et une tâche.

| Demande | Observation synthétique | Information ou contrôle nécessaire | Pièces |
|---|---|---|---|
| R1 — Quantité calculée | Un libellé de distance indique une règle différente du calcul observé. | Clarifier la règle attendue avant de choisir entre correction du libellé et correction du calcul ; examiner l’impact sur les montants. | P1 |
| R2 — Création du projet | Un projet créé depuis une offre apparaît dans une autre vue et redemande une étape de préparation. | Reproduire avec l’état exact de l’offre, les paramètres et l’historique ; distinguer un défaut de navigation d’un état métier incorrect. | P2, P3 |
| R3 — Planning vide | Des règles de jalons existent mais aucune ligne de planning n’apparaît. | Identifier le déclencheur, les objets attendus et les données présentes ; une règle configurée ne prouve pas qu’une tâche a été générée. | P4, P5 |
| R4 — Total non recalculé | Une saisie manuelle ne semble pas mettre à jour le sous-total. | Vérifier édition, validation de cellule, sauvegarde et relecture ; contrôler les montants et les autres modes de saisie. | P6 |

R1 et R4 concernent des calculs de devis. Leur qualification ne doit pas les
faire passer automatiquement dans une voie de correction Express. Une capture
constitue une observation ; elle ne prouve ni la cause, ni une reproduction,
ni une correction testée.

## Comportement attendu dans Tricorder

1. Lancer une conversation avec un workflow adapté, puis donner l’instruction
   dans le terminal. L’agent recherche le mail, propose un choix s’il y a plusieurs
   correspondances, conserve original et pièces, identifie le projet et prépare
   le dossier de release avec son plan. Un accès absent se distingue d’une
   recherche sans résultat : il demande la connexion ou une source accessible,
   sans prétendre avoir recherché. Référencer les sources par fichiers ou
   artefacts, sans retransmettre les images à chaque lecture du graphe.
2. Enregistrer quatre demandes reliées au même ensemble de sources. Chaque
   demande a son titre, ses pièces, son diagnostic, ses questions et ses critères.
   Le découpage proposé reste visible et ajustable.
3. R1 attend une réponse sur la règle métier. Cette question est visible dans
   la conversation, le graphe, les phases repliées et les indicateurs d’attention.
   R2, R3 et R4 peuvent poursuivre leur analyse indépendamment.
4. Répondre à R1 une seule fois ; conserver la réponse dans son contexte et
   reprendre cette demande sans créer un doublon ni relancer les trois autres.
5. Lire le constat et le plan avant de les accepter. Les étapes de diagnostic,
   correction, QA et décision de livraison gardent leurs résultats distincts.
6. Les contrôles exigés portent sur le candidat concerné. Une demande avec QA
   rouge, clarification ouverte ou refus ne devient pas implicitement prête à
   livrer parce qu’une autre demande est terminée.
7. La synthèse de release présente les quatre situations réelles : terminée,
   à clarifier, en cours, bloquée ou exclue explicitement du périmètre. Une
   livraison partielle suppose un périmètre décidé et visible.
8. Après redémarrage, retrouver les mêmes demandes, leurs sources et le bon
   contexte terminal. Distinguer la disponibilité du shell de celle de l’agent.

## Points de contrôle de la recette synthétique

- Le nombre de demandes métier reste quatre après la question, la réponse et la
  reprise. Une éventuelle tâche de consolidation/clôture est explicitement
  distinguée de ces besoins client et dépend de leur état réel.
- Une recherche et une lecture sont réellement appelées sur l’adaptateur de test ;
  le mail complet et ses pièces sont conservés. La reprise ne recrée ni la release
  ni ses demandes. Préparer une release ne déclenche pas un déploiement.
- Les références P1 à P6 restent associées aux bons sujets et accessibles ;
  aucune capture client n’est nécessaire au test automatisé.
- Le blocage de R1 ne bloque pas R2 à R4, sauf dépendance explicitement déclarée.
- Le contenu produit et les preuves se lisent depuis la demande et sa décision.
- Le refus ou l’absence de QA ne peut pas être converti en validation globale.
- Le rapport différencie observations, hypothèses, résultats vérifiés et reste à
  faire. Un état simulé reste indiqué comme tel.

## Réception visuelle de l’exécution

Le succès des tests moteur ne suffit pas à recevoir ce parcours. La vue doit
permettre de comprendre le travail en cours en gardant le terminal utilisable.
La capture de réception utilise des états différents : R1 attend une précision,
R2 est en cours, R3 possède un résultat à examiner et R4 exige une reprise après
QA. Ce sont des états de démonstration synthétiques, pas l’état du client réel.

| Question de l’utilisateur | Information attendue dans la vue |
|---|---|
| Que contient cette release ? | Les quatre sujets avec des titres courts ; les chemins des pièces restent dans leur détail. |
| Sur quoi travaille-t-on ? | Le sujet sélectionné est explicite et chaque demande possède son état ; le graphe est clairement celui de cette demande. |
| Qu’attend-on de moi ? | La demande concernée et la question ou décision se trouvent directement, sans chercher dans tous les blocs. |
| Le reste peut-il avancer ? | L’attente de R1 est distinguée des sujets actifs, terminés ou bloqués ; aucune attente globale ambiguë. |
| Qu’est-ce qui est fait et que reste-t-il ? | Résultat consultable, étape actuelle et prochaine action, avec une QA échouée distincte d’un travail terminé. |
| Puis-je continuer à dialoguer ? | Terminal et suivi restent utilisables dans la même fenêtre ; le changement de sujet conserve la session. |

Inspecter la fenêtre avec terminal visible à une largeur courante et à 1024 px.
Les commandes et la navigation ne doivent pas consommer l’espace du résultat ou
du graphe. Une couleur seule ne suffit pas à porter un état. Le reviewer doit
examiner les captures et le parcours interactif, puis consigner les écarts ; une
capture de quatre demandes au même état ne qualifie pas cette lisibilité.

La recherche et la préparation sont exécutées par l’agent natif, avec les outils
accessibles à son fournisseur ; le graphe en suit les étapes déclarées et les
résultats. Un importeur graphique de mail n’est pas requis par ce parcours.
Le lancement d’une CLI de substitution prouve le protocole, les fichiers et la
reprise attendue ; il ne prouve pas l’authentification ni le comportement d’un
modèle réel. Les limites de consolidation de livraison doivent rester explicites.

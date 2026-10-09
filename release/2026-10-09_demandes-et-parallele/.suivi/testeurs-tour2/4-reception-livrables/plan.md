# Réception et transmission des livrables — campagne 2

Responsable : testeur indépendant, orientation recette métier 9/10, technique 2/10. Préparation du 9 octobre 2026. Aucun autre rapport de testeur consulté. Aucun ancien paquet lancé.

## But de réception

Un collègue doit comprendre le résultat à partir de l’interface et du bilan exporté : demande initiale, critère métier, conclusion, sources, questions/réponses, motif de reprise et limites. Ni logs natifs ni JSON ne doivent être nécessaires pour expliquer le travail. Une fixture vérifie un parcours produit ; elle ne qualifie pas une prestation commerciale ou un modèle IA.

## Cinq parcours non Odoo

| Parcours | Situation fictive et actions prévues | Critères métier de réception | Preuves prévues |
| --- | --- | --- | --- |
| P1 — Compte rendu de réunion | Atelier fictif du comité Atlas. Source : réunion du 8 octobre, décision de reporter une journée portes ouvertes, Alice responsable, échéance au 16 octobre. Ouvrir la demande, lire le plan et les sources, recevoir le compte rendu. | La décision, le responsable et la date restent exacts. La demande et la source sont accessibles. L’utilisateur distingue le livrable de sa preuve et de sa réception. | Source fictive, plan, livrable, écran de résultat et décision de réception. |
| P2 — Avis défavorable distinct d’une panne | Relire un contrat fictif de location de salle. Le budget annoncé est 500 €, le total contractuel 650 €. Résultat métier : proposition défavorable. Deuxième demande indépendante : génération interrompue par un incident technique explicitement simulé. | L’avis défavorable demeure un résultat exploitable ; il ne devient pas une panne du traitement. L’incident technique demeure un travail non livré et indique une action de reprise. Les deux sont identifiables sans lire les logs. | Contrat fictif, conclusion chiffrée, écran négatif métier, écran d’incident et action suivante. |
| P3 — Clarification d’une demande client | Client fictif Atelier Boréal : préparer une invitation. La demande omet le lieu. Lire la question, répondre « Salle des Érables, 12 rue imaginaire », retrouver cette précision dans la demande et le livrable. | La question et la réponse sont visibles, attribuées à la bonne demande et conservées. La réponse précise le travail sans prétendre qu’un envoi a eu lieu. | Demande, question/réponse, livrable avec lieu, absence de prétention d’envoi. |
| P4 — Reprise motivée et comparaison | Premier compte rendu fictif oublie la date. Demander une reprise : « Ajouter l’échéance au 16 octobre et conserver la décision de report ». Deuxième tentative restitue cette date. | Le motif est obligatoire ou identifiable. La première tentative et son résultat restent consultables. On peut comparer l’omission et la correction puis recevoir la bonne tentative. | Deux livrables, motif de reprise, historique lisible, réception finale. |
| P5 — Bilan et passation après plusieurs demandes | Recevoir un bilan des demandes P1 à P4. Exporter vers le projet fictif un dossier de passation pour un collègue. | Le bilan indique par demande : résultat, état de réception, sources, reprises et limites. Il distingue fixture/simulation de travail réellement produit. Le document exporté se lit sans JSON/log natif. Aucun export ne prétend à un envoi externe. | Écran bilan, action d’export, chemin du fichier, texte humain exporté relu, limites et points restant ouverts. |

## Méthode et statut

UI d’abord : découvrir l’entrée normale, vérifier les deux stubs dans le terminal, puis réaliser les parcours. Les fixtures peuvent préparer les situations via l’API publique Engine du backend contenu dans le paquet. Aucune modification SQL/JSON de l’état n’est autorisée. Les sources/livrables sont des fichiers métier fictifs et des artefacts enregistrés par Engine ; l’état demeure écrit par Engine.

Le paquet corrigé sera identifié par chemin et SHA avant tout GUI. Tous les répertoires personnels, config et état sont temporaires et neufs. PATH est fixé avant le premier broker à `stubdir:/usr/bin:/bin`. Les stubs codex et claude répondent immédiatement à `--version`, impriment un marqueur et refusent toute exécution modèle (code 78). Aucun secret, compte, mail ou fournisseur réel.

Maximum 18 captures utiles. Chaque constat séparera UX/bug/manque/banc et donnera attendu, action observée, preuve, reproduction, gravité, action suivante. Si une boîte de dialogue native n’est pas accessible, un retour de chemin synthétique peut être utilisé et sera signalé comme limite du banc.

Préparation seulement : parcours non exécutés ; aucun verdict produit. Les fichiers `harness.cjs` et `sources/` sont prêts. Le prochain tour exige le paquet corrigé fourni par le responsable.

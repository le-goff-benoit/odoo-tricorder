# Réception froide — support client bureautique

Persona : chargé de support client, habitué aux outils bureautiques, sans onboarding. Application figée `/tmp/tricorder-method-review-v2`, fenêtre Electron, profil temporaire vierge, sans projet. Interaction exclusivement par l’interface et son DOM rendu. Aucun code de l’application, README, tests, état workflow ou rapport antérieur consulté.

Le fournisseur est une fixture NONSECRET (`fixture-model`) et les commandes `codex`/`claude` quittent avec 78. Aucune IA ni qualité métier n’est qualifiée. Ticket inventé et signalé comme synthétique. Pas de simulation de résultats, pas d’envoi, pas d’accès externe.

## Intention 1 — Examiner le modèle support

Attendu : comprendre la différence entre bug, urgence et impact ; identifier qui vérifie les résultats avant reprise de la réponse.

Parcours : Workflows → Modèles → Support : comprendre et répondre → ouverture des détails Diagnostic et réponse et Résultats.

Observé : les étapes Sources, Diagnostic et réponse, Résultats sont lisibles ; Analyse et Rédaction sont distinctes, Vérification apparaît comme agent distinct prévu après Diagnostic et réponse. Les critères visibles distinguent nature, urgence et impact, faits et hypothèses. La consigne complète consultée dans la fenêtre de modification nomme explicitement « bug suspecté, question d’utilisation, évolution ou indéterminée » et « Un impact normal ne signifie pas absence de bug ». Les investigations proposées ne doivent pas être présentées comme effectuées. L’envoi est explicitement exclu.

Résultat : réussi, avec nécessité d’ouvrir les détails pour comprendre les critères. Captures 02-support-modele.png et 03-support-detail.png. Gravité : aucune sur le contenu consulté.

## Intention 2 — Personnaliser puis préparer la demande et trouver son état

Attendu : créer une copie destinée à la réponse email, personnaliser la rédaction, fournir le ticket sous forme de texte ou fichier, puis retrouver résultats et état.

Parcours : Personnaliser une copie → nom « Support bureautique — réponse email » → Modifier cette étape sur Diagnostic et réponse. La fenêtre ouvre « Comprendre le problème et l’impact » et propose seulement l’analyse de cette étape groupée. Aucun choix de rédaction dans cette fenêtre. Options → Éditeur détaillé → tentative de sélectionner Préparer la réponse et la suite ; un autre bloc intercepte le clic. Réorganiser le graphe permet ensuite de sélectionner la rédaction. Ajout à la consigne du format email avec objet, salutation, constat, limites et prochaines actions. Appliquer au bloc, Enregistrer, Vue simple et Fermer les propriétés aboutissent au message « Complétez les champs du bloc avant de continuer ».

Abandon honnête : la personnalisation n’est pas enregistrée ni confirmée. Il n’est pas raisonnable, pour ce persona, de corriger une propriété technique qui n’est pas signalée. Une inspection du formulaire DOM pour documenter l’incident montre une valeur numérique 55.5 invalide (pas 1, valeurs proches 55/56), dans un champ sans libellé accessible. Cette observation est une piste, pas une cause confirmée par le code. Le champ est dans la section technique de position repliée. Capture 07-personnalisation-bloquee.png. Gravité : bloquante pour enregistrer/quitter cette personnalisation.

Continuation limitée après rechargement de la fenêtre : la copie initialement créée existe. La bibliothèque revient dans sa présentation détaillée avec les anciens blocs et modèles, au lieu de la liste simple initiale. Utiliser la copie → Nouvelle demande → Continuer → formulaire. « Format de la réponse » permet de choisir Brouillon d’email sans avoir personnalisé une consigne. L’impact et l’urgence sont renseignés ; le ticket synthétique est collé dans Objectif ou consigne complémentaire. Aucun champ visible pour joindre un fichier ou saisir la source principale, alors que le texte de la méthode promet email, texte, fichier et lien. L’aide du champ complémentaire demande de n’y ajouter qu’un objectif ou une précision. Gravité : majeure pour découvrir comment fournir les sources, particulièrement une pièce jointe. Capture 09-demande-texte-email.png.

Lancer dans le terminal crée une demande et ouvre son suivi. La fenêtre affiche d’abord « Votre demande est enregistrée » puis « Agent arrêté · progression conservée », 0/4 étapes, Reprendre l’agent et Voir le shell. L’arrêt est attendu avec le fournisseur inert de test. Aucun résultat métier ne peut être évalué. Les étapes et l’état sont trouvés ; la disponibilité/qualité des résultats reste non qualifiée. Capture 10-suivi-sans-resultat.png.

## Incidents à retenir

| Attendu | Observé | Gravité | Preuve |
|---|---|---|---|
| Modifier la rédaction depuis l’étape groupée | Modifier cette étape n’ouvre que l’analyse, sans sélecteur de travail | Majeure pour la personnalisation simple | 04-copie-editeur.png ; fenêtre observée |
| Sélectionner la rédaction dans le graphe | Bloc Vérification intercepte le clic ; Réorganiser le graphe contourne | Majeure, contournable | 05-editeur-detaille.png ; 06-chevauchement-blocs.png |
| Enregistrer une consigne puis revenir à la vue simple | Message générique, propriété technique repliée invalide, impossible de fermer | Bloquante | 07-personnalisation-bloquee.png |
| Fournir texte/fichier de support | Seulement impact, format et consigne complémentaire ; source/fichier introuvables | Majeure | 09-demande-texte-email.png |
| Revenir au catalogue stable après rechargement | Présentation détaillée et ancien catalogue réapparaissent | Modérée | 08-preparation-demande.png |

Limites : aucun diagnostic ni email produits par une vraie IA ; aucune vérification métier réelle ; aucun fichier transmis ; aucune réparation de l’application. La copie et la demande n’existent que dans le profil temporaire `/tmp/tricorder-support-uvanbq`. L’application et Xvfb ont été fermés. Les captures et le harnais sont conservés dans ce dossier de réception.

Durée instrumentée entre création du harnais et dernière capture : 264 s.

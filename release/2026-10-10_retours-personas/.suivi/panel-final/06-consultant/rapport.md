# Consultant multi-client — candidat figé

Agent jouant le rôle du consultant, 10 octobre 2026. Candidat `/tmp/tricorder-panel-final`, version 0.6.0-rc.15. Protocole `docs/RECETTE-USAGE.md` lu, aucun rapport des autres personas consulté avant les constats. Deux intentions ciblées, vraie fenêtre Electron sous DISPLAY=:93, 1440 × 1000.

## Intention 1 — adapter pour deux clients et retrouver une adaptation

Je pars d’Activité et choisis Workflows, puis Modèles : j’attends une bibliothèque partagée. Je cherche « réunion ». La carte Clôture de réunion correspond au besoin. Première hésitation : « Créer une adaptation… » et « Personnaliser une copie… » semblent deux façons de modifier le même objet, sans expliquer leur portée. Je choisis adaptation parce que mon objectif est client. Coût : lecture/comparaison de deux actions, pas d’erreur de destination constatée. Contournement : nommer explicitement le client et vérifier Enregistrer dans.

Le dialogue porte le titre « Créer un workflow », et non « Créer une adaptation » : la distinction objet partagé/adaptation doit être reconstruite mentalement. Le champ Enregistrer dans rend néanmoins le choix concret. Je crée Comité Atlas dans Client Atlas, ouvre les paramètres, adapte la description et enregistre. Le fil Client Atlas / Workflow est visible. Retour à la liste restaure la recherche « réunion » et affiche Destination : Client Atlas.

Je crée Comité Boréal depuis le même modèle, en changeant explicitement le dossier destination. Puis je clique Client Atlas dans l’accès rapide. La page sépare Demandes et résultats de Workflows disponibles. Comité Atlas est dans cette seconde section ; je l’ouvre, retrouve ma description et la révise. Retour confirme la description révisée. Contrôle de lecture API : les deux adaptations appartiennent à leurs projets ; celle de Boréal conserve la description d’origine. Le modèle partagé conserve son titre et sa description dans la bibliothèque. Aucun mélange client observé.

Réception : intention accomplie. Captures 03, 04, 06, 07, 08, 09 ; contrôle `verification.json`. Réserve de vocabulaire adaptation/copie, mineure mais directement pertinente pour ce persona.

## Intention 2 — reprendre une demande, son résultat et son historique

Depuis Client Atlas, je choisis Consulter dans Demandes et résultats. J’attends de reprendre la demande existante plutôt que de modifier le modèle. La page indique Client Atlas, le nom de la demande et « Votre réponse est attendue ». Répondre à la question ouvre un champ libre avec la question attendue. Je réponds « Comité Atlas du lundi, décisions et responsables. » La simulation passe à Terminée ; Voir les résultats présente directement le livrable final, marqué comme simulation.

Je reviens à la liste, choisis Workflows puis Historique. Les deux demandes Atlas/Boréal sont distinctes et chaque ligne nomme son client. Je rouvre Atlas, puis Voir les résultats : même contenu final retrouvé. Retour à la liste conserve Historique. Je passe à Modèles : la recherche « réunion » est toujours là, Destination : Client Atlas également. Aucun filtre à ressaisir, aucun retour au mauvais client observé.

Réception : intention accomplie. Captures 10 à 16. Coût visible : deux clics pour relire le résultat depuis l’historique (ouvrir la demande puis Voir les résultats), parcours compréhensible. Aucun abandon ni contournement nécessaire.

## Verdict et limites

**Adoption favorable pour ces deux parcours**, avec réserve sur la distinction « Créer une adaptation… » / « Personnaliser une copie… ». Le nom client, le choix de destination, les sections de la page projet et la persistance du filtre permettent de conserver mon contexte. Le titre générique « Créer un workflow » affaiblit légèrement la continuité du vocabulaire.

Après mes constats, l’orchestrateur a annoncé ajouter une aide expliquant la portée des deux actions. Cette correction n’existe pas dans le candidat figé de ce rapport ; elle nécessite sa propre contre-épreuve.

Fixtures via Engine.create_project/save/start/claim/submit uniquement. Demande Atlas démarrée en simulation, puis poursuivie depuis la GUI ; sortie sample_outputs synthétique. Historique Boréal injecté par claim/submit comme résultat synthétique (l’application l’étiquette Exécution réelle, puisqu’il n’a pas été démarré en simulation ; aucune exécution de fournisseur n’a pourtant eu lieu). Fournisseurs codex/claude remplacés par exécutables inertes, HOME et états sous /tmp. Aucun projet client réel, secret, envoi ni service externe. L’adaptation testée porte sur la description, pas sur l’exécution métier du modèle Réunion. Ni fournisseur ni analyse métier qualifiés.

Erreurs du pilote séparées : sélecteur initial « Adapter » absent, puis placeholder avec mauvaise ellipse ; corrigés d’après les libellés visibles. L’extraction body.innerText ignorait les textes du composant ; remplacée par ariaSnapshot. Première alerte de zone vide immédiatement rectifiée après lecture de la capture, aucun défaut app retenu. Les fichiers erreur/error restants correspondent à ces erreurs du pilote, pas à la dernière exécution. Le script final termine avec code 0 et ses assertions passent. Les itérations préparatoires utilisent chacune de nouveaux projets temporaires.

Rejouer : `node release/2026-10-10_retours-personas/.suivi/panel-final/06-consultant/parcours.cjs` depuis le dépôt, avec le candidat figé présent et Xvfb :93 actif. Le script crée un nouveau HOME synthétique, ferme Electron et arrête ses brokers. `fixture.json` indique la dernière fixture ; `verification.json` conserve les preuves moteur en lecture.

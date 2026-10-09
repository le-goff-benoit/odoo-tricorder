# Réception des corrections de la première campagne

- `npm test` : 321 tests Python et 112 JavaScript réussis. Exécuté avec PATH sans CLI commerciaux et référence Crew épinglée. Journal `/tmp/tricorder-rc12-feedback-unit.log`.
- Après le diagnostic supplémentaire de navigation rapide, test backend d’absence de workflow ajouté : 16 tests du fichier `test_functional_feedback_backend.py` réussis. Les 15 précédents sont inclus, pas ajoutés au décompte comme nouveaux scénarios.
- Cinq tests UI de régression réussis : dépendances R1–R4, détail sous focus après fin, réponse tardive après navigation, consigne sauvegardée avec choix IA, pause/annulation. `/tmp/tricorder-rc12-feedback-ui4.log`.
- Trois tests UI accueil/terminal réussis indépendamment : voir `accueil-terminal.md`.
- Relecture indépendante terminée : `review-independante.md`. Les défauts d’héritage d’effort, de présentation d’exemple, de statut suspendu/annulé et de raison d’attente ont été corrigés.
- Les premiers échecs du nouveau banc UI ont permis de corriger deux attentes de synchronisation et un focus de test sur un élément absent. L’erreur persistante de catalogue était un vrai défaut : clic capturé dans l’ancienne vue sans contexte projet explicite, puis recherche dans le mauvais projet. Les boutons transportent maintenant leur projet ; l’absence retourne aussi une erreur compréhensible.

La première suite UI complète a donné 106 réussites, deux attentes devenues obsolètes et deux parcours réels optionnels ignorés (`/tmp/tricorder-rc12-feedback-full-ui.log`). Les attentes ont été corrigées : premier paragraphe du périmètre de page et intitulé terminal désormais accompagné de l’intention. Les deux parcours ont ensuite réussi (`/tmp/tricorder-rc12-feedback-labels-ui.log`). Ce décompte combine la suite et ses reprises ciblées, pas une nouvelle suite complète verte.

Après l’ajout du test de navigation rapide, nouvelle exécution complète de `npm test` : **322 Python et 112 JavaScript réussis**, PATH sans CLI commerciaux, Crew épinglé ; `/tmp/tricorder-rc12-tour2-unit.log`.

Le paquet corrigé a été construit et comparé fichier par fichier aux sources compilées et au backend. Le `.deb` extrait correspond à l’application testée. L’empreinte est conservée dans `../testeurs-tour2/paquet.json` ; les preuves initiales du premier tour restent dans `../testeurs/paquet-initial.json`.

La suite complète du paquet et la seconde campagne fonctionnelle feront l’objet de preuves séparées. Aucun de ces tests ne reçoit une release Odoo réelle ni un fournisseur commercial.

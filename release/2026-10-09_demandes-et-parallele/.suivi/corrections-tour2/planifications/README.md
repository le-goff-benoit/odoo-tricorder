# Réception ciblée — versions planifiées et validation des communications

Corrections des réserves du testeur opérations, tour 2. Travail sur sources, avec projets et fournisseurs synthétiques isolés. Aucun projet client, compte, service distant ou paquet installé modifié.

## Résultat

- La carte montre le numéro de la révision planifiée. Son ouverture donne une lecture seule structurée des blocs, consignes, commandes, entrées/sorties et connexions ; la configuration complète reste accessible progressivement. Les listes ne transportent pas la définition entière.
- « Préparer une nouvelle version » compare la version figée avec le workflow enregistré. Une confirmation explicite archive l’ancienne planification, puis ouvre une nouvelle configuration. La fréquence, le mode et les autorisations doivent être vérifiés à nouveau ; aucun accord n’est copié. Annuler avant cette confirmation laisse l’ancienne active. Annuler ensuite ne crée aucune nouvelle planification ; l’ancienne est restaurable puis réactivable.
- Les prochains départs de l’ancienne planification sont arrêtés. Ses exécutions déjà en cours continuent et leurs résultats restent conservés. Le moteur de planification et les instantanés ne sont pas modifiés.
- L’aide donne le chemin « Options → Planifier ». Une carte archivée le dit explicitement ; une carte suspendue n’annonce plus sa dernière échéance calculée comme un prochain départ actif.
- Communication affiche « Manuelle — après opération ». L’aide distingue la validation du résultat après l’opération de la relecture avant envoi : préparation du contenu, puis Décision humaine avant Communication.
- Un vrai double clic valide sur l’activation créait deux planifications. Reproduit en rouge puis corrigé par un verrou immédiat du formulaire pendant la requête. La confirmation humaine HTML et le contrôle IPC/moteur restent exécutés.

## Fichiers produit

- `backend/studio.py` : projection compacte `schedule_summaries`, endpoint `schedule.get` en lecture seule.
- `electron/studio-main.cjs` : autorisation IPC de cette lecture.
- `src/studio.js` : cartes et détails de planification, remplacement guidé, protection double soumission, aide Communication.
- `tests/test_workflow_schedules.py` : deux tests supplémentaires de projection figée, absence de mutation et erreur récupérable.
- `tests/schedule-versions.spec.cjs` : trois parcours GUI ; ajouté par l’intégrateur au `testMatch` Playwright.

## Preuves

- **8 tests Python réussis**, dont les deux nouveaux : [journal](tests-python.log).
- **3 tests GUI réussis** : [journal](tests-ui.log). Consultation V1 après sauvegarde V2 ; annulation avant et après archivage ; activation V2 seule ; accord de notifications non transféré ; aide de validation Communication ; double clic avec et sans case humaine.
- [Rouge double activation](double-activation-avant.log) : 2 appels réels à `schedule.create` au lieu d’un, après double clic. Le test ralentit seulement le retour de la première réponse IPC, après les contrôles habituels ; il ne remplace ni les données ni l’autorisation. Après correction, un seul appel, une seule nouvelle planification active. Sans confirmation humaine, zéro appel.
- [Instantané V1 lisible](schedule-frozen-version.png) et [ancienne version archivée / nouvelle version active](schedule-explicit-replacement.png). Deux captures inspectées visuellement en 1440 × 1000.
- `git diff --check` réussi.

Le premier essai GUI a signalé l’oubli de `schedule.get` dans l’allowlist IPC ; il a été corrigé. Deux ajustements du test ont ensuite visé le résumé direct d’un bloc plutôt que ses résumés imbriqués et attendu la fermeture du formulaire après réponse asynchrone avant de lire le résultat. Aucun contrôle métier n’a été retiré.

## Périmètre et limites

Recette source isolée sur DISPLAY :184, HOME/XDG/états temporaires, Codex et Claude inertes, sans appel à un fournisseur commercial. Les échéances de ces tests ne sont pas déclenchées ; la cadence, le rattrapage, les changements d’heure et le non-chevauchement restent couverts par les tests moteur préexistants et la campagne opérations précédente. Cette réception ne qualifie ni messagerie réelle, ni fournisseur, ni fonctionnement prolongé.

La mention sur la poursuite des exécutions déjà en cours a été ajoutée après le build de cette recette ciblée ; c’est une précision de texte seulement, à inclure dans le prochain paquet de l’intégrateur. Aucun build distributif, commit ou déploiement effectué par ce sous-agent. App et brokers de test nettoyés ; serveur X partagé conservé.

# Persona 3 — Développeur senior sceptique

Candidat figé construit : `/tmp/tricorder-panel-final`. Deux intentions accomplies le 10 octobre 2026. Agent jouant un persona, aucune prétention à une étude humaine. Aucun code applicatif ni rapport des autres personas lu pour établir ces constats. Seuls le protocole et les bancs de tests génériques ont servi à préparer le pilote.

## Intention 1 — Comprendre, provoquer un échec réel, réparer, reprendre, retrouver

**Attente.** Je veux distinguer une définition sauvegardée d’un processus réellement lancé, voir le code de sortie et sa preuve, réparer le projet et reprendre la même demande sans réexécuter une procédure à l’aveugle.

**Premier clic.** Workflows, puis Modèles, puis « Créer une adaptation… » de « Commande locale avec validation ». Le dialogue annonce explicitement que l’enregistrement précède le lancement, et propose le projet de destination. Je nomme l’adaptation « Contrôle local reprise ».

**Compréhension et déroulé.** Le bloc commande expose « Sans shell ni réseau », `/project` en lecture seule et `/work` comme dossier de travail. J’y configure une vraie commande Python qui exige `/project/ready.txt`, imprime un diagnostic, puis retourne 7 si le fichier manque. « Exécuter… » ouvre un dialogue dont l’action primaire est « Lancer l’exécution réelle ». La commande échoue réellement : diagnostic lisible, code 7, preuve, tentative 1/2, une reprise restante. J’ouvre le terminal intégré, crée `ready.txt` dans le projet et ferme le volet. « Relancer cette étape… » annonce la relance immédiate et le coût d’une tentative ; j’y inscris la correction. La seconde tentative produit `CONTROLE_OK`, code 0. « Examiner la décision » montre cette sortie et sa preuve ; je consulte la preuve, puis « Approuver la suite ». Une seule décision humaine est nécessaire. Workflows → Historique retrouve l’exécution terminée avec sa durée.

**Hésitation / coût.** La commande et ses arguments sont loin sous le premier écran de l’inspecteur, après les données et options d’organisation. Un défilement substantiel est nécessaire pour la fonction principale d’un bloc Commande. Frottement faible, aucun abandon ni contournement hors application. Dans le suivi, la mention « Contrôles techniques automatiques ; aucun critère de métier attesté » m’aide à ne pas confondre réussite du processus et validation métier.

**Limite du scénario.** Le titre et la question de réception hérités du modèle évoquent encore le runtime Python ; je n’ai pas réécrit cette consigne pendant l’adaptation. La preuve qualifie l’échec/reprise et la présence du fichier, pas une recette métier du runtime ni une IA. La version du runtime n’a pas été vérifiée par ce scénario.

**Preuves.** Captures `05-lancement-reel.png`, `06-echec.png`, `07-reparation-terminal.png`, `08-reprise-confirmee.png`, `09-decision-preuves.png`, `10-preuve.png`, `12-historique.png`, `13-historique-detail.png`. `local-final-state.json` : exécution `r1b77bfa4a17b45ec`, `simulation=false`, `check=accepted` tentative 2, décision humaine `approve` tentative 1, statut final `completed`. La tentative précédente reste dans le suivi (visible sur `run-local-error.png`).

## Intention 2 — Renommer un ancien choix sans casser ses branches

**Attente.** Je maintiens un ancien workflow dont `approve`/`reject` sont déjà reliés à deux suites. Je veux présenter des choix métier naturels sans reconstruire le graphe ni connaître la migration technique.

**Premier clic.** Workflows → Gestion des workflows → workflows enregistrés → « Ouvrir le workflow » pour « Ancien aiguillage de publication », puis le bloc de décision.

**Compréhension et déroulé.** Je remplace les deux lignes de choix par « Publier la version » et « Renvoyer pour correction », puis Enregistrer. Les liens affichent les nouveaux libellés. Le workflow contient uniquement cette décision et deux documents à contenu fixe. Je lance réellement, sélectionne « Renvoyer pour correction », retrouve le document de correction produit ; le document de publication reste non applicable. Aucune reconstruction de lien n’est nécessaire.

**Frottement confirmé (modéré).** Le dialogue propose ici « Lancer dans le terminal » comme action primaire. Le vrai lancement sans agent est caché dans « Exécution automatique sans conversation ». Cela me fait douter : un workflow sans IA nécessite-t-il quand même une conversation ? Le coût est une exploration supplémentaire du dialogue et une vérification des modes. Contournement : ouvrir ce volet puis « Lancer l’exécution réelle ». Aucun fournisseur lancé. La capture `22-legacy-lancement.png` montre ce décalage avec le parcours commande.

**Réserve de vocabulaire (faible).** Le suivi final garde « Terminée · refusée » et les liens de détail « Si autorisé / Si refusé », bien que les choix aient été renommés. Ici le sens reste cohérent avec une demande de correction ; cela laisse néanmoins voir le vocabulaire historique. Le choix métier lui-même est bien conservé et affiché.

**Preuves.** Captures `20-legacy-avant.png`, `21-legacy-renomme.png`, `22-legacy-lancement.png`, `22b-legacy-avance.png`, `23-legacy-decision.png`, `24-legacy-resultat.png`, `25-legacy-branches.png`, `26-legacy-document.png`. `legacy-saved.json` montre les identifiants `approve` et `reject` inchangés, les libellés dans `option_labels` et les deux liens originaux `approved-link`/`rejected-link` conservés. `legacy-final-state.json` : exécution `r8b55f3ca9a2f4c47`, `simulation=false`, `gate=accepted/outcome=reject`, `repair=accepted`, `publish=skipped`, statut `completed`.

## Verdict

**Adoption favorable pour ces deux intentions, avec une réserve sur le lancement des workflows locaux sans commande.** Je peux inspecter ce qui a réellement tourné, réparer dans le bon projet, reprendre avec le compteur visible et retrouver les traces. Le renommage d’un ancien choix ne m’oblige pas à toucher aux identifiants ni à recréer les liens. Le lancement réel devrait être aussi immédiatement accessible pour les décisions/documents locaux que pour une commande.

## Rejeu et périmètre

`node release/2026-10-10_retours-personas/.suivi/panel-final/03-sceptique/parcours.cjs replay` crée un nouveau HOME/projet synthétique et rejoue les deux intentions via Electron et Playwright. Il remplace les captures homonymes : copier ce dossier avant un nouveau relevé si les preuves doivent être conservées. Le candidat est fixé dans le script. DISPLAY `:93` ; fournisseurs `codex` et `claude` inertes, jamais sollicités. Aucun secret ni client réel, aucun service externe, aucune simulation des deux exécutions. La fixture legacy est créée avec `Engine.create_project/save`, les états sont exclusivement écrits par le moteur.

Erreurs du pilote distinguées des défauts : un premier sélecteur cherchait le nom du workflow dans le bouton « Ouvrir » au lieu de sa ligne ; après la reprise, le pilote cherchait un nœud du graphe alors que la vue Détail était ouverte. Le CTA visible « Examiner la décision » permettait de continuer. Enfin le pilote cherchait directement un bouton réel caché dans le volet avancé du legacy ; seule cette dernière difficulté correspond aussi au frottement d’usage décrit ci-dessus. Les captures `*-error.png` restent conservées pour transparence. Les fichiers TXT basés sur `body.innerText` ne contiennent que la coque Electron ; les PNG et les lectures ciblées de l’inspecteur font foi pour le contenu.

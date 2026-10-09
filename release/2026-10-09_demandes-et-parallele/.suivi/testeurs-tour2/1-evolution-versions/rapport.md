# Tour 2 — testeur évolution de versions

Test réalisé le 9 octobre 2026, 21:35–21:44 (Europe/Zurich). Profil Product Owner / BA, métier 9/10, technique 3/10. Observations indépendantes : aucun rapport d’autre testeur lu.

## Verdict

**Conservation du contrat et de l’historique conforme sur les cinq parcours, avec réserves UX sur les parcours 2 et 4.** Aucun bug d’intégrité confirmé. Le parcours 4 est pleinement conforme pour une demande conversation ; la fixture automatique initiale ne propose pas la même copie directe. Les fournisseurs réels, leur authentification et leurs résultats ne sont pas qualifiés.

| Parcours | Verdict | Réserve / prochaine action |
|---|---|---|
| 1 — V1 pendant modification V2 | Conforme | Réutiliser la preuve de contrat figé. |
| 2 — nouveau lancement explicite | Conforme avec réserve UX mineure | Montrer la révision dans Activité et le suivi pour distinguer V1/V2 sans lecture technique. |
| 3 — conflit éditeur / fichier RH | Conforme | Fusion explicite, aucune perte observée. |
| 4 — copie d’une demande non lançable | Conforme sur conversation ; couverture automatique partielle | Harmoniser « Prête » avec « À configurer » ; proposer une adaptation depuis le détail d’une exécution automatique en échec. |
| 5 — pack V1/V2 et fournisseur | Conforme | Qualifier ensuite les fournisseurs réels sur un banc dédié. |

## Banc et limites

- Paquet `build-artifacts/linux-unpacked/odoo-tricorder`, SHA256 `9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3` ; app.asar `74bfb78a5261899b11de76f1f25e59a31753d086de0992f229e52141885cc058`. Vérifiés avant GUI et après les parcours, identiques.
- Backend exclusivement celui du paquet, `resources/backend`, empreintes conservées dans `backend-sha256.txt`. Aucun import du backend source ; aucun code produit, build ou commit.
- Entrée normale Electron sans `--workflow-studio`, écran `:181`, fenêtre 1440 × 1000. `harness.cjs` pilote effectivement les boutons/champs visibles de cette fenêtre Electron. Le moteur est dans le state temporaire `/tmp/tri-tour2-evolution-utk7bckx/state/workflows`.
- Env whitelist dans `banc.json`, HOME/XDG/CODEX_HOME/CLAUDE_CONFIG_DIR/TRICORDER_HOME/STATE/RUNTIME temporaires ; PATH constant `stub:/usr/bin:/bin`. `isolation-preflight.txt` prouve `command -v` et les marqueurs `TESTEUR2-STUB`. Aucun compte, projet client, service distant, secret ou trousseau.
- Les fixtures initiales sont créées par `Engine.create_project/save/start`, via `fixtures.py`. Complément déclaré au parcours 4 : `Conversations.open(..., initial_request=...)` avec le workflow synthétique sans modèle, sauvegardé dans `fixture-conversation.json`. Aucun état JSON/SQLite retouché. La seule modification directe concerne le fichier **de définition** RH pour provoquer le conflit autorisé.
- Pour les packs, seul `dialog.showOpenDialog` est remplacé par le retour du chemin synthétique V1/V2. L’aperçu, l’ajout au projet, la sélection du profil et les lancements sont réalisés dans l’UI réelle. Ce sélecteur natif n’est donc pas qualifié.
- Les lancements libellés « réels » par l’UI invoquent seulement des CLIs factices inertes. L’échec JSON après la réponse V1 est une limite du stub qui ne produit pas le protocole agent ; il ne prouve pas un bug de fournisseur.
- Aucun essai de simulation de parcours n’est utilisé comme preuve fournisseur. 17 captures. `page-errors.json` ne contient aucune erreur renderer.

## 1 — Une demande V1 attend pendant le changement de procédure

**Action.** Depuis Activité, ouvrir ACH-042 et « Répondre à la question ». Depuis Workflows, ouvrir la procédure achats, sélectionner « Comparer les offres », changer la consigne en « V2 — Comparer coût total, délai écrit, garantie et impact environnemental. », remplacer la sortie `synthese` par `synthese_v2` et `risques`, changer l’IA du bloc de Codex / modele-test-v1 à Claude / modele-test-v2, appliquer et enregistrer.

**Attendu.** Nouvelle révision, ancienne question et contrat conservés.

**Observé.** Révision 2 enregistrée, bloc à deux sorties et Claude V2 affichés. ACH-042 garde exactement sa question sur le plafond budgétaire. Le moteur confirme définition révision 1, prompt original, `outputs={synthese:string}`, Codex / modele-test-v1 et même identifiant de question `qa45874e44b3a4a37` en attente. Aucun transfert du nouveau contrat vers V1.

**Repro.** Rejouer `fixtures.py` sur un state neuf, puis les gestes ci-dessus. Comparer `Engine.run(oldRun)` avant/après.

**Preuves.** [Question V1](03-v1-question-detail.png), [révision 2](04-v2-enregistree.png), [question conservée](05-ancienne-question-apres-v2.png), `preuve-v1-v2.json`.

**Gravité / nature.** Aucun défaut constaté. **Verdict : conforme.** Prochaine action : conserver cette régression métier.

## 2 — Une nouvelle commande prend explicitement V2

**Action.** Dans le catalogue, Exécuter la procédure achats révision 2. Saisir ACH-044, ouvrir « Exécution automatique sans conversation », puis « Lancer l’exécution réelle ». Revenir dans Activité à ACH-042 et répondre « 4200 CHF — plafond validé pour ACH-042 ».

**Attendu.** Nouvelle demande sur V2, ancienne sur V1 ; réponse appliquée uniquement à ACH-042.

**Observé.** Le dialogue indique révision 2. Activité montre les deux demandes nommées distinctement. Le moteur confirme ACH-044 (`r86ec5abe6d3b4e7d`) sur V2 et ACH-042 (`rd6ebfde0e1594af4`) sur V1. La réponse ancienne est acceptée et la question V2 reste `waiting`, avec un autre identifiant. ACH-042 échoue ensuite lorsque le stub ne produit pas de résultat JSON ; sa réponse validée demeure visible. Le titre de suivi reprend seulement le nom du workflow et Activité ne présente pas la révision : on reconnaît les demandes par leur texte, pas directement par leur génération.

**Repro.** Après parcours 1, lancer V2 avec un texte distinct, répondre depuis la ligne ACH-042, comparer les deux `Engine.run`.

**Preuves.** [Dialogue V2](06-lancement-v2.png), [deux demandes](07-deux-demandes.png), [réponse ancienne](08-reponse-ancienne.png), `preuve-reponse-isolee.json`.

**Gravité / nature.** UX mineure : révision peu visible au suivi. Limite du banc : échec JSON du fournisseur factice. **Verdict : conforme avec réserve UX.** Prochaine action : afficher la révision / le contrat de lancement dans le suivi.

## 3 — Le terminal et l’éditeur changent la même procédure RH

**Action.** Ouvrir RH, modifier le prompt local puis appliquer au bloc sans enregistrer. Modifier son fichier de définition avec un prompt concurrent et une description distincte. Enregistrer dans l’UI ; choisir « Éditeur » pour `/nodes/analyse/prompt`, puis « Enregistrer la fusion ».

**Attendu.** Conflit présenté explicitement, conservation du brouillon, des modifications distinctes et du choix du champ.

**Observé.** Dialogue « Comparer les modifications du workflow » avec les deux valeurs, choix obligatoire et autres options de copie/adoption. Fusion révision 2 : prompt « RH local — Préparer accès, matériel, tuteur et visite de sécurité. » ; description « Modification terminal — ajouter le rendez-vous médecine du travail ». Aucun écrasement de la description concurrente. La consigne concurrente non retenue reste dans la preuve du fichier avant fusion.

**Repro.** Refaire ce changement simultané sur un RH neuf, conserver la révision 1 dans le fichier, puis enregistrer dans l’éditeur.

**Preuves.** [Conflit champ par champ](09-conflit-rh.png), [fusion enregistrée](10-rh-fusion.png), `definition-rh-concurrente.json`, `preuve-rh-fusion.json`.

**Gravité / nature.** Aucun défaut constaté. **Verdict : conforme.** Prochaine action : réutiliser ce parcours contre les pertes de brouillon.

## 4 — Reconfigurer une ancienne demande sans modèle

**Action.** Ouvrir ACH-043, exécution automatique de la fixture, échouée pour modèle manquant. « Choisir un workflow adapté » ouvre une Nouvelle demande générique. Aucune copie de configuration proposée dans ce détail. Pour qualifier le chemin de reprise prévu, créer par API validée une conversation synthétique ACH-045 sans modèle (complément déclaré). Ouvrir son suivi, puis « Vue d’ensemble », « Configurer un nouveau lancement… », « Configurer une copie ». Saisir modele-test-reprise, appliquer à toutes les étapes IA, Exécuter la copie puis Lancer dans le terminal.

**Attendu.** Ancienne demande figée, copie indépendante, texte reporté, modèle corrigible, aucun résultat ou décision ancien transféré.

**Observé.** Vue d’ensemble affiche « À configurer », zéro demande lançable et explication du modèle manquant. Le dialogue annonce clairement que décisions/résultats ne sont pas transférés. La copie « — adaptation » est enregistrée avec un nouveau workflow `work-77efca67-3b5b-4bfe-8fb2-e3dfb3e1efdd`. La demande ACH-045 est préremplie au lancement. Nouveau run `r2f8177194a7546c8` : modele-test-reprise, attempt 0, ready, aucun résultat ni décision. Ancien run conversation `r34c9f8dd40574770` : modèle vide, attempt 0, ready, conservé. Le banc n’avait pas de résultats/décisions antérieurs à transférer : leur non-copie est vérifiée structurellement et annoncée par l’UI, sans prétendre avoir testé le cas d’un historique riche.

**Réserves observées.** Activité et le détail ACH-045 affichent « Prête », alors que Vue d’ensemble affiche correctement « À configurer » et désactive le lancement. Pour ACH-043 automatique, le chemin de copie directe est absent et la Nouvelle demande générique présélectionne le premier workflow achats plutôt que celui à reprendre.

**Repro.** `Conversations.open` du workflow non-lancable avec initial_request, puis ouvrir Activité / demande / Vue d’ensemble et comparer les libellés. Pour l’automatique, ouvrir badRun et « Choisir un workflow adapté ».

**Preuves.** [Échec automatique](11-non-lancable.png), [action de reconfiguration conversation](12-reconfiguration-proposee.png), [copie](13-copie-reconfiguree.png), `fixture-conversation.json`, `preuve-copie.json`.

**Gravité / nature.** UX modérée : « Prête » ambigu malgré l’impossibilité de lancer l’agent de bloc. Manque / découvrabilité modérée : adaptation directe absente du détail automatique. Aucun bug d’intégrité confirmé. **Verdict : conforme sur conversation, partiel pour le chemin automatique et pour le transfert d’un historique riche.** Prochaine action : harmoniser les états de lancement, exposer la copie depuis le détail et tester une ancienne demande ayant des validations et résultats existants.

## 5 — Changer le pack et l’IA sans altérer le métier

**Action.** Depuis Options du projet, Ajouter un pack V1 (sélecteur synthétique), examiner et ajouter au projet. Dans le bloc achats, choisir « Analyste achats », enregistrer (révision 3) et lancer ACH-046 en automatique. Installer ensuite V2 par le même aperçu. Ouvrir le workflow, Choisir l’IA, passer Claude / modele-test-v2 à Codex / modele-pack-v2 et appliquer à toutes les étapes IA (révision 4). Examiner le bloc, puis lancer ACH-047.

**Attendu.** Ancien profil/pack/IA figés ; nouveau profil V2 et IA mise à jour ; critères, ports et consigne conservés.

**Observé.** Les aperçus affichent versions 1.0 et 2.0, « non qualifié », aucun lancement à l’import. ACH-046 conserve pack 1.0 (SHA `9ac847c6…`), profil « délai annoncé » (SHA `e2d10513…`), Claude / modele-test-v2. ACH-047 utilise pack 2.0 (SHA `8a2dd826…`), profil « délai garanti par écrit » (SHA `f29b53a4…`), Codex / modele-pack-v2. Les deux définitions ont exactement le même prompt métier, mêmes critères et entrées/sorties `budget` → `risques,synthese_v2`. Le profil analyste est conservé après changement de fournisseur. Les deux questions sont en attente ; aucun appel réel de fournisseur n’est qualifié.

**Repro.** Installer chaque dossier de pack via l’UI, choisir le profil V1, lancer une demande, installer V2, changer seulement l’IA commune et lancer une autre demande. Comparer `Engine.run`.

**Preuves.** [Aperçu V1](14-pack-v1-apercu.png), [aperçu V2](15-pack-v2-apercu.png), [contrat métier révision 4](16-contrat-ia-v2.png), [dialogue de lancement V2](17-lancement-pack-v2.png), `preuve-packs-figes.json`.

**Gravité / nature.** Aucun défaut constaté. Limite du banc : sélection native simulée et fournisseurs factices. **Verdict : conforme.** Prochaine action : qualifier le protocole et la disponibilité des modèles réels séparément.

## Diagnostic ciblé du paquet et clôture du banc

Après les observations GUI, lecture ciblée du backend du paquet : `engine.py` fige `original`, `definition`, `contract`, les versions/SHA de packs et l’exécution des nœuds au lancement ; `conversations.py` garde un contrat distinct par nouvelle demande. Lecture ciblée de `dist/app.js` extrait de l’asar : l’action `configure-execution-copy` clone `run.original`, attribue un nouvel ID, enlève la révision et reporte seulement le texte de demande. L’action est rendue dans la Vue d’ensemble conversation. Ces lectures corroborent les observations ; elles ne remplacent aucun geste GUI.

Application fermée par `app.close`, broker temporaire orphelin du premier lancement et harness de ce testeur arrêtés. Aucun processus d’un autre testeur ni Xserver arrêté. Paquet inchangé. Le dossier temporaire et les preuves sont conservés pour reproduction.

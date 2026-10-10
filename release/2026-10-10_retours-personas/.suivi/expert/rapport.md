# Analyse critique indépendante — conception et utilisation des workflows

Candidat observé : `/tmp/tricorder-personas-rc15-final`, version 0.6.0-rc.15. Audit du 10 octobre 2026, écran 1440 × 1000. Aucun code applicatif modifié par l’auditeur.

**Avis : utilisable pour adapter un modèle connu et suivre une exécution ; création autonome encore fragile dès qu’il faut nommer des branches et choisir leurs données.** Deux défauts de configuration provoquant un blocage sont reproductibles. Les parcours locaux de reprise, résultats, historique et retour sont nettement plus compréhensibles. Ce constat ne qualifie ni la pertinence d’une IA, ni un connecteur distant.

## Méthode et portée

Les observations ont commencé dans la vraie fenêtre Electron du candidat construit. Les scripts utilisent boutons, formulaires et navigation ; les captures `.png` et arbres accessibles `.txt` portent les mêmes noms. La lecture ciblée du code a ensuite servi au diagnostic. Les projets Atlas/Boréal sont créés via l’API validée, puis les adaptations et configurations sont faites dans l’interface. Les autres workflows sont créés intégralement depuis l’accueil. Aucun état JSON/SQLite forcé.

Les fournisseurs du banc sont des exécutables inertes. Deux parcours sont simulés explicitement : question → tâche → accord, et question → règle → branche. Une commande Python s’exécute réellement dans le dispositif local isolé : premier échec code 7, fichier du projet de test réparé, seconde tentative code 0, accord final. Le catalogue IA contient un seul modèle local synthétique. Aucun compte, secret, client réel, réseau métier, OAuth ou envoi externe n’intervient.

Scripts autonomes : `harness.cjs create.js`, `branches.js`, `config.js`, `draft.js`, `choices.js`, `advanced.js`. Exécution depuis la racine : `node release/2026-10-10_retours-personas/.suivi/expert/harness.cjs release/2026-10-10_retours-personas/.suivi/expert/<script>.js`. Chaque lancement crée un HOME isolé dans `/tmp` et ferme sa fenêtre. DISPLAY du banc : `:93`.

## Parcours observés

| Intention et attente | Premier clic / déroulement | Observation et impact | Preuve |
|---|---|---|---|
| Créer mon processus sans connaître les IDs | Accueil → Créer un workflow ; question, tâche, accord | L’assistant « Recevoir un résultat existant… » donne une liaison compréhensible et visible. La tâche initiale est toutefois guidée sans l’annoncer et ajoute une validation intermédiaire inattendue. | 01–17, `create.js` |
| Aiguiller email/ticket à partir de la réponse | Ajouter un bloc → Règle explicite → Recevoir le résultat « Canal choisi » | Le champ source reste `choice`. Enregistrement accepté ; après réponse `email`, exécution bloquée. | 20–25, `branches.js` |
| Proposer deux choix métier à une personne | Accord humain → « Email client » / « Ticket Odoo » | Les libellés naturels sont acceptés par Appliquer puis refusés à Enregistrer comme identifiants invalides. | 60–61, `choices.js` |
| Adapter un modèle commun à deux clients | Modèles → Commande locale avec validation → Créer une adaptation | Atlas conserve son nom, sa description et sa commande modifiée ; Boréal repart de la commande du modèle. La séparation est correcte. | 30–31, 45, `project-adaptations.json` |
| Paramétrer IA et notifications | Choisir l’IA ; Paramètres du workflow → Configurer une notification | Liste du modèle lisible. Le dialogue de connexion explique l’adaptateur manquant et conserve la description au retour. Les notifications ne sont pas encore configurables sans intervention technique. | 32–35 |
| Comprendre et réparer un échec réel | Exécuter → Lancer l’exécution réelle ; Détail → Relancer cette étape | Sortie de commande, code 7, nombre de tentatives et consommation d’une reprise sont visibles. Après correction locale, seconde tentative réussie et accord final. | 36–42, `config.js` |
| Retrouver le résultat et revenir | Voir les résultats → Fermer → Retour à la liste → Historique | Retour aux modèles conservé, historique terminal avec révision et durée comprenant les attentes. Aucun faux bouton de reprise sur le terminé. | 42–44 |
| Modifier une consigne puis une donnée sans connaître les boutons d’application | Saisie nom/consigne → Ajouter un résultat → Enregistrer | Contre-épreuve positive : ni nom ni consigne perdus ; deuxième consigne persistée par Enregistrer. | 50–52, `draft-observation.json`, `saved-draft.json` |
| Découvrir les possibilités avancées | Ajouter un bloc : intentions, par élément, sous-workflow, communication, externe, évaluation IA | Formulaires examinés ; pas d’exécution avancée qualifiée. Les champs techniques sont contextualisés au type de bloc, mais les collections et paramètres demandent encore une compréhension technique. | 70–75, `advanced.js` |

## Corrections prioritaires et critères

### E1 — P1, donnée de branchement déconnectée du formulaire de liaison

**Défaut reproduit.** Créer une question « Email ou ticket ? », recevoir sa réponse dans une règle sous le nom « Canal choisi », choisir les valeurs personnalisées `email` / `ticket`, relier les deux branches, enregistrer et simuler. Répondre `email` produit « Paramètre choice absent ou issue inconnue ». L’utilisateur a correctement choisi l’information dans le formulaire précédent mais doit ensuite deviner sa clé technique `Canal_choisi`. L’éditeur ne signale pas la source inexistante avant lancement.

**Correction proposée :** liste des entrées et paramètres déclarés avec libellés métier ; choisir automatiquement l’unique entrée lorsque la valeur actuelle est seulement le placeholder `choice`. Conserver un mode avancé pour les chemins imbriqués et les configurations existantes. Signaler une source introuvable au moment pertinent, sans invalider arbitrairement les paramètres fournis au lancement.

**Réception :** le même parcours n’exige aucune saisie d’ID ; `email` active la branche email et ignore ticket ; un ancien paramètre explicite reste inchangé. Une valeur réellement absente produit un diagnostic indiquant le nom métier et l’action corrective.

Diagnostic ciblé : `src/studio.js` crée le champ texte `node.parameter`, tandis que l’assistant ne crée que l’entrée et le lien ; `backend/workflow_engine/engine.py` cherche ensuite la valeur et bloque. La validation vérifie surtout que le paramètre est une chaîne, sans vérifier que `choice` a une source.

### E2 — P1, les « choix possibles » sont en réalité des identifiants techniques

**Défaut reproduit.** Dans Accord humain, saisir une question et deux lignes `Email client` / `Ticket Odoo`. Appliquer conserve la configuration ; Enregistrer échoue avec `step-… issue invalide : 'Email client'`. Le contrôle et le message utilisent le vocabulaire du moteur. Le formulaire ne permet pas à une personne de créer normalement des boutons métier.

**Correction proposée :** distinguer libellés et clés stables. Le nouvel utilisateur saisit les libellés ; l’application génère les identifiants. Préserver les clés des branches existantes, notamment approve/reject, et ne pas réécrire silencieusement les anciennes règles. Afficher les libellés au raccordement et à l’exécution. Si deux libellés produisent une collision, demander une correction intelligible immédiatement.

**Réception :** accents et espaces autorisés ; sauvegarde puis réouverture conservent les libellés ; chaque choix déclenche sa bonne branche ; modification d’un libellé ne casse pas un lien existant ; les anciens workflows conservent leur comportement.

Diagnostic : `contracts.py` impose des identifiants aux issues ; le formulaire stocke directement les lignes saisies dans `options`. Le texte d’aide reste `approve = … ; reject = …`, même après remplacement par des choix de destination.

### E3 — P2 important, mode de travail et validation implicites au départ

**Friction observée.** Un workflow vierge crée une « Tâche », alors qu’Ajouter un bloc propose par défaut une « Tâche IA autonome ». Le premier bloc ne présente pas le mode ni le réglage de validation visible dans son inspecteur. Dans question → analyse → accord, la simulation s’arrête d’abord sur « Résultat à valider », puis sur l’accord explicitement ajouté. La personne découvre son processus réel en l’exécutant.

**Correction proposée :** annoncer dès la création si la tâche travaille dans la conversation ou de manière autonome et comment son résultat sera validé. Exposer le réglage autorisé pour les tâches guidées comme pour les autres travaux. Ne pas retirer les contrôles des workflows existants ; laisser le concepteur décider s’il veut une revue intermédiaire puis un accord final.

**Réception :** dès l’édition, on peut expliquer les deux arrêts avant lancement. Une tâche configurée en validation technique avec un accord final n’ajoute pas une revue cachée. Les critères métier nécessitant un humain restent protégés.

### E4 — P2, nouveaux workflows encore créés avec le modèle de données ancien

**Friction observée, pas un échec moteur.** Le workflow vierge est schema 1. Ajouter/Modifier une donnée n’offre pas le caractère requis ; le formulaire conseille d’utiliser « Données structurées ». Le résultat source est décrit « obligatoire », mais l’entrée reçue devient « facultative ». Pour l’utilisateur, la même information change de statut sans décision explicite.

**Correction proposée :** utiliser les contrats structurés dès la création d’un nouveau workflow, avec des réglages simples de présence/type. Préserver les contrats des workflows existants. Dans l’assistant de liaison, annoncer le contrat de l’entrée obtenue, pas seulement celui de la sortie source.

**Réception :** nouveau workflow sans étape de conversion ; champ « donnée requise » directement disponible ; comportement obligatoire/facultatif vérifiable avec valeur manquante ; anciennes définitions non migrées silencieusement.

### E5 — P2, paramètres réutilisables encore réservés aux utilisateurs techniques

**Limitation d’ergonomie observée.** Paramètres du workflow → Paramètres supplémentaires contient un objet JSON. Les formulaires de lancement spécialisés des réunions sont utiles, mais cette facilité ne constitue pas encore un créateur générique de formulaire de lancement pour un workflow personnel.

**Évolution proposée :** une liste nom/valeur de paramètres simples, distincte du JSON avancé ; expliquer quand préférer une question ouverte. À terme, champs de lancement avec libellé, aide et caractère obligatoire. Ne pas prétendre qu’une simple déclaration d’entrée sait collecter une donnée seule.

**Critère :** créer un paramètre texte réutilisé par une condition sans JSON ; savoir s’il est fixe ou demandé à chaque lancement. Évolution de portée supérieure aux corrections E1/E2, à prioriser explicitement.

### E6 — P3, noms métier et aide contextuelle

Les données « Réponse proposée », « Synthèse des décisions » réapparaissent sans accents après conversion en clé. Ce n’est pas bloquant, mais cela révèle le stockage au lieu de conserver le vocabulaire saisi. Conserver un libellé distinct si le modèle de données le permet. Ajouter une courte explication de chaque type de bloc au choix : qui agit, ce qui est nécessaire, ce qui arrête le workflow. Les options actuelles nomment correctement les catégories, mais ne suffisent pas à choisir entre tâche guidée, autonome, communication et opération externe.

## Ce qui fonctionne et doit être préservé

- L’assistant de réception d’un résultat évite de créer séparément une entrée, un lien et son mapping ; la provenance est visible dans le bloc cible.
- Les formulaires protègent le brouillon du bloc pendant les actions secondaires et l’enregistrement global. Cette contre-épreuve évite de corriger un défaut inexistant.
- Les adaptations par client restent séparées ; le modèle d’origine reste réutilisable.
- Le lancement local distingue exécution réelle et simulation. Le résultat simulé est signalé comme exemple, jusque dans la fenêtre finale.
- Les échecs locaux sont lisibles et la reprise conserve la trace de la tentative précédente. Le dialogue prévient explicitement qu’une tentative sera consommée.
- Le livrable final est présenté avant les résultats intermédiaires. Les retours arrière et l’historique gardent une orientation compréhensible.
- La notification annonce sa dépendance à une connexion installée. Cette honnêteté doit rester ; ajouter un faux champ email « fonctionnel » serait une régression.

## Limites et avis de réception

Aucun test n’a qualifié la qualité d’une réponse IA, une session agent réelle longue, une livraison Gmail/Odoo, un OAuth, une planification récurrente réelle ou une exécution parallèle multiéléments. Les types avancés ont été inspectés en création, sans preuve métier. Les scripts d’exploration ont été ajustés lorsque leurs sélecteurs supposaient un libellé absent ; ces erreurs de banc ne sont pas comptées comme défauts applicatifs.

L’interface peut être reçue **sous réserve de correction et contre-épreuve E1/E2**, puis revue des six personas sur le candidat corrigé. E3/E4 sont des corrections cohérentes avec la demande initiale de compréhension ; E5 est une extension de configuration à traiter honnêtement selon sa portée. Aucune affirmation « un humain peut tout créer seul » n’est justifiée tant que les chemins de données et les choix restent implicitement techniques.

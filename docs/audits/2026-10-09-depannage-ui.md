# Review indépendante : comprendre et résoudre les blocages d’exécution

État : réception terminée. Les huit écarts ci-dessous sont corrigés dans le
périmètre reçu ; dix parcours et deux contre-épreuves de navigation sont verts.
Les compléments ciblés de conservation d’un profil absent et de contexte Odoo
défini par un profil de pack sont également reçus.
Cette revue porte sur un parcours complet : saisir une demande → rencontrer un
prérequis → suivre l’action proposée → effectuer le réglage → revenir → continuer
sans perdre le travail. Elle ne remplace pas la review des gardes du moteur.

## Méthode

Le binaire réellement installé **0.6.0-rc.8** a été ouvert avec un profil Electron,
des projets Git, des PTY et des adaptateurs locaux synthétiques isolés. Toutes
les destinations et actions présentées dans les captures ont été cliquées.
Seul le sélecteur de fichier natif a été substitué par un chemin synthétique pour
le test d’import ; les écrans de prévisualisation, destination et import sont réels.
Aucun modèle, compte fournisseur, email, service distant ou projet client utilisé.

Binaire : `/home/blegoff/.local/opt/odoo-tricorder-0.6.0-rc.8/odoo-tricorder`.
SHA-256 de `resources/app.asar` :
`4ab384d617e939c1b12f6e673e3fed75081ae0155a8e3e536a5a889550ec1bc5`.

Les sondes [blocages](2026-10-09-depannage-ui/rc8-blocker-probe.cjs) et
[continuité](2026-10-09-depannage-ui/rc8-continuity-probe.cjs) sont terminées sans
erreur de sonde. Leurs fichiers JSON conservent les textes visibles, destinations
et valeurs après retour. Elles ne reconstruisent pas l’application, ne modifient
pas ses sources et n’écrivent pas dans les résultats de tests partagés.

## Défauts confirmés, ordonnés par impact

### DEP-00 — P1 — Un prérequis de recette interdit même la préparation

Référence directe du problème signalé par l’utilisateur : un pack synthétique
impose une copie locale avant la QA ; le workflow comprend « Comprendre la
demande » puis « Vérifier sur une copie locale ». Sans copie préparée, rc.8
désactive le lancement natif dès le départ et demande : « Pack Odoo : identifier
environment=local et neutralized_copy pour la recette. » Le bouton de correction
ouvre le bloc QA, dont le formulaire ne propose pas les champs mentionnés.
L’utilisateur ne peut donc pas commencer l’analyse qui permettrait de préparer
cette copie. Le message expose des noms de paramètres internes.

Preuves : [lancement interdit](2026-10-09-depannage-ui/rc8-qa-copy-before-launch.png),
[destination sans les réglages demandés](2026-10-09-depannage-ui/rc8-qa-copy-remedy-destination.png),
[sonde](2026-10-09-depannage-ui/rc8-qa-copy-probe.cjs).

Réception attendue : le dialogue distingue ce qui empêche de commencer de ce qui
devra être prêt avant une étape. Il permet de préparer le travail dans le terminal,
nomme la future QA et la copie à préparer avec du vocabulaire utilisateur, sans
faire croire que la recette peut déjà être exécutée. Le moteur conserve sa garde
à la prise en charge du bloc QA ; cette dernière propriété est reçue séparément.

### DEP-01 — P2 — Régler le modèle efface la demande et le périmètre

Saisir « Analyser le mail client et conserver mes quatre observations. », cocher
Projet Bêta puis développer l’exécution automatique : le modèle est manquant.
« Configurer cette étape » ouvre l’inspecteur. Choisir l’IA, saisir un modèle,
appliquer puis rouvrir Exécuter : la demande vaut `""` et aucun projet n’est coché.
Le réglage a réussi, mais l’intention et le périmètre précédents sont perdus.

Preuves : [avant](2026-10-09-depannage-ui/rc8-model-missing.png),
[destination](2026-10-09-depannage-ui/rc8-model-configure-destination.png),
[retour vide](2026-10-09-depannage-ui/rc8-model-return-lost-request.png).

Correction attendue : brouillon de lancement lié au workflow et au projet,
restauré après le réglage. Les autorisations d’opérations externes ne doivent pas
être confondues avec ce brouillon. L’action du diagnostic doit ouvrir le choix IA.

### DEP-02 — P2 — Un outil absent renvoie vers un réglage sans rapport

Avec Claude absent du PATH synthétique, « CLI de conversation non installé »
désactive le lancement. « Configurer cette étape » ouvre l’inspecteur du bloc
Analyser ; aucun contrôle visible n’y installe l’outil ni ne permet sa connexion.
L’utilisateur suit pourtant exactement l’action proposée.

Preuves : [diagnostic](2026-10-09-depannage-ui/rc8-cli-missing.png),
[destination](2026-10-09-depannage-ui/rc8-cli-configure-destination.png).

Correction attendue : destination Connexions ou choix d’un fournisseur disponible,
explication de l’action locale nécessaire et retour explicite au lancement.
Paramètres ne constitue pas une destination pertinente : cette fenêtre règle
l’affichage, le terminal et les dossiers, pas les modèles ou plugins.

### DEP-03 — P2 — Une connexion non vérifiée ne mène pas à sa vérification

Un adaptateur local est déclaré mais non vérifié. « Transport non qualifié ou
modifié » renvoie encore à l’inspecteur du document. Pour résoudre le problème,
le reviewer doit quitter ce parcours, ouvrir lui-même Connexions, trouver la
carte, lancer sa vérification puis revenir via Projets → workflow → Exécuter.
Le lancement est alors disponible, mais la demande précédemment saisie est vide.

Preuves : [blocage](2026-10-09-depannage-ui/rc8-connection-unverified.png),
[mauvaise destination](2026-10-09-depannage-ui/rc8-connection-configure-destination.png),
[connexion réellement vérifiée](2026-10-09-depannage-ui/rc8-connection-verified-no-return.png),
[retour](2026-10-09-depannage-ui/rc8-connection-return.png).

Correction attendue : ouvrir Connexions dans le projet concerné, identifier le
plugin exact, conserver le brouillon et proposer le retour au workflow/lancement.

### DEP-04 — P2 — Le périmètre multi-projet révèle son blocage trop tard

Alpha dispose d’un adaptateur vérifié, Bêta n’a pas sa déclaration. Cocher Bêta
laisse « Lancer dans le terminal » actif. Le clic échoue ensuite avec « Projet
Bêta … Capacité absente du catalogue … », sans aucune action corrective. La
saisie reste présente dans ce cas, mais l’utilisateur doit deviner le changement
de contexte nécessaire et sortir du dialogue.

Preuves : [avant clic](2026-10-09-depannage-ui/rc8-multiple-projects-before-launch.png),
[erreur sans sortie](2026-10-09-depannage-ui/rc8-multiple-projects-error.png).

Correction attendue : vérifier tous les projets sélectionnés et identifier celui
du diagnostic. Une action doit ouvrir ses connexions, puis ramener au même
workflow avec le même périmètre. Retirer volontairement un projet peut être une
autre issue ; cela ne doit jamais être fait silencieusement.

### DEP-05 — P2 — Un workflow global nécessitant un dépôt n’est pas adaptable depuis son blocage

« L’édition de code nécessite un projet Git ; adapter le modèle dans un projet »
est compréhensible, mais son bouton ouvre encore seulement le bloc d’édition.
Le contexte reste Workflows globaux et aucune destination de projet n’est proposée.

Preuves : [diagnostic](2026-10-09-depannage-ui/rc8-global-edit.png),
[inspecteur sans adaptation](2026-10-09-depannage-ui/rc8-global-configure-destination.png).

Correction attendue : proposer explicitement le projet de destination et créer
une adaptation, conserver la demande puis revenir aux prérequis de cette version.
Ne pas faire passer le workflow global pour un dépôt Git.

### DEP-06 — P2 — Un prérequis du workflow renvoie à un bloc inexistant

Avec une série Odoo requise mais absente, le diagnostic porte sur `workflow`.
« Configurer cette étape » ferme le dialogue et laisse le canvas sans inspecteur,
car aucun bloc n’a cet identifiant. Ouvrir manuellement Paramètres du workflow
montre surtout nom, description et notifications ; les paramètres nécessaires
sont dans « Paramètres supplémentaires », replié. Le clic prescrit ne conduit
donc pas à un réglage utilisable.

Preuves : [prérequis global](2026-10-09-depannage-ui/rc8-workflow-settings-before-launch.png),
[canvas sans réglage](2026-10-09-depannage-ui/rc8-workflow-settings-remedy-destination.png),
[véritables paramètres du workflow](2026-10-09-depannage-ui/rc8-workflow-settings-actual.png).

Correction attendue : ouvrir les paramètres du workflow, exposer le réglage
pertinent et indiquer la valeur attendue avec des mots compréhensibles. Un
diagnostic portant sur l’ensemble du workflow ne doit pas prétendre viser un bloc.

### DEP-07 — P2 — Une réponse tardive annule la navigation de l’utilisateur

Lors de la réception des premières corrections, après un lancement natif, un
clic Projets montre la liste puis ramène spontanément l’ancienne exécution.
Le contrôle suivant ne trouve donc plus les projets. Le défaut est ensuite
reproduit isolément : seule la première réponse IPC `run.get`, obtenue normalement
du moteur, est retardée de 1 500 ms. Projets est ouvert pendant cette attente.
À l’arrivée de la réponse, `openRun` imposait de nouveau la route du workflow.

Preuves rouges : [Projets avant la réponse](2026-10-09-depannage-ui/navigation-projects-before-late-response.png),
[retour imposé à l’exécution](2026-10-09-depannage-ui/navigation-projects-after-late-response.png),
[sonde et méthode](2026-10-09-depannage-ui/navigation-race-probe.cjs).
Aucun état moteur ni résultat n’a été modifié pour cette reproduction.

Après correction, la même réponse tardive laisse Projets affiché. Une variante
ouvre Nouveau projet et saisit son nom pendant l’attente : le dialogue, la valeur
et le focus sont tous conservés après la réponse. Cette protection respecte la
navigation explicite sans arrêter le travail du terminal.

Preuves vertes : [Projets conservé](2026-10-09-depannage-ui/after-navigation-projects-response-ignored.png),
[saisie et focus conservés](2026-10-09-depannage-ui/after-navigation-form-response-ignored.png).

## Parcours satisfaisants et limites précises

- **Import portable** : le dialogue nomme les dépendances, prévient que les
  connexions doivent être vérifiées et importe un brouillon dans le projet choisi.
  Il n’exécute rien. Après import vers Bêta, la capacité manquante est détectée,
  mais sa résolution souffre de DEP-03.
  [Prévisualisation](2026-10-09-depannage-ui/rc8-import-preview.png),
  [diagnostic](2026-10-09-depannage-ui/rc8-import-missing-capability.png),
  [destination](2026-10-09-depannage-ui/rc8-import-remedy-destination.png).
- **Paramètres** : ouverture et fermeture reviennent au workflow courant ; les
  contrôles correspondent à l’affichage/terminal/dossiers.
  [Capture](2026-10-09-depannage-ui/rc8-preferences.png).
- **Vérification d’adaptateur** : le contrôle explicite de l’adaptateur local
  synthétique rend sa carte Utilisable et lève effectivement le blocage du projet
  Alpha. Le problème observé concerne le chemin vers ce contrôle et son retour.

Le premier passage est à 1440 × 900, zoom navigateur 100 %, thème clair. La
réception des corrections couvre aussi 1024 × 768 et les retours effectifs.
Les appels API de fixture servent uniquement à créer des workflows et projets
incomplets via les commandes validées ; aucun état d’exécution n’est forcé.
La reprise PTY et les règles de sécurité du moteur sont examinées séparément.

## Ce que ces parcours révèlent

Les défauts ne viennent pas principalement des couleurs ou des marges. Le
dialogue de lancement réunissait des contraintes portant sur des objets
différents — fournisseur, connexion d’un projet, définition du workflow,
préparation d’une étape — puis proposait presque toujours le même bouton vers
un bloc. L’information pouvait être vraie sans permettre à l’utilisateur d’agir.
Le contrat de diagnostic doit donc porter une destination pertinente, le projet
concerné et le moment où le prérequis devient obligatoire.

La saisie du lancement avait aussi une durée de vie plus courte que le parcours
nécessaire pour corriger sa configuration. Le travail de l’utilisateur comprend
la demande et les projets choisis ; il doit survivre à ces détours. Cela ne
justifie pas de réutiliser implicitement une autorisation d’envoi ou de déploiement.

Une recette qui se limite à constater le message et le bouton désactivé passe à
côté de ces impasses. Le critère utile est l’enchaînement complet : suivre le
remède proposé, arriver au bon contexte, appliquer le réglage, retrouver la
saisie et pouvoir commencer. Le contrôle final de chaque étape sensible reste
une propriété distincte du moteur.

## Réception des corrections

La [sonde complète finale](2026-10-09-depannage-ui/remediation-recheck.cjs) reçoit
**10 parcours sur 10** dans une nouvelle instance isolée. Les
[résultats complets](2026-10-09-depannage-ui/remediation-recheck-results.json)
conservent les textes, destinations, saisies et projets sélectionnés. Les deux
contre-épreuves de navigation sont également vertes :
[route](2026-10-09-depannage-ui/navigation-race-recheck-results.json) et
[formulaire](2026-10-09-depannage-ui/navigation-race-form-results.json).
Ces trois contrôles portent sur le même bundle renderer :
`593712e7f56b992f5e968140836f9f433037d24d0a8d954e9d086803ad660236`.

| Parcours réellement manipulé | Résultat reçu |
|---|---|
| Modèle manquant → Choisir l’IA → appliquer → lancement | Demande et Bêta coché conservés ; conversation créée dans le périmètre choisi. Retour à cette conversation depuis Projets : même identifiant de terminal et même PID. |
| CLI Claude absent → Choisir l’IA → Codex synthétique disponible | Action pertinente, modèle choisi, retour avec demande intacte et lancement effectif du fournisseur de test. |
| Connexion non vérifiée → Connexions → vérifier → revenir | Bon contexte Alpha, demande intacte ; la lecture de l’adaptateur local termine réellement, résultat accepté. |
| Alpha + Bêta sans plugin → diagnostic Bêta → configurer Bêta → revenir | Blocage présenté avant le lancement ; retour à Alpha avec demande et Bêta coché, puis conversation créée sur les deux projets. |
| Édition depuis Workflows globaux → Utiliser dans un projet | Copie dans Alpha, original global conservé, demande conservée, prérequis levé et lancement disponible. |
| Série Odoo absente → Ouvrir les paramètres | Focus sur le champ Version d’Odoo ; saisie `19.0`, retour avec demande intacte et lancement disponible. Aucun JSON à saisir. |
| Copie QA absente → préparation native | Prérequis présenté comme nécessaire avant la QA ; lancement disponible à 1440 clair et 1024 sombre. Conversation créée avec demande intacte ; analyse prête, QA encore en attente de dépendance. |
| Import portable vers un projet sans plugin → Connexions | Projet de destination correct, qualification locale possible, demande conservée au retour et lancement disponible. |
| Paramètres de l’application → Fermer | Retour au workflow, pas de détour vers une autre application. |
| Planification → série manquante → paramètres → retour | Fréquence du lundi au vendredi, 10:45, Europe/Paris et simulation décochée conservés ; consentement d’activation à redonner. Aucune planification activée. |

Les intitulés « À résoudre avant le lancement » et « À préparer pendant le
workflow » rendent visible une distinction décisive : commencer l’analyse peut
être possible alors que la recette ne l’est pas encore. Le diagnostic nomme
désormais le projet et l’étape ; son action ouvre le bon outil de configuration.
Dans les connexions, un bandeau rappelle le workflow d’origine et fournit le
retour explicite. Le terminal reste dans la fenêtre de Tricorder.

Les captures ont été inspectées visuellement. À 1024 × 768, le dialogue QA
conserve la demande, le prérequis différé et le bouton de lancement dans sa zone
visible ; les actions secondaires restent accessibles par le défilement du
dialogue. Les paramètres Odoo sont un formulaire plus long, mais le champ
concerné reçoit le focus et les contrôles restent accessibles.

## Captures finales à réutiliser

- [Préparer la recette sans interdire l’analyse — clair, 1440](2026-10-09-depannage-ui/after-qa-preparation-light-1440.png).
- [Le même parcours — sombre, 1024](2026-10-09-depannage-ui/after-qa-preparation-dark-1024.png).
- [Retour après configuration avec les deux projets et la demande conservés](2026-10-09-depannage-ui/after-multiple-projects-return-preserved.png).
- [Choisir le projet d’adaptation du workflow global](2026-10-09-depannage-ui/after-global-project-choice.png).
- [Version Odoo dans un champ explicite](2026-10-09-depannage-ui/after-workflow-settings-destination.png).
- [Planification retrouvée après configuration](2026-10-09-depannage-ui/after-schedule-return-preserved.png).

## Complément ciblé : préserver un profil dont le pack est absent

Un dernier correctif de l’inspecteur empêche de présenter implicitement Généraliste
quand l’identifiant du profil enregistré n’existe pas dans les packs disponibles.
La [sonde ciblée](2026-10-09-depannage-ui/missing-profile-recheck.cjs) vérifie :

- `specialist-missing` apparaît comme « specialist-missing (pack absent) » ;
- renommer le bloc, enregistrer puis rouvrir le workflow conserve exactement cet
  identifiant, sans remplacer le choix de l’utilisateur ;
- choisir explicitement « Aucun agent dédié » puis enregistrer produit bien
  `generalist`.

Les deux instantanés sauvegardés et la lecture des valeurs sélectionnées sont
conservés dans [les résultats](2026-10-09-depannage-ui/missing-profile-recheck-results.json).
Captures inspectées : [profil absent explicite](2026-10-09-depannage-ui/after-missing-profile-explicit.png),
[choix Généraliste explicite](2026-10-09-depannage-ui/after-profile-explicit-generalist.png).
Ce contrôle supplémentaire porte sur le renderer
`e3c07080428da712486b1dbc955fb5c0d924852a2c331e4d5b968de4c06ae584`.
Les dix parcours précédents n’ont pas été répétés pour ce changement local du
sélecteur ; ils gardent leur empreinte de réception propre indiquée plus haut.

## Complément ciblé : contexte Odoo défini par un profil de pack

Un workflow générique peut utiliser un profil nommé `specialist`, déclaré dans
un pack dont `policies.domain` vaut `odoo`, sans porter lui-même de propriété
`domain`. Le formulaire doit alors proposer le contexte Odoo nécessaire au
prérequis signalé par le moteur ; le nom du profil n’a pas à commencer par
`odoo-`.

La [sonde ciblée](2026-10-09-depannage-ui/pack-profile-context-recheck.cjs)
reçoit ce parcours dans une instance synthétique isolée, à 1440 × 900 :

- saisie d’une demande dans Exécuter, puis diagnostic « série du projet requise » ;
- clic sur « Ouvrir les paramètres » : « Version d’Odoo » est visible et reçoit
  effectivement le focus ;
- saisie de `19.0`, application puis retour au lancement : la demande est intacte
  et « Lancer dans le terminal » devient disponible ;
- relecture de la définition enregistrée : `parameters.series` vaut `19.0`, le
  profil reste `specialist` et aucune propriété `domain` n’a été ajoutée ;
- contre-épreuve dans le même projet, avec le même pack installé : les paramètres
  d’un workflow sans domaine utilisant `generalist` n’affichent aucun champ Odoo.

[Résultats et instantanés de l’interface](2026-10-09-depannage-ui/pack-profile-context-results.json).
Captures inspectées : [champ pertinent et focalisé](2026-10-09-depannage-ui/pack-profile-odoo-fields-visible.png),
[demande conservée et lancement disponible](2026-10-09-depannage-ui/pack-profile-return-ready.png),
[workflow généraliste sans champs Odoo](2026-10-09-depannage-ui/pack-profile-generalist-no-odoo-fields.png).
Le renderer reçu porte l’empreinte
`cea93908e19b634db8d79a11f76763537770835189895a3bd3d1b8d594679da3`.

Cette réception porte uniquement sur l’affichage et la résolution du prérequis
par l’interface, jusqu’au lancement disponible. L’application des gardes Odoo
par le moteur fait l’objet de la review fonctionnelle indépendante ; aucune
recette Odoo réelle n’est exécutée. Les dix parcours précédents n’ont pas été
répétés pour cette modification locale du prédicat d’affichage.

## Portée et traçabilité

La première tentative de réception attendait une action Connexions pour un CLI
absent ; le contrat final propose justement de choisir un fournisseur disponible.
La sonde a été adaptée à cette action et le fournisseur synthétique a été choisi
dans l’interface. Cette attente périmée n’est pas comptée comme un défaut produit.
La seconde tentative a révélé DEP-07 ; l’échec multi-projet qui suivait était une
conséquence de la qualification Alpha non effectuée. Une sonde isolée a reçu les
deux chemins, puis la passe finale complète a reçu les dix parcours après le
correctif de navigation. Les instantanés des passages intermédiaires sont
conservés pour distinguer ces faits.

Les CLI utilisés sont des programmes de test inertes. Le test ne qualifie ni
OpenAI, ni Anthropic, ni leur authentification. L’adaptateur de lecture ne fait
qu’un échange JSON local déterministe. Pour les connexions absentes après import
ou sélection de Bêta, le manifeste synthétique est ajouté par la fixture dans le
projet temporaire ; l’actualisation, la vérification et le retour sont effectués
par les boutons réels. La création assistée d’un nouveau descripteur ou le login
d’un vrai fournisseur ne font pas partie de cette preuve.

Les scénarios d’adaptation, import et paramètres vont jusqu’à un lancement
disponible, sans exécuter de modification de code réelle. Les conversations de
test et la lecture locale sont effectivement lancées ; aucune release client,
recette Odoo, notification, publication ou planification réelle n’est réalisée.
La remise à zéro d’une autorisation de notification n’a pas été directement
exercée ici ; seule la nécessité de redonner le consentement d’activation d’une
planification est constatée. La sûreté des étapes et les autres modes d’exécution
restent couverts par la review fonctionnelle indépendante.

L’[inventaire SHA-256](2026-10-09-depannage-ui/sha256sums.txt) couvre le rapport,
les sondes, résultats et captures, avec leurs chemins relatifs au dépôt.

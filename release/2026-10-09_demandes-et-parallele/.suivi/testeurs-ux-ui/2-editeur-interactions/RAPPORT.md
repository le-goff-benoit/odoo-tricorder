# Avis indépendant UX2 — dessin et configuration de workflows

Le produit permet de construire et conserver un workflow générique sans projet
Odoo ni JSON. La lecture du transport des données et la configuration initiale
d'une décision demandent encore des connaissances que le dessin ne transmet
pas. L'essai porte sur les interactions d'un BA / chef de projet légèrement
technique, pas sur la qualité des fournisseurs IA.

Réception du paquet 0.6.0-rc.12, le 9 octobre 2026. Quatre parcours inventés :
réunion d'association, support d'un tableau d'inscription, demande d'achat
fictive, sauvegarde puis lancement/reprise dans le terminal principal.
Tous les workflows ont été créés par l'interface depuis une entrée normale.
17 captures, toutes ouvertes et réellement vues. Aucun avis des autres
testeurs ni code produit lu avant ou pendant ces observations.

## Les cinq principaux constats, par priorité d'effet métier

### 1. Relier une décision juste ajoutée produit une erreur peu réparable depuis la liaison

**Gravité : majeure.** Parcours réunion.

Gestes : ajouter un bloc « Décision · Accord humain » nommé « Valider les
décisions » ; dessiner avant de configurer sa question ; ouvrir Relier, choisir
cette décision en source et le Document en destination ; créer la connexion.
Attendu : choix d'issue cohérents avec la décision, ou indication de la propriété
manquante avec un accès direct au bloc. Observé : le seul choix proposé est
« Travail terminé » ; la création affiche `edge-… : issue done inconnue`.
Sélectionner la décision puis rouvrir Relier ne répare pas le choix.

Récupération reçue : ouvrir les propriétés de la décision, saisir la question et
« Appliquer au bloc ». Le champ « Choix possibles » affichait déjà `approve` et
`reject` avant application ; ensuite ces deux valeurs sont proposées dans
Relier et la connexion fonctionne. L'affichage de valeurs initiales ne suffit
donc pas à rendre le bloc connectable. Je ne déduis pas de cause dans le code.

Effet métier : le BA qui dessine d'abord le processus rencontre une erreur de
moteur sans savoir qu'il doit sortir du dialogue et appliquer les propriétés.
Proposition : enregistrer les issues initiales lors de l'ajout ; si la question
reste à définir, donner « Configurez la question de cette décision » avec une
action vers ses propriétés. Nommer les issues « Approuver » / « Refuser ».

Preuve : [05 — erreur de liaison de décision](captures/editeur-interactions-05-decision-liaison-issue-inconnue.png).

### 2. Le dessin ne permet pas de relire les données effectivement transmises

**Gravité : modérée.** Parcours support, cœur de la compréhension entrée/action/sortie.

Gestes : déclarer la sortie texte `fiche_diagnostic` du diagnostic, l'entrée
texte `fiche` de la rédaction, puis créer leur connexion par les sélecteurs.
Attendu : pouvoir montrer au métier « cette fiche entre ici » après fermeture
du dialogue, et distinguer transport de données et simple ordre de travail.
Observé : le bloc indique seulement « 0 entrée → 1 sortie » ou « 1 entrée →
0 sortie » ; le trait reste générique. Dans « Liens entre les blocs », seule
la dépendance `Diagnostiquer le message → Rédiger la réponse (done)` apparaît.
Le mapping `fiche_diagnostic → fiche` n'est pas indiqué dans cette section.

Erreur essayée : sélectionner la sortie, laisser l'entrée destinataire vide,
créer. Une liaison d'ordre seule est créée ; le conseil « Entrée sans lien :
fiche » subsiste. Ce conseil aide à découvrir l'omission. Pour corriger, j'ai
supprimé le lien avec confirmation puis recréé la connexion complète.
Après correction, le conseil disparaît, mais les deux types de connexion
restent très semblables dans le dessin et la liste de liens.

Effet métier : la revue du flux avec un collègue exige de reconstruire les
échanges depuis les propriétés et les gestes de configuration. Proposition :
afficher `fiche_diagnostic → fiche` sur le lien ou dans sa fiche, et expliciter
« Ordre seulement » lorsqu'aucune donnée n'est transmise ; permettre de modifier
un lien existant. Si seule une moitié du mapping est choisie, demander de la
compléter ou de confirmer explicitement une dépendance d'ordre.

Preuves : [08 — sélecteurs de données](captures/editeur-interactions-08-liaison-donnees-selecteurs.png),
[09 — liaison configurée, mapping absent de la liste](captures/editeur-interactions-09-support-donnees-reliees.png).
Les valeurs sélectionnées sont consignées dans `gestes.jsonl`.

### 3. Une décision refusée porte le badge vert « Validé »

**Gravité : modérée.** Parcours achat, simulation.

Gestes : examiner la décision ; commenter « Confirmer les dimensions avant de
préparer le bon » ; cliquer « Refuser la suite ». Attendu : état visuel
« Refusée », distinguant décision traitée et autorisation accordée. Observé :
le détail affiche un badge vert « Validé », puis « Décision humaine : Refusée ».
Le refus est donc bien lisible et enregistré, mais le badge véhicule une autre
interprétation en lecture rapide.

Effet métier : dans une revue de demandes d'achat, « Validé » peut être compris
comme accord. Je n'ai pas observé d'achat ni d'autorisation externe indue ;
la première simulation comportait volontairement des blocs indépendants.
Proposition : badge « Refusée » de couleur distincte, et « Décision enregistrée »
pour dire que l'intervention humaine est terminée.

Preuve : [13 — refus enregistré et badge Validé](captures/editeur-interactions-13-refus-valide-retour-editeur.png).

### 4. La création, la sélection, le déplacement et la sauvegarde conviennent à un flux générique

**Constat positif important.** Parcours réunion et support.

Gestes : depuis l'accueil, créer un workflow simple « Sans projet » ; nommer
les blocs, saisir une consigne et des critères ; déclarer des données par
formulaire ; sélectionner un bloc, utiliser son repère « Déplacer » ; supprimer
une mauvaise liaison et la recréer ; renommer un bloc puis cliquer Enregistrer
sans cliquer préalablement Appliquer ; changer de vue et rouvrir le workflow.
Attendu : gestes accessibles et conservation fidèle. Observé : sélection
bordée, propriétés du bloc sélectionné, formulaire de type de donnée, état
« Modifications en attente », révision enregistrée ; nom, consigne, critères,
position et trois liens sont conservés. Le déplacement est passé de X60/Y80
à X106/Y293. Après l'interruption et la réouverture du même banc, le workflow
retrouvé conserve encore ces valeurs. Il n'y a pas eu de perte observée.

Effet métier : un BA peut dessiner réunion ou support sans préparer un dépôt
Odoo ni des fichiers moteur. Proposition : conserver ce parcours ; rendre
encore plus évident que Enregistrer applique aussi les propriétés en cours,
pour éviter l'impression de deux sauvegardes obligatoires.

Preuves : [02 — première étape](captures/editeur-interactions-02-premier-bloc.png),
[03 — propriétés et formulaires de données](captures/editeur-interactions-03-proprietes-entrees-sorties.png),
[06 — bloc déplacé et dessin corrigé](captures/editeur-interactions-06-dessin-corrige-deplace.png),
[07 — retour après sauvegarde](captures/editeur-interactions-07-sauvegarde-retour.png).

### 5. La simulation aide à comprendre le parcours ; le terminal conserve une demande après arrêt inerte

**Constat positif, réception d'exécution limitée.** Parcours achat puis réunion.

Gestes achat : tenter la simulation avec trois blocs sans liens ; lire les
conseils de conception ; refuser une décision ; revenir à l'éditeur ; créer
Comparaison → Décision → Document ; relancer la simulation ; valider la
comparaison, approuver la décision puis valider le document.
Observé : trois interventions indépendantes avant correction, une seule étape
active après correction, puis décision et document dans cet ordre. Les mentions
« Simulation », « Aucun modèle ni service métier appelé » et « Preuve simulée,
sans valeur de test métier réel » sont explicites. Les résultats de simulation
sont des exemples, pas une comparaison effective des offres fictives.

Gestes réunion : ouvrir le terminal principal ; vérifier les deux stubs GUI ;
depuis Exécuter, saisir une demande et cliquer Lancer dans le terminal ;
constater l'arrêt du stub Codex ; cliquer Reprendre l'agent puis Reprendre dans
ce terminal. Observé : commande injectée dans le terminal principal, marqueur
inerte visible, « Agent arrêté · progression conservée », bouton de reprise.
La reprise relance le stub dans le même terminal ; l'interface conserve une
demande et 0/4 étapes. Aucune nouvelle demande ni terminal supplémentaire
visible après reprise. Le bloc actif et son successeur restent identifiables.

Effet métier : le BA voit le prochain geste humain et peut distinguer simulation
et conversation arrêtée. Proposition : conserver ces repères ; après arrêt,
résumer aussi le motif/code d'arrêt lorsque disponible pour décider entre
réessayer et corriger le fournisseur. Ici l'arrêt 78 est volontairement celui
du banc et ne constitue pas un défaut du fournisseur ni du produit.

Preuves : [11 — conseils de conception](captures/editeur-interactions-11-achats-lancement-conception.png),
[12 — décision simulée](captures/editeur-interactions-12-simulation-decision.png),
[14 — simulation corrigée](captures/editeur-interactions-14-simulation-corrigee-un-seul-bloc.png),
[16 — terminal et agent arrêté](captures/editeur-interactions-16-terminal-agent-inerte-arrete.png),
[17 — reprise, demande conservée](captures/editeur-interactions-17-reprise-inerte-progression-conservee.png).

## Périmètre reçu et limites

Création/dessin/configuration/sélection/déplacement/liens/sauvegarde, simulation,
décision humaine et lancement/reprise GUI : observés. Retour après arrêt et
réouverture d'Electron : observé sur le même banc. Mauvais choix de workflow :
dialogue Support ouvert volontairement puis fermé ; Réunion choisie ensuite
avant lancement. Le nom du workflow reste visible derrière le dialogue,
même s'il n'est pas répété dans son titre ([15](captures/editeur-interactions-15-choix-workflow-modal-sans-nom.png)).

Non reçu : exécution IA réelle, production d'une réponse métier réelle,
questions générées par un modèle, connecteurs/services externes, achats/envois,
comportement sur workflow volumineux, dépendances complexes, zoom de grande
échelle et choix natif de dossier. Le statut terminal de la simulation après
le dernier clic de validation du document n'a pas été relu ; la progression
comparaison → décision → document et les deux premières validations ont été
observées. Aucun substitut de chooser ni fixture de
workflow Engine utilisé. Le terminal normal s'arrête avant la première étape
réalisée parce que le fournisseur est un stub. La simulation ne qualifie pas
les fournisseurs ni les résultats métier.

Les timeouts de sélecteurs Playwright ont été interceptés et les contrôles
réinspectés ; ils ne sont pas comptés comme bugs produit. L'interruption de la
conversation a fermé le contrôleur et Electron après 13 captures : reprise du
même banc et des exécutions GUI existantes, sans recommencer les parcours.
Le premier démarrage de contrôleur avait aussi été repris pour un stdin fermé,
avant les observations, avec fermeture de ses propres processus.

## Isolement, intégrité et fin

Banc `/tmp/tricorder-ux-editeur-interactions-Shc1pQ`, DISPLAY :182, HOME/XDG/
CODEX_HOME/CLAUDE_CONFIG_DIR/état/runtime isolés ; environnement en liste blanche.
Stubs `codex` et `claude` avant les exécutables système, versions et chemins
contrôlés dans le terminal GUI avant tout workflow et après reprise.
Preuve : [10 — préflight GUI](captures/editeur-interactions-10-preflight-terminal-stubs.png)
et `preflight-gui-apres-reprise.txt`.

Aucun client/secret/trousseau/compte réel, aucun JSON/SQLite d'état retouché,
aucun build/commit/fullsuite. Aucune erreur `pageerror` pendant les observations
et la reprise. Nettoyage du harness terminé, aucun processus du HOME isolé
restant, Xvfb conservé.

SHA256 final exécutable : `9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3`.
SHA256 final ASAR : `a344374116f8ada276e426dd94279450b73cee31ba46aa981ae830a1fb64f44b`.
Les deux SHA et les 50 fichiers backend correspondent au paquet figé ;
détail dans `nettoyage-et-sha.json`.

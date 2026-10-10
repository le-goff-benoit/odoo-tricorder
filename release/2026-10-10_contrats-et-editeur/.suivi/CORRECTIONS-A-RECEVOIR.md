# Réception des corrections après le panel

Build du panel figé après les 10 parcours GUI du développeur. Aucun correctif
produit pendant les parcours indépendants ; les modifications sont regroupées
puis contre-vérifiées.

| Référence | Défaut observé | Attendu | État |
|---|---|---|---|
| UI-R1 | Ouvrir le terminal ou réduire la fenêtre laisse les positions calculées pour l’ancienne largeur ; la carte active sort du viewport | Maintenir le contexte de la tâche sélectionnée et un graphe visible lors du partage terminal/suivi | Reçu par contre-épreuve ciblée |
| CONNECT-R1 | Communication dans `foreach.workflow` : précontrôle sans notifications ni problème, puis activation impossible faute d’autorisation ; une connexion requalifiée après lancement est acceptée silencieusement par l'enfant | Présenter les notifications requises avant le lancement et conserver leur périmètre autorisé, pour chaque projet | Reçu par contre-épreuve ciblée |
| UI-R2 | L'ajout d'une note peut la placer sous un lien et son étiquette | Notes et liens lisibles après ajout et déplacement | Reçu par contre-épreuve ciblée |
| UI-R3 | La même attente apparaît dans le titre, le sous-titre, le bandeau et la carte | Une synthèse principale et le détail local, sans répétition inutile | Reçu par contre-épreuve ciblée |
| UI-R4 | Le détour autour d'une note traverse les cartes source/destination ; l'intérieur d'une boucle SVG intercepte un clic sur la note | Garder les liens hors des cartes et limiter leur cible au trait ou à l'étiquette | Reçu par contre-épreuve ciblée |
| PM-1 | Le plan contient `goal`, mais le graphe affiche « Plan de cette demande » | Montrer l'objectif concret du plan produit | Reçu par contre-épreuve ciblée |
| PM-2 | En simulation sans conversation, le titre d'un enfant reprend le composant générique | Garder le titre concret de l'élément dans tous les modes | Reçu par contre-épreuve ciblée |
| PM-3 | « Validé » sur le plan produit avant accord humain | Distinguer résultat produit et décision humaine approuvée | Reçu par contre-épreuve ciblée |
| SUPPORT-1 | Les données courtes reçues par une question de confirmation restent repliées | Montrer le constat que l'utilisateur doit confirmer | Reçu par contre-épreuve ciblée |
| SUPPORT-2 | Un lien incompatible demande de sélectionner des ports déjà choisis | Expliquer l'incompatibilité précise et la réparation | Reçu par contre-épreuve ciblée |
| SUPPORT-3 | Une condition booléenne expose `true`/`false` au métier | Proposer et afficher Oui/Non en conservant les valeurs techniques | Reçu par contre-épreuve ciblée |
| MEETING-1 | Les résultats des enfants sont cachés sous « Structure détaillée » en JSON | Lire le titre et le contenu de chaque livrable sans ouvrir de données techniques | Reçu par contre-épreuve ciblée |
| MEETING-2 | Un brouillon facultatif après résultat est présenté comme notification de question | Nommer l'action et son déclencheur réels | Reçu par contre-épreuve ciblée |
| MEETING-3 | Les clés françaises responsable/échéance produisent des cellules « Non renseigné » | Reconnaître les noms usuels, conserver les valeurs originales | Reçu par contre-épreuve ciblée |
| MEETING-4 | Erreur de contrat exposée comme `text/string` | Décrire le résultat manquant et la suite possible, garder le diagnostic exact accessible | Reçu par contre-épreuve ciblée |
| PROGRAMME-1 | Aucun retour parent depuis un enfant ouvert directement dans Projets/Activité | Utiliser la filiation durable ; garder le terminal | Corrigé ; contre-épreuve GUI verte |
| PROGRAMME-2 | Activité compte le parent et ses tâches comme des demandes indépendantes | Distinguer demandes principales et tâches rattachées | Reçu par contre-épreuve ciblée |
| PROGRAMME-3 | Projets et dépendances du plan apparaissent comme identifiants | Noms de projets et de tâches dans la lecture métier | Reçu par contre-épreuve ciblée |
| CONNECT-R2 | Notification d’un enfant d’action facultative encore réservable après suspension du principal | Vérifier toute la filiation avant réservation et avant effet | Reçu par contre-épreuves indépendantes |
| ERGO-1 | Tableau projet illisible dans le panneau étroit | Présenter les lignes en cartes avec contexte et actions lisibles | Reçu par contre-épreuve ciblée |
| ERGO-2 | Ajuster recentre seulement la sélection | Montrer l’ensemble du graphe ; garder le contexte lors des redimensionnements | Reçu par contre-épreuve ciblée |
| TECH-1 | Critères de plan difficiles à configurer et erreur de contrôle sans titre métier | Aide au champ et diagnostic identifiant le bloc | Corrigé ; parcours technique vert |
| LONG-1 | Une demande volumineuse archivée fait échouer le titre ; remplacement et résultats peuvent afficher un objet brut | Titre lisible, récupération intégrale avant remplacement et ancienne demande inchangée | Reçu par contre-épreuves indépendantes source et GUI |
| REPLACE-1 | Créer un remplacement laisse l’utilisateur devant l’ancienne demande bloquée, sans accusé | Ouvrir la nouvelle demande et confirmer sa création, en conservant l’ancienne | Reçu par contre-épreuve GUI indépendante |
| SAVE-1 | Ctrl+S est ignoré lorsque le focus est dans un champ de configuration | Enregistrer depuis le champ et vérifier le graphe persisté, sans intercepter le terminal | Contre-épreuve ciblée verte |
| FOCUS-1 | L’ajout de bloc focalise la carte alors que ses propriétés sont ouvertes | Placer le focus dans son titre lorsque le formulaire est visible | Contre-épreuve ciblée verte |
| QUESTION-1 | L’aperçu des données reçues repousse la réponse hors écran | Garder le constat court lisible et les sources, la réponse et son bouton dans la fenêtre | Contre-épreuve ciblée verte à 1024 × 768 et en disposition verticale |

## Preuves

UI-R1 : [réception UI indépendante](review-ui-independante.md), parcours distinct
du banc développeur, capture large et à 1100 px. Le terminal reste bien conservé.

CONNECT-R1 : `AssociatedActionTests.connect()` prépare un adaptateur synthétique
local qualifié ; un bloc foreach contient son workflow de communication.
`workflow.validate` retourne `notifications=[]` et `issues=[]`, puis
`iterations.activate` refuse « Autoriser explicitement les notifications de cette
révision avant activation ». Aucun appel d’envoi n’a eu lieu. Vérifier aussi
qu’une connexion modifiée après le lancement ne bénéficie pas silencieusement
de l’autorisation de la révision précédente, y compris entre projets.

Contre-épreuve supplémentaire du responsable : parent lancé avec autorisation,
connexion synthétique modifiée et requalifiée, puis activation. Le parent n'a
capturé aucun transport ; l'enfant accepte la nouvelle empreinte. Défaut confirmé,
sans aucun appel d'envoi de l'adaptateur.

Les six profils ont remis leurs rapports. Les résultats lisibles et les critères
techniques partagent les mêmes corrections pour les profils réunion et tech lead.
Les rapports et captures initiaux sont conservés dans `panel-utilisateurs/preuves/`.

CONNECT-R1 et CONNECT-R2 sont reçus dans la
[revue indépendante des corrections moteur](review-corrections-moteur.md) : huit
tests de notifications, neuf de projections et neuf scénarios indépendants verts.
La [réception UI indépendante](review-ui-corrections.md) lève les réserves de
cadrage, de routage et de sélection des liens autour des notes. Le
[rapport développeur](RECEPTION-CORRECTIONS-UI.md) couvre 25 parcours GUI distincts
et conserve les erreurs intermédiaires des bancs ainsi que les vrais défauts.
Les profils réunion et tech lead sont aussi rejoués : cinq tests verts, avec
résultats directement lisibles et résultat principal conservé après échec facultatif.

La réception complète source et paquet est consignée dans
[la réception finale](reception-finale.md). Les contre-épreuves ciblées ci-dessus
ne sont pas présentées comme une qualification des fournisseurs ou des comptes
externes.

## Second panel produit

Les six personas supplémentaires et les corrections de saisie, shells, reprises
et dépendances sont consignés dans [la synthèse produit](panel-produit/SYNTHESE.md)
et reçus dans [la revue indépendante](REVIEW-PANEL-PRODUIT.md). La contre-épreuve
des deux intentions identiques et le diagnostic de sauvegarde non reproduit
restent consultables [avec leurs résultats initiaux](panel-produit/corrections/contre-epreuve-finale/README.md).

La recette globale a ensuite reproduit un affichage terminal resté sur un ancien
contenu après réouverture compacte. Les commandes arrivaient bien au PTY.
[Diagnostic et qualification de la correction](panel-produit/corrections/terminal-mise-en-page/README.md).

Le retour à la conversation est aussi contrôlé avec une commande en cours et
un agent arrêté. Les journaux interrompus et la réception du candidat sont
conservés dans [le diagnostic terminal](panel-produit/corrections/terminal-etat-frais/README.md).

Le banc de récupération d’un accusé perdu couvre désormais les deux ordres de
rafraîchissement. [Contre-épreuve indépendante sur paquet](panel-produit/corrections/collection-ack-race/RECEPTION-INDEPENDANTE.md).

La présentation d’Activité conserve maintenant l’action native et le titre
de l’étape. [Diagnostic](panel-produit/corrections/activite-action/README.md) et
[réception indépendante](panel-produit/corrections/activity-reprise/RECEPTION-INDEPENDANTE.md).

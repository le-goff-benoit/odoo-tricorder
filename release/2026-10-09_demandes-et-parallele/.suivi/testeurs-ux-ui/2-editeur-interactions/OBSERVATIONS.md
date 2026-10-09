# Journal des observations UX2

Les faits ci-dessous viennent de gestes GUI, de l'interface inspectée et des
captures ouvertes. Les hypothèses du PLAN ne sont pas des constats reçus.

## Parcours 1 — réunion

- Accueil : Créer un workflow accessible, modèles génériques et « Sans projet ».
- Workflow simple créé par GUI avec une Première étape de type Tâche.
- Propriétés : nom, consigne, critères, formulaires Ajouter une entrée/sortie.
- Déclaration notes/notes_preparees, trois blocs supplémentaires ajoutés :
  synthèse IA, décision humaine, document. Aucun fichier workflow importé.
- Mauvais lien Document → Notes créé volontairement, retrouvé sous Liens,
  retiré avec confirmation ; bonnes dépendances dessinées ensuite.
- Décision ajoutée puis reliée avant configuration : seule issue done,
  validation « issue done inconnue ». Fermer/réouvrir depuis la décision
  sélectionnée ne suffit pas. Question saisie et Appliquer répare ; les
  defaults approve/reject deviennent disponibles dans Relier.
- Repère Déplacer visible sur sélection ; déplacement Notes de 60/80 à
  106/293. Compteurs 4 blocs, 3 liens. Liaison de décision annotée approve.

## Parcours 2 — support

- Workflow simple GUI, diagnostic avec consigne de fixture fictive et sortie
  fiche_diagnostic ; rédaction avec consigne et entrée fiche.
- Relier permet choisir source/destination/sortie/entrée. Changement source
  actualise bien les sorties dans ce cas ; ne pas généraliser le défaut de
  décision en défaut de tous les sélecteurs.
- Choisir seulement la sortie et créer fait une dépendance sans mapping ;
  avertissement entrée sans lien subsiste. Suppression puis recréation avec
  fiche_diagnostic→fiche enlève l'avertissement. Liste du lien : uniquement
  diagnostic→rédaction (done), pas le mapping.

## Parcours 3 — achats

- Trois blocs GUI : comparaison, décision, document. Premier essai volontaire
  sans liens : conseils précis pour les trois blocs indépendants, non bloquants.
- Préflight terminal GUI avant tout lancement : chemins des deux stubs et
  marqueur TRICORDER-UX-INERT contrôlés.
- Simulation montre trois attentes humaines, dont décision. Question affichée,
  commentaire saisi et Refuser. Décision enregistrée : badge vert Validé et
  texte « Décision humaine : Refusée ». Aucun achat réel.
- Retour éditeur depuis Options, ajout des deux liens et contenu fictif du
  brouillon Document ; révision3. Second lancement simulation réussi avant
  interruption. Reprise retrouve sa demande depuis Activité.
- Sur révision3, une seule attente (comparaison) puis décision après validation,
  document après approbation, validation finale déclenchée. Résultats exemples
  SIMULATION et preuves sans valeur métier annoncés explicitement.

## Parcours 4 — sauvegarde, retour, terminal

- Renommer Notes puis Enregistrer sans Appliquer : révision2 et modifications
  conservées au retour ; noms, 3 liens, position 106/293 reçus.
- Après interruption, retrouver Réunion GUI confirme également consigne et
  critères conservés. Electron contrôleur absent, seul mon broker était vivant ;
  relance du même banc/candidat, pas de reconstruction des données.
- Préflight GUI répété parce qu'Electron a été relancé ; stubs corrects.
- Mauvais workflow Support ouvert pour lancement, fermé sans lancement ;
  retour catalogue, Réunion choisie. Nom visible dans l'éditeur derrière modal.
- Demande fictive saisie dans Exécuter, Lancer dans le terminal : nouveau terminal
  conversation, stub Codex imprime marqueur puis s'arrête ; progression conservée,
  une demande, premier bloc et son successeur visibles, 0/4.
- Reprendre agent puis confirmation dans même terminal : deuxième commande de
  lancement inerte, même demande/terminal visible, 0/4 conservé. Aucune exécution
  IA métier validée. Pas de question réelle générée par un modèle.

## Références de preuve

Captures 01–17 dans captures/, toutes vues. `gestes.jsonl` consigne les commandes
d'interaction ; `preflight-gui-apres-reprise.txt`, `terminal-reprise-texte.txt`
conservent les textes GUI. `nettoyage-et-sha.json` confirme fermeture des propres
processus et intégrité du candidat. Cinq constats priorisés dans RAPPORT.md.

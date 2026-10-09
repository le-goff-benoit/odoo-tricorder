# Panel final — neuf profils d’utilisateurs

Les neuf avis sont reçus : **27 parcours**, sur le même paquet rc12, ASAR
`71a054e6137a4fb424320954836109bd67ef2b74cb8f71ad3e49af35bb047dd7`.
Les testeurs sont des agents GPT-6.1 Sol, raisonnement high, aux missions distinctes.
Cette campagne n’est pas une étude auprès de personnes humaines.

## Parcours et portée

| Profil | Niveau | Parcours reçus et limites principales |
|---|---|---|
| [Direction](1-direction/RAPPORT.md) | Faible | Réunion, décision refusée/approuvée, résultats et réemploi. Travail simulé. |
| [Support](2-support/RAPPORT.md) | Faible à intermédiaire | Ticket, clarification, reprise et compte rendu. Fixtures déclarées pour les réponses d’agent. |
| [Cheffe de projet](3-projets/RAPPORT.md) | Intermédiaire | Copie entre projets, demandes et dépendances transversales, reprise. Pas de résultats d’IA réels. |
| [Business analyst](4-analyste/RAPPORT.md) | Intermédiaire | Création, données/branches, correction puis modèle réutilisé. Deux chemins simulés reçus. |
| [Développeuse](5-developpement/RAPPORT.md) | Élevé | Continuité shell, changement de fournisseur futur, définition et reprise/question. CLI inertes. |
| [Exploitation](6-exploitation/RAPPORT.md) | Élevé | Planification, version/remplacement/récupération, notification. Aucun déclenchement périodique ou envoi qualifié. |
| [Responsable d’équipe](7-equipe/RAPPORT.md) | Faible | Portefeuille, accord ciblé, échec/reprise/bilan. Résultats de collègues préparés par le moteur. |
| [Intégration](8-integration/RAPPORT.md) | Intermédiaire | Modèle, export/import, redémarrage et indépendance des copies. Sélecteur natif de dossier reçu partiellement. |
| [Clavier/petit écran](9-clavier/RAPPORT.md) | Intermédiaire | Création I/O, question/réceptions/décision, recherche de résultat à 125 %. Fixtures déclarées. |

Les captures ont été ouvertes par leurs auteurs ; le responsable a aussi examiné
les captures établissant les problèmes de décision, de pied de carte et de
bifurcation. Chaque banc a été nettoyé et son paquet recontrôlé. Les erreurs de
pilotage, un arrêt volontaire du fournisseur inerte et les hypothèses non
reproduites restent séparés des défauts produit.

## Décisions de correction

| Observation recoupée | Décision et critère de réception |
|---|---|
| Terminal masqué pour la développeuse, réaffiché contre le choix du responsable | Conserver la visibilité choisie pendant la navigation, qu’elle soit visible ou masquée ; garder le même PTY. |
| Onglets longs et contexte entre projets peu saillant | Borner les onglets, rendre leur nom complet accessible, signaler les deux projets lorsqu’ils diffèrent. Aucun changement implicite de dossier. |
| Question/décision sous un long contenu | Pied d’actions accessible, demande et portée de l’accord visibles ; contenu et commentaire défilants, saisie conservée. |
| Commentaire requis peu annoncé et focus après ajout | Rendre le caractère obligatoire explicite ; viser la nouvelle fiche après ajout. Ne pas retirer une validation du moteur pour rendre un test vert. |
| Demande déjà saisie, message invitant à la répéter | Accuser réception pendant l’ouverture du suivi ; ne pas prétendre qu’un agent arrêté travaille. |
| Reprise trop technique | Explication métier puis détails de session ; avertissement sur l’effacement de la ligne conservé. Distinguer reprise de l’agent et reprise de la demande. |
| Carte suivi trop étroite, liens/branches superposés | Disposition et labels lisibles avec branches/rejoins ; aucun pied hors carte. |
| Dessin initial en ligne masque une bifurcation | Action explicite de réorganisation, annulable, sans retoucher le dessin enregistré à son ouverture. |
| Corriger un lien peu découvrable | Contrôle de sélection/correction du lien accessible, données transmises préservées. |
| Entrée de premier bloc sans lien | Expliquer la différence entre contexte de demande et entrée alimentée par un lien ; aucune alimentation automatique inventée. |
| Essai urgent repris dans un nouveau modèle | Conservation des exemples fictifs proposée explicitement ; retrait par défaut à la réutilisation. |
| Deux menus Options | Planifier dans Options du workflow ; fonctions du dessin dans Éditeur. |
| Remplacement de planification repart aux défauts | Reprendre fréquence/fuseau/jours ; nouvelle activation et autorisations restent distinctes. |
| Fréquence invisible après activation | Règle lisible sur la carte et l’instantané. |
| Capacité « facultative » alors qu’exigée | Libellé adapté au bloc Communication. Connexion vérifiée et autorisation restent nécessaires. |
| Fichier de définition difficile à retrouver | Montrer le chemin du fichier effectivement reconnu dans le dépôt. |
| Sélecteur natif dossier partiel | Permettre la saisie du chemin, validée par le moteur. Ne pas annoncer une réparation du sélecteur sans reproduction. |
| Vocabulaire Réunion/Minutes/transcript | Réunion, transcription, compte rendu dans les vues métier ; IDs et ports techniques conservés. |
| Support sans critères utiles | Décrire la qualité attendue ; la validation technique ne prétend toujours pas attester ces critères métier. |
| 6/6 dont quatre branches exclues | Distinguer étapes traitées et non applicables. Un refus n’est pas décrit comme une réussite métier. |
| Consolidation récente avant une ancienne question | Classer par action possible avant pagination ; questions/décisions, reprises et prérequis avant dépendances automatiques. |
| Total global placé au-dessus d’un sous-ensemble | Total du portefeuille dans l’en-tête ; nombre réellement affiché dans chaque section. |
| Ajout de demande dans Options uniquement | Action visible dans la vue d’ensemble. |
| Simulations portant le même titre | Date/heure visible dans Activité pour distinguer leurs occurrences. |

Les corrections et leurs réceptions sont conservées dans
[`../corrections-panel/`](../corrections-panel/). La fin de la campagne d’avis ne
vaut pas encore validation du paquet corrigé : tests et relecture restent une
étape distincte de la livraison.

## Choix et limites conservés

- **Priorité métier et échéance** : le tri aide à trouver une action possible ;
  il n’infère pas une urgence depuis le texte et n’ajoute pas de priorité structurée.
- **Vue complète et texte lisible** : réorganiser/ajuster est explicite. Réduire
  automatiquement neuf blocs à une taille illisible n’est pas retenu.
- **Import et reprise de conception** : renommage immédiat à l’import et raccourci
  du dernier dessin restent des améliorations ultérieures. Le renommage via les
  paramètres et la reprise depuis le projet sont reçus.
- **Sélecteur de dossier** : le profil 8 a utilisé Return dans le champ de chemin,
  sans sélectionner une ligne ni activer Open. Les sélecteurs de fichier Save/Open
  ont réussi. La cause de l’essai dossier reste indéterminée.
- **Intégrations** : l’adaptateur local reste nécessaire pour les opérations
  autonomes. Ce panel ne qualifie ni OAuth universel, ni compte distant, ni envoi.
- **Release parallèle** : contrat parent/demandes, approbation commune, intégration
  des candidats et QA commune restent les limites de l’[analyse](../../ANALYSE.md).
  Les simulations et ces corrections ergonomiques ne les résolvent pas.

Les anciennes exécutions clientes, leurs résultats et décisions n’ont pas été
modifiés par cette campagne. Les nouvelles définitions n’entraînent aucune
migration silencieuse d’une exécution ou d’une planification existante.

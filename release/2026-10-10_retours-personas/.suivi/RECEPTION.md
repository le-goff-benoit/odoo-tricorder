# Réception après revue spécialisée

Le mandat vise les hésitations réelles d’utilisation, pas uniquement des assertions
vertes. Six agents distincts jouent les personas habituels. Chacun choisit ses
premiers clics dans Electron, accomplit deux intentions et rédige ses constats
avant de consulter les rapports des autres. Ce dispositif reste une simulation
d’utilisateurs, avec fixtures et fournisseurs inertes explicitement déclarés.

## Avant la revue spécialisée

Les retours rc.14 sur les liaisons, les notifications, les titres, les modèles,
le lancement local et la récupération du livrable ont été implémentés. Trois
contre-épreuves ciblées restent disponibles dans [consultant](consultant/),
[produit](produit/report.md) et [sceptique](sceptique/report.md). Une vraie commande
a révélé l’absence de preuve dans la décision finale : le panneau la présente
désormais avant la décision.

## Revue du spécialiste

| Constat | Décision et correction | Réception |
|---|---|---|
| E1 : la règle reçoit Canal choisi mais compare encore choice | Liste des informations/paramètres, sélection de la première entrée si défaut de création, avertissement de source absente | Email actif et ticket ignoré en GUI ; paramètre explicite préservé en test |
| E2 : choix naturels refusés comme IDs | Libellés séparés et clés stables ; liens conservés au renommage, branches liées non supprimées silencieusement | Choix français sauvegardés, renommés et utilisés ; legacy reçu par persona 3 |
| E3 : tâche guidée avec validation implicite | Validation visible, explication des pauses ; même type par défaut à la création et à l’ajout | Question puis accord final sans revue intermédiaire quand contrôle de structure choisi |
| E4 : nouveau workflow ancien format | Nouveaux workflows structurés, entrée héritant le contrat de sortie ; ancien format expliqué sans migration | Donnée requise visible, présence cohérente dans les contre-épreuves |
| E5 : paramètres uniquement JSON | Liste de valeurs fixes simples, ajout/retrait sans JSON, données complexes en avancé | Test GUI création de paramètre puis choix dans une règle |
| E6 : choix de type et accents | Aide sur acteur/effet de chaque type ajoutée ; conservation des accents de noms de données différée | Aucun blocage lié aux accents ; limite documentée |

[Rapport complet](expert/rapport.md) · [contre-épreuves](expert/reception.md).

## Nouveau passage des six personas

Candidat initial du panel : [empreintes](candidat-panel.json).

| Persona | Deux intentions | Rapport |
|---|---|---|
| Fondateur SaaS/services | Suivi multi-client et réponse ; plusieurs réunions puis historique/livrable | [01](panel-final/01-fondateur/rapport.md) |
| Chef d’équipe services | Ticket Odoo explicitement ciblé ; impact/destination manquants puis email retrouvé/copié | [02](panel-final/02-services/rapport.md) |
| Développeur sceptique | Commande réelle en échec puis reprise ; renommage legacy et branche correcte | [03](panel-final/03-sceptique/rapport.md) |
| Opérations PME | Procédure question/travail/accord ; paramètre fixe et règle email/ticket | [04](panel-final/04-operations/rapport.md) |
| Produit B2B | Synthèse finale et actions ; évolution d’un modèle avec données/critères | [05](panel-final/05-produit/rapport.md) |
| Consultant multi-client | Deux adaptations indépendantes ; demande/résultat/historique et retour aux modèles | [06](panel-final/06-consultant/rapport.md) |

## Corrections issues de ce nouveau passage

- **Produit : synthèse personnalisée masquée par actions.** Toutes les sorties
  finales métier sont désormais présentées, textes avant les listes ; une clé
  personnalisée n’est plus écartée au profit des noms connus. La copie reprend
  exactement le texte affiché. Les contributions techniques déjà représentées par
  les résultats par élément ne dupliquent pas cette présentation.
- **Sceptique : documents locaux prêts mais lancement réel caché.** Un workflow
  composé de décisions et de documents dont les contenus sont déjà renseignés,
  sans adaptateur, propose directement son exécution locale. Les documents à
  produire dans une conversation et les connexions conservent leur mode.
- **Opérations : approve/reject encore visibles à la création.** L’éditeur propose
  Approuver la suite / Refuser la suite dès le départ, sans changer les clés ni le
  sens des autorisations existantes.
- **Fondateur : liste dense, portée multi-réunions découverte tardivement.** La
  liste de lancement regroupe workflows complets et blocs à composer ; elle
  affiche la description du modèle choisi, donc la prise en charge de plusieurs
  réunions avant de passer au formulaire suivant.

- **Consultant : adaptation client et copie de modèle ambiguës.** La bibliothèque explique les deux parcours.
- **Opérations : enregistrement sans projet et aide de règle ambigus.** Le libellé Workflows enregistrés inclut les deux cas ; l’aide explique aussi les paramètres fixes.

Les rapports du candidat initial restent inchangés. Contre-épreuves reçues :
[fondateur](panel-final/01-fondateur/addendum-b.md),
[sceptique](panel-final/03-sceptique/addendum-contre-epreuve.md),
[opérations](panel-final/04-operations/contre-epreuve.md),
[produit](panel-final/05-produit/contre-epreuve/rapport.md) et
[consultant](panel-final/06-consultant/reception-aide/rapport.md).

## Limites de l’adoption

Les parcours de suivi et de récupération sont reçus dans leur périmètre observé.
L’autonomie métier d’une IA, la collecte Meeting Minutes, Gmail/Odoo/Slack, OAuth,
et les adaptateurs distants ne sont pas qualifiés par ces essais. Le formulaire
support reste libre : sa description et les questions du workflow guident la
qualification, mais il ne devient pas un formulaire métier complet.
Les commandes ont réellement tourné dans des projets temporaires isolés.
Les rapports distinguent les erreurs de sélecteur du pilote des défauts vécus
dans l’application. Aucun état du moteur n’a été modifié pour forcer un résultat.

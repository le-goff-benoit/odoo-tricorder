# Panel final 3/6 — responsable de réunion

Avis : les deux parcours aboutissent et le résultat principal résiste à l’échec du brouillon facultatif. Réserve P1 sur la lecture des résultats par élément : les engagements sont retrouvables, mais leur texte demande d’ouvrir une structure JSON. Le critère « retrouver le résultat sans vocabulaire interne » n’est donc pas entièrement reçu.

## Cadre et preuves

- 10 octobre 2026 ; profil métier, responsable d’un comité de quartier fictif.
- Application Electron, écran dédié `:190`, fenêtre 1440 × 1000. Produit et build laissés figés ; aucun fichier produit modifié, aucun build ni commit.
- Base Git `0a4dd888fedbf3a1859a08af3285816cbba0de55` ; manifeste `0.6.0-rc.12`, avec les changements de réception présents dans le workspace figé. Le SHA de base seul ne désigne pas le candidat complet.
- Banc rejouable : [panel-v2-user-3.spec.cjs](../../../../tests/panel-v2-user-3.spec.cjs), compatible `TRICORDER_EXECUTABLE` pour un rejeu empaqueté.
- Commande : `DISPLAY=:190 XAUTHORITY=/tmp/tricorder-collections-panel/190/Xauthority python3 /tmp/tricorder-ci-target-source-run.py --config=/tmp/tricorder-collections-panel/user-3.config.cjs`.
- Dernier passage : **2 tests réussis, 22,6 s**. Les assertions vérifient les états du moteur et les contenus affichés, pas seulement les clics.
- HOME, état Tricorder et CLI Codex/Claude temporaires. Le shell a vérifié les exécutables inertes ; aucun fournisseur commercial, compte client ou service externe utilisé. Nettoyage des seuls brokers du banc.
- Captures réelles de l’application, inspectées avec `view_image`, notamment configuration facultative, dessin sauvegardé, document local, résultat principal, contrat de liste, graphe des livrables, échec et contenu JSON.

Les projets ont été fournis comme fixtures par `project.create`. Les deux workflows ont été créés depuis les **formulaires GUI**. Les comptes rendus et plans IA sont des fixtures remises par les commandes publiques `Engine.start`, `claim` et `submit`, sans modification de SQLite/JSON. Dans le deuxième parcours, le travail IA enfant est remplacé dans la définition d’exécution fictive par une question ; les deux réponses sont réellement saisies en GUI. La fixture volontairement erronée de brouillon est créée via `workflow.save`, puis choisie dans le formulaire de configuration.

Le premier parcours exécute réellement un document **local**, dont le contenu a été saisi à la main. Le second est une simulation. Ces essais ne qualifient ni un modèle IA ni une messagerie. Une demande naturelle traitée par un agent dans le terminal n’a pas été éprouvée.

## Parcours 1 — compte rendu et brouillon facultatif

| Étapes réalisées | Attendu | Observé et preuve |
|---|---|---|
| Workflows → Créer un workflow → modèle « Clôture de réunion » ; nom et projet fictif saisis | Disposer d’un parcours de réunion personnalisable | Le workflow est créé et ouvert. Conversion explicite des données structurées, renommage des blocs et modification de la consigne depuis les formulaires. |
| Retirer le bloc obligatoire « Préparer l’email de suivi » | Clore le résultat principal avant le brouillon | Le dialogue annonce le bloc et ses liens supprimés. Le dessin sauvegardé contient deux blocs et le lien compte rendu/actions. [Dessin](preuves/03-reunion/01-03-workflow-reunion-adapte.png). |
| Sur la validation, ajouter « Préparer un brouillon de suivi », choisir « Un document à préparer », saisir le contenu ; ajouter une note | Configurer un complément indépendant avec une activation ultérieure | Formulaire clair sur l’absence d’envoi automatique et la distinction document/brouillon distant/envoi. Note enregistrée avec « sans effet sur l’exécution ». [Configuration](preuves/03-reunion/02-02-configuration-brouillon-facultatif.png). |
| Fixture Engine de compte rendu → Examiner la décision → Approuver la suite | Lire la décision, l’action, le nom et la date avant l’accord | Le compte rendu est visible et le principal devient `completed`. « Voir les résultats » le retrouve dans une fenêtre dédiée. |
| Actions facultatives → Activer cette action → Examiner l’action → Détail → Valider le résultat | Relire un document local sans envoyer de message ni rouvrir le principal | Le texte « Bonjour… » s’affiche, avec « Brouillon préparé. Aucune publication externe ». Le bouton de validation est accessible en bas. [Document local](preuves/03-reunion/03-06-brouillon-local-a-relire.png). |
| Revenir au parent, rouvrir le suivi depuis le projet, Voir les résultats | Retrouver le compte rendu après le complément | Principal toujours terminé ; action facultative terminée. Résultat retrouvé avec tableau et texte. [Résultat retrouvé](preuves/03-reunion/04-07-resultat-retrouve-apres-brouillon.png). |

Le contenu du brouillon est fixe et saisi dans le formulaire ; cet essai n’atteste pas qu’un brouillon IA se construit automatiquement à partir du résultat principal. Un premier essai simulé montrait volontairement un exemple générique au lieu de ce texte ; le parcours local non simulé a ensuite vérifié le document réellement configuré.

## Parcours 2 — plusieurs sujets, un plan et un échec facultatif

| Étapes réalisées | Attendu | Observé et preuve |
|---|---|---|
| Créer depuis « Intentions, plan et travaux », renommer les blocs ; modifier la sortie de recueil via « Modifier une donnée » | Adapter le modèle à dix sujets maximum sans éditer du JSON | Champs « Liste », « Donnée requise », « Objet structuré », minimum 1 et maximum 10. Contrat enregistré par le formulaire. [Liste typée](preuves/03-reunion/05-08a-liste-sujets-typee-limitee.png). |
| Sur la réception finale, ajouter une action facultative et choisir le workflow de brouillon erroné fourni comme fixture | Préparer une contre-épreuve indépendante | Le modèle est choisi par son nom dans le formulaire ; aucun fichier JSON saisi par l’utilisateur. |
| Recueillir deux sujets dans Détail → Confirmer la liste et continuer | Confirmer le recueil sans approuver implicitement le plan | Deux intentions gardées. Le formulaire annonce que le plan sera validé séparément. [Recueil](preuves/03-reunion/06-08-deux-sujets-confirmation-distincte.png). |
| Fixture de plan unique → Examiner la décision → Approuver → Lancer les éléments | Voir les livrables réels et la prochaine intervention | Le graphe nomme « Compte rendu de la réunion » et « Engagements et prochaines dates », affiche deux réponses attendues et zéro exécutant actif. Il n’invente pas de travail IA. [Graphe](preuves/03-reunion/07-09-plan-et-livrables-sur-graphe.png). |
| Ouvrir chaque livrable depuis sa carte, saisir la réponse, revenir au parent ; approuver la réception | Conserver le contexte et recevoir tous les résultats | Deux retours au parent fonctionnent. Le détail de réception contient les noms et échéances fournis. Le principal devient `completed`. |
| Activer le brouillon erroné, puis examiner son échec | Échec visible sans perdre le compte rendu | Action en échec, principal toujours terminé (5/5). « Examiner l’action » ouvre sa cause et « Préparer la reprise ». [Indépendance](preuves/03-reunion/08-11-principal-termine-brouillon-en-echec.png), [échec et suite](preuves/03-reunion/09-12-erreur-brouillon-et-prochaine-action.png). |
| Revenir, rouvrir le suivi depuis le projet → Voir les résultats → ouvrir Structure détaillée | Lire directement les engagements reçus | Résultats conservés, mais le texte « Léa… ; Marc… » se lit sous la clé JSON `answer` après dépliage. [Avant dépliage](preuves/03-reunion/10-13-resultat-retrouve-malgre-echec.png), [texte sous JSON](preuves/03-reunion/11-14-engagements-accessibles-sous-json.png). |

## Écarts et recommandations métier

| Niveau | Constat reproduit | Recommandation concrète |
|---|---|---|
| **P1** | « Voir les résultats » d’un traitement par élément affiche `Results`, `Id`, `Project`, `Run`, `Sorties`, `Confirm`, puis cache le contenu dans « Structure détaillée ». Pour lire les engagements il faut déplier du JSON. Les données sont conservées ; le parcours de lecture métier est insuffisant. Preuves 13 et 14. | Présenter chaque livrable avec son **titre, son texte reçu et son état**. Réserver identifiants et structure aux détails techniques. Le contenu des réponses/résultats enfants doit se lire sans connaître `answer` ni le nom du bloc enfant. |
| **P2** | Un brouillon déclenché par un résultat accepté affiche « Notification liée à une question ». Reproduit sur le vrai document local et sur l’action en échec. Preuves 06 et 12. | Afficher « Action facultative : Préparer un brouillon de suivi » et « Revenir au résultat principal », en respectant le déclencheur réellement choisi. |
| **P2** | Les objets d’action valides portant les clés françaises `responsable` et `échéance` montrent « Non renseigné » dans les colonnes correspondantes, puis Léa et la date dans « Autres informations ». Contrat de liste non contraint sur ces clés. Preuve 07. | Reconnaître les libellés français usuels ou proposer une forme de résultat explicite au créateur. Éviter d’afficher une absence alors que la valeur est présente et affichée ailleurs. |
| **P2** | Cause d’échec « Sortie text absente ou incompatible avec le type string ». L’utilisateur sait qu’il faut une reprise, mais pas ce qu’il doit corriger en langage métier. Preuve 12. | Dire d’abord « Le brouillon n’a pas fourni un texte lisible. Demandez une nouvelle version. » Conserver le détail `text/string` dans les données techniques. |
| P0 | Aucun constat. | — |

Réception mécanique : **oui** pour création, adaptation, recueil, plan unique, tâches nommées, retours, brouillon local et indépendance de l’échec facultatif. Réception métier complète : **réserve sur P1**. Aucun problème produit n’a été corrigé ou contourné silencieusement pour obtenir les deux tests verts.

## Limites et reprises du banc

Le banc automatisé a été ajusté pour attendre la fin des sauvegardes et l’effacement du champ après ajout d’une intention, puis pour vérifier le contenu dans la fenêtre modale de résultats. Ces ajustements corrigent des synchronisations/locators de test. La dernière répétition répondait au critère supplémentaire « lire effectivement le texte du livrable enfant », qui a confirmé le P1. Aucune reprise ciblée de l’action en échec, fermeture/redémarrage complet, création de lien par geste, déplacement ou fournisseur IA réel n’est qualifié par ce rapport.

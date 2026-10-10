# Contre-épreuve — consultant multi-client

10 octobre 2026, candidat figé `/tmp/tricorder-personas-rc15`. Deux intentions réalisées dans la GUI Electron, sans lecture du code applicatif ni modification de l'application. Verdict : **adoption autonome sur ces parcours locaux**, avec deux frictions mineures ci-dessous. Le script final termine avec `CONSULTANT RC15 PASS`.

## 1. Lancer le suivi hebdomadaire Atlas puis passer au client suivant

Je commence par Workflows → Modèles. « Workflows complets » et « Blocs à composer » me permettent enfin de distinguer un parcours prêt à lancer d'une pièce pour construire le mien. J'essaie le filtre : six blocs à composer, quatorze workflows complets. Le texte d'introduction et les badges utilisent les mêmes mots.

Je choisis « Utiliser » sur Clôture de réunion : une nouvelle demande s'ouvre, avec ce modèle déjà sélectionné. Je choisis Atlas conseil, puis Continuer. Je peux saisir un titre court « Atlas — suivi S41 », une demande de plusieurs lignes et les notes de deux réunions. Le titre court est bien celui de l'en-tête du suivi et de l'onglet terminal ; il ne transforme pas toute ma consigne en titre.

La demande complète inclut l'exclusion de la réunion interne Boréal et les notes indiquant de ne rien envoyer. Une lecture complémentaire `run.get` confirme la conservation de ces fins de texte, au-delà de l'aperçu tronqué de `run.list`. Aucun texte de la demande n'a été supprimé pour raccourcir son titre.

Je clique sur Retour à la liste : la bibliothèque reprend toute la place. Le bouton Terminal garde son compteur 1. Je le rouvre et retrouve l'onglet Atlas. Une lecture de la liste des terminaux avant et après retour confirme le même identifiant, le même PID et `alive: true`. Je peux donc passer à Boréal sans arrêter le travail Atlas ni garder un grand panneau qui gêne la navigation.

**Friction mineure P3.** Le filtre « Workflows complets » revient à « Tous les modèles » après ce retour. Il faut refaire un choix pour retrouver exactement ma liste précédente. Preuve : 06-retour-sans-terminal.

## 2. Adapter la formation Boréal et préparer les notifications sans perdre ma saisie

Depuis la bibliothèque, je crée une adaptation de Demande ponctuelle dans Boréal formation. Je vais dans Paramètres du workflow et modifie le nom et la description, sans encore cliquer sur Appliquer. Le bouton « Configurer une notification… » se trouve auprès de « Me prévenir avec » : je n'ai plus à deviner où commencer.

Le bouton ouvre une aide intitulée « Configurer une connexion », contextualisée sur Boréal formation. Le texte dit qu'un adaptateur local est nécessaire et que la déclaration ne signifie pas « connecté ». Il propose une consigne à copier, un accès au terminal existant et « Revenir aux paramètres ». Je comprends qu'une notification email n'est pas déjà opérationnelle.

Je reviens aux paramètres : le nom « Formation Boréal — session octobre » et toute ma description sont toujours présents. Je clique Appliquer ; le nouveau nom apparaît dans l'éditeur. Le détour n'a pas consommé mon brouillon et je ne dois rien ressaisir.

**Limite métier explicite.** L'accès à la configuration est amélioré, mais connecter un email reste une opération accompagnée via adaptateur et terminal. Cette contre-épreuve ne valide aucun envoi ni service externe.

**Friction mineure P3.** Les cartes proposent à la fois « Créer une adaptation… » et « Personnaliser une copie… ». Ces deux formulations restent proches pour mon intention de modifier le parcours d'un client. Je choisis l'adaptation parce que je veux l'affecter à Boréal, mais je ne sais pas d'emblée ce qui distingue les deux options.

## Preuves et périmètre

- `harness.cjs` : script autonome rejouable, sans reconstruction du candidat partagé.
- `01-modeles` et `01b-blocs` : distinction et filtre de bibliothèque.
- `02-demande` à `05-terminal` : demande, titre court et terminal.
- `06-retour-sans-terminal`, `07-terminal-retrouve` : restitution de place et réouverture.
- `08-parametres-boreal` à `11-boreal-modifie` : configuration contextuelle, brouillon conservé, application.
- `run-detail.json` : demande complète et notes conservées ; données entièrement synthétiques.
- `terminals-before.json`, `terminals-after.json` : session vivante inchangée.
- `result.json` : sept contrôles réussis.

Les projets sont créés par la commande validée `project.create`. Les lancements, saisies et navigations sont réalisés par clics dans l'interface. Le fournisseur est un exécutable local inerte qui affiche une bannière et garde un processus vivant ; aucun vrai modèle n'analyse les réunions. Il s'agit d'une réception d'usage par agent persona et de mécanismes locaux, pas d'une étude humaine ni d'une qualification fournisseur. Aucun résultat métier IA ni email n'a été produit. Aucun état moteur n'a été réécrit directement.

Reproduction depuis le dépôt :

```sh
node release/2026-10-10_retours-personas/.suivi/consultant/harness.cjs
```

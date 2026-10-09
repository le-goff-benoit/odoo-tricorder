# Avis indépendant — chargé de support

Verdict : je peux enregistrer un ticket, répondre à une précision et reprendre après arrêt sans recréer la demande. Le suivi et le rapport permettent de retrouver les faits. Pour un utilisateur peu technique, le graphe et certains mots de reprise ajoutent une difficulté évitable. Aucun défaut bloquant établi sur ces gestes.

Paquet 0.6.0-rc.12, lancement normal, display 182, HOME/XDG/fournisseurs/état isolés par harness. Précontrôle effectué dans le terminal réel avant lancement : les deux chemins pointent vers `/tmp/tricorder-panel-support-EUvVGH/stubs/` et les versions portent TRICORDER-PANEL-INERT. Une seule fenêtre, aucune erreur renderer observée. Aucun client, compte, clé, réseau ou service réel utilisé. Code produit et avis des autres non lus.

## Trois parcours

| Intention | Gestes réellement effectués | Attendu / observé | Verdict et conséquence |
|---|---|---|---|
| Choisir Support et enregistrer CAT-42, catalogue PDF impossible à télécharger | Accueil → Nouvelle demande → Support — diagnostic et suite → Sans projet → Enregistrer et continuer. Saisie du ticket dans la boîte de lancement, puis Lancer dans le terminal avec Codex par défaut. | Workflow adapté et conservé, demande initiale visible dans le suivi. Le fournisseur inerte quitte ensuite ; aucun diagnostic réel n'est produit. | Réussi pour choix, enregistrement et lancement. Le ticket complet se retrouve dans le rapport malgré son titre abrégé. Limite du banc pour traitement IA. Captures 01–04. |
| Répondre à l'impact, puis distinguer constat et correction | Après une question de fixture, clic Répondre à la question. Saisie « une seule personne », consultation web possible, aucune interruption générale ; clic Répondre. Après résultats de fixture, Voir le rapport et défilement jusqu'au brouillon. | Réponse conservée dans les précisions du bloc et le rapport ; champs Constat, Suite proposée, Criticité et Brouillon distincts. Le rapport dit explicitement que les contrôles sont techniques et qu'aucun critère métier n'est attesté. | Réussi pour la réponse GUI et la consultation. Partiel pour le parcours métier : question et résultats préparés par fixture, pas par IA. Aucune correction, aucun message ni livraison réalisés. Captures 06–08. |
| Reprendre après un arrêt sans perdre CAT-42 | Fournisseur inerte arrêté ; clic Reprendre l’agent… → lecture du dialogue → Reprendre dans ce terminal. | Nouvelle tentative dans le même onglet de conversation ; un seul ticket et même identifiant de conversation, puis nouvel arrêt inerte attendu. | Réussi pour le geste de reprise et la conservation ; capacité réelle d'un fournisseur à reprendre sa session non reçue. Captures 04–05 et état-final.json. |

## Constats priorisés

1. **P2 — friction de compréhension : « 6 / 6 étapes » peut se lire comme six travaux réalisés.** Le suivi indique ce total une fois les deux blocs de la branche normale validés ; les quatre autres sont « Non applicable » dans le rapport. Cela reste une fin correcte du parcours choisi, mais pour répondre à un client je dois ouvrir le rapport pour voir ce qui a réellement été fait. Préférer un décompte explicite des étapes réalisées et non applicables. Preuves : état-final.json, rapport-ecran.txt et capture 07.
2. **P2 — bug visuel de lisibilité du graphe dans le suivi partagé avec le terminal.** À 1440×1000, des labels de branches se superposent (« Critique · 2 données », « Normale · 2 données »), les boîtes inférieures dépassent du cadre et le contenu de certaines cartes déborde horizontalement. Les barres de défilement existent ; le détail textuel est lisible. Le chargé de support ne voit cependant pas simplement la branche normale en regardant la vue initiale. Preuve : capture 04 ; capture 06 montre le détail utilisable.
3. **P3 — friction de langage dans la reprise.** Le bouton est clair, mais le dialogue demande de comprendre « prompt du shell », « session fournisseur », « dépendance » et « demandes suspendues ». Je dois savoir reconnaître moi-même un terminal au repos. Une formulation principale centrée sur « votre demande et vos résultats sont conservés » et une explication technique secondaire aideraient ce profil. Preuve : capture 05. La reprise elle-même fonctionne dans le banc.
4. **P3 — manque de critère métier prérempli pour le modèle Support.** Toutes les lignes du rapport affichent « À préciser » dans Critères. Les distinctions constat/brouillon sont présentes, mais aucun critère simple tel que « impact confirmé et réponse préparée » ne guide ma réception. Preuve : capture 07. Ce n'est pas une validation métier prétendument obtenue : le rapport annonce ses limites.

## Points réussis

- Le point d'entrée Nouvelle demande est immédiatement visible, avec le choix Support dans les modèles ; aucun projet ou pack Odoo requis.
- La clarification présente la question et un champ de réponse directement accessibles, sans commande à apprendre.
- L'arrêt est annoncé avec « progression conservée » et une action de reprise explicite. Un seul ticket reste enregistré.
- Le rapport conserve demande complète, question, réponse, constat et brouillon ; il distingue validation technique et preuve métier. La mention « Aucun correctif » provient de la fixture, pas d'une preuve de travail réel.

## Limites et preuves

Les seules commandes qui ont fait progresser artificiellement le moteur sont `claim`, `ask`, puis `claim`/`result` sur `diagnosis` et `normal`, dans l'état isolé, via le pont validé du paquet. La question et tous les résultats comportent « Fixture ». La réponse à la clarification, le choix et lancement du workflow, la reprise et la consultation du rapport sont des gestes GUI réels. Aucune modification SQL/JSON d'état. `fixture-cli.jsonl` contient les appels exacts ; l'état moteur peut afficher `simulation:false` car il s'agit d'une fixture de commandes validées, ce qui ne la transforme pas en preuve d'IA réelle.

Scripts : `parcours.cjs` pilote le harness ; `gestes.json` conserve chaque action exécutée pour reprise du script interactif. Preuves complémentaires : `precontrole-terminal.txt`, `etat-final.json`, `rapport-ecran.txt`, `support-preparation.json`, `support-execution.json` et `nettoyage.json`.

Huit captures ouvertes et inspectées individuellement : accueil, choix Support, ticket avant lancement, arrêt et suivi, reprise, clarification saisie, rapport initial, brouillon et limites. Rendu exploitable ; anomalie du graphe décrite ci-dessus.

## Nettoyage

`cleanup()` a été exécuté et a vérifié le backend empaqueté ainsi que les empreintes du candidat. Fermeture Electron et brokers effectuée. Vérification OS : aucun processus du banc EUvVGH, du premier lancement préliminaire vNkJur, du PID Electron 1194851 ou du pilote ne reste ; seuls la commande de contrôle et son rg apparaissaient. Les deux empreintes finales correspondent au manifeste : exécutable `9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3`, ASAR `71a054e6137a4fb424320954836109bd67ef2b74cb8f71ad3e49af35bb047dd7`. Dossiers temporaires laissés comme preuves isolées, aucun processus actif. Aucun build, installation, commit ou modification produit.

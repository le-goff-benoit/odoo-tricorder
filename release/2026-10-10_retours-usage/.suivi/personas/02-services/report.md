# Persona 02 — chef d’équipe services

Candidat testé : `/tmp/tricorder-usage-candidate-a`, 10 octobre 2026, fenêtre 1440 × 1000. Deux demandes parcourues dans la vraie GUI Electron. Aucun code applicatif lu pour trouver les parcours ; aucun autre rapport persona consulté.

**Verdict : adoption accompagnée pour préparer les réponses ; pas encore autonome pour un chef d’équipe qui arrive sans connaître l’éditeur.** Le suivi et les questions deviennent réellement compréhensibles. L’entrée « Utiliser » reste un détour de conception et le rapport réintroduit des termes que le parcours a justement clarifiés.

## Périmètre et limites

HOME, PATH, configurations et état isolés sous `/tmp/tricorder-usage-services`, dont `TRICORDER_WORKFLOW_STATE_DIR` explicite. Fournisseurs locaux inertes. Les deux exécutions utilisent le bouton visible **Simuler le parcours**. Pour essayer la branche d’impact inconnu, j’ai configuré les données de simulation dans l’éditeur via la GUI : `severity = unknown`, constat synthétique. Aucun état SQLite/JSON retouché, aucun modèle IA, Gmail ou Odoo réel appelé. Ces essais prouvent navigation, lisibilité, branchements simulés, questions humaines et conservation des réponses ; pas la qualité du diagnostic ni celle d’un email réel.

Les latences courtes observées après clic ont demandé d’attendre le rafraîchissement ; je ne les transforme pas en défaut. Les erreurs de sélecteur du pilote (fermeture de dialogue, application des données de simulation avant fermeture de leur dialogue) sont des erreurs d’automatisation, pas des erreurs imputées à l’utilisateur. Une lecture initiale de `body.innerText` omettait le contenu dans le composant encapsulé ; les captures et rôles accessibles ont corrigé cette méthode.

## Parcours 1 — Atlas, texte pour ticket Odoo

Attente : depuis Workflows trouver le modèle support, expliquer un PDF vide et recevoir un texte pour ticket, en distinguant bug supposé et urgence.

Premier clic : **Workflows → Modèles → Utiliser** sur « Support — diagnostic et réponse ». La description dit bien distinguer nature et urgence et n’envoyer aucun message. Je comprends le modèle et choisis le bon sans aide.

Hésitation immédiate : « Utiliser » ouvre **Créer un workflow**, demande un nom, mentionne `.tricorder/workflows/` et Git, puis ouvre l’éditeur de huit blocs. « Je voulais traiter un client, est-ce que je dois maintenant concevoir un outil ? » Je nomme ma copie « Support Atlas — ticket Odoo », puis trouve **Exécuter…**. Conséquence : détour et crainte d’avoir multiplié les modèles. Contournement trouvé au deuxième parcours : passer directement par **Nouvelle demande**.

Lecture du bloc d’analyse : les noms « Analyser la demande et son urgence », « Sans urgence établie », « Constat » et « Suite proposée » permettent de comprendre le circuit. La consigne distingue explicitement bug et urgence. Mais elle expose encore `severity`, `critical`, `normal`, `unknown` ; un chef d’équipe qui personnalise doit comprendre ce vocabulaire technique.

Demande saisie : « Client Atlas : bug suspecté, export PDF vide. Je ne sais pas combien de personnes sont bloquées. Préciser impact puis préparer une réponse à coller dans un ticket Odoo. Aucun envoi. » En simulation standard, le jeu d’essai passe directement par la branche sans urgence établie. **Cela ne démontre pas que l’IA ignorerait l’impact inconnu** : la simulation suit sa valeur configurée `normal`, pas le sens de ma demande.

L’attente présente clairement la question de destination et un bouton **Répondre à cette question**. Je peux répondre dans le champ, sans terminal ni choix approve/reject. Réponse : ticket Odoo, ton factuel, une personne touchée, contournement Excel. La simulation reprend seule et se termine.

Je quitte pour **Workflows**, puis **Historique** : le travail est retrouvé, **Terminée**, durée totale **16 s · attentes comprises**. Je retrouve les résultats et ma réponse. Aucun « reprendre » trompeur. Les exemples sont explicitement identifiés comme simulation. Preuves : captures 01 à 04.

## Parcours 2 — Boréal, impact à préciser puis texte d’email

Attente : réutiliser le support sans créer volontairement un nouveau modèle ; laisser une question en attente, revenir et récupérer le résultat.

Premier clic : **Nouvelle demande → Support — diagnostic et réponse → Continuer**. La liste propose les modèles lisibles. Le dialogue explique que chaque exécution garde ses résultats et que les modifications ultérieures ne changent pas le passé. Cette entrée est plus directe que « Utiliser ».

Préparation annoncée de l’essai : fermeture du lancement, choix du premier bloc, **Données de simulation…**, valeur `unknown`, application et enregistrement. Cette manipulation sert exclusivement à visiter la branche manquante ; elle n’est pas présentée comme une obligation métier.

Demande : bug PDF suspecté, impact inconnu, texte de brouillon email Gmail sans envoi. La question **Préciser ce qui est bloqué** demande concrètement qui est touché, quoi, depuis quand, contournement et échéance. « Je sais répondre à ça. » Aucune approbation binaire inadaptée. Je précise une personne, depuis ce matin, export Excel possible, pas d’échéance cette semaine.

Le parcours reprend seul, réévalue l’urgence puis attend le format. Je sors vers **Workflows** : la demande apparaît dans **En cours**, **Réponse attendue**, avec l’étape « Choisir où préparer la réponse ». Je la rouvre et retrouve directement la question avec un champ. C’est une vraie amélioration pour un responsable interrompu pendant son travail.

Je réponds : email pour Camille chez Boréal, ton rassurant et factuel, objet explicite, texte pour mon brouillon Gmail sans envoi. La simulation termine automatiquement. Les résultats conservent cette réponse et la réévaluation **Sans urgence établie**. L’historique affiche les deux demandes distinctes, 40 s et 16 s, terminées. Preuves : captures 05 à 09 et textes visibles joints.

## Retours d’usage priorisés

| Priorité | Observation et question utilisateur | Conséquence | Amélioration attendue |
| --- | --- | --- | --- |
| P1 | **Utiliser** un modèle me demande de créer un workflow puis m’envoie dans l’éditeur. « Pourquoi dois-je nommer/configurer pour répondre à mon client ? » | Abandon possible ou multiplication de copies à chaque demande. | Aligner Utiliser sur Nouvelle demande ; réserver création/éditeur à Personnaliser une copie. |
| P2 | Destination demandée alors que j’ai déjà dit ticket Odoo ou email dans ma demande. | Interruption ressentie comme répétitive. La simulation ne permet pas de juger si le fournisseur pourrait répondre à ma place. | Reprendre la destination connue et ne poser la question que si elle manque ; demander destinataire/ton seulement si utile. |
| P2 | Le rapport final appelle l’urgence « Criticité : Normale » alors que le suivi dit « Niveau d’urgence : Sans urgence établie ». Il contient aussi « Response ». | « Normal, c’est donc pas un bug ? » revient en partageant le rapport. | Employer les mêmes libellés métier dans suivi, résultats et rapport ; traduire Response en Réponse préparée. |
| P2 | Pour personnaliser le bloc d’analyse, la consigne montre `severity`, `normal`, `critical`, `unknown` et les valeurs de branchement. | L’édition reste un exercice technique malgré des cartes nettement meilleures. | Montrer des critères éditables en français, identifiants techniques en avancé. |
| P3 | Dans Résultats, le bandeau « Résultats validés » est suivi de « Compte rendu » pour les tâches de réponse ; 3 résultats seulement puis rapport complet. | « Où est le texte que je dois copier ? Pourquoi une réponse humaine apparaît comme résultat principal ? » | Mettre le livrable final et une action Copier au premier plan, détails d’étapes ensuite. La qualité du texte réel reste non testée. |
| P3 | Le rapport support contient des paragraphes génériques sur diff, code, déploiement et livraison. | Le chef d’équipe cherche son échange client au milieu de considérations étrangères. | Adapter le rapport aux blocs effectivement exécutés et au résultat recherché. |

Je peux maintenant repérer une attente, donner les faits demandés, quitter et retrouver une exécution terminée avec sa durée. Je n’utiliserais pas encore l’éditeur seul pour construire ce support de zéro. La création effective d’un brouillon Gmail n’est pas proposée dans ces parcours : l’interface annonce honnêtement du texte à reprendre, mais le besoin initial d’embrayer sur un vrai brouillon reste une étape ultérieure à qualifier.

## Preuves

- `shots/01-support-editor.png` : modèle de huit blocs, vocabulaire des branches.
- `shots/02-odoo-attente.png` : attente utilisateur visible.
- `shots/03-odoo-historique.png` et `04-odoo-resultats.png` : retour et résultats.
- `shots/05-email-impact.png` : question d’impact concrète et réponse libre.
- `shots/06-email-retrouver-attente.png` : retrouver l’attente depuis Workflows.
- `shots/07-email-resultats.png`, `08-email-rapport.png`, `09-two-runs-history.png` : résultats, rapport, deux durées.
- `report-visible.txt` : libellés effectivement visibles dans le rapport complet.
- `trace.zip` : trace Playwright des interactions GUI ; `driver.cjs`, `send.py` : pilote de test ; `env.json` : environnement isolé sans secrets.

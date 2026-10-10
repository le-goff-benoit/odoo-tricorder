# Contre-épreuve du candidat corrigé

Candidat indépendant : `/tmp/tricorder-expert-fixed`, 10 octobre 2026. Les observations initiales restent dans `rapport.md` ; les nouvelles preuves sont dans `fixed/`. Aucune application reconstruite ou modifiée par l’auditeur.

| Point | Contre-épreuve GUI | Résultat |
|---|---|---|
| E1, source de règle | Recréation intégrale question → règle → deux questions, avec nom « Canal choisi ». L’unique entrée est sélectionnée automatiquement. Réponse email. | **Reçu.** Email attend une réponse, ticket est ignoré. `fixed/21-regle-source`, `26-branche-selectionnee`, `branch-states.json`. |
| E1, source manquante | Règle nouvellement créée avant ajout d’une information. | **Reçu.** Avertissement « Information à comparer absente » et « choice · source à configurer ». `fixed/20-regle-vierge`. |
| E2, choix naturels | Création Email client / Ticket Odoo, enregistrement, raccordement des branches par leurs libellés. | **Reçu.** Aucune clé technique saisie. `fixed/81-choix-enregistres`, `82-liaison-*`. |
| E2, renommage et utilisation | Renommer en Écrire au client / Répondre dans Odoo, conserver les liaisons, simuler puis cliquer Écrire au client. | **Reçu sur nouvelles décisions.** IDs Email_client/Ticket_Odoo inchangés, boutons français, bonne branche active et autre ignorée. `fixed/choices-before.json`, `choices-after.json`, `84-choix-runtime`, `85-branche-runtime`, `choice-states.json`. |
| E3, validation explicitement choisie | Workflow vierge → question → tâche guidée en contrôle de structure → accord final. | **Reçu.** Le réglage est accessible dans les propriétés avec l’explication des doubles validations. Après réponse à la question, aucune revue intermédiaire, accord final puis résultat. `fixed/80-tache-nouvelle`, `14-apres-reponse` à `17-resultat`. |
| E4, données structurées | Créer un workflow sans conversion ; créer/raccorder une donnée. | **Reçu.** Définition schema 2, entrée reçue obligatoire cohérente avec source, réglages de présence disponibles. `fixed/choices-before.json`, `fixed/21-regle-source`. |

Scripts de contre-épreuve : `branches-fixed.js`, `choices-fixed.js`, `create-fixed.js`. Les JSON lus vérifient les définitions produites par les formulaires et ne modifient aucun état moteur. Les tâches de ces parcours sont simulées ; cela qualifie les contrôles et branchements, pas la qualité de l’IA.

Un cas de compatibilité supplémentaire est transmis au responsable : le renommage de choix hérités approve/reject déjà reliés, sans option_labels. Reproduit aussi dans la GUI : « Un choix supprimé possède encore une liaison. Retirez cette liaison avant de retirer le choix. » (`fixed/legacy/86-legacy-renommage`, `legacy-alert.json`, script `legacy-fixed.js`). La première correction refuse donc ce renommage des anciennes branches ; elle ne les recâble pas silencieusement. Le responsable a annoncé la préservation des clés reliées et le maintien des choix d’autorisation des opérations externes. Cette correction supplémentaire, l’accessibilité du libellé Validation du résultat, les paramètres fixes simples et l’aide au choix du type de bloc appartiennent au candidat suivant ; ils ne sont pas prétendus reçus par les captures ci-dessus.

**Avis : les deux défauts P1 initiaux sont corrigés sur les parcours reproduits. Le candidat peut passer à la réception indépendante des six personas après intégration du cas de compatibilité annoncé.** La poursuite doit conserver les preuves et la distinction simulation/exécution réelle. Les limites externes du rapport initial restent valables.

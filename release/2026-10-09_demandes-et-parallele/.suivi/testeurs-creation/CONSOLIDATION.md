# Création et configuration — consolidation

Cinq missions indépendantes GPT-6.1 Sol high, profils principalement métier. Le paquet testé reste figé par `paquet.json`. Les cinq rapports sont reçus : vingt parcours explorés, avec des réceptions partielles et des limites explicites. Aucun taux de réussite global n’est calculé à partir d’un simple lancement de fournisseur inerte.

## Défauts confirmés et corrections

| Constat | Action | Réception à ce stade |
|---|---|---|
| C3-01 : sorties typées absentes en simulation des nouveaux blocs | Exemples automatiques typés, valeurs explicites préservées ; édition des valeurs dans l’interface | Moteur : 7 tests ciblés réussis (avec routage ci-dessous). GUI : valeur false → branche normale et décision en attente reçues |
| C3-02 : booléen valide incompatible avec branches true/false | Traduction explicite des seuls booléens vers ces deux identifiants ; aucun changement des valeurs d’entrée ni coercition des nombres/textes | Deux branches reçues, décision humaine conservée ; cas négatifs refusés |
| C3-04 : rejet IPC transformé en erreur native EPIPE après fermeture du lecteur de logs | Protection ciblée stdout/stderr au démarrage Electron ; autres erreurs toujours levées | Ancien paquet rouge avec stack native identique, source verte ; 2 contrôles Node et 1 GUI |
| C2-02 : suppression d’un producteur sans aide sur entrée devenue non reliée | Avertissements de conception non bloquants, accès au bloc ; annoncer les liens retirés | Suppression, avertissement, réparation et persistance reçus en GUI ; racines indépendantes toujours autorisées |
| C2-01 : copie d’un modèle intégré indiscernable | Action de personnalisation explicite, nom distinct et provenance | Reçu sur sources par contre-épreuve GUI |
| C2-03 : enregistrement à la navigation non annoncé | Harmoniser le bandeau avec l’auto-enregistrement existant | Reçu sur sources par contre-épreuve GUI |
| C1/C3 : réglages QA logiciel omniprésents, outils et liens confondus | Réglages logiciels repliés, vocabulaire des connexions séparé, condition expliquée | Reçu sur sources par contre-épreuve GUI |

## Réceptions complémentaires

- Testeur 4 : fournisseur OpenAI/Anthropic configurable sans perte de consigne ni de ports ; rôle facultatif sans pack. Adaptateur local déclaré puis qualifié, notification avec accusé, question imprévue injectée par contrat moteur et décision prévue effectivement traitées en GUI. Les questions ne sont pas attribuées à une IA réelle.
- Testeur 5 : sauvegarde et retour après redémarrage, export/import, copies indépendantes entre projets et première validation simulée reçus. Décision finale, toutes les branches et commande autonome donnée à une IA réelle non reçues.
- C4 : le statut des CLI installées sans preuve de connexion devient explicite. Une réponse fournisseur mal formée reçoit un diagnostic lisible, sans laisser avancer la décision aval. Le relecteur a ajouté puis reçu les formes JSON invalides structurellement.
- C5 : aperçu d’import lisible, JSON technique secondaire. Après arrêt fournisseur, suivi explicite et reprise volontaire ; huit recettes d’interactions reçues, même terminal/PID et demandes conservées.

Les corrections ont passé **339 tests Python et 122 JavaScript** avant le dernier renforcement des formes de réponses fournisseur ; ce renforcement a ensuite passé son test à huit variantes et neuf tests runtime, plus la contre-épreuve indépendante. Sept GUI de création, huit GUI d’interactions et le contrôle GUI EPIPE sont reçus sur sources. Le paquet suivant doit reprendre ces changements et leurs contrôles ciblés avant la campagne UX.

La [relecture indépendante](../corrections-creation/review-moteur.md) clôt son P2 fournisseur ; aucun défaut bloquant restant dans son périmètre. Elle ne constitue pas une recette d’un fournisseur réel ou du paquet final.

## Limites conservées

- Une consigne ou une question vide facultative n’est pas transformée en bug de champ obligatoire. Un brouillon reste enregistrable.
- La comparaison numérique arbitraire, l’attribution à plusieurs utilisateurs et la désignation d’une sortie métier finale obligatoire ne sont pas des capacités démontrées par ces essais.
- Les départs sans suite peuvent être intentionnels. Aucune règle générale n’interdit toutes les branches terminales.
- La création, la persistance et le lancement de conversation ne qualifient pas le travail réel d’une IA. Les transitions exercées avec un événement moteur synthétique sont identifiées comme telles.
- L’incident EPIPE provient ici de la fermeture du lecteur de logs par le banc ; c’est une fragilité réelle du logger, sans preuve que tout signalement utilisateur ait cette même cause.

Les rapports indépendants conservent leurs verdicts d’origine ; les contre-épreuves sont séparées dans `../corrections-creation/`.

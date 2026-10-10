# Persona 2 — Chef d’équipe services

Candidat observé : `/tmp/tricorder-panel-final`, version 0.6.0-rc.15, 10 octobre 2026. Agent jouant le persona ; aucune observation d’autres personas consultée. Deux intentions ciblées dans une vraie fenêtre Electron sur `DISPLAY=:93`, viewport 1440 × 1000.

**Verdict : j’adopterais le suivi et la récupération des réponses pour une expérimentation interne. Aucun blocage d’interface constaté. La justesse du diagnostic, le respect sémantique du canal et l’autonomie du fournisseur restent à qualifier avec une IA réelle.**

## Intention 1 — Qualifier sans confondre bug et urgence

Je veux traiter une demande Atlas : liste supplémentaire souhaitée dans Odoo pour demain ; trois gestionnaires utilisent un export manuel, rien n’est bloqué et aucune fonction existante ne dysfonctionne. La réponse est déjà destinée au ticket Odoo #482. J’attends que l’urgence du délai ne devienne pas une preuve de bug, et que le canal ne me soit pas redemandé.

Mon premier clic est **Nouvelle demande** sur l’accueil. Dans la liste, **Support — diagnostic et réponse** est le choix évident pour ce ticket. Je conserve Sans projet : utile pour essayer sans créer un faux dossier client. Le formulaire demande un titre facultatif et un texte libre. Je fournis les faits, le délai et le canal dans ce texte ; puis je simule.

Le suivi montre des issues lisibles **Urgent / Sans urgence établie / À préciser**. Il n’assimile pas visuellement « pas urgent » à « pas de bug ». La destination est une étape qui reprend les informations et non une décision systématiquement réclamée. Le parcours simulé arrive aux résultats sans redemander la destination. **Voir les résultats** présente immédiatement un **Livrable final**, un **Brouillon** et **Copier le texte**. Je comprends ce qui sera repris et que rien n’a été envoyé.

Le résultat d’exemple parle cependant d’un défaut générique et d’une destination fictive : la simulation indique explicitement qu’elle ne lit pas la demande. Je ne déduis donc aucune compréhension réelle de ma demande Atlas de cette réussite. Le graphe exporté ensuite indique bien des instructions séparant nature et urgence et réutilisant un canal explicite ; c’est une observation de configuration, pas une qualification IA.

Preuves : `01-nouvelle-demande.png`, `02-formulaire-support.png`, `03-support-simulation.png`, `04-support-resultat.png`, `support-run.json`.

## Intention 2 — Compléter les faits et retrouver un email

Je reprends une demande Boreal dont l’impact et la destination sont absents. La fixture utilise exactement le graphe Support exporté au premier parcours ; le moteur est piloté en conversation simulée. `Engine.start`, `claim`, `submit` et `ask` préparent les situations, sans modifier l’état directement. Les réponses et le texte final sont synthétiques. Les deux réponses humaines passent réellement par les formulaires de l’interface.

Dans **Workflows**, une seule carte En cours indique **Réponse attendue — Préciser ce qui est bloqué**. J’ouvre cette demande. La question est visible en haut ; **Répondre à la question** mène au formulaire Détail. Elle demande qui est touché, quelle tâche est bloquée, depuis quand, le contournement et l’échéance. La phrase autorisant des points « à préciser » est pertinente : je peux répondre honnêtement sans inventer des informations.

Je saisis qu’un utilisateur est touché depuis le matin, avec export manuel disponible, sans échéance proche, et un défaut à reproduire. Le suivi conserve la réponse. L’étape destination pose ensuite **Souhaitez-vous un texte pour un email ou pour un ticket Odoo ?** ; je demande un email avec objet et corps, ton factuel. Comme Détail était déjà ouvert, le formulaire est directement disponible à mon retour : pas de clic superflu.

Après achèvement synthétique, je quitte le suivi. **Workflows → Historique** affiche Boreal et Atlas avec leurs titres propres et leur durée. J’ouvre Boreal puis **Voir les résultats**. L’email avec objet et corps est le premier contenu, les résultats intermédiaires restent repliés. **Copier le texte** restitue exactement le texte du résultat du moteur. Je n’ai ni recherché un identifiant technique, ni fouillé le journal pour retrouver la réponse.

Preuves : `05-liste-attente.png`, `06-clarification-impact.png`, `06b-formulaire-reponse.png`, `07-reponse-impact.png`, `08-destination-manquante.png`, `08b-reponse-destination.png`, `09-historique.png`, `10-email-retrouve.png`, `texte-copie.txt`, `second-run.json`, `verifications.json`.

## Hésitations et coût

- **Formulaire initial très générique.** Il ne rappelle ni l’impact à décrire ni le canal attendu ; je dois penser à les écrire. Le titre Support m’aide à choisir, mais une phrase d’aide sur les faits, le blocage et la destination réduirait les clarifications évitables. Conséquence faible : compléter le texte ou répondre ensuite aux questions. Le scénario contrôlé montre que ces questions sont exploitables ; il ne prouve pas qu’un modèle réel les déclenchera.
- **Vocabulaire de lancement technique.** « Lancer dans le terminal » et l’option d’exécution automatique demandent davantage de compréhension que le suivi métier. Je n’ai testé que la simulation ; je ne peux pas évaluer l’effort réel du premier lancement auprès d’une équipe services.
- **Graphe dense, mais intervention accessible.** Huit blocs et leurs branches occupent beaucoup de place ; la question et le bouton principal en haut me permettent d’agir sans lire tout le graphe. Pas de contournement métier ni abandon.

## Limites et rejouabilité

Exécuter depuis le dépôt :

```sh
node release/2026-10-10_retours-personas/.suivi/panel-final/02-services/parcours.cjs
```

Le script crée HOME, XDG, état et fournisseurs inertes dans un dossier temporaire puis ferme Electron et supprime cet environnement. Aucun secret, projet client ou service externe utilisé ; aucun appel IA payant, email ni ticket envoyé. Le presse-papiers Electron est intercepté pour vérifier la valeur exacte sans écrire dans le presse-papiers de l’utilisateur. Les vérifications confirment : exécution terminée, clarification conservée, réponse email conservée, copie exacte et simulation déclarée.

Reprises du pilote distinguées des constats produit : attente initiale d’un heading absent (le titre global ne l’est pas), lecture initiale du body ne traversant pas le Shadow DOM, tentative de saisir avant d’ouvrir Détail, tentative de cliquer le bouton de réponse alors que Détail était déjà ouvert, et lancement trop rapide de la fixture après une réponse asynchrone. Les captures ont guidé les corrections du script. Ces erreurs ne sont pas comptées comme défauts de Tricorder. Le script final a terminé les deux parcours ; les captures finales et exports proviennent de ce passage.

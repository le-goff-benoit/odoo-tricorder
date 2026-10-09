# Avis indépendant 5 — lisibilité, ergonomie et pilotage

Test du 9 octobre 2026. Profil : responsable de livraison / chef de projet métier, métier 9/10, technique 2/10. Je veux expliquer à une équipe ce qui se passe, ce qui reste à faire et quelle décision prendre, sans lire les logs. App générique, demande ponctuelle et support inclus. Aucun autre rapport lu avant les constats. Aucun correctif produit, build ou suite globale.

**Avis : réception avec réserves pour le pilotage générique ; parcours de simulation du support rouge.** Activité, états, actions de validation et rapport donnent une base utilisable. Le démarrage sans projet, le passage de conception au terminal et la configuration des connexions demandent encore une connaissance du fonctionnement interne. Sur petit écran, le travail est faisable au clavier et avec défilement, mais l’espace disponible exige beaucoup d’ajustements.

## Banc et preuve

- Paquet normal `build-artifacts/linux-unpacked/odoo-tricorder`, `0.6.0-rc.12`, sans flag de vue. ASAR vérifié : `10b5f192d643fc9f33cffdf3f238bcd24cbf4f69dc5ba77bab7be92cff253237`.
- Playwright Electron, `DISPLAY=:185`, viewport explicite 1280×900 puis 1024×768 ; zoom Electron 125 % (viewport CSS observé 819×614). Thèmes clair et sombre ; retour à 1280×900 à 100 % pour largeur.
- Racine synthétique `/tmp/tricorder-functional-lisibilite-state-Xiy3dW`. HOME, XDG, TRICORDER, CODEX_HOME, CLAUDE_CONFIG_DIR isolés. PATH strict vers son `bin`, `/usr/bin`, `/bin`. Variables fournisseurs et secrets retirées sans lecture ni impression des valeurs.
- Stubs existants copiés avant l’ouverture. `command -v codex`, `command -v claude` et marqueur `CREATION_CONFIG_INERT_PROVIDER` vérifiés avant lancement. Runtime neuf. Aucun fournisseur commercial, service réel, secret, client, publication ou production.
- Harness exclusif : `/tmp/tricorder-functional-lisibilite-harness.cjs`. Interface observée avant diagnostic code. Les locators traversent le shadow DOM ; les contenus cachés des panneaux repliés ne sont pas comptés comme des défauts visuels.
- API employée seulement **après** les parcours, en lecture (`run.list`, `run.get`) pour conserver la définition et les états : [liste](api-run-list.json), [support rouge](support-simulation-etat.json), [simulation terminée](generic-simulation-etat-final.json). Aucune fixture d’état injectée, aucun JSON/SQLite retouché. [Erreurs renderer](pageerrors.json) : aucune.
- Un premier lancement de harness sans TTY n’avait pas de stdin interactif : fermé avant les parcours, puis runtime neuf. Limite du banc, sans constat produit associé.

## Les cinq parcours inventés

### 1. Reprendre un compte rendu depuis l’accueil et retrouver l’action à faire

**Attendu.** En arrivant sans dépôt, pouvoir lancer une demande métier et retrouver sa prochaine étape à partir de la navigation globale.

**Étapes.** Ouvrir normalement avec HOME vide ; lire accueil/sidebar ; cliquer Activité ; Nouvelle demande ; conserver Demande ponctuelle / Sans projet ; Enregistrer et continuer ; saisir « Préparer le compte rendu de la réunion du comité : trois décisions et deux questions à valider. » ; Lancer dans le terminal ; revenir à Activité ; ouvrir la carte.

**Observé.** L’entrée normale affiche « Aucun projet sélectionné » et des onglets Statut/Terminal/Demandes/Plan/Mémoire/Express/Temps sans travail disponible. Le centre conseille de choisir un projet absent ; la barre supérieure conseille Paramètres ; la sidebar conseille Projets ou un workflow global. L’action Nouvelle demande apparaît après clic sur Activité. Une fois la demande créée, sa carte porte son vrai titre, son état Prête et la prochaine étape. Son ouverture retrouve la conversation du workflow affiché. Le fournisseur n’est qu’un stub ; l’absence d’avancement du travail réel est attendue et n’est pas un échec produit.

**Décision.** Parcours réalisable. **UX moyenne (LP-01)** : démarrage à vide peu orientant pour une demande sans projet. Proposer Activité comme premier écran à vide, avec Nouvelle demande immédiatement visible. Réussite : reprise depuis Activité directe et titre long lisible. Preuves [01](01-accueil-vide.png), [02](02-activite-initiale.png), [03](03-lancement-demande.png), [04](04-demande-terminal.png), [05](05-activite-une-demande.png).

### 2. Passer conception → paramètres → terminal → suivi sans perdre la conversation

**Attendu.** Identifier si je conçois un modèle ou pilote une demande ; conserver le terminal et reconnaître à quel travail il appartient.

**Étapes.** Créer Support — diagnostic et suite sans projet ; lancer la simulation décrite au parcours 3 ; Options → Revenir à l’éditeur ; Paramètres du workflow ; lire les notifications ; fermer ; Ouvrir le terminal du workflow ; puis Activité → carte du compte rendu.

**Observé.** Le titre, Éditeur/Exécution/Historique/Rapport et « Révision 1 · Enregistré » orientent la conception. Le terminal se masque au retour à l’éditeur, se rouvre sans perdre le contenu. Il montre le Codex 1 du compte rendu alors que l’éditeur Support est affiché ; l’avertissement **Autre conversation · Workflows globaux** est visible et exact. Revenir au compte rendu remplace cet avertissement par **Conversation du workflow affiché**. Les paramètres de notification explicitent « Dans Tricorder uniquement » et demandent une opération de notification vérifiée dans Connexions.

**Décision.** Conservation du terminal réussie. **UX moyenne (LP-02)** : « Ouvrir le terminal du workflow » laisse attendre une conversation propre au workflow, alors qu’il peut afficher une autre conversation existante. Le libellé visible Codex 1 n’aide pas à savoir laquelle. Proposition : titre court de la demande sur l’onglet ; distinguer ouvrir le terminal existant et démarrer la conversation du workflow. Preuves [07](07-editeur-parametres-terminal.png), [08](08-editeur-terminal-preserve.png), [09](09-petit-ecran-editeur-clair125.png), [18](18-largeur-terminal-clavier1280.png). La capture 08 a été prise immédiatement après le clic ; 09 et 18 montrent l’état stabilisé.

### 3. Piloter plusieurs demandes, traiter deux résultats et lire le bilan

**Attendu.** Distinguer les demandes prêtes, celles qui nécessitent une décision et un échec ; comprendre le résultat final sans journal d’exécution.

**Étapes.** Dans Nouvelle demande choisir Support — diagnostic et suite ; saisir « Support : les invitations ne partent plus. Préparer un diagnostic et une réponse à valider. » ; Simuler le parcours ; laisser l’échec conservé. Créer ensuite De la demande au résultat ; Simuler le parcours ; Examiner le résultat ; cocher le critère et valider avec commentaire ; attendre les résultats parallèles Préparer la réalisation / Préparer les tests ; consulter Activité ; ouvrir puis valider chacun ; Examiner la décision → Approuver la suite ; valider Préparer le bilan ; Options → Rapport.

**Observé.** Support échoue dès Support critique ? : **« Sortie finding absente ou incompatible avec le type string »**. La demande reste retrouvable avec son texte, Échec · reprise nécessaire et action Examiner l’échec. Le modèle générique montre deux étapes À valider en parallèle et un compte de deux interventions. Activité range l’échec et les résultats à valider dans À traiter ; le compte rendu prêt reste dans Autres demandes. La carte du résultat à traiter ouvre directement son détail. À la fin, le rapport affiche Terminée, les six états Validé, les commentaires enregistrés, les preuves et une limite de simulation visible. Il est possible d’expliquer le résultat et la décision humaine sans ouvrir le journal.

**Décision.** Pilotage générique et rapport réussis sur simulation. **Défaut produit majeur (LP-03)** : le bouton Simuler le parcours du modèle Support ne permet pas d’en découvrir le déroulement. Reproduction depuis HOME neuf selon les étapes ci-dessus. Cause établie après observation : la définition figée exige `finding`, `next_action`, `severity`, ne fournit aucun `sample_outputs` ; l’exécutant de simulation retourne `outputs: {}` (`build-artifacts/linux-unpacked/resources/backend/workflow_engine/runtime.py:300`). Le contrôle de contrat rejette donc `finding`. Proposition : exemples synthétiques typés cohérents pour les contrats des modèles livrés ; conserver la validation du moteur. **UX mineure (LP-04)** : `critical`, `normal`, `unknown` dans le graphe et `approve` dans la décision enregistrée/rapport ne sont pas des libellés métier français. Proposer « Critique », « Courant », « À préciser », « Approuvée » en conservant les clés techniques en détails.

Preuves [06](06-support-simulation.png), [14](14-activite-multiples-etats-sombre125.png), [15](15-rapport-final-sombre125.png), [état rouge](support-simulation-etat.json), [état final](generic-simulation-etat-final.json). Exécution rouge `r36045456e4a74ad3` ; terminée `r40efd283ae3141ff`. Aucun essai de reprise ni altération du rouge.

### 4. Valider à 1024×768, 125 %, clair/sombre, clavier et largeur ajustable

**Attendu.** Lire les intitulés, atteindre les critères/commentaires/boutons et reconnaître le focus ; adapter l’espace du terminal.

**Étapes.** Pendant la simulation générique, régler viewport 1024×768 et zoom 125 % ; ouvrir le terminal ; Examiner le résultat ; depuis Détail, Tab jusqu’au critère, Espace, Tab jusqu’au commentaire, saisir, Tab jusqu’à Valider ; passer au thème sombre ; valider ; revenir à 1280×900 à 100 % sur le compte rendu ; focus sur Taille du terminal et deux ArrowRight.

**Observé.** La disposition devient verticale. Aucun recouvrement de sidebar ni titre/action principaux tronqués de manière bloquante. Les textes et polices restent lisibles. Le critère et la validation sont d’abord hors écran ; Tab fait défiler jusqu’à eux, avec un focus bleu net. Ordre obtenu : étape sélectionnée → deux suites → critère → commentaire → Valider → Demander une reprise → détails/preuve → navigation. Les champs et actions sont utilisables dans les deux thèmes. La largeur du terminal augmente au clavier de x=789,44 à x=891,63 (deux pas, aria-valuenow 62) à 1280×900.

**Décision.** Réalisable, clavier et largeur réussis. **UX moyenne (LP-05)** : sur petit écran avec terminal visible, très peu de hauteur reste pour le graphe ou les critères. Le séparateur horizontal annonce un minimum de 39 % ; deux ArrowUp au minimum ne réduisent plus le terminal. Il faut masquer le terminal ou défiler plusieurs zones. Proposition : minimum réduit et possibilité de privilégier automatiquement le panneau de validation. **UX mineure** : plusieurs boutons secondaires sombres ont un fond gris proche d’un état désactivé alors qu’ils sont actifs ; améliorer la distinction visuelle.

Preuves [09](09-petit-ecran-editeur-clair125.png), [10](10-validation-petit-ecran-clair125.png), [11](11-focus-validation125.png), [12](12-validation-clavier-clair125.png), [13](13-validation-sombre125.png), [18](18-largeur-terminal-clavier1280.png). Le chemin métier de validation a été réalisé par les vrais contrôles UI ; le zoom et la lecture des mesures sont des moyens de banc.

### 5. Trouver une connexion pour prévenir d’une question ou préparer un brouillon

**Attendu.** Comprendre les usages disponibles et les prérequis ; configurer un adaptateur synthétique ou voir clairement ce qui manque, sans compte réel.

**Étapes.** Paramètres du workflow Support → Quand le workflow a une question ; lire Me prévenir avec ; ouvrir Connexions ; choisir Sans projet ; Afficher les connexions ; lire les cartes/diagnostics Gmail, Outlook, Slack ; cliquer Configurer dans le terminal. Aucun clic Plugins OpenAI/Anthropic et aucun service réel.

**Observé.** Le seul choix de notification est Dans Tricorder uniquement. L’aide explique l’usage d’une opération de notification vérifiée et que la question reste dans Tricorder. Connexions affiche honnêtement Gmail/Outlook/Slack À configurer, sans transport authentifié dans Tricorder ; Telegram/Signal nécessitent un adaptateur à fournir. Le contexte et le chemin du catalogue sont visibles. Mais la configuration exige de modifier `.tricorder/plugins.json` depuis le terminal ; aucun formulaire de connexion ni exemple de configuration n’est proposé. Configurer dans le terminal ouvre le terminal Codex 1 existant (Autre conversation), sans instruction supplémentaire visible ni prompt prérempli dans le cas testé.

**Décision.** Manque clairement signalé ; aucune notification ni création de brouillon par connecteur qualifiée. **Manque UX majeur pour le profil (LP-06)** : impossible d’achever la configuration en suivant seulement les indications visibles sans savoir éditer un catalogue JSON et fournir/qualifier un adaptateur. Proposition : aide pas à pas, modèle synthétique explicite ou formulaire opération/canal/destinataire/test, qui sépare déclaration et vérification. Ne pas afficher « connecté » sur la seule présence d’un plugin.

Preuves [07](07-editeur-parametres-terminal.png), [16](16-connexions-vide-sombre125.png), [17](17-connexion-configurer-terminal.png). Les stubs Codex/Claude « Utilisable » attestent seulement la détection du CLI ; leur authentification/fournisseur réel est hors périmètre.

## Tests manquants suggérés

1. Ouvrir chaque modèle livré en simulation jusqu’à un résultat, une question ou décision : vérifier les sorties typées et les branches ; Support doit atteindre une vraie intervention au lieu d’un rejet de contrat.
2. Premier démarrage sans dépôt : Nouvelle demande accessible dès l’écran initial, sans consigne impossible de sélectionner un projet.
3. Naviguer entre deux workflows et une conversation : terminal conservé, titre de demande affiché, absence d’association trompeuse.
4. À 1024×768/125 %, atteindre et valider un résultat au clavier avec terminal visible ; vérifier minimum de hauteur, focus, défilement et deux thèmes.
5. Configurer depuis l’UI une notification synthétique, la vérifier puis la choisir dans un workflow ; vérifier un faux envoi sans réseau. Le catalogue vide doit donner une prochaine action compréhensible.

## Périmètre non qualifié

Agents commerciaux et exécution métier réelle ; réunion à partir d’un vrai transcript ; diagnostic réel de support ; notifications, OAuth, mails, Slack et brouillons externes ; multi-agents réels ; multiples dépôts, releases, restauration, déploiement, publication ; question métier saisie dans un workflow réel ; export du rapport. Aucun sélecteur fichier natif utilisé. La simulation terminée prouve le parcours UI et ses transitions, pas un résultat métier réel.

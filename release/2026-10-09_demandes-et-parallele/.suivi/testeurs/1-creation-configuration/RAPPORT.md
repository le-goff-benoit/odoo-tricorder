# Testeur indépendant 1 — première utilisation, création et configuration

**Avis : les opérations essentielles de création, liaison, sauvegarde, configuration et import fonctionnent sur rc12. La première utilisation reste trop difficile à comprendre pour un business analyst.** Aucun crash, perte de contrat enregistré ou blocage moteur n’a été établi dans cette campagne. Le défaut le plus visible est l’accueil normal vide qui demande un projet alors que les workflows sans projet sont disponibles.

## Périmètre et méthode

Persona : business analyst, technique **3/10**, métier **8/10**. Objectif métier inventé : qualifier une demande d’achat, faire valider son budget, puis traiter les demandes de support internes. Premier parcours effectué par les libellés visibles de l’interface, sans utiliser d’identifiant de workflow ni d’API pour créer les blocs. Les API de lecture servent ensuite à prouver le résultat. Aucune lecture des rapports des autres testeurs.

Paquet : `0.6.0-rc.12`, ASAR `10b5f192d643fc9f33cffdf3f238bcd24cbf4f69dc5ba77bab7be92cff253237`. Entrée normale **sans flag de vue**, Playwright Electron, viewport 1440×1000, DISPLAY `:181`. HOME, XDG, état, runtime et PTY isolés sous `/tmp/tricorder-functional-creation-state-6f3zmG`. Codex et Claude remplacés avant la première ouverture par deux exécutables Python inertes. Le marqueur `CREATION_CONFIG_INERT_PROVIDER` a été vu dans le terminal. Le pack générique de profils achats a été fabriqué comme fixture puis installé par `pack.preview` / `pack.install`, sans modification manuelle d’état. Il n’impose aucune règle Odoo.

Les sélecteurs natifs d’export/import et de dossier ont été remplacés **uniquement** par des chemins temporaires déterministes après inspection de ces actions. Les boutons, la sérialisation, la prévisualisation et les imports restent ceux du paquet. Cela ne valide pas le comportement graphique du sélecteur de fichiers du bureau. La fixture dépôt a été commitée puis clonée localement par Git ; aucune publication. Application et broker PTY synthétique arrêtés en fin de campagne. Aucun build, test global ou correctif produit.

## Parcours réalisés

| Parcours | Étapes utilisateur et résultat | Preuve |
|---|---|---|
| 1. Installation vide → workflow vierge → I/O → liaison → reprise | Ouvrir normalement ; Workflows ; Créer un workflow vide ; nommer « Traiter une demande d’achat » ; renommer la première Tâche ; saisir un critère ; Ajouter une sortie `besoin` de type Texte ; ajouter « Valider le budget » de type Accord humain ; Ajouter une entrée `besoin` ; Relier qualification à validation ; Enregistrer ; fermer/reouvrir ; Workflows ; Ouvrir. Les **2 blocs, le port et la liaison** sont repris. Le troisième bloc compte rendu envisagé n’a pas été ajouté : ce parcours prouve l’édition/reprise, pas le processus achats complet. | [Accueil](01-demarrage-vide.png), [création](02-workflow-vierge.png), [liaison](03-liaison-donnees.png), [catalogue repris](04-reprise-catalogue.png), [lancement depuis définition reprise](06-lancement-incomplet.png) |
| 2. Modèle Support → adaptation | Workflows ; Modèles ; Support — diagnostic et suite ; Utiliser ; nommer « Support achats internes » ; Créer et ouvrir ; vue Liste ; ouvrir « Support critique ? ». **6 blocs / 7 liens** disponibles ; consigne, branches et ports sont éditables. | [Modèles](07-modeles.png), [création Support](08-creer-support.png), [liste](09-support-liste.png), [propriétés](15-configuration-agent.png) |
| 3. Configuration manquante → réparation → terminal | Exécuter ; saisir « Le budget d’une commande semble incorrect. Comprendre l’écart sans modifier les commandes. » ; ouvrir Exécution automatique sans conversation ; constater Modèle IA à définir pour les étapes ; Choisir l’IA depuis un diagnostic ; saisir le modèle synthétique ; appliquer et revenir au lancement ; Lancer dans le terminal. La demande d’origine et le modèle choisi sont conservés dans la conversation métier ; le terminal démarre le faux CLI. | [Demande saisie](10-support-lancement.png), [diagnostic](11-config-manquante.png), [terminal](14-support-terminal-stable.png), [conversation et définition](contrat-apres-et-demande.json) |
| 4. Profil et fournisseur → contrat conservé | Fixture pack achats installée ; profil Analyste achats choisi dans les propriétés ; consigne/critères modifiés puis appliqués et enregistrés ; profil changé en Contrôleur budget ; IA commune changée Codex → Claude ; modèle changé. Consigne, critères, I/O et les **7 liens** restent identiques. La conversation déjà ouverte reste sur Codex et son modèle antérieur. Contrôle supplémentaire : une consigne non appliquée reste visible après changement du modèle commun. | [Définition et conversation](contrat-apres-et-demande.json), [brouillon avant](25-consigne-brouillon-avant-ia.png), [brouillon après](26-consigne-apres-ia.png), [valeur préservée](brouillon-preserve-apres-choix-ia.json) |
| 5. Export portable → import dans bibliothèque → réutilisation | Exporter le Support configuré ; Workflows ; Importer un workflow ; lire l’aperçu fournisseur/modèle/profil ; choisir Bibliothèque de modèles ; Importer le brouillon ; Modèles ; rechercher le nom. Le modèle importé est retrouvé et réutilisable. Ni historique ni autorisation importés. | [Aperçu](18-import-apercu.png), [modèle retrouvé](20-modele-reutilisable.png) |
| 6. Dépôt local → clone → reprise des workflows | Créer le projet Genève par l’UI ; y créer une définition vierge « Achats version dépôt » ; commit/clone local comme fixture ; Projets ; Nouveau projet Lausanne ; choisir le clone ; créer ; Examiner les workflows du dépôt ; Importer ce workflow. La définition est retrouvée et ouverte ; **aucune exécution** n’est transférée. | [Projet](21-projet-cree.png), [aperçu dépôt](23-depot-apercu.png), [éditeur importé](24-workflow-depot-importe.png), [preuve métier](depot-repris.json) |

Le parcours 3 distingue deux modes : le lancement conversationnel natif était autorisé avec un modèle vide, tandis que le mode automatique exigeait un modèle explicite. Ce comportement ne prouve ni une authentification réelle ni la disponibilité d’un modèle commercial. Le fournisseur factice ne produit aucun résultat métier ; son inactivité ne constitue pas un défaut de progression du produit.

## Constats

### C1 — Accueil vide qui détourne du workflow sans projet

- **Type / gravité : confusion UX majeure, P1.** Routage technique établi ; pas de blocage absolu, car le bouton Workflows fonctionne.
- **Parcours :** ouvrir le paquet normalement dans un HOME vierge, puis redémarrer après avoir créé un workflow sans projet.
- **Attendu :** une action directe pour créer une demande ou un workflow, et une proposition de reprise du travail enregistré.
- **Observé :** « Aucun projet », « Choisissez le dossier des projets dans Paramètres », « Aucun projet sélectionné », et onglets Statut / Terminal / Demandes / Plan / Mémoire / Express / Temps. Le contenu principal invite à choisir un projet. Au redémarrage, le workflow global existant ne change pas cet accueil. Un BA peut conclure qu’il doit configurer un dépôt avant de travailler.
- **Reproduction :** lancer l’exécutable sans `--workflow-studio` avec état vierge ; enregistrer un workflow global ; fermer et relancer sans flag. Cliquer Workflows permet ensuite de retrouver le workflow.
- **Preuve :** [01-demarrage-vide.png](01-demarrage-vide.png), [04-reprise-catalogue.png](04-reprise-catalogue.png).
- **Cause établie :** `electron/workspace-window.cjs` renvoie `cockpit` sans flag ou fichier portable ; `src/app.js:start()` n’ouvre les workflows que si `initialWorkspace === 'studio'`.
- **Correction proposée :** ouvrir Activité / Workflows à l’entrée normale, avec Nouvelle demande et Créer un workflow dans l’état vide ; proposer le dernier travail après redémarrage. Le message « projet requis » doit devenir une possibilité de contexte, pas la consigne principale.

### C2 — Le choix du premier bloc manque d’explication métier

- **Type / gravité : confusion UX modérée, P2.**
- **Parcours :** créer un workflow vide et chercher un bloc pour « qualifier le besoin ».
- **Attendu :** comprendre immédiatement si je veux une tâche dans ma conversation, un agent autonome, une question ou un accord humain ; savoir comment donner mes consignes.
- **Observé :** le workflow dit vide contient déjà une « Première étape » de type Tâche. La liste d’ajout propose Agent, Tâche dans la conversation, Commande, Document, évaluateur, règle, accord, question, réunion, sous-workflow, surveillance, opération externe et communication. La distinction Tâche/Agent et la conséquence sur les réglages ne sont pas expliquées dans ce parcours. La Tâche permet titre et critères, tandis que le bloc Agent possède la Consigne. Le BA doit comprendre cette distinction pour choisir comment exprimer son travail.
- **Reproduction :** Workflows → Créer un workflow vide → cliquer Première étape, puis Ajouter un bloc ; comparer avec le premier bloc du Support.
- **Preuve :** [02-workflow-vierge.png](02-workflow-vierge.png), [03-liaison-donnees.png](03-liaison-donnees.png), [15-configuration-agent.png](15-configuration-agent.png). Le choix « Tâche dans la conversation » a été relevé dans le menu, sans capture dédiée.
- **Cause établie :** `designInspector()` n’affiche Consigne que pour `kind === 'agent'` ; la création vierge utilise une Tâche. La pertinence du traitement de cette Tâche par un vrai agent n’a pas été testée.
- **Correction proposée :** expliquer chaque type avec une phrase et un exemple métier ; préciser « traité dans votre terminal » versus « exécuté par un agent dans sa propre session » ; exposer une consigne de travail pour une Tâche, ou expliquer où elle se donne.

### C3 — Les I/O simples fonctionnent, mais le modèle Support parle aux développeurs

- **Type / gravité : confusion UX modérée, P2.**
- **Parcours :** créer `besoin` par le formulaire, puis adapter le modèle Support.
- **Attendu :** des entrées/sorties compréhensibles en termes de données métier, avec exemples et descriptions.
- **Observé :** le formulaire propose Texte, Objet structuré, Liste, Oui/non et Nombre : c’est accessible. Après ajout, la liste affiche cependant `besoin · string`. Le modèle Support expose `finding`, `next_action`, `severity`, `critical/normal/unknown` et une consigne « Lire la demande dans parameters.request… Demander… avec ask ». Le bloc de réévaluation expose aussi `inputs.answer`. Modifier ces noms demande de comprendre un contrat technique. Il n’y a pas de description métier visible pour chaque donnée.
- **Reproduction :** ouvrir le modèle Support ; propriétés de Support critique ? ; lire Consigne et Sorties. Pour le contraste, ajouter une sortie Texte à la Tâche vierge.
- **Preuve :** [03-liaison-donnees.png](03-liaison-donnees.png), [15-configuration-agent.png](15-configuration-agent.png), [contrat-apres-et-demande.json](contrat-apres-et-demande.json).
- **Cause établie :** `portEditor()` imprime le type brut du contrat et les noms techniques ; les consignes livrées contiennent des références moteur.
- **Correction proposée :** garder une clé technique sous les options avancées ; afficher libellé, description et exemple de valeur pour chaque donnée ; présenter des consignes métiers et injecter les références moteur hors du texte à adapter. La liaison automatique de ports de même nom est à conserver : elle a fonctionné sans JSON.

### C4 — Personnaliser un agent exige déjà un pack préparé

- **Type / gravité : manque fonctionnel pour l’autonomie du BA, P2.** Pas de panne d’import établie.
- **Parcours :** propriétés Agent et modèle pour cette étape, sur une installation sans pack.
- **Attendu :** pouvoir définir puis réutiliser un profil simple depuis l’application, ou être guidé vers cette configuration.
- **Observé :** le menu Agent dédié ne contient que Aucun agent dédié sans pack. Les deux profils achats deviennent disponibles après installation de la fixture. Aucune action de création de profil depuis ces propriétés n’a été trouvée. Un projet possède Ajouter un pack, mais le pack doit déjà exister sous forme de dossier préparé.
- **Reproduction :** ouvrir le premier Agent du Support sans pack ; déplier Agent et modèle ; inspecter le menu. Installer ensuite le pack générique synthétique par les API métier puis rouvrir : Analyste achats / Contrôleur budget sont disponibles.
- **Preuve :** [contrat-apres-et-demande.json](contrat-apres-et-demande.json) prouve le profil effectivement choisi. Fixture : `/tmp/tricorder-functional-creation-driver/pack-achats/`. Réserve : le sélecteur vide a été observé dans le DOM, sans capture spécifique du menu déroulé.
- **Cause établie :** les choix de profils proviennent de `state.project.packs` dans `designInspector()`.
- **Correction proposée :** un formulaire de profil réutilisable — nom, mission, consignes, capacités facultatives — ou un parcours assisté de création de pack. L’option sans profil doit rester suffisante pour les workflows génériques.

### C5 — Enregistrer ne dit pas si le formulaire du bloc est appliqué

- **Type / gravité : confusion UX modérée, P2.** Aucune perte de brouillon établie ; le test a au contraire confirmé sa conservation lors du choix IA.
- **Parcours :** modifier la Consigne sans Appliquer au bloc, puis changer le modèle commun.
- **Attendu :** un état de sauvegarde qui couvre le texte actuellement affiché, ou un indicateur clair « modifications du bloc non appliquées ».
- **Observé :** après le changement IA, la consigne non appliquée est encore affichée, mais l’en-tête annonce « Révision 7 · Enregistré ». Le bouton Enregistrer du workflow reste désactivé ; il faut atteindre Appliquer au bloc pour que cette consigne rejoigne la définition. Les deux niveaux de sauvegarde ne sont pas explicites.
- **Reproduction :** ouvrir un Agent ; saisir une nouvelle Consigne ; ne pas appliquer ; Choisir l’IA pour tout le workflow ; changer le modèle ; appliquer le choix IA. Comparer le bandeau enregistré avec le brouillon présent.
- **Preuve :** [25-consigne-brouillon-avant-ia.png](25-consigne-brouillon-avant-ia.png), [26-consigne-apres-ia.png](26-consigne-apres-ia.png), [brouillon-preserve-apres-choix-ia.json](brouillon-preserve-apres-choix-ia.json).
- **Cause :** distinction observée entre formulaire de bloc et graph enregistré ; aucun diagnostic supplémentaire de persistance du brouillon après fermeture n’a été réalisé.
- **Correction proposée :** signaler les modifications non appliquées près du nom de bloc et dans le statut de sauvegarde ; proposer une action unique enregistrer le bloc et le workflow, ou une alerte explicite à la sortie.

### C6 — Réutiliser une définition globale dans un projet est indirect

- **Type / gravité : confusion UX modérée, P2.** La réutilisation par export/import bibliothèque fonctionne.
- **Parcours :** depuis le projet Genève, Créer un workflow, puis chercher le workflow « Traiter une demande d’achat » enregistré Sans projet.
- **Attendu :** sélectionner aussi ses définitions globales comme point de départ d’un workflow éditable dans ce projet.
- **Observé :** ce menu propose les modèles de bibliothèque et les workflows du contexte courant. La définition globale achats n’y apparaît pas. Le Support préalablement exporté/importé dans Bibliothèque apparaît, lui. Une tentative d’automatisation de sélection de la définition globale a donc échoué ; cela ne constitue pas une erreur de création du produit. Un workflow vierge a été créé ensuite pour la fixture dépôt.
- **Reproduction :** créer une définition Sans projet ; créer un autre projet ; Créer un workflow ; examiner Modèle de workflow. Comparer avec un fichier importé vers Bibliothèque de modèles.
- **Preuve :** [22-reutilisation-autre-projet.png](22-reutilisation-autre-projet.png), [20-modele-reutilisable.png](20-modele-reutilisable.png).
- **Cause établie :** liste observée limitée au contexte courant et aux modèles ; le parcours Nouvelle demande de réutilisation sans copie dans un autre projet n’a pas été testé ici.
- **Correction proposée :** offrir Mes workflows de tous les contextes dans le sélecteur de création, avec « créer une copie » clairement indiqué ; distinguer cette action de « exécuter cette définition dans un autre contexte ».

## Ce qui fonctionne

- Une seule fenêtre conserve le terminal et propose éditeur, projets, bibliothèque et reprise.
- Aucun pack Odoo requis pour créer et sauvegarder un workflow générique sans projet.
- Création de ports par formulaire et liaison de même nom sans saisir de JSON ; le texte « Données reliées par leur nom : besoin » explique le résultat.
- La définition enregistrée revient après arrêt et redémarrage.
- Diagnostics de configuration du mode automatique identifient l’étape et fournissent un chemin de réparation.
- La réparation conserve la demande et le terminal local démarre le fournisseur factice.
- Changer profil et fournisseur conserve les consignes, critères, ports et branchements enregistrés. La conversation existante garde son fournisseur et son modèle.
- Le brouillon du bloc survit au changement de modèle commun dans la session.
- Import portable avec aperçu, destination bibliothèque, modèle retrouvé ; reprise des workflows d’un clone Git avec un bouton explicite et sans exécution transférée.

## Limites et régressions à automatiser

Non testés : installation du `.deb` sur une machine vierge ; vrai fournisseur/authentification/quotas ; exécution complète du processus achats ; production ; connecteurs externes ; création d’un profil par l’utilisateur sans pack ; désinstallation ; clavier seul ; écrans étroits ; sélection native des fichiers ; sous-workflows avec correspondances complexes ; copie directe par Nouvelle demande entre projets. Le troisième bloc documentaire du premier scénario reste hors preuve. Aucun résultat métier produit par un modèle réel n’est qualifié.

Régressions utiles :

1. Entrée normale sans flag et HOME vierge → accueil générique avec action directe ; redémarrage avec un workflow global existant → reprise visible.
2. Création vierge par UI → ports par formulaire → liaison → sauvegarde → redémarrage ; vérifier définition et mapping métier.
3. Réparation modèle depuis diagnostic avec demande déjà saisie → même demande dans la conversation créée.
4. Profil A → profil B et fournisseur A → fournisseur B → même consigne, critères, I/O et liens ; conversation existante inchangée.
5. Brouillon de Consigne non appliqué → choix IA → brouillon conservé et statut de sauvegarde cohérent.
6. Export/import bibliothèque puis sélection dans un autre projet ; import depuis clone → définition retrouvée, aucune exécution/autorisation transférée.

Driver et fixtures utilisés : `/tmp/tricorder-functional-creation-driver/driver.cjs`. Ils sont des outils de campagne, pas des modifications aux tests partagés. Les captures trop précoces 05/12/16/17 ne sont pas utilisées comme preuve décisive de l’état final ; les captures stables et les JSON métier ci-dessus font foi.

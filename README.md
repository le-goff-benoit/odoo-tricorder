# Tricorder

**Dessinez votre méthode de travail. Donnez vos demandes dans le terminal. Suivez ce qui se passe.**

Tricorder réunit un éditeur de workflows, vos conversations avec Codex ou Claude
et le suivi des demandes dans une application de bureau. Il sert à préparer une
release, analyser un ticket, clôturer une réunion ou organiser votre propre processus.
Les projets Odoo sont un usage possible ; le pack Odoo reste facultatif.

**Préversion 0.6.0-rc.12 · Ubuntu** — [Télécharger](https://github.com/le-goff-benoit/odoo-tricorder/releases/tag/v0.6.0-rc.12)
· [Nouveautés](release/2026-10-09_demandes-et-parallele/README.md)
· [Guide d’utilisation](docs/WORKFLOW-RUNTIME.md)

![Le terminal et le suivi des demandes dans Tricorder](release/2026-10-09_demandes-et-parallele/captures/demandes-et-agents.png)

*Captures de l’application avec des projets et exécutants fictifs.*

## Du workflow au résultat

1. **Choisir ou dessiner.** Ouvrez **Workflows**, partez d’un modèle ou créez votre
   workflow. Décrivez les blocs, leurs consignes, les données échangées et les décisions.
2. **Lancer.** Depuis **Nouvelle demande** ou **Exécuter…**, choisissez le workflow
   et son périmètre : sans projet, dans un projet, ou dans plusieurs projets.
3. **Dialoguer.** **Lancer dans le terminal** ouvre la conversation liée au suivi.
   Donnez votre intention, par exemple « Lis cet email et prépare les demandes
   de support ». L’agent peut demander une précision pendant le travail.
4. **Suivre et décider.** Le panneau montre l’étape actuelle, les questions,
   les validations et les résultats. **Vue d’ensemble** permet de passer d’une
   demande à l’autre. Le terminal conserve sa session.
5. **Reprendre.** **Activité** retrouve le travail en cours. Une interruption
   conserve les demandes et les tentatives ; une reprise indique ce qui va se passer.

Vous pouvez commencer par le terminal. Le bouton **Terminal** l’affiche à tout
moment ; votre choix de l’afficher ou de le masquer est conservé pendant la navigation. Le séparateur ajuste sa place. **Disposition verticale** superpose
terminal et suivi, et **Agrandir le terminal** lui donne toute la surface.

## Votre méthode, vos blocs

L’éditeur relie des tâches, agents, documents, décisions, conditions et opérations.
Chaque bloc explique son travail, ses entrées, ses sorties et ses critères.
Les liens montrent quelles données passent au bloc suivant. Un lien peut aussi
servir uniquement à définir l’ordre du travail. **Réorganiser le graphe** range les branches sans changer leur fonctionnement ; vous pouvez annuler ce geste. Sélectionnez un lien pour examiner les données transmises ou le retirer.

La méthode appartient au workflow. **Choisir l’IA** règle le fournisseur et le
modèle ; les profils d’agents précisent les compétences et les consignes de chaque
bloc. Vous pouvez adapter ces choix sans redessiner votre méthode, sous réserve
des outils et capacités réellement disponibles chez l’exécutant choisi.

**Données de simulation…** permet d’essayer des branches et des valeurs d’exemple.
La simulation sert à vérifier le parcours ; elle ne réalise pas le travail métier.

![L’éditeur de workflows](release/2026-10-09_demandes-et-parallele/captures/editeur.png)

Sur un petit écran, les propriétés utilisent le panneau workflow avec des actions
fixes. Le formulaire conserve la saisie lorsque vous redimensionnez la fenêtre.

## Un workflow, plusieurs usages

| Besoin | Exemple de parcours |
|---|---|
| Support | Demande client → analyse → clarification → constat → proposition de réponse |
| Réunion | Transcription → compte rendu → actions → relecture → brouillon d’email |
| Release | Intentions → plan → décision → réalisation → contrôles → proposition de livraison |
| Travail transversal | Demandes dans plusieurs projets → dépendances → consolidation |
| Processus personnalisé | Vos blocs, vos données et vos règles de décision |

**Projets → Nouveau projet** crée un espace local ou associe un dépôt Git existant.
Aucune préparation de dépôt n’est nécessaire pour commencer dans un nouvel espace.

**Options → Réutiliser…** crée une copie vers les modèles ou un autre projet.
Les copies évoluent indépendamment ; les anciennes demandes, résultats, décisions
et planifications ne sont pas transférés. Un même workflow peut aussi servir à
plusieurs exécutions sans créer une nouvelle définition à chaque lancement. Les exemples personnalisés de simulation sont retirés de la copie, sauf si vous choisissez de les conserver.

Dans un dépôt, les définitions sont enregistrées dans `.tricorder/workflows/`,
prêtes à être versionnées. **Éditeur → Fichier JSON du workflow…** montre le fichier enregistré. **Options → Workflows du dépôt** les retrouve après
un clone. Les commits restent sous votre contrôle ; l’historique d’exécution reste local.

## Comprendre le travail en cours

**Vue d’ensemble** rassemble les demandes, les exécutants et leur dernier état
observé, ainsi que les attentes. Une question, une décision, une dépendance et un échec ont des actions
propres. **Graphe** montre le parcours ; **Détail** donne la place au contenu à lire.
Une demande terminée propose **Voir les résultats**, puis son rapport complet. Les branches non applicables sont comptées séparément. Les décisions disposent de leurs actions en pied de panneau, même avec un long contenu à lire.

Les tentatives précédentes présentent leur compte rendu, leurs preuves et le
motif de reprise. Une reprise annonce son budget et distingue la préparation de
l’étape du démarrage de l’agent. **Agent arrêté** et **Demande suspendue** sont
traités séparément.

**Lancer les demandes prêtes** démarre une vague de travail, avec jusqu’à quatre
exécutants et les verrous nécessaires. Le terminal peut faire la même chose.
Les demandes qui attendent une réponse ou une validation restent visibles.
Ce lancement n’installe pas une file autonome : les étapes suivantes demandent
une nouvelle vague après leurs prérequis.

## Fournisseurs, outils et connexions

**IA des prochains lancements** choisit OpenAI · Codex ou Anthropic · Claude.
Les conversations déjà ouvertes conservent leur fournisseur. Tricorder utilise
leurs CLI et leur authentification native ; sélectionner un fournisseur ne
connecte pas automatiquement son compte.

Dans une conversation, l’agent utilise ses outils disponibles pour rechercher
un email, lire une source locale ou préparer un brouillon. **Connexions** présente
les plugins détectés. Une opération autonome dans un workflow — notification,
email ou autre service — demande une capacité vérifiée pour ce connecteur.
Un brouillon local ne devient pas automatiquement un brouillon dans la messagerie.

Pour faire relire un contenu avant un envoi, placez une **Décision humaine**
avant le bloc de communication. La validation du résultat de ce bloc intervient
après l’opération.

## Planifier et partager

**Planifier** règle la fréquence, le fuseau et le mode d’exécution. La planification
conserve une version du workflow, consultable dans **Version planifiée**.
Modifier le dessin ne change pas une planification active ; son remplacement
est explicite. La fréquence reste visible et les réglages horaires sont repris lors du remplacement ; vous vérifiez à nouveau le mode et les autorisations.

**Options → Exporter…** produit un fichier `.tricorder-workflow` avec ses
composants. À l’ouverture sur un autre poste, Tricorder présente un aperçu avant
import. Les comptes, autorisations et anciennes exécutions ne sont pas transférés.

## Installer et mettre à jour

Téléchargez le paquet `.deb` depuis la [release](https://github.com/le-goff-benoit/odoo-tricorder/releases/tag/v0.6.0-rc.12),
installez-le avec le gestionnaire de paquets Ubuntu, puis ouvrez **Tricorder**.
**Essayer un exemple** permet de découvrir un parcours simulé sans modèle payant.

Les mises à jour stables sont signalées depuis GitHub. L’installation et le
redémarrage restent explicites. Fermer la fenêtre conserve les sessions terminal ;
pour appliquer une mise à jour, quittez Tricorder depuis son icône système puis
relancez-le. Un agent déjà ouvert conserve ses instructions jusqu’à sa reprise.

## État de la préversion

Cette version améliore création, dialogue et suivi. Le cycle complet de release
parallèle — approbation commune, intégration des candidats et QA commune — reste
à construire. Les demandes utilisent encore des exécutions distinctes : le suivi
ne les présente pas comme des sous-blocs d’une exécution parent inexistante.

Les [notes et preuves de réception](release/2026-10-09_demandes-et-parallele/README.md)
distinguent essais GUI, simulations et limites. Elles ne qualifient ni un modèle
commercial, ni un service externe, ni une release cliente réelle.

## Développer Tricorder

Ubuntu, Python 3, Git, Node/npm et Bubblewrap pour les commandes isolées :

```bash
npm install
npm start
npm test
npm run test:ui
npm run dist
npm run test:packaged
```

Le terminal utilise Electron et xterm.js ; le moteur de workflows est en Python.
État du bureau : `~/.config/odoo-tricorder/`. État des workflows :
`~/.local/share/tricorder/`. `TRICORDER_STATE_DIR` permet un banc isolé.
Tricorder n’expose pas de service TCP et n’envoie pas de télémétrie. La vérification
de mise à jour contacte GitHub ; les fournisseurs et connecteurs contactent leurs
services lors des actions demandées.

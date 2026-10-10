# Persona 8 — développeur senior sceptique, première utilisation

Version observée : binaire installé rc.17 figé. Profil vide et isolé, fournisseurs Codex/Claude inertes (exit 78), aucun compte connecté. Inspection uniquement de l’interface avant conclusions ; aucune lecture du code ou du README, aucune API métier ni modification directe d’état. Deux intentions : comprendre la livraison GitHub→Odoo.sh avant lancement ; identifier les agents et les possibilités de coordination/reprise. Aucune livraison réelle ni analyse IA qualifiée.

## Intention 1 : comprendre la méthode avant de l’adopter

1. J’ouvre Workflows puis Modèles. J’attends une bibliothèque de processus utilisables. L’écran explique au contraire un mélange de workflows complets et de blocs à composer ; « De la demande au résultat » est une simulation et plusieurs propositions sont des composants isolés. Je dois chercher GitHub pour isoler la méthode souhaitée (captures 02 et 03).
2. La carte est trouvée. Elle annonce huit blocs et demande cibles, SHA et adaptateurs. En tant que développeur je comprends ces mots, mais je veux consulter responsabilités, opérations et limites avant de créer quoi que ce soit. Il n’existe aucun bouton Voir ; Utiliser, Créer une adaptation et Personnaliser une copie sont trois actions de création/usage dont les conséquences ne sont pas immédiatement évidentes.
3. Utiliser ouvre « Nouvelle demande », puis Continuer ouvre la préparation du lancement. Deux transitions sont nécessaires sans me montrer la méthode. Aucun déclenchement réel : des blocages indiquent explicitement « aucune publication ni livraison réelle disponible » et demandent connexion/candidat. C’est une bonne limite honnête, importante à préserver (captures 04 et 05).
4. « Ouvrir l’étape » me donne enfin accès à l’éditeur, mais j’ai désormais un workflow enregistré dans Sans projet, un lancement en attente et une révision. La consultation préalable a donc eu un effet de création. La carte 8 blocs cache un graphe horizontal très large, plusieurs barres et onglets. Ajuster réduit le graphe à 31 %, insuffisant pour lire sans naviguer (capture 06).
5. Le bloc « Vérifier build et version Odoo.sh » est un Document. Ses critères sont pertinents (SHA publié, cible, contrôle de santé). Le formulaire ne permet pas de savoir, en première lecture, qui fait la vérification, où il prend les faits, ni si elle est réellement exécutée. Chaque bloc affiche « Sans donnée provenant d’un autre bloc » : cela affaiblit la confiance dans la continuité entre publication et vérification. Je ne conclus pas à un défaut moteur ; c’est l’interprétation produite par l’interface.
6. Je ne lance pas une simulation pour prétendre avoir testé une livraison. Sans connexion réelle, résultat et reprise d’erreur de déploiement restent non observés. Il faut une autre recette pour les qualifier.

## Intention 2 : agents, coordination, reprise

« Choisir l’IA » ouvre un choix fournisseur/modèle global et dit que les profils d’agents sont conservés. Aucun catalogue n’est présent dans mon environnement volontairement sans fournisseurs. L’absence de catalogue est attendue ; ce n’est pas une régression. En revanche je ne trouve pas à cet endroit les agents, leurs responsabilités ni une explication de la coordination. Dans le workflow de livraison je peux identifier mes décisions humaines, mais pas un responsable qui rassemble et contrôle les faits. Je ne peux pas vérifier une reprise d’erreur sans exécution ; je conserve cette limite, plutôt que l’attribuer arbitrairement à une fonctionnalité absente.

## Obstacles et gravité

- Majeur : voir une méthode nécessite entrer dans une création/lancement. Besoin d’un aperçu sans effets avec étapes, responsables, informations et capacités disponibles.
- Majeur : cohérence des contrôles non lisible. Présenter « vérifier » comme Document et aucune donnée reçue ne suffit pas pour décider de confier une livraison.
- Majeur : agents et supervision absents de la lecture principale ; choisir une IA n’explique pas qui fait quoi.
- Important : trop de mécanique au même niveau (8 blocs, révision, cible/candidat, données structurées) ; regrouper en étapes lisibles sans enlever les contrôles exacts.
- Positif : blocage honnête sans connexion ; pas de promesse de livraison sur une simulation.

## Verdict d’adoption

Je trouve le modèle et je peux examiner son graphe en contournant l’absence d’aperçu. Je ne suis pas prêt à l’adopter comme méthode de livraison sur la seule interface : je manque de visibilité sur la provenance des vérifications et les responsabilités. Aucune conclusion générale sur qualité IA, déploiement réel ou reprise. Les attentes citées ici sont celles d’une revue par agent jouant un persona ; aucune étude de vrais utilisateurs n’est revendiquée.

## Preuves et reproduction

Captures 01–08 dans ce répertoire. `decouverte.cjs` est le harnais autonome de la session GUI isolée ; les commandes de découverte ont été saisies après observation. Deux erreurs de sélecteur Playwright (nom accessible du bloc et fermeture de modale) sont des erreurs de pilotage et ne sont pas imputées à l’application. Rejouer : ouvrir Workflows → Modèles → chercher GitHub → Utiliser → Continuer → constater les blocages → Ouvrir l’étape → consulter la vérification → Choisir l’IA. Ne pas simuler ni connecter de compte pour cette revue.

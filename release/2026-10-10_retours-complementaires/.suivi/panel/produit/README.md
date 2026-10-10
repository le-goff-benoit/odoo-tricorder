# Persona responsable produit B2B — candidat rc.16

Agent jouant le rôle d’un responsable produit, le 10 octobre 2026. Candidat figé `/tmp/tricorder-rc16-final`. Deux intentions : orienter un retour selon une destination métier puis faire évoluer les noms d’informations d’un modèle réutilisable. Ce parcours n’est pas une étude avec un participant humain.

## Conditions et preuves

Electron lancé avec HOME temporaire, affichage X isolé, fournisseurs Codex/Claude inertes (`exit 78`). Formulaire et règle configurés dans l’interface. Les deux blocs Document de destination et le bloc de relecture du second modèle sont des fixtures ajoutées par `workflow.save` avec révision, sans modification directe d’état. L’exécution du premier parcours est une simulation ; elle ne prouve ni analyse IA ni création de ticket/email. Le second parcours vérifie la configuration et la réouverture, pas une exécution réelle de modèle.

Script autonome : `parcours.cjs`. Captures et observations du parcours complet : `complet/`. Pour rejouer, utiliser `PANEL_OUT=<répertoire existant> PATH=/tmp/tricorder-xvfb/usr/bin:$PATH xvfb-run -a node parcours.cjs` depuis le dépôt. Le script utilise le candidat figé par chemin absolu et supprime son profil temporaire à la fin.

## Intention 1 — orienter et retrouver la synthèse

Je suis parti de « Créer un workflow » et ai choisi une Condition comme premier bloc. Je n’ai pas eu à supprimer une tâche IA imposée. Pour demander la destination au lancement, j’ai d’abord cherché dans Options : « Paramètres du workflow » était aussi directement disponible dans la barre d’outils, ce que mon premier regard avait manqué. Le formulaire m’a ensuite permis de saisir « Destination souhaitée », une aide et deux valeurs naturelles : « Email client » et « Ticket équipe ».

**P1 — même liste à saisir deux fois.** Après sélection de ce champ dans la règle, passer à « Valeurs personnalisées » ne reprend pas ses valeurs proposées. Il faut retaper les deux chaînes exactement. J’ai continué en les recopiant ; une faute pourrait laisser une branche inutilisée. Proposition : une action explicite « Reprendre les valeurs du formulaire », disponible pour une source de type choix, sans écraser les liens existants. Preuve : `complet/5-regle-choix.png`.

Au lancement, j’ai compris ce qui m’était demandé. Après choix « Ticket équipe », la bonne branche a été produite, l’autre indiquait « Non applicable » et le bandeau de simulation était visible. Le bouton « Voir les résultats » évite de fouiller les blocs.

**P2 — titre technique résiduel dans le résultat.** Le livrable final affiche le sous-titre anglais `summary`, avant « Texte à reprendre ». Ce mot n’a pas été saisi par l’utilisateur. Le contenu de simulation et le bouton Copier sont compréhensibles, mais ce titre donne l’impression d’une donnée brute. Proposition : utiliser le libellé métier de repli ou le titre du document. Preuve : `complet/9-synthese-lisible.png`.

## Intention 2 — faire évoluer un modèle

J’ai créé « Synthèse réutilisable » dans Modèles, déclaré « Synthèse détaillée », puis renommé la sortie « Synthèse à transmettre ». Le graphe et l’étiquette du lien ont suivi le nouveau nom avec les accents. L’entrée du bloc de relecture avait son propre libellé ; j’ai pu le modifier aussi. Après réouverture depuis Modèles, les noms et la liaison étaient conservés. Les clés techniques sont restées stables : `Synthese_detaillee` pour la sortie et `synthese` pour l’entrée. Preuve : `complet/13-modele-revu.png` et `complet/template.json`.

## Verdict et erreurs du pilote

Adoption possible pour ces deux petites configurations, avec accompagnement au premier formulaire. Le routage et les noms métier sont nettement compréhensibles ; la double saisie des choix reste une friction évitable. Ce parcours ne qualifie pas la création graphique intégrale des liens, leurs destinations ayant été injectées explicitement comme fixtures.

Le premier script cherchait à tort un modèle de bibliothèque dans Workflows enregistrés. Il a été corrigé pour revenir par Modèles. Une autre itération avait oublié de fermer la fenêtre des résultats avant de naviguer : arrêt du pilote, pas défaut de l’application. Les premières extractions textuelles ne traversaient pas le Shadow DOM ; les captures restaient valides. L’extraction a été corrigée dans le script final. Les dossiers précédents conservent ces traces sans les présenter comme des régressions produit.

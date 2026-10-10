# Persona 05 — Product Manager B2B

**Verdict : parcours de recueil et suivi utiles, mais révision du plan insuffisante pour un PM ; un bug de libellé/action de blocage confirmé.** Les deux parcours ont été exécutés dans l’interface Electron du paquet v0.6.0-rc.13. Le second atteint `completed`, trois tâches reçues et action facultative locale `completed`.

## Cadre et méthode

- Profil : PM B2B, technique modérée, trois besoins client à transformer en plan, souhait de discuter le périmètre avant réalisation.
- Paquet : `/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/odoo-tricorder`, backend **du paquet**, aucune édition du dépôt/paquet.
- 10 octobre 2026, fenêtre 1440 × 950 ; DISPLAY :188 déjà fourni, laissé actif.
- HOME, Chromium userData, XDG et moteur isolés dans `isolated-home/` de ce dossier. Aucun projet/client réel. Aucun mail, Slack, connecteur distant ni appel à une IA commerciale.
- Lecture préalable du README et de `docs/WORKFLOW-RUNTIME.md`, puis de la fixture terminal et du test v2 pour le setup.
- Fournisseurs CLI locaux explicitement inertes, texte « FOURNISSEUR LOCAL SYNTHETIQUE — aucune IA reelle », sortie 78. L’arrêt de Codex constaté est **une conséquence du banc**, pas un bug produit.
- Plans et clarification produits de façon déterministe par les commandes validées `claim`, `ask`, `submit` du moteur packagé. Aucune modification SQLite/JSON d’état.
- Parcours 1 : modèle natif créé et lancé par GUI dans le terminal, `simulation=false`. Trois intentions, correction, réponse et refus effectués dans la GUI.
- Parcours 2 : nouvelle définition adaptée et démarrage via API/moteur **de setup**. Les enfants utilisent une question utilisateur pour représenter des livrables synthétiques ; ils ne réalisent pas des spécifications avec une IA. Décision, coordination, réception, navigation et action facultative effectuées par GUI. Cela qualifie le suivi/contrôle, pas un modèle commercial ni la qualité des livrables.
- Les scripts `session.cjs` et `continue.cjs` sont des contrôleurs interactifs du banc. Après un sélecteur de test erroné sur « Options » (résumé HTML, pas bouton), connexion Playwright CDP au **même Electron isolé** pour poursuivre. Cette erreur de harnais n’est pas un bug application. `trace.zip` couvre cette deuxième partie ; les captures couvrent les deux parcours.

## Parcours 1 — Trois besoins, clarification, plan puis demande de révision

| Étape | Attendu | Observé | Preuve |
|---|---|---|---|
| Choisir un workflow | Trouver un modèle multi-besoins compréhensible | « Nouvelle demande » propose « Intentions, plan et travaux » | `03-nouvelle-demande.png` |
| Préparer l’IA | Comprendre ce qui manque et revenir au lancement | Blocage nommé « Pour chaque élément du plan », « Modèle IA à définir explicitement » ; Choisir l’IA puis retour au lancement. Exigence d’un nom de modèle peu familière au PM | `05-config-lancement.png`, `06-choisir-ia.png` |
| Terminal principal | Garder le contexte de la conversation et du suivi | Terminal et suivi côte à côte ; arrêt du fournisseur synthétique annoncé, shell conservé | `07-terminal-lancement.png` |
| Recueillir | Entrer trois besoins et préciser une intention avant fermeture | Ajout, compteur 3 éléments, boutons Modifier/Retirer, modification de l’export CSV avec champs et restriction administrateurs | `09-trois-intentions.png` |
| Clarifier | Voir question, fournir réponse, conserver le plan à faire | Question « critères de notification ou envoi réel ? », réponse GUI « cahier des critères et brouillon uniquement » ; prochain bloc prêt | `10-clarification.png`, `11-reponse-avant.png` |
| Lire le plan | Voir but, critères, tâches et dépendances avant accord | Sections lisibles ; dépendance C rendue « Après : Spécification export CSV des contrats », pas seulement identifiant B ; commentaire facultatif et actions en pied | `12-plan-decision.png` |
| Demander modification | Enrichir le plan sans réaliser ni approuver | Seulement Approuver/Refuser ; refus commenté demandant revue UX **termine** l’exécution. Travaux et réception non applicables, aucun enfant créé | `13-plan-refuse.png`, `14-apres-refus-stable.png` |

**Manque de capacité M1, priorité produit élevée : révision du plan.** Le modèle natif ne propose pas « Demander une révision », édition du plan ou retour au planificateur. Le refus fonctionne correctement comme refus final, mais le PM voulant enrichir le plan doit préparer une nouvelle exécution ou dessiner une branche de révision. Le commentaire n’entraîne pas une révision. Aucune transition n’a été forcée. Contournement employé : nouvelle définition synthétique et nouveau plan avec revue UX explicite.

## Parcours 2 — Éditeur simple, suivi parallèle, attente et optionnel

| Étape | Attendu | Observé | Preuve |
|---|---|---|---|
| Éditer la méthode | Découvrir concurrence et complément sans JSON | Carte « Pour chaque élément » → Propriétés : collection, maximum 1…4, workflow enfant ; « Actions facultatives » et explication d’indépendance | `15-editeur.png`, `16-proprietes-parallele.png` |
| Ajouter complément | Créer un résumé local facultatif | Dialogue « Un document à préparer », contenu, absence d’envoi clairement expliquée ; enregistré dans workflow par GUI | `actions.log`, état définition du résultat final |
| Accepter nouveau plan | Nouvelle décision indépendante | Plan enrichi approuvé puis activation explicite du traitement, maximum 2 | `17-coordination-dependances.png` |
| Comprendre le parallèle | Distinguer deux éléments prêts et le troisième dépendant | Deux réponses attendues, un élément « En attente · Dépendances à terminer », dépendance B nommée | `17-coordination-dependances.png` |
| Voir le graphe | Voir intentions, plan et tâches concrètes | Cartes avec intentions, plan, décision et trois tâches ouvrables ; après Ajuster le graphe devient très petit à 36 % | `18-graphe-taches.png` |
| Ouvrir tâche bloquée | Retrouver la dépendance et l’action utile | **Bug B1 : enfant indique suspension explicite et Reprendre la demande** au lieu de l’attente de B | `19-enfant-bloque.png`, `20-enfant-bloque-stable.png`, `child-C-state.json` |
| Résoudre normalement | Finir B puis libérer C sans reprise manuelle | Retour parent, réponse sur B ; C passe de l’attente à « Réponse attendue » au rafraîchissement suivant ; aucune action Reprendre utilisée | `21-dependance-resolue.png`, `22-dependance-progression.png` |
| Recevoir le lot | Finir A/C puis décider sur les résultats | Trois enfants reçus, décision finale approuvée ; parent « Terminée », 5/5 étapes | `23-termine-facultatif.png` |
| Activer complément | Résultat principal indépendant, activation consciente | « Actions facultatives · 1 » → À activer → confirmation → Intervention attendue ; parent reste terminé | `24-action-decouverte.png`, `25-confirmation-action.png`, `26-action-active.png` |
| Valider brouillon | Lire contenu local et recevoir sans envoi | Contenu synthétique visible, preuve locale, « Aucune publication externe », validation GUI ; action et parent completed | `27-document-action.png`, `28-parcours-final.png`, `final-parent-state.json` |

## Bug confirmé B1 — Attente enfant présentée comme suspension manuelle

Priorité proposée **P2**, impact PM : le parent explique le blocage, puis ouvrir la tâche retire cette explication et suggère une reprise pouvant paraître nécessaire. Aucun clic sur la reprise n’a été testé ; aucune affirmation sur son effet n’est faite.

Reproduction : plan avec A/B indépendants et C `depends_on:[B]` → accepter → lancer les éléments → ouvrir C avant réception de B. Attendu : « En attente de Spécification export CSV des contrats », retour au parent, pas de reprise manuelle. Observé stable : « Suspendue », « Exécution suspendue par une action explicite », deux boutons « Reprendre la demande ».

État moteur en lecture seule : enfant `rcf5a80bf8ecf4b1d`, `driver=automatic`, `status=paused`, **`iteration_wait=true`**, question pending. `coordination_wait` / `coordination_hold` absents. Parent `{run:r8268f40473fd4b59,node:work,element:C,attempt:1}`, origin kind task. Le moteur libère ensuite C normalement à la réception de B. Il s’agit donc d’une présentation/action de suivi incorrecte, sans preuve de bug d’ordonnancement.

## Frictions observées et recommandations

1. **Révision prioritaire** : proposer « Demander une révision » avec commentaire, retour au planificateur et nouvelle proposition à décider ; ou expliciter au refus « ce refus termine la demande ». Garder tout accord lié à sa version précise.
2. **B1** : distinguer l’attente `iteration_wait` de la suspension humaine jusque dans le détail enfant ; montrer le nom et l’état du prédécesseur, offrir retour au parent, ne pas proposer une reprise manuelle comme remède.
3. **Graphe** : à 1440 × 950, Ajuster descend à 36 %, cartes presque illisibles et grande zone libre à droite. Le Détail de coordination est bien meilleur pour suivre trois tâches. Recommandation : disposition qui exploite la largeur, minimum de zoom lisible ou vue synthétique de tâches. Le comportement Ajuster n’est pas qualifié de bug bloquant.
4. **Données de recueil** : le résultat validé expose `Created`, `Updated`, timestamps epoch et ids techniques avec les intentions, alors que « Données techniques » existe déjà. Déplacer ces métadonnées au volet technique ; conserver le texte utile au PM.
5. **Action facultative** : le parent conserve le titre « Résumé facultatif pour comité produit », mais le détail affiche titre générique « Préparer le brouillon » et « Action facultative : Préparer le brouillon ». Conserver le nom de l’action pour éviter de perdre le contexte lors de plusieurs compléments.
6. **Préflight IA** : raison précise et parcours de réparation réussi ; le champ modèle reste un nom libre et demande une connaissance fournisseur. Proposer choix valides ou aide locale accessible pour le PM technique modérée.

## Bilan de clarté

- **Plan : bon** — but, critères et dépendances nommées facilitent la décision ; aucun travail lancé avant accord.
- **Tâches : bon dans le parent** — états, compteur et limites compréhensibles ; retour parent conserve le contexte.
- **Blocage : bon au parent, incorrect dans l’enfant dépendant** — B1.
- **Graphe : fonctionnel, moins lisible après ajustement global** ; le détail sert de contournement quotidien.
- **Optionnel : bon** — ajout découvrable dans les propriétés, activation et validation explicites, résultat principal indépendant.
- **Itération produit : insuffisante dans le modèle natif** — M1 ferme le parcours que le PM voulait enrichir.

## Preuves et nettoyage

28 captures PNG, dumps texte, `actions.log`, `child-C-state.json`, `final-parent-state.json`, scripts `session.cjs` / `continue.cjs`, `trace.zip` valide. Les dumps `body.innerText` omettent parfois la zone centrale ; les captures et dumps explicites `#studio-content` dans le journal servent alors de preuve.

Electron de ce banc fermé, deux contrôleurs terminés, `cleanupBroker` exécuté avec succès pour **le socket isolé seulement**. Aucun processus Electron/broker de ce HOME restant au contrôle. Aucun changement au dépôt/paquet, aucun build, aucune suite complète, aucun processus d’autrui arrêté. Les données isolées sont conservées ici pour audit ; serveur X :188 laissé actif.

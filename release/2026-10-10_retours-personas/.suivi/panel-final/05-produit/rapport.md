# Persona 5 — Responsable produit B2B

Agent jouant un persona, pas participant humain. Candidat figé `/tmp/tricorder-panel-final`, Electron réel sous DISPLAY=:93, fenêtre 1440 × 1000. Deux intentions ciblées, aucun rapport d’un autre persona lu avant les constats.

## Reprendre une synthèse finale

Je viens reprendre une revue produit qui rassemble support, entretiens et usage. Je m’attends à retrouver la décision, ce qui est reporté et les actions, puis copier ce bilan dans mon travail.

Premiers clics choisis : Workflows → Historique → Synthèse des retours produit → Voir les résultats. Le chemin est court ; « Terminée » et les deux étapes validées me donnent confiance. Dans « Livrable final », je ne vois pourtant que « Liste d’actions » et deux actions. Le texte de décision produit, présent dans la même étape finale, n’apparaît pas et aucun bouton Copier le texte n’est proposé. Pris au pied de la lettre, cet écran me fait croire que la livraison se limite aux actions.

J’ouvre « Résultats des étapes » : je retrouve alors la décision et le report sous « Synthese », puis les constats intermédiaires dans l’étape amont. Les noms d’étapes permettent de les distinguer ; le lecteur doit reconstruire la synthèse complète. Coût : un dépliage et une relecture des résultats détaillés, avec risque de transmettre les actions sans la décision qui les justifie.

Contournement réellement tenté : triple clic dans la synthèse puis Ctrl+C. Le presse-papiers ne contient que « Décision : prioriser la visibilité des imports. » avec saut de ligne ; le report et le responsable manquent. La copie native reste possible par une sélection plus soigneuse, mais cette sélection complète n’a pas été prouvée. Aucune copie complète en un bouton n’était disponible sur ce candidat.

Défaut bloquant pour mon usage régulier : le résultat final sélectionne la liste et masque le texte métier associé. Preuves : `04-resultats.png`, `04b-etapes.png`, `copie-manuelle.txt`, `execution.log`.

## Faire évoluer le modèle réutilisable

Je retourne dans Workflows → Gestion des workflows → workflows enregistrés et ouvre la définition. Je sélectionne « Conclure la revue produit ». Les critères par ligne, la provenance « Vient de : Regrouper les retours » et la séparation Utilise / Produit correspondent à ma façon de raisonner. Le contrôle de structure est explicitement distingué de la qualité métier et de ma validation humaine : compréhension satisfaisante.

J’ajoute « Chaque priorité cite le segment client concerné », puis « Recevoir un résultat existant… ». Je choisis le résultat segments de l’étape amont, le nomme « Segments concernés », clique Ajouter et relier puis Enregistrer. L’écran annonce Révision 2 — Enregistré et le lien porte « 2 données ». L’API de lecture confirme le nouveau critère et la liaison ; cette intention aboutit sans JSON ni identifiant technique saisi. Preuves : `05-modele.png`, `06-relier.png`, `07-modele-enregistre.png`, `modele-enregistre.json`.

Hésitations résiduelles : l’inspecteur étroit oblige à faire défiler pour retrouver validation et informations ; le nom affiché perd les accents (« Segments concernes »). Cela augmente le coût de lecture mais n’empêche pas ce changement simple. Je n’ai pas tenté la publication en modèle partagé ni une nouvelle exécution du modèle modifié.

## Verdict et limites

Adoption conditionnelle : oui pour adapter une définition simple, non pour reprendre et transmettre avec confiance une synthèse composée tant que le livrable final masque une partie de son contenu.

Fixture synthétique créée par Engine create_project/save/start/claim/submit/accept ; les résultats et l’acceptation humaine sont injectés par les commandes validées, sans analyse IA réelle. Fournisseurs inertes, aucun client, secret, accès fournisseur payant ni envoi. L’acceptation de la fixture ne prouve pas une décision métier humaine réelle. Le parcours interactif porte sur la réception et l’édition, pas la production des analyses.

Script autonome rejouable : `node release/2026-10-10_retours-personas/.suivi/panel-final/05-produit/parcours.cjs`. Échecs du pilote corrigés : chaîne Python mal échappée avant lancement de l’application et sélection ambiguë du bouton Fermer. Ils ne sont pas des défauts d’usage. Certaines premières captures étaient prises pendant une transition ; les captures finales ont été refaites après stabilisation. Aucune suite globale ni modification du code application par ce persona.

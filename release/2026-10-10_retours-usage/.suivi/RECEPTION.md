# Réception des retours d’usage

## Ce qui a été demandé aux six personas

Deux intentions métier chacun, en GUI Electron, sur un candidat figé ; noter
attente, premier clic, compréhension, hésitation, coût et contournement avant de
chercher une cause technique. Aucun rapport des autres lu avant les observations.
Le [mandat permanent](../../../docs/RECETTE-USAGE.md) reprend cette attente.

| Persona | Intentions éprouvées | Verdict sur le candidat A | Rapport |
|---|---|---|---|
| Fondateur SaaS/services | Huit clients et réunion multiple ; personnalisation d’un rituel hebdomadaire | Adoption accompagnée | [01](personas/01-fondateur/rapport.md) |
| Chef d’équipe services | Réponse ticket Odoo ; impact inconnu et texte d’email | Adoption accompagnée | [02](personas/02-services/report.md) |
| Développeur sceptique | Commande réelle en échec puis reprise ; modèle minimal | Suivi favorable, lancement local à clarifier | [03](personas/03-sceptique/report.md) |
| Opérations PME | Créer un accueil client ; compte rendu de deux réunions | Modèles accompagnés, création autonome difficile | [04](personas/04-operations/report.md) |
| Produit B2B | Arbitrage et synthèse ; adaptation d’un modèle d’entretiens | Suivi autonome, création accompagnée | [05](personas/05-produit/report.md) |
| Consultant multi-client | Adaptations Atlas/Boréal ; réponse, historique et retour | Suivi autonome, réutilisation accompagnée | [06](personas/06-consultant/report.md) |

Douze intentions ont été manipulées, avec captures et scripts. Les rapports
conservent les difficultés rencontrées ; leur verdict ne devient pas favorable
parce qu’un script réussit après un contournement.

## Corrections après le candidat A

| Constat d’usage | Correction portée au candidat B | Contrôle |
|---|---|---|
| Utiliser ouvre une création puis l’éditeur | Utiliser ouvre Nouvelle demande ; Créer une adaptation est séparé | Recette GUI usage-feedback et persona05 B |
| Sources des réunions implicites | Champs Réunions ou période et Notes/transcriptions/liens ; précision demandée si besoin | Recette GUI vérifiant la demande transmise |
| Noms métier acceptés puis refusés au save | Nom naturel converti en identifiant valide, doublons refusés dans le dialogue | Test unitaire, sauvegarde GUI et persona05 B |
| Utilise/Produit déborde des cartes | Retour à la ligne dans la carte | Géométrie des graphes et persona05 B |
| Liens et menus exposent analysis/answer/un élément | Noms métier et type de donnée, identifiants conservés dans le contrat | Recette du graphe et des liaisons |
| Une réponse semble transmise par un simple ordre | Explication de la liaison nécessaire, distinction explicite de l’ordre seul | Recette auteur et tests contrats |
| Propriétés difficiles à découvrir en panneau étroit | Le clic sur le bloc ouvre le panneau, Retour au graphe conserve le contexte | Recette compacte et persona05 B |
| Catalogue IA vide sans issue | État vide expliqué, actualisation et saisie avancée ; noms locaux lisibles si présents | Tests catalogue/picker et GUI avec catalogue synthétique |
| Rapport support/entretien rempli de termes logiciels | Même vocabulaire urgence/réponse que le suivi ; sections conditionnées aux blocs, références techniques repliées | Test rapport métier et persona05 B |
| Deux boutons voisins pour une question | Une seule action principale | Persona05 B |
| Commande locale paraît exiger une IA | Volet de lancement automatique déjà ouvert pour les étapes locales simples | Recette de lancement local |

## Points restant à améliorer

- Construire les échanges entre blocs reste une opération de conception : l’auteur
  doit déclarer l’information utilisée et la relier. L’interface ne crée pas
  silencieusement une dépendance en déduisant son intention.
- Le support demande systématiquement la destination de réponse, même si elle
  figure déjà dans la demande. Une suppression conditionnelle de cette question
  demanderait de qualifier l’extraction de destination par le fournisseur.
- Le lancement local est visible sans déplier le volet, mais la conversation
  garde la priorité visuelle même dans un workflow sans IA.
- Le modèle Commande locale avec validation garde réception du résultat puis
  décision finale ; cette double étape reste discutable pour un contrôle trivial.
- Le terminal conserve volontairement le choix visible/masqué ; il peut encore
  comprimer la liste. Le bouton Terminal permet de le masquer sans fermer sa session.
- Les demandes longues, la mise en avant immédiate du dernier livrable et la
  distinction entre composants simples et parcours complets restent à affiner.
- Les notifications nécessitent un adaptateur installé/connecté ; l’interface
  explique cette limite. Aucun parcours OAuth ni brouillon Gmail distant n’a été
  ajouté ou qualifié dans cette livraison.
- Les contrôles automatiques attestent un contrat d’exécution/données ; ils ne
  constituent pas une recette de la qualité métier des analyses IA.

## Portée et traçabilité

A : [empreintes du candidat initial](candidat-a.json). B :
[empreintes des corrections reçues](candidat-b.json). Le [candidat final](candidat-final.json)
ajoute uniquement dans `src/studio.js` la conservation du menu Gestion pendant
les actualisations et le mode compact sous 600 px de hauteur utile. Les questions
avec terminal empilé et la fermeture vers la zone de notification ont été rejouées
avec succès après ces corrections. Les tests utilisent des
projets temporaires, des fournisseurs inertes ou des fixtures moteur déclarées.
Le persona03 a réellement exécuté et repris une commande locale. Les autres
résultats ne prouvent ni recherche de réunions externes, ni diagnostic IA, ni
Gmail/Odoo/Slack. Aucun état moteur n’a été retouché pour forcer une transition.

Le premier passage de la suite UI a servi au diagnostic pendant les corrections ;
il ne constitue pas la réception du candidat final. Les preuves finales sont
consignées dans le README de cette release et les journaux de vérification.

# QA — Odoo Tricorder 0.2.0

Date : 11 septembre 2026. Données exclusivement synthétiques.

| Contrôle | Volume | Résultat |
|---|---:|---|
| Catalogue, séries et isolation documentaire | 10 tests | Vert |
| Sources, dépendances, profils, stack et explorateur | 7 tests | Vert |
| Adaptateurs natifs, confidentialité, périodes et attentes parallèles | 12 tests | Vert |
| Client de statut Codex, contrat en lecture seule | 2 tests | Vert |
| Rapports JUnit et attribution du volume | 4 tests | Vert |
| Vrais shells PTY, saisie, contexte et persistance | 4 tests | Vert |
| Parcours Electron depuis les sources | 2 parcours | Vert |
| Construction Debian amd64 | 1 paquet | Vert |
| Parcours Electron de l’exécutable empaqueté | 2 parcours | Vert |
| Empreinte SHA-256 du paquet final | 1 fichier | Calculée et vérifiée |

Les 39 tests Python passent. Les 2 parcours de bureau couvrent notamment :

- projets, preuves périmées, environnements et sources exactes ;
- vrais terminaux, clavier, collage isolé et même PID après fermeture/réouverture ;
- association session/tâche/flow/rôle, événement filtré, alerte rouge et notification ;
- temps et jetons mesurés via Odoo Crew, sans création automatique d’effort.json ;
- graphe, critères visibles et fiche de reprise portable ;
- fichiers reçus dans l’explorateur et recherche transversale ;
- palette Claude/Codex, profils, préférences persistantes ;
- dossier de travail personnalisé et portée conservée par un terminal existant ;
- volume de QA à partir d’une preuve JUnit synthétique.

Commandes : `npm test`, `npm run test:ui`, `npm run dist`,
`npm run test:packaged`, `npm run checksum`, `git diff --check`.

Paquet : `release/odoo-tricorder_0.2.0_amd64.deb`.
SHA-256 : `7a9e35eab4739609cc6d4bbe3ea2d729d0f19f778de2f06ab8e751f7caeaedc8`.
Les deux parcours sont rejoués avec l’exécutable empaqueté, pas seulement les sources.

## Reprises effectuées

- Navigation de fichiers pendant un chargement : la dernière demande gagne.
- Changement de profil : le dialogue reste ouvert jusqu’à l’actualisation ;
  création de terminal désactivée pendant le chargement.
- Critères remontés dans le suivi et portée par défaut explicitement « release complète ».
- Sous-agent identifié par agent_id : ses outils ne modifient pas l’état du parent.
- Résultat d’un outil parallèle : il ne résout pas une autre demande de permission.
- Temps de permission jusqu’à la fin d’un outil : borne haute, pas durée humaine exacte.
- Ancien service PTY : mise à niveau uniquement lorsqu’il ne contient aucun terminal.

## Portée de la validation

Les adaptateurs sont testés sur contrats/événements synthétiques ; aucune conversation
Claude/Codex réelle n’a été lancée, aucun prompt ni test facturé à un fournisseur.
Le CLI Codex installé et son schéma ont été consultés ; le lecteur runtime n’envoie
que des méthodes de lecture. Les versions natives futures restent susceptibles
de nécessiter une adaptation, signalée sans fabrication de mesures.

Notifications OS interceptées dans les tests : aucun message de test envoyé au bureau.
Home, historique shell et presse-papiers isolés. Aucune base Odoo ni production touchée.
Les captures dans `test-results/` sont locales et ne contiennent que des fixtures.
Cette validation accompagne la livraison GitHub v0.2.0 ; le paquet ci-dessus est
celui destiné au téléchargement. La CI vérifie également les sources publiées.

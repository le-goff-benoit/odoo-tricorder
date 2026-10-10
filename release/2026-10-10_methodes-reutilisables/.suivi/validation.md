# Validation du candidat 0.6.0-rc.18

| Contrôle | Résultat |
|---|---|
| `npm test` | 498 tests Python et 209 tests JavaScript verts : 707 au total |
| `npm run test:ui` | 211 cas : 206 verts au premier passage complet, 2 corrigés puis reçus séparément, 1 nouvelle régression reçue, 2 essais opt-in sur projets réels non exécutés ; recette complète du dernier candidat attendue en CI |
| `npm run dist` | Paquet Ubuntu amd64 fabriqué, version Debian `0.6.0~rc.18` |
| Parcours du paquet | 23 parcours distincts reçus ; 10 parcours pertinents revérifiés sur le dernier paquet après correction du choix IA temporaire |
| Contre-épreuve novice | Conservation du brouillon annoncée ; départ vierge efface texte/fichier/sélection ; aucune copie visible après annulation, y compris après sélection et application de l’IA |
| Revue indépendante | 31 contrôles ciblés et 10 contre-exemples directs verts, refus avant effet ; aucun appel de service réel |
| IA réelle | Quatre travaux Codex terminés sur deux notes synthétiques : compte rendu, trois actions et email ; aucune récupération externe ni envoi |
| Installation locale | rc.18 démarrée ; terminal vivant et paramètres byte pour byte préservés, accès complet conservé ; rc.17 disponible |

## Réception des deux derniers cas

Le contrôle hebdomadaire attendait le champ caché `weekdays` retiré au profit de
cases à cocher. Il vérifie désormais lundi/vendredi sélectionnés et les cinq
autres jours désélectionnés, puis le même calendrier dans la nouvelle occurrence.
Le test de formulaire lisait parfois la définition avant la fin de sa sauvegarde ;
il attend désormais le libellé effectivement conservé, sans affaiblir les assertions
sur les réponses obligatoires et les branches distinctes. La reprise isolée avant
correction avait déjà réussi ; aucun défaut produit supplémentaire n’est établi.
Aucun code applicatif n’a changé après le passage complet pour ces deux cas.

Les deux cas non exécutés utilisent explicitement `TRICORDER_REAL_PROJECT` et
`TRICORDER_LARGE_PROJECT`. La recette par défaut reste sur projets synthétiques.
Les parcours historiques ciblent explicitement l’éditeur détaillé ; les nouveaux
parcours et le panel utilisent la vue simple par défaut.

## Identité et preuve

Paquet : `odoo-tricorder_0.6.0-rc.18_amd64.deb`.
SHA-256 : `6351d72782d6daec2b12965da596415c43fa9b5bc14fcae0ae459225b7f6b0a4`.

L’archive `resources/app.asar` installée correspond à celle du paquet fabriqué.
[Installation](installation.json), [résultats techniques](validation.json),
[contre-épreuve novice](contrepreuves/01-03/note-correction-brouillon.md),
[contre-épreuve spécialiste et erratum](reception/09-expert/contrepreuve-final.md),
[IA réelle](ia-texte-v2.json).

Les journaux techniques bruts et traces Playwright restent sur la machine de
test ; ils ne sont pas des données client ni une qualification de service.
La vérification distante est consultable dans les
[Actions GitHub](https://github.com/le-goff-benoit/odoo-tricorder/actions/workflows/check.yml).

La CI de rc.17 signalait une comparaison de géométrie effectuée avant réception
du redimensionnement dans le renderer. Le test attend désormais la disposition
finale avec les mêmes contraintes de position et de conservation du terminal.
Contre-épreuves ciblées source et paquet réussies ; aucune modification de CSS ni de résultat
métier pour ce contrôle.

## Dernière correction avant publication

Le choix de l’IA dans une demande temporaire enregistrait une copie avant le
lancement. La nouvelle régression l’a reproduit, puis a reçu la correction.
Trois parcours pertinents passent depuis le code source et dix sur le paquet
reconstruit. Une contre-épreuve indépendante confirme la bibliothèque inchangée
après application du choix puis fermeture. Les modèles explicitement enregistrés
conservent leur choix IA durable.

[Contre-épreuve IA sans copie](contrepreuves/01-03/note-correction-ia-sans-copie.md).
La recette complète distante porte sur ce dernier candidat figé avant publication.

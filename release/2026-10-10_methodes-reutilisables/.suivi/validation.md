# Validation du candidat 0.6.0-rc.18

| Contrôle | Résultat |
|---|---|
| `npm test` | 498 tests Python et 209 tests JavaScript verts : 707 au total |
| `npm run test:ui` | 212 cas : 210 verts et 2 essais opt-in non exécutés sur le dernier candidat figé en CI |
| `npm run dist` | Paquet Ubuntu amd64 fabriqué, version Debian `0.6.0~rc.18` |
| Parcours du paquet | 210 parcours verts et 2 essais opt-in non exécutés en CI ; 34 parcours distincts contrôlés localement, dont 21 sur le dernier paquet |
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
SHA-256 : `2d9022ea21df8b1fde4fbb151833c40d94f7c9265ed4c4fce3d80ff2d903be38`.

L’archive `resources/app.asar` installée correspond à celle du paquet fabriqué.
Les 135 fichiers applicatifs sont identiques à ceux du paquet reçu en CI ;
les empreintes des conteneurs `.deb` propres à chaque construction sont conservées
dans les [contrôles locaux](paquet-local.json) et [comparaison CI](paquet-ci.json).
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
La recette complète distante est verte sur le commit produit `2741188`, avant publication. Le dernier commit ajoute uniquement les preuves de réception ; les fichiers applicatifs et le paquet installé restent identiques. [Résultat CI](https://github.com/le-goff-benoit/odoo-tricorder/actions/runs/38083937290), [preuve structurée](ci.json).

## Correction reçue après la première CI complète

La première CI du commit `f1741c9` termine avec 208 parcours verts, un échec
de liaison au clavier après déplacement et deux essais opt-in non exécutés.
Le clic résiduel était encore protégé comme une activation clavier. Une
nouvelle régression rouge reproduit le défaut avec un nettoyage retardé ;
la correction reçoit onze parcours de gestes en affichage isolé et vingt et un
parcours sur le paquet reconstruit. Les essais locaux interrompus avant le
scénario par une géométrie différente sur le bureau physique sont séparés de cette
réception. Aucun contrôle de résultat n’a été supprimé.

[Historique CI](ci-attempts.json), [décision et contrôle](decisions.md).

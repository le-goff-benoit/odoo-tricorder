# Réception du candidat et qualification de la livraison

La qualification complète de la livraison est consignée dans le
[manifeste joint à la release](https://github.com/le-goff-benoit/odoo-tricorder/releases/download/v0.6.0-rc.13/tricorder-0.6.0-rc.13-validation.json) : commit, exécution CI, nombres de
tests, empreintes et paquet exact livré. La publication exige la réussite de
la CI sur ce commit. Le DEB publié et installé provient de cette exécution CI,
qui vérifie les sources puis son propre paquet.

## Résultats locaux et dernière correction

| Contrôle | Résultat |
|---|---|
| Tests moteur et contrats Python, après correction du statut terminal | 438 réussis |
| Tests de présentation et contrats JavaScript | 158 réussis |
| Suite GUI complète avant la dernière correction de libellé, sources | 183 réussis, 1 échec, 2 contrôles optionnels ignorés |
| Même suite avant correction, paquet | 183 réussis, 1 échec, 2 contrôles optionnels ignorés |
| Paquet local avant correction du statut terminal : reprise et parcours I/O, plan, tâches, facultatif | 9 réussis |
| Relecture indépendante du libellé corrigé | 1 parcours reçu ; annulation, brouillon, session et conversation conservés |

L’unique échec des deux passages complets vient d’Activité : le nom de l’étape
masquait « Reprendre l’agent ». Le clic fonctionnait, mais son effet n’était plus
annoncé. La correction affiche l’action et l’étape ; l’assertion historique est
conservée et renforcée. [Diagnostic](panel-produit/corrections/activite-action/README.md)
et [réception indépendante](panel-produit/corrections/activity-reprise/RECEPTION-INDEPENDANTE.md).
Ces passages locaux ne sont pas présentés comme entièrement verts. La CI rejoue
les deux suites complètes de 186 tests, dont deux contrôles optionnels désactivés
parce qu’ils exigent des projets utilisateurs réels. Le manifeste de livraison
rapporte ses résultats effectifs, sans transformer ces attentes en résultats.

## Premier passage CI et actualisation du terminal

Le [premier passage CI](https://github.com/le-goff-benoit/odoo-tricorder/actions/runs/38050200544)
sur `ad8d4e7510c6` a reçu 183 parcours et en a échoué un, avec deux contrôles
optionnels ignorés. L'assertion échouée concerne l'affichage « Agent arrêté »
après le retour réel au shell. La suite du paquet n'a donc pas été exécutée.
Le [journal et le résultat](reception-finale/ci-premier-passage/result.json)
conservent cet échec séparément des passages locaux.

L'instrumentation observe le shell inactif à 1,310 s, le cache des sessions
actualisé à 5,017 s et le suivi à 5,765 s. Les rafraîchissements successifs
expliquent le décalage. Le service émet désormais la notification de session
existante quand son état prompt/commande change ; le texte ordinaire, un
marqueur étranger ou incomplet et un état inchangé ne déclenchent pas cette
notification. Aucun délai de test ni rythme de rafraîchissement n'est augmenté.
Le manifeste joint à la livraison identifie le passage CI final après correction.

Les deux nouveaux contrats Python échouent avant correction puis passent ;
les dix tests de terminal, cinq parcours GUI ciblés du développeur et un
parcours indépendant passent ensuite. La réception vérifie arrêt, commande
active, retour au shell et reprise explicite, avec le même terminal.
[Diagnostic et preuves](panel-produit/corrections/ci-terminal-status/DIAGNOSTIC.md)
et [réception indépendante](panel-produit/corrections/ci-terminal-status-review/RECEPTION-INDEPENDANTE.md).

Les services de terminal déjà vivants ne sont pas redémarrés lors de la mise à
jour locale. Ils conservent leur code et le rafraîchissement périodique. La
notification immédiate s'appliquera aux services démarrés avec la nouvelle
version ; relancer seulement la fenêtre ne remplace pas un service persistant.

Les autres défauts et ajustements de banc restent archivés :

- [Diagnostic du premier passage](premiere-recette-complete/README.md).
- [Course du banc support et contre-épreuves](reception-paquet-support-diagnostic/README.md).
- [Panel produit, corrections et limites](panel-produit/SYNTHESE.md).
- [Réaffichage du terminal compact](panel-produit/corrections/terminal-mise-en-page/README.md).
- [État frais et confirmation après fermeture du terminal](panel-produit/corrections/terminal-etat-frais/README.md).
- [Deux ordres de rafraîchissement après accusé perdu](panel-produit/corrections/collection-ack-race/RECEPTION-INDEPENDANTE.md).
- [Demandes longues et remplacement](REVIEW-LONG-REQUEST.md).
- [Registre des corrections](CORRECTIONS-A-RECEVOIR.md).
- [Relecture documentaire](REVIEW-DOCUMENTATION-FINALE.md).

## Preuves du candidat local

- [Résultat machine local et contrôles CI attendus](reception-finale/verification.json).
- [Tests Python et JavaScript](reception-finale/unit.log).
- [Contrôles sur le paquet final local](reception-finale/package-targeted.log).
- [Construction locale](reception-finale/build.log).
- [Comparaison sources, archive applicative et DEB local](build-validation.json).
- [Provenance des captures du candidat local](../captures/manifest.json).

Les empreintes ci-dessus concernent le candidat local. Celles du DEB publié,
issu de la CI, sont dans le manifeste et le fichier SHA256SUMS joints à la release.
Les captures présentent le candidat local identifié par leur manifeste, dans
des projets synthétiques ; elles ne prouvent pas l'actualisation du terminal
corrigée après le premier passage CI.

Les essais utilisent des fournisseurs inertes et des adaptateurs locaux ; ils
exercent de vrais processus, dépendances, commandes et intégrations de candidats.
Ils ne qualifient ni les modèles commerciaux, ni les services externes, ni une
release cliente Odoo. Les actions facultatives et les décisions humaines conservent
leurs contrats distincts.

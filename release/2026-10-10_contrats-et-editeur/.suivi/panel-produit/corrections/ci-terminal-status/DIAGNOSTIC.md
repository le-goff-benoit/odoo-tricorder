# Statut du terminal : notification du retour au prompt

Le seul échec du CI `ad8d4e` (run 38050200544) intervient avant le scénario « demande terminée », dans son `beforeEach` : le broker confirme `idleShell=true`, mais le suivi reste « À traiter dans la conversation » plus de cinq secondes. Les assertions métier et leurs délais restent inchangés.

## Cause vérifiée

`Terminal.prompt_output` reconnaissait bien le marqueur privé du prompt, mais n’envoyait pas l’événement `sessions`. Le bureau gardait donc son cache jusqu’au rafraîchissement périodique de cinq secondes ; le suivi de conversation le relisait ensuite à son rythme d’une seconde. Cette combinaison rendait le délai visible dépendant de la phase des deux horloges.

La trace CI prouve l’arrêt réel suivi d’un affichage périmé pendant 5 003 ms. Trois reproductions simples locales passent ; deux observations instrumentées passent aussi, mais l’une mesure exactement le défaut : broker au prompt à +1 310 ms, cache seulement à +5 017 ms, suivi à +5 765 ms. L’instrumentation CDP ajoute uniquement des observations ; elle ne remplace pas les états ni les réponses.

## Correction bornée

- `backend/terminal_service.py` : `set_prompt` émet l’événement `sessions` déjà compris par le bureau, uniquement si l’état change. Les marqueurs privés complets actualisent cet état. Une saisie qui quitte le prompt l’invalide aussi et notifie les clients, afin de ne pas garder « agent arrêté » pendant une commande active.
- `tests/test_terminal_service.py` : deux nouveaux contrôles. Le premier couvre marqueur privé complet, fragmentation, sortie ordinaire, marqueur étranger, absence de doublon et génération du prompt conservée. Le second utilise un vrai shell et un second client du socket : départ d’un vrai `sleep`, interruption, puis attente d’une saisie et retour normal au prompt, avec mêmes identifiant et PID.

Aucune modification des fichiers UI, des délais, des fréquences de polling ni du contrat synchrone `terminalStatus`. Le rafraîchissement périodique reste disponible pour la reconnexion et les autres changements de programme.

## Preuves

- Avant correction : les deux nouveaux tests sont rouges — absence d’événement au marqueur complet et absence de notification au client réel. Voir `tricorder-ci-terminal-notifications-red.log`.
- Après correction : 10/10 tests Python du terminal verts en 3,375 s.
- GUI source : 5/5 ciblés verts en 26,8 s — quatre scénarios `terminal-resume-ux` inchangés et scénario de navigation entre deux PTY, arrêt de l’agent et commande occupée.
- Observation après correction : retour au prompt notifié à +1 669 ms ; cache à +1 678 ms ; suivi arrêté à +1 818 ms. La propagation observée prend 149 ms. Scénario instrumenté vert en 5,1 s.
- Découverte globale : 438 tests Python (+2) ; 186 tests GUI inchangés. Les suites globales et le paquet relèvent de la qualification root.
- Écran synthétique :190 nettoyé, aucune fenêtre enfant. Aucun client, terminal utilisateur ou application active modifié.

Commandes :

```sh
python3 -m unittest discover -s tests -p test_terminal_service.py -v
DISPLAY=:190 XAUTHORITY=/tmp/tricorder-collections-panel/190/Xauthority python3 /tmp/tricorder-ci-target-source-run.py tests/terminal-resume-ux.spec.cjs tests/execution-interactions.spec.cjs --grep 'stopped agent is resumed explicitly|cross-project context|resuming an agent keeps|completed request offers|terminal identifies|closed conversation' --output=/tmp/tricorder-ci-terminal-ui-green --reporter=line
```

La dernière alternative du filtre ne sélectionne aucun cas ; les cinq cas exécutés sont explicités ci-dessus. Les états fermé/reprise sont également confiés à la réception indépendante.

Un service PTY déjà vivant conserve le code chargé avant mise à jour jusqu’à sa fin naturelle. Ses terminaux ne doivent pas être arrêtés pour appliquer ce correctif ; le polling de secours continue de fonctionner. Le correctif est reçu ici sur des brokers synthétiques neufs.

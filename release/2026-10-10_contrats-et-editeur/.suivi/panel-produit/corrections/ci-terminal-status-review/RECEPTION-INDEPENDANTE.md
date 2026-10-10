# Réception indépendante — synchronisation de l’état terminal

**Favorable sur le correctif source : 1/1 parcours indépendant reçu en 6,4 secondes.** Aucun code produit ni test partagé modifié par cette revue. Aucun parcours complet, projet client ou fournisseur réel exécuté.

## Cause et contre-preuve

La CI `38050200544`, commit `ad8d4e7510c6f740b26a3d8d9716230031296b98`, échoue dans la préparation du scénario « demande terminée », après `idleShell=true` du broker, avant le scénario métier lui-même. Pendant cinq secondes le suivi conserve l’état actif. Les 183 autres scénarios source passent ; ce run CI ne constitue pas une qualification verte. [Snapshot CI](rouge-ci/error-context.md) et trace ZIP conservés.

La lecture indépendante concorde avec la chronologie instrumentée du développeur : `prompt_output` modifiait l’état de prompt privé sans notifier le cache ; l’application attendait jusqu’à cinq secondes, puis le suivi son polling d’une seconde. Les preuves du développeur montrent le broker arrêté à +1 310 ms, le cache actualisé à +5 017 ms, le suivi à +5 765 ms. Les deux nouveaux tests de contrat sont réellement rouges avant correction (notification absente) puis verts après. Les [preuves du développeur](../ci-terminal-status/DIAGNOSTIC.md) distinguent ces observations de leurs tests.

## Relecture du correctif

`backend/terminal_service.py`, `set_prompt` : émission de l’événement existant `sessions` uniquement si `at_prompt` change. Le parseur n’appelle cette transition qu’après un marqueur privé complet ; le texte libre, les marqueurs étrangers et un fragment incomplet ne déclenchent rien. Un marqueur de prompt répété ne multiplie pas les notifications, mais incrémente encore `prompt_generation`, nécessaire à la reprise sûre.

La saisie d’une commande ou d’un contrôle quittant le prompt garde la précédente invalidation `at_prompt=False` et notifie désormais cette transition. Aucun changement des fréquences de polling, du contrat synchrone `terminalStatus` ou des délais de test. Les tests du développeur couvrent marqueurs/fragmentation et vrai shell avec un second client du socket ; journaux relus : 2 rouges avant, 10 tests Python verts après.

## Parcours indépendant reçu

| Transition réellement effectuée | Délai observé entre observation broker et suivi visible |
|---|---:|
| Quitter le faux agent par `exit` | 1 318 ms |
| Lancer `sleep 30` dans le shell | 801 ms |
| Interrompre `sleep` pour retrouver le prompt | 296 ms |

Chaque assertion de propagation est bornée à 3 secondes, sans augmenter le délai historique. Ce sont des mesures locales observées, pas une garantie de performance générale. Captures natives relues : « Agent arrêté » et action de reprise visibles au prompt ; pendant `sleep`, l’action de reprise disparaît et le terminal reste consultable.

La consultation pendant `sleep` renvoie `agentState=busy`, ne propose pas de dialogue et ne lance rien. Annuler la reprise au prompt garde le compteur à 1. Confirmer seul le fait passer à 2 ; même PTY `0f2026ef65c34e779fc10db36b44e9a1` et même PID **1906067** pendant tout le parcours.

Preuves : [journal vert](source-final.log), [scénario indépendant](status.spec.cjs), [chronologie](vert-independant-source/status-independent-real-pr-2fda7-g-or-duplicating-a-terminal/timeline.json), [IPC et compteur](vert-independant-source/status-independent-real-pr-2fda7-g-or-duplicating-a-terminal/evidence.json), [état arrêté](vert-independant-source/status-independent-real-pr-2fda7-g-or-duplicating-a-terminal/stopped-visible.png), [commande active](vert-independant-source/status-independent-real-pr-2fda7-g-or-duplicating-a-terminal/busy-without-restart.png), [empreintes candidat](candidat-SHA256.json).

L’essai préparatoire indépendant s’arrêtait plus loin parce que le banc envoyait Ctrl+C avant la réponse du clic « Retrouver » : la consultation trouvait alors légitimement le shell redevenu disponible et ouvrait le dialogue. Le banc final attend explicitement la réponse IPC `busy` avant d’interrompre la commande. Le journal préparatoire est conservé (`source.log`) ; ce n’est pas qualifié de défaut produit.

## Limites et suite

Cette réception utilise un broker synthétique neuf chargé depuis le backend corrigé. Les brokers utilisateur déjà vivants ne chargent pas le nouveau code à chaud : ils restent conservés, avec leur rafraîchissement périodique, jusqu’à leur fin naturelle. Aucun arrêt des terminaux ne doit être réalisé pour appliquer ce correctif.

La reconstruction du paquet et la réussite d’une nouvelle CI sur le commit corrigé restent distinctes. L’écran `:188` et les processus de test sont libérés. Aucun fournisseur commercial, service externe ou état client utilisé.

# Réception indépendante du terminal compact

**Favorable sur les trois critères demandés : suivi courant, conservation de la lecture historique, taille utile et session inchangée.** Trois parcours indépendants passent sur le build source corrigé : 3/3 en 20,9 s, puis 3/3 en 18,2 s lors de la reprise des captures en résolution native. Aucune modification produit ni test partagé par le réviseur. Aucun nouveau défaut bloquant confirmé.

## Environnement et méthode

Application Electron depuis la source construite et figée par le développeur ; affichage `:188`, HOME, XDG, état et broker temporaires. `codex` et `claude` sont des scripts inertes. Seul un vrai shell local synthétique travaille. Aucun projet client, fournisseur réel ou réseau métier.

La réduction reproduite passe de **1600×1100 à 1024×900 avec zoom 125 %**, soit **819×720 CSS**. Les tests utilisent les boutons visibles, le séparateur clavier et la molette. Un point d’observation CDP conserve l’objet public xterm ; il ne force ni scroll, ni fit, ni sortie. Le suivi lit `baseY`, `viewportY`, les dimensions et les id/PID des sessions. Les commandes attendues impriment des marqueurs construits par séquences hexadécimales : `COMPACT_LIVE` et `PTY_STILL_LIVE` n’apparaissent pas dans la commande tapée. Leur présence prouve une sortie exécutée, pas l’écho de saisie.

## Contre-épreuves reçues

| Critère | Déclencheur indépendant | Preuve reçue |
|---|---|---|
| Suivi du travail courant | 24 lignes produites, lecture au bas, masquer le terminal, réduire/zoomer, rouvrir puis saisie avec flèches et XOFF/XON | Sortie `COMPACT_LIVE` visible. Après commande : **11 lignes**, `baseY=viewportY=24`, prompt visible. Réagrandissement conserve la sortie et le processus. |
| Lecture volontaire de l’historique | 220 lignes produites, remontée à la molette, masquage puis réouverture compacte | Avant : 59 lignes, base/viewport **169/129**. Après : 11 lignes, **217/177**. L’écart de **40 lignes** au bas est conservé ; la fin du passage lu reste **HISTORY_181**. Aucun retour forcé au prompt. |
| Taille utile et PTY inchangé | Réouverture compacte, séparateur Home/End, maximisation puis retour, dispositions verticale/côte à côte | Minimum : **10 lignes, 159,8 px utiles** de terminal, panneau workflow 343,8 px. Maximum du séparateur : **20 lignes, 314,6 px**, panneau workflow 188,9 px. Retour large : 59 lignes. Même session et même PID ; sortie `PTY_STILL_LIVE` effectivement affichée. |

Les vérifications de taille attendent aussi que le rendu `.xterm-screen` entre dans son hôte ; constater une ancienne valeur `rows=60` avant le fit ne suffit pas. Les captures compactes finales ont été relues.

- [Sortie courante après commandes](reception-independante/results-native-captures/terminal-reception-current-29e1a-g-and-keyboard-flow-control/compact-current-after-input.png)
- [Historique conservé](reception-independante/results-native-captures/terminal-reception-volunta-070b4-hiding-and-compact-resizing/history-preserved-compact.png)
- [Taille minimale du terminal](reception-independante/results-native-captures/terminal-reception-compact-a0ebb-l-PTY-through-split-changes/compact-minimum-split.png)
- [Taille maximale du séparateur](reception-independante/results-native-captures/terminal-reception-compact-a0ebb-l-PTY-through-split-changes/compact-maximum-split.png)
- [Journal final](reception-independante/reception-native-captures.log) et [script indépendant](reception-independante/terminal-reception.spec.cjs)

## Lecture du correctif

`src/app.js` attend le premier rendu visible de xterm avant le fit, regroupe les demandes simultanées et annule une demande différée lorsque le terminal disparaît. Le fit conserve le suivi du bas seulement si la lecture était déjà au bas. Une session détruite libère l’abonnement temporaire. Le panneau empilé reçoit un minimum de 300 px dans le cas compact reproduit, sans réécrire la préférence sauvegardée lors d’un redimensionnement de fenêtre.

L’ancrage historique reste celui de xterm : lors d’une réduction de 59 à 11 lignes, la **fin** du passage lu et son écart au bas sont conservés ; la première ligne passe naturellement de HISTORY_123 à HISTORY_171. Le correctif ne promet pas de figer la première ligne lorsque la hauteur change.

## Transparence du banc et portée

Deux essais préparatoires de l’historique ont échoué sur des hypothèses du banc, avant réception : un événement de molette remonte ici trois lignes (il en faut plusieurs pour dépasser vingt) ; puis le banc exigeait à tort la même première ligne malgré la réduction de hauteur. Les journaux et états sont conservés. Ils ne représentent pas des défauts produit masqués. Le test final exige une remontée réelle, le même écart au bas et la même fin historique.

À 125 %, la capture Playwright découpait le rendu physique dans un rectangle 819×720. Les preuves finales utilisent `webContents.capturePage()` et mesurent bien **1024×900** ; aucun recadrage du produit. La reprise des trois parcours était motivée par cette correction de prise de preuve, sur le même build.

Cette réception qualifie le shell, les sorties et le redimensionnement reproduit. La hauteur de workflow citée est celle de son **panneau**, pas de la surface dessinée : dans l’éditeur compact, les en-têtes et commandes nécessitent encore du défilement. Aucun test d’application plein écran en terminal, de police personnalisée ou de fournisseur conversationnel réel n’est revendiqué. La qualification du paquet reste distincte.

Tous les Electron et brokers du banc ont été fermés ; `:188` est libéré. Les rapports, captures, phases JSON, journaux, script et empreintes source sont archivés dans [reception-independante](reception-independante/). Le rapport initial et les preuves de diagnostic de l’orchestrateur sont conservés inchangés.

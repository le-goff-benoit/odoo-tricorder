# Activité : annoncer l’action et l’étape

Le panel demandait de voir l’étape courante. Son ajout remplaçait l’action native
par le titre de cette étape dans Activité : un agent arrêté ne montrait plus
« Reprendre l’agent », bien que le clic ait toujours cet effet.

Le passage complet sur les sources a donné 183 succès, un échec sur ce libellé
et deux tests optionnels ignorés. La contre-épreuve indépendante sur paquet
confirme un défaut de présentation : confirmation, annulation, brouillon shell,
identité du PTY, conversation et dépendances conservent leur comportement.

La correction affiche l’action native et le titre d’étape. L’assertion de reprise
est conservée et complétée par celles du titre et de l’action réelle du bouton.
La réception du candidat et les suites finales sont consignées séparément.

La suite complète paquet se termine avec le même bilan : **183 succès, un seul
échec de libellé et deux tests optionnels ignorés**.
[Réception indépendante](../activity-reprise/RECEPTION-INDEPENDANTE.md).

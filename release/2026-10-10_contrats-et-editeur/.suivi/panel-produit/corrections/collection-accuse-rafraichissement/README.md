# Requalification du banc des intentions identiques

La suite paquet a rencontré une assertion qui exigeait un conflit alors que
le rafraîchissement avait déjà actualisé la révision. Les deux intentions étaient
conservées. Le diagnostic indépendant rejoue les deux ordres possibles et
vérifie que récupérer le premier accusé n’enregistre pas un troisième élément.

[Diagnostic et contre-épreuves indépendantes](../collection-ack-race/RECEPTION-INDEPENDANTE.md).

Les deux suites ont été interrompues pour intégrer ces cas déterministes au
banc partagé. Les journaux partiels ci-joints ne valent pas réception finale.
Le produit et le paquet sont inchangés pendant cette correction du test.

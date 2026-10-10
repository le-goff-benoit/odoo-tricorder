# Réouverture du terminal en vue compacte

La recette complète a détecté un terminal affichant une ancienne portion de son contenu après réouverture en vue compacte à 125 %. Une reproduction indépendante confirme que les commandes et contrôles XOFF/XON arrivent au PTY et que la commande est exécutée ; le défaut concerne la remise en page/position de lecture. Les deux suites ont été interrompues volontairement pour intégrer le correctif avant qualification finale. Les journaux partiels ci-joints ne valent pas réception finale.

Le correctif attend le rendu visible avant le redimensionnement xterm, regroupe
les demandes simultanées et annule les ajustements lors du masquage ou de la
fermeture. Il conserve la lecture volontaire de l’historique. Le panneau empilé
préserve une hauteur utile. Le scénario original est reçu deux fois, ainsi
qu’un nouveau contre-test de sortie effective, historique et session inchangée.
[Diagnostic développeur](reception-developpement.md). Les traces volumineuses
restent dans les chemins du [manifeste](manifest-traces.json) ; les diagnostics
JSON sont archivés ici. La réception indépendante complète ce contrôle.

**Réception indépendante favorable : trois parcours réussis.** Sortie exécutée
visible, ancrage de lecture historique conservé, au moins dix lignes utiles et
mêmes id/PID après changements de disposition. [Rapport et captures natives](RECEPTION-INDEPENDANTE.md).
La hauteur workflow mesurée désigne son panneau ; en édition compacte, les
commandes et en-têtes nécessitent encore du défilement pour atteindre le dessin.

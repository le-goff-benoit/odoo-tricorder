# Défauts vus en intégration avant livraison

- Identité terminal sans conversation : comparaison de deux références absentes,
  puis accès à provider ; corrigée par garde explicite. Campagne interrompue après
  confirmation de cette cause commune, puis vingt parcours historiques verts.
- Rendu de recherche avant la première conversation : même type de garde absent ;
  corrigé. Le parcours de réparation du modèle a ensuite été reçu.
- Le bouton du résumé « Valider le résultat » ouvrait seulement le détail et
  portait le même nom que la validation réelle. Renommé « Examiner le résultat ».
- Les tests qui recevaient plusieurs blocs ou revenaient d’une notification
  supposaient graphe et détail visibles ensemble. Ils suivent maintenant les
  commandes Graphe/Détail et vérifient que le mode de lecture est conservé.
- Le bouton d’une exécution terminée ouvre son rapport plutôt qu’un inspecteur vide.

Les journaux avant correction restent présents. La réception finale figure dans
les journaux de rejeu ciblé, de paquet et dans la CI du commit publié.

Les espaces de fin de ligne des journaux versionnés sont retirés ; leur contenu
et leurs résultats sont conservés. Les sorties brutes restent dans `/tmp`.

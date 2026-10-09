# Passation entre équipes — tour 2

Profil : chef de projet, métier 9/10, technique 3/10. Domaine synthétique : préparation d'une exposition associative.

Le paquet corrigé sera reçu avec son SHA avant tout lancement. Entrée normale de l'application, environnement neuf, fournisseurs Codex et Claude inertes, aucune donnée ni connexion extérieure.

| Parcours | Action métier | Résultat attendu |
|---|---|---|
| P1 — Modèle portable | Créer « Préparer une exposition », exporter puis importer dans le contexte d'une autre équipe. | Définition réutilisable ; aucun historique, preuve ni autorisation de l'équipe source transférés. |
| P2 — Dépôt cloné | Utiliser un dépôt Git local synthétique, y conserver les définitions, le cloner et reprendre le modèle dans le clone. | Découvrir le modèle du clone et comprendre quel contexte sera utilisé ; nouvelles exécutions indépendantes. |
| P3 — Archive et restauration | Archiver/restaurer un workflow puis un projet depuis l'interface. | L'objet restauré retrouve ses définitions et son suivi ; restauration et nouvelle exécution clairement distinctes. |
| P4 — Travail global vers projet | Partir d'un workflow global, l'associer au projet d'une équipe, puis suivre son travail. | Comprendre ce qui suit le modèle ou le projet, et où retrouver les exécutions déjà lancées. |
| P5 — Nouvelle version | Adapter le modèle pour une autre équipe après une exécution portant une preuve et une décision humaine. | La nouvelle version reste distincte ; le contexte, la preuve et l'autorisation de l'exécution originale restent lisibles et ne deviennent pas une autorisation nouvelle. |

Méthode : interface en premier ; inspection du code seulement après un constat. Toute création d'état d'exécution exceptionnelle passera par une API moteur du paquet et sera signalée comme fixture. Les sélecteurs traverseront le Shadow DOM. Les dialogues de fichiers natifs pourront seuls être remplacés par un chemin synthétique, l'import/export restant réel.

Rapport final : actions, attendu/observé, preuve, reproduction, gravité, prochaine action, limites, avis. Dix-huit captures maximum. Aucun build, suite globale ou commit du dépôt de l'application.

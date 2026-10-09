# Vérification des contenus à publier — rc12

Le dépôt GitHub est public. Le contrôle du 10 octobre porte sur les fichiers de cette release, les sources et tests modifiés, ainsi que le contenu textuel des archives Playwright. Il recherche les formats usuels de clés privées et de jetons GitHub, API et Slack. Aucun motif de ce type n’a été trouvé. Ce contrôle automatique ne remplace pas l’examen des captures.

Les adresses des données d’essai utilisent `example.invalid`, `example.test` ou `exemple.test`. Les deux autres domaines détectés appartiennent aux métadonnées publiques de dépendances npm dans `package-lock.json`. L’unique fichier `.eml` est la fixture fictive du premier panel, pas l’email client transmis dans la conversation. Aucun lien symbolique n’est présent dans les preuves de release.

Les captures des campagnes ont été examinées par leurs auteurs. Les cinq captures illustrant le README et les notes de release ont également toutes été ouvertes et examinées par le responsable sur le paquet final ; leurs empreintes et origines sont dans [le manifeste](../captures/manifest.json). Le responsable a aussi examiné les preuves visuelles critiques de décision, de branches, de pied de carte et de reprise. Il ne prétend pas avoir ouvert individuellement toutes les captures des campagnes.

Les détails du signalement utilisateur sont décrits de façon générique dans ANALYSE.md. Aucun email client, pièce jointe client, base cliente ou capture d’une session fournisseur authentifiée n’est publié. L’incident de banc du premier tour reste décrit sans republier sa capture retirée ; aucune conclusion sur un éventuel appel fournisseur n’est inventée.

Les rapports conservent les essais rouges, leurs diagnostics et les réceptions ultérieures. Les journaux de publication GitHub et les observations des sessions réelles pendant l’installation restent hors du dépôt.

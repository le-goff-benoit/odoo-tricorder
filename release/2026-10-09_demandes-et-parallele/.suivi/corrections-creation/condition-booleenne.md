# Contre-épreuve moteur : une condition reçoit Oui / Non

Origine : après le premier retour indépendant sur l’ambiguïté Paramètre / Issues, lecture ciblée du contrat des conditions. Le graphe accepte une sortie et une entrée de type boolean reliées à une condition avec issues `true` / `false`. Le moteur comparait pourtant le booléen aux identifiants texte : aucune des deux branches ne pouvait être choisie.

Reproduction isolée par `tests/test_condition_inputs.py`, sans agent, compte ou service distant : un classement booléen injecté doit sélectionner une seule branche et garder la décision humaine de celle-ci en attente. Le test rouge conserve deux échecs pour True/False et une erreur pour le paramètre global False ; les contre-exemples des mauvais types restent refusés.

Correction préparée dans les sources pendant que les cinq testeurs gardent leur paquet figé : une valeur réellement booléenne prend l’issue `true` ou `false` seulement quand ces deux issues sont explicitement déclarées. La valeur de donnée reste booléenne. Aucun nombre ou texte n’est converti en booléen et aucun sens n’est deviné pour des noms de branches arbitraires. La validation du résultat amont et le moteur emploient la même règle.

Réception ciblée : quatre tests de données/branches verts et les neuf tests de support/routage existants verts. Les accords humains restent en attente, sans validation ni effet automatique. Les anciennes exécutions des projets clients et leurs états ne sont pas modifiés. Il reste à rendre ce contrat clair dans l’éditeur et à recevoir les corrections consolidées dans le paquet suivant.

Ce constat est celui de l’orchestrateur après lecture et contre-épreuve, pas un verdict anticipé du testeur qui poursuit encore ses parcours GUI.

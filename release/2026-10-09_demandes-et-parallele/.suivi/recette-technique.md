# Vérification technique du paquet présenté aux cinq testeurs

Paquet initial de campagne rc12 : ASAR
`10b5f192d643fc9f33cffdf3f238bcd24cbf4f69dc5ba77bab7be92cff253237`.
Ces résultats ne valent pas réception fonctionnelle des cinq profils métier.

| Contrôle | Résultat |
|---|---|
| `npm test`, environnement sans CLI commerciaux dans le PATH | 306 tests Python et 103 JavaScript réussis |
| Première suite UI sur sources | 98 réussis, 2 défauts de layout reproduits, 2 tests réels optionnels ignorés |
| Après correction : alignements, question longue et petit écran | Les 3 parcours réussissent, assertions inchangées |
| `npm run dist` | Paquet Debian produit, sources/backend/ASAR comparés et archive extraite vérifiée |
| `npm run test:packaged`, affichage virtuel isolé | 100 parcours réussis, 2 tests sur projets réels optionnels ignorés |

La première suite a révélé une marge d’en-tête incohérente au zoom et un bouton
de réponse hors de la zone visible en disposition verticale avec une longue
question. Les corrections réutilisent la marge commune et donnent la priorité
à la question et au formulaire dans le panneau. Le test compact conserve une
exigence de visibilité complète du bouton.

Le parcours parallèle démarre trois vrais processus locaux de fournisseur
factice et vérifie l’absence de double lancement. Il ne qualifie pas un modèle
commercial, une intégration de code parallèle ou une release Odoo.

Les tests unitaires et le contenu du paquet sont identifiés par les manifestes
voisins. Les captures publiques proviennent du paquet, avec données synthétiques.
La campagne métier conserve séparément son paquet initial et les éventuels écarts
d’isolation dans [son protocole](testeurs/CAMPAGNE.md).

La publication et l’installation restent en attente de la consolidation des
cinq rapports et de la réception des corrections retenues.

# Campagnes de réception demandées

Modèle des testeurs : GPT-6.1 Sol, raisonnement high. Chaque campagne est indépendante ; les nouveaux testeurs observent l’interface avant de lire le diagnostic du code. Les premières campagnes utilisent des profils surtout BA/chef de projet, légèrement techniques. La quatrième emploie des spécialistes UX/UI ; la cinquième forme un panel de neuf niveaux techniques variés. Les avis d’agents ne sont pas présentés comme une étude auprès d’utilisateurs humains.

| Ordre | Demande | État | Preuves |
|---|---|---|---|
| 1 | Cinq profils métier, consignes différentes | Cinq avis reçus ; consolidation et corrections réalisées ; relecture indépendante et tests ciblés reçus | `testeurs/`, `corrections-round1/` |
| 2 | Cinq nouveaux objectifs après mise en place des retours | Cinq rapports reçus (25 parcours) ; corrections, relectures ciblées et 12 contre-épreuves GUI du paquet reçues. Paquet testé figé, empreinte ASAR `74bfb78a5261899b11de76f1f25e59a31753d086de0992f229e52141885cc058` | `testeurs-tour2/paquet.json`, `testeurs-tour2/` |
| 3 | Cinq testeurs création et configuration de workflows | Cinq rapports reçus (20 parcours avec limites explicites) ; corrections, relecture indépendante et 14 contre-épreuves GUI du paquet reçues (voir testeurs-creation/CONSOLIDATION.md et testeurs-ux-ui/VALIDATION.md) | Workflow vide, adaptation, blocs/I/O/branchements, agents/connexions, sauvegarde/réutilisation/lancement |
| 4 | Cinq spécialistes UX/UI | Cinq rapports reçus ; corrections, contre-revue et 18 contrôles empaquetés reçus (testeurs-utilisateurs/VALIDATION.md) | Navigation/vocabulaire, éditeur, terminal/suivi, états/erreurs, accessibilité/petits écrans |
| 5 | Neuf profils d’utilisateurs finaux, niveaux techniques variés | Neuf rapports reçus (27 parcours) ; consolidation et corrections réalisées, contre-épreuves et réception finale source/paquet reçues (corrections-panel/reception-finale.md) | Création, support, réunion, pilotage multi-projet, terminal, reprises, intégrations, planifications, accessibilité |

Chaque paquet reste figé pendant sa campagne. Un défaut est classé bug, friction UX, fonction manquante ou limite du banc. Les corrections confirmées sont implémentées puis reçues avant la vague suivante. Les manques d’architecture sont explicites ; une simulation ni un meilleur libellé ne les font disparaître.

Publication GitHub, README orienté produit avec captures et installation locale de rc12 restent prévues après les cinq campagnes et leurs corrections, dans le périmètre autorisé. Les données et releases clientes ne sont pas manipulées par les tests. Le paquet initial présenté au tour 1 et ses preuves sont conservés par empreinte, sans réécriture de l’histoire.

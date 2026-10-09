# Réception fonctionnelle par cinq profils métier

Campagne demandée le 9 octobre 2026, avant publication et installation de rc12.
Les cinq testeurs sont des agents GPT-6.1 Sol avec raisonnement high. Ils jouent
des profils métier légèrement techniques ; ce ne sont pas des utilisateurs
humains recrutés pour une étude ergonomique.

| Profil | Parcours principal | Rapport |
|---|---|---|
| Business analyst | Première utilisation, création, I/O, configuration et réutilisation | `1-creation-configuration/` |
| Consultant fonctionnel | Intention dans le terminal, email, support et compte rendu | `2-intention-terminal/` |
| Chef de projet | Demandes simultanées, dépendances, décisions et projets multiples | `3-projets-parallele/` |
| Responsable support | Erreurs, questions, reprise, historique et continuité après interruption | `4-support-reprise/` |
| Responsable de livraison | Vue d’ensemble, compréhension du résultat, ergonomie et connexions | `5-lisibilite-pilotage/` |

Chaque profil commence par les actions et informations visibles. Le code et les
API servent ensuite au diagnostic ou à préparer une fixture clairement annoncée.
Le besoin de connaître un identifiant interne, de saisir du JSON ou de lire le
code pour une action usuelle est une friction de parcours à signaler.

Les testeurs inventent leurs scénarios sans lire préalablement les rapports des
autres. Ils distinguent bug reproduit, difficulté de compréhension, manque
fonctionnel et limite de leur banc de test. Ils décrivent aussi les réussites.
Une fixture de fournisseur ne prouve ni le raisonnement d’un modèle commercial
ni l’accès réel à un email, Slack ou une base Odoo.

Le paquet testé est figé pour toute la campagne : `0.6.0-rc.12`, ASAR SHA-256
`10b5f192d643fc9f33cffdf3f238bcd24cbf4f69dc5ba77bab7be92cff253237`.
Chaque testeur possède un affichage virtuel, un HOME, un état et des terminaux
synthétiques séparés. Le protocole exclut les comptes clients, secrets, projets
actifs et opérations de production. Les transitions sont réalisées par les
commandes du moteur, sans édition directe de ses états.

Écart d’isolation relevé par le testeur3 : son premier broker terminal a conservé
le PATH de sa création et a ouvert un vrai CLI Codex après un redémarrage. Le
testeur l’a arrêté, puis a repris dans un runtime neuf avec fournisseur factice
vérifié, répertoires fournisseur synthétiques et clés retirées de l’environnement.
Aucune donnée métier réelle n’était utilisée. L’absence d’appel initial ou de
facturation n’est pas établie : un prompt peut être transmis dès le lancement.
Cet incident du banc de test est conservé dans son rapport et ne constitue pas
une qualification du fournisseur réel.

Les cinq avis seront regroupés avant modification du paquet. Les corrections
confirmées seront reçues à nouveau ; la réussite de la suite automatisée seule
ne remplace pas cette réception fonctionnelle.

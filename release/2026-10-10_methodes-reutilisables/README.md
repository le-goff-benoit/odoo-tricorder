# Des workflows compréhensibles et réutilisables — 0.6.0-rc.18

Tricorder permet maintenant de consulter une méthode avant de la choisir, de
fournir ses sources et de retrouver ses résultats depuis une vue simple. La
création guidée décrit le travail, les agents et leurs dépendances en langage
courant. L’éditeur détaillé reste accessible dans les options.

## Ce qui change pour vous

- **Modèles** présente des workflows complets. Les blocs à composer et les
  exemples de démonstration sont accessibles dans les options avancées.
- **Voir le workflow** montre l’objectif, les sources, les étapes, les agents et
  les livrables. Cette consultation n’enregistre aucune copie et ne lance rien.
- **Utiliser** prépare une demande. **Personnaliser une copie** enregistre votre
  variante. Abandonner une préparation ne multiplie plus les workflows enregistrés.
- **Support : comprendre et répondre** part d’un texte, d’un fichier, d’un email
  ou d’un ticket, distingue faits, impact et urgence, puis prépare une réponse
  dans le format choisi et vérifie ses affirmations contre la source.
- **Réunion : compte rendu et email** traite les réunions choisies avec leurs
  sources distinctes, analyse décisions et actions, puis remet trois livrables
  vérifiés : compte rendu, actions et texte d’email. Aucun envoi implicite.
- **Créer un modèle** demande un objectif, les sources attendues et les travaux.
  Une étape peut avancer en parallèle ; la synthèse peut attendre plusieurs
  résultats. Votre intervention peut être systématique ou limitée aux anomalies.
- **Agents** présente les spécialités et les packs. Le résumé précise si un
  travail est confié à la conversation principale ou à un agent distinct.
- **Choisir l’IA** propose des noms lisibles dans une liste ; vous n’avez pas à
  connaître les identifiants techniques. L’accès au modèle reste vérifié.
- **Résultats** place les textes utiles en premier, avec leurs boutons de copie.
  Le rapport conserve le plan, les décisions et les preuves dans des détails
  repliés ; ses tableaux restent lisibles.
- **Planifier** distingue le même texte répété des nouvelles sources récupérées
  avec une connexion de lecture vérifiée. Les jours de la semaine sont sélectionnables.

## Sources et demandes suivantes

Collez vos notes, ajoutez plusieurs fichiers ou indiquez précisément un message
ou document à retrouver. Les fichiers sont copiés dans un espace privé et
conservés avec leur empreinte. Une référence externe reste à récupérer : elle
ne prouve pas que le document a été lu. Une sélection ambiguë de réunions exige
une précision avant l’analyse.

Après fermeture d’une préparation, son brouillon est annoncé à la réouverture.
**Commencer une demande vierge** efface texte, pièces et sélection de réunions.
Une nouvelle demande conserve ses propres sources ; les résultats et décisions
des demandes précédentes restent intacts.

Pour une planification avec nouvelles sources, une occurrence sans élément ne
produit aucun livrable. Une lecture incomplète ou ne confirmant pas le périmètre
arrête le travail. Les éléments ne sont consommés et la période n’avance qu’après
succès ; un échec ou refus ne les perd pas. L’application et l’ordinateur doivent
rester ouverts. La connexion doit réellement prendre en charge cette recherche.

## Les retours ont changé le produit

Neuf personas ont effectué une découverte sur rc.17, puis neuf réceptions à froid
sur des candidats figés : assistante, dirigeant, opérations, support, consultant,
produit, chef de projet, développeur senior et spécialiste workflows. Elles
recevaient un besoin, sans onboarding ni chemin de clics. Les retours incluent
les abandons et problèmes majeurs, notamment les fichiers non joignables,
l’édition impossible d’une rédaction, les questions obligatoires manquantes et
la planification sans source renouvelée.

Ces difficultés sont corrigées. Des contre-épreuves indépendantes vérifient le
brouillon et les protections de planification. Le [journal des décisions](.suivi/decisions.md)
relie les constats aux changements et contrôles. Les rapports initiaux et les
incidents du dispositif restent conservés : une correction ne les efface pas.

Ce panel est joué par des agents. Il ne remplace pas une étude avec neuf humains
recrutés et ne démontre pas que tout utilisateur trouvera chaque parcours facile.

## Vérification et livraison

Les résultats techniques, l’identité du paquet et l’installation locale sont
consignés dans [.suivi/validation.md](.suivi/validation.md).

Une exécution Codex réelle sur deux notes synthétiques a terminé les quatre
travaux de lecture textuelle, analyse, rédaction et vérification. Elle produit
un compte rendu, trois actions et un email cohérent avec les notes, en conservant
les inconnues. [Preuve de cette exécution](.suivi/ia-texte-v2.json).
La [première sortie trop technique](.suivi/ia-texte.json) reste disponible.

Les tests contrôlés vérifient aussi des processus distincts, le parallélisme,
l’attente de tous les résultats, la transmission des sources et le refus d’une
planification trompeuse. Une simulation ne qualifie ni une IA ni un service externe.

## Limites connues

Les références Gmail et Meeting Minutes sont prises en compte dans la demande,
mais leurs connexions et un déclenchement automatique en fin de réunion ne sont
pas qualifiés par cette release. Un texte d’email prêt à copier n’est pas un
brouillon créé dans Gmail. Le déploiement GitHub → Odoo.sh conserve les décisions
sur cible et candidat exacts ; ses connexions et contrôles de version doivent
être configurés et éprouvés avant toute livraison réelle.

Les définitions et exécutions des projets clients existants restent inchangées.
La lecture simple les présente sans supprimer leurs contrôles ; les contrats,
révisions et journaux restent accessibles dans les détails.

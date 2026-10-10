# Tricorder 0.6.0-rc.15 — créer et suivre un workflow

Cette préversion rassemble les retours d’utilisation initiaux, leurs corrections,
une revue spécialisée de la conception/exécution et un nouveau passage des six
agents personas. La rc.14 intermédiaire était restée locale ; cette livraison
reprend donc aussi ses corrections depuis la préversion publiée rc.13.

## Ce qui change pour l’utilisateur

**Workflows** donne accès au travail **En cours**, aux **Modèles** et à
l’**Historique**. **Nouvelle demande** utilise le même catalogue. Les adaptations
par client restent accessibles séparément et un modèle inchangé ne recrée plus
une copie à chaque lancement. Les filtres des modèles sont conservés au retour.
Les modèles complets sont distingués des blocs à composer.

Depuis une exécution ou une release, un retour visible retrouve la liste.
Les durées affichent début, fin et temps total, attentes comprises. Un travail
terminé ne propose plus une fausse reprise. Revenir aux listes ou aux modèles
masque le terminal pour rendre l’écran lisible ; sa session est conservée.

Dans l’éditeur, les blocs indiquent ce qu’ils **utilisent** et **produisent**.
**Recevoir un résultat existant…** crée ensemble l’entrée et le lien vers le
producteur. La provenance est visible. Les nouveaux workflows utilisent les
contrats structurés ; les anciennes définitions restent inchangées. Le choix d’un
type de bloc explique son acteur et son comportement.

Une règle choisit l’information à comparer dans une liste. L’éditeur signale
une source absente et sélectionne la première information reçue lorsque la clé
précédente était seulement le défaut de création. Les choix humains acceptent
espaces et accents ; les références des branches restent stables au renommage.
Les autorisations d’opérations gardent leur sens précis.

Le mode de validation est visible pour les tâches guidées comme pour les agents.
Une revue humaine ajoute une pause ; un contrôle de structure peut poursuivre
jusqu’à une décision humaine ultérieure. L’interface distingue contrôle de
structure et approbation métier. Les paramètres fixes simples se configurent
par nom et valeur, avec JSON avancé disponible pour les structures complexes.

Le lancement d’une commande locale ne demande pas de modèle IA. Le modèle de
contrôle local comporte une seule décision finale, qui présente directement la
sortie et les preuves de la commande. Échec, diagnostic et tentatives restent
lisibles avant reprise. Les résultats finaux, y compris les listes de travaux,
apparaissent avant les étapes intermédiaires ; leur texte peut être copié.
Un titre court est facultatif et ne remplace pas la demande complète.

Les modèles IA sont choisis dans le catalogue local non secret, avec actualisation
et saisie avancée si nécessaire. Leur présence dans cette liste ne prouve pas
l’accès au fournisseur. Le modèle de réunion recueille période/réunions et sources,
puis sélectionne, analyse et prépare compte rendu, actions et brouillon.
Le support distingue nature et urgence ; sa consigne réutilise une destination
explicite et demande seulement une précision manquante ou contradictoire.

Les notifications expliquent les connexions nécessaires et conservent le brouillon
des paramètres pendant leur configuration. Aucun faux envoi email ou Slack n’est
présenté comme opérationnel.

## Réception et preuves

- [Première boucle des six personas](../2026-10-10_retours-usage/.suivi/RECEPTION.md).
- [Revue spécialisée complète](.suivi/expert/rapport.md), puis
  [contre-épreuves indépendantes](.suivi/expert/reception.md).
- [Réception des six personas après corrections](.suivi/RECEPTION.md).
- [Empreintes du candidat soumis au panel](.suivi/candidat-panel.json).
- [Protocole permanent de retours d’usage](../../docs/RECETTE-USAGE.md).

Le spécialiste a reproduit puis reçu les deux blocages de conception : source de
condition mal configurée et libellés naturels refusés comme identifiants. Il a
également éprouvé une commande réelle : échec code 7, réparation, reprise code 0,
accord final puis historique. Les rapports initiaux sont conservés ; les
contre-épreuves ne réécrivent pas les difficultés observées.

Les vérifications finales et l’identité du paquet sont consignées dans
[le bilan de livraison](.suivi/LIVRAISON.md).

## Installation

[Préversion et paquet Ubuntu](https://github.com/le-goff-benoit/odoo-tricorder/releases/tag/v0.6.0-rc.15).
Le fichier `SHA256SUMS` identifie le `.deb` livré. L’installation locale de cette
session utilise le lanceur existant dans `~/.local/bin/odoo-tricorder` et un
répertoire versionné sous `~/.local/opt/` ; la version précédente reste disponible.
Les données de travail et les projets existants sont conservés.

## Limites explicites

Les personas sont des agents jouant des rôles, pas des participants humains.
Les parcours déclarent leurs fixtures et simulations. Ils n’attestent ni la
qualité d’une analyse produite par une IA réelle, ni Gmail, Odoo, OAuth ou un
service externe. La reprise de commande locale est, elle, exécutée réellement.
Les deux tests facultatifs sur projets clients restent exclus de la recette.

Les noms de données personnalisés sont encore normalisés en clés techniques,
affichées avec des espaces ; leurs accents peuvent disparaître. Les libellés
des choix humains, eux, sont conservés séparément. Les collections avancées et
les adaptateurs nécessitent encore une configuration technique. Les paramètres
simples sont fixes : un formulaire générique de saisie au lancement n’a pas été
ajouté ; une Question ouverte permet de recueillir une valeur variable.

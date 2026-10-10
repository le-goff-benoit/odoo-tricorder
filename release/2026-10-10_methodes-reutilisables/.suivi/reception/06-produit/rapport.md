# Réception 06 — Responsable produit, première utilisation

Session du 10 octobre 2026, profil synthétique neuf, application Electron figée `/tmp/tricorder-method-review-v3`. Début de l'utilisation après démarrage vers 19:28 UTC ; dernier écran à 19:32:15 UTC. Moins de 8 minutes. Aucun onboarding, aucune lecture du code, README, tests ou rapports voisins. Les interactions métier passent par clics et frappe dans la GUI ; aucune API métier. Aucune exécution de fournisseur et aucune simulation qualifiée comme résultat métier.

## Intention et résultat

Créer ma méthode personnelle répétable « Note de decision produit » : analyser des options, puis rédiger une note, avec les rôles Analyse et Rédaction ; demander des informations à chaque lancement ; personnaliser un critère puis préparer une demande avec texte et fichier.

| Attendu | Observé | Preuve |
| --- | --- | --- |
| Trouver comment créer une méthode depuis zéro | Workflows → Modèles → Créer un modèle, sans aide externe | 01, 02, 03 |
| Décrire objectif et sources réutilisables | Champs Nom de la méthode, Résultat attendu et Informations à fournir au lancement remplis | 04, 09 |
| Méthode personnelle | J'ai choisi Sans projet après avoir découvert que la valeur par défaut était Modèles partagés. La méthode est créée sous Sans projet ; caractère personnel/privé non expliqué et donc non qualifié | 09, 11 |
| Deux étapes reliées | Analyser les options puis Rediger la note ; deuxième étape après la première, référence lisible | 06, 10, 11 |
| Agents Analyse et Rédaction | Deux rôles choisis, exécution par agent distinct ; vue enregistrée affiche « Agents : Analyse · Rédaction » | 08, 11 |
| Questions de lancement | Destinataire et Date limite saisis un libellé par ligne ; deux champs apparaissent ensuite à chaque lancement | 10, 13 |
| Personnaliser | Modifier cette étape → Points à vérifier : « Chaque option mentionne un avantage, un risque et une hypothese. » → Appliquer → Enregistrer. Confirmation « Workflow enregistré » | 12, 13 |
| Préparer demande textuelle | Utiliser → deux réponses, titre « Choix du suivi produit », texte de comparaison saisis | 14, 15, 16 |
| Ajouter fichier | Deux tentatives sur Ajouter des fichiers ; aucune pièce visible. Non qualifié à cause d'une possible limite du harness | 14, 15, 16 |

Je n'ai pas cliqué Démarrer le travail ni Simuler le parcours : intention de préparation uniquement, aucun résultat fournisseur à recevoir. La préparation textuelle est visible mais sa persistance après fermeture n'a pas été vérifiée.

## Parcours concret

1. Workflows. Écran En cours, vide. Je cherche une méthode et clique Modèles.
2. Créer un modèle. Je renseigne nom, résultat et informations initiales ; Enregistrer dans présente Sans projet et Modèles partagés.
3. Étape 1 : Analyser les options ; comparer les options/contraintes/informations manquantes ; Responsable Analyse ; comparatif et recommandation ; agent distinct ; démarrage au lancement.
4. Ajouter une étape. Étape 2 : Rediger la note ; note courte, recommandation et trois prochaines actions ; Responsable Rédaction ; note prête à relire ; agent distinct ; Après une étape → Analyser les options.
5. Ouvrir Informations complémentaires à demander au lancement. Questions Destinataire et Date limite. Choisir Sans projet puis Créer la méthode.
6. Vue de méthode enregistrée. Modifier cette étape sur l'analyse ; saisir un point de vérification ; Appliquer ; Enregistrer.
7. Utiliser. Renseigner Comite produit, Vendredi 16 octobre, titre, texte de demande. Ajouter des fichiers : aucun fichier confirmé. Défiler pour observer Démarrer le travail, Vérifier à nouveau et Simuler le parcours.

Les clics de contrôles natifs ont parfois nécessité une sélection au clavier plutôt que dans la capture. L'état final est confirmé par les captures : Analyse puis Rédaction, deux étapes, questions séparées.

## Retours substantiels

### 1. Portée personnelle peu explicite — gravité moyenne

Attendu : enregistrer ma méthode personnelle sans projet client. Observé : défaut « Modèles partagés », alternative « Sans projet ». Ni l'un ni l'autre ne dit qui pourra consulter la méthode ni où je la retrouverai. J'ai choisi Sans projet par déduction. Verbatim de réception : « Sans projet décrit un rangement, mais est-ce que c'est bien ma méthode à moi ? » Preuves : 09-destination, 11-cree. Amélioration souhaitée : expliquer la portée à côté du choix, ou nommer explicitement la destination personnelle quand elle existe.

### 2. Responsable et exécutant demandent un apprentissage — gravité moyenne

Attendu : assigner Analyse puis Rédaction. Observé : le champ Responsable contient des rôles ; un autre champ « Qui exécute cette étape ? » propose conversation principale ou agent distinct. Je dois différencier deux notions proches et je peux choisir Analyse sans avoir choisi un agent distinct. Le résumé final « Agents : Analyse · Rédaction » me rassure. Verbatim : « J'ai choisi Analyse ; pourquoi faut-il encore décider qui travaille ? » Preuves : 05, 08, 11. Amélioration souhaitée : préciser brièvement que Responsable est la spécialité et que l'autre champ choisit la conversation/exécution.

### 3. Informations importantes toujours facultatives — gravité moyenne

Attendu : demander des informations à chaque lancement pour éviter une demande incomplète. Observé : le formulaire décrit les questions comme facultatives ; les champs de lancement sont marqués facultatif. Je peux préparer Destinataire et Date limite, mais ne peux pas exprimer depuis ce parcours qu'une réponse est obligatoire. Verbatim : « Si je demande une date limite, je voudrais pouvoir la rendre nécessaire. » Preuves : 10, 13. Ce n'est pas un échec de génération des questions : elles sont bien reproduites. Il manque un choix de nécessité pour une méthode exigeante.

### 4. Découverte réussie, mais vocabulaire dense — gravité faible

Workflows contient En cours, Modèles et Workflows enregistrés. La phrase « Des méthodes réutilisables » rend Modèles compréhensible ; avant de l'ouvrir, je ne sais pas si Workflows enregistrés désigne mes méthodes ou des demandes sauvegardées. Verbatim : « Pour créer une méthode, Modèles paraît probable ; Workflows enregistrés paraît également possible. » Preuves : 01, 02. Conserver l'explication des méthodes et clarifier la différence entre les deux onglets.

### 5. Personnalisation aisée, consigne plus technique que prévu — gravité faible

Modifier cette étape est facile à trouver. Le texte Travail à effectuer contient désormais un assemblage « Objectif de la méthode », « Informations de départ », etc., alors que j'avais saisi seulement le travail de l'étape. Je n'ai modifié que Points à vérifier pour éviter d'altérer cette structure. Verbatim : « Je retrouve un gros texte préparé, pas juste ma phrase de départ. » Preuve : 12-modifier. Un aperçu distinct des informations communes aiderait à modifier ma consigne avec confiance.

## Abandon et limites

Pas d'abandon du parcours principal : création et personnalisation terminées, demande textuelle préparée. L'ajout de fichier est abandonné honnêtement après deux tentatives sans confirmation ; aucune réparation par API ni lecture des données internes. Fichier synthétique choisi : `/tmp/tricorder-reception06-source.txt`, petit texte de contexte produit (sans données réelles).

Incidents harness : premier démarrage sans TTY, stdin fermé ; application/broker de ce profil uniquement arrêtés et session recommencée avant le parcours. Le DOM de la fenêtre principale ne rend pas le contenu métier dans innerText ; les interactions métier ont donc utilisé des captures et coordonnées visibles. Le sélecteur de fichier n'est pas apparu dans la capture Electron ; une attente Playwright filechooser de deux secondes a expiré. Cela ne permet pas d'attribuer le problème à l'application. Le clavier envoyé au sélecteur supposé n'a ajouté aucune pièce. Aucun état n'a été modifié directement.

Profil final : `/tmp/tricorder-reception06-1791660498238`. Codex et Claude inertes (exit 78), modèle public synthétique fixture-model, aucune connexion réelle utilisée. L'application est fermée ; arrêt du seul broker de ce profil si encore présent.

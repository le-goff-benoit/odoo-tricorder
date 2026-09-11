# Revue temps et jetons — 11 septembre 2026

Revue en lecture seule du lecteur Tricorder et des outils partagés `odoo_usage.py`
et `odoo_effort.py`. Aucun historique personnel parcouru, aucune mesure client
réécrite, aucun collecteur fournisseur activé. Les constats ci-dessous ne signifient
pas que toutes les corrections proposées sont livrées dans la 0.2.6.

## Constats prioritaires

### 0. PC fermé, veille et reprise — priorité bloquante pour un temps fiable

Fermer seulement la fenêtre Tricorder conserve le broker et les processus : le
test Electron de réouverture vérifie le même PID. Cela ne prouve **pas** la reprise
après extinction complète du PC ; un processus PTY ne survit pas à un redémarrage.
La reprise d’une conversation Claude/Codex devra alors être explicite, sans
relancer une commande automatiquement ni afficher un ancien processus comme vivant.

La pause entre deux tours terminés est déjà exclue du cumul natif : la
contre-épreuve sur une nuit de douze heures donne 20 secondes de tours et
12 h 00 min 10 s d’enveloppe. En revanche, si une durée native couvre un tour
commencé avant la veille et fini au réveil, le lecteur accepte cette durée telle
quelle. Un chronomètre `start`/`stop` couvre aussi toute la veille. Aucun journal
de suspension système ne permet actuellement d’isoler cette période.

Critères proposés : enregistrer localement veille/reprise et changement de
démarrage système ; conserver l’état même si la fenêtre du cockpit est fermée ;
exclure uniquement les intervalles de suspension observés d’une mesure comparable.
Vérifier d’abord si la source native les exclut déjà, pour ne pas les soustraire
deux fois. Une longue absence d’événements seule ne prouve pas une mise en veille.
Sans trace suffisante, afficher « interruption non mesurée », pas une durée
reconstituée. Préserver les anciennes valeurs et leur provenance.

Tests à prévoir avec événements système simulés : veille pendant génération,
outil ou demande humaine ; reprise plusieurs fois ; cockpit fermé mais broker
vivant ; extinction imprévue ; horloge corrigée ; reprise dans une autre tâche.
Ne jamais mettre réellement le poste utilisateur en veille pour la recette.

### 1. Deux natures de temps sous une même colonne — priorité haute

Dans `odoo_effort.stop`, le réalisé est la différence entre l’heure d’arrêt et
l’heure de démarrage du chronomètre. Dans `import_usage`, c’est `active_seconds` :
l’union des intervalles de tours natifs terminés. Une pause humaine peut donc
rester dans le premier. Un tour en cours n’augmente pas le second tant qu’il n’a
pas de durée finale. Ni l’un ni l’autre n’est du temps CPU.

`report_data` additionne ensuite les secondes des agents. Deux agents travaillant
dix minutes simultanément représentent vingt minutes cumulées, pas vingt minutes
de délai. Le rapport conserve déjà une enveloppe temporelle et une union des
intervalles, mais l’interface ne les expose pas. Ces intervalles d’attribution
ne suffisent pas non plus à reconstituer exactement toute l’activité native.

Proposition : séparer « Temps cumulé des agents », « Délai écoulé » et « Attente
observée » ; conserver la méthode de mesure par ligne ; ne comparer que des
prévisions/réalisations de même nature. Une durée courante provisoire reste
distincte des durées terminées. Ne jamais retrancher une attente non prouvée.

### 2. Un compteur de cache absent masque tous les jetons — priorité haute

`odoo_usage._tokens` retourne `None` dès qu’un champ obligatoire manque, même si
entrée, sortie et total sont disponibles. Les tests existants imposent ce choix
prudent ; la contre-épreuve Tricorder `test_review_missing_cache_hides_other_valid_token_counters`
le reproduit. L’interface présente surtout le total natif, pas sa ventilation.

Proposition : conserver les compteurs connus champ par champ, avec complétude
indépendante ; afficher entrée, sortie, cache lu et cache écrit. Ne calculer un
coût que si les compteurs et les tarifs applicables sont suffisants. Un montant
équivalent API n’est pas une facture d’abonnement Claude/ChatGPT.

La normalisation Claude actuelle additionne correctement entrée hors cache,
cache lu et cache créé pour obtenir l’entrée totale. C’est bien la distinction
documentée par [Anthropic](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#tracking-cache-performance).
Le cache normalisé est une partie de l’entrée, pas un supplément à ajouter une
seconde fois au total. Les catégories exactes restent propres au fournisseur.

### 3. Écriture native en cours : disparition temporaire des mesures — priorité haute

`backend/observation.records` tolère une dernière ligne JSONL incomplète pour
l’état des agents. Mais `snapshot` fait ensuite relire le fichier par
`odoo_usage.read_usage`, qui refuse cette même ligne : toute la mesure devient
indisponible. La contre-épreuve `test_review_usage_disappears_on_partial_tail_then_recovers`
reproduit 9 secondes connues, puis `None`, puis 9 secondes après réparation.

Proposition : lire un instantané cohérent une seule fois, ignorer uniquement la
dernière ligne réellement inachevée, afficher la fraîcheur/complétude et préserver
les compteurs prouvés. Une corruption au milieu ou un changement d’identité doit
toujours être refusé. Ces deux tests caractérisent des limites, pas des correctifs.

### 4. Couverture fournisseur et sous-agents — priorité moyenne

Le lecteur Codex traite les `token_usage_record`. Le lecteur de service local
`backend/codex_runtime.py` retourne volontairement `usage: None`. Cela ne couvre
pas toute source de consommation Codex : l’App Server documente aussi un événement
[`thread/tokenUsage/updated`](https://learn.chatgpt.com/docs/app-server#turn-events).
Un adaptateur versionné est préférable à une déduction depuis le texte du terminal.

Côté Claude, les hooks affichent les enfants, mais leur durée/consommation n’est
pas automatiquement importée depuis leurs transcripts. La documentation de
[Claude Code](https://code.claude.com/docs/en/monitoring-usage#token-counter) expose
des compteurs par type, modèle et origine principale/sous-agent/auxiliaire. C’est
une piste de collecte, non activée ici. Les noms custom peuvent être masqués :
le rôle Odoo doit rester une attribution explicite, pas être deviné.

Proposition : provenance fournisseur/modèle/session/tour/requête et relation
parent-enfant ; déduplication par identité ; consommation inclusive/exclusive
explicitée. Ne jamais additionner un parent inclusif à ses enfants. Une session
commune à plusieurs tâches ne se répartit pas au prorata de leurs estimations.
Les périodes sans tâche attribuée doivent rester visibles à part : leur absence
du tableau des tâches ne doit pas être interprétée comme une consommation nulle.

### 5. Coût du suivi et leviers d’optimisation — priorité moyenne

Toutes les cinq secondes, les observations reparcourent les fichiers sélectionnés.
Le snapshot puis le lecteur d’usage effectuent deux lectures complètes. Le
parallélisme est borné à quatre et les scans simultanés sont évités, mais il n’y a
pas de cache par version de fichier.

Proposition : cache local invalidé sur remplacement/taille/mtime/identité, puis
lecture incrémentale vérifiée, sans serveur distant ni contenu de conversation
exporté. Mesurer CPU, octets lus et délai d’actualisation avant/après.

Pour les jetons, mesurer d’abord les entrées répétées, les sorties, le cache et
les reprises par tâche. Réduire les relectures et sorties d’outils inutiles, garder
des instructions stables et déléguer avec un contexte ciblé ; ne pas réduire QA
ou changer de modèle automatiquement pour faire baisser un compteur. Le cache
dépend du modèle et du moteur : voir la [documentation OpenAI](https://developers.openai.com/api/docs/guides/prompt-caching).
Ces pistes ne permettent pas de chiffrer une économie réelle sans référence mesurée.

## Implémentation du 11 septembre — 0.2.7

Les chronomètres Crew démarrés avec les outils mis à jour enregistrent l’identité
du démarrage et les horloges Linux MONOTONIC/BOOTTIME. Le temps éveillé reste
lisible avant l’arrêt, sans écriture du registre par le cockpit. La veille est
exclue, même fenêtre fermée ; un redémarrage ou une ancienne borne sans horloge
donne une mesure interrompue, pas une durée reconstituée. Aucun journal client
ni ancien bilan n’est modifié. Les attentes hors veille restent incluses.

Les compteurs disponibles sont conservés champ par champ. Claude additionne
entrée ordinaire et caches seulement lorsqu’ils sont tous connus ; Codex garde
ses cumuls, sans les additionner. Aucun tarif calculé si le cache requis manque.
Le cockpit affiche entrées/sorties/cache par tâche sans ajouter natif et import.
Un fragment de dernière ligne JSONL non terminée est toléré après un préfixe
valide ; une corruption au milieu reste une erreur.

Restent hors de cette correction : exclusion de veille dans une durée native
sans trace système, nouveaux adaptateurs de compteurs, collecte des sous-agents
Claude, lecture incrémentale et benchmark CPU. Aucun gain de consommation
facturée n’est revendiqué. La veille réelle du poste n’a pas été déclenchée :
les transitions d’horloges sont simulées dans les tests.

## Validation et suite proposée (référence 0.2.6)

- 24 tests du lecteur partagé rejoués : déduplication Claude, compteurs cumulatifs
  Codex, cache, fenêtres, forks, chevauchements et données inconnues.
- Quatre contre-épreuves Tricorder ajoutées pour la nuit entre tours, la suspension
  indéductible à l’intérieur d’un tour, le cache absent et le JSONL incomplet.
- Livré côté interface : répartition initial/révisé/réalisé par rôle dans chaque
  tâche, pourcentages tâches/agents sur le temps connu et motifs des relevés
  incomplets, sans mélange enregistré/natif ni invention d’un rôle manquant.
  Les relevés disponibles sont lisibles avant clôture, avec un test de mise à jour.
- Ordre proposé : contrat des mesures et veille/reprise → instantané/compteurs partiels → ventilation
  des jetons → adaptateurs/sous-agents → cache incrémental et benchmark.
- Avant toute évolution du registre : compatibilité des anciens rapports et
  données conservées, tests timer/import, simultanéité, reprise, modèle mixte,
  cache absent, doublons et fenêtre coupant un tour. Pas de migration historique implicite.

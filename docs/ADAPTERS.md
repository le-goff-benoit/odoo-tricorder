# Observation native

## Activation et contrats

Depuis **Agents → Associer une session**, choisir portée/rôle avant la source.
L’association ne revendique aucune étape Odoo et ne prouve aucune validation.

### Claude

**Préparer Claude avec hooks** produit un fichier de paramètres par lancement,
dans le dossier privé de Tricorder. Copier la commande dans le shell et suivre
les confirmations de confiance Claude. Aucun paramètre global ni skill n’est réécrit.
Préparer une nouvelle commande pour un nouveau lancement.

Les hooks retiennent identifiants, parent/enfant, type d’événement, nom d’outil et
date de réception. Ils ne renvoient aucune décision et ne conservent ni prompt,
arguments, sortie d’outil ou réponse finale. `agent_id` distingue l’activité du
sous-agent de celle du parent. Contrat : [hooks Claude Code](https://code.claude.com/docs/en/hooks).

Un historique Claude JSONL existant peut aussi être associé pour ses mesures.
Il ne contient pas nécessairement les événements de permission ou sous-agents.

### Codex

- Historique JSONL : métadonnées de session, tours, outils et compteurs reconnus
  par Odoo Crew. Le contexte hérité d’un fork est exclu grâce à sa frontière propre ;
  si elle manque, la lecture est refusée. Les exports horodatés App Server sont
  normalisés sans inventer les durées absentes.
- Identifiant exact : lecture du service existant via `codex app-server proxy`.
  Seules l’initialisation, `thread/read` sans tours et `thread/list` filtré par
  parent sont autorisées. Aucun démarrage, reprise, message ni permission accordée.
  Chaque parent affiché est confirmé ; sous-agents directs limités à 30.

La lecture sans reprise et les états runtime sont décrits dans
[Codex App Server](https://learn.chatgpt.com/docs/app-server). Le schéma du CLI local
a également été consulté. La disponibilité du proxy dépend du CLI installé ;
Tricorder n’a pas de clé fournisseur propre et ne démarre pas le daemon.
Un sous-agent peut être associé séparément pour voir ses descendants.

## Attentes et mesures

- Le « ! » rouge persiste jusqu’à résolution par un événement ultérieur. Au-delà
  de 90 secondes sans événement, l’activité actuelle est signalée inconnue :
  une ancienne attente n’est pas effacée silencieusement.
- Notification à l’entrée en attente lorsque la fenêtre n’a pas le focus ; sa
  réception visuelle dépend aussi du bureau et du mode Ne pas déranger.
- Seules les périodes d’attente fermées sont mesurées. Une attente ouverte n’a
  pas de durée finale. Le polling runtime ne fabrique pas de temps d’attente.
- Une fin d’outil après une permission ne donne qu’une borne haute (décision +
  exécution). Elle n’est pas présentée comme du temps humain mesuré. Seules les
  résolutions explicitement horodatées permettent cette mesure.
- `odoo_usage.py` conserve les inconnues, vérifie identités/bornes/compteurs.
  Sources limitées à 64 Mio ; dernière ligne partiellement écrite ignorée pour
  l’observation, mesure inconnue si le lecteur natif ne peut pas la lire.
- Les fenêtres d’une identité native ne se chevauchent pas, même avec une copie
  de fichier. La lecture de statut runtime n’entre pas dans les sommes.
- Le réalisé consolidé et les observations natives ne sont jamais additionnés.
  Vérifier lot/rôle avant d’exécuter la commande de consolidation préparée.

## Volume de QA

Déposer `junit*.xml` ou `test-results*.xml` sous la release. Attribution optionnelle :

```xml
<properties><property name="odoo.task" value="T02"/></properties>
```

Les compteurs sont par rapport, pas cumulés entre relances. Sans attribution
explicite, le rapport reste au niveau release. Sans rapport, le volume reste non
renseigné ; `qa.md` et `recette.md` sont proposés s’ils existent.
Les textes d’échec ne sont pas repris dans les compteurs mais restent dans la preuve.

## Conservation

Associations/profils dans `settings.json`, hooks filtrés dans `observations/`
(`0600`, dossier `0700`, 64 Mio par lancement). Aucune suppression ou réécriture
des historiques natifs. Retirer une association ne supprime pas les fichiers.
Les lectures runtime et notifications cessent à la fermeture de l’application ;
les hooks déjà lancés continuent d’enregistrer leurs métadonnées locales.

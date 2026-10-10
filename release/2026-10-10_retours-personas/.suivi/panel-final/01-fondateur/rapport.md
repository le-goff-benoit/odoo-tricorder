# Persona 1 — Fondateur SaaS / services

Recette indépendante du 10 octobre 2026, candidat construit `/tmp/tricorder-panel-final` version 0.6.0-rc.15, vraie fenêtre Electron sur DISPLAY=:93, 1440 × 1000. Agent jouant le persona, aucun participant humain. Aucun rapport des autres personas consulté. Le code de l’application n’a pas été consulté pour choisir les clics ; le harness existant a fourni le dispositif de lancement et les fixtures.

**Verdict : adoption favorable pour le suivi et la préparation guidée, dans le périmètre observé.** Les deux intentions sont accomplies. Je sais quelle demande attend ma réponse et je retrouve le livrable d’une demande nommée. La qualité de l’analyse IA et une routine exécutée automatiquement selon un calendrier restent non qualifiées.

## 1. Retrouver plusieurs clients et comprendre quand intervenir

Mon attente : voir mes clients et savoir où débloquer le travail, sans ouvrir chaque workflow. Mon premier choix est « Renouvellement contrat Atlas » dans Activité : son statut « Réponse attendue » et le sous-titre « Confirmer le périmètre » justifient une intervention. Orion est visible simultanément avec une autre question ; le bilan terminé est séparé sous « Autres exécutions ».

À l’ouverture, je comprends immédiatement la question « Atlas souhaite-t-il inclure le support du samedi ? ». « Répondre à la question » m’amène au champ libre ; j’écris « Non, support du lundi au vendredi seulement. » puis clique « Répondre ». L’état devient « Terminée » et cette demande sort de la zone À traiter, où Orion reste présent. Aucun identifiant technique ou terminal n’est nécessaire.

Hésitation mineure : ouvrir une demande depuis Activité active « Projets » et « Client Atlas » dans la navigation. Je remarque un changement de contexte que je n’ai pas demandé, mais le titre de demande et « Retour à la liste » conservent mes repères. Coût observé : trois clics et une saisie pour traiter la question ; un clic de retour pour revenir à la vue transversale. Aucun contournement ni abandon.

Preuves : `01-accueil.png`, `02-demande-atlas.png`, `02b-reponse.png`, `02c-atlas-traite.png`, `03-nouvelle-demande.png` et leurs instantanés accessibles `.txt`.

## 2. Préparer plusieurs réunions et retrouver le livrable

Depuis l’accueil, je choisis « Nouvelle demande » : je veux confier un travail. La liste de modèles me fait hésiter devant « Clôture de réunion », au singulier. Je l’ouvre parce que c’est l’option la plus proche de mon besoin. Le formulaire suivant dissipe l’incertitude : « Réunions ou période à analyser » et « Notes, transcriptions ou liens des réunions » mentionnent explicitement plusieurs réunions. « Aucun document n’a encore été lu » situe correctement l’avancement.

Je sélectionne Client Atlas, nomme la demande « Synthèse hebdomadaire Atlas », précise les comités du lundi 5 et jeudi 8 octobre et colle deux notes distinctes. Le formulaire permet de préparer les sources sans régler les blocs. Pour ce mandat sans fournisseur réel, je choisis explicitement « Simuler le parcours ». La simulation finit avec le titre court et l’indication « Aucun modèle ni service métier appelé ».

« Voir les résultats » ouvre directement « Livrable final » : liste d’actions avec responsable et échéance, brouillon, compte rendu. Je n’ai pas à rechercher ces contenus dans le journal technique. Je ferme cette vue, passe par Workflows → Historique, retrouve « Synthèse hebdomadaire Atlas » avec Client Atlas, la date et Simulation, puis rouvre les résultats. Coût du retour au livrable depuis la navigation : quatre clics. Aucun contournement technique ni abandon.

Hésitation restante : la première liste de choix mêle modèles métier, développement et éléments très génériques (« Analyse », « Communication »). Sans connaissance préalable, elle impose de parcourir une vingtaine d’options. Le choix réunion a néanmoins été trouvé au premier essai. Conséquence limitée ici ; aucune conclusion pour une bibliothèque beaucoup plus grande.

Preuves : `04-preparer-reunions.png`, `05-sources-renseignees.png`, `06-reunions-terminees.png`, `07-livrable.png`, `08-retrouver-historique.png`, `09-livrable-retrouve.png` et instantanés `.txt`.

## Limites et rejouabilité

`parcours.cjs` est autonome : `node release/2026-10-10_retours-personas/.suivi/panel-final/01-fondateur/parcours.cjs`. Il crée un HOME et un état isolés dans /tmp, deux clients fictifs et trois exécutions initiales exclusivement via les commandes Engine. Les exécutables codex/claude sont inertes (sortie 78). La demande réunions est préparée puis simulée depuis la GUI ; les contenus affichés sont des exemples fournis par le modèle, pas une synthèse des notes collées. Aucun fournisseur, calendrier, envoi email, qualité métier ou planification récurrente n’est certifié.

`fixture.json` décrit les fixtures ; `run-check.json` est une lecture API finale ; `execution.log` contient le parcours final achevé. Le script a été enrichi par étapes sur des environnements neufs après observation des écrans. Une erreur initiale de pilote (sélecteur Workflow ambigu entre un contrôle caché et celui du dialogue) a été corrigée en ciblant le dialogue ; elle n’est pas un blocage d’usage. Les premières captures utilisaient une attente trop courte, corrigée avant les preuves finales. Les fichiers `erreur.*` correspondent à cette ancienne erreur de pilote et ne sont pas les preuves finales.

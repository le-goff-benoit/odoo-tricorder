# Persona 03 — développeur senior sceptique

Candidat observé : `/tmp/tricorder-usage-candidate-a` (candidat immuable). Essai du 10 octobre 2026, interface Electron réelle pilotée par Playwright. Aucun code applicatif ni rapport des autres personas lu avant ou pendant les constats. L'ancien script de cette persona a servi exclusivement au lancement et à l'isolation.

## Position d'usage

Je veux comprendre ce qui sera exécuté, sur quels fichiers et ce que mon clic va déclencher. Je considère une sortie de test verte insuffisante si les libellés suggèrent autre chose. J'accepte un formulaire technique pour une commande locale ; je veux que sa commande soit visible en premier.

## Parcours 1 — commande locale, échec puis reprise

**Attente.** Adapter une commande Python locale, lire son vrai échec, corriger le fichier, relancer uniquement cette étape et retrouver un résultat terminé avec durée et historique.

**Premier clic.** Workflows → Modèles → Commande locale avec validation → Utiliser. Projet synthétique « Essai développeur sceptique », workflow « Vérifier un script local ».

**Constat.** L'éditeur permet de modifier nom, critère et commande. Les zones Éditeur / Exécution et la révision enregistrée distinguent correctement configuration et exécution. La commande et ses arguments sont cependant sous la limite de l'écran, après les informations du bloc et les réglages QA/organisation. « Produit : Aucun résultat déclaré » ne laisse pas deviner la sortie de la commande.

**Conséquence / contournement.** Je cherche d'abord où écrire le programme ; je dois défiler. Placer commande et arguments avant les propriétés génériques ferait gagner une vraie étape de compréhension. Preuve : `05-proprietes.png`.

**Constat au lancement.** « Exécuter… » ouvre un dialogue dont le bouton principal est « Lancer dans le terminal » ; il propose d'expliquer la demande à l'agent OpenAI Codex. Ce workflow ne contient pourtant aucune tâche IA. Le vrai lancement de commande est caché sous « Exécution automatique sans conversation ».

**Conséquence / contournement.** Je peux croire qu'un fournisseur est nécessaire pour lancer Python. J'ouvre ce volet et choisis « Lancer l’exécution réelle ». Preuves : `06-lancement.png`, `06b-lancement-local.png`. Priorité P1 de compréhension.

**Échec réel.** `python3 /project/check.py` retourne réellement 7. Le message `CAUSE_EXPLICITE: valeur incorrecte`, le code retour, les tentatives disponibles et « Relancer cette étape… » sont lisibles directement. Aucune consultation du terminal nécessaire. C'est une amélioration concrète. Preuves : `07-echec.png`, `08-diagnostic.png`.

**Reprise réelle.** Le fichier synthétique est corrigé hors de l'application, comme avec un éditeur de code. Le dialogue demande la correction et son bouton « Relancer maintenant » annonce exactement l'action réalisée. La tentative 2 retourne 0 et `CORRECTION_VERIFIEE: valeur correcte`. L'ancienne tentative et le motif de reprise sont conservés. Preuves : `09-reprise-dialogue.png`, `10-reprise-resultat.png`.

**Friction de validation.** Après avoir coché le critère, expliqué ce qui est vérifié et cliqué « Valider le résultat », une seconde question demande « Le contrôle est reçu. Terminer cette vérification ? », avec « Approuver la suite ». J'ai l'impression de valider deux fois le même contrôle. Le bouton « Examiner la décision » m'indique néanmoins clairement où agir. Proposition P2 : réserver le deuxième bloc à une vraie décision de suite ou supprimer cette décision dans ce modèle minimal. Preuves : `10b-valide.png`, `11-decision.png`.

**Résultat.** L'exécution affiche « Terminée », 2/2 étapes, durée totale « attentes comprises », dates début/fin. « Retour à la liste » retrouve les modèles d'origine. L'historique global contient une seule exécution terminée ; pas de « Reprendre le travail » trompeur. Preuves : `12-termine.png`, `13-duree.png`, `14-retour.png`, `15-historique.png`.

## Parcours 2 — créer un modèle minimal réutilisable

**Attente.** Construire une tâche d'analyse compréhensible, la conserver dans Modèles, puis retrouver où la modifier sans lancer l'IA.

**Premier clic.** Workflows → Modèles → « + Créer un modèle ». Le formulaire propose nom, description et notifications. Le modèle créé est « Analyser un diagnostic », destiné à lire un diagnostic fourni, expliquer sa cause probable et proposer une prochaine vérification.

**Constat.** Le bloc initial explique qu'il utilise la demande initiale et le contexte. Je peux saisir nom, consigne et critère d'acceptation sans nom de paramètre moteur. Les réglages avancés sont repliés. C'est suffisamment lisible pour cette tâche simple. Le formulaire de notification explique explicitement qu'une connexion email/Slack doit être ajoutée ; il ne prétend pas en posséder une. Preuves : `17-modele-creation.png`, `18-modele-bloc.png`.

**Hésitation.** « Ajouter un résultat attendu » ouvre « Décrire une donnée », qui demande « Nom (sans espaces) », « Type », puis « Ajouter la donnée ». Je quitte à nouveau le vocabulaire métier : je voudrais nommer « Synthèse du diagnostic », pas inventer `synthese`.

**Conséquence / contournement.** Un développeur comprend ce nom technique, un créateur occasionnel doit deviner. Je renseigne `synthese` comme texte. Proposition P2 : titre humain libre, identifiant technique généré et masqué en avancé. Preuve : `19-resultat-modele.png`.

**Résultat de configuration.** Le modèle est enregistré en révision 2. Retour à la liste le retrouve dans la bibliothèque ; « Modifier le modèle » rouvre sa configuration avec la consigne et le résultat attendu. Aucun lancement IA effectué. Preuves : `20-modele-enregistre.png`, `21-modele-bibliotheque.png`, `22-modele-modifier.png`.

## Adoption et priorités

Adoption favorable pour suivre une exécution et reprendre une commande locale : l'échec est intelligible, la relance est explicite, le résultat terminé et sa durée se retrouvent. La création simple devient envisageable, mais le dialogue de lancement doit être adapté au type de workflow. Je n'utiliserais pas encore cette interface comme démonstration sans explication à un collègue novice.

1. P1 — commande sans IA : lancement local évident et aucune promesse d'agent nécessaire.
2. P2 — placer commande/arguments en haut des propriétés d'une commande.
3. P2 — éviter la double validation du modèle local minimal.
4. P2 — résultat attendu avec titre humain libre, identifiant technique en avancé.

## Portée de la preuve

Le processus local Python a réellement été exécuté dans l'environnement isolé. Aucun fournisseur ni service externe n'a été utilisé ou qualifié. Aucun résultat IA simulé ne sert de preuve métier. HOME, états workflow, runtime et PATH sont propres à chaque essai ; les exécutables `codex` et `claude` sont inertes. Les fichiers utilisateur réels et les anciens workflows n'ont pas été touchés. Les seuls changements de scénario hors GUI sont la création du dépôt synthétique et la correction de `check.py` ; aucun SQLite/JSON d'état n'a été écrit pour forcer une transition.

Rejeu : `npm run test:ui -- --config release/2026-10-10_retours-usage/.suivi/personas/03-sceptique/playwright.config.cjs`. Le script lance exclusivement le candidat immuable, même si le build préalable du dépôt évolue.

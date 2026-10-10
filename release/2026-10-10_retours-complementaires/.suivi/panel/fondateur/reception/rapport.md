# Réception ciblée — fondateur

**Trois corrections reçues** sur le candidat figé `/tmp/tricorder-rc16-reception`. Le rapport et les preuves du candidat initial restent inchangés.

Après création GUI d’une routine Document et d’un champ obligatoire Période du suivi, je lance réellement la préparation locale pour la semaine du 12 octobre. La prochaine ouverture Exécuter présente une période et un titre vides. Je peux préparer la semaine suivante sans effacer l’ancienne demande. Deux exécutions terminées conservent séparément les périodes du 12 et du 19 octobre, vérifiées par lecture API.

L’inspecteur du Document ne présente plus Effort IA de cette étape. Le formulaire de lancement précise toujours que le workflow exécute ses étapes locales sans fournisseur IA : l’ancienne ambiguïté est levée.

Je renomme Email client en Email au client, exécute le workflow local et choisis ce libellé. Après réussite, je renomme encore le choix du modèle en Message partenaire. En revenant par Historique au rapport de la demande terminée, la décision reste affichée Email au client et la branche email reste la bonne. Les mots de la décision prise sont donc conservés malgré l’évolution ultérieure du modèle.

Verdict d’usage : les trois réserves concrètes sont levées dans ce périmètre ; aucun contournement requis.

Deux captures : `08-deuxieme-formulaire-vierge.png` et `13-libelle-historique.png`. L’absence du réglage IA est conservée dans `05-document.txt`, le renommage ultérieur dans `modele-renomme-apres-decision.txt`, les valeurs distinctes dans `preuves-api.json`. `execution.log` termine par RECEPTION TROIS CORRECTIONS REUSSIE.

Script autonome : `PATH=/tmp/tricorder-xvfb/usr/bin:$PATH xvfb-run -a node release/2026-10-10_retours-complementaires/.suivi/panel/fondateur/reception/parcours.cjs`. Profil et écran isolés, fixtures créées exclusivement par Engine, fournisseurs inertes. Exécutions locales réelles de Documents et décision humaine ; aucun service externe ou travail IA qualifié. Une attente explicite a été ajoutée pour prendre la capture du formulaire après son affichage ; cette correction concerne uniquement le pilote.

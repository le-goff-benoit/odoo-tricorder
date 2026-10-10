# Contre-épreuve du responsable produit — réception rc.16

Candidat figé : `/tmp/tricorder-rc16-reception`. Le script `parcours.cjs` a terminé avec code 0. Preuves retenues : `valide/`. Profil temporaire et affichage X isolés ; fournisseurs inertes ; fixtures par commandes validées du moteur ; simulation explicitement choisie. Aucun service externe testé.

Les deux retours du premier passage sont reçus :

- **Choix repris sans double saisie.** Après avoir sélectionné une nouvelle source de type liste et changé le branchement en Valeurs personnalisées, « Reprendre les valeurs du formulaire » remplit exactement « Email client » et « Ticket équipe ». La nouvelle source et les valeurs sont conservées après enregistrement. Il n’a pas fallu appliquer la source séparément. Capture `valide/1-choix-repris.png`.
- **Vocabulaire du livrable.** Après simulation avec « Ticket équipe », « Voir les résultats » affiche « Synthèse », sans titre `summary`. L’avertissement de simulation reste lisible. Capture `valide/2-synthese.png`.
- **Protection des branches existantes.** Sur une règle liée à « Ancien canal », absent des nouvelles valeurs du formulaire, la reprise est refusée avec « Une branche existante utilise une autre valeur. Adaptez ses liens avant de reprendre les choix du formulaire. » Les anciens choix et le lien restent présents à l’écran et dans le modèle enregistré. Capture `valide/3-refus-comprehensible.png`, données `valide/preuves.json`.

Verdict : corrections acceptées sur ces parcours ciblés. Le refus est compréhensible et donne une action à effectuer sans perdre la configuration précédente.

Le premier lancement du pilote relisait la définition immédiatement après clic Enregistrer, avant la fin de l’enregistrement asynchrone. Une attente sur le résultat enregistré a corrigé le pilote ; aucune modification du candidat. Cette trace est conservée à la racine de ce dossier, les preuves valides sont dans `valide/`.

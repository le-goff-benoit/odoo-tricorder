# Activité — action de reprise masquée par le titre de l’étape

## Diagnostic confirmé

**P2 de prévisibilité**, reproduit indépendamment sur le paquet figé le 10 octobre 2026. La ligne affiche « Agent arrêté » et « Préparer le diagnostic », mais pas « Reprendre l’agent », alors que son action réelle est `activity-resume-agent`.

Cause : `src/studio.js`, `activityTable`, choisit `r.focus?.title || action.label`. Le titre d’étape masque donc l’action dès qu’il est présent. La proposition bornée est correcte : conserver statut et action technique ; montrer à la fois l’action native et le titre d’étape. Le hors-conversation conserve son titre.

[Rouge indépendant](package-red.log), [preuve source initiale](rouge-suite-source/error-context.md), [capture de l’activité](rouge-independant-paquet/activity-independent-activ-3f515-t-and-original-conversation/activity-before-click.png).

Le test indépendant poursuit après l’assertion visuelle défaillante, sans l’ignorer dans son verdict rouge. Les autres contrôles passent : le clic ouvre le dialogue explicite ; annuler conserve le brouillon du shell, sans l’exécuter ; confirmer reprend le même PTY/PID 1891018 ; une seule conversation et les trois mêmes demandes sont conservées. La demande dépendante n’est pas présentée comme une reprise d’agent. [Assertions métier](rouge-independant-paquet/activity-independent-activ-3f515-t-and-original-conversation/assertions.json).

## Réception du correctif

**Favorable sur le build source corrigé : 1/1 parcours indépendant passe en 10,1 secondes.** Le scénario est inchangé entre le rouge paquet et le vert source. La correction assemble le libellé d’action natif et le titre d’étape ; elle ne change ni statut, ni action du bouton.

La capture native à 1440 × 1000 a été relue : « Agent arrêté », « Reprendre l’agent… · Préparer le diagnostic » restent lisibles dans la colonne du workflow, terminal conservé à gauche. La demande dépendante affiche toujours « Attend une autre demande » sans reprise d’agent.

Le clic ouvre la confirmation ; annuler ne lance rien et conserve la saisie `printf review-draft > ./must-not-run.txt`. Le fichier n’est jamais créé. Confirmer seul relance le faux agent : même identifiant de PTY et PID **1894639**, une seule conversation, trois demandes inchangées. Le compteur passe de 1 à 2 uniquement après accord.

[Journal vert](source-green.log), [capture corrigée](vert-independant-source/activity-independent-activ-3f515-t-and-original-conversation/activity-before-click.png), [assertions finales](vert-independant-source/activity-independent-activ-3f515-t-and-original-conversation/assertions.json), [preuve complète](vert-independant-source/activity-independent-activ-3f515-t-and-original-conversation/evidence.json), [empreinte source](candidat-source-SHA256.json).

Le paquet utilisé pour le rouge était l’ancien candidat. La reconstruction et la qualification du nouveau paquet restent à effectuer par le responsable ; cette réception ne les anticipe pas. Écran `:188` et processus isolés libérés après le vert.

## Périmètre

Projets synthétiques et faux fournisseur quittant immédiatement vers un shell local. Aucun projet client, fournisseur réel ni état métier externe utilisé. Aucun code produit ni test partagé modifié par cette revue. Les suites complètes en cours sont restées actives. Écran `:188` libéré après reproduction.

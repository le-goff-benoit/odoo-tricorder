// Build a bounded, contextual first message. Project identifiers are data, never commands.
const ACTIONS = Object.freeze({
  workflow: ['/odoo-plan', 'Accompagner le workflow Release Odoo dans cette même conversation : ouverture ou reprise de la release, recueil des intentions, plan, réalisation, recette et clôture. Commencer par écouter la demande et clarifier les intentions ; si le texte est vide, poser la première question utile. Conserver les demandes originales. Après accord explicite sur le plan, poursuivre avec /odoo-start dans cette conversation ; pour la recette et la clôture, appliquer /odoo-close. Réutiliser les décisions déjà acquises. Les étapes du graphique sont un suivi, pas une autorisation. Ne jamais lancer de développement sans plan autorisé ni inventer un accord de livraison.'],
  open: ['/odoo-plan', 'Ouvrir une nouvelle release pour la demande ci-dessous et conserver ses intentions originales. Vérifier les releases déjà ouvertes avant d’en créer une autre. Ne pas lancer la réalisation.'],
  collect: ['/odoo-plan', 'Recueillir les intentions dans la release sélectionnée : conserver chaque demande originale, résultat attendu, contrainte et question. Clarifier les points bloquants. Ne pas lancer la réalisation.'],
  develop: ['/odoo-new', 'Traiter la demande jusqu’à sa réception locale.'],
  diagnose: ['/odoo-support', 'Diagnostiquer et prouver la cause.'],
  plan: ['/odoo-plan', 'Préparer le plan et les critères de la release.'],
  start: ['/odoo-start', 'Exécuter ou reprendre le plan de la release sélectionnée, selon les dépendances et les décisions déjà acquises. Arrêter uniquement les tâches dont une décision manque ; ne jamais inventer un accord.'],
  resume: ['/odoo-start', 'Reprendre le travail autorisé de cette tâche avec ses preuves actuelles.'],
  close: ['/odoo-close', 'Recetter et clôturer la release sélectionnée.'],
  answer: ['/odoo-plan', 'Enregistrer cette réponse métier avec la question correspondante dans les intentions de la release, conserver le texte original et les décisions, actualiser la proposition et les questions ouvertes. Reprendre seulement le périmètre déjà autorisé.'],
  feedback: ['/odoo-feedback', 'Enregistrer et qualifier ce retour.'],
});
function workPrompt(request, context) {
  if (!request || typeof request !== 'object' || !Object.hasOwn(ACTIONS, request.action)) throw new Error('Action de travail inconnue');
  if (typeof request.text !== 'string' || request.text.length > 12000 || /[\x00-\x08\x0b-\x1f\x7f]/.test(request.text)) throw new Error('Demande invalide (12 000 caractères maximum, sans caractères de contrôle)');
  if (!request.text.trim() && !['workflow', 'resume', 'close', 'start', 'plan'].includes(request.action)) throw new Error('Décrivez la demande');
  if (['resume', 'close', 'answer', 'collect', 'start'].includes(request.action) && !context.release) throw new Error('Sélectionnez une release');
  if (request.action === 'plan' && !request.text.trim() && !context.release) throw new Error('Décrivez la demande');
  if (request.action === 'resume' && !context.task) throw new Error('Sélectionnez une tâche');
  const [skill, objective] = ACTIONS[request.action];
  const briefing = context.release ? 'python3 ~/.odoo19-agents/scripts/odoo_work.py prepare sur ce projet et cette release' : 'python3 ~/.odoo19-agents/scripts/odoo_briefing.py sur ce projet';
  return `${skill}\n${objective}\nContexte sélectionné dans Tricorder : ${JSON.stringify({ project: context.project, release: context.release, task: context.task })}\nCommence par ${briefing}, puis applique le skill. Reprends les décisions et preuves existantes. Termine le périmètre demandé ; signale la question précise si une décision manque. Un environnement sélectionné ne donne aucune permission d’écriture en production.\nDemande originale de l’utilisateur :\n${request.text}`;
}
module.exports = { workPrompt, ACTIONS };

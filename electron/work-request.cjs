// Build a bounded, contextual first message. Project identifiers are data, never commands.
const ACTIONS = Object.freeze({
  develop: ['/odoo-new', 'Traiter la demande jusqu’à sa réception locale.'],
  diagnose: ['/odoo-support', 'Diagnostiquer et prouver la cause.'],
  plan: ['/odoo-plan', 'Préparer le plan et les critères de la release.'],
  resume: ['/odoo-start', 'Reprendre le travail autorisé de cette tâche avec ses preuves actuelles.'],
  close: ['/odoo-close', 'Recetter et clôturer la release sélectionnée.'],
  feedback: ['/odoo-feedback', 'Enregistrer et qualifier ce retour.'],
});
function workPrompt(request, context) {
  if (!request || typeof request !== 'object' || !Object.hasOwn(ACTIONS, request.action)) throw new Error('Action de travail inconnue');
  if (typeof request.text !== 'string' || request.text.length > 12000 || /[\x00-\x08\x0b-\x1f\x7f]/.test(request.text)) throw new Error('Demande invalide (12 000 caractères maximum, sans caractères de contrôle)');
  if (!request.text.trim() && !['resume', 'close'].includes(request.action)) throw new Error('Décrivez la demande');
  if (['resume', 'close'].includes(request.action) && !context.release) throw new Error('Sélectionnez une release');
  if (request.action === 'resume' && !context.task) throw new Error('Sélectionnez une tâche');
  const [skill, objective] = ACTIONS[request.action];
  return `${skill}\n${objective}\nContexte sélectionné dans Tricorder : ${JSON.stringify({ project: context.project, release: context.release, task: context.task })}\nCommence par python3 ~/.odoo19-agents/scripts/odoo_work.py prepare sur ce projet et cette release, puis applique le skill. Reprends les décisions et preuves existantes. Termine le périmètre demandé ; signale la question précise si une décision manque. Un environnement sélectionné ne donne aucune permission d’écriture en production.\nDemande originale de l’utilisateur :\n${request.text}`;
}
module.exports = { workPrompt, ACTIONS };

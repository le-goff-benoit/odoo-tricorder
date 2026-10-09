import { failedResult } from './execution-view.mjs';
import { businessDataView, businessProofView } from './business-results.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const present = value => value !== undefined && value !== null && value !== '' && (typeof value !== 'object' || Object.keys(value).length > 0);

function proofLink(sha, label='Lire le contenu complet') {
  return /^[a-f0-9]{64}$/.test(sha || '') ? `<button data-action="read-proof" data-sha="${sha}">${escape(label)}</button>` : '';
}

/** Render content, not executable HTML or a JSON representation of node state. */
function valueView(value) {
  if(value?.$artifact && !['name','filename','title','role'].some(key=>value[key] || value.$artifact[key])) {
    return `${value.format === 'text' && value.preview ? `<p class="attempt-text">${escape(value.preview)}</p>` : ''}${proofLink(value.$artifact.sha256)}`;
  }
  return businessDataView('', value);
}

function timestamp(attempt) {
  const field = ['finished','started'].find(key=>typeof attempt[key] === 'number' && attempt[key] > 0 && Number.isFinite(attempt[key]));
  if (!field) return '<span class="muted">Date non enregistrée</span>';
  const date = new Date(attempt[field]*1000);
  if (!Number.isFinite(date.getTime())) return '<span class="muted">Date non enregistrée</span>';
  const label = `${field === 'finished' ? 'Terminée' : 'Démarrée'} le ${date.toLocaleString('fr-CH',{dateStyle:'medium',timeStyle:'short'})}`;
  return `<time datetime="${date.toISOString()}">${escape(label)}</time>`;
}

function status(attempt, definition) {
  if (attempt.failed ?? failedResult(attempt,definition)) return ['failed','Échec'];
  return ({accepted:['accepted','Validée'], returned:['returned','Résultat remis'], cancelled:['cancelled','Annulée'], interrupted:['blocked','Interrompue'], running:['running','En cours'], skipped:['skipped','Ignorée']})[attempt.status] || ['','État non renseigné'];
}

function evidenceView(evidence) {
  if (evidence?.$artifact) return proofLink(evidence.$artifact.sha256,'Consulter les preuves');
  if (!Array.isArray(evidence)) return '';
  return evidence.map((proof,index)=>businessProofView(proof,index)).join('');
}

/** Engine.retry stores the retry instruction on the NEXT state, not on the archived one. */
export function attemptHistoryView(current, definition={}) {
  if (current?.attempt_history_page) return `<section class="attempt-history"><h3>Tentatives précédentes · ${escape(current.attempt_history_page.total)}</h3><button data-action="attempt-history" data-node="${escape(definition.id)}">Afficher les tentatives</button></section>`;
  const projected = Array.isArray(current?.attempt_history);
  const history = projected ? current.attempt_history : current?.history;
  if (history?.$artifact) return `<section class="attempt-history"><h3>Tentatives précédentes</h3><details class="attempt-technical"><summary>Contenu technique de l’historique</summary>${proofLink(history.$artifact.sha256,'Consulter le contenu par pages')}</details></section>`;
  if (!Array.isArray(history) || !history.length) return '';
  return `<section class="attempt-history"><h3>Tentatives précédentes · ${history.length}</h3><ol class="attempt-list">${history.map((attempt,index)=>{
    const result = attempt.result || {};
    const [tone,label] = status(attempt,definition);
    const number = Number.isInteger(attempt.attempt) && attempt.attempt > 0 ? `Tentative ${attempt.attempt}` : 'Tentative précédente';
    const retryReason = projected ? attempt.retry_reason : (history[index+1] || current).reason;
    const summary = present(result.summary) ? `<div class="attempt-summary">${valueView(result.summary)}</div>` : '<p class="muted">Aucun compte rendu enregistré.</p>';
    const validation = present(attempt.validation_error) && attempt.validation_error !== result.summary ? `<div class="attempt-cause"><strong>Contrôle non satisfait</strong>${valueView(attempt.validation_error)}</div>` : '';
    const proofs = evidenceView(result.evidence);
    const results = [present(result.outputs) ? `<h4>Résultats</h4>${valueView(result.outputs)}` : '', proofs ? `<h4>Preuves</h4><div class="attempt-proofs">${proofs}</div>` : '', present(result.preview) ? `<h4>Aperçu du résultat</h4>${valueView(result.preview)}` : ''].join('');
    const technical = { ...(attempt.status ? {'Statut enregistré':attempt.status} : {}), ...(attempt.ownership ? {'Exécution':attempt.ownership} : {}), ...(attempt.started ? {'Début (horodatage)':attempt.started} : {}), ...(attempt.finished ? {'Fin (horodatage)':attempt.finished} : {}) };
    return `<li class="attempt-card"><div class="attempt-heading"><strong>${number}</strong><span class="pill ${tone}">${label}</span></div><div class="attempt-date">${timestamp(attempt)}</div>${summary}${validation}${present(retryReason) ? `<div class="attempt-retry"><strong>Motif de la reprise suivante</strong>${valueView(retryReason)}</div>` : ''}${result.simulated ? '<p class="notice amber">Résultat simulé, sans valeur de test métier réel.</p>' : ''}${results ? `<details class="attempt-results"><summary>Résultats et preuves</summary>${results}</details>` : ''}<details class="attempt-technical"><summary>Détails techniques</summary>${valueView(technical)}${present(attempt.inputs) ? `<h4>Entrées de cette tentative</h4>${valueView(attempt.inputs)}` : ''}</details></li>`;
  }).reverse().join('')}</ol></section>`;
}

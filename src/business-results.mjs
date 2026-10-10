// Presentation only: these helpers never infer receipt, completion or permission
// from a result's content. The engine remains the source of execution state.
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const defaultButton = (action, label, css = '', extra = '') => `<button type="button" class="${css}" data-action="${action}" ${extra}>${label}</button>`;
const fields = {
  action:'Action', actions:'Actions', owner:'Responsable', assignee:'Responsable', due:'Échéance', due_date:'Échéance', deadline:'Échéance',
  question:'Question', answer:'Réponse', clarifications:'Précisions', summary:'Résumé', finding:'Constat', findings:'Constats', severity:'Niveau d’urgence', selected_meetings:'Réunions sélectionnées', analysis:'Analyse des réunions', destination:'Destination choisie', response:'Réponse préparée',
  next_action:'Suite proposée', next_steps:'Prochaines étapes', rationale:'Justification', missing:'Informations manquantes', impact:'Impact',
  verdict:'Verdict', decision:'Décision', outcome:'Décision', status:'État', request:'Demande', proposal:'Proposition', draft:'Brouillon',
  report:'Rapport', minutes:'Compte rendu', transcript:'Transcription', subject:'Objet', body:'Contenu', recipient:'Destinataire', recipients:'Destinataires', title:'Titre', description:'Description',
  results:'Résultats', text:'Texte', goal:'Objectif', tasks:'Tâches', project:'Projet', depends_on:'Après', base_from:'Base de code', contributions:'Contributions de code',
  responsable:'Responsable', échéance:'Échéance', echeance:'Échéance',
  note:'Commentaire', notes:'Commentaires', message:'Message', error:'Erreur', reason:'Motif', result:'Résultat', outputs:'Sorties', inputs:'Entrées',
  evidence:'Preuves', source:'Source', sources:'Sources', files:'Fichiers', path:'Chemin', candidate:'Candidat', plan:'Plan', criteria:'Critères',
  exit_code:'Code de sortie', stdout:'Sortie de la commande', stderr:'Erreurs de la commande', ok:'Résultat déclaré par l’exécutant',
};
const decisions = {approve:'Approuvée', reject:'Refusée', pass:'Conforme', fail:'Non conforme', critical:'Urgent', normal:'Sans urgence établie', unknown:'À préciser', done:'Terminé', blocked:'Bloquée', deferred:'Différée', true:'Oui', false:'Non', yes:'Oui', no:'Non'};
const severities = {critical:'Urgent', normal:'Sans urgence établie', unknown:'À préciser', high:'Élevée', medium:'Moyenne', low:'Faible'};
const roles = {source:'Source', plan:'Plan', deliverable:'Livrable', result:'Résultat', evidence:'Preuve', email:'Email d’origine'};
const types = {'message/rfc822':'Email', 'text/plain':'Texte', 'text/markdown':'Document Markdown', 'application/json':'Document JSON', 'application/pdf':'PDF'};
const visibleRows = 20;
const visibleFields = 20;
const maxDepth = 4;

/** Plain text: callers interpolating this result into HTML must escape it. */
export function decisionLabel(outcome, node) {
  if (typeof node?.option_labels?.[outcome] === 'string') return node.option_labels[outcome];
  return own(decisions, outcome) ? decisions[outcome] : String(outcome ?? 'Non renseignée');
}

function fieldLabel(key) {
  if (own(fields, key)) return fields[key];
  const readable = String(key).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

function proofMetadata(proof) {
  return record(proof) ? {...(record(proof.$artifact) ? proof.$artifact : {}), ...proof} : {};
}

/** A filename/role is used only when supplied; a hash is never a business title. */
export function proofLabel(proof, index = 0) {
  const metadata = proofMetadata(proof);
  const text = value => typeof value === 'string' ? value.trim() : '';
  const filename = (text(metadata.name) || text(metadata.filename)).split(/[\\/]/).pop();
  const title = filename || text(metadata.title);
  const role = text(metadata.role);
  const roleName = own(roles, role) ? roles[role] : role;
  if (title) return `${roleName ? roleName + ' — ' : ''}${title}`;
  const mime = text(metadata.media_type) || text(metadata.mime_type);
  const type = own(types, mime) ? types[mime] : mime.startsWith('image/') ? 'Image' : '';
  return `${roleName || type || 'Preuve ' + (index + 1)}${hash(metadata.sha256) ? ' · ' + metadata.sha256.slice(0, 8) : ''}`;
}

/** Compatible with the existing delegated read-proof action. */
export function businessProofView(proof, index = 0, {button = defaultButton} = {}) {
  const metadata = proofMetadata(proof);
  const label = proofLabel(proof, index);
  if (!hash(metadata.sha256)) return `<span class="muted">${esc(label)} · Preuve indisponible</span>`;
  return button('read-proof', esc(label), 'business-proof', `data-sha="${metadata.sha256}" data-proof-label="${esc(label)}"`);
}

function technicalView(value, label = 'Données techniques') {
  // Depth/row limits apply to the reading view. The original JSON remains
  // available in a collapsed, scrollable area, including unrecognised fields.
  return `<details class="business-technical"><summary>${esc(label)}</summary><pre tabindex="0">${esc(JSON.stringify(value, null, 2))}</pre></details>`;
}

function artifactView(value, context) {
  const preview = typeof value.preview === 'string' ? value.preview : '';
  return `${preview ? value.format === 'text' ? `<p class="business-text">${esc(preview)}</p>` : `<details class="business-technical"><summary>Aperçu des données techniques</summary><pre tabindex="0">${esc(preview)}</pre></details>` : ''}${businessProofView(value, 0, context)}`;
}

function scalarView(value, key, context) {
  if (value === null || value === undefined || value === '') return '<span class="muted">Non renseigné</span>';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  const named = key === 'project' ? context.projects.find(project => project.id === value)?.title
    : ['depends_on', 'base_from'].includes(key) ? context.tasks?.get(value) : null;
  const translated = named || (typeof value === 'string' && key === 'severity' && own(severities, value) ? severities[value]
    : typeof value === 'string' && ['verdict', 'outcome', 'decision'].includes(key) ? decisionLabel(value) : value);
  return `<span class="business-text">${esc(translated)}</span>`;
}

function fieldsView(entries, depth, context) {
  const shown = entries.slice(0, visibleFields);
  return `<dl class="business-fields">${shown.map(([key, value]) => `<dt>${esc(fieldLabel(key))}</dt><dd>${valueView(value, key, depth + 1, context)}</dd>`).join('')}</dl>${entries.length > shown.length ? technicalView(Object.fromEntries(entries.slice(shown.length)), `${entries.length - shown.length} autres champs`) : ''}`;
}

function dialogueView(value, depth, context) {
  const rest = Object.entries(value).filter(([key]) => !['question', 'answer'].includes(key));
  return `<div class="business-dialogue"><dl class="business-fields"><dt>Question</dt><dd>${valueView(value.question, '', depth + 1, context)}</dd><dt>Réponse</dt><dd>${valueView(value.answer, '', depth + 1, context)}</dd></dl>${rest.length ? fieldsView(rest, depth, context) : ''}</div>`;
}

function actionsView(values, depth, context) {
  // Only the declared action field selects this presentation; never turn an
  // arbitrary object or a task's title into an inferred action or status.
  const shown = values.slice(0, visibleRows);
  const core = ['action', 'owner', 'due'];
  const aliases = {action:['action'], owner:['owner','assignee','responsable'], due:['due','due_date','deadline','échéance','echeance']};
  const keysFor = value => Object.fromEntries(core.map(key => [key, aliases[key].find(alias => own(value, alias) && value[alias] != null && value[alias] !== '') || key]));
  const extras = Array.from(new Set(shown.flatMap(value => record(value) ? Object.keys(value).filter(key => !Object.values(keysFor(value)).includes(key)) : [])));
  const hasOtherValues = shown.some(value => !record(value) || value.$artifact);
  const extraColumn = extras.length || hasOtherValues;
  const rows = shown.map(value => {
    const ordinary = record(value) && !value.$artifact;
    const selected = ordinary ? keysFor(value) : {};
    const rest = ordinary ? Object.entries(value).filter(([key]) => !Object.values(selected).includes(key)) : [];
    return `<tr>${core.map(key => `<td>${valueView(ordinary ? value[selected[key]] : undefined, key, depth + 1, context)}</td>`).join('')}${extraColumn ? `<td>${ordinary ? rest.length ? fieldsView(rest, depth + 1, context) : '<span class="muted">—</span>' : valueView(value, '', depth + 1, context)}</td>` : ''}</tr>`;
  }).join('');
  return `<div class="business-table-scroll" tabindex="0" role="region" aria-label="Actions et responsables"><table class="business-table"><thead><tr><th scope="col">Action</th><th scope="col">Responsable</th><th scope="col">Échéance</th>${extraColumn ? '<th scope="col">Autres informations</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>${values.length > shown.length ? technicalView(values.slice(shown.length), `${values.length - shown.length} autres éléments`) : ''}`;
}

function elementResultsView(values, context) {
  const shown = values.slice(0, visibleRows);
  // Strip only the known execution envelope from the reading view. Every
  // original identifier and unknown field remains in the technical disclosure.
  return `<div class="business-deliverables">${shown.map(item => {
    const project = context.projects.find(project => project.id === item.project);
    const outputs = Object.values(item.outputs);
    const extra = Object.entries(item).filter(([key]) => !['id','title','project','run','outputs'].includes(key));
    return `<section class="business-deliverable"><h4>${esc(item.title)}</h4>${project ? `<p class="muted">Projet : ${esc(project.title)}</p>` : ''}${outputs.map(output => valueView(output, '', 1, context)).join('')}${extra.length ? fieldsView(extra, 1, context) : ''}</section>`;
  }).join('')}</div>${values.length > shown.length ? technicalView(values.slice(shown.length), `${values.length - shown.length} autres résultats`) : ''}`;
}

function valueView(value, key, depth, context) {
  if (value?.$artifact) return artifactView(value, context);
  if (typeof value !== 'object' || value === null) return scalarView(value, key, context);
  const scalarList = Array.isArray(value) && value.every(item => item === null || typeof item !== 'object');
  if (depth >= maxDepth && !scalarList || --context.budget.remaining < 0) return technicalView(value, 'Structure détaillée');
  if (Array.isArray(value)) {
    if (!value.length) return '<span class="muted">Aucun élément</span>';
    if (key === 'results' && value.every(item => record(item) && typeof item.title === 'string' && typeof item.run === 'string' && typeof item.project === 'string' && record(item.outputs))) return elementResultsView(value, context);
    if (value.some(item => record(item) && own(item, 'action'))) return actionsView(value, depth, context);
    const shown = value.slice(0, visibleRows);
    return `<ol class="business-list">${shown.map(item => `<li>${valueView(item, key, depth + 1, context)}</li>`).join('')}</ol>${value.length > shown.length ? technicalView(value.slice(shown.length), `${value.length - shown.length} autres éléments`) : ''}`;
  }
  if (own(value, 'question') && own(value, 'answer')) return dialogueView(value, depth, context);
  const local = Array.isArray(value.tasks) ? {...context, tasks:new Map(value.tasks.filter(record).map(task => [task.id, task.title || task.text || task.id]))} : context;
  const entries = Object.entries(value).filter(([name, child]) => !(name === 'contributions' && Array.isArray(value.results) && Array.isArray(child) && !child.length));
  return entries.length ? fieldsView(entries, depth, local) : '<span class="muted">Aucun champ renseigné</span>';
}

/**
 * Human reading view of engine-projected JSON values. No HTML or Markdown from
 * the result is interpreted. Structured input is retained under one optional
 * technical disclosure; large projections retain their attached proof action.
 * The optional button factory has the signature used by studio.js and receives
 * an already escaped label and attributes.
 */
export function businessDataView(label, values, {button = defaultButton, projects = []} = {}) {
  if (values === undefined || values === null || (record(values) && !Object.keys(values).length)) return '';
  const context = {button, projects, budget:{remaining:120}};
  const structured = typeof values === 'object' && !values.$artifact;
  return `<section class="execution-data business-data">${label ? `<h3>${esc(label)}</h3>` : ''}${valueView(values, '', 0, context)}${structured ? technicalView(values) : ''}</section>`;
}

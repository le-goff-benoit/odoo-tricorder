import { portDescription } from './workflow-contract-ui.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const button = (action, label, attributes = '') => `<button type="button" class="flat" data-action="${action}" ${attributes}>${label}</button>`;
const dataLabels = {
  selected_meetings: 'Réunions sélectionnées', analysis: 'Analyse des réunions', minutes: 'Compte rendu',
  actions: 'Liste d’actions', draft: 'Brouillon', response: 'Réponse préparée', destination: 'Destination choisie',
  request: 'Demande initiale', answer: 'Votre réponse', finding: 'Constat', severity: 'Niveau d’urgence',
  next_action: 'Suite proposée', result: 'Résultat', evidence_summary: 'Bilan des vérifications',
  candidate: 'Version à vérifier', intentions: 'Demandes à traiter', items: 'Éléments à traiter',
  results: 'Résultats', contributions: 'Contributions', plan: 'Plan de travail', verdict: 'Résultat du contrôle',
  operation: 'Action proposée', proposal: 'Proposition', transcript: 'Transcription',
};
export function dataLabel(name) { return dataLabels[name] || String(name).replaceAll('_', ' '); }
export function informationKey(label) {
  let key = String(label).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '');
  if (!key) throw new Error('Donnez un nom à cette information, par exemple Compte rendu.');
  if (!/^[a-zA-Z]/.test(key)) key = 'information_' + key;
  return key.slice(0,80);
}
export function portProvenance(graph, node, name, direction) {
  const incoming = direction === 'inputs';
  const links = (graph.edges || []).filter(edge => incoming ? edge.to === node.id && Object.values(edge.mapping || {}).includes(name) : edge.from === node.id && Object.hasOwn(edge.mapping || {}, name));
  const titles = [...new Set(links.map(edge => { const id = incoming ? edge.from : edge.to; return graph.nodes.find(other => other.id === id)?.title || id; }))];
  return titles.length ? `${incoming ? 'Vient de' : 'Transmis à'} : ${titles.join(', ')}` : incoming ? 'À relier à une étape précédente' : 'Conservé dans le résultat de cette étape';
}
export function authoringPorts(node, graph) {
  return `<fieldset class="ports"><legend>Informations de cette étape</legend><p class="muted">Ces informations vérifient la structure du résultat. La qualité de son contenu dépend de la consigne et des critères métier ; une vérification de structure ne suffit pas à la garantir.</p>${[['inputs','Utilise'],['outputs','Produit']].map(([direction,label]) => `<section class="port-section"><strong>${label}</strong><ul>${Object.entries(node[direction] || {}).map(([name, port]) => `<li><strong>${escape(dataLabel(name))}</strong><span>${escape(portDescription(port, direction))}</span><span>${escape(portProvenance(graph, node, name, direction))}</span><div>${button('edit-port','Modifier',`data-direction="${direction}" data-port="${escape(name)}"`)}${button('remove-port','Retirer',`data-direction="${direction}" data-port="${escape(name)}"`)}</div></li>`).join('') || `<li>${direction === 'inputs' ? ['agent','task'].includes(node.kind) ? 'Demande initiale et contexte du workflow. Aucune donnée transmise par un autre bloc.' : 'Aucune donnée reçue d’un autre bloc.' : 'Aucun résultat déclaré.'}</li>`}</ul>${direction === 'inputs' ? button('receive-result','Recevoir un résultat existant…') : ''}${button('add-port',direction === 'inputs' ? 'Ajouter une information à utiliser' : 'Ajouter un résultat attendu',`data-direction="${direction}"`)}</section>`).join('')}</fieldset>`;
}
export function blockDataSummary(node) {
  const incoming = Object.keys(node.inputs || {}).map(dataLabel), outgoing = Object.keys(node.outputs || {}).map(dataLabel);
  return `${incoming.length ? 'Utilise : ' + incoming.join(', ') : ['agent','task'].includes(node.kind) ? 'Utilise : demande initiale et contexte' : 'Sans donnée provenant d’un autre bloc'}${outgoing.length ? ' · Produit : ' + outgoing.join(', ') : ''}`;
}
export function humanChoiceLabel(node, key) { return node.option_labels?.[key] || ({approve:'Approuver la suite',reject:'Refuser la suite'}[key]) || key; }
export function humanQuestionFields(node) {
  if (!['decision','review','question'].includes(node.kind)) return '';
  const free = node.kind === 'question';
  return `<label for="node-question">${free ? 'Information à demander' : 'Question à poser'}</label><textarea id="node-question" name="question">${escape(node.question || '')}</textarea>${free ? '<p class="muted">La personne répond librement dans le suivi. Pour transmettre sa réponse, reliez le résultat « Votre réponse » à une information utilisée par le bloc suivant. Un lien d’ordre seul ne transmet pas de donnée.</p>' : `<label for="node-options">Choix possibles (un par ligne)</label><textarea id="node-options" name="options">${escape((node.options || ['approve','reject']).map(key => humanChoiceLabel(node,key)).join('\n'))}</textarea><small>Écrivez les choix présentés à la personne, par exemple Email client et Ticket Odoo. Les liens conservent leur branche lorsque vous renommez un choix. Les accords d’opérations conservent leurs choix d’autorisation et de refus.</small><p class="muted">La suite attend votre décision.</p>`}`;
}
export function needsOperationFields(node) { return node.kind === 'external' || node.kind === 'decision' && !!node.operation; }
export function needsCodeFields(node) { return node.kind === 'command' || !!node.candidate_check || node.execution_mode === 'edit' || !!node.inputs?.candidate || !!node.outputs?.candidate; }

export function readableModelName(id) {
  if (/^gpt-/i.test(id)) return id.replace(/^gpt-/i,'GPT ').replaceAll('-', ' ');
  if (['opus','sonnet','haiku'].includes(id)) return 'Claude ' + id[0].toUpperCase() + id.slice(1);
  return id;
}
export function modelChoices(provider, catalog = {}, defaults = {}, value = '') {
  const values = new Map();
  for (const model of catalog[provider] || []) if (model?.id) values.set(model.id, readableModelName(model.label || model.id));
  if (defaults[provider] && !values.has(defaults[provider])) values.set(defaults[provider], readableModelName(defaults[provider]));
  if (value && !values.has(value)) values.set(value, readableModelName(value) + ' · choix enregistré');
  return [...values].map(([id,label]) => ({id,label}));
}
export function modelPicker({id, provider, value = '', catalog = {}, defaults = {}, required = true}) {
  const models = modelChoices(provider, catalog, defaults, value);
  return `<div class="model-picker" data-model-picker="${escape(id)}" data-provider="${escape(provider)}" data-required="${required}"><input type="hidden" id="${escape(id)}" name="model" value="${escape(value)}"><label for="${escape(id)}-choice">Modèle IA</label><select id="${escape(id)}-choice" data-model-choice ${required ? 'required' : ''}><option value="">Choisir un modèle</option>${models.map(model => `<option value="${escape(model.id)}" ${value === model.id ? 'selected' : ''}>${escape(model.label)}</option>`).join('')}<option value="__custom__">Autre modèle… (avancé)</option></select><div data-model-custom hidden><label for="${escape(id)}-custom">Identifiant technique du modèle</label><input id="${escape(id)}-custom" data-model-custom-value value="${escape(value)}" disabled></div>${models.length ? '<small>Choix issus de la configuration locale. L’accès au modèle sera vérifié au lancement.</small>' : '<p class="notice">Aucun catalogue de modèles trouvé sur ce poste. Configurez votre fournisseur dans le terminal, puis actualisez cette liste. Si votre fournisseur ne fournit pas de catalogue local, utilisez un modèle déclaré dans votre configuration ou la saisie avancée.</p>'}${button('refresh-model-catalog','Actualiser les modèles')}</div>`;
}
export function restoreModelPickers(form, {catalog = {}, defaults = {}} = {}) {
  for (const wrapper of form.querySelectorAll('[data-model-picker]')) {
    const provider = form.elements.namedItem('provider')?.value || wrapper.dataset.provider;
    const value = wrapper.querySelector('input[name="model"]').value;
    wrapper.outerHTML = modelPicker({id:wrapper.dataset.modelPicker,provider,value,catalog,defaults,required:wrapper.dataset.required !== 'false'});
  }
}
// Call for both change and input events. The form still submits only one
// field named model, containing the exact ID; display labels never reach it.
export function handleModelPickerEvent(event, {catalog = {}, defaults = {}} = {}) {
  const target = event.target;
  if (target.matches?.('#workflow-provider,#node-provider,#assistant-provider')) {
    const wrapper = target.closest('form')?.querySelector('[data-model-picker]');
    if (!wrapper) return false;
    const id = wrapper.dataset.modelPicker;
    wrapper.outerHTML = modelPicker({id,provider:target.value,value:defaults[target.value] || '',catalog,defaults,required:wrapper.dataset.required !== 'false'});
    return true;
  }
  const wrapper = target.closest?.('[data-model-picker]');
  if (!wrapper || !target.matches('[data-model-choice],[data-model-custom-value]')) return false;
  const choice = wrapper.querySelector('[data-model-choice]'), custom = wrapper.querySelector('[data-model-custom-value]');
  const manual = choice.value === '__custom__';
  wrapper.querySelector('[data-model-custom]').hidden = !manual;
  custom.disabled = !manual; custom.required = manual && wrapper.dataset.required !== 'false';
  wrapper.querySelector('input[name="model"]').value = manual ? custom.value.trim() : choice.value;
  return true;
}

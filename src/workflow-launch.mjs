import { informationKey } from './workflow-authoring-ui.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const launchTypes = {string:'Texte court',text:'Texte long',number:'Nombre',boolean:'Oui / Non',choice:'Liste de choix'};
export const parameterLabel = (graph,key) => graph.launch_fields?.find(field=>field.key===key)?.label || graph.parameter_labels?.[key] || key.replaceAll('_',' ');

export function launchFieldsEditor(fields = []) {
  return `<fieldset class="launch-fields-editor"><legend>Formulaire de lancement</legend><p>Ces informations sont demandées à chaque exécution. Elles sont conservées avec cette demande, sans changer le modèle. Pour demander une précision pendant le travail, utilisez une Question ouverte.</p><div id="launch-fields-list">${fields.map((field,index)=>launchFieldEditor(field,index)).join('')}</div><button type="button" class="flat" data-action="add-launch-field">Ajouter un champ au lancement</button></fieldset>`;
}
export function launchFieldEditor(field,index) {
  const uid=field._editor_id ?? index;
  return `<fieldset data-launch-field data-key="${esc(field.key || '')}"><legend>Champ ${index+1}</legend><label for="launch-label-${uid}">Libellé du champ</label><input id="launch-label-${uid}" data-field-label value="${esc(field.label || '')}" maxlength="120" required><label for="launch-type-${uid}">Type de réponse</label><select id="launch-type-${uid}" data-field-type>${Object.entries(launchTypes).map(([key,label])=>`<option value="${key}" ${key===(field.type || 'string')?'selected':''}>${label}</option>`).join('')}</select><label for="launch-help-${uid}">Aide à la saisie</label><input id="launch-help-${uid}" data-field-help value="${esc(field.help || '')}" maxlength="600"><label><input type="checkbox" data-field-required ${field.required?'checked':''}>Réponse obligatoire</label><div data-field-choices ${field.type==='choice'?'':'hidden'}><label for="launch-options-${uid}">Valeurs proposées (une par ligne)</label><textarea id="launch-options-${uid}" data-field-options>${esc((field.options || []).join('\n'))}</textarea></div><button type="button" class="flat" data-action="remove-launch-field">Retirer ce champ</button></fieldset>`;
}
export function readLaunchFieldDefinitions(container) {
  const used=new Set();
  return [...container.querySelectorAll('[data-launch-field]')].map(row=>{
    const label=row.querySelector('[data-field-label]').value.trim(), key=row.dataset.key || informationKey(label);
    if(!label)throw new Error('Donnez un libellé à chaque champ du formulaire.');
    if(used.has(key))throw new Error('Deux champs portent le même nom. Donnez-leur des libellés distincts.');
    used.add(key);
    const field={key,label,type:row.querySelector('[data-field-type]').value,help:row.querySelector('[data-field-help]').value.trim(),required:row.querySelector('[data-field-required]').checked};
    if(field.type==='choice')field.options=row.querySelector('[data-field-options]').value.split('\n').map(x=>x.trim()).filter(Boolean);
    return field;
  });
}
function compatibleValue(field,value) {
  if(value == null || value==='')return true;
  if(field.type==='number')return typeof value==='number' && Number.isFinite(value);
  if(field.type==='boolean')return typeof value==='boolean';
  if(field.type==='choice')return typeof value==='string' && field.options.includes(value);
  return typeof value==='string';
}
export function launchFields(graph, values = {}) {
  const fields=graph.launch_fields || [];
  if(!fields.length)return '';
  return `<fieldset class="launch-answers"><legend>Informations de cette demande</legend>${fields.map((field,index)=>{
    const value=Object.hasOwn(values,field.key)?values[field.key]:graph.parameters?.[field.key] ?? '',id='launch-answer-'+index;
    const incompatible=!compatibleValue(field,value), previous=typeof value==='string'?value:JSON.stringify(value);
    const attrs=`${incompatible?`data-launch-previous="${esc(JSON.stringify(value))}" data-launch-previous-text="${esc(previous)}"`:''} id="${id}" data-launch-answer="${esc(field.key)}" ${field.required?'required':''} aria-describedby="${id}-help"`;
    let control;
    if(field.type==='boolean' || field.type==='choice') {
      const choices=field.type==='boolean'?[['true','Oui'],['false','Non']]:field.options.map(value=>[value,value]);
      let marker='__previous_launch_answer__';
      while(choices.some(([key])=>key===marker))marker+='_';
      control=`<select ${attrs} ${incompatible?`data-launch-invalid-option="${marker}"`:''}>${incompatible?`<option value="${marker}" selected>Ancienne réponse à corriger : ${esc(previous)}</option>`:''}<option value="">Choisir…</option>${choices.map(([key,label])=>`<option value="${esc(key)}" ${!incompatible && String(value)===key?'selected':''}>${esc(label)}</option>`).join('')}</select>`;
    } else if(field.type==='text')control=`<textarea ${attrs}>${esc(incompatible?previous:value)}</textarea>`;
    else control=`<input ${attrs} type="${field.type==='number' && !incompatible?'number':'text'}" ${field.type==='number'?'step="any"':''} value="${esc(incompatible?previous:value)}">`;
    const warning=incompatible?`<p role="alert">L’ancienne réponse « ${esc(previous)} » ne correspond plus à ce champ. Corrigez-la${field.required?'':' ou effacez-la explicitement'} avant de lancer.</p>${!['boolean','choice'].includes(field.type)?`<label><input type="checkbox" data-launch-confirm="${esc(field.key)}">J’ai vérifié cette réponse dans le nouveau format.</label>`:''}`:'';
    return `${warning}<label for="${id}">${esc(field.label)}${field.required?' · obligatoire':' · facultatif'}</label>${control}<small id="${id}-help">${esc(field.help || '')}</small>`;
  }).join('')}</fieldset>`;
}
export function readLaunchValues(container, graph, validate = true) {
  return Object.fromEntries((graph.launch_fields || []).map(field=>{
    const element=[...container.querySelectorAll('[data-launch-answer]')].find(e=>e.dataset.launchAnswer===field.key);
    if(!element)return [field.key,graph.parameters?.[field.key] ?? null];
    const raw=element.value, missing=raw.trim()==='';
    if(Object.hasOwn(element.dataset,'launchPrevious')) {
      const unchanged=element.dataset.launchInvalidOption ? raw===element.dataset.launchInvalidOption : raw===element.dataset.launchPreviousText;
      const confirmed=[...container.querySelectorAll('[data-launch-confirm]')].find(e=>e.dataset.launchConfirm===field.key)?.checked;
      if(unchanged && !confirmed) {
        if(!validate)return [field.key,JSON.parse(element.dataset.launchPrevious)];
        element.focus();throw new Error(`Corrigez ou confirmez l’ancienne réponse de « ${field.label} » avant de lancer.`);
      }
    }
    if(validate && field.required && missing) {element.focus();throw new Error(`Renseignez « ${field.label} » avant de lancer.`);}
    if(missing)return [field.key,null];
    const value=field.type==='number'?(Number.isFinite(Number(raw))?Number(raw):raw):field.type==='boolean'?(['true','false'].includes(raw)?raw==='true':raw):raw;
    if(validate && field.type==='choice' && !field.options.includes(raw))throw new Error(`Choisissez une valeur proposée pour « ${field.label} ».`);
    if(validate && field.type==='boolean' && !['true','false'].includes(raw))throw new Error(`Choisissez Oui ou Non pour « ${field.label} ».`);
    if(validate && field.type==='number' && (typeof value!=='number' || !Number.isFinite(value)))throw new Error(`« ${field.label} » attend un nombre.`);
    return [field.key,value];
  }));
}

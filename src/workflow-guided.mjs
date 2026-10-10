// Guided authoring builds explicit engine contracts; it never changes execution state.
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const clone = value => structuredClone(value);
const idPattern = /^[a-zA-Z][a-zA-Z0-9_.-]{0,79}$/;
const uid = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
const textPort = () => ({type:'string', required:true});
const stringify = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object' ? Object.fromEntries(Object.keys(item).sort().map(key => [key,item[key]])) : item);
function require(ok, message) { if (!ok) throw new Error(message); }
function bounded(value, maximum, label, mandatory = false) {
  require(typeof value === 'string', `${label} : texte attendu.`);
  const result = value.trim();
  require(result.length <= maximum && (!mandatory || result), `${label} : ${mandatory ? 'renseignez un texte de' : 'limite de'} ${maximum} caractères maximum.`);
  return result;
}

export function newGuidedStep(steps = []) {
  return {id:uid('step'), title:'', mission:'', profile:'generalist', execution_driver:'native', result:'', criteria:[], review:'never', start:steps.length ? 'after' : 'start', after:steps.at(-1)?.id || '', depends_on:[]};
}

function normalize(values) {
  require(values && typeof values === 'object', 'Décrivez la méthode à créer.');
  require(Array.isArray(values.steps) && values.steps.length > 0 && values.steps.length <= 40, 'Prévoyez entre une et quarante étapes.');
  const ids = new Set();
  const steps = values.steps.map((step, index) => {
    require(idPattern.test(step.id) && step.id.length <= 64 && !ids.has(step.id), 'Une étape possède un identifiant invalide ou dupliqué.');
    const preceding = new Set(ids);
    ids.add(step.id);
    const start = step.start || (index ? 'after' : 'start');
    require(['start','after','parallel','all'].includes(start), 'Choisissez quand commence cette étape.');
    const after = step.after || (index ? values.steps[index-1].id : '');
    let dependencies = [];
    if (start === 'after' || start === 'parallel') {
      require(preceding.has(after), 'Choisissez une étape précédente pour organiser ce travail.');
      if (start === 'after') dependencies = [after];
    }
    if (start === 'all') {
      require(Array.isArray(step.depends_on) && step.depends_on.length > 0 && step.depends_on.every(id => preceding.has(id)), 'Sélectionnez les étapes dont tous les résultats sont nécessaires.');
      dependencies = [...new Set(step.depends_on)];
    }
    require(['never','always','needed'].includes(step.review || 'never'), 'Choisissez quand demander une décision.');
    require(idPattern.test(step.profile || 'generalist'), 'Choisissez un rôle disponible.');
    require(['native','delegated'].includes(step.execution_driver || 'native'), 'Choisissez qui exécute cette étape.');
    const criteria = typeof step.criteria === 'string' ? step.criteria.split('\n').filter(line => line.trim()) : step.criteria || [];
    require(Array.isArray(criteria) && criteria.length <= 20, 'Vingt critères maximum par étape.');
    return {id:step.id,title:bounded(step.title,160,'Nom de l’étape',true),mission:bounded(step.mission || step.title,10000,'Travail à effectuer',true),profile:step.profile || 'generalist',execution_driver:step.execution_driver || 'native',result:bounded(step.result,120,'Résultat de l’étape',true),criteria:criteria.map(value => bounded(value,600,'Critère',true)),review:step.review || 'never',start,after:['after','parallel'].includes(start) ? after : '',depends_on:dependencies};
  });
  // Parallel means the same prerequisites, rather than waiting for the selected step.
  for (const step of steps) if (step.start === 'parallel') step.depends_on = [...steps.find(item => item.id === step.after).depends_on];
  for (const step of steps) if (step.review !== 'never') require(!ids.has(`${step.id}-review`), 'Renommez l’identifiant interne de cette étape : il entre en conflit avec une décision.');
  const questions = typeof values.questions === 'string' ? values.questions.split('\n').filter(line => line.trim()).map((label,index) => ({key:`detail_${index+1}`,label,required:false})) : values.questions || [];
  require(Array.isArray(questions) && questions.length <= 20, 'Vingt informations complémentaires maximum.');
  const questionIds = new Set();
  const fields = questions.map((question,index) => {
    const key = question.key || `detail_${index+1}`;
    require(idPattern.test(key) && !questionIds.has(key) && !['request','conversation','depends_on_runs','dependency_results','series','platform','source_context'].includes(key), 'Information complémentaire invalide ou dupliquée.');
    questionIds.add(key);
    return {key,label:bounded(question.label,120,'Information à demander',true),help:bounded(question.help || '',600,'Aide'),required:Boolean(question.required)};
  });
  const id = values.id || uid('method');
  require(idPattern.test(id), 'Identifiant de méthode invalide.');
  return {version:1,id,title:bounded(values.title,160,'Nom de la méthode',true),goal:bounded(values.goal,2000,'Résultat attendu',true),source:bounded(values.source || '',2000,'Informations de départ'),steps,questions:fields};
}

function generated(values) {
  const authoring = normalize(values), nodes = [], edges = [];
  const byId = new Map(authoring.steps.map(step => [step.id,step]));
  const edge = (from,to,outcome,mapping) => edges.push({id:`link-${edges.length+1}`,from,to,outcome,mapping});
  for (const [index,step] of authoring.steps.entries()) {
    const inputs = {}, labels = {};
    for (const dependency of step.depends_on) { const port = `result_${dependency}`; inputs[port] = textPort(); labels[port] = byId.get(dependency).result; }
    const outputs = {result:textPort()};
    const prompt = [`Objectif de la méthode : ${authoring.goal}`, `Informations de départ : ${authoring.source || 'La demande et les sources fournies lors du lancement.'}`, 'Lire la demande initiale (parameters.request), les informations de lancement et les sources effectivement fournies. Une référence à un email ou document ne signifie pas qu’il a été lu ; demander la source si elle est indispensable et inaccessible.', `Travail de cette étape : ${step.mission}`, `Résultat attendu : ${step.result}`, step.depends_on.length ? 'Utiliser tous les résultats transmis par les étapes précédentes, avec leur provenance.' : 'Cette étape démarre avec les informations fournies au lancement.', step.criteria.length ? `Vérifier les points suivants et signaler les limites :\n${step.criteria.map(item=>`- ${item}`).join('\n')}` : 'Distinguer le résultat produit des faits qui restent à vérifier.', 'Remettre le résultat dans outputs.result. Ne pas prétendre avoir créé, envoyé ou publié un élément externe sans opération effectivement réalisée.'];
    const work = {id:step.id,title:step.title,phase:step.title,kind:'agent',profile:step.profile,session:'delegated',execution_mode:'text',validation:'contract',max_attempts:2,criteria:step.criteria,inputs,outputs,port_labels:{inputs:labels,outputs:{result:step.result}},prompt:prompt.join('\n\n'),position:{x:80+index*320,y:80}};
    if (step.execution_driver === 'delegated') work.execution_driver = 'delegated';
    if (step.review === 'needed') {
      work.route_output = 'needs_review'; work.options = ['yes','no']; work.outputs.needs_review = textPort(); work.port_labels.outputs.needs_review = 'Une décision est-elle nécessaire ?';
      work.prompt += '\n\noutputs.needs_review vaut yes seulement si une anomalie, une information insuffisante ou une décision de périmètre empêche de poursuivre en confiance ; sinon no. Expliquer le besoin dans le résultat. Ne pas demander une validation systématique.';
    }
    nodes.push(work);
    if (step.review !== 'never') {
      const gate = {id:`${step.id}-review`,title:`Examiner : ${step.title}`,phase:step.title,kind:'decision',question:`Le résultat « ${step.result} » permet-il de poursuivre ? Si une information manque ou une anomalie reste ouverte, refusez pour arrêter la suite de cette exécution.`,options:['approve','reject'],option_labels:{approve:'Poursuivre avec ce résultat',reject:'Arrêter la suite'},inputs:{result:textPort()},outputs:{result:textPort()},port_labels:{inputs:{result:step.result},outputs:{result:step.result}},position:{x:80+index*320,y:300}};
      nodes.push(gate); edge(step.id,gate.id,step.review === 'needed' ? 'yes' : 'done',{result:'result'});
    }
  }
  for (const step of authoring.steps) for (const dependency of step.depends_on) {
    const predecessor = byId.get(dependency), targetPort = `result_${dependency}`;
    if (predecessor.review !== 'always') edge(dependency,step.id,predecessor.review === 'needed' ? 'no' : 'done',{result:targetPort});
    if (predecessor.review !== 'never') edge(`${dependency}-review`,step.id,'approve',{result:targetPort});
  }
  return {schema:2,id:authoring.id,title:authoring.title,description:authoring.goal,source_description:authoring.source || 'La demande et les sources fournies au lancement.',result_names:authoring.steps.filter(step=>!authoring.steps.some(other=>other.depends_on.includes(step.id))).map(step=>step.result),authoring,nodes,edges,launch_fields:authoring.questions.map(field=>({...field,type:'text'}))};
}

function unchanged(actual, expected) {
  return Object.entries(expected).every(([key,value]) => key === 'position' || stringify(actual?.[key]) === stringify(value));
}

export function canEditGuided(graph) {
  if (graph?.authoring?.version !== 1) return false;
  try {
    const expected = generated(graph.authoring);
    if (stringify(graph.authoring) !== stringify(expected.authoring) || graph.schema !== 2 || graph.id !== expected.id || graph.title !== expected.title || graph.description !== expected.description || graph.nodes.length !== expected.nodes.length || stringify(graph.edges) !== stringify(expected.edges) || stringify(graph.launch_fields || []) !== stringify(expected.launch_fields)) return false;
    return expected.nodes.every(node => {
      const actual = graph.nodes.find(item => item.id === node.id);
      // Preserve provider/model/position and non-executable annotations. Added
      // advanced routing, operations or bindings cannot be silently rebuilt.
      const allowedExtras = new Set(['provider','model','effort','collapsed','execution','profile_text','profile_sha256']);
      return unchanged(actual,node) && Object.keys(actual).every(key => Object.hasOwn(node,key) || allowedExtras.has(key));
    });
  } catch { return false; }
}

export function buildGuidedWorkflow(values, existing = null) {
  if (existing) require(canEditGuided(existing), 'Cette méthode contient une configuration détaillée. Modifiez ses étapes sans reconstruire ses branches.');
  const graph = generated({...values,id:existing?.id || values.id});
  if (!existing) return graph;
  const previousNodes = generated(existing.authoring).nodes;
  return {...clone(existing),...graph,nodes:graph.nodes.map(node=>{
    const previous = existing.nodes.find(item=>item.id === node.id), generatedPrevious = previousNodes.find(item=>item.id === node.id);
    const preserved = previous ? Object.fromEntries(Object.entries(previous).filter(([key])=>!Object.hasOwn(generatedPrevious,key))) : {};
    return {...clone(preserved),...node,position:clone(previous?.position || node.position)};
  })};
}

export function guidedCoordination(values) {
  const authoring = normalize(values), titles = new Map(authoring.steps.map(step=>[step.id,step.title]));
  return authoring.steps.map(step => ({id:step.id,title:step.title,dependencies:[...step.depends_on],description:step.depends_on.length ? `Attend ${step.depends_on.length > 1 ? 'tous les résultats de ' : 'le résultat de '}${step.depends_on.map(id=>titles.get(id)).join(' et ')}.` : 'Peut démarrer dès que la demande est lancée.',review:step.review,execution_driver:step.execution_driver}));
}

function profileOptions(profiles, chosen) {
  const values = [{id:'generalist',title:'Agent polyvalent'},...profiles.filter(item=>item.id !== 'generalist')];
  if (!values.some(item=>item.id === chosen)) values.push({id:chosen,title:`Rôle à installer : ${chosen}`});
  return values.map(item=>`<option value="${esc(item.id)}" ${item.id === chosen ? 'selected' : ''}>${esc(item.title || item.name || item.id)}</option>`).join('');
}

export function guidedStepForm(step, {steps = [], index = 0, profiles = []} = {}) {
  const prior = steps.slice(0,index), picked = step.depends_on || [];
  const options = prior.map(item=>`<option value="${esc(item.id)}" ${item.id === step.after ? 'selected' : ''}>${esc(item.title || `Étape ${steps.indexOf(item)+1}`)}</option>`).join('');
  return `<fieldset class="guided-step" data-guided-step data-step-id="${esc(step.id)}"><legend>Étape ${index+1}</legend><label>Nom de l’étape<input data-guided-field="title" required maxlength="160" value="${esc(step.title)}" placeholder="Analyser la demande"></label><label>Travail à effectuer<textarea data-guided-field="mission" required maxlength="10000" placeholder="Ce que l’agent doit faire et ce qu’il doit éviter">${esc(step.mission)}</textarea></label><div class="guided-row"><label>Responsable<select data-guided-field="profile">${profileOptions(profiles,step.profile || 'generalist')}</select></label><label>Résultat à remettre<input data-guided-field="result" required maxlength="120" value="${esc(step.result)}" placeholder="Diagnostic et prochaines actions"></label></div><label>Qui exécute cette étape ?<select data-guided-field="execution_driver"><option value="native" ${(step.execution_driver || 'native') === 'native' ? 'selected' : ''}>La conversation principale</option><option value="delegated" ${step.execution_driver === 'delegated' ? 'selected' : ''}>Un agent distinct pour les textes fournis</option></select></label><p class="muted">L’agent distinct reçoit les informations fournies et les résultats précédents. Il ne peut pas aller chercher un email ou un fichier avec les outils du terminal. En lancement automatique, les étapes IA utilisent des agents distincts.</p><label>Quand commencer ?<select data-guided-field="start"><option value="start" ${step.start === 'start' ? 'selected' : ''}>Dès le lancement de la demande</option>${prior.length ? `<option value="after" ${step.start === 'after' ? 'selected' : ''}>Après une étape</option><option value="parallel" ${step.start === 'parallel' ? 'selected' : ''}>En parallèle d’une étape</option><option value="all" ${step.start === 'all' ? 'selected' : ''}>Après tous les résultats sélectionnés</option>` : ''}</select></label><label data-guided-after ${['after','parallel'].includes(step.start) ? '' : 'hidden'}>Étape de référence<select data-guided-field="after">${options}</select></label><div data-guided-dependencies ${step.start === 'all' ? '' : 'hidden'}><p>Attendre tous les résultats de :</p>${prior.map(item=>`<label class="guided-check"><input type="checkbox" data-guided-dependency value="${esc(item.id)}" ${picked.includes(item.id) ? 'checked' : ''}>${esc(item.title || `Étape ${steps.indexOf(item)+1}`)}</label>`).join('')}</div><label>Quand demander votre décision ?<select data-guided-field="review"><option value="never" ${(step.review || 'never') === 'never' ? 'selected' : ''}>Aucune validation systématique</option><option value="needed" ${step.review === 'needed' ? 'selected' : ''}>Seulement en cas d’anomalie ou d’information insuffisante</option><option value="always" ${step.review === 'always' ? 'selected' : ''}>Toujours avant de poursuivre</option></select></label><details><summary>Points à vérifier</summary><label>Ce qui rend le résultat utile<textarea data-guided-field="criteria" maxlength="12000" placeholder="Un point par ligne">${esc(Array.isArray(step.criteria) ? step.criteria.join('\n') : step.criteria)}</textarea></label><p class="muted">L’agent les examine et signale ses limites. Un contrôle de format ne prouve pas leur respect.</p></details><button type="button" class="flat" data-action="guided-remove-step" data-id="${esc(step.id)}">Retirer cette étape</button></fieldset>`;
}

function questionRequirements(fields) {
  return fields.map(field=>`<label class="guided-check"><input type="checkbox" data-question-label="${esc(field.label)}" ${field.required?'checked':''}>Réponse obligatoire : ${esc(field.label)}</label>`).join('');
}
export function refreshGuidedQuestions(form) {
  const previous=[...form.querySelectorAll('[data-question-label]')];
  const fields=(form.querySelector('[name="questions"]')?.value || '').split('\n').map(label=>label.trim()).filter(Boolean).map(label=>({label,required:previous.find(f=>f.dataset.questionLabel===label)?.checked || false}));
  const target=form.querySelector('[data-question-requirements]');if(target)target.innerHTML=questionRequirements(fields);
}

export function guidedForm({graph = null, projects = [], project = '', profiles = []} = {}) {
  require(!graph || canEditGuided(graph), 'Cette méthode doit être personnalisée en conservant ses étapes détaillées.');
  const values = graph ? graph.authoring : {id:uid('method'),title:'',goal:'',source:'',steps:[newGuidedStep()],questions:[]};
  return `<form id="guided-workflow-form" class="guided-workflow" data-workflow-id="${esc(values.id)}"><p>Décrivez le résultat, les informations de départ et le travail des agents. Les résultats circulent entre les étapes automatiquement.</p><label>Nom de la méthode<input name="title" required maxlength="160" value="${esc(values.title)}" placeholder="Traiter une demande de support"></label><label>Résultat attendu<textarea name="goal" required maxlength="2000" placeholder="Ce que vous voulez obtenir à la fin">${esc(values.goal)}</textarea></label><label>Informations à fournir au lancement<textarea name="source" maxlength="2000" placeholder="Un email, un texte collé, des notes ou un document…">${esc(values.source)}</textarea></label><p class="muted">Décrivez ici les sources nécessaires. Leurs contenus sont fournis pour chaque nouvelle demande ; ils ne deviennent pas des résultats d’une étape précédente.</p>${projects.length ? `<label>Enregistrer dans<select name="project">${projects.map(item=>`<option value="${esc(item.id)}" ${item.id === project ? 'selected' : ''}>${esc(item.title)}</option>`).join('')}</select></label>` : `<input name="project" type="hidden" value="${esc(project)}">`}<h3>Étapes et coordination</h3><div id="guided-steps">${values.steps.map((step,index)=>guidedStepForm(step,{steps:values.steps,index,profiles})).join('')}</div><button type="button" class="flat" data-action="guided-add-step">Ajouter une étape</button><details><summary>Informations complémentaires à demander au lancement</summary><label>Questions pour chaque nouvelle demande<input type="hidden" name="question-definitions" value="${esc(JSON.stringify(values.questions))}"><textarea name="questions" maxlength="2400" placeholder="Un libellé par ligne : destinataire, période concernée…">${esc(values.questions.map(field=>field.label).join('\n'))}</textarea></label><div data-question-requirements>${questionRequirements(values.questions)}</div><p class="muted">Choisissez les réponses obligatoires. La demande suivante commence avec de nouvelles réponses.</p></details><div class="modal-actions"><button type="submit" class="primary">${graph ? 'Appliquer les modifications' : 'Créer la méthode'}</button></div></form>`;
}

export function readGuidedForm(container) {
  const form = container.matches?.('#guided-workflow-form') ? container : container.querySelector('#guided-workflow-form');
  require(form, 'Formulaire de méthode absent.');
  const value = name => form.querySelector(`[name="${name}"]`)?.value || '';
  const steps = [...form.querySelectorAll('[data-guided-step]')].map(section => {
    const read = name => section.querySelector(`[data-guided-field="${name}"]`)?.value || '';
    return {id:section.dataset.stepId,title:read('title'),mission:read('mission'),profile:read('profile'),execution_driver:read('execution_driver') || 'native',result:read('result'),start:read('start'),after:read('after'),review:read('review'),criteria:read('criteria').split('\n').filter(line=>line.trim()),depends_on:[...section.querySelectorAll('[data-guided-dependency]:checked')].map(item=>item.value)};
  });
  const previousQuestions = JSON.parse(value('question-definitions') || '[]'), usedKeys = new Set();
  const questions = value('questions').split('\n').map(label=>label.trim()).filter(Boolean).map((label,index)=>{
    const matching = previousQuestions.find(field=>field.label === label && !usedKeys.has(field.key));
    let field = matching || (previousQuestions[index] && !usedKeys.has(previousQuestions[index].key) ? previousQuestions[index] : null);
    if (!field) {
      let number = index+1;
      while (usedKeys.has(`detail_${number}`) || previousQuestions.some(item=>item.key === `detail_${number}`)) number++;
      field = {key:`detail_${number}`,help:'',required:false};
    }
    usedKeys.add(field.key);
    const required=[...form.querySelectorAll('[data-question-label]')].find(f=>f.dataset.questionLabel===label);
    return {...field,label,required:required?required.checked:field.required};
  });
  return {id:form.dataset.workflowId,title:value('title'),goal:value('goal'),source:value('source'),project:value('project'),questions,steps};
}

export function refreshGuidedConnections(container) {
  for (const section of container.querySelectorAll('[data-guided-step]')) {
    const start = section.querySelector('[data-guided-field="start"]').value;
    section.querySelector('[data-guided-after]').hidden = !['after','parallel'].includes(start);
    section.querySelector('[data-guided-dependencies]').hidden = start !== 'all';
  }
}

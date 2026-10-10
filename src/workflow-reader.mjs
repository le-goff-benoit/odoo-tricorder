// Reading projections only. All execution facts and transitions come from the engine.
import { dataLabel } from './workflow-authoring-ui.mjs';
import { decisionLabel } from './business-results.mjs';
import { failedResult } from './execution-view.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button = (action,label,extra='') => `<button type="button" data-action="${action}" ${extra}>${label}</button>`;
const controls = new Set(['condition','join']);
const humans = new Set(['decision','review','question','input']);
const stateNames = {pending:'Attend les étapes précédentes',ready:'Prête à commencer',running:'En cours',waiting:'Votre décision est attendue',waiting_input:'Votre réponse est attendue',returned:'Résultat à vérifier',accepted:'Terminée',skipped:'Non applicable',blocked:'Bloquée',cancelled:'Annulée',interrupted:'Interrompue',failed:'Échec à examiner'};

export function modelKind(graph) {
  if(graph.catalog_kind)return graph.catalog_kind;
  if(['first-workflow','local-check'].includes(graph.id))return 'demo';
  if(['orchestration','analysis','development','quality','documentation','communication'].includes(graph.id) || graph.description?.startsWith('Composant réutilisable'))return 'component';
  return 'workflow';
}
export function workflowModels(graphs) { return graphs.filter(graph=>modelKind(graph)==='workflow' && graph.library_visibility!=='advanced'); }
export function availableAgents(project, builtin=[]) {
  const all=[...builtin, ...(project?.packs || []).flatMap(pack=>(pack.profiles || []).map(profile=>({...profile,pack:pack.title || pack.id})))];
  const profiles=new Map([['generalist',{id:'generalist',title:'Agent polyvalent',description:'Suit les instructions de l’étape.'}]]);
  for(const profile of all)profiles.set(profile.id,profile);
  return [...profiles.values()];
}
export function agentName(node,graph,project,profiles=[]) {
  if(humans.has(node.kind))return 'Vous';
  if(controls.has(node.kind))return 'Tricorder';
  if(['command','external','communication','watch','integrate','foreach','subworkflow'].includes(node.kind))return 'Tricorder et les outils configurés';
  const role=node.execution?.profile || node.profile || graph.defaults?.profile || project?.defaults?.profile || 'generalist';
  return availableAgents(project,profiles).find(profile=>profile.id===role)?.title || role+' · pack à ajouter';
}
function legacyPhase(graph,node) {
  // Existing support definitions are read without migration or state writes.
  if(graph.nodes.some(n=>n.id==='diagnosis') && graph.nodes.some(n=>n.id==='reassess') && graph.nodes.some(n=>n.id==='destination')) {
    if(['diagnosis','clarify','reassess','unresolved'].includes(node.id))return 'Analyser la demande';
    if(['urgent','normal','destination','response'].includes(node.id))return 'Préparer la réponse';
  }
  if(graph.id.includes('github-odoo') || graph.id==='direct-production') {
    if(node.id.startsWith('staging-'))return 'Déployer et vérifier en staging';
    if(node.id.startsWith('production-'))return 'Déployer et vérifier en production';
    if(node.id.startsWith('docs'))return 'Préparer les notes de livraison';
  }
  return null;
}
function stageState(nodes,run) {
  if(!run)return null;
  const states=nodes.map(node=>failedResult(run.nodes[node.id],node)?'failed':run.nodes[node.id]?.status || 'pending');
  if(states.every(state=>state==='skipped'))return 'skipped';
  if(states.every(state=>['accepted','skipped'].includes(state)))return 'accepted';
  return ['failed','waiting_input','waiting','returned','blocked','interrupted','running','ready','cancelled','pending'].find(state=>states.includes(state)) || 'pending';
}
export function workflowStages(graph,run=null) {
  const group=(usePhases=true)=>{
    const stages=[],byKey=new Map(),byNode=new Map();
    for(const node of graph.nodes) {
      const key=usePhases && (node.phase || legacyPhase(graph,node)) || node.id;
      if(!byKey.has(key)){const stage={id:node.id,title:key===node.id?node.title:key,nodes:[],dependencies:[],state:null};stages.push(stage);byKey.set(key,stage);}
      const stage=byKey.get(key);stage.nodes.push(node);byNode.set(node.id,stage);
    }
    for(const edge of graph.edges){const from=byNode.get(edge.from),to=byNode.get(edge.to);if(!from || !to || from===to)continue;const source=graph.nodes.find(node=>node.id===edge.from);const conditional=Boolean(source.route_output || ['decision','review','condition'].includes(source.kind));const dependency={id:from.id,title:from.title,source:source.title,conditional,outcome:conditional?decisionLabel(edge.outcome || 'done',source):''};if(!to.dependencies.some(d=>d.id===dependency.id && d.outcome===dependency.outcome))to.dependencies.push(dependency);}
    // Grouping must never hide a return dependency by creating a cyclic stage view.
    const finished=new Set();for(let i=0;i<stages.length;i++)for(const stage of stages)if(stage.dependencies.every(d=>finished.has(d.id)))finished.add(stage.id);
    if(usePhases && finished.size!==stages.length)return group(false);
    for(const stage of stages)stage.state=stageState(stage.nodes,run);
    return stages;
  };
  return group();
}
export function workflowResultNames(graph) {
  if(graph.result_names?.length)return graph.result_names;
  const leaves=graph.nodes.filter(node=>!controls.has(node.kind) && !humans.has(node.kind) && !graph.edges.some(edge=>edge.from===node.id && graph.nodes.some(target=>target.id===edge.to && !humans.has(target.kind) && !controls.has(target.kind))));
  return [...new Set(leaves.flatMap(node=>Object.keys(node.outputs || {}).map(key=>dataLabel(key,node,'outputs'))))];
}
export function workflowOverview(graph,{run=null,project=null,profiles=[],editable=false}={}) {
  const stages=workflowStages(graph,run),names=workflowResultNames(graph);
  const purpose=graph.result_description || graph.description || 'Le résultat dépend des instructions des étapes ci-dessous.';
  const jobs=graph.nodes.filter(node=>['agent','task'].includes(node.kind));
  const roles=[...new Set(jobs.map(node=>agentName(node,graph,project,profiles)))];
  const decisions=graph.nodes.filter(node=>humans.has(node.kind));
  return `<section class="workflow-reading" aria-label="Fonctionnement du workflow"><div class="workflow-reading-intro"><h2>${run?'Progression du travail':'Ce que fait ce workflow'}</h2><p>${esc(purpose)}</p>${!run?`<div class="reading-facts"><div><h3>Informations à fournir</h3><p>${esc(graph.source_description || 'La demande et ses sources : texte, documents ou références à récupérer.')}</p>${graph.launch_fields?.length?`<ul>${graph.launch_fields.map(field=>`<li>${esc(field.label)}${field.required?' · obligatoire':''}</li>`).join('')}</ul>`:''}</div><div><h3>Résultat attendu</h3><p>${names.length?esc(names.join(' · ')):'Le résultat du travail décrit dans les étapes.'}</p></div></div>`:''}<p class="reading-coordination"><strong>Coordination : Tricorder.</strong> Les étapes commencent quand leurs dépendances sont satisfaites. Les travaux indépendants peuvent avancer ensemble${run?.driver==='conversation'?' ; l’agent de la conversation pilote leur traitement':''}. ${decisions.length?'Les questions et décisions apparaissent dans le suivi.':'Les précisions indispensables sont demandées dans le suivi.'}</p>${roles.length?`<p>Agents : ${esc(roles.join(' · '))}</p>`:''}</div><ol class="workflow-stage-list">${stages.map(stage=>{
    const main=stage.nodes.find(node=>!controls.has(node.kind)) || stage.nodes[0];
    const owners=[...new Set(stage.nodes.filter(node=>!controls.has(node.kind)).map(node=>agentName(node,graph,project,profiles)))];
    const executor=stage.nodes.filter(n=>['agent','task','document'].includes(n.kind)).map(n=>`${n.title} : ${run?.nodes[n.id]?.ownership==='managed'?'agent distinct pris en charge':run?.nodes[n.id]?.ownership==='native'?'conversation principale':n.execution_driver==='delegated'?'agent distinct prévu':'conversation principale au lancement natif'}`).join(' · ');
    const review=graph.authoring?.steps?.find(step=>stage.nodes.some(n=>n.id===step.id))?.review;
    const select=run && (stage.nodes.find(node=>['waiting_input','waiting','returned','failed','blocked','running','ready'].includes(run.nodes[node.id]?.status)) || main);
    const after=stage.dependencies.map(d=>d.conditional?`${d.title} : ${d.outcome}`:d.title);
    return `<li class="workflow-stage" data-stage="${esc(stage.id)}" ${run?`data-status="${esc(stage.state)}"`:''}><div class="workflow-stage-heading"><h3>${esc(stage.title)}</h3>${run?`<span class="pill ${esc(stage.state)}">${esc(stateNames[stage.state])}</span>`:''}</div><p class="stage-owner">${esc(owners.join(' · '))}</p>${executor?`<p class="stage-executor">${esc(executor)}</p>`:''}${review==='needed'?'<p>Votre décision : seulement en cas d’anomalie ou d’information insuffisante.</p>':review==='always'?'<p>Votre décision : requise avant de poursuivre.</p>':''}${after.length?`<p class="stage-dependencies">${stage.dependencies.some(d=>d.conditional)?'Selon le résultat de':'Après'} : ${esc(after.join(' ; '))}</p>`:'<p class="stage-dependencies">À partir de la demande et de ses sources.</p>'}${run?button('select-node','Voir cette étape',`data-id="${esc(select.id)}"`):editable?button('simple-edit-step','Modifier cette étape',`data-id="${esc(main.id)}" data-stage="${esc(stage.id)}"`):''}<details class="stage-operations"><summary>${stage.nodes.length===1?'Consigne et résultat':'Travaux et décisions de cette étape'}</summary>${stage.nodes.map(node=>`<article><h4>${esc(node.title)}</h4><p>${esc(agentName(node,graph,project,profiles))}${run?.nodes[node.id]?` · ${esc(stateNames[failedResult(run.nodes[node.id],node)?'failed':run.nodes[node.id].status] || run.nodes[node.id].status)}`:''}</p>${['agent','task','document'].includes(node.kind)?`<p>Exécution : ${run?.nodes[node.id]?.ownership==='native'?'agent de cette conversation':run?.nodes[node.id]?.ownership==='managed'?'agent distinct pris en charge':node.execution_driver==='delegated'?'agent distinct prévu, après ses prérequis':'dans la conversation au lancement natif'}. ${node.execution_driver==='delegated'?'Utilise les textes et résultats transmis ; les outils de la conversation ne sont pas hérités.':''}</p>`:''}${node.prompt?`${node.user_instruction?`<p class="stage-instruction">${esc(node.user_instruction)}</p>`:''}<details><summary>Consigne complète de l’agent (avancé)</summary><p class="stage-instruction">${esc(node.prompt)}</p></details>`:''}${node.question?`<p>Question : ${esc(node.question)}</p>`:''}${node.operation?`<dl class="stage-operation"><dt>Opération</dt><dd>${esc((run?.nodes[node.id]?.operation || node.operation).action)}</dd><dt>Cible</dt><dd>${esc((run?.nodes[node.id]?.operation || node.operation).target)}</dd><dt>Candidat ou version concernés</dt><dd>${esc((run?.nodes[node.id]?.operation || node.operation).candidate)}</dd></dl>`:''}${Object.keys(node.outputs || {}).length?`<p>Produit : ${esc(Object.keys(node.outputs).map(key=>dataLabel(key,node,'outputs')).join(' · '))}</p>`:''}${node.criteria?.length?`<p>À vérifier : ${esc(node.criteria.join(' ; '))}</p>`:''}${run?button('select-node','Ouvrir le travail',`data-id="${esc(node.id)}"`):editable?button('simple-edit-step','Modifier le travail',`data-id="${esc(node.id)}"`):''}</article>`).join('')}</details></li>`;
  }).join('')}</ol></section>`;
}

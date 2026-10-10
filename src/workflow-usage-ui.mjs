import { informationKey, humanChoiceLabel } from './workflow-authoring-ui.mjs';
import { normalizedPort } from './workflow-contract-ui.mjs';
import { connectionOutcomes } from './workflow-design.mjs';

export function localWorkflow(graph) {
  const documents=graph.nodes.filter(n=>n.kind==='document');
  const readyDocuments=documents.length>0 && documents.every(n=>typeof n.content==='string' && n.content.trim() && !n.capabilities?.length);
  return (graph.nodes.some(n=>n.kind==='command') || readyDocuments) && graph.nodes.every(n=>['command','document','question','decision','review','condition','join'].includes(n.kind));
}
export const templateCategory = graph => ['orchestration','analysis','development','quality','documentation','communication'].includes(graph.id) || graph.description?.startsWith('Composant réutilisable') ? 'component' : 'workflow';

// Build a proposal only. The caller validates the complete graph before editing.
export function connectInformation(graph, {from, output, to, input, outcome}) {
  const next = structuredClone(graph), source = next.nodes.find(n => n.id === from), target = next.nodes.find(n => n.id === to);
  if (!source || !target || source === target || !Object.hasOwn(source.outputs || {}, output)) throw new Error('Choisissez deux étapes distinctes et un résultat existant.');
  const key = informationKey(input);
  if (Object.hasOwn(target.inputs || {}, key)) throw new Error('Cette information existe déjà. Utilisez Relier pour choisir une information existante.');
  if (!connectionOutcomes(source).includes(outcome)) throw new Error('Choisissez la branche qui transmettra cette information.');
  const reachable = new Set([to]);
  for (let i = 0; i < next.nodes.length; i++) for (const e of next.edges) if (reachable.has(e.from)) reachable.add(e.to);
  if (reachable.has(from)) throw new Error('Cette liaison reviendrait vers une étape précédente et créerait une boucle.');
  const firstInput = !Object.keys(target.inputs || {}).length;
  target.inputs ||= {}; target.inputs[key] = next.schema === 2 ? normalizedPort(source.outputs[output]) : structuredClone(source.outputs[output]);
  target.port_labels ||= {}; target.port_labels.inputs ||= {}; target.port_labels.inputs[key] = input.trim();
  if (target.kind === 'condition' && firstInput && (!target.parameter || target.parameter === 'choice') && !Object.hasOwn({...next.parameters,...target.parameters}, target.parameter) && !(next.launch_fields || []).some(field=>field.key===target.parameter)) target.parameter = key;
  let edge = next.edges.find(e => e.from === from && e.to === to && e.outcome === outcome);
  if (!edge) { edge = {id:'link-' + crypto.randomUUID(),from,to,outcome,mapping:{}}; next.edges.push(edge); }
  edge.mapping ||= {};
  if (Object.hasOwn(edge.mapping, output)) throw new Error('Ce résultat est déjà transmis sur cette liaison. Utilisez Relier pour modifier sa destination.');
  edge.mapping[output] = key;
  return next;
}

export function finalDeliverables(run) {
  if (run?.status !== 'completed') return [];
  const accepted = run.definition.nodes.filter(n => !['question','decision','review','condition','join'].includes(n.kind) && run.nodes[n.id]?.status === 'accepted' && run.nodes[n.id]?.result);
  const upstream = new Set();
  for (const n of accepted) {
    const reachable = new Set([n.id]);
    for (let i = 0; i < run.definition.nodes.length; i++) for (const e of run.definition.edges) if (reachable.has(e.from) && run.nodes[e.to]?.status === 'accepted') reachable.add(e.to);
    if (accepted.some(other => other.id !== n.id && reachable.has(other.id))) upstream.add(n.id);
  }
  return accepted.filter(n => !upstream.has(n.id)).flatMap(node => {
    const result = run.nodes[node.id].result;
    const outputs = Object.entries(result.outputs || {}).filter(([,value]) => value != null && (typeof value !== 'string' || value.trim()));
    // Preserve custom business outputs too. Contributions are already represented
    // by their per-item results when both collections exist.
    const visible = outputs.filter(([key]) => key !== 'contributions' || !outputs.some(([name]) => name === 'results'));
    visible.sort((a,b) => Number(typeof b[1]==='string') - Number(typeof a[1]==='string'));
    return (visible.length ? visible : typeof result.summary === 'string' ? [['summary',result.summary]] : []).map(([key,value]) => ({node:node.id,title:node.title,key,value,text:typeof value==='string'?value:null}));
  });
}

// Keep engine branch identifiers stable when people rename display labels.
export function humanChoices(node, text, edges = []) {
  const labels = text.split('\n').map(value => value.trim()).filter(Boolean);
  if (labels.length < 2 || new Set(labels).size !== labels.length) throw new Error('Indiquez au moins deux choix distincts.');
  const old = node.options || ['approve','reject'], used = new Set(), option_labels = {};
  const options = labels.map((label, index) => {
    let id = old.find(key => !used.has(key) && (key === label || humanChoiceLabel(node,key) === label));
    if (!id && !node.operation && old[index] && !labels.includes(node.option_labels?.[old[index]] || old[index]) && (node.option_labels?.[old[index]] || edges.some(edge => edge.from === node.id && edge.outcome === old[index]))) id = old[index];
    if (!id) { const base = informationKey(label); id = base; for (let n=2;used.has(id);n++) id=base.slice(0,72)+'_'+n; }
    if (used.has(id)) throw new Error('Ces choix correspondent à la même branche. Donnez-leur des noms distincts.');
    used.add(id); if (id !== label && label !== humanChoiceLabel({},id)) option_labels[id] = label;
    return id;
  });
  const removed = old.filter(id => !options.includes(id));
  if (removed.some(id => edges.some(edge => edge.from === node.id && edge.outcome === id))) throw new Error('Un choix supprimé possède encore une liaison. Retirez cette liaison avant de retirer le choix.');
  if (node.operation && removed.length) throw new Error('Une autorisation d’opération conserve les choix approve et reject.');
  return {options, option_labels};
}

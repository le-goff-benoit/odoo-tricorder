// Design guidance is advisory. Independent roots and unfinished drafts remain valid.
export function connectionOutcomes(node) {
  if (['decision', 'condition', 'review', 'subworkflow'].includes(node.kind) || node.route_output || node.component_exit) {
    return node.options || (node.kind === 'subworkflow' ? ['done', 'reject'] : ['approve', 'reject']);
  }
  return ['done'];
}

export function designWarnings(graph) {
  const warnings = [];
  for (const node of graph.nodes) {
    const incoming = graph.edges.filter(edge => edge.to === node.id);
    const outgoing = graph.edges.filter(edge => edge.from === node.id);
    const supplied = new Set(incoming.flatMap(edge => Object.values(edge.mapping || {})));
    const parameters = Object.hasOwn(node, 'parameters') ? node.parameters : graph.parameters;
    if (node.kind === 'condition' && !Object.hasOwn(node.inputs || {}, node.parameter) && !Object.hasOwn(parameters || {}, node.parameter)) warnings.push({node:node.id, code:'condition-source', message:'Information à comparer absente. Choisissez une information reçue ou un paramètre déclaré dans les propriétés de cette règle.'});
    const missing = Object.keys(node.inputs || {}).filter(name => !supplied.has(name) &&
      !(node.kind === 'condition' && node.parameter === name && Object.hasOwn(parameters || {}, name)));
    if (missing.length) warnings.push({ node: node.id, code: 'unbound-inputs',
      message: `Entrée${missing.length > 1 ? 's' : ''} sans lien : ${missing.join(', ')}. ${incoming.length
        ? 'Reliez les données attendues ou retirez les entrées inutilisées.'
        : 'Ce bloc n’a pas de prédécesseur. La demande initiale sert de contexte à la consigne ; elle ne remplit pas automatiquement les entrées nommées. Pour travailler sur cette demande, précisez les informations à analyser dans la consigne et retirez les entrées inutilisées. Pour recevoir des données structurées d’une étape précédente, reliez ses sorties à ces entrées.'}` });
    else if (graph.nodes.length > 1 && !incoming.length && !outgoing.length) warnings.push({ node: node.id, code: 'disconnected',
      message: 'Ce bloc est indépendant du reste du workflow. Reliez-le si son travail doit attendre une autre étape.' });
  }
  return warnings;
}

export function parseSimulationValue(type, text, name) {
  if (type === 'string') return text;
  if (type === 'boolean') {
    if (text === 'true' || text === 'false') return text === 'true';
    throw new Error(`${name} : choisissez Oui (true) ou Non (false).`);
  }
  if (type === 'number') {
    if (text.trim() && Number.isFinite(Number(text))) return Number(text);
    throw new Error(`${name} : saisissez un nombre, avec un point pour les décimales.`);
  }
  let value;
  try { value = JSON.parse(text); }
  catch { throw new Error(`${name} : le contenu JSON n’est pas valide.`); }
  if ((type === 'object' && (!value || Array.isArray(value) || typeof value !== 'object')) ||
      (type === 'array' && !Array.isArray(value))) throw new Error(`${name} : saisissez ${type === 'array' ? 'une liste JSON ([…])' : 'un objet JSON ({…})'}.`);
  return value;
}

export function simulationValues(node, fields) {
  // Keep additional imported examples; only declared ports shown in the form are edited.
  const values = { ...(node.sample_outputs || {}) };
  for (const [name, type] of Object.entries(node.outputs || {})) {
    const field = fields[name];
    if (field?.custom) values[name] = parseSimulationValue(type, field.value, name);
    else delete values[name];
  }
  return values;
}

export function copyTitle(title, existing) {
  const names = new Set(existing.map(item => item.title));
  let candidate = `${title} — copie`, index = 2;
  while (names.has(candidate)) candidate = `${title} — copie ${index++}`;
  return candidate;
}

// A reusable method keeps its configuration, not the context of a past request.
export function reusableWorkflow(graph, { keepSimulationExamples = false } = {}) {
  const copy = structuredClone(graph);
  for (const owner of [copy, ...copy.nodes]) {
    if (!keepSimulationExamples) delete owner.sample_outputs;
    if (!owner.parameters) continue;
    for (const key of ['request', 'source_context', 'conversation', 'depends_on_runs', 'source_run', 'source_node', 'source_question']) delete owner.parameters[key];
  }
  return copy;
}

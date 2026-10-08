export const states = Object.freeze({ pending: 'Prévu', ready: 'Prêt', running: 'En cours', waiting: 'Décision attendue', returned: 'À valider', accepted: 'Validé', skipped: 'Non applicable', blocked: 'Bloqué' });
export const kinds = Object.freeze({ task: 'Exemple simulé', agent: 'Tâche IA', command: 'Commande', decision: 'Décision humaine', condition: 'Condition', join: 'Jonction', review: 'Relecture', document: 'Document', external: 'Opération externe', subworkflow: 'Sous-workflow', watch: 'Surveillance', communication: 'Communication' });
export const symbols = Object.freeze({ task: '◇', agent: '✦', command: '›_', decision: '?', condition: '⑂', join: '⋈', review: '✓', document: '▤', external: '↗', subworkflow: '⊞', watch: '◷', communication: '↗' });

export function nodePosition(node, index) { return node.position || { x: 50 + (index % 4) * 300, y: 60 + Math.floor(index / 4) * 180 }; }

export function displayGraph(graph, collapsed, run = null) {
  const grouped = new Map(); const map = new Map(); const nodes = [];
  for (const [i, original] of graph.nodes.entries()) {
    if (!original.phase || !collapsed.has(original.phase)) { nodes.push(original); map.set(original.id, original.id); continue; }
    let group = grouped.get(original.phase);
    if (!group) {
      group = { id: '__phase' + grouped.size, title: original.phase, phase: original.phase, kind: 'group', position: nodePosition(original, i), members: [], statuses: [] };
      grouped.set(original.phase, group); nodes.push(group);
    }
    group.members.push(original.id); map.set(original.id, group.id);
    if (run) group.statuses.push(run.nodes[original.id]?.status || 'pending');
  }
  const priority = ['blocked', 'waiting', 'returned', 'running', 'ready', 'pending', 'accepted', 'skipped'];
  for (const group of grouped.values()) group.status = priority.find(s => group.statuses.includes(s)) || 'pending';
  const edges = graph.edges.map(e => ({ ...e, from: map.get(e.from), to: map.get(e.to), originalFrom: e.from })).filter(e => e.from !== e.to);
  return { ...graph, nodes, edges };
}
export function effectiveExecution(project, graph, node) {
  const result = {};
  for (const key of ['profile', 'provider', 'model', 'effort', 'session']) {
    const sources = [[node, 'Bloc'], [graph.defaults, 'Workflow'], [project.defaults, 'Projet']];
    const found = sources.find(([source]) => source && Object.hasOwn(source, key));
    result[key] = found ? { value: found[0][key], source: found[1] } : { value: '', source: 'Non défini' };
  }
  return result;
}

export function applyPatch(graph, patch) {
  if (!patch || patch.baseRevision !== (graph.revision || 0)) throw new Error('La proposition vise une autre révision du workflow.');
  if (!Array.isArray(patch.operations) || patch.operations.length > 100) throw new Error('Proposition invalide.');
  const next = structuredClone(graph);
  for (const operation of patch.operations) {
    if (operation.type === 'add-node') next.nodes.push(structuredClone(operation.node));
    else if (operation.type === 'add-edge') next.edges.push(structuredClone(operation.edge));
    else if (operation.type === 'update-node') {
      const node = next.nodes.find(n => n.id === operation.id);
      if (!node) throw new Error('Bloc inconnu.');
      if (operation.changes.id || operation.changes.criteria || operation.changes.operation || operation.changes.approval) throw new Error('Les critères et autorisations se modifient explicitement dans l’inspecteur.');
      Object.assign(node, structuredClone(operation.changes));
    } else throw new Error('Opération de proposition non prise en charge.');
  }
  return next;
}

export function patchSummary(patch) {
  return patch.operations.map(op => op.type === 'add-node' ? `Ajouter « ${op.node.title} » (${kinds[op.node.kind] || op.node.kind})` : op.type === 'add-edge' ? `Relier ${op.edge.from} → ${op.edge.to}` : `Modifier ${op.id} : ${Object.keys(op.changes).join(', ')}`);
}

export class History {
  constructor() { this.past = []; this.future = []; }
  push(graph) { this.past.push(structuredClone(graph)); if (this.past.length > 100) this.past.shift(); this.future = []; }
  undo(graph) { if (!this.past.length) return graph; this.future.push(structuredClone(graph)); return this.past.pop(); }
  redo(graph) { if (!this.future.length) return graph; this.past.push(structuredClone(graph)); return this.future.pop(); }
}

export function orthogonalPath(x, y, endX, endY) {
  if (endX >= x + 40) { const mid = (x + endX) / 2; return `M${x},${y} H${mid} V${endY} H${endX}`; }
  // Route backwards around the endpoints instead of crossing their cards.
  const lane = Math.min(y, endY) - 100;
  return `M${x},${y} H${x + 24} V${lane} H${endX - 24} V${endY} H${endX}`;
}

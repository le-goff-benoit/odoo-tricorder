export function dependencyGraph(tasks, selected = '') {
  const byId = new Map(tasks.map(t => [t.id, t])), errors = [], edges = [];
  const depths = new Map(), visiting = new Set();
  function depth(id) {
    if (depths.has(id)) return depths.get(id);
    if (visiting.has(id)) { errors.push('Cycle de dépendances : ' + id); return 0; }
    visiting.add(id);
    const dependencies = (byId.get(id)?.depends_on || []).filter(parent => {
      if (!byId.has(parent)) { errors.push(`${id} dépend d’une tâche absente : ${parent}`); return false; }
      return true;
    });
    const result = dependencies.length ? 1 + Math.max(...dependencies.map(depth)) : 0;
    visiting.delete(id); depths.set(id, result); return result;
  }
  tasks.forEach(t => depth(t.id));
  for (const task of tasks) for (const parent of task.depends_on || []) if (byId.has(parent)) edges.push({ from: parent, to: task.id, kind: 'result' });
  function relatives(reverse) {
    const found = new Set(), queue = [selected];
    while (queue.length) {
      const id = queue.shift();
      for (const edge of edges) {
        const candidate = reverse ? edge.from : edge.to;
        if ((reverse ? edge.to : edge.from) === id && candidate !== selected && !found.has(candidate)) { found.add(candidate); queue.push(candidate); }
      }
    }
    return found;
  }
  const ancestors = relatives(true), descendants = relatives(false), counts = new Map();
  const nodes = tasks.map(task => {
    const level = depths.get(task.id), row = counts.get(level) || 0; counts.set(level, row + 1);
    return { ...task, x: 24 + level * 270, y: 24 + row * 145, related: !selected || task.id === selected || ancestors.has(task.id) || descendants.has(task.id) };
  });
  const values = task => Object.entries(task?.resources || {}).flatMap(([type, value]) => (Array.isArray(value) ? value : [value]).map(v => `${type}:${typeof v === 'object' ? JSON.stringify(v) : v}`));
  const targetResources = values(byId.get(selected));
  const resources = tasks.filter(t => t.id !== selected && selected && ((t.scopes || []).some(scope => (byId.get(selected)?.scopes || []).some(other => scope === other || scope.startsWith(other + '/') || other.startsWith(scope + '/'))) || values(t).some(value => targetResources.includes(value)))).map(t => t.id);
  return { nodes, edges, ancestors: [...ancestors], descendants: [...descendants], resources, errors: [...new Set(errors)], width: Math.max(540, ...nodes.map(n => n.x + 246)), height: Math.max(200, ...nodes.map(n => n.y + 130)) };
}
export function intentionItems(detail) {
  return Array.isArray(detail.intentions) ? detail.intentions : detail.intentions?.items || [];
}
export function intentionTasks(detail, intention) {
  return (detail.tasks || []).filter(t => (intention.tasks || []).includes(t.id) || (t.intentions || t.intention_ids || []).includes(intention.id));
}

// A request is visible before the orchestrator has created executable tasks.
// Links resolve against this release's actual plan; a dangling historical link
// must not make a request disappear. The registry itself stays untouched.
export function intentionCards(detail) {
  return intentionItems(detail).filter(intention =>
    ['clarify', 'ready', 'planned'].includes(intention.status) && !intentionTasks(detail, intention).length
  ).map(intention => {
    const clarify = intention.status === 'clarify';
    const label = clarify ? 'À préciser' : 'À planifier';
    const reason = clarify ? 'Demande à préciser par l’orchestrateur.' :
      intention.tasks?.length ? 'Les tâches liées ne sont plus présentes dans le plan.' : 'L’orchestrateur doit encore construire le plan de cette demande.';
    return { id: 'intention:' + intention.id, intentionId: intention.id, kind: 'intention', executable: false,
      title: intention.purpose || intention.text || intention.id, text: intention.text || '', source: intention.source,
      status: clarify ? 'intention_clarify' : 'intention_pending', column: 'todo', reason,
      presentation: { received: false, validation: 'not_recorded', column: 'todo', label, proof: '', reason },
      owners: [], providers: [], activities: [], waiting: false, blocked: false, acceptance: [], depends_on: [],
      flows: [], agents: [], measures: { actual: null, initial: null, revised: null },
    };
  });
}

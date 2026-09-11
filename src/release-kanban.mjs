import { taskMeasures, agentMeasures, withoutPreparationOverlap } from './measurements.mjs';

export const releaseColumns = [['todo', 'À faire'], ['working', 'En cours'], ['review', 'À réceptionner'], ['done', 'Réceptionnées']];
export function releaseColumn(task, flow) {
  if (task.progress === 'received' || task.status === 'validated') return 'done';
  if (task.status === 'deferred' || task.progress === 'deferred') return 'deferred';
  if (task.status === 'awaiting_receipt') return 'review';
  if (['running', 'claimed', 'active'].includes(task.status)) return 'working';
  if (['pending', 'ready'].includes(task.status)) return 'todo';
  if (['blocked', 'waiting_human', 'interrupted'].includes(task.status) && flow?.nodes?.length) return 'working';
  return 'unknown';
}

// Bindings supplied by the controller are already restricted to this project.
export function releaseCards(detail, bindings = []) {
  const native = withoutPreparationOverlap(bindings, detail.effort?.preparationSessions);
  return (detail.tasks || []).map(task => {
    const flows = (detail.flows || []).filter(f => (!f.release || f.release === detail.selectedRelease) &&
      (f.path === task.flow || task.flowPaths?.includes(f.path)));
    // Never elect a current agent from several historical attempts.
    const flow = flows.find(f => f.path === task.flow);
    const nodes = flow?.nodes || [], claimed = nodes.filter(n => n.status === 'claimed');
    const next = nodes.filter(n => n.status === 'ready');
    const observed = native.filter(b => b.task === task.id && b.release === detail.selectedRelease);
    const agents = observed.flatMap(b => b.agents || []).filter(a => !a.stale);
    const waiting = task.status === 'waiting_human' || flow?.status === 'waiting_human' ||
      next.some(n => n.executor === 'human') || agents.some(a => a.state === 'waiting_human');
    const active = agents.some(a => ['active', 'tool'].includes(a.state));
    const recorded = (detail.effort?.rows || []).filter(r => r.task === task.id);
    const measured = observed.filter(b => b.provider !== 'codex-runtime');
    const breakdown = agentMeasures(recorded, measured, flows.flatMap(f => f.nodes || []));
    const measures = taskMeasures(recorded, measured);
    if (measures.actual != null && breakdown.some(a => a.actual == null && a.reasons.includes('Intervention enregistrée · durée non mesurée'))) {
      measures.partial = true; measures.delta = null;
    }
    return { ...task, column: releaseColumn(task, flow), flows, flow, waiting,
      blocked: ['blocked', 'interrupted', 'deadlocked'].includes(task.status) || ['blocked', 'deadlocked'].includes(flow?.status),
      owners: [...new Set(claimed.map(n => n.owner).filter(Boolean))],
      providers: [...new Set(observed.map(b => b.provider?.split('-')[0]).filter(p => ['codex', 'claude'].includes(p)))],
      stage: claimed.map(n => n.description || n.role).join(' · ') || (next.length ? 'Prochaine étape : ' + next.map(n => n.description || n.role).join(' · ') : ''),
      activity: waiting ? 'Votre décision est attendue' : active ? 'Activité observée' : 'Activité non confirmée',
      measures, agents: breakdown,
    };
  });
}
export function filterCards(cards, filter, owner) {
  return cards.filter(t => (!owner || t.owners.includes(owner)) &&
    (filter === 'all' || filter === 'ready' && t.status === 'ready' || filter === 'blocked' && t.blocked || filter === 'waiting' && t.waiting));
}

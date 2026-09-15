const executing = new Set(['active', 'tool']);
const waiting = new Set(['waiting_human', 'waiting_agent', 'waiting_tool', 'waiting_resource', 'paused']);
const date = value => typeof value === 'number' ? (value < 1e12 ? value * 1000 : value) : Date.parse(value);
export function activities(detail, bindings = []) {
  const rows = new Map();
  for (const binding of bindings.filter(b => (b.release || null) === (detail.selectedRelease || null))) {
    for (const agent of binding.agents || []) {
      const key = `${binding.provider?.split('-')[0]}:${agent.nativeId || binding.id || binding.task || 'main'}`;
      const events = [...(agent.events || [])].filter(e => Number.isFinite(date(e.at))).sort((a, b) => date(a.at) - date(b.at));
      const latest = events.at(-1);
      let start = agent.stageStartedAt || agent.startedAt || null;
      // The start is known only when the state transition was actually observed.
      if (!start && latest?.state === agent.state) {
        let index = events.length - 1;
        while (index > 0 && events[index - 1].state === agent.state) index--;
        if (index > 0 || ['UserPromptSubmit', 'SubagentStart', 'turn/started', 'task_started', 'PreToolUse'].includes(events[index].kind)) start = events[index].at;
      }
      const stale = !!agent.stale && (executing.has(agent.state) || waiting.has(agent.state));
      const row = { id: key, task: agent.task || binding.task || null, provider: binding.provider?.split('-')[0], role: agent.role || binding.role, parentId: agent.parentId || null,
        model: agent.model || binding.model, state: agent.state, stale, lastAt: agent.lastAt,
        label: stale ? 'Suivi à vérifier' : ({ active: 'Travail en cours', tool: 'Commande en cours', waiting_human: 'Décision attendue', waiting_agent: 'Attend un agent', waiting_tool: 'Attend un outil', waiting_resource: 'Attend une ressource', paused: 'En pause', complete: 'Terminé', interrupted: 'Interrompu', idle: 'Attend une saisie' }[agent.state] || 'Activité inconnue'),
        stage: agent.tool || agent.stage || '', startedAt: start, endedAt: agent.endedAt || null,
        executing: !agent.stale && executing.has(agent.state), waiting: !agent.stale && waiting.has(agent.state) };
      const prior = rows.get(key);
      if (!prior || date(row.lastAt) > date(prior.lastAt)) rows.set(key, row);
    }
  }
  const trace = detail.orchestration;
  if (trace && ![...rows.values()].some(a => !a.parentId && !a.task && ['orchestrator', 'orchestrateur'].includes(a.role))) {
    const updatedAt = trace.updatedAt || trace.updated_at, stamp = date(updatedAt);
    const state = trace.status || trace.state, isActive = ['active', 'running'].includes(state);
    const stale = (isActive || waiting.has(state)) && (!Number.isFinite(stamp) || Date.now() - stamp > 90000 || stamp > Date.now() + 30000);
    rows.set('orchestration:' + trace.id, { id: 'orchestration:' + trace.id, task: null, role: 'orchestrator', provider: trace.provider, model: trace.model,
      state, stale, lastAt: updatedAt, startedAt: trace.phaseStartedAt || trace.phase_started_at || null, endedAt: trace.endedAt || trace.ended_at || null,
      stage: trace.phase, label: stale ? 'Suivi à vérifier' : isActive ? 'Orchestration en cours' : ({ waiting_human: 'Décision attendue', waiting_agent: 'Attend un agent', waiting_resource: 'Attend une ressource', paused: 'En pause', complete: 'Terminée', interrupted: 'Interrompue' }[state] || 'Activité non confirmée'),
      executing: !stale && isActive, waiting: !stale && waiting.has(state) });
  }
  return [...rows.values()];
}
export function elapsed(activity, now = Date.now()) {
  const start = date(activity.startedAt), end = activity.endedAt ? date(activity.endedAt) : now;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 'Durée inconnue';
  if (activity.stale && !activity.endedAt) return 'Durée à vérifier';
  if (!activity.executing && !activity.waiting && !activity.endedAt) return 'Durée inconnue';
  const seconds = Math.floor((end - start) / 1000);
  return `${Math.floor(seconds / 3600) ? Math.floor(seconds / 3600) + ':' : ''}${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function timerMarkup(activity, esc) {
  return `<span class="activity-timer" data-activity-start="${esc(activity.startedAt || '')}" data-activity-end="${esc(activity.endedAt || '')}" data-activity-state="${activity.stale ? 'stale' : activity.executing ? 'active' : activity.waiting ? 'waiting' : 'ended'}" title="Temps écoulé de l’étape observée">${elapsed(activity)}</span>`;
}
export function tickTimers(root = document) {
  for (const element of root.querySelectorAll('[data-activity-start]')) {
    const d = element.dataset;
    const value = elapsed({ startedAt: d.activityStart, endedAt: d.activityEnd, stale: d.activityState === 'stale', executing: d.activityState === 'active', waiting: d.activityState === 'waiting' });
    if (element.textContent !== value) element.textContent = value;
  }
}
export function orchestrationCard(detail, bindings = []) {
  const trace = detail.orchestration;
  const live = activities(detail, bindings).filter(a => !a.task && !a.parentId && ['orchestrator', 'orchestrateur'].includes(a.role));
  const status = trace?.status || 'unknown';
  const complete = ['complete', 'completed'].includes(status);
  return { id: trace?.id || 'ORCHESTRATION', kind: 'orchestration', title: 'Orchestration de la release',
    status, progress: complete ? 'received' : status, validation: 'not_recorded',
    column: complete ? 'done' : ['active', 'running', 'waiting_agent', 'waiting_human', 'waiting_resource', 'paused'].includes(status) ? 'working' : 'unknown',
    phase: trace?.phase || 'Phase non renseignée', stage: trace?.phase || 'Suivi d’orchestration absent',
    reason: trace?.waitingReason || trace?.waiting_reason || (!trace ? 'Cette release ne contient pas encore de trace d’orchestration.' : ''),
    owners: trace?.owner ? [trace.owner] : [], providers: trace?.provider ? [trace.provider] : [], model: trace?.model || null,
    taskIds: trace?.authorized_tasks || trace?.taskIds || [], depends_on: [], acceptance: [], flows: [], agents: [],
    measures: { actual: null, initial: null, revised: null }, activities: live,
    waiting: ['waiting_agent', 'waiting_human', 'waiting_resource', 'paused'].includes(status), blocked: status === 'blocked',
    activity: live.find(a => a.executing)?.label || (status === 'waiting_agent' ? 'Attend un agent' : status === 'paused' ? 'En pause' : 'Activité non confirmée'),
  };
}

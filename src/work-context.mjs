// Consultation is not execution: only label what a trace or workflow supports.
export function workStatus(state, observations = []) {
  const detail = state.detail;
  const terminal = state.sessions.find(t => t.project === state.current && t.id === state.selectedSession.get(state.current));
  if (state.view === 'terminal' && terminal && (terminal.release || null) !== (detail.selectedRelease || null)) {
    const title = detail.releases.find(r => r.id === terminal.release)?.title || terminal.release || 'hors release';
    return { kind: 'different', label: 'Terminal sur un autre contexte', text: title };
  }
  const agents = observations.filter(b => b.project === state.current && (b.release || null) === (detail.selectedRelease || null))
    .flatMap(b => (b.agents || []).filter(a => !a.stale).map(a => ({ ...a, binding: b })));
  const observed = agents.find(a => a.state === 'waiting_human') || agents.find(a => ['active', 'tool'].includes(a.state));
  if (observed) {
    const provider = observed.binding.provider?.startsWith('codex') ? 'Codex' : 'Claude';
    const task = detail.tasks.find(t => t.id === observed.binding.task);
    return { kind: observed.state === 'waiting_human' ? 'waiting' : 'observed',
      label: observed.state === 'waiting_human' ? 'Votre réponse est attendue' : 'Dernière activité observée',
      text: `${provider} · ${task ? task.id + ' · ' + task.title : observed.binding.task ? 'Tâche non retrouvée dans le plan' : detail.selectedRelease ? 'Release complète' : 'Travail hors release'}` };
  }
  const claims = (detail.flows || []).flatMap(f => (f.nodes || []).filter(n => n.status === 'claimed').map(n => ({ flow: f, node: n })));
  if (claims.length) {
    const { flow, node } = claims[0];
    const task = detail.tasks.find(t => t.flow === flow.path);
    return { kind: 'assigned', label: claims.length > 1 ? `${claims.length} étapes prises en charge` : 'Étape prise en charge',
      text: `${task ? task.id + ' · ' : ''}${node.description || node.role || 'Travail'}${node.owner ? ' · ' + node.owner : ''}` };
  }
  if (detail.effort?.rows?.some(r => r.phase === 'preparation' && r.timeState === 'running')) {
    return { kind: 'preparation', label: 'Préparation du plan', text: 'Mesure en cours · les tâches viendront ensuite' };
  }
  return { kind: 'idle', label: 'Aucune activité confirmée', text: detail.selectedRelease ? 'Le plan reste disponible dans les onglets ci-dessous.' : 'Commencez librement dans le terminal, puis créez votre release.' };
}

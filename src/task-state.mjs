// Historical delivery, current proof applicability and live activity are separate axes.
export function taskState(task, flow) {
  const received = task.progress === 'received' || task.status === 'validated';
  const validation = task.validation || (task.status === 'validated' ? 'validated' : task.status === 'stale' ? 'stale' : 'not_recorded');
  const deployed = task.delivery?.status === 'deployed_verified' && task.delivery?.verified === true;
  const testing = (flow?.nodes || []).some(n => n.status === 'claimed' && /qa|test|reception|recette/.test(n.id + ' ' + n.role));
  let column = 'unknown';
  if (received) column = 'done';
  else if (task.status === 'deferred' || task.progress === 'deferred') column = 'deferred';
  else if (task.status === 'awaiting_receipt') column = 'review';
  else if (['running', 'claimed', 'active'].includes(task.status)) column = 'working';
  else if (['pending', 'ready'].includes(task.status)) column = 'todo';
  else if (['blocked', 'interrupted', 'deadlocked'].includes(task.status)) column = 'blocked';
  else if (task.status === 'waiting_human') column = 'working';
  if (deployed) column = 'deployed';
  else if (received && validation !== 'validated') column = 'review';
  else if (testing) column = 'review';
  const label = deployed ? 'Déployée' : column === 'review' ? testing ? 'Tests en cours' : 'Tests à reprendre' : received ? 'À déployer' : ({ ready: 'À faire', pending: 'À faire', deferred: 'Reportée', running: 'En cours', claimed: 'En cours', awaiting_receipt: 'Tests en cours', blocked: 'Bloquée', waiting_human: 'Décision attendue', interrupted: 'Interrompue' }[task.status] || 'État à vérifier');
  const proof = received ? validation === 'validated' ? '' : 'Tests à actualiser' : task.status === 'done' ? 'Réalisation déclarée · validation non vérifiée' : '';
  return { received, deployed, validation, column, label, proof, reason: task.reason || '' };
}

// Workflow steps as a compact rail: one segment per node, in graph order.
export function stageRail(flow, esc = v => String(v ?? '')) {
  const nodes = (flow?.nodes || []).slice(0, 8);
  if (!nodes.length) return '';
  const label = nodes.map(n => `${n.description || n.role || n.id} : ${{ done: 'parcourue', claimed: 'en cours', ready: 'prête', blocked: 'bloquée' }[n.status] || 'à venir'}`).join(' · ');
  return `<span class="stage-rail" title="${esc(label)}" aria-label="${esc(label)}">${nodes.map(n => `<i class="${esc(n.status || 'pending')}"></i>`).join('')}</span>`;
}

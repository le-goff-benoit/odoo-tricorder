// Presentation of recorded workflow activity; a live terminal is not a running step.
export function failedResult(node, definition) {
  const routedFinding = node?.result?.ok === true && definition?.route_output === 'verdict' && definition.options?.includes('fail');
  return Boolean(node?.validation_error || node?.result?.ok === false || (!routedFinding && node?.result?.outputs?.verdict === 'fail'));
}

export function executionIssue(run) {
  if (run?.health) return run.health.issues?.[0] || null;
  const entry = Object.entries(run?.nodes || {}).find(([id, node]) => !['accepted', 'skipped'].includes(node.status) && failedResult(node, run.definition?.nodes?.find(n => n.id === id)));
  if (!entry) return null;
  const [id, node] = entry;
  const summary = (node.result?.ok === false && node.result?.summary) || node.validation_error || node.result?.summary || node.reason;
  return { node: id, title: run.definition?.nodes?.find(n => n.id === id)?.title || id,
    reason: typeof summary === 'string' ? summary : summary?.preview || 'Le résultat ne satisfait pas le contrôle demandé.' };
}

export function activitySummary(items) {
  const counts = { running: 0, questions: 0, decisions: 0, results: 0, failed: 0, dependencies: 0 };
  for (const item of items || []) {
    const run = item.execution || item;
    if (run.coordination_wait) { counts.dependencies++; continue; }
    if (['completed', 'cancelled'].includes(run.status)) continue;
    const nodes = Object.values(run.nodes || {});
    const count = status => run.counts?.[status] ?? nodes.filter(n => n.status === status).length;
    counts.running += count('running');
    counts.questions += count('waiting_input');
    counts.decisions += count('waiting');
    counts.results += count('returned');
    if (run.health?.status === 'failed' || run.focus?.status === 'failed' || executionIssue(run)) counts.failed++;
  }
  return counts;
}

export function executionAction(run) {
  if (!run) return { label: 'Voir le suivi', detail: 'Aucune demande sélectionnée.' };
  if (run.coordination_hold) return { label: 'Voir la suspension', detail: 'Exécution suspendue manuellement ; la reprise reste à votre initiative.' };
  if (run.coordination_wait) return { label: 'Voir les dépendances', detail: 'En attente des demandes précédentes.' };
  if (run.status === 'paused') return { label: 'Voir la suspension', detail: 'Exécution suspendue par une action explicite.' };
  if (run.status === 'completed') return { mode: 'document', label: 'Voir le rapport', detail: 'Exécution terminée.' };
  if (run.status === 'cancelled') return { mode: 'document', label: 'Voir le rapport', detail: 'Exécution annulée.' };
  const focus = run.focus;
  const status = run.nodes?.[focus?.node]?.status || focus?.status;
  const issue = executionIssue(run);
  if (status === 'waiting_input') return { node: focus.node, label: 'Répondre à la question', detail: focus.title };
  if (status === 'waiting') return { node: focus.node, label: 'Examiner la décision', detail: focus.title };
  if (issue) return { node: issue.node, label: 'Examiner l’échec', detail: issue.title };
  if (status === 'returned') return { node: focus.node, label: 'Examiner le résultat', detail: focus.title };
  if (status === 'running') return { node: focus.node, label: 'Voir l’activité', detail: focus.title };
  if (status === 'ready') return { node: focus.node, label: 'Voir la prochaine étape', detail: focus.title };
  return { node: focus?.node, label: 'Voir le détail', detail: focus?.title || 'Le workflow attend ses dépendances.' };
}

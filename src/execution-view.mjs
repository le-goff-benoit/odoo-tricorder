// Presentation of recorded workflow activity; a live terminal is not a running step.
export function executionProgress(run) {
  const states = Object.values(run?.nodes || {});
  const processed = states.filter(node => node.status === 'accepted').length;
  const skipped = states.filter(node => node.status === 'skipped').length;
  return { total: states.length, finished: processed + skipped, processed, skipped,
    detail: skipped ? `${processed} traitée${processed === 1 ? '' : 's'} · ${skipped} non applicable${skipped === 1 ? '' : 's'}` : '' };
}

export function launchReadiness(run, id) {
  let entry=run?.launch?.nodes?.find(node=>node.node===id);
  if(!entry && run?.nodes?.[id]?.status==='ready' && run?.launch?.nodes_truncated)entry={status:'unknown',reason:'La disponibilité de ce bloc n’est pas détaillée sur cette page. Vérifiez sa configuration dans le terminal avant de le lancer.'};
  return entry ? {...entry,label:({ready:'Prête au lancement',configuration:'À configurer',native:'À poursuivre dans le terminal',waiting:'En attente',unknown:'À vérifier'})[entry.status]} : null;
}

export function failedResult(node, definition) {
  const routedFinding = node?.result?.ok === true && definition?.route_output === 'verdict' && definition.options?.includes('fail');
  return Boolean(node?.validation_error || node?.result?.ok === false || (!routedFinding && node?.result?.outputs?.verdict === 'fail'));
}

export function retryGuidance(state, node) {
  if (state.effect_uncertain || state.result?.effect_id || node.kind === 'external') return 'Vérifiez le résultat de l’opération externe avant toute nouvelle tentative.';
  const limit = node.max_attempts || 1;
  if ((state.attempt || 0) >= limit) return `${state.attempt} tentative${state.attempt > 1 ? 's' : ''} sur ${limit} utilisée${state.attempt > 1 ? 's' : ''}. Corrigez le périmètre ou le workflow, puis créez une nouvelle demande. Les résultats précédents restent consultables.`;
  return 'Précisez la correction avant de relancer. Le résultat précédent reste dans l’historique.';
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
  if (run.status === 'cancelled') return { mode: 'document', label: 'Voir le rapport', detail: 'Exécution annulée.' };
  if (run.coordination_hold) return { label: 'Voir la suspension', detail: 'Exécution suspendue manuellement ; la reprise reste à votre initiative.' };
  if (run.coordination_wait) return { label: 'Voir les dépendances', detail: 'En attente des demandes précédentes.' };
  if (run.status === 'paused') return { label: 'Voir la suspension', detail: 'Exécution suspendue par une action explicite.' };
  if (run.status === 'completed') return { mode: 'document', label: 'Voir le rapport', detail: 'Exécution terminée.' };
  const focus = run.focus;
  const status = run.nodes?.[focus?.node]?.status || focus?.status;
  const issue = executionIssue(run);
  if (status === 'waiting_input') return { node: focus.node, label: 'Répondre à la question', detail: focus.title };
  if (status === 'waiting') return { node: focus.node, label: 'Examiner la décision', detail: focus.title };
  if (issue) return { node: issue.node, label: 'Examiner l’échec', detail: issue.title };
  if (status === 'returned') return { node: focus.node, label: 'Examiner le résultat', detail: focus.title };
  if (status === 'running') return { node: focus.node, label: 'Voir l’activité', detail: focus.title };
  if (status === 'ready') {
    const readiness=launchReadiness(run,focus.node);
    if(readiness && readiness.status!=='ready')return {node:focus.node,label:readiness.status==='configuration' ? 'Examiner la configuration' : readiness.status==='native' ? 'Voir les instructions' : readiness.status==='unknown' ? 'Vérifier le bloc' : 'Voir l’attente',detail:readiness.reason};
    return { node: focus.node, label: 'Voir la prochaine étape', detail: focus.title };
  }
  return { node: focus?.node, label: 'Voir le détail', detail: focus?.title || 'Le workflow attend ses dépendances.' };
}

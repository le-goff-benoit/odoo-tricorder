// Presentation of recorded workflow activity; a live terminal is not a running step.
export function requestHeading(...values) {
  for (const value of values) {
    const text = typeof value === 'string' ? value : value?.$artifact && typeof value.preview === 'string' ? value.preview : '';
    const line = text.split('\n')[0].trim();
    if (line) return line.length > 100 ? line.slice(0, 100) + '…' : line;
  }
  return 'Demande';
}

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

export function readableFailure(reason) {
  if (typeof reason !== 'string') return reason;
  const match = reason.match(/^Sortie (.+) absente ou incompatible avec le type (string|number|boolean|object|array|any)$/);
  if (!match) return reason;
  const expected = {string:'un texte',number:'un nombre',boolean:'une réponse Oui/Non',object:'des données structurées',array:'une liste',any:'une valeur'}[match[2]];
  return `Le résultat doit fournir ${expected} dans « ${match[1]} ». Vérifiez la sortie attendue dans le bloc et précisez la correction avant de relancer.`;
}

export function executionIssue(run) {
  if (run?.health) {
    const issue = run.health.issues?.[0];
    return issue ? {...issue, reason:readableFailure(issue.reason)} : null;
  }
  const entry = Object.entries(run?.nodes || {}).find(([id, node]) => !['accepted', 'skipped'].includes(node.status) && failedResult(node, run.definition?.nodes?.find(n => n.id === id)));
  if (!entry) return null;
  const [id, node] = entry;
  const summary = (node.result?.ok === false && node.result?.summary) || node.validation_error || node.result?.summary || node.reason;
  return { node: id, title: run.definition?.nodes?.find(n => n.id === id)?.title || id,
    reason: readableFailure(typeof summary === 'string' ? summary : summary?.preview || 'Le résultat ne satisfait pas le contrôle demandé.') };
}

export function activitySummary(items) {
  const counts = { running: 0, questions: 0, decisions: 0, results: 0, failed: 0, dependencies: 0 };
  for (const item of items || []) {
    const run = item.execution || item;
    if (['completed', 'cancelled'].includes(run.status)) continue;
    if (run.coordination_wait || run.iteration_wait && !run.iteration_hold) { counts.dependencies++; continue; }
    const nodes = Object.values(run.nodes || {});
    const count = status => run.counts?.[status] ?? nodes.filter(n => n.status === status).length;
    const child=childActivity(run);counts.running += child.running;counts.questions += child.question;counts.decisions += child.decision;counts.failed += child.failed;
    counts.running += count('running');
    counts.questions += count('waiting_input');
    counts.decisions += count('waiting');
    counts.results += count('returned');
    if (run.health?.status === 'failed' || run.focus?.status === 'failed' || executionIssue(run)) counts.failed++;
  }
  return counts;
}

export function childActivity(run) {
  const totals={question:0,decision:0,failed:0,running:0,waiting:0};
  for(const family of Object.values(run?.coordination || {}))for(const key of Object.keys(totals))totals[key]+=family.counts?.[key] || 0;
  return totals;
}
export function childActivityLabel(run) {
  const counts=childActivity(run), labels=[];
  for(const [key,singular,plural] of [['failed','élément en échec','éléments en échec'],['question','réponse attendue','réponses attendues'],['decision','décision attendue','décisions attendues']])if(counts[key])labels.push(`${counts[key]} ${counts[key]===1?singular:plural}`);
  return labels.join(' · ');
}

export function executionAction(run) {
  if (!run) return { label: 'Voir le suivi', detail: 'Aucune demande sélectionnée.' };
  if (run.status === 'cancelled') return { mode: 'document', label: 'Voir le rapport', detail: 'Exécution annulée.' };
  if (run.parent_paused) return {label:'Voir le workflow parent',detail:'Le workflow parent est suspendu. Sa reprise se décide dans le suivi parent.'};
  if (run.iteration_hold) return {label:'Voir la suspension',detail:'Cette tâche a été suspendue manuellement.'};
  if (run.iteration_wait) return {label:'Voir les dépendances',detail:'Cette tâche attend ses prérequis. Le coordinateur la démarrera lorsqu’ils seront terminés.'};
  if (run.coordination_hold) return { label: 'Voir la suspension', detail: 'Exécution suspendue manuellement ; la reprise reste à votre initiative.' };
  if (run.coordination_wait) return { label: 'Voir les dépendances', detail: 'En attente des demandes précédentes.' };
  if (run.status === 'paused') return { label: 'Voir la suspension', detail: 'Exécution suspendue par une action explicite.' };
  if (run.status === 'completed') return { mode: 'document', label: 'Voir le rapport', detail: 'Exécution terminée.' };
  const focus = run.focus;
  const status = run.nodes?.[focus?.node]?.status || focus?.status;
  const issue = executionIssue(run);
  if (status === 'collecting') return { node: focus.node, label: 'Compléter les intentions', detail: 'Recueil ouvert : ajoutez vos contributions puis confirmez la liste.' };
  const families=Object.entries(run.coordination || {}), child=childActivity(run), priority=child.failed?'failed':child.question?'question':child.decision?'decision':null;
  if(priority) return {node:families.find(([,data])=>data.counts?.[priority])?.[0],label:priority==='failed'?'Examiner les éléments en échec':priority==='question'?'Répondre aux questions':'Examiner les décisions',detail:childActivityLabel(run)};
  if (status === 'waiting_children') return { node: focus.node, label: 'Suivre les éléments', detail: 'Coordination du workflow : travaux, agents et dépendances par élément.' };
  if (status === 'ready' && run.definition?.nodes?.find(n => n.id === focus.node)?.kind === 'foreach') return { node: focus.node, label: 'Lancer les éléments', detail: 'La liste est prête. Activez son traitement dans le suivi.' };
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

import { activitySummary, executionAction, executionIssue } from './execution-view.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title = value => String(value || 'Demande sans titre').split('\n')[0];
const count = value => Number.isFinite(value) ? Math.max(0, value) : 0;

export function dependencyLabel(dep) {
  if(dep.satisfied) return 'Terminée';
  if(dep.status==='cancelled') return 'Annulée';
  if(dep.status==='completed') return dep.completion_outcome==='rejected' ? 'Refusée' : dep.completion_outcome==='blocked' ? 'Terminée · suite bloquée' : 'Terminée';
  if(dep.coordination_hold) return 'Suspendue manuellement';
  if(dep.coordination_wait) return 'Attend une autre demande';
  return ({paused:'Suspendue',active:'En attente de réussite'})[dep.status] || 'État à vérifier';
}
export function dependencyBlocked(dep) {return dep.status==='cancelled' || (dep.status==='completed' && ['rejected','blocked'].includes(dep.completion_outcome));}

export function conversationActivity(conversation) {
  if (conversation.activity) return { ...conversation.activity, global: true };
  return { ...activitySummary(conversation.items || []), items: (conversation.items || []).length, global: false };
}

export function activityText(conversation) {
  const a = conversationActivity(conversation);
  return [a.running ? `${a.running} étape${a.running > 1 ? 's' : ''} en cours` : 'Aucune étape en cours',
    a.ready ? `${a.ready} demande${a.ready > 1 ? 's' : ''} à prendre en charge` : '',
    a.questions ? `${a.questions} question${a.questions > 1 ? 's' : ''}` : '',
    a.decisions ? `${a.decisions} décision${a.decisions > 1 ? 's' : ''}` : '',
    a.failed ? `${a.failed} échec${a.failed > 1 ? 's' : ''}` : '',
    a.dependencies ? `${a.dependencies} en attente de dépendances` : '',
    a.completed ? `${a.completed} terminée${a.completed > 1 ? 's' : ''}` : '',
    a.paused ? `${a.paused} suspendue${a.paused > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
}

export function workerPresentation(worker, now = Date.now() / 1000) {
  const signal = worker.heartbeat || worker.started;
  const age = signal ? Math.max(0, now - signal) : null;
  const stale = age === null || age > 120;
  const kind = ['agent', 'task'].includes(worker.kind) ? 'Agent' : ({command:'Commande',document:'Document'}[worker.kind] || 'Exécutant');
  const provider = ({codex:'OpenAI',claude:'Anthropic'}[worker.provider] || worker.provider);
  const identity = [kind, worker.role && worker.role !== 'generalist' ? worker.role : '', provider, worker.model].filter(Boolean).join(' · ');
  const activity = stale ? (age === null ? 'Dernier signal inconnu' : `Dernier signal il y a ${Math.max(2,Math.floor(age/60))} min · activité à vérifier`) : worker.ownership === 'native' ? 'Pris en charge dans le terminal' : 'En cours';
  return { identity, activity, stale, title: worker.title || worker.node || 'Étape en cours' };
}

export function overviewModel(conversation, projects = [], now = Date.now() / 1000) {
  const items = conversation.items || [];
  const byItem = new Map(items.map(item => [item.id, item]));
  const byRun = new Map(items.map(item => [item.run, item]));
  const contexts = new Map([...projects, ...(conversation.project_contexts || [])].map(project => [project.id, project.title]));
  const rows = items.map(item => {
    const run = item.execution || {};
    const dependencies = item.dependencies || (item.depends_on || []).map(id => {
      const linked = byItem.get(id);
      return linked ? {run:linked.run, request:linked.request, project:linked.project, status:linked.execution?.status} : {id, request:'Demande hors de cette page'};
    });
    return { ...item, title:title(item.request), projectTitle:contexts.get(item.project) || item.project || 'Sans projet',
      workers:(run.workers || []).map(worker => workerPresentation(worker, now)), workersTotal:count(run.workers_total ?? run.workers?.length),
      dependencies:dependencies.map(dep => ({...dep,title:title(dep.request || dep.title),offPage:!byRun.has(dep.run), projectTitle:contexts.get(dep.project) || dep.project || ''})),
      action:executionAction(run), issue:executionIssue(run) };
  });
  return {rows, activity:conversationActivity(conversation), total:conversation.total ?? items.length,
    all:conversation.item_count ?? items.length, offset:conversation.offset || 0, crossProject:(conversation.projects || []).length > 1};
}

export function dispatchFeedback(result) {
  const items = result?.items || [];
  const started = items.reduce((sum,item) => sum + (item.started?.length || 0), 0);
  const visible = new Set(['waiting','waiting_input','returned','blocked','paused','ready']);
  const waiting = items.flatMap(item => {
    const reasons = new Map((item.waiting || []).filter(wait=>visible.has(wait.status)).map(wait=>[wait.reason || wait.code || wait.status,wait]));
    return [...reasons.values()].map(wait=>({run:item.run,...wait}));
  });
  const demands = new Set(waiting.map(wait=>wait.run)).size;
  return { started, waiting, demands, text:`${started} étape${started > 1 ? 's' : ''} lancée${started > 1 ? 's' : ''}${demands ? ` · ${demands} demande${demands > 1 ? 's' : ''} en attente` : ''}.` };
}

export function conversationOverviewView(conversation, {projects = [], statusLabel = run => run.status || 'État inconnu', agentStopped = false, dispatch, dispatching = false, now} = {}) {
  const model = overviewModel(conversation, projects, now);
  for(const row of model.rows) {
    const focus=row.execution?.focus;
    const readiness=row.execution?.launch?.nodes?.find(n=>n.node===focus?.node);
    row.nativeReady=row.execution?.status==='active' && focus?.status==='ready' && (readiness?.status==='native' || readiness?.native_available);
    if(row.nativeReady)row.action={label:agentStopped?'Reprendre l’agent…':'Continuer dans la conversation',detail:agentStopped?'Agent arrêté. Le terminal est au prompt du shell.':'Cette étape peut être traitée par l’agent de la conversation.'};
  }
  const paged = model.total > model.rows.length || !!conversation.query;
  const sameScope = !dispatch?.scope || (dispatch.scope.offset===(conversation.offset || 0) && dispatch.scope.query===(conversation.query || ''));
  const feedback = dispatch && sameScope && dispatchFeedback(dispatch);
  const launchedAt=Number.isFinite(dispatch?.at) ? new Date(dispatch.at*1000).toLocaleTimeString('fr-CH',{hour:'2-digit',minute:'2-digit'}) : '';
  const feedbackLabel=`Dernier lancement${launchedAt ? ' à '+launchedAt : ''}${dispatch?.scope ? ' · '+dispatch.scope.count+' demande(s)' : ''}`;
  const eligible=model.rows.filter(row=>row.execution?.launch?.worker_count>0);
  const checked=model.rows.every(row=>row.execution?.launch);
  const launchable=checked ? eligible.length : model.rows.length;
  return `<div class="conversation-overview-heading"><div><h2>Demandes et activité</h2><p>${esc(activityText(conversation))}${model.activity.global ? '' : ' · cette page uniquement'}</p></div>${conversation.status === 'open' && !conversation.archived ? `<button class="primary" data-action="conversation-dispatch" ${dispatching || !launchable ? 'disabled' : ''}>${dispatching ? 'Lancement…' : 'Lancer les demandes prêtes'}</button>` : ''}</div>
    <p class="overview-page-scope">${model.rows.length ? `${model.offset+1}–${model.offset+model.rows.length} sur ${model.total}` : 'Aucune demande affichée'}${conversation.query ? ` · filtre « ${esc(conversation.query)} » · ${model.all} au total` : ''}${paged ? '. Le lancement porte uniquement sur les demandes affichées.' : '. Seules les étapes prêtes seront lancées ; les validations restent à traiter.'}</p>
    ${checked ? `<p class="overview-page-scope">${eligible.length} demande(s) lançable(s) sur cette page. Les autres indiquent leur prochaine action ; aucun agent ne démarre automatiquement.</p>` : ''}
    ${feedback ? `<section class="dispatch-feedback" role="status"><small>${esc(feedbackLabel)}</small>${feedback.waiting.length ? `<details><summary>${esc(feedback.text)}</summary><p>Situation au moment de ce lancement :</p><ul>${feedback.waiting.map(wait=>`<li>${esc(model.rows.find(row=>row.run===wait.run)?.title || 'Demande hors de cette page')} : ${esc(wait.reason || wait.status || 'En attente')}</li>`).join('')}</ul></details>` : `<strong>${esc(feedback.text)}</strong>`}</section>` : ''}
    <div class="conversation-overview-rows">${model.rows.map(row => `<article class="conversation-demand" data-run="${esc(row.run)}"><button class="conversation-demand-open" data-action="conversation-item" data-id="${esc(row.run)}"><span class="conversation-demand-title"><strong>${esc(row.title)}</strong>${model.crossProject ? `<small>${esc(row.projectTitle)}</small>` : ''}</span><span class="conversation-demand-state${row.issue ? ' has-issue' : ''}">${esc(row.nativeReady ? agentStopped?'Agent arrêté':'À traiter dans la conversation' : !row.issue && row.execution?.launch?.ready_count && !row.workers.length && row.execution?.focus?.status==='ready' ? row.execution.launch.label : statusLabel(row.execution || {}))}</span><span aria-hidden="true">→</span></button>
      ${!row.workers.length || row.issue || ['waiting','waiting_input','returned','blocked'].includes(row.execution?.focus?.status) ? `<button class="conversation-demand-action" data-action="conversation-item-action" data-id="${esc(row.run)}">${esc(row.action.label)}${row.action.detail ? ' · '+esc(row.action.detail) : ''}</button>` : ''}${row.issue?.reason ? `<p class="conversation-demand-issue">${esc(row.issue.reason)}</p>` : ''}
      ${row.execution?.launch?.nodes?.some(n=>['configuration','native','unknown','waiting'].includes(n.status)) ? `<div class="launch-readiness">${row.execution.launch.nodes.filter(n=>['configuration','native','unknown','waiting'].includes(n.status)).map(n=>`<p><strong>${esc(n.title)}</strong> · ${esc((n.status==='native' || n.native_available) && agentStopped ? 'Reprenez l’agent pour traiter cette étape dans la conversation.' : n.native_available ? 'Cette étape peut être traitée par l’agent de la conversation.' : n.reason)}</p>`).join('')}${row.execution.launch.configuration_count ? `<details><summary>${row.nativeReady?'Agent de bloc séparé (facultatif)':'Configuration requise pour le lancement'}</summary><p>${esc(row.execution.launch.nodes.filter(n=>n.status==='configuration').map(n=>n.reason).join(' · '))}</p><button data-action="configure-execution" data-id="${esc(row.run)}">Configurer un nouveau lancement…</button></details>` : ''}</div>` : ''}
      ${row.workers.length ? `<ul class="conversation-workers" aria-label="Exécutants en cours">${row.workers.map(worker=>`<li class="${worker.stale ? 'stale' : ''}"><span class="worker-dot" aria-hidden="true"></span><div><strong>${esc(worker.identity)}</strong><span>${esc(worker.title)} · ${esc(worker.activity)}</span></div></li>`).join('')}</ul>${row.workersTotal>row.workers.length ? `<p class="muted">${row.workers.length} exécutants affichés sur ${row.workersTotal}. Ouvrez la demande pour consulter ses étapes.</p>` : ''}` : ''}
      ${row.dependencies.length ? `<div class="conversation-dependencies"><span>Après :</span>${row.dependencies.map(dep=>dep.run ? `<button data-action="conversation-item" data-id="${esc(dep.run)}" class="dependency-link${dep.satisfied ? ' satisfied' : ''}" title="${esc(dep.projectTitle)}"><span>${esc(dep.title)}</span><small>${esc(dependencyLabel(dep))}${dep.offPage ? ' · hors page' : ''}</small></button>` : `<span class="muted">${esc(dep.title)} · retrouvez-la avec la recherche</span>`).join('')}${row.dependencies_truncated ? '<small>25 premières dépendances affichées ; liste complète dans le terminal.</small>' : ''}</div>` : ''}</article>`).join('') || '<p class="overview-empty">Aucune demande ne correspond à cette page. Modifiez la recherche ou décrivez une demande dans le terminal.</p>'}</div>
      <nav class="overview-pagination" aria-label="Pages des demandes">${model.offset ? `<button data-action="conversation-page" data-offset="${Math.max(0,model.offset-25)}">Demandes précédentes</button>` : ''}<button data-action="conversation-search-open">Rechercher une demande</button>${conversation.next !== null && conversation.next !== undefined ? `<button data-action="conversation-page" data-offset="${conversation.next}">Demandes suivantes</button>` : ''}</nav>`;
}

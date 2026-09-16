import { allReleaseCards, filterCards } from './release-kanban.mjs';
import { taskState, stageRail } from './task-state.mjs';
import { dependencyGraph, intentionItems, intentionTasks } from './plan-model.mjs';
import { timerMarkup } from './activity.mjs';

export function planViews({ get, observations, esc, badge, render, board }) {
  const memory = new Map();
  const context = () => JSON.stringify([get().current, get().detail?.selectedRelease]);
  function state() { if (!memory.has(context())) memory.set(context(), { task: '', intention: '', filter: 'all', owner: '' }); return memory.get(context()); }
  // The presentation mode follows the project across its releases; filters stay per release.
  const modes = new Map();
  const mode = () => modes.get(get().current) || 'list';
  const setMode = value => modes.set(get().current, value);
  document.addEventListener('change', event => {
    if (event.target.id !== 'board-owner') return;
    state().owner = event.target.value; render();
    document.querySelector('#board-owner')?.focus({ preventScroll: true });
  });
  document.addEventListener('click', event => {
    const el = event.target.closest('[data-plan-mode], [data-graph-select], [data-intention], [data-plan-filter]');
    if (!el) return;
    if (el.dataset.planMode) setMode(el.dataset.planMode);
    if (el.dataset.graphSelect) state().task = el.dataset.graphSelect === state().task ? '' : el.dataset.graphSelect;
    if (el.dataset.intention) { state().intention = el.dataset.intention; }
    if (el.dataset.planFilter) state().filter = el.dataset.planFilter;
    render();
  });
  const activity = t => t.activities?.map(a => `<p class="task-activity ${a.executing ? 'executing' : ''}">${esc(a.provider || '')} · ${esc(a.label)}${a.stage ? ' · ' + esc(a.stage) : ''}${timerMarkup(a, esc)}</p>`).join('') || '';
  function taskCard(t) {
    if (t.kind === 'intention') return `<article class="plan-task-row intention" data-plan-task="${esc(t.id)}" data-kind="intention" data-tone="intention"><button class="task-card" data-view="intentions" data-intention="${esc(t.intentionId)}"><div class="task-head"><span class="task-id">${esc(t.intentionId)}</span><h3>${esc(t.title)}</h3>${badge('pending', t.presentation.label)}</div><p class="card-meta">${esc(t.reason)}</p></button></article>`;
    const p = t.presentation || taskState(t);
    const plainReason = t.reason && !/[\/]|^dépendances/i.test(t.reason) ? t.reason : '';
    const meta = t.kind === 'orchestration' ? [t.owners.join(' · '), t.stage, t.model ? 'modèle ' + t.model : ''] : [p.proof, t.owners?.length ? t.owners.join(' · ') : '', t.stage, !p.proof && !t.owners?.length && !t.stage ? plainReason : ''];
    const tone = t.kind === 'orchestration' ? 'orchestration' : p.received ? 'received' : t.waiting ? 'waiting' : t.blocked ? 'blocked' : ['running', 'claimed', 'active'].includes(t.status) ? 'claimed' : 'pending';
    return `<article class="plan-task-row ${t.kind || ''} ${p.received ? 'received' : ''}" data-plan-task="${esc(t.id)}" data-tone="${tone}"><button class="task-card" data-task="${esc(t.id)}" aria-haspopup="dialog"><div class="task-head"><span class="task-id">${esc(t.kind === 'orchestration' ? 'Principal' : t.id)}</span><h3>${esc(t.title)}</h3>${t.kind === 'orchestration' ? '' : stageRail(t.flow, esc)}${t.risk === 'high' ? '<span class="risk">Sensible</span>' : ''}${badge(p.received ? 'received' : t.status, t.kind === 'orchestration' ? 'Orchestration' : p.label)}</div>${meta.filter(Boolean).length ? `<p class="card-meta">${esc(meta.filter(Boolean).join(' · '))}</p>` : ''}${t.depends_on?.length ? `<p class="dependencies">Après ${esc(t.depends_on.join(', '))}</p>` : ''}</button>${activity(t)}</article>`;
  }
  function graph(tasks) {
    const g = dependencyGraph(tasks, state().task), selected = tasks.find(t => t.id === state().task);
    const node = id => g.nodes.find(n => n.id === id);
    return `<section class="dependency-panel"><p>Flèches pleines : résultat requis. Les ressources communes sont indiquées séparément ; elles ne prouvent pas un blocage actif.</p>${g.errors.map(e => `<p class="note warning" role="alert">${esc(e)}</p>`).join('')}
      <div class="graph-scroll" tabindex="0" aria-label="Graphe des dépendances, défilement horizontal et vertical"><div class="dependency-canvas" style="width:${g.width}px;height:${g.height}px"><svg width="${g.width}" height="${g.height}" aria-hidden="true"><defs><marker id="dependency-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="currentColor"/></marker></defs>${g.edges.map(e => { const a = node(e.from), b = node(e.to); return `<path class="dependency-edge ${a.related && b.related ? 'related' : ''}" d="M${a.x + 224},${a.y + 52} C${a.x + 248},${a.y + 52} ${b.x - 24},${b.y + 52} ${b.x},${b.y + 52}" marker-end="url(#dependency-arrow)"/>`; }).join('')}</svg>${g.nodes.map(n => `<button class="graph-node ${n.related ? '' : 'unrelated'} ${state().task === n.id ? 'selected' : ''}" style="left:${n.x}px;top:${n.y}px" data-graph-select="${esc(n.id)}" aria-pressed="${state().task === n.id}"><strong>${esc(n.id)}</strong><span>${esc(n.title)}</span><small>${esc(taskState(n).label)}</small></button>`).join('')}</div></div>
      <div class="graph-selection" aria-live="polite">${selected ? `<h3>${esc(selected.id)} · ${esc(selected.title)}</h3><p>En amont : ${esc(g.ancestors.join(', ') || 'aucune tâche')} · En aval : ${esc(g.descendants.join(', ') || 'aucune tâche')}</p><p>Ressources communes avec : ${esc(g.resources.join(', ') || 'aucune tâche identifiée')}</p><p>${esc(selected.reason || (selected.status === 'ready' ? 'Peut démarrer selon les règles du plan.' : 'Disponibilité non confirmée par les règles du plan.'))}</p><button class="secondary" data-task="${esc(selected.id)}">Ouvrir les critères et preuves</button>` : '<p>Sélectionnez une tâche pour suivre ses dépendances. La liste offre un accès clavier à tous les détails.</p>'}</div><p class="muted">Chemin de dépendances, sans estimation de chemin critique en durée. L’orchestration pilote les tâches ; elle n’ajoute pas de dépendance de résultat.</p></section>`;
  }
  function plan() {
    const d = get().detail, saved = state(), cards = allReleaseCards(d, observations());
    const release = d.releases?.find(r => r.id === d.selectedRelease);
    const tasks = cards.filter(t => !['orchestration', 'intention'].includes(t.kind));
    const requests = cards.filter(t => t.kind === 'intention');
    const owners = [...new Set([...cards.flatMap(t => t.owners || []), saved.owner].filter(Boolean))].sort();
    const shown = filterCards(cards, saved.filter, saved.owner);
    const received = tasks.filter(t => taskState(t).received).length;
    const counts = `${received} réceptionnée${received > 1 ? 's' : ''} · ${tasks.length} tâches + orchestration${requests.length ? ' · ' + requests.length + ' demande(s) à planifier' : ''}${shown.length !== cards.length ? ' · ' + shown.length + ' affichée' + (shown.length > 1 ? 's' : '') : ''}`;
    const modes = [['list', 'Liste'], ['kanban', 'Kanban'], ['graph', 'Dépendances']];
    const filters = [['all', 'Toutes'], ['executing', 'En exécution'], ['ready', 'Prêtes'], ['blocked', 'Bloquées'], ['waiting', 'Accord attendu']];
    const pending = requests.length && saved.filter === 'all' && !saved.owner ? `<section aria-label="Demandes à planifier"><h3>Demandes à planifier</h3><div class="task-list">${requests.map(taskCard).join('')}</div></section>` : '';
    const body = mode() === 'graph' ? pending + graph(tasks)
      : mode() === 'kanban' ? board.markup(cards, shown)
      : `<div class="task-list">${shown.map(taskCard).join('') || '<p class="note">Aucune tâche pour ce filtre.</p>'}</div>`;
    return `<div class="page plan-page ${mode() === 'kanban' ? 'release-kanban' : ''} ${d.selectedRelease ? '' : 'no-release'}" data-context="${esc(context())}">${!d.selectedRelease ? '<h2>Aucune release sélectionnée</h2><p>La préparation appartient au projet. Les intentions et le plan seront rattachés à la release lors de sa création.</p>' : ''}<div class="section-title"><div><h2>Plan de release</h2>${release ? `<span class="release-state">${badge(release.status, release.status === 'close' ? 'Close' : release.status === 'ouverte' ? 'Ouverte' : release.status)}</span>` : ''}</div><span class="release-counts board-count">${counts}</span></div>${(d.warnings || []).map(w => `<div class="note warning">${esc(w)}</div>`).join('')}<div class="plan-toolbar"><div class="segmented" role="group" aria-label="Présentation du plan">${modes.map(([id, label]) => `<button class="segment" data-plan-mode="${id}" aria-pressed="${mode() === id}">${label}</button>`).join('')}</div><div class="chips" role="group" aria-label="Filtrer le plan">${filters.map(([id, label]) => `<button class="chip" data-plan-filter="${id}" aria-pressed="${saved.filter === id}">${label}</button>`).join('')}</div><label class="pill-select owner-filter"><span class="sr-only">Responsable</span><select id="board-owner" aria-label="Filtrer par responsable"><option value="">Tous les responsables</option>${owners.map(o => `<option ${saved.owner === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></label>${d.selectedRelease ? `<span class="release-links"><button class="text-button" data-document="changelog/${esc(d.selectedRelease)}/README.md">Lire le bilan de release</button></span>` : ''}</div>${body}${!tasks.length ? '<p class="note">Aucune tâche structurée. L’orchestrateur prépare le plan à partir des intentions.</p>' : ''}</div>`;
  }
  function intentions() {
    const d = get().detail, items = intentionItems(d), active = items.find(i => i.id === state().intention);
    const labels = { clarify: 'À préciser', ready: 'Prête à planifier', planned: 'Planifiée', satisfied: 'Satisfaite', deferred: 'Reportée' };
    return `<div class="page intentions-page"><div class="section-title"><h2>Intentions</h2><span>${items.length} demande${items.length > 1 ? 's' : ''}</span></div>${(d.intentions?.warnings || []).map(w => `<p class="note warning">${esc(w)}</p>`).join('')}<div class="intention-layout"><div class="intention-list">${items.map(i => { const tasks = intentionTasks(d, i); return `<button class="intention-card" data-intention="${esc(i.id)}" aria-pressed="${active?.id === i.id}"><strong>${esc(i.id)} · ${esc(i.purpose || i.text)}</strong><span>${esc(labels[i.status] || 'État à préciser')} · ${tasks.length} tâche(s) liée(s)</span></button>`; }).join('') || '<div class="note">Aucun registre d’intentions dans cette release. Les demandes originales restent accessibles dans Fichiers ; préparez /odoo-plan dans le terminal.</div>'}</div>${active ? `<section class="intention-detail"><h3>${esc(active.id)} · ${esc(active.purpose || 'Demande')}</h3><p class="original-intention">${esc(active.text || '')}</p><p>${esc(labels[active.status] || 'État à préciser')}</p>${active.source?.path ? `<button class="text-button" data-document="${esc(active.source.path)}">Lire le fichier source courant</button>` : ''}${active.source?.original ? `<details class="intention-source"><summary>Source conservée avec cette version</summary><pre class="document-text">${esc(active.source.original)}</pre></details>` : ''}<details class="intention-history"><summary>Historique de l’intention</summary>${(d.intentions?.history || []).filter(h => h.item?.id === active.id).map(h => `<article><h4>${esc(h.at || '')} · ${esc(h.action || 'Version précédente')}</h4><p>${esc(h.item.text || '')}</p>${h.item.source?.original ? `<pre class="document-text">${esc(h.item.source.original)}</pre>` : ''}</article>`).join('') || '<p>Aucune version antérieure enregistrée.</p>'}</details><h4>Contraintes</h4><ul>${(active.constraints || []).map(c => `<li>${esc(c)}</li>`).join('') || '<li>Aucune contrainte enregistrée.</li>'}</ul><h4>Décisions</h4><ul>${(active.decisions || []).map(c => `<li>${esc(typeof c === 'string' ? c : [c.at, c.text || c.decision].filter(Boolean).join(' · '))}</li>`).join('') || '<li>Aucune décision enregistrée.</li>'}</ul><h4>Questions ouvertes</h4><ul>${(active.questions || []).map(c => `<li>${esc(typeof c === 'string' ? c : c.text || c.question)}</li>`).join('') || '<li>Aucune question enregistrée.</li>'}</ul><h4>Tâches et résultats</h4>${intentionTasks(d, active).map(t => `<button class="file-row" data-task="${esc(t.id)}"><strong>${esc(t.id)} · ${esc(t.title)}</strong><span>${esc(taskState(t).label)}${taskState(t).proof ? ' · ' + esc(taskState(t).proof) : ''}</span></button>`).join('') || '<p>Aucune tâche liée. Le statut de satisfaction doit être justifié dans le registre.</p>'}</section>` : ''}</div></div>`;
  }
  return { plan, intentions, activity, setMode };
}

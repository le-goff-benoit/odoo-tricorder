import { taskState, stageRail } from './task-state.mjs';
import { timerMarkup } from './activity.mjs';
import { intentionItems, intentionTasks } from './plan-model.mjs';
import { allReleaseCards as releaseCards, releaseColumns } from './release-kanban.mjs';
import { hours, timeShare } from './measurements.mjs';

export function releaseBoard({ get, observations, render, esc, badge, when, providerIcon }) {
  const memory = new Map();
  const dialog = document.createElement('dialog');
  dialog.id = 'task-modal';
  dialog.className = 'task-modal';
  dialog.setAttribute('aria-labelledby', 'task-modal-title');
  document.body.append(dialog);
  let opened = null, trigger = null, lastHTML = '';
  function closeTask() {
    const fallback = opened?.context === context() ? document.querySelector(`[data-release-task="${CSS.escape(opened.id)}"], [data-task="${CSS.escape(opened.id)}"]`) : null;
    opened = null;
    if (dialog.open) dialog.close();
    dialog.replaceChildren();
    (trigger?.isConnected ? trigger : fallback)?.focus({ preventScroll: true });
  }
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeTask(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeTask();
  } });
  function openTask(id) {
    const task = get().detail && releaseCards(get().detail, observations()).find(t => t.id === id);
    if (!task) { closeTask(); return; }
    if (!dialog.open) trigger = document.activeElement;
    opened = { id, context: context(), view: get().view };
    lastHTML = drawer(task); dialog.innerHTML = lastHTML;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('[data-board-close]').focus({ preventScroll: true });
  }
  const context = () => JSON.stringify([get().current, get().detail?.selectedRelease]);
  function state() {
    const key = context();
    if (!memory.has(key)) memory.set(key, { scroll: {} });
    return memory.get(key);
  }
  const root = () => document.querySelector('.plan-page[data-context]');
  // Capture before the central renderer changes any DOM. Context-scoped values
  // survive refresh, but cannot leak into another project's identically named T01.
  function remember() {
    if (opened && (opened.context !== context() || opened.view !== get().view || get().overviewMode)) closeTask();
    if (opened) {
      const task = get().detail && releaseCards(get().detail, observations()).find(t => t.id === opened.id);
      if (!task) closeTask();
      else {
        const html = drawer(task);
        if (html !== lastHTML) {
          const top = dialog.scrollTop, active = document.activeElement;
          const key = ['data-board-close', 'data-release-task', 'data-session', 'data-preview', 'data-document'].find(k => dialog.contains(active) && active.hasAttribute(k));
          const value = key ? active.getAttribute(key) : null;
          lastHTML = html; dialog.innerHTML = html; dialog.scrollTop = top;
          if (key) dialog.querySelector(`[${key}="${CSS.escape(value)}"]`)?.focus({ preventScroll: true });
        }
      }
    }
    const page = root();
    if (!page || page.dataset.context !== context() || !page.querySelector('[data-board-scroll]')) return;
    const saved = state();
    saved.scroll = Object.fromEntries([...page.querySelectorAll('[data-board-scroll]')].map(el => [el.dataset.boardScroll, [el.scrollLeft, el.scrollTop]]));
    const active = document.activeElement;
    saved.focus = page.contains(active) && active.hasAttribute('data-release-task') ? 'data-release-task' : null;
    saved.focusValue = saved.focus ? active.getAttribute(saved.focus) : null;
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-release-task], [data-board-close]');
    if (!button) return;
    if (button.hasAttribute('data-board-close')) closeTask();
    else openTask(button.dataset.releaseTask);
  });
  const proofLabel = t => t.kind === 'orchestration' ? t.stage : taskState(t).proof;
  function card(t) {
    if (t.kind === 'intention') return `<button class="kanban-card" data-kind="intention" data-view="intentions" data-intention="${esc(t.intentionId)}"><div class="kanban-card-status"><strong>${esc(t.intentionId)}</strong>${badge('pending', t.presentation.label)}</div><h3>${esc(t.title)}</h3><p class="card-meta">${esc(t.reason)}</p></button>`;
    return `<button class="kanban-card" data-release-task="${esc(t.id)}" aria-haspopup="dialog">
      <div class="kanban-card-status"><strong>${esc(t.kind === 'orchestration' ? 'Principal' : t.id)}</strong>${t.kind === 'orchestration' ? '' : stageRail(t.flow, esc)}${t.waiting ? badge('waiting_human', 'Accord attendu') : ''}${t.blocked ? badge('blocked', 'Bloquée') : ''}${t.status === 'ready' ? badge('ready') : ''}</div>
      <h3>${esc(t.title)}</h3>
      ${t.owners.length ? `<p class="card-meta board-owner" title="Responsable déclaré : ${esc(t.owners.join(' · '))}"><span class="sr-only">Responsable déclaré : </span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>${esc(t.owners.join(' · '))}</p>` : ''}
      ${t.kind === 'orchestration' && t.model ? `<p class="card-meta">Modèle : ${esc(t.model)}</p>` : ''}
      ${proofLabel(t) ? `<p class="board-proof">${esc(proofLabel(t))}</p>` : ''}
      ${(t.activities || []).map(a => `<p class="task-activity ${a.executing ? 'executing' : ''}">${providerIcon(a.provider)}${esc(a.label)}${timerMarkup(a, esc)}</p>`).join('')}
      ${t.measures.actual == null && t.measures.revised == null && t.measures.initial == null ? '' : `<p class="board-time" title="Temps connu / prévu">${hours(t.measures.actual)}${t.measures.partial ? ' · partiel' : ''} / ${t.measures.revised == null && t.measures.initial == null ? 'Non estimé' : hours(t.measures.revised ?? t.measures.initial)}</p>`}</button>`;
  }
  function drawer(t) {
    const s = get();
    const reports = (s.detail.quality?.reports || []).filter(r => r.task === t.id);
    const terminals = s.sessions.filter(x => x.project === s.current && x.release === s.detail.selectedRelease && (!x.task || x.task === t.id) && x.alive);
    const events = t.flows.flatMap(f => (f.events || []).map(e => ({ ...e, flow: f.id }))).sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))).slice(0, 8);
    return `<section class="board-detail" aria-label="Détails de la tâche ${esc(t.id)}"><div class="section-title"><strong>${esc(t.id)}</strong><button class="secondary" data-board-close aria-label="Fermer les détails">Fermer</button></div>
      <h2 id="task-modal-title">${esc(t.title)}</h2><p>${esc(proofLabel(t) || t.activity)}</p>
      ${t.receiptContext?.origin ? `<p class="muted">Origine ${t.receiptContext.location === 'worktree' ? '(worktree du même dépôt)' : ''} : ${esc(t.receiptContext.origin)}</p>` : ''}
      <section class="board-criteria"><h3>Critères d’acceptation</h3><ul>${(t.acceptance || []).map(c => `<li>${esc(c)}</li>`).join('') || '<li>Aucun critère renseigné</li>'}</ul></section>
      ${t.reason && (t.blocked || t.column === 'unknown' || t.status === 'stale') ? `<details class="note" open><summary>${t.blocked ? 'Blocage' : 'État à vérifier'}</summary><p>${esc(t.reason)}</p></details>` : ''}
      ${t.kind === 'orchestration' ? `<p>Modèle principal : ${esc(t.model || 'non renseigné')}</p><p>Tâches pilotées : ${esc(t.taskIds.join(', ') || 'non renseignées')}</p>` : `<h3>Intentions couvertes</h3>${intentionItems(s.detail).filter(i => intentionTasks(s.detail, i).some(task => task.id === t.id)).map(i => `<button class="secondary" data-board-close data-view="intentions" data-intention="${esc(i.id)}">${esc(i.id)} · ${esc(i.purpose || i.text)}</button>`).join('') || '<p>Aucun lien enregistré dans cette release.</p>'}`}
      ${(t.activities || []).map(a => `<p class="task-activity ${a.executing ? 'executing' : ''}">${esc(a.label)}${timerMarkup(a, esc)}</p>`).join('')}
      <h3>Étape et responsabilité</h3><p>${esc(t.stage || 'Étape non renseignée')}</p><p>${esc(t.owners.join(' · ') || 'Responsable non renseigné')} · ${esc(t.activity)}</p>
      ${t.flowNote ? `<p>${esc(t.flowNote)}</p>` : ''}
      ${t.depends_on?.length ? `<p>Dépend de ${t.depends_on.map(id => `<button class="secondary" data-release-task="${esc(id)}">${esc(id)}</button>`).join(' ')}</p>` : ''}
      <h3>Temps par agent</h3><p>Temps connu : ${hours(t.measures.actual)}${t.measures.partial ? ' · partiel' : ''} · Prévu : ${t.measures.initial == null ? 'Non estimé' : hours(t.measures.initial)}</p>
      ${t.agents.map(a => `<div class="board-agent-time"><span>${esc(a.label)}</span><span>${hours(a.actual)}</span><span>${timeShare(a.actual, t.measures.actual)?.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) ?? '—'}${timeShare(a.actual, t.measures.actual) == null ? '' : ' %'}</span></div>`).join('') || '<p>Répartition non renseignée.</p>'}
      <h3>Tests et preuves</h3>${reports.map(r => `<p>${esc(r.name)} : ${r.total - r.skipped} exécutés, ${r.failed + r.errors} échecs / erreurs, ${r.skipped} ignorés.<button class="text-button" data-preview="${esc(r.path)}">Lire ce rapport</button></p>`).join('') || '<p>Aucun rapport de tests attribué à cette tâche.</p>'}
      <p class="muted">Chaque exécution reste distincte. Les rapports communs sont dans le plan de release.</p>
      ${t.request ? `<button class="text-button" data-document="${esc(t.request)}">Lire la demande</button>` : ''}
      <h3>Derniers changements enregistrés</h3>${events.map(e => `<p><small>${when(e.at)} · ${esc(e.flow)}</small><br>${esc(e.note || e.outcome || e.node)}</p>`).join('') || '<p>Aucun changement enregistré.</p>'}
      <h3>Terminal existant</h3>${terminals.map(x => `<button class="secondary" data-session="${esc(x.id)}">${providerIcon(x.provider)} ${esc(x.program || 'Terminal')} · ${esc(x.task || 'release complète')}</button>`).join('') || '<p>Aucun terminal ouvert dans ce contexte.</p>'}</section>`;
  }
  // Columns only: the Plan page owns the title, filters and owner selector.
  function markup(cards, shown) {
    const section = (id, label) => `<section class="kanban-column" data-column="${id}" data-board-scroll="${id}" aria-label="${label}"><h2>${label}<span>${shown.filter(t => t.column === id).length}</span></h2>${shown.filter(t => t.column === id).map(card).join('') || '<p class="kanban-empty">Aucune tâche</p>'}</section>`;
    const columns = [...releaseColumns, ...[['blocked', 'Bloquées'], ['unknown', 'État à vérifier'], ['deferred', 'Reportées']].filter(([id]) => cards.some(t => t.column === id))];
    return `<div class="release-board-layout"><div class="kanban-board" data-board-scroll="board" style="--board-columns:${columns.length}">${columns.map(([id, label]) => section(id, label)).join('')}</div></div>`;
  }
  function restore() {
    const page = root(); if (!page) return;
    const saved = state();
    for (const el of page.querySelectorAll('[data-board-scroll]')) { const [left, top] = saved.scroll[el.dataset.boardScroll] || [0, 0]; el.scrollLeft = left; el.scrollTop = top; }
    if (saved.focus) page.querySelector(`[${saved.focus}="${CSS.escape(saved.focusValue)}"]`)?.focus({ preventScroll: true });
  }
  return { markup, restore, remember, openTask };
}

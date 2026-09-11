import { releaseCards, releaseColumns, filterCards } from './release-kanban.mjs';
import { hours, timeShare } from './measurements.mjs';

export function releaseBoard({ get, observations, render, selectTask, esc, badge, when, providerIcon }) {
  const memory = new Map();
  const context = () => JSON.stringify([get().current, get().detail?.selectedRelease]);
  function state() {
    const key = context();
    if (!memory.has(key)) memory.set(key, { filter: 'all', owner: '', scroll: {} });
    return memory.get(key);
  }
  const root = () => document.querySelector('.release-kanban');
  // Capture before the central renderer changes any DOM. Context-scoped values
  // survive refresh, but cannot leak into another project's identically named T01.
  function remember() {
    const page = root();
    if (!page) return;
    const saved = memory.get(page.dataset.context);
    if (!saved) return;
    saved.scroll = Object.fromEntries([...page.querySelectorAll('[data-board-scroll]')].map(el => [el.dataset.boardScroll, [el.scrollLeft, el.scrollTop]]));
    const active = document.activeElement;
    saved.focus = page.contains(active) ? ['data-release-task', 'data-board-close', 'data-board-filter'].find(key => active.hasAttribute(key)) : null;
    saved.focusValue = saved.focus ? active.getAttribute(saved.focus) : null;
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-release-task], [data-board-close], [data-board-filter]');
    if (!button || get().overviewMode || get().view !== 'release-kanban') return;
    if (button.hasAttribute('data-board-filter')) state().filter = button.dataset.boardFilter;
    else selectTask(button.hasAttribute('data-board-close') ? null : button.dataset.releaseTask);
    render();
    if (button.hasAttribute('data-release-task')) root()?.querySelector('[data-board-close]')?.focus({ preventScroll: true });
    if (button.hasAttribute('data-board-close')) root()?.querySelector('.kanban-card')?.focus({ preventScroll: true });
  });
  document.addEventListener('change', event => {
    if (event.target.id !== 'board-owner') return;
    state().owner = event.target.value; render();
    document.querySelector('#board-owner')?.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && root()?.contains(event.target) && get().selectedTask) {
      selectTask(null); render(); root()?.querySelector('.kanban-card')?.focus();
    }
  });
  const proofLabel = t => t.status === 'validated' ? 'Preuves valides' : t.column === 'done' ? 'Réception conservée · preuves à revérifier' : t.status === 'done' ? 'Terminée selon le compte rendu · réception non vérifiée' : '';
  function card(t) {
    return `<button class="kanban-card ${get().selectedTask === t.id ? 'selected' : ''}" data-release-task="${esc(t.id)}" aria-pressed="${get().selectedTask === t.id}">
      <div class="kanban-card-status"><strong>${esc(t.id)}</strong>${t.waiting ? badge('waiting_human', 'Accord attendu') : ''}${t.blocked ? badge('blocked', 'Bloquée') : ''}${t.status === 'ready' ? badge('ready') : ''}</div>
      <h3>${esc(t.title)}</h3><p class="board-stage">${esc(t.stage || (t.column === 'todo' ? t.depends_on?.length ? 'Dépendances à satisfaire' : 'À démarrer' : t.column === 'done' ? 'Travail réceptionné' : 'Étape non renseignée'))}</p>
      <p>${esc(t.owners.join(' · ') || 'Responsable non renseigné')} ${t.providers.map(providerIcon).join('')}</p>
      ${t.column === 'working' ? `<small>${esc(t.activity)}</small>` : ''}
      ${proofLabel(t) ? `<p class="board-proof">${esc(proofLabel(t))}</p>` : ''}
      <p class="board-time">${hours(t.measures.actual)}${t.measures.partial ? ' · partiel' : ''} / ${t.measures.revised == null && t.measures.initial == null ? 'Non estimé' : hours(t.measures.revised ?? t.measures.initial)}</p>
      <small>${t.acceptance?.length || 0} critères d’acceptation</small></button>`;
  }
  function drawer(t) {
    const s = get();
    const reports = (s.detail.quality?.reports || []).filter(r => r.task === t.id);
    const terminals = s.sessions.filter(x => x.project === s.current && x.release === s.detail.selectedRelease && (!x.task || x.task === t.id) && x.alive);
    const events = t.flows.flatMap(f => (f.events || []).map(e => ({ ...e, flow: f.id }))).sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))).slice(0, 8);
    return `<aside class="board-detail" aria-label="Détails de la tâche ${esc(t.id)}" data-board-scroll="detail"><div class="section-title"><strong>${esc(t.id)}</strong><button class="secondary" data-board-close aria-label="Fermer les détails">Fermer</button></div>
      <h2>${esc(t.title)}</h2><p>${esc(proofLabel(t) || t.activity)}</p>
      <section class="board-criteria"><h3>Critères d’acceptation</h3><ul>${(t.acceptance || []).map(c => `<li>${esc(c)}</li>`).join('') || '<li>Aucun critère renseigné</li>'}</ul></section>
      ${t.reason && (t.blocked || t.column === 'unknown' || t.status === 'stale') ? `<details class="note" open><summary>${t.blocked ? 'Blocage' : 'État à vérifier'}</summary><p>${esc(t.reason)}</p></details>` : ''}
      <h3>Étape et responsabilité</h3><p>${esc(t.stage || 'Étape non renseignée')}</p><p>${esc(t.owners.join(' · ') || 'Responsable non renseigné')} · ${esc(t.activity)}</p>
      ${t.flowNote ? `<p>${esc(t.flowNote)}</p>` : ''}
      ${t.depends_on?.length ? `<p>Dépend de ${t.depends_on.map(id => `<button class="secondary" data-release-task="${esc(id)}">${esc(id)}</button>`).join(' ')}</p>` : ''}
      <h3>Temps par agent</h3><p>Temps connu : ${hours(t.measures.actual)}${t.measures.partial ? ' · partiel' : ''} · Prévu : ${t.measures.initial == null ? 'Non estimé' : hours(t.measures.initial)}</p>
      ${t.agents.map(a => `<div class="board-agent-time"><span>${esc(a.label)}</span><span>${hours(a.actual)}</span><span>${timeShare(a.actual, t.measures.actual)?.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) ?? '—'}${timeShare(a.actual, t.measures.actual) == null ? '' : ' %'}</span></div>`).join('') || '<p>Répartition non renseignée.</p>'}
      <h3>Tests et preuves</h3>${reports.map(r => `<p>${esc(r.name)} : ${r.total - r.skipped} exécutés, ${r.failed + r.errors} échecs / erreurs, ${r.skipped} ignorés.<button class="text-button" data-preview="${esc(r.path)}">Lire ce rapport</button></p>`).join('') || '<p>Aucun rapport de tests attribué à cette tâche.</p>'}
      <p class="muted">Chaque exécution reste distincte. Les rapports communs sont dans le plan de release.</p>
      ${t.request ? `<button class="text-button" data-document="${esc(t.request)}">Lire la demande</button>` : ''}
      <h3>Derniers changements enregistrés</h3>${events.map(e => `<p><small>${when(e.at)} · ${esc(e.flow)}</small><br>${esc(e.note || e.outcome || e.node)}</p>`).join('') || '<p>Aucun changement enregistré.</p>'}
      <h3>Terminal existant</h3>${terminals.map(x => `<button class="secondary" data-session="${esc(x.id)}">${providerIcon(x.provider)} ${esc(x.program || 'Terminal')} · ${esc(x.task || 'release complète')}</button>`).join('') || '<p>Aucun terminal ouvert dans ce contexte.</p>'}</aside>`;
  }
  function draw() {
    const s = get(), saved = state();
    if (saved.task !== s.selectedTask) { saved.task = s.selectedTask; delete saved.scroll.detail; saved.focus = null; }
    if (!s.detail.selectedRelease) {
      document.querySelector('#content').innerHTML = '<div class="page no-release"><h2>Aucune release sélectionnée</h2><p>Choisissez une release pour suivre ses tâches. Le cadrage peut commencer dans le terminal sans release.</p><button class="secondary" data-view="terminal">Revenir au terminal</button></div>';
      return;
    }
    const cards = releaseCards(s.detail, observations());
    const owners = [...new Set(cards.flatMap(t => t.owners))].sort();
    const shown = filterCards(cards, saved.filter, saved.owner), selected = cards.find(t => t.id === s.selectedTask);
    const section = (id, label) => `<section class="kanban-column" data-column="${id}" data-board-scroll="${id}" aria-label="${label}"><h2>${label}<span>${shown.filter(t => t.column === id).length}</span></h2>${shown.filter(t => t.column === id).map(card).join('') || '<p class="kanban-empty">Aucune tâche</p>'}</section>`;
    const columns = [...releaseColumns, ...[['unknown', 'État à vérifier'], ['deferred', 'Reportées']].filter(([id]) => cards.some(t => t.column === id))];
    document.querySelector('#content').innerHTML = `<div class="page kanban-page release-kanban" data-context="${esc(context())}">
      <div class="kanban-toolbar"><span class="board-count">${cards.filter(t => t.column === 'done').length} tâches réceptionnées sur ${cards.length} · ${shown.length} affichées</span><label>Responsable <select id="board-owner"><option value="">Tous</option>${[...new Set([...owners, saved.owner].filter(Boolean))].map(o => `<option ${saved.owner === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label></div>
      <div class="board-filters">${[['all', 'Toutes'], ['ready', 'Prêtes'], ['blocked', 'Bloquées'], ['waiting', 'Accord attendu']].map(([id, label]) => `<button class="secondary" data-board-filter="${id}" aria-pressed="${saved.filter === id}">${label}</button>`).join('')}</div>
      ${!cards.length ? '<p class="note">Aucune tâche structurée dans cette release. Le cadrage commun reste visible dans Temps & estimations.</p>' : ''}
      <div class="release-board-layout ${selected ? 'with-detail' : ''}"><div class="kanban-board" data-board-scroll="board" style="--board-columns:${columns.length}">${columns.map(([id, label]) => section(id, label)).join('')}</div>${selected ? drawer(selected) : ''}</div>
      <p class="muted">Sélectionner une carte ne change pas le travail du terminal. Le cadrage et la clôture communs restent séparés dans Temps & estimations.</p></div>`;
    for (const el of root().querySelectorAll('[data-board-scroll]')) {
      const [left, top] = saved.scroll[el.dataset.boardScroll] || [0, 0]; el.scrollLeft = left; el.scrollTop = top;
    }
    if (saved.focus) root().querySelector(`[${saved.focus}="${CSS.escape(saved.focusValue)}"]`)?.focus({ preventScroll: true });
  }
  return { draw, remember };
}

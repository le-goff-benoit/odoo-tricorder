import { mountStudio } from './studio.js';
import { timerMarkup } from './activity.mjs';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import './style.css';
import './design-system.css';
import './workspace-layout.css';
import { cockpit, providerIcon } from './cockpit.js';
import { documentBody } from './markdown.js';
import { newReleaseContext } from './release-context.mjs';
import { boardCards, columns as kanbanColumns } from './kanban.mjs';
import { workView } from './work-view.js';
import { knowledgeView } from './knowledge-view.js';

const api = window.tricorder;
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  terminal: '<path d="m5 7 5 5-5 5m8 0h6"/>',
  express: '<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
  plan: '<path d="M9 5h12M9 12h12M9 19h12"/><path d="m3 5 1 1 2-3m-3 9 1 1 2-3m-3 9 1 1 2-3"/>',
  agents: '<circle cx="12" cy="7" r="3"/><path d="M6 21v-3a6 6 0 0 1 12 0v3M3 10v4m18-4v4"/>',
  server: '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6h.01M7 17h.01"/>',
  sources: '<path d="m8 5-6 7 6 7m8-14 6 7-6 7m-3-17-2 20"/>',
  chart: '<path d="M4 3v17h17M8 16v-4m5 4V7m5 9V4"/>',
  file: '<path d="M14 2H5v20h14V7zm0 0v5h5M8 12h8m-8 4h8"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
  refresh: '<path d="M20 7a9 9 0 1 0 1 9M20 2v6h-6"/>',
  folder: '<path d="M3 6h7l2 3h9v12H3z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0v8l2 2H4l2-2zm4 14h4"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',
  person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  tag: '<path d="M3 12V4h8l9 9-8 8z"/><circle cx="7" cy="8" r="1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  moon: '<path d="M20.5 13a9 9 0 0 1-9.5-9.5A9 9 0 1 0 20.5 13Z"/>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10m12-10a10 10 0 0 1-12 9"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
const labels = { validated: 'Validée', stale: 'Contrôle à actualiser', blocked: 'Bloquée', interrupted: 'Interrompue', awaiting_receipt: 'À valider', pending: 'En attente', ready: 'Prête', running: 'En cours', unverified: 'Non vérifiée', deferred: 'Reportée', claimed: 'Prise en charge', done: 'Terminée', active: 'Actif', complete: 'Terminé', cancelled: 'Annulé', waiting_human: 'Attend une décision', deadlocked: 'Sans étape prête' };
const badge = (state, text) => `<span class="badge ${esc(state)}">${esc(text || labels[state] || state)}</span>`;
const when = value => value ? new Date(typeof value === 'number' ? value * 1000 : value).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' }) : 'Non observé';
const minutes = value => value == null ? 'Non mesuré' : value < 1 ? `${Math.round(value * 60)} s` : `${Math.round(value).toLocaleString('fr-CH')} min`;
const empty = (title, detail, action = '') => `<div class="empty">${icon('terminal')}<h2>${esc(title)}</h2><p>${esc(detail)}</p>${action}</div>`;
// Visible pilotage tabs. Diagnostic resources stay under the project tools menu.
const VIEWS = [['terminal', 'Terminal', 'terminal'], ['intentions', 'Demandes', 'file'], ['plan', 'Plan', 'plan'], ['knowledge', 'Mémoire', 'file'], ['express', 'Express', 'express'], ['agents', 'Agents', 'agents'], ['effort', 'Temps', 'chart'], ['project', 'Projet', 'folder']];
const PRIMARY_VIEWS = [['work', 'Statut', 'plan'], ['terminal', 'Terminal', 'terminal'], ['intentions', 'Demandes', 'file'], ['plan', 'Plan', 'plan'], ['knowledge', 'Mémoire', 'file'], ['express', 'Express', 'express'], ['effort', 'Temps', 'chart']];
const SECONDARY_VIEWS = [];
let detailsOpen = false;
const RESOURCE_VIEWS = ['documents', 'environments', 'sources'];
const SHORTCUT_VIEWS = PRIMARY_VIEWS.map(([id]) => id);
let projects = [], settings = {}, current = null, detail = null, view = 'work', selectedTask = null;
let sessions = [], selectedSession = new Map(), terminals = new Map(), generation = 0, busy = false, pollBusy = false;
let projectError = null, overviewMode = false, split = false, version = '', crewInstalled = true;
let notificationKeys = new Set();
let kanbanClosed = false, kanbanExecuting = false;
let launchingTerminal = false;
let terminalMaximized = false;
let terminalPreference = null;
let terminalLayout = localStorage.getItem('tricorder.terminalLayout') === 'stacked' ? 'stacked' : 'side';
let terminalSplit = Math.max(30, Math.min(70, Number(localStorage.getItem('tricorder.terminalSplit')) || 52));
let catalogError = null, bootstrapped = false, starting = false;
let workflowMode = false, workflowContext = null, workflowTerminalPath = null;
const terminalProject = () => workflowMode ? (workflowTerminalPath || current) : current;

const WORKFLOWS = { release: { title: 'Release Odoo', action: 'workflow' }, request: { title: 'Demande Odoo', action: 'develop' }, support: { title: 'Diagnostic Odoo', action: 'diagnose' } };
function workflowSession() {
  return sessions.find(s => s.alive && s.project === current && s.release === detail?.selectedRelease &&
    (settings.bindings || []).some(b => b.terminal === s.id && b.workflow === (settings.workflow || 'release') && b.provider === (settings.provider || 'codex') + '-hooks'));
}
function workflowControls() {
  $('.workflow-launcher').hidden = workflowMode;
  if (workflowMode) return;
  const select = $('#workflow-choice');
  select.value = settings.workflow || 'release';
  const launch = $('[data-action=workflow-start]');
  launch.textContent = workflowSession() ? 'Retrouver la conversation' : 'Démarrer le workflow';
  launch.disabled = !detail || busy;
}

$('#app').innerHTML = `
  <aside class="sidebar" aria-label="Tricorder">
    <div class="brand"><div class="brand-mark">${icon('terminal')}</div><span class="brand-name">Tricorder</span></div>
    <nav class="side-nav" aria-label="Navigation principale">
      <button class="side-item" data-workflow-route="overview">${icon('grid')}<span>Tableau de bord</span></button>
      <button class="side-item" data-workflow-route="library">${icon('file')}<span>Modèles</span></button>
      <button class="side-item" data-workflow-route="global">${icon('branch')}<span>Workflows globaux</span></button>
      <button class="side-item" data-workflow-route="projects">${icon('folder')}<span>Projets</span></button>
    </nav>
    <div class="side-heading">Accès rapide aux projets</div>
    <div id="project-list" class="project-list"></div>
    <div class="sidebar-bottom">
      <nav aria-label="Configuration"><button class="side-item" data-workflow-route="schedules">${icon('chart')}<span>Planifications</span></button><button class="side-item" data-workflow-route="connections">${icon('server')}<span>Connexions</span></button></nav>
      <div class="sidebar-settings"></div>
      <details class="sidebar-tools"><summary>Outils et aide</summary>
        <button class="side-item kanban-nav" data-view="kanban">${icon('grid')}<span>Kanban des releases</span></button>
        <button class="side-item" data-action="workflow-workspace">${icon('plan')}<span>Reprendre le workflow</span></button>
        <div class="sidebar-utilities"></div>
        <button class="install-agents" data-action="agents-link" hidden>${icon('agents')}<span>Installer le pack Odoo<small>Agents pour Claude et Codex</small></span>${icon('external')}</button>
        <button class="side-item" data-action="workflow-updates">${icon('refresh')}<span>Mises à jour</span></button>
        <button class="about-button" data-action="about" title="À propos de Tricorder">À propos <span id="version"></span></button>
      </details>
    </div>
  </aside>
  <main class="workspace">
    <header class="topbar project-header"><div class="project-identity"><div id="project-title" role="heading" aria-level="1"></div><div id="project-meta" class="project-meta"></div></div><div class="top-actions"><button class="secondary terminal-toggle" data-action="terminal-toggle" aria-pressed="false" title="Afficher ou masquer le terminal sans fermer les sessions">${icon('terminal')}<span>Terminal</span><span id="terminal-count"></span></button><label class="provider-choice">Fournisseur IA<select id="preferred-provider" aria-label="Fournisseur IA"><option value="codex">OpenAI · Codex</option><option value="claude">Anthropic · Claude</option></select></label><div class="theme-switch" role="group" aria-label="Thème de l’interface">${[['light', 'Clair', 'sun'], ['dark', 'Sombre', 'moon'], ['system', 'Système', 'monitor']].map(([value, label, glyph]) => `<button class="icon-button" data-theme-choice="${value}" title="Thème ${label.toLowerCase()}" aria-label="Thème ${label.toLowerCase()}" aria-pressed="false">${icon(glyph)}</button>`).join('')}</div><span id="sync-status" class="sync-status" role="status">Lecture des projets…</span><button class="icon-button" data-action="refresh" title="Actualiser">${icon('refresh')}</button></div></header><div id="catalog-warning" class="catalog-warning" role="alert" hidden></div><section id="context-bar" class="context-bar" aria-label="Release sélectionnée"></section>
    <div id="activity-strip" class="activity-strip" hidden></div><nav id="tabs" class="tabs" aria-label="Vues du projet"></nav>
    <div class="main-body"><section class="main-content"><div id="content"></div><div id="terminal-workspace"><div class="workflow-launcher"><label>Workflow<select id="workflow-choice" aria-label="Workflow">${Object.entries(WORKFLOWS).map(([id, w]) => `<option value="${id}">${w.title}</option>`).join('')}</select></label><button class="primary" data-action="workflow-start">Démarrer le workflow</button></div><div class="terminal-heading"><strong>Terminal</strong><div class="terminal-layout-controls"><button class="secondary" data-action="terminal-layout" title="Changer la disposition du terminal et du workflow">Disposition verticale</button><button class="secondary" data-action="terminal-maximize">Agrandir le terminal</button></div></div><div id="execution-context" class="execution-context"></div><div id="terminal-tabs" class="terminal-tabs"></div><div id="terminal-context" class="terminal-context"></div><div id="terminal-search" class="terminal-search" hidden><input placeholder="Rechercher dans le terminal" aria-label="Rechercher dans le terminal"><button class="secondary" data-action="find-next">Suivant</button><button class="secondary" data-action="find-close">Fermer</button></div><div id="terminal-hosts"></div><div id="terminal-empty"></div></div></section></div>
  </main><div id="toast" role="status" hidden></div><dialog id="modal"><div id="modal-content"></div></dialog>`;

const workflowHost = document.createElement('section'); workflowHost.id = 'workflow-panel'; workflowHost.hidden = true;
$('.main-content').append(workflowHost);
const terminalDivider = document.createElement('div');
terminalDivider.className = 'terminal-divider'; terminalDivider.tabIndex = 0;
terminalDivider.setAttribute('role', 'separator'); terminalDivider.setAttribute('aria-label', 'Taille du terminal');
terminalDivider.setAttribute('aria-valuemin', '30'); terminalDivider.setAttribute('aria-valuemax', '70');
$('.main-content').insertBefore(terminalDivider, workflowHost);
function applyTerminalLayout() {
  const body = $('.main-content');
  body.dataset.terminalLayout = terminalLayout;
  body.style.setProperty('--terminal-split', terminalSplit + '%');
  terminalDivider.setAttribute('aria-valuenow', String(Math.round(terminalSplit)));
  terminalDivider.setAttribute('aria-orientation', terminalLayout === 'stacked' || window.innerWidth <= 850 ? 'horizontal' : 'vertical');
  terminalDivider.hidden = !workflowMode || $('#terminal-workspace').hidden || terminalMaximized;
  const control = $('[data-action=terminal-layout]');
  control.hidden = !workflowMode || terminalMaximized;
  control.textContent = terminalLayout === 'stacked' ? 'Côte à côte' : 'Disposition verticale';
}
function resizeTerminal(value) {
  terminalSplit = Math.max(30, Math.min(70, value));
  localStorage.setItem('tricorder.terminalSplit', String(terminalSplit)); applyTerminalLayout();
}
terminalDivider.addEventListener('keydown', event => {
  const steps = {ArrowLeft:-5, ArrowUp:-5, ArrowRight:5, ArrowDown:5};
  if (event.key in steps || ['Home', 'End'].includes(event.key)) {
    event.preventDefault(); resizeTerminal(event.key === 'Home' ? 30 : event.key === 'End' ? 70 : terminalSplit + steps[event.key]);
  }
});
terminalDivider.addEventListener('pointerdown', event => {
  event.preventDefault(); terminalDivider.setPointerCapture(event.pointerId);
});
terminalDivider.addEventListener('pointermove', event => {
  if (!terminalDivider.hasPointerCapture(event.pointerId)) return;
  const bounds = $('.main-content').getBoundingClientRect();
  const stacked = terminalLayout === 'stacked' || window.innerWidth <= 850;
  resizeTerminal(100 * (stacked ? (event.clientY - bounds.top) / bounds.height : (event.clientX - bounds.left) / bounds.width));
});
terminalDivider.addEventListener('pointerup', event => { if (terminalDivider.hasPointerCapture(event.pointerId)) terminalDivider.releasePointerCapture(event.pointerId); });
window.addEventListener('resize', applyTerminalLayout);
const studioUI = mountStudio(workflowHost, {
  context(context) { if (workflowContext?.route === 'workflow' && context.route === 'workflow' && context.mode && context.mode !== workflowContext.mode) { terminalPreference = null; terminalMaximized = false; } workflowContext = context; if (workflowMode) render(); },
  async openTerminal(project, graph, conversation, resume=false) {
    const result = await api.workflowTerminal({ project: project.id, conversation, resume });
    workflowTerminalPath = result.project; terminalPreference = true; terminalMaximized = false;
    selectedSession.set(result.project, result.id);
    await refreshSessions(); render(); await mountTerminal(result.id);
    terminals.get(result.id)?.term.focus();
    return result;
  },
  provider: () => settings.provider || 'codex',
  hasLegacy: folder => projects.some(p => p.path === folder),
  async openLegacy(project) { await chooseProject(project.path); setView('work'); },
  async setProvider(provider) { settings = await api.settings({provider}); $('#preferred-provider').value = provider; },
});
let workflowNavigation = Promise.resolve();
function openWorkflows(route = null) {
  workflowNavigation = workflowNavigation.catch(() => {}).then(async () => {
    workflowMode = true; overviewMode = false; terminalMaximized = false;
    render(); if (route) { terminalPreference = null; await studioUI.navigate(route); }
  });
  return workflowNavigation;
}
api.onNavigate(destination => {
  if (destination.route === 'workflows') openWorkflows().catch(e => toast(e.message));
  else { workflowMode = false; render(); }
});

function toast(message) { const el = $('#toast'); el.textContent = message; el.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { el.hidden = true; }, 6500); }
function setSyncStatus(message, error = false) {
  $('#sync-status').textContent = message;
  $('#sync-status').classList.toggle('sync-error', error);
  $('[data-action="refresh"]').title = 'Actualiser · ' + message;
}
function attentionItems() {
  return projects.flatMap(p => [...(p.attention || []).map(t => ({ project: p, task: t })), ...(p.warnings || []).map(reason => ({ project: p, task: { id: 'État', title: 'Lecture à vérifier', reason, status: 'unverified' } }))]);
}
function sidebar() {
  $('.kanban-nav').classList.toggle('selected', overviewMode);
  const favorites = settings.favorites || [];
  const generic = workflowContext?.projects || [];
  const merged = [...projects.map(p => ({ ...p, workflowId: generic.find(g => g.path === p.path)?.id })), ...generic.filter(p => !projects.some(n => n.path === p.path)).map(p => ({ path:p.path, name:p.title, workflowId:p.id, generic:true }))];
  const listed = merged.sort((a, b) => Number(favorites.includes(b.path)) - Number(favorites.includes(a.path)) || a.name.localeCompare(b.name));
  $('#project-list').innerHTML = listed.map(p => `
    <button class="project-item side-item ${!overviewMode && (workflowMode ? workflowContext?.project?.path === p.path && ['project', 'workflow'].includes(workflowContext?.route) : current === p.path) ? 'selected' : ''}" ${p.workflowId && (workflowMode || p.generic) ? `data-workflow-project="${esc(p.workflowId)}"` : `data-project="${esc(p.path)}"`} aria-current="${!overviewMode && (workflowMode ? workflowContext?.project?.path === p.path && ['project', 'workflow'].includes(workflowContext?.route) : current === p.path) ? 'page' : 'false'}" title="${esc(p.path.replace(/^\/home\/[^/]+/, '~'))}">${p.running ? `<span class="live-dot" title="${p.running} en cours" aria-label="${p.running} en cours"></span>` : ''}<span class="project-name">${esc(p.name)}</span>${p.attention?.length ? `<span class="count-pill" title="${p.attention.length} élément(s) à examiner">${p.attention.length}</span>` : favorites.includes(p.path) ? '<span class="fav-dot" aria-label="Favori">★</span>' : ''}</button>`).join('') || `<p class="muted pad">${catalogError ? 'Projets indisponibles. Réessayez avec Actualiser.' : !bootstrapped ? 'Lecture des projets…' : 'Ajoutez un dépôt depuis Projets, ou commencez un workflow global.'}</p>`;
  $('.install-agents').hidden = crewInstalled;
  $('[data-action="workflow-workspace"]').hidden = workflowMode;
  cockpitUI.alertSidebar();
}
function tabs() {
  const active = id => !overviewMode && (view === id || (id === 'project' && RESOURCE_VIEWS.includes(view)));
  const tab = ([id, label]) => `<button data-view="${id}" class="${active(id) ? 'active' : ''}" aria-current="${active(id) ? 'page' : 'false'}" title="${label} · Alt ${SHORTCUT_VIEWS.indexOf(id) + 1}" aria-keyshortcuts="Alt+${SHORTCUT_VIEWS.indexOf(id) + 1}">${label}</button>`;
  $('#tabs').innerHTML = PRIMARY_VIEWS.map(tab).join('') + (current ? '<button data-action="project-workflows">Workflows du projet</button>' : '');
}
const releaseLabel = r => ({ ouverte: 'Ouverte', close: 'Close' }[r.status] || r.status);
function header() {
  $("#preferred-provider").value = settings.provider || "codex";
  const project = detail || projects.find(p => p.path === current);
  $('#project-title').textContent = overviewMode ? 'Kanban global' : project?.name || 'Aucun projet';
  $('#project-meta').innerHTML = overviewMode ? `<span class="muted">${projects.length} projets</span>`
    : project ? `${project.series ? `<span class="meta-pill" title="Série Odoo">${esc(project.series)}</span>` : ''}<button class="icon-button ${settings.favorites?.includes(current) ? 'gold' : ''}" data-action="favorite" title="${settings.favorites?.includes(current) ? 'Retirer des favoris' : 'Mettre en favori'}" aria-pressed="${!!settings.favorites?.includes(current)}">${icon('star')}</button><button class="icon-button" data-action="folder" title="Ouvrir le dossier ${esc(project.path)}">${icon('external')}</button>`
    : '<span class="muted">Choisissez le dossier des projets dans Paramètres.</span>';
  $('#context-bar').hidden = overviewMode || !project;
  $('#tabs').hidden = overviewMode;
  if (project && !overviewMode) {
    const context = settings.contexts?.[current] || {};
    const releases = detail?.releases || project.releases || [];
    const selected = releases.find(r => r.id === detail?.selectedRelease);
    const environment = detail?.environments?.find(e => e.name === context.environment);
    const date = selected?.id?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    $('#context-bar').innerHTML = `<div class="release-heading"><div class="release-kicker"><span>${selected ? 'Release' : 'Projet'}</span>${selected ? `<span class="release-summary"><i class="status-dot ${esc(selected.status)}"></i>${esc(releaseLabel(selected))}</span>` : ''}${date ? `<time datetime="${date}">${new Date(date + 'T12:00:00').toLocaleDateString('fr-CH', {day:'numeric',month:'long',year:'numeric'})}</time>` : ''}</div><label class="release-picker release-context"><h2 id="release-title">${esc(selected?.title || (selected ? selected.id : 'Préparer la prochaine release'))}</h2>${icon('chevron')}<select id="release-select" aria-label="Release"><option value="" ${!detail?.selectedRelease ? 'selected' : ''}>Aucune release</option>${releases.map(r => `<option value="${esc(r.id)}" ${r.id === detail?.selectedRelease ? 'selected' : ''}>${esc(r.id.slice(0, 10))} · ${esc(r.title || r.id)} · ${esc(releaseLabel(r))}</option>`).join('')}</select></label></div>`;
    $('#execution-context').innerHTML = `${detail?.branch ? `<span class="git-context" title="Branche Git${detail.gitChanges ? ' · ' + esc(detail.gitChanges) + ' modification(s) locale(s)' : ''}">${icon('branch')}<span>${esc(detail.branch)}</span>${detail.gitChanges ? '<i class="git-dirty" aria-label="Modifications locales"></i>' : ''}</span>` : ''}<label class="pill-select environment-context ${environment?.kind === 'production' ? 'production' : ''}"><span class="sr-only context-label">Environnement</span>${icon('server')}<select id="environment-select" aria-label="Environnement" title="Contexte des nouveaux terminaux ; les sessions existantes sont conservées."><option value="">Shell local</option>${(detail?.environments || []).map(e => `<option value="${esc(e.name)}" ${context.environment === e.name ? 'selected' : ''}>${esc(e.name)} · ${esc(e.kind)}</option>`).join('')}</select>${icon('chevron')}</label><span class="execution-caption">Pour les nouveaux terminaux</span>`;
  }
}
function setView(next) {
  workflowMode = false;
  if (next === 'terminal') terminalPreference = true;
  if (next === 'kanban') { overviewMode = true; render(); $('#content').scrollTop = 0; return; }
  if (SECONDARY_VIEWS.some(([id]) => id === next) || RESOURCE_VIEWS.includes(next)) detailsOpen = true;
  if (next === 'project') next = 'documents';
  const changed = view !== next;
  if (next !== 'terminal') terminalMaximized = false;
  view = next; overviewMode = false; render();
  if (changed) $('#content').scrollTop = 0;
}
function selectTask(id) {
  cockpitUI.openTask(id);
}
async function followSession(id) {
  const session = sessions.find(s => s.id === id);
  if (!session) return;
  if (session.release && !projects.find(p => p.path === session.project)?.releases?.some(r => r.id === session.release)) {
    toast('La release de ce terminal n’est plus disponible. Son contexte reste conservé.'); return;
  }
  if (session.project !== current || session.release !== detail?.selectedRelease) {
    await chooseProject(session.project, session.release);
  }
  if (session.project !== current || (session.release && session.release !== detail?.selectedRelease)) return;
  selectedSession.set(current, id); setView('terminal');
}
function render() {
  const active = document.activeElement;
  const focusKey = ['data-task', 'data-plan-mode', 'data-plan-filter', 'data-graph-select', 'data-intention', 'data-view', 'data-cockpit', 'data-theme-choice'].find(k => active?.hasAttribute(k));
  const focusValue = focusKey ? active.getAttribute(focusKey) : null;
  const scroll = [$('#content').scrollTop, $('#content .graph-scroll')?.scrollLeft || 0, $('#content .graph-scroll')?.scrollTop || 0];
  cockpitUI.rememberBoard();
  sidebar(); header(); tabs();
  if (workflowMode) { $('#project-title').removeAttribute('role'); $('#project-title').removeAttribute('aria-level'); }
  else { $('#project-title').setAttribute('role', 'heading'); $('#project-title').setAttribute('aria-level', '1'); }
  const autoTerminal = workflowMode ? workflowContext?.route === 'workflow' && workflowContext?.mode === 'run' && sessions.some(s => s.alive && s.project === terminalProject()) : !overviewMode && !!current && (['work', 'terminal'].includes(view) || sessions.some(s => s.alive && s.project === current));
  const terminalVisible = terminalPreference ?? autoTerminal;
  workflowHost.hidden = !workflowMode || (terminalMaximized && terminalVisible);
  $('.main-content').classList.toggle('workflow-visible', workflowMode);
  $('.main-content').classList.toggle('terminal-docked', terminalVisible && !terminalMaximized);
  $('#terminal-workspace').hidden = !terminalVisible;
  $('[data-action="terminal-toggle"]').setAttribute('aria-pressed', String(terminalVisible));
  applyTerminalLayout();
  $('#terminal-count').textContent = sessions.filter(s => s.alive && s.project === terminalProject()).length || '';
  for (const item of document.querySelectorAll('[data-workflow-route]')) item.setAttribute('aria-current', workflowMode && item.dataset.workflowRoute === workflowContext?.activeRoute ? 'page' : 'false');
  $('#catalog-warning').hidden = !catalogError;
  $('#catalog-warning').textContent = catalogError ? `Chargement incomplet : ${catalogError} · Utilisez Actualiser pour réessayer.` : '';
  if (workflowMode) {
    $('#project-title').textContent = workflowContext?.title || 'Votre espace de travail';
    $('#context-bar').hidden = true; $('#tabs').hidden = true; $('#activity-strip').hidden = true;
    $('#project-meta').textContent = '';
    $('#content').hidden = true;
    $('[data-action="terminal-maximize"]').textContent = terminalMaximized ? 'Afficher le workflow' : 'Agrandir le terminal';
    renderTerminals(); return;
  }
  $('.main-content').classList.toggle('terminal-docked', terminalVisible && !terminalMaximized);
  $('[data-action="terminal-maximize"]').textContent = terminalMaximized ? 'Afficher le workflow' : 'Agrandir le terminal';
  $('#terminal-workspace').hidden = !terminalVisible;
  $('#content').hidden = terminalVisible && terminalMaximized;
  if (terminalVisible) renderTerminals();
  if (overviewMode) renderKanban();
    else if (busy && !detail) $('#content').innerHTML = empty('Lecture du projet…', 'Chargement des releases et vérification des preuves.');
  else if (projectError) $('#content').innerHTML = empty('Lecture impossible', projectError);
  else if (!detail) $('#content').innerHTML = empty('Aucun projet sélectionné', 'Choisissez un projet dans la colonne de gauche.');
  else ({ terminal: () => { $('#content').innerHTML = workView(detail, esc, badge, cockpitUI.allObservations().filter(b => b.project === current)); }, work: () => { $('#content').innerHTML = workView(detail, esc, badge, cockpitUI.allObservations().filter(b => b.project === current)); }, intentions: () => {}, plan: () => {}, knowledge: () => { $('#content').innerHTML = knowledgeView(detail.knowledge, esc); }, agents: renderAgents, environments: renderEnvironments, sources: renderSources, effort: renderEffort, documents: renderDocuments }[view] || (() => {}))();
  cockpitUI.augment();
  $('#content').scrollTop = scroll[0];
  const graph = $('#content .graph-scroll'); if (graph) { graph.scrollLeft = scroll[1]; graph.scrollTop = scroll[2]; }
  if (focusKey && !active.isConnected && !document.querySelector('dialog[open]')) document.querySelector(`[${focusKey}="${CSS.escape(focusValue)}"]`)?.focus({ preventScroll: true });
}
async function chooseProject(project, release) {
  workflowMode = false; terminalPreference = null;
  current = project; overviewMode = false; detail = null; selectedTask = null; projectError = null; busy = true;
  const ticket = ++generation;
  try {
    await api.settings({ activeProject: project });
    if (ticket !== generation) return;
    render();
    const known = projects.find(p => p.path === project)?.releases || [];
    const selected = release !== undefined ? (release || '') : settings.contexts?.[project]?.release ?? known.find(r => r.status === 'ouverte')?.id ?? '';
    const result = await api.project(project, known.some(r => r.id === selected) ? selected : '');
    if (ticket !== generation) return;
    detail = result;
    const updated = await api.settings({ context: { project, release: result.selectedRelease || '', environment: settings.contexts?.[project]?.environment || '' } });
    if (ticket === generation) settings = updated;
  } catch (error) { if (ticket === generation) projectError = error.message; }
  finally { if (ticket === generation) { busy = false; render(); cockpitUI.refreshNative(); } }
}
function renderKanban() {
  const scrollLeft = $('.kanban-board')?.scrollLeft || 0;
  const allCards = boardCards(projects, kanbanClosed, cockpitUI.allObservations());
  const cards = kanbanExecuting ? allCards.filter(t => t.activities?.some(a => a.executing)) : allCards;
  $('#content').innerHTML = `<div class="page kanban-page"><div class="kanban-toolbar"><div class="chips" role="group" aria-label="Filtrer le tableau"><button class="chip" data-action="kanban-executing" aria-pressed="${kanbanExecuting}">En exécution</button><button class="chip" data-action="kanban-closed" aria-pressed="${kanbanClosed}">Releases closes</button></div><span class="release-counts">${cards.filter(t => !['orchestration', 'intention'].includes(t.kind)).length} tâches${cards.some(t => t.kind === 'intention') ? ' · ' + cards.filter(t => t.kind === 'intention').length + ' demande(s) à planifier' : ''} · ${cards.filter(t => t.kind === 'orchestration').length} orchestration(s)</span></div>${(() => { const shownColumns = kanbanColumns.filter(([id]) => !['blocked', 'unknown', 'deferred'].includes(id) || cards.some(t => t.column === id)); return `<div class="kanban-board" style="--board-columns:${shownColumns.length}">${shownColumns.map(([id, label]) => {
    const tasks = cards.filter(t => t.column === id);
    return `<section class="kanban-column" data-column="${id}" aria-label="${label}"><h2>${label}<span>${tasks.length}</span></h2>${tasks.map(t => `<button class="kanban-card" data-kanban-project="${esc(t.project)}" data-kanban-release="${esc(t.release)}" ${t.kind === 'intention' ? `data-kanban-intention="${esc(t.intentionId)}"` : `data-kanban-task="${esc(t.id)}"`}><span class="kanban-project">${esc(t.projectName)}<small class="kanban-release"> · ${esc(t.releaseTitle)}${t.releaseStatus === 'close' ? ' · close' : ''}</small></span><div class="kanban-card-status"><strong>${esc(t.kind === 'orchestration' ? 'Principal' : t.intentionId || t.id)}</strong>${badge(t.kind === 'orchestration' ? 'orchestration' : t.presentation?.received ? 'received' : t.status, t.presentation?.label)}</div><h3>${esc(t.title)}</h3>${t.kind === 'orchestration' ? `<p class="card-meta">${esc(t.stage)}</p>` : ''}${t.kind === 'intention' ? '<p class="card-meta">Revue de l’orchestrateur attendue</p>' : t.owners?.length ? `<p class="card-meta board-owner">${icon('person')}${esc(t.owners.join(' · '))}</p>` : ''}${(t.activities || []).map(a => `<p class="task-activity ${a.executing ? 'executing' : ''}">${providerIcon(a.provider)}${esc(a.label)}${timerMarkup(a, esc)}</p>`).join('')}${t.presentation?.proof ? `<p class="board-proof">${esc(t.presentation.proof)}</p>` : ''}</button>`).join('') || '<p class="kanban-empty">Aucune tâche</p>'}</section>`;
  }).join('')}</div>`; })()}${projects.some(p => p.warnings?.length) ? '<p class="note">Certains projets ont des informations à vérifier. Les statuts inconnus restent dans « État à vérifier » ; ouvrez le projet pour le détail.</p>' : ''}</div>`;
  $('.kanban-board').scrollLeft = scrollLeft;
}
function renderAgents() {
  // Rich view rendered by cockpitUI.augment().
  $('#content').innerHTML = '<div class="page"></div>';
}
function renderEnvironments() {
  const chosen = settings.contexts?.[current]?.environment;
  $('#content').innerHTML = `<div class="page"><div class="section-title"><h2>Environnements déclarés</h2><span>${detail.environments.length} disponible(s)</span></div><div class="card-grid">${detail.environments.map(e => `<article class="info-card ${e.kind === 'production' ? 'production-card' : ''}"><div class="card-title">${icon('server')}<h3>${esc(e.name)}</h3>${badge(e.kind === 'production' ? 'blocked' : 'series', e.kind)}</div><dl><dt>Plateforme</dt><dd>${esc(e.platform || 'Non précisée')}</dd><dt>Adresse</dt><dd>${esc(e.url || 'Non précisée')}</dd><dt>Base</dt><dd>${esc(e.db || 'Non précisée')}</dd><dt>Connexion</dt><dd>Non vérifiée · aucune requête distante</dd></dl><button class="secondary" aria-pressed="${chosen === e.name}" data-environment="${esc(e.name)}">${chosen === e.name ? 'Contexte sélectionné' : 'Sélectionner ce contexte'}</button>${e.kind === 'production' ? '<p class="warning-text">Production : sélection sans autorisation d’écriture. Les commandes saisies dans le shell conservent leurs propres permissions.</p>' : ''}</article>`).join('')}</div>${!detail.environments.length ? empty('Aucun environnement déclaré', 'Utilisez /odoo-env dans votre agent. Les métadonnées seront lues depuis .odoo-agents/instances.json ; les secrets restent dans le trousseau.') : ''}<div class="note">Un changement de sélection s’applique aux nouveaux terminaux. Les sessions existantes gardent leur contexte d’origine.</div></div>`;
}
function renderSources() {
  const sources = detail.sources;
  $('#content').innerHTML = `<div class="page"><div class="section-title"><h2>Bibliothèque des sources Odoo</h2><button class="secondary" data-action="source-root">${icon('folder')} Choisir le dossier partagé</button></div><div class="note"><strong>${esc({ module: 'Projet avec modules', studio: 'Projet sans module / Studio', online: 'Odoo Online' }[sources.profile])}</strong> · ${sources.inferred ? "profil déduit des métadonnées" : "profil explicitement choisi"}.<br>${esc(sources.explanation)}</div><div class="source-root">${icon('folder')}<code>${esc(sources.root)}</code>${badge('series', sources.series || 'Série inconnue')}</div><div class="card-grid">${sources.libraries.map(l => `<article class="info-card"><div class="card-title">${icon('sources')}<h3>${l.kind}</h3>${badge(l.present ? 'validated' : 'pending', l.present ? 'Présent' : 'Absent')}</div><code class="path">${esc(l.path || 'Déclarer la série du projet')}</code><p>${l.kind === 'Enterprise' ? esc(sources.enterpriseRequirement) : l.required ? 'Nécessaire à la voie module locale' : 'Référence pour l’analyse du standard'}</p></article>`).join('')}</div><div class="section-title section-space"><h2>Modules du projet</h2><span>Code propre au projet</span></div><div class="module-chips">${sources.modules.map(m => `<code>${esc(m)}</code>`).join('') || '<span class="muted">Aucun module custom détecté.</span>'}</div><h4 class="eyebrow section-space">Séries présentes sur ce poste</h4><div class="module-chips">${sources.available.map(s => badge('series', s)).join('') || '<p class="muted">Bibliothèque absente ou vide.</p>'}</div><div class="note">${esc(sources.policy)} Branches et commits vérifiés ci-dessous. Aucun téléchargement ni mise à jour automatique ; Enterprise nécessite vos accès Odoo.</div></div>`;
}
function renderEffort() {
  // Rich view rendered by cockpitUI.augment().
  $('#content').innerHTML = '<div class="page"></div>';
}
function renderDocuments() {
  // Rich view rendered by cockpitUI.augment().
  $('#content').innerHTML = '<div class="page"></div>';
}
function renderTerminals() {
  workflowControls();
  const own = sessions.filter(s => s.project === terminalProject());
  let id = selectedSession.get(terminalProject());
  if (!own.some(s => s.id === id)) { id = own.at(-1)?.id; selectedSession.set(terminalProject(), id); }
  $('#terminal-tabs').innerHTML = own.map((s, i) => `<div class="terminal-tab ${s.id === id ? 'active' : ''}"><button data-session="${s.id}"><span class="${s.alive ? 'local-dot' : 'dead-dot'}"></span>${providerIcon(s.provider)}${esc(s.provider || s.program || 'Terminal')} ${i + 1}${s.task ? ' · ' + esc(s.task) : ''}</button><button data-stop="${s.id}" title="Arrêter ce terminal" aria-label="Arrêter ce terminal">${icon('close')}</button></div>`).join('') + `<button class="icon-button" data-action="new-terminal" title="Nouveau terminal">${icon('plus')}</button>`;
  const selected = own.find(s => s.id === id);
  $('#terminal-tabs').insertAdjacentHTML('beforeend', `<div class="terminal-tab-tools"><button class="icon-button" data-action="find" title="Rechercher · Ctrl Shift F" aria-label="Rechercher dans le terminal">${icon('search')}</button>${own.length > 1 ? `<button class="icon-button" data-action="split" title="Diviser les terminaux" aria-label="Diviser les terminaux">${icon('grid')}</button>` : ''}</div>`);
  $('#terminal-context').replaceChildren();
  if (selected?.alive && detail && selected.release !== detail.selectedRelease) {
    $('#terminal-context').insertAdjacentHTML('beforeend', ` <button class="secondary" data-action="terminal-context">${detail.selectedRelease ? 'Utiliser la release affichée dans ce terminal' : 'Mettre ce terminal hors release'}</button>`);
  }
  const env = detail?.environments.find(e => e.name === selected?.environment);
  $('#terminal-context').classList.toggle('production', env?.kind === 'production');
  if (env?.kind === 'production') $('#terminal-context').prepend('PRODUCTION · aucune permission accordée ');
  $('#terminal-empty').hidden = own.length > 0;
  $('#terminal-hosts').hidden = own.length === 0;
  $('#terminal-empty').innerHTML = workflowMode ? empty('Votre terminal', 'Ouvrez un workflow, puis lancez sa conversation. Vous pouvez aussi ouvrir un shell.', `<button class="primary" data-action="new-terminal">Ouvrir un terminal</button>`) : busy || !detail
    ? empty('Chargement du projet…', 'Les commandes seront disponibles dès que son contexte sera prêt.')
    : empty('Aucun terminal ouvert', 'Un shell dans le dossier du projet. Lancez Claude ou Codex avec suivi, ou vos commandes habituelles.', `<button class="primary" data-action="new-terminal">${icon('terminal')} Ouvrir un terminal</button><div class="launch-hints"><button class="secondary" data-launch-agent="claude">${providerIcon('claude')} Anthropic · Claude</button><button class="secondary" data-launch-agent="codex">${providerIcon('codex')} OpenAI · Codex</button></div>`);
  const visible = new Set(id ? [id] : []);
  if (split && own.length > 1) visible.add(own.find(s => s.id !== id).id);
  for (const [session, t] of terminals) t.host.hidden = !visible.has(session);
  $('#terminal-hosts').classList.toggle('split', visible.size > 1);
  for (const session of visible) mountTerminal(session);
  requestAnimationFrame(() => fitVisible());
}
async function mountTerminal(id) {
  if (terminals.has(id)) return;
  const host = document.createElement('div'); host.className = 'terminal-host'; host.dataset.terminal = id;
  $('#terminal-hosts').append(host);
  const term = new Terminal({ cursorBlink: true, fontSize: 13, fontFamily: '"DejaVu Sans Mono", "Liberation Mono", monospace', scrollback: 10000, allowProposedApi: false,
    theme: { background: '#0f1013', foreground: '#e4e5e9', cursor: '#8ea8ff', cursorAccent: '#0f1013', selectionBackground: '#2c3550', black: '#1c1d22', red: '#ef8080', green: '#6fcf9f', yellow: '#e6bd6a', blue: '#8ea8ff', magenta: '#bd9cf6', cyan: '#6fcadb', white: '#e4e5e9', brightBlack: '#6b6f7a' } });
  const fit = new FitAddon(), search = new SearchAddon(); term.loadAddon(fit); term.loadAddon(search);
  const state = { host, term, fit, search, attaching: true, queue: [] }; terminals.set(id, state);
  cockpitUI.applyPreferences();
  term.open(host);
  term.onData(data => api.terminals.write({ session: id, data }).catch(e => toast(e.message)));
  term.onResize(({ cols, rows }) => api.terminals.resize({ session: id, cols, rows }).catch(() => {}));
  term.attachCustomKeyEventHandler(event => {
    if ((event.ctrlKey && event.altKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'f', 'F'].includes(event.key)) ||
        (event.ctrlKey && ['PageUp', 'PageDown'].includes(event.key)) ||
        (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'p') ||
        (event.altKey && !event.ctrlKey && /^[1-9]$/.test(event.key))) { event.preventDefault(); return false; }
    if (event.ctrlKey && event.shiftKey && ['T', 'F', 'C', 'V'].includes(event.key.toUpperCase())) {
      event.preventDefault();
      if (event.type === 'keydown' && event.key.toUpperCase() === 'C' && term.hasSelection()) api.clipboard.write(term.getSelection()).catch(e => toast(e.message));
      if (event.type === 'keydown' && event.key.toUpperCase() === 'V') api.clipboard.read().then(text => term.paste(text)).catch(() => toast('Collage indisponible'));
      return false;
    }
    return true;
  });
  try {
    const result = await api.terminals.attach({ session: id });
    term.write(Uint8Array.from(atob(result.data), c => c.charCodeAt(0)));
    for (const data of state.queue) term.write(Uint8Array.from(atob(data), c => c.charCodeAt(0)));
    state.queue = []; state.attaching = false; fitVisible();
    if (selectedSession.get(current) === id && view === 'terminal') term.focus();
  } catch (error) { state.attaching = false; toast(error.message); }
}
function openTerminalSearch() {
  if (!current) return;
  if (view !== 'terminal' || overviewMode) setView('terminal');
  $('#terminal-search').hidden = false;
  fitVisible();
  $('#terminal-search input').focus();
}
function closeTerminalSearch() {
  $('#terminal-search').hidden = true;
  fitVisible();
  terminals.get(selectedSession.get(current))?.term.focus();
}
function fitVisible() { if (overviewMode || $('#terminal-workspace').hidden) return; for (const t of terminals.values()) if (!t.host.hidden && t.host.clientWidth > 0 && t.host.clientHeight > 0) { try { t.fit.fit(); } catch {} } }
new ResizeObserver(fitVisible).observe($('#terminal-hosts'));
let reattachNeeded = false;
function disposeTerminal(id) { const t = terminals.get(id); t?.term.dispose(); t?.host.remove(); terminals.delete(id); }
async function reattachTerminals() {
  // Output subscriptions belong to the broker connection: after a reconnection,
  // every mounted terminal replays its scrollback and follows the new stream.
  for (const [id, state] of terminals) {
    state.attaching = true; state.queue = [];
    try {
      const result = await api.terminals.attach({ session: id });
      state.term.reset();
      state.term.write(Uint8Array.from(atob(result.data), c => c.charCodeAt(0)));
      for (const data of state.queue) state.term.write(Uint8Array.from(atob(data), c => c.charCodeAt(0)));
    } catch { /* The session vanished; the next refresh disposes it. */ }
    finally { state.queue = []; state.attaching = false; }
  }
}
async function refreshSessions() {
  const next = await api.terminals.list();
  if (reattachNeeded) { reattachNeeded = false; await reattachTerminals(); }
  for (const id of [...terminals.keys()]) if (!next.some(s => s.id === id)) disposeTerminal(id);
  const changed = JSON.stringify(next) !== JSON.stringify(sessions); sessions = next;
  if (changed && !overviewMode) renderTerminals();
}
api.terminals.onEvent(message => {
  if (message.event === 'data') {
    const t = terminals.get(message.session);
    if (t?.attaching) t.queue.push(message.data);
    else t?.term.write(Uint8Array.from(atob(message.data), c => c.charCodeAt(0)));
  } else if (message.event === 'sessions') refreshSessions().catch(() => {});
  else if (message.event === 'disconnected') {
    reattachNeeded = true;
    toast('Service terminal déconnecté. Reconnexion en cours…');
    setTimeout(() => refreshSessions().catch(() => {}), 500);
  }
});
async function newTerminal(task = null, provider = null, work = undefined) {
  terminalPreference = true;
  if (workflowMode) {
    const project = workflowContext?.project || (await window.studio.request({ action: 'workspace.get' })).project;
    await studioUI.ready; await api.workflowTerminal({ project: project.id }).then(async result => {
      workflowTerminalPath = result.project; terminalPreference = true; terminalMaximized = false; selectedSession.set(result.project, result.id);
      await refreshSessions(); render();
    }); return;
  }
  if (!current || !detail || busy) { toast('Sélectionnez un projet et attendez son chargement.'); return; }
  if (launchingTerminal) return;
  if (provider && !['claude', 'codex'].includes(provider)) return;
  launchingTerminal = true;
  try {
  const project = current, ticket = generation, startingView = view;
  const session = await api.terminals.create({ project, release: view === 'express' || work?.action === 'open' ? null : detail.selectedRelease, scopeMode: view === 'express' ? 'express' : 'auto', task: view === 'express' ? null : task, environment: settings.contexts?.[project]?.environment || null });
  if (provider) {
    const launch = await api.cockpit.prepareAgent({ project, release: session.release || null, task, terminal: session.id, provider, role: 'orchestrator', work });
    await api.terminals.write({ session: session.id, data: launch.command + '\r' });
    settings = await api.settings({});
  }
  selectedSession.set(project, session.id); await refreshSessions();
  if (current === project && ticket === generation && view === startingView) setView('terminal');
  } finally { launchingTerminal = false; }
}
async function startWorkflow() {
  if (!detail || busy) return;
  const existing = workflowSession();
  if (existing) { await followSession(existing.id); terminals.get(existing.id)?.term.focus(); return; }
  const workflow = WORKFLOWS[settings.workflow || 'release'];
  const context = { project: current, release: detail.selectedRelease, generation, provider: settings.provider || 'codex' };
  modal(`<h2>Démarrer · ${esc(workflow.title)}</h2><p>${esc(detail.name)} · ${context.provider === 'claude' ? 'Anthropic · Claude' : 'OpenAI · Codex'}</p>
    <form id="workflow-form" class="cockpit-form"><label>Votre demande${workflow.action === 'workflow' ? ' (facultatif)' : ''}<textarea name="text" rows="4" maxlength="12000" placeholder="Décrivez ce que vous souhaitez obtenir, ou commencez directement la conversation…"></textarea></label>
    <p class="muted">L’agent vous accompagne dans le terminal. Poursuivez la conversation pour préciser le besoin, discuter du plan et donner vos décisions. Le graphique suit les informations enregistrées.</p>
    <button class="primary" type="submit">Démarrer</button><p id="workflow-error" role="alert"></p></form>`);
  $('#workflow-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (context.project !== current || context.release !== detail?.selectedRelease || context.generation !== generation) {
      $('#workflow-error').textContent = 'Le contexte a changé. Rouvrez le workflow dans le projet choisi.'; return;
    }
    const text = new FormData(event.target).get('text');
    if (!text.trim() && workflow.action !== 'workflow') { $('#workflow-error').textContent = 'Décrivez votre demande.'; return; }
    const submit = event.target.querySelector('[type=submit]'); submit.disabled = true;
    try { await newTerminal(null, context.provider, { action: workflow.action, text }); $('#modal').close(); }
    catch (error) { $('#workflow-error').textContent = error.message; }
    finally { submit.disabled = false; }
  });
  $('#workflow-form textarea').focus();
}
function requestWork(action = 'develop', task = null, text = '') {
  if (!detail || busy) return;
  const context = { project: current, release: detail.selectedRelease, task, generation };
  modal(`<span class="eyebrow">${esc(detail.name)}${context.release ? ' · ' + esc(context.release) : ''}</span><h2>${task ? 'Reprendre ' + esc(task) : esc(({open:'Ouvrir une release', collect:'Recueillir les demandes', plan:'Préparer le plan', start:'Exécuter le plan', close:'Recetter et clôturer'})[action] || 'Confier une demande')}</h2>
    <form id="work-form" class="cockpit-form"><label>Action<select name="action">${[['open', 'Ouvrir une release'], ...(context.release ? [['collect', 'Recueillir les demandes'], ['start', 'Exécuter le plan']] : []), ['develop', 'Développer / configurer'], ['diagnose', 'Diagnostiquer un problème'], ['plan', 'Préparer le plan'], ...(task ? [['resume', 'Reprendre cette tâche']] : []), ...(context.release ? [['close', 'Clôturer cette release']] : []), ['answer', 'Répondre à une question'], ['feedback', 'Retenir un retour']].map(([id, title]) => `<option value="${id}" ${id === action ? 'selected' : ''}>${title}</option>`).join('')}</select></label>
    <label>Votre demande<textarea name="text" rows="6" maxlength="12000" placeholder="Résultat attendu, contraintes et précisions utiles…">${esc(text)}</textarea></label>
    <label>Fournisseur IA<select name="provider"><option value="codex" ${settings.provider !== "claude" ? "selected" : ""}>OpenAI · Codex</option><option value="claude" ${settings.provider === "claude" ? "selected" : ""}>Anthropic · Claude</option></select></label>
    <p class="muted">La demande sera transmise dans un nouveau terminal associé à ce contexte. L’agent reprendra les preuves et décisions du projet.</p>
    <button class="primary" type="submit">Lancer le travail</button><p id="work-error" role="alert"></p></form>`);
  const form = $('#work-form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (context.project !== current || context.release !== detail?.selectedRelease || context.generation !== generation) {
      $('#work-error').textContent = 'Le contexte a changé. Rouvrez la demande dans le projet choisi.'; return;
    }
    const data = new FormData(form);
    const work = { action: data.get('action'), text: data.get('text') };
    if (!work.text.trim() && !['resume', 'close', 'start', ...(context.release ? ['plan'] : [])].includes(work.action)) { $('#work-error').textContent = 'Décrivez la demande.'; return; }
    const submit = form.querySelector('[type=submit]'); submit.disabled = true;
    try { settings = await api.settings({ provider: data.get('provider') }); await newTerminal(task, data.get('provider'), work); $('#modal').close(); }
    catch (error) { $('#work-error').textContent = error.message; }
    finally { submit.disabled = false; }
  });
  form.querySelector('textarea').focus();
}
function modal(content) {
  const dialog = $('#modal');
  $('#modal-content').innerHTML = `<button class="modal-close icon-button" data-action="modal-close" aria-label="Fermer">${icon('close')}</button>${content}`;
  const title = $('#modal-content h2');
  if (title) { title.id = 'modal-title'; dialog.setAttribute('aria-labelledby', title.id); }
  else { dialog.removeAttribute('aria-labelledby'); dialog.setAttribute('aria-label', 'Tricorder'); }
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  $('#modal-content .modal-close').focus({ preventScroll: true });
}
async function openDocument(relative) { const doc = await api.document(current, relative); if (doc.type !== 'pdf') modal(`<span class="eyebrow">Document du projet</span><h2>${esc(doc.name)}</h2>${documentBody(doc, esc)}`); }
async function setEnvironment(value) { settings = await api.settings({ context: { project: current, release: detail?.selectedRelease || '', environment: value } }); render(); toast('Contexte appliqué aux nouveaux terminaux.'); }
async function refresh() {
  if (!bootstrapped) return start();
  if (pollBusy) return;
  pollBusy = true; setSyncStatus('Actualisation…');
  const project = current, ticket = generation;
  const before = JSON.stringify([projects, detail, sessions, projectError]);
  try {
    const previous = projects.find(p => p.path === project)?.releases;
    if (catalogError) {
      const initial = await api.bootstrap(); projects = initial.projects; catalogError = initial.workflowWarning || null;
      render();
    } else projects = await api.overview();
    await refreshSessions();
    const next = !overviewMode && !busy && detail && !projectError && project === current && ticket === generation
      ? newReleaseContext(previous, projects.find(p => p.path === project)?.releases || [], detail?.selectedRelease, sessions, project) : null;
    if (next && view !== 'express') {
      if (next.session) await api.terminals.context({ project, session: next.session.id, release: next.release, task: null, expectedRelease: next.session.release, expectedProjectRelease: '' });
      if (project === current && ticket === generation) {
        await chooseProject(project, next.release);
        toast(next.ambiguous ? 'Nouvelle release sélectionnée. Choisis le terminal à utiliser : aucun terminal réaffecté automatiquement.' : 'Nouvelle release sélectionnée' + (next.session ? ' et appliquée au terminal existant.' : '.'));
      }
    }
    const known = projects.find(p => p.path === project)?.releases || [];
    const wanted = detail ? detail.selectedRelease || '' : settings.contexts?.[project]?.release ?? '';
    if (project && !busy && ticket === generation && wanted && !known.some(r => r.id === wanted)) {
      // Checkout, rename or deletion: fall back once instead of failing every refresh.
      await chooseProject(project, known.find(r => r.status === 'ouverte')?.id || '');
      toast('La release affichée n’existe plus dans ce dossier. ' + (detail?.selectedRelease ? 'Release ouverte sélectionnée.' : 'Aucune release sélectionnée.'));
    } else if (project && !busy && ticket === generation) {
      const result = await api.project(project, wanted);
      if (project === current && ticket === generation) {
        detail = result; projectError = null;
        if (selectedTask && !result.tasks.some(t => t.id === selectedTask)) selectTask(null);
      }
    }
    await refreshSessions();
    const items = attentionItems(), keys = new Set(items.map(i => `${i.project.path}:${i.task.id}:${i.task.status}`));
    if ([...keys].some(k => !notificationKeys.has(k))) api.notify({ title: 'Tricorder · à votre attention', body: `${items.length} élément(s) à examiner dans vos projets.` });
    notificationKeys = keys;
    if (before !== JSON.stringify([projects, detail, sessions, projectError])) render();
    setSyncStatus(catalogError ? 'Workflows à vérifier' : 'À jour · ' + new Date().toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }), !!catalogError);
  } catch (error) { setSyncStatus('Actualisation incomplète', true); toast(error.message); }
  finally { pollBusy = false; }
}
document.addEventListener('click', async event => {
  const el = event.target.closest('button, [data-view]'); if (!el) return;
  try {
    if (el.dataset.workflowProject) { await openWorkflows(); await studioUI.navigate('project', el.dataset.workflowProject); return; }
    if (el.dataset.workflowRoute) { await openWorkflows(el.dataset.workflowRoute); return; }
    if (el.dataset.action === 'work-details') { detailsOpen = !detailsOpen; tabs(); return; }
    if (el.dataset.action === 'work-request') { requestWork(); return; }
    if (el.dataset.action === 'work-close') { if (workflowSession()) { await startWorkflow(); toast('Demandez la recette et la clôture dans cette conversation.'); } else requestWork('close'); return; }
    if (el.dataset.workStage) { setView(({ open: 'intentions', collect: 'intentions', plan: 'plan', start: 'plan', close: 'knowledge' })[el.dataset.workStage]); return; }
    if (el.dataset.workResume) {
      if (workflowSession()) { await startWorkflow(); toast('Poursuivez cette tâche dans la conversation du workflow.'); return; }
      const existing = sessions.find(s => s.alive && s.project === current && s.release === detail?.selectedRelease && s.task === el.dataset.workResume);
      if (existing) return await followSession(existing.id);
      requestWork('resume', el.dataset.workResume); return;
    }
    if (el.dataset.workQuestion) {
      if (workflowSession()) { await startWorkflow(); toast(el.dataset.questionText || 'Répondez à l’agent dans ce terminal.'); }
      else requestWork('answer', null, 'Concernant la question ' + el.dataset.workQuestion + ' — ' + (el.dataset.questionText || '') + '\nMa réponse : ');
      return;
    }
    if (el.dataset.project) return await chooseProject(el.dataset.project);
    if (el.dataset.launchAgent) return await newTerminal(null, el.dataset.launchAgent);
    if (el.dataset.view) return setView(el.dataset.view);
    if (el.dataset.kanbanProject) {
      await chooseProject(el.dataset.kanbanProject, el.dataset.kanbanRelease);
      if (el.dataset.kanbanIntention) {
        setView('intentions');
        [...document.querySelectorAll('.intention-card')].find(node => node.dataset.intention === el.dataset.kanbanIntention)?.click();
      } else { cockpitUI.showBoard(); setView('plan'); selectTask(el.dataset.kanbanTask); }
      return;
    }
    if (el.dataset.action === 'kanban-executing') { kanbanExecuting = !kanbanExecuting; render(); return; }
    if (el.dataset.action === 'kanban-closed') { kanbanClosed = !kanbanClosed; render(); return; }
    if (el.dataset.task) { selectTask(el.dataset.task); return; }
    if (el.dataset.attentionProject) { await chooseProject(el.dataset.attentionProject, el.dataset.attentionRelease); selectTask(el.dataset.taskId); setView(el.dataset.taskId.startsWith('flow:') ? 'agents' : 'plan'); return; }
    if (el.dataset.session) {
      const session = sessions.find(s => s.id === el.dataset.session);
      if (workflowMode && session) { workflowTerminalPath = session.project; selectedSession.set(session.project, session.id); render(); return; }
      if (session && session.project !== current) await chooseProject(session.project);
      if (session?.project === current) { selectedSession.set(current, session.id); setView('terminal'); }
      return;
    }
    if (el.dataset.followSession) return await followSession(el.dataset.followSession);
    if (el.dataset.stop) { if (await api.terminals.stop(el.dataset.stop)) { disposeTerminal(el.dataset.stop); await refreshSessions(); } return; }
    if (el.dataset.document) return await openDocument(el.dataset.document);
    if (el.dataset.action === 'terminal-context') {
      const session = sessions.find(s => s.id === selectedSession.get(current));
      if (!session || !detail) return;
      await api.terminals.context({ project: current, session: session.id, release: detail.selectedRelease, task: selectedTask, expectedRelease: session.release });
      await refreshSessions(); render(); toast('Repère du terminal mis à jour. Le shell et l’agent continuent sans interruption.'); return;
    }
    if (el.dataset.environment) return await setEnvironment(el.dataset.environment);
    switch (el.dataset.action) {
      case 'terminal-layout': terminalLayout = terminalLayout === 'side' ? 'stacked' : 'side'; localStorage.setItem('tricorder.terminalLayout', terminalLayout); applyTerminalLayout(); break;
      case 'terminal-toggle': terminalPreference = $('#terminal-workspace').hidden; terminalMaximized = false; render(); break;
      case 'terminal-maximize': terminalMaximized = !terminalMaximized; render(); break;
      case 'workflow-updates': await openWorkflows(); await studioUI.showUpdates(); break;
      case 'workflow-workspace': await api.workflows(); break;
      case 'project-workflows': {
        const folder = current;
        const data = await window.studio.request({action:'bootstrap'});
        const project = data.projects.find(p => p.path === folder) || await window.studio.request({action:'project.create',title:detail?.name || folder.split('/').pop(),path:folder});
        if (current !== folder) break;
        await openWorkflows(); await studioUI.navigate('project', project.id); break;
      }
      case 'workflow-start': await startWorkflow(); break;
      case 'new-terminal': await newTerminal(); break;
      case 'task-terminal': {
        const session = sessions.find(s => s.id === selectedSession.get(current) && s.alive) || sessions.find(s => s.project === current && s.alive);
        if (session) { selectedSession.set(current, session.id); setView('terminal'); }
        else await newTerminal();
        break;
      }
      case 'refresh': await refresh(); break;
      case 'agents-link': await api.link('agents'); break;
      case 'repo-link': await api.link('tricorder'); break;
      case 'folder': if (current) await api.openFolder(current); break;
      case 'source-root': if (await api.sourceRoot()) await chooseProject(current, detail.selectedRelease); break;
      case 'favorite': { const f = new Set(settings.favorites || []); f.has(current) ? f.delete(current) : f.add(current); settings = await api.settings({ favorites: [...f] }); render(); break; }
      case 'about': modal(`<div class="about-brand">${icon('terminal')}</div><span class="eyebrow">Votre espace de travail</span><h2>Tricorder <small>v${esc(version)}</small></h2><p>Un terminal, vos projets, une vue claire sur les workflows.</p><div class="about-links"><button class="info-card" data-action="agents-link"><h3>Installer les agents Odoo ${icon('external')}</h3><p>Skills, rôles et workflows pour Claude et Codex.</p><code>github.com/le-goff-benoit/odoo-crew</code></button><button class="info-card" data-action="repo-link"><h3>Tricorder sur GitHub ${icon('external')}</h3><p>Téléchargements, code source et signalement de problèmes.</p><code>github.com/le-goff-benoit/odoo-tricorder</code></button></div><p class="muted">Local, sans télémétrie. Les terminaux sont des shells ordinaires. Tricorder ne lit pas vos clés API.</p>`); break;
      case 'cancel-preferences':
      case 'modal-close': $('#modal').close(); break;
      case 'find': openTerminalSearch(); break;
      case 'find-close': closeTerminalSearch(); break;
      case 'find-next': terminals.get(selectedSession.get(current))?.search.findNext($('#terminal-search input').value); break;
      case 'split': split = !split; settings = await api.settings({ ui: { split } }); renderTerminals(); break;
    }
  } catch (error) { toast(error.message); }
});
document.addEventListener('change', async event => {
  try {
    if (event.target.id === 'preferred-provider') { settings = await api.settings({ provider: event.target.value }); workflowControls(); return; }
    if (event.target.id === 'workflow-choice') { settings = await api.settings({ workflow: event.target.value }); workflowControls(); return; }
    if (event.target.id === 'release-select') await chooseProject(current, event.target.value);
    if (event.target.id === 'environment-select') await setEnvironment(event.target.value);
  } catch (error) { toast(error.message); }
});
$('#terminal-search').addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closeTerminalSearch(); } });
$('#terminal-search input').addEventListener('keydown', event => { if (event.key === 'Enter') terminals.get(selectedSession.get(current))?.search.findNext(event.target.value); });
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]')) return;
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 't') { event.preventDefault(); newTerminal().catch(e => toast(e.message)); }
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); openTerminalSearch(); }
  if (event.altKey && !event.ctrlKey && /^[1-9]$/.test(event.key)) {
    const target = SHORTCUT_VIEWS[Number(event.key) - 1];
    if (target && current) { event.preventDefault(); setView(target); }
  }
});

const cockpitUI = cockpit({ api, get: () => ({ projects, settings, current, detail, view, selectedTask, sessions, selectedSession, terminals, overviewMode, projectError }),
  setSettings: value => { settings = value; }, setProjects: value => { projects = value; }, render, sidebar, chooseProject, setView,
  selectTask, selectSession: id => selectedSession.set(current, id),
  modal, toast, esc, badge, when, minutes });

async function start() {
  if (starting || bootstrapped) return;
  starting = true; catalogError = null;
  try {
    const initial = await api.bootstrap(); projects = initial.projects; settings = initial.settings; version = initial.version; crewInstalled = initial.crewInstalled !== false;
    bootstrapped = true; catalogError = initial.workflowWarning || null;
    let revision = await api.revision(), checkingRevision = false;
    cockpitUI.applyPreferences();
    split = !!settings.ui?.split;
    $('#version').textContent = 'v' + version;
    notificationKeys = new Set(attentionItems().map(i => `${i.project.path}:${i.task.id}:${i.task.status}`));
    await refreshSessions();
    const chosen = projects.find(p => p.path === settings.activeProject) || projects.find(p => p.attention?.length) || projects[0];
    // An early click on the global board must survive asynchronous bootstrap.
    if (chosen && !overviewMode) await chooseProject(chosen.path); else render();
    if (initial.initialWorkspace === 'studio') await openWorkflows();
    render(); setSyncStatus(catalogError ? 'Workflows à vérifier' : 'À jour', !!catalogError);
    setInterval(refresh, 30000);
    setInterval(async () => {
      if (checkingRevision || pollBusy || busy) return;
      checkingRevision = true;
      try {
        const next = await api.revision();
        if (next !== revision) { await refresh(); revision = next; }
      } catch { /* The regular refresh reports catalog errors and recovers. */ }
      finally { checkingRevision = false; }
    }, 2000);
    setInterval(() => refreshSessions().catch(() => {}), 5000);
  } catch (error) { bootstrapped = false; catalogError = error.message; setSyncStatus('Chargement impossible', true); render(); }
  finally { starting = false; }
}
start();

import { timerMarkup } from './activity.mjs';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import './style.css';
import './design-system.css';
import { cockpit, providerIcon } from './cockpit.js';
import { documentBody } from './markdown.js';
import { newReleaseContext } from './release-context.mjs';
import { boardCards, columns as kanbanColumns } from './kanban.mjs';
import { knowledgeView } from './knowledge-view.js';
import './knowledge.css';

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
  branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10m12-10a10 10 0 0 1-12 9"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
const labels = { validated: 'Validée', stale: 'Contrôle à actualiser', blocked: 'Bloquée', interrupted: 'Interrompue', awaiting_receipt: 'À réceptionner', pending: 'En attente', ready: 'Prête', running: 'En cours', unverified: 'Non vérifiée', deferred: 'Reportée', claimed: 'Prise en charge', done: 'Terminée', active: 'Actif', complete: 'Terminé', cancelled: 'Annulé', waiting_human: 'Attend une décision', deadlocked: 'Sans étape prête' };
const badge = (state, text) => `<span class="badge ${esc(state)}">${esc(text || labels[state] || state)}</span>`;
const when = value => value ? new Date(typeof value === 'number' ? value * 1000 : value).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' }) : 'Non observé';
const minutes = value => value == null ? 'Non mesuré' : value < 1 ? `${Math.round(value * 60)} s` : `${Math.round(value).toLocaleString('fr-CH')} min`;
const empty = (title, detail, action = '') => `<div class="empty">${icon('grid')}<h2>${esc(title)}</h2><p>${esc(detail)}</p>${action}</div>`;
// Visible tab order; Alt+1…Alt+8 follow it. « Projet » groups the read-only resources.
const VIEWS = [['terminal', 'Terminal', 'terminal'], ['intentions', 'Intentions', 'file'], ['plan', 'Plan', 'plan'], ['knowledge', 'Mémoire', 'file'], ['express', 'Express', 'express'], ['agents', 'Agents', 'agents'], ['effort', 'Temps', 'chart'], ['project', 'Projet', 'folder']];
const RESOURCE_VIEWS = ['documents', 'environments', 'sources'];
const SHORTCUT_VIEWS = VIEWS.map(([id]) => id);
let projects = [], settings = {}, current = null, detail = null, view = 'terminal', selectedTask = null;
let sessions = [], selectedSession = new Map(), terminals = new Map(), generation = 0, busy = false, pollBusy = false;
let projectError = null, overviewMode = false, split = false, version = '', crewInstalled = true;
let notificationKeys = new Set();
let kanbanClosed = false, kanbanExecuting = false;
let launchingTerminal = false;

$('#app').innerHTML = `
  <aside class="sidebar">
    <div class="brand"><div class="brand-mark">${icon('terminal')}</div><div>TRICORDER</div></div>
    <nav class="side-nav" aria-label="Vues transversales"><button class="side-item kanban-nav" data-view="kanban">${icon('grid')}<span>Kanban global</span></button></nav>
    <div class="side-heading">Projets</div>
    <div id="project-list" class="project-list"></div>
    <div class="sidebar-bottom"><button class="install-agents" data-action="agents-link" hidden>${icon('agents')}<span>Installer les agents Odoo<small>Skills pour Claude et Codex</small></span>${icon('external')}</button><button class="about-button" data-action="about">À propos de Tricorder <span id="version"></span></button></div>
  </aside>
  <main class="workspace">
    <header class="topbar project-header"><div class="project-identity"><h1 id="project-title"></h1><div id="project-meta" class="project-meta"></div></div><div id="context-bar" class="context-bar"></div><div class="top-actions"><span id="sync-status" class="sync-status">Lecture des projets…</span><button class="icon-button" data-action="refresh" title="Actualiser">${icon('refresh')}</button></div></header>
    <div id="activity-strip" class="activity-strip" hidden></div><nav id="tabs" class="tabs" aria-label="Vues du projet"></nav>
    <div class="main-body"><section class="main-content"><div id="content"></div><div id="terminal-workspace"><div id="terminal-tabs" class="terminal-tabs"></div><div id="terminal-context" class="terminal-context"></div><div id="terminal-search" class="terminal-search" hidden><input placeholder="Rechercher dans le terminal" aria-label="Rechercher dans le terminal"><button data-action="find-next">Suivant</button><button data-action="find-close">Fermer</button></div><div id="terminal-hosts"></div><div id="terminal-empty"></div></div></section></div>
  </main><div id="toast" role="status" hidden></div><dialog id="modal"><div id="modal-content"></div></dialog>`;

function toast(message) { const el = $('#toast'); el.textContent = message; el.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { el.hidden = true; }, 6500); }
function attentionItems() {
  return projects.flatMap(p => [...(p.attention || []).map(t => ({ project: p, task: t })), ...(p.warnings || []).map(reason => ({ project: p, task: { id: 'État', title: 'Lecture à vérifier', reason, status: 'unverified' } }))]);
}
function sidebar() {
  $('.kanban-nav').classList.toggle('selected', overviewMode);
  const favorites = settings.favorites || [];
  const listed = [...projects].sort((a, b) => Number(favorites.includes(b.path)) - Number(favorites.includes(a.path)) || a.name.localeCompare(b.name));
  $('#project-list').innerHTML = listed.map(p => `
    <button class="project-item side-item ${current === p.path && !overviewMode ? 'selected' : ''}" data-project="${esc(p.path)}" aria-current="${current === p.path && !overviewMode ? 'page' : 'false'}" title="${esc(p.path.replace(/^\/home\/[^/]+/, '~'))}">${p.running ? `<span class="live-dot" title="${p.running} en cours" aria-label="${p.running} en cours"></span>` : ''}<span class="project-name">${esc(p.name)}</span><span class="project-sub">${esc(p.series || '—')}</span>${p.attention?.length ? `<span class="count-pill" title="${p.attention.length} élément(s) à examiner">${p.attention.length}</span>` : favorites.includes(p.path) ? '<span class="fav-dot" aria-label="Favori">★</span>' : ''}</button>`).join('') || '<p class="muted pad">Aucun projet trouvé. Choisissez le dossier des projets dans Préférences.</p>';
  $('.install-agents').hidden = crewInstalled;
  cockpitUI.alertSidebar();
}
function tabs() {
  const active = id => !overviewMode && (view === id || (id === 'project' && RESOURCE_VIEWS.includes(view)));
  $('#tabs').innerHTML = VIEWS.map(([id, label, symbol]) => `<button data-view="${id}" class="${active(id) ? 'active' : ''}" aria-current="${active(id) ? 'page' : 'false'}">${icon(symbol)}${label}</button>`).join('');
}
const releaseLabel = r => ({ ouverte: 'Ouverte', close: 'Close' }[r.status] || r.status);
function header() {
  const project = detail || projects.find(p => p.path === current);
  $('#project-title').textContent = overviewMode ? 'Kanban global' : project?.name || 'Aucun projet';
  $('#project-meta').innerHTML = overviewMode ? `<span class="muted">${projects.length} projets</span>`
    : project ? `${project.series ? `<span class="meta-pill" title="Série Odoo">${esc(project.series)}</span>` : ''}${detail?.branch ? `<span class="meta-pill" title="Branche Git">${icon('branch')}${esc(detail.branch)}${detail.gitChanges ? ` <em>${detail.gitChanges}</em>` : ''}</span>` : ''}<button class="icon-button ${settings.favorites?.includes(current) ? 'gold' : ''}" data-action="favorite" title="${settings.favorites?.includes(current) ? 'Retirer des favoris' : 'Mettre en favori'}" aria-pressed="${!!settings.favorites?.includes(current)}">${icon('star')}</button><button class="icon-button" data-action="folder" title="Ouvrir le dossier ${esc(project.path)}">${icon('external')}</button>`
    : '<span class="muted">Choisissez le dossier des projets dans Préférences.</span>';
  $('#context-bar').hidden = overviewMode || !project;
  $('#tabs').hidden = overviewMode;
  if (project && !overviewMode) {
    const context = settings.contexts?.[current] || {};
    const releases = detail?.releases || project.releases || [];
    const selected = releases.find(r => r.id === detail?.selectedRelease);
    const environment = detail?.environments?.find(e => e.name === context.environment);
    $('#context-bar').innerHTML = `<label class="pill-select release-context ${selected ? selected.status : 'none'}"><span class="sr-only context-label">RELEASE</span>${selected ? `<span class="release-summary" title="Release ${releaseLabel(selected).toLowerCase()} · ${esc(selected.id)}"><i class="status-dot ${esc(selected.status)}"></i><span class="sr-only">${releaseLabel(selected)}</span></span>` : icon('tag')}<select id="release-select" aria-label="Release"><option value="" ${!detail?.selectedRelease ? 'selected' : ''}>Aucune release</option>${releases.map(r => `<option value="${esc(r.id)}" title="${esc(r.id)} · ${r.taskCount ?? '?'} tâches / points" ${r.id === detail?.selectedRelease ? 'selected' : ''}>${r.id === detail?.selectedRelease ? esc(r.title || r.id) : `${esc(r.id.slice(0, 10))} · ${esc(r.title || r.id)} · ${esc(releaseLabel(r))}`}</option>`).join('')}</select>${icon('chevron')}</label><label class="pill-select environment-context ${environment?.kind === 'production' ? 'production' : ''}"><span class="sr-only context-label">ENVIRONNEMENT</span>${icon('server')}<select id="environment-select" aria-label="Environnement" title="Repère pour les nouveaux terminaux ; ne change ni la connexion, ni les permissions, ni le terminal existant."><option value="">Shell local</option>${(detail?.environments || []).map(e => `<option value="${esc(e.name)}" ${context.environment === e.name ? 'selected' : ''}>${esc(e.name)} · ${esc(e.kind)}</option>`).join('')}</select>${icon('chevron')}</label>`;
  }
}
function setView(next) {
  if (next === 'kanban') { overviewMode = true; render(); $('#content').scrollTop = 0; return; }
  if (next === 'project') next = 'documents';
  const changed = view !== next;
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
  const focusKey = ['data-task', 'data-plan-mode', 'data-plan-filter', 'data-graph-select', 'data-intention', 'data-view', 'data-cockpit'].find(k => active?.hasAttribute(k));
  const focusValue = focusKey ? active.getAttribute(focusKey) : null;
  const scroll = [$('#content').scrollTop, $('#content .graph-scroll')?.scrollLeft || 0, $('#content .graph-scroll')?.scrollTop || 0];
  cockpitUI.rememberBoard();
  sidebar(); header(); tabs();
  const terminalVisible = !overviewMode && view === 'terminal';
  $('#terminal-workspace').hidden = !terminalVisible;
  $('#content').hidden = terminalVisible;
  if (overviewMode) renderKanban();
  else if (terminalVisible) renderTerminals();
  else if (busy && !detail) $('#content').innerHTML = empty('Lecture du projet…', 'Chargement des releases et vérification des preuves.');
  else if (projectError) $('#content').innerHTML = empty('Lecture impossible', projectError);
  else if (!detail) $('#content').innerHTML = empty('Aucun projet sélectionné', 'Choisissez un projet dans la colonne de gauche.');
  else ({ intentions: () => {}, plan: () => {}, knowledge: () => { $('#content').innerHTML = knowledgeView(detail.knowledge, esc); }, agents: renderAgents, environments: renderEnvironments, sources: renderSources, effort: renderEffort, documents: renderDocuments }[view] || (() => {}))();
  cockpitUI.augment();
  $('#content').scrollTop = scroll[0];
  const graph = $('#content .graph-scroll'); if (graph) { graph.scrollLeft = scroll[1]; graph.scrollTop = scroll[2]; }
  if (focusKey && !active.isConnected && !document.querySelector('dialog[open]')) document.querySelector(`[${focusKey}="${CSS.escape(focusValue)}"]`)?.focus({ preventScroll: true });
}
async function chooseProject(project, release) {
  current = project; overviewMode = false; detail = null; selectedTask = null; projectError = null; busy = true;
  const ticket = ++generation;
  await api.settings({ activeProject: project });
  if (ticket !== generation) return;
  render();
  try {
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
    return `<section class="kanban-column" data-column="${id}" aria-label="${label}"><h2>${label}<span>${tasks.length}</span></h2>${tasks.map(t => `<button class="kanban-card" data-kanban-project="${esc(t.project)}" data-kanban-release="${esc(t.release)}" ${t.kind === 'intention' ? `data-kanban-intention="${esc(t.intentionId)}"` : `data-kanban-task="${esc(t.id)}"`}><span class="kanban-project">${esc(t.projectName)}<small class="kanban-release"> · ${esc(t.releaseTitle)}${t.releaseStatus === 'close' ? ' · close' : ''}</small></span><div class="kanban-card-status"><strong>${esc(t.intentionId || t.id)}</strong>${badge(t.status, t.presentation?.label)}</div><h3>${esc(t.title)}</h3>${t.kind === 'orchestration' ? `<p class="card-meta">${esc(t.stage)}</p>` : ''}${t.kind === 'intention' ? '<p class="card-meta">Revue de l’orchestrateur attendue</p>' : t.owners?.length ? `<p class="card-meta board-owner">${icon('person')}${esc(t.owners.join(' · '))}</p>` : ''}${(t.activities || []).map(a => `<p class="task-activity ${a.executing ? 'executing' : ''}">${providerIcon(a.provider)}${esc(a.label)} · ${timerMarkup(a, esc)}</p>`).join('')}${t.presentation?.proof ? `<p class="board-proof">${esc(t.presentation.proof)}</p>` : ''}</button>`).join('') || '<p class="kanban-empty">Aucune tâche</p>'}</section>`;
  }).join('')}</div>`; })()}${projects.some(p => p.warnings?.length) ? '<p class="note">Certains projets ont des informations à vérifier. Les statuts inconnus restent dans « État à vérifier » ; ouvrez le projet pour le détail.</p>' : ''}</div>`;
  $('.kanban-board').scrollLeft = scrollLeft;
}
function renderAgents() {
  // Rich view rendered by cockpitUI.augment().
  $('#content').innerHTML = '<div class="page"></div>';
}
function renderEnvironments() {
  const chosen = settings.contexts?.[current]?.environment;
  $('#content').innerHTML = `<div class="page"><div class="section-title"><h2>Environnements déclarés</h2><span>${detail.environments.length} disponible(s)</span></div><div class="card-grid">${detail.environments.map(e => `<article class="info-card ${e.kind === 'production' ? 'production-card' : ''}"><div class="card-title">${icon('server')}<h3>${esc(e.name)}</h3>${badge(e.kind === 'production' ? 'blocked' : 'series', e.kind)}</div><dl><dt>Plateforme</dt><dd>${esc(e.platform || 'Non précisée')}</dd><dt>Adresse</dt><dd>${esc(e.url || 'Non précisée')}</dd><dt>Base</dt><dd>${esc(e.db || 'Non précisée')}</dd><dt>Connexion</dt><dd>Non vérifiée · aucune requête distante</dd></dl><button class="${chosen === e.name ? 'secondary' : 'primary'}" data-environment="${esc(e.name)}">${chosen === e.name ? 'Contexte sélectionné' : 'Sélectionner ce contexte'}</button>${e.kind === 'production' ? '<p class="warning-text">Production : sélection sans autorisation d’écriture. Les commandes saisies dans le shell conservent leurs propres permissions.</p>' : ''}</article>`).join('')}</div>${!detail.environments.length ? empty('Aucun environnement déclaré', 'Utilisez /odoo-env dans votre agent. Les métadonnées seront lues depuis .odoo-agents/instances.json ; les secrets restent dans le trousseau.') : ''}<div class="note">Un changement de sélection s’applique aux nouveaux terminaux. Les sessions existantes gardent leur contexte d’origine.</div></div>`;
}
function renderSources() {
  const sources = detail.sources;
  $('#content').innerHTML = `<div class="page"><div class="section-title"><h2>Bibliothèque des sources Odoo</h2><button class="secondary" data-action="source-root">${icon('folder')} Choisir le dossier partagé</button></div><div class="note"><strong>${esc({ module: 'Projet avec modules', studio: 'Projet sans module / Studio', online: 'Odoo Online' }[sources.profile])}</strong> · ${sources.inferred ? "profil déduit des métadonnées" : "profil explicitement choisi"}.<br>${esc(sources.explanation)}</div><div class="source-root">${icon('folder')}<code>${esc(sources.root)}</code>${badge('series', sources.series || 'Série inconnue')}</div><div class="card-grid">${sources.libraries.map(l => `<article class="info-card"><div class="card-title">${icon('sources')}<h3>${l.kind}</h3>${badge(l.present ? 'validated' : 'pending', l.present ? 'Présent' : 'Absent')}</div><code class="path">${esc(l.path || 'Déclarer la série du projet')}</code><p>${l.kind === 'Enterprise' ? esc(sources.enterpriseRequirement) : l.required ? 'Nécessaire à la voie module locale' : 'Référence pour l’analyse du standard'}</p></article>`).join('')}</div><div class="section-title section-space"><h2>Modules du projet</h2><span>Code propre au projet</span></div><div class="module-chips">${sources.modules.map(m => `<code>${esc(m)}</code>`).join('') || '<span class="muted">Aucun module custom détecté.</span>'}</div><h4 class="eyebrow section-space">SÉRIES PRÉSENTES SUR CE POSTE</h4><div class="module-chips">${sources.available.map(s => badge('series', s)).join('') || '<p class="muted">Bibliothèque absente ou vide.</p>'}</div><div class="note">${esc(sources.policy)} Branches et commits vérifiés ci-dessous. Aucun téléchargement ni mise à jour automatique ; Enterprise nécessite vos accès Odoo.</div></div>`;
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
  const own = sessions.filter(s => s.project === current);
  let id = selectedSession.get(current);
  if (!own.some(s => s.id === id)) { id = own.at(-1)?.id; selectedSession.set(current, id); }
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
  $('#terminal-empty').innerHTML = busy || !detail
    ? empty('Chargement du projet…', 'Les commandes seront disponibles dès que son contexte sera prêt.')
    : empty('Aucun terminal ouvert', 'Un shell dans le dossier du projet. Lancez Claude ou Codex avec suivi, ou vos commandes habituelles.', `<button class="primary" data-action="new-terminal">${icon('terminal')} Ouvrir un terminal</button><div class="launch-hints"><button class="secondary" data-launch-agent="claude">${providerIcon('claude')} Claude</button><button class="secondary" data-launch-agent="codex">${providerIcon('codex')} Codex</button></div>`);
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
    theme: { background: '#101519', foreground: '#dce3e6', cursor: '#efb779', selectionBackground: '#354b56', black: '#1d252a', red: '#ec8d8d', green: '#82c7ae', yellow: '#e8bf82', blue: '#8eacd8', magenta: '#c4a5d5', cyan: '#80ccca', white: '#dee6e9' } });
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
        (event.altKey && !event.ctrlKey && /^[1-8]$/.test(event.key))) { event.preventDefault(); return false; }
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
function fitVisible() { if (view !== 'terminal' || overviewMode) return; for (const t of terminals.values()) if (!t.host.hidden && t.host.clientWidth > 0 && t.host.clientHeight > 0) { try { t.fit.fit(); } catch {} } }
new ResizeObserver(fitVisible).observe($('#terminal-hosts'));
async function refreshSessions() { const next = await api.terminals.list(); const changed = JSON.stringify(next) !== JSON.stringify(sessions); sessions = next; if (changed && view === 'terminal' && !overviewMode) renderTerminals(); }
api.terminals.onEvent(message => {
  if (message.event === 'data') {
    const t = terminals.get(message.session);
    if (t?.attaching) t.queue.push(message.data);
    else t?.term.write(Uint8Array.from(atob(message.data), c => c.charCodeAt(0)));
  } else if (message.event === 'sessions') refreshSessions().catch(() => {});
  else if (message.event === 'disconnected') toast('Service terminal déconnecté. Actualisez pour reconnecter les sessions.');
});
async function newTerminal(task = null, provider = null) {
  if (!current || !detail || busy) { toast('Sélectionnez un projet et attendez son chargement.'); return; }
  if (launchingTerminal) return;
  if (provider && !['claude', 'codex'].includes(provider)) return;
  launchingTerminal = true;
  try {
  const project = current, ticket = generation, startingView = view;
  const session = await api.terminals.create({ project, release: view === 'express' ? null : detail.selectedRelease, scopeMode: view === 'express' ? 'express' : 'auto', task: view === 'express' ? null : task, environment: settings.contexts?.[project]?.environment || null });
  if (provider) {
    const launch = await api.cockpit.prepareAgent({ project, release: session.release || null, task, terminal: session.id, provider, role: 'orchestrator' });
    await api.terminals.write({ session: session.id, data: launch.command + '\r' });
  }
  selectedSession.set(project, session.id); await refreshSessions();
  if (current === project && ticket === generation && view === startingView) setView('terminal');
  } finally { launchingTerminal = false; }
}
function modal(content) { $('#modal-content').innerHTML = `<button class="modal-close icon-button" data-action="modal-close" aria-label="Fermer">${icon('close')}</button>${content}`; $('#modal').showModal(); }
async function openDocument(relative) { const doc = await api.document(current, relative); if (doc.type !== 'pdf') modal(`<span class="eyebrow">DOCUMENT DU PROJET</span><h2>${esc(doc.name)}</h2>${documentBody(doc, esc)}`); }
async function setEnvironment(value) { settings = await api.settings({ context: { project: current, release: detail?.selectedRelease || '', environment: value } }); render(); toast('Contexte appliqué aux nouveaux terminaux.'); }
async function refresh() {
  if (pollBusy) return;
  pollBusy = true; $('#sync-status').textContent = 'Actualisation…';
  const project = current, ticket = generation;
  const before = JSON.stringify([projects, detail, sessions, projectError]);
  try {
    const previous = projects.find(p => p.path === project)?.releases;
    projects = await api.overview();
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
    if (project && !busy && ticket === generation) {
      const result = await api.project(project, detail ? detail.selectedRelease || '' : settings.contexts?.[project]?.release ?? '');
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
    $('#sync-status').textContent = 'À jour · ' + new Date().toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
  } catch (error) { $('#sync-status').textContent = 'Actualisation incomplète'; toast(error.message); }
  finally { pollBusy = false; }
}
document.addEventListener('click', async event => {
  const el = event.target.closest('button, [data-view]'); if (!el) return;
  try {
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
      if (session && session.project !== current) await chooseProject(session.project);
      if (session?.project === current) { selectedSession.set(current, session.id); setView('terminal'); }
      return;
    }
    if (el.dataset.followSession) return await followSession(el.dataset.followSession);
    if (el.dataset.stop) { if (await api.terminals.stop(el.dataset.stop)) { const t = terminals.get(el.dataset.stop); t?.term.dispose(); t?.host.remove(); terminals.delete(el.dataset.stop); await refreshSessions(); } return; }
    if (el.dataset.document) return await openDocument(el.dataset.document);
    if (el.dataset.action === 'terminal-context') {
      const session = sessions.find(s => s.id === selectedSession.get(current));
      if (!session || !detail) return;
      await api.terminals.context({ project: current, session: session.id, release: detail.selectedRelease, task: selectedTask, expectedRelease: session.release });
      await refreshSessions(); render(); toast('Repère du terminal mis à jour. Le shell et l’agent continuent sans interruption.'); return;
    }
    if (el.dataset.environment) return await setEnvironment(el.dataset.environment);
    switch (el.dataset.action) {
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
      case 'about': modal(`<div class="about-brand">${icon('terminal')}</div><span class="eyebrow">VOTRE POSTE DE COMMANDE ODOO</span><h2>Odoo Tricorder <small>v${esc(version)}</small></h2><p>Un terminal, vos projets, une vue claire sur les workflows.</p><div class="about-links"><button class="info-card" data-action="agents-link"><h3>Installer les agents Odoo ${icon('external')}</h3><p>Skills, rôles et workflows pour Claude et Codex.</p><code>github.com/le-goff-benoit/odoo-crew</code></button><button class="info-card" data-action="repo-link"><h3>Odoo Tricorder sur GitHub ${icon('external')}</h3><p>Téléchargements, code source et signalement de problèmes.</p><code>github.com/le-goff-benoit/odoo-tricorder</code></button></div><p class="muted">Local, sans télémétrie. Les terminaux sont des shells ordinaires. Tricorder ne lit pas vos clés API.</p>`); break;
      case 'cancel-preferences':
      case 'modal-close': $('#modal').close(); break;
      case 'find': $('#terminal-search').hidden = false; $('#terminal-search input').focus(); break;
      case 'find-close': $('#terminal-search').hidden = true; fitVisible(); break;
      case 'find-next': terminals.get(selectedSession.get(current))?.search.findNext($('#terminal-search input').value); break;
      case 'split': split = !split; settings = await api.settings({ ui: { split } }); renderTerminals(); break;
    }
  } catch (error) { toast(error.message); }
});
document.addEventListener('change', async event => {
  try {
    if (event.target.id === 'release-select') await chooseProject(current, event.target.value);
    if (event.target.id === 'environment-select') await setEnvironment(event.target.value);
  } catch (error) { toast(error.message); }
});
$('#terminal-search input').addEventListener('keydown', event => { if (event.key === 'Enter') terminals.get(selectedSession.get(current))?.search.findNext(event.target.value); });
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]')) return;
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 't') { event.preventDefault(); newTerminal().catch(e => toast(e.message)); }
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); $('#terminal-search').hidden = false; $('#terminal-search input').focus(); }
  if (event.altKey && !event.ctrlKey && /^[1-8]$/.test(event.key)) {
    const target = SHORTCUT_VIEWS[Number(event.key) - 1];
    if (target && current) { event.preventDefault(); setView(target); }
  }
});

const cockpitUI = cockpit({ api, get: () => ({ projects, settings, current, detail, view, selectedTask, sessions, selectedSession, terminals, overviewMode, projectError }),
  setSettings: value => { settings = value; }, setProjects: value => { projects = value; }, render, sidebar, chooseProject, setView,
  selectTask, selectSession: id => selectedSession.set(current, id),
  modal, toast, esc, badge, when, minutes });

async function start() {
  try {
    const initial = await api.bootstrap(); projects = initial.projects; settings = initial.settings; version = initial.version; crewInstalled = initial.crewInstalled !== false;
    let revision = await api.revision(), checkingRevision = false;
    split = !!settings.ui?.split;
    $('#version').textContent = 'v' + version;
    notificationKeys = new Set(attentionItems().map(i => `${i.project.path}:${i.task.id}:${i.task.status}`));
    await refreshSessions();
    const chosen = projects.find(p => p.path === settings.activeProject) || projects.find(p => p.attention?.length) || projects[0];
    // An early click on the global board must survive asynchronous bootstrap.
    if (chosen && !overviewMode) await chooseProject(chosen.path); else render();
    $('#sync-status').textContent = 'À jour';
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
  } catch (error) { toast(error.message); $('#sync-status').textContent = 'Chargement impossible'; render(); }
}
start();

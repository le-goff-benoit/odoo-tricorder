import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import './style.css';

const api = window.tricorder;
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  terminal: '<path d="m5 7 5 5-5 5m8 0h6"/>',
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
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',
  branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10m12-10a10 10 0 0 1-12 9"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
const labels = { validated: 'Validée', stale: 'À revalider', blocked: 'Bloquée', interrupted: 'Interrompue', awaiting_receipt: 'À réceptionner', pending: 'En attente', ready: 'Prête', running: 'En cours', unverified: 'Non vérifiée', deferred: 'Reportée', claimed: 'Revendiquée', done: 'Terminée', active: 'Actif', complete: 'Terminé', cancelled: 'Annulé', waiting_human: 'Attend une décision', deadlocked: 'Sans étape prête' };
const badge = (state, text) => `<span class="badge ${esc(state)}">${esc(text || labels[state] || state)}</span>`;
const when = value => value ? new Date(typeof value === 'number' ? value * 1000 : value).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' }) : 'Non observé';
const minutes = value => value == null ? 'Non mesuré' : `${Math.round(value).toLocaleString('fr-CH')} min`;
const empty = (title, detail, action = '') => `<div class="empty">${icon('grid')}<h2>${esc(title)}</h2><p>${esc(detail)}</p>${action}</div>`;
let projects = [], settings = {}, current = null, detail = null, view = 'terminal', selectedTask = null;
let sessions = [], selectedSession = new Map(), terminals = new Map(), generation = 0, busy = false, pollBusy = false;
let projectError = null, overviewMode = false, filter = '', split = false, inspectorHidden = false, version = '';
let notificationKeys = new Set();

$('#app').innerHTML = `
  <aside class="sidebar">
    <div class="brand"><div class="brand-mark">${icon('terminal')}</div><div>TRICORDER<small>ODOO · MISSION CONTROL</small></div></div>
    <button class="attention-link" data-action="attention">${icon('bell')}<span>À mon attention</span><span id="attention-count" class="count">0</span></button>
    <div class="project-heading"><span>PROJETS</span><button class="icon-button" data-action="add" title="Ajouter un projet">${icon('plus')}</button></div>
    <label class="project-search">${icon('search')}<input id="project-search" placeholder="Rechercher un projet" aria-label="Rechercher un projet"><kbd>⌃ K</kbd></label>
    <div id="project-list" class="project-list"></div>
    <div class="sidebar-bottom"><button class="install-agents" data-action="agents-link">${icon('agents')}<span>Installer les agents Odoo<small>Skills pour Claude et Codex</small></span>${icon('external')}</button><button class="about-button" data-action="about">À propos de Tricorder <span id="version"></span></button></div>
  </aside>
  <main class="workspace">
    <header class="topbar"><div class="breadcrumbs"><span class="local-dot"></span>POSTE LOCAL <span>/</span> <strong id="breadcrumb">Projets</strong></div><div class="top-actions"><span id="sync-status">Lecture des projets…</span><button class="icon-button" data-action="refresh" title="Actualiser">${icon('refresh')}</button></div></header>
    <section class="project-header"><div><div class="eyebrow" id="project-eyebrow">ESPACE DE TRAVAIL</div><h1 id="project-title">Bienvenue à bord.</h1><div id="project-meta" class="project-meta"></div></div><button class="primary" data-action="new-terminal">${icon('plus')} Nouveau terminal</button></section>
    <div id="context-bar" class="context-bar"></div>
    <nav id="tabs" class="tabs" aria-label="Vues du projet"></nav>
    <div class="main-body"><section class="main-content"><div id="content"></div><div id="terminal-workspace"><div id="terminal-tabs" class="terminal-tabs"></div><div id="terminal-context" class="terminal-context"></div><div id="terminal-search" class="terminal-search" hidden><input placeholder="Rechercher dans le terminal" aria-label="Rechercher dans le terminal"><button data-action="find-next">Suivant</button><button data-action="find-close">Fermer</button></div><div id="terminal-hosts"></div><div id="terminal-empty"></div><div class="terminal-footer"><span>Les sessions continuent quand vous fermez Tricorder.</span><button data-action="find">${icon('search')} Rechercher</button><button data-action="split">Diviser</button></div></div></section><aside id="inspector" class="inspector"></aside></div>
    <footer class="statusbar"><span><i class="local-dot"></i> Local · données des projets en lecture seule</span><span id="session-count">Aucune session</span></footer>
  </main><div id="toast" role="status" hidden></div><dialog id="modal"><div id="modal-content"></div></dialog>`;

function toast(message) { const el = $('#toast'); el.textContent = message; el.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { el.hidden = true; }, 6500); }
function attentionItems() {
  return projects.flatMap(p => [...(p.attention || []).map(t => ({ project: p, task: t })), ...(p.warnings || []).map(reason => ({ project: p, task: { id: 'État', title: 'Lecture à vérifier', reason, status: 'unverified' } }))]);
}
function sidebar() {
  const favorites = settings.favorites || [];
  const listed = [...projects].sort((a, b) => Number(favorites.includes(b.path)) - Number(favorites.includes(a.path)) || a.name.localeCompare(b.name));
  $('#project-list').innerHTML = listed.filter(p => p.name.toLowerCase().includes(filter.toLowerCase())).map(p => `
    <button class="project-item ${current === p.path && !overviewMode ? 'selected' : ''}" data-project="${esc(p.path)}"><span class="project-monogram">${esc(p.name.slice(0, 2).toUpperCase())}</span><span class="project-name">${esc(p.name)}<small>${esc(p.series ? 'Odoo ' + p.series : 'Série à préciser')}${p.running ? ' · ' + p.running + ' en cours' : ''}</small></span>${p.attention?.length ? `<span class="attention-dot">${p.attention.length}</span>` : favorites.includes(p.path) ? '<span class="fav-dot">★</span>' : ''}</button>`).join('') || '<p class="muted pad">Aucun projet trouvé. Ajoutez un dossier.</p>';
  $('#attention-count').textContent = attentionItems().length;
  $('.attention-link').classList.toggle('selected', overviewMode);
}
function tabs() {
  const views = [['terminal', 'Terminal', 'terminal'], ['plan', 'Plan de release', 'plan'], ['agents', 'Agents', 'agents'], ['environments', 'Environnements', 'server'], ['sources', 'Sources', 'sources'], ['effort', 'Temps & estimations', 'chart'], ['documents', 'Documents', 'file']];
  $('#tabs').innerHTML = views.map(([id, label, symbol]) => `<button data-view="${id}" class="${view === id && !overviewMode ? 'active' : ''}">${icon(symbol)}${label}</button>`).join('');
}
function header() {
  const project = detail || projects.find(p => p.path === current);
  $('#breadcrumb').textContent = overviewMode ? 'À mon attention' : project?.name || 'Projets';
  $('#project-title').textContent = overviewMode ? 'Ce qui vous attend.' : project?.name || 'Votre poste de commande.';
  $('#project-eyebrow').textContent = overviewMode ? 'VUE TRANSVERSALE' : 'ESPACE DE TRAVAIL';
  $('#project-meta').innerHTML = overviewMode ? `${attentionItems().length} élément(s) à examiner · ${projects.length} projets suivis` : project ? `<span>${icon('folder')}${esc(project.path.replace(/^\/home\/[^/]+/, '~'))}</span>${project.series ? badge('series', 'Odoo ' + project.series) : ''}${detail?.branch ? `<span>${icon('branch')}${esc(detail.branch)}${detail.gitChanges ? ' · ' + detail.gitChanges + ' modif.' : ''}</span>` : ''}<button class="icon-button ${settings.favorites?.includes(current) ? 'gold' : ''}" data-action="favorite" title="Favori">${icon('star')}</button><button class="icon-button" data-action="folder" title="Ouvrir le dossier">${icon('external')}</button>` : 'Ajoutez un dossier pour retrouver vos projets, terminaux et agents.';
  $('#context-bar').hidden = overviewMode || !project;
  if (project && !overviewMode) {
    const context = settings.contexts?.[current] || {};
    $('#context-bar').innerHTML = `<label>RELEASE<select id="release-select" aria-label="Release">${(project.releases || []).map(r => `<option value="${esc(r.id)}" ${r.id === detail?.selectedRelease ? 'selected' : ''}>${esc(r.id)} · ${esc(r.status)}</option>`).join('') || '<option value="">Aucune release</option>'}</select></label><label>ENVIRONNEMENT<select id="environment-select" aria-label="Environnement"><option value="">Non ciblé · shell local</option>${(detail?.environments || []).map(e => `<option value="${esc(e.name)}" ${context.environment === e.name ? 'selected' : ''}>${esc(e.name)} · ${esc(e.kind)}</option>`).join('')}</select></label><span class="context-hint">Contexte des nouveaux terminaux</span>`;
  }
}
function setView(next) { view = next; overviewMode = false; render(); }
function render() {
  sidebar(); header(); tabs();
  const terminalVisible = !overviewMode && view === 'terminal';
  $('#terminal-workspace').hidden = !terminalVisible;
  $('#content').hidden = terminalVisible;
  $('#inspector').hidden = overviewMode || !['terminal', 'plan'].includes(view) || (view === 'terminal' && inspectorHidden);
  if (overviewMode) renderAttention();
  else if (terminalVisible) renderTerminals();
  else if (busy && !detail) $('#content').innerHTML = empty('Lecture du projet…', 'Chargement des releases et vérification des preuves.');
  else if (projectError) $('#content').innerHTML = empty('Lecture impossible', projectError);
  else if (!detail) $('#content').innerHTML = empty('Aucun projet sélectionné', 'Choisissez un projet dans la colonne de gauche.');
  else ({ plan: renderPlan, agents: renderAgents, environments: renderEnvironments, sources: renderSources, effort: renderEffort, documents: renderDocuments }[view] || renderPlan)();
  renderInspector();
  $('#session-count').textContent = `${sessions.filter(s => s.alive).length} terminal(aux) actif(s)`;
}
async function chooseProject(project, release) {
  current = project; overviewMode = false; detail = null; selectedTask = null; projectError = null; busy = true;
  const ticket = ++generation;
  await api.settings({ activeProject: project });
  render();
  try {
    const selected = release || settings.contexts?.[project]?.release;
    const known = projects.find(p => p.path === project)?.releases || [];
    const result = await api.project(project, known.some(r => r.id === selected) ? selected : null);
    if (ticket !== generation) return;
    detail = result;
    selectedTask = result.tasks.find(t => t.status === 'running' || t.status === 'stale')?.id || result.tasks[0]?.id;
    settings = await api.settings({ context: { project, release: result.selectedRelease || '', environment: settings.contexts?.[project]?.environment || '' } });
  } catch (error) { if (ticket === generation) projectError = error.message; }
  finally { if (ticket === generation) { busy = false; render(); } }
}
function renderAttention() {
  const items = attentionItems();
  $('#content').innerHTML = `<div class="page"><div class="metrics"><div class="metric"><span>PROJETS SUIVIS</span><strong>${projects.length}</strong><small>Sur ce poste</small></div><div class="metric"><span>À EXAMINER</span><strong class="gold">${items.length}</strong><small>Preuves, blocages et réceptions</small></div><div class="metric"><span>TERMINAUX ACTIFS</span><strong>${sessions.filter(s => s.alive).length}</strong><small>Activité du processus observée</small></div></div><div class="section-title"><h2>Votre file d’attention</h2><span>Actualisée toutes les 30 secondes</span></div>${items.map(({ project, task }) => `<button class="attention-card" data-attention-project="${esc(project.path)}" data-task-id="${esc(task.id)}"><div>${badge(task.status)}<span class="muted">${esc(project.name)} / ${esc(task.id)}</span></div><h3>${esc(task.title)}</h3><p>${esc(task.reason)}</p>${icon('arrow')}</button>`).join('') || empty('Rien à signaler dans les plans lus', 'Les questions internes à Claude et Codex ne sont pas encore collectées automatiquement.')}<div class="note">Les états Odoo et les processus du terminal sont suivis séparément. Une étape revendiquée ne prouve pas l’activité de son agent.</div></div>`;
}
function renderPlan() {
  const tasks = detail.tasks;
  const completed = tasks.filter(t => t.status === 'validated').length;
  $('#content').innerHTML = `<div class="page"><div class="section-title"><div class="section-heading"><span class="eyebrow">RELEASE</span><h2>${esc(detail.releases.find(r => r.id === detail.selectedRelease)?.title || 'Plan de release')}</h2></div>${badge('series', `${completed} / ${tasks.length} validées`)}</div><div class="progress-track"><div style="width:${tasks.length ? completed / tasks.length * 100 : 0}%"></div></div>${detail.warnings.map(w => `<div class="note warning">${esc(w)}</div>`).join('')}<div class="task-list">${tasks.map(t => `<button class="task-card ${selectedTask === t.id ? 'selected' : ''}" data-task="${esc(t.id)}"><div class="task-marker ${esc(t.status)}">${t.status === 'validated' ? '✓' : t.status === 'stale' ? '!' : '·'}</div><div class="task-description"><div class="task-topline"><span class="task-id">${esc(t.id)}</span>${badge(t.status)}${t.risk === 'high' ? '<span class="risk">Sensible</span>' : ''}</div><h3>${esc(t.title)}</h3><p>${esc(t.reason || 'En attente de démarrage')}</p><div class="dependencies">${(t.depends_on || []).length ? 'Dépend de ' + t.depends_on.map(d => `<span>${esc(d)}</span>`).join(' ') : 'Sans dépendance'} · ${esc((t.scopes || []).join(', '))}</div></div>${icon('arrow')}</button>`).join('') || empty('Aucun plan dans cette release', 'Utilisez /odoo-plan dans votre agent pour préparer les tâches.')}</div></div>`;
}
function renderInspector() {
  if ($('#inspector').hidden) return;
  const task = detail?.tasks.find(t => t.id === selectedTask);
  const flow = detail?.flows.find(f => f.path === task?.flow);
  $('#inspector').innerHTML = `<div class="inspector-heading"><span class="eyebrow">SUIVI DE MISSION</span><span class="live-label">${icon('agents')} Workflow Odoo</span></div>${task ? `<div class="inspector-task"><span class="task-id">${esc(task.id)}</span><h3>${esc(task.title)}</h3>${badge(task.status)}</div>${flow ? `<div class="timeline">${flow.nodes.map(n => `<div class="timeline-node ${esc(n.status)}"><span class="timeline-point"></span><div><strong>${esc(n.description)}</strong><small>${esc(n.role || n.id)}</small>${n.owner ? `<p class="gold">${esc(n.owner)}</p><p>Activité non confirmée</p>` : ''}${n.status === 'ready' ? badge(n.executor === 'human' ? 'blocked' : 'ready', n.executor === 'human' ? 'Décision humaine attendue' : 'Prochaine étape') : ''}</div></div>`).join('')}</div>${flow.warning ? `<div class="note warning">${esc(flow.warning)}</div>` : ''}` : '<p class="muted pad">Aucun workflow associé à cette tâche.</p>'}<div class="inspector-bottom"><h4>Critères d’acceptation</h4><ul>${(task.acceptance || []).map(a => `<li>${esc(a)}</li>`).join('')}</ul><button class="secondary wide" data-action="task-terminal">${icon('terminal')} Terminal pour ${esc(task.id)}</button>${task.request ? `<button class="text-button" data-document="${esc(task.request)}">Voir la demande ${icon('external')}</button>` : ''}</div>` : `<div class="pad"><h3>Votre agent, votre terminal.</h3><p class="muted">Lancez <code>claude</code> ou <code>codex</code> dans un terminal. Le workflow Odoo apparaîtra ici lorsqu’une tâche sera associée à un plan.</p><div class="note">Les sous-agents natifs et leurs demandes d’autorisation ne sont pas encore reliés au cockpit.</div><button class="secondary wide" data-action="agents-link">Installer les agents ${icon('external')}</button></div>`}`;
}
function renderAgents() {
  const own = sessions.filter(s => s.project === current);
  const claims = detail.flows.flatMap(f => f.nodes.filter(n => n.status === 'claimed').map(n => ({ ...n, flow: f })));
  $('#content').innerHTML = `<div class="page"><div class="section-title"><h2>Sessions & responsabilités</h2><span>Deux sources, deux niveaux de certitude</span></div><h4 class="eyebrow">PROCESSUS OBSERVÉS</h4><div class="card-grid">${own.map(s => `<button class="info-card session-card" data-session="${s.id}"><div class="card-title">${icon('terminal')}<h3>${esc(s.program || 'Shell')}</h3>${badge(s.alive ? 'validated' : 'done', s.alive ? 'Processus actif' : 'Terminé')}</div><p>${esc(s.environment || 'Non ciblé')} · ${esc(s.task || 'Sans tâche associée')}</p><small>Ouvert le ${when(s.createdAt)}<br>Dernière sortie : ${when(s.lastOutputAt)}</small></button>`).join('') || '<p class="muted">Aucun terminal pour ce projet.</p>'}</div><h4 class="eyebrow section-space">ÉTAPES REVENDIQUÉES</h4>${claims.map(n => `<div class="info-card"><div class="card-title"><h3>${esc(n.role)}</h3>${badge('claimed', 'Activité non confirmée')}</div><p>${esc(n.description)}</p><small>${esc(n.owner)} · depuis ${when(n.claimedAt)}</small><div class="note">Ressources réservées : ${esc(n.locks.map(l => l.resource || l.path || JSON.stringify(l)).join(', ') || 'Aucune indiquée')}</div></div>`).join('') || '<p class="muted">Aucune étape actuellement revendiquée dans les workflows de cette release.</p>'}<div class="section-title section-space"><h2>Historique des workflows</h2></div>${detail.flows.map(f => `<details class="flow-log"><summary><strong>${esc(f.id)}</strong>${badge(f.status)}<span>${when(f.updatedAt)}</span></summary>${f.events.map(e => `<div class="event-row"><time>${when(e.at)}</time><strong>${esc(e.node || e.action)}</strong><span>${esc(e.outcome || '')}</span><p>${esc(e.note || '')}</p></div>`).join('')}</details>`).join('')}<div class="note">« Processus actif » ne signifie pas que l’agent réfléchit : il peut attendre une saisie. Les noms et propriétaires des étapes viennent des workflows, pas d’une détection des sous-agents.</div></div>`;
}
function renderEnvironments() {
  const chosen = settings.contexts?.[current]?.environment;
  $('#content').innerHTML = `<div class="page"><div class="section-title"><h2>Environnements déclarés</h2><span>${detail.environments.length} disponible(s)</span></div><div class="card-grid">${detail.environments.map(e => `<article class="info-card ${e.kind === 'production' ? 'production-card' : ''}"><div class="card-title">${icon('server')}<h3>${esc(e.name)}</h3>${badge(e.kind === 'production' ? 'blocked' : 'series', e.kind)}</div><dl><dt>Plateforme</dt><dd>${esc(e.platform || 'Non précisée')}</dd><dt>Adresse</dt><dd>${esc(e.url || 'Non précisée')}</dd><dt>Base</dt><dd>${esc(e.db || 'Non précisée')}</dd><dt>Connexion</dt><dd>Non vérifiée · aucune requête distante</dd></dl><button class="${chosen === e.name ? 'secondary' : 'primary'}" data-environment="${esc(e.name)}">${chosen === e.name ? 'Contexte sélectionné' : 'Sélectionner ce contexte'}</button>${e.kind === 'production' ? '<p class="warning-text">Production : sélection sans autorisation d’écriture. Les commandes saisies dans le shell conservent leurs propres permissions.</p>' : ''}</article>`).join('')}</div>${!detail.environments.length ? empty('Aucun environnement déclaré', 'Utilisez /odoo-env dans votre agent. Les métadonnées seront lues depuis .odoo-agents/instances.json ; les secrets restent dans le trousseau.') : ''}<div class="section-title section-space"><h2>Fichiers reçus</h2><span>Inbox du projet</span></div><div class="file-list">${detail.inbox.map(f => `<div class="file-row">${icon('file')}<strong>${esc(f.name)}</strong><span>${(f.bytes / 1048576).toFixed(1)} Mo</span><small>${when(f.modified)}</small></div>`).join('') || '<p class="muted">Aucun fichier dans inbox/.</p>'}</div><div class="note">Un changement de sélection s’applique aux nouveaux terminaux. Les sessions existantes gardent leur contexte d’origine.</div></div>`;
}
function renderSources() {
  const sources = detail.sources;
  $('#content').innerHTML = `<div class="page"><div class="section-title"><h2>Bibliothèque des sources Odoo</h2><button class="secondary" data-action="source-root">${icon('folder')} Choisir le dossier partagé</button></div><div class="note"><strong>${esc({ module: 'Projet avec modules', studio: 'Projet sans module / Studio', online: 'Odoo Online' }[sources.profile])}</strong> · profil déduit des modules et environnements déclarés.<br>${esc(sources.explanation)}</div><div class="source-root">${icon('folder')}<code>${esc(sources.root)}</code>${badge('series', sources.series || 'Série inconnue')}</div><div class="card-grid">${sources.libraries.map(l => `<article class="info-card"><div class="card-title">${icon('sources')}<h3>${l.kind}</h3>${badge(l.present ? 'validated' : 'pending', l.present ? 'Présent' : 'Absent')}</div><code class="path">${esc(l.path || 'Déclarer la série du projet')}</code><p>${l.kind === 'Enterprise' ? esc(sources.enterpriseRequirement) : l.required ? 'Nécessaire à la voie module locale' : 'Référence pour l’analyse du standard'}</p></article>`).join('')}</div><div class="section-title section-space"><h2>Modules du projet</h2><span>Code propre au projet</span></div><div class="module-chips">${sources.modules.map(m => `<code>${esc(m)}</code>`).join('') || '<span class="muted">Aucun module custom détecté.</span>'}</div><h4 class="eyebrow section-space">SÉRIES PRÉSENTES SUR CE POSTE</h4><div class="module-chips">${sources.available.map(s => badge('series', s)).join('') || '<p class="muted">Bibliothèque absente ou vide.</p>'}</div><div class="note">${esc(sources.policy)} La présence d’un dossier ne vérifie pas sa branche Git. La V1 ne télécharge ni ne met à jour les sources ; Enterprise nécessite vos accès Odoo.</div></div>`;
}
function renderEffort() {
  const effort = detail.effort;
  if (!effort) { $('#content').innerHTML = empty('Pas encore d’estimation', 'Utilisez /odoo-estimate pour estimer et mesurer le travail de cette release.'); return; }
  const totals = effort.totals || {};
  $('#content').innerHTML = `<div class="page"><div class="section-title"><h2>Prévu & réalisé</h2><span>Minutes d’exécution des agents</span></div><div class="metrics"><div class="metric"><span>PRÉVISION INITIALE</span><strong>${totals.planned_initial_minutes == null ? '—' : Math.round(totals.planned_initial_minutes)}<em> min</em></strong><small>Révisée : ${minutes(totals.planned_revised_minutes)}</small></div><div class="metric"><span>TEMPS CUMULÉ MESURÉ</span><strong>${totals.actual_minutes == null ? '—' : Math.round(totals.actual_minutes)}<em> min</em></strong><small>${totals.actual_minutes == null ? 'Mesure incomplète ou absente' : 'Somme du temps des agents'}</small></div><div class="metric"><span>JETONS MESURÉS</span><strong>${totals.tokens == null ? '—' : totals.tokens.toLocaleString('fr-CH')}</strong><small>${totals.tokens == null ? 'Compteurs non disponibles' : 'Total enregistré'}</small></div></div><div class="table-scroll"><table><thead><tr><th>Tâche / rôle</th><th>Initial</th><th>Révisé</th><th>Réel</th><th>Écart</th></tr></thead><tbody>${(effort.rows || []).map(r => `<tr><td><strong>${esc(r.task)}</strong> <span class="muted">${esc(r.agent)}</span><small>${esc(r.title)}</small>${r.scope_changed ? '<small class="warning-text">Périmètre modifié : comparaison non homogène</small>' : ''}${r.retrospective ? '<small class="warning-text">Estimation rétrospective</small>' : ''}</td><td>${minutes(r.initial?.expected_minutes)}</td><td>${minutes(r.revised?.expected_minutes)}</td><td class="${r.actual_minutes == null ? 'muted' : ''}">${minutes(r.actual_minutes)}</td><td>${r.delta_minutes == null ? '—' : (r.delta_minutes > 0 ? '+' : '') + Math.round(r.delta_minutes) + ' min'}</td></tr>`).join('')}</tbody></table></div><div class="note">Temps calendaire couvert : ${minutes(totals.covered_interval_minutes)}. Sous-total connu des agents : ${minutes(totals.known_minutes)}. Une donnée absente reste inconnue ; elle ne devient pas zéro.</div>${(effort.warnings || []).map(w => `<div class="note warning">${esc(w)}</div>`).join('')}<p class="muted">Les mesures viennent d’effort.json. La durée d’ouverture d’un terminal n’est pas comptée comme du travail agent. La collecte et l’attribution automatiques des sessions feront l’objet d’une version suivante.</p></div>`;
}
function renderDocuments() {
  $('#content').innerHTML = `<div class="page"><div class="section-title"><h2>Documents & mémoire</h2><span>Release et contexte du projet</span></div><div class="file-list">${detail.documents.map(d => `<button class="file-row" data-document="${esc(d.path)}">${icon('file')}<strong>${esc(d.name)}</strong><span class="file-type">${esc(d.type)}</span>${icon('external')}</button>`).join('') || empty('Aucun document', 'Les demandes, preuves et journaux apparaîtront ici.')}</div></div>`;
}
function renderTerminals() {
  const own = sessions.filter(s => s.project === current);
  let id = selectedSession.get(current);
  if (!own.some(s => s.id === id)) { id = own.at(-1)?.id; selectedSession.set(current, id); }
  $('#terminal-tabs').innerHTML = own.map((s, i) => `<div class="terminal-tab ${s.id === id ? 'active' : ''}"><button data-session="${s.id}"><span class="${s.alive ? 'local-dot' : 'dead-dot'}"></span>${esc(s.provider || s.program || 'Terminal')} ${i + 1}${s.task ? ' · ' + esc(s.task) : ''}</button><button data-stop="${s.id}" title="Arrêter ce terminal" aria-label="Arrêter ce terminal">${icon('close')}</button></div>`).join('') + `<button class="icon-button" data-action="new-terminal" title="Nouveau terminal">${icon('plus')}</button>`;
  const selected = own.find(s => s.id === id);
  $('#terminal-context').textContent = selected ? `${selected.environment || 'Non ciblé'} · ${selected.release || 'Sans release'} · ${selected.task || 'Sans tâche'} · ouvert ${when(selected.createdAt)}` : 'Shell local · lancez librement claude ou codex';
  const env = detail?.environments.find(e => e.name === selected?.environment);
  $('#terminal-context').classList.toggle('production', env?.kind === 'production');
  if (env?.kind === 'production') $('#terminal-context').textContent = 'PRODUCTION · contexte déclaré, aucune permission accordée · ' + $('#terminal-context').textContent;
  $('#terminal-empty').hidden = own.length > 0;
  $('#terminal-hosts').hidden = own.length === 0;
  $('#terminal-empty').innerHTML = empty('Votre prochaine mission commence ici.', 'Un vrai shell dans le dossier du projet. Lancez Claude, Codex ou vos commandes habituelles.', `<button class="primary" data-action="new-terminal">${icon('terminal')} Ouvrir un terminal</button><div class="launch-hints"><code>claude</code><span>ou</span><code>codex</code></div>`);
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
  term.open(host);
  term.onData(data => api.terminals.write({ session: id, data }).catch(e => toast(e.message)));
  term.onResize(({ cols, rows }) => api.terminals.resize({ session: id, cols, rows }).catch(() => {}));
  term.attachCustomKeyEventHandler(event => {
    if (event.ctrlKey && event.shiftKey && ['T', 'F', 'C', 'V'].includes(event.key.toUpperCase())) {
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
async function refreshSessions() { sessions = await api.terminals.list(); if (view === 'terminal' && !overviewMode) renderTerminals(); $('#session-count').textContent = `${sessions.filter(s => s.alive).length} terminal(aux) actif(s)`; }
api.terminals.onEvent(message => {
  if (message.event === 'data') {
    const t = terminals.get(message.session);
    if (t?.attaching) t.queue.push(message.data);
    else t?.term.write(Uint8Array.from(atob(message.data), c => c.charCodeAt(0)));
  } else if (message.event === 'sessions') refreshSessions().catch(() => {});
  else if (message.event === 'disconnected') toast('Service terminal déconnecté. Actualisez pour reconnecter les sessions.');
});
async function newTerminal(task = null) {
  if (!current || !detail || busy) { toast('Sélectionnez un projet et attendez son chargement.'); return; }
  const session = await api.terminals.create({ project: current, release: detail.selectedRelease, task, environment: settings.contexts?.[current]?.environment || null });
  selectedSession.set(current, session.id); await refreshSessions(); setView('terminal');
}
function modal(content) { $('#modal-content').innerHTML = `<button class="modal-close icon-button" data-action="modal-close" aria-label="Fermer">${icon('close')}</button>${content}`; $('#modal').showModal(); }
async function openDocument(relative) { const doc = await api.document(current, relative); if (doc.type !== 'pdf') modal(`<span class="eyebrow">DOCUMENT DU PROJET</span><h2>${esc(doc.name)}</h2><pre class="document-text">${esc(doc.text)}</pre>`); }
async function setEnvironment(value) { settings = await api.settings({ context: { project: current, release: detail?.selectedRelease || '', environment: value } }); render(); toast('Contexte appliqué aux nouveaux terminaux.'); }
async function refresh() {
  if (pollBusy) return;
  pollBusy = true; $('#sync-status').textContent = 'Actualisation…';
  const project = current, ticket = generation;
  try {
    projects = await api.overview();
    if (project && !busy) {
      const result = await api.project(project, detail?.selectedRelease || null);
      if (project === current && ticket === generation) detail = result;
    }
    await refreshSessions();
    const items = attentionItems(), keys = new Set(items.map(i => `${i.project.path}:${i.task.id}:${i.task.status}`));
    if ([...keys].some(k => !notificationKeys.has(k))) api.notify({ title: 'Tricorder · à votre attention', body: `${items.length} élément(s) à examiner dans vos projets.` });
    notificationKeys = keys; render();
    $('#sync-status').textContent = 'À jour · ' + new Date().toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
  } catch (error) { $('#sync-status').textContent = 'Actualisation incomplète'; toast(error.message); }
  finally { pollBusy = false; }
}
document.addEventListener('click', async event => {
  const el = event.target.closest('button, [data-view]'); if (!el) return;
  try {
    if (el.dataset.project) return await chooseProject(el.dataset.project);
    if (el.dataset.view) return setView(el.dataset.view);
    if (el.dataset.task) { selectedTask = el.dataset.task; render(); return; }
    if (el.dataset.attentionProject) { await chooseProject(el.dataset.attentionProject); selectedTask = el.dataset.taskId; setView(selectedTask.startsWith('flow:') ? 'agents' : 'plan'); return; }
    if (el.dataset.session) { const session = sessions.find(s => s.id === el.dataset.session); if (session && session.project !== current) await chooseProject(session.project); selectedSession.set(current, el.dataset.session); setView('terminal'); return; }
    if (el.dataset.stop) { if (await api.terminals.stop(el.dataset.stop)) { const t = terminals.get(el.dataset.stop); t?.term.dispose(); t?.host.remove(); terminals.delete(el.dataset.stop); await refreshSessions(); } return; }
    if (el.dataset.document) return await openDocument(el.dataset.document);
    if (el.dataset.environment) return await setEnvironment(el.dataset.environment);
    switch (el.dataset.action) {
      case 'new-terminal': await newTerminal(); break;
      case 'task-terminal': await newTerminal(selectedTask); break;
      case 'attention': overviewMode = true; render(); break;
      case 'refresh': await refresh(); break;
      case 'add': { const value = await api.addProject(); if (value) { projects = value; sidebar(); } break; }
      case 'agents-link': await api.link('agents'); break;
      case 'repo-link': await api.link('tricorder'); break;
      case 'folder': if (current) await api.openFolder(current); break;
      case 'source-root': if (await api.sourceRoot()) await chooseProject(current, detail.selectedRelease); break;
      case 'favorite': { const f = new Set(settings.favorites || []); f.has(current) ? f.delete(current) : f.add(current); settings = await api.settings({ favorites: [...f] }); render(); break; }
      case 'about': modal(`<div class="about-brand">${icon('terminal')}</div><span class="eyebrow">VOTRE POSTE DE COMMANDE ODOO</span><h2>Odoo Tricorder <small>v${esc(version)}</small></h2><p>Un terminal, vos projets, une vue claire sur les workflows.</p><div class="about-links"><button class="info-card" data-action="agents-link"><h3>Installer les agents Odoo ${icon('external')}</h3><p>Skills, rôles et workflows pour Claude et Codex.</p><code>github.com/le-goff-benoit/odoo-crew</code></button><button class="info-card" data-action="repo-link"><h3>Odoo Tricorder sur GitHub ${icon('external')}</h3><p>Téléchargements, code source et signalement de problèmes.</p><code>github.com/le-goff-benoit/odoo-tricorder</code></button></div><p class="muted">Local, sans télémétrie. Les terminaux sont des shells ordinaires. Tricorder ne lit pas vos clés API.</p>`); break;
      case 'modal-close': $('#modal').close(); break;
      case 'find': $('#terminal-search').hidden = false; $('#terminal-search input').focus(); break;
      case 'find-close': $('#terminal-search').hidden = true; fitVisible(); break;
      case 'find-next': terminals.get(selectedSession.get(current))?.search.findNext($('#terminal-search input').value); break;
      case 'split': split = !split; renderTerminals(); break;
      case 'inspector': inspectorHidden = !inspectorHidden; render(); break;
    }
  } catch (error) { toast(error.message); }
});
document.addEventListener('change', async event => {
  try {
    if (event.target.id === 'release-select') await chooseProject(current, event.target.value);
    if (event.target.id === 'environment-select') await setEnvironment(event.target.value);
  } catch (error) { toast(error.message); }
});
$('#project-search').addEventListener('input', event => { filter = event.target.value; sidebar(); });
$('#terminal-search input').addEventListener('keydown', event => { if (event.key === 'Enter') terminals.get(selectedSession.get(current))?.search.findNext(event.target.value); });
document.addEventListener('keydown', event => {
  if (event.ctrlKey && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#project-search').focus(); }
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 't') { event.preventDefault(); newTerminal().catch(e => toast(e.message)); }
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); $('#terminal-search').hidden = false; $('#terminal-search input').focus(); }
});

$('.terminal-footer').insertAdjacentHTML('beforeend', '<button data-action="inspector">Suivi de mission</button>');

async function start() {
  try {
    const initial = await api.bootstrap(); projects = initial.projects; settings = initial.settings; version = initial.version;
    $('#version').textContent = 'v' + version;
    notificationKeys = new Set(attentionItems().map(i => `${i.project.path}:${i.task.id}:${i.task.status}`));
    await refreshSessions();
    const chosen = projects.find(p => p.path === settings.activeProject) || projects.find(p => p.attention?.length) || projects[0];
    if (chosen) await chooseProject(chosen.path); else render();
    $('#sync-status').textContent = 'À jour';
    setInterval(refresh, 30000);
    setInterval(() => refreshSessions().catch(() => {}), 5000);
  } catch (error) { toast(error.message); $('#sync-status').textContent = 'Chargement impossible'; render(); }
}
start();

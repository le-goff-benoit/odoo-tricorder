import './studio.css';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { states, kinds, symbols, nodePosition, effectiveExecution, History, applyPatch, patchSummary, displayGraph, orthogonalPath } from './studio-model.js';
import { WorkflowTerminal } from './studio-terminal.js';

const api = window.studio;
const terminal = new WorkflowTerminal(api);
const app = document.querySelector('#app');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clone = value => structuredClone(value);
const options = (values, selected) => values.map(([value, label]) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
const state = { projects: [], templates: [], capabilities: [], route: 'overview', project: null, workflows: [], runs: [], graph: null, savedRevision: 0, run: null, events: [], selected: null, mode: 'design', view: 'canvas', zoom: 0.8, history: new History(), dirty: false, polling: false, modal: null, collapsed: new Set() };
let toastTimer;
let actionQueue = Promise.resolve();
function enqueue(fn) { actionQueue = actionQueue.then(() => safe(fn)); }

async function call(action, data = {}, human = false) { return (human ? api.human : api.request)({ action, ...data }); }
function toast(message) {
  document.querySelector('.flash')?.remove();
  const el = document.createElement('div'); el.className = 'flash'; el.setAttribute('role', 'status'); el.textContent = message; document.body.append(el);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.remove(), 5500);
}
function error(message) {
  const target = document.querySelector('.modal-card .status-line') || document.querySelector('#feedback');
  if (target) { target.innerHTML = `<div class="error" role="alert">${esc(message)}</div>`; target.scrollIntoView({ block: 'nearest' }); }
  else toast(message);
}
async function safe(fn) { try { await fn(); } catch (e) { error(e.message.replace(/^Error invoking remote method '[^']+': Error: /, '')); } }
function edit(mutator) {
  const next = clone(state.graph); mutator(next); state.history.push(state.graph); state.graph = next; state.dirty = true; renderEditor();
}
function badge(status) { return `<span class="pill ${esc(status)}">${esc(states[status] || status)}</span>`; }
function updateRunBanner() {
  const banner = document.querySelector('#run-banner');
  if (banner && state.run) banner.innerHTML = `${state.run.simulation ? '<strong>Simulation.</strong> Aucun modèle ni service métier appelé. ' : '<strong>Exécution réelle.</strong> '}${Object.values(state.run.nodes).filter(n => n.status === 'waiting').length} décision(s) attendue(s) · ${esc(runLabel(state.run))}.`;
  const heading = document.querySelector('.workflow-heading p');
  if (heading && state.mode === 'run') heading.textContent = `Version figée · ${runLabel(state.run)} · ${new Date(state.run.created * 1000).toLocaleString('fr-CH')}`;
}
function selectedNode() { return state.graph?.nodes.find(n => n.id === state.selected); }
function currentGraph() { return state.mode === 'run' && state.run ? state.run.definition : state.graph; }
function activationDetails(check) {
  return `${check.automatic?.length ? `<p>Validation automatique : ${esc(check.automatic.join(', '))}. Succès, sorties et preuves contrôlés ; les décisions humaines restent obligatoires.</p>` : ''}${check.notifications?.length ? `<div class="notice"><strong>Notifications prévues</strong>${check.notifications.map(n => `<p>${esc(n.title)} → ${esc(n.recipient || 'destinataire à configurer')}<br>${esc(n.template)}</p>`).join('')}<label><input type="checkbox" name="authorize_notifications" id="authorize-notifications">J’autorise ces notifications pour cette révision et ces destinataires.</label></div>` : ''}`;
}
function button(action, text, css = '', extra = '') { return `<button class="${css}" data-action="${action}" ${extra}>${text}</button>`; }

const navPaths = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  global: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
  projects: '<path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/>',
  library: '<path d="M4 4h4v16H4zM11 4h4v16h-4zM18 5l3 14"/>',
  schedules: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  connections: '<path d="m8 3 4 4-5 5-4-4m13 13-4-4 5-5 4 4M9 9l6 6M6 15l-3 3m15-15-3 3"/>',
  updates: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  theme: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18Z" fill="currentColor"/>',
  brand: '<rect x="2" y="3" width="6" height="6" rx="1"/><rect x="16" y="15" width="6" height="6" rx="1"/><path d="M8 6h4v12h4"/>',
};
function navIcon(name) { return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${navPaths[name]}</svg>`; }
function shell() {
  terminal.detach();
  const title = state.route === 'workflow' ? state.project.title : { overview: 'Vue d’ensemble', projects: 'Projets', project: state.project?.title, library: 'Bibliothèque de workflows', connections: 'Connexions et capacités', schedules: 'Workflows récurrents' }[state.route];
  const activeRoute = ['workflow', 'project'].includes(state.route) ? (state.project?.library ? 'library' : state.project?.scope === 'workspace' ? 'global' : 'projects') : state.route;
  const navItem = (route, label, accessible = label) => `<button data-action="navigate" data-route="${route}" class="nav-item ${activeRoute === route ? 'active' : ''}" ${activeRoute === route ? 'aria-current="page"' : ''} aria-label="${accessible}" title="${label}">${navIcon(route)}<span class="nav-label">${label}</span></button>`;
  app.innerHTML = `<div class="shell"><aside class="sidebar" aria-label="Tricorder"><div class="brand"><span class="brand-icon">${navIcon('brand')}</span><span class="brand-name">Tricorder</span></div>
    <nav aria-label="Navigation principale"><div class="nav-group">${navItem('overview', 'Vue d’ensemble')}</div><div class="nav-group">${navItem('global', 'Workflows globaux', 'Globaux')}${navItem('projects', 'Projets')}${navItem('library', 'Bibliothèque')}${navItem('schedules', 'Récurrences')}</div><div class="nav-group">${navItem('connections', 'Connexions')}</div></nav>
    <div class="sidebar-footer">${button('updates', navIcon('updates') + '<span class="nav-label">Mises à jour</span>', 'nav-item', 'aria-label="Mises à jour" title="Mises à jour"')}${button('theme', navIcon('theme') + '<span class="nav-label">Thème</span>', 'nav-item', 'aria-label="Changer le thème" title="Changer le thème"')}</div></aside>
    <main class="workspace"><header class="topbar"><div class="breadcrumb"><span>Tricorder</span><span aria-hidden="true">/</span><strong>${esc(title)}</strong></div><div class="row"><span id="update-indicator"></span><span class="pill">● Local</span></div></header><div id="feedback"></div><div id="content" style="display:contents"></div></main></div>`;
  if (state.route === 'overview') renderOverview();
  if (state.route === 'projects') renderProjects();
  if (state.route === 'project') renderProject();
  if (state.route === 'library') renderLibrary();
  if (state.route === 'connections') renderConnections();
  if (state.route === 'schedules') renderSchedules();
  if (state.route === 'workflow') renderEditor();
  updateIndicator();
  terminal.mount(document.querySelector('.workspace'));
  if (state.route !== 'workflow') terminal.host.hidden = true;
  if (state.project?.id !== terminal.active) terminal.host.hidden = true;
}

function content(html) { document.querySelector('#content').innerHTML = html; }
function renderOverview() {
  const activity = state.activity || { runs: [], workflow_count: 0 };
  if (!state.projects.length && !activity.workflow_count && !activity.runs.length) { renderProjects(); return; }
  const active = activity.runs.filter(r => ['active', 'paused'].includes(r.status));
  const waiting = active.filter(r => Object.values(r.nodes).some(n => ['waiting', 'returned', 'blocked'].includes(n.status)));
  content(`<section class="page"><div class="page-heading"><div><h1>Vue d’ensemble</h1><p>Suivez vos workflows globaux et ceux de vos projets. Retrouvez les résultats, les décisions attendues et les prochaines exécutions.</p></div>${button('refresh-overview', 'Actualiser')}</div><div class="overview-stats"><article class="card"><strong>${active.length}</strong><span>Exécutions ouvertes</span></article><article class="card"><strong>${waiting.length}</strong><span>À examiner</span></article><article class="card"><strong>${(state.schedules || []).filter(s => s.enabled).length}</strong><span>Récurrences actives</span></article></div><h2>${waiting.length ? 'À examiner' : 'Exécutions récentes'}</h2>${activityTable(waiting.length ? waiting : activity.runs.slice(0, 10))}<div class="overview-links">${button('navigate', 'Ouvrir les workflows globaux', '', 'data-route="global"')}${button('navigate', 'Ouvrir les projets', '', 'data-route="projects"')}${button('navigate', 'Choisir un modèle', 'primary', 'data-route="library"')}</div></section>`);
}
function activityTable(runs) {
  if (!runs.length) return '<p class="muted">Aucune exécution. Choisissez un workflow global ou un projet pour commencer.</p>';
  return `<table><thead><tr><th>Workflow</th><th>Espace</th><th>Statut</th><th></th></tr></thead><tbody>${runs.map(r => `<tr><td>${esc(r.definition.title)}<br><small>${r.simulation ? 'Simulation' : 'Exécution réelle'}</small></td><td>${esc(r.project_title)}</td><td>${esc(Object.values(r.nodes).some(n => n.status === 'waiting') ? 'Décision attendue' : Object.values(r.nodes).some(n => n.status === 'returned') ? 'Résultat à valider' : runLabel(r))}</td><td>${button('activity-run', 'Consulter', '', `data-project="${r.project}" data-id="${r.id}"`)}</td></tr>`).join('')}</tbody></table>`;
}
function renderProjects() {
  content(`<section class="page"><div class="hero"><div><div class="eyebrow">De l'intention à la réalisation</div><h1>Un workflow clair.<br>Un travail que vous pouvez suivre.</h1><p class="muted" style="font-size:14px">Composez les étapes, choisissez qui intervient et gardez la main sur les décisions importantes.</p><div class="row">${button('try-example', 'Essayer un exemple', 'primary')}${button('new-project', 'Créer un projet')}${button('import-workflow', 'Importer un workflow')}</div><p class="muted" style="margin-bottom:0">L'exemple est simulé : aucun modèle payant, aucune publication.</p></div><div class="mini-flow" aria-hidden="true"><span>✦ Analyser</span>→<span class="human">? Décider</span>→<span>✓ Valider</span></div></div>
    <div class="page-heading"><div><h2>Vos projets</h2><p>Un projet est la racine d’un dépôt Git local. Il réunit ses workflows, ses exécutions et leurs résultats.</p></div>${state.projects.length ? button('new-project', '+ Nouveau projet') : ''}</div>
    ${state.projects.length ? `<div class="project-list">${state.projects.map(p => `<button class="project-card" data-action="open-project" data-id="${p.id}"><div><h3>${esc(p.title)}</h3><small>${p.path ? esc(p.path) : 'Dépôt Git local · aucun pack métier requis'}</small></div><span aria-hidden="true">→</span></button>`).join('')}</div>` : '<div class="card"><h3>Votre premier projet commence ici</h3><p>Essayez le parcours guidé ou créez un projet pour adapter un modèle de la bibliothèque.</p></div>'}</section>`);
}
function renderProject() {
  content(`<section class="page"><div class="page-heading"><div><div class="eyebrow">${state.project.scope === 'workspace' ? 'Espace transversal' : 'Projet Git'}</div><h1>${esc(state.project.title)}</h1><p>${state.project.scope === 'workspace' ? 'Automatisations indépendantes des projets : veille, messagerie, tickets et routines.' : esc(state.project.path)}</p></div><div class="row">${button('library-project', 'Choisir un modèle', 'primary')}${button('blank-workflow', '+ Workflow vide')}</div></div>
    <h2>${state.project.scope === 'workspace' ? 'Workflows globaux' : 'Workflows du projet'}</h2><div class="grid">${state.workflows.map(g => `<article class="card"><div class="card-icon">⑂</div><h3>${esc(g.title)}</h3><p>${g.nodes.length} étapes · révision ${g.revision}</p>${button('open-workflow', 'Ouvrir le workflow', '', `data-id="${g.id}"`)}</article>`).join('') || '<p class="muted">Aucun workflow. Choisissez un modèle pour commencer.</p>'}</div>
    <h2 style="margin-top:34px">Exécutions récentes</h2>${runTable(state.runs)}</section>`);
  document.querySelector('.page-heading .row').insertAdjacentHTML('beforeend', button('import-pack', 'Ajouter un pack'));
}
function runTable(runs) {
  if (!runs.length) return '<p class="muted">Aucune exécution lancée.</p>';
  return `<table><thead><tr><th>Workflow</th><th>Contexte</th><th>État</th><th></th></tr></thead><tbody>${runs.map(r => `<tr><td>${esc(r.definition.title)}<br><small>${new Date(r.created * 1000).toLocaleString('fr-CH')}</small></td><td>${r.simulation ? 'Simulation' : 'Exécution réelle'}</td><td>${esc(runLabel(r))}</td><td>${button('open-run', 'Consulter', '', `data-id="${r.id}"`)}</td></tr>`).join('')}</tbody></table>`;
}
function runLabel(run) { return ({ active: 'En cours', paused: 'Suspendue', completed: 'Terminée', cancelled: 'Annulée' })[run.status] || run.status; }
function renderLibrary() {
  content(`<section class="page"><div class="page-heading"><div><div class="eyebrow">Composer et réutiliser</div><h1>Bibliothèque</h1><p>Un modèle de workflow décrit les étapes du travail. Vous pourrez adapter chaque bloc dans votre projet, puis choisir les modèles IA séparément.</p><p class="muted">Destination : ${state.project && !state.project.library ? esc(state.project.title) : 'Workflows globaux'}. Ouvrez un projet puis « Choisir un modèle » pour y créer une adaptation.</p></div></div><div class="grid">${state.templates.map(g => `<article class="card"><div class="card-icon">${g.nodes.length > 1 ? '⑂' : symbols[g.nodes[0].kind]}</div><h3>${esc(g.title)}</h3><p>${esc(g.description)}</p><div class="row between"><span class="pill">${g.nodes.length} étape${g.nodes.length > 1 ? 's' : ''}</span>${button('use-template', 'Utiliser', '', `data-id="${g.id}"`)}</div></article>`).join('')}</div></section>`);
  document.querySelector('.page-heading').insertAdjacentHTML('beforeend', button('import-workflow', 'Importer un workflow') + button('new-template', '+ Créer un modèle', 'primary'));
  document.querySelectorAll('[data-action="use-template"]').forEach(el => el.insertAdjacentHTML('afterend', button('edit-template', 'Modifier le modèle', '', `data-id="${el.dataset.id}"`)));
}

function renderSchedules() {
  const schedules = state.schedules || [];
  content(`<section class="page"><div class="page-heading"><div><div class="eyebrow">Automatisations locales</div><h1>Workflows récurrents</h1><p>Retrouvez vos prochaines exécutions ici et dans l’icône Tricorder de la barre Ubuntu.</p></div>${button('refresh-schedules', 'Actualiser')}</div><div class="notice">Tricorder doit rester ouvert, éventuellement dans la zone de notification. Après une interruption, une seule occurrence en retard est rattrapée. Une exécution encore ouverte empêche le chevauchement.</div><div class="grid" style="margin-top:24px">${schedules.map(s => `<article class="card"><div class="row between"><h3>${esc(s.title)}</h3><span class="pill">${s.enabled ? 'Active' : 'Suspendue'}</span></div><p>${s.scope?.kind === 'workspace' ? 'Global' : esc(state.projects.find(p => p.id === s.project)?.title || 'Projet')} · ${s.simulation ? 'Simulation' : 'Exécution réelle'} · ${esc(s.rule.timezone)}<br>Prochaine : ${new Date(s.next * 1000).toLocaleString('fr-CH', { timeZone: s.rule.timezone })}</p><p class="muted">${s.last_status === 'blocked' ? esc(s.error) : s.last_status === 'skipped-overlap' ? 'Dernière occurrence non lancée : une exécution précédente attend encore.' : 'La révision activée reste figée.'}</p><div class="row">${button('toggle-schedule', s.enabled ? 'Suspendre' : 'Réactiver', '', `data-id="${s.id}"`)}${s.last_run ? button('schedule-run', 'Dernière exécution', '', `data-id="${s.id}"`) : ''}</div></article>`).join('') || '<div class="card"><h3>Aucune récurrence activée</h3><p>Ouvrez un workflow puis choisissez « Planifier » pour vérifier ses moyens et sa fréquence avant activation.</p></div>'}</div></section>`);
}
function renderConnections() {
  content(`<section class="page"><div class="page-heading"><div><div class="eyebrow">Capacités du poste</div><h1>Connexions</h1><p>La présence d'un outil ne prouve ni l'accès à un compte ni l'autorisation d'une opération. Les modèles peuvent analyser ou proposer du code dans une copie isolée. Les transports MCP stdio et les adaptateurs locaux vérifiés relient les outils aux blocs.</p></div><div class="row">${button('connection-terminal', 'Configurer dans le terminal')}${button('discover-plugins', 'Détecter les plugins Codex')}${button('refresh-connections', 'Actualiser')}</div></div><form id="connection-context-form" class="row"><label for="connection-context">Contexte</label><select id="connection-context" name="project" style="width:auto">${options([["workspace", "Workflows globaux"], ["library", "Bibliothèque"], ...state.projects.map(p => [p.id, p.title])], state.project?.id || "workspace")}</select><button type="submit">Afficher les connexions</button></form><p class="muted">${state.project ? `Catalogue de ${esc(state.project.title)} : ${esc(state.project.path)}/.tricorder/plugins.json. Modifiez-le depuis le terminal, puis actualisez. Les déclarations restent distinctes des accès vérifiés.` : 'Choisissez le contexte global, la bibliothèque ou un projet pour consulter et configurer ses plugins.'}</p><div class="grid connection-grid">${[...state.capabilities, ...(state.detectedPlugins || [])].map(c => `<article class="card"><div class="row between"><h2>${esc(c.title)}</h2><span class="pill ${c.usable ? 'accepted' : ''}">${c.usable ? 'Utilisable' : 'À configurer'}</span></div><p>${esc(c.reason)}</p>${c.plugin_id && c.transport ? button('verify-plugin', 'Vérifier l’adaptateur…', '', `data-id="${esc(c.plugin_id)}"`) : ''}<div class="connection-states">${[['Disponible', c.available], ['Installé', c.installed], ['Connecté', c.connected], ['Qualifié', c.qualified]].map(([label, yes]) => `<span class="pill">${yes === null ? '?' : yes ? '✓' : '○'} ${label}</span>`).join('')}</div></article>`).join('')}</div>${(state.setup || []).filter(s => s.status === 'customized' || s.status === 'unavailable').map(s => `<div class="notice">${esc(s.instructions || s.project)} : ${s.status === 'customized' ? 'consignes personnalisées conservées. Mise à jour Tricorder à valider dans le modèle de consignes livré avec l’application.' : esc(s.reason)}</div>`).join('')}<p class="muted" style="margin-top:24px">Aucun secret n'est lu ou affiché dans cette page. Les comptes et la connexion OAuth restent chez les fournisseurs.</p></section>`);
}

function renderEditor() {
  const graph = currentGraph();
  if (!graph) return;
  const running = state.mode === 'run' && state.run;
  const scroll = document.querySelector('.canvas-scroll');
  const position = scroll ? [scroll.scrollLeft, scroll.scrollTop] : [0, 0];
  content(`<div class="workflow-heading"><div><div class="eyebrow">${esc(state.project.title)} / Workflow</div><h1>${esc(graph.title)}</h1><p>${running ? `Version figée · ${esc(runLabel(state.run))} · ${new Date(state.run.created * 1000).toLocaleString('fr-CH')}` : `Révision ${state.savedRevision || 'initiale'} · ${state.dirty ? 'Modifications non enregistrées' : 'Enregistré'}`}</p></div><div class="row">${!running ? button('export-workflow', 'Exporter…') + button('save', 'Enregistrer', '', state.dirty ? '' : 'disabled') + button('start-preview', 'Exécuter…', 'primary') : button('back-design', 'Revenir à l’éditeur') + (['active', 'paused'].includes(state.run.status) ? button('pause', state.run.status === 'paused' ? 'Reprendre' : 'Suspendre') : '')}</div></div>
    <div class="tabs" role="tablist" aria-label="Vues du workflow">${[['design', 'Éditeur'], ['run', 'Exécution'], ['history', 'Historique'], ['document', 'Documentation']].map(([mode, label]) => `<button role="tab" aria-selected="${state.mode === mode}" class="${state.mode === mode ? 'active' : ''}" data-action="mode" data-mode="${mode}" ${['run', 'document'].includes(mode) && !state.run ? 'disabled' : ''}>${label}</button>`).join('')}</div>
    ${state.mode === 'history' ? `<section class="page"><h2>Exécutions du workflow</h2>${runTable(state.runs.filter(r => r.original.id === state.graph.id))}</section>` : state.mode === 'document' ? '<section class="page"><div class="row between"><h2>Documentation de l’exécution</h2><button data-action="export-release">Exporter dans release/</button></div><article class="document" id="document-view">Chargement…</article></section>' : `
    ${running ? `<div class="banner ${state.run.simulation ? 'amber' : ''}" id="run-banner">${state.run.simulation ? '<strong>Simulation.</strong> Aucun modèle ni service métier appelé. ' : '<strong>Exécution réelle.</strong> '}${Object.values(state.run.nodes).filter(n => n.status === 'waiting').length} décision(s) attendue(s) · un résultat remis reste à valider.</div>` : ''}
    <div class="toolbar">${!running ? button('add-node', '+ Ajouter une étape') + button('connect', 'Relier') + '<span class="separator"></span>' + button('undo', '↶', '', `aria-label="Annuler la modification" ${state.history.past.length ? '' : 'disabled'}`) + button('redo', '↷', '', `aria-label="Rétablir la modification" ${state.history.future.length ? '' : 'disabled'}`) : ''}<span class="fill"></span>${!running ? button('assistant', '✦ Assistant IA') : button('timeline', 'Journal d’exécution')}${button('view', state.view === 'canvas' ? '☷ Liste' : '⑂ Canevas', '', 'aria-label="Changer la vue canevas ou liste"')}</div>
    <div class="editor"><div class="canvas-area">${state.view === 'canvas' ? '<div class="canvas-scroll" tabindex="0" aria-label="Canevas du workflow"><div class="canvas-size"><div class="canvas"><svg aria-hidden="true"></svg><div id="nodes"></div></div></div></div>' : '<div class="table-wrap" id="node-list"></div>'}<div class="canvas-footer"><span>${graph.nodes.length} étapes · ${graph.edges.length} connexions</span><div class="row">${button('zoom-out', '−', 'flat', 'aria-label="Réduire le canevas"')}<span id="zoom-label">${Math.round(state.zoom * 100)} %</span>${button('zoom-in', '+', 'flat', 'aria-label="Agrandir le canevas"')}${button('fit', 'Ajuster', 'flat')}</div></div></div><aside class="inspector" aria-label="Inspecteur du bloc" id="inspector"></aside></div>`}`);
  if (['design', 'run'].includes(state.mode)) { document.querySelector('.toolbar .fill').insertAdjacentHTML('beforebegin', button('phases', 'Phases') + (state.mode === 'run' && state.project.scope === 'workspace' ? button('handoff', 'Transférer vers un projet…') : '') + button('terminal', '›_ Terminal', '', 'aria-label="Ouvrir le terminal du workflow"') + (state.mode === 'design' ? button('reload-file', 'Recharger et valider') + button('schedule', 'Planifier') : '')); renderGraph(); renderInspector(); const nextScroll = document.querySelector('.canvas-scroll'); if (nextScroll) { nextScroll.scrollLeft = position[0]; nextScroll.scrollTop = position[1]; } }
  if (state.mode === 'document') safe(loadDocument);
}

function renderGraph() {
  updateRunBanner();
  const running = state.mode === 'run';
  const graph = document.querySelector('#node-list') ? currentGraph() : displayGraph(currentGraph(), state.collapsed, running ? state.run : null);
  const list = document.querySelector('#node-list');
  if (list) {
    list.innerHTML = `<table><thead><tr><th>Étape</th><th>Type</th><th>Phase</th><th>État</th><th></th></tr></thead><tbody>${graph.nodes.map(n => `<tr><td>${esc(n.title)}</td><td>${kinds[n.kind]}</td><td>${esc(n.phase || '—')}</td><td>${badge(running ? state.run.nodes[n.id]?.status || 'pending' : 'pending')}</td><td>${button('select-node', 'Ouvrir', '', `data-id="${n.id}"`)}</td></tr>`).join('')}</tbody></table>`;
    return;
  }
  const canvas = document.querySelector('.canvas'); if (!canvas) return;
  const width = Math.max(900, ...graph.nodes.map((n, i) => nodePosition(n, i).x + 320));
  const height = Math.max(500, ...graph.nodes.map((n, i) => nodePosition(n, i).y + 220));
  canvas.style.width = width + 'px'; canvas.style.height = height + 'px'; canvas.style.transform = `scale(${state.zoom})`;
  document.querySelector('.canvas-size').style.width = width * state.zoom + 'px'; document.querySelector('.canvas-size').style.height = height * state.zoom + 'px';
  const svg = canvas.querySelector('svg'); svg.setAttribute('width', width); svg.setAttribute('height', height);
  svg.innerHTML = graph.edges.map(e => {
    const a = graph.nodes.findIndex(n => n.id === e.from), b = graph.nodes.findIndex(n => n.id === e.to); if (a < 0 || b < 0) return '';
    const p = nodePosition(graph.nodes[a], a), q = nodePosition(graph.nodes[b], b), x = p.x + 240, y = p.y + 58, endX = q.x, endY = q.y + 58;
    const source = state.run?.nodes[e.originalFrom || e.from];
    return `<path data-edge="${e.id}" class="edge ${running && source?.status === 'accepted' && source.outcome === (e.outcome || 'done') ? 'active' : ''}" d="${orthogonalPath(x, y, endX, endY)}"/><text x="${(x + endX) / 2}" y="${(y + endY) / 2 - 9}" fill="var(--muted)" font-size="11">${esc(e.outcome && e.outcome !== 'done' ? e.outcome : '')}</text>`;
  }).join('');
  const nodeContainer = document.querySelector('#nodes');
  nodeContainer.innerHTML = graph.nodes.map((n, i) => {
    const p = nodePosition(n, i), status = n.kind === 'group' ? n.status : running ? state.run.nodes[n.id]?.status || 'pending' : 'pending';
    if (n.kind === 'group') return `<button class="node" data-action="expand-phase" data-phase="${esc(n.phase)}" data-group="${esc(n.phase)}" data-status="${status}" style="left:${p.x}px;top:${p.y}px" aria-label="Déplier la phase ${esc(n.title)}"><span class="node-main"><span class="icon">⊞</span><span><span class="mission">${esc(n.title)}</span><span class="kind">${n.members.length} étapes · déplier</span></span></span><span class="node-footer">${badge(status)}</span></button>`;
    return `<button class="node ${state.selected === n.id ? 'selected' : ''}" data-action="select-node" data-id="${n.id}" data-status="${status}" style="left:${p.x}px;top:${p.y}px" aria-label="${esc(n.title)} · ${running ? states[status] : kinds[n.kind]}"><span class="port in" aria-hidden="true"></span><span class="port out" aria-hidden="true"></span>${!running ? '<span class="drag-handle" aria-hidden="true">⋮⋮ Déplacer</span>' : ''}<span class="node-main"><span class="icon" aria-hidden="true">${symbols[n.kind]}</span><span><span class="mission">${esc(n.title)}</span><span class="kind">${esc(n.phase || kinds[n.kind])}</span></span></span><span class="node-footer">${running ? badge(status) : `<span>${esc(kinds[n.kind])}</span>`}<span>${n.kind === 'agent' ? esc(n.model || 'Modèle à définir') : n.kind === 'decision' ? 'Vous' : ''}</span></span></button>`;
  }).join('');
}

function renderInspector() {
  const target = document.querySelector('#inspector'); if (!target) return;
  const graph = currentGraph(); const node = graph.nodes.find(n => n.id === state.selected);
  if (!node) { target.innerHTML = `<div class="empty-inspector"><div class="eyebrow">Inspecteur</div><div class="large-symbol">⑂</div><h2>Chaque étape a un rôle</h2><p>Sélectionnez un bloc pour voir sa mission, ses critères et son exécutant.</p><p>Vous pouvez aussi construire et parcourir votre workflow en vue liste, entièrement au clavier.</p>${state.mode === 'design' ? button('workflow-settings', 'Paramètres du workflow') : ''}</div>`; return; }
  target.innerHTML = `<div class="eyebrow">${esc(kinds[node.kind])}</div><h2>${esc(node.title)}</h2><small>${esc(node.id)}</small>${state.mode === 'run' ? runInspector(node) : designInspector(node)}`;
}

function designInspector(node) {
  const isAgent = node.kind === 'agent';
  const effective = isAgent ? effectiveExecution(state.project, state.graph, node) : null;
  return `<form id="node-form"><label for="node-title">Nom du bloc</label><input id="node-title" name="title" value="${esc(node.title)}" required><label for="node-phase">Phase</label><input id="node-phase" name="phase" value="${esc(node.phase || '')}" placeholder="Analyse, qualité…">
    ${node.kind === 'watch' ? `<label for="watch-connection">Messagerie</label><select name="connection" id="watch-connection">${options([['gmail', 'Gmail'], ['outlook', 'Outlook']], node.connection || 'gmail')}</select><label for="watch-account">Compte à surveiller (référence, sans secret)</label><input name="account" id="watch-account" value="${esc(node.account || '')}"><label for="watch-sender">Adresse exacte de l'expéditeur</label><input name="sender" id="watch-sender" type="email" value="${esc(node.sender || '')}" placeholder="contact@exemple.test"><p class="muted">Nouveaux messages seulement. Le nom d'affichage ne suffit pas à identifier un expéditeur.</p>` : ''}
    ${node.kind === 'communication' ? `<label for="communication-channel">Canal de communication</label><select name="channel" id="communication-channel">${options([['slack', 'Slack'], ['telegram', 'Telegram'], ['signal', 'Signal'], ['email', 'Email'], ...state.capabilities.filter(c => c.plugin_id).map(c => [c.plugin_id, c.title])], node.channel || 'slack')}</select><label for="communication-recipient">Canal ou destinataire exact</label><input name="recipient" id="communication-recipient" value="${esc(node.recipient || '')}" placeholder="Identifiant du destinataire"><label for="communication-template">Message à envoyer</label><textarea name="template" id="communication-template">${esc(node.template || 'Nouveau message de {sender} : {subject}')}</textarea><p class="muted">Le modèle IA est facultatif. Une notification déterministe n'en utilise pas. Le connecteur doit être configuré et vérifié avant activation.</p>` : ''}
    ${['task', 'agent', 'communication', 'watch', 'external', 'document'].includes(node.kind) ? `<label for="node-capabilities">Capacités de plugins (facultatives)</label><select id="node-capabilities" name="capabilities"><option value="">Aucune</option>${[...new Map([...state.capabilities.filter(c => c.plugin_id).flatMap(c => c.operations.map(op => [JSON.stringify({ plugin: c.plugin_id, operation: op }), `${c.title} · ${op}`])), ...(node.capabilities || []).map(b => [JSON.stringify(b), `${b.plugin} · ${b.operation}`])]).entries()].map(([value, title]) => `<option value="${esc(value)}" ${(node.capabilities || []).some(b => JSON.stringify(b) === value) ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select><small>Catalogue : .tricorder/plugins.json · aucune dépendance à un agent dédié.</small>${button('refresh-connections', 'Actualiser les capacités', 'flat')}<p class="muted">${state.capabilities.filter(c => c.plugin_id).map(c => esc(c.title) + ' : ' + esc(c.operations.join(', '))).join(' · ') || 'Aucun plugin déclaré dans ce dépôt.'}</p>` : ''}
    ${isAgent ? `<label for="node-execution-mode">Travail du modèle</label><select id="node-execution-mode" name="execution_mode">${options([["text", "Analyse ou rédaction"], ["edit", "Modification de code dans une copie isolée"]], node.execution_mode || "text")}</select><p class="muted">Les modifications sont présentées avant application au dépôt. Reliez la sortie candidate à un bloc Commande pour tester cette copie.</p><label for="node-profile">Agent dédié (facultatif)</label><select id="node-profile" name="profile">${options([['generalist', 'Aucun agent dédié'], ...(state.project.packs || []).flatMap(pack => pack.profiles.map(profile => [profile.id, profile.title]))], effective.profile.value)}</select><p class="muted">Sans agent dédié, le modèle suit directement la consigne du bloc. Un profil spécialisé ajoute les instructions du pack.</p><label for="node-provider">Fournisseur</label><select id="node-provider" name="provider">${options([['codex', 'Codex'], ['claude', 'Claude Code']], effective.provider.value)}</select><label for="node-model">Modèle IA</label><input id="node-model" name="model" value="${esc(effective.model.value)}" placeholder="Identifiant exact du modèle"><small>Valeur effective : ${esc(effective.model.value || 'non définie')} · ${effective.model.source}. Aucun repli automatique.</small><label for="node-prompt">Consigne</label><textarea id="node-prompt" name="prompt">${esc(node.prompt || '')}</textarea><details><summary>Effort et mode d'exécution</summary><label for="node-effort">Effort</label><select name="effort" id="node-effort">${options(['low', 'medium', 'high', 'xhigh'].map(v => [v, v]), effective.effort.value)}</select><label for="node-session">Session</label><select id="node-session" name="session">${options([['delegated', 'Session déléguée'], ['main', 'Session principale (à qualifier)']], effective.session.value)}</select><p class="muted">Le choix est enregistré. Le connecteur vérifiera les capacités réelles avant tout lancement.</p></details>` : ''}
    ${['decision', 'review'].includes(node.kind) ? `<label for="node-question">Question à poser</label><textarea id="node-question" name="question">${esc(node.question || '')}</textarea><label for="node-options">Issues (une par ligne)</label><textarea id="node-options" name="options">${esc((node.options || ['approve', 'reject']).join('\n'))}</textarea><p class="muted">Une attente humaine persiste après fermeture. Le silence n'autorise rien.</p>` : ''}
    ${node.kind === 'command' ? `<label for="node-argv">Commande et arguments (un par ligne)</label><textarea id="node-argv" name="argv" spellcheck="false">${esc((node.argv || []).join('\n'))}</textarea><label for="node-timeout">Délai maximal (secondes)</label><input type="number" min="1" max="3600" id="node-timeout" name="timeout" value="${node.timeout || 60}"><p class="muted">Sans shell ni réseau. Projet monté en lecture seule dans /project ; travail dans /work.</p>` : ''}
    ${node.kind === 'document' ? `<label for="node-content">Contenu du brouillon</label><textarea id="node-content" name="content">${esc(node.content || '')}</textarea><small>Préparation locale. La publication demande une opération et un accord distincts.</small>` : ''}
    ${node.kind === 'condition' ? `<label for="node-parameter">Paramètre</label><input id="node-parameter" name="parameter" value="${esc(node.parameter || '')}"><label for="node-options">Issues (une par ligne)</label><textarea id="node-options" name="options">${esc((node.options || ['yes', 'no']).join('\n'))}</textarea>` : ''}
    ${node.kind === 'subworkflow' ? `<label for="node-workflow">Composant de bibliothèque</label><select id="node-workflow" name="workflow">${options(state.templates.map(g => [g.id, g.title]), node.workflow)}</select>` : ''}
    ${['decision', 'external'].includes(node.kind) ? `<details><summary>Opération externe exacte</summary><label for="node-operation">Action, cible et candidat (objet JSON)</label><textarea id="node-operation" name="operation">${esc(JSON.stringify(node.operation || {}, null, 2))}</textarea>${node.kind === 'external' ? `<label for="node-approval">Identifiant du bloc Décision qui autorise l’opération</label><input id="node-approval" name="approval" value="${esc(node.approval || '')}">` : ''}<small>La décision et l’opération doivent décrire exactement la même action, cible et version.</small></details>` : ''}
    ${['command', 'document', 'watch', 'communication'].includes(node.kind) ? `<label for="node-validation">Validation du résultat</label><select id="node-validation" name="validation">${options([['human', 'Manuelle'], ['automatic', 'Automatique — contrôles techniques']], node.validation || 'human')}</select><p class="muted">La validation automatique vérifie succès, types et preuves. Elle exige une liste de critères métier vide. Ajoutez une Décision humaine pour confirmer une action.</p>` : ''}
    ${['command', 'document'].includes(node.kind) ? `<label><input type="checkbox" name="reuse" ${node.reuse ? 'checked' : ''}>Autoriser la réutilisation des preuves pendant 24 h</label><small>Uniquement si le bloc, ses dépendances et ses fichiers sont inchangés. Désactiver pour les contrôles dépendant de l’heure ou d’un état extérieur.</small>` : ''}
    <details><summary>Entrées et sorties</summary><label for="node-inputs">Entrées (nom : type, JSON)</label><textarea id="node-inputs" name="inputs">${esc(JSON.stringify(node.inputs || {}, null, 2))}</textarea><label for="node-outputs">Sorties (nom : type, JSON)</label><textarea id="node-outputs" name="outputs">${esc(JSON.stringify(node.outputs || {}, null, 2))}</textarea></details>${["communication", "external"].includes(node.kind) ? `<label for="node-reconciliation">Capacité de recherche d’accusé (lecture, facultative)</label><input id="node-reconciliation" name="reconciliation" value="${esc(node.reconciliation || "")}">` : ""}<label for="node-criteria">Critères d’acceptation (un par ligne)</label><textarea id="node-criteria" name="criteria">${esc((node.criteria || []).join('\n'))}</textarea><details><summary>Reprises, ressources et position</summary><label for="node-attempts">Tentatives maximales</label><input id="node-attempts" name="max_attempts" type="number" min="1" max="10" value="${node.max_attempts || 1}"><label for="node-resources">Ressources exclusives (une par ligne)</label><textarea name="resources" id="node-resources">${esc((node.resources || []).join('\n'))}</textarea><div class="row"><div class="fill"><label for="node-x">Position X</label><input type="number" min="0" max="20000" name="x" id="node-x" value="${nodePosition(node, state.graph.nodes.indexOf(node)).x}"></div><div class="fill"><label for="node-y">Position Y</label><input type="number" min="0" max="20000" name="y" id="node-y" value="${nodePosition(node, state.graph.nodes.indexOf(node)).y}"></div></div></details><div class="row" style="margin-top:22px"><button class="primary" type="submit">Appliquer au bloc</button></div></form>
    <details><summary>Connexions</summary>${state.graph.edges.filter(e => e.from === node.id || e.to === node.id).map(e => `<p class="muted">${esc(e.from)} → ${esc(e.to)} (${esc(e.outcome || 'done')}) ${button('delete-edge', 'Retirer', 'flat', `data-id="${e.id}"`)}</p>`).join('') || '<p class="muted">Aucune connexion.</p>'}</details><hr>${button('delete-node', 'Supprimer cette étape', 'danger')}`;
}

function runInspector(node) {
  const data = state.run.nodes[node.id]; if (!data) return '';
  let html = `<p>${badge(data.status)}</p>`;
  if (data.status === 'waiting') {
    html += `<div class="notice amber"><strong>Votre décision est attendue</strong><p>${esc(node.question || 'Examiner le résultat avant la suite.')}</p>${node.operation ? `<p>Action : <strong>${esc(node.operation.action)}</strong><br>Cible : <strong>${esc(node.operation.target)}</strong><br>Candidat : <code>${esc(node.operation.candidate)}</code></p><details open><summary>Contenu exact de l’opération</summary><pre>${esc(JSON.stringify(node.operation, null, 2))}</pre></details>` : ''}</div><form id="decision-form"><label for="decision-note">Commentaire (facultatif)</label><textarea id="decision-note" name="note"></textarea><div class="stack" style="margin-top:16px">${(node.options || ['approve', 'reject']).map(o => `<button type="submit" name="outcome" value="${esc(o)}" class="${o === 'approve' ? 'primary' : ''}">${o === 'approve' ? node.operation ? 'Autoriser cette opération' : 'Approuver la suite' : o === 'reject' ? 'Refuser la suite' : esc(o)}</button>`).join('')}</div></form><p class="muted">La réponse s'applique à cette proposition et à cette tentative uniquement.</p>`;
  }
  if (data.result) {
    html += `<p>${esc(data.result.summary)}</p>${data.result.preview ? `<pre>${esc(data.result.preview)}</pre>` : ''}${data.result.simulated ? '<p class="notice amber">Preuve simulée, sans valeur de test métier réel.</p>' : ''}`;
    if (data.result.effect_id) html += button('reconcile-effect', 'Rechercher l’accusé distant');
    if (data.result.outputs?.candidate && !data.result.simulated) html += button('preview-candidate', data.applied_candidate ? 'Voir le code appliqué' : 'Examiner les modifications');
    if (data.status === 'returned') html += `<form id="receipt-form"><h3>Examiner le résultat</h3>${(node.criteria || []).map((c, i) => `<label><input type="checkbox" name="criterion" value="${i}" required>${esc(c)}</label>`).join('')}<label for="receipt-note">Commentaire de validation</label><textarea id="receipt-note" name="note" ${node.criteria?.length ? 'required' : ''} placeholder="Ce que vous avez vérifié…"></textarea><div class="stack" style="margin-top:16px"><button type="submit" class="primary" ${data.result.ok ? '' : 'disabled'}>Valider le résultat</button>${node.kind !== 'external' && data.attempt < (node.max_attempts || 1) ? button('retry', 'Demander une reprise') : ''}</div></form>`;
    if (data.receipt) html += `<div class="notice"><strong>Résultat validé</strong><p>${esc(data.receipt.note || 'Validation enregistrée.')}</p></div>`;
  }
  if (data.status === 'running') html += `<p>Le travail a commencé. Une fin de processus ne vaut pas validation.</p><p class="muted">Dernier signal : ${new Date((data.heartbeat || data.started) * 1000).toLocaleTimeString('fr-CH')}. ${Date.now() / 1000 - (data.heartbeat || 0) > 10 ? 'Observation ancienne : activité actuelle inconnue.' : ''}</p>${button('reconcile', 'Rechercher un résultat enregistré')}`;
  if (data.validation_error) html += `<p class="notice">Validation automatique interrompue : ${esc(data.validation_error)}</p>`;
  if (data.reused_from) html += `<p class="notice">Preuves réutilisées depuis ${esc(data.reused_from.run)}. Aucun nouveau test exécuté pour ce bloc.</p>`;
  if (data.reason) html += `<p class="notice">${esc(data.reason)}</p>`;
  if (data.decision) html += `<p class="notice">Décision humaine : <strong>${esc(data.decision.outcome)}</strong>.</p>`;
  if (['ready', 'pending', 'skipped'].includes(data.status)) html += `<p class="muted">${data.status === 'ready' ? 'Le moteur lancera cette étape dès que ses ressources seront disponibles.' : data.status === 'skipped' ? 'Cette branche n’a pas été sélectionnée.' : 'Cette étape attend ses dépendances.'}</p>`;
  return html;
}

function modal(title, body, actions = '', wide = false) {
  closeModal(); state.modal = document.activeElement;
  const root = document.createElement('div'); root.className = 'modal'; root.innerHTML = `<section class="modal-card ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="row between"><h2 id="modal-title">${esc(title)}</h2>${button('close-modal', '×', 'flat', 'aria-label="Fermer la fenêtre"')}</div>${body}<div class="status-line"></div>${actions ? `<div class="modal-actions">${actions}</div>` : ''}</section>`;
  document.body.append(root); root.querySelector('input, textarea, select, button')?.focus();
}
function closeModal() { document.querySelector('.modal')?.remove(); if (state.modal?.isConnected) state.modal.focus(); state.modal = null; }
async function ensureProject() {
  if (state.project && !state.project.library) return;
  Object.assign(state, await call('workspace.get'));
}
async function openProject(id, render = true) {
  const data = await call('project.get', { project: id }); Object.assign(state, data); state.route = 'project';
  if (render) shell();
}
async function useTemplate(id) {
  await ensureProject(); const template = clone(state.templates.find(g => g.id === id));
  template.id += '-' + Date.now().toString(36); delete template.revision;
  const graph = await call('workflow.save', { project: state.project.id, graph: template }); state.workflows.push(graph); openWorkflow(graph);
}
function openWorkflow(graph) {
  Object.assign(state, { graph: clone(graph), savedRevision: graph.revision || 0, run: null, selected: null, mode: 'design', route: 'workflow', dirty: false, history: new History(), events: [], zoom: 0.8 }); shell();
}
async function save() {
  const saved = await call('workflow.save', { project: state.project.id, graph: state.graph, revision: state.savedRevision });
  state.workflows = await call('project.get', { project: state.project.id }).then(d => d.workflows);
  state.graph = saved; state.savedRevision = saved.revision; state.dirty = false;
  if (state.project.library) state.templates = (await call('bootstrap')).templates;
  if (state.route === 'workflow') renderEditor(); toast('Workflow enregistré. Les exécutions précédentes gardent leur version.');
}
async function openRun(id) {
  const data = await call('run.get', { run: id }); state.run = data.run; state.events = data.events;
  if (!state.graph || state.graph.id !== data.run.original.id) { state.graph = clone(data.run.original); state.savedRevision = state.graph.revision || 0; state.dirty = false; }
  state.mode = 'run'; state.route = 'workflow'; state.selected = null; shell();
}
async function loadDocument() {
  const text = await call('run.document', { run: state.run.id }); const target = document.querySelector('#document-view');
  if (target) { target.innerHTML = DOMPurify.sanitize(marked.parse(text)); target.querySelectorAll('a').forEach(a => { a.removeAttribute('href'); a.title = 'Lien disponible dans l’export de release.'; }); }
}

const actions = {
  async 'connection-terminal'() { if (!state.project) Object.assign(state, await call('workspace.get')); await terminal.open(state.project, null); },
  async 'reconcile-effect'() { state.run = await call('run.reconcile-effect', { run: state.run.id, node: state.selected }, true); renderInspector(); toast('Résultat distant retrouvé. Aucune opération répétée.'); },
  async 'preview-candidate'() {
    const candidate = await call('candidate.preview', { run: state.run.id, node: state.selected });
    state.pendingCandidate = { ...candidate, run: state.run.id, node: state.selected };
    const data = state.run.nodes[state.selected];
    modal('Modifications proposées', `<p>${candidate.changes.length} fichier(s) · application locale au dépôt ${esc(state.project.title)}.</p><p>Vérifiez les tests de cette copie avant application. Aucun commit ni publication.</p><pre>${esc(candidate.diff)}</pre>`, button('close-modal', 'Fermer') + (data.status === 'accepted' && !data.applied_candidate ? button('apply-candidate', 'Appliquer ces modifications au dépôt', 'primary') : '<p>Validez le résultat avant application.</p>'), true);
  },
  async 'apply-candidate'() {
    const c = state.pendingCandidate;
    state.run = await call('candidate.apply', { run: c.run, node: c.node, candidate: c.candidate }, true);
    closeModal(); renderInspector(); toast('Modifications appliquées au dépôt local. Aucun commit ni publication.');
  },
  async 'refresh-overview'() { Object.assign(state, await call('overview.get')); renderOverview(); },
  async 'activity-run'(el) { await openProject(el.dataset.project, false); await openRun(el.dataset.id); },
  async navigate(el) { if (state.dirty) { await save(); } if (el.dataset.route === 'global') { Object.assign(state, await call('workspace.get')); state.route = 'project'; } else { state.route = el.dataset.route; if (state.route === 'overview') Object.assign(state, await call('overview.get')); if (state.route === 'schedules') state.schedules = await call('schedule.list'); } shell(); },
  theme() { const dark = document.documentElement.dataset.theme === 'dark'; document.documentElement.dataset.theme = dark ? 'light' : 'dark'; localStorage.setItem('tricorder-theme', dark ? 'light' : 'dark'); },
  'new-project'() { modal('Créer un projet', '<form id="project-form"><label for="project-title">Nom du projet</label><input id="project-title" name="title" required placeholder="Mon projet"><label>Racine du dépôt Git local</label><div class="row"><input id="project-path" name="path" readonly required placeholder="Choisir un dépôt Git existant"><button type="button" data-action="choose-folder">Choisir…</button></div><p class="muted">Le dossier doit être la racine d’un dépôt Git. Aucun commit ni envoi distant n’est effectué.</p><div class="modal-actions"><button class="primary" type="submit">Créer le projet</button></div></form>'); },
  async 'choose-folder'() { const path = await api.folder(); if (path) document.querySelector('#project-path').value = path; },
  async 'try-example'() { const existing = state.projects.find(p => p.managed && p.title === 'Mon premier projet'); if (existing) await openProject(existing.id, false); else { state.project = await call('project.create', { title: 'Mon premier projet' }); state.projects.push(state.project); state.workflows = []; state.runs = []; } await useTemplate('first-workflow'); },
  'open-project': el => openProject(el.dataset.id),
  'open-workflow': el => openWorkflow(state.workflows.find(g => g.id === el.dataset.id)),
  'open-run': el => openRun(el.dataset.id),
  'library-project'() { state.route = 'library'; shell(); },
  'use-template': el => useTemplate(el.dataset.id),
  async 'blank-workflow'() { const graph = { schema: 1, id: 'workflow-' + Date.now().toString(36), title: 'Nouveau workflow', description: '', nodes: [{ id: 'start', kind: 'task', title: 'Première étape', position: { x: 60, y: 80 } }], edges: [] }; const saved = await call('workflow.save', { project: state.project.id, graph }); state.workflows.push(saved); openWorkflow(saved); actions['workflow-settings'](); },
  async updates() { state.update = await api.updates({ action: 'status' }); previewUpdate(); },
  async 'check-updates'() { state.update = await api.updates({ action: 'check' }); updateIndicator(); previewUpdate(); },
  async 'download-update'() { await api.updates({ action: 'download' }); toast('Téléchargement ouvert. Installez le paquet lorsque vous êtes prêt à quitter Tricorder.'); },
  async 'update-notes'() { await api.updates({ action: 'notes' }); },
  async 'import-workflow'() { if (state.dirty) await save(); const preview = await api.portable({ action: 'open' }); if (preview) previewImport(preview); },
  async 'export-workflow'() { const file = await api.portable({ action: 'save', graph: state.graph, project: state.project.id }); if (file) toast('Workflow exporté : ' + file); },
  async 'discover-plugins'() { state.detectedPlugins = await call('plugins.discover'); renderConnections(); toast(`${state.detectedPlugins.length} plugin(s) détecté(s) dans Codex. Accès aux outils à qualifier.`); },
  handoff() {
    modal('Transférer vers un projet Git', `<form id="handoff-form"><p>Créer un brouillon lié à cette exécution globale avec ses résultats validés. Vous pourrez l’adapter avant de le lancer.</p><label for="handoff-project">Projet</label><select name="project" id="handoff-project" required>${options(state.projects.map(p => [p.id, p.title]), state.projects[0]?.id)}</select><label for="handoff-template">Modèle du workflow à préparer</label><select name="template" id="handoff-template">${options(state.templates.map(t => [t.id, t.title]), 'software-change')}</select><div class="modal-actions"><button type="submit" class="primary" ${state.projects.length ? '' : 'disabled'}>Créer le brouillon dans le projet</button></div></form>`);
  },
  async 'verify-plugin'(el) {
    state.pendingTransport = await call('plugins.preview', { project: state.project.id, plugin: el.dataset.id });
    modal('Vérifier un adaptateur local', `<p>Cette commande sera exécutée avec vos droits utilisateur. Utilisez un adaptateur de confiance ; ses comptes restent gérés par son propre outil.</p><pre>${esc(JSON.stringify(state.pendingTransport.config, null, 2))}</pre><p>Le contrôle demande le protocole, les opérations disponibles et l’état de connexion. Pour MCP, il exécute aussi la sonde d’identité affichée ; vérifiez qu’il s’agit bien d’une lecture. Aucun workflow n’est activé.</p>`, button('close-modal', 'Annuler') + button('qualify-plugin', 'Exécuter le contrôle', 'primary'));
  },
  async 'qualify-plugin'() {
    await call('plugins.qualify', { project: state.project.id, plugin: state.pendingTransport.plugin, digest: state.pendingTransport.digest }, true);
    closeModal(); await actions['refresh-connections'](); toast('Adaptateur vérifié. Examinez les destinataires et opérations avant activation.');
  },
  async 'refresh-connections'() { const data = await call('bootstrap', { project: state.project?.id }); state.capabilities = data.capabilities; state.setup = data.setup; if (state.route === 'connections') renderConnections(); else renderInspector(); toast('Catalogue actualisé.'); },
  save,
  async 'import-pack'() { const path = await api.folder(); if (!path) return; const pack = await call('pack.preview', { path }); state.pendingPack = { path, pack }; modal('Examiner le pack métier', `<p><strong>${esc(pack.title)}</strong> · ${esc(pack.version)} · ${esc(pack.status || 'non qualifié')}</p><p>${esc(pack.description)}</p><ul class="checklist">${pack.profiles.map(p => `<li>${esc(p.title)}</li>`).join('')}</ul><p>Le pack ajoute des profils et des règles au projet. L’import ne lance ni script ni workflow.</p><pre>${esc(JSON.stringify(pack.policies, null, 2))}</pre>`, button('close-modal', 'Annuler') + button('install-pack', 'Ajouter au projet', 'primary')); },
  async 'install-pack'() { state.project = await call('pack.install', { project: state.project.id, path: state.pendingPack.path, digest: state.pendingPack.pack.sha256 }); closeModal(); shell(); toast('Pack figé et ajouté au projet. Aucun outil métier lancé.'); },
  async 'new-template'() { state.project = await call('template.workspace'); const data = await call('project.get', { project: 'library' }); state.workflows = data.workflows; state.capabilities = data.capabilities; state.runs = []; await actions['blank-workflow'](); },
  async 'edit-template'(el) { const graph = clone(state.templates.find(g => g.id === el.dataset.id)); state.project = await call('template.workspace'); const data = await call('project.get', { project: 'library' }); state.workflows = data.workflows; state.runs = data.runs; state.capabilities = data.capabilities; if (!graph.revision) { graph.id = 'custom-' + graph.id + '-' + Date.now().toString(36); const saved = await call('workflow.save', { project: 'library', graph }); state.templates.push(saved); openWorkflow(saved); } else openWorkflow(graph); },
  async 'refresh-schedules'() { state.schedules = await call('schedule.list'); state.route = 'schedules'; shell(); },
  async 'toggle-schedule'(el) { const schedule = state.schedules.find(s => s.id === el.dataset.id); await call('schedule.toggle', { schedule: schedule.id, enabled: !schedule.enabled }); await actions['refresh-schedules'](); },
  async 'schedule-run'(el) { const schedule = state.schedules.find(s => s.id === el.dataset.id); await openProject(schedule.project, false); await openRun(schedule.last_run); },
  async schedule() {
    if (state.dirty) await save();
    const check = await call('workflow.validate', { project: state.project.id, graph: state.graph });
    const models = state.graph.nodes.filter(n => n.kind === 'agent').map(n => `${n.title} : ${n.provider || state.project.defaults.provider} / ${n.model || 'à définir'}`);
    modal('Vérifier puis activer une récurrence', `<form id="schedule-form"><p><strong>${esc(state.graph.title)}</strong> · révision ${state.savedRevision}</p><p>Modèles IA : ${models.length ? esc(models.join(' ; ')) : 'aucun'}. ${models.length ? 'Chaque occurrence réelle peut consommer votre abonnement.' : ''}</p>${activationDetails(check)}${check.issues.length ? `<div class="notice"><strong>Exécution réelle bloquée</strong><ul class="checklist">${check.issues.map(i => `<li>${esc(i.node)} : ${esc(i.message)}</li>`).join('')}</ul></div>` : ''}<label for="schedule-kind">Fréquence</label><select name="kind" id="schedule-kind"><option value="daily">Chaque jour</option><option value="weekly">Du lundi au vendredi</option><option value="interval">À intervalle régulier</option></select><div class="row"><div class="fill"><label for="schedule-time">Heure locale</label><input name="time" id="schedule-time" type="time" value="09:00"></div><div class="fill"><label for="schedule-minutes">Intervalle (minutes)</label><input name="minutes" id="schedule-minutes" type="number" min="5" max="525600" value="30"></div></div><label for="schedule-timezone">Fuseau horaire</label><input name="timezone" id="schedule-timezone" value="${esc(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Zurich')}"><label><input type="checkbox" name="simulation" checked>Simulation sans appel de modèle ni de service</label><label><input type="checkbox" required>J’active cette révision à cette fréquence. Les décisions humaines du workflow restent obligatoires.</label><p class="muted">Sans chevauchement. L’ordinateur et Tricorder doivent être ouverts. Une heure inexistante au changement d’heure est ignorée ; une heure répétée s’exécute une seule fois.</p><div class="modal-actions"><button type="submit" class="primary">Activer la récurrence</button></div></form>`, '', true);
  },
  async terminal() { if (!state.project) await ensureProject(); if (state.dirty) await save(); await terminal.open(state.project, state.graph); },
  async 'reload-file'() { if (state.dirty) throw new Error('Le canevas contient des changements non enregistrés. Enregistrez-les avant de recharger le fichier.'); const graph = await call('workflow.reload', { project: state.project.id, workflow: state.graph.id, revision: state.savedRevision }); state.graph = graph; state.savedRevision = graph.revision; state.history = new History(); renderEditor(); toast('Fichier validé et nouvelle révision chargée. Les exécutions existantes sont inchangées.'); },
  'select-node'(el) { state.selected = el.dataset.id; document.querySelectorAll('.node').forEach(n => n.classList.toggle('selected', n.dataset.id === state.selected)); renderInspector(); },
  'workflow-settings'() { modal('Paramètres du workflow', `<form id="workflow-form"><label for="workflow-title">Nom</label><input id="workflow-title" name="title" value="${esc(state.graph.title)}" required><label for="workflow-description">Intention</label><textarea id="workflow-description" name="description">${esc(state.graph.description || '')}</textarea><label for="workflow-parameters">Paramètres (objet JSON)</label><textarea id="workflow-parameters" name="parameters" spellcheck="false">${esc(JSON.stringify(state.graph.parameters || {}, null, 2))}</textarea><div class="modal-actions"><button class="primary" type="submit">Appliquer</button></div></form>`); },
  'add-node'() { modal('Ajouter une étape', `<form id="add-node-form"><label for="add-kind">Type d'étape</label><select id="add-kind" name="kind">${options(Object.entries(kinds).filter(([k]) => !['review'].includes(k)), 'agent')}</select><label for="add-title">Nom du bloc</label><input id="add-title" name="title" required placeholder="Quel résultat attendre ?"><div class="modal-actions"><button class="primary" type="submit">Ajouter au workflow</button></div></form>`); },
  connect() { modal('Relier deux étapes', `<form id="connect-form"><label for="edge-from">Depuis</label><select id="edge-from" name="from">${options(state.graph.nodes.map(n => [n.id, n.title]), state.selected || state.graph.nodes[0].id)}</select><label for="edge-outcome">Après l'issue</label><input id="edge-outcome" name="outcome" value="done" list="edge-outcomes"><datalist id="edge-outcomes"><option value="done"><option value="approve"><option value="reject"></datalist><small>Travail terminé : done. Décision humaine : approve ou reject.</small><label for="edge-to">Vers</label><select id="edge-to" name="to">${options(state.graph.nodes.map(n => [n.id, n.title]), state.graph.nodes[1]?.id)}</select><label for="edge-mapping">Données transmises (JSON : sortie → entrée)</label><textarea id="edge-mapping" name="mapping" spellcheck="false">{}</textarea><small>Exemple : {"candidate":"candidate"} pour tester une proposition de code.</small><div class="modal-actions"><button class="primary" type="submit">Créer la connexion</button></div></form>`); },
  'delete-edge'(el) { edit(g => { g.edges = g.edges.filter(e => e.id !== el.dataset.id); }); },
  'delete-node'() { if (state.graph.nodes.length === 1) return error('Conservez au moins une étape.'); edit(g => { g.nodes = g.nodes.filter(n => n.id !== state.selected); g.edges = g.edges.filter(e => e.from !== state.selected && e.to !== state.selected); state.selected = null; }); },
  undo() { state.graph = state.history.undo(state.graph); state.dirty = true; renderEditor(); },
  redo() { state.graph = state.history.redo(state.graph); state.dirty = true; renderEditor(); },
  view() { state.view = state.view === 'canvas' ? 'list' : 'canvas'; renderEditor(); },
  'zoom-in'() { state.zoom = Math.min(1.6, state.zoom + 0.1); renderGraph(); document.querySelector('#zoom-label').textContent = Math.round(state.zoom * 100) + ' %'; },
  'zoom-out'() { state.zoom = Math.max(0.4, state.zoom - 0.1); renderGraph(); document.querySelector('#zoom-label').textContent = Math.round(state.zoom * 100) + ' %'; },
  phases() {
    const phases = [...new Set(currentGraph().nodes.map(n => n.phase).filter(Boolean))];
    const intro = '<p>Replier une phase simplifie le dessin. Les décisions et blocages restent visibles.</p>';
    const rows = phases.map(phase => `<p>${button('toggle-phase', `${state.collapsed.has(phase) ? 'Déplier' : 'Replier'} · ${esc(phase)}`, '', `data-phase="${esc(phase)}"`)}</p>`).join('');
    modal('Organiser la vue par phases', phases.length ? intro + rows : '<p>Renseignez le champ Phase dans l’inspecteur des blocs pour les regrouper.</p>');
  },
  'toggle-phase'(el) { const phase = el.dataset.phase; if (state.collapsed.has(phase)) state.collapsed.delete(phase); else state.collapsed.add(phase); renderGraph(); actions.phases(); },
  'expand-phase'(el) { state.collapsed.delete(el.dataset.phase); renderGraph(); },
  fit() { const g = currentGraph(), width = Math.max(...g.nodes.map((n, i) => nodePosition(n, i).x + 320)); state.zoom = Math.max(0.4, Math.min(1, (document.querySelector('.canvas-area').clientWidth - 30) / width)); renderEditor(); },
  'back-design'() { state.mode = 'design'; state.selected = null; renderEditor(); },
  async mode(el) { state.mode = el.dataset.mode; state.selected = null; if (state.mode === 'history') { const data = await call('project.get', { project: state.project.id }); state.runs = data.runs; } renderEditor(); },
  async 'start-preview'() {
    if (state.dirty) await save();
    const validation = await call('workflow.validate', { project: state.project.id, graph: state.graph });
    state.reuseSource = state.runs.find(r => r.original.id === state.graph.id && !r.simulation)?.id;
    modal('Lancer cette version du workflow', `<p><strong>${esc(state.graph.title)}</strong> · révision ${state.savedRevision} · ${state.graph.nodes.length} étapes</p><p>Une exécution garde cette définition. Vous examinerez les résultats remis et répondrez aux décisions humaines.</p>${activationDetails(validation)}${state.reuseSource ? '<label><input type="checkbox" id="reuse-evidence">Réutiliser les preuves encore valides des blocs qui l’autorisent (exécution réelle)</label>' : ''}${validation.issues.length ? `<div class="notice"><strong>Prérequis pour une exécution réelle</strong><ul class="checklist">${validation.issues.map(i => `<li>${esc(i.node)} : ${esc(i.message)}</li>`).join('')}</ul></div>` : '<div class="notice">Les exécutants nécessaires sont disponibles sur ce poste.</div>'}<p class="muted">La simulation illustre le parcours sans appeler de modèle ni de service externe.</p>`, button('start-simulation', 'Simuler le parcours') + button('start-real', 'Lancer l’exécution réelle', 'primary', validation.issues.length ? 'disabled' : ''));
  },
  'start-simulation': () => launch(true),
  'start-real': () => launch(false),
  async pause() { state.run = await call('run.control', { run: state.run.id, control: state.run.status === 'paused' ? 'resume' : 'pause' }); renderEditor(); },
  async reconcile() { state.run = await call('run.reconcile', { run: state.run.id, node: state.selected }); renderInspector(); },
  retry() { modal('Demander une reprise', `<form id="retry-form"><p>Le résultat précédent reste dans l'historique. La limite de tentatives du bloc s'applique.</p><label for="retry-note">Correction attendue</label><textarea id="retry-note" name="note" required></textarea><div class="modal-actions"><button class="primary" type="submit">Relancer cette étape</button></div></form>`); },
  timeline() { modal('Journal d’exécution', `<ol class="timeline">${state.events.map(e => `<li><strong>${esc(states[e.type] || ({ started: 'Exécution commencée', decision: 'Décision humaine', completed: 'Exécution terminée', retry: 'Reprise demandée', pause: 'Exécution suspendue', resume: 'Exécution reprise' })[e.type] || e.type)}</strong>${e.node ? ` · ${esc(state.run.definition.nodes.find(n => n.id === e.node)?.title || e.node)}` : ''}<time>${new Date(e.at * 1000).toLocaleString('fr-CH')}</time>${esc(e.outcome || e.note || '')}</li>`).join('')}</ol>`, '', true); },
  'export-release'() { modal('Exporter une release lisible', `<form id="export-form"><p>Un README rassemble intention, plan, résultats, tests et décisions. Les données et preuves sont regroupées dans <code>.suivi/</code>.</p><label for="project-path">Dossier du projet</label><div class="row"><input id="project-path" name="path" value="${esc(state.project.path || '')}" readonly required><button type="button" data-action="choose-folder">Choisir…</button></div><label for="release-id">Identifiant de release</label><input id="release-id" name="release" value="release-${new Date().toISOString().slice(0, 10)}" required><div class="modal-actions"><button class="primary" type="submit">Exporter</button></div></form>`); },
  assistant() {
    modal('Assistant IA', `<div class="assistant-panel"><p>Décrivez le besoin. L’IA propose des blocs, des connecteurs et leurs paramètres ; vous examinez les changements avant application.</p><form id="assistant-form"><label for="assistant-request">Votre demande</label><textarea name="request" id="assistant-request" required placeholder="Si un message de NECA arrive, préviens-moi sur Slack…"></textarea><div class="row"><div class="fill"><label for="assistant-provider">Fournisseur</label><select name="provider" id="assistant-provider"><option value="codex">Codex</option><option value="claude">Claude Code</option></select></div><div class="fill"><label for="assistant-model">Modèle de l’assistant</label><input name="model" id="assistant-model" required placeholder="Identifiant du modèle"></div></div><p class="muted">Session limitée au texte, sans outils. Le contexte de conception sera transmis au fournisseur choisi. Cet appel peut consommer votre abonnement ; aucun workflow n'est activé.</p><div class="modal-actions"><button type="submit" class="primary">Demander une proposition IA</button></div></form><details style="margin-top:22px"><summary>Examiner une proposition structurée</summary><p class="muted">Un patch peut ajouter des étapes ou connexions. Il ne lance aucune exécution et ne retire pas vos critères ou autorisations.</p><form id="patch-form"><label for="patch-json">Proposition JSON</label><textarea id="patch-json" name="patch" spellcheck="false" placeholder='{"baseRevision": ${state.savedRevision}, "operations": []}'></textarea><div class="modal-actions"><button type="submit">Prévisualiser</button></div></form></details></div>`);
  },
  'apply-patch'() { const proposed = state.pendingPatch; edit(g => Object.assign(g, proposed)); delete state.pendingPatch; closeModal(); toast('Proposition appliquée au brouillon. Aucune exécution lancée.'); },
  'close-modal': closeModal,
};

async function launch(simulation) {
  const run = await call('run.start', { project: state.project.id, graph: state.graph, simulation, reuse_from: !simulation && document.querySelector('#reuse-evidence')?.checked ? state.reuseSource : null, authorize_notifications: document.querySelector('#authorize-notifications')?.checked === true }, true);
  state.run = run; state.runs.unshift(run); state.events = []; state.mode = 'run'; state.selected = run.definition.nodes[0].id; closeModal(); renderEditor();
}

document.addEventListener('click', event => {
  const el = event.target.closest('[data-action]'); if (!el) return;
  const action = actions[el.dataset.action]; if (!action) return;
  event.preventDefault(); if (el.dataset.pending) return; el.dataset.pending = '1';
  enqueue(async () => { try { await action(el); } finally { delete el.dataset.pending; } });
});
document.addEventListener('submit', event => {
  event.preventDefault(); const form = event.target; const data = Object.fromEntries(new FormData(form));
  enqueue(async () => {
    if (form.id === 'connection-context-form') { if (data.project === 'workspace') await call('workspace.get'); if (data.project === 'library') await call('template.workspace'); Object.assign(state, await call('project.get', { project: data.project })); renderConnections(); terminal.host.hidden = true; }
    if (form.id === 'handoff-form') { const graph = await call('run.handoff', { run: state.run.id, project: data.project, graph: state.templates.find(t => t.id === data.template) }, true); closeModal(); await openProject(data.project, false); openWorkflow(graph); toast('Brouillon créé avec sa source globale.'); }
    if (form.id === 'import-workflow-form') { const graph = await call('workflow.import-portable', { project: data.context, bundle: state.importBundle }); state.importBundle = null; closeModal(); await openProject(data.context, false); openWorkflow(graph); toast('Brouillon importé. Aucun workflow ni récurrence activé.'); }
    if (form.id === 'project-form') { const project = await call('project.create', data); state.projects.push(project); closeModal(); await openProject(project.id); }
    if (form.id === 'node-form') {
      const bindings = form.querySelector('#node-capabilities') ? new FormData(form).getAll('capabilities').filter(Boolean).map(v => JSON.parse(v)) : null;
      edit(g => {
        const n = g.nodes.find(n => n.id === state.selected);
        if (bindings) n.capabilities = bindings;
        if (['command', 'document'].includes(n.kind)) n.reuse = data.reuse === 'on';
        for (const [key, value] of Object.entries(data)) {
          if (['criteria', 'options', 'argv', 'resources'].includes(key)) n[key] = value.split('\n').map(s => s.trim()).filter(Boolean);
          else if (['inputs', 'outputs', 'operation'].includes(key)) n[key] = JSON.parse(value);
          else if (['max_attempts', 'timeout'].includes(key)) n[key] = Number(value);
          else if (['capabilities', 'reuse'].includes(key)) continue;
          else if (!['x', 'y'].includes(key)) n[key] = value;
        }
        if (n.operation && !Object.keys(n.operation).length) delete n.operation;
        if (n.execution_mode === 'edit') n.outputs = { ...(n.outputs || {}), candidate: 'object' };
        n.position = { x: Number(data.x), y: Number(data.y) };
      }); toast('Bloc modifié. Enregistrez le workflow pour créer une révision.');
    }
    if (form.id === 'workflow-form') { const parameters = JSON.parse(data.parameters); if (!parameters || Array.isArray(parameters) || typeof parameters !== 'object') throw new Error('Les paramètres doivent être un objet.'); edit(g => Object.assign(g, { title: data.title, description: data.description, parameters })); closeModal(); }
    if (form.id === 'add-node-form') {
      const id = 'step-' + Date.now().toString(36); edit(g => { const count = g.nodes.length; const n = { id, title: data.title, kind: data.kind, position: { x: 60 + count % 4 * 300, y: 80 + Math.floor(count / 4) * 190 }, criteria: [] }; if (data.kind === 'command') n.argv = ['python3', '-c', 'print("Hello")']; if (data.kind === 'condition') { n.parameter = 'choice'; n.options = ['yes', 'no']; } if (data.kind === 'subworkflow') n.workflow = 'analysis'; g.nodes.push(n); state.selected = id; }); closeModal();
    }
    if (form.id === 'connect-form') {
      const proposed = clone(state.graph); proposed.edges.push({ id: 'edge-' + Date.now().toString(36), ...data, mapping: JSON.parse(data.mapping) }); await call('workflow.validate', { graph: proposed, simulation: true }); edit(g => { g.edges = proposed.edges; }); closeModal();
    }
    if (form.id === 'decision-form') {
      const s = state.run.nodes[state.selected]; state.run = await call('run.decide', { run: state.run.id, node: state.selected, nonce: s.nonce, proposal: s.proposal, outcome: event.submitter.value, note: data.note }, true); renderGraph(); renderInspector(); toast('Décision enregistrée.');
    }
    if (form.id === 'receipt-form') { const node = state.run.definition.nodes.find(n => n.id === state.selected); state.run = await call('run.accept', { run: state.run.id, node: state.selected, checks: node.criteria || [], note: data.note }, true); renderGraph(); renderInspector(); toast('Validation enregistrée.'); }
    if (form.id === 'retry-form') { state.run = await call('run.retry', { run: state.run.id, node: state.selected, note: data.note }, true); closeModal(); renderGraph(); renderInspector(); }
    if (form.id === 'export-form') { const path = await call('release.export', { run: state.run.id, ...data }); closeModal(); toast('Release exportée : ' + path); }
    if (form.id === 'schedule-form') { await call('schedule.create', { project: state.project.id, graph: state.graph, simulation: data.simulation === 'on', authorize_notifications: data.authorize_notifications === 'on', rule: { kind: data.kind, time: data.time, minutes: Number(data.minutes), timezone: data.timezone, weekdays: [0, 1, 2, 3, 4] } }, true); closeModal(); await actions['refresh-schedules'](); toast('Récurrence activée. Elle apparaît aussi dans l’icône Ubuntu.'); }
    if (form.id === 'assistant-form') {
      const snapshot = JSON.stringify(state.graph);
      const run = await call('assistant.propose', { project: state.project.id, graph: state.graph, ...data });
      state.assistantRun = { id: run.id, snapshot, graph: state.graph.id };
      modal('Proposition en préparation', '<p id="assistant-progress">La session de conception travaille sur ce brouillon. Vous pouvez fermer cette fenêtre ; le résultat restera dans l’historique du projet.</p><p class="muted">Aucun workflow n’est activé par cette demande.</p>');
    }
    if (form.id === 'patch-form') {
      const patch = JSON.parse(data.patch); const proposed = applyPatch(state.graph, patch); await call('workflow.validate', { graph: proposed, simulation: true }); state.pendingPatch = proposed;
      modal('Examiner les changements proposés', `<ul class="checklist">${patchSummary(patch).map(line => `<li>${esc(line)}</li>`).join('')}</ul><div class="notice">Aucun lancement implicite. Vérifiez les exécutants et les coûts avant une future exécution.</div>`, button('close-modal', 'Conserver le brouillon actuel') + button('apply-patch', 'Appliquer au brouillon', 'primary'));
    }
  });
});

document.addEventListener('keydown', event => {
  const dialog = document.querySelector('.modal');
  if (dialog && event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
  if (dialog && event.key === 'Tab') {
    const focusable = [...dialog.querySelectorAll('button:not(:disabled),input,select,textarea,summary,[tabindex="0"]')].filter(el => el.getClientRects().length);
    if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0]?.focus(); }
    return;
  }
  if (event.target.matches('input,textarea,select') || dialog || state.route !== 'workflow' || state.mode !== 'design') return;
  if ((event.ctrlKey || event.metaKey) && ['s', 'z', 'y'].includes(event.key.toLowerCase())) { event.preventDefault(); safe(() => event.key.toLowerCase() === 's' ? save() : event.key.toLowerCase() === 'y' || event.shiftKey ? actions.redo() : actions.undo()); }
});

document.addEventListener('pointerdown', event => {
  const handle = event.target.closest('.drag-handle'); if (!handle || state.mode !== 'design') return;
  event.preventDefault(); const card = handle.closest('.node'); const node = state.graph.nodes.find(n => n.id === card.dataset.id); const before = clone(state.graph);
  const start = nodePosition(node, state.graph.nodes.indexOf(node)); const pointer = { x: event.clientX, y: event.clientY }; let moved = false;
  function move(e) { moved = true; node.position = { x: Math.max(0, Math.round(start.x + (e.clientX - pointer.x) / state.zoom)), y: Math.max(30, Math.round(start.y + (e.clientY - pointer.y) / state.zoom)) }; card.style.left = node.position.x + 'px'; card.style.top = node.position.y + 'px'; }
  function end() { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); if (moved) { state.history.push(before); state.dirty = true; renderEditor(); } }
  document.addEventListener('pointermove', move); document.addEventListener('pointerup', end, { once: true });
});

async function poll() {
  if (!state.run || state.polling || state.route !== 'workflow') return;
  state.polling = true;
  try {
    const id = state.run.id; const data = await call('run.get', { run: id, after: state.events.at(-1)?.seq || 0 });
    if (state.run?.id !== id) return;
    const previous = state.run; state.run = data.run; state.events.push(...data.events);
    if (state.mode === 'run') {
      for (const [nid, s] of Object.entries(state.run.nodes)) {
        const card = document.querySelector(`.node[data-id="${CSS.escape(nid)}"]`);
        if (card && previous.nodes[nid]?.status !== s.status) { card.dataset.status = s.status; card.querySelector('.node-footer .pill').outerHTML = badge(s.status); card.setAttribute('aria-label', `${state.run.definition.nodes.find(n => n.id === nid).title} · ${states[s.status]}`); }
      }
      for (const edge of state.run.definition.edges) {
        const source = state.run.nodes[edge.from];
        document.querySelector(`path[data-edge="${CSS.escape(edge.id)}"]`)?.classList.toggle('active', source.status === 'accepted' && source.outcome === (edge.outcome || 'done'));
      }
      for (const group of displayGraph(state.run.definition, state.collapsed, state.run).nodes.filter(n => n.kind === 'group')) {
        const card = document.querySelector(`[data-group="${CSS.escape(group.phase)}"]`);
        if (card) { card.dataset.status = group.status; card.querySelector('.pill').outerHTML = badge(group.status); }
      }
      if (state.selected && JSON.stringify(previous.nodes[state.selected]) !== JSON.stringify(state.run.nodes[state.selected]) && !document.querySelector('#inspector')?.contains(document.activeElement)) renderInspector();
      if (state.view === 'list' && !document.querySelector('#node-list')?.contains(document.activeElement)) renderGraph();
      updateRunBanner();
    }
  } catch (e) {
    const banner = document.querySelector('#run-banner'); if (banner) banner.textContent = 'Suivi temporairement indisponible. L’activité des outils est inconnue ; les données enregistrées sont conservées.';
  } finally { state.polling = false; }
}

document.documentElement.dataset.theme = localStorage.getItem('tricorder-theme') || 'light';
app.innerHTML = '<main class="page"><h1>Tricorder</h1><p>Ouverture de votre espace local…</p><div id="feedback"></div></main>';
safe(async () => { const data = await call('bootstrap'); Object.assign(state, data); shell(); const pending = await api.portable({ action: 'pending' }); if (pending) previewImport(pending); state.update = await api.updates({ action: 'status' }); updateIndicator(); });
setInterval(poll, 1000);
let overviewPolling = false;
let overviewNeedsRender = false;
setInterval(async () => {
  if (state.route !== 'overview' || overviewPolling || document.querySelector('.modal')) return;
  overviewPolling = true;
  try {
    const data = await call('overview.get');
    if (state.route !== 'overview') return;
    const changed = JSON.stringify(data.activity) !== JSON.stringify(state.activity) || JSON.stringify(data.schedules) !== JSON.stringify(state.schedules);
    Object.assign(state, data);
    overviewNeedsRender ||= changed;
    if (overviewNeedsRender && !document.querySelector('#content')?.contains(document.activeElement)) { renderOverview(); overviewNeedsRender = false; }
  } catch { /* Keep the last observed state; a manual refresh exposes errors. */ } finally { overviewPolling = false; }
}, 3000);
let assistantPolling = false;
setInterval(async () => {
  if (!state.assistantRun || assistantPolling) return;
  assistantPolling = true;
  try {
    const pending = state.assistantRun;
    const { run } = await call('run.get', { run: pending.id });
    const result = run.nodes.propose;
    if (result.status !== 'returned') return;
    state.assistantRun = null;
    if (!result.result.ok) throw new Error(result.result.summary);
    if (pending.snapshot !== JSON.stringify(state.graph)) throw new Error('Le brouillon a changé pendant la préparation. La proposition reste dans l’historique ; une nouvelle demande est nécessaire.');
    const patch = JSON.parse(result.result.outputs.patch);
    const proposed = applyPatch(state.graph, patch);
    await call('workflow.validate', { graph: proposed, simulation: true });
    state.pendingPatch = proposed;
    if (document.querySelector('#assistant-progress')) modal('Examiner la proposition IA', `<p>${esc(result.result.summary)}</p><ul class="checklist">${patchSummary(patch).map(line => `<li>${esc(line)}</li>`).join('')}</ul><p class="muted">Appliquer modifie le brouillon. L’activation reste une action distincte, après vérification des connexions et des modèles.</p>`, button('close-modal', 'Garder le brouillon actuel') + button('apply-patch', 'Appliquer au brouillon', 'primary'));
    else toast('Proposition IA prête dans l’historique du projet.');
  } catch (e) { error(e.message); }
  finally { assistantPolling = false; }
}, 1000);
api.onNavigate(destination => enqueue(async () => {
  if (state.dirty) await save();
  if (destination.route === 'import-workflow') { const pending = await api.portable({ action: 'pending' }); if (pending) previewImport(pending); return; }
  if (destination.route === 'global') { Object.assign(state, await call('workspace.get')); state.route = 'project'; shell(); return; }
  if (destination.route === 'run') { await openProject(destination.project, false); await openRun(destination.run); }
  else { state.route = destination.route; shell(); }
}));

function previewImport(preview) {
  state.importBundle = preview.bundle;
  const graph = preview.bundle.workflow, needs = preview.requirements;
  modal('Importer un workflow portable', `<p><strong>${esc(graph.title)}</strong> · ${graph.nodes.length} étapes · ${graph.edges.length} connexions</p><p>${esc(graph.description || '')}</p><p>Modèles : ${esc(needs.models.map(m => m.provider + ' / ' + m.model).join(', ') || 'aucun')}<br>Agents dédiés : ${esc(needs.profiles.join(', ') || 'aucun')}<br>Capacités : ${esc(needs.capabilities.map(c => c.plugin + ' / ' + c.operation).join(', ') || 'aucune déclarée')}</p><p class="muted">Les connexions devront être vérifiées sur cet ordinateur. L’import crée un brouillon sans reprendre les exécutions, les accords ou les récurrences du poste d’origine.</p><details><summary>Examiner les étapes et leur configuration</summary><pre>${esc(JSON.stringify(graph, null, 2))}</pre></details><form id="import-workflow-form"><label for="import-context">Destination</label><select id="import-context" name="context">${options([['workspace', 'Workflows globaux'], ['library', 'Bibliothèque de modèles'], ...state.projects.map(p => [p.id, p.title])], state.project?.id || 'workspace')}</select><div class="modal-actions"><button class="primary" type="submit">Importer le brouillon</button></div></form>`);
}

function updateIndicator() {
  const target = document.querySelector('#update-indicator');
  if (target) target.innerHTML = state.update?.status === 'available' ? button('updates', `Mise à jour ${esc(state.update.latest)}`, 'flat') : '';
}
function previewUpdate() {
  const update = state.update || {};
  modal('Mises à jour de Tricorder', `<p>Version installée : <strong>${esc(update.current || 'inconnue')}</strong></p><p>${update.status === 'available' ? `La release stable ${esc(update.latest)} est disponible.` : update.status === 'current' ? 'Aucune version stable plus récente détectée.' : esc(update.reason || 'Vérification disponible hors mode de test.')}</p><p class="muted">Tricorder vérifie GitHub à son lancement. Le téléchargement et l’installation restent explicites ; vos workflows ne sont pas redémarrés automatiquement.</p>${update.notes ? `<details><summary>Notes de la release</summary><pre>${esc(update.notes)}</pre></details>` : ''}`, button('check-updates', 'Vérifier maintenant') + (update.url ? button('update-notes', 'Ouvrir la release GitHub') : '') + (update.status === 'available' && update.download ? button('download-update', 'Télécharger le paquet Ubuntu', 'primary') : ''));
}

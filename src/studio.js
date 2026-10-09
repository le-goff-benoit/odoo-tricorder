import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { states, kinds, symbols, nodePosition, effectiveExecution, History, applyPatch, patchSummary, displayGraph, orthogonalPath, withWorkflowAI } from './studio-model.js';

export function mountStudio(host, integration) {
const root = host.attachShadow({ mode: 'open' });
root.innerHTML = '<link rel="stylesheet" href="tricorder://app/studio.css"><div id="studio-root"><div id="app"></div></div>';
const document = {
  querySelector: selector => root.querySelector(selector),
  querySelectorAll: selector => root.querySelectorAll(selector),
  createElement: tag => window.document.createElement(tag),
  addEventListener: (...args) => root.addEventListener(...args),
  removeEventListener: (...args) => root.removeEventListener(...args),
  get activeElement() { return root.activeElement; },
  get body() { return root.querySelector('#studio-root'); },
  documentElement: host,
};
const api = window.studio;
const terminal = { host: document.createElement('div'), detach() {}, mount() {},
  open: async (project, graph, conversation, resume=false) => { const result=await integration.openTerminal(project, graph, conversation, resume); if(conversation) {state.agentState=result?.agentState;renderConversation();}return result; } };

const app = document.querySelector('#app');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clone = value => structuredClone(value);
const options = (values, selected) => values.map(([value, label]) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
const state = { projects: [], templates: [], capabilities: [], route: 'overview', project: null, workflows: [], runs: [], graph: null, savedRevision: 0, run: null, events: [], selected: null, mode: 'design', view: 'canvas', zoom: 0.8, history: new History(), dirty: false, polling: false, modal: null, collapsed: new Set(), launchDrafts: {}, scheduleDrafts: {}, launchReturn: null };
let toastTimer;
let actionQueue = Promise.resolve();
let viewEpoch = 0;
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
function draftKey() { return `tricorder-draft:${state.project?.id}:${state.graph?.id}`; }
function persistDraft() { if (state.graph && state.dirty) localStorage.setItem(draftKey(), JSON.stringify({graph:state.graph, revision:state.savedRevision})); }
function edit(mutator) {
  const next = clone(state.graph); mutator(next); state.history.push(state.graph); state.graph = next; state.dirty = true; persistDraft(); renderEditor();
}
function badge(status) { return `<span class="pill ${esc(status)}">${esc(states[status] || status)}</span>`; }
function updateRunBanner() {
  const banner = document.querySelector('#run-banner');
  if (banner && state.run) banner.innerHTML = `${state.run.simulation ? '<strong>Simulation.</strong> Aucun modèle ni service métier appelé. ' : '<strong>Exécution réelle.</strong> '}${esc(runLabel(state.run))}. ${Object.values(state.run.nodes).filter(n => ['waiting', 'waiting_input', 'returned'].includes(n.status)).length} bloc(s) attendent votre intervention.`;
  const pause = document.querySelector('[data-action=pause]');
  if (pause && state.run && !['active','paused'].includes(state.run.status)) pause.remove();
  if(banner)delete banner.dataset.error;
  const heading = document.querySelector('.workflow-heading p');
  if (heading && state.mode === 'run') heading.textContent = `Version figée · ${runLabel(state.run)}${state.conversation ? '' : ' · '+new Date(state.run.created * 1000).toLocaleString('fr-CH')}`;
}
function selectedNode() { return state.graph?.nodes.find(n => n.id === state.selected); }
function currentGraph() { return ['run', 'document'].includes(state.mode) && state.run ? state.run.definition : state.graph; }
function activationDetails(check) {
  return `${check.automatic?.length ? `<p>Validation automatique : ${esc(check.automatic.join(', '))}. Succès, sorties et preuves contrôlés ; les décisions humaines restent obligatoires.</p>` : ''}${check.notifications?.length ? `<div class="notice"><strong>Notifications prévues</strong>${check.notifications.map(n => `<p>${esc(n.title)} → ${esc(n.recipient || 'destinataire à configurer')}<br>${esc(n.template)}</p>`).join('')}<label><input type="checkbox" name="authorize_notifications" id="authorize-notifications">J’autorise ces notifications pour cette révision et ces destinataires.</label></div>` : ''}`;
}
function button(action, text, css = '', extra = '') { return `<button class="${css}" data-action="${action}" ${extra}>${text}</button>`; }

function launchKey() { return `${state.project?.id}:${state.graph?.id}`; }
function rememberLaunchDraft() {
  const schedule = document.querySelector('#schedule-form');
  if (schedule) state.scheduleDrafts[launchKey()] = Object.fromEntries(['kind','time','minutes','timezone','simulation'].map(name => {
    const field = schedule.elements.namedItem(name); return [name, field.type === 'checkbox' ? field.checked : field.value];
  }));
  const input = document.querySelector('#initial-request');
  if (!input) return;
  state.launchDrafts[launchKey()] = { request: input.value, projects: [...document.querySelectorAll('[name="conversation-project"]:checked')].map(e => e.value) };
  // A draft is not permission to send a notification: authorizations are rechecked.
}
function launchReturnNotice() {
  const origin = state.launchReturn;
  return origin ? `<div class="notice launch-return"><span>${origin.kind === 'schedule' ? 'Planification' : 'Lancement'} en attente : <strong>${esc(origin.title)}</strong> · ${esc(origin.projectTitle)}. Votre demande est conservée.</span>${button('return-to-launch', origin.kind === 'schedule' ? 'Revenir à la planification' : 'Revenir au lancement')}</div>` : '';
}
const remedyLabels = {
  'workflow-settings': 'Ouvrir les paramètres', 'edit-node': 'Ouvrir l’étape',
  connections: 'Ouvrir les connexions', 'choose-ai': 'Choisir l’IA',
  'prepare-in-conversation': 'Préparer avec l’agent', 'choose-projects': 'Vérifier les projets',
  'choose-project': 'Utiliser dans un projet', 'save-workflow': 'Enregistrer et revérifier',
};
function launchDiagnostics(items, title, deferred = false) {
  if (!items?.length) return '';
  return `<section class="notice launch-check ${deferred ? 'launch-later' : ''}" aria-label="${esc(title)}"><h3>${esc(title)}</h3>${deferred ? '<p>Vous pouvez démarrer la conversation. Ces éléments seront nécessaires avant les étapes indiquées.</p>' : ''}<ul>${items.map(i => {
    const node = state.graph.nodes.find(n => n.id === i.node);
    const action = i.action || (node ? 'edit-node' : 'workflow-settings');
    const label = remedyLabels[action];
    return `<li data-diagnostic="${esc(i.code || '')}"><strong>${esc(i.project_title ? i.project_title + ' · ' : '')}${esc(i.title || node?.title || 'Workflow')}</strong><p>${esc(i.message)}</p>${i.remedy ? `<p class="muted">${esc(i.remedy)}</p>` : ''}${!deferred && label ? button('repair-launch', label, '', `data-code="${esc(i.code || '')}" data-remedy="${esc(action)}" data-node="${esc(i.node)}" data-project="${esc(i.project || state.project.id)}"`) : ''}</li>`;
  }).join('')}</ul></section>`;
}
function nativeLaunchPayload() {
  return { project: state.project.id, graph: state.graph, mode: 'native', provider: integration.provider(),
    model: state.graph.defaults?.provider === integration.provider() ? state.graph.defaults?.model : state.providerDefaults?.[integration.provider()],
    projects: state.launchDrafts[launchKey()]?.projects || [] };
}
async function refreshNativeLaunch() {
  rememberLaunchDraft();
  const area = document.querySelector('#launch-native-check'), start = document.querySelector('[data-action="start-conversation"]');
  if (!area || !start) return;
  const sequence = state.launchCheckSequence = (state.launchCheckSequence || 0) + 1;
  start.disabled = true; area.setAttribute('aria-busy', 'true');
  try {
    const check = await call('workflow.validate', nativeLaunchPayload());
    if (!area.isConnected || sequence !== state.launchCheckSequence) return;
    area.innerHTML = launchDiagnostics(check.issues, 'À résoudre avant le lancement') + launchDiagnostics(check.requirements, 'À préparer pendant le workflow', true);
    start.disabled = check.issues.length > 0;
  } catch (e) {
    if (area.isConnected && sequence === state.launchCheckSequence) area.innerHTML = `<div class="error" role="alert">La vérification n’a pas abouti. Votre demande est conservée.<p>${esc(e.message)}</p>${button('check-launch', 'Vérifier à nouveau')}</div>`;
  } finally { if (area.isConnected && sequence === state.launchCheckSequence) area.removeAttribute('aria-busy'); }
}

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
  const title = state.route === 'workflow' ? state.project.title : { overview: 'Tableau de bord', projects: 'Projets', project: state.project?.title, library: 'Modèles de workflows', connections: 'Connexions', schedules: 'Planifications' }[state.route];
  const activeRoute = ['workflow', 'project'].includes(state.route) ? (state.project?.library ? 'library' : state.project?.scope === 'workspace' ? 'global' : 'projects') : state.route;
  const navItem = (route, label, accessible = label) => `<button data-action="navigate" data-route="${route}" class="nav-item ${activeRoute === route ? 'active' : ''}" ${activeRoute === route ? 'aria-current="page"' : ''} aria-label="${accessible}" title="${label}">${navIcon(route)}<span class="nav-label">${label}</span></button>`;
  app.innerHTML = `<main class="workspace embedded-workspace"><div id="feedback"></div><div id="studio-content" style="display:contents"></div></main>`;
  integration.context({ projects: state.projects, project: state.project, graph: currentGraph(), run: state.run, route: state.route, activeRoute, title });
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

function content(html) { document.querySelector('#studio-content').innerHTML = html; }
function renderOverview() {
  const activity = state.activity || { runs: [], workflow_count: 0 };
  if (!state.projects.length && !activity.workflow_count && !activity.runs.length) { renderProjects(); return; }
  const active = activity.runs.filter(r => ['active', 'paused'].includes(r.status));
  const waiting = active.filter(r => Object.values(r.nodes).some(n => ['waiting', 'waiting_input', 'returned', 'blocked'].includes(n.status)));
  content(`<section class="page"><div class="page-heading"><div><h1>Tableau de bord</h1><p>Suivez vos workflows globaux et ceux de vos projets. Retrouvez les résultats, les décisions attendues et les prochaines exécutions.</p></div><div class="row">${state.workflows.length ? button('new-request','Nouvelle demande','primary') : ''}${button('new-work', '+ Créer un workflow')}${button('refresh-overview', 'Actualiser')}</div></div><div class="overview-stats"><article class="card"><strong>${active.length}</strong><span>Exécutions en cours</span></article><article class="card"><strong>${activity.counts ? ['waiting_input','waiting','returned','blocked'].reduce((n,k)=>n+(activity.counts[k] || 0),0) : waiting.length}</strong><span>Blocs à examiner</span></article><article class="card"><strong>${(state.schedules || []).filter(s => s.enabled).length}</strong><span>Planifications actives</span></article></div><div class="row between"><h2>${waiting.length ? 'À examiner' : 'Exécutions récentes'}</h2><span>${activity.total || 0} exécution(s)</span>${activity.offset ? button('overview-page','Précédentes','',`data-offset="${Math.max(0,activity.offset-25)}"`) : ''}${activity.next !== null && activity.next !== undefined ? button('overview-page','Suivantes','',`data-offset="${activity.next}"`) : ''}</div>${activityTable(activity.runs)}<div class="overview-links">${button('navigate', 'Ouvrir les workflows globaux', '', 'data-route="global"')}${button('navigate', 'Ouvrir les projets', '', 'data-route="projects"')}${button('navigate', 'Choisir un modèle', 'primary', 'data-route="library"')}</div></section>`);
}
function activityTable(runs) {
  if (!runs.length) return '<p class="muted">Aucune exécution. Choisissez un workflow global ou un projet pour commencer.</p>';
  return `<table><thead><tr><th>Workflow</th><th>Espace</th><th>Statut</th><th></th></tr></thead><tbody>${runs.map(r => `<tr><td>${esc((r.request || r.parameters?.request || r.definition.title).split('\n')[0])}<br><small>${esc(r.definition.title)} · ${r.simulation ? 'Simulation' : 'Exécution réelle'}</small></td><td>${esc(r.project_title)}</td><td>${esc(runLabel(r))}</td><td>${button('activity-run', 'Consulter', '', `data-project="${r.project}" data-id="${r.id}"`)}</td></tr>`).join('')}</tbody></table>`;
}
function renderProjects() {
  content(`<section class="page">${!state.projects.length ? `<div class="hero"><div><div class="eyebrow">De l'intention à la réalisation</div><h1>Un workflow clair.<br>Un travail que vous pouvez suivre.</h1><p class="muted" style="font-size:14px">Composez les étapes, choisissez qui intervient et gardez la main sur les décisions importantes.</p><div class="row">${state.workflows.length ? button('new-request','Nouvelle demande','primary') : ''}${button('new-work', '+ Créer un workflow')}${button('try-example', 'Essayer un exemple')}${button('new-project', 'Créer un projet')}${button('import-workflow', 'Importer un workflow')}</div><p class="muted" style="margin-bottom:0">L'exemple est simulé : aucun modèle payant, aucune publication.</p></div><div class="mini-flow" aria-hidden="true"><span>✦ Analyser</span>→<span class="human">? Décider</span>→<span>✓ Valider</span></div></div>` : ''}
    <div class="page-heading"><div><h2>Vos projets</h2>${button('toggle-archives',state.showArchives ? 'Masquer les archives' : 'Voir les archives','flat')}<p>Un projet est la racine d’un dépôt Git local. Il réunit ses workflows, ses exécutions et leurs résultats.</p></div>${state.projects.length ? `<div class="heading-actions">${button('new-project', '+ Nouveau projet', 'primary')}${button('import-workflow', 'Importer un workflow')}</div>` : ''}</div>
    ${state.projects.length ? `<div class="project-list">${state.projects.filter(p=>state.showArchives || !p.archived).map(p => `<button class="project-card" data-action="open-project" data-id="${p.id}"><div><h3>${esc(p.title)}</h3><small>${p.path ? esc(p.path) : 'Dépôt Git local · aucun pack métier requis'}</small></div><span aria-hidden="true">→</span></button>`).join('')}</div>` : '<div class="card"><h3>Votre premier projet commence ici</h3><p>Essayez le parcours guidé ou créez un projet pour adapter un modèle de la bibliothèque.</p></div>'}${state.projects.length ? `<div class="overview-links">${button('try-example', 'Essayer un exemple', 'flat')}</div>` : ''}</section>`);
}
function renderProject() {
  content(`<section class="page"><div class="page-heading"><div><div class="eyebrow">${state.project.scope === 'workspace' ? 'Espace transversal' : 'Projet Git'}</div><h1>${esc(state.project.title)}</h1><p>${state.project.scope === 'workspace' ? 'Automatisations indépendantes des projets : veille, messagerie, tickets et routines.' : esc(state.project.path)}</p></div><div class="row">${state.workflows.length ? button('new-request','Nouvelle demande','primary') : ''}${button('new-work', '+ Créer un workflow')}${button('library-project', 'Choisir un modèle')}${button('blank-workflow', '+ Workflow vide')}</div></div>
    ${state.repositoryProject === state.project.id && state.repositoryFiles?.some(f => f.status === 'new') ? `<div class="notice">Ce dépôt contient des workflows à reprendre. ${button('repository-workflows', 'Examiner les workflows du dépôt')}</div>` : ''}<div class="row between"><h2>${state.project.scope === 'workspace' ? 'Workflows globaux' : 'Workflows du projet'}</h2>${button('workflow-archives',state.showWorkflowArchives ? 'Masquer les archives' : 'Voir les archives','flat')}${state.workflow_page?.next !== null && state.workflow_page?.next !== undefined ? button('workflow-more','Workflows suivants','',`data-offset="${state.workflow_page.next}"`) : ''}${state.workflow_page?.offset ? button('workflow-more','Première page','', 'data-offset="0"') : ''}</div><div class="grid">${state.workflows.map(g => `<article class="card"><div class="card-icon">⑂</div><h3>${esc(g.title)}</h3><p>${g.node_count || g.nodes.length} bloc${(g.node_count || g.nodes.length) > 1 ? 's' : ''} · révision ${g.revision}</p><div class="row">${button('run-workflow', 'Exécuter…', 'primary', `data-id="${g.id}"`)}${button('open-workflow', 'Ouvrir le workflow', '', `data-id="${g.id}"`)}${button('archive-item',g.archived ? 'Restaurer' : 'Archiver','flat',`data-kind="workflow" data-id="${g.id}" data-archived="${!!g.archived}"`)}</div></article>`).join('') || '<p class="muted">Aucun workflow. Choisissez un modèle pour commencer.</p>'}</div>
    <h2 style="margin-top:34px">Exécutions récentes</h2>${runTools()}${runTable(state.runs)}</section>`);
  document.querySelector('.page-heading .row').insertAdjacentHTML('beforeend', button('repository-workflows', 'Workflows du dépôt') + button('import-pack', 'Ajouter un pack') + (state.project.scope !== 'workspace' && !state.project.library ? button('archive-item',state.project.archived ? 'Restaurer le projet' : 'Archiver le projet','flat',`data-kind="project" data-id="${state.project.id}" data-archived="${!!state.project.archived}"`) : ''));
  if (integration.hasLegacy?.(state.project.path)) document.querySelector('.page-heading .row').insertAdjacentHTML('beforeend', button('legacy-project', 'Releases et suivi Odoo'));
  if (state.conversations?.length) document.querySelector('#studio-content').insertAdjacentHTML('beforeend', `<section class="page"><h2>Conversations de workflow</h2>${state.conversations.map(c => `<p>${button('open-conversation', `${c.definition.title} · ${c.item_count ?? c.items?.length ?? 0} demande(s)`, '', `data-id="${esc(c.id)}"`)}</p>`).join('')}</section>`);
}
function runTools() { const p=state.run_page || {};return `<form id="run-filters" class="row run-filters"><label>Rechercher<input type="search" name="query" value="${esc(state.runFilters?.query || '')}" placeholder="Demande ou workflow"></label><label>État<select name="status">${options([['','Tous'],['active','En cours'],['paused','Suspendues'],['completed','Terminées'],['cancelled','Annulées']],state.runFilters?.status || '')}</select></label><label>Exécution<select name="simulation">${options([['','Réel et simulation'],['false','Réel'],['true','Simulation']],state.runFilters?.simulation ?? '')}</select></label><label><input type="checkbox" name="archived" ${state.runFilters?.archived ? 'checked' : ''}>Avec archives</label><button>Filtrer</button></form><div class="row"><span class="muted">${p.total ?? state.runs.length} exécution(s)</span>${p.offset ? button('run-page','Précédentes','',`data-offset="${Math.max(0,p.offset-25)}"`) : ''}${p.next !== null && p.next !== undefined ? button('run-page','Suivantes','',`data-offset="${p.next}"`) : ''}</div>`; }
async function loadRunPage(offset=0) { const f=state.runFilters || {}; const page=await call('run.list',{project:state.project.id,offset,...f,...(f.simulation === '' || f.simulation === undefined ? {simulation:null} : {simulation:f.simulation === 'true'}),workflow:state.mode === 'history' ? state.graph.id : null});state.runs=page.items;state.run_page=page; if(state.route==='project')renderProject();else renderEditor(); }
function runTable(runs) {
  if (!runs.length) return '<p class="muted">Aucune exécution lancée.</p>';
  return `<table><thead><tr><th>Workflow</th><th>Contexte</th><th>État</th><th></th></tr></thead><tbody>${runs.map(r => `<tr><td>${esc((r.request || r.parameters?.request || r.definition.title).split('\n')[0])}<br><small>${esc(r.definition.title)} · ${new Date(r.created * 1000).toLocaleString('fr-CH')}</small></td><td>${r.simulation ? 'Simulation' : 'Exécution réelle'}</td><td>${esc(runLabel(r))}</td><td>${button('open-run', 'Consulter', '', `data-id="${r.id}"`)}${!['active','paused'].includes(r.status) ? button('archive-item',r.archived ? 'Restaurer' : 'Archiver','flat',`data-kind="run" data-id="${r.id}" data-archived="${!!r.archived}"`) : ''}</td></tr>`).join('')}</tbody></table>`;
}
function runLabel(run) {
  if (run.status === 'active') {
    if (run.focus) return ({failed:'Échec · reprise nécessaire',blocked:'Bloquée',waiting_input:'Réponse attendue',waiting:'Décision attendue',returned:'Résultat à valider',running:'En cours',ready:'Prête'})[run.focus.status] || 'Attend une dépendance';
    const nodes=Object.values(run.nodes || {});
    if(nodes.some(n=>n.result?.ok===false || n.result?.outputs?.verdict==='fail'))return 'Échec · reprise nécessaire';
    for(const [status,label] of [['blocked','Bloquée'],['waiting_input','Réponse attendue'],['waiting','Décision attendue'],['returned','Résultat à valider'],['running','En cours'],['ready','Prête']])if(run.counts?.[status] || nodes.some(n=>n.status===status))return label;
    return 'Attend une dépendance';
  }
  if (run.status === 'completed' && run.completion_outcome === 'blocked') return 'Terminée · suite bloquée';
  if (run.status === 'completed' && run.completion_outcome === 'rejected') return 'Terminée · refusée';
  return ({paused:'Suspendue',completed:'Terminée',cancelled:'Annulée'})[run.status] || run.status;
}
function renderLibrary() {
  content(`<section class="page library-page"><div class="page-heading"><div><div class="eyebrow">Composer et réutiliser</div><h1>Modèles de workflows</h1><p>Choisissez un modèle, adaptez ses étapes, puis lancez votre conversation.</p></div><div class="heading-actions">${button('import-workflow', 'Importer un workflow')}${button('new-template', '+ Créer un modèle', 'primary')}${state.template_page?.next !== null && state.template_page?.next !== undefined ? button('template-page','Modèles suivants','',`data-offset="${state.template_page.next}"`) : ''}${state.template_page?.offset ? button('template-page','Première page','', 'data-offset="0"') : ''}</div></div>
    <div class="library-tools"><label class="sr-only" for="template-search">Rechercher un modèle</label><input type="search" id="template-search" placeholder="Rechercher un modèle…"><span class="muted">Destination : <strong>${state.project && !state.project.library ? esc(state.project.title) : 'Workflows globaux'}</strong></span></div>
    <div class="grid template-grid">${state.templates.map(g => `<article class="card template-card" data-template-search="${esc((g.title + ' ' + g.description).toLocaleLowerCase('fr'))}"><div class="row between"><span class="card-icon" aria-hidden="true">⑂</span><span class="pill">${g.node_count || g.nodes.length} bloc${(g.node_count || g.nodes.length) > 1 ? 's' : ''}</span></div><h3>${esc(g.title)}</h3><p>${esc(g.description)}</p><div class="card-actions">${button('use-template', 'Utiliser', 'primary', `data-id="${g.id}"`)}${button('edit-template', 'Modifier le modèle', '', `data-id="${g.id}"`)}</div></article>`).join('')}</div><p id="template-empty" class="notice" hidden>Aucun modèle ne correspond à cette recherche.</p></section>`);
  document.querySelector('#template-search').addEventListener('input', event => {
    const query = event.target.value.trim().toLocaleLowerCase('fr');
    let count = 0;
    document.querySelectorAll('[data-template-search]').forEach(card => { card.hidden = !card.dataset.templateSearch.includes(query); if (!card.hidden) count++; });
    document.querySelector('#template-empty').hidden = count > 0;
  });
}

function renderSchedules() {
  const schedules = (state.schedules || []).filter(s => state.showArchives || !s.archived);
  content(`<section class="page"><div class="page-heading"><div><div class="eyebrow">Automatisations locales</div><h1>Planifications</h1><p>Retrouvez vos prochaines exécutions ici et dans l’icône Tricorder de la barre Ubuntu.</p></div><div class="row">${button('toggle-archives',state.showArchives ? 'Masquer les archives' : 'Voir les archives')}${button('refresh-schedules', 'Actualiser')}</div></div><div class="notice">Tricorder doit rester ouvert, éventuellement dans la zone de notification. Après une interruption, une seule occurrence en retard est rattrapée. Une exécution encore ouverte empêche le chevauchement.</div><div class="grid" style="margin-top:24px">${schedules.map(s => `<article class="card"><div class="row between"><h3>${esc(s.title)}</h3><span class="pill">${s.enabled ? 'Active' : 'Suspendue'}</span></div><p>${s.scope?.kind === 'workspace' ? 'Global' : esc(state.projects.find(p => p.id === s.project)?.title || 'Projet')} · ${s.simulation ? 'Simulation' : 'Exécution réelle'} · ${esc(s.rule.timezone)}<br>Prochaine : ${new Date(s.next * 1000).toLocaleString('fr-CH', { timeZone: s.rule.timezone })}</p><p class="muted">${s.last_status === 'blocked' ? esc(s.error) : s.last_status === 'skipped-overlap' ? 'Dernière occurrence non lancée : une exécution précédente attend encore.' : 'La révision activée reste figée.'}</p><div class="row">${!s.archived ? button('toggle-schedule', s.enabled ? 'Suspendre' : 'Réactiver', '', `data-id="${s.id}"`) : ''}${button('archive-item',s.archived ? 'Restaurer' : 'Archiver','flat',`data-kind="schedule" data-id="${s.id}" data-archived="${!!s.archived}"`)}${s.last_run ? button('schedule-run', 'Dernière exécution', '', `data-id="${s.id}"`) : ''}</div></article>`).join('') || '<div class="card"><h3>Aucune planification active</h3><p>Ouvrez un workflow puis choisissez « Planifier » pour vérifier ses moyens et sa fréquence avant activation.</p></div>'}</div></section>`);
}
function renderConnections() {
  content(`<section class="page"><div class="page-heading"><div><div class="eyebrow">Outils et plugins</div><h1>Connexions</h1><p>La présence d'un outil ne prouve ni l'accès à un compte ni l'autorisation d'une opération. Les modèles peuvent analyser ou proposer du code dans une copie isolée. Les transports MCP stdio et les adaptateurs locaux vérifiés relient les outils aux blocs.</p></div><div class="row">${button('connection-terminal', 'Configurer dans le terminal')}${button('discover-plugins', 'Plugins OpenAI', '', 'data-provider="codex"') + button('discover-plugins', 'Plugins Anthropic', '', 'data-provider="claude"')}${button('refresh-connections', 'Actualiser')}</div></div>${launchReturnNotice()}<form id="connection-context-form" class="row"><label for="connection-context">Contexte</label><select id="connection-context" name="project" style="width:auto">${options([["workspace", "Workflows globaux"], ["library", "Modèles"], ...state.projects.map(p => [p.id, p.title])], state.project?.id || "workspace")}</select><button type="submit">Afficher les connexions</button></form><p class="muted">${state.project ? `Catalogue de ${esc(state.project.title)} : ${esc(state.project.path)}/.tricorder/plugins.json. Modifiez-le depuis le terminal, puis actualisez. Les déclarations restent distinctes des accès vérifiés.` : 'Choisissez le contexte global, la bibliothèque ou un projet pour consulter et configurer ses plugins.'}</p><div class="grid connection-grid">${[...state.capabilities, ...(state.detectedPlugins || [])].map(c => `<article class="card"><div class="row between"><h2>${esc(c.title)}</h2><span class="pill ${c.usable ? 'accepted' : ''}">${c.usable ? 'Utilisable' : 'À configurer'}</span></div><p>${esc(c.reason)}</p>${c.plugin_id && c.transport ? button('verify-plugin', 'Vérifier l’adaptateur…', '', `data-id="${esc(c.plugin_id)}"`) : ''}<div class="connection-states">${[['Disponible', c.available], ['Installé', c.installed], ['Connecté', c.connected], ['Vérifié', c.qualified]].map(([label, yes]) => `<span class="pill">${yes === null ? '?' : yes ? '✓' : '○'} ${label}</span>`).join('')}</div></article>`).join('')}</div>${(state.setup || []).filter(s => s.status === 'customized' || s.status === 'unavailable').map(s => `<div class="notice">${esc(s.instructions || s.project)} : ${s.status === 'customized' ? 'consignes personnalisées conservées. Mise à jour Tricorder à valider dans le modèle de consignes livré avec l’application.' : esc(s.reason)}</div>`).join('')}<p class="muted" style="margin-top:24px">Aucun secret n'est lu ou affiché dans cette page. Les comptes et la connexion OAuth restent chez les fournisseurs.</p></section>`);
}

function aiForm(preview = false) {
  const node = state.graph.nodes.find(n => n.kind === 'agent') || {};
  const current = effectiveExecution(state.project, state.graph, node);
  const provider = current.provider.value || 'codex';
  const model = current.model.value || state.providerDefaults?.[provider] || '';
  return `<form id="workflow-ai-form" class="ai-choice"><strong>IA pour les étapes de travail</strong><p>Un choix commun à toutes les étapes IA. Les profils d’agents sont conservés.</p><input type="hidden" name="preview" value="${preview ? 'yes' : 'no'}"><label for="workflow-provider">Fournisseur IA</label><select id="workflow-provider" name="provider">${options([['codex','OpenAI · Codex'],['claude','Anthropic · Claude']], provider)}</select><label for="workflow-model">Modèle</label><input id="workflow-model" name="model" value="${esc(model)}" required placeholder="Modèle configuré chez le fournisseur"><small>Le modèle proposé provient de votre configuration locale. La connexion sera vérifiée au lancement.</small><div class="modal-actions"><button type="submit">${preview ? 'Appliquer ce choix et vérifier' : 'Appliquer à toutes les étapes IA'}</button></div></form>`;
}

function renderEditor() {
  const graph = currentGraph();
  if (!graph) return;
  const running = ['run', 'document'].includes(state.mode) && state.run;
  const selectedRequest = running && state.conversation?.items.find(i=>i.run===state.run.id);
  const heading = selectedRequest ? selectedRequest.request.split('\n')[0] : graph.title;
  integration.context({ projects: state.projects, project: state.project, graph, run: state.run, route: state.route, mode: state.mode, activeRoute: state.project?.library ? 'library' : state.project?.scope === 'workspace' ? 'global' : 'projects', title: state.project.title });
  const scroll = document.querySelector('.canvas-scroll');
  const position = scroll ? [scroll.scrollLeft, scroll.scrollTop] : [0, 0];
  content(`<div class="workflow-heading ${running ? 'execution-heading' : ''}"><div><div class="eyebrow breadcrumb">${selectedRequest ? 'Workflow de la demande sélectionnée' : esc(state.project.title)+' / Workflow'}</div><h1 title="${esc(heading)}">${esc(heading)}</h1><p title="${esc(graph.title)}">${selectedRequest ? esc(graph.title.split('—')[0].trim())+' · ' : ''}${running ? `Version figée · ${esc(runLabel(state.run))}${selectedRequest ? '' : ' · '+new Date(state.run.created * 1000).toLocaleString('fr-CH')}` : `Révision ${state.savedRevision || 'initiale'} · ${state.dirty ? 'Modifications non enregistrées' : 'Enregistré'}`}</p></div><div class="row">${!running ? button('workflow-ai', 'Choisir l’IA') + button('export-workflow', 'Exporter…') + button('save', 'Enregistrer', '', state.dirty ? '' : 'disabled') + button('start-preview', 'Exécuter…', 'primary') : button('back-design', 'Revenir à l’éditeur') + (['active', 'paused'].includes(state.run.status) ? button('pause', state.run.status === 'paused' ? 'Reprendre' : 'Suspendre') + button('cancel', 'Annuler', 'flat') : '')}</div></div>
    ${launchReturnNotice()}<div class="tabs" role="tablist" aria-label="Vues du workflow">${[['design', 'Éditeur'], ['run', 'Exécution'], ['history', 'Historique'], ['document', 'Rapport']].map(([mode, label]) => `<button role="tab" aria-selected="${state.mode === mode}" class="${state.mode === mode ? 'active' : ''}" data-action="mode" data-mode="${mode}" ${['run', 'document'].includes(mode) && !state.run ? 'disabled' : ''}>${label}</button>`).join('')}</div>
    ${state.mode === 'history' ? `<section class="page"><h2>Exécutions du workflow</h2>${runTools()}${runTable(state.runs.filter(r => r.original.id === state.graph.id))}</section>` : state.mode === 'document' ? '<section class="page"><div class="row between"><h2>Rapport d’exécution</h2><div class="row"><button data-action="export-work">Exporter le rapport dans le projet</button><button data-action="export-release" class="flat">Export de release…</button></div></div><article class="document" id="document-view">Chargement…</article></section>' : `
    ${running && state.run.parameters?.source_run ? `<div class="notice">Notification liée à une question. ${button('notification-run', 'Revenir à l’exécution', '', `data-id="${esc(state.run.parameters.source_run)}"`)}</div>` : ''}${running ? `<div class="banner ${state.run.simulation ? 'amber' : ''}" id="run-banner">${state.run.simulation ? '<strong>Simulation.</strong> Aucun modèle ni service métier appelé. ' : '<strong>Exécution réelle.</strong> '}${Object.values(state.run.nodes).filter(n => n.status === 'waiting').length} décision(s) attendue(s) · un résultat remis reste à valider.</div>` : ''}
    <div class="toolbar">${!running ? button('add-node', '+ Ajouter un bloc') + button('connect', 'Relier') + button('workflow-settings', 'Paramètres du workflow') + '<span class="separator"></span>' + button('undo', '↶', '', `aria-label="Annuler la modification" ${state.history.past.length ? '' : 'disabled'}`) + button('redo', '↷', '', `aria-label="Rétablir la modification" ${state.history.future.length ? '' : 'disabled'}`) : ''}<span class="fill"></span>${!running ? button('assistant', '✦ Assistant IA') : button('review-layout', state.reviewFocus ? 'Graphe et détail' : 'Lire le résultat') + button('timeline', 'Journal d’exécution')}${button('view', state.view === 'canvas' ? '☷ Liste' : '⑂ Graphe', '', 'aria-label="Changer la vue graphe ou liste"')}</div>
    <div class="editor ${running && state.reviewFocus ? 'review-focus' : ''}"><div class="canvas-area">${state.view === 'canvas' ? '<div class="canvas-scroll" tabindex="0" aria-label="Graphe du workflow"><div class="canvas-size"><div class="canvas"><svg aria-hidden="true"></svg><div id="nodes"></div></div></div></div>' : '<div class="table-wrap" id="node-list"></div>'}<div class="canvas-footer"><span>${graph.nodes.length} bloc${graph.nodes.length > 1 ? 's' : ''} · ${graph.edges.length} lien${graph.edges.length > 1 ? 's' : ''}</span><div class="row">${button('zoom-out', '−', 'flat', 'aria-label="Réduire le graphe"')}<span id="zoom-label">${Math.round(state.zoom * 100)} %</span>${button('zoom-in', '+', 'flat', 'aria-label="Agrandir le graphe"')}${button('fit', 'Ajuster', 'flat')}</div></div></div><aside class="inspector" aria-label="Inspecteur du bloc" id="inspector"></aside></div>`}`);
  if (['design', 'run'].includes(state.mode)) { document.querySelector('.toolbar .fill').insertAdjacentHTML('beforebegin', (state.mode === 'run' && state.project.scope === 'workspace' ? button('handoff', 'Transférer vers un projet…') : '') + button('terminal', '›_ Terminal', '', 'aria-label="Ouvrir le terminal du workflow"') + (state.mode === 'design' ? '<details class="workflow-options"><summary>Options</summary><div>' + button('phases', 'Phases') + button('reload-file', 'Recharger et valider') + (localStorage.getItem(draftKey()+':previous') ? button('restore-previous-draft','Récupérer le brouillon précédent') : '') + button('schedule', 'Planifier') + '</div></details>' : button('phases', 'Phases'))); renderGraph(); renderInspector(); const nextScroll = document.querySelector('.canvas-scroll'); if (nextScroll) { nextScroll.scrollLeft = position[0]; nextScroll.scrollTop = position[1]; } }
  if (state.mode === 'document') safe(loadDocument);
  renderConversation();
  if(running){
    const controls=document.querySelector('.workflow-heading > .row');const menu=document.createElement('details');menu.className='compact-menu';menu.innerHTML='<summary>Workflow</summary><div></div>';while(controls.firstChild)menu.lastChild.append(controls.firstChild);controls.append(menu);
    const toolbar=document.querySelector('.toolbar');if(toolbar){const tools=document.createElement('details');tools.className='compact-menu';tools.innerHTML='<summary>Outils</summary><div></div>';for(const action of ['terminal','phases','timeline','view']){const button=toolbar.querySelector(`[data-action=${action}]`);if(button)tools.lastChild.append(button);}toolbar.append(tools);}
  }
}

function renderConversation() {
  document.querySelector('#conversation-tray')?.remove();
  if (!state.conversation) return;
  const c = state.conversation;
  const totals={};for(const item of c.items){const label=runLabel(item.execution || {status:'active'});totals[label]=(totals[label] || 0)+1;}
  const shortLabels={'Réponse attendue':'question','Décision attendue':'décision','Échec · reprise nécessaire':'échec','Résultat à valider':'à valider'};
  const summary=Object.entries(totals).map(([label,count])=>count+' '+(shortLabels[label] || label.toLocaleLowerCase('fr'))).join(' · ');
  const tray = document.createElement('section'); tray.id = 'conversation-tray'; tray.className = 'conversation-tray';
  tray.innerHTML = `<div class="row between"><strong>${c.item_count ?? c.items.length} demande(s)</strong>${state.agentState==='stopped' ? button('resume-agent','Reprendre l’agent…','', 'title="Agent arrêté, shell disponible"') : button('conversation-terminal', 'Retrouver la conversation')}<details class="compact-menu"><summary>Actions</summary><div>${button('conversation-terminal','Retrouver la conversation','flat')}${state.agentState==='stopped' ? '' : button('resume-agent','Reprendre l’agent…','flat')}${c.status === 'open' ? button('conversation-add', 'Ajouter une demande…') : '<span class="pill">Conversation archivée</span>'}${button('archive-conversation', c.archived ? 'Restaurer' : 'Clôturer et archiver', 'flat')}</div></details></div>
    <p class="conversation-summary">${c.total > c.items.length ? esc(c.items.length+' demandes affichées : ') : ''}${esc(summary)}</p>${conversationPager(c)}${c.items.length ? `<div class="work-items">${c.items.map(i => `<button data-action="conversation-item" data-id="${esc(i.run)}" aria-pressed="${state.run?.id === i.run}" class="${state.run?.id === i.run ? 'active' : ''}"><strong title="${esc(i.request.split('\n')[0])}">${esc(i.request.split('\n')[0])}</strong><small>${c.projects?.length>1 ? esc(state.projects.find(p=>p.id===i.project)?.title || i.project)+' · ' : ''}${i.execution?.coordination_wait ? 'Attend une autre tâche' : esc(runLabel(i.execution || {status:'active'}))}</small>${i.execution?.focus ? `<small class="next-action" title="${esc(i.execution.focus.title+' · '+i.execution.focus.action)}">${esc(i.execution.focus.status==='failed' ? i.execution.focus.action : i.execution.focus.title)}</small>` : ''}</button>`).join('')}</div>` : '<p>Le workflow est lancé. Décrivez votre demande dans le terminal ; chaque tâche apparaîtra ici.</p>'}`;
  if(state.compactHeight && c.items.length) {
    const details=document.createElement('details');details.className='request-selector';
    details.innerHTML=`<summary>${c.item_count ?? c.items.length} demandes · ${esc(summary)}</summary><div class="request-options"></div>`;
    for(const child of [...tray.children].slice(1))details.lastChild.append(child);
    details.querySelector('.conversation-summary')?.remove();
    details.open=!!state.compactRequestsOpen;
    details.addEventListener('toggle',()=>{state.compactRequestsOpen=details.open;});
    tray.prepend(details);
  }
  document.querySelector('.tabs')?.after(tray);
}
async function launchConversation() {
  rememberLaunchDraft();
  const request = document.querySelector('#initial-request')?.value.trim();
  state.conversation = await call('conversation.open', { ...nativeLaunchPayload(), request: request || null, authorize_notifications: document.querySelector('#authorize-notifications')?.checked === true }, true);
  state.mode = 'design'; state.run = null; closeModal(); delete state.launchDrafts[launchKey()]; state.launchReturn = null; renderEditor();
  await terminal.open(state.project, state.graph, state.conversation.id);
}

function portSummary(node) {
  const inputs = Object.keys(node.inputs || {}).length, outputs = Object.keys(node.outputs || {}).length;
  return `${inputs} entrée${inputs > 1 ? 's' : ''} → ${outputs} sortie${outputs > 1 ? 's' : ''}`;
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
    if (n.kind === 'group') return `<button class="node" data-action="expand-phase" data-phase="${esc(n.phase)}" data-group="${esc(n.phase)}" data-status="${status}" style="left:${p.x}px;top:${p.y}px" aria-label="Déplier la phase ${esc(n.title)}"><span class="node-main"><span class="icon">⊞</span><span><span class="mission" title="${esc(n.title)}">${esc(n.title)}</span><span class="kind">${n.members.length} étapes · déplier</span></span></span><span class="node-footer">${badge(status)}</span></button>`;
    return `<button class="node ${state.selected === n.id ? 'selected' : ''}" data-action="select-node" data-id="${n.id}" data-status="${status}" style="left:${p.x}px;top:${p.y}px" aria-label="${esc(n.title)} · ${running ? states[status] : kinds[n.kind]}"><span class="port in" aria-hidden="true"></span><span class="port out" aria-hidden="true"></span>${!running ? '<span class="drag-handle" aria-hidden="true">⋮⋮ Déplacer</span>' : ''}<span class="node-main"><span class="icon" aria-hidden="true">${symbols[n.kind]}</span><span><span class="mission" title="${esc(n.title)}">${esc(n.title)}</span><span class="kind">${esc(n.phase || kinds[n.kind])}</span></span></span><span class="node-footer">${running ? badge(status) : `<span>${esc(kinds[n.kind])}</span>`}<span title="${esc('Entrées : ' + (Object.keys(n.inputs || {}).join(', ') || 'aucune') + ' · Sorties : ' + (Object.keys(n.outputs || {}).join(', ') || 'aucune'))}">${n.kind === 'decision' ? 'Vous' : portSummary(n)}</span></span></button>`;
  }).join('');
}

function renderInspector() {
  const target = document.querySelector('#inspector'); if (!target) return;
  const graph = currentGraph(); const node = graph.nodes.find(n => n.id === state.selected);
  const opened = target.dataset.node === node?.id ? [...target.querySelectorAll('details[open] > summary')].map(s => s.textContent) : [];
  if (!node) { target.innerHTML = ''; return; }
  target.innerHTML = `${button('close-inspector', '×', 'flat inspector-close','aria-label="Fermer les propriétés"')}<div class="eyebrow">${esc(node.route_output ? 'Condition évaluée par un agent' : kinds[node.kind])}</div><h2>${esc(node.title)}</h2>${state.mode === 'run' && state.run ? runInspector(node) : designInspector(node)}`;
  target.dataset.node = node.id;
  const form = target.querySelector('#node-form'); if (form) {form.dataset.signature = formSignature(form);if(state.restoreForm?.node === node.id) {for(const [name,value] of Object.entries(state.restoreForm.values)) {const control=form.elements.namedItem(name);if(control){if(control.type==='checkbox')control.checked=value===true || value==='on';else control.value=value;}}state.restoreForm=null;}}
  for (const summary of target.querySelectorAll('details > summary')) if (opened.includes(summary.textContent)) summary.parentElement.open = true;
}

function formSignature(form) { return JSON.stringify([...new FormData(form)]); }
function formDraft(form) { const values=Object.fromEntries(new FormData(form));for(const field of form.querySelectorAll('input[type=checkbox][name]'))values[field.name]=field.checked;return values; }
function applyNodeForm(form, render = true) {
  if (!form.reportValidity()) throw new Error('Complétez les champs du bloc avant de continuer.');
  const data = Object.fromEntries(new FormData(form));
  const bindings = form.querySelector('#node-capabilities') ? new FormData(form).getAll('capabilities').filter(Boolean).map(v => JSON.parse(v)) : null;
  const g = clone(state.graph);

  const n = g.nodes.find(n => n.id === state.selected);
  if (bindings) n.capabilities = bindings;
  if (['command', 'document'].includes(n.kind)) n.reuse = data.reuse === 'on';
  for (const [key, value] of Object.entries(data)) {
    if (['criteria', 'options', 'argv', 'resources', 'required_capabilities'].includes(key)) n[key] = value.split('\n').map(s => s.trim()).filter(Boolean);
    else if (['inputs', 'outputs', 'operation', 'input_mapping', 'output_mapping'].includes(key)) n[key] = JSON.parse(value);
    else if (['max_attempts', 'timeout'].includes(key)) n[key] = Number(value);
    else if (['capabilities', 'reuse', 'link_operation', 'candidate_check'].includes(key) || key.startsWith('op_')) continue;
    else if (['environment', 'effort'].includes(key) && !value) delete n[key];
    else if (!['x', 'y'].includes(key)) n[key] = value;
  }
  if(form.elements.namedItem('candidate_check')) {
    n.candidate_check=data.candidate_check==='on';
    if(n.candidate_check) {
      n.inputs={...n.inputs,candidate:'object'};
      if(n.kind!=='command')n.outputs={...n.outputs,verdict:'string'};
    }
  }
  if (data.op_action || data.op_target || data.op_candidate) n.operation = { ...(n.operation || {}), action: operationValue(data.op_action), target: operationValue(data.op_target), candidate: operationValue(data.op_candidate) };
  if (data.link_operation === 'on' && n.approval && n.operation) {
    const gate = g.nodes.find(v => v.id === n.approval && v.kind === 'decision');
    if (!gate) throw new Error('Choisir une décision humaine');
    gate.operation = clone(n.operation); gate.inputs={...gate.inputs,...n.inputs}; gate.outputs={...gate.outputs,...n.inputs};
    if (!g.edges.some(e => e.from === gate.id && e.to === n.id && e.outcome === 'approve')) g.edges.push({id: 'approval-' + Date.now().toString(36), from: gate.id, to: n.id, outcome: 'approve',mapping:Object.fromEntries(Object.keys(n.inputs || {}).map(k=>[k,k]))});
  }
  if (n.route_output && !n.options) n.options = ['yes', 'no', 'unknown'];
  if (!n.route_output) delete n.route_output;
  if (n.operation && !Object.keys(n.operation).length) delete n.operation;
  if (n.execution_mode === 'edit') n.outputs = { ...(n.outputs || {}), candidate: 'object' };
  n.position = { x: Number(data.x), y: Number(data.y) };

  state.history.push(state.graph); state.graph = g; state.dirty = true;
  form.dataset.signature = formSignature(form);
  persistDraft();
  if (render) renderEditor();
}
function flushNodeForm() {
  const form = document.querySelector('#node-form');
  if (form && state.mode === 'design' && form.dataset.signature !== formSignature(form)) applyNodeForm(form, false);
}

function portEditor(node) {
  return `<fieldset class="ports"><legend>Entrées et sorties</legend>${[['inputs','Entrées'],['outputs','Sorties']].map(([direction,label]) => `<section class="port-section"><strong>${label}</strong><ul>${Object.entries(node[direction] || {}).map(([name,type]) => `<li><code>${esc(name)}</code> · ${esc(type)} ${button('remove-port', 'Retirer', 'flat', `data-direction="${direction}" data-port="${esc(name)}"`)}</li>`).join('') || '<li>Aucune donnée déclarée</li>'}</ul>${button('add-port', 'Ajouter une ' + (direction === 'inputs' ? 'entrée' : 'sortie'), 'flat', `data-direction="${direction}"`)}</section>`).join('')}</fieldset>`;
}
function refreshConnectionForm() {
  const form = document.querySelector('#connect-form'); if (!form) return;
  const source = state.graph.nodes.find(n => n.id === form.elements.from.value);
  const target = state.graph.nodes.find(n => n.id === form.elements.to.value);
  form.elements.outcome.innerHTML = options((source.options && (source.route_output || ['condition','decision','review'].includes(source.kind)) ? source.options : ['done']).map(v => [v, v === 'done' ? 'Travail terminé' : v]));
  form.elements.output.innerHTML = options([['','Aucune donnée supplémentaire'], ...Object.keys(source.outputs || {}).map(k => [k,k])]);
  form.elements.input.innerHTML = options([['','Choisir une entrée'], ...Object.keys(target.inputs || {}).map(k => [k,k])]);
  const mapping = Object.fromEntries(Object.entries(source.outputs || {}).filter(([key,type]) => target.inputs?.[key] === type).map(([key]) => [key,key]));
  form.elements.mapping.value = JSON.stringify(mapping);
  form.querySelector('.mapping-summary').textContent = Object.keys(mapping).length ? 'Données reliées par leur nom : ' + Object.keys(mapping).join(', ') : 'Choisissez les données à transmettre, ou reliez seulement les étapes.';
}

function operationField(value) {return value?.input ? "@"+value.input : value || "";}
function operationValue(value) {return value.startsWith("@") ? {input:value.slice(1)} : value;}
function contextOptions(values, current) {
  return options(values.some(([v]) => v === current) ? values : [...values, [current, 'Valeur actuelle : ' + current]], current);
}
function workflowExtraParameters() {
  const parameters = clone(state.graph.parameters || {});
  if (odooWorkflowFields()) for (const key of ['series','platform','route','environment','neutralized_copy']) delete parameters[key];
  return parameters;
}
function odooWorkflowFields() {
  const g = state.graph, p = g.parameters || {};
  const profiles = g.nodes.map(n => ({ ...state.project.defaults, ...g.defaults, ...n }).profile);
  const usesOdooPack = (state.project.packs || []).some(pack => pack.policies?.domain === 'odoo' && pack.profiles.some(profile => profiles.includes(profile.id)));
  if (g.domain !== 'odoo' && !usesOdooPack) return '';
  const field = (name, label, placeholder) => `<label for="context-${name}">${label}</label><input id="context-${name}" name="context_${name}" value="${esc(typeof p[name] === 'string' ? p[name] : p[name] == null ? '' : JSON.stringify(p[name]))}" placeholder="${placeholder}">`;
  return `<fieldset class="workflow-context"><legend>Contexte Odoo</legend>${field('series', 'Version d’Odoo', 'Exemple : 19.0')}${state.project.series ? `<small>Conversation : la version ${esc(state.project.series)} du projet est prioritaire. Ce réglage sert aussi au mode automatique.</small>` : ''}<label for="context-platform">Hébergement</label><select id="context-platform" name="context_platform">${contextOptions([['', 'À préciser'], ['custom', 'Odoo.sh ou serveur dédié'], ['odoo.sh', 'Odoo.sh'], ['online', 'Odoo Online'], ['on-premise', 'Serveur dédié']], p.platform || '')}</select>${state.project.platform ? `<small>Conversation : hébergement du projet ${esc(state.project.platform)}.</small>` : ''}<label for="context-route">Type de réalisation</label><select id="context-route" name="context_route">${contextOptions([['', 'À déterminer pendant l’analyse'], ['module', 'Module Odoo'], ['studio', 'Odoo Studio']], p.route || '')}</select><label for="context-environment">Environnement de recette</label><select id="context-environment" name="context_environment">${contextOptions([['', 'À préparer avec l’agent'], ['local', 'Copie locale neutralisée'], ['staging', 'Staging (non admis pour cette recette)'], ['production', 'Production (non admise pour les tests)']], p.environment || '')}</select>${field('neutralized_copy', 'Référence de la copie de test', 'Chemin ou identifiant de la copie préparée')}<small>Ces informations seront nécessaires avant la recette. La copie doit être réellement préparée et vérifiée ; remplir ces champs ne crée pas de base de test.</small></fieldset>`;
}
function designInspector(node) {
  const isAgent = node.kind === 'agent';
  const effective = isAgent ? effectiveExecution(state.project, state.graph, node) : null;
  const profiles = [['generalist', 'Aucun agent dédié'], ...(state.project.packs || []).flatMap(pack => pack.profiles.map(profile => [profile.id, profile.title || profile.id]))];
  if (effective && !profiles.some(([id]) => id === effective.profile.value)) profiles.push([effective.profile.value, effective.profile.value + ' (pack absent)']);
  return `<form id="node-form"><label for="node-title">Nom du bloc</label><input id="node-title" name="title" value="${esc(node.title)}" required>${isAgent ? `<label for="node-prompt">Consigne</label><textarea id="node-prompt" name="prompt">${esc(node.prompt || "")}</textarea>` : ""}<label for="node-criteria">Critères d’acceptation (un par ligne)</label><textarea id="node-criteria" name="criteria">${esc((node.criteria || []).join("\n"))}</textarea>${portEditor(node)}${['agent','task','command'].includes(node.kind) ? `<fieldset><legend>Validation du candidat</legend><label><input type="checkbox" name="candidate_check" ${node.candidate_check ? 'checked' : ''}>Contrôle QA du candidat</label><small>Ce bloc vérifie le candidat reçu. L’entrée candidate est ajoutée ; reliez-la au producteur. ${node.kind==='command' ? 'La commande doit réussir (code 0) avec une preuve.' : 'La sortie verdict est ajoutée : pass ou fail, avec preuves réelles.'} Un document ou un simple transfert ne valide pas le code.</small></fieldset>` : ''}${isAgent ? `<label for="node-route-output">Sortie de branchement (facultatif)</label><select id="node-route-output" name="route_output">${options([['', 'Aucun branchement conditionnel'], ...Object.entries(node.outputs || {}).filter(([,t]) => t === 'string').map(([k]) => [k,k])], node.route_output || '')}</select>${node.route_output ? `<label>Valeurs de branchement (une par ligne)<textarea name="options">${esc(node.options.join('\n'))}</textarea></label>` : ''}<label>Validation du résultat<select name="validation">${options([['contract','Valider automatiquement les sorties'],['human','Attendre ma validation']], node.validation || 'human')}</select></label>` : ''}<details><summary>Organisation de l’étape</summary><label for="node-completion">Effet du résultat sur les tâches dépendantes</label><select id="node-completion" name="completion_outcome">${options([['succeeded', 'Permettre la suite'], ['blocked', 'Bloquer la suite : travail non résolu']], node.completion_outcome || 'succeeded')}</select><label for="node-phase">Phase</label><input id="node-phase" name="phase" value="${esc(node.phase || '')}" placeholder="Analyse, qualité…"></details>
    ${(node.profile || state.graph.defaults?.profile || state.project.defaults?.profile) === 'odoo-tester' || Object.hasOwn(node, 'environment') ? `<label for="node-environment">Environnement de recette de cette étape</label><select id="node-environment" name="environment">${options([['', 'Utiliser le contexte du workflow'], ['local', 'Copie locale neutralisée'], ['staging', 'Staging (non admis pour cette recette)'], ['production', 'Production (non admise pour les tests)']], node.environment || '')}</select>` : ''}
    ${['task','document'].includes(node.kind) ? `<label for="node-effort">Effort IA de cette étape</label><select id="node-effort" name="effort">${options([['', 'Utiliser le niveau de la conversation'], ...['low','medium','high','xhigh'].map(v => [v,v])], node.effort || '')}</select>` : ''}
    ${node.kind === 'watch' ? `<label for="watch-connection">Messagerie</label><select name="connection" id="watch-connection">${options([['gmail', 'Gmail'], ['outlook', 'Outlook']], node.connection || 'gmail')}</select><label for="watch-account">Compte à surveiller (référence, sans secret)</label><input name="account" id="watch-account" value="${esc(node.account || '')}"><label for="watch-sender">Adresse exacte de l'expéditeur</label><input name="sender" id="watch-sender" type="email" value="${esc(node.sender || '')}" placeholder="contact@exemple.test"><p class="muted">Nouveaux messages seulement. Le nom d'affichage ne suffit pas à identifier un expéditeur.</p>` : ''}
    ${node.kind === 'communication' ? `<label for="communication-channel">Canal de communication</label><select name="channel" id="communication-channel">${options([['slack', 'Slack'], ['telegram', 'Telegram'], ['signal', 'Signal'], ['email', 'Email'], ...state.capabilities.filter(c => c.plugin_id).map(c => [c.plugin_id, c.title])], node.channel || 'slack')}</select><label for="communication-recipient">Canal ou destinataire exact</label><input name="recipient" id="communication-recipient" value="${esc(node.recipient || '')}" placeholder="Identifiant du destinataire"><label for="communication-template">Message à envoyer</label><textarea name="template" id="communication-template">${esc(node.template || 'Nouveau message de {sender} : {subject}')}</textarea><p class="muted">Le modèle IA est facultatif. Une notification déterministe n'en utilise pas. Le connecteur doit être configuré et vérifié avant activation.</p>` : ''}
    ${['task', 'agent', 'communication', 'watch', 'external', 'document'].includes(node.kind) ? `<details><summary>Connexions de cette étape</summary><label for="node-capabilities">Capacités de plugins (facultatives)</label><select id="node-capabilities" name="capabilities"><option value="">Aucune</option>${[...new Map([...state.capabilities.filter(c => c.plugin_id).flatMap(c => c.operations.map(op => [JSON.stringify({ plugin: c.plugin_id, operation: op }), `${c.title} · ${op}`])), ...(node.capabilities || []).map(b => [JSON.stringify(b), `${b.plugin} · ${b.operation}`])]).entries()].map(([value, title]) => `<option value="${esc(value)}" ${(node.capabilities || []).some(b => JSON.stringify(b) === value) ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select><small>Catalogue : .tricorder/plugins.json · aucune dépendance à un agent dédié.</small>${button('refresh-connections', 'Actualiser les outils', 'flat')}<p class="muted">${state.capabilities.filter(c => c.plugin_id).map(c => esc(c.title) + ' : ' + esc(c.operations.join(', '))).join(' · ') || 'Aucun plugin déclaré dans ce dépôt.'}</p></details>` : ''}
    ${isAgent ? `<p class="notice">${esc(effective.provider.value === "claude" ? "Anthropic · Claude" : "OpenAI · Codex")} · ${esc(effective.model.value || "modèle à choisir")}</p>${button("workflow-ai", "Choisir l’IA pour tout le workflow", "flat")}<details><summary>Agent et modèle pour cette étape</summary><label for="node-required-capabilities">Capacités nécessaires (une par ligne : text, read, edit, shell, native-tools)</label><textarea id="node-required-capabilities" name="required_capabilities">${esc((node.required_capabilities || []).join('\n'))}</textarea><label for="node-execution-mode">Travail du modèle</label><select id="node-execution-mode" name="execution_mode">${options([["text", "Analyse ou rédaction"], ["edit", "Modification de code dans une copie isolée"]], node.execution_mode || "text")}</select><p class="muted">Les modifications sont présentées avant application au dépôt. Reliez la sortie candidate à un bloc Commande pour tester cette copie.</p><label for="node-profile">Agent dédié (facultatif)</label><select id="node-profile" name="profile">${options(profiles, effective.profile.value)}</select><p class="muted">Sans agent dédié, le modèle suit directement la consigne du bloc. Un profil spécialisé ajoute les instructions du pack.</p><label for="node-provider">Fournisseur</label><select id="node-provider" name="provider">${options([['codex', 'OpenAI · Codex'], ['claude', 'Anthropic · Claude']], effective.provider.value)}</select><label for="node-model">Modèle IA</label><input id="node-model" name="model" value="${esc(effective.model.value)}" placeholder="Identifiant exact du modèle"><small>Valeur effective : ${esc(effective.model.value || 'non définie')} · ${effective.model.source}. Aucun repli automatique.</small><details><summary>Effort et mode d'exécution</summary><label for="node-effort">Effort</label><select name="effort" id="node-effort">${options(['low', 'medium', 'high', 'xhigh'].map(v => [v, v]), effective.effort.value)}</select><small>Effort de la conversation : ${esc(state.graph.defaults?.effort || 'medium')}. Les étapes exécutées dans cette session doivent utiliser le même niveau.</small><label for="node-session">Session</label><select id="node-session" name="session">${options([['delegated', 'Session déléguée'], ['main', 'Session principale (à qualifier)']], effective.session.value)}</select><p class="muted">Le choix est enregistré. Le connecteur vérifiera les capacités réelles avant tout lancement.</p></details></details>` : ''}
    ${['decision', 'review', 'question'].includes(node.kind) ? `<label for="node-question">Question à poser</label><textarea id="node-question" name="question">${esc(node.question || '')}</textarea><label for="node-options">Issues (une par ligne)</label><textarea id="node-options" name="options">${esc((node.options || ['approve', 'reject']).join('\n'))}</textarea><p class="muted">Une attente humaine persiste après fermeture. Le silence n'autorise rien.</p>` : ''}
    ${node.kind === 'command' ? `<label for="node-argv">Commande et arguments (un par ligne)</label><textarea id="node-argv" name="argv" spellcheck="false">${esc((node.argv || []).join('\n'))}</textarea><label for="node-timeout">Délai maximal (secondes)</label><input type="number" min="1" max="3600" id="node-timeout" name="timeout" value="${node.timeout || 60}"><p class="muted">Sans shell ni réseau. Projet monté en lecture seule dans /project ; travail dans /work.</p>` : ''}
    ${node.kind === 'document' ? `<label for="node-content">Contenu du brouillon</label><textarea id="node-content" name="content">${esc(node.content || '')}</textarea><small>Préparation locale. La publication demande une opération et un accord distincts.</small>` : ''}
    ${node.kind === 'condition' ? `<label for="node-parameter">Paramètre</label><input id="node-parameter" name="parameter" value="${esc(node.parameter || '')}"><label for="node-options">Issues (une par ligne)</label><textarea id="node-options" name="options">${esc((node.options || ['yes', 'no']).join('\n'))}</textarea>` : ''}
    ${node.kind === 'subworkflow' ? `<p>Les ports de même nom sont reliés aux blocs d’entrée et de sortie du composant. Décrivez les autres correspondances ci-dessous.</p><details><summary>Correspondances du composant</summary><label>Entrées publiques → blocs (JSON)<textarea name="input_mapping">${esc(JSON.stringify(node.input_mapping || {},null,2))}</textarea></label><label>Sorties publiques ← blocs (JSON)<textarea name="output_mapping">${esc(JSON.stringify(node.output_mapping || {},null,2))}</textarea></label><small>Exemple : {"demande": {"node": "analyse", "port": "request"}}</small></details><label for="node-workflow">Composant de bibliothèque</label><select id="node-workflow" name="workflow">${options(state.templates.map(g => [g.id, g.title]), node.workflow)}</select>` : ''}
    ${['decision', 'external'].includes(node.kind) ? `<fieldset><legend>Opération externe exacte</legend><label for="op-action">Action</label><input id="op-action" name="op_action" value="${esc(operationField(node.operation?.action))}" placeholder="publish-candidate"><label for="op-target">Cible</label><input id="op-target" name="op_target" value="${esc(operationField(node.operation?.target))}" placeholder="Dépôt et branche de production"><label for="op-candidate">Candidat ou version exacte</label><input id="op-candidate" name="op_candidate" value="${esc(operationField(node.operation?.candidate))}" placeholder="SHA du candidat testé">${node.kind === 'external' ? `<label for="node-approval">Décision humaine qui autorisera cette opération</label><select id="node-approval" name="approval">${options([['','Choisir une décision'], ...state.graph.nodes.filter(n => n.kind === 'decision').map(n => [n.id,n.title])], node.approval || '')}</select><label><input type="checkbox" name="link_operation">Relier cette décision et y copier l’opération exacte</label>` : ''}<small>Utilisez @nom_entree pour une cible ou un candidat produit en amont. Les données reliées seront affichées dans la proposition exacte avant l’accord.</small><details><summary>Paramètres supplémentaires du connecteur</summary><label for="node-operation">Paramètres complets (JSON)</label><textarea id="node-operation" name="operation">${esc(JSON.stringify(node.operation || {}, null, 2))}</textarea></details></fieldset>` : ''}
    ${['command', 'document', 'watch', 'communication'].includes(node.kind) ? `<label for="node-validation">Validation du résultat</label><select id="node-validation" name="validation">${options([['human', 'Manuelle'], ['automatic', 'Automatique — contrôles techniques']], node.validation || 'human')}</select><p class="muted">La validation automatique vérifie succès, types et preuves. Elle exige une liste de critères métier vide. Ajoutez une Décision humaine pour confirmer une action.</p>` : ''}
    ${['command', 'document'].includes(node.kind) ? `<label><input type="checkbox" name="reuse" ${node.reuse ? 'checked' : ''}>Autoriser la réutilisation des preuves pendant 24 h</label><small>Uniquement si le bloc, ses dépendances et ses fichiers sont inchangés. Désactiver pour les contrôles dépendant de l’heure ou d’un état extérieur.</small>` : ''}
    <details><summary>Entrées et sorties</summary><label for="node-inputs">Entrées (nom : type, JSON)</label><textarea id="node-inputs" name="inputs">${esc(JSON.stringify(node.inputs || {}, null, 2))}</textarea><label for="node-outputs">Sorties (nom : type, JSON)</label><textarea id="node-outputs" name="outputs">${esc(JSON.stringify(node.outputs || {}, null, 2))}</textarea></details>${["communication", "external"].includes(node.kind) ? `<label for="node-reconciliation">Capacité de recherche d’accusé (lecture, facultative)</label><input id="node-reconciliation" name="reconciliation" value="${esc(node.reconciliation || "")}">` : ""}<details><summary>Reprises, ressources et position</summary><label for="node-attempts">Tentatives maximales</label><input id="node-attempts" name="max_attempts" type="number" min="1" max="10" value="${node.max_attempts || 1}"><label for="node-resources">Ressources exclusives (une par ligne)</label><textarea name="resources" id="node-resources">${esc((node.resources || []).join('\n'))}</textarea><div class="row"><div class="fill"><label for="node-x">Position X</label><input type="number" min="0" max="20000" name="x" id="node-x" value="${nodePosition(node, state.graph.nodes.indexOf(node)).x}"></div><div class="fill"><label for="node-y">Position Y</label><input type="number" min="0" max="20000" name="y" id="node-y" value="${nodePosition(node, state.graph.nodes.indexOf(node)).y}"></div></div></details><div class="row" style="margin-top:22px"><button class="primary" type="submit">Appliquer au bloc</button></div></form>
    <details><summary>Connexions</summary>${state.graph.edges.filter(e => e.from === node.id || e.to === node.id).map(e => `<p class="muted">${esc(e.from)} → ${esc(e.to)} (${esc(e.outcome || 'done')}) ${button('delete-edge', 'Retirer', 'flat', `data-id="${e.id}"`)}</p>`).join('') || '<p class="muted">Aucune connexion.</p>'}</details><hr>${button('delete-node', 'Supprimer cette étape', 'danger')}`;
}

function runInspector(node) {
  const pendingQuestion = state.run.nodes[node.id].question;
  const values = state.run.nodes[node.id];
  const requestText=state.run.parameters?.request;
  const sourceNames=typeof requestText==='string' ? [...requestText.matchAll(/(?:^|\n)(?:Original|Source[^:]*|Pièces[^:]*)\s*:\s*([^\n]+)/g)].map(m=>m[1].split('/').at(-1)).slice(0,3) : [];
  const received = dataView('Entrées reçues', values.inputs) + (values.input_sources && Object.keys(values.input_sources).length && !values.input_sources.$artifact ? `<p class="muted">Sources : ${Object.entries(values.input_sources).map(([key, source]) => `${esc(key)} ← ${button('select-node', esc(source.node), 'flat', `data-id="${esc(source.node)}"`)}`).join(' · ')}</p>` : '') + (values.input_sources?.$artifact ? dataView('Sources des entrées',values.input_sources) : '') + dataView('Résultat', values.result?.outputs) + evidenceView(values) + dataView('Tentatives précédentes',values.history);
  if (state.run.nodes[node.id].status === 'waiting_input') return `${pendingQuestion.text?.$artifact ? dataView('Question',pendingQuestion.text) : `<p>${esc(pendingQuestion.text)}</p>`}${pendingQuestion.notification?.run ? button('notification-run', 'Suivre la notification', '', `data-id="${esc(pendingQuestion.notification.run)}"`) : pendingQuestion.notification?.status === 'blocked' ? `<p class="notice">Notification bloquée : ${esc(pendingQuestion.notification.reason)}</p>` : ''}${received ? `<details class="question-context"><summary>${sourceNames.length ? 'Sources référencées : '+esc(sourceNames.join(', ')) : 'Entrées et sources de la demande'}</summary>${received}</details>` : ''}<p class="muted question-help">Répondez dans le terminal ou ici. Cette réponse n’autorise aucune opération externe.</p><form id="question-form"><label>Votre réponse<textarea name="answer" required></textarea></label><button class="primary">Répondre</button></form>`;
  const data = state.run.nodes[node.id]; if (!data) return '';
  let html = `<p>${badge(data.status)}</p>` + received;
  const operation=data.operation || node.operation;
  if (data.status === 'waiting') {
    html += `<div class="notice amber"><strong>Votre décision est attendue</strong><p>${esc(node.question || 'Examiner le résultat avant la suite.')}</p>${operation?.$artifact ? dataView('Contenu exact de l’opération',operation) : operation ? `<p>Action : <strong>${esc(operation.action)}</strong><br>Cible : <strong>${esc(operation.target)}</strong><br>Candidat : <code>${esc(operation.candidate)}</code></p><details open><summary>Contenu exact de l’opération</summary><pre>${esc(JSON.stringify(operation, null, 2))}</pre></details>` : ''}</div><form id="decision-form"><label for="decision-note">Commentaire (facultatif)</label><textarea id="decision-note" name="note"></textarea><div class="stack" style="margin-top:16px">${(node.options || ['approve', 'reject']).map(o => `<button type="submit" name="outcome" value="${esc(o)}" class="${o === 'approve' ? 'primary' : ''}">${o === 'approve' ? operation ? 'Autoriser cette opération' : 'Approuver la suite' : o === 'reject' ? 'Refuser la suite' : esc(o)}</button>`).join('')}</div></form><p class="muted">La réponse s'applique à cette proposition et à cette tentative uniquement.</p>`;
  }
  if (data.result) {
    html += `${data.result.summary?.$artifact ? dataView('Compte rendu',data.result.summary) : `<p>${esc(data.result.summary)}</p>`}${data.result.preview?.$artifact ? dataView('Aperçu complet',data.result.preview) : data.result.preview ? `<pre>${esc(data.result.preview)}</pre>` : ''}${data.result.simulated ? '<p class="notice amber">Preuve simulée, sans valeur de test métier réel.</p>' : ''}`;
    if (data.result.effect_id) html += button('reconcile-effect', 'Rechercher l’accusé distant');
    if ((data.result.outputs?.candidate || data.result.patch) && !data.result.simulated) html += button('preview-candidate', data.applied_candidate ? 'Voir le code appliqué' : 'Examiner les modifications');
    if (data.status === 'returned') html += `<form id="receipt-form"><h3>Examiner le résultat</h3>${(node.criteria || []).map((c, i) => `<label><input type="checkbox" name="criterion" value="${i}" required>${esc(c)}</label>`).join('')}<label for="receipt-note">Commentaire de validation</label><textarea id="receipt-note" name="note" ${node.criteria?.length ? 'required' : ''} placeholder="Ce que vous avez vérifié…"></textarea><div class="stack" style="margin-top:16px"><button type="submit" class="primary" ${data.result.ok ? '' : 'disabled'}>Valider le résultat</button>${node.kind !== 'external' && data.attempt < (node.max_attempts || 1) ? button('retry', 'Demander une reprise') : ''}</div></form>`;
    if (data.receipt) html += `<div class="notice"><strong>Résultat validé</strong>${data.receipt.note?.$artifact ? dataView('Commentaire',data.receipt.note) : `<p>${esc(data.receipt.note || 'Validation enregistrée.')}</p>`}</div>`;
  }
  if (data.status === 'running') html += `<p>Le travail a commencé. Une fin de processus ne vaut pas validation.</p><p class="muted">Dernier signal : ${new Date((data.heartbeat || data.started) * 1000).toLocaleTimeString('fr-CH')}. ${Date.now() / 1000 - (data.heartbeat || 0) > 10 ? 'Observation ancienne : activité actuelle inconnue.' : ''}</p>${button('reconcile', 'Rechercher un résultat enregistré')}${button('recover-attempt','Vérifier la tentative interrompue')}`;
  if (data.validation_error) html += `<p class="notice">Validation automatique interrompue : ${esc(data.validation_error)}</p>`;
  if (data.reused_from) html += `<p class="notice">Preuves réutilisées depuis ${esc(data.reused_from.run)}. Aucun nouveau test exécuté pour ce bloc.</p>`;
  if (data.reason) html += `<p class="notice">${esc(data.reason)}</p>`;
  if (data.decision) html += `<p class="notice">Décision humaine : <strong>${esc(data.decision.outcome)}</strong>.</p>`;
  if (['ready', 'pending', 'skipped'].includes(data.status)) html += `<p class="muted">${data.status === 'ready' ? (state.run.driver ?? state.run.definition.driver) === 'conversation' && ['agent', 'task', 'document'].includes(node.kind) ? 'Cette étape est prête. Poursuivez dans le terminal de la conversation.' : 'Le moteur lancera cette étape dès que ses ressources seront disponibles.' : data.status === 'skipped' ? 'Cette branche n’a pas été sélectionnée.' : 'Cette étape attend ses dépendances.'}</p>`;
  return html;
}

function modal(title, body, actions = '', wide = false) {
  closeModal(); state.modal = document.activeElement;
  const root = document.createElement('div'); root.className = 'modal'; root.innerHTML = `<section class="modal-card ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="row between"><h2 id="modal-title">${esc(title)}</h2>${button('close-modal', '×', 'flat', 'aria-label="Fermer la fenêtre"')}</div>${body}<div class="status-line"></div>${actions ? `<div class="modal-actions">${actions}</div>` : ''}</section>`;
  document.body.append(root); root.querySelector('input, textarea, select, button')?.focus();
}
function closeModal() { rememberLaunchDraft(); document.querySelector('.modal')?.remove(); if (state.modal?.isConnected) state.modal.focus(); state.modal = null; }
async function ensureProject() {
  if (state.project && !state.project.library) return;
  Object.assign(state, await call('workspace.get'));
}
async function openProject(id, render = true) {
  viewEpoch++;
  const data = await call('project.get', { project: id }); Object.assign(state, data); state.repositoryFiles = await call('workflow.repository', { project: id }); state.repositoryProject = id; state.conversations = await call('conversation.list', { project: id }); state.route = 'project';
  if (render) shell();
}
async function useTemplate(id) {
  await ensureProject(); const source=state.templates.find(g=>g.id===id);const template = source.summary ? await call('workflow.get',{project:source._project,workflow:source.id}) : clone(source);delete template._project;
  template.id += '-' + Date.now().toString(36); delete template.revision;
  const graph = await call('workflow.save', { project: state.project.id, graph: template }); state.workflows.push(graph); openWorkflow(graph);
}
function questionNotificationForm() {
  const config = state.graph.on_question;
  const bindings = state.capabilities.filter(c => c.plugin_id).flatMap(c => (c.operations || []).filter(op => c.effects?.[op] === 'notify').map(op => [JSON.stringify({ plugin: c.plugin_id, operation: op }), c.title + ' · ' + op]));
  const current = config ? JSON.stringify({ plugin: config.plugin, operation: config.operation }) : '';
  if (current && !bindings.some(([key]) => key === current)) bindings.push([current, config.plugin + ' · ' + config.operation + ' (à vérifier)']);
  return `<fieldset><legend>Quand le workflow a une question</legend><label for="question-notification">Me prévenir avec</label><select id="question-notification" name="question_notification">${options([['', 'Dans Tricorder uniquement'], ...bindings], current)}</select><label for="question-recipient">Canal ou destinataire exact</label><input id="question-recipient" name="question_recipient" value="${esc(config?.recipient || '')}" placeholder="Par exemple : identifiant du canal Slack"><p class="muted">S’applique aux questions prévues et à celles posées en cours de travail. La notification contient le nom du workflow et sa référence ; la question reste dans Tricorder. Ajoutez et vérifiez une opération de notification dans Connexions pour la choisir ici.</p></fieldset>`;
}
function prepareWork(templateId) {
  state.workModels = [...(state.project?.library ? [] : state.workflows).filter(g => !state.templates.some(t => t.id === g.id)), ...state.templates];
  const selected = state.workModels.find(g => g.id === templateId) || state.templates.find(g => g.id === 'request-conversation') || state.templates[0];
  const destination = state.project && !state.project.library ? state.project.id : 'workspace';
  modal('Créer un workflow à partir d’un modèle', `<form id="new-work-form"><p>Choisissez un modèle et un projet. Configurez les blocs dans l’éditeur, puis lancez le workflow.</p><label for="work-template">Modèle de workflow</label><select id="work-template" name="template">${options(state.workModels.map(g => [g.id, (state.workflows.some(w => w.id === g.id) ? 'Projet · ' : '') + g.title]), selected.id)}</select><label for="work-title">Nom du workflow</label><input id="work-title" name="title" required maxlength="160" value="${esc(selected.title)}"><label for="work-project">Enregistrer dans</label><select id="work-project" name="project">${options([['workspace', 'Workflows globaux · sans projet'], ...state.projects.map(p => [p.id, p.title])], destination)}</select><label for="work-request">Demande initiale <span class="muted">(facultatif)</span></label><textarea id="work-request" name="request" placeholder="Demande client, question à analyser, transcript à traiter…"></textarea><p class="muted">Le workflow sera enregistré dans .tricorder/workflows/ du dossier choisi, prêt à versionner avec Git. Le lancement vient ensuite ; aucun commit ni envoi automatique.</p><div class="modal-actions"><button class="primary" type="submit">Créer et ouvrir le workflow</button></div></form>`);
  document.querySelector('#work-template').addEventListener('change', event => {
    const model = state.workModels.find(g => g.id === event.target.value);
    document.querySelector('#work-title').value = model.title;
  });
}
async function openWorkflow(graph) {
  viewEpoch++;
  if (graph.summary) graph = await call('workflow.get', {project:graph._project || state.project.id, workflow:graph.id});
  graph = clone(graph); delete graph._project;
  state.conversation = null;
  Object.assign(state, { graph: clone(graph), savedRevision: graph.revision || 0, run: null, selected: null, mode: 'design', route: 'workflow', dirty: false, history: new History(), events: [], zoom: 0.8 });
  const draft = localStorage.getItem(draftKey());
  if (draft) { try { const restored = JSON.parse(draft); state.graph = restored.graph; state.savedRevision = restored.revision; state.dirty = true; if(restored.form) {state.selected=restored.form.node;state.restoreForm=restored.form;} } catch { /* Invalid browser draft does not replace the saved workflow. */ } }
  shell(); if (draft) toast('Brouillon local restauré. Comparez avec le fichier avant d’enregistrer.');
}
async function save() {
  flushNodeForm();
  let saved;
  try { saved = await call('workflow.save', { project: state.project.id, graph: state.graph, revision: state.savedRevision }); }
  catch (error) { if (/Conflit|modifié depuis le terminal/.test(error.message)) { await showConflict(); throw new Error('Conflit détecté : choisissez comment conserver les deux versions.'); } throw error; }
  localStorage.removeItem(draftKey());
  state.workflows = await call('project.get', { project: state.project.id }).then(d => d.workflows);
  state.graph = saved; state.savedRevision = saved.revision; state.dirty = false;
  if (state.project.library) state.templates = (await call('bootstrap')).templates;
  if (state.route === 'workflow') renderEditor(); toast('Workflow enregistré. Les exécutions précédentes gardent leur version.');
}
async function openRun(id, stillCurrent = null) {
  if (!stillCurrent) viewEpoch++;
  const data = await call('run.get', { run: id });
  if (stillCurrent && !stillCurrent()) return;
  const project = state.project?.id !== data.run.project ? await call('project.get', { project: data.run.project }) : null;
  const cid = data.run.parameters?.conversation;
  const conversation = !cid ? null : state.conversation?.id === cid ? state.conversation : await call('conversation.get', { conversation: cid });
  if (stillCurrent && !stillCurrent()) return;
  if (project) Object.assign(state, project);
  state.run = data.run; state.events = data.events; state.eventsNext = data.events_next; state.conversation = conversation;
  if (!state.graph || state.graph.id !== data.run.original.id) { state.graph = clone(data.run.original); state.savedRevision = state.graph.revision || 0; state.dirty = false; }
  state.mode = 'run'; state.route = 'workflow'; state.reviewFocus=!!(state.conversation && state.reviewFocus); state.selected = data.run.focus?.node || Object.keys(data.run.nodes).find(id => ['waiting_input','waiting','returned'].includes(data.run.nodes[id].status)) || null;
  const selected = data.run.definition.nodes.find(n=>n.id===state.selected);
  if(selected?.phase)state.collapsed.delete(selected.phase);
  shell();requestAnimationFrame(focusSelectedNode);
}
function focusSelectedNode() {
  if(state.reviewFocus || !state.selected)return;
  const viewport=document.querySelector('.canvas-scroll');
  const node=document.querySelector(`.node[data-id="${CSS.escape(state.selected)}"]`);
  if(!viewport || !node)return;
  viewport.scrollLeft=Math.max(0,(node.offsetLeft+node.offsetWidth/2)*state.zoom-viewport.clientWidth/2);
  viewport.scrollTop=Math.max(0,(node.offsetTop+node.offsetHeight/2)*state.zoom-viewport.clientHeight/2);
}
function dataView(label, values) {
  if (!values || (typeof values === 'object' && !Object.keys(values).length)) return '';
  if (values.$artifact) return `<section class="execution-data"><h3>${esc(label)}</h3><pre class="${values.format==='text' ? 'prose' : ''}">${esc(values.preview)}</pre>${button('read-proof','Lire le contenu complet','',`data-sha="${values.$artifact.sha256}"`)}</section>`;
  const rows = typeof values === 'object' && !Array.isArray(values) ? Object.entries(values) : [[label, values]];
  return `<section class="execution-data"><h3>${esc(label)}</h3>${rows.map(([key,value]) => `<div class="execution-value"><strong>${esc(key)}</strong>${value?.$artifact ? dataView('',value) : `<pre tabindex="0" class="${typeof value==='string' ? 'prose' : ''}">${esc(typeof value === 'string' ? value : JSON.stringify(value,null,2))}</pre>${button('select-value','Sélectionner le texte','flat')}`}</div>`).join('')}</section>`;
}
function evidenceView(data) {
  const proofs = data.result?.evidence || [];
  if (proofs.$artifact) return dataView('Preuves',proofs);
  return proofs.length ? `<section class="execution-data"><h3>Preuves</h3>${proofs.map((p,i)=>button('read-proof',`Consulter la preuve ${i+1}`,'',`data-sha="${esc(p.sha256)}"`)).join('')}</section>` : '';
}
function conversationPager(c) { return `<div class="row"><details class="conversation-search-details"><summary>Rechercher</summary><form id="conversation-search" class="row"><label class="sr-only" for="conversation-query">Rechercher une demande</label><input type="search" id="conversation-query" name="query" placeholder="Rechercher une demande…" value="${esc(c.query || '')}"><button>Rechercher</button></form></details>${c.offset ? button('conversation-page','Précédentes','',`data-offset="${Math.max(0,c.offset-25)}"`) : ''}${c.next !== null && c.next !== undefined ? button('conversation-page','Suivantes','',`data-offset="${c.next}"`) : ''}</div>`; }
async function showConflict() {
  persistDraft();
  const compared=await call('workflow.conflict',{project:state.project.id,graph:state.graph,revision:state.savedRevision});
  state.conflict=compared;
  modal('Comparer les modifications du workflow', `<p>Votre brouillon local est conservé. Les modifications distinctes sont fusionnées ; choisissez la version des champs modifiés des deux côtés.</p>${compared.error ? `<p class="error">Fichier invalide : ${esc(compared.error)}</p>` : ''}<form id="conflict-form">${(compared.conflicts || []).map((c,i)=>`<fieldset><legend>${esc(c.path)}</legend><pre>Éditeur : ${esc(JSON.stringify(c.mine,null,2))}\nFichier : ${esc(JSON.stringify(c.disk,null,2))}</pre><label>Version à garder<select name="choice-${i}" required><option value="">Choisir…</option><option value="mine">Éditeur</option><option value="disk">Fichier</option></select></label></fieldset>`).join('')}<details><summary>Comparer la base, l’éditeur et le fichier</summary>${['base','mine','disk'].map(k=>`<h3>${({base:'Base enregistrée',mine:'Brouillon éditeur',disk:'Fichier actuel'})[k]}</h3><pre>${esc(JSON.stringify(compared[k] ?? compared.disk_text,null,2))}</pre>`).join('')}</details><div class="modal-actions">${!compared.error ? '<button name="strategy" value="merge" class="primary">Enregistrer la fusion</button>' : ''}<button name="strategy" value="copy" formnovalidate>Enregistrer mon brouillon en copie</button>${!compared.error ? '<button name="strategy" value="disk" formnovalidate>Adopter le fichier (brouillon conservé)</button>' : ''}</div></form>`, '', true);
}
async function loadDocument(more=false) {
  const page = await call('run.document', { run: state.run.id, paginated:true, offset:more ? state.documentNext : 0 });
  state.documentText=(more ? state.documentText : '') + page.text; state.documentNext=page.next;
  const target = document.querySelector('#document-view');
  if (target) {
    target.innerHTML = DOMPurify.sanitize(marked.parse(state.documentText));
    target.querySelectorAll('a').forEach(a => {
      const proof=a.getAttribute('href')?.match(/^\.suivi\/preuves\/([a-f0-9]{64})$/);
      if (proof) { a.dataset.action='read-proof'; a.dataset.sha=proof[1]; a.setAttribute('href','#proof-'+proof[1]); }
      else {a.removeAttribute('href');a.title='Lien externe consultable dans le rapport exporté.';}
    });
    if(page.next !== null) target.insertAdjacentHTML('beforeend',button('document-more','Lire la suite du rapport'));
  }
}
async function showProof(sha, offset=0) {
  const page=await call('run.proof',{run:state.run.id,sha256:sha,offset});
  state.proof={sha,offset,next:page.next};
  modal('Contenu de la preuve',`<p>Caractères ${offset+1}–${Math.min(offset+page.text.length,page.total)} sur ${page.total}. Texte brut, aucun contenu actif.</p><div class="execution-value"><pre tabindex="0">${esc(page.text)}</pre>${button('select-value','Sélectionner le texte')}</div>`,(offset ? button('proof-page','Page précédente','',`data-offset="${Math.max(0,offset-32000)}"`) : '')+(page.next !== null ? button('proof-page','Page suivante','',`data-offset="${page.next}"`) : ''),true);
}

const actions = {
  async 'restore-previous-draft'() {const previous=localStorage.getItem(draftKey()+':previous');if(previous) {localStorage.setItem(draftKey(),previous);await openWorkflow(state.graph);toast('Brouillon précédent récupéré. Comparez-le avec le fichier courant.');}},
  async 'template-page'(el) {state.template_page=await call('workflow.list',{project:'library',offset:Number(el.dataset.offset)});state.templates=[...state.templates.filter(g=>!g._project),...state.template_page.items];renderLibrary();},
  async 'overview-page'(el) {state.activity=(await call('overview.get',{offset:Number(el.dataset.offset)})).activity;renderOverview();},
  'review-layout'() { state.reviewFocus=!state.reviewFocus;if(!state.selected)state.selected=Object.keys(state.run.nodes).find(id=>['waiting','waiting_input','returned'].includes(state.run.nodes[id].status)) || state.run.definition.nodes[0].id;renderEditor();if(!state.reviewFocus)requestAnimationFrame(focusSelectedNode); },
  'run-page': el => loadRunPage(Number(el.dataset.offset)),
  'toggle-archives'() {state.showArchives=!state.showArchives;shell();},
  async 'workflow-archives'() {state.showWorkflowArchives=!state.showWorkflowArchives;await actions['workflow-more']({dataset:{offset:'0'}});},
  async 'workflow-more'(el) {state.workflow_page=await call('workflow.list',{project:state.project.id,offset:Number(el.dataset.offset),archived:!!state.showWorkflowArchives});state.workflows=state.workflow_page.items;renderProject();},
  'archive-item'(el) {state.archiveItem={kind:el.dataset.kind,id:el.dataset.id,archived:el.dataset.archived !== 'true'};modal(state.archiveItem.archived ? 'Archiver cet élément' : 'Restaurer cet élément','<p>L’archivage masque cet élément des listes courantes. Les définitions, résultats et preuves sont conservés ; la restauration reste possible. Une planification restaurée reste suspendue.</p>',button('close-modal','Revenir')+button('confirm-archive','Confirmer','primary'));},
  async 'confirm-archive'() {await call('entity.archive',{...state.archiveItem,project:state.project.id},true);closeModal();Object.assign(state,await call('bootstrap'));if(state.archiveItem.kind==='schedule')await actions['refresh-schedules']();else if(state.archiveItem.kind==='run')await loadRunPage();else await openProject(state.project.id);},
  'new-request'() {modal('Nouvelle demande',`<p>Réutilisez un workflow existant. Son exécution gardera une version figée ; aucun modèle ne sera dupliqué.</p>${state.workflows.filter(g=>!g.archived).map(g=>`<p>${button('request-workflow',esc(g.title),'',`data-id="${g.id}"`)}</p>`).join('')}`);},
  async 'request-workflow'(el) {closeModal();await actions['run-workflow'](el);},
  'resume-agent'() { modal('Reprendre l’agent de cette conversation','<p>La reprise se fait uniquement si le terminal est au prompt du shell. Elle efface sa ligne de saisie en cours. La session fournisseur est reprise si son identifiant est connu ; sinon un nouvel agent relit les demandes et résultats conservés, sans créer une seconde conversation Tricorder.</p>',button('close-modal','Revenir')+button('confirm-resume-agent','Reprendre dans ce terminal','primary')); },
  async 'confirm-resume-agent'() { const {project}=await call('project.get',{project:state.conversation.project});closeModal();await terminal.open(project,state.conversation.definition,state.conversation.id,true); },
  'select-value'(el) { const pre=el.closest('.execution-value').querySelector('pre'); const selection=window.getSelection(); const range=window.document.createRange(); range.selectNodeContents(pre); selection.removeAllRanges();selection.addRange(range);pre.focus();toast('Texte sélectionné : Ctrl+C pour copier.'); },
  'read-proof': el => showProof(el.dataset.sha),
  'proof-page': el => showProof(state.proof.sha,Number(el.dataset.offset)),
  'document-more': () => loadDocument(true),
  async 'conversation-page'(el) { const c=state.conversation; state.conversation=await call('conversation.get',{conversation:c.id,offset:Number(el.dataset.offset),query:c.query || ''}); state.conversation.query=c.query || '';renderConversation(); },
  async 'recover-attempt'() { const check=await call('run.recovery',{run:state.run.id,node:state.selected});modal('Tentative interrompue',`<p>${esc(check.reason)}</p><p>La fin de tentative libère ses ressources sans répéter le travail. Une opération externe incertaine exige une vérification distante et un nouvel accord.</p>`,check.recoverable ? button('finish-interrupted','Terminer cette tentative interrompue','primary') : button('close-modal','Fermer')); },
  async 'finish-interrupted'() {state.run=await call('run.finish-interrupted',{run:state.run.id,node:state.selected},true);closeModal();renderEditor();},
  cancel() {modal('Annuler cette exécution', '<p>Les étapes non commencées ne seront plus lancées. Les outils en cours reçoivent l’annulation ; un effet externe peut déjà avoir eu lieu. Les résultats, décisions et preuves restent conservés.</p>',button('close-modal','Revenir')+button('confirm-cancel','Annuler l’exécution','danger'));},
  async 'confirm-cancel'() {state.run=await call('run.control',{run:state.run.id,control:'cancel'});closeModal();renderEditor();},
  async 'archive-conversation'() {await call('entity.archive',{kind:'conversation',id:state.conversation.id,archived:!state.conversation.archived},true);state.conversation=await call('conversation.get',{conversation:state.conversation.id});renderConversation();},

  'legacy-project': () => integration.openLegacy(state.project),
  async 'repository-workflows'() {
    state.repositoryFiles = await call('workflow.repository', { project: state.project.id });
    modal('Workflows présents dans le dépôt', `<p>Les modèles versionnés peuvent être repris sur ce poste. Les exécutions et autorisations restent locales.</p>${state.repositoryFiles.map(f => `<article class="card"><strong>${esc(f.title || f.id)}</strong><p><code>${esc(f.file)}</code></p><p>${esc(f.error || ({new: 'Disponible à importer', changed: 'Modifié dans le dépôt : ouvrir le workflow puis Recharger et valider.', current: 'Déjà disponible dans ce projet'})[f.status])}</p>${f.status === 'new' ? button('import-repository', 'Importer ce workflow', 'primary', `data-id="${esc(f.id)}"`) : ''}</article>`).join('') || '<p>Aucun fichier dans .tricorder/workflows/.</p>'}`);
  },
  async 'import-repository'(el) {
    const file = state.repositoryFiles.find(f => f.id === el.dataset.id);
    const graph = await call('workflow.import-repository', { project: state.project.id, workflow: file.id, digest: file.digest });
    state.workflows.push(graph); closeModal(); openWorkflow(graph); toast('Workflow repris depuis le dépôt. Aucune exécution lancée.');
  },
  'export-work'() {
    modal('Exporter le rapport dans le projet', `<form id="work-export-form"><p>Demande, résultats, questions, décisions, workflow exécuté et preuves seront conservés ensemble dans <code>work/</code> du projet de cette demande. L’export est un instantané ; il ne clôture pas le travail.</p><label for="work-export-name">Nom du dossier</label><input id="work-export-name" name="name" required pattern="[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}" value="${esc(state.run.id)}"><div class="modal-actions"><button class="primary" type="submit">Exporter le rapport</button></div></form>`);
  },
  async cockpit() { await call('cockpit.open'); },
  'workflow-ai'() { modal('Choisir l’IA du workflow', aiForm()); },
  async 'run-workflow'(el) { await openWorkflow(state.workflows.find(g => g.id === el.dataset.id)); await actions['start-preview'](); },
  async 'connection-terminal'() { if (!state.project) Object.assign(state, await call('workspace.get')); await terminal.open(state.project, null); },
  async 'reconcile-effect'() { state.run = await call('run.reconcile-effect', { run: state.run.id, node: state.selected }, true); renderInspector(); toast('Résultat distant retrouvé. Aucune opération répétée.'); },
  async 'preview-candidate'() {
    const candidate = await call('candidate.preview', { run: state.run.id, node: state.selected });
    state.pendingCandidate = { ...candidate, run: state.run.id, node: state.selected };
    const data = state.run.nodes[state.selected];
    modal('Modifications proposées', `<p>${candidate.changes.length} fichier(s) · application locale au dépôt ${esc(state.project.title)}.</p><p>Vérifiez les tests de cette copie avant application. Aucun commit ni publication.</p><pre>${esc(candidate.diff)}</pre>`, button('close-modal', 'Fermer') + (candidate.can_apply && !data.applied_candidate ? button('apply-candidate', 'Appliquer ces modifications au dépôt', 'primary') : `<p>${esc(candidate.reason || 'Candidat déjà appliqué.')}</p>`), true);
  },
  async 'apply-candidate'() {
    const c = state.pendingCandidate;
    state.run = await call('candidate.apply', { run: c.run, node: c.node, candidate: c.candidate }, true);
    closeModal(); renderInspector(); toast('Modifications appliquées au dépôt local. Aucun commit ni publication.');
  },
  async 'refresh-overview'() { Object.assign(state, await call('overview.get',{offset:state.activity?.offset || 0})); renderOverview(); },
  async 'activity-run'(el) { await openProject(el.dataset.project, false); await openRun(el.dataset.id); },
  async navigate(el) { viewEpoch++; if (state.dirty) { await save(); } if (el.dataset.route === 'global') { Object.assign(state, await call('workspace.get')); state.route = 'project'; } else { state.route = el.dataset.route; if (state.route === 'overview') Object.assign(state, await call('overview.get',{offset:state.activity?.offset || 0})); if (state.route === 'schedules') state.schedules = await call('schedule.list'); } shell(); },
  theme() { const dark = document.documentElement.dataset.theme === 'dark'; document.documentElement.dataset.theme = dark ? 'light' : 'dark'; localStorage.setItem('tricorder-theme', dark ? 'light' : 'dark'); },
  'new-project'() { modal('Créer un projet', '<form id="project-form"><label for="project-title">Nom du projet</label><input id="project-title" name="title" required placeholder="Mon projet"><label>Racine du dépôt Git local</label><div class="row"><input id="project-path" name="path" readonly required placeholder="Choisir un dépôt Git existant"><button type="button" data-action="choose-folder">Choisir…</button></div><p class="muted">Le dossier doit être la racine d’un dépôt Git. Aucun commit ni envoi distant n’est effectué.</p><div class="modal-actions"><button class="primary" type="submit">Créer le projet</button></div></form>'); },
  async 'choose-folder'() { const path = await api.folder(); if (path) document.querySelector('#project-path').value = path; },
  async 'try-example'() { const existing = state.projects.find(p => p.managed && p.title === 'Mon premier projet'); if (existing) await openProject(existing.id, false); else { state.project = await call('project.create', { title: 'Mon premier projet' }); state.projects.push(state.project); state.workflows = []; state.runs = []; } await useTemplate('first-workflow'); },
  'open-project': el => openProject(el.dataset.id),
  'open-workflow': el => openWorkflow(state.workflows.find(g => g.id === el.dataset.id)),
  'open-run': el => openRun(el.dataset.id),
  'notification-run': el => openRun(el.dataset.id),
  'library-project'() { state.route = 'library'; shell(); },
  'use-template': el => prepareWork(el.dataset.id),
  'new-work': () => prepareWork(),
  async 'blank-workflow'() { const graph = { schema: 1, id: 'workflow-' + Date.now().toString(36), title: 'Nouveau workflow', description: '', nodes: [{ id: 'start', kind: 'task', title: 'Première étape', position: { x: 60, y: 80 } }], edges: [] }; const saved = await call('workflow.save', { project: state.project.id, graph }); state.workflows.push(saved); openWorkflow(saved); actions['workflow-settings'](); },
  async updates() { state.update = await api.updates({ action: 'status' }); previewUpdate(); },
  async 'check-updates'() { state.update = await api.updates({ action: 'check' }); updateIndicator(); previewUpdate(); },
  async 'download-update'() { await api.updates({ action: 'download' }); toast('Téléchargement ouvert. Installez le paquet lorsque vous êtes prêt à quitter Tricorder.'); },
  async 'update-notes'() { await api.updates({ action: 'notes' }); },
  async 'import-workflow'() { if (state.dirty) await save(); const preview = await api.portable({ action: 'open' }); if (preview) previewImport(preview); },
  async 'export-workflow'() { const file = await api.portable({ action: 'save', graph: state.graph, project: state.project.id }); if (file) toast('Workflow exporté : ' + file); },
  async 'discover-plugins'(el) { const provider = el.dataset.provider; const found = await call('plugins.discover', { provider }); state.detectedPlugins = [...(state.detectedPlugins || []).filter(p => p.provider !== provider), ...found]; renderConnections(); toast(`${found.length} plugin(s) détecté(s). Accès aux outils à vérifier.`); },
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
  async 'edit-template'(el) { const item=state.templates.find(g=>g.id===el.dataset.id);const graph = item.summary ? await call('workflow.get',{project:item._project,workflow:item.id}) : clone(item); delete graph._project; state.project = await call('template.workspace'); const data = await call('project.get', { project: 'library' }); state.workflows = data.workflows; state.runs = data.runs; state.capabilities = data.capabilities; if (!graph.revision) { graph.id = 'custom-' + graph.id + '-' + Date.now().toString(36); const saved = await call('workflow.save', { project: 'library', graph }); state.templates.push(saved); openWorkflow(saved); } else openWorkflow(graph); },
  async 'refresh-schedules'() { state.schedules = await call('schedule.list'); state.route = 'schedules'; shell(); },
  async 'toggle-schedule'(el) { const schedule = state.schedules.find(s => s.id === el.dataset.id); await call('schedule.toggle', { schedule: schedule.id, enabled: !schedule.enabled }); await actions['refresh-schedules'](); },
  async 'schedule-run'(el) { const schedule = state.schedules.find(s => s.id === el.dataset.id); await openProject(schedule.project, false); await openRun(schedule.last_run); },
  async schedule() {
    rememberLaunchDraft();
    if (state.dirty) await save();
    const check = await call('workflow.validate', { project: state.project.id, graph: state.graph });
    const models = state.graph.nodes.filter(n => n.kind === 'agent').map(n => `${n.title} : ${effectiveExecution(state.project, state.graph, n).provider.value} / ${effectiveExecution(state.project, state.graph, n).model.value || 'à définir'}`);
    modal('Configurer une planification', `<form id="schedule-form"><p><strong>${esc(state.graph.title)}</strong> · révision ${state.savedRevision}</p><p>Modèles IA : ${models.length ? esc(models.join(' ; ')) : 'aucun'}. ${models.length ? 'Chaque occurrence réelle peut consommer votre abonnement.' : ''}</p>${activationDetails(check)}${launchDiagnostics(check.issues, 'À configurer avant la planification')}<label for="schedule-kind">Fréquence</label><select name="kind" id="schedule-kind"><option value="daily">Chaque jour</option><option value="weekly">Du lundi au vendredi</option><option value="interval">À intervalle régulier</option></select><div class="row"><div class="fill"><label for="schedule-time">Heure locale</label><input name="time" id="schedule-time" type="time" value="09:00"></div><div class="fill"><label for="schedule-minutes">Intervalle (minutes)</label><input name="minutes" id="schedule-minutes" type="number" min="5" max="525600" value="30"></div></div><label for="schedule-timezone">Fuseau horaire</label><input name="timezone" id="schedule-timezone" value="${esc(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Zurich')}"><label><input type="checkbox" name="simulation" checked>Simulation sans appel de modèle ni de service</label><label><input type="checkbox" required>J’active cette révision à cette fréquence. Les décisions humaines du workflow restent obligatoires.</label><p class="muted">Sans chevauchement. L’ordinateur et Tricorder doivent être ouverts. Une heure inexistante au changement d’heure est ignorée ; une heure répétée s’exécute une seule fois.</p><div class="modal-actions"><button type="submit" class="primary">Activer la planification</button></div></form>`, '', true);
    const draft = state.scheduleDrafts[launchKey()]; if (draft) for (const [key,value] of Object.entries(draft)) { const field = document.querySelector('#schedule-form').elements.namedItem(key); if (field.type === 'checkbox') field.checked=value; else field.value=value; } state.launchReturn = null;
  },
  async terminal() { if (!state.project) await ensureProject(); if (state.dirty) await save(); await terminal.open(state.project, state.graph); },
  async 'reload-file'() { if (state.dirty) return showConflict(); const graph = await call('workflow.reload', { project: state.project.id, workflow: state.graph.id, revision: state.savedRevision }); state.graph = graph; state.savedRevision = graph.revision; state.history = new History(); renderEditor(); toast('Fichier validé et nouvelle révision chargée. Les exécutions existantes sont inchangées.'); },
  'select-node'(el) { state.selected = el.dataset.id; document.querySelectorAll('.node').forEach(n => n.classList.toggle('selected', n.dataset.id === state.selected)); renderInspector(); },
  'workflow-settings'() { modal('Paramètres du workflow', `<form id="workflow-form"><label for="workflow-title">Nom</label><input id="workflow-title" name="title" value="${esc(state.graph.title)}" required><label for="workflow-description">Description</label><textarea id="workflow-description" name="description">${esc(state.graph.description || '')}</textarea>${questionNotificationForm()}${odooWorkflowFields()}<details><summary>Paramètres supplémentaires</summary><label for="workflow-parameters">Paramètres (objet JSON)</label><textarea id="workflow-parameters" name="parameters" spellcheck="false">${esc(JSON.stringify(workflowExtraParameters(), null, 2))}</textarea></details><div class="modal-actions"><button class="primary" type="submit">Appliquer</button></div></form>`, state.launchReturn ? button('return-to-launch', state.launchReturn.kind === 'schedule' ? 'Revenir à la planification' : 'Revenir au lancement') : ''); },
  'add-node'() { modal('Ajouter une étape', `<form id="add-node-form"><label for="add-kind">Type d'étape</label><select id="add-kind" name="kind">${options([['agent', 'Travail · Agent'], ['task', 'Travail · Tâche dans la conversation'], ['command', 'Travail · Commande'], ['document', 'Travail · Document'], ['agent-route', 'Aiguillage · Évaluation par un agent'], ['condition', 'Aiguillage · Règle explicite'], ['decision', 'Décision · Accord humain'], ['question', 'Décision · Question ouverte'], ['join', 'Organisation · Réunir'], ['subworkflow', 'Organisation · Sous-workflow'], ['watch', 'Organisation · Surveillance'], ['external', 'Travail · Opération externe'], ['communication', 'Travail · Communication']], 'agent')}</select><label for="add-title">Nom du bloc</label><input id="add-title" name="title" required placeholder="Quel résultat attendre ?"><div class="modal-actions"><button class="primary" type="submit">Ajouter au workflow</button></div></form>`); },
  connect() { modal('Relier deux étapes', `<form id="connect-form"><label for="edge-from">Depuis</label><select id="edge-from" name="from">${options(state.graph.nodes.map(n => [n.id,n.title]), state.selected || state.graph.nodes[0].id)}</select><label for="edge-outcome">Après l’issue</label><select id="edge-outcome" name="outcome"></select><label for="edge-to">Vers</label><select id="edge-to" name="to">${options(state.graph.nodes.map(n => [n.id,n.title]), state.graph.nodes.find(n => n.id !== (state.selected || state.graph.nodes[0].id))?.id)}</select><p class="mapping-summary"></p><label>Sortie à transmettre<select name="output"></select></label><label>Entrée destinataire<select name="input"></select></label><details><summary>Configuration des échanges</summary><label for="edge-mapping">Données transmises (JSON : sortie → entrée)</label><textarea id="edge-mapping" name="mapping">{}</textarea></details><div class="modal-actions"><button class="primary">Créer la connexion</button></div></form>`); refreshConnectionForm(); },
  'add-port'(el) { modal('Décrire une donnée', `<form id="port-form"><input type="hidden" name="direction" value="${el.dataset.direction}"><label>Nom (sans espaces)<input name="port" required pattern="[a-zA-Z][a-zA-Z0-9_.-]{0,79}" placeholder="criticite"></label><label>Type<select name="type">${options([['string','Texte'],['object','Objet structuré'],['array','Liste'],['boolean','Oui / non'],['number','Nombre']])}</select></label><button class="primary">Ajouter la donnée</button></form>`); },
  'remove-port'(el) { edit(g => { delete g.nodes.find(n => n.id === state.selected)[el.dataset.direction][el.dataset.port]; }); },
  'close-inspector'() { state.selected = null; renderInspector(); },
  'delete-edge'(el) { edit(g => { g.edges = g.edges.filter(e => e.id !== el.dataset.id); }); },
  'delete-node'() { if (state.graph.nodes.length === 1) return error('Conservez au moins une étape.'); edit(g => { g.nodes = g.nodes.filter(n => n.id !== state.selected); g.edges = g.edges.filter(e => e.from !== state.selected && e.to !== state.selected); state.selected = null; }); },
  undo() { state.graph = state.history.undo(state.graph); state.dirty = true; persistDraft(); renderEditor(); },
  redo() { state.graph = state.history.redo(state.graph); state.dirty = true; persistDraft(); renderEditor(); },
  view() { state.view = state.view === 'canvas' ? 'list' : 'canvas'; renderEditor();if(state.view==='canvas')requestAnimationFrame(focusSelectedNode); },
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
  async mode(el) { state.mode = el.dataset.mode; state.selected = null; if (state.mode === 'history') { await loadRunPage(); return; } renderEditor(); },
  async 'start-preview'() {
    rememberLaunchDraft();
    if (state.dirty) await save();
    const draft = state.launchDrafts[launchKey()] || { request: state.graph.parameters?.request || '', projects: [] };
    const validation = await call('workflow.validate', { project: state.project.id, graph: state.graph });
    const native = await call('workflow.validate', nativeLaunchPayload());
    state.reuseSource = state.runs.find(r => r.original.id === state.graph.id && !r.simulation)?.id;
    modal('Lancer cette version du workflow', `<div class="launch-dialog"><label for="initial-request">Quelle demande souhaitez-vous traiter ?</label><textarea id="initial-request" placeholder="Décrivez-la ici ou directement dans le terminal.">${esc(draft.request)}</textarea><p>Parlez au workflow dans votre terminal ${integration.provider() === 'claude' ? 'Anthropic · Claude' : 'OpenAI · Codex'}. Vous pourrez soumettre une ou plusieurs tâches.</p><details class="launch-projects" ${draft.projects.length ? 'open' : ''}><summary>Coordonner plusieurs projets</summary>${state.projects.filter(p => p.id !== state.project.id).map(p => `<label><input type="checkbox" name="conversation-project" value="${esc(p.id)}" ${draft.projects.includes(p.id) ? 'checked' : ''}>${esc(p.title)}</label>`).join('')}</details>${activationDetails(native)}<div id="launch-native-check">${launchDiagnostics(native.issues, 'À résoudre avant le lancement')}${launchDiagnostics(native.requirements, 'À préparer pendant le workflow', true)}</div><div class="launch-primary">${button('start-conversation', 'Lancer dans le terminal', 'primary', native.issues.length ? 'disabled' : '')}${button('check-launch', 'Vérifier à nouveau', 'flat')}</div><details class="launch-automatic"><summary>Exécution automatique sans conversation</summary>${state.graph.nodes.some(n => n.kind === 'agent') ? aiForm(true) : ''}<p><strong>${esc(state.graph.title)}</strong> · révision ${state.savedRevision} · ${state.graph.nodes.length} étapes</p><p>Ce mode démarre les étapes sans conversation. Tous ses prérequis doivent être configurés.</p>${state.reuseSource ? '<label><input type="checkbox" id="reuse-evidence">Réutiliser les preuves encore valides des blocs qui l’autorisent</label>' : ''}${launchDiagnostics(validation.issues, 'À configurer pour le mode automatique')}${button('start-real', 'Lancer l’exécution réelle', 'primary', validation.issues.length ? 'disabled' : '')}</details></div>`, button('start-simulation', 'Simuler le parcours'));
    state.launchReturn = null;
  },
  'check-launch': refreshNativeLaunch,
  async 'repair-launch'(el) {
    rememberLaunchDraft();
    const remedy = el.dataset.remedy;
    if (remedy === 'choose-projects') {
      const projects = document.querySelector('.launch-projects');
      if (projects) { projects.open = true; (projects.querySelector(`input[value="${CSS.escape(el.dataset.project)}"]`) || projects.querySelector('summary')).focus(); }
      return;
    }
    if (remedy === 'prepare-in-conversation') {
      if (!document.querySelector('#initial-request')) await actions['start-preview']();
      document.querySelector('.launch-automatic')?.removeAttribute('open');
      document.querySelector('#initial-request')?.focus();
      return;
    }
    state.launchReturn = { kind: document.querySelector('#schedule-form') ? 'schedule' : 'launch', project: state.project.id, workflow: state.graph.id, title: state.graph.title, projectTitle: state.project.title };
    if (remedy === 'connections') {
      closeModal();
      if (el.dataset.project && el.dataset.project !== state.project.id) await openProject(el.dataset.project, false);
      state.route = 'connections';
      state.capabilities = (await call('bootstrap', { project: state.project.id })).capabilities;
      shell();
    } else if (remedy === 'choose-ai') {
      modal('Choisir l’IA pour ce workflow', aiForm(true), button('return-to-launch', 'Revenir au lancement'));
    } else if (remedy === 'workflow-settings') {
      actions['workflow-settings']();
      requestAnimationFrame(() => {
        const code = el.dataset.code || '';
        document.querySelector(code.includes('series') ? '#context-series' : code.includes('online') ? '#context-route' : code.includes('copy') ? '#context-neutralized_copy' : '#context-environment')?.focus();
      });
    } else if (remedy === 'save-workflow') {
      await save(); await actions['start-preview']();
    } else if (remedy === 'choose-project') {
      const projects = state.projects.filter(p => !p.library && p.scope !== 'workspace');
      modal('Utiliser ce workflow dans un projet', `<form id="adapt-launch-form"><p>Une copie du workflow sera enregistrée dans le projet choisi. Le workflow d’origine sera conservé.</p><label for="adapt-launch-project">Projet</label><select id="adapt-launch-project" name="project" required>${options(projects.map(p => [p.id, p.title]), '')}</select><label for="adapt-launch-title">Nom du workflow</label><input id="adapt-launch-title" name="title" value="${esc(state.graph.title)}" required>${projects.length ? '' : '<p>Ajoutez un dépôt depuis la page Projets, puis revenez à ce workflow. Votre demande est conservée.</p>'}<div class="modal-actions"><button type="submit" class="primary" ${projects.length ? '' : 'disabled'}>Créer la copie et continuer</button></div></form>`, button('return-to-launch', 'Revenir au lancement'));
    } else if (remedy === 'edit-node') {
      closeModal(); state.mode = 'design'; state.selected = el.dataset.node; renderEditor();
      requestAnimationFrame(() => {
        focusSelectedNode();
        const code = el.dataset.code || '';
        const selector = code.includes('effort') ? '#node-effort' : code.includes('environment') || code.includes('production') ? '#node-environment' : code.includes('profile') || code.includes('module') ? '#node-profile' : code.includes('cli') ? '#node-provider' : code.includes('model') ? '#node-model' : null;
        const field = selector ? document.querySelector(selector) : document.querySelector('#node-title');
        for (let parent = field?.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
        field?.focus();
      });
    }
  },
  async 'return-to-launch'() {
    const origin = state.launchReturn;
    closeModal();
    if (origin && (state.project?.id !== origin.project || state.graph?.id !== origin.workflow || state.route !== 'workflow')) {
      await openProject(origin.project, false);
      await openWorkflow(await call('workflow.get', { project: origin.project, workflow: origin.workflow }));
    }
    await actions[origin?.kind === 'schedule' ? 'schedule' : 'start-preview']();
  },
  'fix-step'(el) { closeModal(); state.mode = 'design'; state.selected = el.dataset.id; renderEditor(); },
  async 'open-conversation'(el) {
    const c = await call('conversation.get', { conversation: el.dataset.id });
    await openProject(c.project, false); state.conversation = c;
    state.graph = clone(c.definition); state.run = null; state.dirty = false;
    if (c.items.length) await openRun(c.items[0].run);
    else { state.route = 'workflow'; state.mode = 'design'; shell(); }
  },
  'start-conversation': launchConversation,
  async 'conversation-terminal'() { const { project } = await call('project.get', { project: state.conversation.project }); await terminal.open(project, state.conversation.definition, state.conversation.id); },
  async 'conversation-item'(el) { if(state.compactHeight)state.compactRequestsOpen=false;await openRun(el.dataset.id); },
  'conversation-add'() { modal('Ajouter une demande', `<form id="conversation-add-form"><label>Demande<textarea name="request" required></textarea></label><label>Projet<select name="project">${options(state.conversation.projects.map(id => [id, state.projects.find(p => p.id === id)?.title || state.project.title]), state.project.id)}</select></label><label>Après la tâche<select name="depends"><option value="">Indépendante</option>${options(state.conversation.items.map(i => [i.id, i.request.slice(0, 80)]))}</select></label><button class="primary">Enregistrer la demande</button></form>`); },
  'start-simulation': () => launch(true),
  'start-real': () => launch(false),
  async pause() { state.run = await call('run.control', { run: state.run.id, control: state.run.status === 'paused' ? 'resume' : 'pause' }); renderEditor(); },
  async reconcile() { state.run = await call('run.reconcile', { run: state.run.id, node: state.selected }); renderInspector(); },
  retry() { modal('Demander une reprise', `<form id="retry-form"><p>Le résultat précédent reste dans l'historique. La limite de tentatives du bloc s'applique.</p><label for="retry-note">Correction attendue</label><textarea id="retry-note" name="note" required></textarea><div class="modal-actions"><button class="primary" type="submit">Relancer cette étape</button></div></form>`); },
  timeline: showTimeline,
  async 'timeline-more'() {const id=state.run.id;const data=await call('run.get',{run:id,after:state.events.at(-1)?.seq || 0});if(state.run?.id!==id)return;mergeEvents(data);showTimeline();},
  'export-release'() { modal('Exporter une release lisible', `<form id="export-form"><p>Un README rassemble intention, plan, résultats, tests et décisions. Les données et preuves sont regroupées dans <code>.suivi/</code>.</p><label for="project-path">Dossier du projet</label><div class="row"><input id="project-path" name="path" value="${esc(state.project.path || '')}" readonly required><button type="button" data-action="choose-folder">Choisir…</button></div><label for="release-id">Identifiant de release</label><input id="release-id" name="release" value="release-${new Date().toISOString().slice(0, 10)}" required><div class="modal-actions"><button class="primary" type="submit">Exporter</button></div></form>`); },
  assistant() {
    modal('Assistant IA', `<div class="assistant-panel"><p>Décrivez le besoin. L’IA propose des blocs, des connecteurs et leurs paramètres ; vous examinez les changements avant application.</p><form id="assistant-form"><label for="assistant-request">Votre demande</label><textarea name="request" id="assistant-request" required placeholder="Si une demande arrive, préviens-moi sur Slack…"></textarea><div class="row"><div class="fill"><label for="assistant-provider">Fournisseur</label><select name="provider" id="assistant-provider"><option value="codex">OpenAI · Codex</option><option value="claude">Anthropic · Claude</option></select></div><div class="fill"><label for="assistant-model">Modèle de l’assistant</label><input name="model" id="assistant-model" required placeholder="Identifiant du modèle"></div></div><p class="muted">Session limitée au texte, sans outils. Le contexte de conception sera transmis au fournisseur choisi. Cet appel peut consommer votre abonnement ; aucun workflow n'est activé.</p><div class="modal-actions"><button type="submit" class="primary">Demander une proposition IA</button></div></form><details style="margin-top:22px"><summary>Examiner une proposition structurée</summary><p class="muted">Un patch peut ajouter des étapes ou connexions. Il ne lance aucune exécution et ne retire pas vos critères ou autorisations.</p><form id="patch-form"><label for="patch-json">Proposition JSON</label><textarea id="patch-json" name="patch" spellcheck="false" placeholder='{"baseRevision": ${state.savedRevision}, "operations": []}'></textarea><div class="modal-actions"><button type="submit">Prévisualiser</button></div></form></details></div>`);
  },
  'apply-patch'() { const proposed = state.pendingPatch; edit(g => Object.assign(g, proposed)); delete state.pendingPatch; closeModal(); toast('Proposition appliquée au brouillon. Aucune exécution lancée.'); },
  'close-modal': closeModal,
};

function mergeEvents(data) {state.events=[...new Map([...state.events,...data.events].map(e=>[e.seq,e])).values()].sort((a,b)=>a.seq-b.seq);state.eventsNext=data.events_next;}
function showTimeline() { modal('Journal d’exécution', `<ol class="timeline">${state.events.map(e => `<li><strong>${esc(states[e.type] || ({ started: 'Exécution commencée', decision: 'Décision humaine', completed: 'Exécution terminée', retry: 'Reprise demandée', pause: 'Exécution suspendue', resume: 'Exécution reprise' })[e.type] || e.type)}</strong>${e.node ? ` · ${esc(state.run.definition.nodes.find(n => n.id === e.node)?.title || e.node)}` : ''}<time>${new Date(e.at * 1000).toLocaleString('fr-CH')}</time>${esc(e.outcome || e.note || '')}</li>`).join('')}</ol>`, state.eventsNext ? button('timeline-more','Charger les événements suivants') : '', true); }

async function launch(simulation) {
  const run = await call('run.start', { project: state.project.id, graph: state.graph, simulation, parameters: { ...state.graph.parameters, request: document.querySelector('#initial-request')?.value.trim() || state.graph.parameters?.request || '' }, reuse_from: !simulation && document.querySelector('#reuse-evidence')?.checked ? state.reuseSource : null, authorize_notifications: document.querySelector('#authorize-notifications')?.checked === true }, true);
  state.run = run; state.runs.unshift(run); state.events = []; state.mode = 'run'; state.selected = run.definition.nodes[0].id; closeModal(); renderEditor();
}

document.addEventListener('click', event => {
  const el = event.target.closest('[data-action]'); if (!el) return;
  const action = actions[el.dataset.action]; if (!action) return;
  event.preventDefault(); if (el.dataset.pending) return; el.dataset.pending = '1';
  enqueue(async () => { try { if (!['undo', 'redo', 'delete-node', 'close-modal'].includes(el.dataset.action)) flushNodeForm(); await action(el); } finally { delete el.dataset.pending; } });
});
function positionWorkflowOptions() {
  const details = document.querySelector('.workflow-options[open]'); if (!details) return;
  const menu = details.querySelector('div');
  const bounds = host.getBoundingClientRect(), control = details.getBoundingClientRect();
  const left = Math.max(bounds.left + 8, Math.min(control.left, bounds.right - menu.offsetWidth - 8));
  menu.style.left = (left - control.left) + 'px';
}
document.addEventListener('toggle', event => {
  if (event.target.matches('.workflow-options')) positionWorkflowOptions();
}, true);
new ResizeObserver(() => {
  positionWorkflowOptions();
  const compact=host.clientHeight>0 && host.clientHeight<480;
  if(compact!==!!state.compactHeight) {
    state.compactHeight=compact;document.body.classList.toggle('compact-height',compact);
    if(state.route==='workflow')renderConversation();
  }
}).observe(host);

document.addEventListener('change', event => {
  if (event.target.name === 'conversation-project') {
    document.querySelector('[data-action="start-conversation"]')?.setAttribute('disabled', '');
    rememberLaunchDraft(); enqueue(refreshNativeLaunch);
  }
  if (event.target.closest('#connect-form') && ['from','to'].includes(event.target.name)) refreshConnectionForm();
  if (event.target.id === 'workflow-provider') {
    document.querySelector('#workflow-model').value = state.providerDefaults?.[event.target.value] || '';
    // Require explicit application before a paid launch with changed fields.
    document.querySelector('[data-action="start-real"]')?.setAttribute('disabled', '');
  }
});
document.addEventListener('input', event => {
  if (event.target.closest('#node-form')) { const form=event.target.closest('#node-form');localStorage.setItem(draftKey(),JSON.stringify({graph:state.graph,revision:state.savedRevision,form:{node:state.selected,values:formDraft(form)}})); document.querySelector('[data-action=save]')?.removeAttribute('disabled'); const heading = document.querySelector('.workflow-heading p'); if (heading) heading.textContent = 'Modifications non enregistrées'; }
  if (event.target.id === 'workflow-model') document.querySelector('[data-action="start-real"]')?.setAttribute('disabled', '');
});

document.addEventListener('submit', event => {
  event.preventDefault(); const form = event.target; const submitterValue=event.submitter?.value; const data = Object.fromEntries(new FormData(form));
  enqueue(async () => {
    if (form.id === 'run-filters') {state.runFilters={query:data.query,status:data.status,simulation:data.simulation,archived:data.archived === 'on'};await loadRunPage();}
    if (form.id === 'conversation-search') { state.conversation=await call('conversation.get',{conversation:state.conversation.id,query:data.query});state.conversation.query=data.query;renderConversation(); }
    if (form.id === 'conflict-form') { const choices=Object.fromEntries((state.conflict.conflicts || []).map((c,i)=>[c.path,data['choice-'+i]]).filter(([,v])=>v)); const oldKey=draftKey(); const graph=await call('workflow.resolve',{project:state.project.id,graph:state.graph,revision:state.savedRevision,digest:state.conflict.digest,strategy:submitterValue,choices},true); if(submitterValue !== 'disk') localStorage.removeItem(oldKey); else localStorage.setItem(oldKey+':previous',localStorage.getItem(oldKey)); localStorage.removeItem(oldKey);closeModal();await openProject(state.project.id,false);await openWorkflow(graph);toast('Conflit résolu ; une nouvelle révision a été enregistrée.'); }
    if (form.id === 'new-work-form') {
      if (data.project === 'workspace') await call('workspace.get');
      const model=state.workModels.find(g => g.id === data.template); const graph = model.summary ? await call('workflow.get',{project:model._project,workflow:model.id}) : clone(model); delete graph._project;
      graph.id = 'work-' + crypto.randomUUID(); delete graph.revision;
      graph.title = data.title.trim();
      graph.parameters = { ...graph.parameters, request: data.request.trim() };
      const saved = await call('workflow.save', { project: data.project, graph });
      closeModal(); await openProject(data.project, false); openWorkflow(saved);
      toast('Workflow enregistré dans le dossier choisi. Adaptez-le ou choisissez Exécuter.'); return;
    }
    if (form.id === 'adapt-launch-form') {
      const draft = state.launchDrafts[launchKey()];
      const graph = clone(state.graph); graph.id = 'work-' + crypto.randomUUID(); graph.title = data.title.trim(); delete graph.revision; delete graph.driver;
      const saved = await call('workflow.save', { project: data.project, graph });
      closeModal(); await openProject(data.project, false); await openWorkflow(saved);
      if (draft) state.launchDrafts[launchKey()] = { ...draft, projects: draft.projects.filter(id => id !== data.project) };
      state.launchReturn = null; await actions['start-preview'](); return;
    }
    if (form.id === 'work-export-form') { const path = await call('work.export', { run: state.run.id, name: data.name }); closeModal(); toast('Rapport exporté : ' + path); return; }
    if (form.id === 'port-form') { edit(g => { const n = g.nodes.find(n => n.id === state.selected); n[data.direction] ||= {}; n[data.direction][data.port] = data.type; }); closeModal(); return; }
    if (form.id === 'conversation-add-form') { await call('conversation.add', { conversation: state.conversation.id, request: data.request, project: data.project, depends_on: data.depends ? [data.depends] : [] }); closeModal(); await pollConversation(); return; }
    if (form.id === 'question-form') { const q = state.run.nodes[state.selected].question; await call('run.answer', { run: state.run.id, node: state.selected, question: q.id, text: data.answer }); await poll(); renderInspector(); return; }
    if (form.id === 'workflow-ai-form') { const next = withWorkflowAI(state.graph, data); edit(g => Object.assign(g, next)); await save(); await integration.setProvider(data.provider); closeModal(); if (data.preview === 'yes') await actions['return-to-launch'](); return; }
    if (form.id === 'connection-context-form') { if (data.project === 'workspace') await call('workspace.get'); if (data.project === 'library') await call('template.workspace'); Object.assign(state, await call('project.get', { project: data.project })); renderConnections(); terminal.host.hidden = true; }
    if (form.id === 'handoff-form') { const graph = await call('run.handoff', { run: state.run.id, project: data.project, graph: state.templates.find(t => t.id === data.template) }, true); closeModal(); await openProject(data.project, false); openWorkflow(graph); toast('Brouillon créé avec sa source globale.'); }
    if (form.id === 'import-workflow-form') { const graph = await call('workflow.import-portable', { project: data.context, bundle: state.importBundle }); state.importBundle = null; closeModal(); await openProject(data.context, false); openWorkflow(graph); toast('Brouillon importé. Aucun workflow ni planification activée.'); }
    if (form.id === 'project-form') { const project = await call('project.create', data); state.projects.push(project); closeModal(); await openProject(project.id); }
    if (form.id === 'node-form') { applyNodeForm(form); toast('Bloc modifié. Enregistrez le workflow pour créer une révision.'); }
    if (form.id === 'workflow-form') { const parameters = JSON.parse(data.parameters); if (!parameters || Array.isArray(parameters) || typeof parameters !== 'object') throw new Error('Les paramètres doivent être un objet.'); for (const [key,value] of Object.entries(data)) if (key.startsWith('context_')) { const name=key.slice(8); if (value.trim()) parameters[name]=value.trim(); else delete parameters[name]; } if (data.question_notification && !data.question_recipient.trim()) throw new Error('Renseigner le destinataire de notification.'); edit(g => { Object.assign(g, { title: data.title, description: data.description, parameters }); if (data.question_notification) { g.on_question = { ...JSON.parse(data.question_notification), recipient: data.question_recipient.trim() }; } else delete g.on_question; }); closeModal(); }
    if (form.id === 'add-node-form') {
      const id = 'step-' + Date.now().toString(36); edit(g => { const count = g.nodes.length; const n = { id, title: data.title, kind: data.kind, position: { x: 60 + count % 4 * 300, y: 80 + Math.floor(count / 4) * 190 }, criteria: [] }; if (data.kind === 'agent-route') { n.kind = 'agent'; n.route_output = 'choice'; n.options = ['yes', 'no', 'unknown']; n.outputs = { choice: 'string', reason: 'string' }; n.validation = 'contract'; } if (data.kind === 'agent') n.validation = 'contract'; if (data.kind === 'question') { n.question = data.title; n.outputs = {answer: 'string'}; } if (data.kind === 'command') n.argv = ['python3', '-c', 'print("Hello")']; if (data.kind === 'condition') { n.parameter = 'choice'; n.options = ['yes', 'no']; } if (data.kind === 'subworkflow') n.workflow = 'analysis'; g.nodes.push(n); state.selected = id; }); closeModal();
    }
    if (form.id === 'connect-form') {
      const proposed = clone(state.graph); const mapping = JSON.parse(data.mapping); if (data.output && data.input) mapping[data.output] = data.input; proposed.edges.push({ id: 'edge-' + Date.now().toString(36), from: data.from, to: data.to, outcome: data.outcome, mapping }); await call('workflow.validate', { graph: proposed, simulation: true }); edit(g => { g.edges = proposed.edges; }); closeModal();
    }
    if (form.id === 'decision-form') {
      const s = state.run.nodes[state.selected]; state.run = await call('run.decide', { run: state.run.id, node: state.selected, nonce: s.nonce, proposal: s.proposal, outcome: submitterValue, note: data.note }, true); renderGraph(); renderInspector(); toast('Décision enregistrée.');
    }
    if (form.id === 'receipt-form') { const node = state.run.definition.nodes.find(n => n.id === state.selected); state.run = await call('run.accept', { run: state.run.id, node: state.selected, checks: node.criteria || [], note: data.note }, true); renderGraph(); renderInspector(); toast('Validation enregistrée.'); }
    if (form.id === 'retry-form') { state.run = await call('run.retry', { run: state.run.id, node: state.selected, note: data.note }, true); closeModal(); renderGraph(); renderInspector(); }
    if (form.id === 'export-form') { const path = await call('release.export', { run: state.run.id, ...data }); closeModal(); toast('Release exportée : ' + path); }
    if (form.id === 'schedule-form') { await call('schedule.create', { project: state.project.id, graph: state.graph, simulation: data.simulation === 'on', authorize_notifications: data.authorize_notifications === 'on', rule: { kind: data.kind, time: data.time, minutes: Number(data.minutes), timezone: data.timezone, weekdays: [0, 1, 2, 3, 4] } }, true); closeModal(); await actions['refresh-schedules'](); toast('Planification activée. Elle apparaît aussi dans l’icône Ubuntu.'); }
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
  if (!dialog && state.route === 'workflow' && state.mode === 'design' && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); enqueue(save); return; }
  if (event.target.matches('input,textarea,select') || dialog || state.route !== 'workflow' || state.mode !== 'design') return;
  if ((event.ctrlKey || event.metaKey) && ['s', 'z', 'y'].includes(event.key.toLowerCase())) { event.preventDefault(); safe(() => event.key.toLowerCase() === 's' ? save() : event.key.toLowerCase() === 'y' || event.shiftKey ? actions.redo() : actions.undo()); }
});

document.addEventListener('pointerdown', event => {
  const handle = event.target.closest('.drag-handle'); if (!handle || state.mode !== 'design') return;
  event.preventDefault(); try { flushNodeForm(); } catch (e) { error(e.message); return; } const card = handle.closest('.node'); const node = state.graph.nodes.find(n => n.id === card.dataset.id); const before = clone(state.graph);
  const start = nodePosition(node, state.graph.nodes.indexOf(node)); const pointer = { x: event.clientX, y: event.clientY }; let moved = false;
  function move(e) { moved = true; node.position = { x: Math.max(0, Math.round(start.x + (e.clientX - pointer.x) / state.zoom)), y: Math.max(30, Math.round(start.y + (e.clientY - pointer.y) / state.zoom)) }; card.style.left = node.position.x + 'px'; card.style.top = node.position.y + 'px'; }
  function end() { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); if (moved) { state.history.push(before); state.dirty = true; persistDraft(); renderEditor(); } }
  document.addEventListener('pointermove', move); document.addEventListener('pointerup', end, { once: true });
});

let conversationPolling = false;
async function pollConversation() {
  if (!state.conversation || conversationPolling) return;
  conversationPolling = true;
  try {
    const id = state.conversation.id, epoch = viewEpoch, graph = state.graph?.id;
    const c = await call('conversation.get', { conversation: id, offset:state.conversation.offset || 0, query:state.conversation.query || '' }); c.query = state.conversation.query || '';
    if (state.conversation?.id !== id || epoch !== viewEpoch) return;
    const changed = JSON.stringify(c) !== JSON.stringify(state.conversation);
    state.conversation = c;
    if (state.route === 'workflow' && !state.run && c.items.length) await openRun(c.items[0].run, () => epoch === viewEpoch && state.route === 'workflow' && state.graph?.id === graph && state.conversation?.id === id && !state.run);
    else if (changed && state.route === 'workflow') renderConversation();
  } finally { conversationPolling = false; }
}
setInterval(() => safe(pollConversation), 1000);

async function poll() {
  if (!state.run || state.polling || state.route !== 'workflow') return;
  state.polling = true;
  try {
    const id = state.run.id, epoch = viewEpoch; const data = await call('run.get', { run: id, after: state.events.at(-1)?.seq || 0 });
    if (state.run?.id !== id || state.route !== 'workflow' || epoch !== viewEpoch) return;
    const previous = state.run; state.run = data.run; mergeEvents(data);
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
    const banner = document.querySelector('#run-banner'); if (banner) {banner.dataset.error='true';banner.textContent = 'Suivi temporairement indisponible. L’activité des outils est inconnue ; les données enregistrées sont conservées.';}
  } finally { state.polling = false; }
}

const syncTheme = () => { host.dataset.theme = window.document.documentElement.dataset.theme || 'light'; };
syncTheme();
new MutationObserver(syncTheme).observe(window.document.documentElement, {attributes:true, attributeFilter:['data-theme']});
app.innerHTML = '<main class="page"><h1>Tricorder</h1><p>Ouverture de votre espace local…</p><div id="feedback"></div></main>';
const ready = safe(async () => { const data = await call('bootstrap'); Object.assign(state, data); shell(); const pending = await api.portable({ action: 'pending' }); if (pending) previewImport(pending); state.update = await api.updates({ action: 'status' }); updateIndicator(); });
setInterval(poll, 1000);
let overviewPolling = false;
let overviewNeedsRender = false;
setInterval(async () => {
  if (state.route !== 'overview' || overviewPolling || document.querySelector('.modal')) return;
  overviewPolling = true;
  try {
    const data = await call('overview.get',{offset:state.activity?.offset || 0});
    if (state.route !== 'overview') return;
    const changed = JSON.stringify(data.activity) !== JSON.stringify(state.activity) || JSON.stringify(data.schedules) !== JSON.stringify(state.schedules);
    Object.assign(state, data);
    overviewNeedsRender ||= changed;
    if (overviewNeedsRender && !document.querySelector('#studio-content')?.contains(document.activeElement)) { renderOverview(); overviewNeedsRender = false; }
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
api.onNavigate(destination => { viewEpoch++; enqueue(async () => {
  await ready;
  if (state.dirty) await save();
  if (destination.route === 'import-workflow') { const pending = await api.portable({ action: 'pending' }); if (pending) previewImport(pending); return; }
  if (destination.route === 'global') { Object.assign(state, await call('workspace.get')); state.route = 'project'; shell(); return; }
  if (destination.route === 'run') { await openProject(destination.project, false); await openRun(destination.run); if (destination.node) { state.selected=destination.node; renderInspector(); } }
  else { state.route = destination.route; shell(); }
}); });

function previewImport(preview) {
  state.importBundle = preview.bundle;
  const graph = preview.bundle.workflow, needs = preview.requirements;
  modal('Importer un workflow portable', `<p><strong>${esc(graph.title)}</strong> · ${graph.nodes.length} bloc${graph.nodes.length > 1 ? 's' : ''} · ${graph.edges.length} lien${graph.edges.length > 1 ? 's' : ''}</p><p>${esc(graph.description || '')}</p><p>Modèles : ${esc(needs.models.map(m => m.provider + ' / ' + m.model).join(', ') || 'aucun')}<br>Agents dédiés : ${esc(needs.profiles.join(', ') || 'aucun')}<br>Capacités : ${esc(needs.capabilities.map(c => c.plugin + ' / ' + c.operation).join(', ') || 'aucune déclarée')}</p><p class="muted">Les connexions devront être vérifiées sur cet ordinateur. L’import crée un brouillon sans reprendre les exécutions, les accords ou les planifications du poste d’origine.</p><details><summary>Examiner les étapes et leur configuration</summary><pre>${esc(JSON.stringify(graph, null, 2))}</pre></details><form id="import-workflow-form"><label for="import-context">Destination</label><select id="import-context" name="context">${options([['workspace', 'Workflows globaux'], ['library', 'Bibliothèque de modèles'], ...state.projects.map(p => [p.id, p.title])], state.project?.id || 'workspace')}</select><div class="modal-actions"><button class="primary" type="submit">Importer le brouillon</button></div></form>`);
}

function updateIndicator() {
  const target = document.querySelector('#update-indicator');
  if (target) target.innerHTML = state.update?.status === 'available' ? button('updates', `Mise à jour ${esc(state.update.latest)}`, 'flat') : '';
}
function previewUpdate() {
  const update = state.update || {};
  modal('Mises à jour de Tricorder', `<p>Version installée : <strong>${esc(update.current || 'inconnue')}</strong></p><p>${update.status === 'available' ? `La release stable ${esc(update.latest)} est disponible.` : update.status === 'current' ? 'Aucune version stable plus récente détectée.' : esc(update.reason || 'Vérification disponible hors mode de test.')}</p><p class="muted">Tricorder vérifie GitHub à son lancement. Le téléchargement et l’installation restent explicites ; vos workflows ne sont pas redémarrés automatiquement.</p>${update.notes ? `<details><summary>Notes de la release</summary><pre>${esc(update.notes)}</pre></details>` : ''}`, button('check-updates', 'Vérifier maintenant') + (update.url ? button('update-notes', 'Ouvrir la release GitHub') : '') + (update.status === 'available' && update.download ? button('download-update', 'Télécharger le paquet Ubuntu', 'primary') : ''));
}

return { ready, showUpdates: () => actions.updates(), async navigate(route, project) {
  await ready; await actionQueue; flushNodeForm();
  Object.assign(state, await call('bootstrap', {project: state.project?.id}));
  if (state.dirty) await save();
  if (project) { await openProject(project); return; }
  await actions.navigate({ dataset: { route } });
}, get context() { return { project: state.project, graph: state.graph, run: state.run }; } };
}

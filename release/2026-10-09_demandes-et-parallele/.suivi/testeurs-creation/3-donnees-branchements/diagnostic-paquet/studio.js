import { businessDataView, businessProofView, decisionLabel } from './business-results.mjs';
import { executionLayout } from './execution-layout.mjs';
import { activityText, conversationOverviewView, dependencyBlocked } from './conversation-view.mjs';
import { attemptHistoryView } from './execution-attempts.mjs';
import DOMPurify from 'dompurify';
import { executionAction, executionIssue, failedResult, retryGuidance, launchReadiness } from './execution-view.mjs';
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
function enqueue(fn) { actionQueue = actionQueue.then(() => safe(fn)); return actionQueue; }

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
function nodeFailed(node, definition) { return node && !['accepted','skipped'].includes(node.status) && failedResult(node, definition); }
function nodeLabel(node, definition, run=state.run) {
  if(nodeFailed(node,definition))return 'Échec';
  const ready=node?.status==='ready' && launchReadiness(run,definition?.id);
  return ready ? ({configuration:'À configurer',native:'Dans le terminal',waiting:'En attente',unknown:'À vérifier',ready:'Prêt'}[ready.status] || states.ready) : states[node?.status || 'pending'];
}
function nodeBadge(node, definition) { return `<span class="pill ${nodeFailed(node,definition) ? 'failed' : esc(node?.status || 'pending')}">${esc(nodeLabel(node,definition))}</span>`; }
function frozenRevision(run) { return run?.definition?.revision ? `Révision ${run.definition.revision} figée` : 'Version figée'; }
function badge(status) { return `<span class="pill ${esc(status)}">${esc(states[status] || status)}</span>`; }
function updateRunBanner() {
  const banner = document.querySelector('#run-banner');
  if (state.mode === 'run') renderExecutionOverview();
  if (banner && state.run) banner.innerHTML = `${state.run.simulation ? '<strong>Simulation.</strong> Aucun modèle ni service métier appelé. ' : '<strong>Exécution réelle.</strong> '}${esc(runLabel(state.run))}. ${Object.values(state.run.nodes).filter(n => ['waiting', 'waiting_input', 'returned'].includes(n.status)).length} bloc(s) attendent votre intervention.`;
  const pause = document.querySelector('[data-action=pause]');
  if (pause && state.run && !['active','paused'].includes(state.run.status)) pause.remove();
  if(pause && state.run?.status==='paused' && blockedDependencies().length) {pause.disabled=true;pause.title='Une demande préalable annulée ou refusée empêche la reprise. Consultez les dépendances.';}
  if(banner)delete banner.dataset.error;
  const heading = document.querySelector('.workflow-heading p');
  if (heading && state.mode === 'run') heading.textContent = `${frozenRevision(state.run)} · ${runLabel(state.run)}${state.conversation ? '' : ' · '+new Date(state.run.created * 1000).toLocaleString('fr-CH')}`;
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
  const title = state.route === 'workflow' ? projectTitle(state.project) : { overview: 'Activité', projects: 'Projets', project: projectTitle(state.project), library: 'Modèles de workflows', catalog: 'Workflows', connections: 'Connexions', schedules: 'Planifications' }[state.route];
  const activeRoute = ['library','catalog'].includes(state.route) ? 'global' : ['workflow', 'project'].includes(state.route) ? (state.project?.library ? 'global' : state.project?.scope === 'workspace' ? 'global' : 'projects') : state.route;
  const navItem = (route, label, accessible = label) => `<button data-action="navigate" data-route="${route}" class="nav-item ${activeRoute === route ? 'active' : ''}" ${activeRoute === route ? 'aria-current="page"' : ''} aria-label="${accessible}" title="${label}">${navIcon(route)}<span class="nav-label">${label}</span></button>`;
  app.innerHTML = `<main class="workspace embedded-workspace"><div id="feedback"></div><div id="studio-content"></div></main>`;
  integration.context({ projects: state.projects, project: state.project, graph: currentGraph(), run: state.run, conversation: state.conversation, route: state.route, activeRoute, title });
  if (state.route === 'overview') renderOverview();
  if (state.route === 'projects') renderProjects();
  if (state.route === 'project') renderProject();
  if (state.route === 'catalog') renderWorkflowCatalog();
  if (state.route === 'library') renderLibrary();
  if (state.route === 'connections') renderConnections();
  if (state.route === 'schedules') renderSchedules();
  if (state.route === 'workflow') renderEditor();
  updateIndicator();
  terminal.mount(document.querySelector('.workspace'));
  if (state.route !== 'workflow') terminal.host.hidden = true;
  if (state.project?.id !== terminal.active) terminal.host.hidden = true;
}

function content(html) { const target = document.querySelector('#studio-content'); target.classList.toggle('execution-view', state.route === 'workflow' && state.mode === 'run' && !!state.run); target.innerHTML = html; }
async function readActivity(offset=0) {
  const [overview,conversations]=await Promise.all([call('overview.get',{offset}),call('conversation.list')]);
  return {...overview,pendingConversations:conversations.filter(c=>!c.archived && c.status==='open' && c.item_count===0)};
}
function pendingConversations() {
  const conversations=state.pendingConversations || [];
  return conversations.length ? `<section class="activity-section"><h2>Conversations ouvertes</h2><p class="muted">Aucune tâche enregistrée pour l’instant. Retrouvez votre terminal pour poursuivre l’échange.</p><div class="activity-list">${conversations.map(c=>`<button class="activity-row" data-action="open-conversation" data-id="${esc(c.id)}"><span class="activity-identity"><strong>${esc(c.definition.title)}</strong><small>${esc(state.projects.find(p=>p.id===c.project)?.title || 'Sans projet')} · ${c.provider==='claude'?'Anthropic · Claude':'OpenAI · Codex'}</small></span><span class="activity-state"><strong>Reprendre la conversation</strong><small>Aucune étape en cours</small></span><span aria-hidden="true">→</span></button>`).join('')}</div></section>` : '';
}
function projectTitle(project) { return project?.scope==='workspace' || project?.id==='workspace' ? 'Sans projet' : project?.library ? 'Modèles' : project?.title || ''; }
function renderOverview() {
  const activity=state.activity || {runs:[],workflow_count:0};
  if(!state.projects.length && !activity.workflow_count && !activity.runs.length && !state.pendingConversations?.length){renderProjects();return;}
  const needsAttention=r=>['active','paused'].includes(r.status) && (r.status==='paused' || r.health?.status==='failed' || ['waiting','waiting_input','returned','blocked','failed'].includes(r.focus?.status) || Object.values(r.nodes || {}).some(n=>['waiting','waiting_input','returned','blocked'].includes(n.status)));
  const waiting=activity.runs.filter(needsAttention), other=activity.runs.filter(r=>!needsAttention(r));
  content(`<section class="page activity-page"><div class="page-heading"><div><h1>Activité</h1><p>Votre travail en cours et ce qui attend votre intervention.</p></div><div class="row">${button('new-request','Nouvelle demande','primary')}${button('refresh-overview','Actualiser')}</div></div>${pendingConversations()}${waiting.length ? `<section class="activity-section"><h2>À traiter</h2><p class="muted">${activity.attention_total || waiting.length} demande(s) attendent une intervention${activity.attention_total>waiting.length ? ` · ${waiting.length} sur cette page` : ''}.</p>${activityTable(waiting)}</section>` : ''}<section class="activity-section"><div class="row between"><h2>${waiting.length?'Autres demandes':'Demandes récentes'}</h2><span class="muted">${activity.total || 0} demandes enregistrées</span></div>${activityTable(other)}</section><div class="row">${activity.offset ? button('overview-page','Précédentes','',`data-offset="${Math.max(0,activity.offset-25)}"`) : ''}${activity.next!=null ? button('overview-page','Suivantes','',`data-offset="${activity.next}"`) : ''}</div></section>`);
}
function activityTable(runs) {
  if(!runs.length)return '<p class="muted activity-empty">Aucune demande à afficher. « Nouvelle demande » vous permet de choisir un workflow et de démarrer dans le terminal.</p>';
  return `<div class="activity-list">${runs.map(r=>`<button class="activity-row" data-action="activity-run" data-project="${r.project}" data-id="${r.id}"><span class="activity-identity"><strong>${esc((r.request || r.parameters?.request || r.definition.title).split('\n')[0])}</strong><small>${esc(r.project==='workspace'?'Sans projet':r.project_title)} · ${esc(r.definition.title)}${r.definition.revision ? ' · Rév. '+esc(r.definition.revision) : ''}${r.simulation?' · Simulation':''}</small></span><span class="activity-state"><strong>${esc(runLabel(r))}</strong><small>${esc(r.focus?.title || '')}</small></span><span aria-hidden="true">→</span></button>`).join('')}</div>`;
}
function renderProjects() {
  content(`<section class="page">${!state.projects.length ? `<div class="hero"><div><div class="eyebrow">De l'intention à la réalisation</div><h1>Un workflow clair.<br>Un travail que vous pouvez suivre.</h1><p class="muted" style="font-size:14px">Composez les étapes, choisissez qui intervient et gardez la main sur les décisions importantes.</p><div class="row">${button('new-request','Nouvelle demande','primary')}${button('new-work', '+ Créer un workflow')}${button('try-example', 'Essayer un exemple')}</div><p class="muted" style="margin-bottom:0">L'exemple est simulé : aucun modèle payant, aucune publication.</p></div><div class="mini-flow" aria-hidden="true"><span>✦ Analyser</span>→<span class="human">? Décider</span>→<span>✓ Valider</span></div></div>` : ''}
    <div class="page-heading"><div><h2>Vos projets</h2>${button('toggle-archives',state.showArchives ? 'Masquer les archives' : 'Voir les archives','flat')}<p>Un projet est la racine d’un dépôt Git local. Il réunit ses workflows, ses exécutions et leurs résultats.</p></div><div class="heading-actions">${button('new-project', '+ Nouveau projet', 'primary')}${button('import-workflow', 'Importer un workflow')}</div></div>
    ${state.projects.length ? `<div class="project-list">${state.projects.filter(p=>state.showArchives || !p.archived).map(p => `<button class="project-card" data-action="open-project" data-id="${p.id}"><div><h3>${esc(p.title)}${p.archived ? ' <span class="pill">Archivé</span>' : ''}</h3><small>${p.path ? esc(p.path) : 'Dépôt Git local · aucun pack métier requis'}</small></div><span aria-hidden="true">→</span></button>`).join('')}</div>` : '<div class="card"><h3>Votre premier projet commence ici</h3><p>Ajoutez un dépôt existant ou créez un projet pour y enregistrer vos workflows et suivre leur exécution.</p></div>'}${state.projects.length ? `<div class="overview-links">${button('try-example', 'Essayer un exemple', 'flat')}</div>` : ''}</section>`);
}
function renderProject() {
  const global=state.project.scope==='workspace';
  content(`<section class="page project-work-page">${global ? workflowNavigation('global') : ''}<div class="page-heading"><div><h1>${global ? 'Mes workflows' : esc(projectTitle(state.project))}</h1><p>${global ? 'Workflows utilisables sans projet. Chaque lancement conserve ses propres demandes et résultats.' : esc(state.project.path)}</p></div><div class="row">${button('new-request','Nouvelle demande','primary')}${button('new-work','Créer un workflow')}<details class="compact-menu project-menu"><summary>Options</summary><div>${button('repository-workflows','Workflows du dépôt')}${button('import-workflow','Importer un workflow')}${button('import-pack','Ajouter un pack')}${!global ? button('archive-item',state.project.archived?'Restaurer le projet':'Archiver le projet','flat',`data-kind="project" data-id="${state.project.id}" data-archived="${!!state.project.archived}"`) : ''}${integration.hasLegacy?.(state.project.path) ? button('legacy-project','Releases et suivi Odoo') : ''}</div></details></div></div>
    ${state.repositoryProject===state.project.id && state.repositoryFiles?.some(f=>f.status==='new') ? `<div class="notice">Des workflows sont disponibles dans ce dépôt. ${button('repository-workflows','Examiner les workflows du dépôt')}</div>` : ''}
    ${!global ? `<section class="project-activity"><h2>Reprendre le travail</h2>${(state.conversations || []).length ? `<div class="conversation-list">${state.conversations.map(c=>`<button data-action="open-conversation" data-id="${esc(c.id)}"><strong>${esc(c.request_excerpt || c.definition.title)}</strong><span>${esc(c.definition.title)} · ${new Date(c.created*1000).toLocaleString('fr-CH')} · ${c.status==='open' ? 'Ouverte' : 'Terminée'} · ${c.item_count ?? c.items?.length ?? 0} demandes · Ouvrir le suivi et le terminal →</span></button>`).join('')}</div>` : ''}${state.runs.length ? runTable(state.runs) : '<p class="muted">Aucune demande en cours. « Nouvelle demande » ouvre votre workflow et son terminal.</p>'}<details class="history-filters"><summary>Rechercher dans les exécutions</summary>${runTools()}</details></section>` : ''}
    <section class="project-workflows"><div class="row between"><h2>${global ? 'Sans projet' : 'Workflows disponibles'}</h2>${button('workflow-archives',state.showWorkflowArchives?'Masquer les archives':'Voir les archives','flat')}${state.workflow_page?.next!=null ? button('workflow-more','Workflows suivants','',`data-offset="${state.workflow_page.next}"`) : ''}${state.workflow_page?.offset ? button('workflow-more','Première page','','data-offset="0"') : ''}</div><div class="workflow-list">${state.workflows.map(g=>`<article class="workflow-row"><div><h3>${esc(g.title)}${g.archived ? ' <span class="pill">Archivé</span>' : ''}</h3><p>${g.node_count || g.nodes.length} étapes${g.description ? ' · '+esc(g.description) : ''}</p></div><div class="row">${button('run-workflow','Exécuter…','primary',`data-project="${esc(state.project.id)}" data-id="${g.id}"`)}${button('open-workflow','Ouvrir le workflow','',`data-project="${esc(state.project.id)}" data-id="${g.id}"`)}<details class="compact-menu"><summary aria-label="Options de ${esc(g.title)}">⋯</summary><div>${button('archive-item',g.archived?'Restaurer':'Archiver','flat',`data-kind="workflow" data-id="${g.id}" data-archived="${!!g.archived}"`)}</div></details></div></article>`).join('') || `<div class="empty-workflows"><p>Aucun workflow enregistré ici.</p>${button('library-project','Choisir un modèle')}${button('blank-workflow','Créer un workflow vide')}</div>`}</div></section>
    ${global && state.runs.length ? `<section class="project-activity"><h2>Exécutions récentes</h2>${runTable(state.runs)}<details><summary>Rechercher dans les exécutions</summary>${runTools()}</details></section>` : ''}</section>`);
}
function runTools() { const p=state.run_page || {};return `<form id="run-filters" class="row run-filters"><label>Rechercher<input type="search" name="query" value="${esc(state.runFilters?.query || '')}" placeholder="Demande ou workflow"></label><label>État<select name="status">${options([['','Tous'],['active','En cours'],['paused','Suspendues'],['completed','Terminées'],['cancelled','Annulées']],state.runFilters?.status || '')}</select></label><label>Exécution<select name="simulation">${options([['','Réel et simulation'],['false','Réel'],['true','Simulation']],state.runFilters?.simulation ?? '')}</select></label><label><input type="checkbox" name="archived" ${state.runFilters?.archived ? 'checked' : ''}>Avec archives</label><button>Filtrer</button></form><div class="row"><span class="muted">${p.total ?? state.runs.length} exécution(s)</span>${p.offset ? button('run-page','Précédentes','',`data-offset="${Math.max(0,p.offset-25)}"`) : ''}${p.next !== null && p.next !== undefined ? button('run-page','Suivantes','',`data-offset="${p.next}"`) : ''}</div>`; }
async function loadRunPage(offset=0) { const f=state.runFilters || {}; const page=await call('run.list',{project:state.project.id,offset,...f,...(f.simulation === '' || f.simulation === undefined ? {simulation:null} : {simulation:f.simulation === 'true'}),workflow:state.mode === 'history' ? state.graph.id : null});state.runs=page.items;state.run_page=page; if(state.route==='project')renderProject();else renderEditor(); }
function runTable(runs) {
  if (!runs.length) return '<p class="muted">Aucune exécution lancée.</p>';
  return `<table><thead><tr><th>Workflow</th><th>Contexte</th><th>État</th><th></th></tr></thead><tbody>${runs.map(r => `<tr><td>${esc((r.request || r.parameters?.request || r.definition.title).split('\n')[0])}<br><small>${esc(r.definition.title)}${r.definition.revision ? ' · Rév. '+esc(r.definition.revision) : ''} · ${new Date(r.created * 1000).toLocaleString('fr-CH')}</small></td><td>${r.simulation ? 'Simulation' : 'Exécution réelle'}</td><td>${esc(runLabel(r))}</td><td>${button('open-run', 'Consulter', '', `data-id="${r.id}"`)}${!['active','paused'].includes(r.status) ? button('archive-item',r.archived ? 'Restaurer' : 'Archiver','flat',`data-kind="run" data-id="${r.id}" data-archived="${!!r.archived}"`) : ''}</td></tr>`).join('')}</tbody></table>`;
}
function runLabel(run) {
  if(run.status==='cancelled')return 'Annulée';
  if (run.coordination_hold) return 'Suspendue manuellement';
  if (run.coordination_wait) return 'Attend une autre demande';
  if (run.status === 'active') {
    if (run.health?.status === 'failed') {
      if (run.focus?.status==='waiting_input') return 'Réponse attendue · échec à examiner';
      if (run.focus?.status==='waiting') return 'Décision attendue · échec à examiner';
      return 'Échec · reprise nécessaire';
    }
    if(run.focus?.status==='ready' && run.launch?.ready_count)return run.launch.label;
    if (run.focus) return ({failed:'Échec · reprise nécessaire',blocked:'Bloquée',waiting_input:'Réponse attendue',waiting:'Décision attendue',returned:'Résultat à valider',running:'En cours',ready:'Prête'})[run.focus.status] || 'Attend une dépendance';
    const nodes=Object.values(run.nodes || {});
    if(executionIssue(run))return 'Échec · reprise nécessaire';
    for(const [status,label] of [['blocked','Bloquée'],['waiting_input','Réponse attendue'],['waiting','Décision attendue'],['returned','Résultat à valider'],['running','En cours'],['ready','Prête']])if(run.counts?.[status] || nodes.some(n=>n.status===status))return label;
    return 'Attend une dépendance';
  }
  if (run.status === 'completed' && run.completion_outcome === 'blocked') return 'Terminée · suite bloquée';
  if (run.status === 'completed' && run.completion_outcome === 'rejected') return 'Terminée · refusée';
  return ({paused:'Suspendue',completed:'Terminée',cancelled:'Annulée'})[run.status] || run.status;
}
function renderLibrary() {
  content(`<section class="page library-page">${workflowNavigation('library')}<div class="page-heading"><div><div class="eyebrow">Composer et réutiliser</div><h1>Modèles de workflows</h1><p>Choisissez un modèle, adaptez ses étapes, puis lancez votre conversation.</p></div><div class="heading-actions">${button('import-workflow', 'Importer un workflow')}${button('new-template', '+ Créer un modèle', 'primary')}${state.template_page?.next !== null && state.template_page?.next !== undefined ? button('template-page','Modèles suivants','',`data-offset="${state.template_page.next}"`) : ''}${state.template_page?.offset ? button('template-page','Première page','', 'data-offset="0"') : ''}</div></div>
    <div class="library-tools"><label class="sr-only" for="template-search">Rechercher un modèle</label><input type="search" id="template-search" placeholder="Rechercher un modèle…"><span class="muted">Destination : <strong>${state.project && !state.project.library ? esc(projectTitle(state.project)) : 'Sans projet'}</strong></span></div>
    <div class="grid template-grid">${state.templates.map(g => `<article class="card template-card" data-template-search="${esc((g.title + ' ' + g.description).toLocaleLowerCase('fr'))}"><div class="row between"><span class="card-icon" aria-hidden="true">⑂</span><span class="pill">${g.node_count || g.nodes.length} bloc${(g.node_count || g.nodes.length) > 1 ? 's' : ''}</span></div><h3>${esc(g.title)}</h3><p>${esc(g.description)}</p><div class="card-actions">${button('use-template', 'Utiliser', 'primary', `data-project="${esc(state.project.id)}" data-id="${g.id}"`)}${button('edit-template', 'Modifier le modèle', '', `data-project="${esc(state.project.id)}" data-id="${g.id}"`)}</div></article>`).join('')}</div><p id="template-empty" class="notice" hidden>Aucun modèle ne correspond à cette recherche.</p></section>`);
  document.querySelector('#template-search').addEventListener('input', event => {
    const query = event.target.value.trim().toLocaleLowerCase('fr');
    let count = 0;
    document.querySelectorAll('[data-template-search]').forEach(card => { card.hidden = !card.dataset.templateSearch.includes(query); if (!card.hidden) count++; });
    document.querySelector('#template-empty').hidden = count > 0;
  });
}

function renderSchedules() {
  const schedules = (state.schedules || []).filter(s => state.showArchives || !s.archived);
  content(`<section class="page"><div class="page-heading"><div><div class="eyebrow">Automatisations locales</div><h1>Planifications</h1><p>Retrouvez vos prochaines exécutions ici et dans l’icône Tricorder de la barre Ubuntu.</p></div><div class="row">${button('toggle-archives',state.showArchives ? 'Masquer les archives' : 'Voir les archives')}${button('refresh-schedules', 'Actualiser')}</div></div><details class="schedule-explanation"><summary>Comment fonctionnent les planifications ?</summary><p>Tricorder doit rester ouvert, éventuellement dans la zone de notification. Après une interruption, une seule occurrence en retard est rattrapée. Une exécution encore ouverte empêche le chevauchement.</p><p>Pour créer une planification, ouvrez un workflow puis choisissez Options → Planifier. Pour utiliser une nouvelle version, ouvrez « Version planifiée » sur sa carte : vous pourrez archiver l’ancienne planification puis vérifier et activer la nouvelle.</p></details><div class="grid" style="margin-top:24px">${schedules.map(s => `<article class="card" data-schedule="${esc(s.id)}"><div class="row between"><h3>${esc(s.title)}</h3><span class="pill">${s.archived ? 'Archivée' : s.enabled ? 'Active' : 'Suspendue'}</span></div><p>${s.scope?.kind === 'workspace' ? 'Global' : esc(state.projects.find(p => p.id === s.project)?.title || 'Projet')} · ${s.simulation ? 'Simulation' : 'Exécution réelle'} · ${esc(s.rule.timezone)}<br>${s.enabled ? 'Prochaine' : 'Dernière échéance prévue'} : ${new Date(s.next * 1000).toLocaleString('fr-CH', { timeZone: s.rule.timezone })}</p><p class="muted">${s.last_status === 'blocked' ? esc(s.error) : s.last_status === 'skipped-overlap' ? 'Dernière occurrence non lancée : une exécution précédente attend encore.' : 'Les modifications du workflow ne changent pas cette planification.'}</p>${button('schedule-details', `Version planifiée · ${s.revision ? 'révision '+esc(s.revision) : 'instantané sans numéro'}`, 'flat', `data-id="${esc(s.id)}"`)}<div class="row">${!s.archived ? button('toggle-schedule', s.enabled ? 'Suspendre' : 'Réactiver', '', `data-id="${esc(s.id)}"`) : ''}${button('archive-item',s.archived ? 'Restaurer' : 'Archiver','flat',`data-kind="schedule" data-project="${esc(s.project)}" data-id="${esc(s.id)}" data-archived="${!!s.archived}"`)}${s.last_run ? button('schedule-run', 'Dernière exécution', '', `data-id="${esc(s.id)}"`) : ''}</div></article>`).join('') || '<div class="card"><h3>Aucune planification</h3><p>Ouvrez un workflow puis choisissez Options → Planifier pour vérifier ses moyens et sa fréquence avant activation.</p></div>'}</div></section>`);
}
function renderConnections() {
  content(`<section class="page"><div class="page-heading"><div><div class="eyebrow">Outils et plugins</div><h1>Connexions</h1><p>Connectez les outils de vos workflows : messagerie, documents et services. Vérifiez une connexion avant de l’utiliser dans une étape.</p></div><div class="row">${button('connection-guide', 'Configurer une connexion…')}${button('discover-plugins', 'Plugins OpenAI', '', 'data-provider="codex"') + button('discover-plugins', 'Plugins Anthropic', '', 'data-provider="claude"')}${button('refresh-connections', 'Actualiser')}</div></div>${launchReturnNotice()}<form id="connection-context-form" class="row"><label for="connection-context">Contexte</label><select id="connection-context" name="project" style="width:auto">${options([["workspace", "Sans projet"], ["library", "Modèles"], ...state.projects.map(p => [p.id, p.title])], state.project?.id || "workspace")}</select><button type="submit">Afficher les connexions</button></form><p class="muted">${state.project ? `Catalogue de ${esc(projectTitle(state.project))} : ${esc(state.project.path)}/.tricorder/plugins.json. Modifiez-le depuis le terminal, puis actualisez. Les déclarations restent distinctes des accès vérifiés.` : 'Choisissez le contexte global, la bibliothèque ou un projet pour consulter et configurer ses plugins.'}</p><div class="grid connection-grid">${[...state.capabilities, ...(state.detectedPlugins || [])].map(c => `<article class="card"><div class="row between"><h2>${esc(c.title)}</h2><span class="pill ${c.usable ? 'accepted' : ''}">${c.usable ? 'Utilisable' : 'À configurer'}</span></div><p>${esc(c.reason)}</p>${c.plugin_id && c.transport ? button('verify-plugin', 'Vérifier l’adaptateur…', '', `data-id="${esc(c.plugin_id)}"`) : ''}<details class="connection-diagnostics"><summary>Diagnostic de connexion</summary><div class="connection-states">${[['Disponible', c.available], ['Installé', c.installed], ['Connecté', c.connected], ['Vérifié', c.qualified]].map(([label, yes]) => `<span class="pill">${yes === null ? '?' : yes ? '✓' : '○'} ${label}</span>`).join('')}</div></details></article>`).join('')}</div>${(state.setup || []).filter(s => s.status === 'customized' || s.status === 'unavailable').map(s => `<div class="notice">${esc(s.instructions || s.project)} : ${s.status === 'customized' ? 'consignes personnalisées conservées. Mise à jour Tricorder à valider dans le modèle de consignes livré avec l’application.' : esc(s.reason)}</div>`).join('')}<p class="muted" style="margin-top:24px">Aucun secret n'est lu ou affiché dans cette page. Les comptes et la connexion OAuth restent chez les fournisseurs.</p></section>`);
}

function aiForm(preview = false) {
  const node = state.graph.nodes.find(n => n.kind === 'agent') || {};
  const current = effectiveExecution(state.project, state.graph, node);
  const provider = current.provider.value || 'codex';
  const model = current.model.value || state.providerDefaults?.[provider] || '';
  return `<form id="workflow-ai-form" class="ai-choice"><strong>IA pour les étapes de travail</strong><p>Un choix commun à toutes les étapes IA. Les profils d’agents sont conservés.</p><input type="hidden" name="preview" value="${preview ? 'yes' : 'no'}"><label for="workflow-provider">Fournisseur IA</label><select id="workflow-provider" name="provider">${options([['codex','OpenAI · Codex'],['claude','Anthropic · Claude']], provider)}</select><label for="workflow-model">Modèle</label><input id="workflow-model" name="model" value="${esc(model)}" required placeholder="Modèle configuré chez le fournisseur"><small>Le modèle proposé provient de votre configuration locale. La connexion sera vérifiée au lancement.</small><div class="modal-actions"><button type="submit">${preview ? 'Appliquer ce choix et vérifier' : 'Appliquer à toutes les étapes IA'}</button></div></form>`;
}

function renderEditor() {
  if (conversationOverviewActive()) { renderConversationOverview(); return; }
  if(state.mode==='run' && state.conversation && !state.run) {renderConversationReady();return;}
  const graph = currentGraph();
  if (!graph) return;
  const running = ['run', 'document'].includes(state.mode) && state.run;
  const selectedRequest = running && state.conversation?.items.find(i=>i.run===state.run.id);
  const heading = (selectedRequest?.request || (running && state.conversation && state.run.parameters?.request) || graph.title).split('\n')[0];
  integration.context({ projects: state.projects, project: state.project, graph, run: state.run, conversation: state.conversation, route: state.route, mode: state.mode, activeRoute: state.project?.library ? 'global' : state.project?.scope === 'workspace' ? 'global' : 'projects', title: projectTitle(state.project) });
  const scroll = document.querySelector('.canvas-scroll');
  const position = scroll ? [scroll.scrollLeft, scroll.scrollTop] : [0, 0];
  content(`<div class="workflow-heading ${running ? 'execution-heading' : ''}"><div><div class="eyebrow breadcrumb">${running ? 'Suivi · '+esc(graph.title) : esc(projectTitle(state.project))+' / Workflow'}</div><h1 title="${esc(heading)}">${esc(heading)}</h1><p title="${esc(graph.title)}">${selectedRequest ? esc(graph.title.split('—')[0].trim())+' · ' : ''}${running ? `${esc(frozenRevision(state.run))} · ${esc(runLabel(state.run))}${selectedRequest ? '' : ' · '+new Date(state.run.created * 1000).toLocaleString('fr-CH')}` : `Révision ${state.savedRevision || 'initiale'} · ${state.dirty ? 'Modifications non enregistrées' : 'Enregistré'}`}</p></div><div class="row">${!running ? button('workflow-ai', 'Choisir l’IA') + button('export-workflow', 'Exporter…') + button('save', 'Enregistrer', '', state.dirty ? '' : 'disabled') + button('start-preview', 'Exécuter…', 'primary') : button('back-design', 'Revenir à l’éditeur') + (['active', 'paused'].includes(state.run.status) ? button('pause', state.run.status === 'paused' ? 'Reprendre' : 'Suspendre') + button('cancel', 'Annuler', 'flat') : '')}</div></div>
    ${launchReturnNotice()}${state.mode==='design' ? handoffNotice(graph) : ''}<div class="tabs" role="tablist" aria-label="Vues du workflow">${[['design', 'Éditeur'], ['run', 'Exécution'], ['history', 'Historique'], ['document', 'Rapport']].map(([mode, label]) => `<button role="tab" aria-selected="${state.mode === mode}" class="${state.mode === mode ? 'active' : ''}" data-action="mode" data-mode="${mode}" ${['run', 'document'].includes(mode) && !state.run ? 'disabled' : ''}>${label}</button>`).join('')}</div>
    ${state.mode === 'history' ? `<section class="page"><h2>Exécutions du workflow</h2>${runTools()}${runTable(state.runs.filter(r => r.original.id === state.graph.id))}</section>` : state.mode === 'document' ? '<section class="page"><div class="row between"><h2>Rapport d’exécution</h2><div class="row"><button data-action="export-work">Exporter le rapport dans le projet</button><button data-action="export-release" class="flat">Export de release…</button></div></div><article class="document" id="document-view">Chargement…</article></section>' : `
    ${running && state.run.parameters?.source_run ? `<div class="notice">Notification liée à une question. ${button('notification-run', 'Revenir à l’exécution', '', `data-id="${esc(state.run.parameters.source_run)}"`)}</div>` : ''}${running ? `<div class="banner ${state.run.simulation ? 'amber' : ''}" id="run-banner">${state.run.simulation ? '<strong>Simulation.</strong> Aucun modèle ni service métier appelé. ' : '<strong>Exécution réelle.</strong> '}${Object.values(state.run.nodes).filter(n => n.status === 'waiting').length} décision(s) attendue(s) · un résultat remis reste à valider.</div>` : ''}
    <div class="toolbar">${!running ? button('add-node', '+ Ajouter un bloc') + button('connect', 'Relier') + button('workflow-settings', 'Paramètres du workflow') + '<span class="separator"></span>' + button('undo', '↶', '', `aria-label="Annuler la modification" ${state.history.past.length ? '' : 'disabled'}`) + button('redo', '↷', '', `aria-label="Rétablir la modification" ${state.history.future.length ? '' : 'disabled'}`) : ''}<span class="fill"></span>${!running ? button('assistant', '✦ Assistant IA') : `<div class="execution-switch" role="group" aria-label="Affichage du suivi">${button('execution-graph', 'Graphe', state.reviewFocus ? '' : 'active', `aria-pressed="${!state.reviewFocus}"`)}${button('execution-details', 'Détail', state.reviewFocus ? 'active' : '', `aria-pressed="${!!state.reviewFocus}"`)}</div>` + button('timeline', 'Journal d’exécution')}${button('view', state.view === 'canvas' ? '☷ Liste' : '⑂ Graphe', '', 'aria-label="Changer la vue graphe ou liste"')}</div>
    <div class="editor ${running && state.reviewFocus ? 'review-focus' : ''}"><div class="canvas-area">${state.view === 'canvas' ? '<div class="canvas-scroll" tabindex="0" aria-label="Graphe du workflow"><div class="canvas-size"><div class="canvas"><svg aria-hidden="true"></svg><div id="nodes"></div></div></div></div>' : '<div class="table-wrap" id="node-list"></div>'}<div class="canvas-footer"><span>${graph.nodes.length} bloc${graph.nodes.length > 1 ? 's' : ''} · ${graph.edges.length} lien${graph.edges.length > 1 ? 's' : ''}</span><div class="row">${button('zoom-out', '−', 'flat', 'aria-label="Réduire le graphe"')}<span id="zoom-label">${Math.round(state.zoom * 100)} %</span>${button('zoom-in', '+', 'flat', 'aria-label="Agrandir le graphe"')}${button('fit', 'Ajuster', 'flat')}</div></div></div><aside class="inspector" aria-label="Inspecteur du bloc" id="inspector"></aside></div>`}`);
  if (['design', 'run'].includes(state.mode)) { document.querySelector('.toolbar .fill').insertAdjacentHTML('beforebegin', (state.mode === 'run' && state.project.scope === 'workspace' ? button('handoff', 'Transférer vers un projet…') : '') + button('terminal', '›_ Terminal', '', `aria-label="${state.conversation ? 'Retrouver la conversation' : 'Ouvrir le terminal existant'}"`) + (state.mode === 'design' ? '<details class="workflow-options"><summary>Options</summary><div>' + button('phases', 'Phases') + button('reload-file', 'Recharger et valider') + (localStorage.getItem(draftKey()+':previous') ? button('restore-previous-draft','Récupérer le brouillon précédent') : '') + button('schedule', 'Planifier') + '</div></details>' : button('phases', 'Phases'))); renderGraph(); renderInspector(); const nextScroll = document.querySelector('.canvas-scroll'); if (nextScroll) { nextScroll.scrollLeft = position[0]; nextScroll.scrollTop = position[1]; } }
  if (state.mode === 'document') safe(loadDocument);
  if (running && state.mode === 'run' && state.conversation) document.querySelector('.workflow-heading')?.after(conversationScopeSwitch());
  renderConversation();
  renderExecutionOverview();
  if(running){
    const controls=document.querySelector('.workflow-heading > .row');const menu=document.createElement('details');menu.className='compact-menu execution-menu';menu.innerHTML='<summary>Options</summary><div></div>';while(controls.firstChild)menu.lastChild.append(controls.firstChild);controls.append(menu);
    const tabs=document.querySelector('.tabs');
    for(const mode of ['history','document']) {const control=tabs?.querySelector(`[data-mode=${mode}]`);if(control)menu.lastChild.append(control);}
    // An execution is work being followed; editing is available from Options.
    const design=tabs?.querySelector('[data-mode=design]');if(design)design.remove();
    const execution=tabs?.querySelector('[data-mode=run]');if(execution){execution.textContent='Revenir au suivi';if(state.mode==='run')execution.hidden=true;}
    if(tabs && state.mode==='run')tabs.classList.add('execution-tabs-empty');
    const toolbar=document.querySelector('.toolbar');if(toolbar){for(const action of ['terminal','phases','timeline','view']){const control=toolbar.querySelector(`[data-action=${action}]`);if(control)menu.lastChild.append(control);}}
  }
}

function handoffNotice(graph) {
  const source=graph.parameters?.source_context;
  if(!source || typeof source.run!=='string')return '';
  const count=Object.keys(source.results || {}).length;
  return `<div class="notice workflow-source"><strong>Source du workflow</strong><p>${count ? `${count} résultat(s) validé(s) repris d’une exécution sans projet.` : 'Créé à partir d’une exécution sans projet, sans résultat validé à reprendre.'}${source.simulation ? ' La source est une simulation.' : ''} Les validations et autorisations restent propres à chaque exécution.</p>${button('handoff-source','Consulter l’exécution d’origine','',`data-id="${esc(source.run)}"`)}</div>`;
}

function conversationOverviewActive() { return state.mode === 'run' && state.conversation && state.conversationScope === 'overview'; }
function conversationScopeSwitch() {
  const nav=document.createElement('div');nav.className='conversation-scope-switch';nav.setAttribute('role','group');nav.setAttribute('aria-label','Périmètre du suivi');
  nav.innerHTML=button('conversation-overview','Vue d’ensemble','',`aria-pressed="${!!conversationOverviewActive()}"`)+button('conversation-request','Demande','',`aria-pressed="${!conversationOverviewActive()}" ${state.run ? '' : 'disabled'}`);
  return nav;
}
function paintConversationOverview() {
  const target=document.querySelector('#conversation-overview');if(!target || !conversationOverviewActive())return;
  const active=target.contains(document.activeElement) ? document.activeElement : null;
  const focused=active?.dataset.action ? `[data-action="${CSS.escape(active.dataset.action)}"]${active.dataset.id ? `[data-id="${CSS.escape(active.dataset.id)}"]` : active.dataset.offset ? `[data-offset="${CSS.escape(active.dataset.offset)}"]` : ''}` : active?.matches('.dispatch-feedback summary') ? '.dispatch-feedback summary' : null;
  const scroll=target.scrollTop, expanded=target.querySelector('.dispatch-feedback details')?.open;
  const html=conversationOverviewView(state.conversation,{projects:state.projects,statusLabel:runLabel,dispatch:state.dispatchFeedback?.conversation===state.conversation.id ? state.dispatchFeedback : null,dispatching:state.dispatching===state.conversation.id});
  if(target.innerHTML===html)return;
  target.innerHTML=html;
  if(expanded && target.querySelector('.dispatch-feedback details'))target.querySelector('.dispatch-feedback details').open=true;
  target.scrollTop=scroll;if(focused)target.querySelector(focused)?.focus({preventScroll:true});
}
function renderConversationOverview() {
  const c=state.conversation,graph=c.definition;
  integration.context({projects:state.projects,project:state.project,graph,run:state.run,conversation:c,route:'workflow',mode:'run',activeRoute:state.project?.scope==='workspace'?'global':'projects',title:projectTitle(state.project)});
  content(`<div class="workflow-heading execution-heading"><div><div class="eyebrow">Suivi du workflow</div><h1 title="${esc(graph.title)}">${esc(graph.title)}</h1><p>${c.projects.length>1 ? `${c.projects.length} projets` : esc(projectTitle(state.project))} · ${c.archived ? 'Conversation archivée' : c.status==='open' ? 'Conversation ouverte' : 'Conversation terminée'}</p></div><details class="compact-menu execution-menu"><summary>Options</summary><div>${button('back-design','Revenir à l’éditeur')}${button('conversation-add','Ajouter une demande…','',c.status==='open' && !c.archived ? '' : 'disabled')}</div></details></div><div class="tabs execution-tabs-empty"></div><section id="conversation-overview" aria-label="Vue d’ensemble des demandes"></section>`);
  document.querySelector('.workflow-heading').after(conversationScopeSwitch());
  renderConversation();
  document.querySelector('#conversation-overview').scrollTop=state.conversationScroll || 0;
}

function renderConversationReady() {
  const c=state.conversation,graph=c.definition;
  integration.context({projects:state.projects,project:state.project,graph,run:null,conversation:c,route:'workflow',mode:'run',activeRoute:state.project.scope==='workspace'?'global':'projects',title:projectTitle(state.project)});
  content(`<section class="page conversation-ready"><div class="page-heading"><div><div class="eyebrow">Suivi du workflow</div><h1>${esc(graph.title)}</h1><p>Conversation ouverte · ${c.provider==='claude'?'Anthropic · Claude':'OpenAI · Codex'}</p></div></div><div class="notice"><h2>Prêt pour votre demande</h2><p>Décrivez le travail à l’agent dans le terminal. Il créera les tâches et leur progression apparaîtra ici.</p>${button('conversation-terminal','Retrouver le terminal','primary')}</div><h2>Étapes du workflow</h2><ol class="ready-steps">${graph.nodes.map(n=>`<li><span aria-hidden="true">${symbols[n.kind]}</span><div><strong>${esc(n.title)}</strong><small>${esc(kinds[n.kind])} · ${portSummary(n)}</small></div></li>`).join('')}</ol><p class="muted">Aucune étape n’est en cours tant que l’agent n’a pas créé de demande.</p></section>`);
}

function dependencyItems() {
  const item = state.conversation?.items.find(i => i.run === state.run?.id);
  if (item?.dependencies) return item.dependencies.map(i=>({...i,title:i.request || i.title,execution:i.execution || i}));
  const ids = state.run?.parameters?.depends_on_runs || [];
  return ids.map(id => {
    const related = state.conversation?.items.find(i => i.run === id);
    return { run: id, title: related?.request.split('\n')[0] || 'Demande précédente', execution: related?.execution };
  });
}
function blockedDependencies() { return dependencyItems().filter(i=>dependencyBlocked(i.execution || i)); }
async function dependencyChoices(offset=0, query='') {
  const draft=state.dependencyDraft;if(!draft)return;
  const page=await call('conversation.get',{conversation:draft.conversation,offset,query});
  if(state.dependencyDraft!==draft || !document.querySelector('#dependency-choices'))return;
  draft.page=page;draft.query=query;
  document.querySelector('#dependency-choices').innerHTML=page.items.map(i=>`<label><input type="checkbox" name="depends" value="${esc(i.id)}" ${draft.selected.has(i.id)?'checked':''} ${dependencyBlocked(i.execution)?'disabled':''}><span>${esc(i.request)}<small>${esc(state.projects.find(p=>p.id===i.project)?.title || 'Sans projet')} · ${esc(runLabel(i.execution))}${dependencyBlocked(i.execution)?' · ne peut pas débloquer la suite':''}</small></span></label>`).join('') || '<p>Aucune demande correspondante.</p>';
  document.querySelector('#dependency-pages').innerHTML=(page.offset ? button('dependency-page','Précédentes','','data-offset="'+Math.max(0,page.offset-25)+'" type="button"'):'')+(page.next!=null ? button('dependency-page','Suivantes','','data-offset="'+page.next+'" type="button"'):'');
  document.querySelector('#dependency-count').textContent=`${draft.selected.size} demande(s) préalable(s) sélectionnée(s). La nouvelle demande attendra leur réussite à toutes.`;
}
async function addRequestDialog(replacement=false) {
  state.dependencyDraft={conversation:state.conversation.id,selected:new Set(),query:''};
  modal(replacement ? 'Créer une demande de remplacement' : 'Ajouter une demande', `<form id="conversation-add-form">${replacement?'<p>La demande précédente reste conservée avec ses résultats et son blocage. Décrivez la nouvelle demande et choisissez ses prérequis ; aucune validation passée ne sera transférée.</p>':''}<label>Demande<textarea name="request" required>${replacement?esc(state.run.parameters.request || ''):''}</textarea></label><label>Projet<select name="project">${options(state.conversation.projects.map(id=>[id,state.projects.find(p=>p.id===id)?.title || state.project.title]),state.project.id)}</select></label><fieldset class="dependency-picker"><legend>Demandes préalables (facultatif)</legend><p>Aucune sélection : la demande est indépendante. Sélectionnez plusieurs demandes pour attendre leur réussite à toutes.</p><div class="row"><label for="dependency-query" class="sr-only">Rechercher un prérequis</label><input id="dependency-query" type="search" placeholder="Rechercher une demande…">${button('dependency-search','Rechercher','','type="button"')}</div><div id="dependency-choices"></div><div id="dependency-pages" class="row"></div><p id="dependency-count" role="status"></p></fieldset><button class="primary">Enregistrer la demande</button></form>`);
  await dependencyChoices();
}
function executionEmptyDetail() {
  if (!state.run) return '<p>Sélectionnez une étape du graphe.</p>';
  if (['completed','cancelled'].includes(state.run.status)) return `<h2>${esc(runLabel(state.run))}</h2><p>Le rapport réunit les résultats, décisions et preuves de cette exécution. Ouvrez-le avec « Voir le rapport » ci-dessus.</p>`;
  if (state.run.coordination_wait) return `<h2>${blockedDependencies().length ? 'Bloquée par une demande préalable' : state.run.coordination_hold ? 'Exécution suspendue manuellement' : 'En attente d’autres demandes'}</h2><p>${blockedDependencies().length ? 'Une demande préalable est annulée ou terminée sans autoriser la suite. Cette exécution ne peut pas reprendre avec ces dépendances.' : state.run.coordination_hold ? 'La reprise reste à votre initiative, depuis Options. Les dépendances ci-dessous doivent aussi être satisfaites.' : 'Cette demande commencera après la réussite des demandes suivantes.'}</p><div class="dependency-list">${dependencyItems().map(i => `<button data-action="conversation-item" data-id="${esc(i.run)}"><strong>${esc(i.title)}</strong><span>${esc(i.execution ? runLabel(i.execution) : i.status || 'En attente')}</span><span aria-hidden="true">→</span></button>`).join('')}</div>${state.conversation?.items.find(i=>i.run===state.run.id)?.dependencies_truncated ? '<p class="muted">Les 25 premières dépendances sont affichées, en priorité celles qui restent à traiter. La liste complète reste consultable dans le terminal.</p>' : ''}<p class="muted">Vous pouvez consulter et traiter chaque attente sans changer les dépendances.</p>${blockedDependencies().length ? button('replace-dependent','Créer une demande de remplacement') : ''}`;
  return `<h2>${esc(runLabel(state.run))}</h2><p>${state.run.status === 'paused' ? 'Le workflow est suspendu. Vous pouvez le reprendre depuis Options.' : 'Sélectionnez une étape dans le graphe pour consulter son résultat.'}</p>`;
}
function renderExecutionOverview() {
  let target = document.querySelector('#execution-overview');
  if (state.mode !== 'run' || !state.run || conversationOverviewActive()) { target?.remove(); return; }
  if (!target) { target=document.createElement('section');target.id='execution-overview';target.setAttribute('aria-label','État et prochaine action');const tray=document.querySelector('#conversation-tray');(tray?.parentElement.matches('.conversation-scope-switch') ? tray.parentElement : tray || document.querySelector('.tabs'))?.after(target); }
  const run=state.run, action=executionAction(run), issue=executionIssue(run);
  const accepted=Object.values(run.nodes).filter(n => ['accepted','skipped'].includes(n.status)).length;
  const cause=issue?.reason || run.nodes[run.focus?.node]?.reason;
  const dependencies=run.coordination_wait ? dependencyItems() : [];
  const detail=dependencies.length ? 'Après : '+dependencies.map(i=>i.title).join(' · ') : cause || action.detail;
  const html=`<div class="execution-state"><div><strong class="execution-label ${issue ? 'has-issue' : ''}">${esc(runLabel(run))}</strong><span class="execution-progress">${accepted} / ${Object.keys(run.nodes).length} étapes</span></div>${state.reviewFocus && action.node && state.selected===action.node ? '' : button('execution-next-action',esc(action.label),'primary')}</div><p class="execution-next" title="${esc(detail)}">${esc(detail)}</p>`;
  if(target.innerHTML!==html)target.innerHTML=html;
}
function renderConversation() {
  const old=document.querySelector('#conversation-tray'), c=state.conversation;
  const same=Boolean(old && c && old.dataset.conversation===c.id);
  if (same && old?.contains(document.activeElement) && document.activeElement.matches('input')) { state.conversationPaintPending=true;renderExecutionOverview(); return; }
  const active=same && old?.contains(document.activeElement) ? document.activeElement : null;
  const focused=active?.dataset?.id ? `[data-id="${CSS.escape(active.dataset.id)}"]` : active?.dataset?.action ? `[data-action="${CSS.escape(active.dataset.action)}"]` : active?.matches('.conversation-search-details > summary') ? '.conversation-search-details > summary' : active?.matches('summary') ? '.request-selector > summary' : active?.matches('#conversation-search button') ? '#conversation-search button' : null;
  const search=same ? {value:old.querySelector('#conversation-query')?.value,open:old.querySelector('.conversation-search-details')?.open} : null;
  // Native toggle events are queued: preserve the actual disclosure state before polling replaces it.
  if(same)state.compactRequestsOpen=old.querySelector('.request-selector')?.open || false;
  old?.remove();state.conversationPaintPending=false;
  if (!c) return;
  const items=c.items.map(i=>i.run===state.run?.id ? {...i,execution:state.run} : i);
  const summary=!c.item_count && !c.items.length ? 'Décrivez votre demande dans le terminal pour commencer.' : activityText(c);
  const tray=document.createElement('section');tray.id='conversation-tray';tray.className='conversation-tray'+(conversationOverviewActive()?' overview-conversation-header':'');tray.dataset.conversation=c.id;
  tray.innerHTML=`<details class="request-selector" ${state.compactRequestsOpen ? 'open' : ''}><summary>${c.item_count ?? c.items.length} demandes <span aria-hidden="true">⌄</span></summary><div class="request-options"><div class="request-list-heading"><strong>Demandes du workflow</strong><span>${c.total > c.items.length ? `${c.items.length} affichées sur ${c.total}` : `${c.items.length} demandes`}</span></div>${conversationPager(c)}<div class="work-items">${items.map(i=>`<button data-action="conversation-item" data-id="${esc(i.run)}" aria-pressed="${state.run?.id===i.run}" class="${state.run?.id===i.run?'active':''}"><strong>${esc(i.request.split('\n')[0])}</strong><small>${c.projects?.length>1 ? esc(state.projects.find(p=>p.id===i.project)?.title || i.project)+' · ' : ''}${esc(runLabel(i.execution || {status:'active'}))}</small></button>`).join('')}</div><div class="request-list-actions">${c.status==='open'?button('conversation-add','Ajouter une demande…','flat'):''}${button('archive-conversation',c.archived?'Restaurer':'Archiver la conversation','flat')}</div></div></details><p class="conversation-summary" title="${esc(summary)}">${!c.activity && c.total>c.items.length?'Cette page : ':''}${esc(summary)}</p>${state.agentState==='stopped'?button('resume-agent','Reprendre l’agent…','flat'):button('conversation-terminal','Terminal','flat','aria-label="Retrouver la conversation" title="Retrouver la conversation"')}`;
  const selector=tray.querySelector('.request-selector');selector.addEventListener('toggle',()=>{if(selector.isConnected)state.compactRequestsOpen=selector.open;});
  if(conversationOverviewActive() || (state.compactHeight && state.mode==='run'))document.querySelector('.conversation-scope-switch')?.append(tray);
  else document.querySelector('.tabs')?.after(tray);
  if(search) { tray.querySelector('.conversation-search-details').open=search.open;tray.querySelector('#conversation-query').value=search.value || ''; }
  if(focused)tray.querySelector(focused)?.focus({preventScroll:true});
  renderExecutionOverview();paintConversationOverview();
}

async function launchConversation() {
  rememberLaunchDraft();
  const request = document.querySelector('#initial-request')?.value.trim();
  state.conversation = await call('conversation.open', { ...nativeLaunchPayload(), request: request || null, authorize_notifications: document.querySelector('#authorize-notifications')?.checked === true }, true);
  state.mode = 'run'; state.run = null; state.conversationScope='request'; state.zoom=1; closeModal(); delete state.launchDrafts[launchKey()]; state.launchReturn = null; renderEditor();
  await terminal.open(state.project, state.graph, state.conversation.id);
}

function portSummary(node) {
  const inputs = Object.keys(node.inputs || {}).length, outputs = Object.keys(node.outputs || {}).length;
  return `${inputs} entrée${inputs > 1 ? 's' : ''} → ${outputs} sortie${outputs > 1 ? 's' : ''}`;
}
function renderGraph() {
  updateRunBanner();
  const running = state.mode === 'run';
  let graph = document.querySelector('#node-list') ? currentGraph() : displayGraph(currentGraph(), state.collapsed, running ? state.run : null);
  if(running && !document.querySelector('#node-list'))graph=executionLayout(graph,document.querySelector('.canvas-area')?.clientWidth || 600);
  const list = document.querySelector('#node-list');
  if (list) {
    list.innerHTML = `<table><thead><tr><th>Étape</th><th>Type</th><th>Phase</th><th>État</th><th></th></tr></thead><tbody>${graph.nodes.map(n => `<tr><td>${esc(n.title)}</td><td>${kinds[n.kind]}</td><td>${esc(n.phase || '—')}</td><td>${running ? nodeBadge(state.run.nodes[n.id], n) : badge('pending')}</td><td>${button('select-node', 'Ouvrir', '', `data-id="${n.id}"`)}</td></tr>`).join('')}</tbody></table>`;
    return;
  }
  const canvas = document.querySelector('.canvas'); if (!canvas) return;
  const width = running ? graph.layoutWidth : Math.max(900, ...graph.nodes.map((n, i) => nodePosition(n, i).x + 320));
  canvas.classList.toggle('execution-map',running);canvas.style.setProperty('--run-node-width',(graph.nodeWidth || 240)+'px');
  const height = Math.max(running ? 0 : 500, ...graph.nodes.map((n, i) => nodePosition(n, i).y + (running ? 150 : 220)));
  canvas.style.width = width + 'px'; canvas.style.height = height + 'px'; canvas.style.transform = `scale(${state.zoom})`;
  document.querySelector('.canvas-size').style.width = width * state.zoom + 'px'; document.querySelector('.canvas-size').style.height = height * state.zoom + 'px';
  const svg = canvas.querySelector('svg'); svg.setAttribute('width', width); svg.setAttribute('height', height);
  svg.innerHTML = graph.edges.map(e => {
    const a = graph.nodes.findIndex(n => n.id === e.from), b = graph.nodes.findIndex(n => n.id === e.to); if (a < 0 || b < 0) return '';
    const p = nodePosition(graph.nodes[a], a), q = nodePosition(graph.nodes[b], b), x = p.x + 240, y = p.y + 58, endX = q.x, endY = q.y + 58;
    const source = state.run?.nodes[e.originalFrom || e.from];
    const fromX=running ? p.x+graph.nodeWidth/2 : x, fromY=running ? p.y+114 : y, toX=running ? q.x+graph.nodeWidth/2 : endX, toY=running ? q.y : endY;
    const path=running ? `M${fromX},${fromY} V${(fromY+toY)/2} H${toX} V${toY}` : orthogonalPath(x,y,endX,endY);
    return `<path data-edge="${e.id}" class="edge ${running && source?.status === 'accepted' && source.outcome === (e.outcome || 'done') ? 'active' : ''}" d="${path}"/><text x="${(fromX + toX) / 2+8}" y="${(fromY + toY) / 2 - 7}" fill="var(--muted)" font-size="11">${esc(e.outcome && e.outcome !== 'done' ? e.outcome : '')}</text>`;
  }).join('');
  const nodeContainer = document.querySelector('#nodes');
  nodeContainer.innerHTML = graph.nodes.map((n, i) => {
    const p = nodePosition(n, i), status = n.kind === 'group' ? n.status : running ? state.run.nodes[n.id]?.status || 'pending' : 'pending';
    if (n.kind === 'group') return `<button class="node" data-action="expand-phase" data-phase="${esc(n.phase)}" data-group="${esc(n.phase)}" data-status="${status}" style="left:${p.x}px;top:${p.y}px" aria-label="Déplier la phase ${esc(n.title)}"><span class="node-main"><span class="icon">⊞</span><span><span class="mission" title="${esc(n.title)}">${esc(n.title)}</span><span class="kind">${n.members.length} étapes · déplier</span></span></span><span class="node-footer">${badge(status)}</span></button>`;
    return `<button class="node ${state.selected === n.id ? 'selected' : ''}" data-action="select-node" data-id="${n.id}" data-status="${status}" data-failed="${running && nodeFailed(state.run.nodes[n.id], n) ? 'true' : 'false'}" style="left:${p.x}px;top:${p.y}px" aria-label="${esc(n.title)} · ${running ? nodeLabel(state.run.nodes[n.id], n) : kinds[n.kind]}"><span class="port in" aria-hidden="true"></span><span class="port out" aria-hidden="true"></span>${!running ? '<span class="drag-handle" aria-hidden="true">⋮⋮ Déplacer</span>' : ''}<span class="node-main"><span class="icon" aria-hidden="true">${symbols[n.kind]}</span><span><span class="mission" title="${esc(n.title)}">${esc(n.title)}</span><span class="kind">${esc(n.phase || kinds[n.kind])}</span></span></span><span class="node-footer">${running ? nodeBadge(state.run.nodes[n.id], n) : `<span>${esc(kinds[n.kind])}</span>`}<span title="${esc('Entrées : ' + (Object.keys(n.inputs || {}).join(', ') || 'aucune') + ' · Sorties : ' + (Object.keys(n.outputs || {}).join(', ') || 'aucune'))}">${n.kind === 'decision' ? 'Vous' : portSummary(n)}</span></span></button>`;
  }).join('');
}

function executionTrail(node) {
  const graph=currentGraph(),label=outcome=>({done:'',approve:'Si autorisé',reject:'Si refusé',pass:'Si conforme',fail:'Si non conforme'}[outcome] ?? 'Si : '+outcome);
  const neighbours=(direction)=>graph.edges.filter(e=>e[direction==='before'?'to':'from']===node.id).map(e=>({node:graph.nodes.find(n=>n.id===e[direction==='before'?'from':'to']),outcome:e.outcome || 'done'})).filter(e=>e.node);
  const previous=neighbours('before'),next=neighbours('after');
  const group=(entries,title,current=false)=>`<div class="step-trail-group" aria-label="${title}">${entries.map(entry=>`<button data-action="select-node" data-id="${entry.node.id}" class="${entry.outcome==='done'?'edge-default':''}" ${current?'aria-current="step"':''}><small>${current?'Étape sélectionnée':esc(label(entry.outcome))}</small><strong>${esc(entry.node.title)}</strong></button>`).join('')}</div>`;
  return `<nav class="step-trail" aria-label="Position dans le workflow"><div>${previous.length?group(previous,'Étapes précédentes')+'<span aria-hidden="true">→</span>':''}${group([{node}],'Étape sélectionnée',true)}${next.length?'<span aria-hidden="true">→</span>'+group(next,'Suites du bloc'):''}</div></nav>`;
}
function interactionDraftKey(form) {
  const node=state.run?.nodes[state.selected];
  if(!node || !['question-form','decision-form','receipt-form'].includes(form.id))return null;
  const attempt=node.question?.id || node.nonce || node.started || '';
  return `tricorder-interaction:${state.run.id}:${state.selected}:${form.id}:${attempt}`;
}
function restoreInteractionDraft(target) {
  for(const form of target.querySelectorAll('form')) {const key=interactionDraftKey(form);if(!key)continue;try{const fields=JSON.parse(localStorage.getItem(key)||'{}');for(const field of form.querySelectorAll('textarea[name]'))if(typeof fields[field.name]==='string')field.value=fields[field.name];}catch{}}
}
function renderInspector() {
  const target = document.querySelector('#inspector'); if (!target) return;
  const focus = target.contains(document.activeElement) ? document.activeElement : null;
  const oldIdentity = target.dataset.interaction;
  const controls = [...target.querySelectorAll('form input[name],form textarea[name],form select[name]')].map(el=>({name:el.name,value:el.value,checked:el.checked,type:el.type}));
  const scroll = target.scrollTop;
  const focusId=focus?.id, focusAction=focus?.dataset.action, focusSummary=focus?.tagName==='SUMMARY' ? focus.textContent : null;
  const selection=focus?.tagName==='TEXTAREA' ? [focus.selectionStart,focus.selectionEnd] : null;
  if (state.mode === 'run' && state.run?.coordination_wait) { target.innerHTML=executionEmptyDetail(); target.dataset.node='dependencies'; return; }
  const graph = currentGraph(); const node = graph.nodes.find(n => n.id === state.selected);
  const opened = target.dataset.node === node?.id ? [...target.querySelectorAll('details[open] > summary')].map(s => s.textContent) : [];
  if (!node) { target.innerHTML = state.mode === 'run' ? executionEmptyDetail() : ''; return; }
  target.innerHTML = `${state.mode==='run' ? executionTrail(node) : ''}${button('close-inspector', '×', 'flat inspector-close','aria-label="Fermer les propriétés"')}<div class="eyebrow">${esc(node.route_output ? 'Condition évaluée par un agent' : kinds[node.kind])}</div><h2>${esc(node.title)}</h2>${state.mode === 'run' && state.run ? runInspector(node) : designInspector(node)}`;
  target.dataset.node = node.id;restoreInteractionDraft(target);
  const interaction = target.querySelector('#question-form,#decision-form,#receipt-form');
  target.dataset.interaction = interaction ? interactionDraftKey(interaction) : '';
  if(interaction && oldIdentity && oldIdentity===target.dataset.interaction) for(const field of interaction.querySelectorAll('input[name],textarea[name],select[name]')) {
    const prior=controls.find(c=>c.name===field.name && c.type===field.type && (!['checkbox','radio'].includes(field.type) || c.value===field.value));
    if(prior) {if(['checkbox','radio'].includes(field.type))field.checked=prior.checked;else field.value=prior.value;}
  }
  const form = target.querySelector('#node-form'); if (form) {form.dataset.signature = formSignature(form);if(state.restoreForm?.node === node.id) {for(const [name,value] of Object.entries(state.restoreForm.values)) {const control=form.elements.namedItem(name);if(control){if(control.type==='checkbox')control.checked=value===true || value==='on';else control.value=value;}}state.restoreForm=null;}}
  for (const summary of target.querySelectorAll('details > summary')) if (opened.includes(summary.textContent)) summary.parentElement.open = true;
  if(state.mode==='run') {
    const replacement=focusId ? target.querySelector('#'+CSS.escape(focusId)) : focusAction ? target.querySelector(`[data-action="${CSS.escape(focusAction)}"]`) : focusSummary ? [...target.querySelectorAll('summary')].find(el=>el.textContent===focusSummary) : null;
    replacement?.focus({preventScroll:true});if(selection && replacement?.tagName==='TEXTAREA')replacement.setSelectionRange(...selection);
    target.scrollTop=scroll;
  }
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
  return `<fieldset class="ports"><legend>Entrées et sorties</legend>${[['inputs','Entrées'],['outputs','Sorties']].map(([direction,label]) => `<section class="port-section"><strong>${label}</strong><ul>${Object.entries(node[direction] || {}).map(([name,type]) => `<li><code>${esc(name)}</code> · ${esc(({string:'Texte',number:'Nombre',boolean:'Oui / Non',object:'Objet',array:'Liste'})[type] || type)} ${button('remove-port', 'Retirer', 'flat', `data-direction="${direction}" data-port="${esc(name)}"`)}</li>`).join('') || '<li>Aucune donnée déclarée</li>'}</ul>${button('add-port', 'Ajouter une ' + (direction === 'inputs' ? 'entrée' : 'sortie'), 'flat', `data-direction="${direction}"`)}</section>`).join('')}</fieldset>`;
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
  const hasInstructions = ['agent','task'].includes(node.kind);
  const effective = isAgent ? effectiveExecution(state.project, state.graph, node) : null;
  const profiles = [['generalist', 'Aucun agent dédié'], ...(state.project.packs || []).flatMap(pack => pack.profiles.map(profile => [profile.id, profile.title || profile.id]))];
  if (effective && !profiles.some(([id]) => id === effective.profile.value)) profiles.push([effective.profile.value, effective.profile.value + ' (pack absent)']);
  return `<form id="node-form"><label for="node-title">Nom du bloc</label><input id="node-title" name="title" value="${esc(node.title)}" required>${hasInstructions ? `<label for="node-prompt">Consigne</label><textarea id="node-prompt" name="prompt">${esc(node.prompt || "")}</textarea>` : ""}<label for="node-criteria">Critères d’acceptation (un par ligne)</label><textarea id="node-criteria" name="criteria">${esc((node.criteria || []).join("\n"))}</textarea>${portEditor(node)}${['agent','task','command'].includes(node.kind) ? `<fieldset><legend>Validation du candidat</legend><label><input type="checkbox" name="candidate_check" ${node.candidate_check ? 'checked' : ''}>Contrôle QA du candidat</label><small>Ce bloc vérifie le candidat reçu. L’entrée candidate est ajoutée ; reliez-la au producteur. ${node.kind==='command' ? 'La commande doit réussir (code 0) avec une preuve.' : 'La sortie verdict est ajoutée : pass ou fail, avec preuves réelles.'} Un document ou un simple transfert ne valide pas le code.</small></fieldset>` : ''}${isAgent ? `<label for="node-route-output">Sortie de branchement (facultatif)</label><select id="node-route-output" name="route_output">${options([['', 'Aucun branchement conditionnel'], ...Object.entries(node.outputs || {}).filter(([,t]) => t === 'string').map(([k]) => [k,k])], node.route_output || '')}</select>${node.route_output ? `<label>Valeurs de branchement (une par ligne)<textarea name="options">${esc(node.options.join('\n'))}</textarea></label>` : ''}<label>Validation du résultat<select name="validation">${options([['contract','Valider automatiquement les sorties'],['human','Attendre ma validation']], node.validation || 'human')}</select></label>` : ''}<details><summary>Organisation de l’étape</summary><label for="node-completion">Effet du résultat sur les tâches dépendantes</label><select id="node-completion" name="completion_outcome">${options([['succeeded', 'Permettre la suite'], ['blocked', 'Bloquer la suite : travail non résolu']], node.completion_outcome || 'succeeded')}</select><label for="node-phase">Phase</label><input id="node-phase" name="phase" value="${esc(node.phase || '')}" placeholder="Analyse, qualité…"></details>
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
    ${['command', 'document', 'watch', 'communication'].includes(node.kind) ? `<label for="node-validation">Validation du résultat</label><select id="node-validation" name="validation">${options([['human', node.kind === 'communication' ? 'Manuelle — après opération' : 'Manuelle'], ['automatic', 'Automatique — contrôles techniques']], node.validation || 'human')}</select><p class="muted">${node.kind === 'communication' ? 'La validation manuelle examine le résultat après l’envoi ou l’opération du connecteur. Pour relire avant envoi, préparez le contenu dans un bloc Document ou Agent, puis placez une Décision humaine avant ce bloc Communication. ' : ''}La validation automatique vérifie succès, types et preuves. Elle exige une liste de critères métier vide.${node.kind === 'communication' ? '' : ' Ajoutez une Décision humaine pour confirmer une action.'}</p>` : ''}
    ${['command', 'document'].includes(node.kind) ? `<label><input type="checkbox" name="reuse" ${node.reuse ? 'checked' : ''}>Autoriser la réutilisation des preuves pendant 24 h</label><small>Uniquement si le bloc, ses dépendances et ses fichiers sont inchangés. Désactiver pour les contrôles dépendant de l’heure ou d’un état extérieur.</small>` : ''}
    <details><summary>Entrées et sorties</summary><label for="node-inputs">Entrées (nom : type, JSON)</label><textarea id="node-inputs" name="inputs">${esc(JSON.stringify(node.inputs || {}, null, 2))}</textarea><label for="node-outputs">Sorties (nom : type, JSON)</label><textarea id="node-outputs" name="outputs">${esc(JSON.stringify(node.outputs || {}, null, 2))}</textarea></details>${["communication", "external"].includes(node.kind) ? `<label for="node-reconciliation">Capacité de recherche d’accusé (lecture, facultative)</label><input id="node-reconciliation" name="reconciliation" value="${esc(node.reconciliation || "")}">` : ""}<details><summary>Reprises, ressources et position</summary><label for="node-attempts">Tentatives maximales</label><input id="node-attempts" name="max_attempts" type="number" min="1" max="10" value="${node.max_attempts || 1}"><label for="node-resources">Ressources exclusives (une par ligne)</label><textarea name="resources" id="node-resources">${esc((node.resources || []).join('\n'))}</textarea><div class="row"><div class="fill"><label for="node-x">Position X</label><input type="number" min="0" max="20000" name="x" id="node-x" value="${nodePosition(node, state.graph.nodes.indexOf(node)).x}"></div><div class="fill"><label for="node-y">Position Y</label><input type="number" min="0" max="20000" name="y" id="node-y" value="${nodePosition(node, state.graph.nodes.indexOf(node)).y}"></div></div></details><div class="row" style="margin-top:22px"><button class="primary" type="submit">Appliquer au bloc</button></div></form>
    <details><summary>Connexions</summary>${state.graph.edges.filter(e => e.from === node.id || e.to === node.id).map(e => `<p class="muted">${esc(e.from)} → ${esc(e.to)} (${esc(e.outcome || 'done')}) ${button('delete-edge', 'Retirer', 'flat', `data-id="${e.id}"`)}</p>`).join('') || '<p class="muted">Aucune connexion.</p>'}</details><hr>${button('delete-node', 'Supprimer cette étape', 'danger')}`;
}

function runInspector(node) {
  const pendingQuestion = state.run.nodes[node.id].question;
  const values = state.run.nodes[node.id];
  const requestText=state.run.parameters?.request;
  const sourceNames=typeof requestText==='string' ? [...requestText.matchAll(/(?:^|\n)(?:Original|Source[^:]*|Pièces[^:]*)\s*:\s*([^\n]+)/g)].map(m=>m[1].split('/').at(-1)).slice(0,3) : [];
  const received = dataView('Entrées reçues', values.inputs) + (values.input_sources && Object.keys(values.input_sources).length && !values.input_sources.$artifact ? `<p class="muted">Sources : ${Object.entries(values.input_sources).map(([key, source]) => `${esc(key)} ← ${button('select-node', esc(source.node), 'flat', `data-id="${esc(source.node)}"`)}`).join(' · ')}</p>` : '') + (values.input_sources?.$artifact ? dataView('Sources des entrées',values.input_sources) : '') + dataView('Résultat', values.result?.outputs) + evidenceView(values) + attemptHistoryView(values,node);
  if(['cancelled','paused'].includes(state.run.status)) return `<p class="notice"><strong>${state.run.status==='cancelled' ? 'Exécution annulée' : 'Exécution suspendue'}</strong></p><p>${state.run.status==='cancelled' ? 'Les résultats sont conservés en lecture seule. Cette exécution ne reprendra pas.' : 'Reprenez l’exécution depuis Options avant de traiter cette étape.'}</p>${pendingQuestion ? dataView('Question conservée',{question:pendingQuestion.text,answer:null}) : ''}${values.result?.summary ? dataView('Dernier résultat',values.result.summary) : ''}${received}`;
  if (state.run.nodes[node.id].status === 'waiting_input') return `${pendingQuestion.text?.$artifact ? dataView('Question',pendingQuestion.text) : `<p>${esc(pendingQuestion.text)}</p>`}${pendingQuestion.notification?.run ? button('notification-run', 'Suivre la notification', '', `data-id="${esc(pendingQuestion.notification.run)}"`) : pendingQuestion.notification?.status === 'blocked' ? `<p class="notice">Notification bloquée : ${esc(pendingQuestion.notification.reason)}</p>` : ''}${received ? `<details class="question-context"><summary>${sourceNames.length ? 'Sources référencées : '+esc(sourceNames.join(', ')) : 'Entrées et sources de la demande'}</summary>${received}</details>` : ''}<p class="muted question-help">Répondez dans le terminal ou ici.</p><form id="question-form"><label>Votre réponse<textarea name="answer" required></textarea></label><button class="primary">Répondre</button></form>`;
  const data = state.run.nodes[node.id]; if (!data) return '';
  if (failedResult(data, node) && !['accepted','skipped'].includes(data.status)) {
    const reason=(data.result?.ok===false && data.result?.summary) || data.validation_error || data.result?.summary || data.reason || 'Le résultat ne satisfait pas le contrôle demandé.';
    const canRetry=data.status==='returned' && node.kind!=='external' && !data.result?.effect_id && data.attempt<(node.max_attempts || 1);
    return `<section class="failure-summary"><strong>Cette étape a échoué</strong>${reason?.$artifact ? dataView('Cause',reason) : `<p>${esc(reason)}</p>`}</section><div class="failure-actions">${data.result?.effect_id ? button('reconcile-effect','Rechercher l’accusé distant','primary') : ''}${canRetry ? button('retry','Préparer la reprise','primary') : node.kind!=='external' && !data.result?.effect_id && !data.effect_uncertain ? button('new-request','Choisir un workflow adapté') : ''}${['agent','task','document'].includes(node.kind) && !data.result?.effect_id && !data.effect_uncertain ? button('configure-execution','Configurer un nouveau lancement…','',`data-id="${esc(state.run.id)}"`) : ''}${state.conversation ? button('conversation-terminal','Retrouver la conversation') : ''}</div><p class="muted">${esc(retryGuidance(data,node))}</p>${node.execution_mode==='edit' && typeof reason==='string' && reason.includes('aucune modification de fichier') ? '<p class="notice">Ce bloc exige des modifications de code. Une collecte de sources, une analyse ou une coordination doit utiliser un workflow adapté à ce travail. Les demandes de correction restent suivies séparément dans la vue d’ensemble.</p>' : ''}${data.validation_error && data.validation_error!==reason ? (data.validation_error?.$artifact ? dataView('Contrôle',data.validation_error) : `<p class="muted">${esc(data.validation_error)}</p>`) : ''}<details class="result-context"><summary>Entrées, résultat technique et historique</summary>${received}</details>`;
  }
  let html = `<p>${nodeBadge(data,node)}</p>`;
  if(data.status==='waiting') html += `<p class="decision-scope">Décision pour cette demande : ${esc(state.conversation?.items.find(i=>i.run===state.run.id)?.request.split('\n')[0] || state.run.definition.title)}.</p>` + received;

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
  if (data.status === 'running') html += `<p>Le travail a commencé. Une fin de processus ne vaut pas validation.</p><p class="muted">Dernier signal : ${new Date((data.heartbeat || data.started) * 1000).toLocaleTimeString('fr-CH')}. ${Date.now() / 1000 - (data.heartbeat || data.started || 0) > 120 ? 'Observation ancienne : activité actuelle inconnue.' : ''}</p>${button('reconcile', 'Rechercher un résultat enregistré')}${button('recover-attempt','Vérifier la tentative interrompue')}`;
  if (data.validation_error) html += data.validation_error?.$artifact ? dataView('Validation interrompue',data.validation_error) : `<p class="notice">Validation automatique interrompue : ${esc(data.validation_error)}</p>`;
  if (data.reused_from) html += `<p class="notice">Preuves réutilisées depuis ${esc(data.reused_from.run)}. Aucun nouveau test exécuté pour ce bloc.</p>`;
  if (data.reason) html += data.reason?.$artifact ? dataView('Motif',data.reason) : `<p class="notice">${esc(data.reason)}</p>`;
  if (data.decision) html += `<p class="notice">Décision humaine : <strong>${esc(decisionLabel(data.decision.outcome))}</strong>.</p>`;
  if (['ready', 'pending', 'skipped'].includes(data.status)) {
    const readiness=launchReadiness(state.run,node.id);
    if(data.status==='ready' && readiness && readiness.status!=='ready') {
      html += `<section class="notice launch-readiness"><strong>${esc(readiness.label)}</strong><p>${esc(readiness.reason)}</p>${readiness.status==='configuration' ? button('configure-execution','Configurer un nouveau lancement…','',`data-id="${esc(state.run.id)}"`) : ''}${state.conversation && (readiness.status==='native' || readiness.native_available) ? button('conversation-terminal','Continuer dans le terminal') : ''}</section>`;
    } else html += `<p class="muted">${data.status === 'ready' ? (state.run.driver ?? state.run.definition.driver) === 'conversation' && ['agent', 'task', 'document'].includes(node.kind) ? 'Cette étape est prête. Poursuivez dans le terminal de la conversation.' : 'Le moteur lancera cette étape dès que ses ressources seront disponibles.' : data.status === 'skipped' ? 'Cette branche n’a pas été sélectionnée.' : 'Cette étape attend ses dépendances.'}</p>`;
  }
  if(data.status!=='waiting' && received) html += `<details class="result-context" ${data.result && data.status!=='running' ? 'open' : ''}><summary>Entrées, sorties et preuves</summary>${received}</details>`;
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
async function loadWorkflowChoices() {
  await call('workspace.get');
  const spaces=[{id:'workspace',title:'Sans projet'},...state.projects.filter(p=>!p.archived)];
  const catalogs=await Promise.all(spaces.map(async project=>{let offset=0,items=[];do{const page=await call('workflow.list',{project:project.id,offset,archived:!!state.showWorkflowArchives});items.push(...page.items);offset=page.next;}while(offset!==null && offset!==undefined);return items.filter(g=>state.showWorkflowArchives || !g.archived).map(graph=>({key:project.id+':'+graph.id,project,graph}));}));
  return {spaces,choices:catalogs.flat()};
}
async function prepareRequest() {
  const origin=state.project && !state.project.library ? state.project.id : 'workspace';
  const catalog=await loadWorkflowChoices(),spaces=catalog.spaces,choices=catalog.choices.filter(c=>!c.graph.archived);state.requestChoices=choices;
  const existing=choices.filter(c=>c.project.id===origin);
  const first=existing[0]?.key || choices[0]?.key || 'template:'+(state.templates.find(g=>g.id==='request-conversation') || state.templates[0]).id;
  const firstProject=choices.find(c=>c.key===first)?.project.id || origin;
  modal('Nouvelle demande', `<form id="request-workflow-form"><p>Choisissez comment travailler. Vous donnerez votre demande à l’agent dans le terminal.</p><label for="request-workflow">Workflow</label><select id="request-workflow" name="choice">${choices.length ? '<optgroup label="Vos workflows">'+options(choices.map(c=>[c.key,c.graph.title+' · '+c.project.title]),first)+'</optgroup>' : ''}<optgroup label="À partir d’un modèle">${options(state.templates.map(g=>['template:'+g.id,g.title]),first)}</optgroup></select><div id="request-destination"><label for="request-project">Projet principal</label><select id="request-project" name="project">${options(spaces.map(p=>[p.id,p.title]),firstProject)}</select></div><p class="notice" id="request-reuse"></p><p class="muted">Pour coordonner plusieurs projets avec ce même workflow, ajoutez-les à l’étape suivante.</p><div class="modal-actions"><button type="submit" class="primary">Continuer</button></div></form>`);
  const describe=()=>{const key=document.querySelector('#request-workflow').value,choice=choices.find(c=>c.key===key),project=spaces.find(p=>p.id===document.querySelector('#request-project').value);document.querySelector('#request-reuse').textContent=choice?.project.id===project.id ? `Le workflow « ${choice.graph.title} » sera réutilisé dans ${project.title}. Une nouvelle exécution conservera ses propres résultats.` : `Une adaptation du workflow sera enregistrée dans ${project.title}, dans .tricorder/workflows/. Elle sera réutilisable pour les demandes suivantes.`;document.querySelector('#request-workflow-form button[type=submit]').textContent=choice?.project.id===project.id?'Continuer':'Enregistrer et continuer';};
  document.querySelector('#request-workflow').addEventListener('change',()=>{const choice=choices.find(c=>c.key===document.querySelector('#request-workflow').value);if(choice)document.querySelector('#request-project').value=choice.project.id;describe();});document.querySelector('#request-project').addEventListener('change',describe);describe();
}
function renderWorkflowCatalog() {
  const choices=state.catalogChoices || [];
  content(`<section class="page">${workflowNavigation('global')}<div class="page-heading"><div><h1>Mes workflows</h1><p>Choisissez un workflow pour démarrer une demande, ou ouvrez-le pour modifier ses étapes.</p></div><div class="row">${button('new-request','Nouvelle demande','primary')}${button('new-work','Créer un workflow')}${button('import-workflow','Importer un workflow')}</div></div><div class="row">${button('workflow-archives',state.showWorkflowArchives?'Masquer les archives':'Voir les archives','flat')}</div><label class="sr-only" for="workflow-search">Rechercher un workflow</label><input id="workflow-search" type="search" placeholder="Rechercher par nom ou projet…"><div class="workflow-list catalog-workflows">${choices.map(c=>`<article class="workflow-row" data-catalog-text="${esc((c.graph.title+' '+c.project.title).toLocaleLowerCase('fr'))}"><div><h3>${esc(c.graph.title)}${c.graph.archived ? ' <span class="pill">Archivé</span>' : ''}</h3><p>${esc(c.project.title)} · ${c.graph.node_count || c.graph.nodes.length} étapes</p></div><div class="row">${button('run-workflow','Exécuter…','primary',`data-project="${c.project.id}" data-id="${c.graph.id}"`)}${button('open-workflow','Ouvrir le workflow','',`data-project="${c.project.id}" data-id="${c.graph.id}"`)}<details class="compact-menu"><summary aria-label="Options de ${esc(c.graph.title)}">⋯</summary><div>${button('archive-item',c.graph.archived?'Restaurer':'Archiver','flat',`data-project="${c.project.id}" data-kind="workflow" data-id="${c.graph.id}" data-archived="${!!c.graph.archived}"`)}</div></details></div></article>`).join('') || `<div class="empty-workflows"><p>Aucun workflow enregistré. Choisissez un modèle ou dessinez votre premier workflow.</p>${button('library-project','Choisir un modèle')}${button('blank-workflow','Créer un workflow vide')}</div>`}</div><p id="workflow-search-empty" class="notice" hidden>Aucun workflow ne correspond à cette recherche.</p></section>`);
  document.querySelector('#workflow-search').addEventListener('input',event=>{const query=event.target.value.trim().toLocaleLowerCase('fr');let shown=0;document.querySelectorAll('[data-catalog-text]').forEach(row=>{row.hidden=!row.dataset.catalogText.includes(query);if(!row.hidden)shown++;});document.querySelector('#workflow-search-empty').hidden=shown>0;});
}
function workflowNavigation(active) {
  return `<nav class="catalog-tabs" aria-label="Bibliothèque de workflows">${button('navigate','Mes workflows',active==='global'?'active':'','data-route="global"')}${button('navigate','Modèles',active==='library'?'active':'','data-route="library"')}</nav>`;
}
function prepareWork(templateId) {
  state.workModels = [{schema:1,id:'__blank__',title:'Nouveau workflow',nodes:[{id:'start',kind:'task',title:'Première étape',position:{x:60,y:80}}],edges:[]}, ...(state.project?.library ? [] : state.workflows).filter(g => !state.templates.some(t => t.id === g.id)), ...state.templates];
  const selected = state.workModels.find(g => g.id === templateId) || state.workModels[0];
  const destination = state.project && !state.project.library ? state.project.id : 'workspace';
  modal('Créer un workflow', `<form id="new-work-form"><p>Partez d’un workflow vide ou d’un modèle. Configurez les blocs dans l’éditeur. Vos demandes seront données au lancement ou dans le terminal.</p><label for="work-template">Modèle de workflow</label><select id="work-template" name="template">${options(state.workModels.map(g => [g.id, g.id==='__blank__' ? 'Workflow vide' : (state.workflows.some(w => w.id === g.id) ? 'Projet · ' : '') + g.title]), selected.id)}</select><label for="work-title">Nom du workflow</label><input id="work-title" name="title" required maxlength="160" value="${esc(selected.title)}"><label for="work-project">Enregistrer dans</label><select id="work-project" name="project">${options([['workspace', 'Sans projet'], ...state.projects.map(p => [p.id, p.title])], destination)}</select><p class="muted">Le workflow sera enregistré dans .tricorder/workflows/ du dossier choisi, prêt à versionner avec Git. Le lancement vient ensuite ; aucun commit ni envoi automatique.</p><div class="modal-actions"><button class="primary" type="submit">Créer et ouvrir le workflow</button></div></form>`);
  let suggestedTitle = selected.title;
  document.querySelector('#work-template').addEventListener('change', event => {
    const model = state.workModels.find(g => g.id === event.target.value);
    const title = document.querySelector('#work-title');
    if(!title.value.trim() || title.value === suggestedTitle)title.value = model.title;
    suggestedTitle = model.title;
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
  if(state.mode!=='run')state.zoom=1;
  state.mode = 'run'; state.route = 'workflow'; state.reviewFocus=!!state.reviewFocus; state.selected = data.run.focus?.node || Object.keys(data.run.nodes).find(id => ['waiting_input','waiting','returned'].includes(data.run.nodes[id].status)) || null;
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
function dataView(label, values) { return businessDataView(label,values,{button}); }
function evidenceView(data) {
  const proofs = data.result?.evidence || [];
  if (proofs.$artifact) return dataView('Preuves',proofs);
  return proofs.length ? `<section class="execution-data"><h3>Preuves</h3>${proofs.map((p,i)=>businessProofView(p,i,{button})).join('')}</section>` : '';
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
      if (proof) { a.dataset.action='read-proof'; a.dataset.sha=proof[1]; a.dataset.proofLabel=a.textContent; a.setAttribute('href','#proof-'+proof[1]); }
      else {a.removeAttribute('href');a.title='Lien externe consultable dans le rapport exporté.';}
    });
    if(page.next !== null) target.insertAdjacentHTML('beforeend',button('document-more','Lire la suite du rapport'));
  }
}
async function executionRequest(run) {
  const request=run.parameters?.request;
  if(typeof request==='string')return request;
  if(!request?.$artifact)return '';
  const chunks=[];let offset=0;
  while(offset!==null) {
    const page=await call('run.proof',{run:run.id,sha256:request.$artifact.sha256,offset});
    if(typeof page.text!=='string' || (page.next!==null && page.next<=offset))throw new Error('Impossible de récupérer la demande complète. Aucun nouveau lancement préparé.');
    chunks.push(page.text);offset=page.next;
  }
  return chunks.join('');
}
async function showProof(sha, offset=0, label='Contenu de la preuve') {
  const page=await call('run.proof',{run:state.run.id,sha256:sha,offset});
  state.proof={sha,offset,next:page.next,label};
  modal(label,`<p>Caractères ${offset+1}–${Math.min(offset+page.text.length,page.total)} sur ${page.total}. Texte brut, aucun contenu actif.</p><div class="execution-value"><pre tabindex="0">${esc(page.text)}</pre>${button('select-value','Sélectionner le texte')}</div>`,(offset ? button('proof-page','Page précédente','',`data-offset="${Math.max(0,offset-32000)}"`) : '')+(page.next !== null ? button('proof-page','Page suivante','',`data-offset="${page.next}"`) : ''),true);
}

const actions = {
  async 'restore-previous-draft'() {const previous=localStorage.getItem(draftKey()+':previous');if(previous) {localStorage.setItem(draftKey(),previous);await openWorkflow(state.graph);toast('Brouillon précédent récupéré. Comparez-le avec le fichier courant.');}},
  async 'template-page'(el) {state.template_page=await call('workflow.list',{project:'library',offset:Number(el.dataset.offset)});state.templates=[...state.templates.filter(g=>!g._project),...state.template_page.items];renderLibrary();},
  async 'overview-page'(el) {state.activity=(await readActivity(Number(el.dataset.offset))).activity;renderOverview();},
  'conversation-overview'() {viewEpoch++;state.conversationScope='overview';renderEditor();},
  'conversation-request'() {viewEpoch++;state.conversationScope='request';renderEditor();requestAnimationFrame(focusSelectedNode);},
  'conversation-search-open'() {const selector=document.querySelector('.request-selector');if(selector)selector.open=true;const search=document.querySelector('.conversation-search-details');if(search)search.open=true;document.querySelector('#conversation-query')?.focus();},
  async 'conversation-dispatch'() {
    const c=state.conversation;if(!c || c.archived || c.status!=='open' || state.dispatching)return;
    state.dispatching=c.id;paintConversationOverview();
    try {
      const runs=c.items.map(item=>item.run).slice(0,25);
      const prior=state.dispatchFeedback?.conversation===c.id ? state.dispatchFeedback.items || [] : [];
      const node_offsets=Object.fromEntries(prior.filter(item=>runs.includes(item.run) && item.next_node!==null && item.next_node!==undefined).map(item=>[item.run,item.next_node]));
      const result=await call('conversation.dispatch',{conversation:c.id,runs,node_offsets},true);
      state.dispatchFeedback={...result,conversation:c.id,at:Date.now()/1000,scope:{offset:c.offset || 0,query:c.query || '',count:runs.length}};
      if(state.conversation?.id===c.id)await pollConversation();
    } finally {state.dispatching=null;paintConversationOverview();}
  },
  'execution-graph'() { state.reviewFocus=false;renderEditor();requestAnimationFrame(focusSelectedNode); },
  'execution-details'() { state.reviewFocus=true; if(!state.selected) state.selected=state.run?.focus?.node || null;renderEditor(); },
  'execution-next-action'() { const action=executionAction(state.run);state.selected=action.node || null;if(action.mode)state.mode=action.mode;else state.reviewFocus=true;renderEditor(); },
  'review-layout'() { state.reviewFocus=!state.reviewFocus;if(!state.selected)state.selected=Object.keys(state.run.nodes).find(id=>['waiting','waiting_input','returned'].includes(state.run.nodes[id].status)) || state.run.definition.nodes[0].id;renderEditor();if(!state.reviewFocus)requestAnimationFrame(focusSelectedNode); },
  'run-page': el => loadRunPage(Number(el.dataset.offset)),
  'toggle-archives'() {state.showArchives=!state.showArchives;shell();},
  async 'workflow-archives'() {state.showWorkflowArchives=!state.showWorkflowArchives;if(state.route==='catalog'){state.catalogChoices=(await loadWorkflowChoices()).choices;renderWorkflowCatalog();}else await actions['workflow-more']({dataset:{offset:'0'}});},
  async 'workflow-more'(el) {state.workflow_page=await call('workflow.list',{project:state.project.id,offset:Number(el.dataset.offset),archived:!!state.showWorkflowArchives});state.workflows=state.workflow_page.items;renderProject();},
  'archive-item'(el) {state.archiveItem={project:el.dataset.project || state.project.id,kind:el.dataset.kind,id:el.dataset.id,archived:el.dataset.archived !== 'true'};modal(state.archiveItem.archived ? 'Archiver cet élément' : 'Restaurer cet élément','<p>L’archivage masque cet élément des listes courantes. Les définitions, résultats et preuves sont conservés ; la restauration reste possible. Une planification restaurée reste suspendue.</p>',button('close-modal','Revenir')+button('confirm-archive','Confirmer','primary'));},
  async 'confirm-archive'() {await call('entity.archive',{...state.archiveItem},true);closeModal();Object.assign(state,await call('bootstrap'));if(state.archiveItem.kind==='schedule')await actions['refresh-schedules']();else if(state.archiveItem.kind==='run')await loadRunPage();else if(state.route==='catalog'){state.catalogChoices=(await loadWorkflowChoices()).choices;renderWorkflowCatalog();}else await openProject(state.project.id);},
  'new-request': prepareRequest,
  async 'request-workflow'(el) {closeModal();await actions['run-workflow'](el);},
  'resume-agent'() { modal('Reprendre l’agent de cette conversation','<p>La reprise se fait uniquement si le terminal est au prompt du shell. Elle efface sa ligne de saisie en cours. La session fournisseur est reprise si son identifiant est connu ; sinon un nouvel agent relit les demandes et résultats conservés, sans créer une seconde conversation Tricorder.</p>',button('close-modal','Revenir')+button('confirm-resume-agent','Reprendre dans ce terminal','primary')); },
  async 'confirm-resume-agent'() { const {project}=await call('project.get',{project:state.conversation.project});closeModal();await terminal.open(project,state.conversation.definition,state.conversation.id,true); },
  'select-value'(el) { const pre=el.closest('.execution-value').querySelector('pre'); const selection=window.getSelection(); const range=window.document.createRange(); range.selectNodeContents(pre); selection.removeAllRanges();selection.addRange(range);pre.focus();toast('Texte sélectionné : Ctrl+C pour copier.'); },
  'read-proof': el => showProof(el.dataset.sha,0,el.dataset.proofLabel || 'Contenu de la preuve'),
  'proof-page': el => showProof(state.proof.sha,Number(el.dataset.offset),state.proof.label),
  'document-more': () => loadDocument(true),
  async 'conversation-page'(el) { const c=state.conversation; state.conversation=await call('conversation.get',{conversation:c.id,offset:Number(el.dataset.offset),query:c.query || ''}); state.conversation.query=c.query || '';state.conversationScroll=0;renderConversation();const surface=document.querySelector('#conversation-overview');if(surface)surface.scrollTop=0; },
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
  async 'run-workflow'(el) { if(el.dataset.project)await openProject(el.dataset.project,false);await openWorkflow(await call('workflow.get',{project:state.project.id,workflow:el.dataset.id})); await actions['start-preview'](); },
  async 'connection-guide'() {
    if(!state.project) Object.assign(state,await call('workspace.get'));
    const prompt=`Aide-moi à configurer une connexion dans ${state.project.path}/.tricorder/plugins.json pour ce projet. Commence par me demander le service, l’opération (lecture, notification ou brouillon) et le destinataire. Identifie un adaptateur local installé et son protocole compatible ; s’il manque, explique ce qui doit être installé. Garde les secrets dans l’outil de connexion. Prépare le catalogue puis indique comment utiliser Actualiser et Vérifier l’adaptateur dans Tricorder. Aucun envoi ni création de brouillon externe avant examen de l’opération et de sa cible.`;
    modal('Configurer une connexion',`<p>Contexte : <strong>${esc(projectTitle(state.project))}</strong></p><ol><li>Choisissez le service et l’opération : lire un email, prévenir sur Slack ou préparer un brouillon.</li><li>Un adaptateur local compatible doit être installé et connecté à votre compte. Les plugins de votre terminal ne deviennent pas automatiquement des connexions Tricorder.</li><li>Demandez à votre agent de préparer le catalogue avec la consigne ci-dessous. Revenez ici, cliquez Actualiser, puis Vérifier l’adaptateur pour examiner ses accès.</li><li>Dans le workflow, sélectionnez l’opération vérifiée et son destinataire. Une notification de question se règle dans les paramètres du workflow.</li></ol><p class="notice">Cette version ne propose pas encore de formulaire de connexion OAuth. L’agent peut préparer la configuration ; il doit signaler tout adaptateur manquant. La déclaration seule ne signifie pas « connecté ».</p><div class="execution-value"><label for="connection-instruction">Consigne à copier dans votre terminal</label><textarea id="connection-instruction" readonly rows="7">${esc(prompt)}</textarea>${button('select-connection-instruction','Sélectionner la consigne')}</div>`,button('connection-terminal','Ouvrir le terminal existant'));
  },
  'select-connection-instruction'() {document.querySelector('#connection-instruction').select();},
  async 'connection-terminal'() { if (!state.project) Object.assign(state, await call('workspace.get')); closeModal(); await terminal.open(state.project, null); },
  async 'attempt-history'(el) {
    const rid=state.run.id, nid=el.dataset.node, offset=Number(el.dataset.offset || 0);
    const node=state.run.definition.nodes.find(n=>n.id===nid);
    const page=await call('run.attempts',{run:rid,node:nid,offset});
    if(state.run?.id!==rid)return;
    modal('Historique des tentatives', attemptHistoryView({attempt_history:page.items},node),
      (offset ? button('attempt-history','Dernières tentatives','',`data-node="${esc(nid)}" data-offset="0"`) : '') +
      (page.next!==null ? button('attempt-history','Tentatives plus anciennes','',`data-node="${esc(nid)}" data-offset="${page.next}"`) : ''));
  },
  async 'reconcile-effect'() { state.run = await call('run.reconcile-effect', { run: state.run.id, node: state.selected }, true); renderInspector(); toast('Résultat distant retrouvé. Aucune opération répétée.'); },
  async 'preview-candidate'() {
    const candidate = await call('candidate.preview', { run: state.run.id, node: state.selected });
    state.pendingCandidate = { ...candidate, run: state.run.id, node: state.selected };
    const data = state.run.nodes[state.selected];
    modal('Modifications proposées', `<p>${candidate.changes.length} fichier(s) · application locale au dépôt ${esc(projectTitle(state.project))}.</p><p>Vérifiez les tests de cette copie avant application. Aucun commit ni publication.</p><pre>${esc(candidate.diff)}</pre>`, button('close-modal', 'Fermer') + (candidate.can_apply && !data.applied_candidate ? button('apply-candidate', 'Appliquer ces modifications au dépôt', 'primary') : `<p>${esc(candidate.reason || 'Candidat déjà appliqué.')}</p>`), true);
  },
  async 'apply-candidate'() {
    const c = state.pendingCandidate;
    state.run = await call('candidate.apply', { run: c.run, node: c.node, candidate: c.candidate }, true);
    closeModal(); renderInspector(); toast('Modifications appliquées au dépôt local. Aucun commit ni publication.');
  },
  async 'refresh-overview'() { Object.assign(state, await readActivity(state.activity?.offset || 0)); renderOverview(); },
  async 'activity-run'(el) { await openProject(el.dataset.project, false);state.conversationScope='request';await openRun(el.dataset.id); },
  async 'handoff-source'(el) { if(state.dirty)await save();state.conversationScope='request';await openRun(el.dataset.id); },
  async navigate(el) { viewEpoch++; if (state.dirty) { await save(); } if (el.dataset.route === 'global') { Object.assign(state, await call('workspace.get'));state.catalogChoices=(await loadWorkflowChoices()).choices;state.route='catalog'; } else { state.route = el.dataset.route; if (state.route === 'overview') Object.assign(state, await readActivity(state.activity?.offset || 0)); if (state.route === 'schedules') state.schedules = await call('schedule.list'); } shell(); },
  theme() { const dark = document.documentElement.dataset.theme === 'dark'; document.documentElement.dataset.theme = dark ? 'light' : 'dark'; localStorage.setItem('tricorder-theme', dark ? 'light' : 'dark'); },
  'new-project'() { modal('Créer un projet', '<form id="project-form"><label for="new-project-title">Nom du projet</label><input id="new-project-title" name="title" required placeholder="Mon projet"><label>Racine du dépôt Git local</label><div class="row"><input id="project-path" name="path" readonly required placeholder="Choisir un dépôt Git existant"><button type="button" data-action="choose-folder">Choisir…</button></div><p class="muted">Le dossier doit être la racine d’un dépôt Git. Aucun commit ni envoi distant n’est effectué.</p><div class="modal-actions"><button class="primary" type="submit">Créer le projet</button></div></form>'); },
  async 'choose-folder'() { const path = await api.folder(); if (path) document.querySelector('#project-path').value = path; },
  async 'try-example'() { const existing = state.projects.find(p => p.managed && p.title === 'Mon premier projet'); if (existing) await openProject(existing.id, false); else { state.project = await call('project.create', { title: 'Mon premier projet' }); state.projects.push(state.project); state.workflows = []; state.runs = []; } await useTemplate('first-workflow'); },
  'open-project': el => openProject(el.dataset.id),
  async 'open-workflow'(el) {const project=el.dataset.project || state.project.id,workflow=el.dataset.id;await openProject(project,false);await openWorkflow(await call('workflow.get',{project,workflow}));},
  'open-run': el => {state.conversationScope='request';return openRun(el.dataset.id);},
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
  async 'schedule-details'(el) {
    const schedule = await call('schedule.get', { schedule: el.dataset.id });
    const graph = schedule.definition;
    const names = new Map(graph.nodes.map(node => [node.id, node.title]));
    const fields = (node) => Object.fromEntries([
      ['Type de bloc', kinds[node.kind] || node.kind], ['Consigne', node.prompt], ['Question', node.question],
      ['Commande', node.argv], ['Critères d’acceptation', node.criteria], ['Entrées', node.inputs], ['Sorties', node.outputs],
      ['Validation du résultat', node.validation === 'human' ? 'Manuelle, après exécution' : node.validation === 'automatic' ? 'Automatique — contrôles techniques' : node.validation === 'contract' ? 'Automatique — sorties attendues' : undefined],
      ['Fournisseur IA', node.provider || graph.defaults?.provider], ['Modèle IA', node.model || graph.defaults?.model],
      ['Profil', node.profile], ['Destinataire', node.recipient], ['Message', node.template],
    ].filter(([,value]) => value !== undefined && value !== '' && !(Array.isArray(value) && !value.length) && !(value && typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length)));
    modal('Version planifiée', `<p><strong>${esc(graph.title)}</strong> · ${graph.revision ? 'révision '+esc(graph.revision) : 'instantané sans numéro'} · ${schedule.simulation ? 'Simulation' : 'Exécution réelle'}</p><p class="notice">Cette version est conservée en lecture seule. Modifier le workflow dans l’éditeur ne change pas les prochains lancements de cette planification.</p><div class="schedule-snapshot">${graph.nodes.map(node => `<details><summary>${esc(node.title)} · ${esc(kinds[node.kind] || node.kind)}</summary>${businessDataView('', fields(node))}</details>`).join('')}</div>${graph.edges.length ? `<details><summary>Connexions entre les blocs</summary><ul>${graph.edges.map(edge => `<li>${esc(names.get(edge.from) || edge.from)} → ${esc(names.get(edge.to) || edge.to)}${edge.outcome ? ' · '+esc(edge.outcome) : ''}${Object.keys(edge.mapping || {}).length ? businessDataView('Données transmises', edge.mapping) : ''}</li>`).join('')}</ul></details>` : ''}<details><summary>Configuration complète de cette version</summary>${businessDataView('', graph)}</details>`, button('close-modal', 'Fermer') + button('replace-schedule', 'Préparer une nouvelle version…', '', `data-id="${esc(schedule.id)}"`), true);
  },
  async 'replace-schedule'(el) {
    const schedule = await call('schedule.get', { schedule: el.dataset.id });
    const graph = await call('workflow.get', { project: schedule.project, workflow: schedule.definition.id });
    if (graph.archived) throw new Error('Restaurez d’abord le workflow dans Mes workflows → Voir les archives. La planification est inchangée.');
    modal('Remplacer cette planification', `<p>La planification actuelle utilise <strong>${esc(schedule.definition.title)}</strong>, ${schedule.definition.revision ? 'révision '+esc(schedule.definition.revision) : 'instantané sans numéro'}. La version enregistrée du workflow est <strong>${esc(graph.title)}</strong>, révision ${esc(graph.revision)}.</p><p>${schedule.archived ? 'L’ancienne planification est déjà archivée.' : 'L’ancienne planification sera archivée et ses prochains départs seront arrêtés.'} Les exécutions déjà en cours continuent. Les exécutions et leurs résultats sont conservés.</p><p>Vous vérifierez ensuite la fréquence, le mode d’exécution et les autorisations de la nouvelle planification. Rien ne démarrera avant votre activation explicite. Si vous annulez cette configuration, aucune nouvelle planification ne sera créée ; vous pourrez restaurer puis réactiver l’ancienne depuis les archives.</p>`, button('close-modal', 'Annuler') + button('confirm-replace-schedule', schedule.archived ? 'Configurer la nouvelle planification' : 'Archiver et configurer la nouvelle', 'primary', `data-id="${esc(schedule.id)}"`));
  },
  async 'confirm-replace-schedule'(el) {
    const schedule = await call('schedule.get', { schedule: el.dataset.id });
    const graph = await call('workflow.get', { project: schedule.project, workflow: schedule.definition.id });
    if (graph.archived) throw new Error('Le workflow a été archivé. Restaurez-le avant de créer une nouvelle planification.');
    if (!schedule.archived) await call('entity.archive', { kind: 'schedule', id: schedule.id, project: schedule.project, archived: true }, true);
    closeModal();
    await openProject(schedule.project, false); await openWorkflow(graph);
    // Deliberately start a fresh activation form: no frequency, mode or consent
    // inherited from an old launch draft or the archived schedule.
    delete state.scheduleDrafts[launchKey()];
    await actions.schedule();
    const note = document.createElement('p'); note.className = 'notice'; note.textContent = 'L’ancienne planification est archivée. Vérifiez ces réglages et autorisez cette nouvelle version avant de l’activer.';
    document.querySelector('#schedule-form').prepend(note);
  },
  async schedule() {
    rememberLaunchDraft();
    if (state.dirty) await save();
    const check = await call('workflow.validate', { project: state.project.id, graph: state.graph });
    const models = state.graph.nodes.filter(n => n.kind === 'agent').map(n => `${n.title} : ${effectiveExecution(state.project, state.graph, n).provider.value} / ${effectiveExecution(state.project, state.graph, n).model.value || 'à définir'}`);
    modal('Configurer une planification', `<form id="schedule-form"><p><strong>${esc(state.graph.title)}</strong> · révision ${state.savedRevision}</p><p>Modèles IA : ${models.length ? esc(models.join(' ; ')) : 'aucun'}. ${models.length ? 'Chaque occurrence réelle peut consommer votre abonnement.' : ''}</p>${activationDetails(check)}${launchDiagnostics(check.issues, 'À configurer avant la planification')}<label for="schedule-kind">Fréquence</label><select name="kind" id="schedule-kind"><option value="daily">Chaque jour</option><option value="weekly">Du lundi au vendredi</option><option value="interval">À intervalle régulier</option></select><div class="row"><div class="fill"><label for="schedule-time">Heure locale</label><input name="time" id="schedule-time" type="time" value="09:00"></div><div class="fill"><label for="schedule-minutes">Intervalle (minutes)</label><input name="minutes" id="schedule-minutes" type="number" min="5" max="525600" value="30"></div></div><label for="schedule-timezone">Fuseau horaire</label><input name="timezone" id="schedule-timezone" value="${esc(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Zurich')}"><label><input type="checkbox" name="simulation" checked>Simulation sans appel de modèle ni de service</label><label><input type="checkbox" required>J’active cette révision à cette fréquence. Les décisions humaines du workflow restent obligatoires.</label><p class="muted">Sans chevauchement. L’ordinateur et Tricorder doivent être ouverts. Une heure inexistante au changement d’heure est ignorée ; une heure répétée s’exécute une seule fois.</p><div class="modal-actions"><button type="submit" class="primary">Activer la planification</button></div></form>`, '', true);
    const draft = state.scheduleDrafts[launchKey()]; if (draft) for (const [key,value] of Object.entries(draft)) { const field = document.querySelector('#schedule-form').elements.namedItem(key); if (field.type === 'checkbox') field.checked=value; else field.value=value; } state.launchReturn = null;
  },
  async terminal() { if (!state.project) await ensureProject(); if (state.dirty) await save(); await terminal.open(state.project, state.graph, state.conversation?.id); },
  async 'reload-file'() { if (state.dirty) return showConflict(); const graph = await call('workflow.reload', { project: state.project.id, workflow: state.graph.id, revision: state.savedRevision }); state.graph = graph; state.savedRevision = graph.revision; state.history = new History(); renderEditor(); toast('Fichier validé et nouvelle révision chargée. Les exécutions existantes sont inchangées.'); },
  'select-node'(el) { state.selected = el.dataset.id; if (state.mode === 'run') { state.reviewFocus = true; renderEditor(); return; } document.querySelectorAll('.node').forEach(n => n.classList.toggle('selected', n.dataset.id === state.selected)); renderInspector(); },
  'workflow-settings'() { modal('Paramètres du workflow', `<form id="workflow-form"><label for="workflow-title">Nom</label><input id="workflow-title" name="title" value="${esc(state.graph.title)}" required><label for="workflow-description">Description</label><textarea id="workflow-description" name="description">${esc(state.graph.description || '')}</textarea>${questionNotificationForm()}${odooWorkflowFields()}<details><summary>Paramètres supplémentaires</summary><label for="workflow-parameters">Paramètres (objet JSON)</label><textarea id="workflow-parameters" name="parameters" spellcheck="false">${esc(JSON.stringify(workflowExtraParameters(), null, 2))}</textarea></details><div class="modal-actions"><button class="primary" type="submit">Appliquer</button></div></form>`, state.launchReturn ? button('return-to-launch', state.launchReturn.kind === 'schedule' ? 'Revenir à la planification' : 'Revenir au lancement') : ''); },
  'add-node'() { modal('Ajouter une étape', `<form id="add-node-form"><label for="add-kind">Type d'étape</label><select id="add-kind" name="kind">${options([['agent', 'Travail · Agent'], ['task', 'Travail · Tâche dans la conversation'], ['command', 'Travail · Commande'], ['document', 'Travail · Document'], ['agent-route', 'Aiguillage · Évaluation par un agent'], ['condition', 'Aiguillage · Règle explicite'], ['decision', 'Décision · Accord humain'], ['question', 'Décision · Question ouverte'], ['join', 'Organisation · Réunir'], ['subworkflow', 'Organisation · Sous-workflow'], ['watch', 'Organisation · Surveillance'], ['external', 'Travail · Opération externe'], ['communication', 'Travail · Communication']], 'agent')}</select><label for="add-title">Nom du bloc</label><input id="add-title" name="title" required placeholder="Quel résultat attendre ?"><div class="modal-actions"><button class="primary" type="submit">Ajouter au workflow</button></div></form>`); },
  connect() { modal('Relier deux étapes', `<form id="connect-form"><label for="edge-from">Depuis</label><select id="edge-from" name="from">${options(state.graph.nodes.map(n => [n.id,n.title]), state.selected || state.graph.nodes[0].id)}</select><label for="edge-outcome">Après l’issue</label><select id="edge-outcome" name="outcome"></select><label for="edge-to">Vers</label><select id="edge-to" name="to">${options(state.graph.nodes.map(n => [n.id,n.title]), state.graph.nodes.find(n => n.id !== (state.selected || state.graph.nodes[0].id))?.id)}</select><p class="mapping-summary"></p><label>Sortie à transmettre<select name="output"></select></label><label>Entrée destinataire<select name="input"></select></label><details><summary>Configuration des échanges</summary><label for="edge-mapping">Données transmises (JSON : sortie → entrée)</label><textarea id="edge-mapping" name="mapping">{}</textarea></details><div class="modal-actions"><button class="primary">Créer la connexion</button></div></form>`); refreshConnectionForm(); },
  'add-port'(el) { modal('Décrire une donnée', `<form id="port-form"><input type="hidden" name="direction" value="${el.dataset.direction}"><label>Nom (sans espaces)<input name="port" required pattern="[a-zA-Z][a-zA-Z0-9_.-]{0,79}" placeholder="criticite"></label><label>Type<select name="type">${options([['string','Texte'],['object','Objet structuré'],['array','Liste'],['boolean','Oui / non'],['number','Nombre']])}</select></label><button class="primary">Ajouter la donnée</button></form>`); },
  'remove-port'(el) { edit(g => { delete g.nodes.find(n => n.id === state.selected)[el.dataset.direction][el.dataset.port]; }); },
  'close-inspector'() { if(state.mode === 'run') { state.reviewFocus=false;renderEditor();requestAnimationFrame(focusSelectedNode);return; } state.selected = null; renderInspector(); },
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
  fit() { if(state.mode==='run'){state.zoom=1;renderGraph();requestAnimationFrame(focusSelectedNode);return;} const g = currentGraph(), width = Math.max(...g.nodes.map((n, i) => nodePosition(n, i).x + 320)); state.zoom = Math.max(0.4, Math.min(1, (document.querySelector('.canvas-area').clientWidth - 30) / width)); renderEditor(); },
  'back-design'() { state.mode = 'design'; state.selected = null; renderEditor(); },
  async mode(el) { state.mode = el.dataset.mode; state.selected = state.mode==='run' ? state.run?.focus?.node || null : null; if (state.mode === 'history') { await loadRunPage(); return; } renderEditor(); },
  async 'start-preview'() {
    rememberLaunchDraft();
    if (state.dirty) await save();
    const draft = state.launchDrafts[launchKey()] || { request: state.graph.parameters?.request || '', projects: [] };
    const validation = await call('workflow.validate', { project: state.project.id, graph: state.graph });
    const native = await call('workflow.validate', nativeLaunchPayload());
    state.reuseSource = state.runs.find(r => r.original.id === state.graph.id && !r.simulation)?.id;
    modal('Lancer cette version du workflow', `<div class="launch-dialog"><label for="initial-request">Quelle demande souhaitez-vous traiter ?</label><textarea id="initial-request" placeholder="Décrivez-la ici ou directement dans le terminal.">${esc(draft.request)}</textarea><p>Cette saisie est facultative : vous pouvez tout expliquer à l’agent dans votre terminal ${integration.provider() === 'claude' ? 'Anthropic · Claude' : 'OpenAI · Codex'}. Vous pourrez soumettre une ou plusieurs tâches.</p><details class="launch-projects" ${draft.projects.length ? 'open' : ''}><summary>Inclure d’autres projets</summary>${state.projects.filter(p => p.id !== state.project.id).map(p => `<label><input type="checkbox" name="conversation-project" value="${esc(p.id)}" ${draft.projects.includes(p.id) ? 'checked' : ''}>${esc(p.title)}</label>`).join('')}</details>${activationDetails(native)}<div id="launch-native-check">${launchDiagnostics(native.issues, 'À résoudre avant le lancement')}${launchDiagnostics(native.requirements, 'À préparer pendant le workflow', true)}</div><div class="launch-primary">${button('start-conversation', 'Lancer dans le terminal', 'primary', native.issues.length ? 'disabled' : '')}${button('check-launch', 'Vérifier à nouveau', 'flat')}</div><details class="launch-automatic"><summary>Exécution automatique sans conversation</summary>${state.graph.nodes.some(n => n.kind === 'agent') ? aiForm(true) : ''}<p><strong>${esc(state.graph.title)}</strong> · révision ${state.savedRevision} · ${state.graph.nodes.length} étapes</p><p>Ce mode démarre les étapes sans conversation. Tous ses prérequis doivent être configurés.</p>${state.reuseSource ? '<label><input type="checkbox" id="reuse-evidence">Réutiliser les preuves encore valides des blocs qui l’autorisent</label>' : ''}${launchDiagnostics(validation.issues, 'À configurer pour le mode automatique')}${button('start-real', 'Lancer l’exécution réelle', 'primary', validation.issues.length ? 'disabled' : '')}</details></div>`, button('start-simulation', 'Simuler le parcours'));
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
    state.graph = clone(c.definition); state.run = null; state.dirty = false;state.conversationScroll=0;state.conversationScope=(c.item_count ?? c.items.length)>1?'overview':'request';
    if (c.items.length) await openRun(c.items[0].run);
    else { state.route = 'workflow'; state.mode = 'run'; shell(); }
  },
  'start-conversation': launchConversation,
  async 'conversation-terminal'() { const { project } = await call('project.get', { project: state.conversation.project }); await terminal.open(project, state.conversation.definition, state.conversation.id); },
  async 'conversation-item'(el) { const selector=document.querySelector('.request-selector');if(selector)selector.open=false;state.compactRequestsOpen=false;if(conversationOverviewActive())state.conversationScroll=document.querySelector('#conversation-overview')?.scrollTop || 0;state.conversationScope='request';await openRun(el.dataset.id); },
  async 'conversation-item-action'(el) {await actions['conversation-item'](el);actions['execution-next-action']();},
  async 'configure-execution'(el) {
    const data=await call('run.get',{run:el.dataset.id});
    state.reconfigureRun=data.run;
    state.reconfigureRequest=await executionRequest(data.run);
    modal('Configurer un nouveau lancement',`<p>Cette demande conserve sa version et ses résultats. Vous pouvez continuer dans son terminal si cette étape le permet.</p><p>Pour changer la configuration des agents de bloc, préparez une copie du workflow puis lancez une nouvelle exécution. Les décisions et résultats précédents ne sont pas transférés.</p><p>Demande : <strong>${esc(state.reconfigureRequest.slice(0,400) || data.run.definition.title)}${state.reconfigureRequest.length>400 ? '…' : ''}</strong></p>`,button('configure-execution-copy','Configurer une copie','primary'));
  },
  async 'configure-execution-copy'() {
    const run=state.reconfigureRun;closeModal();await openProject(run.project,false);
    const graph=clone(run.original);graph.id='work-'+crypto.randomUUID();delete graph.revision;graph.title+=' — adaptation';
    await openWorkflow(graph);state.dirty=true;persistDraft();
    state.launchDrafts[launchKey()]={request:state.reconfigureRequest || '',projects:[]};renderEditor();actions['workflow-ai']();
  },
  'conversation-add': () => addRequestDialog(),
  'replace-dependent': () => addRequestDialog(true),
  'dependency-page': el => dependencyChoices(Number(el.dataset.offset),state.dependencyDraft.query),
  'dependency-search': () => dependencyChoices(0,document.querySelector('#dependency-query').value),
  'start-simulation': () => launch(true),
  'start-real': () => launch(false),
  async pause() { if(state.run.status==='paused' && blockedDependencies().length) {state.reviewFocus=true;state.selected=null;renderEditor();return;} state.run = await call('run.control', { run: state.run.id, control: state.run.status === 'paused' ? 'resume' : 'pause' }); renderEditor(); },
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
  state.run = run; state.runs.unshift(run); state.events = []; state.mode = 'run'; state.zoom=1; state.selected = run.definition.nodes[0].id; closeModal(); renderEditor();
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
document.addEventListener('keydown', event => { if(event.key==='Escape') { const menu=document.querySelector('.request-selector[open]');if(menu){menu.open=false;state.compactRequestsOpen=false;menu.querySelector('summary').focus();event.preventDefault();} } });
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
  if(event.target.matches('#dependency-choices input[name=depends]')) {const selected=state.dependencyDraft.selected;event.target.checked?selected.add(event.target.value):selected.delete(event.target.value);document.querySelector('#dependency-count').textContent=`${selected.size} demande(s) préalable(s) sélectionnée(s). La nouvelle demande attendra leur réussite à toutes.`;}
  const interaction=event.target.closest('#question-form,#decision-form,#receipt-form');if(interaction){const key=interactionDraftKey(interaction);if(key)localStorage.setItem(key,JSON.stringify(Object.fromEntries([...interaction.querySelectorAll('textarea[name]')].map(field=>[field.name,field.value]))));}
  if (event.target.closest('#node-form')) { const form=event.target.closest('#node-form');localStorage.setItem(draftKey(),JSON.stringify({graph:state.graph,revision:state.savedRevision,form:{node:state.selected,values:formDraft(form)}})); document.querySelector('[data-action=save]')?.removeAttribute('disabled'); const heading = document.querySelector('.workflow-heading p'); if (heading) heading.textContent = 'Modifications non enregistrées'; }
  if (event.target.id === 'workflow-model') document.querySelector('[data-action="start-real"]')?.setAttribute('disabled', '');
});

document.addEventListener('submit', event => {
  event.preventDefault(); const form = event.target; const submitterValue=event.submitter?.value; const data = Object.fromEntries(new FormData(form));
  if (form.id === 'schedule-form') {
    // Lock synchronously, before queueing: two valid submit events must never
    // create two active schedules while the first backend reply is pending.
    if (form.dataset.pending) return;
    form.dataset.pending = '1';
    const submit = form.querySelector('button[type=submit]'); submit.disabled = true;
    enqueue(async () => {
      try {
        if (!form.isConnected) return;
        await call('schedule.create', { project: state.project.id, graph: state.graph, simulation: data.simulation === 'on', authorize_notifications: data.authorize_notifications === 'on', rule: { kind: data.kind, time: data.time, minutes: Number(data.minutes), timezone: data.timezone, weekdays: [0, 1, 2, 3, 4] } }, true);
        closeModal(); await actions['refresh-schedules'](); toast('Planification activée. Elle apparaît aussi dans l’icône Ubuntu.');
      } finally { delete form.dataset.pending; submit.disabled = false; }
    });
    return;
  }
  enqueue(async () => {
    if (form.id === 'run-filters') {state.runFilters={query:data.query,status:data.status,simulation:data.simulation,archived:data.archived === 'on'};await loadRunPage();}
    if (form.id === 'conversation-search') { state.conversation=await call('conversation.get',{conversation:state.conversation.id,query:data.query});state.conversation.query=data.query;renderConversation(); }
    if (form.id === 'conflict-form') { const choices=Object.fromEntries((state.conflict.conflicts || []).map((c,i)=>[c.path,data['choice-'+i]]).filter(([,v])=>v)); const oldKey=draftKey(); const graph=await call('workflow.resolve',{project:state.project.id,graph:state.graph,revision:state.savedRevision,digest:state.conflict.digest,strategy:submitterValue,choices},true); if(submitterValue !== 'disk') localStorage.removeItem(oldKey); else localStorage.setItem(oldKey+':previous',localStorage.getItem(oldKey)); localStorage.removeItem(oldKey);closeModal();await openProject(state.project.id,false);await openWorkflow(graph);toast('Conflit résolu ; une nouvelle révision a été enregistrée.'); }
    if (form.id === 'new-work-form') {
      if (data.project === 'workspace') await call('workspace.get');
      const model=state.workModels.find(g => g.id === data.template); const graph = model.summary ? await call('workflow.get',{project:model._project,workflow:model.id}) : clone(model); delete graph._project;
      graph.id = 'work-' + crypto.randomUUID(); delete graph.revision;
      graph.title = data.title.trim();
      graph.parameters = { ...graph.parameters };delete graph.parameters.request;
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
    if (form.id === 'conversation-add-form') { await call('conversation.add', { conversation: state.conversation.id, request: data.request, project: data.project, depends_on: [...state.dependencyDraft.selected] }); closeModal(); await pollConversation(); return; }
    if (form.id === 'question-form') { const draft=interactionDraftKey(form),q = state.run.nodes[state.selected].question; await call('run.answer', { run: state.run.id, node: state.selected, question: q.id, text: data.answer });localStorage.removeItem(draft);await poll(); renderInspector(); return; }
    if (form.id === 'workflow-ai-form') { flushNodeForm(); const next = withWorkflowAI(state.graph, data); edit(g => Object.assign(g, next)); await save(); await integration.setProvider(data.provider); closeModal(); if (data.preview === 'yes') await actions['return-to-launch'](); return; }
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
      const draft=interactionDraftKey(form),s = state.run.nodes[state.selected]; state.run = await call('run.decide', { run: state.run.id, node: state.selected, nonce: s.nonce, proposal: s.proposal, outcome: submitterValue, note: data.note }, true);localStorage.removeItem(draft);renderGraph(); renderInspector(); toast('Décision enregistrée.');
    }
    if (form.id === 'receipt-form') { const draft=interactionDraftKey(form),node = state.run.definition.nodes.find(n => n.id === state.selected); state.run = await call('run.accept', { run: state.run.id, node: state.selected, checks: node.criteria || [], note: data.note }, true);localStorage.removeItem(draft);renderGraph(); renderInspector(); toast('Validation enregistrée.'); }
    if (form.id === 'retry-form') { state.run = await call('run.retry', { run: state.run.id, node: state.selected, note: data.note }, true); closeModal(); renderGraph(); renderInspector(); }
    if (form.id === 'export-form') { const path = await call('release.export', { run: state.run.id, ...data }); closeModal(); toast('Release exportée : ' + path); }
    if (form.id === 'assistant-form') {
      const snapshot = JSON.stringify(state.graph);
      const run = await call('assistant.propose', { project: state.project.id, graph: state.graph, ...data });
      state.assistantRun = { id: run.id, snapshot, graph: state.graph.id };
      modal('Proposition en préparation', '<p id="assistant-progress">La session de conception travaille sur ce brouillon. Vous pouvez fermer cette fenêtre ; le résultat restera dans l’historique du projet.</p><p class="muted">Aucun workflow n’est activé par cette demande.</p>');
    }
    if (form.id === 'request-workflow-form') {
      const choice=state.requestChoices.find(c=>c.key===data.choice);
      if(choice && choice.project.id===data.project) { await openProject(choice.project.id,false);await openWorkflow(choice.graph); }
      else {
        const source=choice?.graph || state.templates.find(g=>'template:'+g.id===data.choice);
        const graph=source.summary ? await call('workflow.get',{project:choice?.project.id || source._project,workflow:source.id}) : clone(source);
        await openProject(data.project,false);
        delete graph._project;delete graph.revision;graph.id+='-'+Date.now().toString(36);
        const saved=await call('workflow.save',{project:state.project.id,graph});state.workflows.push(saved);await openWorkflow(saved);
      }
      closeModal();state.launchDrafts[launchKey()]={request:'',projects:[]};await actions['start-preview']();
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
    const offset = state.conversation.offset || 0, query = state.conversation.query || '';
    const c = await call('conversation.get', { conversation: id, offset, query });
    if (state.conversation?.id !== id || epoch !== viewEpoch || (state.conversation.offset || 0) !== offset || (state.conversation.query || '') !== query) return;
    c.query = query;
    const changed = JSON.stringify(c) !== JSON.stringify(state.conversation);
    state.conversation = c;
    if (state.route === 'workflow' && !state.run && c.items.length) {state.conversationScope=(c.item_count ?? c.items.length)>1?'overview':'request';await openRun(c.items[0].run, () => epoch === viewEpoch && state.route === 'workflow' && state.graph?.id === graph && state.conversation?.id === id && !state.run);}
    else if ((changed || state.conversationPaintPending) && state.route === 'workflow') renderConversation();
    else if(state.route==='workflow' && conversationOverviewActive())paintConversationOverview();
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
    if (conversationOverviewActive()) return;
    // Follow a changing active step only while watching the graph. Reading a
    // result or typing an answer must never be interrupted by polling.
    if (state.mode === 'run' && !state.reviewFocus && state.selected === previous.focus?.node && previous.focus?.node !== state.run.focus?.node) {
      state.selected=state.run.focus?.node || null;
      document.querySelectorAll('.node').forEach(n=>n.classList.toggle('selected',n.dataset.id===state.selected));
      renderInspector(); requestAnimationFrame(focusSelectedNode);
    }
    if (state.mode === 'run') {
      for (const [nid, s] of Object.entries(state.run.nodes)) {
        const card = document.querySelector(`.node[data-id="${CSS.escape(nid)}"]`);
        const definition=state.run.definition.nodes.find(n=>n.id===nid);
        if (card && (previous.nodes[nid]?.status !== s.status || nodeLabel(previous.nodes[nid],definition,previous) !== nodeLabel(s,definition))) { card.dataset.status = s.status; card.dataset.failed=String(Boolean(nodeFailed(s, definition))); card.querySelector('.node-footer .pill').outerHTML = nodeBadge(s, definition); card.setAttribute('aria-label', `${state.run.definition.nodes.find(n => n.id === nid).title} · ${nodeLabel(s,definition)}`); }
      }
      for (const edge of state.run.definition.edges) {
        const source = state.run.nodes[edge.from];
        document.querySelector(`path[data-edge="${CSS.escape(edge.id)}"]`)?.classList.toggle('active', source.status === 'accepted' && source.outcome === (edge.outcome || 'done'));
      }
      for (const group of displayGraph(state.run.definition, state.collapsed, state.run).nodes.filter(n => n.kind === 'group')) {
        const card = document.querySelector(`[data-group="${CSS.escape(group.phase)}"]`);
        if (card) { card.dataset.status = group.status; card.querySelector('.pill').outerHTML = badge(group.status); }
      }
      if (previous.status!==state.run.status || previous.coordination_wait!==state.run.coordination_wait || JSON.stringify(previous.launch)!==JSON.stringify(state.run.launch) || (state.selected && JSON.stringify(previous.nodes[state.selected]) !== JSON.stringify(state.run.nodes[state.selected]))) renderInspector();
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
const ready = safe(async () => { const data = await call('bootstrap'); Object.assign(state,data,await readActivity());shell();const pending = await api.portable({ action: 'pending' }); if (pending) previewImport(pending); state.update = await api.updates({ action: 'status' }); updateIndicator(); });
setInterval(poll, 1000);
let overviewPolling = false;
let overviewNeedsRender = false;
setInterval(async () => {
  if (state.route !== 'overview' || overviewPolling || document.querySelector('.modal')) return;
  overviewPolling = true;
  try {
    const data = await readActivity(state.activity?.offset || 0);
    if (state.route !== 'overview') return;
    const changed = JSON.stringify(data.activity) !== JSON.stringify(state.activity) || JSON.stringify(data.schedules) !== JSON.stringify(state.schedules) || JSON.stringify(data.pendingConversations)!==JSON.stringify(state.pendingConversations);
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
  if (destination.route === 'global') { Object.assign(state,await call('workspace.get'));state.catalogChoices=(await loadWorkflowChoices()).choices;state.route='catalog';shell();return; }
  if (destination.route === 'run') { await openProject(destination.project, false); await openRun(destination.run); if (destination.node) { state.selected=destination.node; renderInspector(); } }
  else { state.route = destination.route; shell(); }
}); });

function previewImport(preview) {
  state.importBundle = preview.bundle;
  const graph = preview.bundle.workflow, needs = preview.requirements;
  modal('Importer un workflow portable', `<p><strong>${esc(graph.title)}</strong> · ${graph.nodes.length} bloc${graph.nodes.length > 1 ? 's' : ''} · ${graph.edges.length} lien${graph.edges.length > 1 ? 's' : ''}</p><p>${esc(graph.description || '')}</p><p>Modèles : ${esc(needs.models.map(m => m.provider + ' / ' + m.model).join(', ') || 'aucun')}<br>Agents dédiés : ${esc(needs.profiles.join(', ') || 'aucun')}<br>Capacités : ${esc(needs.capabilities.map(c => c.plugin + ' / ' + c.operation).join(', ') || 'aucune déclarée')}</p><p class="muted">Les connexions devront être vérifiées sur cet ordinateur. L’import crée un brouillon sans reprendre les exécutions, les accords ou les planifications du poste d’origine.</p><details><summary>Examiner les étapes et leur configuration</summary><pre>${esc(JSON.stringify(graph, null, 2))}</pre></details><form id="import-workflow-form"><label for="import-context">Destination</label><select id="import-context" name="context">${options([['workspace', 'Sans projet'], ['library', 'Bibliothèque de modèles'], ...state.projects.map(p => [p.id, p.title])], state.project?.id || 'workspace')}</select><div class="modal-actions"><button class="primary" type="submit">Importer le brouillon</button></div></form>`);
}

function updateIndicator() {
  const target = document.querySelector('#update-indicator');
  if (target) target.innerHTML = state.update?.status === 'available' ? button('updates', `Mise à jour ${esc(state.update.latest)}`, 'flat') : '';
}
function previewUpdate() {
  const update = state.update || {};
  modal('Mises à jour de Tricorder', `<p>Version installée : <strong>${esc(update.current || 'inconnue')}</strong></p><p>${update.status === 'available' ? `La release stable ${esc(update.latest)} est disponible.` : update.status === 'current' ? 'Aucune version stable plus récente détectée.' : esc(update.reason || 'Vérification disponible hors mode de test.')}</p><p class="muted">Tricorder vérifie GitHub à son lancement. Le téléchargement et l’installation restent explicites ; vos workflows ne sont pas redémarrés automatiquement.</p>${update.notes ? `<details><summary>Notes de la release</summary><pre>${esc(update.notes)}</pre></details>` : ''}`, button('check-updates', 'Vérifier maintenant') + (update.url ? button('update-notes', 'Ouvrir la release GitHub') : '') + (update.status === 'available' && update.download ? button('download-update', 'Télécharger le paquet Ubuntu', 'primary') : ''));
}

return { ready, newRequest: () => enqueue(prepareRequest), showUpdates: () => actions.updates(), navigate(route, project) {
  viewEpoch++;
  return enqueue(async () => {
  await ready; flushNodeForm();
  Object.assign(state, await call('bootstrap', {project: state.project?.id}));
  if (state.dirty) await save();
  if (project) { await openProject(project); return; }
  await actions.navigate({ dataset: { route } });
  });
}, get context() { return { project: state.project, graph: state.graph, run: state.run }; } };
}

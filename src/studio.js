import { portType, portRequired, normalizedPort, portDescription, typeNames, incompatibleReason, convertWorkflow, collectionPort, basicChildWorkflow, advancedNode, descriptorFromFields } from './workflow-contract-ui.mjs';
import { collectionView, coordinationView, associatedView, runtimeCardContent } from './workflow-coordination-view.mjs';
import { movedEnough, dragPosition, placement, zoomScroll, fitViewport } from './editor-gestures.mjs';
import { scheduleFrequency, replacementScheduleDraft } from './schedule-configuration.mjs';
import { businessDataView, businessProofView, decisionLabel } from './business-results.mjs';
import { executionLayout } from './execution-layout.mjs';
import { designLayout, designRoutes } from './design-layout.mjs';
import { activityText, conversationOverviewView, dependencyBlocked } from './conversation-view.mjs';
import { attemptHistoryView } from './execution-attempts.mjs';
import { reusableWorkflow, connectionOutcomes, designWarnings, simulationValues, copyTitle } from './workflow-design.mjs';
import DOMPurify from 'dompurify';
import { executionAction, executionIssue, failedResult, retryGuidance, launchReadiness, executionProgress, childActivity, childActivityLabel, readableFailure, requestHeading } from './execution-view.mjs';
import { marked } from 'marked';
import { states, kinds, symbols, nodePosition, effectiveExecution, History, applyPatch, patchSummary, displayGraph, withWorkflowAI } from './studio-model.js';

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
  open: async (project, graph, conversation, resume=false) => { const result=await integration.openTerminal(project, graph, conversation, resume); if(conversation && state.conversation?.id === conversation) {state.agentState=result?.agentState;state.agentConversation=conversation;renderConversation();}return result; } };

const app = document.querySelector('#app');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clone = value => structuredClone(value);
const options = (values, selected) => values.map(([value, label]) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
const state = { projects: [], templates: [], capabilities: [], route: 'overview', project: null, workflows: [], runs: [], graph: null, savedRevision: 0, run: null, events: [], selected: null, mode: 'design', view: 'canvas', zoom: 1, history: new History(), dirty: false, polling: false, modal: null, collapsed: new Set(), launchDrafts: {}, scheduleDrafts: {}, launchReturn: null };
let toastTimer;
const parentViews = [];
const collectionDrafts = new Map();
const collectionInFlight = new Set();
let editorGesture = null, suppressGestureClick = false;
let actionQueue = Promise.resolve();
let viewEpoch = 0;
const pendingInteractions = new Set();
function enqueue(fn) { actionQueue = actionQueue.then(() => safe(fn)); return actionQueue; }

async function call(action, data = {}, human = false) { return (human ? api.human : api.request)({ action, ...data }); }
function toast(message) {
  document.querySelector('.flash')?.remove();
  const el = document.createElement('div'); el.className = 'flash'; el.setAttribute('role', 'status'); el.textContent = message; document.body.append(el);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.remove(), 5500);
}
function error(message) {
  const node=state.graph?.nodes.find(node=>String(message).startsWith(node.id+' :'));
  if(node)message=node.title+String(message).slice(node.id.length);
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
  if(node?.status === 'accepted' && node.decision) return decisionLabel(node.decision.outcome);
  const ready=node?.status==='ready' && launchReadiness(run,definition?.id);
  if(ready && run?.parameters?.conversation && (ready.status==='native' || ready.native_available))return 'Dans la conversation';
  if(node?.status==='accepted') { if(node.decision?.outcome==='approve')return 'Approuvé par vous'; if(['contract-policy','validation-policy'].includes(node.receipt?.actor))return 'Produit · sorties vérifiées'; if(definition?.kind==='question')return 'Répondu'; if(definition?.kind==='input')return 'Liste confirmée'; if(definition?.kind==='foreach')return 'Éléments terminés'; }
  return ready ? ({configuration:'À configurer',native:'Dans le terminal',waiting:'En attente',unknown:'À vérifier',ready:'Prêt'}[ready.status] || states.ready) : states[node?.status || 'pending'];
}
function retryRunsAutomatically(node) { return (state.run.driver ?? state.run.definition.driver ?? 'automatic') === 'automatic' || !['agent','task','document','foreach'].includes(node.kind); }
function nodeBadge(node, definition) { return `<span class="pill ${nodeFailed(node,definition) ? 'failed' : node?.status === 'accepted' && node.decision?.outcome === 'reject' ? 'decision-rejected' : node?.status === 'accepted' && node.decision && node.decision.outcome !== 'approve' ? 'decision-recorded' : esc(node?.status || 'pending')}">${esc(nodeLabel(node,definition))}</span>`; }
function frozenRevision(run) { return run?.definition?.revision ? `Révision ${run.definition.revision} figée` : 'Version figée'; }
function badge(status) { return `<span class="pill ${esc(status)}">${esc(states[status] || status)}</span>`; }
function updateRunBanner() {
  const banner = document.querySelector('#run-banner');
  if (state.mode === 'run') renderExecutionOverview();
  if (banner && state.run) banner.innerHTML = `${state.run.simulation ? '<strong>Simulation.</strong> Aucun modèle ni service métier appelé. ' : '<strong>Exécution réelle.</strong> '}`;
  const pause = document.querySelector('[data-action=pause]');
  if (pause && state.run && !['active','paused'].includes(state.run.status)) pause.remove();
  if(pause && state.run?.status==='paused' && !manuallyPaused(state.run))pause.hidden=true;
  if(pause && state.run?.status==='paused' && blockedDependencies().length) {pause.disabled=true;pause.title='Une demande préalable annulée ou refusée empêche la reprise. Consultez les dépendances.';}
  if(banner)delete banner.dataset.error;
  const heading = document.querySelector('.workflow-heading p');
  if (heading && state.mode === 'run') heading.textContent = `${frozenRevision(state.run)} · ${runLabel(state.run)}${state.conversation ? '' : ' · '+new Date(state.run.created * 1000).toLocaleString('fr-CH')}`;
}
function agentStopped() { return state.agentState === 'stopped' && state.agentConversation === state.conversation?.id; }
function manuallyPaused(run) { return run?.status==='paused' && !run.parent_paused && (run.iteration_hold || (!run.iteration_wait && (!run.coordination_wait || run.coordination_hold))); }
function currentWorkFinished() {
  if(state.run && !conversationOverviewActive())return ['completed','cancelled'].includes(state.run.status);
  const c=state.conversation;
  return !!c?.item_count && c.activity?.completed===c.item_count;
}
function conversationReady(run) {
  const readiness=launchReadiness(run,run?.focus?.node);
  return run?.status==='active' && run.focus?.status==='ready' && (readiness?.status==='native' || readiness?.native_available);
}
function conversationNextAction(run, stopped=agentStopped()) {
  return conversationReady(run) ? {node:run.focus.node,label:stopped?'Reprendre l’agent…':'Continuer dans la conversation',detail:stopped?'Agent arrêté. Le terminal est au prompt du shell.':'Cette étape peut être traitée par l’agent de la conversation.',action:stopped?'resume-agent':'conversation-terminal'} : executionAction(run);
}
function resumeRequestButton() {
  if(!manuallyPaused(state.run))return '';
  const waiting=state.run.coordination_wait && dependencyItems().some(i=>!i.satisfied);
  return button('resume-request','Reprendre la demande','primary',waiting ? 'disabled' : '')+(waiting ? '<p>Terminez d’abord les demandes préalables. La reprise restera ensuite à votre initiative.</p>' : '');
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
  if (schedule) state.scheduleDrafts[launchKey()] = Object.fromEntries(['kind','time','minutes','timezone','weekdays','simulation'].map(name => {
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

function content(html) { cancelConnection(false); const target = document.querySelector('#studio-content'); target.classList.toggle('execution-view', state.route === 'workflow' && state.mode === 'run' && !!state.run); target.classList.toggle('design-view', state.route === 'workflow' && state.mode === 'design'); target.innerHTML = html; }
async function readActivity(offset=0) {
  const [overview,conversations]=await Promise.all([call('overview.get',{offset}),call('conversation.list')]);
  for(const run of overview.activity.runs) run.agentStopped=!!run.conversation && integration.terminalStatus?.(run.conversation)==='stopped';
  return {...overview,pendingConversations:conversations.filter(c=>!c.archived && c.status==='open' && c.item_count===0).map(c=>({...c,agentStopped:integration.terminalStatus?.(c.id)==='stopped'}))};
}
function pendingConversations() {
  const conversations=state.pendingConversations || [];
  return conversations.length ? `<section class="activity-section"><h2>Conversations ouvertes</h2><p class="muted">Aucune tâche enregistrée pour l’instant. Retrouvez la conversation pour préparer votre demande.</p><div class="activity-list">${conversations.map(c=>`<button class="activity-row" data-action="${c.agentStopped?'open-conversation-resume':'open-conversation'}" data-id="${esc(c.id)}"><span class="activity-identity"><strong>${esc(c.definition.title)}</strong><small>${esc(state.projects.find(p=>p.id===c.project)?.title || 'Sans projet')} · ${c.provider==='claude'?'Anthropic · Claude':'OpenAI · Codex'}</small></span><span class="activity-state"><strong>${c.agentStopped?'Reprendre l’agent…':'Reprendre la conversation'}</strong><small>${c.agentStopped?'Agent arrêté · shell disponible':'Aucune étape en cours'}</small></span><span aria-hidden="true">→</span></button>`).join('')}</div></section>` : '';
}
function projectTitle(project) { return project?.scope==='workspace' || project?.id==='workspace' ? 'Sans projet' : project?.library ? 'Modèles' : project?.title || ''; }
function renderOverview() {
  const activity=state.activity || {runs:[],workflow_count:0};
  if(!state.projects.length && !activity.workflow_count && !activity.runs.length && !state.pendingConversations?.length){renderProjects();return;}
  const needsAttention=r=>(!r.coordination_wait || r.coordination_hold) && ['active','paused'].includes(r.status) && (r.status==='paused' || (r.agentStopped && conversationReady(r)) || r.health?.status==='failed' || ['waiting','waiting_input','returned','blocked','failed'].includes(r.focus?.status) || Object.values(r.nodes || {}).some(n=>['waiting','waiting_input','returned','blocked'].includes(n.status)));
  const waiting=activity.runs.filter(needsAttention), other=activity.runs.filter(r=>!needsAttention(r));
  content(`<section class="page activity-page"><div class="page-heading"><div><h1>Activité</h1><p>Votre travail en cours et ce qui attend votre intervention. ${activity.family_counts ? [[activity.family_counts.requests,'demande'],[activity.family_counts.tasks,'tâche'],[activity.family_counts.actions,'action facultative']].filter(([count],index)=>index===0 || count>0).map(([count,label])=>`${count} ${count===1?label:label==='action facultative'?'actions facultatives':label+'s'}`).join(' · ')+'.' : `${activity.total || 0} exécution${activity.total===1?'':'s'} au total.`}</p></div><div class="row">${button('new-request','Nouvelle demande','primary')}${button('refresh-overview','Actualiser')}</div></div>${pendingConversations()}${waiting.length ? `<section class="activity-section"><h2>À traiter</h2><p class="muted">${waiting.length} exécution${waiting.length===1?'':'s'} affichée${waiting.length===1?'':'s'} à traiter sur cette page.</p>${activityTable(waiting)}</section>` : ''}<section class="activity-section"><div class="row between"><h2>${waiting.length?'Autres exécutions':'Exécutions récentes'}</h2><span class="muted">${other.length} exécution${other.length===1?'':'s'} affichée${other.length===1?'':'s'}</span></div>${activityTable(other)}</section><div class="row">${activity.offset ? button('overview-page','Précédentes','',`data-offset="${Math.max(0,activity.offset-25)}"`) : ''}${activity.next!=null ? button('overview-page','Suivantes','',`data-offset="${activity.next}"`) : ''}</div></section>`);
}
function activityTable(runs) {
  if(!runs.length)return '<p class="muted activity-empty">Aucune demande à afficher. « Nouvelle demande » vous permet de choisir un workflow et de démarrer dans le terminal.</p>';
  return `<div class="activity-list">${runs.map(r=>{
    const native=!!r.conversation && conversationReady(r), action=conversationNextAction(r,r.agentStopped);
    const hint=[native?action.label:'',r.focus?.title].filter(Boolean).join(' · ');
    return `<button class="activity-row" data-action="${native && r.agentStopped?'activity-resume-agent':'activity-run'}" data-project="${r.project}" data-id="${r.id}"><span class="activity-identity"><strong>${esc(requestHeading(r.request, r.parameters?.request, r.definition.title))}</strong><small>${r.origin ? `${r.origin.kind==='task'?'Tâche':r.origin.kind==='action'?'Action facultative':'Notification'} de ${esc(r.origin.title)} · ` : 'Demande · '}${esc(r.project==='workspace'?'Sans projet':r.project_title)} · ${esc(r.definition.title)}${r.definition.revision ? ' · Rév. '+esc(r.definition.revision) : ''}${r.simulation?' · Simulation · '+new Date(r.created*1000).toLocaleString('fr-CH'):''}</small></span><span class="activity-state"><strong>${esc(native ? r.agentStopped?'Agent arrêté': 'À traiter dans la conversation' : runLabel(r))}</strong><small>${esc(hint)}</small></span><span aria-hidden="true">→</span></button>`;
  }).join('')}</div>`;
}
function renderProjects() {
  content(`<section class="page">${!state.projects.length ? `<div class="hero"><div><div class="eyebrow">De l'intention à la réalisation</div><h1>Un workflow clair.<br>Un travail que vous pouvez suivre.</h1><p class="muted" style="font-size:14px">Composez les étapes, choisissez qui intervient et gardez la main sur les décisions importantes.</p><div class="row">${button('new-request','Nouvelle demande','primary')}${button('new-work', '+ Créer un workflow')}${button('try-example', 'Essayer un exemple')}</div><p class="muted" style="margin-bottom:0">L'exemple est simulé : aucun modèle payant, aucune publication.</p></div><div class="mini-flow" aria-hidden="true"><span>✦ Analyser</span>→<span class="human">? Décider</span>→<span>✓ Valider</span></div></div>` : ''}
    <div class="page-heading"><div><h2>Vos projets</h2>${button('toggle-archives',state.showArchives ? 'Masquer les archives' : 'Voir les archives','flat')}<p>Un projet réunit ses workflows, ses demandes et leurs résultats. Créez un espace local ou associez un dépôt Git existant.</p></div><div class="heading-actions">${button('new-project', '+ Nouveau projet', 'primary')}${button('import-workflow', 'Importer un workflow')}</div></div>
    ${state.projects.length ? `<div class="project-list">${state.projects.filter(p=>state.showArchives || !p.archived).map(p => `<button class="project-card" data-action="open-project" data-id="${p.id}"><div><h3>${esc(p.title)}${p.archived ? ' <span class="pill">Archivé</span>' : ''}</h3><small>${p.path ? esc(p.path) : 'Dépôt Git local · aucun pack métier requis'}</small></div><span aria-hidden="true">→</span></button>`).join('')}</div>` : '<div class="card"><h3>Votre premier projet commence ici</h3><p>Ajoutez un dépôt existant ou créez un projet pour y enregistrer vos workflows et suivre leur exécution.</p></div>'}${state.projects.length ? `<div class="overview-links">${button('try-example', 'Essayer un exemple', 'flat')}</div>` : ''}</section>`);
}
function renderProject() {
  const global=state.project.scope==='workspace';
  content(`<section class="page project-work-page">${global ? workflowNavigation('global') : ''}<div class="page-heading"><div><h1>${global ? 'Mes workflows' : esc(projectTitle(state.project))}</h1><p>${global ? 'Workflows utilisables sans projet. Chaque lancement conserve ses propres demandes et résultats.' : esc(state.project.path)}</p></div><div class="row">${button('new-request','Nouvelle demande','primary')}${button('new-work','Créer un workflow')}<details class="compact-menu project-menu"><summary>Options</summary><div>${button('repository-workflows','Workflows du dépôt')}${button('import-workflow','Importer un workflow')}${button('import-pack','Ajouter un pack')}${!global ? button('archive-item',state.project.archived?'Restaurer le projet':'Archiver le projet','flat',`data-kind="project" data-id="${state.project.id}" data-archived="${!!state.project.archived}"`) : ''}${integration.hasLegacy?.(state.project.path) ? button('legacy-project','Releases et suivi Odoo') : ''}</div></details></div></div>
    ${state.repositoryProject===state.project.id && state.repositoryFiles?.some(f=>f.status==='new') ? `<div class="notice">Des workflows sont disponibles dans ce dépôt. ${button('repository-workflows','Examiner les workflows du dépôt')}</div>` : ''}
    ${!global ? `<section class="project-activity"><h2>Reprendre le travail</h2>${(state.conversations || []).length ? `<div class="conversation-list">${state.conversations.map(c=>`<button data-action="open-conversation" data-id="${esc(c.id)}"><strong>${esc(c.request_excerpt || c.definition.title)}</strong><span>${esc(c.definition.title)} · ${new Date(c.created*1000).toLocaleString('fr-CH')} · ${c.status==='open' ? 'Ouverte' : 'Terminée'} · ${c.item_count ?? c.items?.length ?? 0} demande${(c.item_count ?? c.items?.length ?? 0) === 1 ? '' : 's'} · Ouvrir le suivi et le terminal →</span></button>`).join('')}</div>` : ''}${state.runs.length ? runTable(state.runs) : '<p class="muted">Aucune demande en cours. « Nouvelle demande » ouvre votre workflow et son terminal.</p>'}<details class="history-filters"><summary>Rechercher dans les exécutions</summary>${runTools()}</details></section>` : ''}
    <section class="project-workflows"><div class="row between"><h2>${global ? 'Sans projet' : 'Workflows disponibles'}</h2>${button('workflow-archives',state.showWorkflowArchives?'Masquer les archives':'Voir les archives','flat')}${state.workflow_page?.next!=null ? button('workflow-more','Workflows suivants','',`data-offset="${state.workflow_page.next}"`) : ''}${state.workflow_page?.offset ? button('workflow-more','Première page','','data-offset="0"') : ''}</div><div class="workflow-list">${state.workflows.map(g=>`<article class="workflow-row"><div><h3>${esc(g.title)}${g.archived ? ' <span class="pill">Archivé</span>' : ''}</h3><p>${g.node_count || g.nodes.length} étapes${g.description ? ' · '+esc(g.description) : ''}</p></div><div class="row">${button('run-workflow','Exécuter…','primary',`data-project="${esc(state.project.id)}" data-id="${g.id}"`)}${button('open-workflow','Ouvrir le workflow','',`data-project="${esc(state.project.id)}" data-id="${g.id}"`)}<details class="compact-menu"><summary aria-label="Options de ${esc(g.title)}">⋯</summary><div>${button('archive-item',g.archived?'Restaurer':'Archiver','flat',`data-kind="workflow" data-id="${g.id}" data-archived="${!!g.archived}"`)}</div></details></div></article>`).join('') || `<div class="empty-workflows"><p>Aucun workflow enregistré ici.</p>${button('library-project','Choisir un modèle')}</div>`}</div></section>
    ${global && state.runs.length ? `<section class="project-activity"><h2>Exécutions récentes</h2>${runTable(state.runs)}<details><summary>Rechercher dans les exécutions</summary>${runTools()}</details></section>` : ''}</section>`);
}
function runTools() { const p=state.run_page || {};return `<form id="run-filters" class="row run-filters"><label>Rechercher<input type="search" name="query" value="${esc(state.runFilters?.query || '')}" placeholder="Demande ou workflow"></label><label>État<select name="status">${options([['','Tous'],['active','En cours'],['paused','Suspendues'],['completed','Terminées'],['cancelled','Annulées']],state.runFilters?.status || '')}</select></label><label>Exécution<select name="simulation">${options([['','Réel et simulation'],['false','Réel'],['true','Simulation']],state.runFilters?.simulation ?? '')}</select></label><label><input type="checkbox" name="archived" ${state.runFilters?.archived ? 'checked' : ''}>Avec archives</label><button>Filtrer</button></form><div class="row"><span class="muted">${p.total ?? state.runs.length} exécution(s)</span>${p.offset ? button('run-page','Précédentes','',`data-offset="${Math.max(0,p.offset-25)}"`) : ''}${p.next !== null && p.next !== undefined ? button('run-page','Suivantes','',`data-offset="${p.next}"`) : ''}</div>`; }
async function loadRunPage(offset=0) { const f=state.runFilters || {}; const page=await call('run.list',{project:state.project.id,offset,...f,...(f.simulation === '' || f.simulation === undefined ? {simulation:null} : {simulation:f.simulation === 'true'}),workflow:state.mode === 'history' ? state.graph.id : null});state.runs=page.items;state.run_page=page; if(state.route==='project')renderProject();else renderEditor(); }
function runTable(runs) {
  if (!runs.length) return '<p class="muted">Aucune exécution lancée.</p>';
  return `<table class="run-table"><thead><tr><th>Workflow</th><th>Contexte</th><th>État</th><th></th></tr></thead><tbody>${runs.map(r => `<tr><td>${esc(requestHeading(r.request, r.parameters?.request, r.definition.title))}<br><small>${esc(r.definition.title)}${r.definition.revision ? ' · Rév. '+esc(r.definition.revision) : ''} · ${new Date(r.created * 1000).toLocaleString('fr-CH')}</small></td><td class="run-context">${r.simulation ? 'Simulation' : 'Exécution réelle'}</td><td class="run-status">${esc(runLabel(r))}</td><td class="run-actions">${button('open-run', 'Consulter', '', `data-id="${r.id}"`)}${!['active','paused'].includes(r.status) ? button('archive-item',r.archived ? 'Restaurer' : 'Archiver','flat',`data-kind="run" data-id="${r.id}" data-archived="${!!r.archived}"`) : ''}</td></tr>`).join('')}</tbody></table>`;
}
function runLabel(run) {
  if(run.status==='cancelled')return 'Annulée';
  if(run.parent_paused)return 'Workflow parent suspendu';
  if(run.iteration_hold)return 'Suspendue manuellement';
  if(run.iteration_wait)return 'Attend ses dépendances';
  if (run.coordination_hold) return 'Suspendue manuellement';
  if (run.coordination_wait) return 'Attend une autre demande';
  if (run.status === 'active') {
    if (run.health?.status === 'failed') {
      if (run.focus?.status==='waiting_input') return 'Réponse attendue · échec à examiner';
      if (run.focus?.status==='waiting') return 'Décision attendue · échec à examiner';
      return 'Échec · reprise nécessaire';
    }
    if(childActivityLabel(run))return childActivityLabel(run);
    if(run.focus?.status==='ready' && conversationReady(run))return 'À traiter dans la conversation';
    if(run.focus?.status==='ready' && run.launch?.ready_count)return run.launch.label;
    if (run.focus) return ({failed:'Échec · reprise nécessaire',blocked:'Bloquée',waiting_input:'Réponse attendue',waiting:'Décision attendue',returned:'Résultat à valider',running:'En cours',ready:'Prête',collecting:'Recueil ouvert',waiting_children:'Coordination en cours'})[run.focus.status] || 'Attend une dépendance';
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
    <div class="grid template-grid">${state.templates.map(g => `<article class="card template-card" data-template-search="${esc((g.title + ' ' + g.description).toLocaleLowerCase('fr'))}"><div class="row between"><span class="card-icon" aria-hidden="true">⑂</span><span class="pill">${g.node_count || g.nodes.length} bloc${(g.node_count || g.nodes.length) > 1 ? 's' : ''}</span></div><h3>${esc(g.title)}</h3><p>${esc(g.description)}</p><div class="card-actions">${button('use-template', 'Utiliser', 'primary', `data-project="${esc(state.project.id)}" data-id="${g.id}"`)}${button('edit-template', g._project || g.revision ? 'Modifier le modèle' : 'Personnaliser une copie…', '', `data-project="${esc(state.project.id)}" data-id="${g.id}"`)}</div></article>`).join('')}</div><p id="template-empty" class="notice" hidden>Aucun modèle ne correspond à cette recherche.</p></section>`);
  document.querySelector('#template-search').addEventListener('input', event => {
    const query = event.target.value.trim().toLocaleLowerCase('fr');
    let count = 0;
    document.querySelectorAll('[data-template-search]').forEach(card => { card.hidden = !card.dataset.templateSearch.includes(query); if (!card.hidden) count++; });
    document.querySelector('#template-empty').hidden = count > 0;
  });
}

function renderSchedules() {
  const schedules = (state.schedules || []).filter(s => state.showArchives || !s.archived);
  content(`<section class="page"><div class="page-heading"><div><div class="eyebrow">Automatisations locales</div><h1>Planifications</h1><p>Retrouvez vos prochaines exécutions ici et dans l’icône Tricorder de la barre Ubuntu.</p></div><div class="row">${button('toggle-archives',state.showArchives ? 'Masquer les archives' : 'Voir les archives')}${button('refresh-schedules', 'Actualiser')}</div></div><details class="schedule-explanation"><summary>Comment fonctionnent les planifications ?</summary><p>Tricorder doit rester ouvert, éventuellement dans la zone de notification. Après une interruption, une seule occurrence en retard est rattrapée. Une exécution encore ouverte empêche le chevauchement.</p><p>Pour créer une planification, ouvrez un workflow puis choisissez Options → Planifier. Pour utiliser une nouvelle version, ouvrez « Version planifiée » sur sa carte : vous pourrez archiver l’ancienne planification puis vérifier et activer la nouvelle.</p></details><div class="grid" style="margin-top:24px">${schedules.map(s => `<article class="card" data-schedule="${esc(s.id)}"><div class="row between"><h3>${esc(s.title)}</h3><span class="pill">${s.archived ? 'Archivée' : s.enabled ? 'Active' : 'Suspendue'}</span></div><p>${s.scope?.kind === 'workspace' ? 'Global' : esc(state.projects.find(p => p.id === s.project)?.title || 'Projet')} · ${s.simulation ? 'Simulation' : 'Exécution réelle'} · ${esc(s.rule.timezone)}<br>${esc(scheduleFrequency(s.rule))}<br>${s.enabled ? 'Prochaine' : 'Dernière échéance prévue'} : ${new Date(s.next * 1000).toLocaleString('fr-CH', { timeZone: s.rule.timezone })}</p><p class="muted">${s.last_status === 'blocked' ? esc(s.error) : s.last_status === 'skipped-overlap' ? 'Dernière occurrence non lancée : une exécution précédente attend encore.' : 'Les modifications du workflow ne changent pas cette planification.'}</p>${button('schedule-details', `Version planifiée · ${s.revision ? 'révision '+esc(s.revision) : 'instantané sans numéro'}`, 'flat', `data-id="${esc(s.id)}"`)}<div class="row">${!s.archived ? button('toggle-schedule', s.enabled ? 'Suspendre' : 'Réactiver', '', `data-id="${esc(s.id)}"`) : ''}${button('archive-item',s.archived ? 'Restaurer' : 'Archiver','flat',`data-kind="schedule" data-project="${esc(s.project)}" data-id="${esc(s.id)}" data-archived="${!!s.archived}"`)}${s.last_run ? button('schedule-run', 'Dernière exécution', '', `data-id="${esc(s.id)}"`) : ''}</div></article>`).join('') || '<div class="card"><h3>Aucune planification</h3><p>Ouvrez un workflow puis choisissez Options → Planifier pour vérifier ses moyens et sa fréquence avant activation.</p></div>'}</div></section>`);
}
function connectionStatus(capability) {
  if (['codex', 'claude'].includes(capability.id) && !capability.plugin_id && (capability.connected !== true || capability.qualified !== true)) return capability.installed ? 'Installé · connexion à vérifier' : 'À installer';
  return capability.usable ? 'Utilisable' : 'À configurer';
}
function renderConnections() {
  content(`<section class="page"><div class="page-heading"><div><div class="eyebrow">Outils et plugins</div><h1>Connexions</h1><p>Connectez les outils de vos workflows : messagerie, documents et services. Vérifiez une connexion avant de l’utiliser dans une étape.</p></div><div class="row">${button('connection-guide', 'Configurer une connexion…')}${button('discover-plugins', 'Plugins OpenAI', '', 'data-provider="codex"') + button('discover-plugins', 'Plugins Anthropic', '', 'data-provider="claude"')}${button('refresh-connections', 'Actualiser')}</div></div>${launchReturnNotice()}<form id="connection-context-form" class="row"><label for="connection-context">Contexte</label><select id="connection-context" name="project" style="width:auto">${options([["workspace", "Sans projet"], ["library", "Modèles"], ...state.projects.map(p => [p.id, p.title])], state.project?.id || "workspace")}</select><button type="submit">Afficher les connexions</button></form><p class="muted">${state.project ? `Catalogue de ${esc(projectTitle(state.project))} : ${esc(state.project.path)}/.tricorder/plugins.json. Modifiez-le depuis le terminal, puis actualisez. Les déclarations restent distinctes des accès vérifiés.` : 'Choisissez le contexte global, la bibliothèque ou un projet pour consulter et configurer ses plugins.'}</p><div class="grid connection-grid">${[...state.capabilities, ...(state.detectedPlugins || [])].map(c => `<article class="card"><div class="row between"><h2>${esc(c.title)}</h2><span class="pill ${connectionStatus(c) === 'Utilisable' ? 'accepted' : ''}">${connectionStatus(c)}</span></div><p>${esc(c.reason)}</p>${c.plugin_id && c.transport ? button('verify-plugin', 'Vérifier l’adaptateur…', '', `data-id="${esc(c.plugin_id)}"`) : ''}<details class="connection-diagnostics"><summary>Diagnostic de connexion</summary><div class="connection-states">${[['Disponible', c.available], ['Installé', c.installed], ['Connecté', c.connected], ['Vérifié', c.qualified]].map(([label, yes]) => `<span class="pill">${yes === null ? '?' : yes ? '✓' : '○'} ${label}</span>`).join('')}</div></details></article>`).join('')}</div>${(state.setup || []).filter(s => s.status === 'customized' || s.status === 'unavailable').map(s => `<div class="notice">${esc(s.instructions || s.project)} : ${s.status === 'customized' ? 'consignes personnalisées conservées. Mise à jour Tricorder à valider dans le modèle de consignes livré avec l’application.' : esc(s.reason)}</div>`).join('')}<p class="muted" style="margin-top:24px">Aucun secret n'est lu ou affiché dans cette page. Les comptes et la connexion OAuth restent chez les fournisseurs.</p></section>`);
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
  const heading = requestHeading(selectedRequest?.request, running && state.run.parameters?.request, graph.title);
  integration.context({ projects: state.projects, project: state.project, graph, run: state.run, conversation: state.conversation, route: state.route, mode: state.mode, activeRoute: state.project?.library ? 'global' : state.project?.scope === 'workspace' ? 'global' : 'projects', title: projectTitle(state.project) });
  const scroll = document.querySelector('.canvas-scroll');
  const position = scroll ? [scroll.scrollLeft, scroll.scrollTop] : [0, 0];
  const focusedCard = document.activeElement?.closest('.node[data-id],.note-heading');
  const previousFocus = focusedCard && { id: focusedCard.dataset.id, note: focusedCard.matches('.note-heading') };
  content(`<div class="workflow-heading ${running ? 'execution-heading' : ''}"><div><div class="eyebrow breadcrumb">${running ? 'Suivi · '+esc(graph.title) : esc(projectTitle(state.project))+' / Workflow'}</div><h1 title="${esc(heading)}">${esc(heading)}</h1><p title="${esc(graph.title)}">${selectedRequest ? esc(graph.title.split('—')[0].trim())+' · ' : ''}${running ? `${esc(frozenRevision(state.run))} · ${esc(runLabel(state.run))}${selectedRequest ? '' : ' · '+new Date(state.run.created * 1000).toLocaleString('fr-CH')}` : `Révision ${state.savedRevision || 'initiale'} · ${state.dirty ? 'Modifications en attente' : 'Enregistré'}`}</p></div><div class="row">${!running ? button('workflow-ai', 'Choisir l’IA') + '<details class="compact-menu design-menu"><summary>Options</summary><div>' + button('schedule', 'Planifier') + button('reuse-workflow', 'Réutiliser…') + button('export-workflow', 'Exporter…') + '</div></details>' + button('save', 'Enregistrer', '', state.dirty ? '' : 'disabled') + button('start-preview', 'Exécuter…', 'primary') : button('back-design', 'Revenir à l’éditeur') + (['active', 'paused'].includes(state.run.status) ? button('pause', state.run.status === 'paused' ? 'Reprendre' : 'Suspendre') + button('cancel', 'Annuler', 'flat') : '')}</div></div>
    ${launchReturnNotice()}${state.mode==='design' ? '<p class="muted editor-save-help" style="margin:0;padding:8px 20px">Enregistrez ici ; la navigation principale enregistre aussi vos modifications.</p>' + handoffNotice(graph) : ''}<div class="tabs" role="tablist" aria-label="Vues du workflow">${[['design', 'Éditeur'], ['run', 'Exécution'], ['history', 'Historique'], ['document', 'Rapport']].map(([mode, label]) => `<button role="tab" aria-selected="${state.mode === mode}" class="${state.mode === mode ? 'active' : ''}" data-action="mode" data-mode="${mode}" ${['run', 'document'].includes(mode) && !state.run ? 'disabled' : ''}>${label}</button>`).join('')}</div>
    ${state.mode === 'history' ? `<section class="page"><h2>Exécutions du workflow</h2>${runTools()}${runTable(state.runs.filter(r => r.original.id === state.graph.id))}</section>` : state.mode === 'document' ? '<section class="page"><div class="row between"><h2>Rapport d’exécution</h2><div class="row"><button data-action="export-work">Exporter le rapport dans le projet</button><button data-action="export-release" class="flat">Export de release…</button></div></div><article class="document" id="document-view">Chargement…</article></section>' : `
    ${running ? `<div class="banner ${state.run.simulation ? 'amber' : ''}" id="run-banner">${state.run.simulation ? '<strong>Simulation.</strong> Aucun modèle ni service métier appelé. ' : '<strong>Exécution réelle.</strong> '}</div>` : ''}
    <div class="toolbar">${!running ? button('add-node', '+ Ajouter un bloc') + button('connect', 'Relier') + button('add-note', '+ Note') + button('open-properties', 'Propriétés', '', state.selected ? '' : 'disabled') + (graph.schema === 1 ? button('convert-workflow', 'Données structurées…') : '') + button('workflow-settings', 'Paramètres du workflow') + '<span class="separator"></span>' + button('undo', '↶', '', `aria-label="Annuler la modification" ${state.history.past.length ? '' : 'disabled'}`) + button('redo', '↷', '', `aria-label="Rétablir la modification" ${state.history.future.length ? '' : 'disabled'}`) : ''}<span class="fill"></span>${!running ? button('assistant', '✦ Assistant IA') : `<div class="execution-switch" role="group" aria-label="Affichage du suivi">${button('execution-graph', 'Graphe', state.reviewFocus ? '' : 'active', `aria-pressed="${!state.reviewFocus}"`)}${button('execution-details', 'Détail', state.reviewFocus ? 'active' : '', `aria-pressed="${!!state.reviewFocus}"`)}</div>` + button('timeline', 'Journal d’exécution')}${button('view', state.view === 'canvas' ? '☷ Liste' : '⑂ Graphe', '', 'aria-label="Changer la vue graphe ou liste"')}</div>
    <div class="editor ${running && state.reviewFocus ? 'review-focus' : ''}"><div class="canvas-area">${state.view === 'canvas' ? '<div class="canvas-scroll" tabindex="0" aria-label="Graphe du workflow"><div class="canvas-size"><div class="canvas"><div id="notes"></div><svg aria-hidden="true"></svg><div id="nodes"></div><div id="graph-ports"></div></div></div></div>' : '<div class="table-wrap" id="node-list"></div>'}<div class="canvas-footer"><span>${graph.nodes.length} bloc${graph.nodes.length > 1 ? 's' : ''} · ${graph.edges.length} lien${graph.edges.length > 1 ? 's' : ''}</span><div class="row">${button('zoom-out', '−', 'flat', 'aria-label="Réduire le graphe"')}<button id="zoom-label" class="flat" data-action="zoom-reset" title="Rétablir le zoom à 100 %">${Math.round(state.zoom * 100)} %</button>${button('zoom-in', '+', 'flat', 'aria-label="Agrandir le graphe"')}${button('fit', 'Ajuster', 'flat')}${!running ? button('organize-graph', 'Réorganiser le graphe', 'flat', 'title="Disposer les branches selon leurs liens. Cette modification peut être annulée."') : ''}</div></div></div><aside class="inspector" aria-label="Inspecteur du bloc" id="inspector"></aside></div>`}`);
  if (['design', 'run'].includes(state.mode)) { document.querySelector('.toolbar .fill').insertAdjacentHTML('beforebegin', (state.mode === 'run' && state.project.scope === 'workspace' ? button('handoff', 'Transférer vers un projet…') : '') + button('terminal', '›_ Terminal', '', `aria-label="${state.conversation ? 'Retrouver la conversation' : 'Ouvrir le terminal existant'}"`) + (state.mode === 'design' ? '<details class="workflow-options"><summary>Éditeur</summary><div>' + button('phases', 'Phases') + button('workflow-file', 'Fichier JSON du workflow…') + button('reload-file', 'Recharger et valider') + (localStorage.getItem(draftKey()+':previous') ? button('restore-previous-draft','Récupérer le brouillon précédent') : '') + '</div></details>' : button('phases', 'Phases'))); renderGraph(); renderInspector(); const nextScroll = document.querySelector('.canvas-scroll'); if (nextScroll) { nextScroll.scrollLeft = position[0]; nextScroll.scrollTop = position[1]; } }
  if (previousFocus && state.mode === 'design') focusGraphItem(previousFocus.id, previousFocus.note);
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
  const html=conversationOverviewView(state.conversation,{projects:state.projects,statusLabel:runLabel,agentStopped:agentStopped(),dispatch:state.dispatchFeedback?.conversation===state.conversation.id ? state.dispatchFeedback : null,dispatching:state.dispatching===state.conversation.id});
  if(target.innerHTML===html)return;
  target.innerHTML=html;
  if(expanded && target.querySelector('.dispatch-feedback details'))target.querySelector('.dispatch-feedback details').open=true;
  target.scrollTop=scroll;if(focused)target.querySelector(focused)?.focus({preventScroll:true});
}
function renderConversationOverview() {
  const c=state.conversation,graph=c.definition;
  integration.context({projects:state.projects,project:state.project,graph,run:state.run,conversation:c,route:'workflow',mode:'run',activeRoute:state.project?.scope==='workspace'?'global':'projects',title:projectTitle(state.project)});
  content(`<div class="workflow-heading execution-heading"><div><div class="eyebrow">Suivi du workflow</div><h1 title="${esc(graph.title)}">${esc(graph.title)}</h1><p>${c.projects.length>1 ? `${c.projects.length} projets` : esc(projectTitle(state.project))} · ${c.archived ? 'Conversation archivée' : c.status==='open' ? 'Conversation ouverte' : 'Conversation terminée'}</p></div><div class="row">${button('conversation-add','Ajouter une demande…','',c.status==='open' && !c.archived ? '' : 'disabled')}<details class="compact-menu execution-menu"><summary>Options</summary><div>${button('back-design','Revenir à l’éditeur')}</div></details></div></div><div class="tabs execution-tabs-empty"></div><section id="conversation-overview" aria-label="Vue d’ensemble des demandes"></section>`);
  document.querySelector('.workflow-heading').after(conversationScopeSwitch());
  renderConversation();
  document.querySelector('#conversation-overview').scrollTop=state.conversationScroll || 0;
}

function renderConversationReady() {
  const c=state.conversation,graph=c.definition;
  const submitted=state.initialRequests?.[c.id] || c.items?.[0]?.request;
  integration.context({projects:state.projects,project:state.project,graph,run:null,conversation:c,route:'workflow',mode:'run',activeRoute:state.project.scope==='workspace'?'global':'projects',title:projectTitle(state.project)});
  content(`<section class="page conversation-ready"><div class="page-heading"><div><div class="eyebrow">Suivi du workflow</div><h1>${esc(graph.title)}</h1><p>Conversation ouverte · ${c.provider==='claude'?'Anthropic · Claude':'OpenAI · Codex'}</p></div></div><div class="notice"><h2>${submitted ? 'Votre demande est enregistrée' : agentStopped()?'Agent arrêté':'Prêt pour votre demande'}</h2><p>${submitted ? agentStopped()?'Le travail est conservé. Reprenez l’agent pour continuer ; vous n’avez pas à ressaisir votre demande.':'Votre demande a été transmise à la conversation. Son suivi apparaîtra ici ; vous n’avez pas à la ressaisir.' : agentStopped()?'Reprenez l’agent avant de décrire votre demande. La conversation est conservée.':'Décrivez le travail à l’agent dans le terminal. Il créera les tâches et leur progression apparaîtra ici.'}</p>${submitted ? `<details><summary>Demande enregistrée</summary><p class="initial-request-copy">${esc(submitted)}</p></details>` : ''}${button(agentStopped()?'resume-agent':'conversation-terminal',agentStopped()?'Reprendre l’agent…':'Retrouver le terminal','primary')}</div><h2>Étapes du workflow</h2><ol class="ready-steps">${graph.nodes.map(n=>`<li><span aria-hidden="true">${symbols[n.kind]}</span><div><strong>${esc(n.title)}</strong><small>${esc(kinds[n.kind])} · ${portSummary(n)}</small></div></li>`).join('')}</ol><p class="muted">Aucune étape n’est en cours tant que l’agent n’a pas créé de demande.</p></section>`);
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
  document.querySelector('#dependency-choices').innerHTML=page.items.map(i=>`<label><input type="checkbox" name="depends" value="${esc(i.id)}" ${draft.selected.has(i.id)?'checked':''} ${dependencyBlocked(i.execution)?'disabled':''}><span>${esc(i.request)}<small>${esc(state.projects.find(p=>p.id===i.project)?.title || 'Sans projet')} · ${esc(conversationReady(i.execution) ? 'À traiter dans la conversation' : runLabel(i.execution))}${dependencyBlocked(i.execution)?' · ne peut pas débloquer la suite':''}</small></span></label>`).join('') || '<p>Aucune demande correspondante.</p>';
  document.querySelector('#dependency-pages').innerHTML=(page.offset ? button('dependency-page','Précédentes','','data-offset="'+Math.max(0,page.offset-25)+'" type="button"'):'')+(page.next!=null ? button('dependency-page','Suivantes','','data-offset="'+page.next+'" type="button"'):'');
  document.querySelector('#dependency-count').textContent=`${draft.selected.size} demande(s) préalable(s) sélectionnée(s). La nouvelle demande attendra leur réussite à toutes.`;
}
async function addRequestDialog(replacement=false) {
  const run=state.run, conversation=state.conversation, epoch=viewEpoch;
  const request=replacement ? await executionRequest(run) : '';
  if(epoch!==viewEpoch || state.conversation?.id!==conversation.id || (replacement && state.run?.id!==run.id))return;
  state.dependencyDraft={conversation:state.conversation.id,selected:new Set(),query:'',replacement};
  modal(replacement ? 'Créer une demande de remplacement' : 'Ajouter une demande', `<form id="conversation-add-form">${replacement?'<p>La demande précédente reste conservée avec ses résultats et son blocage. Décrivez la nouvelle demande et choisissez ses prérequis ; aucune validation passée ne sera transférée.</p>':''}<label>Demande<textarea name="request" required>${esc(request)}</textarea></label><label>Projet<select name="project">${options(state.conversation.projects.map(id=>[id,state.projects.find(p=>p.id===id)?.title || state.project.title]),state.project.id)}</select></label><fieldset class="dependency-picker"><legend>Demandes préalables (facultatif)</legend><p>Aucune sélection : la demande est indépendante. Sélectionnez plusieurs demandes pour attendre leur réussite à toutes.</p><div class="row"><label for="dependency-query" class="sr-only">Rechercher un prérequis</label><input id="dependency-query" type="search" placeholder="Rechercher une demande…">${button('dependency-search','Rechercher','','type="button"')}</div><div id="dependency-choices"></div><div id="dependency-pages" class="row"></div><p id="dependency-count" role="status"></p></fieldset><button class="primary">Enregistrer la demande</button></form>`);
  await dependencyChoices();
}
function completedResults() {
  if (state.run?.status !== 'completed') return [];
  return state.run.definition.nodes.filter(node => {
    const data = state.run.nodes[node.id];
    return data?.status === 'accepted' && data.result && !data.decision;
  }).map(node => ({node, data: state.run.nodes[node.id]}));
}
function attemptBudget(data, node) {
  const used = data.attempt || 0, limit = node.max_attempts || 1, remaining = Math.max(0, limit - used);
  return `Tentative ${used} sur ${limit} · ${remaining} reprise${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`;
}
function executionEmptyDetail() {
  if (!state.run) return '<p>Sélectionnez une étape du graphe.</p>';
  if (['completed','cancelled'].includes(state.run.status)) return `<h2>${esc(runLabel(state.run))}</h2><p>Le rapport réunit les résultats, décisions et preuves de cette exécution. Consultez les résultats validés ou le rapport complet ci-dessus.</p>`;
  if(state.run.parent_paused || state.run.iteration_wait && !state.run.iteration_hold)return `<h2>${esc(runLabel(state.run))}</h2><p>${esc(state.run.coordination_issue || (state.run.parent_paused?'Le workflow parent est suspendu. Reprenez-le depuis son suivi pour continuer.':'Cette tâche attend ses prérequis. Le coordinateur la démarrera lorsqu’ils seront terminés. Consultez les tâches et leurs dépendances dans le workflow parent.'))}</p>${button('return-parent','Voir le workflow parent','primary')}`;
  if (state.run.coordination_wait) return `<h2>${blockedDependencies().length ? 'Bloquée par une demande préalable' : state.run.coordination_hold ? 'Exécution suspendue manuellement' : 'En attente d’autres demandes'}</h2><p>${blockedDependencies().length ? 'Une demande préalable est annulée ou terminée sans autoriser la suite. Cette exécution ne peut pas reprendre avec ces dépendances.' : state.run.coordination_hold ? 'La reprise reste à votre initiative. Les dépendances ci-dessous doivent aussi être satisfaites.' : 'Cette demande commencera après la réussite des demandes suivantes.'}</p><div class="dependency-list">${dependencyItems().map(i => `<button data-action="conversation-item" data-id="${esc(i.run)}"><strong>${esc(i.title)}</strong><span>${esc(i.execution ? runLabel(i.execution) : i.status || 'En attente')}</span><span aria-hidden="true">→</span></button>`).join('')}</div>${state.conversation?.items.find(i=>i.run===state.run.id)?.dependencies_truncated ? '<p class="muted">Les 25 premières dépendances sont affichées, en priorité celles qui restent à traiter. La liste complète reste consultable dans le terminal.</p>' : ''}<p class="muted">Vous pouvez consulter et traiter chaque attente sans changer les dépendances.</p>${blockedDependencies().length ? button('replace-dependent','Créer une demande de remplacement') : ''}${resumeRequestButton()}`;
  return `<h2>${esc(runLabel(state.run))}</h2><p>${state.run.status === 'paused' ? 'Cette demande a été suspendue explicitement. Sa reprise est indépendante de la relance de l’agent.' : 'Sélectionnez une étape dans le graphe pour consulter son résultat.'}</p>${resumeRequestButton()}`;
}
function runOrigin(run=state.run) {
  if(run?.origin)return run.origin;
  const ref=run?.parent || run?.associated_with;
  if(ref)return {kind:run.parent?'task':'action',run:ref.run};
  return run?.parameters?.source_run ? {kind:'notification',run:run.parameters.source_run} : null;
}
function originView(run) {
  const origin=runOrigin(run);if(!origin)return '';
  const kind=origin.kind==='task'?'Tâche':origin.kind==='action'?'Action facultative':'Notification';
  const project=state.projects.find(project=>project.id===origin.project)?.title;
  return `<div class="run-origin"><small>${kind}${origin.kind==='action'?` : ${esc(run.definition?.title || 'Complément au résultat')}`:''}${origin.title?` · ${esc(origin.title)}`:''}${project?` · ${esc(project)}`:''}</small>${button('return-parent',origin.kind==='action'?'← Revenir au résultat principal':origin.kind==='notification'?'Revenir à l’exécution':'← Revenir au workflow parent','flat')}</div>`;
}
function renderExecutionOverview() {
  let target = document.querySelector('#execution-overview');
  if (state.mode !== 'run' || !state.run || conversationOverviewActive()) { target?.remove(); return; }
  if (!target) { target=document.createElement('section');target.id='execution-overview';target.setAttribute('aria-label','État et prochaine action');const tray=document.querySelector('#conversation-tray');(tray?.parentElement.matches('.conversation-scope-switch') ? tray.parentElement : tray || document.querySelector('.tabs'))?.after(target); }
  const run=state.run, action=state.conversation ? conversationNextAction(run) : executionAction(run), issue=executionIssue(run);
  const progress=executionProgress(run);
  const cause=issue?.reason || run.nodes[run.focus?.node]?.reason;
  const dependencies=run.coordination_wait ? dependencyItems() : [];
  const detail=dependencies.length ? 'Après : '+dependencies.map(i=>i.title).join(' · ') : cause || action.detail;
  const html=`<div class="execution-state"><div><strong class="execution-label ${issue ? 'has-issue' : ''}">${esc(action.action ? agentStopped()?'Agent arrêté':'À traiter dans la conversation' : runLabel(run))}</strong><span class="execution-progress">${progress.finished} / ${progress.total} étapes${progress.detail ? `<small>${esc(progress.detail)}</small>` : ''}</span></div>${completedResults().length ? button('execution-results','Voir les résultats','primary') : ''}${manuallyPaused(run) ? resumeRequestButton() : state.reviewFocus && action.node && state.selected===action.node && !action.action ? '' : button(action.action || 'execution-next-action',esc(action.label),'primary')}</div>${detail && detail!==runLabel(run) ? `<p class="execution-next" title="${esc(detail)}">${esc(detail)}</p>` : ''}`;
  const extended = originView(run) + html + associatedView(run.associated);
  if(target.dataset.content!==extended) { const opened=target.querySelector('.associated-panel details')?.open; target.innerHTML=extended;target.dataset.content=extended; if(opened)target.querySelector('.associated-panel details')?.setAttribute('open',''); }
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
  const summary=!c.item_count && !c.items.length ? agentStopped()?'Reprenez l’agent avant de décrire votre demande.':'Décrivez votre demande dans le terminal pour commencer.' : activityText(c);
  const humanFocus=!conversationOverviewActive() && ['waiting','waiting_input','returned'].includes(state.run?.focus?.status);
  const tray=document.createElement('section');tray.id='conversation-tray';tray.className='conversation-tray'+(conversationOverviewActive()?' overview-conversation-header':'');tray.dataset.conversation=c.id;
  tray.innerHTML=`<details class="request-selector" ${state.compactRequestsOpen ? 'open' : ''}><summary>${c.item_count ?? c.items.length} demande${(c.item_count ?? c.items.length) === 1 ? '' : 's'} <span aria-hidden="true">⌄</span></summary><div class="request-options"><div class="request-list-heading"><strong>Demandes du workflow</strong><span>${c.total > c.items.length ? `${c.items.length} affichées sur ${c.total}` : `${c.items.length} demande${c.items.length === 1 ? '' : 's'}`}</span></div>${conversationPager(c)}<div class="work-items">${items.map(i=>`<button data-action="conversation-item" data-id="${esc(i.run)}" aria-pressed="${state.run?.id===i.run}" class="${state.run?.id===i.run?'active':''}"><strong>${esc(i.request.split('\n')[0])}</strong><small>${c.projects?.length>1 ? esc(state.projects.find(p=>p.id===i.project)?.title || i.project)+' · ' : ''}${esc(conversationReady(i.execution) ? agentStopped()?'Agent arrêté':'À traiter dans la conversation' : runLabel(i.execution || {status:'active'}))}</small></button>`).join('')}</div><div class="request-list-actions">${c.status==='open'?button('conversation-add','Ajouter une demande…','flat'):''}${button('archive-conversation',c.archived?'Restaurer':'Archiver la conversation','flat')}</div></div></details><p class="conversation-summary" title="${esc(summary)}">${agentStopped() && !currentWorkFinished() && !humanFocus ? '<strong>Agent arrêté · progression conservée.</strong> ' : ''}${!c.activity && c.total>c.items.length?'Cette page : ':''}${esc(summary)}</p>${agentStopped() && !currentWorkFinished()?button('resume-agent','Reprendre l’agent…','flat')+button('conversation-shell','Voir le shell','flat'):button(currentWorkFinished()?'conversation-shell':'conversation-terminal',currentWorkFinished()?'Voir le terminal':'Terminal','flat',currentWorkFinished()?'':'aria-label="Retrouver la conversation" title="Retrouver la conversation"')}`;
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
  state.initialRequests ??= {}; if(request)state.initialRequests[state.conversation.id]=request;
  state.mode = 'run'; state.run = null; state.conversationScope='request'; state.zoom=1; closeModal(); delete state.launchDrafts[launchKey()]; state.launchReturn = null; renderEditor();
  await terminal.open(state.project, state.graph, state.conversation.id);
}

function portSummary(node) {
  if (currentGraph()?.schema === 2) return Object.entries(node.outputs || {}).map(([name, port]) => `${name} · ${portType(port) === 'array' ? 'liste' : 'un élément'}`).join(' ; ') || 'Aucune sortie';
  const inputs = Object.keys(node.inputs || {}).length, outputs = Object.keys(node.outputs || {}).length;
  return `${inputs} entrée${inputs > 1 ? 's' : ''} → ${outputs} sortie${outputs > 1 ? 's' : ''}`;
}
function renderGraph(positionsOnly = false) {
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
  canvas.classList.toggle('execution-map',running);canvas.style.setProperty('--run-node-width',(graph.nodeWidth || 240)+'px');
  const edgeLabels = Object.fromEntries(graph.edges.map(edge => [edge.id, [edge.outcome && edge.outcome !== 'done' ? decisionLabel(edge.outcome) : '', Object.keys(edge.mapping || {}).length ? graph.schema === 2 ? Object.keys(edge.mapping).map(name => `${name} · ${portType(graph.nodes.find(n => n.id === edge.from)?.outputs?.[name]) === 'array' ? 'liste' : 'un élément'}`).join(' · ') : `${Object.keys(edge.mapping).length} donnée${Object.keys(edge.mapping).length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')]));
  const nodeContainer = document.querySelector('#nodes');
  if (!positionsOnly) nodeContainer.innerHTML = graph.nodes.map((n, i) => {
    const p = nodePosition(n, i), status = n.kind === 'group' ? n.status : running ? state.run.nodes[n.id]?.status || 'pending' : 'pending';
    if (n.kind === 'group') return `<button class="node" data-action="expand-phase" data-phase="${esc(n.phase)}" data-group="${esc(n.phase)}" data-status="${status}" style="left:${p.x}px;top:${p.y}px" aria-label="Déplier la phase ${esc(n.title)}"><span class="node-main"><span class="icon">⊞</span><span><span class="mission" title="${esc(n.title)}">${esc(n.title)}</span><span class="kind">${n.members.length} étapes · déplier</span></span></span><span class="node-footer">${badge(status)}</span></button>`;
    const card = `<button class="node ${state.selected === n.id ? 'selected' : ''}" data-action="select-node" data-id="${n.id}" data-status="${status}" data-failed="${running && nodeFailed(state.run.nodes[n.id], n) ? 'true' : 'false'}" style="left:${p.x}px;top:${p.y}px" aria-label="${esc(n.title)} · ${running ? nodeLabel(state.run.nodes[n.id], n) : kinds[n.kind]}">${running ? '<span class="port in" aria-hidden="true"></span><span class="port out" aria-hidden="true"></span>' : ''}<span class="node-main"><span class="icon" aria-hidden="true">${symbols[n.kind]}</span><span><span class="mission" title="${esc(n.title)}">${esc(n.title)}</span><span class="kind">${esc(n.phase || kinds[n.kind])}</span></span></span><span class="node-footer">${running ? nodeBadge(state.run.nodes[n.id], n) : n.phase ? `<span>${esc(kinds[n.kind])}</span>` : ''}<span title="${esc('Entrées : ' + (Object.keys(n.inputs || {}).join(', ') || 'aucune') + ' · Sorties : ' + (Object.keys(n.outputs || {}).join(', ') || 'aucune'))}">${n.kind === 'decision' ? 'Vous' : portSummary(n)}</span></span></button>`;
    const live = running ? runtimeCardContent(n, state.run, state.projects) : '';
    if (!live) return card;
    const opening = card.indexOf('>');
    return card.slice(0,opening).replace('<button','<article').replace('class="node ', 'class="node execution-live-node ') + '><button type="button" class="execution-node-summary" data-action="select-node" data-id="'+esc(n.id)+'" aria-label="'+esc(n.title)+'">' + card.slice(opening+1,-9) + '</button>' + live + '</article>';
  }).join('');
  if (positionsOnly) for (const [i, node] of graph.nodes.entries()) {
    const card = nodeContainer.querySelector(`.node[data-id="${CSS.escape(node.id)}"]`), p = nodePosition(node, i);
    if (card) { card.style.left = p.x + 'px'; card.style.top = p.y + 'px'; }
  }
  renderEditorNotes(graph, running, positionsOnly);
  const ports = document.querySelector('#graph-ports');
  if (!positionsOnly && ports) ports.innerHTML = running ? '' : graph.nodes.filter(n => n.kind !== 'group').map(n => ['in', 'out'].map(direction => `<button type="button" class="graph-port ${direction}" data-action="connection-port" data-id="${esc(n.id)}" data-direction="${direction}" aria-label="${direction === 'out' ? 'Relier depuis' : 'Relier vers'} ${esc(n.title)}" title="${direction === 'out' ? 'Sortie : cliquer puis choisir une entrée, ou faire glisser' : 'Entrée : cible de liaison'}"><span></span></button>`).join('')).join('');
  if (!running && ports) for (const [i, node] of graph.nodes.entries()) {
    const p = nodePosition(node, i);
    for (const port of ports.querySelectorAll(`[data-id="${CSS.escape(node.id)}"]`)) {
      port.style.left = (p.x + (port.dataset.direction === 'out' ? 240 : 0)) + 'px'; port.style.top = (p.y + 58) + 'px';
      port.classList.toggle('link-origin', state.connectSource?.id === node.id && state.connectSource.direction === port.dataset.direction);
    }
  }
  canvas.style.setProperty('--graph-zoom', state.zoom);
  // Measure natural card heights before routing: long titles and status badges
  // reserve space rather than being clipped or overflowing their footer.
  const heights = Object.fromEntries([...nodeContainer.querySelectorAll('.node')].map((node, i) => [graph.nodes[i].id, node.offsetHeight]));
  if (running) {
    graph = executionLayout(graph, document.querySelector('.canvas-area')?.clientWidth || 600, heights, edgeLabels);
    graph.nodes.forEach((node, i) => { const card = nodeContainer.children[i]; card.style.left = node.position.x + 'px'; card.style.top = node.position.y + 'px'; });
  }
  const routes = running ? graph.routes : designRoutes(graph, heights, edgeLabels);
  const notes = running ? [] : graph.layout?.notes || [];
  const width = Math.max(running ? graph.layoutWidth : 900, ...notes.map(n => n.position.x + (n.size?.width || 280) + 24), ...graph.nodes.map((node, i) => nodePosition(node, i).x + (running ? graph.nodeWidth : 240) + 24), ...routes.map(route => Math.max(route.label.x + route.label.width, ...route.points.map(point => point[0])) + 24));
  const height = Math.max(running ? graph.layoutHeight : 500, ...notes.map(n => n.position.y + (n.size?.height || 180) + 24), ...graph.nodes.map((node, i) => nodePosition(node, i).y + (heights[node.id] || 132) + 24), ...routes.map(route => Math.max(route.label.y + route.label.height, ...route.points.map(point => point[1])) + 24));
  canvas.style.width = width + 'px'; canvas.style.height = height + 'px'; canvas.style.transform = `scale(${state.zoom})`;
  document.querySelector('.canvas-size').style.width = width * state.zoom + 'px'; document.querySelector('.canvas-size').style.height = height * state.zoom + 'px';
  const svg = canvas.querySelector('svg'); svg.setAttribute('width', width); svg.setAttribute('height', height);
  if (running) svg.setAttribute('aria-hidden', 'true'); else svg.removeAttribute('aria-hidden');
  const routesById = new Map(routes.map(route => [route.id, route]));
  const wires = [], labels = [];
  for (const edge of graph.edges) {
    const route = routesById.get(edge.id); if (!route) continue;
    const source = state.run?.nodes[edge.originalFrom || edge.from], box = route.label;
    const names = id => graph.nodes.find(node => node.id === id)?.title || id;
    const label = `${names(edge.from)} → ${names(edge.to)}${edgeLabels[edge.id] ? ' · ' + edgeLabels[edge.id] : ''}`;
    const action = !running ? `data-action="select-edge" data-id="${esc(edge.id)}"` : '';
    wires.push(`<g class="graph-link" data-edge="${esc(edge.id)}" ${action} ${!running ? `role="button" tabindex="0" aria-label="Corriger le lien : ${esc(label)}"` : ''}><title>${esc(label)}</title><path class="edge-hit" d="${route.path}"/><path data-edge="${esc(edge.id)}" class="edge ${running && source?.status === 'accepted' && source.outcome === (edge.outcome || 'done') ? 'active' : ''}" d="${route.path}"/></g>`);
    if (box.lines.length) labels.push(`<g class="graph-label" data-edge="${esc(edge.id)}" ${action} aria-hidden="true"><rect class="edge-label-background" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="4"/><text class="edge-label" x="${box.x + box.width / 2}" y="${box.y + 16}" text-anchor="middle">${box.lines.map((line, i) => `<tspan x="${box.x + box.width / 2}" dy="${i ? 16 : 0}">${esc(line)}</tspan>`).join('')}</text></g>`);
  }
  // Paint every label after every wire. A later join must not cross an earlier
  // label, nor steal its mouse hit target. Keyboard stops remain one per edge.
  svg.innerHTML = wires.join('') + labels.join('');
  // SVG groups receive the same keyboard activation as native buttons.
  if (!running) for (const link of svg.querySelectorAll('.graph-link[data-action=select-edge]')) link.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

}

function executionTrail(node) {
  const graph=currentGraph(),label=outcome=>({done:'',approve:'Si autorisé',reject:'Si refusé',pass:'Si conforme',fail:'Si non conforme'}[outcome] ?? 'Si : '+decisionLabel(outcome));
  const neighbours=(direction)=>graph.edges.filter(e=>e[direction==='before'?'to':'from']===node.id).map(e=>({node:graph.nodes.find(n=>n.id===e[direction==='before'?'from':'to']),outcome:e.outcome || 'done'})).filter(e=>e.node);
  const previous=neighbours('before'),next=neighbours('after');
  const group=(entries,title,current=false)=>`<div class="step-trail-group" aria-label="${title}">${entries.map(entry=>`<button data-action="select-node" data-id="${entry.node.id}" class="${entry.outcome==='done'?'edge-default':''}" ${current?'aria-current="step"':''}><small>${current?'Étape sélectionnée':esc(label(entry.outcome))}</small><strong>${esc(entry.node.title)}</strong></button>`).join('')}</div>`;
  return `<nav class="step-trail" aria-label="Position dans le workflow"><div>${previous.length?group(previous,'Étapes précédentes')+'<span aria-hidden="true">→</span>':''}${group([{node}],'Étape sélectionnée',true)}${next.length?'<span aria-hidden="true">→</span>'+group(next,'Suites du bloc'):''}</div></nav>`;
}
function interactionDraftKey(form) {
  const node=state.run?.nodes[state.selected];
  if(!node || !['question-form','decision-form','receipt-form','collection-form'].includes(form.id))return null;
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
  const scroll = (target.querySelector('.interaction-scroll') || target).scrollTop;
  const focusId=focus?.id, focusAction=focus?.dataset.action, focusSummary=focus?.tagName==='SUMMARY' ? focus.textContent : null;
  const selection=focus?.tagName==='TEXTAREA' ? [focus.selectionStart,focus.selectionEnd] : null;
  target.classList.remove('interaction-panel');
  if (state.mode === 'run' && state.run?.coordination_wait) { target.innerHTML=executionEmptyDetail(); target.dataset.node='dependencies'; return; }
  const graph = currentGraph(); const node = graph.nodes.find(n => n.id === state.selected);
  document.querySelector('#studio-content').classList.toggle('properties-open', state.mode === 'design' && !!node && state.propertiesOpen !== false);
  const opened = target.dataset.node === node?.id ? [...target.querySelectorAll('details[open] > summary')].map(s => s.textContent) : [];
  if (state.mode === 'design' && state.propertiesOpen === false) { target.innerHTML = ''; return; }
  if (!node) { target.innerHTML = state.mode === 'run' ? executionEmptyDetail() : ''; return; }
  const properties = `${state.mode==='run' ? executionTrail(node) : ''}${button('close-inspector', '×', 'flat inspector-close','aria-label="Fermer les propriétés"')}<div class="eyebrow">${esc(node.route_output ? 'Condition évaluée par un agent' : kinds[node.kind])}</div><h2>${esc(node.title)}</h2>${state.mode === 'run' && state.run ? (node.kind==='input'?collectionRecoveryView(node):'')+runInspector(node) : designInspector(node)}`;
  target.innerHTML = state.mode === 'design' ? `<header class="design-inspector-header">${button('close-inspector', '← Retour au graphe', '', 'type="button" aria-label="Retour au graphe"')}<strong>${esc(node.title)}</strong></header><div class="design-inspector-scroll">${properties}</div><footer class="design-inspector-actions"><button type="submit" form="node-form" class="primary">Appliquer au bloc</button></footer>` : properties;
  const fixedActions=state.mode==='run' && target.querySelector('.interaction-actions');
  target.classList.toggle('interaction-panel', !!fixedActions);
  if(fixedActions) {
    const form=fixedActions.closest('form');
    for(const control of fixedActions.querySelectorAll('button'))control.setAttribute('form',form.id);
    const scrollArea=document.createElement('div');scrollArea.className='interaction-scroll';
    scrollArea.append(...target.childNodes);target.append(scrollArea);
    const footer=document.createElement('footer');footer.className='interaction-footer';footer.append(fixedActions);target.append(footer);
  }
  target.dataset.node = node.id;restoreInteractionDraft(target);
  const interaction = target.querySelector('#question-form,#decision-form,#receipt-form,#collection-form');
  target.dataset.interaction = interaction ? interactionDraftKey(interaction) : '';
  if(interaction && pendingInteractions.has(target.dataset.interaction))for(const field of interaction.elements)field.disabled=true;
  if(interaction && oldIdentity && oldIdentity===target.dataset.interaction) for(const field of interaction.querySelectorAll('input[name],textarea[name],select[name]')) {
    const prior=controls.find(c=>c.name===field.name && c.type===field.type && (!['checkbox','radio'].includes(field.type) || c.value===field.value));
    if(prior) {if(['checkbox','radio'].includes(field.type))field.checked=prior.checked;else field.value=prior.value;}
  }
  const form = target.querySelector('#node-form'); if (form) {form.dataset.signature = formSignature(form);if(state.restoreForm?.node === node.id) {for(const [name,value] of Object.entries(state.restoreForm.values)) {const control=form.elements.namedItem(name);if(control){if(control.type==='checkbox')control.checked=value===true || value==='on';else control.value=value;}}state.restoreForm=null;}}
  for (const summary of target.querySelectorAll('details > summary')) if (opened.includes(summary.textContent)) summary.parentElement.open = true;
  if(state.mode==='run') {
    const replacement=focusId ? target.querySelector('#'+CSS.escape(focusId)) : focusAction ? target.querySelector(`[data-action="${CSS.escape(focusAction)}"]`) : focusSummary ? [...target.querySelectorAll('summary')].find(el=>el.textContent===focusSummary) : null;
    replacement?.focus({preventScroll:true});if(selection && replacement?.tagName==='TEXTAREA')replacement.setSelectionRange(...selection);
    (target.querySelector('.interaction-scroll') || target).scrollTop=oldIdentity===target.dataset.interaction ? scroll : 0;
  }
}

function formSignature(form) { return JSON.stringify([...new FormData(form)]); }
function formDraft(form) { const values=Object.fromEntries(new FormData(form));for(const field of form.querySelectorAll('input[type=checkbox][name]'))values[field.name]=field.checked;return values; }
function applyNodeForm(form, render = true) {
  if (!form.reportValidity()) throw new Error('Complétez les champs du bloc avant de continuer.');
  const data = Object.fromEntries(new FormData(form));
  const bindings = form.querySelector('#node-capabilities') ? new FormData(form).getAll('capabilities').filter(Boolean).map(v => JSON.parse(v)) : null;
  const g = clone(state.graph);

  const n = g.nodes.find(n => n.id === state.selected), previousCollection = n.collection;
  if (bindings) n.capabilities = bindings;
  if (['command', 'document'].includes(n.kind)) n.reuse = data.reuse === 'on';
  for (const [key, value] of Object.entries(data)) {
    if (['criteria', 'options', 'argv', 'resources', 'required_capabilities'].includes(key)) n[key] = value.split('\n').map(s => s.trim()).filter(Boolean);
    else if (['inputs', 'outputs', 'operation', 'input_mapping', 'output_mapping'].includes(key)) n[key] = JSON.parse(value);
    else if (['max_attempts', 'timeout', 'concurrency'].includes(key)) n[key] = Number(value);
    else if (['capabilities', 'reuse', 'link_operation', 'candidate_check', 'condition_type'].includes(key) || key.startsWith('op_')) continue;
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
  if (n.kind === 'foreach') { const root = n.collection.split('.')[0], previousRoot = previousCollection?.split('.')[0]; if(n.collection!==previousCollection && root!==previousRoot){ n.inputs ||= {}; delete n.inputs[previousRoot]; n.inputs[root] ||= root === 'plan' ? {type:'object',required:true} : collectionPort(); } n.criteria = []; }
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
  return `<fieldset class="ports"><legend>Entrées et sorties</legend>${[['inputs','Entrées'],['outputs','Sorties']].map(([direction,label]) => `<section class="port-section"><strong>${label}</strong><ul>${Object.entries(node[direction] || {}).map(([name,port]) => `<li><strong>${esc(name)}</strong><span>${esc(portDescription(port,direction))}</span><div>${button('edit-port','Modifier','flat',`data-direction="${direction}" data-port="${esc(name)}"`)}${button('remove-port','Retirer','flat',`data-direction="${direction}" data-port="${esc(name)}"`)}</div></li>`).join('') || '<li>Aucune donnée déclarée</li>'}</ul>${button('add-port','Ajouter une '+(direction === 'inputs' ? 'entrée' : 'sortie'),'flat',`data-direction="${direction}"`)}</section>`).join('')}</fieldset>`;
}
function designGuidance(graph = state.graph, selected = null) {
  const warnings = designWarnings(graph).filter(item => !selected || item.node === selected);
  if (!warnings.length) return '';
  return `<details class="notice design-guidance" ${selected ? 'open' : ''}><summary>${warnings.length} point${warnings.length > 1 ? 's' : ''} de conception à vérifier</summary><p>Ces indications ne bloquent pas les brouillons ni les étapes volontairement indépendantes.</p><ul>${warnings.map(item => `<li><strong>${esc(graph.nodes.find(node => node.id === item.node)?.title)}</strong><p>${esc(item.message)}</p>${button('repair-design', 'Vérifier les liens', 'flat', `data-id="${esc(item.node)}"`)}</li>`).join('')}</ul></details>`;
}
function simulationForm(node) {
  const types = { string: 'Texte', boolean: 'Oui / Non', number: 'Nombre', object: 'Objet JSON', array: 'Liste JSON', any: 'Valeur JSON' };
  const fields = Object.entries(node.outputs || {}).map(([name, specification], index) => {
    const type = portType(specification);
    const custom = Object.hasOwn(node.sample_outputs || {}, name), value = node.sample_outputs?.[name];
    const id = `sample-${index}`, disabled = custom ? '' : 'disabled';
    const invalidBoolean = type === 'boolean' && custom && typeof value !== 'boolean';
    let field;
    if (type === 'boolean') field = `<select id="${id}" ${disabled}>${invalidBoolean ? `<option value="" selected>Valeur incompatible : ${esc(JSON.stringify(value))}</option>` : ''}${options([['true','Oui (true)'],['false','Non (false)']], custom && !invalidBoolean ? String(value) : invalidBoolean ? '' : 'true')}</select>`;
    else if (type === 'number') field = `<input id="${id}" inputmode="decimal" ${disabled} value="${esc(custom ? String(value) : '0')}">`;
    else field = `<textarea id="${id}" rows="${['object','array','any'].includes(type) ? 4 : 2}" ${disabled}>${esc(custom ? typeof value === 'string' && type === 'string' ? value : JSON.stringify(value, null, 2) : type === 'object' ? '{}' : type === 'array' ? '[]' : type === 'any' ? 'null' : '')}</textarea>`;
    return `<fieldset data-sample-port="${esc(name)}"><legend>${esc(name)} · ${esc(portDescription(specification))}</legend><label><input type="checkbox" data-sample-custom ${custom ? 'checked' : ''}>Définir une valeur pour cet essai</label><div data-sample-value ${custom ? '' : 'hidden'}><label for="${id}">Valeur simulée</label>${field}${invalidBoolean ? '<p class="error" data-sample-error>L’ancienne valeur n’est pas un booléen. Corrigez-la ou décochez la valeur personnalisée.</p>' : ''}</div><small data-sample-automatic ${custom ? 'hidden' : ''}>Exemple automatique du type attendu.</small></fieldset>`;
  }).join('');
  return `<form id="simulation-form"><p>Ces données servent uniquement à simuler le parcours. Elles ne prouvent aucun travail réel et n’autorisent aucune opération.</p><p>Sans valeur personnalisée, Tricorder génère un exemple du type attendu. Personnalisez une sortie pour essayer une autre branche.</p>${fields || '<p>Aucune sortie déclarée. Ajoutez une sortie dans les propriétés du bloc pour définir ses données de simulation.</p>'}<div class="modal-actions"><button type="submit" class="primary">Appliquer les données de simulation</button></div></form>`;
}
function confirmDesignRemoval(kind, id) {
  const node = state.graph.nodes.find(item => item.id === id);
  if (kind === 'node' && state.graph.nodes.length === 1) return error('Conservez au moins une étape.');
  const removed = state.graph.edges.filter(edge => kind === 'node' ? edge.from === id || edge.to === id : edge.id === id);
  const label = nodeId => state.graph.nodes.find(item => item.id === nodeId)?.title || nodeId;
  state.designRemoval = { kind, id };
  modal(kind === 'node' ? 'Supprimer ce bloc' : 'Supprimer ce lien', `<p>${kind === 'node' ? `Le bloc « ${esc(node.title)} » sera supprimé avec ${removed.length} lien${removed.length > 1 ? 's' : ''}.` : 'Ce lien sera supprimé.'}</p>${removed.length ? `<ul>${removed.map(edge => `<li>${esc(label(edge.from))} → ${esc(label(edge.to))}${Object.keys(edge.mapping || {}).length ? ` · données : ${esc(Object.values(edge.mapping).join(', '))}` : ''}</li>`).join('')}</ul><p>Les étapes restantes pourraient démarrer indépendamment ou ne plus recevoir leurs données. Vérifiez leurs liens avant le prochain lancement.</p>` : ''}<p class="muted">Vous pouvez annuler cette modification dans l’éditeur. Les exécutions déjà lancées gardent leur version.</p>`, button('close-modal', 'Conserver') + button('confirm-design-removal', kind === 'node' ? 'Supprimer le bloc et ses liens' : 'Supprimer le lien', 'danger'));
}
function refreshConnectionForm(initialMapping = null) {
  const form = document.querySelector('#connect-form'); if (!form) return;
  const source = state.graph.nodes.find(n => n.id === form.elements.from.value);
  const target = state.graph.nodes.find(n => n.id === form.elements.to.value);
  const outcomes = connectionOutcomes(source), selectedOutcome = form.elements.outcome.value;
  form.elements.outcome.innerHTML = options(outcomes.map(v => [v, v === 'done' ? 'Travail terminé' : decisionLabel(v)]), outcomes.includes(selectedOutcome) ? selectedOutcome : outcomes[0]);
  form.elements.output.innerHTML = options([['','Aucune donnée supplémentaire'], ...Object.keys(source.outputs || {}).map(k => [k,`${k} — ${portDescription(source.outputs[k])}`])]);
  form.elements.input.innerHTML = options([['','Choisir une entrée'], ...Object.keys(target.inputs || {}).map(k => [k,`${k} — ${portDescription(target.inputs[k],'inputs')}`])]);
  const previous = initialMapping || JSON.parse(form.elements.mapping.value || '{}');
  const retained = Object.fromEntries(Object.entries(previous).filter(([from, to]) => source.outputs?.[from] && !incompatibleReason(source.outputs[from], target.inputs[to], state.graph.schema)));
  const mapping = initialMapping !== null ? initialMapping : Object.keys(retained).length ? retained : Object.fromEntries(Object.entries(source.outputs || {}).filter(([key,type]) => target.inputs?.[key] && !incompatibleReason(type, target.inputs[key], state.graph.schema)).map(([key]) => [key,key]));
  const orderOnly = form.elements.order_only.checked;
  for (const name of ['output','input','mapping']) form.elements[name].disabled = orderOnly;
  form.elements.mapping.value = JSON.stringify(orderOnly ? {} : mapping);
  if (orderOnly) { form.querySelector('.mapping-summary').textContent = 'Ordre d’exécution uniquement : aucune donnée ne sera transmise.'; return; }
  form.querySelector('.mapping-summary').textContent = Object.keys(mapping).length ? 'Données reliées par leur nom : ' + Object.keys(mapping).join(', ') : 'Choisissez les données à transmettre, ou reliez seulement les étapes.';
}

function openConnection({ from, to, edge } = {}) {
  if (state.mode !== 'design') return;
  if (state.graph.nodes.length < 2) { toast('Ajoutez un deuxième bloc pour créer une liaison.'); return; }
  cancelConnection(false);
  from ||= edge?.from || state.selected || state.graph.nodes[0].id;
  to ||= edge?.to || state.graph.nodes.find(n => n.id !== from)?.id;
  modal(edge ? 'Modifier le lien' : 'Relier deux étapes', `<form id="connect-form"><input type="hidden" name="edge_id" value="${esc(edge?.id || '')}"><label for="edge-from">Depuis</label><select id="edge-from" name="from">${options(state.graph.nodes.map(n => [n.id,n.title]), from)}</select><label for="edge-outcome">Après l’issue</label><select id="edge-outcome" name="outcome"></select><label for="edge-to">Vers</label><select id="edge-to" name="to">${options(state.graph.nodes.map(n => [n.id,n.title]), to)}</select><p class="mapping-summary" role="status"></p><label><input type="checkbox" name="order_only" ${edge && !Object.keys(edge.mapping || {}).length ? 'checked' : ''}>Ne transmettre aucune donnée (ordre d’exécution uniquement)</label><label>Sortie à transmettre<select name="output"></select></label><label>Entrée destinataire<select name="input"></select></label><details><summary>Configuration des échanges</summary><label for="edge-mapping">Données transmises (JSON : sortie → entrée)</label><textarea id="edge-mapping" name="mapping">{}</textarea></details><div class="modal-actions"><button class="primary">${edge ? 'Enregistrer le lien' : 'Créer le lien'}</button></div></form>`, edge ? button('close-modal', 'Conserver le lien') + button('delete-edge', 'Retirer ce lien…', 'danger', `data-id="${esc(edge.id)}"`) : '');
  refreshConnectionForm(edge?.mapping || null);
  if (edge) document.querySelector('#edge-outcome').value = edge.outcome || 'done';
}
function viewportGeometry() {
  const viewport = document.querySelector('.canvas-scroll');
  return viewport ? { left: viewport.scrollLeft, top: viewport.scrollTop, width: viewport.clientWidth, height: viewport.clientHeight } : { left: 0, top: 0, width: 900, height: 500 };
}
function newItemPosition(size) {
  const boxes = state.graph.nodes.map((node, i) => ({ ...nodePosition(node, i), width: 240, height: document.querySelector(`.node[data-id="${CSS.escape(node.id)}"]`)?.offsetHeight || 132, id: node.id }));
  const notes = (state.graph.layout?.notes || []).map(note => ({ ...note.position, width: note.size?.width || 280, height: note.size?.height || 180 }));
  const routes=size ? [...document.querySelectorAll('.edge')].flatMap(path=>{const points=[...path.getAttribute('d').matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map(match=>[Number(match[1]),Number(match[2])]);return points.slice(1).map((point,i)=>({x:Math.min(point[0],points[i][0]),y:Math.min(point[1],points[i][1]),width:Math.max(1,Math.abs(point[0]-points[i][0])),height:Math.max(1,Math.abs(point[1]-points[i][1]))}));}) : [];
  const labels=size ? [...document.querySelectorAll('.edge-label-background')].map(element=>{const box=element.getBBox();return {x:box.x,y:box.y,width:box.width,height:box.height};}) : [];
  return placement(viewportGeometry(), state.zoom, boxes.find(box => box.id === state.selected), [...boxes, ...notes,...routes,...labels], size);
}
function focusGraphItem(id, note = false, reveal = false) {
  const item = document.querySelector(note ? `.graph-note[data-note-id="${CSS.escape(id)}"] .note-heading` : `.node[data-id="${CSS.escape(id)}"]`);
  if (reveal && item) {
    const viewport = document.querySelector('.canvas-scroll'), card = note ? item.closest('.graph-note') : item;
    if (viewport) {
      const x = card.offsetLeft * state.zoom, y = card.offsetTop * state.zoom, width = card.offsetWidth * state.zoom, height = card.offsetHeight * state.zoom;
      if (x < viewport.scrollLeft + 16 || x + width > viewport.scrollLeft + viewport.clientWidth - 16) viewport.scrollLeft = Math.max(0, x + width / 2 - viewport.clientWidth / 2);
      if (y < viewport.scrollTop + 16 || y + height > viewport.scrollTop + viewport.clientHeight - 16) viewport.scrollTop = Math.max(0, y + height / 2 - viewport.clientHeight / 2);
    }
  }
  item?.focus({ preventScroll: true });
}
function setGraphZoom(next) {
  const position = zoomScroll(viewportGeometry(), state.zoom, next);
  state.zoom = next; renderGraph();
  const viewport = document.querySelector('.canvas-scroll');
  if (viewport) { viewport.scrollLeft = position.left; viewport.scrollTop = position.top; }
  document.querySelector('#zoom-label').textContent = Math.round(next * 100) + ' %';
}
function fitCurrentGraph() {
  const canvas=document.querySelector('.canvas'), viewport=document.querySelector('.canvas-scroll');if(!canvas || !viewport)return;
  const origin=canvas.getBoundingClientRect(), boxes=[...canvas.querySelectorAll('.node,.graph-note,.edge-label-background')].map(element=>{const box=element.getBoundingClientRect();return {x:(box.left-origin.left)/state.zoom,y:(box.top-origin.top)/state.zoom,width:box.width/state.zoom,height:box.height/state.zoom};});
  const fit=fitViewport(boxes,{width:viewport.clientWidth,height:viewport.clientHeight});
  state.zoom=fit.zoom;renderGraph();viewport.scrollLeft=fit.left;viewport.scrollTop=fit.top;
  document.querySelector('#zoom-label').textContent=Math.round(state.zoom*100)+' %';
}
function renderEditorNotes(graph, running, positionsOnly) {
  const target = document.querySelector('#notes'); if (!target) return;
  const notes = running ? [] : graph.layout?.notes || [];
  if (!positionsOnly) target.innerHTML = notes.map(note => `<article class="graph-note" data-note-id="${esc(note.id)}" aria-label="Note : ${esc(note.title || 'Sans titre')}"><button type="button" class="note-heading" data-action="edit-note" data-id="${esc(note.id)}" title="Modifier la note · faire glisser pour déplacer"><small>Note · sans effet sur l’exécution</small><strong>${esc(note.title || 'Sans titre')}</strong></button><div class="note-text">${esc(note.text)}</div></article>`).join('');
  for (const note of notes) {
    const card = target.querySelector(`[data-note-id="${CSS.escape(note.id)}"]`); if (!card) continue;
    Object.assign(card.style, { left: note.position.x + 'px', top: note.position.y + 'px', width: (note.size?.width || 280) + 'px', height: (note.size?.height || 180) + 'px' });
  }
}
function noteForm(id) {
  if (state.mode !== 'design') return;
  const note = state.graph.layout?.notes?.find(n => n.id === id);
  if (!note && (state.graph.layout?.notes?.length || 0) >= 200) { toast('Ce workflow contient déjà 200 notes.'); return; }
  modal(note ? 'Modifier la note' : 'Ajouter une note', `<p>Note · sans effet sur l’exécution. Ce texte accompagne le dessin ; il n’est pas transmis aux agents.</p><form id="note-form"><input type="hidden" name="note_id" value="${esc(note?.id || '')}"><label for="note-title">Titre</label><input name="title" id="note-title" maxlength="160" value="${esc(note?.title || '')}" placeholder="À retenir"><label for="note-text">Texte de la note</label><textarea name="text" id="note-text" maxlength="20000" rows="6">${esc(note?.text || '')}</textarea><details><summary>Taille de la note</summary><label>Largeur<input name="width" type="number" min="160" max="1000" required value="${note?.size?.width || 280}"></label><label>Hauteur<input name="height" type="number" min="160" max="1000" required value="${note?.size?.height || 180}"></label></details><div class="modal-actions"><button class="primary">${note ? 'Enregistrer la note' : 'Ajouter la note'}</button></div></form>`, note ? button('delete-note', 'Supprimer la note', 'danger', `data-id="${esc(id)}"`) : '');
}
function cancelConnection(restoreFocus = true) {
  const source = state.connectSource; state.connectSource = null;
  document.querySelector('.connection-instruction')?.remove(); document.querySelector('.connection-preview')?.remove();
  document.querySelectorAll('.graph-port.link-origin').forEach(port => port.classList.remove('link-origin'));
  if (source && restoreFocus) document.querySelector(`.graph-port[data-id="${CSS.escape(source.id)}"][data-direction="${source.direction}"]`)?.focus({ preventScroll: true });
}
function connectionPort(port) {
  if (state.mode !== 'design') return;
  const selected = { id: port.dataset.id, direction: port.dataset.direction }, source = state.connectSource;
  if (source && source.id !== selected.id && source.direction !== selected.direction) {
    openConnection({ from: source.direction === 'out' ? source.id : selected.id, to: source.direction === 'in' ? source.id : selected.id }); return;
  }
  if (source && source.id === selected.id && source.direction !== selected.direction) { toast('Un bloc ne peut pas être relié à lui-même. Choisissez un autre bloc.'); return; }
  cancelConnection(false); state.connectSource = selected; port.classList.add('link-origin');
  const notice = document.createElement('div'); notice.className = 'connection-instruction'; notice.setAttribute('role', 'status');
  notice.innerHTML = `Choisissez ${selected.direction === 'out' ? 'une entrée' : 'une sortie'} sur un autre bloc. Échap pour annuler.`;
  document.querySelector('.canvas-area')?.append(notice);
}

function installEditorGestures() {
  const listen = (type, fn) => window.document.addEventListener(type, fn, true);
  const unlisten = (type, fn) => window.document.removeEventListener(type, fn, true);
  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || state.mode !== 'design' || state.route !== 'workflow' || document.querySelector('.modal') || editorGesture) return;
    const port = event.target.closest('.graph-port'), card = event.target.closest('.node[data-id],.note-heading');
    if (!port && !card) return;
    try { flushNodeForm(); } catch (e) { error(e.message); return; }
    const note = card?.matches('.note-heading'), id = (port || card).dataset.id;
    const item = !port && (note ? state.graph.layout.notes.find(n => n.id === id) : state.graph.nodes.find(n => n.id === id));
    const before = clone(state.graph), start = item && { ...(item.position || nodePosition(item, state.graph.nodes.indexOf(item))) };
    const origin = { x: event.clientX, y: event.clientY }, capture = port || card, pointerId = event.pointerId;
    let moved = false;
    const move = e => {
      if (e.pointerId !== pointerId) return;
      const pointer = { x: e.clientX, y: e.clientY };
      if (!moved && !movedEnough(origin, pointer)) return;
      e.preventDefault();
      if (!moved) { moved = true; capture.setPointerCapture(pointerId); capture.classList.add('is-dragging'); if (port) connectionPort(port); }
      if (port) {
        const canvas = document.querySelector('.canvas'), box = canvas.getBoundingClientRect(), svg = canvas.querySelector('svg');
        let preview = svg.querySelector('.connection-preview');
        if (!preview) { preview = window.document.createElementNS('http://www.w3.org/2000/svg', 'path'); preview.classList.add('connection-preview'); svg.append(preview); }
        preview.setAttribute('d', `M${parseFloat(port.style.left)},${parseFloat(port.style.top)} L${(e.clientX - box.left) / state.zoom},${(e.clientY - box.top) / state.zoom}`);
      } else {
        item.position = dragPosition(start, origin, pointer, state.zoom);
        renderGraph(true);
      }
    };
    const finish = (cancelled, e) => {
      if (e?.pointerId != null && e.pointerId !== pointerId) return;
      unlisten('pointermove', move); unlisten('pointerup', end); unlisten('pointercancel', cancel); window.removeEventListener('blur', cancel);
      editorGesture = null; capture.classList.remove('is-dragging');
      if (capture.hasPointerCapture(pointerId)) capture.releasePointerCapture(pointerId);
      if (!moved) return;
      suppressGestureClick = true; setTimeout(() => { suppressGestureClick = false; }, 0);
      if (port) {
        document.querySelector('.connection-preview')?.remove();
        if (cancelled) { cancelConnection(); return; }
        const destination = root.elementFromPoint(e.clientX, e.clientY)?.closest('.graph-port');
        if (destination && destination !== port) connectionPort(destination);
        else toast('Liaison en cours : choisissez une entrée ou appuyez sur Échap.');
      } else {
        if (cancelled) state.graph = before;
        else { state.history.push(before); state.dirty = true; state.selected = note ? state.selected : id; state.propertiesOpen = false; persistDraft(); }
        renderEditor(); focusGraphItem(id, note);
      }
    };
    const end = e => finish(false, e), cancel = e => finish(true, e);
    editorGesture = { cancel }; listen('pointermove', move); listen('pointerup', end); listen('pointercancel', cancel); window.addEventListener('blur', cancel);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (editorGesture || state.connectSource)) { event.preventDefault(); editorGesture?.cancel(); cancelConnection(); return; }
    if (state.mode !== 'design' || document.querySelector('.modal') || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    const card = event.target.closest('.node[data-id],.note-heading'); if (!card || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault(); const note = card.matches('.note-heading'), id = card.dataset.id, delta = event.shiftKey ? 50 : 10;
    flushNodeForm(); edit(graph => {
      const item = note ? graph.layout.notes.find(n => n.id === id) : graph.nodes.find(n => n.id === id);
      const position = item.position || nodePosition(item, graph.nodes.indexOf(item));
      item.position = dragPosition(position, { x: 0, y: 0 }, { x: event.key === 'ArrowLeft' ? -delta : event.key === 'ArrowRight' ? delta : 0, y: event.key === 'ArrowUp' ? -delta : event.key === 'ArrowDown' ? delta : 0 }, 1);
    }); focusGraphItem(id, note);
  });
}

function conversionDialog() {
  modal('Activer les données structurées', '<p>Cette conversion concerne le brouillon ouvert. Elle permet de décrire les éléments des listes, les données requises et les traitements par élément.</p><p>Les entrées historiques restent facultatives et les sorties restent requises. Les exécutions déjà lancées conservent leur contrat.</p>', button('close-modal','Conserver le format actuel') + button('confirm-conversion','Convertir ce brouillon','primary'));
}
function showPortForm(direction, name) {
  const node = selectedNode(), port = normalizedPort(node[direction]?.[name] || 'string', direction), modern = state.graph.schema === 2;
  if (!name && modern) port.required = true;
  modal(name ? 'Modifier une donnée' : 'Décrire une donnée', `<form id="port-form"><input type="hidden" name="direction" value="${direction}"><label>Nom (sans espaces)<input name="port" required pattern="[a-zA-Z][a-zA-Z0-9_.-]{0,79}" value="${esc(name || '')}" ${name?'readonly':''}></label><label>Type<select id="port-type" name="type">${options(Object.entries(typeNames),port.type)}</select></label>${modern ? `<label><input type="checkbox" name="required" ${port.required?'checked':''}>Donnée requise</label><p class="muted">Facultative signifie que la donnée peut être absente. Une liste vide est une donnée présente.</p><fieldset data-list-contract ${port.type!=='array'?'hidden':''}><legend>Éléments de la liste</legend><label for="port-items">Type des éléments</label><select id="port-items" name="items">${options(Object.entries(typeNames),port.items || 'any')}</select><label for="port-minimum">Minimum d’éléments</label><input id="port-minimum" name="minimum" type="number" min="0" step="1" value="${port.minItems ?? 0}"><label for="port-maximum">Maximum d’éléments (facultatif)</label><input id="port-maximum" name="maximum" type="number" min="0" step="1" value="${port.maxItems ?? ''}"></fieldset>` : '<p class="muted">Utilisez « Données structurées » dans l’éditeur pour préciser le type des éléments et leur présence.</p>'}<button class="primary">${name?'Enregistrer la donnée':'Ajouter la donnée'}</button></form>`);
}
function advancedNodeFields(node) {
  if (node.kind === 'input') return '<p class="notice">Ce bloc recueille plusieurs contributions. Leur confirmation transmet une liste unique, sans lancer un agent pour chaque intention.</p>';
  if (node.kind === 'integrate') return '<p class="notice">Le moteur rassemble les candidats acceptés sur une base identique. Les conflits restent visibles. Prévoyez ensuite une QA commune et une décision sur le candidat intégré.</p>';
  if (node.kind !== 'foreach') return '';
  return `<fieldset><legend>Traitement par élément</legend><label for="each-collection">Collection à traiter</label><select id="each-collection" name="collection">${options([['items','Liste reçue directement'],['plan.tasks','Tâches du plan unique'], ...!['items','plan.tasks'].includes(node.collection) ? [[node.collection, node.collection]] : []], node.collection || 'items')}</select><label for="each-concurrency">Travaux simultanés au maximum</label><select id="each-concurrency" name="concurrency">${options([1,2,3,4].map(n=>[String(n),n===1?'1 · séquentiel':String(n)]),String(node.concurrency || 1))}</select><p>Workflow par élément : <strong>${esc(typeof node.workflow === 'object' ? node.workflow.title : node.workflow || 'À choisir')}</strong></p>${button('choose-child','Choisir le workflow par élément…','','type="button"')}<small>Chaque élément garde son exécution. Les dépendances peuvent limiter le nombre réellement actif.</small></fieldset>`;
}
function workflowChoices() {
  return [...new Map([...state.workflows,...state.templates].filter(graph=>graph.id!==state.graph.id).map(graph=>[`${graph._project || state.project.id}:${graph.id}`,graph])).entries()];
}
function childChoiceFields(existing, action = false) {
  state.childChoiceExisting = existing;
  state.childChoices = workflowChoices();
  const work = existing?.nodes?.length === 1 ? existing.nodes[0] : null;
  return `<label for="child-choice">Workflow à utiliser</label><select id="child-choice" name="workflow_choice">${options([...(existing ? [['__current__',`Conserver : ${existing.title}`]] : []), ['__basic__',action?'Un document à préparer':'Un travail IA par élément'],...state.childChoices.map(([key,g])=>[key,g.title])],existing?'__current__':'__basic__')}</select><div data-basic-workflow ${existing?'hidden':''}><label for="child-work-title">Nom du travail</label><input id="child-work-title" name="work_title" value="${esc(work?.title || (action?'Préparer le brouillon':'Traiter un élément'))}"><label for="child-work-prompt">${action?'Contenu du document':'Consigne par élément'}</label><textarea id="child-work-prompt" name="work_prompt">${esc(action ? work?.content || 'Brouillon à relire avant toute publication.' : work?.prompt || 'Traiter uniquement l’élément reçu dans item. Produire un résultat documenté.')}</textarea></div><input name="child_action" type="hidden" value="${action?'yes':'no'}"><p class="muted">Une copie de cette version sera intégrée au bloc. Modifier le modèle ultérieurement ne changera pas ce workflow.</p><label><input name="convert_child" type="checkbox">Si le modèle est ancien, convertir sa copie au format structuré</label>`;
}
function childWorkflowForm() { modal('Workflow pour chaque élément', `<form id="child-workflow-form">${childChoiceFields(typeof selectedNode().workflow === 'object' ? selectedNode().workflow : null)}<button class="primary">Utiliser ce workflow</button></form>`); }
async function selectedChildWorkflow(data) {
  let graph;
  if (data.workflow_choice === '__current__') graph = clone(state.childChoiceExisting);
  else if (data.workflow_choice === '__basic__') {
    graph = basicChildWorkflow(data.work_title.trim() || 'Traiter un élément');
    if(data.child_action==='yes')graph.nodes=[{id:'draft',kind:'document',title:graph.title,content:data.work_prompt,outputs:{},validation:'human'}];
    else graph.nodes[0].prompt=data.work_prompt;
  } else {
    const chosen=state.childChoices.find(([key])=>key===data.workflow_choice)?.[1]; if(!chosen)throw new Error('Choisissez un workflow.');
    graph=chosen.summary || !chosen.nodes ? await call('workflow.get',{project:chosen._project || state.project.id,workflow:chosen.id}) : clone(chosen);
  }
  if(graph.schema===1){if(data.convert_child!=='on')throw new Error('Ce modèle utilise l’ancien format. Confirmez la conversion de sa copie.');graph=convertWorkflow(graph);}
  delete graph._project; delete graph.revision; delete graph.driver;
  if (data.child_action!=='yes' && graph.nodes.some(node=>node.kind==='foreach'))throw new Error('Choisissez un workflow sans traitement par élément imbriqué.');
  if (data.child_action==='yes' && graph.actions?.length)throw new Error('Une action facultative ne peut pas déclencher d’autres actions associées.');
  await call('workflow.validate',{graph,simulation:true}); return graph;
}
function associatedEditor(node) {
  if(state.graph.schema!==2)return '';
  const actions=(state.graph.actions || []).filter(action=>action.source===node.id);
  return `<section class="associated-editor"><h3>Actions facultatives</h3><p>Leur échec ne bloque pas le résultat principal. Chaque occurrence attend une activation explicite.</p>${actions.map(action=>`<p><strong>${esc(action.title)}</strong> · ${action.enabled?'proposée':'désactivée'} · ${action.event==='question'?'sur une question':'après résultat accepté'} ${button('edit-associated','Configurer','flat',`data-id="${esc(action.id)}"`)}</p>`).join('')}${button('add-associated','Ajouter une action facultative…')}</section>`;
}
function associatedForm(id) {
  const action=state.graph.actions?.find(a=>a.id===id), canQuestion=['question','agent','task','document'].includes(selectedNode().kind);
  const events=[['accepted','Résultat du bloc accepté'], ...(canQuestion ? [['question','Question ouverte par le bloc']] : action?.event==='question' ? [['question','Question — déclencheur incompatible, à reconfigurer']] : [])];
  modal(action?'Configurer l’action facultative':'Ajouter une action facultative',`<form id="associated-form"><input name="associated_id" type="hidden" value="${esc(id || '')}"><label for="associated-title">Nom de l’action</label><input id="associated-title" name="title" required maxlength="160" value="${esc(action?.title || '')}" placeholder="Préparer un email"><label>Déclencheur<select name="event">${options(events,action?.event || 'accepted')}</select></label><label><input name="enabled" type="checkbox" ${action?.enabled!==false?'checked':''}>Proposer cette action lorsqu’elle est déclenchée</label>${childChoiceFields(action?.workflow,true)}<p class="notice">Aucun envoi automatique : vous devrez activer l’action dans le suivi. Un document local, un brouillon distant et un envoi sont des opérations différentes.</p><button class="primary">Enregistrer l’action facultative</button></form>`,action?button('remove-associated','Supprimer cette action','danger',`data-id="${esc(id)}"`):'');
}
function updateConnectionCompatibility() {
  const form=document.querySelector('#connect-form');if(!form || !form.elements.output.value)return;
  const source=state.graph.nodes.find(n=>n.id===form.elements.from.value),target=state.graph.nodes.find(n=>n.id===form.elements.to.value),port=source.outputs[form.elements.output.value];
  const reasons=[];
  for(const option of form.elements.input.options){if(!option.value)continue;const reason=incompatibleReason(port,target.inputs[option.value],state.graph.schema);option.disabled=false;option.title=reason;if(reason)reasons.push(`${option.value} : ${reason}`);}
  form.querySelector('.mapping-summary').textContent=reasons.length?reasons.join(' '):'Choisissez l’entrée destinataire compatible.';
}
function validateSimulationPorts(node, values) {
  for(const [name,value] of Object.entries(values)){
    const port=normalizedPort(node.outputs[name]);if(port.type!=='array')continue;
    if(value.length<(port.minItems || 0) || value.length>(port.maxItems ?? Infinity))throw new Error(`${name} : respectez la taille prévue pour cette liste (${port.minItems || 0}…${port.maxItems ?? 'N'} éléments).`);
    if(port.items && port.items!=='any')for(const item of value){const type=Array.isArray(item)?'array':item===null?'null':typeof item;if(type!==port.items)throw new Error(`${name} : les éléments doivent être de type ${typeNames[port.items]}.`);}
  }
}
function collectionJobs(run, node) {
  try { return JSON.parse(localStorage.getItem(`tricorder-collection-jobs:${run}:${node}`) || '[]'); } catch { return []; }
}
function saveCollectionJob(job, remove=false) {
  const key=`tricorder-collection-jobs:${job.run}:${job.node}`,jobs=collectionJobs(job.run,job.node).filter(item=>item.id!==job.id);
  if(!remove)jobs.push(job);
  if(jobs.length)localStorage.setItem(key,JSON.stringify(jobs));else localStorage.removeItem(key);
}
function collectionRecoveryView(node) {
  const jobs=collectionJobs(state.run.id,node.id).filter(job=>!collectionInFlight.has(job.id));
  return jobs.length ? `<section class="collection-recovery notice"><h3>Ajouts à récupérer</h3><p>Ces textes n’ont pas de confirmation d’enregistrement. Vérifiez la liste, puis réessayez l’ajout ou retirez-le de cette liste de récupération.</p>${jobs.map(job=>`<article data-collection-job="${esc(job.id)}">${dataView('Intention conservée',job.text)}${job.error?`<p>${esc(job.error)}</p>`:''}<div class="row">${button('collection-retry-add','Réessayer cet ajout','','data-id="'+esc(job.id)+'"')}${button('collection-discard-add','Retirer de la récupération','flat','data-id="'+esc(job.id)+'"')}</div></article>`).join('')}</section>` : '';
}
async function changeCollection(operation, fields={}, submitted=null) {
  const run=submitted?.run || state.run.id,node=submitted?.node || state.selected;
  const current=submitted?.refresh || state.run?.id!==run ? (await call('run.get',{run})).run : state.run;
  const revision=current.nodes[node].collection.revision;
  const signature=JSON.stringify({run,node,operation,...fields}),previous=submitted?.id ? null : collectionDrafts.get(signature),request=submitted?.request || previous || {run,node,revision,operation,key:crypto.randomUUID(),...fields};
  if(submitted?.id){submitted.request=request;submitted.refresh=false;saveCollectionJob(submitted);}
  collectionDrafts.set(signature,request);
  try { const next=await call('collection.change',request);collectionDrafts.delete(signature);
    if(submitted?.id)saveCollectionJob(submitted,true);
    if(operation==='add' && submitted && localStorage.getItem(submitted.draftKey)===submitted.draft){
      const form=document.querySelector('#collection-form');
      if(form && interactionDraftKey(form)===submitted.draftKey){const field=form.elements.namedItem('text');if(field.value===fields.text)field.value='';}
      localStorage.removeItem(submitted.draftKey);
    }
    if(state.run?.id!==run)return;state.run=next;
    renderGraph();renderInspector();renderExecutionOverview();
  } catch(error){
    const conflict=error.message.includes('Le recueil a changé');
    if(submitted?.id){submitted.error=error.message;if(conflict){submitted.request=null;submitted.refresh=true;}saveCollectionJob(submitted);}
    if(conflict){collectionDrafts.delete(signature);const latest=await call('run.get',{run});if(state.run?.id===run)state.run=latest.run;}
    throw error;
  }
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
function conditionFields(node) {
  const boolean=(node.options || []).length===2 && node.options.includes('true') && node.options.includes('false');
  return `<p class="muted">Cette règle choisit une branche à partir de la donnée reçue.</p><label for="node-parameter">Donnée à comparer (entrée ou paramètre du workflow)</label><input id="node-parameter" name="parameter" value="${esc(node.parameter || '')}"><label for="condition-type">Type de branchement</label><select id="condition-type" name="condition_type">${options([['boolean','Oui / Non'],['values','Valeurs personnalisées']],boolean?'boolean':'values')}</select><p data-condition-boolean ${boolean?'':'hidden'}>Deux branches : <strong>Oui</strong> et <strong>Non</strong>. Reliez chacune à l’étape correspondante.</p><div data-condition-custom ${boolean?'hidden':''}><label for="node-options">Choix possibles (un par ligne)</label><textarea id="node-options" name="options">${esc((node.options || ['true','false']).join('\n'))}</textarea><small>Valeurs exactes produites par le bloc précédent. Pour comparer un montant, faites produire un résultat Oui / Non par ce bloc.</small></div>`;
}
function designInspector(node) {
  const isAgent = node.kind === 'agent';
  const hasInstructions = ['agent','task'].includes(node.kind);
  const effective = isAgent ? effectiveExecution(state.project, state.graph, node) : null;
  const profiles = [['generalist', 'Aucun agent dédié'], ...(state.project.packs || []).flatMap(pack => pack.profiles.map(profile => [profile.id, profile.title || profile.id]))];
  if (effective && !profiles.some(([id]) => id === effective.profile.value)) profiles.push([effective.profile.value, effective.profile.value + ' (pack absent)']);
  return `<form id="node-form"><label for="node-title">Nom du bloc</label><input id="node-title" name="title" value="${esc(node.title)}" required>${hasInstructions ? `<label for="node-prompt">Consigne</label><textarea id="node-prompt" name="prompt">${esc(node.prompt || "")}</textarea>` : ""}<label for="node-criteria">Critères d’acceptation (un par ligne)</label><textarea id="node-criteria" name="criteria">${esc((node.criteria || []).join("\n"))}</textarea>${node.validation==='automatic'?'<p class="muted criteria-help">Ces critères demandent une réception humaine. Choisissez « Manuelle » dans Validation du résultat, ou placez-les dans la Décision humaine qui réceptionne ce travail.</p>':''}${advancedNodeFields(node)}${portEditor(node)}${['agent','task','command','document','watch','communication','external'].includes(node.kind) ? button('simulation-data', 'Données de simulation…', 'flat', 'type="button"') : ''}${designGuidance(state.graph, node.id)}${['agent','task','command'].includes(node.kind) ? `<details ${node.candidate_check ? 'open' : ''}><summary>Contrôle de code (QA)</summary><fieldset><legend>Validation du candidat</legend><label><input type="checkbox" name="candidate_check" ${node.candidate_check ? 'checked' : ''}>Contrôle QA du candidat</label><small>Ce bloc vérifie le candidat reçu. L’entrée candidate est ajoutée ; reliez-la au producteur. ${node.kind==='command' ? 'La commande doit réussir (code 0) avec une preuve.' : 'La sortie verdict est ajoutée : pass ou fail, avec preuves réelles.'} Un document ou un simple transfert ne valide pas le code.</small></fieldset></details>` : ''}${isAgent ? `<label for="node-route-output">Sortie de branchement (facultatif)</label><select id="node-route-output" name="route_output">${options([['', 'Aucun branchement conditionnel'], ...Object.entries(node.outputs || {}).filter(([,t]) => portType(t) === 'string').map(([k]) => [k,k])], node.route_output || '')}</select>${node.route_output ? `<label>Valeurs de branchement (une par ligne)<textarea name="options">${esc(node.options.join('\n'))}</textarea></label>` : ''}<label>Validation du résultat<select name="validation">${options([['contract','Valider automatiquement les sorties'],['human','Attendre ma validation']], node.validation || 'human')}</select></label>` : ''}<details><summary>Organisation de l’étape</summary><label for="node-completion">Effet du résultat sur les tâches dépendantes</label><select id="node-completion" name="completion_outcome">${options([['succeeded', 'Permettre la suite'], ['blocked', 'Bloquer la suite : travail non résolu']], node.completion_outcome || 'succeeded')}</select><label for="node-phase">Phase</label><input id="node-phase" name="phase" value="${esc(node.phase || '')}" placeholder="Analyse, qualité…"></details>
    ${(node.profile || state.graph.defaults?.profile || state.project.defaults?.profile) === 'odoo-tester' || Object.hasOwn(node, 'environment') ? `<label for="node-environment">Environnement de recette de cette étape</label><select id="node-environment" name="environment">${options([['', 'Utiliser le contexte du workflow'], ['local', 'Copie locale neutralisée'], ['staging', 'Staging (non admis pour cette recette)'], ['production', 'Production (non admise pour les tests)']], node.environment || '')}</select>` : ''}
    ${['task','document'].includes(node.kind) ? `<label for="node-effort">Effort IA de cette étape</label><select id="node-effort" name="effort">${options([['', 'Utiliser le niveau de la conversation'], ...['low','medium','high','xhigh'].map(v => [v,v])], node.effort || '')}</select>` : ''}
    ${node.kind === 'watch' ? `<label for="watch-connection">Messagerie</label><select name="connection" id="watch-connection">${options([['gmail', 'Gmail'], ['outlook', 'Outlook']], node.connection || 'gmail')}</select><label for="watch-account">Compte à surveiller (référence, sans secret)</label><input name="account" id="watch-account" value="${esc(node.account || '')}"><label for="watch-sender">Adresse exacte de l'expéditeur</label><input name="sender" id="watch-sender" type="email" value="${esc(node.sender || '')}" placeholder="contact@exemple.test"><p class="muted">Nouveaux messages seulement. Le nom d'affichage ne suffit pas à identifier un expéditeur.</p>` : ''}
    ${node.kind === 'communication' ? `<label for="communication-channel">Canal de communication</label><select name="channel" id="communication-channel">${options([['slack', 'Slack'], ['telegram', 'Telegram'], ['signal', 'Signal'], ['email', 'Email'], ...state.capabilities.filter(c => c.plugin_id).map(c => [c.plugin_id, c.title])], node.channel || 'slack')}</select><label for="communication-recipient">Canal ou destinataire exact</label><input name="recipient" id="communication-recipient" value="${esc(node.recipient || '')}" placeholder="Identifiant du destinataire"><label for="communication-template">Message à envoyer</label><textarea name="template" id="communication-template">${esc(node.template || 'Nouveau message de {sender} : {subject}')}</textarea><p class="muted">Le modèle IA est facultatif. Une notification déterministe n'en utilise pas. Le connecteur doit être configuré et vérifié avant activation.</p>` : ''}
    ${['task', 'agent', 'communication', 'watch', 'external', 'document'].includes(node.kind) ? `<details><summary>Outils et plugins de cette étape</summary><label for="node-capabilities">Capacités de plugins${node.kind === 'communication' ? ' (requises pour l’envoi)' : ' (facultatives)'}</label><select id="node-capabilities" name="capabilities"><option value="">Aucune</option>${[...new Map([...state.capabilities.filter(c => c.plugin_id).flatMap(c => c.operations.map(op => [JSON.stringify({ plugin: c.plugin_id, operation: op }), `${c.title} · ${op}`])), ...(node.capabilities || []).map(b => [JSON.stringify(b), `${b.plugin} · ${b.operation}`])]).entries()].map(([value, title]) => `<option value="${esc(value)}" ${(node.capabilities || []).some(b => JSON.stringify(b) === value) ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select><small>${node.kind === 'communication' ? 'Un plugin de notification compatible et vérifié est nécessaire pour envoyer ce message. L’autorisation d’envoi sera demandée au lancement. ' : ''}Catalogue : .tricorder/plugins.json · aucune dépendance à un agent dédié.</small>${button('refresh-connections', 'Actualiser les outils', 'flat')}<p class="muted">${state.capabilities.filter(c => c.plugin_id).map(c => esc(c.title) + ' : ' + esc(c.operations.join(', '))).join(' · ') || 'Aucun plugin déclaré dans ce dépôt.'}</p></details>` : ''}
    ${isAgent ? `<p class="notice">${esc(effective.provider.value === "claude" ? "Anthropic · Claude" : "OpenAI · Codex")} · ${esc(effective.model.value || "modèle à choisir")}</p>${button("workflow-ai", "Choisir l’IA pour tout le workflow", "flat")}<details><summary>Agent et modèle pour cette étape</summary><label for="node-required-capabilities">Capacités nécessaires (une par ligne : text, read, edit, shell, native-tools)</label><textarea id="node-required-capabilities" name="required_capabilities">${esc((node.required_capabilities || []).join('\n'))}</textarea><label for="node-execution-mode">Travail du modèle</label><select id="node-execution-mode" name="execution_mode">${options([["text", "Analyse ou rédaction"], ["edit", "Modification de code dans une copie isolée"]], node.execution_mode || "text")}</select><p class="muted">Les modifications sont présentées avant application au dépôt. Reliez la sortie candidate à un bloc Commande pour tester cette copie.</p><label for="node-profile">Agent dédié (facultatif)</label><select id="node-profile" name="profile">${options(profiles, effective.profile.value)}</select><p class="muted">Sans agent dédié, le modèle suit directement la consigne du bloc. Un profil spécialisé ajoute les instructions du pack.</p><label for="node-provider">Fournisseur</label><select id="node-provider" name="provider">${options([['codex', 'OpenAI · Codex'], ['claude', 'Anthropic · Claude']], effective.provider.value)}</select><label for="node-model">Modèle IA</label><input id="node-model" name="model" value="${esc(effective.model.value)}" placeholder="Identifiant exact du modèle"><small>Valeur effective : ${esc(effective.model.value || 'non définie')} · ${effective.model.source}. Aucun repli automatique.</small><details><summary>Effort et mode d'exécution</summary><label for="node-effort">Effort</label><select name="effort" id="node-effort">${options(['low', 'medium', 'high', 'xhigh'].map(v => [v, v]), effective.effort.value)}</select><small>Effort de la conversation : ${esc(state.graph.defaults?.effort || 'medium')}. Les étapes exécutées dans cette session doivent utiliser le même niveau.</small><label for="node-session">Session</label><select id="node-session" name="session">${options([['delegated', 'Session déléguée'], ['main', 'Session principale (à qualifier)']], effective.session.value)}</select><p class="muted">Le choix est enregistré. Le connecteur vérifiera les capacités réelles avant tout lancement.</p></details></details>` : ''}
    ${['decision', 'review', 'question'].includes(node.kind) ? `<label for="node-question">Question à poser</label><textarea id="node-question" name="question">${esc(node.question || '')}</textarea><label for="node-options">Choix possibles (un par ligne)</label><textarea id="node-options" name="options">${esc((node.options || ['approve', 'reject']).join('\n'))}</textarea><p class="muted">Une attente humaine persiste après fermeture. Le silence n'autorise rien.</p>` : ''}
    ${node.kind === 'command' ? `<label for="node-argv">Commande et arguments (un par ligne)</label><textarea id="node-argv" name="argv" spellcheck="false">${esc((node.argv || []).join('\n'))}</textarea><label for="node-timeout">Délai maximal (secondes)</label><input type="number" min="1" max="3600" id="node-timeout" name="timeout" value="${node.timeout || 60}"><p class="muted">Sans shell ni réseau. Projet monté en lecture seule dans /project ; travail dans /work.</p>` : ''}
    ${node.kind === 'document' ? `<label for="node-content">Contenu du brouillon</label><textarea id="node-content" name="content">${esc(node.content || '')}</textarea><small>Préparation locale. La publication demande une opération et un accord distincts.</small>` : ''}
    ${node.kind === 'condition' ? conditionFields(node) : ''}
    ${node.kind === 'subworkflow' ? `<p>Les ports de même nom sont reliés aux blocs d’entrée et de sortie du composant. Décrivez les autres correspondances ci-dessous.</p><details><summary>Correspondances du composant</summary><label>Entrées publiques → blocs (JSON)<textarea name="input_mapping">${esc(JSON.stringify(node.input_mapping || {},null,2))}</textarea></label><label>Sorties publiques ← blocs (JSON)<textarea name="output_mapping">${esc(JSON.stringify(node.output_mapping || {},null,2))}</textarea></label><small>Exemple : {"demande": {"node": "analyse", "port": "request"}}</small></details><label for="node-workflow">Composant de bibliothèque</label><select id="node-workflow" name="workflow">${options(state.templates.map(g => [g.id, g.title]), node.workflow)}</select>` : ''}
    ${['decision', 'external'].includes(node.kind) ? `<fieldset><legend>Opération externe exacte</legend><label for="op-action">Action</label><input id="op-action" name="op_action" value="${esc(operationField(node.operation?.action))}" placeholder="publish-candidate"><label for="op-target">Cible</label><input id="op-target" name="op_target" value="${esc(operationField(node.operation?.target))}" placeholder="Dépôt et branche de production"><label for="op-candidate">Candidat ou version exacte</label><input id="op-candidate" name="op_candidate" value="${esc(operationField(node.operation?.candidate))}" placeholder="SHA du candidat testé">${node.kind === 'external' ? `<label for="node-approval">Décision humaine qui autorisera cette opération</label><select id="node-approval" name="approval">${options([['','Choisir une décision'], ...state.graph.nodes.filter(n => n.kind === 'decision').map(n => [n.id,n.title])], node.approval || '')}</select><label><input type="checkbox" name="link_operation">Relier cette décision et y copier l’opération exacte</label>` : ''}<small>Utilisez @nom_entree pour une cible ou un candidat produit en amont. Les données reliées seront affichées dans la proposition exacte avant l’accord.</small><details><summary>Paramètres supplémentaires du connecteur</summary><label for="node-operation">Paramètres complets (JSON)</label><textarea id="node-operation" name="operation">${esc(JSON.stringify(node.operation || {}, null, 2))}</textarea></details></fieldset>` : ''}
    ${['command', 'document', 'watch', 'communication'].includes(node.kind) ? `<label for="node-validation">Validation du résultat</label><select id="node-validation" name="validation">${options([['human', node.kind === 'communication' ? 'Manuelle — après opération' : 'Manuelle'], ['automatic', 'Automatique — contrôles techniques']], node.validation || 'human')}</select><p class="muted">${node.kind === 'communication' ? 'La validation manuelle examine le résultat après l’envoi ou l’opération du connecteur. Pour relire avant envoi, préparez le contenu dans un bloc Document ou Agent, puis placez une Décision humaine avant ce bloc Communication. ' : ''}La validation automatique vérifie succès, types et preuves. Elle exige une liste de critères métier vide.${node.kind === 'communication' ? '' : ' Ajoutez une Décision humaine pour confirmer une action.'}</p>` : ''}
    ${['command', 'document'].includes(node.kind) ? `<label><input type="checkbox" name="reuse" ${node.reuse ? 'checked' : ''}>Autoriser la réutilisation des preuves pendant 24 h</label><small>Uniquement si le bloc, ses dépendances et ses fichiers sont inchangés. Désactiver pour les contrôles dépendant de l’heure ou d’un état extérieur.</small>` : ''}
    <details><summary>Entrées et sorties</summary><label for="node-inputs">Entrées (nom : type, JSON)</label><textarea id="node-inputs" name="inputs">${esc(JSON.stringify(node.inputs || {}, null, 2))}</textarea><label for="node-outputs">Sorties (nom : type, JSON)</label><textarea id="node-outputs" name="outputs">${esc(JSON.stringify(node.outputs || {}, null, 2))}</textarea></details>${["communication", "external"].includes(node.kind) ? `<label for="node-reconciliation">Capacité de recherche d’accusé (lecture, facultative)</label><input id="node-reconciliation" name="reconciliation" value="${esc(node.reconciliation || "")}">` : ""}<details><summary>Reprises, ressources et position</summary><label for="node-attempts">Tentatives maximales</label><input id="node-attempts" name="max_attempts" type="number" min="1" max="10" value="${node.max_attempts || 1}"><label for="node-resources">Ressources exclusives (une par ligne)</label><textarea name="resources" id="node-resources">${esc((node.resources || []).join('\n'))}</textarea><div class="row"><div class="fill"><label for="node-x">Position X</label><input type="number" min="0" max="20000" name="x" id="node-x" value="${nodePosition(node, state.graph.nodes.indexOf(node)).x}"></div><div class="fill"><label for="node-y">Position Y</label><input type="number" min="0" max="20000" name="y" id="node-y" value="${nodePosition(node, state.graph.nodes.indexOf(node)).y}"></div></div></details><div class="row" style="margin-top:22px"><button class="primary" type="submit">Appliquer au bloc</button></div></form>
    <details class="design-links"><summary>Liens entre les blocs</summary>${state.graph.edges.filter(e => e.from === node.id || e.to === node.id).map(e => `<p class="muted">${esc(state.graph.nodes.find(n => n.id === e.from)?.title || e.from)} → ${esc(state.graph.nodes.find(n => n.id === e.to)?.title || e.to)} · ${esc(e.outcome && e.outcome !== 'done' ? decisionLabel(e.outcome) : 'Travail terminé')}${Object.entries(e.mapping || {}).length ? `<br><span>Données : ${Object.entries(e.mapping).map(([from,to]) => `${esc(from)} → ${esc(to)}`).join(', ')}</span>` : '<br><span>Ordre d’exécution uniquement · aucune donnée transmise</span>'} ${button('delete-edge', 'Retirer', 'flat', `data-id="${e.id}"`)}</p>`).join('') || '<p class="muted">Aucun lien.</p>'}${button('connect-input', 'Relier une entrée…', 'flat', `data-id="${esc(node.id)}"`)}</details><hr>${associatedEditor(node)}${button('delete-node', 'Supprimer cette étape', 'danger')}`;
}

function shortQuestionContext(inputs) {
  if(!inputs || inputs.$artifact)return '';
  const values=[];let length=0;
  for(const [key,value] of Object.entries(inputs)) {
    if(!['string','number','boolean'].includes(typeof value))continue;
    const text=String(value).trim();
    // Show complete short facts only. Long requests and source references stay
    // in the full context below, rather than pushing the answer out of view.
    if(!text || text.length>240 || text.split('\n').length>2 || length+key.length+text.length>320)continue;
    values.push([key,value]);length+=key.length+text.length;if(values.length===3)break;
  }
  return values.length ? `<section class="question-preview" aria-label="À examiner avant de répondre" tabindex="0"><strong>À examiner avant de répondre</strong>${values.map(([key,value])=>`<p><b>${esc(key.replaceAll('_',' '))} :</b> <span class="business-text">${esc(typeof value==='boolean'?value?'Oui':'Non':value)}</span></p>`).join('')}</section>` : '';
}

function runInspector(node) {
  const sourceLabel=key=>({minutes:'Compte rendu',actions:'Actions',transcript:'Transcription'}[key] || key);
  const pendingQuestion = state.run.nodes[node.id].question;
  const values = state.run.nodes[node.id];
  const requestText=state.run.parameters?.request;
  const sourceNames=typeof requestText==='string' ? [...requestText.matchAll(/(?:^|\n)(?:Original|Source[^:]*|Pièces[^:]*)\s*:\s*([^\n]+)/g)].map(m=>m[1].split('/').at(-1)).slice(0,3) : [];
  const received = dataView('Entrées reçues', values.inputs) + (values.input_sources && Object.keys(values.input_sources).length && !values.input_sources.$artifact ? `<p class="muted">Sources : ${Object.entries(values.input_sources).map(([key, source]) => `${esc(sourceLabel(key))} ← ${button('select-node', esc(state.run.definition.nodes.find(n=>n.id===source.node)?.title || source.node), 'flat', `data-id="${esc(source.node)}"`)}`).join(' · ')}</p>` : '') + (values.input_sources?.$artifact ? dataView('Sources des entrées',values.input_sources) : '') + dataView('Résultat', values.result?.outputs) + evidenceView(values) + attemptHistoryView(values,node);
  if (node.kind === 'input' && values.status === 'collecting') return collectionView(node, values, state.run.status === 'cancelled');
  if (node.kind === 'foreach') return coordinationView(state.iterationPage?.run === state.run.id && state.iterationPage.node === node.id ? state.iterationPage : state.run.coordination?.[node.id], node, state.run, state.projects) + received;
  if(['cancelled','paused'].includes(state.run.status)) return `${state.run.status==='cancelled' ? '<p class="notice"><strong>Exécution annulée</strong></p><p>Les résultats sont conservés en lecture seule. Cette exécution ne reprendra pas.</p>' : executionEmptyDetail()}${pendingQuestion ? dataView('Question conservée',{question:pendingQuestion.text,answer:null}) : ''}${values.result?.summary ? dataView('Dernier résultat',values.result.summary) : ''}${received}`;
  if (state.run.nodes[node.id].status === 'waiting_input') return `${pendingQuestion.text?.$artifact ? dataView('Question',pendingQuestion.text) : `<p>${esc(pendingQuestion.text)}</p>`}${pendingQuestion.notification?.run ? button('notification-run', 'Suivre la notification', '', `data-id="${esc(pendingQuestion.notification.run)}"`) : pendingQuestion.notification?.status === 'blocked' ? `<p class="notice">Notification bloquée : ${esc(pendingQuestion.notification.reason)}</p>` : ''}${shortQuestionContext(values.inputs)}${received ? `<details class="question-context"><summary>${sourceNames.length ? 'Sources référencées : '+esc(sourceNames.join(', ')) : 'Entrées et sources de la demande'}</summary>${received}</details>` : ''}<p class="muted question-help">Répondez dans le terminal ou ici.</p><form id="question-form"><label>Votre réponse<textarea id="question-answer" name="answer" required></textarea></label><button class="primary">Répondre</button></form>`;
  const data = state.run.nodes[node.id]; if (!data) return '';
  if (failedResult(data, node) && !['accepted','skipped'].includes(data.status)) {
    const reason=(data.result?.ok===false && data.result?.summary) || data.validation_error || data.result?.summary || data.reason || 'Le résultat ne satisfait pas le contrôle demandé.';
    const canRetry=data.status==='returned' && node.kind!=='external' && !data.result?.effect_id && data.attempt<(node.max_attempts || 1);
    return `<section class="failure-summary"><strong>Cette étape a échoué</strong><p class="attempt-budget">${esc(attemptBudget(data,node))}</p>${reason?.$artifact ? dataView('Cause',reason) : `<p>${esc(readableFailure(reason))}</p>${readableFailure(reason)!==reason?`<details><summary>Diagnostic technique</summary><p>${esc(reason)}</p></details>`:''}`}${node.kind==='command' && data.result?.preview ? `<section class="command-failure-output">${dataView('Sortie de la commande',data.result.preview)}${evidenceView(data)}</section>` : ''}</section><div class="failure-actions">${data.result?.effect_id ? button('reconcile-effect','Rechercher l’accusé distant','primary') : ''}${canRetry ? button('retry',retryRunsAutomatically(node)?'Relancer cette étape…':'Préparer la reprise','primary') : node.kind!=='external' && !data.result?.effect_id && !data.effect_uncertain ? button('new-request','Choisir un workflow adapté') : ''}${['agent','task','document'].includes(node.kind) && !data.result?.effect_id && !data.effect_uncertain ? button('configure-execution','Configurer un nouveau lancement…','',`data-id="${esc(state.run.id)}"`) : ''}${state.conversation ? button('conversation-terminal','Retrouver la conversation') : ''}</div><p class="muted">${esc(retryGuidance(data,node))}</p>${node.execution_mode==='edit' && typeof reason==='string' && reason.includes('aucune modification de fichier') ? '<p class="notice">Ce bloc exige des modifications de code. Une collecte de sources, une analyse ou une coordination doit utiliser un workflow adapté à ce travail. Les demandes de correction restent suivies séparément dans la vue d’ensemble.</p>' : ''}${data.validation_error && data.validation_error!==reason ? (data.validation_error?.$artifact ? dataView('Contrôle',data.validation_error) : `<p class="muted">${esc(data.validation_error)}</p>`) : ''}<details class="result-context"><summary>Entrées, résultat technique et historique</summary>${received}</details>`;
  }
  let html = `<p>${nodeBadge(data,node)}</p>`;
  const requestTitle=requestHeading(state.run.parameters?.request, state.conversation?.items.find(i=>i.run===state.run.id)?.request, state.run.definition.title);
  const scope=`<p class="interaction-scope"><strong>${esc(requestTitle)}</strong><span>Cette proposition · tentative ${esc(data.attempt || 1)} uniquement.</span></p>`;
  if(data.status==='waiting') html += `<p class="decision-scope">Décision pour cette demande : ${esc(requestTitle)}.</p>`;

  const operation=data.operation || node.operation;
  if (data.status === 'waiting') {
    html += `<div class="notice amber"><strong>Votre décision est attendue</strong><p>${esc(node.question || 'Examiner le résultat avant la suite.')}</p>${operation?.$artifact ? dataView('Contenu exact de l’opération',operation) : operation ? `<p>Action : <strong>${esc(operation.action)}</strong><br>Cible : <strong>${esc(operation.target)}</strong><br>Candidat : <code>${esc(operation.candidate)}</code></p><details open><summary>Contenu exact de l’opération</summary><pre>${esc(JSON.stringify(operation, null, 2))}</pre></details>` : ''}</div>${received}${(node.options || ['approve','reject']).includes('reject') && !state.run.definition.edges.some(edge=>edge.from===node.id && edge.outcome==='reject') ? '<p class="decision-consequence">Refuser la suite empêche les étapes liées à l’approbation de démarrer. Ce refus ne demande pas de révision : pour une autre proposition, créez une nouvelle demande.</p>' : ''}<form id="decision-form"><label for="decision-note">Commentaire (facultatif)</label><textarea id="decision-note" name="note"></textarea><div class="interaction-actions">${scope}<div class="row">${(node.options || ['approve', 'reject']).map(o => `<button id="decision-outcome-${esc(o)}" type="submit" name="outcome" value="${esc(o)}" class="${o === 'approve' ? 'primary' : ''}">${o === 'approve' ? operation ? 'Autoriser cette opération' : 'Approuver la suite' : o === 'reject' ? 'Refuser la suite' : esc(o)}</button>`).join('')}</div></div></form>`;
  }
  if (data.result) {
    html += `${data.result.summary?.$artifact ? dataView('Compte rendu',data.result.summary) : `<p>${esc(data.result.summary)}</p>`}${data.result.preview?.$artifact ? dataView('Aperçu complet',data.result.preview) : data.result.preview ? `<pre>${esc(data.result.preview)}</pre>` : ''}${data.result.simulated ? '<p class="notice amber">Preuve simulée, sans valeur de test métier réel.</p>' : ''}`;
    if (data.result.effect_id) html += button('reconcile-effect', 'Rechercher l’accusé distant');
    if ((data.result.outputs?.candidate || data.result.patch) && !data.result.simulated) html += button('preview-candidate', data.applied_candidate ? 'Voir le code appliqué' : 'Examiner les modifications');
    if (data.status === 'returned') html += `<form id="receipt-form"><h3>Examiner le résultat</h3>${(node.criteria || []).map((c, i) => `<label><input type="checkbox" name="criterion" value="${i}" required>${esc(c)}</label>`).join('')}<label for="receipt-note">Commentaire de validation (${node.criteria?.length ? 'obligatoire' : 'facultatif'})</label><textarea id="receipt-note" name="note" ${node.criteria?.length ? 'required' : ''} placeholder="Ce que vous avez vérifié…"></textarea><div class="interaction-actions">${scope}<div class="row"><button id="receipt-submit" type="submit" class="primary" ${data.result.ok ? '' : 'disabled'}>Valider le résultat</button>${node.kind !== 'external' && data.attempt < (node.max_attempts || 1) ? button('retry', 'Demander une reprise') : ''}</div></div></form>`;
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
      const native=state.conversation && (readiness.status==='native' || readiness.native_available);
      html += `<section class="notice launch-readiness"><strong>${esc(native ? agentStopped()?'Agent arrêté':'À traiter dans la conversation' : readiness.label)}</strong><p>${esc(native ? agentStopped()?'Reprenez l’agent pour traiter cette étape.':'Cette étape peut être traitée par l’agent de la conversation.' : readiness.reason)}</p>${native ? button(agentStopped()?'resume-agent':'conversation-terminal',agentStopped()?'Reprendre l’agent…':'Continuer dans la conversation','primary') : ''}${readiness.status==='configuration' ? (native?'<details><summary>Agent de bloc séparé (facultatif)</summary><p>'+esc(readiness.reason)+'</p>':'')+button('configure-execution','Configurer un nouveau lancement…','',`data-id="${esc(state.run.id)}"`)+(native?'</details>':'') : ''}</section>`;
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
  parentViews.length=0;viewEpoch++;
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
  content(`<section class="page">${workflowNavigation('global')}<div class="page-heading"><div><h1>Mes workflows</h1><p>Choisissez un workflow pour démarrer une demande, ou ouvrez-le pour modifier ses étapes.</p></div><div class="row">${button('new-request','Nouvelle demande','primary')}${button('new-work','Créer un workflow')}${button('import-workflow','Importer un workflow')}</div></div><div class="row">${button('workflow-archives',state.showWorkflowArchives?'Masquer les archives':'Voir les archives','flat')}</div><label class="sr-only" for="workflow-search">Rechercher un workflow</label><input id="workflow-search" type="search" placeholder="Rechercher par nom ou projet…"><div class="workflow-list catalog-workflows">${choices.map(c=>`<article class="workflow-row" data-catalog-text="${esc((c.graph.title+' '+c.project.title).toLocaleLowerCase('fr'))}"><div><h3>${esc(c.graph.title)}${c.graph.archived ? ' <span class="pill">Archivé</span>' : ''}</h3><p>${esc(c.project.title)} · ${c.graph.node_count || c.graph.nodes.length} étapes</p></div><div class="row">${button('run-workflow','Exécuter…','primary',`data-project="${c.project.id}" data-id="${c.graph.id}"`)}${button('open-workflow','Ouvrir le workflow','',`data-project="${c.project.id}" data-id="${c.graph.id}"`)}<details class="compact-menu"><summary aria-label="Options de ${esc(c.graph.title)}">⋯</summary><div>${button('archive-item',c.graph.archived?'Restaurer':'Archiver','flat',`data-project="${c.project.id}" data-kind="workflow" data-id="${c.graph.id}" data-archived="${!!c.graph.archived}"`)}</div></details></div></article>`).join('') || `<div class="empty-workflows"><p>Aucun workflow enregistré. Choisissez un modèle ou dessinez votre premier workflow.</p>${button('library-project','Choisir un modèle')}</div>`}</div><p id="workflow-search-empty" class="notice" hidden>Aucun workflow ne correspond à cette recherche.</p></section>`);
  document.querySelector('#workflow-search').addEventListener('input',event=>{const query=event.target.value.trim().toLocaleLowerCase('fr');let shown=0;document.querySelectorAll('[data-catalog-text]').forEach(row=>{row.hidden=!row.dataset.catalogText.includes(query);if(!row.hidden)shown++;});document.querySelector('#workflow-search-empty').hidden=shown>0;});
}
function workflowNavigation(active) {
  return `<nav class="catalog-tabs" aria-label="Bibliothèque de workflows">${button('navigate','Mes workflows',active==='global'?'active':'','data-route="global"')}${button('navigate','Modèles',active==='library'?'active':'','data-route="library"')}</nav>`;
}
function prepareWork(templateId) {
  state.workModels = [{schema:1,id:'__blank__',title:'Nouveau workflow',nodes:[{id:'start',kind:'task',title:'Première étape',position:{x:60,y:80}}],edges:[]}, ...(state.project?.library ? [] : state.workflows).filter(g => !state.templates.some(t => t.id === g.id)), ...state.templates];
  const selected = state.workModels.find(g => g.id === templateId) || state.workModels[0];
  const destination = state.project && !state.project.library ? state.project.id : 'workspace';
  modal('Créer un workflow', `<form id="new-work-form"><p>Partez d’une première tâche ou d’un modèle. Configurez les blocs dans l’éditeur. Vos demandes seront données au lancement ou dans le terminal.</p><label for="work-template">Modèle de workflow</label><select id="work-template" name="template">${options(state.workModels.map(g => [g.id, g.id==='__blank__' ? 'Workflow simple — première tâche' : (state.workflows.some(w => w.id === g.id) ? 'Projet · ' : '') + g.title]), selected.id)}</select><label for="work-title">Nom du workflow</label><input id="work-title" name="title" required maxlength="160" value="${esc(selected.title)}"><label for="work-project">Enregistrer dans</label><select id="work-project" name="project">${options([['workspace', 'Sans projet'], ...state.projects.map(p => [p.id, p.title])], destination)}</select><p class="muted">Le workflow sera enregistré dans .tricorder/workflows/ du dossier choisi, prêt à versionner avec Git. Le lancement vient ensuite ; aucun commit ni envoi automatique.</p><div class="modal-actions"><button class="primary" type="submit">Créer et ouvrir le workflow</button></div></form>`);
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
  Object.assign(state, { graph: clone(graph), savedRevision: graph.revision || 0, run: null, selected: null, mode: 'design', route: 'workflow', dirty: false, history: new History(), events: [], zoom: 1 });
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
async function openRun(id, stillCurrent = null, preserveParent = false) {
  if(!preserveParent)parentViews.length=0;
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
  viewport.scrollTop=Math.max(0,node.offsetHeight*state.zoom>viewport.clientHeight-32 ? node.offsetTop*state.zoom-12 : (node.offsetTop+node.offsetHeight/2)*state.zoom-viewport.clientHeight/2);
}
function dataView(label, values) { return businessDataView(label,values,{button,projects:state.projects}); }
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
  'resume-agent'() {
    const c=state.conversation, closed=integration.terminalClosed?.(c.id), shell=state.projects.find(p=>p.id===c.project) || c.project_contexts?.find(p=>p.id===c.project), shown=state.projects.find(p=>p.id===state.run?.project);
    modal('Reprendre l’agent de cette conversation',`<p>Vos demandes, réponses et résultats sont conservés. L’agent pourra continuer le travail dans cette conversation.</p><p class="resume-project-scope"><strong>Projet du terminal à son ouverture : ${esc(projectTitle(shell) || 'projet de la conversation')}</strong>${shown && shown.id!==c.project ? `<br>Demande affichée : ${esc(projectTitle(shown))}` : ''}. Le dossier courant du shell peut avoir changé.</p><p>${manuallyPaused(state.run)?'Cette demande restera suspendue. Utilisez « Reprendre la demande » pour poursuivre son exécution.':'Cette reprise conserve les suspensions et les dépendances entre demandes.'}</p><p class="notice amber">${closed ? 'Le terminal précédent est fermé. Un nouveau terminal sera ouvert et l’agent sera lancé uniquement après votre confirmation.' : 'La reprise se fait uniquement si le terminal est au prompt du shell. Elle efface sa ligne de saisie en cours. Si ce terminal a été fermé entre-temps, un nouveau terminal sera ouvert après confirmation.'}</p><details><summary>Détails de la session fournisseur</summary><p>La session fournisseur est reprise si son identifiant est connu ; sinon un nouvel agent relit les demandes et résultats conservés, sans créer une seconde conversation Tricorder.</p></details>`,button('close-modal','Revenir')+button('confirm-resume-agent',closed?'Ouvrir un terminal et reprendre':'Reprendre dans ce terminal','primary'));
  },
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
  async 'workflow-file'() {
    const files = await call('workflow.repository', { project: state.project.id });
    const file = files.find(item => item.id === state.graph.id);
    if (!file) {
      modal('Fichier JSON du workflow', '<p>Aucun fichier enregistré pour ce workflow. Enregistrez-le avant de consulter son emplacement.</p>');
      return;
    }
    const path = state.project.path.replace(/\/$/, '') + '/' + file.file;
    modal('Fichier JSON du workflow', `<label for="workflow-file-path">Chemin du fichier enregistré</label><input id="workflow-file-path" readonly value="${esc(path)}"><p>${state.dirty ? 'Le brouillon contient des modifications non enregistrées. ' : ''}Ce fichier contient la définition du workflow. Après une modification dans le terminal, utilisez Éditeur → Recharger et valider.</p>${file.error ? `<p class="notice">${esc(file.error)}</p>` : ''}`);
  },
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
  async 'activity-resume-agent'(el) { await actions['activity-run'](el);if(state.conversation && conversationReady(state.run))actions['resume-agent'](); },
  async 'open-conversation-resume'(el) { await actions['open-conversation'](el);if(state.conversation)actions['resume-agent'](); },
  async 'handoff-source'(el) { if(state.dirty)await save();state.conversationScope='request';await openRun(el.dataset.id); },
  async navigate(el) { viewEpoch++; if (state.dirty) { await save(); } if (el.dataset.route === 'global') { Object.assign(state, await call('workspace.get'));state.catalogChoices=(await loadWorkflowChoices()).choices;state.route='catalog'; } else { state.route = el.dataset.route; if (state.route === 'overview') Object.assign(state, await readActivity(state.activity?.offset || 0)); if (state.route === 'schedules') state.schedules = await call('schedule.list'); } shell(); },
  theme() { const dark = document.documentElement.dataset.theme === 'dark'; document.documentElement.dataset.theme = dark ? 'light' : 'dark'; localStorage.setItem('tricorder-theme', dark ? 'light' : 'dark'); },
  'new-project'() { modal('Créer un projet', '<form id="project-form"><label for="new-project-title">Nom du projet</label><input id="new-project-title" name="title" required placeholder="Mon projet"><label for="project-location">Emplacement</label><select id="project-location" name="location"><option value="managed">Nouvel espace local</option><option value="repository">Dépôt Git existant</option></select><p data-managed-project>Tricorder crée un dossier local pour vos workflows et résultats, avec un dépôt Git initialisé. Aucun commit ni envoi distant.</p><div data-repository-project hidden><label for="project-path">Racine du dépôt Git local</label><div class="row"><input id="project-path" name="path" disabled placeholder="Choisir ou coller le chemin du dépôt"><button type="button" data-action="choose-folder">Choisir…</button></div><p class="muted">Choisissez ou collez le chemin absolu de la racine du dépôt Git. Le dossier sera vérifié avant création. Aucun commit ni envoi distant.</p></div><div class="modal-actions"><button class="primary" type="submit">Créer le projet</button></div></form>'); },
  async 'choose-folder'() { const path = await api.folder(); if (path) document.querySelector('#project-path').value = path; },
  async 'try-example'() { const existing = state.projects.find(p => p.managed && p.title === 'Mon premier projet'); if (existing) await openProject(existing.id, false); else { state.project = await call('project.create', { title: 'Mon premier projet' }); state.projects.push(state.project); state.workflows = []; state.runs = []; } await useTemplate('first-workflow'); },
  'open-project': el => openProject(el.dataset.id),
  async 'open-workflow'(el) {const project=el.dataset.project || state.project.id,workflow=el.dataset.id;await openProject(project,false);await openWorkflow(await call('workflow.get',{project,workflow}));},
  'open-run': el => {state.conversationScope='request';return openRun(el.dataset.id);},
  'notification-run': el => actions['open-child'](el),
  'library-project'() { state.route = 'library'; shell(); },
  'use-template': el => prepareWork(el.dataset.id),
  'new-work': () => prepareWork(),
  async 'blank-workflow'() { const graph = { schema: 1, id: 'workflow-' + Date.now().toString(36), title: 'Nouveau workflow', description: '', nodes: [{ id: 'start', kind: 'task', title: 'Première étape', position: { x: 60, y: 80 } }], edges: [] }; const saved = await call('workflow.save', { project: state.project.id, graph }); state.workflows.push(saved); openWorkflow(saved); actions['workflow-settings'](); },
  async updates() { state.update = await api.updates({ action: 'status' }); previewUpdate(); },
  async 'check-updates'() { state.update = await api.updates({ action: 'check' }); updateIndicator(); previewUpdate(); },
  async 'download-update'() { await api.updates({ action: 'download' }); toast('Téléchargement ouvert. Installez le paquet lorsque vous êtes prêt à quitter Tricorder.'); },
  async 'update-notes'() { await api.updates({ action: 'notes' }); },
  async 'import-workflow'() { if (state.dirty) await save(); const preview = await api.portable({ action: 'open' }); if (preview) previewImport(preview); },
  async 'reuse-workflow'() {
    if (state.dirty) await save();
    const bundle = await call('workflow.export-portable', { project: state.project.id, graph: state.graph });
    state.reuseBundle = bundle;
    modal('Réutiliser ce workflow', `<form id="reuse-workflow-form"><p>Copiez les blocs, liens et réglages dans un autre projet ou dans vos modèles de workflows. Chaque copie évoluera indépendamment.</p><p>Les demandes, résultats, validations et planifications ne sont pas repris. Les connexions et profils devront être disponibles à destination.</p><label><input type="checkbox" name="keep_simulation_examples">Conserver les exemples personnalisés de simulation</label><p class="muted">Par défaut, les valeurs des anciens essais sont retirées. Cochez cette option pour réutiliser volontairement ces exemples fictifs ; ils ne constituent pas des résultats réels.</p><label for="reuse-title">Nom de la copie</label><input id="reuse-title" name="title" required maxlength="160" value="${esc(copyTitle(state.graph.title, state.workflows))}"><label for="reuse-destination">Destination</label><select id="reuse-destination" name="project">${options([['library', 'Modèles de workflows'], ['workspace', 'Sans projet'], ...state.projects.map(p => [p.id, p.title])], 'library')}</select><div class="modal-actions"><button type="submit" class="primary">Créer la copie</button></div></form>`);
  },
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
  async 'edit-template'(el) {
    const item = state.templates.find(g => g.id === el.dataset.id);
    const graph = item.summary ? await call('workflow.get', {project: item._project, workflow: item.id}) : clone(item);
    delete graph._project;
    if (!graph.revision) {
      state.templateCopy = graph;
      modal('Personnaliser une copie du modèle', `<form id="copy-template-form"><p>Origine : <strong>${esc(graph.title)}</strong> · modèle intégré à Tricorder.</p><p>Votre copie sera enregistrée dans les modèles partagés. Le modèle intégré reste disponible ; vous pourrez utiliser votre copie dans chaque projet.</p><label for="copy-template-title">Nom de votre modèle</label><input id="copy-template-title" name="title" value="${esc(copyTitle(graph.title, state.templates))}" required maxlength="160"><div class="modal-actions"><button type="submit" class="primary">Créer la copie et l’ouvrir</button></div></form>`);
    } else { await openProject('library', false); await openWorkflow(graph); }
  },
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
    modal('Version planifiée', `<p><strong>${esc(graph.title)}</strong> · ${graph.revision ? 'révision '+esc(graph.revision) : 'instantané sans numéro'} · ${schedule.simulation ? 'Simulation' : 'Exécution réelle'}</p><p>${esc(scheduleFrequency(schedule.rule))} · ${esc(schedule.rule.timezone)}</p><p class="notice">Cette version est conservée en lecture seule. Modifier le workflow dans l’éditeur ne change pas les prochains lancements de cette planification.</p><div class="schedule-snapshot">${graph.nodes.map(node => `<details><summary>${esc(node.title)} · ${esc(kinds[node.kind] || node.kind)}</summary>${businessDataView('', fields(node))}</details>`).join('')}</div>${graph.edges.length ? `<details><summary>Connexions entre les blocs</summary><ul>${graph.edges.map(edge => `<li>${esc(names.get(edge.from) || edge.from)} → ${esc(names.get(edge.to) || edge.to)}${edge.outcome ? ' · '+esc(edge.outcome) : ''}${Object.keys(edge.mapping || {}).length ? businessDataView('Données transmises', edge.mapping) : ''}</li>`).join('')}</ul></details>` : ''}<details><summary>Configuration complète de cette version</summary>${businessDataView('', graph)}</details>`, button('close-modal', 'Fermer') + button('replace-schedule', 'Préparer une nouvelle version…', '', `data-id="${esc(schedule.id)}"`), true);
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
    // Reuse recurrence only. Authorizations and activation remain fresh.
    state.scheduleDrafts[launchKey()] = replacementScheduleDraft(schedule);
    await actions.schedule();
    const note = document.createElement('p'); note.className = 'notice'; note.textContent = 'L’ancienne planification est archivée. Sa fréquence et son fuseau sont préremplis. Vérifiez ces réglages, le mode Simulation et les autorisations avant d’activer cette nouvelle version.';
    document.querySelector('#schedule-form').prepend(note);
  },
  async schedule() {
    rememberLaunchDraft();
    if (state.dirty) await save();
    const check = await call('workflow.validate', { project: state.project.id, graph: state.graph });
    const models = state.graph.nodes.filter(n => n.kind === 'agent').map(n => `${n.title} : ${effectiveExecution(state.project, state.graph, n).provider.value} / ${effectiveExecution(state.project, state.graph, n).model.value || 'à définir'}`);
    const draft = state.scheduleDrafts[launchKey()];
    modal('Configurer une planification', `<form id="schedule-form"><p><strong>${esc(state.graph.title)}</strong> · révision ${state.savedRevision}</p><p>Modèles IA : ${models.length ? esc(models.join(' ; ')) : 'aucun'}. ${models.length ? 'Chaque occurrence réelle peut consommer votre abonnement.' : ''}</p>${activationDetails(check)}${launchDiagnostics(check.issues, 'À configurer avant la planification')}<label for="schedule-kind">Fréquence</label><select name="kind" id="schedule-kind"><option value="daily">Chaque jour</option><option value="weekly">${esc(scheduleFrequency({kind:'weekly', weekdays: JSON.parse(draft?.weekdays || '[0,1,2,3,4]')}).replace(/ à 09:00$/, ''))}</option><option value="interval">À intervalle régulier</option></select><input type="hidden" name="weekdays" value="[0,1,2,3,4]"><div class="row"><div class="fill"><label for="schedule-time">Heure locale</label><input name="time" id="schedule-time" type="time" value="09:00"></div><div class="fill"><label for="schedule-minutes">Intervalle (minutes)</label><input name="minutes" id="schedule-minutes" type="number" min="5" max="525600" value="30"></div></div><label for="schedule-timezone">Fuseau horaire</label><input name="timezone" id="schedule-timezone" value="${esc(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Zurich')}"><label><input type="checkbox" name="simulation" checked>Simulation sans appel de modèle ni de service</label><label><input type="checkbox" required>J’active cette révision à cette fréquence. Les décisions humaines du workflow restent obligatoires.</label><p class="muted">Sans chevauchement. L’ordinateur et Tricorder doivent être ouverts. Une heure inexistante au changement d’heure est ignorée ; une heure répétée s’exécute une seule fois.</p><div class="modal-actions"><button type="submit" class="primary">Activer la planification</button></div></form>`, '', true);
    if (draft) for (const [key,value] of Object.entries(draft)) { const field = document.querySelector('#schedule-form').elements.namedItem(key); if (field.type === 'checkbox') field.checked=value; else field.value=value; } state.launchReturn = null;
  },
  async terminal() { if (!state.project) await ensureProject(); if (state.dirty) await save(); await terminal.open(state.project, state.graph, state.conversation?.id); },
  async 'reload-file'() { if (state.dirty) return showConflict(); const graph = await call('workflow.reload', { project: state.project.id, workflow: state.graph.id, revision: state.savedRevision }); state.graph = graph; state.savedRevision = graph.revision; state.history = new History(); renderEditor(); toast('Fichier validé et nouvelle révision chargée. Les exécutions existantes sont inchangées.'); },
  'select-node'(el) { state.iterationPage = null; state.selected = el.dataset.id; state.selectedNote = null; state.propertiesOpen = host.clientWidth > 760; if (state.mode === 'run') { state.reviewFocus = true; renderEditor(); return; } document.querySelectorAll('.node').forEach(n => n.classList.toggle('selected', n.dataset.id === state.selected)); renderInspector(); const properties = document.querySelector('[data-action=open-properties]'); if (properties) properties.disabled = false; },
  'open-properties'() { if (!state.selected || state.mode !== 'design') return; state.propertiesOpen = true; renderInspector(); document.querySelector('#node-title')?.focus({preventScroll:true}); },
  'add-note'() { noteForm(); },
  'edit-note'(el) { noteForm(el.dataset.id); },
  'delete-note'(el) { edit(g => { g.layout.notes = g.layout.notes.filter(n => n.id !== el.dataset.id); }); closeModal(); },
  'connection-port'(el) { connectionPort(el); },
  'workflow-settings'() { modal('Paramètres du workflow', `<form id="workflow-form"><label for="workflow-title">Nom</label><input id="workflow-title" name="title" value="${esc(state.graph.title)}" required><label for="workflow-description">Description</label><textarea id="workflow-description" name="description">${esc(state.graph.description || '')}</textarea>${questionNotificationForm()}${odooWorkflowFields()}<details><summary>Paramètres supplémentaires</summary><label for="workflow-parameters">Paramètres (objet JSON)</label><textarea id="workflow-parameters" name="parameters" spellcheck="false">${esc(JSON.stringify(workflowExtraParameters(), null, 2))}</textarea></details><div class="modal-actions"><button class="primary" type="submit">Appliquer</button></div></form>`, state.launchReturn ? button('return-to-launch', state.launchReturn.kind === 'schedule' ? 'Revenir à la planification' : 'Revenir au lancement') : ''); },
  'add-node'() { modal('Ajouter un bloc', `<form id="add-node-form"><label for="add-kind">Type d'étape</label><select id="add-kind" name="kind">${options([['input', 'Entrée · Recueillir des intentions'], ['foreach', 'Organisation · Pour chaque élément'], ['integrate', 'Organisation · Intégrer les modifications'], ['agent', 'Travail · Agent'], ['task', 'Travail · Tâche dans la conversation'], ['command', 'Travail · Commande'], ['document', 'Travail · Document'], ['agent-route', 'Aiguillage · Évaluation par un agent'], ['condition', 'Aiguillage · Règle explicite'], ['decision', 'Décision · Accord humain'], ['question', 'Décision · Question ouverte'], ['join', 'Organisation · Réunir'], ['subworkflow', 'Organisation · Sous-workflow'], ['watch', 'Organisation · Surveillance'], ['external', 'Travail · Opération externe'], ['communication', 'Travail · Communication']], 'agent')}</select><label for="add-title">Nom du bloc</label><input id="add-title" name="title" required placeholder="Quel résultat attendre ?">${state.graph.schema === 1 ? '<label data-convert-required hidden><input type="checkbox" name="convert">Convertir ce brouillon au format de données structuré. Les exécutions existantes sont conservées.</label>' : ''}<div class="modal-actions"><button class="primary" type="submit">Ajouter au workflow</button></div></form>`); },
  connect() { openConnection(); },
  'legacy-add-port'(el) { modal('Décrire une donnée', `<form id="port-form"><input type="hidden" name="direction" value="${el.dataset.direction}"><label>Nom (sans espaces)<input name="port" required pattern="[a-zA-Z][a-zA-Z0-9_.-]{0,79}" placeholder="criticite"></label><label>Type<select name="type">${options([['string','Texte'],['object','Objet structuré'],['array','Liste'],['boolean','Oui / non'],['number','Nombre']])}</select></label><button class="primary">Ajouter la donnée</button></form>`); },
  'add-port'(el) { showPortForm(el.dataset.direction); },
  'edit-port'(el) { showPortForm(el.dataset.direction, el.dataset.port); },
  'convert-workflow'() { conversionDialog(); },
  async 'confirm-conversion'() { const graph = convertWorkflow(state.graph); await call('workflow.validate',{graph,simulation:true}); edit(g => Object.assign(g,graph)); closeModal(); toast('Brouillon converti. Les exécutions déjà lancées gardent leur version.'); },
  'choose-child'() { childWorkflowForm(); },
  'add-associated'() { associatedForm(); },
  'edit-associated'(el) { associatedForm(el.dataset.id); },
  'remove-associated'(el) { edit(g => {g.actions = (g.actions || []).filter(a=>a.id !== el.dataset.id);}); closeModal(); },
  async 'iteration-start'() { state.run = await call('iteration.start',{run:state.run.id,node:state.selected},true); renderEditor(); },
  async 'iteration-page'(el) { state.iterationPage = await call('iteration.get',{run:state.run.id,node:state.selected,offset:Number(el.dataset.offset)}); renderInspector(); },
  async 'open-child'(el) { parentViews.push({run:state.run.id,selected:state.selected,reviewFocus:state.reviewFocus,zoom:state.zoom,scroll:viewportGeometry(),iterationPage:state.iterationPage}); await openRun(el.dataset.id,null,true); },
  async 'return-parent'() { const origin=runOrigin(), previous=parentViews.at(-1); if(!origin)return;const parent=previous?.run===origin.run?parentViews.pop():null;const selected=state.run.parent?.node || state.run.associated_with?.source;await openRun(origin.run,null,true);state.reviewFocus=parent?.reviewFocus ?? false;state.selected=parent?.selected || selected || state.selected;if(parent){state.zoom=parent.zoom;state.iterationPage=parent.iterationPage;}renderEditor();const scroll=document.querySelector('.canvas-scroll');if(parent && scroll){scroll.scrollLeft=parent.scroll.left;scroll.scrollTop=parent.scroll.top;}else requestAnimationFrame(focusSelectedNode); },
  async 'actions-page'(el) { state.run.associated=await call('action.list',{run:state.run.id,offset:Number(el.dataset.offset)}); renderExecutionOverview(); },
  'activate-action'(el) { const item=state.run.associated.items.find(a=>a.id===el.dataset.id); modal('Activer une action facultative',`<p><strong>${esc(item.title)}</strong></p><p>Cette activation lance le workflow associé. Les opérations qu’il contient et leurs validations s’appliquent. Le résultat principal reste indépendant.</p>`,button('close-modal','Conserver en attente')+button('confirm-action','Activer cette action','primary',`data-id="${esc(item.id)}"`)); },
  async 'confirm-action'(el) { state.run=await call('action.activate',{run:state.run.id,id:el.dataset.id},true);closeModal();renderExecutionOverview(); },
  'collection-edit'(el) { const item=state.run.nodes[state.selected].collection.items.find(item=>item.id===el.dataset.id);modal('Modifier une intention',`<form id="collection-edit-form"><input name="item" type="hidden" value="${esc(item.id)}"><input name="revision" type="hidden" value="${state.run.nodes[state.selected].collection.revision}"><label for="collection-edit-text">Intention</label><textarea id="collection-edit-text" name="text" required maxlength="12000">${esc(item.text)}</textarea><button class="primary">Enregistrer l’intention</button></form>`); },
  async 'collection-remove'(el) { await changeCollection('remove',{item:el.dataset.id}); },
  async 'collection-retry-add'(el) {
    const job=collectionJobs(state.run.id,state.selected).find(item=>item.id===el.dataset.id);if(!job || collectionInFlight.has(job.id))return;
    collectionInFlight.add(job.id);renderInspector();
    try { await changeCollection('add',{text:job.text},job); }
    finally {collectionInFlight.delete(job.id);if(state.run?.id===job.run)renderInspector();}
  },
  'collection-discard-add'(el) {const job=collectionJobs(state.run.id,state.selected).find(item=>item.id===el.dataset.id);if(job && !collectionInFlight.has(job.id)){saveCollectionJob(job,true);renderInspector();}},
  async 'collection-close'() { if(collectionJobs(state.run.id,state.selected).length)throw new Error('Résolvez les ajouts à récupérer avant de confirmer le recueil.');const field=document.querySelector('#collection-text');if(field?.value.trim()){field.focus();throw new Error('Ajoutez l’intention saisie à la liste, ou effacez-la, avant de confirmer le recueil.');}await changeCollection('close'); },
  'remove-port'(el) { edit(g => { delete g.nodes.find(n => n.id === state.selected)[el.dataset.direction][el.dataset.port]; }); },
  'close-inspector'() { if(state.mode === 'run') { state.reviewFocus=false;renderEditor();requestAnimationFrame(focusSelectedNode);return; } const previous = state.selected; state.propertiesOpen = false; renderInspector(); renderGraph(); document.querySelector(`[data-action="select-node"][data-id="${CSS.escape(previous)}"]`)?.focus({preventScroll:true}); },
  'simulation-data'() { modal('Données de simulation du bloc', simulationForm(selectedNode())); },
  'repair-design'(el) { rememberLaunchDraft(); closeModal(); state.selected = el.dataset.id; state.propertiesOpen = true; renderEditor(); const links = document.querySelector('.design-links'); if (links) { links.open = true; links.scrollIntoView({ block: 'nearest' }); } },
  'connect-input'(el) { actions.connect(); const form = document.querySelector('#connect-form'); form.elements.to.value = el.dataset.id; form.elements.from.value = state.graph.nodes.find(node => node.id !== el.dataset.id)?.id || el.dataset.id; refreshConnectionForm(); },
  'delete-edge'(el) { confirmDesignRemoval('edge', el.dataset.id); },
  'delete-node'() { flushNodeForm(); confirmDesignRemoval('node', state.selected); },
  'confirm-design-removal'() { const { kind, id } = state.designRemoval; edit(g => { if (kind === 'node') { g.nodes = g.nodes.filter(n => n.id !== id); state.selected = null; } g.edges = g.edges.filter(e => kind === 'node' ? e.from !== id && e.to !== id : e.id !== id); }); closeModal(); },
  'organize-graph'() {
    if (state.mode !== 'design') return;
    const heights = Object.fromEntries([...document.querySelectorAll('.node[data-id]')].map(node => [node.dataset.id, node.offsetHeight]));
    state.collapsed.clear(); state.zoom = 1; state.view = 'canvas'; state.selected = null;
    edit(graph => { graph.nodes = designLayout(graph, heights).nodes; });
    const scroll = document.querySelector('.canvas-scroll'); if (scroll) { scroll.scrollLeft = 0; scroll.scrollTop = 0; }
    toast('Graphe réorganisé à 100 %. Vous pouvez annuler cette modification.');
  },
  'select-edge'(element) {
    if (state.mode !== 'design') return;
    const edge = state.graph.edges.find(item => item.id === element.dataset.id); if (edge) openConnection({ edge });
  },
  undo() { state.graph = state.history.undo(state.graph); state.dirty = true; persistDraft(); renderEditor(); },
  redo() { state.graph = state.history.redo(state.graph); state.dirty = true; persistDraft(); renderEditor(); },
  view() { state.view = state.view === 'canvas' ? 'list' : 'canvas'; renderEditor();if(state.view==='canvas')requestAnimationFrame(focusSelectedNode); },
  'zoom-in'() { setGraphZoom(Math.min(1.6, state.zoom + 0.1)); },
  'zoom-out'() { setGraphZoom(Math.max(0.4, state.zoom - 0.1)); },
  'zoom-reset'() { setGraphZoom(1); },
  phases() {
    const phases = [...new Set(currentGraph().nodes.map(n => n.phase).filter(Boolean))];
    const intro = '<p>Replier une phase simplifie le dessin. Les décisions et blocages restent visibles.</p>';
    const rows = phases.map(phase => `<p>${button('toggle-phase', `${state.collapsed.has(phase) ? 'Déplier' : 'Replier'} · ${esc(phase)}`, '', `data-phase="${esc(phase)}"`)}</p>`).join('');
    modal('Organiser la vue par phases', phases.length ? intro + rows : '<p>Renseignez le champ Phase dans l’inspecteur des blocs pour les regrouper.</p>');
  },
  'toggle-phase'(el) { const phase = el.dataset.phase; if (state.collapsed.has(phase)) state.collapsed.delete(phase); else state.collapsed.add(phase); renderGraph(); actions.phases(); },
  'expand-phase'(el) { state.collapsed.delete(el.dataset.phase); renderGraph(); },
  fit() { fitCurrentGraph(); },
  'back-design'() { state.mode = 'design'; state.selected = null; renderEditor(); },
  async mode(el) { if (state.mode === 'design' && state.dirty) await save(); state.mode = el.dataset.mode; state.selected = state.mode==='run' ? state.run?.focus?.node || null : null; if (state.mode === 'history') { await loadRunPage(); return; } renderEditor(); },
  async 'start-preview'() {
    rememberLaunchDraft();
    if (state.dirty) await save();
    const draft = state.launchDrafts[launchKey()] || { request: state.graph.parameters?.request || '', projects: [] };
    const validation = await call('workflow.validate', { project: state.project.id, graph: state.graph });
    const native = await call('workflow.validate', nativeLaunchPayload());
    state.reuseSource = state.runs.find(r => r.original.id === state.graph.id && !r.simulation)?.id;
    modal('Lancer cette version du workflow', `<div class="launch-dialog"><label for="initial-request">Quelle demande souhaitez-vous traiter ?</label><textarea id="initial-request" placeholder="Décrivez-la ici ou directement dans le terminal.">${esc(draft.request)}</textarea><p>Cette saisie est facultative : vous pouvez tout expliquer à l’agent dans votre terminal ${integration.provider() === 'claude' ? 'Anthropic · Claude' : 'OpenAI · Codex'}. Vous pourrez soumettre une ou plusieurs tâches.</p><details class="launch-projects" ${draft.projects.length ? 'open' : ''}><summary>Inclure d’autres projets</summary>${state.projects.filter(p => p.id !== state.project.id).map(p => `<label><input type="checkbox" name="conversation-project" value="${esc(p.id)}" ${draft.projects.includes(p.id) ? 'checked' : ''}>${esc(p.title)}</label>`).join('')}</details>${activationDetails(native)}${designGuidance()}<div id="launch-native-check">${launchDiagnostics(native.issues, 'À résoudre avant le lancement')}${launchDiagnostics(native.requirements, 'À préparer pendant le workflow', true)}</div><div class="launch-primary">${button('start-conversation', 'Lancer dans le terminal', 'primary', native.issues.length ? 'disabled' : '')}${button('check-launch', 'Vérifier à nouveau', 'flat')}</div><details class="launch-automatic"><summary>Exécution automatique sans conversation</summary>${state.graph.nodes.some(n => n.kind === 'agent') ? aiForm(true) : ''}<p><strong>${esc(state.graph.title)}</strong> · révision ${state.savedRevision} · ${state.graph.nodes.length} étapes</p><p>Ce mode démarre les étapes sans conversation. Tous ses prérequis doivent être configurés.</p>${state.reuseSource ? '<label><input type="checkbox" id="reuse-evidence">Réutiliser les preuves encore valides des blocs qui l’autorisent</label>' : ''}${launchDiagnostics(validation.issues, 'À configurer pour le mode automatique')}${button('start-real', 'Lancer l’exécution réelle', 'primary', validation.issues.length ? 'disabled' : '')}</details></div>`, button('start-simulation', 'Simuler le parcours'));
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
  async 'conversation-terminal'() {
    const { project } = await call('project.get', { project: state.conversation.project });
    // The foreground program may have changed since the last terminal poll.
    // Find the existing session first; only its fresh state can require a resume.
    const result = await terminal.open(project, state.conversation.definition, state.conversation.id);
    if (result?.agentState === 'stopped') return actions['resume-agent']();
  },
  async 'conversation-shell'() { const { project } = await call('project.get', { project: state.conversation.project }); await terminal.open(project, state.conversation.definition, integration.terminalStatus?.(state.conversation.id)==='unknown' ? undefined : state.conversation.id); },
  async 'conversation-item'(el) { const selector=document.querySelector('.request-selector');if(selector)selector.open=false;state.compactRequestsOpen=false;if(conversationOverviewActive())state.conversationScroll=document.querySelector('#conversation-overview')?.scrollTop || 0;state.conversationScope='request';await openRun(el.dataset.id); },
  async 'conversation-item-action'(el) {await actions['conversation-item'](el);const next=conversationNextAction(state.run);if(next.action)await actions[next.action]();else actions['execution-next-action']();},
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
  async 'resume-request'() { if(!manuallyPaused(state.run))return;await actions.pause(); },
  async pause() { if(state.run.status==='paused' && (!manuallyPaused(state.run) || blockedDependencies().length)) {state.reviewFocus=true;state.selected=null;renderEditor();return;} state.run = await call('run.control', { run: state.run.id, control: state.run.status === 'paused' ? 'resume' : 'pause' }); renderEditor(); },
  async reconcile() { state.run = await call('run.reconcile', { run: state.run.id, node: state.selected }); renderInspector(); },
  retry() {
    const node = selectedNode(), data = state.run.nodes[state.selected], automatic=retryRunsAutomatically(node);
    modal(automatic?'Relancer cette étape maintenant':'Préparer la reprise de cette étape', `<form id="retry-form"><p><strong>${esc(attemptBudget(data,node))}</strong></p><p>Le résultat précédent reste dans l’historique. ${automatic ? 'La validation de ce formulaire relance immédiatement cette étape dès qu’une ressource est disponible et consomme une tentative. Effectuez votre correction avant de confirmer.' : 'Cette action prépare le bloc ; elle ne démarre pas l’agent. Le suivi indiquera ensuite comment poursuivre.'}</p>${data.result?.summary ? dataView('Résultat précédent',data.result.summary) : ''}<label for="retry-note">Correction attendue</label><textarea id="retry-note" name="note" required></textarea><div class="modal-actions"><button class="primary" type="submit">${automatic?'Relancer maintenant':'Préparer cette étape pour reprise'}</button></div></form>`);
  },
  'execution-results'() {
    const results = completedResults();
    modal('Résultats validés de cette demande', `<p>${esc(requestHeading(state.run.parameters?.request,state.run.definition.title))}</p>${state.run.simulation ? '<p class="notice amber">Simulation · ces contenus ne prouvent aucun travail métier réel.</p>' : ''}${results.slice(-3).reverse().map(({node,data}) => `<section class="completed-result"><h3>${esc(node.title)}</h3><p class="muted">Résultat validé · tentative ${data.attempt || 1}</p>${dataView('Compte rendu',data.result.summary)}${data.result.outputs ? dataView('Contenu produit',data.result.outputs) : ''}${evidenceView(data)}</section>`).join('')}${results.length > 3 ? `<p>${3} résultats affichés sur ${results.length}. Le rapport conserve tous les résultats.</p>` : ''}`, button('close-modal','Fermer') + button('results-report','Voir le rapport complet'), true);
  },
  async 'results-report'() { closeModal(); await actions.mode({dataset:{mode:'document'}}); },
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
  if (suppressGestureClick) { suppressGestureClick = false; event.preventDefault(); return; }
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
let observedWidth=0, observedHeight=0, resizeFrame=0;
new ResizeObserver(() => {
  positionWorkflowOptions();
  const width=Math.round(host.clientWidth),height=Math.round(host.clientHeight), resized=width!==observedWidth || height!==observedHeight;observedWidth=width;observedHeight=height;
  if(resized) {cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{
    if(state.route==='workflow' && state.mode==='run' && !state.reviewFocus && document.querySelector('.canvas')) {renderGraph();focusSelectedNode();}
  });}
  const compact=host.clientHeight>0 && host.clientHeight<480;
  if(compact!==!!state.compactHeight) {
    state.compactHeight=compact;document.body.classList.toggle('compact-height',compact);
    if(state.route==='workflow')renderConversation();
  }
}).observe(host);

document.addEventListener('change', event => {
  if(event.target.id==='condition-type'){const form=event.target.form, boolean=event.target.value==='boolean';form.querySelector('[data-condition-boolean]').hidden=!boolean;form.querySelector('[data-condition-custom]').hidden=boolean;if(boolean)form.elements.options.value='true\nfalse';}
  if(event.target.id==='port-type') {const list=document.querySelector('[data-list-contract]');if(list)list.hidden=event.target.value!=='array';}
  if(event.target.id==='add-kind'){const box=document.querySelector('[data-convert-required]');if(box){box.hidden=!['input','foreach','integrate'].includes(event.target.value);box.querySelector('input').required=!box.hidden;}}
  if(event.target.name==='workflow_choice'){const basic=document.querySelector('[data-basic-workflow]');if(basic)basic.hidden=event.target.value!=='__basic__';}
  if(event.target.closest('#connect-form') && event.target.name==='output')updateConnectionCompatibility();
  if (event.target.id === 'project-location') {
    const repository = event.target.value === 'repository', form = event.target.form;
    form.querySelector('[data-repository-project]').hidden = !repository;
    form.querySelector('[data-managed-project]').hidden = repository;
    form.elements.path.disabled = !repository; form.elements.path.required = repository;
  }
  if (event.target.matches('[data-sample-custom]')) {
    const field = event.target.closest('[data-sample-port]').querySelector('select,textarea,input:not([type=checkbox])');
    field.disabled = !event.target.checked;
    const row = event.target.closest('[data-sample-port]');
    row.querySelector('[data-sample-value]').hidden = !event.target.checked;
    row.querySelector('[data-sample-automatic]').hidden = event.target.checked;
    if (event.target.checked) field.focus();
  }
  if (event.target.matches('[data-sample-port] select')) {
    const message = event.target.closest('[data-sample-port]').querySelector('[data-sample-error]');
    if (message) message.hidden = event.target.value !== '';
  }
  if (event.target.name === 'conversation-project') {
    document.querySelector('[data-action="start-conversation"]')?.setAttribute('disabled', '');
    rememberLaunchDraft(); enqueue(refreshNativeLaunch);
  }
  if (event.target.closest('#connect-form') && ['from','to','order_only'].includes(event.target.name)) refreshConnectionForm();
  if (event.target.id === 'workflow-provider') {
    document.querySelector('#workflow-model').value = state.providerDefaults?.[event.target.value] || '';
    // Require explicit application before a paid launch with changed fields.
    document.querySelector('[data-action="start-real"]')?.setAttribute('disabled', '');
  }
});
document.addEventListener('input', event => {
  if(event.target.matches('#dependency-choices input[name=depends]')) {const selected=state.dependencyDraft.selected;event.target.checked?selected.add(event.target.value):selected.delete(event.target.value);document.querySelector('#dependency-count').textContent=`${selected.size} demande(s) préalable(s) sélectionnée(s). La nouvelle demande attendra leur réussite à toutes.`;}
  const interaction=event.target.closest('#question-form,#decision-form,#receipt-form,#collection-form');if(interaction){const key=interactionDraftKey(interaction);if(key){const draft=Object.fromEntries([...interaction.querySelectorAll('textarea[name]')].map(field=>[field.name,field.value]));if(interaction.id==='collection-form')draft.edited=crypto.randomUUID();localStorage.setItem(key,JSON.stringify(draft));}}
  if (event.target.closest('#node-form')) { const form=event.target.closest('#node-form');localStorage.setItem(draftKey(),JSON.stringify({graph:state.graph,revision:state.savedRevision,form:{node:state.selected,values:formDraft(form)}})); document.querySelector('[data-action=save]')?.removeAttribute('disabled'); const heading = document.querySelector('.workflow-heading p'); if (heading) heading.textContent = 'Modifications en attente · enregistrées en quittant cette vue'; }
  if (event.target.id === 'workflow-model') document.querySelector('[data-action="start-real"]')?.setAttribute('disabled', '');
});

document.addEventListener('submit', event => {
  event.preventDefault(); const form = event.target; const submitterValue=event.submitter?.value; const data = Object.fromEntries(new FormData(form));
  if(form.id==='collection-form') {
    if(!form.reportValidity())return;
    const draftKey=interactionDraftKey(form),draft=localStorage.getItem(draftKey);
    const submitted={id:crypto.randomUUID(),run:state.run.id,node:state.selected,text:data.text,draftKey,draft};
    const pending=JSON.stringify({draftKey,draft,text:data.text});
    if(pendingInteractions.has(pending))return;
    try {saveCollectionJob(submitted);}catch {error('Le brouillon local ne peut pas être enregistré. Conservez votre texte avant de réessayer.');return;}
    pendingInteractions.add(pending);collectionInFlight.add(submitted.id);
    enqueue(async()=>{try{await changeCollection('add',{text:data.text},submitted);}finally{pendingInteractions.delete(pending);collectionInFlight.delete(submitted.id);if(state.run?.id===submitted.run)renderInspector();}});
    return;
  }
  if (['question-form','decision-form','receipt-form'].includes(form.id)) {
    if(!form.reportValidity())return;
    const draft=interactionDraftKey(form);
    if(!draft || pendingInteractions.has(draft))return;
    const run=state.run.id,node=state.selected,values=clone(state.run.nodes[node]);
    const definition=state.run.definition.nodes.find(n=>n.id===node);
    const action=form.id==='question-form' ? 'run.answer' : form.id==='decision-form' ? 'run.decide' : 'run.accept';
    const payload=action==='run.answer' ? {run,node,question:values.question.id,text:data.answer} : action==='run.decide' ? {run,node,nonce:values.nonce,proposal:values.proposal,outcome:submitterValue,note:data.note} : {run,node,checks:definition.criteria || [],note:data.note};
    pendingInteractions.add(draft);
    const disabled=[...form.elements].map(field=>[field,field.disabled]);
    for(const [field] of disabled)field.disabled=true;
    enqueue(async()=>{
      try {
        const result=await call(action,payload,action!=='run.answer');
        localStorage.removeItem(draft);
        if(state.run?.id===run) {
          if(action==='run.answer')await poll();else state.run=result;
          renderGraph();renderInspector();
        }
        toast(action==='run.answer'?'Réponse enregistrée.':action==='run.decide'?'Décision enregistrée.':'Validation enregistrée.');
      } finally {
        pendingInteractions.delete(draft);
        for(const [field,wasDisabled] of disabled)field.disabled=wasDisabled;
        if(document.querySelector('#inspector')?.dataset.interaction===draft)renderInspector();
      }
    });
    return;
  }
  if (form.id === 'schedule-form') {
    // Lock synchronously, before queueing: two valid submit events must never
    // create two active schedules while the first backend reply is pending.
    if (form.dataset.pending) return;
    form.dataset.pending = '1';
    const submit = form.querySelector('button[type=submit]'); submit.disabled = true;
    enqueue(async () => {
      try {
        if (!form.isConnected) return;
        await call('schedule.create', { project: state.project.id, graph: state.graph, simulation: data.simulation === 'on', authorize_notifications: data.authorize_notifications === 'on', rule: { kind: data.kind, time: data.time, minutes: Number(data.minutes), timezone: data.timezone, weekdays: JSON.parse(data.weekdays || '[0,1,2,3,4]') } }, true);
        closeModal(); await actions['refresh-schedules'](); toast('Planification activée. Elle apparaît aussi dans l’icône Ubuntu.');
      } finally { delete form.dataset.pending; submit.disabled = false; }
    });
    return;
  }
  if (form.id === 'reuse-workflow-form') {
    if (form.dataset.pending) return;
    form.dataset.pending = '1';
    const submit = form.querySelector('button[type=submit]'); submit.disabled = true;
    enqueue(async () => {
      try {
        if (!form.isConnected) return;
      const bundle = clone(state.reuseBundle); bundle.workflow = reusableWorkflow(bundle.workflow, { keepSimulationExamples: data.keep_simulation_examples === 'on' }); bundle.workflow.title = data.title.trim();
      if (!bundle.workflow.title) throw new Error('Donnez un nom à la copie.');
      const graph = await call('workflow.import-portable', { project: data.project, bundle });
      state.reuseBundle = null; if (!form.isConnected) return; closeModal(); await openProject(data.project, false); await openWorkflow(graph);
      if (data.project === 'library') state.templates = (await call('bootstrap')).templates;
      toast('Copie créée. Les demandes et exécutions d’origine sont conservées séparément.'); return;
      } finally { delete form.dataset.pending; submit.disabled = false; }
    });
    return;
  }
  enqueue(async () => {
    if (form.id === 'collection-edit-form') { await changeCollection('update',{text:data.text,item:data.item,revision:Number(data.revision)});closeModal();return; }
    if(form.id==='child-workflow-form'){const workflow=await selectedChildWorkflow(data);edit(g=>{g.nodes.find(n=>n.id===state.selected).workflow=workflow;});closeModal();return;}
    if(form.id==='associated-form'){if(data.event==='question' && !['question','agent','task','document'].includes(selectedNode().kind))throw new Error('Ce bloc ne pose pas de question directement. Choisissez le résultat accepté ou configurez l’action sur le bloc qui pose la question.');const workflow=await selectedChildWorkflow(data);edit(g=>{g.actions ||= [];const value={id:data.associated_id || 'action-'+crypto.randomUUID(),title:data.title,source:state.selected,event:data.event,enabled:data.enabled==='on',workflow};const index=g.actions.findIndex(a=>a.id===value.id);if(index<0)g.actions.push(value);else g.actions[index]=value;});closeModal();return;}
    if (form.id === 'simulation-form') {
      const fields = Object.fromEntries([...form.querySelectorAll('[data-sample-port]')].map(row => [row.dataset.samplePort, { custom: row.querySelector('[data-sample-custom]').checked, value: row.querySelector('select,textarea,input:not([type=checkbox])').value }]));
      const node = selectedNode(), values = simulationValues({...node,outputs:Object.fromEntries(Object.entries(node.outputs || {}).map(([key,port])=>[key,portType(port)]))}, fields);
      validateSimulationPorts(node, values);
      edit(graph => { const node = graph.nodes.find(item => item.id === state.selected); if (Object.keys(values).length) node.sample_outputs = values; else delete node.sample_outputs; });
      closeModal(); toast('Données de simulation appliquées au brouillon. Aucun travail réel exécuté.'); return;
    }
    if (form.id === 'copy-template-form') {
      const title = data.title.trim();
      if (state.templates.some(item => item.title === title)) throw new Error('Choisissez un nom distinct pour retrouver votre copie parmi les modèles.');
      const graph = clone(state.templateCopy), origin = graph.title;
      graph.id = 'custom-' + crypto.randomUUID(); graph.title = title;
      graph.description = `Copie du modèle intégré « ${origin} ».${graph.description ? '\n\n' + graph.description : ''}`;
      await call('template.workspace');
      const saved = await call('workflow.save', { project: 'library', graph });
      closeModal(); await openProject('library', false); await openWorkflow(saved);
      state.templates = (await call('bootstrap')).templates;
      toast('Votre copie est enregistrée dans les modèles partagés. Le modèle intégré reste disponible.'); return;
    }
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
    if (form.id === 'port-form') { const port=state.graph.schema===2 ? descriptorFromFields(data) : data.type; edit(g => { const n=g.nodes.find(n=>n.id===state.selected); n[data.direction] ||= {}; n[data.direction][data.port]=port; }); closeModal(); return; }
    if (form.id === 'conversation-add-form') {
      const draft=state.dependencyDraft;
      const item=await call('conversation.add', { conversation: draft.conversation, request: data.request, project: data.project, depends_on: [...draft.selected] });
      closeModal();
      if(draft.replacement)await openRun(item.run);else await pollConversation();
      toast(draft.replacement ? 'La demande de remplacement est ouverte. La demande précédente reste conservée.' : 'Demande ajoutée à la conversation.'); return;
    }
    if (form.id === 'workflow-ai-form') { flushNodeForm(); const next = withWorkflowAI(state.graph, data); edit(g => Object.assign(g, next)); await save(); await integration.setProvider(data.provider); closeModal(); if (data.preview === 'yes') await actions['return-to-launch'](); return; }
    if (form.id === 'connection-context-form') { if (data.project === 'workspace') await call('workspace.get'); if (data.project === 'library') await call('template.workspace'); Object.assign(state, await call('project.get', { project: data.project })); renderConnections(); terminal.host.hidden = true; }
    if (form.id === 'handoff-form') { const graph = await call('run.handoff', { run: state.run.id, project: data.project, graph: state.templates.find(t => t.id === data.template) }, true); closeModal(); await openProject(data.project, false); openWorkflow(graph); toast('Brouillon créé avec sa source globale.'); }
    if (form.id === 'import-workflow-form') { const graph = await call('workflow.import-portable', { project: data.context, bundle: state.importBundle }); state.importBundle = null; closeModal(); await openProject(data.context, false); openWorkflow(graph); toast('Brouillon importé. Aucun workflow ni planification activée.'); }
    if (form.id === 'project-form') { if (data.location === 'repository' && !data.path.trim()) throw new Error('Choisissez ou saisissez le chemin du dépôt Git à associer.'); const project = await call('project.create', {title: data.title, ...(data.location === 'repository' ? {path: data.path.trim()} : {})}); state.projects.push(project); closeModal(); await openProject(project.id); }
    if (form.id === 'node-form') { applyNodeForm(form); if (host.clientWidth <= 760) document.querySelector('.design-inspector-actions button')?.focus({preventScroll:true}); toast('Bloc modifié. Enregistrez le workflow pour créer une révision.'); }
    if (form.id === 'workflow-form') { const parameters = JSON.parse(data.parameters); if (!parameters || Array.isArray(parameters) || typeof parameters !== 'object') throw new Error('Les paramètres doivent être un objet.'); for (const [key,value] of Object.entries(data)) if (key.startsWith('context_')) { const name=key.slice(8); if (value.trim()) parameters[name]=value.trim(); else delete parameters[name]; } if (data.question_notification && !data.question_recipient.trim()) throw new Error('Renseigner le destinataire de notification.'); edit(g => { Object.assign(g, { title: data.title, description: data.description, parameters }); if (data.question_notification) { g.on_question = { ...JSON.parse(data.question_notification), recipient: data.question_recipient.trim() }; } else delete g.on_question; }); closeModal(); }
    if (form.id === 'add-node-form') {
      const advanced=['input','foreach','integrate'].includes(data.kind); if(advanced && state.graph.schema===1 && data.convert!=='on')throw new Error('Confirmez la conversion de ce brouillon pour utiliser ce bloc.');
      const id = 'step-' + Date.now().toString(36), position = newItemPosition(); state.propertiesOpen = host.clientWidth > 760; edit(g => { if(advanced && g.schema===1)Object.assign(g,convertWorkflow(g)); const n = { id, title: data.title, kind: data.kind, position, criteria: [], ...advancedNode(data.kind) }; if (data.kind === 'agent-route') { n.kind = 'agent'; n.route_output = 'choice'; n.options = ['yes', 'no', 'unknown']; n.outputs = { choice: 'string', reason: 'string' }; n.validation = 'contract'; } if (data.kind === 'agent') n.validation = 'contract'; if (data.kind === 'question') { n.question = data.title; n.outputs = {answer: 'string'}; } if (data.kind === 'command') n.argv = ['python3', '-c', 'print("Hello")']; if (data.kind === 'condition') { n.parameter = 'choice'; n.options = ['true', 'false']; } if (data.kind === 'subworkflow') n.workflow = 'analysis'; g.nodes.push(n); state.selected = id; }); closeModal(); focusGraphItem(id, false, true); if(state.propertiesOpen)document.querySelector('#node-title')?.focus({preventScroll:true});
    }
    if (form.id === 'note-form') {
      const id = data.note_id || 'note-' + crypto.randomUUID(), existing = state.graph.layout?.notes?.find(n => n.id === id);
      const note = { id, title: data.title.trim(), text: data.text, position: existing?.position || newItemPosition({width:Number(data.width),height:Number(data.height)}), size: {width:Number(data.width),height:Number(data.height)} };
      edit(g => { g.layout ||= {}; g.layout.notes ||= []; const index = g.layout.notes.findIndex(n => n.id === id); if (index < 0) g.layout.notes.push(note); else g.layout.notes[index] = note; });
      closeModal(); focusGraphItem(id, true, true); return;
    }
    if (form.id === 'connect-form') {
      if (!!data.output !== !!data.input) throw new Error('Choisissez la sortie et l’entrée destinataire pour transmettre les données. Pour un lien d’ordre uniquement, cochez « Ne transmettre aucune donnée ».');
      const proposed = clone(state.graph); const mapping = JSON.parse(data.mapping || '{}'); if (data.output && data.input) { for (const [source,target] of Object.entries(mapping)) if (target === data.input) delete mapping[source]; mapping[data.output] = data.input; } const edge = { id: data.edge_id || 'edge-' + Date.now().toString(36), from: data.from, to: data.to, outcome: data.outcome, mapping }; if (data.edge_id) proposed.edges = proposed.edges.map(previous => previous.id === data.edge_id ? edge : previous); else proposed.edges.push(edge); for(const [out,input] of Object.entries(mapping)){const reason=incompatibleReason(proposed.nodes.find(n=>n.id===data.from).outputs?.[out],proposed.nodes.find(n=>n.id===data.to).inputs?.[input],proposed.schema);if(reason)throw new Error(`Impossible de relier « ${out} » à « ${input} » : ${reason}`);} await call('workflow.validate', { graph: proposed, simulation: true }); edit(g => { g.edges = proposed.edges; }); closeModal();
    }
    if (form.id === 'retry-form') { const automatic=retryRunsAutomatically(selectedNode()); state.run = await call('run.retry', { run: state.run.id, node: state.selected, note: data.note }, true); closeModal(); renderGraph(); renderInspector(); toast(automatic?'Relance demandée. Suivez cette nouvelle tentative.':'Reprise préparée. Consultez la prochaine action du suivi pour poursuivre.'); }
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
  if (event.target.closest('.xterm')) return;
  if (!dialog && state.route === 'workflow' && state.mode === 'design' && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); enqueue(save); return; }
  if (event.target.closest('input,textarea,select,[contenteditable="true"],.xterm')) {
    if (!dialog || !['Escape','Tab'].includes(event.key)) return;
  }
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

// Pointer, keyboard and connection gestures are installed below.
installEditorGestures();

let conversationPolling = false;
async function pollConversation() {
  if (!state.conversation || conversationPolling) return;
  conversationPolling = true;
  try {
    const id = state.conversation.id, epoch = viewEpoch, graph = state.graph?.id;
    const offset = state.conversation.offset || 0, query = state.conversation.query || '';
    const c = await call('conversation.get', { conversation: id, offset, query });
    const agentState = integration.terminalStatus ? await integration.terminalStatus(id) : state.agentState;
    if (state.conversation?.id !== id || epoch !== viewEpoch || (state.conversation.offset || 0) !== offset || (state.conversation.query || '') !== query) return;
    c.query = query;
    const agentChanged = state.agentState !== agentState || state.agentConversation !== id;
    const changed = agentChanged || JSON.stringify(c) !== JSON.stringify(state.conversation);
    state.agentState = agentState; state.agentConversation = id;
    state.conversation = c;
    if ((agentChanged || changed && state.run?.coordination_wait) && state.route === 'workflow' && state.mode === 'run') {if(!state.run && !c.items.length){renderConversationReady();return;}renderInspector();}
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
    if(state.iterationPage?.run===state.run.id && state.iterationPage.node===state.selected)state.iterationPage=await call('iteration.get',{run:state.run.id,node:state.selected,offset:state.iterationPage.offset || 0});
    if (conversationOverviewActive()) return;
    // Follow a changing active step only while watching the graph. Reading a
    // result or typing an answer must never be interrupted by polling.
    if (state.mode === 'run' && !state.reviewFocus && state.selected === previous.focus?.node && previous.focus?.node !== state.run.focus?.node) {
      state.selected=state.run.focus?.node || null;
      document.querySelectorAll('.node').forEach(n=>n.classList.toggle('selected',n.dataset.id===state.selected));
      renderInspector(); requestAnimationFrame(focusSelectedNode);
    }
    if (state.mode === 'run') {
      if(state.run.definition.schema===2 && (JSON.stringify(previous.nodes)!==JSON.stringify(state.run.nodes) || JSON.stringify(previous.coordination)!==JSON.stringify(state.run.coordination))) {const focused=document.activeElement?.closest('.canvas [data-action][data-id]');const identity=focused && {action:focused.dataset.action,id:focused.dataset.id};renderGraph();if(identity)document.querySelector(`.canvas [data-action="${CSS.escape(identity.action)}"][data-id="${CSS.escape(identity.id)}"]`)?.focus({preventScroll:true});}
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
      if (previous.status!==state.run.status || previous.coordination_wait!==state.run.coordination_wait || JSON.stringify(previous.launch)!==JSON.stringify(state.run.launch) || JSON.stringify(previous.coordination)!==JSON.stringify(state.run.coordination) || (state.selected && JSON.stringify(previous.nodes[state.selected]) !== JSON.stringify(state.run.nodes[state.selected]))) renderInspector();
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
  flushNodeForm();
  if (state.dirty) await save();
  if (destination.route === 'import-workflow') { const pending = await api.portable({ action: 'pending' }); if (pending) previewImport(pending); return; }
  if (destination.route === 'global') { Object.assign(state,await call('workspace.get'));state.catalogChoices=(await loadWorkflowChoices()).choices;state.route='catalog';shell();return; }
  if (destination.route === 'run') { await openProject(destination.project, false); await openRun(destination.run); if (destination.node) { state.selected=destination.node; renderInspector(); } }
  else { state.route = destination.route; shell(); }
}); });

function previewImport(preview) {
  state.importBundle = preview.bundle;
  const graph = preview.bundle.workflow, needs = preview.requirements;
  modal('Importer un workflow portable', `<p><strong>${esc(graph.title)}</strong> · ${graph.nodes.length} bloc${graph.nodes.length > 1 ? 's' : ''} · ${graph.edges.length} lien${graph.edges.length > 1 ? 's' : ''}</p><p>${esc(graph.description || '')}</p><p>Modèles IA : ${esc(needs.models.map(m => m.provider + ' / ' + m.model).join(', ') || 'aucun')}<br>Agents dédiés : ${esc(needs.profiles.join(', ') || 'aucun')}<br>Capacités : ${esc(needs.capabilities.map(c => c.plugin + ' / ' + c.operation).join(', ') || 'aucune déclarée')}</p><p class="muted">Les connexions devront être vérifiées sur cet ordinateur. L’import crée un brouillon sans reprendre les exécutions, les accords ou les planifications du poste d’origine.</p><details><summary>Examiner les étapes et les données</summary>${graph.nodes.map(node => `<details><summary>${esc(node.title)} · ${esc(kinds[node.kind] || node.kind)}</summary>${businessDataView('Configuration du bloc', { ...(node.prompt ? {consigne:node.prompt} : {}), ...(node.criteria?.length ? {critères:node.criteria} : {}), entrées:node.inputs || {}, sorties:node.outputs || {}, ...(node.question ? {question:node.question} : {}) })}</details>`).join('')}${graph.edges.length ? `<h3>Liens entre les blocs</h3><ul>${graph.edges.map(edge => `<li>${esc(graph.nodes.find(node => node.id === edge.from)?.title || edge.from)} → ${esc(graph.nodes.find(node => node.id === edge.to)?.title || edge.to)}${edge.outcome ? ' · ' + esc(edge.outcome) : ''}</li>`).join('')}</ul>` : '<p>Aucun lien entre les blocs.</p>'}</details><details><summary>Configuration technique complète (JSON)</summary><pre>${esc(JSON.stringify(graph, null, 2))}</pre></details><form id="import-workflow-form"><label for="import-context">Destination</label><select id="import-context" name="context">${options([['workspace', 'Sans projet'], ['library', 'Bibliothèque de modèles'], ...state.projects.map(p => [p.id, p.title])], state.project?.id || 'workspace')}</select><div class="modal-actions"><button class="primary" type="submit">Importer le brouillon</button></div></form>`);
}

function updateIndicator() {
  const target = document.querySelector('#update-indicator');
  if (target) target.innerHTML = state.update?.status === 'available' ? button('updates', `Mise à jour ${esc(state.update.latest)}`, 'flat') : '';
}
function previewUpdate() {
  const update = state.update || {};
  modal('Mises à jour de Tricorder', `<p>Version installée : <strong>${esc(update.current || 'inconnue')}</strong></p><p>${update.status === 'available' ? `La release stable ${esc(update.latest)} est disponible.` : update.status === 'current' ? 'Aucune version stable plus récente détectée.' : esc(update.reason || 'Vérification disponible hors mode de test.')}</p><p class="muted">Tricorder vérifie GitHub à son lancement. Le téléchargement et l’installation restent explicites ; vos workflows ne sont pas redémarrés automatiquement.</p>${update.notes ? `<details><summary>Notes de la release</summary><pre>${esc(update.notes)}</pre></details>` : ''}`, button('check-updates', 'Vérifier maintenant') + (update.url ? button('update-notes', 'Ouvrir la release GitHub') : '') + (update.status === 'available' && update.download ? button('download-update', 'Télécharger le paquet Ubuntu', 'primary') : ''));
}

return { ready, newRequest: () => enqueue(async () => { flushNodeForm(); if (state.dirty) await save(); await prepareRequest(); }), showUpdates: () => actions.updates(), navigate(route, project) {
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

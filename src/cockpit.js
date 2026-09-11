// Roadmap views use metadata APIs only; commands are prepared, never injected.
import { lifecycleUI, missionCards, plainLanguageUI } from './lifecycle.js';
import { knownSum, taskMeasures, summarizeMeasures, hours, agentMeasures, timeShare, agentAllocation, tokenMeasures, withoutPreparationOverlap } from './measurements.mjs';
import { workStatus } from './work-context.mjs';
import { documentBody } from './markdown.js';
import { releaseBoard } from './release-board.js';
export function providerIcon(provider) {
  const name = provider?.split('-')[0];
  const shape = name === 'claude' ? '<path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5M8 3l8 18M3 8l18 8"/>' : name === 'codex' ? '<path d="m8 5-6 7 6 7m8-14 6 7-6 7m-3-16-2 18"/>' : '<path d="m4 6 6 6-6 6m9 0h7"/>';
  return `<svg class="provider-icon ${name === 'claude' ? 'claude' : name === 'codex' ? 'codex' : 'shell'}" role="img" aria-label="${name === 'claude' ? 'Claude' : name === 'codex' ? 'Codex' : 'Shell'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`;
}

export function cockpit({ api, get, setSettings, setProjects, render, sidebar, chooseProject, setView, selectTask, selectSession, modal, toast, esc, badge, when, minutes }) {
  const $ = s => document.querySelector(s);
  let observations = [], observedProject = null, reading = false, graphTask = '', graphResource = '', graphOn = false, searchTicket = 0;
  let prepared = '', handoff = '', graphContext = '', effortTotals = {};
  let effortRows = [];
  const board = releaseBoard({ get, observations: () => currentObservations(true), render, selectTask, esc, badge, when, providerIcon });
  const expandedAgents = new Set();
  const percent = value => value == null ? '—' : value.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
  document.addEventListener('toggle', event => {
    const key = event.target.dataset?.agentDetail;
    if (!key || !event.target.isConnected) return;
    if (event.target.open) expandedAgents.add(key); else expandedAgents.delete(key);
  }, true);
  let explorer = null, explorerProject = null, explorerPath = '', exploring = false, fileTicket = 0;
  const states = { unknown: 'Inconnu', idle: 'Au repos · attend une saisie', active: 'Activité observée', tool: 'Outil en cours', waiting_human: 'Décision humaine attendue', interrupted: 'Interrompu', complete: 'Terminé' };
  const action = (name, title) => ['graph', 'handoff'].includes(name) ? '' : `<button class="secondary" data-cockpit="${name}">${title}</button>`;
  const selected = () => {
    const s = get(), task = s.detail?.tasks.find(t => t.id === s.selectedTask);
    const terminal = s.sessions.find(t => t.id === s.selectedSession.get(s.current) && t.project === s.current);
    return { project: s.current, release: s.detail?.selectedRelease, task: task?.id, flow: task?.flow, terminal: terminal?.id };
  };
  function currentObservations(allTasks = false) {
    const s = get();
    return observations.filter(b => b.project === s.current && (b.release || null) === (s.detail?.selectedRelease || null) && (allTasks || !s.selectedTask || b.task === s.selectedTask));
  }
  function tokenPanel() {
    const s = get(), saved = s.detail?.effort?.rows || [];
    const native = withoutPreparationOverlap(currentObservations(), s.detail?.effort?.preparationSessions);
    const ids = [...new Set([...saved.map(r => r.task), ...native.map(b => b.task)].filter(Boolean))]
      .filter(id => !s.selectedTask || id === s.selectedTask);
    const rows = ids.flatMap(id => {
      const recorded = saved.filter(r => r.task === id), observed = native.filter(b => b.task === id);
      const main = { id: recorded[0]?.phase === 'preparation' ? 'Préparation du plan' : id === 'RELEASE' ? 'Clôture commune' : id, ...tokenMeasures(recorded, observed) };
      // Choose one source for the whole task, then split it by declared role.
      const agents = agentMeasures(recorded, observed).map(a => {
        const metrics = tokenMeasures(recorded.filter(r => r.agent === a.agent), main.source === 'Enregistré' ? [] : observed.filter(b => (b.role || '') === a.agent));
        return { id: '↳ ' + a.label, ...metrics, source: metrics.fields.some(f => f.value != null) ? main.source : 'Non mesuré' };
      });
      return [main, ...agents];
    });
    return `<section class="token-allocation"><h3>Consommation de jetons</h3><p class="muted">Entrées et sorties séparées. Le cache fait déjà partie des entrées : il ne s’ajoute pas au total. « Non mesuré » ne signifie pas zéro.</p><div class="table-scroll"><table><thead><tr><th>Tâche</th>${(rows[0]?.fields || []).map(f => `<th>${esc(f.label)}</th>`).join('')}<th>Relevé</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.id)}</td>${r.fields.map(f => `<td>${f.value == null ? 'Non mesuré' : f.value.toLocaleString('fr-CH') + (f.partial ? ' · partiel' : '')}</td>`).join('')}<td>${r.source}</td></tr>`).join('') || '<tr><td>Aucun compteur disponible.</td></tr>'}</tbody></table></div></section>`;
  }
  function applyPreferences() {
    const s = get(), ui = s.settings.ui || {};
    document.documentElement.classList.toggle('high-contrast', !!ui.highContrast);
    document.documentElement.style.setProperty('--sidebar-width', `${ui.sidebarWidth || 258}px`);
    document.documentElement.style.setProperty('--inspector-width', `${ui.inspectorWidth || 310}px`);
    for (const t of s.terminals.values()) {
      t.term.options.fontSize = ui.fontSize || 13;
      t.term.options.fontFamily = fonts[ui.font || 'mono'];
    }
  }
  const fonts = { mono: '"DejaVu Sans Mono", monospace', liberation: '"Liberation Mono", monospace', system: 'monospace' };
  async function refreshNative() {
    const project = get().current;
    if (!project || reading) return;
    reading = true;
    try {
      const values = await api.cockpit.observations(null);
      const before = new Set(observations.flatMap(b => (b.agents || []).filter(a => a.state === 'waiting_human').map(a => a.nativeId)));
      observations = values; observedProject = project;
      const waiting = values.flatMap(b => b.agents || []).filter(a => a.state === 'waiting_human' && !before.has(a.nativeId));
      if (waiting.length) api.notify({ title: 'Tricorder · décision attendue', body: `${waiting.length} agent(s) attendent une décision dans le terminal.` });
      sidebar(); alertSidebar();
      if (get().detail && $('.current-work')) {
        const status = workStatus(get(), observations);
        $('.current-work').className = 'current-work ' + status.kind;
        $('.current-work strong').textContent = status.label;
        $('.current-work span').textContent = status.text;
      }
      if (!get().overviewMode && ['agents', 'effort', 'release-kanban'].includes(get().view) && !$('#modal').open && document.activeElement?.id !== 'board-owner') render();
    } catch (error) { toast(error.message); }
    finally { reading = false; }
  }
  function alertSidebar() {
    const awaiting = new Set(observations.filter(b => b.agents?.some(a => a.state === 'waiting_human')).map(b => b.project));
    for (const p of get().projects) if (p.attention?.some(a => a.status === 'waiting_human')) awaiting.add(p.path);
    for (const el of document.querySelectorAll('.project-item')) {
      const waiting = awaiting.has(el.dataset.project);
      el.classList.toggle('needs-human', waiting);
      el.querySelector('.human-alert')?.remove();
      if (waiting) { el.insertAdjacentHTML('beforeend', '<span class="human-alert" aria-label="Décision humaine attendue">!</span>'); el.title = 'Dernière attente humaine non résolue : ouvrir le terminal ou le workflow.'; }
      else el.removeAttribute('title');
    }
  }
  function nativePanel() {
    const rows = currentObservations();
    return `<section class="native-panel"><div class="section-title"><h2>Observation native</h2><div class="cockpit-actions">${action('associate', 'Associer une session')}${action('handoff', 'Fiche de reprise')}</div></div><p class="muted">Dernier événement connu, pas une mesure de « réflexion ». Après 90 s sans événement, l’activité actuelle reste inconnue.</p>${rows.map(b => `<article class="info-card native-binding"><div class="card-title">${providerIcon(b.provider)}<h3>${esc(b.provider)} · ${esc(b.nativeId || 'À démarrer')}</h3></div><p>${badge('series', b.role || 'orchestrator')} ${esc(b.task ? 'Tâche ' + b.task : b.release ? 'Release complète' : 'Projet sans release')} · ${esc(b.flow || 'Sans workflow')} · ${esc(b.terminal ? 'terminal ' + b.terminal.slice(0, 8) : 'sans terminal')}</p><small>${b.since ? when(b.since) : 'Début de session'} → ${b.until ? when(b.until) : 'Dernier événement'}</small>${(b.agents || []).map(a => `<div class="native-agent ${a.parentId ? 'child-agent' : ''}"><code>${esc(a.nativeId)}</code>${a.parentId ? `<small>↳ parent : ${esc(a.parentId)}</small>` : ''}${badge(a.stale ? 'unverified' : a.state, a.stale ? 'Actuellement inconnu' : states[a.state])}<small>Dernier état : ${esc(states[a.state])}${a.tool ? ' · ' + esc(a.tool) : ''} · ${when(a.lastAt)}</small><button class="text-button" data-native-events="${esc(b.id)}" data-native-agent="${esc(a.nativeId)}">Voir les événements (${a.events.length})</button></div>`).join('')}${(b.warnings || []).map(w => `<div class="note warning">${esc(w)}</div>`).join('')}<div class="cockpit-actions"><button class="text-button" data-forget-native="${esc(b.id)}">Retirer l’association</button></div></article>`).join('') || '<div class="note">Associez un historique JSONL Codex/Claude, ou préparez un lancement Claude avec hooks. Aucun historique personnel n’est parcouru automatiquement.</div>'}</section>`;
  }
  function measures() {
    const rows = currentObservations().filter(b => b.provider !== 'codex-runtime');
    return `<section class="native-panel"><div class="section-title"><h2>Mesures natives attribuées</h2>${action('associate', 'Associer une période')}</div><p class="muted">Collecte locale via odoo_usage.py. Les prévisions et effort.json restent inchangés ; consolidation explicite via Odoo Crew.</p>${rows.map(b => `<article class="info-card"><h3>${providerIcon(b.provider)} ${esc(b.task || 'Non attribué')} · ${esc(b.nativeId || 'À démarrer')}</h3><div class="measure-grid"><div><span>Tours terminés cumulés</span><strong>${minutes(b.usage?.active_seconds == null ? null : b.usage.active_seconds / 60)}</strong></div><div><span>Délai de la période</span><strong>${minutes(b.usage?.elapsed_seconds == null ? null : b.usage.elapsed_seconds / 60)}</strong></div><div><span>Attente humaine observée</span><strong>${minutes(b.waitingSeconds == null ? null : b.waitingSeconds / 60)}</strong></div><div><span>Jetons</span><strong>${b.usage?.tokens?.total_tokens?.toLocaleString('fr-CH') ?? 'Non mesuré'}</strong></div></div><small>${b.usage?.complete ? 'Période complète selon le lecteur natif' : 'Mesures partielles ou inconnues'} · ${when(b.observedAt)}</small>${b.agents?.some(a => a.waitingOpen) ? '<p class="warning-text">Attente ouverte : durée finale inconnue.</p>' : ''}<p class="muted">Les durées de tours peuvent inclure des attentes. Elles ne sont ni du temps humain ni du temps de calcul pur ; ne pas additionner ces colonnes.</p>${(b.usage?.warnings || b.warnings || []).map(w => `<small class="warning-text">${esc(w)} </small>`).join('')}<div><button class="secondary" data-usage="${esc(b.id)}" ${b.usage && b.task && b.release ? '' : 'disabled'}>Préparer la consolidation Odoo Crew</button></div></article>`).join('') || '<p class="muted">Aucune session attribuée pour cette release.</p>'}</section>`;
  }
  function missionView() {
    const s = get(), rows = currentObservations();
    const waiting = rows.flatMap(b => b.agents || []).filter(a => a.state === 'waiting_human').length;
    return `<div class="page"><div class="section-title"><h2>Qui fait quoi ?</h2>${badge(waiting ? 'waiting_human' : 'series', waiting ? `${waiting} décision(s) attendue(s)` : s.selectedTask ? 'Tâche ' + s.selectedTask : 'Release complète')}</div><p class="muted">Les workflows indiquent la responsabilité ; les sessions associées indiquent le dernier état observé.</p>${missionCards({ s, rows, esc, badge })}${nativePanel()}<details class="flow-log"><summary>Autres terminaux et missions du projet</summary>${s.sessions.filter(t => t.project === s.current).map(t => `<button class="file-row" data-session="${t.id}">${providerIcon(t.provider)}<strong>${esc(t.program || 'Shell')}</strong><span>${esc(t.release || 'Sans release')} / ${esc(t.task || 'Release complète')} · ${t.alive ? 'processus actif' : 'arrêté'}</span></button>`).join('')}</details></div>`;
  }
  function effortView() {
    const { detail } = get(), report = detail.effort, bindings = withoutPreparationOverlap(currentObservations(true), report?.preparationSessions);
    const taskIds = [...new Set([...detail.tasks.map(t => t.id), ...(report?.rows || []).map(r => r.task), ...(report?.missing_tasks || []), ...bindings.map(b => b.task).filter(Boolean)])];
    const allRows = taskIds.map(id => {
      const estimates = (report?.rows || []).filter(r => r.task === id), native = bindings.filter(b => b.task === id && b.provider !== 'codex-runtime');
      const task = detail.tasks.find(t => t.id === id);
      const nodes = detail.flows.filter(f => (!f.release || f.release === detail.selectedRelease) && (f.path === task?.flow || task?.flowPaths?.includes(f.path))).flatMap(f => f.nodes || []);
      const agents = agentMeasures(estimates, native, nodes), measures = taskMeasures(estimates, native);
      if (measures.actual != null && agents.some(a => a.actual == null && a.reasons.includes('Intervention enregistrée · durée non mesurée'))) { measures.partial = true; measures.delta = null; }
      return { id, phase: estimates[0]?.phase || (id === 'RELEASE' ? 'closure' : 'task'), title: task?.title || estimates[0]?.title || '', agents, ...measures };
    });
    const releaseTotal = summarizeMeasures(allRows).actual;
    const rows = allRows.filter(r => !get().selectedTask || r.id === get().selectedTask);
    for (const row of rows) row.share = timeShare(row.actual, releaseTotal);
    effortRows = rows;
    const summary = summarizeMeasures(rows), total = summary.actual;
    effortTotals = { initial: knownSum(rows.filter(r => r.phase !== 'preparation').map(r => r.initial)), ...summary };
    return `<div class="page"><div class="section-title"><h2>Prévu, réalisé, écart</h2>${action('associate', 'Activer le suivi d’une session')}</div><div class="metrics"><div class="metric"><span>PRÉVISION INITIALE</span><strong>${minutes(knownSum(rows.map(r => r.initial)))}</strong></div><div class="metric"><span>RÉALISÉ ATTRIBUÉ</span><strong>${minutes(total)}</strong><small>${total == null ? 'Au moins une tâche sans mesure' : 'Tours / périodes mesurés, pas du temps de calcul pur'}</small></div><div class="metric"><span>SESSIONS ASSOCIÉES</span><strong>${bindings.length}</strong><small>Collecte locale toutes les 5 secondes</small></div></div>${!bindings.length ? `<div class="effort-state"><h3>Pourquoi le réalisé peut-il être vide ?</h3><p>L’ouverture d’un terminal n’est pas du temps de travail. Associez la session native à sa tâche et à sa période pour importer les durées disponibles. Les estimations existantes restent conservées.</p>${action('associate', 'Associer ma session')}</div>` : ''}<div class="table-scroll"><table><thead><tr><th>Tâche</th><th>Initial</th><th>Révisé</th><th>Réalisé</th><th>Écart indicatif</th><th>Source</th></tr></thead><tbody>${rows.map(r => `<tr><td><strong>${esc(r.id)}</strong><small>${esc(r.title)}</small></td><td>${hours(r.initial)}</td><td>${hours(r.revised)}</td><td>${hours(r.actual)}${r.partial ? '<small>Partiel</small>' : ''}${r.missingRoles.length ? `<small>À compléter : ${esc(r.missingRoles.map(role => ({ 'odoo-developer': 'développement', 'odoo-tester': 'QA', orchestrateur: 'coordination' })[role] || role).join(', '))}</small>` : ''}</td><td>${r.delta == null ? '—' : (r.delta > 0 ? '+' : '') + Math.round(r.delta) + ' min'}</td><td>${esc(r.basis)}</td></tr>`).join('') || '<tr><td colspan="6">Aucun plan ni estimation. Préparez /odoo-plan puis /odoo-estimate dans votre agent.</td></tr>'}</tbody></table></div><p class="muted">Le réalisé enregistré fait foi lorsqu’il est complet ; les observations natives servent sinon de suivi provisoire. Ces deux sources ne sont jamais additionnées. Un écart partiel n’est pas un bilan de clôture.</p>${(report?.warnings || []).map(w => `<div class="note warning">${esc(w)}</div>`).join('')}${measures()}</div>`;
  }
  function expressView() {
    const flows = get().detail.express || [];
    const labels = { active: 'En cours', running: 'En cours', complete: 'Terminée', blocked: 'Bloquée', waiting_human: 'Votre décision est attendue', deadlocked: 'À débloquer' };
    const stages = { briefing: 'Briefing', express_scope: 'Qualification', express_implementation: 'Correction', express_qa: 'Contrôles ciblés', express_record: 'Journal', express_delivery: 'Livraison', task_done: 'Terminée' };
    return `<div class="page express-page"><div class="section-title"><h2>Interventions express</h2><button class="secondary" data-view="terminal">Revenir au terminal du projet</button></div><p class="muted">Correctifs suivis à l’échelle du projet, indépendamment de la release consultée.</p>${flows.map(f => {
      const active = f.nodes.filter(n => ['claimed', 'ready'].includes(n.status));
      const qa = { pass: 'Contrôles ciblés réussis (résultat enregistré)', retry: 'Contrôles à reprendre', blocked: 'Contrôles bloquants' }[f.expressQA] || 'Contrôles ciblés non renseignés';
      return `<article class="info-card express-card"><div class="card-title"><h3>${esc(f.id.replaceAll('-', ' '))}</h3>${badge(f.status === 'complete' ? 'done' : f.status, labels[f.status] || 'État à vérifier')}</div>${f.promoted ? '<p class="note">Périmètre élargi : poursuite en développement complet.</p>' : ''}<p>${esc(f.release ? 'Changelog : ' + f.release : 'Hors release')} · ${when(f.updatedAt)}</p>${active.map(n => `<p><strong>${esc(stages[n.id] || n.description)}</strong> · ${esc(n.owner || (n.status === 'ready' ? 'Prochaine étape' : 'Responsable non renseigné'))}${n.owner ? ' <small>(responsabilité enregistrée, activité non confirmée)</small>' : ''}</p>`).join('')}<p>${qa}</p><details class="technical-details"><summary>Étapes et traces</summary>${f.nodes.map(n => `<p>${esc(stages[n.id] || n.description)} · ${esc(n.status === 'done' ? 'Parcourue' : n.status === 'claimed' ? 'Prise en charge' : 'À venir')}</p>`).join('')}<pre>${esc(JSON.stringify(f.expressEvidence, null, 2))}</pre>${f.warning ? `<p class="warning-text">${esc(f.warning)}</p>` : ''}</details></article>`;
    }).join('') || '<div class="note">Aucune intervention express enregistrée dans ce dossier. Lancez /odoo-express dans le terminal du projet ; son suivi apparaîtra ici.</div>'}</div>`;
  }
  async function loadFiles(relative = '') {
    const project = get().current;
    if (!project) return;
    const ticket = ++fileTicket;
    exploring = true;
    try {
      const data = await api.cockpit.files(project, relative);
      if (get().current === project && ticket === fileTicket) { explorer = data; explorerProject = project; explorerPath = relative; if (get().view === 'documents') render(); }
    } catch (error) { toast(error.message); }
    finally { if (ticket === fileTicket) exploring = false; }
  }
  function filesView() {
    const s = get(), data = explorerProject === s.current ? explorer : null;
    if (!data && !exploring) loadFiles();
    const parts = (data?.path === '.' ? '' : data?.path || '').split('/').filter(Boolean);
    return `<div class="page"><div class="section-title"><h2>Fichiers du projet</h2><div class="cockpit-actions">${action('search', 'Recherche transversale')}${action('handoff', 'Fiche de reprise')}${action('refresh-files', 'Actualiser')}</div></div><p class="muted">Explorateur en lecture seule. Les secrets, dossiers techniques et liens symboliques sont masqués. Aucun fichier n’est exécuté.</p><div class="cockpit-actions"><button class="secondary" data-files="">Racine</button><button class="secondary" data-files="changelog">Releases</button><button class="secondary" data-files=".odoo-agents">Mémoire du projet</button><button class="secondary" data-files="inbox">Fichiers reçus</button></div><div class="explorer-path">${esc(s.current)}${parts.map((p, i) => ` / <button data-files="${esc(parts.slice(0, i + 1).join('/'))}">${esc(p)}</button>`).join('')}</div><div class="file-explorer">${parts.length ? `<button class="explorer-row" data-files="${esc(parts.slice(0, -1).join('/'))}">↰ Dossier parent</button>` : ''}${(data?.entries || []).map(f => `<button class="explorer-row" ${f.directory ? 'data-files' : 'data-preview'}="${esc(f.path)}" ${f.readable ? '' : 'disabled'}><span>${f.directory ? '▸' : '·'}</span><strong>${esc(f.name)}</strong><small>${f.directory ? 'Dossier' : (f.bytes / 1024).toFixed(1) + ' Ko'} · ${when(f.modified)}${!f.readable ? ' · aperçu indisponible' : ''}</small></button>`).join('') || '<p class="pad muted">Dossier vide ou en cours de lecture.</p>'}</div>${data?.truncated ? '<p class="warning-text">Affichage limité aux 500 premières entrées.</p>' : ''}</div>`;
  }
  function graph() {
    const { detail } = get(), tasks = detail.tasks;
    const scopes = [...new Set(tasks.flatMap(t => t.scopes || []))].sort();
    const shown = tasks.filter(t => (!graphTask || t.id === graphTask || t.depends_on?.includes(graphTask) || tasks.find(t => t.id === graphTask)?.depends_on?.includes(t.id)) && (!graphResource || t.scopes?.includes(graphResource)));
    return `<section class="dependency-graph"><div class="cockpit-form graph-filters"><label>Tâche<select id="graph-task"><option value="">Toutes</option>${tasks.map(t => `<option ${graphTask === t.id ? 'selected' : ''}>${esc(t.id)}</option>`).join('')}</select></label><label>Ressource<select id="graph-resource"><option value="">Toutes</option>${scopes.map(s => `<option ${graphResource === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label></div><div class="graph-nodes">${shown.map(t => `<article class="graph-node"><div class="graph-inputs">${(t.depends_on || []).map(d => `<button data-task="${esc(d)}">${esc(d)}</button> →`).join(' ') || 'Entrée indépendante'}</div><button class="graph-target" data-task="${esc(t.id)}"><strong>${esc(t.id)} · ${esc(t.title)}</strong>${badge(t.status)}</button><small>${esc((t.scopes || []).join(', '))}</small><div class="flow-mini">${(detail.flows.find(f => f.path === t.flow)?.nodes || []).map(n => `<span class="badge ${esc(n.status)}" title="${esc(n.owner || n.role)}">${esc(n.description)}</span>`).join('<span aria-hidden="true"> · </span>')}</div></article>`).join('') || '<p class="muted">Aucune tâche pour ce filtre.</p>'}</div><small>Flèches : dépendances du plan. Étapes du workflow : étapes atteintes ou prêtes, sans modifier leur état.</small></section>`;
  }
  function sourcesExtra() {
    const sources = get().detail.sources, dep = sources.dependencies;
    return `<section class="native-panel"><div class="section-title"><h2>Profil & intégrité des sources</h2>${action('profile', 'Configurer le projet')}</div>${sources.libraries.map(l => `<article class="info-card"><h3>${esc(l.kind)}</h3><p>Branche : <code>${esc(l.revision?.branch || 'Inconnue / HEAD détachée')}</code> · attendue : <code>${esc(l.revision?.expectedBranch || 'Inconnue')}</code></p><code class="path">${esc(l.revision?.commit || 'Commit non vérifié')}</code>${badge(l.revision?.branchMatches === true ? 'validated' : 'unverified', l.revision?.branchMatches === true ? 'Branche de la série' : 'Branche à vérifier')}${l.revision?.expectedCommit ? badge(l.revision.commitMatches ? 'validated' : 'blocked', l.revision.commitMatches ? 'Commit conforme' : 'Commit différent') : ''}</article>`).join('')}<h3>Dépendances transitives Enterprise / OCA</h3><p>${esc(sources.enterpriseRequirement)}</p>${dep ? `<div class="module-chips">${dep.modules.map(m => `<span class="badge ${m.kind === 'unresolved' ? 'blocked' : 'series'}" title="Requis par ${esc(m.requiredBy)}">${esc(m.name)} · ${esc(m.kind)}</span>`).join('')}</div>${dep.warnings.map(w => `<div class="note warning">${esc(w)}</div>`).join('')}<div class="note">${dep.complete ? 'Graphe des manifests résolu dans les bibliothèques déclarées.' : 'Inventaire incomplet : les modules absents ne sont pas attribués arbitrairement à Enterprise ou OCA.'} Les dépendances externes Python/système et modules installés uniquement en base ne sont pas déduits.</div>` : ''}${(sources.ocaLibraries || []).map(l => `<p class="path">OCA : ${esc(l.path)} · ${esc(l.branch || 'branche inconnue')} · ${esc(l.commit || 'commit inconnu')}</p>`).join('')}</section>`;
  }
  function stackPanel() {
    const stack = get().detail.stack;
    if (!stack) return '';
    return `<section class="native-panel"><div class="section-title"><h2>Stack locale & fraîcheur</h2><div class="cockpit-actions">${action('profile', 'Configurer le projet')}${action('palette-env', 'Configurer un environnement')}</div></div><code class="path">${esc(stack.root)}</code><div class="module-chips">${stack.files.map(f => badge(f.present ? 'validated' : 'pending', `${f.name} · ${f.present ? 'présent' : 'absent'}`)).join('')}${stack.tools.map(t => badge(t.installed ? 'series' : 'pending', `${t.name} · ${t.installed ? 'installé' : 'non trouvé'}`)).join('')}</div><p>Dernière restauration déclarée : ${when(stack.restoredAt)}${stack.ageDays != null ? ' · ' + Math.floor(stack.ageDays) + ' jour(s)' : ''}</p><small>${esc(stack.basis)} ${esc(stack.services)}. Présence des fichiers ≠ stack opérationnelle.</small></section>`;
  }
  function augment() {
    applyPreferences();
    alertSidebar();
    const s = get();
    if (s.overviewMode) {
      const entries = s.projects.flatMap(p => [...(p.attention || []), ...(p.warnings || []).map(() => ({}))]);
      document.querySelectorAll('[data-attention-project]').forEach((el, i) => {
        if (entries[i]?.release) { el.dataset.attentionRelease = entries[i].release; el.querySelector('.muted').textContent += ' / ' + entries[i].release; }
      });
      return;
    }
    if (!s.detail || s.projectError) return;
    const contextKey = JSON.stringify([s.current, s.detail.selectedRelease]);
    if (contextKey !== graphContext) { graphTask = ''; graphResource = ''; graphContext = contextKey; }
    const task = s.detail.tasks.find(t => t.id === s.selectedTask);
    $('#context-bar .context-hint')?.remove();
    if (s.view === 'terminal') {
      if (!task && !$('#inspector').hidden) $('#inspector').innerHTML = `<div class="inspector-heading"><span class="eyebrow">RELEASE COMPLÈTE</span><h3>${esc(s.detail.selectedRelease || 'Aucune release')}</h3></div><div class="pad"><p>Les nouvelles sessions concernent la release entière. Choisissez une tâche dans « Portée » pour lui consacrer une session.</p><h3>Critères d’acceptation</h3>${s.detail.tasks.map(t => `<section class="scope-criteria"><button data-task="${esc(t.id)}"><strong>${esc(t.id)} · ${esc(t.title)}</strong></button><ul>${(t.acceptance || []).map(a => `<li>${esc(a)}</li>`).join('')}</ul></section>`).join('')}</div>`;
    }
    if (task && !$('#inspector').hidden) {
      const criteria = $('#inspector .inspector-bottom');
      const timeline = $('#inspector .timeline');
      if (criteria && timeline) timeline.before(criteria);
    }
    const page = $('#content .page') || $('#content');
    if (s.view === 'agents') $('#content').innerHTML = missionView();
    if (s.view === 'express') $('#content').innerHTML = expressView();
    if (s.view === 'release-kanban') board.draw();
    if (s.view === 'effort') {
      $('#content').innerHTML = effortView();
      for (const [index, row] of [...document.querySelectorAll('#content tbody > tr')].entries()) {
        const data = effortRows[index];
        if (!data) continue;
        if (s.detail.tasks.some(t => t.id === data.id)) row.firstElementChild.querySelector('strong').innerHTML = `<button class="text-button" data-task="${esc(data.id)}">${esc(data.id)}</button>`;
        if (data.phase === 'preparation') {
          row.firstElementChild.querySelector('strong').textContent = 'Préparation du plan';
          row.firstElementChild.querySelector('small').textContent = 'Cadrage commun · non réparti rétroactivement';
          row.children[1].textContent = 'Non estimé';
          row.children[2].textContent = 'Non estimé';
        } else if (data.phase === 'closure') row.firstElementChild.querySelector('strong').textContent = 'Clôture commune';
        const suspended = (s.detail.effort?.rows || []).filter(r => r.task === data.id).reduce((sum, r) => sum + (r.suspended_seconds || 0), 0);
        if (suspended > 0) row.children[3].insertAdjacentHTML('beforeend', `<small>Veille exclue : ${hours(suspended / 60)}</small>`);
        for (const note of row.children[3].querySelectorAll('small')) {
          if (note.textContent === 'Partiel') note.textContent = 'Relevé incomplet';
          else if (note.textContent.startsWith('À compléter :')) note.textContent = note.textContent.replace('À compléter :', 'Temps incomplet :');
        }
        const key = JSON.stringify([s.current, s.detail.selectedRelease, data.id]);
        row.firstElementChild.insertAdjacentHTML('beforeend', `<small class="task-time-share">${data.share == null ? 'Part non mesurée' : percent(data.share) + (s.detail.selectedRelease ? ' du temps connu de la release' : ' du temps connu du projet')}</small>`);
        row.firstElementChild.insertAdjacentHTML('beforeend', `<details class="agent-breakdown" data-agent-detail="${esc(key)}" ${expandedAgents.has(key) ? 'open' : ''}><summary>Détail par agent${data.agents.length ? ' (' + data.agents.length + ')' : ''}</summary>${data.agents.length ? `<div class="agent-time-table" role="table" aria-label="Temps par agent pour ${esc(data.id)}"><div class="agent-time-row agent-time-head" role="row"><span role="columnheader">Agent / rôle</span><span role="columnheader">Initial</span><span role="columnheader">Révisé</span><span role="columnheader">Réalisé</span></div>${data.agents.map(a => `<div class="agent-time-row" role="row" data-agent="${esc(a.agent)}"><span role="cell" title="${esc(a.agent)}">${esc(a.label)}</span><span role="cell">${a.initial == null ? 'Non estimé' : hours(a.initial)}</span><span role="cell">${a.revised == null ? 'Non estimé' : hours(a.revised)}</span><span role="cell">${hours(a.actual)}${a.partial ? '<small>Partiel</small>' : ''}${a.basis === 'Natif · non consolidé' ? '<small>Provisoire</small>' : ''}</span></div>`).join('')}</div><small>Selon les rôles renseignés dans les relevés, sans répartir les temps manquants.</small>` : '<small>Aucune répartition par agent disponible pour cette tâche.</small>'}</details>`);
      }
      for (const [index, block] of [...document.querySelectorAll('.agent-breakdown')].entries()) {
        const task = effortRows[index];
        block.querySelector('.agent-time-head')?.insertAdjacentHTML('beforeend', '<span role="columnheader">Part tâche</span>');
        for (const [i, row] of [...block.querySelectorAll('.agent-time-row:not(.agent-time-head)')].entries()) {
          for (const owner of task.agents[i].owners) row.children[0].insertAdjacentHTML('beforeend', `<small>${esc(owner)}</small>`);
          for (const reason of task.agents[i].reasons) row.children[3].insertAdjacentHTML('beforeend', `<small class="measurement-reason">${esc(reason)}</small>`);
          row.insertAdjacentHTML('beforeend', `<span role="cell" class="agent-time-share">${percent(timeShare(task.agents[i].actual, task.actual))}</span>`);
        }
      }
      const allocation = agentAllocation(effortRows);
      if (effortRows.some(r => r.phase === 'preparation')) {
        $('#content .table-scroll th').textContent = 'Travail';
        const phases = [['preparation', 'Préparation du plan'], ['task', 'Tâches'], ['closure', 'Clôture commune']];
        $('#content .metrics').insertAdjacentHTML('afterend', `<section class="phase-breakdown"><h3>Temps par étape</h3>${phases.map(([phase, label]) => {
          const rows = effortRows.filter(r => r.phase === phase);
          const amount = summarizeMeasures(rows).actual;
          return `<div class="allocation-row" data-phase="${phase}"><span>${label}</span><span>${rows.length ? hours(amount) : 'Aucun relevé'}</span><strong>${rows.length ? percent(timeShare(amount, effortTotals.actual)) : '—'}</strong></div>`;
        }).join('')}<p class="muted">Le cadrage est mesuré dès la préparation du plan. Il reste commun : aucune répartition passée ni prévision après coup. La prévision ci-dessus concerne les tâches et la clôture estimées.</p></section>`);
      }
      $('#content .page').insertAdjacentHTML('beforeend', tokenPanel());
      $('#content .table-scroll').insertAdjacentHTML('afterend', `<section class="agent-allocation"><h3>Répartition entre agents · ${s.selectedTask ? 'tâche ' + esc(s.selectedTask) : 'release'}</h3><p class="muted">Parts du temps connu${effortTotals.partial ? ' · relevé partiel' : ''}. Les périodes non mesurées ne valent pas zéro.</p>${allocation.map(a => `<div class="allocation-row" data-allocation-agent="${esc(a.agent)}"><span>${esc(a.label)}</span><span>${hours(a.actual)}${a.partial ? ' · partiel' : ''}</span><strong>${percent(a.share)}</strong></div>`).join('') || '<p class="muted">Aucune répartition disponible.</p>'}</section>`);
      const figures = document.querySelectorAll('#content .metrics .metric strong');
      figures[0].textContent = hours(effortTotals.initial);
      figures[1].textContent = hours(effortTotals.actual);
      if (!s.detail.selectedRelease) $('#content .agent-allocation h3').textContent = 'Répartition entre agents · projet';
    }
    if (s.view === 'sources') page.insertAdjacentHTML('beforeend', sourcesExtra());
    if (s.view === 'environments') {
      const title = [...page.querySelectorAll('.section-title')].find(el => el.textContent.includes('Fichiers reçus'));
      if (title) { title.nextElementSibling?.remove(); title.remove(); }
      page.insertAdjacentHTML('beforeend', stackPanel());
    }
    if (s.view === 'documents') $('#content').innerHTML = filesView();
    if (s.view === 'plan') for (const card of page.querySelectorAll('.task-card')) {
      const t = s.detail.tasks.find(t => t.id === card.dataset.task);
      card.querySelector('.task-description')?.insertAdjacentHTML('beforeend', `<div class="task-acceptance"><strong>Critères d’acceptation</strong><ul>${(t?.acceptance || []).map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>`);
    }
    if (['agents', 'plan'].includes(s.view) && s.detail.selectedRelease) ($('#content .page') || $('#content')).insertAdjacentHTML('beforeend', qualityPanel(s.detail.quality, s.selectedTask));
    lifecycleUI({ s, esc, badge, when });
    if (s.view === 'terminal' && !s.detail.selectedRelease && !$('#inspector').hidden) {
      $('#inspector').innerHTML = '<div class="pad"><h3>Travail hors release</h3><p>Démarre ton travail dans ce terminal. À la création d’une release, son plan et ses critères seront accessibles ici.</p></div>';
    }
    $('#context-bar .context-hint')?.remove();
    $('#environment-select').parentElement.classList.add('environment-context');
    $('#environment-select').parentElement.firstChild.textContent = 'ENVIRONNEMENT';
    $('#environment-select').title = 'Repère pour les nouveaux terminaux ; ne change ni la connexion, ni les permissions, ni le terminal existant.';
    $('.project-header').classList.add('compact-project');
    $('#breadcrumb').textContent = '';
    if ($('#breadcrumb').previousElementSibling) $('#breadcrumb').previousElementSibling.textContent = '';
    const pathLabel = $('#project-meta > span');
    if (pathLabel) pathLabel.hidden = true;
    $('.project-header [data-action="folder"]').title = s.current;
    plainLanguageUI({ s, hasNative: currentObservations().length > 0, actual: effortTotals.actual, partial: effortTotals.partial });
    for (const option of $('#release-select').options) {
      const r = s.detail.releases.find(r => r.id === option.value);
      if (r) { option.textContent = option.selected ? r.title : `${r.id.slice(0, 10)} · ${r.title} · ${r.status}`; option.title = `${r.id} · ${r.taskCount ?? '?'} tâches / points`; }
    }
    const selectedRelease = s.detail.releases.find(r => r.id === s.detail.selectedRelease);
    if (selectedRelease) $('#release-select').insertAdjacentHTML('afterend', `<span class="release-summary">${badge(selectedRelease.status, selectedRelease.status === 'ouverte' ? 'Ouverte' : selectedRelease.status === 'close' ? 'Close' : selectedRelease.status)}<span>${esc(selectedRelease.id.slice(0, 10))}</span></span>`);
    const status = workStatus(s, observations);
    $('#release-select').parentElement.classList.add('release-context');
    $('#release-select').parentElement.firstChild.textContent = 'RELEASE CONSULTÉE';
    const completed = s.detail.tasks.filter(t => t.status === 'validated').length;
    const resources = ['documents', 'environments', 'sources'].includes(s.view);
    $('#context-bar').hidden = resources || s.view === 'express';
    if (resources) $('#content').insertAdjacentHTML('afterbegin', `<nav class="project-resources" aria-label="Ressources du projet">${[['documents', 'Fichiers'], ['environments', 'Environnements'], ['sources', 'Sources']].map(([id, label]) => `<button class="${s.view === id ? 'active' : ''}" data-view="${id}">${label}</button>`).join('')}</nav>`);
    $('[data-view="project"]').classList.toggle('active', resources);
  }
  function qualityPanel(quality, task) {
    const data = quality || { reports: [], warnings: [], documents: [] };
    const reports = data.reports.filter(r => !task || r.task === task || !r.task);
    return `<section class="native-panel quality-panel"><div class="section-title"><h2>Volume de tests & preuves</h2><span>${task ? 'Tâche ' + esc(task) + ' et rapports de release' : 'Release complète'}</span></div>${reports.map(r => `<article class="info-card"><h3>${esc(r.name)} ${badge(r.status === 'passed' ? 'validated' : r.status === 'failed' ? 'blocked' : 'unverified', r.status === 'passed' ? 'Rapport vert' : r.status === 'failed' ? 'Échecs présents' : 'Non concluant')}</h3><p>${r.task ? 'Tâche ' + esc(r.task) : 'Portée tâche non renseignée'} · fichier daté du ${when(r.modifiedAt)}</p><div class="measure-grid"><div><span>Exécutés</span><strong>${r.total - r.skipped}</strong></div><div><span>Réussis</span><strong>${r.passed}</strong></div><div><span>Échecs / erreurs</span><strong>${r.failed} / ${r.errors}</strong></div><div><span>Ignorés</span><strong>${r.skipped}</strong></div></div><button class="text-button" data-preview="${esc(r.path)}">Ouvrir la preuve JUnit</button></article>`).join('') || '<div class="note">Volume non renseigné : aucun rapport JUnit exploitable dans cette release. Un statut QA ne permet pas de deviner combien de tests ont été exécutés.</div>'}<div class="cockpit-actions">${data.documents.map(p => `<button class="secondary" data-preview="${esc(p)}">Lire ${esc(p.split('/').at(-1))}</button>`).join('')}</div><small>Chaque rapport correspond à une preuve distincte. Les relances ne sont pas additionnées et un rapport vert ne certifie pas à lui seul toute la recette Odoo.</small>${data.warnings.map(w => `<div class="note warning">${esc(w)}</div>`).join('')}</section>`;
  }
  function commandModal(value) {
    prepared = value.command;
    modal(`<span class="eyebrow">COMMANDE À VÉRIFIER</span><h2>Prête à copier</h2><p>${esc(value.note)}</p><pre class="document-text">${esc(value.command)}</pre>${action('copy-command', 'Copier')}<p class="muted">Aucune commande n’est exécutée par cette fenêtre.</p>`);
  }
  function associationForm() {
    const s = get(), c = selected();
    modal(`<h2>Associer une session native</h2><p>Choisissez l’attribution avant de sélectionner le fichier. Seuls états, identifiants, dates et compteurs sont lus ; les prompts et résultats restent hors du cockpit.</p><div class="cockpit-form"><label>Fournisseur<select id="native-provider"><option value="codex">Codex · historique JSONL</option><option value="claude">Claude · historique JSONL</option></select></label><label>Tâche<select id="native-task"><option value="">Non attribuée</option>${s.detail.tasks.map(t => `<option value="${esc(t.id)}" ${t.id === c.task ? 'selected' : ''}>${esc(t.id)} · ${esc(t.title)}</option>`).join('')}</select></label><label>Workflow<select id="native-flow"><option value="">Non attribué</option>${s.detail.flows.map(f => `<option value="${esc(f.path)}" ${f.path === c.flow ? 'selected' : ''}>${esc(f.id)}</option>`).join('')}</select></label><label>Terminal<select id="native-terminal"><option value="">Aucun</option>${s.sessions.filter(t => t.project === s.current).map(t => `<option value="${t.id}" ${t.id === c.terminal ? 'selected' : ''}>${esc(t.program || 'Shell')} · ${t.id.slice(0, 8)}</option>`).join('')}</select></label><label>Depuis (facultatif)<input type="datetime-local" id="native-since"></label><label>Jusqu’au (facultatif)<input type="datetime-local" id="native-until"></label></div><div class="cockpit-actions">${action('bind', 'Choisir le JSONL')}${action('claude-hooks', 'Préparer Claude avec hooks')}</div><p class="muted">Les hooks Claude observent aussi les permissions et sous-agents. Ils ne prennent aucune décision. Les fenêtres d’une même session ne peuvent pas se chevaucher.</p>`);
    $('#modal h2').textContent = 'Mesures natives · réglage avancé';
    $('#modal-content > p').textContent = 'Facultatif : relier une conversation Claude/Codex à ses mesures de temps et de jetons. Votre terminal reste le même pour tout le projet. Le suivi des releases, tâches et workflows fonctionne sans cette association. Pour une conversation qui couvre toute la release, laissez la portée release complète ; attribuez une tâche seulement pour une période délimitée.';
    $('#native-task option[value=""]').textContent = 'Release complète · sans attribution à une tâche';
  }
  function formAssociation() {
    const c = selected();
    for (const k of ['task', 'flow', 'terminal', 'since', 'until', 'provider']) c[k] = $('#native-' + k).value || null;
    c.role = $('#native-role')?.value || 'orchestrator';
    return c;
  }
  function profileForm() {
    const s = get(), p = s.settings.profiles?.[s.current] || {};
    modal(`<h2>Profil local du projet</h2><p>Ces préférences complètent les métadonnées du projet sans les modifier. La série reste celle de .odoo-agents/config ou du manifest.</p><div class="cockpit-form"><label>Nature du projet<select id="profile-kind">${[['auto', 'Déduire automatiquement'], ['module', 'Modules custom'], ['studio', 'Studio'], ['online', 'Odoo Online']].map(([v, l]) => `<option value="${v}" ${(p.kind || 'auto') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label>Dernière restauration déclarée<input type="datetime-local" id="profile-restored" value="${p.restoredAt ? localDate(p.restoredAt) : ''}"></label><label>Commit Community attendu (optionnel)<input id="profile-community" value="${esc(p.communityCommit || '')}" maxlength="40" placeholder="SHA complet"></label><label>Commit Enterprise attendu (optionnel)<input id="profile-enterprise" value="${esc(p.enterpriseCommit || '')}" maxlength="40" placeholder="SHA complet"></label></div><div class="cockpit-actions">${action('save-profile', 'Enregistrer')}${action('stack-root', 'Choisir la stack')}${action('oca-root', 'Ajouter une bibliothèque OCA')}${action('reset-profile', 'Revenir au profil déduit')}</div><p class="muted">Aucune restauration ni commande Docker/PostgreSQL n’est lancée.</p>`);
  }
  function localDate(value) { const d = new Date(value); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  function preferences() {
    const ui = get().settings.ui || {};
    modal(`<div class="preferences"><h2>Préférences</h2>
      <form id="preferences-form">
        <fieldset><legend>Terminal</legend><div class="cockpit-form">
          <label>Police<select id="pref-font">${[['mono', 'DejaVu Sans Mono'], ['liberation', 'Liberation Mono'], ['system', 'Monospace système']].map(([v, l]) => `<option value="${v}" ${(ui.font || 'mono') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label>Taille du texte (px)<input type="number" min="11" max="22" step="1" id="pref-size" value="${ui.fontSize || 13}" required></label>
        </div></fieldset>
        <fieldset><legend>Affichage</legend><div class="cockpit-form">
          <label>Largeur de la barre latérale (px)<input type="number" min="210" max="360" step="1" id="pref-sidebar" value="${ui.sidebarWidth || 258}" required></label>
          <label class="checkbox-label"><input type="checkbox" id="pref-contrast" ${ui.highContrast ? 'checked' : ''}> Contraste renforcé</label>
        </div></fieldset>
        <div class="preferences-actions"><button type="button" class="secondary" data-action="cancel-preferences">Annuler</button><button type="submit" class="primary">Enregistrer</button></div>
      </form>
      <section><h3>Dossiers partagés</h3><div class="cockpit-actions">${action('workspace-root', 'Dossier des projets')}${action('shared-sources', 'Sources Odoo')}</div><p class="muted">Pour un projet particulier : Projet → Sources → Configurer le projet.</p></section>
      <details class="keyboard-help"><summary>Raccourcis clavier</summary><dl>
        <dt>Nouvel onglet terminal</dt><dd>Ctrl Shift T</dd><dt>Rechercher dans le terminal</dt><dd>Ctrl Shift F</dd>
        <dt>Changer de projet</dt><dd>Ctrl Alt ↑ / ↓</dd><dt>Changer de terminal</dt><dd>Ctrl PageUp / PageDown</dd>
        <dt>Terminal · Plan · Kanban · Express · Agents · Temps · Projet</dt><dd>Alt 1…7</dd>
        <dt>Skills</dt><dd>Ctrl Shift P</dd><dt>Rechercher un fichier</dt><dd>Ctrl Alt F</dd>
      </dl></details></div>`);
    $('#preferences-form').addEventListener('submit', async event => {
      event.preventDefault();
      if (!event.target.reportValidity()) return;
      try {
        setSettings(await api.settings({ ui: { font: $('#pref-font').value, fontSize: Number($('#pref-size').value), sidebarWidth: Number($('#pref-sidebar').value), highContrast: $('#pref-contrast').checked } }));
        $('#modal').close(); render();
      } catch (error) { toast(error.message); }
    });
  }
  async function palette(env = false) {
    const skills = await api.cockpit.palette();
    modal(`<h2>Préparer un skill</h2><p>Choisissez le fournisseur de votre agent. Les confirmations et protections restent celles d’Odoo Crew.</p><div class="cockpit-form"><label>Agent<select id="skill-provider"><option value="claude">Claude</option><option value="codex">Codex</option></select></label><label>Filtrer<input id="skill-filter" placeholder="Rechercher un skill" value="${env ? 'odoo-env' : ''}"></label></div><div id="skill-list">${skills.map(s => `<button class="file-row" data-skill="${s.name}" ${env && s.name !== 'odoo-env' ? 'hidden' : ''}><strong>${s.name}</strong><span>${esc(s.description)}</span></button>`).join('')}</div>`);
  }
  function searchDialog() {
    modal(`<h2>Recherche transversale</h2><p>Demandes, preuves et mémoire Markdown/TXT des projets enregistrés. PDF non indexés.</p><div class="cockpit-form"><label>Texte<input id="global-query" placeholder="Au moins deux caractères"></label></div>${action('run-search', 'Rechercher')}<div id="global-results" aria-live="polite"></div>`);
    $('#global-query').focus();
  }
  async function runSearch() {
    const query = $('#global-query').value, ticket = ++searchTicket;
    $('#global-results').textContent = 'Recherche…';
    const results = [];
    for (const p of get().projects) {
      if (ticket !== searchTicket || !$('#global-results')) return;
      try { results.push({ project: p, ...await api.cockpit.search(p.path, query) }); }
      catch { results.push({ project: p, results: [], error: 'Recherche indisponible dans ce projet.' }); }
    }
    if (ticket !== searchTicket || !$('#global-results')) return;
    $('#global-results').innerHTML = results.map(r => `<h3>${esc(r.project.name)}</h3>${r.results.map(m => `<button class="search-result" data-search-project="${esc(r.project.path)}" data-search-path="${esc(m.path)}"><small>${esc(m.path)}:${m.line}</small><p>${esc(m.excerpt)}</p></button>`).join('') || '<p class="muted">Aucun résultat.</p>'}${r.truncated || r.skipped || r.error ? `<p class="warning-text">${esc(r.error || 'Résultats limités ou documents ignorés.')}</p>` : ''}`).join('');
  }
  async function reloadProject() {
    const s = get();
    const b = await api.bootstrap(); setSettings(b.settings);
    await chooseProject(s.current, s.detail.selectedRelease);
  }
  document.addEventListener('click', async event => {
    const el = event.target.closest('button'); if (!el) return;
    try {
      if (el.dataset.skill) return commandModal(await api.cockpit.prepareSkill(el.dataset.skill, $('#skill-provider').value));
      if (el.dataset.missionTask) { selectTask(el.dataset.missionTask); return; }
      if (el.hasAttribute('data-files')) return await loadFiles(el.dataset.files);
      if (el.dataset.preview) {
        const preview = await api.cockpit.preview(get().current, el.dataset.preview);
        if (preview.type !== 'pdf') modal(`<h2>${esc(preview.name)}</h2>${preview.type === 'image' ? `<img class="file-image" src="${esc(preview.url)}" alt="${esc(preview.name)}">` : documentBody(preview, esc)}`);
        return;
      }
      if (el.dataset.usage) return commandModal(await api.cockpit.prepareUsage(el.dataset.usage));
      if (el.dataset.forgetNative) { if (await api.cockpit.forget(el.dataset.forgetNative)) await refreshNative(); return; }
      if (el.dataset.nativeEvents) {
        const binding = observations.find(b => b.id === el.dataset.nativeEvents), agent = binding?.agents.find(a => a.nativeId === el.dataset.nativeAgent);
        if (agent) modal(`<h2>Événements filtrés · ${esc(agent.nativeId)}</h2><code class="path">${esc(binding.source)}</code><p>Les lignes sont des références à la source native ; aucun contenu d’outil ni prompt n’est repris.</p>${agent.events.map(e => `<div class="event-row"><time>${when(e.at)}</time><strong>${esc(e.kind)}</strong><span>${esc(states[e.state])}</span><small>${esc(e.tool || '')} · ligne ${e.line}</small></div>`).join('')}`);
        return;
      }
      if (el.dataset.searchProject) {
        const doc = await api.document(el.dataset.searchProject, el.dataset.searchPath);
        modal(`<h2>${esc(doc.name)}</h2><pre class="document-text">${esc(doc.text)}</pre>`); return;
      }
      switch (el.dataset.cockpit) {
        case 'associate': associationForm(); $('#native-provider').closest('.cockpit-form').insertAdjacentHTML('beforeend', `<label>Rôle pour les mesures<select id="native-role"><option value="orchestrator">Orchestrateur</option>${['odoo-analyst', 'odoo-developer', 'odoo-studio', 'odoo-tester', 'odoo-support'].map(r => `<option>${r}</option>`).join('')}</select></label><label>Identifiant Codex (optionnel, service local)<input id="native-codex-id" placeholder="Identifiant natif exact"></label>`); $('#modal-content').insertAdjacentHTML('beforeend', `<div class="cockpit-actions">${action('codex-runtime', 'Observer cet identifiant Codex')}</div><p class="muted">Connexion au service local existant uniquement. Aucun thread n’est démarré ou repris, aucune permission accordée. Nécessite une version proposant app-server proxy.</p>`); break;
        case 'codex-runtime': if (await api.cockpit.bindCodexRuntime({ ...formAssociation(), nativeId: $('#native-codex-id').value.trim() })) { $('#modal').close(); await refreshNative(); render(); } break;
        case 'bind': if (await api.cockpit.bind(formAssociation())) { $('#modal').close(); await refreshNative(); render(); } break;
        case 'claude-hooks': commandModal(await api.cockpit.prepareClaude(formAssociation())); await refreshNative(); break;
        case 'copy-command': await api.clipboard.write(prepared); toast('Commande copiée, non exécutée.'); break;
        case 'graph': graphOn = !graphOn; render(); break;
        case 'profile': profileForm(); $('#modal-content').insertAdjacentHTML('beforeend', `<h3>Emplacements propres à ce projet</h3><div class="cockpit-actions">${action('working-directory', 'Dossier de travail')}${action('community-root', 'Sources Community')}${action('enterprise-root', 'Sources Enterprise')}</div><p class="muted">Dossier des nouveaux terminaux : ${esc(get().settings.profiles?.[get().current]?.workingDirectory || get().current)}. Les terminaux existants gardent leur dossier.</p>`); break;
        case 'working-directory': if (await api.cockpit.profileFolder(get().current, 'workingDirectory')) { await reloadProject(); $('#modal').close(); } break;
        case 'community-root': if (await api.cockpit.profileFolder(get().current, 'communityRoot')) { await reloadProject(); $('#modal').close(); } break;
        case 'enterprise-root': if (await api.cockpit.profileFolder(get().current, 'enterpriseRoot')) { await reloadProject(); $('#modal').close(); } break;
        case 'save-profile': await api.cockpit.profile(get().current, { kind: $('#profile-kind').value, restoredAt: $('#profile-restored').value, communityCommit: $('#profile-community').value.trim(), enterpriseCommit: $('#profile-enterprise').value.trim() }); await reloadProject(); $('#modal').close(); break;
        case 'stack-root': if (await api.cockpit.profileFolder(get().current, 'stackRoot')) { await reloadProject(); $('#modal').close(); } break;
        case 'oca-root': if (await api.cockpit.profileFolder(get().current, 'ocaRoots')) { await reloadProject(); $('#modal').close(); } break;
        case 'reset-profile': await api.cockpit.resetProfile(get().current); await reloadProject(); $('#modal').close(); break;
        case 'preferences': preferences(); break;
        case 'workspace-root': { const value = await api.workspaceRoot(); if (value) { setProjects(value.projects); setSettings((await api.bootstrap()).settings); $('#modal').close(); if (value.projects.length) await chooseProject(value.projects[0].path); else render(); } break; }
        case 'shared-sources': if (await api.sourceRoot()) { $('#modal').close(); if (get().current) await reloadProject(); } break;
        case 'palette': await palette(); break;
        case 'palette-env': await palette(true); break;
        case 'search': searchDialog(); break;
        case 'run-search': await runSearch(); break;
        case 'refresh-files': await loadFiles(explorerProject === get().current ? explorerPath : ''); break;
        case 'handoff': handoff = await api.cockpit.handoff(selected()); modal(`<h2>Fiche de reprise portable</h2><p>À transmettre à Claude ou Codex. Leurs conversations restent distinctes.</p><pre class="document-text">${esc(handoff)}</pre><div class="cockpit-actions">${action('copy-handoff', 'Copier')}${action('export-handoff', 'Exporter en Markdown')}</div>`); break;
        case 'copy-handoff': await api.clipboard.write(handoff); toast('Fiche copiée.'); break;
        case 'export-handoff': if (await api.cockpit.exportHandoff(handoff)) toast('Fiche de reprise exportée.'); break;
      }
    } catch (error) { toast(error.message); }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'skill-filter') for (const item of document.querySelectorAll('[data-skill]')) item.hidden = !item.textContent.toLowerCase().includes(event.target.value.toLowerCase());
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'graph-task') { graphTask = event.target.value; render(); }
    if (event.target.id === 'graph-resource') { graphResource = event.target.value; render(); }
    if (event.target.id === 'native-task') {
      $('#native-flow').value = get().detail.tasks.find(t => t.id === event.target.value)?.flow || '';
      const role = get().detail.flows.find(f => f.path === $('#native-flow').value)?.nodes.find(n => n.status === 'claimed')?.role;
      if (role && [...$('#native-role').options].some(o => o.value === role)) $('#native-role').value = role;
    }
  });
  document.addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]')) { if (event.key === 'Enter' && event.target.id === 'global-query') runSearch().catch(e => toast(e.message)); return; }
    const s = get();
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'p') { event.preventDefault(); palette().catch(e => toast(e.message)); }
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'f') { event.preventDefault(); searchDialog(); }
    if (event.altKey && !event.ctrlKey && /^[1-7]$/.test(event.key)) { event.preventDefault(); setView(['terminal', 'plan', 'release-kanban', 'express', 'agents', 'effort', 'project'][Number(event.key) - 1]); }
    if (event.ctrlKey && event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault(); const at = s.projects.findIndex(p => p.path === s.current), step = event.key === 'ArrowDown' ? 1 : -1;
      const p = s.projects[(at + step + s.projects.length) % s.projects.length]; if (p) chooseProject(p.path).catch(e => toast(e.message));
    }
    if (event.ctrlKey && ['PageUp', 'PageDown'].includes(event.key)) {
      event.preventDefault(); const own = s.sessions.filter(t => t.project === s.current), at = own.findIndex(t => t.id === s.selectedSession.get(s.current));
      const next = own[(at + (event.key === 'PageDown' ? 1 : -1) + own.length) % own.length];
      if (next) { selectSession(next.id); setView('terminal'); }
    }
  });
  $('.top-actions').insertAdjacentHTML('afterbegin', '<button class="text-button" data-view="project">Projet</button><button class="text-button" data-cockpit="palette" title="Ctrl Shift P">Skills</button><button class="text-button" data-cockpit="preferences">Préférences</button>');
  setInterval(refreshNative, 5000);
  return { augment, refreshNative, applyPreferences, alertSidebar, rememberBoard: board.remember, openTask: board.openTask };
}

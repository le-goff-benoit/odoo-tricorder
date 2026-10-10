const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, Menu, Notification, clipboard } = require('electron');
const { spawn, execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const socketNet = require('node:net');
const { pathToFileURL } = require('node:url');
const { promisify } = require('node:util');
const { sessionContext, saveContext } = require('./terminal-context.cjs');
const { catalogRevision } = require('./catalog-revision.cjs');
const { workflowCatalogRequest } = require('./backend-request.cjs');
const { initialWorkspace, statePaths, workspaceLoader } = require('./workspace-window.cjs');

protocol.registerSchemesAsPrivileged([{ scheme: 'tricorder', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
const LINKS = {
  tricorder: 'https://github.com/le-goff-benoit/odoo-tricorder',
  agents: 'https://github.com/le-goff-benoit/odoo-crew',
};
const exec = promisify(execFile);
const home = process.env.TRICORDER_HOME || os.homedir();
const stores = statePaths();
const stateDir = stores.cockpit;
app.setPath('userData', path.join(stateDir, 'chromium'));
const socketPath = path.join(process.env.TRICORDER_RUNTIME_DIR || path.join(process.env.TRICORDER_STATE_DIR ? stateDir : process.env.XDG_RUNTIME_DIR || stateDir, 'odoo-tricorder'), 'pty.sock');
const backend = app.isPackaged ? path.join(process.resourcesPath, 'backend') : path.join(__dirname, '..', 'backend');
let window, broker, buffer = '', nextRequest = 0, settings = {}, projects = new Set(), scanning;
const pending = new Map();
let studio, ensureCockpitLoaded;
let legacyTerminals;
const adoptLegacy = s => ({ ...s, id: 'legacy:' + s.id, project: path.basename(s.project) === '.tricorder' ? path.dirname(s.project) : s.project });
async function legacySessions() {
  const socket = path.join(stores.studio, 'studio-pty.sock');
  if (!fs.existsSync(socket)) return [];
  legacyTerminals ||= new (require('./studio-terminal.cjs').TerminalBroker)(path.join(backend, 'terminal_service.py'), socket, message => {
    if (window && !window.isDestroyed()) window.webContents.send('terminal:event', { ...message, ...(message.session ? { session: 'legacy:' + message.session } : {}) });
  });
  try {
    // Adopt existing sessions only. Opening Tricorder must not start a second broker.
    if (!legacyTerminals.client || legacyTerminals.client.destroyed) await legacyTerminals.connect();
    return (await legacyTerminals.request({ action: 'list' })).map(adoptLegacy);
  } catch { return []; }
}
async function showCockpit() {
  await ensureCockpitLoaded();
  window.webContents.send('workspace:navigate', { route: 'project' });
  window.setMinimumSize(1000, 650);
  window.setTitle('Tricorder');
  window.webContents.focus();
}
async function showWorkflows(argv = []) {
  studio.queuePortable(argv);
  await ensureCockpitLoaded();
  window.webContents.send('workspace:navigate', { route: 'workflows' });
  window.webContents.focus();
}

function loadSettings() {
  try { settings = JSON.parse(fs.readFileSync(path.join(stateDir, 'settings.json'), 'utf8')); } catch { settings = {}; }
  settings.extras ||= []; settings.favorites ||= []; settings.contexts ||= {};
}
function saveSettings() {
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const target = path.join(stateDir, 'settings.json');
  fs.writeFileSync(target + '.tmp', JSON.stringify(settings, null, 2), { mode: 0o600 });
  fs.renameSync(target + '.tmp', target);
}
async function catalog(payload) {
  if (payload.action === 'project') { payload.sourceRoot = settings.sourceRoot; payload.profile = settings.profiles?.[payload.project]; }
  try {
    const task = exec('python3', [path.join(backend, 'catalog.py'), '--stdin'], { maxBuffer: 12 * 1024 * 1024, timeout: 60000 });
    task.child.stdin.on('error', () => {});
    task.child.stdin.end(JSON.stringify(payload));
    const { stdout } = await task;
    const data = JSON.parse(stdout);
    if (data.error) throw new Error(data.error);
    return data.result;
  } catch (error) {
    let message = error.message;
    try { message = JSON.parse(error.stdout).error || message; } catch {}
    throw new Error(message);
  }
}
function checkedProject(value) {
  if (typeof value !== 'string' || !projects.has(value)) throw new Error('Projet non enregistré');
  return value;
}
async function overview() {
  if (scanning) return scanning;
  scanning = catalog({ action: 'overview', home: settings.workspaceRoot || home, extras: settings.extras }).then(result => {
    projects = new Set(result.map(p => p.path));
    return result;
  }).finally(() => { scanning = null; });
  return scanning;
}
function connect() {
  return new Promise((resolve, reject) => {
    const client = socketNet.createConnection(socketPath);
    client.once('error', reject);
    client.once('connect', () => {
      client.removeListener('error', reject);
      broker = client; buffer = '';
      client.setEncoding('utf8');
      client.on('data', chunk => {
        buffer += chunk;
        let end;
        while ((end = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
          let message;
          try { message = JSON.parse(line); } catch { continue; }
          if (message.event) {
            if (window && !window.isDestroyed()) window.webContents.send('terminal:event', message);
          } else {
            const task = pending.get(message.id);
            if (task) { pending.delete(message.id); clearTimeout(task.timer); message.error ? task.reject(new Error(message.error)) : task.resolve(message.result); }
          }
        }
      });
      client.on('error', () => {});
      client.on('close', () => {
        if (broker === client) broker = null;
        for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('Service terminal déconnecté')); }
        pending.clear();
        if (window && !window.isDestroyed()) window.webContents.send('terminal:event', { event: 'disconnected' });
      });
      resolve();
    });
  });
}
async function ensureBroker() {
  if (broker && !broker.destroyed) return;
  try { await connect(); return; } catch {}
  const child = spawn('python3', [path.join(backend, 'terminal_service.py'), socketPath], { detached: true, stdio: 'ignore' });
  child.unref();
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    try { await connect(); return; } catch {}
  }
  throw new Error('Impossible de démarrer le service de terminaux Python 3');
}
let connecting;
async function terminal(request) {
  if (request.session?.startsWith('legacy:')) {
    if (!legacyTerminals?.client) await legacySessions();
    if (!legacyTerminals?.client) throw new Error('Ancien terminal indisponible');
    const result = await legacyTerminals.request({ ...request, session: request.session.slice(7) });
    if (result?.session) result.session = adoptLegacy(result.session);
    return result;
  }
  if (!broker || broker.destroyed) {
    connecting ||= ensureBroker().finally(() => { connecting = null; });
    await connecting;
  }
  return new Promise((resolve, reject) => {
    const id = ++nextRequest;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Le terminal ne répond pas')); }, 15000);
    pending.set(id, { resolve, reject, timer });
    broker.write(JSON.stringify({ ...request, id }) + '\n');
  });
}
function handle(name, callback) {
  ipcMain.handle(name, (event, ...args) => {
    if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || !event.senderFrame.url.startsWith('tricorder://app/')) throw new Error('Origine refusée');
    return callback(...args);
  });
}
function wireAPI() {
  handle('workflow-terminal', async request => {
    const { project } = await studio.backend({ action: 'project.get', project: request.project });
    const all = [...await terminal({ action: 'list' }), ...await legacySessions()];
    settings.workflowTerminals ||= {};
    const bound = request.conversation && all.find(s => s.id === settings.workflowTerminals[request.conversation] && s.alive);
    if (bound && !request.resume) return { ...bound, agentState: bound.idleShell ? 'stopped' : bound.provider ? 'active' : 'busy' };
    if (bound && request.resume && !bound.promptVerified) throw new Error('Cette session ne vérifie pas le prompt (ancien service ou shell non pris en charge). Elle reste intacte. Quand son travail est terminé, fermez son onglet puis reprenez la conversation pour ouvrir un terminal compatible.');
    if (bound && request.resume && !bound.idleShell) throw new Error('Le terminal n’est pas au prompt du shell. Retrouvez l’agent actif ; aucune commande de reprise envoyée.');
    if (!request.conversation) {
      const cwd = request.design === true ? (await studio.backend({ action: 'design.workspace', project: project.id })).cwd : project.path;
      return all.find(s => s.project === project.path && s.alive) || terminal({ action: 'create', project: project.path, workingDirectory: cwd, cols: 100, rows: 30, cleanShell: process.env.TRICORDER_TEST_MODE === '1' });
    }
    const conversation = await studio.backend({ action: 'conversation.get', conversation: request.conversation });
    if (conversation.project !== project.id) throw new Error('Conversation d’un autre projet');
    // A previous session is not a first launch. Looking up a closed conversation
    // must not create a shell or invoke its agent before an explicit resume.
    if (!bound && !request.resume && (settings.workflowTerminals[conversation.id] || settings.workflowAgents?.[conversation.id])) {
      return { project: project.path, agentState: 'stopped', terminalState: 'closed' };
    }
    const session = bound || await terminal({ action: 'create', project: project.path, workingDirectory: project.path, cols: 100, rows: 30, cleanShell: process.env.TRICORDER_TEST_MODE === '1' });
    const quote = value => "'" + String(value).replace(/'/g, "'\\''") + "'";
    const command = ['python3', path.join(backend, 'workflow_cli.py'), '--state', stores.studio, '--conversation', conversation.id].map(quote).join(' ');
    const prompt = conversation.definition.schema === 2 ? require('./workflow-prompt.cjs').buildV2Prompt(conversation, command) : `Tu pilotes le workflow Tricorder « ${conversation.definition.title} » dans cette conversation native. Commence par status : reprends les tâches déjà enregistrées, sans les dupliquer ; si aucune demande n’est présente, attends ma demande. Enregistre les nouvelles tâches avec le pont ci-dessous. Le graphique suit les états réels du moteur. Ne crée pas un second flow historique. Les profils de blocs déterminent tes missions ; consulte-les avant le travail.
Pont : ${command}
Commandes : status (sans stdin, --offset N et --query texte pour paginer/rechercher), inspect, read, add, ready, dispatch, claim, context, execute, result, ask, answer, artifact, heartbeat, prepare-candidate (objet JSON sur stdin).
inspect: {run} ouvre le détail d’une exécution ; read: {run,sha256,offset?} lit une page d’artefact ($artifact). Consulter next pour charger la suite, ne jamais confondre un aperçu avec le contenu complet. add: {request,project?,key?,depends_on?:[identifiants_de_tâches]}, ready: {run,offset?,limit?} renvoie {items,parameters,project,total,next} ; paramètres communs une seule fois, continuer avec next pour tous les blocs. claim: {run,node}, result: {run,node,token,result:{ok,summary,outputs,evidence?}}, ask: {run,node,token,text}, answer: {run,node,question,text}, execute: {run,node}, artifact: {path}, context: {run,node,context:{environment:"local",neutralized_copy:"nom de la copie réellement préparée"}}. Avant une recette Odoo, préparer la copie puis enregistrer ce contexte local ; ne pas déclarer une copie fictive.
Pendant un bloc long, heartbeat: {run,node,token} toutes les 60 secondes. Pour tester le candidat transmis par un bloc de développement, prepare-candidate: {run,node,token} crée une copie contenant ce candidat ; vérifier cette copie et joindre les preuves via artifact.
Après validation du périmètre de travail, enregistre chaque demande métier avec add et une clé stable. Pour lancer des agents indépendants en parallèle, appelle dispatch: {runs?:[identifiants des exécutions],offset?:0,limit?:25,node_offsets?:{run_id:index}}, ou {} pour les demandes de cette conversation. dispatch démarre une vague sans attendre la fin : au plus quatre workers, sous le plafond global de quatre étapes et les verrous du projet. La réponse donne items[].started (bloc, PID, tentative) et items[].waiting (état et raison), total et next ; poursuis la pagination pour examiner les autres demandes. Les précontrôles sont bornés à 100 blocs par appel : si items[].next_node est renseigné, continue avec node_offsets pour cette exécution ; inspect/ready donnent le détail complet des attentes. Aucun travail ne démarre par la seule lecture de status. Une vague ne crée pas de file autonome : après les résultats, réponses ou décisions, consulte status/inspect puis rappelle dispatch pour la suite autorisée. Les décisions et réceptions humaines restent dans Tricorder ; ne les contourne pas. Une tentative en cours, un échec ou un effet externe incertain n’est jamais relancé par dispatch.
Montre les demandes réellement démarrées, leurs agents, les questions et les dépendances en attente. Ne dis pas « quatre agents travaillent » si quatre blocs sont seulement prêts. Coordonne depuis ce terminal ; laisse les workers coder dans leurs copies isolées. Si une étape exige les outils propres à la conversation, une capacité indisponible ou un modèle non configuré, explique le blocage : ne convertis pas silencieusement ses paramètres. Pour le travail natif approprié, claim fournit mission, profil, critères, entrées et jeton ; remets le résultat typé via result. execute reste synchrone pour un seul bloc ; ne l’enchaîne pas pour prétendre paralléliser plusieurs demandes. Ne prétends jamais qu’une simulation prouve un résultat réel.
Si une information manque : ask AVANT de me poser la question, puis answer après ma réponse et reprends le bloc via claim. Une réponse ordinaire ne vaut jamais autorisation de production. Pour une décision ou une réception humaine, indique le bloc dans le panneau et attends sa décision ; le pont ne peut pas l’approuver. Aucun JSON/SQLite d’état modifié directement.
Plusieurs demandes peuvent avancer indépendamment, dans les projets autorisés : ${JSON.stringify(conversation.project_contexts)}. Utilise leur id dans add.project et leur path comme dossier de travail ; ne déduis pas le projet cible du seul terminal ouvert. Consulter status après chaque étape et reprendre les blocs prêts jusqu’au résultat ou à une question. Les fins de diagnostic, correction, livraison et réception métier restent distinctes.
Demande depuis le terminal, par exemple « va chercher cet email et prépare une release » : tu effectues ce travail avec les outils de la CLI native, sans demander à l’utilisateur de recopier le mail dans des formulaires. Vérifie les outils et connexions réellement accessibles au fournisseur choisi. Utilise leur recherche puis lis l’original intégral et ses pièces ; pour un .eml local, lis ce fichier et ses pièces. Si plusieurs messages ou projets correspondent, pose la question dans le bloc de recueil avant de choisir. Si l’accès mail manque, annonce que la recherche n’a pas été effectuée et demande la connexion ou une source locale ; un accès absent n’est pas un résultat de recherche vide. N’invente ni outil, ni source, ni résultat.
Prépare les fichiers locaux avec les outils du terminal : conserve une seule copie exacte de l’original et des pièces dans le dossier de travail du projet, ainsi qu’un manifeste de provenance (référence du message, empreintes, noms et chemins relatifs). Ne modifie pas l’original ; sur reprise, vérifie l’existant avant de le réutiliser. Ne mets ni images/base64 ni mail intégral dans les requêtes JSON du pont. Les demandes référencent ces fichiers et leurs observations ; les observations ne constituent pas une preuve de cause ou de QA.
Pour une release, consulte les instructions du projet et du pack installé. Avec le pack Odoo, applique son import source, ses commandes de préparation et sa convention documentaire dans la série du projet. La préparation du plan (odoo_plan.py init) ne lance pas de flow ; ne déclenche pas son démarrage historique (start) en doublon. Garde le moteur Tricorder comme suivi de cette conversation, sans second flow d’exécution miroir. Hors Odoo, utilise la convention du dépôt ou un dossier release/<identifiant>. Prépare les documents et le plan dans le dépôt, sans commit, push, envoi ou déploiement implicite. Le dossier local est versionnable ; ne le déclare pas publié ou livré.
Décompose le mail en besoins identifiables puis appelle add avec une clé stable par source et besoin (par exemple empreinte-original:R1), sans recopier le contenu des pièces. Reprends les mêmes clés après interruption. Le recueil initial est de la coordination ; il ne s’ajoute pas aux besoins client. N’enregistre pas « chercher le mail et préparer la release » comme une demande supplémentaire de développement lorsque ses besoins métier sont créés : cette collecte ne doit pas arriver dans un bloc d’édition exigeant une modification de code. Si une telle demande existe déjà, signale-la et fais examiner son état ; ne falsifie pas un diff pour la valider. Rends le plan visible dans les sorties des blocs et référence le dossier préparé. Une réponse à ask utilise answer, jamais add. Une demande en attente peut laisser les autres progresser. Toute consolidation technique obligatoire dépend explicitement des demandes concernées via depends_on ; elle se distingue des besoins client. Diagnostic, correction, QA et livraison restent distincts ; les calculs de devis ne relèvent pas d’Express.
Annonce le workflow et son périmètre. Consulte status pour reprendre une demande déjà enregistrée depuis l’interface ; sinon demande ce que je souhaite traiter. N’invente aucune demande.`;
    const id = require('node:crypto').randomUUID();
    settings.workflowAgents ||= {};
    const previous = settings.workflowAgents[conversation.id];
    let resume;
    if (request.resume && previous?.provider === conversation.provider && previous.source) {
      try {
        const sourceRoot = path.join(stateDir, 'agent-events');
        if (path.dirname(previous.source) === sourceRoot) {
          const file = fs.openSync(previous.source, 'r');
          try {
            const size = fs.fstatSync(file).size, bytes = Buffer.alloc(Math.min(size, 64000));
            fs.readSync(file, bytes, 0, bytes.length, Math.max(0,size-bytes.length));
            const ids=bytes.toString('utf8').split('\n').flatMap(line=>{try{return [JSON.parse(line).rootId];}catch{return [];}}).filter(id=>typeof id==='string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,199}$/.test(id));
            resume=ids.at(-1);
          } finally { fs.closeSync(file); }
        }
      } catch { /* A fresh invocation can recover the durable workflow state. */ }
    }
    const launch = require('./provider-launch.cjs').prepareLaunch({ resume, provider: conversation.provider, model: conversation.model, effort: conversation.effort, id, folder: path.join(stateDir, 'agent-events'), backend, home, project: project.path, crew: '', prompt });
    settings.workflowTerminals[conversation.id] = session.id; settings.workflowAgents[conversation.id] = {provider:conversation.provider,source:launch.source}; saveSettings();
    await terminal({ action: bound ? 'write-if-idle' : 'write', session: session.id, data: launch.command + '\r' });
    return {...session,agentState:'starting',resumedSession:resume || null};
  });
  handle('workflow-workspace', async () => { await showWorkflows(); return true; });
  require('./cockpit.cjs').wireCockpit({ handle, dialog, shell, window: () => window, settings, save: saveSettings, checkedProject, catalog, terminal, stateDir, backend, home });
  handle('bootstrap', async () => {
    const catalogProjects = await overview();
    const pack = process.env.TRICORDER_AGENTS_DIR || path.join(home, '.odoo19-agents');
    let configured = [], workflowWarning = null;
    try { configured = await studio.backend(workflowCatalogRequest(catalogProjects, pack)); }
    catch (error) { workflowWarning = error.message; }
    // The optional workflow catalog must not hide native projects and terminals.
    return { projects: catalogProjects, configured, workflowWarning, settings, initialWorkspace: initialWorkspace(), links: LINKS, version: app.getVersion(), home, workspaceRoot: settings.workspaceRoot || home,
      crewInstalled: fs.existsSync(path.join(pack, 'scripts', 'odoo_plan.py')) };
  });
  handle('overview', overview);
  handle('catalog-revision', () => catalogRevision(projects));
  handle('project', (project, release) => catalog({ action: 'project', project: checkedProject(project), release }));
  handle('document', async (project, relative) => {
    const doc = await catalog({ action: 'document', project: checkedProject(project), path: relative });
    if (doc.type === 'pdf') { const error = await shell.openPath(doc.path); if (error) throw new Error(error); }
    return doc;
  });
  handle('source-root', async () => {
    const result = await dialog.showOpenDialog(window, { title: 'Bibliothèque partagée des sources Odoo', properties: ['openDirectory'], defaultPath: settings.sourceRoot || path.join(home, 'odoo-sources') });
    if (result.canceled) return null;
    settings.sourceRoot = fs.realpathSync(result.filePaths[0]); saveSettings(); return settings.sourceRoot;
  });
  handle('workspace-root', async () => {
    const result = await dialog.showOpenDialog(window, { title: 'Dossier dans lequel découvrir les projets', properties: ['openDirectory'], defaultPath: settings.workspaceRoot || home });
    if (result.canceled) return null;
    settings.workspaceRoot = fs.realpathSync(result.filePaths[0]); saveSettings();
    if (scanning) await scanning;
    return { projects: await overview(), root: settings.workspaceRoot };
  });
  handle('open-folder', project => shell.openPath(checkedProject(project)));
  handle('link', key => { if (!LINKS[key]) throw new Error('Lien inconnu'); return shell.openExternal(LINKS[key]); });
  handle('clipboard:read', () => clipboard.readText());
  handle('clipboard:write', text => { if (typeof text !== 'string' || text.length > 1024 * 1024) throw new Error('Texte invalide'); clipboard.writeText(text); });
  handle('settings', patch => {
    // Only UI preferences. No command, shell or URL can be configured by renderer.
    if (typeof patch.activeProject === 'string') settings.activeProject = checkedProject(patch.activeProject);
    if (Array.isArray(patch.favorites)) settings.favorites = patch.favorites.filter(p => projects.has(p));
    if (['codex', 'claude'].includes(patch.provider)) settings.provider = patch.provider;
    if (['release', 'request', 'support'].includes(patch.workflow)) settings.workflow = patch.workflow;
    if (patch.ui && typeof patch.ui === 'object') {
      settings.ui ||= {};
      for (const key of ['split', 'highContrast']) if (typeof patch.ui[key] === 'boolean') settings.ui[key] = patch.ui[key];
      for (const [key, min, max] of [['fontSize', 11, 22], ['sidebarWidth', 210, 360]]) {
        if (Number.isFinite(patch.ui[key])) settings.ui[key] = Math.max(min, Math.min(max, Math.round(patch.ui[key])));
      }
      if (['light', 'dark', 'system'].includes(patch.ui.theme)) settings.ui.theme = patch.ui.theme;
      if (['mono', 'liberation', 'system'].includes(patch.ui.font)) settings.ui.font = patch.ui.font;
    }
    if (patch.context && projects.has(patch.context.project)) {
      const { project, environment, release } = patch.context;
      settings.contexts[project] = { environment: typeof environment === 'string' ? environment : '', release: typeof release === 'string' ? release : '' };
    }
    saveSettings(); return settings;
  });
  handle('terminal:list', async () => {
    const sessions = [...await terminal({ action: 'list' }), ...await legacySessions()];
    // Contexts of sessions that no longer exist would otherwise accumulate forever.
    const stale = Object.keys(settings.terminalContexts || {}).filter(id => !sessions.some(s => s.id === id));
    if (stale.length) { for (const id of stale) delete settings.terminalContexts[id]; saveSettings(); }
    return sessions.map(s => sessionContext(settings, s));
  });
  handle('terminal:context', async request => {
    const project = checkedProject(request.project);
    const session = (await terminal({ action: 'list' })).find(s => s.id === request.session && s.project === project);
    if (!session?.alive) throw new Error('Terminal actif introuvable dans ce projet');
    const current = sessionContext(settings, session);
    if ('expectedRelease' in request && current.release !== request.expectedRelease) throw new Error('Le contexte du terminal a changé');
    const release = request.release || null, task = request.task || null;
    if (release !== null && typeof release !== 'string') throw new Error('Release invalide');
    const data = await catalog({ action: 'project', project, release: release || '' });
    if (task && !data.tasks.some(t => t.id === task)) throw new Error('Tâche inconnue pour cette release');
    if ('expectedRelease' in request && sessionContext(settings, session).release !== request.expectedRelease) throw new Error('Le contexte du terminal a changé');
    if ('expectedProjectRelease' in request && settings.contexts[project]?.release !== request.expectedProjectRelease) throw new Error('La release consultée a changé');
    const result = saveContext(settings, session, release, task);
    saveSettings(); return result;
  });
  handle('terminal:create', async request => {
    const project = checkedProject(request.project);
    const data = await catalog({ action: 'project', project, release: request.release === null ? '' : request.release });
    const environment = request.environment || null;
    if (environment && !data.environments.some(e => e.name === environment)) throw new Error('Environnement inconnu');
    const task = request.task || null;
    if (request.release === null && task) throw new Error('Une tâche exige une release');
    if (task && !data.tasks.some(t => t.id === task)) throw new Error('Tâche inconnue');
    const workingDirectory = settings.profiles?.[project]?.workingDirectory || project;
    if (workingDirectory !== project) {
      const service = await terminal({ action: 'ping' });
      if (!service.capabilities?.includes('working-directory')) {
        if ((await terminal({ action: 'list' })).length) throw new Error('Le service persistant est encore en version 0.1. Arrêtez explicitement tous ses terminaux avant de créer une session dans un dossier personnalisé. Vos programmes actuels sont conservés.');
        // Upgrade only an empty broker. Never terminate an existing terminal.
        if (!Number.isInteger(service.pid) || service.pid <= 1) throw new Error('Service terminal incompatible');
        process.kill(service.pid, 'SIGTERM'); broker?.destroy(); broker = null;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    const session = await terminal({ action: 'create', project, workingDirectory, environment, task, release: data.selectedRelease, cols: 100, rows: 30 });
    const result = saveContext(settings, session, data.selectedRelease, task, request.scopeMode === 'express' ? 'express' : 'auto');
    saveSettings(); return result;
  });
  for (const action of ['attach', 'resize', 'write']) {
    handle('terminal:' + action, request => {
      if (!request || typeof request.session !== 'string') throw new Error('Session invalide');
      if (action === 'write' && (typeof request.data !== 'string' || request.data.length > 1024 * 1024)) throw new Error('Saisie invalide');
      return terminal({ action, session: request.session, cols: request.cols, rows: request.rows, data: request.data });
    });
  }
  handle('terminal:stop', async id => {
    const { response } = await dialog.showMessageBox(window, { type: 'question', title: 'Arrêter ce terminal ?',
      message: 'Arrêter le shell et les programmes de ce terminal ?', detail: 'Fermer la fenêtre Tricorder conserve les sessions. Cette action les arrête.',
      buttons: ['Conserver', 'Arrêter le terminal'], defaultId: 0, cancelId: 0 });
    if (response !== 1) return false;
    await terminal({ action: 'stop', session: id }); return true;
  });
  handle('notify', ({ title, body }) => {
    if (Notification.isSupported() && !window.isFocused()) new Notification({ title: String(title).slice(0, 100), body: String(body).slice(0, 250) }).show();
  });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (_event, argv) => {
    if (!window) return;
    if (initialWorkspace(argv) === 'studio') showWorkflows(argv).catch(() => {});
    if (window.isMinimized()) window.restore(); window.show(); window.focus();
  });
  app.on('open-file', (event, file) => { event.preventDefault(); if (window) showWorkflows([file]).catch(() => {}); });
  app.whenReady().then(async () => {
    loadSettings();
    protocol.handle('tricorder', request => {
      const url = new URL(request.url);
      const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const base = path.join(app.getAppPath(), 'dist');
      const target = path.resolve(base, name);
      if (url.hostname !== 'app' || !target.startsWith(base + path.sep)) return new Response('Forbidden', { status: 403 });
      return net.fetch(pathToFileURL(target).toString());
    });
    window = new BrowserWindow({ width: 1480, height: 960, minWidth: 1000, minHeight: 650,
      title: 'Tricorder', backgroundColor: '#101519', autoHideMenuBar: true,
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', event => event.preventDefault());
    window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    // The terminal owns Ctrl+Shift+C/V. Native pasteAndMatchStyle would also
    // consume Ctrl+Shift+V and paste a second time, outside xterm's handler.
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Tricorder', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'quit', label: 'Fermer Tricorder (conserver les sessions)' }] },
      { label: 'Édition', submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut', accelerator: '' }, { role: 'copy', accelerator: '' }, { role: 'paste', accelerator: '' },
        { type: 'separator' }, { role: 'selectAll', accelerator: '' },
      ] },
      { role: 'viewMenu' },
    ]));
    ensureCockpitLoaded = workspaceLoader(window);
    studio = require('./studio-main.cjs').createStudio({ window, state: stores.studio, showCockpit, showWorkflows });
    wireAPI();
    if (initialWorkspace() === 'studio') await showWorkflows(process.argv);
    else await showCockpit();
  }).catch(error => { dialog.showErrorBox('Odoo Tricorder', error.message); app.quit(); });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => { broker?.end(); legacyTerminals?.disconnect(); });
}

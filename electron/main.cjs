const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, Menu, Notification, clipboard } = require('electron');
const { spawn, execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const socketNet = require('node:net');
const { pathToFileURL } = require('node:url');
const { promisify } = require('node:util');

protocol.registerSchemesAsPrivileged([{ scheme: 'tricorder', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
const LINKS = {
  tricorder: 'https://github.com/le-goff-benoit/odoo-tricorder',
  agents: 'https://github.com/le-goff-benoit/odoo-crew',
};
const exec = promisify(execFile);
const home = process.env.TRICORDER_HOME || os.homedir();
const stateDir = process.env.TRICORDER_STATE_DIR || path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'odoo-tricorder');
app.setPath('userData', path.join(stateDir, 'chromium'));
const socketPath = path.join(process.env.TRICORDER_RUNTIME_DIR || path.join(process.env.XDG_RUNTIME_DIR || stateDir, 'odoo-tricorder'), 'pty.sock');
const backend = app.isPackaged ? path.join(process.resourcesPath, 'backend') : path.join(__dirname, '..', 'backend');
let window, broker, buffer = '', nextRequest = 0, settings = {}, projects = new Set(), scanning;
const pending = new Map();

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
  if (payload.action === 'project') payload.sourceRoot = settings.sourceRoot;
  try {
    const { stdout } = await exec('python3', [path.join(backend, 'catalog.py'), JSON.stringify(payload)], { maxBuffer: 12 * 1024 * 1024, timeout: 60000 });
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
  scanning = catalog({ action: 'overview', home, extras: settings.extras }).then(result => {
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
  handle('bootstrap', async () => ({ projects: await overview(), settings, links: LINKS, version: app.getVersion(), home }));
  handle('overview', overview);
  handle('project', (project, release) => catalog({ action: 'project', project: checkedProject(project), release }));
  handle('document', async (project, relative) => {
    const doc = await catalog({ action: 'document', project: checkedProject(project), path: relative });
    if (doc.type === 'pdf') { const error = await shell.openPath(doc.path); if (error) throw new Error(error); }
    return doc;
  });
  handle('add-project', async () => {
    const result = await dialog.showOpenDialog(window, { title: 'Ajouter un projet', properties: ['openDirectory'], defaultPath: home });
    if (result.canceled) return null;
    const root = fs.realpathSync(result.filePaths[0]);
    if (!settings.extras.includes(root)) settings.extras.push(root);
    saveSettings(); return overview();
  });
  handle('source-root', async () => {
    const result = await dialog.showOpenDialog(window, { title: 'Bibliothèque partagée des sources Odoo', properties: ['openDirectory'], defaultPath: settings.sourceRoot || path.join(home, 'odoo-sources') });
    if (result.canceled) return null;
    settings.sourceRoot = fs.realpathSync(result.filePaths[0]); saveSettings(); return settings.sourceRoot;
  });
  handle('open-folder', project => shell.openPath(checkedProject(project)));
  handle('link', key => { if (!LINKS[key]) throw new Error('Lien inconnu'); return shell.openExternal(LINKS[key]); });
  handle('clipboard:read', () => clipboard.readText());
  handle('clipboard:write', text => { if (typeof text !== 'string' || text.length > 1024 * 1024) throw new Error('Texte invalide'); clipboard.writeText(text); });
  handle('settings', patch => {
    // Only UI preferences. No command, shell or URL can be configured by renderer.
    if (typeof patch.activeProject === 'string') settings.activeProject = checkedProject(patch.activeProject);
    if (Array.isArray(patch.favorites)) settings.favorites = patch.favorites.filter(p => projects.has(p));
    if (patch.context && projects.has(patch.context.project)) {
      const { project, environment, release } = patch.context;
      settings.contexts[project] = { environment: typeof environment === 'string' ? environment : '', release: typeof release === 'string' ? release : '' };
    }
    saveSettings(); return settings;
  });
  handle('terminal:list', () => terminal({ action: 'list' }));
  handle('terminal:create', async request => {
    const project = checkedProject(request.project);
    const data = await catalog({ action: 'project', project, release: request.release || null });
    const environment = request.environment || null;
    if (environment && !data.environments.some(e => e.name === environment)) throw new Error('Environnement inconnu');
    const task = request.task || null;
    if (task && !data.tasks.some(t => t.id === task)) throw new Error('Tâche inconnue');
    return terminal({ action: 'create', project, environment, task, release: data.selectedRelease, cols: 100, rows: 30 });
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
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
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
      title: 'Odoo Tricorder', backgroundColor: '#101519', autoHideMenuBar: true,
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
    wireAPI();
    await window.loadURL('tricorder://app/');
  }).catch(error => { dialog.showErrorBox('Odoo Tricorder', error.message); app.quit(); });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => broker?.end());
}

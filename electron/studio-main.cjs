'use strict';
const { app, BrowserWindow, ipcMain, protocol, net, dialog, Tray, Menu, nativeImage, shell } = require('electron');
const { execFile } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { pathToFileURL, fileURLToPath } = require('node:url');
const { summarize, menuItems, trayBitmap } = require('./studio-tray.cjs');
const updates = require('./studio-updates.cjs');
const { TerminalBroker } = require('./studio-terminal.cjs');

const state = process.env.TRICORDER_STATE_DIR || path.join(os.homedir(), '.local/share/tricorder');
fs.mkdirSync(state, { recursive: true, mode: 0o700 });
app.setPath('userData', path.join(state, 'chromium'));
protocol.registerSchemesAsPrivileged([{ scheme: 'tricorder', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
let window;
const primaryInstance = app.requestSingleInstanceLock();
if (!primaryInstance) app.quit();
app.on('second-instance', (_event, argv) => { queuePortable(argv); if (window) { window.show(); window.focus(); } });
let pendingPortable = null;
function queuePortable(argv) {
  const file = argv.find(value => value.endsWith('.tricorder-workflow'));
  if (!file) return;
  try { pendingPortable = file.startsWith('file://') ? fileURLToPath(file) : path.resolve(file); } catch { return; }
  if (window && !window.webContents.isLoading()) window.webContents.send('studio:navigate', { route: 'import-workflow' });
}
queuePortable(process.argv);
app.on('open-file', (event, file) => { event.preventDefault(); queuePortable([file]); });
let tray, quitting = false, trayTimer, tickBusy = false, lastRuns = [], lastSchedules = [], trayFresh = false;
let terminals;
const allowed = new Set(['bootstrap', 'overview.get', 'candidate.preview', 'workflow.export-portable', 'workflow.preview-portable', 'workflow.import-portable', 'plugins.discover', 'plugins.preview', 'workspace.get', 'design.workspace', 'assistant.propose', 'pack.preview', 'pack.install', 'project.create', 'project.get', 'template.workspace', 'schedule.list', 'schedule.create', 'schedule.toggle', 'workflow.save', 'workflow.reload', 'workflow.validate', 'run.start', 'run.get', 'run.control', 'run.document', 'run.reconcile', 'release.export']);
const human = new Set(['run.accept', 'run.decide', 'run.retry', 'plugins.qualify', 'run.handoff', 'run.reconcile-effect', 'candidate.apply', 'run.start', 'schedule.create']);

function backend(payload, isHuman = false) {
  return new Promise((resolve, reject) => {
    const script = app.isPackaged ? path.join(process.resourcesPath, 'backend/studio.py') : path.join(__dirname, '../backend/studio.py');
    const args = [script, '--state', state];
    if (isHuman) args.push('--human-ui');
    const child = execFile('python3', args, { timeout: 15000, maxBuffer: 8 * 1024 * 1024 }, (error, stdout) => {
      if (error) return reject(new Error('Le moteur local ne répond pas. Les données enregistrées sont conservées.'));
      try {
        const response = JSON.parse(stdout);
        if (!response.ok) return reject(new Error(response.error));
        resolve(response.result);
      } catch (error) { reject(error); }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

function trusted(event) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || !event.senderFrame.url.startsWith('tricorder://app/')) throw new Error('Origine non autorisée');
}

app.whenReady().then(() => {
  if (!primaryInstance) return;
  const backendRoot = app.isPackaged ? path.join(process.resourcesPath, 'backend') : path.join(__dirname, '../backend');
  terminals = new TerminalBroker(path.join(backendRoot, 'terminal_service.py'), path.join(state, 'studio-pty.sock'), message => { if (window && !window.isDestroyed()) window.webContents.send('studio:terminal-event', message); });
  ipcMain.handle('studio:terminal', async (event, request) => {
    trusted(event);
    if (request.action === 'create') {
      const workspace = await backend({ action: 'design.workspace', project: request.project });
      const existing = await terminals.request({ action: 'list' });
      const result = existing.find(s => s.project === workspace.cwd && s.alive) || await terminals.request({ action: 'create', project: workspace.cwd, release: request.release || null, cols: 100, rows: 18, cleanShell: process.env.TRICORDER_TEST_MODE === '1' });
      terminals.owned.add(result.id); return result;
    }
    if (!['attach', 'write', 'resize', 'stop'].includes(request.action) || !terminals.owned.has(request.session)) throw new Error('Session de terminal inconnue');
    if (request.action === 'write' && (typeof request.data !== 'string' || request.data.length > 1048576)) throw new Error('Entrée terminal invalide');
    const result = await terminals.request(request);
    if (request.action === 'stop') terminals.owned.delete(request.session);
    return result;
  });
  const root = path.resolve(__dirname, '../dist');
  protocol.handle('tricorder', request => {
    const url = new URL(request.url);
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (url.hostname !== 'app' || !file.startsWith(root + path.sep)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).href);
  });
  ipcMain.handle('studio:request', (event, payload) => {
    trusted(event);
    if (!payload || !allowed.has(payload.action)) throw new Error('Commande non autorisée');
    return backend(payload);
  });
  ipcMain.handle('studio:human', (event, payload) => {
    trusted(event);
    if (!payload || !human.has(payload.action)) throw new Error('Décision inconnue');
    return backend(payload, true);
  });
  let updateResult = { current: app.getVersion(), status: 'checking' };
  let updatePending;
  const checkUpdates = () => {
    if (process.env.TRICORDER_TEST_MODE === '1') return Promise.resolve(updateResult = { current: app.getVersion(), status: 'disabled' });
    updatePending ||= updates.check(app.getVersion()).then(result => { updateResult = result; return result; }).finally(() => { updatePending = null; });
    return updatePending;
  };
  checkUpdates();
  ipcMain.handle('studio:updates', async (event, request) => {
    trusted(event);
    if (request.action === 'check') return checkUpdates();
    if (request.action === 'status') return updatePending || updateResult;
    if (request.action === 'notes' && updateResult.url) { await shell.openExternal(updateResult.url); return updateResult; }
    if (request.action === 'download' && updateResult.status === 'available' && updateResult.download) { await shell.openExternal(updateResult.download); return updateResult; }
    throw new Error('Action de mise à jour indisponible');
  });
  const previewPortable = async file => {
    const stat = await fs.promises.stat(file);
    if (!stat.isFile() || stat.size > 2_000_000) throw new Error('Fichier de workflow absent ou trop volumineux');
    const bundle = JSON.parse(await fs.promises.readFile(file, 'utf8'));
    return backend({ action: 'workflow.preview-portable', bundle });
  };
  ipcMain.handle('studio:portable', async (event, request) => {
    trusted(event);
    if (request.action === 'pending') { const file = pendingPortable; pendingPortable = null; return file ? previewPortable(file) : null; }
    if (request.action === 'open') {
      const selected = await dialog.showOpenDialog(window, { title: 'Importer un workflow', properties: ['openFile'], filters: [{ name: 'Workflow Tricorder', extensions: ['tricorder-workflow'] }] });
      return selected.canceled ? null : previewPortable(selected.filePaths[0]);
    }
    if (request.action === 'save') {
      const bundle = await backend({ action: 'workflow.export-portable', graph: request.graph, project: request.project });
      const selected = await dialog.showSaveDialog(window, { title: 'Exporter le workflow', defaultPath: bundle.workflow.id + '.tricorder-workflow', filters: [{ name: 'Workflow Tricorder', extensions: ['tricorder-workflow'] }] });
      if (selected.canceled) return null;
      const file = selected.filePath.endsWith('.tricorder-workflow') ? selected.filePath : selected.filePath + '.tricorder-workflow';
      await fs.promises.writeFile(file, JSON.stringify(bundle, null, 2) + '\n', { mode: 0o600 });
      return file;
    }
    throw new Error('Action de fichier inconnue');
  });
  ipcMain.handle('studio:folder', async event => {
    trusted(event);
    const result = await dialog.showOpenDialog(window, { title: 'Choisir le dossier du projet', properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });
  window = new BrowserWindow({ width: 1440, height: 960, minWidth: 800, minHeight: 600, title: 'Tricorder', backgroundColor: '#f6f7fb',
    webPreferences: { preload: path.join(__dirname, 'studio-preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('tricorder://app/')) event.preventDefault(); });
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  const show = () => { window.show(); if (window.isMinimized()) window.restore(); window.focus(); };
  const navigate = destination => { show(); window.webContents.send('studio:navigate', destination); };
  const quit = () => { quitting = true; app.quit(); };
  const updateTray = () => {
    if (!tray) return;
    const summary = summarize(lastRuns);
    const bitmap = trayBitmap(trayFresh ? summary.severity : 'blocked');
    tray.setImage(nativeImage.createFromBitmap(bitmap.buffer, { width: bitmap.size, height: bitmap.size, scaleFactor: 1 }));
    tray.setToolTip('Tricorder · ' + (trayFresh ? summary.detail : 'Suivi indisponible'));
    tray.setContextMenu(Menu.buildFromTemplate(menuItems(lastRuns, navigate, show, quit, trayFresh, lastSchedules)));
  };
  try {
    const bitmap = trayBitmap('idle');
    tray = new Tray(nativeImage.createFromBitmap(bitmap.buffer, { width: bitmap.size, height: bitmap.size, scaleFactor: 1 }));
    tray.on('double-click', show);
    // Linux StatusNotifier hosts generally open the context menu on primary click.
    tray.on('click', () => tray.popUpContextMenu());
    updateTray();
  } catch { tray = null; }
  window.on('close', event => { if (!quitting && tray) { event.preventDefault(); window.hide(); } });
  const tick = async () => {
    if (tickBusy) return;
    tickBusy = true;
    try { const data = await backend({ action: 'runtime.tick' }); lastRuns = data.runs; lastSchedules = data.schedules; trayFresh = true; }
    catch { trayFresh = false; }
    finally { tickBusy = false; updateTray(); }
  };
  tick(); trayTimer = setInterval(tick, 1500);
  window.loadURL('tricorder://app/');
});
app.on('before-quit', () => { quitting = true; clearInterval(trayTimer); terminals?.disconnect(); });
app.on('window-all-closed', () => { if (!tray) app.quit(); });

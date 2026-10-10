'use strict';
const { app, ipcMain, dialog, Tray, Menu, nativeImage, shell } = require('electron');
const { jsonRequest } = require('./backend-request.cjs');
const path = require('node:path');
const fs = require('node:fs');
const { fileURLToPath } = require('node:url');
const { summarize, menuItems, trayBitmap } = require('./studio-tray.cjs');
const updates = require('./studio-updates.cjs');
const { TerminalBroker } = require('./studio-terminal.cjs');

function createStudio({ window, state, showCockpit, showWorkflows }) {
fs.mkdirSync(state, { recursive: true, mode: 0o700 });
const contents = window.webContents;
let pendingPortable = null;
function queuePortable(argv) {
  const file = argv.find(value => value.endsWith('.tricorder-workflow'));
  if (!file) return;
  try { pendingPortable = file.startsWith('file://') ? fileURLToPath(file) : path.resolve(file); } catch { return; }
  if (window && !contents.isLoading()) contents.send('studio:navigate', { route: 'import-workflow' });
}
let tray, quitting = false, trayTimer, tickBusy = false, lastRuns = [], lastSchedules = [], lastCounts = null, tickOffset = 0, trayFresh = false;
let terminals;
const allowed = new Set(['workflow.conflict', 'run.list', 'workflow.list', 'workflow.get', 'run.proof', 'run.attempts', 'run.recovery', 'conversation.open', 'conversation.list', 'conversation.get', 'conversation.add', 'conversation.answer', 'run.answer', 'bootstrap', 'overview.get', 'candidate.preview', 'workflow.export-portable', 'workflow.preview-portable', 'workflow.import-portable', 'plugins.discover', 'plugins.preview', 'workspace.get', 'design.workspace', 'assistant.propose', 'pack.preview', 'pack.install', 'project.create', 'project.get', 'template.workspace', 'schedule.list', 'schedule.get', 'schedule.create', 'schedule.toggle', 'workflow.save', 'workflow.reload', 'workflow.validate', 'run.start', 'run.get', 'run.control', 'run.document', 'run.reconcile', 'release.export', 'work.export', 'workflow.repository', 'workflow.import-repository']);
const human = new Set(['entity.archive', 'workflow.resolve', 'run.finish-interrupted', 'conversation.open', 'conversation.dispatch', 'run.accept', 'run.decide', 'run.retry', 'plugins.qualify', 'run.handoff', 'run.reconcile-effect', 'candidate.apply', 'run.start', 'schedule.create']);
for (const action of ['collection.change', 'iteration.get', 'action.list']) allowed.add(action);
for (const action of ['iteration.start', 'action.activate']) human.add(action);

function backend(payload, isHuman = false) {
  const script = app.isPackaged ? path.join(process.resourcesPath, 'backend/studio.py') : path.join(__dirname, '../backend/studio.py');
  const args = ['--state', state];
  if (isHuman) args.push('--human-ui');
  return jsonRequest(script, args, payload);
}

function trusted(event) {
  if (!window || event.sender !== contents || event.senderFrame !== contents.mainFrame || !event.senderFrame.url.startsWith('tricorder://app/')) throw new Error('Origine non autorisée');
}


  const backendRoot = app.isPackaged ? path.join(process.resourcesPath, 'backend') : path.join(__dirname, '../backend');
  terminals = new TerminalBroker(path.join(backendRoot, 'terminal_service.py'), path.join(state, 'studio-pty.sock'), message => { if (window && !window.isDestroyed()) contents.send('studio:terminal-event', message); });
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
  ipcMain.handle('studio:request', (event, payload) => {
    trusted(event);
    if (payload?.action === 'cockpit.open') return showCockpit();
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
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event, url) => { if (!url.startsWith('tricorder://app/')) event.preventDefault(); });
  contents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  const show = () => { window.show(); if (window.isMinimized()) window.restore(); window.focus(); };
  const navigate = destination => { showWorkflows(); show(); contents.send('studio:navigate', destination); };
  const quit = () => { quitting = true; app.quit(); };
  const updateTray = () => {
    if (!tray) return;
    const summary = summarize(lastRuns, lastCounts);
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
    try { const data = await backend({ action: 'runtime.tick', offset:tickOffset }); tickOffset=data.next || 0; lastCounts=data.counts; lastRuns = data.runs; lastSchedules = data.schedules; trayFresh = true; }
    catch { trayFresh = false; }
    finally { tickBusy = false; updateTray(); }
  };
  tick(); trayTimer = setInterval(tick, 1500);
  const ready = Promise.resolve();
  app.on('before-quit', () => { quitting = true; clearInterval(trayTimer); terminals?.disconnect(); });
  return { ready, queuePortable, backend };
}
module.exports = { createStudio };

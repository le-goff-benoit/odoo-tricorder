const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const root = path.resolve(__dirname, '..');

function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'object' ? JSON.stringify(value, null, 2) : value);
}
function fixture(home) {
  const project = path.join(home, 'orbital-industries');
  const releaseId = '2026-09-11_01_facturation-et-maintenance';
  const release = path.join(project, 'changelog', releaseId);
  write(path.join(project, '.odoo-agents/config'), 'series = 19.0\n');
  write(path.join(project, 'orbital_custom/__manifest__.py'), "{'name': 'Orbital', 'version': '19.0.1.0.0'}\n");
  write(path.join(project, '.odoo-agents/PROJECT.md'), '# Orbital Industries\n\nProjet synthétique de démonstration.');
  write(path.join(project, '.odoo-agents/JOURNAL.md'), '# Journal\n\nLe suivi des missions est opérationnel.');
  write(path.join(project, '.odoo-agents/instances.json'), {
    local: { kind: 'local', url: 'http://localhost:8069', db: 'orbital_test', platform: 'docker' },
    staging: { kind: 'staging', url: 'https://staging.example.test', db: 'orbital_staging', platform: 'odoo.sh' },
    production: { kind: 'production', url: 'https://example.test', db: 'orbital', platform: 'odoo.sh' },
  });
  write(path.join(release, 'README.md'), '<!-- release ouverte -->\n# Facturation & maintenance récurrente\n\nUne release synthétique pour les tests du cockpit.');
  write(path.join(release, 'demande.md'), '# Demande\n\nFiabiliser la facturation et les interventions récurrentes.');
  const task = (id, title, extra = {}) => ({ id, title, request: `changelog/${releaseId}/demande.md`,
    acceptance: ['Les scénarios ciblés sont vérifiés sur copie locale.', 'Les résultats sont associés à une preuve.'],
    risk: 'normal', route: 'module', scopes: ['orbital_custom'], depends_on: [], ...extra });
  write(path.join(release, 'plan.json'), { schema: 1, tasks: [
    task('T01', 'Fiabiliser les factures partielles', { receipt: { contract_sha256: 'old' }, risk: 'high' }),
    task('T02', 'Planifier les interventions récurrentes', { attempts: [{ flow: '.odoo-agents/flows/maintenance.json' }] }),
    task('T03', 'Recetter les documents de la release', { depends_on: ['T01', 'T02'] }),
  ] });
  const nodes = { review: { description: 'Revue fonctionnelle', executor: 'agent', role: 'odoo-analyst' },
    build: { description: 'Développement du module', executor: 'agent', role: 'odoo-developer', locks: [] },
    qa: { description: 'Validation sur copie locale', executor: 'agent', role: 'odoo-tester', locks: [] } };
  write(path.join(project, '.odoo-agents/flows/maintenance.json'), { schema_version: 1, run_id: 'maintenance',
    project, kind: 'development', status: 'active', created_at: '2026-09-11T09:00:00Z', updated_at: '2026-09-11T09:12:00Z',
    graph_snapshot: { start: 'review', nodes, edges: [{ id: 'a', from: 'review', to: 'build', outcome: 'done' }, { id: 'b', from: 'build', to: 'qa', outcome: 'done' }] },
    events: [{ node: 'review', at: '2026-09-11T09:05:00Z', outcome: 'done', note: 'Périmètre et critères vérifiés.' }], tokens: {},
    claims: { build: { owner: 'Codex · développeur', at: '2026-09-11T09:12:00Z', locks: [{ resource: 'orbital_custom', mode: 'write' }] } } });
  write(path.join(home, 'nova-services/.odoo-agents/config'), 'series = 18.0\n');
  write(path.join(home, 'equinox-studio/.odoo-agents/config'), 'series = 19.1\n');
  return { project, releaseId };
}
async function cleanupBroker(socket) {
  await new Promise(resolve => {
    const client = net.createConnection(socket); let buffer = '';
    client.on('error', resolve);
    client.on('connect', () => client.write('{"id":1,"action":"list"}\n'));
    client.on('data', data => {
      buffer += data;
      let end;
      while ((end = buffer.indexOf('\n')) !== -1) {
        const msg = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
        if (msg.id === 1) {
          for (const s of msg.result) client.write(JSON.stringify({ id: 2, action: 'stop', session: s.id }) + '\n');
          client.write('{"id":3,"action":"ping"}\n');
        } else if (msg.id === 3) { try { process.kill(msg.result.pid, 'SIGTERM'); } catch {} client.end(); resolve(); }
      }
    });
    client.on('close', resolve);
  });
}

async function closeWindow(app) {
  const exited = new Promise(resolve => app.process().once('exit', resolve));
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close()).catch(() => {});
  await Promise.race([exited, new Promise((_, reject) => setTimeout(() => reject(new Error('Window close did not exit app')), 8000))]);
}

test('desktop: projects, proof status, sources, real terminal and persistence', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-ui-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const { project } = fixture(home);
  const env = { ...process.env, HOME: home, HISTFILE: path.join(temp, 'shell-history'),
    TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
    TRICORDER_HOME: home, TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') };
  const launchOptions = { args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env,
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}) };
  let app;
  const errors = [];
  try {
    app = await electron.launch(launchOptions);
    await app.evaluate(({ Menu }) => {
      const collect = menu => menu.items.flatMap(item => [item.role, ...(item.submenu ? collect(item.submenu) : [])]);
      if (collect(Menu.getApplicationMenu()).includes('pasteandmatchstyle')) throw new Error('Conflicting native paste accelerator');
    });
    let page = await app.firstWindow();
    page.on('pageerror', error => errors.push(error.message));
    await expect(page.locator('#project-title')).toHaveText('orbital-industries');
    await expect(page.locator('#release-select')).toHaveValue('2026-09-11_01_facturation-et-maintenance');
    await page.locator('[data-view="plan"]').click();
    await expect(page.locator('.task-card')).toHaveCount(3);
    await expect(page.locator('[data-task="T01"]')).toContainText('À revalider');
    await page.locator('[data-task="T02"]').click();
    await expect(page.locator('#inspector')).toContainText('Codex · développeur');
    await expect(page.locator('#inspector')).toContainText('Activité non confirmée');
    await page.screenshot({ path: 'test-results/plan.png' });
    await page.locator('[data-view="sources"]').click();
    await expect(page.locator('#content')).toContainText('Aucune substitution par une autre série');
    await page.locator('[data-view="environments"]').click();
    await page.locator('[data-environment="staging"]').click();
    await page.locator('.project-header [data-action="new-terminal"]').click();
    await expect(page.locator('.terminal-host')).toHaveCount(1);
    const first = await page.evaluate(async () => (await window.tricorder.terminals.list())[0]);
    expect(first.environment).toBe('staging');
    expect(first.project).toBe(project);
    await page.locator('.xterm-helper-textarea').focus();
    await page.keyboard.type("printf 'TRICORDER-%s\\n' 'READY'");
    await page.keyboard.press('Enter');
    await expect(page.locator('.xterm-screen')).toContainText('TRICORDER-READY');
    // Isolate clipboard tests from the user's actual desktop clipboard.
    await app.evaluate(({ clipboard }) => {
      let value = '';
      clipboard.readText = () => value;
      clipboard.writeText = text => { value = text; };
    });
    await page.evaluate(() => window.tricorder.clipboard.write("printf 'PASTE-%s\\n' 'OK'"));
    // Untrusted DOM event exercises our handler without allowing Chromium to
    // read the operating-system clipboard as a native default action.
    await page.locator('.xterm-helper-textarea').dispatchEvent('keydown', { key: 'V', code: 'KeyV', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true });
    await expect(page.locator('.xterm-screen')).toContainText('PASTE-%s');
    await page.keyboard.press('Enter');
    await expect(page.locator('.xterm-screen')).toContainText('PASTE-OK');
    expect((await page.locator('.xterm-screen').innerText()).match(/PASTE-OK/g)).toHaveLength(1);
    await page.locator('[data-action="inspector"]').click();
    await expect(page.locator('#inspector')).toBeHidden();
    await page.locator('[data-action="inspector"]').click();
    await page.locator('#environment-select').selectOption('production');
    expect((await page.evaluate(async () => (await window.tricorder.terminals.list())[0])).environment).toBe('staging');
    await page.screenshot({ path: 'test-results/terminal.png' });
    await page.locator('[data-view="documents"]').click();
    await page.locator('[data-files=".odoo-agents"]').first().click();
    await page.locator('[data-preview=".odoo-agents/JOURNAL.md"]').click();
    await expect(page.locator('.document-text')).toContainText('Le suivi des missions');
    await page.locator('[data-action="modal-close"]').click();
    await page.locator('[data-action="about"]').click();
    await expect(page.locator('#modal')).toContainText('github.com/le-goff-benoit/odoo-crew');
    await expect(page.locator('#modal')).toContainText('github.com/le-goff-benoit/odoo-tricorder');
    await app.evaluate(({ shell }) => { globalThis.openedLink = null; shell.openExternal = async url => { globalThis.openedLink = url; }; });
    await page.locator('#modal [data-action="agents-link"]').click();
    expect(await app.evaluate(() => globalThis.openedLink)).toBe('https://github.com/le-goff-benoit/odoo-crew');
    await page.locator('#modal [data-action="repo-link"]').click();
    expect(await app.evaluate(() => globalThis.openedLink)).toBe('https://github.com/le-goff-benoit/odoo-tricorder');
    await page.locator('[data-action="modal-close"]').click();
    await closeWindow(app);
    app = null;
    app = await electron.launch(launchOptions);
    page = await app.firstWindow();
    page.on('pageerror', error => errors.push(error.message));
    await expect(page.locator('.xterm-screen')).toContainText('TRICORDER-READY');
    const after = await page.evaluate(async () => (await window.tricorder.terminals.list())[0]);
    expect(after.pid).toBe(first.pid);
    expect(after.environment).toBe('staging');
    await expect(page.locator('#environment-select')).toHaveValue('production');
    const originalSize = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getSize());
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1050, 700));
    await expect(page.locator('.xterm-helper-textarea')).toBeAttached();
    await page.screenshot({ path: 'test-results/compact.png' });
    await app.evaluate(({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setSize(...size), originalSize);
    expect(errors).toEqual([]);
  } finally {
    if (app) { await closeWindow(app).catch(() => { app.process().kill('SIGKILL'); }); }
    await cleanupBroker(path.join(temp, 'run/pty.sock'));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('roadmap: observations, human alert, measures, files, graph, preparation and preferences', async () => {
  test.setTimeout(120000);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-roadmap-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const { project, releaseId } = fixture(home);
  write(path.join(project, 'inbox/ticket.eml'), 'Subject: Demande synthétique\n\nÀ examiner.');
  write(path.join(project, 'changelog', releaseId, 'junit-targeted.xml'), '<testsuite tests="12" failures="0" errors="0" skipped="2"><properties><property name="odoo.task" value="T02"/></properties></testsuite>');
  const native = path.join(temp, 'session.jsonl');
  const date = seconds => new Date(Date.now() - 60000 + seconds * 1000).toISOString();
  const rows = [
    { type: 'session_meta', timestamp: date(0), payload: { id: 'synthetic-thread', timestamp: date(0) } },
    { type: 'turn_context', timestamp: date(0), payload: { turn_id: 'turn1', model: 'synthetic-model' } },
    { type: 'event_msg', timestamp: date(0), payload: { type: 'task_started', turn_id: 'turn1' } },
    { type: 'token_usage_record', timestamp: date(10), payload: { thread_id: 'synthetic-thread', response_id: 'response1', thread_token_usage: { input_tokens: 100, cached_input_tokens: 0, cache_write_input_tokens: 0, output_tokens: 40, total_tokens: 140 } } },
    { type: 'event_msg', timestamp: date(20), payload: { type: 'task_complete', turn_id: 'turn1', duration_ms: 20000 } },
    { type: 'event_msg', timestamp: date(21), payload: { type: 'exec_approval_request', command: 'DO-NOT-EXPOSE-PRIVATE' } },
  ];
  write(native, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  const env = { ...process.env, HOME: home, HISTFILE: path.join(temp, 'shell-history'),
    TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
    TRICORDER_HOME: home, TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') };
  const launchOptions = { args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env,
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}) };
  let app;
  const errors = [];
  try {
    app = await electron.launch(launchOptions);
    const page = await app.firstWindow();
    page.on('pageerror', error => errors.push(error.message));
    await expect(page.locator('#project-title')).toHaveText('orbital-industries');
    await app.evaluate(({ dialog, clipboard, Notification, BrowserWindow }, source) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] });
      let value = ''; clipboard.readText = () => value; clipboard.writeText = text => { value = text; };
      globalThis.tricorderNotifications = 0;
      Notification.isSupported = () => true;
      Notification.prototype.show = () => { globalThis.tricorderNotifications += 1; };
      BrowserWindow.getAllWindows()[0].isFocused = () => false;
    }, native);
    await page.locator('[data-view="effort"]').click();
    await expect(page.locator('#content')).toContainText('Pourquoi le réalisé peut-il être vide');
    await page.locator('[data-view="agents"]').click();
    await expect(page.locator('#content')).toContainText('Qui fait quoi');
    await page.locator('[data-cockpit="associate"]').first().click();
    await page.locator('#native-task').selectOption('T02');
    await expect(page.locator('#native-flow')).toHaveValue('.odoo-agents/flows/maintenance.json');
    await page.locator('[data-cockpit="bind"]').click();
    await expect(page.locator('.native-binding')).toContainText('synthetic-thread');
    await expect(page.locator('.project-item.needs-human .human-alert')).toHaveText('!');
    expect(await app.evaluate(() => globalThis.tricorderNotifications)).toBeGreaterThan(0);
    await expect(page.locator('.quality-panel')).toContainText('10');
    await expect(page.locator('#content')).not.toContainText('DO-NOT-EXPOSE-PRIVATE');
    await page.locator('[data-native-events]').click();
    await expect(page.locator('#modal')).toContainText('exec_approval_request');
    await expect(page.locator('#modal')).not.toContainText('DO-NOT-EXPOSE-PRIVATE');
    await page.locator('[data-action="modal-close"]').click();
    const observed = await page.evaluate(p => window.tricorder.cockpit.observations(p), project);
    expect(observed[0].usage.active_seconds).toBe(20);
    expect(observed[0].usage.tokens.total_tokens).toBe(140);
    await page.locator('[data-view="effort"]').click();
    await expect(page.locator('#content')).toContainText('Natif · non consolidé');
    await page.locator('[data-usage]').click();
    await expect(page.locator('#modal')).toContainText('import-usage');
    await page.locator('[data-cockpit="copy-command"]').click();
    expect(await page.evaluate(() => window.tricorder.clipboard.read())).toContain('--task');
    expect(fs.existsSync(path.join(project, 'changelog', releaseId, 'effort.json'))).toBe(false);
    await page.locator('[data-action="modal-close"]').click();
    await page.screenshot({ path: 'test-results/roadmap-effort.png' });
    await page.locator('[data-view="plan"]').click();
    await expect(page.locator('.task-acceptance')).toHaveCount(3);
    await page.locator('#task-select').selectOption('T02');
    await expect(page.locator('#inspector')).toContainText('Critères d’acceptation');
    await page.locator('[data-cockpit="graph"]').click();
    await expect(page.locator('.graph-node')).toHaveCount(3);
    await page.locator('#graph-task').selectOption('T03');
    await expect(page.locator('.graph-node')).toHaveCount(3);
    await page.locator('#graph-resource').selectOption('orbital_custom');
    await page.screenshot({ path: 'test-results/roadmap-graph.png' });
    await page.locator('[data-cockpit="handoff"]').click();
    await expect(page.locator('#modal')).toContainText('Cette fiche transmet le contexte');
    await page.locator('[data-cockpit="copy-handoff"]').click();
    expect(await page.evaluate(() => window.tricorder.clipboard.read())).toContain('synthetic-thread');
    await page.locator('[data-action="modal-close"]').click();
    await page.locator('[data-view="environments"]').click();
    await expect(page.locator('#content')).not.toContainText('Fichiers reçus');
    await expect(page.locator('#content')).toContainText('Stack locale');
    await page.locator('[data-view="documents"]').click();
    await page.locator('[data-files="inbox"]').first().click();
    await page.locator('[data-preview="inbox/ticket.eml"]').click();
    await expect(page.locator('.document-text')).toContainText('Demande synthétique');
    await page.locator('[data-action="modal-close"]').click();
    await page.locator('.top-actions [data-cockpit="search"]').click();
    await page.locator('#global-query').fill('facturation');
    await page.locator('[data-cockpit="run-search"]').click();
    await expect(page.locator('.search-result').first()).toBeVisible();
    await page.locator('[data-action="modal-close"]').click();
    await page.locator('[data-cockpit="palette"]').click();
    await page.locator('#skill-provider').selectOption('codex');
    await page.locator('#skill-filter').fill('odoo-env');
    await page.locator('[data-skill="odoo-env"]').click();
    await expect(page.locator('#modal')).toContainText('$odoo-env');
    await page.locator('[data-action="modal-close"]').click();
    await page.locator('[data-view="sources"]').click();
    await page.locator('[data-cockpit="profile"]').click();
    await page.locator('#profile-kind').selectOption('online');
    await page.locator('[data-cockpit="save-profile"]').click();
    await expect(page.locator('#content')).toContainText('Odoo Online');
    await page.locator('[data-cockpit="preferences"]').click();
    await page.locator('#pref-size').fill('16');
    await page.locator('#pref-contrast').check();
    await page.locator('[data-cockpit="save-preferences"]').click();
    await expect(page.locator('html')).toHaveClass('high-contrast');
    const persisted = JSON.parse(fs.readFileSync(path.join(temp, 'state/settings.json')));
    expect(persisted.ui.fontSize).toBe(16);
    expect(persisted.profiles[project].kind).toBe('online');
    expect(persisted.bindings[0].nativeId).toBe('synthetic-thread');
    const work = path.join(temp, 'worktree'); fs.mkdirSync(work);
    await app.evaluate(({ dialog }, target) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [target] }); }, work);
    await page.locator('[data-cockpit="profile"]').click();
    await page.locator('[data-cockpit="working-directory"]').click();
    await expect(page.locator('#modal')).not.toBeVisible();
    await page.locator('#task-select').selectOption('T02');
    await page.locator('.project-header [data-action="new-terminal"]').click();
    await expect(page.locator('.terminal-host')).toHaveCount(1);
    const terminal = await page.evaluate(async () => (await window.tricorder.terminals.list())[0]);
    expect(terminal.workingDirectory).toBe(work);
    expect(terminal.task).toBe('T02');
    await expect(page.locator('#terminal-context')).toContainText('Tâche T02');
    await expect(page.locator('.provider-icon[aria-label="Shell"]').first()).toBeVisible();
    await page.locator('#task-select').selectOption('');
    await expect(page.locator('#inspector')).toContainText('RELEASE COMPLÈTE');
    expect((await page.evaluate(async () => (await window.tricorder.terminals.list())[0])).task).toBe('T02');
    fs.appendFileSync(native, JSON.stringify({ type: 'event_msg', timestamp: new Date().toISOString(), payload: { type: 'task_started', turn_id: 'turn2' } }) + '\n');
    await expect(page.locator('.human-alert')).toHaveCount(0, { timeout: 15000 });
    await page.locator('[data-view="agents"]').click();
    await page.screenshot({ path: 'test-results/roadmap-agents.png' });
    expect(errors).toEqual([]);
  } finally {
    if (app) await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock'));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

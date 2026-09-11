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
  const env = { ...process.env, TRICORDER_HOME: home, TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') };
  const launchOptions = { args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env,
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}) };
  let app;
  const errors = [];
  try {
    app = await electron.launch(launchOptions);
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
    await page.keyboard.press('Control+Shift+V');
    await page.keyboard.press('Enter');
    await expect(page.locator('.xterm-screen')).toContainText('PASTE-OK');
    await page.locator('[data-action="inspector"]').click();
    await expect(page.locator('#inspector')).toBeHidden();
    await page.locator('[data-action="inspector"]').click();
    await page.locator('#environment-select').selectOption('production');
    expect((await page.evaluate(async () => (await window.tricorder.terminals.list())[0])).environment).toBe('staging');
    await page.screenshot({ path: 'test-results/terminal.png' });
    await page.locator('[data-view="documents"]').click();
    await page.locator('[data-document=".odoo-agents/JOURNAL.md"]').click();
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

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
  const source = { path: `changelog/${releaseId}/demande.md`, sha256: require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(release, 'demande.md'))).digest('hex') };
  write(path.join(release, 'knowledge/K01.json'), { schema: 1, id: 'K01', kind: 'question', state: 'proposed',
    statement: 'Préciser l’exception pour la société B.', author: 'Codex · analyste', scope: [], sources: [source] });
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
  const shellPids = [];
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
          for (const s of msg.result) {
            if (s.alive) shellPids.push(s.pid);
            client.write(JSON.stringify({ id: 2, action: 'stop', session: s.id }) + '\n');
          }
          client.write('{"id":3,"action":"ping"}\n');
        } else if (msg.id === 3) { try { process.kill(msg.result.pid, 'SIGTERM'); } catch {} client.end(); resolve(); }
      }
    });
    client.on('close', resolve);
  });
  // stop acknowledges the signal, not the shell's exit. Bash can still write
  // HISTFILE after the broker closes, racing deletion of the synthetic home.
  const live = pid => {
    try { return !['Z', 'X'].includes(fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ')[0]); }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  };
  await expect.poll(() => shellPids.filter(live), { timeout: 8000,
    message: 'Synthetic shells must exit before deleting their home' }).toEqual([]);
}

async function closeWindow(app) {
  const exited = new Promise(resolve => app.process().once('exit', resolve));
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close()).catch(() => {});
  await Promise.race([exited, new Promise((_, reject) => setTimeout(() => reject(new Error('Window close did not exit app')), 8000))]);
}

async function projectView(page, view) {
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#tabs [data-view="sources"]')).toHaveCount(0);
  await expect(page.locator('#tabs [data-view="environments"]')).toHaveCount(0);
  await expect(page.locator('#tabs [data-view="documents"]')).toHaveCount(0);
  await page.locator(`.project-resources [data-view="${view}"]`).click();
  await expect(page.locator('#context-bar')).toBeHidden();
}

test('simplified workspace: task dialogs, agent identity, preferences and launch buttons', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-simple-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const { project, releaseId } = fixture(home);
  // These functions shadow real executables: no provider call or token usage.
  write(path.join(home, '.bashrc'), `claude() { printf 'FAKE-CLAUDE:%s\\n' "$PWD"; }\ncodex() { printf 'FAKE-CODEX:%s\\n' "$PWD"; }\n`);
  const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
    env: { ...process.env, SHELL: '/bin/bash', HOME: home, TRICORDER_HOME: home,
      TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
      TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  const errors = [];
  try {
    const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator('#task-select, .terminal-footer, .statusbar')).toHaveCount(0);
    await expect(page.locator('#inspector')).toBeHidden();
    await page.locator('#tabs [data-view="knowledge"]').click();
    await expect(page.locator('.knowledge-page')).toContainText('Préciser l’exception pour la société B.');
    await expect(page.locator('.knowledge-page')).toContainText('À confirmer');
    await page.screenshot({ path: 'test-results/memoire-release.png' });
    const memoryPath = path.join(project, 'changelog', releaseId, 'knowledge/K01.json');
    const nextMemory = JSON.parse(fs.readFileSync(memoryPath));
    nextMemory.id = 'K02'; nextMemory.statement = 'Découverte partagée pendant la tâche.';
    write(path.join(project, 'changelog', releaseId, 'knowledge/K02.json'), nextMemory);
    await expect(page.locator('.knowledge-page')).toContainText('Découverte partagée pendant la tâche.', { timeout: 15000 });
    await page.locator('#tabs [data-view="terminal"]').click();
    expect(await page.locator('#tabs [data-view="terminal"] svg').innerHTML()).not.toBe(await page.locator('#tabs [data-view="express"] svg').innerHTML());
    await page.locator('[data-launch-agent="claude"]').evaluate(button => { button.click(); button.click(); });
    await expect(page.locator('.xterm-screen')).toContainText('FAKE-CLAUDE:' + project);
    const [before] = await page.evaluate(() => window.tricorder.terminals.list());
    expect((await page.evaluate(() => window.tricorder.terminals.list())).length).toBe(1);
    expect(before.task).toBeNull();
    await page.locator('#tabs [data-view="release-kanban"]').click();
    await page.locator('[data-release-task="T02"]').click();
    await expect(page.locator('#task-modal')).toBeVisible();
    await expect(page.locator('#task-modal')).toHaveAttribute('aria-labelledby', 'task-modal-title');
    await expect(page.locator('.board-criteria li')).toHaveCount(2);
    await expect(page.locator('#task-modal')).toContainText('odoo-analyst');
    await expect(page.locator('#task-modal')).toContainText('Codex · développeur');
    await page.screenshot({ path: 'test-results/task-modal-simplified.png' });
    await page.keyboard.press('Escape');
    await expect(page.locator('#task-modal')).not.toBeVisible();
    await expect(page.locator('[data-release-task="T02"]')).toBeFocused();
    await expect(page.locator('.release-kanban .kanban-card')).toHaveCount(4);
    await page.screenshot({ path: 'test-results/kanban-simplified.png' });
    await page.locator('#tabs [data-view="effort"]').click();
    await expect(page.locator('[data-cockpit="associate"], .open-timers, .effort-live-hint')).toHaveCount(0);
    const row = page.locator('#content .table-scroll').first().locator('tbody tr').filter({ hasText: 'T02' });
    await row.locator('summary').click();
    await expect(row.locator('[data-agent="odoo-analyst"]')).toContainText('Intervention enregistrée · durée non mesurée');
    await expect(row.locator('[data-agent="odoo-developer"]')).toContainText('Codex · développeur');
    await page.locator('[data-cockpit="preferences"]').click();
    await expect(page.locator('.preferences h2')).toHaveText('Préférences');
    await expect(page.locator('#pref-inspector')).toHaveCount(0);
    await page.locator('#pref-size').fill('99');
    await page.locator('#preferences-form button[type=submit]').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#pref-size').fill('16');
    await page.locator('#pref-contrast').check();
    await page.screenshot({ path: 'test-results/preferences-simplified.png' });
    await page.locator('#preferences-form button[type=submit]').click();
    await page.locator('[data-cockpit="preferences"]').click();
    await expect(page.locator('#pref-size')).toHaveValue('16');
    await page.locator('#pref-size').fill('18');
    await page.locator('[data-action="cancel-preferences"]').click();
    await page.locator('[data-cockpit="preferences"]').click();
    await expect(page.locator('#pref-size')).toHaveValue('16');
    await page.locator('.modal-close').click();
    const [after] = await page.evaluate(() => window.tricorder.terminals.list());
    expect([after.id, after.pid, after.task, after.release]).toEqual([before.id, before.pid, null, releaseId]);
    await page.locator('[data-project]').filter({ hasText: 'nova-services' }).click();
    await page.locator('#tabs [data-view="terminal"]').click();
    await page.locator('[data-launch-agent="codex"]').click();
    await expect(page.locator('.terminal-host:visible .xterm-screen')).toContainText('FAKE-CODEX:' + path.join(home, 'nova-services'));
    expect((await page.evaluate(() => window.tricorder.terminals.list())).length).toBe(2);
    expect(errors).toEqual([]);
  } finally {
    await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock')); fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('global Kanban: all projects, closed-release filter and exact task navigation', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-kanban-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const { project, releaseId } = fixture(home);
  const second = path.join(home, 'nova-services'), oldId = '2026-08-01_01_archive';
  const originalPlan = JSON.parse(fs.readFileSync(path.join(project, 'changelog', releaseId, 'plan.json')));
  const definition = { schema: 1, tasks: [{ ...originalPlan.tasks[2], id: 'T01', title: 'Contrôler les livraisons Nova',
    request: `changelog/${releaseId}/demande.md`, scopes: [], depends_on: [] }] };
  write(path.join(second, 'changelog', releaseId, 'README.md'), '<!-- release ouverte -->\n# Livraisons Nova\n');
  write(path.join(second, 'changelog', releaseId, 'demande.md'), '# Demande Nova\n');
  write(path.join(second, 'changelog', releaseId, 'plan.json'), definition);
  write(path.join(project, 'changelog', oldId, 'README.md'), '# Archive Orbital\n');
  write(path.join(project, 'changelog', oldId, 'plan.json'), { schema: 1, tasks: [originalPlan.tasks[2]] });
  const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
    env: { ...process.env, HOME: home, TRICORDER_HOME: home,
      TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
      TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  try {
    const page = await app.firstWindow();
    await page.locator('[data-view="kanban"]').click();
    await expect(page.locator('#project-title')).toHaveText('Kanban global');
    await expect(page.locator('#context-bar')).toBeHidden();
    await expect(page.locator('.kanban-card')).toHaveCount(6);
    await expect(page.locator('.kanban-board')).toContainText('orbital-industries');
    await expect(page.locator('.kanban-board')).toContainText('nova-services');
    await expect(page.locator('.kanban-board')).toContainText('Codex · développeur');
    await expect(page.locator('.kanban-card[draggable="true"]')).toHaveCount(0);
    await expect(page.locator('.kanban-board')).toBeInViewport();
    await page.locator('[data-action="kanban-closed"]').click();
    await expect(page.locator('.kanban-card')).toHaveCount(8);
    await expect(page.locator('.kanban-board')).toContainText('Archive Orbital');
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    await expect(page.locator('#sync-status')).toContainText('À jour');
    await expect(page.locator('.kanban-card')).toHaveCount(8);
    await page.screenshot({ path: 'test-results/global-kanban.png' });
    await page.locator('.kanban-card').filter({ hasText: 'Contrôler les livraisons Nova' }).click();
    await expect(page.locator('#project-title')).toHaveText('nova-services');
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    await expect(page.locator('#task-modal')).toContainText('Contrôler les livraisons Nova');
    expect(JSON.parse(fs.readFileSync(path.join(second, 'changelog', releaseId, 'plan.json')))).toEqual(definition);
  } finally {
    await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock'));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('release Kanban: receipts, criteria, filters, live refresh and existing terminal stay scoped', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-release-board-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const { project, releaseId } = fixture(home);
  const planFile = path.join(project, 'changelog', releaseId, 'plan.json');
  const planBefore = fs.readFileSync(planFile, 'utf8');
  write(path.join(project, 'changelog', releaseId, 'junit-targeted.xml'), '<testsuite tests="12" failures="0" errors="0" skipped="2"><properties><property name="odoo.task" value="T02"/></properties></testsuite>');
  write(path.join(project, 'changelog', releaseId, 'effort.json'), { schema: 1, release: releaseId,
    tasks: { T02: 'Planifier les interventions récurrentes' }, estimates: [], rate_cards: [],
    entries: [{ id: 'a', task: 'T02', agent: 'odoo-analyst', status: 'complete', seconds: 600 }] });
  const oldId = '2026-09-10_01_archive';
  write(path.join(project, 'changelog', oldId, 'README.md'), '# Ancienne release\n');
  write(path.join(project, 'changelog', oldId, 'plan.json'), { schema: 1, tasks: [
    { ...JSON.parse(planBefore).tasks[2], id: 'T02', title: 'Autre tâche homonyme', depends_on: [] } ] });
  const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
    env: { ...process.env, HOME: home, TRICORDER_HOME: home,
      TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
      TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  const errors = [];
  try {
    const page = await app.firstWindow(); page.on('pageerror', error => errors.push(error.message));
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    await page.keyboard.press('Control+Shift+T');
    await expect(page.locator('.terminal-tab')).toHaveCount(1);
    const [terminal] = await page.evaluate(() => window.tricorder.terminals.list());
    await page.locator('#tabs [data-view="release-kanban"]').click();
    await expect(page.locator('.release-kanban .kanban-card')).toHaveCount(4);
    await expect(page.locator('.release-kanban [data-column="done"]')).toContainText('T01');
    await expect(page.locator('.board-count')).toContainText('1 réceptionnée · 3 tâches');
    await expect(page.locator('.release-kanban [data-column="done"]')).toContainText('Contrôle à actualiser');
    await page.locator('[data-release-task="T02"]').click();
    await expect(page.locator('.board-detail')).toContainText('Développement du module');
    await expect(page.locator('.board-detail')).toContainText('Codex · développeur');
    await expect(page.locator('.board-criteria li')).toHaveCount(2);
    await expect(page.locator('.board-detail')).toContainText('0 h 10 min');
    await expect(page.locator('.board-detail')).toContainText('100 %');
    await expect(page.locator('.board-detail')).toContainText('10 exécutés');
    await expect(page.locator('.board-detail')).toContainText('Périmètre et critères vérifiés.');
    await expect(page.locator('.release-kanban .kanban-card')).toHaveCount(4);
    await page.locator('[data-board-close]').click();
    await page.locator('#board-owner').selectOption('Codex · développeur');
    await expect(page.locator('.release-kanban .kanban-card')).toHaveCount(1);
    await page.locator('#board-owner').selectOption('');
    await page.locator('[data-release-task="T02"]').click();
    const scrollBeforeRefresh = await page.locator('#task-modal').evaluate(el => { el.scrollTop = 180; return el.scrollTop; });
    expect(scrollBeforeRefresh).toBeGreaterThan(0);
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    await expect(page.locator('#sync-status')).toContainText('À jour');
    await expect(page.locator('.board-detail')).toContainText('Planifier les interventions');
    expect(await page.locator('#task-modal').evaluate(el => el.scrollTop)).toBe(scrollBeforeRefresh);
    await page.screenshot({ path: 'test-results/release-kanban.png' });
    await page.locator('.board-detail [data-session]').click();
    await expect(page.locator('#terminal-workspace')).toBeVisible();
    const after = await page.evaluate(() => window.tricorder.terminals.list());
    expect(after.length).toBe(1); expect(after[0].id).toBe(terminal.id); expect(after[0].pid).toBe(terminal.pid);
    expect(after[0].task).toBeNull();
    await page.locator('#tabs [data-view="release-kanban"]').click();
    await page.locator('#release-select').selectOption(oldId);
    await expect(page.locator('.board-detail')).toHaveCount(0);
    await expect(page.locator('.release-kanban .kanban-card')).toHaveCount(2);
    await expect(page.locator('.release-kanban')).toContainText('Autre tâche homonyme');
    await page.locator('#release-select').selectOption(releaseId);
    await expect(page.locator('#task-modal')).not.toBeVisible();
    await page.locator('[data-release-task="T02"]').click();
    await expect(page.locator('.board-detail')).toContainText('Planifier les interventions');
    // An agent updates the plan on disk: refresh must update cards without changing context.
    const updated = JSON.parse(planBefore); updated.tasks[1].title = 'Interventions mises à jour'; write(planFile, updated);
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    await expect(page.locator('.board-detail h2')).toHaveText('Interventions mises à jour');
    await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.setMinimumSize(800, 600); win.setSize(1000, 800); });
    await expect(page.locator('[data-board-close]')).toBeInViewport();
    await page.screenshot({ path: 'test-results/release-kanban-compact.png' });
    await page.locator('[data-board-close]').click();
    await expect(page.locator('.board-detail')).toHaveCount(0);
    await page.locator('#release-select').selectOption('');
    await expect(page.locator('.no-release')).toContainText('Aucune release sélectionnée');
    await expect(page.locator('.board-detail')).toHaveCount(0);
    expect(JSON.parse(fs.readFileSync(planFile))).toEqual(updated);
    expect(errors).toEqual([]);
  } finally {
    await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock'));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('design system: common gutters, cards and controls across every project view', async () => {
  test.setTimeout(90000);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-design-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  fixture(home);
  const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
    env: { ...process.env, HOME: home, TRICORDER_HOME: home,
      TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
      TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  const errors = [];
  try {
    const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
    await expect(page.locator('#release-select')).not.toHaveValue('');
    for (const [width, height, zoom, gutter] of [[1440, 900, 1, 24], [1000, 900, 1, 16], [1000, 700, 1.25, 16]]) {
      await app.evaluate(({ BrowserWindow }, width) => { const w = BrowserWindow.getAllWindows()[0]; w.setMinimumSize(800, 600); w.setSize(width, 900); }, width);
      // A tiling desktop can refuse setSize. Exercise the CSS viewport explicitly.
      await app.evaluate(({ BrowserWindow }, zoom) => BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(zoom), zoom);
      await page.setViewportSize({ width, height });
      await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(Math.floor(width / zoom));
      for (const view of ['intentions', 'plan', 'release-kanban', 'knowledge', 'express', 'agents', 'effort', 'documents', 'sources', 'environments']) {
        if (['documents', 'sources', 'environments'].includes(view)) await projectView(page, view);
        else await page.locator(`#tabs [data-view="${view}"]`).click();
        await expect(page.locator('#content > .page')).toBeVisible();
        const styles = await page.evaluate(() => {
          const css = q => getComputedStyle(document.querySelector(q));
          return { page: css('#content > .page').paddingLeft, right: css('#content > .page').paddingRight,
            tabs: css('#tabs').paddingLeft, header: css('.project-header').paddingLeft,
            max: css('#content > .page').maxWidth,
            cards: [...document.querySelectorAll('#content .info-card, #content .agent-mission, #content .metric')].map(el => {
              const s = getComputedStyle(el); return [s.paddingLeft, s.paddingTop, s.borderRadius];
            }),
            gridMargins: [...document.querySelectorAll('.card-grid > .info-card')].map(el => getComputedStyle(el).margin),
            sectionGaps: [...document.querySelectorAll('.section-title.section-space')].map(el => getComputedStyle(el).marginTop),
            buttons: [...document.querySelectorAll('#content .secondary')].filter(el => el.offsetWidth).map(el => {
              const s = getComputedStyle(el); return [s.paddingLeft, s.paddingTop, s.minHeight];
            }),
            overflow: document.documentElement.scrollWidth > window.innerWidth,
          };
        });
        for (const key of ['page', 'right', 'tabs', 'header']) expect(styles[key], `${width} ${view} ${key}`).toBe(`${gutter}px`);
        expect(styles.max).toBe('none'); expect(styles.overflow, `${view} document overflow`).toBe(false);
        for (const card of styles.cards) expect(card, view).toEqual(['16px', '16px', '8px']);
        for (const margin of styles.gridMargins) expect(margin, 'Grid owns spacing, no double margin').toBe('0px');
        for (const margin of styles.sectionGaps) expect(margin, 'Section rhythm').toBe(`${gutter}px`);
        for (const button of styles.buttons) expect(button, view).toEqual(['12px', '8px', '36px']);
        await page.screenshot({ path: `test-results/design-${view}-${width}-${height}-zoom${zoom}.png` });
      }
      await page.locator('[data-cockpit="preferences"]').click();
      await expect(page.locator('#modal')).toBeVisible();
      expect(await page.locator('#modal').evaluate(el => getComputedStyle(el).padding)).toBe('24px');
      await page.locator('[data-action="modal-close"]').click();
    }
    expect(errors).toEqual([]);
  } finally {
    await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock')); fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('preparation: project scope becomes release scope without a duplicate or a retroactive forecast', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-preparation-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const project = path.join(home, 'atelier-orbital');
  write(path.join(project, '.odoo-agents/config'), 'series = 19.0\n');
  const file = path.join(project, '.odoo-agents/preparation/effort.json');
  const ledger = { schema: 1, release: 'preparation', tasks: { PREPARATION: 'Préparation du plan' },
    estimates: [], rate_cards: [], entries: [{ id: 'prep', task: 'PREPARATION', phase: 'preparation',
      release: null, agent: 'odoo-analyst', provider: 'codex', thread_id: 'prep-session', status: 'complete', seconds: 600,
      tokens: { input_tokens: 120, output_tokens: 30, cached_input_tokens: 40, cache_write_input_tokens: 0, total_tokens: 150 } }] };
  write(file, ledger);
  const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
    env: { ...process.env, HOME: home, TRICORDER_HOME: home,
      TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
      TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  try {
    const page = await app.firstWindow();
    await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.setMinimumSize(800, 600); win.setSize(1000, 800); });
    await expect(page.locator('#release-select')).toHaveValue('');
    await page.locator('[data-view="effort"]').click();
    await expect(page.locator('.phase-breakdown [data-phase="preparation"]')).toContainText('0 h 10 min');
    await expect(page.locator('.phase-breakdown [data-phase="preparation"]')).toContainText('100 %');
    await expect(page.locator('.token-allocation tbody')).toContainText('Préparation du plan');
    await expect(page.locator('[data-metric=initial] strong')).toHaveText('Non estimé');
    const before = fs.readFileSync(file, 'utf8');
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    await expect(page.locator('#sync-status')).toContainText('À jour');
    expect(fs.readFileSync(file, 'utf8')).toBe(before);

    // Simulate the agent's explicit attachment, not a cockpit write.
    const releaseId = '2026-09-11_01_organisation-des-interventions';
    const release = path.join(project, 'changelog', releaseId);
    write(path.join(release, 'README.md'), '<!-- release ouverte -->\n# Organisation des interventions\n');
    ledger.entries[0].release = releaseId; write(file, ledger);
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    await expect(page.locator(`#release-select option[value="${releaseId}"]`)).toHaveCount(1);
    await page.locator('#release-select').selectOption(releaseId);
    await expect(page.locator('.phase-breakdown [data-phase="preparation"]')).toContainText('0 h 10 min');
    await expect(page.locator('.metric').nth(1).locator('strong')).toHaveText('0 h 10 min');
    await expect(page.locator('.release-summary')).toContainText('Ouverte');
    const row = page.locator('#content .table-scroll').first().locator('tbody tr');
    await row.locator('.agent-breakdown summary').click();
    await expect(row.locator('[data-agent="odoo-analyst"]')).toContainText('0 h 10 min');
    await expect(row.locator('[data-agent="odoo-analyst"]')).toContainText('100 %');
    await page.screenshot({ path: 'test-results/preparation-release.png' });
    expect(fs.existsSync(path.join(release, 'effort.json'))).toBe(false);
    await page.locator('#release-select').selectOption('');
    await expect(page.locator('.phase-breakdown')).toHaveCount(0);
    await expect(page.locator('.metric').nth(1).locator('strong')).toHaveText('Non mesuré');
    expect(fs.readFileSync(file, 'utf8')).toBe(JSON.stringify(ledger, null, 2));
  } finally {
    await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock'));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('effort: partial recorded time survives missing roles, task filtering and refresh', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-partial-effort-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const { project, releaseId } = fixture(home);
  const effortFile = path.join(project, 'changelog', releaseId, 'effort.json');
  const lines = ['odoo-developer', 'odoo-tester', 'orchestrateur'].map(agent => ({ task: 'T01', agent, expected_minutes: 20 }));
  write(effortFile, { schema: 1, release: releaseId, tasks: { T01: 'Factures', T02: 'Maintenance', T03: 'Recette' },
    estimates: [{ revision: 1, at: '2026-09-01T00:00:00Z', lines }], rate_cards: [], entries: [
      { id: 'dev', task: 'T01', agent: 'odoo-developer', status: 'complete', seconds: 1080, suspended_seconds: 28800, tokens: { input_tokens: 100, output_tokens: 20, cached_input_tokens: 50 } },
      { id: 'qa', task: 'T01', agent: 'odoo-tester', status: 'complete', seconds: 300, tokens: null },
      { id: 'coordination', task: 'T01', agent: 'orchestrateur', status: 'running', seconds: null, tokens: null },
    ] });
  const before = fs.readFileSync(effortFile, 'utf8');
  const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
    env: { ...process.env, HOME: home, TRICORDER_HOME: home,
      TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
      TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  try {
    const page = await app.firstWindow();
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    await page.locator('[data-view="effort"]').click();
    await expect(page.locator('.metric').nth(1)).toContainText('TEMPS ENREGISTRÉ · PARTIEL');
    await expect(page.locator('.metric').nth(1).locator('strong')).toHaveText('0 h 23 min');
    await expect(page.locator('.open-timers')).toHaveCount(0);
    const first = page.locator('#content .table-scroll').first().locator('tbody tr').filter({ hasText: 'T01' });
    await expect(first.locator('td').nth(3)).toContainText('Veille exclue : 8 h 00 min');
    const tokens = page.locator('.token-allocation tbody tr').filter({ hasText: 'T01' });
    await expect(tokens.locator('td').nth(1)).toHaveText('100 · partiel');
    await expect(tokens.locator('td').nth(2)).toHaveText('20 · partiel');
    await expect(tokens.locator('td').nth(4)).toHaveText('Non mesuré');
    await expect(first.locator('td').nth(3)).toContainText('0 h 23 min');
    await expect(first.locator('td').nth(3)).toContainText('Temps incomplet : coordination');
    await expect(first.locator('td').nth(3)).toContainText('Relevé incomplet');
    await expect(first.locator('td').nth(4)).toHaveText('—');
    await expect(first.locator('td').last()).toHaveText('Enregistré');
    await first.locator('.agent-breakdown summary').click();
    await expect(first.locator('[data-agent="odoo-developer"]')).toContainText('0 h 18 min');
    await expect(first.locator('[data-agent="odoo-tester"]')).toContainText('0 h 05 min');
    await expect(first.locator('[data-agent="orchestrateur"]')).toContainText('Non mesuré');
    await expect(first.locator('[data-agent="orchestrateur"]')).toContainText('Mesure en cours');
    await expect(first.locator('[data-agent="odoo-developer"] .agent-time-share')).toHaveText('78,3 %');
    await expect(first.locator('[data-agent="odoo-developer"] [role="cell"]').nth(1)).toHaveText('0 h 20 min');
    await expect(page.locator('#content')).not.toContainText('Le temps passé reste à enregistrer');
    await expect(page.locator('.metric').nth(1).locator('strong')).toHaveText('0 h 23 min');
    await expect(page.locator('.open-timers')).toHaveCount(0);
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    await expect(page.locator('#sync-status')).toContainText('À jour');
    await expect(page.locator('.metric').nth(1).locator('strong')).toHaveText('0 h 23 min');
    await expect(first.locator('.agent-breakdown')).toHaveAttribute('open', '');
    await expect(first.locator('[data-agent="odoo-developer"]')).toBeVisible();
    await page.locator('.token-allocation').evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: 'test-results/token-breakdown.png' });
    await first.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: 'test-results/partial-effort.png' });
    await first.locator('.agent-breakdown').evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: 'test-results/agent-time-breakdown.png' });
    expect(fs.readFileSync(effortFile, 'utf8')).toBe(before);
  } finally {
    await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock'));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('effort: open release updates task and agent percentages before closure', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-live-effort-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const { project, releaseId } = fixture(home);
  const effortFile = path.join(project, 'changelog', releaseId, 'effort.json');
  const ledger = { schema: 1, release: releaseId, tasks: { T01: 'Factures', T02: 'Maintenance', T03: 'Recette' },
    estimates: [{ revision: 1, at: '2026-09-01T00:00:00Z', lines: [
      { task: 'T01', agent: 'odoo-developer', expected_minutes: 30 },
      { task: 'T02', agent: 'odoo-tester', expected_minutes: 30 },
      { task: 'T03', agent: 'orchestrateur', expected_minutes: 10 },
    ] }], rate_cards: [], entries: [
      { id: 'dev', task: 'T01', agent: 'odoo-developer', status: 'complete', seconds: 1200, tokens: null },
      { id: 'qa', task: 'T02', agent: 'odoo-tester', status: 'complete', seconds: 600, tokens: null },
    ] };
  write(effortFile, ledger);
  const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
    env: { ...process.env, HOME: home, TRICORDER_HOME: home,
      TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
      TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  const errors = [];
  try {
    const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    await page.locator('#tabs [data-view="effort"]').click();
    const first = page.locator('#content .table-scroll').first().locator('tbody tr').filter({ hasText: 'T01' });
    await expect(first.locator('.task-time-share')).toContainText('66,7 %');
    await expect(page.locator('[data-allocation-agent="odoo-developer"] strong')).toHaveText('66,7 %');
    await expect(page.locator('[data-allocation-agent="odoo-tester"] strong')).toHaveText('33,3 %');
    await expect(page.locator('[data-allocation-agent="orchestrateur"] strong')).toHaveText('—');
    await expect(page.locator('.agent-allocation')).toContainText('relevé partiel');
    await expect(page.locator('.effort-live-hint')).toHaveCount(0);
    await expect(first.locator('.task-time-share')).toContainText('66,7 %');
    await expect(page.locator('[data-allocation-agent="odoo-developer"] strong')).toHaveText('66,7 %');
    // Agent writes another completed measurement while the release remains open.
    ledger.entries[1].seconds = 2400; write(effortFile, ledger);
    const expectedFile = fs.readFileSync(effortFile, 'utf8');
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    await expect(first.locator('.task-time-share')).toContainText('33,3 %');
    await expect(page.locator('.release-summary')).toContainText('Ouverte');
    await expect(page.locator('.metric').nth(1).locator('strong')).toHaveText('1 h 00 min');
    await expect(page.locator('[data-allocation-agent="odoo-tester"] strong')).toHaveText('66,7 %');
    await page.locator('.agent-allocation').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/time-allocation.png' });
    expect(fs.readFileSync(effortFile, 'utf8')).toBe(expectedFile);
    expect(errors).toEqual([]);
  } finally {
    await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock')); fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('release context: none, automatic new release, same terminal and persistence', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-context-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const { project, releaseId } = fixture(home);
  const env = { ...process.env, HOME: home, TRICORDER_HOME: home,
    TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
    TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') };
  const options = { args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env,
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}) };
  let app = await electron.launch(options);
  const errors = [];
  try {
    let page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 700));
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    await page.locator('#release-select').selectOption('');
    await page.locator('#tabs [data-view="plan"]').click();
    await expect(page.locator('.no-release')).toContainText('Aucune release sélectionnée');
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    // The selection was already empty: it cannot prove refresh has finished.
    // Wait for the completed overview before creating a release and refreshing again.
    await expect(page.locator('#sync-status')).toHaveText(/^À jour · /);
    await expect(page.locator('#release-select')).toHaveValue('');
    await expect(page.locator('.project-header [data-action="new-terminal"]')).toHaveCount(0);
    await page.keyboard.press('Control+Shift+T');
    await expect.poll(async () => (await page.evaluate(() => window.tricorder.terminals.list())).length).toBe(1);
    const original = (await page.evaluate(() => window.tricorder.terminals.list()))[0];
    expect(original.release).toBeNull();
    expect(Number.isInteger(original.pid)).toBe(true);
    const newId = '2026-09-12_01_nouvelle-release';
    write(path.join(project, 'changelog', newId, 'README.md'), '<!-- release ouverte -->\n# Nouvelle release\n');
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    await expect(page.locator('#release-select')).toHaveValue(newId);
    await expect.poll(async () => (await page.evaluate(() => window.tricorder.terminals.list()))[0].release).toBe(newId);
    const updated = (await page.evaluate(() => window.tricorder.terminals.list()))[0];
    expect(updated.id).toBe(original.id); expect(updated.pid).toBe(original.pid); expect(updated.alive).toBe(true);
    const stored = JSON.parse(fs.readFileSync(path.join(temp, 'state/settings.json'), 'utf8'));
    expect(stored.contexts[project].release).toBe(newId);
    const refused = await page.evaluate(async ({ project, session }) => {
      try { await window.tricorder.terminals.context({ project, session, release: 'missing-release' }); return false; }
      catch { return true; }
    }, { project, session: original.id });
    expect(refused).toBe(true);
    const stale = await page.evaluate(async ({ project, session, release }) => {
      try { await window.tricorder.terminals.context({ project, session, release, expectedRelease: null }); return false; }
      catch { return true; }
    }, { project, session: original.id, release: releaseId });
    expect(stale).toBe(true);
    const foreign = await page.evaluate(async ({ project, session }) => {
      try { await window.tricorder.terminals.context({ project, session, release: null }); return false; }
      catch { return true; }
    }, { project: path.join(home, 'nova-services'), session: original.id });
    expect(foreign).toBe(true);
    await closeWindow(app); app = await electron.launch(options);
    page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
    await expect(page.locator('#release-select')).toHaveValue(newId);
    expect((await page.evaluate(() => window.tricorder.terminals.list()))[0].pid).toBe(original.pid);
    await page.locator('#release-select').selectOption('');
    await page.locator('[data-action="terminal-context"]').click();
    await expect.poll(async () => (await page.evaluate(() => window.tricorder.terminals.list()))[0].release).toBeNull();
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    await expect(page.locator('#release-select')).toHaveValue('');
    await expect(page.locator('#terminal-mismatch')).toHaveCount(0);
    await closeWindow(app); app = await electron.launch(options);
    page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
    await expect(page.locator('#release-select')).toHaveValue('');
    expect((await page.evaluate(() => window.tricorder.terminals.list()))[0].pid).toBe(original.pid);
    await page.screenshot({ path: 'test-results/no-release-terminal.png' });
    expect(errors).toEqual([]);
  } finally {
    await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock')); fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('flow starts: delayed terminal cannot hijack navigation, ambiguous adoption stays explicit', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-flow-starts-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const { project, releaseId } = fixture(home);
  const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
    env: { ...process.env, HOME: home, TRICORDER_HOME: home,
      TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
      TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  const errors = [];
  try {
    const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 700));
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    await page.locator('#release-select').selectOption('');
    await page.locator('#tabs [data-view="plan"]').click();
    await expect(page.locator('.no-release')).toBeVisible();
    // Deterministic pause, not a timing-dependent sleep: user leaves during creation.
    await app.evaluate(({ ipcMain }) => {
      const original = ipcMain._invokeHandlers.get('terminal:create');
      ipcMain.removeHandler('terminal:create');
      ipcMain.handle('terminal:create', async (...args) => {
        await new Promise(resolve => { globalThis.finishTerminalCreation = resolve; });
        return original(...args);
      });
      globalThis.originalTerminalCreate = original;
    });
    await page.keyboard.press('Control+Shift+T');
    await expect.poll(() => app.evaluate(() => typeof globalThis.finishTerminalCreation)).toBe('function');
    await page.locator('[data-project]').filter({ hasText: 'nova-services' }).click();
    await expect(page.locator('.no-release')).toBeVisible();
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('terminal:create'); ipcMain.handle('terminal:create', globalThis.originalTerminalCreate);
      globalThis.finishTerminalCreation();
    });
    await expect(page.locator('#session-count')).toHaveCount(0);
    await expect(page.locator('.no-release')).toBeVisible();
    await expect(page.locator('#terminal-workspace')).toBeHidden();
    await expect.poll(() => page.evaluate(async () => (await window.tricorder.terminals.list()).length)).toBe(1);
    const first = (await page.evaluate(() => window.tricorder.terminals.list()))[0];
    expect(first.project).toBe(project); expect(first.release).toBeNull();
    await page.locator('[data-project]').filter({ hasText: 'orbital-industries' }).click();
    await expect(page.locator('#release-select')).toHaveValue('');
    // Two ordinary conversations and an Express conversation: never guess a creator.
    await page.evaluate(async project => {
      await window.tricorder.terminals.create({ project, release: null });
      await window.tricorder.terminals.create({ project, release: null, scopeMode: 'express' });
    }, project);
    const newId = '2026-09-12_01_ambiguite';
    write(path.join(project, 'changelog', newId, 'README.md'), '<!-- release ouverte -->\n# Nouvelle release\n');
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    await expect(page.locator('#release-select')).toHaveValue(newId);
    const unchanged = await page.evaluate(() => window.tricorder.terminals.list());
    expect(unchanged).toHaveLength(3);
    expect(unchanged.every(s => s.release === null)).toBe(true);
    await expect(page.locator('#toast')).toContainText('aucun terminal réaffecté automatiquement');
    await page.locator('#tabs [data-view="terminal"]').click();
    await page.locator('[data-action="terminal-context"]').click();
    await expect.poll(async () => (await page.evaluate(() => window.tricorder.terminals.list())).filter(s => s.release === newId).length).toBe(1);
    const assigned = await page.evaluate(() => window.tricorder.terminals.list());
    expect(assigned.find(s => s.id === first.id).release).toBe(newId);
    expect(assigned.find(s => s.id === first.id).pid).toBe(first.pid);
    expect(assigned.find(s => s.scopeMode === 'express').release).toBeNull();
    // A late response for the former project must not replace the current screen.
    await page.locator('#tabs [data-view="plan"]').click();
    await app.evaluate(({ ipcMain }, delayedProject) => {
      const original = ipcMain._invokeHandlers.get('project');
      ipcMain.removeHandler('project');
      ipcMain.handle('project', async (...args) => {
        if (args[1] === delayedProject) await new Promise(resolve => { globalThis.finishProjectRead = resolve; });
        return original(...args);
      });
      globalThis.originalProjectRead = original;
    }, project);
    await page.locator('#release-select').selectOption(releaseId);
    await expect.poll(() => app.evaluate(() => typeof globalThis.finishProjectRead)).toBe('function');
    await page.locator('[data-project]').filter({ hasText: 'nova-services' }).click();
    await expect(page.locator('.no-release')).toBeVisible();
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('project'); ipcMain.handle('project', globalThis.originalProjectRead);
      globalThis.finishProjectRead();
    });
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    await expect(page.locator('.project-item.selected')).toContainText('nova-services');
    await expect(page.locator('.no-release')).toBeVisible();
    const stored = JSON.parse(fs.readFileSync(path.join(temp, 'state/settings.json'), 'utf8'));
    expect(stored.contexts[project].release).toBe(newId);
    expect(errors).toEqual([]);
  } finally {
    await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock')); fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('Markdown preview: readable safe content and recovery from a project read error', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-markdown-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const { project, releaseId } = fixture(home);
  const source = '<!-- release ouverte -->\n# Guide lisible\n\n## Résultat\n\nDu **gras**, de l’*italique* et du `code`.\n\n- Premier point\n- Second point\n\n- [x] Accepté\n\n| Tâche | Résultat |\n| --- | --- |\n| T01 | Validé |\n\n> Une remarque utile.\n\n```js\nconst ok = true;\n```\n\n![tracking](https://invalid.example.test/pixel.png)\n<script>window.INJECTED = true</script>\n<button data-action="new-terminal">Non actif</button>\n<a href="javascript:alert(1)">Lien dangereux</a>\n';
  write(path.join(project, 'changelog', releaseId, 'README.md'), source);
  const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
    env: { ...process.env, HOME: home, TRICORDER_HOME: home,
      TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
      TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  const errors = [], external = [];
  try {
    const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (/^https?:/.test(r.url())) external.push(r.url()); });
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    await page.locator('#tabs [data-view="plan"]').click();
    await page.locator('.release-links [data-document]').click();
    await expect(page.locator('.markdown-preview h1')).toHaveText('Guide lisible');
    await expect(page.locator('.markdown-preview strong')).toHaveText('gras');
    await expect(page.locator('.markdown-preview table td')).toHaveCount(2);
    await expect(page.locator('.markdown-preview input')).toBeChecked();
    await expect(page.locator('.markdown-preview input')).toBeDisabled();
    await expect(page.locator('.markdown-preview script, .markdown-preview img, .markdown-preview button, .markdown-preview [href], .markdown-preview [data-action]')).toHaveCount(0);
    expect(await page.evaluate(() => window.INJECTED)).toBeUndefined();
    await page.screenshot({ path: 'test-results/markdown-preview.png' });
    await page.locator('.markdown-source summary').click();
    await expect(page.locator('.markdown-source pre')).toHaveText(source);
    await page.locator('[data-action="modal-close"]').click();
    await projectView(page, 'documents');
    await page.locator('[data-files="changelog"]').first().click();
    await page.locator(`[data-files="changelog/${releaseId}"]`).click();
    await page.locator(`[data-preview="changelog/${releaseId}/README.md"]`).click();
    await expect(page.locator('.markdown-preview h1')).toHaveText('Guide lisible');
    await page.locator('[data-action="modal-close"]').click();
    await page.locator('#tabs [data-view="plan"]').click();
    await app.evaluate(({ ipcMain }) => {
      globalThis.savedProjectHandler = ipcMain._invokeHandlers.get('project');
      ipcMain.removeHandler('project'); ipcMain.handle('project', () => { throw new Error('synthetic project read failure'); });
    });
    await page.locator('#release-select').selectOption('');
    await expect(page.locator('#content')).toContainText('Lecture impossible');
    await expect(page.locator('.quality-panel')).toHaveCount(0);
    await app.evaluate(({ ipcMain }) => { ipcMain.removeHandler('project'); ipcMain.handle('project', globalThis.savedProjectHandler); });
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    await expect(page.locator('#content')).not.toContainText('Lecture impossible');
    expect(errors).toEqual([]); expect(external).toEqual([]);
  } finally {
    await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock')); fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('email removed: no UI or API, old private records preserved, project still usable', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-no-mail-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const { project, releaseId } = fixture(home);
  const privateState = path.join(temp, 'delivery');
  const key = require('node:crypto').createHash('sha256').update(JSON.stringify(project)).digest('hex');
  const config = path.join(privateState, key, 'config.json');
  const draft = path.join(privateState, key, 'old-draft.json');
  write(config, { enabled: true, transport: 'gmail-smtp', sender: 'synthetic@example.test' });
  write(draft, { status: 'draft', body: 'Ancien brouillon à préserver' });
  const before = [config, draft].map(file => fs.readFileSync(file, 'utf8'));
  const env = { ...process.env, HOME: home, TRICORDER_HOME: home,
    TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
    TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run'),
    ODOO_DELIVERY_STATE_DIR: privateState };
  const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env,
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}) });
  const errors = [];
  try {
    const page = await app.firstWindow(); page.on('pageerror', error => errors.push(error.message));
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    await page.locator('#tabs [data-view="plan"]').click();
    await expect(page.locator('.delivery-panel')).toHaveCount(0);
    await expect(page.getByText('Email de clôture', { exact: true })).toHaveCount(0);
    const snapshot = await page.evaluate(async p => ({
      data: await window.tricorder.project(p),
      api: Object.keys(window.tricorder.cockpit),
    }), project);
    expect(snapshot.data).not.toHaveProperty('delivery');
    expect(snapshot.data).not.toHaveProperty('deliveryConfig');
    for (const name of ['deliveryConfigure', 'deliveryEdit', 'deliveryAttachments', 'deliveryConnectSmtp', 'send'])
      expect(snapshot.api).not.toContain(name);
    await projectView(page, 'documents');
    await expect(page.locator('[data-view="communication"]')).toHaveCount(0);
    await expect(page.locator('#mail-sender')).toHaveCount(0);
    await expect(page.locator('[data-cockpit="delivery-connect-smtp"]')).toHaveCount(0);
    await expect(page.locator('.project-resources [data-view]')).toHaveCount(3);
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    await page.locator('#tabs [data-view="plan"]').click();
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    await expect(page.locator('.delivery-panel')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/email-removed.png' });
    expect([config, draft].map(file => fs.readFileSync(file, 'utf8'))).toEqual(before);
    expect(errors).toEqual([]);
  } finally {
    await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock'));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

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
    await app.firstWindow();
    await app.evaluate(({ Menu }) => {
      const collect = menu => menu.items.flatMap(item => [item.role, ...(item.submenu ? collect(item.submenu) : [])]);
      if (collect(Menu.getApplicationMenu()).includes('pasteandmatchstyle')) throw new Error('Conflicting native paste accelerator');
    });
    let page = await app.firstWindow();
    page.on('pageerror', error => errors.push(error.message));
    await expect(page.locator('#project-title')).toHaveText('orbital-industries');
    await expect(page.locator('#release-select')).toHaveValue('2026-09-11_01_facturation-et-maintenance');
    await page.locator('[data-view="plan"]').click();
    await expect(page.locator('.task-card')).toHaveCount(4);
    await expect(page.locator('[data-task="T01"]')).toContainText('Contrôle à actualiser');
    await page.locator('[data-task="T02"]').click();
    await expect(page.locator('#task-modal')).toBeVisible();
    await page.locator('[data-board-close]').click();
    await page.screenshot({ path: 'test-results/plan.png' });
    await projectView(page, 'sources');
    await expect(page.locator('#content')).toContainText('Aucune substitution par une autre série');
    await projectView(page, 'environments');
    await page.locator('[data-environment="staging"]').click();
    await page.keyboard.press('Control+Shift+T');
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
    await page.locator('#environment-select').selectOption('production');
    expect((await page.evaluate(async () => (await window.tricorder.terminals.list())[0])).environment).toBe('staging');
    await page.screenshot({ path: 'test-results/terminal.png' });
    await projectView(page, 'documents');
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

test('lifecycle: releases, remembered tasks, terminal scope, attention and rapid navigation', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-lifecycle-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const { project, releaseId } = fixture(home);
  const historical = '2026-09-10_01_historique';
  const emptyRelease = '2026-09-09_01_sans-plan';
  write(path.join(project, 'changelog', historical, 'README.md'), '# Historique\n| 1 | Livrer le premier point | fait |\n| 2 | Point bloqué | bloqué |');
  write(path.join(project, 'changelog', emptyRelease, 'README.md'), '# Bilan de livraison\nVersion livrée : 1.0.');
  write(path.join(project, '.odoo-agents/flows/express-caption.json'), {
    kind: 'express', status: 'complete', graph_snapshot: { nodes: {
      express_qa: { description: 'Contrôles ciblés' }, task_done: { description: 'Terminée' },
    } }, events: [{ node: 'express_qa', outcome: 'pass', evidence: ['Contrôle ciblé synthétique'] },
      { node: 'task_done', outcome: 'done' }], updated_at: '2026-09-11T09:00:00Z',
  });
  const env = { ...process.env, HOME: home, HISTFILE: path.join(temp, 'history'),
    TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
    TRICORDER_HOME: home, TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') };
  const launch = { args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env,
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}) };
  let app;
  const errors = [];
  try {
    app = await electron.launch(launch);
    let page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    await expect(page.locator('.brand')).toHaveText('TRICORDER');
    await expect(page.locator('.topbar')).not.toContainText('POSTE LOCAL');
    await page.locator('#tabs [data-view="express"]').click();
    await expect(page.locator('.express-card')).toHaveCount(1);
    await expect(page.locator('.express-card')).toContainText('Hors release');
    await expect(page.locator('.express-card')).toContainText('Terminée');
    await expect(page.locator('.express-card')).toContainText('Contrôles ciblés réussis');
    await expect(page.locator('#context-bar')).toBeHidden();
    await page.locator('[data-view="plan"]').click();
    await expect(page.locator('#context-bar')).toBeVisible();
    await expect(page.locator('.project-header [data-action="new-terminal"]')).toHaveCount(0);
    await page.locator('#tabs [data-view="terminal"]').click();
    await page.locator('#terminal-tabs [data-action="new-terminal"]').click();
    await expect(page.locator('.terminal-host')).toHaveCount(1);
    const terminal = await page.evaluate(async () => (await window.tricorder.terminals.list())[0]);
    await page.locator('#release-select').selectOption(historical);
    await expect(page.locator('#terminal-mismatch')).toBeVisible();
    await expect(page.locator('#terminal-context')).not.toContainText('ouvert ');
    await expect(page.locator('#terminal-context [data-action="terminal-context"]')).toBeVisible();
    await expect(page.locator('#environment-select').locator('..')).toContainText('ENVIRONNEMENT');
    await expect(page.locator('#environment-select').locator('..')).not.toContainText('REPÈRE');
    await page.locator('[data-view="plan"]').click();
    await expect(page.locator('.release-state')).toContainText('Close');
    await expect(page.locator('.task-card')).toHaveCount(3);
    await expect(page.locator('.task-card[data-task="P1"]')).toContainText('réception non vérifiée');
    await page.locator('#tabs [data-view="terminal"]').click();
    await expect(page.locator('#release-select')).toHaveValue(historical);
    expect((await page.evaluate(() => window.tricorder.terminals.list())).length).toBe(1);
    await expect(page.locator('#terminal-mismatch')).toContainText('Terminal partagé du projet');
    await page.locator('[data-view="plan"]').click();
    await page.locator('#release-select').selectOption(releaseId);
    await page.locator('#release-select').selectOption(historical);
    await page.locator('[data-view="terminal"]').click();
    await page.locator('[data-follow-session]').click();
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    await expect(page.locator('#terminal-mismatch')).toHaveCount(0);
    // Invalid associations fail before opening a file picker or persisting metadata.
    const rejection = await page.evaluate(async ({ project, releaseId, terminal }) => {
      try { await window.tricorder.cockpit.bind({ project, release: releaseId, task: 'T03', flow: '.odoo-agents/flows/maintenance.json', terminal: terminal.id, provider: 'codex' }); }
      catch (e) { return e.message; }
    }, { project, releaseId, terminal });
    expect(rejection).toContain('non associé à cette tâche');
    // One conversation/terminal may span several tasks; its opening scope is not a lock.
    const prepared = await page.evaluate(({ project, releaseId, terminal }) => window.tricorder.cockpit.prepareClaude({ project, release: releaseId, task: 'T03', terminal: terminal.id }), { project, releaseId, terminal });
    expect(prepared.command).toContain('claude --settings');
    const before = await page.evaluate(async () => (await window.tricorder.terminals.list())[0]);
    expect(before.pid).toBe(terminal.pid); expect(before.task).toBeNull();
    await page.locator('#release-select').selectOption(emptyRelease);
    await page.locator('[data-view="plan"]').click();
    await expect(page.locator('#content')).toContainText('Aucune tâche structurée');
    await page.locator('.release-links [data-document]').click();
    await expect(page.locator('#modal')).toContainText('Bilan de livraison');
    await page.locator('[data-action="modal-close"]').click();
    await expect(page.locator('[data-action="attention"]')).toHaveCount(0);
    await page.locator('#release-select').selectOption(historical);
    await expect(page.locator('#release-select')).toHaveValue(historical);
    await page.locator('[data-project]').filter({ hasText: 'nova-services' }).click();
    await page.locator('[data-project]').filter({ hasText: 'orbital-industries' }).click();
    await expect(page.locator('[data-action="add"]')).toHaveCount(0);
    await expect(page.locator('#project-search')).toHaveCount(0);
    await expect(page.locator('.project-item[data-project]')).toHaveCount(3);
    // Two navigation events in the same turn: only the latest response may win.
    await page.evaluate(([first, last]) => {
      const select = document.querySelector('#release-select');
      select.value = first; select.dispatchEvent(new Event('change', { bubbles: true }));
      select.value = last; select.dispatchEvent(new Event('change', { bubbles: true }));
    }, [releaseId, historical]);
    await expect(page.locator('#release-select')).toHaveValue(historical);
    await page.screenshot({ path: 'test-results/lifecycle-plan.png' });
    await closeWindow(app); app = null;
    app = await electron.launch(launch); page = await app.firstWindow();
    await expect(page.locator('#release-select')).toHaveValue(historical);
    await expect(page.locator('#terminal-mismatch')).toBeVisible();
    await projectView(page, 'documents');
    await page.screenshot({ path: 'test-results/project-resources.png' });
    await page.locator('#tabs [data-view="express"]').click();
    await expect(page.locator('.express-card')).toHaveCount(1);
    await page.screenshot({ path: 'test-results/express.png' });
    await page.keyboard.press('Control+Shift+T');
    await expect(page.locator('.terminal-host')).toHaveCount(2);
    const allTerminals = await page.evaluate(() => window.tricorder.terminals.list());
    const expressTerminal = allTerminals.find(t => t.id !== terminal.id);
    expect(expressTerminal.release).toBeNull();
    expect(expressTerminal.task).toBeNull();
    expect(errors).toEqual([]);
  } finally {
    if (app) await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock'));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('real project: read-only release/task/mission screens', async () => {
  test.skip(!process.env.TRICORDER_REAL_PROJECT, 'Opt-in local uniquement ; aucune donnée client dans les fixtures CI');
  test.setTimeout(120000);
  const project = fs.realpathSync(process.env.TRICORDER_REAL_PROJECT);
  const releaseId = process.env.TRICORDER_REAL_RELEASE;
  if (!releaseId || !/^[\w-]+$/.test(releaseId)) throw new Error('Release réelle explicite requise');
  const { createHash } = require('node:crypto');
  const protectedFiles = [];
  function collect(folder) {
    for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
      if (item.isSymbolicLink()) continue;
      const file = path.join(folder, item.name);
      if (item.isDirectory()) collect(file);
      else if (/\.(md|json)$/.test(item.name)) protectedFiles.push(file);
    }
  }
  collect(path.join(project, 'changelog', releaseId));
  const effortRelease = process.env.TRICORDER_REAL_EFFORT_RELEASE;
  if (effortRelease) {
    if (!/^[\w-]+$/.test(effortRelease)) throw new Error('Release de temps explicite requise');
    collect(path.join(project, 'changelog', effortRelease));
  }
  const digest = () => protectedFiles.map(file => createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
  const before = digest();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-real-readonly-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  write(path.join(temp, 'state/settings.json'), { extras: [project], activeProject: project, contexts: { [project]: { release: releaseId } } });
  let app;
  const errors = [];
  try {
    app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
      ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
      env: { ...process.env, HOME: home, HISTFILE: path.join(temp, 'history'),
        TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
        TRICORDER_HOME: home, TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
    const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    await page.locator('[data-view="plan"]').click();
    await expect(page.locator('.release-state')).toContainText('Close');
    await expect(page.locator('.task-card')).toHaveCount(5);
    await page.screenshot({ path: 'test-results/real-neca-plan.png' });
    await page.locator('[data-task="T01"]').click();
    await expect(page.locator('#task-modal')).toContainText('Critères d’acceptation');
    await expect(page.locator('#task-modal')).toContainText('Réception');
    await page.screenshot({ path: 'test-results/real-neca-task-modal.png' });
    await page.locator('[data-board-close]').click();
    await page.locator('#tabs [data-view="release-kanban"]').click();
    await expect(page.locator('.kanban-card')).toHaveCount(5);
    await page.screenshot({ path: 'test-results/real-neca-kanban.png' });
    await page.locator('#tabs [data-view="agents"]').click();
    await expect(page.locator('#content')).toContainText('Historique de mission');
    await page.screenshot({ path: 'test-results/real-neca-agents.png' });
    await page.locator('[data-view="effort"]').click();
    expect(await page.locator('#content .table-scroll').first().locator('tbody tr').count()).toBeGreaterThanOrEqual(5);
    await expect(page.locator('#content .metric strong').first()).toContainText(' h ');
    const actualHeadline = await page.locator('#content .metric strong').nth(1).innerText();
    expect(actualHeadline === 'Non mesuré' || actualHeadline.includes(' h ')).toBe(true);
    await page.screenshot({ path: 'test-results/real-neca-effort.png' });
    if (effortRelease) {
      await page.locator('#release-select').selectOption(effortRelease);
      await expect(page.locator('.metric').nth(1)).toContainText('PARTIEL');
      await expect(page.locator('.metric').nth(1).locator('strong')).toHaveText('2 h 19 min');
      await expect(page.locator('#content .table-scroll').first().locator('tbody tr').filter({ hasText: 'T01' }).locator('td').nth(3)).toContainText('0 h 23 min');
      await expect(page.locator('#content .table-scroll').first().locator('tbody tr').filter({ hasText: 'T03' }).locator('td').nth(3)).toContainText('0 h 58 min');
      const t02 = page.locator('#content .table-scroll').first().locator('tbody tr').filter({ hasText: 'T02' });
      await t02.locator('.agent-breakdown summary').click();
      await expect(t02.locator('[data-agent="odoo-tester"]')).toContainText('Aucun relevé enregistré');
      await expect(page.locator('.open-timers')).toHaveCount(0);
      await page.screenshot({ path: 'test-results/real-neca-partial-effort.png' });
      await page.locator('#release-select').selectOption(releaseId);
    }
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1050, 700));
    await page.locator('[data-view="plan"]').click();
    await page.screenshot({ path: 'test-results/real-neca-compact.png' });
    const other = await page.locator('#release-select option').first().getAttribute('value');
    await page.locator('#release-select').selectOption(other);
    await page.locator('[data-view="plan"]').click();
    await page.locator('#release-select').selectOption(releaseId);
    expect(await page.evaluate(() => window.tricorder.terminals.list())).toEqual([]);
    expect(errors).toEqual([]);
    expect(digest()).toEqual(before);
  } finally {
    if (app) await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
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
    await expect(page.locator('#content')).toContainText('Le temps passé reste à enregistrer');
    await expect(page.locator('#content')).not.toContainText('Mesures natives attribuées');
    await expect(page.locator('#content')).not.toContainText('odoo_usage.py');
    await page.locator('[data-view="agents"]').click();
    await expect(page.locator('#content')).toContainText('Activité des agents');
    await expect(page.locator('[data-cockpit="associate"]')).toHaveCount(0);
    await page.evaluate(({ project, releaseId }) => window.tricorder.cockpit.bind({ project, release: releaseId, task: 'T02', flow: '.odoo-agents/flows/maintenance.json', provider: 'codex' }), { project, releaseId });
    await page.locator('[data-action="refresh"]').click();
    await expect(page.locator('.native-binding')).toContainText('synthetic-thread');
    await expect(page.locator('.project-item.needs-human .human-alert')).toHaveText('!');
    expect(await app.evaluate(() => globalThis.tricorderNotifications)).toBeGreaterThan(0);
    await page.locator('#tabs [data-view="release-kanban"]').click();
    await page.locator('[data-board-filter="waiting"]').click();
    await expect(page.locator('.release-kanban .kanban-card')).toHaveCount(1);
    await expect(page.locator('.release-kanban .kanban-card')).toContainText('T02');
    await expect(page.locator('.release-kanban .provider-icon[aria-label="OpenAI"]')).toHaveCount(1);
    await expect(page.locator('.release-kanban .board-owner')).toContainText('Responsable déclaré');
    await page.locator('[data-release-task="T02"]').click();
    await expect(page.locator('.board-detail')).toContainText('Votre décision est attendue');
    await expect(page.locator('.board-detail')).not.toContainText('DO-NOT-EXPOSE-PRIVATE');
    await page.locator('[data-board-close]').click();
    await page.locator('[data-view="agents"]').click();
    await expect(page.locator('.quality-panel')).toContainText('10');
    await expect(page.locator('#content')).not.toContainText('DO-NOT-EXPOSE-PRIVATE');
    await page.locator('.technical-details > summary').click();
    await page.locator('[data-native-events]').click();
    await expect(page.locator('#modal')).toContainText('exec_approval_request');
    await expect(page.locator('#modal')).not.toContainText('DO-NOT-EXPOSE-PRIVATE');
    await page.locator('[data-action="modal-close"]').click();
    const observed = await page.evaluate(p => window.tricorder.cockpit.observations(p), project);
    expect(observed[0].usage.active_seconds).toBe(20);
    expect(observed[0].usage.tokens.total_tokens).toBe(140);
    await page.locator('[data-view="effort"]').click();
    await expect(page.locator('#content')).toContainText('Provisoire');
    await page.locator('.technical-details > summary').click();
    await page.locator('[data-usage]').click();
    await expect(page.locator('#modal')).toContainText('import-usage');
    await page.locator('[data-cockpit="copy-command"]').click();
    expect(await page.evaluate(() => window.tricorder.clipboard.read())).toContain('--task');
    expect(fs.existsSync(path.join(project, 'changelog', releaseId, 'effort.json'))).toBe(false);
    await page.locator('[data-action="modal-close"]').click();
    await page.screenshot({ path: 'test-results/roadmap-effort.png' });
    await page.locator('[data-view="plan"]').click();
    await expect(page.locator('.task-acceptance')).toHaveCount(0);
    await expect(page.locator('[data-plan-mode="graph"]')).toBeVisible();
    await expect(page.locator('[data-cockpit="graph"]')).toHaveCount(0);
    await expect(page.locator('[data-cockpit="handoff"]')).toHaveCount(0);
    await projectView(page, 'environments');
    await expect(page.locator('#content')).not.toContainText('Fichiers reçus');
    await expect(page.locator('#content')).toContainText('Stack locale');
    await projectView(page, 'documents');
    await expect(page.locator('[data-cockpit="handoff"]')).toHaveCount(0);
    await page.locator('[data-files="inbox"]').first().click();
    await page.locator('[data-preview="inbox/ticket.eml"]').click();
    await expect(page.locator('.document-text')).toContainText('Demande synthétique');
    await page.locator('[data-action="modal-close"]').click();
    await page.locator('#content [data-cockpit="search"]').click();
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
    await projectView(page, 'sources');
    await page.locator('[data-cockpit="profile"]').click();
    await page.locator('#profile-kind').selectOption('online');
    await page.locator('[data-cockpit="save-profile"]').click();
    await expect(page.locator('#content')).toContainText('Odoo Online');
    await page.locator('[data-cockpit="preferences"]').click();
    await page.locator('#pref-size').fill('16');
    await page.locator('#pref-contrast').check();
    await page.locator('#preferences-form button[type=submit]').click();
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
    await page.locator('[data-view="plan"]').click();
    await page.keyboard.press('Control+Shift+T');
    await expect(page.locator('.terminal-host')).toHaveCount(1);
    const terminal = await page.evaluate(async () => (await window.tricorder.terminals.list())[0]);
    expect(terminal.workingDirectory).toBe(work);
    expect(terminal.task).toBeNull();
    await expect(page.locator('#terminal-context')).toBeHidden();
    await expect(page.locator('.provider-icon[aria-label="Shell"]').first()).toBeVisible();
    expect((await page.evaluate(async () => (await window.tricorder.terminals.list())[0])).task).toBeNull();
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

test('intentions, dependency graph and concurrent activities remain usable at compact size and zoom', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-intentions-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const { project, releaseId } = fixture(home);
  write(path.join(project, 'changelog', releaseId, 'intentions.json'), { schema: 1, revision: 1, items: [
    { id: 'I01', text: 'Conserver la demande originale et ses décisions.', purpose: 'Rendre les factures fiables', status: 'planned',
      source: { path: `changelog/${releaseId}/demande.md`, original: 'Source figée initiale' }, tasks: ['T01', 'T03'], constraints: ['Copie locale'], questions: [], decisions: [{ at: '2026-09-15', text: 'Contrôler la somme des parties.' }] },
  ] });
  const now = new Date().toISOString();
  write(path.join(project, '.odoo-agents/orchestration.json'), { schema: 1, id: 'main-stable', project, release: releaseId,
    status: 'active', phase: 'Examine le résultat de T01', owner: 'Codex principal', provider: 'codex', model: 'principal',
    started_at: now, phase_started_at: now, updated_at: now, authorized_tasks: ['T01', 'T02', 'T03'] });
  const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
    env: { ...process.env, HOME: home, TRICORDER_HOME: home,
      TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
      TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  const errors = [];
  try {
    const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    await app.evaluate(({ ipcMain }, { project, releaseId, now }) => {
      ipcMain.removeHandler('observations');
      ipcMain.handle('observations', () => ['T02', 'T03'].map((task, i) => ({ id: task, project, release: releaseId, task, provider: 'claude', role: i ? 'odoo-tester' : 'odoo-developer',
        agents: [{ nativeId: task, state: i ? 'tool' : 'active', stale: false, startedAt: now, stageStartedAt: now, lastAt: now, events: [] }] })));
    }, { project, releaseId, now });
    await expect(page.locator('#activity-strip')).toContainText('3 activités', { timeout: 12000 });
    const nav = await page.locator('#tabs [data-view]').evaluateAll(nodes => nodes.map(n => n.dataset.view));
    expect(nav.indexOf('intentions')).toBeLessThan(nav.indexOf('plan'));
    await page.locator('#tabs [data-view="intentions"]').click();
    await page.locator('[data-intention="I01"]').click();
    await expect(page.locator('.intention-detail')).toContainText('Conserver la demande originale');
    await expect(page.locator('.intention-detail')).toContainText('Contrôler la somme des parties');
    await page.locator('.intention-source summary').click();
    await expect(page.locator('.intention-source pre')).toContainText('Source figée initiale');
    await page.screenshot({ path: 'test-results/intentions-1440.png' });
    await page.locator('.intention-detail [data-task="T01"]').click();
    await expect(page.locator('#task-modal')).toContainText('Intentions couvertes');
    await expect(page.locator('#task-modal [data-intention="I01"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('#tabs [data-view="plan"]').click();
    await expect(page.locator('[data-task="main-stable"]')).toContainText('Orchestration');
    await page.locator('[data-plan-filter="executing"]').click();
    await expect(page.locator('.task-card')).toHaveCount(3);
    await page.locator('[data-plan-filter="all"]').click();
    await page.locator('[data-plan-mode="graph"]').click();
    await page.locator('[data-graph-select="T03"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.graph-selection')).toContainText('En amont : T01, T02');
    await expect(page.locator('[data-graph-select="T03"]')).toBeFocused();
    expect(await page.locator('.dependency-canvas > svg').evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(500);
    await expect(page.locator('.dependency-edge')).toHaveCount(2);
    const stable = await page.locator('.dependency-canvas').evaluate(el => { window.graphNodeBeforeRefresh = el; return true; });
    expect(stable).toBe(true);
    await page.locator('[data-action="refresh"]').evaluate(el => el.click());
    await expect(page.locator('#sync-status')).toContainText('À jour');
    expect(await page.locator('.dependency-canvas').evaluate(el => el === window.graphNodeBeforeRefresh)).toBe(true);
    await page.screenshot({ path: 'test-results/dependencies-1440.png' });
    await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.setSize(1000, 700); win.webContents.setZoomFactor(1.25); });
    await page.setViewportSize({ width: 1000, height: 700 });
    await expect(page.locator('#tabs [data-view="intentions"]')).toBeInViewport();
    await page.locator('[data-plan-mode="list"]').click();
    await expect(page.locator('[data-plan-mode="list"]')).toBeFocused();
    const timerBefore = await page.locator('[data-plan-task="T02"] .activity-timer').textContent();
    await expect(page.locator('[data-plan-task="T02"] .activity-timer')).not.toHaveText(timerBefore, { timeout: 3000 });
    await page.locator('#tabs [data-view="agents"]').click();
    await expect(page.locator('.activity-row')).toHaveCount(3);
    await expect(page.locator('.mission-history')).not.toHaveAttribute('open');
    await page.locator('#provider-quotas button').first().click();
    await expect(page.locator('#modal')).toContainText('Limites des comptes');
    await expect(page.locator('#modal .quota-content section')).toHaveCount(2);
    await page.screenshot({ path: 'test-results/quotas-1000-zoom125.png' });
    await page.keyboard.press('Escape');
    const metrics = await page.evaluate(() => {
      const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
      const luminance = value => rgb(value).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const ratios = [...document.querySelectorAll('.activity-row strong, .activity-row > span, #content h2')].map(el => {
        let parent = el, background;
        while (parent) { background = getComputedStyle(parent).backgroundColor; if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') break; parent = parent.parentElement; }
        const fg = luminance(getComputedStyle(el).color), bg = luminance(background || 'rgb(0, 0, 0)');
        return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
      });
      return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, ratios };
    });
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    expect(Math.min(...metrics.ratios)).toBeGreaterThanOrEqual(4.5);
    fs.writeFileSync('test-results/ui-measurements.json', JSON.stringify(metrics, null, 2));
    await page.screenshot({ path: 'test-results/activities-1000-zoom125.png' });
    await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.setSize(1000, 900); win.webContents.setZoomFactor(1); });
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.locator('#tabs [data-view="release-kanban"]').click();
    await page.screenshot({ path: 'test-results/orchestration-1000.png' });
    await page.locator('[data-view="kanban"]').click();
    await page.locator('[data-action="kanban-executing"]').click();
    await expect(page.locator('.kanban-card')).toHaveCount(3);
    expect(errors).toEqual([]);
  } finally {
    await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock')); fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('live requests appear before planning and reconcile with tasks without manual refresh', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-live-requests-'));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const { project, releaseId } = fixture(home);
  const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
    ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
    env: { ...process.env, HOME: home, TRICORDER_HOME: home,
      TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
      TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  try {
    const page = await app.firstWindow();
    await expect(page.locator('#release-select')).toHaveValue(releaseId);
    const newRelease = '2026-09-15_01_demandes-en-direct';
    const folder = path.join(project, 'changelog', newRelease);
    write(path.join(folder, 'README.md'), '<!-- release ouverte -->\n# Demandes en direct');
    const register = { schema: 1, revision: 1, items: [{ id: 'I01', text: 'Conserver exactement ma demande initiale', purpose: 'Demande reçue en direct', status: 'clarify', tasks: [] }] };
    write(path.join(folder, 'intentions.json'), register);
    await expect(page.locator(`#release-select option[value="${newRelease}"]`)).toHaveCount(1, { timeout: 10000 });
    await page.locator('#release-select').selectOption(newRelease);
    await page.locator('#tabs [data-view="plan"]').click();
    await expect(page.locator('[data-plan-task="intention:I01"]')).toContainText('À préciser');
    await expect(page.locator('[data-plan-task="intention:I01"] [data-task]')).toHaveCount(0);
    await page.locator('#tabs [data-view="release-kanban"]').click();
    await expect(page.locator('.release-kanban [data-intention="I01"]')).toBeVisible();
    await page.locator('[data-view="kanban"]').click();
    await page.locator('[data-kanban-intention="I01"]').click();
    await expect(page.locator('.intention-detail')).toContainText('Conserver exactement ma demande initiale');
    await page.locator('#tabs [data-view="plan"]').click();
    const source = `changelog/${newRelease}/demande.md`; write(path.join(project, source), '# Demande conservée');
    write(path.join(folder, 'plan.json'), { schema: 1, tasks: [{ id: 'T01', title: 'Résultat retenu après revue', request: source,
      acceptance: ['Résultat vérifié'], risk: 'normal', route: 'module', scopes: ['orbital_custom'], depends_on: [], intentions: ['I01'] }] });
    register.items[0].status = 'planned'; register.items[0].tasks = ['T01']; register.revision++;
    write(path.join(folder, 'intentions.json'), register);
    await expect(page.locator('[data-plan-task="T01"]')).toContainText('Résultat retenu', { timeout: 10000 });
    await expect(page.locator('[data-plan-task="intention:I01"]')).toHaveCount(0);
    await page.locator('#tabs [data-view="release-kanban"]').click();
    await expect(page.locator('.release-kanban [data-release-task="T01"]')).toBeVisible();
    await expect(page.locator('.release-kanban [data-intention="I01"]')).toHaveCount(0);
    // Removing the planned task must expose the unmet request again, not lose it.
    write(path.join(folder, 'plan.json'), { schema: 1, tasks: [] });
    await expect(page.locator('.release-kanban [data-intention="I01"]')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/live-requests.png' });
    await page.locator('#tabs [data-view="intentions"]').click();
    await page.locator('.intention-card[data-intention="I01"]').click();
    await expect(page.locator('.intention-detail')).toContainText('Conserver exactement ma demande initiale');
  } finally {
    await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
    await cleanupBroker(path.join(temp, 'run/pty.sock')); fs.rmSync(temp, { recursive: true, force: true });
  }
});

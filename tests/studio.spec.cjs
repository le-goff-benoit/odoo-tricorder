const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { cleanupBroker } = require('./terminal-fixture.cjs');
let directory, app, page;
async function studioPage() {
  return app.firstWindow();
}

async function quitApplication() { await app.close(); }

test.beforeEach(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-studio-ui-'));
  app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? ['--workflow-studio'] : [root, '--workflow-studio'], env: { ...process.env, PATH: path.join(directory, 'bin') + ':' + process.env.PATH, TRICORDER_STATE_DIR: directory, TRICORDER_HOME: directory, TRICORDER_TEST_MODE: '1' }, timeout: 20000 });
  page = await studioPage();
  await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
});
test.afterEach(async () => {
  // Startup detaches a persistent broker. Wait until it has created its socket,
  // then close this test's sessions before removing the synthetic home.
  if (app) {
    if (page && !page.isClosed()) await page.evaluate(() => window.tricorder.terminals.list());
    await quitApplication();
  }
  if (directory) {
    await cleanupBroker(path.join(directory, 'cockpit/odoo-tricorder/pty.sock'));
    await cleanupBroker(path.join(directory, 'studio-pty.sock'));
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

async function example() { await page.getByRole('button', { name: 'Essayer un exemple' }).click(); await expect(page.getByRole('heading', { name: "De l'intention au résultat" })).toBeVisible(); }
async function simulate() { await page.getByRole('button', { name: 'Exécuter…' }).click(); await page.getByRole('button', { name: 'Simuler le parcours' }).click(); await expect(page.locator('#run-banner')).toContainText('Simulation'); }
async function receive(id, hasCriteria = false) {
  const node = page.locator(`.node[data-id="${id}"]`);
  await expect(node).toHaveAttribute('data-status', 'returned'); await node.click();
  if (hasCriteria) await page.locator('#receipt-form input[type=checkbox]').check();
  await page.getByLabel('Commentaire de validation').fill('Résultat examiné dans le contexte simulé.');
  await page.getByRole('button', { name: 'Valider le résultat' }).click();
  await expect(node).toHaveAttribute('data-status', 'accepted');
}

test('first use: generic project, graph editing, undo, persisted workflow and keyboard list', async () => {
  await example();
  await expect(page.locator('.node')).toHaveCount(6);
  await page.locator('.node[data-id="analyse"]').click();
  await page.getByLabel('Nom du bloc', { exact: true }).fill('Clarifier le besoin métier');
  await page.getByText('Reprises, ressources et position').click();
  await page.getByLabel('Position X', { exact: true }).fill('110');
  await page.getByRole('button', { name: 'Appliquer au bloc' }).click();
  await expect(page.locator('.node[data-id="analyse"] .mission')).toHaveText('Clarifier le besoin métier');
  await page.getByRole('button', { name: 'Annuler la modification' }).click();
  await expect(page.locator('.node[data-id="analyse"] .mission')).toHaveText('Comprendre la demande');
  await page.getByRole('button', { name: 'Rétablir la modification' }).click();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.getByRole('button', { name: 'Changer la vue canevas ou liste' }).click();
  await expect(page.getByRole('cell', { name: 'Clarifier le besoin métier' })).toBeVisible();
  await page.getByRole('button', { name: 'Projets', exact: true }).click();
  await page.getByRole('button', { name: /Mon premier projet/ }).click();
  await page.getByRole('button', { name: 'Ouvrir le workflow' }).click();
  await expect(page.getByRole('cell', { name: 'Clarifier le besoin métier' })).toBeVisible();
  await page.screenshot({ path: path.join(test.info().outputDir, 'studio-list.png'), fullPage: true });
});

test('simulation: two branches, human decision, truthful results and single documentation view', async () => {
  await example(); await simulate();
  await receive('analyse', true);
  await receive('build'); await receive('test');
  await expect(page.locator('.node[data-id="decision"]')).toHaveAttribute('data-status', 'waiting');
  await page.locator('.node[data-id="decision"]').click();
  await expect(page.getByRole('button', { name: 'Approuver la suite' })).toBeVisible();
  await page.screenshot({ path: path.join(test.info().outputDir, 'studio-decision.png'), fullPage: true });
  await page.getByRole('button', { name: 'Approuver la suite' }).click();
  await receive('bilan');
  await expect(page.locator('#run-banner')).toContainText('Terminée');
  await page.getByRole('tab', { name: 'Documentation' }).click();
  for (const heading of ['Intention', 'Plan', 'Réalisation', 'Tests et limites', 'Livraison et documentation', 'Décisions et suite']) await expect(page.locator('#document-view').getByRole('heading', { name: heading, exact: true })).toBeVisible();
  await expect(page.locator('#document-view')).toContainText('aucun résultat métier réel');
});

test('decisions persist after application restart and reject skips its branch', async () => {
  await example(); await simulate(); await receive('analyse', true); await receive('build'); await receive('test');
  await expect(page.locator('.node[data-id="decision"]')).toHaveAttribute('data-status', 'waiting');
  await quitApplication();
  app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? ['--workflow-studio'] : [root, '--workflow-studio'], env: { ...process.env, PATH: path.join(directory, 'bin') + ':' + process.env.PATH, TRICORDER_STATE_DIR: directory, TRICORDER_HOME: directory, TRICORDER_TEST_MODE: '1' } });
  page = await studioPage();
  await page.getByRole('button', { name: 'Projets', exact: true }).click();
  await page.getByRole('button', { name: /Mon premier projet/ }).click();
  await page.getByRole('button', { name: 'Consulter', exact: true }).click();
  await page.locator('.node[data-id="decision"]').click();
  await page.getByRole('button', { name: 'Refuser la suite' }).click();
  await expect(page.locator('.node[data-id="bilan"]')).toHaveAttribute('data-status', 'skipped');
});

test('connections never infer native authentication and real unconfigured launch is blocked', async () => {
  await page.getByRole('button', { name: 'Connexions', exact: true }).click();
  await expect(page.getByText('GitHub → Odoo.sh', { exact: true })).toBeVisible();
  await expect(page.getByText(/Aucun transport authentifié/)).toBeVisible();
  await page.getByRole('button', { name: 'Bibliothèque', exact: true }).click();
  await page.locator('article').filter({ has: page.getByRole('heading', { name: 'Évolution logicielle', exact: true }) }).getByRole('button', { name: 'Utiliser' }).click();
  await page.getByRole('button', { name: 'Exécuter…' }).click();
  await expect(page.getByRole('button', { name: 'Lancer l’exécution réelle' })).toBeDisabled();
  await expect(page.getByRole('dialog')).toContainText('Modèle IA à définir');
});

test('live events preserve text input and focus; layout fits 1024 and dark theme', async () => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await example(); await simulate();
  await expect(page.locator('.node[data-id="analyse"]')).toHaveAttribute('data-status', 'returned');
  await page.locator('.node[data-id="analyse"]').click();
  const note = page.getByLabel('Commentaire de validation'); await note.fill('Texte en cours de rédaction');
  await page.waitForTimeout(2200);
  await expect(note).toBeFocused(); await expect(note).toHaveValue('Texte en cours de rédaction');
  await page.getByRole('button', { name: 'Thème sombre' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: path.join(test.info().outputDir, 'studio-dark-1024.png'), fullPage: true });
});

test('structured proposal needs preview, rejects stale revision and never starts a run', async () => {
  await example(); await page.getByRole('button', { name: 'Assistant IA' }).click();
  await page.getByText('Examiner une proposition structurée').click();
  await page.getByLabel('Proposition JSON').fill(JSON.stringify({ baseRevision: 99, operations: [] }));
  await page.getByRole('button', { name: 'Prévisualiser' }).click();
  await expect(page.getByRole('alert')).toContainText('autre révision');
  await page.getByLabel('Proposition JSON').fill(JSON.stringify({ baseRevision: 1, operations: [{ type: 'add-node', node: { id: 'new-step', kind: 'decision', title: 'Vérifier la publication', options: ['approve', 'reject'] } }] }));
  await page.getByRole('button', { name: 'Prévisualiser' }).click();
  await expect(page.getByRole('dialog')).toContainText('Ajouter « Vérifier la publication »');
  await page.getByRole('button', { name: 'Appliquer au brouillon' }).click();
  await expect(page.locator('.node')).toHaveCount(7);
  await expect(page.getByRole('tab', { name: 'Exécution', exact: true })).toBeDisabled();
});

test('template creation has a real terminal; file edits require validated reload', async () => {
  await page.getByRole('button', { name: 'Bibliothèque', exact: true }).click();
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Commande locale avec validation', exact: true }) });
  await card.getByRole('button', { name: 'Modifier le modèle' }).click();
  await expect(page.locator('.breadcrumb')).toContainText('Bibliothèque de modèles');
  await page.getByRole('button', { name: 'Ouvrir le terminal du workflow' }).click();
  await expect(page.locator('#terminal-workspace')).toBeVisible();
  const input = page.locator('.xterm-helper-textarea'); await input.focus();
  const script = 'import json; from pathlib import Path; p=next(Path("workflows").glob("*.json")); g=json.loads(p.read_text()); g["title"]="Modèle corrigé au terminal"; p.write_text(json.dumps(g))';
  await page.keyboard.type("python3 -c '" + script + "'"); await page.keyboard.press('Enter');
  expect(fs.readFileSync(path.join(directory, 'library/.tricorder/AGENTS.md'), 'utf8')).toContain('sans agent dédié');
  const files = path.join(directory, 'library/.tricorder/workflows');
  await expect.poll(() => { const file = fs.readdirSync(files).find(n => n.endsWith('.json')); return JSON.parse(fs.readFileSync(path.join(files, file))).title; }).toBe('Modèle corrigé au terminal');
  await page.getByRole('button', { name: 'Recharger et valider' }).click();
  await expect(page.getByRole('heading', { name: 'Modèle corrigé au terminal' })).toBeVisible();
  await page.screenshot({ path: path.join(test.info().outputDir, 'studio-template-terminal.png'), fullPage: true });
  await page.locator('.xterm-helper-textarea:visible').focus(); await page.keyboard.type('exit'); await page.keyboard.press('Enter');
  await expect.poll(async () => (await page.evaluate(() => window.tricorder.terminals.list())).every(s => !s.alive)).toBe(true);
});

test('recurrence activation shows models and persists; communication needs exact recipients', async () => {
  await page.getByRole('button', { name: 'Bibliothèque', exact: true }).click();
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Message NECA → notification', exact: true }) });
  await card.getByRole('button', { name: 'Utiliser', exact: true }).click();
  await page.locator('.node[data-id="notify"]').click();
  await page.getByLabel('Canal de communication').selectOption('telegram');
  await page.getByRole('button', { name: 'Appliquer au bloc' }).click();
  await page.getByRole('button', { name: 'Planifier', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Modèles IA : aucun');
  await expect(page.getByRole('dialog')).toContainText('Connecteur telegram non connecté');
  await page.getByLabel(/J’active cette révision/).check();
  await page.getByRole('button', { name: 'Activer la récurrence' }).click();
  await expect(page.getByRole('heading', { name: 'Workflows récurrents' })).toBeVisible();
  await expect(page.locator('article.card')).toContainText('Simulation');
  await page.locator('article.card').getByRole('button', { name: 'Suspendre' }).click();
  await expect(page.locator('article.card')).toContainText('Suspendue');
});

test('window closes to Ubuntu tray and remains available', async () => {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible())).toBe(false);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].show());
  await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
});

test('new plugin declared in the terminal workspace is selectable without a dedicated agent', async () => {
  await page.getByRole('button', { name: 'Bibliothèque', exact: true }).click();
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Analyse', exact: true }) });
  await card.getByRole('button', { name: 'Modifier le modèle' }).click();
  await expect(page.locator('.breadcrumb')).toContainText('Bibliothèque de modèles');
  await expect(page.locator('.node[data-id="work"]')).toBeVisible();
  const plugin = { id: 'future-plugin', title: 'Nouveau plugin', provider: 'codex', operations: ['read'] };
  const workspace = path.join(directory, 'library/.tricorder');
  expect(fs.readFileSync(path.join(workspace, 'AGENTS.md'), 'utf8')).toContain('tricorder-guidance version=');
  fs.writeFileSync(path.join(workspace, 'plugins.json'), JSON.stringify({ schema: 1, plugins: [plugin] }));
  await page.locator('.node[data-id="work"]').click();
  await page.getByText('Connexions de cette étape', { exact: true }).click();
  await page.getByRole('button', { name: 'Actualiser les capacités' }).click();
  await page.getByText('Agent et modèle pour cette étape', { exact: true }).click();
  await page.getByLabel('Agent dédié (facultatif)').selectOption('generalist');
  await page.getByLabel('Capacités de plugins (facultatives)').selectOption({ label: 'Nouveau plugin · read' });
  await page.getByLabel('Modèle IA', { exact: true }).fill('explicit-test-model');
  await page.getByRole('button', { name: 'Appliquer au bloc' }).click();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.getByRole('button', { name: 'Exécuter…' }).click();
  await expect(page.getByRole('dialog')).toContainText('transport d’outils non qualifié');
  await expect(page.getByRole('button', { name: 'Lancer l’exécution réelle' })).toBeDisabled();
});

test('real isolated command produces evidence, then waits for human receipt', async () => {
  await page.getByRole('button', { name: 'Bibliothèque', exact: true }).click();
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Commande locale avec validation', exact: true }) });
  await card.getByRole('button', { name: 'Utiliser', exact: true }).click();
  await page.getByRole('button', { name: 'Exécuter…' }).click();
  await page.getByRole('button', { name: 'Lancer l’exécution réelle' }).click();
  await expect(page.locator('.node[data-id="check"]')).toHaveAttribute('data-status', 'returned');
  await page.locator('.node[data-id="check"]').click();
  await expect(page.locator('#inspector')).toContainText('Python opérationnel');
  await expect(page.locator('.node[data-id="decision"]')).toHaveAttribute('data-status', 'pending');
  await receive('check', true);
  await expect(page.locator('.node[data-id="decision"]')).toHaveAttribute('data-status', 'waiting');
});

test('global workflow runs independently of Git projects and draws right-angle links', async () => {
  await page.getByRole('button', { name: 'Globaux', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workflows globaux', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Choisir un modèle' }).click();
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Message NECA → notification', exact: true }) });
  await card.getByRole('button', { name: 'Utiliser', exact: true }).click();
  await expect(page.locator('.breadcrumb')).toContainText('Workflows globaux');
  const paths = await page.locator('svg path.edge').evaluateAll(elements => elements.map(e => e.getAttribute('d')));
  expect(paths.length).toBeGreaterThan(0);
  for (const d of paths) { expect(d).toContain('H'); expect(d).toContain('V'); expect(d).not.toMatch(/[CQ]/); }
  await simulate();
  await expect(page.locator('.node[data-id="mail"]')).toHaveAttribute('data-status', 'accepted');
  await page.screenshot({ path: path.join(test.info().outputDir, 'studio-global-orthogonal.png'), fullPage: true });
  await page.getByRole('button', { name: 'Projets', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Globaux', exact: true }).click();
  await page.getByRole('button', { name: 'Consulter', exact: true }).click();
  await expect(page.locator('.node[data-id="mail"]')).toHaveAttribute('data-status', 'accepted');
});

test('exported clickable file opens on another local instance as a draft without execution', async () => {
  await example();
  const file = path.join(directory, 'example.tricorder-workflow');
  await app.evaluate(({ dialog }, target) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: target }); }, file);
  await page.getByRole('button', { name: 'Exporter…', exact: true }).click();
  await expect.poll(() => fs.existsSync(file)).toBe(true);
  const exported = JSON.parse(fs.readFileSync(file));
  expect(exported.format).toBe('tricorder.workflow');
  await quitApplication();
  const destination = path.join(directory, 'other-computer');
  app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? [file] : [root, file], env: { ...process.env, TRICORDER_STATE_DIR: destination, TRICORDER_HOME: destination, TRICORDER_TEST_MODE: '1' } });
  page = await studioPage();
  await expect(page.getByRole('dialog')).toContainText('Importer un workflow portable');
  await page.getByLabel('Destination', { exact: true }).selectOption('workspace');
  await page.getByRole('button', { name: 'Importer le brouillon' }).click();
  await expect(page.locator('.breadcrumb')).toContainText('Workflows globaux');
  await expect(page.locator('.node')).toHaveCount(6);
  const data = await page.evaluate(() => window.studio.request({ action: 'project.get', project: 'workspace' }));
  expect(data.runs).toHaveLength(0);
  expect(data.workflows).toHaveLength(1);
});

test('update dialog is explicit and test mode makes no automatic network request', async () => {
  await page.getByRole('button', { name: 'Mises à jour', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Version installée');
  await expect(page.getByRole('dialog')).toContainText('hors mode de test');
  await expect(page.getByRole('button', { name: 'Télécharger le paquet Ubuntu' })).toHaveCount(0);
});

test('repeated example clicks never create duplicate demo projects', async () => {
  await page.getByRole('button', { name: 'Essayer un exemple' }).evaluate(button => { button.click(); button.click(); });
  await expect(page.getByRole('heading', { name: "De l'intention au résultat" })).toBeVisible();
  await page.getByRole('button', { name: 'Projets', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(1);
  await example();
  await page.getByRole('button', { name: 'Projets', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(1);
});

test('trusted local adapter runs through the UI and automatic validation completes without a human receipt', async () => {
  const script = path.join(directory, 'adapter.py');
  fs.writeFileSync(script, `import json,sys\np=json.load(sys.stdin)\nif p['action']=='describe':\n print(json.dumps({'protocol':'tricorder.tool/1','identity':'ui-fixture','connected':True,'operations':{'read':'read'}}))\nelse:\n print(json.dumps({'ok':True,'identity':'ui-fixture','outputs':{'value':42}}))\n`);
  const folder = path.join(directory, 'workspace/.tricorder');
  fs.writeFileSync(path.join(folder, 'plugins.json'), JSON.stringify({ schema: 1, plugins: [{ id: 'fixture', title: 'Adaptateur de test', provider: 'local', operations: ['read'], transport: { argv: ['/usr/bin/python3', script], timeout: 3 } }] }));
  const graph = { schema: 1, id: 'automatic-tool', title: 'Lecture automatique', nodes: [{ id: 'read', title: 'Lire le résultat', kind: 'document', validation: 'automatic', capabilities: [{ plugin: 'fixture', operation: 'read' }], outputs: { value: 'number' } }], edges: [] };
  await page.evaluate(graph => window.studio.request({ action: 'workflow.save', project: 'workspace', graph }), graph);
  await page.getByRole('button', { name: 'Globaux', exact: true }).click();
  await page.getByRole('button', { name: 'Connexions', exact: true }).click();
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Adaptateur de test', exact: true }) });
  await card.getByRole('button', { name: 'Vérifier l’adaptateur…' }).click();
  await expect(page.getByRole('dialog')).toContainText(script);
  await page.getByRole('button', { name: 'Exécuter le contrôle' }).click();
  await expect(card).toContainText('Utilisable');
  await page.getByRole('button', { name: 'Globaux', exact: true }).click();
  await page.getByRole('button', { name: 'Ouvrir le workflow' }).click();
  await page.getByRole('button', { name: 'Exécuter…' }).click();
  await expect(page.getByRole('dialog')).toContainText('Validation automatique');
  await page.getByRole('button', { name: 'Lancer l’exécution réelle' }).click();
  await expect(page.locator('#run-banner')).toContainText('Terminée');
  await expect(page.locator('.node[data-id="read"]')).toHaveAttribute('data-status', 'accepted');
  await expect(page.getByRole('button', { name: 'Valider le résultat' })).toHaveCount(0);
  await page.screenshot({ path: path.join(test.info().outputDir, 'automatic-adapter.png'), fullPage: true });
});

test('large workflow remains editable in canvas and keyboard list', async () => {
  const graph = { schema: 1, id: 'large', title: 'Mille étapes', nodes: Array.from({ length: 1000 }, (_, i) => ({ id: `n${i}`, title: `Étape ${i}`, kind: 'join', position: { x: (i % 20) * 300, y: Math.floor(i / 20) * 170 } })), edges: Array.from({ length: 999 }, (_, i) => ({ id: `e${i}`, from: `n${i}`, to: `n${i + 1}` })) };
  await page.evaluate(graph => window.studio.request({ action: 'workflow.save', project: 'workspace', graph }), graph);
  await page.getByRole('button', { name: 'Globaux', exact: true }).click();
  const start = Date.now();
  await page.getByRole('button', { name: 'Ouvrir le workflow' }).click();
  await expect(page.locator('.node')).toHaveCount(1000);
  expect(Date.now() - start).toBeLessThan(10000);
  await page.getByRole('button', { name: 'Changer la vue canevas ou liste' }).click();
  await expect(page.getByRole('cell', { name: 'Étape 999', exact: true })).toBeAttached();
});

test('application navigation separates overview, workflow use and editor with compact responsive spacing', async () => {
  const sidebar = page.getByRole('complementary', { name: 'Tricorder', exact: true });
  await expect(sidebar.locator('.brand-name')).toHaveText('Tricorder');
  await expect(sidebar).not.toContainText('Éditeur de workflows');
  await expect(sidebar.getByRole('button', { name: 'Activité des workflows' })).toHaveAttribute('aria-current', 'page');
  await example(); await simulate();
  await page.getByRole('button', { name: 'Activité des workflows', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vue d’ensemble' })).toBeVisible();
  await expect(page.locator('.overview-stats')).toContainText('Exécutions ouvertes');
  await page.screenshot({ path: path.join(test.info().outputDir, 'navigation-overview.png'), fullPage: true });
  for (const width of [1280, 1024, 800]) {
    await page.setViewportSize({ width, height: 800 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    const metrics = await sidebar.locator('.side-nav .side-item').evaluateAll(elements => elements.map(e => ({ height: e.getBoundingClientRect().height, width: e.getBoundingClientRect().width })));
    expect(metrics.every(r => r.height >= 36 && r.height <= 44)).toBe(true);
    await expect(sidebar.getByRole('button', { name: 'Mises à jour' }).locator('svg')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thème sombre' }).locator('svg')).toBeVisible();
  }
  await page.screenshot({ path: path.join(test.info().outputDir, 'navigation-compact.png'), fullPage: true });
});

test('code proposal diff is reviewable and only explicit application changes the Git project', async () => {
  const resources = await app.evaluate(() => process.resourcesPath);
  const backend = process.env.TRICORDER_EXECUTABLE ? path.join(resources, 'backend') : path.join(root, 'backend');
  const script = `import sys,json
from pathlib import Path
sys.path.insert(0,sys.argv[1])
from workflow_engine import Engine
from workflow_engine.library import node
from connectors.candidates import prepare,capture
engine=Engine(sys.argv[2]);project=engine.create_project('Projet candidat')
source=Path(project['path'])/'calc.py';source.write_text('value = 1\\n')
graph={'schema':1,'id':'proposal','title':'Proposition de code','nodes':[node('edit','Modifier le code','agent',model='synthetic',execution_mode='edit',outputs={'candidate':'object'})],'edges':[]}
engine.save(project['id'],graph)
run=engine.start(project['id'],graph);claim=engine.claim(run['id'],'edit')
prepared=prepare(engine,run,engine.store.directory/'synthetic-candidate');(prepared['workspace']/'calc.py').write_text('value = 2\\n')
ref,diff=capture(engine,run,prepared)
engine.submit(run['id'],'edit',claim['token'],{'ok':True,'summary':'Résultat synthétique pour tester la réception UI','outputs':{'candidate':ref},'patch':diff,'evidence':[ref,diff]})
print(json.dumps({'path':str(source),'run':run['id']}))`;
  const result = require('node:child_process').spawnSync('python3', ['-c', script, backend, directory], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  const seed = JSON.parse(result.stdout);
  await page.reload();
  await page.getByRole('button', { name: 'Projets', exact: true }).click();
  await page.getByRole('button', { name: /Projet candidat/ }).click();
  await page.getByRole('button', { name: 'Consulter', exact: true }).click();
  await page.locator('.node[data-id="edit"]').click();
  await page.getByRole('button', { name: 'Examiner les modifications' }).click();
  await expect(page.getByRole('dialog')).toContainText('+value = 2');
  await expect(page.getByRole('button', { name: 'Appliquer ces modifications au dépôt' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: 'Valider le résultat' }).click();
  expect(fs.readFileSync(seed.path, 'utf8')).toBe('value = 1\n');
  await page.getByRole('button', { name: 'Examiner les modifications' }).click();
  await page.getByRole('button', { name: 'Appliquer ces modifications au dépôt' }).click();
  await expect(page.getByRole('button', { name: 'Voir le code appliqué' })).toBeVisible();
  expect(fs.readFileSync(seed.path, 'utf8')).toBe('value = 2\n');
});

test('accessible navigation, editor, inspector and dialog in light and dark themes', async () => {
  const AxeBuilder = require('@axe-core/playwright').default;
  async function scan() {
    const result = await new AxeBuilder({ page }).setLegacyMode(true).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) }))).toEqual([]);
  }
  await scan();
  await example(); await scan();
  await page.locator('.node[data-id="analyse"]').click(); await scan();
  await page.getByRole('button', { name: 'Thème sombre' }).click(); await scan();
  await page.getByRole('button', { name: 'Exécuter…' }).click(); await scan();
});


test('human gate presents the full external content and candidate before approval', async () => {
  await page.getByRole('button', { name: 'Globaux', exact: true }).click();
  const operation = { action: 'update-page', target: 'synthetic-space/page', candidate: 'candidate-hash', body: 'Exact content to review', base_version: 7 };
  const graph = { schema: 1, id: 'exact-review', title: 'Exact review', nodes: [{ id: 'approve', kind: 'decision', title: 'Review publication', operation }], edges: [] };
  await page.evaluate(graph => window.studio.request({ action: 'workflow.save', project: 'workspace', graph }), graph);
  await page.getByRole('button', { name: 'Globaux', exact: true }).click();
  await page.getByRole('button', { name: 'Ouvrir le workflow', exact: true }).click();
  await simulate();
  await page.locator('.node[data-id="approve"]').click();
  await expect(page.locator('#inspector')).toContainText('Exact content to review');
  await expect(page.locator('#inspector')).toContainText('"base_version": 7');
  await expect(page.getByRole('button', { name: 'Autoriser cette opération' })).toBeVisible();
  const AxeBuilder = require('@axe-core/playwright').default;
  const scan = await new AxeBuilder({ page }).setLegacyMode(true).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map(v => v.id)).toEqual([]);
});

test('one provider choice applies to all AI steps and the project offers direct execution', async () => {
  await page.getByRole('button', { name: 'Bibliothèque', exact: true }).click();
  await page.locator('article').filter({ has: page.getByRole('heading', { name: 'Évolution logicielle', exact: true }) }).getByRole('button', { name: 'Utiliser', exact: true }).click();
  await page.getByRole('button', { name: 'Choisir l’IA', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Fournisseur IA', { exact: true }).selectOption('claude');
  await page.getByLabel('Modèle', { exact: true }).fill('explicit-claude-fixture');
  await page.getByRole('button', { name: 'Appliquer à toutes les étapes IA' }).click();
  await page.locator('.node[data-id="analyse"]').click();
  await expect(page.locator('#inspector')).toContainText('Anthropic · Claude');
  await expect(page.locator('#node-inputs')).not.toBeVisible();
  const data = await page.evaluate(async () => {
    const ctx = await window.studio.request({ action: 'workspace.get' });
    return ctx.workflows.find(g => g.title === 'Évolution logicielle');
  });
  expect(data.defaults.provider).toBe('claude');
  expect(data.defaults.model).toBe('explicit-claude-fixture');
  expect(data.nodes.filter(n => n.kind === 'agent').every(n => !Object.hasOwn(n, 'model'))).toBe(true);
  await page.getByRole('button', { name: 'Globaux', exact: true }).click();
  await page.getByRole('button', { name: 'Exécuter…', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('IA pour les étapes de travail');
  await expect(page.getByRole('dialog').getByLabel('Fournisseur IA', { exact: true })).toHaveValue('claude');
  await expect(page.getByRole('button', { name: 'Lancer l’exécution réelle' })).toBeDisabled();
});

test('native conversation: provider choice, durable questions, live graph and same terminal after restart', async () => {
  await quitApplication();
  const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  const fake = `#!/usr/bin/env python3
import json, re, shlex, subprocess, sys
print('NATIVE:' + sys.argv[0].split('/')[-1], flush=True)
command = shlex.split(re.search(r'^Pont : (.*)$', sys.argv[-1], re.M).group(1))
def call(action, value=None):
    p = subprocess.run(command + [action], input=json.dumps(value or {}), text=True, capture_output=True)
    data = json.loads(p.stdout)
    if not data['ok']: raise RuntimeError(data)
    return data['result']
item = question = None
for line in sys.stdin:
    text = line.strip()
    if text == 'exit': break
    if item is None:
        item = call('add', {'request': text, 'key': 'first'})
        claim = call('claim', {'run': item['run'], 'node': 'analyse'})
        run = call('ask', {'run': item['run'], 'node': 'analyse', 'token': claim['token'], 'text': 'Quel utilisateur est concerné ?'})
        question = run['nodes']['analyse']['question']['id']
        print('QUESTION:Quel utilisateur est concerné ?', flush=True)
    else:
        call('answer', {'run': item['run'], 'node': 'analyse', 'question': question, 'text': text})
        claim = call('claim', {'run': item['run'], 'node': 'analyse'})
        call('result', {'run': item['run'], 'node': 'analyse', 'token': claim['token'], 'result': {'ok': True, 'summary': 'Constat synthétique', 'outputs': {'finding': text}}})
        print('RECEIVED:' + text, flush=True)
`;
  for (const name of ['codex', 'claude']) { const file = path.join(bin, name); fs.writeFileSync(file, fake, { mode: 0o755 }); }
  const launch = () => electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE,
    args: process.env.TRICORDER_EXECUTABLE ? ['--workflow-studio'] : [root, '--workflow-studio'],
    env: { ...process.env, PATH: bin + ':' + process.env.PATH, TRICORDER_STATE_DIR: directory, TRICORDER_HOME: directory, TRICORDER_TEST_MODE: '1' }, timeout: 20000 });
  app = await launch(); page = await studioPage();
  await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
  const project = await page.evaluate(async () => {
    const p = await window.studio.request({action:'project.create', title:'Support synthétique'});
    await window.studio.request({action:'workflow.save',project:p.id,graph:{schema:1,id:'native-support',title:'Mon support',nodes:[{id:'analyse',kind:'agent',title:'Analyser',validation:'contract',outputs:{finding:'string'}}],edges:[]}});
    return p;
  });
  await page.getByRole('button', { name:'Projets', exact:true }).click();
  await page.getByRole('button', { name:/Support synthétique/ }).click();
  await page.getByRole('button', { name:'Ouvrir le workflow', exact:true }).click();
  await page.getByLabel('Fournisseur IA', {exact:true}).selectOption('claude');
  await page.getByRole('button', {name:'Exécuter…',exact:true}).click();
  await page.getByRole('button', {name:'Lancer dans le terminal',exact:true}).click();
  await expect(page.locator('.xterm-screen:visible')).toContainText('NATIVE:claude');
  expect(app.context().pages()).toHaveLength(1);
  await page.locator('.xterm-helper-textarea:visible').focus(); await page.keyboard.type('Demande client'); await page.keyboard.press('Enter');
  await expect(page.locator('.node[data-id=analyse]')).toHaveAttribute('data-status','waiting_input');
  await page.locator('.node[data-id=analyse]').click();
  await expect(page.locator('#inspector')).toContainText('Quel utilisateur est concerné ?');
  const before = await page.evaluate(() => window.tricorder.terminals.list());
  await quitApplication(); app = await launch(); page = await studioPage();
  await page.getByRole('button', {name:'Projets',exact:true}).click();
  await page.getByRole('button', {name:/Support synthétique/}).click();
  await page.locator('[data-action=open-conversation]').click();
  await page.getByRole('button', {name:'Retrouver la conversation',exact:true}).click();
  const after = await page.evaluate(() => window.tricorder.terminals.list());
  expect(after[0].id).toBe(before[0].id); expect(after[0].pid).toBe(before[0].pid);
  await page.locator('.xterm-helper-textarea:visible').focus(); await page.keyboard.type('Alice'); await page.keyboard.press('Enter');
  await expect(page.locator('.node[data-id=analyse]')).toHaveAttribute('data-status','accepted');
  await expect(page.locator('.xterm-screen:visible')).toContainText('RECEIVED:Alice');
  await page.screenshot({path:test.info().outputPath('native-conversation.png')});
  await page.evaluate(async id => { await window.tricorder.terminals.write({session:id,data:'exit\nexit\n'}); }, after[0].id);
  const saved = await page.evaluate(project => window.studio.request({action:'conversation.list',project}), project.id);
  expect(saved[0].provider).toBe('claude'); expect(saved[0].items).toHaveLength(1);
});

test('previous studio terminal is adopted in the main terminal without a new shell', async () => {
  await example();
  const old = await page.evaluate(async () => {
    const data = await window.studio.request({action:'bootstrap'});
    return window.studio.terminal({action:'create',project:data.projects[0].id});
  });
  await page.getByRole('button',{name:'Ouvrir le terminal du workflow'}).click();
  const sessions = await page.evaluate(() => window.tricorder.terminals.list());
  expect(sessions).toHaveLength(1);
  expect(sessions[0].id).toBe('legacy:' + old.id);
  expect(sessions[0].pid).toBe(old.pid);
  expect(sessions[0].project).toBe(path.dirname(old.project));
  await page.locator('.xterm-helper-textarea:visible').focus();
  await page.keyboard.type("printf 'ADOPTED-%s\\n' 'OK'"); await page.keyboard.press('Enter');
  await expect(page.locator('.xterm-screen:visible')).toContainText('ADOPTED-OK');
  await page.evaluate(id => window.studio.terminal({action:'stop',session:id}),old.id);
});

test('review: Odoo profiles, editable unresolved outcome and synthetic release capture', async () => {
  const packPath = process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents');
  const project = await page.evaluate(async packPath => {
    const p = await window.studio.request({action:'project.create',title:'Atelier Odoo · démonstration'});
    const preview = await window.studio.request({action:'pack.preview',path:packPath});
    await window.studio.request({action:'pack.install',project:p.id,path:packPath,digest:preview.sha256});
    await window.studio.request({action:'workflow.save',project:p.id,graph:{schema:1,id:'support-demo',title:'Support · comprendre et préparer la suite',domain:'odoo',parameters:{series:'19.0'},nodes:[
      {id:'diagnosis',title:'Support critique ?',kind:'agent',profile:'odoo-support',validation:'contract',prompt:'Établir les faits, leur impact et les inconnues. Préparer la suite sans déployer.',route_output:'severity',options:['critical','normal','unknown'],outputs:{severity:'string',finding:'string'},position:{x:40,y:70}},
      {id:'urgent',title:'Préparer le traitement urgent',kind:'agent',profile:'odoo-analyst',inputs:{finding:'string'},position:{x:380,y:30}},
      {id:'normal',title:'Préparer la réponse',kind:'agent',profile:'odoo-support',inputs:{finding:'string'},position:{x:380,y:190}},
      {id:'question',title:'Préciser les faits manquants',kind:'question',question:'Quel impact observez-vous ?',completion_outcome:'blocked',position:{x:380,y:350}}
    ],edges:[{id:'urgent-edge',from:'diagnosis',to:'urgent',outcome:'critical',mapping:{finding:'finding'}},{id:'normal-edge',from:'diagnosis',to:'normal',outcome:'normal',mapping:{finding:'finding'}},{id:'question-edge',from:'diagnosis',to:'question',outcome:'unknown'}]}});
    return p;
  }, packPath);
  await page.getByRole('button',{name:'Projets',exact:true}).click();
  await page.getByRole('button',{name:/Atelier Odoo/}).click();
  await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();
  await page.locator('.node[data-id=question]').click();
  await page.getByText('Organisation de l’étape',{exact:true}).click();
  await expect(page.getByLabel('Effet du résultat sur les tâches dépendantes')).toHaveValue('blocked');
  await page.getByLabel('Effet du résultat sur les tâches dépendantes').selectOption('succeeded');
  await page.getByRole('button',{name:'Appliquer au bloc'}).click();
  await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await expect.poll(async () => {
    const saved = await page.evaluate(id => window.studio.request({action:'project.get',project:id}), project.id);
    return saved.workflows[0].nodes.find(n => n.id === 'question').completion_outcome;
  }).toBe('succeeded');
  await page.locator('.node[data-id=diagnosis]').click();
  await page.getByText('Agent et modèle pour cette étape',{exact:true}).click();
  await expect(page.getByLabel('Agent dédié (facultatif)',{exact:true})).toHaveValue('odoo-support');
  await page.locator('#node-profile').scrollIntoViewIfNeeded();
  await page.screenshot({path:test.info().outputPath('pack-odoo.png')});
});

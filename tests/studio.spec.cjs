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

test.beforeEach(async ({}, testInfo) => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-studio-ui-'));
  const extraEnv = {};
  if (testInfo.title.startsWith('optional workflow setup')) {
    const pack = path.join(directory, 'invalid-pack'); fs.mkdirSync(pack);
    fs.writeFileSync(path.join(pack, 'tricorder-pack.json'), '{invalid');
    extraEnv.TRICORDER_AGENTS_DIR = pack;
    const project = path.join(directory, 'sample-project'); fs.mkdirSync(project); fs.mkdirSync(path.join(project, '.odoo-agents'));
    require('node:child_process').execFileSync('git', ['init', '-q', project]);
  }
  app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? ['--workflow-studio'] : [root, '--workflow-studio'], env: { ...process.env, PATH: path.join(directory, 'bin') + ':' + process.env.PATH, TRICORDER_STATE_DIR: directory, TRICORDER_HOME: directory, TRICORDER_TEST_MODE: '1', ...extraEnv }, timeout: 20000 });
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

async function example() { await page.getByRole('button', { name: 'Essayer un exemple' }).click(); await expect(page.getByRole('heading', { name: "De la demande au résultat" })).toBeVisible(); }
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
  await page.getByRole('button', { name: 'Changer la vue graphe ou liste' }).click();
  await expect(page.getByRole('cell', { name: 'Clarifier le besoin métier' })).toBeVisible();
  await page.getByRole('button', { name: 'Projets', exact: true }).click();
  await page.locator('.project-card').filter({hasText:/Mon premier projet/}).click();
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
  await page.getByRole('tab', { name: 'Rapport' }).click();
  for (const heading of ['Demande', 'Plan', 'Réalisation', 'Tests et limites', 'Livraison et documentation', 'Décisions et suite']) await expect(page.locator('#document-view').getByRole('heading', { name: heading, exact: true })).toBeVisible();
  await expect(page.locator('#document-view')).toContainText('aucun résultat métier réel');
});

test('decisions persist after application restart and reject skips its branch', async () => {
  await example(); await simulate(); await receive('analyse', true); await receive('build'); await receive('test');
  await expect(page.locator('.node[data-id="decision"]')).toHaveAttribute('data-status', 'waiting');
  await quitApplication();
  app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? ['--workflow-studio'] : [root, '--workflow-studio'], env: { ...process.env, PATH: path.join(directory, 'bin') + ':' + process.env.PATH, TRICORDER_STATE_DIR: directory, TRICORDER_HOME: directory, TRICORDER_TEST_MODE: '1' } });
  page = await studioPage();
  await page.getByRole('button', { name: 'Projets', exact: true }).click();
  await page.locator('.project-card').filter({hasText:/Mon premier projet/}).click();
  await page.getByRole('button', { name: 'Consulter', exact: true }).click();
  await page.locator('.node[data-id="decision"]').click();
  await page.getByRole('button', { name: 'Refuser la suite' }).click();
  await expect(page.locator('.node[data-id="bilan"]')).toHaveAttribute('data-status', 'skipped');
});

test('connections never infer native authentication and real unconfigured launch is blocked', async () => {
  await page.getByRole('button', { name: 'Connexions', exact: true }).click();
  await expect(page.getByText('GitHub → Odoo.sh', { exact: true })).toBeVisible();
  await expect(page.getByText(/Aucun transport authentifié/)).toBeVisible();
  await page.getByRole('button', { name: 'Modèles', exact: true }).click();
  await page.locator('article').filter({ has: page.getByRole('heading', { name: 'Évolution logicielle', exact: true }) }).getByRole('button', { name: 'Utiliser' }).click();
  await page.getByRole('button', { name: 'Créer et ouvrir le workflow' }).click();
  await page.getByRole('button', { name: 'Exécuter…' }).click();
  await page.getByText('Exécution automatique sans conversation',{exact:true}).evaluate(el => { el.parentElement.open = true; });
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
  await page.getByRole('button', { name: 'Modèles', exact: true }).click();
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
  if (!(await page.locator('.workflow-options').evaluate(el => el.open))) await page.locator('.workflow-options > summary').click();
  await page.getByRole('button', { name: 'Recharger et valider' }).click();
  await expect(page.getByRole('heading', { name: 'Modèle corrigé au terminal' })).toBeVisible();
  await page.screenshot({ path: path.join(test.info().outputDir, 'studio-template-terminal.png'), fullPage: true });
  await page.locator('.xterm-helper-textarea:visible').focus(); await page.keyboard.type('exit'); await page.keyboard.press('Enter');
  await expect.poll(async () => (await page.evaluate(() => window.tricorder.terminals.list())).every(s => !s.alive)).toBe(true);
});

test('recurrence activation shows models and persists; communication needs exact recipients', async () => {
  await page.getByRole('button', { name: 'Modèles', exact: true }).click();
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Nouveau message → notification', exact: true }) });
  await card.getByRole('button', { name: 'Utiliser', exact: true }).click();
  await page.getByRole('button', { name: 'Créer et ouvrir le workflow' }).click();
  await page.locator('.node[data-id="notify"]').click();
  await page.getByLabel('Canal de communication').selectOption('telegram');
  await page.getByRole('button', { name: 'Appliquer au bloc' }).click();
  if (!(await page.locator('.workflow-options').evaluate(el => el.open))) await page.locator('.workflow-options > summary').click();
  await page.getByRole('button', { name: 'Planifier', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Modèles IA : aucun');
  await expect(page.getByRole('dialog')).toContainText('Connecteur telegram non connecté');
  await page.getByLabel(/J’active cette révision/).check();
  await page.getByRole('button', { name: 'Activer la planification' }).click();
  await expect(page.getByRole('heading', { name: 'Planifications' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Modèles', exact: true }).click();
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
  await page.getByRole('button', { name: 'Actualiser les outils' }).click();
  await page.getByText('Agent et modèle pour cette étape', { exact: true }).click();
  await page.getByLabel('Agent dédié (facultatif)').selectOption('generalist');
  await page.getByLabel('Capacités de plugins (facultatives)').selectOption({ label: 'Nouveau plugin · read' });
  await page.getByLabel('Modèle IA', { exact: true }).fill('explicit-test-model');
  await page.getByRole('button', { name: 'Appliquer au bloc' }).click();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.getByRole('button', { name: 'Exécuter…' }).click();
  await expect(page.getByRole('dialog')).toContainText('transport d’outils non qualifié');
  await page.getByText('Exécution automatique sans conversation',{exact:true}).evaluate(el => { el.parentElement.open = true; });
  await expect(page.getByRole('button', { name: 'Lancer l’exécution réelle' })).toBeDisabled();
});

test('real isolated command produces evidence, then waits for human receipt', async () => {
  await page.getByRole('button', { name: 'Modèles', exact: true }).click();
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Commande locale avec validation', exact: true }) });
  await card.getByRole('button', { name: 'Utiliser', exact: true }).click();
  await page.getByRole('button', { name: 'Créer et ouvrir le workflow' }).click();
  await page.getByRole('button', { name: 'Exécuter…' }).click();
  await page.getByText('Exécution automatique sans conversation',{exact:true}).evaluate(el => { el.parentElement.open = true; });
  await page.getByRole('button', { name: 'Lancer l’exécution réelle' }).click();
  await expect(page.locator('.node[data-id="check"]')).toHaveAttribute('data-status', 'returned');
  await page.locator('.node[data-id="check"]').click();
  await expect(page.locator('#inspector')).toContainText('Python opérationnel');
  await expect(page.locator('.node[data-id="decision"]')).toHaveAttribute('data-status', 'pending');
  await receive('check', true);
  await expect(page.locator('.node[data-id="decision"]')).toHaveAttribute('data-status', 'waiting');
});

test('global workflow runs independently of Git projects and draws right-angle links', async () => {
  await page.getByRole('button', { name: 'Workflows globaux', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workflows globaux', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Choisir un modèle' }).click();
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Nouveau message → notification', exact: true }) });
  await card.getByRole('button', { name: 'Utiliser', exact: true }).click();
  await page.getByRole('button', { name: 'Créer et ouvrir le workflow' }).click();
  await expect(page.locator('.breadcrumb')).toContainText('Workflows globaux');
  const paths = await page.locator('svg path.edge').evaluateAll(elements => elements.map(e => e.getAttribute('d')));
  expect(paths.length).toBeGreaterThan(0);
  for (const d of paths) { expect(d).toContain('H'); expect(d).toContain('V'); expect(d).not.toMatch(/[CQ]/); }
  await simulate();
  await expect(page.locator('.node[data-id="mail"]')).toHaveAttribute('data-status', 'accepted');
  await page.screenshot({ path: path.join(test.info().outputDir, 'studio-global-orthogonal.png'), fullPage: true });
  await page.getByRole('button', { name: 'Projets', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Workflows globaux', exact: true }).click();
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
  await page.locator('.sidebar-tools > summary').click();
  await page.getByRole('button', { name: 'Mises à jour', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Version installée');
  await expect(page.getByRole('dialog')).toContainText('hors mode de test');
  await expect(page.getByRole('button', { name: 'Télécharger le paquet Ubuntu' })).toHaveCount(0);
});

test('repeated example clicks never create duplicate demo projects', async () => {
  await page.getByRole('button', { name: 'Essayer un exemple' }).evaluate(button => { button.click(); button.click(); });
  await expect(page.getByRole('heading', { name: "De la demande au résultat" })).toBeVisible();
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
  await page.getByRole('button', { name: 'Workflows globaux', exact: true }).click();
  await page.getByRole('button', { name: 'Connexions', exact: true }).click();
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Adaptateur de test', exact: true }) });
  await card.getByRole('button', { name: 'Vérifier l’adaptateur…' }).click();
  await expect(page.getByRole('dialog')).toContainText(script);
  await page.getByRole('button', { name: 'Exécuter le contrôle' }).click();
  await expect(card).toContainText('Utilisable');
  await page.getByRole('button', { name: 'Workflows globaux', exact: true }).click();
  await page.getByRole('button', { name: 'Ouvrir le workflow' }).click();
  await page.getByRole('button', { name: 'Exécuter…' }).click();
  await expect(page.getByRole('dialog')).toContainText('Validation automatique');
  await page.getByText('Exécution automatique sans conversation',{exact:true}).evaluate(el => { el.parentElement.open = true; });
  await page.getByRole('button', { name: 'Lancer l’exécution réelle' }).click();
  await expect(page.locator('#run-banner')).toContainText('Terminée');
  await expect(page.locator('.node[data-id="read"]')).toHaveAttribute('data-status', 'accepted');
  await expect(page.getByRole('button', { name: 'Valider le résultat' })).toHaveCount(0);
  await page.screenshot({ path: path.join(test.info().outputDir, 'automatic-adapter.png'), fullPage: true });
});

test('large workflow remains editable in canvas and keyboard list', async () => {
  const graph = { schema: 1, id: 'large', title: 'Mille étapes', nodes: Array.from({ length: 1000 }, (_, i) => ({ id: `n${i}`, title: `Étape ${i}`, kind: 'join', position: { x: (i % 20) * 300, y: Math.floor(i / 20) * 170 } })), edges: Array.from({ length: 999 }, (_, i) => ({ id: `e${i}`, from: `n${i}`, to: `n${i + 1}` })) };
  await page.evaluate(graph => window.studio.request({ action: 'workflow.save', project: 'workspace', graph }), graph);
  await page.getByRole('button', { name: 'Workflows globaux', exact: true }).click();
  const start = Date.now();
  await page.getByRole('button', { name: 'Ouvrir le workflow' }).click();
  await expect(page.locator('.node')).toHaveCount(1000);
  expect(Date.now() - start).toBeLessThan(10000);
  await page.getByRole('button', { name: 'Changer la vue graphe ou liste' }).click();
  await expect(page.getByRole('cell', { name: 'Étape 999', exact: true })).toBeAttached();
});

test('application navigation separates overview, workflow use and editor with compact responsive spacing', async () => {
  const sidebar = page.getByRole('complementary', { name: 'Tricorder', exact: true });
  await expect(sidebar.locator('.brand-name')).toHaveText('Tricorder');
  await expect(sidebar).not.toContainText('Éditeur de workflows');
  await expect(sidebar.getByRole('button', { name: 'Tableau de bord' })).toHaveAttribute('aria-current', 'page');
  await example(); await simulate();
  await page.getByRole('button', { name: 'Tableau de bord', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  await expect(page.locator('.overview-stats')).toContainText('Exécutions en cours');
  await page.screenshot({ path: path.join(test.info().outputDir, 'navigation-overview.png'), fullPage: true });
  for (const width of [1280, 1024, 800]) {
    await page.setViewportSize({ width, height: 800 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    const metrics = await sidebar.locator('.side-nav .side-item').evaluateAll(elements => elements.map(e => ({ height: e.getBoundingClientRect().height, width: e.getBoundingClientRect().width })));
    expect(metrics.every(r => r.height >= 36 && r.height <= 44)).toBe(true);
    if (!(await page.locator('.sidebar-tools').evaluate(el => el.open))) await page.locator('.sidebar-tools > summary').click();
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
  await page.locator('.project-card').filter({hasText:/Projet candidat/}).click();
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
  await page.getByRole('button', { name: 'Workflows globaux', exact: true }).click();
  const operation = { action: 'update-page', target: 'synthetic-space/page', candidate: 'candidate-hash', body: 'Exact content to review', base_version: 7 };
  const graph = { schema: 1, id: 'exact-review', title: 'Exact review', nodes: [{ id: 'approve', kind: 'decision', title: 'Review publication', operation }], edges: [] };
  await page.evaluate(graph => window.studio.request({ action: 'workflow.save', project: 'workspace', graph }), graph);
  await page.getByRole('button', { name: 'Workflows globaux', exact: true }).click();
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
  await page.getByRole('button', { name: 'Modèles', exact: true }).click();
  await page.locator('article').filter({ has: page.getByRole('heading', { name: 'Évolution logicielle', exact: true }) }).getByRole('button', { name: 'Utiliser', exact: true }).click();
  await page.getByRole('button', { name: 'Créer et ouvrir le workflow' }).click();
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
  await page.getByRole('button', { name: 'Workflows globaux', exact: true }).click();
  await page.getByRole('button', { name: 'Exécuter…', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('IA pour les étapes de travail');
  await expect(page.getByRole('dialog').getByLabel('Fournisseur IA', { exact: true })).toHaveValue('claude');
  await page.getByText('Exécution automatique sans conversation',{exact:true}).evaluate(el => { el.parentElement.open = true; });
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
  await page.locator('.project-card').filter({hasText:/Support synthétique/}).click();
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
  await page.locator('.project-card').filter({hasText:/Support synthétique/}).click();
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
  await page.locator('.project-card').filter({hasText:/Atelier Odoo/}).click();
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

test('design review: library and management views use the workspace, with readable actions in both themes', async () => {
  test.setTimeout(120000);
  const AxeBuilder = require('@axe-core/playwright').default;
  for (const theme of ['light', 'dark']) {
    await page.locator(`[data-theme-choice="${theme}"]`).click();
    for (const width of [1440, 1024, 800]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [route, heading] of [['library', 'Modèles de workflows'], ['projects', 'Vos projets'], ['global', 'Workflows globaux'], ['connections', 'Connexions'], ['schedules', 'Planifications']]) {
        await page.locator(`[data-workflow-route="${route}"]`).click();
        await expect(page.getByRole('heading', { name: heading, exact: true, level: route === 'projects' ? 2 : 1 })).toBeVisible();
        await expect(page.locator('#terminal-workspace')).toBeHidden();
        const bounds = await page.locator('#workflow-panel').boundingBox();
        const sidebar = await page.locator('.sidebar').boundingBox();
        expect(bounds.width).toBeGreaterThan(width - sidebar.width - 3);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const overflow = await page.locator('.page-heading button').evaluateAll(buttons => buttons.filter(b => b.scrollWidth > b.clientWidth + 2 || b.getBoundingClientRect().right > innerWidth).map(b => b.textContent));
        expect(overflow).toEqual([]);
        if (width === 1440) {
          await page.screenshot({path:test.info().outputPath(`${route}-${theme}.png`)});
          const scan = await new AxeBuilder({page}).setLegacyMode(true).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
          expect(scan.violations.map(v => ({id:v.id, nodes:v.nodes.map(n => n.target)}))).toEqual([]);
        }
      }
    }
  }
  await page.locator('[data-workflow-route="library"]').click();
  await page.getByLabel('Rechercher un modèle').fill('zzzz aucun résultat');
  await expect(page.locator('.template-card:visible')).toHaveCount(0);
  await expect(page.locator('#template-empty')).toBeVisible();
  await page.getByLabel('Rechercher un modèle').fill('COMMANDE LOCALE');
  await expect(page.locator('.template-card:visible')).toHaveCount(1);
  await expect(page.locator('#template-empty')).toBeHidden();
  await page.getByLabel('Rechercher un modèle').clear();
  await page.screenshot({path:test.info().outputPath('library-dark-800.png')});
});

test('terminal visibility preserves a live session while browsing and editing', async () => {
  await example();
  await page.getByRole('button', {name:'Ouvrir le terminal du workflow',exact:true}).click();
  await expect(page.locator('#terminal-workspace')).toBeVisible();
  const before = await page.evaluate(() => window.tricorder.terminals.list());
  expect(before.length).toBe(1);
  await page.locator('[data-workflow-route="library"]').click();
  await expect(page.locator('#terminal-workspace')).toBeHidden();
  await page.locator('[data-action="terminal-toggle"]').click();
  await expect(page.locator('#terminal-workspace')).toBeVisible();
  await expect(page.locator('.xterm-screen')).toBeVisible();
  const after = await page.evaluate(() => window.tricorder.terminals.list());
  expect(after[0].id).toBe(before[0].id); expect(after[0].pid).toBe(before[0].pid);
  expect(after[0].alive).toBe(true);
  for (const width of [1024, 800]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const term = await page.locator('#terminal-workspace').boundingBox();
    const graph = await page.locator('#workflow-panel').boundingBox();
    if (width === 800) expect(graph.y).toBeGreaterThanOrEqual(term.y + term.height - 1);
    else expect(graph.x).toBeGreaterThanOrEqual(term.x + term.width - 1);
    if (!(await page.locator('.sidebar-tools').evaluate(el => el.open))) await page.locator('.sidebar-tools > summary').click();
    await page.locator('[data-action="workflow-updates"]').click();
    const dialog = await page.getByRole('dialog').boundingBox();
    expect(dialog.width).toBeGreaterThan(500);
    await page.getByRole('button', {name:'Fermer la fenêtre',exact:true}).click();
  }
  await page.locator('[data-action="terminal-toggle"]').click();
  expect(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows().length)).toBe(1);
});

test('bootstrap failure is distinct from an empty catalog and Actualiser recovers', async () => {
  await app.evaluate(({ipcMain}) => {
    // Fault injection is confined to this synthetic Electron instance.
    const channel = [...ipcMain._invokeHandlers.keys()].find(key => key.endsWith('bootstrap') && !key.startsWith('studio:'));
    global.bootstrapChannel = channel;
    global.originalBootstrap = ipcMain._invokeHandlers.get(channel);
    ipcMain.removeHandler(channel); ipcMain.handle(channel, () => {throw new Error('Catalogue synthétique indisponible');});
  });
  await page.reload();
  await expect(page.locator('#catalog-warning')).toContainText('Catalogue synthétique indisponible');
  await expect(page.locator('#project-list')).not.toContainText('Aucun projet trouvé');
  await app.evaluate(({ipcMain}) => {ipcMain.removeHandler(global.bootstrapChannel);ipcMain.handle(global.bootstrapChannel,global.originalBootstrap);});
  await page.locator('[data-action="refresh"]').click();
  await expect(page.locator('#catalog-warning')).toBeHidden();
  await expect(page.locator('#sync-status')).toContainText('À jour');
});


test('optional workflow setup failure keeps native projects and can be retried', async () => {
  await expect(page.locator('#catalog-warning')).toBeVisible();
  await expect(page.locator('#project-list')).toContainText('sample-project');
  await expect(page.locator('#sync-status')).toHaveText('Workflows à vérifier');
  fs.writeFileSync(path.join(directory, 'invalid-pack/tricorder-pack.json'), JSON.stringify({schema:1,engine_schema:1,id:'fixture',version:'1',profiles:[]}));
  await page.locator('[data-action="refresh"]').click();
  await expect(page.locator('#catalog-warning')).toBeHidden();
  await expect(page.locator('#project-list')).toContainText('sample-project');
  await page.locator('[data-workflow-route="projects"]').click();
  await expect(page.locator('.project-card')).toContainText('sample-project');
});

test('work journey: name a meeting, select its repository, launch initial intention once and preserve the terminal', async () => {
  const bin = path.join(directory, 'bin'); fs.mkdirSync(bin, {recursive:true});
  const fake = `#!/usr/bin/python3
import json,re,shlex,subprocess,sys
prompt=sys.argv[-1]
command=shlex.split(re.search(r'^Pont : (.*)$',prompt,re.M).group(1))
state=json.loads(subprocess.run(command+['status'],capture_output=True,text=True).stdout)['result']
print('INITIAL-TASKS:'+str(len(state['items'])),flush=True)
for item in state['items']:print('INTENTION:'+item['request'],flush=True)
for line in sys.stdin:
 if line.strip()=='exit':break
 print('DIALOGUE:'+line.strip(),flush=True)
`;
  for (const provider of ['codex','claude']) fs.writeFileSync(path.join(bin,provider),fake,{mode:0o755});
  const project = await page.evaluate(() => window.studio.request({action:'project.create',title:'Équipe documentation'}));
  await page.getByRole('button',{name:'Projets',exact:true}).click();
  await page.locator('.project-card').filter({hasText:/Équipe documentation/}).click();
  await page.getByRole('button',{name:'+ Créer un workflow',exact:true}).click();
  await page.getByLabel('Modèle de workflow',{exact:true}).selectOption('meeting-conversation');
  await page.getByLabel('Nom du workflow').fill('Décisions du comité produit');
  await page.getByLabel('Demande initiale').fill('Préparer les décisions et actions du comité de vendredi.');
  await expect(page.getByLabel('Enregistrer dans')).toHaveValue(project.id);
  await page.screenshot({path:test.info().outputPath('new-meeting.png')});
  await page.getByRole('button',{name:'Créer et ouvrir le workflow'}).click();
  await expect(page.getByRole('heading',{name:'Décisions du comité produit',exact:true})).toBeVisible();
  const files = fs.readdirSync(path.join(project.path,'.tricorder/workflows'));
  expect(files).toHaveLength(1);
  expect(JSON.parse(fs.readFileSync(path.join(project.path,'.tricorder/workflows',files[0]))).title).toBe('Décisions du comité produit');
  await page.getByLabel('Fournisseur IA',{exact:true}).selectOption('claude');
  await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
  await expect(page.getByLabel('Quelle demande souhaitez-vous traiter ?')).toHaveValue('Préparer les décisions et actions du comité de vendredi.');
  await page.getByRole('button',{name:'Lancer dans le terminal'}).click();
  await expect(page.locator('.xterm-screen:visible')).toContainText('INITIAL-TASKS:1');
  await expect(page.locator('#conversation-tray')).toContainText('Préparer les décisions');
  await expect(page.locator('.node[data-id=review]')).toHaveAttribute('data-status','ready');
  const before = await page.evaluate(() => window.tricorder.terminals.list());
  await page.getByRole('button',{name:'Modèles',exact:true}).click();
  await expect(page.locator('.xterm-screen:visible')).toContainText('INTENTION:Préparer');
  const after = await page.evaluate(() => window.tricorder.terminals.list());
  expect(after[0].pid).toBe(before[0].pid); expect(app.context().pages()).toHaveLength(1);
  await page.evaluate(id => window.tricorder.terminals.write({session:id,data:'exit\nexit\n'}),before[0].id);
});

test('repository journey: resume a cloned workflow, simulate a question and export a generic work dossier', async () => {
  const project = await page.evaluate(() => window.studio.request({action:'project.create',title:'Atelier sans pack métier'}));
  const folder = path.join(project.path,'.tricorder/workflows'); fs.mkdirSync(folder);
  const definition = {schema:1,id:'meeting-import',revision:7,title:'Relire les minutes',nodes:[{id:'question',kind:'question',title:'Préciser les participants',question:'Qui doit relire les minutes ?',outputs:{answer:'string'}}],edges:[]};
  const file = path.join(folder,'meeting-import.json'); fs.writeFileSync(file,JSON.stringify(definition));
  const before = fs.readFileSync(file,'utf8');
  await page.getByRole('button',{name:'Projets',exact:true}).click();
  await page.locator('.project-card').filter({hasText:/Atelier sans pack métier/}).click();
  await page.getByRole('button',{name:'Examiner les workflows du dépôt'}).click();
  await page.getByRole('button',{name:'Importer ce workflow'}).click();
  await expect(page.locator('.workflow-heading')).toContainText('Révision 7');
  expect(fs.readFileSync(file,'utf8')).toBe(before);
  await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
  await page.getByLabel('Quelle demande souhaitez-vous traiter ?').fill('Vérifier les décisions du comité.');
  await page.getByRole('button',{name:'Simuler le parcours'}).click();
  await page.locator('.node[data-id=question]').click();
  await expect(page.locator('#inspector')).toContainText('Qui doit relire');
  await page.getByRole('tab',{name:'Rapport',exact:true}).click();
  await expect(page.locator('#document-view')).toContainText('Vérifier les décisions du comité.');
  await page.getByRole('button',{name:'Exporter le rapport dans le projet'}).click();
  await page.getByLabel('Nom du dossier').fill('comite-produit');
  await page.getByRole('button',{name:'Exporter le rapport',exact:true}).click();
  await expect.poll(() => fs.existsSync(path.join(project.path,'work/comite-produit/README.md'))).toBe(true);
  expect(fs.existsSync(path.join(project.path,'release'))).toBe(false);
  await page.screenshot({path:test.info().outputPath('generic-work-bilan.png')});
});

test('question journey: configure a verified tool, authorize notifications and follow delivery without answering the question', async () => {
  const project = await page.evaluate(() => window.studio.request({action:'project.create',title:'Questions et outils · démonstration'}));
  const script = path.join(directory,'notify.py');
  fs.writeFileSync(script, `import json,sys
from pathlib import Path
p=json.load(sys.stdin)
if p['action']=='describe':
 print(json.dumps({'protocol':'tricorder.tool/1','connected':True,'identity':'synthetic-team','operations':{'notify':'notify'}}))
else:
 with (Path(__file__).parent/'notifications.txt').open('a') as f:f.write(json.dumps(p['arguments'])+'\\n')
 print(json.dumps({'ok':True,'identity':'synthetic-team','outputs':{},'receipt':{'id':'local-proof-1'}}))
`);
  fs.writeFileSync(path.join(project.path,'.tricorder/plugins.json'),JSON.stringify({schema:1,plugins:[{id:'local-notifications',title:'Notifications de test',provider:'local',operations:['notify'],transport:{argv:['/usr/bin/python3',script],timeout:5}}]}));
  await page.getByRole('button',{name:'Projets',exact:true}).click();
  await page.locator('.project-card').filter({hasText:/Questions et outils/}).click();
  await page.getByRole('button',{name:'Connexions',exact:true}).click();
  await page.getByRole('button',{name:'Vérifier l’adaptateur…'}).click();
  await page.getByRole('button',{name:'Exécuter le contrôle'}).click();
  await expect(page.locator('.card').filter({has:page.getByRole('heading',{name:'Notifications de test'})})).toContainText('Utilisable');
  await page.evaluate(id => window.studio.request({action:'workflow.save',project:id,graph:{schema:1,id:'questions',title:'Préparation du compte rendu',nodes:[{id:'clarify',kind:'question',title:'Identifier le relecteur',question:'Qui doit relire le compte rendu ?',outputs:{answer:'string'}}],edges:[]}}),project.id);
  await page.getByRole('button',{name:'Projets',exact:true}).click();
  await page.locator('.project-card').filter({hasText:/Questions et outils/}).click();
  await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();
  await page.getByRole('button',{name:'Paramètres du workflow',exact:true}).click();
  await page.getByLabel('Me prévenir avec').selectOption({label:'Notifications de test · notify'});
  await page.getByLabel('Canal ou destinataire exact').fill('canal-synthetique');
  await page.getByRole('button',{name:'Appliquer',exact:true}).click();
  await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('canal-synthetique');
  await page.getByLabel(/J’autorise ces notifications/).check();
  await page.getByText('Exécution automatique sans conversation',{exact:true}).evaluate(el => { el.parentElement.open = true; });
  await page.getByRole('button',{name:'Lancer l’exécution réelle'}).click();
  await page.locator('.node[data-id=clarify]').click();
  await expect(page.locator('#inspector')).toContainText('Qui doit relire');
  await expect.poll(() => fs.existsSync(path.join(directory,'notifications.txt'))).toBe(true);
  await page.getByRole('button',{name:'Suivre la notification'}).click();
  await expect(page.locator('#run-banner')).toContainText('Terminée');
  await page.getByRole('button',{name:'Revenir à l’exécution'}).click();
  await expect(page.locator('.node[data-id=clarify]')).toHaveAttribute('data-status','waiting_input');
  await page.locator('.node[data-id=clarify]').click();
  await page.screenshot({path:test.info().outputPath('question-notification.png')});
  await page.getByLabel('Votre réponse',{exact:true}).fill('La responsable produit');
  await page.getByRole('button',{name:'Répondre',exact:true}).click();
  await expect(page.locator('.node[data-id=clarify]')).toHaveAttribute('data-status','accepted');
  expect(fs.readFileSync(path.join(directory,'notifications.txt'),'utf8').trim().split('\n')).toHaveLength(1);
});

test('workspace layout: focused navigation, adjustable split and editor preserve the same terminal', async () => {
  await expect(page.locator('.side-nav button')).toHaveText(['Tableau de bord','Modèles','Workflows globaux','Projets']);
  await expect(page.locator('.sidebar-tools')).not.toHaveAttribute('open','');
  await expect(page.locator('[data-cockpit="preferences"]')).toHaveText('Paramètres');
  await example();
  await page.getByRole('button',{name:'Ouvrir le terminal du workflow',exact:true}).click();
  await expect(page.locator('.xterm-screen')).toBeVisible();
  const before = await page.evaluate(() => window.tricorder.terminals.list());
  expect(before).toHaveLength(1);
  await page.evaluate(id => window.tricorder.terminals.write({session:id,data:"printf 'WORKSPACE-CONTINUITY\\n'\n"}),before[0].id);
  await expect(page.locator('.xterm-screen')).toContainText('WORKSPACE-CONTINUITY');
  const separator = page.getByRole('separator',{name:'Taille du terminal'});
  await expect(separator).toBeVisible();
  await separator.focus(); await page.keyboard.press('Home');
  await expect(separator).toHaveAttribute('aria-valuenow','30');
  await page.keyboard.press('ArrowRight');
  await expect(separator).toHaveAttribute('aria-valuenow','35');
  await page.locator('[data-action="terminal-layout"]').click();
  await expect(separator).toHaveAttribute('aria-orientation','horizontal');
  const term = await page.locator('#terminal-workspace').boundingBox();
  const graph = await page.locator('#workflow-panel').boundingBox();
  expect(graph.y).toBeGreaterThanOrEqual(term.y + term.height);
  await page.screenshot({path:test.info().outputPath('terminal-stacked.png')});
  await page.locator('[data-action="terminal-layout"]').click();
  await expect(separator).toHaveAttribute('aria-orientation','vertical');
  await page.locator('[data-action="terminal-maximize"]').click();
  await expect(page.locator('#workflow-panel')).toBeHidden();
  await page.locator('[data-action="terminal-maximize"]').click();
  await expect(page.locator('#workflow-panel')).toBeVisible();
  await simulate();
  await page.getByRole('button',{name:'Revenir à l’éditeur',exact:true}).click();
  await expect(page.locator('#terminal-workspace')).toBeHidden();
  await page.locator('[data-action="terminal-toggle"]').click();
  await expect(page.locator('.xterm-screen')).toBeVisible();
  await expect(page.locator('.xterm-screen')).toContainText('WORKSPACE-CONTINUITY');
  await expect(page.locator('.terminal-heading strong')).toBeInViewport();
  await expect(page.locator('#terminal-tabs')).toBeInViewport();
  const after = await page.evaluate(() => window.tricorder.terminals.list());
  expect(after.map(s=>[s.id,s.pid,s.alive])).toEqual(before.map(s=>[s.id,s.pid,s.alive]));
  expect(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows().length)).toBe(1);
  await page.screenshot({path:test.info().outputPath('terminal-side.png')});
});

test('configuration: pending fields survive I/O editing, block selection and keyboard save', async () => {
  await example();
  await page.locator('.node[data-id=analyse]').click();
  await page.getByLabel('Nom du bloc',{exact:true}).fill('Analyse à conserver');
  await page.getByRole('button',{name:'Ajouter une sortie',exact:true}).click();
  await page.getByLabel('Nom (sans espaces)').fill('synthese');
  await page.getByRole('button',{name:'Ajouter la donnée'}).click();
  await expect(page.getByLabel('Nom du bloc',{exact:true})).toHaveValue('Analyse à conserver');
  await page.getByLabel('Critères d’acceptation (un par ligne)').fill('Les conclusions sont sourcées.');
  await page.locator('.node[data-id=build]').click();
  await page.locator('.node[data-id=analyse]').click();
  await expect(page.getByLabel('Critères d’acceptation (un par ligne)')).toHaveValue('Les conclusions sont sourcées.');
  await page.getByLabel('Nom du bloc',{exact:true}).fill('Analyse finale');
  await page.keyboard.press('Control+s');
  await expect(page.locator('.workflow-heading p')).toContainText('Enregistré');
  await page.getByLabel('Nom du bloc',{exact:true}).fill('Analyse après navigation');
  await page.locator('[data-workflow-route=projects]').click();
  await page.locator('.project-card').filter({hasText:'Mon premier projet'}).click();
  await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();
  await page.locator('.node[data-id=analyse]').click();
  await expect(page.getByLabel('Nom du bloc',{exact:true})).toHaveValue('Analyse après navigation');
  await expect(page.locator('.ports')).toContainText('synthese');
  const snapshot=await page.evaluate(async()=>{const p=(await window.studio.request({action:'bootstrap'})).projects[0];return window.studio.request({action:'project.get',project:p.id});});
  const node=snapshot.workflows[0].nodes.find(n=>n.id==='analyse');
  expect(node.title).toBe('Analyse après navigation'); expect(node.outputs.synthese).toBe('string');
  expect(node.criteria).toEqual(['Les conclusions sont sourcées.']);
});

test('embedded theme: workflow controls use the shared surface colors', async () => {
  await example();
  for(const theme of ['dark','light']) {
    await page.locator(`[data-theme-choice="${theme}"]`).click();
    const colors=await page.locator('.node').first().evaluate(el=>({surface:getComputedStyle(el).getPropertyValue('--surface-1').trim(),alias:getComputedStyle(el).getPropertyValue('--surface').trim(),background:getComputedStyle(el).backgroundColor}));
    expect(colors.alias).toBe(colors.surface);
    expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
    await page.screenshot({path:test.info().outputPath(`editor-${theme}.png`)});
  }
});

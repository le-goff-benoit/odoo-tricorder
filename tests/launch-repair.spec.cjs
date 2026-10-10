// Launch repairs must preserve the user's request and selected projects.
// Only inert provider executables and a synthetic local adapter are used.
const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanupBroker } = require('./terminal-fixture.cjs');
const root = path.resolve(__dirname, '..');
let directory, app, page;

const call = (action, data = {}) => page.evaluate(payload => window.studio.request(payload), { action, ...data });
const requestField = () => page.getByLabel('Quelle demande souhaitez-vous traiter ?');
const launchButton = () => page.getByRole('button', { name: 'Lancer dans le terminal', exact: true });
const remedy = action => page.locator(`[data-action="repair-launch"][data-remedy="${action}"]`);

test.beforeEach(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-launch-repair-'));
  const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  const inert = '#!/usr/bin/python3\nimport sys\nprint("LAUNCH_REPAIR_INERT_AGENT",flush=True)\nfor line in sys.stdin:\n if line.strip()=="exit": break\n';
  for (const provider of ['codex', 'claude']) fs.writeFileSync(path.join(bin, provider), inert, { mode: 0o755 });
  app = await electron.launch({
    executablePath: process.env.TRICORDER_EXECUTABLE,
    args: process.env.TRICORDER_EXECUTABLE ? ['--workflow-studio'] : [root, '--workflow-studio'],
    env: { ...process.env, HOME: directory, PATH: bin + ':/usr/bin:/bin',
      XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_CACHE_HOME: path.join(directory, 'cache'), XDG_DATA_HOME: path.join(directory, 'data'),
      TRICORDER_AGENTS_DIR: path.join(directory, 'no-installed-pack'), TRICORDER_HOME: directory,
      TRICORDER_STATE_DIR: directory, TRICORDER_TEST_MODE: '1' }, timeout: 20000,
  });
  page = await app.firstWindow();
  await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
});

test.afterEach(async () => {
  try {
    if (app) {
      if (page && !page.isClosed()) await page.evaluate(() => window.tricorder.terminals.list());
      await app.close();
    }
  } finally {
    if (directory) {
      await cleanupBroker(path.join(directory, 'cockpit/odoo-tricorder/pty.sock'));
      await cleanupBroker(path.join(directory, 'studio-pty.sock'));
      fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
    app = page = directory = undefined;
  }
});

async function openWorkflow(project, graph) {
  await page.getByRole('button', { name: 'Projets', exact: true }).click();
  await page.locator('.project-card').filter({ hasText: project.title }).click();
  await page.locator('article').filter({ has: page.getByRole('heading', { name: graph.title, exact: true }) })
    .getByRole('button', { name: 'Ouvrir le workflow', exact: true }).click();
}

async function launchDialog(text) {
  await page.getByRole('button', { name: 'Exécuter…', exact: true }).click();
  await requestField().fill(text);
}

async function selectAdditional(project) {
  const details = page.locator('.launch-projects');
  if (!await details.evaluate(el => el.open)) await details.locator('summary').click();
  await page.locator(`[name="conversation-project"][value="${project.id}"]`).check();
}

async function returnToLaunch(text, additional) {
  await page.getByRole('button', { name: 'Revenir au lancement', exact: true }).click();
  await expect(requestField()).toHaveValue(text);
  if (additional) await expect(page.locator(`[name="conversation-project"][value="${additional.id}"]`)).toBeChecked();
}

async function launchInert(project, graph, text) {
  await expect(launchButton()).toBeEnabled();
  await launchButton().click();
  await expect(page.locator('.xterm-screen:visible')).toContainText('LAUNCH_REPAIR_INERT_AGENT');
  const conversations = await call('conversation.list', { project: project.id });
  expect(conversations).toHaveLength(1);
  const conversation = await call('conversation.get', { conversation: conversations[0].id });
  expect(conversation.definition.title).toBe(graph.title);
  expect(conversation.items).toHaveLength(1);
  expect(conversation.items[0].request).toBe(text);
  const { run } = await call('run.get', { run: conversation.items[0].run });
  expect(run.nodes[graph.nodes[0].id].status).toBe('ready'); // Inert means no claimed/model work.
  expect(app.context().pages()).toHaveLength(1);
  return conversation;
}

async function qualifyLocalAdapter() {
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Lecture locale synthétique', exact: true }) });
  await card.getByRole('button', { name: 'Vérifier l’adaptateur…' }).click();
  await page.getByRole('button', { name: 'Exécuter le contrôle', exact: true }).click();
  await expect(card).toContainText('Utilisable');
}

test('repair missing model preserves request and additional project through native launch', async () => {
  const alpha = await call('project.create', { title: 'Projet Alpha synthétique' });
  const beta = await call('project.create', { title: 'Projet Bêta synthétique' });
  const graph = { schema: 1, id: 'analyse', title: 'Analyser les observations', nodes: [
    { id: 'analyse', kind: 'agent', title: 'Comprendre la demande' }], edges: [] };
  await call('workflow.save', { project: alpha.id, graph });
  await openWorkflow(alpha, graph);
  const text = 'Comparer les observations du client sur Alpha et Bêta.';
  await launchDialog(text);
  await app.evaluate(({ ipcMain }) => {
    const handler = ipcMain._invokeHandlers.get('studio:request');
    globalThis.__modelRepairDelay = { replies: 0, pending: false, completed: false };
    ipcMain.removeHandler('studio:request');
    ipcMain.handle('studio:request', async (event, payload) => {
      const value = await handler(event, payload); // Delay the real response, not its data.
      if (payload.action === 'workflow.validate' && payload.mode === 'native'
          && payload.projects?.some(id => id !== payload.project) && !globalThis.__modelRepairDelay.replies) {
        globalThis.__modelRepairDelay.replies++;
        globalThis.__modelRepairDelay.pending = true;
        await new Promise(resolve => setTimeout(resolve, 1500));
        globalThis.__modelRepairDelay.pending = false;
        globalThis.__modelRepairDelay.completed = true;
      }
      return value;
    });
  });
  await selectAdditional(beta);
  await expect.poll(() => app.evaluate(() => globalThis.__modelRepairDelay.pending)).toBe(true);
  await page.locator('.launch-automatic > summary').click();
  await page.locator('[data-diagnostic="provider.model-required"]').locator('[data-remedy="choose-ai"]').first().click();
  // The launch dialog also contains an AI form. The repair is queued after
  // project validation, so wait for its own dialog before interacting with it.
  const aiDialog = page.getByRole('dialog', { name: 'Choisir l’IA pour ce workflow', exact: true });
  await expect(aiDialog).toBeVisible();
  await aiDialog.getByLabel('Modèle IA', {exact:true}).selectOption('__custom__');await aiDialog.getByLabel('Identifiant technique du modèle', {exact:true}).fill('synthetic-model');
  await aiDialog.getByRole('button', { name: 'Appliquer ce choix et vérifier', exact: true }).click();
  await expect(requestField()).toHaveValue(text);
  await expect(page.locator(`[name="conversation-project"][value="${beta.id}"]`)).toBeChecked();
  const conversation = await launchInert(alpha, graph, text);
  expect(conversation.projects).toEqual([alpha.id, beta.id]);
  expect(conversation.model).toBe('synthetic-model');
  const delay = await app.evaluate(() => globalThis.__modelRepairDelay);
  expect(delay).toEqual({ replies: 1, pending: false, completed: true });
  const proof = test.info().outputPath('model-repair-proof.json');
  fs.writeFileSync(proof, JSON.stringify({ delayMs: 1500, delay, model: conversation.model,
    request: conversation.items[0].request, selectedProjects: conversation.projects,
    expectedProjects: [alpha.id, beta.id], provider: 'inert fixture; no external model call' }, null, 2));
  await test.info().attach('model-repair-proof', { path: proof, contentType: 'application/json' });
});

test('repair secondary-project connection diagnoses before launch and returns without retyping', async () => {
  const alpha = await call('project.create', { title: 'Projet Alpha synthétique' });
  const beta = await call('project.create', { title: 'Projet Bêta synthétique' });
  const adapter = path.join(directory, 'local-adapter.py');
  fs.writeFileSync(adapter, "import json,sys\np=json.load(sys.stdin)\nprint(json.dumps({'protocol':'tricorder.tool/1','identity':'synthetic-repair','connected':True,'operations':{'read':'read'}} if p['action']=='describe' else {'ok':True,'identity':'synthetic-repair','outputs':{'value':42}}))\n");
  const manifest = { schema: 1, plugins: [{ id: 'local-read', title: 'Lecture locale synthétique', provider: 'local', operations: ['read'], transport: { argv: ['/usr/bin/python3', adapter], timeout: 3 } }] };
  for (const project of [alpha, beta]) fs.writeFileSync(path.join(project.path, '.tricorder/plugins.json'), JSON.stringify(manifest));
  const graph = { schema: 1, id: 'minutes', title: 'Comparer les comptes rendus', nodes: [
    { id: 'read', title: 'Lire le compte rendu', kind: 'document', validation: 'automatic', outputs: { value: 'number' }, capabilities: [{ plugin: 'local-read', operation: 'read' }] }], edges: [] };
  await call('workflow.save', { project: alpha.id, graph });
  await openWorkflow(alpha, graph);
  await page.getByRole('button', { name: 'Connexions', exact: true }).click();
  await expect(page.getByLabel('Contexte', { exact: true })).toHaveValue(alpha.id);
  await qualifyLocalAdapter();
  await openWorkflow(alpha, graph);
  const text = 'Comparer les minutes des deux projets, garder cette demande.';
  await launchDialog(text); await expect(launchButton()).toBeEnabled();
  await selectAdditional(beta);
  const issue = page.locator('#launch-native-check [data-diagnostic="plugin.connection-required"]').filter({ hasText: beta.title });
  await expect(issue).toBeVisible();
  await expect(launchButton()).toBeDisabled();
  expect(await call('conversation.list', { project: alpha.id })).toEqual([]);
  await issue.locator('[data-remedy="connections"]').click();
  await expect(page.getByLabel('Contexte', { exact: true })).toHaveValue(beta.id);
  await qualifyLocalAdapter();
  await returnToLaunch(text, beta);
  await expect(page.locator('#launch-native-check [data-diagnostic="plugin.connection-required"]')).toHaveCount(0);
  const conversation = await launchInert(alpha, graph, text);
  expect(conversation.projects).toEqual([alpha.id, beta.id]);
});

for (const viaProfile of [false, true]) test(`repair missing Odoo version exposes its field and preserves the launch request (${viaProfile ? 'domain from pack profile' : 'explicit domain'})`, async () => {
  const project = await call('project.create', { title: 'Projet Odoo synthétique sans version' });
  const pack = path.join(directory, 'synthetic-pack'); fs.mkdirSync(pack);
  fs.writeFileSync(path.join(pack, 'role.md'), 'Synthetic role; no real Odoo work.');
  fs.writeFileSync(path.join(pack, 'tricorder-pack.json'), JSON.stringify({ schema: 1, engine_schema: 1, id: 'synthetic-odoo', version: '1', profiles: [{ id: 'specialist', source: 'role.md' }], policies: { domain: 'odoo', series_required: true } }));
  const preview = await call('pack.preview', { path: pack });
  await call('pack.install', { project: project.id, path: pack, digest: preview.sha256 });
  const graph = { schema: 1, id: 'odoo-analysis', title: 'Analyser une demande Odoo', ...(viaProfile ? {} : { domain: 'odoo' }), defaults: { provider: 'codex', model: 'synthetic-model' }, nodes: [
    { id: 'analyse', kind: 'agent', title: 'Comprendre les observations', ...(viaProfile ? { profile: 'specialist' } : {}) }], edges: [] };
  await call('workflow.save', { project: project.id, graph });
  await openWorkflow(project, graph);
  const text = 'Comprendre le besoin avant de préparer une release.';
  await launchDialog(text);
  await expect(launchButton()).toBeDisabled();
  await page.locator('#launch-native-check [data-diagnostic="odoo.series-required"]').locator('[data-remedy="workflow-settings"]').click();
  await page.getByLabel('Version d’Odoo', { exact: true }).fill('19.0');
  await page.getByRole('button', { name: 'Appliquer', exact: true }).click();
  await returnToLaunch(text);
  await expect(launchButton()).toBeEnabled();
  const saved = await call('workflow.get', { project: project.id, workflow: graph.id });
  expect(saved.parameters.series).toBe('19.0');
  expect(await call('conversation.list', { project: project.id })).toEqual([]);
});

test('repair global code workflow adapts into a project without changing its origin', async () => {
  const project = await call('project.create', { title: 'Projet Alpha synthétique' });
  await call('workspace.get');
  const graph = { schema: 1, id: 'global-code', title: 'Préparer une modification de code', defaults: { provider: 'codex', model: 'synthetic-model' }, nodes: [
    { id: 'edit', title: 'Modifier le code', kind: 'agent', execution_mode: 'edit', outputs: { candidate: 'object' } }], edges: [] };
  const original = await call('workflow.save', { project: 'workspace', graph });
  await page.getByRole('button', { name: 'Workflows', exact: true }).click();
  await page.getByText('Gestion des workflows', {exact:true}).click();await page.locator('[data-action=workflow-hub][data-tab=registered]').click();
  await page.locator('article').filter({ has: page.getByRole('heading', { name: graph.title, exact: true }) }).getByRole('button', { name: 'Ouvrir le workflow', exact: true }).click();
  const text = 'Préparer la correction dans Alpha, sans lancer le travail.';
  await launchDialog(text);
  await expect(launchButton()).toBeDisabled();
  await remedy('choose-project').first().click();
  await page.getByLabel('Projet', { exact: true }).selectOption(project.id);
  await page.getByRole('button', { name: 'Créer la copie et continuer', exact: true }).click();
  await expect(requestField()).toHaveValue(text);
  await expect(launchButton()).toBeEnabled();
  expect(await call('workflow.get', { project: 'workspace', workflow: graph.id })).toEqual(original);
  const target = await call('project.get', { project: project.id });
  const copies = target.workflows.filter(item => item.title === graph.title);
  expect(copies).toHaveLength(1);
  expect(copies[0].id).not.toBe(graph.id);
  const copy = await call('workflow.get', { project: project.id, workflow: copies[0].id });
  expect(copy.nodes).toEqual(original.nodes);
  expect(await call('conversation.list', { project: project.id })).toEqual([]);
});

test('late run response cannot navigate back after the user opens Projects', async () => {
  const project = await call('project.create', { title: 'Projet de navigation synthétique' });
  const graph = { schema: 1, id: 'navigation', title: 'Vérifier la navigation', nodes: [
    { id: 'analyse', kind: 'agent', title: 'Analyser les observations' }], edges: [] };
  await call('workflow.save', { project: project.id, graph });
  await app.evaluate(({ ipcMain }) => {
    const handler = ipcMain._invokeHandlers.get('studio:request');
    globalThis.__launchRepairPending = false;
    let delayed = false;
    ipcMain.removeHandler('studio:request');
    ipcMain.handle('studio:request', async (event, payload) => {
      const value = await handler(event, payload); // Real backend result; no workflow state mutation.
      if (payload.action === 'run.get' && !delayed) {
        delayed = true; globalThis.__launchRepairPending = true;
        await new Promise(resolve => setTimeout(resolve, 1500));
        globalThis.__launchRepairPending = false;
      }
      return value;
    });
  });
  await openWorkflow(project, graph);
  await launchDialog('Analyser sans quitter la page que je sélectionne.');
  await launchButton().click();
  await expect.poll(() => app.evaluate(() => globalThis.__launchRepairPending)).toBe(true);
  await page.getByRole('button', { name: 'Projets', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vos projets', exact: true })).toBeVisible();
  await expect.poll(() => app.evaluate(() => globalThis.__launchRepairPending)).toBe(false);
  // Let the intentionally delayed response reach the renderer and render.
  await page.waitForTimeout(350);
  await expect(page.getByRole('heading', { name: 'Vos projets', exact: true })).toBeVisible();
  expect(app.context().pages()).toHaveLength(1);
});

test('repair missing profile preserves it until the user explicitly chooses generalist', async () => {
  const project = await call('project.create', { title: 'Projet au profil absent' });
  const graph = { schema: 1, id: 'missing-profile', title: 'Analyser avec un profil importé',
    defaults: { provider: 'codex', model: 'synthetic-model' }, nodes: [
      { id: 'analyse', kind: 'agent', title: 'Comprendre les observations', profile: 'specialist-not-installed' }], edges: [] };
  await call('workflow.save', { project: project.id, graph });
  await openWorkflow(project, graph);
  const text = 'Conserver ma demande et demander un choix explicite de profil.';
  await launchDialog(text);
  const issue = () => page.locator('#launch-native-check [data-diagnostic="profile.unavailable"]');
  await expect(launchButton()).toBeDisabled();
  await issue().locator('[data-remedy="edit-node"]').click();
  await expect(page.locator('#node-profile')).toHaveValue('specialist-not-installed');
  await expect(page.locator('#node-profile option:checked')).toContainText('pack absent');
  await page.getByLabel('Nom du bloc', { exact: true }).fill('Analyser les observations renommées');
  await page.getByRole('button', { name: 'Appliquer au bloc', exact: true }).click();
  await expect(page.locator('#node-profile')).toHaveValue('specialist-not-installed');
  await returnToLaunch(text);
  await expect(issue()).toBeVisible();
  await expect(launchButton()).toBeDisabled();
  const renamed = await call('workflow.get', { project: project.id, workflow: graph.id });
  expect(renamed.nodes[0].profile).toBe('specialist-not-installed');
  expect(renamed.nodes[0].title).toBe('Analyser les observations renommées');
  expect(await call('conversation.list', { project: project.id })).toEqual([]);
  await issue().locator('[data-remedy="edit-node"]').click();
  await page.locator('#node-profile').selectOption('generalist');
  await page.getByRole('button', { name: 'Appliquer au bloc', exact: true }).click();
  await returnToLaunch(text);
  await expect(issue()).toHaveCount(0);
  const conversation = await launchInert(project, graph, text);
  expect(conversation.definition.nodes[0].profile).toBe('generalist');
  expect(conversation.definition.nodes[0].title).toBe('Analyser les observations renommées');
});

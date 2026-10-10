// Regression checks for the user panel. Only synthetic projects, schedules and
// inert provider executables are used. API calls prepare fixtures through the engine.
const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { cleanupBroker } = require('./terminal-fixture.cjs');
const root = path.resolve(__dirname, '..');
let directory, app, page;
const call = (action, data = {}) => page.evaluate(payload => window.studio.request(payload), { action, ...data });
const human = (action, data = {}) => page.evaluate(payload => window.studio.human(payload), { action, ...data });

async function openWorkflow(id) {
  await page.locator('[data-workflow-route=global]').click();await page.locator('[data-action=registered-workflows]').click();
  await page.locator(`[data-action=open-workflow][data-id="${id}"]`).click();
}
async function topOptions(action) {
  if (!(await page.locator('.design-menu').evaluate(el => el.open))) await page.locator('.design-menu > summary').click();
  await page.getByRole('button', { name: action, exact: true }).click();
}

test.beforeEach(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-panel-configuration-'));
  const bin = path.join(directory, 'stubs'); fs.mkdirSync(bin);
  for (const provider of ['codex', 'claude']) fs.writeFileSync(path.join(bin, provider), '#!/bin/sh\nprintf "PANEL_CONFIGURATION_INERT\\n"\nexit 78\n', { mode: 0o755 });
  const env = { PATH: bin + ':/usr/bin:/bin', HOME: directory, DISPLAY: process.env.DISPLAY, XAUTHORITY: process.env.XAUTHORITY, LANG: 'C.UTF-8',
    XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_CACHE_HOME: path.join(directory, 'cache'), XDG_DATA_HOME: path.join(directory, 'data'),
    XDG_STATE_HOME: path.join(directory, 'xdg-state'), XDG_RUNTIME_DIR: path.join(directory, 'xdg-runtime'),
    CODEX_HOME: path.join(directory, 'codex'), CLAUDE_CONFIG_DIR: path.join(directory, 'claude'), TRICORDER_HOME: directory,
    TRICORDER_STATE_DIR: path.join(directory, 'state'), TRICORDER_RUNTIME_DIR: path.join(directory, 'runtime'),
    TRICORDER_AGENTS_DIR: path.join(directory, 'no-pack'), TRICORDER_TEST_MODE: '1', PYTHONDONTWRITEBYTECODE: '1' };
  fs.mkdirSync(env.XDG_RUNTIME_DIR, { mode: 0o700 });
  app = await electron.launch({ args: [root], env });
  page = await app.firstWindow(); await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
  await page.locator('[data-action=terminal-toggle]').click();
  await page.getByRole('button', { name: 'Ouvrir un terminal', exact: true }).click();
  await page.locator('.xterm-helper-textarea:visible').focus();
  await page.keyboard.type('command -v codex; codex --version; command -v claude; claude --version'); await page.keyboard.press('Enter');
  await expect(page.locator('.xterm-screen:visible')).toContainText(path.join(bin, 'claude'));
  await expect(page.locator('.xterm-screen:visible')).toContainText('PANEL_CONFIGURATION_INERT');
  await page.locator('[data-action=terminal-toggle]').click();
});

test.afterEach(async () => {
  if (app) await app.close();
  if (!directory) return;
  for (const socket of ['cockpit/odoo-tricorder/pty.sock', 'studio-pty.sock', 'runtime/pty.sock']) await cleanupBroker(path.join(directory, socket));
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test('schedule recurrence remains readable and replacement retains it with fresh permissions', async () => {
  const project = await call('project.create', { title: 'Exploitation fictive' });
  const original = await call('workflow.save', { project: project.id, graph: { schema: 1, id: 'configuration-schedule', title: 'Contrôle synthétique', nodes: [
    { id: 'prepare', kind: 'command', title: 'Préparer', argv: ['/usr/bin/python3', '-c', 'print("test")'], validation: 'automatic', criteria: [] },
    { id: 'send', kind: 'communication', title: 'Informer', channel: 'email', recipient: 'destinataire-fictif', template: 'Message fictif V1', validation: 'human' },
  ], edges: [{ id: 'send-result', from: 'prepare', to: 'send', outcome: 'done' }] } });
  const schedule = await human('schedule.create', { project: project.id, graph: original, simulation: true, authorize_notifications: true,
    rule: { kind: 'interval', minutes: 60, time: '17:20', timezone: 'Pacific/Auckland', weekdays: [0, 4] } });
  await call('workflow.save', { project: project.id, graph: { ...original, description: 'Révision à remplacer' }, revision: original.revision });
  await openWorkflow(original.id);
  await expect(page.locator('.workflow-options > summary')).toHaveText('Éditeur');
  await topOptions('Planifier');
  await expect(page.locator('#schedule-form')).toBeVisible();
  await page.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).click();
  await page.getByRole('button', { name: 'Planifications', exact: true }).click();
  const card = page.locator(`[data-schedule="${schedule.id}"]`);
  await expect(card).toContainText('Toutes les 60 minutes');
  await expect(card).toContainText('Pacific/Auckland');
  await card.getByRole('button', { name: 'Configuration et réponses · révision 1', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Toutes les 60 minutes · Pacific/Auckland');
  await page.getByRole('button', { name: 'Modifier les réponses ou la version…', exact: true }).click();
  await page.getByRole('button', { name: 'Archiver et configurer la nouvelle', exact: true }).click();
  const form = page.locator('#schedule-form');
  await expect(form.locator('[name=kind]')).toHaveValue('interval');
  await expect(form.locator('[name=minutes]')).toHaveValue('60');
  await expect(form.locator('[name=time]')).toHaveValue('17:20');
  await expect(form.locator('[name=timezone]')).toHaveValue('Pacific/Auckland');
  await expect(form.locator('[name=weekdays]')).toHaveValue('[0,4]');
  await expect(form.locator('[name=simulation]')).toBeChecked();
  await expect(form.locator('[name=authorize_notifications]')).not.toBeChecked();
  await expect(form.locator('[type=checkbox][required]')).not.toBeChecked();
  expect((await call('schedule.list')).filter(item => item.enabled)).toHaveLength(0);
  await page.screenshot({ path: test.info().outputPath('replacement-retained-frequency.png') });
  await form.locator('[type=checkbox][required]').check();
  await page.getByRole('button', { name: 'Activer la planification', exact: true }).click();
  await expect(form).toHaveCount(0);
  const schedules = await call('schedule.list');
  const replacement = schedules.find(item => item.id !== schedule.id);
  expect(replacement.rule).toEqual(schedule.rule);
  expect(replacement.revision).toBe(2);
  expect(replacement.notifications_authorized).toBe(false);
  await expect(page.locator(`[data-schedule="${replacement.id}"]`)).toContainText('Toutes les 60 minutes');
  await page.screenshot({ path: test.info().outputPath('schedule-frequency-card.png') });
});

test('reuse removes old trial examples unless explicitly kept, without carrying request context', async () => {
  const project = await call('project.create', { title: 'Qualification fictive' });
  const source = await call('workflow.save', { project: project.id, graph: { schema: 1, id: 'configuration-reuse', title: 'Méthode fictive',
    parameters: { language: 'fr', request: 'Ancien atelier', source_run: 'old-run' }, nodes: [{ id: 'qualify', title: 'Qualifier la demande', kind: 'task',
      prompt: 'Lire la demande initiale.', inputs: { demande: 'string' }, outputs: { priorite: 'string' }, sample_outputs: { priorite: 'urgente' } }], edges: [] } });
  await openWorkflow(source.id);
  await page.locator('.node[data-id=qualify]').click();
  await expect(page.locator('.design-guidance')).toContainText('contexte à la consigne');
  await expect(page.locator('.design-guidance')).toContainText('ne remplit pas automatiquement les entrées nommées');
  await topOptions('Réutiliser…');
  const keep = page.getByLabel('Conserver les exemples personnalisés de simulation', { exact: true });
  await expect(keep).not.toBeChecked();
  await page.getByLabel('Nom de la copie', { exact: true }).fill('Méthode sans anciens essais');
  await page.getByLabel('Destination', { exact: true }).selectOption(project.id);
  await page.screenshot({ path: test.info().outputPath('reuse-simulation-choice.png') });
  await page.getByRole('button', { name: 'Créer la copie', exact: true }).click();
  await expect(page.locator('.workflow-heading h1')).toHaveText('Méthode sans anciens essais');
  let data = await call('project.get', { project: project.id });
  let copy = data.workflows.find(item => item.title === 'Méthode sans anciens essais');
  copy = await call('workflow.get', { project: project.id, workflow: copy.id });
  expect(copy.nodes[0].sample_outputs).toBeUndefined();
  expect(copy.parameters).toEqual({ language: 'fr' });
  expect(copy.nodes[0].inputs).toEqual({ demande: 'string' });
  await openWorkflow(source.id);
  await topOptions('Réutiliser…');
  await page.getByLabel('Nom de la copie', { exact: true }).fill('Méthode avec exemples choisis');
  await page.getByLabel('Destination', { exact: true }).selectOption(project.id);
  await keep.check();
  await page.getByRole('button', { name: 'Créer la copie', exact: true }).click();
  await expect(page.locator('.workflow-heading h1')).toHaveText('Méthode avec exemples choisis');
  data = await call('project.get', { project: project.id });
  const model = data.workflows.find(item => item.title === 'Méthode avec exemples choisis');
  const retained = await call('workflow.get', { project: project.id, workflow: model.id });
  expect(retained.nodes[0].sample_outputs).toEqual({ priorite: 'urgente' });
  expect(retained.parameters).toEqual({ language: 'fr' });
  expect(data.runs).toHaveLength(0);
  expect(await call('workflow.get', { project: project.id, workflow: source.id })).toEqual(source);
});

test('a pasted repository is validated and the new block receives keyboard focus', async () => {
  const repository = path.join(directory, 'repository'); fs.mkdirSync(repository);
  execFileSync('/usr/bin/git', ['init', '--quiet', repository], { env: { HOME: directory, PATH: '/usr/bin:/bin', GIT_CONFIG_NOSYSTEM: '1' } });
  const invalid = path.join(directory, 'not-a-repository'); fs.mkdirSync(invalid);
  await page.locator('[data-workflow-route=projects]').click();
  await page.getByRole('button', { name: '+ Nouveau projet', exact: true }).click();
  await page.getByLabel('Nom du projet', { exact: true }).fill('Dépôt fictif collé');
  await page.getByLabel('Emplacement', { exact: true }).selectOption('repository');
  const field = page.getByLabel('Racine du dépôt Git local', { exact: true });
  await expect(field).toBeEditable();
  await field.fill(invalid);
  await page.getByRole('button', { name: 'Créer le projet', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Git');
  expect((await call('bootstrap')).projects).toHaveLength(0);
  await field.fill(repository);
  await page.getByRole('button', { name: 'Créer le projet', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dépôt fictif collé', exact: true })).toBeVisible();
  const project = (await call('bootstrap')).projects.find(item => item.title === 'Dépôt fictif collé');
  expect(project.path).toBe(repository);
  const source = await call('workflow.save', { project: project.id, graph: { schema: 1, id: 'configuration-focus', title: 'Conception clavier',
    nodes: [{ id: 'draft', kind: 'task', title: 'Préparer', prompt: 'Préparer une réponse.' }], edges: [] } });
  await openWorkflow(source.id);
  await page.getByRole('button', { name: '+ Ajouter un bloc', exact: true }).click();
  await page.locator('#add-kind').selectOption('communication');
  await page.getByLabel('Nom du bloc', { exact: true }).fill('Informer le groupe fictif');
  await page.getByRole('button', { name: 'Ajouter au workflow', exact: true }).click();
  await expect(page.locator('#node-title')).toBeFocused();
  await expect(page.locator('#node-title')).toHaveValue('Informer le groupe fictif');
  await page.getByText('Outils et plugins de cette étape', { exact: true }).click();
  await expect(page.getByLabel('Capacités de plugins (requises pour l’envoi)', { exact: true })).toBeVisible();
  await expect(page.locator('#node-form')).toContainText('Un plugin de notification compatible et vérifié est nécessaire');
  await page.screenshot({ path: test.info().outputPath('new-block-focus-and-required-capability.png') });
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.locator('.workflow-options > summary').click();
  await page.getByRole('button', { name: 'Fichier JSON du workflow…', exact: true }).click();
  const filepath = path.join(repository, '.tricorder', 'workflows', source.id + '.json');
  await expect(page.getByLabel('Chemin du fichier enregistré', { exact: true })).toHaveValue(filepath);
  expect(fs.existsSync(filepath)).toBe(true);
  expect(JSON.parse(fs.readFileSync(filepath)).title).toBe('Conception clavier');
  await page.screenshot({ path: test.info().outputPath('actual-workflow-json-path.png') });
});

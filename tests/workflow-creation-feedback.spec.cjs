const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { cleanupBroker } = require('./terminal-fixture.cjs');
const root = path.resolve(__dirname, '..');
let directory, app, page, project;
const call = (action, data = {}) => page.evaluate(payload => window.studio.request(payload), { action, ...data });
const snapshot = () => call('workflow.get', { project: project.id, workflow: 'creation-review' });
async function openWorkflow() {
  await page.locator('[data-workflow-route=global]').click();
  await page.locator('[data-action=open-workflow][data-id=creation-review]').click();
}
async function seed(graph) {
  project = await call('project.create', { title: 'Atelier de conception synthétique' });
  await call('workflow.save', { project: project.id, graph: { schema: 1, id: 'creation-review', title: 'Revue de la demande', ...graph } });
  await openWorkflow();
}
test.beforeEach(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-creation-feedback-'));
  const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  for (const provider of ['codex', 'claude']) fs.writeFileSync(path.join(bin, provider), '#!/bin/sh\nprintf "CREATION_FEEDBACK_INERT\\n"\nexit 78\n', { mode: 0o755 });
  const env = { PATH: bin + ':/usr/bin:/bin', HOME: directory, DISPLAY: process.env.DISPLAY, XAUTHORITY: process.env.XAUTHORITY, LANG: 'C.UTF-8',
    XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_CACHE_HOME: path.join(directory, 'cache'), XDG_DATA_HOME: path.join(directory, 'data'),
    CODEX_HOME: path.join(directory, 'codex'), CLAUDE_CONFIG_DIR: path.join(directory, 'claude'), TRICORDER_HOME: directory,
    TRICORDER_STATE_DIR: directory, TRICORDER_RUNTIME_DIR: path.join(directory, 'runtime'), TRICORDER_AGENTS_DIR: path.join(directory, 'no-pack'), TRICORDER_TEST_MODE: '1', PYTHONDONTWRITEBYTECODE: '1' };
  app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env });
  page = await app.firstWindow(); await page.setViewportSize({ width: 1600, height: 1000 });
  await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
  await page.locator('[data-action=terminal-toggle]').click();
  await page.getByRole('button', { name: 'Ouvrir un terminal', exact: true }).click();
  await page.locator('.xterm-helper-textarea:visible').focus();
  await page.keyboard.type('command -v codex; codex --version; command -v claude; claude --version'); await page.keyboard.press('Enter');
  await expect(page.locator('.xterm-screen:visible')).toContainText(path.join(bin, 'claude'));
  await expect(page.locator('.xterm-screen:visible')).toContainText('CREATION_FEEDBACK_INERT');
  await page.locator('[data-action=terminal-toggle]').click();
});
test.afterEach(async () => {
  if (app) await app.close();
  for (const socket of ['cockpit/odoo-tricorder/pty.sock', 'studio-pty.sock', 'runtime/pty.sock']) await cleanupBroker(path.join(directory, socket));
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test('typed simulation data persists and a false boolean follows only the normal branch', async () => {
  await seed({ nodes: [
    { id: 'collect', kind: 'task', title: 'Qualifier la demande', outputs: { critical: 'boolean', amount: 'number', summary: 'string', details: 'object' }, sample_outputs: { critical: 'invalid-old-example' }, position: { x: 40, y: 40 } },
    { id: 'route', kind: 'condition', title: 'Orienter selon la criticité', inputs: { critical: 'boolean' }, parameter: 'critical', options: ['true', 'false'], position: { x: 350, y: 40 } },
    { id: 'urgent', kind: 'decision', title: 'Revue urgente', options: ['approve', 'reject'], position: { x: 650, y: 40 } },
    { id: 'normal', kind: 'decision', title: 'Revue normale', options: ['approve', 'reject'], position: { x: 650, y: 230 } },
  ], edges: [{ id: 'data', from: 'collect', to: 'route', mapping: { critical: 'critical' } }, { id: 'true', from: 'route', to: 'urgent', outcome: 'true' }, { id: 'false', from: 'route', to: 'normal', outcome: 'false' }] });
  await page.locator('.node[data-id=collect]').click();
  const qa = page.locator('#node-form details').filter({ has: page.getByText('Contrôle de code (QA)', { exact: true }) });
  await expect(qa).not.toHaveAttribute('open');
  await page.getByRole('button', { name: 'Données de simulation…', exact: true }).click();
  const dialog = page.getByRole('dialog'), critical = dialog.locator('[data-sample-port=critical]');
  await expect(critical).toContainText('L’ancienne valeur n’est pas un booléen');
  await critical.locator('select').selectOption('false');
  const amount = dialog.locator('[data-sample-port=amount]'); await amount.locator('input[type=checkbox]').check(); await amount.locator('input:not([type=checkbox])').fill('480');
  const summary = dialog.locator('[data-sample-port=summary]'); await summary.locator('input[type=checkbox]').check(); await summary.locator('textarea').fill('Achat fictif de deux écrans.');
  await page.screenshot({ path: test.info().outputPath('typed-simulation-form.png') });
  await dialog.getByRole('button', { name: 'Appliquer les données de simulation', exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await openWorkflow(); await page.locator('.node[data-id=collect]').click();
  await page.getByRole('button', { name: 'Données de simulation…', exact: true }).click();
  await expect(page.locator('[data-sample-port=critical] select')).toHaveValue('false');
  await page.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).click();
  const saved = await snapshot(); expect(saved.nodes[0].sample_outputs).toEqual({ critical: false, amount: 480, summary: 'Achat fictif de deux écrans.' });
  await page.getByRole('button', { name: 'Exécuter…', exact: true }).click(); await page.getByRole('button', { name: 'Simuler le parcours', exact: true }).click();
  await expect(page.locator('.node[data-id=collect]')).toHaveAttribute('data-status', 'returned'); await page.locator('.node[data-id=collect]').click();
  await page.getByLabel('Commentaire de validation').fill('Résultat fictif examiné uniquement pour vérifier le parcours.');
  await page.getByRole('button', { name: 'Valider le résultat', exact: true }).click();
  await page.getByRole('button', { name: 'Graphe', exact: true }).click();
  await expect(page.locator('.node[data-id=normal]')).toHaveAttribute('data-status', 'waiting');
  await expect(page.locator('.node[data-id=urgent]')).toHaveAttribute('data-status', 'skipped');
  await page.locator('.node[data-id=normal]').click(); await expect(page.locator('#inspector')).toContainText('Approuver la suite');
  await page.screenshot({ path: test.info().outputPath('simulation-normal-human-gate.png') });
});

test('removing a middle block announces detached data and launch guidance leads to a repairable link', async () => {
  await seed({ nodes: [
    { id: 'collect', kind: 'task', title: 'Collecter la demande', outputs: { dossier: 'string' }, position: { x: 40, y: 40 } },
    { id: 'work', kind: 'task', title: 'Analyser le dossier', inputs: { dossier: 'string' }, outputs: { result: 'string' }, position: { x: 350, y: 40 } },
    { id: 'approve', kind: 'decision', title: 'Valider le dossier', inputs: { result: 'string' }, options: ['approve', 'reject'], position: { x: 660, y: 40 } },
  ], edges: [{ id: 'first', from: 'collect', to: 'work', mapping: { dossier: 'dossier' } }, { id: 'second', from: 'work', to: 'approve', mapping: { result: 'result' } }] });
  await page.locator('.node[data-id=work]').click(); await page.getByRole('button', { name: 'Supprimer cette étape', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('2 liens'); await expect(page.getByRole('dialog')).toContainText('Valider le dossier');
  await page.getByRole('button', { name: 'Conserver', exact: true }).click(); await expect(page.locator('.node')).toHaveCount(3);
  await page.getByRole('button', { name: 'Supprimer cette étape', exact: true }).click();
  await page.getByRole('button', { name: 'Supprimer le bloc et ses liens', exact: true }).click();
  await page.getByRole('button', { name: 'Exécuter…', exact: true }).click();
  const guidance = page.getByRole('dialog').locator('.design-guidance'); await guidance.locator('summary').click();
  await expect(guidance).toContainText('Entrée sans lien : result');
  await page.screenshot({ path: test.info().outputPath('missing-input-launch-guidance.png') });
  await guidance.locator('li').filter({ hasText: 'Valider le dossier' }).getByRole('button', { name: 'Vérifier les liens' }).click();
  await expect(page.locator('.design-links')).toHaveAttribute('open'); await page.getByRole('button', { name: 'Relier une entrée…', exact: true }).click();
  await page.locator('#connect-form select[name=output]').selectOption('dossier'); await page.locator('#connect-form select[name=input]').selectOption('result');
  await page.getByRole('button', { name: 'Créer le lien', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Exécuter…', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Lancer cette version du workflow', exact: true })).toBeVisible(); await expect(page.getByRole('dialog').locator('.design-guidance')).toHaveCount(0);
  expect((await snapshot()).edges).toHaveLength(1);
});

test('integrated template copies are explicitly named and the source remains available', async () => {
  await page.locator('[data-workflow-route=global]').click();
  await page.getByRole('navigation', { name: 'Bibliothèque de workflows' }).getByRole('button', { name: 'Modèles', exact: true }).click();
  const card = page.locator('.template-card').filter({ has: page.getByRole('heading', { name: 'Analyse', exact: true }) });
  await card.getByRole('button', { name: 'Personnaliser une copie…', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Origine : Analyse'); await expect(page.getByLabel('Nom de votre modèle')).toHaveValue('Analyse — copie');
  await page.getByLabel('Nom de votre modèle').fill('Analyse'); await page.getByRole('button', { name: 'Créer la copie et l’ouvrir', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('nom distinct');
  await page.getByLabel('Nom de votre modèle').fill('Support interne — analyse'); await page.getByRole('button', { name: 'Créer la copie et l’ouvrir', exact: true }).click();
  await expect(page.locator('.workflow-heading h1')).toHaveText('Support interne — analyse');
  await page.locator('[data-workflow-route=global]').click(); await page.getByRole('navigation', { name: 'Bibliothèque de workflows' }).getByRole('button', { name: 'Modèles', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Analyse', exact: true })).toBeVisible();
  const copy = page.locator('.template-card').filter({ has: page.getByRole('heading', { name: 'Support interne — analyse', exact: true }) });
  await expect(copy).toContainText('Copie du modèle intégré');
  await copy.getByRole('button', { name: 'Modifier le modèle', exact: true }).click();
  await expect(page.locator('.workflow-heading h1')).toHaveText('Support interne — analyse');
  await page.screenshot({ path: test.info().outputPath('named-template-copy.png') });
});

test('navigation records pending block edits and provider installation is not described as an authenticated connection', async () => {
  await seed({ nodes: [{ id: 'collect', kind: 'task', title: 'Recueillir la demande' }], edges: [] });
  await page.locator('.node[data-id=collect]').click(); await page.getByLabel('Consigne', { exact: true }).fill('Conserver les critères acceptés pendant le changement de vue.');
  await expect(page.locator('.workflow-heading p')).toContainText('Modifications en attente');
  await expect(page.locator('.editor-save-help')).toContainText('navigation principale enregistre');
  await page.getByRole('tab', { name: 'Historique', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Exécutions du workflow', exact: true })).toBeVisible();
  expect((await snapshot()).nodes[0].prompt).toBe('Conserver les critères acceptés pendant le changement de vue.');
  await openWorkflow(); await page.locator('.node[data-id=collect]').click();
  await expect(page.getByLabel('Consigne', { exact: true })).toHaveValue('Conserver les critères acceptés pendant le changement de vue.');
  await page.getByRole('button', { name: 'Connexions', exact: true }).click();
  for (const name of ['Codex', 'Claude Code']) {
    const provider = page.locator('.connection-grid .card').filter({ has: page.getByRole('heading', { name, exact: true }) });
    await expect(provider).toContainText('Installé · connexion à vérifier'); await expect(provider.locator('.pill').first()).not.toHaveClass(/accepted/);
  }
});

test('portable import previews named blocks and data before optional technical JSON', async () => {
  await seed({ nodes: [
    { id: 'collect', kind: 'task', title: 'Préparer le dossier métier', outputs: { dossier: 'string' }, prompt: 'Synthétiser les besoins du client fictif.' },
    { id: 'review', kind: 'decision', title: 'Relire le dossier métier', inputs: { dossier: 'string' }, options: ['approve', 'reject'] },
  ], edges: [{ id: 'handover', from: 'collect', to: 'review', mapping: { dossier: 'dossier' } }] });
  const file = path.join(directory, 'workflow-synthetique.tricorder-workflow');
  await app.evaluate(({ dialog }, selected) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: selected }); dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] }); }, file);
  await page.locator('.design-menu > summary').click();
  await page.getByRole('button', { name: 'Exporter…', exact: true }).click(); await expect.poll(() => fs.existsSync(file)).toBe(true);
  await page.locator('[data-workflow-route=global]').click(); await page.getByRole('button', { name: 'Importer un workflow', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByText('Examiner les étapes et les données', { exact: true }).click();
  await dialog.getByText('Préparer le dossier métier · Tâche', { exact: true }).click();
  await expect(dialog).toContainText('Synthétiser les besoins du client fictif.');
  await expect(dialog).toContainText('Préparer le dossier métier → Relire le dossier métier');
  await expect(dialog.locator('pre:visible')).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('portable-business-preview.png') });
  await dialog.getByLabel('Destination', { exact: true }).selectOption(project.id); await dialog.getByRole('button', { name: 'Importer le brouillon', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const data = await call('project.get', { project: project.id });
  expect(data.workflows).toHaveLength(2); expect(data.runs).toHaveLength(0);
});

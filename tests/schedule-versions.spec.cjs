// Schedule inspection and replacement must retain their frozen definitions and
// require a fresh activation. All projects, providers and schedules are synthetic.
const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { cleanupBroker } = require('./terminal-fixture.cjs');
const root = path.resolve(__dirname, '..');
let directory, app, page, project, original, current, schedule;
const call = (action, data = {}) => page.evaluate(payload => window.studio.request(payload), { action, ...data });
const human = (action, data = {}) => page.evaluate(payload => window.studio.human(payload), { action, ...data });
const scheduleCard = () => page.locator(`[data-schedule="${schedule.id}"]`);
async function showSchedules() { await page.getByRole('button', { name: 'Planifications', exact: true }).click(); }
async function showSnapshot() { await scheduleCard().getByRole('button', { name: 'Configuration et réponses · révision 1', exact: true }).click(); }

test.beforeEach(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-schedule-versions-'));
  const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  for (const provider of ['codex', 'claude']) fs.writeFileSync(path.join(bin, provider), '#!/bin/sh\nprintf "SCHEDULE_TEST_INERT_ONLY\\n"\n', { mode: 0o755 });
  const env = { PATH: bin + ':/usr/bin:/bin', HOME: directory, DISPLAY: process.env.DISPLAY, XAUTHORITY: process.env.XAUTHORITY, LANG: 'C.UTF-8',
    XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_CACHE_HOME: path.join(directory, 'cache'), XDG_DATA_HOME: path.join(directory, 'data'),
    CODEX_HOME: path.join(directory, 'codex'), CLAUDE_CONFIG_DIR: path.join(directory, 'claude'), TRICORDER_HOME: directory,
    TRICORDER_STATE_DIR: directory, TRICORDER_RUNTIME_DIR: path.join(directory, 'runtime'), TRICORDER_AGENTS_DIR: path.join(directory, 'no-pack'), TRICORDER_TEST_MODE: '1', PYTHONDONTWRITEBYTECODE: '1' };
  app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? ['--workflow-studio'] : [root, '--workflow-studio'], env });
  page = await app.firstWindow(); await page.evaluate(() => localStorage.setItem('tricorder-editor-detail','yes')); await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
  project = await call('project.create', { title: 'Contrôles récurrents synthétiques' });
  original = await call('workflow.save', { project: project.id, graph: { schema: 1, id: 'daily-review', title: 'Compte rendu périodique', nodes: [
    { id: 'draft', kind: 'command', title: 'Préparer le compte rendu', argv: ['/usr/bin/python3', '-c', 'print("Compte rendu V1")'], criteria: [], validation: 'automatic' },
    { id: 'send', kind: 'communication', title: 'Partager le compte rendu', channel: 'email', recipient: 'destinataire-synthetique', template: 'Contenu V1', validation: 'human' },
  ], edges: [{ id: 'draft-send', from: 'draft', to: 'send', outcome: 'done' }] } });
  schedule = await human('schedule.create', { project: project.id, graph: original, simulation: true, authorize_notifications: true, rule: { kind: 'interval', minutes: 60, timezone: 'Europe/Zurich' } });
  const edited = structuredClone(original); edited.nodes[0].argv[2] = 'print("Compte rendu V2")'; edited.nodes[1].template = 'Contenu V2';
  current = await call('workflow.save', { project: project.id, graph: edited, revision: original.revision });
});

test.afterEach(async () => {
  if (app) await app.close();
  for (const socket of ['cockpit/odoo-tricorder/pty.sock', 'studio-pty.sock', 'runtime/pty.sock']) await cleanupBroker(path.join(directory, socket));
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test('schedule snapshot is readable and replacement requires explicit archive then fresh activation', async () => {
  await showSchedules();
  await expect(scheduleCard()).toContainText('Active'); await showSnapshot();
  const snapshot = page.getByRole('dialog', { name: 'Configuration et réponses', exact: true });
  await expect(snapshot).toContainText('révision 1');
  await snapshot.locator('.schedule-snapshot > details').first().locator(':scope > summary').click();
  await expect(snapshot.locator('.schedule-snapshot')).toContainText('Compte rendu V1');
  await expect(snapshot.locator('.schedule-snapshot')).not.toContainText('Compte rendu V2');
  await page.screenshot({ path: test.info().outputPath('schedule-frozen-version.png') });
  await snapshot.getByRole('button', { name: 'Modifier les réponses ou la version…', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('révision 2');
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  expect((await call('schedule.get', { schedule: schedule.id })).enabled).toBe(true);
  await showSnapshot(); await page.getByRole('button', { name: 'Modifier les réponses ou la version…', exact: true }).click();
  await page.getByRole('button', { name: 'Archiver et configurer la nouvelle', exact: true }).click();
  const form = page.locator('#schedule-form');
  await expect(form).toContainText('révision 2'); await expect(form).toContainText('ancienne planification est archivée');
  await expect(form.locator('[name=authorize_notifications]')).not.toBeChecked();
  await expect(form.locator('input[type=checkbox][required]')).not.toBeChecked();
  await expect(form.locator('[name=simulation]')).toBeChecked();
  expect((await call('schedule.list')).filter(row => row.enabled)).toHaveLength(0);
  await page.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).click();
  expect(await call('schedule.list')).toHaveLength(1);
  await showSchedules(); await page.getByRole('button', { name: 'Voir les archives', exact: true }).click();
  await expect(scheduleCard()).toContainText('Archivée'); await showSnapshot();
  await page.getByRole('button', { name: 'Modifier les réponses ou la version…', exact: true }).click();
  await page.getByRole('button', { name: 'Configurer la nouvelle planification', exact: true }).click();
  await page.locator('#schedule-form input[type=checkbox][required]').check();
  await page.getByRole('button', { name: 'Activer la planification', exact: true }).click();
  await expect(page.locator('#schedule-form')).toHaveCount(0);
  const schedules = await call('schedule.list');
  expect(schedules).toHaveLength(2); expect(schedules.filter(row => row.enabled)).toHaveLength(1);
  const replacement = schedules.find(row => row.id !== schedule.id);
  expect(replacement.revision).toBe(2); expect(replacement.notifications_authorized).toBe(false);
  const preserved = await call('schedule.get', { schedule: schedule.id });
  expect(preserved.archived).toBe(true); expect(preserved.enabled).toBe(false); expect(preserved.definition).toEqual(original);
  expect((await call('schedule.get', { schedule: replacement.id })).definition).toEqual(current);
  await page.screenshot({ path: test.info().outputPath('schedule-explicit-replacement.png') });
});

test('communication properties distinguish result validation from approval before sending', async () => {
  await page.getByRole('button', { name: 'Projets', exact: true }).click();
  await page.locator('.project-card').filter({ hasText: project.title }).click();
  await page.locator('[data-action=open-workflow][data-id=daily-review]').click();
  await page.locator('.node[data-id=send]').click();
  await expect(page.locator('#node-validation option:checked')).toHaveText('Manuelle — après opération');
  await expect(page.locator('#node-form')).toContainText('après l’envoi ou l’opération du connecteur');
  await expect(page.locator('#node-form')).toContainText('Décision humaine avant ce bloc Communication');
  expect((await call('schedule.get', { schedule: schedule.id })).enabled).toBe(true);
});

test('a rapid double click activates a replacement only once and still requires human confirmation', async () => {
  await showSchedules(); await showSnapshot();
  await page.getByRole('button', { name: 'Modifier les réponses ou la version…', exact: true }).click();
  await page.getByRole('button', { name: 'Archiver et configurer la nouvelle', exact: true }).click();
  await expect(page.locator('#schedule-form')).toBeVisible();
  await app.evaluate(({ ipcMain }) => {
    const originalHandler = ipcMain._invokeHandlers.get('studio:human');
    globalThis.__scheduleActivation = { calls: 0, pending: false };
    ipcMain.removeHandler('studio:human');
    ipcMain.handle('studio:human', async (event, payload) => {
      if (payload.action !== 'schedule.create') return originalHandler(event, payload);
      globalThis.__scheduleActivation.calls++;
      const result = await originalHandler(event, payload); // Preserve trusted origin and real engine checks.
      if (globalThis.__scheduleActivation.calls === 1) {
        globalThis.__scheduleActivation.pending = true;
        await new Promise(resolve => { globalThis.__releaseSchedule = resolve; });
      }
      return result;
    });
  });
  const activate = page.getByRole('button', { name: 'Activer la planification', exact: true });
  await activate.dblclick(); // Native required checkbox must prevent submission.
  expect(await app.evaluate(() => globalThis.__scheduleActivation.calls)).toBe(0);
  await page.locator('#schedule-form input[type=checkbox][required]').check();
  await activate.dblclick();
  await expect.poll(() => app.evaluate(() => globalThis.__scheduleActivation.pending)).toBe(true);
  await app.evaluate(() => globalThis.__releaseSchedule());
  await expect(page.locator('#schedule-form')).toHaveCount(0);
  // This navigation enters the same UI action queue after both click events.
  // Its completion proves any duplicate queued submit has already been processed.
  await page.getByRole('button', { name: 'Activité', exact: true }).click();
  await expect(page.locator('.activity-page h1')).toHaveText('Activité');
  expect(await app.evaluate(() => globalThis.__scheduleActivation.calls)).toBe(1);
  const schedules = await call('schedule.list');
  expect(schedules).toHaveLength(2); expect(schedules.filter(row => row.enabled)).toHaveLength(1);
  expect(schedules.find(row => row.id === schedule.id).archived).toBe(true);
});

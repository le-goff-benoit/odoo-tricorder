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
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-reuse-'));
  const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  for (const provider of ['codex', 'claude']) fs.writeFileSync(path.join(bin, provider), '#!/bin/sh\nprintf "REUSE_INERT\\n"\nexit 78\n', { mode: 0o755 });
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
  await expect(page.locator('.xterm-screen:visible')).toContainText('REUSE_INERT');
  await page.locator('[data-action=terminal-toggle]').click();
});
test.afterEach(async () => {
  if (app) await app.close();
  for (const socket of ['cockpit/odoo-tricorder/pty.sock', 'studio-pty.sock', 'runtime/pty.sock']) await cleanupBroker(path.join(directory, socket));
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test('a business project needs no existing repository and its workflow can become a reusable model and an independent project copy', async () => {
  await page.locator('[data-workflow-route=projects]').click();
  await page.getByRole('button', {name:'+ Nouveau projet',exact:true}).click();
  await page.getByLabel('Nom du projet',{exact:true}).fill('Réunions internes');
  await expect(page.getByLabel('Emplacement',{exact:true})).toHaveValue('managed');
  await expect(page.getByRole('dialog')).toContainText('Aucun commit ni envoi distant');
  await page.screenshot({path:test.info().outputPath('projet-local.png')});
  await page.getByRole('button',{name:'Créer le projet',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Réunions internes',exact:true})).toBeVisible();
  const data=await call('bootstrap'); project=data.projects.find(p=>p.title==='Réunions internes');
  expect(project.managed).toBe(true); expect(project.path.startsWith(directory)).toBe(true);
  expect(fs.existsSync(path.join(project.path,'.git'))).toBe(true);
  const graph={schema:1,id:'creation-review',title:'Préparer un atelier',parameters:{request:'Ancienne demande fictive',language:'fr'},nodes:[{id:'draft',kind:'task',title:'Préparer le programme',outputs:{programme:'string'}}],edges:[]};
  await call('workflow.save',{project:project.id,graph});
  await openWorkflow();
  await page.locator('.node[data-id=draft]').click();
  await page.getByLabel('Consigne',{exact:true}).fill('Résumer les attentes avant le programme.');
  await page.locator('.design-menu > summary').click();
  await page.getByRole('button',{name:'Réutiliser…',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Les demandes, résultats, validations et planifications ne sont pas repris');
  await page.getByLabel('Nom de la copie',{exact:true}).fill('Modèle de préparation de réunion');
  await page.screenshot({path:test.info().outputPath('reutiliser-workflow.png')});
  await page.getByRole('button',{name:'Créer la copie',exact:true}).dblclick();
  await expect(page.locator('.workflow-heading h1')).toHaveText('Modèle de préparation de réunion');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.flash')).not.toContainText('Cannot read');
  const library=await call('project.get',{project:'library'});const template=library.workflows.find(w=>w.title==='Modèle de préparation de réunion');
  expect(template).toBeTruthy();expect(library.runs).toHaveLength(0);
  const savedTemplate=await call('workflow.get',{project:'library',workflow:template.id});
  expect(savedTemplate.nodes[0].prompt).toBe('Résumer les attentes avant le programme.');
  expect(savedTemplate.parameters).toEqual({language:'fr'});
  await page.locator('.design-menu > summary').click();await page.getByRole('button',{name:'Réutiliser…',exact:true}).click();
  await page.getByLabel('Destination',{exact:true}).selectOption(project.id);await page.getByLabel('Nom de la copie',{exact:true}).fill('Atelier de septembre');
  await page.getByRole('button',{name:'Créer la copie',exact:true}).click();
  await expect(page.locator('.workflow-heading h1')).toHaveText('Atelier de septembre');
  const destination=await call('project.get',{project:project.id});expect(destination.workflows).toHaveLength(2);expect(destination.runs).toHaveLength(0);
  const original=await snapshot();expect(original.title).toBe('Préparer un atelier');expect(original.parameters.request).toBe('Ancienne demande fictive');
  expect((await call('workflow.get',{project:'library',workflow:template.id})).revision).toBe(1);
});

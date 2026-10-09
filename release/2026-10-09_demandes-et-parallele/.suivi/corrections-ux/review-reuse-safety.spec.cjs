const { test, expect, _electron: electron } = require('../../../../node_modules/@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { cleanupBroker } = require('../../../../tests/terminal-fixture.cjs');
const root = path.resolve(__dirname, '../../../..');
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
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-independent-reuse-'));
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


test('a reused composite method clears nested execution context and preserves instructions and business parameters', async () => {
  await call('template.workspace');
  const child={schema:1,id:'child-review',title:'Invitation synthétique',parameters:{request:'ANCIENNE DEMANDE',source_context:{results:{draft:{summary:'ANCIEN RESULTAT'}}},language:'fr'},nodes:[{id:'draft',kind:'task',title:'Rédiger invitation',prompt:'Préparer une invitation.',outputs:{invitation:'string'}}],edges:[]};
  await call('workflow.save',{project:'library',graph:child});
  await seed({parameters:{request:'Ancienne demande parente',timezone:'Europe/Zurich'},nodes:[{id:'prepare',kind:'subworkflow',title:'Préparer invitation',workflow:child.id}],edges:[]});
  await page.locator('.design-menu > summary').click();await page.getByRole('button',{name:'Réutiliser…',exact:true}).click();
  await page.getByLabel('Nom de la copie',{exact:true}).fill('Méthode indépendante reçue');
  await page.getByRole('button',{name:'Créer la copie',exact:true}).click();
  await expect(page.locator('.workflow-heading h1')).toHaveText('Méthode indépendante reçue');
  const library=await call('project.get',{project:'library'});
  const copied=library.workflows.find(w=>w.title==='Méthode indépendante reçue');
  const actual=await call('workflow.get',{project:'library',workflow:copied.id});
  expect(actual.parameters).toEqual({timezone:'Europe/Zurich'});
  expect(actual.nodes.find(n=>n.id==='prepare.draft').parameters).toEqual({language:'fr'});
  expect(actual.nodes.find(n=>n.id==='prepare.draft').prompt).toBe('Préparer une invitation.');
  expect(library.runs).toHaveLength(0);
  expect((await snapshot()).parameters.request).toBe('Ancienne demande parente');
  await page.screenshot({path:test.info().outputPath('reused-composite-no-prior-request.png')});
});

test('double submission of a reuse form creates one copy without a false failure after success', async () => {
  await seed({nodes:[{id:'draft',kind:'task',title:'Préparer invitation'}],edges:[]});
  await page.locator('.design-menu > summary').click();await page.getByRole('button',{name:'Réutiliser…',exact:true}).click();
  await page.getByLabel('Nom de la copie',{exact:true}).fill('Copie par double geste');
  await page.getByRole('button',{name:'Créer la copie',exact:true}).dblclick();
  await expect(page.locator('.workflow-heading h1')).toHaveText('Copie par double geste');
  await call('bootstrap');
  const library=await call('project.get',{project:'library'});
  expect(library.workflows.filter(w=>w.title==='Copie par double geste')).toHaveLength(1);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('an explicitly selected revised document replaces the automatic same-name mapping to that input', async () => {
  await seed({nodes:[{id:'prepare',kind:'task',title:'Préparer les deux versions',outputs:{invitation:'string',revised:'string'}},{id:'review',kind:'task',title:'Relire la version corrigée',inputs:{invitation:'string'}}],edges:[]});
  await page.locator('.node[data-id=prepare]').click();await page.getByRole('button',{name:'Relier',exact:true}).click();
  const form=page.locator('#connect-form');
  await form.locator('select[name=output]').selectOption('revised');
  await form.locator('select[name=input]').selectOption('invitation');
  await page.getByRole('button',{name:'Créer le lien',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await expect.poll(async()=>(await snapshot()).edges).toHaveLength(1);
  expect((await snapshot()).edges[0].mapping).toEqual({revised:'invitation'});
});

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
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-wiring-'));
  const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  for (const provider of ['codex', 'claude']) fs.writeFileSync(path.join(bin, provider), '#!/bin/sh\nprintf "WIRING_INERT\\n"\nexit 78\n', { mode: 0o755 });
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
  await expect(page.locator('.xterm-screen:visible')).toContainText('WIRING_INERT');
  await page.locator('[data-action=terminal-toggle]').click();
});
test.afterEach(async () => {
  if (app) await app.close();
  for (const socket of ['cockpit/odoo-tricorder/pty.sock', 'studio-pty.sock', 'runtime/pty.sock']) await cleanupBroker(path.join(directory, socket));
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test('a new human decision exposes its default branches and keeps the selected branch when changing destination', async () => {
  await seed({ nodes: [
    { id: 'draft', kind: 'task', title: 'Préparer une proposition', position: { x: 40, y: 40 } },
    { id: 'accepted', kind: 'document', title: 'Préparer le dossier accepté', position: { x: 350, y: 40 } },
    { id: 'rejected', kind: 'document', title: 'Documenter le refus', position: { x: 350, y: 230 } },
  ], edges: [] });
  await page.getByRole('button', { name: '+ Ajouter un bloc', exact: true }).click();
  await page.getByLabel("Type d'étape", { exact: true }).selectOption('decision');
  await page.getByLabel('Nom du bloc', { exact: true }).fill('Autoriser la suite');
  await page.getByRole('button', { name: 'Ajouter au workflow', exact: true }).click();
  // Do not apply the properties: defaults must be usable as soon as the block exists.
  await page.locator('.node[data-id=draft]').click();
  await page.getByRole('button', { name: 'Relier', exact: true }).click();
  const form = page.locator('#connect-form');
  const decision = await form.locator('select[name=from] option').filter({ hasText: 'Autoriser la suite' }).getAttribute('value');
  await form.locator('select[name=from]').selectOption(decision);
  await expect(form.locator('select[name=outcome] option')).toHaveCount(2);
  await expect(form.locator('select[name=outcome]')).toHaveValue('approve');
  await form.locator('select[name=outcome]').selectOption('reject');
  await form.locator('select[name=to]').selectOption('rejected');
  await expect(form.locator('select[name=outcome]')).toHaveValue('reject');
  await page.getByRole('button', { name: 'Créer le lien', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await openWorkflow();
  expect((await snapshot()).edges).toEqual([expect.objectContaining({ from: decision, to: 'rejected', outcome: 'reject' })]);
  await page.locator('.node[data-id=draft]').click();
  await page.getByRole('button', { name: 'Relier', exact: true }).click();
  await form.locator('select[name=from]').selectOption(decision);
  await form.locator('select[name=outcome]').selectOption('reject');
  await form.locator('select[name=from]').selectOption('draft');
  await expect(form.locator('select[name=outcome] option')).toHaveCount(1);
  await expect(form.locator('select[name=outcome]')).toHaveValue('done');
  await form.locator('select[name=to]').selectOption(decision);
  await page.getByRole('button', { name: 'Créer le lien', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect.poll(async () => (await snapshot()).edges).toEqual(expect.arrayContaining([expect.objectContaining({ from: 'draft', to: decision, outcome: 'done' })]));
});


test('a renamed data connection remains readable beside the selected block and on the graph', async () => {
  await seed({nodes:[{id:'collect',kind:'task',title:'Recueillir les informations',outputs:{fiche_diagnostic:'string'},position:{x:40,y:40}},
    {id:'review',kind:'task',title:'Relire la fiche',inputs:{fiche:'string'},position:{x:400,y:40}}],
    edges:[{id:'data',from:'collect',to:'review',mapping:{fiche_diagnostic:'fiche'}}]});
  await page.locator('.node[data-id=review]').click();
  await page.locator('.design-links > summary').click();
  await expect(page.locator('.design-links')).toContainText('fiche_diagnostic → fiche');
  await expect(page.locator('.design-links')).toContainText('Travail terminé');
  await expect(page.locator('.canvas svg text')).toHaveText('1 donnée');
});


test('choosing only a data output gives an inline repair instead of silently creating an order-only link', async () => {
  await seed({nodes:[{id:'collect',kind:'task',title:'Collecter',outputs:{dossier:'string'}},{id:'review',kind:'task',title:'Relire',inputs:{fiche:'string'}}],edges:[]});
  await page.locator('.node[data-id=collect]').click();await page.getByRole('button',{name:'Relier',exact:true}).click();
  const form=page.locator('#connect-form');await form.locator('select[name=output]').selectOption('dossier');
  await page.getByRole('button',{name:'Créer le lien',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Choisissez la sortie et l’entrée destinataire');
  await expect(form.locator('select[name=output]')).toHaveValue('dossier');
  expect((await snapshot()).edges).toHaveLength(0);
  await form.locator('select[name=input]').selectOption('fiche');await page.getByRole('button',{name:'Créer le lien',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await expect.poll(async()=>(await snapshot()).edges).toEqual([expect.objectContaining({mapping:{dossier:'fiche'}})]);
});

test('a processed refusal reads Refusée instead of a green Validé and does not release the approved branch', async () => {
  await seed({nodes:[{id:'gate',kind:'decision',title:'Autoriser le programme',question:'Le programme est-il accepté ?'},
    {id:'document',kind:'document',title:'Préparer le programme accepté'}],edges:[{id:'approved',from:'gate',to:'document',outcome:'approve'}]});
  await page.getByRole('button',{name:'Exécuter…',exact:true}).click();await page.getByRole('button',{name:'Simuler le parcours',exact:true}).click();
  await page.locator('.node[data-id=gate]').click();
  await page.getByLabel('Commentaire (facultatif)',{exact:true}).fill('Le programme doit être revu.');
  await page.getByRole('button',{name:'Refuser la suite',exact:true}).click();
  await expect(page.locator('#inspector .pill.decision-rejected')).toHaveText('Refusée');
  await expect(page.locator('.node[data-id=gate] .pill')).toHaveText('Refusée');
  await expect(page.locator('.node[data-id=document]')).toHaveAttribute('data-status','skipped');
  await page.screenshot({path:test.info().outputPath('decision-refusee.png')});
});

test('order-only explicitly overrides automatic matching of same-name ports', async () => {
  await seed({nodes:[{id:'collect',kind:'task',title:'Collecter',outputs:{fiche:'string'}},{id:'review',kind:'task',title:'Relire',inputs:{fiche:'string'}}],edges:[]});
  await page.locator('.node[data-id=collect]').click();await page.getByRole('button',{name:'Relier',exact:true}).click();
  const form=page.locator('#connect-form');await expect(form.locator('.mapping-summary')).toContainText('Données reliées par leur nom : fiche');
  await form.getByLabel('Ne transmettre aucune donnée (ordre d’exécution uniquement)',{exact:true}).check();
  await expect(form.locator('select[name=output]')).toBeDisabled();
  await page.getByRole('button',{name:'Créer le lien',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await expect.poll(async()=>(await snapshot()).edges).toEqual([expect.objectContaining({mapping:{}})]);
});

test('choosing the revised output replaces the automatically matched source for that input', async () => {
  await seed({nodes:[{id:'draft',kind:'task',title:'Rédiger',outputs:{invitation:'string',revised:'string'}},{id:'review',kind:'task',title:'Relire',inputs:{invitation:'string'}}],edges:[]});
  await page.locator('.node[data-id=draft]').click();await page.getByRole('button',{name:'Relier',exact:true}).click();
  const form=page.locator('#connect-form');await form.locator('select[name=output]').selectOption('revised');await form.locator('select[name=input]').selectOption('invitation');
  await page.getByRole('button',{name:'Créer le lien',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await expect.poll(async()=>(await snapshot()).edges).toEqual([expect.objectContaining({mapping:{revised:'invitation'}})]);
});

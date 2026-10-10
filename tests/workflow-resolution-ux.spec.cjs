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
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-resolution-'));
  const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  for (const provider of ['codex', 'claude']) fs.writeFileSync(path.join(bin, provider), '#!/bin/sh\nprintf "RESOLUTION_INERT\\n"\nexit 78\n', { mode: 0o755 });
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
  await expect(page.locator('.xterm-screen:visible')).toContainText('RESOLUTION_INERT');
  await page.locator('[data-action=terminal-toggle]').click();
});
test.afterEach(async () => {
  if (app) await app.close();
  for (const socket of ['cockpit/odoo-tricorder/pty.sock', 'studio-pty.sock', 'runtime/pty.sock']) await cleanupBroker(path.join(directory, socket));
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});


const {execFileSync}=require('node:child_process');
function fixture(stage, run='') {
  const backend=process.env.TRICORDER_EXECUTABLE ? path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend') : path.join(root,'backend');
  const script=`import json,sys
sys.path.insert(0,sys.argv[1])
from workflow_engine import Engine
e=Engine(sys.argv[2]);project=sys.argv[3];stage=sys.argv[4]
if stage=='failure':
 graph=next(g for g in e.workflows(project) if g['id']=='creation-review')
 r=e.start(project,graph,driver='conversation');rid=r['id'];token=e.claim(rid,'work')['token']
 e.submit(rid,'work',token,{'ok':False,'summary':'SYNTHETIQUE : source incomplète, préciser la date.','outputs':{}})
else:
 rid=sys.argv[5];token=e.claim(rid,'work')['token']
 e.submit(rid,'work',token,{'ok':True,'summary':'Invitation synthétique rédigée.','outputs':{'invitation':'SYNTHETIQUE : rendez-vous le 18 octobre à 14 heures.'}})
print(json.dumps({'run':rid}))`;
  return JSON.parse(execFileSync('/usr/bin/python3',['-c',script,backend,path.dirname(path.dirname(project.path)),project.id,stage,run],{env:{PATH:path.join(directory,'bin')+':/usr/bin:/bin',HOME:directory,PYTHONDONTWRITEBYTECODE:'1'},encoding:'utf8'}));
}
test('retry states its remaining budget without pretending to start and the completed request exposes its accepted content directly',async()=>{
  await seed({nodes:[{id:'work',kind:'task',title:'Rédiger une invitation',outputs:{invitation:'string'},validation:'contract',max_attempts:2},
    {id:'gate',kind:'decision',title:'Accepter l’invitation',inputs:{invitation:'string'},question:'L’invitation convient-elle ?'}],edges:[{id:'review',from:'work',to:'gate',mapping:{invitation:'invitation'}}]});
  const {run}=fixture('failure');
  await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();
  await page.locator(`[data-action=open-run][data-id="${run}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();
  await expect(page.locator('.attempt-budget')).toContainText('Tentative 1 sur 2 · 1 reprise restante');
  await page.getByRole('button',{name:'Préparer la reprise',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('elle ne démarre pas l’agent');
  await expect(page.getByRole('dialog')).toContainText('Tentative 1 sur 2 · 1 reprise restante');
  await page.getByLabel('Correction attendue',{exact:true}).fill('La date est le 18 octobre à 14 heures.');
  await page.screenshot({path:test.info().outputPath('budget-reprise.png')});
  await page.getByRole('button',{name:'Préparer cette étape pour reprise',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const prepared=(await call('run.get',{run})).run;
  expect(prepared.nodes.work.status).toBe('ready');expect(prepared.nodes.work.attempt).toBe(1);
  fixture('success',run);
  await expect.poll(async()=>(await call('run.get',{run})).run.nodes.gate.status).toBe('waiting');
  await page.getByRole('button',{name:'Graphe',exact:true}).click();await page.locator('.node[data-id=gate]').click();
  await page.getByRole('button',{name:'Approuver la suite',exact:true}).click();
  await expect(page.getByRole('button',{name:'Voir les résultats',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Voir les résultats',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('SYNTHETIQUE : rendez-vous le 18 octobre à 14 heures.');
  await expect(page.getByRole('dialog')).toContainText('Rédiger une invitation');
  await expect(page.getByRole('dialog')).toContainText('Résultat validé · tentative 2');
  await page.screenshot({path:test.info().outputPath('resultats-valides.png')});
  await page.getByRole('button',{name:'Voir le rapport complet',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('#document-view')).toContainText('Invitation synthétique rédigée.');
});

test('refusing a branch shows treated and non-applicable steps separately in the completed follow-up',async()=>{
  await seed({nodes:[{id:'gate',kind:'decision',title:'Examiner la proposition',question:'Préparer le brouillon ?',options:['approve','reject']},
    {id:'draft',kind:'document',title:'Préparer le brouillon',validation:'automatic',criteria:[]}],
    edges:[{id:'allow',from:'gate',to:'draft',outcome:'approve'}]});
  await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
  await page.getByRole('button',{name:'Simuler le parcours',exact:true}).click();
  await expect(page.locator('.execution-label')).toHaveText('Décision attendue');
  await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();
  await expect(page.locator('.decision-consequence')).toContainText('Ce refus ne demande pas de révision');
  await page.getByRole('button',{name:'Refuser la suite',exact:true}).click();
  await expect(page.locator('.execution-progress')).toContainText('2 / 2 étapes');
  await expect(page.locator('.execution-progress')).toContainText('1 traitée · 1 non applicable');
  await expect(page.locator('#inspector')).toContainText('Refusée');
  await page.screenshot({path:test.info().outputPath('branche-refusee-progression.png')});
});

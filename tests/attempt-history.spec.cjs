const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {cleanupBroker}=require('./terminal-fixture.cjs');
const root=path.resolve(__dirname,'..');
let directory,app,page,fixture;

test.beforeEach(async({},info)=>{
  directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-attempt-history-ui-'));
  const environment={...process.env,HOME:directory,XDG_CONFIG_HOME:path.join(directory,'config'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_DATA_HOME:path.join(directory,'data'),TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_AGENTS_DIR:path.join(directory,'absent-pack'),TRICORDER_TEST_MODE:'1'};
  const backend=process.env.TRICORDER_EXECUTABLE ? path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend') : path.join(root,'backend');
  fixture=JSON.parse(execFileSync('/usr/bin/python3',['-c',`
import json,sys
sys.path.insert(0,sys.argv[1])
from workflow_engine import Engine
from workflow_engine.projections import run_detail
e=Engine(sys.argv[2]);p=e.create_project('Synthetic attempts');paged=sys.argv[3]=='paged'
g={'schema':1,'id':'attempts','title':'Synthetic retry history','nodes':[
 {'id':'plan','title':'Prepare the plan','kind':'task','validation':'contract','outputs':{'plan':'string'}},
 {'id':'work','title':'Implement the request','kind':'task','validation':'contract','inputs':{'plan':'string'},'max_attempts':10 if paged else 2},
],'edges':[{'id':'plan-work','from':'plan','to':'work','outcome':'done','mapping':{'plan':'plan'}}]}
e.save(p['id'],g);r=e.start(p['id'],g,driver='conversation');rid=r['id']
c=e.claim(rid,'plan');e.submit(rid,'plan',c['token'],{'ok':True,'summary':'Synthetic plan prepared','outputs':{'plan':'Long synthetic plan. '*900}})
proof=e.artifact(b'Synthetic command log: initial failure.')
proof.update(filename='journal-tentative1.txt',role='evidence')
c=e.claim(rid,'work');e.submit(rid,'work',c['token'],{'ok':False,'summary':'Synthetic candidate copy could not start.','outputs':{'files':['sample.py'],'changed':False,'actions':[{'action':'Vérifier les salles','owner':'Alice','due':'16 octobre'}]},'evidence':[proof]})
e.retry(rid,'work','Adjust the synthetic copy configuration.',human=True)
c=e.claim(rid,'work');r=e.submit(rid,'work',c['token'],{'ok':False,'summary':'Synthetic agent returned without file changes.','outputs':{}})
if paged:
 for attempt in range(8):
  e.retry(rid,'work','A detailed correction. '*300,human=True)
  c=e.claim(rid,'work');r=e.submit(rid,'work',c['token'],{'ok':False,'summary':'Synthetic extensive diagnosis. '*500,'outputs':{'detail':'Synthetic detail. '*500},'preview':'Synthetic preview. '*500,'evidence':[proof]*10})
assert '$artifact' in run_detail(e,r)['nodes']['work']['history']
print(json.dumps({'project':p['id'],'run':rid}))
`,backend,directory,info.title.startsWith('paged')?'paged':'inline'],{env:environment,encoding:'utf8'}));
  app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?['--workflow-studio']:[root,'--workflow-studio'],env:environment,timeout:20000});
  page=await app.firstWindow();
  await page.locator('[data-workflow-route=projects]').click();
  await page.locator('.project-card').filter({hasText:'Synthetic attempts'}).click();
  await page.locator(`[data-action=open-run][data-id="${fixture.run}"]`).click();
  await page.getByRole('button',{name:'Détail',exact:true}).click();
});

test.afterEach(async()=>{
  if(app)await app.close();
  await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));
  await cleanupBroker(path.join(directory,'studio-pty.sock'));
  fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
});

test('large archived inputs keep failure history readable and attached proofs accessible',async({},info)=>{
  const inspector=page.locator('#inspector');
  await expect(inspector).toContainText('Synthetic agent returned without file changes.');
  await inspector.locator('details.result-context > summary').click();
  const history=inspector.locator('.attempt-history');
  await expect(history).toContainText('Tentative 1');
  await expect(history).toContainText('Échec');
  await expect(history).toContainText('Terminée le');
  await expect(history).toContainText('Synthetic candidate copy could not start.');
  await expect(history).toContainText('Motif de la reprise suivante');
  await expect(history).toContainText('Adjust the synthetic copy configuration.');
  for(const pre of await history.locator('pre').all())await expect(pre).not.toBeVisible();
  await expect(history.locator('.attempt-technical')).not.toHaveAttribute('open','');
  await history.locator('.attempt-results > summary').click();
  await expect(history.getByText('sample.py',{exact:true})).toBeVisible();
  await expect(history.getByRole('columnheader',{name:'Responsable',exact:true})).toBeVisible();
  await expect(history.getByRole('cell',{name:'Alice',exact:true})).toBeVisible();
  await history.scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath('readable-attempt-history.png')});
  await history.getByRole('button',{name:'Preuve — journal-tentative1.txt',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Synthetic command log: initial failure.');
  await page.getByRole('button',{name:'Fermer la fenêtre',exact:true}).click();
  await history.locator('.attempt-technical > summary').click();
  await history.locator('.attempt-technical').getByRole('button',{name:'Lire le contenu complet',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Long synthetic plan.');
  const state=await page.evaluate(run=>window.studio.request({action:'run.get',run}),fixture.run);
  expect(state.run.nodes.work.attempt).toBe(2);
  expect(state.run.nodes.work.status).toBe('returned');
  expect(state.run.nodes.work.attempt_history).toHaveLength(1);
  await page.getByRole('button',{name:'Fermer la fenêtre',exact:true}).click();
  await page.locator('.execution-menu > summary').click();
  await page.locator('[data-action=mode][data-mode=document]').click();
  const report=page.locator('#document-view');
  await expect(report).toContainText('Synthetic retry history');
  for(let count=0;count<10 && await report.locator('[data-action=document-more]').count();count++) {
    const length=(await report.innerText()).length;
    await report.locator('[data-action=document-more]').click();
    await expect.poll(async()=> (await report.innerText()).length).toBeGreaterThan(length);
  }
  await expect(report).toContainText('Tentatives précédentes');
  await expect(report).toContainText('Adjust the synthetic copy configuration.');
  await expect(report.getByRole('link',{name:'Preuve — journal-tentative1.txt',exact:true})).toBeVisible();
  await expect(report.getByRole('columnheader',{name:'Responsable',exact:true})).toBeVisible();
});


test('paged large histories remain formatted with accessible proof links',async()=>{
  await page.locator('#inspector details.result-context > summary').click();
  await page.getByRole('button',{name:'Afficher les tentatives',exact:true}).click();
  await expect(page.getByRole('dialog').locator('.attempt-card')).toHaveCount(3);
  await expect(page.getByRole('dialog')).toContainText('Tentative 9');
  await page.getByRole('button',{name:'Tentatives plus anciennes',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Tentative 4');
  await expect(page.getByRole('dialog')).not.toContainText('Tentative 9');
  const card=page.getByRole('dialog').locator('.attempt-card').first();
  await expect(card).toContainText('Synthetic extensive diagnosis.');
  await card.locator('.attempt-summary').getByRole('button',{name:'Lire le contenu complet',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Synthetic extensive diagnosis.');
});

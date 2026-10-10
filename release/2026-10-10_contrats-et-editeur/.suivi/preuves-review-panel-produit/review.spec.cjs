const {test,expect,_electron:electron}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {cleanupBroker}=require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
const root='/home/blegoff/odoo-tricorder';let app,page,directory,run,project;
const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
const input=()=>page.getByLabel('Nouvelle intention',{exact:true});
const add=()=>page.getByRole('button',{name:'Ajouter à la liste',exact:true});
const stored=async()=>(await call('run.get',{run:run.id})).run.nodes.intentions.collection.items.map(i=>i.text);

// Delay acknowledgement, not execution: reproduce typing while an accepted
// write is in flight. This must not depend on machine speed or a real provider.
async function holdNextAdd(){await app.evaluate(({ipcMain})=>{
 const original=ipcMain._invokeHandlers.get('studio:request');let held=false;
 globalThis.collectionAck={waiting:false,release:null};
 ipcMain.removeHandler('studio:request');ipcMain.handle('studio:request',async(event,payload)=>{
  const result=await original(event,payload);
  if(payload.action==='collection.change'&&payload.operation==='add'&&!held){held=true;globalThis.collectionAck.waiting=true;await new Promise(resolve=>globalThis.collectionAck.release=resolve);}
  return result;
 });
});}
const waitAck=()=>expect.poll(()=>app.evaluate(()=>globalThis.collectionAck.waiting)).toBe(true);
const releaseAck=()=>app.evaluate(()=>globalThis.collectionAck.release());

test.beforeEach(async()=>{
 directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-collection-input-'));
 const bin=path.join(directory,'bin');fs.mkdirSync(bin);
 for(const cli of ['codex','claude'])fs.writeFileSync(path.join(bin,cli),'#!/bin/sh\nexit 78\n',{mode:0o755});
 app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?[]:[root],env:{PATH:bin+':/usr/bin:/bin',HOME:directory,DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_DATA_HOME:path.join(directory,'data'),XDG_CACHE_HOME:path.join(directory,'cache'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'no-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'}});
 page=await app.firstWindow();await page.setViewportSize({width:1400,height:950});
 await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();
 project=await call('project.create',{title:'Collecte de besoins synthétiques'});
 const graph=await call('workflow.save',{project:project.id,graph:{id:'collect',title:'Recueillir les besoins',schema:2,nodes:[{id:'intentions',kind:'input',title:'Recueillir les intentions',outputs:{intentions:{type:'array',items:'object',required:true,minItems:1,maxItems:100}},position:{x:60,y:60}}],edges:[]}});
 run=await call('run.start',{project:project.id,graph,simulation:true});
 await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${run.id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();
});
test.afterEach(async()=>{if(app){await app.evaluate(()=>globalThis.collectionAck?.release?.()).catch(()=>{});await app.close();}for(const socket of ['cockpit/odoo-tricorder/pty.sock','studio-pty.sock','runtime/pty.sock'])await cleanupBroker(path.join(directory,socket));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});



async function openRun(id){await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();}
async function loseNextAdd(){await app.evaluate(({ipcMain})=>{
 const original=ipcMain._invokeHandlers.get('studio:request');let lost=false;globalThis.recordedAdds=[];
 ipcMain.removeHandler('studio:request');ipcMain.handle('studio:request',async(event,payload)=>{
  if(payload.action==='collection.change'&&payload.operation==='add')globalThis.recordedAdds.push(payload);
  const result=await original(event,payload);
  if(payload.action==='collection.change'&&payload.operation==='add'&&!lost){lost=true;throw new Error('Accusé de réception perdu indépendant');}return result;
 });
});}

test('independent: concurrent rejected B survives C, reload, then targeted retry',async()=>{
 await holdNextAdd();await input().fill('A enregistré');await add().click();await waitAck();
 await input().fill('B envoyé avant contribution concurrente');await add().click();
 await input().fill('C envoyé ensuite');await add().click();
 const prior=(await call('run.get',{run:run.id})).run;
 await call('collection.change',{run:run.id,node:'intentions',operation:'add',revision:prior.nodes.intentions.collection.revision,key:'other-agent',text:'X contribution d’un autre collaborateur'});
 await releaseAck();await expect.poll(stored).toEqual(['A enregistré','X contribution d’un autre collaborateur','C envoyé ensuite']);
 await expect(page.locator('.collection-recovery')).toContainText('B envoyé avant contribution concurrente');
 await page.getByRole('button',{name:'Confirmer la liste et continuer',exact:true}).click();await expect(page.locator('#feedback')).toContainText('Résolvez les ajouts');
 await page.screenshot({path:test.info().outputPath('conflict-recoverable.png')});
 await page.reload();await openRun(run.id);
 await expect(page.locator('.collection-recovery')).toContainText('B envoyé avant contribution concurrente');
 await page.getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();
 await expect.poll(stored).toEqual(['A enregistré','X contribution d’un autre collaborateur','C envoyé ensuite','B envoyé avant contribution concurrente']);
 await expect(page.locator('.collection-recovery')).toHaveCount(0);
 fs.writeFileSync(test.info().outputPath('recovered.json'),JSON.stringify(await stored(),null,2));
});

test('independent: lost acknowledgement retry preserves new draft and exact idempotent command',async()=>{
 await loseNextAdd();await input().fill('A accepté sans accusé');await add().click();await expect(page.locator('.collection-recovery')).toContainText('Accusé de réception perdu indépendant');
 await input().fill('B brouillon plus récent');await page.reload();await openRun(run.id);await expect(input()).toHaveValue('B brouillon plus récent');
 await page.getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();await expect(page.locator('.collection-recovery')).toHaveCount(0);
 await expect(input()).toHaveValue('B brouillon plus récent');expect(await stored()).toEqual(['A accepté sans accusé']);
 const calls=await app.evaluate(()=>globalThis.recordedAdds);expect(calls.length).toBe(2);expect(calls[1]).toEqual(calls[0]);
 await add().click();await expect.poll(stored).toEqual(['A accepté sans accusé','B brouillon plus récent']);
 fs.writeFileSync(test.info().outputPath('exact-command.json'),JSON.stringify({calls,stored:await stored()},null,2));
});

test('independent: old acknowledgement after renderer reload does not touch the other run',async()=>{
 const first=run;
 await holdNextAdd();await input().fill('A à enregistrer dans le premier run');await add().click();await waitAck();
 const graph=await call('workflow.get',{project:project.id,workflow:'collect'});
 const second=await call('run.start',{project:project.id,graph,simulation:true});
 await page.reload();await openRun(second.id);await input().fill('B encore en rédaction dans le second run');await releaseAck();
 await expect.poll(async()=>(await call('run.get',{run:first.id})).run.nodes.intentions.collection.items.map(i=>i.text)).toEqual(['A à enregistrer dans le premier run']);
 await expect(input()).toHaveValue('B encore en rédaction dans le second run');
 await add().click();await expect.poll(async()=>(await call('run.get',{run:second.id})).run.nodes.intentions.collection.items.map(i=>i.text)).toEqual(['B encore en rédaction dans le second run']);
 expect((await call('run.get',{run:first.id})).run.nodes.intentions.collection.items.map(i=>i.text)).toEqual(['A à enregistrer dans le premier run']);
 await openRun(first.id);await expect(page.locator('.collection-recovery')).toContainText('A à enregistrer dans le premier run');
 await page.getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();await expect(page.locator('.collection-recovery')).toHaveCount(0);
 expect((await call('run.get',{run:first.id})).run.nodes.intentions.collection.items.map(i=>i.text)).toEqual(['A à enregistrer dans le premier run']);
});

test('independent: deliberately retyped identical intent after an unknown acknowledgement is not conflated',async()=>{
 await loseNextAdd();await input().fill('Intention identique mais délibérément répétée');await add().click();await expect(page.locator('.collection-recovery')).toContainText('Accusé de réception perdu indépendant');
 await input().fill('');await input().fill('Intention identique mais délibérément répétée');await add().click();
 await expect.poll(async()=>({saved:(await stored()).length,recoverable:await page.locator('.collection-recovery article').count()})).toMatchObject({saved:1,recoverable:2});
 const attempts=await app.evaluate(()=>globalThis.recordedAdds);expect(attempts[1].key).not.toBe(attempts[0].key);
 await page.locator('.collection-recovery article').filter({hasText:'Le recueil a changé'}).getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();
 await expect.poll(stored).toHaveLength(2);
 await page.getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();await expect(page.locator('.collection-recovery')).toHaveCount(0);
 expect(await stored()).toEqual(['Intention identique mais délibérément répétée','Intention identique mais délibérément répétée']);
 const calls=await app.evaluate(()=>globalThis.recordedAdds);expect(calls.at(-1)).toEqual(calls[0]);
 fs.writeFileSync(test.info().outputPath('identical-draft-received.json'),JSON.stringify({calls,stored:await stored()},null,2));
});

test('independent: switching existing project terminals keeps the selected workflow and draft',async()=>{
 const second=await call('project.create',{title:'Autre projet synthétique'});
 const two=await page.evaluate(async ids=>[await window.tricorder.workflowTerminal({project:ids[0]}),await window.tricorder.workflowTerminal({project:ids[1]})],[project.id,second.id]);
 await input().fill('Brouillon du workflow conservé pendant les changements de terminal');
 const before=JSON.stringify((await call('run.get',{run:run.id})).run);
 await page.locator('[data-action=terminal-toggle]').click();
 if(await page.getByRole('button',{name:'Ouvrir un terminal',exact:true}).isVisible())await page.getByRole('button',{name:'Ouvrir un terminal',exact:true}).click();
 await expect(page.getByRole('button',{name:'Choisir un terminal ouvert',exact:true})).toBeVisible();
 for(const session of [two[1],two[0],two[1]]){
  await page.getByRole('button',{name:'Choisir un terminal ouvert',exact:true}).click();await page.getByRole('dialog').locator(`[data-session="${session.id}"]`).click();
  await expect(page.locator('#terminal-tabs .terminal-tab.active button[data-session]')).toHaveAttribute('data-session',session.id);
  await expect(input()).toHaveValue('Brouillon du workflow conservé pendant les changements de terminal');
  expect(JSON.stringify((await call('run.get',{run:run.id})).run)).toBe(before);
 }
 const after=(await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive);
 expect(after.map(s=>({id:s.id,pid:s.pid})).sort((a,b)=>a.id.localeCompare(b.id))).toEqual(two.map(s=>({id:s.id,pid:s.pid})).sort((a,b)=>a.id.localeCompare(b.id)));
 await page.screenshot({path:test.info().outputPath('other-terminal-same-workflow.png')});
});

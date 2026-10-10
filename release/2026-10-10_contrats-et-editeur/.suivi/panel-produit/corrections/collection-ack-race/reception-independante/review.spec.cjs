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
test.afterEach(async()=>{if(app){
const evidence={calls:await app.evaluate(()=>globalThis.reviewCalls||[]),stored:await stored(),recovery:await page.locator('.collection-recovery').allTextContents(),draft:await input().count()?await input().inputValue():null};
fs.writeFileSync(test.info().outputPath('evidence.json'),JSON.stringify(evidence,null,2));
const png=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));fs.writeFileSync(test.info().outputPath('end-native.png'),Buffer.from(png,'base64'));
await app.evaluate(()=>globalThis.releaseReviewReads?.()).catch(()=>{});
await app.evaluate(()=>globalThis.collectionAck?.release?.()).catch(()=>{});await app.close();}for(const socket of ['cockpit/odoo-tricorder/pty.sock','studio-pty.sock','runtime/pty.sock'])await cleanupBroker(path.join(directory,socket));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});


for(const mode of ['stale','fresh'])test('independent identical additions with '+mode+' revision preserve exactly two intentions',async()=>{
 await app.evaluate(({ipcMain},mode)=>{
  const original=ipcMain._invokeHandlers.get('studio:request');let additions=0,blocked=mode==='stale',release;
  const gate=new Promise(resolve=>release=resolve);globalThis.releaseReviewReads=()=>{blocked=false;release();};globalThis.reviewCalls=[];
  ipcMain.removeHandler('studio:request');ipcMain.handle('studio:request',async(event,payload)=>{
   if(payload.action==='run.get'&&blocked)await gate;
   const record={at:Date.now(),action:payload.action,request:payload};if(['collection.change','run.get'].includes(payload.action))reviewCalls.push(record);
   const count=payload.action==='collection.change'&&payload.operation==='add'?++additions:0;
   try {
    const result=await original(event,payload);record.revision=(result.run||result)?.nodes?.intentions?.collection?.revision;
    if(count===1){record.acceptedBeforeLostAck=true;throw new Error('Accusé perdu synthétique');}
    return result;
   }catch(e){record.error=String(e);throw e;}
   finally{if(count===2)globalThis.releaseReviewReads();}
  });
 },mode);
 const text='Deux interventions identiques';
 await input().fill(text);await add().click();await expect(page.locator('.collection-recovery')).toContainText('Accusé perdu synthétique');
 if(mode==='fresh')await expect(page.locator('.collection-items li p')).toHaveText([text]);
 await input().fill('');await input().fill(text);await add().click();
 if(mode==='stale'){
  await expect(page.locator('.collection-recovery article')).toHaveCount(2);expect(await stored()).toEqual([text]);await expect(input()).toHaveValue(text);
  await page.locator('.collection-recovery article').filter({hasText:'Le recueil a changé'}).getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();
 }else{
  await expect(page.locator('.collection-recovery article')).toHaveCount(1);
  await expect(page.locator('.collection-items li')).toHaveCount(2);
 }
 await expect.poll(stored).toEqual([text,text]);await expect(input()).toHaveValue('');
 const pre=await app.evaluate(()=>reviewCalls.filter(c=>c.action==='collection.change'));
 expect(pre[0].request.key).not.toBe(pre[1].request.key);expect(pre[0].request.revision).toBe(0);expect(pre[1].request.revision).toBe(mode==='stale'?0:1);
 if(mode==='stale')expect(pre[1].error).toContain('Le recueil a changé');else expect(pre[1].error).toBeUndefined();
 await page.locator('.collection-recovery article').filter({hasText:'Accusé perdu synthétique'}).getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();
 await expect(page.locator('.collection-recovery')).toHaveCount(0);expect(await stored()).toEqual([text,text]);
 await expect.poll(()=>app.evaluate(()=>reviewCalls.filter(c=>c.action==='collection.change').at(-1)?.revision)).toBe(2);
 const final=await app.evaluate(()=>reviewCalls.filter(c=>c.action==='collection.change'));expect(final.at(-1).request).toEqual(final[0].request);expect(final.at(-1).revision).toBe(2);
 await page.getByRole('button',{name:'Confirmer la liste et continuer',exact:true}).click();
 await expect.poll(async()=>(await call('run.get',{run:run.id})).run.status).toBe('completed');
 expect((await call('run.get',{run:run.id})).run.nodes.intentions.result.outputs.intentions.map(i=>i.text)).toEqual([text,text]);
});

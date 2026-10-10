const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {cleanupBroker}=require('./terminal-fixture.cjs');
const root=path.resolve(__dirname,'..');let app,page,directory,run,project;
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

test('a second intention submitted during acknowledgement is recorded once without losing text',async()=>{
 await holdNextAdd();await input().fill('Première demande');await add().click();await waitAck();
 await input().fill('Deuxième demande');await add().click();await add().click();
 await expect(input()).toHaveValue('Deuxième demande');await releaseAck();
 await expect.poll(stored).toEqual(['Première demande','Deuxième demande']);await expect(input()).toHaveValue('');
 await expect(page.locator('.collection-items li')).toHaveCount(2);
});

test('a newer unsent draft survives acknowledgement and reload and cannot be silently left out on confirmation',async()=>{
 await holdNextAdd();await input().fill('Demande enregistrée');await add().click();await waitAck();
 await input().fill('Demande encore en rédaction');await releaseAck();
 await expect.poll(stored).toEqual(['Demande enregistrée']);await expect(input()).toHaveValue('Demande encore en rédaction');
 await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${run.id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();await expect(input()).toHaveValue('Demande encore en rédaction');
 await page.getByRole('button',{name:'Confirmer la liste et continuer',exact:true}).click();
 await expect(page.locator('#feedback')).toContainText('Ajoutez l’intention saisie');expect((await call('run.get',{run:run.id})).run.status).toBe('active');
 await add().click();await expect.poll(stored).toEqual(['Demande enregistrée','Demande encore en rédaction']);await expect(input()).toHaveValue('');
 await page.getByRole('button',{name:'Confirmer la liste et continuer',exact:true}).click();
 await expect.poll(async()=>(await call('run.get',{run:run.id})).run.status).toBe('completed');
 expect((await call('run.get',{run:run.id})).run.nodes.intentions.result.outputs.intentions.map(i=>i.text)).toEqual(['Demande enregistrée','Demande encore en rédaction']);
});

test('retyping the same text is a new draft while an identical pending submit is deduplicated',async()=>{
 await holdNextAdd();await input().fill('Deux interventions identiques');await add().click();await waitAck();await add().click();
 await input().fill('');await input().fill('Deux interventions identiques');await releaseAck();
 await expect.poll(stored).toEqual(['Deux interventions identiques']);await expect(input()).toHaveValue('Deux interventions identiques');
 await add().click();await expect.poll(stored).toEqual(['Deux interventions identiques','Deux interventions identiques']);await expect(input()).toHaveValue('');
});

test('an addition rejected after a concurrent edit survives the next success, reload and targeted retry',async()=>{
 await holdNextAdd();await input().fill('A enregistré');await add().click();await waitAck();
 await input().fill('B à récupérer');await add().click();await input().fill('C enregistré ensuite');await add().click();
 await call('collection.change',{run:run.id,node:'intentions',revision:1,operation:'add',key:'other-contributor',text:'X autre intervenant'});
 await releaseAck();await expect.poll(stored).toEqual(['A enregistré','X autre intervenant','C enregistré ensuite']);
 await expect(page.locator('.collection-recovery')).toContainText('B à récupérer');await expect(input()).toHaveValue('');
 await page.getByRole('button',{name:'Confirmer la liste et continuer',exact:true}).click();await expect(page.locator('#feedback')).toContainText('Résolvez les ajouts');
 await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${run.id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();
 await expect(page.locator('.collection-recovery')).toContainText('B à récupérer');await page.getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();
 await expect.poll(stored).toEqual(['A enregistré','X autre intervenant','C enregistré ensuite','B à récupérer']);await expect(page.locator('.collection-recovery')).toHaveCount(0);
});

test('a lost acknowledgement is retried with the same command after reload without duplicating the intention',async()=>{
 await app.evaluate(({ipcMain})=>{const original=ipcMain._invokeHandlers.get('studio:request');let lost=false;ipcMain.removeHandler('studio:request');ipcMain.handle('studio:request',async(event,payload)=>{const result=await original(event,payload);if(payload.action==='collection.change'&&payload.operation==='add'&&!lost){lost=true;throw new Error('Accusé perdu synthétique');}return result;});});
 await input().fill('Ajout accepté une seule fois');await add().click();await expect(page.locator('.collection-recovery')).toContainText('Accusé perdu synthétique');await expect.poll(stored).toEqual(['Ajout accepté une seule fois']);
 await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${run.id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();
 await page.getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();await expect(page.locator('.collection-recovery')).toHaveCount(0);expect(await stored()).toEqual(['Ajout accepté une seule fois']);await expect(input()).toHaveValue('');
});

test('a new identical intention after a lost acknowledgement is distinct from retrying the first addition',async()=>{
 await app.evaluate(({ipcMain})=>{const original=ipcMain._invokeHandlers.get('studio:request');let lost=false;ipcMain.removeHandler('studio:request');ipcMain.handle('studio:request',async(event,payload)=>{const result=await original(event,payload);if(payload.action==='collection.change'&&payload.operation==='add'&&!lost){lost=true;throw new Error('Accusé perdu synthétique');}return result;});});
 await input().fill('Deux interventions identiques');await add().click();await expect(page.locator('.collection-recovery')).toContainText('Accusé perdu synthétique');
 await input().fill('');await input().fill('Deux interventions identiques');await add().click();
 await expect(page.locator('.collection-recovery article')).toHaveCount(2);expect(await stored()).toEqual(['Deux interventions identiques']);
 await expect(input()).toHaveValue('Deux interventions identiques');
 await page.locator('.collection-recovery article').filter({hasText:'Le recueil a changé'}).getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();await expect(input()).toHaveValue('');
 await expect.poll(stored).toEqual(['Deux interventions identiques','Deux interventions identiques']);
 await page.getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();await expect(page.locator('.collection-recovery')).toHaveCount(0);expect(await stored()).toEqual(['Deux interventions identiques','Deux interventions identiques']);
});

test('a failed local command shows its diagnostic, opens a root shell and announces immediate retry before confirmation',async()=>{
 const graph=await call('workflow.save',{project:project.id,graph:{id:'control',title:'Contrôle local sans IA',schema:2,nodes:[{id:'check',kind:'command',title:'Vérifier le dossier',argv:['python3','-c','print("FICHIER_ATTENDU_ABSENT"); raise SystemExit(7)'],outputs:{},criteria:[],validation:'human',max_attempts:2,position:{x:60,y:60}}],edges:[]}});
 const executed=await call('run.start',{project:project.id,graph});
 await expect.poll(async()=>(await call('run.get',{run:executed.id})).run.nodes.check.status).toBe('returned');
 await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${executed.id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();
 await expect(page.locator('.failure-summary')).toContainText('FICHIER_ATTENDU_ABSENT');
 await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Ouvrir un terminal',exact:true}).click();
 await expect(page.locator('.xterm-helper-textarea:visible')).toBeVisible();
 const session=(await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.alive);expect(session.workingDirectory).toBe(project.path);
 await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('printf "ROOT_SHELL=%s\\n" "$PWD"');await page.keyboard.press('Enter');await expect(page.locator('.xterm-screen:visible')).toContainText('ROOT_SHELL='+project.path);
 await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Relancer cette étape…',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('relance immédiatement');await expect(page.getByRole('dialog')).toContainText('consomme une tentative');
 expect((await call('run.get',{run:executed.id})).run.nodes.check.attempt).toBe(1);
 await page.getByLabel('Correction attendue',{exact:true}).fill('Vérifier la seconde tentative synthétique.');await page.getByRole('button',{name:'Relancer maintenant',exact:true}).click();
 await expect.poll(async()=>(await call('run.get',{run:executed.id})).run.nodes.check.attempt).toBe(2);
 await expect.poll(async()=>(await call('run.get',{run:executed.id})).run.nodes.check.status).toBe('returned');
 await expect(page.locator('.failure-summary')).toContainText('FICHIER_ATTENDU_ABSENT');
 expect((await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.alive).id).toBe(session.id);
 await page.screenshot({path:test.info().outputPath('commande-echec-diagnostic.png')});
});

test('two project shells remain discoverable after changing project and reloading the window',async()=>{
 await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Ouvrir un terminal',exact:true}).click();await expect(page.locator('.xterm-helper-textarea:visible')).toBeVisible();
 await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('echo FIRST_PROJECT_SESSION');await page.keyboard.press('Enter');await expect(page.locator('.xterm-screen:visible')).toContainText('FIRST_PROJECT_SESSION');
 const first=(await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.alive);
 const second=await call('project.create',{title:'Deuxième client synthétique'});
 await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:second.title}).click();await expect(page.locator('.project-work-page h1')).toHaveText(second.title);
 await page.getByRole('button',{name:'Nouveau terminal',exact:true}).click();
 await expect.poll(async()=>(await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).length).toBe(2);
 const before=(await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>({id:s.id,pid:s.pid})).sort((a,b)=>a.id.localeCompare(b.id));
 await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();
 if(!await page.locator('#terminal-workspace').isVisible())await page.locator('[data-action=terminal-toggle]').click();
 await page.getByRole('button',{name:'Choisir un terminal ouvert',exact:true}).click();
 await page.getByRole('dialog').locator(`[data-session="${first.id}"]`).click();
 await expect(page.locator('.xterm-screen:visible')).toContainText('FIRST_PROJECT_SESSION');
 expect((await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>({id:s.id,pid:s.pid})).sort((a,b)=>a.id.localeCompare(b.id))).toEqual(before);
 await expect(page.getByRole('dialog')).toBeHidden();
});

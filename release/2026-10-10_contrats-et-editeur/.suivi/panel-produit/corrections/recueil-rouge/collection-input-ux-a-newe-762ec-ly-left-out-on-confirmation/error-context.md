# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: collection-input-ux.spec.cjs >> a newer unsent draft survives acknowledgement and reload and cannot be silently left out on confirmation
- Location: tests/collection-input-ux.spec.cjs:46:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByLabel('Nouvelle intention', { exact: true })
Expected: "Demande encore en rédaction"
Received: ""
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" getByLabel('Nouvelle intention', { exact: true }) with timeout 5000ms
  - waiting for getByLabel('Nouvelle intention', { exact: true })
    14 × locator resolved to <textarea name="text" required="" maxlength="12000" id="collection-text"></textarea>
       - unexpected value ""

```

```yaml
- textbox "Nouvelle intention"
```

# Test source

```ts
  1  | const {test,expect,_electron:electron}=require('@playwright/test');
  2  | const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  3  | const {cleanupBroker}=require('./terminal-fixture.cjs');
  4  | const root=path.resolve(__dirname,'..');let app,page,directory,run,project;
  5  | const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
  6  | const input=()=>page.getByLabel('Nouvelle intention',{exact:true});
  7  | const add=()=>page.getByRole('button',{name:'Ajouter à la liste',exact:true});
  8  | const stored=async()=>(await call('run.get',{run:run.id})).run.nodes.intentions.collection.items.map(i=>i.text);
  9  | 
  10 | // Delay acknowledgement, not execution: reproduce typing while an accepted
  11 | // write is in flight. This must not depend on machine speed or a real provider.
  12 | async function holdNextAdd(){await app.evaluate(({ipcMain})=>{
  13 |  const original=ipcMain._invokeHandlers.get('studio:request');let held=false;
  14 |  globalThis.collectionAck={waiting:false,release:null};
  15 |  ipcMain.removeHandler('studio:request');ipcMain.handle('studio:request',async(event,payload)=>{
  16 |   const result=await original(event,payload);
  17 |   if(payload.action==='collection.change'&&payload.operation==='add'&&!held){held=true;globalThis.collectionAck.waiting=true;await new Promise(resolve=>globalThis.collectionAck.release=resolve);}
  18 |   return result;
  19 |  });
  20 | });}
  21 | const waitAck=()=>expect.poll(()=>app.evaluate(()=>globalThis.collectionAck.waiting)).toBe(true);
  22 | const releaseAck=()=>app.evaluate(()=>globalThis.collectionAck.release());
  23 | 
  24 | test.beforeEach(async()=>{
  25 |  directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-collection-input-'));
  26 |  const bin=path.join(directory,'bin');fs.mkdirSync(bin);
  27 |  for(const cli of ['codex','claude'])fs.writeFileSync(path.join(bin,cli),'#!/bin/sh\nexit 78\n',{mode:0o755});
  28 |  app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?[]:[root],env:{PATH:bin+':/usr/bin:/bin',HOME:directory,DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_DATA_HOME:path.join(directory,'data'),XDG_CACHE_HOME:path.join(directory,'cache'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'no-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'}});
  29 |  page=await app.firstWindow();await page.setViewportSize({width:1400,height:950});
  30 |  await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();
  31 |  project=await call('project.create',{title:'Collecte de besoins synthétiques'});
  32 |  const graph=await call('workflow.save',{project:project.id,graph:{id:'collect',title:'Recueillir les besoins',schema:2,nodes:[{id:'intentions',kind:'input',title:'Recueillir les intentions',outputs:{intentions:{type:'array',items:'object',required:true,minItems:1,maxItems:100}},position:{x:60,y:60}}],edges:[]}});
  33 |  run=await call('run.start',{project:project.id,graph,simulation:true});
  34 |  await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${run.id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();
  35 | });
  36 | test.afterEach(async()=>{if(app){await app.evaluate(()=>globalThis.collectionAck?.release?.()).catch(()=>{});await app.close();}for(const socket of ['cockpit/odoo-tricorder/pty.sock','studio-pty.sock','runtime/pty.sock'])await cleanupBroker(path.join(directory,socket));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
  37 | 
  38 | test('a second intention submitted during acknowledgement is recorded once without losing text',async()=>{
  39 |  await holdNextAdd();await input().fill('Première demande');await add().click();await waitAck();
  40 |  await input().fill('Deuxième demande');await add().click();await add().click();
  41 |  await expect(input()).toHaveValue('Deuxième demande');await releaseAck();
  42 |  await expect.poll(stored).toEqual(['Première demande','Deuxième demande']);await expect(input()).toHaveValue('');
  43 |  await expect(page.locator('.collection-items li')).toHaveCount(2);
  44 | });
  45 | 
  46 | test('a newer unsent draft survives acknowledgement and reload and cannot be silently left out on confirmation',async()=>{
  47 |  await holdNextAdd();await input().fill('Demande enregistrée');await add().click();await waitAck();
  48 |  await input().fill('Demande encore en rédaction');await releaseAck();
> 49 |  await expect.poll(stored).toEqual(['Demande enregistrée']);await expect(input()).toHaveValue('Demande encore en rédaction');
     |                                                                                   ^ Error: expect(locator).toHaveValue(expected) failed
  50 |  await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${run.id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();await expect(input()).toHaveValue('Demande encore en rédaction');
  51 |  await page.getByRole('button',{name:'Confirmer la liste et continuer',exact:true}).click();
  52 |  await expect(page.locator('#feedback')).toContainText('Ajoutez l’intention saisie');expect((await call('run.get',{run:run.id})).run.status).toBe('active');
  53 |  await add().click();await expect.poll(stored).toEqual(['Demande enregistrée','Demande encore en rédaction']);await expect(input()).toHaveValue('');
  54 |  await page.getByRole('button',{name:'Confirmer la liste et continuer',exact:true}).click();
  55 |  await expect.poll(async()=>(await call('run.get',{run:run.id})).run.status).toBe('completed');
  56 |  expect((await call('run.get',{run:run.id})).run.nodes.intentions.result.outputs.intentions.map(i=>i.text)).toEqual(['Demande enregistrée','Demande encore en rédaction']);
  57 | });
  58 | 
  59 | test('retyping the same text is a new draft while an identical pending submit is deduplicated',async()=>{
  60 |  await holdNextAdd();await input().fill('Deux interventions identiques');await add().click();await waitAck();await add().click();
  61 |  await input().fill('');await input().fill('Deux interventions identiques');await releaseAck();
  62 |  await expect.poll(stored).toEqual(['Deux interventions identiques']);await expect(input()).toHaveValue('Deux interventions identiques');
  63 |  await add().click();await expect.poll(stored).toEqual(['Deux interventions identiques','Deux interventions identiques']);await expect(input()).toHaveValue('');
  64 | });
  65 | 
  66 | test('a failed local command shows its diagnostic, opens a root shell and announces immediate retry before confirmation',async()=>{
  67 |  const graph=await call('workflow.save',{project:project.id,graph:{id:'control',title:'Contrôle local sans IA',schema:2,nodes:[{id:'check',kind:'command',title:'Vérifier le dossier',argv:['python3','-c','print("FICHIER_ATTENDU_ABSENT"); raise SystemExit(7)'],outputs:{},criteria:[],validation:'human',max_attempts:2,position:{x:60,y:60}}],edges:[]}});
  68 |  const executed=await call('run.start',{project:project.id,graph});
  69 |  await expect.poll(async()=>(await call('run.get',{run:executed.id})).run.nodes.check.status).toBe('returned');
  70 |  await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${executed.id}"]`).click();await page.getByRole('button',{name:'Examiner l’échec',exact:true}).click();
  71 |  await expect(page.locator('.failure-summary')).toContainText('FICHIER_ATTENDU_ABSENT');
  72 |  await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Ouvrir un terminal',exact:true}).click();
  73 |  const session=(await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.alive);expect(session.workingDirectory).toBe(project.path);
  74 |  await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('printf "ROOT_SHELL=%s\\n" "$PWD"');await page.keyboard.press('Enter');await expect(page.locator('.xterm-screen:visible')).toContainText('ROOT_SHELL='+project.path);
  75 |  await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Relancer cette étape…',exact:true}).click();
  76 |  await expect(page.getByRole('dialog')).toContainText('relance immédiatement');await expect(page.getByRole('dialog')).toContainText('consomme une tentative');
  77 |  expect((await call('run.get',{run:executed.id})).run.nodes.check.attempt).toBe(1);
  78 |  await page.getByLabel('Correction attendue',{exact:true}).fill('Vérifier la seconde tentative synthétique.');await page.getByRole('button',{name:'Relancer maintenant',exact:true}).click();
  79 |  await expect.poll(async()=>(await call('run.get',{run:executed.id})).run.nodes.check.attempt).toBe(2);
  80 |  await expect.poll(async()=>(await call('run.get',{run:executed.id})).run.nodes.check.status).toBe('returned');
  81 |  await expect(page.locator('.failure-summary')).toContainText('FICHIER_ATTENDU_ABSENT');
  82 |  expect((await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.alive).id).toBe(session.id);
  83 |  await page.screenshot({path:test.info().outputPath('commande-echec-diagnostic.png')});
  84 | });
  85 | 
```
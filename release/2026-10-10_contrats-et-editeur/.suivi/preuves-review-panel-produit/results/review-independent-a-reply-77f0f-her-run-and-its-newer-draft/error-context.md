# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: review.spec.cjs >> independent: a reply for one run preserves another run and its newer draft
- Location: ../../../tmp/tricorder-review-panel-produit/review.spec.cjs:53:1

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('.project-card').filter({ hasText: 'Collecte de besoins synthétiques' })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - complementary "Tricorder" [ref=e3]:
    - navigation "Navigation principale" [ref=e9]:
      - button "Activité" [ref=e10] [cursor=pointer]
      - button "Workflows" [ref=e17] [cursor=pointer]
      - button "Projets" [active] [ref=e24] [cursor=pointer]
    - generic [ref=e28]: Accès rapide aux projets
    - generic [ref=e29]:
      - generic [ref=e30]: Rechercher un projet
      - searchbox "Rechercher un projet" [ref=e31]
    - button "Collecte de besoins synthétiques" [ref=e33] [cursor=pointer]
    - generic [ref=e35]:
      - navigation "Configuration" [ref=e36]:
        - button "Planifications" [ref=e37] [cursor=pointer]
        - button "Connexions" [ref=e41] [cursor=pointer]
      - button "Paramètres" [ref=e48] [cursor=pointer]
      - group [ref=e52]:
        - generic "Outils et aide" [ref=e53] [cursor=pointer]
  - main [ref=e54]:
    - generic [ref=e55]:
      - generic [ref=e56]: Collecte de besoins synthétiques
      - generic [ref=e58]:
        - button "Terminal" [ref=e59] [cursor=pointer]
        - generic [ref=e63]:
          - text: IA des prochains lancements
          - combobox "Fournisseur IA" [ref=e64]:
            - option "OpenAI · Codex" [selected]
            - option "Anthropic · Claude"
        - group "Thème de l’interface" [ref=e65]:
          - button "Thème clair" [ref=e66] [cursor=pointer]
          - button "Thème sombre" [ref=e70] [cursor=pointer]
          - button "Thème système" [pressed] [ref=e73] [cursor=pointer]
        - status [ref=e77]: À jour · 12:27
        - button "Actualiser · À jour · 12:27" [ref=e78] [cursor=pointer]
    - main [ref=e86]:
      - generic [ref=e87]:
        - generic [ref=e88]:
          - generic [ref=e89]:
            - generic [ref=e90]: Suivi · Recueillir les besoins
            - heading "Recueillir les besoins" [level=1] [ref=e91]
          - group [ref=e93]:
            - generic "Options" [ref=e94] [cursor=pointer]
        - tablist "Vues du workflow"
        - region "État et prochaine action" [ref=e95]:
          - generic [ref=e97]:
            - strong [ref=e98]: Recueil ouvert
            - generic [ref=e99]: 0 / 1 étapes
          - paragraph [ref=e100]: "Recueil ouvert : ajoutez vos contributions puis confirmez la liste."
        - generic [ref=e101]:
          - strong [ref=e102]: Simulation.
          - text: Aucun modèle ni service métier appelé.
        - group "Affichage du suivi" [ref=e104]:
          - button "Graphe" [ref=e105] [cursor=pointer]
          - button "Détail" [pressed] [ref=e106] [cursor=pointer]
        - complementary "Inspecteur du bloc" [ref=e108]:
          - navigation "Position dans le workflow" [ref=e109]:
            - generic "Étape sélectionnée" [ref=e111]:
              - button "Étape sélectionnée Recueillir les intentions" [ref=e112] [cursor=pointer]:
                - generic [ref=e113]: Étape sélectionnée
                - strong [ref=e114]: Recueillir les intentions
          - generic [ref=e115]:
            - paragraph [ref=e116]: Ajoutez vos intentions ici ou depuis le terminal. Vous pouvez les corriger avant de confirmer la liste.
            - list [ref=e117]:
              - listitem [ref=e118]:
                - paragraph [ref=e119]: A à enregistrer dans le premier run
                - generic [ref=e120]:
                  - button "Modifier" [ref=e121] [cursor=pointer]
                  - button "Retirer" [ref=e122] [cursor=pointer]
            - generic [ref=e123]:
              - generic [ref=e124]: Nouvelle intention
              - textbox "Nouvelle intention" [ref=e125]
              - button "Ajouter à la liste" [ref=e126] [cursor=pointer]
            - paragraph [ref=e127]: "Sortie : intentions · une liste de 1 élément."
            - button "Confirmer la liste et continuer" [ref=e128] [cursor=pointer]
            - generic [ref=e129]: La confirmation transmet cette liste. Le plan sera validé séparément.
```

# Test source

```ts
  1  | const {test,expect,_electron:electron}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
  2  | const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  3  | const {cleanupBroker}=require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
  4  | const root='/home/blegoff/odoo-tricorder';let app,page,directory,run,project;
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
  38 | 
  39 | test('independent: a rejected queued intention remains recoverable when a later intention succeeds',async()=>{
  40 |  await holdNextAdd();await input().fill('A enregistré');await add().click();await waitAck();
  41 |  await input().fill('B envoyé avant contribution concurrente');await add().click();
  42 |  await input().fill('C envoyé ensuite');await add().click();
  43 |  const prior=(await call('run.get',{run:run.id})).run;
  44 |  await call('collection.change',{run:run.id,node:'intentions',operation:'add',revision:prior.nodes.intentions.collection.revision,key:'other-agent',text:'X contribution d’un autre collaborateur'});
  45 |  await releaseAck();
  46 |  await expect.poll(stored).toContain('C envoyé ensuite');
  47 |  const saved=await stored(),draft=await input().inputValue(),feedback=await page.locator('#feedback').innerText();
  48 |  fs.writeFileSync(test.info().outputPath('queued-conflict.json'),JSON.stringify({saved,draft,feedback},null,2));
  49 |  await page.screenshot({path:test.info().outputPath('queued-conflict.png')});
  50 |  expect(saved.includes('B envoyé avant contribution concurrente') || draft.includes('B envoyé avant contribution concurrente')).toBe(true);
  51 | });
  52 | 
  53 | test('independent: a reply for one run preserves another run and its newer draft',async()=>{
  54 |  const first=run;
  55 |  await holdNextAdd();await input().fill('A à enregistrer dans le premier run');await add().click();await waitAck();
  56 |  const graph=await call('workflow.get',{project:project.id,workflow:'collect'});
  57 |  const second=await call('run.start',{project:project.id,graph,simulation:true});
> 58 |  await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${second.id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();
     |                                                                                                                                   ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  59 |  await input().fill('B encore en rédaction dans le second run');await releaseAck();
  60 |  await expect.poll(async()=>(await call('run.get',{run:first.id})).run.nodes.intentions.collection.items.map(i=>i.text)).toEqual(['A à enregistrer dans le premier run']);
  61 |  await expect(input()).toHaveValue('B encore en rédaction dans le second run');
  62 |  await add().click();await expect.poll(async()=>(await call('run.get',{run:second.id})).run.nodes.intentions.collection.items.map(i=>i.text)).toEqual(['B encore en rédaction dans le second run']);
  63 |  expect((await call('run.get',{run:first.id})).run.nodes.intentions.collection.items.map(i=>i.text)).toEqual(['A à enregistrer dans le premier run']);
  64 | });
  65 | 
```
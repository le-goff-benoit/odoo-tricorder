# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: review.spec.cjs >> independent: deliberately retyped identical intent after an unknown acknowledgement is not conflated
- Location: ../../../tmp/tricorder-review-panel-produit/review.spec.cjs:93:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 0

  Array [
    "Intention identique mais délibérément répétée",
-   "Intention identique mais délibérément répétée",
  ]
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - complementary "Tricorder" [ref=e3]:
    - navigation "Navigation principale" [ref=e9]:
      - button "Activité" [ref=e10] [cursor=pointer]
      - button "Workflows" [ref=e17] [cursor=pointer]
      - button "Projets" [ref=e24] [cursor=pointer]
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
        - status [ref=e77]: À jour
        - button "Actualiser · À jour" [ref=e78] [cursor=pointer]
    - main [ref=e86]:
      - alert [ref=e88]: Accusé de réception perdu indépendant
      - generic [ref=e89]:
        - generic [ref=e90]:
          - generic [ref=e91]:
            - generic [ref=e92]: Suivi · Recueillir les besoins
            - heading "Recueillir les besoins" [level=1] [ref=e93]
          - group [ref=e95]:
            - generic "Options" [ref=e96] [cursor=pointer]
        - tablist "Vues du workflow"
        - region "État et prochaine action" [ref=e97]:
          - generic [ref=e99]:
            - strong [ref=e100]: Recueil ouvert
            - generic [ref=e101]: 0 / 1 étapes
          - paragraph [ref=e102]: "Recueil ouvert : ajoutez vos contributions puis confirmez la liste."
        - generic [ref=e103]:
          - strong [ref=e104]: Simulation.
          - text: Aucun modèle ni service métier appelé.
        - group "Affichage du suivi" [ref=e106]:
          - button "Graphe" [ref=e107] [cursor=pointer]
          - button "Détail" [pressed] [ref=e108] [cursor=pointer]
        - complementary "Inspecteur du bloc" [ref=e110]:
          - navigation "Position dans le workflow" [ref=e111]:
            - generic "Étape sélectionnée" [ref=e113]:
              - button "Étape sélectionnée Recueillir les intentions" [ref=e114] [cursor=pointer]:
                - generic [ref=e115]: Étape sélectionnée
                - strong [ref=e116]: Recueillir les intentions
          - generic [ref=e117]:
            - heading "Ajouts à récupérer" [level=3] [ref=e118]
            - paragraph [ref=e119]: Ces textes n’ont pas de confirmation d’enregistrement. Vérifiez la liste, puis réessayez l’ajout ou retirez-le de cette liste de récupération.
            - article [ref=e120]:
              - generic [ref=e121]:
                - heading "Intention conservée" [level=3] [ref=e122]
                - text: Intention identique mais délibérément répétée
              - paragraph [ref=e123]: "Error invoking remote method 'studio:request': Error: Accusé de réception perdu indépendant"
              - generic [ref=e124]:
                - button "Réessayer cet ajout" [ref=e125] [cursor=pointer]
                - button "Retirer de la récupération" [ref=e126] [cursor=pointer]
          - generic [ref=e127]:
            - paragraph [ref=e128]: Ajoutez vos intentions ici ou depuis le terminal. Vous pouvez les corriger avant de confirmer la liste.
            - list [ref=e129]:
              - listitem [ref=e130]:
                - paragraph [ref=e131]: Intention identique mais délibérément répétée
                - generic [ref=e132]:
                  - button "Modifier" [ref=e133] [cursor=pointer]
                  - button "Retirer" [ref=e134] [cursor=pointer]
            - generic [ref=e135]:
              - generic [ref=e136]: Nouvelle intention
              - textbox "Nouvelle intention" [ref=e137]
              - button "Ajouter à la liste" [ref=e138] [cursor=pointer]
            - paragraph [ref=e139]: "Sortie : intentions · une liste de 1 élément."
            - button "Confirmer la liste et continuer" [ref=e140] [cursor=pointer]
            - generic [ref=e141]: La confirmation transmet cette liste. Le plan sera validé séparément.
```

# Test source

```ts
  1   | const {test,expect,_electron:electron}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
  2   | const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  3   | const {cleanupBroker}=require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
  4   | const root='/home/blegoff/odoo-tricorder';let app,page,directory,run,project;
  5   | const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
  6   | const input=()=>page.getByLabel('Nouvelle intention',{exact:true});
  7   | const add=()=>page.getByRole('button',{name:'Ajouter à la liste',exact:true});
  8   | const stored=async()=>(await call('run.get',{run:run.id})).run.nodes.intentions.collection.items.map(i=>i.text);
  9   | 
  10  | // Delay acknowledgement, not execution: reproduce typing while an accepted
  11  | // write is in flight. This must not depend on machine speed or a real provider.
  12  | async function holdNextAdd(){await app.evaluate(({ipcMain})=>{
  13  |  const original=ipcMain._invokeHandlers.get('studio:request');let held=false;
  14  |  globalThis.collectionAck={waiting:false,release:null};
  15  |  ipcMain.removeHandler('studio:request');ipcMain.handle('studio:request',async(event,payload)=>{
  16  |   const result=await original(event,payload);
  17  |   if(payload.action==='collection.change'&&payload.operation==='add'&&!held){held=true;globalThis.collectionAck.waiting=true;await new Promise(resolve=>globalThis.collectionAck.release=resolve);}
  18  |   return result;
  19  |  });
  20  | });}
  21  | const waitAck=()=>expect.poll(()=>app.evaluate(()=>globalThis.collectionAck.waiting)).toBe(true);
  22  | const releaseAck=()=>app.evaluate(()=>globalThis.collectionAck.release());
  23  | 
  24  | test.beforeEach(async()=>{
  25  |  directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-collection-input-'));
  26  |  const bin=path.join(directory,'bin');fs.mkdirSync(bin);
  27  |  for(const cli of ['codex','claude'])fs.writeFileSync(path.join(bin,cli),'#!/bin/sh\nexit 78\n',{mode:0o755});
  28  |  app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?[]:[root],env:{PATH:bin+':/usr/bin:/bin',HOME:directory,DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_DATA_HOME:path.join(directory,'data'),XDG_CACHE_HOME:path.join(directory,'cache'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'no-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'}});
  29  |  page=await app.firstWindow();await page.setViewportSize({width:1400,height:950});
  30  |  await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();
  31  |  project=await call('project.create',{title:'Collecte de besoins synthétiques'});
  32  |  const graph=await call('workflow.save',{project:project.id,graph:{id:'collect',title:'Recueillir les besoins',schema:2,nodes:[{id:'intentions',kind:'input',title:'Recueillir les intentions',outputs:{intentions:{type:'array',items:'object',required:true,minItems:1,maxItems:100}},position:{x:60,y:60}}],edges:[]}});
  33  |  run=await call('run.start',{project:project.id,graph,simulation:true});
  34  |  await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${run.id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();
  35  | });
  36  | test.afterEach(async()=>{if(app){await app.evaluate(()=>globalThis.collectionAck?.release?.()).catch(()=>{});await app.close();}for(const socket of ['cockpit/odoo-tricorder/pty.sock','studio-pty.sock','runtime/pty.sock'])await cleanupBroker(path.join(directory,socket));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
  37  | 
  38  | 
  39  | 
  40  | async function openRun(id){await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();}
  41  | async function loseNextAdd(){await app.evaluate(({ipcMain})=>{
  42  |  const original=ipcMain._invokeHandlers.get('studio:request');let lost=false;globalThis.recordedAdds=[];
  43  |  ipcMain.removeHandler('studio:request');ipcMain.handle('studio:request',async(event,payload)=>{
  44  |   if(payload.action==='collection.change'&&payload.operation==='add')globalThis.recordedAdds.push(payload);
  45  |   const result=await original(event,payload);
  46  |   if(payload.action==='collection.change'&&payload.operation==='add'&&!lost){lost=true;throw new Error('Accusé de réception perdu indépendant');}return result;
  47  |  });
  48  | });}
  49  | 
  50  | test('independent: concurrent rejected B survives C, reload, then targeted retry',async()=>{
  51  |  await holdNextAdd();await input().fill('A enregistré');await add().click();await waitAck();
  52  |  await input().fill('B envoyé avant contribution concurrente');await add().click();
  53  |  await input().fill('C envoyé ensuite');await add().click();
  54  |  const prior=(await call('run.get',{run:run.id})).run;
  55  |  await call('collection.change',{run:run.id,node:'intentions',operation:'add',revision:prior.nodes.intentions.collection.revision,key:'other-agent',text:'X contribution d’un autre collaborateur'});
  56  |  await releaseAck();await expect.poll(stored).toEqual(['A enregistré','X contribution d’un autre collaborateur','C envoyé ensuite']);
  57  |  await expect(page.locator('.collection-recovery')).toContainText('B envoyé avant contribution concurrente');
  58  |  await page.getByRole('button',{name:'Confirmer la liste et continuer',exact:true}).click();await expect(page.locator('#feedback')).toContainText('Résolvez les ajouts');
  59  |  await page.screenshot({path:test.info().outputPath('conflict-recoverable.png')});
  60  |  await page.reload();await openRun(run.id);
  61  |  await expect(page.locator('.collection-recovery')).toContainText('B envoyé avant contribution concurrente');
  62  |  await page.getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();
  63  |  await expect.poll(stored).toEqual(['A enregistré','X contribution d’un autre collaborateur','C envoyé ensuite','B envoyé avant contribution concurrente']);
  64  |  await expect(page.locator('.collection-recovery')).toHaveCount(0);
  65  |  fs.writeFileSync(test.info().outputPath('recovered.json'),JSON.stringify(await stored(),null,2));
  66  | });
  67  | 
  68  | test('independent: lost acknowledgement retry preserves new draft and exact idempotent command',async()=>{
  69  |  await loseNextAdd();await input().fill('A accepté sans accusé');await add().click();await expect(page.locator('.collection-recovery')).toContainText('Accusé de réception perdu indépendant');
  70  |  await input().fill('B brouillon plus récent');await page.reload();await openRun(run.id);await expect(input()).toHaveValue('B brouillon plus récent');
  71  |  await page.getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();await expect(page.locator('.collection-recovery')).toHaveCount(0);
  72  |  await expect(input()).toHaveValue('B brouillon plus récent');expect(await stored()).toEqual(['A accepté sans accusé']);
  73  |  const calls=await app.evaluate(()=>globalThis.recordedAdds);expect(calls.length).toBe(2);expect(calls[1]).toEqual(calls[0]);
  74  |  await add().click();await expect.poll(stored).toEqual(['A accepté sans accusé','B brouillon plus récent']);
  75  |  fs.writeFileSync(test.info().outputPath('exact-command.json'),JSON.stringify({calls,stored:await stored()},null,2));
  76  | });
  77  | 
  78  | test('independent: old acknowledgement after renderer reload does not touch the other run',async()=>{
  79  |  const first=run;
  80  |  await holdNextAdd();await input().fill('A à enregistrer dans le premier run');await add().click();await waitAck();
  81  |  const graph=await call('workflow.get',{project:project.id,workflow:'collect'});
  82  |  const second=await call('run.start',{project:project.id,graph,simulation:true});
  83  |  await page.reload();await openRun(second.id);await input().fill('B encore en rédaction dans le second run');await releaseAck();
  84  |  await expect.poll(async()=>(await call('run.get',{run:first.id})).run.nodes.intentions.collection.items.map(i=>i.text)).toEqual(['A à enregistrer dans le premier run']);
  85  |  await expect(input()).toHaveValue('B encore en rédaction dans le second run');
  86  |  await add().click();await expect.poll(async()=>(await call('run.get',{run:second.id})).run.nodes.intentions.collection.items.map(i=>i.text)).toEqual(['B encore en rédaction dans le second run']);
  87  |  expect((await call('run.get',{run:first.id})).run.nodes.intentions.collection.items.map(i=>i.text)).toEqual(['A à enregistrer dans le premier run']);
  88  |  await openRun(first.id);await expect(page.locator('.collection-recovery')).toContainText('A à enregistrer dans le premier run');
  89  |  await page.getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();await expect(page.locator('.collection-recovery')).toHaveCount(0);
  90  |  expect((await call('run.get',{run:first.id})).run.nodes.intentions.collection.items.map(i=>i.text)).toEqual(['A à enregistrer dans le premier run']);
  91  | });
  92  | 
  93  | test('independent: deliberately retyped identical intent after an unknown acknowledgement is not conflated',async()=>{
  94  |  await loseNextAdd();await input().fill('Intention identique mais délibérément répétée');await add().click();await expect(page.locator('.collection-recovery')).toContainText('Accusé de réception perdu indépendant');
  95  |  await input().fill('');await input().fill('Intention identique mais délibérément répétée');await add().click();await expect(input()).toHaveValue('');
  96  |  fs.writeFileSync(test.info().outputPath('identical-draft.json'),JSON.stringify({calls:await app.evaluate(()=>globalThis.recordedAdds),stored:await stored()},null,2));
> 97  |  expect(await stored()).toEqual(['Intention identique mais délibérément répétée','Intention identique mais délibérément répétée']);
      |                         ^ Error: expect(received).toEqual(expected) // deep equality
  98  |  await page.getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();await expect(page.locator('.collection-recovery')).toHaveCount(0);
  99  |  expect(await stored()).toHaveLength(2);
  100 | });
  101 | 
```
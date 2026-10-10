# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: collection-input-ux.spec.cjs >> a new identical intention after a lost acknowledgement is distinct from retrying the first addition
- Location: tests/collection-input-ux.spec.cjs:85:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.collection-recovery article')
Expected: 2
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" locator('.collection-recovery article') with timeout 5000ms
  - waiting for locator('.collection-recovery article')
    14 × locator resolved to 1 element
       - unexpected value "1"

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
      - alert [ref=e88]: Accusé perdu synthétique
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
                - text: Deux interventions identiques
              - paragraph [ref=e123]: "Error invoking remote method 'studio:request': Error: Accusé perdu synthétique"
              - generic [ref=e124]:
                - button "Réessayer cet ajout" [ref=e125] [cursor=pointer]
                - button "Retirer de la récupération" [ref=e126] [cursor=pointer]
          - generic [ref=e127]:
            - paragraph [ref=e128]: Ajoutez vos intentions ici ou depuis le terminal. Vous pouvez les corriger avant de confirmer la liste.
            - list [ref=e129]:
              - listitem [ref=e130]:
                - paragraph [ref=e131]: Deux interventions identiques
                - generic [ref=e132]:
                  - button "Modifier" [ref=e133] [cursor=pointer]
                  - button "Retirer" [ref=e134] [cursor=pointer]
              - listitem [ref=e135]:
                - paragraph [ref=e136]: Deux interventions identiques
                - generic [ref=e137]:
                  - button "Modifier" [ref=e138] [cursor=pointer]
                  - button "Retirer" [ref=e139] [cursor=pointer]
            - generic [ref=e140]:
              - generic [ref=e141]: Nouvelle intention
              - textbox "Nouvelle intention" [ref=e142]
              - button "Ajouter à la liste" [ref=e143] [cursor=pointer]
            - paragraph [ref=e144]: "Sortie : intentions · une liste de 2 éléments."
            - button "Confirmer la liste et continuer" [ref=e145] [cursor=pointer]
            - generic [ref=e146]: La confirmation transmet cette liste. Le plan sera validé séparément.
```

# Test source

```ts
  1   | const {test,expect,_electron:electron}=require('@playwright/test');
  2   | const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  3   | const {cleanupBroker}=require('./terminal-fixture.cjs');
  4   | const root=path.resolve(__dirname,'..');let app,page,directory,run,project;
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
  38  | test('a second intention submitted during acknowledgement is recorded once without losing text',async()=>{
  39  |  await holdNextAdd();await input().fill('Première demande');await add().click();await waitAck();
  40  |  await input().fill('Deuxième demande');await add().click();await add().click();
  41  |  await expect(input()).toHaveValue('Deuxième demande');await releaseAck();
  42  |  await expect.poll(stored).toEqual(['Première demande','Deuxième demande']);await expect(input()).toHaveValue('');
  43  |  await expect(page.locator('.collection-items li')).toHaveCount(2);
  44  | });
  45  | 
  46  | test('a newer unsent draft survives acknowledgement and reload and cannot be silently left out on confirmation',async()=>{
  47  |  await holdNextAdd();await input().fill('Demande enregistrée');await add().click();await waitAck();
  48  |  await input().fill('Demande encore en rédaction');await releaseAck();
  49  |  await expect.poll(stored).toEqual(['Demande enregistrée']);await expect(input()).toHaveValue('Demande encore en rédaction');
  50  |  await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${run.id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();await expect(input()).toHaveValue('Demande encore en rédaction');
  51  |  await page.getByRole('button',{name:'Confirmer la liste et continuer',exact:true}).click();
  52  |  await expect(page.locator('#feedback')).toContainText('Ajoutez l’intention saisie');expect((await call('run.get',{run:run.id})).run.status).toBe('active');
  53  |  await add().click();await expect.poll(stored).toEqual(['Demande enregistrée','Demande encore en rédaction']);await expect(input()).toHaveValue('');
  54  |  await page.getByRole('button',{name:'Confirmer la liste et continuer',exact:true}).click();
  55  |  await expect.poll(async()=>(await call('run.get',{run:run.id})).run.status).toBe('completed');
  56  |  expect((await call('run.get',{run:run.id})).run.nodes.intentions.result.outputs.intentions.map(i=>i.text)).toEqual(['Demande enregistrée','Demande encore en rédaction']);
  57  | });
  58  | 
  59  | test('retyping the same text is a new draft while an identical pending submit is deduplicated',async()=>{
  60  |  await holdNextAdd();await input().fill('Deux interventions identiques');await add().click();await waitAck();await add().click();
  61  |  await input().fill('');await input().fill('Deux interventions identiques');await releaseAck();
  62  |  await expect.poll(stored).toEqual(['Deux interventions identiques']);await expect(input()).toHaveValue('Deux interventions identiques');
  63  |  await add().click();await expect.poll(stored).toEqual(['Deux interventions identiques','Deux interventions identiques']);await expect(input()).toHaveValue('');
  64  | });
  65  | 
  66  | test('an addition rejected after a concurrent edit survives the next success, reload and targeted retry',async()=>{
  67  |  await holdNextAdd();await input().fill('A enregistré');await add().click();await waitAck();
  68  |  await input().fill('B à récupérer');await add().click();await input().fill('C enregistré ensuite');await add().click();
  69  |  await call('collection.change',{run:run.id,node:'intentions',revision:1,operation:'add',key:'other-contributor',text:'X autre intervenant'});
  70  |  await releaseAck();await expect.poll(stored).toEqual(['A enregistré','X autre intervenant','C enregistré ensuite']);
  71  |  await expect(page.locator('.collection-recovery')).toContainText('B à récupérer');await expect(input()).toHaveValue('');
  72  |  await page.getByRole('button',{name:'Confirmer la liste et continuer',exact:true}).click();await expect(page.locator('#feedback')).toContainText('Résolvez les ajouts');
  73  |  await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${run.id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();
  74  |  await expect(page.locator('.collection-recovery')).toContainText('B à récupérer');await page.getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();
  75  |  await expect.poll(stored).toEqual(['A enregistré','X autre intervenant','C enregistré ensuite','B à récupérer']);await expect(page.locator('.collection-recovery')).toHaveCount(0);
  76  | });
  77  | 
  78  | test('a lost acknowledgement is retried with the same command after reload without duplicating the intention',async()=>{
  79  |  await app.evaluate(({ipcMain})=>{const original=ipcMain._invokeHandlers.get('studio:request');let lost=false;ipcMain.removeHandler('studio:request');ipcMain.handle('studio:request',async(event,payload)=>{const result=await original(event,payload);if(payload.action==='collection.change'&&payload.operation==='add'&&!lost){lost=true;throw new Error('Accusé perdu synthétique');}return result;});});
  80  |  await input().fill('Ajout accepté une seule fois');await add().click();await expect(page.locator('.collection-recovery')).toContainText('Accusé perdu synthétique');await expect.poll(stored).toEqual(['Ajout accepté une seule fois']);
  81  |  await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${run.id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();
  82  |  await page.getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();await expect(page.locator('.collection-recovery')).toHaveCount(0);expect(await stored()).toEqual(['Ajout accepté une seule fois']);await expect(input()).toHaveValue('');
  83  | });
  84  | 
  85  | test('a new identical intention after a lost acknowledgement is distinct from retrying the first addition',async()=>{
  86  |  await app.evaluate(({ipcMain})=>{const original=ipcMain._invokeHandlers.get('studio:request');let lost=false;ipcMain.removeHandler('studio:request');ipcMain.handle('studio:request',async(event,payload)=>{const result=await original(event,payload);if(payload.action==='collection.change'&&payload.operation==='add'&&!lost){lost=true;throw new Error('Accusé perdu synthétique');}return result;});});
  87  |  await input().fill('Deux interventions identiques');await add().click();await expect(page.locator('.collection-recovery')).toContainText('Accusé perdu synthétique');
  88  |  await input().fill('');await input().fill('Deux interventions identiques');await add().click();
> 89  |  await expect(page.locator('.collection-recovery article')).toHaveCount(2);expect(await stored()).toEqual(['Deux interventions identiques']);
      |                                                             ^ Error: expect(locator).toHaveCount(expected) failed
  90  |  await expect(input()).toHaveValue('Deux interventions identiques');
  91  |  await page.locator('.collection-recovery article').filter({hasText:'Le recueil a changé'}).getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();await expect(input()).toHaveValue('');
  92  |  await expect.poll(stored).toEqual(['Deux interventions identiques','Deux interventions identiques']);
  93  |  await page.getByRole('button',{name:'Réessayer cet ajout',exact:true}).click();await expect(page.locator('.collection-recovery')).toHaveCount(0);expect(await stored()).toEqual(['Deux interventions identiques','Deux interventions identiques']);
  94  | });
  95  | 
  96  | test('a failed local command shows its diagnostic, opens a root shell and announces immediate retry before confirmation',async()=>{
  97  |  const graph=await call('workflow.save',{project:project.id,graph:{id:'control',title:'Contrôle local sans IA',schema:2,nodes:[{id:'check',kind:'command',title:'Vérifier le dossier',argv:['python3','-c','print("FICHIER_ATTENDU_ABSENT"); raise SystemExit(7)'],outputs:{},criteria:[],validation:'human',max_attempts:2,position:{x:60,y:60}}],edges:[]}});
  98  |  const executed=await call('run.start',{project:project.id,graph});
  99  |  await expect.poll(async()=>(await call('run.get',{run:executed.id})).run.nodes.check.status).toBe('returned');
  100 |  await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${executed.id}"]`).click();await page.getByRole('button',{name:'Détail',exact:true}).click();
  101 |  await expect(page.locator('.failure-summary')).toContainText('FICHIER_ATTENDU_ABSENT');
  102 |  await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Ouvrir un terminal',exact:true}).click();
  103 |  await expect(page.locator('.xterm-helper-textarea:visible')).toBeVisible();
  104 |  const session=(await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.alive);expect(session.workingDirectory).toBe(project.path);
  105 |  await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('printf "ROOT_SHELL=%s\\n" "$PWD"');await page.keyboard.press('Enter');await expect(page.locator('.xterm-screen:visible')).toContainText('ROOT_SHELL='+project.path);
  106 |  await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Relancer cette étape…',exact:true}).click();
  107 |  await expect(page.getByRole('dialog')).toContainText('relance immédiatement');await expect(page.getByRole('dialog')).toContainText('consomme une tentative');
  108 |  expect((await call('run.get',{run:executed.id})).run.nodes.check.attempt).toBe(1);
  109 |  await page.getByLabel('Correction attendue',{exact:true}).fill('Vérifier la seconde tentative synthétique.');await page.getByRole('button',{name:'Relancer maintenant',exact:true}).click();
  110 |  await expect.poll(async()=>(await call('run.get',{run:executed.id})).run.nodes.check.attempt).toBe(2);
  111 |  await expect.poll(async()=>(await call('run.get',{run:executed.id})).run.nodes.check.status).toBe('returned');
  112 |  await expect(page.locator('.failure-summary')).toContainText('FICHIER_ATTENDU_ABSENT');
  113 |  expect((await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.alive).id).toBe(session.id);
  114 |  await page.screenshot({path:test.info().outputPath('commande-echec-diagnostic.png')});
  115 | });
  116 | 
  117 | test('two project shells remain discoverable after changing project and reloading the window',async()=>{
  118 |  await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Ouvrir un terminal',exact:true}).click();await expect(page.locator('.xterm-helper-textarea:visible')).toBeVisible();
  119 |  await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('echo FIRST_PROJECT_SESSION');await page.keyboard.press('Enter');await expect(page.locator('.xterm-screen:visible')).toContainText('FIRST_PROJECT_SESSION');
  120 |  const first=(await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.alive);
  121 |  const second=await call('project.create',{title:'Deuxième client synthétique'});
  122 |  await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:second.title}).click();await expect(page.locator('.project-work-page h1')).toHaveText(second.title);
  123 |  await page.getByRole('button',{name:'Nouveau terminal',exact:true}).click();
  124 |  await expect.poll(async()=>(await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).length).toBe(2);
  125 |  const before=(await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>({id:s.id,pid:s.pid})).sort((a,b)=>a.id.localeCompare(b.id));
  126 |  await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();
  127 |  if(!await page.locator('#terminal-workspace').isVisible())await page.locator('[data-action=terminal-toggle]').click();
  128 |  await page.getByRole('button',{name:'Choisir un terminal ouvert',exact:true}).click();
  129 |  await page.getByRole('dialog').locator(`[data-session="${first.id}"]`).click();
  130 |  await expect(page.locator('.xterm-screen:visible')).toContainText('FIRST_PROJECT_SESSION');
  131 |  expect((await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>({id:s.id,pid:s.pid})).sort((a,b)=>a.id.localeCompare(b.id))).toEqual(before);
  132 |  await expect(page.getByRole('dialog')).toBeHidden();
  133 | });
  134 | 
```
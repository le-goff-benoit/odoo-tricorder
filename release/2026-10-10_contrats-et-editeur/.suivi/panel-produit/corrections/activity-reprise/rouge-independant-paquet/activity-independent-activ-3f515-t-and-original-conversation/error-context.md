# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: activity.spec.cjs >> independent activity announces action and stage while preserving draft and original conversation
- Location: ../../../tmp/tricorder-review-activity-resume/activity.spec.cjs:51:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.activity-row').filter({ hasText: 'R1 — Examiner les besoins Azur' })
Expected substring: "Reprendre l’agent"
Received string:    "R1 — Examiner les besoins AzurDemande · Atelier Azur · Analyser une demandeAgent arrêtéPréparer le diagnostic→"
Timeout: 5000ms

Call log:
  - Expect "soft toContainText" locator('.activity-row').filter({ hasText: 'R1 — Examiner les besoins Azur' }) with timeout 5000ms
  - waiting for locator('.activity-row').filter({ hasText: 'R1 — Examiner les besoins Azur' })
    14 × locator resolved to <button class="activity-row" data-id="rfcc8d91003de4021" data-project="p546e2da08b994d5e" data-action="activity-resume-agent">…</button>
       - unexpected value "R1 — Examiner les besoins AzurDemande · Atelier Azur · Analyser une demandeAgent arrêtéPréparer le diagnostic→"

```

```yaml
- button "R1 — Examiner les besoins Azur Demande · Atelier Azur · Analyser une demande Agent arrêté Préparer le diagnostic":
  - strong: R1 — Examiner les besoins Azur
  - text: Demande · Atelier Azur · Analyser une demande
  - strong: Agent arrêté
  - text: Préparer le diagnostic
```

# Test source

```ts
  1  | const {test,expect,_electron:electron}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
  2  | const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  3  | const {execFileSync}=require('node:child_process');
  4  | const {cleanupBroker}=require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
  5  | const root='/home/blegoff/odoo-tricorder';
  6  | let directory,environment,app,page,fixture,marker,backend,state;
  7  | const seed=`
  8  | import sys,json
  9  | sys.path.insert(0,sys.argv[1])
  10 | from workflow_engine import Engine
  11 | from workflow_engine.conversations import Conversations
  12 | from workflow_engine.library import node
  13 | e=Engine(sys.argv[2]);p=e.create_project('Atelier Azur');q=e.create_project('Laboratoire Corail')
  14 | g={'schema':1,'id':'analyse','title':'Analyser une demande','defaults':{'provider':'codex'},'nodes':[node('work','Préparer le diagnostic','agent',validation='contract')],'edges':[]}
  15 | e.save(p['id'],g);c=Conversations(e);v=c.open(p['id'],g,'codex',projects=[q['id']])
  16 | a=c.add(v['id'],'R1 — Examiner les besoins Azur');b=c.add(v['id'],'R2 — Examiner les besoins Corail',project=q['id']);d=c.add(v['id'],'R3 — Consolider après Azur',depends_on=[a['id']])
  17 | print(json.dumps({'project':p,'second':q,'conversation':v['id'],'items':[a,b,d]}))
  18 | `;
  19 | const call=(action,data={})=>page.evaluate(value=>window.studio.request(value),{action,...data});
  20 | const launches=()=>fs.existsSync(marker)?fs.readFileSync(marker,'utf8').trim().split('\n').filter(Boolean).length:0;
  21 | const sessions=()=>page.evaluate(()=>window.tricorder.terminals.list());
  22 | const row=index=>page.locator(`.conversation-demand[data-run="${fixture.items[index].run}"]`);
  23 | async function overview(){await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await expect(page.locator('#conversation-overview')).toBeVisible();}
  24 | async function request(index){await overview();await row(index).locator('.conversation-demand-open').click();await expect(page.locator('.workflow-heading h1')).toContainText(fixture.items[index].request);}
  25 | async function snapshot(info,name){await page.screenshot({path:info.outputPath(name+'.png')});}
  26 | 
  27 | test.beforeEach(async()=>{
  28 |   directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-terminal-resume-ux-'));
  29 |   const bin=path.join(directory,'bin'),home=path.join(directory,'home');fs.mkdirSync(bin);fs.mkdirSync(home);
  30 |   marker=path.join(directory,'launches');state=path.join(directory,'state');
  31 |   for(const provider of ['codex','claude'])fs.writeFileSync(path.join(bin,provider),`#!/usr/bin/python3\nimport sys\nfrom pathlib import Path\nif '--version' in sys.argv:\n print('UX INERT VERSION');sys.exit(0)\nif len(sys.argv)>1 and sys.argv[1] in ['app-server','plugin']:\n sys.exit(78)\np=Path(${JSON.stringify(marker)})\np.write_text((p.read_text() if p.exists() else '')+'launch\\n')\nprint('UX INERT AGENT EXITED')\nsys.exit(78)\n`,{mode:0o755});
  32 |   environment={...process.env,PATH:bin+':/usr/bin:/bin',HOME:home,SHELL:'/bin/bash',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_DATA_HOME:path.join(directory,'data'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:home,TRICORDER_STATE_DIR:state,TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'absent-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
  33 |   for(const key of Object.keys(environment))if(/^(OPENAI|ANTHROPIC|CLAUDE|CODEX).*(KEY|TOKEN|SECRET)$/.test(key))delete environment[key];
  34 |   backend=process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend');
  35 |   fixture=JSON.parse(execFileSync('/usr/bin/python3',['-c',seed,backend,path.join(state,'workflows')],{env:environment,encoding:'utf8'}));
  36 |   app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?[]:[root],env:environment});page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});
  37 |   await page.locator('[data-workflow-route="projects"]').click();await page.locator('.project-card').filter({hasText:'Atelier Azur'}).click();
  38 |   await page.locator(`[data-action="open-conversation"][data-id="${fixture.conversation}"]`).click();
  39 |   await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  40 |   await expect(page.locator('.xterm-screen:visible')).toContainText('UX INERT AGENT EXITED');
  41 |   await expect.poll(async()=>(await sessions())[0]?.idleShell).toBe(true);
  42 |   await expect(page.locator('#conversation-tray')).toContainText('Agent arrêté');
  43 |   await expect.poll(launches).toBe(1);
  44 | });
  45 | test.afterEach(async()=>{if(app){
  46 |  const evidence={launches:launches(),sessions:await sessions(),conversation:await call('conversation.get',{conversation:fixture.conversation}),draftExecuted:fs.existsSync(path.join(fixture.project.path,'must-not-run.txt'))};fs.writeFileSync(test.info().outputPath('evidence.json'),JSON.stringify(evidence,null,2));
  47 |  const png=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));fs.writeFileSync(test.info().outputPath('end-native.png'),Buffer.from(png,'base64'));await app.close();}app=null;await cleanupBroker(path.join(directory,'runtime/pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
  48 | 
  49 | 
  50 | async function capture(name){const png=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));fs.writeFileSync(test.info().outputPath(name+'.png'),Buffer.from(png,'base64'));}
  51 | test('independent activity announces action and stage while preserving draft and original conversation',async()=>{
  52 |  const before=(await sessions()).map(s=>[s.id,s.pid]);const original=await call('conversation.get',{conversation:fixture.conversation});
  53 |  const draft="printf review-draft > ./must-not-run.txt";await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type(draft);
  54 |  await page.locator('[data-workflow-route="overview"]').click();
  55 |  const activity=page.locator('.activity-row').filter({hasText:fixture.items[0].request});
  56 |  await expect(activity).toContainText('Agent arrêté');await expect(activity).toContainText('Préparer le diagnostic');
> 57 |  await expect.soft(activity).toContainText('Reprendre l’agent');await expect(activity).toHaveAttribute('data-action','activity-resume-agent');
     |                              ^ Error: expect(locator).toContainText(expected) failed
  58 |  const dependent=page.locator('.activity-row').filter({hasText:fixture.items[2].request});await expect(dependent).toHaveAttribute('data-action','activity-run');await expect(dependent).not.toContainText('Reprendre l’agent');
  59 |  await capture('activity-before-click');await activity.click();
  60 |  await expect(page.getByRole('dialog')).toContainText('Reprendre l’agent de cette conversation');await expect(page.getByRole('dialog')).toContainText('Elle efface sa ligne de saisie en cours');
  61 |  expect(launches()).toBe(1);expect((await sessions()).map(s=>[s.id,s.pid])).toEqual(before);expect(fs.existsSync(path.join(fixture.project.path,'must-not-run.txt'))).toBe(false);
  62 |  await capture('confirmation');await page.getByRole('button',{name:'Revenir',exact:true}).click();
  63 |  await expect(page.locator('.xterm-screen:visible')).toContainText(draft);expect(launches()).toBe(1);expect(fs.existsSync(path.join(fixture.project.path,'must-not-run.txt'))).toBe(false);await capture('draft-preserved-after-cancel');
  64 |  await page.locator('[data-workflow-route="overview"]').click();await page.locator('.activity-row').filter({hasText:fixture.items[0].request}).click();
  65 |  await page.getByRole('button',{name:'Reprendre dans ce terminal',exact:true}).click();await expect.poll(launches).toBe(2);await expect.poll(async()=>(await sessions())[0]?.idleShell).toBe(true);
  66 |  expect((await sessions()).map(s=>[s.id,s.pid])).toEqual(before);expect(fs.existsSync(path.join(fixture.project.path,'must-not-run.txt'))).toBe(false);
  67 |  expect(await call('conversation.list',{project:fixture.project.id})).toHaveLength(1);const after=await call('conversation.get',{conversation:fixture.conversation});expect(after.items.map(x=>[x.id,x.run,x.request])).toEqual(original.items.map(x=>[x.id,x.run,x.request]));expect(after.item_count).toBe(3);
  68 |  fs.writeFileSync(test.info().outputPath('assertions.json'),JSON.stringify({before,after:(await sessions()).map(s=>[s.id,s.pid]),launches:launches(),item_count:after.item_count,draftExecuted:false},null,2));
  69 | });
  70 | 
```
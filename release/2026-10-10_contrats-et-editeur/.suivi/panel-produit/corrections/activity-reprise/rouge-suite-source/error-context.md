# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: terminal-resume-ux.spec.cjs >> stopped agent is resumed explicitly from overview and activity without duplicate conversation or lost shell draft
- Location: tests/terminal-resume-ux.spec.cjs:47:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.activity-row').filter({ hasText: 'R1 — Examiner les besoins Azur' })
Expected substring: "Reprendre l’agent"
Received string:    "R1 — Examiner les besoins AzurDemande · Atelier Azur · Analyser une demandeAgent arrêtéPréparer le diagnostic→"
Timeout: 5000ms

Call log:
  - Expect "toContainText" locator('.activity-row').filter({ hasText: 'R1 — Examiner les besoins Azur' }) with timeout 5000ms
  - waiting for locator('.activity-row').filter({ hasText: 'R1 — Examiner les besoins Azur' })
    14 × locator resolved to <button class="activity-row" data-id="r7fa5e1b4bf7e485b" data-project="p49d2246e9402422a" data-action="activity-resume-agent">…</button>
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
  1   | const {test,expect,_electron:electron}=require('@playwright/test');
  2   | const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  3   | const {execFileSync}=require('node:child_process');
  4   | const {cleanupBroker}=require('./terminal-fixture.cjs');
  5   | const root=path.resolve(__dirname,'..');
  6   | let directory,environment,app,page,fixture,marker,backend,state;
  7   | const seed=`
  8   | import sys,json
  9   | sys.path.insert(0,sys.argv[1])
  10  | from workflow_engine import Engine
  11  | from workflow_engine.conversations import Conversations
  12  | from workflow_engine.library import node
  13  | e=Engine(sys.argv[2]);p=e.create_project('Atelier Azur');q=e.create_project('Laboratoire Corail')
  14  | g={'schema':1,'id':'analyse','title':'Analyser une demande','defaults':{'provider':'codex'},'nodes':[node('work','Préparer le diagnostic','agent',validation='contract')],'edges':[]}
  15  | e.save(p['id'],g);c=Conversations(e);v=c.open(p['id'],g,'codex',projects=[q['id']])
  16  | a=c.add(v['id'],'R1 — Examiner les besoins Azur');b=c.add(v['id'],'R2 — Examiner les besoins Corail',project=q['id']);d=c.add(v['id'],'R3 — Consolider après Azur',depends_on=[a['id']])
  17  | print(json.dumps({'project':p,'second':q,'conversation':v['id'],'items':[a,b,d]}))
  18  | `;
  19  | const call=(action,data={})=>page.evaluate(value=>window.studio.request(value),{action,...data});
  20  | const launches=()=>fs.existsSync(marker)?fs.readFileSync(marker,'utf8').trim().split('\n').filter(Boolean).length:0;
  21  | const sessions=()=>page.evaluate(()=>window.tricorder.terminals.list());
  22  | const row=index=>page.locator(`.conversation-demand[data-run="${fixture.items[index].run}"]`);
  23  | async function overview(){await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await expect(page.locator('#conversation-overview')).toBeVisible();}
  24  | async function request(index){await overview();await row(index).locator('.conversation-demand-open').click();await expect(page.locator('.workflow-heading h1')).toContainText(fixture.items[index].request);}
  25  | async function snapshot(info,name){await page.screenshot({path:info.outputPath(name+'.png')});}
  26  | 
  27  | test.beforeEach(async()=>{
  28  |   directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-terminal-resume-ux-'));
  29  |   const bin=path.join(directory,'bin'),home=path.join(directory,'home');fs.mkdirSync(bin);fs.mkdirSync(home);
  30  |   marker=path.join(directory,'launches');state=path.join(directory,'state');
  31  |   for(const provider of ['codex','claude'])fs.writeFileSync(path.join(bin,provider),`#!/usr/bin/python3\nimport sys\nfrom pathlib import Path\nif '--version' in sys.argv:\n print('UX INERT VERSION');sys.exit(0)\nif len(sys.argv)>1 and sys.argv[1] in ['app-server','plugin']:\n sys.exit(78)\np=Path(${JSON.stringify(marker)})\np.write_text((p.read_text() if p.exists() else '')+'launch\\n')\nprint('UX INERT AGENT EXITED')\nsys.exit(78)\n`,{mode:0o755});
  32  |   environment={...process.env,PATH:bin+':/usr/bin:/bin',HOME:home,SHELL:'/bin/bash',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_DATA_HOME:path.join(directory,'data'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:home,TRICORDER_STATE_DIR:state,TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'absent-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
  33  |   for(const key of Object.keys(environment))if(/^(OPENAI|ANTHROPIC|CLAUDE|CODEX).*(KEY|TOKEN|SECRET)$/.test(key))delete environment[key];
  34  |   backend=process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend');
  35  |   fixture=JSON.parse(execFileSync('/usr/bin/python3',['-c',seed,backend,path.join(state,'workflows')],{env:environment,encoding:'utf8'}));
  36  |   app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?[]:[root],env:environment});page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});
  37  |   await page.locator('[data-workflow-route="projects"]').click();await page.locator('.project-card').filter({hasText:'Atelier Azur'}).click();
  38  |   await page.locator(`[data-action="open-conversation"][data-id="${fixture.conversation}"]`).click();
  39  |   await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  40  |   await expect(page.locator('.xterm-screen:visible')).toContainText('UX INERT AGENT EXITED');
  41  |   await expect.poll(async()=>(await sessions())[0]?.idleShell).toBe(true);
  42  |   await expect(page.locator('#conversation-tray')).toContainText('Agent arrêté');
  43  |   await expect.poll(launches).toBe(1);
  44  | });
  45  | test.afterEach(async()=>{if(app)await app.close();app=null;await cleanupBroker(path.join(directory,'runtime/pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
  46  | 
  47  | test('stopped agent is resumed explicitly from overview and activity without duplicate conversation or lost shell draft',async({},info)=>{
  48  |   await overview();await expect(row(0)).toContainText('Agent arrêté');
  49  |   await expect(row(0)).not.toContainText('Continuer dans le terminal');
  50  |   await expect(row(0).locator('.conversation-demand-action')).toContainText('Reprendre l’agent');
  51  |   await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('echo UX_DRAFT_TO_KEEP');
  52  |   await row(0).locator('.conversation-demand-action').click();
  53  |   await expect(page.getByRole('dialog')).toContainText('Elle efface sa ligne de saisie en cours');
  54  |   await page.getByRole('dialog').getByRole('button',{name:'Revenir',exact:true}).click();
  55  |   await expect(page.locator('.xterm-screen:visible')).toContainText('echo UX_DRAFT_TO_KEEP');
  56  |   expect(launches()).toBe(1);
  57  |   await page.locator('[data-workflow-route="overview"]').click();
  58  |   const activity=page.locator('.activity-row').filter({hasText:fixture.items[0].request});
> 59  |   await expect(activity).toContainText('Agent arrêté');await expect(activity).toContainText('Reprendre l’agent');
      |                                                                               ^ Error: expect(locator).toContainText(expected) failed
  60  |   await snapshot(info,'activity-agent-stopped');
  61  |   await activity.click();await expect(page.getByRole('dialog')).toBeVisible();
  62  |   const before=(await sessions()).map(s=>[s.id,s.pid]);
  63  |   await page.getByRole('dialog').getByRole('button',{name:'Reprendre dans ce terminal',exact:true}).click();
  64  |   await expect.poll(launches).toBe(2);
  65  |   await expect.poll(async()=>(await sessions())[0]?.idleShell).toBe(true);
  66  |   await expect(page.locator('#conversation-tray')).toContainText('Agent arrêté');
  67  |   expect((await sessions()).map(s=>[s.id,s.pid])).toEqual(before);
  68  |   expect(await call('conversation.list',{project:fixture.project.id})).toHaveLength(1);
  69  |   expect((await call('conversation.get',{conversation:fixture.conversation})).item_count).toBe(3);
  70  |   await snapshot(info,'same-terminal-after-explicit-resume');
  71  | });
  72  | 
  73  | test('cross-project context names both shell project and displayed request project',async({},info)=>{
  74  |   const before=(await sessions()).map(s=>[s.id,s.pid]);
  75  |   await request(1);
  76  |   await page.setViewportSize({width:1280,height:900});
  77  |   await expect(page.locator('#project-title')).toHaveText('Laboratoire Corail');
  78  |   await expect(page.locator('#terminal-context')).toContainText('Shell : Atelier Azur');
  79  |   await expect(page.locator('#terminal-context')).toContainText('Demande affichée : Laboratoire Corail');
  80  |   await expect(page.locator('#terminal-context')).not.toContainText(fixture.project.id);
  81  |   expect(await page.locator('#terminal-context .terminal-scope').evaluate(el=>{
  82  |     const end=el.textContent.indexOf('Laboratoire Corail')+'Laboratoire Corail'.length;
  83  |     const range=document.createRange();range.setStart(el.firstChild,0);range.setEnd(el.firstChild,end);
  84  |     return range.getBoundingClientRect().right<=el.getBoundingClientRect().right;
  85  |   })).toBe(true);
  86  |   await expect(page.locator('.node[data-id="work"] .pill')).toHaveText('Dans la conversation');
  87  |   expect((await sessions()).map(s=>[s.id,s.pid])).toEqual(before);
  88  |   expect(launches()).toBe(1);
  89  |   await snapshot(info,'cross-project-named-context');
  90  | });
  91  | 
  92  | test('resuming an agent keeps manual suspension and dependency waits until explicit request resume',async({},info)=>{
  93  |   await request(0);await page.locator('.execution-menu > summary').click();
  94  |   await page.locator('[data-action="pause"]').click();
  95  |   await expect(page.locator('#execution-overview')).toContainText('Suspendue');
  96  |   await expect(page.locator('#execution-overview [data-action="resume-request"]')).toBeVisible();
  97  |   await page.locator('#conversation-tray [data-action="resume-agent"]').click();
  98  |   await expect(page.getByRole('dialog')).toContainText('Cette demande restera suspendue');
  99  |   await page.getByRole('dialog').getByRole('button',{name:'Reprendre dans ce terminal',exact:true}).click();
  100 |   await expect.poll(launches).toBe(2);
  101 |   await expect.poll(async()=>(await sessions())[0]?.idleShell).toBe(true);
  102 |   await expect(page.locator('#conversation-tray')).toContainText('Agent arrêté');
  103 |   expect((await call('run.get',{run:fixture.items[0].run})).run.status).toBe('paused');
  104 |   await snapshot(info,'manual-suspension-next-action');
  105 |   await page.locator('#execution-overview [data-action="resume-request"]').click();
  106 |   await expect.poll(async()=>(await call('run.get',{run:fixture.items[0].run})).run.status).toBe('active');
  107 |   const details=await call('run.get',{run:fixture.items[0].run});expect(details.events.filter(e=>e.type==='resume')).toHaveLength(1);
  108 |   await request(2);await page.getByRole('button',{name:'Voir les dépendances',exact:true}).click();
  109 |   await expect(page.locator('#inspector')).toContainText('En attente d’autres demandes');
  110 |   await expect(page.locator('#inspector .dependency-list')).not.toContainText('Suspendue');
  111 |   await expect(page.locator('[data-action="resume-request"]:visible')).toHaveCount(0);
  112 |   const dependent=(await call('run.get',{run:fixture.items[2].run})).run;expect(dependent.coordination_wait).toBe(true);expect(dependent.coordination_hold).not.toBe(true);
  113 |   expect(launches()).toBe(2);
  114 |   await snapshot(info,'automatic-dependency-without-resume');
  115 | });
  116 | 
  117 | test('completed request offers its result without instructing the user to resume the stopped agent',async({},info)=>{
  118 |   // A recorded synthetic result qualifies UI presentation, not a model's work.
  119 |   execFileSync('/usr/bin/python3',['-c',"import sys;sys.path.insert(0,sys.argv[1]);from workflow_engine import Engine;e=Engine(sys.argv[2]);r=sys.argv[3];t=e.claim(r,'work',executor='native')['token'];e.submit(r,'work',t,{'ok':True,'summary':'Diagnostic synthétique terminé.','outputs':{}})",backend,path.join(state,'workflows'),fixture.items[0].run],{env:environment});
  120 |   await request(0);
  121 |   await expect(page.locator('#execution-overview')).toContainText('Terminée');
  122 |   await expect(page.locator('#conversation-tray .conversation-summary')).not.toContainText('Agent arrêté');
  123 |   await expect(page.locator('.work-items button[aria-pressed="true"]')).toContainText('Terminée');
  124 |   await expect(page.locator('#conversation-tray')).toContainText('1 terminée');
  125 |   await expect(page.locator('#conversation-tray [data-action="resume-agent"]')).toHaveCount(0);
  126 |   await expect(page.locator('#conversation-tray')).toContainText('Voir le terminal');
  127 |   expect(launches()).toBe(1);
  128 |   await snapshot(info,'completed-without-agent-restart');
  129 | });
  130 | 
```
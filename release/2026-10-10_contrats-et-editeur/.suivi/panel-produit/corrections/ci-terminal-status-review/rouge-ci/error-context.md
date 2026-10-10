# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: terminal-resume-ux.spec.cjs >> completed request offers its result without instructing the user to resume the stopped agent
- Location: tests/terminal-resume-ux.spec.cjs:119:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#conversation-tray')
Expected substring: "Agent arrêté"
Received string:    "3 demandes ⌄Demandes du workflow3 demandesRechercherRechercher une demandeRechercherR1 — Examiner les besoins AzurAtelier Azur · À traiter dans la conversationR2 — Examiner les besoins CorailLaboratoire Corail · À traiter dans la conversationR3 — Consolider après AzurAtelier Azur · Attend une autre demandeAjouter une demande…Archiver la conversationAucune étape en cours · 2 demandes à prendre en charge · 1 en attente de dépendancesTerminal"
Timeout: 5000ms

Call log:
  - Expect "toContainText" locator('#conversation-tray') with timeout 5000ms
  - waiting for locator('#conversation-tray')
    14 × locator resolved to <section id="conversation-tray" data-conversation="c81c64c9a02c7485b" class="conversation-tray overview-conversation-header">…</section>
       - unexpected value "3 demandes ⌄Demandes du workflow3 demandesRechercherRechercher une demandeRechercherR1 — Examiner les besoins AzurAtelier Azur · À traiter dans la conversationR2 — Examiner les besoins CorailLaboratoire Corail · À traiter dans la conversationR3 — Consolider après AzurAtelier Azur · Attend une autre demandeAjouter une demande…Archiver la conversationAucune étape en cours · 2 demandes à prendre en charge · 1 en attente de dépendancesTerminal"

```

```yaml
- group: 3 demandes
- button "Retrouver la conversation": Terminal
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
> 42  |   await expect(page.locator('#conversation-tray')).toContainText('Agent arrêté');
      |                                                    ^ Error: expect(locator).toContainText(expected) failed
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
  59  |   await expect(activity).toContainText('Agent arrêté');await expect(activity).toContainText('Reprendre l’agent');
  60  |   await expect(activity).toContainText('Préparer le diagnostic');
  61  |   await expect(activity).toHaveAttribute('data-action','activity-resume-agent');
  62  |   await snapshot(info,'activity-agent-stopped');
  63  |   await activity.click();await expect(page.getByRole('dialog')).toBeVisible();
  64  |   const before=(await sessions()).map(s=>[s.id,s.pid]);
  65  |   await page.getByRole('dialog').getByRole('button',{name:'Reprendre dans ce terminal',exact:true}).click();
  66  |   await expect.poll(launches).toBe(2);
  67  |   await expect.poll(async()=>(await sessions())[0]?.idleShell).toBe(true);
  68  |   await expect(page.locator('#conversation-tray')).toContainText('Agent arrêté');
  69  |   expect((await sessions()).map(s=>[s.id,s.pid])).toEqual(before);
  70  |   expect(await call('conversation.list',{project:fixture.project.id})).toHaveLength(1);
  71  |   expect((await call('conversation.get',{conversation:fixture.conversation})).item_count).toBe(3);
  72  |   await snapshot(info,'same-terminal-after-explicit-resume');
  73  | });
  74  | 
  75  | test('cross-project context names both shell project and displayed request project',async({},info)=>{
  76  |   const before=(await sessions()).map(s=>[s.id,s.pid]);
  77  |   await request(1);
  78  |   await page.setViewportSize({width:1280,height:900});
  79  |   await expect(page.locator('#project-title')).toHaveText('Laboratoire Corail');
  80  |   await expect(page.locator('#terminal-context')).toContainText('Shell : Atelier Azur');
  81  |   await expect(page.locator('#terminal-context')).toContainText('Demande affichée : Laboratoire Corail');
  82  |   await expect(page.locator('#terminal-context')).not.toContainText(fixture.project.id);
  83  |   expect(await page.locator('#terminal-context .terminal-scope').evaluate(el=>{
  84  |     const end=el.textContent.indexOf('Laboratoire Corail')+'Laboratoire Corail'.length;
  85  |     const range=document.createRange();range.setStart(el.firstChild,0);range.setEnd(el.firstChild,end);
  86  |     return range.getBoundingClientRect().right<=el.getBoundingClientRect().right;
  87  |   })).toBe(true);
  88  |   await expect(page.locator('.node[data-id="work"] .pill')).toHaveText('Dans la conversation');
  89  |   expect((await sessions()).map(s=>[s.id,s.pid])).toEqual(before);
  90  |   expect(launches()).toBe(1);
  91  |   await snapshot(info,'cross-project-named-context');
  92  | });
  93  | 
  94  | test('resuming an agent keeps manual suspension and dependency waits until explicit request resume',async({},info)=>{
  95  |   await request(0);await page.locator('.execution-menu > summary').click();
  96  |   await page.locator('[data-action="pause"]').click();
  97  |   await expect(page.locator('#execution-overview')).toContainText('Suspendue');
  98  |   await expect(page.locator('#execution-overview [data-action="resume-request"]')).toBeVisible();
  99  |   await page.locator('#conversation-tray [data-action="resume-agent"]').click();
  100 |   await expect(page.getByRole('dialog')).toContainText('Cette demande restera suspendue');
  101 |   await page.getByRole('dialog').getByRole('button',{name:'Reprendre dans ce terminal',exact:true}).click();
  102 |   await expect.poll(launches).toBe(2);
  103 |   await expect.poll(async()=>(await sessions())[0]?.idleShell).toBe(true);
  104 |   await expect(page.locator('#conversation-tray')).toContainText('Agent arrêté');
  105 |   expect((await call('run.get',{run:fixture.items[0].run})).run.status).toBe('paused');
  106 |   await snapshot(info,'manual-suspension-next-action');
  107 |   await page.locator('#execution-overview [data-action="resume-request"]').click();
  108 |   await expect.poll(async()=>(await call('run.get',{run:fixture.items[0].run})).run.status).toBe('active');
  109 |   const details=await call('run.get',{run:fixture.items[0].run});expect(details.events.filter(e=>e.type==='resume')).toHaveLength(1);
  110 |   await request(2);await page.getByRole('button',{name:'Voir les dépendances',exact:true}).click();
  111 |   await expect(page.locator('#inspector')).toContainText('En attente d’autres demandes');
  112 |   await expect(page.locator('#inspector .dependency-list')).not.toContainText('Suspendue');
  113 |   await expect(page.locator('[data-action="resume-request"]:visible')).toHaveCount(0);
  114 |   const dependent=(await call('run.get',{run:fixture.items[2].run})).run;expect(dependent.coordination_wait).toBe(true);expect(dependent.coordination_hold).not.toBe(true);
  115 |   expect(launches()).toBe(2);
  116 |   await snapshot(info,'automatic-dependency-without-resume');
  117 | });
  118 | 
  119 | test('completed request offers its result without instructing the user to resume the stopped agent',async({},info)=>{
  120 |   // A recorded synthetic result qualifies UI presentation, not a model's work.
  121 |   execFileSync('/usr/bin/python3',['-c',"import sys;sys.path.insert(0,sys.argv[1]);from workflow_engine import Engine;e=Engine(sys.argv[2]);r=sys.argv[3];t=e.claim(r,'work',executor='native')['token'];e.submit(r,'work',t,{'ok':True,'summary':'Diagnostic synthétique terminé.','outputs':{}})",backend,path.join(state,'workflows'),fixture.items[0].run],{env:environment});
  122 |   await request(0);
  123 |   await expect(page.locator('#execution-overview')).toContainText('Terminée');
  124 |   await expect(page.locator('#conversation-tray .conversation-summary')).not.toContainText('Agent arrêté');
  125 |   await expect(page.locator('.work-items button[aria-pressed="true"]')).toContainText('Terminée');
  126 |   await expect(page.locator('#conversation-tray')).toContainText('1 terminée');
  127 |   await expect(page.locator('#conversation-tray [data-action="resume-agent"]')).toHaveCount(0);
  128 |   await expect(page.locator('#conversation-tray')).toContainText('Voir le terminal');
  129 |   expect(launches()).toBe(1);
  130 |   await snapshot(info,'completed-without-agent-restart');
  131 | });
  132 | 
```
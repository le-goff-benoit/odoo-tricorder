const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {cleanupBroker}=require('./terminal-fixture.cjs');
const root=path.resolve(__dirname,'..');
let directory,environment,app,page,fixture,marker,backend,state;
const seed=`
import sys,json
sys.path.insert(0,sys.argv[1])
from workflow_engine import Engine
from workflow_engine.conversations import Conversations
from workflow_engine.library import node
e=Engine(sys.argv[2]);p=e.create_project('Atelier Azur');q=e.create_project('Laboratoire Corail')
g={'schema':1,'id':'analyse','title':'Analyser une demande','defaults':{'provider':'codex'},'nodes':[node('work','Préparer le diagnostic','agent',validation='contract')],'edges':[]}
e.save(p['id'],g);c=Conversations(e);v=c.open(p['id'],g,'codex',projects=[q['id']])
a=c.add(v['id'],'R1 — Examiner les besoins Azur');b=c.add(v['id'],'R2 — Examiner les besoins Corail',project=q['id']);d=c.add(v['id'],'R3 — Consolider après Azur',depends_on=[a['id']])
print(json.dumps({'project':p,'second':q,'conversation':v['id'],'items':[a,b,d]}))
`;
const call=(action,data={})=>page.evaluate(value=>window.studio.request(value),{action,...data});
const launches=()=>fs.existsSync(marker)?fs.readFileSync(marker,'utf8').trim().split('\n').filter(Boolean).length:0;
const sessions=()=>page.evaluate(()=>window.tricorder.terminals.list());
const row=index=>page.locator(`.conversation-demand[data-run="${fixture.items[index].run}"]`);
async function overview(){await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await expect(page.locator('#conversation-overview')).toBeVisible();}
async function request(index){await overview();await row(index).locator('.conversation-demand-open').click();await expect(page.locator('.workflow-heading h1')).toContainText(fixture.items[index].request);}
async function snapshot(info,name){await page.screenshot({path:info.outputPath(name+'.png')});}

test.beforeEach(async()=>{
  directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-terminal-resume-ux-'));
  const bin=path.join(directory,'bin'),home=path.join(directory,'home');fs.mkdirSync(bin);fs.mkdirSync(home);
  marker=path.join(directory,'launches');state=path.join(directory,'state');
  for(const provider of ['codex','claude'])fs.writeFileSync(path.join(bin,provider),`#!/usr/bin/python3\nimport sys\nfrom pathlib import Path\nif '--version' in sys.argv:\n print('UX INERT VERSION');sys.exit(0)\nif len(sys.argv)>1 and sys.argv[1] in ['app-server','plugin']:\n sys.exit(78)\np=Path(${JSON.stringify(marker)})\np.write_text((p.read_text() if p.exists() else '')+'launch\\n')\nprint('UX INERT AGENT EXITED')\nsys.exit(78)\n`,{mode:0o755});
  environment={...process.env,PATH:bin+':/usr/bin:/bin',HOME:home,SHELL:'/bin/bash',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_DATA_HOME:path.join(directory,'data'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:home,TRICORDER_STATE_DIR:state,TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'absent-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
  for(const key of Object.keys(environment))if(/^(OPENAI|ANTHROPIC|CLAUDE|CODEX).*(KEY|TOKEN|SECRET)$/.test(key))delete environment[key];
  backend=process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend');
  fixture=JSON.parse(execFileSync('/usr/bin/python3',['-c',seed,backend,path.join(state,'workflows')],{env:environment,encoding:'utf8'}));
  app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?[]:[root],env:environment});page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});
  await page.locator('[data-workflow-route="projects"]').click();await page.locator('.project-card').filter({hasText:'Atelier Azur'}).click();
  await page.locator(`[data-action="open-conversation"][data-id="${fixture.conversation}"]`).click();
  await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  await expect(page.locator('.xterm-screen:visible')).toContainText('UX INERT AGENT EXITED');
  await expect.poll(async()=>(await sessions())[0]?.idleShell).toBe(true);
  await expect(page.locator('#conversation-tray')).toContainText('Agent arrêté');
  await expect.poll(launches).toBe(1);
});
test.afterEach(async()=>{if(app)await app.close();app=null;await cleanupBroker(path.join(directory,'runtime/pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});

test('stopped agent is resumed explicitly from overview and activity without duplicate conversation or lost shell draft',async({},info)=>{
  await overview();await expect(row(0)).toContainText('Agent arrêté');
  await expect(row(0)).not.toContainText('Continuer dans le terminal');
  await expect(row(0).locator('.conversation-demand-action')).toContainText('Reprendre l’agent');
  await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('echo UX_DRAFT_TO_KEEP');
  await row(0).locator('.conversation-demand-action').click();
  await expect(page.getByRole('dialog')).toContainText('Elle efface sa ligne de saisie en cours');
  await page.getByRole('dialog').getByRole('button',{name:'Revenir',exact:true}).click();
  await expect(page.locator('.xterm-screen:visible')).toContainText('echo UX_DRAFT_TO_KEEP');
  expect(launches()).toBe(1);
  await page.locator('[data-workflow-route="overview"]').click();
  const activity=page.locator('.activity-row').filter({hasText:fixture.items[0].request});
  await expect(activity).toContainText('Agent arrêté');await expect(activity).toContainText('Reprendre l’agent');
  await snapshot(info,'activity-agent-stopped');
  await activity.click();await expect(page.getByRole('dialog')).toBeVisible();
  const before=(await sessions()).map(s=>[s.id,s.pid]);
  await page.getByRole('dialog').getByRole('button',{name:'Reprendre dans ce terminal',exact:true}).click();
  await expect.poll(launches).toBe(2);
  await expect.poll(async()=>(await sessions())[0]?.idleShell).toBe(true);
  await expect(page.locator('#conversation-tray')).toContainText('Agent arrêté');
  expect((await sessions()).map(s=>[s.id,s.pid])).toEqual(before);
  expect(await call('conversation.list',{project:fixture.project.id})).toHaveLength(1);
  expect((await call('conversation.get',{conversation:fixture.conversation})).item_count).toBe(3);
  await snapshot(info,'same-terminal-after-explicit-resume');
});

test('cross-project context names both shell project and displayed request project',async({},info)=>{
  const before=(await sessions()).map(s=>[s.id,s.pid]);
  await request(1);
  await page.setViewportSize({width:1280,height:900});
  await expect(page.locator('#project-title')).toHaveText('Laboratoire Corail');
  await expect(page.locator('#terminal-context')).toContainText('Shell : Atelier Azur');
  await expect(page.locator('#terminal-context')).toContainText('Demande affichée : Laboratoire Corail');
  await expect(page.locator('#terminal-context')).not.toContainText(fixture.project.id);
  expect(await page.locator('#terminal-context .terminal-scope').evaluate(el=>{
    const end=el.textContent.indexOf('Laboratoire Corail')+'Laboratoire Corail'.length;
    const range=document.createRange();range.setStart(el.firstChild,0);range.setEnd(el.firstChild,end);
    return range.getBoundingClientRect().right<=el.getBoundingClientRect().right;
  })).toBe(true);
  await expect(page.locator('.node[data-id="work"] .pill')).toHaveText('Dans la conversation');
  expect((await sessions()).map(s=>[s.id,s.pid])).toEqual(before);
  expect(launches()).toBe(1);
  await snapshot(info,'cross-project-named-context');
});

test('resuming an agent keeps manual suspension and dependency waits until explicit request resume',async({},info)=>{
  await request(0);await page.locator('.execution-menu > summary').click();
  await page.locator('[data-action="pause"]').click();
  await expect(page.locator('#execution-overview')).toContainText('Suspendue');
  await expect(page.locator('#execution-overview [data-action="resume-request"]')).toBeVisible();
  await page.locator('#conversation-tray [data-action="resume-agent"]').click();
  await expect(page.getByRole('dialog')).toContainText('Cette demande restera suspendue');
  await page.getByRole('dialog').getByRole('button',{name:'Reprendre dans ce terminal',exact:true}).click();
  await expect.poll(launches).toBe(2);
  await expect.poll(async()=>(await sessions())[0]?.idleShell).toBe(true);
  await expect(page.locator('#conversation-tray')).toContainText('Agent arrêté');
  expect((await call('run.get',{run:fixture.items[0].run})).run.status).toBe('paused');
  await snapshot(info,'manual-suspension-next-action');
  await page.locator('#execution-overview [data-action="resume-request"]').click();
  await expect.poll(async()=>(await call('run.get',{run:fixture.items[0].run})).run.status).toBe('active');
  const details=await call('run.get',{run:fixture.items[0].run});expect(details.events.filter(e=>e.type==='resume')).toHaveLength(1);
  await request(2);await page.getByRole('button',{name:'Voir les dépendances',exact:true}).click();
  await expect(page.locator('#inspector')).toContainText('En attente d’autres demandes');
  await expect(page.locator('#inspector .dependency-list')).not.toContainText('Suspendue');
  await expect(page.locator('[data-action="resume-request"]:visible')).toHaveCount(0);
  const dependent=(await call('run.get',{run:fixture.items[2].run})).run;expect(dependent.coordination_wait).toBe(true);expect(dependent.coordination_hold).not.toBe(true);
  expect(launches()).toBe(2);
  await snapshot(info,'automatic-dependency-without-resume');
});

test('completed request offers its result without instructing the user to resume the stopped agent',async({},info)=>{
  // A recorded synthetic result qualifies UI presentation, not a model's work.
  execFileSync('/usr/bin/python3',['-c',"import sys;sys.path.insert(0,sys.argv[1]);from workflow_engine import Engine;e=Engine(sys.argv[2]);r=sys.argv[3];t=e.claim(r,'work',executor='native')['token'];e.submit(r,'work',t,{'ok':True,'summary':'Diagnostic synthétique terminé.','outputs':{}})",backend,path.join(state,'workflows'),fixture.items[0].run],{env:environment});
  await request(0);
  await expect(page.locator('#execution-overview')).toContainText('Terminée');
  await expect(page.locator('#conversation-tray .conversation-summary')).not.toContainText('Agent arrêté');
  await expect(page.locator('.work-items button[aria-pressed="true"]')).toContainText('Terminée');
  await expect(page.locator('#conversation-tray')).toContainText('1 terminée');
  await expect(page.locator('#conversation-tray [data-action="resume-agent"]')).toHaveCount(0);
  await expect(page.locator('#conversation-tray')).toContainText('Voir le terminal');
  expect(launches()).toBe(1);
  await snapshot(info,'completed-without-agent-restart');
});

const {test,expect,_electron:electron}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {cleanupBroker}=require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
const root='/home/blegoff/odoo-tricorder';
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
test.afterEach(async()=>{if(app){
 const evidence={launches:launches(),sessions:await sessions(),conversation:await call('conversation.get',{conversation:fixture.conversation}),draftExecuted:fs.existsSync(path.join(fixture.project.path,'must-not-run.txt'))};fs.writeFileSync(test.info().outputPath('evidence.json'),JSON.stringify(evidence,null,2));
 const png=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));fs.writeFileSync(test.info().outputPath('end-native.png'),Buffer.from(png,'base64'));await app.close();}app=null;await cleanupBroker(path.join(directory,'runtime/pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});


async function capture(name){const png=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));fs.writeFileSync(test.info().outputPath(name+'.png'),Buffer.from(png,'base64'));}
test('independent activity announces action and stage while preserving draft and original conversation',async()=>{
 const before=(await sessions()).map(s=>[s.id,s.pid]);const original=await call('conversation.get',{conversation:fixture.conversation});
 const draft="printf review-draft > ./must-not-run.txt";await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type(draft);
 await page.locator('[data-workflow-route="overview"]').click();
 const activity=page.locator('.activity-row').filter({hasText:fixture.items[0].request});
 await expect(activity).toContainText('Agent arrêté');await expect(activity).toContainText('Préparer le diagnostic');
 await expect.soft(activity).toContainText('Reprendre l’agent');await expect(activity).toHaveAttribute('data-action','activity-resume-agent');
 const dependent=page.locator('.activity-row').filter({hasText:fixture.items[2].request});await expect(dependent).toHaveAttribute('data-action','activity-run');await expect(dependent).not.toContainText('Reprendre l’agent');
 await capture('activity-before-click');await activity.click();
 await expect(page.getByRole('dialog')).toContainText('Reprendre l’agent de cette conversation');await expect(page.getByRole('dialog')).toContainText('Elle efface sa ligne de saisie en cours');
 expect(launches()).toBe(1);expect((await sessions()).map(s=>[s.id,s.pid])).toEqual(before);expect(fs.existsSync(path.join(fixture.project.path,'must-not-run.txt'))).toBe(false);
 await capture('confirmation');await page.getByRole('button',{name:'Revenir',exact:true}).click();
 await expect(page.locator('.xterm-screen:visible')).toContainText(draft);expect(launches()).toBe(1);expect(fs.existsSync(path.join(fixture.project.path,'must-not-run.txt'))).toBe(false);await capture('draft-preserved-after-cancel');
 await page.locator('[data-workflow-route="overview"]').click();await page.locator('.activity-row').filter({hasText:fixture.items[0].request}).click();
 await page.getByRole('button',{name:'Reprendre dans ce terminal',exact:true}).click();await expect.poll(launches).toBe(2);await expect.poll(async()=>(await sessions())[0]?.idleShell).toBe(true);
 expect((await sessions()).map(s=>[s.id,s.pid])).toEqual(before);expect(fs.existsSync(path.join(fixture.project.path,'must-not-run.txt'))).toBe(false);
 expect(await call('conversation.list',{project:fixture.project.id})).toHaveLength(1);const after=await call('conversation.get',{conversation:fixture.conversation});expect(after.items.map(x=>[x.id,x.run,x.request])).toEqual(original.items.map(x=>[x.id,x.run,x.request]));expect(after.item_count).toBe(3);
 fs.writeFileSync(test.info().outputPath('assertions.json'),JSON.stringify({before,after:(await sessions()).map(s=>[s.id,s.pid]),launches:launches(),item_count:after.item_count,draftExecuted:false},null,2));
});

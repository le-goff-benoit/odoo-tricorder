const { test, expect, _electron: electron } = require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { cleanupBroker } = require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
const root = '/home/blegoff/odoo-tricorder';
let directory, app, page, fixture, environment, backend;

const seedCode = `
import json,sys
from pathlib import Path
sys.path.insert(0,sys.argv[1])
from workflow_engine import Engine
from workflow_engine.library import node,edge
from workflow_engine.conversations import Conversations
from workflow_engine.runtime import execute
from workflow_engine.contracts import digest
from connectors.local_tools import inspect,qualify
e=Engine(sys.argv[2]);p=e.create_project('Interaction review');scenario=sys.argv[3]
g={'schema':1,'id':'review','title':'Interaction review','nodes':[],'edges':[]}
out={'project':p}
if scenario=='negative':
 g['nodes']=[node('check','Diagnostic métier','agent',model='inert',outputs={'verdict':'string'},route_output='verdict',options=['pass','fail']),node('fix','Traiter le constat négatif'),node('done','Résultat conforme')]
 g['edges']=[edge('check','fix','fail'),edge('check','done','pass')]
 e.save(p['id'],g);r=e.start(p['id'],g,driver='conversation');claim=e.claim(r['id'],'check');r=e.submit(r['id'],'check',claim['token'],{'ok':True,'summary':'Diagnostic effectué : une correction est nécessaire.','outputs':{'verdict':'fail'}});out['run']=r['id']
elif scenario=='effect':
 script=Path(sys.argv[2])/'adapter.py'
 script.write_text(r'''import json,sys
from pathlib import Path
p=json.load(sys.stdin);root=Path(__file__).parent
if p['action']=='describe':print(json.dumps({'protocol':'tricorder.tool/1','connected':True,'identity':'synthetic','operations':{'send':'notify','lookup':'read'}}))
else:
 with (root/'calls.jsonl').open('a') as f:f.write(json.dumps(p)+'\\n')
 if p['operation']=='send':sys.exit(1)
 print(json.dumps({'ok':True,'identity':'synthetic','outputs':{'effect_id':p['arguments']['effect_id'],'status':'sent','receipt':{'id':'synthetic-receipt'},'outputs':{'sent':True}}}))
''')
 plugin={'id':'fixture','title':'Local synthetic adapter','provider':'local','operations':['send','lookup'],'transport':{'argv':[sys.executable,str(script)],'timeout':2}}
 (Path(p['path'])/'.tricorder/plugins.json').write_text(json.dumps({'schema':1,'plugins':[plugin]}))
 preview=inspect(e,p,'fixture');qualify(e,p,'fixture',digest(preview),human=True)
 g['nodes']=[node('send','Notification locale synthétique','communication',recipient='synthetic-channel',template='Synthetic message',reconciliation='lookup',validation='automatic',capabilities=[{'plugin':'fixture','operation':'send'}])]
 e.save(p['id'],g);r=e.start(p['id'],g,driver='conversation',notifications_authorized=True);claim=e.claim(r['id'],'send');execute(e,r['id'],'send',claim['token']);out['run']=r['id']
elif scenario=='poll':
 g['nodes']=[node('work','Travail observé','task',max_attempts=2)]
 e.save(p['id'],g);r=e.start(p['id'],g,driver='conversation');claim=e.claim(r['id'],'work');out.update(run=r['id'],token=claim['token'])
else:
 g['nodes']=[node('question','Préciser le besoin','question',question='Quel résultat souhaitez-vous ?',outputs={'answer':'string'})]
 g['defaults']={'provider':'codex','model':'inert'}
 e.save(p['id'],g);c=Conversations(e);conversation=c.open(p['id'],g,'codex',model='inert');items=[c.add(conversation['id'],'R'+str(i)+' — Demande synthétique',key=str(i)) for i in range(1,3)];out.update(conversation=conversation['id'],run=items[0]['run'])
 second=c.open(p['id'],g,'codex',model='inert');second_item=c.add(second['id'],'Autre conversation indépendante');out.update(second_conversation=second['id'],second_run=second_item['run'])
print(json.dumps(out))
`;

function python(code, ...args) {
  return execFileSync('/usr/bin/python3', ['-c', code, backend, directory, ...args], { env: environment, encoding: 'utf8' });
}
const call = (action, data={}) => page.evaluate(payload => window.studio.request(payload), { action, ...data });
async function openRun(run=fixture.run) {
  await page.locator('[data-workflow-route=projects]').click();
  await page.locator('.project-card').filter({ hasText: fixture.project.title }).click();
  await page.locator(`[data-action=open-run][data-id="${run}"]`).click();
  await expect(page.getByRole('group', { name: 'Affichage du suivi' })).toBeVisible();
}

test.beforeEach(async ({}, info) => {
  app = null; page = null;
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-independent-terminal-fresh-'));
  fs.mkdirSync(path.join(directory, 'bin'));
  fs.writeFileSync(path.join(directory, 'bin/codex'), '#!/bin/sh\nif [ "$1" = --version ]; then printf "INERT REVIEW VERSION\\n"; exit 0; fi\nif [ ! -t 0 ]; then printf "INERT REVIEW CHECK\\n"; exit 0; fi\nprintf "start\\n" >> "$HOME/agent-launches.txt"\nprintf "INERT REVIEW AGENT\\n"\nwhile IFS= read -r line; do [ "$line" = exit ] && break; printf "INPUT:%s\\n" "$line"; done\n', { mode: 0o755 });
  fs.writeFileSync(path.join(directory, 'bin/claude'), '#!/bin/sh\nprintf "INERT REVIEW CLAUDE ONLY\\n"\nexit 78\n', { mode: 0o755 });
  environment = { PATH: path.join(directory,'bin') + ':/usr/bin:/bin', HOME:directory,
    DISPLAY:process.env.DISPLAY, XAUTHORITY:process.env.XAUTHORITY, LANG:'C.UTF-8', PYTHONDONTWRITEBYTECODE:'1',
    CODEX_HOME:path.join(directory,'codex'), CLAUDE_CONFIG_DIR:path.join(directory,'claude'),
    XDG_CONFIG_HOME:path.join(directory,'config'), XDG_CACHE_HOME:path.join(directory,'cache'), XDG_DATA_HOME:path.join(directory,'data'),
    TRICORDER_HOME:directory, TRICORDER_STATE_DIR:directory, TRICORDER_AGENTS_DIR:path.join(directory,'absent-pack'), TRICORDER_TEST_MODE:'1' };
  backend = process.env.TRICORDER_EXECUTABLE ? path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend') : path.join(root,'backend');
  fixture = JSON.parse(python(seedCode, info.title.startsWith('negative') ? 'negative' : info.title.startsWith('uncertain') ? 'effect' : info.title.startsWith('live') ? 'poll' : 'interaction'));
  app = await electron.launch({ executablePath:process.env.TRICORDER_EXECUTABLE,
    args:process.env.TRICORDER_EXECUTABLE ? ['--workflow-studio'] : [root,'--workflow-studio'], env:environment, timeout:20000 });
  page = await app.firstWindow();
  await expect(page.locator('[data-workflow-route=projects]')).toBeVisible();
  await openRun();
});

test.afterEach(async () => {
  if(app&&page&&!page.isClosed()){const evidence={calls:await app.evaluate(()=>globalThis.reviewTerminalCalls||[]),events:await page.evaluate(()=>globalThis.reviewTerminalEvents||[]),sessions:await page.evaluate(()=>window.tricorder.terminals.list()),launches:launchCount()};fs.writeFileSync(test.info().outputPath('evidence.json'),JSON.stringify(evidence,null,2));const png=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));fs.writeFileSync(test.info().outputPath('end-native.png'),Buffer.from(png,'base64'));}

  if (app) { if (page && !page.isClosed()) await page.evaluate(() => window.tricorder.terminals.list()); await app.close(); }
  await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));
  await cleanupBroker(path.join(directory,'studio-pty.sock'));
  fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
});

const list=()=>page.evaluate(()=>window.tricorder.terminals.list());
const launchCount=()=>fs.existsSync(path.join(directory,'agent-launches.txt'))?fs.readFileSync(path.join(directory,'agent-launches.txt'),'utf8').trim().split('\n').length:0;
const input=()=>page.locator('.xterm-helper-textarea:visible');
const identities=sessions=>sessions.filter(s=>s.alive).map(s=>({id:s.id,pid:s.pid})).sort((a,b)=>a.id.localeCompare(b.id));
async function command(text){await input().focus();await page.keyboard.type(text);await page.keyboard.press('Enter');}
async function startFirst(){await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();await expect(page.locator('.xterm-screen:visible')).toContainText('INERT REVIEW AGENT');await expect.poll(launchCount).toBe(1);return(await list())[0];}
test.beforeEach(async()=>{
 await app.evaluate(({ipcMain})=>{globalThis.reviewTerminalCalls=[];const original=ipcMain._invokeHandlers.get('workflow-terminal');ipcMain.removeHandler('workflow-terminal');ipcMain.handle('workflow-terminal',async(event,payload)=>{const record={at:Date.now(),request:payload};reviewTerminalCalls.push(record);try{const r=await original(event,payload);record.result={id:r.id,pid:r.pid,agentState:r.agentState,idleShell:r.idleShell,program:r.program};return r;}catch(e){record.error=String(e);throw e;}});});
 const cdp=await app.context().newCDPSession(page),scripts=[];cdp.on('Debugger.scriptParsed',s=>scripts.push(s));await cdp.send('Debugger.enable');const script=scripts.find(s=>s.url.endsWith('/app.js'));const source=(await cdp.send('Debugger.getScriptSource',{scriptId:script.scriptId})).scriptSource;const line=source.split('\n').findIndex(s=>s.includes('function terminalIdentity(session)'))+1;await cdp.send('Debugger.setBreakpoint',{location:{scriptId:script.scriptId,lineNumber:line},condition:'globalThis.__reviewSessions=()=>sessions,false'});
 await page.evaluate(()=>{globalThis.reviewTerminalEvents=[];document.addEventListener('click',e=>{const button=e.composedPath().find(n=>n.dataset?.action);if(button&&['conversation-terminal','resume-agent','confirm-resume-agent'].includes(button.dataset.action))reviewTerminalEvents.push({at:Date.now(),action:button.dataset.action,cache:(globalThis.__reviewSessions?.()||[]).map(s=>({id:s.id,pid:s.pid,alive:s.alive,idleShell:s.idleShell,program:s.program}))});},true);});
});

test('independent busy foreground command wins over an old stopped-agent cache',async()=>{
 const first=await startFirst();await command('exit');await expect.poll(async()=>(await list()).find(s=>s.id===first.id)?.idleShell).toBe(true);await expect(page.locator('.terminal-tab.active')).toContainText('Shell · Codex arrêté');
 await command('sleep 30');await expect.poll(async()=>(await list()).find(s=>s.id===first.id)?.program).toBe('sleep');
 await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
 await expect(page.locator('.terminal-tab.active')).toContainText('sleep');await expect(page.getByRole('dialog')).toHaveCount(0);
 const events=await page.evaluate(()=>reviewTerminalEvents);expect(events.at(-1).cache.find(s=>s.id===first.id).idleShell).toBe(true);
 const calls=await app.evaluate(()=>reviewTerminalCalls);expect(calls.at(-1).result.agentState).toBe('busy');expect(launchCount()).toBe(1);expect(identities(await list())).toEqual([{id:first.id,pid:first.pid}]);
 await input().focus();await page.keyboard.press('Control+C');await expect.poll(async()=>(await list()).find(s=>s.id===first.id)?.idleShell).toBe(true);
});

test('independent live shell never restarts its stopped agent before explicit confirmation',async()=>{
 const first=await startFirst(),before=await call('conversation.get',{conversation:fixture.conversation});await command('exit');await expect.poll(async()=>(await list()).find(s=>s.id===first.id)?.idleShell).toBe(true);
 await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Reprendre l’agent de cette conversation');expect(launchCount()).toBe(1);expect((await app.evaluate(()=>reviewTerminalCalls)).filter(x=>x.request.resume)).toHaveLength(0);
 await page.getByRole('button',{name:'Revenir',exact:true}).click();expect((await list()).find(s=>s.id===first.id).idleShell).toBe(true);expect(launchCount()).toBe(1);
 const resume=page.getByRole('button',{name:'Reprendre l’agent…',exact:true});if(await resume.count())await resume.first().click();else await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Reprendre l’agent');expect(launchCount()).toBe(1);await page.getByRole('button',{name:'Reprendre dans ce terminal',exact:true}).click();await expect.poll(launchCount).toBe(2);
 expect(identities(await list())).toEqual([{id:first.id,pid:first.pid}]);const after=await call('conversation.get',{conversation:fixture.conversation});expect(after.items.map(i=>[i.id,i.run,i.request])).toEqual(before.items.map(i=>[i.id,i.run,i.request]));
});

test('independent two existing conversations retain their original PTYs while navigating',async()=>{
 const first=await startFirst();await openRun(fixture.second_run);await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();await expect.poll(launchCount).toBe(2);const before=identities(await list());expect(before).toHaveLength(2);
 for(const run of [fixture.run,fixture.second_run,fixture.run]){await openRun(run);await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();await expect(page.locator('.terminal-scope')).toContainText('Conversation du workflow affiché');await expect(page.getByRole('dialog')).toHaveCount(0);expect(identities(await list())).toEqual(before);}
 expect(launchCount()).toBe(2);await expect(page.locator('.terminal-tab.active [data-session]')).toHaveAttribute('data-session',first.id);await command('REVIEW_EXISTING_SESSION');await expect(page.locator('.xterm-screen:visible')).toContainText('INPUT:REVIEW_EXISTING_SESSION');
});

test('independent dead historical PTY requires explicit agreement before an agent is recreated',async()=>{
 const first=await startFirst();await command('exit');await expect.poll(async()=>(await list()).find(s=>s.id===first.id)?.idleShell).toBe(true);await command('exit');await expect.poll(async()=>(await list()).find(s=>s.id===first.id)?.alive||false).toBe(false);
 await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Reprendre');expect(launchCount()).toBe(1);expect(identities(await list())).toHaveLength(0);
});

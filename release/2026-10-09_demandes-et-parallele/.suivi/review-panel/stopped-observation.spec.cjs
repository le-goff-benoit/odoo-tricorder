const { test, expect, _electron: electron } = require('@playwright/test');
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
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-review-stopped-'));
  fs.mkdirSync(path.join(directory, 'bin'));
  fs.writeFileSync(path.join(directory, 'bin/codex'), '#!/bin/sh\nprintf "INERT REVIEW AGENT\\n"\nwhile IFS= read -r line; do [ "$line" = exit ] && break; printf "INPUT:%s\\n" "$line"; done\n', { mode: 0o755 });
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
  if (app) { if (page && !page.isClosed()) await page.evaluate(() => window.tricorder.terminals.list()); await app.close(); }
  await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));
  await cleanupBroker(path.join(directory,'studio-pty.sock'));
  fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
});

test('negative result remains receivable and routes to the corrective branch', async () => {
  await page.getByRole('button', { name:'Détail', exact:true }).click();
  const accept = page.locator('#inspector').getByRole('button', { name:'Valider le résultat', exact:true });
  await expect(accept).toBeEnabled();
  await expect(page.locator('#inspector')).toContainText('Diagnostic effectué');
  await accept.click();
  await expect.poll(async () => (await call('run.get',{run:fixture.run})).run.nodes.fix.status).toBe('ready');
  const { run } = await call('run.get',{run:fixture.run});
  expect(run.nodes.check.status).toBe('accepted');
  expect(run.nodes.check.outcome).toBe('fail');
  expect(run.nodes.done.status).toBe('skipped');
});

test('uncertain local notification retains receipt lookup without sending twice', async () => {
  await page.getByRole('button', { name:'Détail', exact:true }).click();
  await page.getByRole('button', { name:'Rechercher l’accusé distant', exact:true }).click();
  await expect.poll(async () => (await call('run.get',{run:fixture.run})).run.status).toBe('completed');
  const operations = fs.readFileSync(path.join(directory,'calls.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line).operation);
  expect(operations).toEqual(['send','lookup']);
});

test('live failure updates the graph badge and accessible name without reopening the run', async () => {
  const card = page.locator('.node[data-id=work]');
  await expect(card).toHaveAttribute('data-status','running');
  python("import sys;sys.path.insert(0,sys.argv[1]);from workflow_engine import Engine;e=Engine(sys.argv[2]);e.submit(sys.argv[3],'work',sys.argv[4],{'ok':False,'summary':'Synthetic copy failed','outputs':{}})",fixture.run,fixture.token);
  await expect(card).toHaveAttribute('data-status','returned');
  await expect(card).toHaveAttribute('data-failed','true');
  await expect(card).toHaveAttribute('aria-label',/Échec/);
  await expect(card.locator('.pill')).toHaveText('Échec');
});

test('request menu keeps keyboard focus and a question draft while activity changes', async () => {
  const summary = page.locator('.request-selector > summary');
  await summary.click();
  await summary.focus();
  await call('conversation.add',{conversation:fixture.conversation,request:'R3 — Added independently'});
  await expect(summary).toContainText('3 demandes');
  await expect(summary).toBeFocused();
  const add = page.getByRole('button',{name:'Ajouter une demande…',exact:true});
  await add.focus();
  await call('conversation.add',{conversation:fixture.conversation,request:'R4 — Added independently'});
  await expect(summary).toContainText('4 demandes');
  await expect(add).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(summary).toBeFocused();
  await page.getByRole('button',{name:'Détail',exact:true}).click();
  await page.getByLabel('Votre réponse').fill('Ma réponse en cours, à conserver.');
  await call('conversation.add',{conversation:fixture.conversation,request:'R5 — Added independently'});
  await expect(summary).toContainText('5 demandes');
  await expect(page.getByLabel('Votre réponse')).toHaveValue('Ma réponse en cours, à conserver.');
  await expect(page.getByLabel('Votre réponse')).toBeFocused();
});

test('search menu keeps its expanded state and keyboard focus when requests arrive', async () => {
  await page.locator('.request-selector > summary').click();
  const search = page.locator('.conversation-search-details > summary');
  await search.click();
  await expect(search).toBeFocused();
  await call('conversation.add',{conversation:fixture.conversation,request:'R3 — Added during search navigation'});
  await expect(page.locator('.request-selector > summary')).toContainText('3 demandes');
  await expect(search).toBeFocused();
  await expect(page.getByLabel('Rechercher une demande',{exact:true})).toBeVisible();
});

test('search draft survives polling and deferred request counts refresh after leaving the input', async () => {
  // Observe real polling replies: no workflow state or response is substituted.
  await app.evaluate(({ ipcMain }) => {
    const handler = ipcMain._invokeHandlers.get('studio:request');
    globalThis.__interactionSearchReplies = 0;
    ipcMain.removeHandler('studio:request');
    ipcMain.handle('studio:request', async (event,payload) => {
      const value = await handler(event,payload);
      if (payload.action==='conversation.get' && value.item_count===3) globalThis.__interactionSearchReplies++;
      return value;
    });
  });
  const summary = page.locator('.request-selector > summary');
  await summary.click();
  await page.locator('.conversation-search-details > summary').click();
  const query = page.getByLabel('Rechercher une demande',{exact:true});
  await query.fill('R3');
  await call('conversation.add',{conversation:fixture.conversation,request:'R3 — Added while typing'});
  await expect.poll(() => app.evaluate(() => globalThis.__interactionSearchReplies)).toBeGreaterThanOrEqual(2);
  await expect(query).toHaveValue('R3');
  await expect(query).toBeFocused();
  await summary.focus();
  await expect(summary).toContainText('3 demandes');
  await expect(query).toHaveValue('R3');
  await expect(page.locator('.work-items button')).toHaveCount(3);
});

test('terminal identifies another conversation and preserves the same PTY through navigation and agent exit', async () => {
  const terminals = () => page.evaluate(() => window.tricorder.terminals.list());
  expect(await terminals()).toHaveLength(0); // Opening the question does not launch an agent.
  await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  await expect(page.locator('.xterm-screen:visible')).toContainText('INERT REVIEW AGENT');
  const [first] = await terminals();
  await expect(page.locator('.terminal-scope')).toContainText('Conversation du workflow affiché');
  await openRun(fixture.second_run);
  await expect(page.locator('.terminal-scope')).toContainText('Autre conversation');
  expect(await terminals()).toHaveLength(1);
  await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  await expect.poll(async () => (await terminals()).length).toBe(2);
  await expect(page.locator('.terminal-scope')).toContainText('Conversation du workflow affiché');
  await openRun();
  // A known conversation now selects its existing terminal automatically.
  await expect(page.locator('.terminal-scope')).toContainText('Conversation du workflow affiché');
  await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  await expect(page.locator('.terminal-tab.active [data-session]')).toHaveAttribute('data-session',first.id);
  await page.getByRole('button',{name:'Détail',exact:true}).click();
  await page.getByRole('button',{name:'Graphe',exact:true}).click();
  const input=page.locator('.xterm-helper-textarea:visible');
  await input.focus();await page.keyboard.type('Message dans le terminal initial');await page.keyboard.press('Enter');
  await expect(page.locator('.xterm-screen:visible')).toContainText('INPUT:Message dans le terminal initial');
  const still = (await terminals()).find(s=>s.id===first.id);
  expect(still.pid).toBe(first.pid);
  expect(still.alive).toBe(true);
  await input.focus();await page.keyboard.type('exit');await page.keyboard.press('Enter');
  await expect.poll(async () => (await terminals()).find(s=>s.id===first.id)?.idleShell).toBe(true);
  await expect(page.locator('.terminal-tab.active')).toContainText('Shell · Codex arrêté');
  expect(await terminals()).toHaveLength(2);
  expect((await terminals()).find(s=>s.id===first.id).pid).toBe(first.pid);
  await input.focus();await page.keyboard.type('sleep 30');await page.keyboard.press('Enter');
  await expect.poll(async () => (await terminals()).find(s=>s.id===first.id)?.program).toBe('sleep');
  await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  // A remembered AI provider is not evidence that this foreground program is AI.
  await expect(page.locator('.terminal-tab.active [data-session]')).toHaveText('sleep · R1 — Demande synthétique');
  await input.focus();await page.keyboard.press('Control+C');
  await expect.poll(async () => (await terminals()).find(s=>s.id===first.id)?.idleShell).toBe(true);
});

test('a stopped conversation with a pending question resumes explicitly without losing requests or its terminal', async () => {
  const terminals = () => page.evaluate(() => window.tricorder.terminals.list());
  await page.getByRole('button', {name:'Retrouver la conversation',exact:true}).click();
  await expect(page.locator('.xterm-screen:visible')).toContainText('INERT REVIEW AGENT');
  const [first] = await terminals();
  const before = await call('conversation.get', {conversation:fixture.conversation});
  const input = page.locator('.xterm-helper-textarea:visible');
  await page.evaluate(() => {
    const start=performance.now(); window.__reviewStopped={start,events:[]};
    let prior='';
    window.__reviewStopped.timer=setInterval(() => {
      const scope=document.querySelector('.terminal-scope')?.textContent || '';
      const studio=[...document.querySelectorAll('*')].find(el=>el.shadowRoot?.querySelector('#conversation-tray'))?.shadowRoot;
      const tray=studio?.querySelector('#conversation-tray');
      const value={scope, resume:!!tray?.querySelector('[data-action=resume-agent]'), retrieve:!!tray?.querySelector('[data-action=conversation-terminal]')};
      const key=JSON.stringify(value);
      if(key!==prior){window.__reviewStopped.events.push({ms:performance.now()-start,...value});prior=key;}
    },25);
  });
  await input.focus(); await page.keyboard.type('exit'); await page.keyboard.press('Enter');
  await expect.poll(async () => (await terminals()).find(s => s.id === first.id)?.idleShell).toBe(true);
  await page.evaluate(() => {window.__reviewStopped.idleObservedMs=performance.now()-window.__reviewStopped.start;});
  // The UI observes the broker every 5 s; the workflow then polls that cache.
  // Verify each visible observation without forcing a refresh or navigating.
  await expect(page.locator('.terminal-scope')).toContainText('Agent arrêté', {timeout:10000});
  await expect(page.locator('#execution-overview')).toContainText('Réponse attendue');
  const resume = page.locator('#conversation-tray').getByRole('button', {name:'Reprendre l’agent…',exact:true});
  await expect(resume).toBeVisible();
  const timing=await page.evaluate(() => { const r=window.__reviewStopped;clearInterval(r.timer);return {idleObservedMs:r.idleObservedMs,resumeObservedMs:performance.now()-r.start,events:r.events}; });
  fs.writeFileSync(test.info().outputPath('observation-timing.json'),JSON.stringify({timing,fixture,first},null,2));
  await page.screenshot({path:test.info().outputPath('stopped-resume-visible.png')});
  await resume.click();
  await expect(page.getByRole('dialog')).toContainText('sans créer une seconde conversation');
  await page.getByRole('button', {name:'Revenir',exact:true}).click();
  expect((await terminals()).find(s => s.id === first.id).idleShell).toBe(true);
  expect(await terminals()).toHaveLength(1);
  await resume.click(); await page.getByRole('button', {name:'Reprendre dans ce terminal',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(async () => (await terminals()).find(s => s.id === first.id)?.idleShell).toBe(false);
  await expect(page.locator('#conversation-tray')).not.toContainText('Agent arrêté');
  await input.focus(); await page.keyboard.type('Continuer la demande conservée'); await page.keyboard.press('Enter');
  await expect(page.locator('.xterm-screen:visible')).toContainText('INPUT:Continuer la demande conservée');
  const after = await call('conversation.get', {conversation:fixture.conversation});
  expect(after.items.map(i => [i.id,i.run,i.request])).toEqual(before.items.map(i => [i.id,i.run,i.request]));
  expect((await call('run.get', {run:fixture.run})).run.nodes.question.status).toBe('waiting_input');
  const [current] = await terminals(); expect(current.id).toBe(first.id); expect(current.pid).toBe(first.pid);
  expect(await terminals()).toHaveLength(1);
  await page.screenshot({path:test.info().outputPath('conversation-resumed-same-terminal.png')});
});

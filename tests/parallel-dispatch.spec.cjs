const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {cleanupBroker}=require('./terminal-fixture.cjs');
const root=path.resolve(__dirname,'..');
let directory,app,page,fixture;

test.beforeEach(async()=>{
  directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-parallel-ui-'));
  fs.mkdirSync(path.join(directory,'bin'));
  fs.writeFileSync(path.join(directory,'bin/codex'),`#!/usr/bin/python3
import json,sys,time,os
from pathlib import Path
if 'exec' in sys.argv:
 json.load(sys.stdin)
 Path(os.environ['HOME'], 'worker-'+str(os.getpid())).write_text('started')
 print(json.dumps({'type':'thread.started','thread_id':'synthetic-'+str(os.getpid())}),flush=True)
 time.sleep(5)
 value={'summary':'Synthetic autonomous task completed','question':'','outputs':{'result':'Synthetic result'}}
 print(json.dumps({'type':'item.completed','item':{'type':'agent_message','text':json.dumps(value)}}),flush=True)
 print(json.dumps({'type':'turn.completed','usage':{'input_tokens':1,'output_tokens':1}}),flush=True)
else:
 print('SYNTHETIC COORDINATOR READY',flush=True)
 for line in sys.stdin: print('INPUT: '+line.strip(),flush=True)
`,{mode:0o755});
  const environment={...process.env,PATH:path.join(directory,'bin')+':/usr/bin:/bin',HOME:directory,
    XDG_CONFIG_HOME:path.join(directory,'config'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_DATA_HOME:path.join(directory,'data'),
    TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_AGENTS_DIR:path.join(directory,'absent-pack'),TRICORDER_TEST_MODE:'1'};
  const backend=process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend');
  fixture=JSON.parse(execFileSync('/usr/bin/python3',['-c',`
import sys,json
sys.path.insert(0,sys.argv[1])
from workflow_engine import Engine
from workflow_engine.conversations import Conversations
e=Engine(sys.argv[2]);p=e.create_project('Synthetic parallel dispatch')
g={'schema':1,'id':'parallel-ui','title':'Independent tasks and consolidation','defaults':{'provider':'codex','model':'synthetic'},'nodes':[{'id':'work','kind':'agent','title':'Analyze the supplied inputs','validation':'contract','outputs':{'result':'string'}}],'edges':[]}
e.save(p['id'],g);c=Conversations(e);conversation=c.open(p['id'],g,'codex');items=[c.add(conversation['id'],f'R{i} — Synthetic independent analysis') for i in range(1,4)];join=c.add(conversation['id'],'C1 — Synthetic consolidation',depends_on=[i['id'] for i in items]);print(json.dumps({'project':p['id'],'conversation':conversation['id'],'items':items,'join':join}))
`,backend,directory],{env:environment,encoding:'utf8'}));
  app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?['--workflow-studio']:[root,'--workflow-studio'],env:environment,timeout:20000});
  page=await app.firstWindow(); await page.evaluate(() => localStorage.setItem('tricorder-editor-detail','yes'));
  await page.locator('[data-workflow-route=projects]').click();
  await page.locator('.project-card').filter({hasText:'Synthetic parallel dispatch'}).click();
  await page.locator(`[data-action=open-conversation][data-id="${fixture.conversation}"]`).click();
});

test.afterEach(async()=>{
  if(app)await app.close();
  await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));
  await cleanupBroker(path.join(directory,'studio-pty.sock'));
  fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
});

test('one click launches three real local provider fixtures concurrently and preserves the join',async({},info)=>{
  const read=()=>page.evaluate(conversation=>window.studio.request({action:'conversation.get',conversation}),fixture.conversation);
  await page.getByRole('button',{name:'Lancer les demandes prêtes',exact:true}).click();
  await expect.poll(async()=>(await read()).activity.running).toBe(3);
  await expect(page.locator('.conversation-workers')).toHaveCount(3);
  await expect.poll(()=>fs.readdirSync(directory).filter(n=>n.startsWith('worker-')).length).toBe(3);
  const snapshot=await read();
  expect(snapshot.items.filter(i=>i.execution.workers[0]?.ownership==='managed')).toHaveLength(3);
  expect(snapshot.items.find(i=>i.run===fixture.join.run).execution.status).toBe('paused');
  await page.screenshot({path:info.outputPath('three-real-local-workers.png')});
  await expect(page.getByRole('button',{name:'Lancer les demandes prêtes',exact:true})).toBeDisabled();
  await expect(page.locator('.overview-page-scope').last()).toContainText('0 demande(s) lançable(s)');
  await expect.poll(async()=>(await read()).items.slice(0,3).every(i=>i.execution.status==='completed'),{timeout:15000}).toBe(true);
  expect(fs.readdirSync(directory).filter(n=>n.startsWith('worker-'))).toHaveLength(3);
  const done=await read();
  expect(done.items.find(i=>i.run===fixture.join.run).execution.counts.ready).toBe(1);
  // A read and a completed predecessor do not automatically enroll a new model.
  expect(done.activity.running).toBe(0);
  for(const item of fixture.items){
    const result=await page.evaluate(run=>window.studio.request({action:'run.get',run}),item.run);
    expect(result.run.nodes.work.result.outputs.result).toBe('Synthetic result');
    expect(result.run.nodes.work.attempt).toBe(1);
  }
});

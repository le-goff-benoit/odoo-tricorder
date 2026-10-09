const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {cleanupBroker}=require('./terminal-fixture.cjs');
const root=path.resolve(__dirname,'..');
let directory,app,page,fixture,environment,backend;
const seed=`
import json,sys,os
sys.path.insert(0,sys.argv[1])
from workflow_engine import Engine
from workflow_engine.library import node,edge
from workflow_engine.conversations import Conversations
e=Engine(sys.argv[2]);p=e.create_project('Projet Atlas');q=e.create_project('Projet Boréal');c=Conversations(e)
g={'schema':1,'id':'requests','title':'Analyser, réaliser et vérifier les demandes','defaults':{'provider':'codex','model':'synthetic'},'nodes':[
 node('plan','Préparer le plan','task',outputs={'plan':'string'},validation='contract'),
 node('gate','Valider le périmètre','decision',inputs={'plan':'string'},question='Le périmètre et les critères proposés conviennent-ils ?',options=['approve','reject']),
 node('work','Réaliser la demande','agent',max_attempts=2,validation='contract')],
 'edges':[{**edge('plan','gate'),'mapping':{'plan':'plan'}},edge('gate','work','approve')]}
e.save(p['id'],g);conversation=c.open(p['id'],g,'codex',projects=[q['id']],model='synthetic');cid=conversation['id'];items=[]
titles=['R1 — Retrouver les documents du client','R2 — Corriger le filtre des commandes','R3 — Vérifier les droits de consultation','R4 — Préparer les tests de réception','R5 — Vérifier la copie de travail']
for i,title in enumerate(titles):
 item=c.add(cid,title,project=p['id'] if i%2==0 else q['id']);items.append(item)
 token=e.claim(item['run'],'plan')['token'];e.submit(item['run'],'plan',token,{'ok':True,'summary':'Plan prêt pour examen.','outputs':{'plan':'Vérifier le comportement attendu, réaliser la correction dans une copie de travail, puis fournir le résultat des tests.'}})
def approve(item):
 state=e.run(item['run'])['nodes']['gate'];e.decide(item['run'],'gate',state['nonce'],state['proposal'],'approve',human=True)
approve(items[4]);token=e.claim(items[4]['run'],'work')['token'];e.submit(items[4]['run'],'work',token,{'ok':False,'summary':'La copie de travail manque d’espace disque. Libérer de l’espace puis réessayer.','outputs':{}})
e.retry(items[4]['run'],'work','Utiliser un répertoire local disposant de suffisamment d’espace.',human=True)
token=e.claim(items[4]['run'],'work')['token'];e.submit(items[4]['run'],'work',token,{'ok':False,'summary':'La copie reste incomplète. Vérifier le répertoire de destination avant une nouvelle demande.','outputs':{}})
items.append(c.add(cid,'C1 — Consolider les résultats de R1 à R4',depends_on=[i['id'] for i in items[:4]]))
if sys.argv[3] in ['running','pages','compact']:
 for item in items[:2]:
  approve(item);e.claim(item['run'],'work',executor='native',owner_pid=os.getppid())
if sys.argv[3]=='compact':
 from workflow_engine.conversations import ask
 state=e.run(items[0]['run'])['nodes']['work'];ask(e,items[0]['run'],'work',state['token'],'Pour R1, faut-il vérifier uniquement les documents existants ou préparer aussi les pièces manquantes ? La réponse ne vaut pas accord d’envoi.')
if sys.argv[3]=='pages':
 for n in range(7,29):items.append(c.add(cid,'R'+str(n)+' — Autre demande à coordonner',depends_on=[items[0]['id']]))
print(json.dumps({'project':p,'second':q,'conversation':cid,'items':items}))
`;
const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
const rows=()=>page.locator('#conversation-overview .conversation-demand');
const row=i=>page.locator(`#conversation-overview .conversation-demand[data-run="${fixture.items[i].run}"]`);
const openRow=async i=>{await row(i).locator('.conversation-demand-open').click();await expect(page.locator('.workflow-heading h1')).toContainText(fixture.items[i].request);};
async function screenshot(info,name){await page.screenshot({path:info.outputPath(name+'.png')});}
async function dimensions(width,height,zoom=1){await app.evaluate(({BrowserWindow},factor)=>BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(factor),zoom);await page.setViewportSize({width,height});}

test.beforeEach(async({},info)=>{
  directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-overview-ui-'));fs.mkdirSync(path.join(directory,'bin'));
  fs.writeFileSync(path.join(directory,'bin/codex'),'#!/bin/sh\nprintf "SUIVI SYNTHÉTIQUE PRÊT\\n"\nwhile IFS= read -r line; do printf "DEMANDE : %s\\n" "$line"; done\n',{mode:0o755});
  environment={...process.env,PATH:path.join(directory,'bin')+':/usr/bin:/bin',HOME:directory,XDG_CONFIG_HOME:path.join(directory,'config'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_DATA_HOME:path.join(directory,'data'),TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_AGENTS_DIR:path.join(directory,'absent-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
  backend=process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend');
  fixture=JSON.parse(execFileSync('/usr/bin/python3',['-c',seed,backend,directory,info.title.startsWith('running')?'running':info.title.startsWith('pages')?'pages':info.title.startsWith('compact')?'compact':'gates'],{env:environment,encoding:'utf8'}));
  app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?['--workflow-studio']:[root,'--workflow-studio'],env:environment});page=await app.firstWindow();await dimensions(1500,1000);
  await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:'Projet Atlas'}).click();
  await page.locator(`[data-action=open-conversation][data-id="${fixture.conversation}"]`).click();
  await expect(page.getByRole('group',{name:'Périmètre du suivi'}).getByRole('button',{name:'Vue d’ensemble',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(rows()).toHaveCount(info.title.startsWith('pages')?25:6);
  await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();await expect(page.locator('.xterm-screen:visible')).toContainText('SUIVI SYNTHÉTIQUE PRÊT');
});
test.afterEach(async()=>{
  if(app)await app.close();await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));await cleanupBroker(path.join(directory,'studio-pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
});

test('gates: six demands, cross-project context and true dependency links remain understandable',async({},info)=>{
  const sessions=(await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>s.id);
  await expect(page.locator('.conversation-overview-heading')).toContainText('4 décisions');
  await expect(row(0)).toContainText('Projet Atlas');await expect(row(1)).toContainText('Projet Boréal');
  await expect(row(0).locator('.conversation-workers')).toHaveCount(0);
  await expect(row(5).locator('.dependency-link')).toHaveCount(4);
  for(let i=0;i<4;i++)await expect(row(5)).toContainText(fixture.items[i].request);
  await page.locator('[data-theme-choice=light]').click();await screenshot(info,'overview-six-demands-light-1500');
  await row(5).locator('.dependency-link').filter({hasText:'R3 —'}).click();await expect(page.locator('.workflow-heading h1')).toContainText('R3 —');
  await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();await expect(page.locator('#inspector')).toContainText('Le périmètre et les critères proposés conviennent-ils');
  await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await row(5).locator('.conversation-demand-action').click();await expect(page.locator('#inspector .dependency-list button')).toHaveCount(4);
  await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await dimensions(1024,768,1.25);await page.locator('[data-theme-choice=dark]').click();
  // The responsive render or activity poll can replace a card while scrolling it.
  // Resolve it again until the intended card is actually in the viewport.
  await expect(async()=>{
    await row(5).scrollIntoViewIfNeeded();
    await expect(row(5)).toBeInViewport();
  }).toPass({timeout:5000});
  await screenshot(info,'overview-dependencies-dark-1024-125');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('#conversation-overview').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  expect((await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>s.id)).toEqual(sessions);
});

test('running: actual agents, failure history and explicit dispatch are distinct',async({},info)=>{
  await expect(page.locator('.conversation-overview-heading')).toContainText('2 étapes en cours');
  await expect(row(0).locator('.conversation-workers')).toContainText('Agent · OpenAI · synthetic');await expect(row(1).locator('.conversation-workers')).toContainText('Pris en charge dans le terminal');
  await expect(row(2).locator('.conversation-workers')).toHaveCount(0);
  await screenshot(info,'overview-two-agents-light-1500');
  const before=await call('conversation.get',{conversation:fixture.conversation});
  await expect(page.getByRole('button',{name:'Lancer les demandes prêtes',exact:true})).toBeDisabled();await expect(page.locator('.overview-page-scope').last()).toContainText('0 demande(s) lançable(s)');
  const after=await call('conversation.get',{conversation:fixture.conversation});expect(after.activity.running).toBe(before.activity.running);expect(after.activity.decisions).toBe(before.activity.decisions);
  await openRow(4);await page.getByRole('button',{name:'Examiner l’échec',exact:true}).click();await expect(page.locator('#inspector')).toContainText('La copie reste incomplète');
  await page.locator('details.result-context > summary').click();await expect(page.locator('.attempt-history')).toContainText('La copie de travail manque d’espace disque');await expect(page.locator('.attempt-history')).toContainText('Utiliser un répertoire local');
  await screenshot(info,'failure-and-history-light-1500');
  await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await dimensions(1024,768,1.25);await page.locator('[data-theme-choice=dark]').click();await page.locator('#conversation-overview').evaluate(el=>el.scrollTop=0);await screenshot(info,'overview-two-agents-dark-1024-125');
  expect(await page.locator('#conversation-overview').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
});

test('pages: global activity survives paging and off-page dependencies open the named request',async({},info)=>{
  await expect(page.locator('.conversation-overview-heading')).toContainText('2 étapes en cours');
  await page.locator('#conversation-overview').getByRole('button',{name:'Demandes suivantes',exact:true}).click();await expect(rows()).toHaveCount(3);
  await expect(page.locator('.overview-page-scope').first()).toContainText('26–28 sur 28');await expect(page.locator('.conversation-overview-heading')).toContainText('2 étapes en cours');
  await expect(rows().first().locator('.dependency-link')).toContainText('hors page');
  await rows().first().locator('.dependency-link').click();await expect(page.locator('.workflow-heading h1')).toContainText('R1 — Retrouver les documents');
  await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await expect(page.locator('.overview-page-scope').first()).toContainText('26–28 sur 28');
  await page.getByRole('button',{name:'Rechercher une demande',exact:true}).click();await page.getByRole('searchbox',{name:'Rechercher une demande',exact:true}).fill('R4 —');await page.locator('#conversation-search button').click();await expect(rows()).toHaveCount(1);await expect(rows()).toContainText('R4 —');
  await expect(page.locator('.conversation-overview-heading')).toContainText('2 étapes en cours');await expect(page.locator('.overview-page-scope').first()).toContainText('28 au total');
  await page.locator('.request-selector > summary').click();await screenshot(info,'overview-filter-global-activity-light-1500');
});

test('compact: terminal working lines and the question answer remain visible together',async({},info)=>{
  const sessions=(await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>s.id);
  const storedSplit=await page.evaluate(()=>localStorage.getItem('tricorder.terminalStackedSplit'));
  await dimensions(1024,768,1.25);await page.locator('[data-theme-choice=dark]').click();await row(0).locator('.conversation-demand-action').click();
  await expect.poll(()=>page.locator('.xterm-screen:visible').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(120);
  await expect(page.locator('#question-form button')).toBeInViewport({ratio:1});
  const formFits=()=>page.locator('#question-form').evaluate(el=>{const form=el.getBoundingClientRect(),inspector=el.closest('#inspector').getBoundingClientRect();return form.bottom<=inspector.bottom+1 && form.top>=inspector.top;});
  expect(await formFits()).toBe(true);
  await page.getByLabel('Votre réponse',{exact:true}).fill('Vérifier les documents existants, sans envoi.');
  await screenshot(info,'compact-question-terminal-dark-1024-125');
  expect(await page.evaluate(()=>localStorage.getItem('tricorder.terminalStackedSplit'))).toBe(storedSplit);
  const separator=page.getByRole('separator',{name:'Taille du terminal'});
  const size=()=>page.locator('.main-content').evaluate(el=>{const total=el.getBoundingClientRect().height,height=el.querySelector('#terminal-workspace').getBoundingClientRect().height;return {height,ratio:height/total*100};});
  const before=await size();expect(Math.abs(Number(await separator.getAttribute('aria-valuenow'))-before.ratio)).toBeLessThan(.2);
  expect(Number(await separator.getAttribute('aria-valuemin'))).toBeGreaterThan(30);
  await separator.focus();await separator.press('ArrowDown');await expect.poll(async()=>(await size()).height).toBeGreaterThan(before.height+10);
  const moved=await size();expect(Math.abs(Number(await separator.getAttribute('aria-valuenow'))-moved.ratio)).toBeLessThan(.2);
  await separator.press('ArrowUp');expect(await formFits()).toBe(true);
  await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await row(0).locator('.conversation-demand-action').click();await expect(page.getByLabel('Votre réponse',{exact:true})).toHaveValue('Vérifier les documents existants, sans envoi.');
  await dimensions(1440,900);await page.locator('[data-theme-choice=light]').click();await page.locator('[data-action=terminal-layout]').click();
  const handle=await separator.boundingBox(),body=await page.locator('.main-content').boundingBox();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2,body.y+body.height*.52);await page.mouse.up();
  expect(Math.abs(Number(await separator.getAttribute('aria-valuenow'))-52)).toBeLessThan(.2);await expect(page.locator('#question-form button')).toBeInViewport({ratio:1});expect(await formFits()).toBe(true);
  await screenshot(info,'compact-question-terminal-light-1440-52');
  expect((await page.evaluate(()=>window.tricorder.terminals.list())).filter(s=>s.alive).map(s=>s.id)).toEqual(sessions);
  await page.locator('#question-form button').click();await expect(page.locator('#question-form')).toHaveCount(0);
});

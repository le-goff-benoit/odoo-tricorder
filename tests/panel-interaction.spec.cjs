const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {cleanupBroker}=require('./terminal-fixture.cjs');
const root=path.resolve(__dirname,'..');
let directory,environment,app,page,fixture,backend;
const seed=`
import sys,json
sys.path.insert(0,sys.argv[1])
from workflow_engine import Engine
from workflow_engine.library import node,edge
from workflow_engine.conversations import Conversations
e=Engine(sys.argv[2]);p=e.create_project('Atelier Azur');q=e.create_project('Laboratoire Corail');c=Conversations(e)
g={'schema':1,'id':'examen','title':'Examiner les propositions','defaults':{'provider':'codex','model':'inert'},'nodes':[node('plan','Préparer la proposition','task',outputs={'proposition':'string'},validation='contract'),node('gate','Examiner avant la suite','decision',inputs={'proposition':'string'},question='Approuvez-vous uniquement cette proposition ?',options=['approve','reject'])],'edges':[{**edge('plan','gate'),'mapping':{'proposition':'proposition'}}]}
e.save(p['id'],g);v=c.open(p['id'],g,'codex',projects=[q['id']]);items=[]
for index,project in enumerate([p,q]):
 item=c.add(v['id'],'Demande '+str(index+1)+' — Examiner le contenu de la proposition sans envoi externe',project=project['id']);items.append(item)
 t=e.claim(item['run'],'plan')['token'];e.submit(item['run'],'plan',t,{'ok':True,'summary':'Proposition synthétique à examiner','outputs':{'proposition':'\\n\\n'.join('Paragraphe '+str(n)+' : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe.' for n in range(45))}})
rgraph={'schema':1,'id':'reception','title':'Valider un résultat','defaults':{'provider':'codex','model':'inert'},'nodes':[node('work','Vérifier le résultat','task',criteria=['Les pièces ont été vérifiées.'],validation='human')],'edges':[]}
e.save(p['id'],rgraph);receipt=e.start(p['id'],rgraph,parameters={'request':'Recevoir les pièces vérifiées'},driver='conversation');t=e.claim(receipt['id'],'work')['token'];e.submit(receipt['id'],'work',t,{'ok':True,'summary':'Résultat synthétique : les pièces sont disponibles.','outputs':{}})
extra=[]
if sys.argv[3]=='tabs':
 for n in range(4):
  cv=c.open(p['id'],g,'codex');ci=c.add(cv['id'],'Conversation supplémentaire '+str(n+1)+' — Examiner les décisions du comité');extra.append({'conversation':cv['id'],'run':ci['run']})
print(json.dumps({'project':p,'second':q,'conversation':v['id'],'items':items,'receipt':receipt['id'],'extra':extra}))
`;
const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
const sessions=()=>page.evaluate(()=>window.tricorder.terminals.list());
const sessionIdentity=async()=>(await sessions()).map(s=>[s.id,s.pid,s.project,s.conversation,s.provider]);
async function openRun(run=fixture.items[0].run){
 await page.locator('[data-workflow-route="overview"]').click();
 await page.locator(`.activity-row[data-id="${run}"]`).click();
 await expect(page.locator('.execution-heading')).toBeVisible();
}
async function compact(){
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1.25));
 await page.setViewportSize({width:1024,height:800});
}
async function preflight(){
 await page.locator('[data-action="new-terminal"]').first().click();
 const input=page.locator('.xterm-helper-textarea:visible');await input.focus();
 await page.keyboard.type('command -v codex; codex --version; command -v claude; claude --version');await page.keyboard.press('Enter');
 await expect(page.locator('.xterm-screen:visible')).toContainText('PANEL INTERACTION INERT');
 await expect(page.locator('.xterm-screen:visible')).toContainText(path.join(directory,'bin'));
}
async function launchConversation(){
 await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();
 await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
 await expect(page.locator('.xterm-screen:visible')).toContainText('PANEL INTERACTION AGENT EXITED');
 await expect.poll(async()=>(await sessions()).filter(s=>s.alive).every(s=>s.idleShell)).toBe(true);
}
test.beforeEach(async({},info)=>{
 directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-panel-interaction-'));
 fs.mkdirSync(path.join(directory,'bin'));fs.mkdirSync(path.join(directory,'home'));
 for(const provider of ['codex','claude'])fs.writeFileSync(path.join(directory,'bin',provider),'#!/bin/sh\nif [ "$1" = --version ]; then printf "PANEL INTERACTION INERT\\n"; exit 0; fi\nprintf "PANEL INTERACTION AGENT EXITED\\n"\nexit 78\n',{mode:0o755});
 environment={PATH:path.join(directory,'bin')+':/usr/bin:/bin',HOME:path.join(directory,'home'),SHELL:'/bin/bash',DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',PYTHONDONTWRITEBYTECODE:'1',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_DATA_HOME:path.join(directory,'data'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_RUNTIME_DIR:path.join(directory,'xdg-runtime'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:path.join(directory,'home'),TRICORDER_STATE_DIR:path.join(directory,'state'),TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'absent-pack'),TRICORDER_TEST_MODE:'1'};
 backend=process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend');
 fixture=JSON.parse(execFileSync('/usr/bin/python3',['-c',seed,backend,path.join(directory,'state/workflows'),info.title.startsWith('initial')?'tabs':'normal'],{env:environment,encoding:'utf8'}));
 app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?[]:[root],env:environment});page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});
 await openRun();await page.locator('[data-action="terminal-toggle"]').click();await preflight();
});
test.afterEach(async()=>{if(app)await app.close();app=null;await cleanupBroker(path.join(directory,'runtime/pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});

test('terminal visibility choices survive navigation, projects and design while shell and provider stay intact',async({},info)=>{
 await launchConversation();
 await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('export PANEL_CONTEXT=conserve');await page.keyboard.press('Enter');
 const before=await sessionIdentity();
 await page.locator('#preferred-provider').selectOption('claude');
 for(const visible of [false,true]){
  if(await page.locator('#terminal-workspace').isVisible()!==visible)await page.locator('[data-action="terminal-toggle"]').click();
  await page.locator('[data-workflow-route="connections"]').click();await expect(page.locator('#terminal-workspace')).toBeVisible({visible});
  await openRun(fixture.items[1].run);await expect(page.locator('#terminal-workspace')).toBeVisible({visible});
  await page.locator('.execution-menu > summary').click();await page.getByRole('button',{name:'Revenir à l’éditeur',exact:true}).click();await expect(page.locator('#terminal-workspace')).toBeVisible({visible});
  await openRun();await expect(page.locator('#terminal-workspace')).toBeVisible({visible});
 }
 expect(await sessionIdentity()).toEqual(before);
 await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('printf "CONTEXT:%s\\n" "$PANEL_CONTEXT"');await page.keyboard.press('Enter');
 await expect(page.locator('.xterm-screen:visible')).toContainText('CONTEXT:conserve');
 await openRun(fixture.items[1].run);await expect(page.locator('#terminal-context.cross-project')).toContainText('Shell : Atelier Azur');
 await expect(page.locator('#terminal-context')).toContainText('Demande affichée : Laboratoire Corail');
 await expect(page.locator('#terminal-context')).toContainText('le dossier courant peut changer');
 await compact();await page.screenshot({path:info.outputPath('terminal-context-compact.png')});
 const active=page.locator('.terminal-tab.active [data-session]');await active.focus();
 await expect(page.locator('.terminal-session-title')).toBeVisible();
 await expect(page.locator('.terminal-session-title')).toHaveText(await active.getAttribute('aria-label'));
 expect(await page.locator('#terminal-tabs').evaluate(el=>el.getBoundingClientRect().right<=innerWidth)).toBe(true);
 expect(await sessionIdentity()).toEqual(before);
 fs.writeFileSync(info.outputPath('terminal-preservation.json'),JSON.stringify({before,after:await sessionIdentity(),providerForNextLaunch:await page.locator('#preferred-provider').inputValue()},null,2));
});

test('long decision keeps contextual actions visible, preserves its draft and records one targeted approval',async({},info)=>{
 await launchConversation();const stoppedSession=await sessionIdentity();await openRun();await compact();
 await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();
 const footer=page.locator('#inspector .interaction-footer');
 await expect(footer).toContainText(fixture.items[0].request);await expect(footer).toContainText('tentative 1 uniquement');
 await expect(footer.getByRole('button',{name:'Approuver la suite',exact:true})).toBeInViewport({ratio:1});
 await expect(page.locator('#conversation-tray [data-action="resume-agent"]')).toBeInViewport({ratio:1});
 expect(await sessionIdentity()).toEqual(stoppedSession);
 expect((await sessions()).filter(s=>s.alive).every(s=>s.idleShell)).toBe(true);
 const scrolling=page.locator('.interaction-scroll');expect(await scrolling.evaluate(el=>el.scrollHeight>el.clientHeight+300)).toBe(true);
 await page.screenshot({path:info.outputPath('long-proposal-fixed-actions.png')});
 await scrolling.evaluate(el=>el.scrollTop=el.scrollHeight);
 await page.getByLabel('Commentaire (facultatif)',{exact:true}).fill('Accord limité à la demande 1 ; aucun envoi.');
 await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await page.locator(`.conversation-demand[data-run="${fixture.items[1].run}"] .conversation-demand-action`).click();
 await expect(page.getByLabel('Commentaire (facultatif)',{exact:true})).toHaveValue('');
 await openRun();await expect(page.locator('#decision-form')).toBeVisible();
 await expect(page.getByLabel('Commentaire (facultatif)',{exact:true})).toHaveValue('Accord limité à la demande 1 ; aucun envoi.');
 await scrolling.evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:info.outputPath('decision-comment-preserved.png')});
 // Two immediate native submit attempts exercise the synchronous lock while
 // the real human IPC request is still pending. No engine state is injected.
 await footer.getByRole('button',{name:'Approuver la suite',exact:true}).evaluate(button=>{button.click();button.click();});
 await expect(page.locator('#decision-form')).toHaveCount(0);
 const accepted=await call('run.get',{run:fixture.items[0].run});
 expect(accepted.run.nodes.gate.decision.outcome).toBe('approve');expect(accepted.run.nodes.gate.decision.note).toBe('Accord limité à la demande 1 ; aucun envoi.');
 expect(accepted.events.filter(e=>e.type==='decision')).toHaveLength(1);
 const other=(await call('run.get',{run:fixture.items[1].run})).run.nodes.gate;expect(other.status).toBe('waiting');
 fs.writeFileSync(info.outputPath('targeted-decision.json'),JSON.stringify({accepted:accepted.run.nodes.gate,decisions:accepted.events.filter(e=>e.type==='decision'),other},null,2));
});

test('receipt requires its announced comment and retains the keyboard draft until native validation succeeds',async({},info)=>{
 await openRun(fixture.receipt);await page.getByRole('button',{name:'Examiner le résultat',exact:true}).click();
 await compact();await page.locator('[data-theme-choice=dark]').click();
 const button=page.locator('.interaction-footer').getByRole('button',{name:'Valider le résultat',exact:true});
 const note=page.getByLabel('Commentaire de validation (obligatoire)',{exact:true});
 await page.getByRole('checkbox',{name:'Les pièces ont été vérifiées.',exact:true}).check();
 await button.focus();await page.keyboard.press('Enter');
 expect((await call('run.get',{run:fixture.receipt})).run.nodes.work.status).toBe('returned');
 expect(await note.evaluate(el=>el.validity.valueMissing)).toBe(true);await expect(note).toBeFocused();
 await note.fill('Pièces contrôlées sur le banc synthétique.');await expect(button).toBeInViewport({ratio:1});
 await page.screenshot({path:info.outputPath('receipt-required-keyboard.png')});
 await button.focus();await page.keyboard.press('Enter');await expect(page.locator('#receipt-form')).toHaveCount(0);
 const accepted=await call('run.get',{run:fixture.receipt});expect(accepted.run.nodes.work.status).toBe('accepted');expect(accepted.run.nodes.work.receipt.note).toBe('Pièces contrôlées sur le banc synthétique.');
 fs.writeFileSync(info.outputPath('keyboard-receipt.json'),JSON.stringify({emptyComment:'returned; validity.valueMissing; focus on required note',accepted:accepted.run.nodes.work},null,2));
});

test('initial request is acknowledged during launch and long terminal names remain available with several tabs',async({},info)=>{
 const request='Préparer le compte rendu de la réunion pour Infrastructure Genève — '+('décisions, responsables et dates ; '.repeat(10))+'FIN DU NOM COMPLET';
 await page.locator('[data-workflow-route="overview"]').click();
 await page.getByRole('button',{name:'Nouvelle demande',exact:true}).click();
 await page.getByRole('dialog').getByRole('combobox',{name:'Workflow',exact:true}).selectOption(fixture.project.id+':examen');
 await page.getByRole('button',{name:'Continuer',exact:true}).click();
 await page.locator('#initial-request').fill(request);
 await page.evaluate(()=>{
  window.panelLaunchTexts=[];
  const root=document.querySelector('#workflow-panel').shadowRoot;
  window.panelObserver=new MutationObserver(()=>{const ready=root.querySelector('.conversation-ready');if(ready)window.panelLaunchTexts.push(ready.textContent);});
  window.panelObserver.observe(root,{subtree:true,childList:true});
 });
 await page.getByRole('button',{name:'Lancer dans le terminal',exact:true}).click();
 await expect(page.locator('#feedback')).not.toContainText('is not defined');
 await expect.poll(()=>page.evaluate(()=>window.panelLaunchTexts.some(text=>text.includes('Votre demande est enregistrée') && text.includes('vous n’avez pas à') && text.includes('ressaisir')))).toBe(true);
 expect(await page.evaluate(()=>window.panelLaunchTexts.some(text=>text.includes('Prêt pour votre demande')))).toBe(false);
 fs.writeFileSync(info.outputPath('initial-request-acknowledgement.json'),JSON.stringify(await page.evaluate(()=>window.panelLaunchTexts),null,2));
 await page.evaluate(()=>window.panelObserver.disconnect());
 await expect(page.locator('.xterm-screen:visible')).toContainText('PANEL INTERACTION AGENT EXITED');
 for(const extra of fixture.extra){
  await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:'Atelier Azur'}).click();
  await page.locator(`[data-action=open-conversation][data-id="${extra.conversation}"]`).click();await launchConversation();
 }
 await expect(page.locator('.terminal-tab')).toHaveCount(6);
 await compact();
 const named=page.locator('.terminal-tab [data-session]').filter({hasText:'FIN DU NOM COMPLET'});await expect(named).toHaveCount(1);
 await named.focus();await expect(page.locator('.terminal-session-title')).toContainText('FIN DU NOM COMPLET');
 await named.click();await expect(named).toHaveAttribute('aria-pressed','true');
 await expect(named).toBeInViewport();
 expect(await page.locator('.terminal-tab.active').evaluate(el=>el.getBoundingClientRect().width<=280)).toBe(true);
 fs.writeFileSync(info.outputPath('six-terminals.json'),JSON.stringify(await sessionIdentity(),null,2));
 await page.screenshot({path:info.outputPath('long-tabs-complete-name-keyboard.png')});
});

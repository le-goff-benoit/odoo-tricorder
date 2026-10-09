const {test,expect,_electron:electron}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {cleanupBroker}=require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
const root='/home/blegoff/odoo-tricorder';
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
 item=c.add(v['id'],'Demande '+str(index+1)+' — '+('Examiner les pièces et conserver le dossier sans envoi externe ; '*35)+'FIN DE LA DEMANDE',project=project['id']);items.append(item)
 t=e.claim(item['run'],'plan')['token'];e.submit(item['run'],'plan',t,{'ok':True,'summary':'Proposition synthétique à examiner','outputs':{'proposition':'\\n\\n'.join('Paragraphe '+str(n)+' : vérifier les pièces du dossier et conserver les décisions, sans aucun envoi externe.' for n in range(45))}})
rgraph={'schema':1,'id':'reception','title':'Valider un résultat','defaults':{'provider':'codex','model':'inert'},'nodes':[node('work','Vérifier le résultat','task',criteria=['Les pièces ont été vérifiées.'],validation='human',max_attempts=2)],'edges':[]}
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
 await page.setViewportSize({width:1024,height:768});
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
 directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-review-panel-final-'));
 fs.mkdirSync(path.join(directory,'bin'));fs.mkdirSync(path.join(directory,'home'));
 for(const provider of ['codex','claude'])fs.writeFileSync(path.join(directory,'bin',provider),'#!/bin/sh\nif [ "$1" = --version ]; then printf "PANEL INTERACTION INERT\\n"; exit 0; fi\nprintf "PANEL INTERACTION AGENT EXITED\\n"\nexit 78\n',{mode:0o755});
 environment={PATH:path.join(directory,'bin')+':/usr/bin:/bin',HOME:path.join(directory,'home'),SHELL:'/bin/bash',DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',PYTHONDONTWRITEBYTECODE:'1',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_DATA_HOME:path.join(directory,'data'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_RUNTIME_DIR:path.join(directory,'xdg-runtime'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:path.join(directory,'home'),TRICORDER_STATE_DIR:path.join(directory,'state'),TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'absent-pack'),TRICORDER_TEST_MODE:'1'};
 backend=process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend');
 fixture=JSON.parse(execFileSync('/usr/bin/python3',['-c',seed,backend,path.join(directory,'state/workflows'),info.title.startsWith('initial')?'tabs':'normal'],{env:environment,encoding:'utf8'}));
 app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?[]:[root],env:environment});page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});
 await openRun();await page.locator('[data-action="terminal-toggle"]').click();await preflight();
});
test.afterEach(async()=>{if(app)await app.close();app=null;await cleanupBroker(path.join(directory,'runtime/pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});

test('long request and proposal keep decision controls reachable at 1024x768 with terminal and 125 percent zoom',async({},info)=>{
 await launchConversation();await openRun();await compact();
 await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();
 const footer=page.locator('.interaction-footer');
 await expect(footer.getByRole('button',{name:'Approuver la suite',exact:true})).toBeInViewport({ratio:1});
 await expect(footer.getByRole('button',{name:'Refuser la suite',exact:true})).toBeInViewport({ratio:1});
 const dimensions=await page.locator('#inspector').evaluate(el=>Object.fromEntries(['.interaction-scroll','.interaction-footer','.interaction-scope strong'].map(sel=>{const e=el.querySelector(sel),r=e.getBoundingClientRect();return [sel,{x:r.x,y:r.y,width:r.width,height:r.height,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}];})));
 expect(dimensions['.interaction-scroll'].height).toBeGreaterThan(50);
 await page.locator('.interaction-scope strong').evaluate(el=>el.scrollTop=el.scrollHeight);
 await page.locator('.interaction-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
 await page.getByLabel('Commentaire (facultatif)',{exact:true}).fill('Commentaire long — '+('Périmètre vérifié. '.repeat(80)));
 await expect(page.getByLabel('Commentaire (facultatif)',{exact:true})).toBeInViewport();
 await page.screenshot({path:info.outputPath('long-content-1024x768-125.png')});
 fs.writeFileSync(info.outputPath('geometry.json'),JSON.stringify(dimensions,null,2));
});

test('state change rejects a stale proposal and does not approve another request or restore its draft',async({},info)=>{
 await openRun();await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();
 await page.getByLabel('Commentaire (facultatif)',{exact:true}).fill('Ancien commentaire — proposition 1 seulement');
 const first=(await call('run.get',{run:fixture.items[0].run})).run.nodes.gate;
 const decision={action:'run.decide',run:fixture.items[0].run,node:'gate',nonce:first.nonce,proposal:first.proposal};
 const result=await page.evaluate(async payload=>{
   const scopeErrors=[];
   for(const invalid of [{nonce:'obsolete-nonce'},{proposal:'obsolete-proposal'}]){
     try{await window.studio.human({...payload,...invalid,outcome:'approve',note:'Portée périmée'});scopeErrors.push('UNEXPECTED SUCCESS');}
     catch(error){scopeErrors.push(error.message);}
   }
   await window.studio.human({...payload,outcome:'reject',note:'Refus humain concurrent préparé par API validée'});
   try {await window.studio.human({...payload,outcome:'approve',note:'Accord périmé'});return {scopeErrors,unexpectedSuccess:true};}
   catch(error){return {scopeErrors,message:error.message};}
 },decision);
 expect(result.unexpectedSuccess).toBeUndefined();
 expect(result.scopeErrors).toHaveLength(2);for(const error of result.scopeErrors)expect(error).toContain('Décision périmée');
 expect(result.message).toMatch(/périmée|terminée/);
 await expect(page.locator('#decision-form')).toHaveCount(0);
 await openRun(fixture.items[1].run);
 if(!(await page.locator('#decision-form').count()))await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();
 await expect(page.getByLabel('Commentaire (facultatif)',{exact:true})).toHaveValue('');
 const after=await call('run.get',{run:fixture.items[0].run});
 expect(after.events.filter(e=>e.type==='decision')).toHaveLength(1);expect(after.run.nodes.gate.decision.outcome).toBe('reject');
 expect((await call('run.get',{run:fixture.items[1].run})).run.nodes.gate.status).toBe('waiting');
 fs.writeFileSync(info.outputPath('stale-proposal.json'),JSON.stringify({result,decision:after.run.nodes.gate.decision,events:after.events.filter(e=>e.type==='decision')},null,2));
});

test('a new result attempt clears the previous receipt draft and selected criteria',async({},info)=>{
 await openRun(fixture.receipt);await page.getByRole('button',{name:'Examiner le résultat',exact:true}).click();
 await page.getByLabel('Commentaire de validation (obligatoire)',{exact:true}).fill('Commentaire de la tentative 1 uniquement');
 await page.getByRole('checkbox',{name:'Les pièces ont été vérifiées.',exact:true}).check();
 const before=await call('run.get',{run:fixture.receipt});
 const replacement=`import sys,json\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\ne=Engine(sys.argv[2]);r=sys.argv[3]\ne.retry(r,'work','Contre-épreuve explicite : nouvelle remise',human=True)\nt=e.claim(r,'work')['token']\ne.submit(r,'work',t,{'ok':True,'summary':'Nouveau résultat synthétique, tentative 2 à examiner.','outputs':{}})\nprint(json.dumps(e.run(r)))`;
 const changed=JSON.parse(execFileSync('/usr/bin/python3',['-c',replacement,backend,path.join(directory,'state/workflows'),fixture.receipt],{env:environment,encoding:'utf8'}));
 expect(changed.nodes.work.attempt).toBe(2);expect(changed.nodes.work.started).not.toBe(before.run.nodes.work.started);
 await expect(page.locator('.interaction-footer')).toContainText('tentative 2 uniquement');
 await expect(page.getByLabel('Commentaire de validation (obligatoire)',{exact:true})).toHaveValue('');
 await expect(page.getByRole('checkbox',{name:'Les pièces ont été vérifiées.',exact:true})).not.toBeChecked();
 await page.screenshot({path:info.outputPath('new-attempt-cleared-draft.png')});
 fs.writeFileSync(info.outputPath('new-attempt.json'),JSON.stringify({before:before.run.nodes.work,after:changed.nodes.work},null,2));
});


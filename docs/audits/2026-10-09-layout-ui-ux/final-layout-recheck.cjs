// Independent visual audit. Synthetic state, projects and PTYs only.
const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const crypto = require('node:crypto');
const { cleanupBroker } = require('../../../tests/terminal-fixture.cjs');
const root = path.resolve(__dirname, '../../..');
const output = __dirname;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-layout-final-review-'));
let app,page;
const facts={build:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist/app.js'))).digest('hex'), captured:new Date().toISOString(),views:{},failures:[]};

const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
async function capture(name){
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
 await page.screenshot({path:path.join(output,name+'.png')});
 facts.views[name]=await page.evaluate(()=>{
  const shadow=document.querySelector('#workflow-panel')?.shadowRoot;
  const nodes=[...document.querySelectorAll('h1,h2,h3,button,label,input,select,p,summary,.side-heading,.project-identity,.terminal-heading')];
  if(shadow)nodes.push(...shadow.querySelectorAll('h1,h2,h3,strong,small,legend,fieldset,button,label,input,select,p,summary,.pill,.node,.inspector,.canvas-scroll,.page-heading,.conversation-tray,.toolbar'));
  const out=[];
  for(const e of nodes){const b=e.getBoundingClientRect(),s=getComputedStyle(e);if(b.width<=0||b.height<=0||b.bottom<0||b.top>=innerHeight||s.visibility==='hidden')continue;
   out.push({tag:e.tagName,id:e.id,class:e.className,text:(e.innerText||e.getAttribute('aria-label')||'').slice(0,160),box:{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom},font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,color:s.color,background:s.backgroundColor,overflow:e.scrollWidth>e.clientWidth+2,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth});}
  const box=sel=>{const e=document.querySelector(sel)||shadow?.querySelector(sel);if(!e)return null;const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height}};
  return{width:innerWidth,height:innerHeight,devicePixelRatio:window.devicePixelRatio,theme:document.documentElement.dataset.theme,rootOverflow:document.documentElement.scrollWidth>innerWidth,fontStatus:document.fonts.status,terminal:box('#terminal-workspace'),workflow:box('#workflow-panel'),canvas:box('.canvas-scroll'),inspector:box('#inspector'),elements:out};
 });
 fs.writeFileSync(path.join(output,'final-layout-results.json'),JSON.stringify(facts,null,2)+'\n');
}
async function navigate(route){ await page.locator(`[data-workflow-route="${route}"]`).click(); const expected={overview:'Un workflow clair.',library:'Modèles de workflows',projects:'Vos projets',global:'Workflows globaux',connections:'Connexions',schedules:'Planifications'}[route];await expect(page.getByRole('heading',{name:expected,exact:route!=='overview',level:route==='projects'?2:1})).toBeVisible(); }
async function closeDialog(){const c=page.getByRole('button',{name:'Fermer la fenêtre',exact:true});if(await c.isVisible())await c.click();else{const c2=page.getByRole('button',{name:'Fermer',exact:true});if(await c2.isVisible())await c2.click();else await page.keyboard.press('Escape');}}
async function attempt(name,fn){try{await fn()}catch(e){facts.failures.push({name,error:e.message.slice(0,600)});console.log('FAIL',name,e.message.slice(0,200))}}
async function mailFixture(mode='ready') {
  const bin=path.join(directory,'bin');fs.mkdirSync(bin,{recursive:true});
  fs.copyFileSync(path.join(root,'tests/fixtures/mail-intake-agent.py'),path.join(bin,'codex'));fs.chmodSync(path.join(bin,'codex'),0o755);
  fs.copyFileSync(path.join(root,'tests/fixtures/mail-adapter.py'),path.join(directory,'mail-adapter.py'));
  const config={adapter:path.join(directory,mode==='missing'?'unavailable-adapter.py':'mail-adapter.py'),ambiguous:mode==='ambiguous',question_first:mode==='illustration',requests:['Règle de distance contradictoire dans les devis.','État et menu du projet créé depuis un devis.','Planning vide malgré les jalons.','Montant manuel sans recalcul du sous-total.']};
  fs.writeFileSync(path.join(directory,'mail-fixture.json'),JSON.stringify(config));
  require('node:child_process').execFileSync('python3',['-c',`from email.message import EmailMessage\nfrom pathlib import Path\nimport sys,json\nm=EmailMessage();m['From']='support@example.test';m['To']='team@example.test';m['Subject']='Four synthetic observations';m.set_content('Synthetic observations only; neither causes nor passed QA.\\n'+'\\n'.join(f'R{i}: {text}' for i,text in enumerate(json.loads(sys.argv[2]),1)))\nfor i in range(6): m.add_attachment(b'synthetic image observation '+str(i).encode(),maintype='image',subtype='png',filename=f'observation-{i+1}.png')\nPath(sys.argv[1]).write_bytes(m.as_bytes())`,path.join(directory,'source.eml'),JSON.stringify(config.requests)]);
  const c=await page.evaluate(async()=>{const p=await window.studio.request({action:'project.create',title:'Email synthétique — préparation de release'});const data=await window.studio.request({action:'bootstrap'});return window.studio.human({action:'conversation.open',project:p.id,provider:'codex',graph:data.templates.find(g=>g.id==='release-conversation')});});
  const terminal=await page.evaluate(c=>window.tricorder.workflowTerminal({project:c.project,conversation:c.id}),c);
  await expect.poll(()=>fs.existsSync(path.join(directory,'mail-agent-ready'))).toBe(true);
  await page.evaluate(id=>window.tricorder.terminals.write({session:id,data:'Va chercher cet email et prépare une release.\r'}),terminal.id);
  return {c,terminal,config};
}


(async()=>{
try {
 app=await electron.launch({args:[root,'--workflow-studio'],env:{...process.env,PATH:path.join(directory,'bin')+':'+process.env.PATH,TRICORDER_STATE_DIR:directory,TRICORDER_HOME:directory,TRICORDER_TEST_MODE:'1'},timeout:20000});
 page=await app.firstWindow();page.setDefaultTimeout(8000);await page.setViewportSize({width:1440,height:900});
 await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();await page.locator('[data-theme-choice=dark]').click();
  const {c,terminal}=await mailFixture('illustration');
  const snapshot=()=>page.evaluate(id=>window.studio.request({action:'conversation.get',conversation:id}),c.id);
  await expect.poll(async()=>{const s=await snapshot();return s.item_count===4 && s.items.filter(i=>i.execution.counts.waiting===1).length===3;},{timeout:20000}).toBe(true);
  const initial=await snapshot();
  const resources=await app.evaluate(()=>process.resourcesPath);const backend=process.env.TRICORDER_EXECUTABLE?path.join(resources,'backend'):path.join(root,'backend');
  const script=`import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\ne=Engine(sys.argv[2]);items=json.loads(sys.argv[3])\nfor index,item in enumerate(items[1:],2):\n r=e.run(item['run']);s=r['nodes']['scope'];e.decide(r['id'],'scope',s['nonce'],s['proposal'],'approve',human=True);claim=e.claim(r['id'],'work')\n if index==2:continue\n e.submit(r['id'],'work',claim['token'],{'ok':True,'summary':'Proposition synthétique, aucune application client modifiée.','outputs':{'result':f'Résultat R{index} : proposition prête pour contrôle, pas encore validée.'}})\n if index==4:\n  claim=e.claim(r['id'],'check');e.submit(r['id'],'check',claim['token'],{'ok':True,'summary':'QA synthétique en échec.','outputs':{'verdict':'fail','evidence_summary':'Le sous-total ne respecte pas le résultat attendu dans le scénario synthétique.'},'evidence':[e.artifact(b'Synthetic failed QA fixture, no client test performed.')]})\n`;
  const seeded=require('node:child_process').spawnSync('python3',['-c',script,backend,directory,JSON.stringify(initial.items)],{encoding:'utf8'});expect(seeded.status,seeded.stderr).toBe(0);
  await page.reload();await page.locator('[data-workflow-route="projects"]').click();await page.locator('.project-card').filter({hasText:initial.project_contexts[0].title}).click();await page.locator('[data-action=open-conversation]').click();
  await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();await expect(page.locator('.xterm-screen:visible')).toBeVisible();
  const cards=page.locator('.work-items button');await expect(cards).toHaveCount(4);
  await expect(cards.nth(0)).toContainText('Réponse attendue');await expect(cards.nth(1)).toContainText('En cours');await expect(cards.nth(2)).toContainText('Prête');await expect(cards.nth(3)).toContainText('Échec');
  await cards.nth(0).click();await expect(page.locator('.workflow-heading h1')).toHaveText('R1: Règle de distance contradictoire dans les devis.');await expect(page.locator('.breadcrumb')).toContainText('Workflow de la demande sélectionnée');
  await expect(page.locator('#inspector')).toContainText('Quelle règle de distance');await expect(page.locator('#inspector')).toContainText('original.eml');await expect(cards.nth(0)).toHaveAttribute('aria-pressed','true');


 await capture('final-mail-r1-graph-dark-1440');
 await page.getByRole('button',{name:'Lire le résultat',exact:true}).click();await capture('final-mail-r1-reading-dark-1440');
 await page.setViewportSize({width:1024,height:768});await capture('final-mail-r1-reading-dark-1024-768');
 await cards.nth(2).click();await expect(page.locator('.editor')).toHaveClass(/review-focus/);await expect(page.locator('#inspector')).toContainText('Résultat R3');await capture('final-mail-r3-reading-dark-1024-768');
 await cards.nth(3).click();await expect(page.locator('.editor')).toHaveClass(/review-focus/);await expect(page.locator('#inspector')).toContainText('Les contrôles ont échoué');await capture('final-mail-r4-reading-dark-1024-768');
 await page.getByRole('button',{name:'Graphe et détail',exact:true}).click();
 const focus=page.locator('.node.selected');const canvas=page.locator('.canvas-scroll');
 await expect(focus).toHaveAttribute('data-id','failure');
 await expect.poll(async()=>{const n=await focus.boundingBox(),c=await canvas.boundingBox();return n.x+n.width/2>c.x && n.x+n.width/2<c.x+c.width && n.y+n.height/2>c.y && n.y+n.height/2<c.y+c.height;}).toBe(true);
 facts.focusNode=await focus.boundingBox();facts.focusCanvas=await canvas.boundingBox();
 expect(facts.focusNode.x+facts.focusNode.width/2).toBeGreaterThan(facts.focusCanvas.x);expect(facts.focusNode.x+facts.focusNode.width/2).toBeLessThan(facts.focusCanvas.x+facts.focusCanvas.width);
 expect(facts.focusNode.y+facts.focusNode.height/2).toBeGreaterThan(facts.focusCanvas.y);expect(facts.focusNode.y+facts.focusNode.height/2).toBeLessThan(facts.focusCanvas.y+facts.focusCanvas.height);
 await capture('final-mail-r4-focused-graph-dark-1024-768');
 await canvas.evaluate(e=>{e.scrollLeft=0;e.scrollTop=0});await page.waitForTimeout(2500);facts.scrollAfterPolling=await canvas.evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}));expect(facts.scrollAfterPolling).toEqual({x:0,y:0});
 await page.setViewportSize({width:1440,height:900});await cards.nth(0).click();await expect(cards.nth(0)).toHaveAttribute('aria-pressed','true');await page.locator('[data-action=terminal-layout]').click();
 const selector=page.locator('.request-selector');await expect(selector.locator(':scope > summary')).toBeVisible();await expect(selector).not.toHaveAttribute('open','');
 await page.getByRole('button',{name:'Lire le résultat',exact:true}).click();
 await expect(page.getByRole('button',{name:'Répondre',exact:true})).toBeInViewport({ratio:1});
 await expect(page.locator('#question-form textarea')).toBeInViewport({ratio:1});
 await capture('final-mail-r1-stacked-dark-1440');
 await page.locator('[data-theme-choice=light]').click();await capture('final-mail-r1-stacked-light-1440');
 await selector.locator(':scope > summary').click();await expect(cards).toHaveCount(4);for(let i=0;i<4;i++)await expect(cards.nth(i)).toBeVisible();await capture('final-mail-requests-stacked-light-1440');
 await cards.nth(2).click();await expect(selector).not.toHaveAttribute('open','');await expect(page.locator('.workflow-heading h1')).toContainText('R3');await expect(page.locator('.editor')).toHaveClass(/review-focus/);await capture('final-mail-r3-stacked-light-1440');
 facts.sameTerminal=(await page.evaluate(()=>window.tricorder.terminals.list())).map(s=>({id:s.id,pid:s.pid,alive:s.alive}));expect(facts.sameTerminal).toEqual([{id:terminal.id,pid:terminal.pid,alive:true}]);
 await page.locator('[data-workflow-route=overview]').click();await expect(page.getByRole('heading',{name:'Tableau de bord',exact:true})).toBeVisible();
 const r4=page.locator('tbody tr').filter({hasText:'R4:'});await expect(r4).toContainText('Échec');await expect(page.locator('tbody')).not.toContainText('sources/');await capture('final-mail-dashboard-light-1440');
 } finally {
 fs.writeFileSync(path.join(output,'final-layout-results.json'),JSON.stringify(facts,null,2)+'\n');
 if(app){if(page&&!page.isClosed())await page.evaluate(()=>window.tricorder.terminals.list());await app.close().catch(()=>{})}
 await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));await cleanupBroker(path.join(directory,'studio-pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }
 console.log(JSON.stringify({views:Object.keys(facts.views),failures:facts.failures,focusNode:facts.focusNode,focusCanvas:facts.focusCanvas,scrollAfterPolling:facts.scrollAfterPolling,sameTerminal:facts.sameTerminal}));
})().catch(e=>{facts.failures.push({error:e.message});fs.writeFileSync(path.join(output,'final-layout-results.json'),JSON.stringify(facts,null,2)+'\n');console.error(e);process.exitCode=1});

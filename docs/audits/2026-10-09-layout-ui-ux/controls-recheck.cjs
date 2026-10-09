// Independent visual audit. Synthetic state, projects and PTYs only.
const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const crypto = require('node:crypto');
const { cleanupBroker } = require('../../../tests/terminal-fixture.cjs');
const root = path.resolve(__dirname, '../../..');
const output = __dirname;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-layout-controls-review-'));
let app,page;
const facts={build:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist/app.js'))).digest('hex'), captured:new Date().toISOString(),views:{},failures:[]};

const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
async function capture(name){
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
 await page.screenshot({path:path.join(output,name+'.png')});
 facts.views[name]=await page.evaluate(()=>{
  const shadow=document.querySelector('#workflow-panel')?.shadowRoot;
  const nodes=[...document.querySelectorAll('h1,h2,h3,button,label,input,select,p,summary,.side-heading,.project-identity,.terminal-heading')];
  if(shadow)nodes.push(...shadow.querySelectorAll('h1,h2,h3,button,label,input,select,p,summary,.pill,.node,.inspector,.canvas-scroll,.page-heading,.conversation-tray,.toolbar'));
  const out=[];
  for(const e of nodes){const b=e.getBoundingClientRect(),s=getComputedStyle(e);if(b.width<=0||b.height<=0||b.bottom<0||b.top>=innerHeight||s.visibility==='hidden')continue;
   out.push({tag:e.tagName,id:e.id,class:e.className,text:(e.innerText||e.getAttribute('aria-label')||'').slice(0,160),box:{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom},font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,color:s.color,background:s.backgroundColor,overflow:e.scrollWidth>e.clientWidth+2,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth});}
  const box=sel=>{const e=document.querySelector(sel)||shadow?.querySelector(sel);if(!e)return null;const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height}};
  return{width:innerWidth,height:innerHeight,devicePixelRatio:window.devicePixelRatio,theme:document.documentElement.dataset.theme,rootOverflow:document.documentElement.scrollWidth>innerWidth,fontStatus:document.fonts.status,terminal:box('#terminal-workspace'),workflow:box('#workflow-panel'),canvas:box('.canvas-scroll'),inspector:box('#inspector'),elements:out};
 });
 fs.writeFileSync(path.join(output,'controls-recheck-results.json'),JSON.stringify(facts,null,2)+'\n');
}
async function navigate(route){ await page.locator(`[data-workflow-route="${route}"]`).click(); const expected={overview:'Un workflow clair.',library:'Modèles de workflows',projects:'Vos projets',global:'Workflows globaux',connections:'Connexions',schedules:'Planifications'}[route];await expect(page.getByRole('heading',{name:expected,exact:route!=='overview',level:route==='projects'?2:1})).toBeVisible(); }
async function closeDialog(){const c=page.getByRole('button',{name:'Fermer la fenêtre',exact:true});if(await c.isVisible())await c.click();else{const c2=page.getByRole('button',{name:'Fermer',exact:true});if(await c2.isVisible())await c2.click();else await page.keyboard.press('Escape');}}
async function attempt(name,fn){try{await fn()}catch(e){facts.failures.push({name,error:e.message.slice(0,600)});console.log('FAIL',name,e.message.slice(0,200))}}

(async()=>{try{
 app=await electron.launch({args:[root,'--workflow-studio'],env:{...process.env,TRICORDER_STATE_DIR:directory,TRICORDER_HOME:directory,TRICORDER_TEST_MODE:'1'},timeout:20000});
 page=await app.firstWindow();page.setDefaultTimeout(8000);await page.setViewportSize({width:1440,height:900});
 await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();await page.locator('[data-theme-choice=light]').click();
 await navigate('global');await capture('after-global-filters-light-1440');
 await navigate('projects');await page.getByRole('button',{name:'Essayer un exemple',exact:true}).click();await expect(page.locator('.node')).toHaveCount(6);await page.locator('.node[data-id=analyse]').click();
 await capture('after-editor-io-light-1440');
 facts.io=await page.locator('.port-section').evaluateAll(els=>els.map(e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e.parentElement);return{y:b.y,height:b.height,border:s.borderStyle}}));
 expect(facts.io).toHaveLength(2);expect(facts.io[1].y).toBeGreaterThan(facts.io[0].y+facts.io[0].height);expect(facts.io[0].border).toBe('solid');
 await page.getByRole('button',{name:'Ajouter une sortie',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await capture('after-io-dialog-light-1440');
 await page.getByRole('button',{name:'Ajouter la donnée',exact:true}).focus();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Fermer la fenêtre',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'Choisir l’IA',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await capture('after-ai-dialog-light-1440');await closeDialog();
 await page.locator('[data-cockpit=preferences]').click();await expect(page.locator('#modal')).toBeVisible();await capture('after-preferences-light-1440');await closeDialog();
 const project=await call('project.create',{title:'Diagnostic synthétique'});
 const diagnostic='Constat\nLe planning du projet est vide alors que des règles de jalons sont configurées. Les captures montrent la configuration, mais elles ne prouvent pas que la génération a été lancée.\n\nHypothèse à vérifier\nLe déclencheur de création des tâches dépend peut-être de la confirmation du devis. Cette hypothèse doit être reproduite sur une copie locale avec les mêmes paramètres.\n\nProchaine action\nConfirmer l’état du devis source, reproduire sa confirmation puis comparer les tâches et les dates attendues. Aucune modification ni livraison client n’a été effectuée.';
 const graph={schema:1,id:'diagnostic-review',title:'Diagnostic et validation',nodes:[{id:'analyse',kind:'task',title:'Examiner le planning',outputs:{diagnostic:'string'},validation:'contract',sample_outputs:{diagnostic},position:{x:40,y:80}},{id:'review',kind:'decision',title:'Valider le diagnostic',inputs:{diagnostic:'string'},question:'Les observations sont-elles suffisantes pour préparer le test de reproduction ?',position:{x:360,y:80}}],edges:[{id:'a-r',from:'analyse',to:'review',mapping:{diagnostic:'diagnostic'}}]};
 await call('workflow.save',{project:project.id,graph});const run=await call('run.start',{project:project.id,graph,simulation:true});await expect.poll(async()=>(await call('run.get',{run:run.id})).run.nodes.review.status).toBe('waiting');
 await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.getByRole('button',{name:'Consulter',exact:true}).click();await page.locator('.node[data-id=review]').click();await page.getByRole('button',{name:'Lire le résultat',exact:true}).click();await expect(page.locator('.execution-value .prose')).toContainText('Hypothèse à vérifier');await capture('after-diagnostic-readable-light-1440');
 facts.prose=await page.locator('.execution-value .prose').evaluate(e=>({font:getComputedStyle(e).fontFamily,whiteSpace:getComputedStyle(e).whiteSpace,lineHeight:getComputedStyle(e).lineHeight,size:getComputedStyle(e).fontSize,width:e.getBoundingClientRect().width}));expect(facts.prose.font).toContain('IBM Plex Sans');expect(facts.prose.whiteSpace).toBe('pre-wrap');
 facts.keyboardDialog='Tab loops to close; Escape closes';
 }finally{fs.writeFileSync(path.join(output,'controls-recheck-results.json'),JSON.stringify(facts,null,2)+'\n');if(app){if(page&&!page.isClosed())await page.evaluate(()=>window.tricorder.terminals.list());await app.close().catch(()=>{})}await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));await cleanupBroker(path.join(directory,'studio-pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
 console.log(JSON.stringify({views:Object.keys(facts.views),io:facts.io,prose:facts.prose,failures:facts.failures}));
})().catch(e=>{console.error(e);process.exitCode=1});

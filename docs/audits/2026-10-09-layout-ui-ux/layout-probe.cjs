// Independent visual audit. Synthetic state, projects and PTYs only.
const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const crypto = require('node:crypto');
const { cleanupBroker } = require('../../../tests/terminal-fixture.cjs');
const root = path.resolve(__dirname, '../../..');
const output = __dirname;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-layout-review-'));
let app,page;
const facts={build:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist/app.js'))).digest('hex'), captured:new Date().toISOString(),views:{},failures:[]};
if(process.env.LAYOUT_STAGE==='editor')facts.views=JSON.parse(fs.readFileSync(path.join(output,'layout-results.json'))).views;
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
 fs.writeFileSync(path.join(output,'layout-results.json'),JSON.stringify(facts,null,2)+'\n');
}
async function navigate(route){ await page.locator(`[data-workflow-route="${route}"]`).click(); const expected={overview:'Un workflow clair.',library:'Modèles de workflows',projects:'Vos projets',global:'Workflows globaux',connections:'Connexions',schedules:'Planifications'}[route];await expect(page.getByRole('heading',{name:expected,exact:route!=='overview',level:route==='projects'?2:1})).toBeVisible(); }
async function closeDialog(){const c=page.getByRole('button',{name:'Fermer la fenêtre',exact:true});if(await c.isVisible())await c.click();else{const c2=page.getByRole('button',{name:'Fermer',exact:true});if(await c2.isVisible())await c2.click();else await page.keyboard.press('Escape');}}
async function attempt(name,fn){try{await fn()}catch(e){facts.failures.push({name,error:e.message.slice(0,600)});console.log('FAIL',name,e.message.slice(0,200))}}
(async()=>{
 try{
  app=await electron.launch({args:[root,'--workflow-studio'],env:{...process.env,TRICORDER_STATE_DIR:directory,TRICORDER_HOME:directory,TRICORDER_TEST_MODE:'1'},timeout:20000});
  page=await app.firstWindow();page.setDefaultTimeout(8000);await page.setViewportSize({width:1440,height:900});
  await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();
  if(process.env.LAYOUT_STAGE!=='editor'){
  for(const theme of ['light','dark']){
   await page.locator(`[data-theme-choice="${theme}"]`).click();
   await navigate('projects');await capture('welcome-'+theme+'-1440');
   for(const route of ['overview','library','projects','global','connections','schedules'])await attempt(route+'-'+theme,async()=>{
    const el=page.locator(`[data-workflow-route="${route}"]`);if(!(await el.isVisible())&&await page.locator('.sidebar-tools').count())await page.locator('.sidebar-tools').evaluate(e=>e.open=true);
    await navigate(route);await capture(route+'-'+theme+'-1440');
   });
  }
  for(const width of [1024,800]){
   await page.setViewportSize({width,height:900});
   for(const route of ['overview','library','connections'])await attempt(route+'-'+width,async()=>{await navigate(route);await capture(route+'-dark-'+width)});
  }
  await page.setViewportSize({width:1440,height:900});
  for(const name of ['preferences'])await attempt(name,async()=>{
   await page.locator('.sidebar-tools').evaluate(e=>e.open=true);
   await page.locator(`[data-cockpit="${name}"]`).click();await capture(name+'-dark-1440');await closeDialog();
  });
  for(const action of ['workflow-updates','about'])await attempt(action,async()=>{await page.locator(`[data-action="${action}"]`).click();await capture(action+'-dark-1440');await closeDialog()});
  }
  await page.locator('[data-theme-choice=dark]').click();await navigate('projects');await page.getByRole('button',{name:'Essayer un exemple',exact:true}).click();
  await expect(page.locator('.node')).toHaveCount(6);await capture('editor-dark-1440');
  await page.locator('.node[data-id="analyse"]').click();await capture('editor-inspector-dark-1440');
  await page.getByRole('button',{name:'Ajouter une sortie',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await capture('io-dialog-dark-1440');await closeDialog();
  await page.getByRole('button',{name:'Choisir l’IA',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await capture('ai-dialog-dark-1440');await closeDialog();
  await page.getByRole('button',{name:'Exécuter…',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await capture('launch-dialog-dark-1440');await page.getByRole('button',{name:'Simuler le parcours',exact:true}).click();
  await expect(page.locator('.node[data-id="analyse"]')).toHaveAttribute('data-status','returned');
  await page.locator('.node[data-id="analyse"]').click();await capture('result-dark-1440');
  await page.getByRole('button',{name:'Ouvrir le terminal du workflow',exact:true}).click();await expect(page.locator('#terminal-workspace')).toBeVisible();
  await capture('result-terminal-dark-1440');
  for(const width of [1024,800]){await page.setViewportSize({width,height:900});await capture('result-terminal-dark-'+width)}
  await page.setViewportSize({width:1440,height:900});await page.locator('[data-action="terminal-layout"]').click();await capture('result-terminal-stacked-dark-1440');
  await page.getByRole('tab',{name:'Rapport',exact:true}).click();await capture('report-terminal-stacked-dark-1440');
  await page.locator('[data-action="terminal-toggle"]').click();await capture('report-dark-1440');
  await page.getByRole('tab',{name:'Historique',exact:true}).click();await capture('journal-dark-1440');
 }finally{
  fs.writeFileSync(path.join(output,'layout-results.json'),JSON.stringify(facts,null,2)+'\n');
  if(app){if(page&&!page.isClosed())await page.evaluate(()=>window.tricorder.terminals.list());await app.close().catch(()=>{})}
  await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));await cleanupBroker(path.join(directory,'studio-pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }
 console.log(JSON.stringify({views:Object.keys(facts.views),failures:facts.failures}));
})().catch(e=>{console.error(e);process.exitCode=1});

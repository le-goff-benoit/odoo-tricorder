// Independent visual audit. Synthetic state, projects and PTYs only.
const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const crypto = require('node:crypto');
const { cleanupBroker } = require('../../../tests/terminal-fixture.cjs');
const root = path.resolve(__dirname, '../../..');
const output = __dirname;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-layout-qa-review-'));
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
 fs.writeFileSync(path.join(output,'qa-control-recheck-results.json'),JSON.stringify(facts,null,2)+'\n');
}
async function navigate(route){ await page.locator(`[data-workflow-route="${route}"]`).click(); const expected={overview:'Un workflow clair.',library:'Modèles de workflows',projects:'Vos projets',global:'Workflows globaux',connections:'Connexions',schedules:'Planifications'}[route];await expect(page.getByRole('heading',{name:expected,exact:route!=='overview',level:route==='projects'?2:1})).toBeVisible(); }
async function closeDialog(){const c=page.getByRole('button',{name:'Fermer la fenêtre',exact:true});if(await c.isVisible())await c.click();else{const c2=page.getByRole('button',{name:'Fermer',exact:true});if(await c2.isVisible())await c2.click();else await page.keyboard.press('Escape');}}
async function attempt(name,fn){try{await fn()}catch(e){facts.failures.push({name,error:e.message.slice(0,600)});console.log('FAIL',name,e.message.slice(0,200))}}

(async()=>{try{
 app=await electron.launch({args:[root,'--workflow-studio'],env:{...process.env,TRICORDER_STATE_DIR:directory,TRICORDER_HOME:directory,TRICORDER_TEST_MODE:'1'},timeout:20000});
 page=await app.firstWindow();page.setDefaultTimeout(8000);await page.setViewportSize({width:1440,height:900});
 await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();await page.locator('[data-theme-choice=light]').click();
 await page.getByRole('button',{name:'Essayer un exemple',exact:true}).click();await expect(page.locator('.node')).toHaveCount(6);await page.locator('.node[data-id=analyse]').click();
 const qa=()=>page.getByLabel('Contrôle QA du candidat',{exact:true});
 await page.getByLabel('Nom du bloc',{exact:true}).fill('Vérifier le candidat sans agent imposé');
 await qa().focus();await page.keyboard.press('Space');await expect(qa()).toBeChecked();
 await page.getByRole('button',{name:'Ajouter une sortie',exact:true}).click();await page.getByLabel('Nom (sans espaces)').fill('evidence_summary');await page.getByRole('button',{name:'Ajouter la donnée',exact:true}).click();
 await expect(qa()).toBeChecked();await expect(page.getByLabel('Nom du bloc',{exact:true})).toHaveValue('Vérifier le candidat sans agent imposé');
 await expect(page.locator('.ports')).toContainText('candidate');await expect(page.locator('.ports')).toContainText('verdict');await expect(page.locator('.ports')).toContainText('evidence_summary');
 await page.locator('.node[data-id=build]').click();await page.locator('.node[data-id=analyse]').click();await expect(qa()).toBeChecked();
 await qa().scrollIntoViewIfNeeded();await capture('qa-candidate-checked-light-1440');
 await page.setViewportSize({width:1024,height:768});await page.locator('[data-theme-choice=dark]').click();await qa().scrollIntoViewIfNeeded();await capture('qa-candidate-checked-dark-1024');
 facts.checkbox=await qa().evaluate(e=>{const l=e.closest('label'),f=e.closest('fieldset'),b=e.getBoundingClientRect(),lb=l.getBoundingClientRect();return{label:l.innerText,font:getComputedStyle(l).fontFamily,fontSize:getComputedStyle(l).fontSize,weight:getComputedStyle(l).fontWeight,box:{x:b.x,y:b.y,w:b.width,h:b.height},labelBox:{x:lb.x,y:lb.y,w:lb.width,h:lb.height},help:f.querySelector('small').innerText}});
 await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').first().click();await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();await page.locator('.node[data-id=analyse]').click();await expect(qa()).toBeChecked();
 await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await expect(page.locator('.workflow-heading p')).toContainText('Enregistré');
 const snapshot=async()=>page.evaluate(async()=>{const p=(await window.studio.request({action:'bootstrap'})).projects[0];const d=await window.studio.request({action:'project.get',project:p.id});return d.workflows[0].nodes.find(n=>n.id==='analyse')});
 facts.checked=await snapshot();expect(facts.checked.candidate_check).toBe(true);expect(facts.checked.inputs.candidate).toBe('object');expect(facts.checked.outputs.verdict).toBe('string');expect(facts.checked.outputs.evidence_summary).toBe('string');
 await qa().focus();await page.keyboard.press('Space');await expect(qa()).not.toBeChecked();await page.locator('.node[data-id=build]').click();await page.locator('.node[data-id=analyse]').click();await expect(qa()).not.toBeChecked();
 await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await expect(page.locator('.workflow-heading p')).toContainText('Enregistré');await page.reload();await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').first().click();await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();await page.locator('.node[data-id=analyse]').click();await expect(qa()).not.toBeChecked();facts.unchecked=await snapshot();expect(facts.unchecked.candidate_check).toBe(false);
 await qa().scrollIntoViewIfNeeded();await capture('qa-candidate-unchecked-dark-1024');
 }finally{fs.writeFileSync(path.join(output,'qa-control-recheck-results.json'),JSON.stringify(facts,null,2)+'\n');if(app){if(page&&!page.isClosed())await page.evaluate(()=>window.tricorder.terminals.list());await app.close().catch(()=>{})}await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));await cleanupBroker(path.join(directory,'studio-pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
 console.log(JSON.stringify({views:Object.keys(facts.views),checked:facts.checked,unchecked:facts.unchecked,failures:facts.failures}));
})().catch(e=>{facts.failures.push({error:e.message});fs.writeFileSync(path.join(output,'qa-control-recheck-results.json'),JSON.stringify(facts,null,2)+'\n');console.error(e);process.exitCode=1});

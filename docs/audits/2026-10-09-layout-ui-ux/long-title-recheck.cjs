// Focused independent reception; synthetic Electron profile only, no renderer build.
const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {cleanupBroker}=require('../../../tests/terminal-fixture.cjs');
const root=path.resolve(__dirname,'../../..'), directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-layout-title-'));
const title='Vérifier le candidat sans agent imposé';
const facts={build:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist/app.js'))).digest('hex'),captured:new Date().toISOString(),views:{},failures:[]};
let app,page;
async function capture(name){
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
 const geometry=await page.locator('.node[data-id=analyse]').evaluate(node=>{
  const box=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};
  const mission=node.querySelector('.mission'),kind=node.querySelector('.kind'),main=node.querySelector('.node-main'),footer=node.querySelector('.node-footer'),s=getComputedStyle(mission),bounds=box(mission);
  const canvas=node.closest('.canvas');let edgeHits=0;
  for(const edge of canvas.querySelectorAll('path.edge')){const length=edge.getTotalLength(),matrix=edge.getScreenCTM();for(let i=0;i<=100;i++){const point=edge.getPointAtLength(length*i/100).matrixTransform(matrix);if(point.x>bounds.x&&point.x<bounds.right&&point.y>bounds.y&&point.y<bounds.bottom)edgeHits++;}}
  return{node:box(node),mission:bounds,main:box(main),kind:box(kind),footer:box(footer),ports:[...node.querySelectorAll('.port')].map(box),title:mission.getAttribute('title'),aria:node.getAttribute('aria-label'),text:mission.innerText,whiteSpace:s.whiteSpace,overflowWrap:s.overflowWrap,lineClamp:s.webkitLineClamp,lineHeight:s.lineHeight,clientHeight:mission.clientHeight,scrollHeight:mission.scrollHeight,edgeHits,rootOverflow:document.documentElement.scrollWidth>innerWidth};
 });
 facts.views[name]=geometry;
 expect(geometry.mission.x).toBeGreaterThanOrEqual(geometry.node.x);
 expect(geometry.mission.right).toBeLessThanOrEqual(geometry.node.right);
 expect(geometry.mission.bottom).toBeLessThan(geometry.kind.y);
 expect(geometry.kind.bottom).toBeLessThan(geometry.footer.y);
 expect(geometry.main.bottom).toBeLessThanOrEqual(geometry.footer.y+.1);
 expect(geometry.clientHeight).toBeGreaterThan(parseFloat(geometry.lineHeight)*1.8);
 expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.clientHeight+1);
 expect(geometry.whiteSpace).toBe('normal');expect(geometry.edgeHits).toBe(0);expect(geometry.rootOverflow).toBe(false);
 expect(geometry.title).toBe(title);expect(geometry.aria).toContain(title);
 await page.screenshot({path:path.join(__dirname,name+'.png')});
}
(async()=>{try{
 app=await electron.launch({args:[root,'--workflow-studio'],env:{...process.env,TRICORDER_STATE_DIR:directory,TRICORDER_HOME:directory,TRICORDER_TEST_MODE:'1'},timeout:20000});
 page=await app.firstWindow();page.setDefaultTimeout(8000);await page.setViewportSize({width:1440,height:900});
 await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();await page.locator('[data-theme-choice=light]').click();
 await page.getByRole('button',{name:'Essayer un exemple',exact:true}).click();await expect(page.locator('.node')).toHaveCount(6);await page.locator('.node[data-id=analyse]').click();
 await page.getByLabel('Nom du bloc',{exact:true}).fill(title);await page.getByLabel('Contrôle QA du candidat',{exact:true}).check();
 await page.getByRole('button',{name:'Ajouter une sortie',exact:true}).click();await page.getByLabel('Nom (sans espaces)').fill('evidence_summary');await page.getByRole('button',{name:'Ajouter la donnée',exact:true}).click();
 await page.getByLabel('Contrôle QA du candidat',{exact:true}).scrollIntoViewIfNeeded();await capture('qa-title-wrapped-light-1440');
 await page.setViewportSize({width:1024,height:768});await page.locator('[data-theme-choice=dark]').click();await page.getByLabel('Contrôle QA du candidat',{exact:true}).scrollIntoViewIfNeeded();await capture('qa-title-wrapped-dark-1024');
 }catch(error){facts.failures.push(error.message);process.exitCode=1;}finally{
 fs.writeFileSync(path.join(__dirname,'long-title-recheck-results.json'),JSON.stringify(facts,null,2)+'\n');
 if(app){if(page&&!page.isClosed())await page.evaluate(()=>window.tricorder.terminals.list());await app.close().catch(()=>{});}
 await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));await cleanupBroker(path.join(directory,'studio-pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }console.log(JSON.stringify(facts));
})();

// Independent visual audit. Synthetic state, projects and PTYs only.
const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const crypto = require('node:crypto');
const { cleanupBroker } = require('../../../tests/terminal-fixture.cjs');
const root = path.resolve(__dirname, '../../..');
const output = __dirname;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-layout-legacy-review-'));
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
 fs.writeFileSync(path.join(output,'legacy-layout-results.json'),JSON.stringify(facts,null,2)+'\n');
}
async function navigate(route){ await page.locator(`[data-workflow-route="${route}"]`).click(); const expected={overview:'Un workflow clair.',library:'Modèles de workflows',projects:'Vos projets',global:'Workflows globaux',connections:'Connexions',schedules:'Planifications'}[route];await expect(page.getByRole('heading',{name:expected,exact:route!=='overview',level:route==='projects'?2:1})).toBeVisible(); }
async function closeDialog(){const c=page.getByRole('button',{name:'Fermer la fenêtre',exact:true});if(await c.isVisible())await c.click();else{const c2=page.getByRole('button',{name:'Fermer',exact:true});if(await c2.isVisible())await c2.click();else await page.keyboard.press('Escape');}}
async function attempt(name,fn){try{await fn()}catch(e){facts.failures.push({name,error:e.message.slice(0,600)});console.log('FAIL',name,e.message.slice(0,200))}}
function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'object' ? JSON.stringify(value, null, 2) : value);
}
function fixture(home) {
  const project = path.join(home, 'orbital-industries');
  const releaseId = '2026-09-11_01_facturation-et-maintenance';
  const release = path.join(project, 'changelog', releaseId);
  write(path.join(project, '.odoo-agents/config'), 'series = 19.0\n');
  write(path.join(project, 'orbital_custom/__manifest__.py'), "{'name': 'Orbital', 'version': '19.0.1.0.0'}\n");
  write(path.join(project, '.odoo-agents/PROJECT.md'), '# Orbital Industries\n\nProjet synthétique de démonstration.');
  write(path.join(project, '.odoo-agents/JOURNAL.md'), '# Journal\n\nLe suivi des missions est opérationnel.');
  write(path.join(project, '.odoo-agents/instances.json'), {
    local: { kind: 'local', url: 'http://localhost:8069', db: 'orbital_test', platform: 'docker' },
    staging: { kind: 'staging', url: 'https://staging.example.test', db: 'orbital_staging', platform: 'odoo.sh' },
    production: { kind: 'production', url: 'https://example.test', db: 'orbital', platform: 'odoo.sh' },
  });
  write(path.join(release, 'README.md'), '<!-- release ouverte -->\n# Facturation & maintenance récurrente\n\nUne release synthétique pour les tests du cockpit.');
  write(path.join(release, 'demande.md'), '# Demande\n\nFiabiliser la facturation et les interventions récurrentes.');
  const source = { path: `changelog/${releaseId}/demande.md`, sha256: require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(release, 'demande.md'))).digest('hex') };
  write(path.join(release, 'knowledge/K01.json'), { schema: 1, id: 'K01', kind: 'question', state: 'proposed',
    statement: 'Préciser l’exception pour la société B.', author: 'Codex · analyste', scope: [], sources: [source] });
  const task = (id, title, extra = {}) => ({ id, title, request: `changelog/${releaseId}/demande.md`,
    acceptance: ['Les scénarios ciblés sont vérifiés sur copie locale.', 'Les résultats sont associés à une preuve.'],
    risk: 'normal', route: 'module', scopes: ['orbital_custom'], depends_on: [], ...extra });
  write(path.join(release, 'plan.json'), { schema: 1, tasks: [
    task('T01', 'Fiabiliser les factures partielles', { receipt: { contract_sha256: 'old' }, risk: 'high' }),
    task('T02', 'Planifier les interventions récurrentes', { attempts: [{ flow: '.odoo-agents/flows/maintenance.json' }] }),
    task('T03', 'Recetter les documents de la release', { depends_on: ['T01', 'T02'] }),
  ] });
  const nodes = { review: { description: 'Revue fonctionnelle', executor: 'agent', role: 'odoo-analyst' },
    build: { description: 'Développement du module', executor: 'agent', role: 'odoo-developer', locks: [] },
    qa: { description: 'Validation sur copie locale', executor: 'agent', role: 'odoo-tester', locks: [] } };
  write(path.join(project, '.odoo-agents/flows/maintenance.json'), { schema_version: 1, run_id: 'maintenance',
    project, kind: 'development', status: 'active', created_at: '2026-09-11T09:00:00Z', updated_at: '2026-09-11T09:12:00Z',
    graph_snapshot: { start: 'review', nodes, edges: [{ id: 'a', from: 'review', to: 'build', outcome: 'done' }, { id: 'b', from: 'build', to: 'qa', outcome: 'done' }] },
    events: [{ node: 'review', at: '2026-09-11T09:05:00Z', outcome: 'done', note: 'Périmètre et critères vérifiés.' }], tokens: {},
    claims: { build: { owner: 'Codex · développeur', at: '2026-09-11T09:12:00Z', locks: [{ resource: 'orbital_custom', mode: 'write' }] } } });
  write(path.join(home, 'nova-services/.odoo-agents/config'), 'series = 18.0\n');
  write(path.join(home, 'equinox-studio/.odoo-agents/config'), 'series = 19.1\n');
  return { project, releaseId };
}


(async()=>{try{
 const {project,releaseId}=fixture(directory);
 app=await electron.launch({args:[root],env:{...process.env,TRICORDER_STATE_DIR:path.join(directory,'state'),TRICORDER_HOME:directory,TRICORDER_RUNTIME_DIR:path.join(directory,'run'),TRICORDER_TEST_MODE:'1'},timeout:20000});
 page=await app.firstWindow();page.setDefaultTimeout(8000);await page.setViewportSize({width:1440,height:900});
 await expect(page.locator('#release-select')).toHaveValue(releaseId);
 await page.locator('[data-theme-choice=dark]').click();
 for(const view of ['work','plan','intentions','knowledge','effort','express','agents']) await attempt(view,async()=>{
  const t=page.locator(`#tabs [data-view="${view}"]`);await t.click();await expect(t).toHaveAttribute('aria-current','page');await page.waitForTimeout(500);await capture('legacy-'+view+'-dark-1440');
 });
 await page.locator('.sidebar-tools').evaluate(e=>e.open=true);
 for(const name of ['quotas','palette']) await attempt(name,async()=>{await page.locator(`[data-cockpit="${name}"]`).click();await expect(page.locator('#modal')).toBeVisible();await capture(name+'-dark-1440');await closeDialog()});
 await page.locator('[data-view=kanban]').first().click();await page.waitForTimeout(400);await capture('legacy-kanban-dark-1440');
 await page.setViewportSize({width:1024,height:768});await page.locator('[data-theme-choice=light]').click();await capture('legacy-kanban-light-1024');
 }finally{
 fs.writeFileSync(path.join(output,'legacy-layout-results.json'),JSON.stringify(facts,null,2)+'\n');
 if(app){if(page&&!page.isClosed())await page.evaluate(()=>window.tricorder.terminals.list());await app.close().catch(()=>{})}
 await cleanupBroker(path.join(directory,'run/pty.sock'));await cleanupBroker(path.join(directory,'state/studio-pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }console.log(JSON.stringify({views:Object.keys(facts.views),failures:facts.failures}));
})().catch(e=>{console.error(e);process.exitCode=1});

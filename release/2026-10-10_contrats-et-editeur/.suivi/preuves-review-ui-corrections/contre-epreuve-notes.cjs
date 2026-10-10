const { _electron: electron, expect } = require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root='/home/blegoff/odoo-tricorder';
const {cleanupBroker}=require(root+'/tests/terminal-fixture.cjs');
const out='/tmp/tricorder-ui-corrections-notes';fs.mkdirSync(out,{recursive:true});
const dir=fs.mkdtempSync('/tmp/tricorder-ui-independent-state-'),bin=path.join(dir,'bin');fs.mkdirSync(bin);
for(const name of ['codex','claude'])fs.writeFileSync(path.join(bin,name),'#!/bin/sh\nprintf "REVIEW_INERT\\n"\nexit 78\n',{mode:0o755});
let app,page;const evidence={geometry:[],checks:[]};
const buildFiles=['dist/app.js','dist/app.css','dist/studio.css'];const hashBuild=()=>Object.fromEntries(buildFiles.map(p=>[p,require('node:crypto').createHash('sha256').update(fs.readFileSync(root+'/'+p)).digest('hex')]));const buildBefore=hashBuild();
function engine(source, value){const p=spawnSync('/usr/bin/python3',['-c',`import sys,json\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\ne=Engine(sys.argv[2]);p=json.load(sys.stdin)\n${source}`,root+'/backend',path.join(dir,'workflows')],{input:JSON.stringify(value),encoding:'utf8',env:{PATH:'/usr/bin:/bin',HOME:dir,PYTHONDONTWRITEBYTECODE:'1'}});if(p.status!==0)throw Error(p.stderr);return JSON.parse(p.stdout);}
async function checkSelected(label){
 const geometry=()=>page.locator('.canvas-scroll').evaluate(el=>{const v=el.getBoundingClientRect(),node=el.querySelector('.node[data-id=work]'),h=node.querySelector('.execution-node-summary')||node,r=h.getBoundingClientRect();return {viewport:v.toJSON(),card:node.getBoundingClientRect().toJSON(),heading:r.toJSON(),inside:r.left>=v.left-1&&r.right<=v.right+1&&r.top>=v.top-1&&r.bottom<=v.bottom+1};});
 await expect.poll(async()=>(await geometry()).inside).toBe(true);evidence.geometry.push({label,...await geometry()});
}
async function noteOverlaps(){return page.locator('.canvas').evaluate(el=>{
 const notes=[...el.querySelectorAll('.graph-note')].map(x=>x.getBoundingClientRect()),bad=[];
 const inside=(p,r)=>p.x>r.left+1&&p.x<r.right-1&&p.y>r.top+1&&p.y<r.bottom-1;
 for(const label of el.querySelectorAll('.edge-label-background')){const r=label.getBoundingClientRect();if(notes.some(n=>r.left<n.right&&r.right>n.left&&r.top<n.bottom&&r.bottom>n.top))bad.push('label');}
 for(const path of el.querySelectorAll('path.edge'))for(let d=0;d<path.getTotalLength();d+=5){const p=path.getPointAtLength(d).matrixTransform(path.getScreenCTM());if(notes.some(r=>inside(p,r))){bad.push('route');break;}}
 return bad;
});}
async function projectOpen(project){await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();}
(async()=>{try{
app=await electron.launch({args:[root],env:{PATH:bin+':/usr/bin:/bin',HOME:dir,DISPLAY:':188',XAUTHORITY:'/tmp/tricorder-collections-panel/188/Xauthority',LANG:'C.UTF-8',XDG_CONFIG_HOME:dir+'/config',XDG_DATA_HOME:dir+'/data',XDG_CACHE_HOME:dir+'/cache',CODEX_HOME:dir+'/codex',CLAUDE_CONFIG_DIR:dir+'/claude',TRICORDER_HOME:dir,TRICORDER_STATE_DIR:dir,TRICORDER_RUNTIME_DIR:dir+'/runtime',TRICORDER_AGENTS_DIR:dir+'/no-pack',TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'}});page=await app.firstWindow();page.setDefaultTimeout(12000);await page.setViewportSize({width:1500,height:1000});
await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();
const call=(action,data={})=>page.evaluate(p=>window.studio.request(p),{action,...data});
await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Ouvrir un terminal',exact:true}).click();
await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('printf "Terminal de recette independante\\n"');await page.keyboard.press('Enter');await expect(page.locator('.xterm-screen:visible')).toContainText('Terminal de recette independante');
evidence.terminalsBefore=await page.evaluate(()=>window.tricorder.terminals.list());
await page.locator('[data-action=terminal-toggle]').click();
const project=await call('project.create',{title:'Support client · recette indépendante'});
const list={type:'array',items:'object',minItems:0,maxItems:100},obj={type:'object'};
const child={schema:2,id:'support-item',title:'Traiter une demande',nodes:[{id:'question',kind:'question',title:'Confirmer le diagnostic',question:'Le diagnostic convient-il ?',inputs:{item:obj},outputs:{answer:{type:'string',required:true}}}],edges:[]};
let graph={schema:2,id:'independent-review',title:'Diagnostic et réponses client',nodes:[{id:'intentions',kind:'input',title:'Recueillir la demande',outputs:{intentions:list},position:{x:40,y:60}},{id:'plan',kind:'task',title:'Préparer un plan unique',inputs:{intentions:list},outputs:{plan:obj},validation:'contract',position:{x:370,y:60}},{id:'scope',kind:'decision',title:'Valider le plan',inputs:{plan:obj},outputs:{plan:obj},position:{x:700,y:60}},{id:'work',kind:'foreach',title:'Traiter chaque demande',inputs:{plan:obj},outputs:{results:list,contributions:list},collection:'plan.tasks',concurrency:2,workflow:child,position:{x:1030,y:60}}],edges:[{id:'i-p',from:'intentions',to:'plan',mapping:{intentions:'intentions'}},{id:'p-s',from:'plan',to:'scope',mapping:{plan:'plan'}},{id:'s-w',from:'scope',to:'work',outcome:'approve',mapping:{plan:'plan'}}]};
graph=await call('workflow.save',{project:project.id,graph});
await page.locator('[data-workflow-route=global]').click();await page.locator('[data-action=open-workflow][data-id=independent-review]').click();
await page.getByRole('button',{name:'+ Note',exact:true}).click();await page.getByLabel('Titre',{exact:true}).fill('Précision de conception');await page.getByLabel('Texte de la note',{exact:true}).fill('Le diagnostic et la réponse restent deux résultats distincts. Cette note ne lance aucun travail.');await page.getByRole('button',{name:'Ajouter la note',exact:true}).click();await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await expect(page.getByRole('button',{name:'Enregistrer',exact:true})).toBeDisabled();await page.screenshot({path:out+'/01-editor-note.png'});expect(await noteOverlaps()).toEqual([]);evidence.checks.push('Note créée hors liens et étiquettes');
graph=await call('workflow.get',{project:project.id,workflow:graph.id});
const measure=()=>page.locator('.canvas').evaluate(canvas=>{
 const cards=[...canvas.querySelectorAll('.node')].map(n=>({id:n.dataset.id,r:n.getBoundingClientRect().toJSON()})), bad=[];
 for(const path of canvas.querySelectorAll('path.edge')){const hit=new Set();for(let d=2;d<path.getTotalLength()-2;d+=3){const p=path.getPointAtLength(d).matrixTransform(path.getScreenCTM());for(const {id,r} of cards)if(p.x>r.left+2&&p.x<r.right-2&&p.y>r.top+2&&p.y<r.bottom-2)hit.add(id);}if(hit.size)bad.push({edge:path.dataset.edge,path:path.getAttribute('d'),through:[...hit]});}
 return {cards,notes:[...canvas.querySelectorAll('.graph-note')].map(n=>({left:n.offsetLeft,top:n.offsetTop,width:n.offsetWidth,height:n.offsetHeight})),routesThroughCards:bad};
});
evidence.notesBeforeMove=await measure();expect(evidence.notesBeforeMove.routesThroughCards).toEqual([]);await page.screenshot({path:out+'/10-note-routing-before.png'});
const handle=await page.locator('.note-heading').boundingBox();await page.mouse.move(handle.x+30,handle.y+20);await page.mouse.down();await page.mouse.move(handle.x+80,handle.y+55,{steps:8});await page.mouse.up();await expect(page.getByRole('dialog')).toBeHidden();expect(await noteOverlaps()).toEqual([]);await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await expect(page.getByRole('button',{name:'Enregistrer',exact:true})).toBeDisabled();graph=await call('workflow.get',{project:project.id,workflow:graph.id});evidence.notesAfterMove=await measure();expect(evidence.notesAfterMove.routesThroughCards).toEqual([]);await page.screenshot({path:out+'/11-note-routing-after.png'});evidence.annotationExecution=engine("r=e.start(p['project'],p['graph'],simulation=True,driver='conversation');print(json.dumps({'blocks':len(r['definition']['nodes']),'execution_notes':len(r['definition'].get('layout',{}).get('notes',[])),'original_notes':len(r['original'].get('layout',{}).get('notes',[]))}))",{project:project.id,graph});expect(evidence.annotationExecution).toEqual({blocks:4,execution_notes:0,original_notes:1});evidence.buildBefore=buildBefore;evidence.buildAfter=hashBuild();expect(evidence.buildAfter).toEqual(evidence.buildBefore);console.log(JSON.stringify(evidence));
}catch(err){if(page){await page.screenshot({path:out+'/failure.png'});fs.writeFileSync(out+'/failure.txt',String(err));}throw err;}finally{fs.writeFileSync(out+'/evidence.json',JSON.stringify(evidence,null,2));if(app)await app.close();for(const s of ['cockpit/odoo-tricorder/pty.sock','studio-pty.sock','runtime/pty.sock'])await cleanupBroker(path.join(dir,s));fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1});

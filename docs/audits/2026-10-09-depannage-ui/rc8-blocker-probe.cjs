// Independent read-only app review; all created state, executables and projects are synthetic.
const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {cleanupBroker}=require('../../../tests/terminal-fixture.cjs');
const root=path.resolve(__dirname,'../../..');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-blockers-rc8-'));
const executable='/home/blegoff/.local/opt/odoo-tricorder-0.6.0-rc.8/odoo-tricorder';
const facts={executable,captured:new Date().toISOString(),views:{},outcomes:{},failures:[]};let app,page;
const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
async function shot(name){await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);await page.screenshot({path:path.join(__dirname,name+'.png')});facts.views[name]=await page.evaluate(()=>{const r=document.querySelector('#workflow-panel').shadowRoot;return{dialog:r.querySelector('[role=dialog]')?.innerText,inspector:r.querySelector('#inspector')?.innerText,content:r.querySelector('#studio-content')?.innerText,request:r.querySelector('#initial-request')?.value,buttons:[...r.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width).map(e=>({text:e.innerText,action:e.dataset.action,id:e.dataset.id,disabled:e.disabled})),rootOverflow:document.documentElement.scrollWidth>innerWidth}});}
async function close(){const b=page.getByRole('button',{name:'Fermer la fenêtre',exact:true});if(await b.count())await b.click();else await page.keyboard.press('Escape');}
async function open(project,title){await page.getByRole('button',{name:'Projets',exact:true}).click();await page.locator('.project-card').filter({hasText:project}).click();await page.locator('article').filter({has:page.getByRole('heading',{name:title,exact:true})}).getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();}
async function attempt(name,fn){try{await fn();}catch(e){facts.failures.push({name,error:e.message});await shot(name+'-probe-error').catch(()=>{});}}
(async()=>{try{
 const bin=path.join(directory,'bin');fs.mkdirSync(bin);fs.writeFileSync(path.join(bin,'codex'),'#!/bin/sh\nprintf "SYNTHETIC PROVIDER: no external call\\n"\nexit 0\n',{mode:0o755});
 app=await electron.launch({executablePath:executable,args:['--workflow-studio'],env:{...process.env,PATH:bin+':/usr/bin:/bin',TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_TEST_MODE:'1'},timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(6500);await page.setViewportSize({width:1440,height:900});await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();
 await page.locator('[data-theme-choice=light]').click();
 const p=await call('project.create',{title:'Projet Alpha synthétique'}),q=await call('project.create',{title:'Projet Bêta synthétique'});
 const graph={schema:1,id:'analyse',title:'Analyser une demande',nodes:[{id:'analyse',kind:'agent',title:'Analyser les observations',validation:'contract',outputs:{finding:'string'}}],edges:[]};
 await call('workflow.save',{project:p.id,graph});
 await attempt('missing-model',async()=>{
  await open(p.title,graph.title);await page.getByRole('button',{name:'Exécuter…',exact:true}).click();await page.getByLabel('Quelle demande souhaitez-vous traiter ?').fill('Analyser le mail client et conserver mes quatre observations.');
  await page.getByText('Coordonner plusieurs projets',{exact:true}).click();await page.locator(`[name=conversation-project][value="${q.id}"]`).check();await page.getByText('Exécution automatique sans conversation',{exact:true}).click();
  await shot('rc8-model-missing');await page.locator('[data-action=fix-step]').filter({hasText:'Configurer cette étape'}).first().click();await shot('rc8-model-configure-destination');
  await page.getByRole('button',{name:'Choisir l’IA',exact:true}).click();await page.getByLabel('Modèle',{exact:true}).fill('synthetic-model');await page.getByRole('button',{name:'Appliquer à toutes les étapes IA'}).click();await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
  facts.outcomes.modelReturn={request:await page.getByLabel('Quelle demande souhaitez-vous traiter ?').inputValue(),projects:await page.locator('[name=conversation-project]:checked').count()};await shot('rc8-model-return-lost-request');await close();
 });
 await attempt('missing-tool',async()=>{
  await page.getByLabel('Fournisseur IA',{exact:true}).selectOption('claude');await page.getByRole('button',{name:'Exécuter…',exact:true}).click();await shot('rc8-cli-missing');await page.locator('[data-action=fix-step]').first().click();await shot('rc8-cli-configure-destination');
  facts.outcomes.cliDestination={connectionsHeading:await page.getByRole('heading',{name:'Connexions',exact:true}).count(),inspectorVisible:await page.locator('#inspector').isVisible()};await page.getByLabel('Fournisseur IA',{exact:true}).selectOption('codex');
 });
 await attempt('unverified-plugin',async()=>{
  const adapter=path.join(directory,'adapter.py');fs.writeFileSync(adapter,"import json,sys\np=json.load(sys.stdin)\nprint(json.dumps({'protocol':'tricorder.tool/1','identity':'review-fixture','connected':True,'operations':{'read':'read'}} if p['action']=='describe' else {'ok':True,'identity':'review-fixture','outputs':{'value':42}}))\n");
  fs.writeFileSync(path.join(p.path,'.tricorder/plugins.json'),JSON.stringify({schema:1,plugins:[{id:'review',title:'Lecture locale synthétique',provider:'local',operations:['read'],transport:{argv:['/usr/bin/python3',adapter],timeout:3}}]}));
  const g={schema:1,id:'lecture',title:'Lire le compte rendu',nodes:[{id:'read',title:'Lire le compte rendu',kind:'document',validation:'automatic',capabilities:[{plugin:'review',operation:'read'}],outputs:{value:'number'}}],edges:[]};await call('workflow.save',{project:p.id,graph:g});await open(p.title,g.title);await page.getByRole('button',{name:'Exécuter…',exact:true}).click();await page.getByLabel('Quelle demande souhaitez-vous traiter ?').fill('Lire le compte rendu du projet Alpha.');await shot('rc8-connection-unverified');await page.locator('[data-action=fix-step]').first().click();await shot('rc8-connection-configure-destination');
  await page.getByRole('button',{name:'Connexions',exact:true}).click();const card=page.locator('article').filter({has:page.getByRole('heading',{name:'Lecture locale synthétique',exact:true})});await card.getByRole('button',{name:'Vérifier l’adaptateur…'}).click();await page.getByRole('button',{name:'Exécuter le contrôle',exact:true}).click();await expect(card).toContainText('Utilisable');await shot('rc8-connection-verified-no-return');
  await open(p.title,g.title);await page.getByRole('button',{name:'Exécuter…',exact:true}).click();facts.outcomes.connectionReturn={request:await page.getByLabel('Quelle demande souhaitez-vous traiter ?').inputValue(),nativeDisabled:await page.getByRole('button',{name:'Lancer dans le terminal',exact:true}).isDisabled()};await shot('rc8-connection-return');await close();
 });
 await attempt('global-edit',async()=>{
  const g={schema:1,id:'edit-global',title:'Corriger le code',defaults:{provider:'codex',model:'synthetic-model'},nodes:[{id:'edit',title:'Modifier le code',kind:'agent',execution_mode:'edit',outputs:{candidate:'object'}}],edges:[]};await call('workflow.save',{project:'workspace',graph:g});await page.getByRole('button',{name:'Workflows globaux',exact:true}).click();await page.locator('article').filter({has:page.getByRole('heading',{name:g.title,exact:true})}).getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();await page.getByRole('button',{name:'Exécuter…',exact:true}).click();await shot('rc8-global-edit');await page.locator('[data-action=fix-step]').first().click();await shot('rc8-global-configure-destination');
 });
 }finally{fs.writeFileSync(path.join(__dirname,'rc8-blocker-results.json'),JSON.stringify(facts,null,2)+'\n');if(app){if(page&&!page.isClosed())await page.evaluate(()=>window.tricorder.terminals.list());await app.close().catch(()=>{});}await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));await cleanupBroker(path.join(directory,'studio-pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});}console.log(JSON.stringify({outcomes:facts.outcomes,failures:facts.failures,views:Object.keys(facts.views)}));
})().catch(e=>{console.error(e);process.exitCode=1});

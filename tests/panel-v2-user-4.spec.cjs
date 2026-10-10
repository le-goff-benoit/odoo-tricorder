const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {cleanupBroker}=require('./terminal-fixture.cjs');
const root=path.resolve(__dirname,'..');
let directory,environment,backend,app,page,fixture;
const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
function engine(code,data={}) {
 return JSON.parse(execFileSync('/usr/bin/python3',['-c',`import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\nfrom workflow_engine.conversations import Conversations\ne=Engine(sys.argv[2]);p=json.load(sys.stdin)\n${code}`,backend,path.join(directory,'state/workflows')],{input:JSON.stringify(data),env:environment,encoding:'utf8'}));
}
const sessions=()=>page.evaluate(()=>window.tricorder.terminals.list().then(rows=>rows.filter(s=>s.alive).map(s=>[s.id,s.pid])));
async function capture(info,name){await page.screenshot({path:info.outputPath(name+'.png')});}
async function project(title){await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:title}).click();}
async function launch(pid,wid,request,other){
 await page.locator('[data-workflow-route=overview]').click();await page.getByRole('button',{name:'Nouvelle demande',exact:true}).click();
 await page.locator('#request-existing').check();await page.getByRole('dialog').getByRole('combobox',{name:'Workflow',exact:true}).selectOption(pid+':'+wid);
 await page.getByRole('button',{name:'Continuer',exact:true}).click();
 if(other){await page.getByText('Inclure d’autres projets',{exact:true}).click();await page.getByLabel(other,{exact:true}).check();}
 await page.locator('#initial-request').fill(request);
 await page.getByRole('button',{name:'Lancer dans le terminal',exact:true}).click();
 await expect(page.locator('#terminal-context')).toContainText('Shell : '+(pid===fixture.a.id?'Programme Atlas':'Programme Boréal'));await expect(page.locator('.terminal-tab.active')).toContainText(request);await expect(page.locator('.xterm-screen:visible')).toContainText('PROGRAMME SYNTHÉTIQUE PRÊT');
 await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('Contexte programme : '+request);await page.keyboard.press('Enter');
 await expect(page.locator('.xterm-screen:visible')).toContainText('DEMANDE SYNTHÉTIQUE : Contexte programme');
 return (await call('conversation.list',{project:pid}))[0];
}
test.beforeEach(async()=>{
 directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-panel-programme-'));
 fs.mkdirSync(path.join(directory,'bin'));fs.mkdirSync(path.join(directory,'home'));
 for(const name of ['codex','claude'])fs.writeFileSync(path.join(directory,'bin',name),'#!/bin/sh\nif [ "$1" = --version ]; then printf "PROGRAMME INERT\\n"; exit 0; fi\nprintf "PROGRAMME SYNTHÉTIQUE PRÊT — aucune IA distante\\n"\nwhile IFS= read -r line; do printf "DEMANDE SYNTHÉTIQUE : %s\\n" "$line"; done\n',{mode:0o755});
 environment={PATH:path.join(directory,'bin')+':/usr/bin:/bin',HOME:path.join(directory,'home'),SHELL:'/bin/bash',DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_DATA_HOME:path.join(directory,'data'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:path.join(directory,'home'),TRICORDER_STATE_DIR:path.join(directory,'state'),TRICORDER_WORKFLOW_STATE_DIR:path.join(directory,'state/workflows'),TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'no-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
 backend=process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend');
 fixture=engine("a=e.create_project('Programme Atlas');b=e.create_project('Programme Boréal');g={'schema':1,'id':'programme','title':'Préparer une revue de programme','defaults':{'provider':'codex','model':'synthetic'},'parameters':{'request':'Demande historique à exclure','language':'fr'},'nodes':[{'id':'confirmation','kind':'question','title':'Confirmer le périmètre','question':'Le périmètre du projet est-il complet ?','outputs':{'answer':'string'}}],'edges':[]};e.save(a['id'],g);print(json.dumps({'a':a,'b':b}))");
 app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?['--workflow-studio']:[root,'--workflow-studio'],env:environment});
 page=await app.firstWindow();await page.setViewportSize({width:1500,height:1000});
 await expect(page.getByRole('heading',{name:'Activité',exact:true})).toBeVisible();
});
test.afterEach(async({},info)=>{
 if(info.status!==info.expectedStatus&&page&&!page.isClosed()){await capture(info,'echec-observe');console.log('VISIBLE',await page.locator('body').innerText().catch(()=>''));}
 if(app)await app.close();app=null;
 for(const socket of ['runtime/pty.sock','cockpit/odoo-tricorder/pty.sock','studio-pty.sock'])await cleanupBroker(path.join(directory,socket));
 fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
});

test('programme — adopter le modèle et réutiliser dans deux projets sans mélanger copies et demandes',async({},info)=>{
 await page.locator('[data-workflow-route=global]').click();await page.getByText('Gestion des workflows', {exact:true}).click();await page.locator('[data-action=workflow-hub][data-tab=registered]').click();await page.locator('[data-action=open-workflow][data-id=programme]').click();
 await page.locator('.design-menu > summary').click();await page.getByRole('button',{name:'Réutiliser…',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Les demandes, résultats, validations et planifications ne sont pas repris');
 await page.getByLabel('Nom de la copie',{exact:true}).fill('Modèle revue transverse');await capture(info,'01-adoption-modele');
 await page.getByRole('button',{name:'Créer la copie',exact:true}).click();await expect(page.locator('.workflow-heading h1')).toHaveText('Modèle revue transverse');
 const template=(await call('project.get',{project:'library'})).workflows.find(w=>w.title==='Modèle revue transverse');
 expect((await call('workflow.get',{project:'library',workflow:template.id})).parameters).toEqual({language:'fr'});
 const copies=[];
 for(const [p,title] of [[fixture.a,'Revue Atlas'],[fixture.b,'Revue Boréal']]){
  await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Modèles',exact:true}).click();await page.locator(`[data-action=edit-template][data-id="${template.id}"]`).click();
  await page.locator('.design-menu > summary').click();await page.getByRole('button',{name:'Réutiliser…',exact:true}).click();
  await page.getByLabel('Destination',{exact:true}).selectOption(p.id);await page.getByLabel('Nom de la copie',{exact:true}).fill(title);await page.getByRole('button',{name:'Créer la copie',exact:true}).click();
  await expect(page.locator('.workflow-heading h1')).toHaveText(title);const copy=(await call('project.get',{project:p.id})).workflows.find(w=>w.title===title);copies.push(copy);
 }
 await page.locator('.node[data-id=confirmation]').click();await page.getByLabel('Nom du bloc',{exact:true}).fill('Confirmer les jalons Boréal');await page.getByRole('button',{name:'Appliquer au bloc',exact:true}).click();await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
 await expect.poll(async()=>(await call('workflow.get',{project:fixture.b.id,workflow:copies[1].id})).nodes[0].title).toBe('Confirmer les jalons Boréal');
 expect((await call('workflow.get',{project:fixture.a.id,workflow:copies[0].id})).nodes[0].title).toBe('Confirmer le périmètre');
 expect((await call('workflow.get',{project:'library',workflow:template.id})).revision).toBe(1);
 const ca=await launch(fixture.a.id,copies[0].id,'Préparer la revue des jalons Atlas.');
 const cb=await launch(fixture.b.id,copies[1].id,'Préparer la revue des ressources Boréal.');
 const a=await call('conversation.get',{conversation:ca.id}),b=await call('conversation.get',{conversation:cb.id});
 expect(a.items).toHaveLength(1);expect(b.items).toHaveLength(1);expect(a.items[0].project).toBe(fixture.a.id);expect(b.items[0].project).toBe(fixture.b.id);
 await project('Programme Atlas');await page.locator(`[data-action=open-conversation][data-id="${ca.id}"]`).click();await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await expect(page.locator('#conversation-overview')).toContainText('Préparer la revue des jalons Atlas.');await expect(page.locator('#conversation-overview')).not.toContainText('ressources Boréal');await capture(info,'02-atlas-contexte-isole');
 await project('Programme Boréal');await page.locator(`[data-action=open-conversation][data-id="${cb.id}"]`).click();await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await expect(page.locator('#conversation-overview')).toContainText('Préparer la revue des ressources Boréal.');await capture(info,'03-boreal-contexte-isole');
 fs.writeFileSync(info.outputPath('copies-et-contextes.json'),JSON.stringify({template,copies,atlas:a,boreal:b},null,2));
});

test('programme — un parent multi-projet, une dépendance et retour des enfants depuis Projets et Activité',async({},info)=>{
 const array={type:'array',items:'object',required:true,minItems:0,maxItems:100},object={type:'object',required:true};
 const graph={schema:2,id:'coordination-programme',title:'Coordonner les jalons du programme',defaults:{provider:'codex',model:'synthetic'},nodes:[{id:'intentions',kind:'input',title:'Recueillir les objectifs',outputs:{intentions:{...array,minItems:1}}},{id:'plan',kind:'task',title:'Construire le plan transverse',inputs:{intentions:array},outputs:{plan:object},validation:'contract'},{id:'scope',kind:'decision',title:'Approuver le plan transverse',inputs:{plan:object},outputs:{plan:object}},{id:'work',kind:'foreach',title:'Réaliser les tâches du programme',inputs:{plan:object},outputs:{results:array,contributions:array},collection:'plan.tasks',concurrency:2,workflow:{schema:2,id:'jalon',title:'Confirmer un jalon projet',nodes:[{id:'confirmation',kind:'question',title:'Recevoir le jalon',question:'Le jalon de cette tâche est-il livré ?',inputs:{item:object},outputs:{answer:{type:'string',required:true}}}],edges:[]}}],edges:[{id:'i-p',from:'intentions',to:'plan',mapping:{intentions:'intentions'}},{id:'p-s',from:'plan',to:'scope',mapping:{plan:'plan'}},{id:'s-w',from:'scope',to:'work',outcome:'approve',mapping:{plan:'plan'}}]};
 await call('workflow.save',{project:fixture.a.id,graph});
 const conversation=await launch(fixture.a.id,graph.id,'Synchroniser les livraisons Atlas et Boréal avec un seul plan.','Programme Boréal');
 const c=await call('conversation.get',{conversation:conversation.id});expect(c.projects).toEqual([fixture.a.id,fixture.b.id]);expect(c.items).toHaveLength(1);const parent=c.items[0].run;
 await page.getByRole('button',{name:'Détail',exact:true}).click();
 for(const intention of ['Livrer le jalon Atlas','Recetter le jalon Boréal après Atlas']){await page.getByLabel('Nouvelle intention',{exact:true}).fill(intention);await page.getByRole('button',{name:'Ajouter à la liste',exact:true}).click();}
 await page.getByRole('button',{name:'Confirmer la liste et continuer',exact:true}).click();
 await expect.poll(async()=>(await call('run.get',{run:parent})).run.nodes.plan.status).toBe('ready');
 // Fournisseur et plan synthétiques : commandes Engine, aucune IA appelée.
 engine("r=e.run(p['run']);token=e.claim(p['run'],'plan')['token'];plan={'title':'Un plan transverse Atlas → Boréal','tasks':[{'id':'atlas','title':'Livrer le jalon Atlas','project':p['a']},{'id':'boreal','title':'Recetter le jalon Boréal','project':p['b'],'depends_on':['atlas']}]};r=e.submit(p['run'],'plan',token,{'ok':True,'summary':'Plan synthétique pour deux projets, une dépendance','outputs':{'plan':plan}});print(json.dumps({'plan':r['nodes']['scope']['inputs']}))",{run:parent,a:fixture.a.id,b:fixture.b.id});
 await page.getByRole('button',{name:'Examiner la décision',exact:true}).click();await capture(info,'04-plan-transverse-approbation');await page.getByRole('button',{name:'Approuver la suite',exact:true}).click();
 await page.getByRole('button',{name:'Lancer les éléments',exact:true}).click();await page.getByRole('button',{name:'Lancer le traitement des éléments',exact:true}).click();
 await expect(page.locator('.coordination-items li')).toHaveCount(2);await expect(page.locator('.coordination-panel')).toContainText('Programme Boréal');await capture(info,'05-coordination-dependance');
 const before=await sessions(),state=(await call('run.get',{run:parent})).run,members=state.nodes.work.children;
 expect(members.map(m=>m.project)).toEqual([fixture.a.id,fixture.b.id]);expect(members[1].depends_on).toEqual(['atlas']);expect((await call('run.get',{run:members[1].run})).run.iteration_wait).toBe(true);
 expect((await call('workflow.list',{project:fixture.b.id})).total).toBe(0);expect((await call('conversation.get',{conversation:c.id})).items).toHaveLength(1);
 await page.getByRole('button',{name:'Graphe',exact:true}).click();await page.locator('.node[data-id=work] .node-work-items button[title="Ouvrir Livrer le jalon Atlas"]').click();
 await page.getByRole('button',{name:'Détail',exact:true}).click();await page.getByLabel('Votre réponse',{exact:true}).fill('Atlas livré, preuve synthétique reçue.');await capture(info,'06-enfant-atlas-parent');await page.getByRole('button',{name:'Répondre',exact:true}).click();await page.getByRole('button',{name:'← Revenir au workflow parent',exact:true}).click();
 await expect.poll(async()=>(await call('run.get',{run:members[1].run})).run.iteration_wait||false).toBe(false);
 const released=(await call('run.get',{run:members[1].run})).run;expect(released.parameters.depends_on_runs).toEqual([members[0].run]);expect(released.parameters.dependency_results[members[0].run].project).toBe(fixture.a.id);
 await project('Programme Boréal');await page.locator(`[data-action=open-conversation][data-id="${c.id}"]`).click();await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await page.locator('.conversation-demand-open').click();await expect(page.locator('.workflow-heading h1')).toContainText('Synchroniser');await page.getByRole('button',{name:'Graphe',exact:true}).click();await page.locator('.node[data-id=work] .node-work-items button[title="Ouvrir Recetter le jalon Boréal"]').click();
 await expect(page.locator('#terminal-context.cross-project')).toContainText('Shell : Programme Atlas');await expect(page.locator('#terminal-context')).toContainText('Demande affichée : Programme Boréal');await capture(info,'07-boreal-contexte-terminal');await page.getByRole('button',{name:'← Revenir au workflow parent',exact:true}).click();expect(await sessions()).toEqual(before);
 await project('Programme Boréal');await page.locator(`[data-action=open-run][data-id="${members[1].run}"]`).click();await expect(page.locator('.workflow-heading h1')).toHaveText('Recetter le jalon Boréal');
 const directProjectParentCount=await page.getByRole('button',{name:'← Revenir au workflow parent',exact:true}).count();await capture(info,'08a-enfant-direct-projet');
 expect(directProjectParentCount,'Un enfant ouvert depuis Projets doit retrouver son parent durable').toBe(1);await page.getByRole('button',{name:'← Revenir au workflow parent',exact:true}).click();await expect(page.locator('.workflow-heading h1')).toContainText('Synchroniser');
 await page.locator('[data-workflow-route=overview]').click();await expect(page.getByRole('heading',{name:'Activité',exact:true})).toBeVisible();await expect(page.locator('.activity-page .page-heading')).toContainText('1 demande · 2 tâches');await expect(page.locator(`[data-action=activity-run][data-id="${members[1].run}"]`)).toContainText('Tâche de Synchroniser');await capture(info,'08-activite-parent-enfants');
 await page.locator(`[data-action=activity-run][data-id="${members[1].run}"]`).click();await expect(page.locator('.workflow-heading h1')).toHaveText('Recetter le jalon Boréal');const directActivityParentCount=await page.getByRole('button',{name:'← Revenir au workflow parent',exact:true}).count();await capture(info,'08b-enfant-direct-activite');
 expect(directActivityParentCount,'Un enfant ouvert depuis Activité doit retrouver son parent durable').toBe(1);
 fs.writeFileSync(info.outputPath('retour-parent-direct.json'),JSON.stringify({child:members[1].run,parent,engineParent:(await call('run.get',{run:members[1].run})).run.parent,directProjectParentCount,directActivityParentCount},null,2));
 await page.getByRole('button',{name:'← Revenir au workflow parent',exact:true}).click();await expect(page.locator('.workflow-heading h1')).toContainText('Synchroniser');
 await page.getByRole('button',{name:'Graphe',exact:true}).click();await page.locator('.node[data-id=work] .node-work-items button[title="Ouvrir Recetter le jalon Boréal"]').click();await page.getByRole('button',{name:'Détail',exact:true}).click();await page.getByLabel('Votre réponse',{exact:true}).fill('Boréal recetté après le jalon Atlas.');await page.getByRole('button',{name:'Répondre',exact:true}).click();await page.getByRole('button',{name:'← Revenir au workflow parent',exact:true}).click();await expect.poll(async()=>(await call('run.get',{run:parent})).run.status).toBe('completed');expect(await sessions()).toEqual(before);await capture(info,'09-programme-termine');
 fs.writeFileSync(info.outputPath('coordination-preuves.json'),JSON.stringify({conversation:c,started:state,released,completed:(await call('run.get',{run:parent})).run,terminalBefore:before,terminalAfter:await sessions()},null,2));
});

const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {cleanupBroker}=require('./terminal-fixture.cjs');
const root=path.resolve(__dirname,'..');
let directory,app,page,fixture,env,backend;
const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
const human=(action,data={})=>page.evaluate(payload=>window.studio.human(payload),{action,...data});
const python=(code,args=[])=>execFileSync('/usr/bin/python3',['-c','import json,sys;sys.path.insert(0,sys.argv[1]);from workflow_engine import Engine;e=Engine(sys.argv[2]);'+code,backend,directory,...args],{env,encoding:'utf8'});
const item=i=>page.locator(`#conversation-overview .conversation-demand[data-run="${fixture.items[i].run}"]`);
async function openOverview(){await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:'Recette métier'}).click();await page.locator(`[data-action=open-conversation][data-id="${fixture.conversation}"]`).click();}

test.beforeEach(async()=>{
 directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-feedback-ui-'));fs.mkdirSync(path.join(directory,'bin'));
 for(const provider of ['codex','claude'])fs.writeFileSync(path.join(directory,'bin',provider),'#!/bin/sh\nprintf "FUNCTIONAL_INERT_ONLY\\n"\ncase "$1" in --version) exit 0;; esac\nwhile IFS= read -r line; do printf "%s\\n" "$line"; done\n',{mode:0o755});
 fs.writeFileSync(path.join(directory,'bin/python3'),`#!/bin/sh\nexec /usr/bin/python3 "$@" 2>>"${directory}/backend-errors.log"\n`,{mode:0o755});
 env={PATH:path.join(directory,'bin')+':/usr/bin:/bin',HOME:directory,DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_DATA_HOME:path.join(directory,'data'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'absent-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
 backend=process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend');
 fixture=JSON.parse(python(`from workflow_engine.conversations import Conversations
p=e.create_project('Recette métier');g={'schema':1,'id':'feedback','title':'Suivi métier','defaults':{'provider':'codex','model':'synthetic'},'nodes':[{'id':'work','kind':'task','title':'Préparer le résultat','prompt':'Rédiger le constat.','validation':'contract','outputs':{'report':'string'}}],'edges':[]};e.save(p['id'],g);c=Conversations(e);v=c.open(p['id'],g,'codex');items=[c.add(v['id'],'R'+str(n)+' — Point métier indépendant') for n in range(1,5)];print(json.dumps({'project':p,'conversation':v['id'],'items':items}))`));
 app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?['--workflow-studio']:[root,'--workflow-studio'],env});page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});await openOverview();
});
test.afterEach(async({},info)=>{if(fs.existsSync(path.join(directory,'backend-errors.log')))fs.copyFileSync(path.join(directory,'backend-errors.log'),info.outputPath('backend-errors.log'));if(app)await app.close();await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));await cleanupBroker(path.join(directory,'studio-pty.sock'));await cleanupBroker(path.join(directory,'runtime/pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});

test('business feedback: create an AND dependency on four demands, then explain a cancelled prerequisite',async()=>{
 await page.locator('.execution-menu > summary').click();await page.getByRole('button',{name:'Ajouter une demande…',exact:true}).click();
 await page.getByRole('dialog').getByLabel('Demande',{exact:true}).fill('C1 — Consolider les quatre résultats');
 for(const row of fixture.items)await page.locator(`#dependency-choices input[value="${row.id}"]`).check();
 await expect(page.locator('#dependency-count')).toContainText('4 demande(s)');await page.getByRole('button',{name:'Enregistrer la demande',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.conversation-demand')).toHaveCount(5);
 const c=await call('conversation.get',{conversation:fixture.conversation});const consolidation=c.items.find(i=>i.request.startsWith('C1'));
 expect(new Set(consolidation.depends_on)).toEqual(new Set(fixture.items.map(i=>i.id)));expect(consolidation.execution.status).toBe('paused');
 await item(0).locator('.conversation-demand-open').click();await expect(page.locator('.workflow-heading h1')).toContainText('R1 —');await page.locator('.execution-menu > summary').click();await page.getByRole('button',{name:'Annuler',exact:true}).click();await page.getByRole('button',{name:'Annuler l’exécution',exact:true}).click();
 await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();const row=page.locator(`.conversation-demand[data-run="${consolidation.run}"]`);await expect(row.locator('.dependency-link').first()).toContainText('Annulée');
 await row.locator('.conversation-demand-action').click();await expect(page.locator('#inspector')).toContainText('Bloquée par une demande préalable');await expect(page.locator('#inspector')).toContainText('ne peut pas reprendre');
 await page.getByRole('button',{name:'Créer une demande de remplacement',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('aucune validation passée ne sera transférée');await expect(page.locator(`#dependency-choices input[value="${fixture.items[0].id}"]`)).toBeDisabled();
 await page.getByRole('button',{name:'Fermer la fenêtre',exact:true}).click();expect((await call('run.get',{run:consolidation.run})).run.status).toBe('paused');
});

test('business feedback: a focused inspector updates after completion without stale ready instructions',async()=>{
 await item(0).locator('.conversation-demand-open').click();await page.getByRole('button',{name:'Détail',exact:true}).click();
 const inspector=page.locator('#inspector');await expect(inspector).toContainText('À traiter dans la conversation');await inspector.locator('.step-trail button').focus();
 python(`r=sys.argv[3];c=e.claim(r,'work');e.submit(r,'work',c['token'],{'ok':True,'summary':'Le compte rendu métier est terminé.','outputs':{'report':'Trois décisions enregistrées.'}})`,[fixture.items[0].run]);
 await expect(page.locator('.execution-label')).toHaveText('Terminée');await expect(inspector).toContainText('Le compte rendu métier est terminé.');await expect(inspector).not.toContainText('À traiter dans la conversation');
 await page.screenshot({path:test.info().outputPath('focused-inspector-completed.png')});
});

test('business feedback: a late conversation reply cannot overwrite the editor or raise a null query error',async()=>{
 await app.evaluate(({ipcMain})=>{const handler=ipcMain._invokeHandlers.get('studio:request');globalThis.__held=false;globalThis.__finished=false;ipcMain.removeHandler('studio:request');ipcMain.handle('studio:request',async(event,payload)=>{const result=await handler(event,payload);if(payload.action==='conversation.get'&&!globalThis.__held){globalThis.__held=true;await new Promise(resolve=>globalThis.__release=resolve);globalThis.__finished=true;}return result;});});
 await expect.poll(()=>app.evaluate(()=>globalThis.__held)).toBe(true);
 await page.locator('[data-workflow-route=global]').click();await page.locator('[data-action=open-workflow][data-id=feedback]').click();await expect(page.locator('[data-action=save]')).toBeVisible();
 await app.evaluate(()=>globalThis.__release());await expect.poll(()=>app.evaluate(()=>globalThis.__finished)).toBe(true);
 // Observe a subsequent completed backend request instead of a timing-only sleep.
 await call('workflow.get',{project:fixture.project.id,workflow:'feedback'});await expect(page.locator('#feedback')).not.toContainText('query');await expect(page.locator('#conversation-overview')).toHaveCount(0);await expect(page.locator('[data-action=save]')).toBeVisible();
});

test('business feedback: task instructions save with the common AI selection and survive reopen',async()=>{
 await page.locator('[data-workflow-route=global]').click();await page.locator('[data-action=open-workflow][data-id=feedback]').click();await page.locator('.node[data-id=work]').click();
 await page.getByLabel('Consigne',{exact:true}).fill('Conserver cette consigne métier avant de choisir une autre IA.');await page.getByRole('button',{name:'Choisir l’IA',exact:true}).click();await page.getByLabel('Modèle',{exact:true}).fill('synthetic-second');await page.getByRole('button',{name:'Appliquer à toutes les étapes IA',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 const g=await call('workflow.get',{project:fixture.project.id,workflow:'feedback'});expect(g.nodes[0].prompt).toBe('Conserver cette consigne métier avant de choisir une autre IA.');expect(g.defaults.model).toBe('synthetic-second');
 await page.locator('[data-workflow-route=global]').click();await page.locator('[data-action=open-workflow][data-id=feedback]').click();await page.locator('.node[data-id=work]').click();await expect(page.getByLabel('Consigne',{exact:true})).toHaveValue(g.nodes[0].prompt);await expect(page.locator('.workflow-heading p')).toContainText('Enregistré');
});

test('business feedback: pause and cancellation update an open inspector even when the node is unchanged',async()=>{
 await item(0).locator('.conversation-demand-open').click();await expect(page.locator('.workflow-heading h1')).toContainText('R1 —');await page.getByRole('button',{name:'Détail',exact:true}).click();const inspector=page.locator('#inspector');
 await expect(inspector).toContainText('À traiter dans la conversation');await inspector.locator('.step-trail button').focus();
 // External control uses the engine API, as a second session would. The inspector must follow it.
 await call('run.control',{run:fixture.items[0].run,control:'pause'});await expect(inspector).toContainText('Cette demande a été suspendue explicitement');await expect(inspector.getByRole('button',{name:'Reprendre la demande',exact:true})).toBeVisible();await expect(inspector).not.toContainText('À traiter dans la conversation');
 await call('run.control',{run:fixture.items[0].run,control:'cancel'});await expect(inspector).toContainText('Exécution annulée');await expect(inspector).toContainText('lecture seule');await expect(inspector.locator('form')).toHaveCount(0);
});

test('handover feedback: source execution stays reachable from its new workflow without reading JSON',async()=>{
 const transferred=JSON.parse(python(`e.workspace_context();g={'schema':1,'id':'global-source','title':'Compte rendu global fictif','nodes':[{'id':'work','kind':'task','title':'Constat global','validation':'contract','outputs':{'report':'string'}}],'edges':[]};r=e.start('workspace',g);claim=e.claim(r['id'],'work');e.submit(r['id'],'work',claim['token'],{'ok':True,'summary':'Constat global conservé.','outputs':{'report':'Deux décisions à préparer.'}});saved=e.handoff(r['id'],sys.argv[3],g,human=True);print(json.dumps({'workflow':saved,'run':r['id']}))`,[fixture.project.id]));
 await page.locator('[data-workflow-route=global]').click();await page.locator(`[data-action=open-workflow][data-id="${transferred.workflow.id}"]`).click();
 await expect(page.locator('.workflow-source')).toContainText('1 résultat(s) validé(s)');
 await expect(page.locator('.workflow-source')).toContainText('validations et autorisations restent propres');
 await page.getByRole('button',{name:'Consulter l’exécution d’origine',exact:true}).click();
 await expect(page.locator('.workflow-heading h1')).toContainText('Compte rendu global fictif');
 await page.locator('.node[data-id=work]').click();await page.getByRole('button',{name:'Détail',exact:true}).click();await expect(page.locator('#inspector')).toContainText('Constat global conservé.');
 expect((await call('run.get',{run:transferred.run})).run.status).toBe('completed');
 const saved=await call('workflow.get',{project:fixture.project.id,workflow:transferred.workflow.id});expect(saved.parameters.source_context.run).toBe(transferred.run);
});

test('creation feedback: choosing a model keeps the custom workflow name already entered',async()=>{
 await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Créer un workflow',exact:true}).click();
 await page.getByLabel('Nom du workflow',{exact:true}).fill('Contrôle des achats hebdomadaire');
 const model=await page.locator('#work-template option').nth(1).getAttribute('value');await page.locator('#work-template').selectOption(model);
 await expect(page.getByLabel('Nom du workflow',{exact:true})).toHaveValue('Contrôle des achats hebdomadaire');
 await page.getByRole('button',{name:'Créer et ouvrir le workflow',exact:true}).click();
 await expect(page.locator('.workflow-heading h1')).toHaveText('Contrôle des achats hebdomadaire');
});

test('version feedback: a missing delegated model keeps native work actionable and offers optional configuration',async()=>{
 fixture=JSON.parse(python(`from workflow_engine.conversations import Conversations
p=e.project(sys.argv[3]);g=next(g for g in e.workflows(p['id']) if g['id']=='feedback');g.pop('revision',None);g['id']='missing-model';g['defaults'].pop('model');g['nodes'][0]['kind']='agent';g=e.save(p['id'],g);c=Conversations(e);v=c.open(p['id'],g,'codex');i=c.add(v['id'],'Préparer le bilan sans modèle de bloc');print(json.dumps({'project':p,'conversation':v['id'],'items':[i]}))`,[fixture.project.id]));
 await openOverview();await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await expect(item(0)).toContainText('À traiter dans la conversation');
 await page.locator('[data-workflow-route=overview]').click();
 const activity=page.locator(`.activity-row[data-id="${fixture.items[0].run}"]`);await expect(activity).toContainText('À traiter dans la conversation');await activity.click();
 await page.getByRole('button',{name:'Détail',exact:true}).click();
 await expect(page.locator('.execution-label')).toContainText('À traiter dans la conversation');
 await expect(page.locator('.workflow-heading p')).toContainText('Révision 1 figée');
 await expect(page.locator('#inspector .pill').first()).toHaveText('Dans la conversation');
 await page.locator('#inspector details').filter({has:page.locator('summary', {hasText:'Agent de bloc séparé (facultatif)'})}).locator('summary').click();
 await expect(page.locator('#inspector')).toContainText('Aucun modèle explicite');
 await expect(page.locator('#inspector')).not.toContainText('Cette étape est prête');
 await page.getByRole('button',{name:'Configurer un nouveau lancement…',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Les décisions et résultats précédents ne sont pas transférés');
 const preserved=await call('run.get',{run:fixture.items[0].run});expect(preserved.run.nodes.work.status).toBe('ready');
});

test('version feedback: an automatic failure can configure a new copy while preserving its results',async()=>{
 const failed=JSON.parse(python(`g=next(g for g in e.workflows(sys.argv[3]) if g['id']=='feedback');g.pop('revision',None);r=e.start(sys.argv[3],g,parameters={'request':'Préparer un bilan synthétique : '+('Tous les points doivent être conservés. '*1000)});claim=e.claim(r['id'],'work');e.submit(r['id'],'work',claim['token'],{'ok':False,'summary':'Configuration à revoir pour ce besoin.','outputs':{}});print(json.dumps(e.run(r['id'])))`,[fixture.project.id]));
 await page.locator('[data-workflow-route=overview]').click();await page.locator(`.activity-row[data-id="${failed.id}"]`).click();
 await page.getByRole('button',{name:'Examiner l’échec',exact:true}).click();
 await expect(page.locator('#inspector')).toContainText('Configuration à revoir pour ce besoin.');
 await page.getByRole('button',{name:'Configurer un nouveau lancement…',exact:true}).click();
 await page.getByRole('button',{name:'Configurer une copie',exact:true}).click();
 await page.getByLabel('Modèle',{exact:true}).fill('synthetic-reconfigured');
 await page.getByRole('button',{name:'Appliquer à toutes les étapes IA',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.locator('.workflow-heading')).toContainText('Enregistré');
 await expect(page.locator('.workflow-heading h1')).toHaveText('Suivi métier — adaptation');
 const preserved=JSON.parse(python(`print(json.dumps(e.run(sys.argv[3])))`,[failed.id]));
 expect(preserved).toEqual(failed);
 const workflows=JSON.parse(python(`print(json.dumps(e.workflows(sys.argv[3])))`,[fixture.project.id]));
 expect(workflows.some(g=>g.title==='Suivi métier — adaptation'&&g.id!=='feedback')).toBe(true);
 await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
 await expect(page.locator('#initial-request')).toHaveValue(failed.parameters.request);
});

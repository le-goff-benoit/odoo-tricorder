const {test,expect,_electron:electron}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {cleanupBroker}=require('./terminal-fixture.cjs');
const root=path.resolve(__dirname,'..');let directory,app,page,fixture,env;
const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
test.beforeEach(async()=>{
 directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-usage-'));fs.mkdirSync(path.join(directory,'bin'));
 for(const provider of ['codex','claude'])fs.writeFileSync(path.join(directory,'bin',provider),'#!/bin/sh\nprintf "FOURNISSEUR SYNTHETIQUE INERTE\\n"\nexit 78\n',{mode:0o755});
 fs.mkdirSync(path.join(directory,'.codex'));fs.writeFileSync(path.join(directory,'.codex/models_cache.json'),JSON.stringify({models:[{slug:'fixture-fast',display_name:'Modèle rapide de test',visibility:'list'},{slug:'fixture-deep',display_name:'Modèle approfondi de test',visibility:'list'},...Array.from({length:6},(_,i)=>({slug:'fixture-other-'+i,display_name:'Autre modèle '+i,visibility:'list'}))]}));
 env={PATH:path.join(directory,'bin')+':/usr/bin:/bin',HOME:directory,DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_DATA_HOME:path.join(directory,'data'),CODEX_HOME:path.join(directory,'.codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_WORKFLOW_STATE_DIR:directory,TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'no-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
 fixture=JSON.parse(execFileSync('/usr/bin/python3',['-c',`import json,sys
sys.path.insert(0,sys.argv[1]);from workflow_engine import Engine
e=Engine(sys.argv[2]);p=e.create_project('Réunions de test')
g={'schema':1,'id':'question','title':'Préciser la réunion','nodes':[{'id':'question','title':'Choisir les sources','kind':'question','question':'Quelles réunions de la semaine faut-il analyser ?','outputs':{'answer':'string'}}],'edges':[]}
e.save(p['id'],g);pending=e.start(p['id'],g)
d={'schema':1,'id':'done','title':'Brouillon terminé','nodes':[{'id':'work','title':'Rédiger','kind':'task','validation':'contract'}],'edges':[]}
r=e.start(p['id'],d);c=e.claim(r['id'],'work');e.submit(r['id'],'work',c['token'],{'ok':True,'summary':'Brouillon de test terminé','outputs':{}})
for i in range(30):
 q={**g,'id':'adaptation-'+str(i),'title':'Adaptation réunion '+str(i)};e.save(p['id'],q)
print(json.dumps({'project':p,'pending':pending['id'],'done':r['id']}))`,path.join(root,'backend'),directory],{env,encoding:'utf8'}));
 app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?[]:[root],env});expect(await app.evaluate(({app})=>app.getVersion())).toBe(require('../package.json').version);page=await app.firstWindow(); await page.evaluate(() => localStorage.setItem('tricorder-editor-detail','yes'));await page.setViewportSize({width:1440,height:1000});await expect(page.getByRole('heading',{name:'Activité',exact:true})).toBeVisible();
});
test.afterEach(async({},info)=>{if(page&&!page.isClosed()&&info.status!==info.expectedStatus)await page.screenshot({path:info.outputPath('echec.png')});if(app)await app.close();for(const socket of ['runtime/pty.sock','cockpit/odoo-tricorder/pty.sock','studio-pty.sock'])await cleanupBroker(path.join(directory,socket));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
test('usage — workflows show current work, history with duration and a visible return',async()=>{
 await page.locator('[data-workflow-route=global]').click();
 await expect(page.getByRole('heading',{name:'Workflows',exact:true})).toBeVisible();
 await expect(page.locator('.activity-row')).toHaveCount(1);await expect(page.locator('.activity-row')).toContainText('Préciser la réunion');
 await expect(page.locator('.workflow-row')).toHaveCount(0);
 await page.locator('.activity-row').click();await expect(page.locator('.human-intervention')).toContainText('Quelles réunions');
 await page.getByRole('button',{name:'← Retour à la liste',exact:true}).click();await expect(page.getByRole('heading',{name:'Workflows',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Historique',exact:true}).click();await expect(page.locator('.activity-row')).toHaveCount(1);await expect(page.locator('.activity-row')).toContainText('Durée totale');
 await page.locator('.activity-row').click();await expect(page.locator('.execution-timing')).toContainText('Fin :');
 await page.getByRole('button',{name:'← Retour à la liste',exact:true}).click();await expect(page.locator('.catalog-tabs .active')).toHaveText('Historique');
});
test('usage — new request shares the model library, project adaptations are opt in',async()=>{
 await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Modèles',exact:true}).click();
 await expect(page.locator('.template-card h3').first()).toBeVisible();const names=await page.locator('.template-card h3').allTextContents();
 await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Nouvelle demande',exact:true}).click();
 await expect(page.locator('#request-workflow option')).toHaveCount(names.length);expect((await page.locator('#request-workflow option').allTextContents()).sort()).toEqual(names.sort());await expect(page.locator('#request-workflow optgroup')).toHaveCount(2);await page.locator('#request-workflow').selectOption('template:meeting-conversation');await expect(page.locator('#request-description')).toContainText('une ou plusieurs réunions');
 await expect(page.locator('#request-workflow')).not.toContainText('Adaptation réunion');
 await page.locator('#request-existing').check();await expect(page.locator('#request-workflow')).toContainText('Adaptation réunion 29');
});
test('usage — question editor asks for free text and models have readable choices',async()=>{
 await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:'Réunions de test'}).click();
 await page.getByRole('button',{name:'Workflows suivants',exact:true}).click();await page.locator('[data-action=open-workflow][data-id=question]').click();await page.locator('.node[data-id=question]').click();
 await expect(page.getByLabel('Information à demander',{exact:true})).toHaveValue('Quelles réunions de la semaine faut-il analyser ?');
 await expect(page.locator('#node-options')).toHaveCount(0);await expect(page.getByText('Opération externe exacte',{exact:true})).toHaveCount(0);
 await expect(page.locator('.ports')).toContainText('Votre réponse');await expect(page.locator('.ports')).toContainText('Conservé dans le résultat');
 await page.getByRole('button',{name:'Choisir l’IA',exact:true}).click();await page.getByLabel('Rechercher un modèle IA',{exact:true}).fill('approfondi');await expect(page.locator('[data-model-search-count]')).toContainText('1 modèle correspondant');await page.getByLabel('Modèle IA',{exact:true}).selectOption({label:'Modèle approfondi de test'});await page.getByLabel('Rechercher un modèle IA',{exact:true}).fill('');await page.getByLabel('Modèle IA',{exact:true}).selectOption({label:'Modèle rapide de test'});
 await expect(page.locator('#workflow-model')).toHaveValue('fixture-fast');await page.getByRole('button',{name:'Appliquer à toutes les étapes IA',exact:true}).click();
 await page.getByRole('button',{name:'Choisir l’IA',exact:true}).click();await expect(page.getByLabel('Modèle IA',{exact:true})).toHaveValue('fixture-fast');
});
test('usage — using a meeting model asks for sources and keeps fresh sources without saving implicit copies',async()=>{
 const open=async()=>{
  await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Modèles',exact:true}).click();
  await page.locator('.template-card').filter({has:page.getByRole('heading',{name:'Clôture de réunion',exact:true})}).getByRole('button',{name:'Utiliser',exact:true}).click();
  await expect(page.locator('#request-workflow')).toHaveValue('template:meeting-conversation');
  await page.locator('#request-project').selectOption(fixture.project.id);await page.getByRole('button',{name:'Continuer',exact:true}).click();
  await expect(page.getByLabel('Réunions ou période à analyser',{exact:true})).toBeVisible();
 };
 await open();
 const copies=async()=>{const all=[];let offset=0;do{const p=await call('workflow.list',{project:fixture.project.id,offset});all.push(...p.items);offset=p.next;}while(offset!=null);return all.filter(g=>g.id.startsWith('meeting-conversation-use-'));};
 const first=await copies();expect(first).toHaveLength(0);
 await page.getByLabel('Réunions ou période à analyser',{exact:true}).fill('Comités du lundi et du jeudi');
 await page.getByLabel('Notes, transcriptions ou liens des réunions',{exact:true}).fill('Lundi : bilan partagé. Jeudi : action de test décidée.');
 await page.getByRole('button',{name:'Simuler le parcours',exact:true}).click();await expect(page.locator('#run-banner')).toContainText('Simulation');
 const runs=await call('run.list',{project:fixture.project.id});const run=runs.items.find(r=>r.original.id==='meeting-conversation');expect(run).toBeTruthy();
 const {run:details}=await call('run.get',{run:run.id});expect(details.parameters.request).toContain('Comités du lundi et du jeudi');expect(details.parameters.request).toContain('Jeudi : action de test décidée.');
 await open();expect((await copies()).map(g=>g.id)).toEqual(first.map(g=>g.id));
 // A new request reuses the definition, never the previous meeting's sources.
 await expect(page.getByLabel('Notes, transcriptions ou liens des réunions',{exact:true})).toHaveValue('');
 await expect(page.getByLabel('Réunions ou période à analyser',{exact:true})).toHaveValue('');
 await page.screenshot({path:test.info().outputPath('meeting-launch.png')});

});

test('personas — receive an existing result in one action, preserve notification draft and distinguish templates',async()=>{
 const graph={schema:1,id:'guided-author',title:'Guided author',nodes:[{id:'ask',kind:'question',title:'Demander le besoin',question:'Quel besoin ?',outputs:{answer:'string'}},{id:'work',kind:'task',title:'Préparer le résultat',validation:'contract',outputs:{result:'string'},sample_outputs:{result:'Exemple synthétique'}}],edges:[{id:'order',from:'ask',to:'work',outcome:'done'}]};
 await call('workflow.save',{project:fixture.project.id,graph});await page.locator('[data-workflow-route=global]').click();await page.locator('[data-action=registered-workflows]').click();await page.locator('[data-action=open-workflow][data-id=guided-author]').click();
 await page.locator('.node[data-id=work]').click();await page.getByRole('button',{name:'Recevoir un résultat existant…',exact:true}).click();await page.getByLabel('Résultat à recevoir').selectOption(JSON.stringify(['ask','answer']));await page.getByLabel('Nom dans cette étape').fill('Brief client');await page.getByRole('button',{name:'Ajouter et relier',exact:true}).click();await expect(page.locator('.ports')).toContainText('Vient de : Demander le besoin');await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
 await expect.poll(async()=>{const g=await call('workflow.get',{project:fixture.project.id,workflow:graph.id});return g.edges[0].mapping?.answer;}).toBe('Brief_client');
 await page.getByRole('button',{name:'Paramètres du workflow',exact:true}).click();await page.getByLabel('Description',{exact:true}).fill('Description conservée après configuration');await expect(page.locator('#question-recipient')).toBeHidden();await page.getByRole('button',{name:'Configurer une notification…',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('adaptateur local compatible');await page.getByRole('button',{name:'Revenir aux paramètres',exact:true}).click();await expect(page.getByLabel('Description',{exact:true})).toHaveValue('Description conservée après configuration');await page.getByRole('button',{name:'Appliquer',exact:true}).click();
 await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Modèles',exact:true}).click();await page.getByLabel('Type de modèle').selectOption('component');await expect(page.locator('.template-card:visible')).toHaveCount(6);await expect(page.locator('.template-card:visible').first()).toContainText('Bloc à composer');await page.getByLabel('Type de modèle').selectOption('workflow');await expect(page.locator('.template-card:visible').filter({hasText:'Clôture de réunion'})).toHaveCount(1);
});

test('personas — local launch has one primary execution and one final human decision',async()=>{
 await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Modèles',exact:true}).click();await page.locator('.template-card').filter({has:page.getByRole('heading',{name:'Commande locale avec validation',exact:true})}).getByRole('button',{name:'Utiliser',exact:true}).click();await page.locator('#request-project').selectOption(fixture.project.id);await page.getByRole('button',{name:'Continuer',exact:true}).click();
 await expect(page.getByRole('button',{name:'Lancer dans le terminal',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Lancer l’exécution réelle',exact:true})).toBeVisible();await page.getByLabel('Titre court (facultatif)').fill('Vérification Atlas');await page.getByRole('button',{name:'Simuler le parcours',exact:true}).click();await expect(page.locator('.node[data-id=decision]')).toContainText('Décision attendue');await expect(page.locator('.node[data-id=check]')).toContainText('Produit');await page.locator('.node[data-id=decision]').click();await page.getByRole('button',{name:'Approuver la suite',exact:true}).click();await expect(page.locator('#execution-overview')).toContainText('Terminée');
});

test('personas — final deliverable is first, copies exactly and a short title preserves the full request',async()=>{
 const g={schema:1,id:'deliverable',title:'Brouillon final',nodes:[{id:'work',title:'Préparer le texte',kind:'task',validation:'contract',outputs:{Synthese:'string',actions:'array'},sample_outputs:{Synthese:'Objet : Suivi\n\nVoici le texte final à copier.',actions:[{action:'Rappeler Atlas'}]}}],edges:[]};await call('workflow.save',{project:fixture.project.id,graph:g});
 await page.locator('[data-workflow-route=global]').click();await page.locator('[data-action=registered-workflows]').click();await page.locator('[data-action=run-workflow][data-id=deliverable]').click();await page.getByLabel('Titre court (facultatif)').fill('Suivi Atlas');await page.locator('#initial-request').fill('Cette demande conserve toutes ses précisions, même avec un titre court.');await page.getByRole('button',{name:'Simuler le parcours',exact:true}).click();await expect(page.locator('#execution-overview')).toContainText('Terminée');await page.getByRole('button',{name:'Voir les résultats',exact:true}).click();await expect(page.locator('.final-deliverable').first()).toContainText('Voici le texte final à copier.');await expect(page.locator('.final-deliverable')).toHaveCount(2);await expect(page.getByRole('dialog').getByRole('heading',{name:'Livrable final'})).toBeVisible();
 await app.evaluate(({clipboard})=>{globalThis.personaCopied='';clipboard.writeText=text=>{globalThis.personaCopied=text;};});await page.getByRole('button',{name:'Copier le texte',exact:true}).click();expect(await app.evaluate(()=>globalThis.personaCopied)).toBe('Objet : Suivi\n\nVoici le texte final à copier.');const runs=await call('run.list',{project:fixture.project.id});const run=runs.items.find(r=>r.original.id==='deliverable');const detail=await call('run.get',{run:run.id});expect(detail.run.parameters.request).toBe('Suivi Atlas\n\nCette demande conserve toutes ses précisions, même avec un titre court.');
});

test('expert — natural decision labels survive renaming and drive the original branch',async()=>{
 const graph={schema:2,id:'natural-choices',title:'Choisir le canal',nodes:[{id:'gate',kind:'decision',title:'Choisir la destination',question:'Quel canal ?'},{id:'email',kind:'document',title:'Préparer email',validation:'automatic',content:'Brouillon email'},{id:'ticket',kind:'document',title:'Préparer ticket',validation:'automatic',content:'Brouillon ticket'}],edges:[]};
 await call('workflow.save',{project:fixture.project.id,graph});await page.locator('[data-workflow-route=global]').click();await page.locator('[data-action=registered-workflows]').click();await page.locator('[data-action=open-workflow][data-id=natural-choices]').click();await page.locator('.node[data-id=gate]').click();await page.getByLabel('Choix possibles (un par ligne)',{exact:true}).fill('Email client\nRéponse dans Odoo');await page.getByRole('button',{name:'Appliquer au bloc',exact:true}).click();
 for(const [label,to] of [['Email client','email'],['Réponse dans Odoo','ticket']]){await page.getByRole('button',{name:'Relier',exact:true}).click();await page.getByLabel('Depuis',{exact:true}).selectOption('gate');await page.getByLabel('Après l’issue').selectOption({label});await page.getByLabel('Vers',{exact:true}).selectOption(to);await page.getByRole('button',{name:'Créer le lien',exact:true}).click();}
 await page.locator('.node[data-id=gate]').click();await page.getByLabel('Choix possibles (un par ligne)',{exact:true}).fill('Email au client\nRéponse dans Odoo');await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await expect.poll(async()=> (await call('workflow.get',{project:fixture.project.id,workflow:graph.id})).nodes[0].option_labels?.Email_client).toBe('Email au client');
 await page.getByRole('button',{name:'Exécuter…',exact:true}).click();await page.getByRole('button',{name:'Simuler le parcours',exact:true}).click();await page.locator('.node[data-id=gate]').click();await page.getByRole('button',{name:'Email au client',exact:true}).click();await expect(page.locator('.node[data-id=email]')).toHaveAttribute('data-status','accepted');await expect(page.locator('.node[data-id=ticket]')).toHaveAttribute('data-status','skipped');
});

test('expert — fixed parameters configure a rule without JSON and task validation is explicit',async()=>{
 await page.locator('[data-workflow-route=global]').click();await page.locator('[data-action=registered-workflows]').click();await page.getByRole('button',{name:'Créer un workflow',exact:true}).click();await page.getByLabel('Nom du workflow',{exact:true}).fill('Ma procédure simple');await page.getByRole('button',{name:'Créer et ouvrir le workflow',exact:true}).click();await page.locator('.node[data-id=start]').click();await expect(page.getByLabel('Validation du résultat',{exact:true})).toHaveValue('human');await page.getByLabel('Validation du résultat',{exact:true}).selectOption('contract');await page.getByRole('button',{name:'Ajouter un résultat attendu',exact:true}).click();await expect(page.getByLabel('Donnée requise',{exact:true})).toBeVisible();await page.getByRole('dialog').getByLabel('Nom de l’information',{exact:true}).fill('Bilan');await page.getByRole('button',{name:'Ajouter la donnée',exact:true}).click();
 await page.getByRole('button',{name:'Paramètres du workflow',exact:true}).click();await page.getByText('Paramètres supplémentaires',{exact:true}).click();await page.getByLabel('Nom du nouveau paramètre').fill('Canal de réponse');await page.getByLabel('Valeur fixe',{exact:true}).fill('email');await page.getByRole('button',{name:'Ajouter ce paramètre',exact:true}).click();await expect(page.getByLabel('Canal de réponse',{exact:true})).toHaveValue('email');await page.getByRole('button',{name:'Appliquer',exact:true}).click();await page.getByRole('button',{name:'+ Ajouter un bloc',exact:true}).click();await expect(page.getByLabel("Type d'étape")).toHaveValue('task');await page.getByLabel("Type d'étape").selectOption('condition');await page.getByRole('dialog').getByLabel('Nom du bloc').fill('Aiguiller');await page.getByRole('button',{name:'Ajouter au workflow',exact:true}).click();await expect(page.locator('#inspector')).toContainText('Information à comparer absente');await page.getByLabel('Information à comparer').selectOption({label:'Canal de réponse · paramètre fixe'});await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await expect.poll(async()=>{const list=await call('workflow.list',{project:'workspace'});return list.items.find(g=>g.title==='Ma procédure simple')?.id;}).toBeTruthy();
});

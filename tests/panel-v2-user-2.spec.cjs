const {test, expect, _electron:electron}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {cleanupBroker}=require('./terminal-fixture.cjs');
const root=path.resolve(__dirname,'..');let directory,app,page,project,workflow;
const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
const snapshot=()=>call('workflow.get',{project:project.id,workflow});
function engine(command,data={}){const code=`import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\nfrom workflow_engine.iterations import activate,tick\nfrom workflow_engine.conversations import ask\ne=Engine(sys.argv[2]);p=json.load(sys.stdin)\n${command}\n`;const r=spawnSync('/usr/bin/python3',['-c',code,process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend'),path.join(directory,'workflows')],{input:JSON.stringify(data),encoding:'utf8',env:{PATH:path.join(directory,'bin')+':/usr/bin:/bin',HOME:directory,PYTHONDONTWRITEBYTECODE:'1'}});if(r.status)throw Error(r.stderr);return JSON.parse(r.stdout);}
async function capture(name){await page.screenshot({path:test.info().outputPath(name+'.png'),fullPage:true});}
async function open(){await page.locator('[data-workflow-route=global]').click();await page.getByText('Gestion des workflows', {exact:true}).click();await page.locator('[data-action=workflow-hub][data-tab=registered]').click();await page.locator(`[data-action=open-workflow][data-id="${workflow}"]`).click();}
async function inspect(id){await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${id}"]`).click();}
async function add(kind,title){await page.getByRole('button',{name:'+ Ajouter un bloc',exact:true}).click();await page.getByLabel("Type d'étape",{exact:true}).selectOption(kind);await page.getByRole('dialog').getByLabel('Nom du bloc',{exact:true}).fill(title);await page.getByRole('button',{name:'Ajouter au workflow',exact:true}).click();return page.locator('.node').filter({hasText:title}).getAttribute('data-id');}
async function port(direction,name,type){await page.getByRole('button',{name:direction==='inputs'?'Ajouter une information à utiliser':'Ajouter un résultat attendu',exact:true}).click();await page.getByLabel('Nom de l’information').fill(name);await page.getByRole('dialog').getByRole('combobox',{name:'Type',exact:true}).selectOption(type);await page.getByRole('button',{name:'Ajouter la donnée',exact:true}).click();}
async function connect(from,to,outcome='done',output='',input=''){await page.locator(`.node[data-id="${from}"]`).click();await page.getByRole('button',{name:'Relier',exact:true}).click();const form=page.locator('#connect-form');await form.locator('select[name=from]').selectOption(from);await form.locator('select[name=to]').selectOption(to);await form.locator('select[name=outcome]').selectOption(outcome);if(output)await form.locator('select[name=output]').selectOption(output);if(input)await form.locator('select[name=input]').selectOption(input);await page.getByRole('button',{name:'Créer le lien',exact:true}).click();}
test.beforeEach(async()=>{directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-panel-support-'));const bin=path.join(directory,'bin');fs.mkdirSync(bin);for(const provider of ['codex','claude'])fs.writeFileSync(path.join(bin,provider),'#!/bin/sh\nprintf "PANEL_SUPPORT_INERT\\n"\nexit 78\n',{mode:0o755});app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?[]:[root],env:{PATH:bin+':/usr/bin:/bin',HOME:directory,DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_DATA_HOME:path.join(directory,'data'),XDG_CACHE_HOME:path.join(directory,'cache'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'no-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'}});page=await app.firstWindow();await page.setViewportSize({width:1600,height:1050});await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Ouvrir un terminal',exact:true}).click();await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('codex --version; claude --version');await page.keyboard.press('Enter');await expect(page.locator('.xterm-screen:visible')).toContainText('PANEL_SUPPORT_INERT');await page.locator('[data-action=terminal-toggle]').click();project=await call('project.create',{title:'Support client — panel synthétique'});});
test.afterEach(async()=>{if(page&&!page.isClosed()&&test.info().status!==test.info().expectedStatus)await capture('echec-observe');if(app)await app.close();for(const socket of ['cockpit/odoo-tricorder/pty.sock','studio-pty.sock','runtime/pty.sock'])await cleanupBroker(path.join(directory,socket));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});

test('BA crée et utilise demande précision criticité et constat sans JSON',async()=>{
 await page.locator('[data-workflow-route=global]').click();await page.getByText('Gestion des workflows', {exact:true}).click();await page.locator('[data-action=workflow-hub][data-tab=registered]').click();await page.getByRole('button',{name:'Créer un workflow',exact:true}).click();await page.getByLabel('Nom du workflow',{exact:true}).fill('Support client — qualifier et constater');await page.getByLabel('Enregistrer dans',{exact:true}).selectOption(project.id);await page.getByRole('button',{name:'Créer et ouvrir le workflow',exact:true}).click();await expect(page.getByRole('heading',{name:'Support client — qualifier et constater',exact:true})).toBeVisible();workflow=(await call('workflow.list',{project:project.id})).items.find(g=>g.title==='Support client — qualifier et constater').id;
 expect((await snapshot()).schema).toBe(2);await page.locator('.node[data-id=start]').click();await page.getByLabel('Nom du bloc',{exact:true}).fill('Qualifier la criticité');await page.getByLabel('Consigne',{exact:true}).fill('Analyser la demande et la précision, produire la criticité et un constat factuel.');await page.getByRole('button',{name:'Appliquer au bloc',exact:true}).click();await port('outputs','critical','boolean');await port('outputs','constat','string');await port('inputs','demande','string');await port('inputs','precision','string');
 const demande=await add('question','Décrire la demande client');const precision=await add('question','Préciser depuis quand le problème survient');const route=await add('condition','Aiguiller critique ou normal');await port('inputs','critical','boolean');await port('inputs','constat','string');await port('outputs','constat','string');await page.getByLabel('Information à comparer',{exact:true}).selectOption('critical');await expect(page.getByLabel('Type de branchement',{exact:true})).toHaveValue('boolean');await expect(page.locator('[data-condition-boolean]')).toContainText('Oui');await page.getByRole('button',{name:'Appliquer au bloc',exact:true}).click();const urgent=await add('question','Confirmer le constat critique');await port('inputs','constat','string');const normal=await add('question','Confirmer le constat normal');await port('inputs','constat','string');
 await connect(demande,precision);await connect(demande,'start','done','answer','demande');await connect(precision,'start','done','answer','precision');await connect('start',route,'done','critical','critical');await connect(route,urgent,'true','constat','constat');await connect(route,normal,'false','constat','constat');await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await expect.poll(async()=>(await snapshot()).nodes.length).toBe(6);await page.getByRole('button',{name:'Réorganiser le graphe',exact:true}).click();await page.getByRole('button',{name:'Ajuster',exact:true}).click();await capture('01-workflow-cree-support');
 const terminals=(await page.evaluate(()=>window.tricorder.terminals.list())).filter(t=>t.alive).map(t=>[t.id,t.pid]);
 for(const critical of [false,true]){const graph=await snapshot();const run=engine("r=e.start(p['project'],p['graph'],driver='conversation');print(json.dumps({'id':r['id']}))",{project:project.id,graph});await inspect(run.id);await page.getByRole('button',{name:'Détail',exact:true}).click();await page.getByLabel('Votre réponse',{exact:true}).fill('SYNTHETIQUE : impossible de générer le rapport de stock.');await page.getByRole('button',{name:'Répondre',exact:true}).click();await page.getByRole('button',{name:'Graphe',exact:true}).click();await page.locator(`.node[data-id="${precision}"]`).click();await page.getByLabel('Votre réponse',{exact:true}).fill('Depuis lundi, après le changement de filtre.');await page.getByRole('button',{name:'Répondre',exact:true}).click();await expect.poll(async()=>(await call('run.get',{run:run.id})).run.nodes.start.status).toBe('ready');
 engine("c=e.claim(p['run'],'start');e.submit(p['run'],'start',c['token'],{'ok':True,'summary':'SYNTHETIQUE : défaut de filtre confirmé','outputs':{'critical':p['critical'],'constat':'SYNTHETIQUE : rapport vide avec le filtre dépôt Nord.'}});print(json.dumps({'ok':True}))",{run:run.id,critical});await page.getByRole('button',{name:'Graphe',exact:true}).click();await page.locator('.node[data-id=start]').click();await page.getByRole('button',{name:'Valider le résultat',exact:true}).click();await page.getByRole('button',{name:'Graphe',exact:true}).click();const chosen=critical?urgent:normal,skipped=critical?normal:urgent;await expect(page.locator(`.node[data-id="${chosen}"]`)).toHaveAttribute('data-status','waiting_input');await expect(page.locator(`.node[data-id="${skipped}"]`)).toHaveAttribute('data-status','skipped');await page.locator(`.node[data-id="${chosen}"]`).click();await expect(page.locator('.question-preview')).toContainText('rapport vide avec le filtre dépôt Nord');await expect(page.locator('.question-preview .business-text')).toBeVisible();await expect(page.locator('.step-trail')).toContainText(critical?'Si : Oui':'Si : Non');await expect(page.getByText('Entrées et sources de la demande',{exact:true}).locator('..')).not.toHaveAttribute('open','');await capture(critical?'03-branche-critique':'02-branche-normale');await page.getByLabel('Votre réponse',{exact:true}).fill('Constat reçu : rapport vide reproduit sur le filtre Nord.');await page.getByRole('button',{name:'Répondre',exact:true}).click();await expect.poll(async()=>(await call('run.get',{run:run.id})).run.status).toBe('completed');await page.getByRole('button',{name:'Voir les résultats',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('rapport vide');await capture(critical?'05-resultat-critique':'04-resultat-normal');await page.getByRole('button',{name:'Fermer la fenêtre',exact:true}).click();}
 expect((await page.evaluate(()=>window.tricorder.terminals.list())).filter(t=>t.alive).map(t=>[t.id,t.pid])).toEqual(terminals);
});

test('BA répare un lien incompatible dans les formulaires de ports',async()=>{
 workflow='support-wiring';await call('workflow.save',{project:project.id,graph:{schema:2,id:workflow,title:'Support — câblage à réparer',nodes:[{id:'analyse',kind:'task',title:'Analyser la demande',outputs:{constat:{type:'string',required:true},critical:{type:'boolean',required:true}},position:{x:50,y:50}},{id:'relire',kind:'task',title:'Relire le constat',inputs:{fiche:{type:'string',required:true}},position:{x:440,y:50}}],edges:[]}});await open();await page.locator('.node[data-id=analyse]').click();await page.getByRole('button',{name:'Relier',exact:true}).click();await page.locator('#connect-form select[name=output]').selectOption('critical');await page.locator('#connect-form select[name=input]').selectOption('fiche');await page.getByRole('button',{name:'Créer le lien',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Impossible de relier « critical » à « fiche »');await expect(page.getByRole('alert')).not.toContainText('Choisissez la sortie');await capture('06-lien-incompatible');await expect(page.getByRole('dialog')).toBeVisible();await page.locator('#connect-form select[name=output]').selectOption('constat');await page.getByRole('button',{name:'Créer le lien',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await expect.poll(async()=>(await snapshot()).edges[0]?.mapping).toEqual({constat:'fiche'});await page.locator('.node[data-id=relire]').click();await page.locator('.design-links > summary').click();await expect(page.locator('.design-links')).toContainText('constat → fiche');await capture('07-lien-repare');
});

test('BA voit question et échec par élément et reprend uniquement le travail échoué',async()=>{
 // Foreach children run automatically even when their parent uses a conversation.
 // Let the actual runtime own their claims; a local provider fixture supplies the
 // three outcomes instead of racing the desktop's periodic dispatcher.
 fs.writeFileSync(path.join(directory,'bin/codex'),`#!/usr/bin/python3
import json,os,sys
from pathlib import Path
if 'exec' not in sys.argv:
 print('PANEL_SUPPORT_INERT',flush=True)
 raise SystemExit(0)
prompt=json.load(sys.stdin)
key=prompt['parameters']['element_id']
assert key in {'done','question','failed'}
log=Path(os.environ['HOME'])/('provider-'+key+'.json')
calls=json.loads(log.read_text()) if log.exists() else []
calls.append({'pid':os.getpid(),'interactions':prompt.get('interactions',[])})
log.write_text(json.dumps(calls))
question=''
if key=='question' and not prompt.get('interactions'):
 question='Quel dépôt provoque le rapport vide ?'
 summary='SYNTHETIQUE : dépôt à préciser'
 outputs={}
elif key=='failed' and len(calls)==1:
 summary='SYNTHETIQUE : export source absent'
 outputs={}
else:
 summary='SYNTHETIQUE : constat reçu'
 outputs={'constat':{'done':'Filtre corrigé','question':'Dépôt Nord confirmé','failed':'Export du dépôt Nord reçu'}[key]}
value={'summary':summary,'question':question,'outputs_json':json.dumps(outputs)}
print(json.dumps({'type':'thread.started','thread_id':'support-fixture-'+key+'-'+str(len(calls))}),flush=True)
print(json.dumps({'type':'item.completed','item':{'type':'agent_message','text':json.dumps(value)}}),flush=True)
print(json.dumps({'type':'turn.completed','usage':{'input_tokens':1,'output_tokens':1}}),flush=True)
`,{mode:0o755});
 const providerCalls=key=>JSON.parse(fs.readFileSync(path.join(directory,'provider-'+key+'.json'),'utf8'));
 const object={type:'object',required:true},list={type:'array',items:'object',required:true,minItems:0,maxItems:10};
 workflow='support-many';
 await call('workflow.save',{project:project.id,graph:{schema:2,id:workflow,title:'Support — demandes parallèles',defaults:{provider:'codex',model:'synthetic-support'},nodes:[
  {id:'plan',kind:'task',title:'Plan de support',outputs:{items:list},validation:'contract',position:{x:50,y:50}},
  {id:'each',kind:'foreach',title:'Traiter les tickets',inputs:{items:list},outputs:{results:list,contributions:list},collection:'items',concurrency:3,position:{x:450,y:50},workflow:{schema:2,id:'support-one',title:'Diagnostic du ticket',nodes:[{id:'work',kind:'agent',title:'Établir le constat',inputs:{item:object},outputs:{constat:{type:'string',required:true}},validation:'contract',max_attempts:2}],edges:[]}}
 ],edges:[{id:'plan-each',from:'plan',to:'each',mapping:{items:'items'}}]}});
 const fixture=engine("r=e.start(p['project'],p['graph'],driver='conversation');c=e.claim(r['id'],'plan');e.submit(r['id'],'plan',c['token'],{'ok':True,'summary':'Plan synthétique pour trois tickets','outputs':{'items':[{'id':'done','title':'Ticket réglé'},{'id':'question','title':'Ticket à préciser'},{'id':'failed','title':'Ticket source manquante'}]}});print(json.dumps({'id':r['id']}))",{project:project.id,graph:await snapshot()});
 await inspect(fixture.id);
 await page.getByRole('button',{name:'Lancer les éléments',exact:true}).click();
 await page.getByRole('button',{name:'Lancer le traitement des éléments',exact:true}).click();
 await expect.poll(async()=>(await call('run.get',{run:fixture.id})).run.nodes.each.children?.length).toBe(3);
 const family=engine("r=e.run(p['run']);print(json.dumps({x['element']:x['run'] for x in r['nodes']['each']['children']}))",{run:fixture.id});
 await expect.poll(()=>engine("print(json.dumps({key:e.run(rid)['nodes']['work']['status'] for key,rid in p.items()}))",family),{timeout:15000}).toEqual({done:'accepted',question:'waiting_input',failed:'returned'});
 const completedBefore=(await call('run.get',{run:family.done})).run;
 expect(['done','question','failed'].map(key=>providerCalls(key).length)).toEqual([1,1,1]);
 expect(new Set(['done','question','failed'].map(key=>providerCalls(key)[0].pid)).size).toBe(3);
 await page.getByRole('button',{name:'Graphe',exact:true}).click();
 await expect(page.locator('.node[data-id=each]')).toContainText('Ticket à préciser');
 await expect(page.locator('#execution-overview')).toContainText('réponse');
 await capture('08-parent-question-et-echec');
 await page.locator('[data-action=terminal-toggle]').click();
 await page.setViewportSize({width:1280,height:800});
 await page.getByRole('button',{name:'Ajuster',exact:true}).click();
 await expect(page.locator('.xterm-screen:visible')).toBeVisible();
 await capture('08b-parent-terminal-1280');
 await page.setViewportSize({width:1600,height:1050});
 await page.locator('[data-action=terminal-toggle]').click();
 await page.getByRole('button',{name:'Ajuster',exact:true}).click();
 await page.locator('.node[data-id=each] .node-work-items button').filter({hasText:'Ticket à préciser'}).click();
 await page.getByRole('button',{name:'Détail',exact:true}).click();
 await expect(page.locator('#inspector')).toContainText('Quel dépôt');
 await page.getByLabel('Votre réponse',{exact:true}).fill('Dépôt Nord');
 await page.getByRole('button',{name:'Répondre',exact:true}).click();
 await expect.poll(async()=>(await call('run.get',{run:family.question})).run.nodes.work.status,{timeout:15000}).toBe('accepted');
 await page.getByRole('button',{name:'← Revenir au workflow parent',exact:true}).click();
 await page.getByRole('button',{name:'Graphe',exact:true}).click();
 await page.locator('.node[data-id=each] .node-work-items button').filter({hasText:'Ticket source manquante'}).click();
 await page.getByRole('button',{name:'Détail',exact:true}).click();
 await page.getByRole('button',{name:'Relancer cette étape…',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('relance immédiatement');
 await expect(page.getByRole('dialog')).toContainText('consomme une tentative');
 expect((await call('run.get',{run:family.failed})).run.nodes.work.attempt).toBe(1);
 expect(providerCalls('failed')).toHaveLength(1);
 await page.getByLabel('Correction attendue',{exact:true}).fill('Utiliser l’export synthétique du dépôt Nord fourni.');
 await capture('09-reprise-ciblee');
 await page.getByRole('button',{name:'Relancer maintenant',exact:true}).click();
 await expect.poll(async()=>(await call('run.get',{run:family.failed})).run.nodes.work.status,{timeout:15000}).toBe('accepted');
 await page.getByRole('button',{name:'← Revenir au workflow parent',exact:true}).click();
 await expect.poll(async()=>(await call('run.get',{run:fixture.id})).run.status,{timeout:15000}).toBe('completed');
 expect((await call('run.get',{run:family.done})).run).toEqual(completedBefore);
 expect((await call('run.get',{run:family.failed})).run.nodes.work.attempt).toBe(2);
 expect((await call('run.get',{run:family.question})).run.nodes.work.attempt).toBe(1);
 expect(['done','question','failed'].map(key=>providerCalls(key).length)).toEqual([1,2,2]);
 expect(JSON.stringify(providerCalls('question')[1].interactions)).toContain('Dépôt Nord');
 await capture('10-parent-termine-reprise-ciblee');
 fs.writeFileSync(test.info().outputPath('provider-calls.json'),JSON.stringify(Object.fromEntries(['done','question','failed'].map(key=>[key,providerCalls(key)])),null,2));
});

# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: panel-v2-user-2.spec.cjs >> BA voit question et échec par élément et reprend uniquement le travail échoué
- Location: tests/panel-v2-user-2.spec.cjs:32:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "ready"
Received: "accepted"

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - complementary "Tricorder" [ref=e3]:
    - navigation "Navigation principale" [ref=e9]:
      - button "Activité" [ref=e10] [cursor=pointer]
      - button "Workflows" [ref=e17] [cursor=pointer]
      - button "Projets" [ref=e24] [cursor=pointer]
    - generic [ref=e28]: Accès rapide aux projets
    - generic [ref=e29]:
      - generic [ref=e30]: Rechercher un projet
      - searchbox "Rechercher un projet" [ref=e31]
    - button "Support client — panel synthétique" [ref=e33] [cursor=pointer]
    - generic [ref=e35]:
      - navigation "Configuration" [ref=e36]:
        - button "Planifications" [ref=e37] [cursor=pointer]
        - button "Connexions" [ref=e41] [cursor=pointer]
      - button "Paramètres" [ref=e48] [cursor=pointer]
      - group [ref=e52]:
        - generic "Outils et aide" [ref=e53] [cursor=pointer]
  - main [ref=e54]:
    - generic [ref=e55]:
      - generic [ref=e56]: Support client — panel synthétique
      - generic [ref=e58]:
        - button "Terminal 1" [ref=e59] [cursor=pointer]:
          - generic [ref=e62]: Terminal
          - generic [ref=e63]: "1"
        - generic [ref=e64]:
          - text: IA des prochains lancements
          - combobox "Fournisseur IA" [ref=e65]:
            - option "OpenAI · Codex" [selected]
            - option "Anthropic · Claude"
        - group "Thème de l’interface" [ref=e66]:
          - button "Thème clair" [ref=e67] [cursor=pointer]
          - button "Thème sombre" [ref=e71] [cursor=pointer]
          - button "Thème système" [pressed] [ref=e74] [cursor=pointer]
        - status [ref=e78]: À jour
        - button "Actualiser · À jour" [ref=e79] [cursor=pointer]
    - generic [ref=e85]:
      - main [ref=e87]:
        - generic [ref=e88]:
          - generic [ref=e89]:
            - generic [ref=e90]:
              - generic [ref=e91]: Suivi · Diagnostic du ticket
              - heading "Ticket à préciser" [level=1] [ref=e92]
            - group [ref=e94]:
              - generic "Options" [ref=e95] [cursor=pointer]
          - tablist "Vues du workflow"
          - region "État et prochaine action" [ref=e96]:
            - generic [ref=e97]:
              - generic [ref=e98]: Tâche · Support — demandes parallèles · Support client — panel synthétique
              - button "← Revenir au workflow parent" [ref=e99] [cursor=pointer]
            - generic [ref=e100]:
              - generic [ref=e101]:
                - strong [ref=e102]: Terminée
                - generic [ref=e103]: 1 / 1 étapes
              - button "Voir les résultats" [ref=e104] [cursor=pointer]
              - button "Voir le rapport" [ref=e105] [cursor=pointer]
            - paragraph [ref=e106]: Exécution terminée.
          - generic [ref=e107]:
            - strong [ref=e108]: Simulation.
            - text: Aucun modèle ni service métier appelé.
          - group "Affichage du suivi" [ref=e110]:
            - button "Graphe" [ref=e111] [cursor=pointer]
            - button "Détail" [pressed] [ref=e112] [cursor=pointer]
          - complementary "Inspecteur du bloc" [ref=e114]:
            - navigation "Position dans le workflow" [ref=e115]:
              - generic "Étape sélectionnée" [ref=e117]:
                - button "Étape sélectionnée Établir le constat" [ref=e118] [cursor=pointer]:
                  - generic [ref=e119]: Étape sélectionnée
                  - strong [ref=e120]: Établir le constat
            - paragraph [ref=e121]:
              - generic [ref=e122]: Produit · sorties vérifiées
            - paragraph [ref=e123]: SIMULATION — Résultat d'exemple pour « Établir le constat ». Aucun outil métier ni service externe n'a été appelé.
            - paragraph [ref=e124]: Preuve simulée, sans valeur de test métier réel.
            - generic [ref=e125]:
              - strong [ref=e126]: Résultat validé
              - paragraph [ref=e127]: Contrôles techniques automatiques ; aucun critère métier attesté.
            - group [ref=e128]:
              - generic "Entrées, sorties et preuves" [ref=e129] [cursor=pointer]
              - generic [ref=e130]:
                - heading "Entrées reçues" [level=3] [ref=e131]
                - generic [ref=e132]:
                  - term [ref=e133]: Item
                  - definition [ref=e134]:
                    - generic [ref=e135]:
                      - term [ref=e136]: Id
                      - definition [ref=e137]: question
                      - term [ref=e138]: Titre
                      - definition [ref=e139]: Ticket à préciser
                - group [ref=e140]:
                  - generic "Données techniques" [ref=e141] [cursor=pointer]
              - generic [ref=e142]:
                - heading "Résultat" [level=3] [ref=e143]
                - generic [ref=e144]:
                  - term [ref=e145]: Constat
                  - definition [ref=e146]: Exemple simulé
                - group [ref=e147]:
                  - generic "Données techniques" [ref=e148] [cursor=pointer]
              - generic [ref=e149]:
                - heading "Preuves" [level=3] [ref=e150]
                - button "Preuve 1 · dded7c93" [ref=e151] [cursor=pointer]
      - status [ref=e152]: Réponse enregistrée.
```

# Test source

```ts
  1  | const {test, expect, _electron:electron}=require('@playwright/test');
  2  | const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
  3  | const {cleanupBroker}=require('./terminal-fixture.cjs');
  4  | const root=path.resolve(__dirname,'..');let directory,app,page,project,workflow;
  5  | const call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
  6  | const snapshot=()=>call('workflow.get',{project:project.id,workflow});
  7  | function engine(command,data={}){const code=`import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\nfrom workflow_engine.iterations import activate,tick\nfrom workflow_engine.conversations import ask\ne=Engine(sys.argv[2]);p=json.load(sys.stdin)\n${command}\n`;const r=spawnSync('/usr/bin/python3',['-c',code,process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend'),path.join(directory,'workflows')],{input:JSON.stringify(data),encoding:'utf8',env:{PATH:path.join(directory,'bin')+':/usr/bin:/bin',HOME:directory,PYTHONDONTWRITEBYTECODE:'1'}});if(r.status)throw Error(r.stderr);return JSON.parse(r.stdout);}
  8  | async function capture(name){await page.screenshot({path:test.info().outputPath(name+'.png'),fullPage:true});}
  9  | async function open(){await page.locator('[data-workflow-route=global]').click();await page.locator(`[data-action=open-workflow][data-id="${workflow}"]`).click();}
  10 | async function inspect(id){await page.locator('[data-workflow-route=projects]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.locator(`[data-action=open-run][data-id="${id}"]`).click();}
  11 | async function add(kind,title){await page.getByRole('button',{name:'+ Ajouter un bloc',exact:true}).click();await page.getByLabel("Type d'étape",{exact:true}).selectOption(kind);await page.getByRole('dialog').getByLabel('Nom du bloc',{exact:true}).fill(title);await page.getByRole('button',{name:'Ajouter au workflow',exact:true}).click();return page.locator('.node').filter({hasText:title}).getAttribute('data-id');}
  12 | async function port(direction,name,type){await page.getByRole('button',{name:direction==='inputs'?'Ajouter une entrée':'Ajouter une sortie',exact:true}).click();await page.getByLabel('Nom (sans espaces)').fill(name);await page.getByRole('dialog').getByRole('combobox',{name:'Type',exact:true}).selectOption(type);await page.getByRole('button',{name:'Ajouter la donnée',exact:true}).click();}
  13 | async function connect(from,to,outcome='done',output='',input=''){await page.locator(`.node[data-id="${from}"]`).click();await page.getByRole('button',{name:'Relier',exact:true}).click();const form=page.locator('#connect-form');await form.locator('select[name=from]').selectOption(from);await form.locator('select[name=to]').selectOption(to);await form.locator('select[name=outcome]').selectOption(outcome);if(output)await form.locator('select[name=output]').selectOption(output);if(input)await form.locator('select[name=input]').selectOption(input);await page.getByRole('button',{name:'Créer le lien',exact:true}).click();}
  14 | test.beforeEach(async()=>{directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-panel-support-'));const bin=path.join(directory,'bin');fs.mkdirSync(bin);for(const provider of ['codex','claude'])fs.writeFileSync(path.join(bin,provider),'#!/bin/sh\nprintf "PANEL_SUPPORT_INERT\\n"\nexit 78\n',{mode:0o755});app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?[]:[root],env:{PATH:bin+':/usr/bin:/bin',HOME:directory,DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_DATA_HOME:path.join(directory,'data'),XDG_CACHE_HOME:path.join(directory,'cache'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'no-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'}});page=await app.firstWindow();await page.setViewportSize({width:1600,height:1050});await expect(page.getByRole('heading',{name:'Un workflow clair.'})).toBeVisible();await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Ouvrir un terminal',exact:true}).click();await page.locator('.xterm-helper-textarea:visible').focus();await page.keyboard.type('codex --version; claude --version');await page.keyboard.press('Enter');await expect(page.locator('.xterm-screen:visible')).toContainText('PANEL_SUPPORT_INERT');await page.locator('[data-action=terminal-toggle]').click();project=await call('project.create',{title:'Support client — panel synthétique'});});
  15 | test.afterEach(async()=>{if(page&&!page.isClosed()&&test.info().status!==test.info().expectedStatus)await capture('echec-observe');if(app)await app.close();for(const socket of ['cockpit/odoo-tricorder/pty.sock','studio-pty.sock','runtime/pty.sock'])await cleanupBroker(path.join(directory,socket));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
  16 | 
  17 | test('BA crée et utilise demande précision criticité et constat sans JSON',async()=>{
  18 |  await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Créer un workflow',exact:true}).click();await page.getByLabel('Nom du workflow',{exact:true}).fill('Support client — qualifier et constater');await page.getByLabel('Enregistrer dans',{exact:true}).selectOption(project.id);await page.getByRole('button',{name:'Créer et ouvrir le workflow',exact:true}).click();await expect(page.getByRole('heading',{name:'Support client — qualifier et constater',exact:true})).toBeVisible();workflow=(await call('workflow.list',{project:project.id})).items.find(g=>g.title==='Support client — qualifier et constater').id;
  19 |  await page.getByRole('button',{name:'Données structurées…',exact:true}).click();await page.getByRole('button',{name:'Convertir ce brouillon',exact:true}).click();await page.locator('.node[data-id=start]').click();await page.getByLabel('Nom du bloc',{exact:true}).fill('Qualifier la criticité');await page.getByLabel('Consigne',{exact:true}).fill('Analyser la demande et la précision, produire la criticité et un constat factuel.');await page.getByRole('button',{name:'Appliquer au bloc',exact:true}).click();await port('outputs','critical','boolean');await port('outputs','constat','string');await port('inputs','demande','string');await port('inputs','precision','string');
  20 |  const demande=await add('question','Décrire la demande client');const precision=await add('question','Préciser depuis quand le problème survient');const route=await add('condition','Aiguiller critique ou normal');await port('inputs','critical','boolean');await port('inputs','constat','string');await port('outputs','constat','string');await page.getByLabel('Donnée à comparer (entrée ou paramètre du workflow)',{exact:true}).fill('critical');await expect(page.getByLabel('Type de branchement',{exact:true})).toHaveValue('boolean');await expect(page.locator('[data-condition-boolean]')).toContainText('Oui');await page.getByRole('button',{name:'Appliquer au bloc',exact:true}).click();const urgent=await add('question','Confirmer le constat critique');await port('inputs','constat','string');const normal=await add('question','Confirmer le constat normal');await port('inputs','constat','string');
  21 |  await connect(demande,precision);await connect(demande,'start','done','answer','demande');await connect(precision,'start','done','answer','precision');await connect('start',route,'done','critical','critical');await connect(route,urgent,'true','constat','constat');await connect(route,normal,'false','constat','constat');await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await expect.poll(async()=>(await snapshot()).nodes.length).toBe(6);await page.getByRole('button',{name:'Réorganiser le graphe',exact:true}).click();await page.getByRole('button',{name:'Ajuster',exact:true}).click();await capture('01-workflow-cree-support');
  22 |  const terminals=(await page.evaluate(()=>window.tricorder.terminals.list())).filter(t=>t.alive).map(t=>[t.id,t.pid]);
  23 |  for(const critical of [false,true]){const graph=await snapshot();const run=engine("r=e.start(p['project'],p['graph'],driver='conversation');print(json.dumps({'id':r['id']}))",{project:project.id,graph});await inspect(run.id);await page.getByRole('button',{name:'Détail',exact:true}).click();await page.getByLabel('Votre réponse',{exact:true}).fill('SYNTHETIQUE : impossible de générer le rapport de stock.');await page.getByRole('button',{name:'Répondre',exact:true}).click();await page.getByRole('button',{name:'Graphe',exact:true}).click();await page.locator(`.node[data-id="${precision}"]`).click();await page.getByLabel('Votre réponse',{exact:true}).fill('Depuis lundi, après le changement de filtre.');await page.getByRole('button',{name:'Répondre',exact:true}).click();await expect.poll(async()=>(await call('run.get',{run:run.id})).run.nodes.start.status).toBe('ready');
  24 |  engine("c=e.claim(p['run'],'start');e.submit(p['run'],'start',c['token'],{'ok':True,'summary':'SYNTHETIQUE : défaut de filtre confirmé','outputs':{'critical':p['critical'],'constat':'SYNTHETIQUE : rapport vide avec le filtre dépôt Nord.'}});print(json.dumps({'ok':True}))",{run:run.id,critical});await page.getByRole('button',{name:'Graphe',exact:true}).click();await page.locator('.node[data-id=start]').click();await page.getByRole('button',{name:'Valider le résultat',exact:true}).click();await page.getByRole('button',{name:'Graphe',exact:true}).click();const chosen=critical?urgent:normal,skipped=critical?normal:urgent;await expect(page.locator(`.node[data-id="${chosen}"]`)).toHaveAttribute('data-status','waiting_input');await expect(page.locator(`.node[data-id="${skipped}"]`)).toHaveAttribute('data-status','skipped');await page.locator(`.node[data-id="${chosen}"]`).click();await expect(page.locator('.question-preview')).toContainText('rapport vide avec le filtre dépôt Nord');await expect(page.locator('.question-preview .business-text')).toBeVisible();await expect(page.getByText('Entrées et sources de la demande',{exact:true}).locator('..')).not.toHaveAttribute('open','');await capture(critical?'03-branche-critique':'02-branche-normale');await page.getByLabel('Votre réponse',{exact:true}).fill('Constat reçu : rapport vide reproduit sur le filtre Nord.');await page.getByRole('button',{name:'Répondre',exact:true}).click();await expect.poll(async()=>(await call('run.get',{run:run.id})).run.status).toBe('completed');await page.getByRole('button',{name:'Voir les résultats',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('rapport vide');await capture(critical?'05-resultat-critique':'04-resultat-normal');await page.getByRole('button',{name:'Fermer la fenêtre',exact:true}).click();}
  25 |  expect((await page.evaluate(()=>window.tricorder.terminals.list())).filter(t=>t.alive).map(t=>[t.id,t.pid])).toEqual(terminals);
  26 | });
  27 | 
  28 | test('BA répare un lien incompatible dans les formulaires de ports',async()=>{
  29 |  workflow='support-wiring';await call('workflow.save',{project:project.id,graph:{schema:2,id:workflow,title:'Support — câblage à réparer',nodes:[{id:'analyse',kind:'task',title:'Analyser la demande',outputs:{constat:{type:'string',required:true},critical:{type:'boolean',required:true}},position:{x:50,y:50}},{id:'relire',kind:'task',title:'Relire le constat',inputs:{fiche:{type:'string',required:true}},position:{x:440,y:50}}],edges:[]}});await open();await page.locator('.node[data-id=analyse]').click();await page.getByRole('button',{name:'Relier',exact:true}).click();await page.locator('#connect-form select[name=output]').selectOption('critical');await page.locator('#connect-form select[name=input]').selectOption('fiche');await page.getByRole('button',{name:'Créer le lien',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Impossible de relier « critical » à « fiche »');await expect(page.getByRole('alert')).not.toContainText('Choisissez la sortie');await capture('06-lien-incompatible');await expect(page.getByRole('dialog')).toBeVisible();await page.locator('#connect-form select[name=output]').selectOption('constat');await page.getByRole('button',{name:'Créer le lien',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await expect.poll(async()=>(await snapshot()).edges[0]?.mapping).toEqual({constat:'fiche'});await page.locator('.node[data-id=relire]').click();await page.locator('.design-links > summary').click();await expect(page.locator('.design-links')).toContainText('constat → fiche');await capture('07-lien-repare');
  30 | });
  31 | 
  32 | test('BA voit question et échec par élément et reprend uniquement le travail échoué',async()=>{
  33 |  const object={type:'object',required:true},list={type:'array',items:'object',required:true,minItems:0,maxItems:10};workflow='support-many';await call('workflow.save',{project:project.id,graph:{schema:2,id:workflow,title:'Support — demandes parallèles',nodes:[{id:'plan',kind:'task',title:'Plan de support',outputs:{items:list},validation:'contract',position:{x:50,y:50}},{id:'each',kind:'foreach',title:'Traiter les tickets',inputs:{items:list},outputs:{results:list,contributions:list},collection:'items',concurrency:3,position:{x:450,y:50},workflow:{schema:2,id:'support-one',title:'Diagnostic du ticket',nodes:[{id:'work',kind:'task',title:'Établir le constat',inputs:{item:object},outputs:{constat:{type:'string',required:true}},validation:'contract',max_attempts:2}],edges:[]}}],edges:[{id:'plan-each',from:'plan',to:'each',mapping:{items:'items'}}]}});const fixture=engine("r=e.start(p['project'],p['graph'],simulation=True,driver='conversation');c=e.claim(r['id'],'plan');e.submit(r['id'],'plan',c['token'],{'ok':True,'summary':'Plan synthétique pour trois tickets','outputs':{'items':[{'id':'done','title':'Ticket réglé'},{'id':'question','title':'Ticket à préciser'},{'id':'failed','title':'Ticket source manquante'}]}});print(json.dumps({'id':r['id']}))",{project:project.id,graph:await snapshot()});await inspect(fixture.id);await page.getByRole('button',{name:'Lancer les éléments',exact:true}).click();await page.getByRole('button',{name:'Lancer le traitement des éléments',exact:true}).click();await expect.poll(async()=>(await call('run.get',{run:fixture.id})).run.nodes.each.children?.length).toBe(3);const family=engine("r=e.run(p['run']);m={x['element']:x['run'] for x in r['nodes']['each']['children']};c=e.claim(m['done'],'work');e.submit(m['done'],'work',c['token'],{'ok':True,'summary':'Ticket synthétique réglé','outputs':{'constat':'Filtre corrigé'}});c=e.claim(m['question'],'work');ask(e,m['question'],'work',c['token'],'Quel dépôt provoque le rapport vide ?');c=e.claim(m['failed'],'work');e.submit(m['failed'],'work',c['token'],{'ok':False,'summary':'SYNTHETIQUE : export source absent','outputs':{}});tick(e,p['run']);print(json.dumps(m))",{run:fixture.id});const completedBefore=(await call('run.get',{run:family.done})).run;
> 34 |  await page.getByRole('button',{name:'Graphe',exact:true}).click();await expect(page.locator('.node[data-id=each]')).toContainText('Ticket à préciser');await expect(page.locator('#execution-overview')).toContainText('réponse');await capture('08-parent-question-et-echec');await page.locator('[data-action=terminal-toggle]').click();await page.setViewportSize({width:1280,height:800});await page.getByRole('button',{name:'Ajuster',exact:true}).click();await expect(page.locator('.xterm-screen:visible')).toBeVisible();await capture('08b-parent-terminal-1280');await page.setViewportSize({width:1600,height:1050});await page.locator('[data-action=terminal-toggle]').click();await page.getByRole('button',{name:'Ajuster',exact:true}).click();await page.locator('.node[data-id=each] .node-work-items button').filter({hasText:'Ticket à préciser'}).click();await page.getByRole('button',{name:'Détail',exact:true}).click();await expect(page.locator('#inspector')).toContainText('Quel dépôt');await page.getByLabel('Votre réponse',{exact:true}).fill('Dépôt Nord');await page.getByRole('button',{name:'Répondre',exact:true}).click();await expect.poll(async()=>(await call('run.get',{run:family.question})).run.nodes.work.status).toBe('ready');engine("c=e.claim(p['run'],'work');e.submit(p['run'],'work',c['token'],{'ok':True,'summary':'Dépôt identifié','outputs':{'constat':'Défaut confirmé dépôt Nord'}});print(json.dumps({'ok':True}))",{run:family.question});await page.getByRole('button',{name:'← Revenir au workflow parent',exact:true}).click();await page.getByRole('button',{name:'Graphe',exact:true}).click();await page.locator('.node[data-id=each] .node-work-items button').filter({hasText:'Ticket source manquante'}).click();await page.getByRole('button',{name:'Détail',exact:true}).click();await page.getByRole('button',{name:'Préparer la reprise',exact:true}).click();await page.getByLabel('Correction attendue',{exact:true}).fill('Utiliser l’export synthétique du dépôt Nord fourni.');await capture('09-reprise-ciblee');await page.getByRole('button',{name:'Préparer cette étape pour reprise',exact:true}).click();await expect.poll(async()=>(await call('run.get',{run:family.failed})).run.nodes.work.status).toBe('ready');engine("c=e.claim(p['run'],'work');e.submit(p['run'],'work',c['token'],{'ok':True,'summary':'Export synthétique reçu','outputs':{'constat':'Source reçue et analysée'}});tick(e,p['parent']);print(json.dumps({'ok':True}))",{run:family.failed,parent:fixture.id});await page.getByRole('button',{name:'← Revenir au workflow parent',exact:true}).click();await expect.poll(async()=>(await call('run.get',{run:fixture.id})).run.status).toBe('completed');expect((await call('run.get',{run:family.done})).run).toEqual(completedBefore);expect((await call('run.get',{run:family.failed})).run.nodes.work.attempt).toBe(2);expect((await call('run.get',{run:family.question})).run.nodes.work.attempt).toBe(1);await capture('10-parent-termine-reprise-ciblee');
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ^ Error: expect(received).toBe(expected) // Object.is equality
  35 | });
  36 | 
```
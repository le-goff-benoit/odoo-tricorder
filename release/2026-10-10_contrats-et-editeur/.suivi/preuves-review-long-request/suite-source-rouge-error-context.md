# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional-feedback.spec.cjs >> version feedback: an automatic failure can configure a new copy while preserving its results
- Location: tests/functional-feedback.spec.cjs:110:1

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Examiner l’échec', exact: true })

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
    - button "Recette métier" [ref=e33] [cursor=pointer]
    - generic [ref=e35]:
      - navigation "Configuration" [ref=e36]:
        - button "Planifications" [ref=e37] [cursor=pointer]
        - button "Connexions" [ref=e41] [cursor=pointer]
      - button "Paramètres" [ref=e48] [cursor=pointer]
      - group [ref=e52]:
        - generic "Outils et aide" [ref=e53] [cursor=pointer]
  - main [ref=e54]:
    - generic [ref=e55]:
      - generic [ref=e56]: Recette métier
      - generic [ref=e58]:
        - button "Terminal" [ref=e59] [cursor=pointer]
        - generic [ref=e63]:
          - text: IA des prochains lancements
          - combobox "Fournisseur IA" [ref=e64]:
            - option "OpenAI · Codex" [selected]
            - option "Anthropic · Claude"
        - group "Thème de l’interface" [ref=e65]:
          - button "Thème clair" [ref=e66] [cursor=pointer]
          - button "Thème sombre" [ref=e70] [cursor=pointer]
          - button "Thème système" [pressed] [ref=e73] [cursor=pointer]
        - status [ref=e77]: À jour · 11:20
        - button "Actualiser · À jour · 11:20" [ref=e78] [cursor=pointer]
    - main [ref=e86]:
      - alert [ref=e88]: ((intermediate value) || (running && (intermediate value)) || graph.title).split is not a function
```

# Test source

```ts
  13  | test.beforeEach(async()=>{
  14  |  directory=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-feedback-ui-'));fs.mkdirSync(path.join(directory,'bin'));
  15  |  for(const provider of ['codex','claude'])fs.writeFileSync(path.join(directory,'bin',provider),'#!/bin/sh\nprintf "FUNCTIONAL_INERT_ONLY\\n"\ncase "$1" in --version) exit 0;; esac\nwhile IFS= read -r line; do printf "%s\\n" "$line"; done\n',{mode:0o755});
  16  |  fs.writeFileSync(path.join(directory,'bin/python3'),`#!/bin/sh\nexec /usr/bin/python3 "$@" 2>>"${directory}/backend-errors.log"\n`,{mode:0o755});
  17  |  env={PATH:path.join(directory,'bin')+':/usr/bin:/bin',HOME:directory,DISPLAY:process.env.DISPLAY,XAUTHORITY:process.env.XAUTHORITY,LANG:'C.UTF-8',XDG_CONFIG_HOME:path.join(directory,'config'),XDG_CACHE_HOME:path.join(directory,'cache'),XDG_DATA_HOME:path.join(directory,'data'),CODEX_HOME:path.join(directory,'codex'),CLAUDE_CONFIG_DIR:path.join(directory,'claude'),TRICORDER_HOME:directory,TRICORDER_STATE_DIR:directory,TRICORDER_RUNTIME_DIR:path.join(directory,'runtime'),TRICORDER_AGENTS_DIR:path.join(directory,'absent-pack'),TRICORDER_TEST_MODE:'1',PYTHONDONTWRITEBYTECODE:'1'};
  18  |  backend=process.env.TRICORDER_EXECUTABLE?path.join(path.dirname(process.env.TRICORDER_EXECUTABLE),'resources/backend'):path.join(root,'backend');
  19  |  fixture=JSON.parse(python(`from workflow_engine.conversations import Conversations
  20  | p=e.create_project('Recette métier');g={'schema':1,'id':'feedback','title':'Suivi métier','defaults':{'provider':'codex','model':'synthetic'},'nodes':[{'id':'work','kind':'task','title':'Préparer le résultat','prompt':'Rédiger le constat.','validation':'contract','outputs':{'report':'string'}}],'edges':[]};e.save(p['id'],g);c=Conversations(e);v=c.open(p['id'],g,'codex');items=[c.add(v['id'],'R'+str(n)+' — Point métier indépendant') for n in range(1,5)];print(json.dumps({'project':p,'conversation':v['id'],'items':items}))`));
  21  |  app=await electron.launch({executablePath:process.env.TRICORDER_EXECUTABLE,args:process.env.TRICORDER_EXECUTABLE?['--workflow-studio']:[root,'--workflow-studio'],env});page=await app.firstWindow();await page.setViewportSize({width:1440,height:1000});await openOverview();
  22  | });
  23  | test.afterEach(async({},info)=>{if(fs.existsSync(path.join(directory,'backend-errors.log')))fs.copyFileSync(path.join(directory,'backend-errors.log'),info.outputPath('backend-errors.log'));if(app)await app.close();await cleanupBroker(path.join(directory,'cockpit/odoo-tricorder/pty.sock'));await cleanupBroker(path.join(directory,'studio-pty.sock'));await cleanupBroker(path.join(directory,'runtime/pty.sock'));fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
  24  | 
  25  | test('business feedback: create an AND dependency on four demands, then explain a cancelled prerequisite',async()=>{
  26  |  await page.locator('.execution-menu > summary').click();await page.getByRole('button',{name:'Ajouter une demande…',exact:true}).click();
  27  |  await page.getByRole('dialog').getByLabel('Demande',{exact:true}).fill('C1 — Consolider les quatre résultats');
  28  |  for(const row of fixture.items)await page.locator(`#dependency-choices input[value="${row.id}"]`).check();
  29  |  await expect(page.locator('#dependency-count')).toContainText('4 demande(s)');await page.getByRole('button',{name:'Enregistrer la demande',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.conversation-demand')).toHaveCount(5);
  30  |  const c=await call('conversation.get',{conversation:fixture.conversation});const consolidation=c.items.find(i=>i.request.startsWith('C1'));
  31  |  expect(new Set(consolidation.depends_on)).toEqual(new Set(fixture.items.map(i=>i.id)));expect(consolidation.execution.status).toBe('paused');
  32  |  await item(0).locator('.conversation-demand-open').click();await expect(page.locator('.workflow-heading h1')).toContainText('R1 —');await page.locator('.execution-menu > summary').click();await page.getByRole('button',{name:'Annuler',exact:true}).click();await page.getByRole('button',{name:'Annuler l’exécution',exact:true}).click();
  33  |  await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();const row=page.locator(`.conversation-demand[data-run="${consolidation.run}"]`);await expect(row.locator('.dependency-link').first()).toContainText('Annulée');
  34  |  await row.locator('.conversation-demand-action').click();await expect(page.locator('#inspector')).toContainText('Bloquée par une demande préalable');await expect(page.locator('#inspector')).toContainText('ne peut pas reprendre');
  35  |  await page.getByRole('button',{name:'Créer une demande de remplacement',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('aucune validation passée ne sera transférée');await expect(page.locator(`#dependency-choices input[value="${fixture.items[0].id}"]`)).toBeDisabled();
  36  |  await page.getByRole('button',{name:'Fermer la fenêtre',exact:true}).click();expect((await call('run.get',{run:consolidation.run})).run.status).toBe('paused');
  37  | });
  38  | 
  39  | test('business feedback: a focused inspector updates after completion without stale ready instructions',async()=>{
  40  |  await item(0).locator('.conversation-demand-open').click();await page.getByRole('button',{name:'Détail',exact:true}).click();
  41  |  const inspector=page.locator('#inspector');await expect(inspector).toContainText('À traiter dans la conversation');await inspector.locator('.step-trail button').focus();
  42  |  python(`r=sys.argv[3];c=e.claim(r,'work');e.submit(r,'work',c['token'],{'ok':True,'summary':'Le compte rendu métier est terminé.','outputs':{'report':'Trois décisions enregistrées.'}})`,[fixture.items[0].run]);
  43  |  await expect(page.locator('.execution-label')).toHaveText('Terminée');await expect(inspector).toContainText('Le compte rendu métier est terminé.');await expect(inspector).not.toContainText('À traiter dans la conversation');
  44  |  await page.screenshot({path:test.info().outputPath('focused-inspector-completed.png')});
  45  | });
  46  | 
  47  | test('business feedback: a late conversation reply cannot overwrite the editor or raise a null query error',async()=>{
  48  |  await app.evaluate(({ipcMain})=>{const handler=ipcMain._invokeHandlers.get('studio:request');globalThis.__held=false;globalThis.__finished=false;ipcMain.removeHandler('studio:request');ipcMain.handle('studio:request',async(event,payload)=>{const result=await handler(event,payload);if(payload.action==='conversation.get'&&!globalThis.__held){globalThis.__held=true;await new Promise(resolve=>globalThis.__release=resolve);globalThis.__finished=true;}return result;});});
  49  |  await expect.poll(()=>app.evaluate(()=>globalThis.__held)).toBe(true);
  50  |  await page.locator('[data-workflow-route=global]').click();await page.locator('[data-action=open-workflow][data-id=feedback]').click();await expect(page.locator('[data-action=save]')).toBeVisible();
  51  |  await app.evaluate(()=>globalThis.__release());await expect.poll(()=>app.evaluate(()=>globalThis.__finished)).toBe(true);
  52  |  // Observe a subsequent completed backend request instead of a timing-only sleep.
  53  |  await call('workflow.get',{project:fixture.project.id,workflow:'feedback'});await expect(page.locator('#feedback')).not.toContainText('query');await expect(page.locator('#conversation-overview')).toHaveCount(0);await expect(page.locator('[data-action=save]')).toBeVisible();
  54  | });
  55  | 
  56  | test('business feedback: task instructions save with the common AI selection and survive reopen',async()=>{
  57  |  await page.locator('[data-workflow-route=global]').click();await page.locator('[data-action=open-workflow][data-id=feedback]').click();await page.locator('.node[data-id=work]').click();
  58  |  await page.getByLabel('Consigne',{exact:true}).fill('Conserver cette consigne métier avant de choisir une autre IA.');await page.getByRole('button',{name:'Choisir l’IA',exact:true}).click();await page.getByLabel('Modèle',{exact:true}).fill('synthetic-second');await page.getByRole('button',{name:'Appliquer à toutes les étapes IA',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  59  |  const g=await call('workflow.get',{project:fixture.project.id,workflow:'feedback'});expect(g.nodes[0].prompt).toBe('Conserver cette consigne métier avant de choisir une autre IA.');expect(g.defaults.model).toBe('synthetic-second');
  60  |  await page.locator('[data-workflow-route=global]').click();await page.locator('[data-action=open-workflow][data-id=feedback]').click();await page.locator('.node[data-id=work]').click();await expect(page.getByLabel('Consigne',{exact:true})).toHaveValue(g.nodes[0].prompt);await expect(page.locator('.workflow-heading p')).toContainText('Enregistré');
  61  | });
  62  | 
  63  | test('business feedback: pause and cancellation update an open inspector even when the node is unchanged',async()=>{
  64  |  await item(0).locator('.conversation-demand-open').click();await expect(page.locator('.workflow-heading h1')).toContainText('R1 —');await page.getByRole('button',{name:'Détail',exact:true}).click();const inspector=page.locator('#inspector');
  65  |  await expect(inspector).toContainText('À traiter dans la conversation');await inspector.locator('.step-trail button').focus();
  66  |  // External control uses the engine API, as a second session would. The inspector must follow it.
  67  |  await call('run.control',{run:fixture.items[0].run,control:'pause'});await expect(inspector).toContainText('Cette demande a été suspendue explicitement');await expect(inspector.getByRole('button',{name:'Reprendre la demande',exact:true})).toBeVisible();await expect(inspector).not.toContainText('À traiter dans la conversation');
  68  |  await call('run.control',{run:fixture.items[0].run,control:'cancel'});await expect(inspector).toContainText('Exécution annulée');await expect(inspector).toContainText('lecture seule');await expect(inspector.locator('form')).toHaveCount(0);
  69  | });
  70  | 
  71  | test('handover feedback: source execution stays reachable from its new workflow without reading JSON',async()=>{
  72  |  const transferred=JSON.parse(python(`e.workspace_context();g={'schema':1,'id':'global-source','title':'Compte rendu global fictif','nodes':[{'id':'work','kind':'task','title':'Constat global','validation':'contract','outputs':{'report':'string'}}],'edges':[]};r=e.start('workspace',g);claim=e.claim(r['id'],'work');e.submit(r['id'],'work',claim['token'],{'ok':True,'summary':'Constat global conservé.','outputs':{'report':'Deux décisions à préparer.'}});saved=e.handoff(r['id'],sys.argv[3],g,human=True);print(json.dumps({'workflow':saved,'run':r['id']}))`,[fixture.project.id]));
  73  |  await page.locator('[data-workflow-route=global]').click();await page.locator(`[data-action=open-workflow][data-id="${transferred.workflow.id}"]`).click();
  74  |  await expect(page.locator('.workflow-source')).toContainText('1 résultat(s) validé(s)');
  75  |  await expect(page.locator('.workflow-source')).toContainText('validations et autorisations restent propres');
  76  |  await page.getByRole('button',{name:'Consulter l’exécution d’origine',exact:true}).click();
  77  |  await expect(page.locator('.workflow-heading h1')).toContainText('Compte rendu global fictif');
  78  |  await page.locator('.node[data-id=work]').click();await page.getByRole('button',{name:'Détail',exact:true}).click();await expect(page.locator('#inspector')).toContainText('Constat global conservé.');
  79  |  expect((await call('run.get',{run:transferred.run})).run.status).toBe('completed');
  80  |  const saved=await call('workflow.get',{project:fixture.project.id,workflow:transferred.workflow.id});expect(saved.parameters.source_context.run).toBe(transferred.run);
  81  | });
  82  | 
  83  | test('creation feedback: choosing a model keeps the custom workflow name already entered',async()=>{
  84  |  await page.locator('[data-workflow-route=global]').click();await page.getByRole('button',{name:'Créer un workflow',exact:true}).click();
  85  |  await page.getByLabel('Nom du workflow',{exact:true}).fill('Contrôle des achats hebdomadaire');
  86  |  const model=await page.locator('#work-template option').nth(1).getAttribute('value');await page.locator('#work-template').selectOption(model);
  87  |  await expect(page.getByLabel('Nom du workflow',{exact:true})).toHaveValue('Contrôle des achats hebdomadaire');
  88  |  await page.getByRole('button',{name:'Créer et ouvrir le workflow',exact:true}).click();
  89  |  await expect(page.locator('.workflow-heading h1')).toHaveText('Contrôle des achats hebdomadaire');
  90  | });
  91  | 
  92  | test('version feedback: a missing delegated model keeps native work actionable and offers optional configuration',async()=>{
  93  |  fixture=JSON.parse(python(`from workflow_engine.conversations import Conversations
  94  | p=e.project(sys.argv[3]);g=next(g for g in e.workflows(p['id']) if g['id']=='feedback');g.pop('revision',None);g['id']='missing-model';g['defaults'].pop('model');g['nodes'][0]['kind']='agent';g=e.save(p['id'],g);c=Conversations(e);v=c.open(p['id'],g,'codex');i=c.add(v['id'],'Préparer le bilan sans modèle de bloc');print(json.dumps({'project':p,'conversation':v['id'],'items':[i]}))`,[fixture.project.id]));
  95  |  await openOverview();await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).click();await expect(item(0)).toContainText('À traiter dans la conversation');
  96  |  await page.locator('[data-workflow-route=overview]').click();
  97  |  const activity=page.locator(`.activity-row[data-id="${fixture.items[0].run}"]`);await expect(activity).toContainText('À traiter dans la conversation');await activity.click();
  98  |  await page.getByRole('button',{name:'Détail',exact:true}).click();
  99  |  await expect(page.locator('.execution-label')).toContainText('À traiter dans la conversation');
  100 |  await expect(page.locator('.workflow-heading p')).toContainText('Révision 1 figée');
  101 |  await expect(page.locator('#inspector .pill').first()).toHaveText('Dans la conversation');
  102 |  await page.locator('#inspector details').filter({has:page.locator('summary', {hasText:'Agent de bloc séparé (facultatif)'})}).locator('summary').click();
  103 |  await expect(page.locator('#inspector')).toContainText('Aucun modèle explicite');
  104 |  await expect(page.locator('#inspector')).not.toContainText('Cette étape est prête');
  105 |  await page.getByRole('button',{name:'Configurer un nouveau lancement…',exact:true}).click();
  106 |  await expect(page.getByRole('dialog')).toContainText('Les décisions et résultats précédents ne sont pas transférés');
  107 |  const preserved=await call('run.get',{run:fixture.items[0].run});expect(preserved.run.nodes.work.status).toBe('ready');
  108 | });
  109 | 
  110 | test('version feedback: an automatic failure can configure a new copy while preserving its results',async()=>{
  111 |  const failed=JSON.parse(python(`g=next(g for g in e.workflows(sys.argv[3]) if g['id']=='feedback');g.pop('revision',None);r=e.start(sys.argv[3],g,parameters={'request':'Préparer un bilan synthétique : '+('Tous les points doivent être conservés. '*1000)});claim=e.claim(r['id'],'work');e.submit(r['id'],'work',claim['token'],{'ok':False,'summary':'Configuration à revoir pour ce besoin.','outputs':{}});print(json.dumps(e.run(r['id'])))`,[fixture.project.id]));
  112 |  await page.locator('[data-workflow-route=overview]').click();await page.locator(`.activity-row[data-id="${failed.id}"]`).click();
> 113 |  await page.getByRole('button',{name:'Examiner l’échec',exact:true}).click();
      |                                                                      ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  114 |  await expect(page.locator('#inspector')).toContainText('Configuration à revoir pour ce besoin.');
  115 |  await page.getByRole('button',{name:'Configurer un nouveau lancement…',exact:true}).click();
  116 |  await page.getByRole('button',{name:'Configurer une copie',exact:true}).click();
  117 |  await page.getByLabel('Modèle',{exact:true}).fill('synthetic-reconfigured');
  118 |  await page.getByRole('button',{name:'Appliquer à toutes les étapes IA',exact:true}).click();
  119 |  await expect(page.getByRole('dialog')).toHaveCount(0);
  120 |  await expect(page.locator('.workflow-heading')).toContainText('Enregistré');
  121 |  await expect(page.locator('.workflow-heading h1')).toHaveText('Suivi métier — adaptation');
  122 |  const preserved=JSON.parse(python(`print(json.dumps(e.run(sys.argv[3])))`,[failed.id]));
  123 |  expect(preserved).toEqual(failed);
  124 |  const workflows=JSON.parse(python(`print(json.dumps(e.workflows(sys.argv[3])))`,[fixture.project.id]));
  125 |  expect(workflows.some(g=>g.title==='Suivi métier — adaptation'&&g.id!=='feedback')).toBe(true);
  126 |  await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
  127 |  await expect(page.locator('#initial-request')).toHaveValue(failed.parameters.request);
  128 | });
  129 | 
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional-feedback.spec.cjs >> long request replacement retains the complete text and finished results keep a readable title
- Location: tests/functional-feedback.spec.cjs:131:1

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Voir les résultats', exact: true })

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
        - status [ref=e77]: À jour · 11:38
        - button "Actualiser · À jour · 11:38" [ref=e78] [cursor=pointer]
    - main [ref=e86]:
      - generic [ref=e87]:
        - generic [ref=e88]:
          - generic [ref=e89]:
            - generic [ref=e90]: Suivi · Suivi métier
            - heading "Relire le dossier de réunion et ses engagements." [level=1] [ref=e91]
          - group [ref=e93]:
            - generic "Options" [ref=e94] [cursor=pointer]
        - group "Périmètre du suivi" [ref=e95]:
          - button "Vue d’ensemble" [ref=e96] [cursor=pointer]
          - button "Demande" [pressed] [ref=e97] [cursor=pointer]
        - tablist "Vues du workflow"
        - generic [ref=e98]:
          - group [ref=e99]:
            - generic "6 demandes" [ref=e100] [cursor=pointer]:
              - text: 6 demandes
              - generic [aria-hidden] [ref=e101]: ⌄
          - paragraph [ref=e102]: Aucune étape en cours · 3 demandes à prendre en charge · 1 en attente de dépendances · 1 terminée
          - button "Retrouver la conversation" [ref=e103] [cursor=pointer]: Terminal
        - region "État et prochaine action" [ref=e104]:
          - generic [ref=e105]:
            - generic [ref=e106]:
              - strong [ref=e107]: Attend une autre demande
              - generic [ref=e108]: 0 / 1 étapes
            - button "Voir les dépendances" [ref=e109] [cursor=pointer]
          - paragraph [ref=e110]: "Après : R1 — Point métier indépendant"
        - group "Affichage du suivi" [ref=e112]:
          - button "Graphe" [ref=e113] [cursor=pointer]
          - button "Détail" [pressed] [ref=e114] [cursor=pointer]
        - complementary "Inspecteur du bloc" [ref=e116]:
          - paragraph [ref=e117]: Une demande préalable est annulée ou terminée sans autoriser la suite. Cette exécution ne peut pas reprendre avec ces dépendances.
          - button "R1 — Point métier indépendant Annulée" [ref=e119] [cursor=pointer]:
            - strong [ref=e120]: R1 — Point métier indépendant
            - generic [ref=e121]: Annulée
            - generic [aria-hidden] [ref=e122]: →
          - paragraph [ref=e123]: Vous pouvez consulter et traiter chaque attente sans changer les dépendances.
          - button "Créer une demande de remplacement" [ref=e124] [cursor=pointer]
```

# Test source

```ts
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
  113 |  await expect(page.locator('.workflow-heading h1')).toContainText('Préparer un bilan synthétique');
  114 |  await page.getByRole('button',{name:'Examiner l’échec',exact:true}).click();
  115 |  await expect(page.locator('#inspector')).toContainText('Configuration à revoir pour ce besoin.');
  116 |  await page.getByRole('button',{name:'Configurer un nouveau lancement…',exact:true}).click();
  117 |  await page.getByRole('button',{name:'Configurer une copie',exact:true}).click();
  118 |  await page.getByLabel('Modèle',{exact:true}).fill('synthetic-reconfigured');
  119 |  await page.getByRole('button',{name:'Appliquer à toutes les étapes IA',exact:true}).click();
  120 |  await expect(page.getByRole('dialog')).toHaveCount(0);
  121 |  await expect(page.locator('.workflow-heading')).toContainText('Enregistré');
  122 |  await expect(page.locator('.workflow-heading h1')).toHaveText('Suivi métier — adaptation');
  123 |  const preserved=JSON.parse(python(`print(json.dumps(e.run(sys.argv[3])))`,[failed.id]));
  124 |  expect(preserved).toEqual(failed);
  125 |  const workflows=JSON.parse(python(`print(json.dumps(e.workflows(sys.argv[3])))`,[fixture.project.id]));
  126 |  expect(workflows.some(g=>g.title==='Suivi métier — adaptation'&&g.id!=='feedback')).toBe(true);
  127 |  await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
  128 |  await expect(page.locator('#initial-request')).toHaveValue(failed.parameters.request);
  129 | });
  130 | 
  131 | test('long request replacement retains the complete text and finished results keep a readable title',async()=>{
  132 |  const request='Relire le dossier de réunion et ses engagements.\n'+'Conserver les décisions et les échéances. '.repeat(1600).trim();
  133 |  const blocked=JSON.parse(python(`from workflow_engine.conversations import Conversations
  134 | c=Conversations(e);v=c.get(sys.argv[3]);item=c.add(v['id'],sys.argv[4],depends_on=[v['items'][0]['id']]);e.control(v['items'][0]['run'],'cancel');print(json.dumps(e.run(item['run'])))`,[fixture.conversation,request]));
  135 |  await openOverview();
  136 |  await page.locator(`#conversation-overview .conversation-demand[data-run="${blocked.id}"] .conversation-demand-open`).click();
  137 |  await page.getByRole('button',{name:'Détail',exact:true}).click();
  138 |  await page.getByRole('button',{name:'Créer une demande de remplacement',exact:true}).click();
  139 |  await expect(page.getByRole('dialog').getByRole('textbox',{name:'Demande',exact:true})).toHaveValue(request);
  140 |  await page.getByRole('button',{name:'Enregistrer la demande',exact:true}).click();
  141 |  await expect(page.getByRole('dialog')).toHaveCount(0);
  142 |  const conversation=JSON.parse(python(`from workflow_engine.conversations import Conversations
  143 | print(json.dumps(Conversations(e).get(sys.argv[3])))`,[fixture.conversation]));
  144 |  const replacement=conversation.items.at(-1);
  145 |  expect(replacement.request).toBe(request);expect(replacement.run).not.toBe(blocked.id);expect(replacement.depends_on).toEqual([]);
  146 |  expect(JSON.parse(python(`print(json.dumps(e.run(sys.argv[3])))`,[blocked.id]))).toEqual(blocked);
  147 |  python(`c=e.claim(sys.argv[3],'work');e.submit(sys.argv[3],'work',c['token'],{'ok':True,'summary':'Compte rendu complet reçu.','outputs':{'report':'Décisions et échéances conservées.'}})`,[replacement.run]);
> 148 |  await page.getByRole('button',{name:'Voir les résultats',exact:true}).click();
      |                                                                        ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  149 |  await expect(page.getByRole('dialog')).toContainText('Relire le dossier de réunion et ses engagements.');
  150 |  await expect(page.getByRole('dialog')).not.toContainText('[object Object]');
  151 |  await expect(page.getByRole('dialog')).toContainText('Décisions et échéances conservées.');
  152 |  await page.screenshot({path:test.info().outputPath('long-request-preserved-and-readable.png')});
  153 | });
  154 | 
```
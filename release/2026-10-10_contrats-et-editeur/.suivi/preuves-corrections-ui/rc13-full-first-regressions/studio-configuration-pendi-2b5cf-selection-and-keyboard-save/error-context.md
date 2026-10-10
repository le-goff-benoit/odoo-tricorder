# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: studio.spec.cjs >> configuration: pending fields survive I/O editing, block selection and keyboard save
- Location: tests/studio.spec.cjs:963:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.workflow-heading p')
Expected substring: "Enregistré"
Received string:    "Modifications en attente · enregistrées en quittant cette vue"
Timeout: 5000ms

Call log:
  - Expect "toContainText" locator('.workflow-heading p') with timeout 5000ms
  - waiting for locator('.workflow-heading p')
    14 × locator resolved to <p title="De la demande au résultat">Modifications en attente · enregistrées en quitta…</p>
       - unexpected value "Modifications en attente · enregistrées en quittant cette vue"

```

```yaml
- paragraph: Modifications en attente · enregistrées en quittant cette vue
```

# Test source

```ts
  877  |  print(json.dumps({'ok':True,'identity':'synthetic-team','outputs':{},'receipt':{'id':'local-proof-1'}}))
  878  | `);
  879  |   fs.writeFileSync(path.join(project.path,'.tricorder/plugins.json'),JSON.stringify({schema:1,plugins:[{id:'local-notifications',title:'Notifications de test',provider:'local',operations:['notify'],transport:{argv:['/usr/bin/python3',script],timeout:5}}]}));
  880  |   await page.getByRole('button',{name:'Projets',exact:true}).click();
  881  |   await page.locator('.project-card').filter({hasText:/Questions et outils/}).click();
  882  |   await page.getByRole('button',{name:'Connexions',exact:true}).click();
  883  |   await page.getByRole('button',{name:'Vérifier l’adaptateur…'}).click();
  884  |   await page.getByRole('button',{name:'Exécuter le contrôle'}).click();
  885  |   await expect(page.locator('.card').filter({has:page.getByRole('heading',{name:'Notifications de test'})})).toContainText('Utilisable');
  886  |   await page.evaluate(id => window.studio.request({action:'workflow.save',project:id,graph:{schema:1,id:'questions',title:'Préparation du compte rendu',nodes:[{id:'clarify',kind:'question',title:'Identifier le relecteur',question:'Qui doit relire le compte rendu ?',outputs:{answer:'string'}}],edges:[]}}),project.id);
  887  |   await page.getByRole('button',{name:'Projets',exact:true}).click();
  888  |   await page.locator('.project-card').filter({hasText:/Questions et outils/}).click();
  889  |   await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();
  890  |   await page.getByRole('button',{name:'Paramètres du workflow',exact:true}).click();
  891  |   await page.getByLabel('Me prévenir avec').selectOption({label:'Notifications de test · notify'});
  892  |   await page.getByLabel('Canal ou destinataire exact').fill('canal-synthetique');
  893  |   await page.getByRole('button',{name:'Appliquer',exact:true}).click();
  894  |   await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
  895  |   await expect(page.getByRole('dialog')).toContainText('canal-synthetique');
  896  |   await page.getByLabel(/J’autorise ces notifications/).check();
  897  |   await page.getByText('Exécution automatique sans conversation',{exact:true}).evaluate(el => { el.parentElement.open = true; });
  898  |   await page.getByRole('button',{name:'Lancer l’exécution réelle'}).click();
  899  |   await page.locator('.node[data-id=clarify]').click();
  900  |   await expect(page.locator('#inspector')).toContainText('Qui doit relire');
  901  |   await expect.poll(() => fs.existsSync(path.join(directory,'notifications.txt'))).toBe(true);
  902  |   await page.getByRole('button',{name:'Suivre la notification'}).click();
  903  |   await expect(page.locator('#execution-overview')).toContainText('Terminée');
  904  |   await page.getByRole('button',{name:'Revenir à l’exécution'}).click();
  905  |   await expect(page.locator('.node[data-id=clarify]')).toHaveAttribute('data-status','waiting_input');
  906  |   await expect(page.getByRole('button',{name:'Détail',exact:true})).toHaveAttribute('aria-pressed','true');
  907  |   await expect(page.locator('#inspector')).toContainText('Qui doit relire');
  908  |   await page.screenshot({path:test.info().outputPath('question-notification.png')});
  909  |   await page.getByLabel('Votre réponse',{exact:true}).fill('La responsable produit');
  910  |   await page.getByRole('button',{name:'Répondre',exact:true}).click();
  911  |   await expect(page.locator('.node[data-id=clarify]')).toHaveAttribute('data-status','accepted');
  912  |   expect(fs.readFileSync(path.join(directory,'notifications.txt'),'utf8').trim().split('\n')).toHaveLength(1);
  913  | });
  914  | 
  915  | test('workspace layout: focused navigation, adjustable split and editor preserve the same terminal', async () => {
  916  |   await expect(page.locator('.side-nav button')).toHaveText(['Activité','Workflows','Projets']);
  917  |   await expect(page.locator('.sidebar-tools')).not.toHaveAttribute('open','');
  918  |   await expect(page.locator('[data-cockpit="preferences"]')).toHaveText('Paramètres');
  919  |   await example();
  920  |   await page.getByRole('button',{name:'Ouvrir le terminal existant',exact:true}).click();
  921  |   await expect(page.locator('.xterm-screen')).toBeVisible();
  922  |   const before = await page.evaluate(() => window.tricorder.terminals.list());
  923  |   expect(before).toHaveLength(1);
  924  |   await page.evaluate(id => window.tricorder.terminals.write({session:id,data:"printf 'WORKSPACE-CONTINUITY\\n'\n"}),before[0].id);
  925  |   await expect(page.locator('.xterm-screen')).toContainText('WORKSPACE-CONTINUITY');
  926  |   const separator = page.getByRole('separator',{name:'Taille du terminal'});
  927  |   await expect(separator).toBeVisible();
  928  |   await separator.focus(); await page.keyboard.press('Home');
  929  |   await expect(separator).toHaveAttribute('aria-valuenow','30');
  930  |   await page.keyboard.press('ArrowRight');
  931  |   await expect(separator).toHaveAttribute('aria-valuenow','35');
  932  |   await page.locator('[data-action="terminal-layout"]').click();
  933  |   await expect(separator).toHaveAttribute('aria-orientation','horizontal');
  934  |   const term = await page.locator('#terminal-workspace').boundingBox();
  935  |   const graph = await page.locator('#workflow-panel').boundingBox();
  936  |   expect(graph.y).toBeGreaterThanOrEqual(term.y + term.height);
  937  |   await page.screenshot({path:test.info().outputPath('terminal-stacked.png')});
  938  |   await page.locator('[data-action="terminal-layout"]').click();
  939  |   await expect(separator).toHaveAttribute('aria-orientation','vertical');
  940  |   await page.locator('[data-action="terminal-maximize"]').click();
  941  |   await expect(page.locator('#workflow-panel')).toBeHidden();
  942  |   await page.locator('[data-action="terminal-maximize"]').click();
  943  |   await expect(page.locator('#workflow-panel')).toBeVisible();
  944  |   await simulate();
  945  |   await page.locator('.workflow-heading .compact-menu > summary').click();
  946  |   await page.getByRole('button',{name:'Revenir à l’éditeur',exact:true}).click();
  947  |   // Returning to design preserves the user's terminal visibility choice.
  948  |   await expect(page.locator('#terminal-workspace')).toBeVisible();
  949  |   await expect(page.locator('.xterm-screen')).toContainText('WORKSPACE-CONTINUITY');
  950  |   await page.locator('[data-action="terminal-toggle"]').click();
  951  |   await expect(page.locator('#terminal-workspace')).toBeHidden();
  952  |   await page.locator('[data-action="terminal-toggle"]').click();
  953  |   await expect(page.locator('.xterm-screen')).toBeVisible();
  954  |   await expect(page.locator('.xterm-screen')).toContainText('WORKSPACE-CONTINUITY');
  955  |   await expect(page.locator('.terminal-heading strong')).toBeInViewport();
  956  |   await expect(page.locator('#terminal-tabs')).toBeInViewport();
  957  |   const after = await page.evaluate(() => window.tricorder.terminals.list());
  958  |   expect(after.map(s=>[s.id,s.pid,s.alive])).toEqual(before.map(s=>[s.id,s.pid,s.alive]));
  959  |   expect(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows().length)).toBe(1);
  960  |   await page.screenshot({path:test.info().outputPath('terminal-side.png')});
  961  | });
  962  | 
  963  | test('configuration: pending fields survive I/O editing, block selection and keyboard save', async () => {
  964  |   await example();
  965  |   await page.locator('.node[data-id=analyse]').click();
  966  |   await page.getByLabel('Nom du bloc',{exact:true}).fill('Analyse à conserver');
  967  |   await page.getByRole('button',{name:'Ajouter une sortie',exact:true}).click();
  968  |   await page.getByLabel('Nom (sans espaces)').fill('synthese');
  969  |   await page.getByRole('button',{name:'Ajouter la donnée'}).click();
  970  |   await expect(page.getByLabel('Nom du bloc',{exact:true})).toHaveValue('Analyse à conserver');
  971  |   await page.getByLabel('Critères d’acceptation (un par ligne)').fill('Les conclusions sont sourcées.');
  972  |   await page.locator('.node[data-id=build]').click();
  973  |   await page.locator('.node[data-id=analyse]').click();
  974  |   await expect(page.getByLabel('Critères d’acceptation (un par ligne)')).toHaveValue('Les conclusions sont sourcées.');
  975  |   await page.getByLabel('Nom du bloc',{exact:true}).fill('Analyse finale');
  976  |   await page.keyboard.press('Control+s');
> 977  |   await expect(page.locator('.workflow-heading p')).toContainText('Enregistré');
       |                                                     ^ Error: expect(locator).toContainText(expected) failed
  978  |   await page.getByLabel('Nom du bloc',{exact:true}).fill('Analyse après navigation');
  979  |   await page.locator('[data-workflow-route=projects]').click();
  980  |   await page.locator('.project-card').filter({hasText:'Mon premier projet'}).click();
  981  |   await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();
  982  |   await page.locator('.node[data-id=analyse]').click();
  983  |   await expect(page.getByLabel('Nom du bloc',{exact:true})).toHaveValue('Analyse après navigation');
  984  |   await expect(page.locator('.ports')).toContainText('synthese');
  985  |   const snapshot=await page.evaluate(async()=>{const p=(await window.studio.request({action:'bootstrap'})).projects[0];return window.studio.request({action:'project.get',project:p.id});});
  986  |   const node=snapshot.workflows[0].nodes.find(n=>n.id==='analyse');
  987  |   expect(node.title).toBe('Analyse après navigation'); expect(node.outputs.synthese).toBe('string');
  988  |   expect(node.criteria).toEqual(['Les conclusions sont sourcées.']);
  989  | });
  990  | 
  991  | test('embedded theme: workflow controls use the shared surface colors', async () => {
  992  |   await example();
  993  |   for(const theme of ['dark','light']) {
  994  |     await page.locator(`[data-theme-choice="${theme}"]`).click();
  995  |     const colors=await page.locator('.node').first().evaluate(el=>({surface:getComputedStyle(el).getPropertyValue('--surface-1').trim(),alias:getComputedStyle(el).getPropertyValue('--surface').trim(),background:getComputedStyle(el).backgroundColor}));
  996  |     expect(colors.alias).toBe(colors.surface);
  997  |     expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
  998  |     await page.screenshot({path:test.info().outputPath(`editor-${theme}.png`)});
  999  |   }
  1000 | });
  1001 | 
  1002 | test('audit reception: decision shows the delivered text, provenance and safe proof reader', async () => {
  1003 |   const seed = await page.evaluate(async () => {
  1004 |     const project=await window.studio.request({action:'project.create',title:'Revue des livrables'});
  1005 |     const graph={schema:1,id:'minutes-review',title:'Minutes et validation',nodes:[
  1006 |       {id:'minutes',title:'Rédiger les minutes',kind:'task',validation:'contract',outputs:{minutes:'string'},sample_outputs:{minutes:'MINUTES_SENTINEL — Action : vérifier la recherche. <script>window.unsafe=true</script>'}},
  1007 |       {id:'approve',title:'Valider les minutes',kind:'decision',inputs:{minutes:'string'},question:'Le contenu est-il fidèle ?'}
  1008 |     ],edges:[{id:'transfer',from:'minutes',to:'approve',mapping:{minutes:'minutes'}}]};
  1009 |     await window.studio.request({action:'workflow.save',project:project.id,graph});
  1010 |     const run=await window.studio.request({action:'run.start',project:project.id,graph,simulation:true});return {project,run};
  1011 |   });
  1012 |   await expect.poll(async()=> (await page.evaluate(run=>window.studio.request({action:'run.get',run}),seed.run.id)).run.nodes.approve.status).toBe('waiting');
  1013 |   await page.reload();await page.locator('[data-workflow-route="projects"]').click();await page.locator('.project-card').filter({hasText:seed.project.title}).click();await page.getByRole('button',{name:'Consulter',exact:true}).click();
  1014 |   await expect(page.locator('#inspector')).toContainText('MINUTES_SENTINEL');
  1015 |   await expect(page.locator('#inspector')).toContainText('Sources');
  1016 |   await page.getByRole('button',{name:'Détail',exact:true}).click();
  1017 |   await expect(page.locator('.editor.review-focus')).toBeVisible();
  1018 |   await page.screenshot({path:path.join(test.info().outputDir,'audit-decision-readable.png'),fullPage:true});
  1019 |   await page.getByRole('button',{name:'Graphe',exact:true}).click();
  1020 |   await page.locator('.node[data-id="minutes"]').click();await page.locator('#inspector .business-proof').first().click();
  1021 |   await expect(page.getByRole('dialog')).toContainText('SIMULATION');
  1022 |   await page.getByRole('button',{name:'Fermer la fenêtre',exact:true}).click();
  1023 |   await page.locator('.execution-menu > summary').click();await page.getByRole('tab',{name:'Rapport',exact:true}).click();await expect(page.locator('#document-view')).toContainText('MINUTES_SENTINEL');
  1024 |   await expect(page.locator('#document-view a[href]')).toHaveCount(1);
  1025 |   expect(await page.evaluate(()=>window.unsafe)).toBeUndefined();
  1026 | });
  1027 | 
  1028 | test('audit reception: concurrent terminal edit merges with the persisted editor draft', async()=>{
  1029 |   await example();await page.locator('.node[data-id="analyse"]').click();
  1030 |   await page.getByLabel('Nom du bloc',{exact:true}).fill('Titre conservé après fermeture');
  1031 |   const project=(await page.evaluate(()=>window.studio.request({action:'bootstrap'}))).projects[0];
  1032 |   const saved=(await page.evaluate(project=>window.studio.request({action:'project.get',project}),project.id)).workflows[0];
  1033 |   const file=path.join(project.path,'.tricorder/workflows',saved.id+'.json');
  1034 |   const disk=JSON.parse(fs.readFileSync(file));disk.description='Changement du terminal conservé';fs.writeFileSync(file,JSON.stringify(disk));
  1035 |   await page.reload();await page.locator('[data-workflow-route="projects"]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();
  1036 |   await expect(page.getByLabel('Nom du bloc',{exact:true})).toHaveValue('Titre conservé après fermeture');
  1037 |   await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
  1038 |   await expect(page.getByRole('dialog')).toContainText('Comparer les modifications');
  1039 |   await page.screenshot({path:path.join(test.info().outputDir,'audit-editor-merge.png'),fullPage:true});
  1040 |   await page.getByRole('button',{name:'Enregistrer la fusion',exact:true}).click();
  1041 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  1042 |   const merged=JSON.parse(fs.readFileSync(file));expect(merged.nodes.find(n=>n.id==='analyse').title).toBe('Titre conservé après fermeture');expect(merged.description).toBe('Changement du terminal conservé');
  1043 | });
  1044 | 
  1045 | test('audit reception: stopped native agent resumes explicitly in the same terminal',async()=>{
  1046 |   fs.mkdirSync(path.join(directory,'bin'),{recursive:true});const marker=path.join(directory,'native-launches');
  1047 |   fs.writeFileSync(path.join(directory,'bin/codex'),`#!/usr/bin/python3\nfrom pathlib import Path\np=Path(${JSON.stringify(marker)})\np.write_text((p.read_text() if p.exists() else '')+'launch\\n')\nprint('SYNTHETIC AGENT EXITED')\n`,{mode:0o755});
  1048 |   const c=await page.evaluate(async()=>{const p=await window.studio.request({action:'project.create',title:'Reprise locale'});return window.studio.human({action:'conversation.open',project:p.id,provider:'codex',graph:{schema:1,id:'resume',title:'Travail à reprendre',nodes:[{id:'work',title:'Travail',kind:'task'}],edges:[]}});});
  1049 |   const first=await page.evaluate(c=>window.tricorder.workflowTerminal({project:c.project,conversation:c.id}),c);
  1050 |   await expect.poll(async()=> (await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.id===first.id)?.idleShell).toBe(true);
  1051 |   const reopened=await page.evaluate(c=>window.tricorder.workflowTerminal({project:c.project,conversation:c.id}),c);
  1052 |   expect(reopened.agentState).toBe('stopped');expect(reopened.id).toBe(first.id);expect(fs.readFileSync(marker,'utf8').trim().split('\n')).toHaveLength(1);
  1053 |   const resumed=await page.evaluate(c=>window.tricorder.workflowTerminal({project:c.project,conversation:c.id,resume:true}),c);
  1054 |   expect(resumed.id).toBe(first.id);await expect.poll(()=>fs.readFileSync(marker,'utf8').trim().split('\n').length).toBe(2);
  1055 |   const conversations=await page.evaluate(project=>window.studio.request({action:'conversation.list',project}),c.project);expect(conversations).toHaveLength(1);
  1056 | });
  1057 | 
  1058 | test('audit reception: history pages and archives preserve the completed work',async()=>{
  1059 |   const resources=await app.evaluate(()=>process.resourcesPath);const backend=process.env.TRICORDER_EXECUTABLE ? path.join(resources,'backend') : path.join(root,'backend');
  1060 |   const script=`import sys,json\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\ne=Engine(sys.argv[2]);p=e.create_project('Historique durable');g={'schema':1,'id':'history','title':'Historique','nodes':[{'id':'work','title':'Résultat','kind':'task','validation':'contract'}],'edges':[]};e.save(p['id'],g)\nfor i in range(30):\n r=e.start(p['id'],g,parameters={'request':f'Demande {i:02}'});c=e.claim(r['id'],'work');e.submit(r['id'],'work',c['token'],{'ok':True,'summary':'Résultat conservé','outputs':{}})\nprint(json.dumps(p))`;
  1061 |   const seed=require('node:child_process').spawnSync('python3',['-c',script,backend,directory],{encoding:'utf8'});expect(seed.status,seed.stderr).toBe(0);const project=JSON.parse(seed.stdout);
  1062 |   await page.reload();await page.locator('[data-workflow-route="projects"]').click();await page.locator('.project-card').filter({hasText:project.title}).click();
  1063 |   await expect(page.locator('tbody tr')).toHaveCount(25);await page.locator('.history-filters > summary').click();await page.getByRole('button',{name:'Suivantes',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(5);await page.locator('.history-filters > summary').click();
  1064 |   await page.getByLabel('Rechercher',{exact:true}).fill('Demande 00');await page.getByRole('button',{name:'Filtrer',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(1);
  1065 |   await page.locator('tbody').getByRole('button',{name:'Archiver',exact:true}).click();await page.getByRole('button',{name:'Confirmer',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(0);
  1066 |   await page.locator('.history-filters > summary').click();await page.getByLabel('Avec archives').check();await page.getByRole('button',{name:'Filtrer',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(1);
  1067 |   await page.locator('tbody').getByRole('button',{name:'Restaurer',exact:true}).click();await page.getByRole('button',{name:'Confirmer',exact:true}).click();await page.getByRole('button',{name:'Consulter',exact:true}).click();await page.locator('.node[data-id="work"]').click();await expect(page.locator('#inspector')).toContainText('Résultat conservé');
  1068 | });
  1069 | 
  1070 | async function selectRequest(index) {
  1071 |   const selector=page.locator('.request-selector');
  1072 |   if(!await selector.getAttribute('open').then(value=>value!==null)) await selector.locator(':scope > summary').click();
  1073 |   await page.locator('.work-items button').nth(index).click();
  1074 |   await expect(selector).not.toHaveAttribute('open','');
  1075 | }
  1076 | 
  1077 | async function mailFixture(mode='ready') {
```
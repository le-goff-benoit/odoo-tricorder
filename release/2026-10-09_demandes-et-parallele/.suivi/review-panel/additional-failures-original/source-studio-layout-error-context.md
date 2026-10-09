# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: studio.spec.cjs >> workspace layout: focused navigation, adjustable split and editor preserve the same terminal
- Location: tests/studio.spec.cjs:892:1

# Error details

```
Error: expect(locator).toBeHidden() failed

Locator:  locator('#terminal-workspace')
Expected: hidden
Received: visible
Timeout:  5000ms

Call log:
  - Expect "toBeHidden" locator('#terminal-workspace') with timeout 5000ms
  - waiting for locator('#terminal-workspace')
    14 × locator resolved to <div id="terminal-workspace">…</div>
       - unexpected value "visible"

```

```yaml
- strong: Terminal
- button "Contexte"
- button "Disposition verticale"
- button "Agrandir le terminal"
- button "Shell 1" [pressed]:
  - img "Shell"
  - text: Shell 1
- button "Arrêter ce terminal"
- button "Nouveau terminal"
- button "Rechercher dans le terminal"
- text: "Shell du projet · Shell : Mon premier projet"
- textbox "Terminal input"
```

# Test source

```ts
  824  |   await page.locator('.project-card').filter({hasText:/Atelier sans pack métier/}).click();
  825  |   await page.getByRole('button',{name:'Examiner les workflows du dépôt'}).click();
  826  |   await page.getByRole('button',{name:'Importer ce workflow'}).click();
  827  |   await expect(page.locator('.workflow-heading')).toContainText('Révision 7');
  828  |   expect(fs.readFileSync(file,'utf8')).toBe(before);
  829  |   await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
  830  |   await page.getByLabel('Quelle demande souhaitez-vous traiter ?').fill('Vérifier les décisions du comité.');
  831  |   await page.getByRole('button',{name:'Simuler le parcours'}).click();
  832  |   await page.locator('.node[data-id=question]').click();
  833  |   await expect(page.locator('#inspector')).toContainText('Qui doit relire');
  834  |   await page.locator('.execution-menu > summary').click();await page.getByRole('tab',{name:'Rapport',exact:true}).click();
  835  |   await expect(page.locator('#document-view')).toContainText('Vérifier les décisions du comité.');
  836  |   await page.getByRole('button',{name:'Exporter le rapport dans le projet'}).click();
  837  |   await page.getByLabel('Nom du dossier').fill('comite-produit');
  838  |   await page.getByRole('button',{name:'Exporter le rapport',exact:true}).click();
  839  |   await expect.poll(() => fs.existsSync(path.join(project.path,'work/comite-produit/README.md'))).toBe(true);
  840  |   expect(fs.existsSync(path.join(project.path,'release'))).toBe(false);
  841  |   await page.screenshot({path:test.info().outputPath('generic-work-bilan.png')});
  842  | });
  843  | 
  844  | test('question journey: configure a verified tool, authorize notifications and follow delivery without answering the question', async () => {
  845  |   const project = await page.evaluate(() => window.studio.request({action:'project.create',title:'Questions et outils · démonstration'}));
  846  |   const script = path.join(directory,'notify.py');
  847  |   fs.writeFileSync(script, `import json,sys
  848  | from pathlib import Path
  849  | p=json.load(sys.stdin)
  850  | if p['action']=='describe':
  851  |  print(json.dumps({'protocol':'tricorder.tool/1','connected':True,'identity':'synthetic-team','operations':{'notify':'notify'}}))
  852  | else:
  853  |  with (Path(__file__).parent/'notifications.txt').open('a') as f:f.write(json.dumps(p['arguments'])+'\\n')
  854  |  print(json.dumps({'ok':True,'identity':'synthetic-team','outputs':{},'receipt':{'id':'local-proof-1'}}))
  855  | `);
  856  |   fs.writeFileSync(path.join(project.path,'.tricorder/plugins.json'),JSON.stringify({schema:1,plugins:[{id:'local-notifications',title:'Notifications de test',provider:'local',operations:['notify'],transport:{argv:['/usr/bin/python3',script],timeout:5}}]}));
  857  |   await page.getByRole('button',{name:'Projets',exact:true}).click();
  858  |   await page.locator('.project-card').filter({hasText:/Questions et outils/}).click();
  859  |   await page.getByRole('button',{name:'Connexions',exact:true}).click();
  860  |   await page.getByRole('button',{name:'Vérifier l’adaptateur…'}).click();
  861  |   await page.getByRole('button',{name:'Exécuter le contrôle'}).click();
  862  |   await expect(page.locator('.card').filter({has:page.getByRole('heading',{name:'Notifications de test'})})).toContainText('Utilisable');
  863  |   await page.evaluate(id => window.studio.request({action:'workflow.save',project:id,graph:{schema:1,id:'questions',title:'Préparation du compte rendu',nodes:[{id:'clarify',kind:'question',title:'Identifier le relecteur',question:'Qui doit relire le compte rendu ?',outputs:{answer:'string'}}],edges:[]}}),project.id);
  864  |   await page.getByRole('button',{name:'Projets',exact:true}).click();
  865  |   await page.locator('.project-card').filter({hasText:/Questions et outils/}).click();
  866  |   await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();
  867  |   await page.getByRole('button',{name:'Paramètres du workflow',exact:true}).click();
  868  |   await page.getByLabel('Me prévenir avec').selectOption({label:'Notifications de test · notify'});
  869  |   await page.getByLabel('Canal ou destinataire exact').fill('canal-synthetique');
  870  |   await page.getByRole('button',{name:'Appliquer',exact:true}).click();
  871  |   await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
  872  |   await expect(page.getByRole('dialog')).toContainText('canal-synthetique');
  873  |   await page.getByLabel(/J’autorise ces notifications/).check();
  874  |   await page.getByText('Exécution automatique sans conversation',{exact:true}).evaluate(el => { el.parentElement.open = true; });
  875  |   await page.getByRole('button',{name:'Lancer l’exécution réelle'}).click();
  876  |   await page.locator('.node[data-id=clarify]').click();
  877  |   await expect(page.locator('#inspector')).toContainText('Qui doit relire');
  878  |   await expect.poll(() => fs.existsSync(path.join(directory,'notifications.txt'))).toBe(true);
  879  |   await page.getByRole('button',{name:'Suivre la notification'}).click();
  880  |   await expect(page.locator('#run-banner')).toContainText('Terminée');
  881  |   await page.getByRole('button',{name:'Revenir à l’exécution'}).click();
  882  |   await expect(page.locator('.node[data-id=clarify]')).toHaveAttribute('data-status','waiting_input');
  883  |   await expect(page.getByRole('button',{name:'Détail',exact:true})).toHaveAttribute('aria-pressed','true');
  884  |   await expect(page.locator('#inspector')).toContainText('Qui doit relire');
  885  |   await page.screenshot({path:test.info().outputPath('question-notification.png')});
  886  |   await page.getByLabel('Votre réponse',{exact:true}).fill('La responsable produit');
  887  |   await page.getByRole('button',{name:'Répondre',exact:true}).click();
  888  |   await expect(page.locator('.node[data-id=clarify]')).toHaveAttribute('data-status','accepted');
  889  |   expect(fs.readFileSync(path.join(directory,'notifications.txt'),'utf8').trim().split('\n')).toHaveLength(1);
  890  | });
  891  | 
  892  | test('workspace layout: focused navigation, adjustable split and editor preserve the same terminal', async () => {
  893  |   await expect(page.locator('.side-nav button')).toHaveText(['Activité','Workflows','Projets']);
  894  |   await expect(page.locator('.sidebar-tools')).not.toHaveAttribute('open','');
  895  |   await expect(page.locator('[data-cockpit="preferences"]')).toHaveText('Paramètres');
  896  |   await example();
  897  |   await page.getByRole('button',{name:'Ouvrir le terminal existant',exact:true}).click();
  898  |   await expect(page.locator('.xterm-screen')).toBeVisible();
  899  |   const before = await page.evaluate(() => window.tricorder.terminals.list());
  900  |   expect(before).toHaveLength(1);
  901  |   await page.evaluate(id => window.tricorder.terminals.write({session:id,data:"printf 'WORKSPACE-CONTINUITY\\n'\n"}),before[0].id);
  902  |   await expect(page.locator('.xterm-screen')).toContainText('WORKSPACE-CONTINUITY');
  903  |   const separator = page.getByRole('separator',{name:'Taille du terminal'});
  904  |   await expect(separator).toBeVisible();
  905  |   await separator.focus(); await page.keyboard.press('Home');
  906  |   await expect(separator).toHaveAttribute('aria-valuenow','30');
  907  |   await page.keyboard.press('ArrowRight');
  908  |   await expect(separator).toHaveAttribute('aria-valuenow','35');
  909  |   await page.locator('[data-action="terminal-layout"]').click();
  910  |   await expect(separator).toHaveAttribute('aria-orientation','horizontal');
  911  |   const term = await page.locator('#terminal-workspace').boundingBox();
  912  |   const graph = await page.locator('#workflow-panel').boundingBox();
  913  |   expect(graph.y).toBeGreaterThanOrEqual(term.y + term.height);
  914  |   await page.screenshot({path:test.info().outputPath('terminal-stacked.png')});
  915  |   await page.locator('[data-action="terminal-layout"]').click();
  916  |   await expect(separator).toHaveAttribute('aria-orientation','vertical');
  917  |   await page.locator('[data-action="terminal-maximize"]').click();
  918  |   await expect(page.locator('#workflow-panel')).toBeHidden();
  919  |   await page.locator('[data-action="terminal-maximize"]').click();
  920  |   await expect(page.locator('#workflow-panel')).toBeVisible();
  921  |   await simulate();
  922  |   await page.locator('.workflow-heading .compact-menu > summary').click();
  923  |   await page.getByRole('button',{name:'Revenir à l’éditeur',exact:true}).click();
> 924  |   await expect(page.locator('#terminal-workspace')).toBeHidden();
       |                                                     ^ Error: expect(locator).toBeHidden() failed
  925  |   await page.locator('[data-action="terminal-toggle"]').click();
  926  |   await expect(page.locator('.xterm-screen')).toBeVisible();
  927  |   await expect(page.locator('.xterm-screen')).toContainText('WORKSPACE-CONTINUITY');
  928  |   await expect(page.locator('.terminal-heading strong')).toBeInViewport();
  929  |   await expect(page.locator('#terminal-tabs')).toBeInViewport();
  930  |   const after = await page.evaluate(() => window.tricorder.terminals.list());
  931  |   expect(after.map(s=>[s.id,s.pid,s.alive])).toEqual(before.map(s=>[s.id,s.pid,s.alive]));
  932  |   expect(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows().length)).toBe(1);
  933  |   await page.screenshot({path:test.info().outputPath('terminal-side.png')});
  934  | });
  935  | 
  936  | test('configuration: pending fields survive I/O editing, block selection and keyboard save', async () => {
  937  |   await example();
  938  |   await page.locator('.node[data-id=analyse]').click();
  939  |   await page.getByLabel('Nom du bloc',{exact:true}).fill('Analyse à conserver');
  940  |   await page.getByRole('button',{name:'Ajouter une sortie',exact:true}).click();
  941  |   await page.getByLabel('Nom (sans espaces)').fill('synthese');
  942  |   await page.getByRole('button',{name:'Ajouter la donnée'}).click();
  943  |   await expect(page.getByLabel('Nom du bloc',{exact:true})).toHaveValue('Analyse à conserver');
  944  |   await page.getByLabel('Critères d’acceptation (un par ligne)').fill('Les conclusions sont sourcées.');
  945  |   await page.locator('.node[data-id=build]').click();
  946  |   await page.locator('.node[data-id=analyse]').click();
  947  |   await expect(page.getByLabel('Critères d’acceptation (un par ligne)')).toHaveValue('Les conclusions sont sourcées.');
  948  |   await page.getByLabel('Nom du bloc',{exact:true}).fill('Analyse finale');
  949  |   await page.keyboard.press('Control+s');
  950  |   await expect(page.locator('.workflow-heading p')).toContainText('Enregistré');
  951  |   await page.getByLabel('Nom du bloc',{exact:true}).fill('Analyse après navigation');
  952  |   await page.locator('[data-workflow-route=projects]').click();
  953  |   await page.locator('.project-card').filter({hasText:'Mon premier projet'}).click();
  954  |   await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();
  955  |   await page.locator('.node[data-id=analyse]').click();
  956  |   await expect(page.getByLabel('Nom du bloc',{exact:true})).toHaveValue('Analyse après navigation');
  957  |   await expect(page.locator('.ports')).toContainText('synthese');
  958  |   const snapshot=await page.evaluate(async()=>{const p=(await window.studio.request({action:'bootstrap'})).projects[0];return window.studio.request({action:'project.get',project:p.id});});
  959  |   const node=snapshot.workflows[0].nodes.find(n=>n.id==='analyse');
  960  |   expect(node.title).toBe('Analyse après navigation'); expect(node.outputs.synthese).toBe('string');
  961  |   expect(node.criteria).toEqual(['Les conclusions sont sourcées.']);
  962  | });
  963  | 
  964  | test('embedded theme: workflow controls use the shared surface colors', async () => {
  965  |   await example();
  966  |   for(const theme of ['dark','light']) {
  967  |     await page.locator(`[data-theme-choice="${theme}"]`).click();
  968  |     const colors=await page.locator('.node').first().evaluate(el=>({surface:getComputedStyle(el).getPropertyValue('--surface-1').trim(),alias:getComputedStyle(el).getPropertyValue('--surface').trim(),background:getComputedStyle(el).backgroundColor}));
  969  |     expect(colors.alias).toBe(colors.surface);
  970  |     expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
  971  |     await page.screenshot({path:test.info().outputPath(`editor-${theme}.png`)});
  972  |   }
  973  | });
  974  | 
  975  | test('audit reception: decision shows the delivered text, provenance and safe proof reader', async () => {
  976  |   const seed = await page.evaluate(async () => {
  977  |     const project=await window.studio.request({action:'project.create',title:'Revue des livrables'});
  978  |     const graph={schema:1,id:'minutes-review',title:'Minutes et validation',nodes:[
  979  |       {id:'minutes',title:'Rédiger les minutes',kind:'task',validation:'contract',outputs:{minutes:'string'},sample_outputs:{minutes:'MINUTES_SENTINEL — Action : vérifier la recherche. <script>window.unsafe=true</script>'}},
  980  |       {id:'approve',title:'Valider les minutes',kind:'decision',inputs:{minutes:'string'},question:'Le contenu est-il fidèle ?'}
  981  |     ],edges:[{id:'transfer',from:'minutes',to:'approve',mapping:{minutes:'minutes'}}]};
  982  |     await window.studio.request({action:'workflow.save',project:project.id,graph});
  983  |     const run=await window.studio.request({action:'run.start',project:project.id,graph,simulation:true});return {project,run};
  984  |   });
  985  |   await expect.poll(async()=> (await page.evaluate(run=>window.studio.request({action:'run.get',run}),seed.run.id)).run.nodes.approve.status).toBe('waiting');
  986  |   await page.reload();await page.locator('[data-workflow-route="projects"]').click();await page.locator('.project-card').filter({hasText:seed.project.title}).click();await page.getByRole('button',{name:'Consulter',exact:true}).click();
  987  |   await expect(page.locator('#inspector')).toContainText('MINUTES_SENTINEL');
  988  |   await expect(page.locator('#inspector')).toContainText('Sources');
  989  |   await page.getByRole('button',{name:'Détail',exact:true}).click();
  990  |   await expect(page.locator('.editor.review-focus')).toBeVisible();
  991  |   await page.screenshot({path:path.join(test.info().outputDir,'audit-decision-readable.png'),fullPage:true});
  992  |   await page.getByRole('button',{name:'Graphe',exact:true}).click();
  993  |   await page.locator('.node[data-id="minutes"]').click();await page.locator('#inspector .business-proof').first().click();
  994  |   await expect(page.getByRole('dialog')).toContainText('SIMULATION');
  995  |   await page.getByRole('button',{name:'Fermer la fenêtre',exact:true}).click();
  996  |   await page.locator('.execution-menu > summary').click();await page.getByRole('tab',{name:'Rapport',exact:true}).click();await expect(page.locator('#document-view')).toContainText('MINUTES_SENTINEL');
  997  |   await expect(page.locator('#document-view a[href]')).toHaveCount(1);
  998  |   expect(await page.evaluate(()=>window.unsafe)).toBeUndefined();
  999  | });
  1000 | 
  1001 | test('audit reception: concurrent terminal edit merges with the persisted editor draft', async()=>{
  1002 |   await example();await page.locator('.node[data-id="analyse"]').click();
  1003 |   await page.getByLabel('Nom du bloc',{exact:true}).fill('Titre conservé après fermeture');
  1004 |   const project=(await page.evaluate(()=>window.studio.request({action:'bootstrap'}))).projects[0];
  1005 |   const saved=(await page.evaluate(project=>window.studio.request({action:'project.get',project}),project.id)).workflows[0];
  1006 |   const file=path.join(project.path,'.tricorder/workflows',saved.id+'.json');
  1007 |   const disk=JSON.parse(fs.readFileSync(file));disk.description='Changement du terminal conservé';fs.writeFileSync(file,JSON.stringify(disk));
  1008 |   await page.reload();await page.locator('[data-workflow-route="projects"]').click();await page.locator('.project-card').filter({hasText:project.title}).click();await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();
  1009 |   await expect(page.getByLabel('Nom du bloc',{exact:true})).toHaveValue('Titre conservé après fermeture');
  1010 |   await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
  1011 |   await expect(page.getByRole('dialog')).toContainText('Comparer les modifications');
  1012 |   await page.screenshot({path:path.join(test.info().outputDir,'audit-editor-merge.png'),fullPage:true});
  1013 |   await page.getByRole('button',{name:'Enregistrer la fusion',exact:true}).click();
  1014 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  1015 |   const merged=JSON.parse(fs.readFileSync(file));expect(merged.nodes.find(n=>n.id==='analyse').title).toBe('Titre conservé après fermeture');expect(merged.description).toBe('Changement du terminal conservé');
  1016 | });
  1017 | 
  1018 | test('audit reception: stopped native agent resumes explicitly in the same terminal',async()=>{
  1019 |   fs.mkdirSync(path.join(directory,'bin'),{recursive:true});const marker=path.join(directory,'native-launches');
  1020 |   fs.writeFileSync(path.join(directory,'bin/codex'),`#!/usr/bin/python3\nfrom pathlib import Path\np=Path(${JSON.stringify(marker)})\np.write_text((p.read_text() if p.exists() else '')+'launch\\n')\nprint('SYNTHETIC AGENT EXITED')\n`,{mode:0o755});
  1021 |   const c=await page.evaluate(async()=>{const p=await window.studio.request({action:'project.create',title:'Reprise locale'});return window.studio.human({action:'conversation.open',project:p.id,provider:'codex',graph:{schema:1,id:'resume',title:'Travail à reprendre',nodes:[{id:'work',title:'Travail',kind:'task'}],edges:[]}});});
  1022 |   const first=await page.evaluate(c=>window.tricorder.workflowTerminal({project:c.project,conversation:c.id}),c);
  1023 |   await expect.poll(async()=> (await page.evaluate(()=>window.tricorder.terminals.list())).find(s=>s.id===first.id)?.idleShell).toBe(true);
  1024 |   const reopened=await page.evaluate(c=>window.tricorder.workflowTerminal({project:c.project,conversation:c.id}),c);
```
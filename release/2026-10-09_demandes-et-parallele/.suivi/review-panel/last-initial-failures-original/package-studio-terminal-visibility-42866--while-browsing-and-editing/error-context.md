# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: studio.spec.cjs >> terminal visibility preserves a live session while browsing and editing
- Location: tests/studio.spec.cjs:713:1

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
- text: "Shell : Mon premier projet · Demande affichée : Workflows globaux · Shell du projet Projet du shell à son ouverture ; le dossier courant peut changer."
- textbox "Terminal input"
```

# Test source

```ts
  620 |   await page.evaluate(async id => { await window.tricorder.terminals.write({session:id,data:'exit\nexit\n'}); }, after[0].id);
  621 |   const saved = await page.evaluate(project => window.studio.request({action:'conversation.list',project}), project.id);
  622 |   expect(saved[0].provider).toBe('claude'); expect(saved[0].item_count).toBe(1);
  623 | });
  624 | 
  625 | test('previous studio terminal is adopted in the main terminal without a new shell', async () => {
  626 |   await example();
  627 |   const old = await page.evaluate(async () => {
  628 |     const data = await window.studio.request({action:'bootstrap'});
  629 |     return window.studio.terminal({action:'create',project:data.projects[0].id});
  630 |   });
  631 |   await page.getByRole('button',{name:'Ouvrir le terminal existant'}).click();
  632 |   const sessions = await page.evaluate(() => window.tricorder.terminals.list());
  633 |   expect(sessions).toHaveLength(1);
  634 |   expect(sessions[0].id).toBe('legacy:' + old.id);
  635 |   expect(sessions[0].pid).toBe(old.pid);
  636 |   expect(sessions[0].project).toBe(path.dirname(old.project));
  637 |   await page.locator('.xterm-helper-textarea:visible').focus();
  638 |   await page.keyboard.type("printf 'ADOPTED-%s\\n' 'OK'"); await page.keyboard.press('Enter');
  639 |   await expect(page.locator('.xterm-screen:visible')).toContainText('ADOPTED-OK');
  640 |   await page.evaluate(id => window.studio.terminal({action:'stop',session:id}),old.id);
  641 | });
  642 | 
  643 | test('review: Odoo profiles, editable unresolved outcome and synthetic release capture', async () => {
  644 |   const packPath = process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents');
  645 |   const project = await page.evaluate(async packPath => {
  646 |     const p = await window.studio.request({action:'project.create',title:'Atelier Odoo · démonstration'});
  647 |     const preview = await window.studio.request({action:'pack.preview',path:packPath});
  648 |     await window.studio.request({action:'pack.install',project:p.id,path:packPath,digest:preview.sha256});
  649 |     await window.studio.request({action:'workflow.save',project:p.id,graph:{schema:1,id:'support-demo',title:'Support · comprendre et préparer la suite',domain:'odoo',parameters:{series:'19.0'},nodes:[
  650 |       {id:'diagnosis',title:'Support critique ?',kind:'agent',profile:'odoo-support',validation:'contract',prompt:'Établir les faits, leur impact et les inconnues. Préparer la suite sans déployer.',route_output:'severity',options:['critical','normal','unknown'],outputs:{severity:'string',finding:'string'},position:{x:40,y:70}},
  651 |       {id:'urgent',title:'Préparer le traitement urgent',kind:'agent',profile:'odoo-analyst',inputs:{finding:'string'},position:{x:380,y:30}},
  652 |       {id:'normal',title:'Préparer la réponse',kind:'agent',profile:'odoo-support',inputs:{finding:'string'},position:{x:380,y:190}},
  653 |       {id:'question',title:'Préciser les faits manquants',kind:'question',question:'Quel impact observez-vous ?',completion_outcome:'blocked',position:{x:380,y:350}}
  654 |     ],edges:[{id:'urgent-edge',from:'diagnosis',to:'urgent',outcome:'critical',mapping:{finding:'finding'}},{id:'normal-edge',from:'diagnosis',to:'normal',outcome:'normal',mapping:{finding:'finding'}},{id:'question-edge',from:'diagnosis',to:'question',outcome:'unknown'}]}});
  655 |     return p;
  656 |   }, packPath);
  657 |   await page.getByRole('button',{name:'Projets',exact:true}).click();
  658 |   await page.locator('.project-card').filter({hasText:/Atelier Odoo/}).click();
  659 |   await page.getByRole('button',{name:'Ouvrir le workflow',exact:true}).click();
  660 |   await page.locator('.node[data-id=question]').click();
  661 |   await page.getByText('Organisation de l’étape',{exact:true}).click();
  662 |   await expect(page.getByLabel('Effet du résultat sur les tâches dépendantes')).toHaveValue('blocked');
  663 |   await page.getByLabel('Effet du résultat sur les tâches dépendantes').selectOption('succeeded');
  664 |   await page.getByRole('button',{name:'Appliquer au bloc'}).click();
  665 |   await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
  666 |   await expect.poll(async () => {
  667 |     const saved = await page.evaluate(id => window.studio.request({action:'project.get',project:id}), project.id);
  668 |     return saved.workflows[0].nodes.find(n => n.id === 'question').completion_outcome;
  669 |   }).toBe('succeeded');
  670 |   await page.locator('.node[data-id=diagnosis]').click();
  671 |   await page.getByText('Agent et modèle pour cette étape',{exact:true}).click();
  672 |   await expect(page.getByLabel('Agent dédié (facultatif)',{exact:true})).toHaveValue('odoo-support');
  673 |   await page.locator('#node-profile').scrollIntoViewIfNeeded();
  674 |   await page.screenshot({path:test.info().outputPath('pack-odoo.png')});
  675 | });
  676 | 
  677 | test('design review: library and management views use the workspace, with readable actions in both themes', async () => {
  678 |   test.setTimeout(120000);
  679 |   const AxeBuilder = require('@axe-core/playwright').default;
  680 |   for (const theme of ['light', 'dark']) {
  681 |     await page.locator(`[data-theme-choice="${theme}"]`).click();
  682 |     for (const width of [1440, 1024, 800]) {
  683 |       await page.setViewportSize({ width, height: 900 });
  684 |       for (const [route, heading] of [['library', 'Modèles de workflows'], ['projects', 'Vos projets'], ['global', 'Mes workflows'], ['connections', 'Connexions'], ['schedules', 'Planifications']]) {
  685 |         if(route==='library')await library();else await page.locator(`[data-workflow-route="${route}"]`).click();
  686 |         await expect(page.getByRole('heading', { name: heading, exact: true, level: route === 'projects' ? 2 : 1 })).toBeVisible();
  687 |         await expect(page.locator('#terminal-workspace')).toBeHidden();
  688 |         const bounds = await page.locator('#workflow-panel').boundingBox();
  689 |         const sidebar = await page.locator('.sidebar').boundingBox();
  690 |         expect(bounds.width).toBeGreaterThan(width - sidebar.width - 3);
  691 |         expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  692 |         const overflow = await page.locator('.page-heading button').evaluateAll(buttons => buttons.filter(b => b.scrollWidth > b.clientWidth + 2 || b.getBoundingClientRect().right > innerWidth).map(b => b.textContent));
  693 |         expect(overflow).toEqual([]);
  694 |         if (width === 1440) {
  695 |           await page.screenshot({path:test.info().outputPath(`${route}-${theme}.png`)});
  696 |           const scan = await new AxeBuilder({page}).setLegacyMode(true).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  697 |           expect(scan.violations.map(v => ({id:v.id, nodes:v.nodes.map(n => n.target)}))).toEqual([]);
  698 |         }
  699 |       }
  700 |     }
  701 |   }
  702 |   await library();
  703 |   await page.getByLabel('Rechercher un modèle').fill('zzzz aucun résultat');
  704 |   await expect(page.locator('.template-card:visible')).toHaveCount(0);
  705 |   await expect(page.locator('#template-empty')).toBeVisible();
  706 |   await page.getByLabel('Rechercher un modèle').fill('COMMANDE LOCALE');
  707 |   await expect(page.locator('.template-card:visible')).toHaveCount(1);
  708 |   await expect(page.locator('#template-empty')).toBeHidden();
  709 |   await page.getByLabel('Rechercher un modèle').clear();
  710 |   await page.screenshot({path:test.info().outputPath('library-dark-800.png')});
  711 | });
  712 | 
  713 | test('terminal visibility preserves a live session while browsing and editing', async () => {
  714 |   await example();
  715 |   await page.getByRole('button', {name:'Ouvrir le terminal existant',exact:true}).click();
  716 |   await expect(page.locator('#terminal-workspace')).toBeVisible();
  717 |   const before = await page.evaluate(() => window.tricorder.terminals.list());
  718 |   expect(before.length).toBe(1);
  719 |   await library();
> 720 |   await expect(page.locator('#terminal-workspace')).toBeHidden();
      |                                                     ^ Error: expect(locator).toBeHidden() failed
  721 |   await page.locator('[data-action="terminal-toggle"]').click();
  722 |   await expect(page.locator('#terminal-workspace')).toBeVisible();
  723 |   await expect(page.locator('.xterm-screen')).toBeVisible();
  724 |   const after = await page.evaluate(() => window.tricorder.terminals.list());
  725 |   expect(after[0].id).toBe(before[0].id); expect(after[0].pid).toBe(before[0].pid);
  726 |   expect(after[0].alive).toBe(true);
  727 |   for (const width of [1024, 800]) {
  728 |     await page.setViewportSize({width,height:900});
  729 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  730 |     const term = await page.locator('#terminal-workspace').boundingBox();
  731 |     const graph = await page.locator('#workflow-panel').boundingBox();
  732 |     if (width === 800) expect(graph.y).toBeGreaterThanOrEqual(term.y + term.height - 1);
  733 |     else expect(graph.x).toBeGreaterThanOrEqual(term.x + term.width - 1);
  734 |     if (!(await page.locator('.sidebar-tools').evaluate(el => el.open))) await page.locator('.sidebar-tools > summary').click();
  735 |     await page.locator('[data-action="workflow-updates"]').click();
  736 |     const dialog = await page.getByRole('dialog').boundingBox();
  737 |     expect(dialog.width).toBeGreaterThan(500);
  738 |     await page.getByRole('button', {name:'Fermer la fenêtre',exact:true}).click();
  739 |   }
  740 |   await page.locator('[data-action="terminal-toggle"]').click();
  741 |   expect(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows().length)).toBe(1);
  742 | });
  743 | 
  744 | test('bootstrap failure is distinct from an empty catalog and Actualiser recovers', async () => {
  745 |   await app.evaluate(({ipcMain}) => {
  746 |     // Fault injection is confined to this synthetic Electron instance.
  747 |     const channel = [...ipcMain._invokeHandlers.keys()].find(key => key.endsWith('bootstrap') && !key.startsWith('studio:'));
  748 |     global.bootstrapChannel = channel;
  749 |     global.originalBootstrap = ipcMain._invokeHandlers.get(channel);
  750 |     ipcMain.removeHandler(channel); ipcMain.handle(channel, () => {throw new Error('Catalogue synthétique indisponible');});
  751 |   });
  752 |   await page.reload();
  753 |   await expect(page.locator('#catalog-warning')).toContainText('Catalogue synthétique indisponible');
  754 |   await expect(page.locator('#project-list')).not.toContainText('Aucun projet trouvé');
  755 |   await app.evaluate(({ipcMain}) => {ipcMain.removeHandler(global.bootstrapChannel);ipcMain.handle(global.bootstrapChannel,global.originalBootstrap);});
  756 |   await page.locator('[data-action="refresh"]').click();
  757 |   await expect(page.locator('#catalog-warning')).toBeHidden();
  758 |   await expect(page.locator('#sync-status')).toContainText('À jour');
  759 | });
  760 | 
  761 | 
  762 | test('optional workflow setup failure keeps native projects and can be retried', async () => {
  763 |   await expect(page.locator('#catalog-warning')).toBeVisible();
  764 |   await expect(page.locator('#project-list')).toContainText('sample-project');
  765 |   await expect(page.locator('#sync-status')).toHaveText('Workflows à vérifier');
  766 |   fs.writeFileSync(path.join(directory, 'invalid-pack/tricorder-pack.json'), JSON.stringify({schema:1,engine_schema:1,id:'fixture',version:'1',profiles:[]}));
  767 |   await page.locator('[data-action="refresh"]').click();
  768 |   await expect(page.locator('#catalog-warning')).toBeHidden();
  769 |   await expect(page.locator('#project-list')).toContainText('sample-project');
  770 |   await page.locator('[data-workflow-route="projects"]').click();
  771 |   await expect(page.locator('.project-card')).toContainText('sample-project');
  772 | });
  773 | 
  774 | test('work journey: name a meeting, select its repository, launch initial intention once and preserve the terminal', async () => {
  775 |   const bin = path.join(directory, 'bin'); fs.mkdirSync(bin, {recursive:true});
  776 |   const fake = `#!/usr/bin/python3
  777 | import json,re,shlex,subprocess,sys
  778 | prompt=sys.argv[-1]
  779 | command=shlex.split(re.search(r'^Pont : (.*)$',prompt,re.M).group(1))
  780 | state=json.loads(subprocess.run(command+['status'],capture_output=True,text=True).stdout)['result']
  781 | print('INITIAL-TASKS:'+str(len(state['items'])),flush=True)
  782 | for item in state['items']:print('INTENTION:'+item['request'],flush=True)
  783 | for line in sys.stdin:
  784 |  if line.strip()=='exit':break
  785 |  print('DIALOGUE:'+line.strip(),flush=True)
  786 | `;
  787 |   for (const provider of ['codex','claude']) fs.writeFileSync(path.join(bin,provider),fake,{mode:0o755});
  788 |   const project = await page.evaluate(() => window.studio.request({action:'project.create',title:'Équipe documentation'}));
  789 |   await page.getByRole('button',{name:'Projets',exact:true}).click();
  790 |   await page.locator('.project-card').filter({hasText:/Équipe documentation/}).click();
  791 |   await page.getByRole('button',{name:'Créer un workflow',exact:true}).click();
  792 |   await page.getByLabel('Modèle de workflow',{exact:true}).selectOption('meeting-conversation');
  793 |   await page.getByLabel('Nom du workflow').fill('Décisions du comité produit');
  794 |   await expect(page.getByLabel('Enregistrer dans')).toHaveValue(project.id);
  795 |   await page.screenshot({path:test.info().outputPath('new-meeting.png')});
  796 |   await page.getByRole('button',{name:'Créer et ouvrir le workflow'}).click();
  797 |   await expect(page.getByRole('heading',{name:'Décisions du comité produit',exact:true})).toBeVisible();
  798 |   const files = fs.readdirSync(path.join(project.path,'.tricorder/workflows'));
  799 |   expect(files).toHaveLength(1);
  800 |   expect(JSON.parse(fs.readFileSync(path.join(project.path,'.tricorder/workflows',files[0]))).title).toBe('Décisions du comité produit');
  801 |   await page.getByLabel('Fournisseur IA',{exact:true}).selectOption('claude');
  802 |   await page.getByRole('button',{name:'Exécuter…',exact:true}).click();
  803 |   await page.getByLabel('Quelle demande souhaitez-vous traiter ?').fill('Préparer les décisions et actions du comité de vendredi.');
  804 |   await page.getByRole('button',{name:'Lancer dans le terminal'}).click();
  805 |   await expect(page.locator('.xterm-screen:visible')).toContainText('INITIAL-TASKS:1');
  806 |   await expect(page.locator('.workflow-heading')).toContainText('Préparer les décisions');
  807 |   await expect(page.locator('.node[data-id=review]')).toHaveAttribute('data-status','ready');
  808 |   const before = await page.evaluate(() => window.tricorder.terminals.list());
  809 |   await library();
  810 |   await page.locator('[data-action=terminal-toggle]').click();
  811 |   await expect(page.locator('.xterm-screen:visible')).toContainText('INTENTION:Préparer');
  812 |   const after = await page.evaluate(() => window.tricorder.terminals.list());
  813 |   expect(after[0].pid).toBe(before[0].pid); expect(app.context().pages()).toHaveLength(1);
  814 |   await page.evaluate(id => window.tricorder.terminals.write({session:id,data:'exit\nexit\n'}),before[0].id);
  815 | });
  816 | 
  817 | test('repository journey: resume a cloned workflow, simulate a question and export a generic work dossier', async () => {
  818 |   const project = await page.evaluate(() => window.studio.request({action:'project.create',title:'Atelier sans pack métier'}));
  819 |   const folder = path.join(project.path,'.tricorder/workflows'); fs.mkdirSync(folder);
  820 |   const definition = {schema:1,id:'meeting-import',revision:7,title:'Relire les minutes',nodes:[{id:'question',kind:'question',title:'Préciser les participants',question:'Qui doit relire les minutes ?',outputs:{answer:'string'}}],edges:[]};
```
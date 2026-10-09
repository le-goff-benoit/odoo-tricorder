# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: studio.spec.cjs >> native conversation: provider choice, durable questions, live graph and same terminal after restart
- Location: tests/studio.spec.cjs:557:1

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Retrouver la conversation', exact: true })

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
    - button "Support synthétique" [ref=e33] [cursor=pointer]
    - generic [ref=e35]:
      - navigation "Configuration" [ref=e36]:
        - button "Planifications" [ref=e37] [cursor=pointer]
        - button "Connexions" [ref=e41] [cursor=pointer]
      - button "Paramètres" [ref=e48] [cursor=pointer]
      - group [ref=e52]:
        - generic "Outils et aide" [ref=e53] [cursor=pointer]
  - main [ref=e54]:
    - generic [ref=e55]:
      - generic [ref=e56]: Support synthétique
      - generic [ref=e58]:
        - button "Terminal 1" [pressed] [ref=e59] [cursor=pointer]:
          - generic [ref=e62]: Terminal
          - generic [ref=e63]: "1"
        - generic [ref=e64]:
          - text: IA des prochains lancements
          - combobox "Fournisseur IA" [ref=e65]:
            - option "OpenAI · Codex"
            - option "Anthropic · Claude" [selected]
        - group "Thème de l’interface" [ref=e66]:
          - button "Thème clair" [ref=e67] [cursor=pointer]
          - button "Thème sombre" [ref=e71] [cursor=pointer]
          - button "Thème système" [pressed] [ref=e74] [cursor=pointer]
        - status [ref=e78]: À jour · 00:18
        - button "Actualiser · À jour · 00:18" [ref=e79] [cursor=pointer]
    - generic [ref=e83]:
      - generic [ref=e84]:
        - generic [ref=e85]:
          - strong [ref=e86]: Terminal
          - generic [ref=e87]:
            - button "Contexte" [ref=e88] [cursor=pointer]
            - button "Disposition verticale" [ref=e89] [cursor=pointer]
            - button "Agrandir le terminal" [ref=e90] [cursor=pointer]
        - generic [ref=e91]:
          - generic [ref=e92]:
            - button "Conversation Claude · Demande client" [pressed] [ref=e93] [cursor=pointer]:
              - generic "Terminal ouvert — ne prouve pas qu’une étape travaille" [ref=e94]
              - img "Shell" [ref=e95]
            - button "Arrêter ce terminal" [ref=e98] [cursor=pointer]
          - button "Nouveau terminal" [ref=e101] [cursor=pointer]
          - button "Rechercher dans le terminal" [ref=e105] [cursor=pointer]
        - 'generic "Conversation du workflow affiché · Shell : Support synthétique" [ref=e110]'
        - generic [ref=e115]:
          - textbox "Terminal input" [ref=e116]
          - generic [aria-hidden]:
            - generic: "'python3' '/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/reso"
            - generic: urces/backend/agent_launch.py' '/tmp/tricorder-studio-ui-9kywDS/cockpit/age
            - generic: nt-events/cdb15427-e052-40a4-8e5b-7f15bb87b182.launch.json'
            - generic: To run a command as administrator (user "root"), use "sudo <command>".
            - generic: See "man sudo_root" for details.
            - generic: blegoff@wrk226:/tmp/tricorder-studio-ui-9kywDS/projects/p93789494b8a84def$
            - generic: "'python3' '/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/reso"
            - generic: urces/backend/agent_launch.py' '/tmp/tricorder-studio-ui-9kywDS/cockpit/age
            - generic: nt-events/cdb15427-e052-40a4-8e5b-7f15bb87b182.launch.json'
            - generic: NATIVE:claude
            - generic: Demande client
            - generic: QUESTION:Quel utilisateur est concerné ?
      - separator "Taille du terminal" [ref=e117]
      - main [ref=e121]:
        - generic [ref=e122]:
          - generic [ref=e123]:
            - generic [ref=e124]:
              - generic [ref=e125]: Suivi · Mon support
              - heading "Demande client" [level=1] [ref=e126]
            - group [ref=e128]:
              - generic "Options" [ref=e129] [cursor=pointer]
          - group "Périmètre du suivi" [ref=e130]:
            - button "Vue d’ensemble" [ref=e131] [cursor=pointer]
            - button "Demande" [pressed] [ref=e132] [cursor=pointer]
          - tablist "Vues du workflow"
          - generic [ref=e133]:
            - group [ref=e134]:
              - generic "1 demande" [ref=e135] [cursor=pointer]:
                - text: 1 demande
                - generic [aria-hidden] [ref=e136]: ⌄
            - paragraph [ref=e137]: Aucune étape en cours · 1 question
            - button "Voir le terminal" [ref=e138] [cursor=pointer]
          - region "État et prochaine action" [ref=e139]:
            - generic [ref=e140]:
              - generic [ref=e141]:
                - strong [ref=e142]: Réponse attendue
                - generic [ref=e143]: 0 / 1 étapes
              - button "Répondre à la question" [ref=e144] [cursor=pointer]
            - paragraph [ref=e145]: Analyser
          - group "Affichage du suivi" [ref=e147]:
            - button "Graphe" [pressed] [ref=e148] [cursor=pointer]
            - button "Détail" [ref=e149] [cursor=pointer]
          - generic [ref=e151]:
            - generic "Graphe du workflow" [ref=e152]:
              - button "Analyser · Réponse attendue" [ref=e155] [cursor=pointer]:
                - generic [ref=e158]:
                  - generic [aria-hidden] [ref=e159]: ✦
                  - generic [ref=e160]:
                    - generic "Analyser" [ref=e161]
                    - generic [ref=e162]: Tâche IA
                - generic [ref=e163]:
                  - generic [ref=e164]: Réponse attendue
                  - 'generic "Entrées : aucune · Sorties : finding" [ref=e165]': 0 entrée → 1 sortie
            - generic [ref=e166]:
              - generic [ref=e167]: 1 bloc · 0 lien
              - generic [ref=e168]:
                - button "Réduire le graphe" [ref=e169] [cursor=pointer]: −
                - generic [ref=e170]: 100 %
                - button "Agrandir le graphe" [ref=e171] [cursor=pointer]: +
                - button "Ajuster" [ref=e172] [cursor=pointer]
```

# Test source

```ts
  513 | 
  514 | test('human gate presents the full external content and candidate before approval', async () => {
  515 |   await page.getByRole('button', { name: 'Workflows', exact: true }).click();
  516 |   const operation = { action: 'update-page', target: 'synthetic-space/page', candidate: 'candidate-hash', body: 'Exact content to review', base_version: 7 };
  517 |   const graph = { schema: 1, id: 'exact-review', title: 'Exact review', nodes: [{ id: 'approve', kind: 'decision', title: 'Review publication', operation }], edges: [] };
  518 |   await page.evaluate(graph => window.studio.request({ action: 'workflow.save', project: 'workspace', graph }), graph);
  519 |   await page.getByRole('button', { name: 'Workflows', exact: true }).click();
  520 |   await page.getByRole('button', { name: 'Ouvrir le workflow', exact: true }).click();
  521 |   await simulate();
  522 |   await page.locator('.node[data-id="approve"]').click();
  523 |   await expect(page.locator('#inspector')).toContainText('Exact content to review');
  524 |   await expect(page.locator('#inspector')).toContainText('"base_version": 7');
  525 |   await expect(page.getByRole('button', { name: 'Autoriser cette opération' })).toBeVisible();
  526 |   const AxeBuilder = require('@axe-core/playwright').default;
  527 |   const scan = await new AxeBuilder({ page }).setLegacyMode(true).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  528 |   expect(scan.violations.map(v => v.id)).toEqual([]);
  529 | });
  530 | 
  531 | test('one provider choice applies to all AI steps and the project offers direct execution', async () => {
  532 |   await library();
  533 |   await page.locator('article').filter({ has: page.getByRole('heading', { name: 'Évolution logicielle', exact: true }) }).getByRole('button', { name: 'Utiliser', exact: true }).click();
  534 |   await page.getByRole('button', { name: 'Créer et ouvrir le workflow' }).click();
  535 |   await page.getByRole('button', { name: 'Choisir l’IA', exact: true }).click();
  536 |   await page.getByRole('dialog').getByLabel('Fournisseur IA', { exact: true }).selectOption('claude');
  537 |   await page.getByLabel('Modèle', { exact: true }).fill('explicit-claude-fixture');
  538 |   await page.getByRole('button', { name: 'Appliquer à toutes les étapes IA' }).click();
  539 |   await page.locator('.node[data-id="analyse"]').click();
  540 |   await expect(page.locator('#inspector')).toContainText('Anthropic · Claude');
  541 |   await expect(page.locator('#node-inputs')).not.toBeVisible();
  542 |   const data = await page.evaluate(async () => {
  543 |     const ctx = await window.studio.request({ action: 'workspace.get' });
  544 |     return ctx.workflows.find(g => g.title === 'Évolution logicielle');
  545 |   });
  546 |   expect(data.defaults.provider).toBe('claude');
  547 |   expect(data.defaults.model).toBe('explicit-claude-fixture');
  548 |   expect(data.nodes.filter(n => n.kind === 'agent').every(n => !Object.hasOwn(n, 'model'))).toBe(true);
  549 |   await page.getByRole('button', { name: 'Workflows', exact: true }).click();
  550 |   await page.getByRole('button', { name: 'Exécuter…', exact: true }).click();
  551 |   await expect(page.getByRole('dialog')).toContainText('IA pour les étapes de travail');
  552 |   await expect(page.getByRole('dialog').getByLabel('Fournisseur IA', { exact: true })).toHaveValue('claude');
  553 |   await page.getByText('Exécution automatique sans conversation',{exact:true}).evaluate(el => { el.parentElement.open = true; });
  554 |   await expect(page.getByRole('button', { name: 'Lancer l’exécution réelle' })).toBeDisabled();
  555 | });
  556 | 
  557 | test('native conversation: provider choice, durable questions, live graph and same terminal after restart', async () => {
  558 |   await quitApplication();
  559 |   const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  560 |   const fake = `#!/usr/bin/env python3
  561 | import json, re, shlex, subprocess, sys
  562 | print('NATIVE:' + sys.argv[0].split('/')[-1], flush=True)
  563 | command = shlex.split(re.search(r'^Pont : (.*)$', sys.argv[-1], re.M).group(1))
  564 | def call(action, value=None):
  565 |     p = subprocess.run(command + [action], input=json.dumps(value or {}), text=True, capture_output=True)
  566 |     data = json.loads(p.stdout)
  567 |     if not data['ok']: raise RuntimeError(data)
  568 |     return data['result']
  569 | item = question = None
  570 | for line in sys.stdin:
  571 |     text = line.strip()
  572 |     if text == 'exit': break
  573 |     if item is None:
  574 |         item = call('add', {'request': text, 'key': 'first'})
  575 |         claim = call('claim', {'run': item['run'], 'node': 'analyse'})
  576 |         run = call('ask', {'run': item['run'], 'node': 'analyse', 'token': claim['token'], 'text': 'Quel utilisateur est concerné ?'})
  577 |         question = run['nodes']['analyse']['question']['id']
  578 |         print('QUESTION:Quel utilisateur est concerné ?', flush=True)
  579 |     else:
  580 |         call('answer', {'run': item['run'], 'node': 'analyse', 'question': question, 'text': text})
  581 |         claim = call('claim', {'run': item['run'], 'node': 'analyse'})
  582 |         call('result', {'run': item['run'], 'node': 'analyse', 'token': claim['token'], 'result': {'ok': True, 'summary': 'Constat synthétique', 'outputs': {'finding': text}}})
  583 |         print('RECEIVED:' + text, flush=True)
  584 | `;
  585 |   for (const name of ['codex', 'claude']) { const file = path.join(bin, name); fs.writeFileSync(file, fake, { mode: 0o755 }); }
  586 |   const launch = () => electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE,
  587 |     args: process.env.TRICORDER_EXECUTABLE ? ['--workflow-studio'] : [root, '--workflow-studio'],
  588 |     env: { ...process.env, PATH: bin + ':' + process.env.PATH, TRICORDER_STATE_DIR: directory, TRICORDER_HOME: directory, TRICORDER_TEST_MODE: '1' }, timeout: 20000 });
  589 |   app = await launch(); page = await studioPage();
  590 |   await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
  591 |   const project = await page.evaluate(async () => {
  592 |     const p = await window.studio.request({action:'project.create', title:'Support synthétique'});
  593 |     await window.studio.request({action:'workflow.save',project:p.id,graph:{schema:1,id:'native-support',title:'Mon support',nodes:[{id:'analyse',kind:'agent',title:'Analyser',validation:'contract',outputs:{finding:'string'}}],edges:[]}});
  594 |     return p;
  595 |   });
  596 |   await page.getByRole('button', { name:'Projets', exact:true }).click();
  597 |   await page.locator('.project-card').filter({hasText:/Support synthétique/}).click();
  598 |   await page.getByRole('button', { name:'Ouvrir le workflow', exact:true }).click();
  599 |   await page.getByLabel('Fournisseur IA', {exact:true}).selectOption('claude');
  600 |   await page.getByRole('button', {name:'Exécuter…',exact:true}).click();
  601 |   await page.getByRole('button', {name:'Lancer dans le terminal',exact:true}).click();
  602 |   await expect(page.locator('.xterm-screen:visible')).toContainText('NATIVE:claude');
  603 |   expect(app.context().pages()).toHaveLength(1);
  604 |   await page.locator('.xterm-helper-textarea:visible').focus(); await page.keyboard.type('Demande client'); await page.keyboard.press('Enter');
  605 |   await expect(page.locator('.node[data-id=analyse]')).toHaveAttribute('data-status','waiting_input');
  606 |   await page.locator('.node[data-id=analyse]').click();
  607 |   await expect(page.locator('#inspector')).toContainText('Quel utilisateur est concerné ?');
  608 |   const before = await page.evaluate(() => window.tricorder.terminals.list());
  609 |   await quitApplication(); app = await launch(); page = await studioPage();
  610 |   await page.getByRole('button', {name:'Projets',exact:true}).click();
  611 |   await page.locator('.project-card').filter({hasText:/Support synthétique/}).click();
  612 |   await page.locator('[data-action=open-conversation]').click();
> 613 |   await page.getByRole('button', {name:'Retrouver la conversation',exact:true}).click();
      |                                                                                 ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  614 |   const after = await page.evaluate(() => window.tricorder.terminals.list());
  615 |   expect(after[0].id).toBe(before[0].id); expect(after[0].pid).toBe(before[0].pid);
  616 |   await page.locator('.xterm-helper-textarea:visible').focus(); await page.keyboard.type('Alice'); await page.keyboard.press('Enter');
  617 |   await expect(page.locator('.node[data-id=analyse]')).toHaveAttribute('data-status','accepted');
  618 |   await expect(page.locator('.xterm-screen:visible')).toContainText('RECEIVED:Alice');
  619 |   await page.screenshot({path:test.info().outputPath('native-conversation.png')});
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
```
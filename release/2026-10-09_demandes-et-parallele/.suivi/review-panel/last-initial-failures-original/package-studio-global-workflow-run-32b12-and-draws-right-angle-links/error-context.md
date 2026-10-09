# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: studio.spec.cjs >> global workflow runs independently of Git projects and draws right-angle links
- Location: tests/studio.spec.cjs:338:1

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "H"
Received string:    "M300,158 L318,158 L318,292 L352,292 L352,158 L370,158"
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
    - paragraph [ref=e33]: Ajoutez un dépôt depuis Projets, ou commencez un workflow global.
    - generic [ref=e34]:
      - navigation "Configuration" [ref=e35]:
        - button "Planifications" [ref=e36] [cursor=pointer]
        - button "Connexions" [ref=e40] [cursor=pointer]
      - button "Paramètres" [ref=e47] [cursor=pointer]
      - group [ref=e51]:
        - generic "Outils et aide" [ref=e52] [cursor=pointer]
  - main [ref=e53]:
    - generic [ref=e54]:
      - generic [ref=e55]: Sans projet
      - generic [ref=e57]:
        - button "Terminal" [ref=e58] [cursor=pointer]
        - generic [ref=e62]:
          - text: IA des prochains lancements
          - combobox "Fournisseur IA" [ref=e63]:
            - option "OpenAI · Codex" [selected]
            - option "Anthropic · Claude"
        - group "Thème de l’interface" [ref=e64]:
          - button "Thème clair" [ref=e65] [cursor=pointer]
          - button "Thème sombre" [ref=e69] [cursor=pointer]
          - button "Thème système" [pressed] [ref=e72] [cursor=pointer]
        - status [ref=e76]: À jour
        - button "Actualiser · À jour" [ref=e77] [cursor=pointer]
    - generic [ref=e83]:
      - main [ref=e85]:
        - generic [ref=e86]:
          - generic [ref=e87]:
            - generic [ref=e88]:
              - generic [ref=e89]: Sans projet / Workflow
              - heading "Nouveau message → notification" [level=1] [ref=e90]
              - paragraph [ref=e91]: Révision 1 · Enregistré
            - generic [ref=e92]:
              - button "Choisir l’IA" [ref=e93] [cursor=pointer]
              - group [ref=e94]:
                - generic "Options" [ref=e95] [cursor=pointer]
              - button "Enregistrer" [disabled] [ref=e96]
              - button "Exécuter…" [ref=e97] [cursor=pointer]
          - paragraph [ref=e98]: Enregistrez ici ; la navigation principale enregistre aussi vos modifications.
          - tablist "Vues du workflow" [ref=e99]:
            - tab "Éditeur" [selected] [ref=e100] [cursor=pointer]
            - tab "Exécution" [disabled] [ref=e101]
            - tab "Historique" [ref=e102] [cursor=pointer]
            - tab "Rapport" [disabled] [ref=e103]
          - generic [ref=e104]:
            - button "+ Ajouter un bloc" [ref=e105] [cursor=pointer]
            - button "Relier" [ref=e106] [cursor=pointer]
            - button "Paramètres du workflow" [ref=e107] [cursor=pointer]
            - button "Annuler la modification" [disabled] [ref=e109]: ↶
            - button "Rétablir la modification" [disabled] [ref=e110]: ↷
            - button "Ouvrir le terminal existant" [ref=e111] [cursor=pointer]: ›_ Terminal
            - group [ref=e112]:
              - generic "Éditeur" [ref=e113] [cursor=pointer]
            - button "✦ Assistant IA" [ref=e114] [cursor=pointer]
            - button "Changer la vue graphe ou liste" [ref=e115] [cursor=pointer]: ☷ Liste
          - generic [ref=e117]:
            - generic "Graphe du workflow" [ref=e118]:
              - generic [ref=e120]:
                - img:
                  - 'button "Corriger le lien : Repérer un nouveau message → Un nouveau message correspond ? · 2 données" [ref=e121] [cursor=pointer]'
                  - 'button "Corriger le lien : Un nouveau message correspond ? → Prévenir le destinataire · yes · 1 donnée" [ref=e124] [cursor=pointer]'
                  - generic [ref=e129] [cursor=pointer]: 2 données
                  - generic [ref=e132] [cursor=pointer]: yes · 1 donnée
                - generic:
                  - button "Repérer un nouveau message · Surveillance" [ref=e133] [cursor=pointer]:
                    - generic [ref=e136]:
                      - generic [aria-hidden] [ref=e137]: ◷
                      - generic [ref=e138]:
                        - generic "Repérer un nouveau message" [ref=e139]
                        - generic [ref=e140]: Surveillance
                    - 'generic "Entrées : aucune · Sorties : match, message" [ref=e142]': 0 entrée → 2 sorties
                  - button "Un nouveau message correspond ? · Condition" [ref=e143] [cursor=pointer]:
                    - generic [ref=e146]:
                      - generic [aria-hidden] [ref=e147]: ⑂
                      - generic [ref=e148]:
                        - generic "Un nouveau message correspond ?" [ref=e149]
                        - generic [ref=e150]: Condition
                    - 'generic "Entrées : match, message · Sorties : message" [ref=e152]': 2 entrées → 1 sortie
                  - button "Prévenir le destinataire · Communication" [ref=e153] [cursor=pointer]:
                    - generic [ref=e156]:
                      - generic [aria-hidden] [ref=e157]: ↗
                      - generic [ref=e158]:
                        - generic "Prévenir le destinataire" [ref=e159]
                        - generic [ref=e160]: Communication
                    - 'generic "Entrées : message · Sorties : aucune" [ref=e162]': 1 entrée → 0 sortie
            - generic [ref=e163]:
              - generic [ref=e164]: 3 blocs · 2 liens
              - generic [ref=e165]:
                - button "Réduire le graphe" [ref=e166] [cursor=pointer]: −
                - generic [ref=e167]: 100 %
                - button "Agrandir le graphe" [ref=e168] [cursor=pointer]: +
                - button "Ajuster" [ref=e169] [cursor=pointer]
                - button "Réorganiser le graphe" [ref=e170] [cursor=pointer]
      - status [ref=e171]: Workflow enregistré dans le dossier choisi. Adaptez-le ou choisissez Exécuter.
```

# Test source

```ts
  248 |   const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Commande locale avec validation', exact: true }) });
  249 |   await card.getByRole('button', { name: 'Personnaliser une copie…' }).click();
  250 |   await page.getByRole('button', { name: 'Créer la copie et l’ouvrir', exact: true }).click();
  251 |   await expect(page.locator('.breadcrumb')).toContainText('Modèles / Workflow');
  252 |   await page.getByRole('button', { name: 'Ouvrir le terminal existant' }).click();
  253 |   await expect(page.locator('#terminal-workspace')).toBeVisible();
  254 |   const input = page.locator('.xterm-helper-textarea'); await input.focus();
  255 |   const script = 'import json; from pathlib import Path; p=next(Path("workflows").glob("*.json")); g=json.loads(p.read_text()); g["title"]="Modèle corrigé au terminal"; p.write_text(json.dumps(g))';
  256 |   await page.keyboard.type("python3 -c '" + script + "'"); await page.keyboard.press('Enter');
  257 |   expect(fs.readFileSync(path.join(directory, 'library/.tricorder/AGENTS.md'), 'utf8')).toContain('sans agent dédié');
  258 |   const files = path.join(directory, 'library/.tricorder/workflows');
  259 |   await expect.poll(() => { const file = fs.readdirSync(files).find(n => n.endsWith('.json')); return JSON.parse(fs.readFileSync(path.join(files, file))).title; }).toBe('Modèle corrigé au terminal');
  260 |   if (!(await page.locator('.workflow-options').evaluate(el => el.open))) await page.locator('.workflow-options > summary').click();
  261 |   await page.getByRole('button', { name: 'Recharger et valider' }).click();
  262 |   await expect(page.getByRole('heading', { name: 'Modèle corrigé au terminal' })).toBeVisible();
  263 |   await page.screenshot({ path: path.join(test.info().outputDir, 'studio-template-terminal.png'), fullPage: true });
  264 |   await page.locator('.xterm-helper-textarea:visible').focus(); await page.keyboard.type('exit'); await page.keyboard.press('Enter');
  265 |   await expect.poll(async () => (await page.evaluate(() => window.tricorder.terminals.list())).every(s => !s.alive)).toBe(true);
  266 | });
  267 | 
  268 | test('recurrence activation shows models and persists; communication needs exact recipients', async () => {
  269 |   await library();
  270 |   const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Nouveau message → notification', exact: true }) });
  271 |   await card.getByRole('button', { name: 'Utiliser', exact: true }).click();
  272 |   await page.getByRole('button', { name: 'Créer et ouvrir le workflow' }).click();
  273 |   await page.locator('.node[data-id="notify"]').click();
  274 |   await page.getByLabel('Canal de communication').selectOption('telegram');
  275 |   await page.getByRole('button', { name: 'Appliquer au bloc' }).click();
  276 |   if (!(await page.locator('.design-menu').evaluate(el => el.open))) await page.locator('.design-menu > summary').click();
  277 |   await page.getByRole('button', { name: 'Planifier', exact: true }).click();
  278 |   await expect(page.getByRole('dialog')).toContainText('Modèles IA : aucun');
  279 |   await expect(page.getByRole('dialog')).toContainText('Connecteur telegram non connecté');
  280 |   await page.getByLabel(/J’active cette révision/).check();
  281 |   await page.getByRole('button', { name: 'Activer la planification' }).click();
  282 |   await expect(page.getByRole('heading', { name: 'Planifications' })).toBeVisible();
  283 |   await expect(page.locator('article.card')).toContainText('Simulation');
  284 |   await page.locator('article.card').getByRole('button', { name: 'Suspendre' }).click();
  285 |   await expect(page.locator('article.card')).toContainText('Suspendue');
  286 | });
  287 | 
  288 | test('window closes to Ubuntu tray and remains available', async () => {
  289 |   await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  290 |   await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  291 |   expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible())).toBe(false);
  292 |   await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].show());
  293 |   await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
  294 | });
  295 | 
  296 | test('new plugin declared in the terminal workspace is selectable without a dedicated agent', async () => {
  297 |   await library();
  298 |   const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Analyse', exact: true }) });
  299 |   await card.getByRole('button', { name: 'Personnaliser une copie…' }).click();
  300 |   await page.getByRole('button', { name: 'Créer la copie et l’ouvrir', exact: true }).click();
  301 |   await expect(page.locator('.breadcrumb')).toContainText('Modèles / Workflow');
  302 |   await expect(page.locator('.node[data-id="work"]')).toBeVisible();
  303 |   const plugin = { id: 'future-plugin', title: 'Nouveau plugin', provider: 'codex', operations: ['read'] };
  304 |   const workspace = path.join(directory, 'library/.tricorder');
  305 |   expect(fs.readFileSync(path.join(workspace, 'AGENTS.md'), 'utf8')).toContain('tricorder-guidance version=');
  306 |   fs.writeFileSync(path.join(workspace, 'plugins.json'), JSON.stringify({ schema: 1, plugins: [plugin] }));
  307 |   await page.locator('.node[data-id="work"]').click();
  308 |   await page.getByText('Outils et plugins de cette étape', { exact: true }).click();
  309 |   await page.getByRole('button', { name: 'Actualiser les outils' }).click();
  310 |   await page.getByText('Agent et modèle pour cette étape', { exact: true }).click();
  311 |   await page.getByLabel('Agent dédié (facultatif)').selectOption('generalist');
  312 |   await page.getByLabel('Capacités de plugins (facultatives)').selectOption({ label: 'Nouveau plugin · read' });
  313 |   await page.getByLabel('Modèle IA', { exact: true }).fill('explicit-test-model');
  314 |   await page.getByRole('button', { name: 'Appliquer au bloc' }).click();
  315 |   await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  316 |   await page.getByRole('button', { name: 'Exécuter…' }).click();
  317 |   await expect(page.getByRole('dialog')).toContainText('transport d’outils non qualifié');
  318 |   await page.getByText('Exécution automatique sans conversation',{exact:true}).evaluate(el => { el.parentElement.open = true; });
  319 |   await expect(page.getByRole('button', { name: 'Lancer l’exécution réelle' })).toBeDisabled();
  320 | });
  321 | 
  322 | test('real isolated command produces evidence, then waits for human receipt', async () => {
  323 |   await library();
  324 |   const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Commande locale avec validation', exact: true }) });
  325 |   await card.getByRole('button', { name: 'Utiliser', exact: true }).click();
  326 |   await page.getByRole('button', { name: 'Créer et ouvrir le workflow' }).click();
  327 |   await page.getByRole('button', { name: 'Exécuter…' }).click();
  328 |   await page.getByText('Exécution automatique sans conversation',{exact:true}).evaluate(el => { el.parentElement.open = true; });
  329 |   await page.getByRole('button', { name: 'Lancer l’exécution réelle' }).click();
  330 |   await expect(page.locator('.node[data-id="check"]')).toHaveAttribute('data-status', 'returned');
  331 |   await page.locator('.node[data-id="check"]').click();
  332 |   await expect(page.locator('#inspector')).toContainText('Python opérationnel');
  333 |   await expect(page.locator('.node[data-id="decision"]')).toHaveAttribute('data-status', 'pending');
  334 |   await receive('check', true);
  335 |   await expect(page.locator('.node[data-id="decision"]')).toHaveAttribute('data-status', 'waiting');
  336 | });
  337 | 
  338 | test('global workflow runs independently of Git projects and draws right-angle links', async () => {
  339 |   await page.getByRole('button', { name: 'Workflows', exact: true }).click();
  340 |   await expect(page.getByRole('heading', { name: 'Mes workflows', level: 1 })).toBeVisible();
  341 |   await page.getByRole('button', { name: 'Choisir un modèle' }).click();
  342 |   const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Nouveau message → notification', exact: true }) });
  343 |   await card.getByRole('button', { name: 'Utiliser', exact: true }).click();
  344 |   await page.getByRole('button', { name: 'Créer et ouvrir le workflow' }).click();
  345 |   await expect(page.locator('.breadcrumb')).toContainText('Sans projet');
  346 |   const paths = await page.locator('svg path.edge').evaluateAll(elements => elements.map(e => e.getAttribute('d')));
  347 |   expect(paths.length).toBeGreaterThan(0);
> 348 |   for (const d of paths) { expect(d).toContain('H'); expect(d).toContain('V'); expect(d).not.toMatch(/[CQ]/); }
      |                                      ^ Error: expect(received).toContain(expected) // indexOf
  349 |   await simulate();
  350 |   await expect(page.locator('.node[data-id="mail"]')).toHaveAttribute('data-status', 'accepted');
  351 |   await page.screenshot({ path: path.join(test.info().outputDir, 'studio-global-orthogonal.png'), fullPage: true });
  352 |   await page.getByRole('button', { name: 'Projets', exact: true }).click();
  353 |   await expect(page.locator('.project-card')).toHaveCount(0);
  354 |   await page.locator('[data-workflow-route=overview]').click();
  355 |   await page.locator('.activity-row').first().click();
  356 |   await expect(page.locator('.node[data-id="mail"]')).toHaveAttribute('data-status', 'accepted');
  357 | });
  358 | 
  359 | test('exported clickable file opens on another local instance as a draft without execution', async () => {
  360 |   await example();
  361 |   const file = path.join(directory, 'example.tricorder-workflow');
  362 |   await app.evaluate(({ dialog }, target) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: target }); }, file);
  363 |   await page.locator('.design-menu > summary').click();
  364 |   await page.getByRole('button', { name: 'Exporter…', exact: true }).click();
  365 |   await expect.poll(() => fs.existsSync(file)).toBe(true);
  366 |   const exported = JSON.parse(fs.readFileSync(file));
  367 |   expect(exported.format).toBe('tricorder.workflow');
  368 |   await quitApplication();
  369 |   const destination = path.join(directory, 'other-computer');
  370 |   app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? [file] : [root, file], env: { ...process.env, TRICORDER_STATE_DIR: destination, TRICORDER_HOME: destination, TRICORDER_TEST_MODE: '1' } });
  371 |   page = await studioPage();
  372 |   await expect(page.getByRole('dialog')).toContainText('Importer un workflow portable');
  373 |   await page.getByLabel('Destination', { exact: true }).selectOption('workspace');
  374 |   await page.getByRole('button', { name: 'Importer le brouillon' }).click();
  375 |   await expect(page.locator('.breadcrumb')).toContainText('Sans projet');
  376 |   await expect(page.locator('.node')).toHaveCount(6);
  377 |   const data = await page.evaluate(() => window.studio.request({ action: 'project.get', project: 'workspace' }));
  378 |   expect(data.runs).toHaveLength(0);
  379 |   expect(data.workflows).toHaveLength(1);
  380 | });
  381 | 
  382 | test('update dialog is explicit and test mode makes no automatic network request', async () => {
  383 |   await page.locator('.sidebar-tools > summary').click();
  384 |   await page.getByRole('button', { name: 'Mises à jour', exact: true }).click();
  385 |   await expect(page.getByRole('dialog')).toContainText('Version installée');
  386 |   await expect(page.getByRole('dialog')).toContainText('hors mode de test');
  387 |   await expect(page.getByRole('button', { name: 'Télécharger le paquet Ubuntu' })).toHaveCount(0);
  388 | });
  389 | 
  390 | test('repeated example clicks never create duplicate demo projects', async () => {
  391 |   await page.getByRole('button', { name: 'Essayer un exemple' }).evaluate(button => { button.click(); button.click(); });
  392 |   await expect(page.getByRole('heading', { name: "De la demande au résultat" })).toBeVisible();
  393 |   await page.getByRole('button', { name: 'Projets', exact: true }).click();
  394 |   await expect(page.locator('.project-card')).toHaveCount(1);
  395 |   await example();
  396 |   await page.getByRole('button', { name: 'Projets', exact: true }).click();
  397 |   await expect(page.locator('.project-card')).toHaveCount(1);
  398 | });
  399 | 
  400 | test('trusted local adapter runs through the UI and automatic validation completes without a human receipt', async () => {
  401 |   const script = path.join(directory, 'adapter.py');
  402 |   fs.writeFileSync(script, `import json,sys\np=json.load(sys.stdin)\nif p['action']=='describe':\n print(json.dumps({'protocol':'tricorder.tool/1','identity':'ui-fixture','connected':True,'operations':{'read':'read'}}))\nelse:\n print(json.dumps({'ok':True,'identity':'ui-fixture','outputs':{'value':42}}))\n`);
  403 |   const folder = path.join(directory, 'workspace/.tricorder');
  404 |   fs.writeFileSync(path.join(folder, 'plugins.json'), JSON.stringify({ schema: 1, plugins: [{ id: 'fixture', title: 'Adaptateur de test', provider: 'local', operations: ['read'], transport: { argv: ['/usr/bin/python3', script], timeout: 3 } }] }));
  405 |   const graph = { schema: 1, id: 'automatic-tool', title: 'Lecture automatique', nodes: [{ id: 'read', title: 'Lire le résultat', kind: 'document', validation: 'automatic', capabilities: [{ plugin: 'fixture', operation: 'read' }], outputs: { value: 'number' } }], edges: [] };
  406 |   await page.evaluate(graph => window.studio.request({ action: 'workflow.save', project: 'workspace', graph }), graph);
  407 |   await page.getByRole('button', { name: 'Workflows', exact: true }).click();
  408 |   await page.getByRole('button', { name: 'Connexions', exact: true }).click();
  409 |   const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Adaptateur de test', exact: true }) });
  410 |   await card.getByRole('button', { name: 'Vérifier l’adaptateur…' }).click();
  411 |   await expect(page.getByRole('dialog')).toContainText(script);
  412 |   await page.getByRole('button', { name: 'Exécuter le contrôle' }).click();
  413 |   await expect(card).toContainText('Utilisable');
  414 |   await page.getByRole('button', { name: 'Workflows', exact: true }).click();
  415 |   await page.getByRole('button', { name: 'Ouvrir le workflow' }).click();
  416 |   await page.getByRole('button', { name: 'Exécuter…' }).click();
  417 |   await expect(page.getByRole('dialog')).toContainText('Validation automatique');
  418 |   await page.getByText('Exécution automatique sans conversation',{exact:true}).evaluate(el => { el.parentElement.open = true; });
  419 |   await page.getByRole('button', { name: 'Lancer l’exécution réelle' }).click();
  420 |   await expect(page.locator('#run-banner')).toContainText('Terminée');
  421 |   await expect(page.locator('.node[data-id="read"]')).toHaveAttribute('data-status', 'accepted');
  422 |   await expect(page.getByRole('button', { name: 'Valider le résultat' })).toHaveCount(0);
  423 |   await page.screenshot({ path: path.join(test.info().outputDir, 'automatic-adapter.png'), fullPage: true });
  424 | });
  425 | 
  426 | test('large workflow remains editable in canvas and keyboard list', async () => {
  427 |   const graph = { schema: 1, id: 'large', title: 'Mille étapes', nodes: Array.from({ length: 1000 }, (_, i) => ({ id: `n${i}`, title: `Étape ${i}`, kind: 'join', position: { x: (i % 20) * 300, y: Math.floor(i / 20) * 170 } })), edges: Array.from({ length: 999 }, (_, i) => ({ id: `e${i}`, from: `n${i}`, to: `n${i + 1}` })) };
  428 |   await page.evaluate(graph => window.studio.request({ action: 'workflow.save', project: 'workspace', graph }), graph);
  429 |   await page.getByRole('button', { name: 'Workflows', exact: true }).click();
  430 |   const start = Date.now();
  431 |   await page.getByRole('button', { name: 'Ouvrir le workflow' }).click();
  432 |   await expect(page.locator('.node')).toHaveCount(1000);
  433 |   expect(Date.now() - start).toBeLessThan(10000);
  434 |   await page.getByRole('button', { name: 'Changer la vue graphe ou liste' }).click();
  435 |   await expect(page.getByRole('cell', { name: 'Étape 999', exact: true })).toBeAttached();
  436 | });
  437 | 
  438 | test('application navigation separates overview, workflow use and editor with compact responsive spacing', async () => {
  439 |   const sidebar = page.getByRole('complementary', { name: 'Tricorder', exact: true });
  440 |   await expect(sidebar.locator('.brand-name')).toHaveText('Tricorder');
  441 |   await expect(sidebar).not.toContainText('Éditeur de workflows');
  442 |   await expect(sidebar.getByRole('button', { name: 'Activité' })).toHaveAttribute('aria-current', 'page');
  443 |   await example(); await simulate();
  444 |   await page.getByRole('button', { name: 'Activité', exact: true }).click();
  445 |   await expect(page.getByRole('heading', { name: 'Activité' })).toBeVisible();
  446 |   await expect(page.locator('.activity-list')).toContainText('De la demande au résultat');
  447 |   await page.screenshot({ path: path.join(test.info().outputDir, 'navigation-overview.png'), fullPage: true });
  448 |   for (const width of [1280, 1024, 800]) {
```
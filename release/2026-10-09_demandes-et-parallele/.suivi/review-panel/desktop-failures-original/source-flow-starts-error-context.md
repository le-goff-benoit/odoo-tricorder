# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: desktop.spec.cjs >> flow starts: delayed terminal cannot hijack navigation, ambiguous adoption stays explicit
- Location: tests/desktop.spec.cjs:569:1

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
- text: Workflow
- combobox "Workflow":
  - option "Release Odoo" [selected]
  - option "Demande Odoo"
  - option "Diagnostic Odoo"
- button "Démarrer le workflow"
- strong: Terminal
- button "Agrandir le terminal"
- text: Environnement
- combobox "Environnement":
  - option "Shell local" [selected]
- button "Nouveau terminal"
- button "Rechercher dans le terminal"
- heading "Aucun terminal ouvert" [level=2]
- paragraph: Un shell dans le dossier du projet. Lancez Claude ou Codex avec suivi, ou vos commandes habituelles.
- button "Ouvrir un terminal"
- button "Anthropic Anthropic · Claude":
  - img "Anthropic"
  - text: Anthropic · Claude
- button "OpenAI OpenAI · Codex":
  - img "OpenAI"
  - text: OpenAI · Codex
```

# Test source

```ts
  506 |     await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 700));
  507 |     await expect(page.locator('#release-select')).toHaveValue(releaseId);
  508 |     await page.locator('#release-select').selectOption('');
  509 |     await projectTab(page, 'plan');
  510 |     await expect(page.locator('.no-release')).toContainText('Aucune release sélectionnée');
  511 |     await page.locator('[data-action="refresh"]').evaluate(el => el.click());
  512 |     // The selection was already empty: it cannot prove refresh has finished.
  513 |     // Wait for the completed overview before creating a release and refreshing again.
  514 |     await expect(page.locator('#sync-status')).toHaveText(/^À jour · /);
  515 |     await expect(page.locator('#release-select')).toHaveValue('');
  516 |     await expect(page.locator('.project-header [data-action="new-terminal"]')).toHaveCount(0);
  517 |     await page.keyboard.press('Control+Shift+T');
  518 |     await expect.poll(async () => (await page.evaluate(() => window.tricorder.terminals.list())).length).toBe(1);
  519 |     const original = (await page.evaluate(() => window.tricorder.terminals.list()))[0];
  520 |     expect(original.release).toBeNull();
  521 |     expect(Number.isInteger(original.pid)).toBe(true);
  522 |     const newId = '2026-09-12_01_nouvelle-release';
  523 |     write(path.join(project, 'changelog', newId, 'README.md'), '<!-- release ouverte -->\n# Nouvelle release\n');
  524 |     await page.locator('[data-action="refresh"]').evaluate(el => el.click());
  525 |     await expect(page.locator('#release-select')).toHaveValue(newId);
  526 |     await expect.poll(async () => (await page.evaluate(() => window.tricorder.terminals.list()))[0].release).toBe(newId);
  527 |     const updated = (await page.evaluate(() => window.tricorder.terminals.list()))[0];
  528 |     expect(updated.id).toBe(original.id); expect(updated.pid).toBe(original.pid); expect(updated.alive).toBe(true);
  529 |     const stored = JSON.parse(fs.readFileSync(path.join(temp, 'state/settings.json'), 'utf8'));
  530 |     expect(stored.contexts[project].release).toBe(newId);
  531 |     const refused = await page.evaluate(async ({ project, session }) => {
  532 |       try { await window.tricorder.terminals.context({ project, session, release: 'missing-release' }); return false; }
  533 |       catch { return true; }
  534 |     }, { project, session: original.id });
  535 |     expect(refused).toBe(true);
  536 |     const stale = await page.evaluate(async ({ project, session, release }) => {
  537 |       try { await window.tricorder.terminals.context({ project, session, release, expectedRelease: null }); return false; }
  538 |       catch { return true; }
  539 |     }, { project, session: original.id, release: releaseId });
  540 |     expect(stale).toBe(true);
  541 |     const foreign = await page.evaluate(async ({ project, session }) => {
  542 |       try { await window.tricorder.terminals.context({ project, session, release: null }); return false; }
  543 |       catch { return true; }
  544 |     }, { project: path.join(home, 'nova-services'), session: original.id });
  545 |     expect(foreign).toBe(true);
  546 |     await closeWindow(app); app = await electron.launch(options);
  547 |     page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
  548 |     await expect(page.locator('#release-select')).toHaveValue(newId);
  549 |     expect((await page.evaluate(() => window.tricorder.terminals.list()))[0].pid).toBe(original.pid);
  550 |     await page.locator('#release-select').selectOption('');
  551 |     await projectTab(page, 'terminal');
  552 |     await page.locator('[data-action="terminal-context"]').click();
  553 |     await expect.poll(async () => (await page.evaluate(() => window.tricorder.terminals.list()))[0].release).toBeNull();
  554 |     await page.locator('[data-action="refresh"]').evaluate(el => el.click());
  555 |     await expect(page.locator('#release-select')).toHaveValue('');
  556 |     await expect(page.locator('#terminal-mismatch')).toHaveCount(0);
  557 |     await closeWindow(app); app = await electron.launch(options);
  558 |     page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
  559 |     await expect(page.locator('#release-select')).toHaveValue('');
  560 |     expect((await page.evaluate(() => window.tricorder.terminals.list()))[0].pid).toBe(original.pid);
  561 |     await page.screenshot({ path: 'test-results/no-release-terminal.png' });
  562 |     expect(errors).toEqual([]);
  563 |   } finally {
  564 |     await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
  565 |     await cleanupBroker(path.join(temp, 'run/pty.sock')); fs.rmSync(temp, { recursive: true, force: true });
  566 |   }
  567 | });
  568 | 
  569 | test('flow starts: delayed terminal cannot hijack navigation, ambiguous adoption stays explicit', async () => {
  570 |   const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-flow-starts-'));
  571 |   const home = path.join(temp, 'home'); fs.mkdirSync(home);
  572 |   const { project, releaseId } = fixture(home);
  573 |   const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
  574 |     ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
  575 |     env: { ...process.env, HOME: home, TRICORDER_HOME: home,
  576 |       TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
  577 |       TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  578 |   const errors = [];
  579 |   try {
  580 |     const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
  581 |     await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 700));
  582 |     await expect(page.locator('#release-select')).toHaveValue(releaseId);
  583 |     await page.locator('#release-select').selectOption('');
  584 |     await projectTab(page, 'plan');
  585 |     await expect(page.locator('.no-release')).toBeVisible();
  586 |     // Deterministic pause, not a timing-dependent sleep: user leaves during creation.
  587 |     await app.evaluate(({ ipcMain }) => {
  588 |       const original = ipcMain._invokeHandlers.get('terminal:create');
  589 |       ipcMain.removeHandler('terminal:create');
  590 |       ipcMain.handle('terminal:create', async (...args) => {
  591 |         await new Promise(resolve => { globalThis.finishTerminalCreation = resolve; });
  592 |         return original(...args);
  593 |       });
  594 |       globalThis.originalTerminalCreate = original;
  595 |     });
  596 |     await page.keyboard.press('Control+Shift+T');
  597 |     await expect.poll(() => app.evaluate(() => typeof globalThis.finishTerminalCreation)).toBe('function');
  598 |     await page.locator('[data-project]').filter({ hasText: 'nova-services' }).click();
  599 |     await expect(page.locator('.no-release')).toBeVisible();
  600 |     await app.evaluate(({ ipcMain }) => {
  601 |       ipcMain.removeHandler('terminal:create'); ipcMain.handle('terminal:create', globalThis.originalTerminalCreate);
  602 |       globalThis.finishTerminalCreation();
  603 |     });
  604 |     await expect(page.locator('#session-count')).toHaveCount(0);
  605 |     await expect(page.locator('.no-release')).toBeVisible();
> 606 |     await expect(page.locator('#terminal-workspace')).toBeHidden();
      |                                                       ^ Error: expect(locator).toBeHidden() failed
  607 |     // A late startup must not reveal an empty terminal in the newly selected project.
  608 |     await expect(page.locator('.no-release')).toBeVisible();
  609 |     await expect.poll(() => page.evaluate(async () => (await window.tricorder.terminals.list()).length)).toBe(1);
  610 |     const first = (await page.evaluate(() => window.tricorder.terminals.list()))[0];
  611 |     expect(first.project).toBe(project); expect(first.release).toBeNull();
  612 |     await page.locator('[data-project]').filter({ hasText: 'orbital-industries' }).click();
  613 |     await expect(page.locator('#release-select')).toHaveValue('');
  614 |     // Two ordinary conversations and an Express conversation: never guess a creator.
  615 |     await page.evaluate(async project => {
  616 |       await window.tricorder.terminals.create({ project, release: null });
  617 |       await window.tricorder.terminals.create({ project, release: null, scopeMode: 'express' });
  618 |     }, project);
  619 |     const newId = '2026-09-12_01_ambiguite';
  620 |     write(path.join(project, 'changelog', newId, 'README.md'), '<!-- release ouverte -->\n# Nouvelle release\n');
  621 |     await page.locator('[data-action="refresh"]').evaluate(el => el.click());
  622 |     await expect(page.locator('#release-select')).toHaveValue(newId);
  623 |     const unchanged = await page.evaluate(() => window.tricorder.terminals.list());
  624 |     expect(unchanged).toHaveLength(3);
  625 |     expect(unchanged.every(s => s.release === null)).toBe(true);
  626 |     await expect(page.locator('#toast')).toContainText('aucun terminal réaffecté automatiquement');
  627 |     await projectTab(page, 'terminal');
  628 |     await projectTab(page, 'terminal');
  629 |     await page.locator('[data-action="terminal-context"]').click();
  630 |     await expect.poll(async () => (await page.evaluate(() => window.tricorder.terminals.list())).filter(s => s.release === newId).length).toBe(1);
  631 |     const assigned = await page.evaluate(() => window.tricorder.terminals.list());
  632 |     expect(assigned.find(s => s.id === first.id).release).toBe(newId);
  633 |     expect(assigned.find(s => s.id === first.id).pid).toBe(first.pid);
  634 |     expect(assigned.find(s => s.scopeMode === 'express').release).toBeNull();
  635 |     // A late response for the former project must not replace the current screen.
  636 |     await projectTab(page, 'plan');
  637 |     await app.evaluate(({ ipcMain }, delayedProject) => {
  638 |       const original = ipcMain._invokeHandlers.get('project');
  639 |       ipcMain.removeHandler('project');
  640 |       ipcMain.handle('project', async (...args) => {
  641 |         if (args[1] === delayedProject) await new Promise(resolve => { globalThis.finishProjectRead = resolve; });
  642 |         return original(...args);
  643 |       });
  644 |       globalThis.originalProjectRead = original;
  645 |     }, project);
  646 |     await page.locator('#release-select').selectOption(releaseId);
  647 |     await expect.poll(() => app.evaluate(() => typeof globalThis.finishProjectRead)).toBe('function');
  648 |     await page.locator('[data-project]').filter({ hasText: 'nova-services' }).click();
  649 |     await expect(page.locator('.no-release')).toBeVisible();
  650 |     await app.evaluate(({ ipcMain }) => {
  651 |       ipcMain.removeHandler('project'); ipcMain.handle('project', globalThis.originalProjectRead);
  652 |       globalThis.finishProjectRead();
  653 |     });
  654 |     await page.locator('[data-action="refresh"]').evaluate(el => el.click());
  655 |     await expect(page.locator('.project-item.selected')).toContainText('nova-services');
  656 |     await expect(page.locator('.no-release')).toBeVisible();
  657 |     const stored = JSON.parse(fs.readFileSync(path.join(temp, 'state/settings.json'), 'utf8'));
  658 |     expect(stored.contexts[project].release).toBe(newId);
  659 |     expect(errors).toEqual([]);
  660 |   } finally {
  661 |     await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
  662 |     await cleanupBroker(path.join(temp, 'run/pty.sock')); fs.rmSync(temp, { recursive: true, force: true });
  663 |   }
  664 | });
  665 | 
  666 | test('Markdown preview: readable safe content and recovery from a project read error', async () => {
  667 |   const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-markdown-'));
  668 |   const home = path.join(temp, 'home'); fs.mkdirSync(home);
  669 |   const { project, releaseId } = fixture(home);
  670 |   const source = '<!-- release ouverte -->\n# Guide lisible\n\n## Résultat\n\nDu **gras**, de l’*italique* et du `code`.\n\n- Premier point\n- Second point\n\n- [x] Accepté\n\n| Tâche | Résultat |\n| --- | --- |\n| T01 | Validé |\n\n> Une remarque utile.\n\n```js\nconst ok = true;\n```\n\n![tracking](https://invalid.example.test/pixel.png)\n<script>window.INJECTED = true</script>\n<button data-action="new-terminal">Non actif</button>\n<a href="javascript:alert(1)">Lien dangereux</a>\n';
  671 |   write(path.join(project, 'changelog', releaseId, 'README.md'), source);
  672 |   const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
  673 |     ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
  674 |     env: { ...process.env, HOME: home, TRICORDER_HOME: home,
  675 |       TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents'),
  676 |       TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run') } });
  677 |   const errors = [], external = [];
  678 |   try {
  679 |     const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
  680 |     page.on('request', r => { if (/^https?:/.test(r.url())) external.push(r.url()); });
  681 |     await expect(page.locator('#release-select')).toHaveValue(releaseId);
  682 |     await projectTab(page, 'plan');
  683 |     await page.locator('.release-links [data-document]').click();
  684 |     await expect(page.locator('.markdown-preview h1')).toHaveText('Guide lisible');
  685 |     await expect(page.locator('.markdown-preview strong')).toHaveText('gras');
  686 |     await expect(page.locator('.markdown-preview table td')).toHaveCount(2);
  687 |     await expect(page.locator('.markdown-preview input')).toBeChecked();
  688 |     await expect(page.locator('.markdown-preview input')).toBeDisabled();
  689 |     await expect(page.locator('.markdown-preview script, .markdown-preview img, .markdown-preview button, .markdown-preview [href], .markdown-preview [data-action]')).toHaveCount(0);
  690 |     expect(await page.evaluate(() => window.INJECTED)).toBeUndefined();
  691 |     await page.screenshot({ path: 'test-results/markdown-preview.png' });
  692 |     await page.locator('.markdown-source summary').click();
  693 |     await expect(page.locator('.markdown-source pre')).toHaveText(source);
  694 |     await page.locator('[data-action="modal-close"]').click();
  695 |     await projectView(page, 'documents');
  696 |     await page.locator('[data-files="changelog"]').first().click();
  697 |     await page.locator(`[data-files="changelog/${releaseId}"]`).click();
  698 |     await page.locator(`[data-preview="changelog/${releaseId}/README.md"]`).click();
  699 |     await expect(page.locator('.markdown-preview h1')).toHaveText('Guide lisible');
  700 |     await page.locator('[data-action="modal-close"]').click();
  701 |     await projectTab(page, 'plan');
  702 |     await app.evaluate(({ ipcMain }) => {
  703 |       globalThis.savedProjectHandler = ipcMain._invokeHandlers.get('project');
  704 |       ipcMain.removeHandler('project'); ipcMain.handle('project', () => { throw new Error('synthetic project read failure'); });
  705 |     });
  706 |     await page.locator('#release-select').selectOption('');
```
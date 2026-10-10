# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: execution-interactions.spec.cjs >> terminal identifies another conversation and preserves the same PTY through navigation and agent exit
- Location: tests/execution-interactions.spec.cjs:181:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('.terminal-tab.active [data-session]')
Expected: "sleep · R1 — Demande synthétique"
Received: "Shell · Codex arrêté · R1 — Demande synthétique"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" locator('.terminal-tab.active [data-session]') with timeout 5000ms
  - waiting for locator('.terminal-tab.active [data-session]')
    14 × locator resolved to <button aria-pressed="true" data-session="098ff4f4f5d74065ac657bac4c1491fe" title="Shell · Codex arrêté · R1 — Demande synthétique" aria-label="Shell · Codex arrêté · R1 — Demande synthétique">…</button>
       - unexpected value "Shell · Codex arrêté · R1 — Demande synthétique"

```

```yaml
- button "Shell · Codex arrêté · R1 — Demande synthétique" [pressed]:
  - img "Shell"
  - text: Shell · Codex arrêté · R1 — Demande synthétique
```

# Test source

```ts
  116 |   await expect(card).toHaveAttribute('data-failed','true');
  117 |   await expect(card).toHaveAttribute('aria-label',/Échec/);
  118 |   await expect(card.locator('.pill')).toHaveText('Échec');
  119 | });
  120 | 
  121 | test('request menu keeps keyboard focus and a question draft while activity changes', async () => {
  122 |   const summary = page.locator('.request-selector > summary');
  123 |   await summary.click();
  124 |   await summary.focus();
  125 |   await call('conversation.add',{conversation:fixture.conversation,request:'R3 — Added independently'});
  126 |   await expect(summary).toContainText('3 demandes');
  127 |   await expect(summary).toBeFocused();
  128 |   const add = page.getByRole('button',{name:'Ajouter une demande…',exact:true});
  129 |   await add.focus();
  130 |   await call('conversation.add',{conversation:fixture.conversation,request:'R4 — Added independently'});
  131 |   await expect(summary).toContainText('4 demandes');
  132 |   await expect(add).toBeFocused();
  133 |   await page.keyboard.press('Escape');
  134 |   await expect(summary).toBeFocused();
  135 |   await page.getByRole('button',{name:'Détail',exact:true}).click();
  136 |   await page.getByLabel('Votre réponse').fill('Ma réponse en cours, à conserver.');
  137 |   await call('conversation.add',{conversation:fixture.conversation,request:'R5 — Added independently'});
  138 |   await expect(summary).toContainText('5 demandes');
  139 |   await expect(page.getByLabel('Votre réponse')).toHaveValue('Ma réponse en cours, à conserver.');
  140 |   await expect(page.getByLabel('Votre réponse')).toBeFocused();
  141 | });
  142 | 
  143 | test('search menu keeps its expanded state and keyboard focus when requests arrive', async () => {
  144 |   await page.locator('.request-selector > summary').click();
  145 |   const search = page.locator('.conversation-search-details > summary');
  146 |   await search.click();
  147 |   await expect(search).toBeFocused();
  148 |   await call('conversation.add',{conversation:fixture.conversation,request:'R3 — Added during search navigation'});
  149 |   await expect(page.locator('.request-selector > summary')).toContainText('3 demandes');
  150 |   await expect(search).toBeFocused();
  151 |   await expect(page.getByLabel('Rechercher une demande',{exact:true})).toBeVisible();
  152 | });
  153 | 
  154 | test('search draft survives polling and deferred request counts refresh after leaving the input', async () => {
  155 |   // Observe real polling replies: no workflow state or response is substituted.
  156 |   await app.evaluate(({ ipcMain }) => {
  157 |     const handler = ipcMain._invokeHandlers.get('studio:request');
  158 |     globalThis.__interactionSearchReplies = 0;
  159 |     ipcMain.removeHandler('studio:request');
  160 |     ipcMain.handle('studio:request', async (event,payload) => {
  161 |       const value = await handler(event,payload);
  162 |       if (payload.action==='conversation.get' && value.item_count===3) globalThis.__interactionSearchReplies++;
  163 |       return value;
  164 |     });
  165 |   });
  166 |   const summary = page.locator('.request-selector > summary');
  167 |   await summary.click();
  168 |   await page.locator('.conversation-search-details > summary').click();
  169 |   const query = page.getByLabel('Rechercher une demande',{exact:true});
  170 |   await query.fill('R3');
  171 |   await call('conversation.add',{conversation:fixture.conversation,request:'R3 — Added while typing'});
  172 |   await expect.poll(() => app.evaluate(() => globalThis.__interactionSearchReplies)).toBeGreaterThanOrEqual(2);
  173 |   await expect(query).toHaveValue('R3');
  174 |   await expect(query).toBeFocused();
  175 |   await summary.focus();
  176 |   await expect(summary).toContainText('3 demandes');
  177 |   await expect(query).toHaveValue('R3');
  178 |   await expect(page.locator('.work-items button')).toHaveCount(3);
  179 | });
  180 | 
  181 | test('terminal identifies another conversation and preserves the same PTY through navigation and agent exit', async () => {
  182 |   const terminals = () => page.evaluate(() => window.tricorder.terminals.list());
  183 |   expect(await terminals()).toHaveLength(0); // Opening the question does not launch an agent.
  184 |   await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  185 |   await expect(page.locator('.xterm-screen:visible')).toContainText('INERT REVIEW AGENT');
  186 |   const [first] = await terminals();
  187 |   await expect(page.locator('.terminal-scope')).toContainText('Conversation du workflow affiché');
  188 |   await openRun(fixture.second_run);
  189 |   await expect(page.locator('.terminal-scope')).toContainText('Autre conversation');
  190 |   expect(await terminals()).toHaveLength(1);
  191 |   await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  192 |   await expect.poll(async () => (await terminals()).length).toBe(2);
  193 |   await expect(page.locator('.terminal-scope')).toContainText('Conversation du workflow affiché');
  194 |   await openRun();
  195 |   // A known conversation now selects its existing terminal automatically.
  196 |   await expect(page.locator('.terminal-scope')).toContainText('Conversation du workflow affiché');
  197 |   await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  198 |   await expect(page.locator('.terminal-tab.active [data-session]')).toHaveAttribute('data-session',first.id);
  199 |   await page.getByRole('button',{name:'Détail',exact:true}).click();
  200 |   await page.getByRole('button',{name:'Graphe',exact:true}).click();
  201 |   const input=page.locator('.xterm-helper-textarea:visible');
  202 |   await input.focus();await page.keyboard.type('Message dans le terminal initial');await page.keyboard.press('Enter');
  203 |   await expect(page.locator('.xterm-screen:visible')).toContainText('INPUT:Message dans le terminal initial');
  204 |   const still = (await terminals()).find(s=>s.id===first.id);
  205 |   expect(still.pid).toBe(first.pid);
  206 |   expect(still.alive).toBe(true);
  207 |   await input.focus();await page.keyboard.type('exit');await page.keyboard.press('Enter');
  208 |   await expect.poll(async () => (await terminals()).find(s=>s.id===first.id)?.idleShell).toBe(true);
  209 |   await expect(page.locator('.terminal-tab.active')).toContainText('Shell · Codex arrêté');
  210 |   expect(await terminals()).toHaveLength(2);
  211 |   expect((await terminals()).find(s=>s.id===first.id).pid).toBe(first.pid);
  212 |   await input.focus();await page.keyboard.type('sleep 30');await page.keyboard.press('Enter');
  213 |   await expect.poll(async () => (await terminals()).find(s=>s.id===first.id)?.program).toBe('sleep');
  214 |   await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  215 |   // A remembered AI provider is not evidence that this foreground program is AI.
> 216 |   await expect(page.locator('.terminal-tab.active [data-session]')).toHaveText('sleep · R1 — Demande synthétique');
      |                                                                     ^ Error: expect(locator).toHaveText(expected) failed
  217 |   await input.focus();await page.keyboard.press('Control+C');
  218 |   await expect.poll(async () => (await terminals()).find(s=>s.id===first.id)?.idleShell).toBe(true);
  219 | });
  220 | 
  221 | test('a stopped conversation with a pending question resumes explicitly without losing requests or its terminal', async () => {
  222 |   const terminals = () => page.evaluate(() => window.tricorder.terminals.list());
  223 |   await page.getByRole('button', {name:'Retrouver la conversation',exact:true}).click();
  224 |   await expect(page.locator('.xterm-screen:visible')).toContainText('INERT REVIEW AGENT');
  225 |   const [first] = await terminals();
  226 |   const before = await call('conversation.get', {conversation:fixture.conversation});
  227 |   const input = page.locator('.xterm-helper-textarea:visible');
  228 |   await input.focus(); await page.keyboard.type('exit'); await page.keyboard.press('Enter');
  229 |   await expect.poll(async () => (await terminals()).find(s => s.id === first.id)?.idleShell).toBe(true);
  230 |   // The UI observes the broker every 5 s; the workflow then polls that cache.
  231 |   // Verify each visible observation without forcing a refresh or navigating.
  232 |   await expect(page.locator('.terminal-scope')).toContainText('Agent arrêté', {timeout:10000});
  233 |   await expect(page.locator('#execution-overview')).toContainText('Réponse attendue');
  234 |   const resume = page.locator('#conversation-tray').getByRole('button', {name:'Reprendre l’agent…',exact:true});
  235 |   await expect(resume).toBeVisible();
  236 |   await resume.click();
  237 |   await expect(page.getByRole('dialog')).toContainText('sans créer une seconde conversation');
  238 |   await page.getByRole('button', {name:'Revenir',exact:true}).click();
  239 |   expect((await terminals()).find(s => s.id === first.id).idleShell).toBe(true);
  240 |   expect(await terminals()).toHaveLength(1);
  241 |   await resume.click(); await page.getByRole('button', {name:'Reprendre dans ce terminal',exact:true}).click();
  242 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  243 |   await expect.poll(async () => (await terminals()).find(s => s.id === first.id)?.idleShell).toBe(false);
  244 |   await expect(page.locator('#conversation-tray')).not.toContainText('Agent arrêté');
  245 |   await input.focus(); await page.keyboard.type('Continuer la demande conservée'); await page.keyboard.press('Enter');
  246 |   await expect(page.locator('.xterm-screen:visible')).toContainText('INPUT:Continuer la demande conservée');
  247 |   const after = await call('conversation.get', {conversation:fixture.conversation});
  248 |   expect(after.items.map(i => [i.id,i.run,i.request])).toEqual(before.items.map(i => [i.id,i.run,i.request]));
  249 |   expect((await call('run.get', {run:fixture.run})).run.nodes.question.status).toBe('waiting_input');
  250 |   const [current] = await terminals(); expect(current.id).toBe(first.id); expect(current.pid).toBe(first.pid);
  251 |   expect(await terminals()).toHaveLength(1);
  252 |   await page.screenshot({path:test.info().outputPath('conversation-resumed-same-terminal.png')});
  253 | });
  254 | 
```
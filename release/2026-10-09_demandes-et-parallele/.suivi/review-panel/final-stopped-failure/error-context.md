# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: execution-interactions.spec.cjs >> a stopped conversation with a pending question resumes explicitly without losing requests or its terminal
- Location: tests/execution-interactions.spec.cjs:221:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#conversation-tray').getByRole('button', { name: 'Reprendre l’agent…', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('#conversation-tray').getByRole('button', { name: 'Reprendre l’agent…', exact: true }) with timeout 5000ms
  - waiting for locator('#conversation-tray').getByRole('button', { name: 'Reprendre l’agent…', exact: true })

```

```yaml
- complementary "Tricorder":
  - text: Tricorder
  - navigation "Navigation principale":
    - button "Activité"
    - button "Workflows"
    - button "Projets"
  - text: Accès rapide aux projets Rechercher un projet
  - searchbox "Rechercher un projet"
  - button "Interaction review"
  - navigation "Configuration":
    - button "Planifications"
    - button "Connexions"
  - button "Paramètres"
  - group: Outils et aide
- main:
  - text: Interaction review
  - button "Terminal 1" [pressed]
  - text: IA des prochains lancements
  - combobox "Fournisseur IA":
    - option "OpenAI · Codex" [selected]
    - option "Anthropic · Claude"
  - group "Thème de l’interface":
    - button "Thème clair"
    - button "Thème sombre"
    - button "Thème système" [pressed]
  - status: À jour
  - button "Actualiser · À jour"
  - strong: Terminal
  - button "Contexte"
  - button "Disposition verticale"
  - button "Agrandir le terminal"
  - button "Shell · Codex arrêté · R1 — Demande synthétique" [pressed]:
    - img "Shell"
    - text: Shell · Codex arrêté · R1 — Demande synthétique
  - button "Arrêter ce terminal"
  - button "Nouveau terminal"
  - button "Rechercher dans le terminal"
  - text: "Conversation du workflow affiché · Shell : Interaction review · Agent arrêté"
  - textbox "Terminal input"
  - separator "Taille du terminal"
  - main:
    - text: Suivi · Interaction review
    - heading "R1 — Demande synthétique" [level=1]
    - group: Options
    - group "Périmètre du suivi":
      - button "Vue d’ensemble"
      - button "Demande" [pressed]
    - tablist "Vues du workflow"
    - group: 2 demandes
    - paragraph: Aucune étape en cours · 2 questions
    - button "Retrouver la conversation": Terminal
    - region "État et prochaine action":
      - strong: Réponse attendue
      - text: 0 / 1 étapes
      - button "Répondre à la question"
      - paragraph: Préciser le besoin
    - group "Affichage du suivi":
      - button "Graphe" [pressed]
      - button "Détail"
    - button "Préciser le besoin · Réponse attendue": Préciser le besoin Question Réponse attendue 0 entrée → 1 sortie
    - text: 1 bloc · 0 lien
    - button "Réduire le graphe": −
    - text: 100 %
    - button "Agrandir le graphe": +
    - button "Ajuster"
```

# Test source

```ts
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
  216 |   await expect(page.locator('.terminal-tab.active [data-session]')).toHaveText('sleep · R1 — Demande synthétique');
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
  230 |   await expect(page.locator('#execution-overview')).toContainText('Réponse attendue');
  231 |   const resume = page.locator('#conversation-tray').getByRole('button', {name:'Reprendre l’agent…',exact:true});
> 232 |   await expect(resume).toBeVisible();
      |                        ^ Error: expect(locator).toBeVisible() failed
  233 |   await resume.click();
  234 |   await expect(page.getByRole('dialog')).toContainText('sans créer une seconde conversation');
  235 |   await page.getByRole('button', {name:'Revenir',exact:true}).click();
  236 |   expect((await terminals()).find(s => s.id === first.id).idleShell).toBe(true);
  237 |   expect(await terminals()).toHaveLength(1);
  238 |   await resume.click(); await page.getByRole('button', {name:'Reprendre dans ce terminal',exact:true}).click();
  239 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  240 |   await expect.poll(async () => (await terminals()).find(s => s.id === first.id)?.idleShell).toBe(false);
  241 |   await expect(page.locator('#conversation-tray')).not.toContainText('Agent arrêté');
  242 |   await input.focus(); await page.keyboard.type('Continuer la demande conservée'); await page.keyboard.press('Enter');
  243 |   await expect(page.locator('.xterm-screen:visible')).toContainText('INPUT:Continuer la demande conservée');
  244 |   const after = await call('conversation.get', {conversation:fixture.conversation});
  245 |   expect(after.items.map(i => [i.id,i.run,i.request])).toEqual(before.items.map(i => [i.id,i.run,i.request]));
  246 |   expect((await call('run.get', {run:fixture.run})).run.nodes.question.status).toBe('waiting_input');
  247 |   const [current] = await terminals(); expect(current.id).toBe(first.id); expect(current.pid).toBe(first.pid);
  248 |   expect(await terminals()).toHaveLength(1);
  249 |   await page.screenshot({path:test.info().outputPath('conversation-resumed-same-terminal.png')});
  250 | });
  251 | 
```
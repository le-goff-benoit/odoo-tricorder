# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: execution-interactions.spec.cjs >> a stopped conversation is explained and resumes explicitly without losing requests or its terminal
- Location: tests/execution-interactions.spec.cjs:220:1

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
    - button "Interaction review" [ref=e33] [cursor=pointer]
    - generic [ref=e35]:
      - navigation "Configuration" [ref=e36]:
        - button "Planifications" [ref=e37] [cursor=pointer]
        - button "Connexions" [ref=e41] [cursor=pointer]
      - button "Paramètres" [ref=e48] [cursor=pointer]
      - group [ref=e52]:
        - generic "Outils et aide" [ref=e53] [cursor=pointer]
  - main [ref=e54]:
    - generic [ref=e55]:
      - generic [ref=e56]: Interaction review
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
        - status [ref=e77]: À jour · 00:11
        - button "Actualiser · À jour · 00:11" [ref=e78] [cursor=pointer]
    - main [ref=e86]:
      - generic [ref=e87]:
        - generic [ref=e88]:
          - generic [ref=e89]:
            - generic [ref=e90]: Suivi · Interaction review
            - heading "R1 — Demande synthétique" [level=1] [ref=e91]
          - group [ref=e93]:
            - generic "Options" [ref=e94] [cursor=pointer]
        - group "Périmètre du suivi" [ref=e95]:
          - button "Vue d’ensemble" [ref=e96] [cursor=pointer]
          - button "Demande" [pressed] [ref=e97] [cursor=pointer]
        - tablist "Vues du workflow"
        - generic [ref=e98]:
          - group [ref=e99]:
            - generic "2 demandes" [ref=e100] [cursor=pointer]:
              - text: 2 demandes
              - generic [aria-hidden] [ref=e101]: ⌄
          - paragraph [ref=e102]: Aucune étape en cours · 2 questions
          - button "Voir le terminal" [ref=e103] [cursor=pointer]
        - region "État et prochaine action" [ref=e104]:
          - generic [ref=e105]:
            - generic [ref=e106]:
              - strong [ref=e107]: Réponse attendue
              - generic [ref=e108]: 0 / 1 étapes
            - button "Répondre à la question" [ref=e109] [cursor=pointer]
          - paragraph [ref=e110]: Préciser le besoin
        - group "Affichage du suivi" [ref=e112]:
          - button "Graphe" [pressed] [ref=e113] [cursor=pointer]
          - button "Détail" [ref=e114] [cursor=pointer]
        - generic [ref=e116]:
          - generic "Graphe du workflow" [ref=e117]:
            - button "Préciser le besoin · Réponse attendue" [ref=e120] [cursor=pointer]:
              - generic [ref=e123]:
                - generic [aria-hidden] [ref=e124]: "?"
                - generic [ref=e125]:
                  - generic "Préciser le besoin" [ref=e126]
                  - generic [ref=e127]: Question
              - generic [ref=e128]:
                - generic [ref=e129]: Réponse attendue
                - 'generic "Entrées : aucune · Sorties : answer" [ref=e130]': 0 entrée → 1 sortie
          - generic [ref=e131]:
            - generic [ref=e132]: 1 bloc · 0 lien
            - generic [ref=e133]:
              - button "Réduire le graphe" [ref=e134] [cursor=pointer]: −
              - generic [ref=e135]: 100 %
              - button "Agrandir le graphe" [ref=e136] [cursor=pointer]: +
              - button "Ajuster" [ref=e137] [cursor=pointer]
```

# Test source

```ts
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
  183 |   await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  184 |   await expect(page.locator('.xterm-screen:visible')).toContainText('INERT REVIEW AGENT');
  185 |   const [first] = await terminals();
  186 |   await expect(page.locator('.terminal-scope')).toContainText('Conversation du workflow affiché');
  187 |   await openRun(fixture.second_run);
  188 |   await expect(page.locator('.terminal-scope')).toContainText('Autre conversation');
  189 |   expect(await terminals()).toHaveLength(1);
  190 |   await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  191 |   await expect.poll(async () => (await terminals()).length).toBe(2);
  192 |   await expect(page.locator('.terminal-scope')).toContainText('Conversation du workflow affiché');
  193 |   await openRun();
  194 |   // A known conversation now selects its existing terminal automatically.
  195 |   await expect(page.locator('.terminal-scope')).toContainText('Conversation du workflow affiché');
  196 |   await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  197 |   await expect(page.locator('.terminal-tab.active [data-session]')).toHaveAttribute('data-session',first.id);
  198 |   await page.getByRole('button',{name:'Détail',exact:true}).click();
  199 |   await page.getByRole('button',{name:'Graphe',exact:true}).click();
  200 |   const input=page.locator('.xterm-helper-textarea:visible');
  201 |   await input.focus();await page.keyboard.type('Message dans le terminal initial');await page.keyboard.press('Enter');
  202 |   await expect(page.locator('.xterm-screen:visible')).toContainText('INPUT:Message dans le terminal initial');
  203 |   const still = (await terminals()).find(s=>s.id===first.id);
  204 |   expect(still.pid).toBe(first.pid);
  205 |   expect(still.alive).toBe(true);
  206 |   await input.focus();await page.keyboard.type('exit');await page.keyboard.press('Enter');
  207 |   await expect.poll(async () => (await terminals()).find(s=>s.id===first.id)?.idleShell).toBe(true);
  208 |   await expect(page.locator('.terminal-tab.active')).toContainText('Shell · Codex arrêté');
  209 |   expect(await terminals()).toHaveLength(2);
  210 |   expect((await terminals()).find(s=>s.id===first.id).pid).toBe(first.pid);
  211 |   await input.focus();await page.keyboard.type('sleep 30');await page.keyboard.press('Enter');
  212 |   await expect.poll(async () => (await terminals()).find(s=>s.id===first.id)?.program).toBe('sleep');
  213 |   await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
  214 |   // A remembered AI provider is not evidence that this foreground program is AI.
  215 |   await expect(page.locator('.terminal-tab.active [data-session]')).toHaveText('sleep · R1 — Demande synthétique');
  216 |   await input.focus();await page.keyboard.press('Control+C');
  217 |   await expect.poll(async () => (await terminals()).find(s=>s.id===first.id)?.idleShell).toBe(true);
  218 | });
  219 | 
  220 | test('a stopped conversation is explained and resumes explicitly without losing requests or its terminal', async () => {
  221 |   const terminals = () => page.evaluate(() => window.tricorder.terminals.list());
> 222 |   await page.getByRole('button', {name:'Retrouver la conversation',exact:true}).click();
      |                                                                                 ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  223 |   await expect(page.locator('.xterm-screen:visible')).toContainText('INERT REVIEW AGENT');
  224 |   const [first] = await terminals();
  225 |   const before = await call('conversation.get', {conversation:fixture.conversation});
  226 |   const input = page.locator('.xterm-helper-textarea:visible');
  227 |   await input.focus(); await page.keyboard.type('exit'); await page.keyboard.press('Enter');
  228 |   await expect.poll(async () => (await terminals()).find(s => s.id === first.id)?.idleShell).toBe(true);
  229 |   await expect(page.locator('#conversation-tray')).toContainText('Agent arrêté · progression conservée');
  230 |   const resume = page.locator('#conversation-tray').getByRole('button', {name:'Reprendre l’agent…',exact:true});
  231 |   await resume.click();
  232 |   await expect(page.getByRole('dialog')).toContainText('sans créer une seconde conversation');
  233 |   await page.getByRole('button', {name:'Revenir',exact:true}).click();
  234 |   expect((await terminals()).find(s => s.id === first.id).idleShell).toBe(true);
  235 |   expect(await terminals()).toHaveLength(1);
  236 |   await resume.click(); await page.getByRole('button', {name:'Reprendre dans ce terminal',exact:true}).click();
  237 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  238 |   await expect.poll(async () => (await terminals()).find(s => s.id === first.id)?.idleShell).toBe(false);
  239 |   await expect(page.locator('#conversation-tray')).not.toContainText('Agent arrêté');
  240 |   await input.focus(); await page.keyboard.type('Continuer la demande conservée'); await page.keyboard.press('Enter');
  241 |   await expect(page.locator('.xterm-screen:visible')).toContainText('INPUT:Continuer la demande conservée');
  242 |   const after = await call('conversation.get', {conversation:fixture.conversation});
  243 |   expect(after.items.map(i => [i.id,i.run,i.request])).toEqual(before.items.map(i => [i.id,i.run,i.request]));
  244 |   expect((await call('run.get', {run:fixture.run})).run.nodes.question.status).toBe('waiting_input');
  245 |   const [current] = await terminals(); expect(current.id).toBe(first.id); expect(current.pid).toBe(first.pid);
  246 |   expect(await terminals()).toHaveLength(1);
  247 |   await page.screenshot({path:test.info().outputPath('conversation-resumed-same-terminal.png')});
  248 | });
  249 | 
```
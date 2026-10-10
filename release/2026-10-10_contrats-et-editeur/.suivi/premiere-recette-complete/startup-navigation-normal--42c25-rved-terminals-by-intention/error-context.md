# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: startup-navigation.spec.cjs >> normal restart discovers generic work and names preserved terminals by intention
- Location: tests/startup-navigation.spec.cjs:71:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('#project-title')
Expected: "Activité"
Received: "Aucun projet"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" locator('#project-title') with timeout 5000ms
  - waiting for locator('#project-title')
    14 × locator resolved to <div role="heading" aria-level="1" id="project-title">Aucun projet</div>
       - unexpected value "Aucun projet"

```

```yaml
- heading "Aucun projet" [level=1]
```

# Test source

```ts
  1   | const { test, expect, _electron: electron } = require('@playwright/test');
  2   | const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  3   | const { execFileSync } = require('node:child_process');
  4   | const { cleanupBroker } = require('./terminal-fixture.cjs');
  5   | const root = path.resolve(__dirname, '..');
  6   | let directory, home, state, environment, app, page;
  7   | 
  8   | const seed = `
  9   | import json,sys
  10  | sys.path.insert(0,sys.argv[1])
  11  | from workflow_engine import Engine
  12  | from workflow_engine.conversations import Conversations
  13  | from workflow_engine.library import node
  14  | engine=Engine(sys.argv[2]);project=engine.create_project('Projet Atlas')
  15  | graph={'schema':1,'id':'compte-rendu','title':'Compte rendu','defaults':{'provider':'codex','model':'synthetic'},'nodes':[node('prepare','Préparer le compte rendu','task',validation='contract')],'edges':[]}
  16  | engine.save(project['id'],graph)
  17  | conversations=Conversations(engine)
  18  | values=[conversations.open(project['id'],graph,'codex',model='synthetic',initial_request=title) for title in ['Réunion achats : valider le budget','Réunion support : préparer la réponse']]
  19  | print(json.dumps({'project':project,'conversations':values}))
  20  | `;
  21  | 
  22  | async function launch() {
  23  |   app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE,
  24  |     args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env: environment });
  25  |   page = await app.firstWindow();
  26  |   await page.setViewportSize({ width: 1440, height: 900 });
  27  |   await expect(page.locator('#sync-status')).toContainText(/À jour|Workflows à vérifier/);
  28  | }
  29  | function seededConversations() {
  30  |   const backend = process.env.TRICORDER_EXECUTABLE ? path.join(path.dirname(process.env.TRICORDER_EXECUTABLE), 'resources/backend') : path.join(root, 'backend');
  31  |   return JSON.parse(execFileSync('/usr/bin/python3', ['-c', seed, backend, path.join(state, 'workflows')], { env: environment, encoding: 'utf8' }));
  32  | }
  33  | async function openConversation(fixture, index) {
  34  |   await page.locator('[data-workflow-route="projects"]').click();
  35  |   await page.locator('.project-card').filter({ hasText: 'Projet Atlas' }).click();
  36  |   await page.locator(`[data-action="open-conversation"][data-id="${fixture.conversations[index].id}"]`).click();
  37  |   await page.getByRole('button', { name: 'Retrouver la conversation', exact: true }).click();
  38  |   await expect(page.locator('.xterm-screen:visible')).toContainText('STARTUP INERT PROVIDER');
  39  | }
  40  | 
  41  | test.beforeEach(() => {
  42  |   directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-startup-ui-'));
  43  |   home = path.join(directory, 'home'); state = path.join(directory, 'state');
  44  |   fs.mkdirSync(home); const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  45  |   // Providers exist before the first broker starts; all account/config paths are isolated.
  46  |   for (const provider of ['codex', 'claude']) fs.writeFileSync(path.join(bin, provider), '#!/bin/sh\nprintf "STARTUP INERT PROVIDER\\n"\ncase "$1" in --version) exit 0;; esac\nwhile IFS= read -r line; do printf "NOTE: %s\\n" "$line"; done\n', { mode: 0o755 });
  47  |   environment = { ...process.env, PATH: bin + ':/usr/bin:/bin', HOME: home, SHELL: '/bin/bash',
  48  |     XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_CACHE_HOME: path.join(directory, 'cache'), XDG_DATA_HOME: path.join(directory, 'data'),
  49  |     CODEX_HOME: path.join(directory, 'codex'), CLAUDE_CONFIG_DIR: path.join(directory, 'claude'),
  50  |     TRICORDER_HOME: home, TRICORDER_STATE_DIR: state, TRICORDER_RUNTIME_DIR: path.join(directory, 'runtime'),
  51  |     TRICORDER_AGENTS_DIR: path.join(directory, 'absent-pack'), TRICORDER_TEST_MODE: '1', PYTHONDONTWRITEBYTECODE: '1' };
  52  |   for (const key of Object.keys(environment)) if (/^(OPENAI|ANTHROPIC|CLAUDE|CODEX).*(KEY|TOKEN|SECRET)$/.test(key)) delete environment[key];
  53  | });
  54  | test.afterEach(async () => {
  55  |   if (app) await app.close(); app = null;
  56  |   await cleanupBroker(path.join(directory, 'runtime/pty.sock'));
  57  |   fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  58  | });
  59  | 
  60  | test('normal first launch offers a new request without configuring a project', async () => {
  61  |   await launch();
  62  |   await expect(page.locator('[data-workflow-route="overview"]')).toHaveAttribute('aria-current', 'page');
  63  |   await expect(page.locator('#project-title')).toHaveText('Activité');
  64  |   await expect(page.getByRole('button', { name: 'Nouvelle demande', exact: true })).toBeVisible();
  65  |   await expect(page.locator('#tabs')).toBeHidden();
  66  |   await page.getByRole('button', { name: 'Nouvelle demande', exact: true }).click();
  67  |   await expect(page.getByRole('dialog')).toBeVisible();
  68  |   await expect(page.getByRole('dialog')).toContainText('Sans projet');
  69  | });
  70  | 
  71  | test('normal restart discovers generic work and names preserved terminals by intention', async () => {
  72  |   const fixture = seededConversations();
  73  |   await launch();
  74  |   await expect(page.locator('#project-title')).toHaveText('Activité');
  75  |   await expect(page.locator('#project-list')).toContainText('Projet Atlas');
  76  |   await openConversation(fixture, 0);
  77  |   await openConversation(fixture, 1);
  78  |   await expect(page.locator('#terminal-tabs [data-session]')).toHaveCount(2);
  79  |   await expect(page.locator('#terminal-tabs')).toContainText('Réunion achats : valider le budget');
  80  |   await expect(page.locator('#terminal-tabs')).toContainText('Réunion support : préparer la réponse');
  81  |   const before = (await page.evaluate(() => window.tricorder.terminals.list())).map(s => [s.id, s.pid]);
  82  |   await app.close(); app = null; await launch();
> 83  |   await expect(page.locator('#project-title')).toHaveText('Activité');
      |                                                ^ Error: expect(locator).toHaveText(expected) failed
  84  |   await expect(page.locator('#project-list')).toContainText('Projet Atlas');
  85  |   await openConversation(fixture, 0);
  86  |   await expect(page.locator('#terminal-tabs .active')).toContainText('Réunion achats : valider le budget');
  87  |   await expect(page.locator('#terminal-tabs')).toContainText('Réunion support : préparer la réponse');
  88  |   await expect(page.locator('#terminal-context')).toContainText('Conversation du workflow affiché');
  89  |   expect((await page.evaluate(() => window.tricorder.terminals.list())).map(s => [s.id, s.pid])).toEqual(before);
  90  |   await page.locator('#terminal-tabs [data-session]').filter({ hasText: 'Réunion support' }).click();
  91  |   await expect(page.locator('#terminal-context')).toContainText('Autre conversation');
  92  |   await expect(page.locator('#terminal-context')).toContainText('Réunion support : préparer la réponse');
  93  | });
  94  | 
  95  | test('existing project remains selectable and explicit workspace choice survives restart', async () => {
  96  |   const project = path.join(home, 'legacy-project');
  97  |   fs.mkdirSync(path.join(project, '.odoo-agents'), { recursive: true });
  98  |   fs.writeFileSync(path.join(project, '.odoo-agents/config'), 'series = 19.0\n');
  99  |   await launch();
  100 |   await expect(page.locator('#project-title')).toHaveText('legacy-project');
  101 |   await expect(page.locator('#tabs')).toBeVisible();
  102 |   await page.locator('[data-workflow-route="overview"]').click();
  103 |   await expect(page.locator('#project-title')).toHaveText('Activité');
  104 |   await app.close(); app = null; await launch();
  105 |   await expect(page.locator('#project-title')).toHaveText('Activité');
  106 |   // Project tools remain reachable without changing the already-open terminal context.
  107 |   const shortcut = page.locator('#project-list button').filter({ hasText: 'legacy-project' });
  108 |   const genericProject = await shortcut.getAttribute('data-workflow-project');
  109 |   await shortcut.click();
  110 |   if (genericProject) {
  111 |     await page.locator('.project-menu > summary').click();
  112 |     await page.getByRole('button', { name: 'Releases et suivi Odoo', exact: true }).click();
  113 |   }
  114 |   await expect(page.locator('#project-title')).toHaveText('legacy-project');
  115 |   await app.close(); app = null; await launch();
  116 |   await expect(page.locator('#project-title')).toHaveText('legacy-project');
  117 |   await expect(page.locator('#tabs')).toBeVisible();
  118 | });
  119 | 
```
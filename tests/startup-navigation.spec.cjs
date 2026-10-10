const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { cleanupBroker } = require('./terminal-fixture.cjs');
const root = path.resolve(__dirname, '..');
let directory, home, state, environment, app, page;

const seed = `
import json,sys
sys.path.insert(0,sys.argv[1])
from workflow_engine import Engine
from workflow_engine.conversations import Conversations
from workflow_engine.library import node
engine=Engine(sys.argv[2]);project=engine.create_project('Projet Atlas')
graph={'schema':1,'id':'compte-rendu','title':'Compte rendu','defaults':{'provider':'codex','model':'synthetic'},'nodes':[node('prepare','Préparer le compte rendu','task',validation='contract')],'edges':[]}
engine.save(project['id'],graph)
conversations=Conversations(engine)
values=[conversations.open(project['id'],graph,'codex',model='synthetic',initial_request=title) for title in ['Réunion achats : valider le budget','Réunion support : préparer la réponse']]
print(json.dumps({'project':project,'conversations':values}))
`;

async function launch() {
  app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE,
    args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env: environment });
  page = await app.firstWindow(); await page.evaluate(() => localStorage.setItem('tricorder-editor-detail','yes'));
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('#sync-status')).toContainText(/À jour|Workflows à vérifier/);
}
function seededConversations() {
  const backend = process.env.TRICORDER_EXECUTABLE ? path.join(path.dirname(process.env.TRICORDER_EXECUTABLE), 'resources/backend') : path.join(root, 'backend');
  return JSON.parse(execFileSync('/usr/bin/python3', ['-c', seed, backend, path.join(state, 'workflows')], { env: environment, encoding: 'utf8' }));
}
async function openConversation(fixture, index) {
  await page.locator('[data-workflow-route="projects"]').click();
  await page.locator('.project-card').filter({ hasText: 'Projet Atlas' }).click();
  await page.locator(`[data-action="open-conversation"][data-id="${fixture.conversations[index].id}"]`).click();
  await page.getByRole('button', { name: 'Retrouver la conversation', exact: true }).click();
  await expect(page.locator('.xterm-screen:visible')).toContainText('STARTUP INERT PROVIDER');
}

test.beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-startup-ui-'));
  home = path.join(directory, 'home'); state = path.join(directory, 'state');
  fs.mkdirSync(home); const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  // Providers exist before the first broker starts; all account/config paths are isolated.
  for (const provider of ['codex', 'claude']) fs.writeFileSync(path.join(bin, provider), '#!/bin/sh\nprintf "STARTUP INERT PROVIDER\\n"\ncase "$1" in --version) exit 0;; esac\nwhile IFS= read -r line; do printf "NOTE: %s\\n" "$line"; done\n', { mode: 0o755 });
  environment = { ...process.env, PATH: bin + ':/usr/bin:/bin', HOME: home, SHELL: '/bin/bash',
    XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_CACHE_HOME: path.join(directory, 'cache'), XDG_DATA_HOME: path.join(directory, 'data'),
    CODEX_HOME: path.join(directory, 'codex'), CLAUDE_CONFIG_DIR: path.join(directory, 'claude'),
    TRICORDER_HOME: home, TRICORDER_STATE_DIR: state, TRICORDER_RUNTIME_DIR: path.join(directory, 'runtime'),
    TRICORDER_AGENTS_DIR: path.join(directory, 'absent-pack'), TRICORDER_TEST_MODE: '1', PYTHONDONTWRITEBYTECODE: '1' };
  for (const key of Object.keys(environment)) if (/^(OPENAI|ANTHROPIC|CLAUDE|CODEX).*(KEY|TOKEN|SECRET)$/.test(key)) delete environment[key];
});
test.afterEach(async () => {
  if (app) await app.close(); app = null;
  await cleanupBroker(path.join(directory, 'runtime/pty.sock'));
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test('normal first launch offers a new request without configuring a project', async () => {
  await launch();
  await expect(page.locator('[data-workflow-route="overview"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#project-title')).toHaveText('Activité');
  await expect(page.getByRole('button', { name: 'Nouvelle demande', exact: true })).toBeVisible();
  await expect(page.locator('#tabs')).toBeHidden();
  await page.getByRole('button', { name: 'Nouvelle demande', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Sans projet');
});

test('normal restart discovers generic work and names preserved terminals by intention', async () => {
  const fixture = seededConversations();
  await launch();
  await expect(page.locator('#project-title')).toHaveText('Activité');
  await expect(page.locator('#project-list')).toContainText('Projet Atlas');
  await openConversation(fixture, 0);
  await openConversation(fixture, 1);
  await expect(page.locator('#terminal-tabs [data-session]')).toHaveCount(2);
  await expect(page.locator('#terminal-tabs')).toContainText('Réunion achats : valider le budget');
  await expect(page.locator('#terminal-tabs')).toContainText('Réunion support : préparer la réponse');
  const before = (await page.evaluate(() => window.tricorder.terminals.list())).map(s => [s.id, s.pid]);
  await app.close(); app = null; await launch();
  await expect(page.locator('#project-title')).toHaveText('Activité');
  await expect(page.locator('#project-list')).toContainText('Projet Atlas');
  await openConversation(fixture, 0);
  await expect(page.locator('#terminal-tabs .active')).toContainText('Réunion achats : valider le budget');
  await expect(page.locator('#terminal-tabs')).toContainText('Réunion support : préparer la réponse');
  await expect(page.locator('#terminal-context')).toContainText('Conversation du workflow affiché');
  expect((await page.evaluate(() => window.tricorder.terminals.list())).map(s => [s.id, s.pid])).toEqual(before);
  await page.locator('#terminal-tabs [data-session]').filter({ hasText: 'Réunion support' }).click();
  await expect(page.locator('#terminal-context')).toContainText('Autre conversation');
  await expect(page.locator('#terminal-context')).toContainText('Réunion support : préparer la réponse');
});

test('existing project remains selectable and explicit workspace choice survives restart', async () => {
  const project = path.join(home, 'legacy-project');
  fs.mkdirSync(path.join(project, '.odoo-agents'), { recursive: true });
  fs.writeFileSync(path.join(project, '.odoo-agents/config'), 'series = 19.0\n');
  await launch();
  await expect(page.locator('#project-title')).toHaveText('legacy-project');
  await expect(page.locator('#tabs')).toBeVisible();
  await page.locator('[data-workflow-route="overview"]').click();
  await expect(page.locator('#project-title')).toHaveText('Activité');
  await app.close(); app = null; await launch();
  await expect(page.locator('#project-title')).toHaveText('Activité');
  // Project tools remain reachable without changing the already-open terminal context.
  const shortcut = page.locator('#project-list button').filter({ hasText: 'legacy-project' });
  const genericProject = await shortcut.getAttribute('data-workflow-project');
  await shortcut.click();
  if (genericProject) {
    await page.locator('.project-menu > summary').click();
    await page.getByRole('button', { name: 'Releases et suivi Odoo', exact: true }).click();
  }
  await expect(page.locator('#project-title')).toHaveText('legacy-project');
  await app.close(); app = null; await launch();
  await expect(page.locator('#project-title')).toHaveText('legacy-project');
  await expect(page.locator('#tabs')).toBeVisible();
});

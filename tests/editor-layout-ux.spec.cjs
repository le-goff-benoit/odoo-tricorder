const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { cleanupBroker } = require('./terminal-fixture.cjs');
const root = path.resolve(__dirname, '..');
let directory, app, page, project;
const call = (action, data = {}) => page.evaluate(payload => window.studio.request(payload), { action, ...data });
async function size(width, height, zoom = 1) {
  await app.evaluate(({ BrowserWindow }, value) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.setContentSize(value.width, value.height); window.webContents.setZoomFactor(value.zoom);
  }, { width, height, zoom });
  await expect.poll(() => page.evaluate(() => ({ width: innerWidth, height: innerHeight }))).toEqual({ width: Math.round(width / zoom), height: Math.round(height / zoom) });
}
async function capture(name) {
  await expect(page.locator('.flash')).toBeHidden({ timeout: 8000 });
  await page.evaluate(async () => {
    const roots = [document, ...[...document.querySelectorAll('*')].map(element => element.shadowRoot).filter(Boolean)];
    await Promise.all(roots.flatMap(root => root.getAnimations()).map(animation => animation.finished.catch(() => {})));
  });
  // Native capture preserves the full content area at Electron zoom 125%.
  const png = await app.evaluate(async ({ BrowserWindow }) => (await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));
  fs.writeFileSync(test.info().outputPath(name), Buffer.from(png, 'base64'));
}
async function openEditor() {
  await page.locator('[data-workflow-route=global]').click();await page.locator('[data-action=registered-workflows]').click();
  await page.locator('[data-action=open-workflow][data-id=layout-guide]').click();
  await expect(page.locator('.workflow-heading h1')).toHaveText('Relecture du guide');
}
test.beforeEach(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-editor-layout-'));
  const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  for (const provider of ['codex', 'claude']) fs.writeFileSync(path.join(bin, provider), '#!/bin/sh\nprintf "EDITOR_LAYOUT_INERT\\n"\nexit 78\n', { mode: 0o755 });
  const env = { PATH: bin + ':/usr/bin:/bin', HOME: directory, DISPLAY: process.env.DISPLAY, XAUTHORITY: process.env.XAUTHORITY, LANG: 'C.UTF-8',
    XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_CACHE_HOME: path.join(directory, 'cache'), XDG_DATA_HOME: path.join(directory, 'data'),
    CODEX_HOME: path.join(directory, 'codex'), CLAUDE_CONFIG_DIR: path.join(directory, 'claude'), TRICORDER_HOME: directory,
    TRICORDER_STATE_DIR: directory, TRICORDER_RUNTIME_DIR: path.join(directory, 'runtime'), TRICORDER_AGENTS_DIR: path.join(directory, 'no-pack'), TRICORDER_TEST_MODE: '1', PYTHONDONTWRITEBYTECODE: '1' };
  app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env });
  page = await app.firstWindow(); await page.evaluate(() => localStorage.setItem('tricorder-editor-detail','yes')); await size(1440, 1000);
  await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
  await page.locator('[data-action=terminal-toggle]').click(); await page.getByRole('button', { name: 'Ouvrir un terminal', exact: true }).click();
  await page.locator('.xterm-helper-textarea:visible').focus();
  await page.keyboard.type('command -v codex; codex --version; command -v claude; claude --version'); await page.keyboard.press('Enter');
  await expect(page.locator('.xterm-screen:visible')).toContainText(path.join(bin, 'claude'));
  await expect(page.locator('.xterm-screen:visible')).toContainText('EDITOR_LAYOUT_INERT');
  await page.locator('[data-action=terminal-toggle]').click();
  project = await call('project.create', { title: 'Documentation partagée — guides internes' });
  await call('workflow.save', { project: project.id, graph: { schema: 1, id: 'layout-guide', title: 'Relecture du guide', nodes: [
    { id: 'draft', kind: 'task', title: 'Préparer le texte', prompt: 'Préparer le guide fictif.', criteria: ['Tous les sujets sont couverts.'], outputs: { texte: 'string' }, position: { x: 45, y: 45 } },
    { id: 'review', kind: 'decision', title: 'Valider le guide', inputs: { texte: 'string' }, options: ['approve', 'reject'], position: { x: 365, y: 45 } },
  ], edges: [{ id: 'draft-review', from: 'draft', to: 'review', mapping: { texte: 'texte' } }] } });
  await openEditor();
});
test.afterEach(async () => {
  if (app) await app.close();
  for (const socket of ['cockpit/odoo-tricorder/pty.sock', 'studio-pty.sock', 'runtime/pty.sock']) await cleanupBroker(path.join(directory, socket));
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test('design opens at readable scale and compact properties use the panel without losing edits on resize', async () => {
  await expect(page.locator('#zoom-label')).toHaveText('100 %');
  const typography = await page.locator('.node[data-id=draft]').evaluate(node => ({
    scale: new DOMMatrix(getComputedStyle(node.closest('.canvas')).transform).a,
    title: parseFloat(getComputedStyle(node.querySelector('.mission')).fontSize),
    metadata: parseFloat(getComputedStyle(node.querySelector('.kind')).fontSize),
    taskLabels: node.textContent.match(/Tâche/g)?.length,
  }));
  expect(typography.scale).toBe(1); expect(typography.title).toBeGreaterThanOrEqual(13); expect(typography.metadata).toBeGreaterThanOrEqual(12); expect(typography.taskLabels).toBe(1);
  await page.locator('.node[data-id=draft]').click(); await expect(page.locator('.canvas-area')).toBeVisible();
  const prompt = page.getByLabel('Consigne', { exact: true }); await prompt.fill('Texte conservé en passant du bureau à une petite fenêtre.');
  const originalField = await prompt.elementHandle();
  await size(1024, 800, 1.25);
  expect(await originalField.evaluate(element => element.isConnected)).toBe(true);
  await expect(prompt).toHaveValue('Texte conservé en passant du bureau à une petite fenêtre.');
  await expect(page.locator('.canvas-area')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Retour au graphe', exact: true })).toBeVisible();
  const scroll = page.locator('.design-inspector-scroll');
  const geometry = await scroll.evaluate(element => ({ height: element.clientHeight, content: element.scrollHeight, overflow: getComputedStyle(element).overflowY }));
  expect(geometry.height).toBeGreaterThan(350); expect(geometry.overflow).toBe('auto');
  await scroll.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(page.getByRole('button', { name: 'Retour au graphe', exact: true })).toBeInViewport({ ratio: 1 });
  const apply = page.getByRole('button', { name: 'Appliquer au bloc', exact: true }); await expect(apply).toBeInViewport({ ratio: 1 });
  expect(await page.locator('#workflow-panel').evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  fs.writeFileSync(test.info().outputPath('compact-properties-geometry.json'), JSON.stringify(geometry, null, 2));
  await capture('properties-819x640-light.png');
  await apply.click(); await expect(apply).toBeFocused();
  const back = page.getByRole('button', { name: 'Retour au graphe', exact: true }); await back.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.node[data-id=draft]')).toBeFocused(); await expect(page.locator('.canvas-area')).toBeVisible();
  await page.locator('.node[data-id=draft]').click(); await expect(page.locator('.canvas-area')).toBeHidden(); await expect(prompt).toHaveValue('Texte conservé en passant du bureau à une petite fenêtre.');
  await page.locator('[data-theme-choice=dark]').click();
  await capture('properties-819x640-dark.png');
  await size(1440, 1000); await expect(page.locator('.canvas-area')).toBeVisible();
  await expect(prompt).toHaveValue('Texte conservé en passant du bureau à une petite fenêtre.');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click(); await expect(page.locator('.workflow-heading p')).toContainText('Enregistré');
  expect((await call('workflow.get', { project: project.id, workflow: 'layout-guide' })).nodes.find(node => node.id === 'draft').prompt).toBe('Texte conservé en passant du bureau à une petite fenêtre.');
});

test('compact editing retains the live terminal and shows full sidebar project names on pointer and keyboard focus', async () => {
  const before = (await page.evaluate(() => window.tricorder.terminals.list())).filter(session => session.alive);
  expect(before).toHaveLength(1);
  await page.locator('.node[data-id=draft]').click(); await page.getByLabel('Consigne', { exact: true }).fill('Brouillon à garder pendant le dialogue terminal.');
  await size(1024, 800, 1.25);
  await page.locator('[data-action=terminal-toggle]').click(); await expect(page.locator('.xterm-screen:visible')).toBeVisible();
  await page.locator('.xterm-helper-textarea:visible').focus(); await page.keyboard.type('printf "TERMINAL_STILL_AVAILABLE\\n"'); await page.keyboard.press('Enter');
  await expect(page.locator('.xterm-screen:visible')).toContainText('TERMINAL_STILL_AVAILABLE');
  await expect(page.getByLabel('Consigne', { exact: true })).toHaveValue('Brouillon à garder pendant le dialogue terminal.');
  await expect(page.getByRole('button', { name: 'Appliquer au bloc', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Retour au graphe', exact: true })).toBeInViewport({ ratio: 1 });
  const after = (await page.evaluate(() => window.tricorder.terminals.list())).filter(session => session.alive);
  expect(after.map(session => [session.id, session.pid])).toEqual(before.map(session => [session.id, session.pid]));
  const shortcut = page.locator(`.project-item[data-workflow-project="${project.id}"]`), label = shortcut.locator('.project-name');
  await expect(shortcut).toHaveAttribute('title', new RegExp(project.title)); await expect(shortcut).toHaveAccessibleName(project.title);
  await shortcut.hover();
  expect(await label.evaluate(element => ({ overflow: element.scrollWidth > element.clientWidth + 1, whiteSpace: getComputedStyle(element).whiteSpace }))).toEqual({ overflow: false, whiteSpace: 'normal' });
  await page.mouse.move(800, 20); await shortcut.focus();
  await expect(shortcut).toBeFocused(); expect(await label.evaluate(element => getComputedStyle(element).whiteSpace)).toBe('normal');
  await capture('properties-terminal-sidebar-keyboard.png');
});

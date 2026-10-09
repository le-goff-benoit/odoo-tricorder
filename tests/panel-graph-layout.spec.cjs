const { test, expect, _electron: electron } = require('@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { cleanupBroker } = require('./terminal-fixture.cjs');
const root = path.resolve(__dirname, '..');
let directory, app, page, project, pageErrors;
const call = (action, data = {}) => page.evaluate(payload => window.studio.request(payload), { action, ...data });
const snapshot = id => call('workflow.get', { project: project.id, workflow: id });
async function openEditor(id) {
  await page.locator('[data-workflow-route=global]').click();
  await page.locator(`[data-action=open-workflow][data-id="${id}"]`).click();
  await expect(page.locator('.canvas .node').first()).toBeVisible();
}
async function positions() {
  return page.locator('.canvas .node[data-id]').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.dataset.id, { x: node.offsetLeft, y: node.offsetTop }])));
}
async function measureDiagram() {
  return page.locator('.canvas').evaluate(canvas => {
    const box = element => { const { x, y, width, height } = element.getBoundingClientRect(); return { x, y, width, height }; };
    const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    const nodes = [...canvas.querySelectorAll('.node')].map(node => ({ id: node.dataset.id, ...box(node) }));
    const labels = [...canvas.querySelectorAll('.edge-label-background')].map(box);
    const labelAboveWires = [...canvas.querySelectorAll('.graph-link')].every(wire => [...canvas.querySelectorAll('.graph-label')].every(label => Boolean(wire.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING)));
    const collisions = labels.flatMap((label, i) => [...nodes.filter(node => overlaps(label, node)).map(node => `label${i}/${node.id}`), ...labels.slice(i + 1).filter(other => overlaps(label, other)).map(() => 'labels')]);
    const overflows = [...canvas.querySelectorAll('.node')].flatMap(node => [...node.querySelectorAll('.mission,.kind,.node-footer > span')].filter(part => {
      const child = box(part), parent = box(node);
      return child.x < parent.x - 1 || child.x + child.width > parent.x + parent.width + 1 || child.y + child.height > parent.y + parent.height + 1 || part.scrollWidth > part.clientWidth + 1;
    }).map(part => `${node.dataset.id}: ${part.textContent}`));
    return { collisions, overflows, labelAboveWires, labels: labels.length, scale: new DOMMatrix(getComputedStyle(canvas).transform).a };
  });
}
test.beforeEach(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-panel-graph-'));
  const bin = path.join(directory, 'bin'); fs.mkdirSync(bin);
  for (const provider of ['codex', 'claude']) fs.writeFileSync(path.join(bin, provider), '#!/bin/sh\nprintf "TRICORDER-PANEL-INERT-GRAPH\\n"\nexit 78\n', { mode: 0o755 });
  const env = { PATH: bin + ':/usr/bin:/bin', HOME: directory, DISPLAY: process.env.DISPLAY, XAUTHORITY: process.env.XAUTHORITY, LANG: 'C.UTF-8',
    XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_CACHE_HOME: path.join(directory, 'cache'), XDG_DATA_HOME: path.join(directory, 'data'),
    CODEX_HOME: path.join(directory, 'codex'), CLAUDE_CONFIG_DIR: path.join(directory, 'claude'), TRICORDER_HOME: directory,
    TRICORDER_STATE_DIR: directory, TRICORDER_RUNTIME_DIR: path.join(directory, 'runtime'), TRICORDER_AGENTS_DIR: path.join(directory, 'no-pack'), TRICORDER_TEST_MODE: '1', PYTHONDONTWRITEBYTECODE: '1' };
  app = await electron.launch({ executablePath: process.env.TRICORDER_EXECUTABLE, args: process.env.TRICORDER_EXECUTABLE ? [] : [root], env });
  page = await app.firstWindow(); pageErrors = []; page.on('pageerror', error => pageErrors.push(error.message)); await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
  await page.locator('[data-action=terminal-toggle]').click();
  await page.getByRole('button', { name: 'Ouvrir un terminal', exact: true }).click();
  await page.locator('.xterm-helper-textarea:visible').focus();
  await page.keyboard.type('command -v codex; codex --version; command -v claude; claude --version'); await page.keyboard.press('Enter');
  await expect(page.locator('.xterm-screen:visible')).toContainText(path.join(bin, 'claude'));
  await expect(page.locator('.xterm-screen:visible')).toContainText('TRICORDER-PANEL-INERT-GRAPH');
  await page.locator('[data-action=terminal-toggle]').click();
  project = await call('project.create', { title: 'Atelier synthétique des graphes' });
});
test.afterEach(async () => {
  if (app) await app.close();
  for (const socket of ['cockpit/odoo-tricorder/pty.sock', 'studio-pty.sock', 'runtime/pty.sock']) await cleanupBroker(path.join(directory, socket));
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test('saved inline alternatives remain intact until explicit organization, with undo and link correction by mouse and keyboard', async () => {
  await call('workflow.save', { project: project.id, graph: { schema: 1, id: 'panel-design', title: 'Qualification synthétique', nodes: [
    { id: 'collect', kind: 'task', title: 'Qualifier la demande', outputs: { priorite: 'string' }, position: { x: 40, y: 60 } },
    { id: 'condition', kind: 'condition', title: 'Priorité urgente ?', inputs: { priorite: 'string' }, parameter: 'priorite', options: ['normale', 'urgente'], position: { x: 340, y: 60 } },
    { id: 'normal', kind: 'task', title: 'Préparer la réponse normale', position: { x: 640, y: 60 } },
    { id: 'urgent', kind: 'task', title: 'Préparer la réponse urgente', position: { x: 940, y: 60 } },
  ], edges: [
    { id: 'priority', from: 'collect', to: 'condition', mapping: { priorite: 'priorite' } },
    { id: 'normal', from: 'condition', to: 'normal', outcome: 'normale' },
    { id: 'urgent', from: 'condition', to: 'urgent', outcome: 'urgente' },
  ] } });
  const original = await snapshot('panel-design'); await openEditor('panel-design');
  const initial = await positions(); expect(initial.urgent).toEqual({ x: 940, y: 60 });
  expect((await measureDiagram()).collisions).toEqual([]);
  await page.getByRole('button', { name: 'Réorganiser le graphe', exact: true }).click();
  await expect(page.locator('#zoom-label')).toHaveText('100 %');
  const arranged = await positions(); expect(arranged.normal.x).toBe(arranged.urgent.x); expect(arranged.normal.y).not.toBe(arranged.urgent.y);
  expect((await measureDiagram()).collisions).toEqual([]); expect((await measureDiagram()).overflows).toEqual([]);
  await page.getByRole('button', { name: 'Annuler la modification', exact: true }).click(); expect(await positions()).toEqual(initial);
  await page.getByRole('button', { name: 'Rétablir la modification', exact: true }).click(); expect(await positions()).toEqual(arranged);
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await openEditor('panel-design'); expect(await positions()).toEqual(arranged);
  const saved = await snapshot('panel-design');
  expect(saved.edges).toEqual(original.edges);
  expect(saved.nodes.map(({ position, ...node }) => node)).toEqual(original.nodes.map(({ position, ...node }) => node));
  const link = page.locator('g.graph-link[data-edge=urgent]');
  await page.locator('.graph-label[data-edge=urgent] text').click(); await expect(page.getByRole('dialog')).toContainText('Priorité urgente ? → Préparer la réponse urgente');
  await page.getByRole('button', { name: 'Conserver le lien', exact: true }).click();
  await link.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toContainText('retirez ce lien puis utilisez « Relier »');
  await page.getByRole('button', { name: 'Retirer ce lien…', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Supprimer ce lien');
  await page.getByRole('button', { name: 'Supprimer le lien', exact: true }).click();
  await expect(page.locator('g.graph-link[data-edge=urgent]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Annuler la modification', exact: true }).click();
  await expect(page.locator('g.graph-link[data-edge=urgent]')).toHaveCount(1);
  await page.locator('.canvas-scroll').evaluate(element => { element.scrollLeft = 0; });
  await expect(page.locator('.flash')).toBeHidden({ timeout: 8000 });
  await page.screenshot({ path: test.info().outputPath('editor-branches-readable-100.png') });
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  expect(pageErrors).toEqual([]);
});

test('Support branches and joins stay readable beside the terminal with native status and ports inside cards', async () => {
  const bootstrap = await call('bootstrap');
  const support = bootstrap.templates.find(graph => graph.id === 'support-conversation');
  expect(support).toBeTruthy();
  const graph = await call('workflow.save', { project: project.id, graph: { ...support, id: 'panel-support' } });
  const original = await snapshot(graph.id);
  // Fixture setup uses the validated engine API; no provider is launched.
  const conversation = await call('conversation.open', { project: project.id, graph, provider: 'codex', request: 'Ticket fictif : téléchargement indisponible.' });
  const before = await call('conversation.get', { conversation: conversation.id });
  await page.locator('[data-workflow-route=projects]').click();
  await page.locator('.project-card').filter({ hasText: project.title }).click();
  await page.locator(`[data-action=open-conversation][data-id="${conversation.id}"]`).click();
  await page.locator('[data-action=terminal-toggle]').click();
  await expect(page.locator('.execution-map .node[data-id=diagnosis] .pill')).toHaveText('Dans la conversation');
  await expect(page.locator('#zoom-label')).toHaveText('100 %');
  let geometry = await measureDiagram(); expect(geometry.collisions).toEqual([]); expect(geometry.overflows).toEqual([]); expect(geometry.labelAboveWires).toBe(true); expect(geometry.scale).toBe(1); expect(geometry.labels).toBe(7);
  await page.screenshot({ path: test.info().outputPath('support-terminal-upper-1440.png') });
  await page.locator('.canvas-scroll').evaluate(element => { element.scrollTop = element.scrollHeight; element.scrollLeft = 0; });
  await page.screenshot({ path: test.info().outputPath('support-joins-1440.png') });
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.getByRole('button', { name: 'Ajuster', exact: true }).click();
  geometry = await measureDiagram(); expect(geometry.collisions).toEqual([]); expect(geometry.overflows).toEqual([]); expect(geometry.labelAboveWires).toBe(true); expect(geometry.scale).toBe(1);
  expect(await snapshot(graph.id)).toEqual(original);
  expect((await call('conversation.get', { conversation: conversation.id })).items).toEqual(before.items);
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  expect(pageErrors).toEqual([]);
});

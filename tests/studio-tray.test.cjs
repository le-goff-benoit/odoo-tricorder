const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarize, menuItems, trayBitmap } = require('../electron/studio-tray.cjs');
const run = { id: 'r1', project: 'p1', project_title: 'Projet', release: 'R2026', definition: { title: 'Workflow' }, status: 'active', simulation: true, nodes: { a: { status: 'waiting' }, b: { status: 'returned' } } };
test('tray distinguishes human wait, result review and running; menu opens exact run', () => {
  const summary = summarize([run]); assert.equal(summary.waiting, 1); assert.equal(summary.running, 0); assert.equal(summary.severity, 'waiting');
  let destination;
  const items = menuItems([run], value => { destination = value; }, () => {}, () => {});
  const item = items.find(i => i.label?.includes('R2026')); assert.match(item.label, /Simulation/); item.click();
  assert.deepEqual(destination, { route: 'run', run: 'r1', project: 'p1' });
  assert.match(menuItems([run], () => {}, () => {}, () => {}, false)[1].label, /inconnue/);
});
test('tray icon is visible and changes when attention is needed', () => {
  const idle = trayBitmap('idle'), waiting = trayBitmap('waiting');
  assert.equal(idle.buffer.length, 24 * 24 * 4); assert.notDeepEqual(idle.buffer, waiting.buffer);
  assert.ok(idle.buffer.some(byte => byte > 0));
});

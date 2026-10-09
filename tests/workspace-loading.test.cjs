const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workspaceLoader } = require('../electron/workspace-window.cjs');

test('simultaneous navigation waits for a single renderer load without replacing it', async () => {
  let calls = 0, resolve;
  const pending = new Promise(done => { resolve = done; });
  const load = workspaceLoader({ loadURL(url) { assert.equal(url, 'tricorder://app/'); calls++; return pending; } });
  let delivered = 0;
  const first = load().then(() => delivered++);
  const second = load().then(() => delivered++);
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(delivered, 0);
  resolve();
  await Promise.all([first, second]);
  assert.equal(delivered, 2);
  await load();
  assert.equal(calls, 1);
});

test('a failed renderer load is reported to each caller and permits a later retry', async () => {
  let calls = 0;
  const load = workspaceLoader({ loadURL() { calls++; return calls === 1 ? Promise.reject(new Error('ERR_FAILED')) : Promise.resolve(); } });
  const settled = await Promise.allSettled([load(), load()]);
  assert.equal(calls, 1);
  assert.ok(settled.every(value => value.status === 'rejected' && value.reason.message === 'ERR_FAILED'));
  await load();
  assert.equal(calls, 2);
});

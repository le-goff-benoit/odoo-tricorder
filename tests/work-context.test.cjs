const { test } = require('node:test');
const assert = require('node:assert/strict');
const modulePromise = import('../src/work-context.mjs');
const state = () => ({ current: '/project', view: 'terminal', selectedSession: new Map([['/project', 'shell']]),
  sessions: [{ id: 'shell', project: '/project', release: null, alive: true }],
  detail: { selectedRelease: null, releases: [], tasks: [], flows: [], effort: null } });

test('an open terminal alone never claims an agent is working', async () => {
  const { workStatus } = await modulePromise;
  assert.equal(workStatus(state()).kind, 'idle');
});
test('consulting another release does not relabel the terminal activity', async () => {
  const { workStatus } = await modulePromise;
  const s = state(); s.detail.selectedRelease = 'new';
  assert.equal(workStatus(s).kind, 'different');
  assert.equal(workStatus(s).text, 'hors release');
});
test('stale traces are not live work and claims remain only assignments', async () => {
  const { workStatus } = await modulePromise;
  const s = state();
  const observations = [{ project: s.current, release: null, agents: [{ state: 'active', stale: true }] }];
  assert.equal(workStatus(s, observations).kind, 'idle');
  s.detail.flows = [{ nodes: [{ status: 'claimed', description: 'Revue', owner: 'Codex' }] }];
  assert.equal(workStatus(s, observations).kind, 'assigned');
});
test('waiting, project preparation and unknown task scope stay explicit', async () => {
  const { workStatus } = await modulePromise;
  const s = state(); s.detail.effort = { rows: [{ phase: 'preparation', timeState: 'running' }] };
  assert.equal(workStatus(s).kind, 'preparation');
  const value = workStatus(s, [{ project: s.current, provider: 'codex', task: 'unknown', agents: [{ state: 'waiting_human', stale: false }] }]);
  assert.equal(value.kind, 'waiting');
  assert.match(value.text, /Tâche non retrouvée/);
});

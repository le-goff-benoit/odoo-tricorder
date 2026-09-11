const test = require('node:test');
const assert = require('node:assert/strict');
const { sessionContext, saveContext } = require('../electron/terminal-context.cjs');
const load = () => import('../src/release-context.mjs');
const before = [{ id: 'old', status: 'close' }];
const after = [...before, { id: 'new', status: 'ouverte' }];
const session = { id: 's', project: '/p', alive: true, pid: 456, release: null, task: null };

test('new unique open release adopts one unscoped or closed-release terminal', async () => {
  const { newReleaseContext: plan } = await load();
  assert.equal(plan(before, after, null, [session], '/p').session.id, 's');
  assert.equal(plan(before, after, null, [{ ...session, release: 'old' }], '/p').release, 'new');
  assert.equal(plan(before, after, 'old', [session], '/p'), null);
});
test('no first-scan adoption, reopening, closed addition, or multiple new releases', async () => {
  const { newReleaseContext: plan } = await load();
  assert.equal(plan(null, after, null, [session], '/p'), null);
  assert.equal(plan(before, [{ id: 'old', status: 'ouverte' }], null, [session], '/p'), null);
  assert.equal(plan(before, [...before, { id: 'new', status: 'close' }], null, [session], '/p'), null);
  assert.equal(plan(before, [...after, { id: 'other', status: 'ouverte' }], null, [session], '/p'), null);
});
test('express, other projects, live releases and ambiguity never guess a terminal', async () => {
  const { newReleaseContext: plan } = await load();
  for (const candidate of [{ ...session, scopeMode: 'express' }, { ...session, alive: false },
    { ...session, project: '/other' }, { ...session, release: 'ongoing' }])
    assert.equal(plan(before, after, null, [candidate], '/p').session, null);
  const result = plan(before, after, null, [session, { ...session, id: 's2' }], '/p');
  assert.equal(result.session, null); assert.equal(result.ambiguous, true);
});
test('context survives settings serialization, never mutates broker metadata or process', () => {
  const settings = {}, original = structuredClone(session);
  const changed = saveContext(settings, session, 'new', 'T01');
  assert.equal(changed.pid, 456); assert.equal(changed.release, 'new'); assert.deepEqual(session, original);
  assert.deepEqual(sessionContext(JSON.parse(JSON.stringify(settings)), session), changed);
  assert.equal(sessionContext(settings, { ...session, project: '/elsewhere' }).release, null);
  assert.equal(saveContext(settings, session, null).task, null);
});

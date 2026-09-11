const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../src/kanban.mjs');
test('global board keeps project/release identity and hides closed releases only by default', async () => {
  const { boardCards } = await load();
  const projects = ['/first', '/second'].map(path => ({ path, name: path, board: [
    { id: 'T01', release: 'open', releaseStatus: 'ouverte', status: 'running' },
    { id: 'T01', release: 'closed', releaseStatus: 'close', status: 'validated' },
  ] }));
  assert.equal(boardCards(projects).length, 2);
  assert.equal(new Set(boardCards(projects, true).map(t => t.key)).size, 4);
  assert.deepEqual(boardCards(projects).map(t => t.column), ['working', 'working']);
});
test('unknown, stale and declared legacy statuses never become verified done', async () => {
  const { columnFor, boardCards } = await load();
  assert.equal(columnFor('validated'), 'done');
  assert.equal(columnFor('awaiting_receipt'), 'review');
  assert.equal(columnFor('pending'), 'todo');
  for (const value of ['unknown', 'unverified', 'stale', 'blocked', 'done', undefined]) assert.equal(columnFor(value), 'blocked');
  assert.deepEqual(boardCards([{ path: '/missing', warnings: ['Unavailable'] }]), []);
});

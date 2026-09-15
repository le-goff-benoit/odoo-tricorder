const { test } = require('node:test');
const assert = require('node:assert/strict');
const register = (status = 'ready') => ({ schema: 1, revision: 1, items: [
  { id: 'I01', purpose: 'Clarifier les arrondis', text: 'Texte original de la demande.', source: { path: 'demande.md', original: 'Source conservée' }, status, tasks: [] },
] });

test('new requests project into both boards without becoming executable tasks', async () => {
  const { intentionCards } = await import('../src/plan-model.mjs');
  const { allReleaseCards, filterCards } = await import('../src/release-kanban.mjs');
  const { boardCards } = await import('../src/kanban.mjs');
  const intentions = register(), detail = { selectedRelease: 'r', tasks: [], intentions };
  const before = JSON.stringify(detail), [request] = intentionCards(detail);
  assert.equal(request.id, 'intention:I01'); assert.equal(request.kind, 'intention');
  assert.equal(request.executable, false); assert.equal(request.presentation.label, 'À planifier');
  assert.equal(request.column, 'todo'); assert.notEqual(request.status, 'ready');
  assert.strictEqual(request.source, intentions.items[0].source);
  assert.equal(allReleaseCards(detail).filter(c => c.kind === 'intention').length, 1);
  assert.deepEqual(filterCards(allReleaseCards(detail), 'ready'), []);
  assert.deepEqual(filterCards(allReleaseCards(detail), 'executing'), []);
  const global = boardCards([{ path: '/p', releases: [{ id: 'r', status: 'ouverte', intentions }], board: [] }]);
  assert.equal(global.find(c => c.kind === 'intention').presentation.label, 'À planifier');
  assert.equal(global.find(c => c.kind === 'intention').release, 'r');
  assert.equal(JSON.stringify(detail), before);
});

test('planning or splitting a request replaces its projection and removal restores it', async () => {
  const { intentionCards } = await import('../src/plan-model.mjs');
  const detail = { intentions: register('planned'), tasks: [] };
  detail.intentions.items[0].tasks = ['T01', 'T02'];
  assert.equal(intentionCards(detail).length, 1, 'dangling links do not hide the request');
  detail.tasks = [{ id: 'T01', title: 'Premier lot' }, { id: 'T02', title: 'Deuxième lot' }];
  assert.equal(intentionCards(detail).length, 0);
  detail.tasks = [];
  assert.equal(intentionCards(detail).length, 1);
  detail.intentions.items[0].tasks = [];
  detail.tasks = [{ id: 'T03', intentions: ['I01'] }];
  assert.equal(intentionCards(detail).length, 0, 'reverse task-to-intention links also count');
  assert.equal(detail.intentions.items[0].source.original, 'Source conservée');
});

test('clarification stays explicit, satisfied/deferred stay in registry, links are release scoped', async () => {
  const { intentionCards } = await import('../src/plan-model.mjs');
  const { boardCards } = await import('../src/kanban.mjs');
  assert.equal(intentionCards({ intentions: register('clarify') })[0].presentation.label, 'À préciser');
  for (const status of ['satisfied', 'deferred']) {
    const intentions = register(status);
    assert.deepEqual(intentionCards({ intentions }), []); assert.equal(intentions.items.length, 1);
  }
  const intentions = register();
  const project = { path: '/p', releases: [{ id: 'new', status: 'ouverte', intentions }, { id: 'old', status: 'close', intentions }],
    board: [{ id: 'T01', release: 'old', releaseStatus: 'close', intentions: ['I01'], status: 'validated' }] };
  const all = boardCards([project], true);
  assert.equal(all.filter(c => c.kind === 'intention').length, 1);
  assert.equal(all.find(c => c.kind === 'intention').release, 'new');
  assert.equal(boardCards([project]).filter(c => c.kind === 'intention').length, 1);
});

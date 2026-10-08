const { test } = require('node:test');
const assert = require('node:assert/strict');
let model;
test.before(async () => { model = await import('../src/studio-model.js'); });
test('patch preview preserves criteria and rejects stale revisions', () => {
  const graph = { revision: 2, nodes: [{ id: 'a', title: 'A', criteria: ['Required'] }], edges: [] };
  assert.throws(() => model.applyPatch(graph, { baseRevision: 1, operations: [] }), /révision/);
  assert.throws(() => model.applyPatch(graph, { baseRevision: 2, operations: [{ type: 'update-node', id: 'a', changes: { criteria: [] } }] }), /critères/);
  const updated = model.applyPatch(graph, { baseRevision: 2, operations: [{ type: 'update-node', id: 'a', changes: { title: 'B' } }] });
  assert.equal(updated.nodes[0].title, 'B'); assert.equal(graph.nodes[0].title, 'A');
  assert.deepEqual(updated.nodes[0].criteria, ['Required']);
});
test('effective model reports source without hidden fallback; history restores state', () => {
  const result = model.effectiveExecution({ defaults: { model: 'project-model', effort: 'medium' } }, { defaults: { model: 'workflow-model' } }, { model: 'node-model' });
  assert.deepEqual(result.model, { value: 'node-model', source: 'Bloc' });
  assert.deepEqual(result.effort, { value: 'medium', source: 'Projet' });
  const history = new model.History(); history.push({ title: 'before' });
  assert.deepEqual(history.undo({ title: 'after' }), { title: 'before' });
  assert.deepEqual(history.redo({ title: 'before' }), { title: 'after' });
});
test('connections use only right-angle segments, including backward layouts', () => {
  for (const [x, y, endX, endY] of [[240, 150, 500, 350], [500, 350, 200, 150], [240, 150, 500, 150]]) {
    const path = model.orthogonalPath(x, y, endX, endY);
    assert.match(path, /^M[\d,]+ H/);
    assert.doesNotMatch(path, /[CQSTAL]/);
    assert.ok(path.endsWith('H' + endX));
  }
});

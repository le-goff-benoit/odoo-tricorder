const { test } = require('node:test');
const assert = require('node:assert/strict');
test('both boards keep a historical receipt when its current controls are stale', async () => {
  const { boardCards } = await import('../src/kanban.mjs');
  const { releaseCards } = await import('../src/release-kanban.mjs');
  const task = { id: 'A', progress: 'received', status: 'stale', validation: 'stale', reason: 'Source consommée modifiée' };
  const global = boardCards([{ path: '/a', board: [task] }])[0];
  const local = releaseCards({ tasks: [task] })[0];
  assert.equal(global.column, 'done'); assert.equal(local.column, 'done');
  assert.equal(global.presentation.proof, 'Contrôle à actualiser');
  assert.equal(local.presentation.reason, task.reason);
  assert.equal(boardCards([{ path: '/a', board: [{ id: 'B', status: 'unknown' }] }])[0].column, 'unknown');
});
test('graph exposes ancestors, downstream work, cycles, absent dependencies and 50 tasks', async () => {
  const { dependencyGraph } = await import('../src/plan-model.mjs');
  const tasks = Array.from({ length: 50 }, (_, i) => ({ id: 'T' + i, depends_on: i ? ['T' + (i - 1)] : [], scopes: [i % 2 ? 'module/a' : 'module/b'] }));
  const graph = dependencyGraph(tasks, 'T20');
  assert.equal(graph.nodes.length, 50); assert.equal(graph.ancestors.length, 20); assert.equal(graph.descendants.length, 29);
  assert.ok(graph.resources.includes('T22')); assert.ok(!graph.resources.includes('T21')); assert.equal(graph.errors.length, 0);
  const invalid = dependencyGraph([{ id: 'A', depends_on: ['B'] }, { id: 'B', depends_on: ['A', 'missing'] }], 'A');
  assert.ok(invalid.errors.some(e => e.includes('Cycle'))); assert.ok(invalid.errors.some(e => e.includes('absente')));
  assert.equal(dependencyGraph([]).nodes.length, 0);
});
test('three simultaneous activities and their waiting states use the same filter', async () => {
  const { activities, orchestrationCard } = await import('../src/activity.mjs');
  const { allReleaseCards, filterCards } = await import('../src/release-kanban.mjs');
  const detail = { selectedRelease: 'r', tasks: [{ id: 'A', status: 'running' }, { id: 'B', status: 'running' }], orchestration: { id: 'stable-main', status: 'active' } };
  const bindings = [null, 'A', 'B'].map((task, i) => ({ task, release: 'r', provider: 'codex', role: task ? 'odoo-developer' : 'orchestrator', agents: [{ nativeId: String(i), state: i === 2 ? 'tool' : 'active', startedAt: '2026-09-15T12:00:00Z' }] }));
  assert.equal(activities(detail, bindings).filter(a => a.executing).length, 3);
  assert.equal(filterCards(allReleaseCards(detail, bindings), 'executing').length, 3);
  bindings[0].agents[0].state = 'waiting_agent'; detail.orchestration.status = 'waiting_agent';
  assert.equal(filterCards(allReleaseCards(detail, bindings), 'executing').length, 2);
  assert.equal(orchestrationCard(detail, bindings).waiting, true);
  assert.equal(orchestrationCard({ selectedRelease: 'next', orchestration: { ...detail.orchestration, release: 'next' } }).id, 'stable-main');
  assert.equal(orchestrationCard({}).status, 'unknown');
});
test('timers need trustworthy starts and freeze at observed ends, not at selected cards', async () => {
  const { elapsed, activities } = await import('../src/activity.mjs');
  const now = Date.parse('2026-09-15T12:10:00Z'), startedAt = '2026-09-15T12:00:00Z';
  assert.equal(elapsed({ executing: true }, now), 'Durée inconnue');
  assert.equal(elapsed({ executing: true, startedAt }, now), '10:00');
  assert.equal(elapsed({ executing: true, startedAt, stale: true }, now), 'Durée à vérifier');
  assert.equal(elapsed({ startedAt, endedAt: '2026-09-15T12:02:00Z' }, now), '02:00');
  assert.equal(elapsed({ executing: true, startedAt: '2026-09-16' }, now), 'Durée inconnue');
  const binding = { provider: 'claude', agents: [{ nativeId: 'a', state: 'tool', lastAt: startedAt, events: [{ at: startedAt, kind: 'PostToolUse', state: 'tool' }] }] };
  assert.equal(activities({}, [binding])[0].startedAt, null);
  binding.agents[0].events[0].kind = 'PreToolUse';
  assert.equal(activities({}, [binding, binding]).length, 1);
  assert.equal(activities({}, [binding])[0].startedAt, startedAt);
});
test('resource conflicts include declared databases and ports without adding result edges', async () => {
  const { dependencyGraph } = await import('../src/plan-model.mjs');
  const g = dependencyGraph([{ id: 'A', scopes: ['a'], resources: { database: 'qa', port: 8069 } }, { id: 'B', scopes: ['b'], resources: { database: 'qa', port: 8070 } }], 'A');
  assert.deepEqual(g.resources, ['B']); assert.deepEqual(g.edges, []);
});
test('orchestration trace is explicit, stale after missing follow-up and never inferred from an analyst', async () => {
  const { activities, orchestrationCard } = await import('../src/activity.mjs');
  const now = new Date().toISOString();
  const d = { orchestration: { id: 'main', status: 'active', phaseStartedAt: now, updatedAt: now, model: 'principal' } };
  assert.equal(activities(d)[0].executing, true);
  d.orchestration.updatedAt = '2020-01-01';
  assert.equal(activities(d)[0].stale, true); assert.equal(activities(d)[0].executing, false);
  const native = [{ role: 'odoo-analyst', agents: [{ nativeId: 'analyst', state: 'active', stale: false }] }];
  assert.equal(orchestrationCard({}, native).activities.length, 0);
});
test('provider marks use OpenAI and Anthropic identity, without the former substitute symbols', async () => {
  const { providerIcon } = await import('../src/provider-brand.mjs');
  assert.match(providerIcon('codex'), /aria-label="OpenAI"/);
  assert.match(providerIcon('claude-hooks'), /aria-label="Anthropic"/);
  assert.match(providerIcon('codex'), /viewBox="0 0 721 721"/);
  assert.match(providerIcon('claude'), /viewBox="0 0 35 24"/);
  assert.match(providerIcon(null), /aria-label="Shell"/);
});

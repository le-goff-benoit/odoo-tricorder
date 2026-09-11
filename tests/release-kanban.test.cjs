const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../src/release-kanban.mjs');
test('a reached agent without a timer stays visible and prevents a false complete saving', async () => {
  const { releaseCards } = await load();
  const [card] = releaseCards({ selectedRelease: 'r', tasks: [{ id: 'T01', status: 'running', flow: 'f' }],
    flows: [{ path: 'f', release: 'r', nodes: [
      { role: 'odoo-analyst', executor: 'agent', status: 'done' },
      { role: 'odoo-developer', executor: 'agent', status: 'claimed', owner: 'claude-dev-T01' },
    ] }], effort: { rows: [{ task: 'T01', agent: 'odoo-developer', actual_minutes: 15, initial: { expected_minutes: 30 } }] } });
  assert.equal(card.measures.actual, 15);
  assert.equal(card.measures.partial, true);
  assert.equal(card.measures.delta, null);
  assert.equal(card.agents.find(a => a.agent === 'odoo-analyst').actual, null);
});
test('release board separates receipts, stale proofs, legacy declarations and deferrals', async () => {
  const { releaseColumn } = await load();
  assert.equal(releaseColumn({ progress: 'received', status: 'stale' }), 'done');
  assert.equal(releaseColumn({ status: 'awaiting_receipt' }), 'review');
  assert.equal(releaseColumn({ status: 'running' }), 'working');
  assert.equal(releaseColumn({ status: 'ready' }), 'todo');
  assert.equal(releaseColumn({ status: 'deferred' }), 'deferred');
  for (const status of ['done', 'stale', 'unverified', 'surprise', undefined]) assert.equal(releaseColumn({ status }), 'unknown');
});
test('blocked tasks retain their reached stage, unknown stages are not guessed', async () => {
  const { releaseCards } = await load();
  const detail = { selectedRelease: 'r', tasks: [{ id: 'T01', status: 'blocked', flow: 'f', reason: 'Copie absente' }],
    flows: [{ path: 'f', nodes: [{ id: 'review', description: 'Analyse', status: 'claimed', owner: 'Claude analyste' }] }] };
  const [card] = releaseCards(detail);
  assert.equal(card.column, 'working'); assert.equal(card.blocked, true);
  assert.deepEqual(card.owners, ['Claude analyste']);
  assert.equal(card.stage, 'Analyse');
  detail.flows = [];
  assert.equal(releaseCards(detail)[0].column, 'unknown');
});
test('native activity is task-scoped, stale observations do not become live, receipts win', async () => {
  const { releaseCards } = await load();
  const detail = { selectedRelease: 'r', tasks: [{ id: 'T01', status: 'pending' }, { id: 'T02', progress: 'received', status: 'stale' }] };
  const native = [
    { release: 'other', task: 'T01', agents: [{ state: 'waiting_human' }] },
    { release: 'r', task: null, agents: [{ state: 'waiting_human' }] },
    { release: 'r', task: 'T01', agents: [{ state: 'tool', stale: true }] },
  ];
  assert.equal(releaseCards(detail, native)[0].waiting, false);
  assert.equal(releaseCards(detail, native)[0].activity, 'Activité non confirmée');
  native.push({ release: 'r', task: 'T01', provider: 'claude', agents: [{ state: 'waiting_human', stale: false }] });
  assert.equal(releaseCards(detail, native)[0].waiting, true);
  assert.equal(releaseCards(detail, native)[1].column, 'done');
});
test('time uses one source and keeps missing values unknown; filters never change cards', async () => {
  const { releaseCards, filterCards } = await load();
  const detail = { selectedRelease: 'r', tasks: [{ id: 'T01', status: 'ready' }, { id: 'T02', status: 'pending' }],
    effort: { rows: [{ task: 'T01', agent: 'odoo-analyst', actual_minutes: 10, initial: { expected_minutes: 20 } }] } };
  const cards = releaseCards(detail, [{ release: 'r', task: 'T01', role: 'odoo-analyst', usage: { active_seconds: 900 } }]);
  assert.equal(cards[0].measures.actual, 10); assert.equal(cards[1].measures.actual, null);
  assert.equal(cards[0].agents[0].actual, 10);
  assert.equal(filterCards(cards, 'ready', '').length, 1);
  assert.equal(filterCards(cards, 'all', 'introuvable').length, 0);
  assert.equal(cards.length, 2);
});
test('ambiguous histories and other-release flows cannot invent the current responsible agent', async () => {
  const { releaseCards } = await load();
  const node = { status: 'claimed', owner: 'Wrong owner' };
  const detail = { selectedRelease: 'r', tasks: [{ id: 'T', status: 'unverified', flowPaths: ['old', 'other'] }],
    flows: [{ path: 'old', nodes: [node] }, { path: 'other', release: 'other-release', nodes: [node] }] };
  assert.deepEqual(releaseCards(detail)[0].owners, []);
});

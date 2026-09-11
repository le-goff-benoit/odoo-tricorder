const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../src/measurements.mjs');
test('preparation and native task observations cannot count the same period twice', async () => {
  const { withoutPreparationOverlap } = await load();
  const reservation = [{ provider: 'codex', thread: 'session', since: '2026-09-11T10:00:00Z', until: '2026-09-11T10:10:00Z' }];
  const bindings = [
    { nativeId: 'session', provider: 'codex', task: 'T01' },
    { nativeId: 'session', provider: 'codex', task: 'T01', since: '2026-09-11T10:05:00Z', until: '2026-09-11T10:15:00Z' },
    { nativeId: 'session', provider: 'codex', task: 'T02', since: '2026-09-11T10:10:00Z', until: '2026-09-11T10:20:00Z' },
    { nativeId: 'child', provider: 'codex', task: 'T03' },
  ];
  assert.deepEqual(withoutPreparationOverlap(bindings, reservation).map(b => b.task), ['T02', 'T03']);
  assert.equal(withoutPreparationOverlap(bindings).length, 4);
});
test('partial token fields survive and recorded/native counters are never added', async () => {
  const { tokenMeasures } = await load();
  const result = tokenMeasures([{ tokens: { input_tokens: 100, output_tokens: 20, cached_input_tokens: 50 } }],
    [{ usage: { tokens: { input_tokens: 999, output_tokens: 999 } } }]);
  assert.equal(result.source, 'Enregistré');
  assert.deepEqual(result.fields.map(f => f.value), [100, 20, 50, null]);
  const native = tokenMeasures([], [{ usage: { tokens: { output_tokens: 0 } } }, { usage: null }]);
  assert.equal(native.fields[1].value, 0); assert.equal(native.fields[1].partial, true);
  assert.equal(native.fields[0].value, null);
});
test('headline durations use hours, preserving unknown and sub-minute values', async () => {
  const { hours } = await load();
  assert.equal(hours(null), 'Non mesuré');
  assert.equal(hours(0), '0 h 00 min');
  assert.equal(hours(95), '1 h 35 min');
  assert.equal(hours(60), '1 h 00 min');
  assert.equal(hours(1 / 3), '0 h 00 min 20 s');
});
test('empty, partial and invalid measures never become zero', async () => {
  const { knownSum } = await load();
  for (const values of [[], [null], [1, undefined], [NaN], [-1]]) assert.equal(knownSum(values), null);
  assert.equal(knownSum([0]), 0);
});
test('recorded and native time are never added', async () => {
  const { taskMeasures } = await load();
  const result = taskMeasures([{ actual_minutes: 10, time_complete: true }], [{ usage: { active_seconds: 600, complete: true } }]);
  assert.equal(result.actual, 10); assert.equal(result.basis, 'effort.json');
});
test('changed scopes and retrospective estimates do not produce a variance', async () => {
  const { taskMeasures } = await load();
  for (const flag of ['scope_changed', 'retrospective']) {
    assert.equal(taskMeasures([{ actual_minutes: 10, initial: { expected_minutes: 20 }, [flag]: true }], []).delta, null);
  }
});
test('partial native time is provisional, not a closure variance', async () => {
  const { taskMeasures } = await load();
  const result = taskMeasures([{ initial: { expected_minutes: 20 } }], [{ usage: { active_seconds: 60, complete: false } }]);
  assert.equal(result.actual, 1); assert.equal(result.partial, true); assert.equal(result.delta, null);
});
test('complete comparable period uses revised estimate', async () => {
  const { taskMeasures } = await load();
  const result = taskMeasures([{ initial: { expected_minutes: 20 }, revised: { expected_minutes: 12 }, actual_minutes: 10 }], []);
  assert.equal(result.delta, -2);
});

test('a missing role does not hide recorded work or produce a saving', async () => {
  const { taskMeasures } = await load();
  const result = taskMeasures([
    { agent: 'odoo-developer', actual_minutes: 18, known_minutes: 18, time_complete: true },
    { agent: 'odoo-tester', actual_minutes: 5, known_minutes: 5, time_complete: true },
    { agent: 'orchestrateur', actual_minutes: null, known_minutes: 0, time_complete: false },
  ], []);
  assert.equal(result.actual, 23);
  assert.equal(result.partial, true);
  assert.equal(result.basis, 'effort.json');
  assert.deepEqual(result.missingRoles, ['orchestrateur']);
  assert.equal(result.delta, null);
});

test('an unfinished second passage preserves the known subtotal, without adding native work', async () => {
  const { taskMeasures } = await load();
  const result = taskMeasures([{ actual_minutes: null, known_minutes: 12, time_complete: false }],
    [{ usage: { active_seconds: 1800, complete: true } }]);
  assert.equal(result.actual, 12); assert.equal(result.partial, true);
  assert.equal(result.basis, 'effort.json'); assert.equal(result.delta, null);
});

test('missing measurements are not zero but an explicitly measured zero is retained', async () => {
  const { taskMeasures } = await load();
  assert.equal(taskMeasures([{ actual_minutes: null, known_minutes: 0, time_complete: false }], []).actual, null);
  assert.equal(taskMeasures([{ actual_minutes: 0, known_minutes: 0, time_complete: true }], []).actual, 0);
});

test('release subtotal includes measured tasks while signalling unknown tasks', async () => {
  const { summarizeMeasures } = await load();
  assert.deepEqual(summarizeMeasures([{ actual: 23, partial: true }, { actual: 12, partial: false }, { actual: null }]), { actual: 35, partial: true });
  assert.deepEqual(summarizeMeasures([{ actual: null }]), { actual: null, partial: false });
  assert.deepEqual(summarizeMeasures([{ actual: 0, partial: false }]), { actual: 0, partial: false });
});

test('native subtotal survives an unknown observation but remains provisional', async () => {
  const { taskMeasures } = await load();
  const result = taskMeasures([], [{ usage: { active_seconds: 120, complete: true } }, { usage: null }]);
  assert.equal(result.actual, 2); assert.equal(result.partial, true); assert.equal(result.delta, null);
});

test('agent breakdown preserves partial roles and reconciles to the recorded task subtotal', async () => {
  const { agentMeasures, taskMeasures, summarizeMeasures } = await load();
  const rows = [
    { agent: 'odoo-developer', actual_minutes: 18, initial: { expected_minutes: 20 }, revised: { expected_minutes: 25 } },
    { agent: 'odoo-tester', actual_minutes: 5 },
    { agent: 'orchestrateur', actual_minutes: null, known_minutes: 0, time_complete: false },
  ];
  const native = [{ role: 'orchestrateur', usage: { active_seconds: 600, complete: true } }];
  const agents = agentMeasures(rows, native);
  assert.equal(agents.length, 3); assert.equal(agents[0].label, 'Développement');
  assert.equal(agents[0].initial, 20); assert.equal(agents[0].revised, 25);
  assert.equal(agents[2].actual, null); // Not replaced by provisional native time.
  assert.equal(summarizeMeasures(agents).actual, taskMeasures(rows, native).actual);
});

test('native-only breakdown groups explicit roles without inventing child-agent time', async () => {
  const { agentMeasures, summarizeMeasures } = await load();
  const agents = agentMeasures([], [
    { role: 'odoo-developer', usage: { active_seconds: 60, complete: true } },
    { role: 'odoo-developer', usage: { active_seconds: 120, complete: true } },
    { usage: { active_seconds: 30, complete: false } },
  ]);
  assert.equal(agents.length, 2); assert.equal(agents[0].actual, 3);
  assert.equal(agents[1].label, 'Non attribué'); assert.equal(agents[1].partial, true);
  assert.equal(summarizeMeasures(agents).actual, 3.5);
});

test('agent breakdown distinguishes unknown, measured zero and a task without any records', async () => {
  const { agentMeasures } = await load();
  assert.deepEqual(agentMeasures([], []), []);
  assert.equal(agentMeasures([{ agent: 'qa', actual_minutes: 0 }], [])[0].actual, 0);
  assert.equal(agentMeasures([{ agent: 'qa', actual_minutes: null, known_minutes: 0 }], [])[0].actual, null);
});

test('time shares use known durations only, never unknowns or a zero denominator', async () => {
  const { timeShare } = await load();
  assert.equal(timeShare(10, 40), 25);
  assert.equal(timeShare(0, 40), 0);
  for (const pair of [[null, 40], [0, 0], [10, null], [-1, 40], [50, 40]]) assert.equal(timeShare(...pair), null);
});

test('agent allocation aggregates across tasks and retains unknown roles', async () => {
  const { agentAllocation } = await load();
  const rows = agentAllocation([
    { actual: 20, agents: [{ agent: 'dev', label: 'Dev', actual: 20 }, { agent: 'qa', label: 'QA', actual: null }] },
    { actual: 20, agents: [{ agent: 'dev', label: 'Dev', actual: 10 }, { agent: 'qa', label: 'QA', actual: 10 }, { agent: 'coord', label: 'Coordination', actual: null }] },
  ]);
  assert.equal(rows[0].share, 75); assert.equal(rows[1].share, 25);
  assert.equal(rows[1].partial, true); assert.equal(rows[2].share, null);
});

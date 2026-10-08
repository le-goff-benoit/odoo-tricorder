const { test } = require('node:test');
const assert = require('node:assert/strict');
const { workPrompt } = require('../electron/work-request.cjs');
const { statePaths, initialWorkspace } = require('../electron/workspace-window.cjs');

test('release actions preserve user intentions and distinguish planning from execution', () => {
  const context = { project: '/project', release: 'release', task: null };
  for (const action of ['open', 'collect', 'plan']) {
    const prompt = workPrompt({ action, text: 'Ma demande originale' }, context);
    assert.ok(prompt.startsWith('/odoo-plan\n'));
    assert.ok(prompt.endsWith('Ma demande originale'));
  }
  assert.ok(workPrompt({ action: 'start', text: '' }, context).startsWith('/odoo-start\n'));
  assert.ok(workPrompt({ action: 'open', text: 'Nouvelle release' }, { project: '/project' }).includes('odoo_briefing.py'));
  assert.throws(() => workPrompt({ action: 'start', text: '' }, { project: '/project' }), /release/);
  assert.throws(() => workPrompt({ action: 'collect', text: 'Intention' }, { project: '/project' }), /release/);
});

test('one window retains the two existing stores and isolates test instances', () => {
  const live = statePaths({}, 'cockpit', '/home/example');
  assert.deepEqual(live, statePaths({}, 'studio', '/home/example'));
  assert.equal(live.cockpit, '/home/example/.config/odoo-tricorder');
  assert.equal(live.studio, '/home/example/.local/share/tricorder');
  assert.equal(initialWorkspace(['app', '--workflow-studio']), 'studio');
  assert.equal(initialWorkspace(['app', '/a/model.tricorder-workflow']), 'studio');
  assert.equal(initialWorkspace(['app']), 'cockpit');
  const isolated = statePaths({ TRICORDER_STATE_DIR: '/isolated/state' }, 'cockpit');
  assert.deepEqual(isolated, { cockpit: '/isolated/state', studio: '/isolated/state/workflows' });
});

test('workflow conversation starts with intentions and preserves authorization gates', () => {
  const prompt = workPrompt({ action: 'workflow', text: '' }, { project: '/project', release: null });
  assert.ok(prompt.startsWith('/odoo-plan\n'));
  assert.ok(prompt.includes('même conversation'));
  assert.ok(prompt.includes('accord explicite sur le plan'));
  assert.ok(prompt.includes('/odoo-start'));
  assert.ok(prompt.includes('/odoo-close'));
  assert.ok(prompt.includes('Ne jamais lancer de développement sans plan autorisé'));
});

test('common provider choice removes stale model overrides but preserves agent roles', async () => {
  const { withWorkflowAI, effectiveExecution } = await import('../src/studio-model.js');
  const before = { nodes: [{ id: 'a', kind: 'agent', model: 'old-openai-model', provider: 'codex', profile: 'odoo-analyst' },
    { id: 'b', kind: 'agent', model: '' }, { id: 'c', kind: 'command', argv: ['true'] }] };
  const after = withWorkflowAI(before, { provider: 'claude', model: 'explicit-anthropic-model' });
  for (const node of after.nodes.filter(n => n.kind === 'agent')) {
    assert.equal(effectiveExecution({}, after, node).provider.value, 'claude');
    assert.equal(effectiveExecution({}, after, node).model.value, 'explicit-anthropic-model');
  }
  assert.equal(after.nodes[0].profile, 'odoo-analyst');
  assert.deepEqual(after.nodes[2], before.nodes[2]);
  assert.equal(before.nodes[0].model, 'old-openai-model');
});

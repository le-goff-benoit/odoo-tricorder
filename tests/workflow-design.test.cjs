const { test, before } = require('node:test');
const assert = require('node:assert/strict');
let design;
before(async () => { design = await import('../src/workflow-design.mjs'); });

test('deleting an intermediate block exposes its now unbound approval input, repairing the mapping clears it', () => {
  const graph = { nodes: [{ id: 'collect', kind: 'task', outputs: { dossier: 'string' } }, { id: 'approve', kind: 'decision', inputs: { result: 'string' } }], edges: [] };
  assert.match(design.designWarnings(graph).find(item => item.node === 'approve').message, /result/);
  graph.edges.push({ id: 'repair', from: 'collect', to: 'approve', mapping: { dossier: 'result' } });
  assert.deepEqual(design.designWarnings(graph), []);
});

test('a root condition can use an explicit false parameter without being falsely reported as missing', () => {
  const graph = { parameters: { critical: false }, nodes: [{ id: 'route', kind: 'condition', parameter: 'critical', inputs: { critical: 'boolean' } }], edges: [] };
  assert.deepEqual(design.designWarnings(graph), []);
  delete graph.parameters.critical;
  assert.equal(design.designWarnings(graph)[0].code, 'unbound-inputs');
  graph.nodes[0].parameters = { critical: false };
  assert.deepEqual(design.designWarnings(graph), []);
  graph.parameters.critical = true; graph.nodes[0].parameters = {};
  assert.equal(design.designWarnings(graph)[0].code, 'unbound-inputs');
});

test('personalized simulation retains false, zero and empty text and leaves automatic ports absent', () => {
  const node = { outputs: { critical: 'boolean', count: 'number', title: 'string', defaulted: 'object' }, sample_outputs: { critical: true, defaulted: { old: true }, imported_extra: 'preserved' } };
  assert.deepEqual(design.simulationValues(node, { critical: { custom: true, value: 'false' }, count: { custom: true, value: '0' }, title: { custom: true, value: '' }, defaulted: { custom: false } }), { critical: false, count: 0, title: '', imported_extra: 'preserved' });
  assert.equal(node.sample_outputs.critical, true);
});

test('invalid imported simulation values need an explicit correction or return to automatic', () => {
  for (const [type, value] of [['boolean', 'False'], ['number', ''], ['number', 'Infinity'], ['array', '{}'], ['object', '[]'], ['object', 'null']]) {
    assert.throws(() => design.parseSimulationValue(type, value, 'result'), /result/);
  }
  const node = { outputs: { critical: 'boolean' }, sample_outputs: { critical: 'false' } };
  assert.throws(() => design.simulationValues(node, { critical: { custom: true, value: '' } }), /choisissez/);
  assert.deepEqual(design.simulationValues(node, { critical: { custom: false } }), {});
});

test('each integrated template copy gets an identifiable title distinct from previous copies', () => {
  assert.equal(design.copyTitle('Support', [{ title: 'Support' }, { title: 'Support — copie' }, { title: 'Support — copie 2' }]), 'Support — copie 3');
});

test('reusing an expanded subworkflow removes previous execution context at both levels and preserves business settings', async () => {
  const {reusableWorkflow}=await import('../src/workflow-design.mjs');
  const original={parameters:{language:'fr',request:'Ancienne demande',conversation:'c-old'},nodes:[{id:'embedded',parameters:{timezone:'Europe/Zurich',request:'Ancienne demande interne',source_context:{results:{report:'Ancien résultat'}},source_run:'r-old',depends_on_runs:['r-parent']},prompt:'Demander le besoin métier.'}]};
  const copy=reusableWorkflow(original);
  assert.deepEqual(copy.parameters,{language:'fr'});
  assert.deepEqual(copy.nodes[0].parameters,{timezone:'Europe/Zurich'});
  assert.equal(copy.nodes[0].prompt,original.nodes[0].prompt);
  assert.equal(original.nodes[0].parameters.source_context.results.report,'Ancien résultat');
});

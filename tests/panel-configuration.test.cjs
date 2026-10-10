const { test } = require('node:test');
const assert = require('node:assert/strict');

test('reusing a method removes previous trial outputs by default and retains business settings', async () => {
  const { reusableWorkflow } = await import('../src/workflow-design.mjs');
  const graph = { parameters: { language: 'fr', request: 'Ancien atelier', source_run: 'old' }, nodes: [
    { id: 'qualify', kind: 'task', prompt: 'Qualifier cette demande.', parameters: { target: 'équipe', source_context: { request: 'Ancien cas' } },
      outputs: { priority: 'string', accepted: 'boolean' }, sample_outputs: { priority: 'urgent', accepted: false } },
  ] };
  const clean = reusableWorkflow(graph);
  assert.equal(clean.nodes[0].sample_outputs, undefined);
  assert.deepEqual(clean.nodes[0].parameters, { target: 'équipe' });
  assert.deepEqual(clean.parameters, { language: 'fr' });
  assert.equal(clean.nodes[0].prompt, graph.nodes[0].prompt);
  assert.deepEqual(clean.nodes[0].outputs, graph.nodes[0].outputs);
  const examples = reusableWorkflow(graph, { keepSimulationExamples: true });
  assert.deepEqual(examples.nodes[0].sample_outputs, { priority: 'urgent', accepted: false });
  assert.deepEqual(examples.nodes[0].parameters, { target: 'équipe' });
  examples.nodes[0].sample_outputs.priority = 'normal';
  assert.equal(graph.nodes[0].sample_outputs.priority, 'urgent');
});

test('root input guidance explains request context without treating it as an input binding', async () => {
  const { designWarnings } = await import('../src/workflow-design.mjs');
  const graph = { parameters: { request: 'Cas fictif' }, nodes: [{ id: 'qualify', kind: 'task', inputs: { demande: 'string' } }], edges: [] };
  const warning = designWarnings(graph)[0];
  assert.equal(warning.code, 'unbound-inputs');
  assert.match(warning.message, /demande/);
  assert.match(warning.message, /contexte à la consigne/);
  assert.match(warning.message, /ne remplit pas automatiquement les entrées nommées/);
  graph.nodes.unshift({ id: 'collect', kind: 'task', outputs: { dossier: 'string' } });
  graph.edges.push({ from: 'collect', to: 'qualify', mapping: {} });
  assert.doesNotMatch(designWarnings(graph).find(item => item.node === 'qualify').message, /pas de prédécesseur/);
  graph.edges[0].mapping.dossier = 'demande';
  assert.deepEqual(designWarnings(graph), []);
});

test('schedule cards describe intervals, local times and actual selected weekdays', async () => {
  const { scheduleFrequency } = await import('../src/schedule-configuration.mjs');
  assert.equal(scheduleFrequency({ kind: 'interval', minutes: 60 }), 'Toutes les 60 minutes');
  assert.equal(scheduleFrequency({ kind: 'daily', time: '13:45' }), 'Chaque jour à 13:45');
  assert.equal(scheduleFrequency({ kind: 'weekly', time: '08:15' }), 'Du lundi au vendredi à 08:15');
  assert.equal(scheduleFrequency({ kind: 'weekly', weekdays: [4, 0, 4], time: '10:20' }), 'lundi, vendredi à 10:20');
});

test('replacing a schedule prepopulates recurrence, with no inherited permission or real execution mode', async () => {
  const { replacementScheduleDraft } = await import('../src/schedule-configuration.mjs');
  const schedule = { rule: { kind: 'weekly', weekdays: [0, 4], time: '17:20', timezone: 'Pacific/Auckland' },
    simulation: false, notifications_authorized: true, enabled: true };
  assert.deepEqual(replacementScheduleDraft(schedule), { kind: 'weekly', time: '17:20', minutes: 30,
    timezone: 'Pacific/Auckland', weekdays: '[0,4]', simulation: true });
  assert.equal(schedule.notifications_authorized, true);
  const withAnswers={...schedule,parameters:{include:false,amount:0,choice:'email'}};
  const draft=replacementScheduleDraft(withAnswers);assert.deepEqual(draft.values,withAnswers.parameters);draft.values.choice='ticket';assert.equal(withAnswers.parameters.choice,'email');
  assert.equal(replacementScheduleDraft({ rule: { kind: 'interval', minutes: 60, timezone: 'Europe/Zurich' } }).minutes, 60);
});

test('replacing a schedule preserves its fixed or renewed source without carrying its activation',async()=>{
 const {replacementScheduleDraft}=await import('../src/schedule-configuration.mjs');
 const base={rule:{kind:'weekly',weekdays:[3]},parameters:{schedule_fixed_source:'Contenu conservé'},definition:{schedule_source:{mode:'fixed',node:'source'},nodes:[{id:'source'}]}};
 const fixed=replacementScheduleDraft(base);assert.equal(fixed.source_fixed_text,'Contenu conservé');assert.equal(fixed.source_mode,'fixed');assert.equal(fixed.simulation,true);
 base.definition={schedule_source:{mode:'connection',node:'fresh'},nodes:[{id:'fresh',capabilities:[{plugin:'notes',operation:'read'}],source_polling:{query:'Nouvelles notes',scope:'Atlas'}}]};
 const fresh=replacementScheduleDraft(base);assert.equal(fresh.source_mode,'connection');assert.equal(fresh.source_query,'Nouvelles notes');assert.equal(fresh.source_scope,'Atlas');assert.equal(fresh.source_binding,JSON.stringify({plugin:'notes',operation:'read'}));assert.equal(fresh.simulation,true);
});

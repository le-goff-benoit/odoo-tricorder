const { test } = require('node:test');
const assert = require('node:assert/strict');
const modulePromise = import('../src/workflow-authoring-ui.mjs');

test('meeting data uses business names and traces its actual producer and consumer without changing identifiers', async () => {
  const { authoringPorts, portProvenance, blockDataSummary } = await modulePromise;
  const source = {id:'analyse',title:'Analyser les réunions',kind:'agent',outputs:{minutes:'string',actions:'array'}};
  const target = {id:'read',title:'Relire le compte rendu',kind:'decision',inputs:{minutes:'string',actions:'array'}};
  const graph = {nodes:[source,target],edges:[{from:'analyse',to:'read',mapping:{minutes:'minutes',actions:'actions'}}]};
  assert.equal(portProvenance(graph,source,'minutes','outputs'),'Transmis à : Relire le compte rendu');
  assert.equal(portProvenance(graph,target,'actions','inputs'),'Vient de : Analyser les réunions');
  const html = authoringPorts(source,graph);
  assert.match(html,/Compte rendu/); assert.match(html,/Liste d’actions/);
  assert.match(html,/data-port="minutes"/); assert.match(html,/type="button"/);
  assert.doesNotMatch(html,/un élément|liste de toute donnée|Zéro entrée/);
  assert.match(blockDataSummary(source),/demande initiale et contexte/);
});

test('questions request free text and simple reviews expose neither code controls nor external authorization fields', async () => {
  const {humanQuestionFields,needsOperationFields,needsCodeFields} = await modulePromise;
  assert.doesNotMatch(humanQuestionFields({kind:'question',question:'Quel impact ?'}),/approve|reject|name="options"/);
  assert.match(humanQuestionFields({kind:'decision',question:'Valider ?'}),/name="options"/);
  assert.equal(needsOperationFields({kind:'decision'}),false);
  assert.equal(needsOperationFields({kind:'decision',operation:{action:'publish'}}),true);
  assert.equal(needsCodeFields({kind:'agent',outputs:{minutes:'string'}}),false);
  assert.equal(needsCodeFields({kind:'agent',execution_mode:'edit'}),true);
});

test('model selection remains scoped to its provider and preserves an unknown saved identifier', async () => {
  const {modelChoices,modelPicker} = await modulePromise;
  const catalog = {codex:[{id:'gpt-synthetic',label:'GPT Synthetic'}],claude:[{id:'sonnet'}]};
  assert.deepEqual(modelChoices('claude',catalog,{},'local-custom'),[{id:'sonnet',label:'Claude Sonnet'},{id:'local-custom',label:'local-custom · choix enregistré'}]);
  const html = modelPicker({id:'node-model',provider:'codex',value:'private-model',catalog});
  assert.match(html,/<select[^>]+id="node-model-choice"/);
  assert.match(html,/<option value="private-model" selected>/);
  assert.match(html,/name="model" value="private-model"/);
  assert.match(html,/L’accès au modèle sera vérifié au lancement/);
  assert.doesNotMatch(html,/sonnet/);
  assert.equal((html.match(/name="model"/g)||[]).length,1);
});

test('business labels and model metadata cannot inject markup', async () => {
  const {authoringPorts,modelPicker} = await modulePromise;
  const html = authoringPorts({id:'work',kind:'task',outputs:{'<img src=x>':'string'}},{nodes:[],edges:[]});
  assert.doesNotMatch(html,/<img/); assert.match(html,/&lt;img/);
  assert.doesNotMatch(modelPicker({id:'model',provider:'codex',value:'"><script>x</script>'}),/<script>/);
});

// Names entered by nontechnical authors must remain valid contract keys.
test('information names accept natural language while preserving existing technical identifiers', async () => {
  const {informationKey} = await modulePromise;
  assert.equal(informationKey('Compte rendu détaillé'), 'Compte_rendu_detaille');
  assert.equal(informationKey('selected_meetings'), 'selected_meetings');
  assert.equal(informationKey('2 réunions'), 'information_2_reunions');
  assert.throws(() => informationKey('   '), /Donnez un nom/);
});

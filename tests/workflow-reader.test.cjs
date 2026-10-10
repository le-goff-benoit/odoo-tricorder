const {test}=require('node:test');
const assert=require('node:assert/strict');
let reader;
test.before(async()=>{reader=await import('../src/workflow-reader.mjs');});

test('model library excludes engine components and learning examples without removing them',()=>{
  const graphs=[{id:'support-conversation'},{id:'first-workflow'},{id:'communication'},{id:'custom'}];
  assert.deepEqual(reader.workflowModels(graphs).map(g=>g.id),['support-conversation','custom']);
  assert.equal(graphs.length,4);
});
test('grouped deployment keeps an outstanding production decision visible',()=>{
  const graph={id:'github-odoo-deployment',nodes:[
    {id:'staging-publish',title:'Publier',kind:'external'},
    {id:'staging-verify',title:'Vérifier',kind:'document'},
    {id:'production-approval',title:'Autoriser',kind:'decision',options:['approve','reject']},
    {id:'production-publish',title:'Publier en production',kind:'external'}],
    edges:[{from:'staging-publish',to:'staging-verify'},{from:'staging-verify',to:'production-approval'},{from:'production-approval',to:'production-publish',outcome:'approve'}]};
  const before=structuredClone(graph),run={nodes:{'staging-publish':{status:'accepted'},'staging-verify':{status:'accepted'},'production-approval':{status:'waiting'},'production-publish':{status:'pending'}}};
  const stages=reader.workflowStages(graph,run);
  assert.equal(stages.length,2);assert.equal(stages[1].state,'waiting');
  const html=reader.workflowOverview(graph,{run});
  assert.match(html,/Votre décision est attendue/);assert.match(html,/production-approval/);
  assert.deepEqual(graph,before);assert.equal(run.nodes['production-publish'].status,'pending');
});
test('alternative branches use the choice labels and pending work is never shown as running',()=>{
  const graph={id:'branch',nodes:[{id:'choose',title:'Choisir',kind:'agent',route_output:'urgency',option_labels:{critical:'Urgent'}},{id:'urgent',title:'Traiter urgence',kind:'agent'}],edges:[{from:'choose',to:'urgent',outcome:'critical'}]};
  const html=reader.workflowOverview(graph,{run:{nodes:{choose:{status:'waiting_input'},urgent:{status:'pending'}}}});
  assert.match(html,/Selon le résultat de : Choisir : Urgent/);
  assert.match(html,/Attend les étapes précédentes/);assert.doesNotMatch(html,/>En cours</);
});
test('cyclic phase grouping falls back to unambiguous work order',()=>{
  const graph={id:'cross-phase',nodes:[{id:'a',title:'A',kind:'agent',phase:'Analyse'},{id:'b',title:'B',kind:'agent',phase:'Rédaction'},{id:'c',title:'C',kind:'agent',phase:'Analyse'}],edges:[{from:'a',to:'b'},{from:'b',to:'c'}]};
  assert.deepEqual(reader.workflowStages(graph).map(s=>s.id),['a','b','c']);
});
test('roles are separate from provider names and untrusted instructions are escaped',()=>{
  const graph={id:'work',nodes:[{id:'writer',title:'Réponse',kind:'agent',profile:'writer',provider:'codex',prompt:'<script>bad()</script>',outputs:{draft:'string'}}],edges:[]};
  const html=reader.workflowOverview(graph,{profiles:[{id:'writer',title:'Agent de rédaction'}]});
  assert.match(html,/Agent de rédaction/);assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(html,/<script>/);assert.doesNotMatch(html,/Agents : codex/);
});

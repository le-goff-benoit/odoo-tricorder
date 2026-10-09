const {test} = require('node:test');
const assert = require('node:assert/strict');
let view;
test.before(async()=>{view=await import('../src/execution-view.mjs');});

test('a live conversation is not work in progress; questions, decisions and dependencies remain distinct',()=>{
  const summary=view.activitySummary([
    {status:'active',nodes:{a:{status:'waiting_input'},b:{status:'waiting'},c:{status:'running'}}},
    {status:'active',nodes:{a:{status:'ready'}}},
    {status:'paused',coordination_wait:true,nodes:{a:{status:'ready'}}},
    {status:'completed',nodes:{a:{status:'accepted'}}},
  ]);
  assert.deepEqual(summary,{running:1,questions:1,decisions:1,results:0,failed:0,dependencies:1});
});
test('failure action opens the failed block even if another block is ready',()=>{
  const run={status:'active',focus:{node:'next',title:'Next',status:'ready'},nodes:{next:{status:'ready'},work:{status:'returned',result:{ok:false,summary:'Not enough disk space'},validation_error:'Executor failed'}},definition:{nodes:[{id:'work',title:'Work'}]}};
  assert.equal(view.executionIssue(run).reason,'Not enough disk space');
  assert.deepEqual(view.executionAction(run),{node:'work',label:'Examiner l’échec',detail:'Work'});
  run.focus={node:'question',title:'Clarify scope',status:'waiting_input'};
  run.nodes.question={status:'waiting_input'};
  assert.equal(view.executionAction(run).node,'question');
  assert.equal(view.activitySummary([run]).failed,1);
});
test('accepted negative QA with a corrective branch is not an unresolved execution failure',()=>{
  const definition={id:'qa',route_output:'verdict',options:['pass','fail']};
  const negative={status:'returned',result:{ok:true,outputs:{verdict:'fail'}}};
  const run={status:'active',focus:{node:'qa',title:'QA',status:'returned'},definition:{nodes:[definition]},nodes:{qa:negative}};
  assert.equal(view.failedResult(negative,definition),false);
  assert.equal(view.executionAction(run).label,'Examiner le résultat');
  assert.equal(view.executionIssue(run),null);
  run.nodes.qa.status='accepted';run.nodes.question={status:'waiting_input'};run.focus={node:'question',title:'Choose correction',status:'waiting_input'};
  assert.equal(view.executionAction(run).label,'Répondre à la question');
  assert.equal(view.activitySummary([run]).failed,0);
  assert.equal(view.failedResult({...negative,validation_error:'Invalid proof'},definition),true);
});
test('authoritative health does not fall back to a historical failure; dependencies have no invented active block',()=>{
  const run={status:'paused',coordination_wait:true,health:{status:'ok',issues:[]},nodes:{qa:{status:'accepted',result:{ok:true,outputs:{verdict:'fail'}}}}};
  assert.equal(view.executionIssue(run),null);
  assert.equal(view.executionAction(run).label,'Voir les dépendances');
  assert.equal(view.executionAction(run).node,undefined);
});

test('finished and cancelled runs open their report instead of an empty block inspector',()=>{
  for(const status of ['completed','cancelled']) {
    const action=view.executionAction({status,nodes:{}});
    assert.equal(action.mode,'document');
    assert.equal(action.label,'Voir le rapport');
  }
});

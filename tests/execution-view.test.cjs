const {test} = require('node:test');
const assert = require('node:assert/strict');
let view;
test.before(async()=>{view=await import('../src/execution-view.mjs');});

test('completed progress separates treated steps from excluded branches without calling a refusal successful',()=>{
  const run={nodes:{diagnosis:{status:'accepted'},decision:{status:'accepted',outcome:'reject'},work:{status:'skipped'},mail:{status:'skipped'}}};
  const before=structuredClone(run),progress=view.executionProgress(run);
  assert.equal(progress.finished,4);assert.equal(progress.total,4);
  assert.equal(progress.processed,2);assert.equal(progress.skipped,2);
  assert.match(progress.detail,/2 traitées.*2 non applicables/);
  assert.doesNotMatch(progress.detail,/validée|réussie|réalisée/);
  assert.deepEqual(run,before);
  run.nodes.mail={status:'returned',result:{ok:true}};
  assert.equal(view.executionProgress(run).finished,3); // A submitted result is still awaiting receipt.
});

test('each ready block uses its own executor state and an omitted check never promises readiness',()=>{
  const run={status:'active',focus:{node:'native',status:'ready'},nodes:{native:{status:'ready'},omitted:{status:'ready'},done:{status:'accepted'}},launch:{label:'Prête au lancement',nodes_truncated:true,nodes:[{node:'native',status:'native',reason:'Continuez dans le terminal.'}]}};
  assert.equal(view.launchReadiness(run,'native').label,'À poursuivre dans le terminal');
  assert.equal(view.launchReadiness(run,'omitted').status,'unknown');
  assert.equal(view.launchReadiness(run,'done'),null);
  run.focus={node:'omitted',status:'ready'};
  assert.equal(view.executionAction(run).label,'Vérifier le bloc');
  assert.match(view.executionAction(run).detail,/pas détaillée/);
});

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

test('retry guidance explains exhaustion without suggesting an unsafe external replay',()=>{
  assert.match(view.retryGuidance({attempt:2},{max_attempts:2}),/2 tentatives sur 2/);
  assert.match(view.retryGuidance({attempt:2},{max_attempts:2}),/nouvelle demande/);
  assert.match(view.retryGuidance({attempt:1},{max_attempts:2}),/avant de relancer/);
  assert.match(view.retryGuidance({attempt:2,effect_uncertain:true},{max_attempts:2}),/opération externe/);
});

test('cancelled dependent work opens the report instead of an obsolete wait',()=>{assert.equal(view.executionAction({status:'cancelled',coordination_wait:true}).detail,'Exécution annulée.');});

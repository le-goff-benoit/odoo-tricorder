const {test} = require('node:test');
const assert = require('node:assert/strict');
test('pilotage distinguishes publication, verified deployment and tests to renew', async () => {
  const {taskState} = await import('../src/task-state.mjs');
  const task={status:'validated',delivery:{status:'published',verified:false}};
  assert.equal(taskState(task).column,'done');
  task.delivery={status:'deployed_verified',verified:false};
  assert.equal(taskState(task).column,'done');
  task.delivery.verified=true;
  assert.equal(taskState(task).column,'deployed');
  assert.equal(taskState({status:'stale',progress:'received'}).label,'Tests à reprendre');
  assert.equal(taskState({status:'running'},{nodes:[{id:'qa',status:'claimed'}]}).label,'Tests en cours');
});
test('known subtotals, missing tokens and revised forecasts are identical across views', async () => {
  const {totals,timeTable} = await import('../src/pilotage.mjs');
  const {effortCards} = await import('../src/release-kanban.mjs');
  const detail={tasks:[{id:'A'},{id:'B'}],effort:{rows:[
    {task:'A',agent:'dev',initial:{expected_minutes:10},revised:{expected_minutes:20},actual_minutes:15,tokens:{total_tokens:30}},
    {task:'B',agent:'qa',initial:{expected_minutes:5},actual_minutes:null,tokens:null},
    {task:'RELEASE',title:'Livraison',agent:'main',initial:{expected_minutes:3},actual_minutes:2,tokens:{total_tokens:5}}
  ]}};
  const cards=effortCards(detail), total=totals(cards);
  assert.equal(total.initial,28);assert.equal(total.actual,17);assert.equal(total.partial,true);
  assert.equal(total.tokens,35);assert.equal(total.tokenPartial,true);
  const html=timeTable(cards,String,true);
  assert.match(html,/0 h 17 min · à compléter/);assert.match(html,/35 · à compléter/);
  assert.equal((html.match(/Total connu/g)||[]).length,1);
});
test('recorded tokens survive unavailable native durations',async()=>{
  const {taskMeasures}=await import('../src/measurements.mjs');
  const value=taskMeasures([{tokens:{total_tokens:140},actual_minutes:null,token_complete:false}],[]);
  assert.equal(value.actual,null);assert.equal(value.tokens,140);assert.equal(value.tokenPartial,true);
});

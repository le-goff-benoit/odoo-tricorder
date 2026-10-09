const test=require('node:test');
const assert=require('node:assert/strict');
test('questions remain visible in every collapsed phase and tray projection',async()=>{
 const {displayGraph}=await import('../src/studio-model.js');
 const {summarize,menuItems}=require('../electron/studio-tray.cjs');
 const graph={nodes:[{id:'ask',kind:'question',title:'Préciser',phase:'Analyse'}],edges:[],title:'Support'};
 const run={id:'r',project:'p',status:'active',definition:graph,nodes:{ask:{status:'waiting_input'}}};
 assert.equal(displayGraph(graph,new Set(['Analyse']),run).nodes[0].status,'waiting_input');
 assert.equal(summarize([run]).severity,'waiting');
 assert.match(summarize([run]).detail,/1 question/);
 let destination; const item=menuItems([run],d=>destination=d,()=>{},()=>{}).find(i=>i.label?.includes('Support'));
 assert.match(item.label,/1 question/);item.click();assert.equal(destination.node,'ask');
});
test('changing provider and model preserves effort, session and unrelated node settings',async()=>{
 const {withWorkflowAI}=await import('../src/studio-model.js');
 const before={defaults:{effort:'low',session:'main'},nodes:[{kind:'agent',id:'a',effort:'medium',session:'delegated',profile:'generalist',resources:['repo'],provider:'codex',model:'old'}]};
 const after=withWorkflowAI(before,{provider:'claude',model:'new'});
 assert.equal(after.defaults.effort,'low');assert.equal(after.defaults.session,'main');
 assert.equal(after.nodes[0].effort,'medium');assert.equal(after.nodes[0].session,'delegated');assert.deepEqual(after.nodes[0].resources,['repo']);
});

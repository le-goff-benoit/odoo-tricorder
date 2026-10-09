const {test}=require('node:test'),assert=require('node:assert/strict');
let layout;test.before(async()=>{layout=(await import('../src/execution-layout.mjs')).executionLayout;});
test('execution map preserves branches, merge order and original editor positions',()=>{
const graph={nodes:['intent','left','right','join','decision'].map((id,i)=>({id,position:{x:i*400,y:80}})),edges:[{from:'intent',to:'left'},{from:'intent',to:'right'},{from:'left',to:'join'},{from:'right',to:'join'},{from:'join',to:'decision'}]};const before=JSON.stringify(graph),map=layout(graph,560),n=Object.fromEntries(map.nodes.map(n=>[n.id,n]));assert.equal(JSON.stringify(graph),before);assert.equal(n.left.position.y,n.right.position.y);assert.ok(n.left.position.x+map.nodeWidth<n.right.position.x);assert.ok(n.join.position.y>n.right.position.y);assert.ok(n.decision.position.y>n.join.position.y);assert.deepEqual(map.edges,graph.edges);assert.ok(map.layoutWidth<=560);
});
test('single-column map keeps text size while long and disconnected workflows remain addressable',()=>{
const graph={nodes:Array.from({length:80},(_,i)=>({id:'n'+i})),edges:Array.from({length:79},(_,i)=>({from:'n'+i,to:'n'+(i+1)}))};const map=layout(graph,420);assert.equal(map.nodes.length,80);assert.ok(map.nodeWidth>=240);assert.ok(map.nodes.at(-1).position.y>map.nodes[0].position.y);assert.ok(map.nodes.every(n=>n.position.x>=0&&n.position.x+map.nodeWidth<=420));const disconnected=layout({nodes:[{id:'a'},{id:'b'}],edges:[]},400);assert.ok(disconnected.nodes[0].position.x<disconnected.nodes[1].position.x);
});

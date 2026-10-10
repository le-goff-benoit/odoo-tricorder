const {test}=require('node:test');const assert=require('node:assert/strict');
test('same template reuses definition but never overwrites a customized or archived copy',async()=>{
 const {sameTemplate,templateDefinition}=await import('../src/template-reuse.mjs');
 const source={schema:1,id:'source',revision:2,title:'Réunion',parameters:{request:'ancienne demande',language:'fr'},nodes:[{id:'a',kind:'agent',title:'Analyser',prompt:'Vérifier les sources'}],edges:[]};
 const saved={...templateDefinition(source),id:'local',revision:5};
 assert.ok(sameTemplate(source,saved));assert.equal(saved.parameters.request,undefined);
 assert.ok(!sameTemplate(source,{...saved,title:'Ma variante'}));assert.ok(!sameTemplate(source,{...saved,archived:true}));
 assert.equal(source.parameters.request,'ancienne demande');
});

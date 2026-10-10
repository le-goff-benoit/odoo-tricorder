const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
let sources;
before(async()=>{sources=await import('../src/workflow-schedule-sources.mjs');});
const read={plugin_id:'notes',title:'Notes & réunions',identity:'Équipe locale',qualified:true,usable:true,connected:true,operations:['find','send'],effects:{find:'read',send:'notify'}};
const graph=()=>({schema:2,id:'meeting',title:'Suivi réunion',nodes:[{id:'source',title:'Lire les sources',kind:'agent',session:'delegated',profile:'recherche',required_capabilities:['read'],validation:'contract',outputs:{sources:{type:'array',items:'object',required:true,minItems:1}},prompt:'Lire les sources choisies.'},{id:'write',title:'Rédiger',kind:'agent',validation:'contract',inputs:{sources:{type:'array',items:'object',required:true,minItems:1}},outputs:{draft:'string'}}],edges:[{id:'source-write',from:'source',to:'write',mapping:{sources:'sources'}}]});
const form=values=>({querySelector(selector){const name=selector.match(/name="([^"]+)"/)?.[1];return Object.hasOwn(values,name)?{value:values[name]}:null;}});

test('only currently qualified read operations are offered and user text is escaped',()=>{
 const html=sources.scheduleSourceForm({graph:graph(),capabilities:[read,{...read,plugin_id:'unqualified',qualified:false},{...read,plugin_id:'notify-only',effects:{find:'notify',send:'notify'}}],draft:{source_query:'<script>bad</script>'}});
 assert.match(html,/Notes &amp; réunions/);assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/unqualified|notify-only|value=.*send/);
 assert.match(html,/aucun livrable n’est inventé/);
});

test('recurring connection snapshot inserts a real read and empty-source branch without weakening result contracts',()=>{
 const original=graph(), before=structuredClone(original);
 const result=sources.readScheduleSources(form({source_mode:'connection',source_binding:JSON.stringify({plugin:'notes',operation:'find'}),source_query:'Notes de cette équipe',source_scope:'Équipe produit'}),original,[read]);
 const snapshot=result.graph, watch=snapshot.nodes.find(node=>node.kind==='watch'), source=snapshot.nodes.find(node=>node.id==='source');
 assert.deepEqual(watch.capabilities,[{plugin:'notes',operation:'find'}]);assert.deepEqual(watch.required_capabilities,['read']);
 assert.deepEqual(watch.source_polling,{version:1,query:'Notes de cette équipe',scope:'Équipe produit'});
 assert.equal(source.outputs.sources.minItems,1);assert.equal(snapshot.nodes.find(node=>node.id==='write').inputs.sources.minItems,1);
 assert.equal(source.inputs.source_message.required,true);assert.match(source.prompt,/inputs.source_message/);
 assert.equal(result.parameters.schedule_source_query,'Notes de cette équipe');assert.deepEqual(original,before);
 validate(snapshot);
});

test('fixed source is an explicit text-only variant and clears stale request context',()=>{
 const original=graph();original.parameters={request:'Ancienne demande',source_context:{text:'Ancien contenu'},language:'fr'};
 const result=sources.readScheduleSources(form({source_mode:'fixed',source_fixed_text:'Notes choisies à répéter'}),original,[]);
 assert.equal(result.graph.schedule_source.mode,'fixed');assert.deepEqual(result.graph.nodes[0].required_capabilities,['text']);
 assert.match(result.graph.nodes[0].prompt,/uniquement le texte fourni/);
 assert.equal(result.parameters.schedule_fixed_source,'Notes choisies à répéter');
 assert.equal(result.graph.parameters.source_context,undefined);assert.equal(result.graph.parameters.language,'fr');
 assert.equal(original.parameters.request,'Ancienne demande');validate(result.graph);
});

test('unqualified or writable connections cannot be selected through manipulated form values',()=>{
 const values={source_mode:'connection',source_binding:JSON.stringify({plugin:'notes',operation:'send'}),source_query:'Tout',source_scope:'Équipe'};
 assert.throws(()=>sources.readScheduleSources(form(values),graph(),[read]),/connexion réellement vérifiée/);
 values.source_binding=JSON.stringify({plugin:'notes',operation:'find'});
 assert.throws(()=>sources.readScheduleSources(form(values),graph(),[{...read,qualified:false}]),/connexion réellement vérifiée/);
 values.source_scope='';assert.throws(()=>sources.readScheduleSources(form(values),graph(),[read]),/Précisez/);
});

function validate(snapshot){const result=spawnSync('python3',['-c',"import sys,json;sys.path.insert(0,'backend');from workflow_engine import validate;validate(json.load(sys.stdin))"],{cwd:require('node:path').resolve(__dirname,'..'),input:JSON.stringify(snapshot),encoding:'utf8'});assert.equal(result.status,0,result.stderr);}

test('an independent initial branch cannot be announced as waiting for fresh sources',()=>{
 const original=graph();original.nodes.push({id:'independent',title:'Autre travail',kind:'agent',outputs:{result:'string'}});
 const values={source_mode:'connection',source_binding:JSON.stringify({plugin:'notes',operation:'find'}),source_query:'Notes',source_scope:'Atlas'};
 assert.throws(()=>sources.readScheduleSources(form(values),original,[read]),/seule étape initiale/);
 assert.match(sources.scheduleSourceForm({graph:original,capabilities:[read]}),/ne possède pas d’étape initiale/);
});
test('converting a source clears old source values even in local agent parameters',()=>{
 const original=graph();original.nodes[0].parameters={schedule_fixed_source:'ANCIEN',schedule_source_query:'ANCIEN',schedule_source_scope:'ANCIEN',language:'fr'};
 const result=sources.readScheduleSources(form({source_mode:'fixed',source_fixed_text:'NOUVEAU'}),original,[]);
 assert.deepEqual(result.graph.nodes[0].parameters,{language:'fr'});assert.equal(result.parameters.schedule_fixed_source,'NOUVEAU');assert.equal(original.nodes[0].parameters.schedule_fixed_source,'ANCIEN');validate(result.graph);
});

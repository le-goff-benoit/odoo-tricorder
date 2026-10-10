const test=require('node:test');const assert=require('node:assert/strict');
const modulePromise=import('../src/workflow-sources.mjs');
const file={id:'batch:1',name:'réunion <mai>.txt',path:'/tmp/state/sources/batch/01-reunion.txt',size:40,sha256:'a'.repeat(64),media_type:'text/plain'};
test('combining uploaded files, notes and mail preserves provenance without claiming retrieval',async()=>{
 const {sourcesFromDraft}=await modulePromise;const value=sourcesFromDraft({text:'Décision : vendredi',files:[file],email_reference:'Objet réunion du 10',links:'https://example.org/minutes\nDOCUMENT-42',meeting_selection:'Réunion produit du 10',meeting_period:'Semaine 41'});
 assert.match(value.request,/Décision : vendredi/);assert.match(value.request,/copies conservées/);assert.match(value.request,/message non encore lu/);assert.match(value.request,/préciser les réunions ambiguës/);assert.equal(value.source_context.files[0].sha256,file.sha256);assert.equal(value.source_context.email_references[0].status,'to_retrieve');assert.equal(value.source_context.document_references.length,2);
 value.source_context.files[0].name='changed';assert.equal(file.name,'réunion <mai>.txt');
});
test('source form supports multi-source meetings and escapes names without embedding private read requests',async()=>{
 const {sourceForm}=await modulePromise;const html=sourceForm({graph:{id:'meeting-conversation'},draft:{files:[file],text:'<script>bad</script>'}});
 assert.match(html,/meeting-selection/);assert.match(html,/meeting-period/);assert.match(html,/pick-workflow-sources/);assert.match(html,/réunion &lt;mai&gt;.txt/);assert.doesNotMatch(html,/<script>/);assert.doesNotMatch(html,/\/tmp\/state/);assert.match(html,/ne signifie pas que l’email a déjà été lu/);
});
test('source limits apply across native picker batches',async()=>{
 const {sourcesFromDraft}=await modulePromise;assert.throws(()=>sourcesFromDraft({files:Array.from({length:21},()=>file)}),/limites/);assert.throws(()=>sourcesFromDraft({files:[{...file,sha256:'invalid'}]}),/invalide/);assert.throws(()=>sourcesFromDraft({files:Array.from({length:5},(_,i)=>({...file,id:String(i),size:16*1024*1024}))}),/limites/);
});
test('blank sources create no imaginary retrieval',async()=>{
 const {sourcesFromDraft}=await modulePromise;const value=sourcesFromDraft();assert.equal(value.request,'');assert.deepEqual(value.source_context.files,[]);assert.deepEqual(value.source_context.email_references,[]);
});

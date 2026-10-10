const {test}=require('node:test'),assert=require('node:assert/strict');
test('launch form retains false and zero defaults, escapes labels and makes missing choices explicit',async()=>{
 const {launchFields}=await import('../src/workflow-launch.mjs');
 const html=launchFields({parameters:{count:0,agree:false},launch_fields:[{key:'count',label:'Nombre <exact>',type:'number',required:true},{key:'agree',label:'Accord',type:'boolean',required:true},{key:'channel',label:'Canal',type:'choice',options:['Email','Ticket Odoo']}]});
 assert.match(html,/Nombre &lt;exact&gt;/);assert.match(html,/value="0"/);assert.match(html,/value="false" selected/);assert.match(html,/value="Ticket Odoo"/);assert.match(html,/value="">Choisir/);
});
test('business labels survive typed linking and display without changing mapping keys',async()=>{
 const {connectInformation}=await import('../src/workflow-usage-ui.mjs'),{authoringPorts,blockDataSummary}=await import('../src/workflow-authoring-ui.mjs');
 const g=connectInformation({schema:2,nodes:[{id:'a',title:'Analyse',kind:'task',outputs:{synthese:{type:'string',required:true}},port_labels:{outputs:{synthese:'Synthèse détaillée'}}},{id:'b',title:'Décision',kind:'decision'}],edges:[]},{from:'a',output:'synthese',to:'b',input:'Éléments à vérifier',outcome:'done'});
 assert.equal(g.edges[0].mapping.synthese,'Elements_a_verifier');assert.equal(g.nodes[1].port_labels.inputs.Elements_a_verifier,'Éléments à vérifier');assert.match(authoringPorts(g.nodes[1],g),/Éléments à vérifier/);assert.match(blockDataSummary(g.nodes[0]),/Synthèse détaillée/);
});
test('connection verification describes its scope without certifying business operations',async()=>{
 const {connectionStatus,connectionEvidence}=await import('../src/connection-status.mjs');
 assert.match(connectionStatus({id:'gmail',available:true}),/Service proposé/);
 assert.match(connectionStatus({plugin_id:'gmail',installed:true}),/non vérifiée/);
 const cap={plugin_id:'gmail',qualified:true,effects:{read_messages:'read',create_draft:'write'},identity:'Test <account>'};
 assert.equal(connectionStatus(cap),'Adaptateur vérifié');assert.match(connectionEvidence(cap),/Écriture/);assert.match(connectionEvidence(cap),/n’exécute pas/);assert.match(connectionEvidence(cap),/Test &lt;account&gt;/);
});

function formElement(key,value,dataset={},confirmed=false) {
 const element={value,dataset:{launchAnswer:key,...dataset},focus(){this.focused=true;}};
 return {element,querySelectorAll(selector){return selector==='[data-launch-answer]'?[element]:selector==='[data-launch-confirm]'?[{dataset:{launchConfirm:key},checked:confirmed}]:[];}};
}
test('replacement displays obsolete optional choice and refuses it until an explicit selection or clearing',async()=>{
 const {launchFields,readLaunchValues}=await import('../src/workflow-launch.mjs');
 const graph={launch_fields:[{key:'channel',label:'Canal',type:'choice',options:['Email'],required:false}]};
 const html=launchFields(graph,{channel:'Ticket Odoo'});
 assert.match(html,/Ancienne réponse à corriger : Ticket Odoo/);assert.match(html,/data-launch-invalid-option="__previous_launch_answer__"/);assert.match(html,/value="__previous_launch_answer__" selected/);
 const form=formElement('channel','__previous_launch_answer__',{launchPrevious:'"Ticket Odoo"',launchInvalidOption:'__previous_launch_answer__'});
 assert.throws(()=>readLaunchValues(form,graph),/ancienne réponse/);assert.equal(form.element.focused,true);
 assert.deepEqual(readLaunchValues(form,graph,false),{channel:'Ticket Odoo'});
 form.element.value='';assert.deepEqual(readLaunchValues(form,graph),{channel:null});
 form.element.value='Email';assert.deepEqual(readLaunchValues(form,graph),{channel:'Email'});
});
test('changed number type preserves incompatible text and requires explicit correction or confirmation',async()=>{
 const {launchFields,readLaunchValues}=await import('../src/workflow-launch.mjs');
 const graph={launch_fields:[{key:'count',label:'Nombre',type:'number',required:false}]};
 const html=launchFields(graph,{count:'ancien <texte>'});
 assert.match(html,/type="text"[^>]+value="ancien &lt;texte&gt;"/);assert.match(html,/J’ai vérifié cette réponse/);
 const form=formElement('count','ancien texte',{launchPrevious:'"ancien texte"',launchPreviousText:'ancien texte'});
 assert.throws(()=>readLaunchValues(form,graph),/ancienne réponse/);
 assert.deepEqual(readLaunchValues(form,graph,false),{count:'ancien texte'});
 form.element.value='toujours invalide';assert.throws(()=>readLaunchValues(form,graph),/nombre/);
 assert.deepEqual(readLaunchValues(form,graph,false),{count:'toujours invalide'});
 form.element.value='0';assert.deepEqual(readLaunchValues(form,graph),{count:0});
 form.element.value='';assert.deepEqual(readLaunchValues(form,graph),{count:null});
 const numericText=formElement('count','2',{launchPrevious:'"2"',launchPreviousText:'2'});
 assert.throws(()=>readLaunchValues(numericText,graph),/ancienne réponse/);
 assert.deepEqual(readLaunchValues(formElement('count','2',numericText.element.dataset,true),graph),{count:2});
});
test('boolean type changes cannot silently turn stale values into false',async()=>{
 const {launchFields,readLaunchValues}=await import('../src/workflow-launch.mjs');
 const graph={launch_fields:[{key:'agree',label:'Accord',type:'boolean',required:false}]};
 const html=launchFields(graph,{agree:'false'});
 assert.match(html,/Ancienne réponse à corriger : false/);assert.doesNotMatch(html,/value="false" selected/);
 const form=formElement('agree','__previous_launch_answer__',{launchPrevious:'"false"',launchInvalidOption:'__previous_launch_answer__'});
 assert.throws(()=>readLaunchValues(form,graph),/ancienne réponse/);
 form.element.value='false';assert.deepEqual(readLaunchValues(form,graph),{agree:false});
 form.element.value='nonsense';assert.throws(()=>readLaunchValues(form,graph),/Oui ou Non/);
});

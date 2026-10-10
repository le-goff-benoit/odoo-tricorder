const {test}=require('node:test'),assert=require('node:assert/strict');
const helpers=import('../src/workflow-usage-ui.mjs');
const graph=()=>({schema:1,nodes:[{id:'ask',kind:'question',outputs:{answer:'string'}},{id:'work',kind:'task'}],edges:[{id:'order',from:'ask',to:'work',outcome:'done'}]});
test('receiving a result adds the input and reuses an order link without mutating the draft',async()=>{
 const {connectInformation}=await helpers,g=graph(),next=connectInformation(g,{from:'ask',output:'answer',to:'work',input:'Brief client',outcome:'done'});
 assert.deepEqual(next.nodes[1].inputs,{Brief_client:'string'});assert.deepEqual(next.edges[0].mapping,{answer:'Brief_client'});assert.equal(next.edges.length,1);assert.equal(g.nodes[1].inputs,undefined);
});
test('guided receiving refuses cycles, duplicate data and silent mapping replacement',async()=>{
 const {connectInformation}=await helpers,g=graph(),args={from:'ask',output:'answer',to:'work',input:'Brief',outcome:'done'};
 g.edges.push({from:'work',to:'ask',outcome:'done'});assert.throws(()=>connectInformation(g,args),/boucle/);g.edges.pop();
 g.nodes[1].inputs={Brief:'string'};assert.throws(()=>connectInformation(g,args),/existe déjà/);delete g.nodes[1].inputs;
 g.edges[0].mapping={answer:'old'};assert.throws(()=>connectInformation(g,args),/déjà transmis/);
});
test('guided receiving preserves list contracts and requires an explicit branch',async()=>{
 const {connectInformation}=await helpers,g=graph();g.schema=2;g.nodes[0]={id:'ask',kind:'agent',route_output:'severity',options:['critical','normal'],outputs:{actions:{type:'array',items:'object',minItems:1,required:true}}};g.edges=[];
 const args={from:'ask',output:'actions',to:'work',input:'Actions',outcome:'done'};assert.throws(()=>connectInformation(g,args),/branche/);args.outcome='normal';const next=connectInformation(g,args);assert.deepEqual(next.nodes[1].inputs.Actions,g.nodes[0].outputs.actions);assert.equal(next.edges[0].outcome,'normal');
});
test('final deliverables follow dependencies rather than definition order and exclude human answers',async()=>{
 const {finalDeliverables}=await helpers;const run={status:'completed',definition:{nodes:[{id:'final',kind:'task'},{id:'q',kind:'question'},{id:'first',kind:'task'}],edges:[{from:'first',to:'q'},{from:'q',to:'final'}]},nodes:{first:{status:'accepted',result:{outputs:{draft:'Intermediate'}}},q:{status:'accepted',result:{outputs:{answer:'Odoo'}}},final:{status:'accepted',result:{outputs:{draft:'Final answer'}}}}};assert.deepEqual(finalDeliverables(run).map(x=>x.text),['Final answer']);run.status='active';assert.deepEqual(finalDeliverables(run),[]);
});
test('structured final deliverables stay visible instead of being replaced by an execution summary',async()=>{
 const {finalDeliverables,localWorkflow}=await helpers;const value=[{title:'Bilan',result:'Léa réserve la salle'}];
 const run={status:'completed',definition:{nodes:[{id:'each',kind:'foreach'}],edges:[]},nodes:{each:{status:'accepted',result:{summary:'1 résultat',outputs:{results:value,contributions:[]}}}}};const outputs=finalDeliverables(run);assert.equal(outputs.length,1);assert.deepEqual(outputs[0].value,value);assert.equal(outputs[0].text,null);
 assert.equal(localWorkflow({nodes:[{kind:'document',capabilities:[{plugin:'read'}]}]}),false);assert.equal(localWorkflow({nodes:[{kind:'command'},{kind:'decision'}]}),true);assert.equal(localWorkflow({nodes:[{kind:'decision'},{kind:'document',content:'Texte prêt'}]}),true);assert.equal(localWorkflow({nodes:[{kind:'question'},{kind:'document'}]}),false);assert.equal(localWorkflow({nodes:[{kind:'document',content:'Texte',capabilities:[{plugin:'read'}]}]}),false);
});
test('a new condition follows the received answer without overriding a configured parameter',async()=>{
 const {connectInformation}=await helpers,g=graph();g.schema=2;g.nodes[1].kind='condition';g.nodes[1].parameter='choice';
 const args={from:'ask',output:'answer',to:'work',input:'Canal choisi',outcome:'done'};
 const next=connectInformation(g,args);assert.equal(next.nodes[1].parameter,'Canal_choisi');assert.deepEqual(next.nodes[1].inputs.Canal_choisi,{type:'string',required:true});
 g.parameters={choice:'email'};assert.equal(connectInformation(g,args).nodes[1].parameter,'choice');
 const {designWarnings}=await import('../src/workflow-design.mjs');assert.ok(designWarnings({...g,parameters:{}}).some(w=>w.code==='condition-source'));assert.ok(!designWarnings(next).some(w=>w.code==='condition-source'));
});
test('human choices accept natural labels, preserve linked IDs on rename and refuse dangling branches',async()=>{
 const {humanChoices}=await helpers;const n={id:'gate',kind:'decision'};Object.assign(n,humanChoices(n,'Email client\nRéponse dans Odoo'));
 assert.deepEqual(n.options,['Email_client','Reponse_dans_Odoo']);assert.equal(n.option_labels.Reponse_dans_Odoo,'Réponse dans Odoo');
 const edges=[{from:'gate',outcome:'Email_client',to:'email'}];const renamed=humanChoices(n,'Email au client\nRéponse dans Odoo',edges);assert.equal(renamed.options[0],'Email_client');assert.equal(renamed.option_labels.Email_client,'Email au client');
 assert.throws(()=>humanChoices(n,'Réponse dans Odoo\nAutre destination',edges),/liaison/);
 const {decisionLabel}=await import('../src/business-results.mjs');assert.equal(decisionLabel('Email_client',renamed),'Email au client');
});

test('renaming a linked legacy choice preserves its branch and operation approvals keep their meaning',async()=>{
 const {humanChoices}=await helpers;const node={id:'gate',kind:'decision',options:['approve','reject']}, edges=[{from:'gate',outcome:'approve',to:'send'},{from:'gate',outcome:'reject',to:'stop'}];
 const result=humanChoices(node,'Email client\nTicket Odoo',edges);assert.deepEqual(result.options,node.options);assert.equal(result.option_labels.approve,'Email client');
 assert.throws(()=>humanChoices({...node,operation:{action:'send'}},'Email client\nTicket Odoo',edges),/liaison|autorisation/);
});

test('default human choices are written in French without changing approval semantics',async()=>{
 const {humanChoices}=await helpers;const node={id:'gate',kind:'decision',operation:{action:'send'}};assert.deepEqual(humanChoices(node,'Approuver la suite\nRefuser la suite'),{options:['approve','reject'],option_labels:{}});
 const {humanQuestionFields}=await import('../src/workflow-authoring-ui.mjs');assert.match(humanQuestionFields(node),/Approuver la suite/);assert.doesNotMatch(humanQuestionFields(node),/>approve/);
});

test('custom synthesis remains visible and copyable beside a final actions list',async()=>{
 const {finalDeliverables}=await helpers;const run={status:'completed',definition:{nodes:[{id:'work',kind:'task'}],edges:[]},nodes:{work:{status:'accepted',result:{outputs:{actions:[{action:'Prioriser'}],Synthese_produit:'Le CSV est prioritaire.'}}}}};const result=finalDeliverables(run);assert.equal(result.length,2);assert.equal(result[0].text,'Le CSV est prioritaire.');assert.deepEqual(result[1].value,[{action:'Prioriser'}]);
});

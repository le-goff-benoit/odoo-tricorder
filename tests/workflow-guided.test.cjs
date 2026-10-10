const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
let guided;
before(async()=>{guided=await import('../src/workflow-guided.mjs');});
const step=(id,title,extra={})=>({id,title,mission:`Effectuer ${title}`,result:`Résultat ${title}`,profile:'generalist',review:'never',start:'start',criteria:[],...extra});
const values=steps=>({id:'method-test',title:'Comparer les demandes',goal:'Une synthèse vérifiée',source:'Deux documents fournis par la personne',steps});

test('two analyses run in parallel and synthesis receives both results before independent verification',()=>{
 const graph=guided.buildGuidedWorkflow(values([step('analysis-a','Analyse A'),step('analysis-b','Analyse B',{start:'parallel',after:'analysis-a'}),step('synthesis','Synthèse',{start:'all',depends_on:['analysis-a','analysis-b']}),step('check','Vérification',{start:'after',after:'synthesis'})]));
 assert.deepEqual(graph.nodes[0].inputs,{}); // The user source is not an unbound inter-step port.
 assert.equal(graph.nodes.find(node=>node.id==='synthesis').inputs['result_analysis-a'].required,true);
 assert.match(guided.guidedCoordination(graph.authoring)[2].description,/tous les résultats/);
 engineCheck(graph,`
run=engine.start(project['id'],graph,simulation=True)
assert run['nodes']['analysis-a']['status']=='ready'
assert run['nodes']['analysis-b']['status']=='ready'
claim_a=engine.claim(run['id'],'analysis-a')
claim_b=engine.claim(run['id'],'analysis-b')
run=engine.submit(run['id'],'analysis-a',claim_a['token'],{'ok':True,'summary':'A','outputs':{'result':'Constat A'}})
assert run['nodes']['synthesis']['status']=='pending'
run=engine.submit(run['id'],'analysis-b',claim_b['token'],{'ok':True,'summary':'B','outputs':{'result':'Constat B'}})
assert run['nodes']['synthesis']['status']=='ready'
claim=engine.claim(run['id'],'synthesis')
assert claim['run']['nodes']['synthesis']['inputs']=={'result_analysis-a':'Constat A','result_analysis-b':'Constat B'}
assert run['nodes']['check']['status']=='pending'
run=engine.submit(run['id'],'synthesis',claim['token'],{'ok':True,'summary':'Synthèse','outputs':{'result':'Synthèse AB'}})
assert run['nodes']['check']['status']=='ready'
assert run['nodes']['check']['inputs']=={'result_synthesis':'Synthèse AB'}
`);
});

test('conditional human review continues without interruption for normal work and pauses only on a real decision',()=>{
 const graph=guided.buildGuidedWorkflow(values([step('analysis','Diagnostic',{review:'needed'}),step('response','Réponse',{start:'after',after:'analysis'})]));
 engineCheck(graph,`
for needs_review in ['no','yes']:
 run=engine.start(project['id'],graph,simulation=True)
 claim=engine.claim(run['id'],'analysis')
 run=engine.submit(run['id'],'analysis',claim['token'],{'ok':True,'summary':'Diagnostic','outputs':{'result':'Diagnostic réel','needs_review':needs_review}})
 if needs_review=='no':
  assert run['nodes']['analysis-review']['status']=='skipped'
  assert run['nodes']['response']['status']=='ready'
 else:
  assert run['nodes']['analysis-review']['status']=='waiting'
  assert run['nodes']['response']['status']=='pending'
  decision=run['nodes']['analysis-review']
  run=engine.decide(run['id'],'analysis-review',decision['nonce'],decision['proposal'],'approve',human=True)
  assert run['nodes']['response']['status']=='ready'
 assert run['nodes']['response']['inputs']=={'result_analysis':'Diagnostic réel'}
run=engine.start(project['id'],graph,simulation=True)
claim=engine.claim(run['id'],'analysis')
run=engine.submit(run['id'],'analysis',claim['token'],{'ok':True,'summary':'Anomalie','outputs':{'result':'À préciser','needs_review':'yes'}})
decision=run['nodes']['analysis-review']
run=engine.decide(run['id'],'analysis-review',decision['nonce'],decision['proposal'],'reject',human=True)
assert run['nodes']['response']['status']=='skipped'
assert run['completion_outcome']=='rejected'
`);
});

test('a rejected prerequisite cannot be bypassed by another successful parallel branch',()=>{
 const graph=guided.buildGuidedWorkflow(values([step('analysis-a','Analyse A',{review:'always'}),step('analysis-b','Analyse B'),step('synthesis','Synthèse',{start:'all',depends_on:['analysis-a','analysis-b']})]));
 engineCheck(graph,`
run=engine.start(project['id'],graph,simulation=True)
for nid in ['analysis-a','analysis-b']:
 claim=engine.claim(run['id'],nid)
 run=engine.submit(run['id'],nid,claim['token'],{'ok':True,'summary':nid,'outputs':{'result':nid}})
decision=run['nodes']['analysis-a-review']
run=engine.decide(run['id'],'analysis-a-review',decision['nonce'],decision['proposal'],'reject',human=True)
assert run['nodes']['synthesis']['status']=='blocked'
assert 'result_analysis-a' in run['nodes']['synthesis']['reason']
`);
});

test('a failed parallel analysis does not release synthesis using the other analysis alone',()=>{
 const graph=guided.buildGuidedWorkflow(values([step('a','Analyse A'),step('b','Analyse B'),step('s','Synthèse',{start:'all',depends_on:['a','b']})]));
 engineCheck(graph,`
from workflow_engine import ContractError
run=engine.start(project['id'],graph,simulation=True)
for nid,ok in [('a',True),('b',False)]:
 claim=engine.claim(run['id'],nid)
 run=engine.submit(run['id'],nid,claim['token'],{'ok':ok,'summary':'Résultat' if ok else 'Analyse impossible','outputs':{'result':'Constat'} if ok else {}})
assert run['nodes']['s']['status']=='pending'
try:
 engine.claim(run['id'],'s')
 raise AssertionError('Synthèse démarrée avec une analyse en échec')
except ContractError:
 pass
`);
});

test('guided editing keeps configured providers, layout, identity and untouched graph without destroying advanced changes',()=>{
 const original=guided.buildGuidedWorkflow(values([step('analysis','Analyse')]));
 original.defaults={provider:'claude',model:'configured-model'};
 original.parameters={language:'fr'};
 original.layout={notes:[]};original.revision=3;
 original.nodes[0].model='specific-model';original.nodes[0].position={x:400,y:300};
 const changed=structuredClone(original.authoring);changed.steps[0].mission='Une analyse améliorée';
 const graph=guided.buildGuidedWorkflow(changed,original);
 assert.deepEqual(graph.defaults,original.defaults);assert.deepEqual(graph.layout,original.layout);
 assert.equal(graph.nodes[0].model,'specific-model');assert.deepEqual(graph.nodes[0].position,{x:400,y:300});
 assert.match(graph.nodes[0].prompt,/Une analyse améliorée/);
 assert.doesNotMatch(original.nodes[0].prompt,/Une analyse améliorée/);
 assert.equal(guided.canEditGuided(graph),true);
 const advanced=structuredClone(original);advanced.nodes[0].prompt+='\nUne consigne ajoutée dans le mode avancé';
 assert.equal(guided.canEditGuided(advanced),false);
 assert.throws(()=>guided.buildGuidedWorkflow(changed,advanced),/configuration détaillée/);
 const old={schema:1,id:'old',title:'Ancienne méthode',nodes:[{id:'a',kind:'agent',title:'A'}],edges:[]};
 assert.equal(guided.canEditGuided(old),false);assert.throws(()=>guided.guidedForm({graph:old}),/étapes détaillées/);
});

test('removing conditional review clears obsolete routing while keeping configured agent models',()=>{
 const original=guided.buildGuidedWorkflow(values([step('a','Analyse',{review:'needed'}),step('b','Suite',{start:'after',after:'a'})]));
 original.nodes[0].model='keep-model';
 const changed=structuredClone(original.authoring);changed.steps[0].review='never';
 const graph=guided.buildGuidedWorkflow(changed,original);
 assert.equal(graph.nodes.length,2);assert.equal(graph.nodes[0].route_output,undefined);assert.equal(graph.nodes[0].options,undefined);assert.equal(graph.nodes[0].model,'keep-model');
 engineCheck(graph,"assert graph['nodes'][0]['outputs']=={'result':{'type':'string','required':True}}");
});

test('a missing source can request clarification through the real engine before producing its result',()=>{
 const graph=guided.buildGuidedWorkflow(values([step('analysis','Analyse')]));
 engineCheck(graph,`
run=engine.start(project['id'],graph,simulation=True)
claim=engine.claim(run['id'],'analysis')
run=engine.submit(run['id'],'analysis',claim['token'],{'summary':'Source manquante','question':'Quel document faut-il analyser ?'})
assert run['nodes']['analysis']['status']=='waiting_input'
assert run['nodes']['analysis']['question']['text']=='Quel document faut-il analyser ?'
from workflow_engine.conversations import answer
run=answer(engine,run['id'],'analysis',run['nodes']['analysis']['question']['id'],'Document A fourni')
assert run['nodes']['analysis']['status']=='ready'
claim=engine.claim(run['id'],'analysis')
run=engine.submit(run['id'],'analysis',claim['token'],{'ok':True,'summary':'Source analysée','outputs':{'result':'Analyse du document A'}})
assert run['status']=='completed'
`);
});

test('invalid dependencies and metadata are rejected before any method is saved',()=>{
 for (const steps of [[step('a','A',{start:'after',after:'a'})],[step('a','A'),step('b','B',{start:'all',depends_on:[]})],[step('a','A'),step('b','B',{start:'all',depends_on:['missing']})]]) assert.throws(()=>guided.buildGuidedWorkflow(values(steps)),/étape|résultats/);
 assert.throws(()=>guided.buildGuidedWorkflow({...values([step('a','A')]),questions:[{key:'request',label:'Réservé'}]}),/invalide/);
 assert.throws(()=>guided.buildGuidedWorkflow({...values([step('a','A')]),goal:'x'.repeat(2001)}),/2000/);
});

test('authoring forms escape user content and keep technical contracts out of everyday fields',()=>{
 const graph=guided.buildGuidedWorkflow({...values([step('a','<Analyse>',{mission:'<script>alert(1)</script>'})]),title:'"Méthode"',questions:'Destinataire\nPériode concernée'});
 const form=guided.guidedForm({graph,profiles:[{id:'support',title:'Support & diagnostic'}]});
 assert.match(form,/&lt;script&gt;/);assert.doesNotMatch(form,/<script>/);
 assert.match(form,/Support &amp; diagnostic/);assert.match(form,/Seulement en cas d’anomalie/);
 assert.doesNotMatch(form,/JSON|route_output|inputs|outputs/);
 assert.deepEqual(graph.launch_fields.map(field=>field.label),['Destinataire','Période concernée']);
 assert.ok(graph.launch_fields.every(field=>!field.required));
});

test('distinct executors are an explicit choice and do not retroactively change ordinary native stages',()=>{
 const graph=guided.buildGuidedWorkflow(values([step('a','Analyse',{execution_driver:'delegated'}),step('b','Vérification',{start:'after',after:'a'})]));
 assert.equal(graph.nodes[0].execution_driver,'delegated');assert.equal(graph.nodes[1].execution_driver,undefined);
 assert.equal(graph.authoring.steps[1].execution_driver,'native');
 assert.match(guided.guidedForm({graph}),/La conversation principale/);
 assert.match(guided.guidedForm({graph}),/Un agent distinct pour les textes fournis/);
 const edited=structuredClone(graph.authoring);edited.steps[0].execution_driver='native';
 assert.equal(guided.buildGuidedWorkflow(edited,graph).nodes[0].execution_driver,undefined);
 engineCheck(graph,"assert graph['nodes'][0]['execution_driver']=='delegated'");
});

function engineCheck(graph,script) {
 const program=`import sys,json,tempfile\nfrom pathlib import Path\nsys.path.insert(0,str(Path.cwd()/'backend'))\nfrom workflow_engine import Engine,validate\ngraph=json.loads(sys.stdin.read())\nvalidate(graph)\nwith tempfile.TemporaryDirectory() as folder:\n engine=Engine(folder)\n project=engine.create_project('Projet synthétique')\n${script.trim().split('\n').map(line=>' '+line).join('\n')}\n`;
 const result=spawnSync('python3',['-c',program],{cwd:require('node:path').resolve(__dirname,'..'),input:JSON.stringify(graph),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr || result.stdout);
}

const {test}=require('node:test');
const assert=require('node:assert/strict');
let view;
test.before(async()=>{({attemptHistoryView:view}=await import('../src/execution-attempts.mjs'));});
const sha='a'.repeat(64);

test('attempts show dates and separate failure summaries from the reason for their next retry',()=>{
  const current={attempt:3,reason:'Use the revised specification',history:[
    {attempt:1,status:'returned',started:1760000000,finished:1760000002,result:{ok:false,summary:'Copy could not start'},token:'DO_NOT_RENDER_CLAIM_TOKEN'},
    {attempt:2,status:'returned',reason:'Increase the copy allowance',finished:1760000060,result:{ok:false,summary:'No file changed'},validation_error:'Executor reported a failure'},
  ]};
  const snapshot=structuredClone(current);
  const html=view(current);
  assert.match(html,/Tentatives précédentes · 2/);
  assert.ok(html.indexOf('Tentative 2')<html.indexOf('Tentative 1'));
  const latest=html.slice(html.indexOf('Tentative 2'),html.indexOf('Tentative 1'));
  assert.match(latest,/No file changed/);
  assert.match(latest,/Motif de la reprise suivante.*Use the revised specification/s);
  assert.doesNotMatch(latest,/Increase the copy allowance/);
  assert.match(html.slice(html.indexOf('Tentative 1')),/Motif de la reprise suivante.*Increase the copy allowance/s);
  assert.match(html,/<time datetime="2025-10-09T08:53:22.000Z">Terminée le/);
  assert.match(html,/class="pill failed">Échec/);
  assert.match(html,/<details class="attempt-technical"><summary>Détails techniques/);
  assert.doesNotMatch(html,/DO_NOT_RENDER_CLAIM_TOKEN|"status"\s*:/);
  assert.deepEqual(current,snapshot);
});

test('bounded projection stays readable when large archived inputs turn the source history into an artifact',()=>{
  const html=view({history:{$artifact:{sha256:sha},format:'json',preview:'[{"inputs":'},attempt_history:[
    {attempt:1,status:'returned',failed:true,result:{ok:false,summary:'Synthetic copy failed',outputs:{files:['a.py','b.py']},evidence:[{sha256:sha}]},retry_reason:'Correct the configuration',inputs:{$artifact:{sha256:sha},format:'json',preview:'{"plan":'}},
  ]});
  assert.match(html,/Synthetic copy failed/);
  assert.match(html,/Correct the configuration/);
  assert.match(html,/Résultats et preuves/);
  assert.match(html,/<dt>Fichiers<\/dt>/);
  assert.match(html,/>a.py<\/span>/);
  assert.match(html,/data-action="read-proof" data-sha="a{64}"/);
  assert.match(html,/>Preuve 1 · aaaaaaaa<\/button>/);
  assert.match(html,/Entrées de cette tentative/);
  assert.doesNotMatch(html,/\[\{&quot;inputs|&quot;plan/);
});

test('archived business output uses the same action table, verdict and proof names as the current result',()=>{
  const html=view({history:[{attempt:1,status:'returned',result:{ok:true,outputs:{report:{actions:[{action:'Vérifier les salles',owner:'Alice',due:'16 octobre'}]},verdict:'pass'},evidence:[{sha256:sha,filename:'compte-rendu.md',role:'deliverable'}]}}],reason:'Corriger la date'});
  const reading=html.replace(/<details class="business-technical">[\s\S]*?<\/details>/g,'');
  for(const label of ['Action','Responsable','Échéance','Conforme','Livrable — compte-rendu.md','Corriger la date'])assert.ok(reading.includes(label));
  assert.match(reading,/<table /);
  assert.doesNotMatch(reading,/>owner<|>pass<|Consulter la preuve/);
});

test('historical negative diagnostic remains a result and cannot acquire a fabricated failure state',()=>{
  const current={history:[{attempt:1,status:'returned',result:{ok:true,summary:'Needs corrective work',outputs:{verdict:'fail'}}}]};
  assert.match(view(current,{route_output:'verdict',options:['pass','fail']}),/Résultat remis/);
  assert.doesNotMatch(view(current,{route_output:'verdict',options:['pass','fail']}),/pill failed/);
  assert.match(view({attempt_history:[{...current.history[0],failed:false,result:{...current.history[0].result,outputs:{$artifact:{sha256:sha}}}}]}),/Résultat remis/);
});

test('untrusted summaries, result keys and retry notes are text; proof links only accept hashes',()=>{
  const html=view({history:[{status:'returned',result:{ok:false,summary:'<script>alert(1)</script>',outputs:{'<img onerror=x>':'<b>value</b>'},evidence:[{sha256:'" onclick="bad()'}]}}],reason:'<a href="bad">retry</a>'});
  assert.doesNotMatch(html,/<script>|<img|<b>|<a href|onclick=/);
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/Date non enregistrée/);
});

test('empty history stays absent and artifact previews are never mistaken for complete state',()=>{
  assert.equal(view({}), '');
  assert.equal(view({history:[]}), '');
  const html=view({history:{$artifact:{sha256:sha},format:'json',preview:'[{"token":"not-complete'}});
  assert.match(html,/<details class="attempt-technical">/);
  assert.match(html,/Consulter le contenu par pages/);
  assert.doesNotMatch(html,/not-complete/);
});

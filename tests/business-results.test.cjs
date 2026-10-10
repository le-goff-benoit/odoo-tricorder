const {test}=require('node:test');
const assert=require('node:assert/strict');
let view,proofView,proofLabel,decisionLabel;
test.before(async()=>{({businessDataView:view,businessProofView:proofView,proofLabel,decisionLabel}=await import('../src/business-results.mjs'));});
const sha='b'.repeat(64);
const reading=html=>html.split('<details class="business-technical"><summary>Données techniques')[0];

test('meeting actions have named columns, retain heterogeneous entries and do not invent missing owners',()=>{
  const result={actions:[{action:'Préparer le devis',owner:'Alex',due:'2026-10-12'}, {action:'Relire',due:null,estimate_hours:0}, 'Préciser le lieu', {other_note:'Décision ultérieure'}]};
  const original=structuredClone(result);
  const html=view('Résultat',result),human=reading(html);
  assert.match(human,/<th scope="col">Action<\/th><th scope="col">Responsable<\/th><th scope="col">Échéance/);
  assert.match(human,/Préparer le devis/);assert.match(human,/Alex/);assert.match(human,/2026-10-12/);
  assert.match(human,/Non renseigné/);assert.match(human,/Estimate hours/);assert.match(human,/>0<\/span>/);
  assert.match(human,/Préciser le lieu/);assert.match(human,/Décision ultérieure/);
  assert.doesNotMatch(human,/&quot;action&quot;|&quot;owner&quot;/);
  assert.match(html,/<details class="business-technical"><summary>Données techniques<\/summary>/);
  assert.match(html,/&quot;estimate_hours&quot;: 0/);
  assert.deepEqual(result,original);
});

test('clarifications are question and answer dialogues without treating the answer as permission',()=>{
  const html=view('Entrées reçues',{clarifications:[{question:'Toutes les équipes ?',answer:'Seulement Support.',note:'Le client doit confirmer'}]}),human=reading(html);
  assert.match(human,/<dt>Précisions<\/dt>/);assert.match(human,/class="business-dialogue"/);
  assert.match(human,/<dt>Question<\/dt><dd>.*Toutes les équipes.*<dt>Réponse<\/dt><dd>.*Seulement Support/s);
  assert.match(human,/<dt>Commentaire<\/dt>/);assert.match(human,/Le client doit confirmer/);
  assert.doesNotMatch(human,/&quot;question&quot;|Approuvée|Terminée/);
});

test('business classification and recorded decisions are translated, unknown values remain explicit',()=>{
  const human=reading(view('Résultat',{finding:'Le fichier est vide',severity:'critical',next_action:'Vérifier le filtre',verdict:'fail'}));
  assert.match(human,/<dt>Constat<\/dt>/);assert.match(human,/<dt>Niveau d’urgence<\/dt><dd><span class="business-text">Urgent/);
  assert.match(human,/Suite proposée/);assert.match(human,/Non conforme/);assert.doesNotMatch(human,/>critical</);
  assert.equal(decisionLabel('approve'),'Approuvée');assert.equal(decisionLabel('reject'),'Refusée');
  assert.equal(decisionLabel('client_custom_route'),'client_custom_route');
  assert.match(reading(view('Constat',{severity:'probably-critical'})),/probably-critical/);
  assert.match(reading(view('Résultat',{ok:false,count:0,available:false})),/Non/);
  assert.match(view('Compteur',0),/>0<\/span>/);assert.match(view('Contrôle',false),/>Non<\/section>/);
});

test('proofs use recorded names and roles, keep old proofs distinguishable and never make paths into links',()=>{
  const source={sha256:sha,name:'demande-client.eml',media_type:'message/rfc822',role:'source'};
  const plan={sha256:'c'.repeat(64),filename:'/tmp/isolation/plan.md',role:'plan'};
  assert.equal(proofLabel(source),'Source — demande-client.eml');assert.equal(proofLabel(plan),'Plan — plan.md');
  assert.equal(proofLabel({sha256:sha},1),'Preuve 2 · bbbbbbbb');
  assert.equal(proofLabel({sha256:sha,media_type:'message/rfc822'}),'Email · bbbbbbbb');
  const html=proofView(source);
  assert.match(html,/data-action="read-proof"/);assert.match(html,/data-sha="b{64}"/);
  assert.match(html,/data-proof-label="Source — demande-client.eml"/);
  assert.doesNotMatch(proofView(plan),/\/tmp\/isolation|href=/);
});

test('artifact previews remain previews and read-proof receives their verified hash and identity',()=>{
  let args;
  const html=view('Long document',{$artifact:{sha256:sha,name:'rapport.md',role:'deliverable'},format:'text',preview:'Début incomplet…'}, {button:(...values)=>{args=values;return '<button>fixture</button>';}});
  assert.match(html,/Début incomplet…/);assert.equal(args[0],'read-proof');assert.equal(args[1],'Livrable — rapport.md');
  assert.match(args[3],/data-sha="b{64}"/);
  const json=view('Historique',{$artifact:{sha256:sha},format:'json',preview:'[{"question":'});
  assert.match(json,/<details class="business-technical"><summary>Aperçu des données techniques/);
  assert.match(json,/data-action="read-proof"/);
});

test('all untrusted content is escaped, including keys, proof metadata and hash attributes',()=>{
  const html=view('<img src=x>',{'<script>alert(1)</script>':'<svg onload=alert(2)>',actions:[{action:'<a href="javascript:bad()">x</a>',owner:'<b>Pat</b>'}],source:{$artifact:{sha256:'" onclick="bad()',name:'<img src=x>',role:'<em>source</em>'},preview:'<iframe>',format:'text'}});
  assert.doesNotMatch(html,/<img|<script|<svg|<a |<b>|<em>|<iframe|data-sha=/);
  assert.match(html,/&lt;img/);assert.match(html,/&lt;script&gt;/);assert.match(html,/Preuve indisponible/);
  const proof=proofView({sha256:sha,name:'" onmouseover="bad()'});
  assert.match(proof,/data-proof-label="&quot; onmouseover=&quot;bad\(\)"/);
  assert.doesNotMatch(proof,/" onmouseover="bad/);
});

test('deep and long structures bound the reading view while retaining every original field in closed details',()=>{
  const values={actions:Array.from({length:25},(_,i)=>({action:`Action ${i+1}`,owner:i===24?'Dernier responsable':'Pat'})),extra:{one:{two:{three:{four:{unknown:'Champ profond conservé'}}}}}};
  const html=view('Résultat',values);
  assert.equal((html.match(/<tr>/g)||[]).length,21);
  assert.match(html,/<summary>5 autres éléments<\/summary>/);assert.match(html,/Dernier responsable/);
  assert.match(html,/<summary>Structure détaillée<\/summary>/);assert.match(html,/Champ profond conservé/);
  assert.doesNotMatch(html,/<details[^>]* open/);
  assert.match(view('Liste',[]),/Aucun élément/);assert.equal(view('Vide',{}),'');
});

test('per-item deliverables expose answers directly without execution envelopes or empty code contributions',()=>{
  const values={results:[{id:'r1',title:'Engagements de la réunion',project:'p1',run:'run-secret-id',outputs:{confirm:{answer:'Léa réserve la salle le 15 octobre.'}}},
    {id:'r2',title:'Synthèse',project:'p1',run:'run-two',outputs:{perform:{result:'Décision commune : lancement mercredi.'}},extra_note:'Valeur supplémentaire conservée'}],contributions:[]};
  const human=reading(view('Résultats',values,{projects:[{id:'p1',title:'Comité de quartier'}]}));
  assert.match(human,/<h4>Engagements de la réunion<\/h4>/);
  assert.match(human,/Projet : Comité de quartier/);
  assert.match(human,/<dt>Réponse<\/dt><dd><span class="business-text">Léa réserve la salle/);
  assert.match(human,/Décision commune : lancement mercredi/);
  assert.match(human,/Valeur supplémentaire conservée/);
  assert.doesNotMatch(human,/Structure détaillée|run-secret-id|Contributions de code|Confirm|Perform|&quot;answer&quot;/);
  assert.match(view('',values),/run-secret-id/); // original remains in optional diagnostics
});

test('meeting actions recognize supplied French keys without concealing conflicting aliases',()=>{
  const french={actions:[{action:'Réserver la salle',responsable:'Léa',échéance:'15 octobre'}]};
  const human=reading(view('',french));
  assert.match(human,/Léa/);assert.match(human,/15 octobre/);
  assert.doesNotMatch(human,/Non renseigné|Autres informations/);
  const ambiguous=reading(view('',{actions:[{action:'Relire',owner:'Alex',responsable:'Léa',deadline:'Demain'}]}));
  assert.match(ambiguous,/Alex/);assert.match(ambiguous,/Léa/);assert.match(ambiguous,/Autres informations/);
});

test('plan project and dependency identities are readable while technical values remain intact',()=>{
  const input={plan:{goal:'Livrer ensemble',tasks:[{id:'a',title:'Préparer Atlas',project:'p1'}, {id:'b',title:'Recetter Boréal',project:'p2',depends_on:['a']}]}}, original=structuredClone(input);
  const html=view('Plan',input,{projects:[{id:'p1',title:'Atlas'},{id:'p2',title:'Boréal'}]});
  const human=reading(html);
  assert.match(human,/Objectif/);assert.match(human,/Livrer ensemble/);assert.match(human,/>Atlas</);assert.match(human,/>Boréal</);
  assert.match(human,/<dt>Après<\/dt>.*Préparer Atlas/s);
  assert.doesNotMatch(human,/>p1<|>p2</);assert.deepEqual(input,original);
  assert.equal(decisionLabel('true'),'Oui');assert.equal(decisionLabel('false'),'Non');
});

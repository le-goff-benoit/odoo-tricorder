const {test}=require('node:test');
const assert=require('node:assert/strict');
const view=import('../src/conversation-view.mjs');

test('overview uses global activity independently of page and search',async()=>{
  const {activityText,conversationActivity,conversationOverviewView}=await view;
  const c={status:'open',items:[],query:'R4',total:0,item_count:28,activity:{items:28,running:3,decisions:2,failed:1}};
  assert.equal(conversationActivity(c).global,true);
  assert.match(activityText(c),/3 étapes en cours.*2 décisions.*1 échec/);
  const html=conversationOverviewView(c);
  assert.match(html,/28 au total/);assert.doesNotMatch(html,/cette page uniquement/);
  assert.match(html,/Le lancement porte uniquement sur les demandes affichées/);
  assert.equal(conversationActivity({items:[]}).global,false);
});

test('worker identity is based on recorded work, not a configured provider',async()=>{
  const {overviewModel,workerPresentation}=await view;
  const c={items:[{id:'r1',run:'run1',request:'R1',execution:{provider:'codex',workers:[]}},{id:'r2',run:'run2',request:'R2',execution:{workers:[{node:'work',kind:'agent',provider:'claude',model:'synthetic',ownership:'native',heartbeat:990}]}}]};
  const rows=overviewModel(c,[],1000).rows;
  assert.equal(rows[0].workers.length,0);
  assert.match(rows[1].workers[0].identity,/Agent · Anthropic · synthetic/);
  assert.equal(rows[1].workers[0].activity,'Pris en charge dans le terminal');
  assert.equal(workerPresentation({kind:'command',heartbeat:999},1000).identity,'Commande');
  assert.match(workerPresentation({kind:'agent',heartbeat:500},1000).activity,/activité à vérifier/);
  assert.equal(workerPresentation({kind:'agent'},1000).stale,true);
});

test('only recorded dependencies connect demands, including off-page project links',async()=>{
  const {overviewModel,conversationOverviewView}=await view;
  const c={projects:['alpha','beta'],project_contexts:[{id:'alpha',title:'Projet Alpha'},{id:'beta',title:'Projet Bêta'}],items:[
    {id:'a',run:'r1',project:'alpha',request:'R1 — Diagnostic',execution:{}},
    {id:'b',run:'r2',project:'beta',request:'R2 — Correction',execution:{}},
    {id:'c',run:'c1',project:'alpha',request:'C1 — Clôture',execution:{coordination_wait:true},dependencies:[{run:'r1',project:'alpha',request:'R1 — Diagnostic',satisfied:true},{run:'r28',project:'beta',request:'R28 — Validation',satisfied:false}]}]};
  const model=overviewModel(c);assert.equal(model.rows[0].dependencies.length,0);assert.equal(model.rows[1].dependencies.length,0);
  assert.equal(model.rows[2].dependencies[1].offPage,true);assert.equal(model.rows[2].dependencies[1].projectTitle,'Projet Bêta');
  const html=conversationOverviewView(c);assert.match(html,/data-id="r28"/);assert.match(html,/hors page/);assert.match(html,/Projet Bêta/);
  assert.equal((html.match(/class="conversation-dependencies"/g)||[]).length,1);
});

test('dispatch reports actionable waiting demands, excludes future blocks and never exposes PIDs',async()=>{
  const {dispatchFeedback,conversationOverviewView}=await view;
  const result={items:[{run:'r1',started:[{node:'a',pid:98765}],waiting:[{status:'pending',reason:'Futur'},{status:'running',reason:'Déjà en cours'},{status:'waiting',reason:'Décision humaine'},{status:'waiting',reason:'Décision humaine'}]},{run:'r2',started:[],waiting:[{status:'ready',reason:'Modèle absent'},{status:'waiting_input',reason:'Question'}]}]};
  const feedback=dispatchFeedback(result);assert.equal(feedback.started,1);assert.equal(feedback.demands,2);assert.equal(feedback.waiting.length,3);assert.equal(feedback.text,'1 étape lancée · 2 demandes en attente.');
  const html=conversationOverviewView({status:'open',items:[]},{dispatch:result});assert.doesNotMatch(html,/98765|Futur|Déjà en cours/);assert.match(html,/Modèle absent/);
});

test('overview escapes untrusted content, shows pagination and disables archived dispatch',async()=>{
  const {conversationOverviewView}=await view;
  const c={status:'open',archived:true,total:40,item_count:40,offset:25,next:30,items:[{run:'r1',request:'<img src=x onerror=alert(1)>',execution:{workers:[{kind:'agent',model:'<script>',heartbeat:10}]}}]};
  const html=conversationOverviewView(c,{now:20});
  assert.doesNotMatch(html,/<img|<script>|data-action="conversation-dispatch"/);
  assert.match(html,/&lt;img/);assert.match(html,/Demandes précédentes/);assert.match(html,/Demandes suivantes/);assert.match(html,/26–26 sur 40/);
});

test('readiness distinguishes configuration, native work and temporary capacity without claiming work',async()=>{
 const {conversationOverviewView}=await view;
 const row=(run,status,reason,extra={})=>({run,request:run,execution:{status:'active',focus:{status:'ready'},launch:{status,label:status,ready_count:1,worker_count:0,nodes:[{title:'Étape',status,reason}],...extra}}});
 const c={status:'open',items:[row('Sans modèle','configuration','Choisir un modèle',{configuration_count:1}),row('Terminal','native','Outils de conversation',{native_count:1}),row('Quota','waiting','Quatre étapes sont déjà en cours.')]};
 const html=conversationOverviewView(c);
 assert.match(html,/data-action="conversation-dispatch" disabled/);assert.match(html,/0 demande\(s\) lançable/);assert.match(html,/Configurer un nouveau lancement/);assert.match(html,/Continuer dans la conversation/);assert.match(html,/Quatre étapes sont déjà en cours/);
 c.items.push(row('Disponible','ready','Prête',{worker_count:1}));const active=conversationOverviewView(c);assert.doesNotMatch(active,/data-action="conversation-dispatch" disabled/);assert.match(active,/1 demande\(s\) lançable/);
});

test('a cancelled or refused prerequisite has its true state, never a generic to-do label',async()=>{
 const {dependencyLabel,dependencyBlocked,conversationOverviewView}=await view;
 for(const status of ['cancelled','completed']){const dep={status,completion_outcome:'rejected'};assert.equal(dependencyBlocked(dep),true);assert.match(dependencyLabel(dep),/Annulée|Refusée/);}
 const html=conversationOverviewView({items:[{run:'after',request:'Après',dependencies:[{run:'before',request:'Préalable',status:'cancelled'}]}]});assert.match(html,/Annulée/);assert.doesNotMatch(html,/À traiter/);
});

test('last launch feedback is historical and stays scoped to its original page and filter',async()=>{
 const {conversationOverviewView}=await view;
 const c={status:'open',items:[],offset:0,query:''};
 const dispatch={scope:{offset:0,query:'',count:25},at:1791540000,items:[{run:'r1',started:[{node:'a'}],waiting:[]}]};
 const html=conversationOverviewView(c,{dispatch});assert.match(html,/Dernier lancement à/);assert.match(html,/25 demande\(s\)/);assert.match(html,/1 étape lancée/);
 assert.doesNotMatch(conversationOverviewView({...c,offset:25},{dispatch}),/dispatch-feedback/);
 assert.doesNotMatch(conversationOverviewView({...c,query:'urgence'},{dispatch}),/dispatch-feedback/);
});


test('dependency badges distinguish automatic waiting from a user suspension, including off-page prerequisites',async()=>{
 const {dependencyLabel,conversationOverviewView}=await view;
 assert.equal(dependencyLabel({status:'paused',coordination_wait:true}),'Attend une autre demande');
 assert.equal(dependencyLabel({status:'paused',coordination_wait:true,coordination_hold:true}),'Suspendue manuellement');
 assert.equal(dependencyLabel({status:'paused'}),'Suspendue');
 const c={items:[{run:'r4',request:'R4',dependencies:[{run:'r3',request:'R3',status:'paused',coordination_wait:true},{run:'r2',request:'R2',status:'paused',coordination_wait:true,coordination_hold:true}]}]};
 const html=conversationOverviewView(c);
 assert.match(html,/Attend une autre demande · hors page/);
 assert.match(html,/Suspendue manuellement · hors page/);
});

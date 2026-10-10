// Exécute les fonctions sources réelles avec un transport synthétique et un DOM réduit.
// Usage : node <ce fichier> [chemin-json-preuve]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '../../../..');
const fixture = JSON.parse(execFileSync('/usr/bin/python3', [path.join(__dirname, 'reproduction.py')], {encoding: 'utf8', env: {PATH:'/usr/bin:/bin', PYTHONDONTWRITEBYTECODE:'1'}, maxBuffer: 2e6}));
const code = fs.readFileSync(path.join(root,'src/studio.js'),'utf8');
const fn = (start,end) => code.slice(code.indexOf(start),code.indexOf(end,code.indexOf(start)));
const requestSource=fn('async function executionRequest(', '\nasync function showProof(');
const dialogSource=fn('async function addRequestDialog(', '\nfunction completedResults(');
const esc = value => String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
const recovery = call => new Function('call', requestSource+';return executionRequest;')(call);
const transportCalls=[];
const call=async(action,payload)=>{transportCalls.push({action,...payload});assert.equal(action,'run.proof');const page=fixture.pages.find(page=>page.offset===payload.offset);assert.ok(page);return page;};
(async()=>{
 const view=await import(pathToFileURL(path.join(root,'src/execution-view.mjs')));
 const before=JSON.stringify(fixture.run);
 const recover=recovery(call), source=await recover(fixture.run);
 assert.equal(source,fixture.source); assert.equal(source.endsWith('FIN_SOURCE_INTEGRALE'),true);
 assert.equal(await recover({parameters:{request:'Demande courte'}}),'Demande courte');
 assert.equal(await recover({parameters:{request:{}}}),'');
 await assert.rejects(recovery(async()=>({text:'partiel',next:0}))(fixture.run),/Impossible de récupérer/);
 await assert.rejects(recovery(async()=>({text:{},next:null}))(fixture.run),/Impossible de récupérer/);
 assert.equal(view.requestHeading(fixture.run.parameters.request),'Préparer un bilan complet');
 assert.equal(view.requestHeading({$artifact:{},preview:''},'Workflow'),'Workflow');
 assert.equal(view.requestHeading({preview:'faux aperçu'},'Workflow'),'Workflow');
 assert.equal(view.requestHeading(null,undefined,{},42),'Demande');
 assert.equal(view.requestHeading('x'.repeat(100000)).length,301);
 let html='';
 const state={run:fixture.run,conversation:{id:'synthetic-conversation',projects:['synthetic-project']},projects:[],project:{id:'synthetic-project',title:'Projet fictif'}};
 const dialogFactory=(localState,modal,recoveryFn)=>new Function('state','modal','esc','options','button','dependencyChoices','executionRequest', 'let viewEpoch=7;'+dialogSource+';return {open:addRequestDialog,setEpoch:value=>viewEpoch=value};')(localState,modal,esc,()=>'',()=>'',async()=>{},recoveryFn);
 const dialog=dialogFactory(state,(_,body)=>html=body,recover);
 await dialog.open(true);
 const replacement=html.match(/<textarea name="request" required>(.*?)<\/textarea>/s)?.[1];
 assert.equal(JSON.stringify(fixture.run),before);
 const stale=[];
 for(const change of ['epoch','conversation','run']){
  const delayedState=structuredClone(state);delete delayedState.dependencyDraft;let resolve,modals=0;
  const deferred=new Promise(done=>resolve=done),guarded=dialogFactory(delayedState,()=>modals++,async()=>deferred);
  const pending=guarded.open(true);
  if(change==='epoch')guarded.setEpoch(8);
  if(change==='conversation')delayedState.conversation={id:'other'};
  if(change==='run')delayedState.run={id:'other'};
  resolve(fixture.source);await pending;
  assert.equal(modals,0);assert.equal(delayedState.dependencyDraft,undefined);stale.push(change);
 }
 const output={source_characters:source.length,source_bytes:Buffer.byteLength(source),proof_pages:fixture.pages.length,full_recovery_exact:true,run_unchanged:fixture.run_unchanged,frontend_run_unchanged:true,heading:view.requestHeading(fixture.run.parameters.request),bounded_title:true,recovery_refuses_nonprogress_and_nontext:true,replacement_preserved:replacement===fixture.source,replacement_excerpt:replacement?.slice(0,100),stale_reply_refused:stale,transport_calls:transportCalls.map(page=>({action:page.action,offset:page.offset})),sources:{executionRequest:requestSource,addRequestDialog:dialogSource}};
 if(process.argv[2]) fs.writeFileSync(process.argv[2],JSON.stringify(output,null,2));
 console.log(JSON.stringify({...output,sources:undefined,transport_calls:undefined},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});

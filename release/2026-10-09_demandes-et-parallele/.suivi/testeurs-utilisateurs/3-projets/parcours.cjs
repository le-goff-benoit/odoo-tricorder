'use strict';
const fs=require('node:fs');
const path=require('node:path');
const readline=require('node:readline');
const base='/home/blegoff/odoo-tricorder';
const output=path.join(base,'release/2026-10-09_demandes-et-parallele/.suivi/testeurs-utilisateurs/3-projets');
const {prepare,launch}=require(path.join(output,'../harness.cjs'));
const frozen=require(path.join(output,'../paquet.json'));
(async()=>{
 global.manifest=prepare({id:'3-projets',output,display:183});
 global.bench=await launch(manifest,{executable:path.join(base,'build-artifacts/linux-unpacked/odoo-tricorder'),executableSha256:frozen.executable_sha256,asar:path.join(base,'build-artifacts/linux-unpacked/resources/app.asar'),asarSha256:frozen.asar_sha256,displayReleased:true});
 global.page=bench.page;global.app=bench.app;
 fs.writeFileSync(path.join(output,'gestes.jsonl'),'');
 console.log('READY',await bench.visibleText());
 const lines=readline.createInterface({input:process.stdin,output:process.stdout,terminal:false});
 for await (const line of lines){
  try{ fs.appendFileSync(path.join(output,'gestes.jsonl'),JSON.stringify({at:new Date().toISOString(),js:line})+'\n');const result=await new Function('return (async()=>{'+line+'})()')(); console.log('RESULT',JSON.stringify(result));}catch(e){console.log('ERROR',e.stack);}
 }
 await bench.cleanup();
})().catch(e=>{console.error(e);process.exitCode=1;});

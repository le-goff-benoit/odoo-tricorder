'use strict';
const fs=require('node:fs'), path=require('node:path'), readline=require('node:readline');
const root='/home/blegoff/odoo-tricorder';
const out=path.join(root,'release/2026-10-09_demandes-et-parallele/.suivi/testeurs-utilisateurs/1-direction');
const {prepare,launch}=require('../harness.cjs');
const pkg=require('../paquet.json');
(async()=>{
 const manifest=prepare({id:'direction',output:out,display:181});
 const b=await launch(manifest,{executable:path.join(root,'build-artifacts/linux-unpacked/odoo-tricorder'),executableSha256:pkg.executable_sha256,asar:path.join(root,'build-artifacts/linux-unpacked/resources/app.asar'),asarSha256:pkg.asar_sha256,displayReleased:true});
 const {app,page}=b;
 const dump=async()=>{console.log(await b.visibleText());console.log('CONTROLS',await page.locator('button,input,textarea,select').evaluateAll(es=>es.map(e=>({tag:e.tagName,text:e.innerText,aria:e.getAttribute('aria-label'),title:e.title,placeholder:e.placeholder,type:e.type,value:e.value}))))};
 console.log('READY',manifest.temporary);await dump();
 const rl=readline.createInterface({input:process.stdin});
 for await(const cmd of rl){fs.appendFileSync(path.join(out,'gestes.jslog'),cmd+'\n');try{const result=await eval('(async()=>{'+cmd+'})()');if(result!==undefined) console.log(result);}catch(e){console.log('ACTION_ERROR',e.stack)}console.log('ACTION_DONE');}
 const appPid=app.process().pid;await b.cleanup();fs.writeFileSync(path.join(out,'cleanup.json'),JSON.stringify({at:new Date().toISOString(),errors:b.errors,appPid,appStopped:true,shaVerified:true},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});

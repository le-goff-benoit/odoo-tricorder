'use strict';
const fs=require('node:fs');
const readline=require('node:readline');
const dir=__dirname;
const {prepare,launch}=require('../harness.cjs');
(async()=>{
const manifest=prepare({id:'support',output:dir,display:182});
const frozen=JSON.parse(fs.readFileSync(dir+'/../paquet.json'));
const bench=await launch(manifest,{executable:'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/odoo-tricorder',executableSha256:frozen.executable_sha256,asar:'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/resources/app.asar',asarSha256:frozen.asar_sha256,displayReleased:true});
const {page,app}=bench;
const events=[];
console.log(JSON.stringify({ready:true,pid:app.process().pid,temporary:manifest.temporary,text:await bench.visibleText()}));
const rl=readline.createInterface({input:process.stdin});
for await (const line of rl) {try {events.push(line);fs.writeFileSync(dir+'/gestes.json',JSON.stringify(events,null,2));const result=await eval('(async()=>{'+line+'})()');console.log(JSON.stringify({result}));}catch(e){console.log(JSON.stringify({error:e.message}));}}
await bench.cleanup();console.log(JSON.stringify({cleanup:true,errors:bench.errors}));
})().catch(e=>{console.error(e);process.exit(1)});

'use strict';
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {prepare,launch}=require('../harness.cjs');
const output=__dirname;
const frozen=require('../paquet.json');
const manifest=prepare({id:'7-equipe',output,display:182});
(async()=>{
 const bench=await launch(manifest,{executable:'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/odoo-tricorder',executableSha256:frozen.executable_sha256,asar:'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/resources/app.asar',asarSha256:frozen.asar_sha256,displayReleased:true});
 global.b=bench;global.p=bench.page;global.m=manifest;
 console.log(await b.visibleText());
 const readline=require('node:readline').createInterface({input:process.stdin});
 for await(const line of readline){try{const result=await eval('(async()=>{'+line+'})()');console.log(JSON.stringify(result));}catch(e){console.log('ERROR '+e.stack);}}
 await bench.cleanup();
})();

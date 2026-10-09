'use strict';
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const {prepare,launch} = require('../harness.cjs');
const output = __dirname;
const root = '/home/blegoff/odoo-tricorder';
(async()=>{
const manifest = prepare({id:'9-clavier',output,display:183});
const bench = await launch(manifest,{executable:root+'/build-artifacts/linux-unpacked/odoo-tricorder',executableSha256:'9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3',asar:root+'/build-artifacts/linux-unpacked/resources/app.asar',asarSha256:'71a054e6137a4fb424320954836109bd67ef2b74cb8f71ad3e49af35bb047dd7',displayReleased:true});
const {page,app} = bench;
await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setSize(1024,800);w.webContents.setZoomFactor(1.25);});
await page.setViewportSize({width:1024,height:800});
console.log(JSON.stringify({ready:true,text:await bench.visibleText()}));
const rl = readline.createInterface({input:process.stdin,crlfDelay:Infinity});
for await (const code of rl){
fs.appendFileSync(path.join(output,'gestes.ndjson'),JSON.stringify({time:new Date().toISOString(),code})+'\n');
try{ const value=await eval('(async()=>{'+code+'})()');console.log(JSON.stringify({value})); }
catch(error){console.log(JSON.stringify({error:error.message}));}
}
await bench.cleanup();
})();

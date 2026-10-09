'use strict';
const fs = require('node:fs');
const readline = require('node:readline');
const harness = require('../harness.cjs');
(async () => {
const manifest = JSON.parse(fs.readFileSync(__dirname+'/ux4-etats-erreurs-preparation.json','utf8'));
const ctx = await harness.launch(manifest,{displayReleased:true,executable:'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/odoo-tricorder',executableSha256:'9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3',asar:'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/resources/app.asar',asarSha256:'a344374116f8ada276e426dd94279450b73cee31ba46aa981ae830a1fb64f44b'});
const page=ctx.page;
const lines = readline.createInterface({input:process.stdin,output:process.stdout,terminal:false});
console.log('READY');
for await (const line of lines) {
try { const result = await eval('(async()=>{'+line+'})()'); console.log(JSON.stringify({ok:true,result})); } catch(e) {console.log(JSON.stringify({ok:false,error:e.stack}));}
}
await ctx.cleanup();
})().catch(e=>{console.error(e);process.exitCode=1;});

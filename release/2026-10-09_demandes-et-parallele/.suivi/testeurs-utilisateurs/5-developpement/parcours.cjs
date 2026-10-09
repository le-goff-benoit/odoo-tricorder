'use strict';
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const root = '/home/blegoff/odoo-tricorder';
const campaign = root + '/release/2026-10-09_demandes-et-parallele/.suivi/testeurs-utilisateurs';
const out = campaign + '/5-developpement';
const {prepare,launch} = require(campaign + '/harness.cjs');
(async () => {
 const manifest = prepare({id:'developpement', output:out, display:181});
 const pkg = JSON.parse(fs.readFileSync(campaign + '/paquet.json'));
 const bench = await launch(manifest,{executable:root+'/build-artifacts/linux-unpacked/odoo-tricorder',executableSha256:pkg.executable_sha256,asar:root+'/build-artifacts/linux-unpacked/resources/app.asar',asarSha256:pkg.asar_sha256,displayReleased:true});
 const {page, app} = bench;
 console.log('READY',JSON.stringify(manifest.dirs));
 console.log(await bench.visibleText());
 const rl = readline.createInterface({input:process.stdin});
 for await (const line of rl) {
  fs.appendFileSync(out + '/gestes.ndjson',JSON.stringify({time:new Date().toISOString(),code:line})+'\n');
  try {const result = await eval('(async()=>{' + line + '})()'); console.log('RESULT',JSON.stringify(result));} catch(e) {console.log('ERROR',e.stack);}
  if (line.includes('bench.cleanup()')) {rl.close(); break;}
 }
})();

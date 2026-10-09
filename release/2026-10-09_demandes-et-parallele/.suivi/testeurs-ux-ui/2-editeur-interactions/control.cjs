'use strict';
const fs = require('node:fs');
const readline = require('node:readline');
const {launch} = require('../harness.cjs');
const m = JSON.parse(fs.readFileSync(__dirname+'/editeur-interactions-preparation.json','utf8'));
const candidate = {executable:'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/odoo-tricorder',executableSha256:'9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3',asar:'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/resources/app.asar',asarSha256:'a344374116f8ada276e426dd94279450b73cee31ba46aa981ae830a1fb64f44b',displayReleased:true};
(async()=>{
  const h = await launch(m,candidate), page=h.page, app=h.app;
  console.log('READY '+JSON.stringify({url:page.url(),pid:app.process().pid}));
  const rl = readline.createInterface({input:process.stdin,terminal:false});
  for await(const line of rl) {
    const start = new Date().toISOString();
    try {
      const req = JSON.parse(line);
      fs.appendFileSync(__dirname+'/gestes.jsonl',JSON.stringify({start,code:req.code})+'\n');
      const result = await eval('(async()=>{'+req.code+'})()');
      console.log('RESULT '+JSON.stringify(result));
      if(req.exit) { await h.cleanup(); console.log('CLEANUP_OK '+JSON.stringify({errors:h.errors})); process.exit(0); }
    } catch(e) { console.log('CAUGHT '+e.message); }
  }
})().catch(e=>{console.error(e);process.exit(1)});

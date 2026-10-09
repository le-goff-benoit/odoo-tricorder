const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const crypto = require('node:crypto');
const harness = require('./harness.cjs');
const executable = '/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/odoo-tricorder';
const sha = '9578f5ece2da6cbba4b5d0fb7e7adaaf8f07d44684bddfdab92024c84d80d2f3';
const expectedAsar = '74bfb78a5261899b11de76f1f25e59a31753d086de0992f229e52141885cc058';
const actualAsar = crypto.createHash('sha256').update(fs.readFileSync(path.join(path.dirname(executable), 'resources/app.asar'))).digest('hex');
if (actualAsar !== expectedAsar) throw Error('ASAR candidat différent');
let banc, fixture, app, page;
const mode = process.argv[2] || 'volume';
(async () => {
 banc = harness.prepare(mode); fixture = harness.seed(banc, executable, mode);
 ({app, page} = await harness.launch(banc, executable, sha));
 console.log(JSON.stringify({ready:true,mode,scratch:banc.scratch,url:page.url(),fixture:fixture.conversation}));
 const reader = readline.createInterface({input:process.stdin});
 for await (const line of reader) {
  try {
   const request = JSON.parse(line);
   if(request.close) { await harness.cleanup(app,banc); console.log(JSON.stringify({closed:true})); process.exit(0); }
   const result = await eval('(async()=>{' + request.js + '\n})()');
   console.log(JSON.stringify({result:result === undefined ? 'OK' : result}));
  } catch(error) { console.log(JSON.stringify({error:error.message,stack:error.stack})); }
 }
 await harness.cleanup(app,banc);
})().catch(error=>{console.error(error);process.exitCode=1;});

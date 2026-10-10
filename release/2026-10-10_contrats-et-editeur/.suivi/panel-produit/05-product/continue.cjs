const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const { _electron:electron,expect }=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const {cleanupBroker}=require('/home/blegoff/odoo-tricorder/tests/terminal-fixture.cjs');
const base='/tmp/tricorder-personas-produit/05-product';
const home=path.join(base,'isolated-home'); fs.mkdirSync(path.join(home,'bin'),{recursive:true});
for(const n of ['codex','claude'])fs.writeFileSync(path.join(home,'bin',n),'#!/bin/sh\nprintf "FOURNISSEUR LOCAL SYNTHETIQUE — aucune IA reelle\\n"\nexit 78\n',{mode:0o755});
const log=(x)=>{fs.appendFileSync(path.join(base,'actions.log'),new Date().toISOString()+' '+x+'\n');console.log(x)};
(async()=>{
 global.browser=await require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test').chromium.connectOverCDP('http://127.0.0.1:39513'); global.app={firstWindow:async()=>browser.contexts()[0].pages()[0],close:async()=>browser.close()};
 global.page=await app.firstWindow(); page.setDefaultTimeout(5000); await page.setViewportSize({width:1440,height:950});await page.context().tracing.start({screenshots:true,snapshots:true,sources:false});
 global.call=(action,data={})=>page.evaluate(payload=>window.studio.request(payload),{action,...data});
 global.dump=async(name)=>{await page.screenshot({path:path.join(base,name+'.png')});const text=await page.locator('body').innerText();fs.writeFileSync(path.join(base,name+'.txt'),text);log(name+'\n'+text);};
 global.engine=(command,data)=>{const code=`import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom workflow_engine import Engine\ne=Engine(sys.argv[2]); p=json.load(sys.stdin)\n${command}\n`;const r=spawnSync('python3',['-c',code,'/home/blegoff/odoo-tricorder/build-artifacts/linux-unpacked/resources/backend',path.join(home,'workflows')],{input:JSON.stringify(data),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});if(r.status!==0)throw Error(r.stderr);log('Synthetic engine command: '+command);return JSON.parse(r.stdout);};
 global.finish=async()=>{await page.context().tracing.stop({path:path.join(base,'trace.zip')});await app.close();for(const socket of ['cockpit/odoo-tricorder/pty.sock','studio-pty.sock','runtime/pty.sock'])await cleanupBroker(path.join(home,socket));log('CLEANUP OK');};
 await dump('14-apres-refus-stable');
 const readline=require('readline').createInterface({input:process.stdin,output:process.stdout});for await (const line of readline){try {const r=await eval('(async()=>{'+line+'})()');if(r!==undefined)log(JSON.stringify(r));console.log('READY');}catch(e){console.log('ERROR '+e.stack);}}
})().catch(e=>{console.error(e);process.exitCode=1});

const { _electron } = require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('fs'),os=require('os'),path=require('path'),readline=require('readline');
(async()=>{
const profile=fs.mkdtempSync('/tmp/tricorder-dirigeant-');
for(const p of ['bin','home','config','data','cache','state','runtime','agents','codex','claude'])fs.mkdirSync(path.join(profile,p));
for(const p of ['codex','claude'])fs.writeFileSync(path.join(profile,'bin',p),'#!/bin/sh\nexit 78\n',{mode:0o755});
const env={...process.env,HOME:path.join(profile,'home'),XDG_CONFIG_HOME:path.join(profile,'config'),XDG_DATA_HOME:path.join(profile,'data'),XDG_CACHE_HOME:path.join(profile,'cache'),XDG_RUNTIME_DIR:path.join(profile,'runtime'),TRICORDER_HOME:path.join(profile,'home'),TRICORDER_STATE_DIR:path.join(profile,'state'),TRICORDER_RUNTIME_DIR:path.join(profile,'runtime'),TRICORDER_AGENTS_DIR:path.join(profile,'agents'),CODEX_HOME:path.join(profile,'codex'),CLAUDE_CONFIG_DIR:path.join(profile,'claude'),PATH:path.join(profile,'bin')+':'+process.env.PATH};
for(const k of Object.keys(env))if(/TOKEN|SECRET|API_KEY|PASSWORD/i.test(k))delete env[k];
const app=await _electron.launch({executablePath:'/home/blegoff/odoo-tricorder/node_modules/electron/dist/electron',args:['/tmp/tricorder-method-review-v1'],env});
const p=await app.firstWindow(); await p.waitForTimeout(1500); console.log('READY');
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
for await(const line of rl){try{let c=JSON.parse(line); if(c.op==='text')console.log(await p.locator('body').innerText());if(c.op==='buttons')console.log(await p.getByRole('button').allTextContents());if(c.op==='click'){await p.getByRole(c.role||'button',{name:c.name,exact:c.exact??true}).click({timeout:4000});await p.waitForTimeout(500);console.log(await p.locator('body').innerText());}if(c.op==='fill'){await p.getByLabel(c.label,{exact:true}).fill(c.value);console.log('FILLED');}if(c.op==='placeholder'){await p.getByPlaceholder(c.name,{exact:true}).fill(c.value);console.log('FILLED');}if(c.op==='shot'){await p.screenshot({path:c.path,fullPage:true});console.log('SHOT '+c.path);}if(c.op==='fields')console.log(await p.locator('input,textarea,select').evaluateAll(es=>es.map(e=>({tag:e.tagName,type:e.type,name:e.name,placeholder:e.placeholder,value:e.value,labels:[...(e.labels||[])].map(l=>l.innerText)}))));if(c.op==='wait'){await p.waitForTimeout(c.ms||2000);console.log(await p.locator('body').innerText());}if(c.op==='quit'){await app.close();break;} }catch(e){console.log('ERROR '+e.message);}}
})();
